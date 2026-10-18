/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { LEGACY_ACCOUNTS_KEY, listAccountsFromStores, PIZZAX_BASE_STATE_KEY, resolveAccountFromStores } from '@@/js/account-token.js';

const host = 'misskey.example';
const userId = 'user-1';
const token = 'token-1';

function deviceState(accountTokens: Record<string, string>): { accountTokens: Record<string, string> } {
	return { accountTokens };
}

describe('account token resolution', () => {
	test('storage keys match the Pizzax device record and the legacy list', () => {
		expect(PIZZAX_BASE_STATE_KEY).toBe('pizzax::base');
		expect(LEGACY_ACCOUNTS_KEY).toBe('accounts');
	});

	test('reads accountTokens keyed by host/userId', () => {
		const account = resolveAccountFromStores(userId, host, deviceState({
			[`${host}/${userId}`]: token,
		}), null);
		expect(account).toEqual({ id: userId, token });
	});

	test('does not use a token stored for another host', () => {
		const account = resolveAccountFromStores(userId, host, deviceState({
			[`other.example/${userId}`]: 'other-token',
		}), null);
		expect(account).toBeUndefined();
	});

	test('includes the port in the host key', () => {
		const account = resolveAccountFromStores(userId, 'localhost:3000', deviceState({
			'localhost:3000/user-1': token,
		}), null);
		expect(account).toEqual({ id: userId, token });
	});

	test('matches an IPv6 host', () => {
		const ipv6Host = '[::1]:3000';
		const account = resolveAccountFromStores('abc', ipv6Host, deviceState({
			[`${ipv6Host}/abc`]: 't',
		}), null);
		expect(account).toEqual({ id: 'abc', token: 't' });
	});

	test('falls back to the legacy accounts list when Pizzax has no token', () => {
		const account = resolveAccountFromStores(userId, host, { tips: {} }, [
			{ id: userId, token },
		]);
		expect(account).toEqual({ id: userId, token });
	});

	test('prefers the Pizzax token over a legacy token', () => {
		const account = resolveAccountFromStores(userId, host, deviceState({
			[`${host}/${userId}`]: 'new-token',
		}), [
			{ id: userId, token: 'old-token' },
		]);
		expect(account).toEqual({ id: userId, token: 'new-token' });
	});

	test('ignores empty tokens and malformed records', () => {
		expect(resolveAccountFromStores(userId, host, null, null)).toBeUndefined();
		expect(resolveAccountFromStores(userId, host, { accountTokens: { [`${host}/${userId}`]: '' } }, { id: userId })).toBeUndefined();
		expect(resolveAccountFromStores(userId, host, { accountTokens: 'nope' }, 'nope')).toBeUndefined();
	});

	test('lists this host and legacy accounts that are not already present', () => {
		const accounts = listAccountsFromStores(host, deviceState({
			[`${host}/${userId}`]: token,
			[`other.example/${userId}`]: 'other-token',
			[`${host}/user-2`]: 'token-2',
		}), [
			{ id: userId, token: 'stale' },
			{ id: 'legacy-user', token: 'legacy-token' },
			{ id: 'legacy-user', token: 'duplicate' },
			{ nope: true },
		]);
		expect(accounts).toEqual([
			{ id: userId, token },
			{ id: 'user-2', token: 'token-2' },
			{ id: 'legacy-user', token: 'legacy-token' },
		]);
	});
});
