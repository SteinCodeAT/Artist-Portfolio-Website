import { recordForDisplay, type RecordDef } from '@steincms/cms/schema';
import type { ContentBlock, PostRecord } from './posts-store';

export type PostDisplayResult = {
	post: PostRecord;
	isPreview: boolean;
	hasDraft: boolean;
};

export function postForDisplay(
	post: PostRecord,
	options: { preview: boolean; authorized: boolean },
	recordDef?: RecordDef,
): PostDisplayResult {
	const { record, isPreview, hasDraft } = recordForDisplay(post, options, recordDef);
	return { post: record, isPreview, hasDraft };
}

export type PostEditorSource = {
	title: string;
	description: string;
	mainImage: string | null;
	blocks: ContentBlock[];
	mainGallery: string[];
	year: string;
	videoEmbedUrl: string;
	editingDraft: boolean;
};

/** Prefer previewDraft for the editor when present. */
export function postEditorSource(post: PostRecord): PostEditorSource {
	const draft = post.previewDraft;
	if (draft) {
		return {
			title: String(draft.title ?? ''),
			description: String(draft.description ?? ''),
			mainImage: (draft.mainImage as string | null) ?? null,
			blocks: (draft.blocks as ContentBlock[] | undefined) ?? [],
			mainGallery: (draft.mainGallery as string[] | undefined) ?? [],
			year: String(draft.year ?? ''),
			videoEmbedUrl: String(draft.videoEmbedUrl ?? ''),
			editingDraft: true,
		};
	}

	return {
		title: post.title,
		description: post.description,
		mainImage: post.mainImage ?? null,
		blocks: post.blocks,
		mainGallery: post.mainGallery ?? [],
		year: post.year ?? '',
		videoEmbedUrl: post.videoEmbedUrl ?? '',
		editingDraft: false,
	};
}
