import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nodes} from '../public/story.js';
import {getTransition,transitionLines,TransitionPlayer} from '../public/transitions.js';
const media=JSON.parse(readFileSync(new URL('../public/media.json',import.meta.url)));
const at=(nodeId,line=0)=>({nodeId,line,ended:false});
test('a new day fades even when the room and character image are unchanged',()=>{
  const transition=getTransition(at('makeover',15),at('jealousy'),nodes,media);
  assert.ok(transition.text.includes('隔了一夜'));
  assert.ok(getTransition(at('makeover',15),at('jealousyLie'),nodes,media));
});
test('time jumps inside one node carry their own transition and first-person bridge',()=>{
  assert.ok(getTransition(at('endNanaGood',6),at('endNanaGood',7),nodes,media).text.includes('四个月'));
  assert.ok(getTransition(at('endShioriGood',5),at('endShioriGood',6),nodes,media).text.includes('入冬'));
  assert.ok(getTransition(at('messages',2),at('messages',3),nodes,media).text.includes('三天'));
});
test('expanded captivity marks the missed interview and the final five-minute reset',()=>{
  assert.ok(getTransition(at('endCaptive',18),at('endCaptive',19),nodes,media).text.includes('走廊'));
  assert.ok(getTransition(at('endCaptive',23),at('endCaptive',24),nodes,media).text.includes('五分钟'));
});
test('normal dialogue and loading the same position do not replay a time cut',()=>{
  assert.equal(getTransition(null,at('jealousy'),nodes,media),null);
  assert.equal(getTransition(at('jealousy'),at('jealousy'),nodes,media),null);
  assert.equal(getTransition(at('workday',3),at('workday',4),nodes,media),null);
  assert.equal(getTransition(at('endQingGood',9),at('endQingGood',10),nodes,media),null);
});
test('every authored bridge refers to an actual line and stays short enough to read',()=>{
  for(const [position,text]of Object.entries(transitionLines)){
    const [id,index]=position.split(':');
    assert.ok(nodes[id]?.lines[Number(index)],position);
    assert.ok(text.length<=120,position);
    assert.ok(!text.includes('旁白：')&&!text.includes('共通篇'),position);
  }
  assert.ok(Object.keys(transitionLines).length>=30);
});

function fakeTransitionElement(){
  const span={textContent:''};
  return {hidden:true,style:{opacity:'0'},dataset:{},querySelector:()=>span,animate:()=>{throw Error('Reduced-motion test must not animate');}};
}
async function flushTransition(){await Promise.resolve();await Promise.resolve();}

test('described cuts wait for confirmation even in fast mode and finish only once',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const element=fakeTransitionElement(),player=new TransitionPlayer(element,true);
  let commits=0,finishes=0;
  const playing=player.play('确认。',()=>commits++,()=>finishes++,true);
  await flushTransition();
  assert.equal(element.dataset.phase,'hold');assert.equal(commits,1);assert.equal(finishes,0);
  t.mock.timers.tick(10000);await flushTransition();
  assert.equal(player.active,true);assert.equal(element.hidden,false);assert.equal(finishes,0);
  player.finish();player.finish();await playing;
  assert.equal(commits,1);assert.equal(finishes,1);assert.equal(element.hidden,true);
});

test('undescribed short cuts still finish automatically and cancellation settles a manual hold',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const element=fakeTransitionElement(),player=new TransitionPlayer(element,true);
  let commits=0,finishes=0;
  const automatic=player.play('',()=>commits++,()=>finishes++);
  await flushTransition();assert.equal(element.dataset.phase,'hold');
  t.mock.timers.tick(100);await automatic;
  assert.equal(commits,1);assert.equal(finishes,1);assert.equal(element.hidden,true);
  const waiting=player.play('等待。',()=>commits++,()=>finishes++);await flushTransition();
  player.cancel();await waiting;
  assert.equal(commits,2);assert.equal(finishes,1);assert.equal(player.active,false);assert.equal(element.hidden,true);
});
