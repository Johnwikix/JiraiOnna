// Run in an isolated agent-browser session with text speed zero.
(async()=>{
  const {nodes,story}=await import('/story.js'),{createState,advance,choose}=await import('/engine.js');
  const media=await(await fetch('/media.json')).json(),el=id=>document.getElementById(id);
  const key='jirai.current.'+story.version,current=()=>JSON.parse(localStorage.getItem(key));
  const finishCut=()=>{const cut=el('scene-transition');if(cut&&!cut.hidden)cut.click();};
  function pathTo(id){
    const queue=[{s:createState(),path:[]}],seen=new Set();
    while(queue.length){
      const {s,path}=queue.shift(),sig=JSON.stringify([s.nodeId,s.flags]);
      if(seen.has(sig))continue;seen.add(sig);
      if(s.nodeId===id)return path;
      const n=nodes[s.nodeId],last={...s,line:n.lines.length-1};
      if(n.ending)continue;
      if(n.choices)n.choices.forEach((_,i)=>queue.push({s:choose(last,i,nodes),path:[...path,i]}));
      else queue.push({s:advance(last,nodes),path});
    }
    throw Error('No path to '+id);
  }
  async function show(id,line=0){
    if(el('modal').open)el('close-modal').click();
    const path=pathTo(id);el('new-game').click();let at=0,guard=0;
    while(current().nodeId!==id&&guard++<1000){
      if(!el('choices').hidden)el('choices').children[path[at++]].click();
      else el('advance-area').click();
      finishCut();
    }
    if(current().nodeId!==id)throw Error('Target not reached '+id);
    finishCut();for(let i=0;i<line;i++){el('advance-area').click();finishCut();}
    const sprite=el('portrait-slot').querySelector('img');
    if(sprite&&!el('portrait-wrap').hidden)await sprite.decode();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return {node:current().nodeId,line:current().line,cg:el('stage').dataset.cg,portrait:el('portrait-wrap').hidden?null:{...el('portrait-wrap').dataset},text:el('dialogue-text').textContent};
  }
  function check(condition,message){if(!condition)throw Error(message);}
  const sources=[...Object.values(media.backgrounds),...Object.values(media.portraits).flatMap(entry=>Object.entries(entry).filter(([key])=>key!=='default').map(([,src])=>src)),...Object.values(media.cgs).map(cg=>cg.src)];
  let decoded=0;
  for(let offset=0;offset<sources.length;offset+=6)await Promise.all(sources.slice(offset,offset+6).map(async src=>{const image=new Image();image.src=src;await image.decode();check(image.naturalWidth>500,'Small or broken '+src);decoded++;}));
  const workLine=nodes.workday.lines.findIndex(l=>l.speaker==='黑濑凛');
  const work=await show('workday',workLine);check(work.portrait?.outfit==='work','Wrong work outfit');
  const casual=await show('rin1',nodes.rin1.lines.findIndex(l=>l.speaker==='黑濑凛'));check(casual.cg==='rin-cafe'&&!casual.portrait,'Cafe actor is not seated');
  const soft=await show('shiori2',nodes.shiori2.lines.findIndex(l=>l.speaker==='黑濑凛'));check(soft.portrait?.outfit==='soft-knit','Wrong bookshop visit outfit');
  const photo=await show('rin3',2);check(photo.portrait?.mode==='photo'&&photo.portrait?.outfit==='borrowed-jacket','Phone photo missing');
  const call=await show('rin3',9);check(!call.portrait,'Remote speaker appeared in room');
  const closedDoor=await show('peephole',8);check(!closedDoor.portrait,'Person drawn inside closed door');
  const discoveries=[];
  for(const [id,cues]of Object.entries(media.scenes))for(const cue of cues.filter(cue=>cue.cg)){
    const frame=await show(id,cue.from);
    check(frame.cg===cue.cg&&!frame.portrait,'Missing CG or duplicate actor '+id);if(!discoveries.includes(cue.cg))discoveries.push(cue.cg);
  }
  const before=JSON.stringify(current());el('pause-button').click();el('modal-content').querySelector('[data-pause="characters"]').click();
  check(el('modal').open,'Characters did not open');
  const counts={};
  for(const character of ['xu','rin','nana','shiori','qing']){
    el('modal-content').querySelector('[data-wardrobe="'+character+'"]').click();
    const buttons=[...el('modal-content').querySelectorAll('[data-outfit]')],outfits=buttons.map(button=>button.dataset.outfit);
    counts[character]=outfits.length;
    for(const outfit of outfits){
      el('modal-content').querySelector('[data-outfit="'+outfit+'"]').click();
      const image=el('modal-content').querySelector('.wardrobe-frame img');await image.decode();
      check(image.getAttribute('src')===media.portraits[character][outfit],'Wrong wardrobe preview');
      check(el('modal-content').querySelector('[data-outfit="'+outfit+'"]').getAttribute('aria-pressed')==='true','Outfit selection missing');
    }
    el('art-back').click();
  }
  el('modal-content').querySelector('[data-art-nav="gallery"]').click();
  const memories=[...el('modal-content').querySelectorAll('[data-memory]:not(:disabled)')];
  check(memories.length===Object.keys(media.cgs).length,'Not all viewed CGs unlocked');
  memories[0].click();await el('modal-content').querySelector('.cg-frame img').decode();
  check(JSON.stringify(current())===before,'Art gallery changed story progress');
  el('close-modal').click();
  window.artQA={show,media,nodes,current};
  await show('workday',workLine);
  return {decoded,wardrobes:counts,cgs:discoveries,phonePhoto:true,remoteHidden:true,closedDoor:true,galleryUnlocked:memories.length,progressPreserved:true,overflow:document.documentElement.scrollWidth>innerWidth};
})()

