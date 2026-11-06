'use strict';
/* ================= GIOCATORI A 57 CARATTERISTICHE (v0.4.3.0, blocco S1) =================
   Specifica: docs/proposte/EVIVORA_SKILL_57_FORMULE_PER_CLAUDE.md (vincolante); analisi e decisioni in docs/PROGRESSI_S1.md.
   Si salvano solo: p.s = 6 allenabili 0–100 (R, CP, DT, LG, CO, PA), p.h altezza (cm), p.w peso (kg), p.g massa grassa (%),
   p.nd giorno di nascita (1–365; l'età resta p.age), p.foot piede (D, S, A), p.pf indice del profilo in PROFILES.
   Le 46 derivate si calcolano (skOf, con cache non salvata) e non finiscono mai nel salvataggio.
   La partita vede ancora i 22 attributi su 1–20 (skA22, solo in matchInput) fino a R3/R4: S1 dà i valori, non cambia le decisioni.
   Si carica dopo testi_it.js e prima di engine.js; le funzioni di engine.js (hashU, clamp, PROFILES, ROLE_W) si usano solo
   dentro funzioni chiamate dopo il caricamento. */

/* --- le 57: [sigla, gruppo della specifica]; gruppi: fis 11, ana 4, tec 12, tat 8, men 8, agg 8, por 6 --- */
const SK_GRUPPI=['fis','ana','tec','tat','men','agg','por'];
const SK57=[['VE','fis'],['AC','fis'],['RE','fis'],['R','fis'],['FM','fis'],['PM','fis'],['AG','fis'],['EQ','fis'],['CM','fis'],['MO','fis'],['EL','fis'],
  ['H','ana'],['W','ana'],['AGE','ana'],['GR','ana'],
  ['CP','tec'],['PT','tec'],['PC','tec'],['PL','tec'],['VI','tec'],['DR','tec'],['TI','tec'],['PO','tec'],['CT','tec'],['CR','tec'],['CN','tec'],['IN','tec'],
  ['OF','tat'],['DF','tat'],['SM','tat'],['MA','tat'],['AN','tat'],['LG','tat'],['DM','tat'],['DT','tat'],
  ['CO','men'],['DE','men'],['FR','men'],['CG','men'],['AA','men'],['AU','men'],['LE','men'],['CL','men'],
  ['PF','agg'],['PD','agg'],['RT','agg'],['PU','agg'],['RI','agg'],['CA','agg'],['ET','agg'],['AD','agg'],
  ['RF','por'],['PA','por'],['PR','por'],['US','por'],['PG','por'],['DI','por']];
/* i 5 dati fisici, anagrafici e di lateralità (non sommabili) */
const SK_DATI=['H','W','AGE','GR','PF'];
/* le 6 allenabili e l'allenamento che le cura (M10b) */
const SK_ALL=['R','CP','DT','LG','CO','PA'];
const SK_ALLEN={R:'fisico',CP:'tecnico',DT:'tattico',LG:'cognitivo',CO:'mentale',PA:'portiere'};
/* le 46 derivate nell'ordine obbligatorio (Fisico → Mentale → Cognitivo → Tattico → Tecnico → Portiere, righe in ordine) */
const SK_DER=['RE','CM','FM','VE','PM','EQ','AC','AG','MO','EL', 'AU','FR','DE','CG','AA','CL','LE', 'VI','AN','DM','RT','ET',
  'OF','DF','MA','SM','AD', 'PT','PC','PL','DR','TI','PO','CR','CT','CN','IN','PD','PU','RI','CA', 'RF','PR','PG','US','DI'];
/* le 52 skill di gioco (per K1): 57 meno i 5 dati */
const SK52=SK_ALL.concat(SK_DER);
const SK_DA=(()=>{ const o={}; [['R',SK_DER.slice(0,10)],['CO',SK_DER.slice(10,17)],['LG',SK_DER.slice(17,22)],['DT',SK_DER.slice(22,27)],['CP',SK_DER.slice(27,41)],['PA',SK_DER.slice(41)]].forEach(([k,l])=>l.forEach(d=>o[d]=k)); return o; })();

