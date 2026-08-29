/**
 * Content sections editor (middle column on bearbeiten.astro)
 *
 * Handles ONE part of a blog post: the stack of text / image / gallery sections.
 * Does NOT handle title, cover image, save, or preview — see blog-post-form-editor.ts.
 *
 * Used by: bearbeiten.astro → #content-sections-root
 * Saves as: post.blocks[] in post-data.local.json (via blog-post-form-editor → /api/posts)
 *
 * Rich text: Quill (npm package "quill") — one editor instance per text section.
 */

import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import {
  createDefaultTableBlock,
  createEmptyGrid,
  isTableEmpty,
} from '@steincms/cms/blocks/table-block';
import type { BlockData } from '@steincms/cms/blocks/editor-block';

export type {
  BlockData,
  GalleryBlockData,
  GalleryImageData,
  ImageBlockData,
  TableBlockData,
  TextBlockData,
} from '@steincms/cms/blocks/editor-block';

type UploadResult = {
  url: string;
  thumbUrl: string;
};

// ---------------------------------------------------------------------------
// Quill — one instance per text section, keyed by section id
// ---------------------------------------------------------------------------

const quillInstances = new Map<string, Quill>();

const TEXT_TOOLBAR = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'blockquote'],
  ['clean'],
];

function newBlockId(): string {
  return `b${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

function newImageId(): string {
  return `gi${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

function sectionTypeLabel(block: BlockData): string {
  if (block.type === 'text') return 'Text';
  if (block.type === 'image') return 'Einzelbild';
  if (block.type === 'table') return 'Tabelle';
  return 'Bildergalerie';
}

function destroyQuill(id: string): void {
  quillInstances.delete(id);
}

function destroyAllQuills(): void {
  quillInstances.clear();
}

/** Copy HTML from each Quill editor back into our in-memory blocks array before save/re-render. */
function syncTextBlocksFromQuill(blocks: BlockData[]): void {
  for (const block of blocks) {
    if (block.type !== 'text') continue;

    const quill = quillInstances.get(block.id);
    if (quill) {
      block.html = quill.root.innerHTML;
    }
  }
}

// ---------------------------------------------------------------------------
// Image upload (shared by cover field in blog-post-form-editor + sections here)
// ---------------------------------------------------------------------------

export async function uploadImages(
  files: File[],
  context?: { contentType?: 'events' | 'posts'; entryId?: string; slot?: string },
): Promise<UploadResult[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('file', file);
  }

  if (context?.contentType) {
    formData.append('contentType', context.contentType);
  }
  if (context?.entryId) {
    formData.append('entryId', context.entryId);
  }
  if (context?.slot) {
    formData.append('slot', context.slot);
  }

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    credentials: 'same-origin',
    body: formData,
  });

  const data = (await response.json()) as {
    ok?: boolean;
    url?: string;
    thumbUrl?: string;
    files?: UploadResult[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'Upload fehlgeschlagen');
  }

  if (data.files) {
    return data.files;
  }

  if (data.url && data.thumbUrl) {
    return [{ url: data.url, thumbUrl: data.thumbUrl }];
  }

  throw new Error('Upload fehlgeschlagen');
}

// ---------------------------------------------------------------------------
// Empty-state hint for brand-new posts
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function isStarterEmptyState(blocks: BlockData[]): boolean {
  if (blocks.length !== 1 || blocks[0].type !== 'text') {
    return false;
  }

  syncTextBlocksFromQuill(blocks);
  return stripHtml(blocks[0].html) === '';
}

