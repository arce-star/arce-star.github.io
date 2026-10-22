(function(){
'use strict';

function byId(id){return document.getElementById(id)}
function qs(sel,root){return (root||document).querySelector(sel)}
function qsa(sel,root){return Array.from((root||document).querySelectorAll(sel))}

function drawCandle(ctx,x,o,h,l,c,scaleY){
  const up=c>=o;
  ctx.strokeStyle=up?'#111':'#777';
  ctx.fillStyle=up?'#111':'#fff';
  const yO=scaleY(o),yH=scaleY(h),yL=scaleY(l),yC=scaleY(c);
  ctx.beginPath();ctx.moveTo(x,yH);ctx.lineTo(x,yL);ctx.stroke();
  const top=Math.min(yO,yC),bottom=Math.max(yO,yC);
  ctx.fillRect(x-5,top,10,Math.max(1,bottom-top));
  ctx.strokeRect(x-5,top,10,Math.max(1,bottom-top));
}
function chartScale(values,top,bottom){
  const min=Math.min(...values),max=Math.max(...values),pad=(max-min)*.15||1;
  const low=min-pad,high=max+pad;
  return v=>bottom-((v-low)/(high-low))*(bottom-top);
}
function drawLine(ctx,x1,y1,x2,y2,color,dash){
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(dash||[]);
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
}
function label(ctx,x,y,text,bg){
  ctx.font='12px sans-serif';const pad=6,w=ctx.measureText(text).width+pad*2,h=22;
  ctx.fillStyle=bg;ctx.fillRect(x,y,w,h);ctx.fillStyle='#fff';ctx.fillText(text,x+pad,y+15);
}
function baseChart(ctx,title){
  const c=ctx.canvas;ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#fbfbf8';ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeStyle='#ecece6';for(let i=0;i<5;i++){const y=36+i*58;ctx.beginPath();ctx.moveTo(42,y);ctx.lineTo(c.width-16,y);ctx.stroke()}
  ctx.beginPath();ctx.moveTo(42,24);ctx.lineTo(42,304);ctx.lineTo(c.width-16,304);ctx.strokeStyle='#d0d0c9';ctx.stroke();
  ctx.fillStyle='#777';ctx.font='12px sans-serif';ctx.fillText(title,42,18);
}

const martinScenes={
 pullback:{title:'Martin · 回调 setup',candles:[[10,10.5,9.8,10.4],[10.4,11.2,10.3,11],[11,11.8,10.9,11.5],[11.5,12.3,11.4,12.1],[12.1,12.6,11.9,12.4],[12.4,12.7,11.8,12],[12,12.15,11.4,11.6],[11.6,11.7,11.1,11.2],[11.2,11.9,11,11.8],[11.8,12.4,11.7,12.3],[12.3,12.9,12.2,12.8],[12.8,13.3,12.7,13.1]],buy:8,stop:7,target:11,zone:[6.4,8.3],guide:['先是上升趋势，然后出现第一次比较像样的回调。','回调落到 EMA / AVWAP / 旧突破位附近，属于支撑共振区。','分钟图快速 V 形反转后，上破前一根 K 线高点触发买点。','止损放在刚形成的低点下方；盈利后先看 3R、5R，再决定是否继续拿。']},
 breakout:{title:'Martin · 突破 setup',candles:[[10,10.8,9.9,10.6],[10.6,11,10.3,10.8],[10.8,11.2,10.7,11],[11,11.1,10.6,10.8],[10.8,11,10.6,10.9],[10.9,11,10.75,10.85],[10.85,10.95,10.7,10.8],[10.8,10.92,10.72,10.88],[10.88,11.12,10.84,11.08],[11.08,11.6,11.02,11.5],[11.5,11.9,11.4,11.8],[11.8,12.3,11.7,12.2]],buy:8,stop:6,target:11,zone:[4.6,8.1],guide:['先涨一段，再横向整理 1–2 周。','整理末端波动收窄并贴近 9EMA。','不必等整个箱体上沿完全突破，过前一天高点就可以更早切入。','更早的入场让止损距离更小，R 倍数更容易做出来。']},
 ep:{title:'Martin · EP 跳空 setup',candles:[[6.5,6.7,6.4,6.6],[6.6,6.8,6.5,6.7],[6.7,7.8,6.9,7.6],[7.6,8.2,7.4,7.5],[7.5,7.55,7.1,7.2],[7.2,7.5,7.1,7.45],[7.45,7.95,7.4,7.86],[7.86,8.45,7.84,8.32],[8.32,8.9,8.26,8.78],[8.78,9.4,8.7,9.2],[9.2,9.8,9.1,9.6],[9.6,9.9,9.2,9.4]],buy:6,stop:5,target:10,zone:[4.6,5.7],guide:['财报等事件跳空以后先别追。','开盘先冲再砸，甚至跌破开盘区间低点，反而能把风险位置暴露出来。','等 5 分钟或 15 分钟图重新上破前一根高点再入场。','若当天最低点太远，止损可以改放触发买点 K 线的低点下方。']}
};
const rossScenes={
 reclaim:{title:'Ross · 第一次回调再上破',candles:[[1.05,1.22,1.02,1.18],[1.18,1.48,1.16,1.44],[1.44,1.82,1.41,1.78],[1.78,2.08,1.72,2.02],[2.02,2.15,1.86,1.93],[1.93,1.97,1.72,1.79],[1.79,1.84,1.73,1.82],[1.82,1.98,1.8,1.95],[1.95,2.22,1.93,2.18],[2.18,2.42,2.14,2.35],[2.35,2.62,2.28,2.58],[2.58,2.7,2.36,2.45]],buy:7,stop:5,target:10,guide:['开盘初期快速拉升时不追，因为最近支撑太远。','等第一次回调，把回调低点当作风险锚点。','再次上破前一根高点时入场，止损更近，结构也更清楚。','第一目标通常看当天前高附近。']},
 sell:{title:'Ross · 卖压和弱化信号',candles:[[1.5,1.72,1.48,1.68],[1.68,1.94,1.64,1.9],[1.9,2.28,1.88,2.22],[2.22,2.62,2.2,2.56],[2.56,2.82,2.48,2.78],[2.78,2.9,2.52,2.58],[2.58,2.66,2.3,2.38],[2.38,2.45,2.18,2.22],[2.22,2.28,2.04,2.1],[2.1,2.16,1.96,2],[2,2.06,1.85,1.92],[1.92,1.96,1.75,1.82]],buy:2,stop:1,target:4,sellZone:[5.2,7.5],guide:['这组图练的是离场，而不是找新买点。','上涨一段后，大卖单、冲高回落、上攻速度下降都属于弱化。','出现弱化以后可以先减仓，不必等利润完全吐回去。','Ross 的规则里，离场执行力和入场一样重要。']}
};

function renderExample(canvas,scene,guide){
  const ctx=canvas.getContext('2d');baseChart(ctx,scene.title);const vals=scene.candles.flat(),sy=chartScale(vals,32,292),left=58,step=38;
  scene.candles.forEach((c,i)=>drawCandle(ctx,left+i*step,c[0],c[1],c[2],c[3],sy));
  if(scene.zone){const x1=left+scene.zone[0]*step-18,x2=left+scene.zone[1]*step+18;ctx.fillStyle='rgba(15,75,145,.1)';ctx.fillRect(x1,210,x2-x1,34);ctx.strokeStyle='rgba(15,75,145,.35)';ctx.strokeRect(x1,210,x2-x1,34);label(ctx,x1+4,186,'支撑 / 共振区','#0f4b91')}
  if(scene.sellZone){const x1=left+scene.sellZone[0]*step-18,x2=left+scene.sellZone[1]*step+18;ctx.fillStyle='rgba(138,90,0,.1)';ctx.fillRect(x1,60,x2-x1,54);ctx.strokeStyle='rgba(138,90,0,.4)';ctx.strokeRect(x1,60,x2-x1,54);label(ctx,x1+4,36,'卖压 / 弱化区','#8a5a00')}
  const bp=scene.candles[scene.buy][1],sp=scene.candles[scene.stop][2],tp=scene.candles[scene.target][1],bx=left+scene.buy*step;
  drawLine(ctx,bx,sy(bp)-18,bx,sy(bp)+18,'#177f50',[4,4]);label(ctx,bx-20,sy(bp)-48,'买点','#177f50');
  drawLine(ctx,48,sy(sp),canvas.width-24,sy(sp),'#b42318',[6,5]);label(ctx,canvas.width-126,sy(sp)-24,'止损','#b42318');
  drawLine(ctx,48,sy(tp),canvas.width-24,sy(tp),'#177f50',[6,5]);label(ctx,canvas.width-126,sy(tp)-24,'目标/观察位','#177f50');
  guide.innerHTML=scene.guide.map(x=>'<li>'+x+'</li>').join('');
}

const templates=[
 {name:'Martin · 第一次回调',method:'Martin',trade:true,context:['QQQ 在上升的 9EMA / 21EMA 上方','ADR 6.2%','成交额充足','突破后第一次回调'],candles:[[10,10.4,9.9,10.3],[10.3,10.9,10.2,10.8],[10.8,11.4,10.7,11.25],[11.25,11.9,11.2,11.8],[11.8,12.2,11.72,12.05],[12.05,12.15,11.65,11.76],[11.76,11.82,11.25,11.36],[11.36,11.52,11.18,11.42],[11.42,11.7,11.36,11.62]],entryIndex:8,entry:11.53,stop:11.16,target:12.64,reason:'趋势向上，位置早，回调落到支撑区域后快速收回。参考做法是在最后一根 K 线上破前一根高点附近触发，止损放回调低点下方。'},
 {name:'Martin · 末端追高',method:'Martin',trade:false,context:['QQQ 连涨数周','个股已远离 9EMA','ADR 8.5%','过去 5 天连续大涨'],candles:[[7,7.4,6.9,7.35],[7.35,7.9,7.3,7.82],[7.82,8.5,7.78,8.42],[8.42,9.1,8.36,9],[9,9.9,8.95,9.8],[9.8,10.7,9.7,10.6],[10.6,11.55,10.5,11.4],[11.4,12.25,11.3,12.05],[12.05,12.7,11.9,12.55]],reason:'位置已经太晚，离均线和支撑过远。Martin 会优先避开这种连续大涨后再追的结构。'},
 {name:'Martin · 整理末端突破',method:'Martin',trade:true,context:['整理 9 个交易日','K 线贴近 9EMA','前一天为 inside day','板块同步走强'],candles:[[10,10.7,9.9,10.55],[10.55,11,10.4,10.85],[10.85,11.1,10.6,10.75],[10.75,10.98,10.58,10.82],[10.82,10.95,10.65,10.72],[10.72,10.88,10.62,10.8],[10.8,10.9,10.66,10.76],[10.76,10.86,10.69,10.78],[10.78,10.96,10.74,10.93]],entryIndex:8,entry:10.87,stop:10.67,target:11.47,reason:'整理时间足够、波动收窄、贴近 9EMA，最后一根开始越过前一日高点。提前在前一天高点附近切入可以把止损压得更近。'},
 {name:'Ross · 第一次回调',method:'Ross',trade:true,context:['盘前涨幅 +38%','RVOL 9.2×','有新消息','流通股 850 万'],candles:[[2.1,2.28,2.05,2.24],[2.24,2.52,2.2,2.48],[2.48,2.8,2.44,2.74],[2.74,3.02,2.68,2.96],[2.96,3.06,2.76,2.82],[2.82,2.88,2.62,2.7],[2.7,2.76,2.64,2.72],[2.72,2.9,2.69,2.87]],entryIndex:7,entry:2.77,stop:2.61,target:3.03,reason:'涨幅、相对成交量、消息和低流通盘都符合，第一次回调没有破坏结构。参考买点是最后一根上破前一根高点，止损放回调低点下方，第一目标看前高。'},
 {name:'Ross · 热度不足',method:'Ross',trade:false,context:['盘前涨幅 +6%','RVOL 1.8×','没有明确消息','流通股 6200 万'],candles:[[6,6.12,5.95,6.08],[6.08,6.2,6.03,6.16],[6.16,6.23,6.1,6.12],[6.12,6.18,6.02,6.06],[6.06,6.12,5.98,6],[6,6.09,5.96,6.05],[6.05,6.14,6.01,6.1],[6.1,6.17,6.05,6.12]],reason:'RVOL 太低、涨幅不够突出、没有明显催化、流通盘偏大。即使局部 K 线有小突破，也不是 Ross 重点做的那类股票。'},
 {name:'Ross · 直线追高',method:'Ross',trade:false,context:['盘前涨幅 +85%','RVOL 12×','有消息','当前已连续直线拉升'],candles:[[1.5,1.7,1.48,1.66],[1.66,1.95,1.64,1.92],[1.92,2.28,1.9,2.24],[2.24,2.66,2.22,2.6],[2.6,3.02,2.58,2.96],[2.96,3.38,2.9,3.3],[3.3,3.66,3.25,3.58],[3.58,3.9,3.52,3.82]],reason:'虽然股票很热，但没有第一次回调，最近支撑离得太远。直接追会让止损过宽。'}
];

let state={t:null,decision:null,mode:'entry',marks:{entry:null,stop:null,target:null},revealed:false,score:0,attempts:0};
function trainerScale(){return chartScale(state.t.candles.flat(),38,366)}
function priceFromY(y){const vals=state.t.candles.flat(),min=Math.min(...vals),max=Math.max(...vals),pad=(max-min)*.15||1,low=min-pad,high=max+pad;return low+Math.max(0,Math.min(1,(366-y)/(366-38)))*(high-low)}
function renderTrainer(){
  const c=byId('investment-random-chart'),ctx=c.getContext('2d'),t=state.t;ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#fbfbf8';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#ecece6';for(let i=0;i<6;i++){const y=48+i*55;ctx.beginPath();ctx.moveTo(48,y);ctx.lineTo(c.width-18,y);ctx.stroke()}ctx.beginPath();ctx.moveTo(48,28);ctx.lineTo(48,382);ctx.lineTo(c.width-18,382);ctx.strokeStyle='#d0d0c9';ctx.stroke();ctx.fillStyle='#777';ctx.font='12px sans-serif';ctx.fillText('题目：'+t.name,48,20);
  const sy=trainerScale(),left=72,step=Math.min(58,(c.width-110)/Math.max(t.candles.length-1,1));t.candles.forEach((x,i)=>drawCandle(ctx,left+i*step,x[0],x[1],x[2],x[3],sy));
  const colors={entry:'#177f50',stop:'#b42318',target:'#0f4b91'},names={entry:'你的买点',stop:'你的止损',target:'你的目标'};Object.entries(state.marks).forEach(([k,m])=>{if(!m)return;drawLine(ctx,50,sy(m.price),c.width-20,sy(m.price),colors[k],[5,5]);label(ctx,c.width-132,sy(m.price)-24,names[k],colors[k]);if(k==='entry')drawLine(ctx,m.x,36,m.x,374,colors[k],[3,5])});
  if(state.revealed&&t.trade){drawLine(ctx,50,sy(t.entry),c.width-20,sy(t.entry),'#177f50',[2,3]);drawLine(ctx,50,sy(t.stop),c.width-20,sy(t.stop),'#b42318',[2,3]);drawLine(ctx,50,sy(t.target),c.width-20,sy(t.target),'#8a5a00',[2,3]);label(ctx,54,sy(t.entry)-24,'参考买点','#177f50');label(ctx,54,sy(t.stop)-24,'参考止损','#b42318');label(ctx,54,sy(t.target)-24,'参考目标','#8a5a00')}
  if(state.revealed&&!t.trade)label(ctx,54,48,'参考答案：不做','#111');
}
function nextTrainer(){let n;do{n=templates[Math.floor(Math.random()*templates.length)]}while(state.t&&n.name===state.t.name&&templates.length>1);state.t=JSON.parse(JSON.stringify(n));state.decision=null;state.mode='entry';state.marks={entry:null,stop:null,target:null};state.revealed=false;qsa('.trainer-decision').forEach(x=>x.classList.remove('active'));qsa('.trainer-marker').forEach(x=>x.classList.toggle('active',x.dataset.mark==='entry'));byId('investment-trainer-feedback').className='trainer-feedback';byId('investment-trainer-feedback').textContent='先看走势和上方背景信息。第一步只判断：这笔交易值不值得做？';byId('investment-trainer-context').innerHTML='<span class="trainer-pill"><strong>'+state.t.method+'</strong> 模式</span>'+state.t.context.map(x=>'<span class="trainer-pill">'+x+'</span>').join('');byId('investment-trainer-progress').style.width='0%';renderTrainer()}
function grade(showOnly){const t=state.t;state.revealed=true;renderTrainer();const fb=byId('investment-trainer-feedback');if(showOnly){fb.className='trainer-feedback';fb.textContent='参考答案：'+(t.trade?'做':'不做')+'\n\n'+t.reason;return}if(!state.decision){state.revealed=false;renderTrainer();fb.className='trainer-feedback bad';fb.textContent='你还没有先判断“做 / 不做”。';return}state.attempts++;let pts=0,details=[];const ok=(state.decision==='trade')===t.trade;if(ok){pts+=2;details.push('✓ 做 / 不做判断正确')}else details.push('✗ 做 / 不做判断错误');if(t.trade&&state.decision==='trade'){const vals=t.candles.flat(),range=Math.max(...vals)-Math.min(...vals),tol=Math.max(range*.09,.03),c=byId('investment-random-chart'),left=72,step=Math.min(58,(c.width-110)/Math.max(t.candles.length-1,1)),refX=left+t.entryIndex*step,e=state.marks.entry,s=state.marks.stop,g=state.marks.target;if(e&&Math.abs(e.price-t.entry)<=tol&&Math.abs(e.x-refX)<=step*1.25){pts++;details.push('✓ 买点接近参考区域')}else details.push('✗ 买点偏离参考区域');if(s&&Math.abs(s.price-t.stop)<=tol){pts++;details.push('✓ 止损位置合理')}else details.push('✗ 止损位置偏离结构低点');if(g&&Math.abs(g.price-t.target)<=tol*1.6){pts++;details.push('✓ 第一目标接近参考区')}else details.push('✗ 第一目标偏离参考区')}else if(!t.trade&&state.decision==='skip'){pts+=3;details.push('✓ 过滤有效：这题最好的交易就是不交易')}state.score+=pts;byId('investment-trainer-score').textContent='SCORE '+state.score+' / '+(state.attempts*5);byId('investment-trainer-progress').style.width=Math.min(100,pts/5*100)+'%';fb.className='trainer-feedback '+(pts>=4?'good':'bad');fb.textContent='本题 '+pts+' / 5\n'+details.join('\n')+'\n\n参考：'+t.reason}

function inject(){
  if(byId('investment-practice-root'))return;
  const root=document.createElement('div');root.id='investment-practice-root';root.innerHTML=`
  <section class="practice-section"><h2 class="practice-title">K 线图示</h2><div class="practice-grid">
    <div class="practice-box"><div class="practice-head"><h3>Martin · 回调 / 突破 / EP</h3><p>切换三种 setup，看买点、止损和目标如何配合。</p></div><div class="practice-toolbar" id="martin-practice-toolbar"><button class="practice-btn active" data-scene="pullback">回调</button><button class="practice-btn" data-scene="breakout">突破</button><button class="practice-btn" data-scene="ep">EP 跳空</button></div><div class="practice-canvas-wrap"><canvas id="martin-practice-chart" width="560" height="340"></canvas></div><div class="practice-legend"><span><i class="practice-swatch" style="background:#0f4b91"></i>支撑/共振</span><span><i class="practice-swatch" style="background:#177f50"></i>买点/目标</span><span><i class="practice-swatch" style="background:#b42318"></i>止损</span></div><ul class="practice-guide" id="martin-practice-guide"></ul></div>
    <div class="practice-box"><div class="practice-head"><h3>Ross · 第一次回调 / 离场</h3><p>先学会不追直线，再看何时应该减仓。</p></div><div class="practice-toolbar" id="ross-practice-toolbar"><button class="practice-btn active" data-scene="reclaim">第一次回调</button><button class="practice-btn" data-scene="sell">离场信号</button></div><div class="practice-canvas-wrap"><canvas id="ross-practice-chart" width="560" height="340"></canvas></div><div class="practice-legend"><span><i class="practice-swatch" style="background:#177f50"></i>入场/前高</span><span><i class="practice-swatch" style="background:#b42318"></i>风险</span><span><i class="practice-swatch" style="background:#8a5a00"></i>卖压/弱化</span></div><ul class="practice-guide" id="ross-practice-guide"></ul></div>
  </div></section>
  <section class="practice-section"><h2 class="practice-title">随机 K 线训练</h2><div class="trainer-top"><div><h3>先判断要不要做，再自己标买点 / 止损 / 目标</h3><p>每题随机生成一个教学场景。有些题的正确答案就是“不做”。提交前不会显示参考位置。</p></div><div class="trainer-score" id="investment-trainer-score">SCORE 0 / 0</div></div><div class="trainer-context" id="investment-trainer-context"></div><div class="trainer-layout"><div class="trainer-canvas"><canvas id="investment-random-chart" width="760" height="420"></canvas><div class="trainer-click-note">点击图表时：买点同时看时间和价格；止损 / 目标主要看价格。可重复点击覆盖标记。</div></div><aside class="trainer-side"><div class="trainer-label">1 · 这笔交易做不做？</div><div class="practice-decision"><button class="practice-btn trainer-decision" data-decision="trade">做</button><button class="practice-btn trainer-decision" data-decision="skip">不做</button></div><div class="trainer-label">2 · 如果做，标出三个位置</div><div class="practice-markers"><button class="practice-btn trainer-marker active" data-mark="entry">买点</button><button class="practice-btn trainer-marker" data-mark="stop">止损</button><button class="practice-btn trainer-marker" data-mark="target">第一目标</button></div><div class="trainer-help">快捷键：1 = 做，2 = 不做，N = 下一题。</div><div class="practice-actions"><button class="practice-btn primary" id="investment-trainer-submit">提交答案</button><button class="practice-btn" id="investment-trainer-answer">显示参考答案</button><button class="practice-btn" id="investment-trainer-next">下一题</button></div><div class="trainer-feedback" id="investment-trainer-feedback">先看走势和上方背景信息。第一步只判断：这笔交易值不值得做？</div><div class="trainer-progress"><div id="investment-trainer-progress"></div></div></aside></div></section>`;
  const main=qs('main.shell')||document.body;const compare=qs('.compare',main);if(compare&&compare.nextSibling)compare.parentNode.insertBefore(root,compare.nextSibling);else main.appendChild(root);
  renderExample(byId('martin-practice-chart'),martinScenes.pullback,byId('martin-practice-guide'));renderExample(byId('ross-practice-chart'),rossScenes.reclaim,byId('ross-practice-guide'));
  qsa('#martin-practice-toolbar .practice-btn').forEach(b=>b.addEventListener('click',()=>{qsa('#martin-practice-toolbar .practice-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderExample(byId('martin-practice-chart'),martinScenes[b.dataset.scene],byId('martin-practice-guide'))}));
  qsa('#ross-practice-toolbar .practice-btn').forEach(b=>b.addEventListener('click',()=>{qsa('#ross-practice-toolbar .practice-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderExample(byId('ross-practice-chart'),rossScenes[b.dataset.scene],byId('ross-practice-guide'))}));
  qsa('.trainer-decision').forEach(b=>b.addEventListener('click',()=>{state.decision=b.dataset.decision;qsa('.trainer-decision').forEach(x=>x.classList.remove('active'));b.classList.add('active')}));
  qsa('.trainer-marker').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mark;qsa('.trainer-marker').forEach(x=>x.classList.remove('active'));b.classList.add('active')}));
  byId('investment-random-chart').addEventListener('click',e=>{if(!state.t||state.revealed)return;const r=e.currentTarget.getBoundingClientRect(),sx=e.currentTarget.width/r.width,sy=e.currentTarget.height/r.height,x=(e.clientX-r.left)*sx,y=(e.clientY-r.top)*sy;state.marks[state.mode]={x:x,price:priceFromY(y)};renderTrainer()});
  byId('investment-trainer-submit').addEventListener('click',()=>grade(false));byId('investment-trainer-answer').addEventListener('click',()=>grade(true));byId('investment-trainer-next').addEventListener('click',nextTrainer);
  document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,[contenteditable="true"]'))return;if(e.key.toLowerCase()==='n')nextTrainer();if(e.key==='1')qs('.trainer-decision[data-decision="trade"]').click();if(e.key==='2')qs('.trainer-decision[data-decision="skip"]').click()});
  nextTrainer();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();