const skL=x=>x<0?0:x>100?100:x, skP=x=>x>0?x:0;
/* --- formule della specifica. i = {R,CP,DT,LG,CO,PA, H,W,AGE,GR}; off = impronta (scarti per sigla) o null.
   L'impronta si aggiunge al valore della formula prima di L() e vale anche per le derivate successive che lo usano. --- */
function skDerive(i, off){
  const R=i.R, CP=i.CP, DT=i.DT, LG=i.LG, CO=i.CO, PA=i.PA, H=i.H, W=i.W, AGE=i.AGE, GR=i.GR, o=off||{};
  const MM=W*(1-GR/100), U=skL(50+5*(MM/((H/100)*(H/100))-20.4)), Z=skL(50+1.5*(H-180)), PE=skP(W-75*(H/180)*(H/180)), GE=skP(GR-12);
  const A29=skP(AGE-29), A30=skP(AGE-30), A33=skP(AGE-33), A34=skP(AGE-34), EXP=Math.min(5,skP(AGE-19)*0.25);
  const f=(k,v)=>skL(v+(o[k]||0));
  const s={R,CP,DT,LG,CO,PA};
  /* FISICO */
  s.RE=f('RE',0.90*R+0.10*U-0.55*GE-0.18*PE-0.35*A33);
  s.CM=f('CM',0.65*R+0.35*CP-0.20*PE-0.20*A34);
  s.FM=f('FM',0.45*R+0.55*U-0.20*A34);
  s.VE=f('VE',0.50*R+0.30*s.FM+0.20*s.CM-0.70*GE-0.25*PE-0.90*A29);
  s.PM=f('PM',0.60*s.FM+0.40*s.VE-0.25*A30);
  s.EQ=f('EQ',0.60*s.CM+0.40*s.FM-0.12*PE);
  s.AC=f('AC',0.50*s.PM+0.30*s.VE+0.20*s.CM-0.25*PE-0.20*GE);
  s.AG=f('AG',0.30*s.VE+0.30*s.AC+0.25*s.CM+0.15*s.EQ-0.20*PE-0.12*GE);
  s.MO=f('MO',0.65*s.CM+0.35*s.EQ-0.25*PE-0.40*A30);
  s.EL=f('EL',0.50*s.PM+0.20*s.FM+0.30*s.CM-0.20*PE-0.20*GE);
  /* MENTALE */
  s.AU=f('AU',0.75*CO+0.25*DT);
  s.FR=f('FR',0.70*CO+0.30*s.AU);
  s.DE=f('DE',0.55*CO+0.25*DT+0.20*LG);
  s.CG=f('CG',0.50*s.DE+0.25*s.FR+0.25*CO);
  s.AA=f('AA',0.50*s.DE+0.30*s.CG+0.20*R);
  s.CL=f('CL',0.40*DT+0.30*LG+0.30*s.AU);
  s.LE=f('LE',0.40*s.DE+0.30*s.CL+0.30*LG+EXP-0.20*skP(40-s.FR));
  /* COGNITIVO */
  s.VI=f('VI',0.80*LG+0.20*CO);
  s.AN=f('AN',0.75*LG+0.25*CO);
  s.DM=f('DM',0.55*LG+0.25*s.AN+0.20*s.FR+EXP-0.25*skP(40-CO));
  s.RT=f('RT',0.50*CO+0.30*s.CM+0.20*s.AC-0.30*A30);
  s.ET=f('ET',0.40*LG+0.25*s.VI+0.20*s.DM+0.15*CP-0.10*skP(45-s.FR));
  /* TATTICO */
  s.OF=f('OF',0.45*DT+0.30*LG+0.25*s.AN+EXP);
  s.DF=f('DF',0.45*DT+0.35*LG+0.20*s.AN+EXP);
  s.MA=f('MA',0.50*s.DF+0.25*DT+0.25*CO-0.20*skP(45-s.AG));
  s.SM=f('SM',0.40*s.OF+0.25*s.AN+0.20*s.AC+0.15*s.AG);
  s.AD=f('AD',0.45*DT+0.35*LG+0.20*s.CL+EXP-0.15*skP(40-s.DM));
  /* TECNICO */
  s.PT=f('PT',0.70*CP+0.20*s.CM+0.10*s.FR);
  s.PC=f('PC',0.50*CP+0.20*s.CM+0.20*s.VI+0.10*s.DM);
  s.PL=f('PL',0.35*CP+0.25*s.PC+0.15*s.CM+0.15*s.FM+0.10*s.VI-0.20*skP(45-s.PM));
  s.DR=f('DR',0.40*CP+0.25*s.AG+0.20*s.PT+0.15*s.DM-0.20*skP(45-s.AC));
  s.TI=f('TI',0.35*CP+0.20*s.CM+0.25*s.FR+0.20*s.DM);
  s.PO=f('PO',0.65*s.PM+0.20*s.FM+0.15*s.CM);
  s.CR=f('CR',0.45*s.PL+0.20*s.VI+0.20*s.CM+0.15*CP-0.20*skP(45-s.MO));
  s.CT=f('CT',0.20*CP+0.20*s.AN+0.20*s.EL+0.15*Z+0.15*s.CM+0.10*s.FR);
  s.CN=f('CN',0.30*s.MA+0.25*s.FM+0.25*s.EQ+0.20*s.AN-0.20*skP(45-s.MO));
  s.IN=f('IN',0.45*s.AN+0.35*s.DF+0.20*s.DM-0.15*skP(45-s.AC));
  s.PD=f('PD',0.60*CP+0.25*s.CM+0.15*s.PT-20);
  s.PU=f('PU',0.30*s.TI+0.25*s.PL+0.20*s.PO+0.15*s.FR+0.10*s.CM);
  s.RI=f('RI',0.40*s.TI+0.35*s.FR+0.15*CO+0.10*s.DM);
  s.CA=f('CA',0.50*s.CR+0.25*s.PL+0.15*s.VI+0.10*s.CM);
  /* PORTIERE */
  s.RF=f('RF',0.55*PA+0.30*s.RT+0.15*CO);
  s.PR=f('PR',0.50*PA+0.30*s.CM+0.20*CO);
  s.PG=f('PG',0.40*PA+0.35*LG+0.25*s.AN);
  s.US=f('US',0.25*PA+0.20*s.AN+0.15*s.EL+0.10*Z+0.15*s.CG+0.10*s.AC+0.05*s.PG);
  s.DI=f('DI',0.35*s.PC+0.30*s.PL+0.20*s.VI+0.15*PA);
  return s;
}

