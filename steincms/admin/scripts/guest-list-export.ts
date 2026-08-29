import * as XLSX from 'xlsx';

export type GuestExportPayload = {
	title: string;
	fields: Array<{ id: string; label: string }>;
	rows: Array<{
		name: string;
		email: string;
		guests: number;
		ticketCode: string;
		createdAt: string;
		answers: Record<string, string>;
	}>;
};

function safeFileStem(title: string): string {
	return (
		title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'gaesteliste'
	);
}

export function exportGuestListToExcel(payload: GuestExportPayload): void {
	const headers = ['Name', 'E-Mail', 'Personen', 'Ticket', 'Angemeldet'];
	for (const field of payload.fields) headers.push(field.label);

	const rows = payload.rows.map((row) => {
		const cells: Array<string | number> = [
			row.name,
			row.email,
			row.guests,
			row.ticketCode,
			row.createdAt,
		];
		for (const field of payload.fields) {
			cells.push(row.answers[field.label] ?? '');
		}
		return cells;
	});

	const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, sheet, 'Gästeliste');

	const stamp = new Date().toISOString().slice(0, 10);
	const filename = `${safeFileStem(payload.title)}-gaesteliste-${stamp}.xlsx`;
	XLSX.writeFile(workbook, filename);
}

export function initGuestListExport(): void {
	const payloadNode = document.getElementById('guest-export-payload');
	const raw = payloadNode?.textContent;
	if (!raw) return;

	let payload: GuestExportPayload;
	try {
		payload = JSON.parse(raw) as GuestExportPayload;
	} catch {
		return;
	}

	document.querySelector('[data-export-excel]')?.addEventListener('click', () => {
		exportGuestListToExcel(payload);
	});
}
