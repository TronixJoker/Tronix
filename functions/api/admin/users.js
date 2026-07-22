import { jsonResponse, getJSON, requireAdmin } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  try {
    const { error, user } = await requireAdmin(env, request);
    if (error) return error;

    const users = await getJSON(env, 'users', []);
    const safeUsers = users.map(u => {
      const { password, ...rest } = u;
      const inviter = users.find(x => x.id === u.invitedById);
      return { ...rest, invitedByName: inviter ? inviter.username : null };
    });

    return jsonResponse({ success: true, users: safeUsers });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
