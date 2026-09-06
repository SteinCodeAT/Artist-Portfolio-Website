/**
 * Blog post form editor (full bearbeiten.astro page)
 *
 * Wires up the ENTIRE edit screen:
 *   - Title, description, cover image, publish date (sidebar)
 *   - Save / publish / preview buttons
 *   - Delegates article body to content-section-of-post-editor.ts
 *
 * Loaded by: src/pages/intern-17m2-win/beitraege-manager/bearbeiten.astro
 * Saves via: POST or PUT /api/posts → posts store → post-data.local.json
 *
 * Architecture:
 *   blog-post-form-editor.ts     ← you are here (orchestrator)
 *   content-section-of-post-editor.ts ← text/image/gallery sections only
 */

import { initContentSectionEditor, uploadImages, type BlockData } from './content-section-of-post-editor.ts';
import { initEventGallerySection } from './event-gallery-section.ts';
import { onAdminEditorAction, setEditorLivePageLink } from './editor-save-dropdown.ts';

/** Reuses ConfirmDeleteModal.astro (#delete-event-modal) as a simple notice. */
function showNotice(message: string, title = 'Notice'): Promise<void> {
  const dialog = document.getElementById('delete-event-modal') as HTMLDialogElement | null;
  const titleEl = document.getElementById('delete-event-title');
  const messageEl = document.getElementById('delete-event-message');
  const confirmBtn = document.getElementById('delete-event-confirm') as HTMLButtonElement | null;
  const cancelBtn = document.getElementById('delete-event-cancel') as HTMLButtonElement | null;
  const closeBtn = document.getElementById('delete-event-close') as HTMLButtonElement | null;

  if (!dialog || !confirmBtn) {
    window.alert(message);
    return Promise.resolve();
  }

  const prevTitle = titleEl?.textContent ?? '';
  const prevMessage = messageEl?.textContent ?? '';
  const prevConfirm = confirmBtn.textContent ?? '';
  const prevCancelHidden = cancelBtn?.hidden ?? false;

  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  confirmBtn.textContent = 'OK';
  if (cancelBtn) cancelBtn.hidden = true;

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      confirmBtn.removeEventListener('click', done);
      closeBtn?.removeEventListener('click', done);
      dialog.removeEventListener('close', done);
      if (titleEl) titleEl.textContent = prevTitle;
      if (messageEl) messageEl.textContent = prevMessage;
      confirmBtn.textContent = prevConfirm;
      if (cancelBtn) cancelBtn.hidden = prevCancelHidden;
      if (dialog.open) dialog.close();
      resolve();
    };

    confirmBtn.addEventListener('click', done);
    closeBtn?.addEventListener('click', done);
    dialog.addEventListener('close', done);
    dialog.showModal();
  });
}

// ---------------------------------------------------------------------------
// Config from bearbeiten.astro HTML data attributes
// ---------------------------------------------------------------------------

/**
 * Reads post id + initial sections from #content-sections-root.
 * Astro sets these when the page is rendered on the server.
 */
function readEditorConfig(root: HTMLElement) {
  const postId = root.dataset.postId || '';
  const adminPath = root.dataset.adminPath || '';
  const blogPublicPath = root.dataset.blogPublicPath || '/projects';
  const postsListPath = root.dataset.postsListPath || `${adminPath}/projects-manager`;
  let initialBlocks = [];

  try {
    initialBlocks = JSON.parse(root.dataset.initialBlocks ?? '[]');
  } catch {
    initialBlocks = [];
  }

  return { postId, initialBlocks, adminPath, blogPublicPath, postsListPath };
}

function readInitialGallery(): string[] {
  const galleryRoot = document.getElementById('main-gallery-root');
  if (!galleryRoot) return [];

  try {
    return JSON.parse(galleryRoot.dataset.initialGallery ?? '[]') as string[];
  } catch {
    return [];
  }
}

function photoUrlsFromBlocks(blocks: BlockData[]): string[] {
  const urls: string[] = [];
  for (const block of blocks) {
    if (block.type === 'gallery') {
      for (const image of block.images) {
        if (image.url) urls.push(image.url);
      }
    } else if (block.type === 'image' && block.url) {
      urls.push(block.url);
    }
  }
  return urls;
}

