/* ================= VISORE PARTITA: 2D continuo, replay 3D, intervista ================= */
const mkey = m=>G.season+'-'+G.md+'-'+m.h;
const REPLAY_RATE=1.4;   // il replay va al rallentatore
// x1 = tempo reale (90' in 90'), x2 = la partita dura 15', x4 = la partita dura 5'
/* 0.4.2.0: con l'orologio vero 1x mostra la partita a metà del tempo reale (circa 48 minuti); 2x e 4x durano come prima */
/* 0.4.2.3 (R6a): con le pause accorciate la durata vera dipende dalla partita (vDurMin, calcolata in vPrep) */
function tickRateS(v,s){ return s===1 ? 2/DT : s===2 ? v.nT/900 : v.nT/300; }
function tickRate(v){ return tickRateS(v,v.speed); }
function vSpeedTxt(v,s){ return 'Velocità '+s+'×'; }   /* 0.4.2.3: niente più «Partita in circa N minuti» (Max) */
/* 0.4.2.0: i frame della simulazione sono a 16 bit (centimetri): vFr li riporta in metri (con orientamento e tuffo), con una piccola memoria */
function vFr(v,k){ const c=v.fc||(v.fc=new Map()); let f=c.get(k); if(f) return f; const s=v.sim.frames[k]; if(!s) return null;
  f=frDecode(s, v.sim.cols.length); c.set(k,f); if(c.size>64) c.delete(c.keys().next().value); return f; }
