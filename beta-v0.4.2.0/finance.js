/* ====================== PATRIMONIO, BANCA, BILANCIO, QUOTE ======================
   Valore della società = strutture + cartellini + cassa − debiti.
   La banca presta in base ai conti e al valore, con o senza pegno; le rate non pagate diventano quote della banca.
   Con il 25% la banca ha il veto sul preventivo e sulle spese fuori budget; con il 51% approva solo preventivi
   che riducono il debito e può licenziare il presidente, dopo un ultimatum. Stesse regole per le squadre del computer. */

const FACS={
  st:{n:'Stadio', base:900000, cost:l=>350000*l, dur:4, eff:l=>fmtK(4000+3000*(l-1))+' posti, più incassi'},
  cs:{n:'Centro sportivo', base:400000, cost:l=>300000*l, dur:3, eff:l=>l<=1?'crescita normale dei giocatori':'crescita dei giocatori +'+(8*(l-1))+'%'},
  sg:{n:'Settore giovanile', base:250000, cost:l=>250000*l, dur:3, eff:l=>l<=1?'2–3 ragazzi a fine stagione':`ragazzi più forti (+${fmtV((0.4*(l-1)).toFixed(1))}) e più spesso tre`}
};
const PEG_TXT={none:'senza garanzie', str:'pegno sulle strutture', car:'pegno sui cartellini'};
const BUD_TOL=0.12, REV_TOL=0.15;

/* ---------- patrimonio e valore ---------- */
function facLevel(t,k){ return (t.fac&&t.fac[k])||1; }
function facValue(t,k){ const l=facLevel(t,k); let v=FACS[k].base; for(let i=1;i<l;i++) v+=FACS[k].cost(i)*0.9;
  if(t.build && t.build.k===k) v+=FACS[k].cost(l)*0.9*(1-t.build.left/FACS[k].dur); return Math.round(v/1000)*1000; }
function facTotal(t){ return Object.keys(FACS).reduce((s,k)=>s+facValue(t,k),0); }
function squadValue(t){ return teamPlayers(t).reduce((s,p)=>s+value(p),0); }
function bankDebt(t){ const f=finInit(t); return f.loans.reduce((s,l)=>s+l.pr,0)+f.ins; }
function clubAssets(t){ return facTotal(t)+squadValue(t)+Math.max(0,t.cash); }
function clubDebts(t){ return bankDebt(t)+arrears(t)+Math.max(0,-t.cash); }
function netValue(t){ return clubAssets(t)-clubDebts(t); }

/* ---------- reputazione del presidente (solo per chi gioca) ---------- */
function repAdd(d,why){ if(G.rep==null) G.rep=50; G.rep=clamp(Math.round((G.rep+d)*10)/10,0,100); G.repC=G.repC||[]; G.repC.unshift({s:G.season,md:G.md,t:why,d}); if(G.repC.length>8) G.repC.length=8; }
function repLevel(r){ return r>=75?'ottima':r>=60?'buona':r>=40?'nella media':r>=25?'scarsa':'pessima'; }

/* ---------- finanziamenti ---------- */
function annuity(P,n,apr){ const r=apr/100/14; return r>0? P*r/(1-Math.pow(1+r,-n)) : P/n; }
function principalFor(rata,n,apr){ const r=apr/100/14; return r>0? rata*(1-Math.pow(1+r,-n))/r : rata*n; }
function pledgeable(t){ return teamPlayers(t).filter(p=>!p.peg && !p.retired).sort((a,b)=>value(b)-value(a)); }
function unsecuredCap(t,n){ const f=finInit(t), exR=f.loans.reduce((s,l)=>s+l.rate,0); return Math.max(0,principalFor(Math.max(0,0.32*roundIncome(t)-exR),n,7)); }
/* quanto presta la banca: con le sole entrate (rata sostenibile) o con un pegno; mai oltre il 65% del valore netto della società */
function bankLimits(t,n){ const f=finInit(t), nv=netValue(t), unsec=unsecuredCap(t,n);
  const strV=Object.keys(FACS).filter(k=>!(t.facPeg&&t.facPeg[k])).reduce((s,k)=>s+facValue(t,k),0);
  const carV=pledgeable(t).slice(0,6).reduce((s,p)=>s+value(p),0);
  const cap=Math.max(0,0.65*nv-bankDebt(t));
  const blocked = f.insN>0 ? 'rate' : nv<=0 ? 'valore' : (t.own&&t.own.bank>=51&&t.id===0) ? 'controllo' : null;
  const r=x=>blocked?0:Math.max(0,Math.floor(Math.min(x,cap)/10000)*10000);
  return {none:r(unsec), str:r(unsec+0.6*strV), car:r(unsec+0.5*carV), cap, strV, carV, blocked}; }
function pickPledge(t,amt,n){ const need=Math.max(1,(amt-unsecuredCap(t,n))/0.5), out=[]; let s=0; for(const p of pledgeable(t)){ if(s>=need && out.length) break; out.push(p); s+=value(p); } return out; }
/* rischio visto dalla banca: decide il tasso minimo (segreto) */
function bankRisk(t,amt){ const f=finInit(t), nv=netValue(t), lev=nv>0?(bankDebt(t)+(amt||0))/nv:9, why=[];
  let r=4+lev*7; const wr=wageRatio(t);
  if(wr>0.85){ r+=(wr-0.85)*8; why.push('stipendi alti rispetto ai ricavi'); }
  if(arrears(t)>0){ r+=1.5; why.push('stipendi arretrati'); }
  if(f.ins>0){ r+=3; why.push('rate non pagate'); }
  if(f.pen){ r+=0.8; why.push('penalizzazione in classifica'); }
  if(f.breach){ r+=Math.min(2,f.breach); why.push('bilancio fuori dal preventivo'); }
  if(t.id===0){ const d=(50-(G.rep??50))/25; r+=d; if(d>0.4) why.push('reputazione del presidente'); else if(d<-0.4) why.push('buona reputazione del presidente'); }
  if(lev>0.3) why.push('debito alto rispetto al valore della società');
  if(!why.length) why.push('conti in ordine');
  return {r, why, lev}; }
