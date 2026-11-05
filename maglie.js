/* Evivora · maglie dei club (0.4.2.4, G1a): copia invariata di Evivora-scambio risposte/012-volti-stemmi-maglie/maglie.js (approvata).
   Nel gioco la usa volti.js per la maglia dei giocatori (colori del club). Solo disegno, nessun numero casuale. */
/* EVIVORA V1 — maglie procedurali fronte e retro in SVG.
 * magliaSVG({colori, motivo, retro=false, numero, nome}) => SVG string.
 * propostaMaglie(seme) => {casa,trasferta}, con palette cromatiche distinte.
 */
(function(root){
  'use strict';
  const PATTERNS=['unita','verticali','orizzontali','fascia','meta','diagonale','maniche','quartieri','gessato'];
  const COLORS=[['#07533a','#f1dfad','#faf7ef'],['#b33b36','#f7e4bf','#263c63'],['#28509a','#f1f4ff','#f3c65d'],['#673c92','#f0e5f7','#e9b74f'],['#d69b22','#153b2d','#ffffff'],['#145f62','#f9ead3','#992e46'],['#983c5b','#f9e7ed','#1b3851'],['#844e2a','#f7dfb4','#f5f5f2'],['#2d5c34','#ecf4d4','#b6ad31'],['#262d3d','#f7e8d2','#ffb952']];
  function seedPick(s,slot,length){let x=((Number(s)||0)>>>0)^Math.imul(slot,0x9e3779b1);x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);return((x^(x>>>16))>>>0)%length;}
  function safeColor(s,f){return typeof s==='string'&&(/^(#[a-f\d]{6})$/i.test(s)||/^var\(--ev-[\w-]+\)$/.test(s))?s:f;}
  function clean(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function luminance(c){if(!/^#[0-9a-f]{6}$/i.test(c))return .5;const rgb=[1,3,5].map(i=>{const n=parseInt(c.slice(i,i+2),16)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];}
  function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
  function magliaSVG(opts){
    const o=opts||{},colors=o.colori||{},c1=safeColor(colors.primario||colors[0],'#07533a'),c2=safeColor(colors.secondario||colors[1],'#f1dfad'),c3=safeColor(colors.dettaglio||colors[2],'#f5f5f5');
    const motif=PATTERNS.includes(o.motivo)?o.motivo:'unita';const rear=!!o.retro;
    const v=rear?'dietro':'davanti',cloth='M49 14L68 8Q90 25 112 8L132 14L168 43L149 76L133 64V158Q90 168 47 158V64L31 76L12 43Z';
    const pattern={
      unita:'',verticali:Array.from({length:6},(_,i)=>`<rect x="${43+i*19}" y="0" width="10" height="174" fill="${c2}"/>`).join(''),
      orizzontali:Array.from({length:7},(_,i)=>`<rect x="0" y="${28+i*23}" width="180" height="11" fill="${c2}"/>`).join(''),
      fascia:`<rect x="0" y="65" width="180" height="31" fill="${c2}"/>`,meta:`<rect x="90" y="0" width="90" height="175" fill="${c2}"/>`,
      diagonale:`<path d="M7 150L130 -5h40L47 175Z" fill="${c2}"/>`,
      maniche:`<path d="M0 4L60 4 56 88 0 88ZM116 4h64v84h-56Z" fill="${c2}"/>`,
      quartieri:`<path d="M90 0h90v90H90ZM0 90h90v90H0Z" fill="${c2}"/>`,
      gessato:Array.from({length:16},(_,i)=>`<path d="M${10+i*12} 0v180" stroke="${c2}" stroke-width="2" opacity=".7"/>`).join('')
    }[motif];
    const id='mj'+[c1,c2,motif,v].join('').replace(/[^a-z0-9]/gi,'').slice(0,45);
    const n=String(o.numero??'10').replace(/[^0-9]/g,'').slice(0,2)||'10';
    const name=String(o.nome||'EVIVORA').toUpperCase().replace(/[^A-ZÀ-Ý0-9 .'-]/g,'').slice(0,14);
    const print=contrast(c1,c3)>=3?c3:(contrast(c1,'#ffffff')>contrast(c1,'#142d22')?'#ffffff':'#142d22');
    const center=rear?`<path d="M48 65H132V130H48Z" fill="${c1}" opacity=".68"/><text x="90" y="79" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="12" font-weight="800" fill="${print}">${clean(name)}</text><text x="90" y="120" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="51" font-weight="900" fill="${print}">${n}</text>`:
      `<path d="M83 38Q90 42 97 38" fill="none" stroke="${c3}" stroke-width="2"/><circle cx="115" cy="52" r="9" fill="${c3}" opacity=".9"/><path d="M111 51l4-4 4 4-4 5Z" fill="${c1}"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" role="img" aria-label="Maglia ${v}, motivo ${motif}"><defs><clipPath id="${id}"><path d="${cloth}"/></clipPath></defs><path d="${cloth}" fill="${c1}" stroke="${c2}" stroke-width="2.7" stroke-linejoin="round"/><g clip-path="url(#${id})">${pattern}</g><path d="M68 8Q90 24 112 8L107 25Q90 36 73 25Z" fill="${c3}" opacity=".97"/><path d="M31 76L48 62M149 76L132 62M47 157Q90 163 133 157" fill="none" stroke="${c3}" stroke-width="3" opacity=".8"/>${center}<path d="${cloth}" fill="none" stroke="${c1}" stroke-width="2" opacity=".55"/></svg>`;
  }
  function propostaMaglie(seme){
    const s=(Number(seme)||0)>>>0,p=COLORS[seedPick(s,1,COLORS.length)],motif=PATTERNS[seedPick(s,2,PATTERNS.length)];
    // Trasferta costruita sulla terza/seconda tinta chiara o scura, con contrasto misurabile.
    const home={colori:{primario:p[0],secondario:p[1],dettaglio:p[2]},motivo:motif};
    const awayMain=luminance(p[1])>.5?'#f5f4e9':'#152b3e';
    const awayAccent=contrast(awayMain,p[0])>=3?p[0]:(luminance(awayMain)>.5?'#1e4734':'#f1dcb3');
    const away={colori:{primario:awayMain,secondario:awayAccent,dettaglio:awayAccent},motivo:PATTERNS[(PATTERNS.indexOf(motif)+3)%PATTERNS.length]};
    return {casa:home,trasferta:away};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={magliaSVG,propostaMaglie};
  if(root){root.magliaSVG=magliaSVG;root.propostaMaglie=propostaMaglie;}
})(typeof window!=='undefined'?window:undefined);
