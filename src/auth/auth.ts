import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "../config.js";

const FILE = "data/allowed.json";

function persist(list: number[]) {
	mkdirSync(dirname(FILE), { recursive: true });
	writeFileSync(FILE, JSON.stringify(list, null, 2));
}

function load(): Set<number> {
	const ids = new Set<number>();
	try {
		const saved = JSON.parse(readFileSync(FILE, "utf-8")) as number[];
		for (const id of saved) ids.add(id);
	} catch {
		ids.add(config.adminId);
		persist([...ids]);
	}
	return ids;
}

export const allowedIds = load();

export function allowUser(id: number) {
	allowedIds.add(id);
	persist([...allowedIds]);
}

export function denyUser(id: number) {
	allowedIds.delete(id);
	persist([...allowedIds]);
}

export const isAllowed = (id: number | undefined): boolean =>
	id !== undefined && allowedIds.has(id);

export const isAdmin = (id: number | undefined): boolean =>
	id === config.adminId;
