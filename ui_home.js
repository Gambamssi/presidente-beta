/* ================= INTERFACCIA: SCRIVANIA (segretaria), LEGA, TRATTATIVE, PROFILO PUBBLICO DEI CLUB, FINESTRE ================= */
/* Regola per il futuro multigiocatore: le pagine pubbliche (Lega e profilo dei club) leggono lo stato SOLO
   attraverso le funzioni pubbliche qui sotto (publicClub, publicSquad, publicFixtures, publicNews, publicScorers,
   publicRound). Niente cassa, stipendi, debiti, morale, richieste, trattative, attributi veri, taccuino. */

/* ---------- nomi dei club cliccabili ---------- */
function clubLink(id, chip){ const t=G.T[id]; if(!t) return '';
  return `<button class="link clubl" data-act="club" data-id="${id}" title="Profilo di ${esc(t.n)}">${chip?`<span class="chip" style="--c:${t.c}"></span>`:''}${esc(t.n)}</button>`; }
/* nel testo di una notizia: i nomi dei club riconoscibili diventano link */
function linkClubs(txt){ const s=esc(txt), L=G.T.map(t=>[esc(t.n),t.id]).sort((a,b)=>b[0].length-a[0].length);
  const rx=new RegExp(L.map(([n])=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  return s.replace(rx,m=>{ const x=L.find(([n])=>n===m); return x?clubLink(x[1]):m; }); }

/* ---------- notizie pubbliche e private ----------
   k='match' e k='market' sono pubbliche (risultati, trasferimenti, fatti degli altri club).
   k='player' è privata (infortuni, espulsioni, morale, giovani, ritiri del tuo club).
   k='club' e k='coach' sono private, tranne i fatti che riguardano tutta la lega e che per gli altri club
   il motore registra come 'match': penalizzazioni, esclusioni, scudetto, presidente licenziato o sostituito,
   esonero, allontanamento dell'allenatore, quote della banca. */
const PUB_K={match:1, market:1};
const PUB_TXT=/penalizzazion|esclus|vince il campionato|^Licenziato:|sostituisce il presidente|^Esonerato |allontanato dall'arbitro|la banca ora ha il|diritto di veto|la banca ha la maggioranza/i;
function isPublicNews(n){ if(!n) return false; if(PUB_K[n.k]) return true; if(n.k==='club'||n.k==='coach') return PUB_TXT.test(n.t||''); return false; }
const pubNewsText = n=>String(n.t||'').replace(/\s*Il tuo club chiude \d+°\.?/,'');

/* ---------- letture pubbliche ---------- */
function publicNews(){ return G.news.filter(isPublicNews); }
/* valutazione come la vedono gli altri: lo scouting di chi guarda, mai il valore vero (anche per i tuoi giocatori) */
function pubOvrTxt(p){ const n=obsN(p), [a,b]=rangeOf(ovr(p), p.e.pos||0, n? Math.max(0,5-2*n) : 6); return a===b? String(a) : a+'–'+b; }
function publicSquad(id){ const t=G.T[id];
  return teamPlayers(t).filter(p=>!p.retired).sort((a,b)=>'PDCA'.indexOf(a.r)-'PDCA'.indexOf(b.r) || value(b)-value(a))
    .map(p=>({id:p.id, fn:p.fn, ln:p.ln, r:p.r, age:p.age, ovr:pubOvrTxt(p), stars:starsHTML(p), val:value(p), cap:t.cap===p.id, vcap:t.vcap===p.id})); }
function publicFixtures(id){ return G.sched.map((fx,i)=>{ const f=fx.find(x=>x.includes(id)); const r=G.res[i]&&G.res[i].find(x=>x.h===id||x.a===id); return {md:i+1, h:f[0], a:f[1], r:r?{gh:r.gh,ga:r.ga}:null}; }); }
function publicClub(id){ const t=G.T[id]; if(!t) return null; const st=standings(), f=t.fin||{}, b=f.bud&&f.bud.s===G.season?f.bud:null;
  return { id, n:t.n, c:t.c, pos:st.indexOf(t)+1, pts:teamPts(t), pen:f.pen||0, penNext:f.penNext||0, excl:!!f.excluded, tab:t.tab, form:t.form||[],
    coach:{n:t.coach.n, age:t.coach.age, mod:t.coach.mod},
    fac:Object.keys(FACS).map(k=>({k, n:FACS[k].n, l:facLevel(t,k)})),
    bank:(t.own&&t.own.bank)||0,
    bud: b?{ti:b.ti, te:b.te, saldo:b.saldo, acq:b.lev.acq, ces:b.lev.ces, inv:b.lev.inv, pos:b.lev.pos, by:b.by, rev:!!b.revUsed}:null,
    hist:(f.budH||[]).map(h=>({s:h.s, pos:h.pos, objPos:h.objPos, objOk:h.objOk, prev:h.prev.saldo, act:h.act.saldo, ok:h.ok, scost:h.scost})) }; }
function publicScorers(){ return Object.values(G.P).filter(p=>p.gl>0).sort((a,b)=>b.gl-a.gl || a.apps-b.apps).slice(0,15); }
function publicRound(){ return G.md<G.sched.length? G.sched[G.md].map(([h,a])=>({h,a})) : []; }

/* ---------- la segretaria ---------- */
const secName = ()=>(G&&G.sec&&G.sec.n)||'Giulia';
const NUM_IT=['nessuna','una','due','tre','quattro','cinque','sei','sette','otto','nove','dieci'];
const numIt = n=>NUM_IT[n]||String(n);
/* variante della frase scelta con un hash su stagione, giornata e voce: non consuma i numeri casuali del gioco */
function pickV(key, arr){ return arr[Math.floor(hashU(key+'|'+G.season+'|'+G.md, 31)*arr.length)%arr.length]; }
const SEC_LBL={blk:'Bloccante', urg:'Urgente', todo:'Da fare'};
const goAct = (a,s)=>`data-act="go" data-a="${a}"${s?` data-s="${s}"`:''}`;
function reqLabel(q){ const p=q.pid!=null?G.P[q.pid]:null; return REQ_KIND[q.kind].toLowerCase()+(p?' di '+p.fn+' '+p.ln:q.kind==='rinforzo'?' dell\'allenatore':q.kind==='premio'||q.kind==='obiettivo'?' della squadra':''); }
/* voci della segretaria, in ordine di priorità: bloccanti, urgenti, da fare */
function secItems(){
  const t=G.T[0], f=finInit(t), it=[], end=G.md>=G.sched.length;
  const add=(lv,key,txt,short,btn,act)=>it.push({lv,key,txt,short,btn,act});
  // BLOCCANTI
  if(G.fired) add('blk','fired', pickV('fired',[`Presidente, la banca l'ha sollevata dall'incarico. ${G.fired.offers.length} società le offrono la presidenza: prima di tutto va scelta la nuova.`,`Presidente, ci sono ${G.fired.offers.length} offerte per un nuovo incarico. Finché non ne sceglie una non si gioca.`]),
    'Scegliere la nuova società', 'Vedi le offerte', 'data-act="secfired"');
  if(G.md===0 && needBudget(t)) add('blk','bud', pickV('bud',[`Il preventivo della stagione ${G.season} è ancora da convalidare: senza, la Lega non ci fa giocare.`,`Prima della giornata 1 serve il preventivo convalidato. L'ho lasciato aperto in Bilancio, con il tasto per compilarlo in automatico.`]),
    'Convalidare il preventivo', 'Apri il bilancio', goAct('societa','bilancio'));
  // URGENTI
  if(t.ult && t.ult.st==='on'){ const c=ultConds(t), ko=c.filter(x=>!x.ok);
    add('urg','ult', `La banca ha dato un ultimatum: la verifica è ${ultWhen(t.ult)}. ${ko.length?'Oggi non sono rispettate queste condizioni: '+esc(ko.map(x=>x.t).join('; '))+'.':'Per ora le condizioni sono rispettate: '+esc(c.map(x=>x.t).join('; '))+'.'}`,
      `Ultimatum della banca (verifica ${ultWhen(t.ult)})`, 'Vai alla banca', goAct('societa','banca')); }
  activeMissions(t).filter(m=>m.kind==='rinforzo' && m.due-G.md<=1).forEach(m=>
    add('urg','miss'+m.due, pickV('miss',[`Ha promesso a ${esc(t.coach.n)} un ${m.roleN} di valore almeno ${String(m.thr).replace('.',',')}: va comprato prima di giocare la giornata ${m.due}.`,`Ultima occasione per il ${m.roleN} promesso a ${esc(t.coach.n)} (valore almeno ${String(m.thr).replace('.',',')}): la promessa scade con la giornata ${m.due}.`]),
      `Rinforzo promesso all'allenatore: un ${m.roleN} entro la giornata ${m.due}`, 'Cerca sul mercato', `data-act="missmkt" data-r="${m.role}"`));
  const open=(G.req||[]).filter(q=>q.team===0 && q.st==='open' && q.kind!=='acquisto' && q.kind!=='offerta').sort((a,b)=>a.due-b.due);
  open.filter(reqExpiring).forEach(q=>
    add('urg','req'+q.id, pickV('req'+q.kind,[`C'è una richiesta che scade: ${esc(reqLabel(q))}. Se non risponde prima di giocare, decade da sola.`,`La richiesta (${esc(reqLabel(q))}) aspetta una risposta: dopo questa giornata scade.`]),
      `Risposta a: ${reqLabel(q)}`, 'Apri la richiesta', `data-act="reqgo" data-id="${q.id}"`));
  const arr=arrears(t);
  if(arr>0){ const nx=CHECKS.find(c=>c>G.md);
    add('urg','arr', `Ci sono ${kcr(arr)} cr di stipendi arretrati. ${nx?`Il prossimo controllo è dopo la giornata ${nx}: vanno pagati prima, altrimenti arriva la penalizzazione.`:'Vanno pagati prima del controllo di fine stagione.'}`,
      `Stipendi arretrati: ${kcr(arr)} cr`, 'Apri i conti', goAct('societa','conti')); }
  if(f.ins>0) add('urg','ins', `La rata della banca non è stata pagata: insoluto di ${kcr(f.ins)} cr da ${f.insN} ${f.insN===1?'giornata':'giornate'}, con la mora dell'1% a giornata. Alla terza giornata di fila il debito diventa quote della banca.`,
      `Rata della banca non pagata (${kcr(f.ins)} cr)`, 'Vai alla banca', goAct('societa','banca'));
  { const b=f.bud; if(canRevise(t) && b.rev && !b.rev.ok) add('urg','rev', `La revisione dopo la giornata ${b.rev.md} dice che i conti sono fuori dal preventivo (scostamento ${Math.round(b.rev.scost*100)}%). Si può aggiornare una volta sola, fino alla giornata 9.`,
      'Preventivo fuori tolleranza da aggiornare', 'Apri il bilancio', goAct('societa','bilancio')); }
  // DA FARE
  const rest=open.filter(q=>!reqExpiring(q));
  if(rest.length) add('todo','reqs', `${rest.length===1?'C\'è una richiesta':'Ci sono '+numIt(rest.length)+' richieste'} in attesa: ${esc(rest.map(reqLabel).join(', '))}.`,
      'Richieste in attesa', rest.length===1?'Apri la richiesta':'Vedi le richieste', `data-act="reqgo" data-id="${rest[0].id}"`);
  const offs=(G.req||[]).filter(q=>q.team===0 && q.st==='open' && q.kind==='offerta');
  if(offs.length) add('todo','offs', `${offs.length===1?'È arrivata un\'offerta':'Sono arrivate '+numIt(offs.length)+' offerte'} per i suoi giocatori: ${esc(offs.map(q=>G.P[q.pid].ln+' ('+buyerOf(q).n+', '+kcr(q.amt)+' cr)').join(', '))}.`,
      'Offerte per i tuoi giocatori', 'Vai alle trattative', goAct('mercato','trattative'));
  if(G.md>=10){ const exp=teamPlayers(t).filter(p=>!p.retired && p.ct<=1);
    if(exp.length) add('todo','ct', `Contratti in scadenza a fine stagione: ${esc(exp.map(p=>p.fn+' '+p.ln).join(', '))}. Conviene decidere per tempo chi tenere.`,
      'Contratti in scadenza', 'Apri la rosa', goAct('squadra','rosa')); }
  { const c2=2*(wageBill(t)+staffCost(t)); if(t.cash<c2) add('todo','cash', `In cassa ci sono ${kcr(t.cash)} cr, meno di due giornate di stipendi e staff (${kcr(c2)} cr).`,
      'Cassa bassa', 'Apri i conti', goAct('societa','conti')); }
  if(!end && G.scoutLeft>0) add('todo','obs', pickV('obs',[`L'osservatore ha ancora ${G.scoutLeft===1?'una relazione':numIt(G.scoutLeft)+' relazioni'} per questa giornata.`,`Se vuole far valutare qualcuno, all'osservatore ${G.scoutLeft===1?'resta una relazione':'restano '+numIt(G.scoutLeft)+' relazioni'} per questa giornata.`]),
      'Relazioni dell\'osservatore', 'Cerca giocatori', goAct('mercato','cerca'));
  G.news.filter(n=>n.s===G.season && n.md===G.md-1 && /è salito al livello/.test(n.t||'')).forEach((n,i)=>
    add('todo','fac'+i, `Lavori finiti: ${esc(n.t)}`, 'Lavori conclusi', 'Vedi le strutture', goAct('societa','strutture')));
  return it;
}
function secBadge(){ return G? secItems().filter(x=>x.lv!=='todo').length : 0; }
function secGreet(it){
  const nb=it.filter(x=>x.lv==='blk').length, nu=it.filter(x=>x.lv==='urg').length, n=nb+nu, nt=it.length-n;
  const when=G.md>=G.sched.length?'prima di chiudere la stagione':'prima della giornata '+(G.md+1);
  if(!n){ const ok='Tutto in ordine, Presidente. Possiamo giocare.'; return nt? ok+' '+(nt===1?'C\'è solo una cosa da fare, quando vuole:':'Se ha un momento, ci sono '+numIt(nt)+' cose da fare:') : ok; }
  const hi=pickV('hi',['Buongiorno Presidente','Bentornato, Presidente','Ben arrivato, Presidente']);
  return `${hi}, ${when} ${n===1?'c\'è una cosa urgente':'ci sono '+numIt(n)+' cose urgenti'}.${nb?(nb===n?' Finché non '+(n===1?'è sistemata':'sono sistemate')+' non si gioca.':' La prima non ci lascia giocare.'):''}`;
}
function secHTML(){ const it=secItems(), nm=secName();
  return `<section class="card sec" aria-label="La segretaria"><div class="sec-h"><span class="sec-av" aria-hidden="true">${esc(nm.charAt(0).toUpperCase())}</span><div><p class="eyebrow">${esc(nm)} · segreteria del presidente</p><p class="sec-say">${secGreet(it)}</p></div></div>
   ${it.length?`<ul class="secl">${it.map(x=>`<li class="si ${x.lv}"><span class="si-tag">${SEC_LBL[x.lv]}</span><p>${x.txt}</p><button class="btn small ${x.lv==='todo'?'ghost':''}" ${x.act}>${x.btn}</button></li>`).join('')}</ul>`:''}</section>`; }

/* ---------- Scrivania ---------- */
function vScrivania(){
  const t=G.T[0], priv=G.news.filter(n=>!isPublicNews(n)).slice(0,14);
  const intro=G.season===1&&G.md===0?`<section class="card"><p class="eyebrow">Come si gioca</p><p>Sei il presidente: compri, vendi, scegli l'allenatore e investi. Formazione e tattica le decide l'allenatore. Guarda le partite (in Lega › Giornata) per notare i giovani che fanno <span class="gold">giocate di classe</span>: è così che si scoprono i talenti prima degli altri.</p></section>`:'';
  return secHTML()+intro+reqsHTML()+missionsHTML(t,false)+
    `<section class="card"><p class="eyebrow">Notizie dal club</p><p class="muted small">Solo quelle che restano in società. Le notizie di tutta la lega sono in Lega › Notizie.</p><ul class="news">${priv.map(n=>`<li class="k-${n.k}"><span class="md">${n.s>1?'S'+n.s+' ':''}G${n.md}</span>${esc(n.t)}</li>`).join('')||'<li class="muted">Ancora nessuna.</li>'}</ul></section>`;
}

/* ---------- Lega ---------- */
/* riquadro con gli ultimi aggiornamenti del gioco (da CHANGELOG in version.js): l'ultima versione aperta, le tre precedenti richiuse */
function updatesHTML(){ const [last,...prev]=CHANGELOG, li=l=>`<ul class="chg">${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  return `<section class="card upd" aria-label="Aggiornamenti del gioco"><div class="head"><p class="eyebrow">Aggiornamenti del gioco · versione ${esc(last[0])} · ${esc(last[1])}</p><p class="muted small">Le novità del gioco, non della lega.</p></div>${li(last[2])}
   ${prev.length?`<details class="upd-old"><summary>Versioni precedenti</summary>${prev.slice(0,3).map(([v,d,l])=>`<p class="eyebrow">Versione ${esc(v)} · ${esc(d)}</p>${li(l)}`).join('')}</details>`:''}</section>`; }
function vNotizie(){ const L=publicNews().slice(0,30);
  return updatesHTML()+`<section class="card"><div class="head"><p class="eyebrow">Notizie della lega</p><p class="muted">Quello che sanno tutti i club: risultati, trasferimenti, allenatori, penalizzazioni, esclusioni, presidenti e scudetto.</p></div>
   <ul class="news">${L.map(n=>`<li class="k-${n.k}"><span class="md">${n.s>1?'S'+n.s+' ':''}G${n.md}</span><span>${linkClubs(pubNewsText(n))}</span></li>`).join('')||'<li class="muted">Ancora nessuna notizia.</li>'}</ul></section>`; }
function vGiornata(){
  const v=viewer? vViewerHTML() : '', st=standings(), P=id=>st.findIndex(x=>x.id===id)+1;
  let res='';
  if(G.last) res=`<section class="card"><p class="eyebrow">Giornata ${G.md} · risultati</p><ul class="results">${G.last.map((m,i)=>`<li class="${m.h===0||m.a===0?'me':''}"><span>${clubLink(m.h)}</span><b>${m.gh} – ${m.ga}</b><span>${clubLink(m.a)}${m.ref&&G.refs&&G.refs[m.refId]?`<small class="rfx">Arbitro ${esc(G.refs[m.refId].n)} · voto ${String(m.ref.voto).replace('.',',')}</small>`:''}${(m.h===0||m.a===0)&&m.att?`<small class="rfx">Spettatori ${fmt(m.att)} · possesso ${m.poss}% – ${100-m.poss}%</small>`:''}</span>${m.forfeit?'<span class="muted">a tavolino</span>':`<button class="btn ghost small" data-act="watch" data-i="${i}">${G.wm&&G.wm[mkey(m)]!=null?'Riguarda':'Guarda'}</button>`}</li>`).join('')}</ul><p class="muted">Puoi guardare tutte le partite dell'ultima giornata: i talenti si trovano anche nelle altre squadre.</p></section>`;
  const R=publicRound();
  const next=R.length?`<section class="card"><p class="eyebrow">Prossimo turno · giornata ${G.md+1}</p><ul class="results nx">${R.map(({h,a})=>{ const me=h===0||a===0, o=G.T[h===0?a:h];
      return `<li class="${me?'me':''}"><span>${clubLink(h)} <small class="muted">${P(h)}°</small></span><b class="vs">–</b><span>${clubLink(a)} <small class="muted">${P(a)}°</small>${me?`<small class="rfx">${h===0?'In casa':'In trasferta'} · allenatore ${esc(o.coach.n)} (${o.coach.mod})</small>`:''}</span></li>`; }).join('')}</ul></section>`
    : `<section class="card"><p class="eyebrow">Stagione finita</p><p class="match">${P(0)===1?'Campioni!':'Il tuo club chiude '+P(0)+'°'}</p><p class="muted">Campione: ${clubLink(st[0].id)}. Premi, età e settore giovanile si aggiornano quando chiudi la stagione con il tasto in alto.</p></section>`;
  return v+res+next+`<p class="muted small center"><button class="link" data-act="club" data-id="0">Calendario e risultati del tuo club ›</button> · il calendario di ogni squadra è nel suo profilo.</p>`;
}
function vMarcatori(){ const L=publicScorers();
  return `<section class="card"><div class="head"><p class="eyebrow">Marcatori</p><p class="muted">I primi 15 per gol segnati${G.season>1?' dall\'inizio della partita: il conteggio dei gol non si azzera ancora a fine stagione':''}.</p></div>
   ${L.length?`<div class="tw"><table class="tab"><thead><tr><th class="num">#</th><th>R</th><th>Giocatore</th><th>Squadra</th><th class="num">Gol</th><th class="num">Pres.</th></tr></thead><tbody>${L.map((p,i)=>`<tr data-act="sheet" data-pid="${p.id}" class="${p.team===0?'me':''}"><td class="num">${i+1}</td><td>${roleTag(p.r)}</td><td class="nm">${nameBtn(p)}</td><td>${p.team==null?'<span class="muted">Svincolato</span>':clubLink(p.team)}</td><td class="num strong">${p.gl}</td><td class="num">${p.apps}</td></tr>`).join('')}</tbody></table></div>`
     :'<p class="empty">Ancora nessun gol: la classifica parte con la prima giornata.</p>'}</section>`; }

/* ---------- Mercato › Trattative in corso ---------- */
function openDeals(){ return (G.req||[]).filter(q=>q.team===0 && q.st==='open' && (q.kind==='acquisto'||q.kind==='offerta')); }
function dealState(q){ const n=q.neg; if(!n) return q.kind==='offerta'?'da valutare':'da iniziare';
  if(n.st==='stalled') return '<b class="warn-t">aspetta la tua decisione</b>';
  if(n.st==='open') return q.kind==='acquisto'? (n.ph==='club'?'accordo con il club':'contratto con il giocatore') : 'in trattativa';
  return esc(n.st); }
function vTrattative(){
  const D=openDeals(), buy=D.filter(q=>q.kind==='acquisto'), off=D.filter(q=>q.kind==='offerta').sort((a,b)=>a.due-b.due);
  const pl=q=>{ const p=G.P[q.pid]; return `${roleTag(p.r)} ${nameBtn(p)} <span class="muted">${p.age} anni</span>`; };
  const bl=buy.length?`<ul class="rql">${buy.map(q=>`<li class="rq"><div><p class="eyebrow">Acquisto · ${dealState(q)}</p><p>${pl(q)} · ${q.from!=null?clubLink(q.from):'svincolato'}</p><p class="muted">Le trattative di acquisto si chiudono con la giornata: se non trovi l'accordo prima di giocare, si ricomincia.</p></div><div class="rq-b"><button class="btn small" data-act="negres" data-id="${q.id}">Riprendi</button></div></li>`).join('')}</ul>`:'';
  const ol=off.length?`<ul class="rql">${off.map(q=>{ const b=buyerOf(q); return `<li class="rq"><div><p class="eyebrow">Offerta ricevuta · ${dealState(q)} · ${reqExpiring(q)?'<b class="warn-t">scade: rispondi prima di giocare la giornata '+(q.due+1)+'</b>':'rispondi entro la giornata '+(q.due+1)}</p><p>${pl(q)} · ${b.foreign?esc(b.n):clubLink(b.id)} offre <b>${kcr(q.amt)} cr</b></p><p class="muted">${reqHint(q)}</p></div><div class="rq-b">${reqBtns(q)}</div></li>`; }).join('')}</ul>`:'';
  return `<section class="card"><div class="head"><p class="eyebrow">Trattative in corso · ${D.length}</p></div>
   ${D.length?bl+ol:`<p class="empty">Nessuna trattativa aperta. Per comprare, apri la scheda di un giocatore in Cerca giocatori e scegli «Apri la trattativa». Per vendere, apri un tuo giocatore dalla Rosa e scegli «Cerca un acquirente». Le offerte degli altri club per i tuoi giocatori arrivano qui.</p>`}</section>`;
}

/* ---------- profilo pubblico del club ---------- */
function openClub(id){ if(id==null||!G.T[id]) return;
  if(clubView==null) clubBack={y:window.scrollY};
  if(onMatchPage()) stopViewer();
  clubView=id; sheetPid=null; negId=null; modal=null; render(); window.scrollTo(0,0); }
function closeClub(){ const b=clubBack; clubView=null; clubBack=null; render(); if(b) window.scrollTo(0,b.y); }
function vProfile(id){ const C=publicClub(id); if(!C){ clubView=null; return ''; }
  const S=publicSquad(id), F=publicFixtures(id), wins=C.hist.filter(h=>h.pos===1);
  const fx=F.map(x=>{ const me=x.h===id, o=me?x.a:x.h, r=x.r, w=r&&(me?r.gh>r.ga:r.ga>r.gh), d=r&&r.gh===r.ga;
    return `<li class="${x.md===G.md+1&&G.md<G.sched.length?'now':''}"><span class="md">G${x.md}</span><span>${me?'':'@ '}${clubLink(o)}</span><b class="${r?(w?'good':d?'':'bad'):''}">${r?r.gh+' – '+r.ga:''}</b></li>`; }).join('');
  const bud=C.bud?`<table class="bil"><tbody><tr><td>Entrate previste</td><td class="num">${kcr(C.bud.ti)}</td></tr><tr><td>Uscite previste</td><td class="num">${kcr(C.bud.te)}</td></tr><tr class="tot"><td>Saldo previsto</td><td class="num">${signK(C.bud.saldo)}</td></tr><tr><td>Budget per gli acquisti</td><td class="num">${kcr(C.bud.acq)}</td></tr><tr><td>Cessioni previste</td><td class="num">${kcr(C.bud.ces)}</td></tr><tr><td>Investimenti nelle strutture</td><td class="num">${kcr(C.bud.inv)}</td></tr><tr><td>Obiettivo in classifica</td><td class="num">${C.bud.pos}°</td></tr></tbody></table><p class="muted small">${C.bud.by==='ufficio'?'Redatto d\'ufficio':'Convalidato dal presidente'}${C.bud.rev?', aggiornato alla revisione':''}.</p>`
    : '<p class="empty">Il preventivo di questa stagione non è ancora stato presentato.</p>';
  const hist=C.hist.length?`<div class="tw"><table class="tab"><thead><tr><th>Stagione</th><th class="num">Posto</th><th class="num">Saldo previsto</th><th class="num">Saldo reale</th><th>Consuntivo</th></tr></thead><tbody>${C.hist.map(h=>`<tr class="nohov"><td>${h.s}</td><td class="num strong">${h.pos}°${h.pos===1?' 🏆':''}</td><td class="num">${signK(h.prev)}</td><td class="num">${signK(h.act)}</td><td class="${h.ok?'good':'bad'} strong">${h.ok?'in tolleranza':'fuori tolleranza'}</td></tr>`).join('')}</tbody></table></div>`
    : '<p class="empty">Nessuna stagione chiusa finora.</p>';
  return `<div class="prof-back"><button class="btn ghost small" data-act="back">‹ Indietro</button></div>
  <section class="card prof-h" style="--c:${C.c}"><div><p class="eyebrow">Profilo del club${id===0?' · così vedono il tuo club le altre società':''}</p><h2><span class="chip big" style="--c:${C.c}"></span>${esc(C.n)}</h2>
    <p class="muted">${C.excl?'<b class="bad">Escluso dal campionato</b> · ':''}${C.pos}° in classifica · ${C.pts} punti${C.pen?` <b class="bad">(−${C.pen} di penalizzazione)</b>`:''}${C.penNext?` · −${C.penNext} punti già maturati per la prossima stagione`:''} · ${C.tab.v} vinte, ${C.tab.n} pareggiate, ${C.tab.p} perse · gol ${C.tab.gf}–${C.tab.gs}</p>
    ${C.form.length?`<p>${C.form.map(f=>`<span class="fm f${f}">${f}</span>`).join('')}</p>`:''}</div>
    ${wins.length?`<p class="pal" title="Campionati vinti">🏆 ${wins.length===1?'Campione nella stagione '+wins[0].s:wins.length+' scudetti (stagioni '+wins.map(h=>h.s).join(', ')+')'}</p>`:''}</section>
  ${id===0?'<p class="muted small center">Così vedono il tuo club le altre società: niente cassa, stipendi, debiti, morale o trattative; i giocatori con le valutazioni che conoscono dall\'esterno.</p>':''}
  <section class="grid3s">
   <div class="card"><p class="eyebrow">Allenatore</p><p class="big name">${esc(C.coach.n)}</p><p class="muted">${C.coach.age} anni · modulo preferito ${C.coach.mod}</p></div>
   <div class="card"><p class="eyebrow">Strutture</p><ul class="chk">${C.fac.map(x=>`<li><span>${x.n}</span><span></span><b>liv. ${x.l}/5</b></li>`).join('')}</ul></div>
   <div class="card"><p class="eyebrow">Azionisti</p>${C.bank>0?`<p class="big">${pctTxt(C.bank)}</p><p class="muted">quote della banca${C.bank>=51?': ha la maggioranza':C.bank>=25?': ha il diritto di veto':''}</p>`:'<p class="muted">Tutta del presidente: la banca non ha quote.</p>'}</div>
  </section>
  <section class="card"><div class="head"><p class="eyebrow">Rosa · ${S.length} giocatori</p><p class="muted">Valutazione e potenziale come li vedi dall'esterno, con le relazioni del tuo osservatore. Il valore di mercato è pubblico.</p></div>
   <div class="tw"><table><thead><tr><th>R</th><th>Nome</th><th class="num">Età</th><th class="num">Val.</th><th>Potenziale</th><th class="num">Valore</th></tr></thead><tbody>${S.map(p=>`<tr data-act="sheet" data-pid="${p.id}"><td>${roleTag(p.r)}</td><td class="nm">${nameBtn(p)}${p.cap?' <span class="badge-s capb" title="Capitano">C</span>':p.vcap?' <span class="badge-s vcapb" title="Vicecapitano">VC</span>':''}</td><td class="num">${p.age}</td><td class="num strong">${p.ovr}</td><td>${p.stars}</td><td class="num">${kcr(p.val)}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="grid2">
   <div class="card"><p class="eyebrow">Risultati e calendario · stagione ${G.season}</p><p class="muted small">@ = in trasferta</p><ol class="cal">${fx}</ol></div>
   <div class="card"><p class="eyebrow">Preventivo della stagione ${G.season}</p>${bud}</div>
  </section>
  <section class="card"><p class="eyebrow">Palmarès e stagioni passate</p>${hist}</section>`;
}

/* ---------- finestre: menu ⋯, novità, nome della segretaria, avviso prima di giocare ---------- */
function vModal(){ const nm=secName();
  let h='';
  if(modal==='menu') h=`<div class="neg-h"><div><p class="eyebrow">Presidente · v${VERSION}</p><h2>Menu</h2></div><button class="x" data-act="mclose" aria-label="Chiudi">×</button></div>
    <div class="menu"><button class="btn ghost" data-act="novita">Novità della versione</button><button class="btn ghost" data-act="secname">Cambia nome della segretaria</button>
    ${confirmReset?`<div class="reset"><span>Ricominciare cancella questa partita.</span><button class="btn danger small" data-act="reset2">Sì, ricomincia</button><button class="btn ghost small" data-act="reset0">Annulla</button></div>`:`<button class="btn ghost danger-t" data-act="reset1">Ricomincia da capo</button>`}</div>`;
  else if(modal==='novita') h=`<div class="neg-h"><div><p class="eyebrow">Novità · ${esc(CHANGELOG[0][1])}</p><h2>Versione ${VERSION}</h2></div><button class="x" data-act="mclose" aria-label="Chiudi">×</button></div>
    ${CHANGELOG.slice(0,1).map(([v,d,l])=>`<ul class="chg">${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`).join('')}<div class="row"><button class="btn" data-act="mclose">Chiudi</button></div>`;
  else if(modal==='secname') h=`<div class="neg-h"><div><p class="eyebrow">Segreteria</p><h2>Nome della segretaria</h2></div><button class="x" data-act="mclose" aria-label="Chiudi">×</button></div>
    <form id="sec-form" class="secf"><label for="sec-new">Come si chiama?</label><input id="sec-new" maxlength="20" value="${esc(nm)}" autocomplete="off"><div class="row"><button class="btn" type="submit">Salva</button><button class="btn ghost" type="button" data-act="mclose">Annulla</button></div></form>`;
  else if(modal==='secwarn'){ const u=secItems().filter(x=>x.lv==='urg');
    h=`<div class="sec-h"><span class="sec-av" aria-hidden="true">${esc(nm.charAt(0).toUpperCase())}</span><div><p class="eyebrow">${esc(nm)} · prima di giocare</p><p class="sec-say">Presidente, ${u.length===1?'c\'è ancora una cosa urgente':'ci sono ancora '+numIt(u.length)+' cose urgenti'}:</p></div></div>
    <ul class="secw">${u.map(x=>`<li>${esc(x.short)}</li>`).join('')}</ul>
    <div class="row"><button class="btn" data-act="secplay">Giochiamo lo stesso</button><button class="btn ghost" data-act="secdesk">Andiamo alla Scrivania</button></div>`; }
  else return '';
  return `<div class="modal" id="modal-bg" role="dialog" aria-modal="true"><div class="neg-in modal-in">${h}</div></div>`;
}

/* ---------- eventi ---------- */
document.addEventListener('click', e=>{
  if(e.target.id==='modal-bg'){ modal=null; confirmReset=false; render(); return; }
  const el=e.target.closest('[data-act]'); if(!el||!G) return;
  switch(el.dataset.act){
    case 'club': openClub(+el.dataset.id); break;
    case 'back': closeClub(); break;
    case 'menu': modal='menu'; confirmReset=false; render(); break;
    case 'mclose': modal=null; confirmReset=false; render(); break;
    case 'novita': modal='novita'; render(); break;
    case 'secname': modal='secname'; render(); { const i=$('#sec-new'); if(i){ i.focus(); i.select(); } } break;
    case 'secplay': modal=null; render(); advance(true); break;
    case 'secdesk': go('scrivania'); break;
    case 'secfired': clubView=null; render(); break;
    case 'reqgo': focusReq=+el.dataset.id; go('scrivania'); break;
    case 'negres': negId=+el.dataset.id; sheetPid=null; render(); break;
  }
});
document.addEventListener('submit', e=>{ if(e.target.id!=='sec-form'||!G) return;
  const v=($('#sec-new').value||'').trim().slice(0,20); G.sec={n:v||'Giulia'}; save(); modal=null; render(); toast('D\'ora in poi la segretaria si chiama '+secName()+'.'); });

Object.assign(VIEWS,{'scrivania/home':vScrivania,'lega/notizie':vNotizie,'lega/giornata':vGiornata,'lega/marcatori':vMarcatori,'mercato/trattative':vTrattative});
