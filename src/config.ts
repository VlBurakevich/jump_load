import "dotenv/config";

function required(name: string, value: string | undefined): string {
	if (!value)
		throw new Error(`Отсутствует обязательная переменная окружения: ${name}`);
	return value;
}

export const config = {
	botToken: required("BOT_TOKEN", process.env.BOT_TOKEN),
	apiJumpUrl: required("API_JUMP_URL", process.env.API_JUMP_URL),
	apiJumpKey: required("API_JUMP_KEY", process.env.API_JUMP_KEY),
	adminId: Number(required("ADMIN_ID", process.env.ADMIN_ID)),
} as const;
