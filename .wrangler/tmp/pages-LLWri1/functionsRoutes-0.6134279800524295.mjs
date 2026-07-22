import { onRequestDelete as __api_chat_messages__id__js_onRequestDelete } from "/workspace/functions/api/chat/messages/[id].js"
import { onRequestPost as __api_comments__id__like_js_onRequestPost } from "/workspace/functions/api/comments/[id]/like.js"
import { onRequestPost as __api_posts__id__like_js_onRequestPost } from "/workspace/functions/api/posts/[id]/like.js"
import { onRequestPost as __api_admin_user_status_js_onRequestPost } from "/workspace/functions/api/admin/user-status.js"
import { onRequestGet as __api_admin_users_js_onRequestGet } from "/workspace/functions/api/admin/users.js"
import { onRequestPost as __api_auth_change_password_js_onRequestPost } from "/workspace/functions/api/auth/change-password.js"
import { onRequestPost as __api_auth_login_js_onRequestPost } from "/workspace/functions/api/auth/login.js"
import { onRequestGet as __api_auth_me_js_onRequestGet } from "/workspace/functions/api/auth/me.js"
import { onRequestPost as __api_auth_register_js_onRequestPost } from "/workspace/functions/api/auth/register.js"
import { onRequestDelete as __api_chat_messages_js_onRequestDelete } from "/workspace/functions/api/chat/messages.js"
import { onRequestGet as __api_chat_messages_js_onRequestGet } from "/workspace/functions/api/chat/messages.js"
import { onRequestPost as __api_chat_messages_js_onRequestPost } from "/workspace/functions/api/chat/messages.js"
import { onRequestGet as __api_chat_pin_js_onRequestGet } from "/workspace/functions/api/chat/pin.js"
import { onRequestPost as __api_chat_pin_js_onRequestPost } from "/workspace/functions/api/chat/pin.js"
import { onRequestGet as __api_invite_code_js_onRequestGet } from "/workspace/functions/api/invite/code.js"
import { onRequestGet as __api_invite_mine_js_onRequestGet } from "/workspace/functions/api/invite/mine.js"
import { onRequestPost as __api_posts_pin_js_onRequestPost } from "/workspace/functions/api/posts/pin.js"
import { onRequestPost as __api_user_avatar_js_onRequestPost } from "/workspace/functions/api/user/avatar.js"
import { onRequestDelete as __api_comments__id__js_onRequestDelete } from "/workspace/functions/api/comments/[id].js"
import { onRequestGet as __api_messages__userId__js_onRequestGet } from "/workspace/functions/api/messages/[userId].js"
import { onRequestDelete as __api_posts__id__js_onRequestDelete } from "/workspace/functions/api/posts/[id].js"
import { onRequestDelete as __api_announcement_js_onRequestDelete } from "/workspace/functions/api/announcement.js"
import { onRequestGet as __api_announcement_js_onRequestGet } from "/workspace/functions/api/announcement.js"
import { onRequestPost as __api_announcement_js_onRequestPost } from "/workspace/functions/api/announcement.js"
import { onRequestGet as __api_comments_index_js_onRequestGet } from "/workspace/functions/api/comments/index.js"
import { onRequestPost as __api_comments_index_js_onRequestPost } from "/workspace/functions/api/comments/index.js"
import { onRequestGet as __api_init_js_onRequestGet } from "/workspace/functions/api/init.js"
import { onRequestGet as __api_messages_index_js_onRequestGet } from "/workspace/functions/api/messages/index.js"
import { onRequestPost as __api_messages_index_js_onRequestPost } from "/workspace/functions/api/messages/index.js"
import { onRequestGet as __api_posts_index_js_onRequestGet } from "/workspace/functions/api/posts/index.js"
import { onRequestPost as __api_posts_index_js_onRequestPost } from "/workspace/functions/api/posts/index.js"

