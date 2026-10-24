// Run in the isolated QA browser with `agent-browser eval --stdin`.
// This script only touches the game's current-origin test storage and UI.
(async()=>{
  const {nodes,endings,story}=await import('/story.js');
  const {createState,advance,choose}=await import('/engine.js');
  const seen=new Set(),queue=[{state:createState(),path:[]}],paths={};
  while(queue.length){const {state:s,path}=queue.shift(),key=JSON.stringify([s.nodeId,s.flags]);if(seen.has(key))continue;seen.add(key);const n=nodes[s.nodeId],last={...s,line:n.lines.length-1};if(n.ending){paths[n.ending]??=path;continue;}if(n.choices)n.choices.forEach((c,index)=>queue.push({state:choose(last,index,nodes),path:[...path,index]}));else queue.push({state:advance(last,nodes),path});}
  const results=[];
  for(const ending of endings){
    document.getElementById('new-game').click();let pathIndex=0,guard=0;
    while(document.getElementById('ending-panel').hidden&&guard++<600){
      const options=document.getElementById('choices');
      if(!options.hidden){const button=options.children[paths[ending.id][pathIndex++]];if(!button)throw Error(`Missing choice: ${ending.id}`);button.click();}
      else document.getElementById('advance-area').click();
      const cut=document.getElementById('scene-transition');if(cut&&!cut.hidden)cut.click();
    }
    const title=document.getElementById('ending-title').textContent;
    if(title!==ending.title||document.getElementById('ending-panel').hidden)throw Error(`Wrong ending: ${ending.id} / ${title}`);
    results.push({id:ending.id,title,clicks:guard});
  }
  const unlocked=JSON.parse(localStorage.getItem(`jirai.collection.${story.version}`)).endings;
  document.getElementById('routes-menu').click();
  const enabled=[...document.querySelectorAll('[data-jump]')].filter(b=>!b.disabled);
  const morning=enabled.find(b=>b.textContent===nodes.morning.title);if(!morning)throw Error('Missing replay checkpoint');morning.click();
  if(document.getElementById('scene-title').textContent!==nodes.morning.title)throw Error('Replay failed');
  document.getElementById('quick-save').click();const before=JSON.parse(localStorage.getItem(`jirai.current.${story.version}`));
  document.getElementById('advance-area').click();document.getElementById('quick-load').click();
  const restored=JSON.parse(localStorage.getItem(`jirai.current.${story.version}`));if(before.nodeId!==restored.nodeId||before.line!==restored.line)throw Error('Quick load failed');
  document.getElementById('backlog-button').click();const log=document.querySelectorAll('.log-entry').length;document.getElementById('close-modal').click();
  document.getElementById('skip-button').click();await new Promise(r=>setTimeout(r,160));document.getElementById('skip-button').click();
  return {endings:results,collected:unlocked.length,replay:true,quickSave:true,backlogLines:log,overflow:document.documentElement.scrollWidth>innerWidth};
})()