/* --- impronta del giocatore: calcolata, mai salvata. Gruppi tipici: lo scarto del profilo (PROFILES, es. stopper con:+2) × 5,
   variato da 0,6 a 1,4 con un hash, più ±6 per gruppo e ±6 per sigla da hash di id e ruolo; totale entro ±15; solo sulle 46 derivate --- */
const SK_IMP_GRP={vel:['VE','AC','AG'],res:['RE'],for:['FM','PM','EQ'],ele:['EL'],tes:['CT'],con:['CN','MA','IN'],pas:['PC','PL'],vis:['VI','ET'],ctr:['PT','DR','PD'],
  dri:['DR','AG'],crs:['CR','CA'],tir:['TI','RI'],lun:['PO','PU'],cpz:['PU','RI','CA'],dec:['DM','AD'],pos:['OF','SM'],dif:['DF','MA'],fre:['FR','RI'],agg:['AA','CG','DE'],
  par:['RF'],pre:['PR'],usc:['US'],rin:['DI']};
const SK_IMP={max:15, prof:5, grp:6, sig:6};
function skProf(p){ const l=PROFILES[p.r]||[]; return l[p.pf|0]||l[0]||['',{}]; }
function skImpronta(id, role, delta){
  const off={}, key=id+'|'+role; let gi=0;
  for(const g in SK_IMP_GRP){ gi++; const d=delta[g]||0, k=0.6+0.8*hashU(key,gi);
    const v=clamp(d*SK_IMP.prof*k+(hashU(key,gi+100)-0.5)*2*SK_IMP.grp,-SK_IMP.max,SK_IMP.max), l=SK_IMP_GRP[g];
    for(const s of l) off[s]=(off[s]||0)+v/(l.length>2?1.4:1); }
  SK_DER.forEach((s,j)=>{ off[s]=clamp((off[s]||0)+(hashU(key,j+300)-0.5)*2*SK_IMP.sig,-SK_IMP.max,SK_IMP.max); });
  return off;
}

