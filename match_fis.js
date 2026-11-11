/* match_fis.js — v0.4.2.2 (T1): fisica: palla, corpi, movimenti, distanze, voli, gol e fuori geometrici.
   Funzioni spostate da simMatch (match.js) senza cambiarne il corpo: matchFis(M) è chiamata da simMatch all'inizio della partita
   e restituisce le funzioni, che restano chiusure come prima. M è il contesto condiviso: le variabili riassegnate durante la partita
   si leggono e scrivono come M.x (tick, half, regEnd, restart, ht2, errLeft, bsN); gli altri valori di simMatch e le funzioni degli altri moduli
   arrivano nelle variabili qui sotto con M.link (stessi oggetti, nessuna copia). Script classico: nessun import/export. */
function matchFis(M){
  let R, P, RA, RP, SO, SX, T, rx, tm, op, ball, ref, minNum, E, fill2, recSub, nearestOpp, handsOk, gkCatch, firstTime, aerial, shoot, gkDecide, doSave, shotEnd, gkOf, pause;
  M.link.push(()=>{ ({R, P, RA, RP, SO, SX, T, rx, tm, op, ball, ref, minNum, E, fill2, recSub}=M); ({nearestOpp, handsOk, gkCatch, firstTime, aerial, shoot, gkDecide, doSave, shotEnd}=M.mGio); ({gkOf}=M.mAll); ({pause}=M.mArb); });

  /* stanchezza: 0 se fresco (energia ≥ 80), 1 se sfinito (≤ 30) */
  const fatK=p=>clamp((80-p.st)/50,0,1);
  /* --- corpi (v0.4.2.0): velocità desiderata e sguardo decisi qui, la fisica in fisCorpo ---
     camminata e corsa leggera quando non c'è urgenza, scatto (fino a 8,5–9,7 m/s secondo la Velocità) quando c'è;
     i compagni troppo vicini si scansano (separazione morbida), tranne nei duelli per la palla */
  const JOG=2.8, SEP_R=1.7;   /* v0.4.2.7 (R2b): corsa leggera 3,0 → 2,8 m/s (10 km/h): velocità media dei giocatori 7,1 → 7,0 km/h */
  function duelPair(a,b){ if(a.t===b.t) return false; const bo=ball.owner; if(a===bo||b===bo) return true;
    return ball.z<2 && Math.abs(a.x-ball.x)<2.2 && Math.abs(b.x-ball.x)<2.2 && hyp(a.x-ball.x,a.y-ball.y)<2 && hyp(b.x-ball.x,b.y-ball.y)<2; }
  function move(p){
    const t=tm(p);
    /* tuffo del portiere: il movimento è deciso al momento del tiro (gkDecide), qui si esegue */
    if(p.dv){ const d=p.dv, now=(M.tick+1)*DT;
      if(now>=d.t0){ const u=clamp((now-d.t0)/d.dur,0,1), e=u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2, X=d.x0+(d.x1-d.x0)*e, Y=d.y0+(d.y1-d.y0)*e;
        p.vx=(X-p.x)/DT; p.vy=(Y-p.y)/DT; p.nx=X; p.ny=Y; p.tilt=d.s*d.tl*Math.min(1,u*1.4);
        if(now>=d.t0+d.dur+d.lie){ p.dv=null; p.stun=Math.max(p.stun,0.5); }
        energy(p, hyp(p.vx,p.vy)); timers(p); return; } }
    if(p.tilt){ p.tilt*=0.45; if(Math.abs(p.tilt)<0.02) p.tilt=0; }
    let vmax=p.vmax*(0.5+0.5*p.st/100);
    if(p.stun>0) vmax*=0.35;
    if(ball.owner===p){ vmax*=0.76; for(const q of op(p).on){ if(q.stun>0) continue; const ax=(q.x-p.x)*t.dir, ay=Math.abs(q.y-p.y); if(ax>0 && ax<2.6 && ay<1.6){ vmax*=p.drib>0?0.8:(ax<1.4?0.45:0.65); break; } } }
    const dx=p.tx-p.x, dy=p.ty-p.y, d=hyp(dx,dy);
    let s;
    /* camminata e corsa: fermo vicino al suo posto (zona morta 1,6 m), cammina fino a 5 m, corsa leggera oltre; scatto se urgente */
    if(d<0.3) s=0;
    else if(p.urg) s=Math.min(vmax*(p.ucap||1)*(0.25+0.75*Math.min(1,p.st/88)), Math.sqrt(2*5*(d-0.3))+0.4);   /* scatto; con la stanchezza si scatta meno */
    else if(d<(p.role==='GK'?0.3:2.6) && !p.fq) s=0;
    else s=Math.min(d<6?0.8+0.09*d : Math.min(JOG, 0.7+0.22*d), Math.sqrt(2*2.5*(d-0.3))+0.3);
    let Vx=d>0.01?dx/d*s:0, Vy=d>0.01?dy/d*s:0;
    /* chi segue un avversario (pressing, marcatura) ne anticipa il movimento */
    if(p.fq){ Vx+=p.fq.vx*0.85; Vy+=p.fq.vy*0.85; }
    /* separazione morbida: ci si allontana da chi è troppo vicino (non nei duelli per la palla) */
    if(p.k>=0){ const row=p.k*NMAX; for(let j=0;j<ON.length;j++){ const q=ON[j]; if(q===p) continue; const dd=DTB[row+j], sr=q.t===p.t?SEP_R:1.35; if(dd>=sr) continue; if(duelPair(p,q)) continue;
        const w=(sr-dd)/sr*2.2, n=Math.max(dd,0.05); Vx+=(p.x-q.x)/n*w; Vy+=(p.y-q.y)/n*w; } }
    const sDes=Math.min(vmax,hyp(Vx,Vy));
    /* sguardo: chi corre guarda dove va; chi cammina o aspetta guarda la palla; all'indietro solo per pochi metri */
    const bd=Math.atan2(ball.y-p.y,ball.x-p.x), md=Math.atan2(Vy,Vx);
    let face;
    if(ball.owner===p) face= sDes>0.6 ? md : (t.dir>0?0:Math.PI);
    else if(sDes>2.6) face= (p.role!=='GK' && Math.abs(fisAng(md-bd))>1.9 && d<7 && sDes<0.85*vmax) ? bd : md;
    else face=bd;
    fisCorpo(p, Vx, Vy, sDes, face, vmax, p.amax*(p.stun>0?0.5:1), 5.8, DT);
    energy(p, hyp(p.vx,p.vy)); timers(p);
  }
  function energy(p, sp){ const r=sp/7, tt=tm(p); p.st-=1.9*(0.006+0.03*r*r)*(1.5-p.a0.res/20)*0.35/TIME_F*STF*(ROLE_RUN[p.role]||1)*(tt.press===2?1.12:tt.press===0?0.95:1)*(M.half===1?0.82:1.22); if(p.st<15) p.st=15; }
  function timers(p){ if(p.stun>0) p.stun-=DT; if(p.runT>0) p.runT-=DT*TDEC; if(p.drib>0) p.drib-=DT*TDEC; if(p.shield>0) p.shield-=DT*TDEC; }
  /* distanza minima tra i corpi: 1,05 m, 0,5 nei duelli per la palla e nelle barriere, 0,6 tra avversari in area sui calci piazzati */
  function sepMin(a,b){
    if(a.dv||b.dv) return 0.45;
    if(M.restart && M.restart.wallIds && M.restart.wallIds.has(a.id) && M.restart.wallIds.has(b.id)) return 0.5;
    if(a.t!==b.t){ if(duelPair(a,b)) return 0.5;
      if(M.restart && (M.restart.type==='cor'||(M.restart.type==='fk'&&M.restart.crossFk)) && Math.abs(a.y-34)<20 && Math.abs(b.y-34)<20 && (a.x<17||a.x>PL-17) && (b.x<17||b.x>PL-17)) return 1.02; }
    return a.t===b.t?1.05:1.02; }
  function separate(){
    const n=ON.length;
    for(let it=0;it<2;it++) for(let i=0;i<n;i++){ const a=ON[i]; for(let j=i+1;j<n;j++){ const b=ON[j]; let dx=b.nx-a.nx, dy=b.ny-a.ny; const d2=dx*dx+dy*dy; if(d2>=1.1025) continue;
      const m=sepMin(a,b); if(d2>=m*m) continue; let d=Math.sqrt(d2); if(d<1e-4){ dx=Math.cos(i*2.4+j); dy=Math.sin(i*2.4+j); d=1; } else { dx/=d; dy/=d; }
      const push=m-d; let wa=0.5; if(a===ball.owner||a.dv) wa=0.15; else if(b===ball.owner||b.dv) wa=0.85;
      a.nx-=dx*push*wa; a.ny-=dy*push*wa; b.nx+=dx*push*(1-wa); b.ny+=dy*push*(1-wa); } }
  }
  /* tabella delle distanze del tick (RICERCA C2): calcolata una volta dopo il movimento e usata da tutti */
  const NMAX=24, ON=[], DTB=new Float64Array(NMAX*NMAX);
  function buildDist(){ for(const p of ON) p.k=-1; ON.length=0; for(const t of T) for(const p of t.on){ p.k=ON.length; ON.push(p); }
    const n=ON.length; for(let i=0;i<n;i++){ const a=ON[i]; DTB[i*NMAX+i]=0; for(let j=i+1;j<n;j++){ const b=ON[j]; const d=hyp(a.x-b.x,a.y-b.y); DTB[i*NMAX+j]=d; DTB[j*NMAX+i]=d; } } }
  const D2=(a,b)=>(a.k>=0&&b.k>=0)?DTB[a.k*NMAX+b.k]:hyp(a.x-b.x,a.y-b.y);
  function stopBall(){ ball.vx=0; ball.vy=0; ball.vz=0; ball.wx=0; ball.wy=0; ball.wz=0; }
  function giveBall(p, delay){ if(M.gst && !(p.role==='GK' && delay>=1.5)) M.gst(p,4);   /* R4: «stop» nell'elenco dei gesti (la presa del portiere la scrive gkCatch) */
    if(ball.sh && !ball.sh.done && p.t!==ball.sh.p.t){ const gl=T[ball.sh.p.t].dir>0?PL:0, behind=Math.abs(ball.x-gl)<Math.abs(p.x-gl)-0.5;
      shotEnd(p.role==='GK'?(behind?'short':'save'):'block', p); }   /* v0.4.2.0: palla ferma dietro al portiere: non è una parata */
    if(ball.sh && (p!==ball.sh.p)) ball.sh=null;
    ball.owner=p; ball.fl=null; ball.lastT=p.t; ball.lastP=p; stopBall(); ball.ct=M.tick;   /* v0.4.2.7: il controllo è un contatto (come i rimbalzi) */ p.hold=false; p.hx=null; p.dt=delay??(1.0+R()*0.9); p.cx=undefined; p.cy=undefined; p.ft=delay==null; if(delay==null && firstTime(p)) return;
    if(delay==null && p.role!=='GK'){ const [q,d]=nearestOpp(p); if(q && d<5){ const n=Math.max(0.5,d); p.cx=clamp(p.x+(p.x-q.x)/n*1.5,1,PL-1); p.cy=clamp(p.y+(p.y-q.y)/n*1.5,1,PW-1); } else { const t=tm(p); p.dt=0.7+R()*0.6; const xr=rx(t,p.x); if(xr<78){ p.cx=clamp(p.x+t.dir*4.5,1,PL-1); p.cy=p.y+(34-p.y)*0.08; } } } }
  function loose(x,y,vx,vy,vz,z){ ball.owner=null; ball.fl=null; ball.ct=M.tick; ball.x=x; ball.y=y; ball.z=z||0; ball.vx=vx; ball.vy=vy; ball.vz=vz||0; ball.wx=0; ball.wy=0; ball.wz=0; }
  /* volo (v0.4.2.0): la palla parte con la velocità giusta per arrivare nel punto scelto e poi segue la fisica.
     h < 0,6 = rasoterra (arriva con velocità 0,55·speed), altrimenti palla alzata con un arco di altezza ~h */
  function fly(type, from, x1, y1, speed, h, extra){
    const ex=extra||{}, x0=ball.x, y0=ball.y, z0=ball.z||0, L=Math.max(0.5,hyp(x1-x0,y1-y0));
    const z1=ex.z1!=null?ex.z1 : type==='cross'?1.6 : type==='clear'?0 : 0.5;
    let tA, v0;
    if(type==='pass' && h<0.6 && z0<0.3){ const g=fisGround(L,clamp(speed*0.55,4.5,12)); fisKick(ball,g.v,Math.atan2(y1-y0,x1-x0),0,0,0); ball.z=0; tA=g.t; v0=g.v; }
    else { const el=clamp(Math.atan2(4*Math.max(h,0.4),L),0.1,1.05), a=fisLoft(x0,y0,z0,x1,y1,Math.min(z1,z0+4*h),el,ex.curl||0,0); fisKick(ball,a.v,a.az,a.el,ex.curl||0,0); tA=a.t; v0=a.v; }
    ball.owner=null; ball.fl={type, t:from.t, from, x0, y0, z0, x1, y1, z1, tA, el:0, n:Math.max(1,Math.ceil(tA/DT)), k:0, h, tried:0, ...ex}; ball.lastT=from.t; ball.lastP=from; from.hold=false;
    if(SO) SO.e('fly',SX,{f:ball.fl, speed:v0});
  }
  function segPt(px,py,ax,ay,bx,by){ const vx=bx-ax, vy=by-ay, L=vx*vx+vy*vy; let u=L>1e-9?((px-ax)*vx+(py-ay)*vy)/L:0; u=u<0?0:u>1?1:u; return hyp(ax+u*vx-px, ay+u*vy-py); }
  /* traiettoria prevista: primo difensore che la tocca (corpo, gambe, barriera) e momento in cui arriva all'altezza del portiere */
  const FIS_P={x:0,y:0,z:0,vx:0,vy:0,vz:0,wx:0,wy:0,wz:0};
  function shotPlan(f){
    const s=fisCopy(FIS_P,ball), o=T[1-f.t], gk=f.gk&&f.gk.on?f.gk:null, sgn=T[f.t].dir, gx=sgn>0?PL:0, h=DT/FIS.SUB;
    let t=0, blk=null, gkT=null, gyC=0, gzC=0, ly=null, lz=null; const gkx=gk?gk.x:gx;
    const gkBeaten=gk && (gk.x-s.x)*sgn<0.3;   /* il portiere è già alle spalle della palla: non può pararla */
    for(let k=0;k<96;k++){ const px=s.x, py=s.y, pz=s.z; fisBallStep(s,h); t+=h;
      for(const q of o.on){ if(q===gk||q.role==='GK') continue; if(Math.abs(q.x-f.x0)<0.7 && Math.abs(q.y-f.y0)<0.7) continue;
        const ext=Math.min(t,0.4), qx=q.x+(q.vx||0)*ext, qy=q.y+(q.vy||0)*ext, wall=f.wall&&f.wall.has(q.id);
        const zTop=wall?2.12:1.85, zl=Math.min(s.z,pz); if(zl>zTop) continue;
        const reach= wall?0.3 : zl>1.2 ? 0.35 : 0.35+clamp((t-0.08)*3.2,0,0.75)*(0.7+q.a0.pos/40);
        if(segPt(qx,qy,px,py,s.x,s.y)<reach){ blk={q,t}; break; } }
      if(blk) break;
      if(!gkT && gk && (s.x-gkx)*sgn>=0){ const w=(gkx-px)/((s.x-px)||1e-9); gkT=t-(1-w)*h; gyC=py+(s.y-py)*w; gzC=pz+(s.z-pz)*w; }
      if((s.x-gx)*sgn>=0){ const w=(gx-px)/((s.x-px)||1e-9); ly=py+(s.y-py)*w; lz=pz+(s.z-pz)*w; if(gkT==null){ gkT=t-(1-w)*h; gyC=ly; gzC=lz; } break; }
      if(t>4) break; }
    f.blk=blk; if(blk||!gk||gkT==null||gkBeaten) return;
    gkDecide(f,gk,gkT,gyC,gzC,ly,lz,Math.hypot(s.vx,s.vy,s.vz));
  }
  /* blocco del difensore: la palla rimbalza sul corpo con una direzione nuova (fisica, con un po' di caso) */
  function doBlock(f){ const q=f.blk.q, p=f.from; ball.fl=null; q.s.int++; ball.ct=M.tick;
    /* deviazione: spesso torna indietro, a volte prosegue deviata verso il fondo (angolo) */
    const v=Math.hypot(ball.vx,ball.vy,ball.vz), fw=RP()<0.38, a=Math.atan2(ball.vy,ball.vx)+(fw?(RP()-0.5)*1.4:Math.PI+(RP()-0.5)*2.6), k=v*(fw?0.35+RP()*0.3:0.25+RP()*0.35);
    ball.vx=Math.cos(a)*k*0.8+ball.vx*0.15; ball.vy=Math.sin(a)*k*0.8+ball.vy*0.15; ball.vz=Math.abs(ball.vz)*0.3+RP()*4; ball.wx=0; ball.wy=0; ball.wz=0;
    ball.lastT=q.t; ball.lastP=q; shotEnd('block',q); }
  /* v0.4.2.7 (R2b): la parata avviene dove la palla incontra il portiere. In un sotto-passo la palla fa fino a 2 m: se ha già
     superato il piano del portiere, si riporta sul punto in cui lo ha attraversato (stessa velocità; nessun numero casuale) */
  function saveAt(f,px,py,pz){ const gk=f.gk, sg=T[f.t].dir; if(!gk.on) return; const a=(px-gk.x)*sg, b=(ball.x-gk.x)*sg;
    if(b>0 && a<0){ const w=a/(a-b); ball.x=px+(ball.x-px)*w; ball.y=py+(ball.y-py)*w; ball.z=Math.max(0,pz+(ball.z-pz)*w); } }
  function moveTo(o,tx,ty,vmax){ const dx=tx-o.x, dy=ty-o.y, d=hyp(dx,dy); if(d<0.05) return; const s=Math.min(d,vmax); o.x+=dx/d*s; o.y+=dy/d*s; }

  /* gol (v0.4.2.0): deciso dalla geometria in lineCheck. fx: og = autogol (scorer è il difensore), ns/nt = il tiro (in porta) era già contato */
  function goalScored(t, scorer, kind, fx){
    fx=fx||{}; t.goals++; const o=T[1-t.idx]; const og=!!fx.og;
    const dB=t.goals-1-o.goals, mn=minNum(M.tick), dec=dB===0||dB===-1;
    const gw = dec ? (mn>=80?1.5:1.25) : dB>=2 ? 0.7 : dB<=-2 ? 0.6 : 1;
    if(og) scorer.s.err++; else { scorer.s.g++; scorer.s.gv+=gw; }
    o.on.forEach(q=>q.s.ga++);
    const ast = !og && ball.pass && ball.pass.from.t===t.idx && ball.pass.from!==scorer && M.tick-ball.pass.t<34 ? ball.pass.from : null; if(ast){ ast.s.as++; ast.s.av+=gw; }
    const gk=gkOf(o);
    const sp = ball.sp && ball.sp.team===t.idx && M.tick-ball.sp.t<(ball.sp.type==='thr'?14:34) ? ball.sp.type : null;
    const txt= og ? `GOL! Autogol di ${scorer.ln}: la palla finisce nella sua porta.` : kind==='fk'?fill2(P(MTX.fkGoal),{s:scorer}):fill2(P(kind==='pen'?MTX.goalP:kind==='head'?MTX.goalH:MTX.goal),{s:scorer,b:ast||scorer,g:gk||scorer});
    E('goal',t.idx,[scorer.id].concat(ast?[ast.id]:[]),txt,{score:[T[0].goals,T[1].goals],x:ball.x,y:ball.y,sp:sp&&sp!=='thr'?sp:null,...(og?{og:1}:{}),...(fx.ns?{ns:1}:{}),...(fx.nt?{nt:1}:{})});
    if(ball.owner) ball.owner.hold=false; ball.owner=null; ball.fl=null; if(ball.sh) ball.sh.done=true;
    const cel=og ? (t.on.filter(q=>q.role!=='GK').sort((a,b)=>D2(a,ball)-D2(b,ball))[0]||scorer) : scorer;
    const cy = cel.y<34 ? 2.5 : PW-2.5;
    M.restart={type:'cel', team:o.idx, x:52.5, y:34, ticks:Math.round((60+Math.floor(RA()*20))*RS_K), scTeam:t.idx, scorer:cel, t0:M.tick, cx:(t.dir>0?PL-2:2), cy, bs:'roll'};
  }
  /* la palla ha superato interamente una linea (centro oltre la linea di almeno un raggio): gol, fuori o rimessa */
  function lineCheck(){
    const bx=ball.x, by=ball.y, r=FIS.R;
    if(bx<-r || bx>PL+r){
      const left=bx<0, atkT=left?(T[0].dir>0?1:0):(T[0].dir>0?0:1), A=T[atkT], D=T[1-atkT];
      if(Math.abs(by-34)<FIS.GW && ball.z+r<FIS.GH){
        const sh=ball.sh; let scorer, kind='open', fx={};
        if(sh && sh.p.t===atkT && M.tick-sh.tick<14 && sh.p.on){ scorer=sh.p; kind=sh.kind; if(sh.done) fx.ns=1; if(sh.sot) fx.nt=1; else { A.st.sot++; scorer.s.sot++; }
          if(!sh.done){ sh.done=true; sh.f.res='goal'; if(SO) SO.e('shotend',SX,{f:sh.f}); } sh.sot=true; }
        else if(ball.lastT===atkT && ball.lastP && ball.lastP.t===atkT && ball.lastP.on){ scorer=ball.lastP; fx.ns=1; fx.nt=1; }
        else { scorer=ball.lastP && ball.lastP.t===D.idx && ball.lastP.on ? ball.lastP : (gkOf(D)||D.on[0]); fx.og=1; fx.ns=1; fx.nt=1; }
        goalScored(A, scorer, kind, fx); return true; }
      if(SO) SO.e('out',SX,{owner:ball.owner});
      const cross={y:by,z:ball.z}; shotEnd('wide',null,cross);
      if(ball.owner) ball.owner.hold=false; ball.owner=null; ball.fl=null; ball.sh=null;
      if(ball.lastT===atkT){ pause('gk',D.idx,D.dir>0?5.5:PL-5.5,34+(RA()-0.5)*14,24+Math.floor(RA()*16),{taker:gkOf(D)}); }
      else { A.st.cor++; E('cor',atkT,[],`Calcio d'angolo per ${A.inp.n}.`); pause('cor',atkT,left?0:PL,by<34?0.5:PW-0.5,26+Math.floor(RA()*16)); }
      return true; }
    if(by<-r || by>PW+r){ if(SO) SO.e('out',SX,{owner:ball.owner}); shotEnd('wide',null,{y:by,z:ball.z}); if(ball.owner) ball.owner.hold=false; ball.owner=null; ball.fl=null; ball.sh=null;
      const ti=1-ball.lastT; pause('thr',ti,clamp(bx,0.5,PL-0.5),by<0?0.3:PW-0.3,10+Math.floor(RA()*10)); return true; }
    return false;
  }
  /* pali, traversa, rete, bandierine e cartelloni (la palla attraversa il piano della porta in questo sotto-passo?) */
  function collide(px,py,pz){
    const r=FIS.R, rr=r+FIS.PR;
    for(const gx of [0,PL]){ if((px-gx)*(ball.x-gx)>0 || px===ball.x) continue;
      const w=(px-gx)/(px-ball.x), yc=py+(ball.y-py)*w, zc=pz+(ball.z-pz)*w, side=gx===0?1:-1;   /* side: verso il campo */
      let hit=false, nx=0, ny=0, nz=0;
      for(const pyP of [34-FIS.GW-FIS.PR, 34+FIS.GW+FIS.PR]){ const d=yc-pyP; if(Math.abs(d)<rr && zc+r<FIS.GH+2*FIS.PR){ const ax=Math.sqrt(Math.max(0,rr*rr-d*d)); nx=side*ax; ny=d; hit=true; break; } }
      if(!hit){ const d=zc+r-(FIS.GH+FIS.PR); if(Math.abs(d)<rr && Math.abs(yc-34)<FIS.GW+FIS.PR){ const ax=Math.sqrt(Math.max(0,rr*rr-d*d)); nx=side*ax; nz=d; hit=true; } }
      if(hit){ const n=Math.hypot(nx,ny,nz)||1; nx/=n; ny/=n; nz/=n; const vn=ball.vx*nx+ball.vy*ny+ball.vz*nz;
        if(vn<0){ ball.vx-=1.75*vn*nx; ball.vy-=1.75*vn*ny; ball.vz-=1.75*vn*nz; ball.vx*=0.92; ball.vy*=0.92; ball.vz*=0.92; ball.wx=0; ball.wy=0; ball.wz=0;
          ball.x=gx+side*0.02; ball.y=yc; ball.z=Math.max(0,zc); ball.post=M.tick; ball.ct=M.tick; if(ball.sh && !ball.sh.done) shotEnd('post'); } } }
    /* rete (v0.4.2.7, R2b): scatola dietro la linea (tra i pali, sotto la traversa, profonda FIS.NET). Si guarda da dove arriva la palla:
       se era dentro (o è entrata dalla bocca della porta) non esce da lati, fondo e tetto e la rete la frena; se arriva da fuori, rimbalza fuori */
    if(ball.x<0||ball.x>PL){ const sg=ball.x<0?-1:1, gx=ball.x<0?0:PL, dep=sg*(ball.x-gx), pdep=sg*(px-gx), ay=Math.abs(ball.y-34), sy=Math.sign(ball.y-34)||1;
      let pin;
      if(pdep>=0) pin= pdep<FIS.NET+0.01 && Math.abs(py-34)<FIS.GW && pz<FIS.GH;
      else { const w=pdep/(pdep-dep); pin= Math.abs(py+(ball.y-py)*w-34)<FIS.GW && pz+(ball.z-pz)*w<FIS.GH; }
      if(pin){ ball.vx*=0.9; ball.vy*=0.9; ball.vz*=0.9;
        if(dep>FIS.NET-r){ ball.x=gx+sg*(FIS.NET-r); ball.vx=-sg*Math.abs(ball.vx)*0.1; ball.vy*=0.6; }
        if(ay>FIS.GW-r){ ball.y=34+sy*(FIS.GW-r); ball.vy=-sy*Math.abs(ball.vy)*0.15; ball.vx*=0.6; }
        if(ball.z>FIS.GH-2*r){ ball.z=FIS.GH-2*r; ball.vz=-Math.abs(ball.vz)*0.15; } }
      else if(dep<FIS.NET && ay<FIS.GW && ball.z<FIS.GH){   /* da fuori contro la rete: lato, tetto o fondo */
        if(Math.abs(py-34)>=FIS.GW){ ball.y=34+sy*(FIS.GW+r); ball.vy=sy*Math.abs(ball.vy)*0.2; ball.vx*=0.6; }
        else if(pz>=FIS.GH){ ball.z=FIS.GH; ball.vz=Math.abs(ball.vz)*0.2; }
        else { ball.x=gx+sg*(FIS.NET+r); ball.vx=sg*Math.abs(ball.vx)*0.2; } } }
    /* bandierine (asta alta 1,5 m) */
    if((ball.x<1||ball.x>PL-1) && (ball.y<1||ball.y>PW-1) && ball.z<1.5){ const cx=ball.x<1?0:PL, cy=ball.y<1?0:PW, dx=ball.x-cx, dy=ball.y-cy, d=hyp(dx,dy);
      if(d<r+0.02 && d>1e-6){ const vn=(ball.vx*dx+ball.vy*dy)/d; if(vn<0){ ball.vx-=1.5*vn*dx/d; ball.vy-=1.5*vn*dy/d; } } }
    /* cartelloni */
    if(ball.x<-FIS.BOARD_X||ball.x>PL+FIS.BOARD_X){ ball.x=ball.x<0?-FIS.BOARD_X:PL+FIS.BOARD_X; ball.vx*=-0.25; ball.vy*=0.5; ball.vz*=0.3; }
    if(ball.y<-FIS.BOARD_Y||ball.y>PW+FIS.BOARD_Y){ ball.y=ball.y<0?-FIS.BOARD_Y:PW+FIS.BOARD_Y; ball.vy*=-0.25; ball.vx*=0.5; ball.vz*=0.3; }
  }
  /* un tick di palla senza portatore: volo con le sue regole (arrivo, intercetti, blocchi, portiere) e poi fisica pura */
  function ballTick(){
    const h=DT/FIS.SUB; M.bsN=0;
    for(let q=0;q<FIS.SUB;q++){
      if(ball.owner && !M.restart){ ownerBall(); recSub(q); continue; }
      const px=ball.x, py=ball.y, pz=ball.z;
      if(fisBallStep(ball,h)){ ball.bn=(ball.bn||0)+1; ball.ct=M.tick; }
      collide(px,py,pz);
      /* v0.4.2.0: prima la linea (la palla è già tutta oltre?), poi chi la tocca: un portiere che la blocca dietro la linea non salva un gol */
      if(!M.restart && lineCheck()){ recSub(q); continue; }
      if(!M.restart){ const f=ball.fl;
        if(f){ f.el+=h;
          if(f.chase){ const r=f.recv; if(r.on && ball.z<1.2 && hyp(r.x-ball.x,r.y-ball.y)<1.3){ const t=tm(f.from); t.st.pc++; f.from.s.pc++; ball.pass={from:f.from,t:M.tick}; giveBall(r); }
            else { let qb=null; if(ball.z<1.2) for(const q of T[1-f.t].on){ if(q.dv) continue; if(hyp(q.x-ball.x,q.y-ball.y)<1.0){ qb=q; break; } } if(qb){ qb.s.int++; giveBall(qb,0.5); } else if(f.el>f.tA+1.6) ball.fl=null; } }
          else if(f.type==='shot'){ if(f.blk && f.el>=f.blk.t) doBlock(f); else if(f.gkp && !f.gkDone && (f.el>=f.gkp.t || (f.gk.on && (ball.x-f.gk.x)*T[f.t].dir>=-0.15))){ saveAt(f,px,py,pz); doSave(f); } else if(f.el>f.tA+2.5) ball.fl=null; }
          else {
            if(f.el>0.12*f.tA && f.el<0.97*f.tA && ball.z<2.2){ const o=T[1-f.t], rr=f.first?1.9:1.1;
              for(const qq of o.on){ if(qq.k<0 || (f.tried&(1<<qq.k))) continue; if(segPt(qq.x,qq.y,px,py,ball.x,ball.y)>=rr) continue; f.tried|=(1<<qq.k);
                if(R()<((rx(T[qq.t],ball.x)<22?0.3:0.08)+qq.a.pos*(f.first?0.016:0.009))*(1-0.35*fatK(qq))*(qq.te?clamp(1+(qq.te.IN-SK_TQM.IN)/100*0.4,0.8,1.2):1)){   /* R3b: Intercettazione */ qq.s.int++; if(f.type!=='clear'&&f.from.s) f.from.s.err+=(rx(tm(f.from),ball.x)<30)?1:0;
                  if(ball.z<1.1) giveBall(qq,0.5); else { const tx=rx(T[qq.t],clamp(rx(T[qq.t],ball.x)+15,0,100)); ball.fl=null; fly('clear',qq,tx,clamp(ball.y+(R()-0.5)*20,3,65),16,5); } break; } } }
            if(ball.fl===f && f.type==='pass' && f.recv && f.recv.on && !f.bad && f.el>0.3*f.tA && ball.z<1.6 && hyp(f.recv.x-ball.x,f.recv.y-ball.y)<1.4) arrive();
            else if(ball.fl===f && f.el>=f.tA) arrive(); } }
        else if(!ball.owner){ /* palla libera: chi è vicino la prende */
          if(ball.z<2.0 && (q&1)===1){ let na=null, nb=null; for(const t of T){ let b=null,bd=1.1; for(const qq of t.on){ if(qq.dv) continue; const d=hyp(qq.x-ball.x,qq.y-ball.y)-(rx(t,ball.x)<18&&Math.abs(ball.y-34)<21?0.35:0)-(qq.role==='GK'&&rx(t,ball.x)<16.5&&Math.abs(ball.y-34)<20.2?(rx(t,ball.x)<6&&Math.abs(ball.y-34)<10?1.0:0.5):0); if(d<bd){bd=d;b=qq;} } if(b){ if(na) nb=b; else na=b; } }
            const gkA=(na&&na.role==='GK')?na:(nb&&nb.role==='GK')?nb:null; if(gkA && hyp(gkA.x-ball.x,gkA.y-ball.y)<1.6 && handsOk(gkA,ball.x,ball.y)){ gkCatch(gkA,1.2); }
            else if(na && !nb) giveBall(na,0.5); else if(na && nb){ const sa=na.a.vel+na.a.con*0.6+R()*10, sb=nb.a.vel+nb.a.con*0.6+R()*10; giveBall(sa>=sb?na:nb,0.5); } } }
        if(!M.restart) lineCheck(); }
      recSub(q);
    }
  }
  /* palla al piede (v0.4.2.0): davanti al giocatore nella direzione in cui si muove, con i tocchi della conduzione;
     il portiere che l'ha presa la tiene in mano */
  function ownerBall(){ const o=ball.owner; const sp=hyp(o.vx,o.vy);
    if(o.hold){ /* in mano: dal punto della presa la palla arriva al petto (0,3 m davanti, 1,1 m di altezza, verso il campo) in pochi decimi di secondo */
      const d=T[o.t].dir; if(o.hx==null){ o.hx=d*0.3; o.hy=0; o.hz=1.1; } o.hx+= (d*0.3-o.hx)*0.12; o.hy*=0.88; o.hz+=(1.1-o.hz)*0.12;
      ball.x=clamp(o.x+o.hx,0.2,PL-0.2); ball.y=o.y+o.hy; ball.z=o.hz-FIS.R; ball.vx=o.vx; ball.vy=o.vy; ball.vz=0; return; }
    const a= sp>0.8 ? Math.atan2(o.vy,o.vx) : o.o; o.tp=(o.tp||0)+sp*DT/FIS.SUB; const Lt=1.2+0.35*sp, ph=(o.tp%Lt)/Lt, off=0.32+(0.1+0.07*sp)*(1-ph);
    ball.x=clamp(o.x+Math.cos(a)*off,0.2,PL-0.2); ball.y=clamp(o.y+Math.sin(a)*off,0.2,PW-0.2); ball.z=0; ball.vx=o.vx; ball.vy=o.vy; ball.vz=0; }
  function arrive(){
    const f=ball.fl; ball.fl=null;
    if(f.type==='pass'){
      const r=f.recv, t=tm(f.from);
      if(f.offside){ t.st.off++; ref.flag=ball.x>52.5?2:1; ref.flagT=M.tick; E('off',f.t,[r.id],fill2(P(MTX.off),{p:r})); const o=op(f.from); pause('fk',o.idx,ball.x,ball.y,24+Math.floor(RA()*10),{taker:o.on.filter(q=>q.role!=='GK').sort((a,b)=>hyp(a.x-ball.x,a.y-ball.y)-hyp(b.x-ball.x,b.y-ball.y))[0]}); return; }
      if(!f.bad && rx(t,ball.x)<rx(t,f.x0)-6) op(f.from).pressUntil=M.tick+8;
      if(f.volley && !f.bad && r.on && hyp(r.x-ball.x,r.y-ball.y)<1.3){ ball.pass={from:f.from,t:M.tick}; ball.owner=r; ball.lastT=r.t; ball.lastP=r; shoot(r,'open'); return; }
      if(!f.bad && r.on && hyp(r.x-ball.x,r.y-ball.y)<(ball.z<0.4?2.0:1.7)){ const [,pr]=nearestOpp(r); if(R()<0.97+(r.a0.ctr-10)*0.008-(pr<1.4?0.09*(1.4-r.a0.ctr/20):0)){ t.st.pc++; f.from.s.pc++; if(rx(t,ball.x)-rx(t,f.x0)>=10) f.from.s.prog++; if(f.keyLike) f.from.s.kp++; ball.pass={from:f.from,t:M.tick}; giveBall(r); return; } }
      /* corsa sul pallone: se un avversario (o il portiere in uscita) arriva prima, la palla è sua */
      { const dr=r.on?hyp(r.x-ball.x,r.y-ball.y):99; let qb=null,dq=99; for(const q of op(f.from).on){ const inBoxQ=rx(T[q.t],ball.x)<16.5&&Math.abs(ball.y-34)<20; const d=hyp(q.x-ball.x,q.y-ball.y)-(q.role==='GK'?(inBoxQ?1.2:0.4)+(q.a0.usc-10)*0.05:0); if(d<dq){dq=d;qb=q;} }
        if(qb && dq<1.7 && dq<dr-0.3){ qb.s.int++; if(f.through && qb.role==='GK') E('save',f.t,[r.id,qb.id],`${qb.ln} esce e anticipa ${r.ln} sul filtrante.`,{x:ball.x,y:ball.y}); if(qb.role==='GK' && handsOk(qb,ball.x,ball.y)) gkCatch(qb,1.2); else giveBall(qb, qb.role==='GK'?0.8:0.5); return; } }
      if(f.bad && r.on && hyp(r.x-ball.x,r.y-ball.y)<1.7){ const [,pr]=nearestOpp(r); if(R()<0.5+(r.a0.ctr-10)*0.025-(pr<1.5?0.15:0)){ t.st.pc++; f.from.s.pc++; if(rx(t,ball.x)-rx(t,f.x0)>=10) f.from.s.prog++; ball.pass={from:f.from,t:M.tick}; giveBall(r); return; } }
      if(f.bad) f.from.s.err+= (rx(t,ball.x)<30)?1:0;
      /* v0.4.2.0: nessuno la controlla subito: la palla continua e il compagno la rincorre ancora per poco (passaggio riuscito se ci arriva prima di un avversario) */
      if(r.on && hyp(r.x-ball.x,r.y-ball.y)<7){ f.chase=true; ball.fl=f; }
      return;
    }
    if(f.type==='cross'){
      const t=tm(f.from), o=op(f.from), gk=gkOf(o);
      if(gk && f.gkOut===gk && hyp(gk.x-ball.x,gk.y-ball.y)<1.8 && handsOk(gk,ball.x,ball.y) && R()<(gk.a0.usc*0.7+gk.a0.pre*0.3)/16+(gk.h-185)*0.01+(ball.sp && ball.sp.type==='cor' && M.tick-ball.sp.t<11?0.1:0)){ gk.s.sv++; gkCatch(gk,1.5); return; }
      const atk=t.on.filter(q=>hyp(q.x-ball.x,q.y-ball.y)<1.5), dfs=o.on.filter(q=>q.role!=='GK'&&hyp(q.x-ball.x,q.y-ball.y)<1.5);
      let ba=null,bs=-1; for(const q of atk){ const s=aerial(q,R)+q.a.pos*0.3; if(s>bs){bs=s;ba=q;} }
      let bd=null,bds=-1; for(const q of dfs){ const s=aerial(q,R)+q.a.pos*0.3; if(s>bds){bds=s;bd=q;} }
      const fromCor = ball.sp && (ball.sp.type==='cor'||ball.sp.type==='fk') && M.tick-ball.sp.t<11;
      if(ba && bs>bds+(bd?2.5:-99)+(fromCor&&bd?4:0) && R()<(fromCor?0.68:0.8)){ t.st.pc++; f.from.s.pc++; if(rx(t,ball.x)-rx(t,f.x0)>=10) f.from.s.prog++; ball.pass={from:f.from,t:M.tick}; ball.lastT=ba.t; ball.lastP=ba;
        /* v0.4.2.0: il colpo di testa va in porta solo da buona posizione; altrimenti è una sponda (la palla resta libera vicino) */
        const gxh=t.dir>0?PL:0, dgh=hyp(gxh-ball.x,34-ball.y); if(dgh<14 && R()<0.7){ f.from.s.kp++; ball.owner=ba; shoot(ba,'head'); return; }
        const a=Math.atan2(34-ball.y,gxh-ball.x)+(R()-0.5)*2.2, k=3+R()*5; loose(ball.x,ball.y,Math.cos(a)*k,Math.sin(a)*k,1.5+R()*2,ball.z); return; }
      if(bd){ bd.s.int++; ball.lastT=bd.t; ball.lastP=bd; const tx=rx(o,clamp(rx(o,ball.x)+18+R()*12,0,100)); fly('clear',bd,tx,clamp(ball.y+(R()-0.5)*34,-2,PW+2),18,6); return; }
      return;
    }
    /* spazzate e lanci non controllati: la palla continua */
  }
  /* la palla torna sul punto della ripresa: lancio corto (raccattapalle, compagno) con la fisica, senza teletrasporto */
  function toss(r){ const z0=Math.max(ball.z,0.9), L=hyp(r.x-ball.x,r.y-ball.y), z1=r.type==='thr'?1.6:0.5;
    if(L<0.6){ ball.x=r.x; ball.y=r.y; ball.z=r.type==='thr'?1.9:0; stopBall(); r.bs='ready'; return; }
    ball.z=z0; const a=fisLoft(ball.x,ball.y,z0,r.x,r.y,z1,L>30?0.55:L>12?0.7:0.9,0,0); fisKick(ball,a.v,a.az,a.el,0,0); r.tA=a.t; r.te=0; r.bs='toss'; }
  return {fatK, JOG, SEP_R, duelPair, move, energy, timers, sepMin, separate, NMAX, ON, DTB, buildDist, D2, stopBall, giveBall, loose, fly, segPt, FIS_P, shotPlan, doBlock, moveTo, goalScored, lineCheck, collide, ballTick, ownerBall, arrive, toss};
}
