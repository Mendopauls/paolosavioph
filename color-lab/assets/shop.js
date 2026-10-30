(()=>{"use strict";
const api=window.PSColorLab;if(!api)return;
const byId=id=>document.getElementById(id);
const money=cents=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(cents/100);
const safe=text=>String(text).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const productUrl=id=>"/color-lab/prodotto/?id="+encodeURIComponent(id);
const catalog=byId("catalog-grid"),product=byId("product-page"),cart=byId("cart-page");
const storageKey="ps-colorlab-cart-v1";
function isProduct(id){return typeof id==="string"&&Object.prototype.hasOwnProperty.call(api.byId,id);}
function getCart(){try{let items=JSON.parse(localStorage.getItem(storageKey)||"[]");return Array.isArray(items)?[...new Set(items.filter(isProduct))]:[];}catch{return [];}}
function setCart(items){try{localStorage.setItem(storageKey,JSON.stringify(items));}catch{}updateCount();}
function updateCount(){document.querySelectorAll(".count").forEach(node=>{node.textContent=String(getCart().length);});}
function add(id){if(!isProduct(id))return;let arr=getCart();if(!arr.includes(id))arr.push(id);setCart(arr);}
function sprite(row,column){return (column*100/3).toFixed(4)+"% "+(row*20).toFixed(4)+"%";}
function emailFor(subject){return "mailto:"+api.contact+"?subject="+encodeURIComponent(subject);}
function renderCatalog(){
if(!catalog)return;
catalog.innerHTML=api.products.map(p=>{
const box='<a class="photo" href="'+productUrl(p.id)+'" aria-label="Dettagli '+safe(p.title)+'" style="background-position:'+sprite(p.look,2)+'"></a>';
const body='<div class="card-content"><div class="tag">'+safe(p.tag)+' · '+p.n+' LUT</div><h2>'+safe(p.title)+'</h2><p>'+safe(p.description)+'</p><div class="card-bottom"><strong>'+money(p.price)+'</strong><a class="btn" href="'+productUrl(p.id)+'">Scopri il pack →</a></div></div>';
return '<article class="card '+(p.id==="complete"?"bundle":"")+'">'+box+body+'</article>';
}).join("");
}
function renderProduct(){
if(!product)return;
const requested=new URLSearchParams(location.search).get("id");
const p=api.byId[requested]||api.byId.complete;
document.title=p.title+" | Paolo Savio Color Lab";
byId("detail-info").innerHTML=
'<div class="tag">'+safe(p.tag)+' · '+p.n+' LUT</div>'+
'<h1>'+safe(p.title)+'</h1><p>'+safe(p.description)+'</p>'+
(p.id==="complete"?'<label for="sample-select">Fotografia dimostrativa</label><select id="sample-select" class="pick"><option value="0">Indoor Court · Tennistavolo</option><option value="1">Aquatic Blue · Nuoto</option><option value="2">Broadcast Neutral · Hockey</option><option value="3">Action Contrast · Calcio</option><option value="4">Outdoor Match · Stadio</option><option value="5">Editorial Sport · Ritratto squadra</option></select>':'')+
'<div class="spec"><div><span>Contenuto</span><strong>'+p.n+' file .cube</strong></div><div><span>Griglia</span><strong>3D 33³</strong></div><div><span>Input previsto</span><strong>SDR Rec.709</strong></div><div><span>Disponibilità</span><strong>In preparazione</strong></div></div>'+
'<div class="tag">Intensità del look</div><div class="pills"><button type="button" data-power="1">SOFT</button><button type="button" data-power="2">SIGNATURE</button><button type="button" data-power="3">BOLD</button></div>'+
'<div class="price">'+money(p.price)+' <small>prezzo indicativo</small></div>'+
'<div style="display:flex;flex-wrap:wrap;gap:9px"><button class="btn yellow" id="add-product" type="button">Aggiungi al carrello demo</button><a class="btn" href="/color-lab/carrello/">Visualizza carrello</a></div>'+
'<p class="hint" id="product-status" role="status">Il carrello è dimostrativo: nessun pagamento viene effettuato.</p>'+
'<p><a style="color:#facc15" href="'+emailFor("Color Lab — richiesta informazioni: "+p.title)+'">Chiedi informazioni su questo pack →</a></p>';
byId("product-uses").textContent=p.uses;
const before=byId("photo-before"),after=byId("photo-after"),line=byId("compare-divider"),range=byId("compare-slider"),stage=byId("compare-stage");
let row=p.look,power=2,pointer=null;
function position(){const x=Number(range.value);after.style.clipPath="inset(0 "+(100-x)+"% 0 0)";line.style.left=x+"%";stage.setAttribute("aria-valuenow",String(x));}
function draw(){before.style.backgroundPosition=sprite(row,0);after.style.backgroundPosition=sprite(row,power);document.querySelectorAll("[data-power]").forEach(b=>b.setAttribute("aria-pressed",String(Number(b.dataset.power)===power)));position();}
function updateAt(e){const rect=stage.getBoundingClientRect();if(!rect.width)return;range.value=String(Math.min(100,Math.max(0,Math.round((e.clientX-rect.left)*100/rect.width))));position();}
stage.addEventListener("pointerdown",e=>{if(!e.isPrimary||(e.pointerType==="mouse"&&e.button!==0))return;pointer=e.pointerId;stage.setPointerCapture(pointer);updateAt(e);});
stage.addEventListener("pointermove",e=>{if(e.pointerId===pointer)updateAt(e);});
function stop(e){if(e.pointerId!==pointer)return;pointer=null;if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);}
stage.addEventListener("pointerup",stop);stage.addEventListener("pointercancel",stop);stage.addEventListener("lostpointercapture",e=>{if(pointer===e.pointerId)pointer=null;});
stage.addEventListener("keydown",e=>{let x=Number(range.value);if(e.key==="ArrowLeft"||e.key==="ArrowDown")x-=2;else if(e.key==="ArrowRight"||e.key==="ArrowUp")x+=2;else if(e.key==="Home")x=0;else if(e.key==="End")x=100;else return;e.preventDefault();range.value=String(Math.max(0,Math.min(100,x)));position();});
range.addEventListener("input",position);
document.querySelectorAll("[data-power]").forEach(b=>b.addEventListener("click",()=>{power=Number(b.dataset.power);draw();}));
const select=byId("sample-select");if(select)select.addEventListener("change",()=>{row=Number(select.value);draw();});
byId("add-product").addEventListener("click",()=>{add(p.id);byId("product-status").textContent="Aggiunto al carrello demo. Nessun acquisto o pagamento effettuato.";});
draw();
}
function renderCart(){
if(!cart)return;
const items=getCart().map(id=>api.byId[id]);
if(items.length===0){cart.innerHTML='<div class="info"><strong>Il carrello è vuoto.</strong><p>Seleziona i pacchetti dal catalogo. Non puoi ancora acquistare.</p><a class="btn yellow" href="/color-lab/catalogo/">Esplora prodotti</a></div>';return;}
const total=items.reduce((n,p)=>n+p.price,0);
cart.innerHTML='<div class="cart-list">'+items.map(p=>'<div class="cart-row"><div><strong>'+safe(p.title)+'</strong><p>'+p.n+' LUT .cube</p></div><div class="cart-side"><b>'+money(p.price)+'</b><button type="button" class="remove" data-remove="'+p.id+'" aria-label="Rimuovi '+safe(p.title)+'">Rimuovi</button></div></div>').join("")+'</div>'+
'<div class="total"><span>Totale indicativo</span><span>'+money(total)+'</span></div>'+
'<div class="info"><strong>Checkout non ancora disponibile</strong><p>Questo carrello serve per valutare i prodotti. Nessun pagamento viene elaborato e nessun file viene consegnato. I prezzi saranno confermati prima del lancio.</p></div>'+
'<a class="btn yellow" href="'+emailFor("Color Lab — avvisami al lancio: "+items.map(p=>p.title).join(", "))+'">Chiedi informazioni sulla disponibilità →</a> <a class="btn" href="/color-lab/catalogo/">Continua a esplorare</a>'+
'<p class="hint">La selezione è salvata solo nel tuo browser. Non viene inviata a server esterni.</p>';
cart.querySelectorAll("[data-remove]").forEach(button=>button.addEventListener("click",()=>{setCart(getCart().filter(id=>id!==button.dataset.remove));renderCart();}));
}
updateCount();renderCatalog();renderProduct();renderCart();
})();