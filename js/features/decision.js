/**
 * features/decision.js - 抉择模块 Decision & Picker
 * 命运转盘与随机选择器
 */

let wheelOptions = ["是", "否", "再想一想", "听你的"];
let wheelResultText = "";

function initDecisionModule() {
    const entryBtn = document.getElementById('decision-function'); 
    if(entryBtn) {
        const newBtn = entryBtn.cloneNode(true);
        entryBtn.parentNode.replaceChild(newBtn, entryBtn);
        newBtn.addEventListener('click', () => {
            hideModal(document.getElementById('advanced-modal'));
            showModal(document.getElementById('decision-menu-modal'));
        });
    }

    const openCoinBtn = document.getElementById('open-coin-toss');
    const openWheelBtn = document.getElementById('open-wheel');
    const closeMenuBtn = document.getElementById('close-decision-menu');
    const closeWheelBtn = document.getElementById('close-wheel');
    const addOptionBtn = document.getElementById('add-wheel-option');
    const spinBtn = document.getElementById('spin-wheel-btn');
    const sendResultBtn = document.getElementById('send-wheel-result');

    if (openCoinBtn && !openCoinBtn.dataset.initialized) {
        openCoinBtn.addEventListener('click', () => {
            hideModal(document.getElementById('decision-menu-modal'));
            handleCoinToss();
        });
        openCoinBtn.dataset.initialized = 'true';
    }

    if (openWheelBtn && !openWheelBtn.dataset.initialized) {
        openWheelBtn.addEventListener('click', () => {
            hideModal(document.getElementById('decision-menu-modal'));
            initPicker();
            showModal(document.getElementById('wheel-modal'));
        });
        openWheelBtn.dataset.initialized = 'true';
    }
    
    if (closeMenuBtn && !closeMenuBtn.dataset.initialized) {
        closeMenuBtn.addEventListener('click', () => hideModal(document.getElementById('decision-menu-modal')));
        closeMenuBtn.dataset.initialized = 'true';
    }

    if (closeWheelBtn && !closeWheelBtn.dataset.initialized) {
        closeWheelBtn.addEventListener('click', () => hideModal(document.getElementById('wheel-modal')));
        closeWheelBtn.dataset.initialized = 'true';
    }

    if (addOptionBtn && !addOptionBtn.dataset.initialized) {
        addOptionBtn.addEventListener('click', () => {
            wheelOptions.push(`选项 ${wheelOptions.length + 1}`);
            renderPickerOptions();
            renderPickerCards();
        });
        addOptionBtn.dataset.initialized = 'true';
    }

    if (spinBtn && !spinBtn.dataset.initialized) {
        spinBtn.addEventListener('click', doPick);
        spinBtn.dataset.initialized = 'true';
    }
    
    if (sendResultBtn && !sendResultBtn.dataset.initialized) {
        sendResultBtn.addEventListener('click', () => {
            if(wheelResultText) {
                sendMessage(`✨ 随机抽签结果：${wheelResultText}`, 'normal');
                hideModal(document.getElementById('wheel-modal'));
                wheelResultText = "";
                sendResultBtn.style.display = 'none';
                const resultEl = document.getElementById('wheel-result');
                if (resultEl) { resultEl.textContent = ""; resultEl.classList.remove('show'); }
                spinBtn.disabled = false;
            }
        });
        sendResultBtn.dataset.initialized = 'true';
    }
}

function initPicker() {
    renderPickerOptions();
    renderPickerCards();
    const result = document.getElementById('wheel-result');
    const sendBtn = document.getElementById('send-wheel-result');
    const spinBtn = document.getElementById('spin-wheel-btn');
    if (result) { result.textContent = ""; result.classList.remove('show'); }
    if (sendBtn) sendBtn.style.display = 'none';
    if (spinBtn) spinBtn.disabled = false;
    wheelResultText = "";
}

