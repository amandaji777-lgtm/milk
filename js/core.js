/*核心应用逻辑：数据加载保存、消息渲染、会话管理等*/

function clearAllAppData() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
    overlay.innerHTML = `
        <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:340px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;">
            <div style="text-align:center;margin-bottom:20px;">
                <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,80,80,0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                    <i class="fas fa-trash-alt" style="color:#ff5050;font-size:20px;"></i>
                </div>
                <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">重置数据</div>
                <div style="font-size:12px;color:var(--text-secondary);">请选择要重置的范围</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
                <button id="_reset_current" style="width:100%;padding:12px 16px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-weight:600;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;transition:all 0.2s;">
                    <i class="fas fa-comment-slash" style="color:var(--accent-color);font-size:15px;width:18px;text-align:center;"></i>
                    <span>仅清除当前会话消息</span>
                </button>
                <button id="_reset_all" style="width:100%;padding:12px 16px;border:1px solid rgba(255,80,80,0.3);border-radius:12px;background:rgba(255,80,80,0.06);color:#ff5050;font-size:13px;font-weight:600;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;transition:all 0.2s;">
                    <i class="fas fa-bomb" style="font-size:15px;width:18px;text-align:center;"></i>
                    <span>重置所有数据（完全清空）</span>
                </button>
                <button id="_reset_cancel" style="width:100%;padding:10px 16px;border:none;border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;transition:all 0.2s;">取消</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    function closeDialog() { overlay.remove(); }
    overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });
    const _resetCancelBtn = document.getElementById('_reset_cancel');
    const _resetCurrentBtn = document.getElementById('_reset_current');
    const _resetAllBtn = document.getElementById('_reset_all');

    if (_resetCancelBtn) _resetCancelBtn.onclick = closeDialog;

    if (_resetCurrentBtn) _resetCurrentBtn.onclick = () => {
        closeDialog();
        if (confirm('确定要清除当前会话的所有消息吗？此操作无法恢复！')) {
            messages = [];
            window.messages = messages;
            displayedMessageCount = HISTORY_BATCH_SIZE;

            try { localStorage.removeItem('BACKUP_V1_critical'); } catch(e) {}
            try { localStorage.removeItem('BACKUP_V1_timestamp'); } catch(e) {}

            localforage.setItem(getStorageKey('chatMessages'), []).catch(() => {});

            renderMessages();
            showNotification('当前会话消息已清除', 'success');
        }
    };

    if (_resetAllBtn) _resetAllBtn.onclick = () => {
        closeDialog();
        if (confirm('【高危操作】确定要重置所有数据吗？此操作将清除所有本地数据且无法恢复！')) {
            window._skipBackup = true;
            messages = [];
            settings = {};
            localforage.clear().then(() => {
                localStorage.clear();
                showNotification('所有数据已重置，页面即将刷新', 'info', 2000);
                setTimeout(() => { window.location.href = window.location.pathname + '?reset=' + Date.now(); }, 2000);
            }).catch(e => {
                window._skipBackup = false;
                showNotification('清除数据时发生错误', 'error');
                console.error("清除 localforage 失败:", e);
            });
        }
    };
}

function loadMoreHistory() {
    const historyLoader = document.getElementById('history-loader');
    const container = DOMElements && DOMElements.chatContainer;
    const currentOldestMsgIndex = messages.length - displayedMessageCount;

    if (!container) return;
    if (isLoadingHistory) return;

    if (currentOldestMsgIndex <= 0) {
        if (historyLoader) historyLoader.style.display = 'none';
        return;
    }

    isLoadingHistory = true;
    if (historyLoader) historyLoader.style.display = 'flex';

    const visibleWrappers = Array.from(container.querySelectorAll('.message-wrapper'));
    const firstVisible = visibleWrappers.find(function(el) {
        return el.offsetTop + el.offsetHeight >= container.scrollTop;
    }) || visibleWrappers[0] || null;

    const anchorId = firstVisible ? firstVisible.dataset.msgId : null;
    const anchorTop = firstVisible ? firstVisible.getBoundingClientRect().top : 0;

    const prevVisibility = container.style.visibility;
    const prevOverflow = container.style.overflow;
    const prevScrollBehavior = container.style.scrollBehavior;
    const prevOpacity = container.style.opacity;

    container.style.opacity = '0.015';
    container.style.visibility = 'hidden';
    container.style.overflow = 'hidden';
    container.style.scrollBehavior = 'auto';

    setTimeout(() => {
        displayedMessageCount = Math.min(messages.length, displayedMessageCount + HISTORY_BATCH_SIZE);
        renderMessages(true);

        requestAnimationFrame(() => {
            if (anchorId) {
                const newAnchor = container.querySelector('[data-msg-id="' + anchorId + '"]');
                if (newAnchor) {
                    const newTop = newAnchor.getBoundingClientRect().top;
                    container.scrollTop += (newTop - anchorTop);
                }
            }

            requestAnimationFrame(() => {
                container.style.opacity = prevOpacity || '';
                container.style.visibility = prevVisibility || '';
                container.style.overflow = prevOverflow || '';
                container.style.scrollBehavior = prevScrollBehavior || '';

                if (historyLoader) {
                    historyLoader.style.display = (messages.length > displayedMessageCount) ? 'flex' : 'none';
                }
                isLoadingHistory = false;
            });
        });
    }, 120);
}

function getDefaultSettings() {
    return {
        partnerName: "梦角",
        myName: "我",
        myStatus: "在线",
        partnerStatus: "在线",
        isDarkMode: false,
        colorTheme: "gold",
        soundEnabled: true,
        typingIndicatorEnabled: true,
        readReceiptsEnabled: true,
        replyEnabled: true,
        lastStatusChange: Date.now(),
        nextStatusChange: 1 + Math.random() * 7,
        fontSize: 16,
        bubbleStyle: 'standard',
        messageFontFamily: "'Noto Serif SC', serif",
        messageFontWeight: 400,
        messageLineHeight: 1.5,
        replyDelayMin: 3000,
        replyDelayMax: 7000,
        inChatAvatarEnabled: true,
        inChatAvatarSize: 36,
        inChatAvatarPosition: 'center',
        alwaysShowAvatar: false,
        showPartnerNameInChat: false,
        customFontUrl: "", 
        customBubbleCss: "",
        customGlobalCss: "",
        myAvatarFrame: null, 
        partnerAvatarFrame: null,
        myAvatarShape: 'circle',
        partnerAvatarShape: 'circle',
        autoSendEnabled: false,
        autoSendInterval: 5,
        allowReadNoReply: false, 
        readNoReplyChance: 0.2,
        timeFormat: 'HH:mm',
        // 统一音效设置（所有场景共用）
        unifiedSoundPreset: 'kakaotalk',
        unifiedSoundUrl: '',
        soundVolume: 0.15,
        bottomCollapseMode: false,
        emojiMixEnabled: true
    };
}

function renderBackgroundGallery() {
    const list = document.getElementById('background-gallery-list');
    if (!list) return;

    list.innerHTML = '';

    const addBtn = document.createElement('div');
    addBtn.className = 'bg-item bg-add-btn';
    addBtn.innerHTML = '<i class="fas fa-plus"></i><span></span>';
    addBtn.onclick = () => document.getElementById('bg-gallery-input').click();
    list.appendChild(addBtn);

    const currentBg = safeGetItem(getStorageKey('chatBackground'));

    savedBackgrounds.forEach((bg, index) => {
        const item = document.createElement('div');
        let isActive = false;

        if (currentBg && currentBg === bg.value) isActive = true;

        item.className = `bg-item ${isActive ? 'active': ''}`;

        if (bg.type === 'image') {
            item.innerHTML = `<img src="${bg.value}" loading="lazy" alt="bg">`;
        } else {
            item.innerHTML = `<div class="bg-color-block" style="background: ${bg.value}"></div>`;
        }

        item.onclick = (e) => {
            if (e.target.closest('.bg-delete-btn')) return;
            applyBackground(bg.value);
            safeSetItem(getStorageKey('chatBackground'), bg.value);
            localforage.setItem(getStorageKey('chatBackground'), bg.value);
            renderBackgroundGallery();
            showNotification('背景已切换', 'success');
        };

        if (bg.id.startsWith('user-')) {
            const delBtn = document.createElement('div');
            delBtn.className = 'bg-delete-btn';
            delBtn.innerHTML = '<i class="fas fa-trash"></i>';
            delBtn.title = "删除此背景";
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('确定删除这张背景图吗？')) {
                    savedBackgrounds.splice(index, 1);
                    saveBackgroundGallery();

                    if (isActive) {
                        removeBackground(); 
                        renderBackgroundGallery();
                    } else {
                        renderBackgroundGallery();
                    }
                }
            };
            item.appendChild(delBtn);
        }

        list.appendChild(item);
    });
}

function saveBackgroundGallery() {
    localforage.setItem(getStorageKey('backgroundGallery'), savedBackgrounds);
}

const applyBackground = (value) => {
    if (!value || typeof value !== 'string') return;
    try {
        if (value.startsWith('linear-gradient') || value.startsWith('#') || value.startsWith('rgb')) {
            document.documentElement.style.setProperty('--chat-bg-image', value);
        } else {
            const cssValue = value.startsWith('url(') ? value : `url(${value})`;
            document.documentElement.style.setProperty('--chat-bg-image', cssValue);
        }
        document.body.classList.add('with-background');
    } catch (e) {
        if (typeof removeBackground === 'function') removeBackground();
    }
};

const loadData = async () => {
    try {
        settings = getDefaultSettings();

        const results = await Promise.allSettled([
            localforage.getItem(getStorageKey('chatSettings')),
            localforage.getItem(getStorageKey('chatMessages')),
            localforage.getItem(getStorageKey('backgroundGallery')),
            localforage.getItem(getStorageKey('customReplies')),
            localforage.getItem(getStorageKey('customPokes')),
            localforage.getItem(getStorageKey('customStatuses')),
            localforage.getItem(getStorageKey('customMottos')),
            localforage.getItem(getStorageKey('customIntros')),
            localforage.getItem(getStorageKey('anniversaries')),
            localforage.getItem(getStorageKey('stickerLibrary')),
            localforage.getItem(`${APP_PREFIX}customThemes`),
            localforage.getItem(getStorageKey('chatBackground')),
            localforage.getItem(getStorageKey('partnerAvatar')),
            localforage.getItem(getStorageKey('myAvatar')),
            localforage.getItem(getStorageKey('partnerPersonas')), 
            localforage.getItem(getStorageKey('showPartnerNameInChat')),
            localforage.getItem(`${APP_PREFIX}themeSchemes`),
            localforage.getItem(getStorageKey('myStickerLibrary')),
            localforage.getItem(getStorageKey('customReplyGroups'))
        ]);
        const getVal = (index) => results[index].status === 'fulfilled' ? results[index].value : null;

        const savedSettings = getVal(0);
        const savedMessages = getVal(1);
        const savedBgGallery = getVal(2);
        const savedCustomReplies = getVal(3);
        const savedPokes = getVal(4);
        const savedStatuses = getVal(5);
        const savedMottos = getVal(6);
        const savedIntros = getVal(7);
        const savedAnniversaries = getVal(8);
        const savedStickers = getVal(9);
        const savedCustomThemes = getVal(10);
        const savedChatBg = getVal(11);
        const partnerAvatarSrc = getVal(12);
        const myAvatarSrc = getVal(13);
        const savedPartnerPersonas = getVal(14);
        const savedShowNameConfig = getVal(15);
        const savedThemeSchemes = getVal(16);
        const savedMyStickers = getVal(17);
        const savedReplyGroups = getVal(18);

        if (savedPartnerPersonas) partnerPersonas = savedPartnerPersonas;

        if (savedSettings) Object.assign(settings, savedSettings);
        if (!settings.messageFontFamily || settings.messageFontFamily.includes('system-ui')) {
            settings.messageFontFamily = "'Noto Serif SC', serif";
        }

        if (settings.showPartnerNameInChat !== undefined) {
            showPartnerNameInChat = settings.showPartnerNameInChat;
        } else if (savedShowNameConfig !== null) {
            showPartnerNameInChat = savedShowNameConfig;
        }
        document.body.classList.toggle('show-partner-name', showPartnerNameInChat);
        try {
            applyCustomFont(settings.customFontUrl || "");
            if (settings.customBubbleCss) applyCustomBubbleCss(settings.customBubbleCss);
            if (settings.customGlobalCss) applyGlobalThemeCss(settings.customGlobalCss);
        } catch(e) { console.warn("样式应用失败", e); }
        
        if (savedPokes) customPokes = savedPokes;
        else customPokes = [...CONSTANTS.POKE_ACTIONS];

        if (savedStatuses) customStatuses = savedStatuses;
        else customStatuses = [...CONSTANTS.PARTNER_STATUSES];

        if (savedMottos) customMottos = savedMottos;
        else customMottos = [...CONSTANTS.HEADER_MOTTOS];
        
        if (savedIntros) customIntros = savedIntros;
        else customIntros = CONSTANTS.WELCOME_ANIMATIONS.map(a => `${a.line1}|${a.line2}`);

        if (savedMessages && Array.isArray(savedMessages)) {
            messages = savedMessages.map(m => ({
                ...m, timestamp: new Date(m.timestamp)
            }));
        } else {
            const backup = _tryRecoverFromBackup();
            if (backup && Array.isArray(backup.messages) && backup.messages.length > 0) {
                const timeSince = Math.round((Date.now() - backup.ts) / 60000);
                console.warn(`[loadData] 主存储无消息，正在从备份恢复（备份时间：${timeSince} 分钟前）`);
                messages = backup.messages.map(m => ({
                    ...m, timestamp: new Date(m.timestamp)
                }));
                if (backup.settings) Object.assign(settings, backup.settings);
                if (backup.anniversaries && Array.isArray(backup.anniversaries)) {
                    anniversaries = backup.anniversaries;
                }
                setTimeout(() => saveData(), 1000);
                showNotification(
                    `已从备份恢复 ${messages.length} 条消息${backup._truncated ? '（备份为最近200条）' : ''}`,
                    'warning', 6000
                );
            } else {
                messages = [];
            }
        }

        if (savedBgGallery) {
            savedBackgrounds = savedBgGallery;
        } else {
            savedBackgrounds = [{ id: 'preset-1', type: 'color', value: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }];
        }

        if (savedCustomReplies) customReplies = savedCustomReplies;
        if (savedReplyGroups) window.customReplyGroups = savedReplyGroups;
        if (savedAnniversaries) anniversaries = savedAnniversaries;
        if (savedStickers) stickerLibrary = savedStickers;
        if (savedMyStickers) myStickerLibrary = savedMyStickers;
        if (savedCustomThemes) customThemes = savedCustomThemes;
        if (savedThemeSchemes) themeSchemes = savedThemeSchemes;
        try { const ce = await localforage.getItem(getStorageKey('customEmojis')); if (ce && Array.isArray(ce)) customEmojis = ce; } catch(e) {}
        window._customReplies = customReplies;
        window._CONSTANTS = CONSTANTS;

        if (DOMElements && DOMElements.partner && DOMElements.me) {
            updateAvatar(DOMElements.partner.avatar, partnerAvatarSrc);
            updateAvatar(DOMElements.me.avatar, myAvatarSrc);
        }

        if (savedChatBg) {
            applyBackground(savedChatBg);
        } else {
            const lsBg = safeGetItem(getStorageKey('chatBackground'));
            if (lsBg) {
                applyBackground(lsBg);
                localforage.setItem(getStorageKey('chatBackground'), lsBg);
            }
        }

        try { await initMoodData(); } catch(e) { console.warn("心情数据加载失败", e); }
        try { await loadEnvelopeData(); } catch(e) { console.warn("信封数据加载失败", e); }
        
        displayedMessageCount = HISTORY_BATCH_SIZE;
        
        setTimeout(() => {
            applyAllAvatarFrames();
            manageAutoSendTimer(); 
            checkEnvelopeStatus(); 
            updateUI();
            if (settings.customBubbleCss) {
                try { applyCustomBubbleCss(settings.customBubbleCss); } catch(e) {}
            }
        }, 100);

    } catch (e) {
        console.error("LoadData 内部致命错误:", e);
        settings = getDefaultSettings();
        messages = [];
        updateUI();
    }
};

const LIBRARY_CONFIG = {
    reply: {
        title: "回复库管理",
        tabs: [
            { id: 'custom', name: '主字卡', mode: 'list' },
            { id: 'emojis', name: 'Emoji', mode: 'grid' },
            { id: 'stickers', name: '表情库', mode: 'grid' }
        ]
    },
    atmosphere: {
        title: "氛围感配置",
        tabs: [
            { id: 'pokes', name: '拍一拍', mode: 'list' },
            { id: 'statuses', name: '对方状态', mode: 'list' },
            { id: 'mottos', name: '顶部格言', mode: 'list' },
            { id: 'intros', name: '开场动画', mode: 'list' }
        ]
    }
};
let currentAnnType = 'anniversary'; 

window.openMyStickerSettings = function() {
    const picker = document.getElementById('user-sticker-picker');
    if (picker) picker.classList.remove('active');
    if (typeof currentMajorTab !== 'undefined') {
        currentMajorTab = 'reply';
        currentSubTab = 'stickers';
    }
    var sidebarBtns = document.querySelectorAll('.sidebar-btn');
    sidebarBtns.forEach(function(b) { b.classList.toggle('active', b.dataset.major === 'reply'); });
    if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
    var modal = document.getElementById('custom-replies-modal');
    if (modal && typeof showModal === 'function') showModal(modal);
};

window.switchAnnType = function(type) {
    currentAnnType = type;
    currentAnniversaryType = type; 
    document.querySelectorAll('.ann-type-btn').forEach(btn => {
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const desc = document.getElementById('ann-type-desc');
    if(desc) {
        desc.textContent = type === 'anniversary' 
            ? '计算从过去某一天到现在已经过了多少天 (例如: 相识、恋爱)' 
            : '计算从现在到未来某一天还剩下多少天 (例如: 生日、跨年)';
    }
};

window.deleteAnniversaryItem = function(id) {
    if(confirm("确定要删除这条记录吗？")) {
        anniversaries = anniversaries.filter(a => a.id !== id);
        throttledSaveData(); 
        renderAnniversariesList();
        showNotification('已删除', 'success');
        if (typeof playSound === 'function') playSound('anniversary');
    }
};

const _BACKUP_PREFIX = 'BACKUP_V1_';
function _backupCriticalData() {
    if (window._skipBackup) return;
    try {
        const backupPayload = {
            ts: Date.now(),
            messages: messages,
            settings: settings,
            sessionId: SESSION_ID,
            anniversaries: anniversaries
        };

        let payloadToStore = backupPayload;
        const msgSizeEstimate = messages.length * 500; 
        if (msgSizeEstimate > 3 * 1024 * 1024) {
            payloadToStore = {
                ...backupPayload,
                messages: messages.slice(-200),
                _truncated: true
            };
        }

        const json = JSON.stringify(payloadToStore);

        if (json.length > 4.5 * 1024 * 1024) {
            const smallerPayload = {
                ...payloadToStore,
                messages: messages.slice(-50),
                _truncated: true
            };
            const smallerJson = JSON.stringify(smallerPayload);
            localStorage.setItem(_BACKUP_PREFIX + 'critical', smallerJson);
        } else {
            localStorage.setItem(_BACKUP_PREFIX + 'critical', json);
        }
        localStorage.setItem(_BACKUP_PREFIX + 'timestamp', String(Date.now()));
    } catch (e) {
        console.warn('localStorage 备份写入失败（可能存储已满）:', e);
    }
}

function _tryRecoverFromBackup() {
    try {
        const raw = localStorage.getItem(_BACKUP_PREFIX + 'critical');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

const saveData = async () => {
    if (!SESSION_ID) {
        console.warn('[saveData] SESSION_ID 尚未初始化，跳过保存以防数据写入临时 key');
        return;
    }

    const promises = [
        { key: 'chatSettings',           val: () => localforage.setItem(getStorageKey('chatSettings'), settings) },
        { key: 'customReplies',          val: () => localforage.setItem(getStorageKey('customReplies'), customReplies) },
        { key: 'customReplyGroups',      val: () => localforage.setItem(getStorageKey('customReplyGroups'), window.customReplyGroups || []) },
        { key: 'customEmojis',           val: () => localforage.setItem(getStorageKey('customEmojis'), customEmojis) },
        { key: 'anniversaries',          val: () => localforage.setItem(getStorageKey('anniversaries'), anniversaries) },
        { key: 'customPokes',            val: () => localforage.setItem(getStorageKey('customPokes'), customPokes) },
        { key: 'customStatuses',         val: () => localforage.setItem(getStorageKey('customStatuses'), customStatuses) },
        { key: 'customMottos',           val: () => localforage.setItem(getStorageKey('customMottos'), customMottos) },
        { key: 'customIntros',           val: () => localforage.setItem(getStorageKey('customIntros'), customIntros) },
        { key: 'stickerLibrary',         val: () => localforage.setItem(getStorageKey('stickerLibrary'), stickerLibrary) },
        { key: 'myStickerLibrary',       val: () => localforage.setItem(getStorageKey('myStickerLibrary'), myStickerLibrary) },
        { key: 'customThemes',           val: () => localforage.setItem(`${APP_PREFIX}customThemes`, customThemes) },
        { key: 'themeSchemes',           val: () => localforage.setItem(`${APP_PREFIX}themeSchemes`, themeSchemes) },
        { key: 'chatMessages',           val: () => localforage.setItem(getStorageKey('chatMessages'), messages) },
    ];

    const partnerAvatarSrc = (() => {
        try {
            const img = DOMElements.partner.avatar.querySelector('img');
            return img ? img.src : null;
        } catch(e) { return null; }
    })();
    const myAvatarSrc = (() => {
        try {
            const img = DOMElements.me.avatar.querySelector('img');
            return img ? img.src : null;
        } catch(e) { return null; }
    })();

    if (partnerAvatarSrc) {
        promises.push({ key: 'partnerAvatar', val: () => localforage.setItem(getStorageKey('partnerAvatar'), partnerAvatarSrc) });
    } else {
        promises.push({ key: 'partnerAvatar', val: () => localforage.removeItem(getStorageKey('partnerAvatar')) });
    }

    if (myAvatarSrc) {
        promises.push({ key: 'myAvatar', val: () => localforage.setItem(getStorageKey('myAvatar'), myAvatarSrc) });
    } else {
        promises.push({ key: 'myAvatar', val: () => localforage.removeItem(getStorageKey('myAvatar')) });
    }

    const results = await Promise.allSettled(promises.map(p => {
        try { return p.val(); }
        catch(e) { return Promise.reject(e); }
    }));

    const failed = [];
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            failed.push(promises[i].key);
            console.error(`[saveData] 保存失败: ${promises[i].key}`, r.reason);
        }
    });

    if (failed.length > 0) {
        console.warn(`[saveData] ${failed.length} 项写入失败，已触发 localStorage 降级备份`, failed);
    }

    _backupCriticalData();
};

function initializeRandomUI() {
    document.querySelector('.header-motto').textContent = getRandomItem(CONSTANTS.HEADER_MOTTOS);
    if (customMottos && customMottos.length > 0) {
        document.querySelector('.header-motto').textContent = getRandomItem(customMottos);
    } else {
        document.querySelector('.header-motto').textContent = '';
    }
    const placeholder = "";
    DOMElements.messageInput.placeholder = placeholder.length > 20 ? placeholder.substring(0, 20) + "...": placeholder;

    const starsContainer = document.getElementById('stars-container');
    starsContainer.innerHTML = '';
    const starCount = 80;
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = Math.random() * 2.5 + 0.5;
        const duration = Math.random() * 4 + 2;
        const delay = Math.random() * 6;
        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.setProperty('--duration', `${duration}s`);
        star.style.animationDelay = `${delay}s`;
        starsContainer.appendChild(star);
    }
    const particlesContainer = document.getElementById('welcome-particles');
    if (particlesContainer) {
        particlesContainer.innerHTML = '';
        const types = ['petal', 'petal', 'petal', 'sparkle', 'sparkle'];
        for (let i = 0; i < 22; i++) {
            const p = document.createElement('div');
            const type = types[i % types.length];
            p.className = `wp ${type}`;
            const sz = type === 'petal' ? (Math.random() * 6 + 5) : (Math.random() * 4 + 2);
            p.style.setProperty('--pSz', sz + 'px');
            p.style.left = (Math.random() * 100) + '%';
            p.style.setProperty('--pDur', (Math.random() * 10 + 9) + 's');
            p.style.setProperty('--pDel', (Math.random() * 8) + 's');
            p.style.setProperty('--pX1', (Math.random() * 50 - 25) + 'px');
            p.style.setProperty('--pX2', (Math.random() * 80 - 40) + 'px');
            p.style.setProperty('--pX3', (Math.random() * 50 - 25) + 'px');
            particlesContainer.appendChild(p);
        }
    }

    const meteorsContainer = document.getElementById('welcome-meteors');
    if (meteorsContainer) {
        meteorsContainer.innerHTML = '';
        let meteorCount = 0;
        const MAX_METEORS = 12;
        const createMeteor = () => {
            if (meteorCount >= MAX_METEORS) return;
            meteorCount++;
            const m = document.createElement('div');
            m.className = 'meteor';
            m.style.left = (Math.random() * 100) + '%';
            m.style.top = (Math.random() * 35) + '%';
            const dur = (Math.random() * 0.8 + 0.7);
            m.style.setProperty('--mDur', dur + 's');
            m.style.setProperty('--mDel', '0s');
            m.style.setProperty('--mRot', (25 + Math.random() * 20) + 'deg');
            meteorsContainer.appendChild(m);
            setTimeout(() => { m.remove(); meteorCount = Math.max(0, meteorCount - 1); }, (dur + 0.1) * 1000);
        };
        for (let i = 0; i < 8; i++) setTimeout(createMeteor, i * 350);
        const meteorTimer = setInterval(createMeteor, 600);
        setTimeout(() => clearInterval(meteorTimer), 5000);
    }

    const loaderBarEl = document.getElementById('loader-tech-bar');
    if (loaderBarEl) {
        setTimeout(() => loaderBarEl.classList.add('pulsing'), 300);
    }

    const welcomeIcon = getRandomItem(CONSTANTS.WELCOME_ICONS);
    document.querySelector('.logo-icon-main').innerHTML = `<i class="${welcomeIcon}"></i>`;

    if (customIntros && customIntros.length > 0) {
        const rawIntro = getRandomItem(customIntros);
        const parts = rawIntro.split('|');
        const line1 = parts[0];
        const line2 = parts[1] || ""; 

        const titleEl = document.getElementById('welcome-title-glitch');
        const subEl = document.getElementById('welcome-subtitle-scramble');

        titleEl.classList.remove('playing');
        titleEl.textContent = line1;
        void titleEl.offsetWidth;
        titleEl.classList.add('playing');

        const scrambleText = (element, finalText, duration = 1500) => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
            const length = finalText.length;
            let start = Date.now();

            const interval = setInterval(() => {
                const now = Date.now();
                const progress = (now - start) / duration;

                if (progress >= 1) {
                    element.textContent = finalText;
                    clearInterval(interval);
                    return;
                }

                let result = '';
                const revealIndex = Math.floor(progress * length);

                for (let i = 0; i < length; i++) {
                    if (i <= revealIndex) {
                        result += finalText[i];
                    } else {
                        result += chars[Math.floor(Math.random() * chars.length)];
                    }
                }
                element.textContent = result;
            }, 40);
        };

        setTimeout(() => {
            scrambleText(subEl, line2, 2000);
        }, 600);
    } else {
        document.getElementById('welcome-title-glitch').textContent = "传讯";
        document.getElementById('welcome-subtitle-scramble').textContent = "请在设置中添加开场动画";
    }

    const loaderBar = document.getElementById('loader-tech-bar');
    const statusText = document.getElementById('loader-status-text');
    loaderBar.style.width = '0%';
    const loadingPhases = [
        { width: '15%', text: 'INITIALIZING · 初始化中' },
        { width: '40%', text: 'LOADING MEMORIES · 读取记忆' },
        { width: '70%', text: 'BUILDING WORLD · 构建世界' },
        { width: '90%', text: 'ALMOST THERE · 即将完成' },
        { width: '100%', text: 'CONNECTED · 连接成功' }
    ];
    const delays = [100, 700, 1600, 2400, 2900];
    delays.forEach((delay, i) => {
        setTimeout(() => {
            loaderBar.style.width = loadingPhases[i].width;
            if (statusText) statusText.textContent = loadingPhases[i].text;
        }, delay);
    });
}

function manageAutoSendTimer() {
    if (autoSendTimer) {
        clearInterval(autoSendTimer);
        autoSendTimer = null;
    }
    if (settings.autoSendEnabled) {
        const intervalMs = settings.autoSendInterval * 60 * 1000;
        
        autoSendTimer = setInterval(() => {
            if (!document.body.classList.contains('batch-favorite-mode')) {
                simulateReply(); 
            }
        }, intervalMs);
    }
}

const updateUI = () => {
    const isCustomTheme = settings.colorTheme.startsWith('custom-');
    if (isCustomTheme) {
        const themeId = settings.colorTheme;
        const theme = customThemes.find(t => t.id === themeId);
        if (theme) {
            applyTheme(theme.colors);
        } else {
            DOMElements.html.setAttribute('data-color-theme', 'gold');
       
