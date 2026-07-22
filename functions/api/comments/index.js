import { jsonResponse, getJSON, putJSON, generateId, requireAuth, isMuted } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get('postId');

    if (!postId) {
      return jsonResponse({ success: false, message: '缺少postId参数' }, 400);
    }

    const comments = await getJSON(env, `comments:${postId}`, []);
    return jsonResponse({ success: true, comments });
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

    const { postId, content, image } = await request.json();

    if (!postId || !content) {
      return jsonResponse({ success: false, message: '缺少必要字段' }, 400);
    }

    const comments = await getJSON(env, `comments:${postId}`, []);
    const comment = {
      id: generateId(),
      postId,
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      content,
      image: image || '',
      createdAt: new Date().toISOString()
    };

    comments.push(comment);
    await putJSON(env, `comments:${postId}`, comments);

    return jsonResponse({ success: true, message: '评论成功', comment });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
