export type TableBlockShape = {
	id: string;
	type: 'table';
	hasHeaderRow: boolean;
	rows: string[][];
};

export const DEFAULT_TABLE_ROWS = 3;
export const DEFAULT_TABLE_COLS = 2;

const FACT_LINE_RE = /^([^:\n]{2,48}):\s+([\s\S]+)$/;

export function isFactLine(line: string): boolean {
	return FACT_LINE_RE.test(line.trim());
}

export function parseFactLine(line: string): [label: string, value: string] | null {
	const match = line.trim().match(FACT_LINE_RE);
	if (!match) return null;
	return [match[1].trim(), match[2].trim()];
}

export function factLinesToTableRows(lines: string[]): string[][] {
	return lines
		.map((line) => parseFactLine(line))
		.filter((parsed): parsed is [string, string] => parsed !== null)
		.map(([label, value]) => [label, value]);
}

export function createTableBlockFromFactLines(id: string, lines: string[]): TableBlockShape {
	return {
		id,
		type: 'table',
		hasHeaderRow: false,
		rows: factLinesToTableRows(lines),
	};
}

function sanitizeCell(value: unknown): string {
	return String(value ?? '')
		.replace(/<[^>]*>/g, '')
		.trim();
}

export function createEmptyGrid(rows: number, cols: number): string[][] {
	return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
}

export function createDefaultTableBlock(id: string): TableBlockShape {
	return {
		id,
		type: 'table',
		hasHeaderRow: false,
		rows: createEmptyGrid(DEFAULT_TABLE_ROWS, DEFAULT_TABLE_COLS),
	};
}

export function normalizeTableRows(raw: unknown): string[][] {
	if (!Array.isArray(raw) || raw.length === 0) {
		return createEmptyGrid(1, 1);
	}

	const rows = raw.map((row) => {
		if (!Array.isArray(row)) {
			return [''];
		}
		const cells = row.map(sanitizeCell);
		return cells.length > 0 ? cells : [''];
	});

	const colCount = Math.max(...rows.map((row) => row.length), 1);
	return rows.map((row) => {
		const normalized = [...row];
		while (normalized.length < colCount) {
			normalized.push('');
		}
		return normalized.slice(0, colCount);
	});
}

export function isTableEmpty(rows: string[][]): boolean {
	return rows.every((row) => row.every((cell) => cell.trim() === ''));
}

export function validateTableBlockFields(
	block: Record<string, unknown>,
	blockIndex: number,
): Omit<TableBlockShape, 'id' | 'type'> {
	const hasHeaderRow = Boolean(block.hasHeaderRow);
	const rows = normalizeTableRows(block.rows);

	if (rows.length === 0 || rows[0].length === 0) {
		throw new Error(`Block ${blockIndex + 1}: table requires at least one cell`);
	}

	return { hasHeaderRow, rows };
}
