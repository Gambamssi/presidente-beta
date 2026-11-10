/* ================= INTERFACCIA: SCRIVANIA (segretaria), LEGA, TRATTATIVE, PROFILO PUBBLICO DEI CLUB, FINESTRE ================= */
/* Regola per il futuro multigiocatore: le pagine pubbliche (Lega e profilo dei club) leggono lo stato SOLO
   attraverso le funzioni pubbliche qui sotto (publicClub, publicSquad, publicFixtures, publicNews, publicScorers,
   publicRound). Niente cassa, stipendi, debiti, morale, richieste, trattative, attributi veri, taccuino. */

/* ---------- nomi dei club cliccabili ---------- */
function clubLink(id, chip){ const t=G.T[id]; if(!t) return '';
  return `<button class="link clubl" data-act="club" data-id="${id}" title="${t_("home.profilo_di",{n:esc(t.n)})}">${chip?`<span class="chip" style="--c:${t.c}"></span>`:''}${esc(t.n)}</button>`; }
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
/* dalla 0.4.1.0 il motore scrive n.pub (e n.club) in ogni notizia; le notizie dei salvataggi vecchi si classificano ancora dal testo */
function isPublicNews(n){ if(!n) return false; if(typeof n.pub==='boolean') return n.pub; if(PUB_K[n.k]) return true; if(n.k==='club'||n.k==='coach') return PUB_TXT.test(n.t||''); return false; }
const pubNewsText = n=>String(n.t||'').replace(/\s*Il tuo club chiude \d+°\.?/,'');

/* ---------- letture pubbliche ---------- */
function publicNews(){ const h=hidNow(); return G.news.filter(n=>isPublicNews(n) && !(h && n.k==='match' && n.s===G.season && n.md===G.md)); }
/* valutazione come la vedono gli altri: lo scouting di chi guarda, mai il valore vero (anche per i tuoi giocatori) */
function pubOvrTxt(p){ const n=obsN(p), [a,b]=rangeOf(ovr(p), p.s?skScarto(p,'ovr'):(p.e.pos||0), n? Math.max(0,5-2*n) : 6); return a===b? String(a) : a+'–'+b; }
function publicSquad(id){ const t=G.T[id];
  return teamPlayers(t).filter(p=>!p.retired).sort((a,b)=>'PDCA'.indexOf(a.r)-'PDCA'.indexOf(b.r) || value(b)-value(a))
    .map(p=>({id:p.id, fn:p.fn, ln:p.ln, r:p.r, age:p.age, ovr:pubOvrTxt(p), stars:starsHTML(p), val:value(p), cap:t.cap===p.id, vcap:t.vcap===p.id})); }
function publicFixtures(id){ return G.sched.map((fx,i)=>{ const f=fx.find(x=>x.includes(id)); const r=G.res[i]&&!(hidNow()&&i===G.md-1)&&G.res[i].find(x=>x.h===id||x.a===id); return {md:i+1, h:f[0], a:f[1], r:r?{gh:r.gh,ga:r.ga}:null}; }); }
function publicClub(id){ const t=G.T[id]; if(!t) return null; const st=standings(), f=t.fin||{}, b=f.bud&&f.bud.s===G.season?f.bud:null;
  return { id, n:t.n, c:t.c, pos:st.indexOf(t)+1, pts:teamPts(t), pen:f.pen||0, penNext:f.penNext||0, excl:!!f.excluded, tab:t.tab, form:t.form||[],
    coach:{n:t.coach.n, age:t.coach.age, mod:t.coach.mod},
    fac:Object.keys(FACS).map(k=>({k, n:FACS[k].n, l:facLevel(t,k)})),
    bank:(t.own&&t.own.bank)||0,
    bud: b?{ti:b.ti, te:b.te, saldo:b.saldo, acq:b.lev.acq, ces:b.lev.ces, inv:b.lev.inv, pos:b.lev.pos, by:b.by, rev:!!b.revUsed}:null,
    hist:(f.budH||[]).map(h=>({s:h.s, pos:h.pos, objPos:h.objPos, objOk:h.objOk, prev:h.prev.saldo, act:h.act.saldo, ok:h.ok, scost:h.scost})) }; }
/* marcatori della stagione in corso (gol e presenze sono pubblici) */
function publicScorers(){ if(hidNow()) return []; return Object.values(G.P).filter(p=>p.ss&&p.ss[1]>0).map(p=>({p, g:p.ss[1], a:p.ss[0]})).sort((x,y)=>y.g-x.g || x.a-y.a || x.p.id-y.p.id).slice(0,15); }
/* albo d'oro (pubblico): righe dalla più recente; i nomi dei giocatori sono nella riga, così l'albo può vivere separato dallo stato */
function publicAlbo(){ return (G.albo||[]).slice().reverse(); }
/* presidente umano di un club e la sua carriera pubblica (niente cassa, debiti, quote, trattative, reputazione) */
function publicPres(id){ const pr=(G.prs||[]).find(x=>x.u&&x.t===id); if(!pr) return null;
  return {id:pr.id, n:presName(pr), h:pr.h.map(h=>({s:h[0], c:h[1], pos:h[2], tr:h[3], ok:h[4], fired:h[5]})), cur:G.fired?null:{s:G.season, c:pr.t, pos:standings().indexOf(G.T[pr.t])+1}}; }
const presName = pr=>pr.n||t_("home.il_presidente");
function publicRound(){ return G.md<G.sched.length? G.sched[G.md].map(([h,a])=>({h,a})) : []; }

