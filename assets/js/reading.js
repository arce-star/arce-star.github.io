(()=>{
'use strict';
const $ = id => document.getElementById(id);
const keys={favs:'wenjian:favs',notes:'wenjian:notes',progress:'wenjian:progress',theme:'wenjian:theme',fontsize:'wenjian:fontsize'};
const getJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const saveJSON=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const state={works:[],fulltexts:{},filtered:[],visible:24,genre:'全部',topic:'',region:'',search:'',active:null,provider:'ustc',apiKey:'',model:'deepseek-v4-flash',proxy:'',remember:false,analysis:'',favs:new Set(getJSON(keys.favs,[])),notes:getJSON(keys.notes,{}),progress:getJSON(keys.progress,{}),manualText:'',fullText:'',candidates:[],activeSection:'library'};
const providers={
 ustc:{label:'USTC LLM',endpoint:'https://api.llm.ustc.edu.cn/v1/chat/completions',model:'deepseek-v4-flash',help:'学校平台：OpenAI 兼容的 /v1/chat/completions；请根据学校模型列表选择有权限调用的模型。'},
 deepseek:{label:'DeepSeek 官方',endpoint:'https://api.deepseek.com/chat/completions',model:'deepseek-flash',help:'DeepSeek 官方：/chat/completions，当前模型 deepseek-flash、deepseek-v4-pro；发现文章时支持官方联网搜索工具。'}
};
const esc = x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeSet(node,value){node.textContent=String(value??'')}
function safeLink(href){try{const u=new URL(href);return u.protocol==='https:'?u.href:'#'}catch{return '#'}}
function textEl(tag,text,cls){const node=document.createElement(tag);if(cls)node.className=cls;safeSet(node,text);return node}
function createBtn(text,cls,handler){const btn=document.createElement('button');btn.type='button';btn.className=cls||'';safeSet(btn,text);btn.addEventListener('click',handler);return btn}
function localSettings(){
 try{const opt=JSON.parse(sessionStorage.getItem('wenjian:provider')||'null');if(opt&&providers[opt.provider]){state.provider=opt.provider;state.model=opt.model||providers[opt.provider].model;state.proxy=opt.proxy||'';state.remember=!!opt.remember;state.apiKey=state.remember?String(opt.apiKey||''):''}}catch{}
 const font=Number(localStorage.getItem(keys.fontsize)||19);document.documentElement.style.setProperty('--reader-size',Math.max(15,Math.min(font,29))+'px');
 if(localStorage.getItem(keys.theme)==='dark')document.body.classList.add('dark');
 }
function setStatus(text){safeSet($('catalogStatus'),text)}
async function loadCatalog(){
 try{
 const [res,textRes]=await Promise.all([
  fetch('assets/data/reading/catalog.json?v=2',{cache:'no-cache'}),
  fetch('assets/data/reading/fulltext.json?v=2',{cache:'no-cache'})
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
 if(state.region&&(state.region==='other'?w.region==='中国':w.region!==state.region))return false;
 return !query||[w.title,w.author,w.region,...(w.tags||[])].some(s=>String(s||'').toLowerCase().includes(query))
 });
 const area=$('cards');area.replaceChildren();
 state.filtered.slice(0,state.visible).forEach((w,index)=>{
 const card=document.createElement('article');card.className='workcard';card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','阅读 '+w.title);
 const genre=textEl('div',w.genre+' · '+w.region,'genre');const title=textEl('h3',w.title);const byline=textEl('div',w.author+' · '+w.year,'byline');
 const focus=textEl('p',w.focus,'focus');const bottom=document.createElement('div');bottom.className='bottom';
 bottom.append(textEl('span',state.fulltexts[w.id]?'全文已收录':'来源阅读 / 赏析参考'));
 const fav=createBtn(state.favs.has(w.id)?'♥':'♡','favbtn',e=>{e.stopPropagation();toggleFavorite(w.id);renderCards()});fav.title='收藏';fav.setAttribute('aria-label','收藏 '+w.title);bottom.append(fav);
 card.append(genre,title,byline,focus,bottom);
 card.addEventListener('click',()=>openWork(w));card.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openWork(w)}});area.append(card);
 });
 $('loadMore').classList.toggle('hidden',state.filtered.length<=state.visible);
 setStatus('显示 '+Math.min(state.visible,state.filtered.length)+' / '+state.filtered.length+' 篇 · 全馆 '+state.works.length+' 篇 · 本地全文 '+Object.keys(state.fulltexts).length+' 篇 · 其余作品保留来源入口');
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
function closeReader(){
 $('readerOverlay').classList.add('hidden');$('analysisPanel').classList.add('hidden');document.body.style.overflow='';document.title='文间 · 文学阅读与赏析馆';state.active=null;state.manualText='';state.fullText='';renderCards();
}
async function openWork(w){
 state.active=w;state.fullText='';state.manualText='';state.analysis='';
 safeSet($('readerTitle'),w.title);safeSet($('readerMeta'),w.author+' · '+w.year+' · '+w.genre+' · '+w.region);
 const tags=$('readerTags');tags.replaceChildren();(w.tags||[]).slice(0,4).forEach(t=>tags.append(textEl('span',t)));
 safeSet($('readerFav'),state.favs.has(w.id)?'♥ 已收藏':'♡ 收藏');safeSet($('noteText'),state.notes[w.id]||'');safeSet($('noteStatus'),'');
 const source=$('sourceFoot');source.replaceChildren();
 source.append(textEl('p','收录说明：'+(w.rightsStatus||'待核验')+'。本馆不将外部来源或模型生成文本冒充为原著。'));
 const src=document.createElement('a');src.href=safeLink(w.sourceUrl);src.target='_blank';src.rel='noopener noreferrer';safeSet(src,'查阅原始来源 / 检索版本 ↗');source.append(src);
 $('readerOverlay').classList.remove('hidden');$('analysisPanel').classList.add('hidden');document.body.style.overflow='hidden';document.title=w.title+' · 文间';
 const body=$('readerContent');body.replaceChildren();body.append(textEl('p','正在核验公开文本来源……','muted'));
 safeSet($('analysisBody'),'赏析方向：\n\n'+w.focus+'\n\n可从原文细节出发，结合叙事视角、语言、人物关系与时代语境进行多种解读。');
 $('readerScroll').scrollTop=0;
 const localText=state.fulltexts[w.id];
 if(localText){
  body.replaceChildren();
  localText.content.split(/\\n\\s*\\n/).map(p=>p.trim()).filter(Boolean).forEach(p=>body.append(textEl('p',p)));
  state.fullText=localText.content;
  source.append(textEl('p','全文已随网站数据保存在 GitHub 仓库中，可直接阅读，不依赖来源网站在线。'));
  source.append(textEl('p',localText.attribution||('作者：'+localText.author+'；作品：'+localText.title+'；来源：维基文库。')));
  source.append(textEl('p',localText.license||'页面文本按来源页许可与作品公有领域标注使用。'));
  if(localText.editionNote)source.append(textEl('p','版本说明：'+localText.editionNote));
 }else{
  await loadWorkText(w);
 }
 if(state.active?.id!==w.id)return;
 if(state.progress[w.id]){const s=$('readerScroll');requestAnimationFrame(()=>{s.scrollTop=Math.max(0,(s.scrollHeight-s.clientHeight)*Math.min(1,state.progress[w.id]))})}
}
const eligibleAuthor=new Set(['鲁迅','朱自清','郁达夫','老舍','萧红','许地山','周作人','徐志摩','林徽因','梁遇春']);
function externalReader(w,reason){
 const node=$('readerContent');node.replaceChildren();const d=document.createElement('div');d.className='external';
 d.append(textEl('h3','阅读原文 · '+w.title));
 d.append(textEl('p',reason||'这篇作品的在线全文尚未经过版权、版本或来源核验。你可以通过下方链接查找合法阅读版本。'));
 const a=document.createElement('a');a.href=safeLink(w.sourceUrl);a.target='_blank';a.rel='noopener noreferrer';safeSet(a,'前往作品来源 / 检索页面 ↗');d.append(a);
 d.append(textEl('h4','已有的赏析线索'));
 d.append(textEl('p',w.focus));
 d.append(textEl('h4','使用自己的文本进行赏析'));
 d.append(textEl('p','如果你持有合法获取的文本，可粘贴需要讨论的片段，仅用于本次 AI 请求，不会自动发布到网站。'));
 const paste=document.createElement('textarea');paste.rows=8;paste.style.cssText='display:block;width:100%;margin:12px 0;padding:12px;border:1px solid #d5c8b8;line-height:1.8;background:var(--white);color:var(--ink)';paste.placeholder='在这里粘贴文章片段（建议不超过 12000 字）……';
 const btn=createBtn('使用这段文字进行赏析','primary',()=>{state.manualText=paste.value.trim().slice(0,12000);safeSet($('analysisBody'),state.manualText?'已加载本次粘贴的文本片段。可点击「用 AI 深入赏析」。':'请先粘贴文本。');openAnalysis()});
 d.append(paste,btn);node.append(d)
}
async function loadWorkText(w){
 if(w.textMode!=='remote'||!eligibleAuthor.has(w.author)||w.title.includes('节选')){externalReader(w,'这篇作品目前尚未收录经过核验的本地全文。这里保留作品来源和赏析方向；后续确认文本版本及展示权利后再加入馆藏。');return}
 try{
 const wikiTitle=w.sourcePage||w.title;const url='https://zh.wikisource.org/w/api.php?action=parse&format=json&formatversion=2&prop=text&page='+encodeURIComponent(wikiTitle)+'&origin=*';
 const response=await fetch(url,{mode:'cors',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('来源无法访问');const data=await response.json();
 if(!data.parse?.text||!data.parse?.title)throw Error('来源没有返回正文');
 const parsed=new DOMParser().parseFromString(data.parse.text,'text/html');
 const visibleMeta=(parsed.body?.textContent||'').slice(0,2400);
 if(!data.parse.title.includes(w.title.replace(/（节选）/g,''))||!visibleMeta.includes(w.author))throw Error('原文标题或作者无法核对');
 parsed.querySelectorAll('script,style,nav,aside,table,.mw-editsection,.reference,.noprint,.metadata,.catlinks,.ws-noexport,.mw-cite-backlink').forEach(n=>n.remove());
 const container=parsed.querySelector('.mw-parser-output')||parsed.body;
 const paragraphEls=[...container.querySelectorAll('p')];
 const paras=paragraphEls.map(p=>p.textContent.replace(/\s+/g,' ').trim()).filter(s=>s.length>14&&!/^(本页|此文|作品|作者|维基文库)/.test(s));
 const long=paras.join('\n\n');if(long.length<200)throw Error('没有可确认的完整正文');
 if(state.active?.id!==w.id)return;
 const body=$('readerContent');body.replaceChildren();paras.slice(0,500).forEach(p=>body.append(textEl('p',p)));
 state.fullText=long.slice(0,60000);
 const actual='https://zh.wikisource.org/wiki/'+encodeURIComponent(data.parse.title);
 const src=$('sourceFoot').querySelector('a');if(src)src.href=actual;
 $('sourceFoot').append(textEl('p','在线文本来自维基文库《'+data.parse.title+'》。请核对作者与版本；网页自动抓取的内容可能存在目录、注释或缺失。','muted'));
 }catch(err){if(state.active?.id!==w.id)return;externalReader(w,'暂无法可靠加载作品原文（'+err.message+'）。可通过来源链接查找阅读版本，或粘贴你合法取得的片段进行赏析。')}
}
function openAnalysis(){$('analysisPanel').classList.remove('hidden')}
function closeAnalysis(){$('analysisPanel').classList.add('hidden')}
function proxyEndpoint(){
 const raw=state.proxy.trim();
 if(!raw){if(location.hostname.endsWith('github.io'))throw Error('GitHub Pages 不提供后端接口。请在「API 设置」填写你实际部署的 Vercel /api/reading 完整地址。');return '/api/reading'}
 if(raw==='/api/reading'&&!location.hostname.endsWith('github.io'))return raw;
 const url=new URL(raw,location.href);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('代理地址必须使用 HTTPS');return url.href
}
async function requestAI(messages,max_tokens=1800,adminToken='',enableWebSearch=false){
 const url=proxyEndpoint();if(!state.apiKey&&!adminToken)throw Error('请在 API 设置中填写 Key');
 const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(adminToken?{'X-Reading-Admin-Token':adminToken}:{})},body:JSON.stringify(adminToken?{action:'publish',work:messages}:{action:'chat',provider:state.provider,apiKey:state.apiKey,model:state.model,max_tokens,messages,enableWebSearch})});
 const data=await res.json().catch(()=>({error:'后端未返回 JSON'}));if(!res.ok)throw Error(data.error||'HTTP '+res.status);return data;
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
function settingsForm(){
 $('provider').value=state.provider;$('apiKey').value=state.apiKey;$('modelName').value=state.model;$('proxyUrl').value=state.proxy;$('storeKey').checked=state.remember;
 safeSet($('providerHint'),providers[state.provider].label+'\n官方接口：'+providers[state.provider].endpoint+'\n'+providers[state.provider].help);
}
function showSettings(){settingsForm();$('settingsOverlay').classList.remove('hidden');safeSet($('settingsStatus'),'')}
function applySettings(){
 state.provider=$('provider').value;state.apiKey=$('apiKey').value.trim();state.model=$('modelName').value.trim()||providers[state.provider].model;state.proxy=$('proxyUrl').value.trim();state.remember=$('storeKey').checked;
 const persist={provider:state.provider,model:state.model,proxy:state.proxy,remember:state.remember};
 if(state.remember)persist.apiKey=state.apiKey;
 sessionStorage.setItem('wenjian:provider',JSON.stringify(persist));
 safeSet($('settingsStatus'),'设置已应用。'+(state.remember?'密钥将仅保留在此标签页会话中。':'密钥仅在当前网页内存中使用。'))
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
 $('provider').addEventListener('change',()=>{const provider=$('provider').value;$('modelName').value=providers[provider].model;safeSet($('providerHint'),providers[provider].label+'\n官方接口：'+providers[provider].endpoint+'\n'+providers[provider].help)});
 $('saveSettings').addEventListener('click',()=>{applySettings();$('settingsOverlay').classList.add('hidden')});
 $('testAPI').addEventListener('click',async()=>{applySettings();safeSet($('settingsStatus'),'正在测试接口……');$('testAPI').disabled=true;try{const res=await requestAI([{role:'user',content:'请只回复：连接成功'}],100);safeSet($('settingsStatus'),'已连接：'+providers[state.provider].label+' · '+res.model+' · '+res.text.slice(0,80))}catch(e){safeSet($('settingsStatus'),'测试失败：'+e.message)}finally{$('testAPI').disabled=false}});
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