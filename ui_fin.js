/* ================= INTERFACCIA: SOCIETÀ, BANCA, BILANCIO ================= */
let budDraft=null, bnegOn=false;
const loanForm={amt:200000,n:28,peg:'none'};
const pctTxt=x=>fmtV(Math.round(x*10)/10)+'%';
const signK=n=>Math.abs(n)<500?'0k':(n>0?'+':'')+kcr(n);

/* ---------- Società: patrimonio (in Conti), Banca (azionisti, reputazione, finanziamenti), Strutture ---------- */
function ownBar(b){ return `<div class="own"><div class="own-bar" role="img" aria-label="${t_("fin.banca_presidente",{pctTxt:pctTxt(b),pctTxt2:pctTxt(100-b)})}"><span class="own-b" style="width:${b}%"></span><span class="own-p" style="width:${100-b}%"></span>${t_("fin.veto_maggioranza")}</div>
  <div class="own-lg"><span>${t_("fin.banca",{pctTxt:pctTxt(b)})}</span><span>${t_("fin.presidente",{pctTxt:pctTxt(100-b)})}</span></div></div>`; }
function ultHTML(t){ const u=t.ult; if(!u||u.st!=='on') return '';
  const c=ultConds(t), when=ultWhen(u);
  return `<div class="ult"><p class="eyebrow">${t_("fin.ultimatum_della_banca")}</p><p>${t_("fin.motivo_verifica_se_una",{why:esc(u.why),when:when})}</p>
   <ul class="conds">${c.map(x=>`<li class="${x.ok?'ok':'ko'}">${x.ok?'✓':'✗'} ${esc(x.t)}</li>`).join('')}</ul></div>`; }
