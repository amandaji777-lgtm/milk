// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
const S = {
  settings: {
    myName:'我', partnerName:'梦角',
    myAvatar:null, partnerAvatar:null,
    accent:'#c5a47e',
    wallpaper:null, wallOpacity:35,
    fontSize:16, bubbleCSS:'',
    sound:true, typing:true, quoteEnabled:true,
    autoSend:{ enabled:false, minMin:30, maxMin:60 },
    replyDelay:{ enabled:true, minSec:3, maxSec:15 },
  },
  messages:[],
  wordcards:{ groups:[
    { id:'daily',    name:'日常交流', builtin:true, cards:[] },
    { id:'kaomoji',  name:'颜文字',   builtin:true, cards:[] },
    { id:'emoji',    name:'Emoji',    builtin:true, cards:[] },
    { id:'spiritual',name:'灵性分组', builtin:true, cards:[] },
    { id:'status',   name:'在线状态', builtin:true, cards:[] },
  ]},
  statusOptions:{ me:[], partner:[], shared:[] },
  currentStatus:{ me:[], partner:[], shared:'' },
  sharedProposal:null,
  sharedHistory:[],
  notes:[],
  envelopes:[],
  stickers:[],
  customKaomoji:[],
};
const STORE_KEY = 'mjchat_v2';

// ══════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════
async function load() {
  try {
    const d = await localforage.getItem(STORE_KEY);
    if (!d) return;
    if (d.settings)      Object.assign(S.settings, d.settings);
    if (d.messages)      S.messages = d.messages;
    if (d.wordcards)     S.wordcards = d.wordcards;
    if (d.statusOptions) Object.assign(S.statusOptions, d.statusOptions);
    if (d.currentStatus) Object.assign(S.currentStatus, d.currentStatus);
    if (d.sharedProposal !== undefined) S.sharedProposal = d.sharedProposal;
    if (d.sharedHistory) S.sharedHistory = d.sharedHistory;
    if (d.notes)         S.notes = d.notes;
    if (d.envelopes)     S.envelopes = d.envelopes;
    if (d.stickers)      S.stickers = d.stickers;
    if (d.customKaomoji) S.customKaomoji = d.customKaomoji;
    // ensure status group exists
    if (!S.wordcards.groups.find(g => g.id === 'status')) {
      S.wordcards.groups.push({ id:'status', name:'在线状态', builtin:true, cards:[] });
    }
  } catch(e) { console.error(e); }
}
function save() {
  localforage.setItem(STORE_KEY, {
    settings:S.settings, messages:S.messages, wordcards:S.wordcards,
    statusOptions:S.statusOptions, currentStatus:S.currentStatus,
    sharedProposal:S.sharedProposal, sharedHistory:S.sharedHistory,
    notes:S.notes, envelopes:S.envelopes, stickers:S.stickers, customKaomoji:S.customKaomoji,
  });
}

// ══════════════════════════════════════════════
// AUDIO
// ══════════════════════════════════════════════
let audioCtx = null;
function playSound() {
  if (!S.settings.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(880, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.08);
    g.gain.setValueAtTime(0.15, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    o.start(); o.stop(audioCtx.currentTime + 0.18);
  } catch(e) {}
}

// ══════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════
let toastTmo = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTmo);
  toastTmo = setTimeout(() => el.classList.remove('show'), 2200);
}

// ══════════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════════
function openOv(id)  { document.getElementById(id)?.classList.add('open'); }
function closeOv(id) { document.getElementById(id)?.classList.remove('open'); }
function closeAll()  { document.querySelectorAll('.ov.open').forEach(el => el.classList.remove('open')); }

// ══════════════════════════════════════════════
// APPLY SETTINGS
// ══════════════════════════════════════════════
function hexToRgb(hex) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}
function applySettings() {
  const s = S.settings;
  document.documentElement.style.setProperty('--accent', s.accent);
  document.documentElement.style.setProperty('--accent-rgb', hexToRgb(s.accent));
  document.documentElement.style.setProperty('--font-size', s.fontSize+'px');
  const bg = document.getElementById('chat-bg');
  if (s.wallpaper) { bg.style.backgroundImage=`url(${s.wallpaper})`; bg.style.opacity=s.wallOpacity/100; }
  else { bg.style.backgroundImage=''; }
  setAvEl('partner-av', s.partnerAvatar);
  setAvEl('my-av', s.myAvatar);
  setAvEl('t-av', s.partnerAvatar, true);
  setAvEl('c-av-in', s.partnerAvatar);
  document.getElementById('partner-nm').textContent = s.partnerName;
  document.getElementById('my-nm').textContent = s.myName;
  document.getElementById('c-nm-in').textContent = s.partnerName;
  document.getElementById('bbl-css-tag').textContent = s.bubbleCSS || '';
  refreshStatusDisplay();
}
function setAvEl(id, src, small) {
  const el = document.getElementById(id); if (!el) return;
  el.innerHTML = src ? `<img src="${src}" alt="">` : `<i class="fas fa-user" style="font-size:${small?'9':'12'}px;"></i>`;
}

// ══════════════════════════════════════════════
// STATUS DISPLAY (from 在线状态 wordcard group)
// ══════════════════════════════════════════════
function getStatusCards() {
  const g = S.wordcards.groups.find(x => x.id === 'status');
  return g ? g.cards.filter(c => !c.disabled).map(c => c.text) : [];
}
function pickStatus() {
  const cards = getStatusCards();
  if (!cards.length) return '';
  return cards[Math.floor(Math.random() * cards.length)];
}
function refreshStatusDisplay() {
  document.getElementById('partner-st').textContent = pickStatus();
  document.getElementById('my-st').textContent = pickStatus();
}
function refreshPartnerStatus() {
  const s = pickStatus();
  if (s) document.getElementById('partner-st').textContent = s;
}

