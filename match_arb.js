/* match_arb.js — v0.4.2.2 (T1): arbitro, assistenti, riprese, falli, cartellini, infortuni, fuorigioco, errori arbitrali (base per R5).
   Funzioni spostate da simMatch (match.js) senza cambiarne il corpo: matchArb(M) è chiamata da simMatch all'inizio della partita
   e restituisce le funzioni, che restano chiusure come prima. M è il contesto condiviso: le variabili riassegnate durante la partita
   si leggono e scrivono come M.x (tick, half, regEnd, restart, ht2, errLeft, bsN); gli altri valori di simMatch e le funzioni degli altri moduli
   arrivano nelle variabili qui sotto con M.link (stessi oggetti, nessuna copia). Script classico: nessun import/export. */
function matchArb(M){
  let R, P, RC, RA, RP, RB, minNum, SO, SX, T, all, rx, ry, tm, ball, RF, cardF, ref, refErrs, errPlan, MIN_T, E, fill2, recSub, kickoffPos, specOf, gkOf, cornerPts, subW, startSub, benchX, reshape10, bestSub, D2, stopBall, giveBall, loose, fly, moveTo, collide, toss, cross, shoot, throwIn;
  M.link.push(()=>{ ({R, P, RC, RA, RP, RB, minNum, SO, SX, T, all, rx, ry, tm, ball, RF, cardF, ref, refErrs, errPlan, MIN_T, E, fill2, recSub}=M); ({kickoffPos, specOf, gkOf, cornerPts, subW, startSub, benchX, reshape10, bestSub}=M.mAll); ({D2, stopBall, giveBall, loose, fly, moveTo, collide, toss}=M.mFis); ({cross, shoot, throwIn}=M.mGio); });
  const canErr=k=>M.errLeft>0 && errPlan[refErrs.filter(x=>x!=='allSi').length]===k;   /* v0.4.4.0: gli allontanamenti ingiusti (allSi) non spostano gli errori pianificati */
  /* v0.4.2.0: solo il primo calcio d'inizio mette i giocatori al loro posto; nel secondo tempo ci vanno camminando e la palla
     la porta a centrocampo un giocatore (bs: 'fetch' → 'toss' → 'ready'), il gioco aspetta che siano tutti in posizione */
  function startKick(ti, tele){ kickoffPos(T[0],ti===0,tele); kickoffPos(T[1],ti===1,tele); ball.owner=null; ball.fl=null; ball.sh=null;
    if(tele){ ball.x=52.5; ball.y=34; ball.z=0; stopBall(); M.restart={type:'kick',team:ti,x:52.5,y:34,ticks:4,bs:'ready'}; }
    else { stopBall(); M.restart={type:'kick',team:ti,x:52.5,y:34,ticks:24,bs:'roll',fetch:true}; } }
  function offLineFor(t){ const o=T[1-t.idx]; const xs=o.on.map(q=>rx(t,q.x)).sort((a,b)=>b-a); return Math.max(52.5, xs[1]||52.5, rx(t,ball.x)); }
  /* l'assistente giudica dalla posizione reale al momento del passaggio; sui centimetri può sbagliare */
  function offsideCall(t,m){ const xr=rx(t,m.x); if(xr<=52.5) return false; const mg=xr-offLineFor(t);
    const call = mg>1.5 ? true : mg>0.5 ? RA()<0.6 : mg>-0.4 ? RA()<0.04 : false;
    if(M.errLeft>0){
      if(call && mg>0.8 && xr>70 && canErr('offNo') && RA()<0.3){ refError('offNo',1-t.idx,[m.id],`${m.ln} scatta sul filo del fuorigioco: l'assistente lascia correre.`,`Le immagini sono chiare: ${m.ln} parte in fuorigioco. È sicuramente un errore arbitrale: l'assistente doveva alzare la bandierina.`); return false; }
      if(!call && mg<-0.6 && mg>-2.5 && xr>72 && canErr('offSi') && RA()<0.05){ refError('offSi',t.idx,[m.id],`Sul lancio per ${m.ln} l'assistente è pronto con la bandierina.`,`Il replay mostra ${m.ln} in posizione regolare. È sicuramente un errore arbitrale: il fuorigioco non c'era.`); return true; } }
    return call; }
  /* ripresa del gioco (v0.4.2.0): la palla non si teletrasporta. bs = stato della palla nella ripresa:
     'roll' = continua con la sua fisica (anche fuori dal campo); 'wait' = ferma, un raccattapalle sta per rimandarla;
     'fetch'/'hold' = un giocatore va a prenderla (dopo un gol, a inizio secondo tempo); 'toss' = in volo verso il punto della ripresa;
     'ready' = sul punto della ripresa (per la rimessa laterale: in mano a chi la batte) */
  function pause(type, team, x, y, ticks, extra){
    const prev=M.restart, owned=!!ball.owner; if(owned) stopBall(); if(ball.owner) ball.owner.hold=false; ball.owner=null; ball.fl=null;
    M.restart={type,team,x:clamp(x,0,PL),y:clamp(y,0,PW),ticks:Math.round(ticks*RS_K),...(extra||{})};
    /* v0.4.1.3: i cambi già chiamati (per esempio dopo un infortunio da fallo) passano alla nuova ripresa e si fanno prima di riprendere il gioco */
    if(prev && prev.subs){ const pend=prev.subs.filter(z=>z.ph<2); if(pend.length){ M.restart.subs=pend; M.restart.sub=true; if(prev.winT) M.restart.winT=prev.winT; } }
    if(SO) SO.e('pause',SX,{type,team,prev});
    if(type==='cor'||type==='gk'||type==='thr') M.restart.bs='roll';
    else { const sp=Math.hypot(ball.vx,ball.vy,ball.vz), dd=hyp(ball.x-M.restart.x,ball.y-M.restart.y);
      if(sp<1.5 && dd<1.5 && ball.z<0.6){ ball.x=M.restart.x; ball.y=M.restart.y; ball.z=0; stopBall(); M.restart.bs='ready'; } else M.restart.bs='roll'; }
    if(type==='cor' && (!M.restart.taker||!M.restart.taker.on)){ M.restart.taker=specOf(T[team],'cor',q=>q.a0.cpz*0.5+q.a0.crs*0.5); }
    if(!M.restart.taker || !M.restart.taker.on){ const tt=T[team]; M.restart.taker = type==='gk' ? gkOf(tt) : tt.on.filter(q=>q.role!=='GK').sort((a,b)=>hyp(a.x-M.restart.x,a.y-M.restart.y)-hyp(b.x-M.restart.x,b.y-M.restart.y))[0]; }
  }

  /* errore arbitrale: evento con il commento del giornalista, poi la protesta dell'allenatore danneggiato */
  function refError(kind, victimSide, ids, txt, cm){ M.errLeft--; refErrs.push(kind); E('referr',victimSide,ids,txt,{kind,cm}); protest(T[victimSide], 1); }
  /* v0.4.4.0 (R3a): protesta dell'allenatore e decisione dell'arbitro (docs/PROGRESSI_R3a.md § 3.5). w = peso dell'episodio
     (errore contro 1, rosso 0,6, rigore 0,5, giallo 0,12), aumentato se la squadra perde o dopo il 75'. Il Carattere efficace (con il morale)
     decide se protesta e quanto: l'arbitro (severità RF.car) lascia correre, ammonisce o allontana; Errori (RF.err) può sbagliare di un gradino.
     Numeri casuali RB (panchina): il resto della partita non si rimescola */
  function protest(t, w){
    if(t.coachOut || t.pendOff || t.pendYc) return;
    const c=t.coach, ci=(c.k&&c.k.CAR!=null?c.k.CAR:coS(c.car||10))/100, sur=c.n.split(' ').slice(-1)[0], rn=RF.n?' '+RF.n:'', o=T[1-t.idx];
    const ctx=(t.goals<o.goals?1.25:1)*(minNum(M.tick)>=75?1.15:1);
    if(RB()>=Math.min(1,w*ctx)*(PR_K.p0+PR_K.p1*ci)) return;
    const grave=RB()<PR_K.g0+PR_K.g1*ci, sev=(RF.car||10)-10, u=RB();
    let d = grave ? (u<PR_K.gOff+PR_K.gOffS*sev?2 : u<PR_K.gOff+PR_K.gOffS*sev+PR_K.gYc?1:0) : (u<PR_K.lOff?2 : u<PR_K.lOff+PR_K.lYc+PR_K.lYcS*sev?1:0);
    let wrong=false;
    if(RB()<Math.max(0,PR_K.e0+PR_K.e1*((RF.err||10)-10))){ if(!grave){ if(d===1&&!t.cyc) d=2, wrong=true; else if(d===0) d=1; } else if(d>0) d--; }
    const y2 = d===1 && t.cyc>=1; if(y2) d=2;
    if(d===2){ t.pendOff=true; t.offY2=y2;
      if(wrong){ refErrs.push('allSi'); E('referr',t.idx,[],t_('par.prot_ingiusta',{sur,rn}),{kind:'allSi',cm:t_('par.prot_ingiusta_cm',{sur})}); }
      else E('protest',t.idx,[],y2?t_('par.prot_y2',{sur,rn}):t_('par.prot_off',{sur,rn}),{d}); }
    else if(d===1){ t.pendYc=true; E('protest',t.idx,[],t_('par.prot_yc',{sur,rn}),{d}); }
    else E('protest',t.idx,[],grave?t_('par.prot_grave_no',{sur,rn}):t_('par.prot_lieve',{sur}),{d});
  }
  function moveRefs(){
    const r=M.restart, bx=ball.x, by=ball.y, yd=x=>58-(x-16)*(48/73);
    let tx, ty, vmax=3.3;
    const cardP = r&&r.card&&!r.card.shown ? all.get(r.card.pid) : null;
    if(cardP){ const s=cardP.x<ref.x?1:-1; tx=cardP.x+s*1.4; ty=cardP.y+0.6; vmax=3.6;
      if(hyp(ref.x-cardP.x,ref.y-cardP.y)<2.4){ r.card.shown=true; ref.cardK=r.card.k; ref.cardT=M.tick; } }
    else if(r&&r.coach&&!r.coach.shown){ tx=benchX(r.coach.side); ty=1.6; vmax=3.6; if(hyp(ref.x-tx,ref.y-ty)<2.2){ r.coach.shown=true; ref.cardK=r.coach.k||4; ref.cardT=M.tick; } }
    else if(r&&(r.type==='cel'||r.type==='kick')){ tx=52.5+(r.type==='cel'?0:-3); ty=yd(52.5)+4; vmax=2.4; }
    else if(r&&r.type==='pen'){ const gx=r.x>52.5?PL:0; tx=gx+(gx?-14:14); ty=gx?34-14:34+14; }
    else { const pt=ball.owner?tm(ball.owner):ball.fl?T[ball.fl.t]:null, dir=pt?pt.dir:0;
      tx=clamp(bx-dir*7,14,91); const yl=yd(tx); ty=yl+(by-yl)*0.3;
      let dx=tx-bx, dy=ty-by, d=hyp(dx,dy); if(d<9){ if(d<0.01){dx=0;dy=1;d=1;} tx=bx+dx/d*9; ty=by+dy/d*9; }
      if(r) vmax=2.6; }
    if(M.tick-ref.cardT>=8) moveTo(ref,clamp(tx,-1,PL+1),clamp(ty,1,PW-1),vmax);
    /* assistenti: in linea con il penultimo difendente, o con il pallone se è più vicino alla porta */
    const dR=T[0].dir>0?T[1]:T[0], dL=T[0].dir>0?T[0]:T[1];
    const xsR=dR.on.map(q=>q.x).sort((a,b)=>b-a), xsL=dL.on.map(q=>q.x).sort((a,b)=>a-b);
    /* ogni assistente copre la metà campo alla sua sinistra: il primo (lato panchine) quella di sinistra, il secondo quella di destra */
    let a1x=clamp(Math.min(xsL[1]??52.5, bx),0,52.5), a2x=clamp(Math.max(xsR[1]??52.5, bx),52.5,PL);
    if(r && r.subs && r.subs.some(z=>z.ph<2)) a1x=52.5;
    moveTo(ref.a1,a1x,-1,3.6); moveTo(ref.a2,a2x,PW+1,3.6);
    /* chi esce dal campo cammina verso la panchina */
    for(const t of T){ const W=subW(t); for(const p of t.bench) if(p.walkIn) moveTo(p,W[0],W[1],1.7); }
    for(const p of all.values()) if(p.leave>0){ p.leave--; if(p.lw>0){ p.lw--; continue; } moveTo(p,52.5+(p.t===0?-6:6),-1.2,1.3); if(hyp(p.x-(52.5+(p.t===0?-6:6)),p.y+1.2)<0.5) p.leave=0; }
  }
  function foul(f, v){
    { const o_=tm(v), vxr_=rx(o_,v.x), vyr_=ry(o_,v.y);
      if(vxr_>88.5 && Math.abs(vyr_-34)<20.2 && canErr('rigNo') && RA()<0.9){ loose(ball.x,ball.y,(RP()-0.5)*3,(RP()-0.5)*3); v.stun=0.8;
        refError('rigNo',v.t,[f.id,v.id],`${v.ln} va giù in area dopo il contatto con ${f.ln}: per l'arbitro si può continuare.`,`Il replay non lascia dubbi: ${f.ln} stende ${v.ln} in area. È sicuramente un errore arbitrale: era rigore.`); return; } }
    const t=tm(f), o=tm(v); t.st.fou++; E('fo',f.t,[f.id,v.id],''); if(SO) SO.e('foul',SX,{f,v});
    const vxr=rx(o,v.x), vyr=ry(o,v.y), inBox=vxr>88.5 && Math.abs(vyr-34)<20.2;
    const lastMan = vxr>75 && Math.abs(vyr-34)<22 && t.on.filter(q=>q.role!=='GK' && rx(o,q.x)>vxr).length===0;
    let card=null;
    if(lastMan && RA()<0.07*cardF) card='rc';
    else if(RA()<((f.yc?0.55:1)*(0.17+(f.tem-10)*0.014)+(lastMan?0.35:0)+(inBox?0.1:0)+(M.tick<o.counterUntil?0.3:0))*cardF*0.86) card = f.yc?'y2':'yc';
    if(RP()<0.008) injure(v);
    if(card){ if(card==='yc'){ f.yc=1; t.st.yc++; E('yc',f.t,[f.id,v.id],fill2(P(MTX.yc),{p:f,v})); } else { t.st.rc++; if(card==='y2'){ t.st.yc++; } f.s.red=1; E(card==='rc'?'rc':'rc',f.t,[f.id,v.id],fill2(P(card==='rc'?MTX.rc:MTX.y2),{p:f,v})); sendOff(f); } }
    if(inBox){ E('pen',v.t,[v.id,f.id],fill2(P(MTX.pen),{p:f,v})); const tk=specOf(o,'pen',q=>q.a0.cpz*0.6+q.a0.fre*0.4); pause('pen',o.idx,o.dir>0?PL-11:11,34,60+Math.floor(RA()*20),{taker:tk}); }
    else { const dgx=105-vxr, dist=hyp(dgx,vyr-34), ang=Math.abs(vyr-34)/Math.max(1,dgx);
      if(dist<=28 && ang<1.0 && R()<(dist<22?0.5:0.3)){ const tk=specOf(o,'fk',q=>q.a0.cpz*0.7+q.a0.lun*0.3); pause('fk',o.idx,v.x,v.y,50+Math.floor(RA()*20),{taker:tk,direct:true,wall:dist<19?5:dist<24?4:3}); E('fkset',o.idx,[tk.id],`Punizione dal limite per ${o.inp.n}: sul pallone ${tk.ln}.`); }
      else if(dgx<=40 && dgx>=14){ const tk=specOf(o,'cor',q=>q.a0.cpz*0.5+q.a0.crs*0.5); pause('fk',o.idx,v.x,v.y,40+Math.floor(RA()*16),{taker:tk,crossFk:true}); E('fkx',o.idx,[tk.id],`Punizione dalla trequarti per ${o.inp.n}: la batte ${tk.ln}.`); }
      else pause('fk',o.idx,v.x,v.y,14+Math.floor(RA()*12),{taker:v}); }
    if(card && M.restart){ M.restart.card={pid:f.id,k:card==='yc'?1:card==='y2'?3:2,shown:false}; M.restart.ticks=Math.max(M.restart.ticks,16); if(card!=='yc'){ f.leave=44; f.lw=10; } }
    { const w=Math.max(card&&card!=='yc'?0.6:card==='yc'?0.12:0, inBox?0.5:0); if(w) protest(t,w); }   /* v0.4.4.0: anche sui gialli, con peso basso */
  }
  function injure(p){ if(p.inj||p.out) return; p.inj=true; p.leave=50; p.lw=12; p.dv=null; if(!M.restart) pause('drop',1-p.t,ball.x,ball.y,80); E('inj',p.t,[p.id],fill2(P(MTX.inj),{p})); forcedOut(p,'inj'); }
  function sendOff(p){ forcedOut(p,'red'); }
  function forcedOut(p, why){
    const t=tm(p); p.out=true; p.on=false; const slot=p.slot; t.on=t.on.filter(q=>q!==p); if(ball.owner===p) loose(p.x,p.y,0,0);
    if(why==='inj' && t.subs>0){ const b=bestSub(t,t.slots[slot].r); if(b){ startSub(t,null,b,slot,'Cambio forzato',true); return; } }
    if(why==='inj'){ reshape10(t, t.subs>0?'nessun sostituto disponibile in panchina':'ha già fatto tutti i cambi'); return; } /* v0.4.1.3: il registro dice perché si resta in 10 */
    if(why==='red'){
      if(p.role==='GK'){ const b=t.bench.find(q=>q.r==='P'&&!q.out&&!q.on); if(b && t.subs>0){ const victim=t.on.filter(q=>isAtt(q.role)).sort((a,b)=>a.st-b.st)[0]||t.on[t.on.length-1]; const vs=victim.slot; victim.on=false; victim.out=true; t.on=t.on.filter(q=>q!==victim); startSub(t,victim,b,slot,'Entra il portiere di riserva',true); return; } }
      reshape10(t); return;
    }
    reshape10(t);
  }

  /* avversari a distanza regolamentare dal pallone: 9,15 m su angoli, punizioni e calcio d'inizio, 2 m sulla rimessa laterale */
  function keepDistance(now){
    const r=M.restart; if(!r || r.type==='pen' || r.type==='cel' || r.type==='gk') return;
    const need = r.type==='thr'?2.2 : r.type==='drop'?4.2 : 9.3, o=T[1-r.team];
    for(const p of o.on){ if(p.role==='GK' && r.type!=='kick') continue;
      const px=now?p.x:p.tx, py=now?p.y:p.ty; let dx=px-r.x, dy=py-r.y, d=hyp(dx,dy);
      if(d>=need) continue; if(d<0.01){ dx=-T[r.team].dir; dy=0; d=1; }
      let nx=r.x+dx/d*need, ny=r.y+dy/d*need;
      if(ny<0.5||ny>PW-0.5||nx<0.5||nx>PL-0.5){ const a=Math.atan2(dy,dx); let best=null; for(let s=1;s<=12&&!best;s++) for(const sg of [1,-1]){ const b=a+sg*s*0.26, X=r.x+Math.cos(b)*need, Y=r.y+Math.sin(b)*need; if(X>0.5&&X<PL-0.5&&Y>0.5&&Y<PW-0.5){ best=[X,Y]; break; } } if(best){ nx=best[0]; ny=best[1]; } }
      if(now){ p.x=nx; p.y=ny; } else { p.tx=nx; p.ty=ny; p.urg=true; } }
  }
  function restartBall(){
    const r=M.restart, h=DT/FIS.SUB; M.bsN=0;
    if(r.bs==='roll'||r.bs==='toss'){
      for(let q=0;q<FIS.SUB;q++){ const px=ball.x, py=ball.y, pz=ball.z; if(fisBallStep(ball,h)) ball.bn=(ball.bn||0)+1; collide(px,py,pz);
        if(r.bs==='toss'){ r.te+=h; if(r.te>=r.tA){ ball.x=r.x; ball.y=r.y; ball.z=r.type==='thr'?1.9:0; stopBall(); r.bs='ready'; } }
        recSub(q); }
      if(r.bs==='roll' && r.type!=='cel' && hyp(ball.vx,ball.vy)<0.7 && ball.z<0.05){ stopBall(); r.bs=r.fetch?'fetch':'wait'; r.bw=0; }
      return; }
    if(r.bs==='fetch'){ const t=T[r.team]; if(!r.fp||!r.fp.on){ let b=null,bd=1e9; for(const q of t.on){ const d=hyp(q.x-ball.x,q.y-ball.y)+(q.role==='GK'&&Math.abs(ball.x-52.5)<40?30:0); if(d<bd){bd=d;b=q;} } r.fp=b; }
      r.fw=(r.fw||0)+1;
      if(r.fp && hyp(r.fp.x-ball.x,r.fp.y-ball.y)<0.9){ r.bs='hold'; r.bw=3; } else if(r.fw>50) toss(r);   /* dopo 25 s un raccattapalle rimanda un pallone */
      return; }
    if(r.bs==='hold'){ const p=r.fp; ball.x=p.x+Math.cos(p.o)*0.3; ball.y=p.y+Math.sin(p.o)*0.3; ball.z=0.9; if(--r.bw<=0) toss(r); return; }
    if(r.bs==='wait'){ if(++r.bw>=3) toss(r); return; }
    if(r.bs==='ready' && r.type==='thr'){ const tk=r.taker; if(tk && tk.on && hyp(tk.x-r.x,tk.y-r.y)<1.2){ ball.x=tk.x; ball.y=tk.y; ball.z=1.9; } }
  }
  /* si riprende quando la palla è sul punto, chi batte è lì e gli avversari sono a distanza (dopo 45 s si riprende comunque) */
  function rsReady(r){
    if(r.bs!=='ready') return false;
    r.wt=(r.wt||0)+1; const late=r.wt>90, t=T[r.team];
    let tk=r.taker&&r.taker.on?r.taker:null;
    if(!tk || (r.wt%12===0 && r.type!=='pen' && r.type!=='gk')){ let b=tk, bd=tk?hyp(tk.x-r.x,tk.y-r.y)-2:1e9; for(const q of t.on){ if(r.type==='gk'?q.role!=='GK':q.role==='GK') continue; const d=hyp(q.x-r.x,q.y-r.y); if(d<bd){bd=d;b=q;} } if(b) r.taker=tk=b; }
    if(!tk) return late;
    const dk=hyp(tk.x-r.x,tk.y-r.y), need=r.type==='pen'?2.2:r.type==='kick'?2.8:1.0;
    if(late) return dk<6 || r.wt>240;
    /* v0.4.6.0 (R4, n. 1): prima chi batte arriva al punto della rincorsa (r.bx, r.by); quando tutto è pronto parte verso la palla */
    const run=(r.type==='cor'||r.type==='fk'||r.type==='gk') && r.bx!=null && !r.run;
    if(run){ if(hyp(tk.x-r.bx,tk.y-r.by)>1.0) return false; }
    else if(dk>need) return false;
    if(r.type==='kick'){ for(const tt of T) for(const p of tt.on){ if(p!==tk && (p.x-52.5)*tt.dir>0.4) return false; if(tt.idx!==r.team && hyp(p.x-52.5,p.y-34)<8.6) return false; } return true; }
    if(r.type!=='pen' && r.type!=='cel' && r.type!=='gk'){ const nd=r.type==='thr'?2:r.type==='drop'?4:9.15; for(const q of T[1-r.team].on){ if(q.role==='GK') continue; if(hyp(q.x-r.x,q.y-r.y)<nd-0.9) return false; } }
    if(run){ r.run=true; return false; }
    return true;
  }
  function execRestart(){
    const r=M.restart; M.restart=null; const t=T[r.team]; if(r.type==='cor'||r.type==='fk'||r.type==='pen'||r.type==='thr') ball.sp={type:r.type,t:M.tick,team:r.team};
    let tk=r.taker && r.taker.on ? r.taker : t.on.filter(q=>r.type==='gk'?q.role==='GK':q.role!=='GK').sort((a,b)=>hyp(a.x-r.x,a.y-r.y)-hyp(b.x-r.x,b.y-r.y))[0];
    if(!tk) tk=t.on[0];
    if(!tk) return;
    if(SO) SO.e('exec',SX,{r,tk});
    ball.x=r.x; ball.y=r.y; if(r.type!=='thr') ball.z=0; stopBall(); ball.sh=null;
    if(r.type==='cor'||r.type==='pen'||(r.type==='fk'&&(r.direct||r.crossFk))) E('spgo',r.team,[tk.id],'',{kind:r.type==='fk'?(r.direct?'fk':'fkx'):r.type,x:r.x,y:r.y});
    if(r.type==='kick'){ E('ko',r.team,[],''); if(M.half===2 && M.ht2==null){ M.ht2=M.tick; M.regEnd=M.tick+Math.round(45*MIN_T); } }
    if(r.type==='thr'){ ball.z=1.9; throwIn(t,tk,r); return; }
    if(r.type==='pen'){ ball.owner=tk; shoot(tk,'pen'); return; }
    if(r.type==='cor'){
      const sch=t.scheme, h=r.helper&&r.helper.on?r.helper:null;
      if(sch==='corto' && h && D2(h,tk)<14){ ball.owner=tk; const X=h.x, Y=h.y; t.st.pa++; tk.s.pa++; fly('pass',tk,X,Y,15,0.1,{recv:h,bad:false,offside:false}); return; }
      if(sch==='limite' && h && D2(h,tk)<26){ ball.owner=tk; t.st.pa++; tk.s.pa++; fly('pass',tk,h.x,h.y,16,0.3,{recv:h,bad:R()>0.7+tk.a0.cpz/60,offside:false,volley:true}); return; }
      const box=t.on.filter(m=>rx(t,m.x)>86); if(box.length){ ball.owner=tk; const pts=cornerPts(t,r); const tgt= sch==='primo'?pts.near: sch==='secondo'?pts.far : pts.spot; cross(tk,box,[rx(t,tgt[0]),ry(t,tgt[1])]); } else giveBall(tk,0.5); return; }
    if(r.type==='fk' && r.crossFk){ const box=t.on.filter(m=>rx(t,m.x)>86); if(box.length){ ball.owner=tk; cross(tk,box,[rx(t,94),ry(t,34)]); } else giveBall(tk,0.5); return; }
    if(r.type==='fk' && r.direct){ ball.owner=tk; ball.fkWall={n:r.wall, ids:r.wallIds}; shoot(tk,'fk'); return; }
    giveBall(tk, r.type==='kick'?0.3:0.6);
  }
  return {canErr, startKick, offLineFor, offsideCall, pause, refError, protest, moveRefs, foul, injure, sendOff, forcedOut, keepDistance, restartBall, rsReady, execRestart};
}
