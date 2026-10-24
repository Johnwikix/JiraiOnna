import test from 'node:test';
import assert from 'node:assert/strict';
import { nodes, endings } from '../public/story.js';
import { createState, advance, choose, validateState, resolveLine, getReadKey, getBacklog } from '../public/engine.js';
import { inspectStory } from '../scripts/check-story.js';
import { readFile, readdir } from 'node:fs/promises';
import { characters, story } from '../public/story.js';
import { STORY_VERSION } from '../public/engine.js';
import { transitionLines } from '../public/transitions.js';

const report=inspectStory();
function play(path){let state=createState();for(const entry of path){while(state.nodeId!==entry.node)state=advance({...state,line:nodes[state.nodeId].lines.length-1},nodes);state=choose({...state,line:nodes[state.nodeId].lines.length-1},entry.index,nodes);}while(!nodes[state.nodeId].ending)state=advance({...state,line:nodes[state.nodeId].lines.length-1},nodes);return state;}
function reach(nodeId,line=0){let state=createState(),guard=0;while(state.nodeId!==nodeId&&guard++<100){const last={...state,line:nodes[state.nodeId].lines.length-1};state=nodes[state.nodeId].choices?choose(last,0,nodes):advance(last,nodes);}assert.equal(state.nodeId,nodeId);for(let i=0;i<line;i++)state=advance(state,nodes);return state;}
test('所有分支有正文、去向与可恢复的实际路径，十二个结局全部可达',()=>{assert.deepEqual(report.errors,[]);assert.equal(report.endings,12);});
for(const ending of endings)test(`可抵达并保存结局：${ending.title}`,()=>{const state=play(report.paths[ending.id]);assert.equal(nodes[state.nodeId].ending,ending.id);assert.ok(validateState(JSON.parse(JSON.stringify(state)),nodes));const ended=advance({...state,line:nodes[state.nodeId].lines.length-1},nodes);assert.ok(ended.ended);assert.equal(advance(ended,nodes),ended);});
test('凛线放弃保留原始记录或被迫安抚，都会破坏最终脱身路线',()=>{const good=report.paths['rin-good'];for(const node of ['rin1','rin2']){const changed=good.map(c=>c.node===node?{...c,index:1}:c);assert.equal(nodes[play(changed).nodeId].ending,'rin-bad');}});
test('结局包括三个好结局、三个中性结局和六个实际失败结局',()=>{assert.equal(endings.filter(e=>e.outcome==='good').length,3);assert.equal(endings.filter(e=>e.outcome==='neutral').length,3);assert.equal(endings.filter(e=>e.outcome==='bad').length,6);assert.equal(nodes.endNightDeath.outcome,'bad');assert.equal(nodes.endCaptive.outcome,'bad');});
test('在陌生人堵门时选择开门和追逐中抄近路，会进入不同坏结局',()=>{assert.equal(nodes[play(report.paths.captivity).nodeId].ending,'captivity');assert.equal(nodes[play(report.paths['night-death']).nodeId].ending,'night-death');assert.notDeepEqual(report.paths.captivity,report.paths['night-death']);});
test('囚困结局实际尝试求救并回收钥匙、两部手机、第三个闹钟与五分钟',()=>{
  assert.equal(nodes[play(report.paths.captivity).nodeId].ending,'captivity');
  const inside=nodes.nightInside.lines,lines=nodes.endCaptive.lines,text=lines.map(line=>line.text).join('\n');
  assert.equal(nodes.endCaptive.time,'04:16');assert.equal(lines.length,26);
  assert.ok(inside[0].text.includes('钥匙'));assert.ok(inside[3].text.includes('脱了鞋'));
  assert.ok(inside[10].text.includes('自己的手机'));assert.ok(inside[11].text.includes('两部手机'));
  assert.ok(lines[6].text.includes('第三个闹钟'));
  for(const expected of ['帮我报警','三张都是你让我进来以后拍的','报到时间已经过去','重新设了五分钟','12:17'])assert.ok(text.includes(expected),expected);
  assert.ok(lines.at(-1).text.includes('钥匙在她掌心'));assert.ok(lines.at(-1).text.includes('门，没有开'));
});
test('未接来电有当夜约定、司机报警和完整的第一人称收束',()=>{
  assert.equal(nodes[play(report.paths['night-death']).nodeId].ending,'night-death');
  const lines=nodes.endNightDeath.lines,text=lines.map(line=>line.text).join('\n');
  assert.ok(nodes.knock.lines[1].text.includes('别又静音'));assert.ok(nodes.chase.lines[0].text.includes('外套口袋'));
  assert.equal(lines.length,18);assert.equal(lines.filter(line=>line.speaker==='司机').length,2);
  for(const expected of ['急救中心','救护车已经在路上','04:17','这次不是不方便','我不跟了'])assert.ok(text.includes(expected),expected);
  assert.ok(lines.at(-1).text.includes('只剩雨声'));assert.ok(!text.includes('后来，他才知道'));
});
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
test('带字转场附在目标对白之前，无字位置不产生回看条目',()=>{
  const state=reach('messages',3),entries=getBacklog(state,nodes,transitionLines);
  const current=entries.find(e=>e.nodeId==='messages'),previous=entries.find(e=>e.nodeId==='jealousy');
  assert.equal(previous.lines[0].transitionText,transitionLines['jealousy:0']);
  assert.equal(current.lines[0].transitionText,transitionLines['messages:0']);
  assert.equal(current.lines[3].transitionText,transitionLines['messages:3']);
  assert.equal(current.lines[3].text,resolveLine(nodes.messages.lines[3],state.flags).text);
  assert.equal(current.lines[2].transitionText,'');
  assert.equal(getBacklog(state,nodes).find(e=>e.nodeId==='messages').lines[3].transitionText,'');
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
test('共通篇提前建立可裁剪原文、报警联系人与一致的生活动作',()=>{
  assert.ok(nodes.dinner.lines[0].text.includes('我陪你和七濑去家庭餐厅'));
  assert.ok(resolveLine(nodes.dinner.lines[6],{helped:0}).text.includes('两枚硬币'));
  assert.ok(!resolveLine(nodes.dinner.lines[6],{helped:1}).text.includes('两枚硬币'));
  assert.ok(nodes.envelope.lines.at(-1).text.includes('事件编号和后续联系人'));
  assert.ok(nodes.morning.lines.some(line=>line.text.includes('陌生账号')));
  assert.ok(!nodes.envelope.choices[0].text.includes('不再回这家店'));
});
test('凛线的照片、招生信和结局后果都有明确对象与实际行动',()=>{
  assert.ok(nodes.rin1.lines[0].text.includes('书面材料复审'));
  assert.ok(nodes.rin2.choices[1].text.includes('牛丼店照片'));
  assert.ok(nodes.rin2.choices[0].text.includes('完整对话'));
  assert.ok(nodes.rin3.lines.at(-1).text.includes('押金单'));
  assert.ok(nodes.rin3.lines.some(line=>line.text.includes('作品集主页')));
  const letter=nodes.rin4.lines.map(line=>line.text).join('\n');
  assert.ok(letter.includes('几张截屏，一份说明'));assert.ok(letter.includes('学校未必会信'));
  assert.ok(nodes.rinReckon.lines[5].variants.find(v=>v.when.rinEvidence===1).text.includes('选中发送'));
  assert.ok(nodes.rinReckon.lines.at(-1).text.includes('没等警方回电'));
  const directBad=resolveLine(nodes.endRinBad.lines[4],{rinBoundary:1,rinEvidence:1});
  assert.ok(directBad.text.includes('保存的录音去哪了')&&!directBad.text.includes('替凛发'));
  assert.ok(nodes.endRinGood.lines[1].text.includes('原始录音和完整聊天'));
  assert.ok(nodes.endRinGood.lines[3].text.includes('仓库工时仍不够'));
  const bad=nodes.endRinBad.lines.map(line=>line.text).join('\n');
  assert.ok(bad.includes('警察后来打来'));assert.ok(bad.includes('又一次失约'));assert.ok(bad.includes('排班邮件和工作间号码'));
});
test('七濑线限定证词范围并按实际入口生成失败与就业后果',()=>{
  assert.ok(nodes.nana1.lines[6].text.includes('后面每一下我没敢看'));
  assert.ok(nodes.nana1.lines.at(-1).text.includes('书面材料复审'));
  assert.ok(nodes.nana3.lines[2].text.includes('完整聊天导出和未删改的打印件'));
  assert.ok(nodes.nana3.lines[0].text.includes('结束这段关系'));
  const direct=resolveLine(nodes.endNanaBad.lines[4],{nanaWitness:1,nanaOwn:1});
  const reckoned=resolveLine(nodes.endNanaBad.lines[4],{nanaWitness:0,nanaOwn:1});
  assert.ok(direct.text.includes('刚才为什么又替她说'));
  assert.ok(reckoned.text.includes('第一版少了地址')&&!reckoned.text.includes('不用再问'));
  const aftermath=nodes.endNanaBad.lines.map(line=>line.text).join('\n');
  for(const expected of ['凛发出的录音','移出工作群','条件录用','仓库工时不够','决定先回国'])assert.ok(aftermath.includes(expected),expected);
  assert.ok(nodes.endNanaGood.lines[2].text.includes('最后一次班'));
  assert.ok(nodes.endNanaGood.lines[7].text.includes('书面复审没有通过'));
});
test('栞线修复沉默、照片控制权与医院转院的决定者',()=>{
  assert.ok(resolveLine(nodes.shiori1.lines[8],{replied:0}).text.includes('不是我的意思'));
  assert.ok(nodes.shiori1.choices[0].text.includes('书面复审'));
  assert.ok(nodes.shiori2.lines.some(line=>line.text.includes('员工群里那张旧合照')));
  assert.ok(nodes.shiori3.lines[0].text.includes('结束这段关系'));
  assert.ok(nodes.endShioriGood.lines[1].text.includes('原图和凛加过字的版本'));
  assert.equal(nodes.shiori4.choices[0].next,'shioriReckon');
  const bad=nodes.endShioriBad.lines.map(line=>line.text).join('\n');
  for(const expected of ['继续检查和治疗','家属决定','家属留下的转院回执副本','不想让我知道地址','报警时留下的联系人','重新打过结'])assert.ok(bad.includes(expected),expected);
});
test('晚晴线展示可核对记录并让失败原因、学校与跨国安排一致',()=>{
  assert.equal(nodes.qing1.title,'陌生账号');
  assert.ok(nodes.qing1.choices[1].text.includes('事件编号'));
  assert.ok(nodes.qing1.choices[1].text.includes('几段邀约记录'));
  assert.ok(nodes.qing1.choices[0].text.includes('邀约之后'));
  const opening=nodes.qing1.lines.map(line=>line.text).join('\n');
  assert.ok(opening.includes('作品集主页'));assert.ok(opening.includes('店里储物柜'));assert.ok(opening.includes('我回国时'));
  assert.ok(!opening.includes('店长还说'));
  const original=nodes.qing4.lines[3];
  assert.ok(original.text.includes('我陪你和七濑去家庭餐厅'));assert.ok(original.variants[0].text.includes('完整那句'));
  const supplemented=resolveLine(nodes.qingReckon.lines[0],{qingTruth:0,qingPlan:1});
  assert.ok(supplemented.text.includes('第一次')&&supplemented.text.includes('补发了整段'));
  assert.ok(!supplemented.text.includes('刚才又没有发')&&!supplemented.text.includes('共享屏幕'));
  assert.ok(resolveLine(nodes.endQingBad.lines[4],{qingPlan:1}).text.includes('一起选过日期'));
  const dated=resolveLine(nodes.qingReckon.lines[0],{qingTruth:1,qingPlan:0});
  assert.ok(dated.text.includes('票价页还开着')&&!dated.text.includes('现在才打开'));
  assert.ok(!resolveLine(nodes.qingReckon.lines[1],{qingTruth:1,qingPlan:0}).text.includes('今天回来'));
  assert.ok(endings.find(ending=>ending.id==='qing-bad').description.includes('运费已付'));
  const bad=nodes.endQingBad.lines.map(line=>line.text).join('\n');
  assert.ok(bad.includes('国际运费已经付过'));assert.ok(bad.includes('补交期限'));assert.ok(!bad.includes('补面试'));
  assert.ok(nodes.endQingGood.lines[0].text.includes('上海的调动'));
  assert.ok(nodes.endQingGood.lines[4].text.includes('房东换了锁芯'));
  assert.ok(nodes.endQingGood.lines.at(-1).text.includes('下一次去上海'));
  assert.ok(!Object.values(nodes).some(node=>node.lines.some(line=>line.text.includes('补面试'))));
});
test('搬走与独立终章自含房源、材料、人物去向和学校安排',()=>{
  const departure=nodes.endDeparture.lines.map(line=>line.text).join('\n');
  for(const expected of ['短期房','工资照原账户打','书面复审','放弃今年','给晚晴报了平安'])assert.ok(departure.includes(expected),expected);
  const both=resolveLine(nodes.dawn1.lines[0],{recorded:1,replied:1});
  const neither=resolveLine(nodes.dawn1.lines[0],{recorded:0,replied:0});
  assert.ok(both.text.includes('伤痕')&&both.text.includes('跟踪照片'));
  assert.ok(neither.text.includes('没有墙边伤痕')&&neither.text.includes('凌晨的现场照片'));
  const route=nodes.dawn1.lines.map(line=>line.text).join('\n');
  for(const expected of ['她从员工联系页抄给凛的','书店那张招聘纸','回宫崎的票','报警补充材料','用剪刀剪开','报警时间和原图'])assert.ok(route.includes(expected),expected);
  assert.ok(nodes.dawn2.lines[0].text.includes('短期房'));
  assert.ok(nodes.dawn2.lines[2].text.includes('书面复审')&&nodes.dawn2.lines[2].text.includes('不再另排面试'));
  assert.ok(nodes.dawn2.lines[3].text.includes('晚晴已经看完报警时间和原图'));
  assert.ok(nodes.endDawn.lines[5].text.includes('下周日或周一晚上'));
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
