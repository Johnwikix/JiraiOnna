import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nodes, characters } from '../public/story.js';
import { getPortraitAsset, getSceneCue, getStagePortrait, getSeenCgs } from '../public/visuals.js';
const media = JSON.parse(readFileSync(new URL('../public/media.json', import.meta.url)));
test('CG starts at the discovery, preserves the next scene, and suppresses duplicate actors',()=>{
  assert.equal(getSceneCue(media,'knock',1).cg,undefined);
  assert.equal(getSceneCue(media,'knock',2).cg,'window');
  assert.equal(getStagePortrait(media,'knock',nodes.knock,5,characters),null);
  assert.equal(getSceneCue(media,'knock',14).cg,undefined);
  assert.equal(getStagePortrait(media,'knock',nodes.knock,14,characters),null);
  assert.equal(getSceneCue(media,'dinner',5).background,'gyudon');
  assert.equal(getSceneCue(media,'dinner',8).cg,'dinner');
});
test('stage keeps the present speaker through first-person narration without displaying the player',()=>{
  assert.equal(getStagePortrait(media,'prologue',nodes.prologue,0,characters),null);
  const rinIndex=nodes.workday.lines.findIndex(l=>l.speaker==='黑濑凛');
  const portrait=getStagePortrait(media,'workday',nodes.workday,rinIndex,characters);
  assert.equal(portrait.key,'rin');assert.equal(portrait.outfit,'work');
});
test('a borrowed jacket is a phone photo, then disappears during the call',()=>{
  const photo=getStagePortrait(media,'rin3',nodes.rin3,2,characters);
  assert.equal(photo.mode,'photo');assert.equal(photo.outfit,'borrowed-jacket');
  assert.equal(getStagePortrait(media,'rin3',nodes.rin3,9,characters),null);
  assert.equal(getStagePortrait(media,'envelope',nodes.envelope,14,characters),null);
  const phoneLine=nodes.qing1.lines.findIndex(l=>l.speaker==='林晚晴');
  assert.equal(getStagePortrait(media,'qing1',nodes.qing1,phoneLine,characters),null);
});
test('gallery unlocks only memories reached in the existing read log',()=>{
  assert.deepEqual([...getSeenCgs(media,[])],[]);
  assert.deepEqual([...getSeenCgs(media,['knock:1:abcd','workday:5:1234'])],[]);
  assert.deepEqual([...getSeenCgs(media,['knock:2:abcd','knock:5:5678','envelope:0:ef01'])],['window','envelope']);
  assert.equal(getPortraitAsset(media,'rin','night-visit'),'/art/production/portraits/rin-night-visit-v1.png');
});

test('seated cafe conversations use their own CG without a standing actor over the table',()=>{
  for(const [id,line,cg]of [['rin1',2,'rin-cafe'],['rin2',0,'rin-cafe'],['nana2',3,'nana-cafe'],['nana3',3,'nana-cafe'],['shiori3',2,'shiori-cafe']]){
    assert.equal(getSceneCue(media,id,line).cg,cg);
    assert.equal(getStagePortrait(media,id,nodes[id],line,characters),null);
  }
});

test('travel, hospital, print shop and returning home select their actual locations',()=>{
  for(const [id,line,bg]of [['messages',0,'airport'],['messages',1,'home'],['messages',3,'station'],['makeover',0,'washroom'],['endShioriBad',0,'hospital'],['qing4',0,'printshop'],['aftermath',10,'room'],['endDeparture',0,'izakaya'],['endDeparture',8,'room'],['endNanaBad',8,'airport'],['dawn2',0,'warehouse']]){
    assert.equal(getSceneCue(media,id,line).background,bg,id+':'+line);
  }
});