function bankRating(t){ const r=bankRisk(t,0).r; return r<5?'A':r<6.5?'B':r<8.5?'C':'D'; }
const RATING_TXT={A:'ottimo',B:'buono',C:'rischioso',D:'molto rischioso'};
function bankMin(t,amt,n,peg){ const k=bankRisk(t,amt); const m=k.r+(n/14-1)*0.4-(peg==='str'?1.5:peg==='car'?1:0)+(hashN((G.season*97+G.md*13+t.id*7+Math.round(amt/10000))|0)-0.5)*0.6; return Math.round(clamp(m,2.5,16)*4)/4; }
function bankBlockTxt(b){ return b==='rate'?'Finché ci sono rate non pagate la banca non concede nuovi finanziamenti.':b==='valore'?'Il valore della società è negativo: la banca non presta.':'La banca controlla la società: niente nuovi finanziamenti, solo rientro del debito.'; }
function createLoan(t,amt,n,apr,peg,pids){ const f=finInit(t); f.lid=(f.lid||0)+1;
  const l={id:f.lid, amt, apr, n, left:n, rate:Math.round(annuity(amt,n,apr)), pr:amt, peg:peg||'none', pids:(pids||[]).slice(), fac:[], s:G.season, md:G.md};
  if(l.peg==='str'){ t.facPeg=t.facPeg||{}; Object.keys(FACS).forEach(k=>{ if(!t.facPeg[k]){ t.facPeg[k]=l.id; l.fac.push(k); } }); }
  l.pids.forEach(id=>{ if(G.P[id]) G.P[id].peg=l.id; });
  f.loans.push(l); earn(t,'finanziamenti',amt);
  f.hist.unshift({s:G.season,md:G.md,t:`Finanziamento di ${kcrE(amt)} al ${fmtV(apr)}% in ${n} rate da ${fmtK(l.rate)}${l.peg!=='none'?', '+PEG_TXT[l.peg]:''}`});
  if(t.id===0) news(`La banca concede ${kcrE(amt)} al ${fmtV(apr)}%: ${n} rate da ${fmtK(l.rate)} cr${l.peg!=='none'?', '+PEG_TXT[l.peg]:''}.`,'club',false,t.id);
  return l; }
function freeLoan(t,l){ (l.pids||[]).forEach(id=>{ const p=G.P[id]; if(p&&p.peg===l.id) p.peg=null; }); if(t.facPeg) for(const k of Object.keys(t.facPeg)) if(t.facPeg[k]===l.id) delete t.facPeg[k]; }
function repayLoan(t,id){ const f=finInit(t), l=f.loans.find(x=>x.id===id); if(!l) return 'Finanziamento non trovato.';
  if(t.cash<l.pr) return `Servono ${kcrE(l.pr)} in cassa per estinguerlo.`;
  spend(t,'rimborso anticipato',l.pr); freeLoan(t,l); f.loans=f.loans.filter(x=>x!==l);
  f.hist.unshift({s:G.season,md:G.md,t:`Estinto in anticipo il finanziamento di ${kcrE(l.amt)} (residuo ${kcrE(l.pr)})`}); if(t.id===0){ repAdd(1,'finanziamento estinto in anticipo'); news(`Finanziamento estinto: versati ${kcrE(l.pr)} alla banca.`,'club',false,t.id); } return null; }
/* rate della giornata: si pagano dopo gli stipendi; quello che manca diventa insoluto (con la mora) */
function bankRound(t){ const f=finInit(t);
  if(f.ins>0){ f.ins=Math.round(f.ins*1.01); const x=Math.max(0,Math.min(f.ins,t.cash)); if(x>0){ spend(t,'rate finanziamenti',x); f.ins-=x; } }
  let due=0; for(const l of f.loans){ const it=l.pr*l.apr/100/14, cap=Math.min(l.pr,Math.max(0,l.rate-it)); l.pr=Math.max(0,Math.round(l.pr-cap)); l.left--; due+=l.rate; if(l.left<=0){ due+=l.pr; l.pr=0; } }
  const x=Math.max(0,Math.min(due,t.cash)); if(x>0) spend(t,'rate finanziamenti',x);
  if(due-x>0.5) f.ins+=Math.round(due-x);
  f.loans.filter(l=>l.left<=0).forEach(l=>freeLoan(t,l)); f.loans=f.loans.filter(l=>l.left>0);
  if(f.ins>0.5){ f.insN++; if(t.id===0) news(f.insN>=3?`Rate non pagate da tre giornate: la banca escute il credito.`:`Cassa vuota: la banca non ha ricevuto tutta la rata (insoluto ${kcrE(f.ins)}). Alla terza giornata di fila il debito diventa quote della banca.`,'club',false,t.id); }
  else { f.ins=0; f.insN=0; }
  if(f.insN>=3) escussione(t); }
/* la banca escute: gli insoluti (e, alla seconda volta, tutto il debito residuo) diventano quote della società */
function escussione(t){ const f=finInit(t), deca=f.esc>=1&&f.loans.length>0;
  if(deca) for(const l of f.loans.filter(x=>x.peg==='car')) seizePledge(t,l);
  const V0=netValue(t); let D=f.ins;
  if(deca){ D+=f.loans.reduce((s,l)=>s+l.pr,0); f.loans.forEach(l=>freeLoan(t,l)); f.loans=[]; }
  f.ins=0; f.insN=0; f.esc++; convertDebt(t,D,V0,deca?'la banca dichiara decaduti i finanziamenti e converte il debito residuo':'la banca converte le rate non pagate'); }
