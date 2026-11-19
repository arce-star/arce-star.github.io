(()=>{
'use strict';
const $ = id => document.getElementById(id);
const keys={favs:'wenjian:favs',notes:'wenjian:notes',progress:'wenjian:progress',theme:'wenjian:theme',fontsize:'wenjian:fontsize'};
const getJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const saveJSON=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const state={works:[],fulltexts:{},filtered:[],visible:24,genre:'全部',topic:'',region:'',search:'',active:null,provider:'ustc',apiKey:'',model:'qwen-chat',proxy:'',remember:false,analysis:'',keysByProvider:{ustc:'',deepseek:''},modelsByProvider:{ustc:'qwen-chat',deepseek:'deepseek-flash'},favs:new Set(getJSON(keys.favs,[])),notes:getJSON(keys.notes,{}),progress:getJSON(keys.progress,{}),manualText:'',fullText:'',candidates:[],activeSection:'library'};
const providers={
 ustc:{label:'USTC LLM',base:'https://api.llm.ustc.edu.cn/v1',endpoint:'https://api.llm.ustc.edu.cn/v1/chat/completions',model:'qwen-chat',models:['qwen-chat','qwen-reasoner','smart/reasoning','smart/default','deepseek-v4-flash-ascend1','qwen3.8-reasoner','qwen3.8-chat','glm-5.3-flash','deepseek-flash','deepseek-flash-2','qwen3.8-flash-next'],help:'学校统一入口 · OpenAI 协议；聊天请求使用 Bearer API Key，选择此 Key 已授权的模型。'},
 deepseek:{label:'DeepSeek 官方',base:'https://api.deepseek.com',endpoint:'https://api.deepseek.com/chat/completions',model:'deepseek-flash',models:['deepseek-flash','deepseek-v4-pro'],help:'DeepSeek 官方 Chat Completions；密钥与学校 Key 独立保存。'}
};
const esc = x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeSet(node,value){node.textContent=String(value??'')}
function safeLink(href){try{const u=new URL(href);return u.protocol==='https:'?u.href:'#'}catch{return '#'}}
function textEl(tag,text,cls){const node=document.createElement(tag);if(cls)node.className=cls;safeSet(node,text);return node}
function createBtn(text,cls,handler){const btn=document.createElement('button');btn.type='button';btn.className=cls||'';safeSet(btn,text);btn.addEventListener('click',handler);return btn}
function localSettings(){
 try{
  const opt=JSON.parse(sessionStorage.getItem('wenjian:provider')||'null');
  if(opt){
   if(opt.modelsByProvider)Object.keys(providers).forEach(p=>{
    if(typeof opt.modelsByProvider[p]==='string')state.modelsByProvider[p]=opt.modelsByProvider[p];
   });
   if(opt.provider&&providers[opt.provider])state.provider=opt.provider;
   if(opt.model&&!opt.modelsByProvider)state.modelsByProvider[state.provider]=opt.model;
   state.proxy=typeof opt.proxy==='string'?opt.proxy:'';
   state.remember=opt.remember===true;
   if(state.remember&&opt.keysByProvider)Object.keys(providers).forEach(p=>{
    state.keysByProvider[p]=String(opt.keysByProvider[p]||'');
   });
   if(state.remember&&opt.apiKey&&!opt.keysByProvider)state.keysByProvider[state.provider]=String(opt.apiKey);
  }
 }catch{}
 state.model=state.modelsByProvider[state.provider];
 state.apiKey=state.keysByProvider[state.provider];
 const font=Number(localStorage.getItem(keys.fontsize)||19);
 document.documentElement.style.setProperty('--reader-size',Math.max(15,Math.min(font,29))+'px');
 if(localStorage.getItem(keys.theme)==='dark')document.body.classList.add('dark');
}
function setStatus(text){safeSet($('catalogStatus'),text)}
async function loadCatalog(){
 try{
 const [res,textRes]=await Promise.all([
  fetch('assets/data/reading/catalog.json?v=3',{cache:'no-cache'}),
  fetch('assets/data/reading/fulltext.json?v=8',{cache:'no-cache'})
 ]);
 if(!res.ok)throw Error('HTTP '+res.status);
 const data=await res.json();
 if(!Array.isArray(data.works))throw Error('书目数据格式不正确');
 state.works=data.works;
 state.fulltexts={};
 if(textRes.ok){
  const full=await textRes.json();
  if(Array.isArray(full.works))full.works.forEach(w=>{if(w.id&&w.content)state.fulltexts[w.id]=w});
 }
 safeSet($('catalogCount'),state.works.length);
 renderTopics();renderCards();
 }catch(err){setStatus('无法加载书目：'+err.message+'。请检查网络连接或刷新页面。')}
}
function renderTopics(){
 const counts={};state.works.forEach(w=>(w.tags||[]).forEach(t=>counts[t]=(counts[t]||0)+1));
 const popular=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,16).map(x=>x[0]);
 const area=$('topicbar');area.replaceChildren();
 ['全部主题',...popular].forEach((name,i)=>{const b=createBtn(name,'topic'+(i===0?' selected':''),()=>{state.topic=i===0?'':name;area.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));state.visible=24;renderCards()});b.dataset.topic=i===0?'':name;area.append(b)})
}
function selectGenre(genre){
 state.genre=genre;state.visible=24;document.querySelectorAll('[data-genre]').forEach(b=>b.classList.toggle('selected',b.dataset.genre===genre));renderCards();
}
function renderCards(){
 const query=state.search.trim().toLowerCase();
 state.filtered=state.works.filter(w=>{
 if(state.genre==='收藏'){if(!state.favs.has(w.id))return false}
 else if(state.genre!=='全部'&&w.genre!==state.genre)return false;
 if(state.topic&&!(w.tags||[]).includes(state.topic))return false;
 if(state.region&&w.region!==state.region)return false;
 return !query||[w.title,w.author,w.region,...(w.tags||[])].some(s=>String(s||'').toLowerCase().includes(query))
 });
 const area=$('cards');area.replaceChildren();
 state.filtered.slice(0,state.visible).forEach((w,index)=>{
 const card=document.createElement('article');card.className='workcard';card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','阅读 '+w.title);
 const genre=textEl('div',w.genre+' · '+w.region,'genre');const title=textEl('h3',w.title);const byline=textEl('div',(w.sourceBookPage?w.region+' · 第'+w.sourceBookPage+'页':w.author+' · '+w.year),'byline');
 const focus=textEl('p',w.focus,'focus');const bottom=document.createElement('div');bottom.className='bottom';
 bottom.append(textEl('span',state.fulltexts[w.id]?'扫描原文 · OCR 待校对':'正文待入库'));
 const fav=createBtn(state.favs.has(w.id)?'♥':'♡','favbtn',e=>{e.stopPropagation();toggleFavorite(w.id);renderCards()});fav.title='收藏';fav.setAttribute('aria-label','收藏 '+w.title);bottom.append(fav);
 card.append(genre,title,byline,focus,bottom);
 card.addEventListener('click',()=>openWork(w));card.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openWork(w)}});area.append(card);
 });
 $('loadMore').classList.toggle('hidden',state.filtered.length<=state.visible);
 setStatus('显示 '+Math.min(state.visible,state.filtered.length)+' / '+state.filtered.length+' 篇 · 三册共 '+state.works.length+' 篇 · OCR 正文 '+Object.keys(state.fulltexts).length+' 篇 · 识别文字待校对');
}
function toggleFavorite(id){state.favs.has(id)?state.favs.delete(id):state.favs.add(id);saveJSON(keys.favs,[...state.favs]);if(state.active?.id===id)safeSet($('readerFav'),state.favs.has(id)?'♥ 已收藏':'♡ 收藏')}
function showSection(which){
 state.activeSection=which;$('collection').classList.toggle('hidden',which!=='library');$('hero').classList.toggle('hidden',which!=='library');$('discover').classList.toggle('hidden',which!=='library');$('personal').classList.toggle('hidden',which!=='personal');
 $('libraryNav').classList.toggle('navactive',which==='library');$('notesNav').classList.toggle('navactive',which==='personal');if(which==='personal')renderPersonal();
 window.scrollTo({top:0,behavior:'smooth'});
}
function renderPersonal(){
 const area=$('myReading');area.replaceChildren();const saved=state.works.filter(w=>state.favs.has(w.id)||state.notes[w.id]||state.progress[w.id]);
 if(!saved.length){area.append(textEl('p','还没有收藏和笔记。可以从书库中打开一篇作品，开始留下自己的阅读痕迹。','muted'));return}
 saved.forEach(w=>{const d=document.createElement('div');d.className='my-item';const desc=document.createElement('div');desc.append(textEl('strong',w.title),textEl('p',w.author+' · '+(state.notes[w.id]?'有个人笔记':'收藏 / 最近阅读'),'muted'));
 if(state.notes[w.id])desc.append(textEl('p',state.notes[w.id].slice(0,160)+(state.notes[w.id].length>160?'…':''),'muted'));d.append(desc,createBtn('继续阅读 →','',()=>openWork(w)));area.append(d)})
}
// The scanned books contain physical OCR line wraps, not paragraph markers.
// Infer likely paragraph ends from a shorter final printed line. Never modify OCR words.
function parseOcrParagraphs(raw=''){
 const blocks=String(raw).replace(/\r\n?/g,'\n').split(/\n[ \t]*\n/);
 const output=[];
 for(const block of blocks){
  const lines=block.split('\n').map(line=>line.trim()).filter(Boolean);
  if(!lines.length)continue;
  const lengths=lines.map(line=>Array.from(line).length).filter(n=>n>=22).sort((a,b)=>a-b);
  const width=lengths[Math.floor(lengths.length*0.72)]||52;
  let paragraph='';
  const finish=()=>{if(paragraph){output.push(paragraph);paragraph=''}};
  for(let i=0;i<lines.length;i++){
   const line=lines[i];
   // Do not add whitespace between Chinese characters across a PDF line.
   if(paragraph&&/[a-zA-Z0-9]$/.test(paragraph)&&/^[a-zA-Z0-9]/.test(line))paragraph+=' ';
   paragraph+=line;
   const lineWidth=Array.from(line).length;
   const endsSentence=/[。！？!?][”"'’）】]*$/.test(line);
   const shortLastLine=lineWidth<Math.max(24,width*0.78);
   const longParagraph=paragraph.length>=620;
   if(endsSentence&&((shortLastLine&&paragraph.length>=55)||longParagraph))finish();
  }
  finish();
 }
 return output;
}
function closeReader(){
 $('readerOverlay').classList.add('hidden');$('analysisPanel').classList.add('hidden');document.body.style.overflow='';document.title='文间 · 文学阅读与赏析馆';state.active=null;state.manualText='';state.fullText='';renderCards();
}
async function openWork(w){
 state.active=w;state.fullText='';state.manualText='';state.analysis='';
 safeSet($('readerTitle'),w.title);safeSet($('readerMeta'),(w.region||'')+' · '+w.genre+(w.sourceBookPage?' · 原书第'+w.sourceBookPage+'页':'')+(w.ocrStatus==='needs_review'?' · OCR 待校对':''));
 const tags=$('readerTags');tags.replaceChildren();(w.tags||[]).slice(0,4).forEach(t=>tags.append(textEl('span',t)));
 safeSet($('readerFav'),state.favs.has(w.id)?'♥ 已收藏':'♡ 收藏');safeSet($('noteText'),state.notes[w.id]||'');safeSet($('noteStatus'),'');
 const source=$('sourceFoot');source.replaceChildren();
 source.append(textEl('p','收录说明：'+(w.rightsStatus||'OCR 文字待人工校对')+'。若发现识别错误，请以原书扫描页为准。'));
 if(w.sourceUrl){const src=document.createElement('a');src.href=safeLink(w.sourceUrl);src.target='_blank';src.rel='noopener noreferrer';safeSet(src,'查阅原始来源 ↗');source.append(src)}
 $('readerOverlay').classList.remove('hidden');$('analysisPanel').classList.add('hidden');document.body.style.overflow='hidden';document.title=w.title+' · 文间';
 const body=$('readerContent');body.replaceChildren();body.append(textEl('p','正在加载扫描文本……','muted'));
 safeSet($('analysisBody'),'赏析方向：\n\n'+w.focus+'\n\n可从原文细节出发，结合叙事视角、语言、人物关系与时代语境进行多种解读。');
 $('readerScroll').scrollTop=0;
 const localText=state.fulltexts[w.id];
 if(localText){
  body.replaceChildren();
  body.append(textEl('p','扫描版 OCR 转录 · 字词和标点尚待校对','reader-ocr-note'));
  const paragraphs=parseOcrParagraphs(localText.content);
  paragraphs.forEach(p=>body.append(textEl('p',p)));
  state.fullText=paragraphs.join('\n\n');
  source.append(textEl('p',localText.attribution||('来源：'+(w.source||'上传的训练册 PDF')+'；原书第'+(w.sourceBookPage||'?')+'页。')));
  source.append(textEl('p',localText.license||'原文著作权归相应权利人所有；此文本为扫描件 OCR 转录。'));
  if(localText.editionNote)source.append(textEl('p','版本说明：'+localText.editionNote));
 }else{
  body.replaceChildren();body.append(textEl('p','这篇文章的 OCR 正文暂时没有加载成功，请刷新页面后重试。','reader-ocr-note'));
 }
 if(state.active?.id!==w.id)return;
 if(state.progress[w.id]){const s=$('readerScroll');requestAnimationFrame(()=>{s.scrollTop=Math.max(0,(s.scrollHeight-s.clientHeight)*Math.min(1,state.progress[w.id]))})}
}
function openAnalysis(){$('analysisPanel').classList.remove('hidden')}
function closeAnalysis(){$('analysisPanel').classList.add('hidden')}
function proxyEndpoint(){
 const raw=state.proxy.trim();
 if(!raw){
  if(location.hostname.endsWith('github.io'))return null;
  return '/api/reading';
 }
 if(raw==='/api/reading'&&location.hostname.endsWith('github.io'))throw Error('GitHub Pages 上的 /api/reading 不是后端。请填入已部署的 Vercel 完整 HTTPS 地址。');
 const url=new URL(raw,location.href);
 if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('代理地址必须是 HTTPS');
 if(!url.pathname.endsWith('/api/reading'))throw Error('代理地址应以 /api/reading 结尾');
 return url.href;
}
function providerPayload(messages,max_tokens=1800,enableWebSearch=false){
 const payload={model:state.model,messages,stream:false,max_tokens:max_tokens||1800};
 if(state.provider==='deepseek'){
  payload.thinking={type:'disabled'};
  if(enableWebSearch)payload.tools=[{type:'deepseek_web_search'}];
 }
 return payload;
}
async function decodeResponse(response,mode){
 let data;
 try{data=await response.json()}catch{throw Error('接口返回了非 JSON 内容（HTTP '+response.status+'）。'+(mode==='proxy'?'请核对 Vercel 代理地址与部署状态。':'请核对 API 域名和协议。'))}
 if(!response.ok||data.error){
  const error=data.error?.message||data.error||data.detail||data.message||'API 请求失败';
  const hint=response.status===401?'（API Key 无效或过期）':response.status===403?'（Key 没有模型权限）':response.status===404?'（API 路径或模型名错误）':response.status===429?'（已限流或额度不足）':'';
  throw Error('HTTP '+response.status+' '+String(error).slice(0,220)+' '+hint);
 }
 return data;
}
async function fetchWithExplanation(url,options,mode){
 try{return await fetch(url,options)}
 catch(err){
  if(err?.name==='AbortError')throw Error('请求超时，请检查网络或选择更快的模型。');
  if(mode==='direct')throw Error('无法从浏览器直连官方接口：可能受到 CORS 跨域策略或网络限制。请部署 Vercel 后端，并在「代理地址」填入 https://实际域名/api/reading。');
  throw Error('无法连接代理服务：请检查 Vercel 地址、部署状态和跨域设置。');
 }
}
async function requestAI(messages,max_tokens=1800,adminToken='',enableWebSearch=false){
 const key=state.apiKey;
 if(!key&&!adminToken)throw Error('请先填写所选平台的 API Key');
 const proxy=proxyEndpoint();
 if(adminToken&&!proxy)throw Error('向 GitHub 发布候选需要部署 Vercel 后端代理。');
 if(proxy){
  const response=await fetchWithExplanation(proxy,{
   method:'POST',
   headers:{'Content-Type':'application/json',...(adminToken?{'X-Reading-Admin-Token':adminToken}:{})},
   body:JSON.stringify(adminToken?{action:'publish',work:messages}:{action:'chat',provider:state.provider,apiKey:key,model:state.model,max_tokens,messages,enableWebSearch})
  },'proxy');
  return decodeResponse(response,'proxy');
 }
 const body=providerPayload(messages,max_tokens,enableWebSearch);
 const response=await fetchWithExplanation(providers[state.provider].endpoint,{
  method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
  body:JSON.stringify(body)
 },'direct');
 const data=await decodeResponse(response,'direct');
 const message=data?.choices?.[0]?.message?.content;
 const content=typeof message==='string'?message:Array.isArray(message)?message.map(x=>x.text||'').join('\n'):'';
 if(!content.trim())throw Error('模型没有返回有效文本，请检查模型是否支持 Chat Completions。');
 return {provider:state.provider,model:data.model||state.model,text:content,usage:data.usage||null};
}
async function requestModelList(){
 if(!state.apiKey)throw Error('请先填写所选平台的 API Key');
 const proxy=proxyEndpoint();
 let response;
 if(proxy){
  response=await fetchWithExplanation(proxy,{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({action:'models',provider:state.provider,apiKey:state.apiKey})
  },'proxy');
 }else{
  response=await fetchWithExplanation(providers[state.provider].base+'/models',{
   method:'GET',headers:{'Authorization':'Bearer '+state.apiKey},cache:'no-store'
  },'direct');
 }
 const data=await decodeResponse(response,proxy?'proxy':'direct');
 const models=Array.isArray(data.models)?data.models:Array.isArray(data.data)?data.data.map(x=>x.id):[];
 return models.filter(x=>typeof x==='string'&&x.length).sort();
}
function analyseMessages(work,question='',selected=''){
 const source=state.manualText||state.fullText;
 const hasText=source.length>80;
 const system='你是严谨的中文文学细读助手。区分原文证据、解释与猜测，不杜撰作者背景、不伪造原文引句。语言清晰，不采用应试模板或唯一标准答案。回答分成：初读感受、具体文本细节、另一种解读、开放问题四个部分。没有原文时明确声明只能根据用户提供的书目背景作一般性的阅读提示。';
 let user='作品：'+work.title+'；作者：'+work.author+'；体裁：'+work.genre+'；赏析线索：'+work.focus+'。';
 if(hasText)user+='\n下列是可供分析的文本（可能只是片段）：\n'+source.slice(0,14000);
 else user+='\n当前没有核验过的原文，请不要援引所谓原文句子或假装已通读。';
 if(selected)user+='\n请重点讨论用户选中的文字：\n'+selected.slice(0,2500);
 if(question)user+='\n用户的问题：'+question.slice(0,1000);
 else user+='\n请提供多视角、开放式的文学赏析。';
 return[{role:'system',content:system},{role:'user',content:user}];
}
async function runAnalysis(question='',selected=''){
 const w=state.active;if(!w)return;
 openAnalysis();const output=$('analysisBody');const loading='正在向 '+providers[state.provider].label+' 请求赏析……';safeSet(output,loading);$('generateAnalysis').disabled=true;$('askAI').disabled=true;
 try{const result=await requestAI(analyseMessages(w,question,selected),2400);if(state.active?.id===w.id){safeSet(output,result.text);state.analysis=result.text}}
 catch(err){safeSet(output,'请求失败：'+err.message+'\n\n你也可以先从这个方向思考：'+w.focus)}
 finally{$('generateAnalysis').disabled=false;$('askAI').disabled=false}
}
let editingProvider='ustc';
function renderModelChoices(models){
 const list=$('modelSuggestions');list.replaceChildren();
 const choices=[...new Set([...(providers[editingProvider].models||[]),...(models||[])])];
 for(const name of choices){const option=document.createElement('option');option.value=name;list.append(option)}
}
function updateProviderHint(){
 const p=providers[editingProvider];
 safeSet($('providerHint'),p.label+' · OpenAI 兼容 Chat Completions\nPOST '+p.endpoint+'\n'+p.help);
}
function settingsForm(){
 editingProvider=state.provider;
 $('provider').value=editingProvider;
 $('apiKey').value=state.keysByProvider[editingProvider]||'';
 $('modelName').value=state.modelsByProvider[editingProvider]||providers[editingProvider].model;
 $('proxyUrl').value=state.proxy;
 $('storeKey').checked=state.remember;
 renderModelChoices();updateProviderHint();
}
function showSettings(){settingsForm();$('settingsOverlay').classList.remove('hidden');safeSet($('settingsStatus'),'')}
function keepEditingCredentials(){
 state.keysByProvider[editingProvider]=$('apiKey').value.trim();
 state.modelsByProvider[editingProvider]=$('modelName').value.trim()||providers[editingProvider].model;
}
function switchProvider(){
 keepEditingCredentials();
 editingProvider=$('provider').value;
 $('apiKey').value=state.keysByProvider[editingProvider]||'';
 $('modelName').value=state.modelsByProvider[editingProvider]||providers[editingProvider].model;
 renderModelChoices();updateProviderHint();
 safeSet($('settingsStatus'),'已切换为 '+providers[editingProvider].label+'，Key 和模型独立配置。');
}
function applySettings(){
 keepEditingCredentials();
 state.provider=editingProvider;
 state.apiKey=state.keysByProvider[editingProvider];
 state.model=state.modelsByProvider[editingProvider];
 state.proxy=$('proxyUrl').value.trim();
 state.remember=$('storeKey').checked;
 const persist={provider:state.provider,modelsByProvider:state.modelsByProvider,proxy:state.proxy,remember:state.remember};
 if(state.remember)persist.keysByProvider=state.keysByProvider;
 sessionStorage.setItem('wenjian:provider',JSON.stringify(persist));
 safeSet($('settingsStatus'),'设置已应用。'+(state.remember?'Key 仅保存在此标签页的 sessionStorage。':'Key 只保存在当前网页内存中。'));
}
async function discover(){
 const btn=$('discoverBtn');btn.disabled=true;safeSet(btn,'正在生成候选书目……');const area=$('discoverResults');area.replaceChildren();
 try{
 const existing=state.works.slice(0,100).map(w=>w.title+'（'+w.author+'）').join('、');
 const result=await requestAI([
 {role:'system',content:'你是中文文学书目编辑。请只推荐确实存在的真实文学作品，不编造书名、作者、出版信息或网络链接。不要推荐题目。仅输出严格 JSON 数组，元素包含 title、author、genre（小说或散文）、year、region、tags（最多3项）、focus、sourceUrl（可核实的直接来源链接；不确定则留空） 字段。不要在 JSON 之外添加解释。如果无法确信真实存在，减少候选数量。'},
 {role:'user',content:'为文学阅读馆提出 6 篇新的经典小说或散文候选作品，优先中文原作，适合深度细读，不重复以下馆藏：'+existing.slice(0,7000)}
 ],1600,'',true);
 let raw=result.text.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'').trim();
 const match=raw.match(/\[[\s\S]*\]/);if(match)raw=match[0];
 const list=JSON.parse(raw);if(!Array.isArray(list))throw Error('模型没有返回候选数组');
 state.candidates=list.filter(x=>x?.title&&x?.author).slice(0,8).map(x=>({...x,suggestedSourceUrl:x.sourceUrl||'',sourceUrl:'https://zh.wikisource.org/w/index.php?search='+encodeURIComponent(x.title+' '+x.author)}));
 if(!state.candidates.length)throw Error('没有可用候选');
 renderCandidates();
 }catch(err){area.append(textEl('p','发现失败：'+err.message,'muted'))}
 finally{btn.disabled=false;safeSet(btn,'AI 推荐新篇目')}
}
function renderCandidates(){
 const area=$('discoverResults');area.replaceChildren();
 for(const w of state.candidates){
 const d=document.createElement('div');d.className='candidate';d.append(textEl('strong',w.title),textEl('small',w.author+' · '+(w.genre||'待分类')+' · 仅为 AI 推荐，尚未核验'));
 d.append(textEl('p',w.focus||'文学阅读候选'));
 const source=document.createElement('a');source.href=safeLink(w.sourceUrl);source.target='_blank';source.rel='noopener noreferrer';safeSet(source,'查找原始出处 ↗');d.append(source);
 if(w.suggestedSourceUrl&&safeLink(w.suggestedSourceUrl)!=='#'){const suggested=document.createElement('a');suggested.href=safeLink(w.suggestedSourceUrl);suggested.target='_blank';suggested.rel='noopener noreferrer';suggested.style.display='block';safeSet(suggested,'AI 提供的来源（待核验） ↗');d.append(suggested)}
 const field=document.createElement('input');field.type='url';field.value='';field.placeholder='核验后的真实来源 HTTPS 链接';field.style.cssText='width:100%;padding:8px;margin:10px 0;border:1px solid #d8cebf;background:var(--white);color:var(--ink)';
 d.append(field);
 const btn=createBtn('审核后写入 GitHub','ghost',async()=>{
 const url=field.value.trim();if(!url){alert('请先打开来源检索并填写已核验的真实文章来源链接。');return}
 if(!confirm('确认已检查该作品确实存在，且新条目只保存书目信息，不转载未经授权的全文？'))return;
 const password=prompt('输入 Vercel READING_ADMIN_TOKEN 管理员发布口令（不保存）');if(!password)return;
 btn.disabled=true;safeSet(btn,'正在写入……');
 try{
 const published=await requestAI({...w,sourceUrl:url},0,password);
 safeSet(btn,'已入库 · '+published.work.id);btn.disabled=true;await loadCatalog();
 }catch(err){alert('发布失败：'+err.message);btn.disabled=false;safeSet(btn,'审核后写入 GitHub')}
 });
 d.append(btn);area.append(d)
 }
}
function init(){
 localSettings();loadCatalog();
 $('search').addEventListener('input',e=>{state.search=e.target.value;state.visible=24;renderCards()});
 document.querySelectorAll('[data-genre]').forEach(b=>b.addEventListener('click',()=>selectGenre(b.dataset.genre)));
 $('regionFilter').addEventListener('change',e=>{state.region=e.target.value;renderCards()});
 $('loadMore').addEventListener('click',()=>{state.visible+=24;renderCards()});
 $('randomRead').addEventListener('click',()=>{if(state.works.length)openWork(state.works[Math.floor(Math.random()*state.works.length)])});
 $('heroBrowse').addEventListener('click',()=>$('collection').scrollIntoView({behavior:'smooth'}));
 $('libraryNav').addEventListener('click',()=>showSection('library'));$('notesNav').addEventListener('click',()=>showSection('personal'));
 $('settingsNav').addEventListener('click',showSettings);$('settingsClose').addEventListener('click',()=>$('settingsOverlay').classList.add('hidden'));
 $('settingsOverlay').addEventListener('click',e=>{if(e.target===$('settingsOverlay'))$('settingsOverlay').classList.add('hidden')});
 $('provider').addEventListener('change',switchProvider);
 $('saveSettings').addEventListener('click',()=>{applySettings();$('settingsOverlay').classList.add('hidden')});
 $('testAPI').addEventListener('click',async()=>{
  applySettings();safeSet($('settingsStatus'),'正在按照官方 Chat Completions 格式发送测试消息「您好」……');
  $('testAPI').disabled=true;
  try{const res=await requestAI([{role:'user',content:'您好'}],128);safeSet($('settingsStatus'),'连接成功 · '+providers[state.provider].label+' · '+res.model+' · 模型回复：'+res.text.slice(0,100))}
  catch(err){safeSet($('settingsStatus'),'测试失败：'+err.message)}
  finally{$('testAPI').disabled=false}
 });
 $('refreshModels').addEventListener('click',async()=>{
  applySettings();const btn=$('refreshModels');btn.disabled=true;
  safeSet($('settingsStatus'),'正在查询该 Key 可访问的模型列表……');
  try{
   const names=await requestModelList();
   renderModelChoices(names);
   safeSet($('settingsStatus'),names.length?'已取得 '+names.length+' 个可用模型。请从模型名称输入框的候选列表中选择；当前填写的是 '+state.model+'。':'接口已返回，但未提供可解析的模型列表。请使用平台显示的模型 ID。');
  }catch(err){safeSet($('settingsStatus'),'查询失败：'+err.message)}
  finally{btn.disabled=false}
 });
 $('readerClose').addEventListener('click',closeReader);
 $('readerFav').addEventListener('click',()=>{if(state.active)toggleFavorite(state.active.id)});
 $('fontMinus').addEventListener('click',()=>adjustFont(-1));$('fontPlus').addEventListener('click',()=>adjustFont(1));
 $('themeToggle').addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem(keys.theme,document.body.classList.contains('dark')?'dark':'light')});
 $('readerAnalysis').addEventListener('click',openAnalysis);$('analysisClose').addEventListener('click',closeAnalysis);
 $('generateAnalysis').addEventListener('click',()=>runAnalysis());
 $('askAI').addEventListener('click',()=>runAnalysis($('customQuestion').value.trim()));
 $('askSelection').addEventListener('click',()=>{const selected=String(window.getSelection()?.toString()||'').trim();if(!selected){safeSet($('analysisBody'),'先在文章中选中要讨论的文字，然后点击「讨论选中的文字」。');return}runAnalysis('',selected)});
 $('saveNote').addEventListener('click',()=>{if(!state.active)return;const id=state.active.id;state.notes[id]=$('noteText').value.slice(0,20000);saveJSON(keys.notes,state.notes);safeSet($('noteStatus'),'已保存至此浏览器')});
 let lastProgress=0;$('readerScroll').addEventListener('scroll',()=>{if(!state.active||Date.now()-lastProgress<1500)return;lastProgress=Date.now();const el=$('readerScroll');state.progress[state.active.id]=el.scrollTop/Math.max(1,el.scrollHeight-el.clientHeight);saveJSON(keys.progress,state.progress)});
 $('discoverBtn').addEventListener('click',discover);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('settingsOverlay').classList.contains('hidden'))$('settingsOverlay').classList.add('hidden');else if(!$('readerOverlay').classList.contains('hidden'))closeReader()}});
}
function adjustFont(delta){let n=Number(localStorage.getItem(keys.fontsize)||19)+delta;n=Math.max(15,Math.min(29,n));localStorage.setItem(keys.fontsize,String(n));document.documentElement.style.setProperty('--reader-size',n+'px')}
document.addEventListener('DOMContentLoaded',init);
})();