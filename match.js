/* ================= SIMULATORE DI PARTITA: 22 giocatori, 2 allenatori AI ================= */
const PL=105, PW=68, DT=0.5;
const ROLE_X={GK:4,CB:19,LB:22,RB:22,LWB:28,RWB:28,DM:31,CM:39,LM:42,RM:42,AM:51,LW:57,RW:57,ST:61};
const FORMATIONS={
  '4-4-2':[['GK',34],['LB',8],['CB',26],['CB',42],['RB',60],['LM',10],['CM',28],['CM',40],['RM',58],['ST',28],['ST',40]],
  '4-3-3':[['GK',34],['LB',8],['CB',26],['CB',42],['RB',60],['CM',22],['DM',34],['CM',46],['LW',10],['ST',34],['RW',58]],
  '4-2-3-1':[['GK',34],['LB',8],['CB',26],['CB',42],['RB',60],['DM',27],['DM',41],['LW',12],['AM',34],['RW',56],['ST',34]],
  '3-5-2':[['GK',34],['CB',20],['CB',34],['CB',48],['LWB',7],['CM',24],['DM',34],['CM',44],['RWB',61],['ST',28],['ST',40]],
  '5-3-2':[['GK',34],['LWB',7],['CB',21],['CB',34],['CB',47],['RWB',61],['CM',22],['CM',34],['CM',46],['ST',28],['ST',40]],
  '4-5-1':[['GK',34],['LB',8],['CB',26],['CB',42],['RB',60],['LM',9],['CM',24],['DM',34],['CM',44],['RM',59],['ST',34]],
  '3-4-3':[['GK',34],['CB',20],['CB',34],['CB',48],['LM',8],['CM',27],['CM',41],['RM',60],['LW',14],['ST',34],['RW',54]]
};
const ROLE_GROUP={GK:'P',CB:'D',LB:'D',RB:'D',LWB:'D',RWB:'D',DM:'C',CM:'C',LM:'C',RM:'C',AM:'C',LW:'A',RW:'A',ST:'A'};
const SUIT={GK:{par:4,pre:2,usc:2,pos:2,rin:1},CB:{con:3,tes:2,ele:1,pos:3,for:1.5,vel:1,dec:1},LB:{vel:2.5,res:2,con:2,crs:1.5,pas:1},RB:{vel:2.5,res:2,con:2,crs:1.5,pas:1},
  LWB:{vel:2.5,res:3,crs:2,pas:1,con:1,dri:1},RWB:{vel:2.5,res:3,crs:2,pas:1,con:1,dri:1},DM:{con:3,pos:2.5,pas:2,dec:1.5,res:1.5,agg:1},CM:{pas:3,vis:2,ctr:2,dec:1.5,res:2,con:1},
  LM:{vel:2,dri:2,crs:2,pas:1.5,res:2},RM:{vel:2,dri:2,crs:2,pas:1.5,res:2},AM:{vis:3,pas:2.5,dri:2,ctr:1.5,lun:1.5,tir:1},LW:{vel:3,dri:3,crs:1.5,ctr:1,tir:1,fre:0.5},RW:{vel:3,dri:3,crs:1.5,ctr:1,tir:1,fre:0.5},ST:{tir:3.5,fre:2,pos:2.5,tes:1.5,ctr:1,vel:1.5}};
const NAT={P:{GK:0},D:{CB:0,LB:0,RB:0,LWB:0.5,RWB:0.5,DM:1.5},C:{DM:0,CM:0,AM:0,LM:0,RM:0,LW:1,RW:1,LWB:1.5,RWB:1.5,LB:2,RB:2,ST:2.5},A:{ST:0,LW:0,RW:0,AM:0.7,LM:0.8,RM:0.8,CM:2.5}};
const isFB=r=>r==='LB'||r==='RB'||r==='LWB'||r==='RWB';
const isAtt=r=>r==='ST'||r==='LW'||r==='RW'||r==='AM';
const isDefR=r=>ROLE_GROUP[r]==='D';
function suit(p,role){ const pen=NAT[p.r][role]; if(pen==null) return -5; const w=SUIT[role], A=p.a0||p.a; let s=0,t=0; for(const k in w){ s+=A[k]*w[k]; t+=w[k]; } return s/t-pen; }
function formNeed(mod){ const n={P:0,D:0,C:0,A:0}; (FORMATIONS[mod]||FORMATIONS['4-4-2']).forEach(([r])=>n[ROLE_GROUP[r]]++); return n; }

/* ---------- l'allenatore sceglie gli 11 per un modulo ---------- */
function bestXI(players, form){
  const slots=FORMATIONS[form].map(([r,y])=>({r,y}));
  const fit=p=>0.86+0.14*(p.st0/100)+(p.mor-12)*0.004;
  const pairs=[]; slots.forEach((s,i)=>players.forEach(p=>pairs.push([suit(p,s.r)*fit(p),i,p])));
  pairs.sort((a,b)=>b[0]-a[0]);
  const xi=new Array(slots.length).fill(null), used=new Set(); let tot=0;
  for(const [v,i,p] of pairs){ if(xi[i]||used.has(p.id)) continue; xi[i]=p; used.add(p.id); tot+=v; }
  return {form, slots, xi, score:tot/slots.length};
}
function features(x){
  const pick=f=>x.xi.filter((p,i)=>p&&f(x.slots[i].r));
  const avg=(arr,g)=>arr.length?arr.reduce((s,p)=>s+g(p),0)/arr.length:8;
  return { att:avg(pick(r=>isAtt(r)),p=>(p.a.tir+p.a.dri+p.a.vel)/3), attSpeed:avg(pick(r=>r==='ST'||r==='LW'||r==='RW'),p=>p.a.vel),
    defSpeed:avg(pick(r=>r==='CB'),p=>p.a.vel), aerialAtt:avg(pick(r=>r==='ST'),p=>(p.a.tes+p.a.ele)/2+(p.h-180)*0.1), aerialDef:avg(pick(r=>r==='CB'),p=>(p.a.tes+p.a.ele)/2+(p.h-180)*0.1),
    mid:avg(pick(r=>ROLE_GROUP[r]==='C'),p=>(p.a.pas+p.a.vis)/2), def:avg(pick(r=>isDefR(r)),p=>(p.a.con+p.a.pos)/2), res:avg(x.xi.filter(Boolean),p=>p.a.res), str:x.score };
}
const midCount=f=>FORMATIONS[f].filter(([r])=>ROLE_GROUP[r]==='C').length;

/* ---------- piano gara: l'AI studia l'avversario ---------- */
function planMatch(T, O, R){
  const c=T.coach, noise=(20-c.tat)/20;
  const ox=bestXI(O.players, FORMATIONS[O.coach.mod]?O.coach.mod:'4-4-2'), of=features(ox);
  let best=null;
  for(const f of Object.keys(FORMATIONS)){
    const x=bestXI(T.players,f), ft=features(x); let sc=x.score*3; const why=[];
    const md=of.mid-ft.mid;
    if(md>0.4){ const b=(midCount(f)-midCount(ox.form))*0.22*Math.min(2,md); sc+=b; if(b>0) why.push('mid'); }
    if(of.attSpeed-ft.defSpeed>1.2 && f.startsWith('5')){ sc+=0.6; why.push('slow'); }
    if(ft.attSpeed-of.defSpeed>1.2 && (f==='4-3-3'||f==='3-4-3')){ sc+=0.5; why.push('fast'); }
    if(f===c.mod){ sc+=0.55; why.push('fam'); }
    sc+=(R()-0.5)*noise*1.6;
    if(!best||sc>best.sc) best={f,x,ft,sc,why};
  }
  const ft=best.ft, diff=best.x.score-ox.score;
  const ment = diff<-0.9?-1 : diff>0.9?1 : 0;
  const opts=[['possesso',ft.mid-of.mid],['profondità',ft.attSpeed-of.defSpeed-0.6],['cross',ft.aerialAtt-of.aerialDef-1.0],['contropiede',ment<0?ft.attSpeed-9:-9]];
  opts.sort((a,b)=>b[1]-a[1]); const style = opts[0][1]>0.4 ? opts[0][0] : 'equilibrato';
  const press = ment>=0 && ft.res>=10 ? 2 : 1;
  const sur=c.n.split(' ').slice(-1)[0], rs=[];
  rs.push(best.f===c.mod?`${sur} conferma il suo ${best.f}.`:`${sur} lascia il solito ${c.mod} e sceglie il ${best.f}.`);
  if(best.why.includes('mid')) rs.push(`Vuole un uomo in più a centrocampo: l'avversario lì è più forte.`);
  if(best.why.includes('slow')) rs.push(`Cinque dietro per non soffrire la velocità delle loro punte.`);
  if(best.why.includes('fast')) rs.push(`Tre davanti per sfruttare la lentezza dei loro centrali.`);
  rs.push(ment>0?`Si sente più forte: baricentro alto e partita da fare.`: ment<0?`Si sente inferiore: squadra corta e bassa, pronta a ripartire.`:`Partita equilibrata: prudenza ma senza rinunciare ad attaccare.`);
  rs.push({possesso:'Stile: possesso palla e passaggi corti.',profondità:'Stile: lanci in profondità per le punte veloci.',cross:'Stile: palle alte in area, ha i saltatori migliori.',contropiede:'Stile: contropiede.',equilibrato:'Stile: equilibrato.'}[style]);
  if(press===2) rs.push('Pressing alto sul portatore di palla.');
  /* difesa: altezza della linea, zona o uomo, trappola del fuorigioco */
  const dfs=best.x.xi.map((p,i)=>p?{p,r:best.x.slots[i].r}:null).filter(x=>x&&isDefR(x.r)).map(x=>x.p);
  const dAvg=k=>dfs.length?dfs.reduce((s,p)=>s+p.a[k],0)/dfs.length:10;
  const read=(dAvg('pos')+dAvg('dec'))/2, duel=(dAvg('con')+dAvg('agg')+dAvg('for'))/3;
  const lineH = (ft.defSpeed-of.attSpeed>0.8 || (press===2 && ft.defSpeed>=of.attSpeed-0.3)) ? 'alta' : (of.attSpeed-ft.defSpeed>0.8 || ment<0) ? 'bassa' : 'media';
  const mark = read>=duel+0.6 ? 'zona' : duel>=read+0.6 ? 'uomo' : 'mista';
  const trap = lineH!=='bassa' && mark!=='uomo' && dAvg('dec')>=10;
  rs.push(`Difesa: linea ${lineH}, ${mark==='zona'?'marcatura a zona':mark==='uomo'?'marcatura a uomo':'zona con un marcatore fisso sull\'attaccante più pericoloso'}${trap?', trappola del fuorigioco':''}.`);
  /* specialisti e schema sui calci d'angolo */
  const xiP=best.x.xi.filter(Boolean).filter(p=>p.r!=='P');
  const top=f=>xiP.slice().sort((a,b)=>f(b)-f(a))[0];
  const spec={pen:top(p=>p.a.cpz*0.6+p.a.fre*0.4), fk:top(p=>p.a.cpz*0.7+p.a.lun*0.3), cor:top(p=>p.a.cpz*0.5+p.a.crs*0.5)};
  const headers=xiP.filter(p=>(p.a.tes+p.a.ele)/2+((p.h||180)-180)*0.1>=11.5).length, bestLong=Math.max(...xiP.map(p=>p.a.lun));
  const scheme = headers>=3 ? 'centro' : headers===2 ? 'secondo' : headers===1 ? 'primo' : bestLong>=12 ? 'limite' : 'corto';
  const SCH_IT={centro:'al centro dell\'area, dove arrivano i saltatori',secondo:'sul secondo palo',primo:'sul primo palo per la deviazione',limite:'corto al limite dell\'area per il tiro',corto:'battuto corto per giocarlo a terra'};
  if(spec.pen) rs.push(`Specialisti: rigori ${spec.pen.ln}, punizioni ${spec.fk.ln}, angoli ${spec.cor.ln}. Angoli ${SCH_IT[scheme]}.`);
  const fwd={}, FWD_IT={linea:'in linea con i difensori',spazi:'negli spazi tra i difensori',tra:'tra la difesa e il centrocampo'};
  const atts=best.x.xi.map((p,i)=>p?{p,r:best.x.slots[i].r}:null).filter(x=>x&&(x.r==='ST'||x.r==='LW'||x.r==='RW'));
  const sts=atts.filter(x=>x.r==='ST').sort((a,b)=>b.p.a.vel-a.p.a.vel);
  const xi=best.x.xi.filter(Boolean), avgVel=xi.reduce((s,p)=>s+p.a.vel,0)/xi.length;
  if(sts.length>=2){ fwd[sts[0].p.id]='linea'; const s2=sts[1].p; fwd[s2.id]=(s2.a.pas+s2.a.vis)/2>=s2.a.vel-1.5?'tra':'spazi'; sts.slice(2).forEach(x=>fwd[x.p.id]='spazi'); }
  else if(sts.length===1){ const s1=sts[0].p; fwd[s1.id]= s1.a.vel>=avgVel+0.8 ? 'linea' : (s1.a.pas+s1.a.vis)/2>=s1.a.tir ? 'tra' : 'spazi'; }
  atts.filter(x=>x.r!=='ST').forEach(x=>{ fwd[x.p.id]= x.p.a.vel>=avgVel+0.5 ? 'linea' : 'spazi'; });
  if(atts.length) rs.push('Attaccanti: '+atts.map(x=>`${x.p.ln} ${FWD_IT[fwd[x.p.id]]}`).join('; ')+'.');
  return {form:best.f, xi:best.x, ment, style, press, reasons:rs, fwd, lineH, mark, trap, scheme, spec:{pen:spec.pen&&spec.pen.id, fk:spec.fk&&spec.fk.id, cor:spec.cor&&spec.cor.id}};
}

/* ---------- partita ---------- */
function xgAt(dx,dy){ const ang=Math.abs(Math.atan2(7.32*dx, dx*dx+dy*dy-13.4)); const dg=hyp(dx,dy); return 1/(1+Math.exp(1.8-2.6*ang+0.08*dg)); }
function laneBlock(p,o,gx){ let b=1; for(const q of o.on){ if(q.role==='GK') continue; if(Math.abs(q.x-gx)<Math.abs(p.x-gx) && segDist(q.x,q.y,p.x,p.y,gx,34)<1.6) b*=0.68+0.14*Math.max(0,Math.min(1,(80-q.st)/50)); } return b; }
const TIME_F=1;   /* v0.4.2.0: orologio vero, un secondo di simulazione = un secondo di partita (prima 0,715) */
/* voti: pesi per ruolo (mu = contributo medio del ruolo, k = ampiezza) */
const RATE_G={GK:'GK',CB:'CB',LB:'FB',RB:'FB',LWB:'FB',RWB:'FB',DM:'DM',CM:'CM',LM:'CM',RM:'CM',AM:'AM',LW:'AM',RW:'AM',ST:'ST'};
const RATE_W={
  GK:{g:1,as:0.6,kp:0,sot:0,tk:0,int:0.04,drw:0,prog:0,sv:0.3,acc:0.6,cs:0.55,ga:-0.42,err:-0.55,mu:0.45,k:0.75},
  CB:{g:1,as:0.6,kp:0.05,sot:0.04,tk:0.09,int:0.08,drw:0.03,prog:0.03,sv:0,acc:1.0,cs:0.45,ga:-0.2,err:-0.5,mu:0.95,k:0.9},
  FB:{g:0.95,as:0.6,kp:0.1,sot:0.05,tk:0.07,int:0.06,drw:0.06,prog:0.04,sv:0,acc:1.0,cs:0.3,ga:-0.13,err:-0.45,mu:0.87,k:0.94},
  DM:{g:0.9,as:0.55,kp:0.07,sot:0.05,tk:0.08,int:0.08,drw:0.04,prog:0.05,sv:0,acc:2.0,cs:0.18,ga:-0.07,err:-0.45,mu:1.11,k:0.94},
  CM:{g:0.9,as:0.6,kp:0.1,sot:0.05,tk:0.05,int:0.05,drw:0.05,prog:0.05,sv:0,acc:1.5,cs:0.1,ga:-0.04,err:-0.4,mu:1.26,k:0.88},
  AM:{g:0.85,as:0.6,kp:0.11,sot:0.07,tk:0.03,int:0.03,drw:0.08,prog:0.04,sv:0,acc:1.0,cs:0,ga:0,err:-0.3,mu:1.42,k:0.98},
  ST:{g:0.85,as:0.55,kp:0.07,sot:0.08,tk:0.03,int:0.02,drw:0.05,prog:0.02,sv:0,acc:0.6,cs:0,ga:0,err:-0.25,mu:1.52,k:0.7}};
