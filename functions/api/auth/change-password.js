import { jsonResponse, requireAuth, getJSON, putJSON, hashPassword } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;

    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return jsonResponse({ success: false, message: '请填写旧密码和新密码' }, 400);
    }

    if (newPassword.length < 6) {
      return jsonResponse({ success: false, message: '新密码至少6位' }, 400);
    }

    const users = await getJSON(env, 'users', []);
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex === -1) {
      return jsonResponse({ success: false, message: '用户不存在' }, 404);
    }

    const hashedOldPassword = await hashPassword(oldPassword);
    if (users[userIndex].password !== hashedOldPassword) {
      return jsonResponse({ success: false, message: '旧密码错误' }, 400);
    }

    users[userIndex].password = await hashPassword(newPassword);
    await putJSON(env, 'users', users);

    return jsonResponse({ success: true, message: '密码修改成功' });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
