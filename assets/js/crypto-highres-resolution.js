(function(){
'use strict';

const API='https://data-api.binance.vision/api/v3/klines';
const BASE_KEY='_arce_crypto_real_practice_v1';
const JOURNAL_KEY='_arce_crypto_real_journal_v1';
let resolving=false,lastKey='';

const $=id=>document.getElementById(id);
const qsa=(s,r)=>Array.from((r||document).querySelectorAll(s));
const num=x=>Number(x);
const finite=x=>Number.isFinite(Number(x));

function touch(bar,p){return Number(bar[3])<=p&&Number(bar[2])>=p}
function parseTimeRange(){
  const small=document.querySelector('#real-symbol small');
  if(!small)return null;
  const m=small.textContent.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*→\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*UTC/i);
  if(!m)return null;
  const start=Date.parse(m[1].replace(' ','T')+':00Z');
  const endLast=Date.parse(m[2].replace(' ','T')+':00Z');
  if(!Number.isFinite(start)||!Number.isFinite(endLast))return null;
  return {start,endLast};
}
function currentPlan(){
  const dir=document.querySelector('.real-direction button.active')?.dataset.dir||null;
  return {direction:dir,entry:num($('real-entry')?.value),stop:num($('real-stop')?.value),target:num($('real-target')?.value)};
}
async function getKlines(symbol,interval,start,end,limit=1000){
  const u=new URL(API);u.searchParams.set('symbol',symbol);u.searchParams.set('interval',interval);u.searchParams.set('startTime',String(start));u.searchParams.set('endTime',String(end));u.searchParams.set('limit',String(limit));
  const r=await fetch(u.toString(),{cache:'no-store'});if(!r.ok)throw new Error('Binance HTTP '+r.status);return r.json();
}

async function resolveMinute(symbol,minuteBar,state,plan){
  const start=Number(minuteBar[0]),end=start+60000-1;
  const secs=await getKlines(symbol,'1s',start,end,1000);
  if(!Array.isArray(secs)||!secs.length)return {kind:'amb',state,precision:'1s'};
  let filled=state.filled;
  for(let i=0;i<secs.length;i++){
    const b=secs[i];
    if(!filled){
      if(!touch(b,plan.entry))continue;
      const sh=touch(b,plan.stop),th=touch(b,plan.target);
      if(sh||th)return {kind:'amb',state:{filled:true,fillTime:Number(b[0])},precision:'1s'};
      filled=true;state.filled=true;state.fillTime=Number(b[0]);continue;
    }
    const sh=touch(b,plan.stop),th=touch(b,plan.target);
    if(sh&&th)return {kind:'amb',state,precision:'1s'};
    if(sh)return {kind:'stop',state,precision:'1s',exitTime:Number(b[0])};
    if(th)return {kind:'target',state,precision:'1s',exitTime:Number(b[0])};
  }
  return {kind:'continue',state,precision:'1s'};
}

async function evaluateHighRes(symbol,plan,bars){
  const risk=Math.abs(plan.entry-plan.stop),targetR=Math.abs(plan.target-plan.entry)/risk;
  const state={filled:false,fillTime:null};let precision='1m',mfe=0,mae=0;
  for(let i=0;i<bars.length;i++){
    const b=bars[i];
    if(!state.filled){
      if(!touch(b,plan.entry))continue;
      const sh=touch(b,plan.stop),th=touch(b,plan.target);
      if(sh||th){
        const rr=await resolveMinute(symbol,b,state,plan);precision=rr.precision||precision;
        if(rr.kind==='amb')return {kind:'amb',r:null,mfe:null,mae:null,precision,fillTime:rr.state?.fillTime||null};
        if(rr.kind==='stop')return {kind:'loss',r:-1,mfe:0,mae:1,precision,fillTime:rr.state.fillTime,exitTime:rr.exitTime};
        if(rr.kind==='target')return {kind:'win',r:targetR,mfe:targetR,mae:0,precision,fillTime:rr.state.fillTime,exitTime:rr.exitTime};
        continue;
      }
      state.filled=true;state.fillTime=Number(b[0]);continue;
    }
    if(plan.direction==='long'){
      mfe=Math.max(mfe,(Number(b[2])-plan.entry)/risk);mae=Math.max(mae,(plan.entry-Number(b[3]))/risk);
    }else{
      mfe=Math.max(mfe,(plan.entry-Number(b[3]))/risk);mae=Math.max(mae,(Number(b[2])-plan.entry)/risk);
    }
    const sh=plan.direction==='long'?Number(b[3])<=plan.stop:Number(b[2])>=plan.stop;
    const th=plan.direction==='long'?Number(b[2])>=plan.target:Number(b[3])<=plan.target;
    if(sh&&th){
      const rr=await resolveMinute(symbol,b,state,plan);precision=rr.precision||precision;
      if(rr.kind==='amb')return {kind:'amb',r:null,mfe,mae,precision,fillTime:state.fillTime};
      if(rr.kind==='stop')return {kind:'loss',r:-1,mfe,mae,precision,fillTime:state.fillTime,exitTime:rr.exitTime};
      if(rr.kind==='target')return {kind:'win',r:targetR,mfe,mae,precision,fillTime:state.fillTime,exitTime:rr.exitTime};
    }
    if(sh)return {kind:'loss',r:-1,mfe,mae,precision,fillTime:state.fillTime,exitTime:Number(b[0])};
    if(th)return {kind:'win',r:targetR,mfe,mae,precision,fillTime:state.fillTime,exitTime:Number(b[0])};
  }
  if(!state.filled)return {kind:'nofill',r:null,mfe:null,mae:null,precision,fillTime:null};
  const last=bars[bars.length-1],lastClose=Number(last[4]);
  const r=plan.direction==='long'?(lastClose-plan.entry)/risk:(plan.entry-lastClose)/risk;
  return {kind:r>=0?'win':'loss',r,mfe,mae,precision,fillTime:state.fillTime,mark:true};
}

function patchLedger(symbol,plan,res){
  try{
    const led=JSON.parse(localStorage.getItem(BASE_KEY)||'{}');
    if(Array.isArray(led.history)&&led.history.length){
      const x=led.history[0];
      if(x.symbol===symbol&&x.direction===plan.direction&&x.result==='amb'){
        x.result=res.kind;x.r=finite(res.r)?Number(res.r):null;x.mfe=finite(res.mfe)?Number(res.mfe):null;x.mae=finite(res.mae)?Number(res.mae):null;x.resolution=res.precision||'1m';
        if(finite(res.r)&&res.kind!=='amb'&&res.kind!=='nofill'){
          const oldR=0;led.totalR=(Number(led.totalR)||0)-oldR+Number(res.r);
        }
        localStorage.setItem(BASE_KEY,JSON.stringify(led));
        if($('real-total-r'))$('real-total-r').textContent=(Number(led.totalR)||0).toFixed(2);
      }
    }
  }catch(_){ }
  try{
    const j=JSON.parse(localStorage.getItem(JOURNAL_KEY)||'{}');
    if(Array.isArray(j.records)&&j.records.length){
      const x=j.records.find(r=>r.symbol===symbol&&r.direction===plan.direction&&r.result==='amb');
      if(x){x.result=res.kind;x.r=finite(res.r)?Number(res.r):null;x.mfe=finite(res.mfe)?Number(res.mfe):null;x.mae=finite(res.mae)?Number(res.mae):null;x.resolution=res.precision||'1m';localStorage.setItem(JOURNAL_KEY,JSON.stringify(j));}
    }
  }catch(_){ }
}

function renderResolved(res){
  const box=$('real-result');if(!box)return;
  const cls=res.kind==='win'?'win':res.kind==='loss'?'loss':res.kind==='amb'?'amb':'flat';
  const title=res.kind==='win'?'目标先触发':res.kind==='loss'?'止损先触发':res.kind==='nofill'?'未成交':'更细粒度仍不可判定';
  const precision=res.precision==='1s'?'1 秒':'1 分钟';
  let metrics='';
  if(res.kind!=='nofill')metrics='<div class="result-grid">'+
    '<div class="result-metric"><span>RESULT</span><b>'+(finite(res.r)?(Number(res.r)>=0?'+':'')+Number(res.r).toFixed(2)+'R':'—')+'</b></div>'+
    '<div class="result-metric"><span>MFE</span><b>'+(finite(res.mfe)?Number(res.mfe).toFixed(2)+'R':'—')+'</b></div>'+
    '<div class="result-metric"><span>MAE</span><b>'+(finite(res.mae)?Number(res.mae).toFixed(2)+'R':'—')+'</b></div>'+
    '<div class="result-metric"><span>RESOLUTION</span><b>'+precision+'</b></div></div>';
  const copy=res.kind==='amb'?'已经自动从 15m 下钻到 '+precision+' K 线，但同一最小时间片内仍同时跨过多个价位，因此继续保持不可判定。':'原 15m OHLC 无法判断先后；已自动用 Binance '+precision+'真实 K 线恢复顺序。';
  box.className='real-result show';box.innerHTML='<div class="result-title '+cls+'">'+title+' <span class="real-badge">'+precision+'复核</span></div>'+metrics+'<div class="result-copy">'+copy+'</div>';
}

async function tryResolve(){
  if(resolving)return;
  const box=$('real-result');if(!box||!box.classList.contains('show'))return;
  const txt=box.textContent||'';
  if(!/顺序不可判定|同时触及 Stop 与 Target/.test(txt))return;
  const range=parseTimeRange(),plan=currentPlan(),symbol=($('real-symbol')?.textContent||'').trim().split(/\s+/)[0];
  if(!range||!symbol||!['long','short'].includes(plan.direction)||![plan.entry,plan.stop,plan.target].every(Number.isFinite))return;
  const key=[symbol,range.start,plan.direction,plan.entry,plan.stop,plan.target].join('|');if(key===lastKey)return;lastKey=key;resolving=true;
  const old=box.innerHTML;box.innerHTML=old+'<div class="result-copy" style="margin-top:7px">正在用 Binance 1m / 1s K 线复核顺序…</div>';
  try{
    const hiddenStart=range.start+60*15*60*1000,end=range.endLast+15*60*1000-1;
    const bars=await getKlines(symbol,'1m',hiddenStart,end,1000);
    const res=await evaluateHighRes(symbol,plan,bars);
    renderResolved(res);patchLedger(symbol,plan,res);
  }catch(err){
    box.innerHTML=old+'<div class="result-copy" style="margin-top:7px;color:#9f342e">1m 精细复核失败：'+String(err.message||err)+'。暂时保留 15m 不可判定结果。</div>';
  }finally{resolving=false;}
}

function install(){
  const root=$('real-result');if(!root){setTimeout(install,300);return;}
  new MutationObserver(()=>setTimeout(tryResolve,0)).observe(root,{childList:true,subtree:true,characterData:true});
}
install();
})();
