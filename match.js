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
/* I1 (PROBLEMI_NOTI n. 77, Dani 15/11): fuori dai ruoli di NAT il valore non è più −5 per tutti. Come nel calcio vero, quando mancano giocatori
   di un ruolo si sceglie prima un giocatore di movimento, in ordine di vicinanza del reparto:
   - reparto vicino (difesa–centrocampo, centrocampo–attacco): −5, il valore di prima (sa già marcare o impostare, cambia solo la posizione);
   - reparto lontano (difesa–attacco): −7 (deve imparare compiti che non fa mai: chi attacca non sa tenere la linea né marcare, e viceversa);
   - portiere fuori dai pali, o giocatore di movimento in porta: −40 (non si allena nel ruolo dell'altro: il portiere non fa il gioco di
     movimento, il giocatore di movimento non sa parare): valore del ruolo (dalle sue caratteristiche, 1–20) − 40, sempre sotto ogni giocatore di
     movimento fuori ruolo, quindi succede solo se non c'è nessun altro; tra più candidati va chi ha le doti migliori per quel posto. */
const NAT_GQ={P:0,D:1,C:2,A:3};
function suit(p,role){ const pen=NAT[p.r][role]; if(pen==null){ const g=ROLE_GROUP[role]; if(p.r!=='P'&&g!=='P') return Math.abs(NAT_GQ[p.r]-NAT_GQ[g])>1?-7:-5; }
  const w=SUIT[role], A=p.a0||p.a; let s=0,t=0; for(const k in w){ s+=A[k]*w[k]; t+=w[k]; } return s/t-(pen==null?40:pen); }   /* in emergenza, tra i candidati conta chi ha le doti del ruolo */
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
function laneBlock(p,o,gx){ let b=1; for(const q of o.on){ if(q.role==='GK') continue; if(Math.abs(q.x-gx)<Math.abs(p.x-gx) && segDist(q.x,q.y,p.x,p.y,gx,34)<1.6) b*=0.68+R4C.lb*Math.max(0,Math.min(1,(80-q.st)/50));   /* R4 (F6): il difensore stanco chiude meno la linea di tiro */ } return b; }
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
/* R5 (0.4.7.0): corpo di arbitro e assistenti. vmax 7,5 m/s (27 km/h) e accelerazione con amax 4,3 (partenza vmax·amax/5 ≈ 6,5 m/s²,
   come i giocatori più lenti di fisCorpo): sono valori da professionista adulto, sotto i giocatori (gli arbitri d'élite hanno in media
   36–40 anni); frenata 5 m/s²; side = oltre questa velocità l'assistente smette di correre di lato e si gira; res = consumo di energia
   rispetto a un giocatore con Resistenza 14 (0,8). Bussola: 016 (Krustrup 2009) arbitro ~10,3 km, assistente ~6,8 km a partita. */
const REF_B={vmax:7.5, amax:4.3, dmax:5.0, side:4.0, res:0.8};
/* R5: adv = secondi per vedere se il vantaggio c'è: 3 s (decisione di Dani, 13/11); IFAB regola 5: «pochi secondi»; regola pratica degli arbitri 2–3 s
   (askasoccerreferee.com/?p=2715; guida USSF sul vantaggio). CA1 (0.4.7.3, n. 53): tolte le soglie reck 4 e exc 7 m/s dei cartellini (senza fonte:
   risposta 032, nessuna soglia di velocità né di forza in IFAB o negli studi); i cartellini vengono dalla condotta (CA1_K e condotta, sotto). */
const REF_K={adv:3.0};
/* CA1 (0.4.7.3, PROBLEMI_NOTI n. 53; decisioni di Dani, ex arbitro, 14/11): i provvedimenti giudicano la condotta del giocatore come la interpreta
   l'arbitro, una cosa diversa dal contatto (che resta a refCall: fischio, asticella, rigore). IFAB, Regola 12 2026/27 (theifab.com/laws/latest/
   fouls-and-misconduct; risposta 032): negligente = fallo senza cartellino; imprudente = giallo; vigoria sproporzionata o pericolo per l'avversario =
   rosso; chi «si lancia sull'avversario di fronte, di lato o da dietro» mettendolo in pericolo commette un grave fallo di gioco. Metodo (032): evento
   fisico, giudizio dell'arbitro e provvedimento separati; la velocità relativa è un dato fisico, non una soglia disciplinare. Criteri:
   - direzione (dirOf, match_arb.js): dove sta chi entra rispetto a dove va la vittima (o dove guarda, se va piano): di fronte entro 60° (cos ≥ fronte),
     da dietro oltre 120° (cos ≤ −fronte), di lato in mezzo. Tre settori come le tre direzioni della regola 12; Fuller, Smith, Junge e Dvorak 2004
     (AJSM 32(1 suppl.) 43S–53S): i contrasti di lato richiedono cure mediche circa il doppio delle volte;
   - scivolata: contrasto partito da oltre sciv = 1,5 m, la distanza da cui il motore fa già il gesto «scivolata» (GST_K, gesto 7) invece del contrasto;
   - a terra: l'urto supera la soglia di Equilibrio della vittima (eqOf, R4b), come la vede l'arbitro: urto − asticella (RF.am, REF_A) ≥ soglia
     (refTerra). È l'unico posto dove entra la velocità (Dani, punto 4): un arbitro severo (asticella bassa) vede in pericolo l'avversario con un urto
     più leggero, uno permissivo solo con un urto più forte (Dani, punto 2: severità dall'asticella, senza costanti nuove; nessun dato sulle differenze
     tra arbitri nella 032 né nella 016);
   - palla presa prima (refCat 'palla'/'pericoloso'): mai rosso; giallo «pericoloso» solo per una scivolata di lato o da dietro che manda a terra;
   - senza contendere la palla (spinta, trattenuta): giallo «pericoloso» solo se la vittima va a terra da dietro; niente condotta violenta (nel motore
     nessuno colpisce apposta); fallo in ritardo (lateHit, match_arb.js, Dani 14/11): decide la fisica, negligente se il contatto arriva prima che chi
     entra potesse fermarsi (reazione e frenata di R5C), imprudente (giallo) se poteva fermarsi;
   - salti (falli aerei, braccia): fallo senza cartellino per la condotta (Dani 14/11); restano occasione negata e falli ripetuti;
   - uomo prima, contrasto: vigoria sproporzionata (rosso) = scivolata da dietro con l'avversario a terra (decisione IFAB del 1998 sul contrasto
     da dietro che mette in pericolo l'avversario); imprudente (giallo) = scivolata di fronte o di lato, o in piedi da dietro, con l'avversario a terra;
     il resto è negligente (solo il fallo).
   Nessuna soglia per far tornare gialli o rossi (Dani, punto 5): le medie sono solo una bussola. */
const CA1_K={sciv:1.5, fronte:0.5};
/* l'arbitro vede l'avversario in pericolo (a terra): urto g − asticella am ≥ soglia di Equilibrio eq della vittima */
function refTerra(am, g, eq){ return g-am>=eq; }
/* condotta (funzione pura): x = {palla, senza, sciv, dir, terra} → 'vigoria' (rosso), 'imprudenza' o 'pericoloso' (giallo), null (negligente o pulito) */
function condotta(x){
  if(x.senza) return x.terra && x.dir==='dietro' ? 'pericoloso' : null;
  if(x.palla) return x.terra && x.sciv && x.dir!=='fronte' ? 'pericoloso' : null;
  if(!x.terra) return null;
  if(x.sciv && x.dir==='dietro') return 'vigoria';
  if(x.sciv || x.dir==='dietro') return 'imprudenza';
  return null; }
/* CA1 (Dani, punto 3): asticella che i giocatori conoscono dall'esperienza = quella dell'arbitro medio (asticella 10,5): chi stima l'arbitro più severo
   (dai cartellini per condotta visti in partita, mai dal valore nascosto) entra meno duro. Nessuna costante nuova: refAm(10,5) */
