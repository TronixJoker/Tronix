// Tronix 用户认证状态管理 - 在所有页面共用

const TronixAuth = {
    // 获取当前登录用户
    getCurrentUser: function() {
        // 优先检查 localStorage（记住我），再检查 sessionStorage
        let session = localStorage.getItem('tronixCurrentUser');
        if (!session) {
            session = sessionStorage.getItem('tronixCurrentUser');
        }
        if (!session) return null;
        try {
            return JSON.parse(session);
        } catch {
            return null;
        }
    },

    // 退出登录
    logout: function() {
        localStorage.removeItem('tronixCurrentUser');
        sessionStorage.removeItem('tronixCurrentUser');
        localStorage.removeItem('tronixAvatar');
    },

    // 更新导航栏显示状态
    updateNavigation: function() {
        const user = this.getCurrentUser();
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        // 检查是否已经添加了用户区域
        let userArea = document.getElementById('userAuthArea');
        let loginLink = navLinks.querySelector('a[href="login.html"]');

        if (user) {
            // 已登录 - 隐藏登录链接，显示用户信息
            if (loginLink) loginLink.style.display = 'none';

            if (!userArea) {
                // 创建用户区域
                userArea = document.createElement('div');
                userArea.id = 'userAuthArea';
                userArea.className = 'user-auth-area';
                userArea.innerHTML = `
                    <span class="user-welcome">欢迎，<span class="user-name">${this.escapeHtml(user.username)}</span></span>
                    <div class="user-avatar-container">
                        <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=6366f1&color=fff'}" alt="用户头像" class="user-avatar" id="userAvatar">
                        <div class="user-dropdown" id="userDropdown">
                            <a href="#" data-action="profile"><i class="fas fa-user-circle"></i> 个人中心</a>
                            <a href="#" data-action="settings"><i class="fas fa-cog"></i> 账户设置</a>
                            <a href="#" data-action="logout"><i class="fas fa-sign-out-alt"></i> 退出登录</a>
                        </div>
                    </div>
                `;
                navLinks.appendChild(userArea);

                // 添加交互
                const avatar = document.getElementById('userAvatar');
                const dropdown = document.getElementById('userDropdown');
                
                avatar.addEventListener('click', function(e) {
                    e.stopPropagation();
                    dropdown.classList.toggle('active');
                });

                document.addEventListener('click', function() {
                    dropdown.classList.remove('active');
                });

                dropdown.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const action = e.target.closest('[data-action]')?.dataset.action;
                    if (action === 'logout') {
                        e.preventDefault();
                        TronixAuth.logout();
                        TronixAuth.showFeedback('已退出登录', 'info');
                        setTimeout(() => window.location.reload(), 800);
                    } else if (action === 'profile' || action === 'settings') {
                        e.preventDefault();
                        TronixAuth.showFeedback('功能开发中...', 'info');
                    }
                });
            }
        } else {
            // 未登录 - 显示登录链接，移除用户区域
            if (loginLink) loginLink.style.display = 'inline-block';
            if (userArea) userArea.remove();
        }
    },

    // HTML 转义防止 XSS
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 显示反馈消息
    showFeedback: function(message, type) {
        let feedback = document.getElementById('authFeedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = 'authFeedback';
            feedback.style.cssText = `
                position: fixed;
                top: 100px;
                right: 50px;
                padding: 1rem 2rem;
                border-radius: 10px;
                color: white;
                font-weight: 600;
                z-index: 10000;
                opacity: 0;
                transform: translateX(100px);
                transition: all 0.3s ease;
                font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            `;
            document.body.appendChild(feedback);
        }

        const colors = {
            success: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
            error: 'linear-gradient(45deg, #ff4d4d, #ff9800)',
            info: 'linear-gradient(45deg, #2196F3, #64B5F6)'
        };

        const icons = {
            success: '<i class="fas fa-check-circle"></i> ',
            error: '<i class="fas fa-exclamation-circle"></i> ',
            info: '<i class="fas fa-info-circle"></i> '
        };

        feedback.innerHTML = (icons[type] || '') + message;
        feedback.style.background = colors[type] || colors.info;
        feedback.style.opacity = '1';
        feedback.style.transform = 'translateX(0)';

        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateX(100px)';
        }, 2500);
    },

    // 注入必要的样式
    injectStyles: function() {
        if (document.getElementById('tronixAuthStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'tronixAuthStyles';
        style.textContent = `
            .user-auth-area {
                display: flex;
                align-items: center;
                gap: 0.8rem;
            }
            .user-auth-area .user-welcome {
                color: #e0e0ff;
                font-size: 0.95rem;
            }
            .user-auth-area .user-welcome .user-name {
                color: #04eff7;
                font-weight: 600;
            }
            .user-avatar-container {
                position: relative;
                display: inline-block;
            }
            .user-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                object-fit: cover;
                cursor: pointer;
                border: 2px solid rgba(99, 102, 241, 0.6);
                transition: all 0.3s ease;
            }
            .user-avatar:hover {
                transform: scale(1.1);
                box-shadow: 0 0 10px rgba(99, 102, 241, 0.6);
            }
            .user-dropdown {
                position: absolute;
                top: 50px;
                right: 0;
                background: rgba(20, 15, 45, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 8px;
                padding: 0.5rem 0;
                min-width: 160px;
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.1);
                z-index: 1001;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.3s ease;
            }
            .user-dropdown.active {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            .user-dropdown a {
                display: block;
                padding: 0.6rem 1.2rem;
                color: #e0e0ff;
                text-decoration: none;
                transition: all 0.2s ease;
                font-size: 0.9rem;
            }
            .user-dropdown a:hover {
                background: rgba(99, 102, 241, 0.2);
                color: #04eff7;
            }
            .user-dropdown a i {
                margin-right: 0.5rem;
                width: 20px;
                text-align: center;
            }
            @media (max-width: 768px) {
                .user-auth-area .user-welcome {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
    },

    // 初始化
    init: function() {
        this.injectStyles();
        
        // DOM 加载完成后更新导航
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.updateNavigation());
        } else {
            this.updateNavigation();
        }
    }
};

// 自动初始化
TronixAuth.init();
