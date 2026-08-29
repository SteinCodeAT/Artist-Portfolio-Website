export type CalendarEvent = {
	date: string | null;
};

export type CalendarDay = {
	date: string;
	dayNumber: number;
	weekdayShort: string;
	isCurrentMonth: boolean;
	isToday: boolean;
};

export type MonthRef = {
	year: number;
	month: number;
};

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAY_BY_INDEX = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export function parseMonthParam(value: string | null): MonthRef | null {
	if (!value || !/^\d{4}-\d{2}$/.test(value)) {
		return null;
	}
	const [year, month] = value.split('-').map(Number);
	if (month < 1 || month > 12) {
		return null;
	}
	return { year, month };
}

export function currentMonthRef(): MonthRef {
	const now = new Date();
	return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
	const date = new Date(year, month - 1 + delta, 1);
	return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function monthKey({ year, month }: MonthRef): string {
	return `${year}-${String(month).padStart(2, '0')}`;
}

export function formatMonthLabel({ year, month }: MonthRef): string {
	return new Date(year, month - 1, 1).toLocaleDateString('de-AT', {
		month: 'long',
		year: 'numeric',
	});
}

function toDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function buildMonthGrid({ year, month }: MonthRef): CalendarDay[] {
	const firstOfMonth = new Date(year, month - 1, 1);
	const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
	const gridStart = new Date(firstOfMonth);
	gridStart.setDate(firstOfMonth.getDate() - mondayOffset);

	const todayKey = toDateKey(new Date());
	const cells: CalendarDay[] = [];

	for (let i = 0; i < 42; i++) {
		const date = new Date(gridStart);
		date.setDate(gridStart.getDate() + i);
		const dateKey = toDateKey(date);

		cells.push({
			date: dateKey,
			dayNumber: date.getDate(),
			weekdayShort: WEEKDAY_BY_INDEX[date.getDay()],
			isCurrentMonth: date.getMonth() === month - 1,
			isToday: dateKey === todayKey,
		});
	}

	return cells;
}

export function chunkWeeks(days: CalendarDay[]): CalendarDay[][] {
	const weeks: CalendarDay[][] = [];
	for (let i = 0; i < days.length; i += 7) {
		weeks.push(days.slice(i, i + 7));
	}
	return weeks;
}

export function groupEventsByDate<T extends CalendarEvent>(events: T[]): Map<string, T[]> {
	const map = new Map<string, T[]>();

	for (const event of events) {
		if (!event.date || !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
			continue;
		}
		const list = map.get(event.date) ?? [];
		list.push(event);
		map.set(event.date, list);
	}

	for (const list of map.values()) {
		list.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
	}

	return map;
}

export function getWeekdayLabels(): string[] {
	return WEEKDAYS;
}
