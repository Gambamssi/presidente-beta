/* match_all.js — v0.4.2.2 (T1): piano dell'allenatore: forma, linee, bersagli, calci piazzati, cambi, scelte dalla panchina (base per R3).
   Funzioni spostate da simMatch (match.js) senza cambiarne il corpo: matchAll(M) è chiamata da simMatch all'inizio della partita
   e restituisce le funzioni, che restano chiusure come prima. M è il contesto condiviso: le variabili riassegnate durante la partita
   si leggono e scrivono come M.x (tick, half, regEnd, restart, ht2, errLeft, bsN); gli altri valori di simMatch e le funzioni degli altri moduli
   arrivano nelle variabili qui sotto con M.link (stessi oggetti, nessuna copia). Script classico: nessun import/export. */
function matchAll(M){
  let RC, T, all, rx, ry, ball, ref, minNum, E, nearestOpp, defGaps, oppMidLine, aerial, offLineFor, D2;
  M.link.push(()=>{ ({RC, T, all, rx, ry, ball, ref, minNum, E}=M); ({nearestOpp, defGaps, oppMidLine, aerial}=M.mGio); ({offLineFor}=M.mArb); ({D2}=M.mFis); });
  function setForm(t, form, xiPlayers){
    t.form=form; t.slots=FORMATIONS[form].map(([r,y])=>({r,y}));
    const pool=xiPlayers.filter(p=>!p.out);
    const x=bestXI(pool, form); t.on=[];
    x.xi.forEach((pp,i)=>{ if(!pp) return; const p=all.get(pp.id); p.slot=i; p.role=t.slots[i].r; p.on=true; t.on.push(p); });
  }

  function kickoffPos(t, kicking, tele){
    t.on.forEach(p=>{ let xr=Math.min(ROLE_X[p.role]*0.82,48), yr=t.slots[p.slot].y; if(kicking && p.role==='ST'){ xr=50.5; yr=34+(yr-34)*0.3; } const X=rx(t,xr), Y=ry(t,yr); if(tele){ p.x=X; p.y=Y; } p.tx=X; p.ty=Y; p.urg=false; });
  }
  function specOf(t,k,f){ const id=t.spec[k]; const p=id!=null?t.on.find(q=>q.id===id):null; return p || t.on.filter(q=>q.role!=='GK').sort((a,b)=>f(b)-f(a))[0]; }
  function gkOf(t){ return t.on.find(p=>p.role==='GK'); }

  /* --- posizioni obiettivo: la squadra si muove come un blocco --- */
  const LINE_OFF={GK:0,CB:0,LB:1.5,RB:1.5,LWB:6,RWB:6,DM:8,CM:15,LM:17,RM:17,AM:22,LW:26,RW:26,ST:30};
  const supCache=new Map();
  function freeSpot(p, t, o, ox, oy, rad){
    let best=null, bv=-99;
    for(let k=0;k<8;k++){ const ang=-Math.PI*0.75+k*(Math.PI*1.5/7); const fx=Math.cos(ang), fy=Math.sin(ang);
      const xr=clamp(rx(t,ox)+fx*rad,4,100), yr=clamp(ry(t,oy)+fy*rad,3,65); const X=rx(t,xr), Y=ry(t,yr);
      let near=99; for(const q of o.on){ const d=hyp(q.x-X,q.y-Y); if(d<near) near=d; }
      let lane=99; for(const q of o.on){ const d=segDist(q.x,q.y,ox,oy,X,Y); if(d<lane) lane=d; }
      const v=Math.min(near,8)*0.2+Math.min(lane,4)*0.2+fx*0.3-hyp(X-p.x,Y-p.y)*0.02;
      if(v>bv){ bv=v; best=[X,Y]; } }
    return best;
  }
  function endCel(){
    const r=M.restart;
    M.restart={type:'kick', team:r.team, x:52.5, y:34, ticks:24, bs:'roll', fetch:true};   /* v0.4.2.0: un giocatore di chi ha subito il gol va a prendere la palla in rete e la rimanda a centrocampo */
    kickoffPos(T[0],r.team===0,false); kickoffPos(T[1],r.team===1,false);
  }
  function celTargets(t){
    const r=M.restart, el=M.tick-r.t0;
    t.on.forEach((p,i)=>{
      if(t.idx===r.scTeam){
        if(p===r.scorer){ p.tx=r.cx; p.ty=r.cy; p.urg=true; return; }
        if(p.role==='GK'){ p.tx=rx(t,5); p.ty=34; p.urg=false; return; }
        const a=i*0.62, sc=r.scorer, rr=1.6+(i%3)*1.1; p.tx=clamp(sc.x+Math.cos(a)*rr,0.5,PL-0.5); p.ty=clamp(sc.y+Math.sin(a)*rr,0.5,PW-0.5); p.urg=el>4 && D2(p,sc)>5;
      } else {
        const xr=Math.min(ROLE_X[p.role]*0.82,48), yr=t.slots[p.slot].y; p.tx=rx(t,xr); p.ty=ry(t,yr); p.urg=false;
      }
    });
  }
  function penTargets(t){
    const r=M.restart, A=T[r.team];
    if(!r.spots){
      const spots=[]; for(let y=15;y<=53.1;y+=2.4){ if(hyp(87-94,y-34)>=9.6) spots.push([87,y]); } for(let y=18;y<=50.1;y+=3) spots.push([84,y]);
      const pl=[...T[0].on,...T[1].on].filter(q=>q!==r.taker && q.role!=='GK').sort((a,b)=>Math.abs(rx(A,a.x)-90)-Math.abs(rx(A,b.x)-90));
      r.spots=new Map(); const used=new Set();
      for(const q of pl){ let bi=-1,bd=1e9; spots.forEach((sp,i)=>{ if(used.has(i)) return; const d=hyp(rx(A,sp[0])-q.x, ry(A,sp[1])-q.y); if(d<bd){bd=d;bi=i;} }); if(bi>=0){ used.add(bi); r.spots.set(q.id,[rx(A,spots[bi][0]),ry(A,spots[bi][1])]); } }
    }
    for(const p of t.on){
      if(p===r.taker){ p.tx=rx(A,92); p.ty=34; p.urg=true; continue; }
      if(p.role==='GK'){ if(t!==A){ p.tx=rx(A,104.6); p.ty=34; p.urg=true; } continue; }
      const sp=r.spots.get(p.id); if(sp){ p.tx=sp[0]; p.ty=sp[1]; p.urg=true; }
    }
  }
  function cornerPts(A,r){ const cy=ry(A,r.y), s=cy<34?-1:1; return {near:[99.3,34+s*3.2], far:[98.5,34-s*4.6], spot:[93.5,34-s*0.5], edge:[84.5,34-s*3], short:[r.x,0], s}; }
  function setPieceAttack(t,A,r,target,taker){
    const ps=t.on.filter(p=>p!==taker && p.role!=='GK').sort((a,b)=>aerial(b,()=>0.5)-aerial(a,()=>0.5));
    const tp=target||[95,34], S=[[tp[0],tp[1]],[tp[0]-2,tp[1]+3],[tp[0]+1,tp[1]-4],[97,34+(tp[1]<34?5:-5)],[92,34],[90,29],[85,40],[60,26],[58,42],[52,34]];
    ps.forEach((p,i)=>{ const sp=S[Math.min(i,S.length-1)]; p.tx=rx(t,sp[0]); p.ty=ry(t,sp[1]); p.urg=true; });
  }
  function setPieceDefend(t,A,r,wall){
    const atk=T[1-t.idx].on.filter(q=>q.role!=='GK' && rx(t,q.x)<22).sort((a,b)=>aerial(b,()=>0.5)-aerial(a,()=>0.5));
    const ps=t.on.filter(p=>p.role!=='GK' && !(wall&&wall.has(p.id))).sort((a,b)=>aerial(b,()=>0.5)-aerial(a,()=>0.5));
    const zone=[[5,34],[5,30],[5,38],[8,32],[8,36],[11,34],[3,40],[13,28],[13,40],[17,34],[30,34]];
    ps.forEach((p,i)=>{ let X,Y; const m=(t.mark!=='zona')?atk[i]:null;
      if(m){ const gx=t.dir>0?0:PL, k=1.1/Math.max(1,hyp(gx-m.x,34-m.y)); X=m.x+(gx-m.x)*k; Y=m.y+(34-m.y)*k; }
      else { const sp=zone[Math.min(i,zone.length-1)]; X=rx(t,sp[0]); Y=ry(t,sp[1]); }
      p.tx=X; p.ty=Y; p.urg=true; });
    const g=gkOf(t); if(g){ g.tx=rx(t,1.2); g.ty=34; }
  }
  function corTargets(t){
    const r=M.restart, A=T[r.team], atk=t===A, pts=cornerPts(A,r);
    if(atk){ const sch=A.scheme, target= sch==='primo'?pts.near : sch==='secondo'?pts.far : sch==='limite'?[pts.edge[0]+6,pts.edge[1]] : pts.spot;
      setPieceAttack(t,A,r,target,r.taker);
      if(sch==='limite'||sch==='corto'){ const helper=t.on.filter(p=>p!==r.taker && p.role!=='GK' && !isDefR(p.role)).sort((a,b)=>sch==='limite'?(b.a0.lun-a.a0.lun):(b.a0.crs+b.a0.pas)-(a.a0.crs+a.a0.pas))[0];
        if(helper){ if(sch==='limite'){ helper.tx=rx(t,pts.edge[0]); helper.ty=ry(t,pts.edge[1]); } else { const cy=ry(A,r.y); helper.tx=rx(t,99); helper.ty=ry(t,cy<34?6:62); } helper.urg=true; r.helper=helper; } }
      if(r.taker){ r.taker.tx=r.x; r.taker.ty=r.y; r.taker.urg=true; } }
    else setPieceDefend(t,A,r,null);
  }
  function fkTargets(t){
    const r=M.restart, A=T[r.team], atk=t===A, gx=A.dir>0?PL:0;
    if(r.direct && !r.wallPos){ const dx=gx-r.x, dy=34-r.y, d=hyp(dx,dy), ux=dx/d, uy=dy/d, wx=r.x+ux*9.15, wy=r.y+uy*9.15+(r.y<34?-0.9:0.9)*0;
      const D=T[1-r.team]; const ws=D.on.filter(q=>q.role!=='GK').sort((a,b)=>((b.h||180)+b.a.ele)-((a.h||180)+a.a.ele)).slice(0,r.wall);
      r.wallPos=new Map(); ws.forEach((q,i)=>{ const off=(i-(ws.length-1)/2)*0.65 + (r.y<34?-1:1)*0.6; r.wallPos.set(q.id,[wx-uy*off, wy+ux*off]); }); r.wallIds=new Set(ws.map(q=>q.id)); }
    if(atk){ if(r.direct||r.crossFk){ setPieceAttack(t,A,r,r.crossFk?[94,34]:[96,34],r.taker); if(r.taker){ r.taker.tx=r.x; r.taker.ty=r.y; r.taker.urg=true; } } }
    else if(r.direct||r.crossFk){ setPieceDefend(t,A,r,r.wallIds||null); if(r.wallPos) for(const p of t.on){ const w=r.wallPos.get(p.id); if(w){ p.tx=w[0]; p.ty=w[1]; p.urg=true; } }
      const g=gkOf(t); if(g && r.direct){ const side=ry(A,r.y)<34?1:-1; g.tx=rx(t,0.8); g.ty=ry(t,34+side*1.2); } }
  }
  function runProb(t,p){
    const [,pr]=nearestOpp(ball.owner); const time=pr>3?1:pr>1.8?0.5:0.15;
    if(p.role==='ST'||p.role==='LW'||p.role==='RW'){ const m=fwdMode(t,p); return (m==='linea'?0.03:m==='spazi'?0.016:0.004)*time; }
    return (isAtt(p.role)?0.012:0.006)*time;
  }
  function assignMarks(t){
    const o=T[1-t.idx]; t.marks=new Map(); if(t.mark==='zona') return;
    const opp=o.on.filter(q=>q.role!=='GK');
    if(t.mark==='mista'){ const best=t.on.filter(p=>p.role==='CB'||p.role==='DM').sort((a,b)=>(b.a.con+b.a.for)-(a.a.con+a.a.for))[0]; const danger=opp.filter(q=>isAtt(q.role)).sort((a,b)=>(b.a.tir+b.a.dri+b.a.vel)-(a.a.tir+a.a.dri+a.a.vel))[0]; if(best&&danger) t.marks.set(best.id,danger); return; }
    const mine=t.on.filter(p=>isDefR(p.role)||p.role==='DM'||p.role==='CM'); const free=new Set(opp);
    const nomX=(r)=>ROLE_X[r];
    const pairs=[]; for(const p of mine) for(const q of opp){ const d=hyp(nomX(p.role)-(105-nomX(q.role)), (t.slots[p.slot].y)-(PW-o.slots[q.slot].y)); pairs.push([d,p,q]); }
    pairs.sort((a,b)=>a[0]-b[0]); const used=new Set();
    for(const [d,p,q] of pairs){ if(used.has(p.id)||!free.has(q)) continue; if(d>30) continue; t.marks.set(p.id,q); used.add(p.id); free.delete(q); }
  }
  function fwdMode(t,p){ return t.fwd[p.id] || (p.role==='ST'?'spazi':p.a.vel>=12?'linea':'spazi'); }
  function targets(t){
    for(const p of t.on) p.fq=null;
    if(M.restart && M.restart.type==='cel'){ celTargets(t); return; }
    if(M.restart && M.restart.type==='kick'){ kickoffPos(t, M.restart.team===t.idx, false); return; }
    const o=T[1-t.idx], possT = M.restart&&M.restart.type!=='kick'? M.restart.team : ball.owner?ball.owner.t : ball.fl?ball.fl.t : ball.lastT, inPoss=possT===t.idx;
    const brx=rx(t,ball.x), bry=ry(t,ball.y), off=offLineFor(t), gaps=defGaps(t);
    const counter = inPoss && M.tick<t.counterUntil;
    if(inPoss && (t.wsT==null || M.tick-t.wsT>4)){ t.wsT=M.tick; let l=0,r=0; for(const q of o.on){ if(q.role==='GK') continue; const qx=rx(t,q.x), qy=ry(t,q.y); if(qx<brx-5) continue; const w=1+(isDefR(q.role)?0.3:0); if(qy<34) l+=w; else r+=w; } t.weak = l<r-0.5 ? 1 : r<l-0.5 ? -1 : (t.weak||1); }
    let line, depth, width, shift;
    if(inPoss){ line=clamp(brx-25+Math.max(0,t.ment)*3,12,55); depth=counter?48:(brx>68?44:40); width=1.15; shift=0.12; }
    else { line=clamp(brx-25+t.ment*1.5+(t.press===2?5:0),6,40); depth=brx<28?24:29; width=0.7; shift=0.4;
      if(!M.restart){
        const lo={alta:6,media:0,bassa:-6}[t.lineH]||0;
        let tgt=clamp(brx-22+lo,5,40);
        const bo=ball.owner; let pr=99; if(bo && bo.t!==t.idx) for(const q of t.on){ const d=D2(q,bo); if(d<pr) pr=d; }
        const backPass = ball.fl && ball.fl.t!==t.idx && ball.fl.type==='pass' && rx(t,ball.fl.x1)>rx(t,ball.fl.x0)+3;
        if(t.trap && (backPass || pr<2.2) && brx>28) { tgt+=5; t.stepT=M.tick; }
        else if(bo && bo.t!==t.idx && pr>5 && brx>26 && brx<66) tgt-=4;
        tgt=Math.min(tgt, Math.max(4,brx-2)); if(brx<20) tgt=Math.max(3.5,Math.min(tgt,brx-3));
        if(t.dline==null) t.dline=tgt;
        const sp=(tgt>t.dline? 1.7 : 2.4)*(0.85+t.on.filter(q=>isDefR(q.role)).reduce((s,q)=>s+q.a.vel,0)/Math.max(1,t.on.filter(q=>isDefR(q.role)).length)/60);
        t.dline += clamp(tgt-t.dline,-sp,sp);
        line=t.dline;
      } }
    if(inPoss) t.dline=null;
    const k=depth/30;
    for(const p of t.on){
      p.urg=false; p.ucap=1; p.eng=null; p.fq=null; let xr, yr=t.slots[p.slot].y;
      if(M.restart && M.restart.type==='kick') continue;
      if(p.role==='GK'){ xr=clamp(3+Math.max(0,line-14)*0.25,2.5,12); yr=34+(bry-34)*0.22;
        /* v0.4.2.0: senza palla il portiere sta sulla linea tra la palla e il centro della porta (chiude l'angolo), più avanti quando la palla è vicina */
        const db=hyp(brx,bry-34);
        if(!inPoss && db<36){ const dG=clamp(0.7+(db-5)*0.14,0.7,4.2), ux=brx/Math.max(db,0.1), uy=(bry-34)/Math.max(db,0.1); xr=Math.max(0.6,ux*dG); yr=34+uy*dG; p.urg=db<24;
          const bo=ball.owner; if(bo && bo.t!==t.idx && db<16){ let def=0; for(const q of t.on){ if(q===p) continue; const qx=rx(t,q.x); if(qx<brx-0.5 && Math.abs(ry(t,q.y)-bry)<8) def++; } if(def===0){ const k=clamp(0.42-(db-8)*0.02,0.25,0.5); xr=Math.max(xr,brx*k); yr=34+(bry-34)*(1-k*0.6); } } } }
      else {
        xr=line+LINE_OFF[p.role]*k;
        yr=34+(yr-34)*width+(bry-34)*shift;
        if(inPoss){
          const side=t.slots[p.slot].y<34?1:-1, onWeak=side===t.weak;
          if(isFB(p.role) && brx>30){ xr=Math.max(xr, Math.min(onWeak?92:84, brx+(onWeak?12:5)+t.ment*2)); yr=side>0?4:64; }
          if(p.role==='LM'||p.role==='RM'||p.role==='LW'||p.role==='RW'){ yr=side>0?(onWeak?5:9):(onWeak?63:59); if(onWeak && brx>35) xr=Math.max(xr, Math.min(off-1, brx+14)); }
          if((p.role==='CM'||p.role==='AM') && brx>35) xr=Math.max(xr, Math.min(off-3, brx+(p.role==='AM'?10:4)));
          if(p.role!=='CB' && brx>30 && ball.owner && ball.owner.t===t.idx){ p.urg=true; p.ucap=0.58; }
          if(brx<26 && p.role==='CB') yr=34+(t.slots[p.slot].y-34)*1.8;
          if(brx>68){ if(p.role==='ST') xr=Math.max(xr,91+(p.slot%2)*2); }
          if(!isDefR(p.role)){ const cap=Math.max(off-0.7,48);
            if(p.runT>0){ xr=off-0.6+(p.runOff||0); if(gaps.length){ let g=gaps[0]; for(const G of gaps) if(Math.abs(G.y-ry(t,p.y))<Math.abs(g.y-ry(t,p.y))) g=G; yr=yr*0.3+g.y*0.7; } }
            else if((p.role==='ST'||p.role==='LW'||p.role==='RW') && brx>30){
              const mode=fwdMode(t,p);
              if(mode==='linea') xr=off-1.0;
              else if(mode==='spazi'){ xr=off-1.2; if(gaps.length){ let g=gaps[0]; for(const G of gaps) if(Math.abs(G.y-yr)<Math.abs(g.y-yr)) g=G; yr=g.y; } }
              else { const ml=oppMidLine(t); xr=clamp((off+ml)/2, Math.min(brx+4,off-6), off-5);
                if(ball.owner && ball.owner.t===t.idx){ const oxr=rx(t,ball.owner.x), oyr=ry(t,ball.owner.y); if(xr-oxr>16) xr=oxr+14; yr=yr*0.55+oyr*0.45; } }
              if(brx>72){ const farSide=(t.slots[p.slot].y-34)*(bry-34)<0;
                if(p.role==='ST') xr=Math.max(xr, mode==='tra'?86:93);
                else if(farSide){ xr=Math.max(xr,91); yr=34+Math.sign(t.slots[p.slot].y-34)*7; } }
              xr=Math.min(xr,cap+0.1);
            } else xr=Math.min(xr,cap); }
        } else {
          if(isDefR(p.role)) xr = t.dline!=null ? t.dline : Math.min(xr, Math.max(5,brx-1.5));
          else if(ROLE_GROUP[p.role]==='C') xr=Math.min(xr, brx+8);
          if(M.restart && M.restart.type==='gk') xr=Math.min(xr,84);
          if(!M.restart && rx(t,p.x)>xr+4) p.urg=true;
        }
        xr=clamp(xr,4,100); yr=clamp(yr,2,66);
      }
      p.tx=rx(t,xr); p.ty=ry(t,yr);
      if(inPoss && !isDefR(p.role) && p.role!=='GK' && rx(t,p.x)>off-1.0 && rx(t,p.x)>52.5){ p.urg=true; if(rx(t,p.x)>off-0.3) p.tx=rx(t,Math.min(rx(t,p.tx),off-1.5)); }   /* chi è oltre la linea del fuorigioco rientra subito */
    }
    if(M.restart){ if(M.restart.type==='pen') penTargets(t); else if(M.restart.type==='cor') corTargets(t); else if(M.restart.type==='fk' && (M.restart.direct||M.restart.crossFk)) fkTargets(t); return; }
    const gx=t.dir>0?0:PL;
    if(!inPoss && ball.owner){
      const bo=ball.owner;
      const trig = M.tick<t.pressUntil || (t.press===2 && M.tick-t.lostT<6);
      const zone = t.press===2 ? brx>42 : brx<58;
      const cand=t.on.filter(p=>p.role!=='GK').sort((a,b)=>D2(a,bo)-D2(b,bo));
      const first=cand[0], second=cand[1], third=cand[2];
      if(first && bo.role!=='GK'){
        const d0=D2(first,bo), close=brx<32, kk=(trig||close?(close?0.9:1.15):clamp((brx-20)/12,1.3,2.4))/Math.max(1,hyp(gx-bo.x,34-bo.y));
        if(trig || zone || d0<8 || brx<35){ const kq=brx<14?0.35/Math.max(1,hyp(gx-bo.x,34-bo.y)):kk; first.tx=bo.x+(gx-bo.x)*kq; first.ty=bo.y+(34-bo.y)*kq; first.urg=trig||d0<12||brx<35; first.eng=trig||close?'press':'contain'; first.fq=bo; }
        if(second){ if(trig){ let tgt=null,td=99; for(const q of o.on){ if(q===bo||q.role==='GK') continue; const d=D2(q,bo); if(d<td&&d<22){td=d;tgt=q;} } if(tgt){ second.tx=(tgt.x+bo.x)/2; second.ty=(tgt.y+bo.y)/2; second.urg=true; second.eng='lane'; second.fq=bo; } }
          else if(brx<45){ const k2=6/Math.max(1,hyp(gx-bo.x,34-bo.y)); second.tx=bo.x+(gx-bo.x)*k2; second.ty=bo.y+(34-bo.y)*k2; second.eng='cover'; second.urg=brx<30; second.fq=bo; } }
        if(trig && third && D2(third,bo)<18){ third.tx=bo.x+(gx-bo.x)*0.04; third.ty=bo.y+(bry<34?6:-6)*t.dir; third.urg=true; third.eng='press'; third.fq=bo; }
      }
      /* copertura: se esce un difensore sul portatore, il compagno più vicino della linea copre alle sue spalle */
      if(first && isDefR(first.role) && first.eng){ const cov=t.on.filter(q=>q!==first && isDefR(q.role)).sort((a,b)=>D2(a,first)-D2(b,first))[0];
        if(cov){ const k5=5/Math.max(1,hyp(gx-first.x,34-first.y)); cov.tx=first.x+(gx-first.x)*k5; cov.ty=first.y+(34-first.y)*k5*1.6; cov.urg=true; cov.eng='cover'; } }
      /* marcatura a uomo: chi ha un avversario assegnato lo segue quando entra nella nostra metà */
      for(const p of t.on){ const m=t.marks.get(p.id); if(!m || p.eng || !m.on || m===bo) continue; if(rx(t,m.x)>48 && !isDefR(p.role)) continue; if(rx(t,m.x)>58) continue;
        const k4=1.3/Math.max(1,hyp(gx-m.x,34-m.y)); p.tx=m.x+(gx-m.x)*k4; p.ty=m.y+(34-m.y)*k4; p.urg=true; p.eng='man'; p.fq=m; }
      const deep=brx<34, marked=new Set();
      for(const p of t.on){ if(p.eng||p.role==='GK') continue; if(!isDefR(p.role)&&ROLE_GROUP[p.role]!=='C') continue;
        const inLine=isDefR(p.role) && t.dline!=null && !deep;
        let m=null,md=deep?15:8; for(const q of o.on){ if(q===bo||marked.has(q)) continue; const d=hyp(q.x-p.tx,q.y-p.ty); if(d<md){md=d;m=q;} }
        if(m) marked.add(m);
        if(m){ const k3=(deep?1.25:1.5)/Math.max(1,hyp(gx-m.x,34-m.y)); const w=deep?0.93:0.5; if(!inLine) p.tx=p.tx*(1-w)+(m.x+(gx-m.x)*k3)*w; p.ty=p.ty*(1-w)+(m.y+(34-m.y)*k3)*w; if(deep){ p.urg=true; p.fq=m; } } }
    }
    if(inPoss && ball.owner && ball.owner.t===t.idx){
      const bo=ball.owner, brx2=rx(t,bo.x);
      const sup=t.on.filter(p=>p!==bo && p.role!=='GK' && p.runT<=0 && !((p.role==='ST'||p.role==='LW'||p.role==='RW') && fwdMode(t,p)==='linea')).sort((a,b)=>D2(a,bo)-D2(b,bo)).slice(0,3);
      for(const p of sup){ let c=supCache.get(p.id); if(!c||M.tick-c.t>3){ c={t:M.tick,s:freeSpot(p,t,o,bo.x,bo.y,11+(counter?4:0))}; supCache.set(p.id,c); } if(c.s){ p.tx=p.tx*0.3+c.s[0]*0.7; p.ty=p.ty*0.3+c.s[1]*0.7; } }
      const byr=ry(t,bo.y);
      if(brx2>40 && Math.abs(byr-34)>16){ const fb=t.on.find(p=>isFB(p.role) && Math.sign(ry(t,p.y)-34)===Math.sign(byr-34) && p!==bo);
        if(fb && rx(t,fb.x)<brx2+4){ fb.tx=rx(t,Math.min(95,brx2+11)); fb.ty=ry(t,byr<34?5:63); fb.urg=true; } }
      if(counter) for(const p of t.on){ if(isAtt(p.role)&&p!==bo){ p.tx=rx(t,Math.max(rx(t,p.tx),Math.min(off-0.5,brx2+18))); p.urg=true; } }
    }
    if(!ball.owner && !ball.fl){ const inBox=rx(t,ball.x)<18 && Math.abs(ball.y-34)<21, cs=t.on.filter(p=>p.role!=='GK'||(inBox && hyp(p.x-ball.x,p.y-ball.y)<12)).sort((a,b)=>D2(a,ball)-D2(b,ball)).slice(0,inBox?2:1);
      for(const c of cs){ c.tx=ball.x+(ball.vx||0)*0.4; c.ty=ball.y+(ball.vy||0)*0.4; c.urg=true; }
      /* palla vagante nella sua area piccola (o poco fuori): il portiere esce sempre a prenderla */
      const g=gkOf(t); if(g && !g.dv && rx(t,ball.x)<9 && Math.abs(ball.y-34)<12 && ball.z<2){ g.tx=ball.x+(ball.vx||0)*0.3; g.ty=ball.y+(ball.vy||0)*0.3; g.urg=true; } }
    /* v0.4.2.0: palla che rotola verso la porta: il portiere si mette sulla sua strada */
    if(!ball.owner && (!ball.fl || ball.fl.type!=='shot')){ const g=gkOf(t), gl=t.dir>0?0:PL, vt=(gl-ball.x)*(ball.vx||0);
      if(g && !g.dv && vt>0 && Math.abs(ball.x-gl)<30){ const tl=Math.abs(ball.x-gl)/Math.max(0.5,Math.abs(ball.vx)), yl=ball.y+ball.vy*tl; if(tl<4 && Math.abs(yl-34)<FIS.GW+1.5){ const xg=gl+t.dir*0.8, k=Math.abs(xg-ball.x)/Math.max(0.5,Math.abs(ball.vx)); g.tx=xg; g.ty=clamp(ball.y+ball.vy*k,34-FIS.GW,34+FIS.GW); g.urg=true; } } }
    if(ball.fl && ball.fl.recv && ball.fl.recv.t===t.idx){ const f=ball.fl, r=f.recv; r.tx=f.x1; r.ty=f.y1; r.urg=true;
      if(f.chase){ r.tx=ball.x+ball.vx*0.45; r.ty=ball.y+ball.vy*0.45; }
      else
      /* v0.4.2.0: sul passaggio rasoterra il compagno va incontro alla palla sulla sua linea */
      if(f.type==='pass' && ball.z<0.3 && f.z0<0.3 && f.h<0.6){ const ux=f.x1-ball.x, uy=f.y1-ball.y, L=hyp(ux,uy); if(L>0.5){ const s0=clamp(((r.x-ball.x)*ux+(r.y-ball.y)*uy)/L, 0, L+2.5); r.tx=ball.x+ux/L*s0; r.ty=ball.y+uy/L*s0; } } }
    if(ball.fl && ball.fl.recv && ball.fl.recv.t!==t.idx && (ball.fl.type==='pass')){ const L=ball.fl.through?18:9; const cs=t.on.filter(p=>p.role!=='GK'||ball.fl.through).sort((a,b)=>hyp(a.x-ball.fl.x1,a.y-ball.fl.y1)-hyp(b.x-ball.fl.x1,b.y-ball.fl.y1)).slice(0,ball.fl.through?2:1); for(const c of cs){ if(hyp(c.x-ball.fl.x1,c.y-ball.fl.y1)<L){ c.tx=ball.fl.x1; c.ty=ball.fl.y1; c.urg=true; } } }
    for(const p of t.on){ if(p.wall && M.tick-p.wall.t<14 && p!==ball.owner && (ball.owner?ball.owner.t===t.idx:ball.fl&&ball.fl.t===t.idx)){ p.tx=p.wall.X; p.ty=p.wall.Y; p.urg=true; } }
    /* v0.4.2.0: il portiere esce sul cross se arriva in tempo nel punto di caduta */
    if(ball.fl && ball.fl.type==='cross' && ball.fl.t!==t.idx){ const f=ball.fl, g=gkOf(t); if(g && !g.dv){ const gl=t.dir>0?0:PL; if(Math.abs(f.x1-gl)<6.5 && Math.abs(f.y1-34)<9.5){ const left=f.tA-f.el, d=hyp(g.x-f.x1,g.y-f.y1); if(d<left*5+1.5){ g.tx=f.x1; g.ty=f.y1; g.urg=true; f.gkOut=g; } } } }
    if(ball.owner && ball.owner.t===t.idx){ const o2=ball.owner; o2.tx=o2.cx??o2.x; o2.ty=o2.cy??o2.y; o2.urg=true; }
  }
  /* bersagli che coincidono (B11 a): se due compagni vanno nello stesso punto, il meno urgente si sposta di lato */
  function deconflict(t){ const on=t.on, n=on.length;
    for(let i=0;i<n;i++){ const a=on[i]; for(let j=i+1;j<n;j++){ const b=on[j]; const dx=b.tx-a.tx, dy=b.ty-a.ty; if(dx*dx+dy*dy>=1.44) continue;
      const m=(!b.urg&&a.urg)||(b.urg===a.urg && hyp(b.x-b.tx,b.y-b.ty)>hyp(a.x-a.tx,a.y-a.ty)) ? b : a, o=m===a?b:a; if(m===ball.owner) continue;
      let ux=m.x-o.tx, uy=m.y-o.ty, L=hyp(ux,uy); if(L<0.1){ ux=-(o.ty-34); uy=o.tx-52.5; L=hyp(ux,uy)||1; } m.tx=o.tx+ux/L*1.3; m.ty=o.ty+uy/L*1.3; } } }
  /* cambi solo a gioco fermo: l'assistente vicino alle panchine va a centrocampo a controllare */
  function queueSub(t,outP,inP,why){ startSub(t,outP,inP,outP.slot,why,false); }
  /* sequenza del cambio: chi entra va a centrocampo fuori dal campo e aspetta; chi esce lascia il campo; l'assistente arriva e autorizza l'ingresso */
  const subW=t=>[52.5+(t.idx===0?-1.2:1.2), -1.3];
  function startSub(t,outP,inP,slot,why,noRemove){
    if(!M.restart || M.restart.type==='pen' || M.restart.type==='cel'){ t.qsub.push({outP,inP,slot,why,noRemove}); return; }
    inP.used=true; inP.walkIn=true; inP.x=benchX(t.idx)+(t.idx===0?2.5:-2.5); inP.y=-3.4;
    if(outP && noRemove){ outP.leave=36; outP.lw=2; }
    if(why!=='Cambio forzato' && why!=='Entra il portiere di riserva'){ M.restart.winT=M.restart.winT||[false,false]; if(!M.restart.winT[t.idx]){ M.restart.winT[t.idx]=true; t.win++; } }
    (M.restart.subs=M.restart.subs||[]).push({t,outP,inP,slot,why,noRemove,ph:(outP&&!noRemove)?0:1,t0:M.tick}); M.restart.sub=true;
    E('subcall',t.idx,[inP.id].concat(outP?[outP.id]:[]),`Pronto il cambio per ${t.inp.n}: ${outP?'esce '+outP.ln+', ':''}entra ${inP.ln}.`);
  }
  function stepSubs(force){
    if(!M.restart || !M.restart.subs) return;
    for(const z of M.restart.subs){
      if(z.ph===0 && (z.outP.y<0.15 || !z.outP.on || force || M.tick-z.t0>70)){ const o=z.outP; if(o.on){ o.on=false; o.subbed=true; z.t.on=z.t.on.filter(q=>q!==o); } o.leave=36; o.lw=0; z.ph=1; }
      if(z.ph===1){ const W=subW(z.t); if(force || M.tick-z.t0>90 || (hyp(z.inP.x-W[0],z.inP.y-W[1])<0.7 && hyp(ref.a1.x-52.5,ref.a1.y+1)<2)){
        z.ph=2; const slot=(z.outP&&!z.noRemove)?z.outP.slot:z.slot; doSub(z.t,z.outP,z.inP,slot,z.why); z.inP.x=W[0]; z.inP.y=0.4; } } }
  }
  function benchX(side){ return 52.5+(side===0?-9:9); }
  function reshape10(t, why){
    const n=t.on.length; if(n<7) return;
    const used=new Set(t.on.map(q=>q.slot)); const holes=t.slots.map((s,i)=>i).filter(i=>!used.has(i) && isDefR(t.slots[i].r));
    for(const h of holes){ const mv=t.on.filter(q=>ROLE_GROUP[q.role]==='C'||isAtt(q.role)).sort((a,b)=>suit(b,t.slots[h].r)-suit(a,t.slots[h].r))[0]; if(mv){ mv.slot=h; mv.role=t.slots[h].r; } }
    E('form',t.idx,[],`${t.inp.n} resta in ${n}${why?' ('+why+')':''}: ${t.coach.n.split(' ').slice(-1)[0]} sistema la difesa e rinuncia a un uomo in avanti.`,{form:t.form+' in '+n});
  }
  function bestSub(t, role){ let b=null,bv=-99; for(const q of t.bench){ if(q.on||q.out||q.used||q.walkIn||t.qsub.some(z=>z.inP===q)) continue; const v=suit(q,role); if(v>bv){bv=v;b=q;} } return b; }
  function doSub(t, outP, inP, slot, why){
    t.subIn.push(inP); inP.on=true; inP.used=true; inP.walkIn=false; inP.slot=slot; inP.role=t.slots[slot].r; t.on.push(inP); t.subs--;
    const sur=t.coach.n.split(' ').slice(-1)[0];
    assignMarks(t); assignMarks(T[1-t.idx]);
    E('sub',t.idx,[inP.id].concat(outP?[outP.id]:[]),`Sostituzione ${t.inp.n}: entra ${inP.ln}${outP?', esce '+outP.ln:''}.${why?' '+why+'.':''}`);
  }
  function htSubs(t){
    if(t.subs<=0 || t.on.length<10) return; const c=t.coach, diff=t.goals-T[1-t.idx].goals, sur=c.n.split(' ').slice(-1)[0];
    const pool=t.on.filter(q=>q.role!=='GK').map(q=>({q, w:(q.yc&&q.tem>=12&&isDefR(q.role)?3:0)+(q.st<62?2:0)+(10-suit(q,q.role))*0.4+(diff<0&&isAtt(q.role)?1:0)})).sort((a,b)=>b.w-a.w);
    const pr=0.3+(diff<0?0.25:0)+(c.ges-10)*0.01; let k=0;
    for(const {q,w} of pool){ if(k>=(diff<=-2?2:1) || w<1.2 || RC()>=pr) break; const b=bestSub(t,q.role); if(!b || suit(b,q.role)<suit(q,q.role)-2) continue;
      q.on=false; q.subbed=true; q.leave=36; q.lw=0; t.on=t.on.filter(z=>z!==q); b.x=52.5+(t.idx===0?-1.2:1.2); b.y=-0.6; doSub(t,q,b,q.slot,q.yc?`All'intervallo: ${q.ln} era ammonito`:`Cambio all'intervallo deciso da ${sur}`); k++; }
  }
  function changeForm(t, form, ment, txt){
    t.chg.push({tick:M.tick, ment, g0:t.goals, c0:T[1-t.idx].goals});
    const pool=t.on.slice(); t.form=form; t.slots=FORMATIONS[form].map(([r,y])=>({r,y}));
    const x=bestXI(pool, form); const used=new Set();
    x.xi.forEach((pp,i)=>{ if(!pp) return; const p=all.get(pp.id); p.slot=i; p.role=t.slots[i].r; used.add(p.id); });
    t.on.filter(p=>!used.has(p.id)).forEach(p=>{ const free=t.slots.findIndex((s,i)=>!t.on.some(q=>used.has(q.id)&&q.slot===i)); p.slot=free<0?0:free; p.role=t.slots[p.slot].r; used.add(p.id); });
    t.ment=ment; assignMarks(t); assignMarks(T[1-t.idx]); E('form',t.idx,[],txt,{form});
  }
  function coachThink(t){
    const o=T[1-t.idx], mn=minNum(M.tick), diff=t.goals-o.goals, c=t.coach, sur=c.n.split(' ').slice(-1)[0], sharp=0.5+c.tat/40;
    if(t.on.length>=10 && !t.coachOut){
      if(mn>=55 && diff<0 && !t.ch.att && RC()<0.08*sharp){ t.ch.att=true; const f=t.on.length===11?(RC()<0.5?'4-3-3':'3-4-3'):'4-4-2';
        const weak=t.on.filter(q=>q.role==='DM'||q.role==='CB').sort((a,b)=>suit(a,a.role)-suit(b,b.role))[0]; const fw=t.bench.filter(q=>!q.on&&!q.out&&!q.used&&(q.r==='A')).sort((a,b)=>suit(b,'ST')-suit(a,'ST'))[0];
        if(weak && fw && t.subs>0) queueSub(t,weak,fw,`${sur} vuole più peso in attacco`);
        changeForm(t,f,1,`${sur} cambia modulo: passa al ${f} per cercare il pareggio.`); return; }
      if(mn>=72 && diff>=1 && diff<=2 && !t.ch.def && RC()<0.08*sharp){ t.ch.def=true; const f=t.on.length===11?(RC()<0.5?'5-3-2':'4-5-1'):'4-4-2';
        const at=t.on.filter(q=>isAtt(q.role)).sort((a,b)=>a.st-b.st)[0]; const df=t.bench.filter(q=>!q.on&&!q.out&&!q.used&&q.r==='D').sort((a,b)=>suit(b,'CB')-suit(a,'CB'))[0];
        if(at && df && t.subs>0) queueSub(t,at,df,`${sur} blinda la difesa`);
        changeForm(t,f,-1,`${sur} si copre: ${f} per difendere il vantaggio.`); return; }
      if(mn>=70 && diff<0 && !t.ch.push){ t.ch.push=true; t.ment=Math.max(t.ment,1); }
      if(mn>=82 && diff<0 && !t.ch.all){ t.ch.all=true; t.ment=1; t.press=2; E('form',t.idx,[],`${t.inp.n} si getta in avanti: tutti all'attacco.`,{form:t.form+' all\'attacco'}); }
    }
    if(t.subs>0 && t.win<3 && !t.qsub.length && (mn>=58 || (mn>=50 && diff<0))){
      const thr=(mn<70?58:mn<80?66:72)+(c.ges-10)*0.7, late=mn>=86;
      const cands=t.on.filter(q=>q.role!=='GK' && !q.subOut && (q.st<thr || (q.yc && q.tem>=13 && isDefR(q.role) && mn>=60) || (mn>=64 && suit(q,q.role)<9.5 && q.st<thr+12))).sort((a,b)=>a.st-b.st);
      const n=Math.min(cands.length, t.subs, t.win===2?t.subs:(cands.length>=2&&RC()<0.55?2:1));
      if(n>0 && !late && RC()<0.5*sharp){ for(const tired of cands.slice(0,n)){ const b=bestSub(t,tired.role); if(b && suit(b,tired.role)>suit(tired,tired.role)-3.5){ tired.subOut=true; queueSub(t,tired,b,tired.yc&&tired.st>=thr?'Era ammonito, rischiava il rosso':tired.st<thr?'Era stanco':'Scelta tecnica'); } } }
      else if(late && diff>=1 && t.subs>0 && RC()<0.25){ const q=t.on.filter(z=>z.role!=='GK'&&!z.subOut).sort((a,b)=>a.st-b.st)[0], b=q&&bestSub(t,q.role); if(b){ q.subOut=true; queueSub(t,q,b,'Cambio per far passare il tempo'); } }
    }
  }
  return {setForm, kickoffPos, specOf, gkOf, LINE_OFF, supCache, freeSpot, endCel, celTargets, penTargets, cornerPts, setPieceAttack, setPieceDefend, corTargets, fkTargets, runProb, assignMarks, fwdMode, targets, deconflict, queueSub, subW, startSub, stepSubs, benchX, reshape10, bestSub, doSub, htSubs, changeForm, coachThink};
}
