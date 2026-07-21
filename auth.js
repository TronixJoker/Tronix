const TronixAuth = {
    getCurrentUser: function() {
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

    logout: function() {
        localStorage.removeItem('tronixCurrentUser');
        sessionStorage.removeItem('tronixCurrentUser');
        localStorage.removeItem('tronixAvatar');
    },

    updateNavigation: function() {
        const user = this.getCurrentUser();
        const navLinks = document.querySelector('.nav-links');
        const navActions = document.querySelector('.nav-actions');
        if (!navLinks && !navActions) return;

        let userArea = document.getElementById('userAuthArea');
        let loginLink = navLinks ? navLinks.querySelector('a[href="login.html"]') : null;

        if (user) {
            if (loginLink) loginLink.style.display = 'none';

            if (!userArea) {
                userArea = document.createElement('div');
                userArea.id = 'userAuthArea';
                userArea.className = 'user-auth-area';
                userArea.innerHTML = `
                    <span class="user-welcome">欢迎，<span class="user-name">${this.escapeHtml(user.username)}</span></span>
                    <div class="user-avatar-container">
                        <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=fc00ef&color=fff'}" alt="用户头像" class="user-avatar" id="userAvatar">
                        <div class="user-dropdown" id="userDropdown">
                            <a href="#" data-action="profile"><i class="fas fa-user-circle"></i> 个人中心</a>
                            <a href="#" data-action="settings"><i class="fas fa-cog"></i> 账户设置</a>
                            <a href="#" data-action="logout"><i class="fas fa-sign-out-alt"></i> 退出登录</a>
                        </div>
                    </div>
                `;

                const mobileMenuBtn = navActions ? navActions.querySelector('.mobile-menu-btn') : null;
                if (mobileMenuBtn) {
                    mobileMenuBtn.after(userArea);
                } else if (navActions) {
                    navActions.appendChild(userArea);
                } else if (navLinks) {
                    navLinks.appendChild(userArea);
                }

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
            } else {
                const userNameEl = userArea.querySelector('.user-name');
                const avatarEl = userArea.querySelector('.user-avatar');
                if (userNameEl) userNameEl.textContent = user.username;
                if (avatarEl) {
                    avatarEl.src = user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=fc00ef&color=fff';
                }
            }
        } else {
            if (loginLink) loginLink.style.display = '';
            if (userArea) userArea.remove();
        }
    },

    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

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
                border-radius: 12px;
                color: white;
                font-weight: 600;
                z-index: 10000;
                opacity: 0;
                transform: translateX(100px);
                transition: all 0.3s ease;
                font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.1);
            `;
            document.body.appendChild(feedback);
        }

        const colors = {
            success: 'linear-gradient(45deg, #00c853, #00e676)',
            error: 'linear-gradient(45deg, #ff1744, #ff5252)',
            info: 'linear-gradient(45deg, #fc00ef, #04eff7)'
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
                width: 38px;
                height: 38px;
                border-radius: 50%;
                object-fit: cover;
                cursor: pointer;
                border: 2px solid #fc00ef;
                transition: all 0.3s ease;
                box-shadow: 0 0 10px rgba(252, 0, 239, 0.4);
            }
            .user-avatar:hover {
                transform: scale(1.1);
                box-shadow: 0 0 15px rgba(252, 0, 239, 0.7);
                border-color: #04eff7;
            }
            .user-dropdown {
                position: absolute;
                top: 52px;
                right: 0;
                background: rgba(10, 8, 25, 0.95);
                backdrop-filter: blur(15px);
                border-radius: 12px;
                padding: 0.5rem 0;
                min-width: 160px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(252, 0, 239, 0.2);
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
            .user-dropdown::before {
                content: '';
                position: absolute;
                top: -6px;
                right: 15px;
                width: 12px;
                height: 12px;
                background: rgba(10, 8, 25, 0.95);
                border-left: 1px solid rgba(252, 0, 239, 0.2);
                border-top: 1px solid rgba(252, 0, 239, 0.2);
                transform: rotate(45deg);
            }
            .user-dropdown a {
                display: block;
                padding: 0.7rem 1.2rem;
                color: #e0e0ff;
                text-decoration: none;
                transition: all 0.2s ease;
                font-size: 0.9rem;
            }
            .user-dropdown a:hover {
                background: rgba(252, 0, 239, 0.15);
                color: #04eff7;
            }
            .user-dropdown a i {
                margin-right: 0.6rem;
                width: 18px;
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

    init: function() {
        this.injectStyles();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.updateNavigation());
        } else {
            this.updateNavigation();
        }
    }
};

TronixAuth.init();