/* decadenza con pegno sui cartellini: la banca vende i giocatori in pegno all'80% del valore e trattiene il ricavato */
function seizePledge(t,l){ const sold=[];
  for(const id of l.pids.slice()){ const p=G.P[id]; if(!p||p.team!==t.id) continue; if(l.pr<1) break; const amt=Math.round(value(p)*0.8/5000)*5000;
    const buyers=G.T.filter(b=>b.id!==t.id && b.id!==0 && !finInit(b).excluded && b.cash>amt*1.2 && b.pl.length<22);
    t.pl=t.pl.filter(x=>x!==p.id); p.peg=null; p.wantOut=false;
    if(buyers.length){ const b=buyers.sort((x,y)=>y.cash-x.cash)[0]; budVary(b,'acquisti',amt); spend(b,'acquisti',amt); b.pl.push(p.id); p.team=b.id; p.ct=3; ensureCaptains(b,true); sold.push(`${p.ln} (${b.n})`); }
    else { p.team=null; p.abroad=true; sold.push(`${p.ln} (estero)`); }
    l.pr=Math.max(0,l.pr-amt); }
  l.pids=[]; ensureCaptains(t,t.id!==0);
  if(sold.length){ finInit(t).hist.unshift({s:G.season,md:G.md,t:`La banca escute il pegno e vende ${sold.join(', ')}`}); news(`${t.n}: la banca escute il pegno e vende ${sold.join(', ')} all'80% del valore.`, t.id===0?'club':'market',true,t.id); } }
function convertDebt(t,D,V0,why){ if(D<=0) return; const old=t.own.bank, V=Math.max(V0,clubAssets(t)*0.15,1), q=old/100;
  t.own.bank=Math.min(95,Math.round((q*V+D)/(V+D)*1000)/10);
  const f=finInit(t); f.hist.unshift({s:G.season,md:G.md,t:`Debito di ${kcrE(D)} convertito in quote: la banca passa dal ${fmtV(old)}% al ${fmtV(t.own.bank)}%`});
  news(`${t.n}: ${why} (${kcrE(D)}). La banca ora ha il ${fmtV(t.own.bank)}% della società.`, t.id===0?'club':'match',true,t.id);
  if(t.id===0) repAdd(-5,'debito convertito in quote della banca');
  sharesChanged(t,old); }
function sharesChanged(t,old){ const b=t.own.bank;
  if(old<25 && b>=25) news(`${t.n}: con il ${fmtV(b)}% la banca ha il diritto di veto sul preventivo e sulle spese fuori budget.`, t.id===0?'club':'match',true,t.id);
  if(old<51 && b>=51){ news(`${t.n}: la banca ha la maggioranza (${fmtV(b)}%). Approverà solo preventivi che riducono il debito.`, t.id===0?'club':'match',true,t.id); issueUltimatum(t,'la banca ha preso la maggioranza della società'); }
  if(old>=51 && b<51 && t.ult && t.ult.st==='on'){ t.ult.st='off'; if(t.id===0) news('La banca scende sotto il 51%: l\'ultimatum decade.','club',true,t.id); } }
/* il ricavato di un giocatore in pegno va prima a ridurre il finanziamento che garantisce */
function bankOkSale(t,p,amt){ if(!p.peg) return null; const f=finInit(t), l=f.loans.find(x=>x.id===p.peg); if(!l){ p.peg=null; return null; }
  return amt>=value(p)*0.9 ? null : `${p.ln} è in pegno alla banca: dà l'ok solo a un prezzo vicino al valore (almeno ${kcrE(Math.ceil(value(p)*0.9/5000)*5000)}).`; }
function onSold(t,p,amt){ if(!p.peg) return; const f=finInit(t), l=f.loans.find(x=>x.id===p.peg); p.peg=null; if(!l) return;
  l.pids=l.pids.filter(id=>id!==p.id); const x=Math.min(l.pr,amt,Math.max(0,t.cash)); if(x>0){ spend(t,'rimborso anticipato',x); l.pr-=x; }
  if(l.pr<1){ freeLoan(t,l); f.loans=f.loans.filter(z=>z!==l); } else l.rate=Math.round(annuity(l.pr,l.left,l.apr));
  f.hist.unshift({s:G.season,md:G.md,t:`${p.ln} era in pegno: ${kcrE(x)} della cessione vanno alla banca`}); if(t.id===0) news(`${p.fn} ${p.ln} era in pegno: ${kcrE(x)} della cessione rimborsano il finanziamento.`,'club',false,t.id); }
function pledgeSweep(t){ const f=finInit(t); for(const l of f.loans){ l.pids=(l.pids||[]).filter(id=>{ const p=G.P[id]; const ok=p&&p.team===t.id&&!p.retired; if(!ok&&p&&p.peg===l.id) p.peg=null; return ok; }); } }

/* ---------- strutture: ampliamenti con l'ok della banca se in pegno o se ha il veto ---------- */
function buildBlock(t,k){ const l=facLevel(t,k); if(l>=5) return 'Livello massimo raggiunto.'; if(t.build) return 'C\'è già un cantiere aperto.';
  const c=FACS[k].cost(l); if(t.cash<c) return `Servono ${kcrE(c)} in cassa.`;
  const f=finInit(t);
  if(t.facPeg&&t.facPeg[k] && (f.insN>0||arrears(t)>0||wageRatio(t)>0.9||t.cash-c<3*(wageBill(t)+staffCost(t)))) return `${FACS[k].n} è in pegno: la banca non dà l'ok finché i conti non sono in ordine e dopo i lavori non restano almeno 3 giornate di stipendi in cassa.`;
  if(t.own.bank>=25 && f.bud && f.bud.s===G.season){ const left=f.bud.lev.inv*1.1+10000-(f.sea.exp.strutture||0); if(c>left) return `Veto della banca (${fmtV(t.own.bank)}%): l'ampliamento non è nel preventivo (restano ${kcrE(Math.max(0,left))} per le strutture).`; }
  return null; }
function startBuild(t,k){ const b=buildBlock(t,k); if(b) return b; const l=facLevel(t,k), c=FACS[k].cost(l);
  spend(t,'strutture',c); t.build={k,left:FACS[k].dur}; if(t.id===0) news(`Lavori avviati: ${FACS[k].n} al livello ${l+1}, pronti in ${FACS[k].dur} giornate.`,'club',false,t.id); return null; }
function buyBlock(t,amt){ if(!(t.own&&t.own.bank>=25)) return null; const f=finInit(t), b=f.bud; if(!b||b.s!==G.season) return null;
  const left=b.lev.acq*1.1+10000-(f.sea.exp.acquisti||0); return amt>left ? `Veto della banca (${fmtV(t.own.bank)}%): l'acquisto supera il budget del preventivo (restano ${kcrE(Math.max(0,left))}).` : null; }