// ---------------------------------------------------------------------------
// Sidebar: title image (cover)
// ---------------------------------------------------------------------------
/** Cover image upload — separate from image sections inside the article body. */
function initMainImageField() {
  const field = document.querySelector('.main-image-field') as HTMLElement | null;
  const hiddenInput = document.getElementById('post-main-image') as HTMLInputElement | null;
  const preview = document.getElementById('main-image-preview');
  const fileInput = document.getElementById('main-image-file') as HTMLInputElement | null;
  const uploadBtn = document.getElementById('btn-main-image-upload');
  const removeBtn = document.getElementById('btn-main-image-remove');
  const fallbackCover = field?.dataset.fallbackCover ?? '';

  if (!hiddenInput || !preview || !fileInput || !uploadBtn || !removeBtn) {
    return;
  }

  function renderPreview() {
    const url = hiddenInput?.value.trim() ?? '';
    removeBtn!.hidden = !url;

    if (url) {
      preview!.innerHTML = `<img src="${url}" alt="" class="main-image-preview-img" />`;
      return;
    }

    if (fallbackCover) {
      preview!.innerHTML = `<img src="${fallbackCover}" alt="" class="main-image-preview-img main-image-preview-img--fallback" />`;
    } else {
      preview!.innerHTML = '<p class="main-image-preview-empty">Standardbild wird verwendet</p>';
    }
  }

  uploadBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;

    const postId = document.getElementById('content-sections-root')?.dataset.postId || null;
    if (!postId) {
      await showNotice('Please save the project first, then upload a cover image.');
      return;
    }

    uploadBtn.textContent = 'Wird hochgeladen…';
    uploadBtn.setAttribute('disabled', 'true');
    try {
      const [result] = await uploadImages([file], {
        contentType: 'posts',
        entryId: postId,
        slot: 'cover.webp',
      });
      
      hiddenInput.value = result.url;
      renderPreview();
    } catch (error) {
      await showNotice(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      uploadBtn.textContent = 'Bild wählen';
      uploadBtn.removeAttribute('disabled');
    }
  });

  removeBtn.addEventListener('click', () => {
    hiddenInput.value = '';
    renderPreview();
  });

  renderPreview();
}

// ---------------------------------------------------------------------------
// Sidebar: status badge + publish date
// ---------------------------------------------------------------------------

function setStatusDisplay(status: 'draft' | 'published') {
  const statusEl = document.getElementById('post-status-display');
  if (!statusEl) return;

  statusEl.textContent = status === 'published' ? '● Published' : '○ Draft';
  statusEl.setAttribute('data-status', status);
}

type SaveAction = 'save-draft' | 'publish' | 'discard-draft';

function isSaveAction(action: string): action is SaveAction {
  return action === 'save-draft' || action === 'publish' || action === 'discard-draft';
}

function setHasPreviewDraftFlag(hasDraft: boolean) {
  const root = document.getElementById('content-sections-root');
  if (root) {
    root.dataset.hasPreviewDraft = hasDraft ? 'true' : 'false';
  }

  const discardBtn = document.querySelector(
    '[data-save-action="discard-draft"]',
  ) as HTMLButtonElement | null;
  if (discardBtn) {
    discardBtn.hidden = !hasDraft;
  }

  const badge = document.querySelector('.draft-badge') as HTMLElement | null;
  if (badge) {
    badge.hidden = !hasDraft;
  }
}

// ---------------------------------------------------------------------------
// Save + preview
// ---------------------------------------------------------------------------

type SavedPost = {
  id: string;
  slug: string;
  status: 'draft' | 'published';
  year: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  previewDraft?: unknown | null;
};

/** Same format as bearbeiten.astro sidebar — kept in sync for live updates after save. */
function formatSidebarDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Updates Erstellt / Aktualisiert / Veröffentlicht in sidebar after API save. */
function updateSidebarMeta(post: SavedPost) {
  const metaList = document.getElementById('post-meta-list');
  const newHint = document.getElementById('post-new-hint');
  const createdEl = document.getElementById('post-meta-created');
  const updatedEl = document.getElementById('post-meta-updated');
  const publishedRow = document.getElementById('post-meta-published-row');
  const publishedEl = document.getElementById('post-meta-published');

  if (metaList) metaList.hidden = false;
  if (newHint) newHint.hidden = true;

  if (createdEl) createdEl.textContent = formatSidebarDate(post.createdAt);
  if (updatedEl) updatedEl.textContent = formatSidebarDate(post.updatedAt);

  if (publishedRow && publishedEl) {
    const hasPublished = Boolean(post.publishedAt);
    publishedRow.hidden = !hasPublished;
    publishedEl.textContent = hasPublished ? formatSidebarDate(post.publishedAt) : '—';
  }
}

