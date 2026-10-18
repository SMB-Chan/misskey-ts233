/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type * as Misskey from 'misskey-js';

/**
 * 通知が参照しているノート ID。
 * 再取得時にサーバーが落とすのと同じく、パック済み `note.id`（通知の noteId）だけを見る。
 * リノート先など、本文に含まれる別ノートの削除では通知自体は残る。
 */
export function isNotificationForNote(notification: Misskey.entities.Notification, noteId: Misskey.entities.Note['id']): boolean {
	return 'note' in notification && notification.note.id === noteId;
}
