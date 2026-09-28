import type { Bot, Context } from "grammy";
import { allowedIds, allowUser, denyUser, isAdmin } from "../auth/auth.js";

export function registerAdminCommands(bot: Bot) {
	bot.command("allow", async (ctx) => {
		if (!isAdmin(ctx.from?.id)) return deny(ctx);
		const id = Number(ctx.match.trim());
		if (!Number.isInteger(id)) return ctx.reply("Формат: /allow 123456");
		allowUser(id);
		await ctx.reply(`Доступ выдан: ${id}`);
	});

	bot.command("deny", async (ctx) => {
		if (!isAdmin(ctx.from?.id)) return deny(ctx);
		const id = Number(ctx.match.trim());
		if (!Number.isInteger(id)) return ctx.reply("Формат: /deny 123456");
		denyUser(id);
		await ctx.reply(`Доступ отозван: ${id}`);
	});

	bot.command("list", async (ctx) => {
		if (!isAdmin(ctx.from?.id)) return deny(ctx);
		const ids = [...allowedIds].sort((a, b) => a - b);
		await ctx.reply(
			ids.length === 0
				? "Список пуст."
				: `Допущенные (${ids.length}):\n${ids.map((id) => `• ${id}`).join("\n")}`,
		);
	});

	bot.callbackQuery(/^allow:(\d+)$/, async (ctx) => {
		if (!isAdmin(ctx.from?.id)) return;
		allowUser(Number(ctx.match[1]));
		await ctx.answerCallbackQuery({ text: "Доступ выдан" });
		await ctx.editMessageText(
			`${ctx.callbackQuery.message?.text ?? ""}\n\n✅ Допущен`,
		);
	});
}

function deny(ctx: Context) {
	return ctx.reply("Нет прав.");
}
