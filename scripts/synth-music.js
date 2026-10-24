import { mkdir, writeFile } from 'node:fs/promises';

// Original scores: all pitches are MIDI notes, durations are in quarter-note beats.
// Wrap synthesis and delay tails across the loop boundary for gapless playback.
const sampleRate=22050;
const scores={
  night:{title:'未发送的夜',bpm:72,beats:4,voice:'piano',pad:.20,
    chords:[[50,57,60,65],[46,53,57,62],[48,55,58,64],[45,52,58,61],[50,57,60,65],[43,50,57,58],[45,52,55,61],[50,57,60,65]],
    melody:[[0,77,1],[1.5,76,.5],[2.5,72,1],[4,69,1.5],[6,74,1],[8,76,1],[9.5,72,1],[11,70,.75],[12,69,1],[14,73,1],[16,77,1],[17.5,81,1],[19,79,.75],[20,77,1.5],[22,74,1],[24,73,1],[25.5,76,.5],[27,69,1],[28,74,2.5]]},
  shift:{title:'末班车前的杯盏',bpm:96,beats:4,voice:'guitar',pad:.09,drums:true,
    chords:[[48,55,59,64],[45,52,55,60],[50,57,60,65],[43,50,59,65],[48,55,59,64],[52,59,62,67],[50,57,60,65],[43,50,59,65]],
    melody:[[.5,76,.5],[1.5,79,.5],[2.5,76,.7],[4.5,72,1],[6,71,.5],[7,69,.5],[8.5,74,.6],[10,77,.5],[11,76,.5],[12.5,74,.7],[14,71,.7],[16.5,76,.5],[17.5,79,.5],[18.5,83,.8],[20.5,79,.5],[22,78,.7],[24.5,77,.8],[26,74,.8],[28.5,71,.5],[30,72,1]]},
  tension:{title:'门外，四秒',bpm:60,beats:4,voice:'bell',pad:.25,
    chords:[[38,45,50,57],[38,45,51,57],[34,41,50,57],[33,40,49,55],[38,45,50,57],[39,46,51,58],[33,40,49,58],[38,45,50,57]],
    melody:[[0,74,.4],[4,73,.4],[8,70,.5],[12,69,.4],[16,74,.4],[20,75,.5],[24,73,.4],[28,74,.7]]},
  rin:{title:'紫色的休止符',bpm:68,beats:4,voice:'bell',pad:.18,
    chords:[[45,52,57,60],[41,48,57,60],[50,57,60,65],[40,47,56,62],[45,52,57,60],[41,48,55,60],[40,47,56,62],[45,52,57,60]],
    melody:[[0,81,.6],[1,83,.5],[2,84,1],[4,81,1],[6,79,1],[8,77,.8],[9.5,76,.6],[11,74,.7],[12,76,1],[14,80,1],[16,81,.6],[17,84,.5],[18,83,1],[20,81,1],[22,79,.7],[24,80,.8],[26,76,.7],[28,81,2]]},
  nana:{title:'南风的快门',bpm:84,beats:4,voice:'guitar',pad:.12,
    chords:[[43,50,54,59],[40,47,50,55],[48,55,59,64],[50,57,60,66],[43,50,54,59],[45,52,55,60],[48,55,59,64],[50,57,60,66]],
    melody:[[0,71,1],[1.5,74,.5],[2,78,1],[4,76,1],[5.5,74,.5],[6,71,1],[8,72,1],[9.5,76,.5],[10,79,1],[12,78,1],[14,74,1],[16,71,1],[17.5,74,.5],[18,79,1],[20,76,1],[21.5,72,.5],[22,69,1],[24,72,1],[26,76,1],[28,74,1],[30,71,1]]},
  shiori:{title:'书页之间',bpm:74,beats:4,voice:'piano',pad:.17,
    chords:[[48,55,59,64],[45,52,59,64],[41,48,55,60],[43,50,57,62],[48,55,59,64],[45,52,55,60],[41,48,55,60],[43,50,55,59]],
    melody:[[0,76,1],[2,79,1],[4,83,1.2],[6,81,.8],[8,79,1],[10,76,1],[12,74,1],[14,71,1],[16,76,1],[18,79,1],[20,84,1.5],[22,83,.8],[24,81,1],[26,79,1],[28,76,1],[30,72,1]]},
  qing:{title:'一个小时的距离',bpm:70,beats:3,voice:'piano',pad:.18,
    chords:[[48,55,59,64],[45,52,55,60],[41,48,55,60],[43,50,57,62],[40,47,55,59],[45,52,59,64],[50,57,60,65],[43,50,55,59]],
    melody:[[0,79,1],[1.5,76,.5],[2,74,.8],[3,72,1.5],[5,71,.7],[6,69,1],[7,72,1],[8,76,.8],[9,74,1.5],[11,71,.8],[12,76,1],[13,79,1],[14,83,.8],[15,81,1.5],[17,79,.8],[18,77,1],[19,74,1],[20,72,.8],[21,71,1],[22,72,1.7]]},
  dawn:{title:'四点零一分',bpm:78,beats:4,voice:'piano',pad:.24,
    chords:[[41,48,52,57],[48,55,59,64],[50,57,60,65],[46,53,57,62],[41,48,52,57],[45,52,55,60],[46,53,57,62],[48,55,58,64]],
    melody:[[0,69,1],[1,72,1],[2,77,1.5],[4,76,1],[5.5,79,.5],[6,84,1],[8,81,1],[10,77,1],[12,74,1],[14,77,1],[16,81,1],[17.5,79,.5],[18,77,1.5],[20,76,1],[22,72,1],[24,74,1],[26,77,1],[28,79,1],[30,77,1.8]]}
};
const freq=m=>440*2**((m-69)/12);
await mkdir(new URL('../public/audio/',import.meta.url),{recursive:true});
for(const [key,score]of Object.entries(scores)){
  const beat=60/score.bpm,duration=beat*score.beats*score.chords.length,length=Math.round(duration*sampleRate);
  const left=new Float64Array(length),right=new Float64Array(length);
  const add=(time,midi,beats,volume,voice='piano',pan=0)=>{
    const start=Math.round(time*beat*sampleRate),seconds=beats*beat,f=freq(midi),tail=voice==='pad'?.7:1.4;
    const count=Math.round((seconds+tail)*sampleRate);
    for(let i=0;i<count;i++){
      const t=i/sampleRate,phase=2*Math.PI*f*t;let wave,env;
      if(voice==='pad'){env=Math.min(1,t/.4)*Math.min(1,Math.max(0,(seconds+.7-t)/.7));wave=(Math.sin(phase)+.3*Math.sin(phase*1.0017)+.15*Math.sin(phase*2))/1.45;}
      else if(voice==='bell'){env=(1-Math.exp(-t*180))*Math.exp(-t*2.2)*Math.min(1,Math.max(0,(seconds+tail-t)/.2));wave=(Math.sin(phase)+.35*Math.sin(phase*2.76)*Math.exp(-t*3)+.12*Math.sin(phase*5.4)*Math.exp(-t*5))/1.47;}
      else if(voice==='guitar'){env=(1-Math.exp(-t*600))*Math.exp(-t*3.2)*Math.min(1,Math.max(0,(seconds+tail-t)/.2));wave=(Math.sin(phase)+.35*Math.sin(phase*2)*Math.exp(-t*3)+.20*Math.sin(phase*3)*Math.exp(-t*5)) /1.55;}
      else {env=(1-Math.exp(-t*350))*Math.exp(-t*2.4)*Math.min(1,Math.max(0,(seconds+tail-t)/.25));wave=(Math.sin(phase)+.32*Math.sin(phase*2)*Math.exp(-t*1.8)+.12*Math.sin(phase*3)*Math.exp(-t*4)+.04*Math.sin(phase*6)*Math.exp(-t*8))/1.48;}
      const value=wave*env*volume,index=(start+i)%length;
      left[index]+=value*Math.sqrt((1-pan)/2);right[index]+=value*Math.sqrt((1+pan)/2);
    }
  };
  score.chords.forEach((chord,bar)=>{
    const start=bar*score.beats;
    chord.forEach((note,j)=>add(start,note,score.beats-.12,score.pad/4,'pad',(j-1.5)*.2));
    add(start,chord[0]-12,1.2,.12,'guitar',-.1);
    for(let step=0;step<score.beats*2;step++){
      const swing=score.drums&&step%2?.08:0;
      add(start+step*.5+swing,chord[1+step%3],.6,key==='tension'?.018:.043,score.voice,(step%3-1)*.35);
    }
  });
  for(const [time,note,beats]of score.melody)add(time,note,beats,key==='tension'?.105:.15,score.voice,.13);
  if(score.drums){for(let b=0;b<score.beats*8;b++){
    const start=Math.round(b*beat*sampleRate);for(let i=0;i<sampleRate*.18;i++){
      const t=i/sampleRate,index=(start+i)%length,noise=Math.sin((i+1)*(b+7)*12.9898)*43758.5453%1;
      const kick=b%2===0?Math.sin(2*Math.PI*(54*t+22*(1-Math.exp(-t*25))/25))*Math.exp(-t*24)*.07:0;
      const brush=noise*Math.exp(-t*45)*.018;left[index]+=kick+brush;right[index]+=kick-brush*.6;
    }
  }}
  // Modest stereo echoes; dry channels retained so the image stays stable.
  const dryL=left.slice(),dryR=right.slice();
  for(const [delay,gain]of [[.127,.12],[.281,.08],[.443,.04]]){
    const offset=Math.round(sampleRate*delay);for(let i=0;i<length;i++){const at=(i+offset)%length;left[at]+=dryR[i]*gain;right[at]+=dryL[i]*gain;}
  }
  let peak=0;for(let i=0;i<length;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
  const gain=.78/Math.max(peak,.01),buffer=Buffer.alloc(44+length*4);
  buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(2,22);buffer.writeUInt32LE(sampleRate,24);buffer.writeUInt32LE(sampleRate*4,28);buffer.writeUInt16LE(4,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(length*4,40);
  for(let i=0;i<length;i++){buffer.writeInt16LE(Math.round(left[i]*gain*32767),44+i*4);buffer.writeInt16LE(Math.round(right[i]*gain*32767),46+i*4);}
  await writeFile(new URL(`../public/audio/${key}.wav`,import.meta.url),buffer);
  console.log(`${key}: ${score.title} · ${duration.toFixed(1)}s · ${score.bpm} BPM`);
}
await writeFile(new URL('../public/audio/credits.json',import.meta.url),JSON.stringify({method:'原创谱曲，以 scripts/synth-music.js 本地加法合成；无采样素材，无生成模型。',format:'22050 Hz / stereo / 16-bit PCM WAV',license:'本项目配乐，可随本游戏使用与修改。',scores},null,2));
