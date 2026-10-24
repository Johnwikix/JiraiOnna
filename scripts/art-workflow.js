import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const spec=JSON.parse(await fs.readFile(path.join(root,'art/prompts.json'),'utf8'));
export function workflow(asset) {
  return {
    '1':{class_type:'UNETLoader',inputs:{unet_name:'anima-turbo-v1.1.safetensors',weight_dtype:'default'}},
    // The current ComfyUI detects Qwen3-0.6B as the Anima encoder by weight keys.
    '2':{class_type:'CLIPLoader',inputs:{clip_name:'qwen_3_06b_base.safetensors',type:'stable_diffusion',device:'default'}},
    '3':{class_type:'VAELoader',inputs:{vae_name:'qwen_image_vae.safetensors'}},
    '4':{class_type:'CLIPTextEncode',inputs:{text:`${spec.style}, ${asset.prompt}`,clip:['2',0]}},
    '5':{class_type:'CLIPTextEncode',inputs:{text:spec.negative,clip:['2',0]}},
    '6':{class_type:'EmptySD3LatentImage',inputs:{width:asset.width,height:asset.height,batch_size:1}},
    '7':{class_type:'KSampler',inputs:{model:['1',0],seed:asset.seed,steps:spec.steps,cfg:spec.cfg,sampler_name:spec.sampler,scheduler:spec.scheduler,positive:['4',0],negative:['5',0],latent_image:['6',0],denoise:1}},
    '8':{class_type:'VAEDecode',inputs:{samples:['7',0],vae:['3',0]}},
    '9':{class_type:'SaveImage',inputs:{images:['8',0],filename_prefix:`jirai/${asset.id}`}}
  };
}

async function main(){
  const id=process.argv.find(a=>a.startsWith('--asset='))?.split('=')[1];
  const selected=id?spec.assets.filter(a=>a.id===id):spec.assets;
  const skipExisting=process.argv.includes('--skip-existing');
  const suffix=process.argv.find(a=>a.startsWith('--output-suffix='))?.split('=')[1]||'';
  if(suffix&&!/^-[a-zA-Z0-9-]+$/.test(suffix))throw Error('输出后缀须为 -v2 之类的安全文件名片段。');
  if(!selected.length)throw Error(`未知素材：${id}`);
  const output=path.join(root,'art/workflows');await fs.mkdir(output,{recursive:true});
  for(const asset of selected)await fs.writeFile(path.join(output,`${asset.id}${suffix}.json`),JSON.stringify(workflow(asset),null,2));
  console.log(`已准备 ${selected.length} 个 API 工作流。默认只写计划，不连接 ComfyUI，不加载模型。`);
  if(!process.argv.includes('--run'))return;
  const base='http://127.0.0.1:8188';
  for(const asset of selected){
    const dir=path.join(root,'public/art');await fs.mkdir(dir,{recursive:true});
    const target=path.join(dir,`${asset.id}${suffix}.png`);
    try{await fs.access(target);if(skipExisting){console.log(`${asset.id}: skipped existing ${target}`);continue;}throw Error(`素材已存在：${target}，请先检查原文件或指定 --output-suffix=-v2。`);}catch(error){if(error.code!=='ENOENT')throw error;}
    const result=await fetch(`${base}/prompt`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:workflow(asset),client_id:'jirai-local-cli'})});
    const data=await result.json();if(!result.ok||data.error)throw Error(JSON.stringify(data));
    console.log(`${asset.id}: queued ${data.prompt_id}`);
    const deadline=Date.now()+15*60*1000;let completed=false;
    while(Date.now()<deadline){
      await new Promise(r=>setTimeout(r,2000));
      const record=await (await fetch(`${base}/history/${data.prompt_id}`)).json();const task=record[data.prompt_id];if(!task)continue;
      if(task.status?.status_str==='error')throw Error(JSON.stringify(task.status));
      const image=task.outputs?.['9']?.images?.[0];if(!image)continue;
      const url=new URL(`${base}/view`);Object.entries(image).forEach(([k,v])=>url.searchParams.set(k,v));
      const bytes=Buffer.from(await (await fetch(url)).arrayBuffer());
      try{await fs.writeFile(target,bytes,{flag:'wx'});}catch(error){if(error.code==='EEXIST')throw Error(`素材已存在：${target}，请先检查原文件后决定替换或另存。`);throw error;}
      await fs.writeFile(`${target}.json`,JSON.stringify({id:asset.id,kind:asset.kind,width:asset.width,height:asset.height,model:spec.model,prompt:`${spec.style}, ${asset.prompt}`,negative:spec.negative,seed:asset.seed,steps:spec.steps,cfg:spec.cfg,workflow:workflow(asset),generatedAt:new Date().toISOString()},null,2));
      console.log(`${asset.id}: saved ${target}`);completed=true;break;
    }
    if(!completed)throw Error(`生成超时：${asset.id}。请检查 ComfyUI 历史记录。`);
  }
  console.log('生成后请检查图片和立绘背景，完成检查再执行媒体接入。');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
