import { jsonResponse, getJSON, putJSON, getUserFromRequest } from '../../_lib.js';

export async function onRequestDelete({ request, env, params }) {
  try {
    const user = await getUserFromRequest(env, request);
    if (!user) return jsonResponse({ success: false, message: '请先登录' }, 401);

    const { id: msgId } = params;

    if (!msgId) {
      return jsonResponse({ success: false, message: '缺少消息ID' }, 400);
    }

    const messages = await getJSON(env, 'chat', []);
    const idx = messages.findIndex(m => m.id === msgId);

    if (idx === -1) {
      return jsonResponse({ success: false, message: '消息不存在' }, 404);
    }

    const msg = messages[idx];
    const isAdmin = user.role === 'admin';
    const isOwn = msg.userId === user.id;

    if (!isAdmin && !isOwn) {
      return jsonResponse({ success: false, message: '无权限删除' }, 403);
    }

    if (isOwn && !isAdmin) {
      const createdAt = new Date(msg.createdAt).getTime();
      const now = Date.now();
      if (now - createdAt > 2 * 60 * 1000) {
        return jsonResponse({ success: false, message: '超过2分钟无法撤回' }, 403);
      }
    }

    messages.splice(idx, 1);
    await putJSON(env, 'chat', messages);

    const pinned = await getJSON(env, 'chat_pinned', null);
    if (pinned && pinned.id === msgId) {
      await putJSON(env, 'chat_pinned', null);
    }

    return jsonResponse({ success: true, message: '删除成功' });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
