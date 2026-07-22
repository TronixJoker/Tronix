import { jsonResponse, requireAuth, getJSON, putJSON } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;

    const contentType = request.headers.get('content-type') || '';
    let avatarDataUrl = '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      avatarDataUrl = body.avatar || '';
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('avatar');
      if (file && file.arrayBuffer) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        const mimeType = file.type || 'image/png';
        avatarDataUrl = `data:${mimeType};base64,${base64}`;
      }
    }

    if (!avatarDataUrl) {
      return jsonResponse({ success: false, message: '请提供头像图片' }, 400);
    }

    if (avatarDataUrl.length > 500 * 1024) {
      return jsonResponse({ success: false, message: '头像图片过大，请压缩后再上传（最大500KB）' }, 400);
    }

    const users = await getJSON(env, 'users', []);
    const idx = users.findIndex(u => u.id === user.id || u._id === user.id);
    if (idx === -1) {
      return jsonResponse({ success: false, message: '用户不存在' }, 404);
    }

    users[idx].avatar = avatarDataUrl;
    await putJSON(env, 'users', users);

    const { password: _, ...userWithoutPassword } = users[idx];
    return jsonResponse({ success: true, message: '头像更新成功', user: userWithoutPassword });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
