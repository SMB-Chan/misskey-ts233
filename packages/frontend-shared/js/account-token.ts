/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// `new Pizzax('base', …)` の device state。accountTokens はこの中にある（store.ts と揃える）
export const PIZZAX_BASE_STATE_KEY = 'pizzax::base';

// アカウント管理刷新前の idb-keyval キー。もう書き込まれない
export const LEGACY_ACCOUNTS_KEY = 'accounts';

export type AccountCredential = {
	id: string;
	token: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readAccountTokenMap(deviceState: unknown): Record<string, string> | null {
	if (!isRecord(deviceState)) return null;
	const raw = deviceState.accountTokens;
	if (!isRecord(raw)) return null;

	const tokens: Record<string, string> = {};
	for (const [key, value] of Object.entries(raw)) {
		if (typeof value !== 'string' || value === '') continue;
		tokens[key] = value;
	}
	return tokens;
}

function readLegacyAccounts(value: unknown): AccountCredential[] {
	if (!Array.isArray(value)) return [];

	const accounts: AccountCredential[] = [];
	for (const item of value) {
		if (!isRecord(item)) continue;
		if (typeof item.id !== 'string' || item.id === '') continue;
		if (typeof item.token !== 'string' || item.token === '') continue;
		accounts.push({ id: item.id, token: item.token });
	}
	return accounts;
}

function tokenForUser(tokens: Record<string, string> | null, userId: string, host: string): string | undefined {
	if (tokens == null || userId === '' || host === '') return undefined;
	const key = `${host}/${userId}`;
	if (!Object.prototype.hasOwnProperty.call(tokens, key)) return undefined;
	return tokens[key];
}

/**
 * 今のインスタンスに対して使える資格情報を返す。
 * トークンは `${host}/${userId}` でインスタンスに紐づくので、別ホストのトークンは使わない。
 * Pizzax に無いときだけ、刷新前の `accounts` 配列へフォールバックする。
 */
export function resolveAccountFromStores(userId: string, host: string, deviceState: unknown, legacyAccounts: unknown): AccountCredential | undefined {
	const token = tokenForUser(readAccountTokenMap(deviceState), userId, host);
	if (token != null) return { id: userId, token };
	return readLegacyAccounts(legacyAccounts).find(account => account.id === userId);
}

/**
 * このインスタンスのアカウント一覧。Pizzax を優先し、同じ id が旧配列にもある場合は旧トークンを捨てる。
 */
export function listAccountsFromStores(host: string, deviceState: unknown, legacyAccounts: unknown): AccountCredential[] {
	const tokens = readAccountTokenMap(deviceState);
	const accounts: AccountCredential[] = [];
	const seen = new Set<string>();

	if (tokens != null && host !== '') {
		const prefix = `${host}/`;
		for (const [key, token] of Object.entries(tokens)) {
			if (!key.startsWith(prefix)) continue;
			const id = key.slice(prefix.length);
			if (id === '' || seen.has(id)) continue;
			seen.add(id);
			accounts.push({ id, token });
		}
	}

	for (const account of readLegacyAccounts(legacyAccounts)) {
		if (seen.has(account.id)) continue;
		seen.add(account.id);
		accounts.push(account);
	}

	return accounts;
}
