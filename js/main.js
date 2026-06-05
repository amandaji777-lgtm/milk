// ===================== STATE =====================
const S = {
  settings: {
    myName:'我', partnerName:'梦角',
    myStatus:'在线', partnerStatus:'在线',
    myAvatar:null, partnerAvatar:null,
    theme:'light', accent:'#c5a47e',
    wallpaper:null, wallOpacity:35,
    fontSize:15, bubbleCSS:'',
    replyMin:3, replyMax:7,
    sound:true, typing:true, quoteEnabled:true,
    energy:{ me:'', partner:'', rel:'' }
  },
  messages:[],
  flashcards:[],
  noteOptions:[],
  energyOptions:{ me:[], partner:[], rel:[] },
  stickers:{ my:[], partner:[] },
  anniversaries:[],
  letters:[]
};

let replyTarget = null;    // quoted message
let ctxTarget = null;      // right-clicked message el
let avTarget = null;       // 'me' | 'partner'
let editCallback = null;
let callTimer = null;
let callSec = 0;
let noteSender = 'me';
let letterTab = 'write';
let emojiTab = 'emoji';
let pendingLetterCheck = false;

// ===================== STORAGE =====================
const STORE_KEY = 'mjchat_v1';
async function load() {
  try {
    const d = await localforage.getItem(STORE_KEY);
    if (d) {
      if (d.settings)      Object.assign(S.settings, d.settings);
      if (d.messages)      S.messages = d.messages;
      if (d.flashcards)    S.flashcards = d.flashcards;
      if (d.noteOptions)   S.noteOptions = d.noteOptions;
      if (d.energyOptions) Object.assign(S.energyOptions, d.energyOptions);
      if (d.stickers)      Object.assign(S.stickers, d.stickers);
      if (d.anniversaries) S.anniversaries = d.anniversaries;
      if (d.letters)       S.letters = d.letters;
    }
  } catch(e){}
}
function save() {
  localforage.setItem(STORE_KEY, {
    settings:S.settings, messages:S.messages, flashcards:S.flashcards,
    noteOptions:S.noteOptions, energyOptions:S.energyOptions,
    stickers:S.stickers, anniversaries:S.anniversaries, letters:S.letters
  });
}

// ===================== AUDIO =====================
let audioCtx = null;
function playKakao() {
  if (!S.settings.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = 'sine'; o.frequency.setValueAtTime(880, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.08);
    g.gain.setValueAtTime(0.18, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    o.start(); o.stop(audioCtx.currentTime + 0.18);
  } catch(e){}
}

// ===================== TOAST =====================
let toastTmo = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTmo);
  toastTmo = setTimeout(() => el.classList.remove('show'), 2000);
}

