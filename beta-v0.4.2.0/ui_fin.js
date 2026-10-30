/* ================= INTERFACCIA: SOCIETÀ, BANCA, BILANCIO ================= */
let budDraft=null, bnegOn=false;
const loanForm={amt:200000,n:28,peg:'none'};
const pctTxt=x=>fmtV(Math.round(x*10)/10)+'%';
const signK=n=>Math.abs(n)<500?'0k':(n>0?'+':'')+kcr(n);

/* ---------- Società: patrimonio (in Conti), Banca (azionisti, reputazione, finanziamenti), Strutture ---------- */
function ownBar(b){ return `<div class="own"><div class="own-bar" role="img" aria-label="Banca ${pctTxt(b)}, presidente ${pctTxt(100-b)}"><span class="own-b" style="width:${b}%"></span><span class="own-p" style="width:${100-b}%"></span><i style="left:25%"><em>veto</em></i><i style="left:51%"><em>maggioranza</em></i></div>
  <div class="own-lg"><span><b class="sw sw-b"></b>Banca ${pctTxt(b)}</span><span><b class="sw sw-p"></b>Presidente ${pctTxt(100-b)}</span></div></div>`; }
function ultHTML(t){ const u=t.ult; if(!u||u.st!=='on') return '';
  const c=ultConds(t), when=ultWhen(u);
  return `<div class="ult"><p class="eyebrow">⚠ Ultimatum della banca</p><p>Motivo: ${esc(u.why)}. Verifica ${when}: se una condizione non è rispettata vieni licenziato.</p>
   <ul class="conds">${c.map(x=>`<li class="${x.ok?'ok':'ko'}">${x.ok?'✓':'✗'} ${esc(x.t)}</li>`).join('')}</ul></div>`; }
