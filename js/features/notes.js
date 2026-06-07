(function() {
    'use strict';

    let notesData = [];
    let currentNotesTab = 'recv';
    let currentNoteDetailId = null;
    let noteImageData = null;

    const NOTES_KEY = (window.APP_PREFIX || 'CHAT_APP_V3_') + 'notesData';

    async function loadNotes() {
        const saved = await localforage.getItem(NOTES_KEY);
        if (saved && Array.isArray(saved)) notesData = saved;
    }

    function saveNotes() {
        localforage.setItem(NOTES_KEY, notesData);
    }

    function updateNotesBadge() {
        const unread = notesData.filter(n => n.from === 'partner' && !n.read).length;
        const badge = document.getElementById('notes-unread-badge');
        const settingsBadge = document.getElementById('notes-settings-badge');
        if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'inline-block' : 'none'; }
        if (settingsBadge) { settingsBadge.style.display = unread > 0 ? 'inline-block' : 'none'; }
    }

    function renderNotesList() {
        const list = document.getElementById('notes-list');
        if (!list) return;
        const filtered = notesData
            .filter(n => currentNotesTab === 'recv' ? n.from === 'partner' : n.from === 'me')
            .slice().sort((a, b) => b.ts - a.ts);
        if (!filtered.length) {
            list.innerHTML = `<div style="text-align:center;padding:32px 0;color:var(--text-secondary);font-size:13px;">${currentNotesTab === 'recv' ? '还没有收到小纸条' : '还没有发出小纸条'}</div>`;
            return;
        }
        list.innerHTML = filtered.map(n => {
            const d = new Date(n.ts);
            const dateStr = d.toLocaleDateString('zh-CN', {month:'numeric', day:'numeric'});
            const timeStr = d.toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
            const preview = n.text.length > 30 ? n.text.slice(0, 30) + '…' : n.text;
            const isUnread = n.from === 'partner' && !n.read;
            return `<div onclick="window.openNoteDetail('${n.id}')" style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--primary-bg);border-radius:10px;margin-bottom:8px;cursor:pointer;${isUnread ? 'border-left:3px solid var(--accent-color);' : ''}">
                <div style="flex-shrink:0;text-align:center;min-width:36px;">
                    <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${dateStr}</div>
                    <div style="font-size:11px;color:var(--text-secondary);">${timeStr}</div>
                </div>
                <div style="width:1px;height:32px;background:var(--border-color);flex-shrink:0;"></div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${preview}</div>
                    ${n.image ? '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;"><i class="fas fa-image"></i> 含图片</div>' : ''}
                </div>
                ${isUnread ? '<span style="background:var(--accent-color);color:#fff;font-size:9px;padding:1px 5px;border-radius:6px;flex-shrink:0;">新</span>' : ''}
            </div>`;
        }).join('');
    }

    window.openNoteDetail = function(id) {
        const note = notesData.find(n => n.id === id);
        if (!note) return;
        if (note.from === 'partner' && !note.read) {
            note.read = true;
            saveNotes();
            updateNotesBadge();
            renderNotesList();
        }
        currentNoteDetailId = id;
        const title = document.getElementById('note-detail-title');
        const textEl = document.getElementById('note-detail-text');
        const timeEl = document.getElementById('note-detail-time');
        const imgWrap = document.getElementById('note-detail-image');
        const img = document.getElementById('note-detail-img');
        if (title) title.textContent = note.from === 'partner' ? `${settings.partnerName || '对方'}的小纸条` : '我的小纸条';
        if (textEl) textEl.textContent = note.text;
        if (timeEl) timeEl.textContent = new Date(note.ts).toLocaleString('zh-CN');
        if (imgWrap && img) {
            if (note.image) { img.src = note.image; imgWrap.style.display = 'block'; }
            else imgWrap.style.display = 'none';
        }
        showModal(document.getElementById('note-detail-modal'));
    };

    window.openWriteNote = function() {
        noteImageData = null;
        const textarea = document.getElementById('write-note-text');
        const preview = document.getElementById('note-image-preview');
        const counter = document.getElementById('note-char-count');
        if (textarea) textarea.value = '';
        if (preview) preview.style.display = 'none';
        if (counter) counter.textContent = '0';
        showModal(document.getElementById('write-note-modal'));
    };

    // 模拟梦角发小纸条（供外部调用测试）
    window.receiveNote = function(text, image) {
        const note = { id: 'note_' + Date.now(), from: 'partner', text, image: image || null, ts: Date.now(), read: false };
        notesData.push(note);
        saveNotes();
        updateNotesBadge();
        const partnerName = settings.partnerName || '对方';
        addMessage({ id: Date.now(), sender: 'system', text: `${partnerName}递来一张小纸条`, timestamp: new Date(), type: 'system', noteId: note.id });
        if (typeof playSound === 'function') playSound('send');
    };

    function init() {
        loadNotes().then(() => { updateNotesBadge(); });

        // 关闭小纸条管理
        const closeBtn = document.getElementById('close-notes-modal');
        if (closeBtn) closeBtn.addEventListener('click', () => hideModal(document.getElementById('notes-modal')));

        // 标签切换
        document.querySelectorAll('.notes-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentNotesTab = btn.dataset.notesTab;
                document.querySelectorAll('.notes-tab-btn').forEach(b => {
                    const isActive = b.dataset.notesTab === currentNotesTab;
                    b.style.background = isActive ? 'var(--accent-color)' : 'transparent';
                    b.style.color = isActive ? '#fff' : 'var(--text-secondary)';
                    b.classList.toggle('active', isActive);
                });
                renderNotesList();
            });
        });

        // 打开小纸条管理时渲染列表
        const notesSettingsEl = document.getElementById('notes-settings');
        if (notesSettingsEl) {
            notesSettingsEl.addEventListener('click', () => { renderNotesList(); updateNotesBadge(); });
        }

        // 字数统计
        const textarea = document.getElementById('write-note-text');
        if (textarea) textarea.addEventListener('input', () => {
            const counter = document.getElementById('note-char-count');
            if (counter) counter.textContent = textarea.value.length;
        });

        // 图片选择
        const imageInput = document.getElementById('note-image-input');
        if (imageInput) imageInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                noteImageData = ev.target.result;
                const preview = document.getElementById('note-image-preview');
                const img = document.getElementById('note-preview-img');
                if (preview && img) { img.src = noteImageData; preview.style.display = 'block'; }
            };
            reader.readAsDataURL(file);
        });

        const removeImgBtn = document.getElementById('remove-note-image');
        if (removeImgBtn) removeImgBtn.addEventListener('click', () => {
            noteImageData = null;
            const preview = document.getElementById('note-image-preview');
            if (preview) preview.style.display = 'none';
            if (imageInput) imageInput.value = '';
        });

        // 取消写小纸条
        const cancelBtn = document.getElementById('cancel-write-note');
        if (cancelBtn) cancelBtn.addEventListener('click', () => hideModal(document.getElementById('write-note-modal')));

        // 发送小纸条
        const sendBtn = document.getElementById('send-note-btn');
        if (sendBtn) sendBtn.addEventListener('click', () => {
            const textarea = document.getElementById('write-note-text');
            const text = textarea ? textarea.value.trim() : '';
            if (!text) { if (typeof showNotification === 'function') showNotification('内容不能为空', 'warning'); return; }
            const note = { id: 'note_' + Date.now(), from: 'me', text, image: noteImageData || null, ts: Date.now(), read: true };
            notesData.push(note);
            saveNotes();
            hideModal(document.getElementById('write-note-modal'));
            const myName = settings.myName || '我';
            addMessage({ id: Date.now(), sender: 'system', text: `${myName}递来一张小纸条`, timestamp: new Date(), type: 'system', noteId: note.id });
            if (typeof playSound === 'function') playSound('send');
            if (typeof showNotification === 'function') showNotification('小纸条已发出 ✉', 'success');
        });

        // 关闭详情
        const closeDetailBtn = document.getElementById('close-note-detail-btn');
        if (closeDetailBtn) closeDetailBtn.addEventListener('click', () => hideModal(document.getElementById('note-detail-modal')));

        // 删除
        const deleteDetailBtn = document.getElementById('delete-note-detail-btn');
        if (deleteDetailBtn) deleteDetailBtn.addEventListener('click', () => {
            if (!currentNoteDetailId) return;
            if (!confirm('确定删除这张小纸条？')) return;
            notesData = notesData.filter(n => n.id !== currentNoteDetailId);
            saveNotes();
            updateNotesBadge();
            renderNotesList();
            hideModal(document.getElementById('note-detail-modal'));
        });

        // 图片标签点击触发文件选择
        const imgLabel = document.querySelector('label[for="note-image-input"]') || document.querySelector('.write-note-img-label');
        if (imgLabel) imgLabel.addEventListener('click', () => imageInput && imageInput.click());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
