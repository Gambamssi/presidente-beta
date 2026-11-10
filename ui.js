/* ================= INTERFACCIA ================= */
const KEY = 'presidente-bozza-v1';
const $ = s=>document.querySelector(s);
const esc = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n=>fInt(n);   /* formati in testi_it.js (0.4.2.6) */
const kcr = n=>fK(n);
/* navigazione: area (Scrivania, Lega, Squadra, Mercato, Società) e sotto-scheda; clubView = profilo pubblico aperto */
let area='scrivania', sub='home', viewer=null, sheetPid=null, confirmReset=false, clubView=null, clubBack=null, modal=null, secWarnFor=null, focusReq=null;
const lastSub={};
const AREAS={
  scrivania:{n:t_("ui.scrivania"), subs:[['home',t_("ui.scrivania")]]},
  lega:{n:t_("ui.lega"), subs:[['notizie',t_("ui.notizie")],['giornata',t_("ui.giornata")],['classifica',t_("ui.classifica")],['marcatori',t_("ui.marcatori")],['albo',t_("ui.albo_d_oro")],['arbitri',t_("ui.arbitri")]]},
  squadra:{n:t_("ui.squadra"), subs:[['rosa',t_("ui.rosa")],['allenatore',t_("ui.allenatore")],['spogliatoio',t_("ui.spogliatoio")]]},
  mercato:{n:t_("ui.mercato"), subs:[['cerca',t_("ui.cerca_giocatori")],['taccuino',t_("ui.taccuino")],['trattative',t_("ui.trattative_in_corso")]]},
  societa:{n:t_("ui.societa"), subs:[['conti',t_("ui.conti")],['bilancio',t_("ui.bilancio")],['banca',t_("ui.banca")],['strutture',t_("ui.strutture")]]}
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
  /* 0.4.3.1 (V0, problema n. 17): in cima PRIMA del disegno, così render() può ancora scorrere alla richiesta da aprire (focusReq) */
  window.scrollTo(0,0); render();
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
  if(p[0]==='ufficio') p[0]='scrivania';   /* 0.4.3.1 (V0): l'area si chiama Ufficio, indirizzo #/ufficio; #/scrivania (preferiti e link vecchi) resta valido e diventa #/ufficio */
  if(p[0]==='giocatore'||p[0]==='club'){ const id=p[1]; if(p.length!==2||!/^\d+$/.test(id)) return {bad:true}; return p[0]==='club'?{club:+id}:{pl:+id}; }
  if(!AREAS[p[0]]||p.length>2) return {bad:true};
  if(p[1]!=null && !AREAS[p[0]].subs.some(x=>x[0]===p[1])) return {bad:true};
  return {a:p[0], s:p[1]||null};
}
const NAV_SLUG={scrivania:'ufficio'};   /* nome nell'indirizzo, se diverso dal nome interno dell'area */
function navPage(){ return clubView!=null ? '#/club/'+clubView : '#/'+(NAV_SLUG[area]||area)+(AREAS[area].subs.length>1?'/'+sub:''); }
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
  if(o!=='b'&&bnegOn){ const deal=G.bneg&&G.bneg.st==='deal'; bnegOn=false; G.bneg=null; save(); if(deal) toast(t_("ui.finanziamento_firmato")); }
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
    toast(t_("ui.visore_chiuso_la_partita")); return; }
  const y=navApply(t); NAV.replace=true;
  render(); if(y!=null) window.scrollTo(0,y);
});
let filt={r:'',age:'40',src:'all',sort:'val'};

let HIDSW=false, HIDSAVE=false;   /* durante la vista «prima della giornata» (render) non si salva: lo stato è provvisorio */
function save(){ if(HIDSW){ HIDSAVE=true; return; } try{ localStorage.setItem(KEY, JSON.stringify(G)); }catch(e){} }
function load(){ try{ return loadFrom(localStorage.getItem(KEY)); }catch(e){} return false; }
/* (v0.037) carica una partita da un testo JSON con le migrazioni dei vecchi salvataggi; la usano load() e gli account della beta (account.js) */
function loadFrom(s){ try{ if(s){ G=JSON.parse(s); if(G && G.P) Object.values(G.P).forEach(p=>{ migratePlayer(p); s1Migrate(p); });   /* v0.4.3.0 (S1): 22 → 57 */ if(G && G.T){ m1Migrate(); ensureRefs(); if(G.rep==null) G.rep=50; if(!G.sec||!G.sec.n) G.sec={n:t_("ui.giulia")}; G.T.forEach(t=>{ finInit(t); ensureBudget(t); }); G.T.forEach(t=>{ if(t.promise && !(t.miss||[]).some(m=>m.kind==='rinforzo'&&m.st==='on')) addMission(t,{kind:'rinforzo',role:t.promise.role,roleN:({D:'difensore',C:'centrocampista',A:'attaccante'})[t.promise.role],thr:t.promise.thr,due:t.promise.due,title:t_("ui.rinforzo_per",{n:t.coach.n})}); if(t.obj && t.obj.s===G.season && !(t.miss||[]).some(m=>m.kind==='obiettivo'&&m.st==='on')) addMission(t,{kind:'obiettivo',amt:t.obj.amt,lim:t.obj.lim,goal:t.obj.goal,due:14,title:t_("ui.obiettivo",{goal:t.obj.goal})}); }); } return !!(G && G.T); } }catch(e){} return false; }
function toast(t){ const el=$('#toast'); el.textContent=t; el.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>el.hidden=true,3200); }

/* ---------- scouting: cosa vede il presidente ---------- */
const isMine = p=>p.team===0;
const obsN = p=>G.obs[p.id]||0;
function rangeOf(v, e, w){ if(w<=0.5) return [Math.round(v),Math.round(v)]; const lo=clamp(Math.round(v-w*(0.5+e)),1,20); return [lo, clamp(lo+Math.round(w),1,20)]; }
function ovrView(p){
  const o=ovr(p); if(isMine(p)) return [o,o];
  const n=obsN(p); return rangeOf(o, p.s?skScarto(p,'ovr'):(p.e.pos||0), n? Math.max(0,5-2*n) : 6);
}
/* v0.4.3.0 (S1): forchetta su una skill 0–100 (scarto da hash, non salvato); null se nessuna relazione dell'osservatore */
function skView(p,k){ const v=skOf(p).v[k]; if(isMine(p)) return [Math.round(v),Math.round(v)];
  const n=obsN(p); if(!n) return null; const w=Math.max(0,6-2*n)*5; if(w<=0.5) return [Math.round(v),Math.round(v)];
  const lo=clamp(Math.round(v-w*(0.5+skScarto(p,k))),0,100); return [lo, clamp(lo+Math.round(w),0,100)]; }
function skSheetHTML(p){
  const S=skOf(p).v, gr=SK_GRUPPI.slice(); if(p.r==='P') gr.unshift(gr.pop());
  const dato=k=>k==='H'?t_("sk.cm",{v:p.h}):k==='W'?t_("sk.kg",{v:fDec(p.w.toFixed(1))}):k==='GR'?t_("sk.grasso",{v:fDec(p.g.toFixed(1))}):k==='PF'?cap1(t_("sk.piede."+(p.foot||'D'))):
    t_("sk.compleanno",{age:p.age,d:fData(new Date(2001,0,p.nd||1),{day:'numeric',month:'long'})});
  const riga=k=>{ const tip=esc(t_("sk.h."+k)+(SK_ALLEN[k]?' · '+t_("sk.allenabile",{v:t_("sk.all."+SK_ALLEN[k])}):'')), nm=(SK_ALLEN[k]?'● ':'')+t_("sk."+k);
    if(SK_DATI.includes(k)) return `<div class="arow sk-dato"><span title="${tip}">${nm}</span><span class="num">${dato(k)}</span></div>`;
    const v=skView(p,k); return `<div class="arow${SK_ALLEN[k]?' sk-all':''}"><span title="${tip}">${nm}</span>${v?`<span class="rng"><span class="r" style="left:${v[0]}%;width:${Math.max(2,v[1]-v[0])}%"></span></span><span class="num">${v[0]===v[1]?v[0]:v[0]+'–'+v[1]}</span>`:'<span class="rng"></span><span class="num muted">?</span>'}</div>`; };
  return gr.map(g=>{ const ks=SK57.filter(x=>x[1]===g).map(x=>x[0]), body=ks.map(riga).join('');
    return g==='por'&&p.r!=='P' ? `<details class="sh-grp sk-por"><summary class="eyebrow">${t_("sk.portiere_altri")}</summary>${body}</details>` : `<div class="sh-grp"><p class="eyebrow">${t_("sk.g."+g)}</p>${body}</div>`; }).join('');
}
function ovrTxt(p){ const [a,b]=ovrView(p); return isMine(p)? a.toFixed(1) : a===b? String(a) : a+'–'+b; }
const stars = pot=>clamp((pot-6)/2.6,0.5,5);
function potView(p){ const n=obsN(p); if(!n) return null; const s=stars(p.pot); const w = n===1?1:n===2?0.5:0; const c=s+p.e.pot*w*2;
  return [clamp(Math.round((c-w)*2)/2,0.5,5), clamp(Math.round((c+w)*2)/2,0.5,5), n===1?'bassa':n===2?'media':'alta']; }
function starsHTML(p){
  const v=potView(p); if(!v) return `<span class="q" title="${t_("ui.manda_l_osservatore_per")}">?</span>`;
  const [lo,hi]=v; let h=`<span class="stars" aria-label="${t_("ui.potenziale_da_a_stelle",{lo:lo,hi:hi})}">`;
  for(let i=1;i<=5;i++){ const cls = i<=lo?'on': (i-0.5<=lo?'half': i-0.5<=hi?'maybe':'off'); h+='<i class="'+cls+'"></i>'; }
  return h+'</span>';
}
function character(p){
  return [p.prof>=14?t_("ui.grande_professionista"):p.prof<=8?t_("ui.poco_costante_in_allenamento"):t_("ui.serio_in_allenamento"),
    p.amb>=14?t_("ui.molto_ambizioso"):p.amb<=7?t_("ui.senza_grandi_ambizioni"):t_("ui.ambizioso_il_giusto"),
    p.tem>=13?t_("ui.testa_calda"):p.tem<=6?t_("ui.freddo_e_controllato"):t_("ui.carattere_equilibrato")];
}
function observe(pid){
  if(G.scoutLeft<=0){ toast(t_("ui.relazioni_finite_l_osservatore")); return; }
  const p=G.P[pid]; if(obsN(p)>=3){ toast(t_("ui.su_hai_gia_una",{ln:p.ln})); return; }
  G.obs[pid]=obsN(p)+1; G.scoutLeft--;
  toast(t_("ui.relazione_su_ne_restano",{fn:p.fn,ln:p.ln,v:G.obs[pid],scoutLeft:G.scoutLeft}));
  save(); render();
}

/* ---------- mercato ---------- */
function findBuyer(pid){
  const p=G.P[pid]; const me=G.T[0];
  if(me.pl.length<=15){ toast(t_("ui.rosa_troppo_corta_servono")); return; }
  const ex=(G.req||[]).find(q=>q.team===0&&q.st==='open'&&q.kind==='offerta'&&q.pid===pid); if(ex){ openNeg(ex); negId=ex.id; sheetPid=null; render(); return; }
  const r=seekBuyer(p); if(!r){ toast(t_("ui.nessun_club_puo_permetterselo")); return; }
  openNeg(r); negId=r.id; sheetPid=null; save(); render();
}

/* ---------- strutture e allenatore ---------- */
const FAC = FACS;
function build(k){ const m=startBuild(G.T[0],k); if(m){ toast(m); return; } save(); render(); }
/* coachCost (costo dell'allenatore) è in engine.js dalla 0.4.4.0 */
function showCands(){ G.cands=[0,1,2].map(()=>mkCoach(8.5+rnd()*3.5)); save(); render(); }
function hireCoach(i){
  const t=G.T[0], c=G.cands[i], cost=coachCost(c)+120000;
  if(t.cash<cost){ toast(t_("ui.servono_cr_tra_buonuscita",{cost:kcr(cost)})); return; }
  spend(t,'allenatore',cost); news(t_("ui.esonerato_il_nuovo_allenatore",{n:t.coach.n,n2:c.n,mod:c.mod}),'coach',true,0); coachMigrate(c); collNewCoach(t,t.coach,c); t.coach=c; G.cands=null; save(); render();
}

