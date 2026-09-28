import { Bot } from "grammy";
import { authMiddleware } from "./auth/middleware.js";
import { config } from "./config.js";
import { registerExportFlow } from "./flows/export.js";
import { registerAdminCommands } from "./telegram/admin.js";
import { loggingMiddleware } from "./telegram/logging.js";

const bot = new Bot(config.botToken);

bot.use(loggingMiddleware);
bot.use(authMiddleware);
registerAdminCommands(bot);
registerExportFlow(bot);

bot.catch((err) => {
	const chatId = err.ctx.chat?.id ?? err.ctx.from?.id;
	const detail = err.ctx.message?.text ?? err.ctx.callbackQuery?.data ?? "";
	console.error(`[bot.catch] chat=${chatId} update=${detail}`, err.error);
});

try {
	await bot.start();
} catch (err) {
	console.error("Не удалось запустить бота:", err);
	process.exit(1);
}
