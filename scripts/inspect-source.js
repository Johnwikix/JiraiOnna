import { readFile } from 'node:fs/promises';
const source=JSON.parse(await readFile(new URL('../Assets/qq-20261023-181522-0d4165.json',import.meta.url),'utf8'));
const messages=[];
function walk(v) { if(!v||typeof v!=='object')return;if(v.senderName)messages.push(v);for(const child of Object.values(v))if(child&&typeof child==='object')Array.isArray(child)?child.forEach(walk):walk(child); }
walk(source);
const narrator=messages.find(v=>v.id==='forward:7699092344925601043')?.senderName;
if(!narrator)throw Error('无法定位匿名叙述者的素材锚点');
const selected=messages.filter(v=>v.senderName===narrator);
console.log(JSON.stringify({sender:'匿名叙述者',count:selected.length,first:selected[0]?.timestamp,last:selected.at(-1)?.timestamp,sourceIds:selected.map(v=>v.id)},null,2));
