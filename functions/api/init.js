// 初始化管理员账号 - 首次部署后访问 /api/init 触发
import { jsonResponse, getJSON, putJSON, generateId, generateInviteCode, hashPassword } from './_lib.js';

export async function onRequestGet({ env }) {
  try {
    const users = await getJSON(env, 'users', []);

    // 如果已有管理员，不重复创建
    if (users.find(u => u.role === 'admin')) {
      return jsonResponse({ success: false, message: '管理员已存在，如需重置密码请联系开发者' });
    }

    const adminPassword = await hashPassword('Wz@2580.');
    const adminUser = {
      id: generateId(),
      username: 'Joker',
      password: adminPassword,
      inviteCode: generateInviteCode(),
      invitedById: null,
      role: 'admin',
      status: 'active',
      muteUntil: null,
      avatar: 'https://ui-avatars.com/api/?name=Joker&background=fc00ef&color=fff',
      createdAt: new Date().toISOString()
    };

    users.push(adminUser);
    await putJSON(env, 'users', users);

    return jsonResponse({ success: true, message: '管理员账号初始化成功！用户名: Joker' });
  } catch (err) {
    return jsonResponse({ success: false, message: '初始化失败: ' + err.message }, 500);
  }
}
