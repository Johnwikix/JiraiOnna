import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nodes} from '../public/story.js';
import {getTransition,transitionLines} from '../public/transitions.js';
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