// ===================== UI HELPERS =====================
function openOv(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeOv(id) {
  document.getElementById(id)?.classList.remove('open');
}
function closeAll() {
  document.querySelectorAll('.ov.open').forEach(el => el.classList.remove('open'));
}

// ===================== APPLY SETTINGS =====================
function applySettings() {
  const s = S.settings;
  document.documentElement.dataset.theme = s.theme;
  document.documentElement.style.setProperty('--accent', s.accent);
  const rgb = hexToRgb(s.accent);
  document.documentElement.style.setProperty('--accent-rgb', rgb);
  document.documentElement.style.setProperty('--font-size', s.fontSize + 'px');
  // wallpaper
  const bg = document.getElementById('chat-bg');
  if (s.wallpaper) {
    bg.style.backgroundImage = `url(${s.wallpaper})`;
    bg.style.opacity = s.wallOpacity / 100;
  } else {
    bg.style.backgroundImage = '';
  }
  // avatars
  setAvatarEl('partner-av', s.partnerAvatar);
  setAvatarEl('my-av', s.myAvatar);
  // names
  document.getElementById('partner-nm').textContent = s.partnerName;
  document.getElementById('my-nm').textContent = s.myName;
  document.getElementById('partner-st').textContent = s.partnerStatus;
  document.getElementById('my-st').textContent = s.myStatus;
  // typing avatar
  setAvatarEl('t-av', s.partnerAvatar, true);
  // call avatars
  setAvatarEl('c-av-in', s.partnerAvatar);
  setAvatarEl('c-av-act', s.partnerAvatar);
  document.getElementById('c-nm-in').textContent = s.partnerName;
  document.getElementById('c-nm-act').textContent = s.partnerName;
  // bubble css
  document.getElementById('bbl-css-tag').textContent = s.bubbleCSS || '';
}
function setAvatarEl(id, src, small) {
  const el = document.getElementById(id);
  if (!el) return;
  if (src) {
    el.innerHTML = `<img src="${src}" alt="">`;
  } else {
    el.innerHTML = `<i class="fas fa-user" style="font-size:${small?'10':'14'}px;"></i>`;
  }
}
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// ===================== MESSAGES =====================
function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
}
function fmtDate(ts) {
  const d = new Date(ts), now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function renderMessages() {
  const wrap = document.getElementById('chat-wrap');
  // remove all except bg and typing
  const bg = document.getElementById('chat-bg');
  const ti = document.getElementById('typing-ind');
  wrap.innerHTML = '';
  wrap.appendChild(bg);
  wrap.appendChild(ti);

  let lastDate = null;
  S.messages.forEach(m => {
    const d = fmtDate(m.ts);
    if (d !== lastDate) {
      const div = document.createElement('div');
      div.className = 'date-div';
      div.textContent = d;
      wrap.insertBefore(div, ti);
      lastDate = d;
    }
    wrap.insertBefore(buildMsgEl(m), ti);
  });
  scrollBottom();
}

function buildMsgEl(m) {
  const isSent = m.side === 'sent';
  const s = S.settings;

  if (m.type === 'poke') {
    const row = document.createElement('div');
    row.className = 'poke-row';
    row.dataset.id = m.id;
    row.textContent = m.text;
    return row;
  }

  const row = document.createElement('div');
  row.className = `msg-row ${isSent ? 'sent' : 'recv'}`;
  row.dataset.id = m.id;

  const avSrc = isSent ? s.myAvatar : s.partnerAvatar;
  const av = document.createElement('div');
  av.className = 'msg-av';
  av.innerHTML = avSrc ? `<img src="${avSrc}" alt="">` : `<i class="fas fa-user" style="font-size:12px;"></i>`;
  av.addEventListener('dblclick', () => sendPoke(isSent));
  av.addEventListener('click', (e) => { e.stopPropagation(); });

  const body = document.createElement('div');
  body.className = 'msg-body';

  // quote bar
  if (m.quoteText) {
    const q = document.createElement('div');
    q.className = 'quote-bar';
    q.textContent = `↩ ${m.quoteText}`;
    body.appendChild(q);
  }

  // bubble
  const bbl = document.createElement('div');

  if (m.type === 'note') {
    bbl.className = 'msg-bbl note-bbl';
    bbl.innerHTML = `<i class="fas fa-scroll"></i><span>${m.text}</span>`;
    bbl.addEventListener('click', () => viewNote(m));
  } else if (m.type === 'letter-notify') {
    bbl.className = 'msg-bbl letter-bbl';
    bbl.innerHTML = `<i class="fas fa-envelope"></i><span>${m.text}</span>`;
    bbl.addEventListener('click', () => viewLetterById(m.letterId, m.side === 'recv'));
  } else if (m.type === 'image') {
    bbl.className = 'msg-bbl img-bbl';
    const img = document.createElement('img');
    img.src = m.src;
    img.addEventListener('click', () => {
      window.open(m.src, '_blank');
    });
    bbl.appendChild(img);
  } else {
    bbl.className = 'msg-bbl';
    bbl.textContent = m.text;
  }

  // long press / right click for context menu
  if (m.type !== 'note' && m.type !== 'letter-notify') {
    let pressTimer;
    const showCtx = (x, y) => {
      ctxTarget = m;
      const ctx = document.getElementById('ctx');
      ctx.style.left = Math.min(x, window.innerWidth - 160) + 'px';
      ctx.style.top = Math.min(y, window.innerHeight - 120) + 'px';
      ctx.classList.add('open');
    };
    bbl.addEventListener('contextmenu', e => { e.preventDefault(); showCtx(e.clientX, e.clientY); });
    bbl.addEventListener('touchstart', e => { pressTimer = setTimeout(() => { const t = e.touches[0]; showCtx(t.clientX, t.clientY); }, 500); }, {passive:true});
    bbl.addEventListener('touchend', () => clearTimeout(pressTimer));
    bbl.addEventListener('touchmove', () => clearTimeout(pressTimer));
  }

  body.appendChild(bbl);

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = fmtTime(m.ts);
  body.appendChild(time);

  if (isSent) {
    row.appendChild(body);
    row.appendChild(av);
  } else {
    row.appendChild(av);
    row.appendChild(body);
  }
  return row;
}

function addMessage(m) {
  S.messages.push(m);
  save();
  const wrap = document.getElementById('chat-wrap');
  const ti = document.getElementById('typing-ind');
  // check date divider
  if (S.messages.length >= 2) {
    const prev = S.messages[S.messages.length - 2];
    if (fmtDate(prev.ts) !== fmtDate(m.ts)) {
      const div = document.createElement('div');
      div.className = 'date-div';
      div.textContent = fmtDate(m.ts);
      wrap.insertBefore(div, ti);
    }
  } else {
    const div = document.createElement('div');
    div.className = 'date-div';
    div.textContent = fmtDate(m.ts);
    wrap.insertBefore(div, ti);
  }
  wrap.insertBefore(buildMsgEl(m), ti);
  scrollBottom();
  playKakao();
}

function scrollBottom() {
  const w = document.getElementById('chat-wrap');
  w.scrollTop = w.scrollHeight;
}

function uid() {
  return Date.now() + Math.random().toString(36).slice(2,7);
}

// ===================== SEND =====================
function sendMsg(text, opts = {}) {
  if (!text && !opts.src) return;
  const m = {
    id: uid(), ts: Date.now(), side: 'sent',
    type: opts.type || 'text',
    text: text || '',
    src: opts.src || null,
    quoteText: opts.quoteText || null,
    quoteId: opts.quoteId || null
  };
  addMessage(m);
  clearReply();
  scheduleReply(m);
}

function scheduleReply(triggerMsg) {
  if (S.flashcards.length === 0) return;
  const min = S.settings.replyMin * 1000;
  const max = S.settings.replyMax * 1000;
  const delay = min + Math.random() * (max - min);

  if (S.settings.typing) {
    setTimeout(() => {
      document.getElementById('typing-ind').classList.add('vis');
      scrollBottom();
    }, delay * 0.4);
  }

  setTimeout(() => {
    document.getElementById('typing-ind').classList.remove('vis');
    const card = S.flashcards[Math.floor(Math.random() * S.flashcards.length)];
    addMessage({
      id: uid(), ts: Date.now(), side: 'recv',
      type: 'text', text: card, quoteText: null
    });
  }, delay);
}

// ===================== POKE =====================
function sendPoke(isSent) {
  const s = S.settings;
  const name = isSent ? s.myName : s.partnerName;
  const m = {
    id: uid(), ts: Date.now(), side: isSent ? 'sent' : 'recv',
    type: 'poke',
    text: `${name} 拍了拍你`
  };
  addMessage(m);
}

// ===================== IMAGE =====================
document.getElementById('fi-img').addEventListener('change', function() {
  const f = this.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = e => sendMsg('', {type:'image', src:e.target.result});
  r.readAsDataURL(f);
  this.value = '';
});
document.getElementById('btn-img').addEventListener('click', () => {
  document.getElementById('fi-img').click();
});

// ===================== REPLY PREVIEW =====================
function setReply(m) {
  replyTarget = m;
  const prev = document.getElementById('reply-prev');
  const txt = document.getElementById('rp-txt');
  txt.textContent = `↩ ${m.text || '[图片]'}`;
  prev.style.display = 'block';
}
function clearReply() {
  replyTarget = null;
  document.getElementById('reply-prev').style.display = 'none';
  document.getElementById('rp-txt').textContent = '';
}
document.getElementById('rp-close').addEventListener('click', clearReply);

// ===================== EMOJI =====================
const EMOJI_CATS = {
  '😀 表情': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  '❤️ 心情': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫'],
  '👍 手势': ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👂','🦻','👃','🧠','🦷','🦴','👀','👁','👅','👄'],
  '🐱 动物': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒'],
  '🌸 自然': ['🌸','🌹','🥀','🌺','🌻','🌼','🌷','🌱','🌲','🌳','🌴','🌵','🎋','🎍','🍀','🍁','🍂','🍃','🍄','🌾','💐','🌊','🌈','⛅','☁️','🌤','⛈','🌧','❄️','☃️','⛄','🌙','🌟','⭐','✨','💫','🌠','🔥','💧','🌊'],
  '🍎 食物': ['🍎','🍊','🍋','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥝','🍅','🥥','🥑','🍆','🥦','🥬','🌽','🌶','🥒','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🍜','🍝','🍣','🍱','🍛','🍲','🍤','🦞','🦐','🍙','🍚','🍘','🍥','🥮','🍡','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🧂','🥤','☕','🍵','🧃','🥛','🍺','🍻'],
  '🎉 活动': ['🎉','🎊','🎈','🎀','🎁','🎗','🎟','🎫','🎖','🏆','🥇','🥈','🥉','⚽','🏀','🏈','⚾','🥎','🏐','🏉','🎾','🥏','🎳','🏏','🏑','🏒','🥍','🏓','🏸','🥊','🥋','🎽','🛹','🛷','⛸','🥌','🎿','⛷','🏂','🪂','🏋️','🤸','🤼','🤺','🤾','⛹️','🤻','🏊','🧗','🚵','🏇','🚴','🏄','🚣','🧘','🧑','🚵'],
  '💬 符号': ['💯','🔝','🆙','🆒','🆕','🆓','🔜','🔛','🔙','⏫','🔼','⏪','⏩','🔀','🔃','🎵','🎶','✅','❎','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔷','🔶','🔹','🔸','🔲','🔳','▪️','▫️','◾','◽','◼️','◻️'],
};

const KAOMOJI = [
  '(´・ω・`)','( ˘ω˘ )','（＾▽＾）','(✿◠‿◠)','(｡♥‿♥｡)',
  '(≧∇≦)','(^///^)','(●´ω｀●)','(づ￣ 3￣)づ','(ง •̀_•́)ง',
  '╰(*°▽°*)╯','（＾－＾）','(っ˘ω˘ς )','(｡•́︿•̀｡)','(T▽T)',
  '(；′⌒`)','_(:з」∠)_','(；◔д◔)','ヽ(°〇°)ﾉ','Σ(っ°Д°;)っ',
  '(´；ω；`)','(＾▽＾；)','凸(｀0´)凸','(；´д｀)ゞ','(〃＞＿＜;〃)',
  'o(*￣▽￣*)ブ','(*＾▽＾*)','♪(´▽｀)','(●´∀｀●)','⁄(⁄ ⁄•⁄ω⁄•⁄ ⁄)⁄',
  '(灬°ω°灬)','( •̀ ω •́ )✧','ヾ(≧▽≦*)o','(●—●)','눈_눈',
  'QAQ','TAT','o(￣┰￣*)ゞ','(๑•̀ㅂ•́)و✧','(˘▽˘>ԅ( ˘⌣˘)',
];

function buildEmojiPanel() {
  const grid = document.getElementById('e-grid');
  function show(tab) {
    grid.innerHTML = '';
    emojiTab = tab;
    document.querySelectorAll('.e-tab').forEach(t => t.classList.toggle('on', t.dataset.etab === tab));
    if (tab === 'emoji') {
      Object.entries(EMOJI_CATS).forEach(([cat, items]) => {
        const label = document.createElement('div');
        label.style.cssText = 'width:100%;font-size:10px;color:var(--text2);padding:4px 2px 2px;';
        label.textContent = cat;
        grid.appendChild(label);
        items.forEach(e => {
          const el = document.createElement('div');
          el.className = 'e-item';
          el.textContent = e;
          el.addEventListener('click', () => insertText(e));
          grid.appendChild(el);
        });
      });
    } else if (tab === 'kaomoji') {
      KAOMOJI.forEach(k => {
        const el = document.createElement('div');
        el.className = 'e-item km-item';
        el.textContent = k;
        el.addEventListener('click', () => insertText(k));
        grid.appendChild(el);
      });
    } else if (tab === 'sticker') {
      renderStickerPicker();
    }
  }
  document.querySelectorAll('.e-tab').forEach(t => {
    t.addEventListener('click', () => show(t.dataset.etab));
  });
  show('emoji');
}

function renderStickerPicker() {
  const grid = document.getElementById('e-grid');
  grid.innerHTML = '';
  grid.style.cssText = 'display:flex;flex-wrap:wrap;padding:7px;gap:5px;overflow-y:auto;flex:1;';

  // My stickers
  const ml = document.createElement('div');
  ml.style.cssText = 'width:100%;font-size:10px;color:var(--text2);padding:4px 2px 2px;';
  ml.textContent = '我的贴图';
  grid.appendChild(ml);
  S.stickers.my.forEach((src, i) => {
    const el = document.createElement('div');
    el.className = 'stk-item';
    el.innerHTML = `<img src="${src}" alt="">`;
    el.addEventListener('click', () => sendSticker(src, 'sent'));
    grid.appendChild(el);
  });

  const pl = document.createElement('div');
  pl.style.cssText = 'width:100%;font-size:10px;color:var(--text2);padding:8px 2px 2px;';
  pl.textContent = '梦角的贴图';
  grid.appendChild(pl);
  S.stickers.partner.forEach((src, i) => {
    const el = document.createElement('div');
    el.className = 'stk-item';
    el.innerHTML = `<img src="${src}" alt="">`;
    el.addEventListener('click', () => sendSticker(src, 'recv'));
    grid.appendChild(el);
  });

  if (S.stickers.my.length === 0 && S.stickers.partner.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'empty';
    hint.innerHTML = '<i class="fas fa-images"></i>在高级功能 > 贴图库 中添加贴图';
    grid.appendChild(hint);
  }
}

function sendSticker(src, side) {
  const m = { id:uid(), ts:Date.now(), side, type:'image', src, quoteText:null };
  addMessage(m);
  closeEmojiPanel();
}

function insertText(t) {
  const inp = document.getElementById('msg-in');
  const pos = inp.selectionStart;
  const val = inp.value;
  inp.value = val.slice(0, pos) + t + val.slice(pos);
  inp.selectionStart = inp.selectionEnd = pos + t.length;
  inp.focus();
}

function toggleEmojiPanel() {
  const p = document.getElementById('emoji-panel');
  p.classList.toggle('open');
}
function closeEmojiPanel() {
  document.getElementById('emoji-panel').classList.remove('open');
}

// ===================== NOTES =====================
function openNoteModal() {
  // populate presets
  const presets = document.getElementById('note-presets');
  presets.innerHTML = '';
  S.noteOptions.forEach(opt => {
    const el = document.createElement('div');
    el.className = 'tag';
    el.textContent = opt;
    el.addEventListener('click', () => {
      document.getElementById('note-in').value = opt;
      presets.querySelectorAll('.tag').forEach(t => t.classList.remove('sel'));
      el.classList.add('sel');
    });
    presets.appendChild(el);
  });
  noteSender = 'me';
  document.getElementById('nsb-me').classList.add('on');
  document.getElementById('nsb-pt').classList.remove('on');
  document.getElementById('note-in').value = '';
  openOv('ov-note-send');
}

document.getElementById('btn-send-note').addEventListener('click', () => {
  const text = document.getElementById('note-in').value.trim();
  if (!text) return toast('请输入内容');
  const side = noteSender === 'me' ? 'sent' : 'recv';
  const m = { id:uid(), ts:Date.now(), side, type:'note', text, quoteText:null };
  addMessage(m);
  closeOv('ov-note-send');
});

function viewNote(m) {
  document.getElementById('note-view-txt').textContent = m.text;
  const s = S.settings;
  const sender = m.side === 'sent' ? s.myName : s.partnerName;
  document.getElementById('note-view-meta').textContent = `${sender} · ${new Date(m.ts).toLocaleString('zh-CN')}`;
  openOv('ov-note-view');
}

// ===================== NOTE OPTIONS MANAGEMENT =====================
function renderNoteOpts() {
  const list = document.getElementById('nopt-list');
  list.innerHTML = '';
  S.noteOptions.forEach((opt, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);';
    row.innerHTML = `<span style="font-size:13px;color:var(--text);">${opt}</span><button style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:12px;" data-i="${i}">✕</button>`;
    row.querySelector('button').addEventListener('click', () => {
      S.noteOptions.splice(i, 1); save(); renderNoteOpts();
    });
    list.appendChild(row);
  });
  if (!S.noteOptions.length) {
    list.innerHTML = '<div class="empty"><i class="fas fa-scroll"></i>暂无预设选项</div>';
  }
}
document.getElementById('btn-add-nopt').addEventListener('click', () => {
  const v = document.getElementById('new-nopt-in').value.trim();
  if (!v) return;
  S.noteOptions.push(v);
  save(); renderNoteOpts();
  document.getElementById('new-nopt-in').value = '';
});

