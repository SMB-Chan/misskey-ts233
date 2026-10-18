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

/**
 * 通知カラムが削除を見逃さないために購読するノート。
 * 通知本体に加え、返信元・引用元も対象にする。本体が消えたときだけ通知を外し、
 * 返信元が消えたときは埋め込み表示を「削除されたノート」に切り替える。
 */
export function noteIdsForNotificationCapture(notifications: readonly Misskey.entities.Notification[]): string[] {
	const ids: string[] = [];
	const seen = new Set<string>();
	for (const notification of notifications) {
		if (!('note' in notification)) continue;
		for (const id of [notification.note.id, notification.note.reply?.id, notification.note.renote?.id]) {
			if (id != null && !seen.has(id)) {
				seen.add(id);
				ids.push(id);
			}
		}
	}
	return ids;
}
