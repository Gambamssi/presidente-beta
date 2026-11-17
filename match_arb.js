/* match_arb.js — v0.4.2.2 (T1): arbitro, assistenti, riprese, falli, cartellini, infortuni, fuorigioco, errori arbitrali (base per R5).
   Funzioni spostate da simMatch (match.js) senza cambiarne il corpo: matchArb(M) è chiamata da simMatch all'inizio della partita
   e restituisce le funzioni, che restano chiusure come prima. M è il contesto condiviso: le variabili riassegnate durante la partita
   si leggono e scrivono come M.x (tick, half, regEnd, restart, ht2, errLeft, bsN); gli altri valori di simMatch e le funzioni degli altri moduli
   arrivano nelle variabili qui sotto con M.link (stessi oggetti, nessuna copia). Script classico: nessun import/export. */
function matchArb(M){
  let R, P, RC, RA, RP, RB, minNum, SO, SX, T, all, rx, ry, tm, op, ball, RF, cardF, ref, refErrs, errPlan, MIN_T, E, fill2, recSub, kickoffPos, specOf, gkOf, cornerPts, subW, startSub, benchX, reshape10, bestSub, D2, stopBall, giveBall, loose, fly, moveTo, collide, toss, cross, shoot, throwIn, decide;
  M.link.push(()=>{ ({R, P, RC, RA, RP, RB, minNum, SO, SX, T, all, rx, ry, tm, op, ball, RF, cardF, ref, refErrs, errPlan, MIN_T, E, fill2, recSub}=M); ({kickoffPos, specOf, gkOf, cornerPts, subW, startSub, benchX, reshape10, bestSub}=M.mAll); ({D2, stopBall, giveBall, loose, fly, moveTo, collide, toss}=M.mFis); ({cross, shoot, throwIn, decide}=M.mGio); });
  /* v0.4.2.0: solo il primo calcio d'inizio mette i giocatori al loro posto; nel secondo tempo ci vanno camminando e la palla
     la porta a centrocampo un giocatore (bs: 'fetch' → 'toss' → 'ready'), il gioco aspetta che siano tutti in posizione */
  function startKick(ti, tele){ kickoffPos(T[0],ti===0,tele); kickoffPos(T[1],ti===1,tele); ball.owner=null; ball.fl=null; ball.sh=null;
    if(tele){ ball.x=52.5; ball.y=34; ball.z=0; stopBall(); M.restart={type:'kick',team:ti,x:52.5,y:34,ticks:4,bs:'ready'}; }
    else { stopBall(); M.restart={type:'kick',team:ti,x:52.5,y:34,ticks:24,bs:'roll',fetch:true}; } }
  /* T2 (n. 49): secondo valore più grande (sec2Max) o più piccolo (sec2Min) senza ordinare: lo stesso numero di sort(...)[1], undefined con meno di due */
  function sec2Max(on,t){ let m1=-Infinity, m2=-Infinity; for(let i=0;i<on.length;i++){ const v=t?rx(t,on[i].x):on[i].x; if(v>m1){ m2=m1; m1=v; } else if(v>m2) m2=v; } return on.length>1?m2:undefined; }
  function sec2Min(on){ let m1=Infinity, m2=Infinity; for(let i=0;i<on.length;i++){ const v=on[i].x; if(v<m1){ m2=m1; m1=v; } else if(v<m2) m2=v; } return on.length>1?m2:undefined; }
  function offLineFor(t){ const o=T[1-t.idx]; return Math.max(52.5, sec2Max(o.on,t)||52.5, rx(t,ball.x)); }
  /* R5 (0.4.7.0, punto 3): fuorigioco. Posizione geometrica al momento del passaggio (regola 11): nella metà avversaria e più vicino alla
     linea di porta sia della palla sia del penultimo avversario. Nessun fuorigioco da rimessa laterale, rimessa dal fondo, calcio d'angolo.
     L'assistente non conosce le posizioni vere: vede i giocatori dal suo punto sulla linea laterale e giudica dagli angoli con cui li vede
     (proiezione ottica, Oudejans et al., Nature 2000, risposta 016): se è allineato con il penultimo giudica giusto; se è fuori linea
     (perché l'azione è stata più veloce di lui) l'attaccante e il difendente a distanze diverse dalla linea laterale gli appaiono spostati.
     Nessuna probabilità: l'errore nasce solo dalla posizione dell'assistente. Il fischio arriva quando l'attaccante partecipa (arrive). */
  function offsideCall(t,m,p){
    if(p && p.gkKick) return false;
    if(ball.sp && (ball.sp.type==='thr'||ball.sp.type==='cor') && M.tick-ball.sp.t<1) return false;
    const xr=rx(t,m.x); if(xr<=52.5) return false;
    const o=T[1-t.idx], ds=o.on.slice().sort((a,b)=>rx(t,b.x)-rx(t,a.x)), L=ds[1]||null, lx=L?rx(t,L.x):0, bxr=rx(t,ball.x);
    const line=Math.max(52.5, lx, bxr), real=xr>line;
    /* riferimento della linea: il penultimo, la palla o la linea di metà campo (segnata a terra: si vede alla stessa distanza dell'attaccante) */
    const rp = line===lx&&L ? {x:L.x,y:L.y} : line===bxr ? {x:ball.x,y:ball.y} : {x:rx(t,52.5),y:m.y};
    const a=t.dir>0?ref.a2:ref.a1, ax=rx(t,a.x);
    /* margine visto = margine vero + e·(dA − dL)/(dA + dL): e = di quanto l'assistente è avanti (+) o indietro (−) rispetto alla linea, dL e dA =
       distanze dalla linea laterale del riferimento e dell'attaccante (errore di parallasse: chi è più lontano dall'assistente gli appare spostato
       dalla parte in cui lui è fuori linea). Se è allineato (e = 0) vede giusto; l'errore non supera mai il suo fuori linea */
    const e=ax-line, dL=Math.max(0.5,Math.abs(rp.y-a.y)), dA=Math.max(0.5,Math.abs(m.y-a.y)), seen=(xr-line)+e*(dA-dL)/(dA+dL);
    const call=seen>0;
    if(SO) SO.e('r5',SX,{k:'off', real, call, mg:xr-line, mis:Math.abs(ax-line)});
    if(call!==real && xr>70){
      if(call) refError('offSi',t.idx,[m.id],`Sul lancio per ${m.ln} l'assistente è pronto con la bandierina.`,`Il replay mostra ${m.ln} in posizione regolare. È un errore arbitrale: il fuorigioco non c'era.`);
      else refError('offNo',1-t.idx,[m.id],`${m.ln} scatta sul filo del fuorigioco: l'assistente lascia correre.`,`Le immagini mostrano ${m.ln} oltre il penultimo difendente. È un errore arbitrale: l'assistente doveva alzare la bandierina.`); }
    return call; }
  /* ripresa del gioco (v0.4.2.0): la palla non si teletrasporta. bs = stato della palla nella ripresa:
     'roll' = continua con la sua fisica (anche fuori dal campo); 'wait' = ferma, un raccattapalle sta per rimandarla;
     'fetch'/'hold' = un giocatore va a prenderla (dopo un gol, a inizio secondo tempo); 'toss' = in volo verso il punto della ripresa;
     'ready' = sul punto della ripresa (per la rimessa laterale: in mano a chi la batte) */
  function pause(type, team, x, y, ticks, extra){
    const prev=M.restart, owned=!!ball.owner; ball.nd=null; ball.kt=null; if(owned) stopBall(); if(ball.owner) ball.owner.hold=false; ball.owner=null; ball.fl=null;
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
  function refError(kind, victimSide, ids, txt, cm){ refErrs.push(kind); E('referr',victimSide,ids,txt,{kind,cm}); protest(T[victimSide], 1); }
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
  /* R5 (0.4.7.0, punto 2): arbitro e assistenti si muovono come corpi umani, con fisCorpo (stessa fisica dei giocatori) e i valori di REF_B
     (match.js): velocità massima, accelerazione, frenata; la stanchezza abbassa l'accelerazione come per i giocatori. Vanno verso il punto
     che serve per vedere: velocità desiderata = distanza da colmare / tempo di avvicinamento (tau), con una zona morta in cui stanno fermi
     o camminano. L'assistente guarda il campo e corre di lato (fisCorpo: ~55% della velocità); per spostamenti lunghi si gira e corre. */
  function refStep(o, tx, ty, tau, dead, sCap, face){
    const dx=tx-o.x, dy=ty-o.y, d=hyp(dx,dy), sDes=d<=dead?0:Math.min(sCap, REF_B.vmax, (d-dead)/tau);
    const fc = sDes>REF_B.side ? Math.atan2(dy,dx) : face;
    fisCorpo(o, dx, dy, sDes, fc, REF_B.vmax, REF_B.amax*(1-0.9*(1-o.st/100)), REF_B.dmax, DT);
    const sp=hyp(o.vx,o.vy), r=sp/7; o.st-=1.9*(0.006+0.03*r*r)*REF_B.res*0.35/TIME_F*STF*(M.half===1?0.82:1.22); if(o.st<15) o.st=15;
    o.x=o.nx; o.y=o.ny; }
  function moveRefs(){
    const r=M.restart, bx=ball.x, by=ball.y, yd=x=>58-(x-16)*(48/73);
    let tx, ty, tau=1.6, dead=2.0, cap=REF_B.vmax;
    const cardP = r&&r.card&&!r.card.shown ? all.get(r.card.pid) : null;
    if(cardP){ const s=cardP.x<ref.x?1:-1; tx=cardP.x+s*1.4; ty=cardP.y+0.6; tau=1.0; dead=0.3; cap=5.0;
      if(hyp(ref.x-cardP.x,ref.y-cardP.y)<2.4){ r.card.shown=true; ref.cardK=r.card.k; ref.cardT=M.tick; } }
    else if(r&&r.coach&&!r.coach.shown){ tx=benchX(r.coach.side); ty=1.6; tau=1.0; dead=0.3; cap=5.0; if(hyp(ref.x-tx,ref.y-ty)<2.2){ r.coach.shown=true; ref.cardK=r.coach.k||4; ref.cardT=M.tick; } }
    else if(r&&(r.type==='cel'||r.type==='kick')){ tx=52.5+(r.type==='cel'?0:-3); ty=yd(52.5)+4; tau=3.0; cap=2.5; }
    else if(r&&r.type==='pen'){ const gx=r.x>52.5?PL:0; tx=gx+(gx?-14:14); ty=gx?34-14:34+14; tau=2.0; }
    else { const pt=ball.owner?tm(ball.owner):ball.fl?T[ball.fl.t]:null, dir=pt?pt.dir:0;
      tx=clamp(bx-dir*7,14,91); const yl=yd(tx); ty=yl+(by-yl)*0.3;
      let dx=tx-bx, dy=ty-by, d=hyp(dx,dy); if(d<9){ if(d<0.01){dx=0;dy=1;d=1;} tx=bx+dx/d*9; ty=by+dy/d*9; }
      /* vista già buona (palla tra 8 e 25 m, dentro la fascia 5–30 m della 016): l'arbitro corsetta verso il punto, senza scatti; fuori fascia corre */
      { const db=hyp(ref.x-bx,ref.y-by); if(db>=8 && db<=25){ tau=2.5; dead=4.0; cap=3.0; } else { tau=1.2; dead=1.0; } }
      if(r){ tau=2.5; cap=3.0; } }
    if(M.tick-ref.cardT>=8) refStep(ref,clamp(tx,-1,PL+1),clamp(ty,1,PW-1),tau,dead,cap,Math.atan2(by-ref.y,bx-ref.x));
    else refStep(ref,ref.x,ref.y,1,9,0,ref.o);   /* mentre mostra il cartellino si ferma (frenata umana) */
    /* assistenti: in linea con il penultimo difendente, o con il pallone se è più vicino alla porta */
    const dR=T[0].dir>0?T[1]:T[0], dL=T[0].dir>0?T[0]:T[1];
    const xsR1=sec2Max(dR.on), xsL1=sec2Min(dL.on);   /* T2: prima xsR/xsL ordinati e il secondo elemento */
    /* ogni assistente copre la metà campo alla sua sinistra: il primo (lato panchine) quella di sinistra, il secondo quella di destra */
    let a1x=clamp(Math.min(xsL1??52.5, bx),0,52.5), a2x=clamp(Math.max(xsR1??52.5, bx),52.5,PL);
    /* R5: l'assistente resta sulla linea anche durante i cambi (li controlla il quarto uomo a metà campo) */
    refStep(ref.a1,a1x,-1,0.5,0.05,REF_B.vmax,Math.PI/2); refStep(ref.a2,a2x,PW+1,0.5,0.05,REF_B.vmax,-Math.PI/2);
    /* chi esce dal campo cammina verso la panchina */
    for(const t of T){ for(const p of t.bench) if(p.walkIn){ const W=subW(t,p.wk||0); moveTo(p,W[0],W[1],1.7); } }
    const lvN=[0,0];   /* 0.4.7.10 (n. 99): chi esce ha un posto suo lungo la linea (1,2 m dal compagno che esce insieme) e cammina più fuori di chi aspetta di entrare (y −2,3 contro −1,3) */
    for(const p of all.values()) if(p.leave>0){ p.leave--; if(p.lw>0){ p.lw--; continue; } const lx=52.5+(p.t===0?-6-1.2*lvN[p.t]:6+1.2*lvN[p.t]); lvN[p.t]++; moveTo(p,lx,-2.3,1.3); if(hyp(p.x-lx,p.y+2.3)<0.5) p.leave=0; }
  }
  /* R5 (0.4.7.0, punto 4): chi vede il contatto. Arbitro e assistente della metà campo (sul suo lato, entro 25 m: regola 6) guardano il punto del
     contatto e sbagliano il giudizio secondo la distanza, con i valori reali di Mallo et al. 2012 (Confederations Cup 2009, 380 falli: errori ~11–12% sotto
     gli 11 m, ~7% a 11–15 m, ~20–22% oltre i 20 m; oltre i 25 m la crescita fino al 50% a 55 m è una nostra estensione, da verificare).
     real = il contatto è un fallo (risponde «giudizio giusto»: fischia un fallo vero, lascia correre un contrasto pulito). */
  function refErrD(d){ return d<11?0.115 : d<15?0.115-(d-11)*0.01125 : d<20?0.07+(d-15)*0.028 : d<25?0.21 : Math.min(0.5,0.21+(d-25)*0.0097); }
  /* R5b (Dani, 13/11): i due errori separati (Hossner et al. 2019, Mondiali 2014, risposta 032 D9): fallo non visto più probabile da vicino
     (odds ratio 5,51 a 0–5 m), fischio sbagliato su un contrasto pulito più probabile a 10–15 m (odds ratio 2,58); oltre 25 m l'errore cresce come
     prima (refErrD, nostra estensione). Livelli REF_E (match.js) */
  const odds=p=>p/(1-p), prob=o=>o/(1+o), farOR=d=>d>25?odds(refErrD(d))/odds(0.21):1;
  function refErrMiss(d){ return prob(odds(REF_E.qM)*(d<5?REF_E.orM:1)*farOR(d)); }
  function refErrFalse(d){ return prob(odds(REF_E.qF)*(d>=10&&d<15?REF_E.orF:1)*farOR(d)); }
  function refSees(f, v, vc, real){
    /* R5 (decisione di Dani, 13/11): la vista coperta non si conta a parte: l'errore per distanza di Mallo et al. 2012 la comprende già.
       Giudica l'ufficiale più vicino tra l'arbitro e l'assistente della metà campo (se entro 25 m) */
    const cx=(f.x+v.x)/2, cy=(f.y+v.y)/2, a=cx<52.5?ref.a1:ref.a2, dr=hyp(cx-ref.x,cy-ref.y), da=(Math.abs(cy-a.y)<25 && Math.abs(cx-a.x)<25)?hyp(cx-a.x,cy-a.y):1e9;
    const best=da<dr?a:ref, bd=Math.min(dr,da), right=RA()>=(real?refErrMiss(bd):refErrFalse(bd));
    if(SO) SO.e('r5',SX,{k:real?'foul':'clean', seen:real?right:!right, d:bd, blk:false, who:best===ref?'arbitro':'assistente', f, v, vc});
    return right; }
  const inBoxOf=(o,p)=>{ const x=rx(o,p.x), y=ry(o,p.y); return x>88.5 && Math.abs(y-34)<20.2; };
  /* R5b (n. 61): occasione tolta dal fallo f sulla vittima v (occTolta, match.js) e decisione dell'arbitro con la sua asticella RF.am (refCall).
     Nessun numero casuale: a contatto uguale la decisione è la stessa dal primo all'ultimo minuto, con qualunque punteggio e cartellino */
  function occOf(f, v){ const o=tm(v), gx=o.dir>0?PL:0, defs=[]; for(const q of tm(f).on) if(q!==f && q.role!=='GK') defs.push(q);
    return occTolta(v.x,v.y,v.vx,v.vy,v.o,gx,defs,ball.owner===v?1:0); }
  /* R5b (Dani): soglia di Equilibrio della vittima (R4b): sotto resta in piedi con la palla, sopra cade o la perde */
  const eqOf=v=>0.8+(v.gs.EQ-1)/19*1.2;
  /* tipo di contatto per «palla o uomo» (refCall): win = il difendente arriva prima sulla palla (duello vinto) */
  const refFalls=(v,vc)=>vc>=eqOf(v);
  /* CA1: direzione dell'intervento (CA1_K, match.js): dove sta chi entra (f) rispetto a dove va la vittima (v), o dove guarda se va piano */
  function dirOf(f, v){ const ex=f.x-v.x, ey=f.y-v.y, d=Math.max(0.05,hyp(ex,ey)), sp=hyp(v.vx||0,v.vy||0);
    const ux=sp>0.5?v.vx/sp:Math.cos(v.o||0), uy=sp>0.5?v.vy/sp:Math.sin(v.o||0), c=(ex*ux+ey*uy)/d;
    return c>=CA1_K.fronte?'fronte':c<=-CA1_K.fronte?'dietro':'lato'; }
  /* CA1 (Dani, punto 1): palla presa prima → 'pericoloso' solo per una scivolata di lato o da dietro che manda a terra (condotta); altrimenti 'palla' */
  function refCat(f, v, vc, win){ if(win) return condotta({palla:true, sciv:hyp(f.x-v.x,f.y-v.y)>CA1_K.sciv, dir:dirOf(f,v), terra:refTerra(RF.am,vc,eqOf(v))})?'pericoloso':'palla'; return vc>=eqOf(v)?'cade':'leggero'; }
  function refJudge(f, v, vc, real, seen, cat, xf){ const inBox=inBoxOf(tm(v),v), O=inBox?occOf(f,v):0, cd=cardFor(f,v,vc,false,inBox,true,xf,cat), cw=cd?cd.why:null, call=refCall(RF.am,vc,O,inBox,cat,cw);
    if(SO) SO.e('r5b',SX,{k:'call', am:RF.am, g:vc, O, inBox, call, real, seen, cat:cat||'leggero', cw, f, v, tipo:xf?xf.k:'contrasto', eq:eqOf(v)}); return call; }
  /* fallo non visto (o visto ma sotto l'asticella dell'arbitro): il contatto c'è stato (la vittima barcolla), il gioco continua con la palla che schizza via */
  /* R5c (0.4.7.2): x = {k: tipo del fallo ('tattico', 'trattenuta', 'aereo', 'ritardo'), cade: la vittima è a terra o fermata qualunque sia vc}.
     Senza x è il fallo di sempre: chi contrasta il portatore */
  function unseenFoul(f, v, vc, seen, cat, xf){
    /* R5b: non visto, è un errore («rigore non dato») solo se l'arbitro, vedendolo, l'avrebbe dato con la sua asticella; visto e lasciato correre non è un errore */
    const err=!seen && refJudge(f,v,vc,true,false,cat,xf)==='rigore';
    /* R5b: conseguenza fisica del contatto non fischiato, la stessa del vantaggio: se la vittima regge l'urto (sotto la sua soglia di Equilibrio, R4b)
       resta in piedi con la palla; altrimenti barcolla e la palla schizza via (prima la perdeva sempre: con l'asticella un arbitro permissivo
       avrebbe premiato il fallo) */
    if(SO && xf) SO.e('r5c',SX,{k:'libero', tipo:xf.k, seen, f, v, g:vc});
    if(xf && xf.fis===false){}   /* R5c: l'urto è già nel movimento (spinta da dietro): niente effetti in più */
    else if(xf && ball.owner!==v){ v.stun=Math.max(v.stun||0,xf.cade?0.8:0.3); }   /* R5c: vittima senza palla (trattenuta, salto, dopo il passaggio): l'urto resta sul corpo */
    else if(vc<eqOf(v) && ball.owner===v && !(xf&&xf.cade)){ v.stun=Math.max(v.stun||0,0.3); f.stun=Math.max(f.stun||0,0.8); if(SO) SO.e('r5b',SX,{k:'regge'}); }
    else { loose(ball.x,ball.y,(RP()-0.5)*3,(RP()-0.5)*3); ball.lastT=f.t; ball.lastP=f; v.stun=Math.max(v.stun||0,0.8); }
    if(err) refError('rigNo',v.t,[f.id,v.id],`${v.ln} va giù in area dopo il contatto con ${f.ln}: per l'arbitro si può continuare.`,`Il replay non lascia dubbi: ${f.ln} stende ${v.ln} in area. È un errore arbitrale: era rigore.`); }
  /* R5 (punto 5): cartellino dalla regola 12, non da una probabilità. CA1 (0.4.7.3, n. 53): la condotta (condotta, match.js) al posto delle soglie di
     velocità; cat = tipo di contatto di refCat (palla presa prima: 'palla' o 'pericoloso').
     Chiara occasione da gol negata (DOGSO: palla controllata, verso la porta, entro 30 m, nessun difendente di movimento tra la vittima e la porta):
     rosso; in area giallo se ha cercato la palla (contrasto, salto), rosso per trattenuta, spinta, fallo tattico, in ritardo (IFAB regola 12; Dani,
     punto 6); azione promettente interrotta (SPA: nella metà avversaria, verso la porta, al più due difendenti di movimento davanti, oppure
     contropiede): giallo, ma non in area e non se c'è il vantaggio; falli ripetuti (il terzo fallo dello stesso giocatore): giallo. Il secondo giallo
     è un rosso. Il cartellino porta con sé l'urto oltre la soglia di Equilibrio (e): è quello che i giocatori vedono (applyCard, Dani punto 3) */
  const SENZA=new Set(['ritardo','spinta','trattenuta']);
  const SALTO=new Set(['aereo','braccia']);   /* Dani (14/11, B): nei salti il fallo si fischia, ma senza cartellino per la condotta (restano occasione negata e falli ripetuti) */
  function cardFor(f, v, vc, adv, inBox, dry, xf, cat){   /* R5b: dry = solo per sapere che cartellino merita (refJudge): non segna i falli ripetuti */
    const t=tm(f), o=tm(v), xr=rx(o,v.x), yr=ry(o,v.y), dg=hyp(105-xr,34-yr), tipo=xf?xf.k:'contrasto';
    const ahead=t.on.filter(q=>q!==f && q.role!=='GK' && rx(o,q.x)>xr && Math.abs(ry(o,q.y)-yr)<22).length;
    const toGoal=(v.vx||0)*o.dir>0.5 || (v.vx||0)*o.dir>-0.5 && dg<20;
    const eq=eqOf(v), cx={palla:cat==='palla'||cat==='pericoloso', senza:SENZA.has(tipo), sciv:tipo==='contrasto' && hyp(f.x-v.x,f.y-v.y)>CA1_K.sciv, dir:dirOf(f,v), terra:refTerra(RF.am,vc,eq)};
    const cond=tipo==='tattico'||SALTO.has(tipo)?null:condotta(cx), e=vc-eq;   /* il fallo tattico ha il suo motivo (sempre giallo, sotto) */
    let why=null, c=null;
    /* R5c (Dani, 13/11): spinta da dietro: nessun giallo salvo gioco pericoloso (giallo dopo l'azione); niente occasione, imprudenza, azione, ripetuti */
    if(tipo==='spinta'){ if(cond==='pericoloso'){ why='pericoloso'; c=f.yc?'y2':'yc'; } }
    else if(cond==='vigoria'){ why='vigoria'; c='rc'; }
    else if(!adv && !cx.palla && dg<30 && toGoal && ahead===0 && ball.owner===v){ why='occasione'; c=inBox && !cx.senza && tipo!=='tattico' ? 'yc' : 'rc'; }   /* Dani (punto 1): palla presa prima, mai rosso */
    else if(cond){ why=cond; c='yc'; }
    /* R5c (Dani, 13/11): azione promettente interrotta solo se la vittima aveva la palla */
    else if(!adv && !inBox && xr>52.5 && toGoal && (ahead<=2 || M.tick<o.counterUntil) && ball.owner===v){ why='azione'; c='yc'; }
    /* R5c (indicazione di Dani, ex arbitro): il fallo tattico (fermare un contropiede con la difesa scoperta) è sempre ammonito, anche dopo il vantaggio
       (comportamento antisportivo, regola 12); il rosso per vigoria o occasione da gol negata resta */
    else if(tipo==='tattico'){ why='tattico'; c='yc'; }
    else if((f.nf||0)>=3 && !f.pi){ why='ripetuti'; c='yc'; if(!dry) f.pi=1; }
    if(c==='yc' && f.yc) c='y2';
    if(SO && !dry) SO.e('ca1',SX,{k:'cond', f, v, vc, am:RF.am, eq, e, cx, cond, why, c, tipo, cat:cat||null, inBox, adv});
    return c?{c,why,e}:null; }
  /* CA1 (Dani, punto 3): un cartellino per la condotta lo vedono tutti i giocatori in campo; ognuno capisce da quanto era forte quell'urto (e, oltre la
     soglia di Equilibrio della vittima) fin dove arriva l'arbitro: la sua asticella è al più e. Lo legge con un errore che cala con Decisioni (DM) e
     Lettura del gioco (LG), come le altre stime del motore (tackleOk, tacticalFoul: ±30% × (1 − attributi/40)); tiene la stima più bassa (amE).
     Mai il valore nascosto dell'arbitro */
  const CONDOTTA=new Set(['imprudenza','vigoria','pericoloso']);
  function seeCard(cd){ if(!CONDOTTA.has(cd.why) || cd.e==null) return;
    for(const t of T) for(const p of t.on){ const lg=(p.te&&p.te.LG!=null?p.te.LG:SK_TQM.LG)/5, rd=clamp((p.a.dec+lg)/40,0,1);
      const ob=Math.max(0,cd.e)*(1+(R()-0.5)*0.6*(1-rd)); if(p.amE==null || ob<p.amE) p.amE=ob;
      if(SO) SO.e('ca1',SX,{k:'stima', p, e:cd.e, ob, amE:p.amE, rd}); } }
  function applyCard(f, v, cd){
    /* R5b (Dani: i provvedimenti si danno sempre): anche a chi nel frattempo è uscito (sostituito o infortunato; regola 12: il sostituito si può ammonire
       ed espellere); non a chi è già stato espulso. In campo non serve fermarsi a mostrarlo */
    const t=tm(f), c=cd.c, off=!f.on; if(off && f.s.red) return;
    const tx= c==='yc' ? (cd.why==='azione'||cd.why==='tattico'?MTX.ycT:cd.why==='ripetuti'?MTX.ycR:MTX.yc) : c==='y2' ? MTX.y2 : cd.why==='vigoria' ? MTX.rcV : MTX.rc;
    seeCard(cd);
    if(c==='yc'){ f.yc=1; t.st.yc++; E('yc',f.t,[f.id,v.id],fill2(P(tx),{p:f,v}),{why:cd.why}); }
    else { t.st.rc++; if(c==='y2') t.st.yc++; f.s.red=1; E('rc',f.t,[f.id,v.id],fill2(P(tx),{p:f,v}),{why:cd.why,y2:c==='y2'?1:0}); if(!off) sendOff(f); }
    if(M.restart && !off){ M.restart.card={pid:f.id,k:c==='yc'?1:c==='y2'?3:2,shown:false}; M.restart.ticks=Math.max(M.restart.ticks,16); if(c!=='yc'){ f.leave=44; f.lw=10; } }
    { const w=c!=='yc'?0.6:0.12; protest(t,w); } }
  /* ripresa del fallo: rigore o punizione nel punto del fallo (x, y) */
  function foulRestart(f, v, x, y, inBox){
    const o=tm(v);
    if(inBox){ E('pen',v.t,[v.id,f.id],fill2(P(MTX.pen),{p:f,v})); const tk=specOf(o,'pen',q=>q.a0.cpz*0.6+q.a0.fre*0.4); pause('pen',o.idx,o.dir>0?PL-11:11,34,60+Math.floor(RA()*20),{taker:tk}); protest(tm(f),0.5); return; }
    const vxr=rx(o,x), vyr=ry(o,y), dgx=105-vxr, dist=hyp(dgx,vyr-34), ang=Math.abs(vyr-34)/Math.max(1,dgx);
    if(dist<=28 && ang<1.0 && R()<(dist<22?0.5:0.3)){ const tk=specOf(o,'fk',q=>q.a0.cpz*0.7+q.a0.lun*0.3); pause('fk',o.idx,x,y,50+Math.floor(RA()*20),{taker:tk,direct:true,wall:dist<19?5:dist<24?4:3}); E('fkset',o.idx,[tk.id],`Punizione dal limite per ${o.inp.n}: sul pallone ${tk.ln}.`); }
    else if(dgx<=40 && dgx>=14){ const tk=specOf(o,'cor',q=>q.a0.cpz*0.5+q.a0.crs*0.5); pause('fk',o.idx,x,y,40+Math.floor(RA()*16),{taker:tk,crossFk:true}); E('fkx',o.idx,[tk.id],`Punizione dalla trequarti per ${o.inp.n}: la batte ${tk.ln}.`); }
    else pause('fk',o.idx,x,y,14+Math.floor(RA()*12),{taker:v.on?v:null}); }
  /* fallo visto (o contatto pulito visto come fallo: falso). Vantaggio (regola 12, punto 4): se la vittima resta in piedi con la palla
     (l'urto non supera la sua soglia di Equilibrio, la stessa di R4b) fuori dall'area (R5b: in tutto il campo e anche con la palla a un compagno, vedi sotto), l'arbitro lascia correre;
     se entro REF_K.adv secondi la squadra perde la palla torna al fallo (advTick); il cartellino si dà alla prima interruzione. */
  function foul(f, v, vc, falso, cat, xf){
    const t=tm(f), o=tm(v); vc=vc||0;
    /* R5b (n. 61): l'arbitro fischia solo se il contatto supera la sua asticella; in area solo se vale il rigore (refCall). Restituisce false se si gioca */
    if(refJudge(f,v,vc,!falso,true,cat,xf)==='gioco') return false;
    /* R5b: un nuovo fallo fischiato con un vantaggio ancora aperto lo chiude (la squadra aveva la palla): il cartellino dovuto resta, alla prima interruzione */
    if(M.adv){ const a=M.adv; M.adv=null; if(SO) SO.e('r5',SX,{k:'advok'}); if(a.cd) M.pendCard.push({f:a.f,v:a.v,cd:a.cd}); }
    t.st.fou++; f.nf=(f.nf||0)+1; if(SO) SO.e('foul',SX,{f,v,falso:!!falso,tipo:xf?xf.k:'contrasto',g:vc});
    const inBox=inBoxOf(o,v), x=v.x, y=v.y;
    if(falso && inBox) refError('rigSi',f.t,[f.id,v.id],`Contatto in area tra ${f.ln} e ${v.ln}: l'arbitro indica il dischetto!`,`Dal replay si vede che ${f.ln} prende il pallone in modo pulito. È un errore arbitrale: il rigore non c'era.`);
    /* R5b (Dani, 13/11): vantaggio anche quando la vittima cade e la palla resta alla sua squadra. L'arbitro guarda chi arriva prima sulla palla:
       margine = distanza dell'avversario più vicino (tranne chi ha fatto il fallo) − distanza del compagno più vicino (la vittima stessa, 0 m, se resta in
       piedi con la palla); lo dà se il margine arriva a quello che pretende, che cresce con i falli già fischiati nella partita (advOk, match.js:
       partita fallosa → tiene il controllo). Non è l'asticella dei falli, che resta fissa */
    const stands = vc<eqOf(v) && !falso && !(xf&&xf.cade), nPrev=T[0].st.fou+T[1].st.fou-1;
    let adv=false, marg=null;
    /* R5b (Dani, 13/11): in tutto il campo, anche nella propria metà (si privilegia sempre il gioco); prima solo nella metà avversaria */
    if(!falso && !inBox && ball.owner===v){ let dT=stands?0:1e9, dO=1e9;
      if(!stands) for(const q of o.on){ if(q!==v && !q.dv){ const d=hyp(q.x-ball.x,q.y-ball.y); if(d<dT) dT=d; } }
      for(const q of t.on){ if(q!==f){ const d=hyp(q.x-ball.x,q.y-ball.y); if(d<dO) dO=d; } }
      marg=dO-dT; adv=advOk(marg,nPrev); }
    /* R5c (n. 63): vittima che aveva appena passato (fallo in ritardo): la palla è in volo verso un compagno. Stesso criterio: il punto d'arrivo del
       passaggio; margine = avversario più vicino (tranne chi ha fatto il fallo) − il compagno che la riceve */
    else if(!falso && !inBox && xf && xf.k==='ritardo' && ball.fl && ball.fl.from===v && ball.fl.recv && ball.fl.recv.on){ const fl=ball.fl, r=fl.recv; let dO=1e9;
      for(const q of t.on){ if(q!==f){ const d=hyp(q.x-fl.x1,q.y-fl.y1); if(d<dO) dO=d; } }
      marg=dO-hyp(r.x-fl.x1,r.y-fl.y1); adv=advOk(marg,nPrev); }
    const cd=falso?null:cardFor(f,v,vc,adv,inBox,false,xf,cat);
    if(SO) SO.e('r5',SX,{k:'whistle', adv, inBox, sev:cd?cd.why:'nessuno', vc, f, v, stands, marg, nPrev, mia:rx(o,v.x)<=52.5, tipo:xf?xf.k:'contrasto', cd});
    if(adv){ E('adv',f.t,[f.id,v.id],fill2(P(MTX.adv),{p:f,v}),xf?{k:xf.k}:undefined);   /* evento a parte: il gioco non si ferma (nel visore 'fo' è una pausa) */
      M.adv={f,v,team:o.idx,t0:M.tick,x,y,cd};
      /* la vittima che non regge l'urto cade e la palla schizza via (stessa fisica del contatto non fischiato): la deve prendere un compagno */
      if(!stands && ball.owner===v){ loose(ball.x,ball.y,(RP()-0.5)*3,(RP()-0.5)*3); ball.lastT=f.t; ball.lastP=f; v.stun=Math.max(v.stun||0,0.8); f.stun=Math.max(f.stun||0,0.8); }
      else if(!stands){ v.stun=Math.max(v.stun||0,0.8); f.stun=Math.max(f.stun||0,0.5); }
      return true; }
    E('fo',f.t,[f.id,v.id],'',xf?{k:xf.k}:undefined);
    foulRestart(f,v,x,y,inBox);
    if(cd) applyCard(f,v,cd); return true; }
  /* ogni tick: il vantaggio dato è riuscito (dopo REF_K.adv secondi con la palla, o un gol) oppure si torna al fallo */
  function advTick(){
    if(M.pendCard.length && M.restart && !M.restart.card){ const z=M.pendCard.shift(); applyCard(z.f,z.v,z.cd); }
    const a=M.adv; if(!a) return;
    const el=(M.tick-a.t0)*DT, r=M.restart;
    const lost = (ball.owner && ball.owner.t!==a.team) || (r && r.team!==a.team && r.type!=='cel');
    if(lost && el<=REF_K.adv){ M.adv=null; if(SO) SO.e('r5',SX,{k:'advback'});
      E('fo',a.f.t,[a.f.id,a.v.id],''); E('advb',a.f.t,[a.f.id,a.v.id],fill2(P(MTX.advB),{p:a.f,v:a.v})); foulRestart(a.f,a.v,a.x,a.y,false); if(a.cd) applyCard(a.f,a.v,a.cd); return; }
    /* R5b: passati REF_K.adv secondi il vantaggio c'è se la squadra ha la palla (al piede o appena calciata da lei); altrimenti si torna al fallo */
    const has = (ball.owner && ball.owner.t===a.team) || (!ball.owner && ball.fl && ball.fl.t===a.team);
    if(el>REF_K.adv && !has && !(r && (r.team===a.team || r.type==='cel'))){ M.adv=null; if(SO) SO.e('r5',SX,{k:'advback'});
      E('fo',a.f.t,[a.f.id,a.v.id],''); E('advb',a.f.t,[a.f.id,a.v.id],fill2(P(MTX.advB),{p:a.f,v:a.v})); foulRestart(a.f,a.v,a.x,a.y,false); if(a.cd) applyCard(a.f,a.v,a.cd); return; }
    if(el>REF_K.adv || (r && (r.team===a.team || r.type==='cel'))){ M.adv=null; if(SO) SO.e('r5',SX,{k:'advok'}); if(a.cd) M.pendCard.push({f:a.f,v:a.v,cd:a.cd}); } }
  /* R5b (Dani, 13/11): i provvedimenti si danno sempre, anche dopo un vantaggio arrivato a fine partita: al fischio finale (regola 5: l'arbitro può
     ammonire ed espellere fino a quando lascia il campo) */
  function flushCards(){ if(M.adv){ const a=M.adv; M.adv=null; if(SO) SO.e('r5',SX,{k:'advok'}); if(a.cd) M.pendCard.push({f:a.f,v:a.v,cd:a.cd}); }
    while(M.pendCard.length){ const z=M.pendCard.shift(); applyCard(z.f,z.v,z.cd); } }
  /* I1 (0.4.7.6): infortunio. c = 'senza' (scatti e stanchezza) o 'contatto' (aer: contatto aereo, l'unico da cui nasce la commozione). Tipo dal
     meccanismo e dalle ricadute della sede (p.rs), giorni dalla distribuzione dello studio (i1Pick, i1Dur in match.js); esce sempre dal campo, la
     commozione sospetta anche senza cambi (forcedOut lascia la squadra in 10) */
  function injure(p, c, aer){ if(p.inj||p.out) return; const k=i1Pick(c==='senza'?'nc':'ct', p.rs, !!aer, RP()), d=i1Dur(k, RP(), RP());
    p.inj=true; p.ijk={k, d, c, min:minNum(M.tick)}; p.leave=50; p.lw=12; p.dv=null; if(!M.restart) pause('drop',1-p.t,ball.x,ball.y,80);
    if(SO) SO.e('i1',SX,{k:'inj', p, tipo:k, d, c, aer:!!aer, half:M.half, dE:p.dE, tick:M.tick});
    E('inj',p.t,[p.id],fill2(P(k==='comm'?MTX.injC:MTX.inj),{p}),{k, c}); forcedOut(p,'inj'); }
  /* I1 (D4): un urto cambia la velocità del corpo di dv (m/s). L'Equilibrio ne assorbe fino alla sua soglia (eqOf, la stessa di R4b); l'energia che
     resta, ½·m·(dv − soglia)², è la dose: probabilità d'infortunio 1 − exp(−dose/E0). Vale per ogni contatto, fallo o no (il cartellino non conta).
     Gli infortuni da contatto aspettano la fine del tick (M.injQ), così chi esce non sparisce a metà di un movimento */
  function ctInj(v, dv, aer){ if(!v || !v.on || v.out || v.inj) return; const ex=dv-eqOf(v); if(ex<=0) return;
    const dose=0.5*massOf(v)*ex*ex;
    if(M.cal){ M.cal.ct+=1-Math.exp(-dose/I1.E0); if(aer) M.cal.ctA+=1-Math.exp(-dose/I1.E0); M.cal.doses.push(dose, aer?1:0); return; }
    if(SO) SO.e('i1',SX,{k:'urto', v, dv, eq:eqOf(v), dose, aer:!!aer, tick:M.tick});
    if(RP()<1-Math.exp(-dose/I1.E0)) M.injQ.push(v, aer?1:0); }
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
    /* R5b (PROBLEMI_NOTI n. 56; regole 8, 13, 14, 15, 16, 17): chi batte una ripresa non tocca di nuovo la palla prima che la tocchi un altro
       giocatore. ball.kt = chi batte: finché l'ultimo tocco è suo non può prendere la palla libera (ballTick); la ripresa si calcia subito
       (kickNow: solo passaggio o lancio, come la rimessa dal fondo), senza tenere la palla al piede */
    if(r.type!=='drop') ball.kt=tk;
    if(r.type==='thr'){ ball.z=1.9; throwIn(t,tk,r); return; }
    if(r.type==='pen'){ ball.owner=tk; shoot(tk,'pen'); return; }
    if(r.type==='cor'){
      const sch=t.scheme, h=r.helper&&r.helper.on?r.helper:null;
      if(sch==='corto' && h && D2(h,tk)<14){ ball.owner=tk; const X=h.x, Y=h.y; t.st.pa++; tk.s.pa++; fly('pass',tk,X,Y,15,0.1,{recv:h,bad:false,offside:false}); return; }
      if(sch==='limite' && h && D2(h,tk)<26){ ball.owner=tk; t.st.pa++; tk.s.pa++; fly('pass',tk,h.x,h.y,16,0.3,{recv:h,bad:R()>0.7+tk.a0.cpz/60,offside:false,volley:true}); return; }
      const box=t.on.filter(m=>rx(t,m.x)>86); if(box.length){ ball.owner=tk; const pts=cornerPts(t,r); const tgt= sch==='primo'?pts.near: sch==='secondo'?pts.far : pts.spot; cross(tk,box,[rx(t,tgt[0]),ry(t,tgt[1])]); } else kickNow(tk); return; }
    if(r.type==='fk' && r.crossFk){ const box=t.on.filter(m=>rx(t,m.x)>86); if(box.length){ ball.owner=tk; cross(tk,box,[rx(t,94),ry(t,34)]); } else kickNow(tk); return; }
    if(r.type==='fk' && r.direct){ ball.owner=tk; ball.fkWall={n:r.wall, ids:r.wallIds}; shoot(tk,'fk'); return; }
    /* R4b F2 (PROBLEMI_NOTI n. 37): rimessa dal fondo: la palla è ferma nell'area di porta e il portiere, arrivato con la rincorsa (n. 1), la CALCIA subito:
       passaggio corto a un compagno (anche dentro l'area) o lancio, scelti come in gioco (pressione degli avversari sui compagni, piano di costruzione
       dell'allenatore, gkLong); niente conduzione prima della battuta */
    if(r.type==='gk'){ tk.gkKick=true; kickNow(tk); tk.gkKick=false; return; }
    if(r.type==='drop'){ giveBall(tk,0.6); return; }
    kickNow(tk);   /* R5b: calcio d'inizio e punizione: si calcia subito (prima chi batte teneva la palla e partiva in conduzione: doppio tocco) */
  }
  /* R5b: palla ferma calciata da chi batte: decide solo tra passaggio e lancio (p.pf; p.gkKick in più toglie il fuorigioco della rimessa dal fondo) */
  function kickNow(tk){ ball.owner=tk; ball.fl=null; ball.lastT=tk.t; ball.lastP=tk; tk.hold=false; tk.hx=null; tk.cx=undefined; tk.cy=undefined; tk.pf=true; decide(tk); tk.pf=false; }
  /* ================= R5c (0.4.7.2): falli nei duelli (PROBLEMI_NOTI n. 54, 55, 63; indicazioni di Dani, ex arbitro) =================
     Ogni fallo nuovo nasce da un contatto tra due corpi (distanza tra i centri, velocità, spinta) deciso dalle scelte dei giocatori; l'arbitro lo giudica
     con le regole di R5b senza cambiarle: chi vede (refSees), asticella e regola del rigore (refCall), palla o uomo (sono tutti «uomo»: la palla non
     c'entra), cartellini separati dall'asticella (cardFor), vantaggio e cartellino dopo l'azione (foul, advTick). Costanti R5C in match.js */
  const massOf=p=>72+((p.h||180)-180)*0.9+(p.a0.for-10)*0.8;   /* come l'urto di move() (R4b) */
  const pushOf=p=>R5C.push0+(R5C.push1-R5C.push0)*(clamp(p.a0.for,1,20)-1)/19;
  const remOf=()=>clamp(1-M.tick/(90*MIN_T),0,1);   /* quota della partita che resta */
  const inOwnBox=(p,x,y)=>rx(T[p.t],x)<16.5 && Math.abs(y-34)<20.2;
  /* urto o spinta sul corpo: cambia la velocità, ma non oltre la velocità massima della vittima (il resto lo assorbe barcollando: niente corse oltre
     i limiti umani, PROBLEMI_NOTI n. 39) */
  const push=(v,dx,dy)=>{ v.vx=(v.vx||0)+dx; v.vy=(v.vy||0)+dy; const sp=hyp(v.vx,v.vy), m=v.vmax||8; if(sp>m){ v.vx*=m/sp; v.vy*=m/sp; } };
  /* contatto giudicato dall'arbitro. g = gravità in m/s (velocità di arrivo, o velocità tolta o data da una spinta), x.cade = la vittima va a terra o
     è fermata (se manca: g oltre la sua soglia di Equilibrio, R4b). Restituisce true se il gioco si ferma o c'è il vantaggio */
  function contactFoul(f, v, g, x){ const cat=(x.cade!=null?x.cade:g>=eqOf(v))?'cade':'leggero'; x.cade=cat==='cade';
    if(SO) SO.e('r5c',SX,{k:'contatto', tipo:x.k, f, v, g, d:hyp(f.x-v.x,f.y-v.y), cat, info:x.info||null, bz:ball.z, owner:ball.owner, fl:ball.fl, sp:ball.sp, cnt:x.cnt});
    const seen=refSees(f,v,g,true);
    if(seen && foul(f,v,g,false,cat,x)) return true;
    unseenFoul(f,v,g,seen,cat,x); return false; }
  /* (1) fallo tattico (Dani): contropiede avversario (counterUntil, match.js) con la difesa scoperta. Il giocatore che arriva a portata del portatore
     (reach) sceglie una volta per contropiede se fermarlo con il fallo: confronta quello che il fallo costa (punizione o rigore nel punto, cartellino:
     sempre giallo, con il rischio di un secondo giallo nel tempo che resta) con il pericolo del contropiede che lascia andare (xgAt dal limite
     dell'area, più vicino se nessun difensore è davanti, per la quota di attaccanti senza un difensore tra loro e la porta). Chi è già ammonito non lo
     sceglie (Dani). Decisioni e Freddezza:
     errore della stima (come tackleOk); Aggressività: quanto pesa il cartellino */
  function tacticalFoul(q, o){
    const to=tm(o), tq=tm(q), cu=to.counterUntil??-1;
    if(M.tick>=cu || q.role==='GK' || q.tfC===cu || hyp(q.x-o.x,q.y-o.y)>R5C.reach) return false;
    q.tfC=cu;
    /* Dani (13/11): chi è già ammonito non sceglie il fallo tattico */
    if(q.yc){ if(SO) SO.e('r5c',SX,{k:'tattico', q, o, go:false, yc:true, cu}); return false; }
    const xo=rx(to,o.x), yo=ry(to,o.y); let gs=0, na=1;
    for(const p of tq.on) if(p!==q && p.role!=='GK' && rx(to,p.x)>xo+1) gs++;
    for(const p of to.on) if(p!==o && p.role!=='GK' && rx(to,p.x)>=xo-2) na++;
    const free=clamp((na-gs)/na,0,1), inBox=xo>88.5 && Math.abs(yo-34)<20.2, dg=hyp(105-xo,34-yo);
    const dang=free>0?xgAt(11+5*(1-free),0)*free:0, cost=(inBox?REF_A.vR:dg<=28?R5C.fkD:R5C.fkV)+R5C.red*remOf()*R5C.y2;
    const est=dang*(1+(R()-0.5)*0.6*(1-(q.a.dec+q.a0.fre)/40)), cp=cost*(1-(q.a0.agg-10)/40), go=free>0 && est>cp;
    if(SO) SO.e('r5c',SX,{k:'tattico', q, o, gs, na, free, dang, cost, go, cu});
    if(!go) return false;
    /* lo afferra o lo sgambetta: il portatore si ferma (perde la sua velocità), la gravità è la velocità tolta */
    const g=Math.max(pushOf(q), hyp(o.vx||0,o.vy||0)); o.vx=(o.vx||0)*0.2; o.vy=(o.vy||0)*0.2; o.stun=Math.max(o.stun||0,0.8);
    ctInj(o,g,false);   /* I1 */
    contactFoul(q,o,g,{k:'tattico', cade:true, cnt:{gs,na,cu}}); return true; }
  /* (2) trattenute e spinte sui calci piazzati (Dani): angoli e punizioni calciate in area. Nell'ultimo mezzo secondo prima che la palla arrivi, chi è a
     contatto con l'avversario più vicino (entro reach) si contende la posizione verso il punto d'arrivo. Chi la sta perdendo (più lontano dal punto di
     almeno 0,3 m) usa le braccia: l'attaccante spinge per liberarsi, il difendente trattiene. Intensità = spinta (Forza) × quanto sta perdendo (fino a
     1,5 m) × Aggressività; metà se è già ammonito; il difendente nella sua area la dosa con Decisioni (sa che rischia il rigore). La vittima perde (o
     prende) quella velocità rispetto al punto: g = velocità tolta; oltre la sua soglia di Equilibrio va giù */
  function jostle(f){ f.jos=1; const A=T[f.t], Dd=T[1-f.t];
    if(!(rx(A,f.x1)>88.5 && Math.abs(f.y1-34)<20.2)) return false;
    const used=new Set(), prs=[];
    for(const a of A.on){ if(a.role==='GK' || a===f.from || a.stun>0 || hyp(a.x-f.x1,a.y-f.y1)>8) continue;
      let d=null, dd=R5C.reach; for(const q of Dd.on){ if(q.role==='GK'||q.stun>0||used.has(q)) continue; const e=hyp(a.x-q.x,a.y-q.y); if(e<dd){dd=e;d=q;} }
      if(d){ used.add(d); prs.push([a,d]); } }
    for(const [a,d] of prs){ const la=hyp(a.x-f.x1,a.y-f.y1), ld=hyp(d.x-f.x1,d.y-f.y1), df=la-ld; if(Math.abs(df)<0.3) continue;
      const lo=df>0?a:d, wi=df>0?d:a, own=lo===d && inOwnBox(d,d.x,d.y);
      const w=(0.6+0.4*(clamp(lo.a0.agg,1,20)-1)/19)*(lo.yc?0.5:1)*(own?1-lo.a.dec/40:1), g=pushOf(lo)*w;
      if(SO) SO.e('r5c',SX,{k:'mischia', lo, wi, df, w, g});
      if(g<0.05) continue;
      const L=Math.max(0.1,hyp(f.x1-wi.x,f.y1-wi.y)), ux=(f.x1-wi.x)/L, uy=(f.y1-wi.y)/L;
      push(wi,-ux*g,-uy*g); wi.stun=Math.max(wi.stun||0, g>=eqOf(wi)?0.8:0.3); ctInj(wi,g,false);   /* I1 */
      /* Dani (13/11): la trattenuta del difendente nella sua area non si considera fallo (resta solo l'effetto sul corpo) */
      if(own){ if(SO) SO.e('r5c',SX,{k:'libero', tipo:'trattenuta', seen:true, nonfallo:'difendente in area', f:lo, v:wi, g}); continue; }
      if(contactFoul(lo,wi,g,{k:'trattenuta', info:{att:lo.t===f.t, df:Math.abs(df), w, sp:ball.sp?ball.sp.type:null}})) return true; }
    return false; }
  /* (3) falli aerei (Dani): due giocatori che saltano per la stessa palla (cross, o lancio lungo che scende su di loro: tutti e due entro 1,5 m, la
     distanza a cui il motore li fa contendere) vanno sullo stesso punto e lì i corpi si toccano. Urto: velocità relativa lungo la congiungente (chi
     arriva da dietro con la corsa colpisce l'altro); la vittima cambia velocità di v·m/(m1+m2), come l'urto di move() (R4b). Chi sta perdendo il salto
     (punteggio aerial più basso) si aiuta con le braccia: spinta pushOf dosata come nelle trattenute. Il fallo è di chi dà all'altro l'urto più forte;
     sotto 0,5 m/s non c'è contatto (come move()) */
  function aerialContact(a, b, sa, sb, ctx){
    const ex=b.x-a.x, ey=b.y-a.y, dd=Math.max(0.05,hyp(ex,ey)), nx=ex/dd, ny=ey/dd, ua=(a.vx||0)*nx+(a.vy||0)*ny, ub=(b.vx||0)*nx+(b.vy||0)*ny;
    /* corsa verso l'altro di ciascuno (aA, aB) e velocità di chiusura vc: se vanno sulla palla con la stessa corsa è uno scontro di gioco; carica chi
       ha la corsa più forte, con la parte in più (vc − 2·la corsa dell'altro: chi sta fermo o va nella stessa direzione non carica) */
    const aA=Math.max(0,ua), aB=Math.max(0,-ub), vc=Math.max(0,ua-ub), net=Math.max(0,vc-2*Math.min(aA,aB)), va=aA>=aB?net:0, vb=aA>=aB?0:net, ma=massOf(a), mb=massOf(b);
    /* le braccia: chi perde il salto e arriva da dietro (più lontano dalla palla dell'altro: per arrivarci deve passargli attraverso) */
    const lo=sa<sb?a:b, wi=lo===a?b:a, back=hyp(lo.x-ball.x,lo.y-ball.y)>hyp(wi.x-ball.x,wi.y-ball.y);
    const w=(0.6+0.4*(clamp(lo.a0.agg,1,20)-1)/19)*(lo.yc?0.5:1)*(inOwnBox(lo,ball.x,ball.y)?1-lo.a.dec/40:1), arm=back?pushOf(lo)*w:0;
    /* Dani (13/11): le braccia nei salti non sono fallo (solo effetto sul corpo); si giudica la carica di chi salta addosso all'altro. Eccezione: se un
       attaccante usa le braccia e segna, fallo contro di lui e gol annullato (M.arm, lineCheck in match_fis.js) */
    const cB=va*ma/(ma+mb), cA=vb*mb/(ma+mb), gB=cB+(lo===a?arm:0), gA=cA+(lo===b?arm:0), f=cB>=cA?a:b, v=f===a?b:a, gc=Math.max(cA,cB);
    if(SO) SO.e('r5c',SX,{k:'salto', a, b, d:dd, va, vb, arm, g:gc, ctx, bz:ball.z});
    M.arm = arm>0 && lo.t===ball.lastT ? {p:lo, v:wi, g:arm, t:M.tick, d:dd} : null;   /* C1a: d = distanza al momento del contatto (sonda di armGoal) */
    if(arm>0){ const sg=wi===b?1:-1; push(wi,sg*nx*arm,sg*ny*arm); if(arm>=eqOf(wi)) wi.stun=Math.max(wi.stun||0,0.8); ctInj(wi,arm,true); }
    if(gc<=0.5) return false;
    const sg=v===b?1:-1; push(v,sg*nx*gc,sg*ny*gc); if(gc>=eqOf(v)) v.stun=Math.max(v.stun||0,0.8);
    /* I1 (D4, D6): nel salto l'urto colpisce chi lo riceve (gc) e, per reazione, chi carica (stesso impulso sulla sua massa): unica origine della commozione */
    ctInj(v,gc,true); ctInj(f,gc*massOf(v)/massOf(f),true);
    return contactFoul(f,v,gc,{k:'aereo', info:{ctx, arm, va, vb, back, da:hyp(a.x-ball.x,a.y-ball.y), db:hyp(b.x-ball.x,b.y-ball.y)}}); }
  /* gol di testa dopo aver usato le braccia nel salto: l'arbitro (se lo vede) annulla e fischia il fallo dell'attaccante */
  function armGoal(scorer){ const a=M.arm; if(!a || a.p!==scorer || M.tick-a.t>=14 || !a.v.on) return false; M.arm=null;
    if(SO) SO.e('r5c',SX,{k:'contatto', tipo:'braccia', f:a.p, v:a.v, g:a.g, d:a.d!=null?a.d:hyp(a.p.x-a.v.x,a.p.y-a.v.y), cat:'cade', info:{gol:true}});
    if(!refSees(a.p,a.v,a.g,true)) return false;
    E('goalno',a.p.t,[a.p.id,a.v.id],`Gol annullato: ${a.p.ln} si è aiutato con le braccia su ${a.v.ln}.`);
    return foul(a.p,a.v,a.g,false,'cade',{k:'braccia', cade:true}); }
  /* (4) fallo in ritardo (n. 63): chi stava arrivando sul portatore quando questo passa non può fermarsi se è troppo vicino. Reazione tr e frenata ab:
     spazio per fermarsi = v·tr + v²/(2·ab); se lo spazio prima di toccarlo (distanza − touch) è minore lo colpisce con la velocità che gli resta.
     Gravità = velocità di chi arriva al contatto (come per i contrasti); urto come move(). Dani (13/11): è vantaggio (non si fischia, nessun
     cartellino), salvo un intervento pericoloso, ammonito dopo l'azione */
  /* C1b (n. 83, decisione di Dani 16/11, scelta C): prima del contrasto il difendente sa se rischia il rosso, con i criteri IFAB di CA1 (condotta):
     scivolata da dietro → rosso (vigoria); scivolata, o entrata da dietro in piedi → giallo (imprudenza); il rosso o il giallo c'è se l'avversario va
     a terra (refTerra: urto vc − asticella ≥ Equilibrio), con l'asticella che conosce (quella vista dai cartellini, amE, altrimenti l'arbitro medio
     CA1_AM0: mai il valore nascosto). Entra solo se il pericolo che toglie vale più del costo atteso del cartellino:
       pericolo tolto = eC − (1 − pw)·eF (occTolta: con lui che resta a chiudere eC; se entra e perde il duello, battuto, eF; pw = duello vinto, come tackleOk);
       costo = pF (probabilità del fallo, la formula del contrasto) × (rosso: R5C.red per il tempo che resta; giallo: R5C.y2 × rosso, o come un rosso
       se è già ammonito). Stima con l'errore ±30% × (1 − (Decisioni + Lettura del gioco + Disciplina tattica)/60), come le altre stime del motore.
     Nessuna costante nuova. */
  function tackleCard(q, o, vc, pw, pF){
    const te=q.te||{}, rd=clamp((q.a.dec+(te.LG!=null?te.LG:SK_TQM.LG)/5+(te.DT!=null?te.DT:SK_TQM.DT)/5)/60,0,1), er=()=>1+(R()-0.5)*0.6*(1-rd);
    /* anche la sua lettura dell'intervento sbaglia: distanza (scivolata o no), direzione (di fronte, di lato, da dietro) e urto, con lo stesso errore */
    const d=hyp(q.x-o.x,q.y-o.y)*er(), am=q.amE!=null?q.amE:CA1_AM0(), sp=hyp(o.vx||0,o.vy||0), ux=sp>0.5?o.vx/sp:Math.cos(o.o||0), uy=sp>0.5?o.vy/sp:Math.sin(o.o||0);
    const cs=clamp(((q.x-o.x)*ux+(q.y-o.y)*uy)/Math.max(0.05,hyp(q.x-o.x,q.y-o.y))+(R()-0.5)*0.6*(1-rd),-1,1), dir=cs>=CA1_K.fronte?'fronte':cs<=-CA1_K.fronte?'dietro':'lato';
    const c=condotta({palla:false, senza:false, sciv:d>CA1_K.sciv, dir, terra:refTerra(am,vc*er(),eqOf(o))}); if(!c||(c!=='vigoria'&&!q.yc)) return true;   /* scelta C di Dani (16/11): pesa solo il rischio di rosso (vigoria, o un giallo da ammonito); il giallo lo accetta come prima */
    const red=c==='vigoria'||!!q.yc, cost=R5C.red*remOf()*(red?1:R5C.y2), tq=tm(q), gx=tq.dir>0?0:PL, dA=[], dB=[];
    for(const p of tq.on) if(p.role!=='GK'){ dA.push(p); if(p!==q) dB.push(p); }
    const eC=occTolta(o.x,o.y,o.vx,o.vy,o.o,gx,dA,1), eF=occTolta(o.x,o.y,o.vx,o.vy,o.o,gx,dB,1), gain=eC-(1-pw)*eF;
    const eCost=pF*cost*er(), go=gain>=eCost;
    if(SO) SO.e('c1b',SX,{k:'cart', q, o, c, red, gain, cost:eCost, go});
    return go; }
  /* C1b (n. 72): entrata in ritardo scelta. Chi pressa il portatore e potrebbe ancora fermarsi dopo il passaggio può scegliere di colpirlo lo stesso,
     una volta per contropiede, con la stessa regola del fallo tattico (pericolo del contropiede contro punizione e giallo; già ammonito: mai) */
  function lateChoice(q, o){
    const to=tm(o), tq=tm(q), cu=to.counterUntil??-1; if(M.tick>=cu || q.tfC===cu || q.yc) return false; q.tfC=cu;
    const xo=rx(to,o.x), yo=ry(to,o.y); let gs=0, na=1;
    for(const p of tq.on) if(p!==q && p.role!=='GK' && rx(to,p.x)>xo+1) gs++;
    for(const p of to.on) if(p!==o && p.role!=='GK' && rx(to,p.x)>=xo-2) na++;
    const free=clamp((na-gs)/na,0,1), inBox=xo>88.5 && Math.abs(yo-34)<20.2, dg=hyp(105-xo,34-yo);
    const dang=free>0?xgAt(11+5*(1-free),0)*free:0, cost=(inBox?REF_A.vR:dg<=28?R5C.fkD:R5C.fkV)+R5C.red*remOf()*R5C.y2;
    const est=dang*(1+(R()-0.5)*0.6*(1-(q.a.dec+q.a0.fre)/40)), go=free>0 && est>cost*(1-(q.a0.agg-10)/40);
    if(SO) SO.e('c1b',SX,{k:'ritardo', q, o, dang, cost, go});
    return go; }
  function lateHit(o){
    const fl=ball.fl; if(!fl || fl.from!==o || !(fl.type==='pass'||fl.type==='cross'||fl.type==='clear')) return false;
    for(const q of op(o).on){ if(q.role==='GK'||q.eng!=='press'||q.stun>0||q.dv||(q.ctT||0)>M.tick) continue;   /* solo chi stava andando sul portatore (pressing) */
      const ex=o.x-q.x, ey=o.y-q.y, d=hyp(ex,ey); if(d>R5C.reach||d<0.05) continue;   /* già a portata: era sull'uomo */
      /* conta la corsa di chi arriva (vq): se è chi ha passato a correre addosso al difendente fermo non è un fallo del difendente; se chi ha passato
         si allontana (vo > 0) lo spazio cresce di quanto si sposta mentre l'altro frena */
      const nx=ex/d, ny=ey/d, vq=(q.vx||0)*nx+(q.vy||0)*ny, vo=(o.vx||0)*nx+(o.vy||0)*ny; if(vq<=0.5) continue;
      const gap=Math.max(0,d-R5C.touch)+Math.max(0,vo)*(R5C.tr+vq/R5C.ab); let scelto=false;
      if(gap>=vq*R5C.tr+vq*vq/(2*R5C.ab)){ if(gap>vq*DT || !lateChoice(q,o)) continue; scelto=true; }   /* C1b (n. 72): poteva fermarsi, sceglie di entrare (arriva entro il passo) */
      const vh=scelto?vq:Math.sqrt(Math.max(0,vq*vq-2*R5C.ab*Math.max(0,gap-vq*R5C.tr))); if(vh<=0.5) continue;
      const mo=massOf(o), mq=massOf(q), dvo=Math.max(0,vh-vo)*mq/(mo+mq), down=dvo>=eqOf(o);
      push(o,nx*dvo,ny*dvo); q.ctT=M.tick+2; if(down) o.stun=Math.max(o.stun||0,0.8);
      ctInj(o,dvo,false); ctInj(q,dvo*mo/mq,false);   /* I1: urto in ritardo, anche su chi arriva */
      if(SO) SO.e('r5c',SX,{k:'tardi', q, o, d, vq, vo, vh, dvo});
      /* Dani (13/11): chi ha già passato e poi riceve il contatto: è vantaggio, non si fischia e non c'è cartellino. Solo un intervento pericoloso
         (CA1: poteva fermarsi e la vittima va a terra) si ammonisce dopo l'azione (M.pendCard) */
      /* CA1 (Dani, 14/11, strada c): decide la fisica. Tempo del contatto tc (prima la reazione tr, poi la frenata ab, i valori di R5C) contro il tempo che
         gli serviva per fermarsi, tr + vq/ab: se il contatto arriva prima, non poteva fermarsi ed è negligente (solo il contatto, è vantaggio); se arriva
         dopo, poteva fermarsi e non l'ha fatto: imprudente, giallo se l'arbitro vede la vittima a terra (urto dvo − asticella ≥ soglia di Equilibrio).
         Nessuna soglia nuova. Come il motore trova questo contatto (spazio minore dello spazio d'arresto) tc è sempre prima: resta il controllo */
      const g0=gap-vq*R5C.tr, tc=g0<=0?gap/vq:R5C.tr+(vq-vh)/R5C.ab, ts=R5C.tr+vq/R5C.ab, poteva=scelto||tc>=ts;
      const per=poteva && refTerra(RF.am,dvo,eqOf(o));
      if(SO) SO.e('r5c',SX,{k:'contatto', tipo:'ritardo', f:q, v:o, g:vh, d, cat:down?'cade':'leggero', info:{d, vq, vo, dvo, tc, ts}, fl:ball.fl, per});
      const seen=refSees(q,o,vh,true);
      if(SO) SO.e('r5c',SX,{k:'libero', tipo:'ritardo', seen, f:q, v:o, g:vh, vantaggio:true, per, dvo, eq:eqOf(o), tc, ts});
      /* l'evento del vantaggio (cronaca) solo per l'intervento pericoloso, che si ammonisce alla prima interruzione; gli altri sono contatti di gioco */
      if(seen && per){ E('adv',q.t,[q.id,o.id],fill2(P(MTX.adv),{p:q,v:o}),{k:'ritardo'}); M.pendCard.push({f:q,v:o,cd:{c:q.yc?'y2':'yc',why:'imprudenza',e:dvo-eqOf(o)}}); }
      return false; }
    return false; }
  return {startKick, offLineFor, offsideCall, pause, refError, protest, moveRefs, foul, unseenFoul, refSees, refCat, refFalls, advTick, flushCards, injure, ctInj, sendOff, forcedOut, keepDistance, restartBall, rsReady, execRestart, contactFoul, tacticalFoul, jostle, aerialContact, lateHit, armGoal, tackleCard};
}