/* ---------- la segretaria ---------- */
const secName = ()=>(G&&G.sec&&G.sec.n)||t_("home.giulia");
const NUM_IT=['nessuna','una','due','tre','quattro','cinque','sei','sette','otto','nove','dieci'];
const numIt = n=>NUM_IT[n]||String(n);
/* variante della frase scelta con un hash su stagione, giornata e voce: non consuma i numeri casuali del gioco */
function pickV(key, arr){ return arr[Math.floor(hashU(key+'|'+G.season+'|'+G.md, 31)*arr.length)%arr.length]; }
const SEC_LBL={blk:t_("home.bloccante"), urg:t_("home.urgente"), todo:t_("home.da_fare")};
const goAct = (a,s)=>`data-act="go" data-a="${a}"${s?` data-s="${s}"`:''}`;
function reqLabel(q){ const p=q.pid!=null?G.P[q.pid]:null; return REQ_KIND[q.kind].toLowerCase()+(p?` ${t_("home.di",{fn:p.fn,ln:p.ln})}`:q.kind==='rinforzo'?' dell\'allenatore':q.kind==='premio'||q.kind==='obiettivo'?t_("home.della_squadra"):''); }
/* voci della segretaria, in ordine di priorità: bloccanti, urgenti, da fare */
function secItems(){
  const t=G.T[0], f=finInit(t), it=[], end=G.md>=G.sched.length;
  const add=(lv,key,txt,short,btn,act)=>it.push({lv,key,txt,short,btn,act});
  // BLOCCANTI
  if(G.fired) add('blk','fired', pickV('fired',[t_("home.presidente_la_banca_l",{offers:G.fired.offers.length}),t_("home.presidente_ci_sono_offerte",{offers:G.fired.offers.length})]),
    t_("home.scegliere_la_nuova_societa"), t_("home.vedi_le_offerte"), 'data-act="secfired"');
  if(G.md===0 && needBudget(t)) add('blk','bud', pickV('bud',[t_("home.il_preventivo_della_stagione",{season:G.season}),t_("home.prima_della_giornata_1")]),
    t_("home.convalidare_il_preventivo"), t_("home.apri_il_bilancio"), goAct('societa','bilancio'));
  // URGENTI
  if(t.ult && t.ult.st==='on'){ const c=ultConds(t), ko=c.filter(x=>!x.ok);
    add('urg','ult', t_("home.la_banca_ha_dato",{ultWhen:ultWhen(t.ult),v:ko.length?t_("home.oggi_non_sono_rispettate",{join:esc(ko.map(x=>x.t).join('; '))}):t_("home.per_ora_le_condizioni",{join:esc(c.map(x=>x.t).join('; '))})}),
      t_("home.ultimatum_della_banca_verifica",{ultWhen:ultWhen(t.ult)}), t_("home.vai_alla_banca"), goAct('societa','banca')); }
  activeMissions(t).filter(m=>m.kind==='rinforzo' && m.due-G.md<=1).forEach(m=>
    add('urg','miss'+m.due, pickV('miss',[t_("home.ha_promesso_a_un",{n:esc(t.coach.n),roleN:m.roleN,fDec:fDec(m.thr),due:m.due}),t_("home.ultima_occasione_per_il",{roleN:m.roleN,n:esc(t.coach.n),fDec:fDec(m.thr),due:m.due})]),
      t_("home.rinforzo_promesso_all_allenatore",{roleN:m.roleN,due:m.due}), t_("home.cerca_sul_mercato"), `data-act="missmkt" data-r="${m.role}"`));
  const open=(G.req||[]).filter(q=>q.team===0 && q.st==='open' && q.kind!=='acquisto' && q.kind!=='offerta').sort((a,b)=>a.due-b.due);
  open.filter(reqExpiring).forEach(q=>
    add('urg','req'+q.id, pickV('req'+q.kind,[t_("home.c_e_una_richiesta",{reqLabel:esc(reqLabel(q))}),t_("home.la_richiesta_aspetta_una",{reqLabel:esc(reqLabel(q))})]),
      t_("home.risposta_a",{reqLabel:reqLabel(q)}), t_("home.apri_la_richiesta"), `data-act="reqgo" data-id="${q.id}"`));
  const arr=arrears(t);
  if(arr>0){ const nx=CHECKS.find(c=>c>G.md);
    add('urg','arr', t_("home.ci_sono_cr_di",{arr:kcr(arr),v:nx?t_("home.il_prossimo_controllo_e",{nx:nx}):t_("home.vanno_pagati_prima_del")}),
      t_("home.stipendi_arretrati_cr",{arr:kcr(arr)}), t_("home.apri_i_conti"), goAct('societa','conti')); }
  if(f.ins>0) add('urg','ins', t_("home.la_rata_della_banca",{ins:kcr(f.ins),insN:f.insN,v:f.insN===1?'giornata':'giornate'}),
      t_("home.rata_della_banca_non",{ins:kcr(f.ins)}), t_("home.vai_alla_banca"), goAct('societa','banca'));
  { const b=f.bud; if(canRevise(t) && b.rev && !b.rev.ok) add('urg','rev', t_("home.la_revisione_dopo_la",{md:b.rev.md,scost:Math.round(b.rev.scost*100)}),
      t_("home.preventivo_fuori_tolleranza_da"), t_("home.apri_il_bilancio"), goAct('societa','bilancio')); }
  // DA FARE
  const rest=open.filter(q=>!reqExpiring(q));
  if(rest.length) add('todo','reqs', t_("home.in_attesa",{v:rest.length===1?t_("home.c_e_una_richiesta_2"):t_("home.ci_sono_richieste",{numIt:numIt(rest.length)}),join:esc(rest.map(reqLabel).join(', '))}),
      t_("home.richieste_in_attesa"), rest.length===1?t_("home.apri_la_richiesta"):t_("home.vedi_le_richieste"), `data-act="reqgo" data-id="${rest[0].id}"`);
  const offs=(G.req||[]).filter(q=>q.team===0 && q.st==='open' && q.kind==='offerta');
  if(offs.length) add('todo','offs', t_("home.per_i_suoi_giocatori",{v:offs.length===1?t_("home.e_arrivata_un_offerta"):t_("home.sono_arrivate_offerte",{numIt:numIt(offs.length)}),join:esc(offs.map(q=>G.P[q.pid].ln+' ('+buyerOf(q).n+', '+kcr(q.amt)+' cr)').join(', '))}),
      t_("home.offerte_per_i_tuoi"), t_("home.vai_alle_trattative"), goAct('mercato','trattative'));
  if(G.md>=10){ const exp=teamPlayers(t).filter(p=>!p.retired && p.ct<=1);
    if(exp.length) add('todo','ct', t_("home.contratti_in_scadenza_a",{join:esc(exp.map(p=>p.fn+' '+p.ln).join(', '))}),
      t_("home.contratti_in_scadenza"), t_("home.apri_la_rosa"), goAct('squadra','rosa')); }
  { const c2=2*(wageBill(t)+staffCost(t)); if(t.cash<c2) add('todo','cash', t_("home.in_cassa_ci_sono",{cash:kcr(t.cash),c2:kcr(c2)}),
      t_("home.cassa_bassa"), t_("home.apri_i_conti"), goAct('societa','conti')); }
  if(!end && G.scoutLeft>0) add('todo','obs', pickV('obs',[t_("home.l_osservatore_ha_ancora",{v:G.scoutLeft===1?t_("home.una_relazione"):numIt(G.scoutLeft)+' relazioni'}),t_("home.se_vuole_far_valutare",{v:G.scoutLeft===1?t_("home.resta_una_relazione"):t_("home.restano_relazioni",{numIt:numIt(G.scoutLeft)})})]),
      t_("home.relazioni_dell_osservatore"), t_("home.cerca_giocatori"), goAct('mercato','cerca'));
  G.news.filter(n=>n.s===G.season && n.md===G.md-1 && /è salito al livello/.test(n.t||'')).forEach((n,i)=>
    add('todo','fac'+i, t_("home.lavori_finiti",{tt:esc(n.t)}), t_("home.lavori_conclusi"), t_("home.vedi_le_strutture"), goAct('societa','strutture')));
  return it;
}
function secBadge(){ return G? secItems().filter(x=>x.lv!=='todo').length : 0; }
function secGreet(it){
  const nb=it.filter(x=>x.lv==='blk').length, nu=it.filter(x=>x.lv==='urg').length, n=nb+nu, nt=it.length-n;
  const when=G.md>=G.sched.length?t_("home.prima_di_chiudere_la"):t_("home.prima_della_giornata",{md:G.md+1});
  if(!n){ const ok=t_("home.tutto_in_ordine_presidente"); return nt? ok+' '+(nt===1?t_("home.c_e_solo_una"):t_("home.se_ha_un_momento",{numIt:numIt(nt)})) : ok; }
  const hi=pickV('hi',[t_("home.buongiorno_presidente"),t_("home.bentornato_presidente"),t_("home.ben_arrivato_presidente")]);
  return `${hi}, ${when} ${n===1?t_("home.c_e_una_cosa"):t_("home.ci_sono_cose_urgenti",{numIt:numIt(n)})}.${nb?(nb===n?` ${t_("home.finche_non_non_si",{v:n===1?t_("home.e_sistemata"):t_("home.sono_sistemate")})}`:t_("home.la_prima_non_ci")):''}`;
}
function secHTML(){ const it=secItems(), nm=secName();
  return `<section class="card sec" aria-label="${t_("home.la_segretaria")}"><div class="sec-h"><span class="sec-av" aria-hidden="true">${esc(nm.charAt(0).toUpperCase())}</span><div><p class="eyebrow">${t_("home.segreteria_del_presidente",{nm:esc(nm)})}</p><p class="sec-say">${secGreet(it)}</p></div></div>
   ${it.length?`<ul class="secl">${it.map(x=>`<li class="si ${x.lv}"><span class="si-tag">${SEC_LBL[x.lv]}</span><p>${x.txt}</p><button class="btn small ${x.lv==='todo'?'ghost':''}" ${x.act}>${x.btn}</button></li>`).join('')}</ul>`:''}</section>`; }

