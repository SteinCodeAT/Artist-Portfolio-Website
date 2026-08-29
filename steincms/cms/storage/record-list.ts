/** Read/write a full list of records (events, posts, …). */
export type RecordListStorage<T> = {
	readAll: () => T[];
	writeAll: (records: T[]) => void;
};
