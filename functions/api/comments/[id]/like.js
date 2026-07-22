import { jsonResponse, getUserFromRequest, getJSON, putJSON } from '../../_lib.js';

export async function onRequestPost({ request, env, params }) {
    const user = await getUserFromRequest(env, request);
    if (!user) return jsonResponse({ success: false, message: '请先登录' }, 401);

    const commentId = params.id;
    const { postId } = await request.json().catch(() => ({}));
    if (!postId) return jsonResponse({ success: false, message: '缺少postId' }, 400);

    const comments = await getJSON(env, `comments:${postId}`, []);
    const comment = comments.find(c => (c.id || c._id) === commentId || (c._id || c.id) === commentId);

    if (!comment) return jsonResponse({ success: false, message: '评论不存在' }, 404);

    if (!comment.likedBy) comment.likedBy = [];
    const idx = comment.likedBy.indexOf(user.username);
    let isLiked;

    if (idx > -1) {
        comment.likedBy.splice(idx, 1);
        isLiked = false;
    } else {
        comment.likedBy.push(user.username);
        isLiked = true;
    }
    comment.likes = comment.likedBy.length;

    await putJSON(env, `comments:${postId}`, comments);
    return jsonResponse({ success: true, likes: comment.likes, isLiked });
}