// ===================== FLASHCARDS =====================
function renderCards() {
  const list = document.getElementById('card-list');
  list.innerHTML = '';
  if (!S.flashcards.length) {
    list.innerHTML = '<div class="empty"><i class="fas fa-layer-group"></i>暂无字卡，梦角无法回复</div>';
    return;
  }
  S.flashcards.forEach((c, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);gap:8px;';
    row.innerHTML = `<div style="font-size:13px;color:var(--text);flex:1;line-height:1.5;word-break:break-word;">${c}</div><button style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:12px;flex-shrink:0;" data-i="${i}">✕</button>`;
    row.querySelector('button').addEventListener('click', () => {
      S.flashcards.splice(i, 1); save(); renderCards();
    });
    list.appendChild(row);
  });
}
document.getElementById('btn-add-card').addEventListener('click', () => {
  const v = document.getElementById('new-card-in').value.trim();
  if (!v) return;
  S.flashcards.push(v); save(); renderCards();
  document.getElementById('new-card-in').value = '';
});

// ===================== ENERGY STATUS =====================
function renderEnergyOpts() {
  ['me','pt','rel'].forEach(k => {
    const key = k === 'me' ? 'me' : k === 'pt' ? 'partner' : 'rel';
    const list = document.getElementById(`${k}-en-list`);
    if (!list) return;
    list.innerHTML = '';
    S.energyOptions[key].forEach((opt, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);';
      row.innerHTML = `<span style="font-size:12px;color:var(--text);">${opt}</span><button style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:11px;" data-i="${i}">✕</button>`;
      row.querySelector('button').addEventListener('click', () => {
        S.energyOptions[key].splice(i, 1); save(); renderEnergyOpts();
      });
      list.appendChild(row);
    });
  });
}
['me','pt','rel'].forEach(k => {
  const key = k === 'me' ? 'me' : k === 'pt' ? 'partner' : 'rel';
  const btn = document.getElementById(`btn-add-${k}-en`);
  if (btn) btn.addEventListener('click', () => {
    const inp = document.getElementById(`new-${k}-en`);
    const v = inp.value.trim(); if (!v) return;
    S.energyOptions[key].push(v); save(); renderEnergyOpts();
    inp.value = '';
  });
});

