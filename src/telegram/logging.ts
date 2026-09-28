import type { Context, NextFunction } from "grammy";

export async function loggingMiddleware(
	ctx: Context,
	next: NextFunction,
): Promise<void> {
	const chatId = ctx.chat?.id ?? ctx.from?.id;
	const user = ctx.from?.id;
	const kind = ctx.callbackQuery
		? "callback"
		: ctx.message
			? "message"
			: "update";
	const detail = ctx.callbackQuery?.data ?? ctx.message?.text ?? "";
	const start = Date.now();
	try {
		await next();
	} catch (err) {
		console.error(`[ERR] chat=${chatId} user=${user} ${kind}: ${detail}`, err);
		throw err;
	} finally {
		console.log(
			`[OK] chat=${chatId} user=${user} ${kind}: ${detail} ${Date.now() - start}ms`,
		);
	}
}