const STF=0.56;   // ritmo di consumo dell'energia
const ROLE_RUN={GK:0.3,CB:0.85,LB:1.12,RB:1.12,LWB:1.15,RWB:1.15,DM:1.05,CM:1.12,LM:1.12,RM:1.12,AM:1.0,LW:1.05,RW:1.05,ST:0.95};
/* morale: effetto moderato sul rendimento (in punti di abilità compressa; il fattore campo vale 0,22) */
const MOR_K=0.3, CMOR_K=0.08;
function moraleBoost(mor,cmor){ return clamp((mor-12)/8,-1,1)*MOR_K + clamp(((cmor??12)-12)/8,-1,1)*CMOR_K; }
const FIN=0.45, SKILL_K=0.33, HOME_B=0.4, DAY_F=0.7;
/* v0.4.2.0: tarature della fisica dei tiri e del ritmo (vedi STATO.md, «Fisica della palla e dei corpi») */
/* v0.4.2.0: con l'orologio vero i tempi delle decisioni (scritti in secondi della vecchia simulazione) scorrono a TDEC per secondo
   e le pause delle riprese (in tick) durano RS_K volte di più: così ritmo delle giocate e tempo effettivo restano quelli di prima */
const TDEC=0.715, RS_K=1.75;
const SHOT_S0=0.075, SHOT_ERR=3.2, GK_VD=5.4, CONTEST_K=1, RUN_K=0.6;
/* frame registrati (v0.4.2.0): Int16Array, coordinate in cm. Per n colonne (giocatori): [i*2, i*2+1] = x, y del giocatore i (FR_NONE se assente);
   n*2..+2 palla x,y,z; +3..+11 tre sotto-campioni della palla; +12..+17 arbitro e assistenti; +18 cartellino; +19 bandierina; +20, +21 capitani;
   +22, +23 inclinazione del portiere (millesimi di radiante, tuffo) delle due squadre; da n*2+24 l'orientamento dei giocatori, un byte ciascuno (due per numero) */
const FR_NONE=-32768;
function frV(f,i){ const v=f[i]; return v===FR_NONE?NaN:v*0.01; }
function frOri(f,n,i){ const u=f[n*2+24+(i>>1)]&0xFFFF, b=(i&1)?(u>>8)&255:u&255; return b/256*2*Math.PI-Math.PI; }
/* frame decodificato con la disposizione di sempre (metri, NaN per gli assenti; cartellino, bandierina e capitani come numeri interi),
   più [n*2+22], [n*2+23] inclinazione dei portieri (radianti) e da n*2+24 l'orientamento di ogni giocatore (radianti). Lo usa il visore */
function frDecode(f, n, out){ const nb=n*2, L=nb+24+n; out=out||new Float32Array(L);
  for(let i=0;i<nb+18;i++){ const v=f[i]; out[i]= v===FR_NONE?NaN:v*0.01; }
  for(let i=nb+18;i<nb+22;i++) out[i]=f[i]; out[nb+22]=f[nb+22]*0.001; out[nb+23]=f[nb+23]*0.001;
  for(let k=0;k<n;k++) out[nb+24+k]=frOri(f,n,k); return out; }
function xT(xr,yr){ return 0.004+0.26*Math.exp(-hyp(105-xr,34-yr)/10.5)+0.02*xr/105; }
const hyp=(x,y)=>Math.sqrt(x*x+y*y);
const D2=(a,b)=>hyp(a.x-b.x,a.y-b.y);
function segDist(px,py,ax,ay,bx,by){ const vx=bx-ax, vy=by-ay, L=vx*vx+vy*vy||1; let u=((px-ax)*vx+(py-ay)*vy)/L; if(u<0.08||u>1) return 99; return hyp(ax+u*vx-px, ay+u*vy-py); }

/* ================= MOTORE FISICO (v0.4.2.0, tappa R2) =================
   Funzioni pure per la palla e per i corpi: nessun numero casuale, nessuna decisione. Le decisioni
   (simMatch: allenatore e giocatori) le chiamano. Unità: metri, secondi, radianti; z = altezza della
   palla sopra il prato (0 = appoggiata). Riferimenti: RICERCA_PARTITA.md A3 (palla) e A4 (corpi). */
const FIS={
  R:0.11,                          // raggio della palla
  KD:0.5*1.2*0.038/0.43,           // ½·ρ·A/m: accelerazione = KD·Cd·v² (resistenza) e KD·Cl·v² (Magnus)
  G:9.81, SUB:8,                   // gravità; sotto-passi della palla per tick (DT/8 = 1/16 s)
  E:0.6, MU:0.9,                   // restituzione verticale del rimbalzo; attrito del prato nell'urto
  RA:0.4, RB:0.17,                 // rotolamento: frenata = RA + RB·v (m/s², valori FIFA)
  GW:3.66, GH:2.44, PR:0.06,       // mezza larghezza e altezza della porta, raggio di pali e traversa
  NET:1.9, BOARD_X:5, BOARD_Y:4,   // profondità della rete; cartelloni dietro le linee di porta e laterali
  SPIN_K:0.99                      // la rotazione cala dell'1% a sotto-passo (~15% al secondo)
};
/* coefficiente di resistenza con la «crisi di resistenza» tra 11 e 16 m/s */
function fisCd(v){ return v<=11?0.45 : v>=16?0.18 : 0.45-(v-11)*0.054; }
const fisAng=a=>{ while(a>Math.PI) a-=2*Math.PI; while(a<-Math.PI) a+=2*Math.PI; return a; };
/* un sotto-passo di palla libera (in volo o a terra); restituisce 1 se ha rimbalzato */
function fisBallStep(b, h){
  if(b.z>0.0005 || b.vz>0.0005){
    const v=Math.sqrt(b.vx*b.vx+b.vy*b.vy+b.vz*b.vz); let ax=0, ay=0, az=-FIS.G;
    if(v>0.05){ const k=FIS.KD*fisCd(v)*v; ax-=k*b.vx; ay-=k*b.vy; az-=k*b.vz;
      const w=Math.sqrt(b.wx*b.wx+b.wy*b.wy+b.wz*b.wz);
      if(w>0.5){ const m=FIS.KD*Math.min(0.32,1.1*FIS.R*w/v)*v/w; ax+=m*(b.wy*b.vz-b.wz*b.vy); ay+=m*(b.wz*b.vx-b.wx*b.vz); az+=m*(b.wx*b.vy-b.wy*b.vx); } }
    b.vx+=ax*h; b.vy+=ay*h; b.vz+=az*h; b.x+=b.vx*h; b.y+=b.vy*h; b.z+=b.vz*h;
    b.wx*=FIS.SPIN_K; b.wy*=FIS.SPIN_K; b.wz*=FIS.SPIN_K;
    if(b.z<=0){ b.z=0; const vz=-b.vz, vh=Math.sqrt(b.vx*b.vx+b.vy*b.vy);
      /* urto con il prato: l'attrito toglie velocità orizzontale in proporzione alla velocità verticale (45–60% conservata negli urti ripidi, quasi tutta in quelli radenti) */
      if(vh>0.01){ const keep=clamp(1-FIS.MU*(1+FIS.E)*Math.max(0,vz)/vh,0.5,0.97); b.vx*=keep; b.vy*=keep; }
      b.wx*=0.5; b.wy*=0.5; b.wz*=0.5;
      if(vz<1.2){ b.vz=0; return 0; } b.vz=vz*FIS.E; return 1; }
    return 0; }
  /* rotolamento: dv/dt = −(RA + RB·v), soluzione esatta nel sotto-passo (la palla rallenta sempre in modo continuo) */
  b.z=0; b.vz=0; const v=Math.sqrt(b.vx*b.vx+b.vy*b.vy); if(v<0.02){ b.vx=0; b.vy=0; return 0; }
  const c=FIS.RA/FIS.RB, e=Math.exp(-FIS.RB*h); let nv=(v+c)*e-c, s;
  if(nv<=0){ const tt=Math.log((v+c)/c)/FIS.RB; s=(v+c)/FIS.RB*(1-Math.exp(-FIS.RB*tt))-c*tt; nv=0; } else s=(v+c)/FIS.RB*(1-e)-c*h;
  b.x+=b.vx/v*s; b.y+=b.vy/v*s; b.vx*=nv/v; b.vy*=nv/v; b.wz*=0.9;
  return 0;
}
/* calcio: velocità v, azimut az, elevazione el, rotazione laterale side (rad/s, + = curva a sinistra) e in avanti top (+ = la palla scende prima) */
function fisKick(b,v,az,el,side,top){ const c=Math.cos(el); b.vx=v*c*Math.cos(az); b.vy=v*c*Math.sin(az); b.vz=v*Math.sin(el); b.wz=side||0; b.wx=-(top||0)*Math.sin(az); b.wy=(top||0)*Math.cos(az); }
/* palla di prova per le previsioni (riusata: niente oggetti nuovi) */
const FIS_S={x:0,y:0,z:0,vx:0,vy:0,vz:0,wx:0,wy:0,wz:0};
function fisCopy(d,s){ d.x=s.x; d.y=s.y; d.z=s.z; d.vx=s.vx; d.vy=s.vy; d.vz=s.vz; d.wx=s.wx; d.wy=s.wy; d.wz=s.wz; return d; }
/* rasoterra: velocità di partenza per arrivare a distanza L con velocità va (soluzione esatta del rotolamento) e tempo di arrivo */
function fisGround(L, va){ const a=FIS.RA, b=FIS.RB; let v=va+L*0.35;
  for(let i=0;i<6;i++){ const s=((v-va)-(a/b)*Math.log((a+b*v)/(a+b*va)))/b; v=Math.max(va+0.01, v-(s-L)*(a+b*v)/v); }
  return {v, t:Math.log((a+b*v)/(a+b*va))/b}; }
/* palla alzata: dato l'angolo el, trova velocità e direzione per arrivare in (x1,y1) all'altezza z1 mentre scende (con resistenza e Magnus) */
const FIS_AIM={v:0,az:0,el:0,t:0};
function fisLoft(x0,y0,z0,x1,y1,z1,el,side,top){
  const L=hyp(x1-x0,y1-y0)||0.01, ux=(x1-x0)/L, uy=(y1-y0)/L; let az=Math.atan2(uy,ux), v=Math.sqrt(FIS.G*L/Math.max(0.2,Math.sin(2*el)))*1.08, T=0;
  for(let it=0;it<5;it++){ const s=FIS_S; s.x=x0; s.y=y0; s.z=z0; fisKick(s,v,az,el,side,top); let t=0, px=x0, py=y0, pz=z0, d=0, lat=0, up=false;
    for(let k=0;k<200;k++){ px=s.x; py=s.y; pz=s.z; fisBallStep(s,DT/FIS.SUB); t+=DT/FIS.SUB; if(s.vz>0) up=true; if((up||k>2) && s.vz<=0 && s.z<=z1){ const w=pz>s.z?(pz-z1)/(pz-s.z):1; const cx=px+(s.x-px)*w, cy=py+(s.y-py)*w; d=(cx-x0)*ux+(cy-y0)*uy; lat=-(cx-x0)*uy+(cy-y0)*ux; t-=(1-w)*DT/FIS.SUB; break; } }
    T=t; if(d<=0.1){ v*=1.3; continue; } v*=Math.sqrt(L/d); az-=lat/L; if(Math.abs(d-L)<0.08 && Math.abs(lat)<0.08) break; }
  FIS_AIM.v=v; FIS_AIM.az=az; FIS_AIM.el=el; FIS_AIM.t=T; return FIS_AIM; }
/* tiro (o passaggio teso): velocità fissata, trova azimut ed elevazione per passare da (x1,y1,z1);
   il punto d'arrivo è dove la palla attraversa il piano verticale per (x1,y1) perpendicolare alla direzione */
function fisDirect(x0,y0,z0,x1,y1,z1,v,side,top){
  const L=hyp(x1-x0,y1-y0)||0.01, ux=(x1-x0)/L, uy=(y1-y0)/L; let az=Math.atan2(uy,ux), el=Math.atan2(z1-z0,L)+0.5*FIS.G*L/(v*v), T=0;
  for(let it=0;it<5;it++){ const s=FIS_S; s.x=x0; s.y=y0; s.z=z0; fisKick(s,v,az,el,side,top); let t=0, px, py, pz, lat=0, ez=0, ok=false;
    for(let k=0;k<160;k++){ px=s.x; py=s.y; pz=s.z; fisBallStep(s,DT/FIS.SUB); t+=DT/FIS.SUB; const d=(s.x-x0)*ux+(s.y-y0)*uy;
      if(d>=L){ const d0=(px-x0)*ux+(py-y0)*uy, w=d>d0?(L-d0)/(d-d0):1; const cx=px+(s.x-px)*w, cy=py+(s.y-py)*w, cz=pz+(s.z-pz)*w; lat=-(cx-x0)*uy+(cy-y0)*ux; ez=cz-z1; t-=(1-w)*DT/FIS.SUB; ok=true; break; } }
    T=t; if(!ok){ el+=0.08; continue; } az-=lat/L; el-=ez/L*0.9; if(Math.abs(lat)<0.04 && Math.abs(ez)<0.04) break; }
  FIS_AIM.v=v; FIS_AIM.az=az; FIS_AIM.el=el; FIS_AIM.t=T; return FIS_AIM; }
/* corpo di un giocatore per un tick: verso (dx,dy) alla velocità desiderata sDes, con lo sguardo che vorrebbe andare verso face.
   Limiti: velocità massima secondo la direzione rispetto al corpo (avanti 100%, di lato ~55%, indietro ~70% e solo per pochi metri),
   accelerazione amax (che cala avvicinandosi alla velocità massima), frenata dmax, rotazione del corpo che rallenta con la velocità.
   Scrive p.vx, p.vy, p.o (direzione dello sguardo), p.bk (metri fatti all'indietro) e la nuova posizione in p.nx, p.ny. */
