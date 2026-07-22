import { jsonResponse, getJSON, putJSON, generateId, generateInviteCode, hashPassword } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  try {
    const { username, password, inviteCode } = await request.json();

    if (!username || !password || !inviteCode) {
      return jsonResponse({ success: false, message: '请填写所有字段' }, 400);
    }

    const users = await getJSON(env, 'users', []);

    // 检查用户名重复
    if (users.find(u => u.username === username)) {
      return jsonResponse({ success: false, message: '用户名已存在' }, 400);
    }

    // 验证邀请码
    const inviter = users.find(u => u.inviteCode === inviteCode);
    if (!inviter) {
      return jsonResponse({ success: false, message: '邀请码无效' }, 400);
    }

    // 邀请码用一次后自动刷新
    inviter.inviteCode = generateInviteCode();

    // 创建新用户
    const hashedPassword = await hashPassword(password);
    const newUser = {
      id: generateId(),
      username,
      password: hashedPassword,
      inviteCode: generateInviteCode(),
      invitedById: inviter.id,
      role: 'user',
      status: 'active',
      muteUntil: null,
      avatar: '',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await putJSON(env, 'users', users);

    return jsonResponse({ success: true, message: '注册成功' });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
