import"./copyright-year-updater.Uy13ddcd.js";function y(l){var o=Math.random()*Math.PI*2,n=Math.random()*l,s=n*Math.cos(o),c=n*Math.sin(o);return{x:s,y:c}}function p(l){let o=l*Math.random(),n=l*Math.random();return o=Math.random()>.5?o*-1:o,n=Math.random()>.5?n*-1:n,{x:o,y:n}}function f(l,o,n,s){const c=document.querySelector(`.${l}`);for(var m=0;m<o;m++){let e=document.createElement("div");e.classList.add("dot");let t=Math.random()*5+8,d=Math.random(),r=n(s),i=50+r.x,a=50+r.y,h=Math.random()*5,u=3+Math.random()*5;e.style.width=`${t}px`,e.style.height=`${t}px`,e.style.opacity=d,e.style.left=`${i}%`,e.style.top=`${a}%`,e.style.animation=`fadeEffect ${u}s infinite ${h}s`,c.appendChild(e)}}document.addEventListener("DOMContentLoaded",function(){f("circle-dots-container",170,y,45),f("banner-dots-container",20,p,50)});document.addEventListener("DOMContentLoaded",function(){const l=document.querySelector(".line-container"),o=70;for(let n=0;n<o;n++){let s=document.createElement("div");s.classList.add("line");let c=Math.random()*50+8,m=Math.random(),e=Math.random()*40-30,t=(n%2===0?1:-1)*(2*n);s.style.height=c+"px",s.style.opacity=m,s.style.transform=`translateY(${e}px) rotateY(${t}deg)`,l.appendChild(s)}});document.addEventListener("DOMContentLoaded",()=>{const l=!window.matchMedia("only screen and (min-width: 768px)").matches;function o(){const e=document.querySelectorAll(".stack-item:not(.passed) .stack-item--image-area");for(let t=e.length-1;t>=0;t--){let d="";const r=e.length-t;l?d=`translate(${r*10}px, ${r*2}px)`:d=`rotate(-${.75*(r-1)}deg)`,e[t].style.transform=d}}o(),document.querySelector(".stack-item:last-of-type").classList.add("focus");const n=document.querySelector(".banner-section"),s=document.querySelector(".stack-area"),c=Array.from(document.querySelectorAll(".stack-item"));function m({index:e}){if(e==s.dataset.currentFocusIndex||(console.log(e),e>c.length||e<0))return;s.dataset.currentFocusIndex=e;let t=c.length-e;console.log("index ",e),console.log("stackItems.length, ",c.length),console.log("reversedIndex ",t);const d=c.slice(t+1,s.length),r=c[t],i=c.slice(0,t);d.forEach(a=>{a.classList.remove("focus"),a.classList.add("passed"),a.classList.remove("display-at-top"),a.querySelector(".stack-item--image-area").style.transform=null}),r.classList.remove("passed"),r.classList.add("focus"),setTimeout(()=>{r.classList.add("display-at-top")},500),i.forEach(a=>{a.classList.remove("focus"),a.classList.remove("passed"),a.classList.remove("display-at-top")}),o()}if(l){let e=0,t=0;const d=25;document.querySelector(".stack-area")?.addEventListener("touchstart",r=>{const i=r.targetTouches[0];e=i.screenX,i.screenY,t=0},!1),document.querySelector(".stack-area")?.addEventListener("touchend",r=>{const i=r.changedTouches[0];t=i.screenX,i.screenY;const a=t-e;let h=s.dataset.currentFocusIndex;if(h===void 0?h=0:h=parseInt(h),a<0&&Math.abs(a)>d){let u=h+1;u>c.length&&(u=1),m({index:u})}else if(a>0&&Math.abs(a)>d){let u=h-1;u<=0&&(u=c.length),m({index:u})}},!1),document.querySelector(".stack-area")?.addEventListener("touchcancel",()=>{e=0,t=0},!1)}else window.addEventListener("scroll",()=>{const e=n.getBoundingClientRect().bottom/(window.innerHeight*.8);if(e>0)return;const t=Math.floor(e)*-1;m({index:t})})});