function fisCorpo(p, dx, dy, sDes, face, vmax, amax, dmax, h){
  const v0x=p.vx||0, v0y=p.vy||0, v0=Math.sqrt(v0x*v0x+v0y*v0y);
  const md=sDes>0.05?Math.atan2(dy,dx):p.o;
  /* corsa all'indietro solo per pochi metri: oltre, ci si gira */
  let want=face; if(sDes>0.05 && Math.abs(fisAng(md-want))>1.9 && (p.bk>5 || sDes>0.85*vmax)) want=md;
  const turn=(7.5-0.55*v0)*h, da=fisAng(want-p.o); p.o=fisAng(p.o+clamp(da,-turn,turn));
  const th=Math.abs(fisAng(md-p.o)), f= th<0.5?1 : th<1.57? 1-0.45*(th-0.5)/1.07 : th<2.6? 0.55+0.2*(th-1.57)/1.03 : 0.75;
  const s=Math.min(sDes, vmax*f), wx=sDes>0.05?Math.cos(md)*s:0, wy=sDes>0.05?Math.sin(md)*s:0;
  let ex=wx-v0x, ey=wy-v0y; const e=Math.sqrt(ex*ex+ey*ey);
  const lim=(s>=v0 ? amax*(1-0.55*v0/vmax) : dmax)*h; if(e>lim){ ex*=lim/e; ey*=lim/e; }
  const vx=v0x+ex, vy=v0y+ey; p.vx=vx; p.vy=vy; p.nx=p.x+(v0x+vx)*0.5*h; p.ny=p.y+(v0y+vy)*0.5*h;
  const sp=Math.sqrt(vx*vx+vy*vy); if(sp>0.5 && Math.abs(fisAng(Math.atan2(vy,vx)-p.o))>1.9) p.bk=(p.bk||0)+sp*h; else if(sp<0.5 || Math.abs(fisAng(Math.atan2(vy,vx)-p.o))<1.2) p.bk=0;
}

const MTX={
  goal:['GOL! {s} batte {g} e segna!','GOL! Conclusione di {s}, non c\'è niente da fare per {g}!','GOL! {s} non perdona!'],
  goalH:['GOL! {s} svetta di testa e insacca!','GOL! Colpo di testa di {s} su cross di {b}!'],
  goalP:['GOL! {s} trasforma il rigore spiazzando {g}.'],
  pmiss:['Rigore sbagliato! {g} intuisce e para il tiro di {s}.','{s} calcia il rigore alto sopra la traversa!'],
  save:['Tiro di {s}, {g} para.','{g} si distende e respinge la conclusione di {s}.','Grande intervento di {g} su {s}!'],
  wide:['{s} calcia, palla fuori di poco.','Conclusione di {s} alta sopra la traversa.','{s} prova il tiro, non inquadra la porta.'],
  post:['Palo! Che sfortuna per {s}!','{s} colpisce il palo pieno!'],
  block:['Tiro di {s} respinto da {d}.','{d} si immola e respinge il tiro di {s}.'],
  yc:['Ammonito {p} per un fallo su {v}.','Cartellino giallo per {p}: intervento in ritardo su {v}.'],
  y2:['Secondo giallo per {p}: espulso!'],
  rc:['Rosso diretto per {p}! Fallo da ultimo uomo su {v}.'],
  pen:['Rigore! {p} atterra {v} in area.'],
  inj:['{p} resta a terra: deve uscire per un infortunio.','Problema fisico per {p}, si accascia a terra.'],
  off:['Fuorigioco di {p}.'],
  flD:['Giocata di classe di {p}: salta {d} come un birillo.','{p} si libera di {d} con una finta da campione.'],
  flP:['Passaggio illuminante di {p} che taglia la difesa.','{p} vede un corridoio che nessuno aveva visto.'],
  flR:['Movimento da attaccante vero di {p}: anticipa tutti.','{p} si smarca con un taglio perfetto alle spalle della difesa.'],
  flS:['Che conclusione di {p}! Tecnica da categoria superiore.'],
  fkWall:['Punizione di {s}: il pallone sbatte sulla barriera.','{s} calcia, la barriera fa il suo dovere.'],
  fkGoal:['GOL! Punizione perfetta di {s}: sopra la barriera e nell\'angolino!','GOL! {s} disegna una parabola imprendibile su punizione!'],
  fkSave:['Punizione di {s} sopra la barriera, {g} vola e respinge.','{g} si allunga sulla punizione di {s}.'],
  fkWide:['Punizione di {s}: il pallone scavalca la barriera ma esce di poco.','{s} calcia la punizione alta sopra la traversa.']
};