function openEnergyModal() {
  const s = S.settings.energy;
  // render option tags
  ['me','pt','rel'].forEach(k => {
    const key = k === 'me' ? 'me' : k === 'pt' ? 'partner' : 'rel';
    const container = document.getElementById(`${k}-en-opts`);
    container.innerHTML = '';
    S.energyOptions[key].forEach(opt => {
      const el = document.createElement('div');
      el.className = 'tag' + (s[key] === opt ? ' sel' : '');
      el.textContent = opt;
      el.addEventListener('click', () => {
        container.querySelectorAll('.tag').forEach(t => t.classList.remove('sel'));
        el.classList.add('sel');
        document.getElementById(`${k}-en-custom`).value = '';
      });
      container.appendChild(el);
    });
    const customInput = document.getElementById(`${k}-en-custom`);
    customInput.value = (s[key] && !S.energyOptions[key].includes(s[key])) ? s[key] : '';
  });
  openOv('ov-energy');
}

document.getElementById('btn-save-energy').addEventListener('click', () => {
  const s = S.settings.energy;
  ['me','pt','rel'].forEach(k => {
    const key = k === 'me' ? 'me' : k === 'pt' ? 'partner' : 'rel';
    const selTag = document.getElementById(`${k}-en-opts`).querySelector('.tag.sel');
    const custom = document.getElementById(`${k}-en-custom`).value.trim();
    s[key] = custom || (selTag ? selTag.textContent : s[key]);
  });
  // update partner status display
  updateEnergyDisplay();
  save();
  closeOv('ov-energy');
  toast('能量状态已更新');
});