/* ---------- bilancio: preventivo, revisione, consuntivo ---------- */
const BUD_INC=['stadio','sponsor','diritti TV','premi campionato','cessioni','altre entrate'];
const BUD_EXP=['stipendi','staff','strutture','rate finanziamenti','acquisti','premi e una tantum','allenatore','interessi'];
const FIN_MOV={finanziamenti:'in',prestiti:'in','rimborso anticipato':'out','riacquisto quote':'out'};
function budLine(kind,k){ if(FIN_MOV[k]) return null; if(kind==='inc') return BUD_INC.includes(k)?k:'altre entrate';
  return ({'stipendi':'stipendi','staff e strutture':'staff','strutture':'strutture','rate prestiti':'rate finanziamenti','rate finanziamenti':'rate finanziamenti','acquisti':'acquisti','premi':'premi e una tantum','una tantum':'premi e una tantum','allenatore':'allenatore','interessi':'interessi'})[k]||'premi e una tantum'; }
function seaActual(t){ const f=finInit(t), inc={}, exp={}; let finIn=0, finOut=0;
  BUD_INC.forEach(k=>inc[k]=0); BUD_EXP.forEach(k=>exp[k]=0);
  for(const [k,v] of Object.entries(f.sea.inc)){ const L=budLine('inc',k); if(L) inc[L]+=v; else finIn+=v; }
  for(const [k,v] of Object.entries(f.sea.exp)){ const L=budLine('exp',k); if(L) exp[L]+=v; else finOut+=v; }
  return {inc,exp,finIn,finOut}; }
function expectedPos(t){ const s=G.T.map(x=>[x.id,avgTop(teamPlayers(x))]).sort((a,b)=>b[1]-a[1]); return s.findIndex(x=>x[0]===t.id)+1; }
/* stima di quello che manca da qui a fine stagione */
function budRest(t,lev,act){ const left=Math.max(0,14-G.md), f=finInit(t);
  let home=0; for(let r=G.md;r<14;r++){ const fx=G.sched[r]&&G.sched[r].find(x=>x.includes(t.id)); if(fx&&fx[0]===t.id) home++; }
  const hAvg=f.homeInc.length? f.homeInc.reduce((a,b)=>a+b,0)/f.homeInc.length : (4000+3000*(facLevel(t,'st')-1))*0.62*14;
  const wb=wageBill(t), sc=staffCost(t), rateLeft=f.loans.reduce((s,l)=>s+l.rate*Math.min(l.left,left),0)+f.ins;
  const inc={stadio:hAvg*home, sponsor:sponsorInc(t)*left, 'diritti TV':TV_INC*left, 'premi campionato':G.md<=14?60000+(8-lev.pos)*30000:0, cessioni:Math.max(0,lev.ces-(act.inc.cessioni||0)), 'altre entrate':0};
  const exp={stipendi:wb*left*1.03+arrears(t), staff:sc*left, strutture:Math.max(0,lev.inv-(act.exp.strutture||0)), 'rate finanziamenti':rateLeft, acquisti:Math.max(0,lev.acq-(act.exp.acquisti||0)), 'premi e una tantum':wb*left*0.05, allenatore:0, interessi:0};
  return {inc,exp,finIn:Math.max(0,lev.fin-(act.finIn||0))}; }
function budProject(t,lev){ const act=seaActual(t), rest=budRest(t,lev,act), inc={}, exp={};
  BUD_INC.forEach(k=>inc[k]=Math.round(act.inc[k]+rest.inc[k])); BUD_EXP.forEach(k=>exp[k]=Math.round(act.exp[k]+rest.exp[k]));
  const ti=Object.values(inc).reduce((a,b)=>a+b,0), te=Object.values(exp).reduce((a,b)=>a+b,0), f=finInit(t);
  const cash0=f.cash0!=null&&f.cash0s===G.season ? f.cash0 : t.cash-(Object.values(act.inc).reduce((a,b)=>a+b,0)-Object.values(act.exp).reduce((a,b)=>a+b,0)+act.finIn-act.finOut);
  const finIn=Math.round(act.finIn+rest.finIn), finOut=Math.round(act.finOut);
  return {inc,exp,ti,te,saldo:ti-te,finIn,finOut,cash0:Math.round(cash0),cashEnd:Math.round(cash0+ti-te+finIn-finOut),act,lev}; }
function defaultLev(t){ const wb=wageBill(t), sc=staffCost(t), pos=t.id===0&&t.prevPos!=null?Math.max(1,Math.min(8,Math.round((expectedPos(t)+t.prevPos+1)/2))):expectedPos(t);
  const lev={acq:0,ces:0,inv:0,fin:0,pos};
  const base=budProject(t,lev); lev.acq=Math.max(0,Math.floor((base.cashEnd-4*(wb+sc))*0.45/10000)*10000);
  if(t.own.bank>=51 || t.id!==0) lev.acq=0;
  const p2=budProject(t,lev); if(p2.cashEnd<2*(wb+sc)){ lev.acq=0; const p3=budProject(t,lev); const need=2*(wb+sc)-p3.cashEnd; if(need>0){ const L=bankLimits(t,28); lev.fin=Math.min(Math.max(L.none,L.str),Math.ceil(need/10000)*10000); } }
  return lev; }