const ultWhen = u=>u.s>G.season?t_("fin.alla_giornata_della_prossima",{due:u.due}):u.due>=14?t_("fin.a_fine_stagione"):t_("fin.dopo_la_giornata",{due:u.due});
/* Conti › patrimonio: valore della società e come si compone, storico a fine stagione */
function patrimonioHTML(t){
  const f=finInit(t), nv=netValue(t), fac=facTotal(t), sq=squadValue(t), bd=bankDebt(t), arr=arrears(t), dbt=clubDebts(t);
  const lg=(c,l,v)=>`<li><i style="background:var(${c})"></i><span>${l}</span><b>${kcr(v)}</b></li>`;
  return `<div class="card ev-panel"><p class="ev-kick">${t_("fin.patrimonio")}</p><h2 class="ev-ptitle">${t_("fin.valore_della_societa")}</h2>
   <div class="ev-asset">${donutHTML([['s',fac,'--ev-brand-gold'],['c',sq,'--ev-brand-green'],['k',Math.max(0,t.cash),'--ev-success']],kcr(nv),t_("fin.composizione_del_patrimonio"))}
    <ul class="ev-legend">${lg('--ev-brand-green',t_("fin.cartellini_giocatori",{pl:t.pl.length}),sq)}${lg('--ev-brand-gold',t_("fin.strutture"),fac)}${lg('--ev-success',t_("fin.cassa"),t.cash)}${lg('--ev-danger',t_("fin.debiti"),-dbt)}<li class="tot"><i></i><span>${t_("fin.valore_complessivo")}</span><b class="${nv<0?'bad':''}">${t_("fin.cr",{nv:kcr(nv)})}</b></li></ul></div>
   <p class="muted">${t_("fin.strutture_cartellini_giocatori_a",{fac:kcr(fac),sq:kcr(sq),pl:t.pl.length,dbt:kcr(dbt),v:bd+arr>0||t.cash<0?` (banca ${kcr(f.loans.reduce((s,l)=>s+l.pr,0))}${f.ins?` ${t_("fin.rate_non_pagate",{ins:kcr(f.ins)})}`:''}${arr?` ${t_("fin.stipendi_arretrati",{arr:kcr(arr)})}`:''}${t.cash<0?` · scoperto ${kcr(-t.cash)}`:''})`:'',v2:f.valH&&f.valH[0]?` ${t_("fin.un_anno_fa",{v:kcr(f.valH[0].v)})}`:''})}</p>
   ${f.valH&&f.valH.length?`<p class="eyebrow">${t_("fin.valore_a_fine_stagione")}</p><ul class="chk">${f.valH.map(v=>`<li><span>${t_("fin.stagione",{s:v.s})}</span><span class="muted">${t_("fin.banca_2",{pctTxt:pctTxt(v.bank||0)})}</span><b>${kcr(v.v)}</b></li>`).join('')}</ul>`:''}</div>`;
}
/* Società › Banca */
function vBancaPage(){
  const t=G.T[0], b=t.own.bank, rep=G.rep??50;
  const bbPcts=[5,10].filter(p=>p<b-0.05).concat(b>0?[b]:[]);
  const bb=b>0?`<div class="bb"><p class="eyebrow">${t_("fin.riacquisto_delle_quote")}</p><p class="muted">${t_("fin.quando_i_conti_sono")}</p><div class="row">${bbPcts.map(p=>{ const blk=buyBackBlock(t,p); return `<button class="btn small ${blk?'ghost':''}" data-act="buyback" data-p="${p}" ${blk?'disabled':''} title="${esc(blk||'')}">${t_("fin.ricompra",{pctTxt:pctTxt(p),buyBackPrice:kcr(buyBackPrice(t,p))})}</button>`; }).join('')}</div>${buyBackBlock(t,Math.min(5,b))?`<p class="muted small">${esc(buyBackBlock(t,Math.min(5,b)))}</p>`:''}</div>`:'';
  const own=`<section class="card ev-panel"><p class="ev-kick">${t_("fin.proprieta")}</p><h2 class="ev-ptitle">${t_("fin.azionisti")}</h2>${ownBar(b)}
    <p>${b<=0?t_("fin.la_societa_e_tutta"):b<25?t_("fin.la_banca_e_socia"):b<51?`${t_("fin.con_il_la_banca",{pctTxt:pctTxt(b)})}`:`${t_("fin.la_banca_ha_la")}`}</p>
    ${ultHTML(t)}${bb}</section>`;
  const repC=(G.repC||[]).slice(0,5);
  const repH=`<section class="card ev-panel"><p class="ev-kick">${t_("fin.il_presidente")}</p><h2 class="ev-ptitle">${t_("fin.reputazione")}</h2><div class="rep"><p class="big">${Math.round(rep)} <small>/ 100</small></p><div><p class="strong">${repLevel(rep).replace(/^./,c=>c.toUpperCase())}</p>${bar(rep,100,'')}</div></div>
    <p class="muted">${t_("fin.conta_per_la_banca")}</p>
    ${repC.length?`<ul class="morc">${repC.map(c=>`<li><span class="${c.d>0?'up':'dn'}">${c.d>0?'▲':'▼'}</span> ${esc(c.t)} <span class="muted">${t_("fin.s_g",{s:c.s,md:c.md})}</span></li>`).join('')}</ul>`:''}</section>`;
  const f=finInit(t);
  return pageHead(t_("fin.societa_finanza"),t_("fin.finanziamenti_e_proprieta"),t_("fin.azionisti_banca_reputazione_del"),{chips:socChips()})
   +kpiHTML([[t_("fin.quote_del_presidente"),pctTxt(100-b),'','hi'],[t_("fin.quote_della_banca"),pctTxt(b),b>=51?'maggioranza':b>=25?t_("fin.diritto_di_veto"):'',b>=25?'bad':''],[t_("fin.debito_con_la_banca"),kcr(bankDebt(t))+' cr',f.loans.length?f.loans.length+(f.loans.length===1?' finanziamento':' finanziamenti'):t_("fin.nessun_finanziamento"),f.ins?'bad':''],[t_("fin.reputazione"),Math.round(rep)+'/100',repLevel(rep)]])
   +`<section class="ev-grid2">${own}${repH}</section>`+vBanca(t);
}
/* Società › Strutture: livelli, effetti, valore, pegno e ampliamenti */
function vStrutture(){
  const t=G.T[0], FI={st:'stadio',cs:'centro',sg:'giovani'};
  const facs=Object.keys(FACS).map(k=>{ const l=facLevel(t,k), bl=t.build&&t.build.k===k, blk=buildBlock(t,k), peg=t.facPeg&&t.facPeg[k];
    return `<div class="fac ev-fac"><div class="ev-fac-h">${ico(FI[k],'ev-fico')}<span class="lvl">${t_("fin.liv_5",{l:l})}</span>${peg?` <span class="badge-s peg" title="${t_("fin.in_pegno_alla_banca")}">${t_("fin.pegno")}</span>`:''}</div><div><b>${FACS[k].n}</b><p class="ev-fac-v">${t_("fin.cr_2",{facValue:kcr(facValue(t,k))})}</p><p class="muted">${t_("fin.valore",{eff:esc(FACS[k].eff(l)),facValue:kcr(facValue(t,k)),v:bl?` ${t_("fin.lavori_in_corso_giornate",{left:t.build.left})}`:''})}</p><span class="ev-lvbar" role="img" aria-label="${t_("fin.livello_su_5",{l:l})}"><span style="width:${l/5*100}%"></span></span>${blk&&l<5&&!bl&&!t.build?`<p class="muted small">${esc(blk)}</p>`:''}</div>
     ${l<5&&!bl?`<button class="btn small ${blk?'ghost':''}" data-act="build" data-k="${k}" ${blk?'disabled':''}>${t_("fin.amplia",{cost:kcr(FACS[k].cost(l))})}</button>`:''}</div>`; }).join('');
  const pg=t.facPeg&&Object.keys(FACS).some(k=>t.facPeg[k]);
  return pageHead(t_("fin.societa_strutture"),t_("fin.strutture_del_club"),t_("fin.stadio_centro_sportivo_settore"),{chips:socChips()})
   +kpiHTML([[t_("fin.valore_delle_strutture"),kcr(facTotal(t))+' cr','','hi'],[t_("fin.stadio"),t_("fin.liv")+facLevel(t,'st')+'/5',esc(FACS.st.eff(facLevel(t,'st')))],[t_("fin.lavori_in_corso"),t.build?esc(FACS[t.build.k].n):t_("fin.nessuno"),t.build?t.build.left+` ${t_("fin.giornate_alla_fine")}`:'']])+`<section class="card ev-panel"><p class="ev-kick">${t_("fin.strutture_valore",{facTotal:kcr(facTotal(t))})}</p><h2 class="ev-ptitle">${t_("fin.le_tre_aree_d")}</h2><div class="ev-facs">${facs}</div><p class="muted small">${t_("fin.un_ampliamento_costa_caro",{v:pg?t_("fin.le_strutture_in_pegno"):t_("fin.se_le_dai_in")})}</p></section>`;
}
function vBanca(t){
  const f=finInit(t), rt=bankRating(t), rk=bankRisk(t,0), L=bankLimits(t,loanForm.n);
  if(loanForm.amt>Math.max(50000,L[loanForm.peg])) loanForm.amt=Math.max(50000,L[loanForm.peg]);
  const loans=f.loans.length?`<div class="tw"><table class="tab"><thead><tr><th>${t_("fin.finanziamento")}</th><th class="num">${t_("fin.tasso")}</th><th class="num">${t_("fin.rata")}</th><th class="num">${t_("fin.rate")}</th><th class="num">${t_("fin.residuo")}</th><th>${t_("fin.garanzia")}</th><th></th></tr></thead><tbody>
    ${f.loans.map(l=>`<tr class="nohov"><td>${kcr(l.amt)} <span class="muted">${t_("fin.s_g",{s:l.s,md:l.md})}</span></td><td class="num">${fmtV(l.apr)}%</td><td class="num">${fmt(l.rate)}</td><td class="num">${l.left}/${l.n}</td><td class="num strong">${kcr(l.pr)}</td><td>${l.peg==='car'?t_("fin.pegno_su",{join:l.pids.map(id=>G.P[id]?esc(G.P[id].ln):'').filter(Boolean).join(', ')||'—'}):PEG_TXT[l.peg]}</td><td><button class="btn ghost small" data-act="repay" data-id="${l.id}" ${t.cash<l.pr?'disabled':''} title="${t.cash<l.pr?t_("fin.servono_in_cassa",{pr:kcr(l.pr)}):t_("fin.paghi_il_residuo_e")}">${t_("fin.estingui")}</button></td></tr>`).join('')}</tbody></table></div>`
    : `<p class="empty">${t_("fin.nessun_finanziamento_in_corso")}</p>`;
  const ins=f.ins>0?`<div class="ult"><p class="eyebrow">${t_("fin.rate_non_pagate_2")}</p><p>${t_("fin.insoluto_da_con_la",{ins:kcr(f.ins),insN:f.insN,v:f.insN===1?'giornata':'giornate',v2:f.esc?t_("fin.questa_volta_dichiara_decaduti"):''})}</p></div>`:'';
  const peg=loanForm.peg, n=loanForm.n, lim=L[peg], amt=Math.min(loanForm.amt,Math.max(lim,50000));
  const pv=peg==='car'&&lim>=50000?pickPledge(t,amt,n):[];
  const form=L.blocked?`<p class="strong bad">${esc(bankBlockTxt(L.blocked))}</p>`:`<div class="loanf">
     <label>${t_("fin.garanzia")} <select id="fin-peg">${['none','str','car'].map(k=>`<option value="${k}" ${k===peg?'selected':''}>${t_("fin.fino_a",{replace:PEG_TXT[k].replace(/^./,c=>c.toUpperCase()),v:kcr(L[k])})}</option>`).join('')}</select></label>
     <label>${t_("fin.durata")} <select id="fin-n">${[14,28,42].map(x=>`<option value="${x}" ${x===n?'selected':''}>${t_("fin.rate_2",{x:x/14,v:x===14?'stagione':'stagioni',x2:x})}</option>`).join('')}</select></label>
     ${lim>=50000?`<label class="wide">${t_("fin.importo_cr",{amt:kcr(amt)})}<input type="range" id="fin-amt" min="50000" max="${lim}" step="10000" value="${amt}"></label>
     ${peg==='car'?`<p class="muted small wide">${t_("fin.in_pegno")} <span id="fin-peg-l">${pv.map(p=>esc(p.fn+' '+p.ln)+' ('+kcr(value(p))+')').join(', ')}</span>${t_("fin.si_possono_vendere_solo")}</p>`:peg==='str'?`<p class="muted small wide">${t_("fin.in_pegno_stadio_centro")}</p>`:`<p class="muted small wide">${t_("fin.senza_garanzie_la_banca")}</p>`}
     <div class="row wide"><button class="btn" data-act="bankopen">${t_("fin.tratta_con_la_banca")}</button></div>`:`<p class="muted wide">${t_("fin.con_questa_garanzia_la")}</p>`}</div>`;
  return `<section class="card ev-panel"><p class="ev-kick">${t_("fin.banca_3")}</p><h2 class="ev-ptitle">${t_("fin.finanziamenti")}</h2>
   <div class="rating"><span class="rt rt-${rt}">${rt}</span><div><p class="strong">${t_("fin.giudizio",{v:RATING_TXT[rt]})}</p><p class="muted">${t_("fin.tetto_complessivo_dei_debiti",{join:esc(rk.why.join(' · '))})}</p></div></div>
   ${ins}${loans}<h3 class="ev-h3">${t_("fin.chiedi_un_finanziamento")}</h3>${form}</section>`;
}
function vBankNeg(){
  const n=G.bneg; if(!n) return ''; const t=G.T[0], open=n.st==='open', st=n.st==='stalled', pb=Math.round(n.pat/n.pat0*100);
  const rata=r=>fmt(Math.round(annuity(n.amt,n.n,r)));
  const hist=n.hist.map(h=>h.by==='pres'?`<li class="me"><span>${t_("fin.tu")}</span><p>${h.acc?t_("fin.accettiamo_il",{v:fmtV(h.v)}):t_("fin.proponiamo_il_rata",{v:fmtV(h.v),rata:rata(h.v)})}</p></li>`:`<li class="them"><span>${t_("fin.banca_3")}</span><p>${esc(h.txt)}${h.v!=null?` ${t_("fin.rata_2",{v:fmtV(h.v),rata:rata(h.v)})}`:''}</p></li>`).join('');
  const lo=Math.max(2.5,Math.floor((n.ask-4)*4)/4), def=Math.round(((lo+n.c)/2)*4)/4;
  return `<div class="neg" role="dialog" aria-label="${t_("fin.trattativa_con_la_banca")}"><div class="neg-in">
   <div class="neg-h ev-nhead"><span class="ev-nface" aria-hidden="true">${crestHTML(0)}</span><div class="ev-ntext"><p class="ev-eyebrow">${t_("fin.banca_finanziamento")}</p><h2>${t_("fin.cr_in_rate",{amt:kcr(n.amt),n:n.n})}</h2><p class="ev-nsub">${t_("fin.giudizio_2",{n:esc(t.n),v:RATING_TXT[bankRating(t)]})}</p></div><div class="ev-nval">${t_("fin.richiesta_della_banca",{c:fmtV(n.c)})}</div><button class="x" data-act="bankclose" aria-label="${t_("fin.chiudi")}">${t_("fin.x")}</button></div>
   <p class="muted">${t_("fin.si_tratta_il_tasso",{replace:PEG_TXT[n.peg].replace(/^./,c=>c.toUpperCase()),v:n.pids.length?': '+n.pids.map(id=>esc(G.P[id].ln)).join(', '):''})}</p>
   <div class="neg-sides">
     <div class="side"><p class="eyebrow">${t_("fin.il_presidente")}</p><p class="strong">${esc(t.n)}</p><p class="muted">${t_("fin.cassa_entrate_a_giornata",{cash:kcr(t.cash),roundIncome:kcr(roundIncome(t)),reduce:kcr(finInit(t).loans.reduce((s,l)=>s+l.rate,0))})}</p><p class="muted">${t_("fin.reputazione_2",{repLevel:repLevel(G.rep??50)})}</p></div>
     <div class="side"><p class="eyebrow">${t_("fin.la_banca")}</p><p class="muted">${t_("fin.giudizio_3",{v:RATING_TXT[bankRating(t)],join:esc(n.why.join(', '))})}</p><p class="muted">${t_("fin.pazienza")}</p><span class="bar pat ${pb<35?'warn':''}"><span style="width:${pb}%"></span></span><p class="muted small">${t_("fin.il_tasso_minimo_resta")}</p></div>
   </div>
   <ul class="neg-chat">${hist}</ul>
   ${open?`<div class="neg-form"><label>${t_("fin.il_tasso_che_proponi",{def:fmtV(def),rata:rata(def)})}</label>
     <input type="range" id="bank-v" min="${lo}" max="${n.c}" step="0.25" value="${def}">
     <div class="row"><button class="btn" data-act="bankprop">${t_("fin.proponi")}</button><button class="btn ghost" data-act="bankacc">${t_("fin.accetta_il",{c:fmtV(n.c)})}</button><button class="btn ghost" data-act="bankclose">${t_("fin.rinuncia")}</button></div></div>`:''}
   ${st?`<div class="neg-stop"><p class="strong">${t_("fin.la_banca_non_tratta")}</p><div class="row"><button class="btn" data-act="bankacc">${t_("fin.accetta_il_rata",{c:fmtV(n.c),rata:rata(n.c)})}</button><button class="btn ghost" data-act="bankclose">${t_("fin.rinuncia")}</button></div></div>`:''}
   ${n.st==='deal'?`<p class="strong">${t_("fin.firmato_cr_al_rate",{amt:kcr(n.amt),v:fmtV(n.v),n:n.n,rate:fmt(n.rate)})}</p><div class="row"><button class="btn" data-act="bankclose">${t_("fin.chiudi")}</button></div>`:''}
  </div></div>`;
}