/* --- conversione per la partita (fino a R3/R4): 22 attributi su 1–20 dalle 57; correzioni fisse SK_CAL tarate con tools/s1.js --taratura
   (scarto medio tra i 22 della 0.4.2.7 e quelli ricavati: l'adattamento lavora sulla scala grezza, grezzo=true, così la correzione non si accumula) --- */
const SK_T20=s=>1+0.19*s;
/* per ruolo e attributo (punti 1–20), da node s1.js --taratura su 8 mondi generati dalla 0.4.2.7 (stessi 22 di partenza) */
const SK_CAL={P:{pas:-1.25,ctr:-1.15,dri:-2.42,crs:-2.5,tir:-3.43,lun:-2.97,tes:-3.33,con:-2.31,cpz:-2.81,vis:-3.23,dec:1.14,pos:-0.62,fre:-2.23,agg:-3.01,vel:-1.69,res:-1.55,for:-1.08,ele:1.08,par:-0.07,pre:0.13,usc:0.42,rin:1.68},D:{pas:0.18,ctr:0.62,dri:-2.72,crs:-3.24,tir:-2.9,lun:-3.12,tes:0.14,con:0.25,cpz:-3.05,vis:-3.38,dec:0.43,pos:-0.01,fre:-1.29,agg:-2.67,vel:0.44,res:-3.1,for:-0.08,ele:0.16},C:{pas:-0.04,ctr:0.06,dri:0.05,crs:-3.41,tir:0.5,lun:0.6,tes:-3,con:0.75,cpz:-3.27,vis:0.04,dec:0.07,pos:-3.51,fre:-1.74,agg:-2.62,vel:-2.86,res:0.16,for:-3.08,ele:-3.33},A:{pas:-3.16,ctr:-0.23,dri:0.43,crs:-2.97,tir:0.05,lun:-0.29,tes:0.35,con:-3.01,cpz:-3.98,vis:-1.5,dec:-2.15,pos:0.26,fre:0.15,agg:-3.4,vel:0.42,res:-3.25,for:-2.87,ele:-3.37}};
/* dispersione per ruolo e attributo: [media, fattore]; l'adattamento stringe un po' le differenze tra giocatori (da 22 numeri a 8),
   il fattore riporta la deviazione standard di ogni attributo a quella della 0.4.2.7 (tools/s1.js --taratura) */