const CA1_AM0=()=>refAm(10.5);
/* R5b (0.4.7.1, PROBLEMI_NOTI n. 61): asticella dei falli (indicazione di Dani, arbitro per molti anni). Ogni arbitro ha la sua (RF.ast, 1–20, engine.js
   refAst), uguale per tutta la partita: non dipende da punteggio, minuto, cartellini già dati. am = asticella in m/s di gravità percepita (la velocità di
   arrivo sul contatto vc, la stessa dei cartellini): da a0 (ast 1, fischia anche i contatti lievi) ad a1 (ast 20, lascia giocare di più).
   In area (refCall): rigore solo se gravità e occasione tolta valgono il vantaggio del rigore: V·(g − am)/(gR − am) + O ≥ V, dove V = vR = probabilità
   di segnare un rigore (Serie A 2024-25: 76,2%, 80 su 105, FBref, docs/ricerche/014-gesti-tecnici/catalogo.md), O = occasione tolta (occTolta,
   probabilità di gol che l'attaccante aveva) e gR = gravità che da sola vale il rigore anche senza occasione. Un fallo che toglie un'occasione grande
   quanto un rigore (O = V) si fischia in area con la stessa asticella di fuori; senza occasione serve la gravità gR.
   PROPOSTA DA APPROVARE con Dani (tarature condivise): a0, a1, gR. */
const REF_A={a0:0.0, a1:1.5, gR:4.0, vR:0.762};
/* R5b (Dani, 13/11): vantaggio. L'arbitro lo dà se la squadra che ha subito il fallo arriva prima sulla palla con un margine (m) di almeno
   m0 + m1·(falli già fischiati nella partita): con pochi falli lascia giocare di più, in una partita fallosa ne dà meno per tenere il controllo.
   Bussola di Dani (ex arbitro): 5–8 vantaggi in una partita normale (~25 falli). PROPOSTA DA APPROVARE con Dani: m0, m1 */
const REF_V={m0:1.0, m1:0.1};
/* R5b (Dani, 13/11): errori dell'arbitro separati per tipo (match_arb.js, refErrMiss e refErrFalse). Hossner et al. 2019 (Mondiali 2014, 1527 episodi
   da fallo, risposta 032): errori 6,9%, 52 fischi sbagliati e 54 falli non visti, cioè 3,4% e 3,5% degli episodi; odds ratio 5,51 per il fallo non visto
   a 0–5 m, 2,58 per il fischio sbagliato a 10–15 m. qM, qF = probabilità per episodio della sua classe alle altre distanze, ricavate da quei conteggi
   sugli episodi della partita (falli veri e contrasti puliti con l'attaccante a terra, misura di R5b: 6,65 e 13,25 a partita; quasi tutti a 15–25 m):
   0,69 fischi sbagliati su 13,25 episodi puliti (qF 4,2%), 0,72 non visti su 6,65 falli veri (qM 10,2%). Il fischio sbagliato su un contrasto pulito è così
   meno della metà più probabile del fallo non visto. Nessun bersaglio sui falli */
const REF_E={qM:0.102, qF:0.042, orM:5.51, orF:2.58};
/* R5c (0.4.7.2, PROBLEMI_NOTI n. 54, 55, 63; indicazioni di Dani, ex arbitro, 13/11): falli che nascono da contatti tra corpi senza palla o lontano dal
   contrasto sul portatore. Nessuna probabilità fissa: il contatto c'è se i corpi si toccano con una velocità o una spinta, l'arbitro lo giudica con le
   regole di R5b (asticella, rigore, palla o uomo, cartellini, vantaggio). Valori fisici (stime nostre, da confermare con una fonte, PROPOSTA per Dani):
   - reach: distanza tra i centri dei corpi entro cui un giocatore afferra o spinge l'altro (spalle ~0,5 m + braccio ~0,7 m) = 1,2 m;
   - touch: distanza a cui due corpi si toccano (busto contro busto, ~0,25 m di raggio ciascuno, con le braccia) = 0,6 m; nel salto i due che vanno sulla
     stessa palla (entro 1,5 m, come il motore decide chi la contende) si incontrano sul punto;
   - push0..push1: velocità che una spinta o una trattenuta con le braccia toglie o dà alla vittima (impulso ~300–750 N per ~0,2 s su ~75 kg) da Forza 1
     a 20; chi la usa la dosa: 60–100% con l'Aggressività, metà se è già ammonito, il difendente nella sua area × (1 − Decisioni/40);
   - tr, ab: reazione (0,25 s, come GK_TR) e frenata umana (5 m/s², come REF_B.dmax) di chi arriva su un giocatore che ha appena passato (fallo in ritardo);
   - fkD, fkV: valore di una punizione per chi la batte (stima: ~6% entro 28 m dalla porta, tiro diretto; ~2% più lontano);
   - red: gol che costa giocare in 10 per 90 minuti (stima d'ordine di grandezza, da verificare: Ridder, Cramer e Hopstaken 1994, effetto del rosso);
     un giallo costa y2·red per il tempo che resta (rischio del secondo giallo). */
const R5C={reach:1.2, touch:0.6, push0:0.8, push1:2.0, tr:0.25, ab:5.0, fkD:0.06, fkV:0.02, red:1.0, y2:0.1};
/* I1 (0.4.7.6): infortuni a esposizione (decisioni di Dani del 15/11, D1–D12; fonti in docs/PROGRESSI_I1.md e docs/ricerche/010-infortuni/).
   - rM, rT: infortuni con assenza ogni 1000 ore di partita e di allenamento (UEFA ECIS 2001–19, Bengtsson et al. BJSM 2021: 23,8 e 3,4);
   - ncM, ncT: quota senza contatto in partita e in allenamento (UEFA ECIS 2016/17, tab. 5: 58,8% e 84,4%; il resto è contatto);
   - E0 (J): energia dell'urto non assorbita dall'Equilibrio per cui la probabilità d'infortunio è 1 − 1/e. Fissata una volta sola (Dani, D4) come una
     costante fisica: è il valore per cui gli urti di 300 partite di riferimento (mondo 2024, sonda __I1CAL, tools/i1.js --tara) danno il tasso
     dei contatti dei professionisti UEFA, 0,39 × 23,8 = 9,3 ogni 1000 ore. Non si ritocca per far tornare i numeri;
   - nc0: consumo medio di energia per tick × (1 + beta·stanchezza) nelle stesse partite: il rischio senza contatto di un istante è 0,588 × 23,8 ogni
     1000 ore volte il consumo di quell'istante (scatti) diviso nc0;
   - beta: peso della stanchezza (fatK) fissato perché metà degli infortuni muscolari di partita cada negli ultimi 15' di ciascun tempo (UEFA ECIS,
     Ekstrand et al. BJSM 2023, hamstring 2001–22: «quasi il 50%»);
   - aer: quota dei contatti aerei sul totale atteso degli infortuni da contatto, nelle stesse partite: la commozione nasce solo nei contatti aerei
     e vale 0,06 su 2,05 infortuni da contatto ogni 1000 ore (Pulici et al. 2023), cioè 2,9% dei contatti → 0,029/aer di quelli aerei.
   - T: tipi. [meccanismo ('nc' senza contatto, 'ct' contatto), peso (infortuni ogni 1000 ore, Pulici et al., Clin J Sport Med 2023, tab. 3–4; la
     parte di contatto dei legamenti è quella che fa tornare il 28% di contatto sul totale), sede (gruppi di Hägglund 2006 per le ricadute; null =
     nessuna ricaduta legata alla sede), mediana e media dei giorni (mediane: Ekstrand et al. BJSM 2020; medie: Pulici 2023; NT = mediana non trovata,
     stimata: vedi la nota), giorni minimi]. Durata lognormale: sigma = √(2·ln(media/mediana)). */
