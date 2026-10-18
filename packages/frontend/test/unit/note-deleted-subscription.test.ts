/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import type { NoteUpdatedEvent } from 'misskey-js/streaming.types.js';
import { subscribeNoteDeleted, type NoteDeletionStream } from '@/utility/note-deleted-subscription.js';

function fakeStream(): NoteDeletionStream & {
	sent: { type: string; payload: { id: string } }[];
	emitUpdated: (data: NoteUpdatedEvent) => void;
	emitConnected: () => void;
} {
	const noteUpdated = new Set<(data: NoteUpdatedEvent) => void>();
	const connected = new Set<() => void>();
	const sent: { type: string; payload: { id: string } }[] = [];

	return {
		sent,
		send(type, payload) {
			sent.push({ type, payload });
		},
		on(event, handler) {
			if (event === 'noteUpdated') noteUpdated.add(handler as (data: NoteUpdatedEvent) => void);
			else connected.add(handler as () => void);
		},
		off(event, handler) {
			if (event === 'noteUpdated') noteUpdated.delete(handler as (data: NoteUpdatedEvent) => void);
			else connected.delete(handler as () => void);
		},
		emitUpdated(data) {
			for (const handler of noteUpdated) handler(data);
		},
		emitConnected() {
			for (const handler of connected) handler();
		},
	};
}

describe('subscribeNoteDeleted', () => {
	test('emits only when the subscribed note is deleted, and resubscribes after reconnect', () => {
		const connection = fakeStream();
		const deleted: string[] = [];
		const dispose = subscribeNoteDeleted(connection, 'note-1', (noteId) => {
			deleted.push(noteId);
		});

		expect(connection.sent).toEqual([{ type: 'sr', payload: { id: 'note-1' } }]);

		connection.emitUpdated({ id: 'note-1', type: 'reacted', body: {} } as NoteUpdatedEvent);
		connection.emitUpdated({ id: 'note-2', type: 'deleted', body: {} } as NoteUpdatedEvent);
		connection.emitUpdated({ id: 'note-1', type: 'deleted', body: {} } as NoteUpdatedEvent);
		expect(deleted).toEqual(['note-1']);

		connection.emitConnected();
		expect(connection.sent.map(message => message.type)).toEqual(['sr', 'sr']);

		dispose();
		expect(connection.sent.at(-1)).toEqual({ type: 'un', payload: { id: 'note-1' } });

		connection.emitUpdated({ id: 'note-1', type: 'deleted', body: {} } as NoteUpdatedEvent);
		expect(deleted).toEqual(['note-1']);
	});
});
