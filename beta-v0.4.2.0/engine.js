'use strict';
/* ================= MOTORE DI GIOCO ================= */
let G = null;

/* 22 attributi da 1 a 20: tecnici, mentali, fisici e del portiere. Altezza e piede sono a parte. */
const ATTR_GROUPS = [
  ['Tecnici',  ['pas','ctr','dri','crs','tir','lun','tes','con','cpz']],
  ['Mentali',  ['vis','dec','pos','fre','agg']],
  ['Fisici',   ['vel','res','for','ele']],
  ['Portiere', ['par','pre','usc','rin']]
];
const ATTR = ATTR_GROUPS.flatMap(g=>g[1]);
const GK_ATTR = ['par','pre','usc','rin'];
const ATTR_LABEL = {pas:'Passaggio',ctr:'Primo controllo',dri:'Dribbling',crs:'Cross',tir:'Finalizzazione',lun:'Tiro da fuori',tes:'Colpo di testa',con:'Contrasto',cpz:'Calci piazzati',
  vis:'Visione',dec:'Decisioni',pos:'Posizionamento',fre:'Freddezza',agg:'Aggressività',vel:'Velocità',res:'Resistenza',for:'Forza',ele:'Elevazione',
  par:'Riflessi',pre:'Presa',usc:'Uscite',rin:'Rinvio'};
const ATTR_HELP = {ctr:'Controllo della palla appena ricevuta',crs:'Precisione dei cross',tir:'Precisione e potenza sotto porta',lun:'Tiri dalla distanza',cpz:'Punizioni, angoli e rigori',
  dec:'Scegliere la giocata giusta',fre:'Lucidità sotto porta e sotto pressione',agg:'Voglia di contrastare (e rischio di fallo)',for:'Duelli fisici e protezione palla',ele:'Salto nei duelli aerei',
  par:'Parate sui tiri',pre:'Bloccare la palla senza respingerla',usc:'Uscite su cross e attaccanti',rin:'Precisione dei rinvii'};
const ROLE_W = {
  P:{par:4,pre:2,usc:2,pos:2,rin:1,dec:0.5},
  D:{con:3,pos:3,tes:2,ele:1,for:1.5,vel:1,pas:1,dec:1,ctr:0.5},
  C:{pas:3,vis:2.5,ctr:2,dec:2,res:1.5,con:1,dri:1,lun:0.5,tir:0.5},
  A:{tir:3,fre:2,dri:2,vel:2,ctr:1.5,pos:1.5,tes:1,lun:0.5}
};
/* profili: danno a ogni giocatore un carattere tecnico riconoscibile */
const PROFILES = {
  P:[['Portiere completo',{}],['Para tutto',{par:2,pre:1,usc:-1,rin:-1}],['Portiere moderno',{rin:2,usc:1,pas:1,pre:-1}],['Dominatore dell\'area',{usc:2,ele:1,pre:1,par:-1}]],
  D:[['Stopper',{con:2,for:2,agg:2,tes:1,pas:-1,vel:-1}],['Difensore moderno',{pas:2,ctr:1,dec:1,vis:1,for:-1}],['Terzino di spinta',{vel:2,crs:2,res:1,tes:-2,ele:-1}],['Torre',{tes:2,ele:2,for:1,vel:-2,ctr:-1}],['Difensore di posizione',{pos:2,dec:2,agg:-1,vel:-1}]],
  C:[['Regista',{pas:2,vis:2,dec:1,con:-1,for:-1}],['Mediano',{con:2,agg:2,res:1,for:1,vis:-1,dri:-1}],['Tuttocampista',{res:2,vel:1,con:1}],['Trequartista',{vis:2,dri:2,lun:1,con:-2,agg:-1}],['Esterno',{vel:2,crs:2,dri:1,con:-1,tes:-1}],['Tiratore',{lun:2,cpz:2,tir:1,res:-1}]],
  A:[['Bomber d\'area',{tir:2,fre:2,pos:2,dri:-1,pas:-1}],['Attaccante rapido',{vel:3,dri:1,tes:-1,for:-1}],['Ariete',{tes:2,ele:2,for:2,vel:-2,dri:-1}],['Seconda punta',{pas:2,vis:2,dri:1,tes:-1}],['Ala',{dri:2,vel:2,crs:1,tes:-2}]]
};
const ROLE_NAME = {P:'Portiere',D:'Difensore',C:'Centrocampista',A:'Attaccante'};
const COACH_MODS = ['4-4-2','4-3-3','4-2-3-1','3-5-2','4-5-1'];
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

function ovr(p){ const w=ROLE_W[p.r]; let s=0,t=0; for(const k in w){ s+=(p.a[k]??10)*w[k]; t+=w[k]; } return s/t; }

