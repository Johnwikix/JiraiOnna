// Execute in an isolated agent-browser session after setting text speed to zero.
(async()=>{
  const {nodes,story}=await import('/story.js');
  const {createState,advance,choose}=await import('/engine.js');
  const {transitionLines}=await import('/transitions.js');
  const el=id=>document.getElementById(id),key=`jirai.current.${story.version}`;
  const current=()=>JSON.parse(localStorage.getItem(key));
  function pathTo(id,flags){
    const queue=[{s:createState(),path:[]}],seen=new Set();
    while(queue.length){
      const {s,path}=queue.shift(),signature=JSON.stringify([s.nodeId,s.flags]);
      if(seen.has(signature))continue;seen.add(signature);
      if(s.nodeId===id&&Object.entries(flags).every(([k,v])=>s.flags[k]===v))return path;
      const n=nodes[s.nodeId],last={...s,line:n.lines.length-1};
      if(n.ending)continue;
      if(n.choices)n.choices.forEach((_,i)=>queue.push({s:choose(last,i,nodes),path:[...path,i]}));
      else queue.push({s:advance(last,nodes),path});
    }
    throw Error(`No route to ${id}`);
  }
  function show(id,flags,line){
    if(el('modal').open)el('close-modal').click();
    const path=pathTo(id,flags);el('new-game').click();let at=0,guard=0;
    while(current().nodeId!==id&&guard++<900){
      if(!el('choices').hidden)el('choices').children[path[at++]].click();
      else el('advance-area').click();
      const cut=el('scene-transition');if(cut&&!cut.hidden)cut.click();
    }
    if(current().nodeId!==id)throw Error('Reading did not reach target');
    for(let i=0;i<line;i++){el('advance-area').click();const cut=el('scene-transition');if(cut&&!cut.hidden)cut.click();}
    return el('dialogue-text').textContent;
  }
  const hesitant=show('qing2',{honest:0,qingTruth:1},3);
  if(!hesitant.includes('最近忙'))throw Error('Original answer was overwritten');
  el('backlog-button').click();
  if(!el('modal-content').textContent.includes(hesitant))throw Error('Backlog differs from displayed text');
  if(![...document.querySelectorAll('#modal-content .log-transition p')].some(p=>p.textContent===transitionLines['qing2:0']))throw Error('Cross-scene transition missing from backlog');
  el('close-modal').click();
  const dates=show('qingReckon',{qingTruth:1,qingPlan:0},0);
  if(!dates.includes('日历')||dates.includes('少掉的'))throw Error('Honest route falsely describes omission');
  const forged=show('rinReckon',{rinBoundary:0,rinEvidence:1},2);
  if(!forged.includes('没发过'))throw Error('Borrowed-phone consequence lost');
  const messageLine=show('messages',{},3);el('backlog-button').click();
  const bridges=[...document.querySelectorAll('#modal-content .log-transition')],matching=bridges.filter(item=>item.querySelector('p').textContent===transitionLines['messages:3']);
  if(matching.length!==1)throw Error('Intra-scene transition missing or duplicated in backlog');
  const following=matching[0].nextElementSibling;
  if(!following||following.querySelector('p')?.textContent!==messageLine)throw Error('Transition is not immediately before its target dialogue');
  if(bridges.some(item=>!item.querySelector('p').textContent.trim()))throw Error('Blank transition created a backlog entry');
  if(getComputedStyle(matching[0].querySelector('p')).whiteSpace!=='pre-line')throw Error('Transition line breaks are not preserved');
  el('close-modal').click();
  const collection=JSON.parse(localStorage.getItem(`jirai.collection.${story.version}`));
  if(!collection.read.some(k=>/^qing2:3:[0-9a-f]+$/.test(k)))throw Error('Read markers do not identify the actual text');
  return {branchDialogue:true,backlogMatches:true,transitionBacklogOrdered:true,transitionBreaksPreserved:true,priorChoicesRespected:true,readMarkersIncludeText:true,checkedScenes:['qing2','qingReckon','rinReckon','messages']};
})()