const ultWhen = u=>u.s>G.season?`alla ${u.due}ª giornata della prossima stagione`:u.due>=14?'a fine stagione':`dopo la ${u.due}ª giornata`;
/* Conti › patrimonio: valore della società e come si compone, storico a fine stagione */
function patrimonioHTML(t){
  const f=finInit(t), nv=netValue(t), fac=facTotal(t), sq=squadValue(t), bd=bankDebt(t), arr=arrears(t);
  return `<div class="card"><p class="eyebrow">Valore della società</p><p class="big ${nv<0?'bad':''}">${kcr(nv)} <small>cr</small></p>
   <p class="muted">Strutture ${kcr(fac)} + cartellini ${kcr(sq)} (${t.pl.length} giocatori a valore di mercato) + cassa − debiti ${kcr(clubDebts(t))}${bd+arr>0||t.cash<0?` (banca ${kcr(f.loans.reduce((s,l)=>s+l.pr,0))}${f.ins?` · rate non pagate ${kcr(f.ins)}`:''}${arr?` · stipendi arretrati ${kcr(arr)}`:''}${t.cash<0?` · scoperto ${kcr(-t.cash)}`:''})`:''}.${f.valH&&f.valH[0]?` Un anno fa ${kcr(f.valH[0].v)}.`:''}</p>
   ${f.valH&&f.valH.length?`<p class="eyebrow">Valore a fine stagione</p><ul class="chk">${f.valH.map(v=>`<li><span>Stagione ${v.s}</span><span class="muted">banca ${pctTxt(v.bank||0)}</span><b>${kcr(v.v)}</b></li>`).join('')}</ul>`:''}</div>`;
}
/* Società › Banca */
function vBancaPage(){
  const t=G.T[0], b=t.own.bank, rep=G.rep??50;
  const bbPcts=[5,10].filter(p=>p<b-0.05).concat(b>0?[b]:[]);
  const bb=b>0?`<div class="bb"><p class="eyebrow">Riacquisto delle quote</p><p class="muted">Quando i conti sono in ordine puoi ricomprare le quote dalla banca al valore della società più il 5%.</p><div class="row">${bbPcts.map(p=>{ const blk=buyBackBlock(t,p); return `<button class="btn small ${blk?'ghost':''}" data-act="buyback" data-p="${p}" ${blk?'disabled':''} title="${esc(blk||'')}">Ricompra ${pctTxt(p)} · ${kcr(buyBackPrice(t,p))}</button>`; }).join('')}</div>${buyBackBlock(t,Math.min(5,b))?`<p class="muted small">${esc(buyBackBlock(t,Math.min(5,b)))}</p>`:''}</div>`:'';
  const own=`<section class="card"><p class="eyebrow">Azionisti</p>${ownBar(b)}
    <p>${b<=0?'La società è tutta tua. Se non paghi le rate per tre giornate di fila, la banca converte il debito in quote, in proporzione al valore della società.':b<25?`La banca è socia di minoranza. Al 25% avrà il diritto di veto.`:b<51?`Con il ${pctTxt(b)} la banca ha il <b>diritto di veto</b>: deve approvare il preventivo e blocca acquisti e lavori che non ci stanno. Al 51% avrà la maggioranza.`:`La banca ha la <b>maggioranza</b>: approva solo preventivi che riducono il debito e, dopo un ultimatum, può licenziarti.`}</p>
    ${ultHTML(t)}${bb}</section>`;
  const repC=(G.repC||[]).slice(0,5);
  const repH=`<section class="card"><p class="eyebrow">Reputazione del presidente</p><div class="rep"><p class="big">${Math.round(rep)} <small>/ 100</small></p><div><p class="strong">${repLevel(rep).replace(/^./,c=>c.toUpperCase())}</p>${bar(rep,100,'')}</div></div>
    <p class="muted">Conta per la banca (tasso) e, se vieni licenziato, per le società che ti offrono un nuovo incarico. Sale con bilanci in linea con il preventivo, obiettivi raggiunti e debiti saldati.</p>
    ${repC.length?`<ul class="morc">${repC.map(c=>`<li><span class="${c.d>0?'up':'dn'}">${c.d>0?'▲':'▼'}</span> ${esc(c.t)} <span class="muted">· S${c.s} G${c.md}</span></li>`).join('')}</ul>`:''}</section>`;
  return `<section class="grid2">${own}${repH}</section>`+vBanca(t);
}
/* Società › Strutture: livelli, effetti, valore, pegno e ampliamenti */
function vStrutture(){
  const t=G.T[0];
  const facs=Object.keys(FACS).map(k=>{ const l=facLevel(t,k), bl=t.build&&t.build.k===k, blk=buildBlock(t,k), peg=t.facPeg&&t.facPeg[k];
    return `<div class="fac"><div><b>${FACS[k].n}</b> <span class="lvl">liv. ${l}/5</span>${peg?' <span class="badge-s peg" title="In pegno alla banca">pegno</span>':''}<p class="muted">${esc(FACS[k].eff(l))} · valore ${kcr(facValue(t,k))}${bl?` · lavori in corso, ${t.build.left} giornate`:''}</p>${blk&&l<5&&!bl&&!t.build?`<p class="muted small">${esc(blk)}</p>`:''}</div>
     ${l<5&&!bl?`<button class="btn small ${blk?'ghost':''}" data-act="build" data-k="${k}" ${blk?'disabled':''}>Amplia · ${kcr(FACS[k].cost(l))}</button>`:''}</div>`; }).join('');
  const pg=t.facPeg&&Object.keys(FACS).some(k=>t.facPeg[k]);
  return `<section class="card"><p class="eyebrow">Strutture · valore ${kcr(facTotal(t))}</p>${facs}<p class="muted small">Un ampliamento costa caro, ma aumenta il valore della società di circa il 90% della spesa. ${pg?'Le strutture in pegno si ampliano solo con l\'ok della banca.':'Se le dai in pegno alla banca per un finanziamento, potrai ampliarle solo con il suo ok.'}</p></section>`;
}
function vBanca(t){
  const f=finInit(t), rt=bankRating(t), rk=bankRisk(t,0), L=bankLimits(t,loanForm.n);
  if(loanForm.amt>Math.max(50000,L[loanForm.peg])) loanForm.amt=Math.max(50000,L[loanForm.peg]);
  const loans=f.loans.length?`<div class="tw"><table class="tab"><thead><tr><th>Finanziamento</th><th class="num">Tasso</th><th class="num">Rata</th><th class="num">Rate</th><th class="num">Residuo</th><th>Garanzia</th><th></th></tr></thead><tbody>
    ${f.loans.map(l=>`<tr class="nohov"><td>${kcr(l.amt)} <span class="muted">· S${l.s} G${l.md}</span></td><td class="num">${fmtV(l.apr)}%</td><td class="num">${fmt(l.rate)}</td><td class="num">${l.left}/${l.n}</td><td class="num strong">${kcr(l.pr)}</td><td>${l.peg==='car'?`pegno su ${l.pids.map(id=>G.P[id]?esc(G.P[id].ln):'').filter(Boolean).join(', ')||'—'}`:PEG_TXT[l.peg]}</td><td><button class="btn ghost small" data-act="repay" data-id="${l.id}" ${t.cash<l.pr?'disabled':''} title="${t.cash<l.pr?'Servono '+kcr(l.pr)+' in cassa':'Paghi il residuo e liberi le garanzie'}">Estingui</button></td></tr>`).join('')}</tbody></table></div>`
    : '<p class="empty">Nessun finanziamento in corso.</p>';
  const ins=f.ins>0?`<div class="ult"><p class="eyebrow">⚠ Rate non pagate</p><p>Insoluto ${kcr(f.ins)} da ${f.insN} ${f.insN===1?'giornata':'giornate'}, con la mora dell'1% a giornata. Alla terza giornata di fila la banca converte il debito in quote${f.esc?'; questa volta dichiara decaduti tutti i finanziamenti e vende i giocatori in pegno':''}.</p></div>`:'';
  const peg=loanForm.peg, n=loanForm.n, lim=L[peg], amt=Math.min(loanForm.amt,Math.max(lim,50000));
  const pv=peg==='car'&&lim>=50000?pickPledge(t,amt,n):[];
  const form=L.blocked?`<p class="strong bad">${esc(bankBlockTxt(L.blocked))}</p>`:`<div class="loanf">
     <label>Garanzia <select id="fin-peg">${['none','str','car'].map(k=>`<option value="${k}" ${k===peg?'selected':''}>${PEG_TXT[k].replace(/^./,c=>c.toUpperCase())} · fino a ${kcr(L[k])}</option>`).join('')}</select></label>
     <label>Durata <select id="fin-n">${[14,28,42].map(x=>`<option value="${x}" ${x===n?'selected':''}>${x/14} ${x===14?'stagione':'stagioni'} (${x} rate)</option>`).join('')}</select></label>
     ${lim>=50000?`<label class="wide">Importo <b id="fin-amt-t">${kcr(amt)} cr</b><input type="range" id="fin-amt" min="50000" max="${lim}" step="10000" value="${amt}"></label>
     ${peg==='car'?`<p class="muted small wide">In pegno: <span id="fin-peg-l">${pv.map(p=>esc(p.fn+' '+p.ln)+' ('+kcr(value(p))+')').join(', ')}</span>. Si possono vendere solo con l'ok della banca e il ricavato riduce il debito; se non paghi, la banca li vende all'80% del valore.</p>`:peg==='str'?'<p class="muted small wide">In pegno stadio, centro sportivo e settore giovanile: non si ampliano senza l\'ok della banca. Tasso più basso.</p>':'<p class="muted small wide">Senza garanzie la banca guarda solo alle entrate: la rata deve restare sostenibile.</p>'}
     <div class="row wide"><button class="btn" data-act="bankopen">Tratta con la banca</button></div>`:'<p class="muted wide">Con questa garanzia la banca oggi non presta nulla.</p>'}</div>`;
  return `<section class="card"><p class="eyebrow">Banca</p>
   <div class="rating"><span class="rt rt-${rt}">${rt}</span><div><p class="strong">Giudizio ${RATING_TXT[rt]}</p><p class="muted">${esc(rk.why.join(' · '))}. Tetto complessivo dei debiti: 65% del valore della società.</p></div></div>
   ${ins}${loans}<p class="eyebrow" style="margin-top:6px">Chiedi un finanziamento</p>${form}</section>`;
}
function vBankNeg(){
  const n=G.bneg; if(!n) return ''; const t=G.T[0], open=n.st==='open', st=n.st==='stalled', pb=Math.round(n.pat/n.pat0*100);
  const rata=r=>fmt(Math.round(annuity(n.amt,n.n,r)));
  const hist=n.hist.map(h=>h.by==='pres'?`<li class="me"><span>Tu</span><p>${h.acc?`Accettiamo il ${fmtV(h.v)}%.`:`Proponiamo il ${fmtV(h.v)}% (rata ${rata(h.v)}).`}</p></li>`:`<li class="them"><span>Banca</span><p>${esc(h.txt)}${h.v!=null?` ${fmtV(h.v)}% (rata ${rata(h.v)}).`:''}</p></li>`).join('');
  const lo=Math.max(2.5,Math.floor((n.ask-4)*4)/4), def=Math.round(((lo+n.c)/2)*4)/4;
  return `<div class="neg" role="dialog" aria-label="Trattativa con la banca"><div class="neg-in">
   <div class="neg-h"><div><p class="eyebrow">Banca · finanziamento</p><h2>${kcr(n.amt)} cr in ${n.n} rate</h2></div><button class="x" data-act="bankclose" aria-label="Chiudi">×</button></div>
   <p class="muted">${PEG_TXT[n.peg].replace(/^./,c=>c.toUpperCase())}${n.pids.length?': '+n.pids.map(id=>esc(G.P[id].ln)).join(', '):''}. Si tratta il tasso a stagione; la rata è costante.</p>
   <div class="neg-sides">
     <div class="side"><p class="eyebrow">Il presidente</p><p class="strong">${esc(t.n)}</p><p class="muted">Cassa ${kcr(t.cash)} · entrate ${kcr(roundIncome(t))} a giornata · rate in corso ${kcr(finInit(t).loans.reduce((s,l)=>s+l.rate,0))}</p><p class="muted">Reputazione ${repLevel(G.rep??50)}</p></div>
     <div class="side"><p class="eyebrow">La banca</p><p class="muted">Giudizio <b>${RATING_TXT[bankRating(t)]}</b>: ${esc(n.why.join(', '))}.</p><p class="muted">Pazienza</p><span class="bar pat ${pb<35?'warn':''}"><span style="width:${pb}%"></span></span><p class="muted small">Il tasso minimo resta segreto: dipende dal rischio che la banca vede nei tuoi conti.</p></div>
   </div>
   <ul class="neg-chat">${hist}</ul>
   ${open?`<div class="neg-form"><label>Il tasso che proponi <b id="bank-vt">${fmtV(def)}% · rata ${rata(def)}</b></label>
     <input type="range" id="bank-v" min="${lo}" max="${n.c}" step="0.25" value="${def}">
     <div class="row"><button class="btn" data-act="bankprop">Proponi</button><button class="btn ghost" data-act="bankacc">Accetta il ${fmtV(n.c)}%</button><button class="btn ghost" data-act="bankclose">Rinuncia</button></div></div>`:''}
   ${st?`<div class="neg-stop"><p class="strong">La banca non tratta più: decidi.</p><div class="row"><button class="btn" data-act="bankacc">Accetta il ${fmtV(n.c)}% · rata ${rata(n.c)}</button><button class="btn ghost" data-act="bankclose">Rinuncia</button></div></div>`:''}
   ${n.st==='deal'?`<p class="strong">Firmato: ${kcr(n.amt)} cr al ${fmtV(n.v)}%, ${n.n} rate da ${fmt(n.rate)} cr.</p><div class="row"><button class="btn" data-act="bankclose">Chiudi</button></div>`:''}
  </div></div>`;
}

