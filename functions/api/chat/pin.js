import { jsonResponse, getJSON, putJSON, requireAdmin } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  try {
    const { error } = await requireAdmin(env, request);
    if (error) return error;

    const { messageId, action } = await request.json();

    if (action === 'unpin') {
      await putJSON(env, 'chat_pinned', null);
      return jsonResponse({ success: true, message: '已取消置顶' });
    }

    const messages = await getJSON(env, 'chat', []);
    const msg = messages.find(m => m.id === messageId);

    if (!msg) {
      return jsonResponse({ success: false, message: '消息不存在' }, 404);
    }

    await putJSON(env, 'chat_pinned', {
      id: msg.id,
      userId: msg.userId,
      username: msg.username,
      avatar: msg.avatar,
      content: msg.content,
      image: msg.image || '',
      createdAt: msg.createdAt,
      pinnedAt: new Date().toISOString()
    });

    return jsonResponse({ success: true, message: '置顶成功' });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}

export async function onRequestGet({ env }) {
  try {
    const pinned = await getJSON(env, 'chat_pinned', null);
    return jsonResponse({ success: true, pinned });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
