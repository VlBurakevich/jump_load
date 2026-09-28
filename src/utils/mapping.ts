import { fetchAll } from "../api/client.js";
import type { IncomingTransaction, Payment } from "../api/types.js";
import { bankDateRange, type PeriodInput, paymentsDateRange } from "./dates.js";

export interface Column {
	header: string;
}

export type Cell = string | number;

export interface ReportTable {
	columns: Column[];
	rows: Cell[][];
}

function fmtDate(iso?: string): string {
	return iso ? iso.slice(0, 10) : "";
}

function cardMask(p: Payment): string {
	const r = p.requisite?.requisite;
	return r?.card?.mask ?? r?.account_number ?? "";
}

function bankName(p: Payment): string {
	return p.requisite?.requisite?.bank_name ?? "";
}

export function deriveOperationType(p: Payment): string {
	if ((p.commission ?? 0) > 0) return "Комиссия платформы";
	if (p.act) return "Вознаграждение";
	if (p.contractor?.is_selfemployer && p.receipt?.key)
		return "Оплата самозанятому";
	if (p.is_for_pledge_redemption) return "Погашение залога";
	if (p.driver?.id) return "Выплата водителю";
	if (p.refund_at) return "Возврат";
	if (p.canceled_at) return "Отменена";
	return "Оплата услуг";
}

// ----- Чеки (акты) -----

interface ChequeCol {
	header: string;
	get: (p: Payment) => Cell;
}

const CHEQUE_COLS: ChequeCol[] = [
	{ header: "Дата", get: (p) => fmtDate(p.receipt?.operation_at ?? p.paid_at) },
	{ header: "Номер", get: (p) => p.id },
	{ header: "Контрагент", get: (p) => p.contractor?.full_name ?? "" },
	{ header: "ИНН", get: (p) => p.contractor?.inn ?? "" },
	{ header: "Сумма", get: (p) => p.amount_paid ?? p.amount ?? 0 },
	{
		header: "Счёт фактора",
		get: (p) => (cardMask(p) ? `${cardMask(p)} · ${bankName(p)}`.trim() : ""),
	},
	{ header: "Вид", get: (p) => deriveOperationType(p) },
	{ header: "Комиссия", get: (p) => p.commission ?? 0 },
	{ header: "Дата вх", get: (p) => fmtDate(p.created_at) },
	{
		header: "Номер вх",
		get: (p) => p.customer_payment_id ?? String(p.external_id ?? ""),
	},
	{
		header: "Оригинал чека",
		get: (p) => p.receipt?.links?.saved_url ?? p.receipt?.links?.fns_url ?? "",
	},
	{ header: "Комментарий", get: (p) => p.comment ?? "" },
];

export async function fetchChequesRows(
	period: PeriodInput,
): Promise<ReportTable> {
	const range = paymentsDateRange(period);
	const payments = await fetchAll<Payment>("/v2/payments", {
		...range,
		status: 1,
		include: "requisite,comment,payload",
	});
	const filtered = payments.filter((p) => p.receipt?.key);
	return {
		columns: CHEQUE_COLS.map((c) => ({ header: c.header })),
		rows: filtered.map((p) => CHEQUE_COLS.map((c) => c.get(p))),
	};
}

// ----- Операции по банку -----

interface BankRow {
	date: string;
	posting: number | null;
	writeoff: number | null;
	purpose: string;
	party: string;
	partyInn: string;
	kind: string;
	inNumber: string;
	inDate: string;
	comment: string;
}

const BANK_COLS: Array<{ header: string; get: (r: BankRow) => Cell }> = [
	{ header: "Дата", get: (r) => r.date },
	{ header: "Пост", get: (r) => r.posting ?? "" },
	{ header: "Списание", get: (r) => r.writeoff ?? "" },
	{ header: "Назначение платежа", get: (r) => r.purpose },
	{ header: "Контрагент", get: (r) => r.party },
	{ header: "ИНН", get: (r) => r.partyInn },
	{ header: "ВидОперации", get: (r) => r.kind },
	{ header: "Вх. Номер", get: (r) => r.inNumber },
	{ header: "Вх. Дата", get: (r) => r.inDate },
	{ header: "Комментарий", get: (r) => r.comment },
];

function fromPayment(p: Payment): BankRow {
	return {
		date: fmtDate(p.paid_at ?? p.created_at),
		posting: null,
		writeoff: p.amount_paid ?? p.amount ?? 0,
		purpose:
			p.payment_purpose ??
			(p.customer_payment_id
				? `Выплата по заказу ${p.customer_payment_id}`
				: `Выплата № ${p.id}`),
		party: p.contractor?.full_name ?? "",
		partyInn: p.contractor?.inn ?? "",
		kind: deriveOperationType(p),
		inNumber: p.customer_payment_id ?? String(p.external_id ?? ""),
		inDate: fmtDate(p.created_at),
		comment: p.comment ?? "",
	};
}

function fromIncoming(
	t: IncomingTransaction,
	contractors: ReadonlyMap<string, string>,
): BankRow {
	const name = t.payer_inn ? (contractors.get(t.payer_inn) ?? "") : "";
	return {
		date: fmtDate(t.charged_at),
		posting: t.amount,
		writeoff: null,
		purpose: t.purpose ?? "",
		party: name,
		partyInn: t.payer_inn,
		kind: "Поступление",
		inNumber: "",
		inDate: "",
		comment: "",
	};
}

export async function fetchBankRows(period: PeriodInput): Promise<ReportTable> {
	const [payments, incoming] = await Promise.all([
		fetchAll<Payment>("/v2/payments", {
			...paymentsDateRange(period),
			status: 1,
			include: "comment",
		}),
		fetchAll<IncomingTransaction>(
			"/nominal-account/incoming-transactions",
			bankDateRange(period),
		),
	]);
	const contractors = new Map<string, string>();
	for (const p of payments) {
		if (p.contractor?.inn)
			contractors.set(p.contractor.inn, p.contractor.full_name ?? "");
	}
	const rows = [
		...payments.map(fromPayment),
		...incoming.map((t) => fromIncoming(t, contractors)),
	];
	rows.sort((a, b) => a.date.localeCompare(b.date));
	return {
		columns: BANK_COLS.map((c) => ({ header: c.header })),
		rows: rows.map((r) => BANK_COLS.map((c) => c.get(r))),
	};
}