function mkPlayer(role, L, age, potBoost){
  const p = {id:G.nid++, fn:pick(FIRST), ln:pick(LAST), r:role, age, a:{}, mor:12, fat:0, min:0.5,
    prof:clamp(Math.round(12+gauss()*1.6),4,20), amb:clamp(Math.round(11+gauss()*1.8),3,20), tem:clamp(Math.round(9+gauss()*1.8),2,20),
    e:{}, apps:0, gl:0, rts:[], team:null};
  genAttrs(p, L, rnd);
  p.e.pot = rnd()-0.5;
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
  if(p.a.ctr!=null && p.h) return;
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
  const mods = COACH_MODS;
  const c={n:pick(FIRST)+' '+pick(LAST), tat:clamp(Math.round(L+gauss()*1.5),3,20), all:clamp(Math.round(L+gauss()*1.5),3,20),
    gio:clamp(Math.round(10+gauss()*2.5),3,20), ges:clamp(Math.round(L+gauss()*1.5),3,20), mod:pick(mods), age:ri(38,64), squal:0};
  c.car=coachTemper(c); return c;
}
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
  G.T.forEach(t=>{ if(t.coach && t.coach.car==null){ t.coach.car=coachTemper(t.coach); t.coach.squal=t.coach.squal||0; } });
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
  if(!quiet && t.id===0 && G.P[t.cap] && old!=null && old!==t.cap) news(`${G.P[t.cap].fn} ${G.P[t.cap].ln} è il nuovo capitano; vice ${G.P[t.vcap].ln}.`,'club',false,t.id);
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
  const names = [{n:clubName||'FC Presidente', c:'#d9d2bf'}, ...CLUBS];
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
  news('Benvenuto, presidente. Il tuo allenatore è '+G.T[0].coach.n+'. Hai 3 relazioni dell\'osservatore a disposizione per ogni giornata.','club',false,0);
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
  const q = t ? 0.85+0.08*(t.fac.cs-1)+(t.coach.all-10)*0.015 : 0.7;
  const pr = 0.7+p.prof/40, m = 0.6+0.6*p.min, w=ROLE_W[p.r];
  for(const k of ATTR){
    if(GK_ATTR.includes(k) && p.r!=='P') continue;
    const phys=k==='vel'||k==='res'||k==='ele';
    let d = c>=0 ? c*gap*q*pr*m*(w[k]? 0.6+0.8*rnd() : 0.25*rnd()) : c*(phys?1.6:k==='dec'||k==='vis'||k==='pos'?-0.4:0.6)*(0.5+rnd());
    d += (rnd()-0.5)*0.05;
    p.a[k] = Math.round(clamp(p.a[k]+d,1,20)*100)/100;
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
    [H,A].forEach((t,side)=>{ const c=t.coach; if(c.squal>0 && inp.t[side].coach.absent) c.squal--; if(m.coachOff[side]){ c.squal=1; news(`${c.n} (${t.n}) è stato allontanato dall'arbitro ${RT.n}: salterà la prossima partita.`, t.id===0?'club':'match',true,t.id); } });
  });
  for(const t of G.T){
    const pl=teamPlayers(t);
    const m = out.find(x=>x.h===t.id||x.a===t.id), side=m.h===t.id?0:1;
    const played=new Set(m.played[side]);
    updMorale(t,m,side);
    for(const p of pl){
      const mins=m.mins[p.id]||0;
      p.min = 0.7*(p.min??0.5) + 0.3*Math.min(1,mins/90);
      if(played.has(p.id)) p.fat = clamp((100-(m.endSt[p.id]??80))*0.8,0,60);
      if(p.inj>0 && !(m.inj[p.id])) p.inj--;
      if(p.sq>0 && !m.red.includes(p.id) && !played.has(p.id)) p.sq--;
      grow(p,t);
    }
    roundFinance(t,m,m.h===t.id);
    if(t.build){ t.build.left--; if(t.build.left<=0){ t.fac[t.build.k]=facLevel(t,t.build.k)+1; if(t.id===0) news(({st:'Lo stadio',cs:'Il centro sportivo',sg:'Il settore giovanile'})[t.build.k]+' è salito al livello '+t.fac[t.build.k]+'.','club',false,t.id); t.build=null; } }
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
  news(`Giornata ${G.md}: ${home?G.T[0].n+' – '+opp.n:opp.n+' – '+G.T[0].n} ${um.gh}-${um.ga}. ${ug>og?'Vittoria!':ug<og?'Sconfitta.':'Pareggio.'}`,'match',true,0);
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
    if(m.inj[id]){ p.inj=m.inj[id]; if(T.id===0) news(`${p.fn} ${p.ln} si è infortunato: starà fuori ${p.inj} ${p.inj>1?'giornate':'giornata'}.`,'player',false,T.id); }
    if(m.red.includes(id)){ p.sq=1; if(T.id===0) news(`${p.fn} ${p.ln} è stato espulso: salterà la prossima giornata.`,'player',false,T.id); } }));
  m.scorers.forEach(s=>{ const p=G.P[s.pid]; p.gl++; statGoal(p); });
  H.pop = clamp(H.pop + res*1.2,10,100); A.pop = clamp(A.pop - res*1.2,10,100);
}

/* ====================== ECONOMIA DEL CLUB ======================
   Entrate e uscite per giornata, prestiti, stipendi con le scadenze di controllo e le penalizzazioni
   come in Serie A (adattate a 14 giornate): controlli dopo le giornate 4, 7, 10 e 13, più la fine stagione. */
const CHECKS=[4,7,10,13];
const CHECK_LBL=['1° controllo (come il 30 settembre)','2° controllo (come il 16 novembre)','3° controllo (come il 16 febbraio)','4° controllo (come il 16 maggio)','fine stagione (come il 30 settembre successivo)'];
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
  if(!ok){ const pl=teamPlayers(t); pl.forEach(p=>{ p.mor=clamp(p.mor-0.6,1,20); }); if(t.id===0) news(`Cassa vuota: questa giornata gli stipendi non sono stati pagati per intero (arretrati ${kcrE(arrears(t))}).`,'club',false,t.id); }
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
  f.checks.push({s:G.season,k,ok:false,pts,next:k>=3}); if(t.id===0) repAdd(-3,'stipendi non pagati al controllo');
  teamPlayers(t).forEach(p=>{ p.mor=clamp(p.mor-1.2,1,20); addCause(p,'stipendi non pagati',-1.2); }); t.coach.mor=clamp((t.coach.mor??12)-1,1,20);
  news(`${t.n}: stipendi non in regola al ${lbl}. Penalizzazione di ${pts} punti${k>=3?' da scontare la prossima stagione':''}.`, t.id===0?'club':'match',true,t.id);
}
function exclude(t){
  const f=finInit(t); f.excluded=true; if(t.id===0) repAdd(-10,'squadra esclusa dal campionato');
  news(`${t.n} escluso dal campionato: stipendi non pagati anche al 3° controllo. Le partite restanti sono perse a tavolino 0-3.`, t.id===0?'club':'match',true,t.id);
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
    if(buyers.length){ const b=buyers.sort((x,y)=>y.cash-x.cash)[0]; budVary(b,'acquisti',amt); spend(b,'acquisti',amt); b.pl.push(p.id); p.team=b.id; p.ct=ri(2,3); news(`${t.n}, in difficoltà con i conti, cede ${p.fn} ${p.ln} a ${b.n} per ${kcrE(amt)}.`,'market',true,t.id); }
    else { p.team=null; p.abroad=true; news(`${t.n}, in difficoltà con i conti, cede ${p.fn} ${p.ln} all'estero per ${kcrE(amt)}.`,'market',true,t.id); }
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
  if(t.id!==0) resolveReq(r, botChoice(t,r), true); else news(`Nuova richiesta nell'Ufficio: ${REQ_KIND[kind].toLowerCase()} — rispondi entro la giornata ${r.due+1}.`,'club',false,t.id); return r; }
