import http from 'node:http';import {fileURLToPath} from 'node:url';import {readFile,mkdir} from 'node:fs/promises';import {api} from './api.mjs';import {openDB} from './sqlite.mjs';
await mkdir(new URL('../data/',import.meta.url),{recursive:true});const DB=openDB(fileURLToPath(new URL('../data/meals.sqlite',import.meta.url)));
const port=Number(process.env.PORT||4173),origin='http://127.0.0.1:'+port;
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,origin);if(req.headers.host!=='127.0.0.1:'+port&&req.headers.host!=='localhost:'+port){res.writeHead(403);res.end('Invalid host');return}let response;
 if(url.pathname==='/api/data'){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>5000000){res.writeHead(413);res.end();return}chunks.push(chunk)}const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-owner');response=await api(new Request(url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})}),{DB})}
 else {const name={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css'}[url.pathname];if(!name){res.writeHead(404);res.end();return}response=new Response(await readFile(new URL('../public/'+name,import.meta.url)),{headers:{'Content-Type':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store'}})}
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){res.writeHead(500);res.end('Database or server error')}});
server.listen(port,'127.0.0.1',()=>console.log('餐费打卡：'+origin+'（SQLite 持久存储，仅本机访问）'));
process.on('SIGINT',()=>server.close(()=>{DB.close();process.exit(0)}));
