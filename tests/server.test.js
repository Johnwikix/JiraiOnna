import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

test('服务只公开游戏目录，源聊天与开发文件不可访问',async()=>{
  const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{const base=`http://127.0.0.1:${server.address().port}`;
    const home=await fetch(base);assert.equal(home.status,200);assert.match(await home.text(),/未读，凌晨四点/);assert.ok(home.headers.get('content-security-policy'));
    for(const path of ['/Assets/qq-20261023-181522-0d4165.json','/docs/STORY.md','/package.json','/../server.js','/%2e%2e%5cserver.js'])assert.equal((await fetch(base+path)).status,404,path);
    assert.equal((await fetch(base+'/engine.js')).headers.get('content-type'),'text/javascript; charset=utf-8');
    assert.equal((await fetch(base,{method:'POST'})).status,405);
    assert.equal((await fetch(base,{method:'HEAD'})).status,200);
  }finally{await new Promise(r=>server.close(r));}
});