/* ---------- Scrivania ---------- */
/* riquadro «Premi della stagione»: dopo la fine stagione, finché non si gioca la prima giornata della nuova */
function prizesHTML(){ const r=(G.albo||[])[G.albo?G.albo.length-1:0]; if(!r||r.s!==G.season-1||G.md>0) return '';
  const lab={1:t_("home.campione"),2:t_("home.seconda"),3:t_("home.terza"),0:t_("home.club_del_capocannoniere")};
  const li=(r.pr||[]).map(([id,pop,sp,k])=>`<li class="${id===0?'me':''}"><span>${lab[k]}</span><span>${clubLink(id,true)}</span>${t_("home.popolarita",{pop:pop,v:sp?` ${t_("home.sponsor_nella_stagione",{sp:Math.round(sp*100),s:r.s+1})}`:''})}</li>`).join('');
  const mine=(r.pr||[]).filter(x=>x[0]===0);
  return `<section class="card prz"><p class="eyebrow">${t_("home.premi_della_stagione",{s:r.s})}</p><ul class="przl">${li}</ul>
   <p class="muted small">${t_("home.tutto_l_albo_e",{v:r.cc?`${t_("home.capocannoniere_con_gol",{v:esc(r.cc[1]),v2:r.cc[3]})} `:'',v2:r.mg?`${t_("home.miglior_giovane_media",{v:esc(r.mg[1]),fDec:fDec(r.mg[3]/10)})} `:'',v3:mine.length?t_("home.il_tuo_club_ha"):t_("home.gli_aumenti_degli_sponsor")})} <button class="link" ${goAct('lega','albo')}>${t_("home.lega_albo_d_oro")}</button>.</p></section>`; }
/* Scrivania (0.4.2.4, G1a): impaginazione della 013 di Evivora-scambio (fascia verde con la segretaria, sei riquadri), solo con dati
   che il gioco ha già: niente «In arrivo» e niente numeri inventati. Sotto restano «Come si gioca», premi, richieste e impegni. */
const SEC_ICO={blk:'clipboard', urg:'clock', todo:'check'};
function secSeed(){ return 1+Math.floor(hashU('segretaria|'+secName(),7)*1e6); }
function deskRow(ic, lbl, val, cls){ return `<div class="ev-row"><span class="ev-label">${ico(ic,'ev-cico')}<span>${lbl}</span></span><strong class="ev-value${cls?' '+cls:''}">${val}</strong></div>`; }
function deskTop3(t){ const pl=teamPlayers(t).filter(p=>!p.retired);
  const st=p=>p.ss&&p.ss[4]===t.id?p.ss:[0,0,0,0], avg=p=>{ const s=st(p); return s[3]?s[2]/s[3]:null; };
  const played=pl.some(p=>st(p)[0]>0);
  const L=played? pl.slice().sort((x,y)=>st(y)[1]-st(x)[1] || (avg(y)||0)-(avg(x)||0) || x.id-y.id).slice(0,3)
                : pl.slice().sort((x,y)=>ovr(y)-ovr(x) || x.id-y.id).slice(0,3);
  const art=clubArt(t.id);
  return {played, html:L.map((p,i)=>{ const s=st(p);
    return `<li class="ev-topitem"><span class="ev-rank">${i+1}</span><span class="ev-face-small" aria-hidden="true">${faceHTML(p.id*7919+13,{eta:p.age,ruolo:'giocatore',colori:{primario:art.primario,secondario:art.secondario}})}</span>
      <div>${t_("home.anni_valore",{nameBtn:nameBtn(p),roleTag:roleTag(p.r),age:p.age,ovrTxt:ovrTxt(p),v:played?t_("home.gol_media_voto",{v:s[0],v2:s[0]===1?'presenza':'presenze',v3:s[1],v10:v10(avg(p))}):t_("home.ancora_nessuna_partita_in")})}</div></li>`; }).join('')}; }
function vScrivania(){
  const t=G.T[0], priv=G.news.filter(n=>!isPublicNews(n)).slice(0,14), it=secItems(), nm=secName(), art=clubArt(0);
  const st=standings(), pos=st.indexOf(t)+1, end=G.md>=G.sched.length, nb=it.filter(x=>x.lv!=='todo').length;
  const intro=G.season===1&&G.md===0?`<section class="card"><p class="eyebrow">${t_("home.come_si_gioca")}</p><p>${t_("home.sei_il_presidente_compri")} <span class="gold">${t_("home.giocate_di_classe")}</span>${t_("home.e_cosi_che_si")}</p></section>`:'';
  const face=faceHTML(secSeed(),{eta:34,ruolo:'segretaria',genere:'donna',espressione:'sorriso',colori:{primario:art.primario,secondario:art.secondario}})
    .replace(/<rect width="180" height="206" rx="11"[^>]+\/>/,'').replace(/<circle cx="91" cy="96"[^>]+\/>/,'');
  const hero=`<section class="ev-hero" aria-label="${t_("home.la_segretaria")}"><svg class="ev-hero-grid" viewBox="0 0 1440 220" preserveAspectRatio="none" aria-hidden="true"><path d="M0 110H1440M590 0L740 220M1010 0L830 220M710 0V220"/><circle cx="710" cy="110" r="65"/><path d="M0 30H190V190H0M1250 30H1440V190H1250"/></svg>
    <div class="ev-hero-inner"><div class="ev-hero-person" aria-hidden="true">${face}</div>
     <div class="ev-hero-text"><p class="ev-overline">${t_("home.segreteria_del_presidente",{nm:esc(nm)})}</p><h1>${t_("home.bentornato_presidente")}</h1><p class="sec-say">${secGreet(it)}</p></div>
     <button class="ev-hero-club link" data-act="club" data-id="0" title="${t_("home.il_profilo_pubblico_del")}"><span class="crest" aria-hidden="true">${crestHTML(0)}</span><span>${t_("home.stagione_posto",{n:esc(t.n),season:G.season,pos:pos})}</span></button></div></section>`;
  const todo=`<section class="ev-box ev-todo sec" aria-label="${t_("home.cose_da_fare")}"><h2 class="ev-box-title">${ico('clipboard')} ${t_("home.cose_da_fare_2",{v:nb?` <span class="ev-counter" title="${t_("home.cose_bloccanti_o_urgenti")}">${nb}</span>`:''})}</h2>
    ${it.length?`<ul class="secl">${it.map(x=>`<li class="si ${x.lv}">${ico(SEC_ICO[x.lv],'ev-tico')}<div class="ev-text"><span class="si-tag">${SEC_LBL[x.lv]}</span><b>${esc(x.short)}</b><p>${x.txt}</p></div><button class="btn small ${x.lv==='todo'?'ghost':''}" ${x.act}>${x.btn}</button></li>`).join('')}</ul>`:`<p class="ev-soft">${t_("home.niente_da_fare_si")}</p>`}</section>`;
  const wb=wageBill(t)+staffCost(t), inj=teamPlayers(t).filter(p=>!p.retired&&p.inj>0).length, n=teamPlayers(t).filter(p=>!p.retired).length;
  const status=`<section class="ev-box ev-status" aria-label="${t_("home.situazione_del_club")}"><h2 class="ev-box-title">${ico('chart')} ${t_("home.situazione_club")}</h2>
    ${deskRow('coins',t_("home.cassa"),kcr(t.cash)+' cr',t.cash<0?'bad':'good')}${deskRow('wages',`${t_("home.stipendi_e_staff_a")}`,kcr(wb)+' cr')}${deskRow('squadra',t_("home.rosa"),n+' giocatori')}
    ${deskRow('aid',t_("home.infortunati"),inj?String(inj):'nessuno',inj?'bad':'')}${deskRow('mood',t_("home.clima"),morLevel(clubClimate(t)))}${deskRow('flag',t_("home.allenatore"),esc(t.coach.n))}</section>`;
  const tb=t.tab, form=(t.form||[]).slice(-5);
  const season=`<section class="ev-box ev-season" aria-label="${t_("home.andamento_della_stagione")}"><h2 class="ev-box-title">${ico('lega')} ${t_("home.andamento_stagione")}</h2>
    <div class="ev-mini-stats"><div class="ev-mini"><b>${pos}°</b><span>${t_("home.posizione")}</span></div><div class="ev-mini"><b>${tb.g}</b><span>${t_("home.giocate")}</span></div><div class="ev-mini"><b>${tb.v}</b><span>${t_("home.vittorie")}</span></div><div class="ev-mini"><b>${tb.n}</b><span>${t_("home.pareggi")}</span></div><div class="ev-mini"><b>${tb.p}</b><span>${t_("home.sconfitte")}</span></div></div>
    <div class="ev-last5"><span>${t_("home.ultime_partite")}</span><span>${form.length?form.map(f=>`<span class="fm f${f}">${f}</span>`).join(''):`<span class="ev-soft">${t_("home.ancora_nessuna")}</span>`}</span></div>
    <p class="ev-soft">${t_("home.punti_gol_fatti_subiti",{teamPts:teamPts(t),gf:tb.gf,gs:tb.gs,md:G.md})} <button class="link" ${goAct('lega','classifica')}>${t_("home.classifica")}</button></p></section>`;
  let next;
  if(!end){ const f=G.sched[G.md].find(x=>x.includes(0)), opp=f[0]===0?f[1]:f[0], home=f[0]===0;
    next=`<div class="ev-fixture-head">${t_("home.giornata_di_14",{md:G.md+1,v:home?t_("home.in_casa"):t_("home.in_trasferta")})}</div><div class="ev-match"><div class="ev-team"><span class="crest" aria-hidden="true">${crestHTML(f[0])}</span><strong>${clubLink(f[0])}</strong></div><span class="ev-match-vs">${t_("home.vs")}</span><div class="ev-team"><span class="crest" aria-hidden="true">${crestHTML(f[1])}</span><strong>${clubLink(f[1])}</strong></div></div>
      <p class="ev-soft">${t_("home.e_in_classifica_con",{n:esc(G.T[opp].n),indexOf:standings().indexOf(G.T[opp])+1,teamPts:teamPts(G.T[opp])})}</p>`; }
  else next=`<div class="ev-fixture-head">${t_("home.campionato_finito")}</div><p class="ev-soft">${t_("home.le_14_giornate_sono")}</p>`;
  const nextB=`<section class="ev-box ev-next" aria-label="${t_("home.prossimo_impegno")}"><h2 class="ev-box-title">${ico('calendar')} ${t_("home.prossimo_impegno")}</h2>${next}${playBtn('ev-full')}</section>`;
  const nw=priv.slice(0,4), rest=priv.slice(4), nIco=k=>k==='market'?'mercato':k==='player'?'squadra':k==='match'?'ball':'news';
  const nli=n=>`<li class="ev-new k-${n.k}"><span class="ev-news-art" aria-hidden="true">${ico(nIco(n.k))}</span><div><p>${esc(n.t)}</p>${t_("home.giornata_notizia_del_club",{v:n.s>1?`${t_("home.stagione",{s:n.s})} `:'',md:n.md})}</div></li>`;
  const news=`<section class="ev-box ev-news" aria-label="${t_("home.notizie_dal_club")}"><h2 class="ev-box-title">${ico('news')} ${t_("home.ultime_notizie")} <span class="ev-title-right">${t_("home.dal_club")}</span></h2>
    <p class="ev-soft">${t_("home.solo_quelle_che_restano")} <button class="link" ${goAct('lega','notizie')}>${t_("home.lega_notizie")}</button>.</p>
    <ul class="news ev-newsl">${nw.map(nli).join('')||`<li class="muted">${t_("home.ancora_nessuna_2")}</li>`}</ul>${rest.length?`<details class="ev-more"><summary>${t_("home.altre_notizie_del_club",{rest:rest.length})}</summary><ul class="news ev-newsl">${rest.map(nli).join('')}</ul></details>`:''}</section>`;
  const T3=deskTop3(t);
  const top=`<section class="ev-box ev-top" aria-label="${t_("home.i_migliori_della_squadra")}"><h2 class="ev-box-title">${ico('star')} ${t_("home.top_3_della_squadra")}</h2><p class="ev-soft">${T3.played?t_("home.per_gol_segnati_in"):t_("home.per_valore_finche_non")}</p><ul class="ev-top3">${T3.html}</ul></section>`;
  return `<div class="ev-desk">${hero}<div class="ev-dash">${status}${todo}${season}${nextB}${news}${top}</div></div>`+intro+prizesHTML()+reqsHTML()+missionsHTML(t,false);
}

