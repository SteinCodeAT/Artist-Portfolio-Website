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

import { initContentSectionEditor, uploadImages } from './content-section-of-post-editor.ts';

// ---------------------------------------------------------------------------
// Config from bearbeiten.astro HTML data attributes
// ---------------------------------------------------------------------------

/**
 * Reads post id + initial sections from #content-sections-root.
 * Astro sets these when the page is rendered on the server.
 */
function readEditorConfig(root: HTMLElement) {
  const postId = root.dataset.postId || null;
  const adminPath = root.dataset.adminPath || '';
  const blogPublicPath = root.dataset.blogPublicPath || '/blog';
  const postsListPath = root.dataset.postsListPath || `${adminPath}/beitraege-manager`;
  const postsPreviewPath = root.dataset.postsPreviewPath || `${adminPath}/beitraege-manager/vorschau`;
  let initialBlocks = [];

  try {
    initialBlocks = JSON.parse(root.dataset.initialBlocks ?? '[]');
  } catch {
    initialBlocks = [];
  }

  return { postId, initialBlocks, adminPath, blogPublicPath, postsListPath, postsPreviewPath };
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

    uploadBtn.textContent = 'Wird hochgeladen…';
    uploadBtn.setAttribute('disabled', 'true');

    try {
      const [result] = await uploadImages([file]);
      hiddenInput.value = result.url;
      renderPreview();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload fehlgeschlagen');
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

  statusEl.textContent = status === 'published' ? 'Veröffentlicht' : 'Entwurf';
  statusEl.setAttribute('data-status', status);
}

/** Converts #post-published-at (datetime-local) to ISO string for the API. */
function readPublishedAtPayload(status: 'draft' | 'published'): string | null | undefined {
  const input = document.getElementById('post-published-at') as HTMLInputElement | null;
  if (!input?.value.trim()) {
    // Publishing without a date → API uses "now". Draft save → don't touch date.
    return status === 'published' ? null : undefined;
  }

  return new Date(input.value).toISOString();
}

// ---------------------------------------------------------------------------
// Save + preview
// ---------------------------------------------------------------------------

type SavedPost = {
  id: string;
  slug: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
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
  if (!root) {
    return;
  }

  initMainImageField();

  const { postId: initialPostId, initialBlocks, blogPublicPath, postsListPath, postsPreviewPath } =
    readEditorConfig(root);

  // Updated after first save so preview + PUT work on brand-new posts.
  let postId = initialPostId;

  // Article body editor (text / image / gallery sections only).
  const sectionEditor = initContentSectionEditor(root, initialBlocks);

  // Snapshot for dirty detection — lives inside init, not module-wide.
  let lastSavedSnapshot: string | null = null;

  function captureSnapshot() {
    const title = (document.getElementById('post-title') as HTMLInputElement | null)?.value?.trim() ?? '';
    const description =
      (document.getElementById('post-description') as HTMLTextAreaElement | null)?.value?.trim() ?? '';
    const mainImage =
      (document.getElementById('post-main-image') as HTMLInputElement | null)?.value?.trim() ?? '';
    const blocks = sectionEditor.getBlocks();
    return JSON.stringify({ title, description, mainImage, blocks });
  }

  function markDirtyIfChanged() {
    if (lastSavedSnapshot && captureSnapshot() !== lastSavedSnapshot) {
      setSaveStatus('dirty');
    }
  }

  /**
   * Gathers all form fields and sends to /api/posts.
   * @param redirectAfterSave — false when saving only to enable preview
   */
  async function savePost(
    status: 'draft' | 'published',
    options: { redirectAfterSave?: boolean } = {},
  ): Promise<SavedPost | null> {
    const { redirectAfterSave = true } = options;

    const title = (document.getElementById('post-title') as HTMLInputElement | null)?.value?.trim();
    const description =
      (document.getElementById('post-description') as HTMLTextAreaElement | null)?.value?.trim() ?? '';
    const mainImageInput = document.getElementById('post-main-image') as HTMLInputElement | null;
    const mainImage = mainImageInput?.value?.trim() ?? '';

    // Drop empty image/gallery sections before save.
    const blocks = sectionEditor.getBlocks().filter((block) => {
      if (block.type === 'image') return Boolean(block.url);
      if (block.type === 'gallery') return block.images.length > 0;
      return true;
    });

    if (!title) {
      alert('Bitte geben Sie einen Titel ein.');
      return null;
    }

    for (const block of blocks) {
      if (block.type === 'image' && block.url && !block.alt.trim()) {
        alert('Bitte Alt-Text für alle Bilder ausfüllen.');
        return null;
      }
    }

    const publishedAt = readPublishedAtPayload(status);
    const payload: Record<string, unknown> = {
      title,
      description,
      mainImage: mainImage || null,
      blocks,
      status,
    };

    if (publishedAt !== undefined) {
      payload.publishedAt = publishedAt;
    }

    const isEdit = Boolean(postId);
    setStatusDisplay(status);
    setSaveStatus('saving');
    const response = await fetch('/api/posts', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(isEdit ? { id: postId, ...payload } : payload),
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      post?: SavedPost;
    };

    if (!response.ok || !data.post) {
      alert(data.error ?? 'Speichern fehlgeschlagen');
      setSaveStatus('dirty');
      return null;
    }
    
    /* Store snapshot after successful save. */
    lastSavedSnapshot = captureSnapshot();
    setSaveStatus('saved', new Date());
    updateSidebarMeta(data.post);

    postId = data.post.id;
    root!.dataset.postId = data.post.id;

    const previewBtn = document.getElementById('btn-preview') as HTMLButtonElement | null;
    // if preview button exists, set the draft url and clear the public url
    if (previewBtn) {
      previewBtn.dataset.previewDraft = `${postsPreviewPath}?id=${data.post.id}`;
      previewBtn.dataset.previewNeedsSave = 'false';
      
      // clear public url when saving draft
      if (data.post.status === 'published') {
        previewBtn.dataset.previewPublic = `${blogPublicPath}/${data.post.slug}`;
      } else {
        delete previewBtn.dataset.previewPublic;
      }
    }

    // if preview button exists, set the preview needs save to false
    if (previewBtn) {
      previewBtn.dataset.previewDraft = `${postsPreviewPath}?id=${data.post.id}`;
      previewBtn.dataset.previewNeedsSave = 'false';
    }

    if (redirectAfterSave) {
      window.location.href = postsListPath;
    }

    return data.post;
  }

  /** Published → public /blog/slug; draft → intern vorschau.astro */
  function openPreviewUrl() {
    const btn = document.getElementById('btn-preview');
    const isPublished = btn?.dataset.previewPublic?.trim();
    const url = isPublished || btn?.dataset.previewDraft?.trim();
    if (url) window.open(url, '_blank', 'noopener');
    else alert('Bitte zuerst speichern.');
  }

  function initPreviewButton() {
    document.getElementById('btn-preview')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-preview') as HTMLButtonElement | null;
      const needsFirstSave = btn?.dataset.previewNeedsSave === 'true';
      const isDirty = Boolean(lastSavedSnapshot && captureSnapshot() !== lastSavedSnapshot);

      if (needsFirstSave || isDirty) {
        btn!.disabled = true;
        // preview save = keep status don't force draft
        const status = btn?.dataset.previewPublic ? 'published' : 'draft';
        const saved = await savePost(status, { redirectAfterSave: false });
        btn!.disabled = false;
        if (saved) openPreviewUrl();
        return;
      }

      openPreviewUrl();
    });
  }

  initPreviewButton();

  /* Listen for form input changes and update dirty state. */
  document.getElementById('post-title')?.addEventListener('input', markDirtyIfChanged);
  document.getElementById('post-description')?.addEventListener('input', markDirtyIfChanged);
  document.getElementById('post-main-image')?.addEventListener('change', markDirtyIfChanged);
  
  // Sections: mark dirty on a timer after Quill edits - simples approach 
  root.addEventListener('input', markDirtyIfChanged);
  root.addEventListener('click', () => {
    // Re-check after add/remove/move section - click handlers run first
    setTimeout(markDirtyIfChanged, 0);
  });

  /* on page load existing post - lastSavedSnapshot = captureSnapshot() */
  if (lastSavedSnapshot === null) {
    lastSavedSnapshot = captureSnapshot();
  }
  document.getElementById('btn-save-draft')?.addEventListener('click', () => {
    void savePost('draft', { redirectAfterSave: false });
  });

  document.getElementById('btn-publish')?.addEventListener('click', () => {
    void savePost('published', { redirectAfterSave: false });
  });
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