/* ---------- avanzamento ---------- */
/* force: «Giochiamo lo stesso» dopo l'avviso della segretaria */
function advance(force){
  if(G.fired){ toast(t_("ui.prima_scegli_la_nuova")); return; }
  if(G.md===0 && needBudget(G.T[0])){ go('societa','bilancio'); toast(t_("ui.prima_convalida_il_preventivo")); return; }
  const key=G.season+'-'+G.md;
  if(!force && G.md<G.sched.length && secWarnFor!==key && secItems().some(x=>x.lv==='urg')){ secWarnFor=key; modal='secwarn'; render(); return; }
  modal=null; stopViewer();
  if(G.md>=G.sched.length){ endSeason(); save(); viewer=null; go('scrivania'); toast(t_("ui.inizia_la_stagione",{season:G.season})); return; }
  const b=document.querySelector('[data-act=advance]'); if(b){ b.disabled=true; b.textContent=t_("ui.si_gioca_la_giornata"); }
  setTimeout(()=>{
    const out=playMatchday(); G.hid=G.season+'-'+G.md; save();
    const um=out.find(m=>m.h===0||m.a===0);
    viewer=null; area='lega'; sub='giornata'; lastSub.lega='giornata'; clubView=null; clubBack=null; render(); window.scrollTo(0,0); openViewer(out.indexOf(um));
  }, 40);
}

/* ---------- viste ---------- */
function bar(v,max=20,cls=''){ return `<span class="bar ${cls}"><span style="width:${clamp(v/max*100,0,100)}%"></span></span>`; }
function roleTag(r){ return `<span class="role r${r}" title="${ROLE_NAME[r]}">${r}</span>`; }
function nameBtn(p){ return `<button class="link" data-act="sheet" data-pid="${p.id}">${esc(p.fn)} ${esc(p.ln)}</button>`; }
/* media voto in decimi (seaStat/carStat) → testo con la virgola */
const v10 = v=>v==null?'–':fDec((v/10).toFixed(1));

/* Squadra › Allenatore: chi è, cosa sa fare, gioco di squadra e bonus in partita, valutazione dell'esonero (v0.4.4.0, R3a: 10 caratteristiche) */
const coNum=v=>fDec((Math.round(v*10)/10).toFixed(1)), coSgn=v=>(v>0.05?'+':v<-0.05?'−':'±')+coNum(Math.abs(v));
function coachKHTML(c, eff){ return `<dl class="attrs">${CO_K.map(k=>{ const v=c.k[k], e=eff?eff[k]:v;
  return `<div title="${esc(t_('co.h.'+k))}"><dt>${t_('co.k.'+k)}</dt><dd>${bar(v,100,k==='CAR'&&v>=65?'warn':'')}<span class="num">${v}${e!==v?` <small class="muted">${t_("co.oggi",{v:e})}</small>`:''}</span></dd></div>`; }).join('')}</dl>`; }
function vAllenatore(){
  const t=G.T[0], c=coachMigrate(t.coach), eff=coachEff(c), V=collOf(t), P=coachPot(c), rt=Math.round(coachRating(c));
  const B=coachBonus(t), LM=coachLeagueBonus(), inGara=new Set(['PC','DM','OF','DF']);
  const cands = G.cands? `<div class="cands"><p class="eyebrow">${t_("ui.allenatori_liberi_costo_con")}</p>${G.cands.map((x,i)=>{ coachMigrate(x); const top=CO_9.slice().sort((a,b)=>x.k[b]-x.k[a]).slice(0,3);
    return `<div class="cand"><div>${t_("ui.anni",{n:esc(x.n),age:x.age,mod:x.mod})}<p class="muted">${t_("co.cand",{rt:Math.round(coachRating(x)),top:top.map(k=>t_('co.k.'+k)+' '+x.k[k]).join(' · '),car:x.k.CAR})}</p></div><button class="btn small" data-act="hire" data-i="${i}">${t_("ui.ingaggia",{coachCost:kcr(coachCost(x)+120000)})}</button></div>`; }).join('')}<button class="btn ghost small" data-act="nocands">${t_("ui.tieni",{n:esc(c.n)})}</button></div>` : `<button class="btn ghost small" data-act="cands">${t_("ui.valuta_un_esonero")}</button>`;
  const coll=`<dl class="attrs">${CO_COLL.map(v=>`<div title="${esc(t_('co.ch.'+v))}"><dt>${t_('co.c.'+v)}</dt><dd>${bar(V[v],100)}<span class="num">${Math.round(V[v])}${Math.abs(P[v]-V[v])>=1?` <small class="muted">→ ${Math.round(P[v])}</small>`:''}</span></dd></div>`).join('')}</dl>`;
  const rows=CO_SK.map(k=>{ const d=B[k]-LM[k]; return `<tr><td>${t_('sk.'+k)}${inGara.has(k)?' <span class="muted" title="'+esc(t_("co.in_gara_h"))+'">●</span>':''}</td><td class="num">+${coNum(B[k])}</td><td class="num">+${coNum(LM[k])}</td><td class="num"><b class="${d<-0.05?'co-neg':d>0.05?'co-pos':''}">${coSgn(d)}</b></td></tr>`; }).join('');
  return pageHead(t_("ui.squadra_staff_tecnico"),esc(c.n),t_("ui.allenatore_anni_modulo_preferito",{age:c.age,mod:c.mod}),{right:`<span class="ev-tbface" aria-hidden="true">${faceHTML(Math.floor(hashU(c.n,9)*1e6)+1,{eta:c.age,ruolo:'allenatore',colori:{primario:clubArt(0).primario,secondario:clubArt(0).secondario}})}</span>`})+`<section class="card coach ev-panel"><p class="eyebrow">${t_("ui.allenatore")}</p><div class="coachrow"><div><p class="big name">${esc(c.n)}</p><p class="muted">${t_("ui.anni_modulo_preferito",{age:c.age,mod:c.mod,v:c.squal>0?` ${t_("ui.squalificato_per_la_prossima")}`:''})}</p>
   <p>${t_("co.valutazione",{rt})}</p><p class="muted">${t_("co.morale",{lv:morLevel(c.mor??12),e:Math.round(eff.e*100)})}</p></div></div>
   <p class="eyebrow">${t_("co.caratteristiche")}</p>${coachKHTML(c,eff)}
   <p class="eyebrow">${t_("co.fuori")}</p><dl class="attrs"><div title="${esc(t_('co.h.all'))}"><dt>${t_("ui.allenamento")}</dt><dd>${bar(c.all,100)}<span class="num">${c.all}</span></dd></div><div title="${esc(t_('co.h.gio'))}"><dt>${t_("ui.giovani")}</dt><dd>${bar(c.gio,100)}<span class="num">${c.gio}</span></dd></div></dl>
   <p class="muted">${t_("co.spiega")}</p>${cands}</section>
   <section class="card ev-panel"><p class="eyebrow">${t_("co.gioco")}</p>${coll}<p class="muted">${t_("co.gioco_spiega")}</p></section>
   <section class="card ev-panel"><p class="eyebrow">${t_("co.bonus")}</p><div class="ev-table-wrap"><table class="ev-table co-bon"><thead><tr><th>${t_("co.th_skill")}</th><th class="num">${t_("co.th_squadra")}</th><th class="num">${t_("co.th_media")}</th><th class="num">${t_("co.th_divario")}</th></tr></thead><tbody>${rows}</tbody></table></div>
   <p class="muted">${t_("co.bonus_spiega")}</p></section>`;
}
/* Squadra › Spogliatoio: clima, morale dell'allenatore, capitano e vice, il più carico e il più scontento */
function vSpogliatoio(){
  const t=G.T[0], c=t.coach, pl=teamPlayers(t).filter(p=>!p.retired), happy=pl.slice().sort((a,b)=>b.mor-a.mor)[0], sad=pl.slice().sort((a,b)=>a.mor-b.mor)[0], cap=G.P[t.cap], vc=G.P[t.vcap];
  const line=(p,lbl)=>p?`<li><b>${nameBtn(p)}</b> <span class="muted">${t_("ui.morale",{lbl:lbl,morLevel:morLevel(p.mor),v:p.morC&&p.morC[0]?' — '+esc(p.morC[0].t):''})}</span></li>`:'';
  return pageHead(t_("ui.squadra_gruppo"),t_("ui.spogliatoio"),t_("ui.clima_capitano",{morLevel:morLevel(clubClimate(t)),v:cap?esc(cap.fn+' '+cap.ln):'–'}))+`<section class="card ev-panel"><p class="eyebrow">${t_("ui.spogliatoio")}</p><div class="sp-top"><div><p class="muted">${t_("ui.clima_della_societa")}</p><p class="big">${morLevel(clubClimate(t)).replace(/^./,x=>x.toUpperCase())}</p>${bar(clubClimate(t),20,'mor')}<p class="muted small">${t_("ui.media_del_morale_di")}</p></div><div><p class="muted">${t_("ui.morale_dell_allenatore")}</p><p class="big">${morLevel(c.mor??12).replace(/^./,x=>x.toUpperCase())}</p>${bar(c.mor??12,20,'mor')}</div><div><p class="muted">${t_("ui.ultimi_voti_dell_allenatore")}</p><p class="big">${(c.rts||[]).length?c.rts.slice(-5).map(x=>x==null?'–':fDec(x)).join(' · '):'–'}</p></div></div>
    <ul class="morc">${line(cap,'capitano')}${line(vc,'vicecapitano')}${happy&&happy!==cap&&happy!==vc?line(happy,t_("ui.il_piu_carico")):''}${sad&&sad!==cap&&sad!==vc&&sad.mor<11?line(sad,t_("ui.il_piu_scontento")):''}</ul>
    <p class="muted">${t_("ui.il_morale_si_muove")}</p></section>`;
}

function plBadges(p, mine){
  return `${p.team!=null&&G.T[p.team].cap===p.id?` <span class="badge-s capb" title="${t_("ui.capitano")}">${t_("ui.c")}</span>`:p.team!=null&&G.T[p.team].vcap===p.id?` <span class="badge-s vcapb" title="${t_("ui.vicecapitano")}">${t_("ui.vc")}</span>`:''}${G.note[p.id]?` <span class="gold" title="${t_("ui.nel_taccuino")}">◆</span>`:''}${!mine&&G.T[0].promise&&p.r===G.T[0].promise.role?(ovrView(p)[0]>=G.T[0].promise.thr-0.05?` <span class="badge-s prm" title="${t_("ui.soddisfa_la_promessa_fatta")}">${t_("ui.promessa")}</span>`:ovrView(p)[1]>=G.T[0].promise.thr?` <span class="badge-s prm2" title="${t_("ui.potrebbe_soddisfare_la_promessa")}">${t_("ui.promessa_2")}</span>`:''):''}${mine&&p.peg?` <span class="badge-s peg" title="${t_("ui.in_pegno_alla_banca")}">${t_("ui.pegno")}</span>`:''}${p.inj>0?` <span class="badge-s inj" title="${t_("ui.infortunato")}">✚ ${p.inj}</span>`:''}${p.sq>0?` <span class="badge-s sq" title="${t_("ui.squalificato")}">${t_("ui.squal")}</span>`:''}`; }
