(function(){
'use strict';

const DATA_URL='assets/data/crypto-real-kline-training.json';
const STORE_KEY='_arce_crypto_real_practice_v1';
const STYLE_URL='assets/css/crypto-real-practice.css';

function $(id){return document.getElementById(id)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function num(x,d=2){return Number.isFinite(x)?x.toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}):'—'}
function pct(x,d=2){return Number.isFinite(x)?(x>=0?'+':'')+x.toFixed(d)+'%':'—'}
function priceDigits(v){if(v<1)return 5;if(v<10)return 4;if(v<100)return 3;return 2}
function price(v){return Number.isFinite(v)?v.toFixed(priceDigits(Math.abs(v))):'—'}
function loadLedger(){try{return JSON.parse(localStorage.getItem(STORE_KEY)||'{}')}catch(_){return {}}}
function saveLedger(x){localStorage.setItem(STORE_KEY,JSON.stringify(x))}

if(!document.querySelector('link[href="'+STYLE_URL+'"]')){
  const link=document.createElement('link');link.rel='stylesheet';link.href=STYLE_URL;document.head.appendChild(link);
}

const section=document.createElement('section');
section.className='real-practice';section.id='crypto-real-practice';
section.innerHTML=`
  <div class="real-head">
    <div><h2>真实加密行情盲测</h2><p>真实 Binance Spot 15 分钟历史 K 线。右侧未来 20 根在提交前完全隐藏。先做交易计划，再揭晓真实后续走势；不预设“标准多空答案”。</p></div>
    <a class="real-source" href="https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md" target="_blank" rel="noopener">BINANCE PUBLIC KLINES ↗</a>
  </div>
  <div class="real-toolbar">
    <label style="font-size:11px;color:#777">标的</label>
    <select id="real-symbol-filter"><option value="ALL">全部</option><option>BTCUSDT</option><option>ETHUSDT</option><option>SOLUSDT</option><option>BNBUSDT</option><option>DOGEUSDT</option></select>
    <button id="real-random">随机换题</button>
    <button id="real-reset-ledger">清空训练记录</button>
    <div class="real-stats"><span>ATTEMPTS <b id="real-attempts">0</b></span><span>TRADES <b id="real-trades">0</b></span><span>TOTAL R <b id="real-total-r">0.00</b></span></div>
  </div>
  <div id="real-loading" class="real-loading">正在载入真实历史 K 线…</div>
  <div id="real-content" class="real-body" style="display:none">
    <div class="real-chart-pane">
      <div class="real-chart-meta">
        <div class="real-symbol" id="real-symbol">— <small>15m · 日期提交后显示</small></div>
        <div class="real-current">LAST <b id="real-last-price">—</b></div>
      </div>
      <div class="real-canvas-wrap"><canvas id="real-kline-canvas" width="980" height="470"></canvas></div>
      <div class="real-help"><span>先看左侧 60 根；右侧 20 根未来被锁住。</span><span>快捷键：L 多 / S 空 / X 不做 · E Entry / D Stop / G Target · N 下一题</span></div>
    </div>
    <aside class="real-panel">
      <div class="real-step">
        <div class="real-step-title">1 · 你准备怎么做？</div>
        <div class="real-direction"><button data-dir="long">做多</button><button data-dir="short">做空</button><button data-dir="skip">不做</button></div>
      </div>
      <div class="real-step" id="real-level-step">
        <div class="real-step-title">2 · 先定计划，再看未来</div>
        <div class="level-tools"><button data-tool="entry" class="active">Entry</button><button data-tool="stop">Stop</button><button data-tool="target">Target</button></div>
        <div class="level-grid">
          <div class="level-input"><label>ENTRY</label><input id="real-entry" type="number" step="any" placeholder="点图或输入"></div>
          <div class="level-input"><label>STOP</label><input id="real-stop" type="number" step="any" placeholder="点图或输入"></div>
          <div class="level-input wide"><label>TARGET</label><input id="real-target" type="number" step="any" placeholder="点图或输入"></div>
        </div>
        <div id="real-plan-check" class="real-plan-check">在图上点击价格位置即可写入当前选中的水平线。</div>
      </div>
      <div class="real-step">
        <div class="real-actions"><button class="primary" id="real-submit" disabled>提交并揭晓未来</button><button id="real-next" disabled>下一题</button></div>
        <div id="real-result" class="real-result"></div>
        <div class="real-ledger">评分只依据你自己设定的 Entry / Stop / Target 和真实后续走势。<strong>同一根 15m K 线同时碰到 Stop 与 Target 时记为顺序不可判定，不强行打分。</strong></div>
      </div>
    </aside>
  </div>
  <div id="real-error" class="real-error" style="display:none"></div>
`;

const anchor=document.getElementById('compare') || document.getElementById('calculator') || document.querySelector('footer');
if(anchor){anchor.insertAdjacentElement(anchor.id==='compare'?'afterend':'beforebegin',section)}else{document.querySelector('main')?.appendChild(section)}
const jump=document.querySelector('.jump');
if(jump&&!jump.querySelector('a[href="#crypto-real-practice"]')){
  const a=document.createElement('a');a.href='#crypto-real-practice';a.textContent='真实行情盲测';
  const calc=jump.querySelector('a[href="#calculator"]');calc?jump.insertBefore(a,calc):jump.appendChild(a);
}

let payload=null, pool=[], current=null, revealed=false, direction=null, tool='entry';
let levels={entry:null,stop:null,target:null};
let scaleState=null,lastExerciseId=null;
let ledger=Object.assign({attempts:0,trades:0,totalR:0,history:[]},loadLedger());

function updateStats(){
  $('real-attempts').textContent=ledger.attempts||0;
  $('real-trades').textContent=ledger.trades||0;
  $('real-total-r').textContent=(ledger.totalR||0).toFixed(2);
}
function filteredPool(){
  const f=$('real-symbol-filter').value;
  return f==='ALL'?pool:pool.filter(x=>x.symbol===f);
}
function chooseExercise(){
  const arr=filteredPool();if(!arr.length)return;
  let candidates=arr.filter(x=>x.id!==lastExerciseId);if(!candidates.length)candidates=arr;
  current=candidates[Math.floor(Math.random()*candidates.length)];lastExerciseId=current.id;
  revealed=false;direction=null;tool='entry';levels={entry:null,stop:null,target:null};
  qsa('.real-direction button').forEach(b=>b.classList.remove('active'));
  qsa('.level-tools button').forEach(b=>b.classList.toggle('active',b.dataset.tool==='entry'));
  ['real-entry','real-stop','real-target'].forEach(id=>$(id).value='');
  $('real-result').className='real-result';$('real-result').innerHTML='';
  $('real-submit').disabled=true;$('real-next').disabled=true;
  $('real-level-step').style.opacity='1';
  $('real-symbol').innerHTML=esc(current.symbol)+' <small>15m · 日期提交后显示</small>';
  const visible=current.bars.slice(0,current.visible_count);const last=visible[visible.length-1];
  $('real-last-price').textContent=price(last[4]);
  validatePlan();drawChart();
}
function qsa(sel,root){return Array.from((root||document).querySelectorAll(sel))}

function getValues(){
  const e=parseFloat($('real-entry').value),s=parseFloat($('real-stop').value),t=parseFloat($('real-target').value);
  return {entry:e,stop:s,target:t};
}
function validatePlan(){
  const box=$('real-plan-check');
  if(direction==='skip'){
    box.textContent='选择不做：提交后只揭晓未来波动，不计算交易 R。';box.className='real-plan-check good';$('real-submit').disabled=false;$('real-level-step').style.opacity='.45';return true;
  }
  $('real-level-step').style.opacity='1';
  if(!direction){box.textContent='先选择做多、做空或不做。';box.className='real-plan-check';$('real-submit').disabled=true;return false}
  const v=getValues();levels=v;
  if(![v.entry,v.stop,v.target].every(Number.isFinite)){
    box.textContent='需要先设 Entry、Stop、Target 三个价格。';box.className='real-plan-check';$('real-submit').disabled=true;return false;
  }
  const valid=direction==='long'?(v.stop<v.entry&&v.entry<v.target):(v.target<v.entry&&v.entry<v.stop);
  if(!valid){box.textContent=direction==='long'?'做多结构应为 Stop < Entry < Target。':'做空结构应为 Target < Entry < Stop。';box.className='real-plan-check bad';$('real-submit').disabled=true;return false}
  const risk=Math.abs(v.entry-v.stop),reward=Math.abs(v.target-v.entry),rr=reward/risk;
  box.textContent='计划有效 · Reward/Risk = '+rr.toFixed(2)+':1';box.className='real-plan-check '+(rr>=1?'good':'bad');$('real-submit').disabled=false;return true;
}

function computeScale(bars){
  const highs=bars.map(b=>b[2]),lows=bars.map(b=>b[3]);let hi=Math.max(...highs),lo=Math.min(...lows);const pad=(hi-lo)*.08||Math.abs(hi)*.01||1;hi+=pad;lo-=pad;
  const top=28,bottom=348,left=58,right=950;
  return {hi,lo,top,bottom,left,right,y:p=>bottom-(p-lo)/(hi-lo)*(bottom-top),p:y=>lo+(bottom-y)/(bottom-top)*(hi-lo)};
}
function drawCandle(ctx,x,w,b,sy,future){
  const o=b[1],h=b[2],l=b[3],c=b[4],up=c>=o;
  const color=up?'#202020':'#8a8a84';ctx.strokeStyle=color;ctx.fillStyle=up?'#202020':'#fff';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x,sy(h));ctx.lineTo(x,sy(l));ctx.stroke();
  const yo=sy(o),yc=sy(c),top=Math.min(yo,yc),height=Math.max(1,Math.abs(yc-yo));ctx.fillRect(x-w/2,top,w,height);ctx.strokeRect(x-w/2,top,w,height);
  if(future){ctx.save();ctx.globalAlpha=.82;ctx.fillStyle=up?'#1f6f4a':'#9f342e';ctx.fillRect(x-w/2,top,w,height);ctx.restore()}
}
function drawHLine(ctx,y,labelText,color){
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.setLineDash([6,4]);ctx.beginPath();ctx.moveTo(scaleState.left,y);ctx.lineTo(scaleState.right,y);ctx.stroke();ctx.setLineDash([]);
  ctx.font='11px ui-monospace,Menlo,monospace';const tw=ctx.measureText(labelText).width+10;ctx.fillStyle=color;ctx.fillRect(scaleState.right-tw,y-17,tw,16);ctx.fillStyle='#fff';ctx.fillText(labelText,scaleState.right-tw+5,y-5);ctx.restore();
}
function drawChart(){
  if(!current)return;const canvas=$('real-kline-canvas'),ctx=canvas.getContext('2d');const vc=current.visible_count,fc=current.future_count,bars=revealed?current.bars:current.bars.slice(0,vc);
  scaleState=computeScale(bars);const {left,right,top,bottom}=scaleState;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fbfbf8';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#ecece6';ctx.lineWidth=1;for(let i=0;i<6;i++){const y=top+i*(bottom-top)/5;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();const pv=scaleState.p(y);ctx.fillStyle='#888';ctx.font='10px ui-monospace,Menlo,monospace';ctx.fillText(price(pv),4,y+3)}
  const total=vc+fc,slot=(right-left)/total,cw=Math.max(2,slot*.52),futureX=left+vc*slot;
  ctx.fillStyle=revealed?'rgba(31,111,74,.035)':'rgba(0,0,0,.035)';ctx.fillRect(futureX,top,right-futureX,bottom-top);
  ctx.strokeStyle='#bbb';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(futureX,top);ctx.lineTo(futureX,445);ctx.stroke();ctx.setLineDash([]);
  const drawBars=revealed?current.bars:current.bars.slice(0,vc);drawBars.forEach((b,i)=>drawCandle(ctx,left+(i+.5)*slot,cw,b,scaleState.y,i>=vc));
  if(!revealed){ctx.fillStyle='#888';ctx.font='600 12px sans-serif';ctx.textAlign='center';ctx.fillText('未来 '+fc+' 根 K 线已隐藏',futureX+(right-futureX)/2,180);ctx.textAlign='left'}
  const volTop=370,volBottom=438;ctx.strokeStyle='#e2e2dd';ctx.beginPath();ctx.moveTo(left,volTop);ctx.lineTo(right,volTop);ctx.stroke();const vols=drawBars.map(b=>b[5]),vmax=Math.max(...vols,1);drawBars.forEach((b,i)=>{const vh=(b[5]/vmax)*(volBottom-volTop);ctx.fillStyle=i>=vc?'rgba(31,111,74,.35)':'#cfcfca';ctx.fillRect(left+i*slot+slot*.2,volBottom-vh,slot*.6,vh)});
  ctx.fillStyle='#999';ctx.font='10px sans-serif';ctx.fillText('VOL',4,385);
  if(direction!=='skip'){
    const v=getValues();if(Number.isFinite(v.entry))drawHLine(ctx,scaleState.y(v.entry),'ENTRY '+price(v.entry),'#0f4b91');if(Number.isFinite(v.stop))drawHLine(ctx,scaleState.y(v.stop),'STOP '+price(v.stop),'#9f342e');if(Number.isFinite(v.target))drawHLine(ctx,scaleState.y(v.target),'TARGET '+price(v.target),'#1f6f4a');
  }
  if(revealed){ctx.fillStyle='#555';ctx.font='10px ui-monospace,Menlo,monospace';const start=current.bars[0][0].replace('T',' ').slice(0,16)+' UTC',end=current.bars[current.bars.length-1][0].replace('T',' ').slice(0,16)+' UTC';ctx.fillText(start,left,462);ctx.textAlign='right';ctx.fillText(end,right,462);ctx.textAlign='left'}
}

