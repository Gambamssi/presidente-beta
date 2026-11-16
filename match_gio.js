/* match_gio.js — v0.4.2.2 (T1): decisioni del giocatore: passaggio, tiro, dribbling, giocate di prima, portiere (base per R4).
   Funzioni spostate da simMatch (match.js) senza cambiarne il corpo: matchGio(M) è chiamata da simMatch all'inizio della partita
   e restituisce le funzioni, che restano chiusure come prima. M è il contesto condiviso: le variabili riassegnate durante la partita
   si leggono e scrivono come M.x (tick, half, regEnd, restart, ht2, errLeft, bsN); gli altri valori di simMatch e le funzioni degli altri moduli
   arrivano nelle variabili qui sotto con M.link (stessi oggetti, nessuna copia). Script classico: nessun import/export. */
function matchGio(M){
  let R, P, RP, SO, SX, T, rx, ry, tm, op, ball, minNum, E, fill2, fatK, D2, giveBall, loose, fly, shotPlan, offLineFor, offsideCall, gkOf;
  M.link.push(()=>{ ({R, P, RP, SO, SX, T, rx, ry, tm, op, ball, minNum, E, fill2}=M); ({fatK, D2, giveBall, loose, fly, shotPlan}=M.mFis); ({offLineFor, offsideCall}=M.mArb); ({gkOf}=M.mAll); });
  function nearestOpp(p){ let b=null,bd=99; for(const q of op(p).on){ const d=D2(p,q); if(d<bd){bd=d;b=q;} } return [b,bd]; }
  /* v0.4.2.0 (regia): il portiere usa le mani solo dentro la propria area di rigore (palla e portiere in area) */
  const handsOk=(g,x,y)=>{ const t=T[g.t]; return rx(t,x)<16.5 && Math.abs(y-34)<20.16 && rx(t,g.x)<16.5 && Math.abs(g.y-34)<20.16; };
  /* presa: la palla resta dove l'ha fermata (le mani) e in pochi decimi di secondo arriva al petto; mai teletrasporti */
  function gkCatch(g, delay){ const hx=ball.x-g.x, hy=ball.y-g.y, hz=Math.max(0.3,Math.min(2.6,ball.z+FIS.R)); giveBall(g, delay); if(M.gst) M.gst(g,9); g.hold=true; g.hx=hx; g.hy=hy; g.hz=hz; }

  /* --- palla --- */
  /* giocate di prima: efficaci solo da vicino perché poco precise */
  function firstTime(p){
    const t=tm(p), o=op(p), xr=rx(t,p.x), yr=ry(t,p.y), gx=t.dir>0?PL:0, dg=hyp(gx-p.x,p.y-34), [,press]=nearestOpp(p);
    const from=ball.pass && M.tick-ball.pass.t<3 ? ball.pass.from : null; if(!from || p.role==='GK') return false;
    /* tiro di prima */
    if(dg<13 && Math.abs(yr-34)<12 && xr>90){ const pr=clamp(0.03+(p.a0.tir-10)*0.015+(p.a0.fre-10)*0.01+(dg<8?0.18:dg<11?0.04:0)+(press<2?0.06:0),0,0.45)*0.35; if(R()<pr){ if(SO) SO.e('dec',SX,{p,k:'prima-tiro'}); shoot(p,'first'); return true; } }
    /* uno-due: il compagno che ha appena passato sta scattando nello spazio */
    if(from.wall && M.tick-from.wall.t<14 && from.on){ const X=from.x+(from.wall.X-from.x)*0.6, Y=from.y+(from.wall.Y-from.y)*0.6, dl=hyp(X-p.x,Y-p.y);
      if(dl<17 && R()<0.45+p.a.vis*0.02){ if(SO) SO.e('dec',SX,{p,k:'prima-unodue'}); from.wall=null; firstPass(p,from,X,Y,dl,'uno-due'); return true; } }
    /* pressato con un compagno vicino e libero: scarico di prima */
    if(press<1.6 && xr>30){ let best=null,bd=11; for(const m of t.on){ if(m===p||m.role==='GK') continue; const d=D2(p,m); if(d<4||d>bd) continue; let rp=99; for(const q of o.on){ const dd=D2(q,m); if(dd<rp) rp=dd; } if(rp>3.5 && pathFree(p,o,m.x,m.y,1.5)){ bd=d; best=m; } }
      if(best && R()<R4P.scP+p.a.vis*0.015){ if(SO) SO.e('dec',SX,{p,k:'prima-scarico'}); firstPass(p,best,best.x,best.y,bd,'scarico'); return true; } }
    return false;
  }
  function firstPass(p,m,X,Y,dl,why){
    const t=tm(p); t.st.pa++; p.s.pa++; if(M.gst) M.gst(p,0);
    const [,press]=nearestOpp(p);
    const succ=clamp(0.95-dl*0.014*(1.5-p.a.pas/20)-(press<1.6?0.12:0),0.2,0.93);
    let bad=false; if(R()>succ){ bad=true; const a=R()*Math.PI*2, e=2+R()*6; X=clamp(X+Math.cos(a)*e,1,PL-1); Y=clamp(Y+Math.sin(a)*e,1,PW-1); }
    const offside = offsideCall(t,m,p);
    fly('pass',p,X,Y,17+dl*0.2,0.12,{recv:m,bad,offside,through:why==='uno-due',first:true,keyLike:xT(rx(t,X),ry(t,Y))>0.06});
  }

  /* varchi tra i difensori avversari (coordinate della squadra che attacca) */
  function defGaps(t){
    /* T2 (n. 49): i 5 difendenti più avanzati senza ordinare tutta la squadra; a parità di x resta prima chi viene prima in o.on, come con l'ordinamento
       stabile di prima (stessi 5 giocatori, stesse y) */
    const o=T[1-t.idx], tx=[], ty=[]; for(const q of o.on){ if(q.role==='GK') continue; const x=rx(t,q.x); if(tx.length===5 && !(x>tx[4])) continue;
      let i=tx.length; while(i>0 && tx[i-1]<x) i--; tx.splice(i,0,x); ty.splice(i,0,ry(t,q.y)); if(tx.length>5){ tx.pop(); ty.pop(); } }
    const ys=ty.sort((a,b)=>a-b);
    const e=[2,...ys,66], g=[]; for(let i=0;i<e.length-1;i++){ const w=e[i+1]-e[i]; if(w>=5) g.push({y:(e[i]+e[i+1])/2,w}); } return g;
  }
  function oppMidLine(t){ const o=T[1-t.idx]; const ms=o.on.filter(q=>ROLE_GROUP[q.role]==='C'); return ms.length? ms.reduce((s,q)=>s+rx(t,q.x),0)/ms.length : 60; }
  function pathFree(p,o,X,Y,r){ for(const q of o.on){ if(segDist(q.x,q.y,p.x,p.y,X,Y)<r || hyp(q.x-X,q.y-Y)<r) return false; } return true; }
  const aerial=(q,R)=>q.a.tes+q.a.ele*0.6+(q.h-180)*0.13+q.a.for*0.2+R()*8;
  const weakFoot=p=>p.foot!=='A' && hashN((p.hk*31+M.tick)>>>0)<clamp((20-p.gs.PD)/20*0.4,0.03,0.4);   /* v0.4.2.0: il piede debole da hash, non da R(); R4: quanto spesso dipende da Piede debole (PD) */
  const lossCost=x=>(0.03+0.2*Math.exp(-x/14))*1.5;
  /* v0.4.6.0 (R4): costanti del codice del giocatore (taratura su ruoli.csv) */
  const R4P={rcv:{GK:0.022,CB:0.022,LB:0.006,RB:0.006,LWB:0.006,RWB:0.006,DM:0.008,AM:-0.008,ST:-0.035}, rcvO:0.55, urgM:55, urgK:0.3, rcvS:0.9, fwdT:0.045, carry:0.01, scP:0.35, shQ:0.006, gkN:1.0, prF:0, penK:0.5, gkD:2.2, fatN:2, offP:0.2, fkS:0.7, clX:60, clY:21, clO:0.7, clU:0.05, shT:{ST:1.535,LW:0.785,RW:0.785,LM:0.785,RM:0.785,AM:0.735,CM:0.785,DM:0.835,LB:0.835,RB:0.835,LWB:0.835,RWB:0.835,CB:0.935}, shD:30, shP:2.6, shL:0.45, shU:0.006, shC:0.015, crX:66, crY:13, crU:0.039, crB:0.015, crS:0.002, drV:0.028, drL:0.5, drS:0.003, lunD:25, lunK:0.006, lanB:0.009, bX:55, stRp:4, lanF:0.006, gkLong:{corta:0.016,mista:0.026,lunga:0.036}, costr:{corta:1.3,mista:1,lunga:0.7}, gkX:38, gkX0:40,
    /* R4b (0.4.6.2, PROBLEMI_NOTI n. 36): tiro da vicino. Palla a meno di cD m dalla porta e angolo tra i pali ≥ cA gradi
       (definizione approvata da Dani l'11/11). Dal passo 3 della sessione del 12/11 la scelta nasce dal confronto tra tiro, passaggio e conduzione (closeShot) */
    cD:10, cA:15,   /* R4b passo 3: tolte le probabilità fisse c e cK del tiro da vicino */
};

  /* R4b (n. 36): probabilità di tirare da vicino (0 = la regola non vale). Definizione uguale alla misura di tools/r4.js (sezione R4b) */
  const angPali=(xr,yr)=>Math.abs(Math.atan2(37.66-yr,105-xr)-Math.atan2(30.34-yr,105-xr))*57.29578;
  const segC=(px,py,ax,ay,bx,by)=>{ const dx=bx-ax, dy=by-ay, L=dx*dx+dy*dy||1, u=clamp(((px-ax)*dx+(py-ay)*dy)/L,0,1); return hyp(ax+u*dx-px,ay+u*dy-py); };
  /* C1c (n. 89, ok di Dani 16/11): stima del tiro con la stessa fisica del motore.
     Tempo di volo: SV_TT, dalla fisica della palla (fisDirect e fisBallStep: resistenza, rimbalzi, rotolamento), calcolata una volta per v 10–34 m/s
     e L 2–60 m verso un punto a 0,8 m d'altezza; 99 se la palla non ci arriva entro 4 s (shotPlan non guarda oltre). */
  const SV_TT=(()=>{ const T=new Float64Array(13*30), s={x:0,y:0,z:0,vx:0,vy:0,vz:0,wx:0,wy:0,wz:0};
    for(let i=0;i<13;i++) for(let j=0;j<30;j++){ const v=10+2*i, L=2+2*j, a=fisDirect(0,0,0,L,0,0.8,v,0,0); s.x=0; s.y=0; s.z=0; fisKick(s,v,a.az,a.el,0,0); let t=0, px=0;
      for(let k=0;k<64 && s.x<L;k++){ px=s.x; fisBallStep(s,DT/FIS.SUB); t+=DT/FIS.SUB; } T[i*30+j]= s.x>=L ? t-(s.x-L)/Math.max(1e-6,s.x-px)*DT/FIS.SUB : 99; }
    return T; })();
  const svT=(v,L)=>{ const fi=clamp((v-10)/2,0,12), fj=clamp((L-2)/2,0,29), i=Math.min(11,Math.floor(fi)), j=Math.min(28,Math.floor(fj)), a=fi-i, b=fj-j, T=SV_TT;
    return (T[i*30+j]*(1-a)+T[(i+1)*30+j]*a)*(1-b)+(T[i*30+j+1]*(1-a)+T[(i+1)*30+j+1]*a)*b; };
  const PHI=x=>1/(1+Math.exp(-1.702*x)), pIn=(a,b,m,s)=>b<=a?0:PHI((b-m)/s)-PHI((a-m)/s);
  /* punti mirati da shoot: lato con più spazio 70%, l'altro 30%; 0,9–2,5 m dal centro (due quantili) più la qualità; basso 55% (0,1–0,6 m), alto 45% (0,6–1,9 m) */
  const SV_AIM=[[0.7,0.25],[0.7,0.75],[0.3,0.25],[0.3,0.75]], SV_Z=[[0.55,0.35],[0.45,1.25]];
  /* costo del tiro che non è gol (Dani, 1b): rischio di prendere gol in contropiede, secondo dove finisce la palla. Misura sul motore (sonda C1c, 100 partite,
     mondi 2024 e 77, docs/PROGRESSI_C1c.md): gol dell'avversario nei 30 s seguenti dopo un tiro fuori (rimessa dal fondo) 0,014 su 2737; presa 0,007 su
     291; respinta 0,005 su 387; tiro murato, secondo la distanza dalla porta del punto in cui è murato: sotto 11 m 0,004 (964), 11–20 m 0,004 (567),
     20–30 m 0,008 (621), oltre 30 m 0,041 (3674). Le ribattute a favore di chi tira non entrano nella stima: il tiratore non tira per la ribattuta.
     Da rimisurare quando la partita cambia (tools/c1c.js, voce «costo del tiro»). */
  const SV_C={fuori:0.014, presa:0.007, respinta:0.005}, SV_CB=[5.5,0.004, 15,0.004, 25,0.008, 40,0.041];
  const svCB=d=>{ const T=SV_CB; if(d<=T[0]) return T[1]; for(let i=2;i<T.length;i+=2) if(d<=T[i]) return T[i-1]+(T[i+1]-T[i-1])*(d-T[i-2])/(T[i]-T[i-2]); return T[T.length-1]; };
  const SV={g:0};   /* probabilità di gol dell'ultima stima (per la sonda c1c e la prova del n. 89) */
  /* valore di un tiro da (X,Y) del giocatore q. Per ogni potenza (60/80/100%), media sui punti mirati di shoot con l'errore d'angolo di shoot (Tiro o Tiro
     da fuori, Freddezza, avversario vicino, corsa con Equilibrio, corpo girato con Agilità, di prima, potenza): in porta (pali e traversa), fuori dalla
     portata del portiere proiettata dalla sua posizione alla linea (gkReach: reazione, corsa e portata di gkDecide), non respinto (portata del corpo dei
     difensori di shotPlan quando la palla gli passa, con la loro velocità; su una palla lenta, quanto il difensore corre dopo la reazione R5C.tr con il
     suo corpo di fisCorpo, τ = 5/amax: è la palla che intercetta); meno il costo misurato di fuori, presa, respinta e tiro murato. Senza numeri casuali. */
  function shotVal(q,X,Y,first,o){ const t=tm(q), gx=t.dir>0?PL:0, gk=gkOf(o), gy=gk?gk.y:34, dg=Math.max(0.5,hyp(gx-X,34-Y)), far=dg>18;
    let nd=99; for(const z of o.on){ if(z.role==='GK') continue; nd=Math.min(nd,hyp(z.x-X,z.y-Y)); }
    const Q=far?q.a0.lun:q.a0.tir, qa=clamp((Q-4)/16,0,1), sp=hyp(q.vx||0,q.vy||0), dO=Math.abs(fisAng((q.o||0)-Math.atan2(34-Y,gx-X)));
    let sig=SHOT_S0+(20-Q)*R4P.shQ-(q.a0.fre-10)*0.002+(first?0.03:0)+0.006*sp*(1.3-q.gs.EQ*0.03)+0.035*Math.min(2,dO/(Math.PI/2))*(1.3-q.gs.AG*0.03);
    sig*=1+0.8*clamp(2-nd,0,1);
    const vF=clamp(27+(Q-10)*0.5,12,34)*(first?0.93:1)*(1-0.015*fatK(q))*(nd<1?0.85:nd<2?0.93:1), sc0=((34+FIS.GW)-gy)>(gy-(34-FIS.GW))?1:-1;
    let best=0, bG=0;
    for(const u of [0.6,0.8,1.0]){ const sF=0.5+0.5*Math.pow(u/0.8,3); let aG=0, aV=0;
      for(const [ws,fo] of SV_AIM){ const ty=34+(ws===0.7?sc0:-sc0)*(0.9+1.6*fo+qa*0.6); aV+=ws*0.5*svAim(o,gk,gx,X,Y,ty,-1,sig,sF,u*vF); aG+=ws*0.5*SV.ga; }
      if(u===0.6||aV>best){ best=aV; bG=aG; } }
    SV.g=bG; return best; }
  /* un punto mirato (ty; altezza tz, oppure tz < 0 per i due punti di SV_Z): probabilità di gol (in SV.ga) e valore (gol meno costo), con la palla calciata a
     vk m/s e l'errore d'angolo sig·sF. Usata dalla stima (shotVal) e da shoot per scegliere la potenza: lo stesso calcolo nei due posti. */
  function svAim(o,gk,gx,X,Y,ty,tz,sig,sF,vk){ const sx=gx-X, sy=ty-Y, Le=Math.max(0.5,hyp(sx,sy)), sd=Math.max(0.05,Le*sig*sF), lo=34-FIS.GW, hi=34+FIS.GW, gy=gk?gk.y:34;
    let pb=1, qS=0, qV=0;
    for(const z of o.on){ if(z.role==='GK') continue; const a=((z.x-X)*sx+(z.y-Y)*sy)/Le; if(a<0.7||a>Le) continue;
      const tq0=svT(vk,Math.max(2,a)), ext=Math.min(tq0,0.4), zx=z.x+(z.vx||0)*ext, zy=z.y+(z.vy||0)*ext, off=((zx-X)*sy-(zy-Y)*sx)/Le, s=Math.max(0.05,a*sig*sF);
      const tq=Math.max(0,tq0-R5C.tr), ta=5/(z.amax||4.7), vm=z.vmax||8.5, reach=Math.max(0.35+clamp((tq0-0.08)*3.2,0,0.75)*(0.7+z.a0.pos/40), 0.35+vm*(tq-ta*(1-Math.exp(-tq/ta)))), qz=pIn(-reach,reach,off,s); pb*=1-qz; qS+=qz; qV+=qz*svCB(Le-a); }
    const vB=qS>0?qV/qS:0, arr=svT(vk,Le)<4, pF=pIn(lo,hi,ty,sd); let ga=0, v=0;
    for(let k=0;k<2;k++){ const w=tz<0?SV_Z[k][0]:(k===0?1:0); if(!w) continue; const zz=tz<0?SV_Z[k][1]:tz, pZ=PHI((FIS.GH-FIS.R-(zz+0.28*sd))/(0.88*sd)); let pR=pF;
      if(gk && arr){ const fr=clamp(Math.abs(gk.x-X)/Math.max(0.5,Math.abs(sx)),0.05,1), Rw=gkReach(gk,svT(vk,Math.max(2,fr*Le)),ty,zz);
        pR=Math.min(pF,pIn(Math.max(lo,Y+(gy-Rw-Y)/fr),Math.min(hi,Y+(gy+Rw-Y)/fr),ty,sd)); }
      else if(!gk && arr) pR=0;   /* porta vuota; la palla che non arriva entro 4 s la raccoglie il portiere */
      const g=(pF-pR)*pZ*pb, pc=gk?gkCatchP(gk,vk*0.85,Math.abs(ty-gy),zz+FIS.R,false):0;
      ga+=w*g; v+=w*(g - pR*pZ*pb*(pc*SV_C.presa+(1-pc)*SV_C.respinta) - (1-pb)*vB - (pb-g-pR*pZ*pb)*SV_C.fuori); }
    SV.ga=ga; return v; }
  /* C1c (n. 89 e n. 81, 3a di Dani): portiere. gkAvail: reazione (Parate), partenza con la velocità di adesso, accelerazione fino al picco (Parate) in GK_TA,
     spostamento del baricentro fino alla portata del tuffo R4P.gkD (SENZA FONTE: dal corpo esce 2,0–3,5 m, manca la velocità verticale dello stacco).
     gkLat: portata laterale all'altezza hz dal centro del corpo spostato: braccio verso l'alto 0,70 × statura + raggio della palla (dal baricentro a 0,55 ×
     statura), di lato spalla più braccio 0,57 × statura + raggio della palla (segmenti di Winter, Biomechanics and Motor Control of Human Movement):
     ellisse tra le due. gkReach: metà larghezza coperta su una palla fra tc secondi all'altezza z. gkCatchP: presa o respinta di gkDecide. */
  function gkAvail(gk,tc,yc,screen){ const par=gk.a0.par, hh=gk.h||186, tr=GK_TR-(par-10)*0.008+(screen?0.08:0), dmax=R4P.gkD+(par-10)*0.08+(hh-186)*0.008,
      vp=GK_VP0+clamp((par-1)/19,0,1)*GK_VPK, tm=Math.max(0,tc-tr), v0=(gk.vy||0)*Math.sign(yc-gk.y||1), ac=vp/GK_TA;
    let dd=v0*Math.min(tc,tr); if(v0>=vp) dd+=vp*tm; else { const t1=(vp-v0)/ac; dd+= tm<=t1 ? v0*tm+ac*tm*tm/2 : (v0+vp)/2*t1+vp*(tm-t1); }
    GKA.tr=tr; GKA.avail=clamp(dd,0,dmax); return GKA; }
  const GKA={tr:0, avail:0};
  function gkLat(hh,hz){ const hc=0.55*hh/100, rv=0.70*hh/100+FIS.R, rl=0.57*hh/100+FIS.R, e=Math.max(0,hz-hc)/rv; return e<1?rl*Math.sqrt(1-e*e):0; }
  function gkReach(gk,tc,yc,z){ const g=gkAvail(gk,tc,yc,false); return g.avail+gkLat(gk.h||186,z+FIS.R); }
  function gkCatchP(gk,vAt,ady,hz,pen){ return clamp(0.62+(gk.a0.pre-10)*0.035-Math.max(0,vAt-17)*0.03-(ady>1.2?0.25:0)-(hz>1.9||hz<0.3?0.15:0)-(pen?0.25:0),0.05,0.93); }
  /* R4b passo 3 (D): tiro da vicino senza probabilità fisse (tolte le R4P.c). Con la palla a meno di cD m e un angolo utile (definizione del n. 36), il
     giocatore confronta: il tiro adesso; il passaggio al compagno meglio piazzato (il suo tiro di prima × la linea di passaggio libera); se nessun
     avversario può arrivargli addosso entro 1 s, due metri di conduzione verso il centro della porta e poi il tiro. Sceglie il migliore secondo la sua
     stima: l'errore di giudizio cresce con poca Freddezza e poco Decision making (come noi() di decide). Restituisce {k:'shoot'}, {k:'carry',X,Y} o null. */
  /* C1c (n. 89, 1d di Dani): errore relativo della stima del tiratore, uniforme, da Decisioni e Anticipazione (Lettura del gioco non arriva alla partita):
     ±27% con 10 e 10, ±11% con 20 e 20 (stessa scala dell'errore di giudizio di R4b nel tiro da vicino, che usava Freddezza al posto di Anticipazione) */
  const svErr=p=>(R()-0.5)*0.5*(42-p.a0.dec-p.gs.AN)/20;
  function closeShot(p,t,o,xr,yr,press){
    if(p.role==='GK' || xr>=105) return null; const dg=hyp(105-xr,34-yr); if(dg>=R4P.cD) return null;
    if(angPali(xr,yr)<R4P.cA) return null;
    const gx=t.dir>0?PL:0, err=()=>svErr(p);
    const vS0=shotVal(p,p.x,p.y,false,o), gS=SV.g, vS=vS0+gS*err();   /* C1c: err da Decisioni e Anticipazione (svErr); gS per la sonda */
    let vP=0; for(const m of t.on){ if(m===p||m.role==='GK') continue; const d=hyp(m.x-p.x,m.y-p.y); if(d>22||hyp(gx-m.x,34-m.y)>16) continue;
      let lane=1; for(const z of o.on){ const ds=segDist(z.x,z.y,p.x,p.y,m.x,m.y); if(ds<1.5) lane*=clamp((ds-0.4)/1.1,0,1); }
      if(lane>0) vP=Math.max(vP, shotVal(m,m.x,m.y,true,o)*lane); }
    vP*=1+err();
    let vC=0, tOpp=99, X=0, Y=0; for(const z of o.on){ if(z.role==='GK') continue; tOpp=Math.min(tOpp, hyp(z.x-p.x,z.y-p.y)/Math.max(1,z.vmax)); }
    if(tOpp>1.0){ const L=Math.max(1,hyp(gx-p.x,34-p.y)); X=p.x+(gx-p.x)/L*2; Y=p.y+(34-p.y)/L*2; vC=shotVal(p,X,Y,false,o); vC+=SV.g*err(); }
    if(vS>=vP && vS>=vC) return {k:'shoot',g:gS};
    if(vC>vP) return {k:'carry',X,Y};
    return null;   /* il compagno è messo meglio: si decide come sempre (passaggio) */
  }
  function decide(p){
    p.ft=false;
    const t=tm(p), o=op(p), xr=rx(t,p.x), yr=ry(t,p.y), [no,press]=nearestOpp(p);
    const contact=press<1.6, pressed=press<3;
    const opts=[]; const noi=()=> (R()-0.5)*0.025*(22-p.a0.dec+fatK(p)*R4P.fatN)/10;   /* F9: Decision making vero (non compresso): chi decide male sbaglia di più */   /* R4 (F6): la stanchezza pesa meno sulle scelte dell'attaccante */
    const gx=t.dir>0?PL:0, dx=Math.abs(gx-p.x), dy=p.y-34, dg=hyp(dx,dy);
    let goalSide=0; for(const q of o.on){ if(q.role==='GK') continue; if(Math.abs(q.x-gx)<Math.abs(p.x-gx)-0.5 && Math.abs(q.y-p.y)<10) goalSide++; }
    let chase0=99; for(const q of o.on){ if(q.role==='GK') continue; const d=hyp(q.x-p.x,q.y-p.y); if(d<chase0) chase0=d; }
    if(!p.pf && !p.gkKick){ const cs=closeShot(p,t,o,xr,yr,press);   /* R5b: su una palla ferma (p.pf) si calcia: niente tiro da vicino né conduzione */
      if(cs && cs.k==='shoot'){ if(SO) SO.e('dec',SX,{p,k:'shoot',vicino:1,g:cs.g}); return shoot(p,'open'); }
      if(cs && cs.k==='carry'){ p.cx=clamp(cs.X,1,PL-1); p.cy=clamp(cs.Y,1,PW-1); p.dt=0.45; if(SO) SO.e('dec',SX,{p,k:'carry',vicino:1}); return; } }
    const oneOnOne = goalSide===0 && dg<34 && p.role!=='GK' && chase0>2.2;   /* v0.4.2.0: con un avversario addosso non è un uno contro uno */
    if(oneOnOne && dg>11){ const X=p.x+(gx-p.x)/dg*7, Y=p.y+(34-p.y)/dg*7; opts.push({k:'carry',u:0.12+noi(),X,Y}); }
    /* C1c (n. 89, 1c di Dani): una sola opzione di tiro, il valore fisico (shotVal) con l'errore di stima; tolte le soglie su xgAt (0,23–0,32 × R4P.shT), i premi
       del tiro da fuori (×1,15, R4P.shU, R4P.shC, attributi) e i limiti R4P.shD e |dy|<18. Oltre i 40 m la stima è quasi zero e non si calcola (solo velocità
       di calcolo), tranne con il portiere fuori dalla sua area piccola o senza portiere (porta vuota) */
    { const gko=gkOf(o); if(dx>1 && (dg<40 || !gko || hyp(gko.x-gx,gko.y-34)>5.5)){ const sv=shotVal(p,p.x,p.y,false,o); if(SV.g>0) opts.push({k:'shoot',u:sv+SV.g*svErr(p)+noi(),g:SV.g}); } }
    const off=offLineFor(t), gaps=defGaps(t);
    /* passaggi: la precisione cala con la distanza e crolla quando si è a contatto con l'avversario */
    let centralShut=true; { const gxr=Math.min(100,xr+18); for(const m of t.on){ if(m===p) continue; const mx=rx(t,m.x), my=ry(t,m.y); if(mx>xr+4 && Math.abs(my-34)<16 && mx<gxr+20){ let rp0=99; for(const q of o.on){ const dd=hyp(q.x-m.x,q.y-m.y); if(dd<rp0) rp0=dd; } if(rp0>3.5 && pathFree(p,o,m.x,m.y,1.8)){ centralShut=false; break; } } } }
    for(const m of t.on){ if(m===p) continue; const d=D2(p,m); const wide=Math.abs(ry(t,m.y)-34)>18; if(d<3||d>(wide?55:45)) continue; if(m.role==='GK' && (xr>R4P.gkX||(press>3&&xr>R4P.gkX0))) continue;
      let txr=rx(t,m.x), tyr=ry(t,m.y), through=false;
      /* v0.4.2.0: un compagno che si muove si serve dove arriverà (i corpi hanno inerzia: non si fermano di colpo) */
      { const sp=hyp(m.vx,m.vy); if(sp>1.2 && m.runT<=0){ const L=d, tf=L/(0.775*(13+0.22*L)), k=Math.min(0.8*tf, 7/sp); txr=clamp(rx(t,m.x+m.vx*k),2,103); tyr=clamp(ry(t,m.y+m.vy*k),2,66); } }
      if(m.runT>0 && txr>xr+4 && (isAtt(m.role)||m.role==='CM'||m.role==='AM')){
        let g=null,gd=99; for(const G of gaps){ const dd=Math.abs(G.y-tyr); if(dd<gd){gd=dd;g=G;} }
        if(!g || gd>12) continue;
        /* v0.4.2.0: con i corpi veri un filtrante riuscito vale quasi un uno contro uno: serve tempo (nessuno addosso) e la visione per vederlo */
        if(press<3.2 || R()>0.12+p.a0.vis/80) continue;
        const lead=clamp((96-off)*0.42,5,15); if(96-off<13 && R()<0.5) continue; through=true; txr=Math.min(99,Math.max(txr,off)+lead); tyr=g.y;
      }
      if(m.role!=='GK' && txr<8 && Math.abs(tyr-34)<12) continue;   /* mai un passaggio a chi sta sulla propria linea di porta */
      let offF=false; if(!through && txr>off+0.3 && txr>52.5){ if(R()>R4P.offP*(1.6-p.a.vis/20)) continue; offF=true; }
      const X=rx(t,txr), Y=ry(t,tyr); let risk=0;
      for(const q of o.on){ const sd=segDist(q.x,q.y,p.x,p.y,X,Y); if(sd<2.4) risk+=(2.4-sd)/2.4*(0.5+q.a.pos/40); }
      if(hyp(X-p.x,Y-p.y)>28) risk*=0.6;
      let rp=99; for(const q of o.on){ const dd=hyp(q.x-X,q.y-Y); if(dd<rp) rp=dd; }
      if(through && rp<2.5) continue;
      const dl=hyp(X-p.x,Y-p.y);
      const wL=clamp((dl-12)/23,0,1), PK=p.gs.PC*(1-wL)+p.gs.PL*wL, PAS=p.role==='GK'?(PK+p.a0.rin*2)/3:PK; let succ=1.04-dl*0.003*(1.6-PAS/20)-risk*0.2-Math.max(0,dl-R4P.lunD)*R4P.lunK*(1.4-PAS/20);   /* R4: corto PC, lungo PL */
      if(contact) succ-=0.24*(1.35-p.a.pas/20); else if(press<3) succ-=0.03;
      succ-=(100-p.st)/100*0.08+fatK(p)*0.05;
      if(rp<1.5) succ*=0.72; else if(rp<2.8) succ*=0.9;
      succ=clamp(succ,0.05,0.985);
      const v=xT(txr,tyr), gain=v-xT(xr,yr);
      let u=succ*v+gain*0.5*succ-(1-succ)*lossCost(xr);
      if(pressed) u+=(rp>4?0.02:0.005)*Math.max(0,1-dl/22)*succ*succ;
      if(xr<72 && !through) u+=(succ-0.82)*0.042*clamp(1+(t.tech-10)/4+(t.style==='possesso'?0.6:0),0.3,2.6);
      const byr=ry(t,ball.y), toWeak=(tyr-34)*t.weak<0 ? 0 : (tyr-34)*t.weak>0 && Math.abs(tyr-byr)>12;
      if(!through && toWeak && rp>4) u+=0.006+(centralShut?0.008:0);
      if(!through && centralShut && Math.abs(tyr-34)>18 && rp>3) u+=0.004;
      if(t.style==='possesso' && dl<20) u+=0.006; if(t.style==='profondità'&&through) u*=1.3; if(t.style==='contropiede'&&gain>0.01) u*=1.15;
      if(M.tick<t.counterUntil && gain>0.005) u*=1.35;
      /* R4: circolazione per ruolo (ruoli.csv): i compagni dietro e liberi ricevono di più, le punte marcate di meno; il piano (costruzione) la sposta */
      if(dl>30){ if(xr<50 && txr>xr+15 && rp>3) u+=R4P.lanB*succ; else if(xr>55) u-=R4P.lanF; }   /* R4: lancio in avanti dalla propria metà verso un compagno libero */
      /* R4 (F9): circolazione per ruolo (ruoli.csv): i compagni dietro e liberi ricevono di più, le punte marcate di meno. Il premio della
         circolazione (circ) si aggiunge dopo, solo quanto le giocate in avanti sono scarse: chi ha buone opzioni davanti attacca */
      let circ=0; if(!through){ const cb=R4P.rcv[m.role]||0; if(cb>0){ if(xr<R4P.bX||pressed) circ=cb*R4P.rcvS*clamp((rp-1.5)/3,0,1)*(R4P.costr[t.plan.costr]||1)*(t.goals<=T[1-t.idx].goals && minNum(M.tick)>=R4P.urgM?R4P.urgK:1); } else if(cb<0) u+=cb*succ*(rp<R4P.stRp?1:0.6); }
      opts.push({k:'pass',u:u+noi(),m,X,Y,succ,through,dl,offF,rp,circ});
    }
    /* R4: cross in azione dalla fascia (anche dalla trequarti): uomini in area o in arrivo, Cross (CR) e Visione, piano (stile, ampiezza) */
    if(xr>R4P.crX && Math.abs(yr-34)>R4P.crY && p.role!=='GK'){ const box=t.on.filter(m=>m!==p && (rx(t,m.x)>86 || (rx(t,m.x)>78 && (m.vx*t.dir)>1.5)) && Math.abs(ry(t,m.y)-34)<15); if(box.length){ const at=box.reduce((s,m)=>s+(m.a.tes+m.a.ele)/2,0)/box.length;
      opts.push({k:'cross',u:(R4P.crU+R4P.crB*Math.min(3,box.length)*at/10)*(t.style==='cross'?1.4:1)*(t.plan.amp==='larga'?1.15:1)*(xr>88?1.15:1)+(p.a0.crs-10)*R4P.crS+noi(),box}); } }
    let ahead=99, aq=null; for(const q of o.on){ const qx=rx(t,q.x)-xr, qy=Math.abs(ry(t,q.y)-yr); if(qx>-0.5&&qx<8&&qy<4.5&&qx<ahead){ ahead=qx; aq=q; } }
    if(ahead>7){
      /* spazio libero davanti: si avanza palla al piede */
      const cxr=Math.min(103,xr+7), cyr=yr+(34-yr)*0.15, X=rx(t,cxr), Y=ry(t,cyr);
      opts.push({k:'carry',u:xT(cxr,cyr)*(xr>84?0.7:0.98)+(pathFree(p,o,X,Y,3)?0.008:0)+(press>6?0.012:0)+(press>5&&xr<70?R4P.carry:0)+noi(), X, Y});   /* v0.4.2.0: in area si tira invece di portare palla fino in porta */
    } else if(aq){
      /* dribbling: saltare l'uomo in velocità */
      const side=ry(t,aq.y)>yr?-1:1, cxr=Math.min(103,rx(t,aq.x)+5), cyr=clamp(yr+side*3,3,65), X=rx(t,cxr), Y=ry(t,cyr);
      let cover=false; for(const q of o.on){ if(q!==aq && hyp(q.x-X,q.y-Y)<5) cover=true; }
      const sp=p.a.dri*0.6+p.a.vel*0.3+p.a.for*0.1, dq=aq.a.con*0.6+aq.a.vel*0.3+aq.a.for*0.1;
      const pBeat=clamp(sp/(sp+dq*1.15)*(cover?0.55:1),0.08,0.75);
      /* R4: il portatore stima se saltare l'uomo da Dribbling (DR), Agilità (AG) ed Equilibrio (EQ) contro Contrasto e Marcatura; nella metà avversaria vale di più */
      const conf=(p.a0.dri-10)*R4P.drS+(p.gs.AG+p.gs.EQ-20)*R4P.drS*0.4-(aq.gs.MA-10)*R4P.drS*0.3;
      opts.push({k:'dribble',u:pBeat*(xT(cxr,cyr)*1.05+(xr>50?R4P.drV:R4P.drV*0.3))-(1-pBeat)*lossCost(xr)*R4P.drL+conf+noi(), X, Y, q:aq});
    }
    /* pressato ma con la strada libera alle spalle: si torna indietro verso la difesa */
    if(pressed && aq && ahead<5 && xr>12){ const bxr=xr-7, byr=yr+(34-yr)*0.1, X=rx(t,bxr), Y=ry(t,byr);
      if(pathFree(p,o,X,Y,4)) opts.push({k:'back',u:xT(bxr,byr)*0.82+noi(), X, Y}); }
    if(xr<18 && press<2.5) opts.push({k:'clear',u:0.03+noi()});
    else if(xr<R4P.clX && press<2 && Math.abs(yr-34)>R4P.clY) opts.push({k:'clear',u:R4P.clU+noi()});   /* R4: pressato sulla fascia nella propria metà: via la palla */
    if(contact && no){ const hold=clamp((p.a.for+p.a0.ctr*1.2)/((p.a.for+p.a0.ctr*1.2)+(no.a.con+no.a0.agg*0.4)*0.85),0.25,0.8);
      const ax=p.x-no.x, ay=p.y-no.y, n=hyp(ax,ay)||1; opts.push({k:'shield',u:hold*xT(xr,yr)*0.95+0.006-(1-hold)*lossCost(xr)*0.6+noi(), X:clamp(p.x+ax/n*1.3,1,PL-1), Y:clamp(p.y+ay/n*1.3,1,PW-1)}); }
    if(p.role==='GK'){ const fw=t.on.filter(m=>m!==p && (isAtt(m.role)||ROLE_GROUP[m.role]==='C')).sort((a,b)=>rx(t,b.x)-rx(t,a.x))[0]; if(fw) opts.push({k:'long',u:(R4P.gkLong[t.plan.costr]||0.022)+(o.press===2?0.02:0)+(p.a0.rin-10)*0.001+noi(),m:fw}); }   /* R4: il rinvio lungo dipende dalla costruzione del piano, dal pressing avversario e da Rinvio */
    /* solo il portiere davanti: si avanza verso la porta; se arriva un avversario si tira; se il tiro non c'è si passa per tenere palla */
    if(oneOnOne && !p.pf && !p.gkKick){
      const gk=gkOf(o), gkD=gk?hyp(gk.x-p.x,gk.y-p.y):99;
      let chase=99; for(const q of o.on){ if(q.role==='GK') continue; const d=hyp(q.x-p.x,q.y-p.y); if(d<chase) chase=d; }
      const lb=dx>1?laneBlock(p,o,gx):0, shotQ=dg<30&&dx>1 ? xgAt(dx,dy)*lb : 0;
      const canShoot = shotQ>0.05 && dg<24;
      const threat = chase<3.6 || gkD<3.2, tackleNow = chase<2.3 || gkD<3.2;
      if(canShoot && (tackleNow || dg<11.5 || (threat && dg<17))){ if(SO) SO.e('dec',SX,{p,k:'shoot',one:1}); return shoot(p,'open'); }
      if((!threat || (!tackleNow && canShoot)) && dg>=11.5){ const k=Math.min(7,dg-9), ty=34+dy*0.55, L=hyp(gx-p.x,ty-p.y)||1; p.cx=clamp(p.x+(gx-p.x)/L*k,1,PL-1); p.cy=clamp(p.y+(ty-p.y)/L*k,1,PW-1); p.dt=0.45; if(SO) SO.e('dec',SX,{p,k:'carry',one:1}); return; }
      const ps=opts.filter(x=>x.k==='pass'&&!x.offF).sort((a,b)=>(b.succ-(b.rp<2.5?0.25:0))-(a.succ-(a.rp<2.5?0.25:0)));
      if(ps.length && ps[0].succ>0.55){ if(SO) SO.e('dec',SX,{p,k:'pass',one:1,c:ps[0]}); return pass(p,ps[0]); }
      if(shotQ>0.02 && dg<15){ if(SO) SO.e('dec',SX,{p,k:'shoot',one:1}); return shoot(p,'open'); }
    }
    /* vicino alla porta con un buon tiro: non si passa a un compagno marcato */
    { const sh=opts.find(x=>x.k==='shoot'); if(sh) for(const x of opts) if(x.k==='pass' && !x.through && x.rp<2.5 && rx(t,x.X)>78) x.u-=0.03; }
    { let bu=-1; for(const x of opts) if(!x.circ && x.u>bu) bu=x.u; const f=clamp((R4P.fwdT-bu)/R4P.fwdT,0,1); if(f>0) for(const x of opts) if(x.circ) x.u+=x.circ*f; }   /* F9 */
    /* R4b F2: sulla rimessa dal fondo si calcia: solo passaggio o lancio (se non c'è nessuna delle due, lancio verso il compagno più avanti) */
    if(p.gkKick||p.pf){ for(let i=opts.length-1;i>=0;i--) if(opts[i].k!=='pass'&&opts[i].k!=='long') opts.splice(i,1);
      if(!opts.length){ const fw=t.on.filter(m=>m!==p).sort((a,b)=>rx(t,b.x)-rx(t,a.x))[0]; if(fw) opts.push({k:'long',u:0,m:fw}); } }
    opts.sort((a,b)=>b.u-a.u); let c=opts[0];
    /* ultima risorsa, rarissima: lancio lungo verso la propria punta */
    if(p.role!=='GK' && contact && (!c || c.u<0) && R()<0.15){ const fw=t.on.filter(m=>isAtt(m.role)).sort((a,b)=>rx(t,b.x)-rx(t,a.x))[0]; if(fw) c={k:'long',m:fw}; }
    if(!c) return;
    if(SO) SO.e('dec',SX,{p,k:c.k,c});
    if(c.k==='shoot') return shoot(p,'open');
    if(c.k==='pass'){ if(!c.through && c.dl<16 && xr>55 && xr<92 && p.role!=='GK' && !contact){ const WX=rx(t,Math.min(97,xr+11)), WY=ry(t,yr+(34-yr)*0.25); if(pathFree(p,o,WX,WY,2.5)) p.wall={t:M.tick,X:WX,Y:WY}; } return pass(p,c); }
    if(c.k==='cross') return cross(p,c.box);
    if(c.k==='long'){ if(M.gst) M.gst(p,p.role==='GK'?10:12); const m=c.m; const X=clamp(m.x+(R()-0.5)*8,2,PL-2), Y=clamp(m.y+(R()-0.5)*8,2,66); const dl=hyp(X-p.x,Y-p.y); t.st.pa++; p.s.pa++; fly('pass',p,X,Y,13+dl*0.22,dl*0.09,{recv:m,bad:R()>(p.role==='GK'?0.5+p.a0.rin/60:0.3+p.a.pas/60),offside:false,through:false}); return; }
    if(c.k==='clear'){ if(M.gst) M.gst(p,13); if(Math.abs(yr-34)>R4P.clY && R()<R4P.clO){ const sy=p.y<34?-1:1, ty=sy<0?-3:PW+3; fly('clear',p,clamp(p.x+t.dir*(6+R()*14),1,PL-1),ty,18,4); return; }   /* R4: spazzata in fallo laterale */
      if(xr<14 && R()<(press<2?0.3:0.12)){ const gl=t.dir>0?0:PL; fly('clear',p,gl-t.dir*4,p.y<34?34-FIS.GW-4-R()*12:34+FIS.GW+4+R()*12,22,3); return; }   /* v0.4.2.0: spazzata oltre la linea di fondo, l'angolo lo decide la geometria */ const fw=t.on.filter(m=>isAtt(m.role)).sort((a,b)=>rx(t,b.x)-rx(t,a.x))[0]; const tx= fw&&R()<0.6 ? clamp(fw.x+(R()-0.5)*10,1,PL-1) : rx(t,clamp(xr+40+R()*15,0,100)), ty= fw? clamp(fw.y+(R()-0.5)*14,2,66) : ry(t,10+R()*48); fly('clear',p,tx,ty,22,7); return; }
    p.cx=c.X; p.cy=c.Y;
    if(p.role==='GK' && p.hold){ p.cx=rx(t,Math.min(15.2,rx(t,p.cx))); p.cy=clamp(p.cy,34-19,34+19); }   /* R4, n. 23: con la palla in mano il portiere resta nella sua area */
    if(c.k==='dribble'){ if(M.gst) M.gst(p,5); p.drib=1.6; p.dt=0.8+R()*0.5; p.dq=c.q; }   /* R4: il difensore saltato (p.dq) affronta di sicuro il duello del dribbling */
    else if(c.k==='back') p.dt=1.3+R()*0.6;
    else if(c.k==='shield'){ if(M.gst) M.gst(p,14); p.shield=0.9; p.dt=0.6+R()*0.4; }
    else p.dt=1.0+R()*0.8;
  }
  function pass(p,c){
    const t=tm(p); t.st.pa++; p.s.pa++; if(M.gst) M.gst(p,c.dl>30?12:0);
    const fl=R()<p.fl; let succ=c.succ+(fl?0.18:0);
    if(fl && (c.through||c.dl>20)) E('flash',p.t,[p.id],fill2(P(MTX.flP),{p}),{flash:[p.id]});
    let X=c.X, Y=c.Y, bad=false;
    if(R()>succ){ bad=true; const a=R()*Math.PI*2; let e=(1.2+R()*5)*clamp(0.5+c.dl/25,0.6,1.6), ex=Math.cos(a), ey=Math.sin(a);
      if(c.m.role==='GK'){ e*=0.5; if(ex*t.dir<0) ex=-ex; }   /* v0.4.2.0: il retropassaggio sbagliato non finisce verso la porta */
      X=clamp(X+ex*e,1,PL-1); Y=clamp(Y+ey*e,1,PW-1); }
    const offside = offsideCall(t,c.m,p);
    fly('pass',p,X,Y,13+c.dl*0.22,c.dl>25?c.dl*0.09:0.15,{recv:c.m,bad,offside,through:c.through,keyLike:xT(rx(t,X),ry(t,Y))>0.06});
  }
  function cross(p,box,aim){
    const t=tm(p); const tg=box.sort((a,b)=>aerial(b,()=>0.5)-aerial(a,()=>0.5))[0];
    /* v0.4.2.0: cross respinto dal difensore che sta addosso (spesso in angolo) */
    if(!aim){ const [q,dq]=nearestOpp(p); if(q && dq<2.2 && R()<0.3+(q.a0.pos-10)*0.015){ t.st.pa++; p.s.pa++; q.s.int++; const gl=t.dir>0?PL:0, a=Math.atan2(0,gl-p.x)+(R()-0.5)*1.2, k=8+R()*8; loose(ball.x,ball.y,Math.cos(a)*k,Math.sin(a)*k,1+R()*3,0.3); ball.lastT=q.t; ball.lastP=q; ball.ct=M.tick; return; } }
    const left=ry(t,p.y)<34, wrong=(p.foot==='D'&&left)||(p.foot==='S'&&!left);
    const q=(ball.sp&&ball.sp.type==='cor'&&M.tick-ball.sp.t<2 ? (p.a0.crs+p.gs.CA)/2 : p.a0.crs)-(wrong?(20-p.gs.PD)*0.2:0), err=clamp((21-q)*0.45,1,9);
    /* C1b (n. 85, ok di Dani 16/11): chi crossa mira dove il compagno arriva quando arriva la palla, non dov'è adesso: durata del volo dalla fisica del
       cross (fisLoft, come fly), corsa del compagno che continua (posizione + velocità × durata), letta con l'errore di Visione (±30% × (1 − VI/20)) */
    let lx=tg.x, ly=tg.y; if(!aim){ const zt=(tg.h||180)/100-0.10, hz=Math.min(zt,(ball.z||0)+16);
      for(let it=0; it<2; it++){ const L=Math.max(0.5,hyp(lx-ball.x,ly-ball.y)), el=clamp(Math.atan2(16,L),0.1,1.05), tf=fisLoft(ball.x,ball.y,ball.z||0,lx,ly,hz,el,0,0).t*(1+(R()-0.5)*0.6*(1-p.a.vis/20));
        lx=clamp(tg.x+(tg.vx||0)*tf,1,PL-1); ly=clamp(tg.y+(tg.vy||0)*tf,1,PW-1); } }
    let X=(aim?aim[0]:rx(t,clamp(rx(t,lx)+R()*3-1,90,100)))+(R()-0.5)*err*0.6, Y=clamp((aim?aim[1]:ly)+(R()-0.5)*err,18,50);
    t.st.pa++; p.s.pa++; if(M.gst) M.gst(p,1); fly('cross',p,X,Y,20,4,{recv:tg,offside:offsideCall(t,tg,p),curl:(R()<0.5?1:-1)*(6+R()*8),z1:(tg.h||180)/100-0.10});   /* C1a (n. 82): il cross si calcia verso la fronte del compagno (prima 1,6 m per tutti, senza fonte) */
  }
  /* --- tiri (v0.4.2.0): il tiratore sceglie un punto della porta, la qualità decide errore di mira, potenza e rotazione,
     poi la palla vola con la fisica. Lo xG si calcola come prima solo per statistiche e pagelle: non decide l'esito.
     Blocchi dei difensori e intervento del portiere sono calcolati sulla traiettoria (shotPlan) e accadono quando la palla ci arriva. */
  const gn=Rf=>(Rf()+Rf()+Rf()+Rf()-2)*1.732;          // ~ normale standard
  function shoot(p, kind){
    const t=tm(p), o=op(p), gx=t.dir>0?PL:0, dx=Math.max(0.5,Math.abs(gx-p.x)), dy=p.y-34, dg=hyp(dx,dy); const [nq,press]=nearestOpp(p), pfat=nq?fatK(nq):0;   /* R4 (F6): il difensore stanco disturba meno il tiro */
    if(SO) SO.e('shot',SX,{p,kind}); if(M.gst) M.gst(p,kind==='head'?3:kind==='fk'||kind==='pen'?15:2);
    const fl = kind!=='pen' && R()<p.fl*1.5;
    const wf=(kind==='open'||kind==='first')&&weakFoot(p);
    const gk=gkOf(o);
    /* xG (come nella 0.4.1.3): solo per statistiche e pagelle */
    let xg;
    if(kind==='fk'){ xg=clamp(0.24-(dg-16)*0.012,0.04,0.24)*(0.6+p.a0.cpz/22)*(1.3-(gk?gk.a0.par:10)/33)*(0.9+(gk?(10-gk.a0.pos)*0.01:0)); }
    else { xg = kind==='pen'?0.6+(p.a0.cpz+p.a0.fre)/2*0.013 : xgAt(dx,dy);
      if(kind==='open') xg*=(press<1.2?0.6:press<2.5?0.82:1)*laneBlock(p,o,gx);
      if(kind==='first') xg*=(dg<8?1.3:dg<11?1.05:0.65)*laneBlock(p,o,gx);
      if(kind==='head') xg*=0.8*(0.55+p.a.tes/22); else if(kind!=='pen') xg*=dg>18?0.7+p.a0.lun/33:0.7+p.a.tir/33;
      if(dg<18) xg*=0.86+p.a0.fre/70; if(wf) xg*=0.82; if(fl) xg*=1.45; if(kind!=='pen') xg*=1-0.05*fatK(p);
      xg*=1.3-(gk?gk.a0.par:4)/33; if(kind!=='pen') xg*=FIN; xg=Math.min(0.92,xg); }
    /* uscita in anticipo del portiere sul tiro di prima ravvicinato (deve essere già addosso al tiratore) */
    if(kind==='first' && gk && D2(gk,p)<2.4 && handsOk(gk,ball.x,ball.y) && R()<0.12+gk.a0.usc/40){ t.st.sh++; p.s.sh++; gk.s.sv++; t.st.sot++; p.s.sot++; E('save',p.t,[p.id,gk.id],`${gk.ln} esce in anticipo e chiude lo specchio a ${p.ln}.`,{x:ball.x,y:ball.y}); if(SO) SO.e('shotres',SX,{p,res:'uscita'}); gkCatch(gk,1.5); return; }
    t.st.sh++; t.st.xg+=xg; p.s.sh++;
    if(fl) E('flash',p.t,[p.id],fill2(P(MTX.flS),{p}),{flash:[p.id]});
    /* punto mirato, potenza, rotazione */
    const gy=gk?gk.y:34; let ty, tz, v, side=0, top=0;
    if(kind==='pen'){ const pref=(p.hk&1)?1:-1, u=R(), sc=u<0.55?pref:u<0.9?-pref:0;
      ty=34+sc*(2.1+R()*1.0); tz=R()<0.62?0.15+R()*0.5:0.9+R()*1.0; v=19+p.gs.RI*0.22+R()*3; }
    else if(kind==='fk'){ const far=(ball.y<34?1:-1); ty=34+far*(2.3+R()*1.0); tz=1.35+R()*0.85; v=20.5+p.gs.PU*0.22+R()*2.5; top=30+R()*25; side=(R()<0.5?1:-1)*(20+R()*20); }
    else if(kind==='head'){ ty=34+(gy<34?1:-1)*(1.4+R()*1.9); tz=0.1+R()*1.7; v=9+p.a.tes*0.4+R()*3; }
    else { const lft=(34+FIS.GW)-gy, rgt=gy-(34-FIS.GW); let sc=lft>rgt?1:-1; if(R()<0.3) sc=-sc;
      const qa=clamp(((dg>18?p.a0.lun:p.a0.tir)-4)/16,0,1);
      ty=34+sc*(0.9+R()*1.6+qa*0.6); tz=R()<0.55?0.1+R()*0.5:0.6+R()*1.3;
      const far=dg>18; v= far? 25+(p.a0.lun-10)*0.45+R()*4 : dg<11? 18+(p.a0.tir-10)*0.35+R()*5 : 21+(p.a0.tir-10)*0.4+R()*5;
      if(kind==='first') v*=0.93; if(wf) v*=0.92; v*=1-0.015*fatK(p); if(!far||R()<0.5) side=(R()<0.5?1:-1)*(8+R()*20); }
    v=clamp(v,8,34);
    /* errore di mira: Tiro (o Tiro da fuori, Calci piazzati, Colpo di testa), Freddezza, pressione, piede, stanchezza */
    const Q= kind==='pen'?p.gs.RI*0.6+p.a0.fre*0.4 : kind==='fk'?p.gs.PU : kind==='head'?p.a0.tes : dg>18?p.a0.lun : p.a0.tir;
    let sig= kind==='pen' ? 0.026+(20-Q)*0.0018-(p.a0.fre-10)*0.001
      : SHOT_S0+(20-Q)*R4P.shQ+((kind==='open'||kind==='first')?0:(press<1.2?0.05:press<2.5?0.025:0)*(1-R4P.prF*pfat))+(wf?0.008+(20-p.gs.PD)*0.0016:0)-(p.a0.fre-10)*0.002+(kind==='first'?0.03:0)+(kind==='head'?0.06:0)+(kind==='fk'?-0.02:0);
    /* R4b (0.4.6.2, fisica reale): sig è un errore d'angolo (radianti) che dipende da Tiro, Freddezza, pressione, piede e velocità del tiro
       (+2% per ogni m/s sopra 22: più forte, meno preciso), uguale a ogni distanza: tolto il moltiplicatore ×1,3–3,9 «più largo da vicino» (0.4.2.0) */
    if(kind==='fk') sig*=R4P.fkS; else if(kind==='head') sig*=Math.max(0.7,1+0.02*(v-22));
    /* R4b (0.4.6.2, A: fisica del gesto, stime senza fonte numerica): l'angolo si allarga se chi tira corre (Equilibrio lo riduce), se il corpo è
       girato rispetto alla direzione del tiro (Agilità lo riduce) e, di prima, con la velocità della palla che arriva */
    if(kind==='open'||kind==='first'||kind==='head'){ const sp=hyp(p.vx||0,p.vy||0), az=Math.atan2(ty-ball.y,gx-ball.x), dO=Math.abs(fisAng((p.o||0)-az));
      sig+=0.006*sp*(1.3-p.gs.EQ*0.03) + 0.035*Math.min(2,dO/(Math.PI/2))*(1.3-p.gs.AG*0.03) + (kind!=='open'?0.0015*hyp(ball.vx||0,ball.vy||0):0); }
    /* R4b (0.4.6.2, passo 2): potenza contro precisione nei tiri in azione e di prima. Potenza massima da Tiro (Tiro da fuori oltre 18 m), piede,
       tiro di prima, stanchezza; con un difensore entro 1 / 2 m scende a ×0,85 / ×0,93 (appoggio ed equilibrio) e l'errore d'angolo cresce fino a ×1,8.
       L'errore cresce con la potenza scelta (×0,77 al 65%, ×1 all'80%, ×1,48 al 100%). Il tiratore sceglie la potenza (60–100%) stimando la
       probabilità di centrare la porta e quella che il portiere ci arrivi (stesso modello di gkDecide), con l'errore di giudizio di Decision making */
    let uPow=null;
    if(kind==='open'||kind==='first'){ const nd=nq?hyp(nq.x-p.x,nq.y-p.y):99; sig*=1+0.8*clamp(2-nd,0,1);
      const vF=clamp((dg>18?27+(p.a0.lun-10)*0.5:27+(p.a0.tir-10)*0.5)*(kind==='first'?0.93:1)*(wf?0.92:1)*(1-0.015*fatK(p))*(nd<1?0.85:nd<2?0.93:1),12,34);
      const Le=hyp(gx-ball.x,ty-ball.y), Phi=x=>1/(1+Math.exp(-1.702*x)), powF=u=>0.5+0.5*Math.pow(u/0.8,3), lo=34-FIS.GW-ty, hi=34+FIS.GW-ty;
      let best=-1, bu=0.8; for(const u of [0.6,0.7,0.8,0.9,1.0]){
        /* C1c (n. 89): la potenza si sceglie con lo stesso calcolo della stima (svAim: porta, portiere, difensori, palla che deve arrivare, costo) */
        const sc=svAim(o,gk,gx,ball.x,ball.y,ty,tz,sig,powF(u),u*vF)+(R()-0.5)*0.04*(22-p.a0.dec)/10; if(sc>best){ best=sc; bu=u; } }
      uPow=bu; v=bu*vF; sig*=powF(bu); }
    if(fl) sig*=0.55;
    const L0=hyp(gx-ball.x,ty-ball.y), b0=kind==='pen'?0.1:0;   /* R4b: fuori dal rigore nessuno scarto fisso in metri, solo l'angolo */ ty+=(b0+L0*sig)*gn(R); tz=Math.max(0.02,tz+(b0*0.8+L0*sig*0.85)*gn(R)+(kind==='pen'?0:L0*sig*0.35*Math.abs(gn(R))));
    const a=fisDirect(ball.x,ball.y,ball.z,gx,ty,tz,v,side,top); fisKick(ball,v,a.az,a.el,side,top);
    const wall=kind==='fk'&&ball.fkWall?ball.fkWall.ids:null; ball.fkWall=null;
    ball.owner=null; p.hold=false; ball.lastT=p.t; ball.lastP=p;
    ball.fl={type:'shot', t:p.t, from:p, kind, gk, xg, pw:uPow, sg:sig, x0:ball.x, y0:ball.y, z0:ball.z, x1:gx, y1:ty, z1:tz, tA:a.t, el:0, n:Math.max(1,Math.ceil(a.t/DT)), k:0, h:0, wall, tried:0};
    ball.sh={p, kind, tick:M.tick, f:ball.fl, done:false, sot:false};
    if(kind==='pen' && gk) penDive(gk,p);
    if(SO) SO.e('fly',SX,{f:ball.fl, speed:v});
    shotPlan(ball.fl);
  }
  /* rigore: il portiere sceglie un lato al momento del calcio (o resta al centro, raramente) */
  function penDive(gk,p){ const pref=(p.hk&1)?1:-1, u=R(); const s= u<0.07?0 : u<0.07+0.93*(0.5+(gk.a0.pos-10)*0.01) ? pref : -pref;
    if(s===0){ gk.dv={t0:M.tick*DT, dur:0.5, x0:gk.x, y0:gk.y, x1:gk.x, y1:gk.y, s:0, tl:0, lie:1.2}; return; }   /* R4, n. 11: chi resta al centro resta fermo */
    const sgn=gk.t===0?(T[0].dir>0?1:-1):(T[1].dir>0?1:-1);
    /* v0.4.6.0 (R4, PROBLEMI_NOTI n. 11): tuffo vero sul lato scelto (circa 2 m, più lungo per i portieri alti e con buone Parate) */
    gk.dv={t0:M.tick*DT, dur:0.55, x0:gk.x, y0:gk.y, x1:gk.x+sgn*0.3, y1:34+s*(1.9+(gk.h-186)*0.008+(gk.a0.par-10)*0.02), s, tl:1.3, lie:1.4}; }
  /* il portiere arriva sulla traiettoria? tempo di reazione, spostamento e tuffo (Parate, altezza), presa o respinta (Presa) */
  function gkDecide(f,gk,tc,yc,zc,ly,lz,vAt){
    const onFrame= ly!=null && Math.abs(ly-34)<FIS.GW+0.3 && lz+FIS.R<FIS.GH+0.3;
    const par=gk.a0.par, hh=gk.h||186, arm=0.57*hh/100+FIS.R-0.3;   /* R4b (0.4.6.2): tolto gkN. C1c (3a): di lato spalla più braccio 0,57 × statura + raggio della palla (Winter; prima 0,85 + 0,3 m senza fonte) */
    const pen=f.kind==='pen';
    let bodyY=gk.y, avail, tr=0;
    if(pen){ const d=gk.dv; if(d){ const u=clamp((tc-(d.t0-M.tick*DT))/d.dur,0,1), e=u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2; bodyY=d.y0+(d.y1-d.y0)*e*R4P.penK; } avail=0.25; }   /* R4: il tuffo visibile è più ampio (n. 11), la parata resta tarata come prima */
    /* R4b (0.4.6.2, fisica reale; fonti lette solo come riassunti, vedi docs/PROGRESSI_R4b.md): reazione ~0,25 s (Parate la sposta di 0,008 s a punto),
       poi il baricentro accelera da fermo fino al picco reale 3,5–4,2 m/s (Parate) in GK_TA s; nessun fattore casuale: la varietà viene da reazione, posizione e corpo */
    else { const g=gkAvail(gk,tc,yc,f.screen); tr=g.tr; avail=g.avail; }   /* C1c: gkAvail, la stessa funzione della stima del tiro */

    const dy=yc-bodyY, ady=Math.abs(dy), hz=zc+FIS.R;
    if(!onFrame && ady>arm+avail+0.4){ return; }
    const vert= hz>2.05?(hz-2.05)*1.6 : (hz<0.35&&ady>0.9?0.15:0), need=pen?Math.max(0,hyp(Math.max(0,ady-0.15),vert)-(arm-0.15)):Math.max(0,ady-gkLat(hh,hz));   /* C1c (3a): fuori dal rigore la portata di gkLat (ellisse tra braccio di lato e verso l'alto); il rigore resta come prima */
    const reach= need<=avail, side=dy>=0?1:-1;
    if(!pen){ const mv=reach?Math.max(0,ady-arm*0.7):avail; const dive=mv>0.45||(hz<0.45&&ady>0.6);
      if(mv>0.12){ const sgn=T[f.t].dir; gk.dv={t0:M.tick*DT+tr, dur:clamp(mv/4+0.18,0.25,0.55), x0:gk.x, y0:gk.y, x1:gk.x-sgn*0.15, y1:clamp(gk.y+side*Math.min(mv,2.4),20,48), s:side, tl:dive?1.2:0.25, lie:dive?0.7:0.2}; } }
    let res='miss';
    if(reach){ const pc=gkCatchP(gk,vAt,ady,hz,pen); res=R()<pc?'catch':'parry'; }
    f.gkp={t:tc, res, y:yc, z:zc};
  }
  /* il portiere arriva sulla palla: presa o respinta (che può finire in angolo, sul palo o, raramente, in porta) */
  function doSave(f){ const gk=f.gk, g=f.gkp; f.gkDone=true; if(!gk.on || g.res==='miss') return;
    { const gl=T[gk.t].dir>0?0:PL; if(Math.abs(ball.x-gl)<Math.abs(gk.x-gl)-1) return; }   /* R4: con il portiere più largo da vicino (gkN) mai una parata con la palla già oltre il portiere (R2b) */
    ball.ct=M.tick;
    ball.fl=null;
    if(g.res==='catch' && handsOk(gk,ball.x,ball.y)){ shotEnd('save',gk); gkCatch(gk,2.2); return; }
    if(M.gst) M.gst(gk,8);
    const v=Math.hypot(ball.vx,ball.vy,ball.vz), side=Math.sign(ball.y-34)||1, hz=ball.z+FIS.R;
    if(hz>1.95 && RP()<0.6){ ball.vx*=0.35; ball.vy*=0.5; ball.vz=Math.abs(ball.vz)*0.4+2.5+RP()*2.5; }   // toccata sopra la traversa
    else { /* respinta: il portiere la spinge verso l'esterno (spesso in angolo), raramente torna davanti alla porta */
      const out=RP()<0.78, behind=out&&RP()<0.55; ball.vx=(behind?1:-1)*ball.vx*(out?0.06+RP()*0.14:0.15+RP()*0.25); ball.vy=ball.vy*0.2+side*(out?0.3+RP()*0.3:0.08+RP()*0.15)*v; ball.vz=Math.abs(ball.vz)*0.3+0.5+RP()*3; }
    ball.wx=0; ball.wy=0; ball.wz=0; ball.nd=null; ball.lastT=gk.t; ball.lastP=gk; shotEnd('save',gk); }
  /* esito di un tiro (una volta sola per tiro): evento, statistiche, sonda */
  function shotEnd(res, q, cross){ const sh=ball.sh; if(!sh||sh.done) return; sh.done=true; const p=sh.p, t=tm(p), f=sh.f, k=sh.kind, gk=f.gk;
    f.res=res; if(cross) f.cross=cross;
    if(res==='save'){ t.st.sot++; p.s.sot++; sh.sot=true; if(gk){ gk.s.sv++; gk.s.svv+=(Math.abs(T[0].goals-T[1].goals)<=1 && minNum(M.tick)>=75 ? 1.4 : 1)*(f.xg>0.25?1.5:1); } }
    const g=q&&q.role==='GK'?q:gk;
    if(k==='pen'){ E('miss',p.t,[p.id].concat(g?[g.id]:[]), res==='save'?fill2(MTX.pmiss[0],{s:p,g:g||p}) : res==='post'?`Palo! ${p.ln} colpisce il palo dal dischetto.` : fill2(MTX.pmiss[1],{s:p,g:g||p})); }
    else if(res==='save') E('save',p.t,[p.id].concat(g?[g.id]:[]),fill2(P(k==='fk'?MTX.fkSave:MTX.save),{s:p,g:g||p}),{x:ball.x,y:ball.y,...(k==='fk'?{fk:1}:{})});
    else if(res==='block') E('block',p.t,[p.id,q.id],fill2(P(k==='fk'?MTX.fkWall:MTX.block),{s:p,d:q}));
    else if(res==='post') E('post',p.t,[p.id],fill2(P(MTX.post),{s:p}));
    else if(res==='wide') E('wide',p.t,[p.id].concat(gk?[gk.id]:[]),fill2(P(k==='fk'?MTX.fkWide:MTX.wide),{s:p,g:gk||p}),k==='fk'?{x:ball.x,y:ball.y,fk:1}:undefined);
    if(SO) SO.e('shotend',SX,{f});
  }
  /* rimessa laterale: si lancia la palla con le mani a un compagno vicino e libero */
  function throwIn(t,tk,r){
    const o=T[1-t.idx]; let best=null, bu=-9;
    for(const m of t.on){ if(m===tk || m.role==='GK') continue; const d=hyp(m.x-r.x,m.y-r.y); if(d<4||d>24) continue;
      let rp=99; for(const q of o.on){ const dd=hyp(q.x-m.x,q.y-m.y); if(dd<rp) rp=dd; }
      const fwd=(rx(t,m.x)-rx(t,r.x))/20, u=Math.min(rp,6)*0.35+fwd*0.6-d*0.03+(pathFree(tk,o,m.x,m.y,1.5)?0.6:0)+R()*0.3;
      if(u>bu){ bu=u; best={m,rp,d}; } }
    /* R5b (n. 56, regola 15): chi batte non può tenere la palla. Senza compagni tra 4 e 24 m la lancia al compagno più adatto fino a 30 m
       (lancio lungo con le mani); senza nessuno, la lancia in avanti lungo la linea */
    if(!best) for(const m of t.on){ if(m===tk || m.role==='GK') continue; const d=hyp(m.x-r.x,m.y-r.y); if(d<1.5||d>30) continue;
      let rp=99; for(const q of o.on){ const dd=hyp(q.x-m.x,q.y-m.y); if(dd<rp) rp=dd; }
      const u=Math.min(rp,6)*0.35-d*0.05+(pathFree(tk,o,m.x,m.y,1.5)?0.6:0)+R()*0.3; if(u>bu){ bu=u; best={m,rp,d}; } }
    if(!best){ const X=clamp(r.x+t.dir*12,1,PL-1), Y=r.y<34?3:PW-3; t.st.pa++; tk.s.pa++; fly('clear',tk,X,Y,11,1.0,{z1:0}); ball.nd={k:'thr',t:t.idx}; return; }
    const m=best.m, X=clamp(m.x+(R()-0.5)*1.5,1,PL-1), Y=clamp(m.y+(R()-0.5)*1.5,1,PW-1), dl=hyp(X-r.x,Y-r.y);
    t.st.pa++; tk.s.pa++; if(M.gst) M.gst(tk,11);
    fly('pass',tk,X,Y,9+dl*0.18,1.0+dl*0.05,{recv:m,bad:R()<(best.rp<1.8?0.35:0.08),offside:false,through:false,z1:0.6});
    ball.nd={k:'thr',t:t.idx};   /* R5 (regola 15, PROBLEMI_NOTI n. 46): dalla rimessa non si segna direttamente: vale finché qualcuno non tocca la palla */
  }
  return {nearestOpp, handsOk, gkCatch, firstTime, firstPass, defGaps, oppMidLine, pathFree, aerial, weakFoot, lossCost, decide, pass, cross, gn, shoot, penDive, gkDecide, doSave, shotEnd, throwIn};
}
