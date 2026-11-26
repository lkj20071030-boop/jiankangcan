export class CloudStore {
 constructor(client,scope){this.client=client;this.scope=scope;this.user=null;this.cacheKey=scope+':signed-out';}
 async identify(){const {data,error}=await this.client.auth.getUser();if(error||!data.user)throw Error('请登录后读取云端记录。');this.user=data.user;this.cacheKey=this.scope+':draft:'+data.user.id;return data.user;}
 async load(){if(!this.user)await this.identify();const {data,error}=await this.client.from('meal_ledgers').select('payload,revision').eq('owner_id',this.user.id).maybeSingle();if(error)throw Error('无法读取云端数据库，请检查网络和建库配置。');return data?{data:data.payload,revision:Number(data.revision)}:{data:null,revision:0};}
 async save(data,revision){if(!this.user)throw Error('请先登录。');const {data:next,error}=await this.client.rpc('save_meal_ledger',{input_payload:data,expected_revision:revision,expected_owner:this.user.id});if(error){if(error.code==='40001')throw Error('另一设备已更新记录。请先导出本机内容，再刷新后重新修改。');throw Error('云端保存失败，请检查网络或登录状态，先导出未同步内容再重试。')}if(!Number.isSafeInteger(Number(next))||Number(next)!==revision+1)throw Error('云端返回的版本号异常。');return Number(next);}
}
