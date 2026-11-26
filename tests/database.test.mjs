import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {api,emptyData} from '../server/api.mjs';import {openDB} from '../server/sqlite.mjs';
test('database persists, isolates owners, rejects stale writes and invalid requests',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'meal-db-')),file=path.join(dir,'test.sqlite');let DB=openDB(file);
 const request=(method='GET',owner='alice',body,origin='https://meal.test')=>new Request('https://meal.test/api/data',{method,headers:{...(owner?{'oai-authenticated-user-id':owner}:{}),'Origin':origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 try{assert.equal((await api(request('GET',null),{DB})).status,401);assert.equal((await (await api(request(),{DB})).json()).revision,0);
 const data=emptyData();data.entries.push({id:'test-1',date:'2026-11-22',meal:'午餐',amount:1925,healthy:true,note:'蔬菜'});data.days['2026-11-22']={done:true,reflection:'好好吃饭'};
 assert.equal((await api(request('PUT','alice',{data,revision:0}),{DB})).status,200);assert.equal((await api(request('PUT','alice',{data,revision:0}),{DB})).status,409);
 DB.close();DB=openDB(file);const stored=await (await api(request(),{DB})).json();assert.deepEqual(stored.data,data);assert.equal(stored.revision,1);assert.equal((await (await api(request('GET','bob'),{DB})).json()).data.entries.length,0);
 const writes=await Promise.all([api(request('PUT','alice',{data,revision:1}),{DB}),api(request('PUT','alice',{data,revision:1}),{DB})]);assert.deepEqual(writes.map(x=>x.status).sort(),[200,409]);
 assert.equal((await api(request('PUT','alice',{data,revision:2},'https://evil.test'),{DB})).status,403);data.entries[0].amount=-1;assert.equal((await api(request('PUT','alice',{data,revision:2}),{DB})).status,400);
 }finally{DB.close();rmSync(dir,{recursive:true,force:true})}
});
