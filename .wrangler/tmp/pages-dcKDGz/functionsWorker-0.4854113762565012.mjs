var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/_lib.js
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonResponse, "jsonResponse");
async function getJSON(env, key, defaultValue = null) {
  const val = await env.TRONIX_DB.get(key);
  if (!val) return defaultValue;
  try {
    return JSON.parse(val);
  } catch {
    return defaultValue;
  }
}
__name(getJSON, "getJSON");
async function putJSON(env, key, value) {
  await env.TRONIX_DB.put(key, JSON.stringify(value));
}
__name(putJSON, "putJSON");
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
__name(generateId, "generateId");
function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
__name(generateInviteCode, "generateInviteCode");
function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateToken, "generateToken");
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "tronix_salt_2024");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
async function getUserFromRequest(env, request) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const sessions = await getJSON(env, "sessions", {});
  const userId = sessions[token];
  if (!userId) return null;
  const users = await getJSON(env, "users", []);
  return users.find((u) => u.id === userId) || null;
}
__name(getUserFromRequest, "getUserFromRequest");
async function requireAuth(env, request) {
  const user = await getUserFromRequest(env, request);
  if (!user) return { error: jsonResponse({ success: false, message: "\u8BF7\u5148\u767B\u5F55" }, 401), user: null };
  if (user.status === "banned") return { error: jsonResponse({ success: false, message: "\u8D26\u53F7\u5DF2\u88AB\u5C01\u7981" }, 403), user: null };
  return { error: null, user };
}
__name(requireAuth, "requireAuth");
async function requireAdmin(env, request) {
  const result = await requireAuth(env, request);
  if (result.error) return result;
  if (result.user.role !== "admin") {
    return { error: jsonResponse({ success: false, message: "\u65E0\u6743\u9650" }, 403), user: null };
  }
  return result;
}
__name(requireAdmin, "requireAdmin");
function isMuted(user) {
  if (user.status !== "muted") return false;
  if (user.muteUntil && new Date(user.muteUntil) < /* @__PURE__ */ new Date()) return false;
  return true;
}
__name(isMuted, "isMuted");