/* ---------- Bilancio: preventivo, andamento, revisione, consuntivo ---------- */
function budLevFromForm(){ const g=id=>{ const e=$('#'+id); return e?+e.value:0; }; return {acq:g('bud-acq'), ces:g('bud-ces'), inv:g('bud-inv'), fin:g('bud-fin'), pos:g('bud-pos')||4}; }
function budTable(P,ref){ const row=(k,v,r)=>`<tr><td>${esc(k)}</td>${ref?`<td class="num muted">${kcr(r)}</td>`:''}<td class="num">${kcr(v)}</td></tr>`;
  return `<table class="bil"><thead><tr><th>Entrate</th>${ref?'<th class="num">Prima</th>':''}<th class="num">cr</th></tr></thead><tbody>${BUD_INC.filter(k=>P.inc[k]||(ref&&ref.inc[k])).map(k=>row(k,P.inc[k],ref&&ref.inc[k])).join('')}<tr class="tot"><td>Totale</td>${ref?`<td class="num muted">${kcr(ref.ti)}</td>`:''}<td class="num">${kcr(P.ti)}</td></tr></tbody></table>
   <table class="bil"><thead><tr><th>Uscite</th>${ref?'<th class="num">Prima</th>':''}<th class="num">cr</th></tr></thead><tbody>${BUD_EXP.filter(k=>P.exp[k]||(ref&&ref.exp[k])).map(k=>row(k,P.exp[k],ref&&ref.exp[k])).join('')}<tr class="tot"><td>Totale</td>${ref?`<td class="num muted">${kcr(ref.te)}</td>`:''}<td class="num">${kcr(P.te)}</td></tr></tbody></table>`; }
