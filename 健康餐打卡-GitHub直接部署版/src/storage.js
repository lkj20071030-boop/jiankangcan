// Database names include the repository path so multiple Pages apps stay separate.
(function(root){
 'use strict';
 const scope=new URL('.',root.location.href).pathname;
 const name='meal-diary-pages:'+scope;
 const cacheKey=name+':recovery';
 let connection;
 function open(){
  if(connection)return Promise.resolve(connection);
  return new Promise((resolve,reject)=>{
   if(!root.indexedDB){reject(Error('此浏览器不支持 IndexedDB，请使用普通模式的现代浏览器。'));return}
   const request=root.indexedDB.open(name,1);
   request.onupgradeneeded=()=>request.result.createObjectStore('ledger');
   request.onerror=()=>reject(Error('无法打开本机数据库，请检查浏览器存储权限。'));
   request.onblocked=()=>reject(Error('数据库升级受阻，请关闭其他本应用标签页后刷新。'));
   request.onsuccess=()=>{connection=request.result;connection.onversionchange=()=>{connection.close();connection=null};resolve(connection)};
  });
 }
 async function load(){const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction('ledger','readonly'),request=tx.objectStore('ledger').get('main');
  tx.oncomplete=()=>resolve(request.result||{revision:0,data:null});
  tx.onabort=()=>reject(Error('读取本机数据库失败。'));
 });}
 async function save(data,revision){const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction('ledger','readwrite'),store=tx.objectStore('ledger'),get=store.get('main');let conflict=false;
  get.onsuccess=()=>{if((get.result?.revision||0)!==revision){conflict=true;tx.abort();return}store.put({data,revision:revision+1},'main')};
  tx.oncomplete=()=>resolve(revision+1);
  tx.onabort=()=>reject(Error(conflict?'其他标签页已更新记录，请先导出当前内容，再刷新。':'数据库保存失败，可能存储空间不足或权限被禁用。请先导出备份。'));
 });}
 root.MealStore={load,save,cacheKey,close(){connection?.close();connection=null}};
})(globalThis);
