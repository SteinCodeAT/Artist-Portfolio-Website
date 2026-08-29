export type TextBlockData = {
	id: string;
	type: 'text';
	html: string;
};

export type ImageBlockData = {
	id: string;
	type: 'image';
	url: string;
	alt: string;
	caption?: string;
};

export type GalleryImageData = {
	id: string;
	url: string;
	thumbUrl: string;
	alt?: string;
};

export type GalleryBlockData = {
	id: string;
	type: 'gallery';
	images: GalleryImageData[];
};

export type TableBlockData = {
	id: string;
	type: 'table';
	hasHeaderRow: boolean;
	rows: string[][];
};

/** One content section in the article body (called "block" in the JSON/API). */
export type BlockData = TextBlockData | ImageBlockData | GalleryBlockData | TableBlockData;