const REQ_KIND={aumento:'Aumento di stipendio', rinnovo:'Rinnovo del contratto', premio:'Premio partita', obiettivo:'Premio obiettivo', rinforzo:'Richiesta di rinforzo', offerta:'Offerta per un giocatore'};
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
      txt: ren ? `${p.fn} ${p.ln} ha il contratto in scadenza: chiede il rinnovo per 3 anni a ${nw} cr a giornata (ora ${p.wg}, +${Math.round(r*100)}%).`
               : `${p.fn} ${p.ln} sta rendendo bene${S>0.4?' e la squadra vola':''}: chiede l'aumento da ${p.wg} a ${nw} cr a giornata (+${Math.round(r*100)}%).`}); made++; }
  /* 2. premio partita, chiesto dal capitano prima delle partite che contano */
  const nx=G.sched[G.md]; if(nx && room() && G.md>=1){ const f2=nx.find(x=>x.includes(t.id)); const opp=G.T[f2[0]===t.id?f2[1]:f2[0]], op=standings().indexOf(opp);
    if((op<=2 || Math.abs(op-pos)<=1) && !open.some(r=>r.kind==='premio') && rnd()<0.45){ const cap=G.P[t.cap];
      const amt=Math.round((14000+30000*Math.max(0,S+0.25))*(op<=1?1.3:1)/1000)*1000;
      mkReq(t,'premio',{pid:cap?cap.id:null, amt, opp:opp.id, mdx:G.md, txt:`Il capitano ${cap?cap.ln:''} chiede, a nome della squadra, un premio di ${Math.round(amt/1000)}k in caso di vittoria contro ${opp.n} (${op+1}° in classifica).`}); made++; } }
  /* 3. premio obiettivo stagionale */
  if(room() && G.md>=3 && G.md<=5 && t.objS!==G.season && rnd()<0.5){ t.objS=G.season; const cap=G.P[t.cap];
    const [k,lim,base]= pos<=1?['vincere il campionato',1,170000]: pos<=3?['arrivare tra le prime quattro',4,85000]:['arrivare tra le prime sei',6,40000];
    const amt=Math.round(base*(1+Math.max(0,S)*1.1)/5000)*5000;
    mkReq(t,'obiettivo',{pid:cap?cap.id:null, amt, lim, goal:k, txt:`Il capitano ${cap?cap.ln:''} chiede un premio collettivo di ${Math.round(amt/1000)}k se la squadra riesce a ${k}.`}); made++; }
  /* 4. l'allenatore chiede un rinforzo (solo per il presidente umano: per il computer è il mercato) */
  if(t.id===0 && room() && !t.promise && !open.some(r=>r.kind==='rinforzo') && G.md>=2 && rnd()<0.14+0.12*Math.max(0,S)){
    const need=formNeed(t.coach.mod); let worst=null,wv=99; for(const r of ['D','C','A']){ const ps=pl.filter(p=>p.r===r).map(ovr).sort((a,b)=>b-a).slice(0,need[r]); const v=ps.length<need[r]?0:ps.reduce((a,b)=>a+b,0)/ps.length; if(v<wv){wv=v;worst=r;} }
    const thr=Math.round((avgTop(pl)+(S>0.3?0.4:0)-0.2)*10)/10;
    mkReq(t,'rinforzo',{role:worst, thr, due:G.md+2, pdue:G.md+5, txt:`${t.coach.n} chiede un ${ {D:'difensore',C:'centrocampista',A:'attaccante'}[worst] } di valore almeno ${String(thr).replace('.',',')} entro la giornata ${G.md+5}.`}); made++; }
}
/* le rivali corteggiano le stelle delle squadre in vetta */
function seekBuyer(p){ const t=G.T[p.team], v=value(p);
  const buyers=G.T.filter(b=>b.id!==t.id && b.id!==0 && !finInit(b).excluded && b.cash>v*0.8 && b.pl.length<22); if(!buyers.length) return null;
  const b=buyers[Math.floor(rnd()*buyers.length)], amt=Math.round(v*(0.78+rnd()*0.22)/5000)*5000;
  const r=mkReq(t,'offerta',{pid:p.id, buyer:b.id, amt, due:G.md+1, txt:`Su tua richiesta, ${b.n} offre ${Math.round(amt/1000)}k per ${p.fn} ${p.ln} (valore ${Math.round(v/1000)}k).`}); return r; }