function updateEnergyDisplay() {
  const s = S.settings.energy;
  const parts = [s.me && `我：${s.me}`, s.partner && `他：${s.partner}`, s.rel && `我们：${s.rel}`].filter(Boolean);
  document.getElementById('partner-st').textContent = parts.join(' | ') || S.settings.partnerStatus;
}

// ===================== STICKERS =====================
function renderStickerMgr() {
  const renderGroup = (el, arr, key) => {
    const addBtn = document.getElementById(`btn-add-${key}-stk`);
    el.innerHTML = '';
    el.appendChild(addBtn);
    arr.forEach((src, i) => {
      const item = document.createElement('div');
      item.className = 'stk-item';
      item.innerHTML = `<img src="${src}" alt=""><button style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;border:none;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;" data-i="${i}">✕</button>`;
      item.querySelector('button').addEventListener('click', e => {
        e.stopPropagation();
        arr.splice(i, 1); save(); renderStickerMgr();
      });
      el.insertBefore(item, addBtn);
    });
  };
  renderGroup(document.getElementById('mgr-my-stk'), S.stickers.my, 'my');
  renderGroup(document.getElementById('mgr-pt-stk'), S.stickers.partner, 'pt');
}

function addStickers(files, arr) {
  Array.from(files).forEach(f => {
    const r = new FileReader();
    r.onload = e => { arr.push(e.target.result); save(); renderStickerMgr(); };
    r.readAsDataURL(f);
  });
}
document.getElementById('btn-add-my-stk').addEventListener('click', () => document.getElementById('fi-stk-my').click());
document.getElementById('btn-add-pt-stk').addEventListener('click', () => document.getElementById('fi-stk-pt').click());
document.getElementById('fi-stk-my').addEventListener('change', function() { addStickers(this.files, S.stickers.my); this.value=''; });
document.getElementById('fi-stk-pt').addEventListener('change', function() { addStickers(this.files, S.stickers.partner); this.value=''; });

// ===================== ANNIVERSARY =====================
function renderAnniv() {
  const list = document.getElementById('an-list');
  list.innerHTML = '';
  if (!S.anniversaries.length) {
    list.innerHTML = '<div class="empty"><i class="fas fa-heart"></i>暂无重要日</div>';
    return;
  }
  const now = Date.now();
  [...S.anniversaries].sort((a,b) => new Date(a.date) - new Date(b.date)).forEach((an, i) => {
    const d = new Date(an.date);
    const diff = Math.round((d - now) / 86400000);
    const label = diff === 0 ? '就是今天！' : diff > 0 ? `还有 ${diff} 天` : `已过 ${Math.abs(diff)} 天`;
    const item = document.createElement('div');
    item.className = 'an-item';
    const who = an.who === 'me' ? S.settings.myName : an.who === 'partner' ? S.settings.partnerName : '我们';
    item.innerHTML = `
      <div class="an-dot"></div>
      <div class="an-info">
        <div class="an-name">${an.name}</div>
        <div class="an-date">${an.date} · ${who}</div>
      </div>
      <div class="an-days">${label}</div>
      <button class="an-del" data-i="${i}"><i class="fas fa-trash"></i></button>`;
    item.querySelector('button').addEventListener('click', () => {
      const idx = S.anniversaries.findIndex(a => a === an);
      S.anniversaries.splice(idx, 1); save(); renderAnniv();
    });
    list.appendChild(item);
  });
}
document.getElementById('btn-add-an').addEventListener('click', () => {
  const name = document.getElementById('an-name-in').value.trim();
  const date = document.getElementById('an-date-in').value;
  const who = document.getElementById('an-who').value;
  if (!name || !date) return toast('请填写名称和日期');
  S.anniversaries.push({ name, date, who });
  save(); renderAnniv();
  document.getElementById('an-name-in').value = '';
  document.getElementById('an-date-in').value = '';
});

// ===================== LETTERS =====================
function openLetterModal() {
  switchLetterTab('write');
  document.getElementById('ltr-in').value = '';
  openOv('ov-letter');
  checkPendingLetters();
}

