/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { NoteUpdatedEvent } from 'misskey-js/streaming.types.js';

export type NoteDeletionStream = {
	send(type: string, payload: { id: string }): void;
	on(event: 'noteUpdated', handler: (data: NoteUpdatedEvent) => void): void;
	off(event: 'noteUpdated', handler: (data: NoteUpdatedEvent) => void): void;
	on(event: '_connected_', handler: () => void): void;
	off(event: '_connected_', handler: () => void): void;
};

/**
 * ノートストリームの deleted を noteDeleted として届ける。
 * 表示コンポーネントのマウントに依存しない。再接続後も購読を張り直す。
 */
export function subscribeNoteDeleted(connection: NoteDeletionStream, noteId: string, onDeleted: (noteId: string) => void): () => void {
	const onUpdated = (data: NoteUpdatedEvent): void => {
		if (data.id === noteId && data.type === 'deleted') onDeleted(noteId);
	};
	const onConnected = (): void => {
		connection.send('sr', { id: noteId });
	};

	connection.on('noteUpdated', onUpdated);
	connection.on('_connected_', onConnected);
	connection.send('sr', { id: noteId });

	return () => {
		connection.send('un', { id: noteId });
		connection.off('noteUpdated', onUpdated);
		connection.off('_connected_', onConnected);
	};
}