/* controlli per convalidare il preventivo; con il 25% la banca può dire no, con il 51% vuole il rientro del debito */
function budCheck(t,lev){ const P=budProject(t,lev), wb=wageBill(t)+staffCost(t), errs=[], bank=[]; const L=bankLimits(t,28), best=Math.max(L.none,L.str,L.car);
  if(P.cashEnd<2*wb) errs.push(`La cassa a fine stagione (${kcrE(P.cashEnd)}) non copre due giornate di stipendi e staff (${kcrE(2*wb)}): riduci gli acquisti, prevedi delle cessioni o un finanziamento.`);
  if(lev.fin>best) errs.push(L.blocked?bankBlockTxt(L.blocked):`La banca oggi presterebbe al massimo ${kcrE(best)}: il finanziamento previsto è troppo alto.`);
  if(lev.ces>squadValue(t)*0.4) errs.push('Cessioni previste non credibili: più del 40% del valore della rosa.');
  const b=t.own.bank;
  if(b>=25 && P.saldo<-0.05*P.te && lev.fin>0) bank.push(`Veto della banca (${fmtV(b)}%): non finanzia un preventivo in perdita. Il saldo previsto è ${kcrE(P.saldo)}.`);
  if(b>=25 && lev.acq>Math.max(lev.ces,0)+Math.max(0,P.cash0-4*wb)) bank.push(`Veto della banca (${fmtV(b)}%): troppi acquisti rispetto alla cassa e alle cessioni previste.`);
  if(b>=51){ if(lev.fin>0) bank.push('La banca ha la maggioranza: niente nuovi finanziamenti, il preventivo deve ridurre il debito.'); if(P.saldo<0) bank.push(`La banca ha la maggioranza: vuole un saldo positivo per rientrare del debito (ora ${kcrE(P.saldo)}).`); if(lev.acq>lev.ces) bank.push('La banca ha la maggioranza: gli acquisti non possono superare le cessioni.'); }
  return {ok:!errs.length&&!bank.length, errs, bank, P}; }
/* «Compila in automatico»: cifre ragionevoli ricavate dalle stagioni passate (fino a tre) e da come sta andando quella in corso.
   Poi le corregge finché il preventivo è convalidabile: prima un finanziamento entro i limiti della banca, poi meno acquisti e lavori. */
function autoLev(t){ const f=finInit(t), H=(f.budH||[]).slice(0,3), why=[], A=seaActual(t), wb=wageBill(t)+staffCost(t);
  const avg=g=>H.length?H.reduce((s,h)=>s+(g(h)||0),0)/H.length:0, r10=x=>Math.max(0,Math.round(x/10000)*10000);
  const seas=H.length===1?'nella scorsa stagione':`in media nelle ultime ${H.length} stagioni`, ep=expectedPos(t), lev={acq:0,ces:0,inv:0,fin:0,pos:ep};
  if(!H.length){ Object.assign(lev,defaultLev(t)); why.push('Non ci sono stagioni precedenti: le cifre sono stimate su cassa, stipendi e forza della rosa di oggi.');
    why.push(`Acquisti: ${kcrE(lev.acq)}, poco meno della metà della cassa che resterebbe a fine stagione dopo stipendi, staff e rate.`);
    why.push('Cessioni e strutture: nessuna, finché non ci sono stagioni da cui capire le tue abitudini.');
    why.push(`Obiettivo: ${lev.pos}° posto, in base alla forza della rosa rispetto alle altre squadre${t.prevPos!=null?' e al piazzamento della scorsa stagione':''}.`); }
  else {
    const acqH=avg(h=>h.lines.act.exp.acquisti), cesH=avg(h=>h.lines.act.inc.cessioni), invH=avg(h=>h.lines.act.exp.strutture), posH=avg(h=>h.pos);
    lev.acq=r10(acqH); lev.ces=r10(cesH*0.8); lev.inv=r10(invH);
    lev.pos=clamp(Math.round(posH*0.6+ep*0.4),1,8);
    why.push(`Acquisti: ${kcrE(acqH)} spesi ${seas}.`);
    why.push(cesH>0?`Cessioni: l'80% di quanto incassato ${seas} (${kcrE(cesH)}), perché le vendite non sono mai sicure.`:`Cessioni: nessuna, come ${seas}.`);
    why.push(invH>0?`Strutture: ${kcrE(invH)} investiti ${seas}.`:'Strutture: nessun lavoro, come in passato.');
    why.push(`Obiettivo: ${lev.pos}° posto, tra i piazzamenti passati (${H.map(h=>h.pos+'°').join(', ')}) e la forza attuale della rosa (${ep}ª).`); }
  if(G.md>0){ const a=A.exp.acquisti||0, c=A.inc.cessioni||0, i=A.exp.strutture||0;
    if(a>lev.acq){ lev.acq=r10(a); why.push(`Acquisti portati a ${kcrE(a)}: è quanto hai già speso in questa stagione.`); }
    if(c>lev.ces){ lev.ces=r10(c); why.push(`Cessioni portate a ${kcrE(c)}: è quanto hai già incassato.`); }
    if(i>lev.inv){ lev.inv=r10(i); why.push(`Strutture portate a ${kcrE(i)}: lavori già pagati in questa stagione.`); } if(A.finIn>0){ lev.fin=r10(A.finIn); why.push(`Finanziamenti: ${kcrE(A.finIn)} già ottenuti in questa stagione.`); } }
  const invMax=Object.keys(FACS).reduce((s,k)=>s+(facLevel(t,k)<5?FACS[k].cost(facLevel(t,k)):0),0)+(A.exp.strutture||0);
  lev.inv=Math.min(lev.inv,r10(invMax)); lev.ces=Math.min(lev.ces,Math.floor(squadValue(t)*0.4/10000)*10000);
  if(t.own.bank>=51){ if(lev.acq>lev.ces){ lev.acq=lev.ces; why.push('La banca ha la maggioranza: acquisti non oltre le cessioni.'); } lev.fin=Math.max(0,r10(A.finIn)); }
  /* correzioni per rendere il preventivo convalidabile: prima meno lavori e acquisti (fino a quanto già speso), poi un finanziamento solo se non basta */
  let c=budCheck(t,lev); const fixed=[], acq0=lev.acq, inv0=lev.inv, minA=r10(A.exp.acquisti||0), minI=r10(A.exp.strutture||0);
  for(let k=0;k<80&&!c.ok;k++){
    if(lev.inv>minI) lev.inv=Math.max(minI,lev.inv-Math.max(10000,r10(lev.inv*0.25)));
    else if(lev.acq>minA) lev.acq=Math.max(minA,lev.acq-Math.max(10000,r10(lev.acq*0.2)));
    else break; c=budCheck(t,lev); }
  if(lev.inv<inv0) fixed.push(`lavori ridotti a ${kcrE(lev.inv)}`); if(lev.acq<acq0) fixed.push(`acquisti ridotti a ${kcrE(lev.acq)}`);
  if(!c.ok && c.P.cashEnd<2*wb && t.own.bank<51){ const L=bankLimits(t,28), best=Math.max(L.none,L.str,L.car), need=lev.fin+Math.ceil((2*wb-c.P.cashEnd)/10000)*10000;
    if(best>lev.fin){ const old=lev.fin; lev.fin=Math.min(best,need); const c2=budCheck(t,lev); if(c2.ok||c2.errs.length<c.errs.length){ fixed.push(`un finanziamento di ${kcrE(lev.fin-old)} (da chiedere poi alla banca)`); c=c2; } else lev.fin=old; } }
  if(fixed.length) why.push(`Per far quadrare i conti: ${fixed.join(', ')}.`);
  if(!c.ok) why.push('Anche così il preventivo non quadra: guarda gli avvisi qui sotto e correggi a mano, per esempio prevedendo una cessione.');
  return {lev, why, ok:c.ok}; }
