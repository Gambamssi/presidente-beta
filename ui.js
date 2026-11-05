/* ================= INTERFACCIA ================= */
const KEY = 'presidente-bozza-v1';
const $ = s=>document.querySelector(s);
const esc = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n=>Math.round(n).toLocaleString('it-IT');
const kcr = n=>(n<0?'−':'')+fmt(Math.abs(n)/1000)+'k';
/* navigazione: area (Scrivania, Lega, Squadra, Mercato, Società) e sotto-scheda; clubView = profilo pubblico aperto */
let area='scrivania', sub='home', viewer=null, sheetPid=null, confirmReset=false, clubView=null, clubBack=null, modal=null, secWarnFor=null, focusReq=null;
const lastSub={};
const AREAS={
  scrivania:{n:'Scrivania', subs:[['home','Scrivania']]},
  lega:{n:'Lega', subs:[['notizie','Notizie'],['giornata','Giornata'],['classifica','Classifica'],['marcatori','Marcatori'],['albo','Albo d\'oro'],['arbitri','Arbitri']]},
  squadra:{n:'Squadra', subs:[['rosa','Rosa'],['allenatore','Allenatore'],['spogliatoio','Spogliatoio']]},
  mercato:{n:'Mercato', subs:[['cerca','Cerca giocatori'],['taccuino','Taccuino'],['trattative','Trattative in corso']]},
  societa:{n:'Società', subs:[['conti','Conti'],['bilancio','Bilancio'],['banca','Banca'],['strutture','Strutture']]}
};
const VIEWS={};
const onMatchPage = ()=>area==='lega' && sub==='giornata' && clubView==null;
/* porta in un'area (e sotto-scheda); senza sotto-scheda torna all'ultima vista in quell'area */
function go(a, s){
  if(!AREAS[a]) a='scrivania';
  const subs=AREAS[a].subs; if(!s || !subs.some(x=>x[0]===s)) s=lastSub[a]||subs[0][0];
  const was=onMatchPage();
  area=a; sub=s; lastSub[a]=s; clubView=null; clubBack=null; modal=null;
  if(was && !onMatchPage()) stopViewer();
  render(); window.scrollTo(0,0);
}
/* ---------- indirizzi delle pagine (0.4.2.1, N2) ----------
   #/<area>/<sotto-scheda> (es. #/squadra/rosa), #/club/<id>, #/giocatore/<id>. Le finestre sopra la pagina (menu, trattative,
   scheda del giocatore) hanno una voce propria nella cronologia: «Indietro» le chiude. Lo stato di history ricorda l'area sotto
   il profilo o la scheda (per il ricaricamento). I link delle mail di Supabase (#access_token=…, #error=…, type=recovery) non
   iniziano con «#/»: non si toccano mai, li legge e li toglie account.js. Solo interfaccia: nessun numero casuale, niente in G. */
const NAV={first:true, ok:true, n:0};
const navAuth=()=>/access_token|refresh_token|error_code|error=|type=/.test(location.hash||'');
function navParse(h){
  const m=/^#\/(.*)$/.exec(h||''); if(!m) return null;
  let p; try{ p=m[1].split('/').filter(Boolean).map(decodeURIComponent); }catch(e){ return {bad:true}; }
  if(!p.length) return {a:'scrivania'};
  if(p[0]==='giocatore'||p[0]==='club'){ const id=p[1]; if(p.length!==2||!/^\d+$/.test(id)) return {bad:true}; return p[0]==='club'?{club:+id}:{pl:+id}; }
  if(!AREAS[p[0]]||p.length>2) return {bad:true};
  if(p[1]!=null && !AREAS[p[0]].subs.some(x=>x[0]===p[1])) return {bad:true};
  return {a:p[0], s:p[1]||null};
}
function navPage(){ return clubView!=null ? '#/club/'+clubView : '#/'+area+(AREAS[area].subs.length>1?'/'+sub:''); }
function navNow(){
  const ov = modal ? 'm:'+modal : negId!=null ? 'n:'+negId : (bnegOn&&G.bneg) ? 'b' : sheetPid!=null ? 'g' : null;
  const h = sheetPid!=null&&!modal&&negId==null&&!(bnegOn&&G.bneg) ? '#/giocatore/'+sheetPid : navPage();
  return {evv:1, h, a:area, s:sub, c:clubView, pl:sheetPid, ov, key:h+'|'+(ov||'')};
}
/* dopo ogni disegno del gioco: scrive l'indirizzo. Finestra aperta → nuova voce; finestra chiusa → torna alla voce di prima */
function navSync(){
  if(!NAV.ok || NAV.wait || navAuth()) return;
  const k=navNow(), s=history.state&&history.state.evv ? history.state : null;
  try{
    if(NAV.replace || !s){ NAV.replace=false; k.prev=s?s.prev:null; k.n=s?s.n:NAV.n; history.replaceState(k,'',k.h); return; }
    if(s.key===k.key) return;
    const layer=s.ov||s.c!=null;
    if(layer && s.prev===k.key){ NAV.wait=setTimeout(()=>{ NAV.wait=0; NAV.replace=true; navSync(); },800); history.back(); return; }                                 /* chiusa con × o Esc: come «Indietro» */
    if(s.ov && (k.ov ? s.a===k.a&&s.s===k.s&&s.c===k.c : true)){ k.prev=s.prev; k.n=s.n; history.replaceState(k,'',k.h); return; } /* una finestra al posto di un'altra */
    k.prev=s.key; k.n=s.n+1; NAV.n=k.n; history.pushState(k,'',k.h);
  }catch(e){ NAV.ok=false; }                                                               /* pagina che non permette la cronologia: si gioca senza indirizzi */
}
/* porta lo stato della pagina all'indirizzo (ricaricamento, link diretto, «Indietro», «Avanti»). Indirizzo sconosciuto → Scrivania */
function navTarget(st, h, init){
  let r=navParse(h); if(!r||r.bad) r={a:'scrivania'};
  const t={a:r.a, s:r.s, c:null, pl:null, ov:null};
  if(r.club!=null||r.pl!=null){ t.a=st&&st.a||(init?'scrivania':area); t.s=st&&st.s||(init?null:sub); }
  if(r.club!=null) t.c=r.club;
  if(r.pl!=null){ t.pl=r.pl; t.c=st&&st.c!=null?st.c:(init?null:clubView); }
  if(!AREAS[t.a]) t.a='scrivania';
  if(!t.s||!AREAS[t.a].subs.some(x=>x[0]===t.s)) t.s=lastSub[t.a]||AREAS[t.a].subs[0][0];
  if(t.c!=null&&!G.T[t.c]) Object.assign(t,{a:'scrivania', s:'home', c:null, pl:null});
  if(t.pl!=null&&!G.P[t.pl]) Object.assign(t,{a:'scrivania', s:'home', c:null, pl:null});
  if(!init&&st&&st.ov&&st.h===h) t.ov=st.ov;
  return t;
}
/* primo disegno con la partita caricata (avvio, ricaricamento, accesso alla beta): apre la schermata dell'indirizzo */
function navStart(){ NAV.first=false; NAV.replace=true; if(navAuth()) return; const st=history.state&&history.state.evv?history.state:null; navApply(navTarget(st, location.hash, true)); }
function navApply(t){
  const was=onMatchPage(), pg0=navPage(), y0=clubBack&&t.c==null?clubBack.y:0;
  if(t.c!=null&&clubView==null) clubBack={y:window.scrollY}; else if(t.c==null) clubBack=null;
  area=t.a; sub=t.s; lastSub[t.a]=t.s; clubView=t.c; sheetPid=t.pl; confirmReset=false;
  const o=t.ov||'';
  modal = /^m:(menu|novita|secname)$/.test(o) ? o.slice(2) : null;
  if(!modal&&IMP) IMP=null;
  negId = o.startsWith('n:') && (G.req||[]).some(x=>x.id===+o.slice(2)&&x.neg) ? +o.slice(2) : null;
  if(o!=='b'&&bnegOn){ const deal=G.bneg&&G.bneg.st==='deal'; bnegOn=false; G.bneg=null; save(); if(deal) toast('Finanziamento firmato.'); }
  if(was && !onMatchPage()) stopViewer();
  return pg0!==navPage() ? y0 : null;
}
window.addEventListener('popstate', e=>{
  if(!G || !NAV.ok || navAuth() || (typeof ACC!=='undefined'&&ACC.on&&ACC.screen)) return;
  const st=e.state&&e.state.evv?e.state:null, cur=navNow();
  if(NAV.wait){ clearTimeout(NAV.wait); NAV.wait=0; if(!st||st.key!==cur.key){ NAV.replace=true; navSync(); } return; }  /* arrivo di un history.back() chiesto da navSync */
  if(st&&st.key===cur.key) return;                                                          /* è la voce già mostrata (chiusura con ×) */
  const t=navTarget(st, location.hash, false);
  /* visore aperto: «Indietro» chiude il visore e resta in Lega › Giornata; la partita è già giocata e il risultato resta */
  if(viewer && onMatchPage() && !cur.ov && !(t.a==='lega'&&t.s==='giornata'&&t.c==null)){
    stopViewer(); viewer=null; cur.prev=st?st.key:null; cur.n=(st?st.n:NAV.n)+1; try{ history.pushState(cur,'',cur.h); }catch(_){} render();
    toast('Visore chiuso. La partita è già giocata: il risultato resta qui.'); return; }
  const y=navApply(t); NAV.replace=true;
  render(); if(y!=null) window.scrollTo(0,y);
});
let filt={r:'',age:'40',src:'all',sort:'val'};

function save(){ try{ localStorage.setItem(KEY, JSON.stringify(G)); }catch(e){} }
function load(){ try{ return loadFrom(localStorage.getItem(KEY)); }catch(e){} return false; }
/* (v0.037) carica una partita da un testo JSON con le migrazioni dei vecchi salvataggi; la usano load() e gli account della beta (account.js) */
function loadFrom(s){ try{ if(s){ G=JSON.parse(s); if(G && G.P) Object.values(G.P).forEach(migratePlayer); if(G && G.T){ m1Migrate(); ensureRefs(); if(G.rep==null) G.rep=50; if(!G.sec||!G.sec.n) G.sec={n:'Giulia'}; G.T.forEach(t=>{ finInit(t); ensureBudget(t); }); G.T.forEach(t=>{ if(t.promise && !(t.miss||[]).some(m=>m.kind==='rinforzo'&&m.st==='on')) addMission(t,{kind:'rinforzo',role:t.promise.role,roleN:({D:'difensore',C:'centrocampista',A:'attaccante'})[t.promise.role],thr:t.promise.thr,due:t.promise.due,title:`Rinforzo per ${t.coach.n}`}); if(t.obj && t.obj.s===G.season && !(t.miss||[]).some(m=>m.kind==='obiettivo'&&m.st==='on')) addMission(t,{kind:'obiettivo',amt:t.obj.amt,lim:t.obj.lim,goal:t.obj.goal,due:14,title:`Obiettivo: ${t.obj.goal}`}); }); } return !!(G && G.T); } }catch(e){} return false; }
function toast(t){ const el=$('#toast'); el.textContent=t; el.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>el.hidden=true,3200); }

/* ---------- scouting: cosa vede il presidente ---------- */
const isMine = p=>p.team===0;
const obsN = p=>G.obs[p.id]||0;
function rangeOf(v, e, w){ if(w<=0.5) return [Math.round(v),Math.round(v)]; const lo=clamp(Math.round(v-w*(0.5+e)),1,20); return [lo, clamp(lo+Math.round(w),1,20)]; }
function attrView(p,k){
  if(isMine(p)) return [Math.round(p.a[k]),Math.round(p.a[k])];
  const n=obsN(p); if(!n) return null;
  return rangeOf(p.a[k], p.e[k], Math.max(0, 6-2*n));
}
function ovrView(p){
  const o=ovr(p); if(isMine(p)) return [o,o];
  const n=obsN(p); return rangeOf(o, p.e.pos||0, n? Math.max(0,5-2*n) : 6);
}
function ovrTxt(p){ const [a,b]=ovrView(p); return isMine(p)? a.toFixed(1) : a===b? String(a) : a+'–'+b; }
const stars = pot=>clamp((pot-6)/2.6,0.5,5);
function potView(p){ const n=obsN(p); if(!n) return null; const s=stars(p.pot); const w = n===1?1:n===2?0.5:0; const c=s+p.e.pot*w*2;
  return [clamp(Math.round((c-w)*2)/2,0.5,5), clamp(Math.round((c+w)*2)/2,0.5,5), n===1?'bassa':n===2?'media':'alta']; }
