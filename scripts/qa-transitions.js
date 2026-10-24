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
  check(getComputedStyle(cut,'::after').content.includes('点击继续'),'Manual continue hint missing');
  await wait(3400);
  check(!cut.hidden&&cut.dataset.phase==='hold'&&el('dialogue-text').textContent==='','Described cut ended by itself');
  cut.click();
  check(cut.hidden&&el('dialogue-text').textContent.includes('隔天'),'Confirmation did not reveal dialogue');
  check(JSON.parse(localStorage.getItem('jirai.collection.'+story.version)).read.includes(readKey),'Body not marked after reveal');

  await show('endNanaGood',6);el('quick-save').click();el('advance-area').click();
  await until(()=>cut.dataset.phase==='hold');check(cut.textContent.includes('四个月'),'Intra-scene time cut missing');
  el('quick-load').click();check(cut.hidden&&current().line===6,'Load did not cancel transition');
  await wait(3500);check(current().nodeId==='endNanaGood'&&current().line===6&&cut.hidden,'Old transition mutated loaded state');

  el('auto-button').click();el('advance-area').click();await until(()=>cut.dataset.phase==='hold');
  check(current().line===7&&el('auto-button').getAttribute('aria-pressed')==='true','Auto mode lost at cut');
  await wait(500);check(current().line===7&&!cut.hidden,'Auto advanced or closed the bridge');
  cut.click();check(cut.hidden&&current().line===7,'Auto confirmation skipped the new paragraph');el('auto-button').click();

  await show('endNanaGood',7);await show('endNanaGood',6);el('skip-button').click();
  await until(()=>cut.dataset.phase==='hold');
  check(current().line===7&&el('skip-button').getAttribute('aria-pressed')==='true','Skip mode did not reach the read bridge');
  await wait(500);check(!cut.hidden&&cut.dataset.phase==='hold','Fast mode closed the described bridge');
  cut.click();check(cut.hidden&&current().line===7&&el('dialogue-text').textContent.length>0,'Skip confirmation did not reveal exactly one paragraph');

  await show('prologue',6);el('advance-area').click();
  await until(()=>cut.dataset.phase==='hold'&&cut.dataset.hasText==='false');
  await until(()=>cut.hidden);check(current().nodeId==='prologue'&&current().line===7,'Undescribed cut did not finish automatically');

  await show('messages',2);el('advance-area').click();await until(()=>cut.dataset.phase==='hold');
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
  check(!cut.hidden&&cut.dataset.phase==='hold','Backgrounding ended the described cut');
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;
  cut.click();check(cut.hidden&&current().line===3,'Cut did not resume after visibility change');

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
  const fastPlaying=player.play('快进。',()=>commits++,()=>finishes++,true);
  await until(()=>element.dataset.phase==='hold');await wait(300);
  check(!element.hidden&&commits===2&&finishes===1,'Fast-forward described cut finished by itself');
  player.finish();await fastPlaying;
  check(element.hidden&&commits===2&&finishes===2,'Fast-forward confirmation failed');
  await player.play('',()=>commits++,()=>finishes++,true);
  check(element.hidden&&commits===3&&finishes===3,'Undescribed fast cut did not finish');
  element.remove();
  window.transitionQA={show,current};
  return {describedCutWaits:true,continueHint:true,readOnlyAfterReveal:true,loadCancelsStaleCut:true,autoWaitsForConfirmation:true,skipWaitsForConfirmation:true,undescribedCutAutomatic:true,backgroundKeepsDescribedCut:true,clickRevealsOnlyCut:true,newGameCancelsCut:true,reducedMotion:true,cancelledFadeNeverCommits:true,controllerFastAndBlankCuts:true};
})()
