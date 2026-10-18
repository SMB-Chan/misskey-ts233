/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import type * as Misskey from 'misskey-js';
import { isNotificationForNote } from '@/utility/notification-note.js';
import { Paginator } from '@/utility/paginator.js';

const DELETED_NOTE_ID = 'note-deleted';
const OTHER_NOTE_ID = 'note-other';

function notification(id: string, type: string, noteId?: string): Misskey.entities.Notification {
	if (noteId == null) {
		return {
			id,
			type,
			createdAt: '2026-05-24T00:00:00.000Z',
		} as Misskey.entities.Notification;
	}

	return {
		id,
		type,
		createdAt: '2026-05-24T00:00:00.000Z',
		note: { id: noteId },
	} as Misskey.entities.Notification;
}

describe('isNotificationForNote', () => {
	test('matches notifications whose packed note is the deleted note', () => {
		for (const type of ['reply', 'mention', 'quote', 'reaction', 'reaction:grouped', 'renote', 'renote:grouped', 'pollEnded', 'note', 'scheduledNotePosted']) {
			expect(isNotificationForNote(notification(`${type}-1`, type, DELETED_NOTE_ID), DELETED_NOTE_ID)).toBe(true);
		}
	});

	test('keeps notifications for a different note', () => {
		expect(isNotificationForNote(notification('mention-2', 'mention', OTHER_NOTE_ID), DELETED_NOTE_ID)).toBe(false);
	});

	test('keeps notifications that do not reference a note', () => {
		for (const type of ['follow', 'followRequestAccepted', 'login', 'achievementEarned', 'test']) {
			expect(isNotificationForNote(notification(`${type}-1`, type), DELETED_NOTE_ID)).toBe(false);
		}
	});
});

describe('Paginator.removeWhere', () => {
	test('drops notifications for a deleted note from the visible list and the ahead queue', () => {
		const paginator = new Paginator('i/notifications', {});
		const follow = notification('follow-1', 'follow');
		const mention = notification('mention-1', 'mention', DELETED_NOTE_ID);
		const otherReaction = notification('reaction-2', 'reaction', OTHER_NOTE_ID);
		const queuedReaction = notification('reaction-1', 'reaction', DELETED_NOTE_ID);
		const queuedFollow = notification('follow-2', 'follow');

		paginator.items.value = [mention, otherReaction, follow];
		paginator.enqueue(queuedReaction);
		paginator.enqueue(queuedFollow);

		paginator.removeWhere(item => isNotificationForNote(item, DELETED_NOTE_ID));

		expect(paginator.items.value.map(item => item.id)).toEqual([otherReaction.id, follow.id]);
		expect(paginator.queuedAheadItemsCount.value).toBe(1);

		paginator.releaseQueue();

		expect(paginator.items.value.map(item => item.id)).toEqual([queuedFollow.id, otherReaction.id, follow.id]);
		expect(paginator.queuedAheadItemsCount.value).toBe(0);
	});

	test('does not replace the list when nothing matches', () => {
		const paginator = new Paginator('i/notifications', { useShallowRef: true });
		const follow = notification('follow-1', 'follow');
		paginator.items.value = [follow];
		const before = paginator.items.value;

		paginator.removeWhere(item => isNotificationForNote(item, DELETED_NOTE_ID));

		expect(paginator.items.value).toBe(before);
		expect(paginator.queuedAheadItemsCount.value).toBe(0);
	});
});