function renderPickerOptions() {
    const list = document.getElementById('wheel-options-list');
    if (!list) return;
    list.innerHTML = '';
    const colors = ['#FFD93D','#FF6B6B','#6BCB77','#4D96FF','#E0C3FC','#FF9A8B','#A8D8EA','#C44569'];
    wheelOptions.forEach((opt, index) => {
        const item = document.createElement('div');
        item.className = 'picker-option-item';
        item.innerHTML = `
            <div class="picker-option-color-dot" style="background:${colors[index % colors.length]}"></div>
            <input type="text" class="picker-option-input" value="${opt}" placeholder="输入选项...">
            <span class="picker-option-remove"><i class="fas fa-times"></i></span>
        `;
        item.querySelector('input').addEventListener('input', (e) => {
            wheelOptions[index] = e.target.value;
            renderPickerCards();
        });
        item.querySelector('.picker-option-remove').addEventListener('click', () => {
            if(wheelOptions.length <= 2) {
                showNotification('至少保留两个选项', 'warning');
                return;
            }
            wheelOptions.splice(index, 1);
            renderPickerOptions();
            renderPickerCards();
        });
        list.appendChild(item);
    });
}

function renderPickerCards(selectedIndex = -1) {
    const row = document.getElementById('picker-cards-row');
    if (!row) return;
    const colors = ['#FFD93D','#FF6B6B','#6BCB77','#4D96FF','#E0C3FC','#FF9A8B','#A8D8EA','#C44569'];
    row.innerHTML = '';
    wheelOptions.forEach((opt, i) => {
        const card = document.createElement('div');
        card.className = 'picker-card';
        if (selectedIndex >= 0) {
            if (i === selectedIndex) card.classList.add('selected');
            else card.classList.add('unselected');
        }
        if (selectedIndex >= 0 && i === selectedIndex) {
            card.style.background = `linear-gradient(135deg, ${colors[i % colors.length]}, ${colors[(i+2) % colors.length]})`;
        } else {
            card.style.borderTop = `3px solid ${colors[i % colors.length]}`;
        }
        card.style.animationDelay = (i * 0.06) + 's';
        const label = opt || `选项${i+1}`;
        card.textContent = label.length > 6 ? label.slice(0,5) + '…' : label;
        row.appendChild(card);
    });
}

function doPick() {
    if (wheelOptions.length < 2) {
        showNotification("请至少添加两个选项", "warning");
        return;
    }
    const spinBtn = document.getElementById('spin-wheel-btn');
    const resultDisplay = document.getElementById('wheel-result');
    const sendBtn = document.getElementById('send-wheel-result');
    
    spinBtn.disabled = true;
    sendBtn.style.display = 'none';
    resultDisplay.classList.remove('show');
    resultDisplay.textContent = "";

    let flashCount = 0;
    const totalFlashes = 16 + Math.floor(Math.random() * 8);
    const finalIndex = Math.floor(Math.random() * wheelOptions.length);
    
    function flash() {
        const row = document.getElementById('picker-cards-row');
        if (!row) return;
        const cards = row.querySelectorAll('.picker-card');
        cards.forEach(c => c.style.transform = '');
        
        let showIdx;
        if (flashCount < totalFlashes - 3) {
            showIdx = Math.floor(Math.random() * wheelOptions.length);
        } else {
            showIdx = finalIndex;
        }
        
        cards.forEach((c, i) => {
            if (i === showIdx) {
                c.style.transform = 'translateY(-4px) scale(1.06)';
                c.style.background = `linear-gradient(135deg, var(--accent-color), rgba(var(--accent-color-rgb),0.7))`;
                c.style.borderColor = 'transparent';
                c.style.color = '#fff';
            } else {
                c.style.transform = '';
                c.style.background = '';
                c.style.borderColor = '';
                c.style.color = '';
            }
        });
        
        flashCount++;
        const delay = flashCount < 8 ? 80 : flashCount < 14 ? 130 : 250;
        if (flashCount < totalFlashes) {
            setTimeout(flash, delay);
        } else {
            setTimeout(() => {
                renderPickerCards(finalIndex);
                wheelResultText = wheelOptions[finalIndex];
                resultDisplay.innerHTML = `<i class="fas fa-star" style="font-size:14px; margin-right:6px;"></i>${wheelResultText}`;
                resultDisplay.classList.add('show');
                spinBtn.disabled = false;
                sendBtn.style.display = 'inline-block';
                playSound('favorite');
            }, 300);
        }
    }
    
    flash();
}

/**
 * handleCoinToss - 抛硬币入口
 * 显示抛硬币覆盖层并开始动画
 */