function rivalOffers(){
  const st=standings();
  for(const t of G.T){ const pos=st.indexOf(t); if(finInit(t).excluded) continue;
    const stars=teamPlayers(t).sort((a,b)=>ovr(b)-ovr(a)).slice(0,3); const ch=(pos<=1?0.07:pos<=3?0.03:0)+(t.id===0?0:0.01);
    for(const p of stars){ if(!(rnd()<ch+(p.wantOut?0.12:0))) continue; if(openReqs(t).some(r=>r.pid===p.id)) continue;
      const foreign = pos<=1 && rnd()<0.5;
      const buyers=G.T.filter(b=>b.id!==t.id && b.id!==0 && !finInit(b).excluded && b.cash>value(p)*1.05 && b.pl.length<22 && wageRatio(b)<0.9); if(!buyers.length && !foreign) continue;
      const b=foreign?{id:-1,n:FOREIGN[Math.floor(rnd()*FOREIGN.length)]}:buyers[Math.floor(rnd()*buyers.length)], amt=Math.round(value(p)*(foreign?1.15+rnd()*0.3:1.02+rnd()*0.25)/5000)*5000;
      mkReq(t,'offerta',{pid:p.id, buyer:b.id, bn:b.n, amt, txt:`${b.n} offre ${Math.round(amt/1000)}k per ${p.fn} ${p.ln} (valore ${Math.round(value(p)/1000)}k).${p.wantOut?' Il giocatore ha chiesto di essere ceduto.':''}`}); break; } }
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
  if(r.kind==='rinnovo'||r.kind==='aumento') return {lo:r.old, hi:r.nw, step:50, unit:'cr a giornata', E:r.kind==='rinnovo'?50:32, oneoff:true};
  if(r.kind==='rinforzo') return {lo:Math.round((r.thr-2)*10)/10, hi:r.thr, step:0.1, unit:'di valore minimo', E:0, oneoff:false};
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
function openNeg(r){ if(r.neg) return r.neg; if(r.kind==='offerta'){ r.neg=offSetup(r); r.neg.pat0=r.neg.pat; return r.neg; } r.neg=negSetup(r); r.neg.pat0=r.neg.pat; reqMorAdd(r, reqWho(r).type==='t'?-0.15:-0.3, 'il presidente ha voluto trattare'); return r.neg; }
function negPropose(r,v,oo,m){ const n=r.neg, R=negRange(r); if(!n||n.st!=='open') return;
  v=negRound(R,v,false); oo=Math.max(0,Math.round(oo||0)); n.hist.push({by:'pres',v,oo,m:m||null});
  /* la motivazione: se è credibile rende più paziente e disponibile, se non lo è irrita */
  let cm=1, km=1, pre=''; if(m){ const t=G.T[r.team]; n.used=n.used||{}; const rep=n.used[m]||0; n.used[m]=rep+1; let cr=credibility(t,r,m); if(rep) cr*=0.5;
    if(cr>0.5){ cm=0.65; km=1.35; pre=rep?'Me l\'ha già detto. ':'Capisco. '; } else if(cr<0){ cm=1.4; km=0.8; pre='Non mi prenda in giro: '+credTxt(t,r,m,cr).replace(/: non ci crede$/,'')+'. '; reqMorAdd(r,-0.15,'motivazione del presidente non credibile'); } else { cm=0.9; pre='Mah. '; } }
  const ve=negEff(r,v,oo);
  if(ve>=n.M-1e-9){ n.hist.push({by:'req',txt:pre+'Affare fatto.'}); n.st='deal'; resolveReq(r,'deal',false,{v,oo,opened:true}); return; }
  const g=clamp((n.M-ve)/Math.max(1e-9,R.hi-R.lo),0,1); n.pat=Math.max(0,n.pat-(10+75*Math.pow(g,1.1))*cm);
  if(g>0.7) reqMorAdd(r,-0.15,'proposta giudicata offensiva');
  if(n.pat<=0){ n.st='stalled'; n.hist.push({by:'req',v:n.c,txt:pre+'La mia pazienza è finita. Decida lei. Io resto su'}); return; }
  const nc=Math.max(n.M, n.c-(n.c-n.M)*Math.min(0.8,n.k*km)-(R.hi-R.lo)*0.015); n.c=negRound(R,nc,true); if(n.c<n.M) n.c=negRound(R,n.M,true);
  const prev=n.hist.filter(h=>h.by==='req'&&h.v!=null).slice(-1)[0], moved=prev?n.c<prev.v-1e-9:n.c<R.hi-1e-9;
  n.hist.push({by:'req',v:n.c,txt:pre+(!moved?(g>0.7?'Mi sembra poco serio. Resto su':'Non scendo, resto su'):(n.c-n.M)<(R.hi-R.lo)*0.04?'Questa è la mia ultima offerta:':g>0.7?'Mi sembra poco serio. Posso arrivare a':'Posso venirle incontro:')}); }
const NEG_MOT={conti:'Siamo in rosso con il bilancio', futuro:'Puntiamo alla prossima stagione con acquisti migliori', gruppo:'Il gruppo viene prima del singolo', prestazioni:'Le prestazioni non lo giustificano'};
function credibility(t,r,m){ const ratio=wageRatio(t), wb=wageBill(t), pos=standings().indexOf(t), w=reqWho(r);
  if(m==='conti') return (ratio>0.85||arrears(t)>0||t.cash<wb*4)?1 : (ratio<0.72&&t.cash>wb*14)?-1 : 0.2;
  if(m==='futuro') return (pos>=4||G.md>=10)?0.7 : pos<=1?-0.3 : 0.2;
  if(m==='gruppo'){ const cl=clubClimate(t); return cl>=12.5?0.6 : cl<10?-0.3 : 0.1; }
  if(m==='prestazioni'){ if(w.type!=='p') return 0; const a=avgRt(w.o); return a<6.2?1 : a>6.9?-1 : 0.2; }
  return 0; }
function credTxt(t,r,m,c){ if(m==='conti') return c>0.5?'i conti sono davvero in difficoltà':c<0?`in cassa ci sono ${kcrE(t.cash)}: non ci crede`:'i conti non sono un disastro, ma lo accetta';
  if(m==='futuro') return c>0.5?'capisce il progetto':c<0?'la squadra è in vetta: non ci crede':'non è del tutto convinto';
  if(m==='gruppo') return c>0.5?'lo spogliatoio è sereno, lo accetta':c<0?'con questo clima nello spogliatoio non ci crede':'lo accetta a fatica';
  if(m==='prestazioni') return c>0.5?'sa di non aver reso':c<0?'con i voti che ha non ci sta':'non è d\'accordo, ma tace';
  return ''; }
/* effetti pieni di un sì o di un no, per tipo di richiesta */
function reqLoss(r){ const w=reqWho(r); if(w.type==='p') return -1.8*(1+(w.o.amb-10)*0.05); if(r.kind==='rinforzo') return -1.2; return r.kind==='obiettivo'?-0.9:-0.4; }
function reqGain(r){ return (r.kind==='rinnovo'||r.kind==='aumento')?1.4 : r.kind==='rinforzo'?0.6 : r.kind==='obiettivo'?0.8 : 0.4; }
function applyYes(r,t,p,v,oo){ /* conclude l'accordo al valore v (più eventuale una tantum) */
  const c=t.coach, a=Math.round(v);
  if(r.kind==='rinnovo'||r.kind==='aumento'){ p.wg=a; if(r.kind==='rinnovo'){ p.ct=3; p.renewNo=null; } p.wantOut=false; if(oo) spend(t,'una tantum',oo); return `Accordo con ${p.ln}: ${a} cr a giornata${oo?' più '+kcrE(oo)+' alla firma':''}${r.kind==='rinnovo'?', contratto di 3 anni':''}.`; }
  if(r.kind==='premio'){ t.bonus={md:r.mdx,amt:a}; addMission(t,{kind:'premio',amt:a,opp:r.opp,due:r.mdx+1,title:`Premio partita contro ${G.T[r.opp].n}`}); return `Premio partita: ${kcrE(a)} in caso di vittoria.`; }
  if(r.kind==='obiettivo'){ t.obj={amt:a,lim:r.lim,goal:r.goal,s:G.season}; addMission(t,{kind:'obiettivo',amt:a,lim:r.lim,goal:r.goal,due:14,title:`Obiettivo: ${r.goal}`}); return `Premio obiettivo: ${kcrE(a)} se la squadra riesce a ${r.goal}.`; }
  if(r.kind==='rinforzo'){ t.promise={role:r.role,thr:v,due:r.pdue,s:G.season}; addMission(t,{kind:'rinforzo',role:r.role,roleN:({D:'difensore',C:'centrocampista',A:'attaccante'})[r.role],thr:v,due:r.pdue,title:`Rinforzo per ${c.n}`}); return `Promesso a ${c.n} un ${({D:'difensore',C:'centrocampista',A:'attaccante'})[r.role]} di valore almeno ${String(v).replace('.',',')} entro la giornata ${r.pdue}.`; }
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
    if(ch==='neg' && bot){ const n=negSetup(r); const v=negRound(R,n.M+(R.hi-n.M)*0.25,true); reqMorAdd(r,reqWho(r).type==='t'?-0.15:-0.3,'trattativa con il presidente'); out=applyYes(r,t,p,v,0); r.st='deal'; r.v=v; }
    else if(ch==='acc'){ reqMorAdd(r,reqGain(r),r.kind==='rinforzo'?'il presidente ha promesso un rinforzo':(r.kind==='rinnovo'||r.kind==='aumento')?'richiesta accettata':'premio promesso'); out=applyYes(r,t,p,R.hi,0); r.st='acc'; r.v=R.hi; }
    else if(ch==='deal'){ if(r.neg && o.acc){ r.neg.hist.push({by:'pres',acc:true,v:o.v}); r.neg.hist.push({by:'req',txt:'Bene, siamo d\'accordo.'}); } const full=o.v>=R.hi-1e-9; if(full) reqMorAdd(r,reqGain(r),'richiesta accolta dopo la trattativa'); out=applyYes(r,t,p,o.v,o.oo||0); r.st='deal'; r.v=o.v; if(!full) out+=' Accordo a metà strada.'; }
    else if(ch==='rif'||ch==='exp'){ if(r.neg && ch==='rif'){ r.neg.hist.push({by:'pres',no:true}); } applyNo(r,t,p); const L=reqLoss(r)*(ch==='exp'?0.8:1); reqMorAdd(r,L-openPen,ch==='exp'?'richiesta ignorata dal presidente':'richiesta rifiutata'); r.st=ch;
      const who=reqWho(r); if(who.type==='p' && who.o.amb>=13){ who.o.wantOut=true; out=`${who.o.ln} non la prende bene: vuole andare via.`; } else out=who.type==='c'?`${t.coach.n} non è contento.`:who.type==='t'?'La squadra è delusa.':`${who.o.ln} è deluso.`; }
    else if(ch==='rifm'){ applyNo(r,t,p); const m=o.motive||'conti', cr=credibility(t,r,m), X=Math.max(0,Math.round(o.oo||0));
      const ref = (r.kind==='rinnovo'||r.kind==='aumento') ? Math.max(5000,(R.hi-R.lo)*R.E*0.5) : r.kind==='rinforzo' ? 40000 : Math.max(5000,R.hi*0.5);
      const red=clamp(0.35*cr+0.5*Math.min(1,X/ref),-0.3,0.75), L=reqLoss(r)*(1-red);
      if(X) spend(t,'una tantum',X); reqMorAdd(r,L-openPen,`rifiuto motivato: «${NEG_MOT[m]}»`); r.st='rifm';
      const who=reqWho(r), nm=who.type==='c'?t.coach.n:who.type==='t'?'La squadra':who.o.ln;
      if(who.type==='p' && who.o.amb>=14 && red<0.2) who.o.wantOut=true;
      out=`No motivato${X?' con '+kcrE(X)+' una tantum':''}: «${NEG_MOT[m]}». ${nm}: ${credTxt(t,r,m,cr)}.`;
      if(r.neg){ r.neg.hist.push({by:'pres',no:true,m,oo:X}); r.neg.hist.push({by:'req',txt:(cr>0.5?'Va bene, capisco: ':cr<0?'Non ci credo: ':'Lo accetto, ma non sono contento: ')+credTxt(t,r,m,cr)+(X?`. Grazie per i ${kcrE(X)}.`:'.')}); } }
  }
  r.out=out; f.hist.unshift({s:G.season,md:G.md,t:`${REQ_KIND[r.kind]}: ${out}`}); if(f.hist.length>30) f.hist.length=30;
  if(t.id===0 && !bot) news(out,'club',false,t.id);
}
/* dopo ogni giornata: premi partita, promesse, richieste scadute, malumori, nuove richieste */
function afterRound(out){
  for(const t of G.T){ const m=out.find(x=>x.h===t.id||x.a===t.id), side=m.h===t.id?0:1, win=side?m.ga>m.gh:m.gh>m.ga;
    if(t.bonus && t.bonus.md===G.md-1){ closeMission(t,'premio',win?'ok':'end',win?`Vittoria: premio di ${kcrE(t.bonus.amt)} pagato.`:'Niente vittoria: il premio non è dovuto.'); if(win){ spend(t,'premi',t.bonus.amt); if(t.id===0) news(`Vittoria: pagato il premio partita di ${kcrE(t.bonus.amt)}.`,'club',false,t.id); } t.bonus=null; }
    if(t.promise && G.md>=t.promise.due){ const c=t.coach; c.mor=clamp((c.mor??12)-2,1,20); addCause(c,'promessa di rinforzo non mantenuta',-2); teamMor(t,-0.3,'promessa del presidente non mantenuta'); if(t.id===0) news(`${c.n}: "Mi era stato promesso un rinforzo." La promessa non è stata mantenuta.`,'coach',false,t.id); finInit(t).hist.unshift({s:G.season,md:G.md,t:'Promessa di rinforzo non mantenuta'}); closeMission(t,'rinforzo','ko','Non mantenuta: nessun rinforzo entro la scadenza.'); t.promise=null; }
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
  if(left===2) news(`Promemoria: hai promesso a ${t.coach.n} un ${m.roleN} di valore almeno ${String(m.thr).replace('.',',')}. Mancano 2 giornate.`,'coach',false,t.id);
  if(left===1) news(`Ultima occasione: compra ${m.roleN==='attaccante'?'l\'':'il '}${m.roleN} promesso a ${t.coach.n} prima di giocare la giornata ${m.due}.`,'coach',false,t.id); } }
