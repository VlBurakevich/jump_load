export type PresetPeriod = "today" | "7d" | "30d";

export interface DateRange {
	from: string;
	to: string;
}

export type PeriodInput = PresetPeriod | DateRange;

function toIsoDateTime(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	const offset = -d.getTimezoneOffset();
	const sign = offset >= 0 ? "+" : "-";
	const abs = Math.abs(offset);
	return (
		`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
		`T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
		`${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
	);
}

export function paymentsDateRange(period: PeriodInput): {
	created_at_from?: string;
	created_at_to?: string;
} {
	if (typeof period === "object")
		return { created_at_from: period.from, created_at_to: period.to };
	const now = new Date();
	const startOfDay = new Date(now);
	startOfDay.setHours(0, 0, 0, 0);
	const days = period === "today" ? 0 : period === "7d" ? 7 : 30;
	const from = new Date(startOfDay);
	from.setDate(from.getDate() - days);
	return {
		created_at_from: toIsoDateTime(from),
		created_at_to: toIsoDateTime(now),
	};
}

export function bankDateRange(period: PeriodInput): {
	date_from?: string;
	date_to?: string;
} {
	const range = paymentsDateRange(period);
	const result: { date_from?: string; date_to?: string } = {};
	if (range.created_at_from) result.date_from = range.created_at_from;
	if (range.created_at_to) result.date_to = range.created_at_to;
	return result;
}

const CUSTOM_DATE_RE =
	/^(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})$/;

export function parseCustomRange(input: string): DateRange | null {
	const m = input.trim().match(CUSTOM_DATE_RE);
	if (!m) return null;
	const [, d1, mo1, y1, d2, mo2, y2] = m;
	const from = new Date(Number(y1), Number(mo1) - 1, Number(d1));
	const to = new Date(Number(y2), Number(mo2) - 1, Number(d2));
	if (from.getDate() !== Number(d1) || from.getMonth() !== Number(mo1) - 1)
		return null;
	if (to.getDate() !== Number(d2) || to.getMonth() !== Number(mo2) - 1)
		return null;
	if (from.getTime() > to.getTime()) return null;
	return { from: toIsoDateTime(from), to: toIsoDateTime(to) };
}