function handleCoinToss() {
    const overlay = DOMElements.coinTossOverlay;
    if (!overlay) return;
    overlay.classList.remove('finished');
    overlay.classList.add('visible');
    const resultText = DOMElements.coinResultText;
    if (resultText) resultText.textContent = '';
    const sendBtn = DOMElements.sendCoinResult;
    if (sendBtn) sendBtn.style.display = 'none';
    const retryBtn = document.getElementById('retry-coin-toss');
    if (retryBtn) retryBtn.style.display = 'none';
    // Clear any previously locked transform
    if (DOMElements.animatedCoin) DOMElements.animatedCoin.style.transform = '';
    startCoinFlipAnimation();
}
window.handleCoinToss = handleCoinToss;

/**
 * startCoinFlipAnimation - 执行硬币翻转动画并显示结果
 * 修复：动画结束后硬币朝向与结果文字严格同步
 */
function startCoinFlipAnimation() {
    const coin = DOMElements.animatedCoin;
    const resultText = DOMElements.coinResultText;
    const overlay = DOMElements.coinTossOverlay;
    if (!coin || !overlay) return;

    // Reset
    overlay.classList.remove('finished');
    if (resultText) resultText.textContent = '';
    const sendBtn = DOMElements.sendCoinResult;
    if (sendBtn) sendBtn.style.display = 'none';
    const retryBtn = document.getElementById('retry-coin-toss');
    if (retryBtn) retryBtn.style.display = 'none';

    // Decide outcome FIRST, then build animation to match
    const isHeads = Math.random() < 0.5;
    const result = isHeads ? '正面 ☀️' : '反面 🌙';
    lastCoinResult = result;

    // Remove all animation classes and force reflow
    coin.classList.remove('flipping-heads', 'flipping-tails', 'coin-show-front', 'coin-show-back');
    void coin.offsetWidth;

    // Add the correct flip animation
    // flipping-heads ends at rotateY(2160deg) = 0 mod 360 → front face visible
    // flipping-tails ends at rotateY(2340deg) = 180 mod 360 → back face visible
    coin.classList.add(isHeads ? 'flipping-heads' : 'flipping-tails');

    // Animation duration is 3s; wait 3s + small buffer then show result
    setTimeout(() => {
        coin.classList.remove('flipping-heads', 'flipping-tails');
        // Lock final rotation so the coin stays on the correct side
        coin.style.transform = isHeads ? 'rotateY(0deg)' : 'rotateY(180deg)';
        if (resultText) resultText.textContent = result;
        overlay.classList.add('finished');
        if (sendBtn) sendBtn.style.display = '';
        if (retryBtn) retryBtn.style.display = '';
        if (typeof playSound === 'function') playSound('favorite');
    }, 3050);
}
window.startCoinFlipAnimation = startCoinFlipAnimation;

