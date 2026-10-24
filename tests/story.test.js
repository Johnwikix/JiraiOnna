import test from 'node:test';
import assert from 'node:assert/strict';
import { nodes, endings } from '../public/story.js';
import { createState, advance, choose, validateState, resolveLine, getReadKey, getBacklog } from '../public/engine.js';
import { inspectStory } from '../scripts/check-story.js';
import { readFile, readdir } from 'node:fs/promises';
import { characters, story } from '../public/story.js';
import { STORY_VERSION } from '../public/engine.js';

const report=inspectStory();
function play(path){let state=createState();for(const entry of path){while(state.nodeId!==entry.node)state=advance({...state,line:nodes[state.nodeId].lines.length-1},nodes);state=choose({...state,line:nodes[state.nodeId].lines.length-1},entry.index,nodes);}while(!nodes[state.nodeId].ending)state=advance({...state,line:nodes[state.nodeId].lines.length-1},nodes);return state;}
test('所有分支有正文、去向与可恢复的实际路径，十二个结局全部可达',()=>{assert.deepEqual(report.errors,[]);assert.equal(report.endings,12);});
for(const ending of endings)test(`可抵达并保存结局：${ending.title}`,()=>{const state=play(report.paths[ending.id]);assert.equal(nodes[state.nodeId].ending,ending.id);assert.ok(validateState(JSON.parse(JSON.stringify(state)),nodes));const ended=advance({...state,line:nodes[state.nodeId].lines.length-1},nodes);assert.ok(ended.ended);assert.equal(advance(ended,nodes),ended);});
test('凛线放弃保留原始记录或被迫安抚，都会破坏最终脱身路线',()=>{const good=report.paths['rin-good'];for(const node of ['rin1','rin2']){const changed=good.map(c=>c.node===node?{...c,index:1}:c);assert.equal(nodes[play(changed).nodeId].ending,'rin-bad');}});
test('结局包括三个好结局、三个中性结局和六个实际失败结局',()=>{assert.equal(endings.filter(e=>e.outcome==='good').length,3);assert.equal(endings.filter(e=>e.outcome==='neutral').length,3);assert.equal(endings.filter(e=>e.outcome==='bad').length,6);assert.equal(nodes.endNightDeath.outcome,'bad');assert.equal(nodes.endCaptive.outcome,'bad');});
test('在陌生人堵门时选择开门和追逐中抄近路，会进入不同坏结局',()=>{assert.equal(nodes[play(report.paths.captivity).nodeId].ending,'captivity');assert.equal(nodes[play(report.paths['night-death']).nodeId].ending,'night-death');assert.notDeepEqual(report.paths.captivity,report.paths['night-death']);});
test('未读到选择点时不能提前作选择',()=>assert.throws(()=>choose(createState(),0,nodes)));
test('导入拒绝伪造节点、选项、历史、变量和不匹配的版本',()=>{const original=play(report.paths['shiori-good']);for(const mutate of [s=>s.nodeId='missing',s=>s.flags.shioriAgency=0,s=>s.trail[0].choice=99,s=>s.visited=['endShioriGood'],s=>s.storyVersion='2',s=>s.line=-1]){const changed=structuredClone(original);mutate(changed);assert.equal(validateState(changed,nodes),false);}});
test('重写后的剧本与存档版本同步，旧版已读不能混入',()=>{assert.equal(story.version,'1.1.0');assert.equal(STORY_VERSION,story.version);const old=createState();old.storyVersion='1.0.0';assert.equal(validateState(old,nodes),false);});
test('含糊拒绝与明确告知已有女友，在晚晴线回看里保留各自实际回答',()=>{
  const path=report.paths['qing-good'];
  for(const honest of [0,1]){
    const state=play(path.map(c=>c.node==='makeover'?{...c,index:honest?0:1}:c));
    const line=getBacklog(state,nodes).find(e=>e.nodeId==='qing2').lines[3];
    assert.equal(line.text.includes('最近忙'),!honest);
    assert.equal(line.text,resolveLine(nodes.qing2.lines[3],state.flags).text);
  }
});
test('已完整坦白但未确定日期的失败路线，原因是错过见面而非凭空隐瞒',()=>{
  const state=play(report.paths['qing-good'].map(c=>c.node==='qing3'?{...c,index:1}:c));
  assert.equal(nodes[state.nodeId].ending,'qing-bad');assert.equal(state.flags.qingTruth,1);
  const entry=getBacklog(state,nodes).find(e=>e.nodeId==='qingReckon');
  assert.ok(entry.lines[0].text.includes('日历'));assert.ok(entry.lines[0].text.includes('可能'));
  assert.ok(!entry.lines[0].text.includes('少掉的'));
});
test('借出手机但保留了录音时，凛线呈现伪造发送而非玩家发过的话',()=>{
  const state=play(report.paths['rin-good'].map(c=>c.node==='rin1'?{...c,index:1}:c));
  assert.equal(state.flags.rinEvidence,1);
  const entry=getBacklog(state,nodes).find(e=>e.nodeId==='rinReckon');
  assert.ok(entry.lines[2].text.includes('没发过'));
});
test('文字修订与不同条件对白分别记录已读，避免跳过扩写段落',()=>{
  const node=nodes.qing2,key=getReadKey('qing2',3,node,{honest:1});
  assert.notEqual(key,'qing2:3');assert.notEqual(key,getReadKey('qing2',3,node,{honest:0}));
  const edited=structuredClone(node);edited.lines[3].text+='新的一句。';
  assert.notEqual(key,getReadKey('qing2',3,edited,{honest:1}));
  assert.equal(key,getReadKey('qing2',3,node,{honest:1,helped:0}));
});
test('游戏、导出剧本和交付文档不泄露原聊天发送人标识',async()=>{
  const root=new URL('../',import.meta.url),source=JSON.parse(await readFile(new URL('Assets/qq-20261023-181522-0d4165.json',root),'utf8')),senders=new Set();
  function walk(v){if(!v||typeof v!=='object')return;if(v.senderName)senders.add(v.senderName.replaceAll('*','').trim());for(const x of Object.values(v))if(x&&typeof x==='object')Array.isArray(x)?x.forEach(walk):walk(x);}walk(source);
  for(const name of senders)assert.ok(!Object.hasOwn(characters,name));
  const files=['README.md','PRODUCT.md'];
  async function collect(dir){for(const entry of await readdir(new URL(dir,root),{withFileTypes:true})){const p=`${dir}${entry.name}`;if(entry.isDirectory())await collect(`${p}/`);else if(/\.(?:md|js|json|html|css|txt)$/.test(p))files.push(p);}}
  for(const dir of ['public/','docs/','scripts/','art/'])await collect(dir);
  for(const file of files){const text=await readFile(new URL(file,root),'utf8');for(const name of senders)if(name.length>=3)assert.ok(!text.includes(name),`${file} 含有原素材发送人标识`);}
});
