from pathlib import Path

p = Path('assets/js/crypto-real-practice.js')
s = p.read_text(encoding='utf-8')

old = "const STYLE_URL='assets/css/crypto-real-practice.css';\n"
new = "const STYLE_URL='assets/css/crypto-real-practice.css';\nconst SESSION_ID='S'+new Date().toISOString().replace(/\\D/g,'').slice(0,14)+'-'+Math.random().toString(36).slice(2,6).toUpperCase();\n"
if "const SESSION_ID=" not in s:
    if old not in s: raise SystemExit('STYLE_URL anchor missing')
    s = s.replace(old, new, 1)

old = '''    <button id="real-random">随机换题</button>\n    <button id="real-reset-ledger">清空训练记录</button>'''
new = '''    <button id="real-random">随机换题</button>\n    <button id="real-export-chatgpt">导出给 ChatGPT</button>\n    <button id="real-copy-chatgpt">复制本次记录</button>\n    <button id="real-reset-ledger">清空训练记录</button>'''
if 'id="real-export-chatgpt"' not in s:
    if old not in s: raise SystemExit('toolbar anchor missing')
    s = s.replace(old, new, 1)

old = "ledger.history.unshift({id:current.id,symbol:current.symbol,direction,result:res.kind,r:Number.isFinite(res.r)?res.r:null,at:new Date().toISOString()});ledger.history=ledger.history.slice(0,100);saveLedger(ledger);updateStats();"
new = """const plan=getValues(),risk=direction==='skip'?null:Math.abs(plan.entry-plan.stop),plannedRR=direction==='skip'||!Number.isFinite(risk)||risk<=0?null:Math.abs(plan.target-plan.entry)/risk;\n  ledger.history.unshift({\n    id:current.id,exerciseId:current.id,symbol:current.symbol,interval:current.interval||'15m',direction,\n    entry:direction==='skip'?null:(Number.isFinite(plan.entry)?plan.entry:null),\n    stop:direction==='skip'?null:(Number.isFinite(plan.stop)?plan.stop:null),\n    target:direction==='skip'?null:(Number.isFinite(plan.target)?plan.target:null),\n    plannedRR:Number.isFinite(plannedRR)?plannedRR:null,result:res.kind,r:Number.isFinite(res.r)?res.r:null,\n    mfe:Number.isFinite(res.mfe)?res.mfe:null,mae:Number.isFinite(res.mae)?res.mae:null,fillBar:res.fill==null?null:res.fill+1,\n    at:new Date().toISOString(),sessionId:SESSION_ID,\n    visibleStart:current.bars?.[0]?.[0]||null,decisionBarTime:current.bars?.[current.visible_count-1]?.[0]||null,\n    futureEnd:current.bars?.[current.bars.length-1]?.[0]||null\n  });ledger.history=ledger.history.slice(0,5000);saveLedger(ledger);updateStats();"""
if 'plannedRR:Number.isFinite(plannedRR)' not in s:
    if old not in s: raise SystemExit('history anchor missing')
    s = s.replace(old, new, 1)

anchor = "$('real-submit').addEventListener('click',submit);$('real-next').addEventListener('click',chooseExercise);$('real-random').addEventListener('click',chooseExercise);$('real-symbol-filter').addEventListener('change',chooseExercise);"
insert = r'''function exportRecords(){
  const currentSession=ledger.history.filter(x=>x.sessionId===SESSION_ID);
  const records=currentSession.length?currentSession:ledger.history.slice();
  if(!records.length){alert('还没有训练记录可以导出。');return}
  const ids=[...new Set(records.map(x=>x.exerciseId||x.id).filter(Boolean))],snapshots={};
  ids.forEach(id=>{const ex=pool.find(x=>x.id===id);if(ex)snapshots[id]={id:ex.id,symbol:ex.symbol,interval:ex.interval,visible_count:ex.visible_count,future_count:ex.future_count,bars:ex.bars}});
  const scored=records.filter(x=>x.direction!=='skip'&&Number.isFinite(Number(x.r)));
  const wins=scored.filter(x=>Number(x.r)>0),totalR=scored.reduce((a,x)=>a+Number(x.r),0);
  const out={
    schema:2,type:'arce_crypto_training_export',source:'Binance Spot historical klines',exportedAt:new Date().toISOString(),
    sessionId:currentSession.length?SESSION_ID:null,
    summary:{attempts:records.length,trades:records.filter(x=>x.direction!=='skip').length,scoredTrades:scored.length,wins:wins.length,winRate:scored.length?wins.length/scored.length:null,totalR,avgR:scored.length?totalR/scored.length:null},
    records,marketSnapshots:snapshots
  };
  const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='crypto-training-for-chatgpt-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function copyRecords(){
  const currentSession=ledger.history.filter(x=>x.sessionId===SESSION_ID),records=currentSession.length?currentSession:ledger.history.slice();
  if(!records.length){alert('还没有训练记录可以复制。');return}
  const lines=['加密货币真实K线训练记录','记录数: '+records.length,''];
  records.slice().reverse().forEach((x,i)=>{
    lines.push((i+1)+'. '+(x.symbol||'—')+' '+(x.interval||'15m')+' | '+(x.direction==='long'?'做多':x.direction==='short'?'做空':'不做'));
    lines.push('exercise='+String(x.exerciseId||x.id||'—')+' | entry='+(x.entry??'—')+' | stop='+(x.stop??'—')+' | target='+(x.target??'—')+' | plannedRR='+(x.plannedRR??'—'));
    lines.push('result='+(x.result||'—')+' | R='+(x.r??'—')+' | MFE='+(x.mfe??'—')+' | MAE='+(x.mae??'—')+' | fillBar='+(x.fillBar??'—'));
    lines.push('time='+(x.at||'—')+' | visibleStart='+(x.visibleStart||'—')+' | decisionBar='+(x.decisionBarTime||'—'));lines.push('');
  });
  const text=lines.join('\n');
  try{await navigator.clipboard.writeText(text);const b=$('real-copy-chatgpt'),old=b.textContent;b.textContent='已复制';setTimeout(()=>b.textContent=old,1200)}
  catch(_){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();alert('记录已复制，可以直接粘贴到 ChatGPT。')}
}

'''+anchor+"\n$('real-export-chatgpt').addEventListener('click',exportRecords);$('real-copy-chatgpt').addEventListener('click',copyRecords);"
if 'function exportRecords()' not in s:
    if anchor not in s: raise SystemExit('event anchor missing')
    s = s.replace(anchor, insert, 1)

p.write_text(s, encoding='utf-8')
print('patched', p)