function starsHTML(p){
  const v=potView(p); if(!v) return '<span class="q" title="Manda l\'osservatore per una stima">?</span>';
  const [lo,hi]=v; let h='<span class="stars" aria-label="Potenziale da '+lo+' a '+hi+' stelle">';
  for(let i=1;i<=5;i++){ const cls = i<=lo?'on': (i-0.5<=lo?'half': i-0.5<=hi?'maybe':'off'); h+='<i class="'+cls+'"></i>'; }
  return h+'</span>';
}
function character(p){
  return [p.prof>=14?'grande professionista':p.prof<=8?'poco costante in allenamento':'serio in allenamento',
    p.amb>=14?'molto ambizioso':p.amb<=7?'senza grandi ambizioni':'ambizioso il giusto',
    p.tem>=13?'testa calda':p.tem<=6?'freddo e controllato':'carattere equilibrato'];
}
function observe(pid){
  if(G.scoutLeft<=0){ toast('Relazioni finite: l\'osservatore torna disponibile dopo la prossima giornata.'); return; }
  const p=G.P[pid]; if(obsN(p)>=3){ toast('Su '+p.ln+' hai già una relazione completa.'); return; }
  G.obs[pid]=obsN(p)+1; G.scoutLeft--;
  toast('Relazione su '+p.fn+' '+p.ln+' ('+G.obs[pid]+'ª). Ne restano '+G.scoutLeft+' per questa giornata.');
  save(); render();
}

/* ---------- mercato ---------- */
function findBuyer(pid){
  const p=G.P[pid]; const me=G.T[0];
  if(me.pl.length<=15){ toast('Rosa troppo corta: servono almeno 15 giocatori.'); return; }
  const ex=(G.req||[]).find(q=>q.team===0&&q.st==='open'&&q.kind==='offerta'&&q.pid===pid); if(ex){ openNeg(ex); negId=ex.id; sheetPid=null; render(); return; }
  const r=seekBuyer(p); if(!r){ toast('Nessun club può permetterselo ora.'); return; }
  openNeg(r); negId=r.id; sheetPid=null; save(); render();
}

/* ---------- strutture e allenatore ---------- */
const FAC = FACS;
function build(k){ const m=startBuild(G.T[0],k); if(m){ toast(m); return; } save(); render(); }
const coachCost = c=>(c.tat+c.all+c.gio+c.ges)*5000;
function showCands(){ G.cands=[0,1,2].map(()=>mkCoach(8.5+rnd()*3.5)); save(); render(); }
function hireCoach(i){
  const t=G.T[0], c=G.cands[i], cost=coachCost(c)+120000;
  if(t.cash<cost){ toast('Servono '+kcr(cost)+' cr tra buonuscita e ingaggio.'); return; }
  spend(t,'allenatore',cost); news(`Esonerato ${t.coach.n}. Il nuovo allenatore è ${c.n} (${c.mod}).`,'coach',true,0); t.coach=c; G.cands=null; save(); render();
}

/* ---------- avanzamento ---------- */
/* force: «Giochiamo lo stesso» dopo l'avviso della segretaria */
function advance(force){
  if(G.fired){ toast('Prima scegli la nuova società.'); return; }
  if(G.md===0 && needBudget(G.T[0])){ go('societa','bilancio'); toast('Prima convalida il preventivo della stagione.'); return; }
  const key=G.season+'-'+G.md;
  if(!force && G.md<G.sched.length && secWarnFor!==key && secItems().some(x=>x.lv==='urg')){ secWarnFor=key; modal='secwarn'; render(); return; }
  modal=null; stopViewer();
  if(G.md>=G.sched.length){ endSeason(); save(); viewer=null; go('scrivania'); toast('Inizia la stagione '+G.season+'.'); return; }
  const b=document.querySelector('[data-act=advance]'); if(b){ b.disabled=true; b.textContent='Si gioca la giornata…'; }
  setTimeout(()=>{
    const out=playMatchday(); save();
    const um=out.find(m=>m.h===0||m.a===0);
    viewer=null; area='lega'; sub='giornata'; lastSub.lega='giornata'; clubView=null; clubBack=null; render(); window.scrollTo(0,0); openViewer(out.indexOf(um));
  }, 40);
}

/* ---------- viste ---------- */
function bar(v,max=20,cls=''){ return `<span class="bar ${cls}"><span style="width:${clamp(v/max*100,0,100)}%"></span></span>`; }
function roleTag(r){ return `<span class="role r${r}" title="${ROLE_NAME[r]}">${r}</span>`; }
function nameBtn(p){ return `<button class="link" data-act="sheet" data-pid="${p.id}">${esc(p.fn)} ${esc(p.ln)}</button>`; }
/* media voto in decimi (seaStat/carStat) → testo con la virgola */
const v10 = v=>v==null?'–':(v/10).toFixed(1).replace('.',',');

/* Squadra › Allenatore: chi è, cosa sa fare, valutazione dell'esonero */
function vAllenatore(){
  const t=G.T[0], c=t.coach;
  const cands = G.cands? `<div class="cands"><p class="eyebrow">Allenatori liberi · costo con buonuscita</p>${G.cands.map((x,i)=>`<div class="cand"><div><b>${esc(x.n)}</b> · ${x.age} anni · ${x.mod}<p class="muted">Tattica ${x.tat} · Allenamento ${x.all} · Giovani ${x.gio} · Gruppo ${x.ges}</p></div><button class="btn small" data-act="hire" data-i="${i}">Ingaggia · ${kcr(coachCost(x)+120000)}</button></div>`).join('')}<button class="btn ghost small" data-act="nocands">Tieni ${esc(c.n)}</button></div>` : `<button class="btn ghost small" data-act="cands">Valuta un esonero</button>`;
  return pageHead('Squadra · staff tecnico',esc(c.n),`Allenatore · ${c.age} anni · modulo preferito ${c.mod}`,{right:`<span class="ev-tbface" aria-hidden="true">${faceHTML(Math.floor(hashU(c.n,9)*1e6)+1,{eta:c.age,ruolo:'allenatore',colori:{primario:clubArt(0).primario,secondario:clubArt(0).secondario}})}</span>`})+`<section class="card coach ev-panel"><p class="eyebrow">Allenatore</p><div class="coachrow"><div><p class="big name">${esc(c.n)}</p><p class="muted">${c.age} anni · modulo preferito ${c.mod}${c.squal>0?' · <b class="bad">squalificato per la prossima partita</b>':''}</p></div>
   <dl class="attrs">${[['Tattica',c.tat],['Allenamento',c.all],['Giovani',c.gio],['Gestione gruppo',c.ges],['Temperamento',c.car??10]].map(([k,v])=>`<div><dt>${k}</dt><dd>${bar(v)}<span class="num">${v}</span></dd></div>`).join('')}</dl></div>
   <p class="muted">Sceglie lui modulo e titolari: tiene conto di valutazione, stanchezza e, se ha un buon voto in “Giovani”, dà spazio ai ragazzi. Un temperamento alto lo porta a protestare con l'arbitro: rischia l'allontanamento e la squalifica per la partita dopo.</p>${cands}</section>`;
}
/* Squadra › Spogliatoio: clima, morale dell'allenatore, capitano e vice, il più carico e il più scontento */
function vSpogliatoio(){
  const t=G.T[0], c=t.coach, pl=teamPlayers(t).filter(p=>!p.retired), happy=pl.slice().sort((a,b)=>b.mor-a.mor)[0], sad=pl.slice().sort((a,b)=>a.mor-b.mor)[0], cap=G.P[t.cap], vc=G.P[t.vcap];
  const line=(p,lbl)=>p?`<li><b>${nameBtn(p)}</b> <span class="muted">${lbl} · morale ${morLevel(p.mor)}${p.morC&&p.morC[0]?' — '+esc(p.morC[0].t):''}</span></li>`:'';
  return pageHead('Squadra · gruppo','Spogliatoio',`Clima ${morLevel(clubClimate(t))} · capitano ${cap?esc(cap.fn+' '+cap.ln):'–'}`)+`<section class="card ev-panel"><p class="eyebrow">Spogliatoio</p><div class="sp-top"><div><p class="muted">Clima della società</p><p class="big">${morLevel(clubClimate(t)).replace(/^./,x=>x.toUpperCase())}</p>${bar(clubClimate(t),20,'mor')}<p class="muted small">Media del morale di giocatori e allenatore (capitano, vice e allenatore contano di più). Nelle trattative chi sta bene in società scende più volentieri.</p></div><div><p class="muted">Morale dell'allenatore</p><p class="big">${morLevel(c.mor??12).replace(/^./,x=>x.toUpperCase())}</p>${bar(c.mor??12,20,'mor')}</div><div><p class="muted">Ultimi voti dell'allenatore</p><p class="big">${(c.rts||[]).length?c.rts.slice(-5).map(x=>x==null?'–':String(x).replace('.',',')).join(' · '):'–'}</p></div></div>
    <ul class="morc">${line(cap,'capitano')}${line(vc,'vicecapitano')}${happy&&happy!==cap&&happy!==vc?line(happy,'il più carico'):''}${sad&&sad!==cap&&sad!==vc&&sad.mor<11?line(sad,'il più scontento'):''}</ul>
    <p class="muted">Il morale si muove dopo ogni partita: voto, risultato, gol, minuti giocati, clima nello spogliatoio (il capitano conta di più) e umore dell'allenatore. Torna sempre lentamente verso la normalità. In partita vale quanto un buon acquisto, nel bene e nel male.</p></section>`;
}

function plBadges(p, mine){
  return `${p.team!=null&&G.T[p.team].cap===p.id?' <span class="badge-s capb" title="Capitano">C</span>':p.team!=null&&G.T[p.team].vcap===p.id?' <span class="badge-s vcapb" title="Vicecapitano">VC</span>':''}${G.note[p.id]?' <span class="gold" title="Nel taccuino">◆</span>':''}${!mine&&G.T[0].promise&&p.r===G.T[0].promise.role?(ovrView(p)[0]>=G.T[0].promise.thr-0.05?' <span class="badge-s prm" title="Soddisfa la promessa fatta all\'allenatore">promessa ✓</span>':ovrView(p)[1]>=G.T[0].promise.thr?' <span class="badge-s prm2" title="Potrebbe soddisfare la promessa: fallo valutare">promessa ?</span>':''):''}${mine&&p.peg?' <span class="badge-s peg" title="In pegno alla banca">pegno</span>':''}${p.inj>0?` <span class="badge-s inj" title="Infortunato">✚ ${p.inj}</span>`:''}${p.sq>0?' <span class="badge-s sq" title="Squalificato">squal.</span>':''}`; }
