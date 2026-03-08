/**
 * features/combo-menu.js - 组合菜单 Emoji/Poke Combo
 * 快捷菜单、表情标签与戳一戳标签
 */

function renderComboMenu() {
    const content = document.getElementById('user-sticker-content');
    content.innerHTML = '';
    
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex; gap:8px; padding:8px; border-bottom:1px solid var(--border-color);';
    tabBar.innerHTML = `
        <button class="combo-tab active" data-tab="emoji" style="flex:1; padding:8px; border:none; background:var(--accent-color); color:#fff; border-radius:8px; cursor:pointer;">
            😊 表情
        </button>
        <button class="combo-tab" data-tab="poke" style="flex:1; padding:8px; border:none; background:var(--secondary-bg); color:var(--text-primary); border-radius:8px; cursor:pointer;">
            ✨ 拍一拍
        </button>
    `;
    
    const contentArea = document.createElement('div');
    contentArea.id = 'combo-content-area';
    contentArea.style.cssText = 'padding:10px; max-height:240px; overflow-y:auto;';
    
    content.appendChild(tabBar);
    content.appendChild(contentArea);
    
    showEmojiTab();
    
    tabBar.querySelectorAll('.combo-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            tabBar.querySelectorAll('.combo-tab').forEach(b => {
                b.style.background = 'var(--secondary-bg)';
                b.style.color = 'var(--text-primary)';
                b.classList.remove('active');
            });
            btn.style.background = 'var(--accent-color)';
            btn.style.color = '#fff';
            btn.classList.add('active');
            
            if (btn.dataset.tab === 'emoji') {
                showEmojiTab();
            } else {
                showPokeTab();
            }
        });
    });
}

function showEmojiTab() {
    const area = document.getElementById('combo-content-area');
    area.innerHTML = '';
    area.style.display = 'grid';
    area.style.gridTemplateColumns = 'repeat(5, 1fr)';
    area.style.gap = '8px';
    
    CONSTANTS.REPLY_EMOJIS.forEach(emoji => {
        const item = document.createElement('div');
        item.className = 'picker-item';
        item.innerHTML = `<span style="font-size:24px;">${emoji}</span>`;
        item.onclick = () => {
            const input = document.getElementById('message-input');
            input.value += emoji;
            document.getElementById('user-sticker-picker').classList.remove('active');
            input.focus();
        };
        area.appendChild(item);
    });
    customEmojis.forEach(emoji => {
        const item = document.createElement('div');
        item.className = 'picker-item';
        item.innerHTML = `<span style="font-size:24px;">${emoji}</span>`;
        item.onclick = () => {
            const input = document.getElementById('message-input');
            input.value += emoji;
            document.getElementById('user-sticker-picker').classList.remove('active');
            input.focus();
        };
        area.appendChild(item);
    });

    stickerLibrary.forEach(src => {
        const item = document.createElement('div');
        item.className = 'picker-item';
        item.innerHTML = `<img src="${src}" style="width:100%; height:100%; object-fit:cover; border-radius:6px;">`;
        item.onclick = () => {
            if (isBatchMode) {
                batchMessages.push({ id: Date.now() + batchMessages.length, text: '', image: src });
                updateBatchPreview();
                showNotification('已添加到批量发送', 'success', 1200);
            } else {
                addMessage({
                    id: Date.now(),
                    sender: 'user',
                    text: '',
                    timestamp: new Date(),
                    image: src,
                    status: 'sent',
                    type: 'normal'
                });
                playSound('send');
                
                const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
                if (window._pendingReplyTimer) clearTimeout(window._pendingReplyTimer);
                window._pendingReplyTimer = setTimeout(() => { window._pendingReplyTimer = null; simulateReply(); }, randomDelay);
            }
            document.getElementById('user-sticker-picker').classList.remove('active');
        };
        area.appendChild(item);
    });
}

