import { nodes, endings, characters, story } from '../public/story.js';
import { createState, advance, choose, validateState, resolveLine } from '../public/engine.js';
import { pathToFileURL } from 'node:url';

export function inspectStory() {
  const errors=[],found=new Set(),visited=new Set(),paths={},queue=[{state:createState(),choices:[]}],seen=new Set(),usedVariants=new Set();
  for(const [id,n]of Object.entries(nodes)) {
    if(!n.lines.length)errors.push(`${id} 缺少正文`);
    for(const l of n.lines)if(!characters[l.speaker]||!l.text)errors.push(`${id} 无效对白`);
    for(const [i,l]of n.lines.entries())for(const v of l.variants||[])if(!v.when||!Object.keys(v.when).length||Object.values(v.when).some(x=>![0,1].includes(x))||!v.text||v.speaker&&!characters[v.speaker])errors.push(`${id}:${i} 无效条件对白`);
    for(const [person,outfit]of Object.entries(n.outfits||{}))if(!story.wardrobes?.[person]?.[outfit])errors.push(`${id} 未登记衣装 ${person}/${outfit}`);
    for(const person of n.remoteSpeakers||[])if(!characters[person])errors.push(`${id} 未登记远程说话者`);
    if(!n.ending&&!n.choices&&!n.next)errors.push(`${id} 没有后续`);
    if(n.ending&&!endings.some(e=>e.id===n.ending))errors.push(`${id} 未注册结局`);
    const refs=[n.next,...(n.choices||[]).map(c=>c.next)].filter(Boolean).flatMap(t=>typeof t==='string'?[t]:t.map(r=>r.to));
    for(const ref of refs)if(!nodes[ref])errors.push(`${id} 指向不存在的 ${ref}`);
  }
  while(queue.length) {
    const {state:s,choices}=queue.shift(),signature=JSON.stringify([s.nodeId,s.flags]);if(seen.has(signature))continue;seen.add(signature);
    const n=nodes[s.nodeId];visited.add(s.nodeId);const atEnd={...s,line:n.lines.length-1};
    for(const [i,l]of n.lines.entries()){
      const displayed=resolveLine(l,s.flags);if(!displayed.text||!characters[displayed.speaker])errors.push(`${s.nodeId}:${i} 无法显示条件对白`);
      const v=l.variants?.findIndex(v=>Object.entries(v.when).every(([k,value])=>s.flags[k]===value));
      if(v>=0)usedVariants.add(`${s.nodeId}:${i}:${v}`);
    }
    if(!validateState(atEnd,nodes))errors.push(`路径无法恢复 ${s.nodeId}`);
    if(n.ending){found.add(n.ending);paths[n.ending]??=choices;continue;}
    if(n.choices)n.choices.forEach((c,i)=>queue.push({state:choose(atEnd,i,nodes),choices:[...choices,{node:s.nodeId,index:i,text:c.text}]}));
    else queue.push({state:advance(atEnd,nodes),choices});
  }
  for(const e of endings)if(!found.has(e.id))errors.push(`无法抵达结局 ${e.id}`);
  for(const id of Object.keys(nodes))if(!visited.has(id))errors.push(`孤立节点 ${id}`);
  for(const [id,n]of Object.entries(nodes))for(const [i,l]of n.lines.entries())for(const [j]of (l.variants||[]).entries())if(!usedVariants.has(`${id}:${i}:${j}`))errors.push(`${id}:${i}:${j} 条件对白不可达`);
  const allLines=Object.values(nodes).flatMap(n=>n.lines),charCount=allLines.reduce((sum,l)=>sum+l.text.length+(l.variants||[]).reduce((s,v)=>s+v.text.length,0),0);
  return {errors,nodes:Object.keys(nodes).length,lines:allLines.length,variants:allLines.reduce((sum,l)=>sum+(l.variants?.length||0),0),characters:charCount,choices:Object.values(nodes).filter(n=>n.choices).length,endings:found.size,outcomes:Object.fromEntries(['good','neutral','bad'].map(k=>[k,endings.filter(e=>e.outcome===k).length])),states:seen.size,paths};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){const report=inspectStory();console.log(JSON.stringify({...report,paths:undefined},null,2));if(report.errors.length)process.exitCode=1;}
