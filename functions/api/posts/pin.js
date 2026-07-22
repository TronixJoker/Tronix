import { jsonResponse, getJSON, putJSON, requireAdmin } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  try {
    const { error } = await requireAdmin(env, request);
    if (error) return error;

    const { postId, action } = await request.json();

    if (!postId) {
      return jsonResponse({ success: false, message: '缺少帖子ID' }, 400);
    }

    const posts = await getJSON(env, 'posts', []);
    const post = posts.find(p => p.id === postId);

    if (!post) {
      return jsonResponse({ success: false, message: '帖子不存在' }, 404);
    }

    if (action === 'unpin') {
      delete post.isPinned;
      delete post.pinnedAt;
    } else {
      post.isPinned = true;
      post.pinnedAt = new Date().toISOString();
    }

    await putJSON(env, 'posts', posts);

    return jsonResponse({ success: true, message: action === 'unpin' ? '已取消置顶' : '置顶成功' });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
