import { jsonResponse, getJSON, putJSON, generateId, requireAuth, isMuted } from '../_lib.js';

function pmKey(id1, id2) {
  const ids = [id1, id2].sort();
  return `pm:${ids[0]}:${ids[1]}`;
}

export async function onRequestGet({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;

    const conversationIds = await getJSON(env, `pm:conversations:${user.id}`, []);
    const conversations = [];

    for (const otherId of conversationIds) {
      const messages = await getJSON(env, pmKey(user.id, otherId), []);
      if (messages.length === 0) continue;

      const lastMessage = messages[messages.length - 1];
      const unreadCount = messages.filter(m => m.receiverId === user.id && !m.read).length;

      conversations.push({
        userId: otherId,
        lastMessage,
        unreadCount
      });
    }

    // 按最新消息时间倒序
    conversations.sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

    return jsonResponse({ success: true, conversations });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;

    if (isMuted(user)) {
      return jsonResponse({ success: false, message: '您已被禁言' }, 403);
    }

    const { receiverId, content, image } = await request.json();

    if (!receiverId || (!content && !image)) {
      return jsonResponse({ success: false, message: '缺少必要字段' }, 400);
    }

    if (receiverId === user.id) {
      return jsonResponse({ success: false, message: '不能给自己发私信' }, 400);
    }

    // 验证接收者存在
    const users = await getJSON(env, 'users', []);
    const receiver = users.find(u => u.id === receiverId);
    if (!receiver) {
      return jsonResponse({ success: false, message: '接收者不存在' }, 404);
    }

    const key = pmKey(user.id, receiverId);
    const messages = await getJSON(env, key, []);

    const message = {
      id: generateId(),
      senderId: user.id,
      receiverId,
      senderName: user.username,
      senderAvatar: user.avatar,
      content: content || '',
      image: image || '',
      read: false,
      createdAt: new Date().toISOString()
    };

    messages.push(message);
    await putJSON(env, key, messages);

    // 更新双方对话列表
    const myConvos = await getJSON(env, `pm:conversations:${user.id}`, []);
    if (!myConvos.includes(receiverId)) {
      myConvos.push(receiverId);
      await putJSON(env, `pm:conversations:${user.id}`, myConvos);
    }
    const theirConvos = await getJSON(env, `pm:conversations:${receiverId}`, []);
    if (!theirConvos.includes(user.id)) {
      theirConvos.push(user.id);
      await putJSON(env, `pm:conversations:${receiverId}`, theirConvos);
    }

    return jsonResponse({ success: true, message: '发送成功', data: message });
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误: ' + err.message }, 500);
  }
}
