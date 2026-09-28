import { type Bot, type Context, InputFile } from "grammy";
import { exportCsv } from "../exporters/csv.js";
import { exportXlsx } from "../exporters/xlsx.js";
import {
	type FormatChoice,
	formatKeyboard,
	type PeriodChoice,
	periodKeyboard,
	type ReportChoice,
	reportKeyboard,
} from "../telegram/keyboard.js";
import {
	type DateRange,
	type PresetPeriod,
	parseCustomRange, paymentsDateRange,
} from "../utils/dates.js";
import { fetchBankRows, fetchChequesRows } from "../utils/mapping.js";

interface FlowState {
	report?: ReportChoice;
	format?: FormatChoice;
	waitCustom?: boolean;
}

const fs = new Map<number, FlowState>();

function resolveChatId(ctx: Context): number | null {
	return ctx.chat?.id ?? ctx.from?.id ?? null;
}

function rangeLabel(period: PresetPeriod | DateRange): string {
	const r = paymentsDateRange(period);
	const from = r.created_at_from?.slice(0, 10) ?? "";
	const to = r.created_at_to?.slice(0, 10) ?? "";
	if (!from || !to) return from || to || "period";
	return from.slice(0, 4) === to.slice(0, 4)
		? `${from.slice(5)}_${to.slice(5)}`
		: `${from}_${to}`;
}

export function registerExportFlow(bot: Bot): void {
	bot.command("start", async (ctx) => {
		fs.set(ctx.chat.id, {});
		await ctx.reply("Выберите, что нужно выгрузить:", {
			reply_markup: reportKeyboard(),
		});
	});

	bot.command("cancel", async (ctx) => {
		fs.set(ctx.chat.id, {});
		await ctx.reply("Отменено. /start");
	});

	bot.callbackQuery(/^report:(cheques|bank)$/, async (ctx) => {
		void ctx.answerCallbackQuery().catch(() => {});
		const chatId = resolveChatId(ctx);
		if (chatId === null) return;
		const state = fs.get(chatId) ?? {};
		state.report = ctx.match[1] as ReportChoice;
		fs.set(chatId, state);
		await ctx.reply("Выберите формат файла:", {
			reply_markup: formatKeyboard(),
		});
	});

	bot.callbackQuery(/^format:(csv|xlsx)$/, async (ctx) => {
		void ctx.answerCallbackQuery().catch(() => {});
		const chatId = resolveChatId(ctx);
		if (chatId === null) return;
		const state = fs.get(chatId);
		if (!state?.report) return;
		state.format = ctx.match[1] as FormatChoice;
		await ctx.reply("Выберите период:", { reply_markup: periodKeyboard() });
	});

	bot.callbackQuery(/^period:(today|7d|30d|custom)$/, async (ctx) => {
		void ctx.answerCallbackQuery().catch(() => {});
		const chatId = resolveChatId(ctx);
		if (chatId === null) return;
		const state = fs.get(chatId);
		if (!state?.report || !state.format) return;
		const choice = ctx.match[1] as PeriodChoice;
		if (choice === "custom") {
			state.waitCustom = true;
			await ctx.reply(
				"Введите период одной строкой:\n`ДД.ММ.ГГГГ - ДД.ММ.ГГГГ`\nНапример: 01.09.2026 - 15.09.2026",
				{
					parse_mode: "Markdown",
				},
			);
			return;
		}
		void runExport(ctx, chatId, choice as PresetPeriod);
	});

	bot.on("message:text", async (ctx) => {
		const chatId = resolveChatId(ctx);
		if (chatId === null) return;
		const state = fs.get(chatId);
		if (!state?.waitCustom || !state.report || !state.format) return;
		const range = parseCustomRange(ctx.message.text);
		if (!range) {
			await ctx.reply("❌ Неверный формат. Пример: 01.09.2026 - 15.09.2026");
			return;
		}
		state.waitCustom = false;
		void runExport(ctx, chatId, range);
	});
}

const running = new Set<number>();

async function runExport(
	ctx: Context,
	chatId: number,
	period: PresetPeriod | DateRange,
): Promise<void> {
	if (running.has(chatId)) {
		await ctx
			.answerCallbackQuery("⏳ Уже формирую файл, подождите")
			.catch(() => {});
		return;
	}
	running.add(chatId);
	try {
		const state = fs.get(chatId);
		if (!state?.report || !state.format) return;
		await ctx.reply("⏳ Загружаю данные…");
		const table =
			state.report === "cheques"
				? await fetchChequesRows(period)
				: await fetchBankRows(period);
		if (table.rows.length === 0) {
			await ctx.reply("📭 За выбранный период данных нет");
			return;
		}
		const buf =
			state.format === "csv" ? exportCsv(table) : await exportXlsx(table);
		const ext = state.format === "csv" ? "csv" : "xlsx";
		const reportLabel = state.report === "cheques" ? "чеки" : "банк";
		const label = rangeLabel(period);
		await ctx.replyWithDocument(
			new InputFile(buf, `отчёт_${reportLabel}_${label}.${ext}`),
			{ caption: "✅ Готово" },
		);
	} catch (err) {
		console.error(`[export] chat=${chatId}`, err);
		await ctx.reply("❌ Не удалось выгрузить файл. Попробуйте ещё раз позже.");
	} finally {
		running.delete(chatId);
	}
}
