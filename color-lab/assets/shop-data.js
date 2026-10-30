(()=>{"use strict";
const products=[
{id:"complete",title:"SPORT COLOR LUTs — Volume 01",short:"La collezione completa",price:2490,n:18,look:0,tag:"COLLEZIONE COMPLETA",description:"Sei look cromatici originali per lo sport, ciascuno in Soft, Signature e Bold.",uses:"Indoor e outdoor, nuoto, hockey, azione, storytelling"},
{id:"indoor",title:"Indoor Court",short:"Palazzetti e sport indoor",price:690,n:3,look:0,tag:"INDOOR",description:"Contrasto controllato per le luci complesse dei palazzetti.",uses:"Pallamano, basket, futsal, tennistavolo"},
{id:"aquatic",title:"Aquatic Blue",short:"Sport acquatici",price:690,n:3,look:1,tag:"AQUATIC",description:"Toni blu e ciano per piscine e illuminazione mista.",uses:"Nuoto, pallanuoto, tuffi"},
{id:"broadcast",title:"Broadcast Neutral",short:"Resa naturale",price:690,n:3,look:2,tag:"BROADCAST",description:"Intervento contenuto per reportage, interviste e contenuti TV.",uses:"Hockey, reportage, interviste"},
{id:"action",title:"Action Contrast",short:"Highlights incisivi",price:690,n:3,look:3,tag:"ACTION",description:"Contrasto più pronunciato per le azioni sportive.",uses:"Calcio, futsal, reels, highlights"},
{id:"outdoor",title:"Outdoor Match",short:"Stadio e luce naturale",price:690,n:3,look:4,tag:"OUTDOOR",description:"Colori controllati per campi, stadi e riprese all'aperto.",uses:"Calcio, competizioni outdoor"},
{id:"editorial",title:"Editorial Sport",short:"Racconto sportivo",price:690,n:3,look:5,tag:"EDITORIAL",description:"Una direzione editoriale per ritratti, squadre e storytelling.",uses:"Ritratti sportivi, squadre, reportage"}
];
window.PSColorLab=Object.freeze({products:products,byId:Object.fromEntries(products.map(x=>[x.id,x])),atlas:"/color-lab/assets/sport-lut-v12-lightroom.webp",contact:"info@paolosavio.eu",available:false});
})();