/* ---------- Lega ---------- */
/* riquadro con gli ultimi aggiornamenti del gioco (da CHANGELOG in version.js): l'ultima versione aperta, le tre precedenti richiuse */
function updatesHTML(){ const [last,...prev]=CHANGELOG, li=l=>`<ul class="chg">${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  return `<section class="card ev-panel upd" aria-label="${t_("home.aggiornamenti_del_gioco")}"><div class="head"><p class="eyebrow">${t_("home.aggiornamenti_del_gioco_versione",{v:esc(last[0]),v2:esc(last[1])})}</p><p class="muted small">${t_("home.le_novita_del_gioco")}</p></div>${li(last[2])}
   ${prev.length?`<details class="upd-old"><summary>${t_("home.versioni_precedenti")}</summary>${prev.slice(0,3).map(([v,d,l])=>`<p class="eyebrow">${t_("home.versione",{v:esc(v),d:esc(d)})}</p>${li(l)}`).join('')}</details>`:''}</section>`; }
function vNotizie(){ const L=publicNews().slice(0,30);
  return pageHead(t_("home.lega_redazione"),t_("home.notizie_e_aggiornamenti"),t_("home.le_novita_del_gioco_2"))+`<div class="ev-grid2 ev-news2">${updatesHTML()}<section class="card ev-panel"><div class="head"><p class="eyebrow">${t_("home.notizie_della_lega")}</p><p class="muted">${t_("home.quello_che_sanno_tutti")}</p></div>
   <ul class="news">${L.map(n=>`<li class="k-${n.k}"><span class="md">${t_("home.g",{v:n.s>1?'S'+n.s+' ':'',md:n.md})}</span><span>${linkClubs(pubNewsText(n))}</span></li>`).join('')||`<li class="muted">${t_("home.ancora_nessuna_notizia")}</li>`}</ul></section></div>`; }
function vGiornata(){
  const v=viewer? vViewerHTML() : '', st=standings(), P=id=>st.findIndex(x=>x.id===id)+1;
  let res='', mine=G.last&&G.last.find(m=>m.h===0||m.a===0); const hid=hidNow();
  const head=mine?`<section class="ev-titleband ev-score"><div class="ev-sc-top"><p class="ev-eyebrow">${hid?t_("home.lega_giornata_n",{md:G.md}):t_("home.lega_giornata_risultato_finale",{md:G.md})}</p><span>${t_("home.stagione_2",{season:G.season})}</span></div>
     <div class="ev-sc-mid"><div class="ev-sc-t"><span class="ev-sc-crest" aria-hidden="true">${crestHTML(mine.h)}</span><b>${clubLink(mine.h)}</b></div><div class="ev-sc-res"><b>${hid?`–<i>:</i>–`:`${mine.gh}<i>:</i>${mine.ga}`}</b><small>${hid?t_("home.risultato_dopo_la_visione"):mine.forfeit?t_("home.a_tavolino"):t_("home.fine_partita")}</small></div><div class="ev-sc-t"><span class="ev-sc-crest" aria-hidden="true">${crestHTML(mine.a)}</span><b>${clubLink(mine.a)}</b></div></div>
     <div class="ev-sc-top"><span>${t_("home.classifica_posto",{P:P(0)})}</span><span>${t_("home.giornata_di_14_2",{md:G.md})}</span></div></section>`
    : pageHead(t_("home.lega_partita"),t_("home.giornata",{md:G.md}),G.md===0?t_("home.la_stagione_comincia_con"):t_("home.risultati_replay_prossimo_turno"));
  if(G.last) res=`<section class="card ev-panel"><h2 class="ev-ptitle">${t_("home.giornata_risultati",{md:G.md})}</h2><ul class="results">${G.last.map((m,i)=>`<li class="${m.h===0||m.a===0?'me':''}"><span>${clubLink(m.h)}</span><b>${hid?"– : –":`${m.gh} – ${m.ga}`}</b><span>${clubLink(m.a)}${!hid&&m.ref&&G.refs&&G.refs[m.refId]?`${t_("home.arbitro_voto",{n:esc(G.refs[m.refId].n),fDec:fDec(m.ref.voto)})}`:''}${!hid&&(m.h===0||m.a===0)&&m.att?`${t_("home.spettatori_possesso",{att:fmt(m.att),poss:m.poss,v:100-m.poss})}`:''}</span>${hid&&!(m.h===0||m.a===0)?'':m.forfeit?`<span class="muted">${t_("home.a_tavolino")}</span>`:hid?(viewer?'':`<button class="btn ghost small" data-act="watch" data-i="${i}">${t_("home.guarda_la_partita")}</button>`):`<button class="btn ghost small" data-act="watch" data-i="${i}">${G.wm&&G.wm[mkey(m)]!=null?t_("home.riguarda"):t_("home.guarda")}</button>`}</li>`).join('')}</ul><p class="muted">${t_(hid?"home.punteggi_dopo_la_visione":"home.puoi_guardare_tutte_le")}</p></section>`;
  const R=publicRound();
  const next=R.length?`<section class="card ev-panel"><h2 class="ev-ptitle">${t_("home.prossimo_turno_giornata",{md:G.md+1})}</h2><ul class="results nx">${R.map(({h,a})=>{ const me=h===0||a===0, o=G.T[h===0?a:h];
      return `<li class="${me?'me':''}"><span>${clubLink(h)} <small class="muted">${P(h)}°</small></span><b class="vs">–</b><span>${clubLink(a)} <small class="muted">${P(a)}°</small>${me?`${t_("home.allenatore_2",{v:h===0?t_("home.in_casa_2"):t_("home.in_trasferta_2"),n:esc(o.coach.n),mod:o.coach.mod})}`:''}</span></li>`; }).join('')}</ul></section>`
    : `<section class="card ev-panel"><p class="eyebrow">${t_("home.stagione_finita")}</p><p class="match">${P(0)===1?t_("home.campioni"):t_("home.il_tuo_club_chiude",{P:P(0)})}</p><p class="muted">${t_("home.campione_premi_eta_e",{clubLink:clubLink(st[0].id)})}</p></section>`;
  return v+head+`<div class="ev-day">${res}${next}</div><p class="muted small center"><button class="link" data-act="club" data-id="0">${t_("home.calendario_e_risultati_del")}</button> ${t_("home.il_calendario_di_ogni")}</p>`;
}
function vMarcatori(){ const L=publicScorers();
  return pageHead(t_("home.lega_gol"),t_("home.classifica_marcatori"),t_("home.gol_e_presenze_stagione",{season:G.season,md:G.md}))+`<section class="card ev-panel"><div class="head"><p class="eyebrow">${t_("home.marcatori_stagione",{season:G.season})}</p><p class="muted">${t_("home.i_primi_15_per")}</p></div>
   ${L.length?`<div class="tw"><table class="tab ev-ptab ev-scorers"><thead><tr><th class="num">#</th><th>${t_("home.r")}</th><th>${t_("home.giocatore")}</th><th>${t_("home.squadra")}</th><th class="num">${t_("home.gol")}</th><th class="num">${t_("home.pres")}</th></tr></thead><tbody>${L.map(({p,g,a},i)=>`<tr data-act="sheet" data-pid="${p.id}" class="${p.team===0?'me':''}"><td class="num rk">${i+1}</td><td class="mh">${roleTag(p.r)}</td><td class="nm pc">${plCell(p)}</td><td class="tm">${p.team==null?`<span class="muted">${t_("home.svincolato")}</span>`:clubCell(p.team)}</td><td class="num strong mv" data-l="${t_("home.gol")}">${g}</td><td class="num" data-l="${t_("home.presenze")}">${a}</td></tr>`).join('')}</tbody></table></div>`
     :`<p class="empty">${t_(hidNow()?"home.marcatori_dopo_la_visione":"home.ancora_nessun_gol_la")}</p>`}</section>`; }

/* Lega › Albo d'oro: una riga per stagione chiusa */
function alboPl(x,txt){ const p=x&&G.P[x[0]]; if(!x) return '<span class="muted">—</span>';
  return `${p?`<button class="link" data-act="sheet" data-pid="${p.id}">${esc(x[1])}</button>`:esc(x[1])}${G.T[x[2]]?` <span class="muted small">${clubLink(x[2])}</span>`:''}<div class="muted small">${txt}</div>`; }
function vAlbo(){ const A=publicAlbo();
  const rows=A.map(r=>{ const ex=[...(r.rt||[]).map(id=>clubLink(id)+` <span class="muted small">${t_("home.retrocessa")}</span>`),...(r.es||[]).map(id=>clubLink(id)+` <span class="muted small">${t_("home.esclusa")}</span>`)];
    return `<tr class="nohov"><td class="num strong">${r.s}</td><td class="strong">🏆 ${clubLink(r.r[0],true)}</td><td>${r.r[1]!=null?clubLink(r.r[1],true):'—'}</td><td>${r.r[2]!=null?clubLink(r.r[2],true):'—'}</td>
      <td>${alboPl(r.cc, r.cc?r.cc[3]+' gol':'')}</td><td>${alboPl(r.mg, r.mg?t_("home.media_in_partite",{fDec:fDec(r.mg[3]/10),v:r.mg[4]}):'')}</td><td>${ex.length?ex.join('<br>'):'<span class="muted">—</span>'}</td></tr>`; }).join('');
  return pageHead(t_("home.lega_storia"),t_("home.albo_d_oro"),A.length?`${A.length} ${A.length===1?t_("home.stagione_chiusa"):t_("home.stagioni_chiuse")}`:t_("home.la_prima_riga_arriva"))+`<section class="card ev-panel"><div class="head"><p class="eyebrow">${t_("home.albo_d_oro")}</p><p class="muted">${t_("home.campione_seconda_e_terza")}</p></div>
   ${A.length?`<div class="tw"><table class="tab albo"><thead><tr><th class="num">${t_("home.stagione_3")}</th><th>${t_("home.campione")}</th><th>${t_("home.seconda")}</th><th>${t_("home.terza")}</th><th>${t_("home.capocannoniere")}</th><th>${t_("home.miglior_giovane")}</th><th>${t_("home.retrocesse_ed_escluse")}</th></tr></thead><tbody>${rows}</tbody></table></div>${A.some(r=>r.rc)?`<p class="muted small">${t_("home.le_stagioni_giocate_prima")}</p>`:''}`
     :`<p class="empty">${t_("home.nessuna_stagione_chiusa_finora",{season:G.season})}</p>`}</section>`; }

/* ---------- Mercato › Trattative in corso ---------- */
function openDeals(){ return (G.req||[]).filter(q=>q.team===0 && q.st==='open' && (q.kind==='acquisto'||q.kind==='offerta')); }
function dealState(q){ const n=q.neg; if(!n) return q.kind==='offerta'?t_("home.da_valutare"):t_("home.da_iniziare");
  if(n.st==='stalled') return `${t_("home.aspetta_la_tua_decisione")}`;
  if(n.st==='open') return q.kind==='acquisto'? (n.ph==='club'?t_("home.accordo_con_il_club"):t_("home.contratto_con_il_giocatore")) : t_("home.in_trattativa");
  return esc(n.st); }
function vTrattative(){
  const D=openDeals(), buy=D.filter(q=>q.kind==='acquisto'), off=D.filter(q=>q.kind==='offerta').sort((a,b)=>a.due-b.due);
  const pl=(q,sub)=>plCell(G.P[q.pid], nameBtn(G.P[q.pid]), sub);
  const bl=buy.length?`<section class="card ev-panel"><h2 class="ev-ptitle">${t_("home.acquisti",{buy:buy.length})}</h2><ul class="rql ev-deals">${buy.map(q=>{ const p=G.P[q.pid]; return `<li class="rq"><div>${pl(q,`${ROLE_NAME[p.r]} · ${p.age} anni · ${q.from!=null?esc(G.T[q.from].n):'svincolato'}`)}<p class="eyebrow">${t_("home.acquisto",{dealState:dealState(q),v:q.from!=null?' · '+clubLink(q.from):''})}</p><p class="muted">${t_("home.le_trattative_di_acquisto")}</p></div><div class="rq-b"><button class="btn small" data-act="negres" data-id="${q.id}">${t_("home.riprendi")}</button></div></li>`; }).join('')}</ul></section>`:'';
  const ol=off.length?`<section class="card ev-panel"><h2 class="ev-ptitle">${t_("home.offerte_ricevute",{off:off.length})}</h2><ul class="rql ev-deals">${off.map(q=>{ const b=buyerOf(q), p=G.P[q.pid]; return `<li class="rq"><div>${pl(q,t_("home.anni_offerta_di_cr",{v:ROLE_NAME[p.r],age:p.age,amt:kcr(q.amt)}))}<p class="eyebrow">${t_("home.offerta_ricevuta",{dealState:dealState(q),v:reqExpiring(q)?`${t_("home.scade_rispondi_prima_di",{due:q.due+1})}`:t_("home.rispondi_entro_la_giornata",{due:q.due+1})})}</p><p>${t_("home.offre_cr",{v:b.foreign?esc(b.n):clubLink(b.id),amt:kcr(q.amt)})}</p><p class="muted">${reqHint(q)}</p></div><div class="rq-b">${reqBtns(q)}</div></li>`; }).join('')}</ul></section>`:'';
  return pageHead(t_("home.mercato_negoziazione"),t_("home.trattative_in_corso"),D.length?`${D.length} ${D.length===1?t_("home.trattativa_aperta"):t_("home.trattative_aperte")} · giornata ${G.md}/14`:t_("home.nessuna_trattativa_aperta"))
   +kpiHTML([[t_("home.aperte"),D.length],[t_("home.acquisti_2"),buy.length,t_("home.chiudono_con_la_giornata")],[t_("home.offerte_ricevute_2"),off.length,off.some(reqExpiring)?t_("home.una_scade_ora"):'',off.some(reqExpiring)?'bad':''],[t_("home.cassa"),kcr(G.T[0].cash)+' cr']])
   +(D.length?bl+ol:`<section class="card ev-panel"><h2 class="ev-ptitle">${t_("home.nessuna_trattativa")}</h2><p class="empty">${t_("home.nessuna_trattativa_aperta_per")}</p></section>`);
}

/* ---------- profilo pubblico del club ---------- */
function openClub(id){ if(id==null||!G.T[id]) return;
  if(clubView==null) clubBack={y:window.scrollY};
  if(onMatchPage()) stopViewer();
  clubView=id; sheetPid=null; negId=null; modal=null; render(); window.scrollTo(0,0); }
function closeClub(){ const b=clubBack; clubView=null; clubBack=null; render(); if(b) window.scrollTo(0,b.y); }
function vProfile(id){ const C=publicClub(id); if(!C){ clubView=null; return ''; }
  const S=publicSquad(id), F=publicFixtures(id), A=publicAlbo(), PR=publicPres(id);
  /* palmarès e piazzamenti dall'albo d'oro; i consuntivi (pubblici) da f.budH, quando ci sono per quella stagione */
  const places=A.map(r=>({s:r.s, pos:r.r.indexOf(id)+1, ex:(r.es||[]).includes(id), cc:r.cc&&r.cc[2]===id?r.cc:null})).filter(x=>x.pos>0);
  C.hist.forEach(h=>{ if(!places.some(x=>x.s===h.s)) places.push({s:h.s, pos:h.pos, ex:false, cc:null}); }); places.sort((a,b)=>b.s-a.s);
  const wins=places.filter(h=>h.pos===1&&!h.ex), podi=places.filter(h=>h.pos>1&&h.pos<=3&&!h.ex).length;
  const fx=F.map(x=>{ const me=x.h===id, o=me?x.a:x.h, r=x.r, w=r&&(me?r.gh>r.ga:r.ga>r.gh), d=r&&r.gh===r.ga;
    return `<li class="${x.md===G.md+1&&G.md<G.sched.length?'now':''}"><span class="md">${t_("home.g_2",{md:x.md})}</span><span>${me?'':'@ '}${clubLink(o)}</span><b class="${r?(w?'good':d?'':'bad'):''}">${r?r.gh+' – '+r.ga:''}</b></li>`; }).join('');
  const bud=C.bud?`<table class="bil"><tbody><tr><td>${t_("home.entrate_previste")}</td><td class="num">${kcr(C.bud.ti)}</td></tr><tr><td>${t_("home.uscite_previste")}</td><td class="num">${kcr(C.bud.te)}</td></tr><tr class="tot"><td>${t_("home.saldo_previsto")}</td><td class="num">${signK(C.bud.saldo)}</td></tr><tr><td>${t_("home.budget_per_gli_acquisti")}</td><td class="num">${kcr(C.bud.acq)}</td></tr><tr><td>${t_("home.cessioni_previste")}</td><td class="num">${kcr(C.bud.ces)}</td></tr><tr><td>${t_("home.investimenti_nelle_strutture")}</td><td class="num">${kcr(C.bud.inv)}</td></tr><tr><td>${t_("home.obiettivo_in_classifica")}</td><td class="num">${C.bud.pos}°</td></tr></tbody></table><p class="muted small">${C.bud.by==='ufficio'?t_("home.redatto_d_ufficio"):t_("home.convalidato_dal_presidente")}${C.bud.rev?t_("home.aggiornato_alla_revisione"):''}.</p>`
    : `<p class="empty">${t_("home.il_preventivo_di_questa")}</p>`;
  const cons=s=>C.hist.find(h=>h.s===s);
  const hist=places.length?`<div class="tw"><table class="tab"><thead><tr><th>${t_("home.stagione_3")}</th><th class="num">${t_("home.posto")}</th><th class="num">${t_("home.saldo_previsto")}</th><th class="num">${t_("home.saldo_reale")}</th><th>${t_("home.consuntivo")}</th></tr></thead><tbody>${places.map(x=>{ const h=cons(x.s);
      return `<tr class="nohov"><td>${x.s}</td><td class="num strong">${x.ex?`<span class="bad">${t_("home.esclusa")}</span>`:x.pos+'°'}${x.pos===1&&!x.ex?' 🏆':''}${x.cc?` <span class="muted small" title="${t_("home.capocannoniere")}">⚽ ${esc(x.cc[1])}</span>`:''}</td>${h?`<td class="num">${signK(h.prev)}</td><td class="num">${signK(h.act)}</td><td class="${h.ok?'good':'bad'} strong">${h.ok?t_("home.in_tolleranza"):t_("home.fuori_tolleranza")}</td>`:'<td class="num muted">—</td><td class="num muted">—</td><td class="muted">—</td>'}</tr>`; }).join('')}</tbody></table></div>`
    : `<p class="empty">${t_("home.nessuna_stagione_chiusa_finora_2")}</p>`;
  const pt=C.pts===1?'1 punto':C.pts+' punti', sub=t_("home.profilo_pubblico_in_classifica",{pos:C.pos,pt:pt,n:esc(C.coach.n)});
  return `<div class="prof-back"><button class="btn ghost small" data-act="back">${t_("home.indietro")}</button></div>
  ${pageHead(t_("home.lega_profilo_del_club"),esc(C.n),sub,{club:id,cls:'ev-clubhead'})}
  ${kpiHTML([[t_("home.posizione"),C.excl?t_("home.esclusa_2"):C.pos+'°',pt,'hi'],[t_("home.vinte"),C.tab.v],[t_("home.pareggiate"),C.tab.n],[t_("home.perse"),C.tab.p],[t_("home.gol_fatti_e_subiti"),C.tab.gf+'–'+C.tab.gs],[t_("home.giocatori"),S.length]],'ev-kpis6')}
  <section class="card ev-panel prof-h ev-pubbox" style="--c:${C.c}"><div><p class="ev-kick">${t_("home.profilo_pubblico_del_club",{v:id===0?t_("home.cosi_vedono_il_tuo"):''})}</p><h2><span class="chip big" style="--c:${C.c}"></span>${esc(C.n)}</h2>
    <p class="ev-pubtxt">${t_("home.in_classifica_punti_vinte",{v:C.excl?`${t_("home.escluso_dal_campionato")} `:'',pos:C.pos,pts:C.pts,v2:C.pen?` ${t_("home.di_penalizzazione",{pen:C.pen})}`:'',v3:C.penNext?` ${t_("home.punti_gia_maturati_per",{penNext:C.penNext})}`:'',v4:C.tab.v,n:C.tab.n,p:C.tab.p,gf:C.tab.gf,gs:C.tab.gs})}</p>
    ${C.form.length?`<p>${C.form.map(f=>`<span class="fm f${f}">${f}</span>`).join('')}</p>`:''}</div>
    ${wins.length||podi?`<p class="pal" title="${t_("home.dall_albo_d_oro")}">${wins.length?`🏆 ${wins.length===1?t_("home.campione_nella_stagione",{s:wins[0].s}):wins.length+` ${t_("home.scudetti_stagioni",{join:wins.slice().reverse().map(h=>h.s).join(', ')})}`}`:''}${podi?`${wins.length?' · ':''}${podi===1?t_("home.un_altro_podio"):podi+` ${t_("home.altri_podi")}`}`:''}</p>`:''}</section>
  ${id===0?`<p class="muted small center">${t_("home.cosi_vedono_il_tuo_2")}</p>`:''}
  <section class="card ev-panel ev-tact"><div class="ev-tact-pic">${formSVG(C.coach.mod,C.c)}</div><div><p class="ev-kick">${t_("home.identita_tattica")}</p><h2 class="ev-ptitle">${t_("home.il_di",{mod:esc(C.coach.mod),n:esc(C.coach.n)})}</h2><p class="muted">${t_("home.modulo_preferito_dall_allenatore")}</p>
   <p class="ev-tags">${C.fac.map(x=>`<span>${t_("home.liv_5",{n:x.n,l:x.l})}</span>`).join('')}</p></div></section>
  ${presHTML(id,PR)}
  <section class="grid3s">
   <div class="card ev-panel"><p class="eyebrow">${t_("home.allenatore")}</p><p class="big name">${esc(C.coach.n)}</p><p class="muted">${t_("home.anni_modulo_preferito",{age:C.coach.age,mod:C.coach.mod})}</p></div>
   <div class="card ev-panel"><p class="eyebrow">${t_("home.strutture")}</p><ul class="chk">${C.fac.map(x=>`<li><span>${x.n}</span><span></span>${t_("home.liv_5_2",{l:x.l})}</li>`).join('')}</ul></div>
   <div class="card ev-panel"><p class="eyebrow">${t_("home.azionisti")}</p>${C.bank>0?`<p class="big">${pctTxt(C.bank)}</p><p class="muted">${t_("home.quote_della_banca",{v:C.bank>=51?t_("home.ha_la_maggioranza"):C.bank>=25?t_("home.ha_il_diritto_di"):''})}</p>`:`<p class="muted">${t_("home.tutta_del_presidente_la")}</p>`}</div>
  </section>
  <section class="card ev-panel"><div class="head"><h2 class="ev-ptitle">${t_("home.rosa_giocatori",{S:S.length})}</h2><p class="muted">${t_("home.valutazione_e_potenziale_come")}</p></div>
   <div class="tw"><table class="ev-ptab"><thead><tr><th>${t_("home.r")}</th><th>${t_("home.giocatore")}</th><th class="num">${t_("home.eta")}</th><th class="num">${t_("home.val")}</th><th>${t_("home.potenziale")}</th><th class="num">${t_("home.valore")}</th></tr></thead><tbody>${S.map(p=>`<tr data-act="sheet" data-pid="${p.id}"><td class="mh">${roleTag(p.r)}</td><td class="nm pc">${plCell(G.P[p.id], nameBtn(p)+(p.cap?` <span class="badge-s capb" title="${t_("home.capitano")}">${t_("home.c")}</span>`:p.vcap?` <span class="badge-s vcapb" title="${t_("home.vicecapitano")}">${t_("home.vc")}</span>`:''), ROLE_NAME[p.r]+' · '+p.age+' anni')}</td><td class="num mh">${p.age}</td><td class="num strong mv">${p.ovr}</td><td data-l="${t_("home.potenziale")}">${p.stars}</td><td class="num" data-l="${t_("home.valore")}">${kcr(p.val)}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="ev-grid2">
   <div class="card ev-panel"><h2 class="ev-ptitle">${t_("home.risultati_e_calendario_stagione",{season:G.season})}</h2><p class="muted small">${t_("home.in_trasferta_3")}</p><ol class="cal">${fx}</ol></div>
   <div class="card ev-panel"><h2 class="ev-ptitle">${t_("home.preventivo_stagione",{season:G.season})}</h2>${bud}</div>
  </section>
  <section class="card ev-panel"><h2 class="ev-ptitle">${t_("home.palmares_e_stagioni_passate")}</h2>${hist}</section>`;
}

/* riquadro «Presidente» nel profilo: carriera pubblica del presidente umano; i club del computer non hanno un presidente con nome */
function presHTML(id,PR){
  if(!PR){ const n=(G.T[id]&&G.T[id].presN)||0; return `<section class="card ev-panel pres"><p class="eyebrow">${t_("home.presidente")}</p><p class="muted">${t_("home.club_guidato_da_un",{v:n?t_("home.la_banca_l_ha",{v:n===1?t_("home.una_volta"):n+' volte'}):''})}</p></section>`; }
  const H=PR.h.slice().reverse(), cur=PR.cur, clubs=[...new Set(PR.h.map(h=>h.c).concat(cur?[cur.c]:[]))], tr=PR.h.reduce((a,h)=>a+h.tr,0), fi=PR.h.filter(h=>h.fired).length, ns=new Set(PR.h.map(h=>h.s).concat(cur?[cur.s]:[])).size;
  const cn=c=>G.T[c]?clubLink(c):'–';
  return `<section class="card ev-panel pres"><div class="head"><p class="eyebrow">${t_("home.presidente")}</p><p class="big name">${esc(PR.n)}</p>
    <p class="muted">${ns===1?t_("home.una_stagione"):ns+' stagioni'}${cur&&!PR.h.some(h=>h.s===cur.s&&h.c===cur.c)?t_("home.compresa_quella_in_corso"):''} · ${clubs.length===1?t_("home.un_club_guidato"):t_('home.n_club_guidati',{n:clubs.length})} · ${tr?(tr===1?t_("home.uno_scudetto"):tr+' scudetti'):t_("home.nessuno_scudetto")} · ${fi?(fi===1?t_("home.licenziato_una_volta"):t_("home.licenziato_volte",{fi:fi})):t_("home.mai_licenziato")}</p></div>
    ${H.length||cur?`<div class="tw"><table class="tab"><thead><tr><th>${t_("home.stagione_3")}</th><th>${t_("home.club")}</th><th class="num">${t_("home.posto")}</th><th>${t_("home.trofei")}</th><th>${t_("home.consuntivo")}</th><th>${t_("home.come_e_finita")}</th></tr></thead><tbody>${cur?`<tr class="nohov"><td>${cur.s}</td><td>${cn(cur.c)}</td><td class="num">${cur.pos}° <span class="muted small">${t_("home.oggi")}</span></td><td>—</td><td class="muted">—</td><td class="muted">${t_("home.in_corso")}</td></tr>`:''}${H.map(h=>`<tr class="nohov"><td>${h.s}</td><td>${cn(h.c)}</td><td class="num strong">${h.pos?h.pos+'°':'—'}</td><td>${h.tr?t_("home.scudetto"):'—'}</td><td class="${h.ok==null?'muted':h.ok?'good':'bad'}">${h.ok==null?'—':h.ok?t_("home.in_tolleranza"):t_("home.fuori_tolleranza")}</td><td class="${h.fired?'bad':''}">${h.fired?(h.fired>14?t_("home.licenziato_a_fine_stagione"):t_("home.licenziato_alla_giornata",{fired:h.fired})):t_("home.fine_stagione")}</td></tr>`).join('')}</tbody></table></div>`:''}</section>`; }

/* ---------- finestre: menu ⋯, novità, nome della segretaria, avviso prima di giocare ---------- */
function vModal(){ const nm=secName();
  let h='';
  if(modal==='menu') h=`<div class="neg-h"><div><p class="eyebrow">${t_("home.evivora_v",{VERSION:VERSION})}</p><h2>${t_("home.menu")}</h2></div><button class="x" data-act="mclose" aria-label="${t_("home.chiudi")}">${t_("home.x")}</button></div>
    <div class="menu"><button class="btn ghost" data-act="novita">${t_("home.novita_della_versione")}</button><a class="btn ghost" id="menu-programma" href="programma.html">${t_("home.programma")}</a><button class="btn ghost" data-act="secname">${t_("home.cambia_nome_della_segretaria")}</button><button class="btn ghost" data-act="expg">${t_("home.esporta_la_partita")}</button><button class="btn ghost" data-act="impg">${t_("home.importa_una_partita")}</button><input type="file" id="imp-file" accept=".json,application/json" hidden>
    ${confirmReset?`<div class="reset"><span>${t_("home.ricominciare_cancella_questa_par")}</span><button class="btn danger small" data-act="reset2">${t_("home.si_ricomincia")}</button><button class="btn ghost small" data-act="reset0">${t_("home.annulla")}</button></div>`:`<button class="btn ghost danger-t" data-act="reset1">${t_("home.ricomincia_da_capo")}</button>`}</div>`;
  else if(modal==='novita') h=`<div class="neg-h"><div><p class="eyebrow">${t_("home.novita",{v:esc(CHANGELOG[0][1])})}</p><h2>${t_("home.versione_2",{VERSION:VERSION})}</h2></div><button class="x" data-act="mclose" aria-label="${t_("home.chiudi")}">${t_("home.x")}</button></div>
    ${CHANGELOG.slice(0,1).map(([v,d,l])=>`<ul class="chg">${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`).join('')}<div class="row"><button class="btn" data-act="mclose">${t_("home.chiudi")}</button></div>`;
  else if(modal==='secname') h=`<div class="neg-h"><div><p class="eyebrow">${t_("home.segreteria")}</p><h2>${t_("home.nome_della_segretaria")}</h2></div><button class="x" data-act="mclose" aria-label="${t_("home.chiudi")}">${t_("home.x")}</button></div>
    <form id="sec-form" class="secf"><label for="sec-new">${t_("home.come_si_chiama")}</label><input id="sec-new" maxlength="20" value="${esc(nm)}" autocomplete="off"><div class="row"><button class="btn" type="submit">${t_("home.salva")}</button><button class="btn ghost" type="button" data-act="mclose">${t_("home.annulla")}</button></div></form>`;
  else if(modal==='import'){ const I=IMP||{err:t_("home.nessun_file_scelto")}, beta=typeof ACC!=='undefined'&&ACC.on;
    h=`<div class="neg-h"><div><p class="eyebrow">${t_("home.menu")}</p><h2>${t_("home.importa_una_partita")}</h2></div><button class="x" data-act="impno" aria-label="${t_("home.chiudi")}">${t_("home.x")}</button></div>
    ${I.err?`<p class="bad" role="alert">${esc(I.err)}</p><div class="row"><button class="btn" data-act="impno">${t_("home.chiudi")}</button></div>`
      :`<p>${t_("home.nel_file_c_e")}</p><ul class="chk imp"><li><span>${t_("home.club")}</span><span></span><b>${esc(I.club)}</b></li><li><span>${t_("home.stagione_3")}</span><span></span><b>${I.s}</b></li><li><span>${t_("home.giornata_2")}</span><span></span><b>${I.md}/14</b></li>${I.ver?`<li><span>${t_("home.versione_3")}</span><span></span><b>${esc(I.ver)}</b></li>`:''}${I.data?`<li><span>${t_("home.esportata_il")}</span><span></span><b>${esc(new Date(I.data).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}))}</b></li>`:''}</ul>
       <p class="warn-t">${t_("home.se_la_carichi_sostituisce",{v:G?` ${t_("home.stagione_giornata",{n:esc(G.T[0].n),season:G.season,md:G.md})}`:'',v2:beta?t_("home.anche_la_copia_salvata"):''})}</p>
       <div class="row"><button class="btn danger" data-act="impok">${t_("home.si_carica_questa_partita")}</button><button class="btn ghost" data-act="impno">${t_("home.annulla")}</button></div>`}`; }
  else if(modal==='secwarn'){ const u=secItems().filter(x=>x.lv==='urg');
    h=`<div class="sec-h"><span class="sec-av" aria-hidden="true">${esc(nm.charAt(0).toUpperCase())}</span><div><p class="eyebrow">${t_("home.prima_di_giocare",{nm:esc(nm)})}</p><p class="sec-say">${t_("home.presidente_2",{v:u.length===1?t_("home.c_e_ancora_una"):t_("home.ci_sono_ancora_cose",{numIt:numIt(u.length)})})}</p></div></div>
    <ul class="secw">${u.map(x=>`<li>${esc(x.short)}</li>`).join('')}</ul>
    <div class="row"><button class="btn" data-act="secplay">${t_("home.giochiamo_lo_stesso")}</button><button class="btn ghost" data-act="secdesk">${t_("home.andiamo_alla_scrivania")}</button></div>`; }
  else return '';
  return `<div class="modal" id="modal-bg" role="dialog" aria-modal="true"><div class="neg-in modal-in">${h}</div></div>`;
}

/* ---------- esporta e importa la partita (0.4.1.0) ----------
   Il file contiene {presidente:1, versione, data, G}: lo stato G com'è, con la versione e la data dell'esportazione.
   L'importazione controlla il file, mostra club, stagione e giornata, chiede conferma e passa dalle migrazioni di loadFrom(). */
let IMP=null;
function exportName(){ const c=String(G.T[0].n||'club').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'club'; return `evivora-${c}-s${G.season}g${G.md}.json`; }
function exportGame(){ const data={presidente:1, versione:VERSION, data:new Date().toISOString(), G};
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})); a.download=exportName();
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000); toast(t_("home.partita_esportata_nel_file",{download:a.download})); }
function readImport(txt){ let x; try{ x=JSON.parse(txt); }catch(e){ return {err:t_("home.il_file_non_e")}; }
  const wrap=!!(x&&x.presidente&&x.G), g=wrap?x.G:x, ver=wrap?String(x.versione||''):'';
  if(!g||typeof g!=='object'||!Array.isArray(g.T)||g.T.length<2||!g.P||typeof g.P!=='object'||!Array.isArray(g.sched)||typeof g.season!=='number'||typeof g.md!=='number'||!g.T[0]||!g.T[0].n) return {err:t_("home.il_file_non_contiene")};
  if(ver && verCmp(ver,VERSION)>0) return {err:t_("home.la_partita_e_stata",{ver:ver,VERSION:VERSION})};
  return {s:g.season, md:g.md, club:g.T[0].n, ver, data:wrap?x.data:null, txt:JSON.stringify(g)}; }
