// Run in an isolated agent-browser session with speed zero and a fresh collection.
(async()=>{
  const {nodes,story}=await import('/story.js');
  const {createState,advance,choose,getReadKey}=await import('/engine.js');
  const {TransitionPlayer}=await import('/transitions.js');
  const el=id=>document.getElementById(id),cut=el('scene-transition');
  const current=()=>JSON.parse(localStorage.getItem('jirai.current.'+story.version));
  const check=(value,label)=>{if(!value)throw Error(label);};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(condition,limit=4500){const start=performance.now();while(!condition()){if(performance.now()-start>limit)throw Error('Transition timed out');await wait(10);}}
  function pathTo(id){
    const queue=[{s:createState(),path:[]}],seen=new Set();
    while(queue.length){const {s,path}=queue.shift(),key=JSON.stringify([s.nodeId,s.flags]);if(seen.has(key))continue;seen.add(key);if(s.nodeId===id)return path;const n=nodes[s.nodeId],last={...s,line:n.lines.length-1};if(n.ending)continue;if(n.choices)n.choices.forEach((_,i)=>queue.push({s:choose(last,i,nodes),path:[...path,i]}));else queue.push({s:advance(last,nodes),path});}
    throw Error('Unreachable '+id);
  }
  async function show(id,line=0){
    if(el('modal').open)el('close-modal').click();
    el('new-game').click();const path=pathTo(id);let step=0,guard=0;
    while(current().nodeId!==id&&guard++<1000){if(!el('choices').hidden)el('choices').children[path[step++]].click();else el('advance-area').click();if(!cut.hidden)cut.click();}
    check(current().nodeId===id,'Cannot reach '+id);
    for(let i=0;i<line;i++){el('advance-area').click();if(!cut.hidden)cut.click();}
  }
  await show('makeover',15);el('choices').children[0].click();
  await until(()=>cut.dataset.phase==='hold');
  const s=current(),readKey=getReadKey(s.nodeId,s.line,nodes[s.nodeId],s.flags);
  check(cut.textContent.includes('隔了一夜')&&getComputedStyle(cut).opacity==='1','Time bridge missing');
  check(el('dialogue-text').textContent==='','Body exposed during black hold');
  check(!JSON.parse(localStorage.getItem('jirai.collection.'+story.version)).read.includes(readKey),'Body marked read behind black');
  await until(()=>cut.hidden);
  check(el('dialogue-text').textContent.includes('隔天'),'Natural fade did not reveal dialogue');
  check(JSON.parse(localStorage.getItem('jirai.collection.'+story.version)).read.includes(readKey),'Body not marked after reveal');

  await show('endNanaGood',6);el('quick-save').click();el('advance-area').click();
  await until(()=>cut.dataset.phase==='hold');check(cut.textContent.includes('四个月'),'Intra-scene time cut missing');
  el('quick-load').click();check(cut.hidden&&current().line===6,'Load did not cancel transition');
  await wait(3500);check(current().nodeId==='endNanaGood'&&current().line===6&&cut.hidden,'Old transition mutated loaded state');

  el('auto-button').click();el('advance-area').click();await until(()=>cut.dataset.phase==='hold');
  check(current().line===7&&el('auto-button').getAttribute('aria-pressed')==='true','Auto mode lost at cut');
  await wait(500);check(current().line===7,'Auto advanced while bridge visible');
  await until(()=>cut.hidden);check(current().line===7,'Auto skipped the new paragraph');el('auto-button').click();

  await show('messages',2);el('advance-area').click();await until(()=>cut.dataset.phase==='hold');
  cut.click();check(cut.hidden&&current().line===3&&el('dialogue-text').textContent.includes('回东京'),'Click should reveal, not advance');
  await show('messages',2);el('advance-area').click();el('new-game').click();
  await wait(400);check(cut.hidden&&current().nodeId===story.start&&current().line===0,'New game retained old transition');

  // The actual controller, tested with reduced motion and interrupted fades.
  const element=document.createElement('button');element.innerHTML='<span></span>';document.body.append(element);
  let commits=0,finishes=0;
  const reduced=new TransitionPlayer(element,true);reduced.play('稍后。',()=>commits++,()=>finishes++);
  await wait(0);check(element.dataset.phase==='hold'&&element.getAnimations().length===0,'Reduced motion animates');
  reduced.finish();reduced.finish();check(commits===1&&finishes===1&&element.hidden,'Finish callback duplicated');
  const player=new TransitionPlayer(element);player.play('取消。',()=>commits++,()=>finishes++);player.cancel();await wait(240);
  check(commits===1&&finishes===1&&element.hidden,'Cancelled fade committed');
  const started=performance.now();await player.play('快进。',()=>commits++,()=>finishes++,true);
  check(performance.now()-started<650&&element.hidden&&commits===2&&finishes===2,'Fast-forward cut did not finish');
  element.remove();
  window.transitionQA={show,current};
  return {naturalFade:true,firstPersonBridge:true,readOnlyAfterReveal:true,loadCancelsStaleCut:true,autoWaitsForBridge:true,clickSkipsOnlyCut:true,newGameCancelsCut:true,reducedMotion:true,cancelledFadeNeverCommits:true,fastForward:true};
})()