function switchLetterTab(tab) {
  letterTab = tab;
  document.querySelectorAll('.ltab').forEach(t => {
    const on = t.dataset.ltab === tab;
    t.classList.toggle('on', on);
    if (on) { t.style.background = 'var(--accent)'; t.style.color = '#fff'; }
    else { t.style.background = 'transparent'; t.style.color = 'var(--text2)'; }
  });
  document.getElementById('ltr-write').style.display = tab === 'write' ? '' : 'none';
  document.getElementById('ltr-out').style.display = tab === 'out' ? '' : 'none';
  document.getElementById('ltr-in-box').style.display = tab === 'in' ? '' : 'none';
  document.getElementById('ltr-foot').style.display = tab === 'write' ? '' : 'none';

  if (tab === 'out') renderLetterList('out');
  if (tab === 'in') renderLetterList('in');
}

function renderLetterList(type) {
  const container = document.getElementById(type === 'out' ? 'ltr-out' : 'ltr-in-box');
  container.innerHTML = '';
  const letters = S.letters.filter(l => type === 'out' ? l.type === 'outbox' : l.type === 'inbox');
  if (!letters.length) {
    container.innerHTML = '<div class="empty"><i class="fas fa-envelope"></i>暂无信件</div>';
    return;
  }
  letters.reverse().forEach(l => {
    const item = document.createElement('div');
    item.className = 'ltr-item';
    const d = new Date(l.ts);
    const preview = l.content.substring(0, 40) + (l.content.length > 40 ? '…' : '');
    let meta = d.toLocaleDateString('zh-CN');
    if (l.type === 'outbox' && !l.replied) {
      const replyAt = new Date(l.replyAt);
      const remaining = Math.max(0, Math.round((replyAt - Date.now()) / 3600000));
      meta += remaining > 0
        ? ` · <span class="ltr-pending">约 ${remaining} 小时后回信</span>`
        : ` · <span class="ltr-pending">回信即将到来</span>`;
    } else if (l.type === 'outbox' && l.replied) {
      meta += ' · <span style="color:var(--accent);font-size:11px;">已收到回信</span>';
    }
    item.innerHTML = `<div class="ltr-item-title">${l.type === 'outbox' ? '我写给梦角' : '梦角回信'}</div><div class="ltr-item-meta">${preview}</div><div class="ltr-item-meta" style="margin-top:3px;">${meta}</div>`;
    item.addEventListener('click', () => viewLetter(l));
    container.appendChild(item);
  });
}

document.getElementById('btn-send-ltr').addEventListener('click', () => {
  const content = document.getElementById('ltr-in').value.trim();
  if (!content) return toast('请写点什么');
  if (S.flashcards.length < 5) return toast('字卡不足，请至少添加5张字卡');
  const replyDelay = (10 + Math.random() * 10) * 3600000; // 10-20 hours in ms
  const letter = {
    id: uid(), ts: Date.now(), type: 'outbox',
    content, replied: false,
    replyAt: Date.now() + replyDelay
  };
  S.letters.push(letter);
  save();
  toast('信已寄出 ✉️');
  closeOv('ov-letter');
  // add notification to chat
  addMessage({ id:uid(), ts:Date.now(), side:'sent', type:'letter-notify', text:'✉️ 我寄出了一封信，点击查看', letterId:letter.id, quoteText:null });
});

function checkPendingLetters() {
  S.letters.forEach(l => {
    if (l.type === 'outbox' && !l.replied && Date.now() >= l.replyAt) {
      // generate reply
      const count = 10 + Math.floor(Math.random() * 11); // 10-20
      const cards = [];
      if (S.flashcards.length > 0) {
        for (let i = 0; i < count; i++) {
          cards.push(S.flashcards[Math.floor(Math.random() * S.flashcards.length)]);
        }
      } else {
        cards.push('（梦角还没有字卡，请先添加字卡）');
      }
      const reply = {
        id: uid(), ts: Date.now(), type: 'inbox',
        content: cards.join('\n\n'),
        fromLetterId: l.id
      };
      l.replied = true;
      S.letters.push(reply);
      save();
      addMessage({ id:uid(), ts:Date.now(), side:'recv', type:'letter-notify', text:`✉️ 梦角回信了，点击查看`, letterId:reply.id, quoteText:null });
    }
  });
}

function viewLetter(l) {
  document.getElementById('lv-title').textContent = l.type === 'outbox' ? '我的信' : '梦角的回信';
  document.getElementById('lv-meta').textContent = new Date(l.ts).toLocaleString('zh-CN');
  document.getElementById('lv-body').textContent = l.content;
  openOv('ov-ltr-view');
}

function viewLetterById(id, isReply) {
  const l = S.letters.find(x => x.id === id);
  if (l) viewLetter(l);
}

// ===================== CALL =====================
document.getElementById('btn-call-start').addEventListener('click', () => {
  // partner initiates call to me
  document.getElementById('call-in-view').style.display = '';
  document.getElementById('call-act-view').style.display = 'none';
  document.getElementById('call-ov').classList.add('open');
});

document.getElementById('btn-c-dec').addEventListener('click', endCall);
document.getElementById('btn-c-acc').addEventListener('click', () => {
  document.getElementById('call-in-view').style.display = 'none';
  document.getElementById('call-act-view').style.display = '';
  callSec = 0;
  clearInterval(callTimer);
  callTimer = setInterval(() => {
    callSec++;
    const m = String(Math.floor(callSec/60)).padStart(2,'0');
    const s = String(callSec%60).padStart(2,'0');
    document.getElementById('c-timer').textContent = `${m}:${s}`;
  }, 1000);
});
document.getElementById('btn-c-end').addEventListener('click', endCall);
document.getElementById('btn-c-mute').addEventListener('click', function() {
  this.style.opacity = this.style.opacity === '0.5' ? '1' : '0.5';
});
document.getElementById('btn-c-cam').addEventListener('click', function() {
  this.style.opacity = this.style.opacity === '0.5' ? '1' : '0.5';
});

function endCall() {
  clearInterval(callTimer);
  document.getElementById('call-ov').classList.remove('open');
}