/* taratura del 15/11 (tools/i1.js --tara, 336 partite, 12.381 ore-giocatore, 56.590 urti con dose): E0 18.040 J (dosi: mediana 16 J, 99° percentile 238,
   massimo 821: la probabilità cresce quasi in proporzione alla dose); beta 8,0 (senza stanchezza gli ultimi 15' dei tempi hanno il 40,5% del consumo);
   nc0 0,008431; aer 0,0254 (la quota di commozione resta al massimo 90% dei contatti aerei: 0,21 invece di 0,27 ogni 1000 ore) */
const I1={rM:23.8, rT:3.4, ncM:0.588, ncT:0.844, E0:18040, nc0:0.008431, beta:8.0, aer:0.0254,
  T:{cpost:['nc',1.06,'cpost',13,14.0,1], add:['nc',0.67,'ing',12.5,13.5,1], cant:['nc',0.43,'cant',13,14.6,1], polp:['nc',0.32,'polp',13,13.1,1],
     musc:['nc',0.68,'musc',1.6,2.0,1], tend:['nc',0.63,'tend',13.4,18.8,1], cav:['nc',0.42,'cav',8,11.8,1], mcl:['nc',0.16,'gin',16,23.0,1],
     lca:['nc',0.04,'gin',205,211.3,1], leg:['nc',0.67,'leg',10,17.7,1], men:['nc',0.13,'gin',28,31.3,1],
     cont:['ct',1.45,null,4,5.2,1], fratt:['ct',0.15,null,40,58.6,1], cavc:['ct',0.20,'cav',8,11.8,1], mclc:['ct',0.15,'gin',16,23.0,1],
     lcac:['ct',0.02,'gin',205,211.3,1], legc:['ct',0.02,'leg',10,17.7,1], comm:['ct',0.06,null,9,10.5,7]}};
/* tipo d'infortunio dato il meccanismo: pesi × moltiplicatore di ricaduta della sede (rs, dal motore); la commozione solo nei contatti aerei.
   u: numero casuale in [0,1). Funzione pura (la usano la partita con RP e engine.js con i numeri da hash) */
function i1Pick(mech, rs, aerial, u){
  let tot=0; const w=[];
  for(const k in I1.T){ const d=I1.T[k]; if(d[0]!==mech) continue; let x=d[1];
    /* commozione: quota q = 0,029/aer dei contatti aerei; peso = (somma degli altri pesi di contatto, 1,99) · q/(1 − q) */
    if(k==='comm'){ if(!aerial) continue; const q=Math.min(0.9,0.029/I1.aer); x=1.99*q/(1-q); }
    else if(rs && d[2] && rs[d[2]]) x*=rs[d[2]];
    w.push([k,x]); tot+=x; }
  let r=u*tot; for(const [k,x] of w){ r-=x; if(r<0) return k; } return w[w.length-1][0]; }
/* moltiplicatore medio del rischio senza contatto (somma dei pesi × ricaduta della sede / somma dei pesi) */
function i1RsF(rs){ if(!rs) return 1; let a=0, b=0; for(const k in I1.T){ const d=I1.T[k]; if(d[0]!=='nc') continue; a+=d[1]*(d[2]&&rs[d[2]]?rs[d[2]]:1); b+=d[1]; } return a/b; }
/* giorni di assenza: lognormale con mediana e media dello studio (u1, u2 in [0,1)) */
function i1Dur(k, u1, u2){ const d=I1.T[k], s=Math.sqrt(2*Math.log(d[4]/d[3])), z=Math.sqrt(-2*Math.log(Math.max(1e-12,u1)))*Math.cos(2*Math.PI*u2);
  return Math.max(d[5], Math.round(d[3]*Math.exp(s*z))); }
function advOk(marg, nFoul){ return marg!=null && marg>=REF_V.m0+REF_V.m1*Math.max(0,nFoul); }
/* asticella in m/s dall'asticella 1–20 dell'arbitro */
function refAm(ast){ return REF_A.a0+(clamp(ast??10.5,1,20)-1)/19*(REF_A.a1-REF_A.a0); }
/* decisione dell'arbitro su un contatto che giudica fallo: 'gioco' (sotto la sua asticella, o in area non vale il rigore), 'fallo', 'rigore'.
   Funzione pura: dipende solo dall'asticella, dalla gravità g (m/s), dall'occasione tolta O (0–1) e dal luogo */
/* R5b (Dani, 13/11): «palla o uomo». cat = tipo di contatto (refCat, match_arb.js): 'palla' = il difendente prende prima la palla (non è fallo);
   'pericoloso' = prende prima la palla ma con un intervento imprudente o violento (gioco pericoloso: fallo e cartellino per qualunque arbitro);
   'cade' = prende prima l'uomo e l'attaccante cade o perde la palla per il contatto (urto oltre la sua soglia di Equilibrio, R4b): fallo per qualunque
   arbitro, qualunque sia la velocità di arrivo; 'leggero' = prende prima l'uomo con un contatto senza effetto: decide l'asticella.
   cw = motivo del cartellino che l'intervento merita (cardFor): un intervento da cartellino per la condotta (imprudenza, vigoria) si fischia sempre e in
   area è sempre rigore; per 'cade' anche gli altri motivi (occasione negata, azione promettente). 'nessuno' = non è fallo (contrasto pulito) */
function refCall(am, g, O, inBox, cat, cw){
  cat=cat||'leggero';
  if(cat==='palla') return 'nessuno';
  if(cat==='pericoloso' || cw==='imprudenza' || cw==='vigoria' || (cat==='cade' && cw && cw!=='ripetuti')) return inBox?'rigore':'fallo';
  if(cat==='cade'){ if(!inBox) return 'fallo'; g=Math.max(g,am); }   /* in area: la regola del rigore, con la gravità almeno all'asticella */
  if(g<am) return 'gioco';
  if(!inBox) return 'fallo';
  const gr=Math.max(REF_A.gR, am+0.1);
  return REF_A.vR*(g-am)/(gr-am)+O>=REF_A.vR ? 'rigore' : 'gioco'; }
/* R5b: occasione tolta dal fallo = probabilità di gol che l'attaccante aveva in quel momento, dalla situazione fisica che la partita conosce già
   (regola 12, «chiara occasione da gol»: distanza dalla porta, direzione del gioco, controllo della palla, difendenti):
   - posizione: xgAt (stessa stima di decide per il tiro);
   - direzione: per tirare deve girarsi verso la porta con la rotazione del corpo di fisCorpo (7,5 − 0,55·v rad/s): spalle alla porta ~0,5 s;
   - difendenti: in quel tempo il più vicino (dopo 0,25 s di reazione, GK_TR) accorcia alla sua velocità massima; la pressione al tiro riduce come in
     decide (0,6 sotto 1,2 m, 0,82 sotto 2,5 m) e chi sta sulla linea di tiro la chiude come in laneBlock (0,68, meno se è stanco);
   - controllo: ctl (1 se ha la palla al piede).
   x, y, vx, vy, o = attaccante; gx = linea della porta che attacca; defs = difendenti di movimento tranne chi ha commesso il fallo ({x, y, vmax, st}) */
