/**
 * utils.js - Utility Functions
 * 工具函数
 */

        function safeGetItem(key) {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                console.error('Error getting item:', e);
                return null;
            }
        }

        function safeSetItem(key, value) {
            try {
                if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }
                localStorage.setItem(key, value);
            } catch (e) {
                console.error('Error setting item:', e);
            }
        }

        function safeRemoveItem(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.error('Error removing item:', e);
            }
        }
        
function normalizeStringStrict(s) {
    if (typeof s !== 'string') return '';
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function deduplicateContentArray(arr, baseSystemArray = []) {
    const seen = new Set(baseSystemArray.map(normalizeStringStrict));
    const result = [];
    let removedCount = 0;
    
    for (const item of arr) {
        const norm = normalizeStringStrict(item);
        if (norm !== '' && !seen.has(norm)) {
            seen.add(norm);
            result.push(item);
        } else {
            removedCount++;
        }
    }
    return { result, removedCount };
}

        function cropImageToSquare(file, maxSize = 640) { 
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const minSide = Math.min(img.width, img.height);
                        const sx = (img.width - minSide) / 2;
                        const sy = (img.height - minSide) / 2;

                        const canvas = document.createElement('canvas');
                        canvas.width = maxSize;
                        canvas.height = maxSize;
                        const ctx = canvas.getContext('2d');

                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';

                        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxSize, maxSize);

                        resolve(canvas.toDataURL('image/jpeg', 0.95));
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        function exportDataToMobileOrPC(dataString, fileName) {
            if (navigator.share && navigator.canShare) {
                try {
                    const blob = new Blob([dataString], { type: 'application/json' });
                    const file = new File([blob], fileName, { type: 'application/json' });
                    if (navigator.canShare({ files: [file] })) {
                        navigator.share({
                            files: [file],
                            title: '传讯数据备份',
                            text: '这是您的回复库备份文件，请选择“保存到文件”或发送给好友。'
                        }).then(() => {
                        }).catch((err) => {
                            console.warn('分享未完成，尝试回退下载模式:', err);
                            downloadFileFallback(blob, fileName);
                        });
                        return;
                    }
                } catch (e) {
                    console.log("移动端分享构建失败，转为普通下载", e);
                }
            }
            const blob = new Blob([dataString], { type: 'application/json' });
            downloadFileFallback(blob, fileName);
        }

        function downloadFileFallback(blob, fileName) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        }
        
        localforage.config({
            driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
            name: 'ChatApp_V3',
            version: 1.0,
            storeName: 'chat_data',
            description: 'Storage for Chat App V3'
        });


        function showNotification(message, type = 'info', duration = 3000) {
            const existingNotification = document.querySelector('.notification');
            if (existingNotification) existingNotification.remove();

            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            const iconMap = {
                success: 'fa-check-circle',
                error: 'fa-exclamation-circle',
                info: 'fa-info-circle',
                warning: 'fa-exclamation-triangle'
            };
            notification.innerHTML = `<i class="fas ${iconMap[type] || 'fa-info-circle'}"></i><span>${message}</span>`;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.classList.add('hiding');
                notification.addEventListener('animationend', () => notification.remove());
            }, duration);
        }

        const playSound = (type) => {
            if (!settings.soundEnabled) return;
            try {
                if (settings.customSoundUrl && settings.customSoundUrl.trim()) {
                    const audio = new Audio(settings.customSoundUrl.trim());
                    audio.volume = Math.min(1, Math.max(0, settings.soundVolume || 0.15));
                    audio.play().catch(() => {});
                    return;
                }
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.type = 'sine';
                const vol = Math.min(0.5, Math.max(0.01, settings.soundVolume || 0.1));
                gainNode.gain.setValueAtTime(vol, audioContext.currentTime);
                if (type === 'send') oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                else if (type === 'favorite') oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
                else oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                oscillator.start();
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.15);
                oscillator.stop(audioContext.currentTime + 0.15);
            } catch (e) {
                console.warn("音频播放失败:", e);
            }
        };

        const throttledSaveData = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveData, 500);
        };

async function applyCustomFont(url) {
    if (!url || !url.trim()) {
        document.documentElement.style.removeProperty('--font-family');
        document.documentElement.style.removeProperty('--message-font-family');
        return;
    }
    
    const fontName = 'UserCustomFont';
    try {
        const font = new FontFace(fontName, `url(${url})`);
        await font.load();
        document.fonts.add(font);
        
        const fontStack = `"${fontName}", 'Noto Serif SC', serif`;
        document.documentElement.style.setProperty('--font-family', fontStack);
        document.documentElement.style.setProperty('--message-font-family', fontStack);
        if (typeof settings !== 'undefined') {
            settings.messageFontFamily = fontStack;
        }
        
        console.log('字体加载成功');
    } catch (e) {
        console.error('字体加载失败:', e);
        showNotification('字体加载失败，请检查链接是否有效', 'error');
    }
}


function applyCustomBubbleCss(cssCode) {
    const styleId = 'user-custom-bubble-style';
    let styleTag = document.getElementById(styleId);
    
    if (!cssCode || !cssCode.trim()) {
        if (styleTag) styleTag.remove();
        return;
    }

    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }
    
    // Ensure image-only bubbles stay transparent even when custom CSS applies
    styleTag.textContent = cssCode + `
.message.message-image-bubble-none,
.message-image-bubble-none {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
}`;
}

function applyGlobalThemeCss(cssCode) {
    const styleId = 'user-custom-global-theme-style';
    let styleTag = document.getElementById(styleId);

    if (!cssCode || !cssCode.trim()) {
        if (styleTag) styleTag.remove();
        return;
    }

    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }

    styleTag.textContent = cssCode;
}
