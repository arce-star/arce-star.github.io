(()=>{
const W=144,H=90,N=W*H;let a=new Float32Array(N),b=new Float32Array(N),running=false,steps=0,kernel=[],drag=false,erase=false;
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d'),img=ctx.createImageData(W,H);
canvas.width=W;canvas.height=H;
const controls={r:$('r'),mu:$('mu'),sig:$('sig'),dt:$('dt'),spf:$('spf')};
function rebuildKernel(){const R=+controls.r.value;kernel=[];let sum=0;for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){const q=Math.hypot(dx,dy)/R;if(q<=1&&q>0){const w=Math.exp(-4*(q-.5)*(q-.5));kernel.push([dx,dy,w]);sum+=w}}for(const k of kernel)k[2]/=sum;$('r-v').textContent=R}
function seed(){a.fill(0);const cx=W/2,cy=H/2;for(let n=0;n<9;n++){const ox=(Math.random()-.5)*22,oy=(Math.random()-.5)*16,rr=3+Math.random()*6;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const d=Math.hypot(x-(cx+ox),y-(cy+oy));if(d<rr)a[y*W+x]=Math.max(a[y*W+x],.35+.55*Math.exp(-d*d/(rr*rr*.5)))}}steps=0;draw()}
function step(){const mu=+controls.mu.value,sig=+controls.sig.value,dt=+controls.dt.value;for(let y=0;y<H;y++)for(let x=0;x<W;x++){let u=0;for(const [dx,dy,w] of kernel){let xx=x+dx,yy=y+dy;if(xx<0)xx+=W;else if(xx>=W)xx-=W;if(yy<0)yy+=H;else if(yy>=H)yy-=H;u+=a[yy*W+xx]*w}const g=2*Math.exp(-((u-mu)*(u-mu))/(2*sig*sig))-1;let v=a[y*W+x]+dt*g;b[y*W+x]=v<0?0:v>1?1:v}[a,b]=[b,a];steps++}
function draw(){let mass=0;for(let i=0;i<N;i++){const v=a[i];mass+=v;const q=Math.max(0,Math.min(255,Math.round((1-v)*255)));const j=i*4;img.data[j]=q;img.data[j+1]=q;img.data[j+2]=q;img.data[j+3]=255}ctx.putImageData(img,0,0);$('steps').textContent=steps;$('mass').textContent=(mass/N).toFixed(3)}
function loop(){if(running){for(let i=0;i<+controls.spf.value;i++)step();draw()}requestAnimationFrame(loop)}
function pos(e){const r=canvas.getBoundingClientRect();return [Math.floor((e.clientX-r.left)/r.width*W),Math.floor((e.clientY-r.top)/r.height*H)]}
function paint(e){const [cx,cy]=pos(e),rad=4;for(let dy=-rad;dy<=rad;dy++)for(let dx=-rad;dx<=rad;dx++){if(dx*dx+dy*dy>rad*rad)continue;let x=(cx+dx+W)%W,y=(cy+dy+H)%H;const i=y*W+x;a[i]=erase?0:Math.max(a[i],.85)}draw()}
canvas.addEventListener('mousedown',e=>{drag=true;erase=e.shiftKey||e.button===2;paint(e)});canvas.addEventListener('mousemove',e=>{if(drag)paint(e)});window.addEventListener('mouseup',()=>drag=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('play').onclick=()=>{running=!running;$('play').textContent=running?'暂停':'播放'};$('step').onclick=()=>{step();draw()};$('seed').onclick=seed;$('clear').onclick=()=>{a.fill(0);steps=0;draw()};
controls.r.oninput=rebuildKernel;for(const [id,out,d] of [['mu','mu-v',3],['sig','sig-v',3],['dt','dt-v',2]])controls[id].oninput=()=>$(out).textContent=(+controls[id].value).toFixed(d);controls.spf.oninput=()=>$('spf-v').textContent=controls.spf.value;
const presets={balanced:[9,.15,.025,.10],wide:[11,.18,.045,.08],sharp:[8,.145,.015,.08],chaos:[7,.22,.055,.12]};document.querySelectorAll('[data-preset]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('[data-preset]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const p=presets[btn.dataset.preset];controls.r.value=p[0];controls.mu.value=p[1];controls.sig.value=p[2];controls.dt.value=p[3];rebuildKernel();$('mu-v').textContent=p[1].toFixed(3);$('sig-v').textContent=p[2].toFixed(3);$('dt-v').textContent=p[3].toFixed(2);seed()});
rebuildKernel();seed();requestAnimationFrame(loop);
})();
