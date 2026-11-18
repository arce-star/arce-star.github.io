/* Animated physical page turning: a rotating sheet with front and verso.
 * Desktop flips a right/left leaf across the book spine. Compact screens
 * have one full paper page per memory, with drag and touch-swipe support. */
const compactBook = window.matchMedia('(max-width:780px)');
const reducedBookMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let mobileBookIndex = 0;
let turnState = null;
let pointerTurn = null;
let suppressBookClickUntil = 0;
let previousCompact = compactBook.matches;

function pageLimits(){const count=bookCards().length;return {desktop:Math.max(1,Math.ceil(count/2)),mobile:Math.max(1,count)}}
function setPaperControls(){
 const limits=pageLimits();
 const isSmall=compactBook.matches;
 const pos=isSmall?mobileBookIndex:page;
 const total=isSmall?limits.mobile:limits.desktop;
 $('pageLabel').textContent=String(pos+1).padStart(2,'0')+' / '+String(total).padStart(2,'0');
 for(const el of [$('prev'),$('cornerPrev'),$('mobileCornerPrev')])el.disabled=pos<=0;
 for(const el of [$('next'),$('cornerNext'),$('mobileCornerNext')])el.disabled=pos>=total-1;
}
function fillMobilePaper(root,index){
 const list=bookCards(),item=list[index];
 root.replaceChildren();
 if(!item){root.textContent='No memories yet';return}
 const tags=(item.tags||[]).slice(0,4).map(t=>'<span># '+safe(t)+'</span>').join('');
 root.innerHTML='<div class="mobile-paper-head"><span>LITTLE KEEPSAKES</span><span>CHAPTER '+String(index+1).padStart(2,'0')+'</span></div>'+
 '<h2>'+safe(item.title)+'</h2><div class="mobile-paper-meta">'+safe(item.place)+'  /  '+safe(dateLabel(item.date))+'</div>'+
 '<div class="mobile-photo"><img src="'+safe(safeImage(item.image))+'" alt="'+safe(item.title)+'" draggable="false"></div>'+
 '<p class="mobile-note">'+safe(item.note)+'</p><div class="mobile-tags">'+tags+'</div>'+
 '<span class="mobile-page-num">'+String(index+1).padStart(2,'0')+' / '+String(list.length).padStart(2,'0')+'</span>';
 root.querySelector('img').addEventListener('click',()=>openDetail(item));
}
function renderMobileBook(){
 mobileBookIndex=Math.max(0,Math.min(mobileBookIndex,bookCards().length-1));
 fillMobilePaper($('mobilePage'),mobileBookIndex);
 setPaperControls();
}
function pageClone(el,side){
 const cloned=el.cloneNode(true);
 cloned.removeAttribute('id');
 cloned.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
 cloned.querySelectorAll('[tabindex],[role]').forEach(n=>{n.removeAttribute('tabindex');n.removeAttribute('role')});
 cloned.setAttribute('aria-hidden','true');
 cloned.classList.add('book-turn-face',side);
 return cloned;
}
function makeTurnSheet(stage,dir,front,back,isSmall){
 const sheet=document.createElement('div');
 sheet.className='book-turn-sheet '+(dir>0?'forward':'backward');
 sheet.setAttribute('aria-hidden','true');
 sheet.append(pageClone(front,'front'),pageClone(back,'back'));
 stage.classList.add('is-turning');
 stage.append(sheet);
 sheet.style.transition='none';
 sheet.style.transform='rotateY('+(isSmall&&dir<0?-180:0)+'deg)';
 return sheet;
}
function preparePaperTurn(dir){
 if(turnState||currentView!=='book'||document.querySelector('.overlay.open'))return null;
 const isSmall=compactBook.matches;
 const from=isSmall?mobileBookIndex:page;
 const target=from+dir;
 const limit=isSmall?pageLimits().mobile:pageLimits().desktop;
 if(target<0||target>=limit)return null;
 const stage=$(isSmall?'mobileBook':'desktopBook');
 let sheet;
 if(isSmall){
  const fromPaper=$('mobilePage').cloneNode(true);
  const targetPaper=document.createElement('article');targetPaper.className='mobile-paper';
  fillMobilePaper(targetPaper,target);
  const verso=document.createElement('div');verso.className='mobile-paper mobile-verse';
  verso.innerHTML='<strong>Little moments, forever.</strong><small>ONE PAGE AT A TIME</small>';
  sheet=makeTurnSheet(stage,dir,dir>0?fromPaper:targetPaper,verso,true);
  if(dir>0)fillMobilePaper($('mobilePage'),target);
 }else{
  const left=stage.querySelector(':scope > .page.left');
  const right=stage.querySelector(':scope > .page.right');
  const oldLeft=left.cloneNode(true),oldRight=right.cloneNode(true);
  page=target;renderBook();
  const nextLeft=left.cloneNode(true),nextRight=right.cloneNode(true);
  if(dir>0){left.replaceChildren(...Array.from(oldLeft.childNodes).map(n=>n.cloneNode(true)))}
  else{right.replaceChildren(...Array.from(oldRight.childNodes).map(n=>n.cloneNode(true)))}
  page=from;
  sheet=makeTurnSheet(stage,dir,dir>0?oldRight:oldLeft,dir>0?nextLeft:nextRight,false);
 }
 turnState={dir,from,target,stage,sheet,isSmall,progress:0,settling:false,timeout:null};
 $('pageLabel').textContent=String(from+1).padStart(2,'0')+' / '+String(limit).padStart(2,'0');
 return turnState;
}
function turnAngle(state,progress){
 if(state.isSmall&&state.dir<0)return -180+180*progress;
 return state.dir>0?-180*progress:180*progress;
}
function updateTurnProgress(state,progress){
 if(!state||turnState!==state)return;
 state.progress=Math.max(0,Math.min(1,progress));
 state.sheet.style.transform='rotateY('+turnAngle(state,state.progress).toFixed(2)+'deg)';
}
function completePaperTurn(state,commit){
 if(turnState!==state)return;
 if(state.timeout)clearTimeout(state.timeout);
 state.sheet.remove();state.stage.classList.remove('is-turning');
 turnState=null;
 if(state.isSmall){mobileBookIndex=commit?state.target:state.from;renderMobileBook()}
 else{page=commit?state.target:state.from;renderBook();setPaperControls()}
}
function settlePaperTurn(state,commit){
 if(!state||turnState!==state||state.settling)return;
 state.settling=true;
 const destination=commit?1:0;
 if(reducedBookMotion.matches){completePaperTurn(state,commit);return}
 const ms=Math.max(180,Math.round(720*Math.abs(destination-state.progress)));
 state.sheet.style.transition='transform '+ms+'ms cubic-bezier(.24,.7,.25,1)';
 state.sheet.addEventListener('transitionend',e=>{
  if(e.target===state.sheet&&e.propertyName==='transform')completePaperTurn(state,commit)
 },{once:true});
 state.timeout=setTimeout(()=>completePaperTurn(state,commit),ms+150);
 requestAnimationFrame(()=>updateTurnProgress(state,destination));
}
function turnPaper(dir){
 const s=preparePaperTurn(dir);
 if(!s)return;
 if(reducedBookMotion.matches){completePaperTurn(s,true);return}
 void s.sheet.offsetWidth;
 requestAnimationFrame(()=>settlePaperTurn(s,true));
}
function bookPointerDown(e){
 if(e.button!==0||!e.isPrimary||turnState||currentView!=='book')return;
 const stage=$(compactBook.matches?'mobileBook':'desktopBook');
 if(!stage.contains(e.target))return;
 pointerTurn={id:e.pointerId,startX:e.clientX,startY:e.clientY,stage,turn:null,blocked:false};
}
function bookPointerMove(e){
 const p=pointerTurn;if(!p||p.id!==e.pointerId||p.blocked)return;
 const dx=e.clientX-p.startX,dy=e.clientY-p.startY;
 if(!p.turn){
  if(Math.abs(dy)>Math.abs(dx)*1.1&&Math.abs(dy)>12){p.blocked=true;return}
  if(Math.abs(dx)<15||Math.abs(dx)<Math.abs(dy)*1.2)return;
  p.turn=preparePaperTurn(dx<0?1:-1);
  if(!p.turn){p.blocked=true;return}
 }
 if(e.cancelable)e.preventDefault();
 const width=Math.max(170,p.stage.clientWidth*(compactBook.matches?0.8:0.53));
 updateTurnProgress(p.turn,Math.min(1,Math.abs(dx)/width));
}
function bookPointerEnd(e,cancelled=false){
 const p=pointerTurn;if(!p||p.id!==e.pointerId)return;
 pointerTurn=null;
 if(!p.turn)return;
 const dx=e.clientX-p.startX;
 suppressBookClickUntil=Date.now()+450;
 const commit=!cancelled&&(p.turn.progress>=.29||Math.abs(dx)>85);
 settlePaperTurn(p.turn,commit);
}
document.addEventListener('DOMContentLoaded',()=>{
for(const stage of [$('desktopBook'),$('mobileBook')]){
 stage.addEventListener('pointerdown',bookPointerDown);
 stage.addEventListener('click',e=>{
  if(Date.now()<suppressBookClickUntil){e.preventDefault();e.stopImmediatePropagation()}
 },true);
}
window.addEventListener('pointermove',bookPointerMove,{passive:false});
window.addEventListener('pointerup',e=>bookPointerEnd(e,false));
window.addEventListener('pointercancel',e=>bookPointerEnd(e,true));
for(const [id,dir] of [['cornerPrev',-1],['cornerNext',1],['mobileCornerPrev',-1],['mobileCornerNext',1]]){
 $(id).addEventListener('click',()=>turnPaper(dir));
}
window.addEventListener('resize',()=>{
 if(compactBook.matches!==previousCompact){
  if(turnState)completePaperTurn(turnState,true);
  if(compactBook.matches)mobileBookIndex=Math.min(bookCards().length-1,page*2);
  else page=Math.floor(mobileBookIndex/2);
  previousCompact=compactBook.matches;
  if(currentView==='book'){renderBook();renderMobileBook()}
 }
});

});
