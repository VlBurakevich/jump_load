import { InlineKeyboard } from "grammy";

export type ReportChoice = "cheques" | "bank";
export type FormatChoice = "csv" | "xlsx";
export type PeriodChoice = "today" | "7d" | "30d" | "custom";

export const REPORT_LABELS: Record<ReportChoice, string> = {
	cheques: "🟢 Чеки (акты)",
	bank: "🔵 Операции по банку",
};

export const FORMAT_LABELS: Record<FormatChoice, string> = {
	csv: "📄 CSV",
	xlsx: "📊 Excel",
};

export const PERIOD_LABELS: Record<
	Exclude<PeriodChoice, "custom"> | "custom",
	string
> = {
	today: "Сегодня",
	"7d": "7 дней",
	"30d": "30 дней",
	custom: "🗓 Свой период",
};

export function reportKeyboard(): InlineKeyboard {
	return new InlineKeyboard()
		.text(REPORT_LABELS.cheques, "report:cheques")
		.row()
		.text(REPORT_LABELS.bank, "report:bank");
}

export function formatKeyboard(): InlineKeyboard {
	return new InlineKeyboard()
		.text(FORMAT_LABELS.csv, "format:csv")
		.row()
		.text(FORMAT_LABELS.xlsx, "format:xlsx");
}

export function periodKeyboard(): InlineKeyboard {
	return new InlineKeyboard()
		.text("Сегодня", "period:today")
		.text("7 дней", "period:7d")
		.row()
		.text("30 дней", "period:30d")
		.text("🗓 Свой период", "period:custom");
}