function occTolta(x, y, vx, vy, o, gx, defs, ctl){
  if(!ctl) return 0;
  const dx=Math.abs(gx-x), dy=y-34, v=hyp(vx||0,vy||0), phi=Math.abs(fisAng(Math.atan2(34-y,gx-x)-o)), tS=phi/Math.max(1,7.5-0.55*v);
  let pr=99, b=1;
  for(const q of defs){ pr=Math.min(pr, Math.max(0, hyp(q.x-x,q.y-y)-(q.vmax||8.5)*Math.max(0,tS-GK_TR)));
    if(Math.abs(q.x-gx)<dx && segDist(q.x,q.y,x,y,gx,34)<1.6) b*=0.68+R4C.lb*clamp((80-(q.st??100))/50,0,1); }
  return xgAt(dx,dy)*(pr<1.2?0.6:pr<2.5?0.82:1)*b*ctl; }
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
/* C1a (n. 81, Dani 15/11): FIN è solo una statistica: moltiplica lo xG mostrato nelle statistiche e nelle pagelle (shoot, match_gio.js), non decide l'esito del tiro */
const FIN=0.45, SKILL_K=0.45, HOME_B=1.8, DAY_F=0.7;   /* v0.4.2.7 (R2b): HOME_B 0,4 → 1,5. Il vantaggio di casa tocca solo le caratteristiche compresse a (decisioni); dalla 0.4.2.0 corpo, tiri, portiere e controllo usano a0 e la velocità vera, quindi serve un valore più alto per lo stesso effetto (vedi docs/PROGRESSI_R2b.md) */
/* v0.4.2.0: tarature della fisica dei tiri e del ritmo (vedi STATO.md, «Fisica della palla e dei corpi») */
/* v0.4.2.0: con l'orologio vero i tempi delle decisioni (scritti in secondi della vecchia simulazione) scorrono a TDEC per secondo
   e le pause delle riprese (in tick) durano RS_K volte di più: così ritmo delle giocate e tempo effettivo restano quelli di prima */
const TDEC=0.715, RS_K=1.75;
const SHOT_S0=0.05, GK_VD=5.8,   /* C1a (n. 81, Dani 15/11): tolta SHOT_ERR (3,9), non più usata da R4b (0.4.6.2) */
      CONTEST_K=1, RUN_K=0.6;
/* R4b (0.4.6.2): portiere sul tiro con i valori reali: reazione GK_TR s, picco di velocità del baricentro GK_VP0..GK_VP0+GK_VPK m/s raggiunto in GK_TA s */
const GK_TR=0.25, GK_VP0=3.5, GK_VPK=0.7, GK_TA=0.35;
/* v0.4.6.0 (R4): duelli. k = frequenza dei contrasti quando il portatore non dribbla, dr = durante un dribbling (il duello del dribbling);
   f, fd = fattore dei falli per contrasto (meno contrasti, stessi falli a partita: decisione di Dani del 10/11) */
const R4C={k:0.4, dg:3, dr:1.5, dw:2.6, f:1, fd:0.3, luc:0.9, lb:0.14};   /* R5 (decisione di Dani, 13/11): tolto il ×3 dei falli per contrasto (f 3 → 1, fd 0,9 → 0,3: stesso rapporto tra contrasto e dribbling) */
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
/* v0.4.6.0 (R4): caratteristiche dei gesti per il codice del giocatore, dalle 57 (S1). In matchInput un carattere per skill (GS_A, 64 livelli
   sulla scala 1–20) per non appesantire le partite salvate. Le skill che hanno un «genitore» tra i 22 attributi sono centrate su di esso
   (stessa taratura per ruolo di skA22): k = a[genitore] + (T20(skill) − T20(composto del genitore))·dispersione; le altre sono T20 grezze.
   gsOf decodifica (o, per le partite salvate prima della 0.4.6.0, ricava i valori dai 22 attributi). */
/* v0.4.6.0 (R4): tipi dell'elenco dei gesti (out.gesti con rec acceso): decodifica g → tick = g>>10, colonna = (g>>4)&63, tipo = GST_K[g&15] */
const GST_K=['passaggio','cross','tiro','testa','stop','dribbling','contrasto','scivolata','parata','presa','rinvio','rimessa','lancio','spazzata','protezione','piazzato'];
const GS_K=['PC','PL','PO','PU','CA','RI','AC','MA','IN','OF','DF','AN','PD','AG','EQ','CG','CL','CO'];
const GS_A='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
const GS_P={PC:['pas',s=>0.7*s.PC+0.3*s.PL], PL:['pas',s=>0.7*s.PC+0.3*s.PL], PO:['lun',s=>(s.TI+s.PO)/2], PU:['cpz',s=>(s.PU+s.CA+s.RI)/3], CA:['cpz',s=>(s.PU+s.CA+s.RI)/3], RI:['cpz',s=>(s.PU+s.CA+s.RI)/3],
  AC:['vel',s=>0.7*s.VE+0.3*s.AC], MA:['con',s=>s.CN], IN:['con',s=>s.CN], OF:['pos',(s,r)=>r==='A'?s.OF:r==='D'?s.DF:(s.OF+s.DF)/2], DF:['pos',(s,r)=>r==='A'?s.OF:r==='D'?s.DF:(s.OF+s.DF)/2]};
function gsEnc(p){ const c=skOf(p), v=c.v, a=c.a, r=p.r, D=SK_DISP[r]||{}; let o='';
  for(const k of GS_K){ const g=r==='P'&&(k==='OF'||k==='DF')?null:GS_P[k]; let x;
    if(g){ const d=D[g[0]]?D[g[0]][1]:1; x=a[g[0]]+(SK_T20(v[k])-SK_T20(g[1](v,r)))*d; } else x=SK_T20(v[k]);
    o+=GS_A[Math.round((clamp(x,1,20)-1)/19*63)]; }
  return o; }