const SK_DISP={P:{pas:[7.57,1.46],ctr:[7.46,1.01],dri:[5.74,0.78],crs:[5.36,1.18],tir:[5.59,1.16],lun:[5.5,1.51],tes:[5.53,1.44],con:[5.45,1.21],cpz:[5.45,1.2],vis:[5.77,1.14],dec:[10.42,1.13],pos:[10.23,1.07],fre:[5.74,0.88],agg:[5.27,1.15],vel:[5.29,1],res:[5.49,0.92],for:[7.5,1.4],ele:[8.56,1.45],par:[10.89,1.16],pre:[11.02,0.97],usc:[10.99,1.28],rin:[11,1.14]},D:{pas:[10.46,1.14],ctr:[10.31,1.06],dri:[6.9,0.9],crs:[7.35,1.15],tir:[6.81,1.15],lun:[6.95,1.31],tes:[10.6,1.22],con:[10.8,1.14],cpz:[6.76,1.21],vis:[7.08,0.9],dec:[10.96,1.08],pos:[10.75,1.11],fre:[6.91,1.05],agg:[7.11,1.04],vel:[10.14,1.21],res:[7.08,1.02],for:[10.8,1.42],ele:[10.57,1.16]},C:{pas:[10.62,1.18],ctr:[10.24,1.15],dri:[10.59,0.98],crs:[7.23,1.17],tir:[10.55,1.2],lun:[10.83,1.33],tes:[6.66,1.34],con:[10.35,1.21],cpz:[7.28,1.3],vis:[10.73,1.17],dec:[10.67,1.05],pos:[6.82,1.49],fre:[6.73,0.95],agg:[7.05,1.18],vel:[7.33,1.16],res:[10.53,1.09],for:[6.88,1.42],ele:[6.66,1.03]},A:{pas:[6.78,1.16],ctr:[10.15,1.1],dri:[10.64,0.98],crs:[6.99,1.05],tir:[10.76,1.16],lun:[10.25,1.36],tes:[9.87,1.08],con:[6.82,1.16],cpz:[6.8,1.34],vis:[7.15,1.1],dec:[6.71,0.93],pos:[10.91,1.11],fre:[10.88,1.06],agg:[6.78,1.03],vel:[10.79,1.16],res:[6.85,0.88],for:[6.91,1.67],ele:[7,1.19]}};
/* correzione di ovr per ruolo (scarto medio dopo l'adattamento, tarato con tools/s1.js --taratura) */
const SK_OVR={P:0,D:0,C:0,A:0};
function skA22(s, r, grezzo){
  const o={pas:0.7*s.PC+0.3*s.PL, ctr:s.PT, dri:s.DR, crs:s.CR, tir:s.TI, lun:(s.TI+s.PO)/2, tes:s.CT, con:s.CN, cpz:(s.PU+s.CA+s.RI)/3,
    vis:s.VI, dec:s.DM, pos:r==='P'?s.PG:r==='A'?s.OF:r==='D'?s.DF:(s.OF+s.DF)/2, fre:s.FR, agg:s.AA, vel:0.7*s.VE+0.3*s.AC, res:s.RE, for:s.FM, ele:s.EL,
    par:s.RF, pre:s.PR, usc:s.US, rin:s.DI};
  const D=SK_DISP[r]; for(const k in o){ if(grezzo){ o[k]=SK_T20(o[k]); continue; } let v=SK_T20(o[k])+(SK_CAL[r][k]||0); const d=D[k]; if(d) v=d[0]+(v-d[0])*d[1]; o[k]=clamp(v,1,20); }
  return o;
}

/* --- valori di un giocatore, con cache non salvata (WeakMap) invalidata dalla firma dei dati --- */
const SK_CACHE=new WeakMap();
function skIn(p){ const s=p.s; return {R:s.R,CP:s.CP,DT:s.DT,LG:s.LG,CO:s.CO,PA:s.PA,H:p.h||180,W:p.w,AGE:p.age,GR:p.g}; }
function skOf(p){
  const s=p.s, sig=s.R+','+s.CP+','+s.DT+','+s.LG+','+s.CO+','+s.PA+','+p.h+','+p.w+','+p.g+','+p.age+','+p.pf+','+p.r+','+p.id;
  let c=SK_CACHE.get(p); if(c && c.sig===sig) return c;
  const v=skDerive(skIn(p), skImpronta(String(p.id), p.r, skProf(p)[1]));
  c={sig, v, a:skA22(v,p.r)}; SK_CACHE.set(p,c); return c;
}
/* 22 attributi per matchInput (arrotondati come prima) */
function skMatchA(p){ const a=skOf(p).a, o={}; for(const k of ATTR) o[k]=Math.round(a[k]*10)/10; return o; }
/* somma delle 52 skill di gioco (K1) */
function skill52(p){ const v=skOf(p).v; let t=0; for(const k of SK52) t+=v[k]; return t; }
/* ruolo migliore tra i 7 di K1: media più alta delle skill chiave (dati reali 014b, docs/PROGRESSI_S1.md §5) */
const SK_RUOLI={por:['PA','RF','PR','US','PG','DI'], dif:['MA','CN','DF','IN','CT','FM'], med:['CN','IN','DF','AN','RE','PC'], cen:['PC','PL','VI','DM','CP','RE'],
  est:['CR','DR','VE','AC','RE','PC'], tre:['VI','ET','DR','PT','PC','TI'], att:['TI','FR','OF','SM','CT','PO']};
function skRuoli(p){ const v=skOf(p).v, o={}; for(const r in SK_RUOLI) o[r]=SK_RUOLI[r].reduce((t,k)=>t+v[k],0)/SK_RUOLI[r].length; return o; }
/* riferimento: media delle skill chiave di ogni ruolo su tutti i giocatori generati (tools/s1.js --taratura); il ruolo migliore è quello
   in cui il giocatore supera di più il riferimento, così le liste con skill mediamente più alte non vincono sempre. Portiere solo con Parata ≥ 40
   (la Parata è l'unica allenabile del portiere: chi non la allena non è un portiere) */