function canvasPrice(e){
  const c=$('real-kline-canvas'),r=c.getBoundingClientRect(),y=(e.clientY-r.top)*c.height/r.height;if(!scaleState||y<scaleState.top||y>scaleState.bottom)return null;return scaleState.p(y);
}
$('real-kline-canvas').addEventListener('click',e=>{
  if(revealed||!direction||direction==='skip')return;const p=canvasPrice(e);if(!Number.isFinite(p))return;levels[tool]=p;const id=tool==='entry'?'real-entry':tool==='stop'?'real-stop':'real-target';$(id).value=price(p);validatePlan();drawChart();
});
qsa('.real-direction button').forEach(b=>b.addEventListener('click',()=>{
  if(revealed)return;direction=b.dataset.dir;qsa('.real-direction button').forEach(x=>x.classList.toggle('active',x===b));validatePlan();drawChart();
}));
qsa('.level-tools button').forEach(b=>b.addEventListener('click',()=>{tool=b.dataset.tool;qsa('.level-tools button').forEach(x=>x.classList.toggle('active',x===b))}));
['real-entry','real-stop','real-target'].forEach(id=>$(id).addEventListener('input',()=>{validatePlan();drawChart()}));

function touch(bar,p){return bar[3]<=p&&bar[2]>=p}
function evaluateTrade(){
  const vc=current.visible_count,future=current.bars.slice(vc),v=getValues(),risk=Math.abs(v.entry-v.stop),targetR=Math.abs(v.target-v.entry)/risk;
  let fill=-1;for(let i=0;i<future.length;i++){if(touch(future[i],v.entry)){fill=i;break}}
  if(fill<0)return {kind:'nofill',title:'未成交',copy:'隐藏的后 '+future.length+' 根 K 线都没有触及你的 Entry。',r:null,mfe:null,mae:null,fill:null,exit:null};
  const entryBar=future[fill];const sameStop=touch(entryBar,v.stop),sameTarget=touch(entryBar,v.target);
  if(sameStop||sameTarget){return {kind:'amb',title:'入场 K 线内顺序不可判定',copy:'Entry 与 '+(sameStop&&sameTarget?'Stop / Target':'退出水平')+' 出现在同一根 15m K 线的价格范围内。OHLC 无法恢复逐笔顺序，这题不强行计分。',r:null,mfe:null,mae:null,fill,exit:fill}}
  let outcome='open',exit=null;
  for(let i=fill+1;i<future.length;i++){
    const b=future[i];const stopHit=direction==='long'?b[3]<=v.stop:b[2]>=v.stop;const targetHit=direction==='long'?b[2]>=v.target:b[3]<=v.target;
    if(stopHit&&targetHit){outcome='amb';exit=i;break}if(stopHit){outcome='stop';exit=i;break}if(targetHit){outcome='target';exit=i;break}
  }
  const endIndex=exit==null?future.length-1:exit;const evalBars=future.slice(fill+1,endIndex+1);let mfe=0,mae=0;
  if(evalBars.length){if(direction==='long'){mfe=(Math.max(...evalBars.map(b=>b[2]))-v.entry)/risk;mae=(v.entry-Math.min(...evalBars.map(b=>b[3])))/risk}else{mfe=(v.entry-Math.min(...evalBars.map(b=>b[3])))/risk;mae=(Math.max(...evalBars.map(b=>b[2]))-v.entry)/risk}}
  if(outcome==='amb')return {kind:'amb',title:'同一根 K 线同时触及 Stop 与 Target',copy:'15m OHLC 不能判断这一根里究竟哪个先发生，因此这题不强行计分。',r:null,mfe,mae,fill,exit};
  if(outcome==='target')return {kind:'win',title:'目标先触发',copy:'真实后续行情先到达你的 Target。',r:targetR,mfe,mae,fill,exit};
  if(outcome==='stop')return {kind:'loss',title:'止损先触发',copy:'真实后续行情先到达你的 Stop。',r:-1,mfe,mae,fill,exit};
  const last=future[future.length-1][4];const endR=direction==='long'?(last-v.entry)/risk:(v.entry-last)/risk;
  return {kind:endR>=0?'win':'loss',title:'窗口结束仍未触发止损或目标',copy:'后 20 根结束时按最后收盘价做浮动 R 展示，不代表实际平仓。',r:endR,mfe,mae,fill,exit:null,mark:true};
}
function evaluateSkip(){
  const vc=current.visible_count,future=current.bars.slice(vc),last=current.bars[vc-1][4],hi=Math.max(...future.map(b=>b[2])),lo=Math.min(...future.map(b=>b[3]));return {kind:'flat',title:'你选择不做',copy:'随后 20 根内，相对当前价最大上行 '+pct((hi/last-1)*100)+'，最大下行 '+pct((lo/last-1)*100)+'。这里不评价“不做”是否正确，只记录你当时的选择。',r:null,mfe:null,mae:null};
}
function showResult(res){
  const box=$('real-result');box.className='real-result show';const cls=res.kind==='win'?'win':res.kind==='loss'?'loss':res.kind==='amb'?'amb':'flat';
  let metrics='';if(direction!=='skip'){
    metrics='<div class="result-grid">'+
      '<div class="result-metric"><span>RESULT</span><b>'+(Number.isFinite(res.r)?(res.r>=0?'+':'')+res.r.toFixed(2)+'R':'—')+'</b></div>'+
      '<div class="result-metric"><span>MFE</span><b>'+(Number.isFinite(res.mfe)?res.mfe.toFixed(2)+'R':'—')+'</b></div>'+
      '<div class="result-metric"><span>MAE</span><b>'+(Number.isFinite(res.mae)?res.mae.toFixed(2)+'R':'—')+'</b></div>'+
      '<div class="result-metric"><span>FILL BAR</span><b>'+(res.fill==null?'—':'+'+(res.fill+1))+'</b></div></div>';
  }
  box.innerHTML='<div class="result-title '+cls+'">'+esc(res.title)+'</div>'+metrics+'<div class="result-copy">'+esc(res.copy)+'</div>';
}
function submit(){
  if(revealed||!validatePlan())return;revealed=true;ledger.attempts++;
  let res;if(direction==='skip'){res=evaluateSkip()}else{ledger.trades++;res=evaluateTrade();if(Number.isFinite(res.r)&&res.kind!=='amb'&&res.kind!=='nofill'){ledger.totalR+=res.r}}
  ledger.history.unshift({id:current.id,symbol:current.symbol,direction,result:res.kind,r:Number.isFinite(res.r)?res.r:null,at:new Date().toISOString()});ledger.history=ledger.history.slice(0,100);saveLedger(ledger);updateStats();
  const first=current.bars[0][0].replace('T',' ').slice(0,16),last=current.bars[current.bars.length-1][0].replace('T',' ').slice(0,16);$('real-symbol').innerHTML=esc(current.symbol)+' <small>15m · '+esc(first)+' → '+esc(last)+' UTC</small>';
  $('real-submit').disabled=true;$('real-next').disabled=false;showResult(res);drawChart();
}
$('real-submit').addEventListener('click',submit);$('real-next').addEventListener('click',chooseExercise);$('real-random').addEventListener('click',chooseExercise);$('real-symbol-filter').addEventListener('change',chooseExercise);
$('real-reset-ledger').addEventListener('click',()=>{ledger={attempts:0,trades:0,totalR:0,history:[]};saveLedger(ledger);updateStats()});

document.addEventListener('keydown',e=>{
  if(e.target&&['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;const k=e.key.toLowerCase();
  if(k==='l')qsa('.real-direction button').find(b=>b.dataset.dir==='long')?.click();else if(k==='s')qsa('.real-direction button').find(b=>b.dataset.dir==='short')?.click();else if(k==='x')qsa('.real-direction button').find(b=>b.dataset.dir==='skip')?.click();else if(k==='e')qsa('.level-tools button').find(b=>b.dataset.tool==='entry')?.click();else if(k==='d')qsa('.level-tools button').find(b=>b.dataset.tool==='stop')?.click();else if(k==='g')qsa('.level-tools button').find(b=>b.dataset.tool==='target')?.click();else if(k==='n'&&!$('real-next').disabled)$('real-next').click();
});

updateStats();
fetch(DATA_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(data=>{
  if(!data||!Array.isArray(data.exercises)||!data.exercises.length)throw new Error('题库为空');payload=data;pool=data.exercises;$('real-loading').style.display='none';$('real-content').style.display='grid';chooseExercise();
}).catch(err=>{
  $('real-loading').style.display='none';$('real-error').style.display='block';$('real-error').textContent='真实行情题库暂时加载失败：'+err.message;
});
})();
