import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {IDBFactory} from 'fake-indexeddb';
const source=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
function browser(factory,pathname='/meal-diary/',cache=new Map()){
 const els={},el=id=>els[id]??={id,value:'',textContent:'',innerHTML:'',style:{},hidden:true,disabled:false,checked:false,reset(){el('meal').value='早餐';el('amount').value='';el('note').value='';el('isHealthy').checked=true},focus(){}};
 el('meal').value='早餐';const handlers={};const main={};
 const ctx=vm.createContext({document:{getElementById:el,querySelector:()=>main,querySelectorAll:()=>Object.values(els),addEventListener:(name,handler)=>handlers[name]=handler},localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)},indexedDB:factory,location:{href:'https://example.github.io'+pathname,reload(){}},navigator:{},URL,Intl,Date,Math,Number,String,Array,Object,Set,JSON,crypto:webcrypto,confirm:()=>true,alert(){},window:{scrollTo(){}},console});
 const run=code=>vm.runInContext(code,ctx);run(source('storage.js'));return {el,run,cache,handlers,ctx,main};
}
test('IndexedDB survives reopening, isolates repository paths, atomically rejects stale writes',async()=>{
 const factory=new IDBFactory(),a=browser(factory),b=browser(factory);
 try{assert.equal((await a.run('MealStore.load()')).revision,0);assert.equal(await a.run('MealStore.save({test:42},0)'),1);a.run('MealStore.close()');assert.equal((await b.run('MealStore.load()')).data.test,42);
 const other=browser(factory,'/other-app/');assert.equal((await other.run('MealStore.load()')).data,null);other.run('MealStore.close()');
 const writes=await Promise.allSettled([a.run('MealStore.save({test:43},1)'),b.run('MealStore.save({test:44},1)')]);assert.equal(writes.filter(x=>x.status==='fulfilled').length,1);assert.match(writes.find(x=>x.status==='rejected').reason.message,/其他标签页/);
 }finally{a.run('MealStore.close()');b.run('MealStore.close()')}
});
test('Pages app saves real totals and check-ins with no backend, imports backups, detects conflicts',async()=>{
 const factory=new IDBFactory(),opened=[];
 async function app(){const b=browser(factory);opened.push(b);b.run(source('app.js'));for(let i=0;i<100&&!b.run('ready||failed');i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(b.run('ready'),true);return b}
 const save=(b,meal,amount,healthy)=>{b.el('meal').value=meal;b.el('amount').value=amount;b.el('isHealthy').checked=healthy;b.el('entry').onsubmit({preventDefault(){}});return b.run('queue')};
 try{const a=await app();await save(a,'早餐','10',true);await save(a,'午餐','19.25',true);await save(a,'晚餐','17.80',false);assert.equal(a.el('total').textContent,'¥47.05');assert.equal(a.el('healthy').textContent,'¥29.25');assert.match(a.el('summary').textContent,/2.05/);a.el('checkin').onclick();await a.run('queue');
 const b=await app();assert.equal(b.el('total').textContent,'¥47.05');assert.match(b.el('checkStatus').textContent,/已打卡/);await save(a,'加餐 / 饮料','0.10',false);assert.equal(a.run('data.days[$("date").value].done'),false);await save(b,'加餐 / 饮料','1',false);assert.equal(b.run('failed'),true);assert.match(b.el('storageStatus').textContent,/其他标签页/);assert.equal(b.el('export').disabled,false);assert.equal(b.el('saveEntry').disabled,true);
 const c=await app();assert.equal(c.el('total').textContent,'¥47.15');const exported=JSON.parse(c.run('JSON.stringify(data)'));exported.entries[0].amount=1234;const event={target:{files:[{size:1000,text:async()=>JSON.stringify(exported)}]}};await c.el('import').onchange(event);await c.run('queue');const d=await app();assert.equal(d.el('total').textContent,'¥49.49');
 d.el('date').value=d.run('shift($("date").value,-1)');d.el('date').onchange();assert.equal(d.el('total').textContent,'¥0.00');await save(d,'早餐','9.90',true);assert.equal(d.el('total').textContent,'¥9.90');
 }finally{for(const b of opened)b.run('MealStore.close()')}
});
test('single HTML deploys at project subpaths without API, external assets, or build step',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/indexedDB\.open/);assert.doesNotMatch(html,/fetch\(|\/api\/data|<script[^>]+src=|<link[^>]+stylesheet/);assert.match(html,/不跨设备同步/);
 const inline=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(inline);assert.match(html,/charset="utf-8"/);
});
