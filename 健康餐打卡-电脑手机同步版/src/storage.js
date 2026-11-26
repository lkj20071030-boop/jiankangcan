import {createClient} from '@supabase/supabase-js';
import {CloudStore} from './cloud-core.mjs';
const scope='meal-diary-sync:'+new URL('.',location.href).pathname;
const config=window.MEAL_CLOUD_CONFIG||{};
let client=null,store=null;
try{if(config.url&&config.publishableKey){const url=new URL(config.url);if(url.protocol!=='https:')throw Error('需要 HTTPS 项目地址');if(config.publishableKey.startsWith('sb_secret_'))throw Error('不能使用私密密钥');if(config.publishableKey.split('.').length===3){const role=JSON.parse(atob(config.publishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role;if(role!=='anon')throw Error('仅接受 anon 公钥')}client=createClient(url.origin,config.publishableKey,{auth:{storageKey:scope+':session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});store=new CloudStore(client,scope)}}catch(error){window.mealConfigError='云端配置无效：请检查项目 URL 和 publishable key。';}
window.MealCloud={client,configured:!!client,store};
window.MealStore={get cacheKey(){return store?.cacheKey||scope+':signed-out'},load(){if(!store)throw Error('请先配置云端数据库。');return store.load()},save(data,revision){return store.save(data,revision)}};