const SK_RUOLI_RIF={por:27.6,dif:46.9,med:47,cen:47.5,est:47,tre:47.3,att:47.2};
function skRuoloMigliore(p){ const o=skRuoli(p), pa=p.s.PA>=40; let b=null; for(const r in o){ if(r==='por'&&!pa) continue; if(b==null||o[r]-SK_RUOLI_RIF[r]>o[b]-SK_RUOLI_RIF[b]) b=r; } return b; }

/* --- adattamento: dagli attributi su 1–20 (22) alle 6 allenabili + peso + massa grassa (nessun rnd(): stesso risultato ovunque).
   Minimi quadrati pesati (×6 sugli attributi di ROLE_W del ruolo, 0,6 sugli altri, quasi nulla per le skill da portiere dei giocatori
   di movimento) con una piccola spinta verso 50 delle 5 allenabili generali (rid, per evitare valori estremi senza motivo).
   Metodo di Levenberg–Marquardt con derivate numeriche e limiti: peso tra riferimento −8 e +10 kg (riferimento 75·(H/180)²),
   grasso 8–15%, allenabili 0–100. Partenza: ogni allenabile dall'attributo che le somiglia di più. --- */
const SK_FIT={kw:6, base:0.6, gkMov:0.05, rid:2, giri:10, h:0.5};
function skFit(a, r, h, age, off){
  const w=ROLE_W[r], Wr=75*(h/180)*(h/180), lo=[0,0,0,0,0,0,Wr-8,8], hi=[100,100,100,100,100,100,Wr+10,15], K=ATTR.length, N=K+5, sw=new Array(K);
  for(let j=0;j<K;j++){ const k=ATTR[j]; sw[j]=Math.sqrt((GK_ATTR.includes(k)&&r!=='P')?SK_FIT.gkMov:SK_FIT.kw*(w[k]||0)+SK_FIT.base); }
  const sr=Math.sqrt(SK_FIT.rid)/10;
  const res=x=>{ const v=skA22(skDerive({R:x[0],CP:x[1],DT:x[2],LG:x[3],CO:x[4],PA:x[5],H:h,W:x[6],AGE:age,GR:x[7]},off),r,true), o=new Array(N);
    for(let j=0;j<K;j++) o[j]=sw[j]*(v[ATTR[j]]-a[ATTR[j]]); for(let j=0;j<5;j++) o[K+j]=sr*(x[j]-50); return o; };
  const ss=o=>{ let e=0; for(const v of o) e+=v*v; return e; };
  const c=v=>clamp((v-1)/0.19,0,100);
  let x=[c((a.res+a.vel)/2), c((a.ctr+a.dri+a.pas)/3), c(a.pos), c((a.vis+a.dec)/2), c((a.fre+a.dec)/2), r==='P'?c(a.par):5, Wr, 11.5];
  let r0=res(x), e=ss(r0), mu=1, n=1;
  for(let it=0; it<SK_FIT.giri; it++){
    /* jacobiana per differenze in avanti (verso l'interno dei limiti) */
    const J=[]; for(let j=0;j<8;j++){ const y=x.slice(), d=y[j]+SK_FIT.h<=hi[j]?SK_FIT.h:-SK_FIT.h; y[j]+=d; const rj=res(y); n++; J.push(rj.map((v,i)=>(v-r0[i])/d)); }
    const A=[], g=[]; for(let i=0;i<8;i++){ A.push([]); let gi=0; for(let m=0;m<N;m++) gi+=J[i][m]*r0[m]; g.push(-gi); for(let j=0;j<8;j++){ let t=0; for(let m=0;m<N;m++) t+=J[i][m]*J[j][m]; A[i].push(t); } }
    let fatto=false;
    for(let tent=0; tent<6; tent++){
      const M=A.map((row,i)=>row.map((v,j)=>i===j?v*(1+mu)+1e-9:v)), dx=skSolve(M,g.slice());
      const y=x.map((v,j)=>clamp(v+dx[j],lo[j],hi[j])), ry=res(y), ey=ss(ry); n++;
      if(ey<e){ const gain=e-ey; x=y; r0=ry; e=ey; mu=Math.max(1e-4,mu/4); fatto=gain>1e-4; break; }
      mu*=8;
    }
    if(!fatto) break;
  }
  return {x, e, n};
}
/* sistema lineare piccolo (eliminazione di Gauss con pivot) */
function skSolve(A,b){ const n=b.length;
  for(let i=0;i<n;i++){ let p=i; for(let k=i+1;k<n;k++) if(Math.abs(A[k][i])>Math.abs(A[p][i])) p=k; [A[i],A[p]]=[A[p],A[i]]; [b[i],b[p]]=[b[p],b[i]];
    const d=A[i][i]||1e-12; for(let k=i+1;k<n;k++){ const f=A[k][i]/d; if(!f) continue; for(let j=i;j<n;j++) A[k][j]-=f*A[i][j]; b[k]-=f*b[i]; } }
  const x=new Array(n).fill(0); for(let i=n-1;i>=0;i--){ let t=b[i]; for(let j=i+1;j<n;j++) t-=A[i][j]*x[j]; x[i]=t/(A[i][i]||1e-12); } return x; }
