import { jsonResponse, getJSON, putJSON, requireAuth } from '../_lib.js';

export async function onRequestDelete({ request, env, params }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;

    const { id } = params;
    const posts = await getJSON(env, 'posts', []);

    let found = false;
    for (const post of posts) {
      const comments = await getJSON(env, `comments:${post.id}`, []);
      const comment = comments.find(c => c.id === id);
      if (comment) {
        if (comment.userId !== user.id && user.role !== 'admin') {
          return jsonResponse({ success: false, message: '无权限删除' }, 403);
        }
        const newComments = comments.filter(c => c.id !== id);
        await putJSON(env, `comments:${post.id}`, newComments);
        found = true;
        break;
      }
    }

    if (!found) {
      return jsonResponse({ success: false, message: '评论不存在' }, 404);
    }

    return jsonResponse({ success: true, message: '删除成功' });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