/* righe dei giocatori (Rosa e Cerca giocatori): al telefono diventano schede (etichette da data-l) */
function playerRows(list, mine){
  return list.map(p=>`<tr data-act="sheet" data-pid="${p.id}" class="${G.note[p.id]?'noted':''}">
    <td class="mh">${roleTag(p.r)}</td><td class="nm pc">${plCell(p, nameBtn(p)+plBadges(p,mine), `${ROLE_NAME[p.r]} · ${p.age} anni${mine?'':' · '+(p.team==null?'svincolato':esc(G.T[p.team].n))}`)}</td><td class="num mh">${p.age}</td>
    ${mine?'':`<td class="mh">${p.team==null?`<span class="muted">${t_("ui.svincolato")}</span>`:clubLink(p.team)}</td>`}
    <td class="num strong mv" data-l="${t_("ui.val")}">${ovrTxt(p)}</td><td data-l="${t_("ui.potenziale")}"${mine?' class="mh"':''}>${starsHTML(p)}</td>
    ${mine?`<td data-l="${t_("ui.morale_2")}" title="${t_("ui.morale_3",{morLevel:morLevel(p.mor),v:p.morC&&p.morC[0]?': '+esc(p.morC[0].t):''})}">${bar(p.mor,20,'mor '+(p.mor<9?'warn':''))}</td><td class="num" data-l="${t_("ui.fatica")}">${Math.round(p.fat)}%</td>${(S=>`<td class="num sg" data-l="${t_("ui.presenze")}">${S.a}</td><td class="num" data-l="${t_("ui.gol")}">${S.g}</td><td class="num" data-l="${t_("ui.media")}">${v10(S.v)}</td>`)(seaStat(p))}${(C=>`<td class="num sg mh">${C.a}</td><td class="num mh">${C.g}</td>`)(carStat(p))}<td class="num sg mh" data-l="${t_("ui.stip_g")}">${fmt(p.wg)}</td><td class="num" data-l="${t_("ui.contratto")}">${p.ct} ${p.ct===1?'anno':'anni'}</td>`
          :`<td class="num" data-l="${t_("ui.valore")}">${kcr(value(p))}</td><td class="num" data-l="${t_("ui.relazioni")}">${obsN(p)}/3</td>`}
  </tr>`).join('');
}
function vRosa(){
  const t=G.T[0], pl=teamPlayers(t).sort((a,b)=>'PDCA'.indexOf(a.r)-'PDCA'.indexOf(b.r) || ovr(b)-ovr(a));
  const inj=pl.filter(p=>p.inj>0).length, fat=pl.length?Math.round(pl.reduce((s,p)=>s+p.fat,0)/pl.length):0;
  return pageHead(t_("ui.squadra_gestione_giocatori"),t_("ui.la_tua_rosa"),t_("ui.giocatori_stagione_giornata_14",{pl:pl.length,season:G.season,md:G.md}))
  +kpiHTML([[t_("ui.giocatori"),pl.length,t_("ui.portieri_massimo_24",{filter:pl.filter(p=>p.r==='P').length})],[t_("ui.infortunati"),inj||t_("ui.nessuno"),inj?t_("ui.fuori_per_qualche_giornata"):t_("ui.tutti_disponibili"),inj?'bad':''],[t_("ui.fatica_media"),fat+'%',t_("ui.recupera_tra_una_giornata")],[t_("ui.clima"),cap1(morLevel(clubClimate(t))),t_("ui.morale_della_societa")]])+`<section class="card ev-panel"><div class="head"><h2 class="ev-ptitle">${t_("ui.elenco_giocatori",{pl:pl.length})}</h2><p class="muted">${t_("ui.attributi_esatti_per_i")}</p></div>
  <div class="tw"><table class="ev-ptab rosa"><thead><tr class="grp"><th colspan="7"></th><th colspan="3" class="sg">${t_("ui.stagione",{season:G.season})}</th><th colspan="2" class="sg">${t_("ui.carriera")}</th><th colspan="2" class="sg"></th></tr><tr><th>${t_("ui.r")}</th><th>${t_("ui.giocatore")}</th><th class="num">${t_("ui.eta")}</th><th class="num">${t_("ui.val")}</th><th>${t_("ui.potenziale")}</th><th>${t_("ui.morale_2")}</th><th class="num">${t_("ui.fatica")}</th><th class="num sg">${t_("ui.pres")}</th><th class="num">${t_("ui.gol")}</th><th class="num" title="${t_("ui.media_voto_della_stagione")}">${t_("ui.media")}</th><th class="num sg">${t_("ui.pres")}</th><th class="num">${t_("ui.gol")}</th><th class="num sg">${t_("ui.stip_g")}</th><th class="num">${t_("ui.contratto")}</th></tr></thead><tbody>${playerRows(pl,true)}</tbody></table></div></section>`;
}
function vMercato(){
  let list=Object.values(G.P).filter(p=>!p.retired && p.team!==0 && (p.team!=null || G.FA.includes(p.id)));
  const all=list.length;
  if(filt.r) list=list.filter(p=>p.r===filt.r);
  list=list.filter(p=>p.age<=+filt.age);
  if(filt.src==='fa') list=list.filter(p=>p.team==null); if(filt.src==='club') list=list.filter(p=>p.team!=null);
  list.sort(filt.sort==='age'?(a,b)=>a.age-b.age:filt.sort==='obs'?(a,b)=>obsN(b)-obsN(a):(a,b)=>value(b)-value(a));
  const sel=(id,opts,v)=>`<select id="${id}" data-filt="${id.slice(2)}">${opts.map(([k,l])=>`<option value="${k}"${k===v?' selected':''}>${l}</option>`).join('')}</select>`;
  return pageHead(t_("ui.mercato_osservatori"),t_("ui.cerca_giocatori"),t_("ui.ricerca_e_valutazione_dei",{all:all}))+`<div class="ev-layout"><aside class="ev-side"><section class="card ev-panel"><h2 class="ev-ptitle">${t_("ui.filtra_ricerca")}</h2>
   <div class="filters ev-fields"><label>${t_("ui.ruolo")} ${sel('f-r',[['',t_("ui.tutti")],['P',t_("ui.portieri")],['D',t_("ui.difensori")],['C',t_("ui.centrocampisti")],['A',t_("ui.attaccanti")]],filt.r)}</label>
   <label>${t_("ui.eta_fino_a")} ${sel('f-age',[['19','19'],['21','21'],['23','23'],['40','tutte']],filt.age)}</label>
   <label>${t_("ui.dove")} ${sel('f-src',[['all',t_("ui.ovunque")],['club',t_("ui.nei_club")],['fa',t_("ui.svincolati")]],filt.src)}</label>
   <label>${t_("ui.ordina")} ${sel('f-sort',[['val',t_("ui.valore")],['age',t_("ui.eta")],['obs',t_("ui.osservazioni")]],filt.sort)}</label></div></section>
   <section class="card ev-panel"><h2 class="ev-ptitle">${t_("ui.osservatore")}</h2><p class="ev-bignum">${G.scoutLeft}<small>/3</small></p><p class="muted">${t_("ui.relazioni_rimaste_mandalo_dalla")}</p><p class="muted small">${t_("ui.il_valore_di_mercato")}</p></section></aside>
  <section class="card ev-panel ev-main"><div class="head"><h2 class="ev-ptitle">${t_("ui.risultati",{list:list.length,v:list.length>90?t_("ui.i_primi_90"):''})}</h2><p class="muted">${t_("ui.tocca_un_giocatore_per")}</p></div>
  <div class="tw"><table class="ev-ptab cerca"><thead><tr><th>${t_("ui.r")}</th><th>${t_("ui.giocatore")}</th><th class="num">${t_("ui.eta")}</th><th>${t_("ui.squadra")}</th><th class="num">${t_("ui.val")}</th><th>${t_("ui.potenziale")}</th><th class="num">${t_("ui.valore")}</th><th class="num">${t_("ui.relaz")}</th></tr></thead><tbody>${playerRows(list.slice(0,90),false)}</tbody></table></div></section></div>`;
}
function vClassifica(){
  const st=standings(), me=st.findIndex(t=>t.id===0)+1, played=G.T.reduce((x,t)=>x+t.tab.g,0)/2;
  return pageHead(t_("ui.lega_campionato"),t_("ui.classifica"),t_("ui.stagione_giornata_di_14",{season:G.season,md:G.md,st:st.length}))+`<div class="ev-layout ev-layout-r"><section class="card ev-panel ev-main"><h2 class="ev-ptitle">${t_("ui.classifica_generale")}</h2>${G.md===0?`<p class="muted small">${t_("ui.la_stagione_non_e")}</p>`:''}<div class="tw"><table class="tab ev-standings"><thead><tr><th class="num">#</th><th>${t_("ui.squadra")}</th><th class="num">${t_("ui.g")}</th><th class="num">${t_("ui.v")}</th><th class="num">${t_("ui.n")}</th><th class="num">${t_("ui.p")}</th><th class="num">${t_("ui.gf")}</th><th class="num">${t_("ui.gs")}</th><th class="num">${t_("ui.dr")}</th><th class="num">${t_("ui.pt")}</th><th class="fcol">${t_("ui.forma")}</th></tr></thead><tbody>
  ${st.map((t,i)=>`<tr class="${t.id===0?'me':''}"><td class="num pos">${String(i+1).padStart(2,'0')}</td><td class="sq">${clubCell(t.id)}</td><td class="num">${t.tab.g}</td><td class="num">${t.tab.v}</td><td class="num">${t.tab.n}</td><td class="num">${t.tab.p}</td><td class="num">${t.tab.gf}</td><td class="num">${t.tab.gs}</td><td class="num">${t.tab.gf-t.tab.gs}</td><td class="num strong">${teamPts(t)}${t.fin&&t.fin.pen?` <small class="bad">(−${t.fin.pen})</small>`:''}${t.fin&&t.fin.excluded?` ${t_("ui.esclusa")}`:''}</td><td class="fcol">${t.form.map(f=>`<span class="fm f${f}">${f}</span>`).join('')}</td></tr>`).join('')}</tbody></table></div></section>
  <aside class="ev-side"><section class="card ev-panel"><h2 class="ev-ptitle">${t_("ui.il_campionato")}</h2><div class="ev-kvs"><div class="ev-kv"><span>${t_("ui.giornata")}</span><strong>${G.md}/14</strong></div><div class="ev-kv"><span>${t_("ui.squadre")}</span><strong>${st.length}</strong></div><div class="ev-kv"><span>${t_("ui.partite_disputate")}</span><strong>${played}</strong></div><div class="ev-kv"><span>${t_("ui.la_tua_posizione")}</span><strong>${me}°</strong></div><div class="ev-kv"><span>${t_("ui.capolista")}</span><strong>${esc(st[0].n)}</strong></div></div>
   <p class="muted small">${t_("ui.g_giocate_v_vinte")}</p></section></aside></div>`;
}
function vArbitri(){
  ensureRefs();
  const rows=G.refs.slice().sort((a,b)=>b.esp-a.esp).map(r=>{ const avg=r.g?fDec((r.vs/r.g).toFixed(1)):'–';
    return `<tr><td class="nm"><b>${esc(r.n)}</b><div class="muted small">${t_("ui.assistenti_anni",{a1:esc(r.a1),a2:esc(r.a2),age:r.age})}</div></td>
      ${[r.esp,r.car,r.fis,r.err].map((v,i)=>`<td>${bar(v,20,i===3?'warn':'')}<span class="num">${v}</span></td>`).join('')}
      <td class="num">${r.g}</td><td class="num strong">${avg}</td><td class="num">${r.er}</td><td class="num">${r.g?fDec(((r.yc)/r.g).toFixed(1)):'–'}</td><td class="num">${r.rc}</td><td class="num">${r.pen}</td></tr>`; }).join('');
  const last=G.last&&!hidNow()? `<ul class="refl">${G.last.map(m=>{ const r=G.refs[m.refId]; return r?`<li><span>${clubLink(m.h)} – ${clubLink(m.a)} <b>${m.gh}-${m.ga}</b></span><span>${esc(r.n)}</span><span class="num strong">${fDec(m.ref.voto)}</span><span class="muted">${m.ref.errs.length?m.ref.errs.length+(m.ref.errs.length===1?' errore':' errori'):t_("ui.nessun_errore")}</span></li>`:''; }).join('')}</ul>` : `<p class="empty">${t_(hidNow()?"ui.voti_dopo_la_visione":"ui.le_designazioni_arrivano_con")}</p>`;
  return pageHead(t_("ui.lega_arbitri"),t_("ui.terne_arbitrali"),t_("ui.stagione_terne_una_per",{season:G.season,refs:G.refs.length}))+`<section class="card ev-panel"><div class="head"><p class="eyebrow">${t_("ui.terne_arbitrali_stagione",{season:G.season})}</p><p class="muted">${t_("ui.una_terna_per_ogni")}</p></div>
  <div class="tw"><table class="tab"><thead><tr><th>${t_("ui.terna")}</th><th>${t_("ui.esperienza")}</th><th>${t_("ui.cartellini")}</th><th>${t_("ui.fischio_facile")}</th><th>${t_("ui.errori")}</th><th class="num">${t_("ui.gare")}</th><th class="num">${t_("ui.voto_medio")}</th><th class="num">${t_("ui.errori_fatti")}</th><th class="num">${t_("ui.gialli_gara")}</th><th class="num">${t_("ui.rossi")}</th><th class="num">${t_("ui.rigori")}</th></tr></thead><tbody>${rows}</tbody></table></div></section>
  <section class="card ev-panel"><p class="eyebrow">${t_("ui.ultima_giornata_designazioni_e")}</p>${last}</section>`;
}


