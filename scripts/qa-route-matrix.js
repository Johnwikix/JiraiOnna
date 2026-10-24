// Run in an isolated Chromium session with text speed zero.
(async()=>{
  const {nodes,endings,story}=await import('/story.js');
  const {createState,advance,choose}=await import('/engine.js');
  const el=id=>document.getElementById(id),current=()=>JSON.parse(localStorage.getItem('jirai.current.'+story.version));
  const seen=new Set(),queue=[{state:createState(),path:[]}],paths={};
  while(queue.length){const {state:s,path}=queue.shift(),key=JSON.stringify([s.nodeId,s.flags]);if(seen.has(key))continue;seen.add(key);const n=nodes[s.nodeId],last={...s,line:n.lines.length-1};if(n.ending){paths[n.ending]??=path;continue;}if(n.choices)n.choices.forEach((c,index)=>queue.push({state:choose(last,index,nodes),path:[...path,{node:s.nodeId,index}]}));else queue.push({state:advance(last,nodes),path});}
  const results=[];
  function checkReadable(label){
    const text=el('dialogue-text'),cut=el('scene-transition');
    if(el('dialogue').hidden||!text.textContent||!cut.hidden)return;
    const r=text.getBoundingClientRect();
    if(r.top<-1||r.left<-1||r.bottom>innerHeight+1||r.right>innerWidth+1)throw Error(label+' dialogue outside viewport '+JSON.stringify({top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:innerWidth,height:innerHeight}));
  }
  async function play(baseEnding,expectedEnding,label,changes={}){
    const selections=Object.fromEntries(paths[baseEnding].map(entry=>[entry.node,entry.index]));Object.assign(selections,changes);
    el('new-game').click();let guard=0;
    while(el('ending-panel').hidden&&guard++<500){
      if(!el('choices').hidden){const id=current().nodeId,index=selections[id]??0,button=el('choices').children[index];if(!button)throw Error(label+' missing choice '+id+':'+index);button.click();}
      else el('advance-area').click();
      const cut=el('scene-transition');if(cut&&!cut.hidden)cut.click();
      checkReadable(label);
    }
    const state=current(),actual=nodes[state.nodeId].ending;
    if(actual!==expectedEnding||!state.ended||el('ending-panel').hidden)throw Error(label+' reached '+actual);
    const title=endings.find(ending=>ending.id===expectedEnding).title;
    if(el('ending-title').textContent!==title)throw Error(label+' wrong panel '+el('ending-title').textContent);
    results.push({label,ending:actual,clicks:guard});
  }
  for(const rinBoundary of [0,1])for(const rinEvidence of [0,1]){
    if(rinBoundary&&rinEvidence)continue;
    await play('rin-good','rin-bad',`rin-${rinBoundary}${rinEvidence}`,{rin1:rinBoundary?0:1,rin2:rinEvidence?0:1});
  }
  await play('rin-good','rin-bad','rin-direct',{rin4:1});
  await play('nana-good','nana-bad','nana-direct',{nana4:1});
  for(const nanaWitness of [0,1])for(const nanaOwn of [0,1]){
    if(nanaWitness&&nanaOwn)continue;
    await play('nana-good','nana-bad',`nana-${nanaWitness}${nanaOwn}`,{nana1:nanaWitness?0:1,nana3:nanaOwn?0:1});
  }
  await play('shiori-good','shiori-bad','shiori-prepared-bad',{shioriOnTime:1});
  for(const shioriSteady of [0,1])for(const shioriAgency of [0,1]){
    if(shioriSteady&&shioriAgency)continue;
    await play('shiori-good','shiori-bad',`shiori-${shioriSteady}${shioriAgency}`,{shiori1:shioriSteady?0:1,shiori3:shioriAgency?0:1});
  }
  await play('shiori-good','shiori-bad','shiori-direct',{shiori1:1,shiori3:1,shiori4:1});
  for(const qingTruth of [0,1])for(const qingPlan of [0,1]){
    if(qingTruth&&qingPlan)continue;
    await play('qing-good','qing-bad',`qing-${qingTruth}${qingPlan}`,{qing1:qingTruth?0:1,qing3:qingPlan?0:1});
  }
  await play('qing-good','qing-bad','qing-direct',{qing4:1});
  return {routes:results,count:results.length,overflow:document.documentElement.scrollWidth>innerWidth};
})()
