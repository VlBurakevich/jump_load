import ExcelJS from "exceljs";
import type { ReportTable } from "../utils/mapping.js";

export async function exportXlsx(table: ReportTable): Promise<Buffer> {
	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet("Отчёт");
	ws.addRow(table.columns.map((c) => c.header));
	for (const row of table.rows) ws.addRow(row);
	ws.getRow(1).font = { bold: true };
	ws.getRow(1).alignment = { horizontal: "center" };
	ws.columns.forEach((col) => {
		if (col.number === undefined) return;
		const lengths = ws
			.getColumn(col.number)
			.values.map((v) => String(v ?? "").length);
		col.width = Math.min(40, Math.max(10, ...lengths));
	});
	return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}