/* impegni in corso: avanzamento e scadenza */
function missionInfo(t,m){
  const left=m.due-G.md, pos=standings().findIndex(x=>x.id===t.id)+1;
  if(m.kind==='rinforzo'){ const c=Object.values(G.P).filter(p=>!p.retired&&p.team!==0&&(p.team!=null||G.FA.includes(p.id))&&p.r===m.role).filter(p=>ovrView(p)[0]>=m.thr-0.05).length;
    return {prog:t_("ui.compra_di_valore_almeno",{v:m.roleN==='attaccante'?t_("ui.un"):t_("ui.un"),roleN:m.roleN,fDec:fDec(m.thr)}), when: left<=1?t_("ui.ultima_occasione_compra_prima",{due:m.due}):t_("ui.compra_prima_di_giocare",{due:m.due,left:left}), urgent:left<=1,
      act:`<button class="btn small" data-act="missmkt" data-r="${m.role}">${t_("ui.cerca_sul_mercato")}</button> <span class="muted">${t_("ui.altri_da_far_valutare",{v:c===0?t_("ui.nessun_giocatore_sicuramente_ada"):c===1?t_("ui.1_giocatore_sicuramente_adatto"):c+` ${t_("ui.giocatori_sicuramente_adatti")}`})}</span>`}; }
  if(m.kind==='premio') return {prog:t_("ui.cr_ai_giocatori_se",{amt:kcr(m.amt),clubLink:clubLink(m.opp)}), when:t_("ui.si_decide_nella_prossima"), urgent:false, act:''};
  if(m.kind==='obiettivo'){ const ok=pos<=m.lim; return {prog:t_("ui.oggi_siete_in_palio",{pos:pos,v:ok?t_("ui.l_obiettivo_e_alla"):t_("ui.fuori_dalla_zona_obiettivo"),amt:kcr(m.amt)}), when:t_("ui.si_decide_a_fine",{max:Math.max(0,14-G.md)}), urgent:false, act:''}; }
  return {prog:'',when:'',urgent:false,act:''};
}
function missionsHTML(t, compact){
  const act=activeMissions(t), done=(t.miss||[]).filter(m=>m.st!=='on' && m.s===G.season).slice(0,compact?2:6);
  if(compact && !act.length) return '';
  const li=act.map(m=>{ const i=missionInfo(t,m); return `<li class="ms ${i.urgent?'urg':''}"><div><p class="eyebrow">${i.urgent?t_("ui.in_scadenza"):t_("ui.in_corso")}${esc(m.title)}</p><p>${i.prog}</p><p class="muted">${i.when}</p>${i.act&&!compact?`<p>${i.act}</p>`:''}</div></li>`; }).join('');
  const dl=done.map(m=>`<li class="ms ${m.st}"><div><p class="eyebrow">${m.st==='ok'?t_("ui.completato"):m.st==='ko'?t_("ui.fallito"):t_("ui.concluso")} · ${esc(m.title)}</p><p class="muted">${esc(m.res||'')}</p></div></li>`).join('');
  return `<section class="card"><p class="eyebrow">${t_("ui.impegni_del_presidente")}</p>${act.length?`<ul class="msl">${li}</ul>`:`<p class="empty">${t_("ui.nessun_impegno_in_corso")}</p>`}${dl&&!compact?`<p class="eyebrow" style="margin-top:6px">${t_("ui.conclusi_in_questa_stagione")}</p><ul class="msl">${dl}</ul>`:''}${compact?`<button class="link" data-act="go" data-a="scrivania">${t_("ui.vai_alla_scrivania")}</button>`:''}</section>`;
}

/* ---------- finestra della trattativa ---------- */
/* testata delle finestre di trattativa (0.4.2.5): fascia verde con il volto (o lo stemma), il nome e un numero a destra */
function negHead(p, over, title, sub, rl, rv, tags){
  return `<div class="neg-h ev-nhead"><span class="ev-nface" aria-hidden="true">${p?plFace(p):crestHTML(0)}</span><div class="ev-ntext"><p class="ev-eyebrow">${over}</p><h2>${title}</h2><p class="ev-nsub">${sub}</p>${tags&&tags.length?`<p class="ev-ntags">${tags.map(x=>`<span>${x}</span>`).join('')}</p>`:''}</div>${rv!=null?`<div class="ev-nval"><small>${rl}</small><b>${rv}</b></div>`:''}<button class="x" data-act="negclose" aria-label="${t_("ui.chiudi")}">${t_("ui.x")}</button></div>`; }