// ══════════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════════
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function fmtTime(ts) { return new Date(ts).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}); }
function fmtDate(ts) {
  const d=new Date(ts), now=new Date(), diff=Math.floor((now-d)/86400000);
  if (diff===0) return '今天';
  if (diff===1) return '昨天';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function renderMessages() {
  const wrap = document.getElementById('chat-wrap');
  const bg = document.getElementById('chat-bg');
  const ti = document.getElementById('typing-ind');
  wrap.innerHTML = ''; wrap.appendChild(bg); wrap.appendChild(ti);
  let lastDate = null;
  S.messages.forEach(m => {
    const d = fmtDate(m.ts);
    if (d !== lastDate) { wrap.insertBefore(makeDateDiv(d), ti); lastDate = d; }
    wrap.insertBefore(buildMsgEl(m), ti);
  });
  scrollBottom();
}
function makeDateDiv(label) {
  const d = document.createElement('div');
  d.className='date-div'; d.textContent=label; return d;
}
function buildMsgEl(m) {
  if (m.type === 'poke') {
    const r=document.createElement('div'); r.className='poke-row'; r.dataset.id=m.id; r.textContent=m.text; return r;
  }
  if (m.type === 'sys') {
    const r=document.createElement('div'); r.className='sys-row'; r.dataset.id=m.id; r.textContent=m.text;
    if (m.noteId) r.addEventListener('click', () => viewNoteById(m.noteId));
    return r;
  }
  const isSent = m.side === 'sent';
  const row = document.createElement('div');
  row.className = `msg-row ${isSent?'sent':'recv'}`; row.dataset.id = m.id;
  const avSrc = isSent ? S.settings.myAvatar : S.settings.partnerAvatar;
  const av = document.createElement('div'); av.className='msg-av';
  av.innerHTML = avSrc ? `<img src="${avSrc}" alt="">` : `<i class="fas fa-user" style="font-size:11px;"></i>`;
  av.addEventListener('dblclick', () => sendPoke(isSent));
  const body = document.createElement('div'); body.className='msg-body';
  if (m.quoteText) {
    const q=document.createElement('div'); q.className='quote-bar'; q.textContent=`↩ ${m.quoteText}`; body.appendChild(q);
  }
  const bbl = document.createElement('div');
  if (m.type === 'image') {
    bbl.className='msg-bbl img-bbl';
    const img=document.createElement('img'); img.src=m.src;
    img.addEventListener('click', () => window.open(m.src,'_blank'));
    bbl.appendChild(img);
  } else {
    bbl.className='msg-bbl'; bbl.textContent=m.text;
  }
  let pressTimer;
  const showCtx = (x,y) => {
    ctxTarget=m;
    const ctx=document.getElementById('ctx');
    ctx.style.left=Math.min(x,window.innerWidth-160)+'px';
    ctx.style.top=Math.min(y,window.innerHeight-130)+'px';
    ctx.classList.add('open');
  };
  bbl.addEventListener('contextmenu', e => { e.preventDefault(); showCtx(e.clientX,e.clientY); });
  bbl.addEventListener('touchstart', e => { pressTimer=setTimeout(()=>{ const t=e.touches[0]; showCtx(t.clientX,t.clientY); },500); },{passive:true});
  bbl.addEventListener('touchend', () => clearTimeout(pressTimer));
  bbl.addEventListener('touchmove', () => clearTimeout(pressTimer));
  body.appendChild(bbl);
  const time=document.createElement('div'); time.className='msg-time'; time.textContent=fmtTime(m.ts); body.appendChild(time);
  if (isSent) { row.appendChild(body); row.appendChild(av); }
  else        { row.appendChild(av);   row.appendChild(body); }
  return row;
}
function addMessage(m) {
  S.messages.push(m); save();
  const wrap=document.getElementById('chat-wrap'), ti=document.getElementById('typing-ind');
  if (S.messages.length<=1 || fmtDate(S.messages[S.messages.length-2].ts)!==fmtDate(m.ts)) {
    wrap.insertBefore(makeDateDiv(fmtDate(m.ts)), ti);
  }
  wrap.insertBefore(buildMsgEl(m), ti);
  scrollBottom(); playSound();
}
function scrollBottom() {
  const w=document.getElementById('chat-wrap');
  requestAnimationFrame(() => { w.scrollTop=w.scrollHeight; });
}

// ══════════════════════════════════════════════
// SEND (我发)
// ══════════════════════════════════════════════
let replyTarget=null, ctxTarget=null, avTarget=null, editCallback=null, noteSender='me', noteImgSrc=null;

function sendMsg(text, opts={}) {
  if (!text && !opts.src) return;
  const m = { id:uid(), ts:Date.now(), side:'sent', type:opts.type||'text', text:text||'', src:opts.src||null, quoteText:opts.quoteText||null };
  addMessage(m); clearReply();
  // auto reply only if auto mode enabled
  if (S.settings.autoSend.enabled) scheduleAutoReply();
}
function doSend() {
  const inp=document.getElementById('msg-in');
  const text=inp.value.trim(); if (!text) return;
  closeEmojiPanel(); closePlusMenu();
  sendMsg(text, {quoteText:replyTarget?.text||null});
  inp.value=''; inp.style.height='auto';
}

// ══════════════════════════════════════════════
// PARTNER SEND (梦角发 — 手动 or 自动)
// ══════════════════════════════════════════════
function allCards() {
  const cards=[];
  S.wordcards.groups.forEach(g => {
    if (g.id==='status') return; // status group not used for chat
    g.cards.forEach(c => { if (!c.disabled) cards.push(c.text); });
  });
  return cards;
}
function pickRandom() {
  const cards=allCards(); if (!cards.length) return null;
  return cards[Math.floor(Math.random()*cards.length)];
}
function sendPartnerMsg(text) {
  if (!text) return;
  addMessage({ id:uid(), ts:Date.now(), side:'recv', type:'text', text, quoteText:null });
  // occasionally refresh partner status
  if (Math.random()<0.25) refreshPartnerStatus();
}
function sendPoke(isSent) {
  const name = isSent ? S.settings.myName : S.settings.partnerName;
  addMessage({ id:uid(), ts:Date.now(), side:isSent?'sent':'recv', type:'poke', text:`${name} 拍了拍你` });
}

// ══════════════════════════════════════════════
// AUTO SEND TIMER
// ══════════════════════════════════════════════
let autoSendTimer=null;
function scheduleAutoSend() {
  clearTimeout(autoSendTimer);
  if (!S.settings.autoSend.enabled) return;
  const {minMin,maxMin}=S.settings.autoSend;
  const delay=(minMin+Math.random()*(maxMin-minMin))*60000;
  autoSendTimer=setTimeout(()=>{
    const text=pickRandom(); if (text) sendPartnerMsg(text);
    scheduleAutoSend();
  },delay);
}

// AUTO REPLY (when auto mode on and user sends)
let replyTimer=null;
function scheduleAutoReply() {
  if (!S.settings.replyDelay.enabled) { const t=pickRandom(); if(t) sendPartnerMsg(t); return; }
  const {minSec,maxSec}=S.settings.replyDelay;
  const delay=(minSec+Math.random()*(maxSec-minSec))*1000;
  if (S.settings.typing) {
    setTimeout(()=>{ document.getElementById('typing-ind').classList.add('vis'); scrollBottom(); }, delay*0.4);
  }
  replyTimer=setTimeout(()=>{
    document.getElementById('typing-ind').classList.remove('vis');
    const t=pickRandom(); if(t) sendPartnerMsg(t);
  },delay);
}

// ══════════════════════════════════════════════
// CARD PICKER (梦角手动发)
// ══════════════════════════════════════════════
let cpSelectedCards=[];
let cpCurrentGroup=null;

function openCardPicker() {
  cpSelectedCards=[];
  renderCpGroups();
  renderCpSelected();
  document.getElementById('card-picker').classList.add('open');
  document.getElementById('btn-card-tog').classList.add('on');
  closeEmojiPanel(); closePlusMenu();
}
function closeCardPicker() {
  document.getElementById('card-picker').classList.remove('open');
  document.getElementById('btn-card-tog').classList.remove('on');
  cpSelectedCards=[];
}

function renderCpGroups() {
  const head=document.getElementById('cp-head');
  // clear group buttons (keep label)
  head.querySelectorAll('.cp-group-btn').forEach(b=>b.remove());
  const groups=S.wordcards.groups.filter(g=>g.id!=='status'&&g.cards.filter(c=>!c.disabled).length>0);
  if (!groups.length) { renderCpCards(null); return; }
  if (!cpCurrentGroup || !groups.find(g=>g.id===cpCurrentGroup)) cpCurrentGroup=groups[0].id;
  groups.forEach(g=>{
    const btn=document.createElement('button'); btn.className='cp-group-btn'+(g.id===cpCurrentGroup?' on':'');
    btn.textContent=g.name; btn.dataset.gid=g.id;
    btn.addEventListener('click',()=>{ cpCurrentGroup=g.id; renderCpGroups(); renderCpCards(g.id); });
    head.appendChild(btn);
  });
  renderCpCards(cpCurrentGroup);
}

function renderCpCards(groupId) {
  const container=document.getElementById('cp-cards'); container.innerHTML='';
  if (!groupId) { container.innerHTML='<div class="empty"><i class="fas fa-layer-group"></i>暂无字卡，请先添加</div>'; return; }
  const g=S.wordcards.groups.find(x=>x.id===groupId); if (!g) return;
  const active=g.cards.filter(c=>!c.disabled);
  if (!active.length) { container.innerHTML='<div class="empty"><i class="fas fa-layer-group"></i>该分组暂无字卡</div>'; return; }
  active.forEach(c=>{
    const el=document.createElement('div'); el.className='cp-card'; el.textContent=c.text;
    el.addEventListener('click',()=>{
      cpSelectedCards.push(c.text); renderCpSelected();
    });
    container.appendChild(el);
  });
}

function renderCpSelected() {
  const sel=document.getElementById('cp-selected'); sel.innerHTML='';
  cpSelectedCards.forEach((txt,i)=>{
    const tag=document.createElement('div'); tag.className='cp-sel-tag';
    const short=txt.length>12?txt.slice(0,12)+'…':txt;
    tag.innerHTML=`<span style="pointer-events:none;">${short}</span><span data-rm="${i}">✕</span>`;
    tag.querySelector('[data-rm]').addEventListener('click',()=>{ cpSelectedCards.splice(i,1); renderCpSelected(); });
    sel.appendChild(tag);
  });
}

document.getElementById('cp-send-btn').addEventListener('click',()=>{
  if (!cpSelectedCards.length) { toast('请先选择字卡'); return; }
  const text=cpSelectedCards.join(' ');
  sendPartnerMsg(text);
  cpSelectedCards=[];
  renderCpSelected();
  closeCardPicker();
});

document.getElementById('btn-card-tog').addEventListener('click',()=>{
  if (document.getElementById('card-picker').classList.contains('open')) closeCardPicker();
  else openCardPicker();
});

// ══════════════════════════════════════════════
// IMAGE
// ══════════════════════════════════════════════
document.getElementById('fi-img').addEventListener('change',function(){
  const f=this.files[0]; if(!f) return;
  const r=new FileReader(); r.onload=e=>sendMsg('',{type:'image',src:e.target.result}); r.readAsDataURL(f); this.value='';
});
document.getElementById('fi-camera').addEventListener('change',function(){
  const f=this.files[0]; if(!f) return;
  const r=new FileReader(); r.onload=e=>sendMsg('',{type:'image',src:e.target.result}); r.readAsDataURL(f); this.value='';
});
document.getElementById('pm-gallery').addEventListener('click',()=>{ closePlusMenu(); document.getElementById('fi-img').click(); });
document.getElementById('pm-camera').addEventListener('click',()=>{ closePlusMenu(); document.getElementById('fi-camera').click(); });

// ══════════════════════════════════════════════
// REPLY PREVIEW
// ══════════════════════════════════════════════
function setReply(m) {
  replyTarget=m;
  document.getElementById('rp-txt').textContent=`↩ ${m.text||'[图片]'}`;
  document.getElementById('reply-prev').style.display='block';
}
function clearReply() {
  replyTarget=null; document.getElementById('reply-prev').style.display='none';
}
document.getElementById('rp-close').addEventListener('click',clearReply);

// ══════════════════════════════════════════════
// EMOJI PANEL
// ══════════════════════════════════════════════
const EMOJI_CATS = {
  '😀 表情':['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  '❤️ 心情':['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🫶','✨','💫','⭐','🌟','🌙','🌈','☁️','⛅','❄️'],
  '👍 手势':['👋','🤚','🖐','✋','👌','🤌','✌️','🤞','🤟','👈','👉','👆','👇','☝️','👍','👎','✊','👊','👏','🙌','🙏','💪','🫶'],
  '🐱 动物':['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🦋','🐌','🐞','🐢','🐙','🦑','🐬','🐳','🦈'],
  '🌸 自然':['🌸','🌹','🥀','🌺','🌻','🌼','🌷','🌱','🌲','🌳','🌴','🌵','🍀','🍁','🍃','🍄','🌾','💐','🌊','🔥','💧','☃️'],
  '🍎 食物':['🍎','🍊','🍋','🍇','🍓','🫐','🍒','🍑','🥝','🍅','🥑','🍔','🍟','🍕','🌮','🍜','🍣','🍱','🧁','🍰','🎂','🍭','☕','🍵','🧋'],
  '🎉 活动':['🎉','🎊','🎈','🎀','🎁','🏆','🥇','🎵','🎶','🎮','🎯','🎲','📚','✏️','💻','📱','📷','🎬','🎤','🎧','✈️','🚀'],
  '💬 符号':['💯','✅','❌','⭕','❓','❗','💢','💬','💭','💤','🔔','🔝','🆙','🆒','🆕','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪'],
};
const KAOMOJI_BUILTIN=['(´・ω・`)','( ˘ω˘ )','（＾▽＾）','(✿◠‿◠)','(｡♥‿♥｡)','(≧∇≦)','(^///^)','(●´ω｀●)','(づ￣ 3￣)づ','(ง •̀_•́)ง','╰(*°▽°*)╯','（＾－＾）','(っ˘ω˘ς )','(｡•́︿•̀｡)','(T▽T)','(；′⌒`)','_(:з」∠)_','ヽ(°〇°)ﾉ','Σ(っ°Д°;)っ','(´；ω；`)','o(*￣▽￣*)ブ','(*＾▽＾*)','♪(´▽｀)','(灬°ω°灬)','( •̀ ω •́ )✧','ヾ(≧▽≦*)o','눈_눈','QAQ','TAT','(๑•̀ㅂ•́)و✧'];

let emojiTabCurrent='emoji';
function buildEmojiPanel() {
  const content=document.getElementById('e-content');
  function showTab(tab) {
    emojiTabCurrent=tab; content.innerHTML=''; content.style.cssText='';
    document.querySelectorAll('.e-tab').forEach(t=>t.classList.toggle('on',t.dataset.etab===tab));
    if (tab==='emoji') {
      Object.entries(EMOJI_CATS).forEach(([cat,items])=>{
        const lbl=document.createElement('div'); lbl.style.cssText='width:100%;font-size:10px;color:var(--text2);padding:4px 2px 2px;'; lbl.textContent=cat; content.appendChild(lbl);
        items.forEach(e=>{ const el=document.createElement('div'); el.className='e-item'; el.textContent=e; el.addEventListener('click',()=>insertText(e)); content.appendChild(el); });
      });
    } else if (tab==='kaomoji') {
      [...KAOMOJI_BUILTIN,...S.customKaomoji].forEach(k=>{ const el=document.createElement('div'); el.className='e-item km-item'; el.textContent=k; el.addEventListener('click',()=>insertText(k)); content.appendChild(el); });
    } else if (tab==='sticker') {
      content.style.cssText='display:flex;flex-wrap:wrap;padding:5px;gap:5px;overflow-y:auto;flex:1;width:100%;';
      if (!S.stickers.length) { const h=document.createElement('div'); h.className='empty'; h.style.width='100%'; h.innerHTML='<i class="fas fa-images"></i>在高级设置 › 表情包中添加'; content.appendChild(h); return; }
      S.stickers.forEach(stk=>{ const el=document.createElement('div'); el.className='stk-item-ep'; el.innerHTML=`<img src="${stk.src}" alt="">`; el.addEventListener('click',()=>{ sendMsg('',{type:'image',src:stk.src}); closeEmojiPanel(); }); content.appendChild(el); });
    }
  }
  document.querySelectorAll('.e-tab').forEach(t=>t.addEventListener('click',()=>showTab(t.dataset.etab)));
  showTab('emoji');
}
function insertText(t) {
  const inp=document.getElementById('msg-in'), pos=inp.selectionStart, val=inp.value;
  inp.value=val.slice(0,pos)+t+val.slice(pos); inp.selectionStart=inp.selectionEnd=pos+t.length; inp.focus();
}
function toggleEmojiPanel() { closeCardPicker(); closePlusMenu(); document.getElementById('emoji-panel').classList.toggle('open'); }
function closeEmojiPanel() { document.getElementById('emoji-panel').classList.remove('open'); }
function closePlusMenu()   { document.getElementById('plus-menu').classList.remove('open'); }
function togglePlusMenu()  { closeEmojiPanel(); closeCardPicker(); document.getElementById('plus-menu').classList.toggle('open'); }

// ══════════════════════════════════════════════
// NOTES
// ══════════════════════════════════════════════
function openNoteModal() {
  noteSender='me'; noteImgSrc=null;
  document.getElementById('nsb-me').classList.add('on'); document.getElementById('nsb-pt').classList.remove('on');
  document.getElementById('note-in').value=''; document.getElementById('note-img-name').textContent=''; document.getElementById('note-img-clr').style.display='none';
  openOv('ov-note-send');
}
document.querySelectorAll('[data-s]').forEach(el=>{ el.addEventListener('click',()=>{ noteSender=el.dataset.s; document.getElementById('nsb-me').classList.toggle('on',noteSender==='me'); document.getElementById('nsb-pt').classList.toggle('on',noteSender==='partner'); }); });
document.getElementById('btn-note-img').addEventListener('click',()=>document.getElementById('fi-note-img').click());
document.getElementById('fi-note-img').addEventListener('change',function(){
  const f=this.files[0]; if(!f) return;
  const r=new FileReader(); r.onload=e=>{ noteImgSrc=e.target.result; document.getElementById('note-img-name').textContent=f.name; document.getElementById('note-img-clr').style.display=''; }; r.readAsDataURL(f); this.value='';
});
document.getElementById('note-img-clr').addEventListener('click',()=>{ noteImgSrc=null; document.getElementById('note-img-name').textContent=''; document.getElementById('note-img-clr').style.display='none'; });
document.getElementById('btn-send-note').addEventListener('click',()=>{
  const text=document.getElementById('note-in').value.trim();
  if (!text&&!noteImgSrc) return toast('请输入内容');
  const note={ id:uid(), ts:Date.now(), from:noteSender, text, imgSrc:noteImgSrc, read:false, pinned:false };
  S.notes.push(note); save();
  const fromName=noteSender==='me'?S.settings.myName:S.settings.partnerName;
  addMessage({ id:uid(), ts:Date.now(), side:noteSender==='me'?'sent':'recv', type:'sys', text:`📌 ${fromName}递来一张小纸条，点击查看`, noteId:note.id });
  updateNotesBadge(); closeOv('ov-note-send'); toast('小纸条已发出');
});
function viewNoteById(id) { const n=S.notes.find(x=>x.id===id); if(!n) return; n.read=true; save(); updateNotesBadge(); renderNotesList(); viewNote(n); }
function viewNote(note) {
  const from=note.from==='me'?S.settings.myName:S.settings.partnerName;
  document.getElementById('note-view-meta').textContent=`${from} · ${new Date(note.ts).toLocaleString('zh-CN')}`;
  document.getElementById('note-view-txt').textContent=note.text||'';
  const img=document.getElementById('note-view-img');
  if (note.imgSrc) { img.src=note.imgSrc; img.style.display=''; } else { img.style.display='none'; }
  openOv('ov-note-view');
}
function renderNotesList() {
  const list=document.getElementById('notes-list');
  if (!S.notes.length) { list.innerHTML='<div class="empty"><i class="fas fa-thumbtack"></i>暂无小纸条</div>'; return; }
  const sorted=[...S.notes].sort((a,b)=>{ if(a.pinned!==b.pinned) return a.pinned?-1:1; return b.ts-a.ts; });
  list.innerHTML='';
  sorted.forEach(n=>{
    const el=document.createElement('div'); el.className=`note-item${!n.read?' unread':''}${n.pinned?' pinned':''}`;
    const from=n.from==='me'?S.settings.myName:S.settings.partnerName;
    el.innerHTML=`<div class="ni-head"><div class="ni-from">${from}</div><div class="ni-time">${new Date(n.ts).toLocaleDateString('zh-CN')}</div></div><div class="ni-body">${n.text||'[图片]'}</div><div class="ni-acts"><button class="btn btn-g btn-sm" data-pin="${n.id}">${n.pinned?'取消置顶':'置顶'}</button><button class="btn btn-d btn-sm" data-del-note="${n.id}">删除</button></div>`;
    el.querySelector('.ni-body').addEventListener('click',()=>{ n.read=true; save(); renderNotesList(); updateNotesBadge(); viewNote(n); });
    el.querySelector('[data-pin]').addEventListener('click',e=>{ e.stopPropagation(); n.pinned=!n.pinned; save(); renderNotesList(); });
    el.querySelector('[data-del-note]').addEventListener('click',e=>{ e.stopPropagation(); confirm2('确认删除这张小纸条？',()=>{ S.notes=S.notes.filter(x=>x.id!==n.id); save(); renderNotesList(); updateNotesBadge(); }); });
    list.appendChild(el);
  });
}
function updateNotesBadge() { const u=S.notes.filter(n=>!n.read).length; document.getElementById('note-unread-badge').textContent=u?`(${u}未读)`:''; }

// ══════════════════════════════════════════════
// ENVELOPES
// ══════════════════════════════════════════════
let envTab='write';
function switchEnvTab(tab) {
  envTab=tab;
  document.querySelectorAll('#env-tab-row .entab').forEach(t=>{ const on=t.dataset.etab===tab; t.classList.toggle('on',on); });
  document.getElementById('env-write').style.display=tab==='write'?'':'none';
  document.getElementById('env-sent').style.display=tab==='sent'?'':'none';
  document.getElementById('env-received').style.display=tab==='received'?'':'none';
  if (tab==='sent') renderEnvList('sent');
  if (tab==='received') checkAndRenderEnvReceived();
}
document.getElementById('env-tab-row').addEventListener('click',e=>{ const t=e.target.closest('.entab'); if(t) switchEnvTab(t.dataset.etab); });
document.getElementById('btn-send-env').addEventListener('click',()=>{
  const content=document.getElementById('env-in').value.trim(); if(!content) return toast('请写点什么');
  if (allCards().length<5) return toast('请先至少添加5张字卡');
  const env={ id:uid(), ts:Date.now(), content, replyAt:Date.now()+(10+Math.random()*10)*3600000, replied:false, replyContent:'', replyTs:null };
  S.envelopes.push(env); save(); document.getElementById('env-in').value=''; toast('信已寄出 ✉️'); switchEnvTab('sent');
});
function checkAndRenderEnvReceived() {
  S.envelopes.forEach(env=>{ if(!env.replied&&Date.now()>=env.replyAt){ const cards=allCards(); if(!cards.length) return; const count=10+Math.floor(Math.random()*11); const picked=new Set(); while(picked.size<Math.min(count,cards.length)) picked.add(cards[Math.floor(Math.random()*cards.length)]); env.replyContent=[...picked].join('\n'); env.replied=true; env.replyTs=Date.now(); save(); } });
  renderEnvList('received');
}
function renderEnvList(type) {
  const container=document.getElementById(type==='sent'?'env-sent':'env-received'); container.innerHTML='';
  const list=S.envelopes.filter(e=>type==='sent'?true:e.replied).sort((a,b)=>b.ts-a.ts);
  if (!list.length) { container.innerHTML='<div class="empty"><i class="fas fa-envelope"></i>暂无信件</div>'; return; }
  list.forEach(env=>{
    const item=document.createElement('div'); item.className='env-item';
    const preview=env.content.substring(0,45)+(env.content.length>45?'…':'');
    let statusHtml='';
    if (type==='sent') { statusHtml=!env.replied?`<div class="env-meta" style="color:var(--accent);">约 ${Math.max(0,Math.round((env.replyAt-Date.now())/3600000))} 小时后回信</div>`:`<div class="env-meta" style="color:var(--accent);">已收到回信</div>`; }
    else { statusHtml=`<div class="env-meta">${new Date(env.replyTs).toLocaleString('zh-CN')}</div>`; }
    item.innerHTML=`<div class="env-title">${type==='sent'?'我写给梦角':'梦角的回信'}</div><div class="env-meta">${preview}</div><div class="env-meta">${new Date(env.ts).toLocaleDateString('zh-CN')}</div>${statusHtml}`;
    item.addEventListener('click',()=>viewEnv(env,type));
    const del=document.createElement('button'); del.className='btn btn-d btn-sm'; del.style.marginTop='6px'; del.textContent='删除';
    del.addEventListener('click',e=>{ e.stopPropagation(); confirm2('确认删除这封信件？',()=>{ S.envelopes=S.envelopes.filter(x=>x.id!==env.id); save(); renderEnvList(type); }); });
    item.appendChild(del); container.appendChild(item);
  });
}
function viewEnv(env,type) {
  const isReply=type==='received';
  document.getElementById('env-view-title').textContent=isReply?'梦角的回信':'我写给梦角';
  document.getElementById('env-view-meta').textContent=new Date(isReply?env.replyTs:env.ts).toLocaleString('zh-CN');
  document.getElementById('env-view-body').textContent=isReply?env.replyContent:env.content;
  openOv('ov-env-view');
}

// ══════════════════════════════════════════════
// ENERGY STATUS
// ══════════════════════════════════════════════
let energyTab='me';
function switchEnergyTab(tab) {
  energyTab=tab;
  document.querySelectorAll('#ov-energy .entab').forEach(t=>t.classList.toggle('on',t.dataset.entab===tab));
  document.getElementById('en-me-tab').style.display=tab==='me'?'':'none';
  document.getElementById('en-pt-tab').style.display=tab==='partner'?'':'none';
  document.getElementById('en-shared-tab').style.display=tab==='shared'?'':'none';
  renderEnergyTab(tab);
}
document.querySelectorAll('[data-entab]').forEach(t=>t.addEventListener('click',()=>switchEnergyTab(t.dataset.entab)));
function renderEnergyTab(tab) {
  if (tab==='me') renderEnergyTags('me-en-tags',S.statusOptions.me,S.currentStatus.me);
  else if (tab==='partner') renderEnergyTags('pt-en-tags',S.statusOptions.partner,S.currentStatus.partner);
  else renderSharedTab();
}
function renderEnergyTags(cid,options,selected) {
  const c=document.getElementById(cid); c.innerHTML='';
  options.forEach(opt=>{ const t=document.createElement('div'); t.className='tag'+(selected.includes(opt)?' sel':''); t.textContent=opt; t.addEventListener('click',()=>t.classList.toggle('sel')); c.appendChild(t); });
}
function getSelTags(cid) { return [...document.querySelectorAll(`#${cid} .tag.sel`)].map(t=>t.textContent); }
document.getElementById('btn-save-me-en').addEventListener('click',()=>{ const sel=getSelTags('me-en-tags'), cu=document.getElementById('me-en-custom').value.trim(); S.currentStatus.me=cu?[...sel,cu]:sel; document.getElementById('me-en-custom').value=''; save(); toast('我的能量状态已更新'); });
document.getElementById('btn-save-pt-en').addEventListener('click',()=>{ const sel=getSelTags('pt-en-tags'), cu=document.getElementById('pt-en-custom').value.trim(); S.currentStatus.partner=cu?[...sel,cu]:sel; document.getElementById('pt-en-custom').value=''; save(); toast('梦角能量状态已更新'); });
function renderSharedTab() {
  document.getElementById('shared-current').textContent=S.currentStatus.shared||'未设置';
  renderEnergyTags('shared-tags',S.statusOptions.shared,[]);
  renderSharedProposalArea(); renderSharedHistory();
}
function renderSharedProposalArea() {
  const area=document.getElementById('shared-proposal-area'); area.innerHTML='';
  const p=S.sharedProposal; if(!p) return;
  const box=document.createElement('div'); box.className='proposal-box';
  const timeout=Date.now()-p.ts>3600000;
  if (timeout) {
    box.innerHTML=`<div class="proposal-val">${p.value}</div><div class="proposal-meta">提议已超时</div>`;
    const clr=document.createElement('button'); clr.className='btn btn-g btn-sm'; clr.style.marginTop='7px'; clr.textContent='清除'; clr.addEventListener('click',()=>{ S.sharedProposal=null; save(); renderSharedTab(); }); box.appendChild(clr);
  } else {
    box.innerHTML=`<div class="proposal-val">${p.value}</div><div class="proposal-meta">⏳ 等待梦角回应…</div>`;
    const resp=document.createElement('button'); resp.className='btn btn-p btn-sm'; resp.style.marginTop='7px'; resp.textContent='梦角回应'; resp.addEventListener('click',openProposalRespond); box.appendChild(resp);
    const cancel=document.createElement('button'); cancel.className='btn btn-d btn-sm'; cancel.style.cssText='margin-top:7px;margin-left:7px;'; cancel.textContent='取消提议'; cancel.addEventListener('click',()=>{ S.sharedProposal=null; save(); renderSharedTab(); }); box.appendChild(cancel);
  }
  area.appendChild(box);
}
document.getElementById('btn-propose-shared').addEventListener('click',()=>{
  if (S.sharedProposal) return toast('已有待回应的提议');
  const sel=document.querySelector('#shared-tags .tag.sel'), cu=document.getElementById('shared-custom').value.trim();
  const value=cu||(sel?sel.textContent:''); if(!value) return toast('请选择或输入提议状态');
  S.sharedProposal={ id:uid(), value, ts:Date.now(), denialOptions:S.statusOptions.shared };
  document.getElementById('shared-custom').value=''; document.querySelectorAll('#shared-tags .tag.sel').forEach(t=>t.classList.remove('sel'));
  save(); renderSharedTab(); toast('提议已发出');
});
function openProposalRespond() {
  const p=S.sharedProposal; if(!p) return;
  document.getElementById('proposal-val-display').textContent=p.value;
  document.getElementById('proposal-deny-area').style.display='none';
  document.getElementById('proposal-respond-btns').style.display='flex';
  openOv('ov-proposal-respond');
}
document.getElementById('btn-proposal-yes').addEventListener('click',()=>{
  const p=S.sharedProposal; if(!p) return;
  S.currentStatus.shared=p.value; S.sharedHistory.unshift({ts:Date.now(),value:p.value,action:'通过',reason:''});
  S.sharedProposal=null; save(); closeOv('ov-proposal-respond'); renderSharedTab(); toast('共同状态已更新');
});
document.getElementById('btn-proposal-no').addEventListener('click',()=>{
  document.getElementById('proposal-respond-btns').style.display='none';
  document.getElementById('proposal-deny-area').style.display='';
  const opts=document.getElementById('deny-reason-opts'); opts.innerHTML='';
  (S.sharedProposal?.denialOptions||[]).forEach(opt=>{ const t=document.createElement('div'); t.className='tag'; t.textContent=opt; t.addEventListener('click',()=>{ opts.querySelectorAll('.tag').forEach(x=>x.classList.remove('sel')); t.classList.add('sel'); }); opts.appendChild(t); });
});
document.getElementById('btn-confirm-deny').addEventListener('click',()=>{
  const p=S.sharedProposal; if(!p) return;
  const sel=document.querySelector('#deny-reason-opts .tag.sel'), cu=document.getElementById('deny-custom-reason').value.trim();
  const reason=cu||(sel?sel.textContent:'无');
  S.sharedHistory.unshift({ts:Date.now(),value:p.value,action:'否定',reason});
  S.sharedProposal=null; document.getElementById('deny-custom-reason').value=''; save(); closeOv('ov-proposal-respond'); renderSharedTab(); toast('梦角否定了提议');
});
function renderSharedHistory() {
  const c=document.getElementById('shared-history'); c.innerHTML='';
  if (!S.sharedHistory.length) { c.innerHTML='<div style="font-size:12px;color:var(--text2);padding:9px 0;">暂无记录</div>'; return; }
  S.sharedHistory.slice(0,20).forEach(h=>{
    const item=document.createElement('div'); item.className='tl-item';
    item.innerHTML=`<div class="tl-dot" style="${h.action==='否定'?'background:#f05050;':''}"></div><div class="tl-right"><div class="tl-val">${h.value} <span style="font-size:11px;font-weight:400;color:${h.action==='否定'?'#f05050':'var(--accent)'};">${h.action}</span></div>${h.reason&&h.reason!=='无'?`<div class="tl-meta">原因：${h.reason}</div>`:''}<div class="tl-meta">${new Date(h.ts).toLocaleString('zh-CN')}</div></div>`;
    c.appendChild(item);
  });
}

// ══════════════════════════════════════════════
// STATUS PRESETS (能量预设管理)
// ══════════════════════════════════════════════
function renderStatusPresets() { renderStatusList('my-st-list',S.statusOptions.me); renderStatusList('pt-st-list',S.statusOptions.partner); renderStatusList('rel-st-list',S.statusOptions.shared); }
function renderStatusList(id,arr) {
  const list=document.getElementById(id); list.innerHTML='';
  if (!arr.length) { list.innerHTML='<div style="font-size:12px;color:var(--text2);padding:7px 0;">暂无预设</div>'; return; }
  arr.forEach((opt,i)=>{ const row=document.createElement('div'); row.className='st-item'; row.innerHTML=`<span style="font-size:13px;color:var(--text);">${opt}</span><button style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:12px;">✕</button>`; row.querySelector('button').addEventListener('click',()=>{ arr.splice(i,1); save(); renderStatusPresets(); }); list.appendChild(row); });
}
['my','pt','rel'].forEach(k=>{
  const key=k==='my'?'me':k==='pt'?'partner':'shared';
  document.getElementById(`btn-add-${k}-st`).addEventListener('click',()=>{ const inp=document.getElementById(`new-${k}-st`); const v=inp.value.trim(); if(!v) return; S.statusOptions[key].push(v); inp.value=''; save(); renderStatusPresets(); });
});

// ══════════════════════════════════════════════
// WORDCARDS
// ══════════════════════════════════════════════
let currentGroupId=null, groupEditBackTo='ov-wordcards';
function renderGroupList() {
  const list=document.getElementById('group-list'); list.innerHTML='';
  S.wordcards.groups.forEach(g=>{
    if (g.id==='status') return; // shown in advanced directly
    const item=document.createElement('div'); item.className='group-item';
    item.innerHTML=`<div class="gi-left"><div class="gi-name">${g.name}${g.builtin?'<span style="font-size:10px;color:var(--text2);"> 内置</span>':''}</div><div class="gi-count">${g.cards.length} 张，${g.cards.filter(c=>!c.disabled).length} 启用</div></div><div class="gi-right">${!g.builtin?`<button class="icon-btn" data-del-group="${g.id}"><i class="fas fa-trash"></i></button>`:''}<i class="fas fa-chevron-right" style="color:var(--text2);font-size:12px;"></i></div>`;
    item.addEventListener('click',e=>{ if(e.target.closest('[data-del-group]')) return; openGroupEdit(g.id,'ov-wordcards'); });
    const delBtn=item.querySelector('[data-del-group]');
    if (delBtn) delBtn.addEventListener('click',e=>{ e.stopPropagation(); confirm2(g.cards.length?`该分组有 ${g.cards.length} 张字卡，删除后不可恢复，确认？`:'确认删除该分组？',()=>{ S.wordcards.groups=S.wordcards.groups.filter(x=>x.id!==g.id); save(); renderGroupList(); }); });
    list.appendChild(item);
  });
}
function openGroupEdit(groupId, backTo) {
  currentGroupId=groupId; groupEditBackTo=backTo||'ov-wordcards';
  const g=S.wordcards.groups.find(x=>x.id===groupId); if(!g) return;
  document.getElementById('group-edit-title').textContent=g.name;
  document.getElementById('new-card-in').value=''; renderCardList(); closeAll(); openOv('ov-group-edit');
}
document.getElementById('back-group').addEventListener('click',()=>{ closeOv('ov-group-edit'); openOv(groupEditBackTo); });
function renderCardList() {
  const g=S.wordcards.groups.find(x=>x.id===currentGroupId); if(!g) return;
  const list=document.getElementById('card-list'); list.innerHTML='';
  document.getElementById('group-card-count').textContent=`共 ${g.cards.length} 张，${g.cards.filter(c=>!c.disabled).length} 启用`;
  if (!g.cards.length) { list.innerHTML='<div class="empty"><i class="fas fa-layer-group"></i>暂无字卡</div>'; return; }
  g.cards.forEach((c,i)=>{
    const row=document.createElement('div'); row.className='card-item';
    row.innerHTML=`<div class="card-txt${c.disabled?' dis':''}">${c.text}</div><div class="card-acts"><button class="icon-btn" title="${c.disabled?'启用':'禁用'}"><i class="fas fa-${c.disabled?'eye':'eye-slash'}"></i></button><button class="icon-btn" title="删除"><i class="fas fa-trash"></i></button></div>`;
    const btns=row.querySelectorAll('.icon-btn');
    btns[0].addEventListener('click',()=>{ c.disabled=!c.disabled; save(); renderCardList(); renderGroupList(); });
    btns[1].addEventListener('click',()=>{ g.cards.splice(i,1); save(); renderCardList(); renderGroupList(); });
    list.appendChild(row);
  });
}
document.getElementById('btn-add-card').addEventListener('click',()=>{
  const v=document.getElementById('new-card-in').value.trim(); if(!v) return;
  const g=S.wordcards.groups.find(x=>x.id===currentGroupId); if(!g) return;
  g.cards.push({id:uid(),text:v,disabled:false}); save(); renderCardList(); renderGroupList();
  document.getElementById('new-card-in').value='';
});
document.getElementById('btn-add-group').addEventListener('click',()=>{
  const name=document.getElementById('new-group-in').value.trim(); if(!name) return;
  S.wordcards.groups.push({id:uid(),name,builtin:false,cards:[]}); save(); renderGroupList(); document.getElementById('new-group-in').value='';
});
document.getElementById('btn-wc-export').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(S.wordcards,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='wordcards.json'; a.click();
});
document.getElementById('btn-wc-import').addEventListener('click',()=>document.getElementById('fi-wc-import').click());
document.getElementById('fi-wc-import').addEventListener('change',function(){
  const f=this.files[0]; if(!f) return;
  const r=new FileReader(); r.onload=e=>{ try{ const d=JSON.parse(e.target.result); if(d.groups){ S.wordcards=d; save(); renderGroupList(); toast('导入成功'); } else toast('格式错误'); } catch{ toast('导入失败'); } }; r.readAsText(f); this.value='';
});

// 在线状态 shortcut
document.getElementById('sc-online-status').addEventListener('click',()=>openGroupEdit('status','ov-advanced'));

// ══════════════════════════════════════════════
// KAOMOJI MGR
// ══════════════════════════════════════════════
function renderKaomojiList() {
  const list=document.getElementById('km-custom-list'); list.innerHTML='';
  if (!S.customKaomoji.length) { list.innerHTML='<div style="font-size:12px;color:var(--text2);padding:7px 0;">暂无自定义颜文字</div>'; return; }
  S.customKaomoji.forEach((k,i)=>{ const row=document.createElement('div'); row.className='km-list-item'; row.innerHTML=`<div class="km-txt">${k}</div><button class="icon-btn"><i class="fas fa-trash"></i></button>`; row.querySelector('button').addEventListener('click',()=>{ S.customKaomoji.splice(i,1); save(); renderKaomojiList(); }); list.appendChild(row); });
}
document.getElementById('btn-add-km').addEventListener('click',()=>{ const v=document.getElementById('new-km-in').value.trim(); if(!v) return; S.customKaomoji.push(v); save(); renderKaomojiList(); document.getElementById('new-km-in').value=''; });

// ══════════════════════════════════════════════
// STICKER MGR
// ══════════════════════════════════════════════
function renderStickerMgr() {
  const grid=document.getElementById('stk-mgr-grid'); grid.innerHTML='';
  S.stickers.forEach((stk,i)=>{ const item=document.createElement('div'); item.className='stk-item'; item.innerHTML=`<img src="${stk.src}" alt=""><button class="stk-del">✕</button>`; item.querySelector('button').addEventListener('click',()=>{ S.stickers.splice(i,1); save(); renderStickerMgr(); }); grid.appendChild(item); });
  const add=document.createElement('div'); add.style.cssText='width:70px;height:70px;border-radius:11px;border:2px dashed var(--border);color:var(--text2);font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;'; add.innerHTML='<i class="fas fa-plus"></i>'; add.addEventListener('click',()=>document.getElementById('fi-sticker').click()); grid.appendChild(add);
}
document.getElementById('btn-add-sticker').addEventListener('click',()=>document.getElementById('fi-sticker').click());
document.getElementById('fi-sticker').addEventListener('change',function(){ Array.from(this.files).forEach(f=>{ const r=new FileReader(); r.onload=e=>{ S.stickers.push({id:uid(),src:e.target.result}); save(); renderStickerMgr(); }; r.readAsDataURL(f); }); this.value=''; });

// ══════════════════════════════════════════════
// APPEARANCE
// ══════════════════════════════════════════════
document.getElementById('accent-row').addEventListener('click',e=>{ const dot=e.target.closest('.c-dot'); if(!dot) return; document.querySelectorAll('.c-dot').forEach(d=>d.classList.remove('on')); dot.classList.add('on'); S.settings.accent=dot.dataset.c; save(); applySettings(); });
document.getElementById('btn-wall').addEventListener('click',()=>document.getElementById('fi-wall').click());
document.getElementById('fi-wall').addEventListener('change',function(){ const f=this.files[0]; if(!f) return; const r=new FileReader(); r.onload=e=>{ S.settings.wallpaper=e.target.result; save(); applySettings(); }; r.readAsDataURL(f); this.value=''; });
document.getElementById('btn-wall-clr').addEventListener('click',()=>{ S.settings.wallpaper=null; save(); applySettings(); });
document.getElementById('wall-op').addEventListener('input',function(){ S.settings.wallOpacity=+this.value; document.getElementById('wall-op-v').textContent=this.value+'%'; save(); applySettings(); });
document.getElementById('fs-sl').addEventListener('input',function(){ S.settings.fontSize=+this.value; document.getElementById('fs-v').textContent=this.value+'px'; save(); applySettings(); });
document.getElementById('apply-bbl-css').addEventListener('click',()=>{ S.settings.bubbleCSS=document.getElementById('bbl-css-in').value; save(); applySettings(); toast('CSS已应用'); });
document.getElementById('reset-bbl-css').addEventListener('click',()=>{ S.settings.bubbleCSS=''; document.getElementById('bbl-css-in').value=''; save(); applySettings(); toast('已重置'); });

// ══════════════════════════════════════════════
// CHAT SETTINGS
// ══════════════════════════════════════════════
document.getElementById('tog-autosend').addEventListener('click',function(){ this.classList.toggle('on'); S.settings.autoSend.enabled=this.classList.contains('on'); save(); scheduleAutoSend(); });
document.getElementById('as-min-sl').addEventListener('input',function(){ S.settings.autoSend.minMin=+this.value; document.getElementById('as-min-v').textContent=this.value+'分钟'; save(); scheduleAutoSend(); });
document.getElementById('as-max-sl').addEventListener('input',function(){ S.settings.autoSend.maxMin=+this.value; document.getElementById('as-max-v').textContent=this.value+'分钟'; save(); });
document.getElementById('tog-reply-delay').addEventListener('click',function(){ this.classList.toggle('on'); S.settings.replyDelay.enabled=this.classList.contains('on'); save(); });
document.getElementById('rd-min-sl').addEventListener('input',function(){ S.settings.replyDelay.minSec=+this.value; document.getElementById('rd-min-v').textContent=this.value+'秒'; save(); });
document.getElementById('rd-max-sl').addEventListener('input',function(){ S.settings.replyDelay.maxSec=+this.value; document.getElementById('rd-max-v').textContent=this.value+'秒'; save(); });
['sound','typing','quote'].forEach(k=>{ document.getElementById(`tog-${k}`).addEventListener('click',function(){ this.classList.toggle('on'); S.settings[k==='quote'?'quoteEnabled':k]=this.classList.contains('on'); save(); }); });

// ══════════════════════════════════════════════
// AVATAR / NAME
// ══════════════════════════════════════════════
let avPopTarget=null;
function showAvPop(target, anchor) {
  avPopTarget=target;
  const pop=document.getElementById('av-pop'), rect=anchor.getBoundingClientRect();
  pop.style.left=Math.min(rect.left,window.innerWidth-180)+'px'; pop.style.top=(rect.bottom+6)+'px'; pop.classList.add('open');
}
document.getElementById('partner-ui').addEventListener('click',e=>{ showAvPop('partner',document.getElementById('partner-av')); e.stopPropagation(); });
document.getElementById('my-ui').addEventListener('click',e=>{ showAvPop('me',document.getElementById('my-av')); e.stopPropagation(); });
document.getElementById('ap-photo').addEventListener('click',()=>{ closeAvPop(); document.getElementById('fi-av').click(); });
document.getElementById('ap-name').addEventListener('click',()=>{ closeAvPop(); const isP=avPopTarget==='partner'; openEditModal(isP?'修改梦角的名字':'修改我的名字',isP?S.settings.partnerName:S.settings.myName,val=>{ if(isP) S.settings.partnerName=val; else S.settings.myName=val; save(); applySettings(); }); });
function closeAvPop() { document.getElementById('av-pop').classList.remove('open'); }
document.getElementById('fi-av').addEventListener('change',function(){ const f=this.files[0]; if(!f) return; const r=new FileReader(); r.onload=e=>{ if(avPopTarget==='partner') S.settings.partnerAvatar=e.target.result; else S.settings.myAvatar=e.target.result; save(); applySettings(); }; r.readAsDataURL(f); this.value=''; });

// ══════════════════════════════════════════════
// EDIT MODAL
// ══════════════════════════════════════════════
function openEditModal(title,value,cb) { document.getElementById('edit-ttl').textContent=title; document.getElementById('edit-in').value=value; editCallback=cb; openOv('ov-edit'); setTimeout(()=>document.getElementById('edit-in').focus(),120); }
document.getElementById('btn-save-edit').addEventListener('click',()=>{ const v=document.getElementById('edit-in').value.trim(); if(!v) return; if(editCallback){ editCallback(v); editCallback=null; } closeOv('ov-edit'); });
document.getElementById('edit-in').addEventListener('keydown',e=>{ if(e.key==='Enter') document.getElementById('btn-save-edit').click(); });

// ══════════════════════════════════════════════
// CONFIRM
// ══════════════════════════════════════════════
let confirmCb=null;
function confirm2(msg,cb) { document.getElementById('confirm-msg').textContent=msg; confirmCb=cb; openOv('ov-confirm'); }
document.getElementById('btn-confirm-yes').addEventListener('click',()=>{ if(confirmCb){ confirmCb(); confirmCb=null; } closeOv('ov-confirm'); });
document.getElementById('btn-confirm-no').addEventListener('click',()=>{ confirmCb=null; closeOv('ov-confirm'); });

// ══════════════════════════════════════════════
// CONTEXT MENU
// ══════════════════════════════════════════════
document.getElementById('cx-quote').addEventListener('click',()=>{ if(ctxTarget&&S.settings.quoteEnabled){ setReply(ctxTarget); document.getElementById('msg-in').focus(); } closeCtx(); });
document.getElementById('cx-copy').addEventListener('click',()=>{ if(ctxTarget?.text) navigator.clipboard.writeText(ctxTarget.text).then(()=>toast('已复制')); closeCtx(); });
document.getElementById('cx-del').addEventListener('click',()=>{ if(!ctxTarget) return; const i=S.messages.findIndex(m=>m.id===ctxTarget.id); if(i>=0){ S.messages.splice(i,1); save(); renderMessages(); } closeCtx(); });
function closeCtx() { document.getElementById('ctx').classList.remove('open'); ctxTarget=null; }

// ══════════════════════════════════════════════
// VIDEO CALL (PIP)
// ══════════════════════════════════════════════
let callTimer=null, callSec=0;
document.getElementById('pm-video').addEventListener('click',()=>{ closePlusMenu(); setAvEl('c-av-in',S.settings.partnerAvatar); document.getElementById('c-nm-in').textContent=S.settings.partnerName; document.getElementById('call-inc').classList.add('open'); });
document.getElementById('btn-c-dec').addEventListener('click',endCall);
document.getElementById('btn-c-acc').addEventListener('click',()=>{
  document.getElementById('call-inc').classList.remove('open');
  const pip=document.getElementById('call-pip'); pip.classList.add('open');
  const pc=document.getElementById('pip-circle'); const src=S.settings.partnerAvatar;
  pc.innerHTML=src?`<img src="${src}" alt="">`:`<i class="fas fa-user" style="font-size:24px;color:var(--accent);"></i>`;
  callSec=0; clearInterval(callTimer);
  callTimer=setInterval(()=>{ callSec++; const m=String(Math.floor(callSec/60)).padStart(2,'0'),s=String(callSec%60).padStart(2,'0'); document.getElementById('pip-timer').textContent=`${m}:${s}`; },1000);
});
document.getElementById('btn-pip-end').addEventListener('click',endCall);
document.getElementById('btn-pip-mute').addEventListener('click',function(){ this.style.opacity=this.style.opacity==='0.5'?'1':'0.5'; });
function endCall() { clearInterval(callTimer); document.getElementById('call-inc').classList.remove('open'); document.getElementById('call-pip').classList.remove('open'); }
// draggable pip
(function(){ const pip=document.getElementById('call-pip'); let sx=0,sy=0; pip.addEventListener('mousedown',e=>{ if(e.target.closest('button')) return; sx=e.clientX-pip.offsetLeft; sy=e.clientY-pip.offsetTop; const mv=e=>{ pip.style.right='auto';pip.style.bottom='auto';pip.style.left=(e.clientX-sx)+'px';pip.style.top=(e.clientY-sy)+'px'; }; const up=()=>{ document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); }; document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up); }); pip.addEventListener('touchstart',e=>{ if(e.target.closest('button')) return; const t=e.touches[0]; sx=t.clientX-pip.offsetLeft; sy=t.clientY-pip.offsetTop; const mv=e=>{ const t=e.touches[0]; pip.style.right='auto';pip.style.bottom='auto';pip.style.left=(t.clientX-sx)+'px';pip.style.top=(t.clientY-sy)+'px'; }; const up=()=>{ document.removeEventListener('touchmove',mv); document.removeEventListener('touchend',up); }; document.addEventListener('touchmove',mv,{passive:true}); document.addEventListener('touchend',up); },{passive:true}); })();