function promiseCheck(t,p){ if(t.promise && p.r===t.promise.role && ovr(p)>=t.promise.thr-0.05){ const c=t.coach; c.mor=clamp((c.mor??12)+1.5,1,20); addCause(c,'il presidente ha mantenuto la promessa',1.5); teamMor(t,0.3,'arriva il rinforzo promesso'); news(`${c.n} ringrazia: il rinforzo promesso è arrivato.`,'coach',false,t.id); closeMission(t,'rinforzo','ok',`Mantenuta: è arrivato ${p.fn} ${p.ln}.`); finInit(t).hist.unshift({s:G.season,md:G.md,t:`Promessa mantenuta: arriva ${p.ln}`}); t.promise=null; } }


/* ====================== CALCIOMERCATO IN USCITA ======================
   Il presidente tratta il prezzo con il club che compra; se c'è l'accordo, decide il giocatore (in segreto). */
/* club che compra: una squadra del campionato o un club estero (virtuale, ricco e prestigioso) */
const FOREIGN=['un club inglese','un club spagnolo','un club tedesco','un club francese','un club arabo','un club turco'];
function buyerOf(r){ return r.buyer===-1 ? {id:-1, n:r.bn||'un club estero', cash:1e9, pl:[], foreign:true} : G.T[r.buyer]; }
function offMax(r){ const p=G.P[r.pid], b=buyerOf(r), v=value(p); if(b.foreign) return Math.max(r.amt*1.05, v*(1.2+(hashN(r.id+7))*0.3));
  const need=teamPlayers(b).filter(q=>q.r===p.r).length<({P:2,D:5,C:5,A:4})[p.r]?1:0, rich=clamp(b.cash/(v*2)-0.5,0,1), form=clamp((avgRt(p)-6.2)/1.2,-0.5,1);
  return Math.max(r.amt*1.02, Math.min(b.cash*0.95, v*(1.04+need*0.15+rich*0.15+form*0.1+(hashN(r.id+7)-0.5)*0.14))); }
/* voglia segreta del giocatore di trasferirsi: morale, ambizione e prestigio del club che lo vuole */
function willGo(r){ const p=G.P[r.pid], t=G.T[r.team], b=buyerOf(r), st=standings(), better=b.foreign?true:st.indexOf(b)<st.indexOf(t);
  return clamp(0.42+(12-p.mor)*0.075+(p.amb-11)*0.04*(better?1:-0.6)+(better?0.15:-0.12)+(p.wantOut?0.45:0)+(b.foreign?0.12+(p.amb-11)*0.02:0)+(hashN(r.id+3)-0.5)*0.2,0.03,0.97); }
