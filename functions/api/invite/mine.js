import { jsonResponse, requireAuth, getJSON } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;

    const users = await getJSON(env, 'users', []);
    const invitedUsers = users
      .filter(u => u.invitedById === user.id)
      .map(u => ({
        id: u.id,
        username: u.username,
        avatar: u.avatar || '',
        role: u.role,
        status: u.status,
        createdAt: u.createdAt
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return jsonResponse({ success: true, users: invitedUsers, count: invitedUsers.length });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