/* ---------- Bilancio: preventivo, andamento, revisione, consuntivo ---------- */
function budLevFromForm(){ const g=id=>{ const e=$('#'+id); return e?+e.value:0; }; return {acq:g('bud-acq'), ces:g('bud-ces'), inv:g('bud-inv'), fin:g('bud-fin'), pos:g('bud-pos')||4}; }
function budTable(P,ref){ const row=(k,v,r)=>`<tr><td>${esc(tVoce(k))}</td>${ref?`<td class="num muted">${kcr(r)}</td>`:''}<td class="num">${kcr(v)}</td></tr>`;
  return `<table class="bil"><thead><tr><th>${t_("fin.entrate")}</th>${ref?`<th class="num">${t_("fin.prima")}</th>`:''}<th class="num">${t_("fin.cr_3")}</th></tr></thead><tbody>${BUD_INC.filter(k=>P.inc[k]||(ref&&ref.inc[k])).map(k=>row(k,P.inc[k],ref&&ref.inc[k])).join('')}<tr class="tot"><td>${t_("fin.totale")}</td>${ref?`<td class="num muted">${kcr(ref.ti)}</td>`:''}<td class="num">${kcr(P.ti)}</td></tr></tbody></table>
   <table class="bil"><thead><tr><th>${t_("fin.uscite")}</th>${ref?`<th class="num">${t_("fin.prima")}</th>`:''}<th class="num">${t_("fin.cr_3")}</th></tr></thead><tbody>${BUD_EXP.filter(k=>P.exp[k]||(ref&&ref.exp[k])).map(k=>row(k,P.exp[k],ref&&ref.exp[k])).join('')}<tr class="tot"><td>${t_("fin.totale")}</td>${ref?`<td class="num muted">${kcr(ref.te)}</td>`:''}<td class="num">${kcr(P.te)}</td></tr></tbody></table>`; }
