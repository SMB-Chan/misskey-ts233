/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { get } from 'idb-keyval';
import { LEGACY_ACCOUNTS_KEY, listAccountsFromStores, PIZZAX_BASE_STATE_KEY, resolveAccountFromStores } from '@@/js/account-token.js';
import type { AccountCredential } from '@@/js/account-token.js';

function currentHost(): string {
	return new URL(origin).host;
}

export async function getAccountFromId(id: string): Promise<AccountCredential | undefined> {
	const deviceState = await get(PIZZAX_BASE_STATE_KEY);
	const fromDevice = resolveAccountFromStores(id, currentHost(), deviceState, null);
	if (fromDevice) return fromDevice;

	const legacyAccounts = await get(LEGACY_ACCOUNTS_KEY);
	const account = resolveAccountFromStores(id, currentHost(), null, legacyAccounts);
	if (!account) console.log('Accounts are not recorded');
	return account;
}

export async function getStoredAccounts(): Promise<AccountCredential[]> {
	const deviceState = await get(PIZZAX_BASE_STATE_KEY);
	const legacyAccounts = await get(LEGACY_ACCOUNTS_KEY);
	return listAccountsFromStores(currentHost(), deviceState, legacyAccounts);
}
