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
  '3-4-3':[['GK',34],['CB',20],['CB',34],['CB',48],['LM',8],['CM',27],['CM',41],['RM',60],['LW',14],['ST',34],['RW',54]],
  '5-4-1':[['GK',34],['LWB',7],['CB',21],['CB',34],['CB',47],['RWB',61],['LM',10],['CM',27],['CM',41],['RM',58],['ST',34]]   /* v0.4.5.0 (R3b) */
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
function bestXI(players, form, nz){
  const slots=FORMATIONS[form].map(([r,y])=>({r,y}));
  const fit=p=>0.86+0.14*(p.st0/100)+(p.mor-12)*0.004;
  /* nz (v0.4.5.0, R3b): errore di valutazione dell'allenatore (Lettura della squadra), da hash: sempre lo stesso per lo stesso giocatore */
  const pairs=[]; slots.forEach((s,i)=>players.forEach(p=>pairs.push([suit(p,s.r)*fit(p)+(nz?nz(p,s.r):0),i,p])));
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
/* v0.4.5.0 (R3b): caratteristica dell'allenatore 0–100 (le 10 efficaci di matchInput; partite salvate senza k: dagli equivalenti 1–20) */
function coK(c, K){ if(c && c.k && c.k[K]!=null) return c.k[K]; const eq=K==='ITA'||K==='ANA'||K==='ADA'?c&&c.tat:K==='LSQ'||K==='LGA'||K==='RAP'||K==='GES'?c&&c.ges:null; return eq!=null?clamp((eq-1)/0.19,0,100):50; }
function planMatch(T, O, R){
  /* v0.4.5.0 (R3b): il piano dalle 10 caratteristiche (non più coachEq). ITA = rumore sulla scelta del modulo e delle voci del piano;
     ANA = quanto bene legge l'avversario (rumore sulle sue caratteristiche); ADA = quanto lascia il modulo preferito; LSQ = scelta degli 11 */
  const c=T.coach, ITA=coK(c,'ITA'), ANA=coK(c,'ANA'), ADA=coK(c,'ADA'), LSQ=coK(c,'LSQ'), noise=(100-ITA)/100;
  const ox=bestXI(O.players, FORMATIONS[O.coach.mod]?O.coach.mod:'4-4-2'), of=features(ox);
  for(const k of ['att','attSpeed','defSpeed','aerialAtt','aerialDef','mid','def','res']) of[k]+=(R()-0.5)*2*(1-ANA/100)*1.0;
  const nzT=(p,role)=>(hashU(String(p.id)+'|'+(c.n||''),role.length+role.charCodeAt(0))-0.5)*0.5*(1-LSQ/100);
  let best=null;
  for(const f of Object.keys(FORMATIONS)){
    const x=bestXI(T.players,f,nzT), ft=features(x); let sc=x.score*3; const why=[];
    const md=of.mid-ft.mid;
    if(md>0.4){ const b=(midCount(f)-midCount(ox.form))*0.22*Math.min(2,md); sc+=b; if(b>0) why.push('mid'); }
    if(of.attSpeed-ft.defSpeed>1.2 && f.startsWith('5')){ sc+=0.6; why.push('slow'); }
    if(ft.attSpeed-of.defSpeed>1.2 && (f==='4-3-3'||f==='3-4-3')){ sc+=0.5; why.push('fast'); }
    if(f===c.mod){ sc+=0.55*(1.4-0.8*ADA/100); why.push('fam'); }
    sc+=(R()-0.5)*noise*1.6;
    if(!best||sc>best.sc) best={f,x,ft,sc,why};
  }
  const ft=best.ft, diff=best.x.score-ox.score;
  const ment = diff<-0.9?-1 : diff>0.9?1 : 0;
  const opts=[['possesso',ft.mid-of.mid],['profondità',ft.attSpeed-of.defSpeed-0.6],['cross',ft.aerialAtt-of.aerialDef-1.0],['contropiede',ment<0?ft.attSpeed-9:-9]];
  opts.sort((a,b)=>b[1]-a[1]); const style = opts[0][1]>0.4 ? opts[0][0] : 'equilibrato';
  /* v0.4.5.0 (R3b): pressing su tre livelli dalla resistenza (non più la soglia assoluta res ≥ 10: dopo S1 nessuno la superava), dalla mentalità e dal centrocampo */
  const sbaglia=()=>R()<(1-ITA/100)*0.2, LV3=['alto','medio','basso'];   /* R3b: l'allenatore meno intelligente tatticamente sbaglia più spesso le voci del piano */
  const pS=(ft.res-8.5)+ment*0.8+(ft.mid-of.mid)*0.3; let pressLv=pS>0.3?'alto':pS<-0.6?'basso':'medio'; if(sbaglia()) pressLv=LV3[Math.floor(R()*3)];
  const press=pressLv==='alto'?2:pressLv==='basso'?0:1;
  const sur=c.n.split(' ').slice(-1)[0], rs=[];
  rs.push(best.f===c.mod?`${sur} conferma il suo ${best.f}.`:`${sur} lascia il solito ${c.mod} e sceglie il ${best.f}.`);
  if(best.why.includes('mid')) rs.push(`Vuole un uomo in più a centrocampo: l'avversario lì è più forte.`);
  if(best.why.includes('slow')) rs.push(`Cinque dietro per non soffrire la velocità delle loro punte.`);
  if(best.why.includes('fast')) rs.push(`Tre davanti per sfruttare la lentezza dei loro centrali.`);
  rs.push(ment>0?`Si sente più forte: baricentro alto e partita da fare.`: ment<0?`Si sente inferiore: squadra corta e bassa, pronta a ripartire.`:`Partita equilibrata: prudenza ma senza rinunciare ad attaccare.`);
  rs.push({possesso:'Stile: possesso palla e passaggi corti.',profondità:'Stile: lanci in profondità per le punte veloci.',cross:'Stile: palle alte in area, ha i saltatori migliori.',contropiede:'Stile: contropiede.',equilibrato:'Stile: equilibrato.'}[style]);
  if(press===2) rs.push('Pressing alto sul portatore di palla.'); else if(press===0) rs.push('Pressing basso: aspetta l\'avversario nella sua metà campo.');
  /* difesa: altezza della linea, zona o uomo, trappola del fuorigioco */
  const dfs=best.x.xi.map((p,i)=>p?{p,r:best.x.slots[i].r}:null).filter(x=>x&&isDefR(x.r)).map(x=>x.p);
  const dAvg=k=>dfs.length?dfs.reduce((s,p)=>s+p.a[k],0)/dfs.length:10;
  const read=(dAvg('pos')+dAvg('dec'))/2, duel=(dAvg('con')+dAvg('agg')+dAvg('for'))/3;
  let lineH = (ft.defSpeed-of.attSpeed>0.8 || (press===2 && ft.defSpeed>=of.attSpeed-0.3)) ? 'alta' : (of.attSpeed-ft.defSpeed>0.8 || ment<0) ? 'bassa' : 'media'; if(sbaglia()) lineH=['alta','media','bassa'][Math.floor(R()*3)];
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
  /* v0.4.5.0 (R3b): voci del piano di squadra (t.plan): blocco senza palla, ampiezza, costruzione, transizioni */
  const blocco=press===0&&lineH==='alta'?'medio':{alta:'alto',media:'medio',bassa:'basso'}[lineH], amp=style==='cross'?'larga':style==='contropiede'?'stretta':'normale',
    costr=style==='possesso'?'corta':(style==='profondità'||style==='contropiede')?'lunga':'mista', tOff=(style==='contropiede'||ment<0)?'contropiede':'consolida', tDif=press===2?'contropress':'ripiego';
  return {form:best.f, xi:best.x, ment, style, press, reasons:rs, fwd, lineH, mark, trap, scheme, blocco, amp, costr, tOff, tDif, spec:{pen:spec.pen&&spec.pen.id, fk:spec.fk&&spec.fk.id, cor:spec.cor&&spec.cor.id}};
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
/* v0.4.4.0 (R3a): proteste dell'allenatore (match_arb.js, protest). p0+p1·Carattere = probabilità di protestare a peso 1; g0+g1·Carattere = protesta grave;
   decisione dell'arbitro: grave → allontanamento gOff (+gOffS per punto di severità sopra 10), ammonizione gYc; lieve → allontanamento lOff,
   ammonizione lYc (+lYcS); e0+e1·(Errori−10) = probabilità che la decisione sbagli di un gradino. Tarati con tools/r3a.js (parte 8) */
const PR_K={p0:0.10, p1:0.60, g0:0.10, g1:0.55, gOff:0.25, gOffS:0.03, gYc:0.55, lOff:0.01, lYc:0.55, lYcS:0.02, e0:0.02, e1:0.01};
function moraleBoost(mor,cmor){ return clamp((mor-12)/8,-1,1)*MOR_K + clamp(((cmor??12)-12)/8,-1,1)*CMOR_K; }
/* v0.4.5.0 (R3b): tabella delle mosse della panchina (mentalità da −2 a +2 per situazione), misurata con la partita: tools/r3b.js parte 7 */
const PAN_TAB={sotto_medio:1, sotto_tardi:2, sotto2:2, sopra1_tardi:-1, sopra2:-1, pari_tardi_forte:1, pari_tardi_debole:0};
/* v0.4.5.0 (R3b): skill tattiche e mentali lette dal codice dell'allenatore e loro medie di riferimento (giocatori dei mondi generati) */
const SK_TQ=['SM','CL','DE','CO','LE','DT','LG','MA','AN','IN'], SK_TQM={SM:50,CL:47,DE:45,CO:40,LE:48,DT:50,LG:48,MA:46,AN:46,IN:48};
const FIN=0.45, SKILL_K=0.33, HOME_B=1.5, DAY_F=0.7;   /* v0.4.2.7 (R2b): HOME_B 0,4 → 1,5. Il vantaggio di casa tocca solo le caratteristiche compresse a (decisioni); dalla 0.4.2.0 corpo, tiri, portiere e controllo usano a0 e la velocità vera, quindi serve un valore più alto per lo stesso effetto (vedi docs/PROGRESSI_R2b.md) */
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
  /* v0.4.2.2 (T1): contesto condiviso con i moduli match_fis.js, match_all.js, match_gio.js, match_arb.js (vedi MAPPA.md).
     Le fabbriche definiscono soltanto le funzioni (niente numeri casuali); lega() copia in M i valori della preparazione
     e collega le variabili dei moduli agli stessi oggetti. Le variabili riassegnate durante la partita sono campi di M. */
  const M={link:[], mFis:null, mAll:null, mGio:null, mArb:null, RB:null, tick:0, half:1, regEnd:0, restart:null, ht2:null, errLeft:0, bsN:0, RC:null, T:null, all:null, rx:null, ry:null, ball:null, ref:null, minNum:null, E:null, R:null, P:null, RA:null, RP:null, SO:null, SX:null, tm:null, op:null, fill2:null, recSub:null, RF:null, cardF:null, refErrs:null, errPlan:null, MIN_T:null};
  M.mFis=matchFis(M); M.mAll=matchAll(M); M.mGio=matchGio(M); M.mArb=matchArb(M);
  const {fatK, move, separate, buildDist, D2, giveBall, loose, lineCheck, ballTick, ownerBall}=M.mFis, {setForm, specOf, gkOf, endCel, runProb, assignMarks, targets, deconflict, startSub, stepSubs, htSubs, coachBon, coachThink}=M.mAll, {nearestOpp, handsOk, gkCatch, decide}=M.mGio, {canErr, startKick, pause, refError, moveRefs, foul, injure, keepDistance, restartBall, rsReady, execRestart}=M.mArb;
  const lega=o=>{ Object.assign(M,o); for(const f of M.link) f(); };
  /* v0.4.2.0: numeri casuali separati per sottosistema (RICERCA C2): R = giocatori (scelte ed esecuzione), RC = allenatori,
     RA = arbitro e tempi delle riprese, RP = fisica (rimbalzi, deviazioni, infortuni). Così una tappa che cambia un codice non rimescola gli altri */
  const R=makeRng(seed), P=a=>a[Math.floor(R()*a.length)], RC=makeRng(seed^0x51A3C0DE), RA=makeRng(seed^0x2F6E2B19), RP=makeRng(seed^0x7B3D9E57), RB=makeRng(seed^0x6C0A7B21), PA=a=>a[Math.floor(RA()*a.length)];
  /* sonde per le misure (v0.4.1.3, tools/misure.js): spente se globalThis.__SONDA non c'è. Leggono soltanto: mai R(), mai scritture, mai nei salvataggi */
  const SO=globalThis.__SONDA||null, SX=SO?{get T(){return T}, get ball(){return ball}, get ref(){return ref}, get restart(){return M.restart}, get tick(){return M.tick}, get half(){return M.half}, get all(){return all}, get ev(){return ev}, get htTick(){return htTick}, PL, PW, DT, TIME_F}:null;
  const T=[0,1].map(i=>{ const ti=inp.t[i]; return {win:0, qsub:[], coachOut:!!(ti.coach&&ti.coach.absent), pendOff:false, pendYc:false, cyc:0, offY2:false, idx:i, dir:i===0?1:-1, inp:ti, coach:ti.coach, players:ti.players, goals:0, subs:5, on:[], bench:[], form:null, slots:null, ment:0, style:'equilibrato', press:1, ch:{att:false,def:false,all:false}, lostT:-99, wonT:-99, counterUntil:-1, pressUntil:-1,
    st:{poss:0,sh:0,sot:0,xg:0,cor:0,fou:0,yc:0,rc:0,pa:0,pc:0,off:0}}; });
  const all=new Map(), ev=[], frames=rec?[]:null;
  const dayF=[0,1].map(()=>(R()+R()-1)*DAY_F);
  for(const t of T) for(const pi of t.players){ const mB=moraleBoost(pi.mor??12, t.coach&&t.coach.mor); all.set(pi.id,{...pi, a0:pi.a, a:Object.fromEntries(Object.entries(pi.a).map(([k,v])=>[k,10+(v-10)*SKILL_K+(t.idx===0?HOME_B:0)+dayF[t.idx]+mB])), t:t.idx, x:0,y:0,tx:0,ty:0, vx:0,vy:0, o:(i0=>i0===0?0:Math.PI)(t.idx), bk:0, k:-1, vmax:8.5+1.2*clamp((pi.a.vel-1)/19,0,1), amax:4.3+0.9*clamp((pi.a.vel-1)/19,0,1), hk:(hashU(String(pi.id),7)*1e6)|0, nx:0, ny:0, dv:null, tilt:0, hold:false, fq:null, ucap:1, hx:null, hy:0, hz:0, tp:0, eng:null, cx:undefined, cy:undefined, ft:false, drib:0, shield:0, bA:null, wall:null, runOff:0, used:false, walkIn:false, leave:0, lw:0, subOut:false, subbed:false, st:pi.st0, on:false, slot:-1, role:null, yc:0, out:false, inj:false, runT:0, dt:0, stun:0, urg:false, mins:0, fl:pi.fl*0.12,
    s:{g:0,as:0,kp:0,sh:0,sot:0,pa:0,pc:0,tk:0,int:0,drw:0,sv:0,err:0,red:0,prog:0,gv:0,av:0,ga:0,svv:0}}); }
  const plans=[0,1].map(i=>planMatch(T[i].inp,T[1-i].inp,RC));
  [0,1].forEach(i=>{ const f=inp.t[i].force; if(f){ Object.assign(plans[i],f); if(f.form) plans[i].xi=bestXI(T[i].inp.players,f.form); } });
  const rx=(t,x)=>t.dir>0?x:PL-x, ry=(t,y)=>t.dir>0?y:PW-y;
  const tm=p=>T[p.t], op=p=>T[1-p.t];
  lega({RC, RB, T, all, rx, ry, R, P, RA, RP, SO, SX, tm, op});
  for(const t of T){ const pl=plans[t.idx]; t.ment=pl.ment; t.style=pl.style; t.press=pl.press; t.fwd=pl.fwd||{}; t.lineH=pl.lineH||'media'; t.mark=pl.mark||'zona'; t.trap=!!pl.trap; t.dline=null; t.plan={form:pl.form, ment:pl.ment, press:pl.press===2?'alto':pl.press===0?'basso':'medio', blocco:pl.blocco||'medio', linea:t.lineH, trap:t.trap, amp:pl.amp||'normale', costr:pl.costr||'mista', tOff:pl.tOff||'consolida', tDif:pl.tDif||'ripiego', mark:t.mark}; t.planT=0; t.marks=new Map(); t.scheme=pl.scheme||'centro'; t.spec=pl.spec||{};
    { const xi=(pl.xi.xi||[]).filter(Boolean); t.tech=xi.length? xi.reduce((s,p)=>s+(p.a.pas+p.a.ctr+p.a.dec)/3,0)/xi.length : 10; }
    setForm(t, pl.form, pl.xi.xi.filter(Boolean).map(p=>all.get(p.id)));
    const onIds=new Set(t.on.map(p=>p.id)); t.bench=t.players.filter(p=>!onIds.has(p.id)).map(p=>all.get(p.id)).sort((a,b)=>b.ovr0-a.ovr0).slice(0,9);
  }
  T.forEach(t=>coachBon(t));   /* v0.4.4.0 (R3a): bonus dell'allenatore, dopo la scelta del modulo */
  T.forEach(t=>assignMarks(t));
  const str0=T.map(t=>t.on.reduce((s,p)=>s+(p.ovr0||10),0)/Math.max(1,t.on.length)); T.forEach((t,i)=>{ t.chg=[]; t.subIn=[]; t.str0=str0[i]; });
  const ball={x:52.5,y:34,z:0,vz:0,owner:null,fl:null,vx:0,vy:0,lastT:0,lastP:null,pass:null};
  /* terna arbitrale: caratteristiche (1-20, media 10) */
  const RF=Object.assign({esp:10,car:10,fis:10,err:10}, inp.ref||{});
  const cardF=0.7+RF.car*0.03, fisF=0.85+RF.fis*0.015, penF=0.55+RF.fis*0.045;
  const ref={x:45,y:40,v:0, a1:{x:35,y:-1}, a2:{x:70,y:PW+1}, cardK:0, cardT:-99, flag:0, flagT:-99};
  const errLam=clamp(0.35+(RF.err-10)*0.05-(RF.esp-10)*0.03,0.04,0.9);
  M.errLeft=(RA()<errLam?1:0)+(RA()<errLam*0.5?1:0); const refErrs=[];
  const errPlan=[0,1].map(()=>{ const u=RA(); return u<0.28?'rigNo':u<0.48?'rigSi':u<0.76?'offNo':'offSi'; });
  const coachOff=[false,false];
  const MIN_T=60/DT*TIME_F;
  M.tick=0; M.half=1; let halfEnd=1e9; M.regEnd=Math.round(45*MIN_T); let lost=[0,0], endT=0; M.restart=null; let htTick=0; M.ht2=null;
  /* secondo tempo: i minuti partono dal calcio d'inizio (ht2), non dal fischio dell'intervallo (i giocatori tornano camminando) */
  const s2=t=>M.ht2==null||t<M.ht2?0:(t-M.ht2)*DT/TIME_F;
  const minute=t=>{ const s=t*DT/TIME_F; if(M.half===1||t<htTick){ const m=Math.floor(s/60); return m>=45?`45+${m-44}'`:`${m+1}'`; } const m=45+Math.floor(s2(t)/60); return m>=90?`90+${m-89}'`:`${m+1}'`; };
  const minNum=t=>{ const s=t*DT/TIME_F; return M.half===1||t<htTick? Math.min(45,Math.floor(s/60)+1) : Math.min(90,45+Math.floor(s2(t)/60)+1); };
  const E=(type,side,ids,text,extra)=>{ ev.push({t:M.tick,min:minute(M.tick),type,side,d:T[side]?T[side].dir:1,p:ids,text,...(extra||{})}); };
  const fill2=(tpl,o)=>tpl.replace(/\{(\w)\}/g,(m,k)=>o[k]?o[k].ln:'?');
  E('kick',0,[],`Calcio d'inizio. ${T[0].inp.n} col ${T[0].form}, ${T[1].inp.n} col ${T[1].form}.`);
  /* sotto-campioni della palla per il visore (3 per tick) */
  const BS=new Float64Array(9); M.bsN=0;
  function recSub(q){ if(rec && (q===1||q===3||q===5) && M.bsN<3){ BS[M.bsN*3]=ball.x; BS[M.bsN*3+1]=ball.y; BS[M.bsN*3+2]=ball.z; M.bsN++; } }

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
    const sOk=M.bsN===3 && hyp(BS[6]-ball.x,BS[7]-ball.y)<8;
    for(let q=0;q<3;q++){ const w=(q+1)/4; if(sOk){ f[nb+3+q*3]=qc(BS[q*3]); f[nb+4+q*3]=qc(BS[q*3+1]); f[nb+5+q*3]=qc(BS[q*3+2]); } else { f[nb+3+q*3]=qc(pbx+(ball.x-pbx)*w); f[nb+4+q*3]=qc(pby+(ball.y-pby)*w); f[nb+5+q*3]=qc(pbz+(ball.z-pbz)*w); } }
    const nr=nb+12; f[nr]=qc(ref.x); f[nr+1]=qc(ref.y); f[nr+2]=qc(ref.a1.x); f[nr+3]=qc(ref.a1.y); f[nr+4]=qc(ref.a2.x); f[nr+5]=qc(ref.a2.y);
    const ca=M.tick-ref.cardT; f[nr+6]= ca<8 ? (ref.cardK===3 ? (ca<4?1:2) : ref.cardK) : 0; f[nr+7]= M.tick-ref.flagT<7 ? ref.flag : 0; f[nr+8]=capHolder(T[0]); f[nr+9]=capHolder(T[1]);
    for(const t of T){ const g=gkOf(t); f[nb+22+t.idx]=g&&g.tilt?Math.round(g.tilt*1000):0; }
    M.bsN=0; pbx=ball.x; pby=ball.y; pbz=ball.z; frames.push(f); owners.push(ball.owner?colIdx.get(ball.owner.id):-1); };
  const owners=[];
  lega({ball, ref, minNum, E, fill2, recSub, RF, cardF, refErrs, errPlan, MIN_T});
  startKick(0,true);
  while(true){
    for(const t of T) targets(t);
    if(M.restart){ const tk=M.restart.taker&&M.restart.taker.on?M.restart.taker:null;
      if(tk && M.restart.type==='kick'){ if(M.restart.bs==='ready'){ tk.tx=52.5-T[M.restart.team].dir*0.3; tk.ty=34; tk.urg=true; } }
      else if(tk){ if(M.restart.type==='pen'){ const A=T[M.restart.team]; tk.tx=M.restart.x-A.dir*1.2; tk.ty=M.restart.y; } else { tk.tx=M.restart.x; tk.ty=M.restart.y; } tk.urg=true; }
      if(M.restart.fp && M.restart.bs==='fetch' && M.restart.fp.on){ M.restart.fp.tx=ball.x; M.restart.fp.ty=ball.y; M.restart.fp.urg=true; }
      keepDistance(false);
      if(M.restart.subs) for(const z of M.restart.subs) if(z.ph===0 && z.outP.on){ z.outP.tx=52.5+(z.t.idx===0?-3.5:3.5); z.outP.ty=-0.8; z.outP.urg=false; }
      if(M.restart.card){ const cp=all.get(M.restart.card.pid); if(cp && (hyp(cp.x-ref.x,cp.y-ref.y)<9 || M.tick-ref.cardT<8) && (!M.restart.card.shown || M.tick-ref.cardT<8)){ cp.tx=cp.x; cp.ty=cp.y; cp.urg=false; } } }
    for(const t of T) deconflict(t);
    for(const t of T) for(const p of t.on){ move(p); p.mins+=DT/60/TIME_F; }
    separate();
    for(const t of T) for(const p of t.on){ p.x=clamp(p.nx,p.role==='GK'?-0.6:-5.5,p.role==='GK'?PL+0.6:PL+5.5); p.y=clamp(p.ny,-4.5,PW+4.5); if(p===ball.owner){ const m=p.hold?0.6:0.5; p.x=clamp(p.x,m,PL-m); p.y=clamp(p.y,0.5,PW-0.5); if(p.hold){ const t=T[p.t]; p.x=rx(t,Math.min(rx(t,p.x),15.6)); p.y=clamp(p.y,34-19.5,34+19.5); } } }
    buildDist();
    if(M.restart && M.restart.type!=='pen' && M.restart.type!=='cel' && M.restart.ticks>3) for(const t of T){
      while(t.qsub.length){ const z=t.qsub.shift(); if((z.noRemove||!z.outP||z.outP.on) && !z.inP.on && !z.inP.walkIn && t.subs>0) startSub(t,z.outP,z.inP,z.slot??z.outP.slot,z.why,z.noRemove); }
      if(t.pendYc){ t.pendYc=false; t.cyc++; const sur=t.coach.n.split(' ').slice(-1)[0]; E('coachyc',t.idx,[],t_('par.coachyc',{sur,rn:RF.n?' '+RF.n:''})); M.restart.coach={side:t.idx,shown:false,k:5}; M.restart.ticks=Math.max(M.restart.ticks,24); }
      else if(t.pendOff){ t.pendOff=false; t.coachOut=true; t.offT=M.tick; coachOff[t.idx]=true; coachBon(t); const sur=t.coach.n.split(' ').slice(-1)[0]; E('coachoff',t.idx,[],t_(t.offY2?'par.coachoff_y2':'par.coachoff',{sur,rn:RF.n?' '+RF.n:''})); M.restart.coach={side:t.idx,shown:false,k:4}; M.restart.ticks=Math.max(M.restart.ticks,30); } }
    stepSubs(false);
    if(M.restart && M.restart.subs && M.restart.subs.some(z=>z.ph<2) && M.restart.ticks<=3) M.restart.ticks++;
    if(M.restart && ((M.restart.card&&!M.restart.card.shown)||(M.restart.coach&&!M.restart.coach.shown)) && M.restart.ticks<=3 && (M.restart.hold=(M.restart.hold||0)+1)<40) M.restart.ticks++;
    if(M.restart){ if(M.restart.ticks>0) M.restart.ticks--;
      restartBall();
      if(M.restart.ticks<=0){ if(M.restart.type==='cel'){ if(M.restart.bs!=='roll'||hyp(ball.vx,ball.vy)<0.5) endCel(); } else if(rsReady(M.restart)) execRestart(); } }
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
      if(!lost && ball.owner===o && Math.abs(o.y-34)>27) op(o).pressUntil=Math.max(op(o).pressUntil,M.tick+3);
      if(!lost && ball.owner===o){ o.dt-=DT*TDEC; if(o.dt>0.6){ const [,pr]=nearestOpp(o); if(pr<1.5) o.dt=Math.min(o.dt,0.6); } if(o.cx!=null && !o.ft && hyp(o.cx-o.x,o.cy-o.y)<1) o.dt=Math.min(o.dt,0); if(o.dt<=0) decide(o); }
      if(!M.restart && ball.owner) lineCheck();
      if(!M.restart && !ball.owner) ballTick();
    } else ballTick();
    for(const t of T) for(const p of t.on){ if(RP()<0.65e-6/TIME_F*(1+(100-p.st)/40)) injure(p); }
    if(M.tick%Math.round(120*TIME_F)===60) for(const t of T) coachThink(t);
    for(const t of T) for(const p of t.on) if((isAtt(p.role)||((p.role==='CM'||p.role==='AM')&&rx(t,ball.owner?ball.owner.x:0)>62)) && p.runT<=0 && ball.owner && ball.owner.t===t.idx && ball.owner!==p && rx(t,ball.owner.x)>32 && R()<runProb(t,p)*RUN_K){ p.runT=3.5; p.runOff=-0.4-R()*1.2+(R()<0.3-(p.a.dec-10)*0.02?1.8:0); if(R()<p.fl*0.8) E('flash',t.idx,[p.id],fill2(P(MTX.flR),{p}),{flash:[p.id]}); }
    const pt=ball.owner?ball.owner.t:ball.fl?ball.fl.t:-1; if(pt>=0) possTicks[pt]++;
    if(ball.owner && ball.owner.t!==lastOwnT){ const w=T[ball.owner.t], l=T[1-ball.owner.t]; if(lastOwnT>=0){ w.wonT=M.tick; l.lostT=M.tick;
        const brw=rx(w,ball.x), behind=l.on.filter(q=>q.role!=='GK' && rx(w,q.x)>brw).length; if(brw<75 && behind<=6 && !M.restart){ w.counterUntil=M.tick+22; w.on.forEach(q=>{ if(isAtt(q.role)&&q!==ball.owner){ q.runT=3.5; q.runOff=-0.6-R()*1.0; } }); } }
      lastOwnT=ball.owner.t; }
    moveRefs();
    if(SO) SO.tick(SX);
    if(rec) pushFrame();
    M.tick++;
    /* recupero: dipende dal tempo perso (esultanze, cambi, infortuni, cartellini, allontanamenti) */
    if(M.restart && (M.restart.type==='cel'||M.restart.type==='drop'||(M.restart.subs&&M.restart.subs.some(z=>z.ph<2))||(M.restart.card&&!M.restart.card.shown)||(M.restart.coach&&!M.restart.coach.shown))) lost[M.half-1]++;
    if(M.tick===M.regEnd){ const lm=lost[M.half-1]/MIN_T, add=clamp(Math.round(lm*0.75+(M.half===1?0.9:2.2)+RA()*1.2),M.half===1?1:2,M.half===1?6:9); halfEnd=M.tick+Math.round(add*MIN_T); E('added',0,[],`Il quarto uomo alza il tabellone: ${add} minut${add===1?'o':'i'} di recupero.`,{add}); }
    if(M.half===1 && M.tick>=halfEnd){ stepSubs(true); E('ht',0,[],`Fine primo tempo: ${T[0].inp.n} ${T[0].goals}-${T[1].goals} ${T[1].inp.n}.`); M.half=2; htTick=M.tick;
      if(ball.owner) ball.owner.hold=false; ball.owner=null; ball.fl=null; M.restart=null;
      T.forEach(t=>{ t.dir=-t.dir; t.on.forEach(p=>{ p.st=Math.min(100,p.st+7); p.dv=null; p.tilt=0; p.stun=0; }); htSubs(t); t.counterUntil=-1; t.pressUntil=-1; t.dline=null; });
      startKick(1,false); halfEnd=1e9; M.regEnd=-1; E('kick',1,[],'Inizia il secondo tempo.'); }
    else if(M.half===2 && M.tick>=halfEnd){ break; }
    if(M.tick>30000) break;   /* sicurezza: una partita vera dura circa 11.700 tick */
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
  E('refvote',0,[],`Voto alla terna arbitrale ${RF.n?'di '+RF.n:''}: ${String(refOut.voto).replace('.',',')}.${refErrs.length?' Pesano '+(refErrs.length===1?'un errore':refErrs.length===2?'due errori':'tre errori')+' decisiv'+(refErrs.length===1?'o':'i')+'.':''}`.replace('  ',' '),{voto:refOut.voto});
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
    ref:refOut, coachOff, coachRt, stats:T.map(t=>t.st), plans:plans.map((p,i)=>({form:p.form, ment:p.ment, style:p.style, press:p.press, reasons:p.reasons})), nT:M.tick, htTick, ht2:M.ht2==null?htTick:M.ht2};
  if(rec){ out.frames=frames; out.cols=cols; out.owners=owners; }
  return out;
}

