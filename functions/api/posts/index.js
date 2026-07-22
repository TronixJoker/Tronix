import { jsonResponse, getJSON, putJSON, generateId, requireAuth, isMuted } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  try {
    const posts = await getJSON(env, 'posts', []);
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return jsonResponse({ success: true, posts });
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

    const { title, content, category, image } = await request.json();

    if (!title || !content) {
      return jsonResponse({ success: false, message: '标题和内容不能为空' }, 400);
    }

    const posts = await getJSON(env, 'posts', []);
    const post = {
      id: generateId(),
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      title,
      content,
      category: category || 'general',
      image: image || '',
      createdAt: new Date().toISOString()
    };

    posts.push(post);
    await putJSON(env, 'posts', posts);

    return jsonResponse({ success: true, message: '发布成功', post });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