function offSetup(r){ const X=offMax(r); return {X, k:0.32+(hashN(r.id+11)-0.5)*0.1, pat:90+(hashN(r.id+5))*30, c:r.amt, hist:[], st:'open', off:true}; }
function offRange(r){ const v=value(G.P[r.pid]); return {lo:r.amt, hi:Math.max(r.amt*1.3,Math.round(v*1.7/5000)*5000), step:5000}; }
function offPropose(r,P){ const n=r.neg, R=offRange(r); if(!n||n.st!=='open') return; P=Math.round(clamp(P,R.lo,R.hi)/5000)*5000; n.hist.push({by:'pres',v:P});
  if(P<=n.X+1){ n.hist.push({by:'req',txt:'Affare fatto, per noi va bene.'}); n.st='deal'; resolveReq(r,'deal',false,{v:P,opened:true}); return; }
  const g=clamp((P-n.X)/Math.max(1,n.X*0.5),0,1); n.pat=Math.max(0,n.pat-(10+75*Math.pow(g,1.1)));
  if(n.pat<=0){ n.st='stalled'; n.hist.push({by:'req',v:n.c,txt:'Non andiamo oltre. La nostra offerta resta'}); return; }
  const prev=n.c; n.c=Math.min(n.X, Math.round((n.c+(n.X-n.c)*n.k+n.X*0.01)/5000)*5000); if(n.c>n.X) n.c=Math.floor(n.X/5000)*5000; if(n.c<prev) n.c=prev;
  n.hist.push({by:'req',v:n.c,txt:n.c<=prev?(g>0.7?'Cifre fuori mercato. Restiamo a':'Più di così non possiamo, restiamo a'):(n.X-n.c)<n.X*0.03?'Ultimo rilancio:':g>0.7?'Cifra esagerata. Possiamo salire a':'Possiamo alzare a'}); }
const OFF_MOT={incedibile:'Per noi è incedibile', obiettivo:'Ci serve per raggiungere l\'obiettivo', futuro:'Fa parte del progetto per la prossima stagione'};
function offCred(t,r,m){ const p=G.P[r.pid], top=teamPlayers(t).sort((a,b)=>ovr(b)-ovr(a)).slice(0,4).includes(p), pos=standings().indexOf(t);
  if(m==='incedibile') return top?1:-0.5; if(m==='obiettivo') return pos<=3?0.8:pos>=6?-0.4:0.2; if(m==='futuro') return p.age<=26?0.6:p.age>=31?-0.5:0.1; return 0; }
/* chiude l'offerta: vendita (se il giocatore accetta) o rifiuto */
function closeOffer(r,ch,o){ const t=G.T[r.team], p=G.P[r.pid], b=buyerOf(r), w=willGo(r); let out='';
  if(ch==='acc'||ch==='deal'){ const amt=ch==='acc'?r.amt:o.v;
    if(!(b.cash>=amt*0.9 && b.pl.length<23)){ r.st='exp'; return `${b.n} non ha più i fondi: l'affare salta.`; }
    { const bk=bankOkSale(t,p,amt); if(bk){ r.st='bank'; if(r.neg) r.neg.hist.push({by:'pl',txt:'La banca non ha dato l\'ok: il giocatore è in pegno.'}); return bk+' L\'affare salta.'; } }
    if(rnd()<w){ t.pl=t.pl.filter(x=>x!==p.id); if(b.foreign){ p.team=null; p.abroad=true; } else { b.pl.push(p.id); p.team=b.id; p.ct=3; p.wg=Math.max(p.wg,Math.round(wage(p)*1.15/100)*100); budVary(b,'acquisti',amt); spend(b,'acquisti',amt); ensureCaptains(b,true); } p.wantOut=false; p.mor=clamp(p.mor+1,1,20); earn(t,'cessioni',amt); onSold(t,p,amt); ensureCaptains(t,t.id!==0);
      r.st=ch; r.v=amt; out=`${p.fn} ${p.ln} accetta: ceduto a ${b.n} per ${kcrE(amt)}.`; news(`${t.n} cede ${p.fn} ${p.ln} a ${b.n} per ${kcrE(amt)}.`, t.id===0?'market':'match',true,t.id);
      if(r.neg) r.neg.hist.push({by:'pl',txt:`Accetto il trasferimento a ${b.n}.`}); }
    else { r.st='plno'; p.mor=clamp(p.mor-0.5,1,20); addCause(p,'il club voleva vendermi',-0.5); out=`Accordo tra i club, ma ${p.ln} rifiuta il trasferimento a ${b.n}: vuole restare.`;
      if(r.neg) r.neg.hist.push({by:'pl',txt:`Grazie, ma resto qui. Non voglio andare a ${b.n}.`}); } }
  else { const d0 = w>0.6 ? -1.6 : w<0.35 ? 0.3 : -0.3; let d=d0, why=w>0.6?'cessione rifiutata dal club':w<0.35?'il presidente non vuole vendermi':'cessione rifiutata dal club';
    if(ch==='rifm' && d0<0){ const cr=offCred(t,r,o.motive); d=d0*(1-clamp(0.45*cr,-0.3,0.6)); why=`rifiuto motivato: «${OFF_MOT[o.motive]}»`;
      if(r.neg) r.neg.hist.push({by:'pl',txt:cr>0.5?'Capisco, mi fa piacere sentirmelo dire.':cr<0?'Non ci credo: è solo un modo per tenermi qui.':'Va bene, ne riparleremo.'}); }
    p.mor=clamp(p.mor+d,1,20); addCause(p,why,d); if(w>0.6 && d<-1) p.wantOut=true;
    r.st=ch; out=`Offerta di ${b.n} respinta: ${p.ln} ${w>0.6?(d<-1?'voleva andare ed è molto deluso':'voleva andare, ma capisce'):w<0.35?'è contento di restare':'resta'}.`; }
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
  if(I<0.15){ r.neg.st='no'; r.st='plno'; r.neg.hist.push({by:'pl',txt:'La ringrazio, ma non sono interessato a venire.'}); r.out=`${p.fn} ${p.ln} non è interessato al trasferimento.`; }
  else r.neg.hist.push({by:'pl',txt:`Per venire chiedo ${fmtK(Wask)} cr a giornata, contratto di 3 anni.`}); }
const fmtK=n=>Math.round(n).toLocaleString('it-IT');
function buyPropose(r,v,oo){ const n=r.neg; if(!n||n.st!=='open') return; const p=G.P[r.pid];
  if(n.ph==='club'){ v=Math.round(v/5000)*5000; n.hist.push({by:'pres',v,ph:'club'});
    if(v>=n.M-1){ n.fee=v; n.hist.push({by:'club',txt:'D\'accordo sul prezzo. Ora deve convincere il giocatore.'}); buyPlayerPhase(r); return; }
    const g=clamp((n.M-v)/Math.max(1,n.M*0.5),0,1); n.pat=Math.max(0,n.pat-(10+75*Math.pow(g,1.1)));
    if(n.pat<=0){ n.st='stalled'; n.hist.push({by:'club',v:n.c,txt:'Non scendiamo più. La nostra richiesta resta'}); return; }
    const prev=n.c; n.c=Math.max(Math.ceil(n.M/5000)*5000, Math.round((n.c-(n.c-n.M)*n.k-n.M*0.01)/5000)*5000); if(n.c>prev) n.c=prev;
    n.hist.push({by:'club',v:n.c,txt:n.c>=prev?(g>0.7?'Offerta irricevibile. Restiamo a':'Non possiamo scendere, restiamo a'):(n.c-n.M)<n.M*0.03?'Ultima richiesta:':g>0.7?'Offerta bassa. Possiamo scendere a':'Possiamo scendere a'}); return; }
  /* fase 2: contratto con il giocatore */
  v=Math.round(v/50)*50; oo=Math.max(0,Math.round(oo||0)); n.hist.push({by:'pres',v,oo,ph:'player'});
  const ve=v+oo/42;
  if(ve>=n.M-1e-9){ n.hist.push({by:'pl',txt:'Affare fatto, vengo volentieri.'}); buyComplete(r,v,oo); return; }
  const g=clamp((n.M-ve)/Math.max(1,n.ask*0.4),0,1); n.pat=Math.max(0,n.pat-(10+75*Math.pow(g,1.1)));
  if(n.pat<=0){ n.st='stalled'; n.hist.push({by:'pl',v:n.c,txt:'Ho perso la pazienza. Resto su'}); return; }
  const prev=n.c; n.c=Math.max(Math.ceil(n.M/50)*50, Math.round((n.c-(n.c-n.M)*n.k-n.ask*0.01)/50)*50); if(n.c>prev) n.c=prev;
  n.hist.push({by:'pl',v:n.c,txt:n.c>=prev?'Non scendo, resto su':(n.c-n.M)<n.ask*0.03?'Ultima richiesta:':'Posso accettare'}); }