function renderEmptyStateHint(): HTMLElement {
  const hint = document.createElement('div');
  hint.className = 'block-empty-state';
  hint.dataset.emptyHint = 'true';
  hint.innerHTML = `
    <p class="block-empty-title">Hier beginnt Ihr Beitrag</p>
    <p class="block-empty-text">
      Schreiben Sie im ersten Textabschnitt oder fügen Sie unten ein Bild ein.
      Die Abschnitte erscheinen auf der Website in derselben Reihenfolge.
    </p>
  `;
  return hint;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderGalleryGrid(block: GalleryBlockData): string {
  if (block.images.length === 0) {
    return '<p class="block-gallery-empty">Noch keine Bilder — unten hochladen</p>';
  }

  return block.images
    .map(
      (image) => `
        <div class="block-gallery-item" data-gallery-image-id="${escapeHtml(image.id)}">
          <img src="${escapeHtml(image.thumbUrl)}" alt="" class="block-gallery-thumb" />
          <label class="block-field block-gallery-alt">
            <span>Alt-Text (optional)</span>
            <input type="text" data-gallery-alt value="${escapeHtml(image.alt ?? '')}" />
          </label>
          <button type="button" class="block-btn block-btn-danger block-gallery-remove" title="Bild entfernen">✕</button>
        </div>
      `,
    )
    .join('');
}

function renderTableGrid(block: TableBlockData): string {
  const rowsHtml = block.rows
    .map((row, rowIndex) => {
      const rowClass =
        block.hasHeaderRow && rowIndex === 0 ? ` block-table-row--header` : '';
      const cellsHtml = row
        .map(
          (cell, colIndex) => `
            <td class="block-table-cell">
              <input
                type="text"
                class="block-table-cell-input${rowClass}"
                data-table-cell
                data-row="${rowIndex}"
                data-col="${colIndex}"
                value="${escapeHtml(cell)}"
                placeholder=""
              />
            </td>
          `,
        )
        .join('');
      return `<tr class="block-table-row${rowClass}" data-table-row="${rowIndex}">${cellsHtml}</tr>`;
    })
    .join('');

  const canRemoveRow = block.rows.length > 1;
  const canRemoveCol = block.rows[0]?.length > 1;

  return `
    <div class="block-table-editor">
      <label class="block-table-header-toggle">
        <input type="checkbox" data-table-header ${block.hasHeaderRow ? 'checked' : ''} />
        Erste Zeile als Kopfzeile
      </label>
      <div class="block-table-scroll">
        <table class="block-table-grid">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
      <div class="block-table-toolbar">
        <button type="button" class="block-action-btn block-table-add-row">+ Zeile</button>
        <button type="button" class="block-action-btn block-table-add-col">+ Spalte</button>
        <button type="button" class="block-action-btn block-table-remove-row" ${canRemoveRow ? '' : 'disabled'}>− Zeile</button>
        <button type="button" class="block-action-btn block-table-remove-col" ${canRemoveCol ? '' : 'disabled'}>− Spalte</button>
      </div>
    </div>
  `;
}

type ContentSectionOptions = {
	allowedTypes?: Array<'text' | 'image' | 'gallery' | 'table'>;
};

// ---------------------------------------------------------------------------
// Public API — initContentSectionEditor()
// ---------------------------------------------------------------------------

/**
 * Mounts the content-sections UI inside `root` (bearbeiten.astro: #content-sections-root).
 *
 * @returns getBlocks — returns current sections for saving (name matches API field `blocks`)
 */
export function initContentSectionEditor(
  root: HTMLElement,
  initialBlocks: BlockData[],
  options: ContentSectionOptions = {},
): { getBlocks: () => BlockData[] } {
  const allowedTypes = options.allowedTypes ?? ['text', 'image', 'gallery'];
  const allowGallery = allowedTypes.includes('gallery');
  const allowImage = allowedTypes.includes('image');
  const allowText = allowedTypes.includes('text');
  const allowTable = allowedTypes.includes('table');
  let blocks: BlockData[] =
    initialBlocks.length > 0
      ? structuredClone(initialBlocks)
      : [{ id: newBlockId(), type: 'text', html: '' }];

  const uploadContext = (): { contentType: 'events' | 'posts'; entryId: string } | undefined => {
    const contentType = root.dataset.uploadContentType as 'events' | 'posts' | undefined;
    const entryId =
      root.dataset.eventId || root.dataset.postId || root.dataset.entryId || undefined;
    if (!contentType || !entryId) return undefined;
    return { contentType, entryId };
  };

  const listEl = root.querySelector('[data-section-list]') as HTMLElement | null;
  if (!listEl) {
    throw new Error('[data-section-list] container not found inside content sections root');
  }

  function mountTextEditor(blockEl: HTMLElement, block: TextBlockData): void {
    const editorEl = blockEl.querySelector('[data-quill-root]') as HTMLElement | null;
    if (!editorEl) return;

    destroyQuill(block.id);

    const quill = new Quill(editorEl, {
      theme: 'snow',
      modules: { toolbar: TEXT_TOOLBAR },
    });

    if (block.html) {
      quill.clipboard.dangerouslyPasteHTML(block.html);
    }

    quillInstances.set(block.id, quill);
  }

  function bindGalleryEvents(article: HTMLElement, block: GalleryBlockData): void {
    article.querySelectorAll('[data-gallery-image-id]').forEach((itemEl) => {
      const imageId = itemEl.getAttribute('data-gallery-image-id');
      if (!imageId) return;

      const image = block.images.find((entry) => entry.id === imageId);
      if (!image) return;

      const altInput = itemEl.querySelector('[data-gallery-alt]') as HTMLInputElement | null;
      altInput?.addEventListener('input', () => {
        image.alt = altInput.value;
      });

      itemEl.querySelector('.block-gallery-remove')?.addEventListener('click', () => {
        block.images = block.images.filter((entry) => entry.id !== imageId);
        render();
      });
    });

    const fileInput = article.querySelector('[data-gallery-files]') as HTMLInputElement | null;
    const uploadBtn = article.querySelector('.block-gallery-upload-btn') as HTMLButtonElement | null;

    uploadBtn?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', async () => {
      const selected = fileInput.files ? Array.from(fileInput.files) : [];
      fileInput.value = '';
      if (selected.length === 0) return;

      if (uploadBtn) {
        uploadBtn.textContent = 'Wird hochgeladen…';
        uploadBtn.disabled = true;
      }

      try {
        const uploaded = await uploadImages(selected, uploadContext());
        for (const result of uploaded) {
          block.images.push({
            id: newImageId(),
            url: result.url,
            thumbUrl: result.thumbUrl,
          });
        }
        render();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Upload fehlgeschlagen');
        if (uploadBtn) {
          uploadBtn.textContent = 'Bilder hochladen';
          uploadBtn.disabled = false;
        }
      }
    });
  }

  function bindImageEvents(article: HTMLElement, block: ImageBlockData): void {
    const fileInput = article.querySelector('[data-image-file]') as HTMLInputElement;
    const uploadBtn = article.querySelector('.block-upload-btn') as HTMLButtonElement | null;

    uploadBtn?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      if (uploadBtn) {
        uploadBtn.textContent = 'Wird hochgeladen…';
        uploadBtn.disabled = true;
      }

      try {
        const [result] = await uploadImages([file], {
          ...uploadContext(),
          slot: `${block.id}.webp`,
        });
        block.url = result.url;
        render();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Upload fehlgeschlagen');
        if (uploadBtn) {
          uploadBtn.textContent = 'Bild hochladen / ersetzen';
          uploadBtn.disabled = false;
        }
      }
    });

    const altInput = article.querySelector('[data-image-alt]') as HTMLInputElement;
    altInput?.addEventListener('input', () => {
      block.alt = altInput.value;
    });

    const captionInput = article.querySelector('[data-image-caption]') as HTMLInputElement;
    captionInput?.addEventListener('input', () => {
      block.caption = captionInput.value;
    });
  }

  function bindTableEvents(article: HTMLElement, block: TableBlockData): void {
    article.querySelectorAll('[data-table-cell]').forEach((inputEl) => {
      const input = inputEl as HTMLInputElement;
      const rowIndex = Number(input.dataset.row);
      const colIndex = Number(input.dataset.col);
      if (Number.isNaN(rowIndex) || Number.isNaN(colIndex)) return;

      input.addEventListener('input', () => {
        if (!block.rows[rowIndex]) return;
        block.rows[rowIndex][colIndex] = input.value;
      });
    });

    const headerCheckbox = article.querySelector('[data-table-header]') as HTMLInputElement | null;
    headerCheckbox?.addEventListener('change', () => {
      block.hasHeaderRow = headerCheckbox.checked;
      render();
    });

    article.querySelector('.block-table-add-row')?.addEventListener('click', () => {
      const colCount = block.rows[0]?.length ?? 1;
      block.rows.push(createEmptyGrid(1, colCount)[0]);
      render();
    });

    article.querySelector('.block-table-add-col')?.addEventListener('click', () => {
      for (const row of block.rows) {
        row.push('');
      }
      render();
    });

    article.querySelector('.block-table-remove-row')?.addEventListener('click', () => {
      if (block.rows.length <= 1) return;
      block.rows.pop();
      render();
    });

    article.querySelector('.block-table-remove-col')?.addEventListener('click', () => {
      if ((block.rows[0]?.length ?? 0) <= 1) return;
      for (const row of block.rows) {
        row.pop();
      }
      render();
    });
  }

  function renderBlock(block: BlockData, index: number): HTMLElement {
    const article = document.createElement('article');
    article.className = 'block-item';
    article.dataset.blockId = block.id;
    article.dataset.type = block.type;

    const controls = `
      <div class="block-item-head">
        <span class="block-type-label">${sectionTypeLabel(block)}</span>
        <div class="block-item-actions">
          <button type="button" class="block-btn" data-move="up" title="Nach oben" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="block-btn" data-move="down" title="Nach unten" ${index === blocks.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" class="block-btn block-btn-danger" data-remove title="Entfernen">✕</button>
        </div>
      </div>
    `;

    if (block.type === 'text') {
      article.innerHTML = `${controls}<div class="block-quill" data-quill-root></div>`;
      queueMicrotask(() => {
        mountTextEditor(article, block);

        const quill = quillInstances.get(block.id);
        quill?.on('text-change', () => {
          if (!isStarterEmptyState(blocks)) {
            listEl!.querySelector('[data-empty-hint]')?.remove();
          }
        });
      });
      return article;
    }

    if (block.type === 'gallery') {
      article.innerHTML = `
        ${controls}
        <div class="block-gallery-body">
          <div class="block-gallery-grid">${renderGalleryGrid(block)}</div>
          <div class="block-upload">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-gallery-files multiple hidden />
            <button type="button" class="block-action-btn block-gallery-upload-btn">Bilder hochladen</button>
          </div>
        </div>
      `;
      bindGalleryEvents(article, block);
      return article;
    }

    if (block.type === 'table') {
      article.innerHTML = `
        ${controls}
        ${renderTableGrid(block)}
      `;
      bindTableEvents(article, block);
      return article;
    }

    const preview = block.url
      ? `<img src="${escapeHtml(block.url)}" alt="" class="block-image-preview" />`
      : `<div class="block-image-placeholder">Noch kein Bild</div>`;

    article.innerHTML = `
      ${controls}
      <div class="block-image-body">
        ${preview}
        <div class="block-image-meta-row">
          <label class="block-field">
            <span>Bildbeschreibung für Suchmaschinen (Alt-Text)</span>
            <input type="text" data-image-alt value="${escapeHtml(block.alt)}" required />
          </label>
          <label class="block-field">
            <span>Bildunterschrift (optional)</span>
            <input type="text" data-image-caption value="${escapeHtml(block.caption ?? '')}" />
          </label>
        </div>
        <div class="block-upload">
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-image-file hidden />
          <button type="button" class="block-action-btn block-upload-btn">Bild hochladen / ersetzen</button>
        </div>
      </div>
    `;

    bindImageEvents(article, block);
    return article;
  }

  function render(): void {
    syncTextBlocksFromQuill(blocks);
    destroyAllQuills();
    listEl!.innerHTML = '';

    if (isStarterEmptyState(blocks)) {
      listEl!.appendChild(renderEmptyStateHint());
    }

    blocks.forEach((block, index) => {
      const el = renderBlock(block, index);

      el.querySelector('[data-move="up"]')?.addEventListener('click', () => {
        if (index <= 0) return;
        syncTextBlocksFromQuill(blocks);
        [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
        render();
      });

      el.querySelector('[data-move="down"]')?.addEventListener('click', () => {
        if (index >= blocks.length - 1) return;
        syncTextBlocksFromQuill(blocks);
        [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
        render();
      });

      el.querySelector('[data-remove]')?.addEventListener('click', () => {
        if (blocks.length <= 1) {
          alert('Mindestens ein Abschnitt ist erforderlich.');
          return;
        }
        syncTextBlocksFromQuill(blocks);
        blocks = blocks.filter((item) => item.id !== block.id);
        render();
      });

      listEl!.appendChild(el);
    });
  }

  function addBlock(block: BlockData): void {
    syncTextBlocksFromQuill(blocks);
    blocks.push(block);
    render();
    queueMicrotask(() => {
      listEl! .querySelector(`[data-block-id="${block.id}"]`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }

  // "Abschnitt einfügen" buttons in bearbeiten.astro (may appear more than once)
  if (allowText) {
    root.querySelectorAll('[data-add-text]').forEach((button) => {
      button.addEventListener('click', () => {
        addBlock({ id: newBlockId(), type: 'text', html: '' });
      });
    });
  }

  if (allowImage) {
    root.querySelectorAll('[data-add-image]').forEach((button) => {
      button.addEventListener('click', () => {
        addBlock({ id: newBlockId(), type: 'image', url: '', alt: '' });
      });
    });
  }

  if (allowGallery) {
    root.querySelectorAll('[data-add-gallery]').forEach((button) => {
      button.addEventListener('click', () => {
        addBlock({ id: newBlockId(), type: 'gallery', images: [] });
      });
    });
  }

  if (allowTable) {
    root.querySelectorAll('[data-add-table]').forEach((button) => {
      button.addEventListener('click', () => {
        addBlock(createDefaultTableBlock(newBlockId()));
      });
    });
  }

  render();

  return {
    getBlocks: () => {
      syncTextBlocksFromQuill(blocks);
      return structuredClone(blocks);
    },
  };
}