/* righe dei giocatori (Rosa e Cerca giocatori): al telefono diventano schede (etichette da data-l) */
function playerRows(list, mine){
  return list.map(p=>`<tr data-act="sheet" data-pid="${p.id}" class="${G.note[p.id]?'noted':''}">
    <td class="mh">${roleTag(p.r)}</td><td class="nm pc">${plCell(p, nameBtn(p)+plBadges(p,mine), `${ROLE_NAME[p.r]} · ${p.age} anni${mine?'':' · '+(p.team==null?'svincolato':esc(G.T[p.team].n))}`)}</td><td class="num mh">${p.age}</td>
    ${mine?'':`<td class="mh">${p.team==null?'<span class="muted">Svincolato</span>':clubLink(p.team)}</td>`}
    <td class="num strong mv" data-l="Val.">${ovrTxt(p)}</td><td data-l="Potenziale"${mine?' class="mh"':''}>${starsHTML(p)}</td>
    ${mine?`<td data-l="Morale" title="Morale ${morLevel(p.mor)}${p.morC&&p.morC[0]?': '+esc(p.morC[0].t):''}">${bar(p.mor,20,'mor '+(p.mor<9?'warn':''))}</td><td class="num" data-l="Fatica">${Math.round(p.fat)}%</td>${(S=>`<td class="num sg" data-l="Presenze">${S.a}</td><td class="num" data-l="Gol">${S.g}</td><td class="num" data-l="Media">${v10(S.v)}</td>`)(seaStat(p))}${(C=>`<td class="num sg mh">${C.a}</td><td class="num mh">${C.g}</td>`)(carStat(p))}<td class="num sg mh" data-l="Stip./g">${fmt(p.wg)}</td><td class="num" data-l="Contratto">${p.ct} ${p.ct===1?'anno':'anni'}</td>`
          :`<td class="num" data-l="Valore">${kcr(value(p))}</td><td class="num" data-l="Relazioni">${obsN(p)}/3</td>`}
  </tr>`).join('');
}
function vRosa(){
  const t=G.T[0], pl=teamPlayers(t).sort((a,b)=>'PDCA'.indexOf(a.r)-'PDCA'.indexOf(b.r) || ovr(b)-ovr(a));
  const inj=pl.filter(p=>p.inj>0).length, fat=pl.length?Math.round(pl.reduce((s,p)=>s+p.fat,0)/pl.length):0;
  return pageHead('Squadra · gestione giocatori','La tua rosa',`${pl.length} giocatori · stagione ${G.season}, giornata ${G.md}/14`)
  +kpiHTML([['Giocatori',pl.length,`${pl.filter(p=>p.r==='P').length} portieri · massimo 24`],['Infortunati',inj||'Nessuno',inj?'fuori per qualche giornata':'tutti disponibili',inj?'bad':''],['Fatica media',fat+'%','recupera tra una giornata e l\'altra'],['Clima',cap1(morLevel(clubClimate(t))),'morale della società']])
  +`<section class="card ev-panel"><div class="head"><h2 class="ev-ptitle">Elenco giocatori <small>(${pl.length})</small></h2><p class="muted">Attributi esatti per i tuoi giocatori; il potenziale resta nascosto finché non lo fai valutare. Presenze, gol e media voto della stagione in corso e della carriera.</p></div>
  <div class="tw"><table class="ev-ptab rosa"><thead><tr class="grp"><th colspan="7"></th><th colspan="3" class="sg">Stagione ${G.season}</th><th colspan="2" class="sg">Carriera</th><th colspan="2" class="sg"></th></tr><tr><th>R</th><th>Giocatore</th><th class="num">Età</th><th class="num">Val.</th><th>Potenziale</th><th>Morale</th><th class="num">Fatica</th><th class="num sg">Pres.</th><th class="num">Gol</th><th class="num" title="Media voto della stagione">Media</th><th class="num sg">Pres.</th><th class="num">Gol</th><th class="num sg">Stip./g</th><th class="num">Contratto</th></tr></thead><tbody>${playerRows(pl,true)}</tbody></table></div></section>`;
}
function vMercato(){
  let list=Object.values(G.P).filter(p=>!p.retired && p.team!==0 && (p.team!=null || G.FA.includes(p.id)));
  const all=list.length;
  if(filt.r) list=list.filter(p=>p.r===filt.r);
  list=list.filter(p=>p.age<=+filt.age);
  if(filt.src==='fa') list=list.filter(p=>p.team==null); if(filt.src==='club') list=list.filter(p=>p.team!=null);
  list.sort(filt.sort==='age'?(a,b)=>a.age-b.age:filt.sort==='obs'?(a,b)=>obsN(b)-obsN(a):(a,b)=>value(b)-value(a));
  const sel=(id,opts,v)=>`<select id="${id}" data-filt="${id.slice(2)}">${opts.map(([k,l])=>`<option value="${k}"${k===v?' selected':''}>${l}</option>`).join('')}</select>`;
  return pageHead('Mercato · osservatori','Cerca giocatori',`Ricerca e valutazione dei profili · ${all} giocatori nei club e svincolati`)
  +`<div class="ev-layout"><aside class="ev-side"><section class="card ev-panel"><h2 class="ev-ptitle">Filtra ricerca</h2>
   <div class="filters ev-fields"><label>Ruolo ${sel('f-r',[['','Tutti'],['P','Portieri'],['D','Difensori'],['C','Centrocampisti'],['A','Attaccanti']],filt.r)}</label>
   <label>Età fino a ${sel('f-age',[['19','19'],['21','21'],['23','23'],['40','tutte']],filt.age)}</label>
   <label>Dove ${sel('f-src',[['all','Ovunque'],['club','Nei club'],['fa','Svincolati']],filt.src)}</label>
   <label>Ordina ${sel('f-sort',[['val','Valore'],['age','Età'],['obs','Osservazioni']],filt.sort)}</label></div></section>
   <section class="card ev-panel"><h2 class="ev-ptitle">Osservatore</h2><p class="ev-bignum">${G.scoutLeft}<small>/3</small></p><p class="muted">Relazioni rimaste. Mandalo dalla scheda del giocatore: ogni relazione stringe la valutazione e scopre il potenziale.</p><p class="muted small">Il valore di mercato dipende solo da livello attuale ed età: i talenti nascosti costano poco.</p></section></aside>
  <section class="card ev-panel ev-main"><div class="head"><h2 class="ev-ptitle">Risultati <small>(${list.length}${list.length>90?', i primi 90':''})</small></h2><p class="muted">Tocca un giocatore per aprire la scheda: osservatore, taccuino e trattativa.</p></div>
  <div class="tw"><table class="ev-ptab cerca"><thead><tr><th>R</th><th>Giocatore</th><th class="num">Età</th><th>Squadra</th><th class="num">Val.</th><th>Potenziale</th><th class="num">Valore</th><th class="num">Relaz.</th></tr></thead><tbody>${playerRows(list.slice(0,90),false)}</tbody></table></div></section></div>`;
}
function vClassifica(){
  const st=standings(), me=st.findIndex(t=>t.id===0)+1, played=G.T.reduce((x,t)=>x+t.tab.g,0)/2;
  return pageHead('Lega · campionato','Classifica',`Stagione ${G.season} · giornata ${G.md} di 14 · ${st.length} società`)
  +`<div class="ev-layout ev-layout-r"><section class="card ev-panel ev-main"><h2 class="ev-ptitle">Classifica generale</h2>${G.md===0?'<p class="muted small">La stagione non è ancora iniziata: tutte le squadre hanno zero punti.</p>':''}<div class="tw"><table class="tab ev-standings"><thead><tr><th class="num">#</th><th>Squadra</th><th class="num">G</th><th class="num">V</th><th class="num">N</th><th class="num">P</th><th class="num">GF</th><th class="num">GS</th><th class="num">DR</th><th class="num">Pt</th><th class="fcol">Forma</th></tr></thead><tbody>
  ${st.map((t,i)=>`<tr class="${t.id===0?'me':''}"><td class="num pos">${String(i+1).padStart(2,'0')}</td><td class="sq">${clubCell(t.id)}</td><td class="num">${t.tab.g}</td><td class="num">${t.tab.v}</td><td class="num">${t.tab.n}</td><td class="num">${t.tab.p}</td><td class="num">${t.tab.gf}</td><td class="num">${t.tab.gs}</td><td class="num">${t.tab.gf-t.tab.gs}</td><td class="num strong">${teamPts(t)}${t.fin&&t.fin.pen?` <small class="bad">(−${t.fin.pen})</small>`:''}${t.fin&&t.fin.excluded?' <small class="bad">esclusa</small>':''}</td><td class="fcol">${t.form.map(f=>`<span class="fm f${f}">${f}</span>`).join('')}</td></tr>`).join('')}</tbody></table></div></section>
  <aside class="ev-side"><section class="card ev-panel"><h2 class="ev-ptitle">Il campionato</h2><div class="ev-kvs"><div class="ev-kv"><span>Giornata</span><strong>${G.md}/14</strong></div><div class="ev-kv"><span>Squadre</span><strong>${st.length}</strong></div><div class="ev-kv"><span>Partite disputate</span><strong>${played}</strong></div><div class="ev-kv"><span>La tua posizione</span><strong>${me}°</strong></div><div class="ev-kv"><span>Capolista</span><strong>${esc(st[0].n)}</strong></div></div>
   <p class="muted small">G giocate · V vinte · N pareggiate · P perse · GF gol fatti · GS gol subiti · DR differenza reti · Pt punti.</p></section></aside></div>`;
}
function vArbitri(){
  ensureRefs();
  const rows=G.refs.slice().sort((a,b)=>b.esp-a.esp).map(r=>{ const avg=r.g?(r.vs/r.g).toFixed(1).replace('.',','):'–';
    return `<tr><td class="nm"><b>${esc(r.n)}</b><div class="muted small">Assistenti: ${esc(r.a1)}, ${esc(r.a2)} · ${r.age} anni</div></td>
      ${[r.esp,r.car,r.fis,r.err].map((v,i)=>`<td>${bar(v,20,i===3?'warn':'')}<span class="num">${v}</span></td>`).join('')}
      <td class="num">${r.g}</td><td class="num strong">${avg}</td><td class="num">${r.er}</td><td class="num">${r.g?((r.yc)/r.g).toFixed(1).replace('.',','):'–'}</td><td class="num">${r.rc}</td><td class="num">${r.pen}</td></tr>`; }).join('');
  const last=G.last? `<ul class="refl">${G.last.map(m=>{ const r=G.refs[m.refId]; return r?`<li><span>${clubLink(m.h)} – ${clubLink(m.a)} <b>${m.gh}-${m.ga}</b></span><span>${esc(r.n)}</span><span class="num strong">${String(m.ref.voto).replace('.',',')}</span><span class="muted">${m.ref.errs.length?m.ref.errs.length+(m.ref.errs.length===1?' errore':' errori'):'nessun errore'}</span></li>`:''; }).join('')}</ul>` : '<p class="empty">Le designazioni arrivano con la prima giornata.</p>';
  return pageHead('Lega · arbitri','Terne arbitrali',`Stagione ${G.season} · ${G.refs.length} terne · una per partita`)+`<section class="card ev-panel"><div class="head"><p class="eyebrow">Terne arbitrali · stagione ${G.season}</p><p class="muted">Una terna per ogni partita della giornata: arbitro e due assistenti. Ogni terna ha le sue caratteristiche: <b>esperienza</b>, <b>cartellini</b> (quanto è severa), <b>fischio facile</b> (quanto concede falli e rigori) ed <b>errori</b> (quanto è soggetta a sbagliare). In una partita può sbagliare da 0 a 2 decisioni: le vedi alla moviola. A fine gara riceve un voto. Quando ci saranno più campionati, le terne più esperte arbitreranno le categorie superiori.</p></div>
  <div class="tw"><table class="tab"><thead><tr><th>Terna</th><th>Esperienza</th><th>Cartellini</th><th>Fischio facile</th><th>Errori</th><th class="num">Gare</th><th class="num">Voto medio</th><th class="num">Errori fatti</th><th class="num">Gialli/gara</th><th class="num">Rossi</th><th class="num">Rigori</th></tr></thead><tbody>${rows}</tbody></table></div></section>
  <section class="card ev-panel"><p class="eyebrow">Ultima giornata · designazioni e voti</p>${last}</section>`;
}


/* impegni in corso: avanzamento e scadenza */
function missionInfo(t,m){
  const left=m.due-G.md, pos=standings().findIndex(x=>x.id===t.id)+1;
  if(m.kind==='rinforzo'){ const c=Object.values(G.P).filter(p=>!p.retired&&p.team!==0&&(p.team!=null||G.FA.includes(p.id))&&p.r===m.role).filter(p=>ovrView(p)[0]>=m.thr-0.05).length;
    return {prog:`Compra ${m.roleN==='attaccante'?'un ':'un '}${m.roleN} di valore almeno ${String(m.thr).replace('.',',')}.`, when: left<=1?`Ultima occasione: compra prima di giocare la giornata ${m.due}`:`Compra prima di giocare la giornata ${m.due} (mancano ${left} giornate)`, urgent:left<=1,
      act:`<button class="btn small" data-act="missmkt" data-r="${m.role}">Cerca sul mercato</button> <span class="muted">${c===0?'nessun giocatore sicuramente adatto':c===1?'1 giocatore sicuramente adatto':c+' giocatori sicuramente adatti'}; altri da far valutare all'osservatore</span>`}; }
  if(m.kind==='premio') return {prog:`${kcr(m.amt)} cr ai giocatori se battete ${clubLink(m.opp)}.`, when:'Si decide nella prossima partita', urgent:false, act:''};
  if(m.kind==='obiettivo'){ const ok=pos<=m.lim; return {prog:`Oggi siete ${pos}°: ${ok?'l\'obiettivo è alla portata':'fuori dalla zona obiettivo'}. In palio ${kcr(m.amt)} cr.`, when:`Si decide a fine stagione (mancano ${Math.max(0,14-G.md)} giornate)`, urgent:false, act:''}; }
  return {prog:'',when:'',urgent:false,act:''};
}
function missionsHTML(t, compact){
  const act=activeMissions(t), done=(t.miss||[]).filter(m=>m.st!=='on' && m.s===G.season).slice(0,compact?2:6);
  if(compact && !act.length) return '';
  const li=act.map(m=>{ const i=missionInfo(t,m); return `<li class="ms ${i.urgent?'urg':''}"><div><p class="eyebrow">${i.urgent?'⚑ In scadenza · ':'In corso · '}${esc(m.title)}</p><p>${i.prog}</p><p class="muted">${i.when}</p>${i.act&&!compact?`<p>${i.act}</p>`:''}</div></li>`; }).join('');
  const dl=done.map(m=>`<li class="ms ${m.st}"><div><p class="eyebrow">${m.st==='ok'?'✓ Completato':m.st==='ko'?'✗ Fallito':'Concluso'} · ${esc(m.title)}</p><p class="muted">${esc(m.res||'')}</p></div></li>`).join('');
  return `<section class="card"><p class="eyebrow">Impegni del presidente</p>${act.length?`<ul class="msl">${li}</ul>`:'<p class="empty">Nessun impegno in corso. Quando accetti una richiesta che ha una scadenza, la ritrovi qui finché non si conclude.</p>'}${dl&&!compact?`<p class="eyebrow" style="margin-top:6px">Conclusi in questa stagione</p><ul class="msl">${dl}</ul>`:''}${compact?`<button class="link" data-act="go" data-a="scrivania">Vai alla Scrivania ›</button>`:''}</section>`;
}

