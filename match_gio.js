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
  function gkCatch(g, delay){ const hx=ball.x-g.x, hy=ball.y-g.y, hz=Math.max(0.3,Math.min(2.6,ball.z+FIS.R)); giveBall(g, delay); g.hold=true; g.hx=hx; g.hy=hy; g.hz=hz; }

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
      if(best && R()<0.35+p.a.vis*0.015){ if(SO) SO.e('dec',SX,{p,k:'prima-scarico'}); firstPass(p,best,best.x,best.y,bd,'scarico'); return true; } }
    return false;
  }
  function firstPass(p,m,X,Y,dl,why){
    const t=tm(p); t.st.pa++; p.s.pa++;
    const [,press]=nearestOpp(p);
    const succ=clamp(0.95-dl*0.014*(1.5-p.a.pas/20)-(press<1.6?0.12:0),0.2,0.93);
    let bad=false; if(R()>succ){ bad=true; const a=R()*Math.PI*2, e=2+R()*6; X=clamp(X+Math.cos(a)*e,1,PL-1); Y=clamp(Y+Math.sin(a)*e,1,PW-1); }
    const offside = offsideCall(t,m);
    fly('pass',p,X,Y,17+dl*0.2,0.12,{recv:m,bad,offside,through:why==='uno-due',first:true,keyLike:xT(rx(t,X),ry(t,Y))>0.06});
  }

  /* varchi tra i difensori avversari (coordinate della squadra che attacca) */
  function defGaps(t){
    const o=T[1-t.idx]; const ys=o.on.filter(q=>q.role!=='GK').map(q=>({x:rx(t,q.x),y:ry(t,q.y)})).sort((a,b)=>b.x-a.x).slice(0,5).map(q=>q.y).sort((a,b)=>a-b);
    const e=[2,...ys,66], g=[]; for(let i=0;i<e.length-1;i++){ const w=e[i+1]-e[i]; if(w>=5) g.push({y:(e[i]+e[i+1])/2,w}); } return g;
  }
  function oppMidLine(t){ const o=T[1-t.idx]; const ms=o.on.filter(q=>ROLE_GROUP[q.role]==='C'); return ms.length? ms.reduce((s,q)=>s+rx(t,q.x),0)/ms.length : 60; }
  function pathFree(p,o,X,Y,r){ for(const q of o.on){ if(segDist(q.x,q.y,p.x,p.y,X,Y)<r || hyp(q.x-X,q.y-Y)<r) return false; } return true; }
  const aerial=(q,R)=>q.a.tes+q.a.ele*0.6+(q.h-180)*0.13+q.a.for*0.2+R()*8;
  const weakFoot=p=>p.foot!=='A' && hashN((p.hk*31+M.tick)>>>0)<0.28;   /* v0.4.2.0: il piede debole da hash, non da R() */
  const lossCost=x=>(0.03+0.2*Math.exp(-x/14))*1.5;

  function decide(p){
    p.ft=false;
    const t=tm(p), o=op(p), xr=rx(t,p.x), yr=ry(t,p.y), [no,press]=nearestOpp(p);
    const contact=press<1.6, pressed=press<3;
    const opts=[]; const noi=()=> (R()-0.5)*0.025*(22-p.a.dec+fatK(p)*6)/10;
    const gx=t.dir>0?PL:0, dx=Math.abs(gx-p.x), dy=p.y-34, dg=hyp(dx,dy);
    let goalSide=0; for(const q of o.on){ if(q.role==='GK') continue; if(Math.abs(q.x-gx)<Math.abs(p.x-gx)-0.5 && Math.abs(q.y-p.y)<10) goalSide++; }
    let chase0=99; for(const q of o.on){ if(q.role==='GK') continue; const d=hyp(q.x-p.x,q.y-p.y); if(d<chase0) chase0=d; }
    const oneOnOne = goalSide===0 && dg<34 && p.role!=='GK' && chase0>2.2;   /* v0.4.2.0: con un avversario addosso non è un uno contro uno */
    if(oneOnOne && dg>11){ const X=p.x+(gx-p.x)/dg*7, Y=p.y+(34-p.y)/dg*7; opts.push({k:'carry',u:0.12+noi(),X,Y}); }
    if(dg<30 && dx>1){ const lb=laneBlock(p,o,gx), xg=xgAt(dx,dy)*(press<1.2?0.6:press<2.5?0.82:1)*lb;
      if(xg>(oneOnOne?(dg<13?0.05:0.14):(press>3?0.23:0.32))) opts.push({k:'shoot',u:xg*(0.8+(p.a.tir-10)*0.03)+(dg<11?0.03:0)+noi()});
      else if(dg>=16 && dg<=28 && press>3.4 && lb>0.55 && Math.abs(dy)<16){ opts.push({k:'shoot',u:xg*1.15+0.008+(p.a0.lun-10)*0.006+noi()}); } }
    const off=offLineFor(t), gaps=defGaps(t);
    /* passaggi: la precisione cala con la distanza e crolla quando si è a contatto con l'avversario */
    let centralShut=true; { const gxr=Math.min(100,xr+18); for(const m of t.on){ if(m===p) continue; const mx=rx(t,m.x), my=ry(t,m.y); if(mx>xr+4 && Math.abs(my-34)<16 && mx<gxr+20){ let rp0=99; for(const q of o.on){ const dd=hyp(q.x-m.x,q.y-m.y); if(dd<rp0) rp0=dd; } if(rp0>3.5 && pathFree(p,o,m.x,m.y,1.8)){ centralShut=false; break; } } } }
    for(const m of t.on){ if(m===p) continue; const d=D2(p,m); const wide=Math.abs(ry(t,m.y)-34)>18; if(d<3||d>(wide?55:45)) continue; if(m.role==='GK' && (xr>40||press>3)) continue;
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
      let offF=false; if(!through && txr>off+0.3 && txr>52.5){ if(R()>0.1*(1.6-p.a.vis/20)) continue; offF=true; }
      const X=rx(t,txr), Y=ry(t,tyr); let risk=0;
      for(const q of o.on){ const sd=segDist(q.x,q.y,p.x,p.y,X,Y); if(sd<2.4) risk+=(2.4-sd)/2.4*(0.5+q.a.pos/40); }
      if(hyp(X-p.x,Y-p.y)>28) risk*=0.6;
      let rp=99; for(const q of o.on){ const dd=hyp(q.x-X,q.y-Y); if(dd<rp) rp=dd; }
      if(through && rp<2.5) continue;
      const dl=hyp(X-p.x,Y-p.y);
      const PAS=p.role==='GK'?(p.a0.pas+p.a0.rin*2)/3:p.a0.pas; let succ=1.04-dl*0.003*(1.6-PAS/20)-risk*0.2;
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
      opts.push({k:'pass',u:u+noi(),m,X,Y,succ,through,dl,offF,rp});
    }
    if(xr>80 && Math.abs(yr-34)>12){ const box=t.on.filter(m=>rx(t,m.x)>88 && Math.abs(ry(t,m.y)-34)<12); if(box.length){ const at=box.reduce((s,m)=>s+(m.a.tes+m.a.ele)/2,0)/box.length;
      opts.push({k:'cross',u:(0.03+0.016*box.length*at/10)*(t.style==='cross'?1.5:1)+noi(),box}); } }
    let ahead=99, aq=null; for(const q of o.on){ const qx=rx(t,q.x)-xr, qy=Math.abs(ry(t,q.y)-yr); if(qx>-0.5&&qx<8&&qy<4.5&&qx<ahead){ ahead=qx; aq=q; } }
    if(ahead>7){
      /* spazio libero davanti: si avanza palla al piede */
      const cxr=Math.min(103,xr+7), cyr=yr+(34-yr)*0.15, X=rx(t,cxr), Y=ry(t,cyr);
      opts.push({k:'carry',u:xT(cxr,cyr)*(xr>84?0.7:0.98)+(pathFree(p,o,X,Y,3)?0.008:0)+(press>6?0.012:0)+noi(), X, Y});   /* v0.4.2.0: in area si tira invece di portare palla fino in porta */
    } else if(aq){
      /* dribbling: saltare l'uomo in velocità */
      const side=ry(t,aq.y)>yr?-1:1, cxr=Math.min(103,rx(t,aq.x)+5), cyr=clamp(yr+side*3,3,65), X=rx(t,cxr), Y=ry(t,cyr);
      let cover=false; for(const q of o.on){ if(q!==aq && hyp(q.x-X,q.y-Y)<5) cover=true; }
      const sp=p.a.dri*0.6+p.a.vel*0.3+p.a.for*0.1, dq=aq.a.con*0.6+aq.a.vel*0.3+aq.a.for*0.1;
      const pBeat=clamp(sp/(sp+dq*1.15)*(cover?0.55:1),0.08,0.75);
      opts.push({k:'dribble',u:pBeat*xT(cxr,cyr)*1.05-(1-pBeat)*lossCost(xr)+noi(), X, Y, q:aq});
    }
    /* pressato ma con la strada libera alle spalle: si torna indietro verso la difesa */
    if(pressed && aq && ahead<5 && xr>12){ const bxr=xr-7, byr=yr+(34-yr)*0.1, X=rx(t,bxr), Y=ry(t,byr);
      if(pathFree(p,o,X,Y,4)) opts.push({k:'back',u:xT(bxr,byr)*0.82+noi(), X, Y}); }
    if(xr<18 && press<2.5) opts.push({k:'clear',u:0.03+noi()});
    if(contact && no){ const hold=clamp((p.a.for+p.a0.ctr*1.2)/((p.a.for+p.a0.ctr*1.2)+(no.a.con+no.a0.agg*0.4)*0.85),0.25,0.8);
      const ax=p.x-no.x, ay=p.y-no.y, n=hyp(ax,ay)||1; opts.push({k:'shield',u:hold*xT(xr,yr)*0.95+0.006-(1-hold)*lossCost(xr)*0.6+noi(), X:clamp(p.x+ax/n*1.3,1,PL-1), Y:clamp(p.y+ay/n*1.3,1,PW-1)}); }
    if(p.role==='GK'){ const fw=t.on.filter(m=>m!==p && (isAtt(m.role)||ROLE_GROUP[m.role]==='C')).sort((a,b)=>rx(t,b.x)-rx(t,a.x))[0]; if(fw) opts.push({k:'long',u:0.045+(o.press===2?0.02:0)+noi(),m:fw}); }
    /* solo il portiere davanti: si avanza verso la porta; se arriva un avversario si tira; se il tiro non c'è si passa per tenere palla */
    if(oneOnOne){
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
    opts.sort((a,b)=>b.u-a.u); let c=opts[0];
    /* ultima risorsa, rarissima: lancio lungo verso la propria punta */
    if(p.role!=='GK' && contact && (!c || c.u<0) && R()<0.15){ const fw=t.on.filter(m=>isAtt(m.role)).sort((a,b)=>rx(t,b.x)-rx(t,a.x))[0]; if(fw) c={k:'long',m:fw}; }
    if(!c) return;
    if(SO) SO.e('dec',SX,{p,k:c.k,c});
    if(c.k==='shoot') return shoot(p,'open');
    if(c.k==='pass'){ if(!c.through && c.dl<16 && xr>55 && xr<92 && p.role!=='GK' && !contact){ const WX=rx(t,Math.min(97,xr+11)), WY=ry(t,yr+(34-yr)*0.25); if(pathFree(p,o,WX,WY,2.5)) p.wall={t:M.tick,X:WX,Y:WY}; } return pass(p,c); }
    if(c.k==='cross') return cross(p,c.box);
    if(c.k==='long'){ const m=c.m; const X=clamp(m.x+(R()-0.5)*8,2,PL-2), Y=clamp(m.y+(R()-0.5)*8,2,66); const dl=hyp(X-p.x,Y-p.y); t.st.pa++; p.s.pa++; fly('pass',p,X,Y,13+dl*0.22,dl*0.09,{recv:m,bad:R()>(p.role==='GK'?0.5+p.a0.rin/60:0.3+p.a.pas/60),offside:false,through:false}); return; }
    if(c.k==='clear'){ if(xr<14 && R()<(press<2?0.3:0.12)){ const gl=t.dir>0?0:PL; fly('clear',p,gl-t.dir*4,p.y<34?34-FIS.GW-4-R()*12:34+FIS.GW+4+R()*12,22,3); return; }   /* v0.4.2.0: spazzata oltre la linea di fondo, l'angolo lo decide la geometria */ const fw=t.on.filter(m=>isAtt(m.role)).sort((a,b)=>rx(t,b.x)-rx(t,a.x))[0]; const tx= fw&&R()<0.6 ? clamp(fw.x+(R()-0.5)*10,1,PL-1) : rx(t,clamp(xr+40+R()*15,0,100)), ty= fw? clamp(fw.y+(R()-0.5)*14,2,66) : ry(t,10+R()*48); fly('clear',p,tx,ty,22,7); return; }
    p.cx=c.X; p.cy=c.Y;
    if(c.k==='dribble'){ p.drib=1.6; p.dt=0.8+R()*0.5; }
    else if(c.k==='back') p.dt=1.3+R()*0.6;
    else if(c.k==='shield'){ p.shield=0.9; p.dt=0.6+R()*0.4; }
    else p.dt=1.0+R()*0.8;
  }
  function pass(p,c){
    const t=tm(p); t.st.pa++; p.s.pa++;
    const fl=R()<p.fl; let succ=c.succ+(fl?0.18:0);
    if(fl && (c.through||c.dl>20)) E('flash',p.t,[p.id],fill2(P(MTX.flP),{p}),{flash:[p.id]});
    let X=c.X, Y=c.Y, bad=false;
    if(R()>succ){ bad=true; const a=R()*Math.PI*2; let e=(1.2+R()*5)*clamp(0.5+c.dl/25,0.6,1.6), ex=Math.cos(a), ey=Math.sin(a);
      if(c.m.role==='GK'){ e*=0.5; if(ex*t.dir<0) ex=-ex; }   /* v0.4.2.0: il retropassaggio sbagliato non finisce verso la porta */
      X=clamp(X+ex*e,1,PL-1); Y=clamp(Y+ey*e,1,PW-1); }
    const offside = offsideCall(t,c.m);
    fly('pass',p,X,Y,13+c.dl*0.22,c.dl>25?c.dl*0.09:0.15,{recv:c.m,bad,offside,through:c.through,keyLike:xT(rx(t,X),ry(t,Y))>0.06});
  }
  function cross(p,box,aim){
    const t=tm(p); const tg=box.sort((a,b)=>aerial(b,()=>0.5)-aerial(a,()=>0.5))[0];
    /* v0.4.2.0: cross respinto dal difensore che sta addosso (spesso in angolo) */
    if(!aim){ const [q,dq]=nearestOpp(p); if(q && dq<2.2 && R()<0.3+(q.a0.pos-10)*0.015){ t.st.pa++; p.s.pa++; q.s.int++; const gl=t.dir>0?PL:0, a=Math.atan2(0,gl-p.x)+(R()-0.5)*1.2, k=8+R()*8; loose(ball.x,ball.y,Math.cos(a)*k,Math.sin(a)*k,1+R()*3,0.3); ball.lastT=q.t; ball.lastP=q; ball.ct=M.tick; return; } }
    const left=ry(t,p.y)<34, wrong=(p.foot==='D'&&left)||(p.foot==='S'&&!left);
    const q=(ball.sp&&ball.sp.type==='cor'&&M.tick-ball.sp.t<2 ? (p.a0.crs+p.a0.cpz)/2 : p.a0.crs)-(wrong?2.5:0), err=clamp((21-q)*0.45,1,9);
    let X=(aim?aim[0]:rx(t,clamp(rx(t,tg.x)+R()*3-1,90,100)))+(R()-0.5)*err*0.6, Y=clamp((aim?aim[1]:tg.y)+(R()-0.5)*err,18,50);
    t.st.pa++; p.s.pa++; fly('cross',p,X,Y,20,4,{recv:tg,curl:(R()<0.5?1:-1)*(6+R()*8)});
  }
  /* --- tiri (v0.4.2.0): il tiratore sceglie un punto della porta, la qualità decide errore di mira, potenza e rotazione,
     poi la palla vola con la fisica. Lo xG si calcola come prima solo per statistiche e pagelle: non decide l'esito.
     Blocchi dei difensori e intervento del portiere sono calcolati sulla traiettoria (shotPlan) e accadono quando la palla ci arriva. */
  const gn=Rf=>(Rf()+Rf()+Rf()+Rf()-2)*1.732;          // ~ normale standard
  function shoot(p, kind){
    const t=tm(p), o=op(p), gx=t.dir>0?PL:0, dx=Math.max(0.5,Math.abs(gx-p.x)), dy=p.y-34, dg=hyp(dx,dy); const [,press]=nearestOpp(p);
    if(SO) SO.e('shot',SX,{p,kind});
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
      ty=34+sc*(2.1+R()*1.0); tz=R()<0.62?0.15+R()*0.5:0.9+R()*1.0; v=19+p.a0.cpz*0.22+R()*3; }
    else if(kind==='fk'){ const far=(ball.y<34?1:-1); ty=34+far*(2.3+R()*1.0); tz=1.35+R()*0.85; v=20.5+p.a0.cpz*0.22+R()*2.5; top=30+R()*25; side=(R()<0.5?1:-1)*(20+R()*20); }
    else if(kind==='head'){ ty=34+(gy<34?1:-1)*(1.4+R()*1.9); tz=0.1+R()*1.7; v=9+p.a.tes*0.4+R()*3; }
    else { const lft=(34+FIS.GW)-gy, rgt=gy-(34-FIS.GW); let sc=lft>rgt?1:-1; if(R()<0.3) sc=-sc;
      const qa=clamp(((dg>18?p.a0.lun:p.a0.tir)-4)/16,0,1);
      ty=34+sc*(0.9+R()*1.6+qa*0.6); tz=R()<0.55?0.1+R()*0.5:0.6+R()*1.3;
      const far=dg>18; v= far? 25+(p.a0.lun-10)*0.45+R()*4 : dg<11? 18+(p.a0.tir-10)*0.35+R()*5 : 21+(p.a0.tir-10)*0.4+R()*5;
      if(kind==='first') v*=0.93; if(wf) v*=0.92; v*=1-0.06*fatK(p); if(!far||R()<0.5) side=(R()<0.5?1:-1)*(8+R()*20); }
    v=clamp(v,8,34);
    /* errore di mira: Tiro (o Tiro da fuori, Calci piazzati, Colpo di testa), Freddezza, pressione, piede, stanchezza */
    const Q= kind==='pen'?p.a0.cpz*0.6+p.a0.fre*0.4 : kind==='fk'?p.a0.cpz : kind==='head'?p.a0.tes : dg>18?p.a0.lun : p.a0.tir;
    let sig= kind==='pen' ? 0.026+(20-Q)*0.0018-(p.a0.fre-10)*0.001
      : SHOT_S0+(20-Q)*0.0035+(press<1.2?0.05:press<2.5?0.025:0)+(wf?0.03:0)+fatK(p)*0.005-(p.a0.fre-10)*0.002+(kind==='first'?0.03:0)+(kind==='head'?0.06:0)+(kind==='fk'?-0.02:0);
    if(kind!=='pen'){ const L1=hyp(gx-ball.x,34-ball.y); sig*=kind==='fk'?1.5:clamp(SHOT_ERR-(L1-11)*0.16,1.3,SHOT_ERR); }   /* errore calibrato (vedi STATO.md): più largo da vicino, dove i corpi veri creano più occasioni */
    if(fl) sig*=0.55;
    const L0=hyp(gx-ball.x,ty-ball.y), b0=kind==='pen'?0.1:0.3; ty+=(b0+L0*sig)*gn(R); tz=Math.max(0.02,tz+(b0*0.8+L0*sig*0.85)*gn(R)+(kind==='pen'?0:L0*sig*0.35*Math.abs(gn(R))));
    const a=fisDirect(ball.x,ball.y,ball.z,gx,ty,tz,v,side,top); fisKick(ball,v,a.az,a.el,side,top);
    const wall=kind==='fk'&&ball.fkWall?ball.fkWall.ids:null; ball.fkWall=null;
    ball.owner=null; p.hold=false; ball.lastT=p.t; ball.lastP=p;
    ball.fl={type:'shot', t:p.t, from:p, kind, gk, xg, x0:ball.x, y0:ball.y, z0:ball.z, x1:gx, y1:ty, z1:tz, tA:a.t, el:0, n:Math.max(1,Math.ceil(a.t/DT)), k:0, h:0, wall, tried:0};
    ball.sh={p, kind, tick:M.tick, f:ball.fl, done:false, sot:false};
    if(kind==='pen' && gk) penDive(gk,p);
    if(SO) SO.e('fly',SX,{f:ball.fl, speed:v});
    shotPlan(ball.fl);
  }
  /* rigore: il portiere sceglie un lato al momento del calcio (o resta al centro, raramente) */
  function penDive(gk,p){ const pref=(p.hk&1)?1:-1, u=R(); const s= u<0.07?0 : u<0.07+0.93*(0.5+(gk.a0.pos-10)*0.01) ? pref : -pref;
    if(s===0) return; const sgn=gk.t===0?(T[0].dir>0?1:-1):(T[1].dir>0?1:-1);
    gk.dv={t0:M.tick*DT, dur:0.5, x0:gk.x, y0:gk.y, x1:gk.x+sgn*0.3, y1:34+s*(1.3+(gk.h-186)*0.005), s, tl:1.25, lie:1.4}; }
  /* il portiere arriva sulla traiettoria? tempo di reazione, spostamento e tuffo (Parate, altezza), presa o respinta (Presa) */
  function gkDecide(f,gk,tc,yc,zc,ly,lz,vAt){
    const onFrame= ly!=null && Math.abs(ly-34)<FIS.GW+0.3 && lz+FIS.R<FIS.GH+0.3;
    const par=gk.a0.par, hh=gk.h||186, arm=0.85+(hh-186)*0.004+(tc<0.45&&f.kind!=='pen'?0.3:0);   /* da vicino il portiere si allarga (gambe e braccia aperte) */
    const pen=f.kind==='pen';
    let bodyY=gk.y, avail, tr=0;
    if(pen){ const d=gk.dv; if(d){ const u=clamp((tc-(d.t0-M.tick*DT))/d.dur,0,1), e=u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2; bodyY=d.y0+(d.y1-d.y0)*e; } avail=0.25; }
    else { tr=0.13-(par-10)*0.008+(f.screen?0.08:0); const dmax=2.6+(par-10)*0.04+(hh-186)*0.008, vd=GK_VD+(par-10)*0.09; avail=Math.max(0,Math.min(dmax,(tc-tr)*vd))*(0.82+0.36*R()); }
    const dy=yc-bodyY, ady=Math.abs(dy), hz=zc+FIS.R;
    if(!onFrame && ady>arm+avail+0.4){ return; }
    const vert= hz>2.05?(hz-2.05)*1.6 : (hz<0.35&&ady>0.9?0.15:0), need=Math.max(0,hyp(Math.max(0,ady-(pen?0.15:0.3)),vert)-(pen?arm-0.15:arm));
    const reach= need<=avail+(pen?0:0), side=dy>=0?1:-1;
    if(!pen){ const mv=reach?Math.max(0,ady-arm*0.7):avail; const dive=mv>0.45||(hz<0.45&&ady>0.6);
      if(mv>0.12){ const sgn=T[f.t].dir; gk.dv={t0:M.tick*DT+tr, dur:clamp(mv/4+0.18,0.25,0.55), x0:gk.x, y0:gk.y, x1:gk.x-sgn*0.15, y1:clamp(gk.y+side*Math.min(mv,2.4),20,48), s:side, tl:dive?1.2:0.25, lie:dive?0.7:0.2}; } }
    let res='miss';
    if(reach){ const pc=clamp(0.62+(gk.a0.pre-10)*0.035-Math.max(0,vAt-17)*0.03-(ady>1.2?0.25:0)-(hz>1.9||hz<0.3?0.15:0)-(pen?0.25:0),0.05,0.93); res=R()<pc?'catch':'parry'; }
    f.gkp={t:tc, res, y:yc, z:zc};
  }
  /* il portiere arriva sulla palla: presa o respinta (che può finire in angolo, sul palo o, raramente, in porta) */
  function doSave(f){ const gk=f.gk, g=f.gkp; f.gkDone=true; if(!gk.on || g.res==='miss') return; ball.ct=M.tick;
    ball.fl=null;
    if(g.res==='catch' && handsOk(gk,ball.x,ball.y)){ shotEnd('save',gk); gkCatch(gk,2.2); return; }
    const v=Math.hypot(ball.vx,ball.vy,ball.vz), side=Math.sign(ball.y-34)||1, hz=ball.z+FIS.R;
    if(hz>1.95 && RP()<0.6){ ball.vx*=0.35; ball.vy*=0.5; ball.vz=Math.abs(ball.vz)*0.4+2.5+RP()*2.5; }   // toccata sopra la traversa
    else { /* respinta: il portiere la spinge verso l'esterno (spesso in angolo), raramente torna davanti alla porta */
      const out=RP()<0.78, behind=out&&RP()<0.55; ball.vx=(behind?1:-1)*ball.vx*(out?0.06+RP()*0.14:0.15+RP()*0.25); ball.vy=ball.vy*0.2+side*(out?0.3+RP()*0.3:0.08+RP()*0.15)*v; ball.vz=Math.abs(ball.vz)*0.3+0.5+RP()*3; }
    ball.wx=0; ball.wy=0; ball.wz=0; ball.lastT=gk.t; ball.lastP=gk; shotEnd('save',gk); }
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
    if(!best){ ball.z=0; giveBall(tk,0.6); return; }
    const m=best.m, X=clamp(m.x+(R()-0.5)*1.5,1,PL-1), Y=clamp(m.y+(R()-0.5)*1.5,1,PW-1), dl=hyp(X-r.x,Y-r.y);
    t.st.pa++; tk.s.pa++;
    fly('pass',tk,X,Y,9+dl*0.18,1.0+dl*0.05,{recv:m,bad:R()<(best.rp<1.8?0.35:0.08),offside:false,through:false,z1:0.6});
  }
  return {nearestOpp, handsOk, gkCatch, firstTime, firstPass, defGaps, oppMidLine, pathFree, aerial, weakFoot, lossCost, decide, pass, cross, gn, shoot, penDive, gkDecide, doSave, shotEnd, throwIn};
}
