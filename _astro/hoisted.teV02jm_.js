import"./copyright-year-updater.Uy13ddcd.js";function c({imageSrc:r}){const t=document.querySelector(".modal--image-wrapper");if(t===null){console.error("ERROR: Could not find modal-image-wrapper");return}t.innerHTML=`
                        <img src="${r}">
                    `}document.querySelectorAll(".image-wrapper .project-image").forEach(r=>{r.addEventListener("click",t=>{document.querySelector(".modal")?.classList.add("show");const o=t.currentTarget;if(o===null){console.error("ERROR: Could not find target image");return}c({imageSrc:o.src})})});document.addEventListener("DOMContentLoaded",()=>{const r=document.querySelectorAll(".project-image:not(.duplicate)"),t=Array.from(r).map(e=>e.src);function o(){const e=document.querySelector(".modal--image-wrapper img");return e!==null?t.indexOf(e.src):0}document.querySelector(".modal--previous")?.addEventListener("click",()=>{const e=o();let n=e===0?t.length-1:e-1;c({imageSrc:t[n]})}),document.querySelector(".modal--next")?.addEventListener("click",()=>{const e=o();let n=e===t.length-1?0:e+1;c({imageSrc:t[n]})}),document.querySelector(".modal--close")?.addEventListener("click",()=>{const e=document.querySelector(".modal");e?.classList.add("fade-out"),setTimeout(()=>{e?.classList.remove("fade-out"),e?.classList.remove("show")},500)})});