/* ---------- finestra della trattativa ---------- */
/* testata delle finestre di trattativa (0.4.2.5): fascia verde con il volto (o lo stemma), il nome e un numero a destra */
function negHead(p, over, title, sub, rl, rv, tags){
  return `<div class="neg-h ev-nhead"><span class="ev-nface" aria-hidden="true">${p?plFace(p):crestHTML(0)}</span><div class="ev-ntext"><p class="ev-eyebrow">${over}</p><h2>${title}</h2><p class="ev-nsub">${sub}</p>${tags&&tags.length?`<p class="ev-ntags">${tags.map(x=>`<span>${x}</span>`).join('')}</p>`:''}</div>${rv!=null?`<div class="ev-nval"><small>${rl}</small><b>${rv}</b></div>`:''}<button class="x" data-act="negclose" aria-label="Chiudi">×</button></div>`; }
let negId=null;
function negVal(r,v){ if(r.kind==='offerta') return kcr(v)+' cr'; if(r.kind==='acquisto') return r.neg&&r.neg.ph==='club'?kcr(v)+' cr':fmt(v)+' cr a giornata'; return r.kind==='rinforzo'?'un giocatore di valore almeno '+String(v.toFixed(1)).replace('.',','):r.kind==='rinnovo'||r.kind==='aumento'?fmt(v)+' cr a giornata':kcr(v)+' cr'; }
function vNeg(){
  const r=(G.req||[]).find(q=>q.id===negId); if(!r||!r.neg) return '';
  if(r.kind==='offerta') return vNegOff(r);
  if(r.kind==='acquisto') return vNegBuy(r);
  const t=G.T[0], n=r.neg, R=negRange(r), w=reqWho(r), mor=reqMor(r), cl=clubClimate(t);
  const who = w.type==='p' ? `${esc(w.o.fn)} ${esc(w.o.ln)}` : w.type==='c' ? `${esc(t.coach.n)} (allenatore)` : `La squadra (parla il capitano ${w.o?esc(w.o.ln):''})`;
  const req = r.kind==='rinforzo' ? `un ${({D:'difensore',C:'centrocampista',A:'attaccante'})[r.role]} di valore almeno ${negVal(r,R.hi)} entro la giornata ${r.pdue}`
            : (r.kind==='rinnovo'||r.kind==='aumento') ? `${negVal(r,R.hi)} (ora ${fmt(r.old)})${r.kind==='rinnovo'?', rinnovo di 3 anni':''}` : `${negVal(r,R.hi)} ${r.kind==='premio'?'in caso di vittoria':'se si raggiunge l\'obiettivo'}`;
  const hist=n.hist.map(h=>h.by==='pres'?`<li class="me"><span>Tu</span><p>${h.no?`La risposta è no.${h.m?` ${esc(NEG_MOT[h.m])}.`:''}${h.oo?` Ti riconosco ${kcr(h.oo)} cr una tantum.`:''}`:h.acc?`D'accordo: ${negVal(r,h.v)}.`:`${h.m?esc(NEG_MOT[h.m])+'. ':''}Propongo ${negVal(r,h.v)}${h.oo?` più ${kcr(h.oo)} cr una tantum alla firma`:''}.`}</p></li>`:`<li class="them"><span>${w.type==='p'?esc(w.o.ln):w.type==='c'?esc(t.coach.n.split(' ').pop()):'Capitano'}</span><p>${esc(h.txt||'')}${h.v!=null&&h.txt&&!/Affare/.test(h.txt)?' '+negVal(r,h.v)+'.':''}</p></li>`).join('');
  const open=n.st==='open', st=n.st==='stalled';
  const pb=Math.round(n.pat/n.pat0*100);
  const motives=Object.entries(NEG_MOT).filter(([k])=>k!=='prestazioni'||w.type==='p');
  return `<div class="neg" role="dialog" aria-label="Trattativa"><div class="neg-in">
   ${negHead(w.type==='p'?w.o:null, 'Trattativa · '+REQ_KIND[r.kind], who, w.type==='p'?`${ROLE_NAME[w.o.r]} · ${w.o.age} anni · ${esc(t.n)}`:esc(t.n), 'Morale', cap1(morLevel(mor)))}
   <p class="muted">Chiede ${req}.</p>
   <div class="neg-sides">
     <div class="side"><p class="eyebrow">Il presidente</p><p class="strong">${esc(t.n)}</p><p class="muted">Clima della società: ${morLevel(cl)}</p>${bar(cl,20,'mor')}<p class="muted">Cassa ${kcr(t.cash)} · stipendi/ricavi ${Math.round(wageRatio(t)*100)}%</p></div>
     <div class="side"><p class="eyebrow">${w.type==='t'?'La squadra':w.type==='c'?'L\'allenatore':'Il giocatore'}</p><p class="muted">Morale: <b>${morLevel(mor)}</b></p>${bar(mor,20,'mor '+(mor<9?'warn':''))}<p class="muted">Pazienza</p><span class="bar pat ${pb<35?'warn':''}"><span style="width:${pb}%"></span></span><p class="muted small">Il morale è l'unico indizio: chi si trova bene scende più volentieri.</p></div>
   </div>
   <ul class="neg-chat">${hist||'<li class="sys">Fai la tua proposta.</li>'}</ul>
   ${open?`<div class="neg-form"><label>La tua proposta <b id="neg-vt">${negVal(r,n.c)}</b></label>
      <input type="range" id="neg-v" min="${R.lo}" max="${R.hi}" step="${R.step}" value="${n.hist.length?(n.hist.filter(h=>h.by==='pres').slice(-1)[0]||{v:n.c}).v:R.lo+(R.hi-R.lo)*0.5}" data-unit="${r.kind}">
      <label>Motivazione <select id="neg-mot"><option value="">nessuna</option>${motives.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label>
      ${R.oneoff?`<label>Una tantum alla firma <select id="neg-oo">${[0,10000,25000,50000,100000].map(x=>`<option value="${x}">${x?kcr(x)+' cr':'nessuna'}</option>`).join('')}</select></label>`:''}
      <div class="row"><button class="btn" data-act="negprop">Proponi</button><button class="btn ghost" data-act="negacc">Accetta la sua richiesta: ${negVal(r,n.c)}</button></div></div>`:''}
   ${st?`<div class="neg-stop"><p class="strong">La pazienza è finita: ora devi decidere.</p><div class="row"><button class="btn" data-act="negacc">Accetta la sua ultima richiesta: ${negVal(r,n.c)}</button></div></div>`:''}
   ${open||st?`<details class="neg-no"><summary>Chiudi con un rifiuto</summary>
      <p class="muted">Un no secco costa il morale pieno. Un no motivato pesa meno se il motivo è credibile e se accompagni il rifiuto con una somma una tantum.</p>
      <div class="mot">${motives.map(([k,l],i)=>`<label><input type="radio" name="neg-m" value="${k}" ${i===0?'checked':''}> ${l}</label>`).join('')}</div>
      <label>Una tantum <select id="neg-roo">${[0,10000,25000,50000].map(x=>`<option value="${x}">${x?kcr(x)+' cr':'nessuna'}</option>`).join('')}</select></label>
      <div class="row"><button class="btn danger small" data-act="negrefm">Rifiuta motivando</button><button class="btn ghost small" data-act="negref">Rifiuto secco</button></div></details>`:''}
   ${!open&&!st?`<p class="strong">${esc(r.out||'Trattativa chiusa.')}</p><div class="row"><button class="btn" data-act="negclose">Chiudi</button></div>`:''}
  </div></div>`;
}

function vNegOff(r){
  const t=G.T[0], n=r.neg, R=offRange(r), p=G.P[r.pid], b=buyerOf(r), cl=clubClimate(t), pb=Math.round(n.pat/120*100);
  const hist=n.hist.map(h=>h.by==='pres'?`<li class="me"><span>Tu</span><p>${h.no?`Non vendiamo.${h.m?' '+esc(OFF_MOT[h.m])+'.':''}`:h.acc?`Accettiamo: ${kcr(h.v)} cr.`:`Chiediamo ${kcr(h.v)} cr.`}</p></li>`
    : h.by==='pl'?`<li class="them pl"><span>${esc(p.ln)}</span><p>${esc(h.txt)}</p></li>`
    : `<li class="them"><span>${esc(b.n)}</span><p>${esc(h.txt||'')}${h.v!=null?' '+kcr(h.v)+' cr.':''}</p></li>`).join('');
  const open=n.st==='open', st=n.st==='stalled';
  return `<div class="neg" role="dialog" aria-label="Trattativa di mercato"><div class="neg-in">
   ${negHead(p, 'Mercato · offerta per un tuo giocatore', `${esc(p.fn)} ${esc(p.ln)}`, `${ROLE_NAME[p.r]} · ${p.age} anni · chi compra: ${b.foreign?esc(b.n):clubLink(b.id)}`, 'Offerta iniziale', kcr(r.amt)+' cr')}
   <p class="muted">Offerta iniziale ${kcr(r.amt)} cr · valore di mercato ${kcr(value(p))} cr · stipendio ${fmt(p.wg)} a giornata.</p>
   <div class="neg-sides">
     <div class="side"><p class="eyebrow">Il presidente</p><p class="strong">${esc(t.n)}</p><p class="muted">Clima della società: ${morLevel(cl)}</p>${bar(cl,20,'mor')}<p class="muted">Cassa ${kcr(t.cash)}</p></div>
     <div class="side"><p class="eyebrow">Il club che compra</p><p class="strong">${esc(b.n)}</p><p class="muted">Pazienza</p><span class="bar pat ${pb<35?'warn':''}"><span style="width:${pb}%"></span></span>
       <p class="eyebrow" style="margin-top:6px">Il giocatore</p><p class="muted">Morale: <b>${morLevel(p.mor)}</b></p>${bar(p.mor,20,'mor '+(p.mor<9?'warn':''))}<p class="muted small">Se i club si accordano decide lui. Il morale è l'unico indizio: chi sta bene da noi può rifiutare di partire.</p></div>
   </div>
   <ul class="neg-chat">${hist||'<li class="sys">Chiedi una cifra più alta, accetta o rifiuta.</li>'}</ul>
   ${open?`<div class="neg-form"><label>Il prezzo che chiedi <b id="neg-vt">${kcr(n.c)} cr</b></label>
      <input type="range" id="neg-v" min="${R.lo}" max="${R.hi}" step="5000" value="${Math.min(R.hi,Math.round(n.c*1.2/5000)*5000)}" data-unit="offerta">
      <div class="row"><button class="btn" data-act="negprop">Chiedi</button><button class="btn ghost" data-act="negacc">Accetta la loro offerta: ${kcr(n.c)} cr</button></div></div>`:''}
   ${st?`<div class="neg-stop"><p class="strong">Il club non tratta più: ora devi decidere.</p><div class="row"><button class="btn" data-act="negacc">Accetta ${kcr(n.c)} cr</button></div></div>`:''}
   ${open||st?`<details class="neg-no"><summary>Rifiuta l'offerta</summary>
      <p class="muted">Se il giocatore voleva andare ci resta male; una motivazione credibile detta a lui attenua la delusione.</p>
      <div class="mot"><label><input type="radio" name="neg-m" value="" checked> Nessuna motivazione</label>${Object.entries(OFF_MOT).map(([k,l])=>`<label><input type="radio" name="neg-m" value="${k}"> ${l}</label>`).join('')}</div>
      <div class="row"><button class="btn danger small" data-act="negrefm">Rifiuta</button></div></details>`:''}
   ${!open&&!st?`<p class="strong">${esc(r.out||'Trattativa chiusa.')}</p><div class="row"><button class="btn" data-act="negclose">Chiudi</button></div>`:''}
  </div></div>`;
}

function vNegBuy(r){
  const t=G.T[0], n=r.neg, p=G.P[r.pid], from=r.from!=null?G.T[r.from]:null, cl=clubClimate(t), ph=n.ph, pb=Math.round(n.pat/n.pat0*100);
  const hist=n.hist.map(h=>h.by==='pres'?`<li class="me"><span>Tu</span><p>${h.acc?`D'accordo: ${h.ph==='club'?kcr(h.v)+' cr':fmt(h.v)+' cr a giornata'}.`:h.ph==='club'?`Offriamo ${kcr(h.v)} cr per il cartellino.`:`Ti offriamo ${fmt(h.v)} cr a giornata${h.oo?` più ${kcr(h.oo)} cr alla firma`:''}, contratto di 3 anni.`}</p></li>`
    : h.by==='club'?`<li class="them"><span>${esc(from?from.n:'Club')}</span><p>${esc(h.txt)}${h.v!=null?' '+kcr(h.v)+' cr.':''}</p></li>`
    : `<li class="them pl"><span>${esc(p.ln)}</span><p>${esc(h.txt)}${h.v!=null?' '+fmt(h.v)+' cr a giornata.':''}</p></li>`).join('');
  const open=n.st==='open', st=n.st==='stalled';
  const lo=ph==='club'?Math.round(value(p)*0.5/5000)*5000:Math.round(Math.min(n.ask*0.6,p.wg)/50)*50, hi=ph==='club'?n.ask:n.ask, step=ph==='club'?5000:50;
  const def=ph==='club'?Math.round((lo+hi)/2/5000)*5000:Math.round((lo+hi)/2/50)*50;
  return `<div class="neg" role="dialog" aria-label="Trattativa di acquisto"><div class="neg-in">
   ${negHead(p, 'Mercato · acquisto · '+(from?(ph==='club'?'fase 1 di 2: accordo con il club':'fase 2 di 2: contratto con il giocatore'):'svincolato: contratto con il giocatore'), `${esc(p.fn)} ${esc(p.ln)}`, `${ROLE_NAME[p.r]} · ${p.age} anni · ${from?clubLink(from.id):'svincolato'}`, 'Valore di mercato', kcr(value(p))+' cr', [p.r+' · '+ROLE_NAME[p.r], 'Valutazione '+ovrTxt(p)])}
   <p class="muted">${ROLE_NAME[p.r]}, ${p.age} anni · valutazione ${ovrTxt(p)} · valore di mercato ${kcr(value(p))} cr · stipendio attuale ${fmt(p.wg)} a giornata.${n.fee?` Prezzo concordato con il club: <b>${kcr(n.fee)} cr</b>.`:''}</p>
   <div class="neg-sides">
     <div class="side"><p class="eyebrow">Il presidente</p><p class="strong">${esc(t.n)}</p><p class="muted">Clima della società: ${morLevel(cl)}</p>${bar(cl,20,'mor')}<p class="muted">Cassa ${kcr(t.cash)} · stipendi/ricavi ${Math.round(wageRatio(t)*100)}%</p></div>
     <div class="side"><p class="eyebrow">${ph==='club'?'Il club che vende':'Il giocatore'}</p>${ph==='club'?`<p class="strong">${esc(from.n)}</p>`:''}<p class="muted">Pazienza</p><span class="bar pat ${pb<35?'warn':''}"><span style="width:${pb}%"></span></span>
       ${from?`<p class="muted" style="margin-top:6px">Morale del giocatore nella sua squadra: <b>${morLevel(p.mor)}</b></p>${bar(p.mor,20,'mor '+(p.mor<9?'warn':''))}`:''}<p class="muted small">Il morale è l'unico indizio: chi è scontento dove sta costa meno e viene più volentieri. Anche il clima della nostra società conta.</p></div>
   </div>
   <ul class="neg-chat">${hist||'<li class="sys">Fai la tua offerta al club.</li>'}</ul>
   ${open?`<div class="neg-form"><label>${ph==='club'?'Offerta per il cartellino':'Stipendio offerto'} <b id="neg-vt">${ph==='club'?kcr(def)+' cr':fmt(def)+' cr a giornata'}</b></label>
      <input type="range" id="neg-v" min="${lo}" max="${hi}" step="${step}" value="${def}" data-unit="${ph}">
      ${ph==='player'?`<label>Una tantum alla firma <select id="neg-oo">${[0,10000,25000,50000,100000].map(x=>`<option value="${x}">${x?kcr(x)+' cr':'nessuna'}</option>`).join('')}</select></label>`:''}
      <div class="row"><button class="btn" data-act="buyprop">${ph==='club'?'Offri':'Proponi'}</button><button class="btn ghost" data-act="buyacc">Accetta la richiesta: ${ph==='club'?kcr(n.c)+' cr':fmt(n.c)+' cr a giornata'}</button><button class="btn ghost" data-act="buyquit">Rinuncia</button></div></div>`:''}
   ${st?`<div class="neg-stop"><p class="strong">${ph==='club'?'Il club':'Il giocatore'} non tratta più: decidi.</p><div class="row"><button class="btn" data-act="buyacc">Accetta: ${ph==='club'?kcr(n.c)+' cr':fmt(n.c)+' cr a giornata'}</button><button class="btn ghost" data-act="buyquit">Rinuncia</button></div></div>`:''}
   ${!open&&!st?`<p class="strong">${esc(r.out||'Trattativa chiusa.')}</p><div class="row"><button class="btn" data-act="negclose">Chiudi</button></div>`:''}
  </div></div>`;
}
/* ---------- richieste al presidente (Scrivania) e offerte per i tuoi giocatori (Mercato › Trattative) ---------- */
function reqBtns(q){
  const btn=(c,l,cls='')=>`<button class="btn small ${cls}" data-act="req" data-id="${q.id}" data-c="${c}">${l}</button>`;
  const tb=`<button class="btn small ghost" data-act="negopen" data-id="${q.id}">${q.neg?'Riprendi la trattativa':'Tratta'}</button>`;
  return q.kind==='offerta' ? btn('acc','Accetta l\'offerta')+tb+btn('rif','Rifiuta','ghost')
                            : btn('acc',q.kind==='rinforzo'?'Prometti':'Accetta')+tb+btn('rif','Rifiuta','ghost');
}
function reqHint(q){ const left=Math.max(0,14-G.md);
  return q.kind==='rinnovo' ? 'Se rifiuti o la trattativa fallisce, a fine contratto se ne va gratis.'
       : q.kind==='aumento' ? `Costo: +${fmt((q.nw-q.old)*left)} cr fino a fine stagione.`
       : q.kind==='premio' ? 'Si paga solo se vinci. Promesso: morale su; negato: morale giù.'
       : q.kind==='obiettivo' ? 'Si paga a fine stagione solo se l\'obiettivo arriva.'
       : q.kind==='rinforzo' ? 'Se prometti e non compri entro la scadenza, l\'allenatore e la squadra ci restano male. Trattando puoi chiedere un livello più basso.'
       : 'Se i club si accordano decide il giocatore, e non sai cosa sceglierà: il suo morale è l\'unico indizio. Se rifiuti e lui voleva andare, ci resta male.'; }
/* una richiesta scade se non ha risposta prima di giocare la giornata q.due+1 */
const reqExpiring = q=>q.due<=G.md;
function reqItem(q){ const p=q.pid!=null?G.P[q.pid]:null;
  return `<li class="rq${focusReq===q.id?' flash':''}" id="rq-${q.id}"><div><p class="eyebrow">${REQ_KIND[q.kind]}${p?' · '+esc(p.fn+' '+p.ln):''} · ${reqExpiring(q)?'<b class="warn-t">scade: rispondi prima di giocare la giornata '+(q.due+1)+'</b>':'rispondi entro la giornata '+(q.due+1)}</p><p>${esc(q.txt)}</p><p class="muted">${reqHint(q)}</p></div><div class="rq-b">${reqBtns(q)}</div></li>`; }
function reqsHTML(){
  const t=G.T[0], S=successF(t);
  const reqs=(G.req||[]).filter(q=>q.team===0 && q.st==='open' && q.kind!=='acquisto' && q.kind!=='offerta').sort((a,b)=>a.due-b.due);
  return `<section class="card" id="reqs"><p class="eyebrow">Richieste in attesa</p><p class="muted">Chi vince chiede di più, chi è in difficoltà si accontenta di meno: oggi la squadra è ${S>0.45?'<b>in gran forma</b>, le richieste sono alte':S>0.1?'<b>in buona forma</b>':S<-0.2?'<b>in difficoltà</b>, le richieste sono basse':'<b>nella media</b>'}. Ogni scelta pesa sul morale e sui conti.</p><ul class="rql">${reqs.length?reqs.map(reqItem).join(''):'<p class="empty">Nessuna richiesta in attesa.</p>'}</ul></section>`;
}
/* ---------- Società › Conti ---------- */
/* fascia comune di Società: stagione, giornata, club e clima (dati già nella testata) */
function socChips(){ const t=G.T[0]; return ['Stagione '+G.season,'G'+G.md+' / 14',esc(t.n),'<span class="gold-t">Clima '+morLevel(clubClimate(t))+'</span>']; }
/* ciambella del patrimonio (solo disegno: strutture, cartellini e cassa positiva; i debiti a parte) */
function donutHTML(parts, mid, lbl){ const tot=parts.reduce((s,p)=>s+Math.max(0,p[1]),0)||1, C=2*Math.PI*42; let off=0;
  const seg=parts.map(([,v,c])=>{ const L=Math.max(0,v)/tot*C, h=`<circle r="42" cx="60" cy="60" fill="none" stroke="var(${c})" stroke-width="16" stroke-dasharray="${L.toFixed(2)} ${(C-L).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`; off+=L; return h; }).join('');
  return `<div class="ev-donut"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(lbl)}"><g transform="rotate(-90 60 60)"><circle r="42" cx="60" cy="60" fill="none" stroke="var(--ev-border)" stroke-width="16"/>${seg}</g></svg><div class="ev-donut-c"><b>${mid}</b><small>valore totale</small></div></div>`; }
function vConti(){
  const t=G.T[0], f=finInit(t), r=wageRatio(t), lv=ratioLevel(r), arr=arrears(t), debt=bankDebt(t);
  const cats=(o)=>Object.entries(o).sort((a,b)=>b[1]-a[1]);
  const inc=cats(f.sea.inc), exp=cats(f.sea.exp), ti=inc.reduce((s,x)=>s+x[1],0), te=exp.reduce((s,x)=>s+x[1],0);
  const left=Math.max(0,14-G.md), proj=t.cash+left*(roundIncome(t)-wageBill(t)-staffCost(t))-f.loans.reduce((s,l)=>s+l.rate*Math.min(l.left,left),0);
  const chk=[0,1,2,3,4].map(k=>{ const c=f.checks.find(x=>x.k===k&&x.s===G.season), when=k<4?`dopo la giornata ${CHECKS[k]}`:'a fine stagione';
      return `<li><span>${CHECK_LBL[k]}</span><span class="muted">${when}</span><b class="${c?(c.ok?'ok':'ko'):''}">${c?(c.ok?'in regola':c.excl?'esclusione':'−'+c.pts+' punti'+(c.next?' (prossima stagione)':'')):'—'}</b></li>`; }).join('');
  const mx=Math.max(ti,te,1);
  return pageHead('Società · conti','La salute finanziaria',`Situazione economica · giornata ${G.md} di 14`,{chips:socChips()})
  +kpiHTML([['Cassa',`<span class="${t.cash<0?'bad':''}">${kcr(t.cash)} cr</span>`,'','hi'],['Valore della società',`<span class="${netValue(t)<0?'bad':''}">${kcr(netValue(t))} cr</span>`],['Stipendi e ricavi',`<span class="sem ${lv}">${Math.round(r*100)}%</span>`],['Stipendi arretrati',kcr(arr),arr>0?'Da pagare prima del prossimo controllo.':'Tutti pagati.',arr>0?'bad':''],
     ['Debiti con la banca',kcr(debt),(f.loans.length?f.loans.map(l=>`${l.left} rate da ${fmt(l.rate)}`).join(' · '):'Nessun finanziamento.')+(f.ins?` · insoluto ${kcr(f.ins)}`:''),f.ins?'bad':''],['Previsione a fine stagione',kcr(proj)+' cr','saldo di cassa previsto'],['Popolarità',Math.round(t.pop)+'/100','tifosi della società'],['Penalizzazione',f.pen?'−'+f.pen+' pt':'Nessuna',f.penNext?'Già maturati −'+f.penNext+' punti per la prossima stagione.':'Stipendi in regola ai controlli.',f.pen?'bad':'']],'ev-kpis4')
  +`<section class="ev-grid2">${patrimonioHTML(t)}
   <div class="card ev-panel"><p class="ev-kick">Quadro della stagione ${G.season}</p><h2 class="ev-ptitle">Il saldo della gestione</h2>
    <div class="ev-flow"><div><span>Entrate</span><b>${fmt(ti)} cr</b></div><span class="ev-flowbar"><span style="width:${(ti/mx*100).toFixed(1)}%"></span></span>
    <div><span>Uscite</span><b>${fmt(te)} cr</b></div><span class="ev-flowbar out"><span style="width:${(te/mx*100).toFixed(1)}%"></span></span></div>
    <p class="strong">Saldo della stagione: <span class="${ti-te<0?'bad':''}">${kcr(ti-te)}</span></p><p class="muted small">Barre in proporzione alla voce più grande. Il confronto con il preventivo è in Società › Bilancio.</p></div></section>
  <section class="ev-grid2">
   <div class="card ev-panel"><h2 class="ev-ptitle">Entrate della stagione</h2><table class="bil"><thead><tr><th>Voce</th><th class="num">cr</th></tr></thead><tbody>${inc.map(([k,v])=>`<tr><td>${esc(k)}</td><td class="num">${fmt(v)}</td></tr>`).join('')||'<tr><td class="muted">—</td><td></td></tr>'}<tr class="tot"><td>Totale</td><td class="num">${fmt(ti)}</td></tr></tbody></table></div>
   <div class="card ev-panel"><h2 class="ev-ptitle">Uscite della stagione</h2><table class="bil"><thead><tr><th>Voce</th><th class="num">cr</th></tr></thead><tbody>${exp.map(([k,v])=>`<tr><td>${esc(k)}</td><td class="num">${fmt(v)}</td></tr>`).join('')||'<tr><td class="muted">—</td><td></td></tr>'}<tr class="tot"><td>Totale</td><td class="num">${fmt(te)}</td></tr></tbody></table></div>
  </section>
  <section class="ev-grid2">
   <div class="card ev-panel"><h2 class="ev-ptitle">Come leggere «Stipendi e ricavi»</h2><p class="big sem ${lv}">${Math.round(r*100)}%</p><p class="muted">Stipendi e staff (${kcr(wageBill(t)+staffCost(t))} a giornata) rispetto alle entrate medie (${kcr(roundIncome(t))} a giornata). Sotto il 70% i conti sono sani; sopra l'85% ogni richiesta accettata è un rischio e se la cassa finisce gli stipendi non vengono pagati.</p></div>
   <div class="card ev-panel"><h2 class="ev-ptitle">Controlli sugli stipendi</h2><p class="muted">Come in Serie A: a ogni controllo gli stipendi devono essere pagati. Chi non è in regola perde almeno 2 punti, più 2 per ogni periodo precedente ancora non pagato. Al 3° controllo, con più periodi non pagati, scatta l'esclusione dal campionato. Le penalità del 4° controllo e di fine stagione si scontano la stagione successiva.</p><ul class="chk">${chk}</ul></div>
  </section>
  <section class="card ev-panel"><h2 class="ev-ptitle">Ultime decisioni e movimenti</h2><ul class="news">${f.hist.slice(0,12).map(h=>`<li><span class="md">G${h.md}</span>${esc(h.t)}</li>`).join('')||'<li class="muted">Ancora nessuna.</li>'}</ul></section>`;
}
function vTaccuino(){
  const ids=new Set([...Object.keys(G.note).filter(k=>G.note[k]),...Object.keys(G.seen).filter(k=>G.seen[k].f>0)]);
  const list=[...ids].map(id=>G.P[id]).filter(p=>p&&!p.retired).sort((a,b)=>(G.seen[b.id]?.f||0)-(G.seen[a.id]?.f||0));
  return pageHead('Mercato · appunti','Taccuino del presidente',`${list.length?list.length+(list.length===1?' giocatore':' giocatori')+' segnati':'Ancora nessun giocatore'} · le giocate di classe viste in partita`)
  +`<section class="card ev-panel"><div class="head"><h2 class="ev-ptitle">Giocatori seguiti</h2><p class="muted">Le giocate di classe le noti solo nelle partite che guardi. Un lampo può essere fortuna: conta chi si ripete partita dopo partita.</p></div>
  ${list.length?`<div class="tw"><table class="ev-ptab tacc"><thead><tr><th>R</th><th>Giocatore</th><th class="num">Età</th><th>Squadra</th><th class="num">Giocate di classe</th><th class="num">Azioni viste</th><th class="num">Partite viste</th><th>Potenziale</th><th class="num">Valore</th></tr></thead><tbody>
  ${list.map(p=>{const s=G.seen[p.id]||{f:0,a:0,m:0}; return `<tr data-act="sheet" data-pid="${p.id}"><td class="mh">${roleTag(p.r)}</td><td class="nm pc">${plCell(p,nameBtn(p),`${ROLE_NAME[p.r]} · ${p.age} anni · ${p.team==null?'svincolato':p.team===0?'tuo':esc(G.T[p.team].n)}`)}</td><td class="num mh">${p.age}</td><td class="mh">${p.team==null?'Svincolato':p.team===0?'<b>Tuo</b>':clubLink(p.team)}</td><td class="num gold strong mv" data-l="Giocate">${s.f}</td><td class="num" data-l="Azioni viste">${s.a}</td><td class="num" data-l="Partite">${s.m||0}</td><td data-l="Potenziale">${starsHTML(p)}</td><td class="num" data-l="Valore">${kcr(value(p))}</td></tr>`;}).join('')}</tbody></table></div>`
  :`<p class="empty">Ancora vuoto. Guarda una partita: quando un giocatore fa una giocata di classe, compare qui. Puoi anche aggiungere giocatori a mano dalla loro scheda.</p>`}</section>`;
}
Object.assign(VIEWS,{'squadra/rosa':vRosa,'squadra/allenatore':vAllenatore,'squadra/spogliatoio':vSpogliatoio,'mercato/cerca':vMercato,'mercato/taccuino':vTaccuino,'lega/classifica':vClassifica,'lega/arbitri':vArbitri,'societa/conti':vConti});

function vSheet(){
  const p=G.P[sheetPid]; if(!p) return '';
  const mine=isMine(p), n=obsN(p), s=G.seen[p.id]||{f:0,a:0,m:0};
  const grp=ATTR_GROUPS.filter(([g])=>g!=='Portiere'||p.r==='P'); if(p.r==='P') grp.unshift(grp.pop());
  const footTxt={D:'destro',S:'sinistro',A:'ambidestro'}[p.foot]||'destro';
  const at=grp.map(([g,ks])=>`<div class="sh-grp"><p class="eyebrow">${g}</p>`+ks.map(k=>{ const v=attrView(p,k);
    return `<div class="arow"><span title="${esc(ATTR_HELP[k]||'')}">${ATTR_LABEL[k]}</span>${v?`<span class="rng"><span class="r" style="left:${(v[0]-1)/19*100}%;width:${Math.max(2,(v[1]-v[0])/19*100)}%"></span></span><span class="num">${v[0]===v[1]?v[0]:v[0]+'–'+v[1]}</span>`:'<span class="rng"></span><span class="num muted">?</span>'}</div>`; }).join('')+'</div>').join('');
  const pv=potView(p);
  const action = mine
    ? `<button class="btn ghost" data-act="sell" data-pid="${p.id}">Cerca un acquirente</button>`
    : `<button class="btn" data-act="buyopen" data-pid="${p.id}">${(G.req||[]).some(q=>q.kind==='acquisto'&&q.pid===p.id&&q.st==='open')?'Riprendi la trattativa':p.team==null?'Proponi un contratto':'Apri la trattativa'}</button>`;
  const capt=p.team!=null&&G.T[p.team].cap===p.id?'Capitano':p.team!=null&&G.T[p.team].vcap===p.id?'Vicecapitano':'';
  const row=(k,v)=>`<div class="ev-kv"><span>${k}</span><strong>${v}</strong></div>`;
  return `<div class="sh-in" role="dialog" aria-label="Scheda di ${esc(p.fn)} ${esc(p.ln)}">
   <button class="x" data-act="close" aria-label="Chiudi">×</button>
   <div class="sh-hero"><span class="sh-face" aria-hidden="true">${plFace(p)}</span><div class="sh-id"><p class="eyebrow">${mine?'Squadra':'Mercato'} · scheda del giocatore</p><h2>${esc(p.fn)} ${esc(p.ln)}</h2>
    <p class="sh-sub">${ROLE_NAME[p.r]} · ${p.age} anni · ${p.team==null?'svincolato':clubLink(p.team)}</p><p class="sh-tags"><span class="ev-pill">${p.r} · ${ROLE_NAME[p.r]}</span>${capt?`<span class="ev-pill">${capt}</span>`:''}</p></div></div>
   ${p.inj>0?`<p class="badge-s inj">Infortunato: fuori ancora ${p.inj} ${p.inj>1?'giornate':'giornata'}</p>`:''}${p.sq>0?'<p class="badge-s sq">Squalificato per la prossima giornata</p>':''}
   <div class="sh-top"><div><p class="eyebrow">Valutazione</p><p class="big">${ovrTxt(p)}</p></div><div><p class="eyebrow">Potenziale</p>${starsHTML(p)}<p class="muted">${pv?'affidabilità '+pv[2]:'non valutato'}</p></div><div><p class="eyebrow">Valore</p><p class="big">${kcr(value(p))}</p></div></div>
   <div class="sh-btns"><button class="btn ghost" data-act="obs" data-pid="${p.id}" ${n>=3?'disabled':''}>${n>=3?'Relazione completa':'Manda l\'osservatore ('+G.scoutLeft+' rimaste)'}</button><button class="btn ghost" data-act="note" data-pid="${p.id}">${G.note[p.id]?'Togli dal taccuino':'Metti nel taccuino'}</button></div>
   <section class="sh-sec"><h3>Caratteristiche</h3><p class="muted small">Scala 1–20${mine?'':'; la banda si stringe con le relazioni dell\'osservatore'}.</p><div class="sh-attrs">${at}</div></section>
   <section class="sh-sec"><h3>Profilo</h3><div class="phys">${row('Altezza',(p.h||'–')+' cm')}${row('Piede preferito',cap1(footTxt))}${row('Tipo di giocatore',mine||n?esc(p.prof2||'–'):'<span class="muted">lo dirà l\'osservatore</span>')}${row('Carattere',mine||n?esc(character(p).join(' · ')):'<span class="muted">lo dirà l\'osservatore</span>')}</div>
   ${mine?`<p class="eyebrow">Morale</p><p><b>${cap1(morLevel(p.mor))}</b> <span class="muted">(${p.mor.toFixed(1).replace('.',',')}/20)</span> ${bar(p.mor,20,'mor '+(p.mor<9?'warn':''))}</p>${p.morC&&p.morC.length?`<ul class="morc">${p.morC.slice(0,4).map(c=>`<li><span class="${c.d>0?'up':'dn'}">${c.d>0?'▲':'▼'}</span> ${esc(c.t)} <span class="muted">· G${c.md}</span></li>`).join('')}</ul>`:'<p class="muted">Nessuna novità recente.</p>'}`:''}
   <p class="eyebrow">Visto da te in campo</p><p>${s.a?`<span class="gold strong">${s.f}</span> giocate di classe su ${s.a} azioni viste, in ${s.m||0} partite.`:'<span class="muted">Non l\'hai ancora visto giocare.</span>'}</p></section>
   <section class="sh-sec"><h3>${mine?'Contratto e carriera':'Carriera'}</h3>${mine?row('Stipendio per giornata',fmt(p.wg)+' cr')+row('Durata residua',p.ct+(p.ct===1?' anno':' anni')):''}
   ${statsHTML(p)}</section>
   ${mine&&p.peg?'<p class="badge-s peg">In pegno alla banca: si vende solo con il suo ok, a un prezzo vicino al valore, e il ricavato rimborsa il finanziamento.</p>':''}<div class="sh-act">${action}</div></div>`;
}

/* scheda del giocatore: stagione in corso, carriera e stagioni passate (presenze e gol sono pubblici; i voti si vedono nelle pagelle) */
function statsHTML(p){ const S=seaStat(p), C=carStat(p), H=(p.sh||[]).slice().reverse(), vt=(p.rts||[]).filter(x=>x!=null);
  const club=c=>c==null?'<span class="muted">svincolato</span>':G.T[c]?clubLink(c):'–';
  return `<div class="stx"><div><p class="eyebrow">Stagione ${G.season}</p><p><b>${S.a}</b> presenze · <b>${S.g}</b> gol · media voto <b>${v10(S.v)}</b></p></div><div><p class="eyebrow">Carriera</p><p><b>${C.a}</b> presenze · <b>${C.g}</b> gol · media voto <b>${v10(C.v)}</b></p></div></div>
   <p class="muted small">Ultimi voti: ${vt.length?vt.map(x=>String(x).replace('.',',')).join(' · '):'–'}</p>
   ${H.length?`<div class="tw"><table class="tab sht"><thead><tr><th>Stagione</th><th>Club</th><th class="num">Pres.</th><th class="num">Gol</th><th class="num">Media</th></tr></thead><tbody>${H.map(h=>`<tr class="nohov"><td>${h[0]}</td><td>${club(h[1])}</td><td class="num">${h[2]}</td><td class="num">${h[3]}</td><td class="num">${v10(h[4])}</td></tr>`).join('')}</tbody></table></div>`:''}`; }

/* icone (0.4.2.4, G1a): disegnate come nella Scrivania 013 di Evivora-scambio (tratto, colore del testo) */
const ICO_P={
  scrivania:'<path d="m3 11 9-8 9 8v10h-7v-7h-4v7H3z"/>',
  lega:'<path d="M7 3h10v6c0 8-10 8-10 0V3ZM7 5H3v3c0 3 2 5 6 5M17 5h4v3c0 3-2 5-6 5M12 15v5m-6 1h12"/>',
  squadra:'<circle cx="9" cy="7" r="3"/><circle cx="18" cy="8" r="2"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m1-10a5 5 0 0 1 5 5v5h-4"/>',
  mercato:'<path d="M3 7h18m-4-4 4 4-4 4M21 17H3m4-4-4 4 4 4"/>',
  societa:'<path d="M2 21h20M5 21V10l7-5 7 5v11M9 21v-8h6v8M4 7h16"/>',
  chart:'<path d="M3 21h18M5 18v-7h4v7m2 0V5h4v13m2 0V9h4v9"/>',
  coins:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 4 16 4 16 0V5M4 11v6c0 4 16 4 16 0v-6"/>',
  wages:'<path d="M8 4v15m-4-5 4 5 4-5M16 20V5m-4 5 4-5 4 5"/>',
  clipboard:'<rect x="5" y="4" width="16" height="18" rx="2"/><path d="M9 4V2h8v2M8 10l2 2 4-4m-6 9h9"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18M7 15h4"/>',
  news:'<path d="M5 2h11l4 4v16H5zM16 2v5h4M8 11h9m-9 4h9m-9 4h6"/>',
  star:'<path d="m12 2 3.2 6.7 7.3.8-5.4 5.2 1.3 7.2L12 18.5 5.6 22l1.3-7.3-5.4-5.2 7.3-.8z"/>',
  ball:'<circle cx="12" cy="12" r="10"/><path d="m12 6 4 3-1.5 5H9.5L8 9Zm0 0V2M8 9 3 8m6 6-3 6m8-6 4 6m-2-11 5-1"/>',
  check:'<path d="m3 12 6 6L21 5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  aid:'<rect x="2" y="5" width="20" height="16" rx="3"/><path d="M9 5V3h6v2M12 9v8m-4-4h8"/>',
  mood:'<circle cx="12" cy="12" r="9"/><path d="M8 14q4 4 8 0M9 9h.01M15 9h.01"/>',
  flag:'<path d="M5 21V4m0 1h11l-2 4 2 4H5"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  stadio:'<ellipse cx="12" cy="8" rx="9" ry="4"/><path d="M3 8v8c0 2.2 4 4 9 4s9-1.8 9-4V8M7 11.5v8M17 11.5v8M12 12v8"/>',
  centro:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M3 12h18"/><circle cx="12" cy="12" r="3"/>',
  giovani:'<path d="m12 3 3 6 6 .9-4.5 4.3 1 6.3L12 17.6 6.5 20.5l1-6.3L3 9.9 9 9z"/>'
};
const ico=(k,c)=>`<svg class="${c||'ev-ico'}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">${ICO_P[k]||''}</svg>`;
const AREA_ICON={}; ['scrivania','lega','squadra','mercato','societa'].forEach(k=>AREA_ICON[k]=ico(k));
/* simbolo del marchio (corona della 020 di Evivora-scambio), con i colori del tema */
const LOGO_SVG='<svg class="logo" viewBox="0 0 80 80" aria-hidden="true"><rect x="1" y="1" width="78" height="78" rx="18" fill="var(--ev-sidebar-end)"/><path d="M11 43 8 21 24 31 40 12 56 31 72 21 69 43Z" fill="var(--ev-brand-gold)" stroke="var(--ev-gold-text)" stroke-width="1.6" stroke-linejoin="round"/><path d="M13 47h54v9H13z" fill="var(--ev-brand-gold)"/><circle cx="40" cy="35" r="4" fill="var(--ev-sidebar-end)"/><path d="M18 63H62" stroke="var(--ev-brand-gold)" stroke-width="5" stroke-linecap="round"/></svg>';
/* colori grafici di un club: stemma (stemmi.js), maglia (maglie.js) e maglia dei volti (volti.js) partono tutti da qui,
   così sono sempre uguali tra loro e uguali al visore. Primario = colore del club, secondario chiaro o scuro per il contrasto. */
function clubInit(n){ const w=String(n).split(/\s+/).filter(Boolean); return (w.length>1?w.map(x=>x[0]).join(''):String(n).slice(0,3)).slice(0,3).toUpperCase(); }
function clubLum(hex){ const n=parseInt(String(hex).slice(1),16); return (0.299*(n>>16&255)+0.587*(n>>8&255)+0.114*(n&255))/255; }
function clubArt(id){ const t=G.T[id]; return {primario:t.c, secondario:clubLum(t.c)>0.55?'var(--ev-sidebar-end)':'var(--ev-chalk)', iniziali:clubInit(t.n)}; }
function crestHTML(id){ const a=clubArt(id);
  if(typeof window.stemmaSVG!=='function') return `<span class="chip big" style="--c:${a.primario}"></span>`;
  return window.stemmaSVG(id+1,{colori:{primario:a.primario, secondario:a.secondario}, iniziali:a.iniziali}); }
/* volto di una persona del gioco (volti.js): seme dall'id, colori del club per la maglia; solo disegno */
function faceHTML(seed, o){ if(typeof window.faceSVG!=='function') return ''; return window.faceSVG(seed, o); }

/* ---------- schermate (0.4.2.5, G1b): fascia del titolo, riquadri dei numeri, giocatore con il volto ----------
   solo disegno: leggono i dati di G senza cambiarli. Stile come la 017 e la 022b di Evivora-scambio. */
function pageHead(over, title, sub, o){ o=o||{}; const id=o.club===undefined?0:o.club;
  return `<section class="ev-titleband${o.cls?' '+o.cls:''}"><div class="ev-tb-text"><p class="ev-eyebrow">${over}</p><h1>${title}</h1>${sub?`<p class="ev-tb-sub">${sub}</p>`:''}${o.chips&&o.chips.length?`<div class="ev-chips">${o.chips.map(c=>`<span class="ev-chip">${c}</span>`).join('')}</div>`:''}</div>${o.right||''}${id!=null?`<span class="ev-headmark" aria-hidden="true">${crestHTML(id)}</span>`:''}</section>`; }
/* riquadri dei numeri: [etichetta, valore, nota, classe] */
function kpiHTML(list, cls){ return `<div class="ev-kpis${cls?' '+cls:''}">${list.filter(Boolean).map(([l,v,n,c])=>`<div class="ev-kpi${c?' '+c:''}"><small>${l}</small><b>${v}</b>${n?`<span>${n}</span>`:''}</div>`).join('')}</div>`; }
const cap1 = s=>String(s).replace(/^./,c=>c.toUpperCase());
/* volto del giocatore (stesso seme della Scrivania), maglia con i colori del suo club; tenuto in memoria per non ridisegnarlo */
const FACE_C={};
function plFace(p){ const tm=p.team!=null&&G.T[p.team]?p.team:null, a=tm!=null?clubArt(tm):{primario:'#68736b',secondario:'var(--ev-chalk)'}, k=p.id+'|'+p.age+'|'+a.primario;
  return FACE_C[k]||(FACE_C[k]=faceHTML(p.id*7919+13,{eta:p.age,ruolo:'giocatore',colori:{primario:a.primario,secondario:a.secondario}})); }
/* club con lo stemma (Classifica, risultati, marcatori) */
function clubCell(id, sub){ return `<div class="ev-clubcell"><span class="ev-crest-s" aria-hidden="true">${crestHTML(id)}</span><div><b>${clubLink(id)}</b>${sub?`<small>${sub}</small>`:''}</div></div>`; }
/* disegno astratto del modulo dell'allenatore (es. 4-2-3-1): posizioni solo illustrative, dal campo «modulo preferito» */
function formSVG(mod, c){ const L=String(mod||'').split('-').map(Number).filter(n=>n>0&&n<7); if(!L.length) return '';
  const H=150, W=104, rows=L.length, dots=[[W/2,H-12]];
  L.forEach((n,i)=>{ const y=H-34-i*((H-56)/Math.max(1,rows-1||1)); for(let k=0;k<n;k++) dots.push([W*(k+1)/(n+1),rows===1?H/2:y]); });
  return `<svg class="ev-formsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Modulo ${esc(mod)}"><rect x="1" y="1" width="${W-2}" height="${H-2}" rx="4" fill="var(--ev-pitch)" stroke="var(--ev-chalk)" stroke-width="1.2"/><path d="M1 ${H/2}H${W-1}M${W/2-18} 1v14h36V1M${W/2-18} ${H-1}v-14h36v14" fill="none" stroke="var(--ev-chalk)" stroke-width="1" opacity=".75"/><circle cx="${W/2}" cy="${H/2}" r="11" fill="none" stroke="var(--ev-chalk)" stroke-width="1" opacity=".75"/>${dots.map(([x,y],i)=>`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${i?c:'var(--ev-brand-gold)'}" stroke="var(--ev-chalk)" stroke-width="1.4"/>`).join('')}</svg>`; }
function plCell(p, inner, small){ return `<div class="ev-athlete"><span class="ev-face" aria-hidden="true">${plFace(p)}</span><div class="ev-ath-t"><b>${inner||nameBtn(p)}</b><small>${small!=null?small:ROLE_NAME[p.r]+' · '+p.age+' anni'}</small></div></div>`; }

/* ---------- tema (0.4.2.4, G1a): un solo sistema per tutto il gioco ----------
   di base segue il dispositivo (prefers-color-scheme); il pulsante della testata (e quello del visore) mette data-theme
   sulla pagina e lo ricorda in localStorage presidente-pref-tema. shell.html lo applica già prima dello stile. */
const THEME_KEY='presidente-pref-tema';
function themeNow(){ const d=document.documentElement.dataset.theme; if(d==='light'||d==='dark') return d; try{ return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'; }catch(_){ return 'light'; } }
function themeLbl(){ return themeNow()==='dark' ? 'Tema chiaro' : 'Tema scuro'; }
function themeBtn(){ return `<button class="tema" data-act="tema" id="theme-btn" aria-label="${themeLbl()}" title="${themeLbl()}">${ico(themeNow()==='dark'?'sun':'moon')}</button>`; }
function themePaint(){ const b=$('#theme-btn'); if(b) b.outerHTML=themeBtn(); const v=$('#v-tema'); if(v) v.textContent=themeLbl(); if(typeof viewer!=='undefined' && viewer && typeof draw==='function') draw(); }
function themeToggle(){ const t=themeNow()==='dark'?'light':'dark'; document.documentElement.dataset.theme=t; try{ localStorage.setItem(THEME_KEY,t); }catch(_){} themePaint(); }
(function(){ try{ const t=localStorage.getItem(THEME_KEY); if(t==='light'||t==='dark') document.documentElement.dataset.theme=t; }catch(_){}
  try{ matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{ if(!document.documentElement.dataset.theme) themePaint(); }); }catch(_){} })();
/* pulsante principale (testata e Scrivania): gioca la giornata, oppure prima convalida il preventivo o scegli la nuova società */
function playBtn(cls){ const t=G.T[0], end=G.md>=G.sched.length, c='btn go'+(cls?' '+cls:'');
  return G.fired?`<button class="${c}" disabled>Scegli la nuova società</button>`:G.md===0&&needBudget(t)?`<button class="${c}" data-act="go" data-a="societa" data-s="bilancio">Convalida il preventivo</button>`:`<button class="${c}" data-act="advance">${end?'Chiudi la stagione':'Gioca la giornata '+(G.md+1)}</button>`; }
function render(){
  const on=!!G; $('#top').hidden=!on; $('#tabs').hidden=!on; $('#subtabs').hidden=!on; document.body.classList.toggle('ingame',on);
  if(!G){ $('#view').innerHTML = startScreen(); $('#sheet').hidden=true; ['#negov','#modal'].forEach(s=>{ const x=$(s); if(x) x.remove(); }); return; }
  if(NAV.first) navStart();
  if(!AREAS[area] || !VIEWS[area+'/'+sub]){ area='scrivania'; sub='home'; }
  const t=G.T[0], pos=standings().findIndex(x=>x.id===0)+1;
  const end=G.md>=G.sched.length;
  const ms=activeMissions(t), mu=ms.filter(m=>m.kind==='rinforzo'&&m.due-G.md<=1);
  $('#top').innerHTML = `<div class="brand"><span class="wm">${LOGO_SVG}EVIVORA</span><span class="ver" title="Versione del gioco">v${VERSION}</span><button class="club link" data-act="club" data-id="0" title="Il profilo pubblico del tuo club"><span class="crest" aria-hidden="true">${crestHTML(0)}</span><span class="cn">${esc(t.n)}</span></button></div>
   <div class="stat"><span>Stagione ${G.season}</span><span>Giornata ${G.md}/14</span><span>${pos}° posto</span><span class="cash">${kcr(t.cash)} cr</span><span class="clima" title="Clima della società: morale medio di giocatori e allenatore">Clima <b>${morLevel(clubClimate(t))}</b> ${bar(clubClimate(t),20,'mor '+(clubClimate(t)<9?'warn':''))}</span></div>
   <div class="acts">${t.ult&&t.ult.st==='on'?`<button class="mchip urg" data-act="go" data-a="societa" data-s="banca" title="Ultimatum della banca">⚠ Ultimatum della banca</button>`:t.own.bank>=25?`<button class="mchip" data-act="go" data-a="societa" data-s="banca" title="Quote della banca">Banca ${fmtV(t.own.bank)}%</button>`:''}${ms.length?`<button class="mchip ${mu.length?'urg':''}" data-act="go" data-a="scrivania" title="Impegni in corso">⚑ ${mu.length?'Impegno in scadenza':ms.length===1?'1 impegno in corso':ms.length+' impegni in corso'}</button>`:''}
   ${playBtn('')}${themeBtn()}<button class="more" data-act="menu" aria-label="Altre opzioni" title="Altre opzioni">⋯</button></div>`;
  const nb=secBadge();
  $('#tabs').innerHTML = Object.entries(AREAS).map(([k,A])=>`<button class="${area===k?'on':''}" data-act="go" data-a="${k}"${area===k?' aria-current="page"':''}>${AREA_ICON[k]}<span class="tl">${A.n}</span>${k==='scrivania'&&nb?`<span class="tabn" title="Cose bloccanti o urgenti">${nb}</span>`:''}</button>`).join('');
  const subs=AREAS[area].subs, st=$('#subtabs');
  st.hidden=subs.length<2;
  st.innerHTML = subs.length<2?'':subs.map(([k,l])=>`<button class="${sub===k&&clubView==null?'on':''}" data-act="go" data-a="${area}" data-s="${k}"${sub===k&&clubView==null?' aria-current="page"':''}>${l}${area==='mercato'&&k==='trattative'&&openDeals().length?` <span class="tabn n">${openDeals().length}</span>`:''}</button>`).join('');
  $('#view').innerHTML = clubView!=null ? vProfile(clubView) : VIEWS[area+'/'+sub]();
  { let ov=$('#negov'); const h=(G.fired&&clubView==null)?vFired():(bnegOn&&G.bneg)?vBankNeg():negId?vNeg():''; if(h){ if(!ov){ ov=document.createElement('div'); ov.id='negov'; document.body.appendChild(ov); } ov.innerHTML=h; const ch=ov.querySelector('.neg-chat'); if(ch) ch.scrollTop=ch.scrollHeight; } else if(ov) ov.remove(); }
  { let mo=$('#modal'); const h=modal?vModal():''; if(h){ if(!mo){ mo=document.createElement('div'); mo.id='modal'; document.body.appendChild(mo); } mo.innerHTML=h; } else if(mo) mo.remove(); }
  const sh=$('#sheet'); if(sheetPid!=null){ sh.innerHTML=vSheet(); sh.hidden=false; } else { sh.hidden=true; sh.innerHTML=''; }
  if(viewer && onMatchPage()) attachViewer();
  if(focusReq!=null){ const el=$('#rq-'+focusReq); focusReq=null; if(el) el.scrollIntoView({block:'center'}); }
  navSync();
}
function startScreen(){
  /* 0.4.2.5 (G1b): scheda centrata come nella 022b, senza testata e menu del gioco; gli stessi campi di prima (club e segretaria) */
  return `<div class="start"><div class="start-band"><span class="start-logo" aria-hidden="true">${LOGO_SVG}</span><div class="start-id"><p class="eyebrow">Bozza giocabile · un solo campionato da 8 squadre</p><h1>EVIVORA</h1><p class="tagline">Sei il presidente</p></div>${window.PRES_CONF?'':themeBtn()}</div>
  <div class="start-body"><h2 class="start-t">Inizia la tua carriera</h2>
  <p>Compri giocatori, scegli l'allenatore, costruisci lo stadio. In campo decidono loro. Il tuo talento è vedere prima degli altri chi diventerà un campione.</p>
  <form id="start-form"><label for="club-name">Nome del tuo club</label><input id="club-name" maxlength="28" value="FC Presidente" autocomplete="off">
   <label for="sec-name">Nome della tua segretaria</label><input id="sec-name" maxlength="20" value="Giulia" autocomplete="off"><button class="btn go" type="submit">Fonda il club</button></form>
  <p class="muted">I dati restano solo in questo browser. Nomi di squadre e giocatori sono inventati. Versione ${VERSION}.</p></div></div>`;
}

/* ---------- eventi ---------- */
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-act]'); if(!el) { if(e.target.id==='sheet'){ sheetPid=null; render(); } return; }
  const act=el.dataset.act;
  switch(act){
    case 'go': go(el.dataset.a, el.dataset.s); break;
    case 'advance': advance(); break;
    case 'sheet': sheetPid=+el.dataset.pid; if(viewer&&viewer.playing&&!viewer.done){ viewer.playing=false; } render(); break;
    case 'close': sheetPid=null; render(); break;
    case 'obs': observe(+el.dataset.pid); break;
    case 'note': { const id=+el.dataset.pid; G.note[id]=!G.note[id]; save(); render(); toast(G.note[id]?'Aggiunto al taccuino.':'Tolto dal taccuino.'); break; }
    case 'sell': findBuyer(+el.dataset.pid); break;
    case 'build': build(el.dataset.k); break;
    case 'negopen': { const q=(G.req||[]).find(x=>x.id===+el.dataset.id); if(q){ openNeg(q); negId=q.id; save(); render(); } break; }
    case 'negclose': negId=null; render(); break;
    case 'negprop': { const q=(G.req||[]).find(x=>x.id===negId); if(q&&q.kind==='offerta'){ offPropose(q,+$('#neg-v').value); save(); render(); break; } if(q){ const v=+$('#neg-v').value, oo=$('#neg-oo')?+$('#neg-oo').value:0, m=$('#neg-mot')?$('#neg-mot').value:''; negPropose(q,v,oo,m||null); save(); render(); } break; }
    case 'negacc': { const q=(G.req||[]).find(x=>x.id===negId); if(q&&q.neg){ q.neg.st='deal'; if(q.kind==='offerta'){ resolveReq(q,'deal',false,{v:q.neg.c,opened:true,acc:true}); save(); render(); break; } resolveReq(q,'deal',false,{v:q.neg.c,oo:0,opened:true,acc:true}); save(); render(); } break; }
    case 'negref': case 'negrefm': { const q=(G.req||[]).find(x=>x.id===negId); if(q&&q.neg&&q.kind==='offerta'){ const m=(document.querySelector('input[name=neg-m]:checked')||{}).value; q.neg.st='no'; resolveReq(q,m?'rifm':'rif',false,{opened:true,motive:m||null}); save(); render(); break; } if(q&&q.neg){ const m=(document.querySelector('input[name=neg-m]:checked')||{}).value, oo=$('#neg-roo')?+$('#neg-roo').value:0; q.neg.st='no'; if(el.dataset.act==='negref') resolveReq(q,'rif',false,{opened:true}); else resolveReq(q,'rifm',false,{opened:true,motive:m,oo}); save(); render(); } break; }
    case 'buyopen': { const p=G.P[+el.dataset.pid]; if(G.T[0].pl.length>=24){ toast('Rosa piena: massimo 24 giocatori.'); break; } const r=buyOpen(p); negId=r.id; sheetPid=null; save(); render(); break; }
    case 'buyprop': { const q=(G.req||[]).find(x=>x.id===negId); if(q){ buyPropose(q,+$('#neg-v').value,$('#neg-oo')?+$('#neg-oo').value:0); save(); render(); } break; }
    case 'buyacc': { const q=(G.req||[]).find(x=>x.id===negId); if(q){ buyAccept(q); save(); render(); } break; }
    case 'buyquit': { const q=(G.req||[]).find(x=>x.id===negId); if(q){ buyQuit(q); save(); render(); } break; }
    case 'missmkt': filt.r=el.dataset.r; filt.src='all'; filt.age='40'; go('mercato','cerca'); break;
    case 'req': { const q=(G.req||[]).find(x=>x.id===+el.dataset.id); if(q){ resolveReq(q,el.dataset.c,false); save(); render(); toast(q.out||'Fatto.'); } break; }
    case 'cands': showCands(); break;
    case 'nocands': G.cands=null; save(); render(); break;
    case 'hire': hireCoach(+el.dataset.i); break;
    case 'watch': openViewer(+el.dataset.i); break;
    case 'vplay': vTogglePlay(el); break;
    case 'vkick': kickoff(); break;
    case 'vspd': vSpeed(+el.dataset.s, el); break;
    case 'vnext': vNext(); break;
    case 'vclose': stopViewer(); viewer=null; render(); break;
    case 'ivnext': nextIV(); break;
    case 'ivagain': againIV(); break;
    case 'vcam': vCam(el); break;
    case 'v3d': v3dToggle(); break;
    case 'vfs': vFull(); break;
    case 'vvig': vSetVig(!VPREF.vig); break;
    case 'vtema': case 'tema': themeToggle(); break;
    case 'vscniv': vScnIv(); break;
    case 'reset1': confirmReset=true; render(); break;
    case 'reset0': confirmReset=false; render(); break;
    case 'reset2': stopViewer(); viewer=null; try{ localStorage.removeItem(KEY); }catch(_){} G=null; confirmReset=false; modal=null; clubView=null; area='scrivania'; sub='home'; render(); break;
  }
});
document.addEventListener('change', e=>{ const f=e.target.dataset&&e.target.dataset.filt; if(f){ filt[f]=e.target.value; render(); } });
document.addEventListener('submit', e=>{
  e.preventDefault();
  if(e.target.id==='start-form'){ const n=$('#club-name').value.trim()||'FC Presidente', sn=($('#sec-name')?$('#sec-name').value.trim():'').slice(0,20)||'Giulia'; newGame(n, (Date.now()%2147483647)|0); G.sec={n:sn}; NAV.first=false; area='scrivania'; sub='home'; save(); render(); }
});
document.addEventListener('keydown', e=>{ if(e.key!=='Escape') return; if(modal){ modal=null; confirmReset=false; render(); } else if(sheetPid!=null){ sheetPid=null; render(); } });
window.addEventListener('resize', ()=>{ if(viewer) draw(); });