function buyAccept(r){ const n=r.neg; if(!n) return; if(n.ph==='club'){ n.fee=n.c; n.hist.push({by:'pres',acc:true,v:n.c,ph:'club'}); n.hist.push({by:'club',txt:'Bene. Ora deve convincere il giocatore.'}); n.st='open'; buyPlayerPhase(r); } else { n.hist.push({by:'pres',acc:true,v:n.c,ph:'player'}); n.hist.push({by:'pl',txt:'Allora siamo d\'accordo.'}); buyComplete(r,n.c,0); } }
function buyQuit(r){ if(!r||r.st!=='open') return; r.st='quit'; if(r.neg) r.neg.st='no'; r.out='Trattativa abbandonata.'; }
function buyComplete(r,w,oo){ const p=G.P[r.pid], me=G.T[0], n=r.neg, fee=n.fee||0;
  if(me.pl.length>=24){ n.st='no'; r.st='fail'; r.out='Rosa piena: massimo 24 giocatori.'; return; }
  if(fee+oo>me.cash){ n.st='no'; r.st='fail'; r.out=`Non hai abbastanza crediti: servono ${kcrE(fee+oo)}.`; return; }
  { const v=buyBlock(me,fee+oo); if(v){ n.st='no'; r.st='fail'; r.out=v; n.hist.push({by:'club',txt:v}); return; } }
  if(p.team!=null){ const from=G.T[p.team]; from.pl=from.pl.filter(x=>x!==p.id); earn(from,'cessioni',fee); onSold(from,p,fee); ensureCaptains(from,true); } else G.FA=G.FA.filter(x=>x!==p.id);
  spend(me,'acquisti',fee); if(oo) spend(me,'una tantum',oo); promiseCheck(me,p);
  p.team=0; p.ct=3; p.wg=w; p.wantOut=false; p.renewNo=null; p.mor=clamp(12+n.I*4,1,20); addCause(p,'nuovo arrivo',0); me.pl.push(p.id); ensureCaptains(me,true);
  n.st='deal'; r.st='deal'; r.out=`Ufficiale: ${p.fn} ${p.ln} firma con noi${fee?' per '+kcrE(fee):' da svincolato'}. Stipendio ${fmtK(w)} cr a giornata${oo?', '+kcrE(oo)+' alla firma':''}.`;
  finInit(me).hist.unshift({s:G.season,md:G.md,t:r.out}); news(r.out,'market',true,0); }

/* ---------- morale ---------- */
const fmtV=v=>String(v).replace('.',',');
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
    if(mins>0){ const rt=m.rt[p.id]??6; d+=neg((rt-6.1)*0.55); if(rt>=7.5) why.push(`ottima prova (voto ${fmtV(rt)})`); else if(rt<=5) why.push(`prova deludente (voto ${fmtV(rt)})`);
      const g=goals[p.id]||0; if(g){ d+=0.3*g; why.push(g>1?`${g} gol`:'ha segnato'); } p.bench=0; }
    else if(avail.has(p.id)){ p.bench=(p.bench||0)+1; if(ovr(p)>top-1.2){ let x=-0.32*(1+(p.amb-10)*0.06); if(p.bench>=3){ x-=0.25; why.push(`${p.bench} panchine di fila`); } else why.push('lasciato in panchina'); d+=neg(x); } }
    d+=neg(res*(mins>0?0.32:0.1)); if(res && mins>0 && !why.length) why.push(res>0?'vittoria':'sconfitta');
    const club=(tm-p.mor)*0.05+(cm-12)*0.02+(cap&&cap!==p?(cap.mor-12)*0.015:0); d+=club;
    if(Math.abs(club)>=0.25) why.push(club>0?'buon clima nello spogliatoio':'spogliatoio nervoso');
    d=clamp(d,-1.6,1.6);
    const rev=(12-p.mor)*0.13; p.mor=clamp(p.mor+d+rev,1,20);
    if(Math.abs(d)>=0.5 && why.length){ addCause(p, why.join(', '), d); if(t.id===0 && d<=-1) news(`${p.fn} ${p.ln} è giù di morale: ${why[0]}.`,'player',false,t.id); }
  }
  const cr=m.coachRt?m.coachRt[side]:null; let dc=0; const cw=[];
  if(cr){ c.rts=c.rts||[]; c.rts.push(cr.v); if(c.rts.length>8) c.rts.shift(); }
  if(cr && cr.v!=null){ dc+=(cr.v-6.1)*0.5; if(cr.v>=7||cr.v<=5) cw.push(`voto ${fmtV(cr.v)}`); cw.push(...cr.why.slice(0,2)); }
  dc+=res*0.3; if(m.coachOff&&m.coachOff[side]) dc-=0.5; dc=clamp(dc,-1.5,1.5);
  c.mor=clamp(cm+dc+(12-cm)*0.13,1,20); if(Math.abs(dc)>=0.4 && cw.length) addCause(c, cw.join(', '), dc);
  const old=t.mor??12; t.mor=teamMorale(t);
  if(t.id===0 && morLevel(old)!==morLevel(t.mor)) news(`Spogliatoio: il morale della squadra ora è ${morLevel(t.mor)}.`,'club',false,t.id);
}
function standings(){ return [...G.T].sort((a,b)=>((a.fin&&a.fin.excluded)?1:0)-((b.fin&&b.fin.excluded)?1:0) || teamPts(b)-teamPts(a) || (b.tab.gf-b.tab.gs)-(a.tab.gf-a.tab.gs) || b.tab.gf-a.tab.gf); }

