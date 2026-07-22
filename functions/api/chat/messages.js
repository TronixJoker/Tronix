import { jsonResponse, getJSON, putJSON, generateId, requireAuth, isMuted } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  try {
    const messages = await getJSON(env, 'chat', []);
    return jsonResponse({ success: true, messages });
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
    // 保留最近200条
    if (messages.length > 200) {
      messages.splice(0, messages.length - 200);
    }
    await putJSON(env, 'chat', messages);

    return jsonResponse({ success: true, message: '发送成功', data: message });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
