// Run only in the isolated QA browser with agent-browser eval --stdin.
(async()=>{
  const {story}=await import('/story.js'),el=id=>document.getElementById(id),legacy=['jirai.current.v1','jirai.slots.v1','jirai.collection.v1'];
  const previous=legacy.map(k=>localStorage.getItem(k));
  try{
    if(el('modal').open)el('close-modal').click();
    if(document.body.dataset.mode!=='reading')el('continue').click();
    el('stage').focus();document.dispatchEvent(new KeyboardEvent('keydown',{key:'h',bubbles:true}));
    if(!el('reader').classList.contains('ui-hidden')||el('show-interface').hidden)throw Error('H did not hide UI');
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    if(el('reader').classList.contains('ui-hidden'))throw Error('Escape did not restore UI');
    el('pause-button').click();
    if(!el('modal').open||!document.querySelector('[data-pause="saves"]'))throw Error('Pause menu missing');
    const old={storyVersion:'1.0.0',nodeId:'private-qa-legacy'};
    localStorage.setItem(legacy[0],JSON.stringify(old));localStorage.setItem(legacy[1],'{}');localStorage.setItem(legacy[2],'{}');
    const current=localStorage.getItem(`jirai.current.${story.version}`);
    document.querySelector('[data-pause="saves"]').click();
    if(!el('export-legacy'))throw Error('Legacy backup not offered');
    const create=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;let exported;
    try{URL.createObjectURL=blob=>{exported=blob;return create(blob);};HTMLAnchorElement.prototype.click=function(){if(!this.download)click.call(this);};el('export-legacy').click();}
    finally{URL.createObjectURL=create;HTMLAnchorElement.prototype.click=click;}
    const backup=JSON.parse(await exported.text());
    if(backup.storyVersion!=='1.0.0'||backup.current.nodeId!==old.nodeId)throw Error('Legacy export changed data');
    if(localStorage.getItem(`jirai.current.${story.version}`)!==current||JSON.parse(localStorage.getItem(legacy[0])).nodeId!==old.nodeId)throw Error('Version storage overwritten');
    document.querySelector('[data-save="1"]').click();
    if(el('confirm-action'))el('confirm-action').click();
    const saved=JSON.parse(localStorage.getItem(`jirai.slots.${story.version}`))['1'];
    if(saved.state.nodeId!==JSON.parse(current).nodeId)throw Error('Manual save differs');
    document.querySelector('[data-load="1"]').click();
    if(el('modal').open)throw Error('Manual load failed');
    await document.fonts.ready;
    return {hideRestore:true,pauseMenu:true,legacyExport:true,versionsIsolated:true,manualSaveLoad:true,fontLoaded:document.fonts.check('500 32px "Story Serif"'),overflow:document.documentElement.scrollWidth>innerWidth};
  }finally{legacy.forEach((k,i)=>previous[i]===null?localStorage.removeItem(k):localStorage.setItem(k,previous[i]));}
})()
