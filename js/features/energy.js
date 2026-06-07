(function () {
    'use strict';

    const DEFAULT_PARTNER_TAGS = ['临在', '空', '睡眠（深度整合）', '外出忙碌', '频率精调中', '稳定共振', '低频修复中', '高维游历'];

    let energyData = {
        myStatus: { text: '', ts: 0 },
        partnerStatus: { text: '', ts: 0 },
        ourStatus: { text: '', ts: 0 },
        partnerTags: [...DEFAULT_PARTNER_TAGS],
        pendingProposal: null,   // { id, content, options, from, ts }
        summaries: [],           // [{ id, text, ts, reply, replyTs }]
        timeline: [],            // [{ id, type, text, ts }]
        hasUnread: false
    };

    async function loadEnergy() {
        const saved = await localforage.getItem(getStorageKey('energyData'));
        if (saved) energyData = Object.assign({ partnerTags: [...DEFAULT_PARTNER_TAGS], summaries: [], timeline: [], hasUnread: false }, saved);
    }

    function saveEnergy() { localforage.setItem(getStorageKey('energyData'), energyData); }

    function fmtTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now - d;
        if (diffMs < 60000) return '刚刚';
        if (diffMs < 3600000) return Math.floor(diffMs / 60000) + '分钟前';
        if (diffMs < 86400000) return Math.floor(diffMs / 3600000) + '小时前';
        return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    function pushTimeline(type, text) {
        energyData.timeline.unshift({ id: 'tl_' + Date.now(), type, text, ts: Date.now() });
        if (energyData.timeline.length > 200) energyData.timeline = energyData.timeline.slice(0, 200);
    }

    function updateBadge() {
        const badge = document.getElementById('energy-badge');
        if (badge) badge.style.display = energyData.hasUnread ? 'inline-block' : 'none';
    }

    function renderEnergyModal() {
        const myEl = document.getElementById('my-energy-display');
        const myTime = document.getElementById('my-energy-time');
        const ptEl = document.getElementById('partner-energy-display');
        const ptTime = document.getElementById('partner-energy-time');
        const ourEl = document.getElementById('our-energy-display');
        const ourTime = document.getElementById('our-energy-time');
        const pendingNotice = document.getElementById('pending-proposal-notice');
        const summaryBox = document.getElementById('recent-summary-box');

        if (myEl) myEl.textContent = energyData.myStatus.text || '（未设置）';
        if (myTime) myTime.textContent = energyData.myStatus.ts ? fmtTime(energyData.myStatus.ts) + '更新' : '';
        if (ptEl) ptEl.textContent = energyData.partnerStatus.text || '（未设置）';
        if (ptTime) ptTime.textContent = energyData.partnerStatus.ts ? fmtTime(energyData.partnerStatus.ts) + '更新' : '';
        if (ourEl) ourEl.textContent = energyData.ourStatus.text || '（未设置）';
        if (ourTime) ourTime.textContent = energyData.ourStatus.ts ? fmtTime(energyData.ourStatus.ts) + '更新' : '';

        // 只有他发起的提议，我才能回应
        const canRespond = energyData.pendingProposal && energyData.pendingProposal.from === 'partner';
        const isWaiting = energyData.pendingProposal && energyData.pendingProposal.from === 'me';
        if (pendingNotice) {
            if (canRespond) {
                pendingNotice.style.display = 'block';
                pendingNotice.innerHTML = `他发起了提议「${energyData.pendingProposal.content}」· <button id="respond-proposal-btn" style="background:none;border:none;color:var(--accent-color);font-size:12px;cursor:pointer;text-decoration:underline;">回应</button>`;
                document.getElementById('respond-proposal-btn')?.addEventListener('click', openRespondModal);
            } else if (isWaiting) {
                pendingNotice.style.display = 'block';
                pendingNotice.innerHTML = `等待他回应提议「${energyData.pendingProposal.content}」`;
            } else {
                pendingNotice.style.display = 'none';
            }
        }

        const recentSummary = energyData.summaries[0];
        if (summaryBox) {
            if (recentSummary) {
                summaryBox.style.display = 'block';
                const textEl = document.getElementById('recent-summary-text');
                const replyEl = document.getElementById('recent-summary-reply');
                if (textEl) textEl.textContent = `"${recentSummary.text}"`;
                if (replyEl) replyEl.textContent = recentSummary.reply ? `对方回复："${recentSummary.reply}"` : '';
            } else {
                summaryBox.style.display = 'none';
            }
        }
    }

    function renderTimeline() {
        const list = document.getElementById('energy-timeline-list');
        if (!list) return;
        if (!energyData.timeline.length) {
            list.innerHTML = '<div style="text-align:center;padding:32px 0;color:var(--text-secondary);font-size:13px;">暂无记录</div>';
            return;
        }
        // 按日期分组
        const groups = {};
        energyData.timeline.forEach(item => {
            const dateKey = new Date(item.ts).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(item);
        });
        list.innerHTML = Object.entries(groups).map(([date, items]) => {
            const rows = items.map(item => {
                const icon = item.type === 'my' ? '👤' : item.type === 'partner' ? '💫' : item.type === 'our' ? '✨' : item.type === 'proposal' ? '📨' : item.type === 'summary' ? '📝' : '💬';
                const time = new Date(item.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                return `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(var(--border-color-rgb),0.5);">
                    <div style="font-size:16px;flex-shrink:0;">${icon}</div>
                    <div style="flex:1;">
                        <div style="font-size:13px;color:var(--text-primary);">${item.text}</div>
                        <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">${time}</div>
                    </div>
                </div>`;
            }).join('');
            return `<div style="margin-bottom:12px;">
                <div style="font-size:11px;font-weight:700;color:var(--text-secondary);padding:6px 0;letter-spacing:0.5px;">${date}</div>
                ${rows}
            </div>`;
        }).join('');
    }

    function renderProposeOptions() {
        const list = document.getElementById('propose-options-list');
        if (!list) return;
        const options = window._proposeOptions || [];
        list.innerHTML = options.map((opt, i) => `
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="flex:1;font-size:13px;padding:6px 10px;background:var(--primary-bg);border-radius:8px;">${opt}</span>
                <button onclick="window._removeProposeOption(${i})" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;">✕</button>
            </div>`).join('');
    }

    function renderRespondOptions() {
        const btns = document.getElementById('proposal-options-btns');
        if (!btns || !energyData.pendingProposal) return;
        const options = energyData.pendingProposal.options && energyData.pendingProposal.options.length
            ? energyData.pendingProposal.options
            : ['同意', '不同意', '其他'];
        btns.innerHTML = options.map(opt => `
            <button onclick="window._respondWith('${opt}')" style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border-color);background:var(--primary-bg);color:var(--text-primary);font-size:14px;cursor:pointer;">${opt}</button>
        `).join('');
    }

    function openRespondModal() {
        const display = document.getElementById('proposal-content-display');
        if (display && energyData.pendingProposal) display.textContent = energyData.pendingProposal.content;
        const otherInp = document.getElementById('other-response-input');
        const optBtns = document.getElementById('proposal-options-btns');
        if (otherInp) otherInp.style.display = 'none';
        if (optBtns) { optBtns.style.display = 'flex'; optBtns.style.flexDirection = 'column'; }
        renderRespondOptions();
        showModal(document.getElementById('respond-proposal-modal'));
    }

    window._respondWith = function (option) {
        const proposal = energyData.pendingProposal;
        if (!proposal) return;
        if (option === '其他') {
            document.getElementById('other-response-input').style.display = 'block';
            document.getElementById('proposal-options-btns').style.display = 'none';
            return;
        }
        applyResponse(option, proposal);
    };

    function applyResponse(responseText, proposal) {
        if (responseText === '同意') {
            energyData.ourStatus = { text: proposal.content, ts: Date.now() };
            pushTimeline('our', `我们的状态更新为「${proposal.content}」（提议通过）`);
        } else {
            energyData.hasUnread = false;
            pushTimeline('proposal', `提议「${proposal.content}」回应：${responseText}`);
            if (responseText !== '不同意') {
                energyData.ourStatus = { text: responseText, ts: Date.now() };
                pushTimeline('our', `我们的状态更新为「${responseText}」`);
                energyData.hasUnread = true;
            }
        }
        energyData.pendingProposal = null;
        saveEnergy();
        updateBadge();
        renderEnergyModal();
        hideModal(document.getElementById('respond-proposal-modal'));
        if (typeof showNotification === 'function') showNotification('已回应', 'success');
    }

    window._removeProposeOption = function (i) {
        window._proposeOptions.splice(i, 1);
        renderProposeOptions();
    };

    function init() {
        loadEnergy().then(() => { updateBadge(); });

        // 打开能量状态时渲染
        const energySettingsEl = document.getElementById('energy-settings');
        if (energySettingsEl) energySettingsEl.addEventListener('click', () => {
            energyData.hasUnread = false;
            saveEnergy();
            updateBadge();
            renderEnergyModal();
        });

        // 关闭
        const closeMood = document.getElementById('close-mood');
        if (closeMood) closeMood.addEventListener('click', () => hideModal(document.getElementById('mood-modal')));

        // 编辑我的状态
        const editMyBtn = document.getElementById('edit-my-energy-btn');
        if (editMyBtn) editMyBtn.addEventListener('click', () => {
            const inp = document.getElementById('my-energy-input');
            if (inp) inp.value = energyData.myStatus.text || '';
            showModal(document.getElementById('edit-my-energy-modal'));
        });
        document.getElementById('cancel-my-energy')?.addEventListener('click', () => hideModal(document.getElementById('edit-my-energy-modal')));
        document.getElementById('save-my-energy')?.addEventListener('click', () => {
            const inp = document.getElementById('my-energy-input');
            const text = inp ? inp.value.trim() : '';
            if (!text) return;
            energyData.myStatus = { text, ts: Date.now() };
            pushTimeline('my', `我的状态：${text}`);
            saveEnergy();
            renderEnergyModal();
            hideModal(document.getElementById('edit-my-energy-modal'));
        });

        // 他的状态随机更新
        document.getElementById('refresh-partner-energy-btn')?.addEventListener('click', () => {
            const pool = energyData.partnerTags.length ? energyData.partnerTags : DEFAULT_PARTNER_TAGS;
            const text = pool[Math.floor(Math.random() * pool.length)];
            energyData.partnerStatus = { text, ts: Date.now() };
            pushTimeline('partner', `他的状态：${text}`);
            saveEnergy();
            renderEnergyModal();
        });

        // 我发起提议
        window._proposeOptions = [];
        document.getElementById('propose-energy-btn')?.addEventListener('click', () => {
            window._proposeOptions = [];
            const inp = document.getElementById('propose-content-input');
            if (inp) inp.value = '';
            renderProposeOptions();
            showModal(document.getElementById('propose-energy-modal'));
        });
        document.getElementById('cancel-propose')?.addEventListener('click', () => hideModal(document.getElementById('propose-energy-modal')));
        document.getElementById('add-propose-option-btn')?.addEventListener('click', () => {
            const inp = document.getElementById('new-propose-option');
            const val = inp ? inp.value.trim() : '';
            if (!val) return;
            window._proposeOptions.push(val);
            inp.value = '';
            renderProposeOptions();
        });
        document.getElementById('send-propose-btn')?.addEventListener('click', () => {
            const inp = document.getElementById('propose-content-input');
            const content = inp ? inp.value.trim() : '';
            if (!content) { if (typeof showNotification === 'function') showNotification('请输入提议内容', 'warning'); return; }
            energyData.pendingProposal = { id: 'prop_' + Date.now(), content, options: [...(window._proposeOptions || [])], from: 'me', ts: Date.now() };
            pushTimeline('proposal', `我发起提议：将状态改为「${content}」`);
            saveEnergy();
            renderEnergyModal();
            hideModal(document.getElementById('propose-energy-modal'));
            if (typeof showNotification === 'function') showNotification('提议已发出', 'success');
        });

        // 他发起提议
        document.getElementById('partner-propose-btn')?.addEventListener('click', () => {
            const inp = document.getElementById('partner-propose-input');
            if (inp) inp.value = '';
            showModal(document.getElementById('partner-propose-modal'));
        });
        document.getElementById('cancel-partner-propose')?.addEventListener('click', () => hideModal(document.getElementById('partner-propose-modal')));
        document.getElementById('send-partner-propose-btn')?.addEventListener('click', () => {
            const inp = document.getElementById('partner-propose-input');
            const content = inp ? inp.value.trim() : '';
            if (!content) return;
            energyData.pendingProposal = { id: 'prop_' + Date.now(), content, options: ['同意', '不同意', '其他'], from: 'partner', ts: Date.now() };
            pushTimeline('proposal', `他发起提议：将状态改为「${content}」`);
            saveEnergy();
            renderEnergyModal();
            hideModal(document.getElementById('partner-propose-modal'));
        });

        // respond-proposal-btn 由 renderEnergyModal 动态绑定
        document.getElementById('cancel-respond')?.addEventListener('click', () => hideModal(document.getElementById('respond-proposal-modal')));
        document.getElementById('cancel-other-response')?.addEventListener('click', () => {
            document.getElementById('other-response-input').style.display = 'none';
            document.getElementById('proposal-options-btns').style.display = 'flex';
        });
        document.getElementById('confirm-other-response')?.addEventListener('click', () => {
            const inp = document.getElementById('other-response-text');
            const text = inp ? inp.value.trim() : '';
            if (!text) return;
            applyResponse(text, energyData.pendingProposal);
        });

        // 写总结
        document.getElementById('write-summary-btn')?.addEventListener('click', () => {
            const inp = document.getElementById('summary-input');
            if (inp) inp.value = '';
            showModal(document.getElementById('write-summary-modal'));
        });
        document.getElementById('cancel-summary')?.addEventListener('click', () => hideModal(document.getElementById('write-summary-modal')));
        document.getElementById('save-summary-btn')?.addEventListener('click', () => {
            const inp = document.getElementById('summary-input');
            const text = inp ? inp.value.trim() : '';
            if (!text) return;
            const summary = { id: 'sum_' + Date.now(), text, ts: Date.now(), reply: '', replyTs: 0 };
            energyData.summaries.unshift(summary);
            pushTimeline('summary', `总结：${text}`);
            saveEnergy();
            renderEnergyModal();
            hideModal(document.getElementById('write-summary-modal'));
            if (typeof showNotification === 'function') showNotification('总结已保存', 'success');
        });

        // 时间轴
        document.getElementById('view-timeline-btn')?.addEventListener('click', () => {
            renderTimeline();
            showModal(document.getElementById('energy-timeline-modal'));
        });
        document.getElementById('close-timeline')?.addEventListener('click', () => hideModal(document.getElementById('energy-timeline-modal')));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