function importGame(){ const I=IMP; if(!I||I.err) return;
  try{ stopViewer(); }catch(e){} const old=G;
  if(!loadFrom(I.txt)){ G=old; IMP={err:t_("home.la_partita_del_file")}; render(); return; }
  IMP=null; modal=null; viewer=null; clubView=null; clubBack=null; sheetPid=null; negId=null; bnegOn=false; confirmReset=false; secWarnFor=null; area='scrivania'; sub='home';
  save(); if(typeof ACC!=='undefined'&&ACC.on&&ACC.upload) ACC.upload();
  render(); window.scrollTo(0,0); toast(t_("home.partita_caricata_stagione_giorna",{n:G.T[0].n,season:G.season,md:G.md})); }
document.addEventListener('change', e=>{ if(e.target.id!=='imp-file') return; const f=e.target.files&&e.target.files[0]; if(!f) return;
  const rd=new FileReader(); rd.onload=()=>{ IMP=readImport(String(rd.result||'')); modal='import'; render(); }; rd.onerror=()=>{ IMP={err:t_("home.il_file_non_si")}; modal='import'; render(); }; rd.readAsText(f); });

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
    case 'expg': exportGame(); break;
    case 'impg': { const i=$('#imp-file'); if(i){ i.value=''; i.click(); } break; }
    case 'impok': importGame(); break;
    case 'impno': IMP=null; modal=null; render(); break;
    case 'secname': modal='secname'; render(); { const i=$('#sec-new'); if(i){ i.focus(); i.select(); } } break;
    case 'secplay': modal=null; render(); advance(true); break;
    case 'secdesk': go('scrivania'); break;
    case 'secfired': clubView=null; render(); break;
    case 'reqgo': focusReq=+el.dataset.id; go('scrivania'); break;
    case 'negres': negId=+el.dataset.id; sheetPid=null; render(); break;
  }
});
document.addEventListener('submit', e=>{ if(e.target.id!=='sec-form'||!G) return;
  const v=($('#sec-new').value||'').trim().slice(0,20); G.sec={n:v||t_("home.giulia")}; save(); modal=null; render(); toast(t_("home.d_ora_in_poi",{secName:secName()})); });

Object.assign(VIEWS,{'scrivania/home':vScrivania,'lega/notizie':vNotizie,'lega/giornata':vGiornata,'lega/marcatori':vMarcatori,'lega/albo':vAlbo,'mercato/trattative':vTrattative});