// ══════════════════════════════════════════════
// MODAL ROUTING
// ══════════════════════════════════════════════
document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>closeOv(el.dataset.close)));
document.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click',()=>openOv(el.dataset.open)));
document.querySelectorAll('[data-back]').forEach(el=>el.addEventListener('click',()=>{ closeAll(); openOv(el.dataset.back); }));
document.querySelectorAll('.ov').forEach(ov=>ov.addEventListener('click',e=>{ if(e.target===ov) closeOv(ov.id); }));
document.getElementById('btn-settings').addEventListener('click',()=>openOv('ov-settings'));
document.getElementById('btn-plus').addEventListener('click',togglePlusMenu);
document.getElementById('btn-emoji-tog').addEventListener('click',toggleEmojiPanel);
document.getElementById('pm-note').addEventListener('click',()=>{ closePlusMenu(); openNoteModal(); });

// send
document.getElementById('send-btn').addEventListener('click',doSend);
document.getElementById('msg-in').addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); doSend(); } });
document.getElementById('msg-in').addEventListener('input',function(){ this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,88)+'px'; });

// global close
document.addEventListener('click',e=>{
  if(!document.getElementById('ctx').contains(e.target)) closeCtx();
  if(!document.getElementById('av-pop').contains(e.target)&&!document.getElementById('partner-ui').contains(e.target)&&!document.getElementById('my-ui').contains(e.target)) closeAvPop();
  if(!document.getElementById('emoji-panel').contains(e.target)&&!document.getElementById('btn-emoji-tog').contains(e.target)) closeEmojiPanel();
  if(!document.getElementById('plus-menu').contains(e.target)&&!document.getElementById('btn-plus').contains(e.target)) closePlusMenu();
  if(!document.getElementById('card-picker').contains(e.target)&&!document.getElementById('btn-card-tog').contains(e.target)) closeCardPicker();
});

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
async function init() {
  await load();
  applySettings();
  buildEmojiPanel();
  // sync sliders
  const s=S.settings;
  document.getElementById('fs-sl').value=s.fontSize; document.getElementById('fs-v').textContent=s.fontSize+'px';
  document.getElementById('wall-op').value=s.wallOpacity; document.getElementById('wall-op-v').textContent=s.wallOpacity+'%';
  document.getElementById('as-min-sl').value=s.autoSend.minMin; document.getElementById('as-min-v').textContent=s.autoSend.minMin+'分钟';
  document.getElementById('as-max-sl').value=s.autoSend.maxMin; document.getElementById('as-max-v').textContent=s.autoSend.maxMin+'分钟';
  document.getElementById('rd-min-sl').value=s.replyDelay.minSec; document.getElementById('rd-min-v').textContent=s.replyDelay.minSec+'秒';
  document.getElementById('rd-max-sl').value=s.replyDelay.maxSec; document.getElementById('rd-max-v').textContent=s.replyDelay.maxSec+'秒';
  // sync toggles
  document.getElementById('tog-autosend').classList.toggle('on',s.autoSend.enabled);
  document.getElementById('tog-reply-delay').classList.toggle('on',s.replyDelay.enabled);
  document.getElementById('tog-sound').classList.toggle('on',s.sound);
  document.getElementById('tog-typing').classList.toggle('on',s.typing);
  document.getElementById('tog-quote').classList.toggle('on',s.quoteEnabled);
  // sync accent
  document.querySelectorAll('.c-dot').forEach(d=>d.classList.toggle('on',d.dataset.c===s.accent));
  document.getElementById('bbl-css-in').value=s.bubbleCSS||'';
  // render all
  renderMessages(); renderGroupList(); renderNotesList(); updateNotesBadge(); renderStatusPresets(); renderKaomojiList(); renderStickerMgr();
  // envelope check
  checkAndRenderEnvReceived();
  setInterval(()=>{ S.envelopes.forEach(env=>{ if(!env.replied&&Date.now()>=env.replyAt) checkAndRenderEnvReceived(); }); },5*60*1000);
  // auto send
  scheduleAutoSend();
}
init();
