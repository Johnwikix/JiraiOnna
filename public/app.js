import { story, nodes, routes, characters, endings } from './story.js';
import { createState, advance, choose, validateState, getBacklog, resolveLine, getReadKey } from './engine.js';
import { MusicPlayer, tracks, trackFor } from './music.js';
import { getPortraitAsset, getSceneCue, getStagePortrait, getSeenCgs } from './visuals.js';
import { getTransition, TransitionPlayer, transitionLines } from './transitions.js';

const $ = id => document.getElementById(id);
const icons = {
  play:'<path d="m8 5 11 7-11 7z"/>', book:'<path d="M12 5c-3-2-7-2-10-1v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 1zM12 5v16"/>',
  save:'<path d="M4 3h13l4 4v14H3V3zM7 3v6h10V3M7 21v-8h10v8"/>', branch:'<circle cx="5" cy="4" r="2"/><circle cx="19" cy="7" r="2"/><circle cx="5" cy="20" r="2"/><path d="M5 6v12M5 13c8 0 14-1 14-4"/>',
  flower:'<path d="M12 9c-7-11-14 1-3 3-11 7 1 14 3 3 7 11 14-1 3-3 11-7-1-14-3-3z"/><circle cx="12" cy="12" r="2"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15c2 1 3 3 3 6"/>',
  music:'<path d="M9 18V5l12-3v13M9 8l12-3"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="18" cy="15" rx="3" ry="2.5"/>',
  mute:'<path d="M9 18V5l12-3v9M9 8l12-3M17 16l5 5M22 16l-5 5"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/>',
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>', full:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>', eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.book}</svg>`;
const escape = v => String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const keys = { current:`jirai.current.${story.version}`, collection:`jirai.collection.${story.version}`, settings:'jirai.settings.v1', slots:`jirai.slots.${story.version}` };
let storageWarning = false;
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { if (!storageWarning) { storageWarning = true; toast('浏览器无法保存数据，请在存读档中导出进度文件。'); } return false; } }
function bounded(v, min, max, fallback) { return Number.isFinite(Number(v)) ? Math.min(max,Math.max(min,Number(v))) : fallback; }
const rawSettings = read(keys.settings, {});
let settings = { speed:bounded(rawSettings.speed,0,60,24), fontSize:bounded(rawSettings.fontSize,14,24,20), autoDelay:bounded(rawSettings.autoDelay,1,5,2), volume:bounded(rawSettings.volume,0,1,.35), music:rawSettings.music !== false, rain:rawSettings.rain !== false };
let state = read(keys.current, null); if (!validateState(state, nodes)) state = null;
let slots = read(keys.slots, {}); if (!slots || typeof slots !== 'object' || Array.isArray(slots)) slots = {};
for (const key of Object.keys(slots)) if (!['auto','quick','1','2','3','4','5','6'].includes(key) || !validateState(slots[key]?.state,nodes)) delete slots[key];
const savedCollection = read(keys.collection, {});
let collection = {
  endings: new Set(Array.isArray(savedCollection.endings) ? savedCollection.endings.filter(id => endings.some(e=>e.id===id)) : []),
  read: new Set(Array.isArray(savedCollection.read) ? savedCollection.read.filter(k=>typeof k==='string').slice(0,10000) : []),
  checkpoints: Object.fromEntries(Object.entries(savedCollection.checkpoints || {}).filter(([id,s])=>nodes[id] && validateState(s,nodes)))
};
let reading = false, typing = false, fullText = '', typeTimer, playTimer, auto = false, skipping = false, toastTimer, currentPortrait = '', media = { backgrounds:{}, portraits:{}, cgs:{}, scenes:{} };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const transition = new TransitionPlayer($('scene-transition'), reducedMotion);
let paintedPosition = null;
$('scene-transition').onclick=()=>transition.finish();
const music = new MusicPlayer(toast); music.setVolume(settings.volume);

function toast(message) { $('toast').textContent=message; $('toast').hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').hidden=true,3600); }
function persistCollection() { write(keys.collection, { endings:[...collection.endings], read:[...collection.read], checkpoints:collection.checkpoints }); }
function snapshot() { return { savedAt:new Date().toISOString(), state:structuredClone(state) }; }
function persist() { if (state) write(keys.current,state); }
function readKey(value=state){return getReadKey(value.nodeId,value.line,nodes[value.nodeId],value.flags);}
function saveAuto() { if(state) { slots.auto=snapshot(); write(keys.slots,slots); } }
function stopModes() { auto=false;skipping=false;clearTimeout(playTimer);$('auto-button').setAttribute('aria-pressed','false');$('auto-state').textContent='OFF';$('skip-button').setAttribute('aria-pressed','false'); }
function updateNav() {
  $('continue').disabled=!state;
  $('continue').classList.toggle('active',reading);
  $('endings-menu').innerHTML=`${icon('flower')}结局收集 <span class="nav-count">${collection.endings.size}/${endings.length}</span>`;
  ['backlog-button','auto-button','skip-button','quick-save'].forEach(id=>$(id).disabled=!reading||!state||state.ended);
  $('quick-load').disabled=!slots.quick;
}
function setBackground(bg, cgId = '') {
  $('backdrop').dataset.bg=bg;
  const cg=media.cgs?.[cgId],asset=cg?.src||media.backgrounds[bg];
  $('stage').dataset.cg=cg?cgId:'';
  $('backdrop').style.setProperty('--scene-focus',cg?.focus||'center');
  $('backdrop').style.setProperty('--cg-mobile-position',cg?.mobilePosition||'50% top');
  $('backdrop').style.setProperty('--cg-mobile-size',cg?.mobileSize||'auto 72svh');
  $('backdrop').style.backgroundImage=asset?`url("${asset}")`:'';
  $('rain').hidden=!!cg||!settings.rain||reducedMotion||!['rain','station','dawn'].includes(bg);
}
function renderVisuals() {
  if(!reading||!state){setBackground('rain');$('portrait-wrap').hidden=true;currentPortrait='';return;}
  const node=nodes[state.nodeId],cue=getSceneCue(media,state.nodeId,state.line);
  setBackground(cue.background||node.bg,cue.cg);
  const portrait=getStagePortrait(media,state.nodeId,node,state.line,characters,state.flags);
  if(!portrait){$('portrait-wrap').hidden=true;currentPortrait='';return;}
  const {key,outfit,src,mode,label}=portrait,portraitIdentity=`${key}:${outfit}:${mode}:${src}`;
  if(currentPortrait!==portraitIdentity) {
    const img=new Image();img.className='portrait';img.alt=mode==='photo'?'手机照片里，凛披着许砚的深蓝外套':`${label}的${outfitLabel(outfit)}立绘`;img.src=src;
    img.addEventListener('error',()=>{if(currentPortrait===portraitIdentity)$('portrait-wrap').hidden=true;},{once:true});
    $('portrait-slot').replaceChildren(img);currentPortrait=portraitIdentity;
  }
  $('portrait-wrap').dataset.mode=mode;$('portrait-wrap').dataset.character=key;$('portrait-wrap').dataset.outfit=outfit;
  $('portrait-name').textContent=label;$('portrait-wrap').hidden=false;
}
function titleScreen() {
  transition.cancel();paintedPosition=null;
  stopModes();clearTimeout(typeTimer);reading=false;typing=false;
  setInterfaceHidden(false);document.body.dataset.mode='title';
  $('title-screen').hidden=false;$('reader').hidden=true;renderVisuals();
  $('toolbar-status').textContent='雨还没有停。';updateNav();music.play('night');
}
function begin(reset=false) {
  transition.cancel();paintedPosition=null;
  if(reset||!state) { if(state) saveAuto();state=createState();persist(); }
  reading=true;$('title-screen').hidden=true;$('reader').hidden=false;stopModes();
  document.body.dataset.mode='reading';setInterfaceHidden(false);
  if(settings.music&&!music.enabled) music.toggle(); else music.resume();
  updateMusicButton();render();$('stage').focus({preventScroll:true});
}
function finishTyping() {
  clearTimeout(typeTimer);typing=false;$('dialogue-text').textContent=fullText;
  const key=readKey();
  if(!collection.read.has(key)) { collection.read.add(key);persistCollection(); }
  $('next-button').textContent=nodes[state.nodeId].ending && state.line===nodes[state.nodeId].lines.length-1?'揭晓结局':'继续';
  showChoices();schedule();
}
function typeLine(text) {
  clearTimeout(typeTimer);typing=false;fullText=text;
  if(settings.speed===0||reducedMotion||skipping) { finishTyping();return; }
  const chars=Array.from(text);let cursor=0;typing=true;$('dialogue-text').textContent='';
  $('choices').hidden=true;$('next-button').textContent='显示全文';
  const step=()=>{ if(!reading)return;cursor=Math.min(chars.length,cursor+1);$('dialogue-text').textContent=chars.slice(0,cursor).join('');if(cursor===chars.length)finishTyping();else typeTimer=setTimeout(step,settings.speed); };step();
}
function render() {
  clearTimeout(playTimer);clearTimeout(typeTimer);
  const cut=getTransition(paintedPosition,state,nodes,media);
  if(cut){
    typing=false;$('choices').hidden=true;$('next-button').disabled=true;
    transition.play(cut.text,()=>paintScene(true),()=>{
      if(!reading||state.ended)return;
      const line=resolveLine(nodes[state.nodeId].lines[state.line],state.flags);
      $('a11y-line').textContent=line.speaker==='旁白'?line.text:`${line.speaker}：${line.text}`;
      typeLine(line.text);
    },skipping);
    return;
  }
  paintScene();
}
function paintScene(deferText=false) {
  paintedPosition={nodeId:state.nodeId,line:state.line,ended:state.ended};
  const node=nodes[state.nodeId],line=resolveLine(node.lines[state.line],state.flags);
  $('chapter').textContent=node.chapter;$('scene-title').textContent=node.title;$('scene-time').textContent=node.time;
  const narration=line.speaker==='旁白';
  $('dialogue').dataset.narration=String(narration);$('dialogue-speaker-row').hidden=narration;
  $('speaker').textContent=narration?'':line.speaker;$('speaker').style.color=characters[line.speaker]?.color||'';
  $('line-number').textContent=`${String(state.line+1).padStart(2,'0')} / ${String(node.lines.length).padStart(2,'0')}`;
  $('read-status').textContent=collection.read.has(readKey())?'已读':'未读';
  $('toolbar-status').textContent=`${node.chapter} / ${node.title}`;
  $('a11y-line').textContent=deferText?'':narration?line.text:`${line.speaker}：${line.text}`;
  $('choices').hidden=true;$('choices-scroll-hint').hidden=true;$('ending-panel').hidden=!state.ended;$('dialogue').hidden=state.ended;
  $('next-button').disabled=false;
  renderVisuals();music.play(trackFor(node));
  if(!collection.checkpoints[state.nodeId]) { collection.checkpoints[state.nodeId]=structuredClone({...state,line:0,ended:false});persistCollection(); }
  if(state.line===0)saveAuto();
  if(state.ended) {
    stopModes();const end=endings.find(e=>e.id===node.ending);
    collection.endings.add(end.id);persistCollection();
    const outcomeLabel={good:'GOOD END',neutral:'NORMAL END',bad:'BAD END'}[end.outcome];
    $('ending-panel').dataset.outcome=end.outcome;
    $('ending-type').textContent=`${outcomeLabel} · ${end.type} · ${collection.endings.size} / ${endings.length}`;
    $('ending-title').textContent=end.title;$('ending-description').textContent=end.description;
    $('choices').hidden=true;
  } else if(deferText){fullText=line.text;typing=false;$('dialogue-text').textContent='';}else typeLine(line.text);
  persist();updateNav();
}
function showChoices() {
  const node=nodes[state.nodeId];if(typing||state.ended||!node.choices||state.line!==node.lines.length-1){$('choices').hidden=true;return;}
  stopModes();$('choices').replaceChildren();
  node.choices.forEach((c,i)=>{
    const button=document.createElement('button');button.className='choice-button';
    button.innerHTML=`<span class="choice-index">${String(i+1).padStart(2,'0')}</span>${escape(c.text)}${c.note?`<small>${escape(c.note)}</small>`:''}`;
    button.addEventListener('click',()=>selectChoice(i));$('choices').append(button);
  });$('choices').hidden=false;$('choices').scrollTop=0;$('next-button').disabled=true;updateChoiceScroll();
}
function updateChoiceScroll(){
  const group=$('choices'),hint=$('choices-scroll-hint');
  if(group.hidden||group.scrollHeight<=group.clientHeight+1){hint.hidden=true;return;}
  const box=group.getBoundingClientRect(),remaining=[...group.children].filter(b=>b.getBoundingClientRect().bottom>box.bottom-5).length;
  hint.textContent=`共 ${group.children.length} 项 · ${remaining?`下方还有 ${remaining} 项，向下滚动`:'已到末项，可向上滚动'}`;
  hint.style.top=`${box.bottom+2}px`;hint.hidden=false;
}
function next() {
  if(!reading||!state||state.ended||$('modal').open)return;
  if(transition.active){transition.finish();return;}
  if($('reader').classList.contains('ui-hidden')){setInterfaceHidden(false);return;}
  if(typing){finishTyping();return;}
  if(!$('choices').hidden)return;
  $('next-button').disabled=false;state=advance(state,nodes);render();
}
function selectChoice(index) { if(transition.active||typing||$('choices').hidden)return;stopModes();state=choose(state,index,nodes);$('next-button').disabled=false;render(); }
function schedule() {
  clearTimeout(playTimer);if(transition.active||!reading||typing||state.ended||!$('choices').hidden||$('modal').open)return;
  if(skipping) {
    const nextState=advance(state,nodes);
    if(nextState===state||!collection.read.has(readKey(nextState))){stopModes();return;}
    playTimer=setTimeout(next,70);
  } else if(auto)playTimer=setTimeout(next,settings.autoDelay*1000+fullText.length*45);
}
function openModal(title,html) { transition.finish();stopModes();$('modal-title').textContent=title;$('modal-content').innerHTML=html;if(!$('modal').open)$('modal').showModal();$('modal').scrollTop=0; }
function closeModal() { $('modal').close(); }
function loadState(value) { if(!validateState(value,nodes)){toast('存档不匹配当前故事版本，无法读取。');return;}state=structuredClone(value);closeModal();begin(); }

function showSaves() {
  const descriptions={auto:'自动存档',quick:'快速存档',1:'存档 01',2:'存档 02',3:'存档 03',4:'存档 04',5:'存档 05',6:'存档 06'};
  openModal('存档与读档',`<p class="modal-intro">每次进入新场景自动保存。手动存档共六格；新故事保留已读与结局。存档保存在当前浏览器，可导出到文件。</p><div class="save-list">${Object.entries(descriptions).map(([key,label])=>{
    const slot=slots[key],n=slot&&nodes[slot.state.nodeId];
    return `<section class="save-slot"><h3>${label}</h3><p>${n?`${escape(n.chapter)}<br>${escape(n.title)} · 第 ${slot.state.line+1} 句`:'空存档'}<span class="save-date">${slot?escape(new Date(slot.savedAt).toLocaleString('zh-CN')):'尚未保存'}</span></p><div class="slot-buttons">${!['auto','quick'].includes(key)?`<button class="small-button" data-save="${key}" ${!state?'disabled':''}>保存</button>`:''}<button class="small-button" data-load="${key}" ${!slot?'disabled':''}>读取</button>${slot?`<button class="small-button danger" data-delete="${key}">删除</button>`:''}</div></section>`;
  }).join('')}</div><div class="modal-actions"><button id="export-save" class="secondary-button">导出全部进度</button><button id="import-save" class="secondary-button">导入进度文件</button>${read('jirai.current.v1',null)||Object.keys(read('jirai.slots.v1',{})).length?'<button id="export-legacy" class="secondary-button">导出 1.0 旧存档</button>':''}</div><p class="about-note">1.1 重写了剧情与分支，已读和结局从新版本重新记录。1.0 存档保留在浏览器，可导出备份，不会被新存档覆盖。</p>`);
  document.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>{
    const key=b.dataset.save;
    if(slots[key])return confirmAction('覆盖这个存档？','原有的这一格存档将被当前进度替换，其他存档保持不变。',()=>{slots[key]=snapshot();write(keys.slots,slots);showSaves();toast('已保存。');});
    slots[key]=snapshot();write(keys.slots,slots);showSaves();toast('已保存。');
  });
  document.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>loadState(slots[b.dataset.load].state));
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>confirmAction('删除这个存档？','这次操作无法撤销。可以先导出进度文件保留备份。',()=>{delete slots[b.dataset.delete];write(keys.slots,slots);showSaves();updateNav();}));
  $('export-save').onclick=exportSave;$('import-save').onclick=()=>$('import-file').click();
  if($('export-legacy'))$('export-legacy').onclick=()=>downloadData({format:'jirai-onna-save',version:1,storyVersion:'1.0.0',current:read('jirai.current.v1',null),slots:read('jirai.slots.v1',{}),collection:read('jirai.collection.v1',{endings:[],read:[],checkpoints:{}})},'你明明醒着-1.0旧存档.json');
}
function confirmAction(title,text,action) {openModal(title,`<p>${escape(text)}</p><div class="modal-actions"><button id="confirm-action" class="primary-button">确认</button><button id="cancel-action" class="secondary-button">取消</button></div>`);$('confirm-action').onclick=action;$('cancel-action').onclick=showSaves;}
function exportSave() {
  const data={format:'jirai-onna-save',version:1,storyVersion:story.version,current:state,slots,collection:{endings:[...collection.endings],read:[...collection.read],checkpoints:collection.checkpoints}};
  downloadData(data,`你明明醒着-${new Date().toISOString().slice(0,10)}.json`);
}
function downloadData(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function importSave(file) {
  if(!file)return;if(file.size>3_000_000){toast('存档文件过大，请选择本游戏导出的 JSON 文件。');return;}
  try {
    const data=JSON.parse(await file.text());
    if(data.format!=='jirai-onna-save'||data.version!==1||data.storyVersion!==story.version||data.current&&!validateState(data.current,nodes))throw Error();
    if(!data.slots||Array.isArray(data.slots)||Object.keys(data.slots).length>8)throw Error();
    for(const [key,slot]of Object.entries(data.slots))if(!['auto','quick','1','2','3','4','5','6'].includes(key)||!validateState(slot?.state,nodes)||!Number.isFinite(Date.parse(slot.savedAt)))throw Error();
    if(!data.collection||!Array.isArray(data.collection.endings)||!Array.isArray(data.collection.read)||data.collection.read.length>10000)throw Error();
    if(data.collection.endings.some(id=>!endings.some(e=>e.id===id))||data.collection.read.some(key=>typeof key!=='string'||key.length>100))throw Error();
    if(!data.collection.checkpoints||Object.keys(data.collection.checkpoints).length>Object.keys(nodes).length)throw Error();
    for(const [id,s]of Object.entries(data.collection.checkpoints))if(!nodes[id]||!validateState(s,nodes)||s.nodeId!==id)throw Error();
    openModal('导入进度',`<p>已验证文件：${escape(file.name)}。导入将替换当前进度和存档格，已读与结局收集合并保留。</p><div class="modal-actions"><button id="do-import" class="primary-button">导入进度</button><button id="cancel-import" class="secondary-button">取消</button></div>`);
    $('cancel-import').onclick=showSaves;$('do-import').onclick=()=>{
      state=data.current;slots=data.slots;
      data.collection.endings.forEach(id=>collection.endings.add(id));data.collection.read.forEach(key=>collection.read.add(key));Object.assign(collection.checkpoints,data.collection.checkpoints);
      persist();if(!state)try{localStorage.removeItem(keys.current);}catch{}write(keys.slots,slots);persistCollection();closeModal();titleScreen();toast('进度已导入，点击继续阅读。');
    };
  }catch{toast('无法导入：文件格式、剧情版本或分支记录无效。请选择本游戏导出的存档。');}
}

function showRoutes() {
  const groups=[{id:'common',name:'共通篇与终章'},...routes.map(r=>({id:r.id,name:`${r.name} · ${r.subtitle}`}))];
  openModal('分支记录',`<p class="modal-intro">亮起的场景已读到，可以从当时的选择重新开始。未知场景只显示位置；回到分歧会保留之前的选择与结局收集。</p>${groups.map(group=>`<section class="route-group"><h3>${escape(group.name)}</h3><div class="route-nodes">${Object.entries(nodes).filter(([,n])=>(n.route||'common')===group.id&&!n.ending).map(([id,n],i)=>{
    const unlocked=!!collection.checkpoints[id];return `<button class="route-node ${state?.nodeId===id?'current':''}" data-jump="${id}" ${!unlocked?'disabled':''}>${unlocked?escape(n.title):`未读片段 ${i+1}`}</button>`;
  }).join('')}</div></section>`).join('')}`);
  document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{saveAuto();loadState(collection.checkpoints[b.dataset.jump]);});
}
function showEndings() {
  openModal(`结局收集 · ${collection.endings.size} / ${endings.length}`,`<p class="modal-intro">三个好结局、三个中性结局、六个坏结局。结局在读完最后一段后解锁；未解锁的标题与内容保持隐藏。</p><ol class="ending-list">${endings.map((e,i)=>{
    const unlocked=collection.endings.has(e.id);return `<li class="ending-item ${unlocked?'':'locked'}" ${unlocked?`data-outcome="${escape(e.outcome)}"`:''}><small>${String(i+1).padStart(2,'0')} · ${unlocked?escape(e.type):'未解锁'}</small><h3>${unlocked?escape(e.title):'尚未抵达的结尾'}</h3><p>${unlocked?escape(e.description):'继续阅读，在分歧处作出不同选择。'}</p>${unlocked?`<button class="text-button unlock" data-ending="${e.node}">重读结局</button>`:''}</li>`;
  }).join('')}</ol>`);
  document.querySelectorAll('[data-ending]').forEach(b=>b.onclick=()=>{const checkpoint=collection.checkpoints[b.dataset.ending];if(checkpoint)loadState(checkpoint);});
}
function outfitLabel(outfit) {
  return {work:'工作装',interview:'面试装',home:'居家装',casual:'日常便服','night-visit':'凌晨来访','soft-knit':'奶白针织','borrowed-jacket':'借来的外套',studio:'摄影棚',bookshop:'书店',office:'通勤装',date:'约会装'}[outfit]||outfit;
}
function characterArtKey(name, character) { return character.portrait||(name==='许砚'?'xu':''); }
function artNav(selected) {
  return '<nav class="art-nav" aria-label="人物与画廊"><button class="text-button" data-art-nav="characters" aria-pressed="'+(selected==='characters')+'">人物衣装</button><button class="text-button" data-art-nav="gallery" aria-pressed="'+(selected==='gallery')+'">场景回忆</button></nav>';
}
function bindArtNav() {
  document.querySelectorAll('[data-art-nav]').forEach(button=>button.onclick=button.dataset.artNav==='gallery'?showGallery:showCharacters);
}
function showCharacters() {
  openModal('人物与画廊',artNav('characters')+'<p class="modal-intro">五位成年角色。选择人物，查看不同场景下的衣装。</p>'+Object.entries(characters).filter(([,c])=>c.age).map(([name,c])=>{
    const key=characterArtKey(name,c),src=getPortraitAsset(media,key),count=Object.keys(story.wardrobes[key]||{}).length;
    return '<article class="character-row"><div class="character-monogram">'+(src?'<img src="'+escape(src)+'" alt="" loading="lazy">':escape(name.slice(-1)))+'</div><div><h3>'+escape(name)+'</h3><small>'+c.age+' 岁'+(c.origin?' / '+escape(c.origin):'')+'</small><p>'+escape(c.role)+'</p><button class="text-button" data-wardrobe="'+key+'">查看衣装 · '+count+' 套</button></div></article>';
  }).join(''));
  bindArtNav();document.querySelectorAll('[data-wardrobe]').forEach(button=>button.onclick=()=>showWardrobe(button.dataset.wardrobe));
}
function showWardrobe(key, selected) {
  const person=Object.entries(characters).find(([name,c])=>characterArtKey(name,c)===key);
  if(!person)return;
  const available=Object.keys(story.wardrobes[key]||{}).filter(outfit=>getPortraitAsset(media,key,outfit));
  selected=available.includes(selected)?selected:available[0];
  if(!selected){showCharacters();return;}
  const [name,c]=person,src=getPortraitAsset(media,key,selected);
  openModal(name+' · 衣装',artNav('characters')+'<button class="text-button art-back" id="art-back">返回人物列表</button><div class="wardrobe-view"><figure class="wardrobe-frame"><img src="'+escape(src)+'" alt="'+escape(name+'的'+outfitLabel(selected))+'"></figure><div class="wardrobe-copy"><p class="wardrobe-age">'+c.age+' 岁</p><h3>'+escape(outfitLabel(selected))+'</h3><p>'+escape(story.wardrobes[key][selected])+'</p><div class="outfit-options" role="group" aria-label="选择衣装">'+available.map(outfit=>'<button class="small-button" data-outfit="'+outfit+'" aria-pressed="'+(outfit===selected)+'">'+escape(outfitLabel(outfit))+'</button>').join('')+'</div><a class="text-button" href="'+escape(src)+'" target="_blank" rel="noopener">查看原图</a></div></div>');
  bindArtNav();$('art-back').onclick=showCharacters;document.querySelectorAll('[data-outfit]').forEach(button=>button.onclick=()=>showWardrobe(key,button.dataset.outfit));
}
function showGallery() {
  const unlocked=getSeenCgs(media,collection.read),items=Object.entries(media.cgs||{});
  openModal('场景回忆 · '+unlocked.size+' / '+items.length,artNav('gallery')+'<p class="modal-intro">读到对应片段后，画面会保存在这里。未解锁的场景保持隐藏。</p><div class="memory-grid">'+items.map(([id,cg])=>{
    const seen=unlocked.has(id);
    return '<button class="memory-item" data-memory="'+id+'" '+(seen?'':'disabled')+'>'+(seen?'<img src="'+escape(cg.src)+'" alt="" loading="lazy">':'<span class="memory-locked">尚未抵达</span>')+'<span>'+(seen?escape(cg.title):'未解锁的画面')+'</span></button>';
  }).join('')+'</div>');
  bindArtNav();document.querySelectorAll('[data-memory]').forEach(button=>button.onclick=()=>showCG(button.dataset.memory));
}
function showCG(id) {
  const cg=media.cgs?.[id];if(!cg||!getSeenCgs(media,collection.read).has(id))return;
  openModal(cg.title,artNav('gallery')+'<button class="text-button art-back" id="art-back">返回场景回忆</button><figure class="cg-frame"><img src="'+escape(cg.src)+'" alt="'+escape(cg.alt)+'"></figure><a class="text-button" href="'+escape(cg.src)+'" target="_blank" rel="noopener">查看原图</a>');
  bindArtNav();$('art-back').onclick=showGallery;
}
function showBacklog() {
  if(!state)return;const entries=getBacklog(state,nodes,transitionLines);
  openModal('剧情回看',entries.map(entry=>`${entry.lines.map(l=>`${l.transitionText?`<div class="log-entry log-transition"><strong>转场</strong><p>${escape(l.transitionText)}</p></div>`:''}<div class="log-entry"><strong>${escape(l.speaker)}</strong><p>${escape(l.text)}</p></div>`).join('')}${entry.choice!==null?`<p class="log-choice">选择：${escape(nodes[entry.nodeId].choices[entry.choice].text)}</p>`:''}`).join(''));
  $('modal').scrollTop=$('modal').scrollHeight;
}
function showSettings() {
  openModal('阅读与声音',`<p class="modal-intro">空格 / 回车继续，数字键选择；A 自动，S 存读档，L 回看，H 隐藏界面，Esc 游戏菜单。</p>
    <div class="setting-row"><label for="setting-speed">文字速度<small>0 为立即显示全文</small></label><input id="setting-speed" type="range" min="0" max="60" step="2" value="${settings.speed}" aria-label="每个字的显示间隔"><output id="speed-value">${settings.speed} ms</output></div>
    <div class="setting-row"><label for="setting-font">对白字号</label><input id="setting-font" type="range" min="14" max="24" step="1" value="${settings.fontSize}"><output id="font-value">${settings.fontSize}px</output></div>
    <div class="setting-row"><label for="setting-delay">自动阅读停留</label><input id="setting-delay" type="range" min="1" max="5" step=".5" value="${settings.autoDelay}"><output id="delay-value">${settings.autoDelay}s</output></div>
    <div class="setting-row"><label for="setting-volume">音乐音量<small>场景变化时平滑切换</small></label><input id="setting-volume" type="range" min="0" max="1" step=".05" value="${settings.volume}"><output id="volume-value">${Math.round(settings.volume*100)}%</output></div>
    <div class="setting-row"><label for="setting-music">播放场景配乐</label><input id="setting-music" type="checkbox" ${settings.music?'checked':''}></div>
    <div class="setting-row"><label for="setting-rain">雨幕动效<small>跟随系统减少动态效果设置</small></label><input id="setting-rain" type="checkbox" ${settings.rain?'checked':''}></div>
    <h3>原声音乐</h3><p class="about-note">八首为本作编写并以本地脚本合成的循环配乐。无配音；不使用现成商业歌曲。</p>${Object.entries(tracks).map(([key,t])=>`<div class="track-row"><div><p>${escape(t.title)}</p><small>${escape(t.mood)}</small></div><button class="small-button" data-track="${key}">试听</button></div>`).join('')}`);
  const bind=(id,key,format)=>$(id).oninput=e=>{settings[key]=Number(e.target.value);$(id.replace('setting-','')+'-value')?.replaceChildren(document.createTextNode(format(settings[key])));applySettings();};
  bind('setting-speed','speed',v=>`${v} ms`);bind('setting-font','fontSize',v=>`${v}px`);bind('setting-delay','autoDelay',v=>`${v}s`);bind('setting-volume','volume',v=>`${Math.round(v*100)}%`);
  $('setting-music').onchange=e=>{settings.music=e.target.checked;if(settings.music!==music.enabled)music.toggle();updateMusicButton();applySettings();};
  $('setting-rain').onchange=e=>{settings.rain=e.target.checked;applySettings();};
  document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>{if(!music.enabled)music.toggle();settings.music=true;music.play(b.dataset.track,true);$('setting-music').checked=true;updateMusicButton();write(keys.settings,settings);toast(`正在试听：${tracks[b.dataset.track].title}`);});
}
function applySettings(){document.documentElement.style.setProperty('--reader-size',`${settings.fontSize}px`);music.setVolume(settings.volume);renderVisuals();write(keys.settings,settings);}
function updateMusicButton(){for(const id of ['music-button','title-music']){$(id).innerHTML=icon(music.enabled?'music':'mute');$(id).setAttribute('aria-label',music.enabled?'关闭音乐':'开启音乐');$(id).setAttribute('aria-pressed',String(music.enabled));}}
function setInterfaceHidden(hidden){$('reader').classList.toggle('ui-hidden',hidden);document.body.classList.toggle('interface-hidden',hidden);$('hide-ui-button').setAttribute('aria-pressed',String(hidden));$('show-interface').hidden=!hidden;if(hidden)stopModes();}
function showPause(){setInterfaceHidden(false);openModal('游戏菜单',`<div class="pause-actions"><button class="secondary-button" data-pause="resume">继续游戏</button><button class="secondary-button" data-pause="saves">存档 / 读档</button><button class="secondary-button" data-pause="routes">分支记录</button><button class="secondary-button" data-pause="endings">结局收集</button><button class="secondary-button" data-pause="characters">登场人物</button><button class="secondary-button" data-pause="settings">阅读与声音</button><button class="secondary-button" data-pause="full">切换全屏</button><button class="secondary-button" data-pause="home">返回标题</button></div><p class="pause-version">${escape(nodes[state.nodeId].chapter)} / ${escape(nodes[state.nodeId].title)} · ${story.version}</p>`);const actions={resume:closeModal,saves:showSaves,routes:showRoutes,endings:showEndings,characters:showCharacters,settings:showSettings,full:()=>{$('fullscreen-button').click();closeModal();},home:()=>{closeModal();titleScreen();}};document.querySelectorAll('[data-pause]').forEach(b=>b.onclick=actions[b.dataset.pause]);}
function showAbout(){openModal('关于这个故事',`<h3>${escape(story.title)}</h3><p>${escape(story.description)}</p><p>${escape(story.contentNote)}</p><p class="about-note">${escape(story.credits)}</p><p class="about-note">原故事保留点：日本双份兼职、艺术大学院面试、东京/宫崎/山梨同事、牛丼店、长消息、墙边冲突、深夜敲窗、追逐与信封。四条角色路线和终章为新创作。聊天发送人均用化名或泛称，群友对白经过虚构化。</p><p class="about-note">原始聊天文件由服务端隔离保存，不会随游戏发送到浏览器。进度文件可能包含你的选择，分享前请自行检查。</p><p class="about-note">游戏版本 ${story.version} · Node.js / Browser JavaScript</p>`);}

[['continue','play','继续游戏'],['new-game','book','开始游戏'],['save-menu','save','存档 / 读档'],['routes-menu','branch','分支记录'],['endings-menu','flower','结局收集'],['characters-menu','people','人物 / 画廊']].forEach(([id,i,label])=>$(id).innerHTML=`${icon(i)}${label}`);
$('settings-button').innerHTML=icon('settings');$('close-modal').innerHTML=icon('close');$('fullscreen-button').innerHTML=icon('full');
$('title-settings').innerHTML=icon('settings');$('backlog-button').innerHTML=icon('book');$('hide-ui-button').innerHTML=icon('eye');$('pause-button').innerHTML=icon('menu');
$('title-settings').onclick=showSettings;$('pause-button').onclick=showPause;$('hide-ui-button').onclick=()=>setInterfaceHidden(true);$('show-interface').onclick=()=>setInterfaceHidden(false);
$('home').onclick=titleScreen;$('continue').onclick=()=>begin();$('new-game').onclick=()=>begin(true);$('start-button').onclick=()=>begin(!state);
$('save-menu').onclick=showSaves;$('routes-menu').onclick=showRoutes;$('endings-menu').onclick=showEndings;$('characters-menu').onclick=showCharacters;
$('settings-button').onclick=showSettings;$('about-button').onclick=showAbout;$('close-modal').onclick=closeModal;
$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
$('modal').addEventListener('close',()=>{if(reading)music.play(trackFor(nodes[state.nodeId]));});
$('advance-area').onclick=next;$('next-button').onclick=next;$('backlog-button').onclick=showBacklog;
$('choices').addEventListener('scroll',updateChoiceScroll,{passive:true});new ResizeObserver(updateChoiceScroll).observe($('choices'));
$('auto-button').onclick=()=>{if(!reading||state.ended)return;auto=!auto;skipping=false;$('auto-button').setAttribute('aria-pressed',String(auto));$('auto-state').textContent=auto?'ON':'OFF';$('skip-button').setAttribute('aria-pressed','false');if(!typing)schedule();};
$('skip-button').onclick=()=>{if(!reading||state.ended)return;skipping=!skipping;auto=false;$('auto-state').textContent='OFF';$('skip-button').setAttribute('aria-pressed',String(skipping));$('auto-button').setAttribute('aria-pressed','false');if(skipping&&collection.read.has(readKey())){if(typing)finishTyping();else schedule();}else if(skipping){stopModes();toast('已到未读对白，跳过暂停。');}};
$('quick-save').onclick=()=>{if(!state)return;slots.quick=snapshot();write(keys.slots,slots);updateNav();toast('快速存档已保存。');};
$('quick-load').onclick=()=>{if(slots.quick)loadState(slots.quick.state);};
$('ending-home').onclick=titleScreen;$('ending-routes').onclick=()=>{const checkpoint=collection.checkpoints.morning||collection.checkpoints.knock;if(checkpoint)loadState(checkpoint);else showRoutes();};
$('music-button').onclick=$('title-music').onclick=()=>{music.toggle();settings.music=music.enabled;write(keys.settings,settings);updateMusicButton();};
$('fullscreen-button').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('当前浏览器不支持全屏，请使用浏览器全屏功能。');}};
$('import-file').onchange=e=>{importSave(e.target.files[0]);e.target.value='';};
document.addEventListener('keydown',e=>{
  if(transition.active&&[' ','Enter','ArrowRight'].includes(e.key)){e.preventDefault();transition.finish();return;}
  if(e.key==='Escape'&&!$('modal').open&&reading){e.preventDefault();if($('reader').classList.contains('ui-hidden'))setInterfaceHidden(false);else showPause();return;}
  if($('modal').open||/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||!reading)return;
  if([' ','Enter','ArrowRight'].includes(e.key)){e.preventDefault();next();}
  else if(/^[1-5]$/.test(e.key)&&!$('choices').hidden){e.preventDefault();const i=Number(e.key)-1;if(nodes[state.nodeId].choices[i])selectChoice(i);}
  else if(e.key.toLowerCase()==='a')$('auto-button').click();else if(e.key.toLowerCase()==='s')showSaves();else if(e.key.toLowerCase()==='l')showBacklog();else if(e.key.toLowerCase()==='h')setInterfaceHidden(!$('reader').classList.contains('ui-hidden'));
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopModes();music.pause();persist();}else music.resume();});
window.addEventListener('pagehide',persist);

const rainCanvas=$('rain'),ctx=rainCanvas.getContext('2d');let drops=[],lastFrame=0;
function resizeRain(){const r=$('stage').getBoundingClientRect();rainCanvas.width=r.width;rainCanvas.height=r.height;drops=Array.from({length:50},()=>({x:Math.random()*r.width,y:Math.random()*r.height,l:10+Math.random()*18,s:170+Math.random()*160}));}
new ResizeObserver(resizeRain).observe($('stage'));
function drawRain(time){const dt=Math.min((time-lastFrame)/1000,.05);lastFrame=time;if(!rainCanvas.hidden&&!document.hidden&&ctx){ctx.clearRect(0,0,rainCanvas.width,rainCanvas.height);ctx.strokeStyle='#d5bfd6';ctx.lineWidth=.7;ctx.beginPath();for(const d of drops){d.y+=d.s*dt;d.x-=d.s*.13*dt;if(d.y>rainCanvas.height+30){d.y=-30;d.x=Math.random()*rainCanvas.width;}ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-3,d.y+d.l);}ctx.stroke();}if(!reducedMotion)requestAnimationFrame(drawRain);}
if(!reducedMotion)requestAnimationFrame(drawRain);
applySettings();updateMusicButton();titleScreen();
if(!state&&read('jirai.current.v1',null))toast('剧本已重写为 1.1。旧存档保留在浏览器，可在存读档中导出；新剧情请重新开始。');
// media.json 记录站点根绝对路径（/art/...），部署在 GitHub Pages 子路径时需转为相对路径
const relativize=v=>Array.isArray(v)?v.map(relativize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,val])=>[k,relativize(val)])):typeof v==='string'&&v.startsWith('/')?v.slice(1):v;
fetch('media.json').then(r=>r.ok?r.json():null).then(data=>{if(data){media={backgrounds:{},portraits:{},cgs:{},scenes:{},...relativize(data)};renderVisuals();}}).catch(()=>{});
