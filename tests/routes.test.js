import test from 'node:test';
import assert from 'node:assert/strict';
import { nodes } from '../public/story.js';
import { createState, advance, choose, resolveLine } from '../public/engine.js';
import { inspectStory } from '../scripts/check-story.js';

const report=inspectStory();
function playRoute(base,changes={}){
  const selections=Object.fromEntries(base.map(entry=>[entry.node,entry.index]));
  Object.assign(selections,changes);
  let state=createState(),guard=0;
  while(!nodes[state.nodeId].ending&&guard++<200){
    const last={...state,line:nodes[state.nodeId].lines.length-1};
    state=nodes[state.nodeId].choices?choose(last,selections[state.nodeId]??0,nodes):advance(last,nodes);
  }
  assert.ok(guard<200,'route did not settle');
  assert.ok(nodes[state.nodeId].ending,'route did not reach an ending');
  return state;
}
const route=state=>[...state.trail.map(item=>item.nodeId),state.nodeId];

test('凛线所有证据组合和直接坏结局都沿实际入口收束',()=>{
  const base=report.paths['rin-good'];
  assert.equal(nodes[playRoute(base).nodeId].ending,'rin-good');
  for(const rinBoundary of [0,1])for(const rinEvidence of [0,1]){
    if(rinBoundary&&rinEvidence)continue;
    const state=playRoute(base,{rin1:rinBoundary?0:1,rin2:rinEvidence?0:1});
    assert.equal(nodes[state.nodeId].ending,'rin-bad');assert.ok(route(state).includes('rinReckon'));
    const forged=resolveLine(nodes.rinReckon.lines[2],state.flags).text;
    assert.equal(forged.includes('没发过'),rinBoundary===0&&rinEvidence===1);
    const evidence=resolveLine(nodes.rinReckon.lines[5],state.flags).text;
    assert.ok(evidence.includes(rinEvidence?'选中发送':'没留原件'));
  }
  const direct=playRoute(base,{rin4:1});
  assert.equal(nodes[direct.nodeId].ending,'rin-bad');assert.ok(!route(direct).includes('rinReckon'));
});

test('七濑线直接圆场与三种 Reckon 入口使用各自文本',()=>{
  const base=report.paths['nana-good'];
  assert.equal(nodes[playRoute(base).nodeId].ending,'nana-good');
  const direct=playRoute(base,{nana4:1});
  assert.ok(!route(direct).includes('nanaReckon'));
  assert.ok(resolveLine(nodes.endNanaBad.lines[4],direct.flags).text.includes('刚才为什么又替她说'));
  for(const nanaWitness of [0,1])for(const nanaOwn of [0,1]){
    if(nanaWitness&&nanaOwn)continue;
    const state=playRoute(base,{nana1:nanaWitness?0:1,nana3:nanaOwn?0:1});
    assert.equal(nodes[state.nodeId].ending,'nana-bad');assert.ok(route(state).includes('nanaReckon'));
    const text=resolveLine(nodes.endNanaBad.lines[4],state.flags).text;
    if(!nanaWitness&&nanaOwn)assert.ok(text.includes('第一版少了地址')&&!text.includes('刚才为什么又替她说'));
    if(!nanaOwn)assert.ok(text.includes('删过的说明'));
  }
});

test('栞线准时好结局、准时后放弃陪同及迟到路径不会串用医院入口',()=>{
  const base=report.paths['shiori-good'];
  assert.equal(nodes[playRoute(base).nodeId].ending,'shiori-good');
  const prepared=playRoute(base,{shioriOnTime:1});
  assert.ok(route(prepared).includes('shioriOnTime')&&!route(prepared).includes('shiori4'));
  assert.ok(resolveLine(nodes.endShioriBad.lines[0],prepared.flags).text.includes('我在后门等她删照片'));
  for(const shioriSteady of [0,1])for(const shioriAgency of [0,1]){
    if(shioriSteady&&shioriAgency)continue;
    const state=playRoute(base,{shiori1:shioriSteady?0:1,shiori3:shioriAgency?0:1});
    assert.equal(nodes[state.nodeId].ending,'shiori-bad');assert.ok(route(state).includes('shiori4'));
    assert.ok(!resolveLine(nodes.endShioriBad.lines[0],state.flags).text.includes('我在后门等她删照片'));
  }
  const direct=playRoute(base,{shiori1:1,shiori3:1,shiori4:1});
  assert.equal(nodes[direct.nodeId].ending,'shiori-bad');assert.ok(!route(direct).includes('shioriReckon'));
});

test('晚晴线四种坦白与计划组合及直接挂断不再否认已执行动作',()=>{
  const base=report.paths['qing-good'];
  assert.equal(nodes[playRoute(base).nodeId].ending,'qing-good');
  for(const qingTruth of [0,1])for(const qingPlan of [0,1]){
    if(qingTruth&&qingPlan)continue;
    const state=playRoute(base,{qing1:qingTruth?0:1,qing3:qingPlan?0:1});
    assert.equal(nodes[state.nodeId].ending,'qing-bad');assert.ok(route(state).includes('qingReckon'));
    const text=resolveLine(nodes.qingReckon.lines[0],state.flags).text;
    assert.ok(!text.includes('刚才又没有发')&&!text.includes('共享屏幕'));
    if(qingTruth)assert.ok(text.includes('两个标着“可能”的日子'));
    else assert.ok(text.includes('第一次')&&text.includes('补发了整段'));
  }
  const direct=playRoute(base,{qing4:1});
  assert.ok(!route(direct).includes('qingReckon'));
  assert.ok(resolveLine(nodes.endQingBad.lines[4],direct.flags).text.includes('一起选过日期'));
});
