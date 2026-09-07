// Thin re-export kept for existing imports — the actual implementation now
// lives in confirm-dialog.ts alongside confirmDialog(), the shared
// confirm/notice primitive both this and per-content-type delete flows
// (e.g. blog-post-form-editor.ts's "Delete project") are built on.
export { showNotice } from './confirm-dialog.ts';
