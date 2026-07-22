import { jsonResponse, requireAuth } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;

    return jsonResponse({ success: true, inviteCode: user.inviteCode });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
