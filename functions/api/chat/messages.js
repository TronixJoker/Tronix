import { jsonResponse, getJSON, putJSON, generateId, requireAuth, isMuted, getUserFromRequest } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  try {
    const messages = await getJSON(env, 'chat', []);
    const pinned = await getJSON(env, 'chat_pinned', null);
    return jsonResponse({ success: true, messages, pinned });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;

    if (isMuted(user)) {
      return jsonResponse({ success: false, message: '您已被禁言' }, 403);
    }

    const { content, image } = await request.json();

    if (!content && !image) {
      return jsonResponse({ success: false, message: '内容不能为空' }, 400);
    }

    const messages = await getJSON(env, 'chat', []);
    const message = {
      id: generateId(),
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      content: content || '',
      image: image || '',
      createdAt: new Date().toISOString()
    };

    messages.push(message);
    if (messages.length > 200) {
      messages.splice(0, messages.length - 200);
    }
    await putJSON(env, 'chat', messages);

    return jsonResponse({ success: true, message: '发送成功', data: message });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const user = await getUserFromRequest(env, request);
    if (!user) return jsonResponse({ success: false, message: '请先登录' }, 401);

    const url = new URL(request.url);
    const msgId = url.pathname.split('/').pop();

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
