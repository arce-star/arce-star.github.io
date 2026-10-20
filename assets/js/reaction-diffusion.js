(()=>{
const W=192,H=120,N=W*H,Du=.16,Dv=.08,dt=1;let u=new Float32Array(N),v=new Float32Array(N),u2=new Float32Array(N),v2=new Float32Array(N),running=true,steps=0,drag=false,erase=false;
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d'),img=ctx.createImageData(W,H);canvas.width=W;canvas.height=H;
function reset(){u.fill(1);v.fill(0);for(let j=0;j<6;j++){const cx=W/2+(Math.random()-.5)*28,cy=H/2+(Math.random()-.5)*20,r=4+Math.random()*5;for(let y=0;y<H;y++)for(let x=0;x<W;x++){if((x-cx)*(x-cx)+(y-cy)*(y-cy)<r*r){const i=y*W+x;u[i]=.45+.08*Math.random();v[i]=.65+.18*Math.random()}}}steps=0;draw()}
function lap(arr,x,y){const xm=x?x-1:W-1,xp=x===W-1?0:x+1,ym=y?y-1:H-1,yp=y===H-1?0:y+1;return .2*(arr[y*W+xm]+arr[y*W+xp]+arr[ym*W+x]+arr[yp*W+x])+.05*(arr[ym*W+xm]+arr[ym*W+xp]+arr[yp*W+xm]+arr[yp*W+xp])-arr[y*W+x]}
function step(){const F=+$('f').value,K=+$('k').value;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,U=u[i],V=v[i],uvv=U*V*V;let nu=U+(Du*lap(u,x,y)-uvv+F*(1-U))*dt;let nv=V+(Dv*lap(v,x,y)+uvv-(F+K)*V)*dt;u2[i]=nu<0?0:nu>1?1:nu;v2[i]=nv<0?0:nv>1?1:nv}[u,u2]=[u2,u];[v,v2]=[v2,v];steps++}
function draw(){let mv=0;for(let i=0;i<N;i++){const z=Math.max(0,Math.min(1,(v[i]-u[i]+1)*.5));mv+=v[i];const q=Math.round(255*(1-z));const j=i*4;img.data[j]=q;img.data[j+1]=q;img.data[j+2]=q;img.data[j+3]=255}ctx.putImageData(img,0,0);$('steps').textContent=steps;$('mean-v').textContent=(mv/N).toFixed(3)}
function loop(){if(running){for(let i=0;i<+$('spf').value;i++)step();draw()}requestAnimationFrame(loop)}
function pos(e){const r=canvas.getBoundingClientRect();return [Math.floor((e.clientX-r.left)/r.width*W),Math.floor((e.clientY-r.top)/r.height*H)]}
function paint(e){const [cx,cy]=pos(e),rr=5;for(let dy=-rr;dy<=rr;dy++)for(let dx=-rr;dx<=rr;dx++){if(dx*dx+dy*dy>rr*rr)continue;const x=(cx+dx+W)%W,y=(cy+dy+H)%H,i=y*W+x;if(erase){v[i]=0;u[i]=1}else{v[i]=.9;u[i]=.25}}draw()}
canvas.addEventListener('mousedown',e=>{drag=true;erase=e.shiftKey||e.button===2;paint(e)});canvas.addEventListener('mousemove',e=>{if(drag)paint(e)});window.addEventListener('mouseup',()=>drag=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('play').onclick=()=>{running=!running;$('play').textContent=running?'暂停':'播放'};$('step').onclick=()=>{step();draw()};$('reset').onclick=reset;$('noise').onclick=()=>{for(let n=0;n<N*.01;n++){const i=(Math.random()*N)|0;v[i]=Math.min(1,v[i]+Math.random()*.8);u[i]=Math.max(0,u[i]-Math.random()*.4)}draw()};
for(const id of ['f','k'])$(id).oninput=()=>$(id+'-v').textContent=(+$(id).value).toFixed(4);$('spf').oninput=()=>$('spf-v').textContent=$('spf').value;
const presets={mitosis:[.0367,.0649],coral:[.0545,.062],worms:[.078,.061],spots:[.035,.065],chaos:[.026,.051],waves:[.014,.047]};document.querySelectorAll('[data-p]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('[data-p]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const [F,K]=presets[btn.dataset.p];$('f').value=F;$('k').value=K;$('f-v').textContent=F.toFixed(4);$('k-v').textContent=K.toFixed(4);reset()});
reset();requestAnimationFrame(loop);
})();