/* F9 (revisione di Dani): GS_W = quanto la skill dei gesti si scosta dal suo riferimento tra i 22 (la qualità della rosa, misurata con ovr sui 22, deve contare almeno quanto prima) */
const GS_W=0.5;
function gsOf(pi){ const o={}, a=pi.a;
  const F={PC:a.pas,PL:a.pas,PO:a.lun,PU:a.cpz,CA:a.cpz,RI:a.cpz,AC:a.vel,MA:a.con,IN:a.con,OF:a.pos,DF:a.pos,AN:a.pos,PD:pi.foot==='A'?15:6.5,AG:a.vel,EQ:a.for,CG:a.res,CL:a.fre,CO:a.dec};
  if(typeof pi.g==='string' && pi.g.length===GS_K.length){ GS_K.forEach((k,i)=>{ const v=1+GS_A.indexOf(pi.g[i])*19/63; o[k]=k==='PD'?v:F[k]+(v-F[k])*GS_W; }); return o; }
  for(const k of GS_K) o[k]=F[k]; return o; }
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
  /* R4b (0.4.6.2, passo 1 della sessione del 12/11): accelerazione da sprint umana: la velocità sale verso la massima come 1 − e^(−t/τ) con
     τ = 5,0/amax s (≈1,06 s per amax 4,73, 0,96–1,16 s tra i più lenti e i più veloci): accelerazione iniziale a0 = vmax/τ ≈ 7–10 m/s², dentro i
     valori della risposta 031 (7–9) e senza i 16 m/s² del passo 3 (τ = 2,65/amax, che non è umano). Sprint da fermo: 0–5 / 0–10 / 0–20 m in
     ~1,3 / 2,0 / 3,2 s dal movimento, cioè 1,05 / 1,75 / 2,95 s con il cronometraggio dei cancelli fotoelettrici (che scatta ~0,25 s dopo la
     partenza: Northeast et al., Premier League 1,02 / 1,72 / 2,94 s); per cambiare direzione ad alta velocità resta almeno 0,45·amax; frenata dmax */
  const lim= s>=v0 ? Math.max((vmax-v0)*(1-Math.exp(-h*amax/5.0)), 0.45*amax*h) : dmax*h; if(e>lim){ ex*=lim/e; ey*=lim/e; }
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
  rcV:['Rosso diretto per {p}: intervento con vigoria sproporzionata su {v}.'],
  ycT:['Giallo per {p}: ferma {v} e un\'azione promettente.','Fallo tattico di {p} su {v}: ammonito.'],
  ycR:['Giallo per {p}: troppi falli, l\'ultimo su {v}.'],
  adv:['Fallo di {p} su {v}, l\'arbitro lascia correre: vantaggio.'],
  advB:['Il vantaggio non c\'è: l\'arbitro torna al fallo di {p} su {v}.'],
  pen:['Rigore! {p} atterra {v} in area.'],
  inj:['{p} resta a terra: deve uscire per un infortunio.','Problema fisico per {p}, si accascia a terra.'],
  injC:['{p} ha preso un colpo alla testa: sospetta commozione, il medico lo fa uscire.'],
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
  const M={link:[], mFis:null, mAll:null, mGio:null, mArb:null, RB:null, tick:0, half:1, regEnd:0, restart:null, ht2:null, errLeft:0, adv:null, pendCard:[], arm:null, bsN:0, RC:null, T:null, all:null, rx:null, ry:null, ball:null, ref:null, minNum:null, E:null, R:null, P:null, RA:null, RP:null, SO:null, SX:null, tm:null, op:null, fill2:null, recSub:null, RF:null, cardF:null, refErrs:null, errPlan:null, MIN_T:null, gst:null, injQ:[], cal:null};
  M.mFis=matchFis(M); M.mAll=matchAll(M); M.mGio=matchGio(M); M.mArb=matchArb(M);
  const {fatK, move, separate, buildDist, D2, giveBall, loose, lineCheck, ballTick, ownerBall, behindOf, urto}=M.mFis, {setForm, specOf, gkOf, endCel, runProb, assignMarks, targets, deconflict, startSub, stepSubs, htSubs, coachBon, coachThink}=M.mAll, {nearestOpp, handsOk, gkCatch, decide}=M.mGio, {startKick, pause, refError, moveRefs, foul, unseenFoul, refSees, refCat, refFalls, advTick, flushCards, injure, ctInj, keepDistance, restartBall, rsReady, execRestart, tacticalFoul, lateHit, contactFoul, tackleCard}=M.mArb;
  const lega=o=>{ Object.assign(M,o); for(const f of M.link) f(); };
  /* v0.4.2.0: numeri casuali separati per sottosistema (RICERCA C2): R = giocatori (scelte ed esecuzione), RC = allenatori,
     RA = arbitro e tempi delle riprese, RP = fisica (rimbalzi, deviazioni, infortuni). Così una tappa che cambia un codice non rimescola gli altri */
  const R=makeRng(seed), P=a=>a[Math.floor(R()*a.length)], RC=makeRng(seed^0x51A3C0DE), RA=makeRng(seed^0x2F6E2B19), RP=makeRng(seed^0x7B3D9E57), RB=makeRng(seed^0x6C0A7B21), PA=a=>a[Math.floor(RA()*a.length)];
  /* sonde per le misure (v0.4.1.3, tools/misure.js): spente se globalThis.__SONDA non c'è. Leggono soltanto: mai R(), mai scritture, mai nei salvataggi */
  const SO=globalThis.__SONDA||null, SX=SO?{get T(){return T}, get ball(){return ball}, get ref(){return ref}, get restart(){return M.restart}, get tick(){return M.tick}, get half(){return M.half}, get am(){return RF.am}, get all(){return all}, get ev(){return ev}, get htTick(){return htTick}, PL, PW, DT, TIME_F}:null;
  const T=[0,1].map(i=>{ const ti=inp.t[i]; return {win:0, qsub:[], coachOut:!!(ti.coach&&ti.coach.absent), pendOff:false, pendYc:false, cyc:0, offY2:false, idx:i, dir:i===0?1:-1, inp:ti, coach:ti.coach, players:ti.players, goals:0, subs:5, on:[], bench:[], form:null, slots:null, ment:0, style:'equilibrato', press:1, ch:{att:false,def:false,all:false}, lostT:-99, wonT:-99, counterUntil:-1, pressUntil:-1,
    st:{poss:0,sh:0,sot:0,xg:0,cor:0,fou:0,yc:0,rc:0,pa:0,pc:0,off:0}}; });
  const all=new Map(), ev=[], frames=rec?[]:null;
  const dayF=[0,1].map(()=>(R()+R()-1)*DAY_F);
  for(const t of T) for(const pi of t.players){ const mB=moraleBoost(pi.mor??12, t.coach&&t.coach.mor); all.set(pi.id,{...pi, a0:pi.a, a:Object.fromEntries(Object.entries(pi.a).map(([k,v])=>[k,10+(v-10)*SKILL_K+(t.idx===0?HOME_B:0)+dayF[t.idx]+mB])), t:t.idx, x:0,y:0,tx:0,ty:0, vx:0,vy:0, o:(i0=>i0===0?0:Math.PI)(t.idx), bk:0, k:-1, vmax:8.5+1.2*clamp((pi.a.vel-1)/19,0,1), amax:4.3+0.9*clamp((pi.a.vel-1)/19,0,1), hk:(hashU(String(pi.id),7)*1e6)|0, nx:0, ny:0, dv:null, tilt:0, hold:false, fq:null, ucap:1, hx:null, hy:0, hz:0, tp:0, eng:null, cx:undefined, cy:undefined, ft:false, pf:false, drib:0, shield:0, bA:null, wall:null, runOff:0, used:false, walkIn:false, leave:0, lw:0, subOut:false, subbed:false, gs:gsOf(pi), st:pi.st0, on:false, slot:-1, role:null, yc:0, out:false, inj:false, runT:0, dt:0, stun:0, urg:false, mins:0, fl:pi.fl*0.12,
    s:{g:0,as:0,kp:0,sh:0,sot:0,pa:0,pc:0,tk:0,int:0,drw:0,sv:0,err:0,red:0,prog:0,gv:0,av:0,ga:0,svv:0},
    /* T2 (PROBLEMI_NOTI n. 49): campi che il ciclo aggiunge più tardi (R4b, R5b, R5c, CA1), creati qui vuoti (undefined, come prima della prima scrittura)
       e nello stesso ordine per tutti: i giocatori hanno una sola forma interna e il motore JavaScript li legge in fretta; nessun valore cambia */
    vNeed:undefined, sup:undefined, tfC:undefined, hitV:undefined, hitT:undefined, ctT:undefined, dq:undefined, gkKick:undefined, nf:undefined, pi:undefined, amE:undefined,
    /* I1: consumo di energia dell'ultimo tick (energy), rischio senza contatto dalle ricadute (i1RsF), infortunio della partita */
    dE:0, rsF:i1RsF(pi.rs), ijk:undefined, mk:undefined}); }   /* C1a: mk = attaccante marcato in area (markRunners) */
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
  const ball={x:52.5,y:34,z:0,vz:0,owner:null,fl:null,vx:0,vy:0,lastT:0,lastP:null,pass:null,nd:null,kt:null};   /* R5: nd = palla calciata da una ripresa da cui non si può segnare direttamente (rimessa laterale), finché nessuno la tocca; R5b: kt = chi ha battuto l'ultima ripresa (non la tocca di nuovo prima di un altro giocatore) */
  /* terna arbitrale: caratteristiche (1-20, media 10) */
  const RF=Object.assign({esp:10,car:10,fis:10,err:10,ast:10.5}, inp.ref||{}); RF.am=refAm(RF.ast);   /* R5b: asticella in m/s, fissa per tutta la partita */
  const cardF=(0.7+RF.car*0.03)*1.02, fisF=0.85+RF.fis*0.015;   /* R5: tolto penF (moltiplicava solo i falli in area) */
  /* R5 (0.4.7.0): arbitro e assistenti sono corpi (velocità vx, vy, sguardo o, energia st, corsa all'indietro bk): si muovono con fisCorpo e REF_B */
  const ref={x:45,y:40,v:0,vx:0,vy:0,o:0,st:100,bk:0,nx:45,ny:40, a1:{x:35,y:-1,vx:0,vy:0,o:Math.PI/2,st:100,bk:0,nx:35,ny:-1}, a2:{x:70,y:PW+1,vx:0,vy:0,o:-Math.PI/2,st:100,bk:0,nx:70,ny:PW+1}, cardK:0, cardT:-99, flag:0, flagT:-99};
  /* R5 (0.4.7.0): niente errori arbitrali pianificati a inizio partita (prima: 0–2 errori estratti con una probabilità); gli errori nascono
     da quello che arbitro e assistenti vedono dalla loro posizione (offsideCall, foul) */
  const refErrs=[], errPlan=null;
  const coachOff=[false,false];
  const MIN_T=60/DT*TIME_F;
  /* I1: sonda di taratura (tools/i1.js --tara): misura dosi e consumi senza far male a nessuno */
  if(globalThis.__I1CAL) M.cal=globalThis.__I1CAL;
  const FZ=globalThis.__I1FORZA||null;   /* solo prove: {t tick, s squadra, aer}: il portiere di quella squadra si fa male in quel tick */   /* {ct, ctA, nc, h, doses:[], bin:[[ΣdE, ΣdE·fatK] × 6 quarti d'ora, l'ultimo di ogni tempo con il recupero]}, si somma su più partite */
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
  const gkT=[], gkLast=[undefined,undefined];   /* I1 (n. 77): chi sta in porta, istante per istante */
  const cols = rec ? [...all.keys()] : null, colIdx = rec ? new Map(cols.map((id,i)=>[id,i])) : null, colP = rec ? cols.map(id=>all.get(id)) : null;
  /* v0.4.6.0 (R4, per R6b): elenco leggero dei gesti, solo con rec acceso (nessun numero casuale, nessun effetto sulla partita).
     Un intero per gesto: tick·1024 + colonna·16 + tipo (GST_K). */
  const GST=rec?[]:null; M.gst=rec?(p,k)=>{ const c=colIdx.get(p.id); GST.push(M.tick*1024+(c==null?63:c)*16+k); }:null;
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
  /* R5 (decisione di Dani, 13/11): scelta del difendente nella sua area. pw = probabilità vera di vincere il duello (la stessa del contrasto);
     il difendente la stima con un errore che cala con Decisioni e Freddezza (±0,3 per chi le ha a 1, nessuno a 20); se è dietro all'attaccante
     (più lontano di lui dalla propria porta) la stima cala di 0,2 (da dietro si prende la palla di rado e si rischia il rigore). Contrasta se la
     stima arriva a 0,5, cioè se pensa di vincerlo più spesso di perderlo; altrimenti accompagna */
  /* R5c (PROBLEMI_NOTI n. 55): prima contrastava se la stima arrivava a 0,5. Ora confronta i gol che si aspetta nei due casi (occTolta, la stessa stima
     dell'arbitro: posizione, girarsi, difendenti, linea di tiro): se accompagna l'attaccante tira con lui davanti (eC, con lui tra i difendenti); se
     contrasta e vince non tira nessuno, se perde da davanti l'attaccante lo supera e tira senza di lui (eF), da dietro rischia il rigore (vR).
     Contrasta se (1 − stima)·(eF o vR) ≤ eC: con il tiro libero davanti (eC ≈ eF) contrasta anche con poche speranze */
  const tackleOk=(q,o,pw)=>{ const tq=tm(q), gx=tq.dir>0?0:PL, gs=hyp(q.x-gx,q.y-34)<hyp(o.x-gx,o.y-34);
    const est=clamp(pw+(R()-0.5)*0.6*(1-(q.a.dec+q.a0.fre)/40)-(gs?0:0.2),0,1);
    const dA=[], dB=[]; for(const p of tq.on) if(p.role!=='GK'){ dA.push(p); if(p!==q) dB.push(p); }
    const eC=occTolta(o.x,o.y,o.vx,o.vy,o.o,gx,dA,1), eF=occTolta(o.x,o.y,o.vx,o.vy,o.o,gx,dB,1), ok=(1-est)*(gs?eF:REF_A.vR)<=eC;
    if(SO) SO.e('r5c',SX,{k:'area', q, o, est, eC, eF, gs, ok});
    return ok; };
  while(true){
    for(const t of T) targets(t);
    if(M.restart){ const tk=M.restart.taker&&M.restart.taker.on?M.restart.taker:null;
      if(tk && M.restart.type==='kick'){ if(M.restart.bs==='ready'){ tk.tx=52.5-T[M.restart.team].dir*0.3; tk.ty=34; tk.urg=true; } }
      else if(tk){ if(M.restart.type==='pen'){ const A=T[M.restart.team]; tk.tx=M.restart.x-A.dir*1.2; tk.ty=M.restart.y; } else { const r=M.restart;
          /* v0.4.6.0 (R4, PROBLEMI_NOTI n. 1): angoli, punizioni e rinvii dal fondo con la rincorsa: chi batte aspetta 1,5 m dietro la palla
             (rispetto alla direzione del calcio) e quando la ripresa è pronta fa i passi verso la palla (r.run, rsReady) */
          if((r.type==='cor'||r.type==='fk'||r.type==='gk') && !r.run){ if(r.bx==null){ const A=T[r.team], gx=r.type==='cor'?(A.dir>0?PL-11:11):(A.dir>0?PL:0), ux0=r.type==='gk'?A.dir:gx-r.x, uy0=r.type==='gk'?0:34-r.y, L=hyp(ux0,uy0)||1; r.bx=r.x-ux0/L*1.5; r.by=r.y-uy0/L*1.5; }
            tk.tx=r.bx; tk.ty=r.by; } else { tk.tx=r.x; tk.ty=r.y; } } tk.urg=true; }
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
      if(o.hold && o.role==='GK' && !handsOk(o,ball.x,ball.y)) o.hold=false;   /* v0.4.6.0 (R4, PROBLEMI_NOTI n. 23): fuori dalla sua area il portiere gioca con i piedi */
      ownerBall();
      let lost=false;
      for(const q of op(o).on){ if(q.role==='GK'&&(D2(q,o)>2.4||rx(tm(q),o.x)>16.5)) continue; if(q.stun>0||q.dv) continue; const d=D2(q,o);
        /* R5c: fallo tattico, scelto una volta per contropiede da chi arriva a portata del portatore (match_arb.js, tacticalFoul) */
        if(d<=R5C.reach && tacticalFoul(q,o)){ lost=true; break; } const box=rx(tm(q),q.x)<18 && Math.abs(q.y-34)<22; const eng=q.eng==='press'||q.eng==='contain'||q.role==='GK', pa=q.role==='GK'?0.3*(0.7+q.a0.usc/30):(q.eng==='press'||box?(d<1?0.3:0.16):(d<1?0.2:0.08))*(0.82+q.a0.agg/45)*CONTEST_K*(o.drib>0?R4C.dr:R4C.k); const fq=o.drib>0&&o.dq===q; if(fq) o.dq=null;
        /* CA1 (Dani, punto 3): chi stima l'arbitro più severo del normale (q.amE, dai cartellini per condotta visti: match_arb.js, seeCard) entra meno duro:
           niente scivolata (contrasta solo da vicino, in piedi) e niente contrasto da dietro (accompagna) */
        if((fq || d<(eng?2.0:1.6)) && q.amE!=null && q.amE<CA1_AM0() && (d>CA1_K.sciv || behindOf(q,o))){ if(SO) SO.e('ca1',SX,{k:'cauto', q, o, d, dietro:behindOf(q,o), amE:q.amE}); continue; }
        if(fq?d<2.4:(d<(eng?2.0:1.6) && R()<pa)){
          /* R5c (strada b di Dani, 13/11): chi entra in contrasto da dietro arriva con il corpo sulla schiena del portatore (urto, match_fis.js); se lo fa
             accelerare è una spinta: fallo con le regole di R5b (asticella, vantaggio, nessun giallo salvo gioco pericoloso), giudicato subito */
          if(behindOf(q,o)){ const u=urto(o,q,true); if(u && u.gain>0 && contactFoul(q,o,u.gain,{k:'spinta', fis:false, info:{g:u.gain}})){ lost=true; break; } if(M.restart||ball.owner!==o){ lost=true; break; } }
          const dp=(q.role==='GK'?q.a.usc*0.7+q.a.par*0.3:o.drib>0?q.a.con*0.6+q.a.vel*0.3+q.a.for*0.1:q.a.con*0.75+q.a.for*0.25)*(0.45+0.55*q.st/100), ap=(o.drib>0?o.a.dri*0.6+o.a.vel*0.3+o.a.for*0.1:o.a.dri*0.5+o.a0.ctr*0.25+o.a.for*0.25)*(0.45+0.55*o.st/100)*0.95*(o.shield>0?1.35:1); const fl=R()<o.fl*1.2; const dpw=(o.drib>0?dp*R4C.dw:dp)*(1-R4C.luc*fatK(q)*(1.3-q.gs.CO/20)), dpg=Math.pow(dpw,R4C.dg), apg=Math.pow(ap,R4C.dg), win=!fl && R()<dpg/(dpg+apg);
          /* R5 (decisione di Dani, 13/11): in area il difendente tenta il contrasto solo se pensa di prendere la palla (tackleOk); altrimenti accompagna e chiude la linea di tiro (boxDef) */
          if(!fq && q.role!=='GK' && rx(tm(q),o.x)<16.5 && Math.abs(o.y-34)<20.2){ const tkO=tackleOk(q,o,dpg/(dpg+apg));
            if(SO){ const gx=tm(q).dir>0?0:PL; SO.e('r5',SX,{k:'boxdec', att:q.a.dec+q.a0.fre, gs:hyp(q.x-gx,q.y-34)<hyp(o.x-gx,o.y-34), tackle:tkO, win}); if(!tkO) SO.e('r5',SX,{k:'contain'}); }
            if(!tkO) continue; }   /* R4 (F9): la qualità conta di più nei duelli (meno duelli, stesso peso della rosa) */   /* R4 (F6): il difensore stanco e poco concentrato (CO) perde più contrasti */
          /* R4b (passo 1): il fallo è più probabile se il difensore arriva veloce sul portatore (velocità di avvicinamento vcF, ×1 a 2 m/s) */
          const vcF=Math.max(0,(((q.vx||0)-(o.vx||0))*(o.x-q.x)+((q.vy||0)-(o.vy||0))*(o.y-q.y))/Math.max(0.3,d)), kvF=clamp(0.4+0.3*vcF,0.4,2.5);
          /* C1b (n. 83): il difendente sa quale cartellino rischia con questo intervento e lo mette nella scelta (tackleCard, match_arb.js); pF = la
             probabilità del fallo qui sotto, con il duello vinto stimato (pw) al posto dell'esito che non conosce ancora */
          if(q.role!=='GK'){ const pw=dpg/(dpg+apg), pF=clamp((0.19+(q.a0.agg-8)*0.009+(q.tem-10)*0.005+(1-pw)*0.07+fatK(q)*0.03)*kvF*(q.yc?0.45:1)*fisF*(o.drib>0?R4C.fd:R4C.f),0,1);
            if(!tackleCard(q,o,vcF,pw,pF)) continue; }
          /* I1 (D4): il contrasto è un urto tra i due corpi alla velocità d'arrivo vcF (masse come l'urto di R4b); chi arriva da dietro ha già avuto l'urto (ctT) */
          if(!((q.ctT||0)>M.tick)){ const mo=72+((o.h||180)-180)*0.9+(o.a0.for-10)*0.8, mq=72+((q.h||180)-180)*0.9+(q.a0.for-10)*0.8; ctInj(o, vcF*mq/(mo+mq), false); ctInj(q, vcF*mo/(mo+mq), false); }
          /* R5 (0.4.7.0, punti 4 e 6): il fallo nasce dal contatto (R4b: arrivo veloce vcF, aggressività, temperamento, stanchezza, duello perso);
             tolto il ×0,019·penF dei falli in area (PROBLEMI_NOTI n. 48). Poi l'arbitro (o l'assistente) deve vederlo: refSees, dalla sua posizione */
          if(SO) SO.e('r5',SX,{k:'duel', box:rx(tm(q),o.x)<16.5&&Math.abs(o.y-34)<20.2, win, vc:vcF});
          if(R()<(0.19+(q.a0.agg-8)*0.009+(q.tem-10)*0.005+(win?0:0.07)+fatK(q)*0.03)*kvF*(q.yc?0.45:1)*fisF*(o.drib>0?R4C.fd:R4C.f)){ const cat=refCat(q,o,vcF,win);   /* R5b: palla presa prima e intervento non pericoloso: non è fallo, è un contrasto (sotto) */
            if(cat!=='palla'){ if(refSees(q,o,vcF,true)){ if(!foul(q,o,vcF,false,cat)) unseenFoul(q,o,vcF,true,cat); } else unseenFoul(q,o,vcF,false,cat); lost=true; break; }   /* R5b: visto ma sotto l'asticella dell'arbitro → si gioca */
            if(SO) SO.e('r5b',SX,{k:'palla', g:vcF, eq:0.8+(o.gs.EQ-1)/19*1.2, min:M.tick*DT/60}); }
          /* contrasto pulito con un contatto vero (arrivo oltre 1 m/s): da una posizione cattiva l'arbitro può vederci un fallo */
          /* R5b (Dani, 13/11): un contrasto pulito è un «episodio da fallo» da giudicare solo se l'attaccante cade o perde la palla per l'urto (oltre la sua
             soglia di Equilibrio, come per il fallo); se resta in piedi nessun arbitro ci vede un fallo. Hossner et al. 2019 (Mondiali 2014, 1527 episodi,
             risposta 032): 52 fischi sbagliati e 54 falli non visti. Sotto l'asticella il contrasto pulito resta pulito */
          if(win && refFalls(o,vcF) && !refSees(q,o,vcF,false) && foul(q,o,vcF,true)){ lost=true; break; }
          if(M.gst) M.gst(q, d>1.5?7:6);
          if(win){ q.s.tk++; o.stun=0.5; lost=true;
            /* v0.4.2.0: contrasto vinto: palla pulita al difensore oppure palla che schizza via (più spesso lontano dalla sua porta) */
            const own=rx(tm(q),q.x)<20 && Math.abs(q.y-34)<22;
            if(q.role==='GK'){ if(handsOk(q,ball.x,ball.y)) gkCatch(q,1.5); else giveBall(q,0.6); break; }
            if(RP()<0.42+(q.a0.con-10)*0.02+(own?0.18:0)){ giveBall(q,0.6); break; }
            const qd=T[q.t].dir, a=Math.atan2(o.y-q.y,o.x-q.x)*0.5+(qd>0?0:Math.PI)*0.5+(RP()-0.5)*2.2, k=2.5+RP()*5; loose(ball.x,ball.y,Math.cos(a)*k+o.vx*0.2,Math.sin(a)*k+o.vy*0.2,RP()<0.2?1.5+RP()*2:0); ball.lastT=q.t; ball.lastP=q; break; }
          o.s.drw++; q.stun=o.drib>0?1.3:0.8; if(fl) E('flash',o.t,[o.id,q.id],fill2(P(MTX.flD),{p:o,d:q}),{flash:[o.id]}); break; } }
      if(!lost && ball.owner===o && Math.abs(o.y-34)>27) op(o).pressUntil=Math.max(op(o).pressUntil,M.tick+3);
      if(!lost && ball.owner===o){ o.dt-=DT*TDEC; if(o.dt>0.6){ const [,pr]=nearestOpp(o); if(pr<1.5) o.dt=Math.min(o.dt,0.6); } if(o.cx!=null && !o.ft && hyp(o.cx-o.x,o.cy-o.y)<1) o.dt=Math.min(o.dt,0); if(o.dt<=0){ decide(o); if(!M.restart && ball.fl && ball.fl.from===o) lateHit(o); } }   /* R5c (n. 63): chi arrivava sul portatore lo colpisce dopo il passaggio */
      if(!M.restart && ball.owner) lineCheck();
      if(!M.restart && !ball.owner) ballTick();
    } else ballTick();
    /* I1 (D3, D4): prima gli infortuni dei contatti di questo tick (ctInj), poi il rischio senza contatto: tasso UEFA senza contatto per il consumo di
       energia di questo istante (gli scatti consumano di più) e la stanchezza (beta), con le ricadute della sede (rsF). Prima: 0,65·10⁻⁶ per tick dal nulla */
    if(FZ && M.tick===FZ.t){ const g=T[FZ.s].on.find(p=>p.role==='GK'); if(g) injure(g,'contatto',!!FZ.aer); }   /* solo prove (tools/i1.js, n. 77) */
    for(let i=0;i<M.injQ.length;i+=2) injure(M.injQ[i],'contatto',M.injQ[i+1]); M.injQ.length=0;
    { const kNc=I1.rM*I1.ncM/1000/3600*DT/TIME_F/I1.nc0;
      for(const t of T) for(const p of t.on){ const l=kNc*p.dE*(1+I1.beta*fatK(p))*p.rsF;
        if(M.cal){ M.cal.nc+=l; const mh=(M.tick-(M.half===1?0:htTick))*DT/TIME_F/60, b=Math.min(2,Math.floor(mh/15)); M.cal.bin[(M.half-1)*3+b][0]+=p.dE; M.cal.bin[(M.half-1)*3+b][1]+=p.dE*fatK(p); M.cal.h+=DT/TIME_F/3600; continue; }
        if(RP()<l) injure(p,'senza'); } }
    if(M.tick%Math.round(120*TIME_F)===60) for(const t of T) coachThink(t);
    for(const t of T) for(const p of t.on) if((isAtt(p.role)||((p.role==='CM'||p.role==='AM')&&rx(t,ball.owner?ball.owner.x:0)>62)) && p.runT<=0 && ball.owner && ball.owner.t===t.idx && ball.owner!==p && rx(t,ball.owner.x)>32 && R()<runProb(t,p)*RUN_K){ p.runT=3.5; p.runOff=-0.4-R()*1.2+(R()<0.3-(p.a.dec-10)*0.02?1.8:0); if(R()<p.fl*0.8) E('flash',t.idx,[p.id],fill2(P(MTX.flR),{p}),{flash:[p.id]}); }
    const pt=ball.owner?ball.owner.t:ball.fl?ball.fl.t:-1; if(pt>=0) possTicks[pt]++;
    if(ball.owner && ball.owner.t!==lastOwnT){ const w=T[ball.owner.t], l=T[1-ball.owner.t]; if(lastOwnT>=0){ w.wonT=M.tick; l.lostT=M.tick;
        const brw=rx(w,ball.x), behind=l.on.filter(q=>q.role!=='GK' && rx(w,q.x)>brw).length; if(brw<75 && behind<=6 && !M.restart){ w.counterUntil=M.tick+22; w.on.forEach(q=>{ if(isAtt(q.role)&&q!==ball.owner){ q.runT=3.5; q.runOff=-0.6-R()*1.0; } }); } }
      lastOwnT=ball.owner.t; }
    advTick();
    moveRefs();
    { const bo=ball.owner; if(bo && bo.hold && bo.role==='GK' && !handsOk(bo,ball.x,ball.y)) bo.hold=false; }   /* R4, n. 23: anche dopo il movimento del tick */
    if(SO) SO.tick(SX);
    /* I1 (n. 77, regola 4 IFAB, Dani 15/11): la maglia da portiere va a chi sta in porta (ruolo GK in campo), non al ruolo del giocatore: il visore la
       legge da gkT [tick, squadra, id] (solo con la registrazione accesa, come i frame) */
    if(rec) for(const t of T){ let g=-1; for(const p of t.on) if(p.role==='GK'){ g=p.id; break; } if(g!==gkLast[t.idx]){ gkLast[t.idx]=g; gkT.push(M.tick, t.idx, g); } }
    if(rec) pushFrame();
    M.tick++;
    /* recupero: dipende dal tempo perso (esultanze, cambi, infortuni, cartellini, allontanamenti) */
    if(M.restart && (M.restart.type==='cel'||M.restart.type==='drop'||(M.restart.subs&&M.restart.subs.some(z=>z.ph<2))||(M.restart.card&&!M.restart.card.shown)||(M.restart.coach&&!M.restart.coach.shown))) lost[M.half-1]++;
    if(M.tick===M.regEnd){ const lm=lost[M.half-1]/MIN_T, add=clamp(Math.round(lm*0.75+(M.half===1?0.9:2.2)+RA()*1.2),M.half===1?1:2,M.half===1?6:9); halfEnd=M.tick+Math.round(add*MIN_T); E('added',0,[],`Il quarto uomo alza il tabellone: ${add} minut${add===1?'o':'i'} di recupero.`,{add}); }
    if(M.half===1 && M.tick>=halfEnd){ stepSubs(true); E('ht',0,[],`Fine primo tempo: ${T[0].inp.n} ${T[0].goals}-${T[1].goals} ${T[1].inp.n}.`); M.half=2; htTick=M.tick;
      if(ball.owner) ball.owner.hold=false; ball.owner=null; ball.fl=null; M.restart=null;
      for(const o of [ref,ref.a1,ref.a2]) o.st=Math.min(100,o.st+7);   /* R5: anche arbitro e assistenti recuperano nell'intervallo */
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
  flushCards();   /* R5b: cartellini ancora da dare dopo un vantaggio */
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
    rt[id]=Math.round(clamp(r,3.5,10)*2)/2; if(globalThis.__RAW && p.mins>=60) globalThis.__RAW.push([rg,raw]); if(p.inj) inj[id]=p.ijk; if(p.s.red) red.push(id); }
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
  if(rec){ out.frames=frames; out.cols=cols; out.owners=owners; out.gesti=Int32Array.from(GST); out.gkT=gkT; }
  return out;
}

