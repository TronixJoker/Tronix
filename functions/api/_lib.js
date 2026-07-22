// ==================== 共享工具库 ====================

// JSON 响应
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// 从 KV 读取 JSON
export async function getJSON(env, key, defaultValue = null) {
  const val = await env.TRONIX_DB.get(key);
  if (!val) return defaultValue;
  try { return JSON.parse(val); } catch { return defaultValue; }
}

// 写入 JSON 到 KV
export async function putJSON(env, key, value) {
  await env.TRONIX_DB.put(key, JSON.stringify(value));
}

// 生成随机 ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// 生成邀请码（6位大写字母+数字）
export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// 生成会话 Token
export function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// SHA-256 密码哈希
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'tronix_salt_2024');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 从请求头获取用户
export async function getUserFromRequest(env, request) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const sessions = await getJSON(env, 'sessions', {});
  const userId = sessions[token];
  if (!userId) return null;
  const users = await getJSON(env, 'users', []);
  return users.find(u => u.id === userId) || null;
}

// 要求登录
export async function requireAuth(env, request) {
  const user = await getUserFromRequest(env, request);
  if (!user) return { error: jsonResponse({ success: false, message: '请先登录' }, 401), user: null };
  if (user.status === 'banned') return { error: jsonResponse({ success: false, message: '账号已被封禁' }, 403), user: null };
  return { error: null, user };
}

// 要求管理员权限
export async function requireAdmin(env, request) {
  const result = await requireAuth(env, request);
  if (result.error) return result;
  if (result.user.role !== 'admin') {
    return { error: jsonResponse({ success: false, message: '无权限' }, 403), user: null };
  }
  return result;
}

// 检查禁言状态
export function isMuted(user) {
  if (user.status !== 'muted') return false;
  if (user.muteUntil && new Date(user.muteUntil) < new Date()) return false;
  return true;
}