function coachTalk(){
  const t=G.T[0], pl=teamPlayers(t), need=formNeed(t.coach.mod);
  if(rnd()<0.25){
    let worst=null, wv=99;
    for(const r of ['D','C','A']){ const ps=pl.filter(p=>p.r===r).map(ovr).sort((a,b)=>b-a).slice(0,need[r]); const v=ps.length<need[r]?0:ps.reduce((a,b)=>a+b,0)/ps.length; if(v<wv){wv=v;worst=r;} }
    news(`${t.coach.n} (allenatore): "Presidente, il reparto che mi preoccupa è quello dei ${ {D:'difensori',C:'centrocampisti',A:'attaccanti'}[worst] }. Un rinforzo lì farebbe la differenza."`,'coach',false,0);
  }
  const sad = pl.filter(p=>p.mor<6.5 && p.amb>11);
  if(sad.length && rnd()<0.4){ const p=sad[0]; news(`${p.fn} ${p.ln} è scontento per il poco spazio. Se non gioca potrebbe chiedere la cessione.`,'player',false,0); }
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
function mkPres(){ return {id:'p1', n:'Il presidente', u:1, t:0, h:[]}; }
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
    news(i===0?`Premi della stagione ${S}: ${t.n} campione. Popolarità +${pp} e sponsor +${pc(sp)} per tutta la prossima stagione.`
      :`Premi della stagione ${S}: ${t.n} ${i===1?'seconda':'terza'} classificata. Popolarità +${pp} e sponsor +${pc(sp)} per la prossima stagione.`,'match',true,id); });
  if(row.cc && row.cc[2]!=null && G.T[row.cc[2]]){ const t=give(row.cc[2],PRIZES.sc,0,0);
    news(`Premi della stagione ${S}: ${row.cc[1]} (${t.n}) è il capocannoniere con ${row.cc[3]} gol. Popolarità del club +${PRIZES.sc}.`,'match',true,row.cc[2]); }
  if(row.mg) news(`Premi della stagione ${S}: miglior giovane ${row.mg[1]}${G.T[row.mg[2]]?' ('+G.T[row.mg[2]].n+')':''}, media voto ${String(row.mg[3]/10).replace('.',',')} in ${row.mg[4]} partite.`,'match',true,row.mg[2]); }
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
  st.forEach((t,i)=>{ t.prevPos=i; if(t.obj && t.obj.s===G.season){ closeMission(t,'obiettivo',i<t.obj.lim?'ok':'end',i<t.obj.lim?`Raggiunto (${i+1}° posto): premio di ${kcrE(t.obj.amt)} pagato.`:`Non raggiunto (${i+1}° posto): il premio non è dovuto.`); if(i<t.obj.lim){ spend(t,'premi',t.obj.amt); teamMor(t,0.6,'premio obiettivo incassato'); news(`${t.n}: obiettivo raggiunto (${t.obj.goal}), pagato il premio di ${kcrE(t.obj.amt)}.`, t.id===0?'club':'match',true,t.id); } t.obj=null; } t.promise=null; t.bonus=null; });
  (G.req||[]).forEach(r=>{ if(r.st==='open') r.st='exp'; });
  st.forEach((t,i)=>{ earn(t,'premi campionato',60000+(7-i)*30000); });
  G.T.forEach(t=>{ const f=finInit(t);
    if(f.excluded){ f.arr=[]; f.excluded=false; const pl=teamPlayers(t).sort((a,b)=>b.wg-a.wg); pl.slice(0,3).forEach(p=>{ t.pl=t.pl.filter(x=>x!==p.id); p.team=null; G.FA.push(p.id); }); t.cash=Math.max(t.cash,150000); ensureCaptains(t,true); news(`${t.n} riparte dopo l'esclusione: i giocatori più pagati se ne vanno da svincolati.`, t.id===0?'club':'match',true,t.id); }
    f.pen=f.penNext; f.penNext=0; if(f.pen) news(`${t.n} parte con ${f.pen} punti di penalizzazione per gli stipendi della scorsa stagione.`, t.id===0?'club':'match',true,t.id);
    f.arr.forEach(a=>{ a.s=G.season+1; a.p=0; });
    f.hist.unshift({s:G.season,md:14,t:`Chiusura stagione: entrate ${kcrE(Object.values(f.sea.inc).reduce((a,b)=>a+b,0))}, uscite ${kcrE(Object.values(f.sea.exp).reduce((a,b)=>a+b,0))}`});
    closeBudget(t);
    f.prev=f.sea; f.sea={inc:{},exp:{}}; f.checks=[]; });
  news(`Fine stagione ${G.season}: ${champ.n} vince il campionato. Il tuo club chiude ${upos}°.`,'club',true,champ.id);
  closePresidents(st); closeLeague(st, excl);
  for(const t of G.T){
    const pl=teamPlayers(t);
    for(const p of pl){ p.age++; p.ct--; p.fat=0; if(p.age>=34 && rnd()<0.5 || p.age>=36){ t.pl=t.pl.filter(x=>x!==p.id); p.team=null; p.retired=true; if(t.id===0) news(`${p.fn} ${p.ln} si ritira dal calcio a ${p.age} anni.`,'player',false,t.id); } }
    teamPlayers(t).forEach(p=>{ if(p.ct<=0){ if(p.renewNo===G.season && t.pl.length>16){ t.pl=t.pl.filter(x=>x!==p.id); p.team=null; p.ct=0; G.FA.push(p.id); news(`${p.fn} ${p.ln} lascia ${t.n} a parametro zero: il contratto è scaduto senza rinnovo.`, t.id===0?'market':'match',true,t.id); } else { p.ct=ri(1,3); p.wg=Math.max(p.wg,wage(p)); } } });
    ensureCaptains(t,t.id!==0);
    const sgL=facLevel(t,'sg')-1, ny = 2+(rnd()<0.4+0.15*sgL?1:0);
    for(let i=0;i<ny;i++){ const r=pick(['P','D','C','C','A']); const p=mkPlayer(r, 6.2+rnd()*1.5+0.4*sgL, ri(16,17)); addToTeam(t,p); if(t.id===0) news(`Dal settore giovanile arriva ${p.fn} ${p.ln}, ${p.age} anni, ${ROLE_NAME[r].toLowerCase()}.`,'player',false,t.id); }
    t.tab={g:0,v:0,n:0,p:0,gf:0,gs:0,pt:0}; t.form=[];
    while(t.pl.length>22){ const worst=teamPlayers(t).sort((a,b)=>value(a)-value(b))[0]; t.pl=t.pl.filter(x=>x!==worst.id); worst.team=null; G.FA.push(worst.id); }
  }
  G.FA = G.FA.filter(id=>!G.P[id].retired && G.P[id].age<35);
  for(let i=0;i<6;i++){ const young=rnd()<0.6; const p=mkPlayer(pick(['P','D','C','A']), young?7+rnd():8+rnd()*1.5, young?ri(17,20):ri(29,33)); p.team=null; p.wg=wage(p); p.ct=0; G.P[p.id]=p; G.FA.push(p.id); }
  G.season++; G.md=0; G.res=[]; G.last=null; G.sched=schedule(8);
  G.T.forEach(t=>{ pledgeSweep(t); ensureBudget(t); });
  firePending();
}