function makeBudget(t,lev,by){ const f=finInit(t), P=budProject(t,lev); const old=f.bud&&f.bud.s===G.season?f.bud:null;
  f.bud={s:G.season, md:G.md, lev:{...lev}, inc:P.inc, exp:P.exp, ti:P.ti, te:P.te, saldo:P.saldo, finIn:P.finIn, cash0:P.cash0, cashEnd:P.cashEnd, by, st:'ok', rev:old?old.rev:null, revUsed:old?old.revUsed:false, orig:old?(old.orig||{ti:old.ti,te:old.te,saldo:old.saldo}):null}; return f.bud; }
function needBudget(t){ const f=finInit(t); return !(f.bud && f.bud.s===G.season); }
function ensureBudget(t,force){ const f=finInit(t); if(f.cash0s!==G.season && G.md===0){ f.cash0=t.cash; f.cash0s=G.season; }
  if(needBudget(t) && (t.id!==0 || force || G.md>0)) makeBudget(t,defaultLev(t), t.id===0?'ufficio':'pres'); }
/* revisione a metà stagione, dopo la 7ª giornata */
function budReview(t){ const f=finInit(t), b=f.bud; if(!b||b.s!==G.season) return; const P=budProject(t,b.lev), sc=(b.saldo-P.saldo)/Math.max(1,b.te);
  b.rev={md:G.md, scost:sc, ok:sc<=REV_TOL, saldo:P.saldo};
  if(t.id===0){ news(sc<=REV_TOL?`Revisione di metà stagione: i conti sono in linea con il preventivo${sc<0?' (meglio del previsto)':''}.`:`Revisione di metà stagione: saldo previsto ${kcrE(P.saldo)} contro ${kcrE(b.saldo)} del preventivo (scostamento ${Math.round(sc*100)}%, tolleranza ${Math.round(REV_TOL*100)}%). Puoi aggiornare il preventivo una volta, fino alla 9ª giornata.`,'club',false,t.id); if(sc>REV_TOL) repAdd(-2,'revisione di metà stagione fuori dal preventivo'); }
  if(sc>REV_TOL && t.own.bank>=51) issueUltimatum(t,'la revisione di metà stagione è fuori dal preventivo'); }
/* variazione di bilancio decisa dal presidente del computer (lavori o acquisti non previsti) */
function budVary(t,line,amt){ const b=finInit(t).bud; if(!b||b.s!==G.season||t.id===0) return; const key=line==='strutture'?'inv':'acq'; b.lev[key]+=amt; b.exp[line]=(b.exp[line]||0)+amt; b.te+=amt; b.saldo-=amt; b.cashEnd-=amt; }
function canRevise(t){ const b=finInit(t).bud; return !!(b && b.s===G.season && b.rev && !b.revUsed && G.md>=7 && G.md<=9); }
function reviseBudget(t,lev){ const c=budCheck(t,lev); if(!c.ok) return c; const b=makeBudget(t,lev,'pres'); b.revUsed=true; if(t.id===0){ repAdd(-1,'preventivo rivisto a metà stagione'); news('Preventivo aggiornato dopo la revisione di metà stagione.','club',false,t.id); } return c; }
/* consuntivo: tolleranza del 12% sul saldo, misurata sulle uscite previste */
function closeBudget(t){ const f=finInit(t); if(!f.bud||f.bud.s!==G.season) makeBudget(t,defaultLev(t),'ufficio'); const b=f.bud, A=seaActual(t);
  const ti=Object.values(A.inc).reduce((a,c)=>a+c,0), te=Object.values(A.exp).reduce((a,c)=>a+c,0), saldo=ti-te, sc=(b.saldo-saldo)/Math.max(1,b.te), ok=sc<=BUD_TOL;
  const pos=standings().findIndex(x=>x.id===t.id)+1, objOk=pos<=b.lev.pos;
  f.budH.unshift({s:G.season, prev:{ti:b.ti,te:b.te,saldo:b.saldo}, act:{ti,te,saldo,finIn:A.finIn}, scost:sc, ok, pos, objPos:b.lev.pos, objOk, rev:b.revUsed, lines:{prev:{inc:b.inc,exp:b.exp},act:{inc:A.inc,exp:A.exp}}}); if(f.budH.length>8) f.budH.length=8;
  f.breach = ok ? Math.max(0,(f.breach||0)-1) : (f.breach||0)+1;
  if(t.id===0){ repAdd(ok?3:-6, ok?'consuntivo in linea con il preventivo':'consuntivo fuori dal preventivo'); repAdd(objOk?2:-2, objOk?`obiettivo sportivo raggiunto (${pos}°)`:`obiettivo sportivo mancato (${pos}° invece di ${b.lev.pos}°)`); if(pos===1) repAdd(6,'campionato vinto');
    news(`Consuntivo della stagione ${G.season}: saldo ${kcrE(saldo)} contro ${kcrE(b.saldo)} previsti — ${ok?'in tolleranza':'fuori tolleranza'} (${sc>0?'peggio':'meglio'} del ${Math.abs(Math.round(sc*100))}%).`,'club',false,t.id); }
  if(!ok && t.own.bank>=25 && t.own.bank<51 && t.id===0) news('La banca, socia al '+fmtV(t.own.bank)+'%, chiede più rigore: un altro consuntivo fuori dal preventivo peserà sul tasso dei finanziamenti.','club',false,t.id);
  if(!ok && t.own.bank>=51){ if(t.ult && (t.ult.s===G.season || t.ult.st==='on')) fire(t,'consuntivo fuori dal preventivo dopo l\'ultimatum della banca'); else issueUltimatum(t,'consuntivo fuori dal preventivo',true); }
  f.valH=f.valH||[]; f.valH.unshift({s:G.season,v:Math.round(netValue(t)),bank:t.own.bank}); if(f.valH.length>10) f.valH.length=10;
  if(f.insN===0) f.esc=0; }

