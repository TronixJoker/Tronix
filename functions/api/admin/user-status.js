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
      case 'delete':
        if (targetUser.id === admin.id) {
          return jsonResponse({ success: false, message: '不能删除自己' }, 400);
        }
        const idx = users.findIndex(u => u.id === userId);
        if (idx !== -1) users.splice(idx, 1);
        const sessions = await getJSON(env, 'sessions', {});
        for (const [token, uid] of Object.entries(sessions)) {
          if (uid === userId) delete sessions[token];
        }
        await putJSON(env, 'sessions', sessions);
        const posts = await getJSON(env, 'posts', []);
        const remainingPosts = posts.filter(p => p.userId !== userId);
        await putJSON(env, 'posts', remainingPosts);
        const allKeys = await env.TRONIX_DB.list({ prefix: 'comments:' });
        for (const keyObj of allKeys.keys) {
          const comments = await getJSON(env, keyObj.name, []);
          const filtered = comments.filter(c => c.userId !== userId);
          if (filtered.length !== comments.length) {
            await putJSON(env, keyObj.name, filtered);
          }
        }
        const chat = await getJSON(env, 'chat', []);
        const filteredChat = chat.filter(m => m.userId !== userId);
        await putJSON(env, 'chat', filteredChat);
        await putJSON(env, 'users', users);
        return jsonResponse({ success: true, message: '用户已删除' });
      default:
        return jsonResponse({ success: false, message: '无效的操作' }, 400);
    }

    await putJSON(env, 'users', users);

    return jsonResponse({ success: true, message: '操作成功' });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