function budSummary(t,lev){ const c=budCheck(t,lev), P=c.P, b=finInit(t).bud, ref=budDraft&&budDraft.mode==='rev'&&b?b:null;
  return `<div class="bud-sum"><div><p class="muted">Saldo della gestione</p><p class="big ${P.saldo<0?'bad':''}">${signK(P.saldo)}</p></div><div><p class="muted">Finanziamenti nuovi</p><p class="big">${kcr(P.finIn)}</p></div><div><p class="muted">Cassa a fine stagione</p><p class="big ${P.cashEnd<0?'bad':''}">${kcr(P.cashEnd)}</p><p class="muted small">da ${kcr(P.cash0)} a inizio stagione</p></div></div>
   <div class="grid2 bud-t">${budTable(P,ref)}</div>
   ${c.errs.length||c.bank.length?`<ul class="conds">${c.errs.map(e=>`<li class="ko">✗ ${esc(e)}</li>`).join('')}${c.bank.map(e=>`<li class="ko">✗ ${esc(e)}</li>`).join('')}</ul>`:`<ul class="conds"><li class="ok">✓ Il preventivo copre le uscite${t.own.bank>=25?' e la banca lo approva':''}.</li></ul>`}
   <div class="row"><button class="btn" data-act="budok" ${c.ok?'':'disabled'}>${budDraft&&budDraft.mode==='rev'?'Conferma il preventivo aggiornato':'Convalida il preventivo'}</button>${budDraft&&budDraft.mode==='rev'?'<button class="btn ghost" data-act="budcancel">Annulla</button>':''}</div>`; }
