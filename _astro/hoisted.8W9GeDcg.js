import"./copyright-year-updater.Uy13ddcd.js";function m(r){var a=Math.random()*Math.PI*2,t=Math.random()*r,e=t*Math.cos(a),n=t*Math.sin(a);return{x:e,y:n}}document.addEventListener("DOMContentLoaded",function(){const r=document.querySelector(".dots-containter"),a=170;for(var t=0;t<a;t++){let e=document.createElement("div");e.classList.add("dot");let n=Math.random()*5+8,s=Math.random(),c=m(45),l=50+c.x,i=50+c.y,d=Math.random()*5,o=3+Math.random()*5;e.style.width=`${n}px`,e.style.height=`${n}px`,e.style.opacity=s,e.style.left=`${l}%`,e.style.top=`${i}%`,e.style.animation=`fadeEffect ${o}s infinite ${d}s`,r.appendChild(e)}});document.addEventListener("DOMContentLoaded",function(){const r=document.querySelector(".line-container"),a=70;for(let t=0;t<a;t++){let e=document.createElement("div");e.classList.add("line");let n=Math.random()*50+8,s=Math.random(),c=Math.random()*40-30,l=(t%2===0?1:-1)*(2*t);e.style.height=n+"px",e.style.opacity=s,e.style.transform=`translateY(${c}px) rotateY(${l}deg)`,r.appendChild(e)}});document.addEventListener("DOMContentLoaded",()=>{function r(){const a=document.querySelectorAll(".stack-item:not(.passed) .stack-item--image-area");for(let t=a.length-1;t>=0;t--)a[t].style.transform=`rotate(-${2*(a.length-t-1)}deg)`}r(),document.querySelector(".stack-item:last-of-type").classList.add("focus"),window.addEventListener("scroll",()=>{const a=document.querySelector(".banner-section"),t=document.querySelector(".stack-area");if(a===null){console.error("Could not find .banner-section");return}const e=a.getBoundingClientRect().bottom/(window.innerHeight*.8);if(e>0)return;const n=Math.floor(e)*-1;if(n==t.dataset.currentFocusIndex)return;t.dataset.currentFocusIndex=n;const s=Array.from(document.querySelectorAll(".stack-item"));if(n>s.length)return;let c=s.length-n;const l=s.slice(c+1,t.length),i=s[c],d=s.slice(0,c);l.forEach(o=>{o.classList.remove("focus"),o.classList.add("passed"),o.classList.remove("display-at-top"),o.querySelector(".stack-item--image-area").style.transform=null}),i.classList.remove("passed"),i.classList.add("focus"),setTimeout(()=>{i.classList.add("display-at-top"),console.log("focus")},500),d.forEach(o=>{o.classList.remove("focus"),o.classList.remove("passed"),o.classList.remove("display-at-top")}),r()})});