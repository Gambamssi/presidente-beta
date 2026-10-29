/* ================= VISORE PARTITA: 2D continuo, replay 3D, intervista ================= */
const mkey = m=>G.season+'-'+G.md+'-'+m.h;
const REPLAY_RATE=1.4;   // il replay va al rallentatore
// x1 = tempo reale (90' in 90'), x2 = la partita dura 15', x4 = la partita dura 5'
const SPEED_TXT={1:'Velocità normale',2:'Partita in 15 minuti',4:'Partita in 5 minuti'};
function tickRate(v){ return v.speed===1 ? 1/DT : v.speed===2 ? v.nT/900 : v.nT/300; }
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
  requestAnimationFrame(()=>{ const c=$('.viewer'); if(c) c.scrollIntoView({behavior:reduced()?'auto':'smooth', block:'start'}); });
}
function stopViewer(){ if(viewer) cancelAnimationFrame(viewer.raf); }
function vTeamName(v,ti){ return G.T[ti===0?v.m.h:v.m.a].n; }
function teamColor(v,ti){ return G.T[ti===0?v.m.h:v.m.a].c; }

function vViewerHTML(){
  const v=viewer, m=v.m, sim=v.sim;
  const planCol=ti=>{ const p=sim.plans[ti], c=m.inp.t[ti].coach;
    return `<div class="pl"><p class="pl-team"><span class="chip" style="--c:${teamColor(v,ti)}"></span>${esc(vTeamName(v,ti))}</p><p class="pl-coach">${c.absent?`All. ${esc(c.n)} è squalificato: in panchina va il vice`:`All. ${esc(c.n)} · tattica ${c.tat}`}</p>
      <p class="pl-form">${p.form}</p><p class="pl-meta">Mentalità ${MENT[p.ment+1]} · ${p.press===2?'pressing alto':'pressing basso'}</p><ul>${p.reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></div>`; };
  return `<section class="card viewer"><div class="sb"><span class="tm"><span class="chip" style="--c:${teamColor(v,0)}"></span>${esc(vTeamName(v,0))}</span><span class="sc" id="v-score">${v.sc[0]} – ${v.sc[1]}</span><span class="tm r">${esc(vTeamName(v,1))}<span class="chip" style="--c:${teamColor(v,1)}"></span></span></div>
   <div class="pitchwrap" id="stage"><canvas id="pitch" aria-label="Campo di gioco: la partita simulata in tempo reale"></canvas><div class="labels" id="v-labels" aria-hidden="true"></div>
    <div class="goalfx" id="v-goal" hidden>Gol</div><div class="rpl" id="v-rpl" hidden><span class="rpl-tag">Replay</span></div>
    <span class="clock" id="v-clock">0'</span><span class="ff" id="v-ff">${SPEED_TXT[v.speed]}</span>
    <div class="forms" id="v-forms"></div>
    <div class="cap" id="v-cap"></div><div class="board" id="v-board" hidden></div>
    ${v.phase==='pre'?`<div class="pre" id="v-pre"><p class="eyebrow">Le scelte degli allenatori</p>${m.inp.ref?`<p class="pl-ref">Arbitro ${esc(m.inp.ref.full||m.inp.ref.n)}${G.refs&&G.refs[m.inp.ref.id]?` · assistenti ${esc(G.refs[m.inp.ref.id].a1)} e ${esc(G.refs[m.inp.ref.id].a2)}`:''}</p>`:''}<div class="pre-cols">${planCol(0)}${planCol(1)}</div><button class="btn go" data-act="vkick">Calcio d'inizio</button></div>`:''}
   </div>
   <div class="cmdbar"><button class="btn vnext" data-act="vnext" id="v-next" data-lbl="">Avanti <span aria-hidden="true">⏭</span></button><div class="ctrl"><button class="btn small" data-act="vplay" id="v-play">${v.phase==='pre'?'Inizia':v.phase==='done'?'Rivedi':v.playing?'Pausa':'Riprendi'}</button>${[1,2,4].map(s=>`<button class="btn ghost small spd${v.speed===s?' on':''}" data-act="vspd" data-s="${s}" title="${SPEED_TXT[s]}" aria-pressed="${v.speed===s}">${s}x</button>`).join('')}${(V3.ok!==false&&window.THREE)?`<button class="btn ghost small" data-act="v3d">Replay 3D: ${V3.pref?'sì':'no'}</button>`:''}${use3D()?`<button class="btn ghost small" data-act="vcam">Telecamera replay: ${V3.camMode==='tv'?'TV':'dietro la porta'}</button>`:''}<button class="btn ghost small" data-act="vclose" id="v-close">Chiudi</button></div></div>
   <div class="vstats" id="v-stats"></div>
   <div class="intv" id="v-int" hidden></div>
   <ol class="log" id="v-log"></ol></section>`;
}
function attachViewer(){
  const v=viewer; const log=$('#v-log'); if(log) log.innerHTML=v.log.join('');
  updHud(); if(v.cap) showCap(v.cap);
  if(v.phase==='done') finishViewer(true);
  if(v.phase==='replay'){ const rb=$('#v-rpl'); if(rb) rb.hidden=false; }
  cancelAnimationFrame(v.raf); v.last=performance.now(); v.raf=requestAnimationFrame(loop);
}
function kickoff(){ const v=viewer; if(v.phase!=='pre') return; v.phase='live'; v.playing=true; if(use3D()){ v.playing=false; startScene('start'); } const p=$('#v-pre'); if(p) p.remove(); const b=$('#v-play'); if(b) b.textContent='Pausa'; }

function loop(now){
  const v=viewer; if(!v || !onMatchPage()) return;
  const dt=Math.max(0,Math.min(100,now-v.last))/1000; v.last=now;   /* il tempo del fotogramma può precedere v.last: mai passi indietro */
  if(v.phase==='pre'){ v.preT+=dt; if(v.preT>14) kickoff(); }
  else if(v.phase==='live' && v.playing){
    const sp1 = use3D() && !!activeWin(v);
    v.t=Math.min(v.nT-1, v.t+(sp1?1/DT:tickRate(v))*dt);
    processEvents(true);
    if(v.pq.length && v.t>=v.pq[0].at){ const p=v.pq.shift(); if(use3D() && v.t<p.t1+40) startReplay(p); }
    if(v.phase==='live' && !v.htDone && v.t>=v.sim.htTick && v.t<v.sim.htTick+6){ v.htDone=true; if(use3D()){ v.t=v.sim.htTick; startScene('ht'); } }
    if(v.t>=v.nT-1 && v.phase==='live'){ if(use3D() && !v.endDone){ v.endDone=true; vFlush(); startScene('end'); } else finishViewer(); }
  } else if(v.phase==='replay'){ const r=v.rep; r.t+=REPLAY_RATE*dt; if(r.t>=r.t1) endReplay(); }
  else if(v.phase==='scene'){ v.scene.t+=dt; if(v.scene.t>=v.scene.dur) endScene(); }
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
function vSpeed(s,el){ viewer.speed=s; vSavePrefSpeed(s); document.querySelectorAll('.spd').forEach(b=>{ const on=+b.dataset.s===s; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); }); const ff=$('#v-ff'); if(ff) ff.textContent=SPEED_TXT[s]; }
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
  const bx=k=>fr[k][nb], by=k=>fr[k][nb+1];
  const out=k=>bx(k)<0||bx(k)>105||by(k)<0||by(k)>68;
  const S=new Set([0, sim.htTick]);
  sim.ev.forEach(e=>{ if(STOP_EV.has(e.type)) S.add(Math.max(0,Math.min(nT-1,e.t))); });
  for(let k=1;k<nT;k++) if(out(k) && !out(k-1)) S.add(k);
  v.stops=[...S].filter(k=>k>=0&&k<nT).sort((a,b)=>a-b);
  v.rest=v.stops.map(s=>{ let still=-1; const lim=Math.min(nT-1,s+140);
    for(let k=s+1;k<=lim;k++){ const d=Math.hypot(bx(k)-bx(k-1),by(k)-by(k-1));
      if(still<0){ if(d<0.02) still=k; } else if(d>0.05 && d<3) return k-1; }
    return still<0 ? s+1 : lim; });
  /* rigori: la simulazione decide dove va la palla, non il lato del portiere. Il visore lo ricava dal tiro:
     parata → si tuffa verso la palla; gol → lato sbagliato; fuori o palo → lato della palla */
  v.dives=[];
  sim.ev.forEach(e=>{ if(e.type!=='spgo' || e.kind!=='pen') return; const t0=e.t, def=1-e.side; if(!fr[t0]) return;
    const k=sim.cols.findIndex((id,i)=>v.info[id] && v.info[id].gk && v.team[i]===def && !isNaN(fr[t0][i*2])); if(k<0) return;
    const end=sim.ev.find(x=>x.t>=t0 && x.t<=t0+20 && (x.type==='goal'||x.type==='miss'));
    const ta=Math.min(nT-1, end?end.t:t0+1), gy=fr[t0][k*2+1], ballY=by(ta);
    const side=(ballY-gy)>0.3?1:(ballY-gy)<-0.3?-1:(hashU(String(v.key),t0)<0.5?1:-1);
    let ty;
    if(end && end.type==='goal') ty=gy-side*1.9;
    else if(Math.abs(ballY-gy)<2.2) ty=gy+side*Math.max(1.0,Math.abs(ballY-gy));
    else ty=gy+side*1.9;
    v.dives.push({k, t0, ta, ty, gy, s:Math.sign(ty-gy)||1, sx:e.x, sy:e.y}); });
  /* cartellini: tick in cui l'arbitro mostra il cartellino e destinatario */
  const nc=nb+18; v.cards=[];
  sim.ev.forEach(e=>{ if(e.type!=='yc'&&e.type!=='rc'&&e.type!=='coachoff') return; const coach=e.type==='coachoff';
    let tc=null; for(let k=e.t;k<Math.min(nT,e.t+80);k++){ const c=fr[k][nc]; if(coach? c===4 : (c>0&&c!==4)){ tc=k; break; } }
    if(tc==null) return; let t1=tc; while(t1+1<nT && fr[t1+1][nc]>0) t1++;
    v.cards.push({t0:e.t, tc, t1, coach:coach?e.side:null, k:coach?-1:sim.cols.indexOf(e.p&&e.p[0])}); });
}
function stopIdx(v,t){ let lo=0, hi=v.stops.length-1, r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(v.stops[m]<=t){ r=m; lo=m+1; } else hi=m-1; } return r; }
function ballDead(v,t){ const i=stopIdx(v,t); return i>=0 && t<=v.rest[i]+0.999; }
function nextStop(v,t,lim){ const i=stopIdx(v,t+0.5)+1; const s=v.stops[i]; return s!=null && s<lim ? s : null; }
function diveAt(t){ const v=viewer; if(!v||!v.dives) return null;
  for(const d of v.dives){ const a=t-d.t0; if(a<0||a>9) continue; const ez=x=>x<0.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
    const u = a<1.1 ? ez(a/1.1) : a<5 ? 1 : a<8 ? 1-ez((a-5)/3) : 0; if(u<=0) continue; return {d, u, a}; }
  return null; }
function cardTarget(f,t){ const c=cardAt(t); if(!c) return null; if(c.coach!=null) return {x:52.5+(c.coach===0?-9:9), y:-2.4};
  let p=c.k>=0?f.P[c.k]:null; if(!p && c.k>=0){ const fr=viewer.sim.frames[Math.max(0,Math.min(viewer.nT-1,c.tc))]; if(fr && !isNaN(fr[c.k*2])) p={x:fr[c.k*2], y:fr[c.k*2+1]}; } return p&&!p.hidden?{x:p.x,y:p.y}:null; }
function cardAt(t){ const v=viewer; if(!v||!v.cards) return null; let c=null; for(const x of v.cards) if(t>=x.t0-1 && t<=x.t1+1) c=x; return c; }

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
    else if(l==='Avanti: fine primo tempo'){ vJump(v.sim.htTick); v.htDone=true; if(use3D()){ v.t=v.sim.htTick; startScene('ht'); } }
    else { vJump(v.nT-1); if(use3D() && !v.endDone){ v.endDone=true; vFlush(); startScene('end'); } else finishViewer(false,'whistle'); }
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
  const v=viewer; if(!use3D()) return false;
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
  return true;
}
function endScene(){
  const v=viewer; if(!v||v.phase!=='scene') return; const k=v.scene.kind; v.scene=null; v.phase='live';
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
  const v=viewer, fr=v.sim.frames, n=v.sim.cols.length; t=Math.max(0,t||0); const i=Math.max(0,Math.min(fr.length-1,Math.floor(t))), j=Math.min(fr.length-1,i+1), f=t-i, A=fr[i], B=fr[j];
  const P=new Array(n); for(let k=0;k<n;k++){ const ax=A[k*2]; if(isNaN(ax)){ P[k]=null; continue; } const bx=isNaN(B[k*2])?ax:B[k*2], by=isNaN(B[k*2+1])?A[k*2+1]:B[k*2+1]; P[k]={x:ax+(bx-ax)*f, y:A[k*2+1]+(by-A[k*2+1])*f}; }
  let bx,by,bz; const nb=n*2;
  if(B.length>=nb+12 && j>i){ const pts=[[A[nb],A[nb+1],A[nb+2]],[B[nb+3],B[nb+4],B[nb+5]],[B[nb+6],B[nb+7],B[nb+8]],[B[nb+9],B[nb+10],B[nb+11]],[B[nb],B[nb+1],B[nb+2]]];
    const s=f*4, k=Math.min(3,Math.floor(s)), w=s-k, a=pts[k], b=pts[k+1]; bx=a[0]+(b[0]-a[0])*w; by=a[1]+(b[1]-a[1])*w; bz=a[2]+(b[2]-a[2])*w; }
  else { bx=A[nb]+(B[nb]-A[nb])*f; by=A[nb+1]+(B[nb+1]-A[nb+1])*f; bz=A[nb+2]+(B[nb+2]-A[nb+2])*f; }
  let RF=null, card=0, flag=0; if(A.length>=nb+20){ const g=(k)=>{ const ax=A[nb+12+k*2], ay=A[nb+13+k*2], bx_=B[nb+12+k*2], by_=B[nb+13+k*2]; return {x:ax+(bx_-ax)*f, y:ay+(by_-ay)*f}; }; RF=[g(0),g(1),g(2)]; card=A[nb+18]; flag=A[nb+19]; }
  const cap = A.length>=nb+22 ? [A[nb+20],A[nb+21]] : [-1,-1];
  const dv=diveAt(t); if(dv && P[dv.d.k]){ const p=P[dv.d.k]; P[dv.d.k]={x:p.x, y:p.y+(dv.d.ty-p.y)*dv.u}; }
  return {P, bx, by, bz, own:v.sim.owners[i], RF, card, flag, cap, dive:dv};
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
  if(show3) draw3D(T, ivOn, spOn?v.sp3d:null); else draw2D(T, ivOn);
  updHud();
}

/* ---------- 2D ---------- */
function draw2D(t, ivOn){
  const v=viewer, cv=$('#pitch'); if(!cv) return;
  const W=cv.clientWidth, H=Math.round(W*0.66), dpr=window.devicePixelRatio||1; if(W<60) return;   /* campo nascosto (pagelle sul telefono) */
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.height=H+'px'; }
  const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
  const M=Math.max(10,W*0.03), X=x=>M+x/105*(W-2*M), Y=y=>M+y/68*(H-2*M), S=(W-2*M)/105;
  c.fillStyle=css('--pitch'); c.fillRect(0,0,W,H);
  for(let i=0;i<14;i++) if(i%2){ c.fillStyle=css('--pitch2'); c.fillRect(X(i*7.5),M,7.5*S,H-2*M); }
  c.strokeStyle=css('--chalk'); c.globalAlpha=0.8; c.lineWidth=Math.max(1,W/600);
  c.strokeRect(X(0),Y(0),105*S,68*S); c.beginPath(); c.moveTo(X(52.5),Y(0)); c.lineTo(X(52.5),Y(68)); c.stroke();
  c.beginPath(); c.arc(X(52.5),Y(34),9.15*S,0,Math.PI*2); c.stroke();
  for(const s of [0,1]){ c.strokeRect(s?X(88.5):X(0),Y(13.84),16.5*S,40.32*S); c.strokeRect(s?X(99.5):X(0),Y(24.84),5.5*S,18.32*S);
    c.fillStyle=css('--chalk'); c.fillRect(s?X(105):X(0)-S*1.8,Y(30.34),S*1.8,7.32*S); }
  c.globalAlpha=1;
  const f=frameAt(t), r=Math.max(5,W/88), fs=Math.max(9,r*1.15);
  /* linea del fuorigioco della squadra che difende */
  if(!ivOn && f.own>=0){ const atk=v.team[f.own], def=1-atk, second=t>=v.sim.htTick, gx=((def===0)!==second)?0:105;
    if(Math.abs(f.bx-gx)<52.5){ const xs=[]; v.sim.cols.forEach((id,k)=>{ const p=f.P[k]; if(p && v.team[k]===def) xs.push(Math.abs(p.x-gx)); }); xs.sort((a,b)=>a-b);
      if(xs.length>1){ const lx=gx===0?xs[1]:105-xs[1]; c.save(); c.setLineDash([6,5]); c.strokeStyle=teamColor(v,def); c.globalAlpha=0.75; c.lineWidth=Math.max(1.5,W/500); c.beginPath(); c.moveTo(X(lx),Y(0)); c.lineTo(X(lx),Y(68)); c.stroke(); c.restore(); } } }
  const ev=ivOn?null:activeEvent(t), named=new Set(ev?ev.p:[]), flashed=new Set(ev&&ev.flash?ev.flash:[]);
  const ownId = f.own>=0 ? v.sim.cols[f.own] : null;
  c.textAlign='center'; c.textBaseline='middle';
  v.sim.cols.forEach((id,k)=>{ const p=f.P[k]; if(!p) return; const inf=v.info[id];
    const col = inf.gk ? (inf.t===0?'#f2c230':'#2b2b30') : teamColor(v,inf.t);
    if(flashed.has(id)){ c.beginPath(); c.arc(X(p.x),Y(p.y),r*2.2,0,Math.PI*2); c.fillStyle=css('--gold'); c.globalAlpha=0.35+0.2*Math.sin(performance.now()/160); c.fill(); c.globalAlpha=1; }
    c.beginPath(); c.arc(X(p.x),Y(p.y),r,0,Math.PI*2); c.fillStyle=col; c.fill();
    c.lineWidth=id===ownId?2.2:1; c.strokeStyle=id===ownId?'#fff':'rgba(0,0,0,.5)'; c.stroke();
    if(W>=420){ c.font=`700 ${Math.round(r*1.05)}px "IBM Plex Sans", system-ui, sans-serif`; c.fillStyle=lum(col)>0.55?'#14181a':'#ffffff'; c.fillText(inf.num, X(p.x), Y(p.y)+0.5); }
    if(f.cap && (k===f.cap[0]||k===f.cap[1])){ const cx=X(p.x)+r*0.78, cy=Y(p.y)-r*0.78, cr=Math.max(4,r*0.46); c.beginPath(); c.arc(cx,cy,cr,0,Math.PI*2); c.fillStyle='#f5d020'; c.fill(); c.lineWidth=1; c.strokeStyle='rgba(0,0,0,.6)'; c.stroke(); c.fillStyle='#111'; c.font=`800 ${Math.round(cr*1.4)}px "IBM Plex Sans", system-ui, sans-serif`; c.fillText('C',cx,cy+0.5); }
    if(id===ownId) named.add(id);
  });
  c.lineJoin='round'; c.font=`600 ${fs}px "IBM Plex Sans", system-ui, sans-serif`;
  named.forEach(id=>{ const k=v.sim.cols.indexOf(id), p=f.P[k]; if(!p) return; const tx=X(p.x), ty=Y(p.y)-r*2; c.lineWidth=3; c.strokeStyle='rgba(8,16,12,.85)'; c.strokeText(v.info[id].ln,tx,ty); c.fillStyle=flashed.has(id)?css('--gold-hi'):'#fff'; c.fillText(v.info[id].ln,tx,ty); });
  if(!ivOn && f.RF){ f.RF.forEach((q,k)=>{ const rr=r*(k?0.62:0.72); c.beginPath(); c.arc(X(q.x),Y(q.y),rr,0,Math.PI*2); c.fillStyle='#121212'; c.fill(); c.lineWidth=1.6; c.strokeStyle='#f0d64a'; c.stroke();
      if(k){ const up=f.flag===k; c.fillStyle=up?'#f0d64a':'#e4572e'; const fx=X(q.x)+rr*0.6, fy=Y(q.y)-(up?rr*2.4:rr*0.2); c.fillRect(fx,fy,rr*1.1,rr*0.8); c.fillStyle='#ddd'; c.fillRect(fx-1,fy,1.4,rr*(up?2.2:1.2)); } });
    if(f.card>0){ const q=f.RF[0]; c.fillStyle=f.card===1?'#f5d020':'#d8262c'; c.strokeStyle='#000'; c.lineWidth=1; const w=r*1.3, h=r*1.75;
      const tg=cardTarget(f,t), cx=(tg && tg.x<q.x) ? X(q.x)-r*0.4-w : X(q.x)+r*0.4; c.fillRect(cx,Y(q.y)-r*2.9,w,h); c.strokeRect(cx,Y(q.y)-r*2.9,w,h); } }
  if(!ivOn){ const bz=Math.max(0,f.bz); c.beginPath(); c.ellipse(X(f.bx)+bz*S*0.25,Y(f.by)+bz*S*0.15,r*0.55,r*0.4,0,0,Math.PI*2); c.fillStyle='rgba(0,0,0,.35)'; c.fill();
    c.beginPath(); c.arc(X(f.bx),Y(f.by)-bz*S*0.6,r*0.55*(1+bz*0.05),0,Math.PI*2); c.fillStyle='#fff'; c.fill(); c.lineWidth=1; c.strokeStyle='rgba(0,0,0,.4)'; c.stroke(); }
}

/* ---------- 3D ---------- */
const V3 = {pref:true, ok:null, r:null, sc:null, cam:null, ball:null, men:new Map(), rings:[], mats:{}, camMode:'tv', cp:null, cl:null, last:0, w:0, h:0};
try{ if(localStorage.getItem('presidente-vista')==='2d') V3.pref=false; }catch(e){}
function use3D(){ if(!V3.pref) return false; if(V3.ok===null) V3.ok=initThree(); return V3.ok; }
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
  v.sim.cols.forEach((id,k)=>{ const inf=v.info[id]; let kit=teamColor(v,inf.t); if(inf.gk) kit=inf.t===0?'#f2c230':'#2f2f33';
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
  const W=host.clientWidth, H=Math.round(W*(W<600?0.66:0.5625));
  if(V3.w!==W||V3.h!==H){ V3.r.setSize(W,H); V3.cam.aspect=W/H; V3.cam.fov=W<600?52:36; V3.cam.updateProjectionMatrix(); V3.w=W; V3.h=H; }
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
    if(ivOn && k===starK){ g.position.x+=(x-g.position.x)*Math.min(1,dt*3); g.position.z+=(z-g.position.z)*Math.min(1,dt*3); } else g.position.set(x,0,z);
    const face = k===starK ? Math.atan2(V3.cp.x-g.position.x, V3.cp.z-g.position.z) : sp>0.6 ? Math.atan2(vx,vz) : inScene ? 0 : Math.atan2(bx-x, bz-z);
    g.rotation.y += angDiff(face,g.rotation.y)*Math.min(1,dt*8);
    const u=g.userData; u.ph+=sp*dt*1.7*(ivOn?0:1); const amp=ivOn?0:Math.min(0.85,sp*0.09), s=Math.sin(u.ph)*amp;
    u.legs[0].rotation.x=s; u.legs[1].rotation.x=-s; u.arms[0].rotation.x=-s*0.8; u.arms[1].rotation.x=s*0.8; u.arms[0].rotation.z=0; u.arms[1].rotation.z=0;
    g.rotation.z=0;
    if(f.dive && k===f.dive.d.k && !ivOn){ const dv=f.dive, d=dv.d, fc=Math.atan2((d.sx-52.5)-x,(d.sy-34)-z);
      g.rotation.y=fc; const lean=dv.u*1.25, sf=Math.sin(fc)||1; g.rotation.z=d.s*Math.sign(sf)*lean; g.position.y=Math.sin(Math.min(1,dv.a/1.1)*Math.PI)*0.35*dv.u;
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