// ===================== SEARCH =====================
document.getElementById('btn-do-srch').addEventListener('click', () => {
  const q = document.getElementById('srch-in').value.trim().toLowerCase();
  const date = document.getElementById('srch-date').value;
  const results = document.getElementById('srch-results');
  results.innerHTML = '';
  const filtered = S.messages.filter(m => {
    if (m.type !== 'text') return false;
    const matchText = !q || m.text.toLowerCase().includes(q);
    const matchDate = !date || new Date(m.ts).toISOString().startsWith(date);
    return matchText && matchDate;
  });
  if (!filtered.length) { results.innerHTML = '<div class="empty"><i class="fas fa-search"></i>没有找到相关消息</div>'; return; }
  filtered.forEach(m => {
    const r = document.createElement('div');
    r.className = 'sr';
    const highlighted = q ? m.text.replace(new RegExp(q,'gi'), s => `<mark>${s}</mark>`) : m.text;
    const who = m.side === 'sent' ? S.settings.myName : S.settings.partnerName;
    r.innerHTML = `<div class="sr-txt">${highlighted}</div><div class="sr-meta">${who} · ${new Date(m.ts).toLocaleString('zh-CN')}</div>`;
    r.addEventListener('click', () => {
      closeOv('ov-search');
      // scroll to message
      setTimeout(() => {
        const el = document.querySelector(`[data-id="${m.id}"]`);
        if (el) el.scrollIntoView({ behavior:'smooth', block:'center' });
      }, 300);
    });
    results.appendChild(r);
  });
});

// ===================== AVATAR / NAME EDITING =====================
let avPopTarget = null;
function showAvPop(target, anchorEl) {
  avPopTarget = target;
  const pop = document.getElementById('av-pop');
  const rect = anchorEl.getBoundingClientRect();
  pop.style.left = Math.min(rect.left, window.innerWidth - 180) + 'px';
  pop.style.top = (rect.bottom + 6) + 'px';
  pop.classList.add('open');
}

document.getElementById('partner-ui').addEventListener('click', (e) => {
  showAvPop('partner', document.getElementById('partner-av'));
  e.stopPropagation();
});
document.getElementById('my-ui').addEventListener('click', (e) => {
  showAvPop('me', document.getElementById('my-av'));
  e.stopPropagation();
});

document.getElementById('ap-photo').addEventListener('click', () => {
  closeAvPop();
  document.getElementById('fi-av').click();
});
document.getElementById('ap-name').addEventListener('click', () => {
  closeAvPop();
  const isPartner = avPopTarget === 'partner';
  openEditModal(isPartner ? '修改梦角的名字' : '修改我的名字',
    isPartner ? S.settings.partnerName : S.settings.myName,
    val => {
      if (isPartner) { S.settings.partnerName = val; document.getElementById('partner-nm').textContent = val; }
      else { S.settings.myName = val; document.getElementById('my-nm').textContent = val; }
      save();
    });
});
document.getElementById('ap-status').addEventListener('click', () => {
  closeAvPop();
  const isPartner = avPopTarget === 'partner';
  openEditModal(isPartner ? '修改梦角的状态' : '修改我的状态',
    isPartner ? S.settings.partnerStatus : S.settings.myStatus,
    val => {
      if (isPartner) { S.settings.partnerStatus = val; document.getElementById('partner-st').textContent = val; }
      else { S.settings.myStatus = val; document.getElementById('my-st').textContent = val; }
      save();
    });
});

function closeAvPop() {
  document.getElementById('av-pop').classList.remove('open');
}

document.getElementById('fi-av').addEventListener('change', function() {
  const f = this.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = e => {
    const src = e.target.result;
    if (avPopTarget === 'partner') { S.settings.partnerAvatar = src; }
    else { S.settings.myAvatar = src; }
    applySettings(); save();
  };
  r.readAsDataURL(f);
  this.value = '';
});

function openEditModal(title, value, callback) {
  document.getElementById('edit-ttl').textContent = title;
  document.getElementById('edit-in').value = value;
  editCallback = callback;
  openOv('ov-edit');
  setTimeout(() => document.getElementById('edit-in').focus(), 100);
}

document.getElementById('btn-save-edit').addEventListener('click', () => {
  const v = document.getElementById('edit-in').value.trim();
  if (!v) return;
  if (editCallback) editCallback(v);
  editCallback = null;
  closeOv('ov-edit');
});
document.getElementById('edit-in').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-save-edit').click();
});

// ===================== SETTINGS PANELS =====================
// theme
document.getElementById('th-light').addEventListener('click', () => {
  S.settings.theme = 'light'; save(); applySettings();
});
document.getElementById('th-dark').addEventListener('click', () => {
  S.settings.theme = 'dark'; save(); applySettings();
});
// accent
document.getElementById('accent-row').addEventListener('click', e => {
  const dot = e.target.closest('.c-dot');
  if (!dot) return;
  document.querySelectorAll('.c-dot').forEach(d => d.classList.remove('on'));
  dot.classList.add('on');
  S.settings.accent = dot.dataset.c;
  save(); applySettings();
});
// wallpaper
document.getElementById('btn-wall').addEventListener('click', () => document.getElementById('fi-wall').click());
document.getElementById('fi-wall').addEventListener('change', function() {
  const f = this.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = e => { S.settings.wallpaper = e.target.result; save(); applySettings(); };
  r.readAsDataURL(f);
  this.value = '';
});
document.getElementById('btn-wall-clr').addEventListener('click', () => {
  S.settings.wallpaper = null; save(); applySettings();
});
document.getElementById('wall-op').addEventListener('input', function() {
  S.settings.wallOpacity = +this.value;
  document.getElementById('wall-op-v').textContent = this.value + '%';
  save(); applySettings();
});
// font size
document.getElementById('fs-sl').addEventListener('input', function() {
  S.settings.fontSize = +this.value;
  document.getElementById('fs-v').textContent = this.value + 'px';
  save(); applySettings();
});
// bubble css
document.getElementById('apply-bbl-css').addEventListener('click', () => {
  S.settings.bubbleCSS = document.getElementById('bbl-css').value;
  save(); applySettings(); toast('CSS 已应用');
});
// reply speed
document.getElementById('rmin-sl').addEventListener('input', function() {
  S.settings.replyMin = +this.value;
  document.getElementById('rmin-v').textContent = this.value + 's';
  save();
});
document.getElementById('rmax-sl').addEventListener('input', function() {
  S.settings.replyMax = +this.value;
  document.getElementById('rmax-v').textContent = this.value + 's';
  save();
});
// toggles
['quote','sound','typing'].forEach(k => {
  document.getElementById(`tog-${k}`).addEventListener('click', function() {
    this.classList.toggle('on');
    S.settings[k === 'quote' ? 'quoteEnabled' : k] = this.classList.contains('on');
    save();
  });
});

