export const emptyData=()=>({version:1,budgets:{daily:4500,weekly:31500,monthly:135000},entries:[],days:{}});
export function valid(d){
  const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
  return d&&d.version===1&&d.budgets&&['daily','weekly','monthly'].every(k=>Number.isSafeInteger(d.budgets[k])&&d.budgets[k]>0&&d.budgets[k]<=99999900)&&Array.isArray(d.entries)&&d.entries.length<=20000&&d.entries.every(e=>e&&typeof e.id==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(e.id)&&date(e.date)&&['早餐','午餐','晚餐','加餐 / 饮料'].includes(e.meal)&&Number.isSafeInteger(e.amount)&&e.amount>=0&&e.amount<=9999900&&typeof e.healthy==='boolean'&&typeof e.note==='string'&&e.note.length<=120)&&new Set(d.entries.map(e=>e.id)).size===d.entries.length&&d.days&&typeof d.days==='object'&&!Array.isArray(d.days)&&Object.keys(d.days).length<=20000&&Object.entries(d.days).every(([k,v])=>date(k)&&v&&typeof v.reflection==='string'&&v.reflection.length<=300&&typeof v.done==='boolean');
}
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// Sites dispatch authenticates this identity header before requests reach the Worker.
// Local development injects its fixed identity on the server, never from browser input.
export async function api(request,env){
  const owner=request.headers.get('oai-authenticated-user-id');
  if(!owner)return json({error:'请先登录后使用数据库。'},401);
  if(!env.DB)return json({error:'数据库尚未连接。'},503);
  if(request.method==='GET'){
    const row=await env.DB.prepare('SELECT payload, revision FROM meal_documents WHERE owner_id = ?').bind(owner).first();
    return json(row?{data:JSON.parse(row.payload),revision:row.revision}:{data:emptyData(),revision:0});
  }
  if(request.method!=='PUT')return json({error:'Method not allowed'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'来源不匹配。'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'需要 JSON。'},415);
  if(Number(request.headers.get('content-length'))>5000000)return json({error:'数据过大。'},413);
  const text=await request.text();if(text.length>5000000)return json({error:'数据过大。'},413);
  let body;try{body=JSON.parse(text)}catch{return json({error:'无效 JSON。'},400)}
  if(!valid(body.data)||!Number.isSafeInteger(body.revision)||body.revision<0)return json({error:'记录或版本号不合法。'},400);
  const payload=JSON.stringify(body.data),revision=body.revision;
  const result=revision===0
    ?await env.DB.prepare('INSERT INTO meal_documents (owner_id, payload, revision) VALUES (?, ?, 1) ON CONFLICT(owner_id) DO NOTHING').bind(owner,payload).run()
    :await env.DB.prepare('UPDATE meal_documents SET payload = ?, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE owner_id = ? AND revision = ?').bind(payload,owner,revision).run();
  if(!result.meta.changes)return json({error:'其他页面已更新数据，请先导出未同步备份，再刷新页面。'},409);
  return json({revision:revision+1});
}