export const routes = [
    {
      routePath: "/api/chat/messages/:id",
      mountPath: "/api/chat/messages",
      method: "DELETE",
      middlewares: [],
      modules: [__api_chat_messages__id__js_onRequestDelete],
    },
  {
      routePath: "/api/comments/:id/like",
      mountPath: "/api/comments/:id",
      method: "POST",
      middlewares: [],
      modules: [__api_comments__id__like_js_onRequestPost],
    },
  {
      routePath: "/api/posts/:id/like",
      mountPath: "/api/posts/:id",
      method: "POST",
      middlewares: [],
      modules: [__api_posts__id__like_js_onRequestPost],
    },
  {
      routePath: "/api/admin/user-status",
      mountPath: "/api/admin",
      method: "POST",
      middlewares: [],
      modules: [__api_admin_user_status_js_onRequestPost],
    },
  {
      routePath: "/api/admin/users",
      mountPath: "/api/admin",
      method: "GET",
      middlewares: [],
      modules: [__api_admin_users_js_onRequestGet],
    },
  {
      routePath: "/api/auth/change-password",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_change_password_js_onRequestPost],
    },
  {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_login_js_onRequestPost],
    },
  {
      routePath: "/api/auth/me",
      mountPath: "/api/auth",
      method: "GET",
      middlewares: [],
      modules: [__api_auth_me_js_onRequestGet],
    },
  {
      routePath: "/api/auth/register",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_register_js_onRequestPost],
    },
  {
      routePath: "/api/chat/messages",
      mountPath: "/api/chat",
      method: "DELETE",
      middlewares: [],
      modules: [__api_chat_messages_js_onRequestDelete],
    },
  {
      routePath: "/api/chat/messages",
      mountPath: "/api/chat",
      method: "GET",
      middlewares: [],
      modules: [__api_chat_messages_js_onRequestGet],
    },
  {
      routePath: "/api/chat/messages",
      mountPath: "/api/chat",
      method: "POST",
      middlewares: [],
      modules: [__api_chat_messages_js_onRequestPost],
    },
  {
      routePath: "/api/chat/pin",
      mountPath: "/api/chat",
      method: "GET",
      middlewares: [],
      modules: [__api_chat_pin_js_onRequestGet],
    },
  {
      routePath: "/api/chat/pin",
      mountPath: "/api/chat",
      method: "POST",
      middlewares: [],
      modules: [__api_chat_pin_js_onRequestPost],
    },
  {
      routePath: "/api/invite/code",
      mountPath: "/api/invite",
      method: "GET",
      middlewares: [],
      modules: [__api_invite_code_js_onRequestGet],
    },
  {
      routePath: "/api/invite/mine",
      mountPath: "/api/invite",
      method: "GET",
      middlewares: [],
      modules: [__api_invite_mine_js_onRequestGet],
    },
  {
      routePath: "/api/posts/pin",
      mountPath: "/api/posts",
      method: "POST",
      middlewares: [],
      modules: [__api_posts_pin_js_onRequestPost],
    },
  {
      routePath: "/api/user/avatar",
      mountPath: "/api/user",
      method: "POST",
      middlewares: [],
      modules: [__api_user_avatar_js_onRequestPost],
    },
  {
      routePath: "/api/comments/:id",
      mountPath: "/api/comments",
      method: "DELETE",
      middlewares: [],
      modules: [__api_comments__id__js_onRequestDelete],
    },
  {
      routePath: "/api/messages/:userId",
      mountPath: "/api/messages",
      method: "GET",
      middlewares: [],
      modules: [__api_messages__userId__js_onRequestGet],
    },
  {
      routePath: "/api/posts/:id",
      mountPath: "/api/posts",
      method: "DELETE",
      middlewares: [],
      modules: [__api_posts__id__js_onRequestDelete],
    },
  {
      routePath: "/api/announcement",
      mountPath: "/api",
      method: "DELETE",
      middlewares: [],
      modules: [__api_announcement_js_onRequestDelete],
    },
  {
      routePath: "/api/announcement",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_announcement_js_onRequestGet],
    },
  {
      routePath: "/api/announcement",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_announcement_js_onRequestPost],
    },
  {
      routePath: "/api/comments",
      mountPath: "/api/comments",
      method: "GET",
      middlewares: [],
      modules: [__api_comments_index_js_onRequestGet],
    },
  {
      routePath: "/api/comments",
      mountPath: "/api/comments",
      method: "POST",
      middlewares: [],
      modules: [__api_comments_index_js_onRequestPost],
    },
  {
      routePath: "/api/init",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_init_js_onRequestGet],
    },
  {
      routePath: "/api/messages",
      mountPath: "/api/messages",
      method: "GET",
      middlewares: [],
      modules: [__api_messages_index_js_onRequestGet],
    },
  {
      routePath: "/api/messages",
      mountPath: "/api/messages",
      method: "POST",
      middlewares: [],
      modules: [__api_messages_index_js_onRequestPost],
    },
  {
      routePath: "/api/posts",
      mountPath: "/api/posts",
      method: "GET",
      middlewares: [],
      modules: [__api_posts_index_js_onRequestGet],
    },
  {
      routePath: "/api/posts",
      mountPath: "/api/posts",
      method: "POST",
      middlewares: [],
      modules: [__api_posts_index_js_onRequestPost],
    },
  ]