/* velocità preferita (0.4.1.1): preferenza dell'interfaccia nel browser, mai dentro G né online; la prima volta 2x */
const SPEED_KEY='presidente-pref-vel';
function vPrefSpeed(){ try{ const s=+localStorage.getItem(SPEED_KEY); if(s===1||s===2||s===4) return s; }catch(_){} return 2; }
function vSavePrefSpeed(s){ try{ localStorage.setItem(SPEED_KEY,String(s)); }catch(_){} }
const SHOT_EV=new Set(['goal','save','wide','post','block','miss']);
const HL_EV=new Set(['goal','save','post','pen','miss','flash','rc','block']);
function css(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
const reduced = ()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const MENT=['prudente','equilibrata','offensiva'];

function openViewer(i){
  const m=G.last&&G.last[i]; if(!m) return;
  if(!m.inp){ toast('Questa partita è stata giocata con la versione precedente del gioco e non si può rivedere.'); return; }
  stopViewer();
  const sim=simMatch(m.inp, m.seed, true);
  const info={};
  for(const ti of [0,1]){ const ps=m.inp.t[ti].players.slice().sort((a,b)=>'PDCA'.indexOf(a.r)-'PDCA'.indexOf(b.r)||b.ovr0-a.ovr0); ps.forEach((p,k)=>info[p.id]={ln:p.ln,num:k+1,t:ti,gk:p.r==='P',id:p.id,h:p.h||180}); }
  const nT=sim.frames.length, team=sim.cols.map(id=>info[id].t);
  const p0=new Int32Array(nT+1), pt=new Int32Array(nT+1);
  for(let k=0;k<nT;k++){ const o=sim.owners[k]; p0[k+1]=p0[k]+(o>=0&&team[o]===0?1:0); pt[k+1]=pt[k]+(o>=0?1:0); }
  const hl=new Uint8Array(nT); sim.ev.forEach(e=>{ if(HL_EV.has(e.type)||e.type==='wide'&&false) for(let k=Math.max(0,e.t-12);k<Math.min(nT,e.t+6);k++) hl[k]=1; });
  viewer={m, sim, info, team, p0, pt, hl, nT, t:0, speed:vPrefSpeed(), playing:false, phase:'pre', preT:0, evI:0, sc:[0,0], log:[], last:performance.now(), raf:0,
    rep:null, pend:null, pq:[], wins:[], sp3d:null, iv:null, key:mkey(m), live:true, goalUntil:-1, cap:null, forms:[sim.plans[0].form, sim.plans[1].form],
    st:[0,1].map(()=>({sh:0,sot:0,cor:0,fou:0,yc:0,rc:0,off:0})), post:null, nextLbl:''};
  vPrep(viewer);
  G.wm=G.wm||{}; if(G.wm[viewer.key]==null){ G.wm[viewer.key]=-1; save(); }
  area='lega'; sub='giornata'; lastSub.lega='giornata'; clubView=null; clubBack=null; sheetPid=null; setupMatch3D(); render();
  requestAnimationFrame(()=>{ const land=innerWidth>innerHeight && innerHeight<=520, c=$(land?'#stage':'.viewer'); if(c) c.scrollIntoView({behavior:reduced()?'auto':'smooth', block:land?'center':'start'}); });   /* telefono in orizzontale: il riquadro intero nello schermo */
}
function stopViewer(){ if(viewer) cancelAnimationFrame(viewer.raf); }
function vTeamName(v,ti){ return G.T[ti===0?v.m.h:v.m.a].n; }
function teamColor(v,ti){ return G.T[ti===0?v.m.h:v.m.a].c; }

function vViewerHTML(){
  const v=viewer, m=v.m, sim=v.sim;
  const planCol=ti=>{ const p=sim.plans[ti], c=m.inp.t[ti].coach;
    return `<div class="pl"><p class="pl-team"><span class="chip" style="--c:${teamColor(v,ti)}"></span>${esc(vTeamName(v,ti))}</p><p class="pl-coach">${c.absent?`All. ${esc(c.n)} è squalificato: in panchina va il vice`:`All. ${esc(c.n)} · tattica ${c.tat}`}</p>
      <p class="pl-form">${p.form}</p><p class="pl-meta">Mentalità ${MENT[p.ment+1]} · ${p.press===2?'pressing alto':'pressing basso'}</p><ul>${p.reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></div>`; };
  /* 0.4.2.3 (R6a): grafica della 019 — barra del punteggio con gli stemmi, comandi, riquadro 1050×600 (1,75:1) uguale in 2D e 3D */
  const side=ti=>{ const n=`<span class="vtn">${esc(vTeamName(v,ti))}</span>`, c=`<span class="vcrest" aria-hidden="true">${vCrest(v,ti)}</span>`; return `<div class="vside${ti?' away':''}">${ti?n+c:c+n}</div>`; };
  const ab=ti=>esc(vInit(vTeamName(v,ti)));
  return `<section class="card viewer"><div class="vmb">${side(0)}<div class="vscore"><strong class="sc" id="v-score">${v.sc[0]} – ${v.sc[1]}</strong><small><span id="v-clk2">0'</span> · <span id="v-half">1° tempo</span></small></div>${side(1)}</div>
   <div class="cmdbar"><button class="btn vnext" data-act="vnext" id="v-next" data-lbl="">Avanti <span aria-hidden="true">⏭</span></button><div class="ctrl"><button class="btn small" data-act="vplay" id="v-play">${v.phase==='pre'?'Inizia':v.phase==='done'?'Rivedi':v.playing?'Pausa':'Riprendi'}</button><span class="vgrp" role="group" aria-label="Velocità">${[1,2,4].map(s=>`<button class="btn ghost small spd${v.speed===s?' on':''}" data-act="vspd" data-s="${s}" title="${vSpeedTxt(v,s)}" aria-pressed="${v.speed===s}">${s}×</button>`).join('')}</span>${V3.ok!==false?`<button class="btn ghost small" data-act="v3d" aria-pressed="${!!V3.pref}">Replay 3D: ${V3.pref?'sì':'no'}</button>`:''}${use3D()?`<button class="btn ghost small" data-act="vcam">Telecamera replay: ${V3.camMode==='tv'?'TV':'dietro la porta'}</button>`:''}<button class="btn ghost small" data-act="vfs" id="v-fsb">⛶ Schermo intero</button><button class="btn ghost small" data-act="vvig" id="v-vigb" aria-pressed="${VPREF.vig}">Vignette: ${VPREF.vig?'sì':'no'}</button><button class="btn ghost small" data-act="vtema" id="v-tema">${vThemeLbl()}</button><span class="v3msg" id="v-3msg" role="status"${V3.load?'':' hidden'}>Carico il 3D…</span><button class="btn ghost small" data-act="vclose" id="v-close">Chiudi</button></div></div>
   <div class="vfs" id="v-fs"><div class="pitchwrap" id="stage"><canvas id="pitch" aria-label="Campo di gioco: la partita simulata in tempo reale"></canvas><div class="labels" id="v-labels" aria-hidden="true"></div>
    <div class="goalfx" id="v-goal" hidden>Gol</div><div class="rpl" id="v-rpl" hidden><span class="rpl-tag">Replay</span></div>
    <div class="vbug" id="v-bug"><span class="clock" id="v-clock">0'</span><span class="vbsc"><i style="background:${teamColor(v,0)}"></i>${ab(0)} <b id="v-bugsc">${v.sc[0]}–${v.sc[1]}</b> ${ab(1)}<i style="background:${teamColor(v,1)}"></i></span></div>
    <div class="forms" id="v-forms"></div>
    <div class="cap" id="v-cap"></div><div class="board" id="v-board" hidden></div><div class="vig" id="v-vig" hidden></div><div class="vscn" id="v-scn" hidden></div>
    <button class="btn small vfsx" data-act="vfs">Esci da tutto schermo</button>
   </div>
   ${v.phase==='pre'?`<div class="pre" id="v-pre"><p class="eyebrow">Le scelte degli allenatori</p>${m.inp.ref?`<p class="pl-ref">Arbitro ${esc(m.inp.ref.full||m.inp.ref.n)}${G.refs&&G.refs[m.inp.ref.id]?` · assistenti ${esc(G.refs[m.inp.ref.id].a1)} e ${esc(G.refs[m.inp.ref.id].a2)}`:''}</p>`:''}<div class="pre-cols">${planCol(0)}${planCol(1)}</div><button class="btn go" data-act="vkick">Calcio d'inizio</button></div>`:''}
   </div>
   <div class="intv" id="v-int" hidden></div>
   <div class="vlive"><section class="vcard"><h3>Cronaca</h3><ol class="log" id="v-log"></ol></section><section class="vcard"><h3>Statistiche</h3><div class="vstats" id="v-stats"></div></section></div></section>`;
}
/* 0.4.2.3 (R6a): scene della 019 (ingresso, intervallo, fine) con i dati veri della partita; in 3D una fascia sopra la scena 3D */
function vIngresso(v){ const m=v.m, f=frameAt(0), cols=v.sim.cols, out=[], ri=m.inp.ref, RT=ri&&G.refs&&G.refs[ri.id];
  const cap=s=>{ const k=(f.cap||[]).find(k=>k>=0 && cols[k]!=null && v.team[k]===s); return k!=null?{k, i:v.info[cols[k]]}:null; }, c0=cap(0), c1=cap(1);
  if(c0) out.push(`Capitano ${c0.i.ln} · ${vTeamName(v,0)}`); if(ri) out.push('Arbitro '+(ri.full||ri.n)); if(RT){ out.push('Assistente '+RT.a1); out.push('Assistente '+RT.a2); }
  if(c1) out.push(`Capitano ${c1.i.ln} · ${vTeamName(v,1)}`);
  const gk=[0,1].map(s=>cols.findIndex((id,k)=>v.info[id].gk && v.team[k]===s && f.P[k] && !((s?c1:c0)&&(s?c1:c0).k===k))).filter(k=>k>=0).map(k=>v.info[cols[k]].ln);
  if(gk.length) out.push((gk.length>1?'Portieri ':'Portiere ')+gk.join(' e ')); out.push('Poi gli altri giocatori'); return out; }
function vScnHTML(v,kind){
  const m=v.m, sim=v.sim, A=esc(vTeamName(v,0)), B=esc(vTeamName(v,1));
  if(kind==='start') return `<h2>Le squadre entrano in campo</h2><div class="vproc">${vIngresso(v).map(x=>`<span>${esc(x)}</span>`).join('')}</div>`;
  if(kind==='ht'){ const k=Math.min(v.nT,Math.floor(v.t)+1), tot=v.pt[k], ph=tot?Math.round(v.p0[k]/tot*100):50, a=v.st[0], b=v.st[1];
    return `<h2>Intervallo</h2><p class="vres">${A} <b>${v.sc[0]} – ${v.sc[1]}</b> ${B}</p><div class="vproc"><span>Possesso ${ph}% – ${100-ph}%</span><span>Tiri ${a.sh} (${a.sot}) – ${b.sh} (${b.sot})</span><span>Angoli ${a.cor} – ${b.cor}</span><span>Falli ${a.fou} – ${b.fou}</span></div><div class="vscn-act"><button class="btn go" data-act="vnext">Secondo tempo</button></div>`; }
  const gl=s=>sim.ev.filter(e=>e.type==='goal'&&e.side===s).map(e=>`${esc((v.info[e.p[0]]||{}).ln||'')} ${e.min}${e.og?' (aut.)':''}`).join(', ');
  return `<h2>Fine partita</h2><p class="vres">${A} <b>${m.gh} – ${m.ga}</b> ${B}</p>${m.gh+m.ga?`<p class="vgl">${gl(0)||'–'} · ${gl(1)||'–'}</p>`:''}<div class="vscn-act"><button class="btn go" data-act="vnext">Pagelle</button><button class="btn ghost" data-act="vscniv">Intervista</button></div>`; }
/* 0.4.2.3: in 2D l'ingresso compare DOPO il pannello delle scelte degli allenatori, come fascia per 3,5 s dal calcio d'inizio */
function vIngOn(v){ return !!(v && v.phase==='live' && v.ingUntil && performance.now()<v.ingUntil); }
function vScnShow(v){ const el=$('#v-scn'); if(!el) return; const sc=v&&v.phase==='scene'?v.scene:vIngOn(v)?{kind:'start',d2:false}:null;
  const key=sc?sc.kind+(sc.d2?'2':'3'):''; if(el.dataset.k===key && (sc||el.hidden)) return; el.dataset.k=key;
  if(!sc){ el.hidden=true; el.innerHTML=''; return; } el.className='vscn'+(sc.d2?'':' mini')+' k-'+sc.kind; el.innerHTML=vScnHTML(v,sc.kind); el.hidden=false; }
function vScnIv(){ const v=viewer; if(!v) return; if(v.phase==='scene') endScene(); if(v.phase==='done'){ v.post='iv'; Object.assign(v.iv,{k:0,phase:'q',t:0,closed:false}); renderIV(); updNext(); } }
function attachViewer(){
  const v=viewer; const log=$('#v-log'); if(log) log.innerHTML=v.log.join('');
  updHud(); if(v.cap) showCap(v.cap);
  if(v.phase==='done') finishViewer(true);
  if(v.phase==='replay'){ const rb=$('#v-rpl'); if(rb) rb.hidden=false; }
  if(v.phase==='scene') vScnShow(v); if(v.vigOn) vVigPaint(v); vFsLbl();
  cancelAnimationFrame(v.raf); v.last=performance.now(); v.raf=requestAnimationFrame(loop);
}
function kickoff(){ const v=viewer; if(v.phase!=='pre') return; v.phase='live'; v.playing=true; const p=$('#v-pre'); if(p) p.remove();
  if(use3D()){ v.playing=false; startScene('start'); } else { v.ingUntil=performance.now()+3500; vScnShow(v); } const b=$('#v-play'); if(b) b.textContent='Pausa'; }

function loop(now){
  const v=viewer; if(!v || !onMatchPage()) return;
  const dt=Math.max(0,Math.min(100,now-v.last))/1000; v.last=now;   /* il tempo del fotogramma può precedere v.last: mai passi indietro */
  if(v.phase==='pre'){ v.preT+=dt; if(v.preT>14) kickoff(); }
  else if(v.phase==='live' && v.playing){
    /* 0.4.2.3 (R6a): nelle pause il tempo scorre più in fretta (vRate), senza superare i momenti da vedere */
    const R=vRate(v); let nt=v.t+R.r*dt; if(R.fast && nt>R.lim) nt=R.lim; v.fast=R.fast;
    v.t=Math.min(v.nT-1, nt);
    processEvents(true); vVigTick(v);
    if(v.pq.length && v.t>=v.pq[0].at){ const p=v.pq.shift(); if(use3D() && v.t<p.t1+40) startReplay(p); }
    if(v.phase==='live' && !v.htDone && v.t>=v.sim.htTick && v.t<v.sim.htTick+6){ v.htDone=true; v.t=v.sim.htTick; startScene('ht'); }
    if(v.t>=v.nT-1 && v.phase==='live'){ if(!v.endDone){ v.endDone=true; vFlush(); startScene('end'); } else finishViewer(); }
  } else if(v.phase==='replay'){ v.fast=false; const r=v.rep; r.t+=REPLAY_RATE*dt; if(r.t>=r.t1) endReplay(); }
  else if(v.phase==='scene'){ v.fast=false; v.scene.t+=dt; if(v.scene.t>=v.scene.dur) endScene(); }
  if(v.phase!=='live') vVigTick(v);
  else if(v.phase==='done'){ if(v.post==='whistle' && performance.now()-v.postT>3500){ v.post='pag'; renderIV(); } else if(v.post==='iv' && v.iv) tickIV(dt*1000); }
  draw();
  v.raf=requestAnimationFrame(loop);
}
function processEvents(live){
  const v=viewer, ev=v.sim.ev;
  while(v.evI<ev.length && ev[v.evI].t<=v.t){ handleEvent(ev[v.evI], live, v.evI); v.evI++; }
  updHud();
}
function handleEvent(e, live, idx){
  const v=viewer, st=v.st[e.side];
  if(e.type==='fo'){ st.fou++; }
  if(SHOT_EV.has(e.type)){ st.sh++; if(e.type==='goal'||e.type==='save') st.sot++; }
  if(e.type==='cor') st.cor++; if(e.type==='yc') st.yc++; if(e.type==='rc'){ st.rc++; if(e.text.includes('Secondo giallo')) st.yc++; } if(e.type==='off') st.off++;
  if(e.type==='form' && e.form) v.forms[e.side]=e.form;
  if(e.type==='goal'){ v.sc=e.score.slice(); v.goalShow=performance.now()+(v.speed===1?4500:v.speed===2?3000:2000); const s=$('#v-score'); if(s) s.textContent=v.sc[0]+' – '+v.sc[1]; }
  if(live && v.live && idx>G.wm[v.key]){
    if(idx===0) [...v.sim.played[0],...v.sim.played[1]].forEach(id=>{ G.seen[id]=G.seen[id]||{f:0,a:0,m:0}; G.seen[id].m=(G.seen[id].m||0)+1; });
    if(e.type!=='fo') (e.p||[]).forEach(id=>{ G.seen[id]=G.seen[id]||{f:0,a:0,m:0}; G.seen[id].a++; });
    (e.flash||[]).forEach(id=>{ G.seen[id]=G.seen[id]||{f:0,a:0,m:0}; G.seen[id].f++; });
    G.wm[v.key]=idx; if(e.type!=='fo') save();
  }
  if(live && use3D()){
    if((e.type==='cor'||e.type==='fkset'||e.type==='fkx'||e.type==='pen') && !v.wins.some(w=>w.kind==='sp' && w.t1>=e.t)){
      const go=v.sim.ev.find(x=>x.type==='spgo' && x.t>=e.t && x.t<e.t+120);
      if(go) v.wins.push({kind:'sp', t0:Math.max(e.t, go.t-(go.kind==='pen'?10:8)), t1:Math.min(v.nT-1, go.t+(go.kind==='pen'?7:go.kind==='fk'?8:11)), e, go, fresh:true}); }
    /* cartellini, cambi e allontanamento dell'allenatore: si passa al 3D dal vivo */
    if(e.type==='yc'||e.type==='rc'){ const tc=cardShownAt(e.t); v.wins.push({kind:'card', t0:e.t, t1:Math.min(v.nT-1,(tc??e.t+12)+6), e, fresh:true}); }
    if(e.type==='coachoff'){ const tc=cardShownAt(e.t,true)??e.t+12; v.wins.push({kind:'coach', t0:Math.max(e.t,tc-9), t1:Math.min(v.nT-1,tc+12), e, fresh:true}); }
    if(e.type==='subcall'){ const s=v.sim.ev.find(x=>x.type==='sub'&&x.t>=e.t&&x.p[0]===e.p[0]); v.wins.push({kind:'sub', t0:e.t, t1:Math.min(v.nT-1,(s?s.t:e.t+20)+5), e, fresh:true}); }
  }
  const inSp = v.wins.some(w=>e.t>=w.t0 && e.t<=w.t1+2);
  if(live && !v.pq.some(p=>p.e.type!=='flash') && (e.type==='goal' || e.type==='referr' || (e.type==='flash' && !inSp && !v.pq.length))){
    v.pq.push({t0:Math.max(0,e.t-(e.type==='goal'?16:e.type==='referr'?8:10)), t1:Math.min(v.nT-1,e.t+(e.type==='goal'?16:4)), at:e.t+(e.type==='goal'?8:5), e}); }
  else if(live && e.type==='goal'){ v.pq=v.pq.filter(p=>p.e.type!=='flash'); v.pq.push({t0:Math.max(0,e.t-16), t1:Math.min(v.nT-1,e.t+16), at:e.t+8, e}); }
  if(e.type==='subcall'){ v.cap=e; showCap(e); return; }
  if(e.type==='fo'||e.type==='spgo'||e.type==='ko'||e.type==='kick'&&idx===0) return;
  logEvent(e);
  if(e.type==='referr' && e.cm) logEvent({...e, type:'refj', text:'Moviola: '+e.cm});
  if(e.type!=='cor' && e.type!=='off') { v.cap=e; showCap(e); }
}
function logEvent(e){
  const v=viewer, fl=(e.flash||[]).map(id=>v.info[id]).filter(Boolean);
  const cls=e.type==='goal'?'gl':fl.length?'fl':(e.type==='yc'||e.type==='rc'||e.type==='coachoff')?'cd':e.type==='sub'||e.type==='form'?'tc':e.type==='refj'||e.type==='refvote'?'rf':'';
  const ic={goal:'⚽',yc:'🟨',rc:'🟥',coachoff:'🟥',sub:'⇄',inj:'✚',form:'▦',pen:'!',protest:'!',refj:'⚑',refvote:'⚑',ht:'',ft:''}[e.type]||'';
  const li=`<li class="${cls}"><span class="min">${e.min}</span><span>${ic?`<b class="ic ic-${e.type}">${ic}</b> `:''}${esc(e.text)}${fl.map(p=>` <button class="tagbtn" data-act="sheet" data-pid="${p.id}">★ ${esc(p.ln)}</button>`).join('')}</span></li>`;
  v.log.unshift(li); const log=$('#v-log'); if(log) log.insertAdjacentHTML('afterbegin',li);
}
function showCap(e){
  const cap=$('#v-cap'); if(!cap) return; const v=viewer; const fl=(e.flash||[]).map(id=>v.info[id]).filter(Boolean);
  cap.innerHTML=(fl.length?`<span class="tag">★ Giocata di classe · ${fl.map(p=>esc(p.ln)).join(', ')}</span>`:'')+`<span>${esc(e.text)}</span>`;
  cap.className='cap'+(fl.length?' fl':'')+(e.type==='goal'?' gl':'');
}
function updHud(){
  const v=viewer; if(!v) return; const T=Math.floor(v.phase==='replay'?v.rep.t:v.t);
  const clk=$('#v-clock'); if(clk) clk.textContent=minuteOf(T);
  const c2=$('#v-clk2'); if(c2) c2.textContent=minuteOf(T); const bs=$('#v-bugsc'); if(bs) bs.textContent=v.sc[0]+'–'+v.sc[1];
  const hf=$('#v-half'); if(hf) hf.textContent=v.phase==='done'||(v.phase==='scene'&&v.scene.kind==='end')?'Finale':v.phase==='scene'&&v.scene.kind==='ht'?'Intervallo':v.phase==='pre'?'Prima del calcio d\'inizio':T<v.sim.htTick?'1° tempo':'2° tempo';
  const f=$('#v-forms'); if(f) f.innerHTML=`<span style="--c:${teamColor(v,0)}">${esc(v.forms[0])}</span><span style="--c:${teamColor(v,1)}">${esc(v.forms[1])}</span>`;
  const s=$('#v-stats'); if(s){ const k=Math.min(v.nT,Math.floor(v.t)+1), tot=v.pt[k], ph=tot?Math.round(v.p0[k]/tot*100):50;
    const row=(l,a,b)=>`<div class="sr"><span class="num">${a}</span><span>${l}</span><span class="num">${b}</span></div>`;
    const A=v.st[0], B=v.st[1];
    s.innerHTML=`<div class="poss"><span class="num">${ph}%</span><span class="pbar"><i style="width:${ph}%;background:${teamColor(v,0)}"></i><i style="width:${100-ph}%;background:${teamColor(v,1)}"></i></span><span class="num">${100-ph}%</span></div>`+
      row('Tiri (in porta)',`${A.sh} (${A.sot})`,`${B.sh} (${B.sot})`)+row('Calci d\'angolo',A.cor,B.cor)+row('Falli',A.fou,B.fou)+row('Fuorigioco',A.off,B.off)+row('Cartellini',`${A.yc}🟨 ${A.rc?A.rc+'🟥':''}`,`${B.yc}🟨 ${B.rc?B.rc+'🟥':''}`); }
  updNext();
}
function minuteOf(t){ const sim=viewer.sim, s=t*DT/TIME_F; if(t<sim.htTick){ const m=Math.floor(s/60); return m>=45?`45+${m-44}'`:`${m+1}'`; } const m=45+Math.floor((s-sim.htTick*DT/TIME_F)/60); return m>=90?`90+${m-89}'`:`${m+1}'`; }
function finishViewer(reattach, post){
  const v=viewer;
  if(!reattach){ processEvents(v.phase==='live'); vFlush();
    v.t=v.nT-1; v.phase='done'; v.playing=false; v.pq=[]; v.wins=[]; v.post=post||'whistle'; v.postT=performance.now(); const rb=$('#v-rpl'); if(rb) rb.hidden=true; }
  v.sc=[v.m.gh,v.m.ga]; const s=$('#v-score'); if(s) s.textContent=v.sc[0]+' – '+v.sc[1];
  const b=$('#v-play'); if(b) b.textContent='Rivedi'; const pre=$('#v-pre'); if(pre) pre.remove();
  if(!v.iv){ const x=interview(v.m); v.iv={x, best:x.id, k:0, phase:'q', t:0, closed:false}; }
  if(!v.post) v.post='whistle';
  const iv=$('#v-int'); if(iv) iv.innerHTML=interviewHTML(v.iv.x);
  G.iv=G.iv||{}; if(!G.iv[v.key] && (v.m.h===0||v.m.a===0)){ G.iv[v.key]=1; const x=v.iv.x; news(`Intervista a ${x.fn} ${x.ln}: «${x.qa[0][1].split('. ')[0].replace(/\.$/,'')}.»`,'player',false,G.P[x.id]&&G.P[x.id].team!=null?G.P[x.id].team:0); save(); }
  renderIV(); updHud();
}
function vTogglePlay(el){ const v=viewer; if(v.phase==='pre') return kickoff(); if(v.phase==='done') return openViewer(G.last.indexOf(v.m)); v.playing=!v.playing; el.textContent=v.playing?'Pausa':'Riprendi'; }
function vSpeed(s,el){ viewer.speed=s; vSavePrefSpeed(s); document.querySelectorAll('.spd').forEach(b=>{ const on=+b.dataset.s===s; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); }); }
function vCam(el){ V3.camMode=V3.camMode==='tv'?'porta':'tv'; el.textContent='Telecamera replay: '+(V3.camMode==='tv'?'TV':'dietro la porta'); }
function v3dToggle(){ if(viewer.phase==='replay') endReplay(); V3.pref=!V3.pref; try{ localStorage.setItem('presidente-vista',V3.pref?'3d':'2d'); }catch(_){} if(V3.pref) setupMatch3D(); render(); }
function startReplay(p){ const v=viewer; v.phase='replay'; v.rep={t:p.t0,t0:p.t0,t1:p.t1,e:p.e}; const rb=$('#v-rpl'); if(rb) rb.hidden=false;
  if(p.e.type==='referr'){ const cap=$('#v-cap'); if(cap){ cap.innerHTML=`<span class="tag">Moviola · il giornalista</span><span>${esc(p.e.cm)}</span>`; cap.className='cap rf'; } }
  const f=frameAt(p.t0); const bx=f.bx-52.5, bz=f.by-34; V3.cp.set(bx*0.82,17,bz*0.3+34); V3.cl.set(bx*0.92,0,bz*0.55); V3.last=performance.now(); }
function endReplay(){ const v=viewer; if(v&&v.phase==='scene') return endScene(); if(!v||v.phase!=='replay') return; const e=v.rep.e; v.phase='live'; v.rep=null; const rb=$('#v-rpl'); if(rb) rb.hidden=true;
  if(e && e.type==='goal'){ const ko=v.sim.ev.find(x=>x.type==='ko' && x.t>e.t); if(ko && ko.t-3>v.t){ v.t=ko.t-3; processEvents(true); } } }

const WIN_PRI={coach:3,card:3,sub:2,sp:1};
function activeWin(v){ let w=null; for(const x of v.wins) if(v.t>=x.t0 && v.t<=x.t1 && (!w || WIN_PRI[x.kind]>WIN_PRI[w.kind] || (WIN_PRI[x.kind]===WIN_PRI[w.kind] && x.t0>=w.t0))) w=x; if(w && w.kind==='sp' && w.go && w.fresh===false && !w.started){} return w; }
function cardShownAt(t0,coach){ const fr=viewer.sim.frames, n=viewer.sim.cols.length*2+12+6; for(let k=t0;k<Math.min(fr.length,t0+80);k++){ const c=fr[k][n]; if(coach? c===4 : (c>0&&c!==4)) return k; } return null; }

/* ---------- 0.4.1.1: dati letti dai frame registrati (solo disegno, la simulazione non cambia) ----------
   stops: momenti in cui la palla si ferma (falli, fuorigioco, gol, angoli, rigori, punizioni, cambi, palla fuori);
   rest[i]: fino a quale tick la palla resta ferma dopo stops[i]; dives: tuffi del portiere sui rigori;
   cards: a chi l'arbitro mostra il cartellino (per girarlo verso il giocatore) */
const STOP_EV=new Set(['fo','off','goal','cor','pen','fkset','sub','inj','ht','yc','rc','coachoff']);
function vPrep(v){
  const sim=v.sim, fr=sim.frames, nT=v.nT, n=sim.cols.length, nb=n*2;
  const bx=k=>frV(fr[k],nb), by=k=>frV(fr[k],nb+1);
  const out=k=>bx(k)<0||bx(k)>105||by(k)<0||by(k)>68;
  const S=new Set([0, sim.htTick]);
  sim.ev.forEach(e=>{ if(STOP_EV.has(e.type)) S.add(Math.max(0,Math.min(nT-1,e.t))); });
  for(let k=1;k<nT;k++) if(out(k) && !out(k-1)) S.add(k);
  v.stops=[...S].filter(k=>k>=0&&k<nT).sort((a,b)=>a-b);
  v.rest=v.stops.map(s=>{ let still=-1; const lim=Math.min(nT-1,s+140);
    for(let k=s+1;k<=lim;k++){ const d=Math.hypot(bx(k)-bx(k-1),by(k)-by(k-1));
      if(still<0){ if(d<0.02) still=k; } else if(d>0.05 && d<3) return k-1; }
    return still<0 ? s+1 : lim; });
  /* 0.4.2.0: il tuffo del portiere (anche sui rigori) lo decide la simulazione: posizione e inclinazione sono nei frame */
  v.dives=[];
  /* cartellini: tick in cui l'arbitro mostra il cartellino e destinatario */
  const nc=nb+18; v.cards=[];
  sim.ev.forEach(e=>{ if(e.type!=='yc'&&e.type!=='rc'&&e.type!=='coachoff') return; const coach=e.type==='coachoff';
    let tc=null; for(let k=e.t;k<Math.min(nT,e.t+80);k++){ const c=fr[k][nc]; if(coach? c===4 : (c>0&&c!==4)){ tc=k; break; } }
    if(tc==null) return; let t1=tc; while(t1+1<nT && fr[t1+1][nc]>0) t1++;
    v.cards.push({t0:e.t, tc, t1, coach:coach?e.side:null, k:coach?-1:sim.cols.indexOf(e.p&&e.p[0])}); });
  vPrepPause(v); vPrepKits(v); vPrepVig(v);   /* 0.4.2.3 (R6a) */
}
function stopIdx(v,t){ let lo=0, hi=v.stops.length-1, r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(v.stops[m]<=t){ r=m; lo=m+1; } else hi=m-1; } return r; }
function ballDead(v,t){ const i=stopIdx(v,t); return i>=0 && t<=v.rest[i]+0.999; }
function nextStop(v,t,lim){ const i=stopIdx(v,t+0.5)+1; const s=v.stops[i]; return s!=null && s<lim ? s : null; }
function diveAt(t){ const v=viewer; if(!v||!v.dives) return null;
  for(const d of v.dives){ const a=t-d.t0; if(a<0||a>9) continue; const ez=x=>x<0.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
    const u = a<1.1 ? ez(a/1.1) : a<5 ? 1 : a<8 ? 1-ez((a-5)/3) : 0; if(u<=0) continue; return {d, u, a}; }
  return null; }
function cardTarget(f,t){ const c=cardAt(t); if(!c) return null; if(c.coach!=null) return {x:52.5+(c.coach===0?-9:9), y:-2.4};
  let p=c.k>=0?f.P[c.k]:null; if(!p && c.k>=0){ const fr=viewer.sim.frames[Math.max(0,Math.min(viewer.nT-1,c.tc))]; if(fr && !isNaN(frV(fr,c.k*2))) p={x:frV(fr,c.k*2), y:frV(fr,c.k*2+1)}; } return p&&!p.hidden?{x:p.x,y:p.y}:null; }
function cardAt(t){ const v=viewer; if(!v||!v.cards) return null; let c=null; for(const x of v.cards) if(t>=x.t0-1 && t<=x.t1+1) c=x; return c; }

/* ---------- 0.4.2.3 (R6a): pause e attesa della battuta ----------
   Le pause della simulazione (rimesse, falli, gol, cambi, infortuni) si vedono intere: giocatori che si sistemano, palla portata
   sul punto (correzione di Max del 5/11). Si accorcia SOLO l'attesa da quando la palla è ferma sul punto di battuta a quando torna
   in movimento (punizioni, angoli, rimesse laterali e dal fondo, calcio d'inizio dopo un gol, rigori): dura 1 s a 1× (0,5 s a 2×,
   0,25 s a 4×); gli ultimi 2 tick (la rincorsa e la battuta) scorrono alla velocità scelta. Durante l'attesa chi batte è disegnato
   1,5 m dietro la palla, dalla parte opposta alla direzione della battuta, poi prende la rincorsa (solo disegno, dai frame).
   Il cronometro resta quello della partita; «Avanti» salta come prima. Nessun numero casuale. */
const PZ_MIN=4, WT_RUN=2, WT_BACK=1.5;   /* pausa più corta considerata; tick della rincorsa; metri dietro la palla */
const PZ_RANK={goal:3, fo:2, yc:2, rc:2, coachoff:2, inj:2, sub:2, subcall:2};
function vPrepPause(v){
  const sim=v.sim, ht=sim.htTick, fr=sim.frames, n=sim.cols.length, nb=n*2, sp=[];
  const B=k=>{ const f=vFr(v,k); return [f[nb],f[nb+1],f[nb+2]]; };
  v.stops.forEach((s,i)=>{ const r=v.rest[i]; if(s===0||r-s<PZ_MIN||(s<=ht&&ht<=r+1)) return;
    const L=sp[sp.length-1]; if(L && s<=L.r+1) L.r=Math.max(L.r,r); else sp.push({s, r}); });
  const sp2=[], wt=[];
  for(const p of sp){ if(p.s<=ht && ht<=p.r+1) continue; sp2.push(p);
    p.evs=sim.ev.filter(e=>e.t>=p.s && e.t<=p.r); let rank=1; for(const e of p.evs) rank=Math.max(rank,PZ_RANK[e.type]||1);
    p.kind=rank===3?'goal':rank===2?'imp':'out';
    /* attesa: palla ferma sul punto fino alla battuta (K = primo tick in cui si muove) */
    const K=p.r+1; if(K>=v.nT-3) continue; const bk=B(K-1); let s0=K-1;
    while(s0-1>=p.s){ const q=B(s0-1); if(Math.hypot(q[0]-bk[0],q[1]-bk[1])>0.04 || Math.abs(q[2]-bk[2])>0.05) break; s0--; }
    if(K-s0<=WT_RUN+1) continue;
    const thr=bk[2]>1.0, b2=B(Math.min(v.nT-1,K+2)); let dx=b2[0]-bk[0], dy=b2[1]-bk[1], dl=Math.hypot(dx,dy);
    let kk=-1, kd=1e9; const fk=vFr(v,K); for(let k=0;k<n;k++){ const x=fk[k*2]; if(isNaN(x)) continue; const d=Math.hypot(x-bk[0],fk[k*2+1]-bk[1]); if(d<kd){ kd=d; kk=k; } }
    if(dl<0.05 && kk>=0){ dx=bk[0]-fk[kk*2]; dy=bk[1]-fk[kk*2+1]; dl=Math.hypot(dx,dy); }
    wt.push({s0, K, bx:bk[0], by:bk[1], k:kd<3.5?kk:-1, thr, ux:dl>0.01?dx/dl:0, uy:dl>0.01?dy/dl:0, L:K-WT_RUN-s0}); }
  v.pz=sp2; v.wt=wt;
  /* gol: la palla resta dentro la porta (fermata dalla rete) finché un giocatore non va a prenderla o si riparte */
  v.gnet=[]; for(const e of sim.ev){ if(e.type!=='goal') continue; const g=e.t; if(g>=v.nT-1) continue; const gx=B(Math.min(v.nT-1,g+1))[0]>52.5?105:0;
    const ko=sim.ev.find(x=>x.type==='ko' && x.t>g); let H=ko?ko.t:v.nT-1;
    for(let t=g+3;t<H;t++){ const b=B(t), f=vFr(v,t); let near=false; for(let k=0;k<n;k++){ const x=f[k*2]; if(!isNaN(x) && Math.hypot(x-b[0],f[k*2+1]-b[1])<1.2){ near=true; break; } } if(near){ H=t; break; } }
    v.gnet.push({g, H, gx, sg:gx?1:-1}); }
}
function vWaitAt(v,t){ const a=v.wt; if(!a) return null; let lo=0, hi=a.length-1, r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(a[m].s0<=t){ r=m; lo=m+1; } else hi=m-1; }
  const w=r>=0?a[r]:null; return w && t<w.K ? w : null; }
function vPauseAt(v,t){ const a=v.pz; if(!a) return null; let lo=0, hi=a.length-1, r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(a[m].s<=t){ r=m; lo=m+1; } else hi=m-1; }
  const p=r>=0?a[r]:null; return p && t<p.r+1 ? p : null; }
/* tick al secondo in questo istante: nell'attesa della battuta più in fretta, perché duri 1 s a 1× (in proporzione a 2× e 4×) */
function vRate(v){
  const base=(use3D() && activeWin(v)) ? 2/DT : tickRate(v), w=vWaitAt(v,v.t);
  if(!w || v.t>=w.K-WT_RUN) return {r:base, fast:false};
  const n=tickRate(v), f=w.L/Math.max(0.1, 1/v.speed-WT_RUN/n); return f>base ? {r:f, fast:true, lim:w.K-WT_RUN} : {r:base, fast:false};
}
/* posizione disegnata di chi batte durante l'attesa e della palla dopo il gol (frameAt; i frame non cambiano) */
function vFixFrame(v,t,P,o){
  const w=vWaitAt(v,t); if(w && w.k>=0 && !w.thr && P[w.k]){ const p=P[w.k], qx=w.bx-w.ux*WT_BACK, qy=w.by-w.uy*WT_BACK, ez=x=>x<0.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
    const a=clamp((t-w.s0)/2,0,1), b=clamp((t-(w.K-WT_RUN))/WT_RUN,0,1), u=ez(a)*(1-ez(b));
    P[w.k]={x:p.x+(qx-p.x)*u, y:p.y+(qy-p.y)*u}; }
  for(const g of v.gnet){ if(t<g.g || t>=g.H+2) continue;
    const cx=g.gx+g.sg*clamp(g.sg*(o.bx-g.gx),0.12,1.75), cy=clamp(o.by,34-3.5,34+3.5), cz=clamp(o.bz,0,2.3), u=t<g.H?1:1-(t-g.H)/2;
    o.bx+=(cx-o.bx)*u; o.by+=(cy-o.by)*u; o.bz+=(cz-o.bz)*u; break; }
}

/* ---------- 0.4.2.3 (R6a): impostazioni del visore nel browser (come la velocità, mai in G) ---------- */
const VIG_KEY='presidente-pref-vign';
const VPREF={vig:(()=>{ try{ return localStorage.getItem(VIG_KEY)!=='0'; }catch(_){ return true; } })()};
function vSetVig(on){ VPREF.vig=!!on; try{ localStorage.setItem(VIG_KEY,on?'1':'0'); }catch(_){} if(!on) vVigHide();
  const b=$('#v-vigb'); if(b){ b.textContent='Vignette: '+(on?'sì':'no'); b.setAttribute('aria-pressed',String(!!on)); } }
/* tema (dalla 0.4.2.4, G1a): il pulsante del visore usa lo stesso stato e la stessa chiave del pulsante della testata (ui.js: themeNow, themeToggle) */
const vThemeNow=()=>themeNow(), vThemeLbl=()=>themeLbl();
function vTheme(){ themeToggle(); }
/* tutto schermo: il riquadro intero (campo 2D o 3D, sempre 1,75:1, contenuto senza deformarlo); dove il browser non lo permette, a tutta finestra */
function vFull(){ const el=$('#v-fs'); if(!el) return;
  if(document.fullscreenElement){ document.exitFullscreen().catch(()=>{}); return; }
  if(el.classList.contains('fsx')){ el.classList.remove('fsx'); document.body.classList.remove('vfsx'); vFsLbl(); return; }
  const fake=()=>{ el.classList.add('fsx'); document.body.classList.add('vfsx'); vFsLbl(); };
  if(el.requestFullscreen) el.requestFullscreen().then(vFsLbl).catch(fake); else fake(); }
function vFsOn(){ const el=$('#v-fs'); return !!(el && (document.fullscreenElement===el || el.classList.contains('fsx'))); }
function vFsLbl(){ const b=$('#v-fsb'); if(b) b.textContent=vFsOn()?'⛶ Esci da tutto schermo':'⛶ Schermo intero'; }
document.addEventListener('fullscreenchange',()=>{ vFsLbl(); if(viewer) draw(); });

/* ---------- 0.4.2.3 (R6a): maglie vere dei club sul campo, con il controllo del contrasto ----------
   Colore del club (G.T[].c). Se sul verde del campo (chiaro e scuro) si vede poco → seconda maglia (chiara o scura) con il
   colore del club sul bordo; se è appena sufficiente → bordo più spesso. Se le due squadre si somigliano, la seconda cambia
   maglia. I portieri hanno colori diversi da tutte e due le squadre e tra loro. */
const KIT2={l:'#f3f1e8', d:'#1d2633'}, GKC=['#f2c230','#2b2b30','#e8e3d3','#e05a9a','#3fc1c9'], PITCH_C=['#2f6c46','#22533a'];
function rgbOf(h){ const n=parseInt(String(h).slice(1),16); return [n>>16&255,n>>8&255,n&255]; }
function relLum(h){ const c=rgbOf(h).map(x=>{ x/=255; return x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4); }); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; }
function ctrRatio(a,b){ const x=relLum(a), y=relLum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
function rgbDist(a,b){ const p=rgbOf(a), q=rgbOf(b); return Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]); }
function kitNear(c){ return Math.min(...PITCH_C.map(p=>ctrRatio(c,p)))<1.6 && Math.min(...PITCH_C.map(p=>rgbDist(c,p)))<115; }
function vPrepKits(v){
  const k=[0,1].map(ti=>{ const c=teamColor(v,ti); if(kitNear(c)) return {fill:relLum(c)>0.18?KIT2.d:KIT2.l, edge:c, alt:true, thick:false};
    return {fill:c, edge:null, alt:false, thick:Math.min(...PITCH_C.map(p=>ctrRatio(c,p)))<1.6}; });
  if(rgbDist(k[0].fill,k[1].fill)<110){ const o=k[1].fill, alt=rgbDist(k[0].fill,KIT2.l)>rgbDist(k[0].fill,KIT2.d)?KIT2.l:KIT2.d; k[1]={fill:alt, edge:k[1].edge||o, alt:true, thick:false}; }
  const ok=(c,av)=>av.every(a=>rgbDist(c,a)>=110);
  const g0=GKC.find(c=>ok(c,[k[0].fill,k[1].fill,...PITCH_C]))||GKC[0], g1=GKC.find(c=>c!==g0 && ok(c,[k[0].fill,k[1].fill,g0,...PITCH_C]))||GKC.find(c=>c!==g0);
  v.kit=k; v.gkc=[g0,g1];
}
/* stemma dai colori del club (stemmi.js della 012); senza stemmi.js resta il quadratino col colore */
function vInit(n){ return clubInit(n); }
function vCrest(v,ti){ return crestHTML(ti===0?v.m.h:v.m.a); }

/* ---------- 0.4.2.3 (R6a): vignette del mister ----------
   Nelle pause importanti (gol, falli, cartellini, infortuni, cambi; mai nelle rimesse) una vignetta dalla panchina di una squadra
   con un'indicazione dell'allenatore, 2–3 s; al massimo una per pausa e non più di una ogni ~5 minuti di partita per squadra.
   La frase dipende da risultato, minuto, modulo, cartellini, morale e carattere dell'allenatore (coachTemper), scelta con un
   hash del momento (partita, tick, squadra): mai R() né rnd(). Calcolate tutte in vPrep: saltare con «Avanti» non cambia nulla.
   Aggancio per R3 (vVigPiano): se la simulazione registra un cambio di piano vero (oggi l'evento 'form' di coachThink; da R3
   l'evento 'plan' con il campo vig), la vignetta dice quello. Frasi in VIG_FRASI, elenco separato pronto per L1. */
const VIG_GAP=300, VIG_MS=3000;   /* VIG_MS: secondi veri di lettura, uguali a 1×, 2× e 4× */   /* secondi di partita tra due vignette della stessa squadra */
const VIG_FRASI=[
  {id:'g01',se:'',t:'Stiamo corti, ragazzi!'},
  {id:'g02',se:'',t:'Concentrati, si riparte!'},
  {id:'g03',se:'',t:'Parlatevi, chiamate la palla!'},
  {id:'g04',se:'',t:'Occhio alle marcature!'},
  {id:'g05',se:'',t:'Palla a terra, giochiamola!'},
  {id:'g06',se:'',t:'Seguite l\'uomo, non solo la palla!'},
  {id:'m01',se:'',t:'Teniamo il {form}, ognuno al suo posto!'},
  {id:'m02',se:'',t:'Larghi sugli esterni: il {form} vuole ampiezza!'},
  {id:'m03',se:'',t:'Rispettate le distanze del {form}!'},
  {id:'v01',se:'vince',t:'Adesso gestiamo, niente frenesia!'},
  {id:'v02',se:'vince',t:'Non abbassatevi troppo, teniamo noi il pallone!'},
  {id:'v03',se:'vince',t:'Bravi! Ma la partita non è finita.'},
  {id:'v04',se:'vince tardi',t:'Ultimi minuti: palla lontano dalla nostra area!'},
  {id:'v05',se:'vince tardi',t:'Teniamola là davanti, facciamo passare il tempo!'},
  {id:'p01',se:'perde',t:'Su, c\'è tempo! Un passo in più!'},
  {id:'p02',se:'perde',t:'Più coraggio, attacchiamo la profondità!'},
  {id:'p03',se:'perde',t:'Non mollate, la rimettiamo in piedi!'},
  {id:'p04',se:'perde tardi',t:'Tutti avanti, ci serve un gol!'},
  {id:'p05',se:'perde tardi',t:'Rischiamo, non abbiamo niente da perdere!'},
  {id:'x01',se:'pari',t:'Pazienza, lo spazio arriva!'},
  {id:'x02',se:'pari',t:'Equilibrio! Non scopriamoci.'},
  {id:'x03',se:'pari tardi',t:'Un punto non basta, proviamoci!'},
  {id:'x04',se:'pari tardi calmo',t:'Teniamo il punto, niente follie.'},
  {id:'t01',se:'presto',t:'Prendiamo le misure, niente fretta!'},
  {id:'t02',se:'presto',t:'Primi minuti: linee strette e corte!'},
  {id:'t03',se:'fine1',t:'Ancora pochi minuti, poi ne parliamo negli spogliatoi.'},
  {id:'t04',se:'fine1',t:'Chiudiamo il tempo senza rischi!'},
  {id:'f01',se:'gol_fatto',t:'Così! Adesso restate concentrati!'},
  {id:'f02',se:'gol_fatto',t:'Bravissimi! Subito in posizione!'},
  {id:'f03',se:'gol_fatto',t:'Grande gol! Ora non regaliamo niente.'},
  {id:'f04',se:'gol_fatto pari',t:'Rimessa in piedi! Adesso andiamo a vincerla!'},
  {id:'f05',se:'gol_fatto caldo',t:'Siiì! Ma non è finita, testa!'},
  {id:'s01',se:'gol_subito',t:'Testa alta, si ricomincia!'},
  {id:'s02',se:'gol_subito',t:'Non è successo niente, reagiamo!'},
  {id:'s03',se:'gol_subito caldo',t:'Così non va! Più cattiveria!'},
  {id:'s04',se:'gol_subito caldo',t:'Chi doveva seguirlo? Svegliatevi!'},
  {id:'s05',se:'gol_subito calmo',t:'Calma, continuiamo a giocare come sappiamo.'},
  {id:'c01',se:'cart_nostro',t:'Attenti adesso, non prendiamone un altro!'},
  {id:'c02',se:'cart_nostro ammoniti',t:'Entrate pulite, abbiamo già troppi ammoniti!'},
  {id:'c03',se:'cart_nostro caldo',t:'Arbitro, ma era fallo quello?!'},
  {id:'c04',se:'cart_nostro caldo',t:'Ma dai! Sempre a noi i cartellini!'},
  {id:'c05',se:'cart_loro',t:'È ammonito: puntatelo in dribbling!'},
  {id:'c06',se:'cart_loro',t:'Visto? Sono in difficoltà, insistiamo!'},
  {id:'r01',se:'dieci',t:'In dieci: stringiamoci, tutti dietro la palla!'},
  {id:'r02',se:'dieci',t:'Uno in meno: raddoppiamo la corsa!'},
  {id:'r03',se:'loro10',t:'Sono in dieci! Allarghiamo il gioco!'},
  {id:'r04',se:'loro10',t:'Uomo in più: facciamo girare la palla!'},
  {id:'i01',se:'inf',t:'Forza, stringete i denti finché entra il cambio!'},
  {id:'i02',se:'inf',t:'Ricompattiamoci, nessuno si distragga!'},
  {id:'b01',se:'cambio',t:'Entra con la testa giusta, fai quello che abbiamo detto!'},
  {id:'b02',se:'cambio',t:'Cambio: stessa disposizione, si riparte!'},
  {id:'b03',se:'cambio',t:'Energie fresche: adesso alziamo il ritmo!'},
  {id:'o01',se:'fallo_nostro',t:'Niente falli inutili vicino all\'area!'},
  {id:'o02',se:'fallo_nostro',t:'Ordinati! Tutti in posizione sulla punizione!'},
  {id:'o03',se:'fallo_loro',t:'Sfruttiamo la punizione, attenti allo schema!'},
  {id:'o04',se:'fallo_loro',t:'Battiamola veloce, sono scoperti!'},
  {id:'k01',se:'caldo',t:'Svegliaaa! Più ritmo!'},
  {id:'k02',se:'caldo',t:'Ma che fate? Pressione, pressione!'},
  {id:'k03',se:'calmo',t:'Tranquilli, giocate semplice.'},
  {id:'k04',se:'calmo',t:'Bene così, continuiamo con ordine.'},
  {id:'u01',se:'morale_giu',t:'Crediamoci! Siamo più forti di così!'},
  {id:'u02',se:'morale_giu',t:'Testa sgombra, una giocata alla volta!'},
  {id:'u03',se:'morale_su',t:'Si vede che ci credete, avanti così!'},
  {id:'u04',se:'morale_su',t:'Siete in fiducia: osate la giocata!'}
];
const VIG_EV=new Set(['goal','fo','yc','rc','coachoff','inj','sub','subcall']);
function vHash(v,t,side,k){ return hashU(v.key+'|'+t+'|'+side,k); }
function vMinute(v,t){ const ht=v.sim.htTick; return t<ht ? t*DT/TIME_F/60 : 45+(t-ht)*DT/TIME_F/60; }
function vVigTags(v,side,p,main){
  const sim=v.sim, m=v.m, T=new Set(); let sc=[0,0], sct=-1, form=sim.plans[side].form, yc=0, rc=0, rcO=0;
  for(const e of sim.ev){ if(e.t>p.r) continue;
    if(e.type==='goal' && e.t>=sct){ sc=e.score; sct=e.t; }
    if(e.type==='form' && e.side===side && e.form && e.t<=p.r) form=e.form;
    if(e.type==='yc' && e.side===side) yc++;
    if(e.type==='rc'){ if(e.side===side) rc++; else rcO++; } }
  const my=sc[side], th=sc[1-side], mn=vMinute(v,p.s), co=m.inp.t[side].coach, car=co.car??10, ps=m.inp.t[side].players;
  const mor=ps.reduce((a,x)=>a+(x.mor??12),0)/Math.max(1,ps.length), mine=main.side===side, ty=main.type;
  T.add(my>th?'vince':my<th?'perde':'pari'); if(mn<20) T.add('presto'); if(mn>=75) T.add('tardi'); if(mn>=38 && p.s<sim.htTick) T.add('fine1');
  if(car>=14) T.add('caldo'); if(car<=7) T.add('calmo'); if(mor>=14) T.add('morale_su'); if(mor<=9) T.add('morale_giu');
  if(ty==='goal') T.add(mine?'gol_fatto':'gol_subito');
  if(ty==='yc'||ty==='rc'||ty==='coachoff') T.add(mine?'cart_nostro':'cart_loro');
  if(yc>=2) T.add('ammoniti'); if(rc>0) T.add('dieci'); if(rcO>0) T.add('loro10');
  if(ty==='inj' && mine) T.add('inf'); if((ty==='sub'||ty==='subcall') && mine) T.add('cambio');
  if(ty==='fo') T.add(mine?'fallo_nostro':'fallo_loro');
  return {T, form};
}
/* aggancio per R3: cambio di piano vero registrato dalla simulazione durante la pausa */
function vVigPiano(v,side,p){
  const e=v.sim.ev.find(x=>(x.type==='plan'||x.type==='form') && x.side===side && x.t>=p.s-4 && x.t<=p.r); if(!e) return null;
  if(e.type==='plan') return e.vig||e.text||null;
  return /attacco/.test(e.form) ? 'Tutti all\'attacco, ci serve un gol!' : `Cambiamo: ${e.form}!`; }
function vVigFrase(v,side,p,main){
  const {T, form}=vVigTags(v,side,p,main);
  const ok=VIG_FRASI.filter(f=>f.se.split(' ').filter(Boolean).every(x=>T.has(x)));
  const w=ok.map(f=>1+2*f.se.split(' ').filter(Boolean).length), tot=w.reduce((a,b)=>a+b,0);
  let x=vHash(v,p.s,side,5)*tot, i=0; while(i<ok.length-1 && x>=w[i]){ x-=w[i]; i++; }
  const f=ok[i]; return f ? {id:f.id, t:f.t.replace('{form}',form)} : null; }
function vPrepVig(v){
  v.vig=[]; v.vigI=0; v.vigOn=null; const last=[-1e9,-1e9], gap=VIG_GAP*TIME_F/DT;
  const pick=(p,ty)=>p.evs.find(e=>ty.includes(e.type));
  for(const p of v.pz){ if(p.kind==='out') continue;
    const main=pick(p,['goal'])||pick(p,['rc','coachoff'])||pick(p,['yc'])||pick(p,['inj'])||pick(p,['sub','subcall'])||pick(p,['fo']);
    if(!main || !VIG_EV.has(main.type)) continue;
    if(main.type==='fo' && vHash(v,p.s,9,3)>=0.45) continue;   /* non a ogni fallo */
    const first=vHash(v,p.s,9,1)<0.5?0:1;
    for(const side of [first,1-first]){ if(p.s-last[side]<gap) continue;
      const pr=vVigPiano(v,side,p), fr=pr?{id:'piano',t:pr}:vVigFrase(v,side,p,main); if(!fr) continue;
      const co=v.m.inp.t[side].coach, who=co.absent?'Il vice':'All. '+co.n.split(' ').slice(-1)[0];
      v.vig.push({t:p.s+1, s:p.s, r:p.r, side, who, id:fr.id, text:fr.t, ev:main.type}); last[side]=p.s; break; } }
}
function vVigHide(){ const v=viewer; if(v) v.vigOn=null; const el=$('#v-vig'); if(el) el.hidden=true; }
function vVigShow(v,g){ v.vigOn={g, until:performance.now()+VIG_MS}; (v.vigShown=v.vigShown||[]).push(g.t); vVigPaint(v); }
function vVigPaint(v){ const el=$('#v-vig'); if(!el) return; const o=v.vigOn; if(!o){ el.hidden=true; return; }
  el.className='vig '+(o.g.side===0?'l':'r'); el.innerHTML=`<span class="who">${esc(o.g.who)} · ${esc(vTeamName(v,o.g.side))}</span><p>«${esc(o.g.text)}»</p>`; el.hidden=false; }
/* nel ciclo: le vignette arrivate al loro tick (solo dal vivo; con «Avanti» quelle saltate non si mostrano) */
function vVigTick(v){
  while(v.vigI<v.vig.length && v.vig[v.vigI].t<=v.t){ const g=v.vig[v.vigI++]; if(VPREF.vig && v.phase==='live' && v.t<=g.r+1) vVigShow(v,g);   /* finché dura la sua pausa */ }
  if(v.vigOn && (performance.now()>v.vigOn.until || v.phase!=='live' || !VPREF.vig)) vVigHide();
}

/* ---------- 0.4.1.1: un solo tasto «Avanti» ----------
   replay → fine del replay; azione → prossima palla ferma; palla ferma → fine del tempo; scene → scena dopo;
   dopo il fischio finale → pagelle → intervista → chiusura. Gli eventi saltati vanno comunque nel registro. */
function vNextLabel(){ const v=viewer; if(!v) return '';
  if(v.phase==='pre') return "Avanti: calcio d'inizio";
  if(v.phase==='scene') return v.scene.kind==='start' ? "Avanti: calcio d'inizio" : v.scene.kind==='ht' ? 'Avanti: secondo tempo' : 'Avanti: pagelle';
  if(v.phase==='replay') return 'Avanti: fine replay';
  if(v.phase==='done') return v.post==='whistle' ? 'Avanti: pagelle' : v.post==='pag' ? 'Avanti: intervista' : 'Chiudi';
  const first=v.t<v.sim.htTick && !v.htDone, lim=first?v.sim.htTick:v.nT-1;
  if(!ballDead(v,v.t) && nextStop(v,v.t,lim)!=null) return 'Avanti: fine azione';
  return first ? 'Avanti: fine primo tempo' : 'Avanti: fine partita';
}
function updNext(){ const v=viewer; const b=$('#v-next'); if(!b||!v) return; const l=vNextLabel(); if(b.dataset.lbl!==l){ b.dataset.lbl=l; b.innerHTML=l==='Chiudi'?'Chiudi':`${esc(l)} <span aria-hidden="true">⏭</span>`; b.setAttribute('aria-label',l); }
  const cl=$('#v-close'); if(cl) cl.hidden=(l==='Chiudi'); }
/* salta fino al tick T: gli eventi prima di T si registrano senza replay né 3D (e senza contare come visti), quelli di T normalmente */
function vJump(T){ const v=viewer, ev=v.sim.ev;
  while(v.evI<ev.length && ev[v.evI].t<T){ handleEvent(ev[v.evI], false, v.evI); v.evI++; }
  v.t=Math.max(v.t,T); v.pq=v.pq.filter(p=>p.at>=T && p.e.t>=T); v.wins=v.wins.filter(w=>w.t0>=T); v.goalShow=0;
  while(v.vigI<v.vig.length && v.vig[v.vigI].s<T) v.vigI++; vVigHide();   /* vignette saltate: non si mostrano */
  processEvents(true); }
/* a fine partita: nel registro anche gli eventi dopo l'ultimo frame (fischio finale, voto alla terna), prima della scena finale */
function vFlush(){ const v=viewer, ev=v.sim.ev; while(v.evI<ev.length){ handleEvent(ev[v.evI], false, v.evI); v.evI++; } updHud(); }
const LIVE_LBL=new Set(['Avanti: fine azione','Avanti: fine primo tempo','Avanti: fine partita']);
function vNext(){ const v=viewer; if(!v) return;
  /* fa quello che il tasto mostrava al momento del tocco (l'etichetta può cambiare mentre si preme) */
  let l=vNextLabel(); const shown=($('#v-next')||{dataset:{}}).dataset.lbl;
  if(v.phase==='live' && LIVE_LBL.has(shown) && LIVE_LBL.has(l)){ const first=v.t<v.sim.htTick && !v.htDone;
    if(shown==='Avanti: fine azione' ? nextStop(v,v.t,first?v.sim.htTick:v.nT-1)!=null : (shown==='Avanti: fine primo tempo')===first) l=shown; }
  if(v.phase==='pre'){ kickoff(); }
  else if(v.phase==='scene'){ endScene(); }
  else if(v.phase==='replay'){ endReplay(); }
  else if(v.phase==='live'){
    if(!v.playing){ v.playing=true; const b=$('#v-play'); if(b) b.textContent='Pausa'; }
    if(l==='Avanti: fine azione'){ const first=v.t<v.sim.htTick && !v.htDone; vJump(nextStop(v,v.t,first?v.sim.htTick:v.nT-1)); }
    else if(l==='Avanti: fine primo tempo'){ vJump(v.sim.htTick); v.htDone=true; v.t=v.sim.htTick; startScene('ht'); }
    else { vJump(v.nT-1); if(!v.endDone){ v.endDone=true; vFlush(); startScene('end'); } else finishViewer(false,'whistle'); }
  }
  else if(v.phase==='done'){
    if(v.post==='whistle'){ v.post='pag'; renderIV(); }
    else if(v.post==='pag'){ v.post='iv'; Object.assign(v.iv,{k:0,phase:'q',t:0,closed:false}); renderIV(); }
    else { const m=v.m, a=G.T[m.h].n, b=G.T[m.a].n; stopViewer(); viewer=null; render(); toast(`Finale: ${a} ${m.gh} – ${m.ga} ${b}`); return; }
  }
  draw(); updNext();
}
/* ---------- scene 3D: ingresso in campo, intervallo, fine partita ---------- */
const TUN=[52.5,-6.4];
function startScene(kind){
  const v=viewer; vVigHide();
  if(!use3D()){ if(kind==='start') return false;   /* 0.4.2.3: in 2D l'ingresso è nel pannello prima del calcio d'inizio */
    v.scene={kind, t:0, acts:[], dur:kind==='ht'?6:5, T1:0, fresh:true, d2:true}; v.phase='scene'; v.pq=[]; v.wins=[]; vScnShow(v); return true; }
  const nT=v.nT, ht=v.sim.htTick;
  const fA = kind==='start'? frameAt(0) : kind==='ht'? frameAt(Math.max(0,ht-1)) : frameAt(nT-1);
  const fB = kind==='start'? frameAt(0) : kind==='ht'? frameAt(Math.min(nT-1,ht)) : null;
  const acts=[]; const dur=(A,B)=>clamp(Math.hypot(B[0]-A[0],B[1]-A[1])/6.5,1.6,kind==='start'?6.5:5);
  const P0=fA.P.map((p,k)=>p?k:-1).filter(k=>k>=0);
  v.sceneT1=0;
  if(kind==='start'){
    const side=[0,1].map(s=>P0.filter(k=>v.team[k]===s).sort((a,b)=>v.info[v.sim.cols[a]].num-v.info[v.sim.cols[b]].num));
    const line=(x)=>[x,36];
    const mk=(key,L,K,d)=>{ const d1=dur(TUN,L), d2=dur(L,K); acts.push({key, hide:[[0,d]], segs:[{a:d,b:d+d1,A:TUN,B:L},{a:13.5+d*0.4,b:13.5+d*0.4+d2,A:L,B:K}]}); };
    [0,1,2].forEach(i=>{ const L=line(52.5+(i===0?0:i===1?-1.05:1.05)), R=fA.RF[i]; mk('r'+i,L,[R.x,R.y],0.2+i*0.15); });
    side[0].forEach((k,i)=>{ const L=line(52.5-2.4-(side[0].length-1-i)*1.05), p=fB.P[k]; mk(k,L,[p.x,p.y],0.9+i*0.32); });
    side[1].forEach((k,i)=>{ const L=line(52.5+2.4+i*1.05), p=fB.P[k]; mk(k,L,[p.x,p.y],0.9+i*0.32); });
  } else {
    const ids=[...P0.map(k=>({key:k,S:[fA.P[k].x,fA.P[k].y]})), ...[0,1,2].map(i=>({key:'r'+i,S:[fA.RF[i].x,fA.RF[i].y]}))];
    ids.sort((a,b)=>Math.hypot(a.S[0]-TUN[0],a.S[1]-TUN[1])-Math.hypot(b.S[0]-TUN[0],b.S[1]-TUN[1]));
    let T1=0; ids.forEach((o,i)=>{ const d=i*0.07, d1=dur(o.S,TUN); o.e1=d+d1; T1=Math.max(T1,o.e1); o.d=d; o.d1=d1; });
    ids.forEach((o,i)=>{ const segs=[{a:o.d,b:o.e1,A:o.S,B:TUN}], hide=[[o.e1,1e9]];
      if(kind==='ht'){ const K = typeof o.key==='number' ? (fB.P[o.key]?[fB.P[o.key].x,fB.P[o.key].y]:null) : [fB.RF[+o.key.slice(1)].x,fB.RF[+o.key.slice(1)].y];
        if(K){ const st=T1+4.2+i*0.09; hide[0]=[o.e1,st]; segs.push({a:st,b:st+dur(TUN,K),A:TUN,B:K}); } }
      acts.push({key:o.key, segs, hide}); });
    v.sceneT1=T1;
  }
  let end=0; acts.forEach(a=>a.segs.forEach(s=>end=Math.max(end,s.b)));
  v.scene={kind, t:0, acts, dur:end+(kind==='end'?1.2:0.8), T1:v.sceneT1, fresh:true};
  v.phase='scene'; v.pq=[]; v.wins=[];
  const rb=$('#v-rpl'); if(rb){ rb.hidden=false; const tg=rb.querySelector('.rpl-tag'); if(tg) tg.textContent=kind==='start'?'Ingresso in campo':kind==='ht'?'Intervallo':'Fine partita'; }
  const cap=$('#v-cap'); if(cap){ cap.className='cap'; cap.innerHTML=`<span>${kind==='start'?'Le squadre entrano in campo con la terna arbitrale.':kind==='ht'?'Fine primo tempo: le squadre rientrano negli spogliatoi.':'Fischio finale: le squadre rientrano negli spogliatoi.'}</span>`; }
  vScnShow(v); return true;
}
function endScene(){
  const v=viewer; if(!v||v.phase!=='scene') return; const k=v.scene.kind; v.scene=null; v.phase='live'; vScnShow(v);
  const rb=$('#v-rpl'); if(rb){ rb.hidden=true; const tg=rb.querySelector('.rpl-tag'); if(tg) tg.textContent='Replay'; }
  const bd=$('#v-board'); if(bd) bd.hidden=true;
  if(k==='start'){ v.playing=true; const b=$('#v-play'); if(b) b.textContent='Pausa'; }
  if(k==='end') finishViewer(false,'pag');
}
function scenePos(a,ts){ for(const h of a.hide) if(ts>=h[0]&&ts<h[1]) return null; let s=a.segs[0]; if(ts<s.a) return {x:s.A[0],y:s.A[1]};
  for(const g of a.segs){ if(ts<g.a) break; s=g; } const u=clamp((ts-s.a)/Math.max(0.01,s.b-s.a),0,1), e=u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2; return {x:s.A[0]+(s.B[0]-s.A[0])*e, y:s.A[1]+(s.B[1]-s.A[1])*e}; }
function sceneFrame(ts){
  const v=viewer, sc=v.scene, n=v.sim.cols.length, P=new Array(n).fill(null), RF=[null,null,null];
  for(const a of sc.acts){ const p=scenePos(a,ts); const q=p||{hidden:true,x:0,y:0}; if(typeof a.key==='number') P[a.key]=q; else RF[+a.key.slice(1)]=p; }
  const showBall = sc.kind==='start' || (sc.kind==='ht' && ts>sc.T1+3.5);
  if(!sc.cap) sc.cap=frameAt(sc.kind==='start'?0:sc.kind==='ht'?Math.max(0,v.sim.htTick-1):v.nT-1).cap;
  return {P, RF:RF.map(r=>r||{x:52.5,y:-9,hidden:true}), bx:showBall?52.5:-30, by:showBall?34:-30, bz:0, own:-1, card:0, flag:0, cap:sc.cap};
}
/* posizioni interpolate al tick t */
function frameAt(t){
  const v=viewer, fr=v.sim.frames, n=v.sim.cols.length; t=Math.max(0,t||0); const i=Math.max(0,Math.min(fr.length-1,Math.floor(t))), j=Math.min(fr.length-1,i+1), f=t-i, A=vFr(v,i), B=vFr(v,j);
  const P=new Array(n); for(let k=0;k<n;k++){ const ax=A[k*2]; if(isNaN(ax)){ P[k]=null; continue; } const bx=isNaN(B[k*2])?ax:B[k*2], by=isNaN(B[k*2+1])?A[k*2+1]:B[k*2+1]; P[k]={x:ax+(bx-ax)*f, y:A[k*2+1]+(by-A[k*2+1])*f}; }
  let bx,by,bz; const nb=n*2;
  if(B.length>=nb+12 && j>i){ const pts=[[A[nb],A[nb+1],A[nb+2]],[B[nb+3],B[nb+4],B[nb+5]],[B[nb+6],B[nb+7],B[nb+8]],[B[nb+9],B[nb+10],B[nb+11]],[B[nb],B[nb+1],B[nb+2]]];
    const s=f*4, k=Math.min(3,Math.floor(s)), w=s-k, a=pts[k], b=pts[k+1]; bx=a[0]+(b[0]-a[0])*w; by=a[1]+(b[1]-a[1])*w; bz=a[2]+(b[2]-a[2])*w; }
  else { bx=A[nb]+(B[nb]-A[nb])*f; by=A[nb+1]+(B[nb+1]-A[nb+1])*f; bz=A[nb+2]+(B[nb+2]-A[nb+2])*f; }
  let RF=null, card=0, flag=0; if(A.length>=nb+20){ const g=(k)=>{ const ax=A[nb+12+k*2], ay=A[nb+13+k*2], bx_=B[nb+12+k*2], by_=B[nb+13+k*2]; return {x:ax+(bx_-ax)*f, y:ay+(by_-ay)*f}; }; RF=[g(0),g(1),g(2)]; card=A[nb+18]; flag=A[nb+19]; }
  const cap = A.length>=nb+22 ? [A[nb+20],A[nb+21]] : [-1,-1];
  /* 0.4.2.0: orientamento del corpo e inclinazione del portiere dalla simulazione */
  const O=new Array(n); for(let k=0;k<n;k++){ const a=A[nb+24+k], b=B[nb+24+k]; let d=b-a; if(d>Math.PI) d-=2*Math.PI; else if(d<-Math.PI) d+=2*Math.PI; O[k]=a+d*f; }
  const tilt=[A[nb+22]+(B[nb+22]-A[nb+22])*f, A[nb+23]+(B[nb+23]-A[nb+23])*f];
  /* 0.4.2.3 (R6a): velocità di ogni giocatore tra i due frame (m/s), per il tipo di corsa nel 2D e nel 3D */
  const V=new Float32Array(n*2); if(j>i) for(let k=0;k<n;k++){ const ax=A[k*2], bx_=B[k*2]; if(isNaN(ax)||isNaN(bx_)) continue; V[k*2]=(bx_-ax)/DT; V[k*2+1]=(B[k*2+1]-A[k*2+1])/DT; }
  const o={bx,by,bz}; if(v.wt) vFixFrame(v,t,P,o);
  return {P, bx:o.bx, by:o.by, bz:o.bz, own:v.sim.owners[i], RF, card, flag, cap, O, tilt, dive:null, V};
}
function activeEvent(t){ const ev=viewer.sim.ev; let best=null; for(let k=Math.max(0,viewer.evI-6);k<ev.length;k++){ const e=ev[k]; if(e.t>t+8) break; if(e.t>=t-4 && e.type!=='fo' && e.p && e.p.length) best=e; } return best; }

function draw(){
  const v=viewer; if(!v) return;
  const ivOn = v.phase==='done' && v.post==='iv' && v.iv && !v.iv.closed;
  v.wins=v.wins.filter(w=>w.t1>=v.t-1); v.sp3d=v.phase==='live'?activeWin(v):null;
  const spOn = !!v.sp3d;
  const show3 = use3D() && (v.phase==='replay' || ivOn || spOn || v.phase==='scene');
  const st=$('#stage'); if(st) st.classList.toggle('is3d', show3);
  const pc=$('#pitch'); if(pc) pc.style.display=show3?'none':'block';
  if(V3.r) V3.r.domElement.style.display=show3?'block':'none';
  const lb=$('#v-labels'); if(lb) lb.style.display=show3?'':'none';
  const T=v.phase==='replay'?v.rep.t:v.t;
  const gfx=$('#v-goal'); if(gfx){ const ge=v.phase==='replay'&&v.rep.e.type==='goal' ? (T>=v.rep.e.t&&T<v.rep.e.t+6) : (v.phase==='live'&&performance.now()<(v.goalShow||0)); gfx.hidden=!ge; }
  const bd=$('#v-board'); if(bd){ const on=v.phase==='scene' && v.scene.kind==='ht' && v.scene.t>v.scene.T1+0.2 && v.scene.t<v.scene.T1+4.0;
    if(on && bd.hidden){ bd.innerHTML=`<p class="bd-h">Fine primo tempo</p><div class="bd-r"><span><i style="background:${teamColor(v,0)}"></i>${esc(vTeamName(v,0))}</span><b>${v.sc[0]}</b></div><div class="bd-r"><span><i style="background:${teamColor(v,1)}"></i>${esc(vTeamName(v,1))}</span><b>${v.sc[1]}</b></div>`; } bd.hidden=!on; }
  if(v.ingUntil && v.phase!=='scene') vScnShow(v);
  if(show3) draw3D(T, ivOn, spOn?v.sp3d:null); else draw2D(T, ivOn);
  updHud();
}

/* ---------- 2D ---------- */
/* 0.4.2.3 (R6a): riquadro 1050×600 (1,75:1), lo stesso del 3D; il campo 105×68 m in scala UNICA (8 unità per metro) con margini ai lati.
   Cerchi come nella 019: ombra, portiere con un colore suo, fascia del capitano; freccia della direzione sul BORDO del cerchio
   (orientamento della simulazione) e scia dietro chi corre (avanti, indietro o di lato: tipo di corsa della simulazione). */
const VW=1050, VH=600, VS=8, VX0=(VW-105*VS)/2, VY0=(VH-68*VS)/2;
/* tipo di corsa dalla simulazione: velocità (frame) rispetto all'orientamento del corpo (p.o) */
function vRunType(vx,vy,o){ const sp=Math.hypot(vx,vy); if(!(sp>=1.2) || !isFinite(o)) return 'fermo';
  const fw=vx*Math.cos(o)+vy*Math.sin(o), lt=-vx*Math.sin(o)+vy*Math.cos(o); return Math.abs(fw)>=Math.abs(lt) ? (fw>0?'avanti':'indietro') : 'lato'; }
function draw2D(t, ivOn){
  const v=viewer, cv=$('#pitch'); if(!cv) return;
  const W=cv.clientWidth, H=cv.clientHeight, dpr=window.devicePixelRatio||1; if(W<60||H<30) return;   /* campo nascosto (pagelle sul telefono) */
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
  const k=Math.min(W/VW,H/VH), ox=(W-VW*k)/2, oy=(H-VH*k)/2, px=1/k;   /* px: un pixel dello schermo in unità del riquadro */
  const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0); c.fillStyle=css('--ev-sidebar-end'); c.fillRect(0,0,W,H);
  c.setTransform(dpr*k,0,0,dpr*k,dpr*ox,dpr*oy);
  const X=x=>VX0+x*VS, Y=y=>VY0+y*VS, S=VS, chalk=css('--ev-chalk'), dark=css('--ev-sidebar-end'), goldL=css('--ev-brand-gold-light'), font=css('--ev-font-family')||'system-ui';
  const gr=c.createLinearGradient(0,0,VW,VH); gr.addColorStop(0,css('--ev-pitch')); gr.addColorStop(1,css('--ev-pitch2')); c.fillStyle=gr; c.fillRect(0,0,VW,VH);
  c.fillStyle=chalk; for(let i=-1;i<15;i++){ c.globalAlpha=(i+16)%2?0.035:0.012; c.fillRect(X(i*7.5),0,7.5*S,VH); } c.globalAlpha=1;
  c.strokeStyle=chalk; c.globalAlpha=0.84; c.lineWidth=Math.max(2.2,1.1*px);
  c.strokeRect(X(0),Y(0),105*S,68*S); c.beginPath(); c.moveTo(X(52.5),Y(0)); c.lineTo(X(52.5),Y(68)); c.stroke();
  c.beginPath(); c.arc(X(52.5),Y(34),9.15*S,0,Math.PI*2); c.stroke();
  c.fillStyle=chalk; c.beginPath(); c.arc(X(52.5),Y(34),3,0,Math.PI*2); c.fill();
  for(const s of [0,1]){ c.strokeRect(s?X(88.5):X(0),Y(13.84),16.5*S,40.32*S); c.strokeRect(s?X(99.5):X(0),Y(24.84),5.5*S,18.32*S);
    const ps=s?94:11; c.beginPath(); c.arc(X(ps),Y(34),3,0,Math.PI*2); c.fill();
    const a0=Math.acos(5.5/9.15); c.beginPath(); if(s) c.arc(X(ps),Y(34),9.15*S,Math.PI-a0,Math.PI+a0); else c.arc(X(ps),Y(34),9.15*S,-a0,a0); c.stroke();
    c.strokeRect(s?X(105):X(-2),Y(30.34),2*S,7.32*S); }
  for(const [x,y,a] of [[0,0,0],[105,0,Math.PI/2],[105,68,Math.PI],[0,68,-Math.PI/2]]){ c.beginPath(); c.arc(X(x),Y(y),S,a,a+Math.PI/2); c.stroke(); }
  c.globalAlpha=1;
  const f=frameAt(t), R=Math.max(13,5*px), bR=0.55*Math.max(5*px,VW/88), fs=Math.max(9*px,15);
  /* linea del fuorigioco della squadra che difende */
  if(!ivOn && f.own>=0){ const atk=v.team[f.own], def=1-atk, second=t>=v.sim.htTick, gx=((def===0)!==second)?0:105;
    if(Math.abs(f.bx-gx)<52.5){ const xs=[]; v.sim.cols.forEach((id,kk)=>{ const p=f.P[kk]; if(p && v.team[kk]===def) xs.push(Math.abs(p.x-gx)); }); xs.sort((a,b)=>a-b);
      if(xs.length>1){ const lx=gx===0?xs[1]:105-xs[1]; c.save(); c.setLineDash([6,5]); c.strokeStyle=v.kit[def].fill; c.globalAlpha=0.8; c.lineWidth=Math.max(2,1.5*px); c.beginPath(); c.moveTo(X(lx),Y(0)); c.lineTo(X(lx),Y(68)); c.stroke(); c.restore(); } } }
  const ev=ivOn?null:activeEvent(t), named=new Set(ev?ev.p:[]), flashed=new Set(ev&&ev.flash?ev.flash:[]);
  const ownId = f.own>=0 ? v.sim.cols[f.own] : null, dbg=v.d2=[];
  c.textAlign='center'; c.textBaseline='middle';
  v.sim.cols.forEach((id,kk)=>{ const p=f.P[kk]; if(!p) return; const inf=v.info[id], kit=v.kit[inf.t], cx=X(p.x), cy=Y(p.y);
    const col = inf.gk ? v.gkc[inf.t] : kit.fill;
    if(flashed.has(id)){ c.beginPath(); c.arc(cx,cy,R*2.1,0,Math.PI*2); c.fillStyle=css('--ev-brand-gold'); c.globalAlpha=0.35+0.2*Math.sin(performance.now()/160); c.fill(); c.globalAlpha=1; }
    /* scia di chi corre: dietro rispetto al movimento (con la freccia si legge se corre avanti, indietro o di lato) */
    const vx=f.V[kk*2], vy=f.V[kk*2+1], spd=Math.hypot(vx,vy), o=f.O?f.O[kk]:NaN, run=vRunType(vx,vy,o);
    if(spd>2.2){ const ux=-vx/spd, uy=-vy/spd, L=Math.min(R*1.3,spd*2.4); c.strokeStyle=chalk; c.globalAlpha=Math.min(0.55,0.15+spd*0.05); c.lineWidth=Math.max(2,px); c.beginPath();
      for(const q of [-0.45,0.45]){ const bx=cx+ux*(R+3)-uy*R*q, by=cy+uy*(R+3)+ux*R*q; c.moveTo(bx,by); c.lineTo(bx+ux*L,by+uy*L); } c.stroke(); c.globalAlpha=1; }
    c.beginPath(); c.ellipse(cx+R*0.12,cy+R*0.55,R*0.95,R*0.34,0,0,Math.PI*2); c.fillStyle=dark; c.globalAlpha=0.4; c.fill(); c.globalAlpha=1;
    c.beginPath(); c.arc(cx,cy,R,0,Math.PI*2); c.fillStyle=col; c.fill();
    if(f.cap && (kk===f.cap[0]||kk===f.cap[1])){ c.save(); c.beginPath(); c.arc(cx,cy,R,0,Math.PI*2); c.clip(); c.fillStyle=goldL; c.fillRect(cx-R,cy-R,R*0.4,R*2); c.restore(); }
    c.beginPath(); c.arc(cx,cy,R,0,Math.PI*2); c.lineWidth=Math.max(kit.thick||kit.alt?3.4:2.6, 1.1*px); c.strokeStyle=inf.gk?dark:(kit.alt?kit.edge:chalk); c.stroke();
    if(inf.gk){ c.beginPath(); c.arc(cx,cy,R-2.6,0,Math.PI*2); c.lineWidth=1.4; c.strokeStyle=chalk; c.stroke(); }
    if(id===ownId){ c.beginPath(); c.arc(cx,cy,R+3.2,0,Math.PI*2); c.lineWidth=Math.max(2.4,1.2*px); c.strokeStyle=goldL; c.stroke(); }
    if(W>=420){ c.font=`900 ${Math.round(R*1.05)}px ${font}`; c.fillStyle=relLum(col)>0.3?dark:chalk; c.fillText(inf.num, cx, cy+0.8); }
    /* freccia della direzione sul bordo (mai sopra il numero) */
    if(isFinite(o)){ const ca=Math.cos(o), sa=Math.sin(o), rb=R-0.5, rt=R+R*0.62, h=0.42;
      c.beginPath(); c.moveTo(cx+ca*rt,cy+sa*rt); c.lineTo(cx+Math.cos(o+h)*rb,cy+Math.sin(o+h)*rb); c.lineTo(cx+Math.cos(o-h)*rb,cy+Math.sin(o-h)*rb); c.closePath();
      c.fillStyle=chalk; c.fill(); c.lineWidth=1.2; c.strokeStyle=dark; c.stroke();
      dbg.push({k:kk, cx, cy, R, base:rb*Math.cos(h), tip:rt, run}); }
    if(id===ownId) named.add(id);
  });
  c.lineJoin='round'; c.font=`600 ${fs}px ${font}`;
  named.forEach(id=>{ const kk=v.sim.cols.indexOf(id), p=f.P[kk]; if(!p) return; const tx=X(p.x), ty=Y(p.y)-R*2.1; c.lineWidth=3.5; c.strokeStyle=dark; c.strokeText(v.info[id].ln,tx,ty); c.fillStyle=flashed.has(id)?css('--ev-gold-hi'):chalk; c.fillText(v.info[id].ln,tx,ty); });
  if(!ivOn && f.RF){ f.RF.forEach((q,i)=>{ const rr=R*(i?0.58:0.72), qx=X(q.x), qy=Y(q.y);
      c.beginPath(); c.ellipse(qx+rr*0.12,qy+rr*0.55,rr*0.9,rr*0.32,0,0,Math.PI*2); c.fillStyle=dark; c.globalAlpha=0.4; c.fill(); c.globalAlpha=1;
      if(i){ c.fillStyle=dark; c.fillRect(qx-rr,qy-rr,rr*2,rr*2); c.lineWidth=2; c.strokeStyle=goldL; c.strokeRect(qx-rr,qy-rr,rr*2,rr*2);
        const up=f.flag===i; c.fillStyle=up?'#f0d64a':'#e4572e'; const fx=qx+rr*0.6, fy=qy-(up?rr*2.4:rr*0.2); c.fillRect(fx,fy,rr*1.1,rr*0.8); c.fillStyle=chalk; c.fillRect(fx-1,fy,1.6,rr*(up?2.2:1.2)); }
      else { c.beginPath(); c.arc(qx,qy,rr,0,Math.PI*2); c.fillStyle=dark; c.fill(); c.lineWidth=2; c.strokeStyle=goldL; c.stroke();
        c.beginPath(); c.moveTo(qx-rr*0.5,qy-rr*0.5); c.lineTo(qx+rr*0.5,qy+rr*0.5); c.moveTo(qx+rr*0.5,qy-rr*0.5); c.lineTo(qx-rr*0.5,qy+rr*0.5); c.lineWidth=1.6; c.strokeStyle=chalk; c.stroke(); } });
    if(f.card>0){ const q=f.RF[0]; c.fillStyle=f.card===1?'#f5d020':'#d8262c'; c.strokeStyle=dark; c.lineWidth=1.2; const w=R*1.2, h=R*1.6;
      const tg=cardTarget(f,t), cx=(tg && tg.x<q.x) ? X(q.x)-R*0.4-w : X(q.x)+R*0.4; c.fillRect(cx,Y(q.y)-R*2.7,w,h); c.strokeRect(cx,Y(q.y)-R*2.7,w,h); } }
  if(!ivOn){ const bz=Math.max(0,f.bz); c.beginPath(); c.ellipse(X(f.bx)+bz*S*0.25,Y(f.by)+bz*S*0.15,bR,bR*0.72,0,0,Math.PI*2); c.fillStyle=dark; c.globalAlpha=0.5; c.fill(); c.globalAlpha=1;
    c.beginPath(); c.arc(X(f.bx),Y(f.by)-bz*S*0.6,bR*(1+bz*0.05),0,Math.PI*2); c.fillStyle=chalk; c.fill(); c.lineWidth=Math.max(1.2,0.8*px); c.strokeStyle=dark; c.stroke(); }
}

/* ---------- 3D ---------- */
const V3 = {pref:true, ok:null, load:false, lt:0, r:null, sc:null, cam:null, ball:null, men:new Map(), rings:[], mats:{}, camMode:'tv', cp:null, cl:null, last:0, w:0, h:0};
try{ if(localStorage.getItem('presidente-vista')==='2d') V3.pref=false; }catch(e){}
/* three.js a richiesta (0.4.2.1, N2): la pagina non lo carica più all'avvio; arriva solo quando serve il 3D (visore aperto con il 3D
   acceso, o «Replay 3D: sì»). Indirizzo in window.THREE_SRC (shell.html: cdnjs; beta: vendor/three.min.js). Mentre arriva il visore
   resta in 2D con «Carico il 3D…»; se non arriva (errore o 20 s) resta il 2D. Solo disegno: la partita non cambia. */
function vThreeMsg(){ const e=$('#v-3msg'); if(e) e.hidden=!V3.load; }
function vThreeDone(ok){
  if(!V3.load) return; V3.load=false; clearTimeout(V3.lt);
  if(ok&&window.THREE) V3.ok=null; else { V3.ok=false; toast('Il 3D non si è caricato: il visore resta in 2D.'); }
  vThreeMsg();
  if(viewer){ if(V3.ok!==false) setupMatch3D(); if(onMatchPage()) render(); }
}
function loadThree(){
  if(window.THREE || V3.load || V3.ok===false) return;
  const src=window.THREE_SRC; if(!src){ V3.ok=false; return; }
  V3.load=true; vThreeMsg();
  const s=document.createElement('script'); s.src=src; s.async=true;
  s.onload=()=>vThreeDone(true); s.onerror=()=>vThreeDone(false); V3.lt=setTimeout(()=>vThreeDone(false),20000);
  document.head.appendChild(s);
}
function use3D(){ if(!V3.pref) return false; if(V3.ok===null){ if(!window.THREE){ loadThree(); return false; } V3.ok=initThree(); } return V3.ok; }
const lin = c=>new THREE.Color(c).convertSRGBToLinear();
function mat(c){ if(!V3.mats[c]) V3.mats[c]=new THREE.MeshLambertMaterial({color:lin(c)}); return V3.mats[c]; }
function lum(hex){ const n=parseInt(hex.slice(1),16); return (0.299*(n>>16&255)+0.587*(n>>8&255)+0.114*(n&255))/255; }
const angDiff=(a,b)=>{ let d=(a-b)%(Math.PI*2); if(d>Math.PI) d-=Math.PI*2; if(d<-Math.PI) d+=Math.PI*2; return d; };
function pitchTexture(){
  const S=10, c=document.createElement('canvas'); c.width=113*S; c.height=76*S; const g=c.getContext('2d');
  g.fillStyle='#2e7643'; g.fillRect(0,0,c.width,c.height);
  for(let i=0;i<14;i++) if(i%2){ g.fillStyle='#296b3c'; g.fillRect((4+i*7.5)*S,0,7.5*S,c.height); }
  const X=x=>(4+x)*S, Y=y=>(4+y)*S;
  g.strokeStyle='rgba(244,247,238,.92)'; g.fillStyle='rgba(244,247,238,.92)'; g.lineWidth=1.5;
  g.strokeRect(X(0),Y(0),105*S,68*S);
  g.beginPath(); g.moveTo(X(52.5),Y(0)); g.lineTo(X(52.5),Y(68)); g.stroke();
  g.beginPath(); g.arc(X(52.5),Y(34),9.15*S,0,Math.PI*2); g.stroke();
  g.beginPath(); g.arc(X(52.5),Y(34),3,0,Math.PI*2); g.fill();
  for(const s of [0,1]){
    const ax=s?105-16.5:0, gx=s?105-5.5:0, px=s?105-11:11;
    g.strokeRect(X(ax),Y(13.84),16.5*S,40.32*S); g.strokeRect(X(gx),Y(24.84),5.5*S,18.32*S);
    g.beginPath(); g.arc(X(px),Y(34),3,0,Math.PI*2); g.fill();
    const a0=Math.acos(5.5/9.15); g.beginPath(); if(s) g.arc(X(px),Y(34),9.15*S,Math.PI-a0,Math.PI+a0); else g.arc(X(px),Y(34),9.15*S,-a0,a0); g.stroke();
  }
  for(const [x,y,a] of [[0,0,0],[105,0,Math.PI/2],[105,68,Math.PI],[0,68,-Math.PI/2]]){ g.beginPath(); g.arc(X(x),Y(y),1*S,a,a+Math.PI/2); g.stroke(); }
  return c;
}
function goalMesh(s){
  const T=THREE, g=new T.Group(), m=mat('#f3f4f0'), x=s*52.5, R=0.07;
  for(const z of [-3.66,3.66]){ const p=new T.Mesh(new T.CylinderGeometry(R,R,2.44,8),m); p.position.set(x,1.22,z); p.castShadow=true; g.add(p); }
  const bar=new T.Mesh(new T.CylinderGeometry(R,R,7.46,8),m); bar.rotation.x=Math.PI/2; bar.position.set(x,2.44,0); bar.castShadow=true; g.add(bar);
  const pts=[], dpt=2, add=(x1,y1,z1,x2,y2,z2)=>pts.push(x1,y1,z1,x2,y2,z2);
  const bx=x+s*dpt;
  for(let i=0;i<=14;i++){ const z=-3.66+i*7.32/14; add(bx,0,z,bx,2.44,z); add(x,2.44,z,bx,2.44,z); }      // fondo e tetto
  for(let j=0;j<=5;j++){ const y=j*2.44/5; add(bx,y,-3.66,bx,y,3.66); add(x,y,-3.66,bx,y,-3.66); add(x,y,3.66,bx,y,3.66); }
  for(let i=1;i<4;i++){ const xx=x+s*dpt*i/4; add(xx,0,-3.66,xx,2.44,-3.66); add(xx,0,3.66,xx,2.44,3.66); add(xx,2.44,-3.66,xx,2.44,3.66); }
  const ng=new T.BufferGeometry(); ng.setAttribute('position', new T.Float32BufferAttribute(pts,3));
  const net=new T.LineSegments(ng, new T.LineBasicMaterial({color:lin('#eef3ec'),transparent:true,opacity:0.55})); g.add(net);
  return g;
}
function initThree(){
  if(!window.THREE) return false;
  try{
    const T=THREE;
    const r=new T.WebGLRenderer({antialias:true});
    r.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
    r.shadowMap.enabled=true; r.shadowMap.type=T.PCFSoftShadowMap; r.outputEncoding=T.sRGBEncoding;
    r.domElement.className='gl'; r.domElement.setAttribute('role','img'); r.domElement.setAttribute('aria-label','Campo 3D con le azioni salienti della partita');
    const sc=new T.Scene(); sc.background=new T.Color('#08120d'); sc.fog=new T.Fog('#08120d',120,240);
    const cam=new T.PerspectiveCamera(36,16/9,0.5,500);
    sc.add(new T.HemisphereLight('#e9f1ff','#1b3a22',0.85));
    const sun=new T.DirectionalLight('#fff3dc',0.8); sun.position.set(-25,70,30); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024);
    Object.assign(sun.shadow.camera,{left:-62,right:62,top:42,bottom:-42,near:10,far:170}); sun.shadow.bias=-0.0006; sc.add(sun);
    const ground=new T.Mesh(new T.PlaneGeometry(180,130), mat('#1b4128')); ground.rotation.x=-Math.PI/2; ground.position.y=-0.02; ground.receiveShadow=true; sc.add(ground);
    const tex=new T.CanvasTexture(pitchTexture()); tex.anisotropy=Math.min(8,r.capabilities.getMaxAnisotropy()); tex.encoding=T.sRGBEncoding;
    const pitch=new T.Mesh(new T.PlaneGeometry(113,76), new T.MeshLambertMaterial({map:tex})); pitch.rotation.x=-Math.PI/2; pitch.receiveShadow=true; sc.add(pitch);
    sc.add(goalMesh(-1)); sc.add(goalMesh(1));
    // cartelloni pubblicitari a bordo campo
    const bcol=['#1f3d8a','#d8d3c4','#a8402c','#d8d3c4'];
    for(let i=0;i<14;i++) for(const z of [-39,39]){ if(z<0 && Math.abs(-52+i*8)<15) continue; const b=new T.Mesh(new T.BoxGeometry(8,0.9,0.2), mat(bcol[i%4])); b.position.set(-52+i*8,0.45,z); sc.add(b); }
    for(let i=0;i<9;i++) for(const x of [-57.5,57.5]){ if(Math.abs(-32+i*8)<6) continue; const b=new T.Mesh(new T.BoxGeometry(0.2,0.9,8), mat(bcol[(i+1)%4])); b.position.set(x,0.45,-32+i*8); sc.add(b); }
    // tunnel degli spogliatoi, tra le due panchine
    { const tg=new T.Group(); const m1=mat('#3d4650'), m2=new T.MeshBasicMaterial({color:'#050706'});
      const o=new T.Mesh(new T.BoxGeometry(5.2,3.2,2.6),m1); o.position.set(0,1.6,-41.3); o.castShadow=true; tg.add(o);
      const d=new T.Mesh(new T.BoxGeometry(3.4,2.6,0.05),m2); d.position.set(0,1.3,-39.98); tg.add(d);
      const rf=new T.Mesh(new T.BoxGeometry(5.6,0.12,3.4),m1); rf.position.set(0,3.25,-41); tg.add(rf); sc.add(tg); }
    // tribune con il pubblico
    const steps=8, crowd=[];
    for(const side of [-1,1]) for(let k=0;k<steps;k++){
      const st=new T.Mesh(new T.BoxGeometry(124,0.8,2.2), mat(k%2?'#27322c':'#2e3a33')); st.position.set(0,0.4+k*0.8,side*(42.5+k*2.2)); st.receiveShadow=true; sc.add(st);
      for(let j=0;j<70;j++) crowd.push([-60+j*1.75+(Math.sin(j*k*7.1)*0.4), 1.15+k*0.8, side*(42.5+k*2.2)]);
    }
    for(const side of [-1,1]) for(let k=0;k<6;k++){
      const st=new T.Mesh(new T.BoxGeometry(2.2,0.8,74), mat(k%2?'#27322c':'#2e3a33')); st.position.set(side*(61.5+k*2.2),0.4+k*0.8,0); st.receiveShadow=true; sc.add(st);
      for(let j=0;j<42;j++) crowd.push([side*(61.5+k*2.2), 1.15+k*0.8, -36+j*1.75+(Math.sin(j*k*5.3)*0.4)]);
    }
    const im=new T.InstancedMesh(new T.BoxGeometry(0.55,0.75,0.45), new T.MeshLambertMaterial({color:'#ffffff'}), crowd.length);
    const dm=new T.Object3D(), cc=new T.Color(), pal=['#c8452f','#2f6fc8','#e8e2d0','#e0a526','#3a3a3a','#7a3fb0','#1f8f6a','#d0507a','#f0f0f0'];
    crowd.forEach((p,i)=>{ dm.position.set(p[0],p[1],p[2]); dm.updateMatrix(); im.setMatrixAt(i,dm.matrix); im.setColorAt(i,cc.set(pal[(i*7+Math.floor(i/13))%pal.length]).convertSRGBToLinear()); });
    sc.add(im); V3.crowd=im; V3.crowdBase=crowd;
    const ball=new T.Mesh(new T.SphereGeometry(0.175,18,14), mat('#f7f7f2')); ball.castShadow=true; sc.add(ball);
    for(let i=0;i<2;i++){ const rg=new T.Mesh(new T.RingGeometry(0.9,1.3,40), new T.MeshBasicMaterial({color:lin('#ffcf4a'),transparent:true,opacity:0.8,side:T.DoubleSide})); rg.rotation.x=-Math.PI/2; rg.position.y=0.04; rg.visible=false; sc.add(rg); V3.rings.push(rg); }
    const mic=new T.Group(); const hd=new T.Mesh(new T.SphereGeometry(0.055,12,10),mat('#2b2b2e')); mic.add(hd);
    const hn=new T.Mesh(new T.CylinderGeometry(0.022,0.018,0.32,10),mat('#111114')); hn.position.set(0,-0.18,0); mic.add(hn);
    const fl=new T.Mesh(new T.BoxGeometry(0.075,0.06,0.075),mat('#c8452f')); fl.position.set(0,-0.08,0); mic.add(fl);
    mic.visible=false; sc.add(mic); V3.mic=mic;
    Object.assign(V3,{r,sc,cam,ball,cp:new T.Vector3(0,20,40),cl:new T.Vector3(0,0,0)});
    return true;
  }catch(e){ return false; }
}
function personMesh(kit, shorts, skin, hair, hcm){
  const T=THREE, g=new T.Group();
  const torso=new T.Mesh(new T.CylinderGeometry(0.27,0.22,0.72,10),mat(kit)); torso.position.y=1.3;
  const sh=new T.Mesh(new T.CylinderGeometry(0.24,0.26,0.3,10),mat(shorts)); sh.position.y=0.84;
  const head=new T.Mesh(new T.SphereGeometry(0.16,12,10),mat(skin)); head.position.y=1.86;
  const legs=[], arms=[];
  for(const s of [-1,1]){
    const hip=new T.Group(); hip.position.set(s*0.12,0.74,0); const leg=new T.Mesh(new T.BoxGeometry(0.13,0.7,0.14),mat(kit)); leg.position.y=-0.35; hip.add(leg); g.add(hip); legs.push(hip);
    const shl=new T.Group(); shl.position.set(s*0.33,1.6,0); const arm=new T.Mesh(new T.BoxGeometry(0.1,0.58,0.1),mat(skin)); arm.position.y=-0.29; shl.add(arm); const slv=new T.Mesh(new T.BoxGeometry(0.13,0.24,0.13),mat(kit)); slv.position.y=-0.1; shl.add(slv); g.add(shl); arms.push(shl);
  }
  g.add(torso); g.add(sh); g.add(head);
  const neck=new T.Mesh(new T.CylinderGeometry(0.07,0.08,0.14,8),mat(skin)); neck.position.y=1.7; g.add(neck);
  const hr=new T.Mesh(new T.SphereGeometry(0.168,14,10,0,Math.PI*2,0,Math.PI*0.52),mat(hair)); hr.position.set(0,1.875,-0.012); hr.rotation.x=-0.25; g.add(hr);
  for(const s of [-1,1]){ const e=new T.Mesh(new T.SphereGeometry(0.014,8,6),mat('#1a1410')); e.position.set(s*0.055,1.885,0.146); g.add(e);
    const ear=new T.Mesh(new T.SphereGeometry(0.035,8,6),mat(skin)); ear.position.set(s*0.158,1.86,0); ear.scale.set(0.5,1,0.8); g.add(ear); }
  const mo=new T.Mesh(new T.BoxGeometry(0.06,0.012,0.01),mat('#6b2f26')); mo.position.set(0,1.8,0.155); g.add(mo);
  const nose=new T.Mesh(new T.BoxGeometry(0.025,0.045,0.03),mat(skin)); nose.position.set(0,1.845,0.162); g.add(nose);
  const col=new T.Mesh(new T.TorusGeometry(0.1,0.022,6,16),mat(shorts)); col.rotation.x=Math.PI/2; col.position.y=1.655; g.add(col);
  g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
  const sc=(hcm||180)/100/2.04; g.scale.setScalar(sc); g.userData={legs,arms,ph:0,s:sc};
  return g;
}

function setupMatch3D(){
  if(!use3D()||!viewer) return; const v=viewer;
  V3.men.forEach(g=>V3.sc.remove(g)); V3.men.clear();
  const skins=['#f1c7a5','#e2ae86','#c68b62','#8d5a3b','#5e3a26'], hairs=['#1a1310','#3b2615','#5a3a1e','#8a6a3a','#d8c08a','#2a2a2a'];
  v.sim.cols.forEach((id,k)=>{ const inf=v.info[id]; let kit=v.kit[inf.t].fill; if(inf.gk) kit=v.gkc[inf.t];   /* 0.4.2.3: stesse maglie del 2D */
    const g=personMesh(kit, lum(kit)>0.55?'#1d2433':'#f2f2ee', skins[(id*7)%5], hairs[(id*11)%6], inf.h);
    const n=parseInt(kit.slice(1),16), yel=(n>>16&255)>180&&(n>>8&255)>150&&(n&255)<120, band=new THREE.Mesh(new THREE.CylinderGeometry(0.082,0.082,0.11,14), new THREE.MeshLambertMaterial({color:lin(yel?'#16181c':'#f5d020')}));
    band.position.set(0,-0.13,0); band.visible=false; g.userData.arms[1].add(band); g.userData.band=band;
    g.visible=false; V3.sc.add(g); V3.men.set(k,g); });
  (V3.refs||[]).forEach(g=>V3.sc.remove(g)); (V3.coaches||[]).forEach(g=>V3.sc.remove(g));
  V3.refs=[0,1,2].map(k=>{ const g=personMesh('#141414','#141414',skins[(k*3+1)%5],hairs[(k*5+2)%6],k?178:182); g.visible=false;
    const hand=new THREE.Mesh(new THREE.BoxGeometry(k?0.36:0.34,k?0.28:0.45,k?0.02:0.015), k?new THREE.MeshLambertMaterial({color:lin('#e4572e')}):new THREE.MeshBasicMaterial({color:lin('#f5d020')}));
    hand.position.set(k?0.2:0,k?-0.62:-0.86,k?0:0.05); g.userData.arms[1].add(hand); g.userData.prop=hand; V3.sc.add(g); return g; });
  V3.coaches=[0,1].map(s=>{ const g=personMesh(s===0?'#2a2f3a':'#3a2a2a','#20232a',skins[(s*2+2)%5],hairs[(s+1)%6],180); g.position.set((s===0?-9:9),0,-36.4); g.rotation.y=0; V3.sc.add(g); return g; });
  (V3.mgr||[]).forEach(g=>V3.sc.remove(g));
  V3.mgr=[0,1].map(s=>{ const g=personMesh(s===0?'#20262e':'#2b2024','#1b1f25',skins[(s*3+4)%5],hairs[(s+3)%6],178);
    const cv=document.createElement('canvas'); cv.width=256; cv.height=176; const tx=new THREE.CanvasTexture(cv);
    const brd=new THREE.Mesh(new THREE.BoxGeometry(1.25,0.82,0.06), [mat('#111'),mat('#111'),mat('#111'),mat('#111'),new THREE.MeshBasicMaterial({map:tx}),mat('#111')]);
    brd.position.set(0,2.6,0.12); g.add(brd); g.userData.board={cv,tx,key:''}; g.visible=false; V3.sc.add(g); return g; });
  /* panchine: struttura con tettoia trasparente, seduta, riserve sedute e allenatore nell'area tecnica */
  if(!V3.dug){ const T=THREE; V3.dug=[0,1].map(s=>{ const g=new T.Group(), cx=s===0?-9:9;
      const wall=mat('#2b333b'), glass=new T.MeshLambertMaterial({color:lin('#bcd3e0'),transparent:true,opacity:0.32,side:T.DoubleSide});
      const add=(geo,m,x,y,z)=>{ const o=new T.Mesh(geo,m); o.position.set(x,y,z); o.castShadow=true; o.receiveShadow=true; g.add(o); return o; };
      add(new T.BoxGeometry(8.4,0.12,2.4),mat('#3a434b'),0,0.06,-38.7);
      add(new T.BoxGeometry(8.4,2.1,0.12),wall,0,1.05,-39.9);
      for(const e of [-4.2,4.2]) add(new T.BoxGeometry(0.1,2.1,2.4),glass,e,1.05,-38.7);
      add(new T.BoxGeometry(8.6,0.08,2.6),glass,0,2.12,-38.6);
      const stripe=add(new T.BoxGeometry(8.6,0.22,0.06),mat('#888888'),0,2.02,-37.32); g.userData.stripe=stripe;
      add(new T.BoxGeometry(7.8,0.08,0.55),mat('#1f4e8c'),0,0.46,-39.35); add(new T.BoxGeometry(7.8,0.5,0.08),mat('#1f4e8c'),0,0.75,-39.62);
      for(let i=0;i<9;i++) add(new T.BoxGeometry(0.06,0.42,0.5),mat('#16365f'),-3.6+i*0.9,0.21,-39.35);
      g.position.x=cx; V3.sc.add(g); return g; }); }
  V3.dug.forEach((g,s)=>{ g.userData.stripe.material=mat(teamColor(v,s)); });
  V3.cp.set(0,22,44); V3.cl.set(0,0,0); V3.last=performance.now();
}
function draw3D(t, ivOn, sp){
  const v=viewer, host=$('#stage'); if(!host||!V3.r) return; const T=THREE;
  if(V3.r.domElement.parentNode!==host) host.prepend(V3.r.domElement);
  /* 0.4.2.3 (R6a): lo stesso riquadro del 2D (1,75:1): nessun salto passando dall'uno all'altro */
  const W=host.clientWidth, H=host.clientHeight||Math.round(W/1.75);
  if(V3.w!==W||V3.h!==H){ V3.r.setSize(W,H); V3.cam.aspect=W/H; V3.cam.fov=36; V3.cam.updateProjectionMatrix(); V3.w=W; V3.h=H; }
  const now=performance.now(), dt=Math.min(0.1,(now-V3.last)/1000)||0.016; V3.last=now;
  const inScene=v.phase==='scene' && v.scene;
  const f=inScene?sceneFrame(v.scene.t):frameAt(t), f2=inScene?sceneFrame(v.scene.t+0.5):frameAt(Math.min(v.nT-1,t+0.5));
  const starK = ivOn ? v.sim.cols.indexOf(v.iv.best) : -1;
  const bx=f.bx-52.5, bz=f.by-34;
  { const red=new Set(v.sim.red||[]), cnt=[0,0]; V3.bench=new Map(); v.sim.cols.forEach((id,k)=>{ if(f.P[k] || red.has(id)) return; const tm_=v.team[k]; if(cnt[tm_]<8) V3.bench.set(k,cnt[tm_]++); }); }
  V3.men.forEach((g,k)=>{
    let p=f.P[k], q=f2.P[k];
    if(k===starK) p=q={x:52.5,y:58.5};
    if(g.userData.band) g.userData.band.visible = !!(f.cap && (k===f.cap[0]||k===f.cap[1]) && p && !p.hidden);
    if(p && p.hidden){ g.visible=false; return; }
    if(!p){ const seat=V3.bench&&V3.bench.get(k); if(seat==null||ivOn){ g.visible=false; return; }
      const tm_=v.team[k], u=g.userData; g.visible=true; g.position.set((tm_===0?-9:9)-3.15+seat*0.9, 0.5-0.74*u.s, -39.3); g.rotation.y=0;
      u.legs[0].rotation.x=-Math.PI/2; u.legs[1].rotation.x=-Math.PI/2; u.legs[0].rotation.z=0; u.legs[1].rotation.z=0; u.arms[0].rotation.x=-0.3; u.arms[1].rotation.x=-0.3; u.arms[0].rotation.z=0; u.arms[1].rotation.z=0; return; }
    g.position.y=0; g.visible=true;
    const x=p.x-52.5, z=p.y-34; const vx=((q||p).x-p.x)/0.5, vz=((q||p).y-p.y)/0.5, sp=Math.hypot(vx,vz);
    const fv=!inScene&&!ivOn&&f.V, run=fv?vRunType(f.V[k*2],f.V[k*2+1],f.O?f.O[k]:NaN):'avanti';   /* 0.4.2.3: tipo di corsa della simulazione */
    if(ivOn && k===starK){ g.position.x+=(x-g.position.x)*Math.min(1,dt*3); g.position.z+=(z-g.position.z)*Math.min(1,dt*3); } else g.position.set(x,0,z);
    const so=f.O&&!inScene&&!ivOn?f.O[k]:null;   /* 0.4.2.0: il corpo guarda dove dice la simulazione */
    const face = k===starK ? Math.atan2(V3.cp.x-g.position.x, V3.cp.z-g.position.z) : so!=null&&isFinite(so) ? Math.atan2(Math.cos(so),Math.sin(so)) : sp>0.6 ? Math.atan2(vx,vz) : inScene ? 0 : Math.atan2(bx-x, bz-z);
    if(so!=null&&isFinite(so)) g.rotation.y=face; else g.rotation.y += angDiff(face,g.rotation.y)*Math.min(1,dt*8);
    const u=g.userData; u.run=run; u.ph+=sp*dt*1.7*(run==='indietro'?1.25:run==='lato'?1.4:1)*(ivOn?0:1); const amp=ivOn?0:Math.min(run==='avanti'||run==='fermo'?0.85:0.5,sp*0.09), s=Math.sin(u.ph)*amp;
    if(run==='lato'){ const a=Math.abs(s)*0.9; u.legs[0].rotation.x=s*0.2; u.legs[1].rotation.x=-s*0.2; u.legs[0].rotation.z=-a; u.legs[1].rotation.z=a;   /* passo laterale: gambe che si aprono */
      u.arms[0].rotation.x=-0.15; u.arms[1].rotation.x=-0.15; u.arms[0].rotation.z=-0.25-a*0.3; u.arms[1].rotation.z=0.25+a*0.3; }
    else if(run==='indietro'){ u.legs[0].rotation.x=-s*0.8; u.legs[1].rotation.x=s*0.8; u.legs[0].rotation.z=0; u.legs[1].rotation.z=0;   /* all'indietro: passi corti, braccia avanti */
      u.arms[0].rotation.x=-0.45+s*0.3; u.arms[1].rotation.x=-0.45-s*0.3; u.arms[0].rotation.z=-0.1; u.arms[1].rotation.z=0.1; }
    else { u.legs[0].rotation.x=s; u.legs[1].rotation.x=-s; u.legs[0].rotation.z=0; u.legs[1].rotation.z=0; u.arms[0].rotation.x=-s*0.8; u.arms[1].rotation.x=s*0.8; u.arms[0].rotation.z=0; u.arms[1].rotation.z=0; }
    g.rotation.z=0;
    const inf_=v.info[v.sim.cols[k]], tl=f.tilt&&inf_&&inf_.gk&&!ivOn&&!inScene?f.tilt[v.team[k]]:0;
    if(tl && Math.abs(tl)>0.05){ const fc=g.rotation.y, lean=Math.min(1.25,Math.abs(tl)), sf=Math.sin(fc)||1; g.rotation.z=Math.sign(tl)*Math.sign(sf)*lean; g.position.y=0.35*lean/1.25;   /* tuffo (0.4.2.0: dalla simulazione) */
      u.arms[0].rotation.x=Math.PI*0.95; u.arms[1].rotation.x=Math.PI*0.95; u.arms[0].rotation.z=-0.2; u.arms[1].rotation.z=0.2; u.legs[0].rotation.x=0.15; u.legs[1].rotation.x=-0.15; }
    const ev=v.rep?v.rep.e:null;
    if(ev && ev.type==='goal' && t>=ev.t+1 && v.sim.cols[k]===ev.p[0]){ const w=Math.sin(now/140)*0.25; u.arms[0].rotation.x=Math.PI*0.95+w; u.arms[1].rotation.x=Math.PI*0.95-w; u.arms[0].rotation.z=-0.35; u.arms[1].rotation.z=0.35; }
  });
  /* terna arbitrale */
  if(V3.refs){ V3.refs.forEach((g,k)=>{ const q=f.RF&&f.RF[k], q2=f2.RF&&f2.RF[k]; if(!q||q.hidden||ivOn){ g.visible=false; return; } g.visible=true;
      const x=q.x-52.5, z=q.y-34, vx=(q2.x-q.x)/0.5, vz=(q2.y-q.y)/0.5, sp=Math.hypot(vx,vz); g.position.set(x,0,z);
      let face = inScene ? (sp>0.6?Math.atan2(vx,vz):0) : k? (k===1?0:Math.PI) : (sp>2.5?Math.atan2(vx,vz):Math.atan2(bx-x,bz-z));
      const tg=(!k && !inScene) ? cardTarget(f,t) : null;
      if(tg){ face=Math.atan2((tg.x-52.5)-x,(tg.y-34)-z); }
      if(tg && f.card>0) g.rotation.y=face; else g.rotation.y += angDiff(face,g.rotation.y)*Math.min(1,dt*(tg?14:8));
      const u=g.userData; u.ph+=sp*dt*1.7; const amp=Math.min(0.75,sp*0.09), s=Math.sin(u.ph)*amp;
      u.legs[0].rotation.x=k?s*0.5:s; u.legs[1].rotation.x=k?-s*0.5:-s; u.legs[0].rotation.z=k?Math.abs(s)*0.35:0; u.legs[1].rotation.z=k?-Math.abs(s)*0.35:0;
      u.arms[0].rotation.x=-s*0.8; u.arms[1].rotation.x=s*0.8; u.arms[1].rotation.z=0;
      if(k===0){ u.prop.visible=f.card>0; if(f.card>0){ u.prop.material.color.copy(lin(f.card===1?'#f5d020':'#d8262c')); u.arms[1].rotation.x=Math.PI*0.92; u.arms[1].rotation.z=0.12; } }
      else if(f.flag===k){ u.arms[1].rotation.x=Math.PI*0.9; } }); }
  if(V3.mgr){ V3.mgr.forEach((g,s)=>{ let call=null; if(!ivOn && v.phase!=='scene') for(const c of v.sim.ev){ if(c.type!=='subcall'||c.side!==s) continue; if(c.subT==null){ const z=v.sim.ev.find(x=>x.type==='sub'&&x.t>=c.t&&x.p[0]===c.p[0]); c.subT=z?z.t:c.t+20; } if(t>=c.t+3 && t<=c.subT+3){ call=c; break; } if(c.t>t) break; }
      g.visible=!!call; if(!call) return; g.position.set(s===0?-2.9:2.9,0,-35.9); g.rotation.y=0; const u=g.userData; u.arms[0].rotation.x=Math.PI*0.88; u.arms[1].rotation.x=Math.PI*0.88; u.arms[0].rotation.z=-0.25; u.arms[1].rotation.z=0.25; u.legs[0].rotation.x=0; u.legs[1].rotation.x=0;
      const inN=v.info[call.p[0]]?.num, outN=call.p[1]!=null?v.info[call.p[1]]?.num:null, key=inN+'/'+outN, b=u.board;
      if(b.key!==key){ const c=b.cv.getContext('2d'); c.fillStyle='#0b0d0c'; c.fillRect(0,0,256,176); c.font='700 74px "IBM Plex Mono", ui-monospace, monospace'; c.textAlign='center'; c.textBaseline='middle';
        c.shadowBlur=14; if(outN!=null){ c.fillStyle='#ff3b30'; c.shadowColor='#ff3b30'; c.fillText(String(outN).padStart(2,'0'),128,48); } c.fillStyle='#35e06a'; c.shadowColor='#35e06a'; c.fillText(String(inN).padStart(2,'0'),128,outN!=null?128:88); b.tx.needsUpdate=true; b.key=key; } }); }
  if(V3.coaches){ V3.coaches.forEach((g,s)=>{ const off=v.sim.ev.find(x=>x.type==='coachoff' && x.side===s && x.t<=t); let vis=!ivOn, px=s===0?-9:9, pz=-36.4, mv=0;
      if(off){ if(off.ts==null) off.ts=(cardShownAt(off.t,true)??off.t+8)+3; const ts=off.ts, u=clamp((t-ts)/14,0,1); if(t>ts){ px=px*(1-u); pz=-36.4-u*3; mv=u<1?1:0; } if(u>=1) vis=false; }
      g.visible=vis; g.position.set(px,0,pz); g.rotation.y=off&&t>off.ts?Math.PI*(s===0?0.5:-0.5):0; const uu=g.userData; uu.ph+=mv*dt*4; const sw=Math.sin(uu.ph)*0.5*mv; uu.legs[0].rotation.x=sw; uu.legs[1].rotation.x=-sw; }); }
  V3.ball.visible=!ivOn && f.bx>-5; V3.ball.position.set(bx, 0.175+Math.max(0,f.bz), bz); V3.ball.rotation.x+=dt*4;
  const e=v.rep?v.rep.e:null, fl=e&&e.flash?e.flash:[];
  V3.rings.forEach((rg,i)=>{ const k=fl[i]!=null?v.sim.cols.indexOf(fl[i]):-1, g=V3.men.get(k); rg.visible=!!(g&&g.visible); if(rg.visible){ rg.position.x=g.position.x; rg.position.z=g.position.z; rg.scale.setScalar(1+0.15*Math.sin(now/170)); } });
  if(V3.crowd){ const jump=e&&e.type==='goal'&&t>=e.t; if(jump||V3.jumping){ const dm=new T.Object3D(); V3.crowdBase.forEach((p,i)=>{ dm.position.set(p[0],p[1]+(jump?Math.abs(Math.sin(now/120+i))*0.35:0),p[2]); dm.updateMatrix(); V3.crowd.setMatrixAt(i,dm.matrix); }); V3.crowd.instanceMatrix.needsUpdate=true; V3.jumping=jump; } }
  let pos, look; const star=starK>=0?V3.men.get(starK):null;
  if(V3.mic) V3.mic.visible=!!star;
  if(star){ const k=star.userData.s/1.3, d=(W<600?2.5:3.0)*k, off=(W<600?0.8:0.85)*k;
    pos=new T.Vector3(star.position.x+off,2.12*k,star.position.z+d); look=new T.Vector3(star.position.x+off,1.98*k,star.position.z);
    V3.mic.position.set(star.position.x+0.2*k,2.2*k,star.position.z+0.42*k); V3.mic.scale.setScalar(k); V3.mic.rotation.set(-0.5,0,0.6);
    V3.cp.lerp(pos,Math.min(1,dt*3.5)); V3.cl.lerp(look,Math.min(1,dt*4)); }
  else if(inScene){
    const sc=v.scene, ts=sc.t;
    if(sc.kind==='start'){ if(ts<6.5){ pos=new T.Vector3(7,5,-14); look=new T.Vector3(0,1.4,-36); } else if(ts<13.5){ pos=new T.Vector3(0,2.6,15); look=new T.Vector3(0,1.5,2); } else { pos=new T.Vector3(0,22,44); look=new T.Vector3(0,0,0); } }
    else if(sc.kind==='ht' && ts>sc.T1+4){ pos=ts<sc.T1+8?new T.Vector3(7,5,-14):new T.Vector3(0,22,44); look=ts<sc.T1+8?new T.Vector3(0,1.4,-36):new T.Vector3(0,0,0); }
    else { pos=new T.Vector3(0,14,-2); look=new T.Vector3(0,1,-36); }
    if(sc.fresh){ V3.cp.copy(pos); V3.cl.copy(look); sc.fresh=false; }
    V3.cp.lerp(pos,Math.min(1,dt*1.6)); V3.cl.lerp(look,Math.min(1,dt*2));
  }
  else if(sp && sp.kind!=='sp'){
    let mx, mz, px, pz, h=4.2;
    if(sp.kind==='card' && f.RF){ const R0=f.RF[0], k=v.sim.cols.indexOf(sp.e.p[0]), P0=k>=0&&f.P[k]?f.P[k]:R0; mx=(R0.x+P0.x)/2-52.5; mz=(R0.y+P0.y)/2-34; let dx=P0.x-R0.x, dz=P0.y-R0.y, L=Math.hypot(dx,dz); if(L<0.3){ dx=1; dz=0; L=1; } let nx=-dz/L, nz=dx/L; if(nz*mz>0){ nx=-nx; nz=-nz; } px=mx+nx*8; pz=mz+nz*8; h=3.6; }
    else if(sp.kind==='coach'){ const bxx=sp.e.side===0?-9:9; mx=bxx; mz=-34; px=bxx+(sp.e.side===0?5:-5); pz=-22; h=6.5; }
    else { mx=-1; mz=-29; px=10; pz=-10; h=11; }
    pos=new T.Vector3(px,h,pz); look=new T.Vector3(mx,1.2,mz);
    if(sp.fresh){ V3.cp.copy(pos); V3.cl.copy(look); sp.fresh=false; }
    V3.cp.lerp(pos,Math.min(1,dt*2)); V3.cl.lerp(look,Math.min(1,dt*2.5));
  }
  else if(sp){
    /* inquadratura dei calci piazzati */
    const go=sp.go, d=go.d||1, gxw=d>0?52.5:-52.5, Sx=go.x-52.5, Sz=go.y-34;
    if(go.kind==='pen'||go.kind==='fk'){ const vx=Sx-gxw, vz=Sz, L=Math.hypot(vx,vz)||1; pos=new T.Vector3(Sx+vx/L*12, 5, Sz+vz/L*12+(go.kind==='fk'?(Sz>0?-2:2):0)); look=new T.Vector3(gxw*0.8+Sx*0.2, 0.6, Sz*0.25); }
    else { const side=Sz>0?1:-1, far=go.kind==='cor'; pos=new T.Vector3(gxw+d*(far?12:9), far?19:16, -side*(far?24:18)); look=new T.Vector3(gxw-d*(far?10:14), 0, side*(far?9:5)); }
    if(sp.fresh){ V3.cp.copy(pos); V3.cl.copy(look); sp.fresh=false; }
    V3.cp.lerp(pos,Math.min(1,dt*2)); V3.cl.lerp(look,Math.min(1,dt*2.5));
  }
  else {
    if(V3.camMode==='porta' && e){ const d=e.d||(e.side===0?1:-1); pos=new T.Vector3(d*62,8,bz*0.25); look=new T.Vector3(bx-d*6,1,bz*0.8); }
    else { const close=e&&e.type==='goal'&&t>=e.t; pos=new T.Vector3(bx*0.82, close?8.5:13, bz*0.3+(close?18:27)); look=new T.Vector3(bx*0.92,0,bz*0.55); }
    V3.cp.lerp(pos,Math.min(1,dt*2.4)); V3.cl.lerp(look,Math.min(1,dt*3.2));
  }
  V3.cam.position.copy(V3.cp); V3.cam.lookAt(V3.cl);
  V3.r.render(V3.sc,V3.cam);
  const lab=$('#v-labels'); if(lab){
    const ids=ivOn?[]:[...new Set([...(e&&e.p?e.p:[]), ...(f.own>=0?[v.sim.cols[f.own]]:[])])];
    while(lab.children.length<ids.length) lab.appendChild(document.createElement('span'));
    [...lab.children].forEach((el,i)=>{ const id=ids[i]; const g=id!=null?V3.men.get(v.sim.cols.indexOf(id)):null; if(!g||!g.visible){ el.hidden=true; return; }
      const pv=new T.Vector3(g.position.x,3.0,g.position.z).project(V3.cam); el.hidden=pv.z>1;
      el.textContent=v.info[id].ln; el.className='lbl'+(fl.includes(id)?' fl':'');
      el.style.transform=`translate(${((pv.x+1)/2*W).toFixed(1)}px,${((1-pv.y)/2*H).toFixed(1)}px) translate(-50%,-100%)`; });
  }
}

/* ================= INTERVISTA AL MIGLIORE IN CAMPO ================= */
function interview(m){
  const all=[...m.played[0].map(id=>[id,0]),...m.played[1].map(id=>[id,1])];
  const resOf=ti=>Math.sign(ti===0?m.gh-m.ga:m.ga-m.gh);
  all.sort((a,b)=>(m.rt[b[0]]-m.rt[a[0]])||(resOf(b[1])-resOf(a[1])));
  const [best,ti]=all[0]; const inP=m.inp.t[ti].players.find(p=>p.id===best)||{}; const gp=G.P[best]||{};
  const p={id:best, fn:gp.fn||'', ln:inP.ln||gp.ln, r:inP.r||gp.r||'C', age:inP.age||gp.age||25, amb:gp.amb??10, prof:gp.prof??12, tem:inP.tem??10, mor:gp.mor??12};
  const team=G.T[ti===0?m.h:m.a], res=resOf(ti);
  const goals=m.scorers.filter(s=>s.pid===best).length, flashes=m.ev.filter(e=>e.type==='flash'&&e.flash&&e.flash.includes(best)).length;
  const R=makeRng((m.seed^Math.imul(best,2654435761))|0), P=a=>a[Math.floor(R()*a.length)];
  const coach=m.inp.t[ti].coach.n.split(' ').slice(-1)[0];
  const plan=m.plans?m.plans[ti]:null; const qa=[];
  const word=goals===2?'Due gol':goals===3?'Tre gol':'';
  let a1;
  if(res>0){
    if(goals>=2) a1=P([`Una serata da ricordare. ${word} non capitano tutte le settimane: li dedico alla mia famiglia, che era in tribuna.`,`Quando la palla gira così ti arriva sempre nel posto giusto. ${word}, ma il merito è anche di chi mi ha servito.`]);
    else if(goals===1) a1=P([`Il gol è la ciliegina. La cosa più bella è come abbiamo sofferto tutti insieme.`,`Ho visto lo spazio e ho calciato senza pensarci troppo. Sono contento per la squadra.`]);
    else if(p.r==='P') a1=P([`Il mio lavoro è farmi trovare pronto quando serve. Stasera è servito più del solito.`,`Un portiere vive per serate così. Ma senza la difesa davanti non vai da nessuna parte.`]);
    else if(p.r==='D') a1=P([`Per un difensore non c'è soddisfazione più grande che non far respirare gli attaccanti.`,`Abbiamo chiuso ogni spazio. Quando la difesa regge, davanti prima o poi segni.`]);
    else a1=P([`Non ho segnato, ma ho cercato di dare ordine e accendere il gioco. Oggi è andata bene.`,`Ho corso tanto e toccato tanti palloni. Vincere così, da squadra, è la cosa che preferisco.`]);
  } else if(res===0){
    a1 = goals? P([`Il gol fa piacere, ma io volevo i tre punti. Ce li siamo lasciati scappare.`,`Segnare è sempre bello, però un pareggio ci sta stretto.`])
              : P([`Un punto che muove la classifica. Potevamo fare di più, ma su questo campo non è facile.`,`Partita equilibrata. Ci prendiamo il punto e pensiamo alla prossima.`]);
  } else {
    a1 = p.tem>=13 ? P([`Qualche decisione dell'arbitro mi ha lasciato perplesso, ma non voglio cercare alibi. Abbiamo perso e basta.`,`Sono arrabbiato. Il premio personale non me lo godo, non dopo una sconfitta così.`])
                  : P([`Il premio personale vale poco quando si perde. Da domani torniamo a lavorare.`,`Abbiamo sbagliato troppo davanti. Io ci ho provato, ma da soli non si vince.`]);
  }
  qa.push([`${p.fn||p.ln}, voto ${String(m.rt[best]).replace('.',',')} e migliore in campo. ${res>0?'Che vittoria è stata?':res<0?'Peccato per il risultato: cosa è mancato?':'Un pareggio: sei soddisfatto?'}`, a1]);
  if(p.age<=20){
    qa.push([`Hai solo ${p.age} anni${flashes?' e stasera si sono viste giocate di gran classe':''}. Senti la pressione?`,
      p.amb>=14? `La pressione mi piace. Voglio arrivare in Lega Prima, e non ci voglio mettere troppo.` : p.prof>=14? `No, mi alleno per questo. Ascolto il mister ${coach} e cerco di migliorare ogni giorno.` : `Un po' sì, è normale. Ma in campo mi diverto e il resto passa.`]);
  } else if(p.age>=31){
    qa.push([`A ${p.age} anni sei ancora decisivo. Qual è il segreto?`, p.prof>=13? `Mi curo, dormo, mangio bene. A questa età non si improvvisa niente.` : `L'esperienza. So dove va il pallone un attimo prima degli altri.`]);
  } else if(plan && plan.form){
    qa.push([`Il mister ${coach} ha scelto il ${plan.form}. Come ti sei trovato?`, plan.ment>0? `Bene: volevamo fare la partita e abbiamo spinto dal primo minuto. In quel sistema ho tanto spazio.` : plan.ment<0? `Sapevamo di dover soffrire. Squadra corta e ripartenze: il mister l'aveva preparata così.` : `È un sistema che conosciamo. Quando ognuno sa cosa fare, le cose vengono da sole.`]);
  } else {
    qa.push([`Cosa ti chiede il mister ${coach}?`, `Di stare corti e di non mollare mai. Oggi credo di aver fatto quello che voleva.`]);
  }
  if(team.id===0){
    qa.push([`Il presidente era in tribuna. Un messaggio per lui?`, p.mor>=13? `Lo ringrazio per la fiducia. Qui si lavora bene e si vede in campo.` : p.mor<=7? `Gli dico che voglio giocare di più. Stasera credo di aver dimostrato di meritarlo.` : `Che può stare tranquillo: questo gruppo ha fame.`]);
  } else {
    const fx=G.sched[G.md]; const nx=fx && fx.find(f=>f.includes(team.id)); const no=nx? G.T[nx[0]===team.id?nx[1]:nx[0]] : null;
    if(no) qa.push([`Prossima sfida contro ${no.n}.`, res>0? `Adesso serve continuità. Sarà dura, ma ce la giochiamo con tutti.` : `Dobbiamo reagire subito. È la partita giusta per rimetterci in carreggiata.`]);
    else qa.push([`Si chiude la stagione. Un bilancio?`, res>=0? `Positivo. Siamo cresciuti tanto e l'anno prossimo vogliamo di più.` : `Ci sono cose da migliorare. Ne parleremo con calma, adesso un po' di riposo.`]);
  }
  return {id:best, fn:p.fn, ln:p.ln, r:p.r, age:p.age, team, rt:m.rt[best], goals, qa};
}
function interviewHTML(x){
  return `<p class="eyebrow">Intervista · migliore in campo</p>
   <div class="iv-head"><span class="badge" style="--c:${x.team.c}">${esc((x.fn[0]||'')+(x.ln[0]||''))}</span><div><p class="iv-name">${esc(x.fn)} ${esc(x.ln)}</p><p class="muted">${ROLE_NAME[x.r]} · ${x.age} anni · ${esc(x.team.n)} · voto ${String(x.rt).replace('.',',')}${x.goals?' · '+x.goals+' gol':''}</p></div>${G.P[x.id]?`<button class="btn ghost small" data-act="sheet" data-pid="${x.id}">Apri la scheda</button>`:''}</div>
   <dl class="iv-qa">${x.qa.map(([q,a])=>`<dt>${esc(q)}</dt><dd>«${esc(a)}»</dd>`).join('')}</dl>`;
}
function pagelleHTML(){
  const v=viewer, m=v.m, sim=v.sim, ev=sim.ev, fv=x=>String(x).replace('.',',');
  const cls=x=>x>=7?'hi':x<=5.5?'lo':'';
  const col=side=>{ const ids=Object.keys(sim.rt).filter(id=>v.info[id]&&v.info[id].t===side);
    const inMin={}, outMin={}; ev.filter(e=>e.type==='sub'&&e.side===side).forEach(e=>{ inMin[e.p[0]]=e.min; if(e.p[1]!=null) outMin[e.p[1]]=e.min; });
    const goals={}, yc={}, rc={}; ev.forEach(e=>{ if(e.type==='goal') goals[e.p[0]]=(goals[e.p[0]]||0)+1; if(e.type==='yc') yc[e.p[0]]=1; if(e.type==='rc') rc[e.p[0]]=1; });
    const capId=(m.inp.t[side].capOrder||[])[0];
    ids.sort((a,b)=>(inMin[a]?1:0)-(inMin[b]?1:0) || v.info[a].num-v.info[b].num);
    const rows=ids.map(id=>{ const i=v.info[id], r=sim.rt[id];
      return `<li class="${inMin[id]?'sub':''}"><span class="pn">${i.num}</span><span class="pnm">${esc(i.ln)}${id==capId?' <b class="capm">C</b>':''}${goals[id]?' '+'⚽'.repeat(goals[id]):''}${rc[id]?' 🟥':yc[id]?' 🟨':''}${inMin[id]?` <small class="in">↑ ${inMin[id]}</small>`:''}${outMin[id]?` <small class="out">↓ ${outMin[id]}</small>`:''}</span><b class="pv ${cls(r)}">${fv(r)}</b></li>`; }).join('');
    const c=m.inp.t[side].coach, cr=sim.coachRt&&sim.coachRt[side];
    const crow=`<li class="coachr"><span class="pn">All.</span><span class="pnm">${esc(c.n)}${cr&&cr.why.length?`<small>${esc(cr.why.slice(0,2).join(', '))}</small>`:''}</span><b class="pv ${cr&&cr.v!=null?cls(cr.v):''}">${cr&&cr.v!=null?fv(cr.v):'–'}</b></li>`;
    return `<div class="pcol"><p class="ph"><i style="background:${teamColor(v,side)}"></i>${esc(vTeamName(v,side))} <b>${side?m.ga:m.gh}</b></p><ul>${rows}${crow}</ul></div>`; };
  const rf=sim.ref||{}, RT=G.refs&&G.refs[m.refId], ri=m.inp.ref;
  const terna=ri?`<div class="pref"><span>Terna: <b>${esc(ri.full||ri.n)}</b>${RT?` · assistenti ${esc(RT.a1)} e ${esc(RT.a2)}`:''}${rf.errs&&rf.errs.length?` · <span class="lo">${rf.errs.length===1?'1 errore':'2 errori'} alla moviola</span>`:''}</span><b class="pv ${cls(rf.voto)}">${fv(rf.voto)}</b></div>`:'';
  return `<div class="pag-in"><div class="pag-h"><p class="eyebrow">Pagelle</p></div><div class="pcols">${col(0)}${col(1)}</div>${terna}</div>`;
}
function renderIV(){
  const v=viewer, host=$('#stage'); if(!host||!v||!v.iv) return;
  { let pg=$('#v-pag'); const on=v.post==='pag'; const vw=$('.viewer'); if(vw) vw.classList.toggle('pagon',on);
    if(on && !pg){ pg=document.createElement('div'); pg.id='v-pag'; pg.className='pag'; pg.innerHTML=pagelleHTML(); host.appendChild(pg); }
    if(!on && pg) pg.remove(); }
  let o=$('#v-ivo'); const cap=$('#v-cap');
  const card=$('#v-int'); if(card) card.hidden=!(v.post==='iv' && (v.iv.closed||v.iv.phase==='done'));
  if(v.post!=='iv' || v.iv.closed){ if(o) o.remove(); if(cap) cap.hidden=false; return; }
  if(cap) cap.hidden=true;
  if(!o){ o=document.createElement('div'); o.id='v-ivo'; o.className='ivo'; host.appendChild(o); }
  const x=v.iv.x, [q]=x.qa[v.iv.k], last=v.iv.k>=x.qa.length-1;
  o.innerHTML=`<div class="bub a" id="iv-a" ${v.iv.phase==='q'?'hidden':''}><span class="who">${esc(x.fn)} ${esc(x.ln)} · voto ${String(x.rt).replace('.',',')}</span><p id="iv-at"></p></div>
   <div class="ivq"><div class="ivq-txt"><span class="tag">Giornalista</span><p>${esc(q)}</p></div>
    <div class="ivo-ctrl"><span class="dots" aria-label="Domanda ${v.iv.k+1} di ${x.qa.length}">${x.qa.map((_,i)=>`<i class="${i===v.iv.k?'on':''}"></i>`).join('')}</span>
    ${last&&v.iv.phase==='done'?`<button class="btn ghost small" data-act="ivagain">Rivedi l'intervista</button>`:`<button class="btn ghost small" data-act="ivnext">${v.iv.phase==='q'?'Risposta':last?'Fine':'Domanda dopo'} ›</button>`}</div></div>`;
  updIV();
}
function updIV(){ const v=viewer, el=$('#iv-at'); if(!el||!v.iv) return; const a=v.iv.x.qa[v.iv.k][1]; const n=(v.iv.phase==='a'&&!reduced())?Math.min(a.length,Math.floor(v.iv.t/32)):a.length; el.textContent='«'+a.slice(0,n)+(n<a.length?'':'»'); }
function tickIV(dt){ const iv=viewer.iv; iv.t+=dt; const a=iv.x.qa[iv.k][1]; if(iv.phase==='q'&&iv.t>2200){ iv.phase='a'; iv.t=0; renderIV(); return; } if(iv.phase==='a'){ updIV(); if(iv.t>a.length*32+3800) nextIV(); } }
function nextIV(){ const iv=viewer.iv; if(iv.phase==='q'){ iv.phase='a'; iv.t=0; } else if(iv.phase==='a'&&iv.t<iv.x.qa[iv.k][1].length*32){ iv.t=1e6; updIV(); return; } else if(iv.k<iv.x.qa.length-1){ iv.k++; iv.phase='q'; iv.t=0; } else { iv.phase='done'; iv.t=0; } renderIV(); }
function againIV(){ Object.assign(viewer.iv,{k:0,phase:'q',t:0,closed:false}); renderIV(); }
