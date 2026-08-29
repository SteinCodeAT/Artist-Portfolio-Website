import fs from 'node:fs';

const LOCK_STALE_MS = 30_000;
const LOCK_MAX_ATTEMPTS = 50;
const LOCK_RETRY_MS = 20;

function sleepSync(ms: number): void {
	const end = Date.now() + ms;
	while (Date.now() < end) {
		/* busy-wait for short lock retries */
	}
}

function acquireFileLock(lockPath: string, label: string): void {
	for (let attempt = 0; attempt < LOCK_MAX_ATTEMPTS; attempt++) {
		try {
			fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
			return;
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code !== 'EEXIST') {
				throw error;
			}

			if (fs.existsSync(lockPath)) {
				const stat = fs.statSync(lockPath);
				if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
					fs.unlinkSync(lockPath);
					continue;
				}
			}

			sleepSync(LOCK_RETRY_MS);
		}
	}

	throw new Error(`Could not acquire lock for ${label}`);
}

function releaseFileLock(lockPath: string): void {
	if (fs.existsSync(lockPath)) {
		fs.unlinkSync(lockPath);
	}
}

export function createFileStore(filePath: string) {
	const lockPath = `${filePath}.lock`;
	const dir = filePath.slice(0, Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')));
	const label = filePath.split(/[/\\]/).pop() ?? filePath;
	let writeQueue: Promise<unknown> = Promise.resolve();

	// Ensure the lock's directory exists up front — DB-mode stores only ever
	// call runWithLock(), never writeJson(), so nothing else would create it.
	if (dir) {
		fs.mkdirSync(dir, { recursive: true });
	}

	function runWithLock<T>(task: () => T): Promise<T> {
		const locked = async (): Promise<T> => {
			acquireFileLock(lockPath, label);
			try {
				return task();
			} finally {
				releaseFileLock(lockPath);
			}
		};

		const result = writeQueue.then(locked, locked) as Promise<T>;
		writeQueue = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	}

	function readJson<T>(): T[] {
		if (!fs.existsSync(filePath)) {
			return [];
		}
		return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T[];
	}

	function writeJson<T>(records: T[]): void {
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(filePath, JSON.stringify(records, null, '\t') + '\n', 'utf-8');
	}

	return { runWithLock, readJson, writeJson, filePath };
}
