import { jsonResponse, getUserFromRequest, getJSON, putJSON } from '../../_lib.js';

export async function onRequestPost({ request, env, params }) {
    const user = await getUserFromRequest(env, request);
    if (!user) return jsonResponse({ success: false, message: '请先登录' }, 401);

    const postId = params.id;
    const posts = await getJSON(env, 'posts', []);
    const post = posts.find(p => (p.id || p._id) === postId || (p._id || p.id) === postId);

    if (!post) return jsonResponse({ success: false, message: '帖子不存在' }, 404);

    if (!post.likedBy) post.likedBy = [];
    const idx = post.likedBy.indexOf(user.username);
    let isLiked;

    if (idx > -1) {
        post.likedBy.splice(idx, 1);
        isLiked = false;
    } else {
        post.likedBy.push(user.username);
        isLiked = true;
    }
    post.likes = post.likedBy.length;

    await putJSON(env, 'posts', posts);
    return jsonResponse({ success: true, likes: post.likes, isLiked });
}
