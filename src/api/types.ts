export interface ApiMeta {
	total: number;
	from: number;
	to: number;
	per_page: number;
	current_page: number;
	last_page: number;
}

export interface ApiLinks {
	path: string | null;
	first_page_url: string | null;
	last_page_url: string | null;
	next_page_url: string | null;
	prev_page_url: string | null;
}

export interface ApiEnvelope<T> {
	items: T[];
	meta: ApiMeta;
	links: ApiLinks;
}

export interface StatusRef {
	id: number;
	title: string;
	theme?: string;
}

export interface Receipt {
	key: string;
	status: string;
	operation_at?: string;
	cancel_reason?: boolean;
	links?: {
		fns_url?: string;
		saved_url?: string;
	};
}

export interface Contractor {
	id?: number;
	phone?: string;
	inn?: string;
	full_name?: string;
	short_name?: string;
	is_selfemployer?: boolean;
	is_deleted?: boolean;
	in_stop_list?: boolean;
}

export interface CardInfo {
	id: number | null;
	uuid?: string | null;
	mask?: string;
}

export interface BankRequisite {
	account_number?: string;
	sbp_bank_id?: number;
	card?: CardInfo | null;
	bank_name?: string;
	last_name?: string;
	first_name?: string;
	middle_name?: string;
	bik?: string;
	inn?: string;
	payment_text?: string;
}

export interface Requisite {
	id?: number;
	type_id?: number;
	title?: string;
	mask?: string;
	description?: string;
	requisite?: BankRequisite;
}

export interface ActRef {
	id?: number;
	status?: StatusRef;
}

export interface Payment {
	id: number;
	status?: StatusRef;
	is_final?: boolean;
	customer_payment_id?: string;
	external_id?: number;
	amount?: number;
	amount_paid?: number;
	commission?: number;
	commission_bank?: number;
	tax_amount?: number;
	receipt?: Receipt;
	payment_purpose?: string;
	payment_from?: string;
	driver?: { id: number; full_name?: string };
	contractor?: Contractor;
	bank_account?: { id?: number; name?: string };
	requisite?: Requisite;
	act?: ActRef | null;
	acceptance_certificate?: { id?: number } | null;
	payload?: Record<string, unknown>;
	comment?: string;
	is_for_pledge_redemption?: boolean;
	has_files?: boolean;
	approved_at?: string;
	paid_at?: string;
	refund_at?: string;
	canceled_at?: string;
	created_at?: string;
	updated_at?: string;
}

export interface NominalPayment {
	payed_at: string;
	recipient_inn: string;
	amount: number;
	contractor_inn: string;
	purpose: string;
	organization_inn: string;
}

export interface IncomingTransaction {
	charged_at: string;
	draw_at: string;
	authorized_at?: string;
	payer_inn: string;
	amount: number;
	purpose: string;
	organization_inn: string;
	identification_date?: string;
}