/* ---------- ultimatum e licenziamento ---------- */
function issueUltimatum(t,why,nextSeason){ if(t.ult && t.ult.st==='on') return; const due=nextSeason?4:Math.min(14,G.md+4);
  t.ult={st:'on', s:nextSeason?G.season+1:G.season, md:G.md, due, why};
  news(t.id===0?`Ultimatum della banca: ${why}. Entro la ${due===14?'fine della stagione':due+'ª giornata'}${nextSeason?' della prossima stagione':''} servono rate e stipendi pagati e conti in linea con il preventivo, altrimenti sarai licenziato.`:`${t.n}: ultimatum della banca al presidente (${why}).`, t.id===0?'club':'match',true,t.id); }
function ultConds(t){ const f=finInit(t), b=f.bud; const P=b&&b.s===G.season?budProject(t,b.lev):null, sc=P?(b.saldo-P.saldo)/Math.max(1,b.te):0;
  return [{ok:f.ins<1, t:'nessuna rata non pagata'}, {ok:arrears(t)<1, t:'stipendi in regola'}, {ok:sc<=BUD_TOL, t:`conti in linea con il preventivo (scostamento ${Math.round(sc*100)}%, massimo ${Math.round(BUD_TOL*100)}%)`}]; }
function ultCheck(t){ const u=t.ult; if(!u||u.st!=='on'||u.s!==G.season||G.md<u.due) return; if(t.own.bank<51){ u.st='off'; return; }
  const c=ultConds(t); if(c.every(x=>x.ok)){ u.st='ok'; if(t.id===0){ repAdd(3,'ultimatum della banca superato'); news('Ultimatum superato: la banca conferma la fiducia al presidente.','club',true,t.id); } }
  else { u.st='ko'; fire(t,'ultimatum non rispettato: '+c.filter(x=>!x.ok).map(x=>x.t).join(', ')); } }
function fire(t,why){ if(t.id===0){ if(G.fired||G.pendFire) return; repAdd(-12,'licenziato dalla banca'); G.pendFire={why}; t.ult=null; news(`Licenziato: ${why}. La banca nomina un nuovo presidente al posto tuo.`,'club',true,t.id); }
  else { t.presN=(t.presN||0)+1; t.ult=null; finInit(t).breach=0; news(`${t.n}: la banca sostituisce il presidente (${why}).`,'match',true,t.id); } }
function clubAppeal(t){ const st=standings(); return (8-st.indexOf(t))*0.5+squadValue(t)/1e6+Math.max(0,t.cash)/1e6-bankDebt(t)/1e6-t.own.bank/15+facTotal(t)/2e6; }
function makeOffers(){ const cand=G.T.filter(t=>t.id!==0).sort((a,b)=>clubAppeal(b)-clubAppeal(a)), rep=G.rep??50, n=rep<20?2:3;
  const i0=clamp(Math.round((1-rep/100)*(cand.length-1)-1),0,cand.length-n); return cand.slice(i0,i0+n).map(t=>t.id); }
function firePending(){ if(!G.pendFire) return; G.fired={why:G.pendFire.why, s:G.season, md:G.md, club:G.T[0].n, offers:makeOffers()}; G.pendFire=null; }
/* il presidente passa a un'altra società: si scambiano gli indici delle squadre, così il club scelto diventa il numero 0 */
function swapTeams(a,b){ const A=G.T[a], B=G.T[b]; G.T[a]=B; G.T[b]=A; B.id=a; A.id=b; const sw=x=>x===a?b:x===b?a:x;
  Object.values(G.P).forEach(p=>{ if(p.team===a||p.team===b) p.team=sw(p.team); });
  G.sched=G.sched.map(r=>r.map(([h,x])=>[sw(h),sw(x)])); G.res=G.res.map(r=>r.map(m=>({...m,h:sw(m.h),a:sw(m.a)})));
  (G.req||[]).forEach(r=>{ if(r.st==='open' && (r.team===a||r.team===b)) r.st='exp'; r.team=sw(r.team); if(r.buyer!=null&&r.buyer>=0) r.buyer=sw(r.buyer); if(r.opp!=null) r.opp=sw(r.opp); if(r.from!=null) r.from=sw(r.from); });
  G.T.forEach(t=>(t.miss||[]).forEach(m=>{ if(m.opp!=null) m.opp=sw(m.opp); }));
  remapClubs(sw); G.last=null; G.cands=null; G.bneg=null; }
function acceptOffer(k){ const F=G.fired; if(!F||!F.offers.includes(k)) return; const old=G.T[0];
  /* carriera del presidente (0.4.1.0): licenziato a metà stagione, la riga del club lasciato si chiude ora; a fine stagione l'ha già scritta endSeason */
  const pr=(G.prs||[]).find(x=>x.u&&x.t===0); if(pr && F.md>0 && F.s===G.season) presLeave(pr,F.md);
  swapTeams(0,k); const t=G.T[0], f=finInit(t); if(pr) pr.t=0;
  old.promise=null; old.bonus=null; t.ult=null; G.fired=null; G.prez=(G.prez||0)+1;
  if(G.md===0) f.bud=null;
  news(`Nuovo incarico: sei il presidente di ${t.n}. Allenatore ${t.coach.n}, cassa ${kcrE(t.cash)}, la banca ha il ${fmtV(t.own.bank)}% della società.`,'club',false,t.id); }

