import { jsonResponse, getJSON, putJSON, requireAdmin } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  try {
    const { error, user: admin } = await requireAdmin(env, request);
    if (error) return error;

    const { userId, action, duration } = await request.json();

    if (!userId || !action) {
      return jsonResponse({ success: false, message: '缺少必要字段' }, 400);
    }

    const users = await getJSON(env, 'users', []);
    const targetUser = users.find(u => u.id === userId);

    if (!targetUser) {
      return jsonResponse({ success: false, message: '用户不存在' }, 404);
    }

    switch (action) {
      case 'ban':
        targetUser.status = 'banned';
        targetUser.muteUntil = null;
        break;
      case 'unban':
        targetUser.status = 'active';
        targetUser.muteUntil = null;
        break;
      case 'mute':
        targetUser.status = 'muted';
        if (duration && duration > 0) {
          const until = new Date();
          until.setDate(until.getDate() + duration);
          targetUser.muteUntil = until.toISOString();
        } else {
          targetUser.muteUntil = null; // 永久禁言
        }
        break;
      case 'unmute':
        targetUser.status = 'active';
        targetUser.muteUntil = null;
        break;
      default:
        return jsonResponse({ success: false, message: '无效的操作' }, 400);
    }

    await putJSON(env, 'users', users);

    return jsonResponse({ success: true, message: '操作成功' });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
