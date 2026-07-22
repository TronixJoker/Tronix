import { jsonResponse, getJSON, putJSON, requireAuth } from '../_lib.js';

function pmKey(id1, id2) {
  const ids = [id1, id2].sort();
  return `pm:${ids[0]}:${ids[1]}`;
}

export async function onRequestGet({ request, env, params }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;

    const otherId = params.userId;
    const key = pmKey(user.id, otherId);
    const messages = await getJSON(env, key, []);

    // 标记接收的消息为已读
    let updated = false;
    for (const m of messages) {
      if (m.receiverId === user.id && !m.read) {
        m.read = true;
        updated = true;
      }
    }
    if (updated) {
      await putJSON(env, key, messages);
    }

    return jsonResponse({ success: true, messages });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
