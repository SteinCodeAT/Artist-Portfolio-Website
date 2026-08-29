/** Client-side behaviour for the planner calendar admin page */

import { confirmDeleteEvent } from './event-form-modal';

export function initPlannerCalendar(options: {
	editorBase: string;
	calendarPath: string;
}) {
	const { editorBase, calendarPath } = options;
	const searchInput = document.getElementById('event-search');
	const monthPicker = document.querySelector('.month-picker-input') as HTMLInputElement | null;

	function editorUrl(date: string | null) {
		const params = new URLSearchParams({ from: 'calendar' });
		if (date) params.set('date', date);
		return `${editorBase}?${params.toString()}`;
	}

	async function deleteEvent(id: string, title?: string) {
		const confirmed = await confirmDeleteEvent({ title });
		if (!confirmed) return;
		
		const response = await fetch('/api/update-events', {
		  method: 'DELETE',
		  headers: { 'Content-Type': 'application/json' },
		  credentials: 'same-origin',
		  body: JSON.stringify({ id }),
		});
		if (!response.ok) {
		  window.alert('Löschen fehlgeschlagen.');
		  return;
		}
		window.location.reload();
	  }

	function applySearch(query: string) {
		const normalized = query.trim().toLowerCase();
		const days = document.querySelectorAll('.calendar-day');

		days.forEach((day) => {
			const rows = day.querySelectorAll('.event-row');
			let visibleCount = 0;

			rows.forEach((row) => {
				const text = row.getAttribute('data-search-text') || '';
				const matches = !normalized || text.includes(normalized);
				row.classList.toggle('is-hidden', !matches);
				if (matches) visibleCount += 1;
			});

			day.classList.toggle('search-dim', Boolean(normalized) && visibleCount === 0);
			day.classList.toggle('search-hit', Boolean(normalized) && visibleCount > 0);
		});
	}

	document.querySelectorAll('.calendar-day').forEach((day) => {
		day.addEventListener('click', (e) => {
			const target = e.target as HTMLElement;
			if (target.closest('.action-btn')) {
				return;
			}
			if (target.closest('.event-row')) return;
			const date = day.getAttribute('data-date');
			window.location.href = editorUrl(date);
		});
	});

	monthPicker?.addEventListener('change', (event) => {
		const value = (event.target as HTMLInputElement).value;
		if (value) {
			window.location.href = `${calendarPath}?month=${value}`;
		}
	});

	searchInput?.addEventListener('input', (event) => {
		applySearch((event.target as HTMLInputElement).value);
	});

	document.querySelectorAll('.delete-btn').forEach((button) => {
		button.addEventListener('click', (event) => {
			event.stopPropagation();
			const id = button.getAttribute('data-event-id');
			if (id) void deleteEvent(id);
		});
	});
}

export function initPlannerCalendarFromRoot() {
	const root = document.getElementById('planner-calendar-root');
	if (!root) return;

	initPlannerCalendar({
		editorBase: root.dataset.editorBase ?? '',
		calendarPath: root.dataset.calendarPath ?? '',
	});
}
