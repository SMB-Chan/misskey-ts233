/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { host } from '@@/js/config.js';
import { LEGACY_ACCOUNTS_KEY, resolveAccountFromStores } from '@@/js/account-token.js';
import { store } from '@/store.js';
import { get } from '@/utility/idb-proxy.js';

export async function getAccountFromId(id: string): Promise<{ id: string; token: string } | undefined> {
	await store.ready;

	// このタブの書き込みは IndexedDB 反映前でも store に載っている
	const fromStore = resolveAccountFromStores(id, host, { accountTokens: store.s.accountTokens }, null);
	if (fromStore) return fromStore;

	const legacyAccounts = await get(LEGACY_ACCOUNTS_KEY);
	const account = resolveAccountFromStores(id, host, null, legacyAccounts);
	if (!account) console.log('Accounts are not recorded');
	return account;
}