/* istantanea dei dati che servono alla partita (così si può rivedere identica) */
function matchInput(t){
  const dI=i1Oggi(), mI=i1Med(t);   /* I1: deficit di forma e ricadute del giorno della partita; non idoneo = nessun via libera prima della partita */
  const avail=teamPlayers(t).filter(p=>!(p.inj>0)&&!(p.ij&&p.ij.f>dI)&&!(p.sq>0)), c=coachMigrate(t.coach), absent=(c.squal||0)>0, eq=coachEq(c);
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
    players:avail.map(p=>{ const q={id:p.id, ln:p.ln, r:p.r, age:p.age, a:p.s?skMatchA(p):Object.fromEntries(ATTR.map(k=>[k,Math.round(p.a[k]*10)/10])), st0:Math.round(100-(p.fat||0)-i1Fd(p,dI)), mor:Math.round(p.mor*10)/10, tem:p.tem, h:p.h||180, foot:p.foot||'D', fl:Math.round(flashP(p)*1000)/1000, ovr0:Math.round(ovr(p)*10)/10, rs:i1Rs(p,dI,mI)}; const b=bOf(p); if(b) q.b=b; const tq=tqOf(p); if(tq) Object.assign(q,tq); if(p.s) q.g=gsEnc(p); return q; })};
}
