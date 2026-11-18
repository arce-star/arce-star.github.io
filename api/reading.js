const USTC_ENDPOINT = 'https://api.llm.ustc.edu.cn/v1/chat/completions';
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const GITHUB_REPO = 'arce-star/arce-star.github.io';
const GITHUB_PATH = 'assets/data/reading/catalog.json';
const ALLOWED_ORIGINS = new Set(['https://arce-star.github.io','https://arce-star.vercel.app','http://localhost:3000','http://localhost:8000','http://127.0.0.1:3000','http://127.0.0.1:8000']);
function allowedOrigin(req,origin) {
  const extra=String(process.env.READING_ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  return ALLOWED_ORIGINS.has(origin)||extra.includes(origin)||(host&&origin==='https://'+host);
}
function cors(req,res) {
  const origin = String(req.headers.origin||'');
  if (allowedOrigin(req,origin)) res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Reading-Admin-Token');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Cache-Control','no-store, max-age=0');
}
function json(res,code,data){return res.status(code).json(data)}
async function upstream(url, init, timeoutMs=48000){
  const controller = new AbortController();
  const timer=setTimeout(()=>controller.abort(), timeoutMs);
  try {return await fetch(url,{...init,signal:controller.signal})}
  finally {clearTimeout(timer)}
}
async function chat(req,res,body){
  const provider=String(body.provider||'');
  if (!['ustc','deepseek'].includes(provider)) return json(res,400,{error:'仅支持 USTC LLM 和 DeepSeek'});
  const key=String(body.apiKey||'').trim();
  if (!key||key.length>600) return json(res,400,{error:'请提供有效的 API Key'});
  const model=String(body.model||(provider==='ustc'?'deepseek-v4-flash':'deepseek-flash')).trim();
  if (!/^[\w.\-:/]{2,128}$/.test(model)) return json(res,400,{error:'模型名称无效'});
  const messages=Array.isArray(body.messages)?body.messages:[];
  if (!messages.length||messages.length>8||messages.some(m=>!['system','user','assistant'].includes(m?.role)||typeof m?.content!=='string'||m.content.length>24000)) return json(res,400,{error:'请求内容无效或过长'});
  const endpoint=provider==='ustc'?USTC_ENDPOINT:DEEPSEEK_ENDPOINT;
  const payload={model,messages:messages.map(x=>({role:x.role,content:x.content})),stream:false,max_tokens:Math.min(3500,Math.max(200,Number(body.max_tokens)||1800)),temperature:.6};
  if(provider==='deepseek'){
    payload.thinking={type:'disabled'};
    if(body.enableWebSearch===true)payload.tools=[{type:'deepseek_web_search'}];
  }
  try {
    const response=await upstream(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(payload)});
    const raw=await response.text();
    let parsed;try{parsed=JSON.parse(raw)}catch{parsed={error:{message:'模型返回了非 JSON 数据'}}}
    if(!response.ok) return json(res,response.status,{error:String(parsed?.error?.message||parsed?.message||'模型 API 请求失败').slice(0,350),provider});
    const message=parsed?.choices?.[0]?.message?.content;
    if(typeof message!=='string'||!message.trim()) return json(res,502,{error:'模型未返回有效文字内容'});
    return json(res,200,{provider,model:parsed.model||model,text:message,usage:parsed.usage||null});
  } catch(err){
    return json(res,err.name==='AbortError'?504:502,{error:err.name==='AbortError'?'模型请求超时':'无法连接模型服务，请检查网络和代理部署'});
  }
}
async function publish(req,res,body){
  const token=String(req.headers['x-reading-admin-token']||'');
  const admin=process.env.READING_ADMIN_TOKEN||'';
  const gh=process.env.READING_GITHUB_TOKEN||'';
  if(!admin||!gh) return json(res,503,{error:'尚未配置 GitHub 发布服务：请在 Vercel 设置 READING_ADMIN_TOKEN 与 READING_GITHUB_TOKEN'});
  if(!token||token!==admin) return json(res,403,{error:'管理员口令错误'});
  const proposed=body.work;
  if(!proposed||typeof proposed!=='object')return json(res,400,{error:'候选文章信息缺失'});
  const title=String(proposed.title||'').trim().slice(0,120);
  const author=String(proposed.author||'').trim().slice(0,100);
  const genre=String(proposed.genre||'小说');
  if(title.length<2||author.length<2||!['小说','散文'].includes(genre)) return json(res,400,{error:'标题、作者或体裁无效'});
  const url=String(proposed.sourceUrl||'').trim();
  let safeUrl;
  try {const u=new URL(url);if(u.protocol!=='https:')throw Error();safeUrl=u.href} catch {return json(res,400,{error:'必须提交合法 HTTPS 来源链接'})}
  const headers={Authorization:'Bearer '+gh,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  const path='https://api.github.com/repos/'+GITHUB_REPO+'/contents/'+GITHUB_PATH;
  try{
    const current=await upstream(path,{headers},20000);
    if(!current.ok)return json(res,502,{error:'无法读取 GitHub 当前书目'});
    const file=await current.json();
    const catalog=JSON.parse(Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8'));
    if(!Array.isArray(catalog.works))throw Error('Catalog format invalid');
    const key=(w)=>String(w.title||'').replace(/[\s（）()·]/g,'').toLowerCase()+'#'+String(w.author||'').replace(/\s/g,'').toLowerCase();
    if(catalog.works.some(w=>key(w)===key({title,author})))return json(res,409,{error:'作品已在馆藏中'});
    const id='W'+String(Math.max(100,...catalog.works.map(w=>Number(String(w.id||'').replace(/\D/g,''))||0))+1).padStart(3,'0');
    const work={id,title,author,year:String(proposed.year||'未知').slice(0,40),genre,region:String(proposed.region||'未知').slice(0,50),tags:Array.isArray(proposed.tags)?proposed.tags.slice(0,5).map(x=>String(x).slice(0,30)):[],focus:String(proposed.focus||'').slice(0,600),source:'管理员审核新增',sourcePage:'',sourceUrl:safeUrl,rightsStatus:'来源已记录，全文展示权利尚未核验',textMode:'external',analysisStatus:'not_generated',reviewedAt:new Date().toISOString()};
    catalog.works.push(work);catalog.count=catalog.works.length;catalog.updatedAt=new Date().toISOString().slice(0,10);
    const updated=await upstream(path,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({message:'Add reviewed literary work: '+title,content:Buffer.from(JSON.stringify(catalog,null,2)).toString('base64'),sha:file.sha,branch:'main'})},20000);
    if(!updated.ok)return json(res,502,{error:'GitHub 写入失败，请检查令牌权限'}); 
    return json(res,200,{ok:true,work,count:catalog.count});
  }catch(err){return json(res,502,{error:'提交到 GitHub 失败，请检查仓库权限与网络连接'})}
}
async function saveFullText(req,res,body){
  const token=String(req.headers['x-reading-admin-token']||'');
  const admin=process.env.READING_ADMIN_TOKEN||'';
  const gh=process.env.READING_GITHUB_TOKEN||'';
  if(!admin||!gh)return json(res,503,{error:'尚未配置 GitHub 发布服务'});
  if(!token||token!==admin)return json(res,403,{error:'管理员口令错误'});
  const id=String(body.id||'').trim();
  const title=String(body.title||'').trim();
  const author=String(body.author||'').trim();
  const content=String(body.content||'').trim();
  const sourceUrl=String(body.sourceUrl||'').trim();
  if(!/^W\\d{3}$/.test(id)||title.length<1||author.length<1||content.length<500||content.length>60000)return json(res,400,{error:'作品编号、标题、作者或正文长度无效'});
  let safeUrl;
  try{const u=new URL(sourceUrl);if(u.protocol!=='https:'||u.hostname!=='zh.wikisource.org')throw Error();safeUrl=u.href}catch{return json(res,400,{error:'仅接受维基文库 HTTPS 来源'})}
  const headers={Authorization:'Bearer '+gh,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  const fullPath='https://api.github.com/repos/'+GITHUB_REPO+'/contents/assets/data/reading/fulltext.json';
  const catalogPath='https://api.github.com/repos/'+GITHUB_REPO+'/contents/'+GITHUB_PATH;
  try{
    const [fr,cr]=await Promise.all([upstream(fullPath,{headers},20000),upstream(catalogPath,{headers},20000)]);
    if(!fr.ok||!cr.ok)return json(res,502,{error:'无法读取 GitHub 题库文件'});
    const [ff,cf]=await Promise.all([fr.json(),cr.json()]);
    const full=JSON.parse(Buffer.from(ff.content.replace(/\\s/g,''),'base64').toString('utf8'));
    const catalog=JSON.parse(Buffer.from(cf.content.replace(/\\s/g,''),'base64').toString('utf8'));
    const work=catalog.works.find(w=>w.id===id);
    if(!work||work.title!==title||work.author!==author)return json(res,409,{error:'书目与下载正文的作品信息不一致'});
    const entry={id,title,author,year:String(work.year||''),genre:work.genre,sourceUrl:safeUrl,content,attribution:'作者：'+author+'；作品：'+title+'；来源：维基文库。',license:'维基文库页面文本采用 CC BY-SA 4.0；来源页面标注底层作品属于公有领域。',downloadedAt:new Date().toISOString()};
    const index=full.works.findIndex(w=>w.id===id);
    if(index>=0)full.works[index]=entry;else full.works.push(entry);
    full.count=full.works.length;full.updatedAt=new Date().toISOString().slice(0,10);
    const fullWrite=await upstream(fullPath,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({message:'Download full text: '+title,content:Buffer.from(JSON.stringify(full,null,2)).toString('base64'),sha:ff.sha,branch:'main'})},25000);
    if(!fullWrite.ok)return json(res,502,{error:'正文已整理但 GitHub 全文文件写入失败'});
    work.textMode='local';work.source='维基文库';work.sourcePage=work.sourcePage||title;work.sourceUrl=safeUrl;work.rightsStatus='本地已收录全文；维基文库页面标注底层作品为公有领域，页面文本按 CC BY-SA 4.0 署名与相同方式共享';
    catalog.count=catalog.works.length;catalog.updatedAt=new Date().toISOString().slice(0,10);
    const catWrite=await upstream(catalogPath,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({message:'Mark downloaded full text: '+title,content:Buffer.from(JSON.stringify(catalog,null,2)).toString('base64'),sha:cf.sha,branch:'main'})},25000);
    if(!catWrite.ok)return json(res,502,{error:'正文已上传，但书目索引更新失败；请重试同步索引'});
    return json(res,200,{ok:true,id,title,characters:content.length,count:full.count});
  }catch(err){return json(res,502,{error:'保存下载正文失败：'+String(err.message||err).slice(0,160)})}
}
export default async function handler(req,res){
  cors(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')return json(res,405,{error:'Only POST supported'});
  const origin=String(req.headers.origin||'');
  if(origin&&!allowedOrigin(req,origin))return json(res,403,{error:'Origin not allowed'});
  const body=req.body||{};
  if(body.action==='chat')return chat(req,res,body);
  if(body.action==='publish')return publish(req,res,body);
  if(body.action==='save_fulltext')return saveFullText(req,res,body);
  return json(res,400,{error:'Unknown action'});
}