function budSummary(t,lev){ const c=budCheck(t,lev), P=c.P, b=finInit(t).bud, ref=budDraft&&budDraft.mode==='rev'&&b?b:null;
  return `<div class="bud-sum"><div><p class="muted">${t_("fin.saldo_della_gestione")}</p><p class="big ${P.saldo<0?'bad':''}">${signK(P.saldo)}</p></div><div><p class="muted">${t_("fin.finanziamenti_nuovi")}</p><p class="big">${kcr(P.finIn)}</p></div><div><p class="muted">${t_("fin.cassa_a_fine_stagione")}</p><p class="big ${P.cashEnd<0?'bad':''}">${kcr(P.cashEnd)}</p><p class="muted small">${t_("fin.da_a_inizio_stagione",{cash0:kcr(P.cash0)})}</p></div></div>
   <div class="grid2 bud-t">${budTable(P,ref)}</div>
   ${c.errs.length||c.bank.length?`<ul class="conds">${c.errs.map(e=>`<li class="ko">✗ ${esc(e)}</li>`).join('')}${c.bank.map(e=>`<li class="ko">✗ ${esc(e)}</li>`).join('')}</ul>`:`<ul class="conds"><li class="ok">${t_("fin.il_preventivo_copre_le",{v:t.own.bank>=25?t_("fin.e_la_banca_lo"):''})}</li></ul>`}
   <div class="row"><button class="btn" data-act="budok" ${c.ok?'':'disabled'}>${budDraft&&budDraft.mode==='rev'?t_("fin.conferma_il_preventivo_aggiornat"):t_("fin.convalida_il_preventivo")}</button>${budDraft&&budDraft.mode==='rev'?`<button class="btn ghost" data-act="budcancel">${t_("fin.annulla")}</button>`:''}</div>`; }