/* giocatore con p.a (22) → formato S1: p.s, p.w, p.g, p.nd, p.pf; toglie p.a e gli scarti di p.e (resta p.e.pot) */
function s1FromA(p){
  if(p.pf==null){ const l=PROFILES[p.r]||[]; let i=l.findIndex(x=>x[0]===p.prof2); if(i<0) i=Math.floor(hashU(String(p.id),17)*l.length); p.pf=i; }
  if(p.nd==null) p.nd=1+Math.floor(hashU(String(p.id),29)*365);
  const h=p.h||180, f=skFit(p.a, p.r, h, p.age, skImpronta(String(p.id), p.r, skProf(p)[1])), x=f.x, r1=v=>Math.round(v*10)/10;
  p.s={R:r1(x[0]),CP:r1(x[1]),DT:r1(x[2]),LG:r1(x[3]),CO:r1(x[4]),PA:r1(x[5])}; p.w=r1(x[6]); p.g=r1(x[7]); p.h=h;
  delete p.a; delete p.prof2;
  const pot=p.e&&p.e.pot; p.e={}; if(pot!=null) p.e.pot=Math.round(pot*1000)/1000;
  return f;
}
/* salvataggi vecchi (dopo migratePlayer): una volta sola */
function s1Migrate(p){ if(p.s || !p.a) return false; s1FromA(p); return true; }
/* nome del profilo (tipo di giocatore) */
function skProfName(p){ return skProf(p)[0]||'–'; }
/* fine stagione: peso e massa grassa cambiano solo con l'età (fino a M10b), deterministici */
function s1Invecchia(p){
  if(!p.s) return; const u=hashU(String(p.id)+'|'+p.age,41)-0.5;
  if(p.age<=21){ p.w=Math.round((p.w+0.6+u*0.4)*10)/10; }
  else if(p.age>30){ p.w=Math.round((p.w+0.3+u*0.4)*10)/10; p.g=Math.round(clamp(p.g+0.3+u*0.2,6,22)*10)/10; }
}
/* forchetta degli osservatori su una skill (0–100): scarto da hash, non salvato */
function skScarto(p, k){ return hashU(String(p.id)+'|'+k, 53)-0.5; }
/* crescita delle 6 allenabili in grow (engine.js): key = allenabili principali del ruolo (crescono come oggi gli attributi di ROLE_W),
   eta = fattore del calo dopo i 30 anni (negativo = ancora in crescita, come oggi visione, decisioni e posizione),
   k = da punti 1–20 a punti 0–100 nella crescita, kd nel calo. Tarato con tools/s1.js --crescita (curva ovr/età come nella 0.4.2.7) */
const SK_GROW={k:6.6, kd:4.7, key:{P:['PA','CO','LG'], D:['DT','LG','R'], C:['CP','LG','DT','R'], A:['CP','CO','R']}, eta:{R:1.6,CP:0.6,DT:-0.4,LG:-0.4,CO:0.6,PA:0.6}};
