import { stringify } from "csv-stringify/sync";
import type { ReportTable } from "../utils/mapping.js";

export function exportCsv(table: ReportTable): Buffer {
	const records = [table.columns.map((c) => c.header), ...table.rows];
	const body = stringify(records, {
		delimiter: ";",
		quoted_empty: true,
		bom: true,
	});
	return Buffer.from(body, "utf8");
}
