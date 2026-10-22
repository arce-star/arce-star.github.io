(function(){
'use strict';

const BASE_KEY='_arce_crypto_real_practice_v1';
const JOURNAL_KEY='_arce_crypto_real_journal_v1';
const DATA_URL='assets/data/crypto-real-kline-training.json';
const CSS_URL='assets/css/crypto-practice-journal.css';
const SESSION_ID='S'+new Date().toISOString().replace(/\D/g,'').slice(0,14)+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
const SESSION_STARTED_AT=new Date().toISOString();
const MAX_RECORDS=5000;

const $=id=>document.getElementById(id);
const qsa=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=n=>Number.isFinite(n)?n:null;
const parseR=s=>{const m=String(s||'').match(/([+-]?\d+(?:\.\d+)?)R/i);return m?Number(m[1]):null};
const csvCell=v=>{const s=v==null?'':String(v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};

function load(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch(_){return fallback}}
function saveJournal(){journal.records=journal.records.slice(0,MAX_RECORDS);localStorage.setItem(JOURNAL_KEY,JSON.stringify(journal))}
function download(filename,text,type){
  const blob=new Blob([text],{type:type||'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function uidOf(x){return [x.attemptedAt||x.at||'',x.exerciseId||x.id||'',x.direction||''].join('|')}
function dirLabel(v){return v==='long'?'多':v==='short'?'空':v==='skip'?'不做':'—'}
function setupLabel(v){return ({breakout:'突破',pullback:'回调',reversal:'反转',range:'区间',trend:'趋势延续',other:'其他'})[v]||'—'}
function resultLabel(v){return ({win:'盈利',loss:'亏损',nofill:'未成交',amb:'不可判定',flat:'不做'})[v]||v||'—'}
function reviewLabel(v){return ({good:'满意',bad:'有问题',review:'待复盘'})[v]||'—'}

let journal=load(JOURNAL_KEY,{schema:1,records:[]});
if(!Array.isArray(journal.records))journal.records=[];
let payload=null,exerciseMap=new Map(),currentUid=null;

const link=document.createElement('link');link.rel='stylesheet';link.href=CSS_URL;document.head.appendChild(link);

function migrateLegacy(){
  const base=load(BASE_KEY,{history:[]});
  if(!Array.isArray(base.history))return;
  const existing=new Set(journal.records.map(uidOf));
  base.history.slice().reverse().forEach(x=>{
    const rec={
      attemptedAt:x.at||null,exerciseId:x.id||null,symbol:x.symbol||null,direction:x.direction||null,
      result:x.result||null,r:safe(Number(x.r)),sessionId:'legacy',legacy:true,review:null
    };
    if(!existing.has(uidOf(rec))){journal.records.unshift(rec);existing.add(uidOf(rec))}
  });
  saveJournal();
}

function installControls(){
  const toolbar=document.querySelector('.real-toolbar');
  if(toolbar&&!$('journal-export-session')){
    const reset=$('real-reset-ledger');
    const html=`
      <button id="journal-export-session">导出本次 CSV</button>
      <button id="journal-export-all">导出全部 CSV</button>
      <button id="journal-export-json">导出完整 JSON</button>`;
    reset?reset.insertAdjacentHTML('beforebegin',html):toolbar.insertAdjacentHTML('beforeend',html);
    const stats=toolbar.querySelector('.real-stats');
    if(stats)stats.insertAdjacentHTML('beforeend','<span>SESSION <b id="journal-session-count">0</b></span>');
  }

  const level=$('real-level-step');
  if(level&&!$('journal-setup')){
    level.insertAdjacentHTML('afterend',`
      <div class="real-step journal-plan-meta">
        <div class="real-step-title">3 · 给这笔计划留个标签</div>
        <div class="journal-meta-grid">
          <label>SETUP
            <select id="journal-setup">
              <option value="">未标记</option><option value="breakout">突破</option><option value="pullback">回调</option>
              <option value="reversal">反转</option><option value="range">区间</option><option value="trend">趋势延续</option><option value="other">其他</option>
            </select>
          </label>
          <label>信心
            <select id="journal-confidence"><option value="">—</option><option value="1">1 / 5</option><option value="2">2 / 5</option><option value="3">3 / 5</option><option value="4">4 / 5</option><option value="5">5 / 5</option></select>
          </label>
        </div>
        <textarea id="journal-note" rows="2" placeholder="可选：为什么做 / 为什么不做，看到什么结构"></textarea>
      </div>`);
  }

  const result=$('real-result');
  if(result&&!$('journal-review')){
    result.insertAdjacentHTML('afterend',`
      <div id="journal-review" class="journal-review" style="display:none">
        <span>复盘标记：</span>
        <button data-review="good">执行满意</button>
        <button data-review="bad">执行有问题</button>
        <button data-review="review">待复盘</button>
      </div>`);
  }

  const root=document.querySelector('.real-practice');
  if(root&&!$('journal-section')){
    root.insertAdjacentHTML('beforeend',`
      <div id="journal-section" class="journal-section">
        <div class="journal-head">
          <div><h3>训练日志与复盘</h3><p>每一题都保存在当前浏览器；“本次会话”指这次打开页面后的练习。</p></div>
          <div class="journal-filters">
            <select id="journal-scope"><option value="session">本次会话</option><option value="all">全部历史</option></select>
            <select id="journal-result"><option value="ALL">全部结果</option><option value="win">盈利</option><option value="loss">亏损</option><option value="nofill">未成交</option><option value="amb">不可判定</option><option value="flat">不做</option></select>
          </div>
        </div>
        <div id="journal-analysis" class="journal-analysis"></div>
        <div class="journal-table-wrap">
          <table><thead><tr><th>时间</th><th>标的</th><th>方向</th><th>Setup</th><th>R:R</th><th>结果</th><th>R</th><th>MFE</th><th>MAE</th><th>复盘</th></tr></thead>
          <tbody id="journal-body"></tbody></table>
        </div>
      </div>`);
  }
}

function resetMeta(){
  if($('journal-setup'))$('journal-setup').value='';
  if($('journal-confidence'))$('journal-confidence').value='';
  if($('journal-note'))$('journal-note').value='';
  currentUid=null;
  if($('journal-review'))$('journal-review').style.display='none';
  qsa('#journal-review button').forEach(b=>b.classList.remove('active'));
}

function extractResultMetrics(){
  const vals={};
  qsa('#real-result .result-metric').forEach(el=>{
    const key=el.querySelector('span')?.textContent.trim(),value=el.querySelector('b')?.textContent.trim();
    if(key)vals[key]=value;
  });
  return {
    r:parseR(vals.RESULT),
    mfe:parseR(vals.MFE),
    mae:parseR(vals.MAE),
    fillBar:vals['FILL BAR']&&vals['FILL BAR']!=='—'?Number(vals['FILL BAR'].replace('+','')):null
  };
}
function currentBaseRecord(){
  const base=load(BASE_KEY,{history:[]});
  return Array.isArray(base.history)&&base.history.length?base.history[0]:null;
}
function enrichAfterSubmit(){
  const base=currentBaseRecord();if(!base)return;
  const ex=exerciseMap.get(base.id),metrics=extractResultMetrics();
  const entry=Number($('real-entry')?.value),stop=Number($('real-stop')?.value),target=Number($('real-target')?.value);
  const isTrade=base.direction!=='skip',risk=isTrade?Math.abs(entry-stop):null;
  const rr=isTrade&&risk>0?Math.abs(target-entry)/risk:null;
  const rec={
    attemptedAt:base.at||new Date().toISOString(),sessionId:SESSION_ID,sessionStartedAt:SESSION_STARTED_AT,
    exerciseId:base.id,symbol:base.symbol,interval:ex?.interval||payload?.interval||'15m',
    visibleStart:ex?.bars?.[0]?.[0]||null,
    decisionBarTime:ex?.bars?.[ex.visible_count-1]?.[0]||null,
    futureEnd:ex?.bars?.[ex.bars.length-1]?.[0]||null,
    direction:base.direction,setup:$('journal-setup')?.value||null,
    confidence:$('journal-confidence')?.value?Number($('journal-confidence').value):null,
    note:$('journal-note')?.value.trim()||null,
    entry:isTrade&&Number.isFinite(entry)?entry:null,stop:isTrade&&Number.isFinite(stop)?stop:null,target:isTrade&&Number.isFinite(target)?target:null,
    plannedRR:safe(rr),result:base.result,r:safe(Number.isFinite(metrics.r)?metrics.r:Number(base.r)),
    mfe:safe(metrics.mfe),mae:safe(metrics.mae),fillBar:metrics.fillBar,review:null
  };
  rec.uid=uidOf(rec);
  const idx=journal.records.findIndex(x=>uidOf(x)===rec.uid);
  if(idx>=0)journal.records[idx]=Object.assign({},journal.records[idx],rec);
  else journal.records.unshift(rec);
  currentUid=rec.uid;saveJournal();
  if($('journal-review'))$('journal-review').style.display='flex';
  render();
}
function syncCurrentMeta(){
  if(!currentUid)return;
  const rec=journal.records.find(x=>uidOf(x)===currentUid);if(!rec)return;
  rec.setup=$('journal-setup')?.value||null;
  rec.confidence=$('journal-confidence')?.value?Number($('journal-confidence').value):null;
  rec.note=$('journal-note')?.value.trim()||null;
  saveJournal();render();
}
function setReview(v){
  if(!currentUid)return;
  syncCurrentMeta();
  const rec=journal.records.find(x=>uidOf(x)===currentUid);if(!rec)return;
  rec.review=v;qsa('#journal-review button').forEach(b=>b.classList.toggle('active',b.dataset.review===v));
  saveJournal();render();
}

function avg(rows,key){const a=rows.map(x=>Number(x[key])).filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null}
function scored(rows){return rows.filter(x=>x.direction!=='skip'&&Number.isFinite(Number(x.r)))}
function group(rows,key){
  const m={};scored(rows).forEach(r=>{const k=r[key]||'未标记';(m[k]||(m[k]=[])).push(r)});
  return Object.entries(m).map(([key,a])=>({key,n:a.length,avgR:avg(a,'r')}));
}
function filteredRows(){
  const scope=$('journal-scope')?.value||'session',result=$('journal-result')?.value||'ALL';
  let rows=scope==='session'?journal.records.filter(x=>x.sessionId===SESSION_ID):journal.records.slice();
  if(result!=='ALL')rows=rows.filter(x=>x.result===result);
  return rows;
}
function renderAnalysis(rows){
  const el=$('journal-analysis');if(!el)return;
  if(!rows.length){el.innerHTML='<div class="journal-empty">还没有符合条件的训练记录。</div>';return}
  const t=scored(rows),wins=t.filter(x=>Number(x.r)>0),loss=t.filter(x=>Number(x.r)<0);
  const ar=avg(t,'r'),mfe=avg(t,'mfe'),mae=avg(t,'mae'),bad=rows.filter(x=>x.review==='bad').length;
  const setups=group(rows,'setup').filter(x=>x.key!=='未标记'&&x.n>=2);
  const symbols=group(rows,'symbol').filter(x=>x.n>=2);
  const best=setups.slice().sort((a,b)=>b.avgR-a.avgR)[0],weak=setups.slice().sort((a,b)=>a.avgR-b.avgR)[0],bestSym=symbols.slice().sort((a,b)=>b.avgR-a.avgR)[0];
  const giveback=loss.filter(x=>Number.isFinite(Number(x.mfe))&&Number(x.mfe)>=1).length;
  const notes=[];
  if(best)notes.push('表现较好 Setup：'+setupLabel(best.key)+'，'+best.n+' 笔，平均 '+best.avgR.toFixed(2)+'R');
  if(weak&&(!best||weak.key!==best.key))notes.push('需要重点复盘：'+setupLabel(weak.key)+'，'+weak.n+' 笔，平均 '+weak.avgR.toFixed(2)+'R');
  if(bestSym)notes.push('当前表现较好的标的：'+bestSym.key+'，平均 '+bestSym.avgR.toFixed(2)+'R');
  if(giveback)notes.push(giveback+' 笔亏损在止损前曾达到 ≥1R MFE，可重点检查止盈、移动止损或目标设置');
  el.innerHTML=`<div class="journal-cards">
    <div><span>已评分交易</span><b>${t.length}</b></div>
    <div><span>胜率</span><b>${t.length?(wins.length/t.length*100).toFixed(1)+'%':'—'}</b></div>
    <div><span>平均 R</span><b>${Number.isFinite(ar)?ar.toFixed(2)+'R':'—'}</b></div>
    <div><span>平均 MFE / MAE</span><b>${Number.isFinite(mfe)?mfe.toFixed(2):'—'} / ${Number.isFinite(mae)?mae.toFixed(2):'—'}</b></div>
    <div><span>自评有问题</span><b>${bad}</b></div>
  </div>${notes.length?'<ul>'+notes.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<div class="journal-empty">样本还少；多做几笔后这里会按 Setup、标的和 MFE/MAE 给出复盘线索。</div>'}`;
}
function render(){
  const rows=filteredRows();renderAnalysis(rows);
  const body=$('journal-body');if(body)body.innerHTML=rows.slice(0,100).map(r=>`<tr>
    <td>${esc((r.attemptedAt||r.at||'').replace('T',' ').slice(0,16))}</td><td>${esc(r.symbol||'—')}</td><td>${esc(dirLabel(r.direction))}</td>
    <td>${esc(setupLabel(r.setup))}</td><td>${Number.isFinite(Number(r.plannedRR))?Number(r.plannedRR).toFixed(2):'—'}</td><td>${esc(resultLabel(r.result))}</td>
    <td>${Number.isFinite(Number(r.r))?(Number(r.r)>=0?'+':'')+Number(r.r).toFixed(2):'—'}</td><td>${Number.isFinite(Number(r.mfe))?Number(r.mfe).toFixed(2):'—'}</td>
    <td>${Number.isFinite(Number(r.mae))?Number(r.mae).toFixed(2):'—'}</td><td>${esc(reviewLabel(r.review))}</td></tr>`).join('')||'<tr><td colspan="10" class="journal-empty-row">暂无记录</td></tr>';
  if($('journal-session-count'))$('journal-session-count').textContent=journal.records.filter(x=>x.sessionId===SESSION_ID).length;
}
function toCsv(rows){
  const cols=[['attempted_at','attemptedAt'],['session_id','sessionId'],['exercise_id','exerciseId'],['symbol','symbol'],['interval','interval'],
  ['visible_start','visibleStart'],['decision_bar_time','decisionBarTime'],['future_end','futureEnd'],['direction','direction'],['setup','setup'],['confidence','confidence'],
  ['note','note'],['entry','entry'],['stop','stop'],['target','target'],['planned_rr','plannedRR'],['result','result'],['r','r'],['mfe','mfe'],['mae','mae'],['fill_bar','fillBar'],['review','review']];
  return [cols.map(x=>x[0]).join(','),...rows.map(r=>cols.map(x=>csvCell(r[x[1]])).join(','))].join('\n');
}
function exportCsv(scope){
  const rows=scope==='session'?journal.records.filter(x=>x.sessionId===SESSION_ID):journal.records;
  if(!rows.length){alert('还没有可导出的记录。');return}
  download('crypto-training-'+scope+'-'+new Date().toISOString().slice(0,10)+'.csv','\ufeff'+toCsv(rows),'text/csv;charset=utf-8');
}
function exportJson(){
  if(!journal.records.length){alert('还没有可导出的记录。');return}
  const used=[...new Set(journal.records.map(x=>x.exerciseId).filter(Boolean))],snapshots={};
  used.forEach(id=>{const ex=exerciseMap.get(id);if(ex)snapshots[id]={symbol:ex.symbol,interval:ex.interval,visibleCount:ex.visible_count,futureCount:ex.future_count,bars:ex.bars}});
  download('crypto-training-full-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({
    schema:1,exportedAt:new Date().toISOString(),sessionId:SESSION_ID,records:journal.records,marketSnapshots:snapshots
  },null,2),'application/json;charset=utf-8');
}

migrateLegacy();
installControls();
render();

$('real-submit')?.addEventListener('click',()=>setTimeout(enrichAfterSubmit,0));
['real-next','real-random'].forEach(id=>$(id)?.addEventListener('click',()=>setTimeout(resetMeta,0)));
$('real-symbol-filter')?.addEventListener('change',()=>setTimeout(resetMeta,0));
$('journal-export-session')?.addEventListener('click',()=>exportCsv('session'));
$('journal-export-all')?.addEventListener('click',()=>exportCsv('all'));
$('journal-export-json')?.addEventListener('click',exportJson);
$('journal-scope')?.addEventListener('change',render);
$('journal-result')?.addEventListener('change',render);
qsa('#journal-review button').forEach(b=>b.addEventListener('click',()=>setReview(b.dataset.review)));
$('journal-setup')?.addEventListener('change',syncCurrentMeta);
$('journal-confidence')?.addEventListener('change',syncCurrentMeta);
$('journal-note')?.addEventListener('input',syncCurrentMeta);
$('real-reset-ledger')?.addEventListener('click',()=>setTimeout(()=>{
  journal={schema:1,records:[]};saveJournal();resetMeta();render();
},0));

fetch(DATA_URL,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error('HTTP '+r.status))).then(data=>{
  payload=data;exerciseMap=new Map((data.exercises||[]).map(x=>[x.id,x]));render();
}).catch(()=>{});
})();
