/* Evivora · stemmi dei club (0.4.2.3, R6a): copia invariata di Evivora-scambio risposte/012-volti-stemmi-maglie/stemmi.js (approvata).
   Nel gioco: stemmaSVG(id del club, {colori:{primario: colore del club, secondario}, iniziali}). Solo disegno, nessun numero casuale. */
/* EVIVORA V1 — stemmi SVG originali, deterministici, modificabili per componenti.
   stemmaSVG(seme, {colori, forma, simbolo, iniziali, divisione}) => SVG string. */
(function (root) {
  'use strict';
  const PALETTES=[['#07533a','#e7c77b'],['#274f9b','#e3ebfc'],['#b63f32','#f8d8a1'],['#623d94','#e8d7fa'],['#80552f','#f3dcab'],['#146b60','#f8e9c7'],['#b9871c','#193e30'],['#9f2f5a','#fbdbeb'],['#374c6b','#f0c98b'],['#546b2d','#f9e9d3']];
  const SHAPES=['scudo','tondo','gotico','esagono','ovale','classico'];
  const ICONS=['stella','pallone','torre','aquila','leone','montagna','alloro','corona','onda','sole'];
  const DIVISIONS=['unita','verticale','orizzontale','diagonale','croce','righe'];
  function pick(seed,index,size){let x=((Number(seed)||0)>>>0)^Math.imul(index,0x9e3779b1);x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);return((x^(x>>>16))>>>0)%size;}
  function color(s,f){return typeof s==='string'&&(/^(#[a-f\d]{6})$/i.test(s)||/^var\(--ev-[\w-]+\)$/.test(s))?s:f;}
  function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  const path={
    scudo:'M60 5L109 17V64Q108 96 60 117Q12 96 11 64V17Z',
    tondo:'M60 6C90 6 113 30 113 60S90 114 60 114S7 90 7 60S30 6 60 6Z',
    gotico:'M12 11L108 11V59Q103 87 60 118Q17 87 12 59Z',
    esagono:'M60 4L107 29V92L60 119L13 92V29Z',
    ovale:'M60 6C92 6 111 29 111 60S92 114 60 114S9 91 9 60S28 6 60 6Z',
    classico:'M60 7L102 21L105 63Q105 94 60 115Q15 94 15 63L18 21Z'
  };
  const icon={
    stella:'<path d="M60 31l7 18 20 1-15 12 5 20-17-11-17 11 5-20-15-12 20-1Z" fill="currentColor"/>',
    pallone:'<circle cx="60" cy="59" r="25" fill="none" stroke="currentColor" stroke-width="5"/><path d="M60 46l11 8-4 13H53l-5-13Zm0 0V34m11 20 13-3M67 67l7 14m-21-14-10 14m5-27-12-4" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>',
    torre:'<path d="M39 82V45h6v-9h8v9h13v-9h8v9h7v37H39Zm9 0V69h24v13" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M55 57h11" stroke="currentColor" stroke-width="5"/>',
    aquila:'<path d="M60 37l-7 13-15-7-15 8 20 12-12 14 23-4 6 11 6-11 23 4-12-14 20-12-15-8-15 7Z" fill="currentColor"/><path d="M58 35l2-9 9 5-9 7" fill="currentColor"/>',
    leone:'<path d="M41 39l-11-6 1 17-6 13 10 9 2 16 14-4 9 9 9-9 15 4 1-16 10-9-6-13 1-17-11 6-19-10Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M43 55l10-4 7 7 7-7 10 4-5 16-12 12-12-12Z" fill="currentColor"/><path d="M47 59h1m24 0h1" stroke="var(--ev-surface)" stroke-width="5"/>',
    montagna:'<path d="M25 84 47 49l9 15 12-29 28 49H25Z" fill="currentColor"/><path d="m60 57 8-22 13 22-13-8Z" fill="var(--ev-surface)"/>',
    alloro:'<path d="M57 88Q34 77 33 44M63 88Q86 77 87 44" fill="none" stroke="currentColor" stroke-width="4"/><path d="M35 47q-16-7-11-17 13 1 15 13M36 59q-16-5-16-15 16-2 19 12M43 72q-17-3-18-14 15-2 21 10M85 47q16-7 11-17-13 1-15 13M84 59q16-5 16-15-16-2-19 12M77 72q17-3 18-14-15-2-21 10" fill="currentColor"/><path d="M49 53l11-17 11 17-11 15Z" fill="currentColor"/>',
    corona:'<path d="M30 49l8 10 9-21 13 18 13-18 9 21 8-10-7 32H37l-7-32Z" fill="currentColor"/><path d="M36 85h48" stroke="currentColor" stroke-width="5"/>',
    onda:'<path d="M26 54q12-19 26 0t26 0 16 0M26 68q12-19 26 0t26 0 16 0M26 82q12-19 26 0t26 0 16 0" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>',
    sole:'<circle cx="60" cy="60" r="18" fill="currentColor"/><path d="M60 28v10m0 44v10M28 60h10m44 0h10M38 38l8 8m28 28 8 8m0-44-8 8m-28 28-8 8" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>'
  };
  function stemmaSVG(seme,opts){
    const o=opts||{},s=(Number(seme)||0)>>>0;
    const pal=PALETTES[pick(s,1,PALETTES.length)],c1=color(o.colori?.primario||o.colori?.[0],pal[0]),c2=color(o.colori?.secondario||o.colori?.[1],pal[1]);
    const shape=SHAPES.includes(o.forma)?o.forma:SHAPES[pick(s,2,SHAPES.length)];
    const symbol=ICONS.includes(o.simbolo)?o.simbolo:ICONS[pick(s,3,ICONS.length)];
    const split=DIVISIONS.includes(o.divisione)?o.divisione:DIVISIONS[pick(s,4,DIVISIONS.length)];
    const initials=String(o.iniziali===undefined?'':o.iniziali).toUpperCase().replace(/[^A-ZÀ-Ý0-9]/g,'').slice(0,3);
    const id='st'+s.toString(36)+'x'+SHAPES.indexOf(shape)+'y'+DIVISIONS.indexOf(split);
    const stripes=split==='verticale'?'<path d="M60 0h60v120H60Z" fill="'+c2+'"/>':split==='orizzontale'?'<path d="M0 61h120v59H0Z" fill="'+c2+'"/>':split==='diagonale'?'<path d="M-10 120L108-7h30L20 127Z" fill="'+c2+'"/>':split==='croce'?'<path d="M50 0h20v120H50ZM0 50h120v20H0Z" fill="'+c2+'"/>':split==='righe'?'<path d="M26 0h15v120H26Zm31 0h15v120H57Zm31 0h15v120H88Z" fill="'+c2+'"/>':'';
    const letter=initials?`<rect x="24" y="84" width="72" height="19" rx="6" fill="${c1}" stroke="${c2}" stroke-width="1.2"/><text x="60" y="97" font-size="12" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-weight="900" letter-spacing="2" fill="${c2}">${escape(initials)}</text>`:'';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 125" role="img" aria-label="Stemma illustrativo, ${shape}, ${symbol}"><defs><clipPath id="${id}"><path d="${path[shape]}"/></clipPath></defs><path d="${path[shape]}" fill="${c1}" stroke="${c2}" stroke-width="5"/><g clip-path="url(#${id})">${stripes}<path d="${path[shape]}" fill="none" stroke="${c2}" stroke-width="8" opacity=".5"/></g><g style="color:${split==='unita'?c2:c1}" stroke-linecap="round" stroke-linejoin="round">${icon[symbol]}</g>${letter}<path d="${path[shape]}" fill="none" stroke="${c2}" stroke-width="3"/></svg>`;
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={stemmaSVG};
  if(root)root.stemmaSVG=stemmaSVG;
})(typeof window!=='undefined'?window:undefined);
