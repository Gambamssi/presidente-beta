'use strict';
/* ================= MOTORE DI GIOCO ================= */
let G = null;

/* 22 attributi da 1 a 20: tecnici, mentali, fisici e del portiere. Altezza e piede sono a parte. */
const ATTR_GROUPS = [
  [t_("eng.tecnici"),  ['pas','ctr','dri','crs','tir','lun','tes','con','cpz']],
  [t_("eng.mentali"),  ['vis','dec','pos','fre','agg']],
  [t_("eng.fisici"),   ['vel','res','for','ele']],
  [t_("eng.portiere"), ['par','pre','usc','rin']]
];
const ATTR = ATTR_GROUPS.flatMap(g=>g[1]);
const GK_ATTR = ['par','pre','usc','rin'];
const ATTR_LABEL = {pas:t_("eng.passaggio"),ctr:t_("eng.primo_controllo"),dri:t_("eng.dribbling"),crs:t_("eng.cross"),tir:t_("eng.finalizzazione"),lun:t_("eng.tiro_da_fuori"),tes:t_("eng.colpo_di_testa"),con:t_("eng.contrasto"),cpz:t_("eng.calci_piazzati"),
  vis:t_("eng.visione"),dec:t_("eng.decisioni"),pos:t_("eng.posizionamento"),fre:t_("eng.freddezza"),agg:t_("eng.aggressivita"),vel:t_("eng.velocita"),res:t_("eng.resistenza"),for:t_("eng.forza"),ele:t_("eng.elevazione"),
  par:t_("eng.riflessi"),pre:t_("eng.presa"),usc:t_("eng.uscite"),rin:t_("eng.rinvio")};
const ATTR_HELP = {ctr:t_("eng.controllo_della_palla_appena"),crs:t_("eng.precisione_dei_cross"),tir:t_("eng.precisione_e_potenza_sotto"),lun:t_("eng.tiri_dalla_distanza"),cpz:t_("eng.punizioni_angoli_e_rigori"),
  dec:t_("eng.scegliere_la_giocata_giusta"),fre:t_("eng.lucidita_sotto_porta_e"),agg:t_("eng.voglia_di_contrastare_e"),for:t_("eng.duelli_fisici_e_protezione"),ele:t_("eng.salto_nei_duelli_aerei"),
  par:t_("eng.parate_sui_tiri"),pre:t_("eng.bloccare_la_palla_senza"),usc:t_("eng.uscite_su_cross_e"),rin:t_("eng.precisione_dei_rinvii")};
const ROLE_W = {
  P:{par:4,pre:2,usc:2,pos:2,rin:1,dec:0.5},
  D:{con:3,pos:3,tes:2,ele:1,for:1.5,vel:1,pas:1,dec:1,ctr:0.5},
  C:{pas:3,vis:2.5,ctr:2,dec:2,res:1.5,con:1,dri:1,lun:0.5,tir:0.5},
  A:{tir:3,fre:2,dri:2,vel:2,ctr:1.5,pos:1.5,tes:1,lun:0.5}
};
/* profili: danno a ogni giocatore un carattere tecnico riconoscibile */
const PROFILES = {
  P:[[t_("eng.portiere_completo"),{}],[t_("eng.para_tutto"),{par:2,pre:1,usc:-1,rin:-1}],[t_("eng.portiere_moderno"),{rin:2,usc:1,pas:1,pre:-1}],[t_("eng.dominatore_dell_area"),{usc:2,ele:1,pre:1,par:-1}]],
  D:[[t_("eng.stopper"),{con:2,for:2,agg:2,tes:1,pas:-1,vel:-1}],[t_("eng.difensore_moderno"),{pas:2,ctr:1,dec:1,vis:1,for:-1}],[t_("eng.terzino_di_spinta"),{vel:2,crs:2,res:1,tes:-2,ele:-1}],[t_("eng.torre"),{tes:2,ele:2,for:1,vel:-2,ctr:-1}],[t_("eng.difensore_di_posizione"),{pos:2,dec:2,agg:-1,vel:-1}]],
  C:[[t_("eng.regista"),{pas:2,vis:2,dec:1,con:-1,for:-1}],[t_("eng.mediano"),{con:2,agg:2,res:1,for:1,vis:-1,dri:-1}],[t_("eng.tuttocampista"),{res:2,vel:1,con:1}],[t_("eng.trequartista"),{vis:2,dri:2,lun:1,con:-2,agg:-1}],[t_("eng.esterno"),{vel:2,crs:2,dri:1,con:-1,tes:-1}],[t_("eng.tiratore"),{lun:2,cpz:2,tir:1,res:-1}]],
  A:[[t_("eng.bomber_d_area"),{tir:2,fre:2,pos:2,dri:-1,pas:-1}],[t_("eng.attaccante_rapido"),{vel:3,dri:1,tes:-1,for:-1}],[t_("eng.ariete"),{tes:2,ele:2,for:2,vel:-2,dri:-1}],[t_("eng.seconda_punta"),{pas:2,vis:2,dri:1,tes:-1}],[t_("eng.ala"),{dri:2,vel:2,crs:1,tes:-2}]]
};
const ROLE_NAME = {P:t_("eng.portiere"),D:t_("eng.difensore"),C:t_("eng.centrocampista"),A:t_("eng.attaccante")};
const COACH_MODS = ['4-4-2','4-3-3','4-2-3-1','3-5-2','4-5-1'];   /* fino alla 0.4.4.0 (scelta uniforme); dalla 0.4.5.0 i nuovi allenatori usano COACH_MODS_W */
/* v0.4.5.0 (R3b, decisione di Max del 7/11): moduli preferiti degli allenatori nuovi come la Serie A 2023/24 (Evivora-scambio 024). Scelta pesata
   con un solo rnd(), come pick(): il resto del mondo generato non si sposta. Gli allenatori dei salvataggi tengono il loro modulo */
const COACH_MODS_W = [['3-4-3',0.20],['4-2-3-1',0.20],['3-5-2',0.18],['4-3-3',0.16],['4-4-2',0.10],['4-5-1',0.06],['5-3-2',0.06],['5-4-1',0.04]];
function pickW(arr, R=rnd){ const u=R(); let c=0; for(const [v,w] of arr){ c+=w; if(u<c) return v; } return arr[arr.length-1][0]; }
const FIRST = ['Luca','Marco','Andrea','Matteo','Davide','Simone','Federico','Lorenzo','Alessandro','Riccardo','Tommaso','Gabriele','Edoardo','Nicolò','Pietro','Giacomo','Filippo','Daniele','Emanuele','Stefano','Michele','Samuele','Leonardo','Christian','Diego','Elia','Mattia','Jacopo','Ivan','Kevin','Omar','Yusuf','Mamadou','Ibrahim','Nikola','Luka','Tiago','Rafael','Ismael','Bruno'];
const LAST = ['Bertoli','Ferraresi','Gualtieri','Mancuso','Pellegatti','Rinaldelli','Castagnoli','Zanella','Morosini','Caputi','Belloni','Sartorello','Ferrucci','Lombardini','Testa','Bonvicini','Marangon','Pavan','Scarpa','Vianello','Toffolo','Bortolin','Zennaro','Gasparini','Carraro','Nardelli','Calò','Ruggeri','Spada','Fontanive','Callegaro','Dal Bello','Trevisan','Polesel','Furlan','Baldan','Cecchetto','Rizzato','Sambo','Diallo','Koné','Petrović','Mendes','Haddad','Novak','Okafor','Lindqvist','Moretto'];
const CLUBS = [
  {n:'Atletico Riviera',c:'#c8452f'},{n:'Sporting Borgofranco',c:'#2f6fc8'},{n:'Pro Valdastra',c:'#e0a526'},
  {n:'Virtus Pietraviva',c:'#7a3fb0'},{n:'US Monteserra',c:'#1f8f6a'},{n:'Real Castelbruno',c:'#8a5a2b'},{n:'FC Torre Alta',c:'#d0507a'}
];

