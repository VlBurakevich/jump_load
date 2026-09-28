import type { Context, NextFunction } from "grammy";
import { config } from "../config.js";
import { isAllowed } from "./auth.js";

export async function authMiddleware(ctx: Context, next: NextFunction) {
	const id = ctx.from?.id;
	if (isAllowed(id)) {
		await next();
		return;
	}

	const isStartAttempt = ctx.message?.text?.startsWith("/start");
	if (isStartAttempt && id) await notifyAdmin(ctx);

	await ctx.reply("Доступ запрещён.");
}

async function notifyAdmin(ctx: Context) {
	const from = ctx.from;
	if (!from) return;
	const name = [from.first_name, from.last_name].filter(Boolean).join(" ");
	await ctx.api.sendMessage(
		config.adminId,
		[
			"🔴 Попытка доступа",
			`👤 ID: <code>${from.id}</code>`,
			`📛 Имя: ${name || "—"}`,
			`🎭 @${from.username || "нет"}`,
			`🌐 Язык: ${from.language_code || "—"}`,
			`🔗 Профиль: <a href="tg://user?id=${from.id}">открыть</a>`,
		].join("\n"),
		{
			parse_mode: "HTML",
			reply_markup: {
				inline_keyboard: [
					[{ text: "✅ Допустить", callback_data: `allow:${from.id}` }],
				],
			},
		},
	);
}