function budRefresh(){ const t=G.T[0], lev=budLevFromForm(); if(budDraft) Object.assign(budDraft,lev);
  [['acq',v=>kcr(v)+' cr'],['ces',v=>kcr(v)+' cr'],['inv',v=>kcr(v)+' cr'],['fin',v=>kcr(v)+' cr']].forEach(([k,f])=>{ const o=$('#bud-'+k+'-t'); if(o) o.textContent=f(lev[k]); });
  const s=$('#bud-sum'); if(s) s.innerHTML=budSummary(t,lev); }
function vBudEditor(t){ const f=finInit(t), wb=wageBill(t)+staffCost(t), L=bankLimits(t,28), best=Math.max(L.none,L.str,L.car);
  if(!budDraft) budDraft={...defaultLev(t),mode:'new'}; const d=budDraft, rev=d.mode==='rev';
  const invMax=Object.keys(FACS).reduce((s,k)=>s+(facLevel(t,k)<5?FACS[k].cost(facLevel(t,k)):0),0);
  const acqMax=Math.max(300000,Math.round(Math.max(0,t.cash)*1.5/10000)*10000+best), cesMax=Math.round(squadValue(t)*0.4/10000)*10000;
  const lv=(id,lbl,max,v,help)=>`<label class="lev"><span>${lbl} <b id="bud-${id}-t">${t_("fin.cr_4",{v:kcr(v)})}</b></span><input type="range" id="bud-${id}" min="0" max="${Math.max(max,v)}" step="10000" value="${v}"><small class="muted">${help}</small></label>`;
  const last=f.budH&&f.budH[0];
  return pageHead(t_("fin.societa_bilancio"),rev?t_("fin.revisione_di_meta_stagione"):t_("fin.programmazione_finanziaria"),rev?t_("fin.si_aggiorna_una_sola"):t_("fin.prepara_il_preventivo_prima"),{chips:socChips()})
   +kpiHTML([[t_("fin.cassa"),kcr(t.cash)+' cr','','hi'],[t_("fin.stipendi_e_staff"),kcr(wb)+` ${t_("fin.a_giornata")}`],[t_("fin.entrate_medie"),kcr(roundIncome(t))+` ${t_("fin.a_giornata")}`],[t_("fin.tolleranza"),Math.round(BUD_TOL*100)+t_("fin.delle_uscite"),t_("fin.scostamento_ammesso_a_fine")]])+`<section class="card ev-panel"><p class="ev-kick">${rev?t_("fin.revisione_di_meta_stagione"):t_("fin.preventivo_della_stagione",{season:G.season})}</p><h2 class="ev-ptitle">${rev?t_("fin.aggiorna_il_preventivo"):t_("fin.prepara_il_preventivo")}</h2>
   <p>${rev?t_("fin.puoi_aggiornare_il_preventivo"):t_("fin.prima_della_prima_giornata",{BUD_TOL:Math.round(BUD_TOL*100)})}</p>
   ${last&&!rev?`<p class="muted">${t_("fin.stagione_saldo_previsto_effettiv",{s:last.s,saldo:kcr(last.prev.saldo),saldo2:kcr(last.act.saldo),v:last.ok?t_("fin.in_tolleranza"):t_("fin.fuori_tolleranza_2")})}</p>`:''}
   <p class="muted">${t_("fin.stipendi_e_staff_a",{wb:kcr(wb),roundIncome:kcr(roundIncome(t)),best:kcr(best),v:t.own.bank>=25?` ${t_("fin.la_banca_ha_il",{pctTxt:pctTxt(t.own.bank)})}`:''})}</p>
   <div class="auto"><button class="btn" data-act="budauto">${t_("fin.compila_in_automatico")}</button><p class="muted small">${t_("fin.riempie_il_preventivo_con",{v:G.md>0?t_("fin.e_da_quello_che"):''})}</p></div>
   ${d.why&&d.why.length?`<div class="autowhy"><p class="eyebrow">${t_("fin.come_sono_state_calcolate")}</p><ul>${d.why.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></div>`:''}
   <div class="levs">
    ${lv('acq',t_("fin.budget_per_gli_acquisti"),acqMax,d.acq,t_("fin.cartellini_e_somme_alla"))}
    ${lv('ces',t_("fin.cessioni_previste"),cesMax,d.ces,t_("fin.incassi_da_vendite_di"))}
    ${lv('inv',t_("fin.investimenti_nelle_strutture"),invMax,d.inv,t_("fin.ampliamenti_di_stadio_centro"))}
    ${lv('fin',t_("fin.nuovi_finanziamenti"),Math.max(best,0),d.fin,t_("fin.copertura_con_la_banca"))}
    <label class="lev"><span>${t_("fin.obiettivo_in_classifica")}</span><select id="bud-pos">${[1,2,3,4,5,6,7,8].map(p=>`<option value="${p}" ${p===d.pos?'selected':''}>${t_("fin.posto_premio",{p:p,v:kcr(60000+(8-p)*30000)})}</option>`).join('')}</select>${t_("fin.decide_il_premio_di")}</label>
   </div>
   <div id="bud-sum">${budSummary(t,d)}</div></section>`; }
function vBilancio(){
  const t=G.T[0], f=finInit(t);
  if((G.md===0 && needBudget(t)) || (budDraft && budDraft.mode==='rev')) return vBudEditor(t)+budHist(f);
  if(needBudget(t)) ensureBudget(t,true);
  const b=f.bud, P=budProject(t,b.lev), A=seaActual(t), sc=(b.saldo-P.saldo)/Math.max(1,b.te), ok=sc<=BUD_TOL, pos=standings().findIndex(x=>x.id===0)+1;
  const line=(kind,k)=>{ const pr=b[kind][k]||0, a=A[kind][k]||0, pj=P[kind][k]||0, d=kind==='inc'?pj-pr:pr-pj; if(!pr&&!a&&!pj) return '';
    return `<tr><td>${esc(tVoce(k))}</td><td class="num">${kcr(pr)}</td><td class="num">${kcr(a)}</td><td class="num">${kcr(pj)}</td><td class="num ${d<-Math.max(5000,pr*0.05)?'bad':d>Math.max(5000,pr*0.05)?'good':'muted'}">${signK(d)}</td></tr>`; };
  const tab=`<div class="tw"><table class="tab bvt"><thead><tr><th>${t_("fin.voce")}</th><th class="num">${t_("fin.preventivo")}</th><th class="num">${t_("fin.a_oggi")}</th><th class="num">${t_("fin.fine_stagione")}</th><th class="num">${t_("fin.differenza")}</th></tr></thead><tbody>
    <tr class="grp"><td colspan="5">${t_("fin.entrate")}</td></tr>${BUD_INC.map(k=>line('inc',k)).join('')}
    <tr class="tot"><td>${t_("fin.totale_entrate")}</td><td class="num">${kcr(b.ti)}</td><td class="num">${kcr(Object.values(A.inc).reduce((x,y)=>x+y,0))}</td><td class="num">${kcr(P.ti)}</td><td class="num">${signK(P.ti-b.ti)}</td></tr>
    <tr class="grp"><td colspan="5">${t_("fin.uscite")}</td></tr>${BUD_EXP.map(k=>line('exp',k)).join('')}
    <tr class="tot"><td>${t_("fin.totale_uscite")}</td><td class="num">${kcr(b.te)}</td><td class="num">${kcr(Object.values(A.exp).reduce((x,y)=>x+y,0))}</td><td class="num">${kcr(P.te)}</td><td class="num">${signK(b.te-P.te)}</td></tr>
    <tr class="tot"><td>${t_("fin.saldo_della_gestione")}</td><td class="num">${signK(b.saldo)}</td><td class="num">${signK(Object.values(A.inc).reduce((x,y)=>x+y,0)-Object.values(A.exp).reduce((x,y)=>x+y,0))}</td><td class="num">${signK(P.saldo)}</td><td class="num ${P.saldo<b.saldo?'bad':''}">${signK(P.saldo-b.saldo)}</td></tr>
    <tr><td>${t_("fin.finanziamenti_e_altri_movimenti")}</td><td class="num">${kcr(b.finIn)}</td><td class="num">${signK(A.finIn-A.finOut)}</td><td class="num">${signK(P.finIn-P.finOut)}</td><td></td></tr>
    <tr class="tot"><td>${t_("fin.cassa_a_fine_stagione")}</td><td class="num">${kcr(b.cashEnd)}</td><td class="num">${kcr(t.cash)}</td><td class="num">${kcr(P.cashEnd)}</td><td class="num">${signK(P.cashEnd-b.cashEnd)}</td></tr></tbody></table></div>`;
  const revBox = b.rev ? `<div class="${b.rev.ok?'okbox':'ult'}"><p class="eyebrow">${t_("fin.revisione_dopo_la_giornata",{md:b.rev.md})}</p><p>${t_("fin.saldo_previsto_allora_scostament",{saldo:kcr(b.rev.saldo),v:b.rev.ok?t_("fin.in_linea"):t_("fin.fuori_tolleranza_2"),scost:Math.round(b.rev.scost*100),REV_TOL:Math.round(REV_TOL*100),v2:b.revUsed?t_("fin.preventivo_gia_aggiornato"):''})}</p>${canRevise(t)?`<button class="btn small" data-act="budrev">${t_("fin.aggiorna_il_preventivo")}</button>`:''}</div>`
    : `<p class="muted">${t_("fin.la_revisione_di_meta")}</p>`;
  return pageHead(t_("fin.societa_bilancio"),t_("fin.bilancio_della_stagione"),t_("fin.preventivo_andamento_revisione_c"),{chips:socChips()})
   +kpiHTML([[t_("fin.saldo_previsto"),signK(b.saldo),t_("fin.dal_preventivo"),'hi'],[t_("fin.saldo_a_fine_stagione"),`<span class="${P.saldo<b.saldo?'bad':''}">${signK(P.saldo)}</span>`,t_("fin.proiezione_di_oggi")],[t_("fin.cassa_a_fine_stagione"),kcr(P.cashEnd)+' cr',t_("fin.proiezione_di_oggi")],[t_("fin.obiettivo"),b.lev.pos+'° posto','oggi '+pos+'°']])+`<section class="card ev-panel"><div class="bud-head"><div><p class="eyebrow">${t_("fin.preventivo_della_stagione_2",{season:G.season,v:b.by==='ufficio'?t_("fin.redatto_d_ufficio"):'convalidato',v2:b.revUsed?t_("fin.e_rivisto"):''})}</p>
     <p class="big ${ok?'':'bad'}">${ok?t_("fin.in_linea_2"):t_("fin.fuori_tolleranza")}</p><p class="muted">${t_("fin.a_fine_stagione_il",{saldo:kcr(P.saldo),saldo2:kcr(b.saldo),v:sc>0?'peggio':'meglio',sc:Math.abs(Math.round(sc*100)),BUD_TOL:Math.round(BUD_TOL*100)})}</p></div>
     <div class="obj"><p class="eyebrow">${t_("fin.obiettivo")}</p><p class="big">${b.lev.pos}°</p><p class="muted">${t_("fin.oggi_budget_acquisti_spesi",{pos:pos,acq:kcr(b.lev.acq),acquisti:kcr(A.exp.acquisti)})}</p></div></div>
    ${revBox}${tab}<p class="muted small">${t_("fin.fine_stagione_somma_quello")}</p></section>${budHist(f)}`;
}
function budHist(f){ if(!f.budH||!f.budH.length) return '';
  return `<section class="card ev-panel"><p class="ev-kick">${t_("fin.stagioni_chiuse")}</p><h2 class="ev-ptitle">${t_("fin.consuntivi")}</h2><div class="tw"><table class="tab"><thead><tr><th>${t_("fin.stagione_2")}</th><th class="num">${t_("fin.saldo_previsto")}</th><th class="num">${t_("fin.saldo_effettivo")}</th><th class="num">${t_("fin.scostamento")}</th><th>${t_("fin.esito")}</th><th>${t_("fin.obiettivo")}</th></tr></thead><tbody>
   ${f.budH.map(h=>`<tr class="nohov"><td>${h.s}${h.rev?` <span class="muted">${t_("fin.rivisto")}</span>`:''}</td><td class="num">${signK(h.prev.saldo)}</td><td class="num">${signK(h.act.saldo)}</td><td class="num">${h.scost>0?'−':'+'}${Math.abs(Math.round(h.scost*100))}%</td><td class="${h.ok?'good':'bad'} strong">${h.ok?t_("fin.in_tolleranza"):'fuori'}</td><td>${h.pos}° ${h.objOk?'✓':'✗'} <span class="muted">${t_("fin.obiettivo_2",{objPos:h.objPos})}</span></td></tr>`).join('')}</tbody></table></div></section>`; }

/* ---------- licenziamento: scelta della nuova società ---------- */
function vFired(){ const F=G.fired; if(!F) return ''; const st=standings();
  const card=id=>{ const t=G.T[id], f=finInit(t);
    return `<div class="offc"><p class="offh"><span class="chip" style="--c:${t.c}"></span>${clubLink(id)}</p><p class="muted small">${t_("fin.tocca_il_nome_per")}</p>
     <dl class="offd"><div><dt>${t_("fin.classifica")}</dt><dd>${t_("fin.pt",{indexOf:st.indexOf(t)+1,teamPts:teamPts(t)})}</dd></div><div><dt>${t_("fin.forza_della_rosa")}</dt><dd>${fDec(avgTop(teamPlayers(t)).toFixed(1))}</dd></div><div><dt>${t_("fin.valore_2")}</dt><dd>${kcr(netValue(t))}</dd></div><div><dt>${t_("fin.cassa")}</dt><dd>${kcr(t.cash)}</dd></div><div><dt>${t_("fin.debiti")}</dt><dd>${kcr(clubDebts(t))}</dd></div><div><dt>${t_("fin.banca_3")}</dt><dd>${pctTxt(t.own.bank)}</dd></div><div><dt>${t_("fin.allenatore")}</dt><dd>${esc(t.coach.n)}</dd></div><div><dt>${t_("fin.stipendi_ricavi")}</dt><dd>${Math.round(wageRatio(t)*100)}%</dd></div></dl>
     <button class="btn" data-act="offeracc" data-k="${id}">${t_("fin.accetta_l_incarico")}</button></div>`; };
  return `<div class="neg" role="dialog" aria-label="${t_("fin.licenziamento")}"><div class="neg-in wide">
    <p class="eyebrow">${t_("fin.stagione_giornata",{s:F.s,md:F.md})}</p><h2>${t_("fin.la_banca_ti_ha",{club:esc(F.club)})}</h2>
    <p>${esc(F.why.replace(/^./,c=>c.toUpperCase()))}.</p>
    <p class="muted">${t_("fin.reputazione_100_societa_ti",{rep:Math.round(G.rep??50),repLevel:repLevel(G.rep??50),offers:F.offers.length})}</p>
    <div class="offs">${F.offers.map(card).join('')}</div></div></div>`; }

/* ---------- eventi ---------- */
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-act]'); if(!el||!G) return; const t=G.T[0];
  switch(el.dataset.act){
    case 'buyback': { const m=buyBack(t,+el.dataset.p); save(); render(); toast(m||t_("fin.quote_riacquistate")); break; }
    case 'repay': { const m=repayLoan(t,+el.dataset.id); save(); render(); toast(m||t_("fin.finanziamento_estinto")); break; }
    case 'bankopen': { const r=bankOpen(t,loanForm.amt,loanForm.n,loanForm.peg); if(r.err){ toast(r.err); break; } bnegOn=true; save(); render(); break; }
    case 'bankprop': { const v=$('#bank-v'); if(v){ bankPropose(+v.value); save(); render(); } break; }
    case 'bankacc': bankAcceptAsk(); save(); render(); break;
    case 'bankclose': { const deal=G.bneg&&G.bneg.st==='deal'; bnegOn=false; G.bneg=null; save(); render(); if(deal) toast(t_("fin.finanziamento_firmato")); break; }
    case 'budok': { const lev=budLevFromForm(); if(budDraft&&budDraft.mode==='rev'){ const c=reviseBudget(t,lev); if(!c.ok){ toast(t_("fin.il_preventivo_non_si")); break; } } else { const c=budCheck(t,lev); if(!c.ok){ toast(t_("fin.il_preventivo_non_si")); break; } makeBudget(t,lev,'pres'); news(t_("fin.preventivo_della_stagione_conval",{season:G.season,saldo:kcr(finInit(t).bud.saldo),pos:lev.pos}),'club',false,0); }
      budDraft=null; save(); render(); toast(t_("fin.preventivo_convalidato")); break; }
    case 'budauto': { const a=autoLev(t); budDraft={...a.lev,mode:budDraft?budDraft.mode:'new',why:a.why}; render(); toast(a.ok?t_("fin.preventivo_compilato_controlla_l"):t_("fin.preventivo_compilato_ma_non")); break; }
    case 'budrev': if(canRevise(t)){ budDraft={...finInit(t).bud.lev,mode:'rev'}; render(); } break;
    case 'budcancel': budDraft=null; render(); break;
    case 'offeracc': { acceptOffer(+el.dataset.k); budDraft=null; negId=null; sheetPid=null; stopViewer(); viewer=null; clubView=null; area='scrivania'; sub='home'; save(); render(); toast(t_("fin.benvenuto_nella_nuova_societa")); break; }
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