/* ---------- riacquisto delle quote ---------- */
function buyBackPrice(t,pct){ return Math.round(Math.max(0,netValue(t))*pct/100*1.05/1000)*1000; }
function buyBackBlock(t,pct){ const f=finInit(t); if(t.own.bank<=0) return 'La banca non ha quote.'; if(pct>t.own.bank+1e-9) return 'La banca non ha tutte queste quote.';
  if(f.ins>0||f.insN>0) return 'Prima vanno pagate le rate arretrate.'; if(arrears(t)>0) return 'Prima vanno pagati gli stipendi arretrati.';
  if(wageRatio(t)>0.85) return 'Il rapporto stipendi/ricavi è sopra l\'85%: la banca non vende finché i conti non sono sani.';
  const h=f.budH&&f.budH[0]; if(h&&!h.ok&&h.s===G.season-1) return 'L\'ultimo consuntivo è fuori dal preventivo: la banca aspetta un bilancio in ordine.';
  const c=buyBackPrice(t,pct); if(t.cash-c<3*(wageBill(t)+staffCost(t))) return `Servono ${kcrE(c)} più tre giornate di stipendi in cassa.`; return null; }
function buyBack(t,pct){ const b=buyBackBlock(t,pct); if(b) return b; const c=buyBackPrice(t,pct), old=t.own.bank; spend(t,'riacquisto quote',c); t.own.bank=Math.max(0,Math.round((old-pct)*10)/10);
  finInit(t).hist.unshift({s:G.season,md:G.md,t:`Riacquistato il ${fmtV(pct)}% della società per ${kcrE(c)}`}); if(t.id===0){ repAdd(2,'quote riacquistate dalla banca'); news(`Riacquistato dalla banca il ${fmtV(pct)}% per ${kcrE(c)}: ora la banca ha il ${fmtV(t.own.bank)}%.`,'club',true,t.id); } else news(`${t.n} riacquista quote dalla banca: ora ha il ${fmtV(t.own.bank)}%.`,'match',true,t.id);
  sharesChanged(t,old); return null; }

/* ---------- presidenti del computer: banca, strutture, quote ---------- */
function botBank(t){ const f=finInit(t); if(f.excluded) return; const need=wageBill(t)*2+staffCost(t)*2;
  if((t.cash<need||arrears(t)>0) && f.loans.length<3){ const L=bankLimits(t,28), peg=L.none>=100000?'none':L.str>=100000?'str':L.car>=100000?'car':null;
    if(peg){ const amt=Math.min(L[peg],250000), pids=peg==='car'?pickPledge(t,amt,28).map(p=>p.id):[], apr=bankMin(t,amt,28,peg); if(apr<14) createLoan(t,amt,28,apr,peg,pids); } }
  if(t.own.bank>0 && t.own.bank<95){ const pct=Math.min(5,t.own.bank); if(!buyBackBlock(t,pct) && t.cash>buyBackPrice(t,pct)*3+6*wageBill(t)) buyBack(t,pct); }
  if(!t.build && f.insN===0 && wageRatio(t)<0.8 && G.md>=2 && G.md<=11){ const ks=Object.keys(FACS).filter(k=>facLevel(t,k)<4).sort((a,b)=>facLevel(t,a)-facLevel(t,b));
    for(const k of ks){ const c=FACS[k].cost(facLevel(t,k)); if(t.cash>c*2.5+8*(wageBill(t)+staffCost(t)) && hashN((G.season*31+G.md*7+t.id*3)|0)<0.25){ budVary(t,'strutture',c); startBuild(t,k); break; } } } }

/* ---------- trattativa con la banca (presidente umano): si tratta il tasso ---------- */
function bankOpen(t,amt,n,peg){ const L=bankLimits(t,n); if(L.blocked) return {err:bankBlockTxt(L.blocked)};
  if(amt<50000) return {err:'L\'importo minimo è 50k.'}; if(amt>L[peg]) return {err:`Con questa garanzia (${PEG_TXT[peg]}) la banca arriva al massimo a ${kcrE(L[peg])}.`};
  const M=bankMin(t,amt,n,peg); if(M>=14) return {err:'Il rischio è troppo alto: la banca non concede il finanziamento.'};
  const ask=Math.round((M+1.25+hashN((G.season*53+G.md*11+Math.round(amt/10000))|0)*1.5)*4)/4;
  const pids=peg==='car'?pickPledge(t,amt,n).map(p=>p.id):[];
  G.bneg={amt,n,peg,pids,M,ask,c:ask,k:0.32,pat:100,pat0:100,st:'open',why:bankRisk(t,amt).why,hist:[{by:'bank',v:ask,txt:'Vista la situazione della società, possiamo concederlo al'}]}; return G.bneg; }
function bankPropose(v){ const n=G.bneg; if(!n||n.st!=='open') return; v=Math.round(clamp(v,2.5,n.ask)*4)/4; n.hist.push({by:'pres',v});
  if(v>=n.M-1e-9){ n.hist.push({by:'bank',txt:'D\'accordo, firmiamo.'}); bankClose(v); return; }
  const g=clamp((n.M-v)/Math.max(0.5,n.ask-n.M+1),0,1); n.pat=Math.max(0,n.pat-(12+70*Math.pow(g,1.1)));
  if(n.pat<=0){ n.st='stalled'; n.hist.push({by:'bank',v:n.c,txt:'Non scendiamo oltre. La nostra offerta resta al'}); return; }
  const prev=n.c; n.c=Math.max(Math.ceil(n.M*4)/4, Math.round((n.c-(n.c-n.M)*n.k-0.05)*4)/4); if(n.c>prev) n.c=prev;
  n.hist.push({by:'bank',v:n.c,txt:n.c>=prev?'Non possiamo scendere, restiamo al':(n.c-n.M)<0.3?'Ultima offerta:':g>0.7?'Tasso fuori mercato. Possiamo scendere al':'Possiamo scendere al'}); }
function bankClose(v){ const n=G.bneg, t=G.T[0]; n.st='deal'; n.v=v; const l=createLoan(t,n.amt,n.n,v,n.peg,n.pids); n.rate=l.rate; }
function bankAcceptAsk(){ const n=G.bneg; if(!n||(n.st!=='open'&&n.st!=='stalled')) return; n.hist.push({by:'pres',acc:true,v:n.c}); n.hist.push({by:'bank',txt:'Bene, firmiamo.'}); bankClose(n.c); }
