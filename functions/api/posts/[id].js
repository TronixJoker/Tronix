import { jsonResponse, getJSON, putJSON, requireAuth } from '../_lib.js';

export async function onRequestDelete({ request, env, params }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;

    const { id } = params;
    const posts = await getJSON(env, 'posts', []);
    const post = posts.find(p => p.id === id);

    if (!post) {
      return jsonResponse({ success: false, message: '帖子不存在' }, 404);
    }

    if (post.userId !== user.id && user.role !== 'admin') {
      return jsonResponse({ success: false, message: '无权限删除' }, 403);
    }

    const newPosts = posts.filter(p => p.id !== id);
    await putJSON(env, 'posts', newPosts);

    // 同时删除该帖子的所有评论
    await env.TRONIX_DB.delete(`comments:${id}`);

    return jsonResponse({ success: true, message: '删除成功' });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
