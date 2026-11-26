import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
const assets={};for(const [name,type] of [['index.html','text/html; charset=utf-8'],['app.js','text/javascript; charset=utf-8'],['style.css','text/css; charset=utf-8']])assets['/'+name]={type,body:await readFile(new URL('../public/'+name,import.meta.url),'utf8')};
const api=await readFile(new URL('../server/api.mjs',import.meta.url),'utf8');
const worker=api+`\nconst assets=${JSON.stringify(assets)};\nexport default {async fetch(request,env){const path=new URL(request.url).pathname;try{if(path==='/api/data')return await api(request,env);const asset=assets[path==='/'?'/index.html':path];if(!asset)return new Response('Not found',{status:404});return new Response(asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}catch(e){console.error('Meal database request failed');return Response.json({error:'数据库服务暂不可用，请稍后重试。'},{status:503})}}};\n`;
await rm(new URL('../dist/',import.meta.url),{recursive:true,force:true});
await mkdir(new URL('../dist/server/',import.meta.url),{recursive:true});await mkdir(new URL('../dist/.openai/',import.meta.url),{recursive:true});
await writeFile(new URL('../dist/server/index.js',import.meta.url),worker);
await writeFile(new URL('../dist/.openai/hosting.json',import.meta.url),await readFile(new URL('../.openai/hosting.json',import.meta.url)));
console.log('Built Worker with embedded frontend and D1 API.');
