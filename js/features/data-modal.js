/**
 * data-modal.js — 数据管理界面 v3
 * 全新设计：移动优先、视觉精美、无溢出
 */
(function () {
    'use strict';

    /* ── CSS ──────────────────────────────────────────────────────── */
    function injectCSS() {
        if (document.getElementById('dm3-style')) return;
        const s = document.createElement('style');
        s.id = 'dm3-style';
        s.textContent = `
/* ============================================================
   DM3 — Data Modal v3  (prefix: dm3-)
   ============================================================ */

/* Modal wrapper: bottom sheet on mobile */
#data-modal {
    align-items: flex-end !important;
    padding: 0 !important;
}
#data-modal .modal-content {
    padding: 0 !important;
    width: 100% !important;
    max-width: 520px !important;
    max-height: 92dvh !important;
    border-radius: 28px 28px 0 0 !important;
    overflow: hidden !important;
    display: flex !important;
    flex-direction: column !important;
    box-shadow: 0 -8px 40px rgba(0,0,0,.18) !important;
    margin: 0 auto !important;
}
@media (min-width: 600px) {
    #data-modal { align-items: center !important; padding: 20px !important; }
    #data-modal .modal-content {
        border-radius: 24px !important;
        max-height: 88dvh !important;
    }
}

/* ── Drag handle ── */
.dm3-handle {
    width: 40px; height: 4px;
    background: var(--border-color);
    border-radius: 99px;
    margin: 12px auto 0;
    flex-shrink: 0;
    opacity: .5;
}

/* ── Header ── */
.dm3-header {
    flex-shrink: 0;
    padding: 16px 20px 14px;
    display: flex;
    align-items: center;
    gap: 14px;
    border-bottom: 1px solid var(--border-color);
}
.dm3-header-icon {
    width: 46px; height: 46px;
    border-radius: 16px;
    background: linear-gradient(145deg,
        rgba(var(--accent-color-rgb,224,105,138),.25),
        rgba(var(--accent-color-rgb,224,105,138),.08));
    display: flex; align-items: center; justify-content: center;
    font-size: 19px;
    color: var(--accent-color);
    flex-shrink: 0;
    box-shadow: 0 4px 14px rgba(var(--accent-color-rgb,224,105,138),.2);
}
.dm3-header-info { flex: 1; min-width: 0; }
.dm3-header-title {
    font-size: 17px; font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -.3px;
    line-height: 1.25;
}
.dm3-header-sub {
    font-size: 11.5px;
    color: var(--text-secondary);
    margin-top: 2px;
    opacity: .7;
}
.dm3-close-btn {
    width: 32px; height: 32px;
    border-radius: 50%;
    border: none;
    background: var(--secondary-bg);
    color: var(--text-secondary);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px;
    cursor: pointer;
    flex-shrink: 0;
    transition: background .18s, color .18s;
}
.dm3-close-btn:hover {
    background: rgba(var(--accent-color-rgb,224,105,138),.1);
    color: var(--accent-color);
}

/* ── Scroll body ── */
.dm3-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding: 12px 14px 6px;
}
.dm3-body::-webkit-scrollbar { width: 0; }

/* ── Storage banner ── */
.dm3-banner {
    border-radius: 20px;
    padding: 16px 18px;
    margin-bottom: 14px;
    background: linear-gradient(135deg,
        rgba(var(--accent-color-rgb,224,105,138),.13) 0%,
        rgba(var(--accent-color-rgb,224,105,138),.04) 100%);
    border: 1.5px solid rgba(var(--accent-color-rgb,224,105,138),.18);
    position: relative;
    overflow: hidden;
}
.dm3-banner::before {
    content: '';
    position: absolute;
    top: -20px; right: -20px;
    width: 100px; height: 100px;
    border-radius: 50%;
    background: radial-gradient(circle,
        rgba(var(--accent-color-rgb,224,105,138),.15) 0%,
        transparent 70%);
    pointer-events: none;
}
.dm3-banner-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
}
.dm3-banner-label {
    font-size: 10.5px; font-weight: 800;
    letter-spacing: 1px; text-transform: uppercase;
    color: var(--accent-color);
    display: flex; align-items: center; gap: 5px;
}
.dm3-banner-size {
    font-size: 12px; font-weight: 700;
    color: var(--text-secondary);
}
.dm3-progress-track {
    height: 5px;
    background: rgba(var(--accent-color-rgb,224,105,138),.15);
    border-radius: 99px;
    overflow: hidden;
    margin-bottom: 12px;
}
.dm3-progress-fill {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg,
        var(--accent-color),
        rgba(var(--accent-color-rgb,224,105,138),.55));
    transition: width .8s cubic-bezier(.4,0,.2,1);
}
.dm3-stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
}
.dm3-stat-chip {
    background: var(--primary-bg);
    border: 1.5px solid var(--border-color);
    border-radius: 13px;
    padding: 9px 8px 8px;
    text-align: center;
}
.dm3-stat-chip-num {
    font-size: 14px; font-weight: 800;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
}
.dm3-stat-chip-lbl {
    font-size: 10px;
    color: var(--text-secondary);
    margin-top: 2px;
    opacity: .75;
}

/* ── Section heading ── */
.dm3-section {
    display: flex; align-items: center; gap: 6px;
    font-size: 10px; font-weight: 800;
    letter-spacing: 1.1px; text-transform: uppercase;
    color: var(--text-secondary);
    opacity: .5;
    margin: 16px 4px 7px;
}
.dm3-section.danger { color: #FF3B30; opacity: .65; }

/* ── Card group ── */
.dm3-group {
    background: var(--secondary-bg);
    border: 1.5px solid var(--border-color);
    border-radius: 20px;
    overflow: hidden;
    margin-bottom: 4px;
}

/* ── Row ── */
.dm3-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 16px;
    border-bottom: 1px solid var(--border-color);
    box-sizing: border-box;
    width: 100%;
    min-height: 64px;
}
.dm3-row:last-child { border-bottom: none; }
.dm3-row.tappable {
    cursor: pointer;
    transition: background .15s;
    -webkit-tap-highlight-color: transparent;
}
.dm3-row.tappable:hover { background: rgba(var(--accent-color-rgb,224,105,138),.04); }
.dm3-row.tappable:active { background: rgba(var(--accent-color-rgb,224,105,138),.09); }

/* ── Icon pill ── */
.dm3-icon {
    width: 38px; height: 38px;
    border-radius: 13px;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px;
    flex-shrink: 0;
}
.dm3-icon-pink   { background: rgba(var(--accent-color-rgb,224,105,138),.14); color: var(--accent-color); }
.dm3-icon-blue   { background: rgba(74,144,226,.13);  color: #4A90E2; }
.dm3-icon-green  { background: rgba(52,199,89,.13);   color: #34C759; }
.dm3-icon-amber  { background: rgba(255,159,10,.13);  color: #FF9F0A; }
.dm3-icon-purple { background: rgba(175,82,222,.13);  color: #AF52DE; }
.dm3-icon-red    { background: rgba(255,59,48,.10);   color: #FF3B30; }
.dm3-icon-teal   { background: rgba(90,200,250,.13);  color: #5AC8FA; }

/* ── Text block ── */
.dm3-text { flex: 1 1 0%; min-width: 0; }
.dm3-row-title {
    font-size: 14px; font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.3;
}
.dm3-row-desc {
    font-size: 11.5px;
    color: var(--text-secondary);
    margin-top: 2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.35;
    opacity: .8;
}

/* ── Right side: never overflows, never wraps ── */
.dm3-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    flex-wrap: nowrap;
}

/* ── Buttons ── */
.dm3-btn {
    display: inline-flex; align-items: center; gap: 5px;
    height: 34px;
    padding: 0 13px;
    border-radius: 99px;
    font-size: 12.5px; font-weight: 600;
    border: 1.5px solid var(--border-color);
    background: var(--primary-bg);
    color: var(--text-primary);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all .18s;
    font-family: var(--font-family, inherit);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    box-sizing: border-box;
}
.dm3-btn:hover {
    border-color: var(--accent-color);
    color: var(--accent-color);
    background: rgba(var(--accent-color-rgb,224,105,138),.07);
}
.dm3-btn:active { transform: scale(.94); }

.dm3-btn.solid {
    background: var(--accent-color);
    border-color: transparent;
    color: #fff;
}
.dm3-btn.solid:hover { opacity: .85; border-color: transparent; color: #fff; }

.dm3-btn.ghost-red {
    color: #FF3B30;
    border-color: rgba(255,59,48,.25);
    background: transparent;
}
.dm3-btn.ghost-red:hover { background: rgba(255,59,48,.08); border-color: #FF3B30; }

/* ── Toggle ── */
.dm3-toggle {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 50px; height: 28px;
    flex-shrink: 0;
    cursor: pointer;
}
.dm3-toggle input {
    opacity: 0; width: 0; height: 0; position: absolute;
}
.dm3-toggle-track {
    position: absolute;
    inset: 0;
    background: rgba(120,120,128,.22);
    border-radius: 99px;
    transition: background .28s;
}
.dm3-toggle-track::after {
    content: '';
    position: absolute;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: #fff;
    top: 3px; left: 3px;
    transition: transform .28s cubic-bezier(.34,1.3,.64,1);
    box-shadow: 0 2px 6px rgba(0,0,0,.22);
}
.dm3-toggle input:checked + .dm3-toggle-track { background: var(--accent-color); }
.dm3-toggle input:checked + .dm3-toggle-track::after { transform: translateX(22px); }

/* ── Footer ── */
.dm3-footer {
    flex-shrink: 0;
    display: flex;
    gap: 8px;
    padding: 12px 14px;
    padding-bottom: max(14px, env(safe-area-inset-bottom, 14px));
    border-top: 1px solid var(--border-color);
    background: var(--secondary-bg);
}
.dm3-footer-btn {
    flex: 1;
    height: 46px;
    border-radius: 14px;
    border: 1.5px solid var(--border-color);
    background: var(--primary-bg);
    color: var(--text-primary);
    font-size: 14px; font-weight: 600;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    transition: all .18s;
    font-family: var(--font-family, inherit);
    -webkit-tap-highlight-color: transparent;
}
.dm3-footer-btn:hover {
    background: rgba(var(--accent-color-rgb,224,105,138),.06);
    border-color: rgba(var(--accent-color-rgb,224,105,138),.35);
}
.dm3-footer-btn:active { transform: scale(.97); }

.dm3-spacer { height: 10px; }
        `;
        document.head.appendChild(s);
    }

    /* ── HTML ─────────────────────────────────────────────────────── */
    function buildHTML() {
        return `
<div class="dm3-handle"></div>

<div class="dm3-header">
  <div class="dm3-header-icon"><i class="fas fa-database"></i></div>
  <div class="dm3-header-info">
    <div class="dm3-header-title">数据管理</div>
    <div class="dm3-header-sub">备份 · 恢复 · 通知 · 设置</div>
  </div>
  <button class="dm3-close-btn" id="close-data" aria-label="关闭">
    <i class="fas fa-times"></i>
  </button>
</div>

<div class="dm3-body">

  <!-- 存储概览 -->
  <div class="dm3-banner">
    <div class="dm3-banner-top">
      <span class="dm3-banner-label"><i class="fas fa-hdd"></i> 本地存储</span>
      <span class="dm3-banner-size" id="dm3-storage-size">计算中…</span>
    </div>
    <div class="dm3-progress-track">
      <div class="dm3-progress-fill" id="dm3-progress-fill" style="width:0%"></div>
    </div>
    <div class="dm3-stats-row">
      <div class="dm3-stat-chip">
        <div class="dm3-stat-chip-num" id="dm3-stat-msgs">—</div>
        <div class="dm3-stat-chip-lbl">聊天记录</div>
      </div>
      <div class="dm3-stat-chip">
        <div class="dm3-stat-chip-num" id="dm3-stat-cfg">—</div>
        <div class="dm3-stat-chip-lbl">设置数据</div>
      </div>
      <div class="dm3-stat-chip">
        <div class="dm3-stat-chip-num" id="dm3-stat-media">—</div>
        <div class="dm3-stat-chip-lbl">图片/媒体</div>
      </div>
    </div>
  </div>

  <!-- 消息通知 -->
  <div class="dm3-section"><i class="fas fa-bell"></i> 消息通知</div>
  <div class="dm3-group">
    <div class="dm3-row">
      <div class="dm3-icon dm3-icon-amber"><i class="fas fa-bell"></i></div>
      <div class="dm3-text">
        <div class="dm3-row-title">后台消息推送</div>
        <div class="dm3-row-desc">挂在后台时收到新消息自动弹出提醒</div>
      </div>
      <div class="dm3-right">
        <label class="dm3-toggle">
          <input type="checkbox" id="notif-permission-toggle" onchange="handleNotifToggle(this)">
          <span class="dm3-toggle-track"></span>
        </label>
      </div>
    </div>
  </div>

  <!-- 备份与恢复 -->
  <div class="dm3-section"><i class="fas fa-archive"></i> 备份与恢复</div>
  <div class="dm3-group">
    <div class="dm3-row">
      <div class="dm3-icon dm3-icon-blue"><i class="fas fa-layer-group"></i></div>
      <div class="dm3-text">
        <div class="dm3-row-title">全量备份</div>
        <div class="dm3-row-desc">外观、设置、字卡、心情、信封等</div>
      </div>
      <div class="dm3-right">
        <button class="dm3-btn solid" id="export-all-settings"><i class="fas fa-download"></i> 导出</button>
        <button class="dm3-btn" id="import-all-settings"><i class="fas fa-upload"></i> 导入</button>
      </div>
    </div>
    <div class="dm3-row">
      <div class="dm3-icon dm3-icon-green"><i class="fas fa-comments"></i></div>
      <div class="dm3-text">
        <div class="dm3-row-title">聊天记录</div>
        <div class="dm3-row-desc">仅导出 / 导入消息内容</div>
      </div>
      <div class="dm3-right">
        <button class="dm3-btn solid" id="export-chat-btn"><i class="fas fa-download"></i> 导出</button>
        <button class="dm3-btn" id="import-chat-btn"><i class="fas fa-upload"></i> 导入</button>
      </div>
    </div>
  </div>

  <!-- 视频通话 -->
  <div class="dm3-section"><i class="fas fa-video"></i> 视频通话</div>
  <div class="dm3-group" id="call-settings-card">
    <div class="dm3-row">
      <div class="dm3-icon dm3-icon-teal"><i class="fas fa-video"></i></div>
      <div class="dm3-text">
        <div class="dm3-row-title">模拟视频通话</div>
        <div class="dm3-row-desc">开启后可发起通话，对方也会随机来电</div>
      </div>
      <div class="dm3-right">
        <label class="dm3-toggle">
          <input type="checkbox" id="call-enabled-toggle">
          <span class="dm3-toggle-track"></span>
        </label>
      </div>
    </div>
  </div>

  <!-- 关于 -->
  <div class="dm3-section"><i class="fas fa-info-circle"></i> 关于</div>
  <div class="dm3-group">
    <div class="dm3-row tappable" id="replay-tutorial-btn-row">
      <div class="dm3-icon dm3-icon-pink"><i class="fas fa-compass"></i></div>
      <div class="dm3-text">
        <div class="dm3-row-title">重放新手引导</div>
        <div class="dm3-row-desc">重新播放功能介绍教程</div>
      </div>
      <div class="dm3-right">
        <button class="dm3-btn settings-item" id="replay-tutorial-btn">
          <i class="fas fa-play"></i> 播放
        </button>
      </div>
    </div>
    <div class="dm3-row tappable" id="open-credits-row">
      <div class="dm3-icon dm3-icon-purple"><i class="fas fa-scroll"></i></div>
      <div class="dm3-text">
        <div class="dm3-row-title">声明与致谢</div>
        <div class="dm3-row-desc">开源声明、致谢名单</div>
      </div>
      <div class="dm3-right">
        <button class="dm3-btn settings-item" id="open-credits-btn">
          <i class="fas fa-arrow-right"></i> 查看
        </button>
      </div>
    </div>
  </div>

  <!-- 危险操作 -->
  <div class="dm3-section danger"><i class="fas fa-exclamation-triangle"></i> 危险操作</div>
  <div class="dm3-group">
    <div class="dm3-row">
      <div class="dm3-icon dm3-icon-red"><i class="fas fa-trash-alt"></i></div>
      <div class="dm3-text">
        <div class="dm3-row-title">重置全部数据</div>
        <div class="dm3-row-desc">清空所有本地数据，操作不可撤销</div>
      </div>
      <div class="dm3-right">
        <button class="dm3-btn ghost-red settings-item" id="clear-storage">
          <i class="fas fa-sync-alt"></i> 重置
        </button>
      </div>
    </div>
  </div>

  <div class="dm3-spacer"></div>
</div>

<div class="dm3-footer">
  <button class="dm3-footer-btn" id="back-data"
    onclick="(function(){hideModal(document.getElementById('data-modal'));showModal(document.getElementById('settings-modal'))})()">
    <i class="fas fa-arrow-left"></i> 返回设置
  </button>
</div>
        `;
    }

    /* ── Storage stats ────────────────────────────────────────────── */
    function fmt(b) {
        if (b < 1024) return b + ' B';
        if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
        return (b / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function updateStats() {
        try {
            let total = 0, msgs = 0, cfg = 0, media = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                const v = localStorage.getItem(k) || '';
                const bytes = (k.length + v.length) * 2;
                total += bytes;
                if (k.includes('messages') || k.includes('session')) msgs += bytes;
                else if (v.startsWith('data:image') || v.startsWith('data:video')) media += bytes;
                else cfg += bytes;
            }
            const pct = Math.min(100, total / (5 * 1024 * 1024) * 100).toFixed(1);

            const get = id => document.getElementById(id);
            const sz  = get('dm3-storage-size');  if (sz)  sz.textContent  = fmt(total) + ' / ~5 MB';
            const bar = get('dm3-progress-fill');  if (bar) bar.style.width = pct + '%';
            const m   = get('dm3-stat-msgs');      if (m)   m.textContent  = fmt(msgs);
            const c   = get('dm3-stat-cfg');       if (c)   c.textContent  = fmt(cfg);
            const med = get('dm3-stat-media');     if (med) med.textContent = fmt(media);
        } catch (e) { /* silent */ }
    }

    /* ── Sync toggles ─────────────────────────────────────────────── */
    function syncToggles() {
        const n = document.getElementById('notif-permission-toggle');
        if (n) n.checked = localStorage.getItem('notifEnabled') === 'true';
        const c = document.getElementById('call-enabled-toggle');
        if (c) c.checked = localStorage.getItem('callFeatureEnabled') !== 'false';
    }

    /* ── Force layout overrides (survive showModal rAF) ──────────── */
    function applyLayout(mc) {
        if (!mc) return;
        mc.style.setProperty('padding', '0', 'important');
        mc.style.setProperty('overflow', 'hidden', 'important');
        mc.style.setProperty('display', 'flex', 'important');
        mc.style.setProperty('flex-direction', 'column', 'important');
    }

    /* ── Rebuild ──────────────────────────────────────────────────── */
    function rebuild() {
        const modal = document.getElementById('data-modal');
        if (!modal) return;
        const mc = modal.querySelector('.modal-content');
        if (!mc || mc.dataset.dm3Built) return;
        mc.dataset.dm3Built = '1';
        mc.innerHTML = buildHTML();
        applyLayout(mc);
        syncToggles();
        updateStats();
    }

    /* ── Watch for open ───────────────────────────────────────────── */
    function watch() {
        const modal = document.getElementById('data-modal');
        if (!modal) return;
        new MutationObserver(() => {
            const d = modal.style.display;
            if (d === 'flex' || d === 'block') {
                rebuild();
                syncToggles();
                updateStats();
                setTimeout(() => applyLayout(modal.querySelector('.modal-content')), 40);
            }
        }).observe(modal, { attributes: true, attributeFilter: ['style'] });
    }

    /* ── Init ─────────────────────────────────────────────────────── */
    function init() {
        injectCSS();
        const go = () => { rebuild(); watch(); };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(go, 300));
        } else {
            setTimeout(go, 300);
        }
    }

    init();
})();