function initBlogPostFormEditor() {
  const root = document.getElementById('content-sections-root');
  const galleryRoot = document.getElementById('main-gallery-root');
  if (!root) {
    return;
  }

  initMainImageField();

  const { postId: initialPostId, initialBlocks, blogPublicPath, postsListPath } =
    readEditorConfig(root);

  let postId = initialPostId;

  const textBlocks = (initialBlocks as BlockData[]).filter((block) => block.type === 'text');
  const seededGallery = readInitialGallery();
  const initialGallery = seededGallery.length > 0 ? seededGallery : photoUrlsFromBlocks(initialBlocks as BlockData[]);

  const sectionEditor = initContentSectionEditor(root, textBlocks, {
    allowedTypes: ['text'],
  });
  const galleryEditor = galleryRoot
    ? initEventGallerySection(galleryRoot, initialGallery, {
        contentType: 'posts',
        entryIdDatasetKey: 'mainGalleryId',
        gridSelector: '[data-main-gallery-grid]',
        filesSelector: '[data-main-gallery-files]',
        uploadSelector: '[data-main-gallery-upload]',
        emptyLabel: 'No images yet — upload below',
        uploadLabel: 'Upload Images',
        uploadingLabel: 'Uploading…',
        uploadFailedLabel: 'Upload failed',
        processingLabel: 'Processing the uploaded image…',
      })
    : null;

  // Snapshot for dirty detection — lives inside init, not module-wide.
  let lastSavedSnapshot: string | null = null;

  function captureSnapshot() {
    const title = (document.getElementById('post-title') as HTMLInputElement | null)?.value?.trim() ?? '';
    const description =
      (document.getElementById('post-description') as HTMLTextAreaElement | null)?.value?.trim() ?? '';
    const mainImage =
      (document.getElementById('post-main-image') as HTMLInputElement | null)?.value?.trim() ?? '';
    const year =
      (document.getElementById('post-year') as HTMLInputElement | null)?.value?.trim() ?? '';
    const videoEmbedUrl =
      (document.getElementById('post-video-embed-url') as HTMLInputElement | null)?.value?.trim() ?? '';
    const blocks = sectionEditor.getBlocks();
    const mainGallery = galleryEditor?.getGalleryUrls() ?? [];
    return JSON.stringify({ title, description, mainImage, year, videoEmbedUrl, blocks, mainGallery });
  }

  function markDirtyIfChanged() {
    if (lastSavedSnapshot && captureSnapshot() !== lastSavedSnapshot) {
      setSaveStatus('dirty');
    }
  }

  async function savePost(action: SaveAction): Promise<SavedPost | null> {
    if (action === 'discard-draft') {
      if (
        !confirm(
          'Entwurf verwerfen? Ungespeicherte Entwurfs-Änderungen gehen verloren und der veröffentlichte Stand wird wieder geladen.',
        )
      ) {
        return null;
      }

      if (root!.dataset.postPersisted !== 'true') {
        window.location.href = postsListPath;
        return null;
      }

      setSaveStatus('saving');
      const response = await fetch('/api/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: postId, action: 'discard-draft' }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        await showNotice(data.error ?? 'Entwurf konnte nicht verworfen werden');
        setSaveStatus('dirty');
        return null;
      }

      window.location.href = `${window.location.pathname}?id=${postId}`;
      return null;
    }

    const title = (document.getElementById('post-title') as HTMLInputElement | null)?.value?.trim();
    const description =
      (document.getElementById('post-description') as HTMLTextAreaElement | null)?.value?.trim() ?? '';
    const mainImageInput = document.getElementById('post-main-image') as HTMLInputElement | null;
    const mainImage = mainImageInput?.value?.trim() ?? '';

    const blocks = sectionEditor.getBlocks().filter((block) => {
      if (block.type === 'image' || block.type === 'gallery') return false;
      return true;
    });

    if (!title) {
      await showNotice('Please enter a title.');
      return null;
    }

    const year =
      (document.getElementById('post-year') as HTMLInputElement | null)?.value?.trim() ?? '';
    if (!year) {
      await showNotice('Please enter the year the work was created.');
      return null;
    }

    const videoEmbedUrl =
      (document.getElementById('post-video-embed-url') as HTMLInputElement | null)?.value?.trim() ?? '';

    const payload = {
      id: postId,
      title,
      description,
      mainImage: mainImage || null,
      blocks,
      mainGallery: galleryEditor?.getGalleryUrls() ?? [],
      year,
      videoEmbedUrl: videoEmbedUrl || null,
      action,
    };

    const isEdit = root!.dataset.postPersisted === 'true';
    setSaveStatus('saving');
    const response = await fetch('/api/posts', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      post?: SavedPost;
    };

    if (!response.ok || !data.post) {
      await showNotice(data.error ?? 'Save failed');
      setSaveStatus('dirty');
      return null;
    }

    lastSavedSnapshot = captureSnapshot();
    setSaveStatus('saved', new Date());
    updateSidebarMeta(data.post);
    setStatusDisplay(data.post.status);
    setHasPreviewDraftFlag(action === 'save-draft' || Boolean(data.post.previewDraft));
    if (data.post.status === 'published' && data.post.slug) {
      setEditorLivePageLink(`${blogPublicPath || '/projects'}/${encodeURIComponent(data.post.slug)}`);
    }

    postId = data.post.id;
    root!.dataset.postId = data.post.id;
    root!.dataset.postPersisted = 'true';
    if (data.post.slug) {
      root!.dataset.postSlug = data.post.slug;
    }
    if (galleryRoot) {
      galleryRoot.dataset.mainGalleryId = data.post.id;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('id', data.post.id);
    history.replaceState(null, '', url.pathname + url.search);

    return data.post;
  }

  function openPreviewUrl() {
    const slug = root!.dataset.postSlug?.trim();
    if (!slug) {
      void showNotice('Vorschau konnte nicht geöffnet werden — kein Slug vorhanden.');
      return;
    }

    const publicBase = blogPublicPath || '/projects';
    window.open(`${publicBase}/${encodeURIComponent(slug)}?show-preview=true`, '_blank', 'noopener');
  }

  document.getElementById('btn-preview')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-preview') as HTMLButtonElement | null;
    const needsFirstSave = root!.dataset.postPersisted !== 'true';
    const isDirty = Boolean(lastSavedSnapshot && captureSnapshot() !== lastSavedSnapshot);

    if (needsFirstSave || isDirty) {
      if (btn) btn.disabled = true;
      const saved = await savePost('save-draft');
      if (btn) btn.disabled = false;
      if (saved) openPreviewUrl();
      return;
    }

    openPreviewUrl();
  });

  onAdminEditorAction((action) => {
    if (isSaveAction(action)) void savePost(action);
  });

  /* Listen for form input changes and update dirty state. */
  document.getElementById('post-title')?.addEventListener('input', markDirtyIfChanged);
  document.getElementById('post-description')?.addEventListener('input', markDirtyIfChanged);
  document.getElementById('post-year')?.addEventListener('input', markDirtyIfChanged);
  document.getElementById('post-video-embed-url')?.addEventListener('input', markDirtyIfChanged);
  document.getElementById('post-main-image')?.addEventListener('change', markDirtyIfChanged);
  
  // Sections: mark dirty on a timer after Quill edits - simples approach 
  root.addEventListener('input', markDirtyIfChanged);
  root.addEventListener('click', () => {
    // Re-check after add/remove/move section - click handlers run first
    setTimeout(markDirtyIfChanged, 0);
  });
  galleryRoot?.addEventListener('input', markDirtyIfChanged);
  galleryRoot?.addEventListener('click', () => {
    setTimeout(markDirtyIfChanged, 0);
  });

  /* on page load existing post - lastSavedSnapshot = captureSnapshot() */
  if (lastSavedSnapshot === null) {
    lastSavedSnapshot = captureSnapshot();
  }
}

function setSaveStatus(status: 'idle' | 'saving' | 'saved' | 'dirty', savedAt?: Date) {
  const statusEl = document.getElementById('save-status');
  if (!statusEl) return;

  statusEl.classList.remove('is-saving', 'is-dirty', 'is-saved');

  if (status === 'saving') {
    statusEl.textContent = 'Speichert…';
    statusEl.classList.add('is-saving');
    return;
  }
  if (status === 'saved' && savedAt) {
    statusEl.textContent = `Gespeichert um ${savedAt.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}`;
    statusEl.classList.add('is-saved');
    return;
  }
  if (status === 'dirty') {
    statusEl.textContent = 'Ungespeicherte Änderungen';
    statusEl.classList.add('is-dirty');
    return;
  }
  statusEl.textContent = '';
}

initBlogPostFormEditor();
