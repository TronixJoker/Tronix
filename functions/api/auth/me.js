import { jsonResponse, requireAuth } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;

    const { password: _, ...userWithoutPassword } = user;
    return jsonResponse({ success: true, user: userWithoutPassword });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
