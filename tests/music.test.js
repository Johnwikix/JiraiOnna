import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tracks, trackFor } from '../public/music.js';
import { nodes } from '../public/story.js';

test('全部场景能选择存在的配乐，敲门与凛的失衡结局使用紧张曲',()=>{
  for(const n of Object.values(nodes))assert.ok(tracks[trackFor(n)]);
  assert.equal(trackFor(nodes.knock),'tension');assert.equal(trackFor(nodes.endRinBad),'tension');
  assert.equal(trackFor(nodes.shiori1),'shiori');assert.equal(trackFor(nodes.endDawn),'dawn');
});
for(const [key,track]of Object.entries(tracks))test(`配乐有效且无削波：${track.title}`,async()=>{
  const data=await readFile(new URL(`../public/audio/${track.file}`,import.meta.url));
  assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');
  assert.equal(data.readUInt16LE(22),2);assert.equal(data.readUInt16LE(34),16);
  const rate=data.readUInt32LE(24),count=(data.length-44)/4;
  assert.ok(count/rate>=20 && count/rate<=35);
  let peak=0,energy=0,maxJump=0;
  for(let i=44;i<data.length;i+=2){const v=data.readInt16LE(i);peak=Math.max(peak,Math.abs(v));energy+=v*v;}
  for(let c=0;c<2;c++)maxJump=Math.max(maxJump,Math.abs(data.readInt16LE(44+c*2)-data.readInt16LE(data.length-4+c*2)));
  assert.ok(peak<30000);assert.ok(Math.sqrt(energy/((data.length-44)/2))>1000);assert.ok(maxJump<4000,`Loop discontinuity ${maxJump}`);
});
