import {test} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';import {CloudStore} from '../src/cloud-core.mjs';import vm from 'node:vm';
const alice='00000000-0000-0000-0000-000000000001',bob='00000000-0000-0000-0000-000000000002';
test('PostgreSQL enforces account isolation, login and atomic versions; two devices read same ledger',async()=>{
 const db=new PGlite();await db.waitReady;
 try{await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${alice}'),('${bob}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 await db.exec(readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
 let dbQueue=Promise.resolve();
 function client(owner){const perform=fn=>{const job=dbQueue.then(async()=>{await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${owner}';`);return fn()});dbQueue=job.catch(()=>{});return job};return {auth:{getUser:async()=>({data:{user:{id:owner,email:owner+'@test.com'}}})},from(){return {select(){return this},eq(){return this},async maybeSingle(){try{const r=await perform(()=>db.query('select payload,revision from public.meal_ledgers'));return {data:r.rows[0]||null}}catch(error){return {error}}}}},async rpc(name,args){try{const r=await perform(()=>db.query('select public.save_meal_ledger($1::jsonb,$2::bigint,$3::uuid) as revision',[JSON.stringify(args.input_payload),args.expected_revision,args.expected_owner]));return {data:Number(r.rows[0].revision)}}catch(error){return {error}}}}}
 const pc=new CloudStore(client(alice),'test'),phone=new CloudStore(client(alice),'test'),stranger=new CloudStore(client(bob),'test');await pc.identify();await phone.identify();await stranger.identify();assert.equal((await pc.load()).revision,0);
 const data={version:1,budgets:{daily:4500,weekly:31500,monthly:135000},entries:[{id:'meal-1',date:'2026-11-26',amount:1925,healthy:true,meal:'午餐',note:''}],days:{}};
 assert.equal(await pc.save(data,0),1);assert.deepEqual((await phone.load()).data,data);assert.equal((await stranger.load()).data,null);
 assert.equal(await phone.save({...data,days:{'2026-11-26':{done:true,reflection:'完成'}}},1),2);await assert.rejects(pc.save(data,1),/另一设备/);assert.equal((await pc.load()).data.days['2026-11-26'].done,true);
 // Stale session/user mismatch is rejected server-side, rather than writing to a new account.
 const switched=client(bob);const r=await switched.rpc('save_meal_ledger',{input_payload:data,expected_revision:0,expected_owner:alice});assert.equal(r.error.code,'28000');
 await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${alice}';`);await assert.rejects(db.query('insert into public.meal_ledgers(owner_id,payload,revision) values($1,$2,1)',[bob,JSON.stringify(data)]));
 await db.exec('reset role;set role anon;');await assert.rejects(db.query('select * from public.meal_ledgers'));await assert.rejects(db.query('select public.save_meal_ledger($1,0,$2)',[JSON.stringify(data),alice]));
 }finally{await db.close()}
});
test('artifact keeps deployment configuration external and includes login and sync controls',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/<script src="config.js"><\/script>/);for(const id of ['authPanel','login','signup','logout','reloadData','recover'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(html,/sb_secret_[a-zA-Z0-9]{12,}/);const inline=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(inline);assert.match(html,/setInterval\(\(\)=>pullCloud\(\),15000\)/);
});
