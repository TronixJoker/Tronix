import { jsonResponse, getJSON, putJSON, generateToken, hashPassword } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  try {
    const { username, password, remember } = await request.json();

    if (!username || !password) {
      return jsonResponse({ success: false, message: '请填写用户名和密码' }, 400);
    }

    const users = await getJSON(env, 'users', []);
    const user = users.find(u => u.username === username);

    if (!user) {
      return jsonResponse({ success: false, message: '用户名或密码错误' }, 400);
    }

    const hashedPassword = await hashPassword(password);
    if (user.password !== hashedPassword) {
      return jsonResponse({ success: false, message: '用户名或密码错误' }, 400);
    }

    if (user.status === 'banned') {
      return jsonResponse({ success: false, message: '账号已被封禁' }, 403);
    }

    const token = generateToken();
    const sessions = await getJSON(env, 'sessions', {});
    sessions[token] = user.id;
    await putJSON(env, 'sessions', sessions);

    const { password: _, ...userWithoutPassword } = user;

    return jsonResponse({
      success: true,
      message: '登录成功',
      user: userWithoutPassword,
      token
    });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