const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
function makeRng(seed){ let s = seed|0; return function(){ s=(s+0x6D2B79F5)|0; let t=s; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }
function rnd(){ G.rs=(G.rs+0x6D2B79F5)|0; let t=G.rs; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }
const ri = (a,b,R=rnd)=>a+Math.floor(R()*(b-a+1));
const pick = (arr,R=rnd)=>arr[Math.floor(R()*arr.length)];
const gauss = (R=rnd)=>(R()+R()+R()+R()-2)*1.7;

/* valutazione 1–20: media pesata per ruolo dei 22 attributi; dalla 0.4.3.0 (S1) i 22 vengono dalle 57 (skOf, skill.js) più la correzione per ruolo SK_OVR */
function ovrA(a,r){ const w=ROLE_W[r]; let s=0,t=0; for(const k in w){ s+=(a[k]??10)*w[k]; t+=w[k]; } return s/t; }
function ovr(p){ return p.s ? ovrA(skOf(p).a,p.r)+SK_OVR[p.r] : ovrA(p.a,p.r); }

function mkPlayer(role, L, age, potBoost){
  const p = {id:G.nid++, fn:pick(FIRST), ln:pick(LAST), r:role, age, a:{}, mor:12, fat:0, min:0.5,
    prof:clamp(Math.round(12+gauss()*1.6),4,20), amb:clamp(Math.round(11+gauss()*1.8),3,20), tem:clamp(Math.round(9+gauss()*1.8),2,20),
    e:{}, apps:0, gl:0, rts:[], team:null};
  genAttrs(p, L, rnd);
  p.e.pot = rnd()-0.5;
  s1FromA(p);   /* v0.4.3.0 (S1): dai 22 generati come prima alle 6 allenabili + peso e massa grassa (adattamento, nessun rnd) */
  const cur = ovr(p);
  let boost;
  if(potBoost!=null) boost = potBoost;
  else if(age<=21) boost = rnd()<0.12 ? 4+rnd()*4 : 0.5+rnd()*3;
  else if(age<=24) boost = rnd()*2.2;
  else boost = 0;
  p.pot = Math.min(19.5, cur+boost);
  return p;
}
function genAttrs(p, L, R){
  const role=p.r, w=ROLE_W[role], prof=PROFILES[role][Math.floor(R()*PROFILES[role].length)];
  p.prof2=prof[0];
  const g=()=>(R()+R()+R()+R()-2)*1.7;
  for(const k of ATTR){
    let v;
    if(GK_ATTR.includes(k)) v = role==='P' ? L+(w[k]?1.2:0.5)+g()*1.2 : 1+R()*2.5;
    else if(role==='P') v = (k==='pos'||k==='dec'? L+0.8+g()*1.2 : k==='pas'||k==='ctr'||k==='ele'||k==='for'? L-2+g()*1.5 : L-4+g()*1.5);
    else v = w[k] ? L+1+g()*1.4 : L-2.5+g()*1.6;
    v += (prof[1][k]||0)*(0.7+R()*0.6);
    p.a[k] = Math.round(clamp(v,1,19.5)*10)/10;
    if(p.e[k]==null) p.e[k] = R()-0.5;
  }
  const hb={P:187,D:183,C:178,A:180}[role]+(prof[1].ele||0)*2+(prof[1].vel>=2?-3:0);
  p.h=Math.round(clamp(hb+g()*3.2,163,201));
  p.a.ele=Math.round(clamp(p.a.ele+(p.h-180)*0.12,1,19.5)*10)/10;
  const f=R(); p.foot = f<0.72?'D':f<0.94?'S':'A';
}
/* converte i giocatori creati con le versioni precedenti (10 attributi) */
function migratePlayer(p){
  if(p.s || (p.a.ctr!=null && p.h)) return;
  const R=makeRng(p.id*7919+13), old={...p.a};
  const prof=PROFILES[p.r][Math.floor(R()*PROFILES[p.r].length)]; p.prof2=prof[0];
  const near=(base,d)=>Math.round(clamp(base+d+(R()-0.5)*2.4,1,19.5)*10)/10;
  const A=p.a;
  A.ctr=near((old.dri+old.pas)/2,0); A.crs=near(old.pas,-0.5+(prof[1].crs||0)); A.lun=near(old.tir,-1+(prof[1].lun||0)); A.cpz=near((old.tir+old.pas)/2,-1.5+(prof[1].cpz||0));
  A.dec=near((old.vis+old.pos)/2,0); A.fre=near(old.tir,-0.5+(prof[1].fre||0)); A.agg=near(8+(p.tem-10)*0.4+(old.con-10)*0.3,0+(prof[1].agg||0));
  A.for=near((old.con+old.tes)/2,-0.5+(prof[1].for||0)); A.ele=near(old.tes,0+(prof[1].ele||0));
  if(p.r==='P'){ A.pre=near(old.par,-0.5); A.usc=near((old.par+old.pos)/2,-0.5); A.rin=near(old.pas+1,0); }
  else { A.pre=Math.round((1+R()*2.5)*10)/10; A.usc=Math.round((1+R()*2.5)*10)/10; A.rin=Math.round((1+R()*2.5)*10)/10; }
  for(const k of ATTR) if(p.e[k]==null) p.e[k]=R()-0.5;
  const hb={P:187,D:183,C:178,A:180}[p.r]; p.h=Math.round(clamp(hb+(old.tes-10)*1.2+(R()+R()+R()+R()-2)*4,163,201));
  const f=R(); p.foot=f<0.72?'D':f<0.94?'S':'A';
}
/* temperamento dell'allenatore: ricavato dal nome, per non alterare la generazione del campionato */
function hashU(s,k){ let h=2166136261^k; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return ((h>>>0)%10007)/10007; }
function coachTemper(c){ const g=(hashU(c.n,1)+hashU(c.n,2)+hashU(c.n,3)+hashU(c.n,4)-2)*1.73; return clamp(Math.round(10+g*3.5),2,20); }
function mkCoach(L){
  const c={n:pick(FIRST)+' '+pick(LAST), tat:clamp(Math.round(L+gauss()*1.5),3,20), all:clamp(Math.round(L+gauss()*1.5),3,20),
    gio:clamp(Math.round(10+gauss()*2.5),3,20), ges:clamp(Math.round(L+gauss()*1.5),3,20), mod:pickW(COACH_MODS_W), age:ri(38,64), squal:0};
  c.car=coachTemper(c); return coachMigrate(c);   /* v0.4.4.0 (R3a): stessi rnd() di prima, poi le 10 caratteristiche da hash */
}
/* ================= ALLENATORE A 10 CARATTERISTICHE (v0.4.4.0, R3a) =================
   Specifica: docs/proposte/EVIVORA_ALLENATORE_GIOCO_DI_SQUADRA_PER_CLAUDE.md; decisioni di Max (6/11, 12 risposte «A») e formule in docs/PROGRESSI_R3a.md.
   Si salvano: c.k = 10 caratteristiche 0–100 (CO_K), c.all e c.gio 0–100 (fuori dal campo, fino a M10b/M10), t.coll = 5 valori collettivi
   0–100 (CO_COLL), p.jt/p.jn (squadra e giornata d'arrivo, per l'inserimento dei nuovi). Il morale (c.mor, 1–20) cambia solo l'efficacia
   temporanea (coachEff), mai i valori salvati. I bonus valgono solo in partita (coachBonus → matchInput) e non toccano le 57 dei giocatori. */
const CO_K=['COM','LSQ','ANA','ITA','LGA','RAP','ADA','LEA','GES','CAR'];
const CO_9=CO_K.slice(0,9);
const CO_COLL=['INT','AFF','FAM','AUT','CIC'];
/* pesi 9 → 5 (righe con somma 1) */
const CO_W={INT:{COM:0.25,LSQ:0.35,ITA:0.10,LEA:0.10,GES:0.20}, AFF:{COM:0.20,LSQ:0.10,LEA:0.35,GES:0.35}, FAM:{COM:0.25,LSQ:0.20,ITA:0.40,ADA:0.15},
  AUT:{COM:0.20,LSQ:0.25,ITA:0.35,LEA:0.10,GES:0.10}, CIC:{COM:0.45,ANA:0.10,LGA:0.15,RAP:0.10,LEA:0.20}};
/* valori collettivi → skill dei giocatori: bonus massimo e skill interessate (14 distinte, massimo +20 per skill) */
const CO_BON={INT:{max:20,sk:['PC','SM']}, AFF:{max:15,sk:['CL','DE','CO','LE']}, FAM:{max:20,sk:['DT','LG','OF','DF']}, AUT:{max:20,sk:['MA','AN','IN','SM']}, CIC:{max:15,sk:['DM','CL','CO','AN']}};
const CO_SK=['PC','SM','CL','DE','CO','LE','DT','LG','OF','DF','MA','AN','IN','DM'];
/* parametri: kappa = coefficiente unico dei massimi (taratura, domanda 2A); evo = avvicinamento al potenziale a giornata;
   cambio di allenatore (FAM ×0,5, ×0,85 con lo stesso modulo; CIC ×0,6); modulo diverso dal preferito FAM ×0,9 (×0,7 nella proposta: con multi.js creava dinastie, vedi PROGRESSI_R3a); inserimento in 6 giornate;
   squalifica: bonus al 50% e CIC a zero; morale: efficacia da 1−morDn a 1+morUp, Carattere +carDn con morale minimo, −carUp con morale massimo */
const CO_PAR={kappa:1, evo:0.12, famNew:0.5, famSame:0.85, cicNew:0.6, famMod:0.9, ins:6, squal:0.5, cap:20, morUp:0.08, morDn:0.20, carDn:25, carUp:5, sp:12, tal:15, talP:0.10};
const coG=(key,j)=>(hashU(key,j)+hashU(key,j+1)+hashU(key,j+2)+hashU(key,j+3)-2)*1.73;
const coS=x=>(x-1)/0.19;
const co20=x=>1+0.19*x;
/* da 5 valori su 1–20 (tat, all, gio, ges, car) a 10 su 0–100 con un hash del nome e dell'età: mai rnd(), così la generazione del campionato
   resta identica. Differenze più ampie di prima (domanda 5A): ±12 di hash per caratteristica e, per il 10% degli allenatori, un talento (+15) */
function coachMigrate(c){
  if(!c || c.k) return c;
  const key=c.n+'|'+c.age, g=j=>coG(key,10+j*4), N=(j,sd)=>50+sd*g(j);
  const tat=c.tat??10, ges=c.ges??10, car=c.car??coachTemper(c), T=coS(tat), Gs=coS(ges);
  const b={COM:0.4*Gs+0.6*N(7,18), LSQ:0.5*Gs+0.3*T+0.2*N(5,25), ANA:0.7*T+0.3*N(1,25), ITA:T, LGA:0.6*T+0.2*Gs+0.2*N(4,25),
    RAP:0.5*T+0.5*N(3,25), ADA:0.4*T+0.6*N(2,25), LEA:0.5*Gs+0.5*N(6,25), GES:Gs};
  const tal=hashU(key+'#tal',1)<CO_PAR.talP?CO_PAR.tal:0, k={};
  CO_9.forEach((s,i)=>{ k[s]=clamp(Math.round(b[s]+CO_PAR.sp*g(20+i)+tal),0,100); });
  k.CAR=clamp(Math.round(coS(car)),0,100);
  c.k=k; c.all=clamp(Math.round(coS(c.all??10)),0,100); c.gio=clamp(Math.round(coS(c.gio??10)),0,100);
  delete c.tat; delete c.ges; delete c.car; return c;
}
/* valutazione dell'allenatore: media delle 9 caratteristiche professionali (Carattere escluso: è un temperamento) */
function coachRating(c){ let s=0; for(const k of CO_9) s+=c.k[k]; return s/9; }
/* morale (1–20, 12 neutro) → m da −1 a 1, come moraleBoost */
function coachMorM(c){ return clamp(((c.mor??12)-12)/8,-1,1); }
/* efficacia temporanea: e moltiplica le 9 (da 0,80 a 1,08); Carattere sale con il morale basso (più nervoso), scende un po' con quello alto */
function coachEff(c){ const m=coachMorM(c), e=m>=0?1+CO_PAR.morUp*m:1+CO_PAR.morDn*m, o={e};
  for(const s of CO_9) o[s]=Math.min(100,Math.round(c.k[s]*e));
  o.CAR=clamp(Math.round(c.k.CAR+CO_PAR.carDn*Math.max(0,-m)-CO_PAR.carUp*Math.max(0,m)),0,100); return o; }
/* potenziale dei 5 valori collettivi dalle caratteristiche di base (il morale non consuma il lavoro fatto) */
function coachPot(c){ const o={}; for(const v of CO_COLL){ let s=0; const w=CO_W[v]; for(const k in w) s+=w[k]*c.k[k]; o[v]=Math.round(s*10)/10; } return o; }
function collOf(t){ if(!t.coll) t.coll=coachPot(t.coach); return t.coll; }
/* a ogni giornata i valori si avvicinano al potenziale dell'allenatore */
function collEvolve(t){ const P=coachPot(t.coach), V=collOf(t); for(const v of CO_COLL) V[v]=Math.round((V[v]+(P[v]-V[v])*CO_PAR.evo)*10)/10; }
/* cambio di allenatore: Intesa, Affiatamento e Automatismi restano (sono tra i giocatori); la Familiarità con il modulo e la Comunicazione in campo calano */
function collNewCoach(t, oldC, newC){ const V=collOf(t); V.FAM=Math.round(V.FAM*(oldC&&oldC.mod===newC.mod?CO_PAR.famSame:CO_PAR.famNew)*10)/10; V.CIC=Math.round(V.CIC*CO_PAR.cicNew*10)/10; }
/* indice assoluto della giornata e giornate passate in squadra (per l'inserimento dei nuovi arrivati) */
const coDay=()=>(G.season-1)*Math.max(1,(G.sched||[]).length||14)+G.md;
/* arrivi: p.jt = squadra in cui è stato visto l'ultima volta; se cambia, p.jn = giornata d'arrivo. Al primo controllo (partita nuova o
   salvataggio di prima della 0.4.4.0, G.coV assente) tutti sono «in squadra da sempre». p.jn si toglie quando l'inserimento è finito */
function coachSync(){ const d=coDay(), first=!G.coV;
  for(const t of G.T) for(const id of t.pl){ const p=G.P[id]; if(!p) continue;
    if(p.jt!==t.id){ if(!first) p.jn=d; else delete p.jn; p.jt=t.id; }
    else if(p.jn!=null && d-p.jn>=CO_PAR.ins) delete p.jn; }
  G.coV=1; }
function coIns(p){ return p.jn==null ? 1 : clamp((coDay()-p.jn)/CO_PAR.ins,0,1); }
/* bonus di squadra per le 14 skill: parziali per valore collettivo (con morale e opzioni), poi somma limitata a +20 per skill.
   o: {fam: fattore della Familiarità (0,7 con un altro modulo), ins: inserimento (Intesa, Automatismi, Comunicazione in campo), sq: squalificato} */
function coachBonus(t, o){
  o=o||{}; const c=t.coach, V=collOf(t), e=coachEff(c).e, K=CO_PAR.kappa, ins=o.ins??1, out={};
  for(const s of CO_SK) out[s]=0;
  for(const v of CO_COLL){ let f=V[v]/100*CO_BON[v].max*K*e;
    if(v==='FAM') f*=o.fam??1; if(v==='INT'||v==='AUT'||v==='CIC') f*=ins; if(o.sq){ f*= v==='CIC'?0:CO_PAR.squal; }
    for(const s of CO_BON[v].sk) out[s]+=f; }
  for(const s of CO_SK) out[s]=Math.min(CO_PAR.cap*K, out[s]);
  return out;
}
/* bonus medio della lega per skill (domanda 3A): conta il divario, così un allenatore medio vale zero e uno scarso è negativo */
function coachLeagueBonus(){ const out={}; for(const s of CO_SK) out[s]=0; const ts=G.T.filter(t=>t.coach&&t.coach.k); if(!ts.length) return out;
  for(const t of ts){ const b=coachBonus(t); for(const s of CO_SK) out[s]+=b[s]/ts.length; } return out; }
/* equivalenti 1–20 per le decisioni di oggi (planMatch, coachThink, protesta; fino a R3b) dai valori efficaci */
function coachEq(c){ const x=coachEff(c); return {tat:Math.round(co20(0.5*x.ITA+0.3*x.ANA+0.2*x.ADA)*10)/10, ges:Math.round(co20(0.5*x.LSQ+0.25*x.LGA+0.25*x.RAP)*10)/10, car:Math.round(co20(x.CAR)*10)/10, x}; }
/* costo di un allenatore (ingaggio, più la buonuscita in hireCoach): cresce più che in proporzione con la valutazione */
function coachCost(c){ return Math.round(200000*Math.pow(Math.max(5,coachRating(c))/45,1.6)/1000)*1000; }
/* salvataggi e partita nuova: 10 caratteristiche, valori collettivi, arrivi in squadra */
function coachEnsure(){ (G.T||[]).forEach(t=>{ if(t.coach){ coachMigrate(t.coach); t.coach.squal=t.coach.squal||0; collOf(t); } }); (G.cands||[]).forEach(coachMigrate); coachSync(); }
/* terne arbitrali: arbitro e due assistenti, con le caratteristiche della terna */
function mkRefTrio(i){
  const nm=()=>pick(FIRST)+' '+pick(LAST);
  const esp=clamp(Math.round(10+gauss()*3),3,20);
  return {id:i, n:nm(), a1:nm(), a2:nm(), esp, car:clamp(Math.round(10+gauss()*3),3,20), fis:clamp(Math.round(10+gauss()*3),3,20),
    err:clamp(Math.round(10+gauss()*2.5-(esp-10)*0.35),3,20), age:clamp(Math.round(30+esp*0.9+gauss()*2),26,45), g:0, vs:0, er:0, yc:0, rc:0, pen:0};
}
function ensureRefs(){
  const need=Math.floor(G.T.length/2);
  if(!G.refs) G.refs=[]; while(G.refs.length<need) G.refs.push(mkRefTrio(G.refs.length));
  G.T.forEach(t=>ensureCaptains(t,true));
  coachEnsure();   /* v0.4.4.0 (R3a): prima qui si aggiungeva solo il temperamento */
}
/* capitano e vice: carisma = professionalità, anzianità, qualità; scelti dall'allenatore */
function capScore(p){ return p.prof*0.45+Math.min(Math.max(p.age-19,0),12)*0.35+ovr(p)*0.45+(p.r==='A'?-0.4:0)+(p.apps||0)*0.01; }
function capOrder(t){ return teamPlayers(t).filter(p=>!p.retired).sort((a,b)=>capScore(b)-capScore(a)).map(p=>p.id); }
function ensureCaptains(t, quiet){
  const has=id=>id!=null && t.pl.includes(id);
  if(has(t.cap) && has(t.vcap) && t.cap!==t.vcap) return;
  const ord=capOrder(t); const old=t.cap;
  if(!has(t.cap)) t.cap = has(t.vcap) ? t.vcap : ord[0];
  if(!has(t.vcap) || t.vcap===t.cap) t.vcap = ord.find(id=>id!==t.cap);
  if(!quiet && t.id===0 && G.P[t.cap] && old!=null && old!==t.cap) news(t_("eng.e_il_nuovo_capitano",{fn:G.P[t.cap].fn,ln:G.P[t.cap].ln,ln2:G.P[t.vcap].ln}),'club',false,t.id);
}
function refInput(r){ return {id:r.id, n:r.n.split(' ').slice(-1)[0], full:r.n, esp:r.esp, car:r.car, fis:r.fis, err:r.err}; }
function value(p){ const o=ovr(p); const af=p.age<=20?1.35:p.age<=23?1.2:p.age<=28?1:p.age<=31?0.7:0.4; return Math.round(Math.pow(o,2.5)*af)*1000; }
function wage(p){ return Math.max(300, Math.round(value(p)*0.005/100)*100); }

function mkSquad(team, L){
  const plan = [['P',2],['D',5],['C',5],['A',4]];
  for(const [r,n] of plan) for(let i=0;i<n;i++){
    const age = clamp(Math.round(26+gauss()*2.4),17,34);
    addToTeam(team, mkPlayer(r, L+gauss()*0.5, age));
  }
  if(rnd()<0.85){ const r=pick(['D','C','C','A','A']); addToTeam(team, mkPlayer(r, L-2.2, ri(16,18), 6.5+rnd()*3.5)); }
}
function addToTeam(team,p){ p.team=team.id; p.wg=wage(p); p.ct=ri(1,3); team.pl.push(p.id); G.P[p.id]=p; }
function teamPlayers(t){ return t.pl.map(id=>G.P[id]); }

function newGame(clubName, seed){
  G = {v:2, rep:50, seed, rs:seed, nid:1, P:{}, T:[], season:1, md:0, sched:[], res:[], last:null, obs:{}, seen:{}, note:{}, news:[], scoutLeft:3, user:0, cands:null, albo:[], prs:[mkPres()]};
  const levels = [9.6, 11.0, 10.5, 10.1, 9.4, 9.0, 8.6, 8.2];
  const names = [{n:clubName||t_("eng.fc_presidente"), c:'#d9d2bf'}, ...CLUBS];
  names.forEach((cl,i)=>{
    const t = {id:i, n:cl.n, c:cl.c, pl:[], coach:mkCoach(levels[i]), cash:i===0?700000:550000, pop:40+ri(0,20), fac:{st:1,cs:1,sg:1}, own:{bank:0}, build:null,
      tab:{g:0,v:0,n:0,p:0,gf:0,gs:0,pt:0}, form:[]};
    G.T.push(t);
    mkSquad(t, levels[i]);
  });
  G.FA = [];
  for(let i=0;i<14;i++){
    const r = pick(['P','D','D','C','C','A','A']); const young = rnd()<0.55;
    const p = mkPlayer(r, young?7.2+rnd():8+rnd()*1.5, young?ri(17,20):ri(29,34));
    p.team = null; p.wg = wage(p); p.ct = 0; G.P[p.id]=p; G.FA.push(p.id);
  }
  G.sched = schedule(8);
  ensureRefs();
  G.T.forEach(t=>ensureBudget(t));
  news(t_("eng.benvenuto_presidente_il_tuo",{n:G.T[0].coach.n}),'club',false,0);
  return G;
}
/* notizia: k = tipo (match, market, club, coach, player), pub = pubblica (Lega › Notizie) o privata (Scrivania),
   club = indice del club a cui si riferisce (0.4.1.0). Le notizie dei salvataggi vecchi non hanno pub: le classifica isPublicNews dal testo. */
function news(t,k,pub,club){ const n={t, k, md:G.md, s:G.season}; if(pub!=null) n.pub=!!pub; if(club!=null) n.club=club; G.news.unshift(n); if(G.news.length>60) G.news.length=60; }

function schedule(n){
  const ids=[...Array(n).keys()]; const rounds=[];
  for(let r=0;r<n-1;r++){
    const m=[]; for(let i=0;i<n/2;i++){ const a=ids[i], b=ids[n-1-i]; m.push(r%2? [b,a]:[a,b]); }
    rounds.push(m); ids.splice(1,0,ids.pop());
  }
  return rounds.concat(rounds.map(m=>m.map(([a,b])=>[b,a])));
}

function flashP(p){ const o=ovr(p); let f=0.035; if(p.age<=22) f += 0.26*clamp((p.pot-o)/6,0,1)*clamp((p.pot-9)/7,0,1); return f; }

/* ---------- crescita, morale, fatica ---------- */
function grow(p, t){
  const o=ovr(p);
  const c = p.age<=19?0.17: p.age<=21?0.13: p.age<=24?0.07: p.age<=28?0.03: p.age<=30?0: -0.04;
  const gap = clamp((p.pot-o)/4,0,1.5);
  const q = t ? 0.85+0.08*(t.fac.cs-1)+(co20(t.coach.all)-10)*0.015 : 0.7;   /* v0.4.4.0: Allenamento su 0–100 */
  const pr = 0.7+p.prof/40, m = 0.6+0.6*p.min, S=p.s, key=SK_GROW.key[p.r];
  /* v0.4.3.0 (S1): crescono solo le 6 allenabili (PA solo i portieri); le derivate seguono dalle formule, che aggiungono anche il calo per età */
  for(const k of SK_ALL){
    if(k==='PA' && p.r!=='P') continue;
    let d = c>=0 ? c*gap*q*pr*m*(key.includes(k)? 0.6+0.8*rnd() : 0.25*rnd()) : c*SK_GROW.eta[k]*(0.5+rnd());
    d += (rnd()-0.5)*0.05;
    S[k] = Math.round(clamp(S[k]+d*(c>=0?SK_GROW.k:SK_GROW.kd),0,100)*100)/100;
  }
}

function forfeit(inp,exH,exA){ const gh=exH?0:3, ga=exA?0:3;
  return {gh:exH&&exA?0:gh, ga:exH&&exA?0:ga, forfeit:true, ev:[], rt:{}, played:[[],[]], mins:{}, endSt:{}, inj:{}, red:[], scorers:[], poss:50, stats:[0,1].map(()=>({sh:0,sot:0,cor:0,fou:0,yc:0,rc:0,off:0,pa:0,pc:0,xg:0})), plans:[], nT:0, htTick:0, ref:{voto:6,errs:[]}, coachOff:[false,false], coachRt:[null,null]}; }
function playMatchday(){
  if(G.md>=G.sched.length) return null;
  const fx = G.sched[G.md]; const out=[];
  G.T.forEach(t=>ensureBudget(t,true));
  for(const t of G.T) teamPlayers(t).forEach(p=>{ p.fat=Math.max(0,(p.fat||0)-25); });
  ensureRefs(); G.T.forEach(t=>ensureCaptains(t,false));
  /* ogni giornata le terne vengono assegnate alle partite (in futuro: le più esperte alle categorie superiori) */
  const order=G.refs.map(r=>r.id).sort(()=>rnd()-0.5);
  fx.forEach(([h,a],k)=>{
    const H=G.T[h], A=G.T[a]; const seed=(G.seed*31+G.season*1000+G.md*10+h)|0;
    const RT=G.refs[order[k%order.length]];
    const inp={t:[matchInput(H),matchInput(A)], ref:refInput(RT)};
    const exH=finInit(H).excluded, exA=finInit(A).excluded;
    const m = (exH||exA) ? forfeit(inp,exH,exA) : simMatch(inp, seed, false);
    m.h=h; m.a=a; m.seed=seed; m.inp=inp; m.refId=RT.id; out.push(m);
    applyResult(H,A,m);
    RT.g++; RT.vs+=m.ref.voto; RT.er+=m.ref.errs.length; RT.yc+=m.stats[0].yc+m.stats[1].yc; RT.rc+=m.stats[0].rc+m.stats[1].rc; RT.pen+=m.ev.filter(x=>x.type==='pen').length;
    [H,A].forEach((t,side)=>{ const c=t.coach; if(c.squal>0 && inp.t[side].coach.absent) c.squal--; if(m.coachOff[side]){ c.squal=1; news(t_("eng.e_stato_allontanato_dall",{n:c.n,n2:t.n,n3:RT.n}), t.id===0?'club':'match',true,t.id); } });
  });
  for(const t of G.T){
    const pl=teamPlayers(t);
    const m = out.find(x=>x.h===t.id||x.a===t.id), side=m.h===t.id?0:1;
    const played=new Set(m.played[side]);
    updMorale(t,m,side); collEvolve(t);   /* v0.4.4.0 (R3a): valori collettivi verso il potenziale dell'allenatore */
    for(const p of pl){
      const mins=m.mins[p.id]||0;
      p.min = 0.7*(p.min??0.5) + 0.3*Math.min(1,mins/90);
      if(played.has(p.id)) p.fat = clamp((100-(m.endSt[p.id]??80))*0.8,0,60);
      if(p.inj>0 && !(m.inj[p.id])) p.inj--;
      if(p.sq>0 && !m.red.includes(p.id) && !played.has(p.id)) p.sq--;
      grow(p,t);
    }
    roundFinance(t,m,m.h===t.id);
    if(t.build){ t.build.left--; if(t.build.left<=0){ t.fac[t.build.k]=facLevel(t,t.build.k)+1; if(t.id===0) news(({st:t_("eng.lo_stadio"),cs:t_("eng.il_centro_sportivo"),sg:t_("eng.il_settore_giovanile")})[t.build.k]+` ${t_("eng.e_salito_al_livello",{v:t.fac[t.build.k]})}`,'club',false,t.id); t.build=null; } }
    pledgeSweep(t);
  }
  G.FA.forEach(id=>grow(G.P[id],null));
  G.res.push(out.map(m=>({h:m.h,a:m.a,gh:m.gh,ga:m.ga})));
  G.last = out; G.md++; G.scoutLeft=3;
  { const k=CHECKS.indexOf(G.md); if(k>=0) G.T.forEach(t=>wageCheck(t,k)); }
  G.T.forEach(t=>{ if(t.id!==0) botFinance(t); });
  afterRound(out);
  if(G.md===7) G.T.forEach(t=>budReview(t));
  G.T.forEach(t=>ultCheck(t)); firePending();
  const um = out.find(m=>m.h===0||m.a===0);
  const home = um.h===0; const ug=home?um.gh:um.ga, og=home?um.ga:um.gh; const opp=G.T[home?um.a:um.h];
  news(t_("eng.giornata",{md:G.md,v:home?G.T[0].n+' – '+opp.n:opp.n+' – '+G.T[0].n,gh:um.gh,ga:um.ga,v2:ug>og?t_("eng.vittoria"):ug<og?t_("eng.sconfitta"):t_("eng.pareggio")}),'match',true,0);
  coachTalk();
  botMarket();
  return out;
}
function avgTop(pl){ const o=pl.map(ovr).sort((a,b)=>b-a).slice(0,11); return o.reduce((a,b)=>a+b,0)/Math.max(1,o.length); }

function applyResult(H,A,m){
  const upd=(t,gf,gs)=>{ const r=t.tab; r.g++; r.gf+=gf; r.gs+=gs; if(gf>gs){r.v++;r.pt+=3;t.form.push('V');} else if(gf<gs){r.p++;t.form.push('P');} else {r.n++;r.pt+=1;t.form.push('N');} if(t.form.length>5) t.form.shift(); };
  upd(H,m.gh,m.ga); upd(A,m.ga,m.gh);
  const pos = standings().findIndex(t=>t.id===H.id);
  const cap = 4000+3000*(H.fac.st-1);
  const fill_ = clamp(0.45 + H.pop/250 + (7-pos)*0.03, 0.3, 1);
  m.att = Math.round(cap*fill_); m.inc = m.att*14;
  const res = Math.sign(m.gh-m.ga);
  [[m.played[0],res,H],[m.played[1],-res,A]].forEach(([lu,s,T])=>lu.forEach(id=>{ const p=G.P[id]; if(!p) return; p.apps++; p.rts.push(m.rt[id]); if(p.rts.length>6) p.rts.shift(); statApp(p,T.id,m.rt[id]);
    if(m.inj[id]){ p.inj=m.inj[id]; if(T.id===0) news(t_("eng.si_e_infortunato_stara",{fn:p.fn,ln:p.ln,inj:p.inj,v:p.inj>1?'giornate':'giornata'}),'player',false,T.id); }
    if(m.red.includes(id)){ p.sq=1; if(T.id===0) news(t_("eng.e_stato_espulso_saltera",{fn:p.fn,ln:p.ln}),'player',false,T.id); } }));
  m.scorers.forEach(s=>{ const p=G.P[s.pid]; p.gl++; statGoal(p); });
  H.pop = clamp(H.pop + res*1.2,10,100); A.pop = clamp(A.pop - res*1.2,10,100);
}

/* ====================== ECONOMIA DEL CLUB ======================
   Entrate e uscite per giornata, prestiti, stipendi con le scadenze di controllo e le penalizzazioni
   come in Serie A (adattate a 14 giornate): controlli dopo le giornate 4, 7, 10 e 13, più la fine stagione. */
const CHECKS=[4,7,10,13];
const CHECK_LBL=[t_("eng.1_controllo_come_il"),t_("eng.2_controllo_come_il"),t_("eng.3_controllo_come_il"),t_("eng.4_controllo_come_il"),t_("eng.fine_stagione_come_il")];
function finInit(t){ if(!t.fin) t.fin={arr:[], loans:[], pen:0, penNext:0, sea:{inc:{},exp:{}}, led:[], checks:[], hist:[], excluded:false, homeInc:[]};
  const f=t.fin; if(f.ins==null){ f.ins=0; f.insN=0; f.esc=0; f.breach=0; f.budH=[]; f.valH=[]; f.lid=0;
    f.loans.forEach(l=>{ if(l.pr==null){ l.id=++f.lid; l.apr=8; l.n=14; l.pr=Math.round(l.rate*l.left/1.04); l.peg='none'; l.pids=[]; l.fac=[]; } }); }
  if(!t.own) t.own={bank:0}; if(t.fac && t.fac.sg==null) t.fac.sg=1; return f; }
function periodOf(md){ const k=CHECKS.findIndex(c=>md<=c); return k<0?4:k; }
function earn(t,cat,a){ if(!a) return; finInit(t); t.cash+=a; const s=t.fin.sea.inc; s[cat]=(s[cat]||0)+a; if(t._r) t._r.inc[cat]=(t._r.inc[cat]||0)+a; }
function spend(t,cat,a){ if(!a) return; finInit(t); t.cash-=a; const s=t.fin.sea.exp; s[cat]=(s[cat]||0)+a; if(t._r) t._r.exp[cat]=(t._r.exp[cat]||0)+a; }
function wageBill(t){ return teamPlayers(t).reduce((s,p)=>s+p.wg,0); }
function staffCost(t){ return 2500+(t.fac.st+t.fac.cs+(t.fac.sg||1)-3)*600; }
/* sponsor della giornata; t.spB=[stagione, quota] è l'aumento dei premi di fine stagione (0.4.1.0): vale solo nella stagione indicata */
function sponsorInc(t){ const b=12000+Math.round(t.pop*120); return t.spB&&t.spB[0]===G.season? Math.round(b*(1+t.spB[1])) : b; }
const TV_INC=6000;
function arrears(t){ return finInit(t).arr.reduce((s,a)=>s+a.amt,0); }
/* entrata media prevista per giornata: sponsor + TV + metà della media degli incassi in casa */
function roundIncome(t){ const f=finInit(t), h=f.homeInc.length? f.homeInc.reduce((a,b)=>a+b,0)/f.homeInc.length : 4000*0.6*14*(0.8+t.pop/200); return sponsorInc(t)+TV_INC+h/2; }
function wageRatio(t){ return (wageBill(t)+staffCost(t))/Math.max(1,roundIncome(t)); }
function ratioLevel(r){ return r<0.7?'verde':r<0.85?'giallo':'rosso'; }
function loanLimit(t){ const L=bankLimits(t,28); return Math.max(L.none,L.str,L.car); }
/* stipendi: prima si saldano gli arretrati (dal più vecchio), poi la giornata; quello che non si riesce a pagare diventa arretrato */
function payWages(t,due,period){
  const f=finInit(t);
  for(const a of f.arr){ if(t.cash<=0) break; const x=Math.min(a.amt,t.cash); a.amt-=x; spend(t,'stipendi',x); }
  f.arr=f.arr.filter(a=>a.amt>0.5);
  const x=Math.max(0,Math.min(due,t.cash)); spend(t,'stipendi',x);
  if(due-x>0.5){ const a=f.arr.find(z=>z.p===period&&z.s===G.season); if(a) a.amt+=due-x; else f.arr.push({p:period,s:G.season,amt:due-x}); return false; }
  return true;
}
function roundFinance(t,m,home){
  const f=finInit(t); t._r={inc:{},exp:{}};
  if(home && m && m.inc){ earn(t,'stadio',m.inc); f.homeInc.push(m.inc); if(f.homeInc.length>4) f.homeInc.shift(); }
  earn(t,'sponsor',sponsorInc(t)); earn(t,'diritti TV',TV_INC);
  spend(t,'staff e strutture',staffCost(t));
  if(t.cash<0) spend(t,'interessi',Math.round(-t.cash*0.015));
  const ok=payWages(t,wageBill(t),periodOf(G.md+1));
  bankRound(t);
  if(!ok){ const pl=teamPlayers(t); pl.forEach(p=>{ p.mor=clamp(p.mor-0.6,1,20); }); if(t.id===0) news(t_("eng.cassa_vuota_questa_giornata",{arrears:kcrE(arrears(t))}),'club',false,t.id); }
  f.led.unshift({s:G.season,md:G.md+1,...t._r}); if(f.led.length>14) f.led.length=14; t._r=null;
}
const kcrE=n=>(n<0?'−':'')+Math.round(Math.abs(n)/1000)+'k';
/* controllo stipendi (dopo le giornate 4, 7, 10, 13 e a fine stagione) */
function wageCheck(t,k){
  const f=finInit(t); if(f.excluded) return;
  const unp=[...new Set(f.arr.filter(a=>a.s===G.season && a.p<=k && a.amt>0.5).map(a=>a.p))].sort();
  if(!unp.length){ f.checks.push({s:G.season,k,ok:true,pts:0}); return; }
  let pts=(unp.includes(k)?2:0)+2*unp.filter(p=>p<k).length; if(!pts) pts=2;
  const lbl=CHECK_LBL[k];
  if(k===2 && unp.includes(2) && unp.some(p=>p<2)){ f.checks.push({s:G.season,k,ok:false,pts:0,excl:true}); exclude(t); return; }
  if(k>=3){ f.penNext+=pts; } else f.pen+=pts;
  f.checks.push({s:G.season,k,ok:false,pts,next:k>=3}); if(t.id===0) repAdd(-3,t_("eng.stipendi_non_pagati_al"));
  teamPlayers(t).forEach(p=>{ p.mor=clamp(p.mor-1.2,1,20); addCause(p,t_("eng.stipendi_non_pagati"),-1.2); }); t.coach.mor=clamp((t.coach.mor??12)-1,1,20);
  news(t_("eng.stipendi_non_in_regola",{n:t.n,lbl:lbl,pts:pts,v:k>=3?t_("eng.da_scontare_la_prossima"):''}), t.id===0?'club':'match',true,t.id);
}
function exclude(t){
  const f=finInit(t); f.excluded=true; if(t.id===0) repAdd(-10,t_("eng.squadra_esclusa_dal_campionato"));
  news(t_("eng.escluso_dal_campionato_stipendi",{n:t.n}), t.id===0?'club':'match',true,t.id);
}
function teamPts(t){ return t.tab.pt-(t.fin?t.fin.pen:0); }
/* presidente del computer: tiene i conti in ordine come può */
function botFinance(t){
  const f=finInit(t); if(f.excluded) return;
  const need=wageBill(t)*2+staffCost(t)*2;
  botBank(t);
  if(arrears(t)>0 || (t.cash<wageBill(t) && wageRatio(t)>0.9)){
    const pl=teamPlayers(t).sort((a,b)=>(a.peg?1:0)-(b.peg?1:0)||b.wg-a.wg); const p=pl[0]; if(!p || pl.length<=15 || p.peg) return;
    const buyers=G.T.filter(b=>b.id!==t.id && b.id!==0 && !finInit(b).excluded && b.cash>value(p)*0.9 && b.pl.length<22 && wageRatio(b)<0.8);
    const amt=Math.round(value(p)*0.85/1000)*1000; t.pl=t.pl.filter(x=>x!==p.id);
    if(buyers.length){ const b=buyers.sort((x,y)=>y.cash-x.cash)[0]; budVary(b,'acquisti',amt); spend(b,'acquisti',amt); b.pl.push(p.id); p.team=b.id; p.ct=ri(2,3); news(t_("eng.in_difficolta_con_i",{n:t.n,fn:p.fn,ln:p.ln,n2:b.n,amt:kcrE(amt)}),'market',true,t.id); }
    else { p.team=null; p.abroad=true; news(t_("eng.in_difficolta_con_i_2",{n:t.n,fn:p.fn,ln:p.ln,amt:kcrE(amt)}),'market',true,t.id); }
    earn(t,'cessioni',amt); onSold(t,p,amt); ensureCaptains(t,false);
  }
}


/* ====================== RICHIESTE AL PRESIDENTE ======================
   Chi vince chiede di più, chi è in difficoltà si accontenta: è il freno contro le squadre imbattibili. */
function successF(t){ const g=t.tab.g; const pos=standings().indexOf(t); const ppg=g?teamPts(t)/g:1.35;
  const prev=t.prevPos!=null?clamp((3.5-t.prevPos)/3.5,-1,1)*0.25:0;
  return clamp((g>=2?clamp((ppg-1.35)/1.1,-0.6,1)*0.55:0) + clamp((3.5-pos)/3.5,-1,1)*(g>=2?0.3:0.1) + prev, -0.6, 1); }
function avgRt(p){ const r=(p.rts||[]).filter(x=>x!=null).slice(-4); return r.length? r.reduce((a,b)=>a+b,0)/r.length : 6; }
function openReqs(t){ return (G.req||[]).filter(r=>r.team===t.id && r.st==='open'); }
function mkReq(t,kind,o){ G.req=G.req||[]; const r={id:(G.rid=(G.rid||0)+1), team:t.id, kind, md:G.md, s:G.season, due:G.md+2, st:'open', ...o}; G.req.push(r);
  if(G.req.length>160) G.req=G.req.filter(x=>x.st==='open'||x.s===G.season).slice(-160);
  if(t.id!==0) resolveReq(r, botChoice(t,r), true); else news(t_("eng.nuova_richiesta_nell_ufficio",{toLowerCase:REQ_KIND[kind].toLowerCase(),due:r.due+1}),'club',false,t.id); return r; }
const REQ_KIND={aumento:t_("eng.aumento_di_stipendio"), rinnovo:t_("eng.rinnovo_del_contratto"), premio:t_("eng.premio_partita"), obiettivo:t_("eng.premio_obiettivo"), rinforzo:t_("eng.richiesta_di_rinforzo"), offerta:t_("eng.offerta_per_un_giocatore")};
function genRequests(t){
  const f=finInit(t); if(f.excluded) return; const S=successF(t), pos=standings().indexOf(t), pl=teamPlayers(t), open=openReqs(t);
  const max = t.id===0 ? 2 : 3; let made=0; const room=()=>open.length+made<4 && made<max;
  /* 1. stipendi: rinnovo in scadenza o aumento per chi rende in una squadra che vince */
  for(const p of pl.sort((a,b)=>avgRt(b)-avgRt(a))){ if(!room()) break;
    if(open.some(r=>r.pid===p.id) || (p.reqS===G.season && G.md-(p.reqMd||0)<5)) continue;
    const ren=p.ct<=1 && G.md>=3 && p.reqS!==G.season, hot=avgRt(p)>=6.8 && S>0.15 && rnd()<0.06+0.12*S;
    if(!ren && !hot) continue;
    const r=clamp(0.06+0.32*Math.max(S,-0.3)+(avgRt(p)-6.2)*0.12+(p.amb-11)*0.015,0.03,0.65), nw=Math.round(p.wg*(1+r)/100)*100;
    p.reqS=G.season; p.reqMd=G.md;
    mkReq(t, ren?'rinnovo':'aumento', {pid:p.id, old:p.wg, nw, pct:Math.round(r*100),
      txt: ren ? t_("eng.ha_il_contratto_in",{fn:p.fn,ln:p.ln,nw:nw,wg:p.wg,r:Math.round(r*100)})
               : t_("eng.sta_rendendo_bene_chiede",{fn:p.fn,ln:p.ln,v:S>0.4?t_("eng.e_la_squadra_vola"):'',wg:p.wg,nw:nw,r:Math.round(r*100)})}); made++; }
  /* 2. premio partita, chiesto dal capitano prima delle partite che contano */
  const nx=G.sched[G.md]; if(nx && room() && G.md>=1){ const f2=nx.find(x=>x.includes(t.id)); const opp=G.T[f2[0]===t.id?f2[1]:f2[0]], op=standings().indexOf(opp);
    if((op<=2 || Math.abs(op-pos)<=1) && !open.some(r=>r.kind==='premio') && rnd()<0.45){ const cap=G.P[t.cap];
      const amt=Math.round((14000+30000*Math.max(0,S+0.25))*(op<=1?1.3:1)/1000)*1000;
      mkReq(t,'premio',{pid:cap?cap.id:null, amt, opp:opp.id, mdx:G.md, txt:t_("eng.il_capitano_chiede_a",{v:cap?cap.ln:'',amt:Math.round(amt/1000),n:opp.n,op:op+1})}); made++; } }
  /* 3. premio obiettivo stagionale */
  if(room() && G.md>=3 && G.md<=5 && t.objS!==G.season && rnd()<0.5){ t.objS=G.season; const cap=G.P[t.cap];
    const [k,lim,base]= pos<=1?[t_("eng.vincere_il_campionato"),1,170000]: pos<=3?[t_("eng.arrivare_tra_le_prime"),4,85000]:[t_("eng.arrivare_tra_le_prime_2"),6,40000];
    const amt=Math.round(base*(1+Math.max(0,S)*1.1)/5000)*5000;
    mkReq(t,'obiettivo',{pid:cap?cap.id:null, amt, lim, goal:k, txt:t_("eng.il_capitano_chiede_un",{v:cap?cap.ln:'',amt:Math.round(amt/1000),k:k})}); made++; }
  /* 4. l'allenatore chiede un rinforzo (solo per il presidente umano: per il computer è il mercato) */
  if(t.id===0 && room() && !t.promise && !open.some(r=>r.kind==='rinforzo') && G.md>=2 && rnd()<0.14+0.12*Math.max(0,S)){
    const need=formNeed(t.coach.mod); let worst=null,wv=99; for(const r of ['D','C','A']){ const ps=pl.filter(p=>p.r===r).map(ovr).sort((a,b)=>b-a).slice(0,need[r]); const v=ps.length<need[r]?0:ps.reduce((a,b)=>a+b,0)/ps.length; if(v<wv){wv=v;worst=r;} }
    const thr=Math.round((avgTop(pl)+(S>0.3?0.4:0)-0.2)*10)/10;
    mkReq(t,'rinforzo',{role:worst, thr, due:G.md+2, pdue:G.md+5, txt:t_("eng.chiede_un_di_valore",{n:t.coach.n,v:{D:'difensore',C:'centrocampista',A:'attaccante'}[worst],fDec:fDec(thr),md:G.md+5})}); made++; }
}
/* le rivali corteggiano le stelle delle squadre in vetta */
function seekBuyer(p){ const t=G.T[p.team], v=value(p);
  const buyers=G.T.filter(b=>b.id!==t.id && b.id!==0 && !finInit(b).excluded && b.cash>v*0.8 && b.pl.length<22); if(!buyers.length) return null;
  const b=buyers[Math.floor(rnd()*buyers.length)], amt=Math.round(v*(0.78+rnd()*0.22)/5000)*5000;
  const r=mkReq(t,'offerta',{pid:p.id, buyer:b.id, amt, due:G.md+1, txt:t_("eng.su_tua_richiesta_offre",{n:b.n,amt:Math.round(amt/1000),fn:p.fn,ln:p.ln,v:Math.round(v/1000)})}); return r; }
function rivalOffers(){
  const st=standings();
  for(const t of G.T){ const pos=st.indexOf(t); if(finInit(t).excluded) continue;
    const stars=teamPlayers(t).sort((a,b)=>ovr(b)-ovr(a)).slice(0,3); const ch=(pos<=1?0.07:pos<=3?0.03:0)+(t.id===0?0:0.01);
    for(const p of stars){ if(!(rnd()<ch+(p.wantOut?0.12:0))) continue; if(openReqs(t).some(r=>r.pid===p.id)) continue;
      const foreign = pos<=1 && rnd()<0.5;
      const buyers=G.T.filter(b=>b.id!==t.id && b.id!==0 && !finInit(b).excluded && b.cash>value(p)*1.05 && b.pl.length<22 && wageRatio(b)<0.9); if(!buyers.length && !foreign) continue;
      const b=foreign?{id:-1,n:FOREIGN[Math.floor(rnd()*FOREIGN.length)]}:buyers[Math.floor(rnd()*buyers.length)], amt=Math.round(value(p)*(foreign?1.15+rnd()*0.3:1.02+rnd()*0.25)/5000)*5000;
      mkReq(t,'offerta',{pid:p.id, buyer:b.id, bn:b.n, amt, txt:t_("eng.offre_k_per_valore",{n:b.n,amt:Math.round(amt/1000),fn:p.fn,ln:p.ln,value:Math.round(value(p)/1000),v:p.wantOut?t_("eng.il_giocatore_ha_chiesto"):''})}); break; } }
}
/* scelta del presidente del computer: dipende dai conti */
function botChoice(t,r){
  const h=wageRatio(t), c=t.cash, wb=wageBill(t), S=successF(t);
  if(r.kind==='rinnovo'||r.kind==='aumento'){ const extra=r.nw-r.old, hh=(wb+extra+staffCost(t))/Math.max(1,roundIncome(t)); return hh<0.82&&c>wb*3?'acc': hh<0.95?'neg':'rif'; }
  if(r.kind==='premio') return c>r.amt*3&&h<0.9?'acc':c>r.amt*1.5?'neg':'rif';
  if(r.kind==='obiettivo') return c>r.amt*1.5&&h<0.9?'acc':c>r.amt*0.8?'neg':'rif';
  if(r.kind==='offerta'){ const p=G.P[r.pid]; return (h>0.9||c<wb*2||p.wantOut||arrears(t)>0||(S>0.5&&rnd()<0.3)||(r.buyer===-1&&r.amt>value(p)*1.25&&rnd()<0.5))?'acc':'rif'; }
  return 'rif';
}
function teamMor(t,d,why){ teamPlayers(t).forEach(p=>{ p.mor=clamp(p.mor+d,1,20); if(Math.abs(d)>=0.5) addCause(p,why,d); }); }
/* ====================== CLIMA DELLA SOCIETÀ E TRATTATIVE ====================== */
function clubClimate(t){ const pl=teamPlayers(t); if(!pl.length) return 12; const top=pl.slice().sort((a,b)=>(b.apps||0)-(a.apps||0)).slice(0,16);
  let s=0,w=0; for(const p of top){ const k=p.id===t.cap?3:p.id===t.vcap?1.5:1; s+=p.mor*k; w+=k; } s+=(t.coach.mor??12)*3; w+=3; return s/w; }
/* chi ha avanzato la richiesta: il giocatore, la squadra (premi, tramite il capitano) o l'allenatore */
function reqWho(r){ const t=G.T[r.team]; if(r.kind==='rinnovo'||r.kind==='aumento') return {type:'p', o:G.P[r.pid]}; if(r.kind==='rinforzo') return {type:'c', o:t.coach}; return {type:'t', o:G.P[r.pid]||null}; }
function reqMor(r){ const t=G.T[r.team], w=reqWho(r); return w.type==='p'?w.o.mor : w.type==='c'?(t.coach.mor??12) : teamMorale(t); }
function reqMorAdd(r,d,why){ const t=G.T[r.team], w=reqWho(r); if(!d) return; if(w.type==='p'){ w.o.mor=clamp(w.o.mor+d,1,20); addCause(w.o,why,d); } else if(w.type==='c'){ const c=t.coach; c.mor=clamp((c.mor??12)+d,1,20); addCause(c,why,d); } else teamMor(t,d,why); }
/* intervallo della trattativa: lo = il meglio per il presidente, hi = la richiesta */
function negRange(r){
  if(r.kind==='rinnovo'||r.kind==='aumento') return {lo:r.old, hi:r.nw, step:50, unit:t_("eng.cr_a_giornata"), E:r.kind==='rinnovo'?50:32, oneoff:true};
  if(r.kind==='rinforzo') return {lo:Math.round((r.thr-2)*10)/10, hi:r.thr, step:0.1, unit:t_("eng.di_valore_minimo"), E:0, oneoff:false};
  return {lo:0, hi:r.amt, step:r.kind==='obiettivo'?5000:1000, unit:'cr', E:0, oneoff:false};
}
function hashN(n){ let h=(n*2654435761)>>>0; h^=h>>>15; h=Math.imul(h,2246822519)>>>0; return (h%10000)/10000; }
/* minimo nascosto, concessioni e pazienza: dipendono soprattutto dal morale di chi chiede */
function negSetup(r){ const t=G.T[r.team], w=reqWho(r), mor=reqMor(r), R=negRange(r), S=successF(t);
  const amb=w.type==='p'?w.o.amb:11, prof=w.type==='p'?w.o.prof:12;
  const f=clamp(0.62-(mor-12)*0.065+(amb-11)*0.03-(prof-12)*0.02+S*0.15+(hashN(r.id)-0.5)*0.16,0.12,1);
  return {M:R.lo+(R.hi-R.lo)*f, k:clamp(0.28+(mor-12)*0.03+(prof-12)*0.015,0.1,0.55), pat:clamp(100+(mor-12)*4,60,130), c:R.hi, hist:[], st:'open'}; }
function negRound(R,v,up){ const s=R.step; const x=up?Math.ceil((v-1e-9)/s)*s:Math.round(v/s)*s; return Math.round(clamp(x,R.lo,R.hi)*100)/100; }
function negEff(r,v,oo){ const R=negRange(r); return v+(R.E&&oo?oo/R.E:0); }
function openNeg(r){ if(r.neg) return r.neg; if(r.kind==='offerta'){ r.neg=offSetup(r); r.neg.pat0=r.neg.pat; return r.neg; } r.neg=negSetup(r); r.neg.pat0=r.neg.pat; reqMorAdd(r, reqWho(r).type==='t'?-0.15:-0.3, t_("eng.il_presidente_ha_voluto")); return r.neg; }
function negPropose(r,v,oo,m){ const n=r.neg, R=negRange(r); if(!n||n.st!=='open') return;
  v=negRound(R,v,false); oo=Math.max(0,Math.round(oo||0)); n.hist.push({by:'pres',v,oo,m:m||null});
  /* la motivazione: se è credibile rende più paziente e disponibile, se non lo è irrita */
  let cm=1, km=1, pre=''; if(m){ const t=G.T[r.team]; n.used=n.used||{}; const rep=n.used[m]||0; n.used[m]=rep+1; let cr=credibility(t,r,m); if(rep) cr*=0.5;
    if(cr>0.5){ cm=0.65; km=1.35; pre=rep?t_("eng.me_l_ha_gia"):t_("eng.capisco"); } else if(cr<0){ cm=1.4; km=0.8; pre=`${t_("eng.non_mi_prenda_in",{replace:credTxt(t,r,m,cr).replace(/: non ci crede$/,'')})} `; reqMorAdd(r,-0.15,t_("eng.motivazione_del_presidente_non")); } else { cm=0.9; pre=t_("eng.mah"); } }
  const ve=negEff(r,v,oo);
  if(ve>=n.M-1e-9){ n.hist.push({by:'req',txt:pre+t_("eng.affare_fatto")}); n.st='deal'; resolveReq(r,'deal',false,{v,oo,opened:true}); return; }
  const g=clamp((n.M-ve)/Math.max(1e-9,R.hi-R.lo),0,1); n.pat=Math.max(0,n.pat-(10+75*Math.pow(g,1.1))*cm);
  if(g>0.7) reqMorAdd(r,-0.15,t_("eng.proposta_giudicata_offensiva"));
  if(n.pat<=0){ n.st='stalled'; n.hist.push({by:'req',v:n.c,txt:pre+t_("eng.la_mia_pazienza_e")}); return; }
  const nc=Math.max(n.M, n.c-(n.c-n.M)*Math.min(0.8,n.k*km)-(R.hi-R.lo)*0.015); n.c=negRound(R,nc,true); if(n.c<n.M) n.c=negRound(R,n.M,true);
  const prev=n.hist.filter(h=>h.by==='req'&&h.v!=null).slice(-1)[0], moved=prev?n.c<prev.v-1e-9:n.c<R.hi-1e-9;
  n.hist.push({by:'req',v:n.c,txt:pre+(!moved?(g>0.7?t_("eng.mi_sembra_poco_serio"):t_("eng.non_scendo_resto_su")):(n.c-n.M)<(R.hi-R.lo)*0.04?t_("eng.questa_e_la_mia"):g>0.7?t_("eng.mi_sembra_poco_serio_2"):t_("eng.posso_venirle_incontro"))}); }
const NEG_MOT={conti:t_("eng.siamo_in_rosso_con"), futuro:t_("eng.puntiamo_alla_prossima_stagione"), gruppo:t_("eng.il_gruppo_viene_prima"), prestazioni:t_("eng.le_prestazioni_non_lo")};
function credibility(t,r,m){ const ratio=wageRatio(t), wb=wageBill(t), pos=standings().indexOf(t), w=reqWho(r);
  if(m==='conti') return (ratio>0.85||arrears(t)>0||t.cash<wb*4)?1 : (ratio<0.72&&t.cash>wb*14)?-1 : 0.2;
  if(m==='futuro') return (pos>=4||G.md>=10)?0.7 : pos<=1?-0.3 : 0.2;
  if(m==='gruppo'){ const cl=clubClimate(t); return cl>=12.5?0.6 : cl<10?-0.3 : 0.1; }
  if(m==='prestazioni'){ if(w.type!=='p') return 0; const a=avgRt(w.o); return a<6.2?1 : a>6.9?-1 : 0.2; }
  return 0; }
function credTxt(t,r,m,c){ if(m==='conti') return c>0.5?t_("eng.i_conti_sono_davvero"):c<0?t_("eng.in_cassa_ci_sono",{cash:kcrE(t.cash)}):t_("eng.i_conti_non_sono");
  if(m==='futuro') return c>0.5?t_("eng.capisce_il_progetto"):c<0?t_("eng.la_squadra_e_in"):t_("eng.non_e_del_tutto");
  if(m==='gruppo') return c>0.5?t_("eng.lo_spogliatoio_e_sereno"):c<0?t_("eng.con_questo_clima_nello"):t_("eng.lo_accetta_a_fatica");
  if(m==='prestazioni') return c>0.5?t_("eng.sa_di_non_aver"):c<0?t_("eng.con_i_voti_che"):t_("eng.non_e_d_accordo");
  return ''; }
/* effetti pieni di un sì o di un no, per tipo di richiesta */
function reqLoss(r){ const w=reqWho(r); if(w.type==='p') return -1.8*(1+(w.o.amb-10)*0.05); if(r.kind==='rinforzo') return -1.2; return r.kind==='obiettivo'?-0.9:-0.4; }
function reqGain(r){ return (r.kind==='rinnovo'||r.kind==='aumento')?1.4 : r.kind==='rinforzo'?0.6 : r.kind==='obiettivo'?0.8 : 0.4; }
function applyYes(r,t,p,v,oo){ /* conclude l'accordo al valore v (più eventuale una tantum) */
  const c=t.coach, a=Math.round(v);
  if(r.kind==='rinnovo'||r.kind==='aumento'){ p.wg=a; if(r.kind==='rinnovo'){ p.ct=3; p.renewNo=null; } p.wantOut=false; if(oo) spend(t,'una tantum',oo); return t_("eng.accordo_con_cr_a",{ln:p.ln,a:a,v:oo?` ${t_("eng.piu_alla_firma",{oo:kcrE(oo)})}`:'',v2:r.kind==='rinnovo'?t_("eng.contratto_di_3_anni"):''}); }
  if(r.kind==='premio'){ t.bonus={md:r.mdx,amt:a}; addMission(t,{kind:'premio',amt:a,opp:r.opp,due:r.mdx+1,title:t_("eng.premio_partita_contro",{n:G.T[r.opp].n})}); return t_("eng.premio_partita_in_caso",{a:kcrE(a)}); }
  if(r.kind==='obiettivo'){ t.obj={amt:a,lim:r.lim,goal:r.goal,s:G.season}; addMission(t,{kind:'obiettivo',amt:a,lim:r.lim,goal:r.goal,due:14,title:t_("eng.obiettivo",{goal:r.goal})}); return t_("eng.premio_obiettivo_se_la",{a:kcrE(a),goal:r.goal}); }
  if(r.kind==='rinforzo'){ t.promise={role:r.role,thr:v,due:r.pdue,s:G.season}; addMission(t,{kind:'rinforzo',role:r.role,roleN:({D:'difensore',C:'centrocampista',A:'attaccante'})[r.role],thr:v,due:r.pdue,title:t_("eng.rinforzo_per",{n:c.n})}); return t_("eng.promesso_a_un_di",{n:c.n,v:({D:'difensore',C:'centrocampista',A:'attaccante'})[r.role],fDec:fDec(v),pdue:r.pdue}); }
  return ''; }
function applyNo(r,t,p){ if((r.kind==='rinnovo')&&p) p.renewNo=G.season; }
function resolveReq(r,ch,bot,o){
  if(!r || (r.st!=='open')) return; o=o||{}; const t=G.T[r.team], p=r.pid!=null?G.P[r.pid]:null, f=finInit(t); r.dmd=G.md;
  let out='';
  if((r.kind==='rinnovo'||r.kind==='aumento') && (!p||p.team!==t.id)){ r.st='exp'; return; }
  if(r.kind==='offerta'){ if(!p||p.team!==t.id){ r.st='exp'; return; }
    if(r.neg && ch==='deal' && o.acc){ r.neg.hist.push({by:'pres',acc:true,v:o.v}); }
    if(r.neg && (ch==='rif'||ch==='rifm')) r.neg.hist.push({by:'pres',no:true,m:o.motive});
    out=closeOffer(r, ch==='neg'?'acc':ch, o); }
  else {
    const R=negRange(r), opened=!!o.opened, openPen=opened?(reqWho(r).type==='t'?-0.15:-0.3):0;
    if(ch==='neg' && bot){ const n=negSetup(r); const v=negRound(R,n.M+(R.hi-n.M)*0.25,true); reqMorAdd(r,reqWho(r).type==='t'?-0.15:-0.3,t_("eng.trattativa_con_il_presidente")); out=applyYes(r,t,p,v,0); r.st='deal'; r.v=v; }
    else if(ch==='acc'){ reqMorAdd(r,reqGain(r),r.kind==='rinforzo'?t_("eng.il_presidente_ha_promesso"):(r.kind==='rinnovo'||r.kind==='aumento')?t_("eng.richiesta_accettata"):t_("eng.premio_promesso")); out=applyYes(r,t,p,R.hi,0); r.st='acc'; r.v=R.hi; }
    else if(ch==='deal'){ if(r.neg && o.acc){ r.neg.hist.push({by:'pres',acc:true,v:o.v}); r.neg.hist.push({by:'req',txt:t_("eng.bene_siamo_d_accordo")}); } const full=o.v>=R.hi-1e-9; if(full) reqMorAdd(r,reqGain(r),t_("eng.richiesta_accolta_dopo_la")); out=applyYes(r,t,p,o.v,o.oo||0); r.st='deal'; r.v=o.v; if(!full) out+=t_("eng.accordo_a_meta_strada"); }
    else if(ch==='rif'||ch==='exp'){ if(r.neg && ch==='rif'){ r.neg.hist.push({by:'pres',no:true}); } applyNo(r,t,p); const L=reqLoss(r)*(ch==='exp'?0.8:1); reqMorAdd(r,L-openPen,ch==='exp'?t_("eng.richiesta_ignorata_dal_president"):t_("eng.richiesta_rifiutata")); r.st=ch;
      const who=reqWho(r); if(who.type==='p' && who.o.amb>=13){ who.o.wantOut=true; out=t_("eng.non_la_prende_bene",{ln:who.o.ln}); } else out=who.type==='c'?t_("eng.non_e_contento",{n:t.coach.n}):who.type==='t'?t_("eng.la_squadra_e_delusa"):t_("eng.e_deluso",{ln:who.o.ln}); }
    else if(ch==='rifm'){ applyNo(r,t,p); const m=o.motive||'conti', cr=credibility(t,r,m), X=Math.max(0,Math.round(o.oo||0));
      const ref = (r.kind==='rinnovo'||r.kind==='aumento') ? Math.max(5000,(R.hi-R.lo)*R.E*0.5) : r.kind==='rinforzo' ? 40000 : Math.max(5000,R.hi*0.5);
      const red=clamp(0.35*cr+0.5*Math.min(1,X/ref),-0.3,0.75), L=reqLoss(r)*(1-red);
      if(X) spend(t,'una tantum',X); reqMorAdd(r,L-openPen,t_("eng.rifiuto_motivato",{v:NEG_MOT[m]})); r.st='rifm';
      const who=reqWho(r), nm=who.type==='c'?t.coach.n:who.type==='t'?t_("eng.la_squadra"):who.o.ln;
      if(who.type==='p' && who.o.amb>=14 && red<0.2) who.o.wantOut=true;
      out=t_("eng.no_motivato",{v:X?` ${t_("eng.con_una_tantum",{X:kcrE(X)})}`:'',v2:NEG_MOT[m],nm:nm,credTxt:credTxt(t,r,m,cr)});
      if(r.neg){ r.neg.hist.push({by:'pres',no:true,m,oo:X}); r.neg.hist.push({by:'req',txt:(cr>0.5?t_("eng.va_bene_capisco"):cr<0?t_("eng.non_ci_credo"):t_("eng.lo_accetto_ma_non"))+credTxt(t,r,m,cr)+(X?t_("eng.grazie_per_i",{X:kcrE(X)}):'.')}); } }
  }
  r.out=out; f.hist.unshift({s:G.season,md:G.md,t:`${REQ_KIND[r.kind]}: ${out}`}); if(f.hist.length>30) f.hist.length=30;
  if(t.id===0 && !bot) news(out,'club',false,t.id);
}
/* dopo ogni giornata: premi partita, promesse, richieste scadute, malumori, nuove richieste */
function afterRound(out){
  for(const t of G.T){ const m=out.find(x=>x.h===t.id||x.a===t.id), side=m.h===t.id?0:1, win=side?m.ga>m.gh:m.gh>m.ga;
    if(t.bonus && t.bonus.md===G.md-1){ closeMission(t,'premio',win?'ok':'end',win?t_("eng.vittoria_premio_di_pagato",{amt:kcrE(t.bonus.amt)}):t_("eng.niente_vittoria_il_premio")); if(win){ spend(t,'premi',t.bonus.amt); if(t.id===0) news(t_("eng.vittoria_pagato_il_premio",{amt:kcrE(t.bonus.amt)}),'club',false,t.id); } t.bonus=null; }
    if(t.promise && G.md>=t.promise.due){ const c=t.coach; c.mor=clamp((c.mor??12)-2,1,20); addCause(c,t_("eng.promessa_di_rinforzo_non"),-2); teamMor(t,-0.3,t_("eng.promessa_del_presidente_non")); if(t.id===0) news(t_("eng.mi_era_stato_promesso",{n:c.n}),'coach',false,t.id); finInit(t).hist.unshift({s:G.season,md:G.md,t:t_("eng.promessa_di_rinforzo_non_2")}); closeMission(t,'rinforzo','ko',t_("eng.non_mantenuta_nessun_rinforzo")); t.promise=null; }
    teamPlayers(t).forEach(p=>{ if(p.wantOut){ p.mor=clamp(p.mor-0.3,1,20); } });
  }
  (G.req||[]).filter(r=>r.st==='open' && r.kind==='acquisto').forEach(r=>{ r.st='exp'; });
  (G.req||[]).filter(r=>r.st==='open' && G.md>r.due).forEach(r=>resolveReq(r,'exp',false));
  rivalOffers();
  G.T.forEach(t=>genRequests(t));
  missionRemind(G.T[0]);
}
/* impegni presi dal presidente: restano attivi come missioni fino alla conclusione */
function addMission(t,o){ t.miss=t.miss||[]; t.miss.unshift({id:(G.mid=(G.mid||0)+1), s:G.season, md:G.md, st:'on', ...o}); if(t.miss.length>30) t.miss.length=30; }
function closeMission(t,kind,st,res){ const m=(t.miss||[]).find(x=>x.kind===kind && x.st==='on'); if(m){ m.st=st; m.res=res; m.end=G.md; } }
function activeMissions(t){ return (t.miss||[]).filter(m=>m.st==='on'); }
function missionRemind(t){ if(t.id!==0) return; for(const m of activeMissions(t)){ if(m.kind!=='rinforzo') continue; const left=m.due-G.md;
  if(left===2) news(t_("eng.promemoria_hai_promesso_a",{n:t.coach.n,roleN:m.roleN,fDec:fDec(m.thr)}),'coach',false,t.id);
  if(left===1) news(t_("eng.ultima_occasione_compra_promesso",{v:m.roleN==='attaccante'?'l\'':t_("eng.il"),roleN:m.roleN,n:t.coach.n,due:m.due}),'coach',false,t.id); } }
function promiseCheck(t,p){ if(t.promise && p.r===t.promise.role && ovr(p)>=t.promise.thr-0.05){ const c=t.coach; c.mor=clamp((c.mor??12)+1.5,1,20); addCause(c,t_("eng.il_presidente_ha_mantenuto"),1.5); teamMor(t,0.3,t_("eng.arriva_il_rinforzo_promesso")); news(t_("eng.ringrazia_il_rinforzo_promesso",{n:c.n}),'coach',false,t.id); closeMission(t,'rinforzo','ok',t_("eng.mantenuta_e_arrivato",{fn:p.fn,ln:p.ln})); finInit(t).hist.unshift({s:G.season,md:G.md,t:t_("eng.promessa_mantenuta_arriva",{ln:p.ln})}); t.promise=null; } }


/* ====================== CALCIOMERCATO IN USCITA ======================
   Il presidente tratta il prezzo con il club che compra; se c'è l'accordo, decide il giocatore (in segreto). */
/* club che compra: una squadra del campionato o un club estero (virtuale, ricco e prestigioso) */
const FOREIGN=[t_("eng.un_club_inglese"),t_("eng.un_club_spagnolo"),t_("eng.un_club_tedesco"),t_("eng.un_club_francese"),t_("eng.un_club_arabo"),t_("eng.un_club_turco")];
function buyerOf(r){ return r.buyer===-1 ? {id:-1, n:r.bn||t_("eng.un_club_estero"), cash:1e9, pl:[], foreign:true} : G.T[r.buyer]; }
function offMax(r){ const p=G.P[r.pid], b=buyerOf(r), v=value(p); if(b.foreign) return Math.max(r.amt*1.05, v*(1.2+(hashN(r.id+7))*0.3));
  const need=teamPlayers(b).filter(q=>q.r===p.r).length<({P:2,D:5,C:5,A:4})[p.r]?1:0, rich=clamp(b.cash/(v*2)-0.5,0,1), form=clamp((avgRt(p)-6.2)/1.2,-0.5,1);
  return Math.max(r.amt*1.02, Math.min(b.cash*0.95, v*(1.04+need*0.15+rich*0.15+form*0.1+(hashN(r.id+7)-0.5)*0.14))); }
/* voglia segreta del giocatore di trasferirsi: morale, ambizione e prestigio del club che lo vuole */
function willGo(r){ const p=G.P[r.pid], t=G.T[r.team], b=buyerOf(r), st=standings(), better=b.foreign?true:st.indexOf(b)<st.indexOf(t);
  return clamp(0.42+(12-p.mor)*0.075+(p.amb-11)*0.04*(better?1:-0.6)+(better?0.15:-0.12)+(p.wantOut?0.45:0)+(b.foreign?0.12+(p.amb-11)*0.02:0)+(hashN(r.id+3)-0.5)*0.2,0.03,0.97); }
function offSetup(r){ const X=offMax(r); return {X, k:0.32+(hashN(r.id+11)-0.5)*0.1, pat:90+(hashN(r.id+5))*30, c:r.amt, hist:[], st:'open', off:true}; }
function offRange(r){ const v=value(G.P[r.pid]); return {lo:r.amt, hi:Math.max(r.amt*1.3,Math.round(v*1.7/5000)*5000), step:5000}; }
function offPropose(r,P){ const n=r.neg, R=offRange(r); if(!n||n.st!=='open') return; P=Math.round(clamp(P,R.lo,R.hi)/5000)*5000; n.hist.push({by:'pres',v:P});
  if(P<=n.X+1){ n.hist.push({by:'req',txt:t_("eng.affare_fatto_per_noi")}); n.st='deal'; resolveReq(r,'deal',false,{v:P,opened:true}); return; }
  const g=clamp((P-n.X)/Math.max(1,n.X*0.5),0,1); n.pat=Math.max(0,n.pat-(10+75*Math.pow(g,1.1)));
  if(n.pat<=0){ n.st='stalled'; n.hist.push({by:'req',v:n.c,txt:t_("eng.non_andiamo_oltre_la")}); return; }
  const prev=n.c; n.c=Math.min(n.X, Math.round((n.c+(n.X-n.c)*n.k+n.X*0.01)/5000)*5000); if(n.c>n.X) n.c=Math.floor(n.X/5000)*5000; if(n.c<prev) n.c=prev;
  n.hist.push({by:'req',v:n.c,txt:n.c<=prev?(g>0.7?t_("eng.cifre_fuori_mercato_restiamo"):t_("eng.piu_di_cosi_non")):(n.X-n.c)<n.X*0.03?t_("eng.ultimo_rilancio"):g>0.7?t_("eng.cifra_esagerata_possiamo_salire"):t_("eng.possiamo_alzare_a")}); }
const OFF_MOT={incedibile:t_("eng.per_noi_e_incedibile"), obiettivo:t_("eng.ci_serve_per_raggiungere"), futuro:t_("eng.fa_parte_del_progetto")};
function offCred(t,r,m){ const p=G.P[r.pid], top=teamPlayers(t).sort((a,b)=>ovr(b)-ovr(a)).slice(0,4).includes(p), pos=standings().indexOf(t);
  if(m==='incedibile') return top?1:-0.5; if(m==='obiettivo') return pos<=3?0.8:pos>=6?-0.4:0.2; if(m==='futuro') return p.age<=26?0.6:p.age>=31?-0.5:0.1; return 0; }
/* chiude l'offerta: vendita (se il giocatore accetta) o rifiuto */
function closeOffer(r,ch,o){ const t=G.T[r.team], p=G.P[r.pid], b=buyerOf(r), w=willGo(r); let out='';
  if(ch==='acc'||ch==='deal'){ const amt=ch==='acc'?r.amt:o.v;
    if(!(b.cash>=amt*0.9 && b.pl.length<23)){ r.st='exp'; return t_("eng.non_ha_piu_i",{n:b.n}); }
    { const bk=bankOkSale(t,p,amt); if(bk){ r.st='bank'; if(r.neg) r.neg.hist.push({by:'pl',txt:t_("eng.la_banca_non_ha")}); return bk+` ${t_("eng.l_affare_salta")}`; } }
    if(rnd()<w){ t.pl=t.pl.filter(x=>x!==p.id); if(b.foreign){ p.team=null; p.abroad=true; } else { b.pl.push(p.id); p.team=b.id; p.ct=3; p.wg=Math.max(p.wg,Math.round(wage(p)*1.15/100)*100); budVary(b,'acquisti',amt); spend(b,'acquisti',amt); ensureCaptains(b,true); } p.wantOut=false; p.mor=clamp(p.mor+1,1,20); earn(t,'cessioni',amt); onSold(t,p,amt); ensureCaptains(t,t.id!==0);
      r.st=ch; r.v=amt; out=t_("eng.accetta_ceduto_a_per",{fn:p.fn,ln:p.ln,n:b.n,amt:kcrE(amt)}); news(t_("eng.cede_a_per",{n:t.n,fn:p.fn,ln:p.ln,n2:b.n,amt:kcrE(amt)}), t.id===0?'market':'match',true,t.id);
      if(r.neg) r.neg.hist.push({by:'pl',txt:t_("eng.accetto_il_trasferimento_a",{n:b.n})}); }
    else { r.st='plno'; p.mor=clamp(p.mor-0.5,1,20); addCause(p,t_("eng.il_club_voleva_vendermi"),-0.5); out=t_("eng.accordo_tra_i_club",{ln:p.ln,n:b.n});
      if(r.neg) r.neg.hist.push({by:'pl',txt:t_("eng.grazie_ma_resto_qui",{n:b.n})}); } }
  else { const d0 = w>0.6 ? -1.6 : w<0.35 ? 0.3 : -0.3; let d=d0, why=w>0.6?t_("eng.cessione_rifiutata_dal_club"):w<0.35?t_("eng.il_presidente_non_vuole"):t_("eng.cessione_rifiutata_dal_club");
    if(ch==='rifm' && d0<0){ const cr=offCred(t,r,o.motive); d=d0*(1-clamp(0.45*cr,-0.3,0.6)); why=t_("eng.rifiuto_motivato",{v:OFF_MOT[o.motive]});
      if(r.neg) r.neg.hist.push({by:'pl',txt:cr>0.5?t_("eng.capisco_mi_fa_piacere"):cr<0?t_("eng.non_ci_credo_e"):t_("eng.va_bene_ne_riparleremo")}); }
    p.mor=clamp(p.mor+d,1,20); addCause(p,why,d); if(w>0.6 && d<-1) p.wantOut=true;
    r.st=ch; out=t_("eng.offerta_di_respinta",{n:b.n,ln:p.ln,v:w>0.6?(d<-1?t_("eng.voleva_andare_ed_e"):t_("eng.voleva_andare_ma_capisce")):w<0.35?t_("eng.e_contento_di_restare"):'resta'}); }
  return out; }


/* ====================== CALCIOMERCATO IN ENTRATA ======================
   Due fasi: prezzo con il club che vende (minimo segreto), poi contratto con il giocatore (interesse segreto). */
function buyAsk(p){ return Math.round(value(p)*(1.05+((p.e&&p.e.pot)||0)*0.25+0.12)/5000)*5000; }
function sellerMin(r){ const p=G.P[r.pid], s=G.T[p.team], v=value(p), st=standings();
  const top=teamPlayers(s).sort((a,b)=>ovr(b)-ovr(a)).slice(0,3).includes(p)?1:0, topPos=st.indexOf(s)<=2?1:0, trouble=(arrears(s)>0||wageRatio(s)>0.9)?1:0;
  return v*clamp(0.92+top*0.25+topPos*0.1-trouble*0.15-(p.ct<=1?0.25:0)-(p.wantOut?0.15:0)-(12-p.mor)*0.02+(hashN(r.id+21)-0.5)*0.16,0.55,1.6); }
/* interesse del giocatore a venire da noi: il suo morale dove si trova, il prestigio e il clima della nostra società */
function joinInterest(r){ const p=G.P[r.pid], me=G.T[0], st=standings(), free=p.team==null, from=free?null:G.T[p.team];
  const better= free?true: st.indexOf(me)<st.indexOf(from);
  return clamp(0.5+(free?0.2:(12-p.mor)*0.05)+(better?0.15:-0.12)*(1+(p.amb-11)*0.08)+(clubClimate(me)-12)*0.03+(p.wantOut?0.3:0)+(hashN(r.id+23)-0.5)*0.2,0.03,0.97); }
function buyOpen(p){ G.req=G.req||[]; let r=G.req.find(q=>q.team===0&&q.kind==='acquisto'&&q.pid===p.id&&q.st==='open'); if(r) return r;
  r={id:(G.rid=(G.rid||0)+1), team:0, kind:'acquisto', pid:p.id, md:G.md, s:G.season, due:G.md, st:'open', from:p.team, txt:''}; G.req.push(r);
  if(p.team==null) buyPlayerPhase(r); else { const Mn=sellerMin(r), ask=Math.max(Math.round(Mn*1.12/5000)*5000, buyAsk(p)); r.neg={ph:'club', M:Mn, ask, c:ask, k:0.3+(hashN(r.id+5)-0.5)*0.1, pat:90+(arrears(G.T[p.team])>0?30:0), pat0:120, hist:[], st:'open'}; }
  return r; }
function buyPlayerPhase(r){ const p=G.P[r.pid], I=joinInterest(r), free=p.team==null;
  const Wask=Math.round(Math.max(wage(p),p.wg)*(1.12+(p.amb-11)*0.02)/100)*100, Wmin=Math.max(free?wage(p)*0.7:p.wg, Wask*(1.05-I*0.45));
  const n=r.neg||{hist:[]}; r.neg={ph:'player', I, M:Wmin, ask:Wask, c:Wask, k:0.25+I*0.3, pat:60+I*70, pat0:130, hist:n.hist, st:'open', fee:n.fee||0};
  if(I<0.15){ r.neg.st='no'; r.st='plno'; r.neg.hist.push({by:'pl',txt:t_("eng.la_ringrazio_ma_non")}); r.out=t_("eng.non_e_interessato_al",{fn:p.fn,ln:p.ln}); }
  else r.neg.hist.push({by:'pl',txt:t_("eng.per_venire_chiedo_cr",{Wask:fmtK(Wask)})}); }
const fmtK=n=>fInt(n);   /* formati in testi_it.js (0.4.2.6) */
function buyPropose(r,v,oo){ const n=r.neg; if(!n||n.st!=='open') return; const p=G.P[r.pid];
  if(n.ph==='club'){ v=Math.round(v/5000)*5000; n.hist.push({by:'pres',v,ph:'club'});
    if(v>=n.M-1){ n.fee=v; n.hist.push({by:'club',txt:t_("eng.d_accordo_sul_prezzo")}); buyPlayerPhase(r); return; }
    const g=clamp((n.M-v)/Math.max(1,n.M*0.5),0,1); n.pat=Math.max(0,n.pat-(10+75*Math.pow(g,1.1)));
    if(n.pat<=0){ n.st='stalled'; n.hist.push({by:'club',v:n.c,txt:t_("eng.non_scendiamo_piu_la")}); return; }
    const prev=n.c; n.c=Math.max(Math.ceil(n.M/5000)*5000, Math.round((n.c-(n.c-n.M)*n.k-n.M*0.01)/5000)*5000); if(n.c>prev) n.c=prev;
    n.hist.push({by:'club',v:n.c,txt:n.c>=prev?(g>0.7?t_("eng.offerta_irricevibile_restiamo_a"):t_("eng.non_possiamo_scendere_restiamo")):(n.c-n.M)<n.M*0.03?t_("eng.ultima_richiesta"):g>0.7?t_("eng.offerta_bassa_possiamo_scendere"):t_("eng.possiamo_scendere_a")}); return; }
  /* fase 2: contratto con il giocatore */
  v=Math.round(v/50)*50; oo=Math.max(0,Math.round(oo||0)); n.hist.push({by:'pres',v,oo,ph:'player'});
  const ve=v+oo/42;
  if(ve>=n.M-1e-9){ n.hist.push({by:'pl',txt:t_("eng.affare_fatto_vengo_volentieri")}); buyComplete(r,v,oo); return; }
  const g=clamp((n.M-ve)/Math.max(1,n.ask*0.4),0,1); n.pat=Math.max(0,n.pat-(10+75*Math.pow(g,1.1)));
  if(n.pat<=0){ n.st='stalled'; n.hist.push({by:'pl',v:n.c,txt:t_("eng.ho_perso_la_pazienza")}); return; }
  const prev=n.c; n.c=Math.max(Math.ceil(n.M/50)*50, Math.round((n.c-(n.c-n.M)*n.k-n.ask*0.01)/50)*50); if(n.c>prev) n.c=prev;
  n.hist.push({by:'pl',v:n.c,txt:n.c>=prev?t_("eng.non_scendo_resto_su"):(n.c-n.M)<n.ask*0.03?t_("eng.ultima_richiesta"):t_("eng.posso_accettare")}); }
function buyAccept(r){ const n=r.neg; if(!n) return; if(n.ph==='club'){ n.fee=n.c; n.hist.push({by:'pres',acc:true,v:n.c,ph:'club'}); n.hist.push({by:'club',txt:t_("eng.bene_ora_deve_convincere")}); n.st='open'; buyPlayerPhase(r); } else { n.hist.push({by:'pres',acc:true,v:n.c,ph:'player'}); n.hist.push({by:'pl',txt:t_("eng.allora_siamo_d_accordo")}); buyComplete(r,n.c,0); } }
function buyQuit(r){ if(!r||r.st!=='open') return; r.st='quit'; if(r.neg) r.neg.st='no'; r.out=t_("eng.trattativa_abbandonata"); }
function buyComplete(r,w,oo){ const p=G.P[r.pid], me=G.T[0], n=r.neg, fee=n.fee||0;
  if(me.pl.length>=24){ n.st='no'; r.st='fail'; r.out=t_("eng.rosa_piena_massimo_24"); return; }
  if(fee+oo>me.cash){ n.st='no'; r.st='fail'; r.out=t_("eng.non_hai_abbastanza_crediti",{fee:kcrE(fee+oo)}); return; }
  { const v=buyBlock(me,fee+oo); if(v){ n.st='no'; r.st='fail'; r.out=v; n.hist.push({by:'club',txt:v}); return; } }
  if(p.team!=null){ const from=G.T[p.team]; from.pl=from.pl.filter(x=>x!==p.id); earn(from,'cessioni',fee); onSold(from,p,fee); ensureCaptains(from,true); } else G.FA=G.FA.filter(x=>x!==p.id);
  spend(me,'acquisti',fee); if(oo) spend(me,'una tantum',oo); promiseCheck(me,p);
  p.team=0; p.ct=3; p.wg=w; p.wantOut=false; p.renewNo=null; p.mor=clamp(12+n.I*4,1,20); addCause(p,t_("eng.nuovo_arrivo"),0); me.pl.push(p.id); ensureCaptains(me,true);
  n.st='deal'; r.st='deal'; r.out=t_("eng.ufficiale_firma_con_noi",{fn:p.fn,ln:p.ln,v:fee?` ${t_("eng.per",{fee:kcrE(fee)})}`:t_("eng.da_svincolato"),w:fmtK(w),v2:oo?t_("eng.alla_firma",{oo:kcrE(oo)}):''});
  finInit(me).hist.unshift({s:G.season,md:G.md,t:r.out}); news(r.out,'market',true,0); }

/* ---------- morale ---------- */
const fmtV=v=>fDec(v);
function morLevel(x){ return x>=16?'alto':x>=13.5?'buono':x>=10.5?'normale':x>=7.5?'basso':'pessimo'; }
function teamMorale(t){ const pl=teamPlayers(t); if(!pl.length) return 12; const top=pl.slice().sort((a,b)=>(b.apps||0)-(a.apps||0)).slice(0,14); let s=0,w=0; for(const p of top){ const k=p.id===t.cap?3:p.id===t.vcap?1.5:1; s+=p.mor*k; w+=k; } return s/w; }
function addCause(o,txt,d){ o.morC=o.morC||[]; o.morC.unshift({s:G.season,md:G.md+1,t:txt,d:Math.round(d*10)/10}); if(o.morC.length>5) o.morC.length=5; }
function updMorale(t,m,side){
  const pl=teamPlayers(t), gf=side?m.ga:m.gh, ga=side?m.gh:m.ga, res=Math.sign(gf-ga), tm=teamMorale(t), c=t.coach, cm=c.mor??12;
  const avail=new Set(m.inp.t[side].players.map(x=>x.id)), top=avgTop(pl), cap=G.P[t.cap];
  const goals={}; m.scorers.forEach(s=>{ goals[s.pid]=(goals[s.pid]||0)+1; });
  for(const p of pl){
    const mins=m.mins[p.id]||0, why=[]; let d=0;
    const neg=x=>x<0?x*clamp(1-(p.prof-12)*0.05,0.6,1.4):x*clamp(1+(p.amb-11)*0.02,0.85,1.2);
    if(mins>0){ const rt=m.rt[p.id]??6; d+=neg((rt-6.1)*0.55); if(rt>=7.5) why.push(t_("eng.ottima_prova_voto",{rt:fmtV(rt)})); else if(rt<=5) why.push(t_("eng.prova_deludente_voto",{rt:fmtV(rt)}));
      const g=goals[p.id]||0; if(g){ d+=0.3*g; why.push(g>1?`${g} gol`:t_("eng.ha_segnato")); } p.bench=0; }
    else if(avail.has(p.id)){ p.bench=(p.bench||0)+1; if(ovr(p)>top-1.2){ let x=-0.32*(1+(p.amb-10)*0.06); if(p.bench>=3){ x-=0.25; why.push(t_("eng.panchine_di_fila",{bench:p.bench})); } else why.push(t_("eng.lasciato_in_panchina")); d+=neg(x); } }
    d+=neg(res*(mins>0?0.32:0.1)); if(res && mins>0 && !why.length) why.push(res>0?'vittoria':'sconfitta');
    const club=(tm-p.mor)*0.05+(cm-12)*0.02+(cap&&cap!==p?(cap.mor-12)*0.015:0); d+=club;
    if(Math.abs(club)>=0.25) why.push(club>0?t_("eng.buon_clima_nello_spogliatoio"):t_("eng.spogliatoio_nervoso"));
    d=clamp(d,-1.6,1.6);
    const rev=(12-p.mor)*0.13; p.mor=clamp(p.mor+d+rev,1,20);
    if(Math.abs(d)>=0.5 && why.length){ addCause(p, why.join(', '), d); if(t.id===0 && d<=-1) news(t_("eng.e_giu_di_morale",{fn:p.fn,ln:p.ln,v:why[0]}),'player',false,t.id); }
  }
  const cr=m.coachRt?m.coachRt[side]:null; let dc=0; const cw=[];
  if(cr){ c.rts=c.rts||[]; c.rts.push(cr.v); if(c.rts.length>8) c.rts.shift(); }
  if(cr && cr.v!=null){ dc+=(cr.v-6.1)*0.5; if(cr.v>=7||cr.v<=5) cw.push(`voto ${fmtV(cr.v)}`); cw.push(...cr.why.slice(0,2)); }
  dc+=res*0.3; if(m.coachOff&&m.coachOff[side]) dc-=0.5; dc=clamp(dc,-1.5,1.5);
  c.mor=clamp(cm+dc+(12-cm)*0.13,1,20); if(Math.abs(dc)>=0.4 && cw.length) addCause(c, cw.join(', '), dc);
  const old=t.mor??12; t.mor=teamMorale(t);
  if(t.id===0 && morLevel(old)!==morLevel(t.mor)) news(t_("eng.spogliatoio_il_morale_della",{morLevel:morLevel(t.mor)}),'club',false,t.id);
}
function standings(){ return [...G.T].sort((a,b)=>((a.fin&&a.fin.excluded)?1:0)-((b.fin&&b.fin.excluded)?1:0) || teamPts(b)-teamPts(a) || (b.tab.gf-b.tab.gs)-(a.tab.gf-a.tab.gs) || b.tab.gf-a.tab.gf); }

function coachTalk(){
  const t=G.T[0], pl=teamPlayers(t), need=formNeed(t.coach.mod);
  if(rnd()<0.25){
    let worst=null, wv=99;
    for(const r of ['D','C','A']){ const ps=pl.filter(p=>p.r===r).map(ovr).sort((a,b)=>b-a).slice(0,need[r]); const v=ps.length<need[r]?0:ps.reduce((a,b)=>a+b,0)/ps.length; if(v<wv){wv=v;worst=r;} }
    news(t_("eng.allenatore_presidente_il_reparto",{n:t.coach.n,v:{D:'difensori',C:'centrocampisti',A:'attaccanti'}[worst]}),'coach',false,0);
  }
  const sad = pl.filter(p=>p.mor<6.5 && p.amb>11);
  if(sad.length && rnd()<0.4){ const p=sad[0]; news(t_("eng.e_scontento_per_il",{fn:p.fn,ln:p.ln}),'player',false,0); }
}
function botMarket(){
  for(const b of G.T){ if(b.id===0 || finInit(b).excluded || b.pl.length>=17) continue;
    const need=['P','D','C','A'].map(r=>[r,teamPlayers(b).filter(p=>p.r===r).length]).sort((x,y)=>(x[1]/({P:2,D:5,C:5,A:4}[x[0]]))-(y[1]/({P:2,D:5,C:5,A:4}[y[0]])))[0][0];
    const fa=G.FA.map(id=>G.P[id]).filter(p=>p&&!p.retired&&p.r===need&&p.wg*1.1<Math.max(8000,(roundIncome(b)-wageBill(b)-staffCost(b))+wageBill(b)*0.12)).sort((x,y)=>ovr(y)-ovr(x))[0];
    if(fa){ G.FA=G.FA.filter(x=>x!==fa.id); addToTeam(b,fa); fa.ct=2; fa.renewNo=null; } }
  if(rnd()<0.35 && G.FA.length){
    const b = G.T[ri(1,7)]; const id = pick(G.FA); const p=G.P[id];
    if(b.pl.length<20 && ovr(p)>avgTop(teamPlayers(b))-2){ G.FA=G.FA.filter(x=>x!==id); addToTeam(b,p); p.ct=2; }
  }
}

/* ====================== STATISTICHE, ALBO D'ORO, PRESIDENTI, PREMI (0.4.1.0) ======================
   Dati compatti, pensati per una lega con più presidenti umani (lo storico si può tenere separato dallo stato):
   - giocatore: p.apps e p.gl restano presenze e gol della CARRIERA (li usano capitano, clima e morale: non si azzerano);
     p.cr=[somma dei voti×10, voti] della carriera; p.ss=[presenze, gol, somma voti×10, voti, club] della stagione in corso
     (nasce alla prima presenza); p.sh=[[stagione, club, presenze, gol, media×10|null], …] le stagioni chiuse (club = l'ultimo in cui ha giocato).
   - G.albo: una riga per stagione chiusa {s, r:[club in ordine di classifica], cc:[pid,nome,club,gol]|null (capocannoniere),
     mg:[pid,nome,club,media×10,presenze]|null (miglior giovane), rt:[retrocesse], es:[escluse], pr:[[club,popolarità,sponsor,premio],…]}
     (premio: 1, 2, 3 = piazzamento, 0 = club del capocannoniere); rc:1 = riga ricostruita da un salvataggio vecchio.
   - G.prs: presidenti umani [{id, n, u:1, t:club guidato, h:[[stagione, club, posto, scudetti, consuntivo 1/0/null,
     licenziato (0 = no, giornata del licenziamento, 15 = a fine stagione), reputazione|null], …]}]. I club del computer
     non hanno un presidente con nome: per loro il riferimento resta il club.
   Gli indici dei club cambiano solo con swapTeams: remapClubs li aggiorna ovunque. Nessuna funzione qui usa rnd(). */
/* premi: [popolarità, aumento degli sponsor] per prima, seconda e terza; sc = popolarità al club del capocannoniere (tools/multi.js li può cambiare con PRIZES=…) */
const PRIZES={pos:[[8,0.10],[4,0.05],[2,0.03]], sc:2}, YOUNG_AGE=21;
function mkPres(){ return {id:'p1', n:t_("eng.il_presidente"), u:1, t:0, h:[]}; }
function statApp(p,club,v){ const s=p.ss||(p.ss=[0,0,0,0,club]); s[0]++; s[4]=club;
  if(typeof v==='number'){ const x=Math.round(v*10); s[2]+=x; s[3]++; const c=p.cr||(p.cr=[0,0]); c[0]+=x; c[1]++; } }
function statGoal(p){ (p.ss||(p.ss=[0,0,0,0,p.team]))[1]++; }
const avg10=(sum,n)=>n?Math.round(sum/n):null;
function seaStat(p){ const s=p.ss; return s?{a:s[0],g:s[1],v:avg10(s[2],s[3]),c:s[4]}:{a:0,g:0,v:null,c:p.team}; }
function carStat(p){ const c=p.cr; return {a:p.apps||0,g:p.gl||0,v:c?avg10(c[0],c[1]):null}; }
function closePlayerSeasons(){ for(const p of Object.values(G.P)){ const s=p.ss; if(!s) continue;
  if(s[0]>0||s[1]>0) (p.sh||(p.sh=[])).push([G.season,s[4],s[0],s[1],avg10(s[2],s[3])]); delete p.ss; } }
/* capocannoniere: più gol; a parità meno presenze, poi il numero del giocatore */
function topScorer(){ let b=null; for(const p of Object.values(G.P)){ const s=p.ss; if(!s||!s[1]) continue;
  if(!b||s[1]>b.ss[1]||s[1]===b.ss[1]&&(s[0]<b.ss[0]||s[0]===b.ss[0]&&p.id<b.id)) b=p; } return b; }
/* miglior giovane: 21 anni o meno a fine stagione, almeno metà delle partite giocate, media voto più alta; a parità più presenze */
function bestYoung(){ const min=Math.ceil(G.sched.length/2); let b=null, bv=-1;
  for(const p of Object.values(G.P)){ const s=p.ss; if(!s||p.age>YOUNG_AGE||s[0]<min||!s[3]) continue; const v=s[2]/s[3];
    if(!b||v>bv+1e-9||Math.abs(v-bv)<=1e-9&&(s[0]>b.ss[0]||s[0]===b.ss[0]&&p.id<b.id)){ b=p; bv=v; } } return b; }
/* chiude la stagione della lega: riga dell'albo d'oro, statistiche dei giocatori nello storico, premi */
function closeLeague(st, excl){
  const sc=topScorer(), yg=bestYoung(), nm=p=>p.fn+' '+p.ln;
  const row={s:G.season, r:st.map(t=>t.id), cc:sc?[sc.id,nm(sc),sc.ss[4],sc.ss[1]]:null, mg:yg?[yg.id,nm(yg),yg.ss[4],avg10(yg.ss[2],yg.ss[3]),yg.ss[0]]:null, rt:[], es:excl, pr:[]};
  (G.albo||(G.albo=[])).push(row);
  awardPrizes(row); closePlayerSeasons(); return row; }
/* premi di fine stagione: popolarità subito, sponsor più alti solo nella stagione dopo (t.spB); stesse regole per tutti i club */
function awardPrizes(row){ const S=row.s;
  G.T.forEach(t=>{ delete t.spB; });
  const give=(id,pop,sp,k)=>{ const t=G.T[id]; if(!t) return; t.pop=clamp(t.pop+pop,10,100); if(sp) t.spB=[S+1,sp]; row.pr.push([id,pop,sp,k]); return t; };
  const pc=x=>Math.round(x*100)+'%';
  row.r.slice(0,3).forEach((id,i)=>{ if(row.es.includes(id)) return; const [pp,sp]=PRIZES.pos[i], t=give(id,pp,sp,i+1);
    news(i===0?t_("eng.premi_della_stagione_campione",{S:S,n:t.n,pp:pp,pc:pc(sp)})
      :t_("eng.premi_della_stagione_classificat",{S:S,n:t.n,v:i===1?'seconda':'terza',pp:pp,pc:pc(sp)}),'match',true,id); });
  if(row.cc && row.cc[2]!=null && G.T[row.cc[2]]){ const t=give(row.cc[2],PRIZES.sc,0,0);
    news(t_("eng.premi_della_stagione_e",{S:S,v:row.cc[1],n:t.n,v2:row.cc[3],sc:PRIZES.sc}),'match',true,row.cc[2]); }
  if(row.mg) news(t_("eng.premi_della_stagione_miglior",{S:S,v:row.mg[1],v2:G.T[row.mg[2]]?' ('+G.T[row.mg[2]].n+')':'',fDec:fDec(row.mg[3]/10),v3:row.mg[4]}),'match',true,row.mg[2]); }
/* carriera dei presidenti umani: una riga per stagione e per club guidato */
function closePresidents(st){ (G.prs||[]).forEach(pr=>{ const t=G.T[pr.t]; if(!pr.u||!t) return; const f=finInit(t), h=f.budH&&f.budH[0], pos=st.indexOf(t)+1;
  pr.h.push([G.season, pr.t, pos, pos===1?1:0, h&&h.s===G.season?(h.ok?1:0):null, G.pendFire&&pr.t===0?15:0, Math.round((G.rep??50)*10)/10]); }); }
/* licenziato a metà stagione: la riga del club lasciato si chiude quando accetta la nuova società */
function presLeave(pr,md){ const t=G.T[pr.t]; if(!t) return; pr.h.push([G.season, pr.t, standings().indexOf(t)+1, 0, null, md, Math.round((G.rep??50)*10)/10]); }
function remapClubs(sw){ const S=x=>x==null?x:sw(x);
  (G.albo||[]).forEach(r=>{ r.r=r.r.map(S); if(r.cc) r.cc[2]=S(r.cc[2]); if(r.mg) r.mg[2]=S(r.mg[2]); r.rt=(r.rt||[]).map(S); r.es=(r.es||[]).map(S); (r.pr||[]).forEach(x=>{ x[0]=S(x[0]); }); });
  Object.values(G.P).forEach(p=>{ if(p.ss) p.ss[4]=S(p.ss[4]); (p.sh||[]).forEach(h=>{ h[1]=S(h[1]); }); });
  (G.prs||[]).forEach(pr=>{ pr.t=S(pr.t); pr.h.forEach(h=>{ h[1]=S(h[1]); }); });
  (G.news||[]).forEach(n=>{ if(n.club!=null) n.club=S(n.club); }); }
/* salvataggi della v0.037 (0.4.0.0) e prima: presenze e gol diventano la carriera; albo e carriera del presidente ricostruiti da f.budH */
function m1Migrate(){ if(G.albo) return false;
  Object.values(G.P).forEach(p=>{ const r=(p.rts||[]).filter(x=>typeof x==='number');
    if(r.length) p.cr=[r.reduce((a,x)=>a+Math.round(x*10),0), r.length];
    if(G.season===1 && ((p.apps||0)>0||(p.gl||0)>0)) p.ss=[p.apps||0, p.gl||0, p.cr?p.cr[0]:0, p.cr?p.cr[1]:0, p.team]; });
  const H=t=>(t.fin&&t.fin.budH)||[], ss=new Set();
  G.T.forEach(t=>H(t).forEach(h=>{ if(h.s<G.season && h.pos) ss.add(h.s); }));
  G.albo=[...ss].sort((a,b)=>a-b).map(s=>({s, r:G.T.map(t=>{ const h=H(t).find(x=>x.s===s); return h?[t.id,h.pos]:null; }).filter(Boolean).sort((a,b)=>a[1]-b[1]).map(x=>x[0]), cc:null, mg:null, rt:[], es:[], pr:[], rc:1}));
  const pr=mkPres(); let from=1;
  if(G.prez>0){ const nw=(G.news||[]).find(n=>/^Nuovo incarico: sei il presidente di /.test(n.t||'')); from=nw?nw.s:Infinity; }
  pr.h=H(G.T[0]).filter(h=>h.s>=from&&h.s<G.season).sort((a,b)=>a.s-b.s).map(h=>[h.s,0,h.pos,h.pos===1?1:0,h.ok?1:0,0,null]);
  G.prs=[pr]; G.v=2; return true; }

function endSeason(){
  const st = standings(); const champ=st[0]; const upos = st.findIndex(t=>t.id===0)+1;
  const excl = st.filter(t=>t.fin&&t.fin.excluded).map(t=>t.id);
  G.T.forEach(t=>wageCheck(t,4));
  G.T.forEach(t=>ultCheck(t));
  st.forEach((t,i)=>{ t.prevPos=i; if(t.obj && t.obj.s===G.season){ closeMission(t,'obiettivo',i<t.obj.lim?'ok':'end',i<t.obj.lim?t_("eng.raggiunto_posto_premio_di",{i:i+1,amt:kcrE(t.obj.amt)}):t_("eng.non_raggiunto_posto_il",{i:i+1})); if(i<t.obj.lim){ spend(t,'premi',t.obj.amt); teamMor(t,0.6,t_("eng.premio_obiettivo_incassato")); news(t_("eng.obiettivo_raggiunto_pagato_il",{n:t.n,goal:t.obj.goal,amt:kcrE(t.obj.amt)}), t.id===0?'club':'match',true,t.id); } t.obj=null; } t.promise=null; t.bonus=null; });
  (G.req||[]).forEach(r=>{ if(r.st==='open') r.st='exp'; });
  st.forEach((t,i)=>{ earn(t,'premi campionato',60000+(7-i)*30000); });
  G.T.forEach(t=>{ const f=finInit(t);
    if(f.excluded){ f.arr=[]; f.excluded=false; const pl=teamPlayers(t).sort((a,b)=>b.wg-a.wg); pl.slice(0,3).forEach(p=>{ t.pl=t.pl.filter(x=>x!==p.id); p.team=null; G.FA.push(p.id); }); t.cash=Math.max(t.cash,150000); ensureCaptains(t,true); news(t_("eng.riparte_dopo_l_esclusione",{n:t.n}), t.id===0?'club':'match',true,t.id); }
    f.pen=f.penNext; f.penNext=0; if(f.pen) news(t_("eng.parte_con_punti_di",{n:t.n,pen:f.pen}), t.id===0?'club':'match',true,t.id);
    f.arr.forEach(a=>{ a.s=G.season+1; a.p=0; });
    f.hist.unshift({s:G.season,md:14,t:t_("eng.chiusura_stagione_entrate_uscite",{reduce:kcrE(Object.values(f.sea.inc).reduce((a,b)=>a+b,0)),reduce2:kcrE(Object.values(f.sea.exp).reduce((a,b)=>a+b,0))})});
    closeBudget(t);
    f.prev=f.sea; f.sea={inc:{},exp:{}}; f.checks=[]; });
  news(t_("eng.fine_stagione_vince_il",{season:G.season,n:champ.n,upos:upos}),'club',true,champ.id);
  closePresidents(st); closeLeague(st, excl);
  for(const t of G.T){
    const pl=teamPlayers(t);
    for(const p of pl){ p.age++; s1Invecchia(p); p.ct--; p.fat=0; if(p.age>=34 && rnd()<0.5 || p.age>=36){ t.pl=t.pl.filter(x=>x!==p.id); p.team=null; p.retired=true; if(t.id===0) news(t_("eng.si_ritira_dal_calcio",{fn:p.fn,ln:p.ln,age:p.age}),'player',false,t.id); } }
    teamPlayers(t).forEach(p=>{ if(p.ct<=0){ if(p.renewNo===G.season && t.pl.length>16){ t.pl=t.pl.filter(x=>x!==p.id); p.team=null; p.ct=0; G.FA.push(p.id); news(t_("eng.lascia_a_parametro_zero",{fn:p.fn,ln:p.ln,n:t.n}), t.id===0?'market':'match',true,t.id); } else { p.ct=ri(1,3); p.wg=Math.max(p.wg,wage(p)); } } });
    ensureCaptains(t,t.id!==0);
    const sgL=facLevel(t,'sg')-1, ny = 2+(rnd()<0.4+0.15*sgL?1:0);
    for(let i=0;i<ny;i++){ const r=pick(['P','D','C','C','A']); const p=mkPlayer(r, 6.2+rnd()*1.5+0.4*sgL, ri(16,17)); addToTeam(t,p); if(t.id===0) news(t_("eng.dal_settore_giovanile_arriva",{fn:p.fn,ln:p.ln,age:p.age,toLowerCase:ROLE_NAME[r].toLowerCase()}),'player',false,t.id); }
    t.tab={g:0,v:0,n:0,p:0,gf:0,gs:0,pt:0}; t.form=[];
    while(t.pl.length>22){ const worst=teamPlayers(t).sort((a,b)=>value(a)-value(b))[0]; t.pl=t.pl.filter(x=>x!==worst.id); worst.team=null; G.FA.push(worst.id); }
  }
  G.FA = G.FA.filter(id=>!G.P[id].retired && G.P[id].age<35);
  for(let i=0;i<6;i++){ const young=rnd()<0.6; const p=mkPlayer(pick(['P','D','C','A']), young?7+rnd():8+rnd()*1.5, young?ri(17,20):ri(29,33)); p.team=null; p.wg=wage(p); p.ct=0; G.P[p.id]=p; G.FA.push(p.id); }
  G.season++; G.md=0; G.res=[]; G.last=null; G.sched=schedule(8);
  G.T.forEach(t=>{ pledgeSweep(t); ensureBudget(t); });
  firePending();
}