/* istantanea dei dati che servono alla partita (così si può rivedere identica) */
function matchInput(t){
  const avail=teamPlayers(t).filter(p=>!(p.inj>0)&&!(p.sq>0)), c=coachMigrate(t.coach), absent=(c.squal||0)>0, eq=coachEq(c);
  /* v0.4.4.0 (R3a): bonus dell'allenatore solo in partita. Skill 0–100 + (bonus − bonus medio della lega), tra 0 e 100, poi skA22:
     b = differenza sui 22 attributi (1–20; oggi solo pas, dec, pos), b7 = pos con la Familiarità ridotta (modulo diverso dal preferito).
     Le 57 salvate non cambiano; simMatch somma b e lo toglie se l'allenatore viene allontanato */
  const LM=coachLeagueBonus(), wOf=(p,fam)=>{ const v=skOf(p).v, b=coachBonus(t,{fam, ins:coIns(p), sq:absent}), w=Object.assign({},v);
    for(const s of CO_SK) w[s]=clamp(v[s]+b[s]-LM[s],0,100); return w; }, bonOf=(p,fam)=>skA22(wOf(p,fam),p.r);
  /* v0.4.5.0 (R3b): le 10 skill tattiche e mentali per il codice dell'allenatore (tq, 0–100 senza bonus), il bonus della squadra (tqb, rispetto alla
     media della lega) e quello con la Familiarità ridotta (tqb7, solo DT e LG) */
  const tqOf=p=>{ if(!p.s) return null; const v=skOf(p).v, w=wOf(p,1), w7=wOf(p,CO_PAR.famMod), tq={}, tqb={}, tqb7={}; let nb=0, n7=0;
    for(const k of SK_TQ){ tq[k]=Math.round(v[k]); const d=Math.round((w[k]-v[k])*10)/10; if(d){ tqb[k]=d; nb++; } if(k==='DT'||k==='LG'){ const d7=Math.round((w7[k]-v[k])*10)/10; if(d7!==d){ tqb7[k]=d7; n7++; } } }
    const o={tq}; if(nb) o.tqb=tqb; if(n7) o.tqb7=tqb7; return o; };
  const bOf=p=>{ if(!p.s) return null; const a0=skOf(p).a, a1=bonOf(p,1), o={}; let n=0;
    for(const k of ATTR){ const d=Math.round((a1[k]-a0[k])*100)/100; if(d){ o[k]=d; n++; } }
    if(p.r!=='P'){ const d7=Math.round((bonOf(p,CO_PAR.famMod).pos-a0.pos)*100)/100; if(d7!==(o.pos||0)){ o.pos7=d7; n++; } }
    return n?o:null; };
  return {id:t.id, n:t.n, c:t.c, coach:{n:c.n, tat:eq.tat, all:c.all, gio:c.gio, ges:eq.ges, mod:c.mod, car:eq.car, k:Object.assign({},eq.x), coll:Object.assign({},collOf(t)), rt:Math.round(coachRating(c)), mor:Math.round((c.mor??12)*10)/10, absent}, capOrder:[t.cap,t.vcap,...capOrder(t).filter(id=>id!==t.cap&&id!==t.vcap)].filter(id=>id!=null).slice(0,6),
    players:avail.map(p=>{ const q={id:p.id, ln:p.ln, r:p.r, age:p.age, a:p.s?skMatchA(p):Object.fromEntries(ATTR.map(k=>[k,Math.round(p.a[k]*10)/10])), st0:Math.round(100-(p.fat||0)), mor:Math.round(p.mor*10)/10, tem:p.tem, h:p.h||180, foot:p.foot||'D', fl:Math.round(flashP(p)*1000)/1000, ovr0:Math.round(ovr(p)*10)/10}; const b=bOf(p); if(b) q.b=b; const tq=tqOf(p); if(tq) Object.assign(q,tq); return q; })};
}