function simMatch(inp, seed, rec){
  /* v0.4.2.0: numeri casuali separati per sottosistema (RICERCA C2): R = giocatori (scelte ed esecuzione), RC = allenatori,
     RA = arbitro e tempi delle riprese, RP = fisica (rimbalzi, deviazioni, infortuni). Così una tappa che cambia un codice non rimescola gli altri */
  const R=makeRng(seed), P=a=>a[Math.floor(R()*a.length)], RC=makeRng(seed^0x51A3C0DE), RA=makeRng(seed^0x2F6E2B19), RP=makeRng(seed^0x7B3D9E57), PA=a=>a[Math.floor(RA()*a.length)];
  /* sonde per le misure (v0.4.1.3, tools/misure.js): spente se globalThis.__SONDA non c'è. Leggono soltanto: mai R(), mai scritture, mai nei salvataggi */
  const SO=globalThis.__SONDA||null, SX=SO?{get T(){return T}, get ball(){return ball}, get ref(){return ref}, get restart(){return restart}, get tick(){return tick}, get half(){return half}, get all(){return all}, get ev(){return ev}, get htTick(){return htTick}, PL, PW, DT, TIME_F}:null;
  const T=[0,1].map(i=>{ const ti=inp.t[i]; return {win:0, qsub:[], coachOut:!!(ti.coach&&ti.coach.absent), pendOff:false, idx:i, dir:i===0?1:-1, inp:ti, coach:ti.coach, players:ti.players, goals:0, subs:5, on:[], bench:[], form:null, slots:null, ment:0, style:'equilibrato', press:1, ch:{att:false,def:false,all:false}, lostT:-99, wonT:-99, counterUntil:-1, pressUntil:-1,
    st:{poss:0,sh:0,sot:0,xg:0,cor:0,fou:0,yc:0,rc:0,pa:0,pc:0,off:0}}; });
  const all=new Map(), ev=[], frames=rec?[]:null;
  const dayF=[0,1].map(()=>(R()+R()-1)*DAY_F);
  for(const t of T) for(const pi of t.players){ const mB=moraleBoost(pi.mor??12, t.coach&&t.coach.mor); all.set(pi.id,{...pi, a0:pi.a, a:Object.fromEntries(Object.entries(pi.a).map(([k,v])=>[k,10+(v-10)*SKILL_K+(t.idx===0?HOME_B:0)+dayF[t.idx]+mB])), t:t.idx, x:0,y:0,tx:0,ty:0, vx:0,vy:0, o:(i0=>i0===0?0:Math.PI)(t.idx), bk:0, k:-1, vmax:8.5+1.2*clamp((pi.a.vel-1)/19,0,1), amax:4.3+0.9*clamp((pi.a.vel-1)/19,0,1), hk:(hashU(String(pi.id),7)*1e6)|0, nx:0, ny:0, dv:null, tilt:0, hold:false, fq:null, ucap:1, hx:null, hy:0, hz:0, tp:0, eng:null, cx:undefined, cy:undefined, ft:false, drib:0, shield:0, wall:null, runOff:0, used:false, walkIn:false, leave:0, lw:0, subOut:false, subbed:false, st:pi.st0, on:false, slot:-1, role:null, yc:0, out:false, inj:false, runT:0, dt:0, stun:0, urg:false, mins:0, fl:pi.fl*0.12,
    s:{g:0,as:0,kp:0,sh:0,sot:0,pa:0,pc:0,tk:0,int:0,drw:0,sv:0,err:0,red:0,prog:0,gv:0,av:0,ga:0,svv:0}}); }
  const plans=[0,1].map(i=>planMatch(T[i].inp,T[1-i].inp,RC));
  [0,1].forEach(i=>{ const f=inp.t[i].force; if(f){ Object.assign(plans[i],f); if(f.form) plans[i].xi=bestXI(T[i].inp.players,f.form); } });
  const rx=(t,x)=>t.dir>0?x:PL-x, ry=(t,y)=>t.dir>0?y:PW-y;
  const tm=p=>T[p.t], op=p=>T[1-p.t];
  function setForm(t, form, xiPlayers){
    t.form=form; t.slots=FORMATIONS[form].map(([r,y])=>({r,y}));
    const pool=xiPlayers.filter(p=>!p.out);
    const x=bestXI(pool, form); t.on=[];
    x.xi.forEach((pp,i)=>{ if(!pp) return; const p=all.get(pp.id); p.slot=i; p.role=t.slots[i].r; p.on=true; t.on.push(p); });
  }
  for(const t of T){ const pl=plans[t.idx]; t.ment=pl.ment; t.style=pl.style; t.press=pl.press; t.fwd=pl.fwd||{}; t.lineH=pl.lineH||'media'; t.mark=pl.mark||'zona'; t.trap=!!pl.trap; t.dline=null; t.marks=new Map(); t.scheme=pl.scheme||'centro'; t.spec=pl.spec||{};
    { const xi=(pl.xi.xi||[]).filter(Boolean); t.tech=xi.length? xi.reduce((s,p)=>s+(p.a.pas+p.a.ctr+p.a.dec)/3,0)/xi.length : 10; }
    setForm(t, pl.form, pl.xi.xi.filter(Boolean).map(p=>all.get(p.id)));
    const onIds=new Set(t.on.map(p=>p.id)); t.bench=t.players.filter(p=>!onIds.has(p.id)).map(p=>all.get(p.id)).sort((a,b)=>b.ovr0-a.ovr0).slice(0,9);
  }
  T.forEach(t=>assignMarks(t));
  const str0=T.map(t=>t.on.reduce((s,p)=>s+(p.ovr0||10),0)/Math.max(1,t.on.length)); T.forEach(t=>{ t.chg=[]; t.subIn=[]; });
  const ball={x:52.5,y:34,z:0,vz:0,owner:null,fl:null,vx:0,vy:0,lastT:0,lastP:null,pass:null};
  /* terna arbitrale: caratteristiche (1-20, media 10) */
  const RF=Object.assign({esp:10,car:10,fis:10,err:10}, inp.ref||{});
  const cardF=0.7+RF.car*0.03, fisF=0.85+RF.fis*0.015, penF=0.55+RF.fis*0.045;
  const ref={x:45,y:40,v:0, a1:{x:35,y:-1}, a2:{x:70,y:PW+1}, cardK:0, cardT:-99, flag:0, flagT:-99};
  const errLam=clamp(0.35+(RF.err-10)*0.05-(RF.esp-10)*0.03,0.04,0.9);
  let errLeft=(RA()<errLam?1:0)+(RA()<errLam*0.5?1:0); const refErrs=[];
  const errPlan=[0,1].map(()=>{ const u=RA(); return u<0.28?'rigNo':u<0.48?'rigSi':u<0.76?'offNo':'offSi'; });
  const canErr=k=>errLeft>0 && errPlan[refErrs.length]===k;
  const coachOff=[false,false];
  const MIN_T=60/DT*TIME_F;
  let tick=0, half=1, halfEnd=1e9, regEnd=Math.round(45*MIN_T), lost=[0,0], endT=0, restart=null, htTick=0, ht2=null;
  /* secondo tempo: i minuti partono dal calcio d'inizio (ht2), non dal fischio dell'intervallo (i giocatori tornano camminando) */
  const s2=t=>ht2==null||t<ht2?0:(t-ht2)*DT/TIME_F;
  const minute=t=>{ const s=t*DT/TIME_F; if(half===1||t<htTick){ const m=Math.floor(s/60); return m>=45?`45+${m-44}'`:`${m+1}'`; } const m=45+Math.floor(s2(t)/60); return m>=90?`90+${m-89}'`:`${m+1}'`; };
  const minNum=t=>{ const s=t*DT/TIME_F; return half===1||t<htTick? Math.min(45,Math.floor(s/60)+1) : Math.min(90,45+Math.floor(s2(t)/60)+1); };
  const E=(type,side,ids,text,extra)=>{ ev.push({t:tick,min:minute(tick),type,side,d:T[side]?T[side].dir:1,p:ids,text,...(extra||{})}); };
  const fill2=(tpl,o)=>tpl.replace(/\{(\w)\}/g,(m,k)=>o[k]?o[k].ln:'?');

  function kickoffPos(t, kicking, tele){
    t.on.forEach(p=>{ let xr=Math.min(ROLE_X[p.role]*0.82,48), yr=t.slots[p.slot].y; if(kicking && p.role==='ST'){ xr=50.5; yr=34+(yr-34)*0.3; } const X=rx(t,xr), Y=ry(t,yr); if(tele){ p.x=X; p.y=Y; } p.tx=X; p.ty=Y; p.urg=false; });
  }
  /* v0.4.2.0: solo il primo calcio d'inizio mette i giocatori al loro posto; nel secondo tempo ci vanno camminando e la palla
     la porta a centrocampo un giocatore (bs: 'fetch' → 'toss' → 'ready'), il gioco aspetta che siano tutti in posizione */
  function startKick(ti, tele){ kickoffPos(T[0],ti===0,tele); kickoffPos(T[1],ti===1,tele); ball.owner=null; ball.fl=null; ball.sh=null;
    if(tele){ ball.x=52.5; ball.y=34; ball.z=0; stopBall(); restart={type:'kick',team:ti,x:52.5,y:34,ticks:4,bs:'ready'}; }
    else { stopBall(); restart={type:'kick',team:ti,x:52.5,y:34,ticks:24,bs:'roll',fetch:true}; } }
  E('kick',0,[],`Calcio d'inizio. ${T[0].inp.n} col ${T[0].form}, ${T[1].inp.n} col ${T[1].form}.`);

  /* stanchezza: 0 se fresco (energia ≥ 80), 1 se sfinito (≤ 30) */
  const fatK=p=>clamp((80-p.st)/50,0,1);
  function nearestOpp(p){ let b=null,bd=99; for(const q of op(p).on){ const d=D2(p,q); if(d<bd){bd=d;b=q;} } return [b,bd]; }
  function offLineFor(t){ const o=T[1-t.idx]; const xs=o.on.map(q=>rx(t,q.x)).sort((a,b)=>b-a); return Math.max(52.5, xs[1]||52.5, rx(t,ball.x)); }
  /* l'assistente giudica dalla posizione reale al momento del passaggio; sui centimetri può sbagliare */
  function offsideCall(t,m){ const xr=rx(t,m.x); if(xr<=52.5) return false; const mg=xr-offLineFor(t);
    const call = mg>1.5 ? true : mg>0.5 ? RA()<0.6 : mg>-0.4 ? RA()<0.04 : false;
    if(errLeft>0){
      if(call && mg>0.8 && xr>70 && canErr('offNo') && RA()<0.3){ refError('offNo',1-t.idx,[m.id],`${m.ln} scatta sul filo del fuorigioco: l'assistente lascia correre.`,`Le immagini sono chiare: ${m.ln} parte in fuorigioco. È sicuramente un errore arbitrale: l'assistente doveva alzare la bandierina.`); return false; }
      if(!call && mg<-0.6 && mg>-2.5 && xr>72 && canErr('offSi') && RA()<0.05){ refError('offSi',t.idx,[m.id],`Sul lancio per ${m.ln} l'assistente è pronto con la bandierina.`,`Il replay mostra ${m.ln} in posizione regolare. È sicuramente un errore arbitrale: il fuorigioco non c'era.`); return true; } }
    return call; }
  function specOf(t,k,f){ const id=t.spec[k]; const p=id!=null?t.on.find(q=>q.id===id):null; return p || t.on.filter(q=>q.role!=='GK').sort((a,b)=>f(b)-f(a))[0]; }
  function gkOf(t){ return t.on.find(p=>p.role==='GK'); }
  /* v0.4.2.0 (regia): il portiere usa le mani solo dentro la propria area di rigore (palla e portiere in area) */
  const handsOk=(g,x,y)=>{ const t=T[g.t]; return rx(t,x)<16.5 && Math.abs(y-34)<20.16 && rx(t,g.x)<16.5 && Math.abs(g.y-34)<20.16; };
  /* presa: la palla resta dove l'ha fermata (le mani) e in pochi decimi di secondo arriva al petto; mai teletrasporti */
  function gkCatch(g, delay){ const hx=ball.x-g.x, hy=ball.y-g.y, hz=Math.max(0.3,Math.min(2.6,ball.z+FIS.R)); giveBall(g, delay); g.hold=true; g.hx=hx; g.hy=hy; g.hz=hz; }

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
    const r=restart;
    restart={type:'kick', team:r.team, x:52.5, y:34, ticks:24, bs:'roll', fetch:true};   /* v0.4.2.0: un giocatore di chi ha subito il gol va a prendere la palla in rete e la rimanda a centrocampo */
    kickoffPos(T[0],r.team===0,false); kickoffPos(T[1],r.team===1,false);
  }
  function celTargets(t){
    const r=restart, el=tick-r.t0;
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
    const r=restart, A=T[r.team];
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
    const r=restart, A=T[r.team], atk=t===A, pts=cornerPts(A,r);
    if(atk){ const sch=A.scheme, target= sch==='primo'?pts.near : sch==='secondo'?pts.far : sch==='limite'?[pts.edge[0]+6,pts.edge[1]] : pts.spot;
      setPieceAttack(t,A,r,target,r.taker);
      if(sch==='limite'||sch==='corto'){ const helper=t.on.filter(p=>p!==r.taker && p.role!=='GK' && !isDefR(p.role)).sort((a,b)=>sch==='limite'?(b.a0.lun-a.a0.lun):(b.a0.crs+b.a0.pas)-(a.a0.crs+a.a0.pas))[0];
        if(helper){ if(sch==='limite'){ helper.tx=rx(t,pts.edge[0]); helper.ty=ry(t,pts.edge[1]); } else { const cy=ry(A,r.y); helper.tx=rx(t,99); helper.ty=ry(t,cy<34?6:62); } helper.urg=true; r.helper=helper; } }
      if(r.taker){ r.taker.tx=r.x; r.taker.ty=r.y; r.taker.urg=true; } }
    else setPieceDefend(t,A,r,null);
  }
  function fkTargets(t){
    const r=restart, A=T[r.team], atk=t===A, gx=A.dir>0?PL:0;
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
    if(restart && restart.type==='cel'){ celTargets(t); return; }
    if(restart && restart.type==='kick'){ kickoffPos(t, restart.team===t.idx, false); return; }
    const o=T[1-t.idx], possT = restart&&restart.type!=='kick'? restart.team : ball.owner?ball.owner.t : ball.fl?ball.fl.t : ball.lastT, inPoss=possT===t.idx;
    const brx=rx(t,ball.x), bry=ry(t,ball.y), off=offLineFor(t), gaps=defGaps(t);
    const counter = inPoss && tick<t.counterUntil;
    if(inPoss && (t.wsT==null || tick-t.wsT>4)){ t.wsT=tick; let l=0,r=0; for(const q of o.on){ if(q.role==='GK') continue; const qx=rx(t,q.x), qy=ry(t,q.y); if(qx<brx-5) continue; const w=1+(isDefR(q.role)?0.3:0); if(qy<34) l+=w; else r+=w; } t.weak = l<r-0.5 ? 1 : r<l-0.5 ? -1 : (t.weak||1); }
    let line, depth, width, shift;
    if(inPoss){ line=clamp(brx-25+Math.max(0,t.ment)*3,12,55); depth=counter?48:(brx>68?44:40); width=1.15; shift=0.12; }
    else { line=clamp(brx-25+t.ment*1.5+(t.press===2?5:0),6,40); depth=brx<28?24:29; width=0.7; shift=0.4;
      if(!restart){
        const lo={alta:6,media:0,bassa:-6}[t.lineH]||0;
        let tgt=clamp(brx-22+lo,5,40);
        const bo=ball.owner; let pr=99; if(bo && bo.t!==t.idx) for(const q of t.on){ const d=D2(q,bo); if(d<pr) pr=d; }
        const backPass = ball.fl && ball.fl.t!==t.idx && ball.fl.type==='pass' && rx(t,ball.fl.x1)>rx(t,ball.fl.x0)+3;
        if(t.trap && (backPass || pr<2.2) && brx>28) { tgt+=5; t.stepT=tick; }
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
      if(restart && restart.type==='kick') continue;
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
          if(restart && restart.type==='gk') xr=Math.min(xr,84);
          if(!restart && rx(t,p.x)>xr+4) p.urg=true;
        }
        xr=clamp(xr,4,100); yr=clamp(yr,2,66);
      }
      p.tx=rx(t,xr); p.ty=ry(t,yr);
      if(inPoss && !isDefR(p.role) && p.role!=='GK' && rx(t,p.x)>off-1.0 && rx(t,p.x)>52.5){ p.urg=true; if(rx(t,p.x)>off-0.3) p.tx=rx(t,Math.min(rx(t,p.tx),off-1.5)); }   /* chi è oltre la linea del fuorigioco rientra subito */
    }
    if(restart){ if(restart.type==='pen') penTargets(t); else if(restart.type==='cor') corTargets(t); else if(restart.type==='fk' && (restart.direct||restart.crossFk)) fkTargets(t); return; }
    const gx=t.dir>0?0:PL;
    if(!inPoss && ball.owner){
      const bo=ball.owner;
      const trig = tick<t.pressUntil || (t.press===2 && tick-t.lostT<6);
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
      for(const p of sup){ let c=supCache.get(p.id); if(!c||tick-c.t>3){ c={t:tick,s:freeSpot(p,t,o,bo.x,bo.y,11+(counter?4:0))}; supCache.set(p.id,c); } if(c.s){ p.tx=p.tx*0.3+c.s[0]*0.7; p.ty=p.ty*0.3+c.s[1]*0.7; } }
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
    for(const p of t.on){ if(p.wall && tick-p.wall.t<14 && p!==ball.owner && (ball.owner?ball.owner.t===t.idx:ball.fl&&ball.fl.t===t.idx)){ p.tx=p.wall.X; p.ty=p.wall.Y; p.urg=true; } }
    /* v0.4.2.0: il portiere esce sul cross se arriva in tempo nel punto di caduta */
    if(ball.fl && ball.fl.type==='cross' && ball.fl.t!==t.idx){ const f=ball.fl, g=gkOf(t); if(g && !g.dv){ const gl=t.dir>0?0:PL; if(Math.abs(f.x1-gl)<6.5 && Math.abs(f.y1-34)<9.5){ const left=f.tA-f.el, d=hyp(g.x-f.x1,g.y-f.y1); if(d<left*5+1.5){ g.tx=f.x1; g.ty=f.y1; g.urg=true; f.gkOut=g; } } } }
    if(ball.owner && ball.owner.t===t.idx){ const o2=ball.owner; o2.tx=o2.cx??o2.x; o2.ty=o2.cy??o2.y; o2.urg=true; }
  }
  /* --- corpi (v0.4.2.0): velocità desiderata e sguardo decisi qui, la fisica in fisCorpo ---
     camminata e corsa leggera quando non c'è urgenza, scatto (fino a 8,5–9,7 m/s secondo la Velocità) quando c'è;
     i compagni troppo vicini si scansano (separazione morbida), tranne nei duelli per la palla */
  const JOG=3.0, SEP_R=1.7;
  function duelPair(a,b){ if(a.t===b.t) return false; const bo=ball.owner; if(a===bo||b===bo) return true;
    return ball.z<2 && Math.abs(a.x-ball.x)<2.2 && Math.abs(b.x-ball.x)<2.2 && hyp(a.x-ball.x,a.y-ball.y)<2 && hyp(b.x-ball.x,b.y-ball.y)<2; }
  function move(p){
    const t=tm(p);
    /* tuffo del portiere: il movimento è deciso al momento del tiro (gkDecide), qui si esegue */
    if(p.dv){ const d=p.dv, now=(tick+1)*DT;
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
  function energy(p, sp){ const r=sp/7, tt=tm(p); p.st-=1.9*(0.006+0.03*r*r)*(1.5-p.a0.res/20)*0.35/TIME_F*STF*(ROLE_RUN[p.role]||1)*(tt.press===2?1.12:1)*(half===1?0.82:1.22); if(p.st<15) p.st=15; }
  function timers(p){ if(p.stun>0) p.stun-=DT; if(p.runT>0) p.runT-=DT*TDEC; if(p.drib>0) p.drib-=DT*TDEC; if(p.shield>0) p.shield-=DT*TDEC; }
  /* distanza minima tra i corpi: 1,05 m, 0,5 nei duelli per la palla e nelle barriere, 0,6 tra avversari in area sui calci piazzati */
  function sepMin(a,b){
    if(a.dv||b.dv) return 0.45;
    if(restart && restart.wallIds && restart.wallIds.has(a.id) && restart.wallIds.has(b.id)) return 0.5;
    if(a.t!==b.t){ if(duelPair(a,b)) return 0.5;
      if(restart && (restart.type==='cor'||(restart.type==='fk'&&restart.crossFk)) && Math.abs(a.y-34)<20 && Math.abs(b.y-34)<20 && (a.x<17||a.x>PL-17) && (b.x<17||b.x>PL-17)) return 1.02; }
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
  /* bersagli che coincidono (B11 a): se due compagni vanno nello stesso punto, il meno urgente si sposta di lato */
  function deconflict(t){ const on=t.on, n=on.length;
    for(let i=0;i<n;i++){ const a=on[i]; for(let j=i+1;j<n;j++){ const b=on[j]; const dx=b.tx-a.tx, dy=b.ty-a.ty; if(dx*dx+dy*dy>=1.44) continue;
      const m=(!b.urg&&a.urg)||(b.urg===a.urg && hyp(b.x-b.tx,b.y-b.ty)>hyp(a.x-a.tx,a.y-a.ty)) ? b : a, o=m===a?b:a; if(m===ball.owner) continue;
      let ux=m.x-o.tx, uy=m.y-o.ty, L=hyp(ux,uy); if(L<0.1){ ux=-(o.ty-34); uy=o.tx-52.5; L=hyp(ux,uy)||1; } m.tx=o.tx+ux/L*1.3; m.ty=o.ty+uy/L*1.3; } } }

  /* --- palla --- */
  /* giocate di prima: efficaci solo da vicino perché poco precise */
  function firstTime(p){
    const t=tm(p), o=op(p), xr=rx(t,p.x), yr=ry(t,p.y), gx=t.dir>0?PL:0, dg=hyp(gx-p.x,p.y-34), [,press]=nearestOpp(p);
    const from=ball.pass && tick-ball.pass.t<3 ? ball.pass.from : null; if(!from || p.role==='GK') return false;
    /* tiro di prima */
    if(dg<13 && Math.abs(yr-34)<12 && xr>90){ const pr=clamp(0.03+(p.a0.tir-10)*0.015+(p.a0.fre-10)*0.01+(dg<8?0.18:dg<11?0.04:0)+(press<2?0.06:0),0,0.45)*0.35; if(R()<pr){ if(SO) SO.e('dec',SX,{p,k:'prima-tiro'}); shoot(p,'first'); return true; } }
    /* uno-due: il compagno che ha appena passato sta scattando nello spazio */
    if(from.wall && tick-from.wall.t<14 && from.on){ const X=from.x+(from.wall.X-from.x)*0.6, Y=from.y+(from.wall.Y-from.y)*0.6, dl=hyp(X-p.x,Y-p.y);
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
  function stopBall(){ ball.vx=0; ball.vy=0; ball.vz=0; ball.wx=0; ball.wy=0; ball.wz=0; }
  function giveBall(p, delay){
    if(ball.sh && !ball.sh.done && p.t!==ball.sh.p.t){ const gl=T[ball.sh.p.t].dir>0?PL:0, behind=Math.abs(ball.x-gl)<Math.abs(p.x-gl)-0.5;
      shotEnd(p.role==='GK'?(behind?'short':'save'):'block', p); }   /* v0.4.2.0: palla ferma dietro al portiere: non è una parata */
    if(ball.sh && (p!==ball.sh.p)) ball.sh=null;
    ball.owner=p; ball.fl=null; ball.lastT=p.t; ball.lastP=p; stopBall(); p.hold=false; p.hx=null; p.dt=delay??(1.0+R()*0.9); p.cx=undefined; p.cy=undefined; p.ft=delay==null; if(delay==null && firstTime(p)) return;
    if(delay==null && p.role!=='GK'){ const [q,d]=nearestOpp(p); if(q && d<5){ const n=Math.max(0.5,d); p.cx=clamp(p.x+(p.x-q.x)/n*1.5,1,PL-1); p.cy=clamp(p.y+(p.y-q.y)/n*1.5,1,PW-1); } else { const t=tm(p); p.dt=0.7+R()*0.6; const xr=rx(t,p.x); if(xr<78){ p.cx=clamp(p.x+t.dir*4.5,1,PL-1); p.cy=p.y+(34-p.y)*0.08; } } } }
  function loose(x,y,vx,vy,vz,z){ ball.owner=null; ball.fl=null; ball.x=x; ball.y=y; ball.z=z||0; ball.vx=vx; ball.vy=vy; ball.vz=vz||0; ball.wx=0; ball.wy=0; ball.wz=0; }
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
  /* ripresa del gioco (v0.4.2.0): la palla non si teletrasporta. bs = stato della palla nella ripresa:
     'roll' = continua con la sua fisica (anche fuori dal campo); 'wait' = ferma, un raccattapalle sta per rimandarla;
     'fetch'/'hold' = un giocatore va a prenderla (dopo un gol, a inizio secondo tempo); 'toss' = in volo verso il punto della ripresa;
     'ready' = sul punto della ripresa (per la rimessa laterale: in mano a chi la batte) */
  function pause(type, team, x, y, ticks, extra){
    const prev=restart, owned=!!ball.owner; if(owned) stopBall(); if(ball.owner) ball.owner.hold=false; ball.owner=null; ball.fl=null;
    restart={type,team,x:clamp(x,0,PL),y:clamp(y,0,PW),ticks:Math.round(ticks*RS_K),...(extra||{})};
    /* v0.4.1.3: i cambi già chiamati (per esempio dopo un infortunio da fallo) passano alla nuova ripresa e si fanno prima di riprendere il gioco */
    if(prev && prev.subs){ const pend=prev.subs.filter(z=>z.ph<2); if(pend.length){ restart.subs=pend; restart.sub=true; if(prev.winT) restart.winT=prev.winT; } }
    if(SO) SO.e('pause',SX,{type,team,prev});
    if(type==='cor'||type==='gk'||type==='thr') restart.bs='roll';
    else { const sp=Math.hypot(ball.vx,ball.vy,ball.vz), dd=hyp(ball.x-restart.x,ball.y-restart.y);
      if(sp<1.5 && dd<1.5 && ball.z<0.6){ ball.x=restart.x; ball.y=restart.y; ball.z=0; stopBall(); restart.bs='ready'; } else restart.bs='roll'; }
    if(type==='cor' && (!restart.taker||!restart.taker.on)){ restart.taker=specOf(T[team],'cor',q=>q.a0.cpz*0.5+q.a0.crs*0.5); }
    if(!restart.taker || !restart.taker.on){ const tt=T[team]; restart.taker = type==='gk' ? gkOf(tt) : tt.on.filter(q=>q.role!=='GK').sort((a,b)=>hyp(a.x-restart.x,a.y-restart.y)-hyp(b.x-restart.x,b.y-restart.y))[0]; }
  }

  /* varchi tra i difensori avversari (coordinate della squadra che attacca) */
  function defGaps(t){
    const o=T[1-t.idx]; const ys=o.on.filter(q=>q.role!=='GK').map(q=>({x:rx(t,q.x),y:ry(t,q.y)})).sort((a,b)=>b.x-a.x).slice(0,5).map(q=>q.y).sort((a,b)=>a-b);
    const e=[2,...ys,66], g=[]; for(let i=0;i<e.length-1;i++){ const w=e[i+1]-e[i]; if(w>=5) g.push({y:(e[i]+e[i+1])/2,w}); } return g;
  }
  function oppMidLine(t){ const o=T[1-t.idx]; const ms=o.on.filter(q=>ROLE_GROUP[q.role]==='C'); return ms.length? ms.reduce((s,q)=>s+rx(t,q.x),0)/ms.length : 60; }
  function pathFree(p,o,X,Y,r){ for(const q of o.on){ if(segDist(q.x,q.y,p.x,p.y,X,Y)<r || hyp(q.x-X,q.y-Y)<r) return false; } return true; }
  const aerial=(q,R)=>q.a.tes+q.a.ele*0.6+(q.h-180)*0.13+q.a.for*0.2+R()*8;
  const weakFoot=p=>p.foot!=='A' && hashN((p.hk*31+tick)>>>0)<0.28;   /* v0.4.2.0: il piede debole da hash, non da R() */
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
      if(tick<t.counterUntil && gain>0.005) u*=1.35;
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
    if(c.k==='pass'){ if(!c.through && c.dl<16 && xr>55 && xr<92 && p.role!=='GK' && !contact){ const WX=rx(t,Math.min(97,xr+11)), WY=ry(t,yr+(34-yr)*0.25); if(pathFree(p,o,WX,WY,2.5)) p.wall={t:tick,X:WX,Y:WY}; } return pass(p,c); }
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
    if(!aim){ const [q,dq]=nearestOpp(p); if(q && dq<2.2 && R()<0.3+(q.a0.pos-10)*0.015){ t.st.pa++; p.s.pa++; q.s.int++; const gl=t.dir>0?PL:0, a=Math.atan2(0,gl-p.x)+(R()-0.5)*1.2, k=8+R()*8; loose(ball.x,ball.y,Math.cos(a)*k,Math.sin(a)*k,1+R()*3,0.3); ball.lastT=q.t; ball.lastP=q; ball.ct=tick; return; } }
    const left=ry(t,p.y)<34, wrong=(p.foot==='D'&&left)||(p.foot==='S'&&!left);
    const q=(ball.sp&&ball.sp.type==='cor'&&tick-ball.sp.t<2 ? (p.a0.crs+p.a0.cpz)/2 : p.a0.crs)-(wrong?2.5:0), err=clamp((21-q)*0.45,1,9);
    let X=(aim?aim[0]:rx(t,clamp(rx(t,tg.x)+R()*3-1,90,100)))+(R()-0.5)*err*0.6, Y=clamp((aim?aim[1]:tg.y)+(R()-0.5)*err,18,50);
    t.st.pa++; p.s.pa++; fly('cross',p,X,Y,20,4,{recv:tg,curl:(R()<0.5?1:-1)*(6+R()*8)});
  }
  /* --- tiri (v0.4.2.0): il tiratore sceglie un punto della porta, la qualità decide errore di mira, potenza e rotazione,
     poi la palla vola con la fisica. Lo xG si calcola come prima solo per statistiche e pagelle: non decide l'esito.
     Blocchi dei difensori e intervento del portiere sono calcolati sulla traiettoria (shotPlan) e accadono quando la palla ci arriva. */
  const gn=Rf=>(Rf()+Rf()+Rf()+Rf()-2)*1.732;          // ~ normale standard
  function segPt(px,py,ax,ay,bx,by){ const vx=bx-ax, vy=by-ay, L=vx*vx+vy*vy; let u=L>1e-9?((px-ax)*vx+(py-ay)*vy)/L:0; u=u<0?0:u>1?1:u; return hyp(ax+u*vx-px, ay+u*vy-py); }
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
    ball.sh={p, kind, tick, f:ball.fl, done:false, sot:false};
    if(kind==='pen' && gk) penDive(gk,p);
    if(SO) SO.e('fly',SX,{f:ball.fl, speed:v});
    shotPlan(ball.fl);
  }
  /* rigore: il portiere sceglie un lato al momento del calcio (o resta al centro, raramente) */
  function penDive(gk,p){ const pref=(p.hk&1)?1:-1, u=R(); const s= u<0.07?0 : u<0.07+0.93*(0.5+(gk.a0.pos-10)*0.01) ? pref : -pref;
    if(s===0) return; const sgn=gk.t===0?(T[0].dir>0?1:-1):(T[1].dir>0?1:-1);
    gk.dv={t0:tick*DT, dur:0.5, x0:gk.x, y0:gk.y, x1:gk.x+sgn*0.3, y1:34+s*(1.3+(gk.h-186)*0.005), s, tl:1.25, lie:1.4}; }
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
  /* il portiere arriva sulla traiettoria? tempo di reazione, spostamento e tuffo (Parate, altezza), presa o respinta (Presa) */
  function gkDecide(f,gk,tc,yc,zc,ly,lz,vAt){
    const onFrame= ly!=null && Math.abs(ly-34)<FIS.GW+0.3 && lz+FIS.R<FIS.GH+0.3;
    const par=gk.a0.par, hh=gk.h||186, arm=0.85+(hh-186)*0.004+(tc<0.45&&f.kind!=='pen'?0.3:0);   /* da vicino il portiere si allarga (gambe e braccia aperte) */
    const pen=f.kind==='pen';
    let bodyY=gk.y, avail, tr=0;
    if(pen){ const d=gk.dv; if(d){ const u=clamp((tc-(d.t0-tick*DT))/d.dur,0,1), e=u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2; bodyY=d.y0+(d.y1-d.y0)*e; } avail=0.25; }
    else { tr=0.13-(par-10)*0.008+(f.screen?0.08:0); const dmax=2.6+(par-10)*0.04+(hh-186)*0.008, vd=GK_VD+(par-10)*0.09; avail=Math.max(0,Math.min(dmax,(tc-tr)*vd))*(0.82+0.36*R()); }
    const dy=yc-bodyY, ady=Math.abs(dy), hz=zc+FIS.R;
    if(!onFrame && ady>arm+avail+0.4){ return; }
    const vert= hz>2.05?(hz-2.05)*1.6 : (hz<0.35&&ady>0.9?0.15:0), need=Math.max(0,hyp(Math.max(0,ady-(pen?0.15:0.3)),vert)-(pen?arm-0.15:arm));
    const reach= need<=avail+(pen?0:0), side=dy>=0?1:-1;
    if(!pen){ const mv=reach?Math.max(0,ady-arm*0.7):avail; const dive=mv>0.45||(hz<0.45&&ady>0.6);
      if(mv>0.12){ const sgn=T[f.t].dir; gk.dv={t0:tick*DT+tr, dur:clamp(mv/4+0.18,0.25,0.55), x0:gk.x, y0:gk.y, x1:gk.x-sgn*0.15, y1:clamp(gk.y+side*Math.min(mv,2.4),20,48), s:side, tl:dive?1.2:0.25, lie:dive?0.7:0.2}; } }
    let res='miss';
    if(reach){ const pc=clamp(0.62+(gk.a0.pre-10)*0.035-Math.max(0,vAt-17)*0.03-(ady>1.2?0.25:0)-(hz>1.9||hz<0.3?0.15:0)-(pen?0.25:0),0.05,0.93); res=R()<pc?'catch':'parry'; }
    f.gkp={t:tc, res, y:yc, z:zc};
  }
  /* blocco del difensore: la palla rimbalza sul corpo con una direzione nuova (fisica, con un po' di caso) */
  function doBlock(f){ const q=f.blk.q, p=f.from; ball.fl=null; q.s.int++; ball.ct=tick;
    /* deviazione: spesso torna indietro, a volte prosegue deviata verso il fondo (angolo) */
    const v=Math.hypot(ball.vx,ball.vy,ball.vz), fw=RP()<0.38, a=Math.atan2(ball.vy,ball.vx)+(fw?(RP()-0.5)*1.4:Math.PI+(RP()-0.5)*2.6), k=v*(fw?0.35+RP()*0.3:0.25+RP()*0.35);
    ball.vx=Math.cos(a)*k*0.8+ball.vx*0.15; ball.vy=Math.sin(a)*k*0.8+ball.vy*0.15; ball.vz=Math.abs(ball.vz)*0.3+RP()*4; ball.wx=0; ball.wy=0; ball.wz=0;
    ball.lastT=q.t; ball.lastP=q; shotEnd('block',q); }
  /* il portiere arriva sulla palla: presa o respinta (che può finire in angolo, sul palo o, raramente, in porta) */
  function doSave(f){ const gk=f.gk, g=f.gkp; f.gkDone=true; if(!gk.on || g.res==='miss') return; ball.ct=tick;
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
    if(res==='save'){ t.st.sot++; p.s.sot++; sh.sot=true; if(gk){ gk.s.sv++; gk.s.svv+=(Math.abs(T[0].goals-T[1].goals)<=1 && minNum(tick)>=75 ? 1.4 : 1)*(f.xg>0.25?1.5:1); } }
    const g=q&&q.role==='GK'?q:gk;
    if(k==='pen'){ E('miss',p.t,[p.id].concat(g?[g.id]:[]), res==='save'?fill2(MTX.pmiss[0],{s:p,g:g||p}) : res==='post'?`Palo! ${p.ln} colpisce il palo dal dischetto.` : fill2(MTX.pmiss[1],{s:p,g:g||p})); }
    else if(res==='save') E('save',p.t,[p.id].concat(g?[g.id]:[]),fill2(P(k==='fk'?MTX.fkSave:MTX.save),{s:p,g:g||p}),{x:ball.x,y:ball.y,...(k==='fk'?{fk:1}:{})});
    else if(res==='block') E('block',p.t,[p.id,q.id],fill2(P(k==='fk'?MTX.fkWall:MTX.block),{s:p,d:q}));
    else if(res==='post') E('post',p.t,[p.id],fill2(P(MTX.post),{s:p}));
    else if(res==='wide') E('wide',p.t,[p.id].concat(gk?[gk.id]:[]),fill2(P(k==='fk'?MTX.fkWide:MTX.wide),{s:p,g:gk||p}),k==='fk'?{x:ball.x,y:ball.y,fk:1}:undefined);
    if(SO) SO.e('shotend',SX,{f});
  }

  /* errore arbitrale: evento con il commento del giornalista, poi la protesta dell'allenatore danneggiato */
  function refError(kind, victimSide, ids, txt, cm){ errLeft--; refErrs.push(kind); E('referr',victimSide,ids,txt,{kind,cm}); protest(T[victimSide], true); }
  function protest(t, strong){
    if(t.coachOut || t.pendOff) return; const car=(t.coach&&t.coach.car)||10, sur=t.coach.n.split(' ').slice(-1)[0];
    if(RC()>=(strong?0.4:0.05)+(car-10)*(strong?0.045:0.01)) return;
    if(RC()<(strong?0.2:0.06)+(car-10)*0.035){ t.pendOff=true; E('protest',t.idx,[],`${sur} perde la testa: urla contro l'arbitro ${RF.n||''} e scaglia via la giacca.`.replace('  ',' ')); }
    else E('protest',t.idx,[],`${sur} protesta a lungo con il quarto uomo.`);
  }
  /* cambi solo a gioco fermo: l'assistente vicino alle panchine va a centrocampo a controllare */
  function queueSub(t,outP,inP,why){ startSub(t,outP,inP,outP.slot,why,false); }
  /* sequenza del cambio: chi entra va a centrocampo fuori dal campo e aspetta; chi esce lascia il campo; l'assistente arriva e autorizza l'ingresso */
  const subW=t=>[52.5+(t.idx===0?-1.2:1.2), -1.3];
  function startSub(t,outP,inP,slot,why,noRemove){
    if(!restart || restart.type==='pen' || restart.type==='cel'){ t.qsub.push({outP,inP,slot,why,noRemove}); return; }
    inP.used=true; inP.walkIn=true; inP.x=benchX(t.idx)+(t.idx===0?2.5:-2.5); inP.y=-3.4;
    if(outP && noRemove){ outP.leave=36; outP.lw=2; }
    if(why!=='Cambio forzato' && why!=='Entra il portiere di riserva'){ restart.winT=restart.winT||[false,false]; if(!restart.winT[t.idx]){ restart.winT[t.idx]=true; t.win++; } }
    (restart.subs=restart.subs||[]).push({t,outP,inP,slot,why,noRemove,ph:(outP&&!noRemove)?0:1,t0:tick}); restart.sub=true;
    E('subcall',t.idx,[inP.id].concat(outP?[outP.id]:[]),`Pronto il cambio per ${t.inp.n}: ${outP?'esce '+outP.ln+', ':''}entra ${inP.ln}.`);
  }
  function stepSubs(force){
    if(!restart || !restart.subs) return;
    for(const z of restart.subs){
      if(z.ph===0 && (z.outP.y<0.15 || !z.outP.on || force || tick-z.t0>70)){ const o=z.outP; if(o.on){ o.on=false; o.subbed=true; z.t.on=z.t.on.filter(q=>q!==o); } o.leave=36; o.lw=0; z.ph=1; }
      if(z.ph===1){ const W=subW(z.t); if(force || tick-z.t0>90 || (hyp(z.inP.x-W[0],z.inP.y-W[1])<0.7 && hyp(ref.a1.x-52.5,ref.a1.y+1)<2)){
        z.ph=2; const slot=(z.outP&&!z.noRemove)?z.outP.slot:z.slot; doSub(z.t,z.outP,z.inP,slot,z.why); z.inP.x=W[0]; z.inP.y=0.4; } } }
  }
  function benchX(side){ return 52.5+(side===0?-9:9); }
  function moveTo(o,tx,ty,vmax){ const dx=tx-o.x, dy=ty-o.y, d=hyp(dx,dy); if(d<0.05) return; const s=Math.min(d,vmax); o.x+=dx/d*s; o.y+=dy/d*s; }
  function moveRefs(){
    const r=restart, bx=ball.x, by=ball.y, yd=x=>58-(x-16)*(48/73);
    let tx, ty, vmax=3.3;
    const cardP = r&&r.card&&!r.card.shown ? all.get(r.card.pid) : null;
    if(cardP){ const s=cardP.x<ref.x?1:-1; tx=cardP.x+s*1.4; ty=cardP.y+0.6; vmax=3.6;
      if(hyp(ref.x-cardP.x,ref.y-cardP.y)<2.4){ r.card.shown=true; ref.cardK=r.card.k; ref.cardT=tick; } }
    else if(r&&r.coach&&!r.coach.shown){ tx=benchX(r.coach.side); ty=1.6; vmax=3.6; if(hyp(ref.x-tx,ref.y-ty)<2.2){ r.coach.shown=true; ref.cardK=4; ref.cardT=tick; } }
    else if(r&&(r.type==='cel'||r.type==='kick')){ tx=52.5+(r.type==='cel'?0:-3); ty=yd(52.5)+4; vmax=2.4; }
    else if(r&&r.type==='pen'){ const gx=r.x>52.5?PL:0; tx=gx+(gx?-14:14); ty=gx?34-14:34+14; }
    else { const pt=ball.owner?tm(ball.owner):ball.fl?T[ball.fl.t]:null, dir=pt?pt.dir:0;
      tx=clamp(bx-dir*7,14,91); const yl=yd(tx); ty=yl+(by-yl)*0.3;
      let dx=tx-bx, dy=ty-by, d=hyp(dx,dy); if(d<9){ if(d<0.01){dx=0;dy=1;d=1;} tx=bx+dx/d*9; ty=by+dy/d*9; }
      if(r) vmax=2.6; }
    if(tick-ref.cardT>=8) moveTo(ref,clamp(tx,-1,PL+1),clamp(ty,1,PW-1),vmax);
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
    else if(RA()<((f.yc?0.55:1)*(0.17+(f.tem-10)*0.014)+(lastMan?0.35:0)+(inBox?0.1:0)+(tick<o.counterUntil?0.3:0))*cardF*0.86) card = f.yc?'y2':'yc';
    if(RP()<0.008) injure(v);
    if(card){ if(card==='yc'){ f.yc=1; t.st.yc++; E('yc',f.t,[f.id,v.id],fill2(P(MTX.yc),{p:f,v})); } else { t.st.rc++; if(card==='y2'){ t.st.yc++; } f.s.red=1; E(card==='rc'?'rc':'rc',f.t,[f.id,v.id],fill2(P(card==='rc'?MTX.rc:MTX.y2),{p:f,v})); sendOff(f); } }
    if(inBox){ E('pen',v.t,[v.id,f.id],fill2(P(MTX.pen),{p:f,v})); const tk=specOf(o,'pen',q=>q.a0.cpz*0.6+q.a0.fre*0.4); pause('pen',o.idx,o.dir>0?PL-11:11,34,60+Math.floor(RA()*20),{taker:tk}); }
    else { const dgx=105-vxr, dist=hyp(dgx,vyr-34), ang=Math.abs(vyr-34)/Math.max(1,dgx);
      if(dist<=28 && ang<1.0 && R()<(dist<22?0.5:0.3)){ const tk=specOf(o,'fk',q=>q.a0.cpz*0.7+q.a0.lun*0.3); pause('fk',o.idx,v.x,v.y,50+Math.floor(RA()*20),{taker:tk,direct:true,wall:dist<19?5:dist<24?4:3}); E('fkset',o.idx,[tk.id],`Punizione dal limite per ${o.inp.n}: sul pallone ${tk.ln}.`); }
      else if(dgx<=40 && dgx>=14){ const tk=specOf(o,'cor',q=>q.a0.cpz*0.5+q.a0.crs*0.5); pause('fk',o.idx,v.x,v.y,40+Math.floor(RA()*16),{taker:tk,crossFk:true}); E('fkx',o.idx,[tk.id],`Punizione dalla trequarti per ${o.inp.n}: la batte ${tk.ln}.`); }
      else pause('fk',o.idx,v.x,v.y,14+Math.floor(RA()*12),{taker:v}); }
    if(card && restart){ restart.card={pid:f.id,k:card==='yc'?1:card==='y2'?3:2,shown:false}; restart.ticks=Math.max(restart.ticks,16); if(card!=='yc'){ f.leave=44; f.lw=10; } }
    if(card && card!=='yc') protest(t,false); else if(inBox) protest(t,false);
  }
  function injure(p){ if(p.inj||p.out) return; p.inj=true; p.leave=50; p.lw=12; p.dv=null; if(!restart) pause('drop',1-p.t,ball.x,ball.y,80); E('inj',p.t,[p.id],fill2(P(MTX.inj),{p})); forcedOut(p,'inj'); }
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
    t.chg.push({tick, ment, g0:t.goals, c0:T[1-t.idx].goals});
    const pool=t.on.slice(); t.form=form; t.slots=FORMATIONS[form].map(([r,y])=>({r,y}));
    const x=bestXI(pool, form); const used=new Set();
    x.xi.forEach((pp,i)=>{ if(!pp) return; const p=all.get(pp.id); p.slot=i; p.role=t.slots[i].r; used.add(p.id); });
    t.on.filter(p=>!used.has(p.id)).forEach(p=>{ const free=t.slots.findIndex((s,i)=>!t.on.some(q=>used.has(q.id)&&q.slot===i)); p.slot=free<0?0:free; p.role=t.slots[p.slot].r; used.add(p.id); });
    t.ment=ment; assignMarks(t); assignMarks(T[1-t.idx]); E('form',t.idx,[],txt,{form});
  }
  function coachThink(t){
    const o=T[1-t.idx], mn=minNum(tick), diff=t.goals-o.goals, c=t.coach, sur=c.n.split(' ').slice(-1)[0], sharp=0.5+c.tat/40;
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

  /* gol (v0.4.2.0): deciso dalla geometria in lineCheck. fx: og = autogol (scorer è il difensore), ns/nt = il tiro (in porta) era già contato */
  function goalScored(t, scorer, kind, fx){
    fx=fx||{}; t.goals++; const o=T[1-t.idx]; const og=!!fx.og;
    const dB=t.goals-1-o.goals, mn=minNum(tick), dec=dB===0||dB===-1;
    const gw = dec ? (mn>=80?1.5:1.25) : dB>=2 ? 0.7 : dB<=-2 ? 0.6 : 1;
    if(og) scorer.s.err++; else { scorer.s.g++; scorer.s.gv+=gw; }
    o.on.forEach(q=>q.s.ga++);
    const ast = !og && ball.pass && ball.pass.from.t===t.idx && ball.pass.from!==scorer && tick-ball.pass.t<34 ? ball.pass.from : null; if(ast){ ast.s.as++; ast.s.av+=gw; }
    const gk=gkOf(o);
    const sp = ball.sp && ball.sp.team===t.idx && tick-ball.sp.t<(ball.sp.type==='thr'?14:34) ? ball.sp.type : null;
    const txt= og ? `GOL! Autogol di ${scorer.ln}: la palla finisce nella sua porta.` : kind==='fk'?fill2(P(MTX.fkGoal),{s:scorer}):fill2(P(kind==='pen'?MTX.goalP:kind==='head'?MTX.goalH:MTX.goal),{s:scorer,b:ast||scorer,g:gk||scorer});
    E('goal',t.idx,[scorer.id].concat(ast?[ast.id]:[]),txt,{score:[T[0].goals,T[1].goals],x:ball.x,y:ball.y,sp:sp&&sp!=='thr'?sp:null,...(og?{og:1}:{}),...(fx.ns?{ns:1}:{}),...(fx.nt?{nt:1}:{})});
    if(ball.owner) ball.owner.hold=false; ball.owner=null; ball.fl=null; if(ball.sh) ball.sh.done=true;
    const cel=og ? (t.on.filter(q=>q.role!=='GK').sort((a,b)=>D2(a,ball)-D2(b,ball))[0]||scorer) : scorer;
    const cy = cel.y<34 ? 2.5 : PW-2.5;
    restart={type:'cel', team:o.idx, x:52.5, y:34, ticks:Math.round((60+Math.floor(RA()*20))*RS_K), scTeam:t.idx, scorer:cel, t0:tick, cx:(t.dir>0?PL-2:2), cy, bs:'roll'};
  }
  /* la palla ha superato interamente una linea (centro oltre la linea di almeno un raggio): gol, fuori o rimessa */
  function lineCheck(){
    const bx=ball.x, by=ball.y, r=FIS.R;
    if(bx<-r || bx>PL+r){
      const left=bx<0, atkT=left?(T[0].dir>0?1:0):(T[0].dir>0?0:1), A=T[atkT], D=T[1-atkT];
      if(Math.abs(by-34)<FIS.GW && ball.z+r<FIS.GH){
        const sh=ball.sh; let scorer, kind='open', fx={};
        if(sh && sh.p.t===atkT && tick-sh.tick<14 && sh.p.on){ scorer=sh.p; kind=sh.kind; if(sh.done) fx.ns=1; if(sh.sot) fx.nt=1; else { A.st.sot++; scorer.s.sot++; }
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
          ball.x=gx+side*0.02; ball.y=yc; ball.z=Math.max(0,zc); ball.post=tick; ball.ct=tick; if(ball.sh && !ball.sh.done) shotEnd('post'); } } }
    /* dentro la rete */
    const inG=(ball.x<0||ball.x>PL) && Math.abs(ball.y-34)<FIS.GW && ball.z<FIS.GH;
    if(inG){ const dep=ball.x<0?-ball.x:ball.x-PL; ball.vx*=0.9; ball.vy*=0.9; ball.vz*=0.9;
      if(dep>FIS.NET){ ball.x=ball.x<0?-FIS.NET:PL+FIS.NET; ball.vx*=-0.15; } if(Math.abs(ball.y-34)>FIS.GW-r){ ball.y=34+Math.sign(ball.y-34)*(FIS.GW-r); ball.vy*=-0.15; } if(ball.z>FIS.GH-2*r){ ball.z=FIS.GH-2*r; ball.vz=-Math.abs(ball.vz)*0.15; } }
    /* bandierine (asta alta 1,5 m) */
    if((ball.x<1||ball.x>PL-1) && (ball.y<1||ball.y>PW-1) && ball.z<1.5){ const cx=ball.x<1?0:PL, cy=ball.y<1?0:PW, dx=ball.x-cx, dy=ball.y-cy, d=hyp(dx,dy);
      if(d<r+0.02 && d>1e-6){ const vn=(ball.vx*dx+ball.vy*dy)/d; if(vn<0){ ball.vx-=1.5*vn*dx/d; ball.vy-=1.5*vn*dy/d; } } }
    /* cartelloni */
    if(ball.x<-FIS.BOARD_X||ball.x>PL+FIS.BOARD_X){ ball.x=ball.x<0?-FIS.BOARD_X:PL+FIS.BOARD_X; ball.vx*=-0.25; ball.vy*=0.5; ball.vz*=0.3; }
    if(ball.y<-FIS.BOARD_Y||ball.y>PW+FIS.BOARD_Y){ ball.y=ball.y<0?-FIS.BOARD_Y:PW+FIS.BOARD_Y; ball.vy*=-0.25; ball.vx*=0.5; ball.vz*=0.3; }
  }
  /* sotto-campioni della palla per il visore (3 per tick) */
  const BS=new Float64Array(9); let bsN=0;
  function recSub(q){ if(rec && (q===1||q===3||q===5) && bsN<3){ BS[bsN*3]=ball.x; BS[bsN*3+1]=ball.y; BS[bsN*3+2]=ball.z; bsN++; } }
  /* un tick di palla senza portatore: volo con le sue regole (arrivo, intercetti, blocchi, portiere) e poi fisica pura */
  function ballTick(){
    const h=DT/FIS.SUB; bsN=0;
    for(let q=0;q<FIS.SUB;q++){
      if(ball.owner && !restart){ ownerBall(); recSub(q); continue; }
      const px=ball.x, py=ball.y, pz=ball.z;
      if(fisBallStep(ball,h)){ ball.bn=(ball.bn||0)+1; ball.ct=tick; }
      collide(px,py,pz);
      /* v0.4.2.0: prima la linea (la palla è già tutta oltre?), poi chi la tocca: un portiere che la blocca dietro la linea non salva un gol */
      if(!restart && lineCheck()){ recSub(q); continue; }
      if(!restart){ const f=ball.fl;
        if(f){ f.el+=h;
          if(f.chase){ const r=f.recv; if(r.on && ball.z<1.2 && hyp(r.x-ball.x,r.y-ball.y)<1.3){ const t=tm(f.from); t.st.pc++; f.from.s.pc++; ball.pass={from:f.from,t:tick}; giveBall(r); }
            else { let qb=null; if(ball.z<1.2) for(const q of T[1-f.t].on){ if(q.dv) continue; if(hyp(q.x-ball.x,q.y-ball.y)<1.0){ qb=q; break; } } if(qb){ qb.s.int++; giveBall(qb,0.5); } else if(f.el>f.tA+1.6) ball.fl=null; } }
          else if(f.type==='shot'){ if(f.blk && f.el>=f.blk.t) doBlock(f); else if(f.gkp && !f.gkDone && (f.el>=f.gkp.t || (f.gk.on && (ball.x-f.gk.x)*T[f.t].dir>=-0.15))) doSave(f); else if(f.el>f.tA+2.5) ball.fl=null; }
          else {
            if(f.el>0.12*f.tA && f.el<0.97*f.tA && ball.z<2.2){ const o=T[1-f.t], rr=f.first?1.9:1.1;
              for(const qq of o.on){ if(qq.k<0 || (f.tried&(1<<qq.k))) continue; if(segPt(qq.x,qq.y,px,py,ball.x,ball.y)>=rr) continue; f.tried|=(1<<qq.k);
                if(R()<((rx(T[qq.t],ball.x)<22?0.3:0.08)+qq.a.pos*(f.first?0.016:0.009))*(1-0.35*fatK(qq))){ qq.s.int++; if(f.type!=='clear'&&f.from.s) f.from.s.err+=(rx(tm(f.from),ball.x)<30)?1:0;
                  if(ball.z<1.1) giveBall(qq,0.5); else { const tx=rx(T[qq.t],clamp(rx(T[qq.t],ball.x)+15,0,100)); ball.fl=null; fly('clear',qq,tx,clamp(ball.y+(R()-0.5)*20,3,65),16,5); } break; } } }
            if(ball.fl===f && f.type==='pass' && f.recv && f.recv.on && !f.bad && f.el>0.3*f.tA && ball.z<1.6 && hyp(f.recv.x-ball.x,f.recv.y-ball.y)<1.4) arrive();
            else if(ball.fl===f && f.el>=f.tA) arrive(); } }
        else if(!ball.owner){ /* palla libera: chi è vicino la prende */
          if(ball.z<2.0 && (q&1)===1){ let na=null, nb=null; for(const t of T){ let b=null,bd=1.1; for(const qq of t.on){ if(qq.dv) continue; const d=hyp(qq.x-ball.x,qq.y-ball.y)-(rx(t,ball.x)<18&&Math.abs(ball.y-34)<21?0.35:0)-(qq.role==='GK'&&rx(t,ball.x)<16.5&&Math.abs(ball.y-34)<20.2?(rx(t,ball.x)<6&&Math.abs(ball.y-34)<10?1.0:0.5):0); if(d<bd){bd=d;b=qq;} } if(b){ if(na) nb=b; else na=b; } }
            const gkA=(na&&na.role==='GK')?na:(nb&&nb.role==='GK')?nb:null; if(gkA && hyp(gkA.x-ball.x,gkA.y-ball.y)<1.6 && handsOk(gkA,ball.x,ball.y)){ gkCatch(gkA,1.2); }
            else if(na && !nb) giveBall(na,0.5); else if(na && nb){ const sa=na.a.vel+na.a.con*0.6+R()*10, sb=nb.a.vel+nb.a.con*0.6+R()*10; giveBall(sa>=sb?na:nb,0.5); } } }
        if(!restart) lineCheck(); }
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
      if(f.offside){ t.st.off++; ref.flag=ball.x>52.5?2:1; ref.flagT=tick; E('off',f.t,[r.id],fill2(P(MTX.off),{p:r})); const o=op(f.from); pause('fk',o.idx,ball.x,ball.y,24+Math.floor(RA()*10),{taker:o.on.filter(q=>q.role!=='GK').sort((a,b)=>hyp(a.x-ball.x,a.y-ball.y)-hyp(b.x-ball.x,b.y-ball.y))[0]}); return; }
      if(!f.bad && rx(t,ball.x)<rx(t,f.x0)-6) op(f.from).pressUntil=tick+8;
      if(f.volley && !f.bad && r.on && hyp(r.x-ball.x,r.y-ball.y)<1.3){ ball.pass={from:f.from,t:tick}; ball.owner=r; ball.lastT=r.t; ball.lastP=r; shoot(r,'open'); return; }
      if(!f.bad && r.on && hyp(r.x-ball.x,r.y-ball.y)<(ball.z<0.4?2.0:1.7)){ const [,pr]=nearestOpp(r); if(R()<0.97+(r.a0.ctr-10)*0.008-(pr<1.4?0.09*(1.4-r.a0.ctr/20):0)){ t.st.pc++; f.from.s.pc++; if(rx(t,ball.x)-rx(t,f.x0)>=10) f.from.s.prog++; if(f.keyLike) f.from.s.kp++; ball.pass={from:f.from,t:tick}; giveBall(r); return; } }
      /* corsa sul pallone: se un avversario (o il portiere in uscita) arriva prima, la palla è sua */
      { const dr=r.on?hyp(r.x-ball.x,r.y-ball.y):99; let qb=null,dq=99; for(const q of op(f.from).on){ const inBoxQ=rx(T[q.t],ball.x)<16.5&&Math.abs(ball.y-34)<20; const d=hyp(q.x-ball.x,q.y-ball.y)-(q.role==='GK'?(inBoxQ?1.2:0.4)+(q.a0.usc-10)*0.05:0); if(d<dq){dq=d;qb=q;} }
        if(qb && dq<1.7 && dq<dr-0.3){ qb.s.int++; if(f.through && qb.role==='GK') E('save',f.t,[r.id,qb.id],`${qb.ln} esce e anticipa ${r.ln} sul filtrante.`,{x:ball.x,y:ball.y}); if(qb.role==='GK' && handsOk(qb,ball.x,ball.y)) gkCatch(qb,1.2); else giveBall(qb, qb.role==='GK'?0.8:0.5); return; } }
      if(f.bad && r.on && hyp(r.x-ball.x,r.y-ball.y)<1.7){ const [,pr]=nearestOpp(r); if(R()<0.5+(r.a0.ctr-10)*0.025-(pr<1.5?0.15:0)){ t.st.pc++; f.from.s.pc++; if(rx(t,ball.x)-rx(t,f.x0)>=10) f.from.s.prog++; ball.pass={from:f.from,t:tick}; giveBall(r); return; } }
      if(f.bad) f.from.s.err+= (rx(t,ball.x)<30)?1:0;
      /* v0.4.2.0: nessuno la controlla subito: la palla continua e il compagno la rincorre ancora per poco (passaggio riuscito se ci arriva prima di un avversario) */
      if(r.on && hyp(r.x-ball.x,r.y-ball.y)<7){ f.chase=true; ball.fl=f; }
      return;
    }
    if(f.type==='cross'){
      const t=tm(f.from), o=op(f.from), gk=gkOf(o);
      if(gk && f.gkOut===gk && hyp(gk.x-ball.x,gk.y-ball.y)<1.8 && handsOk(gk,ball.x,ball.y) && R()<(gk.a0.usc*0.7+gk.a0.pre*0.3)/16+(gk.h-185)*0.01+(ball.sp && ball.sp.type==='cor' && tick-ball.sp.t<11?0.1:0)){ gk.s.sv++; gkCatch(gk,1.5); return; }
      const atk=t.on.filter(q=>hyp(q.x-ball.x,q.y-ball.y)<1.5), dfs=o.on.filter(q=>q.role!=='GK'&&hyp(q.x-ball.x,q.y-ball.y)<1.5);
      let ba=null,bs=-1; for(const q of atk){ const s=aerial(q,R)+q.a.pos*0.3; if(s>bs){bs=s;ba=q;} }
      let bd=null,bds=-1; for(const q of dfs){ const s=aerial(q,R)+q.a.pos*0.3; if(s>bds){bds=s;bd=q;} }
      const fromCor = ball.sp && (ball.sp.type==='cor'||ball.sp.type==='fk') && tick-ball.sp.t<11;
      if(ba && bs>bds+(bd?2.5:-99)+(fromCor&&bd?4:0) && R()<(fromCor?0.68:0.8)){ t.st.pc++; f.from.s.pc++; if(rx(t,ball.x)-rx(t,f.x0)>=10) f.from.s.prog++; ball.pass={from:f.from,t:tick}; ball.lastT=ba.t; ball.lastP=ba;
        /* v0.4.2.0: il colpo di testa va in porta solo da buona posizione; altrimenti è una sponda (la palla resta libera vicino) */
        const gxh=t.dir>0?PL:0, dgh=hyp(gxh-ball.x,34-ball.y); if(dgh<14 && R()<0.7){ f.from.s.kp++; ball.owner=ba; shoot(ba,'head'); return; }
        const a=Math.atan2(34-ball.y,gxh-ball.x)+(R()-0.5)*2.2, k=3+R()*5; loose(ball.x,ball.y,Math.cos(a)*k,Math.sin(a)*k,1.5+R()*2,ball.z); return; }
      if(bd){ bd.s.int++; ball.lastT=bd.t; ball.lastP=bd; const tx=rx(o,clamp(rx(o,ball.x)+18+R()*12,0,100)); fly('clear',bd,tx,clamp(ball.y+(R()-0.5)*34,-2,PW+2),18,6); return; }
      return;
    }
    /* spazzate e lanci non controllati: la palla continua */
  }

  /* avversari a distanza regolamentare dal pallone: 9,15 m su angoli, punizioni e calcio d'inizio, 2 m sulla rimessa laterale */
  function keepDistance(now){
    const r=restart; if(!r || r.type==='pen' || r.type==='cel' || r.type==='gk') return;
    const need = r.type==='thr'?2.2 : r.type==='drop'?4.2 : 9.3, o=T[1-r.team];
    for(const p of o.on){ if(p.role==='GK' && r.type!=='kick') continue;
      const px=now?p.x:p.tx, py=now?p.y:p.ty; let dx=px-r.x, dy=py-r.y, d=hyp(dx,dy);
      if(d>=need) continue; if(d<0.01){ dx=-T[r.team].dir; dy=0; d=1; }
      let nx=r.x+dx/d*need, ny=r.y+dy/d*need;
      if(ny<0.5||ny>PW-0.5||nx<0.5||nx>PL-0.5){ const a=Math.atan2(dy,dx); let best=null; for(let s=1;s<=12&&!best;s++) for(const sg of [1,-1]){ const b=a+sg*s*0.26, X=r.x+Math.cos(b)*need, Y=r.y+Math.sin(b)*need; if(X>0.5&&X<PL-0.5&&Y>0.5&&Y<PW-0.5){ best=[X,Y]; break; } } if(best){ nx=best[0]; ny=best[1]; } }
      if(now){ p.x=nx; p.y=ny; } else { p.tx=nx; p.ty=ny; p.urg=true; } }
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
  /* la palla torna sul punto della ripresa: lancio corto (raccattapalle, compagno) con la fisica, senza teletrasporto */
  function toss(r){ const z0=Math.max(ball.z,0.9), L=hyp(r.x-ball.x,r.y-ball.y), z1=r.type==='thr'?1.6:0.5;
    if(L<0.6){ ball.x=r.x; ball.y=r.y; ball.z=r.type==='thr'?1.9:0; stopBall(); r.bs='ready'; return; }
    ball.z=z0; const a=fisLoft(ball.x,ball.y,z0,r.x,r.y,z1,L>30?0.55:L>12?0.7:0.9,0,0); fisKick(ball,a.v,a.az,a.el,0,0); r.tA=a.t; r.te=0; r.bs='toss'; }
  function restartBall(){
    const r=restart, h=DT/FIS.SUB; bsN=0;
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
    if(dk>need) return false;
    if(r.type==='kick'){ for(const tt of T) for(const p of tt.on){ if(p!==tk && (p.x-52.5)*tt.dir>0.4) return false; if(tt.idx!==r.team && hyp(p.x-52.5,p.y-34)<8.6) return false; } return true; }
    if(r.type!=='pen' && r.type!=='cel' && r.type!=='gk'){ const nd=r.type==='thr'?2:r.type==='drop'?4:9.15; for(const q of T[1-r.team].on){ if(q.role==='GK') continue; if(hyp(q.x-r.x,q.y-r.y)<nd-0.9) return false; } }
    return true;
  }
  function execRestart(){
    const r=restart; restart=null; const t=T[r.team]; if(r.type==='cor'||r.type==='fk'||r.type==='pen'||r.type==='thr') ball.sp={type:r.type,t:tick,team:r.team};
    let tk=r.taker && r.taker.on ? r.taker : t.on.filter(q=>r.type==='gk'?q.role==='GK':q.role!=='GK').sort((a,b)=>hyp(a.x-r.x,a.y-r.y)-hyp(b.x-r.x,b.y-r.y))[0];
    if(!tk) tk=t.on[0];
    if(!tk) return;
    if(SO) SO.e('exec',SX,{r,tk});
    ball.x=r.x; ball.y=r.y; if(r.type!=='thr') ball.z=0; stopBall(); ball.sh=null;
    if(r.type==='cor'||r.type==='pen'||(r.type==='fk'&&(r.direct||r.crossFk))) E('spgo',r.team,[tk.id],'',{kind:r.type==='fk'?(r.direct?'fk':'fkx'):r.type,x:r.x,y:r.y});
    if(r.type==='kick'){ E('ko',r.team,[],''); if(half===2 && ht2==null){ ht2=tick; regEnd=tick+Math.round(45*MIN_T); } }
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

  /* --- ciclo principale --- */
  let possTicks=[0,0], nTot=0, lastOwnT=-1;
  const cols = rec ? [...all.keys()] : null, colIdx = rec ? new Map(cols.map((id,i)=>[id,i])) : null, colP = rec ? cols.map(id=>all.get(id)) : null;
  let pbx=52.5, pby=34, pbz=0;
  const capHolder=t=>{ for(const id of (t.inp.capOrder||[])){ const p=all.get(id); if(p&&p.on) return colIdx.get(id); } const q=t.on.slice().sort((a,b)=>b.age-a.age)[0]; return q?colIdx.get(q.id):-1; };
  /* frame (v0.4.2.0): Int16Array, coordinate in centimetri (FR_NONE = assente), orientamento di ogni giocatore in un byte,
     inclinazione del portiere che si tuffa; disposizione in FR_* (in testa al file) */
  const FN=rec?cols.length:0, FLEN=FN*2+24+((FN+1)>>1);
  const qc=v=>{ const r=Math.round(v*100); return r>32767?32767:r<-32767?-32767:r; };
  const pushFrame=()=>{ const f=new Int16Array(FLEN), nb=FN*2;
    for(let i=0;i<FN;i++){ const p=colP[i]; if(p.on||p.leave>0||p.walkIn){ f[i*2]=qc(p.x); f[i*2+1]=qc(p.y); } else { f[i*2]=FR_NONE; f[i*2+1]=FR_NONE; } }
    for(let i=0;i<FN;i+=2){ const a=colP[i], b=i+1<FN?colP[i+1]:null; const ob=x=>Math.round((fisAng(x.o||0)+Math.PI)/(2*Math.PI)*256)&255; f[nb+24+(i>>1)]=ob(a)|((b?ob(b):0)<<8); }
    f[nb]=qc(ball.x); f[nb+1]=qc(ball.y); f[nb+2]=qc(ball.z);
    const sOk=bsN===3 && hyp(BS[6]-ball.x,BS[7]-ball.y)<8;
    for(let q=0;q<3;q++){ const w=(q+1)/4; if(sOk){ f[nb+3+q*3]=qc(BS[q*3]); f[nb+4+q*3]=qc(BS[q*3+1]); f[nb+5+q*3]=qc(BS[q*3+2]); } else { f[nb+3+q*3]=qc(pbx+(ball.x-pbx)*w); f[nb+4+q*3]=qc(pby+(ball.y-pby)*w); f[nb+5+q*3]=qc(pbz+(ball.z-pbz)*w); } }
    const nr=nb+12; f[nr]=qc(ref.x); f[nr+1]=qc(ref.y); f[nr+2]=qc(ref.a1.x); f[nr+3]=qc(ref.a1.y); f[nr+4]=qc(ref.a2.x); f[nr+5]=qc(ref.a2.y);
    const ca=tick-ref.cardT; f[nr+6]= ca<8 ? (ref.cardK===3 ? (ca<4?1:2) : ref.cardK) : 0; f[nr+7]= tick-ref.flagT<7 ? ref.flag : 0; f[nr+8]=capHolder(T[0]); f[nr+9]=capHolder(T[1]);
    for(const t of T){ const g=gkOf(t); f[nb+22+t.idx]=g&&g.tilt?Math.round(g.tilt*1000):0; }
    bsN=0; pbx=ball.x; pby=ball.y; pbz=ball.z; frames.push(f); owners.push(ball.owner?colIdx.get(ball.owner.id):-1); };
  const owners=[];
  startKick(0,true);
  while(true){
    for(const t of T) targets(t);
    if(restart){ const tk=restart.taker&&restart.taker.on?restart.taker:null;
      if(tk && restart.type==='kick'){ if(restart.bs==='ready'){ tk.tx=52.5-T[restart.team].dir*0.3; tk.ty=34; tk.urg=true; } }
      else if(tk){ if(restart.type==='pen'){ const A=T[restart.team]; tk.tx=restart.x-A.dir*1.2; tk.ty=restart.y; } else { tk.tx=restart.x; tk.ty=restart.y; } tk.urg=true; }
      if(restart.fp && restart.bs==='fetch' && restart.fp.on){ restart.fp.tx=ball.x; restart.fp.ty=ball.y; restart.fp.urg=true; }
      keepDistance(false);
      if(restart.subs) for(const z of restart.subs) if(z.ph===0 && z.outP.on){ z.outP.tx=52.5+(z.t.idx===0?-3.5:3.5); z.outP.ty=-0.8; z.outP.urg=false; }
      if(restart.card){ const cp=all.get(restart.card.pid); if(cp && (hyp(cp.x-ref.x,cp.y-ref.y)<9 || tick-ref.cardT<8) && (!restart.card.shown || tick-ref.cardT<8)){ cp.tx=cp.x; cp.ty=cp.y; cp.urg=false; } } }
    for(const t of T) deconflict(t);
    for(const t of T) for(const p of t.on){ move(p); p.mins+=DT/60/TIME_F; }
    separate();
    for(const t of T) for(const p of t.on){ p.x=clamp(p.nx,p.role==='GK'?-0.6:-5.5,p.role==='GK'?PL+0.6:PL+5.5); p.y=clamp(p.ny,-4.5,PW+4.5); if(p===ball.owner){ const m=p.hold?0.6:0.5; p.x=clamp(p.x,m,PL-m); p.y=clamp(p.y,0.5,PW-0.5); if(p.hold){ const t=T[p.t]; p.x=rx(t,Math.min(rx(t,p.x),15.6)); p.y=clamp(p.y,34-19.5,34+19.5); } } }
    buildDist();
    if(restart && restart.type!=='pen' && restart.type!=='cel' && restart.ticks>3) for(const t of T){
      while(t.qsub.length){ const z=t.qsub.shift(); if((z.noRemove||!z.outP||z.outP.on) && !z.inP.on && !z.inP.walkIn && t.subs>0) startSub(t,z.outP,z.inP,z.slot??z.outP.slot,z.why,z.noRemove); }
      if(t.pendOff){ t.pendOff=false; t.coachOut=true; coachOff[t.idx]=true; const sur=t.coach.n.split(' ').slice(-1)[0]; E('coachoff',t.idx,[],`L'arbitro ${RF.n||''} va verso la panchina e allontana ${sur}: l'allenatore lascia il campo e salterà la prossima partita.`.replace('  ',' ')); restart.coach={side:t.idx,shown:false}; restart.ticks=Math.max(restart.ticks,30); } }
    stepSubs(false);
    if(restart && restart.subs && restart.subs.some(z=>z.ph<2) && restart.ticks<=3) restart.ticks++;
    if(restart && ((restart.card&&!restart.card.shown)||(restart.coach&&!restart.coach.shown)) && restart.ticks<=3 && (restart.hold=(restart.hold||0)+1)<40) restart.ticks++;
    if(restart){ if(restart.ticks>0) restart.ticks--;
      restartBall();
      if(restart.ticks<=0){ if(restart.type==='cel'){ if(restart.bs!=='roll'||hyp(ball.vx,ball.vy)<0.5) endCel(); } else if(rsReady(restart)) execRestart(); } }
    else if(ball.owner){
      const o=ball.owner;
      ownerBall();
      let lost=false;
      for(const q of op(o).on){ if(q.role==='GK'&&(D2(q,o)>2.4||rx(tm(q),o.x)>16.5)) continue; if(q.stun>0||q.dv) continue; const d=D2(q,o); const box=rx(tm(q),q.x)<18 && Math.abs(q.y-34)<22; const eng=q.eng==='press'||q.eng==='contain'||q.role==='GK', pa=q.role==='GK'?0.3*(0.7+q.a0.usc/30):(q.eng==='press'||box?(d<1?0.3:0.16):(d<1?0.2:0.08))*(box?1.7:1)*(0.82+q.a0.agg/45)*CONTEST_K; if(d<(eng?2.0:1.6) && R()<pa){
          const dp=(q.role==='GK'?q.a.usc*0.7+q.a.par*0.3:o.drib>0?q.a.con*0.6+q.a.vel*0.3+q.a.for*0.1:q.a.con*0.75+q.a.for*0.25)*(0.45+0.55*q.st/100), ap=(o.drib>0?o.a.dri*0.6+o.a.vel*0.3+o.a.for*0.1:o.a.dri*0.5+o.a0.ctr*0.25+o.a.for*0.25)*(0.45+0.55*o.st/100)*0.95*(o.shield>0?1.35:1); const fl=R()<o.fl*1.2; const win=!fl && R()<dp/(dp+ap);
          const inOwnBox=(rx(tm(q),q.x)<17.5||rx(tm(q),o.x)<17.5)&&Math.abs(o.y-34)<21; if(R()<(0.19+(q.a0.agg-8)*0.009+(q.tem-10)*0.005+(win?0:0.07)+fatK(q)*0.03)*(inOwnBox?0.023*penF:1)*(q.yc?0.45:1)*fisF){ foul(q,o); lost=true; break; }
          if(win && inOwnBox && canErr('rigSi') && rx(tm(o),o.x)>88.5 && Math.abs(o.y-34)<20 && RA()<0.035){ const oo=tm(o); refError('rigSi',q.t,[q.id,o.id],`Contatto in area tra ${q.ln} e ${o.ln}: l'arbitro indica il dischetto!`,`Dal replay si vede che ${q.ln} prende il pallone in modo pulito. È sicuramente un errore arbitrale: il rigore non c'era.`); E('pen',o.t,[o.id,q.id],fill2(P(MTX.pen),{p:q,v:o})); const tk=specOf(oo,'pen',z=>z.a0.cpz*0.6+z.a0.fre*0.4); pause('pen',oo.idx,oo.dir>0?PL-11:11,34,60,{taker:tk}); lost=true; break; }
          if(win){ q.s.tk++; o.stun=0.5; lost=true;
            /* v0.4.2.0: contrasto vinto: palla pulita al difensore oppure palla che schizza via (più spesso lontano dalla sua porta) */
            const own=rx(tm(q),q.x)<20 && Math.abs(q.y-34)<22;
            if(q.role==='GK'){ if(handsOk(q,ball.x,ball.y)) gkCatch(q,1.5); else giveBall(q,0.6); break; }
            if(RP()<0.42+(q.a0.con-10)*0.02+(own?0.18:0)){ giveBall(q,0.6); break; }
            const qd=T[q.t].dir, a=Math.atan2(o.y-q.y,o.x-q.x)*0.5+(qd>0?0:Math.PI)*0.5+(RP()-0.5)*2.2, k=2.5+RP()*5; loose(ball.x,ball.y,Math.cos(a)*k+o.vx*0.2,Math.sin(a)*k+o.vy*0.2,RP()<0.2?1.5+RP()*2:0); ball.lastT=q.t; ball.lastP=q; break; }
          o.s.drw++; q.stun=o.drib>0?1.3:0.8; if(fl) E('flash',o.t,[o.id,q.id],fill2(P(MTX.flD),{p:o,d:q}),{flash:[o.id]}); break; } }
      if(!lost && ball.owner===o && Math.abs(o.y-34)>27) op(o).pressUntil=Math.max(op(o).pressUntil,tick+3);
      if(!lost && ball.owner===o){ o.dt-=DT*TDEC; if(o.dt>0.6){ const [,pr]=nearestOpp(o); if(pr<1.5) o.dt=Math.min(o.dt,0.6); } if(o.cx!=null && !o.ft && hyp(o.cx-o.x,o.cy-o.y)<1) o.dt=Math.min(o.dt,0); if(o.dt<=0) decide(o); }
      if(!restart && ball.owner) lineCheck();
      if(!restart && !ball.owner) ballTick();
    } else ballTick();
    for(const t of T) for(const p of t.on){ if(RP()<0.65e-6/TIME_F*(1+(100-p.st)/40)) injure(p); }
    if(tick%Math.round(120*TIME_F)===60) for(const t of T) coachThink(t);
    for(const t of T) for(const p of t.on) if((isAtt(p.role)||((p.role==='CM'||p.role==='AM')&&rx(t,ball.owner?ball.owner.x:0)>62)) && p.runT<=0 && ball.owner && ball.owner.t===t.idx && ball.owner!==p && rx(t,ball.owner.x)>32 && R()<runProb(t,p)*RUN_K){ p.runT=3.5; p.runOff=-0.4-R()*1.2+(R()<0.3-(p.a.dec-10)*0.02?1.8:0); if(R()<p.fl*0.8) E('flash',t.idx,[p.id],fill2(P(MTX.flR),{p}),{flash:[p.id]}); }
    const pt=ball.owner?ball.owner.t:ball.fl?ball.fl.t:-1; if(pt>=0) possTicks[pt]++;
    if(ball.owner && ball.owner.t!==lastOwnT){ const w=T[ball.owner.t], l=T[1-ball.owner.t]; if(lastOwnT>=0){ w.wonT=tick; l.lostT=tick;
        const brw=rx(w,ball.x), behind=l.on.filter(q=>q.role!=='GK' && rx(w,q.x)>brw).length; if(brw<75 && behind<=6 && !restart){ w.counterUntil=tick+22; w.on.forEach(q=>{ if(isAtt(q.role)&&q!==ball.owner){ q.runT=3.5; q.runOff=-0.6-R()*1.0; } }); } }
      lastOwnT=ball.owner.t; }
    moveRefs();
    if(SO) SO.tick(SX);
    if(rec) pushFrame();
    tick++;
    /* recupero: dipende dal tempo perso (esultanze, cambi, infortuni, cartellini, allontanamenti) */
    if(restart && (restart.type==='cel'||restart.type==='drop'||(restart.subs&&restart.subs.some(z=>z.ph<2))||(restart.card&&!restart.card.shown)||(restart.coach&&!restart.coach.shown))) lost[half-1]++;
    if(tick===regEnd){ const lm=lost[half-1]/MIN_T, add=clamp(Math.round(lm*0.75+(half===1?0.9:2.2)+RA()*1.2),half===1?1:2,half===1?6:9); halfEnd=tick+Math.round(add*MIN_T); E('added',0,[],`Il quarto uomo alza il tabellone: ${add} minut${add===1?'o':'i'} di recupero.`,{add}); }
    if(half===1 && tick>=halfEnd){ stepSubs(true); E('ht',0,[],`Fine primo tempo: ${T[0].inp.n} ${T[0].goals}-${T[1].goals} ${T[1].inp.n}.`); half=2; htTick=tick;
      if(ball.owner) ball.owner.hold=false; ball.owner=null; ball.fl=null; restart=null;
      T.forEach(t=>{ t.dir=-t.dir; t.on.forEach(p=>{ p.st=Math.min(100,p.st+7); p.dv=null; p.tilt=0; p.stun=0; }); htSubs(t); t.counterUntil=-1; t.pressUntil=-1; t.dline=null; });
      startKick(1,false); halfEnd=1e9; regEnd=-1; E('kick',1,[],'Inizia il secondo tempo.'); }
    else if(half===2 && tick>=halfEnd){ break; }
    if(tick>30000) break;   /* sicurezza: una partita vera dura circa 11.700 tick */
  }

  stepSubs(true);
  /* v0.4.2.0: un cambio chiamato ma non ancora iniziato al fischio finale non si fa più: chi aspettava torna in panchina */
  for(const t of T){ t.qsub.length=0; for(const p of t.bench) if(p.walkIn && !p.on){ p.walkIn=false; p.used=false; } }
  /* v0.4.1.3: un cambio già in corso al fischio finale si completa (come all'intervallo): nessun sostituto resta a bordo campo */
  if(SO) SO.e('end',SX,{});
  E('ft',0,[],`Fischio finale: ${T[0].inp.n} ${T[0].goals}-${T[1].goals} ${T[1].inp.n}.`);
  // pagelle
  const rt={}, played=[[],[]], mins={}, endSt={}, inj={}, red=[];
  for(const [id,p] of all){ if(p.mins<=0) continue; const t=T[p.t], o=T[1-p.t]; played[p.t].push(id); mins[id]=Math.round(p.mins); endSt[id]=Math.round(p.st);
    const s=p.s, res=Math.sign(t.goals-o.goals), rg=RATE_G[p.role]||'CM', w=RATE_W[rg];
    const acc = s.pa>=8 ? clamp((s.pc/s.pa-0.74)*w.acc,-0.5,0.5) : 0, cs = s.ga===0 && p.mins>=60 ? w.cs : 0;
    let raw = w.g*s.gv + w.as*s.av + w.kp*Math.min(6,s.kp) + w.sot*Math.min(5,s.sot) + w.tk*Math.min(10,s.tk) + w.int*Math.min(10,s.int) + w.drw*Math.min(8,s.drw)
      + w.prog*Math.min(14,s.prog) + w.sv*s.svv + acc + cs + w.ga*s.ga + w.err*s.err - p.yc*0.3 - s.red*1.6 + (rg==='ST'&&s.sh===0&&p.mins>=60?-0.25:0);
    let r = 6 + (raw - w.mu)*w.k + res*0.25;
    if(p.mins<25) r=6+(r-6)*0.5;
    rt[id]=Math.round(clamp(r,3.5,10)*2)/2; if(globalThis.__RAW && p.mins>=60) globalThis.__RAW.push([rg,raw]); if(p.inj) inj[id]=1+Math.floor(RP()*4); if(p.s.red) red.push(id); }
  const cardsN=T[0].st.yc+T[1].st.yc+T[0].st.rc+T[1].st.rc;
  const rv=clamp(6.4+(RF.esp-10)*0.04+(RA()-0.5)*0.8-refErrs.length*1.1-(cardsN>8?0.3:0)+(refErrs.length===0&&cardsN>=3?0.2:0),4,8.5);
  const refOut={id:RF.id, n:RF.n, voto:Math.round(rv*2)/2, errs:refErrs.slice()};
  E('refvote',0,[],`Voto alla terna arbitrale ${RF.n?'di '+RF.n:''}: ${String(refOut.voto).replace('.',',')}.${refErrs.length?' Pesano '+(refErrs.length===1?'un errore':'due errori')+' decisiv'+(refErrs.length===1?'o':'i')+'.':''}`.replace('  ',' '),{voto:refOut.voto});
  /* voto dell'allenatore */
  const goalT=ev.filter(e=>e.type==='goal'); const coachRt=T.map((t,i)=>{
    if(t.inp.coach && t.inp.coach.absent) return {v:null, why:['squalificato: in panchina il vice']};
    const o=T[1-i], why=[]; let r=6;
    const E_=(str0[i]-str0[1-i])*0.6+(i===0?0.25:-0.25), gd=t.goals-o.goals, dr=clamp(gd-E_,-3,3)*0.32+Math.sign(gd)*0.3; r+=dr;
    if(dr>=0.6) why.push(gd>0?'vittoria oltre le attese':'risultato oltre le attese'); else if(dr<=-0.6) why.push(gd<0?'sconfitta da favorito':'risultato sotto le attese');
    let sb=0; for(const p of t.subIn){ sb+=p.s.gv+p.s.av*0.6; } if(sb>0){ r+=Math.min(1,sb*0.35); why.push('cambi azzeccati'); }
    for(const c of t.chg){ const w=c.tick+Math.round(15*MIN_T); const gf=goalT.filter(e=>e.side===i&&e.t>c.tick&&e.t<=w).length, ga=goalT.filter(e=>e.side!==i&&e.t>c.tick&&e.t<=w).length;
      if(gf>ga){ r+=0.25; why.push('mossa tattica riuscita'); } else if(ga>gf && c.ment<0){ r-=0.3; why.push('si è chiuso e ha subito'); } }
    if(coachOff[i]){ r-=0.8; why.push('allontanato'); }
    if(t.st.rc){ r-=0.3*t.st.rc; why.push('espulsioni'); }
    const cooked=t.on.filter(p=>p.role!=='GK'&&p.st<35).length; if(cooked){ r-=Math.min(0.3,cooked*0.08); why.push('giocatori sfiniti lasciati in campo'); }
    r+=(RC()-0.5)*0.4;
    return {v:Math.round(clamp(r,4,8.5)*2)/2, why}; });
  const scorers=ev.filter(e=>e.type==='goal').map(e=>({pid:e.p[0],side:e.side?'a':'h',min:e.min}));
  const pt=possTicks[0]+possTicks[1]||1;
  const out={gh:T[0].goals, ga:T[1].goals, ev, rt, played, mins, endSt, inj, red, scorers, poss:Math.round(possTicks[0]/pt*100),
    ref:refOut, coachOff, coachRt, stats:T.map(t=>t.st), plans:plans.map((p,i)=>({form:p.form, ment:p.ment, style:p.style, press:p.press, reasons:p.reasons})), nT:tick, htTick, ht2:ht2==null?htTick:ht2};
  if(rec){ out.frames=frames; out.cols=cols; out.owners=owners; }
  return out;
}

/* istantanea dei dati che servono alla partita (così si può rivedere identica) */
function matchInput(t){
  const avail=teamPlayers(t).filter(p=>!(p.inj>0)&&!(p.sq>0));
  return {id:t.id, n:t.n, c:t.c, coach:{n:t.coach.n, tat:t.coach.tat, all:t.coach.all, gio:t.coach.gio, ges:t.coach.ges, mod:t.coach.mod, car:t.coach.car??10, mor:Math.round((t.coach.mor??12)*10)/10, absent:(t.coach.squal||0)>0}, capOrder:[t.cap,t.vcap,...capOrder(t).filter(id=>id!==t.cap&&id!==t.vcap)].filter(id=>id!=null).slice(0,6),
    players:avail.map(p=>({id:p.id, ln:p.ln, r:p.r, age:p.age, a:Object.fromEntries(ATTR.map(k=>[k,Math.round(p.a[k]*10)/10])), st0:Math.round(100-(p.fat||0)), mor:Math.round(p.mor*10)/10, tem:p.tem, h:p.h||180, foot:p.foot||'D', fl:Math.round(flashP(p)*1000)/1000, ovr0:Math.round(ovr(p)*10)/10}))};
}