function budRefresh(){ const t=G.T[0], lev=budLevFromForm(); if(budDraft) Object.assign(budDraft,lev);
  [['acq',v=>kcr(v)+' cr'],['ces',v=>kcr(v)+' cr'],['inv',v=>kcr(v)+' cr'],['fin',v=>kcr(v)+' cr']].forEach(([k,f])=>{ const o=$('#bud-'+k+'-t'); if(o) o.textContent=f(lev[k]); });
  const s=$('#bud-sum'); if(s) s.innerHTML=budSummary(t,lev); }
function vBudEditor(t){ const f=finInit(t), wb=wageBill(t)+staffCost(t), L=bankLimits(t,28), best=Math.max(L.none,L.str,L.car);
  if(!budDraft) budDraft={...defaultLev(t),mode:'new'}; const d=budDraft, rev=d.mode==='rev';
  const invMax=Object.keys(FACS).reduce((s,k)=>s+(facLevel(t,k)<5?FACS[k].cost(facLevel(t,k)):0),0);
  const acqMax=Math.max(300000,Math.round(Math.max(0,t.cash)*1.5/10000)*10000+best), cesMax=Math.round(squadValue(t)*0.4/10000)*10000;
  const lv=(id,lbl,max,v,help)=>`<label class="lev"><span>${lbl} <b id="bud-${id}-t">${kcr(v)} cr</b></span><input type="range" id="bud-${id}" min="0" max="${Math.max(max,v)}" step="10000" value="${v}"><small class="muted">${help}</small></label>`;
  const last=f.budH&&f.budH[0];
  return `<section class="card"><p class="eyebrow">${rev?'Revisione di metà stagione':'Preventivo della stagione '+G.season}</p>
   <p>${rev?'Puoi aggiornare il preventivo una sola volta. Il nuovo preventivo diventa il riferimento del consuntivo.':`Prima della prima giornata il presidente convalida il preventivo: entrate e uscite previste, obiettivo e coperture. A fine stagione il consuntivo deve restare entro il ${Math.round(BUD_TOL*100)}% del saldo previsto (misurato sulle uscite), con una revisione dopo la 7ª giornata.`}</p>
   ${last&&!rev?`<p class="muted">Stagione ${last.s}: saldo previsto ${kcr(last.prev.saldo)}, effettivo ${kcr(last.act.saldo)} — ${last.ok?'in tolleranza':'fuori tolleranza'}.</p>`:''}
   <p class="muted">Stipendi e staff ${kcr(wb)} a giornata · entrate medie ${kcr(roundIncome(t))} · la banca oggi presterebbe fino a ${kcr(best)}${t.own.bank>=25?` · la banca ha il ${pctTxt(t.own.bank)} e deve approvare`:''}.</p>
   <div class="auto"><button class="btn" data-act="budauto">Compila in automatico</button><p class="muted small">Riempie il preventivo con cifre ragionevoli ricavate dalle stagioni passate${G.md>0?' e da quello che è già successo in questa':''}. Poi puoi ritoccarle a mano prima di convalidare.</p></div>
   ${d.why&&d.why.length?`<div class="autowhy"><p class="eyebrow">Come sono state calcolate le cifre</p><ul>${d.why.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></div>`:''}
   <div class="levs">
    ${lv('acq','Budget per gli acquisti',acqMax,d.acq,'Cartellini e somme alla firma. Con la banca al 25% non potrai superarlo di oltre il 10%.')}
    ${lv('ces','Cessioni previste',cesMax,d.ces,'Incassi da vendite di giocatori che pensi di fare.')}
    ${lv('inv','Investimenti nelle strutture',invMax,d.inv,'Ampliamenti di stadio, centro sportivo e settore giovanile.')}
    ${lv('fin','Nuovi finanziamenti',Math.max(best,0),d.fin,'Copertura con la banca: va poi chiesta e trattata.')}
    <label class="lev"><span>Obiettivo in classifica</span><select id="bud-pos">${[1,2,3,4,5,6,7,8].map(p=>`<option value="${p}" ${p===d.pos?'selected':''}>${p}° posto · premio ${kcr(60000+(8-p)*30000)}</option>`).join('')}</select><small class="muted">Decide il premio di fine campionato previsto. Raggiungerlo migliora la reputazione.</small></label>
   </div>
   <div id="bud-sum">${budSummary(t,d)}</div></section>`; }
function vBilancio(){
  const t=G.T[0], f=finInit(t);
  if((G.md===0 && needBudget(t)) || (budDraft && budDraft.mode==='rev')) return vBudEditor(t)+budHist(f);
  if(needBudget(t)) ensureBudget(t,true);
  const b=f.bud, P=budProject(t,b.lev), A=seaActual(t), sc=(b.saldo-P.saldo)/Math.max(1,b.te), ok=sc<=BUD_TOL, pos=standings().findIndex(x=>x.id===0)+1;
  const line=(kind,k)=>{ const pr=b[kind][k]||0, a=A[kind][k]||0, pj=P[kind][k]||0, d=kind==='inc'?pj-pr:pr-pj; if(!pr&&!a&&!pj) return '';
    return `<tr><td>${esc(k)}</td><td class="num">${kcr(pr)}</td><td class="num">${kcr(a)}</td><td class="num">${kcr(pj)}</td><td class="num ${d<-Math.max(5000,pr*0.05)?'bad':d>Math.max(5000,pr*0.05)?'good':'muted'}">${signK(d)}</td></tr>`; };
  const tab=`<div class="tw"><table class="tab bvt"><thead><tr><th>Voce</th><th class="num">Preventivo</th><th class="num">A oggi</th><th class="num">Fine stagione</th><th class="num">Differenza</th></tr></thead><tbody>
    <tr class="grp"><td colspan="5">Entrate</td></tr>${BUD_INC.map(k=>line('inc',k)).join('')}
    <tr class="tot"><td>Totale entrate</td><td class="num">${kcr(b.ti)}</td><td class="num">${kcr(Object.values(A.inc).reduce((x,y)=>x+y,0))}</td><td class="num">${kcr(P.ti)}</td><td class="num">${signK(P.ti-b.ti)}</td></tr>
    <tr class="grp"><td colspan="5">Uscite</td></tr>${BUD_EXP.map(k=>line('exp',k)).join('')}
    <tr class="tot"><td>Totale uscite</td><td class="num">${kcr(b.te)}</td><td class="num">${kcr(Object.values(A.exp).reduce((x,y)=>x+y,0))}</td><td class="num">${kcr(P.te)}</td><td class="num">${signK(b.te-P.te)}</td></tr>
    <tr class="tot"><td>Saldo della gestione</td><td class="num">${signK(b.saldo)}</td><td class="num">${signK(Object.values(A.inc).reduce((x,y)=>x+y,0)-Object.values(A.exp).reduce((x,y)=>x+y,0))}</td><td class="num">${signK(P.saldo)}</td><td class="num ${P.saldo<b.saldo?'bad':''}">${signK(P.saldo-b.saldo)}</td></tr>
    <tr><td>Finanziamenti e altri movimenti</td><td class="num">${kcr(b.finIn)}</td><td class="num">${signK(A.finIn-A.finOut)}</td><td class="num">${signK(P.finIn-P.finOut)}</td><td></td></tr>
    <tr class="tot"><td>Cassa a fine stagione</td><td class="num">${kcr(b.cashEnd)}</td><td class="num">${kcr(t.cash)}</td><td class="num">${kcr(P.cashEnd)}</td><td class="num">${signK(P.cashEnd-b.cashEnd)}</td></tr></tbody></table></div>`;
  const revBox = b.rev ? `<div class="${b.rev.ok?'okbox':'ult'}"><p class="eyebrow">Revisione dopo la ${b.rev.md}ª giornata</p><p>Saldo previsto allora ${kcr(b.rev.saldo)}: ${b.rev.ok?'in linea':'fuori tolleranza'} (scostamento ${Math.round(b.rev.scost*100)}%, massimo ${Math.round(REV_TOL*100)}%).${b.revUsed?' Preventivo già aggiornato.':''}</p>${canRevise(t)?'<button class="btn small" data-act="budrev">Aggiorna il preventivo</button>':''}</div>`
    : `<p class="muted">La revisione di metà stagione arriva dopo la 7ª giornata: se i conti si sono allontanati dal preventivo, potrai aggiornarlo una volta.</p>`;
  return `<section class="card"><div class="bud-head"><div><p class="eyebrow">Preventivo della stagione ${G.season} · ${b.by==='ufficio'?'redatto d\'ufficio':'convalidato'}${b.revUsed?' e rivisto':''}</p>
     <p class="big ${ok?'':'bad'}">${ok?'In linea':'Fuori tolleranza'}</p><p class="muted">A fine stagione il saldo sarà ${kcr(P.saldo)} contro ${kcr(b.saldo)} previsti: ${sc>0?'peggio':'meglio'} del ${Math.abs(Math.round(sc*100))}% rispetto alle uscite (tolleranza ${Math.round(BUD_TOL*100)}%).</p></div>
     <div class="obj"><p class="eyebrow">Obiettivo</p><p class="big">${b.lev.pos}°</p><p class="muted">oggi ${pos}° · budget acquisti ${kcr(b.lev.acq)} (spesi ${kcr(A.exp.acquisti)})</p></div></div>
    ${revBox}${tab}<p class="muted small">«Fine stagione» somma quello che è già successo e la stima del resto: stipendi e staff attuali, rate, partite in casa, premio per la posizione obiettivo, quanto resta del budget per acquisti, cessioni e lavori.</p></section>`+budHist(f);
}
function budHist(f){ if(!f.budH||!f.budH.length) return '';
  return `<section class="card"><p class="eyebrow">Consuntivi</p><div class="tw"><table class="tab"><thead><tr><th>Stagione</th><th class="num">Saldo previsto</th><th class="num">Saldo effettivo</th><th class="num">Scostamento</th><th>Esito</th><th>Obiettivo</th></tr></thead><tbody>
   ${f.budH.map(h=>`<tr class="nohov"><td>${h.s}${h.rev?' <span class="muted">(rivisto)</span>':''}</td><td class="num">${signK(h.prev.saldo)}</td><td class="num">${signK(h.act.saldo)}</td><td class="num">${h.scost>0?'−':'+'}${Math.abs(Math.round(h.scost*100))}%</td><td class="${h.ok?'good':'bad'} strong">${h.ok?'in tolleranza':'fuori'}</td><td>${h.pos}° ${h.objOk?'✓':'✗'} <span class="muted">(obiettivo ${h.objPos}°)</span></td></tr>`).join('')}</tbody></table></div></section>`; }

/* ---------- licenziamento: scelta della nuova società ---------- */
function vFired(){ const F=G.fired; if(!F) return ''; const st=standings();
  const card=id=>{ const t=G.T[id], f=finInit(t);
    return `<div class="offc"><p class="offh"><span class="chip" style="--c:${t.c}"></span>${clubLink(id)}</p><p class="muted small">Tocca il nome per il profilo pubblico.</p>
     <dl class="offd"><div><dt>Classifica</dt><dd>${st.indexOf(t)+1}° · ${teamPts(t)} pt</dd></div><div><dt>Forza della rosa</dt><dd>${avgTop(teamPlayers(t)).toFixed(1).replace('.',',')}</dd></div><div><dt>Valore</dt><dd>${kcr(netValue(t))}</dd></div><div><dt>Cassa</dt><dd>${kcr(t.cash)}</dd></div><div><dt>Debiti</dt><dd>${kcr(clubDebts(t))}</dd></div><div><dt>Banca</dt><dd>${pctTxt(t.own.bank)}</dd></div><div><dt>Allenatore</dt><dd>${esc(t.coach.n)}</dd></div><div><dt>Stipendi/ricavi</dt><dd>${Math.round(wageRatio(t)*100)}%</dd></div></dl>
     <button class="btn" data-act="offeracc" data-k="${id}">Accetta l'incarico</button></div>`; };
  return `<div class="neg" role="dialog" aria-label="Licenziamento"><div class="neg-in wide">
    <p class="eyebrow">Stagione ${F.s} · giornata ${F.md}</p><h2>La banca ti ha licenziato da ${esc(F.club)}</h2>
    <p>${esc(F.why.replace(/^./,c=>c.toUpperCase()))}.</p>
    <p class="muted">Reputazione ${Math.round(G.rep??50)}/100 (${repLevel(G.rep??50)}): ${F.offers.length} società ti offrono la presidenza. Porti con te le relazioni dell'osservatore e il taccuino.</p>
    <div class="offs">${F.offers.map(card).join('')}</div></div></div>`; }

/* ---------- eventi ---------- */
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-act]'); if(!el||!G) return; const t=G.T[0];
  switch(el.dataset.act){
    case 'buyback': { const m=buyBack(t,+el.dataset.p); save(); render(); toast(m||'Quote riacquistate.'); break; }
    case 'repay': { const m=repayLoan(t,+el.dataset.id); save(); render(); toast(m||'Finanziamento estinto.'); break; }
    case 'bankopen': { const r=bankOpen(t,loanForm.amt,loanForm.n,loanForm.peg); if(r.err){ toast(r.err); break; } bnegOn=true; save(); render(); break; }
    case 'bankprop': { const v=$('#bank-v'); if(v){ bankPropose(+v.value); save(); render(); } break; }
    case 'bankacc': bankAcceptAsk(); save(); render(); break;
    case 'bankclose': { const deal=G.bneg&&G.bneg.st==='deal'; bnegOn=false; G.bneg=null; save(); render(); if(deal) toast('Finanziamento firmato.'); break; }
    case 'budok': { const lev=budLevFromForm(); if(budDraft&&budDraft.mode==='rev'){ const c=reviseBudget(t,lev); if(!c.ok){ toast('Il preventivo non si può convalidare: controlla gli avvisi.'); break; } } else { const c=budCheck(t,lev); if(!c.ok){ toast('Il preventivo non si può convalidare: controlla gli avvisi.'); break; } makeBudget(t,lev,'pres'); news(`Preventivo della stagione ${G.season} convalidato: saldo previsto ${kcr(finInit(t).bud.saldo)}, obiettivo ${lev.pos}° posto.`,'club',false,0); }
      budDraft=null; save(); render(); toast('Preventivo convalidato.'); break; }
    case 'budauto': { const a=autoLev(t); budDraft={...a.lev,mode:budDraft?budDraft.mode:'new',why:a.why}; render(); toast(a.ok?'Preventivo compilato: controlla le cifre e convalida.':'Preventivo compilato, ma non quadra ancora: guarda gli avvisi.'); break; }
    case 'budrev': if(canRevise(t)){ budDraft={...finInit(t).bud.lev,mode:'rev'}; render(); } break;
    case 'budcancel': budDraft=null; render(); break;
    case 'offeracc': { acceptOffer(+el.dataset.k); budDraft=null; negId=null; sheetPid=null; stopViewer(); viewer=null; clubView=null; area='scrivania'; sub='home'; save(); render(); toast('Benvenuto nella nuova società.'); break; }
  }
});
document.addEventListener('input', e=>{ const id=e.target&&e.target.id; if(!id||!G) return;
  if(id==='bank-v'&&G.bneg){ const o=$('#bank-vt'); if(o) o.textContent=`${fmtV(+e.target.value)}% · rata ${fmt(Math.round(annuity(G.bneg.amt,G.bneg.n,+e.target.value)))}`; }
  if(id==='fin-amt'){ loanForm.amt=+e.target.value; const o=$('#fin-amt-t'); if(o) o.textContent=kcr(loanForm.amt)+' cr';
    const pl=$('#fin-peg-l'); if(pl && loanForm.peg==='car'){ const pv=pickPledge(G.T[0],loanForm.amt,loanForm.n); pl.textContent=pv.map(p=>p.fn+' '+p.ln+' ('+kcr(value(p))+')').join(', '); } }
  if(id.startsWith('bud-')) budRefresh(); });
document.addEventListener('change', e=>{ const id=e.target&&e.target.id; if(!id||!G) return;
  if(id==='fin-peg'){ loanForm.peg=e.target.value; render(); } if(id==='fin-n'){ loanForm.n=+e.target.value; render(); } if(id==='fin-amt') render(); });
Object.assign(VIEWS,{'societa/bilancio':vBilancio,'societa/banca':vBancaPage,'societa/strutture':vStrutture});
