/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import { beforeAll, describe, test, vi } from 'vitest';
import { api, role, signup } from '../utils.js';
import type * as misskey from 'misskey-js';

describe('通知', () => {
	let root: misskey.entities.SignupResponse;
	let alice: misskey.entities.SignupResponse;
	let bob: misskey.entities.SignupResponse;

	beforeAll(async () => {
		root = await signup({ username: 'root' });
		alice = await signup({ username: 'alice' });
		bob = await signup({ username: 'bob' });
	}, 1000 * 60 * 2);

	test('削除されたロールの付与通知が残っていても通知一覧を取得できる', async () => {
		const follow = await api('following/create', { userId: alice.id }, bob);
		assert.strictEqual(follow.status, 200);

		const keptRole = await role(root, { name: 'kept role', isPublic: true });
		const deletedRole = await role(root, { name: 'deleted role', isPublic: true });
		assert.ok(keptRole.id);
		assert.ok(deletedRole.id);

		for (const roleId of [keptRole.id, deletedRole.id]) {
			const assign = await api('admin/roles/assign', {
				userId: alice.id,
				roleId,
			}, root);
			assert.strictEqual(assign.status, 204);
		}

		const listParams: misskey.Endpoints['i/notifications']['req'] = {
			markAsRead: false,
			includeTypes: ['follow', 'roleAssigned'],
		};

		await vi.waitFor(async () => {
			const res = await api('i/notifications', listParams, alice);
			assert.strictEqual(res.status, 200);
			assert.ok(res.body.some(notification => notification.type === 'follow' && notification.userId === bob.id));
			assert.ok(res.body.some(notification => notification.type === 'roleAssigned' && notification.role.id === keptRole.id));
			assert.ok(res.body.some(notification => notification.type === 'roleAssigned' && notification.role.id === deletedRole.id));
		}, { timeout: 5000, interval: 50 });

		const deleted = await api('admin/roles/delete', { roleId: deletedRole.id }, root);
		assert.strictEqual(deleted.status, 204);

		const notifications = await api('i/notifications', listParams, alice);
		const grouped = await api('i/notifications-grouped', listParams, alice);
		for (const res of [notifications, grouped]) {
			assert.strictEqual(res.status, 200);
			assert.ok(Array.isArray(res.body));
			assert.strictEqual(res.body.some(notification => notification.type === 'roleAssigned' && notification.role.id === deletedRole.id), false);
			assert.strictEqual(res.body.some(notification => notification.type === 'roleAssigned' && notification.role.id === keptRole.id), true);
			assert.strictEqual(res.body.some(notification => notification.type === 'follow' && notification.userId === bob.id), true);
		}
	});
});