function initComboMenu() {
    const comboBtn = document.getElementById('combo-btn');
    const picker = document.getElementById('user-sticker-picker');
    const contentArea = document.getElementById('combo-content-area');
    
    if (!comboBtn || !picker) return;
    
    if (comboBtn.dataset.initialized) return;
    
    comboBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = picker.classList.contains('active');
        
        if (isActive) {
            picker.classList.remove('active');
        } else {
            switchTab('my-sticker');
            picker.classList.add('active');
        }
    });
    
    comboBtn.dataset.initialized = 'true';

    document.addEventListener('click', (e) => {
        if (!picker.contains(e.target) && !comboBtn.contains(e.target)) {
            picker.classList.remove('active');
        }
    });

    const tabs = picker.querySelectorAll('.combo-tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tabId = btn.dataset.tab;
            switchTab(tabId);
        });
    });

    function updateAddBtnVisibility(tabId) {
        const addBtn = document.getElementById('sticker-add-btn');
        if (addBtn) addBtn.style.display = (tabId === 'my-sticker') ? 'flex' : 'none';
    }

    function switchTab(tabId) {
        tabs.forEach(b => b.classList.remove('active'));
        const activeBtn = Array.from(tabs).find(b => b.dataset.tab === tabId);
        if (activeBtn) activeBtn.classList.add('active');
        updateAddBtnVisibility(tabId);

        if (tabId === 'my-sticker') {
            renderMyStickerLibrary();
        } else if (tabId === 'partner-sticker') {
            renderPartnerStickerLibrary();
        } else {
            renderUserPokeMenu();
        }
    }

    function makeStickerItem(src, onClick) {
        const item = document.createElement('div');
        item.className = 'sticker-grid-item';
        item.innerHTML = `<img src="${src}" loading="lazy">`;
        item.onclick = (e) => { e.stopPropagation(); onClick(); };
        return item;
    }

    function makeDeletableStickerItem(src, onClick, onDelete) {
        const item = document.createElement('div');
        item.className = 'sticker-grid-item';
        item.style.position = 'relative';
        item.innerHTML = `<img src="${src}" loading="lazy"><div class="sticker-delete-btn" title="删除"><i class="fas fa-times"></i></div>`;
        item.querySelector('img').onclick = (e) => { e.stopPropagation(); onClick(); };
        item.querySelector('.sticker-delete-btn').onclick = (e) => { e.stopPropagation(); onDelete(); };
        return item;
    }

    function renderMyStickerLibrary() {
        contentArea.innerHTML = '';
        if (!myStickerLibrary || myStickerLibrary.length === 0) {
            contentArea.innerHTML = `
                <div class="empty-sticker-tip">
                    <i class="fas fa-user-circle"></i>
                    还没有我的专属表情哦<br>
                    点击右上角"添加"按钮上传图片~
                </div>
            `;
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'sticker-grid-view';
        myStickerLibrary.forEach((src, idx) => {
            const item = makeDeletableStickerItem(src, () => {
                addMessage({ id: Date.now(), sender: 'user', text: '', timestamp: new Date(), image: src, status: 'sent', type: 'normal' });
                playSound('send');
                picker.classList.remove('active');
                const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                setTimeout(simulateReply, settings.replyDelayMin + Math.random() * delayRange);
            }, () => {
                myStickerLibrary.splice(idx, 1);
                localforage.setItem(getStorageKey('myStickerLibrary'), myStickerLibrary);
                showNotification('✓ 已删除', 'success');
                renderMyStickerLibrary();
            });
            grid.appendChild(item);
        });
        contentArea.appendChild(grid);
    }

    function renderPartnerStickerLibrary() {
        contentArea.innerHTML = '';
        if (!stickerLibrary || stickerLibrary.length === 0) {
            contentArea.innerHTML = `
                <div class="empty-sticker-tip">
                    <i class="far fa-images"></i>
                    对方表情库还是空的哦<br>
                    请去"高级功能"->"自定义回复"->"表情库"中添加图片~
                </div>
            `;
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'sticker-grid-view';
        stickerLibrary.forEach(src => {
            const item = makeStickerItem(src, () => {
                addMessage({ id: Date.now(), sender: 'user', text: '', timestamp: new Date(), image: src, status: 'sent', type: 'normal' });
                playSound('send');
                picker.classList.remove('active');
                const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                setTimeout(simulateReply, settings.replyDelayMin + Math.random() * delayRange);
            });
            grid.appendChild(item);
        });
        contentArea.appendChild(grid);
    }

    function renderStickerLibrary() { renderMyStickerLibrary(); }
    function renderUserPokeMenu() {
        contentArea.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'poke-list-view';

        const customBtn = document.createElement('button');
        customBtn.className = 'custom-poke-btn';
        customBtn.innerHTML = '<i class="fas fa-pen"></i> 自定义动作';
        customBtn.onclick = (e) => {
            e.stopPropagation();
            picker.classList.remove('active');
            showModal(DOMElements.pokeModal.modal, DOMElements.pokeModal.input);
        };
        wrapper.appendChild(customBtn);

        const userPresets = [
            "拍了拍对方的头",
            "戳了戳对方的脸颊",
            "抱住了对方",
            "给对方比了个心",
            "牵起了对方的手",
            "看着对方发呆"
        ];

        const title = document.createElement('div');
        title.style.fontSize = '12px';
        title.style.color = 'var(--text-secondary)';
        title.style.marginBottom = '5px';
        title.innerText = '快捷动作';
        wrapper.appendChild(title);

        userPresets.forEach(text => {
            const item = document.createElement('div');
            item.className = 'poke-quick-item';
            item.innerText = text;
            item.onclick = (e) => {
                e.stopPropagation();
                addMessage({
                    id: Date.now(),
                    text: _formatPokeText(`${settings.myName} ${text}`), 
                    timestamp: new Date(),
                    type: 'system' 
                });
                picker.classList.remove('active');
                
                setTimeout(simulateReply, 1500);
            };
            wrapper.appendChild(item);
        });

        contentArea.appendChild(wrapper);
    }
}
