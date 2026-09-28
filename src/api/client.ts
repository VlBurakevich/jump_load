import { config } from "../config.js";
import type { ApiEnvelope } from "./types.js";

export class ApiError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

const REQUEST_TIMEOUT_MS = 60_000;
const CONCURRENCY = 24;
const REQUEST_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

async function request<T>(path: string, params: QueryParams): Promise<T> {
	const url = new URL(`${config.apiJumpUrl}${path}`);
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== "")
			url.searchParams.set(key, String(value));
	}
	let delay = 0;
	for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt++) {
		if (delay > 0) await sleep(delay);
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
		try {
			const res = await fetch(url, {
				headers: {
					"Client-Key": config.apiJumpKey,
					Accept: "application/json",
				},
				signal: controller.signal,
			});
			if (res.ok) return (await res.json()) as T;
			let detail = "";
			try {
				detail = await res.text();
			} catch {
				detail = "";
			}
			const retryable = res.status === 429 || res.status >= 500;
			if (!retryable || attempt === REQUEST_RETRIES) {
				throw new ApiError(
					res.status,
					`API ${path}: ${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ""}`,
				);
			}
		} catch (err) {
			if (err instanceof ApiError) throw err;
			if (err instanceof DOMException && err.name === "AbortError") {
				throw new ApiError(
					0,
					`API ${path}: таймаут ${REQUEST_TIMEOUT_MS / 1000}с`,
				);
			}
			if (attempt === REQUEST_RETRIES) throw err;
		} finally {
			clearTimeout(timer);
		}
		delay = RETRY_BASE_DELAY_MS * attempt;
	}
	throw new ApiError(0, `API ${path}: ${REQUEST_RETRIES} попытки не удались`);
}

async function mapConcurrent<T, R>(
	items: readonly T[],
	limit: number,
	fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const out = new Array<R>(items.length);
	const count = Math.max(0, Math.min(limit, items.length));
	let next = 0;
	const worker = async (): Promise<void> => {
		for (;;) {
			const i = next++;
			if (i >= items.length) return;
			const item = items[i];
			if (item === undefined) return;
			out[i] = await fn(item, i);
		}
	};
	const workers: Promise<void>[] = [];
	for (let w = 0; w < count; w++) workers.push(worker());
	await Promise.all(workers);
	return out;
}

export async function fetchAll<T>(
	path: string,
	params: QueryParams = {},
): Promise<T[]> {
	const first = await request<ApiEnvelope<T>>(path, {
		...params,
		page: 1,
		per_page: 200,
	});
	const lastPage = first.meta?.last_page ?? 1;
	if (lastPage <= 1) return first.items;
	const rest = await mapConcurrent(
		Array.from({ length: lastPage - 1 }, (_, i) => i + 2),
		CONCURRENCY,
		(page) => request<ApiEnvelope<T>>(path, { ...params, page, per_page: 200 }),
	);
	return [...first.items, ...rest.flatMap((r) => r.items)];
}