// ===================== CONTEXT MENU =====================
document.getElementById('cx-quote').addEventListener('click', () => {
  if (!ctxTarget || !S.settings.quoteEnabled) return;
  setReply(ctxTarget);
  document.getElementById('msg-in').focus();
  closeCtx();
});
document.getElementById('cx-copy').addEventListener('click', () => {
  if (ctxTarget?.text) navigator.clipboard.writeText(ctxTarget.text).then(() => toast('已复制'));
  closeCtx();
});
document.getElementById('cx-del').addEventListener('click', () => {
  if (!ctxTarget) return;
  const i = S.messages.findIndex(m => m.id === ctxTarget.id);
  if (i >= 0) { S.messages.splice(i, 1); save(); renderMessages(); }
  closeCtx();
});
function closeCtx() {
  document.getElementById('ctx').classList.remove('open');
  ctxTarget = null;
}

// ===================== MODAL ROUTING =====================
document.querySelectorAll('[data-close]').forEach(el => {
  el.addEventListener('click', () => closeOv(el.dataset.close));
});
document.querySelectorAll('[data-open]').forEach(el => {
  el.addEventListener('click', () => openOv(el.dataset.open));
});
document.querySelectorAll('[data-back]').forEach(el => {
  el.addEventListener('click', () => {
    closeAll();
    openOv(el.dataset.back);
  });
});
document.querySelectorAll('.ov').forEach(ov => {
  ov.addEventListener('click', e => {
    if (e.target === ov) closeOv(ov.id);
  });
});

// Letter tabs
document.querySelectorAll('.ltab').forEach(t => {
  t.addEventListener('click', () => switchLetterTab(t.dataset.ltab));
});

// Note sender buttons
document.querySelectorAll('[data-s]').forEach(el => {
  el.addEventListener('click', () => {
    noteSender = el.dataset.s;
    document.getElementById('nsb-me').classList.toggle('on', noteSender === 'me');
    document.getElementById('nsb-pt').classList.toggle('on', noteSender === 'partner');
  });
});

// ===================== HEADER BUTTONS =====================
document.getElementById('btn-settings').addEventListener('click', () => openOv('ov-settings'));
document.getElementById('btn-energy').addEventListener('click', openEnergyModal);
document.getElementById('btn-letter').addEventListener('click', openLetterModal);
document.getElementById('btn-search').addEventListener('click', () => {
  document.getElementById('srch-in').value = '';
  document.getElementById('srch-date').value = '';
  document.getElementById('srch-results').innerHTML = '';
  openOv('ov-search');
});
document.getElementById('btn-note').addEventListener('click', openNoteModal);
document.getElementById('btn-emoji-tog').addEventListener('click', toggleEmojiPanel);

// ===================== SEND MESSAGE =====================
document.getElementById('send-btn').addEventListener('click', doSend);
document.getElementById('msg-in').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    doSend();
  }
});
document.getElementById('msg-in').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 90) + 'px';
});

function doSend() {
  const inp = document.getElementById('msg-in');
  const text = inp.value.trim();
  if (!text) return;
  closeEmojiPanel();
  sendMsg(text, {
    quoteText: replyTarget?.text || null,
    quoteId: replyTarget?.id || null
  });
  inp.value = '';
  inp.style.height = 'auto';
}

// ===================== GLOBAL CLICKS =====================
document.addEventListener('click', e => {
  if (!document.getElementById('ctx').contains(e.target)) closeCtx();
  if (!document.getElementById('av-pop').contains(e.target) &&
      !document.getElementById('partner-ui').contains(e.target) &&
      !document.getElementById('my-ui').contains(e.target)) closeAvPop();
  if (!document.getElementById('emoji-panel').contains(e.target) &&
      !document.getElementById('btn-emoji-tog').contains(e.target)) closeEmojiPanel();
});

// ===================== INIT =====================
async function init() {
  await load();
  applySettings();
  buildEmojiPanel();

  // sync settings sliders
  const s = S.settings;
  document.getElementById('fs-sl').value = s.fontSize;
  document.getElementById('fs-v').textContent = s.fontSize + 'px';
  document.getElementById('wall-op').value = s.wallOpacity;
  document.getElementById('wall-op-v').textContent = s.wallOpacity + '%';
  document.getElementById('rmin-sl').value = s.replyMin;
  document.getElementById('rmin-v').textContent = s.replyMin + 's';
  document.getElementById('rmax-sl').value = s.replyMax;
  document.getElementById('rmax-v').textContent = s.replyMax + 's';
  document.getElementById('tog-quote').classList.toggle('on', s.quoteEnabled);
  document.getElementById('tog-sound').classList.toggle('on', s.sound);
  document.getElementById('tog-typing').classList.toggle('on', s.typing);
  document.getElementById('bbl-css').value = s.bubbleCSS || '';

  // accent dot
  document.querySelectorAll('.c-dot').forEach(d => d.classList.toggle('on', d.dataset.c === s.accent));

  renderMessages();
  renderCards();
  renderNoteOpts();
  renderEnergyOpts();
  renderStickerMgr();
  renderAnniv();
  checkPendingLetters();

  // check letters every 5 min
  setInterval(checkPendingLetters, 5 * 60 * 1000);
}

init();
