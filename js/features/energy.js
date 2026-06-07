(function () {
    'use strict';

    const DEFAULT_PARTNER_TAGS = ['临在', '空', '睡眠（深度整合）', '外出忙碌', '频率精调中', '稳定共振', '低频修复中', '高维游历'];

    let energyData = {
        myStatus: { text: '', ts: 0 },
        partnerStatus: { text: '', ts: 0 },
        ourStatus: { text: '', ts: 0 },
        partnerTags: [...DEFAULT_PARTNER_TAGS],
        pendingProposal: null,
        summaries: [],
        timeline: [],
        myHistory: [],
        partnerHistory: [],
        hasUnread: false,
        lastPartnerStatusChange: 0,
        nextPartnerStatusChangeHours: 0
    };

    let currentEnergyTab = 'my';

    const ENERGY_KEY = (window.APP_PREFIX || 'CHAT_APP_V3_') + 'energyData';

    async function loadEnergy() {
        const saved = await localforage.getItem(ENERGY_KEY);
        if (saved) energyData = Object.assign({
            partnerTags: [...DEFAULT_PARTNER_TAGS],
            summaries: [], timeline: [],
            myHistory: [], partnerHistory: [],
            hasUnread: false,
            lastPartnerStatusChange: 0,
            nextPartnerStatusChangeHours: 0
        }, saved);
    }

    function saveEnergy() { localforage.setItem(ENERGY_KEY, energyData); }

    function fmtTime(ts) {
        if (!ts) return '';
        const d = new Date(ts), now = new Date(), diff = now - d;
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
        return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' +
               d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    function pushTimeline(type, text) {
        energyData.timeline.unshift({ id: 'tl_' + Date.now(), type, text, ts: Date.now() });
        if (energyData.timeline.length > 200) energyData.timeline = energyData.timeline.slice(0, 200);
    }

    function updateBadge() {
        const badge = document.getElementById('energy-badge');
        if (badge) badge.style.display = energyData.hasUnread ? 'inline-block' : 'none';
    }

    function switchEnergyTab(tab) {
        currentEnergyTab = tab;
        document.querySelectorAll('.energy-tab-btn').forEach(btn => {
            const active = btn.dataset.energyTab === tab;
            btn.style.background = active ? 'var(--accent-color)' : 'transparent';
            btn.style.color = active ? '#fff' : 'var(--text-secondary)';
        });
        document.querySelectorAll('.energy-tab-panel').forEach(p => { p.style.display = 'none'; });
        const panel = document.getElementById('energy-tab-' + tab);
        if (panel) panel.style.display = 'block';
        renderCurrentTab();
    }

    function renderCurrentTab() {
        if (currentEnergyTab === 'my') renderMyTab();
        else if (currentEnergyTab === 'partner') renderPartnerTab();
        else if (currentEnergyTab === 'our') renderOurTab();
    }

    function historyHTML(hist) {
        if (!hist || !hist.length) return '<div style="text-align:center;padding:16px 0;color:var(--text-secondary);font-size:12px;">暂无记录</div>';
        return hist.map(h => `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(var(--border-color-rgb),0.4);">
            <span style="font-size:13px;color:var(--text-primary);">${h.text}</span>
            <span style="font-size:11px;color:var(--text-secondary);flex-shrink:0;margin-left:8px;">${fmtTime(h.ts)}</span>
        </div>`).join('');
    }

    function renderMyTab() {
        const el = document.getElementById('my-energy-display');
        const tm = document.getElementById('my-energy-time');
        if (el) el.textContent = energyData.myStatus.text || '（未设置）';
        if (tm) tm.textContent = energyData.myStatus.ts ? fmtTime(energyData.myStatus.ts) + '更新' : '';
        const list = document.getElementById('my-energy-history-list');
        if (list) list.innerHTML = historyHTML(energyData.myHistory);
    }

    function renderPartnerTab() {
        const el = document.getElementById('partner-energy-display');
        const tm = document.getElementById('partner-energy-time');
        if (el) el.textContent = energyData.partnerStatus.text || '（未设置）';
        if (tm) tm.textContent = energyData.partnerStatus.ts ? fmtTime(energyData.partnerStatus.ts) + '更新' : '';
        renderPartnerTagsList();
        const list = document.getElementById('partner-energy-history-list');
        if (list) list.innerHTML = historyHTML(energyData.partnerHistory);
    }

    function renderPartnerTagsList() {
        const list = document.getElementById('partner-tags-inline-list');
        if (!list) return;
        const tags = energyData.partnerTags;
        if (!tags.length) { list.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);text-align:center;padding:8px 0;">暂无标签</div>'; return; }
        list.innerHTML = tags.map((tag, i) => `
            <div style="display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid rgba(var(--border-color-rgb),0.3);">
                <span style="flex:1;font-size:13px;color:var(--text-primary);">${tag}</span>
                <button onclick="window._removePartnerTag(${i})" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:13px;padding:2px 4px;">✕</button>
            </div>`).join('');
    }

    function checkProposalAutoResolve() {
        const p = energyData.pendingProposal;
        if (!p || p.from !== 'me' || !p.resolveAt || Date.now() < p.resolveAt) return;
        const opts = p.options && p.options.length ? p.options : ['同意', '期待', '不同意'];
        const picked = opts[Math.floor(Math.random() * opts.length)];
        energyData.ourStatus = { text: picked === '同意' ? p.content : (picked !== '不同意' ? picked : energyData.ourStatus.text), ts: Date.now() };
        if (picked !== '不同意') pushTimeline('our', `我们的状态更新为「${energyData.ourStatus.text}」（提议回应：${picked}）`);
        else pushTimeline('our', `提议「${p.content}」对方回应：不同意`);
        energyData.pendingProposal = null;
        energyData.hasUnread = picked !== '不同意';
        saveEnergy();
        updateBadge();
    }

    function renderOurTab() {
        checkProposalAutoResolve();
        const el = document.getElementById('our-energy-display');
        const tm = document.getElementById('our-energy-time');
        const notice = document.getElementById('pending-proposal-notice');
        const summaryBox = document.getElementById('recent-summary-box');
        if (el) el.textContent = energyData.ourStatus.text || '（未设置）';
        if (tm) tm.textContent = energyData.ourStatus.ts ? fmtTime(energyData.ourStatus.ts) + '更新' : '';
        if (notice) {
            const p = energyData.pendingProposal;
            if (p && p.from === 'me') {
                notice.style.display = 'block';
                const hoursLeft = p.resolveAt ? Math.max(0, Math.ceil((p.resolveAt - Date.now()) / 3600000)) : '?';
                notice.textContent = `等待回应提议「${p.content}」· 预计 ${hoursLeft} 小时内收到回应`;
            } else { notice.style.display = 'none'; }
        }
        const recent = energyData.summaries[0];
        if (summaryBox) {
            if (recent) {
                summaryBox.style.display = 'block';
                const t = document.getElementById('recent-summary-text');
                const r = document.getElementById('recent-summary-reply');
                if (t) t.textContent = `"${recent.text}"`;
                if (r) r.textContent = recent.reply ? `对方回复："${recent.reply}"` : '';
            } else summaryBox.style.display = 'none';
        }
    }

    function renderTimeline() {
        const list = document.getElementById('energy-timeline-list');
        if (!list) return;
        const OUR = new Set(['our', 'proposal', 'summary']);
        const items = energyData.timeline.filter(i => OUR.has(i.type));
        if (!items.length) { list.innerHTML = '<div style="text-align:center;padding:32px 0;color:var(--text-secondary);font-size:13px;">暂无记录</div>'; return; }
        const groups = {};
        items.forEach(item => {
            const k = new Date(item.ts).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
            if (!groups[k]) groups[k] = [];
            groups[k].push(item);
        });
        list.innerHTML = Object.entries(groups).map(([date, rows]) => `
            <div style="margin-bottom:12px;">
                <div style="font-size:11px;font-weight:700;color:var(--text-secondary);padding:6px 0;">${date}</div>
                ${rows.map(item => {
                    const icon = item.type === 'our' ? '✨' : item.type === 'proposal' ? '📨' : '📝';
                    const time = new Date(item.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                    return `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(var(--border-color-rgb),0.5);">
                        <div style="font-size:16px;flex-shrink:0;">${icon}</div>
                        <div style="flex:1;"><div style="font-size:13px;color:var(--text-primary);">${item.text}</div>
                        <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">${time}</div></div>
                    </div>`;
                }).join('')}
            </div>`).join('');
    }

    function renderProposeOptions() {
        const list = document.getElementById('propose-options-list');
        if (!list) return;
        list.innerHTML = (window._proposeOptions || []).map((opt, i) => `
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="flex:1;font-size:13px;padding:6px 10px;background:var(--primary-bg);border-radius:8px;">${opt}</span>
                <button onclick="window._removeProposeOption(${i})" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;">✕</button>
            </div>`).join('');
    }

    window._removePartnerTag = function (i) { energyData.partnerTags.splice(i, 1); saveEnergy(); renderPartnerTagsList(); };
    window._removeProposeOption = function (i) { window._proposeOptions.splice(i, 1); renderProposeOptions(); };

    function init() {
        loadEnergy().then(() => { updateBadge(); });

        // 打开能量状态时：按时间间隔（1-8小时）随机更新他的状态
        document.getElementById('energy-settings')?.addEventListener('click', () => {
            energyData.hasUnread = false;
            const hoursSinceLast = (Date.now() - (energyData.lastPartnerStatusChange || 0)) / 3600000;
            if (hoursSinceLast >= (energyData.nextPartnerStatusChangeHours || 0)) {
                const pool = energyData.partnerTags.length ? energyData.partnerTags : DEFAULT_PARTNER_TAGS;
                const text = pool[Math.floor(Math.random() * pool.length)];
                energyData.partnerStatus = { text, ts: Date.now() };
                if (!energyData.partnerHistory) energyData.partnerHistory = [];
                energyData.partnerHistory.unshift({ text, ts: Date.now() });
                if (energyData.partnerHistory.length > 50) energyData.partnerHistory = energyData.partnerHistory.slice(0, 50);
                energyData.lastPartnerStatusChange = Date.now();
                energyData.nextPartnerStatusChangeHours = 1 + Math.random() * 7;
            }
            saveEnergy();
            updateBadge();
            setTimeout(() => switchEnergyTab('my'), 50);
        });

        // Tab 切换
        document.querySelectorAll('.energy-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchEnergyTab(btn.dataset.energyTab));
        });

        // 标签管理 toggle
        document.getElementById('toggle-partner-tags-btn')?.addEventListener('click', () => {
            const mgr = document.getElementById('partner-tags-manager');
            if (!mgr) return;
            const open = mgr.style.display !== 'none';
            mgr.style.display = open ? 'none' : 'block';
            document.getElementById('toggle-partner-tags-btn').textContent = open ? '管理' : '收起';
            if (!open) renderPartnerTagsList();
        });
        document.getElementById('add-partner-tag-btn')?.addEventListener('click', () => {
            const inp = document.getElementById('new-partner-tag-input');
            const val = inp ? inp.value.trim() : '';
            if (!val) return;
            energyData.partnerTags.push(val);
            inp.value = '';
            saveEnergy();
            renderPartnerTagsList();
        });
        document.getElementById('new-partner-tag-input')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('add-partner-tag-btn')?.click();
        });

        // 编辑我的状态
        document.getElementById('edit-my-energy-btn')?.addEventListener('click', () => {
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
            if (!energyData.myHistory) energyData.myHistory = [];
            energyData.myHistory.unshift({ text, ts: Date.now() });
            if (energyData.myHistory.length > 50) energyData.myHistory = energyData.myHistory.slice(0, 50);
            pushTimeline('my', `我的状态：${text}`);
            saveEnergy();
            renderMyTab();
            hideModal(document.getElementById('edit-my-energy-modal'));
        });

        // 发起提议
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
            const resolveHours = 2 + Math.random() * 3;
            energyData.pendingProposal = { id: 'prop_' + Date.now(), content, options: [...(window._proposeOptions || [])], from: 'me', ts: Date.now(), resolveAt: Date.now() + resolveHours * 3600000 };
            pushTimeline('proposal', `我发起提议：将状态改为「${content}」`);
            saveEnergy();
            renderOurTab();
            hideModal(document.getElementById('propose-energy-modal'));
            if (typeof showNotification === 'function') showNotification('提议已发出，' + Math.ceil(resolveHours) + '小时内收到回应', 'success');
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
            energyData.summaries.unshift({ id: 'sum_' + Date.now(), text, ts: Date.now(), reply: '', replyTs: 0 });
            pushTimeline('summary', `总结：${text}`);
            saveEnergy();
            renderOurTab();
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