let negId=null;
/* 0.4.5.3 (V0c, n. 25): la scritta del valore mostra sempre quello del cursore (all'apertura, mentre si trascina, a fine gesto); solo DOM, nessuno stato */
function negSyncLbl(){ const s=$('#neg-v'), o=$('#neg-vt'); if(!s||!o) return; const q=(G.req||[]).find(x=>x.id===negId); if(q) o.textContent=negVal(q,+s.value); }
function negVal(r,v){ if(r.kind==='offerta') return kcr(v)+' cr'; if(r.kind==='acquisto') return r.neg&&r.neg.ph==='club'?kcr(v)+' cr':fmt(v)+` ${t_("ui.cr_a_giornata")}`; return r.kind==='rinforzo'?t_("ui.un_giocatore_di_valore",{fDec:fDec(v.toFixed(1))}):r.kind==='rinnovo'||r.kind==='aumento'?fmt(v)+` ${t_("ui.cr_a_giornata")}`:kcr(v)+' cr'; }
function vNeg(){
  const r=(G.req||[]).find(q=>q.id===negId); if(!r||!r.neg) return '';
  if(r.kind==='offerta') return vNegOff(r);
  if(r.kind==='acquisto') return vNegBuy(r);
  const t=G.T[0], n=r.neg, R=negRange(r), w=reqWho(r), mor=reqMor(r), cl=clubClimate(t);
  const who = w.type==='p' ? `${esc(w.o.fn)} ${esc(w.o.ln)}` : w.type==='c' ? `${esc(t.coach.n)} (allenatore)` : t_("ui.la_squadra_parla_il",{v:w.o?esc(w.o.ln):''});
  const req = r.kind==='rinforzo' ? t_("ui.un_di_valore_almeno",{v:({D:'difensore',C:'centrocampista',A:'attaccante'})[r.role],negVal:negVal(r,R.hi),pdue:r.pdue})
            : (r.kind==='rinnovo'||r.kind==='aumento') ? `${negVal(r,R.hi)} (ora ${fmt(r.old)})${r.kind==='rinnovo'?t_("ui.rinnovo_di_3_anni"):''}` : `${negVal(r,R.hi)} ${r.kind==='premio'?t_("ui.in_caso_di_vittoria"):t_("ui.se_si_raggiunge_l")}`;
  const hist=n.hist.map(h=>h.by==='pres'?`<li class="me"><span>${t_("ui.tu")}</span><p>${h.no?t_("ui.la_risposta_e_no",{v:h.m?` ${esc(NEG_MOT[h.m])}.`:'',v2:h.oo?` ${t_("ui.ti_riconosco_cr_una",{oo:kcr(h.oo)})}`:''}):h.acc?t_("ui.d_accordo",{negVal:negVal(r,h.v)}):t_("ui.propongo",{v:h.m?esc(NEG_MOT[h.m])+'. ':'',negVal:negVal(r,h.v),v2:h.oo?` ${t_("ui.piu_cr_una_tantum",{oo:kcr(h.oo)})}`:''})}</p></li>`:`<li class="them"><span>${w.type==='p'?esc(w.o.ln):w.type==='c'?esc(t.coach.n.split(' ').pop()):t_("ui.capitano")}</span><p>${esc(h.txt||'')}${h.v!=null&&h.txt&&!/Affare/.test(h.txt)?' '+negVal(r,h.v)+'.':''}</p></li>`).join('');
  const open=n.st==='open', st=n.st==='stalled';
  const pb=Math.round(n.pat/n.pat0*100);
  const motives=Object.entries(NEG_MOT).filter(([k])=>k!=='prestazioni'||w.type==='p');
  return `<div class="neg" role="dialog" aria-label="${t_("ui.trattativa")}"><div class="neg-in">
   ${negHead(w.type==='p'?w.o:null, t_("ui.trattativa_2",{v:REQ_KIND[r.kind]}), who, w.type==='p'?`${ROLE_NAME[w.o.r]} · ${w.o.age} anni · ${esc(t.n)}`:esc(t.n), t_("ui.morale_2"), cap1(morLevel(mor)))}
   <p class="muted">${t_("ui.chiede",{req:req})}</p>
   <div class="neg-sides">
     <div class="side"><p class="eyebrow">${t_("ui.il_presidente")}</p><p class="strong">${esc(t.n)}</p><p class="muted">${t_("ui.clima_della_societa_2",{morLevel:morLevel(cl)})}</p>${bar(cl,20,'mor')}<p class="muted">${t_("ui.cassa_stipendi_ricavi",{cash:kcr(t.cash),wageRatio:Math.round(wageRatio(t)*100)})}</p></div>
     <div class="side"><p class="eyebrow">${w.type==='t'?t_("ui.la_squadra"):w.type==='c'?t_("ui.l_allenatore"):t_("ui.il_giocatore")}</p><p class="muted">${t_("ui.morale_4",{morLevel:morLevel(mor)})}</p>${bar(mor,20,'mor '+(mor<9?'warn':''))}<p class="muted">${t_("ui.pazienza")}</p><span class="bar pat ${pb<35?'warn':''}"><span style="width:${pb}%"></span></span><p class="muted small">${t_("ui.il_morale_e_l")}</p></div>
   </div>
   <ul class="neg-chat">${hist||`<li class="sys">${t_("ui.fai_la_tua_proposta")}</li>`}</ul>
   ${open?`<div class="neg-form"><label>${t_("ui.la_tua_proposta",{negVal:negVal(r,n.c)})}</label>
      <input type="range" id="neg-v" min="${R.lo}" max="${R.hi}" step="${R.step}" value="${n.hist.length?(n.hist.filter(h=>h.by==='pres').slice(-1)[0]||{v:n.c}).v:R.lo+(R.hi-R.lo)*0.5}" data-unit="${r.kind}">
      <label>${t_("ui.motivazione")} <select id="neg-mot"><option value="">${t_("ui.nessuna")}</option>${motives.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label>
      ${R.oneoff?`<label>${t_("ui.una_tantum_alla_firma")} <select id="neg-oo">${[0,10000,25000,50000,100000].map(x=>`<option value="${x}">${x?kcr(x)+' cr':'nessuna'}</option>`).join('')}</select></label>`:''}
      <div class="row"><button class="btn" data-act="negprop">${t_("ui.proponi")}</button><button class="btn ghost" data-act="negacc">${t_("ui.accetta_la_sua_richiesta",{negVal:negVal(r,n.c)})}</button></div></div>`:''}
   ${st?`<div class="neg-stop"><p class="strong">${t_("ui.la_pazienza_e_finita")}</p><div class="row"><button class="btn" data-act="negacc">${t_("ui.accetta_la_sua_ultima",{negVal:negVal(r,n.c)})}</button></div></div>`:''}
   ${open||st?`<details class="neg-no"><summary>${t_("ui.chiudi_con_un_rifiuto")}</summary>
      <p class="muted">${t_("ui.un_no_secco_costa")}</p>
      <div class="mot">${motives.map(([k,l],i)=>`<label><input type="radio" name="neg-m" value="${k}" ${i===0?'checked':''}> ${l}</label>`).join('')}</div>
      <label>${t_("ui.una_tantum")} <select id="neg-roo">${[0,10000,25000,50000].map(x=>`<option value="${x}">${x?kcr(x)+' cr':'nessuna'}</option>`).join('')}</select></label>
      <div class="row"><button class="btn danger small" data-act="negrefm">${t_("ui.rifiuta_motivando")}</button><button class="btn ghost small" data-act="negref">${t_("ui.rifiuto_secco")}</button></div></details>`:''}
   ${!open&&!st?`<p class="strong">${esc(r.out||t_("ui.trattativa_chiusa"))}</p><div class="row"><button class="btn" data-act="negclose">${t_("ui.chiudi")}</button></div>`:''}
  </div></div>`;
}

function vNegOff(r){
  const t=G.T[0], n=r.neg, R=offRange(r), p=G.P[r.pid], b=buyerOf(r), cl=clubClimate(t), pb=Math.round(n.pat/120*100);
  const hist=n.hist.map(h=>h.by==='pres'?`<li class="me"><span>${t_("ui.tu")}</span><p>${h.no?t_("ui.non_vendiamo",{v:h.m?' '+esc(OFF_MOT[h.m])+'.':''}):h.acc?t_("ui.accettiamo_cr",{v:kcr(h.v)}):t_("ui.chiediamo_cr",{v:kcr(h.v)})}</p></li>`
    : h.by==='pl'?`<li class="them pl"><span>${esc(p.ln)}</span><p>${esc(h.txt)}</p></li>`
    : `<li class="them"><span>${esc(b.n)}</span><p>${esc(h.txt||'')}${h.v!=null?` ${t_("ui.cr",{v:kcr(h.v)})}`:''}</p></li>`).join('');
  const open=n.st==='open', st=n.st==='stalled';
  return `<div class="neg" role="dialog" aria-label="${t_("ui.trattativa_di_mercato")}"><div class="neg-in">
   ${negHead(p, t_("ui.mercato_offerta_per_un"), `${esc(p.fn)} ${esc(p.ln)}`, t_("ui.anni_chi_compra",{v:ROLE_NAME[p.r],age:p.age,v2:b.foreign?esc(b.n):clubLink(b.id)}), t_("ui.offerta_iniziale"), kcr(r.amt)+' cr')}
   <p class="muted">${t_("ui.offerta_iniziale_cr_valore",{amt:kcr(r.amt),value:kcr(value(p)),wg:fmt(p.wg)})}</p>
   <div class="neg-sides">
     <div class="side"><p class="eyebrow">${t_("ui.il_presidente")}</p><p class="strong">${esc(t.n)}</p><p class="muted">${t_("ui.clima_della_societa_2",{morLevel:morLevel(cl)})}</p>${bar(cl,20,'mor')}<p class="muted">${t_("ui.cassa",{cash:kcr(t.cash)})}</p></div>
     <div class="side"><p class="eyebrow">${t_("ui.il_club_che_compra")}</p><p class="strong">${esc(b.n)}</p><p class="muted">${t_("ui.pazienza")}</p><span class="bar pat ${pb<35?'warn':''}"><span style="width:${pb}%"></span></span>
       <p class="eyebrow" style="margin-top:6px">${t_("ui.il_giocatore")}</p><p class="muted">${t_("ui.morale_4",{morLevel:morLevel(p.mor)})}</p>${bar(p.mor,20,'mor '+(p.mor<9?'warn':''))}<p class="muted small">${t_("ui.se_i_club_si")}</p></div>
   </div>
   <ul class="neg-chat">${hist||`<li class="sys">${t_("ui.chiedi_una_cifra_piu")}</li>`}</ul>
   ${open?`<div class="neg-form"><label>${t_("ui.il_prezzo_che_chiedi",{c:kcr(n.c)})}</label>
      <input type="range" id="neg-v" min="${R.lo}" max="${R.hi}" step="5000" value="${Math.min(R.hi,Math.round(n.c*1.2/5000)*5000)}" data-unit="offerta">
      <div class="row"><button class="btn" data-act="negprop">${t_("ui.chiedi")}</button><button class="btn ghost" data-act="negacc">${t_("ui.accetta_la_loro_offerta",{c:kcr(n.c)})}</button></div></div>`:''}
   ${st?`<div class="neg-stop"><p class="strong">${t_("ui.il_club_non_tratta")}</p><div class="row"><button class="btn" data-act="negacc">${t_("ui.accetta_cr",{c:kcr(n.c)})}</button></div></div>`:''}
   ${open||st?`<details class="neg-no"><summary>${t_("ui.rifiuta_l_offerta")}</summary>
      <p class="muted">${t_("ui.se_il_giocatore_voleva")}</p>
      <div class="mot"><label><input type="radio" name="neg-m" value="" checked> ${t_("ui.nessuna_motivazione")}</label>${Object.entries(OFF_MOT).map(([k,l])=>`<label><input type="radio" name="neg-m" value="${k}"> ${l}</label>`).join('')}</div>
      <div class="row"><button class="btn danger small" data-act="negrefm">${t_("ui.rifiuta")}</button></div></details>`:''}
   ${!open&&!st?`<p class="strong">${esc(r.out||t_("ui.trattativa_chiusa"))}</p><div class="row"><button class="btn" data-act="negclose">${t_("ui.chiudi")}</button></div>`:''}
  </div></div>`;
}

function vNegBuy(r){
  const t=G.T[0], n=r.neg, p=G.P[r.pid], from=r.from!=null?G.T[r.from]:null, cl=clubClimate(t), ph=n.ph, pb=Math.round(n.pat/n.pat0*100);
  const hist=n.hist.map(h=>h.by==='pres'?`<li class="me"><span>${t_("ui.tu")}</span><p>${h.acc?t_("ui.d_accordo_2",{v:h.ph==='club'?kcr(h.v)+' cr':fmt(h.v)+` ${t_("ui.cr_a_giornata")}`}):h.ph==='club'?t_("ui.offriamo_cr_per_il",{v:kcr(h.v)}):t_("ui.ti_offriamo_cr_a",{v:fmt(h.v),v2:h.oo?` ${t_("ui.piu_cr_alla_firma",{oo:kcr(h.oo)})}`:''})}</p></li>`
    : h.by==='club'?`<li class="them"><span>${esc(from?from.n:t_("ui.club"))}</span><p>${esc(h.txt)}${h.v!=null?` ${t_("ui.cr",{v:kcr(h.v)})}`:''}</p></li>`
    : `<li class="them pl"><span>${esc(p.ln)}</span><p>${esc(h.txt)}${h.v!=null?` ${t_("ui.cr_a_giornata_2",{v:fmt(h.v)})}`:''}</p></li>`).join('');
  const open=n.st==='open', st=n.st==='stalled';
  const lo=ph==='club'?Math.round(value(p)*0.5/5000)*5000:Math.round(Math.min(n.ask*0.6,p.wg)/50)*50, hi=ph==='club'?n.ask:n.ask, step=ph==='club'?5000:50;
  const def=ph==='club'?Math.round((lo+hi)/2/5000)*5000:Math.round((lo+hi)/2/50)*50;
  return `<div class="neg" role="dialog" aria-label="${t_("ui.trattativa_di_acquisto")}"><div class="neg-in">
   ${negHead(p, t_("ui.mercato_acquisto",{v:from?(ph==='club'?t_("ui.fase_1_di_2"):t_("ui.fase_2_di_2")):t_("ui.svincolato_contratto_con_il")}), `${esc(p.fn)} ${esc(p.ln)}`, `${ROLE_NAME[p.r]} · ${p.age} anni · ${from?clubLink(from.id):'svincolato'}`, t_("ui.valore_di_mercato"), kcr(value(p))+' cr', [p.r+' · '+ROLE_NAME[p.r], t_("ui.valutazione",{ovrTxt:ovrTxt(p)})])}
   <p class="muted">${t_("ui.anni_valutazione_valore_di",{v:ROLE_NAME[p.r],age:p.age,ovrTxt:ovrTxt(p),value:kcr(value(p)),wg:fmt(p.wg),v2:n.fee?` ${t_("ui.prezzo_concordato_con_il",{fee:kcr(n.fee)})}`:''})}</p>
   <div class="neg-sides">
     <div class="side"><p class="eyebrow">${t_("ui.il_presidente")}</p><p class="strong">${esc(t.n)}</p><p class="muted">${t_("ui.clima_della_societa_2",{morLevel:morLevel(cl)})}</p>${bar(cl,20,'mor')}<p class="muted">${t_("ui.cassa_stipendi_ricavi",{cash:kcr(t.cash),wageRatio:Math.round(wageRatio(t)*100)})}</p></div>
     <div class="side"><p class="eyebrow">${ph==='club'?t_("ui.il_club_che_vende"):t_("ui.il_giocatore")}</p>${ph==='club'?`<p class="strong">${esc(from.n)}</p>`:''}<p class="muted">${t_("ui.pazienza")}</p><span class="bar pat ${pb<35?'warn':''}"><span style="width:${pb}%"></span></span>
       ${from?`<p class="muted" style="margin-top:6px">${t_("ui.morale_del_giocatore_nella",{morLevel:morLevel(p.mor)})}</p>${bar(p.mor,20,'mor '+(p.mor<9?'warn':''))}`:''}<p class="muted small">${t_("ui.il_morale_e_l_2")}</p></div>
   </div>
   <ul class="neg-chat">${hist||`<li class="sys">${t_("ui.fai_la_tua_offerta")}</li>`}</ul>
   ${open?`<div class="neg-form"><label>${ph==='club'?t_("ui.offerta_per_il_cartellino"):t_("ui.stipendio_offerto")} <b id="neg-vt">${ph==='club'?kcr(def)+' cr':fmt(def)+` ${t_("ui.cr_a_giornata")}`}</b></label>
      <input type="range" id="neg-v" min="${lo}" max="${hi}" step="${step}" value="${def}" data-unit="${ph}">
      ${ph==='player'?`<label>${t_("ui.una_tantum_alla_firma")} <select id="neg-oo">${[0,10000,25000,50000,100000].map(x=>`<option value="${x}">${x?kcr(x)+' cr':'nessuna'}</option>`).join('')}</select></label>`:''}
      <div class="row"><button class="btn" data-act="buyprop">${ph==='club'?t_("ui.offri"):t_("ui.proponi")}</button><button class="btn ghost" data-act="buyacc">${t_("ui.accetta_la_richiesta",{v:ph==='club'?kcr(n.c)+' cr':fmt(n.c)+` ${t_("ui.cr_a_giornata")}`})}</button><button class="btn ghost" data-act="buyquit">${t_("ui.rinuncia")}</button></div></div>`:''}
   ${st?`<div class="neg-stop"><p class="strong">${t_("ui.non_tratta_piu_decidi",{v:ph==='club'?t_("ui.il_club"):t_("ui.il_giocatore")})}</p><div class="row"><button class="btn" data-act="buyacc">${t_("ui.accetta",{v:ph==='club'?kcr(n.c)+' cr':fmt(n.c)+` ${t_("ui.cr_a_giornata")}`})}</button><button class="btn ghost" data-act="buyquit">${t_("ui.rinuncia")}</button></div></div>`:''}
   ${!open&&!st?`<p class="strong">${esc(r.out||t_("ui.trattativa_chiusa"))}</p><div class="row"><button class="btn" data-act="negclose">${t_("ui.chiudi")}</button></div>`:''}
  </div></div>`;
}
/* ---------- richieste al presidente (Scrivania) e offerte per i tuoi giocatori (Mercato › Trattative) ---------- */
function reqBtns(q){
  const btn=(c,l,cls='')=>`<button class="btn small ${cls}" data-act="req" data-id="${q.id}" data-c="${c}">${l}</button>`;
  const tb=`<button class="btn small ghost" data-act="negopen" data-id="${q.id}">${q.neg?t_("ui.riprendi_la_trattativa"):t_("ui.tratta")}</button>`;
  return q.kind==='offerta' ? btn('acc',t_("ui.accetta_l_offerta"))+tb+btn('rif',t_("ui.rifiuta"),'ghost')
                            : btn('acc',q.kind==='rinforzo'?t_("ui.prometti"):t_("ui.accetta_2"))+tb+btn('rif',t_("ui.rifiuta"),'ghost');
}
function reqHint(q){ const left=Math.max(0,14-G.md);
  return q.kind==='rinnovo' ? t_("ui.se_rifiuti_o_la")
       : q.kind==='aumento' ? t_("ui.costo_cr_fino_a",{nw:fmt((q.nw-q.old)*left)})
       : q.kind==='premio' ? t_("ui.si_paga_solo_se")
       : q.kind==='obiettivo' ? t_("ui.si_paga_a_fine")
       : q.kind==='rinforzo' ? t_("ui.se_prometti_e_non")
       : t_("ui.se_i_club_si_2"); }
/* una richiesta scade se non ha risposta prima di giocare la giornata q.due+1 */
const reqExpiring = q=>q.due<=G.md;
function reqItem(q){ const p=q.pid!=null?G.P[q.pid]:null;
  return `<li class="rq${focusReq===q.id?' flash':''}" id="rq-${q.id}"><div><p class="eyebrow">${REQ_KIND[q.kind]}${p?' · '+esc(p.fn+' '+p.ln):''} · ${reqExpiring(q)?`${t_("ui.scade_rispondi_prima_di",{due:q.due+1})}`:t_("ui.rispondi_entro_la_giornata",{due:q.due+1})}</p><p>${esc(q.txt)}</p><p class="muted">${reqHint(q)}</p></div><div class="rq-b">${reqBtns(q)}</div></li>`; }
function reqsHTML(){
  const t=G.T[0], S=successF(t);
  const reqs=(G.req||[]).filter(q=>q.team===0 && q.st==='open' && q.kind!=='acquisto' && q.kind!=='offerta').sort((a,b)=>a.due-b.due);
  return `<section class="card" id="reqs"><p class="eyebrow">${t_("ui.richieste_in_attesa")}</p><p class="muted">${t_("ui.chi_vince_chiede_di",{v:S>0.45?`${t_("ui.in_gran_forma_le")}`:S>0.1?`${t_("ui.in_buona_forma")}`:S<-0.2?`${t_("ui.in_difficolta_le_richieste")}`:`${t_("ui.nella_media")}`})}</p><ul class="rql">${reqs.length?reqs.map(reqItem).join(''):`<p class="empty">${t_("ui.nessuna_richiesta_in_attesa")}</p>`}</ul></section>`;
}
/* ---------- Società › Conti ---------- */
/* fascia comune di Società: stagione, giornata, club e clima (dati già nella testata) */
function socChips(){ const t=G.T[0]; return [t_("ui.stagione",{season:G.season}),'G'+G.md+' / 14',esc(t.n),`<span class="gold-t">${t_("ui.clima_2",{morLevel:morLevel(clubClimate(t))})}</span>`]; }
/* ciambella del patrimonio (solo disegno: strutture, cartellini e cassa positiva; i debiti a parte) */
function donutHTML(parts, mid, lbl){ const tot=parts.reduce((s,p)=>s+Math.max(0,p[1]),0)||1, C=2*Math.PI*42; let off=0;
  const seg=parts.map(([,v,c])=>{ const L=Math.max(0,v)/tot*C, h=`<circle r="42" cx="60" cy="60" fill="none" stroke="var(${c})" stroke-width="16" stroke-dasharray="${L.toFixed(2)} ${(C-L).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`; off+=L; return h; }).join('');
  return `<div class="ev-donut"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(lbl)}"><g transform="rotate(-90 60 60)"><circle r="42" cx="60" cy="60" fill="none" stroke="var(--ev-border)" stroke-width="16"/>${seg}</g></svg><div class="ev-donut-c">${t_("ui.valore_totale",{mid:mid})}</div></div>`; }
function vConti(){
  const t=G.T[0], f=finInit(t), r=wageRatio(t), lv=ratioLevel(r), arr=arrears(t), debt=bankDebt(t);
  const cats=(o)=>Object.entries(o).sort((a,b)=>b[1]-a[1]);
  const inc=cats(f.sea.inc), exp=cats(f.sea.exp), ti=inc.reduce((s,x)=>s+x[1],0), te=exp.reduce((s,x)=>s+x[1],0);
  const left=Math.max(0,14-G.md), proj=t.cash+left*(roundIncome(t)-wageBill(t)-staffCost(t))-f.loans.reduce((s,l)=>s+l.rate*Math.min(l.left,left),0);
  const chk=[0,1,2,3,4].map(k=>{ const c=f.checks.find(x=>x.k===k&&x.s===G.season), when=k<4?t_("ui.dopo_la_giornata",{v:CHECKS[k]}):t_("ui.a_fine_stagione");
      return `<li><span>${CHECK_LBL[k]}</span><span class="muted">${when}</span><b class="${c?(c.ok?'ok':'ko'):''}">${c?(c.ok?t_("ui.in_regola"):c.excl?'esclusione':'−'+c.pts+' punti'+(c.next?t_("ui.prossima_stagione"):'')):'—'}</b></li>`; }).join('');
  const mx=Math.max(ti,te,1);
  return pageHead(t_("ui.societa_conti"),t_("ui.la_salute_finanziaria"),t_("ui.situazione_economica_giornata_di",{md:G.md}),{chips:socChips()})
  +kpiHTML([[t_("ui.cassa_2"),`<span class="${t.cash<0?'bad':''}">${t_("ui.cr_5",{cash:kcr(t.cash)})}</span>`,'','hi'],[t_("ui.valore_della_societa"),`<span class="${netValue(t)<0?'bad':''}">${t_("ui.cr_6",{netValue:kcr(netValue(t))})}</span>`],[t_("ui.stipendi_e_ricavi"),`<span class="sem ${lv}">${Math.round(r*100)}%</span>`],[t_("ui.stipendi_arretrati"),kcr(arr),arr>0?t_("ui.da_pagare_prima_del"):t_("ui.tutti_pagati"),arr>0?'bad':''],
     [t_("ui.debiti_con_la_banca"),kcr(debt),(f.loans.length?f.loans.map(l=>t_("ui.rate_da",{left:l.left,rate:fmt(l.rate)})).join(' · '):t_("ui.nessun_finanziamento"))+(f.ins?` · insoluto ${kcr(f.ins)}`:''),f.ins?'bad':''],[t_("ui.previsione_a_fine_stagione"),kcr(proj)+' cr',t_("ui.saldo_di_cassa_previsto")],[t_("ui.popolarita"),Math.round(t.pop)+'/100',t_("ui.tifosi_della_societa")],[t_("ui.penalizzazione"),f.pen?'−'+f.pen+' pt':t_("ui.nessuna_2"),f.penNext?t_("ui.gia_maturati_punti_per",{penNext:f.penNext}):t_("ui.stipendi_in_regola_ai"),f.pen?'bad':'']],'ev-kpis4')+`<section class="ev-grid2">${patrimonioHTML(t)}
   <div class="card ev-panel"><p class="ev-kick">${t_("ui.quadro_della_stagione",{season:G.season})}</p><h2 class="ev-ptitle">${t_("ui.il_saldo_della_gestione")}</h2>
    <div class="ev-flow"><div><span>${t_("ui.entrate")}</span>${t_("ui.cr_2",{ti:fmt(ti)})}</div><span class="ev-flowbar"><span style="width:${(ti/mx*100).toFixed(1)}%"></span></span>
    <div><span>${t_("ui.uscite")}</span>${t_("ui.cr_3",{te:fmt(te)})}</div><span class="ev-flowbar out"><span style="width:${(te/mx*100).toFixed(1)}%"></span></span></div>
    <p class="strong">${t_("ui.saldo_della_stagione")} <span class="${ti-te<0?'bad':''}">${kcr(ti-te)}</span></p><p class="muted small">${t_("ui.barre_in_proporzione_alla")}</p></div></section>
  <section class="ev-grid2">
   <div class="card ev-panel"><h2 class="ev-ptitle">${t_("ui.entrate_della_stagione")}</h2><table class="bil"><thead><tr><th>${t_("ui.voce")}</th><th class="num">${t_("ui.cr_4")}</th></tr></thead><tbody>${inc.map(([k,v])=>`<tr><td>${esc(tVoce(k))}</td><td class="num">${fmt(v)}</td></tr>`).join('')||'<tr><td class="muted">—</td><td></td></tr>'}<tr class="tot"><td>${t_("ui.totale")}</td><td class="num">${fmt(ti)}</td></tr></tbody></table></div>
   <div class="card ev-panel"><h2 class="ev-ptitle">${t_("ui.uscite_della_stagione")}</h2><table class="bil"><thead><tr><th>${t_("ui.voce")}</th><th class="num">${t_("ui.cr_4")}</th></tr></thead><tbody>${exp.map(([k,v])=>`<tr><td>${esc(tVoce(k))}</td><td class="num">${fmt(v)}</td></tr>`).join('')||'<tr><td class="muted">—</td><td></td></tr>'}<tr class="tot"><td>${t_("ui.totale")}</td><td class="num">${fmt(te)}</td></tr></tbody></table></div>
  </section>
  <section class="ev-grid2">
   <div class="card ev-panel"><h2 class="ev-ptitle">${t_("ui.come_leggere_stipendi_e")}</h2><p class="big sem ${lv}">${Math.round(r*100)}%</p><p class="muted">${t_("ui.stipendi_e_staff_a",{wageBill:kcr(wageBill(t)+staffCost(t)),roundIncome:kcr(roundIncome(t))})}</p></div>
   <div class="card ev-panel"><h2 class="ev-ptitle">${t_("ui.controlli_sugli_stipendi")}</h2><p class="muted">${t_("ui.come_in_serie_a")}</p><ul class="chk">${chk}</ul></div>
  </section>
  <section class="card ev-panel"><h2 class="ev-ptitle">${t_("ui.ultime_decisioni_e_movimenti")}</h2><ul class="news">${f.hist.slice(0,12).map(h=>`<li><span class="md">${t_("ui.g_2",{md:h.md})}</span>${esc(h.t)}</li>`).join('')||`<li class="muted">${t_("ui.ancora_nessuna")}</li>`}</ul></section>`;
}
function vTaccuino(){
  const ids=new Set([...Object.keys(G.note).filter(k=>G.note[k]),...Object.keys(G.seen).filter(k=>G.seen[k].f>0)]);
  const list=[...ids].map(id=>G.P[id]).filter(p=>p&&!p.retired).sort((a,b)=>(G.seen[b.id]?.f||0)-(G.seen[a.id]?.f||0));
  return pageHead(t_("ui.mercato_appunti"),t_("ui.taccuino_del_presidente"),t_("ui.le_giocate_di_classe_2",{v:list.length?list.length+(list.length===1?' giocatore':' giocatori')+' segnati':t_("ui.ancora_nessun_giocatore")}))+`<section class="card ev-panel"><div class="head"><h2 class="ev-ptitle">${t_("ui.giocatori_seguiti")}</h2><p class="muted">${t_("ui.le_giocate_di_classe")}</p></div>
  ${list.length?`<div class="tw"><table class="ev-ptab tacc"><thead><tr><th>${t_("ui.r")}</th><th>${t_("ui.giocatore")}</th><th class="num">${t_("ui.eta")}</th><th>${t_("ui.squadra")}</th><th class="num">${t_("ui.giocate_di_classe")}</th><th class="num">${t_("ui.azioni_viste")}</th><th class="num">${t_("ui.partite_viste")}</th><th>${t_("ui.potenziale")}</th><th class="num">${t_("ui.valore")}</th></tr></thead><tbody>
  ${list.map(p=>{const s=G.seen[p.id]||{f:0,a:0,m:0}; return `<tr data-act="sheet" data-pid="${p.id}"><td class="mh">${roleTag(p.r)}</td><td class="nm pc">${plCell(p,nameBtn(p),`${ROLE_NAME[p.r]} · ${p.age} anni · ${p.team==null?'svincolato':p.team===0?'tuo':esc(G.T[p.team].n)}`)}</td><td class="num mh">${p.age}</td><td class="mh">${p.team==null?t_("ui.svincolato"):p.team===0?`${t_("ui.tuo")}`:clubLink(p.team)}</td><td class="num gold strong mv" data-l="${t_("ui.giocate")}">${s.f}</td><td class="num" data-l="${t_("ui.azioni_viste")}">${s.a}</td><td class="num" data-l="${t_("ui.partite")}">${s.m||0}</td><td data-l="${t_("ui.potenziale")}">${starsHTML(p)}</td><td class="num" data-l="${t_("ui.valore")}">${kcr(value(p))}</td></tr>`;}).join('')}</tbody></table></div>`
  :`<p class="empty">${t_("ui.ancora_vuoto_guarda_una")}</p>`}</section>`;
}
Object.assign(VIEWS,{'squadra/rosa':vRosa,'squadra/allenatore':vAllenatore,'squadra/spogliatoio':vSpogliatoio,'mercato/cerca':vMercato,'mercato/taccuino':vTaccuino,'lega/classifica':vClassifica,'lega/arbitri':vArbitri,'societa/conti':vConti});

function vSheet(){
  const p=G.P[sheetPid]; if(!p) return '';
  const mine=isMine(p), n=obsN(p), s=G.seen[p.id]||{f:0,a:0,m:0};
  /* v0.4.3.0 (S1): le 57 caratteristiche nei 7 gruppi della specifica, scala 0–100; i dati fisici sempre visibili, le skill con la forchetta dell'osservatore */
  const at=skSheetHTML(p);
  const pv=potView(p);
  const action = mine
    ? `<button class="btn ghost" data-act="sell" data-pid="${p.id}">${t_("ui.cerca_un_acquirente")}</button>`
    : `<button class="btn" data-act="buyopen" data-pid="${p.id}">${(G.req||[]).some(q=>q.kind==='acquisto'&&q.pid===p.id&&q.st==='open')?t_("ui.riprendi_la_trattativa"):p.team==null?t_("ui.proponi_un_contratto"):t_("ui.apri_la_trattativa")}</button>`;
  const capt=p.team!=null&&G.T[p.team].cap===p.id?t_("ui.capitano"):p.team!=null&&G.T[p.team].vcap===p.id?t_("ui.vicecapitano"):'';
  const row=(k,v)=>`<div class="ev-kv"><span>${k}</span><strong>${v}</strong></div>`;
  return `<div class="sh-in" role="dialog" aria-label="${t_("ui.scheda_di",{fn:esc(p.fn),ln:esc(p.ln)})}">
   <button class="x" data-act="close" aria-label="${t_("ui.chiudi")}">${t_("ui.x")}</button>
   <div class="sh-hero"><span class="sh-face" aria-hidden="true">${plFace(p)}</span><div class="sh-id"><p class="eyebrow">${t_("ui.scheda_del_giocatore",{v:mine?t_("ui.squadra"):t_("ui.mercato")})}</p><h2>${esc(p.fn)} ${esc(p.ln)}</h2>
    <p class="sh-sub">${t_("ui.anni_2",{v:ROLE_NAME[p.r],age:p.age,v2:p.team==null?'svincolato':clubLink(p.team)})}</p><p class="sh-tags"><span class="ev-pill">${p.r} · ${ROLE_NAME[p.r]}</span>${capt?`<span class="ev-pill">${capt}</span>`:''}</p></div></div>
   ${p.inj>0?`<p class="badge-s inj">${t_("ui.infortunato_fuori_ancora",{inj:p.inj,v:p.inj>1?'giornate':'giornata'})}</p>`:''}${p.sq>0?`<p class="badge-s sq">${t_("ui.squalificato_per_la_prossima_2")}</p>`:''}
   <div class="sh-top"><div><p class="eyebrow">${t_("ui.valutazione_2")}</p><p class="big">${ovrTxt(p)}</p></div><div><p class="eyebrow">${t_("ui.potenziale")}</p>${starsHTML(p)}<p class="muted">${pv?t_("ui.affidabilita",{v:pv[2]}):t_("ui.non_valutato")}</p></div><div><p class="eyebrow">${t_("ui.valore")}</p><p class="big">${kcr(value(p))}</p></div></div>
   <div class="sh-btns"><button class="btn ghost" data-act="obs" data-pid="${p.id}" ${n>=3?'disabled':''}>${n>=3?t_("ui.relazione_completa"):t_("ui.manda_l_osservatore_rimaste",{scoutLeft:G.scoutLeft})}</button><button class="btn ghost" data-act="note" data-pid="${p.id}">${G.note[p.id]?t_("ui.togli_dal_taccuino"):t_("ui.metti_nel_taccuino")}</button></div>
   <section class="sh-sec"><h3>${t_("ui.caratteristiche")}</h3><p class="muted small">${t_("sk.scala",{v:mine?'':t_("ui.la_banda_si_stringe")})}</p>${mine||n?`<p class="sk-ruolo"><span class="ev-pill">${t_("sk.ruolo_migliore",{v:t_("sk.r."+skRuoloMigliore(p))})}</span></p>`:''}<div class="sh-attrs">${at}</div></section>
   <section class="sh-sec"><h3>${t_("ui.profilo")}</h3><div class="phys">${row(t_("ui.tipo_di_giocatore"),mine||n?esc(skProfName(p)):`<span class="muted">${t_("ui.lo_dira_l_osservatore")}</span>`)}${row(t_("ui.carattere"),mine||n?esc(character(p).join(' · ')):`<span class="muted">${t_("ui.lo_dira_l_osservatore")}</span>`)}</div>
   ${mine?`<p class="eyebrow">${t_("ui.morale_2")}</p><p><b>${cap1(morLevel(p.mor))}</b> <span class="muted">(${fDec(p.mor.toFixed(1))}/20)</span> ${bar(p.mor,20,'mor '+(p.mor<9?'warn':''))}</p>${p.morC&&p.morC.length?`<ul class="morc">${p.morC.slice(0,4).map(c=>`<li><span class="${c.d>0?'up':'dn'}">${c.d>0?'▲':'▼'}</span> ${esc(c.t)} <span class="muted">${t_("ui.g_3",{md:c.md})}</span></li>`).join('')}</ul>`:`<p class="muted">${t_("ui.nessuna_novita_recente")}</p>`}`:''}
   <p class="eyebrow">${t_("ui.visto_da_te_in")}</p><p>${s.a?`<span class="gold strong">${s.f}</span> ${t_("ui.giocate_di_classe_su",{a:s.a,m:s.m||0})}`:`<span class="muted">${t_("ui.non_l_hai_ancora")}</span>`}</p></section>
   <section class="sh-sec"><h3>${mine?t_("ui.contratto_e_carriera"):t_("ui.carriera")}</h3>${mine?row(t_("ui.stipendio_per_giornata"),fmt(p.wg)+' cr')+row(t_("ui.durata_residua"),p.ct+(p.ct===1?' anno':' anni')):''}
   ${statsHTML(p)}</section>
   ${mine&&p.peg?`<p class="badge-s peg">${t_("ui.in_pegno_alla_banca_2")}</p>`:''}<div class="sh-act">${action}</div></div>`;
}

/* scheda del giocatore: stagione in corso, carriera e stagioni passate (presenze e gol sono pubblici; i voti si vedono nelle pagelle) */
function statsHTML(p){ if(hidNow()) return `<p class="muted small">${t_("ui.statistiche_dopo_la_visione")}</p>`;
  const S=seaStat(p), C=carStat(p), H=(p.sh||[]).slice().reverse(), vt=(p.rts||[]).filter(x=>x!=null);
  const club=c=>c==null?`<span class="muted">${t_("ui.svincolato_2")}</span>`:G.T[c]?clubLink(c):'–';
  return `<div class="stx"><div><p class="eyebrow">${t_("ui.stagione",{season:G.season})}</p><p>${t_("ui.presenze_gol_media_voto",{a:S.a,g:S.g,v10:v10(S.v)})}</p></div><div><p class="eyebrow">${t_("ui.carriera")}</p><p>${t_("ui.presenze_gol_media_voto",{a:C.a,g:C.g,v10:v10(C.v)})}</p></div></div>
   <p class="muted small">${t_("ui.ultimi_voti",{v:vt.length?vt.map(x=>fDec(x)).join(' · '):'–'})}</p>
   ${H.length?`<div class="tw"><table class="tab sht"><thead><tr><th>${t_("ui.stagione_2")}</th><th>${t_("ui.club")}</th><th class="num">${t_("ui.pres")}</th><th class="num">${t_("ui.gol")}</th><th class="num">${t_("ui.media")}</th></tr></thead><tbody>${H.map(h=>`<tr class="nohov"><td>${h[0]}</td><td>${club(h[1])}</td><td class="num">${h[2]}</td><td class="num">${h[3]}</td><td class="num">${v10(h[4])}</td></tr>`).join('')}</tbody></table></div>`:''}`; }

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
  return `<svg class="ev-formsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t_("ui.modulo",{mod:esc(mod)})}"><rect x="1" y="1" width="${W-2}" height="${H-2}" rx="4" fill="var(--ev-pitch)" stroke="var(--ev-chalk)" stroke-width="1.2"/><path d="M1 ${H/2}H${W-1}M${W/2-18} 1v14h36V1M${W/2-18} ${H-1}v-14h36v14" fill="none" stroke="var(--ev-chalk)" stroke-width="1" opacity=".75"/><circle cx="${W/2}" cy="${H/2}" r="11" fill="none" stroke="var(--ev-chalk)" stroke-width="1" opacity=".75"/>${dots.map(([x,y],i)=>`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${i?c:'var(--ev-brand-gold)'}" stroke="var(--ev-chalk)" stroke-width="1.4"/>`).join('')}</svg>`; }
function plCell(p, inner, small){ return `<div class="ev-athlete"><span class="ev-face" aria-hidden="true">${plFace(p)}</span><div class="ev-ath-t"><b>${inner||nameBtn(p)}</b><small>${small!=null?small:ROLE_NAME[p.r]+' · '+p.age+' anni'}</small></div></div>`; }

/* ---------- tema (0.4.2.4, G1a): un solo sistema per tutto il gioco ----------
   di base segue il dispositivo (prefers-color-scheme); il pulsante della testata (e quello del visore) mette data-theme
   sulla pagina e lo ricorda in localStorage presidente-pref-tema. shell.html lo applica già prima dello stile. */
const THEME_KEY='presidente-pref-tema';
function themeNow(){ const d=document.documentElement.dataset.theme; if(d==='light'||d==='dark') return d; try{ return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'; }catch(_){ return 'light'; } }
function themeLbl(){ return themeNow()==='dark' ? t_("ui.tema_chiaro") : t_("ui.tema_scuro"); }
function themeBtn(){ return `<button class="tema" data-act="tema" id="theme-btn" aria-label="${themeLbl()}" title="${themeLbl()}">${ico(themeNow()==='dark'?'sun':'moon')}</button>`; }
function themePaint(){ const b=$('#theme-btn'); if(b) b.outerHTML=themeBtn(); const v=$('#v-tema'); if(v) v.textContent=themeLbl(); if(typeof viewer!=='undefined' && viewer && typeof draw==='function') draw(); }
function themeToggle(){ const t=themeNow()==='dark'?'light':'dark'; document.documentElement.dataset.theme=t; try{ localStorage.setItem(THEME_KEY,t); }catch(_){} themePaint(); }
(function(){ try{ const t=localStorage.getItem(THEME_KEY); if(t==='light'||t==='dark') document.documentElement.dataset.theme=t; }catch(_){}
  try{ matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{ if(!document.documentElement.dataset.theme) themePaint(); }); }catch(_){} })();
/* pulsante principale (testata e Scrivania): gioca la giornata, oppure prima convalida il preventivo o scegli la nuova società */
function playBtn(cls){ const t=G.T[0], end=G.md>=G.sched.length, c='btn go'+(cls?' '+cls:'');
  return G.fired?`<button class="${c}" disabled>${t_("ui.scegli_la_nuova_societa")}</button>`:G.md===0&&needBudget(t)?`<button class="${c}" data-act="go" data-a="societa" data-s="bilancio">${t_("ui.convalida_il_preventivo")}</button>`:`<button class="${c}" data-act="advance">${end?t_("ui.chiudi_la_stagione"):t_("ui.gioca_la_giornata",{md:G.md+1})}</button>`; }
/* ---------- risultato nascosto fino alla visione (0.4.5.2, V0b, PROBLEMI_NOTI n. 24) ----------
   playMatchday() scrive subito tutto nello stato; G.hid = 'stagione-giornata' segna che la giornata appena giocata non è ancora stata vista.
   Finché è così render() mostra la situazione di PRIMA della giornata (tabella e forma ricalcolate togliendo G.last) e le pagine
   che leggono i risultati (notizie, calendari, marcatori, arbitri, statistiche) li nascondono. */
const hidNow = ()=>!!(G && G.hid && G.last && G.hid===G.season+'-'+G.md);
function hidReveal(){ if(G && G.hid){ G.hid=null; save(); } }
function hidFormBefore(t){
  if(!G.res || G.res.length!==G.md) return (t.form||[]).slice(0,-1);
  const f=[]; G.res.slice(0,-1).forEach(day=>{ const m=day.find(x=>x.h===t.id||x.a===t.id); if(!m) return; const gf=m.h===t.id?m.gh:m.ga, gs=m.h===t.id?m.ga:m.gh; f.push(gf>gs?'V':gf<gs?'P':'N'); });
  return f.slice(-5); }
function hidSwap(){
  const sv=G.T.map(t=>[t,t.tab,t.form]);
  G.T.forEach(t=>{ const m=G.last.find(x=>x.h===t.id||x.a===t.id); if(!m) return;
    const gf=m.h===t.id?m.gh:m.ga, gs=m.h===t.id?m.ga:m.gh, r=Object.assign({},t.tab);
    r.g--; r.gf-=gf; r.gs-=gs; if(gf>gs){ r.v--; r.pt-=3; } else if(gf<gs) r.p--; else { r.n--; r.pt-=1; }
    t.form=hidFormBefore(t); t.tab=r; });
  return ()=>sv.forEach(([t,tab,form])=>{ t.tab=tab; t.form=form; }); }
function render(){
  if(!hidNow()) return renderBase();
  const undo=hidSwap(); HIDSW=true; try{ renderBase(); } finally{ HIDSW=false; undo(); if(HIDSAVE){ HIDSAVE=false; save(); } } }
function renderBase(){
  const on=!!G; $('#top').hidden=!on; $('#tabs').hidden=!on; $('#subtabs').hidden=!on; document.body.classList.toggle('ingame',on);
  if(!G){ $('#view').innerHTML = startScreen(); $('#sheet').hidden=true; ['#negov','#modal'].forEach(s=>{ const x=$(s); if(x) x.remove(); }); return; }
  if(NAV.first) navStart();
  if(!AREAS[area] || !VIEWS[area+'/'+sub]){ area='scrivania'; sub='home'; }
  const t=G.T[0], pos=standings().findIndex(x=>x.id===0)+1;
  const end=G.md>=G.sched.length;
  const ms=activeMissions(t), mu=ms.filter(m=>m.kind==='rinforzo'&&m.due-G.md<=1);
  $('#top').innerHTML = `<div class="brand"><span class="wm">${LOGO_SVG}EVIVORA</span><span class="ver" title="${t_("ui.versione_del_gioco")}">${t_("ui.v_2",{VERSION:VERSION})}</span><button class="club link" data-act="club" data-id="0" title="${t_("ui.il_profilo_pubblico_del")}"><span class="crest" aria-hidden="true">${crestHTML(0)}</span><span class="cn">${esc(t.n)}</span></button></div>
   <div class="stat"><span>${t_("ui.stagione",{season:G.season})}</span><span>${t_("ui.giornata_14",{md:G.md})}</span><span>${t_("ui.posto",{pos:pos})}</span><span class="cash">${t_("ui.cr_5",{cash:kcr(t.cash)})}</span><span class="clima" title="${t_("ui.clima_della_societa_morale")}">${t_("ui.clima_3",{morLevel:morLevel(clubClimate(t))})} ${bar(clubClimate(t),20,'mor '+(clubClimate(t)<9?'warn':''))}</span></div>
   <div class="acts">${t.ult&&t.ult.st==='on'?`<button class="mchip urg" data-act="go" data-a="societa" data-s="banca" title="${t_("ui.ultimatum_della_banca")}">${t_("ui.ultimatum_della_banca_2")}</button>`:t.own.bank>=25?`<button class="mchip" data-act="go" data-a="societa" data-s="banca" title="${t_("ui.quote_della_banca")}">${t_("ui.banca_2",{bank:fmtV(t.own.bank)})}</button>`:''}${ms.length?`<button class="mchip ${mu.length?'urg':''}" data-act="go" data-a="scrivania" title="${t_("ui.impegni_in_corso")}">⚑ ${mu.length?t_("ui.impegno_in_scadenza"):ms.length===1?t_("ui.1_impegno_in_corso"):ms.length+` ${t_("ui.impegni_in_corso_2")}`}</button>`:''}
   ${playBtn('')}${themeBtn()}<button class="more" data-act="menu" aria-label="${t_("ui.altre_opzioni")}" title="${t_("ui.altre_opzioni")}">⋯</button></div>`;
  const nb=secBadge();
  $('#tabs').innerHTML = Object.entries(AREAS).map(([k,A])=>`<button class="${area===k?'on':''}" data-act="go" data-a="${k}"${area===k?' aria-current="page"':''}>${AREA_ICON[k]}<span class="tl">${A.n}</span>${k==='scrivania'&&nb?`<span class="tabn" title="${t_("ui.cose_bloccanti_o_urgenti")}">${nb}</span>`:''}</button>`).join('');
  const subs=AREAS[area].subs, st=$('#subtabs');
  st.hidden=subs.length<2;
  st.innerHTML = subs.length<2?'':subs.map(([k,l])=>`<button class="${sub===k&&clubView==null?'on':''}" data-act="go" data-a="${area}" data-s="${k}"${sub===k&&clubView==null?' aria-current="page"':''}>${l}${area==='mercato'&&k==='trattative'&&openDeals().length?` <span class="tabn n">${openDeals().length}</span>`:''}</button>`).join('');
  $('#view').innerHTML = clubView!=null ? vProfile(clubView) : VIEWS[area+'/'+sub]();
  { let ov=$('#negov'); const h=(G.fired&&clubView==null)?vFired():(bnegOn&&G.bneg)?vBankNeg():negId?vNeg():''; if(h){ if(!ov){ ov=document.createElement('div'); ov.id='negov'; document.body.appendChild(ov); } ov.innerHTML=h; const ch=ov.querySelector('.neg-chat'); if(ch) ch.scrollTop=ch.scrollHeight; negSyncLbl(); } else if(ov) ov.remove(); }
  { let mo=$('#modal'); const h=modal?vModal():''; if(h){ if(!mo){ mo=document.createElement('div'); mo.id='modal'; document.body.appendChild(mo); } mo.innerHTML=h; } else if(mo) mo.remove(); }
  const sh=$('#sheet'); if(sheetPid!=null){ sh.innerHTML=vSheet(); sh.hidden=false; } else { sh.hidden=true; sh.innerHTML=''; }
  if(viewer && onMatchPage()) attachViewer();
  if(focusReq!=null){ const el=$('#rq-'+focusReq); focusReq=null; if(el) el.scrollIntoView({block:'center'}); }
  navSync();
}
function startScreen(){
  /* 0.4.2.5 (G1b): scheda centrata come nella 022b, senza testata e menu del gioco; gli stessi campi di prima (club e segretaria) */
  return `<div class="start"><div class="start-band"><span class="start-logo" aria-hidden="true">${LOGO_SVG}</span><div class="start-id"><p class="eyebrow">${t_("ui.bozza_giocabile_un_solo")}</p><h1>EVIVORA</h1><p class="tagline">${t_("ui.sei_il_presidente")}</p></div>${window.PRES_CONF?'':themeBtn()}</div>
  <div class="start-body"><h2 class="start-t">${t_("ui.inizia_la_tua_carriera")}</h2>
  <p>${t_("ui.compri_giocatori_scegli_l")}</p>
  <form id="start-form"><label for="club-name">${t_("ui.nome_del_tuo_club")}</label><input id="club-name" maxlength="28" value="FC Presidente" autocomplete="off">
   <label for="sec-name">${t_("ui.nome_della_tua_segretaria")}</label><input id="sec-name" maxlength="20" value="Giulia" autocomplete="off"><button class="btn go" type="submit">${t_("ui.fonda_il_club")}</button></form>
  <p class="muted">${t_("ui.i_dati_restano_solo",{dove:t_("ui.dati_nel_browser"),VERSION:VERSION})}</p></div></div>`;
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
    case 'note': { const id=+el.dataset.pid; G.note[id]=!G.note[id]; save(); render(); toast(G.note[id]?t_("ui.aggiunto_al_taccuino"):t_("ui.tolto_dal_taccuino")); break; }
    case 'sell': findBuyer(+el.dataset.pid); break;
    case 'build': build(el.dataset.k); break;
    case 'negopen': { const q=(G.req||[]).find(x=>x.id===+el.dataset.id); if(q){ openNeg(q); negId=q.id; save(); render(); } break; }
    case 'negclose': negId=null; render(); break;
    case 'negprop': { const q=(G.req||[]).find(x=>x.id===negId); if(q&&q.kind==='offerta'){ offPropose(q,+$('#neg-v').value); save(); render(); break; } if(q){ const v=+$('#neg-v').value, oo=$('#neg-oo')?+$('#neg-oo').value:0, m=$('#neg-mot')?$('#neg-mot').value:''; negPropose(q,v,oo,m||null); save(); render(); } break; }
    case 'negacc': { const q=(G.req||[]).find(x=>x.id===negId); if(q&&q.neg){ q.neg.st='deal'; if(q.kind==='offerta'){ resolveReq(q,'deal',false,{v:q.neg.c,opened:true,acc:true}); save(); render(); break; } resolveReq(q,'deal',false,{v:q.neg.c,oo:0,opened:true,acc:true}); save(); render(); } break; }
    case 'negref': case 'negrefm': { const q=(G.req||[]).find(x=>x.id===negId); if(q&&q.neg&&q.kind==='offerta'){ const m=(document.querySelector('input[name=neg-m]:checked')||{}).value; q.neg.st='no'; resolveReq(q,m?'rifm':'rif',false,{opened:true,motive:m||null}); save(); render(); break; } if(q&&q.neg){ const m=(document.querySelector('input[name=neg-m]:checked')||{}).value, oo=$('#neg-roo')?+$('#neg-roo').value:0; q.neg.st='no'; if(el.dataset.act==='negref') resolveReq(q,'rif',false,{opened:true}); else resolveReq(q,'rifm',false,{opened:true,motive:m,oo}); save(); render(); } break; }
    case 'buyopen': { const p=G.P[+el.dataset.pid]; if(G.T[0].pl.length>=24){ toast(t_("ui.rosa_piena_massimo_24")); break; } const r=buyOpen(p); negId=r.id; sheetPid=null; save(); render(); break; }
    case 'buyprop': { const q=(G.req||[]).find(x=>x.id===negId); if(q){ buyPropose(q,+$('#neg-v').value,$('#neg-oo')?+$('#neg-oo').value:0); save(); render(); } break; }
    case 'buyacc': { const q=(G.req||[]).find(x=>x.id===negId); if(q){ buyAccept(q); save(); render(); } break; }
    case 'buyquit': { const q=(G.req||[]).find(x=>x.id===negId); if(q){ buyQuit(q); save(); render(); } break; }
    case 'missmkt': filt.r=el.dataset.r; filt.src='all'; filt.age='40'; go('mercato','cerca'); break;
    case 'req': { const q=(G.req||[]).find(x=>x.id===+el.dataset.id); if(q){ resolveReq(q,el.dataset.c,false); save(); render(); toast(q.out||t_("ui.fatto")); } break; }
    case 'cands': showCands(); break;
    case 'nocands': G.cands=null; save(); render(); break;
    case 'hire': hireCoach(+el.dataset.i); break;
    case 'watch': openViewer(+el.dataset.i); break;
    case 'vplay': vTogglePlay(el); break;
    case 'vkick': kickoff(); break;
    case 'vspd': vSpeed(+el.dataset.s, el); break;
    case 'vnext': vNext(); break;
    case 'vclose': stopViewer(); viewer=null; hidReveal(); render(); break;
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
  if(e.target.id==='start-form'){ const n=$('#club-name').value.trim()||t_("ui.fc_presidente"), sn=($('#sec-name')?$('#sec-name').value.trim():'').slice(0,20)||t_("ui.giulia"); newGame(n, (Date.now()%2147483647)|0); G.sec={n:sn}; NAV.first=false; area='scrivania'; sub='home'; save(); render(); }
});
document.addEventListener('keydown', e=>{ if(e.key!=='Escape') return; if(modal){ modal=null; confirmReset=false; render(); } else if(sheetPid!=null){ sheetPid=null; render(); } });
window.addEventListener('resize', ()=>{ if(viewer) draw(); });


