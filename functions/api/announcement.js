import { jsonResponse, getJSON, putJSON, requireAdmin, getUserFromRequest } from './_lib.js';

export async function onRequestGet({ env }) {
  try {
    const announcement = await getJSON(env, 'announcement', null);
    return jsonResponse({ success: true, announcement });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { error } = await requireAdmin(env, request);
    if (error) return error;

    const { content, title } = await request.json();

    if (!content) {
      return jsonResponse({ success: false, message: '公告内容不能为空' }, 400);
    }

    const announcement = {
      title: title || '论坛公告',
      content,
      updatedAt: new Date().toISOString()
    };

    await putJSON(env, 'announcement', announcement);

    return jsonResponse({ success: true, message: '公告已更新', announcement });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const { error } = await requireAdmin(env, request);
    if (error) return error;

    await putJSON(env, 'announcement', null);

    return jsonResponse({ success: true, message: '公告已删除' });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