// api/chat/messages/[id].js
async function onRequestDelete({ request, env, params }) {
  try {
    const user = await getUserFromRequest(env, request);
    if (!user) return jsonResponse({ success: false, message: "\u8BF7\u5148\u767B\u5F55" }, 401);
    const { id: msgId } = params;
    if (!msgId) {
      return jsonResponse({ success: false, message: "\u7F3A\u5C11\u6D88\u606FID" }, 400);
    }
    const messages = await getJSON(env, "chat", []);
    const idx = messages.findIndex((m) => m.id === msgId);
    if (idx === -1) {
      return jsonResponse({ success: false, message: "\u6D88\u606F\u4E0D\u5B58\u5728" }, 404);
    }
    const msg = messages[idx];
    const isAdmin = user.role === "admin";
    const isOwn = msg.userId === user.id;
    if (!isAdmin && !isOwn) {
      return jsonResponse({ success: false, message: "\u65E0\u6743\u9650\u5220\u9664" }, 403);
    }
    if (isOwn && !isAdmin) {
      const createdAt = new Date(msg.createdAt).getTime();
      const now = Date.now();
      if (now - createdAt > 2 * 60 * 1e3) {
        return jsonResponse({ success: false, message: "\u8D85\u8FC72\u5206\u949F\u65E0\u6CD5\u64A4\u56DE" }, 403);
      }
    }
    messages.splice(idx, 1);
    await putJSON(env, "chat", messages);
    const pinned = await getJSON(env, "chat_pinned", null);
    if (pinned && pinned.id === msgId) {
      await putJSON(env, "chat_pinned", null);
    }
    return jsonResponse({ success: true, message: "\u5220\u9664\u6210\u529F" });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestDelete, "onRequestDelete");

// api/admin/user-status.js
async function onRequestPost({ request, env }) {
  try {
    const { error, user: admin } = await requireAdmin(env, request);
    if (error) return error;
    const { userId, action, duration } = await request.json();
    if (!userId || !action) {
      return jsonResponse({ success: false, message: "\u7F3A\u5C11\u5FC5\u8981\u5B57\u6BB5" }, 400);
    }
    const users = await getJSON(env, "users", []);
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      return jsonResponse({ success: false, message: "\u7528\u6237\u4E0D\u5B58\u5728" }, 404);
    }
    switch (action) {
      case "ban":
        targetUser.status = "banned";
        targetUser.muteUntil = null;
        break;
      case "unban":
        targetUser.status = "active";
        targetUser.muteUntil = null;
        break;
      case "mute":
        targetUser.status = "muted";
        if (duration && duration > 0) {
          const until = /* @__PURE__ */ new Date();
          until.setDate(until.getDate() + duration);
          targetUser.muteUntil = until.toISOString();
        } else {
          targetUser.muteUntil = null;
        }
        break;
      case "unmute":
        targetUser.status = "active";
        targetUser.muteUntil = null;
        break;
      case "delete":
        if (targetUser.id === admin.id) {
          return jsonResponse({ success: false, message: "\u4E0D\u80FD\u5220\u9664\u81EA\u5DF1" }, 400);
        }
        const idx = users.findIndex((u) => u.id === userId);
        if (idx !== -1) users.splice(idx, 1);
        const sessions = await getJSON(env, "sessions", {});
        for (const [token, uid] of Object.entries(sessions)) {
          if (uid === userId) delete sessions[token];
        }
        await putJSON(env, "sessions", sessions);
        const posts = await getJSON(env, "posts", []);
        const remainingPosts = posts.filter((p) => p.userId !== userId);
        await putJSON(env, "posts", remainingPosts);
        const allKeys = await env.TRONIX_DB.list({ prefix: "comments:" });
        for (const keyObj of allKeys.keys) {
          const comments = await getJSON(env, keyObj.name, []);
          const filtered = comments.filter((c) => c.userId !== userId);
          if (filtered.length !== comments.length) {
            await putJSON(env, keyObj.name, filtered);
          }
        }
        const chat = await getJSON(env, "chat", []);
        const filteredChat = chat.filter((m) => m.userId !== userId);
        await putJSON(env, "chat", filteredChat);
        await putJSON(env, "users", users);
        return jsonResponse({ success: true, message: "\u7528\u6237\u5DF2\u5220\u9664" });
      default:
        return jsonResponse({ success: false, message: "\u65E0\u6548\u7684\u64CD\u4F5C" }, 400);
    }
    await putJSON(env, "users", users);
    return jsonResponse({ success: true, message: "\u64CD\u4F5C\u6210\u529F" });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestPost, "onRequestPost");

// api/admin/users.js
async function onRequestGet({ request, env }) {
  try {
    const { error, user } = await requireAdmin(env, request);
    if (error) return error;
    const users = await getJSON(env, "users", []);
    const safeUsers = users.map((u) => {
      const { password, ...rest } = u;
      const inviter = users.find((x) => x.id === u.invitedById);
      return { ...rest, invitedByName: inviter ? inviter.username : null };
    });
    return jsonResponse({ success: true, users: safeUsers });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestGet, "onRequestGet");

// api/auth/change-password.js
async function onRequestPost2({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;
    const { oldPassword, newPassword } = await request.json();
    if (!oldPassword || !newPassword) {
      return jsonResponse({ success: false, message: "\u8BF7\u586B\u5199\u65E7\u5BC6\u7801\u548C\u65B0\u5BC6\u7801" }, 400);
    }
    if (newPassword.length < 6) {
      return jsonResponse({ success: false, message: "\u65B0\u5BC6\u7801\u81F3\u5C116\u4F4D" }, 400);
    }
    const users = await getJSON(env, "users", []);
    const userIndex = users.findIndex((u) => u.id === user.id);
    if (userIndex === -1) {
      return jsonResponse({ success: false, message: "\u7528\u6237\u4E0D\u5B58\u5728" }, 404);
    }
    const hashedOldPassword = await hashPassword(oldPassword);
    if (users[userIndex].password !== hashedOldPassword) {
      return jsonResponse({ success: false, message: "\u65E7\u5BC6\u7801\u9519\u8BEF" }, 400);
    }
    users[userIndex].password = await hashPassword(newPassword);
    await putJSON(env, "users", users);
    return jsonResponse({ success: true, message: "\u5BC6\u7801\u4FEE\u6539\u6210\u529F" });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestPost2, "onRequestPost");

// api/auth/login.js
async function onRequestPost3({ request, env }) {
  try {
    const { username, password, remember } = await request.json();
    if (!username || !password) {
      return jsonResponse({ success: false, message: "\u8BF7\u586B\u5199\u7528\u6237\u540D\u548C\u5BC6\u7801" }, 400);
    }
    const users = await getJSON(env, "users", []);
    const user = users.find((u) => u.username === username);
    if (!user) {
      return jsonResponse({ success: false, message: "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF" }, 400);
    }
    const hashedPassword = await hashPassword(password);
    if (user.password !== hashedPassword) {
      return jsonResponse({ success: false, message: "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF" }, 400);
    }
    if (user.status === "banned") {
      return jsonResponse({ success: false, message: "\u8D26\u53F7\u5DF2\u88AB\u5C01\u7981" }, 403);
    }
    const token = generateToken();
    const sessions = await getJSON(env, "sessions", {});
    sessions[token] = user.id;
    await putJSON(env, "sessions", sessions);
    const { password: _, ...userWithoutPassword } = user;
    return jsonResponse({
      success: true,
      message: "\u767B\u5F55\u6210\u529F",
      user: userWithoutPassword,
      token
    });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestPost3, "onRequestPost");

// api/auth/me.js
async function onRequestGet2({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;
    const { password: _, ...userWithoutPassword } = user;
    return jsonResponse({ success: true, user: userWithoutPassword });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestGet2, "onRequestGet");

// api/auth/register.js
async function onRequestPost4({ request, env }) {
  try {
    const { username, password, inviteCode } = await request.json();
    if (!username || !password || !inviteCode) {
      return jsonResponse({ success: false, message: "\u8BF7\u586B\u5199\u6240\u6709\u5B57\u6BB5" }, 400);
    }
    const users = await getJSON(env, "users", []);
    if (users.find((u) => u.username === username)) {
      return jsonResponse({ success: false, message: "\u7528\u6237\u540D\u5DF2\u5B58\u5728" }, 400);
    }
    const inviter = users.find((u) => u.inviteCode === inviteCode);
    if (!inviter) {
      return jsonResponse({ success: false, message: "\u9080\u8BF7\u7801\u65E0\u6548" }, 400);
    }
    inviter.inviteCode = generateInviteCode();
    const hashedPassword = await hashPassword(password);
    const newUser = {
      id: generateId(),
      username,
      password: hashedPassword,
      inviteCode: generateInviteCode(),
      invitedById: inviter.id,
      role: "user",
      status: "active",
      muteUntil: null,
      avatar: "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    users.push(newUser);
    await putJSON(env, "users", users);
    return jsonResponse({ success: true, message: "\u6CE8\u518C\u6210\u529F" });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestPost4, "onRequestPost");

// api/chat/messages.js
async function onRequestGet3({ request, env }) {
  try {
    const messages = await getJSON(env, "chat", []);
    const pinned = await getJSON(env, "chat_pinned", null);
    return jsonResponse({ success: true, messages, pinned });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestGet3, "onRequestGet");
async function onRequestPost5({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;
    if (isMuted(user)) {
      return jsonResponse({ success: false, message: "\u60A8\u5DF2\u88AB\u7981\u8A00" }, 403);
    }
    const { content, image } = await request.json();
    if (!content && !image) {
      return jsonResponse({ success: false, message: "\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A" }, 400);
    }
    const messages = await getJSON(env, "chat", []);
    const message = {
      id: generateId(),
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      content: content || "",
      image: image || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    messages.push(message);
    if (messages.length > 200) {
      messages.splice(0, messages.length - 200);
    }
    await putJSON(env, "chat", messages);
    return jsonResponse({ success: true, message: "\u53D1\u9001\u6210\u529F", data: message });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestPost5, "onRequestPost");
async function onRequestDelete2({ request, env }) {
  try {
    const user = await getUserFromRequest(env, request);
    if (!user) return jsonResponse({ success: false, message: "\u8BF7\u5148\u767B\u5F55" }, 401);
    const url = new URL(request.url);
    const msgId = url.pathname.split("/").pop();
    if (!msgId) {
      return jsonResponse({ success: false, message: "\u7F3A\u5C11\u6D88\u606FID" }, 400);
    }
    const messages = await getJSON(env, "chat", []);
    const idx = messages.findIndex((m) => m.id === msgId);
    if (idx === -1) {
      return jsonResponse({ success: false, message: "\u6D88\u606F\u4E0D\u5B58\u5728" }, 404);
    }
    const msg = messages[idx];
    const isAdmin = user.role === "admin";
    const isOwn = msg.userId === user.id;
    if (!isAdmin && !isOwn) {
      return jsonResponse({ success: false, message: "\u65E0\u6743\u9650\u5220\u9664" }, 403);
    }
    if (isOwn && !isAdmin) {
      const createdAt = new Date(msg.createdAt).getTime();
      const now = Date.now();
      if (now - createdAt > 2 * 60 * 1e3) {
        return jsonResponse({ success: false, message: "\u8D85\u8FC72\u5206\u949F\u65E0\u6CD5\u64A4\u56DE" }, 403);
      }
    }
    messages.splice(idx, 1);
    await putJSON(env, "chat", messages);
    const pinned = await getJSON(env, "chat_pinned", null);
    if (pinned && pinned.id === msgId) {
      await putJSON(env, "chat_pinned", null);
    }
    return jsonResponse({ success: true, message: "\u5220\u9664\u6210\u529F" });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestDelete2, "onRequestDelete");

// api/chat/pin.js
async function onRequestPost6({ request, env }) {
  try {
    const { error } = await requireAdmin(env, request);
    if (error) return error;
    const { messageId, action } = await request.json();
    if (action === "unpin") {
      await putJSON(env, "chat_pinned", null);
      return jsonResponse({ success: true, message: "\u5DF2\u53D6\u6D88\u7F6E\u9876" });
    }
    const messages = await getJSON(env, "chat", []);
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) {
      return jsonResponse({ success: false, message: "\u6D88\u606F\u4E0D\u5B58\u5728" }, 404);
    }
    await putJSON(env, "chat_pinned", {
      id: msg.id,
      userId: msg.userId,
      username: msg.username,
      avatar: msg.avatar,
      content: msg.content,
      image: msg.image || "",
      createdAt: msg.createdAt,
      pinnedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return jsonResponse({ success: true, message: "\u7F6E\u9876\u6210\u529F" });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestPost6, "onRequestPost");
async function onRequestGet4({ env }) {
  try {
    const pinned = await getJSON(env, "chat_pinned", null);
    return jsonResponse({ success: true, pinned });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestGet4, "onRequestGet");

// api/invite/code.js
async function onRequestGet5({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;
    return jsonResponse({ success: true, inviteCode: user.inviteCode });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestGet5, "onRequestGet");

// api/invite/mine.js
async function onRequestGet6({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;
    const users = await getJSON(env, "users", []);
    const invitedUsers = users.filter((u) => u.invitedById === user.id).map((u) => ({
      id: u.id,
      username: u.username,
      avatar: u.avatar || "",
      role: u.role,
      status: u.status,
      createdAt: u.createdAt
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return jsonResponse({ success: true, users: invitedUsers, count: invitedUsers.length });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestGet6, "onRequestGet");

// api/posts/pin.js
async function onRequestPost7({ request, env }) {
  try {
    const { error } = await requireAdmin(env, request);
    if (error) return error;
    const { postId, action } = await request.json();
    if (!postId) {
      return jsonResponse({ success: false, message: "\u7F3A\u5C11\u5E16\u5B50ID" }, 400);
    }
    const posts = await getJSON(env, "posts", []);
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      return jsonResponse({ success: false, message: "\u5E16\u5B50\u4E0D\u5B58\u5728" }, 404);
    }
    if (action === "unpin") {
      delete post.isPinned;
      delete post.pinnedAt;
    } else {
      post.isPinned = true;
      post.pinnedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    await putJSON(env, "posts", posts);
    return jsonResponse({ success: true, message: action === "unpin" ? "\u5DF2\u53D6\u6D88\u7F6E\u9876" : "\u7F6E\u9876\u6210\u529F" });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestPost7, "onRequestPost");

// api/comments/[id].js
async function onRequestDelete3({ request, env, params }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;
    const { id } = params;
    const posts = await getJSON(env, "posts", []);
    let found = false;
    for (const post of posts) {
      const comments = await getJSON(env, `comments:${post.id}`, []);
      const comment = comments.find((c) => c.id === id);
      if (comment) {
        const postAuthor = post.userId;
        const isAdmin = user.role === "admin";
        const isCommentAuthor = comment.userId === user.id;
        const isPostAuthor = postAuthor === user.id;
        if (!isAdmin && !isCommentAuthor && !isPostAuthor) {
          return jsonResponse({ success: false, message: "\u65E0\u6743\u9650\u5220\u9664" }, 403);
        }
        const newComments = comments.filter((c) => c.id !== id);
        await putJSON(env, `comments:${post.id}`, newComments);
        found = true;
        break;
      }
    }
    if (!found) {
      return jsonResponse({ success: false, message: "\u8BC4\u8BBA\u4E0D\u5B58\u5728" }, 404);
    }
    return jsonResponse({ success: true, message: "\u5220\u9664\u6210\u529F" });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestDelete3, "onRequestDelete");

// api/messages/[userId].js
function pmKey(id1, id2) {
  const ids = [id1, id2].sort();
  return `pm:${ids[0]}:${ids[1]}`;
}
__name(pmKey, "pmKey");
async function onRequestGet7({ request, env, params }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;
    const otherId = params.userId;
    const key = pmKey(user.id, otherId);
    const messages = await getJSON(env, key, []);
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
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestGet7, "onRequestGet");

// api/posts/[id].js
async function onRequestDelete4({ request, env, params }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;
    const { id } = params;
    const posts = await getJSON(env, "posts", []);
    const post = posts.find((p) => p.id === id);
    if (!post) {
      return jsonResponse({ success: false, message: "\u5E16\u5B50\u4E0D\u5B58\u5728" }, 404);
    }
    if (post.userId !== user.id && user.role !== "admin") {
      return jsonResponse({ success: false, message: "\u65E0\u6743\u9650\u5220\u9664" }, 403);
    }
    const newPosts = posts.filter((p) => p.id !== id);
    await putJSON(env, "posts", newPosts);
    await env.TRONIX_DB.delete(`comments:${id}`);
    return jsonResponse({ success: true, message: "\u5220\u9664\u6210\u529F" });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestDelete4, "onRequestDelete");

// api/announcement.js
async function onRequestGet8({ env }) {
  try {
    const announcement = await getJSON(env, "announcement", null);
    return jsonResponse({ success: true, announcement });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestGet8, "onRequestGet");
async function onRequestPost8({ request, env }) {
  try {
    const { error } = await requireAdmin(env, request);
    if (error) return error;
    const { content, title } = await request.json();
    if (!content) {
      return jsonResponse({ success: false, message: "\u516C\u544A\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A" }, 400);
    }
    const announcement = {
      title: title || "\u8BBA\u575B\u516C\u544A",
      content,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await putJSON(env, "announcement", announcement);
    return jsonResponse({ success: true, message: "\u516C\u544A\u5DF2\u66F4\u65B0", announcement });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestPost8, "onRequestPost");
async function onRequestDelete5({ request, env }) {
  try {
    const { error } = await requireAdmin(env, request);
    if (error) return error;
    await putJSON(env, "announcement", null);
    return jsonResponse({ success: true, message: "\u516C\u544A\u5DF2\u5220\u9664" });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestDelete5, "onRequestDelete");

// api/comments/index.js
async function onRequestGet9({ request, env }) {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get("postId");
    if (!postId) {
      return jsonResponse({ success: false, message: "\u7F3A\u5C11postId\u53C2\u6570" }, 400);
    }
    const comments = await getJSON(env, `comments:${postId}`, []);
    return jsonResponse({ success: true, comments });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestGet9, "onRequestGet");
async function onRequestPost9({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;
    if (isMuted(user)) {
      return jsonResponse({ success: false, message: "\u60A8\u5DF2\u88AB\u7981\u8A00" }, 403);
    }
    const { postId, content, image } = await request.json();
    if (!postId || !content) {
      return jsonResponse({ success: false, message: "\u7F3A\u5C11\u5FC5\u8981\u5B57\u6BB5" }, 400);
    }
    const comments = await getJSON(env, `comments:${postId}`, []);
    const comment = {
      id: generateId(),
      postId,
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      content,
      image: image || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    comments.push(comment);
    await putJSON(env, `comments:${postId}`, comments);
    return jsonResponse({ success: true, message: "\u8BC4\u8BBA\u6210\u529F", comment });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestPost9, "onRequestPost");

// api/init.js
async function onRequestGet10({ env }) {
  try {
    const users = await getJSON(env, "users", []);
    if (users.find((u) => u.role === "admin")) {
      return jsonResponse({ success: false, message: "\u7BA1\u7406\u5458\u5DF2\u5B58\u5728\uFF0C\u5982\u9700\u91CD\u7F6E\u5BC6\u7801\u8BF7\u8054\u7CFB\u5F00\u53D1\u8005" });
    }
    const adminPassword = await hashPassword("Wz@2580.");
    const adminUser = {
      id: generateId(),
      username: "Joker",
      password: adminPassword,
      inviteCode: generateInviteCode(),
      invitedById: null,
      role: "admin",
      status: "active",
      muteUntil: null,
      avatar: "https://ui-avatars.com/api/?name=Joker&background=fc00ef&color=fff",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    users.push(adminUser);
    await putJSON(env, "users", users);
    return jsonResponse({ success: true, message: "\u7BA1\u7406\u5458\u8D26\u53F7\u521D\u59CB\u5316\u6210\u529F\uFF01\u7528\u6237\u540D: Joker" });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u521D\u59CB\u5316\u5931\u8D25: " + err.message }, 500);
  }
}
__name(onRequestGet10, "onRequestGet");

// api/messages/index.js
function pmKey2(id1, id2) {
  const ids = [id1, id2].sort();
  return `pm:${ids[0]}:${ids[1]}`;
}
__name(pmKey2, "pmKey");
async function onRequestGet11({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;
    const conversationIds = await getJSON(env, `pm:conversations:${user.id}`, []);
    const conversations = [];
    for (const otherId of conversationIds) {
      const messages = await getJSON(env, pmKey2(user.id, otherId), []);
      if (messages.length === 0) continue;
      const lastMessage = messages[messages.length - 1];
      const unreadCount = messages.filter((m) => m.receiverId === user.id && !m.read).length;
      conversations.push({
        userId: otherId,
        lastMessage,
        unreadCount
      });
    }
    conversations.sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
    return jsonResponse({ success: true, conversations });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestGet11, "onRequestGet");
async function onRequestPost10({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;
    if (isMuted(user)) {
      return jsonResponse({ success: false, message: "\u60A8\u5DF2\u88AB\u7981\u8A00" }, 403);
    }
    const { receiverId, content, image } = await request.json();
    if (!receiverId || !content && !image) {
      return jsonResponse({ success: false, message: "\u7F3A\u5C11\u5FC5\u8981\u5B57\u6BB5" }, 400);
    }
    if (receiverId === user.id) {
      return jsonResponse({ success: false, message: "\u4E0D\u80FD\u7ED9\u81EA\u5DF1\u53D1\u79C1\u4FE1" }, 400);
    }
    const users = await getJSON(env, "users", []);
    const receiver = users.find((u) => u.id === receiverId);
    if (!receiver) {
      return jsonResponse({ success: false, message: "\u63A5\u6536\u8005\u4E0D\u5B58\u5728" }, 404);
    }
    const key = pmKey2(user.id, receiverId);
    const messages = await getJSON(env, key, []);
    const message = {
      id: generateId(),
      senderId: user.id,
      receiverId,
      senderName: user.username,
      senderAvatar: user.avatar,
      content: content || "",
      image: image || "",
      read: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    messages.push(message);
    await putJSON(env, key, messages);
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
    return jsonResponse({ success: true, message: "\u53D1\u9001\u6210\u529F", data: message });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestPost10, "onRequestPost");

// api/posts/index.js
async function onRequestGet12({ request, env }) {
  try {
    const posts = await getJSON(env, "posts", []);
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return jsonResponse({ success: true, posts });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestGet12, "onRequestGet");
async function onRequestPost11({ request, env }) {
  try {
    const { error, user } = await requireAuth(env, request);
    if (error) return error;
    if (isMuted(user)) {
      return jsonResponse({ success: false, message: "\u60A8\u5DF2\u88AB\u7981\u8A00" }, 403);
    }
    const { title, content, category, image } = await request.json();
    if (!title || !content) {
      return jsonResponse({ success: false, message: "\u6807\u9898\u548C\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A" }, 400);
    }
    const posts = await getJSON(env, "posts", []);
    const post = {
      id: generateId(),
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      title,
      content,
      category: category || "general",
      image: image || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    posts.push(post);
    await putJSON(env, "posts", posts);
    return jsonResponse({ success: true, message: "\u53D1\u5E03\u6210\u529F", post });
  } catch (err) {
    return jsonResponse({ success: false, message: "\u670D\u52A1\u5668\u9519\u8BEF: " + err.message }, 500);
  }
}
__name(onRequestPost11, "onRequestPost");

// ../.wrangler/tmp/pages-dcKDGz/functionsRoutes-0.9890794237084677.mjs
var routes = [
  {
    routePath: "/api/chat/messages/:id",
    mountPath: "/api/chat/messages",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/admin/user-status",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/admin/users",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/auth/change-password",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/auth/login",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/auth/me",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/auth/register",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/chat/messages",
    mountPath: "/api/chat",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete2]
  },
  {
    routePath: "/api/chat/messages",
    mountPath: "/api/chat",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/chat/messages",
    mountPath: "/api/chat",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/chat/pin",
    mountPath: "/api/chat",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/chat/pin",
    mountPath: "/api/chat",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  },
  {
    routePath: "/api/invite/code",
    mountPath: "/api/invite",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/invite/mine",
    mountPath: "/api/invite",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/posts/pin",
    mountPath: "/api/posts",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost7]
  },
  {
    routePath: "/api/comments/:id",
    mountPath: "/api/comments",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete3]
  },
  {
    routePath: "/api/messages/:userId",
    mountPath: "/api/messages",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/posts/:id",
    mountPath: "/api/posts",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete4]
  },
  {
    routePath: "/api/announcement",
    mountPath: "/api",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete5]
  },
  {
    routePath: "/api/announcement",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/api/announcement",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost8]
  },
  {
    routePath: "/api/comments",
    mountPath: "/api/comments",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet9]
  },
  {
    routePath: "/api/comments",
    mountPath: "/api/comments",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost9]
  },
  {
    routePath: "/api/init",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet10]
  },
  {
    routePath: "/api/messages",
    mountPath: "/api/messages",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet11]
  },
  {
    routePath: "/api/messages",
    mountPath: "/api/messages",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost10]
  },
  {
    routePath: "/api/posts",
    mountPath: "/api/posts",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet12]
  },
  {
    routePath: "/api/posts",
    mountPath: "/api/posts",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost11]
  }
];

// ../../root/.npm/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../root/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../root/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../root/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-lrjHbP/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../root/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-lrjHbP/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.4854113762565012.mjs.map
