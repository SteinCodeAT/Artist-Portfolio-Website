import"./copyright-year-updater.Uy13ddcd.js";const f=window.matchMedia("(prefers-reduced-motion: reduce)").matches===!0;document.querySelectorAll(".image-wrapper").forEach((r,o)=>{const a=(f?50:100)+20*o,c=r.scrollHeight/a;r.style.animationDuration=`${c}s`,console.log(r.style.animationDuration)});document.addEventListener("DOMContentLoaded",()=>{const r=document.querySelectorAll(".project-image:not(.duplicate)"),o=Array.from(r).map(e=>e.src);let s=0,a=0,c=0,d=0;const l=100;function i({imageSrc:e}){const t=document.querySelector(".modal--image-wrapper");if(t===null){console.error("ERROR: Could not find modal-image-wrapper");return}t.innerHTML=`
                        <img src="${e}">
                    `}function u(){const e=document.querySelector(".modal");e?.classList.add("fade-out"),setTimeout(()=>{e?.classList.remove("fade-out"),e?.classList.remove("show")},500)}function m(){const e=document.querySelector(".modal--image-wrapper img");return e!==null?o.indexOf(e.src):0}function g(){const e=m();let t=e===0?o.length-1:e-1;i({imageSrc:o[t]})}function h(){const e=m();let t=e===o.length-1?0:e+1;i({imageSrc:o[t]})}document.querySelectorAll(".image-wrapper .project-image").forEach(e=>{e.addEventListener("click",t=>{document.querySelector(".modal")?.classList.add("show");const n=t.currentTarget;if(n===null){console.error("ERROR: Could not find target image");return}i({imageSrc:n.src})})}),document.querySelector(".modal--previous")?.addEventListener("click",()=>{h()}),document.querySelector(".modal--next")?.addEventListener("click",()=>{g()}),document.querySelector(".modal")?.addEventListener("touchstart",e=>{const t=e.targetTouches[0];s=t.screenX,a=t.screenY,c=0,d=0},!1),document.querySelector(".modal")?.addEventListener("touchend",e=>{const t=e.changedTouches[0];c=t.screenX,d=t.screenY;const n=c-s,p=d-a;n<0&&Math.abs(n)>l?g():n>0&&Math.abs(n)>l?h():Math.abs(p)>l&&u()},!1),document.querySelector(".modal")?.addEventListener("touchcancel",()=>{s=0,a=0,c=0,d=0},!1),document.querySelector(".modal--close")?.addEventListener("click",()=>{u()})});