function showPokeTab() {
    const area = document.getElementById('combo-content-area');
    area.innerHTML = '';
    area.style.display = 'flex';
    area.style.flexDirection = 'column';
    area.style.gap = '8px';
    
    const quickPokes = customPokes.slice(0, 6);
    
    quickPokes.forEach(pokeText => {
        const btn = document.createElement('button');
        btn.textContent = pokeText;
        btn.style.cssText = `
            padding: 10px 14px;
            background: linear-gradient(135deg, var(--secondary-bg), rgba(var(--accent-color-rgb),0.04));
            border: 1px solid rgba(var(--accent-color-rgb),0.15);
            border-radius: 12px;
            cursor: pointer;
            text-align: left;
            font-size: 13px;
            transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
            color: var(--text-primary);
            font-family: var(--font-family);
            width: 100%;
        `;
        btn.addEventListener('mouseover', () => {
            btn.style.background = 'linear-gradient(135deg, rgba(var(--accent-color-rgb),0.12), rgba(var(--accent-color-rgb),0.06))';
            btn.style.borderColor = 'var(--accent-color)';
            btn.style.transform = 'translateX(4px)';
        });
        btn.addEventListener('mouseout', () => {
            btn.style.background = 'linear-gradient(135deg, var(--secondary-bg), rgba(var(--accent-color-rgb),0.04))';
            btn.style.borderColor = 'rgba(var(--accent-color-rgb),0.15)';
            btn.style.transform = '';
        });
        btn.onclick = () => {
            addMessage({
                id: Date.now(), 
                text: _formatPokeText(`${settings.myName} ${pokeText}`), 
                timestamp: new Date(), 
                type: 'system'
            });
            document.getElementById('user-sticker-picker').classList.remove('active');
            const delayRange = settings.replyDelayMax - settings.replyDelayMin;
            const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
            setTimeout(simulateReply, randomDelay);
        };
        area.appendChild(btn);
    });
    
    const customBtn = document.createElement('button');
    customBtn.innerHTML = '<i class="fas fa-edit"></i> 自定义拍一拍';
    customBtn.style.cssText = `
        padding: 11px 14px;
        background: linear-gradient(135deg, var(--accent-color), rgba(var(--accent-color-rgb),0.8));
        color: #fff;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        width: 100%;
        letter-spacing: 0.3px;
        margin-top: 4px;
        box-shadow: 0 4px 14px rgba(var(--accent-color-rgb), 0.25);
    `;
    customBtn.onclick = () => {
        document.getElementById('user-sticker-picker').classList.remove('active');
        showModal(DOMElements.pokeModal.modal, DOMElements.pokeModal.input);
    };
    area.appendChild(customBtn);
}
        function initCoreListeners() {


            DOMElements.chatContainer.addEventListener('scroll', () => {
                const container = DOMElements.chatContainer;


                if (container.scrollTop < 50 && !isLoadingHistory && messages.length > displayedMessageCount) {
                    isLoadingHistory = true;


                    const loader = document.getElementById('history-loader');
                    if (loader) loader.classList.add('visible');


                    setTimeout(() => {

                        displayedMessageCount += HISTORY_BATCH_SIZE;


                        renderMessages(true);


                        if (loader) loader.classList.remove('visible');
                        isLoadingHistory = false;
                    },
                        600);
                }
            });

            DOMElements.sendBtn.addEventListener('click', () => isBatchMode ? addToBatch(): sendMessage());
            DOMElements.messageInput.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); isBatchMode ? addToBatch(): sendMessage();
                }
            });
            DOMElements.messageInput.addEventListener('input', () => {
                DOMElements.messageInput.style.height = 'auto'; DOMElements.messageInput.style.height = `${Math.min(DOMElements.messageInput.scrollHeight, 120)}px`;
            });


            DOMElements.attachmentBtn.addEventListener('click', () => {

                const modal = document.createElement('div');
                modal.className = 'modal image-upload-modal';
                modal.style.cssText = `
            display: flex !important;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 9999;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
            opacity: 0;
            transition: opacity 0.3s ease;
            `;

                modal.innerHTML = `
            <div class="modal-content" style="
            z-index: 10000;
            position: relative;
            background-color: var(--secondary-bg);
            border-radius: var(--radius);
            padding: 24px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            transform: translateY(20px);
            opacity: 0;
            transition: all 0.3s ease;
            ">
            <div class="modal-title"><i class="fas fa-image"></i><span>发送图片</span></div>
            <div style="margin-bottom: 16px;">
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <button class="modal-btn modal-btn-secondary upload-mode-btn active" id="upload-image-file-btn" style="flex: 1;">选择文件</button>
            <button class="modal-btn modal-btn-secondary upload-mode-btn" id="paste-image-url-btn" style="flex: 1;">粘贴URL</button>
            </div>
            <input type="file" class="modal-input" id="image-file-input" accept="image/*">
            <input type="text" class="modal-input" id="image-url-input" placeholder="输入图片URL地址" style="display: none;">
            <div id="image-preview" style="text-align: center; margin-top: 10px; display: none;">
            <img id="preview-chat-image" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid var(--border-color);">
            </div>
            </div>
            <div class="modal-buttons">
            <button class="modal-btn modal-btn-secondary" id="cancel-image">取消</button>
            <button class="modal-btn modal-btn-primary" id="send-image" disabled>发送</button>
            </div>
            </div>
            `;

                document.body.appendChild(modal);


                setTimeout(() => {
                    modal.style.opacity = '1';
                    const content = modal.querySelector('.modal-content');
                    content.style.opacity = '1';
                    content.style.transform = 'translateY(0)';
                }, 10);

                const fileInput = document.getElementById('image-file-input');
                const urlInput = document.getElementById('image-url-input');
                const uploadBtn = document.getElementById('upload-image-file-btn');
                const pasteUrlBtn = document.getElementById('paste-image-url-btn');
                const previewDiv = document.getElementById('image-preview');
                const previewImg = document.getElementById('preview-chat-image');
                const sendBtn = document.getElementById('send-image');
                const cancelBtn = document.getElementById('cancel-image');
                const uploadModeBtns = document.querySelectorAll('.upload-mode-btn');

                let currentImageData = null;


                function switchUploadMode(isFileMode) {
                    uploadModeBtns.forEach(btn => btn.classList.remove('active'));
                    if (isFileMode) {
                        uploadBtn.classList.add('active');
                        fileInput.style.display = 'block';
                        urlInput.style.display = 'none';
                    } else {
                        pasteUrlBtn.classList.add('active');
                        fileInput.style.display = 'none';
                        urlInput.style.display = 'block';
                        urlInput.focus();
                    }

                    previewDiv.style.display = 'none';
                    sendBtn.disabled = true;
                    currentImageData = null;
                }


                uploadBtn.addEventListener('click', () => switchUploadMode(true));


                pasteUrlBtn.addEventListener('click', () => switchUploadMode(false));


                fileInput.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        if (file.size > MAX_IMAGE_SIZE) {
                            showNotification('图片大小不能超过5MB', 'error');
                            return;
                        }
                        showNotification('正在优化图片...', 'info', 1500);
                        optimizeImage(file).then(optimizedData => {
                            currentImageData = optimizedData;
                            previewImg.src = currentImageData;
                            previewDiv.style.display = 'block';
                            sendBtn.disabled = false;
                        }).catch(() => {
                            showNotification('图片处理失败', 'error');
                        });
                    }
                });


                urlInput.addEventListener('input',
                    function() {
                        const url = urlInput.value.trim();
                        if (url) {

                            if (/^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|bmp))$/i.test(url)) {
                                previewImg.src = url;
                                previewDiv.style.display = 'block';
                                currentImageData = url;
                                sendBtn.disabled = false;


                                const img = new Image();
                                img.onload = function() {

                                    previewImg.src = url;
                                    showNotification('图片URL有效', 'success', 1000);
                                };
                                img.onerror = function() {
                                    showNotification('图片URL无效或无法访问', 'error');
                                    sendBtn.disabled = true;
                                    previewDiv.style.display = 'none';
                                };
                                img.src = url;
                            } else {
                                sendBtn.disabled = true;
                                previewDiv.style.display = 'none';
                            }
                        } else {
                            sendBtn.disabled = true;
                            previewDiv.style.display = 'none';
                        }
                    });


                sendBtn.addEventListener('click',
                    () => {
                        if (currentImageData) {

                            addMessage({
                                id: Date.now(),
                                sender: 'user',
                                text: '',
                                timestamp: new Date(),
                                image: currentImageData,
                                status: 'sent',
                                favorited: false,
                                note: null,
                                replyTo: currentReplyTo,
                                type: 'normal'
                            });
                            playSound('send');
                            currentReplyTo = null;
                            updateReplyPreview();
                            const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                            const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
                            setTimeout(simulateReply, randomDelay);


                            closeModal();
                        }
                    });


                cancelBtn.addEventListener('click',
                    closeModal);


                function closeModal() {
                    modal.style.opacity = '0';
                    const content = modal.querySelector('.modal-content');
                    content.style.opacity = '0';
                    content.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        if (modal.parentNode) {
                            modal.parentNode.removeChild(modal);
                        }
                    },
                        300);
                }


                modal.addEventListener('click',
                    (e) => {
                        if (e.target === modal) {
                            closeModal();
                        }
                    });


                modal.querySelector('.modal-content').addEventListener('click',
                    (e) => {
                        e.stopPropagation();
                    });


                const handleEscKey = (e) => {
                    if (e.key === 'Escape') {
                        closeModal();
                        document.removeEventListener('keydown', handleEscKey);
                    }
                };
                document.addEventListener('keydown', handleEscKey);


                modal.addEventListener('close', () => {
                    document.removeEventListener('keydown', handleEscKey);
                });
            });


            DOMElements.imageInput.addEventListener('change', () => {
                if (DOMElements.imageInput.files[0]) {
                    if (isBatchMode) {
                        showNotification('批量模式不支持图片', 'warning');
                        DOMElements.imageInput.value = '';
                    } else {
                        sendMessage();
                    }
                }
            });

            DOMElements.continueBtn.addEventListener('click', simulateReply);
            DOMElements.batchBtn.addEventListener('click', toggleBatchMode);
        }

