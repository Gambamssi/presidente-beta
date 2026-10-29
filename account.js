/* ================= ACCOUNT DELLA BETA CHIUSA (v0.037) =================
   Si accende solo se c'è window.PRES_CONF = {supabaseUrl, supabaseKey, beta:true} (file config.js della cartella beta).
   Senza config.js non fa nulla: il gioco resta identico alla versione di lavoro (salvataggio nel browser).
   Il motore non sa che gli account esistono: qui si legge e si scrive G solo come salvataggio, e non si usa mai rnd().
   Funzioni del gioco "avvolte" in modalità beta: render, save, load, startScreen, vModal (stessi nomi, comportamento in più).
   Server: Supabase (auth + tabelle profili, partite, segnalazioni; funzioni iscrizioni_aperte, completa_profilo, cancella_account). */
const AVVISO_VER='2026-10-29', PRIVACY_VER='2026-10-29', BETA_MAIL='presidente.gioco@gmail.com';
const AVVISO_TESTO={
  intro:['Evivora è un gioco manageriale di calcio ancora in fase di sviluppo. Questa è una beta chiusa: serve a provare il gioco con un piccolo gruppo di persone e a correggere quello che non funziona.'],
  lead:'Partecipando accetti che:',
  punti:['il gioco può contenere errori e comportamenti inattesi;',
    'regole e numeri possono cambiare da una versione all\'altra;',
    'in qualche caso le partite salvate potrebbero dover ripartire da capo;',
    'il servizio può essere lento o non disponibile, anche per manutenzione o perché il server si mette in pausa dopo alcuni giorni senza attività;',
    'le iscrizioni possono essere chiuse o soggette ad approvazione;',
    'non ci sono garanzie di continuità: la beta può finire in qualunque momento.'],
  fine:['Il gioco è gratuito: non ci sono acquisti e non ti chiederemo mai dati di pagamento.',
    'Le tue segnalazioni sono preziose: usa «Segnala un problema» nel menu ⋯.',
    'Contatto: '+BETA_MAIL+'.']
};
function avvisoHTML(){ const A=AVVISO_TESTO;
  return A.intro.map(x=>`<p>${esc(x)}</p>`).join('')+`<p>${esc(A.lead)}</p><ul>${A.punti.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`+A.fine.map(x=>`<p>${esc(x)}</p>`).join(''); }

/* stato degli account (in memoria; non entra mai in G) */
const ACC={on:false, sb:null, user:null, prof:null, ruolo:null, screen:null, tab:'accedi', forgot:false, reg:{step:1, ok:false, at:null}, open:null,
  email:'', msg:'', err:'', errKind:'', busy:false, avv:false, back:null,
  mark:null, dirty:false, localT:null, lastUp:0, upTimer:null, upBusy:null, upAgain:false, sync:null, zLimit:1000000, recovery:false, timeout:15000};

function accStart(){}  /* sostituita qui sotto quando la beta è accesa */

(function(){
  const C=window.PRES_CONF;
  if(!C) return;                                                 /* versione di lavoro (nessun config.js): nessun account */
  ACC.on=true;
  const hash0=location.hash||'';                                  /* il link della mail porta qui i suoi dati: si leggono prima che la libreria li tolga */
  if(/type=recovery/.test(hash0)) ACC.recovery=true;
  const hp=new URLSearchParams(hash0.replace(/^#/,''));
  if(hp.get('error_code')||hp.get('error')){
    const c=hp.get('error_code')||hp.get('error');
    ACC.err = /expired|invalid|denied/i.test(c+' '+(hp.get('error_description')||'')) ?
      'Il link della mail non è più valido (è scaduto o è già stato usato). Accedi con email e password; se l\'indirizzo non è ancora confermato potrai farti rimandare la mail.' :
      'Il link della mail non ha funzionato. Prova ad accedere con email e password.';
  }
  const pageUrl=()=>location.origin+location.pathname;
  const KEYU=()=>KEY+':'+ACC.user.id;                             /* copia nel browser: una chiave per ogni account */
  const nick=()=>(ACC.prof&&ACC.prof.soprannome)||'';
  const EYE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

  /* ---------- rete: tempi massimi e riconoscimento degli errori ---------- */
  function withTimeout(p, ms){ return Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej({name:'Timeout', message:'timeout'}), ms||ACC.timeout))]); }
  function isNet(e){ if(!e) return false; const m=String(e.message||e); const st=+e.status||0;
    return e.name==='AuthRetryableFetchError' || e.name==='Timeout' || /failed to fetch|networkerror|load failed|fetch failed|timeout|network request failed/i.test(m) || st>=502; }
  const OFFLINE_TXT='Il server della beta non risponde: può essere in pausa. Riprova tra qualche minuto; se continua, scrivi a '+BETA_MAIL+'.';
  const CLOSED_TXT='Le iscrizioni alla beta sono chiuse in questo momento. Se ti interessa partecipare, scrivi a '+BETA_MAIL+'.';
  function dbMsg(e){ const m=String((e&&e.message)||''); return m.replace(/^ERROR:\s*/,'').replace(/^ISCRIZIONI_CHIUSE:\s*/,'') || 'Qualcosa non ha funzionato. Riprova.'; }

  /* ---------- schermate ---------- */
  function show(scr, o){ ACC.screen=scr; ACC.busy=false; if(o){ if('msg' in o) ACC.msg=o.msg; if('err' in o) ACC.err=o.err; if('errKind' in o) ACC.errKind=o.errKind; } render(); window.scrollTo(0,0); }
  function offline(back){ ACC.back=back||null; show('offline',{msg:'', err:''}); }
  function msgHTML(){ return (ACC.err?`<p class="acc-err" role="alert">${esc(ACC.err)}</p>`:'')+(ACC.msg?`<p class="acc-ok" role="status">${esc(ACC.msg)}</p>`:''); }
  function pwField(id, ac, lbl){ return `<label for="${id}">${lbl}</label><div class="pwf"><input id="${id}" type="password" autocomplete="${ac}" minlength="8" required><button type="button" class="eye" data-act="acc-eye" aria-label="Mostra la password" title="Mostra la password">${EYE}</button></div>`; }
  function topAcc(){
    const who=ACC.user?(nick()||ACC.user.email||''):'';
    return `<div class="brand"><span class="wm">EVIVORA</span><span class="ver" title="Versione del gioco">v${VERSION}</span><span class="beta-tag">Versione di prova</span></div>
      <div class="acts">${ACC.user?`<span class="acc-me" title="${esc(ACC.user.email||'')}">${esc(who)}</span><button class="btn ghost small" data-act="acc-out">Esci</button>`:''}</div>`;
  }
  function introHTML(){
    return `<section class="card acc-intro"><p class="eyebrow">Beta chiusa · versione ${VERSION}</p><h1 class="acc-t">EVIVORA</h1><p class="tagline">Sei il presidente</p>
      <p>Il gioco manageriale di calcio in cui sei il presidente: compri giocatori, scegli l'allenatore, costruisci lo stadio. In campo decidono loro.</p>
      <p class="muted">Per giocare alla beta serve un account: la partita si salva online e la ritrovi su ogni dispositivo. Le iscrizioni possono essere chiuse o soggette ad approvazione.</p>
      <p class="acc-links"><a href="privacy.html" target="_blank" rel="noopener">Informativa privacy</a> · <button class="link" data-act="acc-avv" aria-expanded="${ACC.avv}">Avviso del progetto</button></p>
      ${ACC.avv?`<div class="acc-avviso">${avvisoHTML()}</div>`:''}</section>`;
  }
  function mainHTML(){
    const s=ACC.screen, em=esc(ACC.email||'');
    if(s==='loading') return `<p class="eyebrow">Un attimo</p><h2>Mi collego al server della beta…</h2><p class="muted">Se ci mette molto, il server potrebbe essere in pausa: si sveglia da solo in qualche minuto.</p>`;
    if(s==='offline') return `<p class="eyebrow">Server non raggiungibile</p><h2>Il server non risponde</h2><p class="acc-err" role="alert">${esc(OFFLINE_TXT)}</p><div class="row"><button class="btn" data-act="acc-retry">Riprova</button>${ACC.user?'<button class="btn ghost" data-act="acc-out">Esci</button>':''}</div>`;
    if(s==='mail') return `<p class="eyebrow">Passo 2 di 2 · conferma dell'indirizzo</p><h2>Controlla la posta</h2>
      <p>Ti abbiamo mandato una mail a <b>${em}</b>. Clicca il link per confermare l'indirizzo (controlla anche lo spam).</p>${msgHTML()}
      <div class="row"><button class="btn" data-act="acc-resend">Rimanda la mail</button><button class="btn ghost" data-act="acc-tologin">Torna all'accesso</button></div>`;
    if(s==='completa'){ const p=ACC.prof||{};
      return `<p class="eyebrow">Ultimo passo · i tuoi dati</p><h2>Completa il profilo</h2>
      <form id="acc-done" class="accf" novalidate>
        <label for="acc-nick">Soprannome</label><input id="acc-nick" maxlength="20" autocomplete="nickname" value="${esc(ACC.nickDraft||'')}" aria-describedby="acc-nick-h">
        <p class="hint" id="acc-nick-h">È il nome del presidente che vedranno gli altri giocatori. Da 3 a 20 caratteri: lettere, numeri, spazi e trattini.</p>
        <label class="acc-chk"><input type="checkbox" id="acc-14"><span>Ho almeno 14 anni</span></label>
        <label class="acc-chk"><input type="checkbox" id="acc-priv"><span>Ho letto l'<a href="privacy.html" target="_blank" rel="noopener">informativa privacy</a> e acconsento al trattamento dei dati</span></label>
        <div class="acc-sum"><p class="eyebrow">Riepilogo</p><dl>
          <div><dt>Email</dt><dd id="sum-em">${esc(p.email||ACC.user.email||'')}</dd></div>
          <div><dt>Soprannome</dt><dd id="sum-nick">—</dd></div>
          <div><dt>Avviso del progetto</dt><dd id="sum-avv">${p.avviso_ok?'accettato il '+esc(dataOra(p.avviso_il)):'non risulta accettato'}</dd></div>
          <div><dt>Età</dt><dd id="sum-14">da confermare</dd></div>
          <div><dt>Privacy</dt><dd id="sum-priv">da accettare</dd></div></dl></div>
        ${msgHTML()}
        <div class="row"><button class="btn go" type="submit" id="acc-done-b" disabled>Confermo i miei dati</button><button type="button" class="btn ghost" data-act="acc-out">Esci</button></div>
      </form>${footHTML()}`; }
    if(s==='attesa') return `<p class="eyebrow">Iscrizione ricevuta</p><h2>Grazie, ${esc(nick())}!</h2>
      <p>La tua iscrizione è in attesa di approvazione. Ti scriveremo a <b>${esc((ACC.prof&&ACC.prof.email)||ACC.user.email||'')}</b> quando potrai giocare.</p>${msgHTML()}
      <div class="row"><button class="btn" data-act="acc-recheck">Ricontrolla</button><button class="btn ghost" data-act="acc-out">Esci</button></div>${footHTML()}`;
    if(s==='sospeso') return `<p class="eyebrow">Account sospeso</p><h2>Non puoi giocare per ora</h2><p class="acc-err" role="alert">Il tuo account è sospeso. Per informazioni scrivi a ${BETA_MAIL}.</p>
      <div class="row"><button class="btn ghost" data-act="acc-out">Esci</button></div>`;
    if(s==='errore') return `<p class="eyebrow">Problema</p><h2>Qualcosa non va</h2>${msgHTML()}<div class="row"><button class="btn" data-act="acc-retry">Riprova</button><button class="btn ghost" data-act="acc-out">Esci</button></div>`;
    if(s==='nuovapw') return `<p class="eyebrow">Recupero della password</p><h2>Nuova password</h2>
      <form id="acc-newpw" class="accf" novalidate>${pwField('acc-np1','new-password','Nuova password (almeno 8 caratteri)')}${pwField('acc-np2','new-password','Ripeti la nuova password')}
      ${msgHTML()}<div class="row"><button class="btn go" type="submit">Salva la password</button></div></form>`;
    if(s==='porta'){ const x=ACC.porta||{};
      return `<p class="eyebrow">Partita nel browser</p><h2>Portarla online?</h2>
      <p>Nel browser c'è una partita (stagione ${x.s}, giornata ${x.md}, club ${esc(x.club||'')}). Vuoi portarla online?</p>${msgHTML()}
      <div class="row"><button class="btn go" data-act="acc-porta-si">Sì, portala online</button><button class="btn ghost" data-act="acc-porta-no">No, inizia una nuova partita</button></div>`; }
    if(s==='cancella') return delHTML();
    /* accesso e registrazione */
    const tabs=`<div class="acc-tabs" role="tablist"><button role="tab" aria-selected="${ACC.tab==='accedi'}" class="${ACC.tab==='accedi'?'on':''}" data-act="acc-tab" data-t="accedi">Accedi</button><button role="tab" aria-selected="${ACC.tab==='registrati'}" class="${ACC.tab==='registrati'?'on':''}" data-act="acc-tab" data-t="registrati">Registrati</button></div>`;
    let b='';
    if(ACC.tab==='accedi'){
      if(ACC.forgot) b=`<form id="acc-forgot" class="accf" novalidate><p>Scrivi l'email dell'account: ti mandiamo un link per scegliere una nuova password.</p>
        <label for="acc-email">Email</label><input id="acc-email" type="email" autocomplete="email" value="${em}" required>${msgHTML()}
        <div class="row"><button class="btn" type="submit">Mandami la mail</button><button type="button" class="btn ghost" data-act="acc-forgot0">‹ Torna all'accesso</button></div></form>`;
      else b=`<form id="acc-login" class="accf" novalidate><label for="acc-email">Email</label><input id="acc-email" type="email" autocomplete="email" value="${em}" required>
        ${pwField('acc-pw','current-password','Password')}${msgHTML()}
        ${ACC.errKind==='nonconf'?'<div class="row"><button type="button" class="btn ghost small" data-act="acc-resend">Rimanda la mail</button></div>':''}
        <div class="row acc-row"><button class="btn go" type="submit">Entra</button><button type="button" class="link" data-act="acc-forgot1">Password dimenticata?</button></div></form>`;
    } else {
      if(ACC.open===null) b=`<p class="muted">Controllo se le iscrizioni sono aperte…</p>`;
      else if(ACC.open===false) b=`<p class="acc-closed" role="status">${esc(CLOSED_TXT)}</p>`;
      else if(ACC.reg.step===1) b=`<p class="eyebrow">Passo 1 di 2 · Avviso del progetto</p>
        <div class="acc-avviso" tabindex="0" aria-label="Avviso del progetto">${avvisoHTML()}</div>
        <label class="acc-chk"><input type="checkbox" id="acc-avv-ok"${ACC.reg.ok?' checked':''}><span>Ho letto l'avviso e accetto di partecipare alla beta</span></label>${msgHTML()}
        <div class="row"><button class="btn" data-act="acc-cont" id="acc-cont"${ACC.reg.ok?'':' disabled'}>Continua</button></div>`;
      else b=`<p class="eyebrow">Passo 2 di 2 · email e password</p><form id="acc-reg" class="accf" novalidate>
        <label for="acc-email">Email</label><input id="acc-email" type="email" autocomplete="email" value="${em}" required>
        ${pwField('acc-pw','new-password','Password (almeno 8 caratteri)')}${pwField('acc-pw2','new-password','Ripeti la password')}${msgHTML()}
        <div class="row"><button class="btn go" type="submit">Registrati</button><button type="button" class="btn ghost" data-act="acc-back1">‹ Indietro</button></div></form>`;
    }
    return tabs+b;
  }
  function footHTML(){ return ACC.user?`<p class="acc-foot muted"><a href="privacy.html" target="_blank" rel="noopener">Informativa privacy</a> · <button class="link" data-act="acc-del1">Cancella il mio account</button></p>`:''; }
  function delHTML(){ const step=ACC.delStep||1, need=nick()||(ACC.user&&ACC.user.email)||'';
    return `<p class="eyebrow">Cancellazione dell'account</p><h2>Cancella il mio account</h2>
      ${step===1?`<p>Cancellando l'account spariscono per sempre il profilo, la partita salvata online e le segnalazioni inviate. Non si può tornare indietro.</p>${msgHTML()}
        <div class="row"><button class="btn danger" data-act="acc-del2">Voglio cancellarlo</button><button class="btn ghost" data-act="acc-del0">Annulla</button></div>`
      :`<form id="acc-del" class="accf" novalidate><label for="acc-del-n">Per confermare scrivi ${nick()?'il tuo soprannome':'la tua email'}: <b>${esc(need)}</b></label><input id="acc-del-n" autocomplete="off" required>${msgHTML()}
        <div class="row"><button class="btn danger" type="submit" id="acc-del-b" disabled>Cancella definitivamente</button><button type="button" class="btn ghost" data-act="acc-del0">Annulla</button></div></form>`}`; }
  function dataOra(t){ if(!t) return '—'; const d=new Date(t); if(isNaN(d)) return '—';
    return d.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})+' alle '+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}); }
  function renderAcc(){
    const top=$('#top'); top.hidden=false; top.innerHTML=topAcc();
    $('#tabs').hidden=true; $('#subtabs').hidden=true; document.body.classList.remove('ingame');
    $('#sheet').hidden=true; ['#negov'].forEach(s=>{ const x=$(s); if(x) x.remove(); });
    { let mo=$('#modal'); if(mo) mo.remove(); }
    const inner=ACC.screen==='cancella'?'<section class="card acc-main">'+delHTML()+'</section>':`${introHTML()}<section class="card acc-main" aria-live="polite">${mainHTML()}</section>`;
    $('#view').innerHTML=`<div class="acc${ACC.screen==='cancella'?' one':''}">${inner}</div>`;
    if(ACC.screen==='completa') sumUpdate();
  }
  function sumUpdate(){ const n=$('#acc-nick'), a=$('#acc-14'), p=$('#acc-priv'), b=$('#acc-done-b'); if(!n) return;
    const v=n.value.trim(); ACC.nickDraft=n.value;
    $('#sum-nick').textContent=v||'—'; $('#sum-14').textContent=a.checked?'ha almeno 14 anni':'da confermare';
    $('#sum-priv').textContent=p.checked?'informativa accettata (versione del '+PRIVACY_VER.split('-').reverse().join('/')+')':'da accettare';
    b.disabled=!(a.checked&&p.checked); }

  /* ---------- funzioni del gioco avvolte ---------- */
  const _render=render, _startScreen=startScreen, _vModal=vModal;
  document.body.classList.add('beta');
  ACC.screen='loading';
  load=function(){ return false; };                       /* all'avvio la partita arriva dall'account, non dal browser */
  render=function(){
    if(ACC.screen){ renderAcc(); return; }
    _render();
    if(!G){ const top=$('#top'); top.hidden=false; top.innerHTML=topAcc(); return; }
    const v=$('.top .ver'); if(v && !$('.top .beta-tag')) v.insertAdjacentHTML('afterend','<span class="beta-tag">Versione di prova</span>');
    const st=$('.top .stat'); if(st) st.insertAdjacentHTML('beforeend',`<span class="sync${ACC.sync&&!ACC.sync.ok?' bad':''}" id="acc-sync">${esc(syncText())}</span>`);
  };
  startScreen=function(){
    return _startScreen().replace('I dati restano solo in questo browser.','La partita si salva online nel tuo account e anche in questo browser.')+
      `<p class="acc-foot muted center">Collegato come <b>${esc(nick()||ACC.user&&ACC.user.email||'')}</b> · <a href="privacy.html" target="_blank" rel="noopener">Informativa privacy</a> · <button class="link" data-act="acc-del1">Cancella il mio account</button></p>`;
  };
  vModal=function(){
    const wrap=h=>`<div class="modal" id="modal-bg" role="dialog" aria-modal="true"><div class="neg-in modal-in">${h}</div></div>`;
    const head=(e,t)=>`<div class="neg-h"><div><p class="eyebrow">${e}</p><h2>${t}</h2></div><button class="x" data-act="mclose" aria-label="Chiudi">×</button></div>`;
    if(modal==='menu'){ let h=_vModal();
      const who=`<div class="acc-who"><b>${esc(nick())}</b><span>${esc((ACC.user&&ACC.user.email)||'')}</span><span class="sync${ACC.sync&&!ACC.sync.ok?' bad':''}">${esc(syncText())}</span></div>`;
      const more=`<button class="btn ghost" data-act="acc-seg">Segnala un problema</button><a class="btn ghost" href="privacy.html" target="_blank" rel="noopener">Informativa privacy</a><button class="btn ghost" data-act="acc-avvm">Avviso del progetto</button><button class="btn ghost" data-act="acc-out">Esci</button><button class="btn ghost danger-t" data-act="acc-del1">Cancella il mio account</button>`;
      h=h.replace('<div class="menu">', who+'<div class="menu">').replace('Cambia nome della segretaria</button>','Cambia nome della segretaria</button>'+more);
      return h; }
    if(modal==='acc-seg') return wrap(head('Beta · versione '+VERSION,'Segnala un problema')+`<form id="acc-seg" class="accf" novalidate>
      <label for="acc-seg-t">Cosa non va? Racconta cosa stavi facendo e cosa è successo.</label><textarea id="acc-seg-t" maxlength="2000" rows="6" required>${esc(ACC.segDraft||'')}</textarea>
      <p class="hint"><span id="acc-seg-n">${(ACC.segDraft||'').length}</span>/2000 · Insieme al testo inviamo versione, stagione, giornata, schermata e tipo di browser.</p>${msgHTML()}
      <div class="row"><button class="btn" type="submit">Invia la segnalazione</button><button type="button" class="btn ghost" data-act="mclose">Annulla</button></div></form>`);
    if(modal==='acc-avv') return wrap(head('Versione del '+AVVISO_VER.split('-').reverse().join('/'),'Avviso del progetto')+`<div class="acc-avviso">${avvisoHTML()}</div><div class="row"><button class="btn" data-act="mclose">Chiudi</button></div>`);
    if(modal==='acc-del') return wrap(`<div class="neg-h"><div></div><button class="x" data-act="mclose" aria-label="Chiudi">×</button></div>`+delHTML());
    return _vModal();
  };
  /* (0.4.1.0) nella beta il presidente umano si chiama come il soprannome dell'account (pubblico nel profilo del club) */
  function presNick(){ const n=nick(); if(!n||!G||!G.prs) return; const p=G.prs.find(x=>x.u&&x.t===0); if(p&&p.n!==n) p.n=n; }
  ACC.presNick=presNick;
  save=function(){
    if(!ACC.user || !G) return;
    presNick();
    let s; try{ s=JSON.stringify(G); }catch(e){ return; }
    ACC.localT=new Date().toISOString();
    try{ localStorage.setItem(KEYU(), s); localStorage.setItem(KEYU()+':t', ACC.localT); }catch(e){}
    ACC.dirty=true;
    const mk=G.season+'/'+G.md; if(mk!==ACC.mark){ ACC.mark=mk; schedUp(600); }   /* giornata giocata, fine stagione, nuova partita */
  };

  /* ---------- salvataggio online ---------- */
  function syncText(){ const s=ACC.sync; if(!s) return '';
    if(!s.ok) return 'Salvataggio online non riuscito: riprovo alla prossima giornata';
    return 'Salvato online alle '+new Date(s.t).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}); }
  function paintSync(){ const t=syncText(); document.querySelectorAll('#acc-sync, .acc-who .sync').forEach(e=>{ e.textContent=t; e.classList.toggle('bad',!!(ACC.sync&&!ACC.sync.ok)); }); }
  function schedUp(ms){ clearTimeout(ACC.upTimer); ACC.upTimer=setTimeout(()=>{ upload(); }, ms); }
  function b64(u8){ let s=''; for(let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); return btoa(s); }
  async function gz(str){ const b=await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(); return b64(new Uint8Array(b)); }
  async function gunz(z){ const u=Uint8Array.from(atob(z),c=>c.charCodeAt(0)); return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); }
  async function upload(){
    if(!ACC.user || !G || !ACC.prof || ACC.prof.stato!=='approvato') return false;
    if(ACC.upBusy){ ACC.upAgain=true; return ACC.upBusy; }
    clearTimeout(ACC.upTimer);
    const s=JSON.stringify(G), t=ACC.localT||new Date().toISOString();
    const row={user_id:ACC.user.id, versione:VERSION, stagione:G.season, giornata:G.md, aggiornata_il:t, dati:null, dati_z:null};
    ACC.upBusy=(async()=>{ let ok=false;
      try{ if(s.length>ACC.zLimit && typeof CompressionStream==='function') row.dati_z=await gz(s); else row.dati=JSON.parse(s);
        const r=await withTimeout(ACC.sb.from('partite').upsert(row));
        ok=!r.error; }catch(e){ ok=false; }
      ACC.sync={ok, t:Date.now()}; if(ok){ ACC.dirty=false; ACC.lastUp=Date.now(); }
      paintSync(); ACC.upBusy=null;
      if(ACC.upAgain){ ACC.upAgain=false; if(ok) return upload(); }
      return ok; })();
    return ACC.upBusy;
  }
  ACC.upload=upload;
  document.addEventListener('visibilitychange',()=>{ if(document.hidden && ACC.dirty && G && ACC.user){ const wait=Math.max(1500, 20000-(Date.now()-ACC.lastUp)); schedUp(wait); } });

  /* ---------- avvio, accesso, profilo, partita ---------- */
  function clearGame(){ try{ stopViewer(); }catch(e){} viewer=null; G=null; modal=null; confirmReset=false; clubView=null; clubBack=null; sheetPid=null; negId=null; bnegOn=false; area='scrivania'; sub='home'; ACC.mark=null; ACC.dirty=false; ACC.sync=null; ACC.porta=null; }
  accStart=async function(){
    if(!C.supabaseUrl || !C.supabaseKey){ show('errore',{err:'Non riesco a leggere la configurazione della beta (config.js). Ricarica la pagina; se continua, scrivi a '+BETA_MAIL+'.'}); return; }
    if(!window.supabase || !window.supabase.createClient){ show('errore',{err:'Non riesco a caricare la libreria degli account. Ricarica la pagina.'}); return; }
    if(!ACC.sb){
      ACC.sb=window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'implicit', storageKey:'presidente-beta-auth'}}   /* implicit: i link delle mail tornano con #access_token… */);
      ACC.sb.auth.onAuthStateChange((ev)=>{ if(ev==='PASSWORD_RECOVERY'){ ACC.recovery=true; setTimeout(()=>{ if(ACC.screen!=='nuovapw') show('nuovapw',{msg:'',err:''}); },0); } });
    }
    let r; try{ r=await withTimeout(ACC.sb.auth.getSession()); }catch(e){ r={error:e}; }
    if(r.error){ if(isNet(r.error)) return offline('start'); }
    const ses=r.data&&r.data.session;
    if(ses && ses.user){ ACC.user=ses.user; ACC.email=ses.user.email||'';
      if(ACC.recovery){ show('nuovapw',{msg:'',err:''}); return; }
      if(location.hash) history.replaceState(null,'',pageUrl());
      return afterLogin(); }
    if(location.hash && /error|access_token/.test(location.hash)) history.replaceState(null,'',pageUrl());
    ACC.user=null; show('auth');
    if(ACC.tab==='registrati') checkOpen();
  };
  ACC.start=()=>accStart();
  async function checkOpen(){
    let r; try{ r=await withTimeout(ACC.sb.rpc('iscrizioni_aperte')); }catch(e){ r={error:e}; }
    if(r.error){ if(isNet(r.error)) return offline('auth'); ACC.open=true; } else ACC.open=r.data===true;
    if(ACC.screen==='auth') render();
    return ACC.open;
  }
  async function afterLogin(){
    show('loading');
    let r; try{ r=await withTimeout(ACC.sb.from('profili').select('*').eq('id',ACC.user.id).maybeSingle()); }catch(e){ r={error:e}; }
    if(r.error){ if(isNet(r.error)) return offline('profile'); return show('errore',{err:'Non riesco a leggere il tuo profilo: '+dbMsg(r.error)}); }
    ACC.prof=r.data;
    ACC.ruolo=(ACC.prof&&ACC.prof.ruolo)||'giocatore';             /* solo letto: servirà nel blocco 6c (moderatori, Amministrazione) */
    if(!ACC.prof) return show('errore',{err:'Il tuo profilo non risulta sul server. Scrivi a '+BETA_MAIL+'.'});
    if(ACC.prof.stato==='sospeso') return show('sospeso');
    if(!ACC.prof.completato) return show('completa',{msg:'',err:''});
    if(ACC.prof.stato!=='approvato') return show('attesa',{msg:'',err:''});
    return loadGame();
  }
  function readLocal(){ try{ return {s:localStorage.getItem(KEYU()), t:localStorage.getItem(KEYU()+':t')}; }catch(e){ return {s:null,t:null}; } }
  async function loadGame(){
    show('loading');
    let r; try{ r=await withTimeout(ACC.sb.from('partite').select('dati,dati_z,versione,stagione,giornata,aggiornata_il').eq('user_id',ACC.user.id).maybeSingle()); }catch(e){ r={error:e}; }
    if(r.error){ if(isNet(r.error)) return offline('profile'); return show('errore',{err:'Non riesco a leggere la partita online: '+dbMsg(r.error)}); }
    const on=r.data, loc=readLocal();
    let onS=null; if(on){ try{ onS=on.dati_z? await gunz(on.dati_z) : (on.dati? JSON.stringify(on.dati) : null); }catch(e){ onS=null; } }
    const onT=on&&on.aggiornata_il? Date.parse(on.aggiornata_il) : 0, locT=loc.t? Date.parse(loc.t) : 0;
    let src=null, push=false;
    if(onS && (!loc.s || onT>=locT)) src=onS;                      /* vince la copia più recente */
    else if(loc.s){ src=loc.s; push=true; }
    if(src){
      if(!loadFrom(src)){ G=null; return show('errore',{err:'La partita salvata non si riesce a leggere. Scrivi a '+BETA_MAIL+'.'}); }
      presNick();
      ACC.mark=G.season+'/'+G.md; ACC.localT=push? loc.t : (on.aggiornata_il||new Date().toISOString());
      if(!push){ try{ localStorage.setItem(KEYU(), src); localStorage.setItem(KEYU()+':t', ACC.localT); }catch(e){} ACC.sync={ok:true, t:onT||Date.now()}; }
      ACC.screen=null; area='scrivania'; sub='home'; render(); window.scrollTo(0,0);
      if(push){ ACC.dirty=true; upload(); }
      return;
    }
    /* nessuna partita dell'account: c'è una partita della versione senza account in questo browser? */
    let g=null; try{ const s=localStorage.getItem(KEY); if(s){ const x=JSON.parse(s); if(x&&x.T&&x.T[0]) g={s:x.season, md:x.md, club:x.T[0].n}; } }catch(e){}
    if(g){ ACC.porta=g; return show('porta',{msg:'',err:''}); }
    G=null; ACC.screen=null; render();
  }
  async function doLogin(email, pw){
    ACC.email=email; ACC.errKind='';
    if(!email || !pw){ return show('auth',{err:'Scrivi email e password.', msg:''}); }
    let r; try{ r=await withTimeout(ACC.sb.auth.signInWithPassword({email, password:pw})); }catch(e){ r={error:e}; }
    if(r.error){ const e=r.error, c=e.code||'', m=String(e.message||'');
      if(isNet(e)) return offline('auth');
      if(c==='email_not_confirmed' || /not confirmed/i.test(m)) return show('auth',{err:'Devi ancora confermare l\'indirizzo: clicca il link nella mail che ti abbiamo mandato (controlla anche lo spam).', msg:'', errKind:'nonconf'});
      if(c==='invalid_credentials' || /invalid login/i.test(m)) return show('auth',{err:'Email o password non corretti.', msg:''});
      if(/rate|too many/i.test(m)) return show('auth',{err:'Troppi tentativi in poco tempo: riprova tra qualche minuto.', msg:''});
      return show('auth',{err:'Accesso non riuscito: '+m, msg:''}); }
    ACC.user=r.data.user; ACC.msg=''; ACC.err='';
    return afterLogin();
  }
  async function doRegister(email, p1, p2){
    ACC.email=email;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show('auth',{err:'Scrivi un indirizzo email valido.', msg:''});
    if(p1.length<8) return show('auth',{err:'La password deve avere almeno 8 caratteri.', msg:''});
    if(p1!==p2) return show('auth',{err:'Le due password sono diverse.', msg:''});
    ACC.busy=true;
    let r; try{ r=await withTimeout(ACC.sb.auth.signUp({email, password:p1, options:{emailRedirectTo:pageUrl(), data:{avviso_ok:true, avviso_ver:AVVISO_VER, avviso_il:ACC.reg.at||new Date().toISOString()}}})); }catch(e){ r={error:e}; }
    if(r.error){ const e=r.error, m=String(e.message||''), c=e.code||'';
      if(/ISCRIZIONI_CHIUSE/.test(m) || /database error saving new user/i.test(m) || +e.status===500){
        /* il server ha rifiutato: se le iscrizioni sono state chiuse nel frattempo lo diciamo chiaro */
        const open=await checkOpen(); if(open===false){ ACC.err=''; return show('auth'); }
        return show('auth',{err:'Il server non ha accettato l\'iscrizione. Riprova tra poco; se continua scrivi a '+BETA_MAIL+'.', msg:''}); }
      if(isNet(e)) return offline('auth');
      if(c==='weak_password' || /password/i.test(m)) return show('auth',{err:'La password non va bene: usa almeno 8 caratteri.', msg:''});
      if(/already|registered|exists/i.test(m)) return show('auth',{err:'Questo indirizzo è già registrato: prova ad accedere (o usa «Password dimenticata?»).', msg:''});
      if(/rate|too many|seconds/i.test(m)) return show('auth',{err:'Troppe mail in poco tempo: riprova tra qualche minuto.', msg:''});
      return show('auth',{err:'Iscrizione non riuscita: '+m, msg:''}); }
    const u=r.data&&r.data.user;
    if(u && Array.isArray(u.identities) && u.identities.length===0) return show('auth',{err:'Questo indirizzo è già registrato: prova ad accedere (o usa «Password dimenticata?»).', msg:''});
    if(r.data && r.data.session){ ACC.user=r.data.session.user; return afterLogin(); }   /* conferma della mail spenta sul server */
    ACC.reg={step:1, ok:false, at:null};
    show('mail',{msg:'', err:''});
  }
  async function resend(){
    let r; try{ r=await withTimeout(ACC.sb.auth.resend({type:'signup', email:ACC.email, options:{emailRedirectTo:pageUrl()}})); }catch(e){ r={error:e}; }
    if(r.error){ if(isNet(r.error)) return offline(ACC.screen==='mail'?'mail':'auth'); return show(ACC.screen,{err:/rate|seconds|too many/i.test(r.error.message||'')?'Hai appena chiesto una mail: aspetta un minuto e riprova.':'Non sono riuscito a rimandare la mail: '+r.error.message, msg:''}); }
    show(ACC.screen,{msg:'Mail rimandata a '+ACC.email+'. Controlla anche lo spam.', err:''});
  }
  async function forgot(email){
    ACC.email=email;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show('auth',{err:'Scrivi un indirizzo email valido.', msg:''});
    let r; try{ r=await withTimeout(ACC.sb.auth.resetPasswordForEmail(email,{redirectTo:pageUrl()})); }catch(e){ r={error:e}; }
    if(r.error){ if(isNet(r.error)) return offline('auth'); if(/rate|seconds|too many/i.test(r.error.message||'')) return show('auth',{err:'Hai appena chiesto una mail: aspetta un minuto e riprova.', msg:''}); }
    show('auth',{msg:'Se l\'indirizzo è registrato, ti abbiamo mandato una mail con il link per scegliere una nuova password (controlla anche lo spam).', err:''});
  }
  async function newPassword(p1,p2){
    if(p1.length<8) return show('nuovapw',{err:'La password deve avere almeno 8 caratteri.', msg:''});
    if(p1!==p2) return show('nuovapw',{err:'Le due password sono diverse.', msg:''});
    let r; try{ r=await withTimeout(ACC.sb.auth.updateUser({password:p1})); }catch(e){ r={error:e}; }
    if(r.error){ if(isNet(r.error)) return offline('nuovapw'); return show('nuovapw',{err:/different|same/i.test(r.error.message||'')?'La nuova password deve essere diversa da quella di prima.':'Non sono riuscito a cambiarla: '+r.error.message, msg:''}); }
    ACC.recovery=false; if(location.hash) history.replaceState(null,'',pageUrl());
    if(r.data&&r.data.user) ACC.user=r.data.user;
    toast('Password cambiata.'); afterLogin();
  }
  async function complete(){
    const n=$('#acc-nick').value.trim(), a=$('#acc-14').checked, p=$('#acc-priv').checked;
    ACC.nickDraft=$('#acc-nick').value;
    const fail=t=>{ show('completa',{err:t, msg:''}); const x=$('#acc-14'), y=$('#acc-priv'); if(x) x.checked=a; if(y) y.checked=p; sumUpdate(); };
    if(n.length<3||n.length>20) return fail('Il soprannome deve avere da 3 a 20 caratteri.');
    if(!/^[A-Za-zÀ-ÖØ-öø-ÿ0-9 -]+$/.test(n)) return fail('Il soprannome può contenere solo lettere, numeri, spazi e trattini.');
    if(!a) return fail('Per partecipare devi avere almeno 14 anni.');
    if(!p) return fail('Per partecipare devi accettare l\'informativa privacy.');
    let r; try{ r=await withTimeout(ACC.sb.rpc('completa_profilo',{soprannome:n, eta14:a, privacy_ok:p, privacy_ver:PRIVACY_VER})); }catch(e){ r={error:e}; }
    if(r.error){ if(isNet(r.error)) return offline('completa'); return fail(dbMsg(r.error)); }
    ACC.nickDraft=''; return afterLogin();
  }
  async function logout(){
    if(G && ACC.user && ACC.prof && ACC.prof.stato==='approvato'){ save(); await upload(); }
    try{ await ACC.sb.auth.signOut({scope:'local'}); }catch(e){}
    clearGame(); ACC.user=null; ACC.prof=null; ACC.ruolo=null; ACC.tab='accedi'; ACC.forgot=false; ACC.delStep=1;
    show('auth',{msg:'Sei uscito. A presto!', err:'', errKind:''});
  }
  async function delAccount(){
    let r; try{ r=await withTimeout(ACC.sb.rpc('cancella_account')); }catch(e){ r={error:e}; }
    if(r.error){ const t=isNet(r.error)?OFFLINE_TXT:'Cancellazione non riuscita: '+dbMsg(r.error);
      if(G){ ACC.err=t; render(); return; } return show('cancella',{err:t, msg:''}); }
    try{ localStorage.removeItem(KEYU()); localStorage.removeItem(KEYU()+':t'); }catch(e){}
    try{ await ACC.sb.auth.signOut({scope:'local'}); }catch(e){}
    clearGame(); ACC.user=null; ACC.prof=null; ACC.ruolo=null; ACC.tab='accedi'; ACC.delStep=1; ACC.email='';
    show('auth',{msg:'Il tuo account è stato cancellato, insieme alla partita e alle segnalazioni. Grazie di aver provato la beta.', err:'', errKind:''});
  }
  async function report(){
    const t=$('#acc-seg-t').value.trim(); ACC.segDraft=$('#acc-seg-t').value;
    if(!t){ ACC.err='Scrivi qualcosa prima di inviare.'; ACC.msg=''; render(); return; }
    const row={user_id:ACC.user.id, testo:t.slice(0,2000), versione:VERSION, stagione:G?G.season:null, giornata:G?G.md:null,
      schermata:area+'/'+sub+(clubView!=null?' · profilo del club '+((G&&G.T[clubView]&&G.T[clubView].n)||clubView):''), browser:String(navigator.userAgent||'').slice(0,400)};
    let r; try{ r=await withTimeout(ACC.sb.from('segnalazioni').insert(row)); }catch(e){ r={error:e}; }
    if(r.error){ ACC.err=isNet(r.error)?'Il server non risponde: la segnalazione non è partita. Riprova tra poco.':'Segnalazione non inviata: '+dbMsg(r.error); ACC.msg=''; render(); return; }
    ACC.segDraft=''; ACC.err=''; ACC.msg=''; modal=null; render(); toast('Grazie, segnalazione inviata');
  }
  function retry(){ const b=ACC.back; ACC.back=null;
    if(b==='start' || !ACC.sb) return (show('loading'), accStart());
    if(ACC.user && b!=='auth') return afterLogin();
    ACC.screen='auth'; ACC.err=''; ACC.msg=''; render(); if(ACC.tab==='registrati') checkOpen(); }

  /* ---------- eventi ---------- */
  document.addEventListener('click', e=>{
    const el=e.target.closest('[data-act]'); if(!el) return;
    const a=el.dataset.act; if(!a.startsWith('acc-') && a!=='reset2') return;
    switch(a){
      case 'acc-tab': ACC.tab=el.dataset.t; ACC.forgot=false; ACC.err=''; ACC.msg=''; ACC.errKind=''; render(); if(ACC.tab==='registrati' && ACC.open!==false) checkOpen(); break;
      case 'acc-avv': ACC.avv=!ACC.avv; render(); break;
      case 'acc-eye': { const inp=el.parentNode.querySelector('input'), sh=inp.type==='password';
        el.closest('form').querySelectorAll('.pwf input').forEach(i=>i.type=sh?'text':'password');
        el.closest('form').querySelectorAll('.eye').forEach(b=>{ b.setAttribute('aria-label',sh?'Nascondi la password':'Mostra la password'); b.title=b.getAttribute('aria-label'); b.classList.toggle('on',sh); }); break; }
      case 'acc-cont': if(ACC.reg.ok){ ACC.reg.step=2; ACC.err=''; ACC.msg=''; render(); const i=$('#acc-email'); if(i) i.focus(); } break;
      case 'acc-back1': ACC.reg.step=1; ACC.err=''; render(); break;
      case 'acc-forgot1': ACC.forgot=true; ACC.err=''; ACC.msg=''; ACC.email=($('#acc-email')||{}).value||ACC.email; render(); break;
      case 'acc-forgot0': ACC.forgot=false; ACC.err=''; ACC.msg=''; render(); break;
      case 'acc-tologin': ACC.tab='accedi'; ACC.forgot=false; show('auth',{err:'',msg:''}); break;
      case 'acc-resend': resend(); break;
      case 'acc-recheck': afterLogin().then(()=>{ if(ACC.screen==='attesa'){ ACC.msg='Ancora in attesa: ti scriveremo appena l\'iscrizione sarà approvata.'; render(); } }); break;
      case 'acc-retry': retry(); break;
      case 'acc-out': logout(); break;
      case 'acc-porta-si': { let s=null; try{ s=localStorage.getItem(KEY); }catch(_){}
        if(!s || !loadFrom(s)){ G=null; ACC.screen=null; render(); break; }
        ACC.porta=null; ACC.mark=null; ACC.screen=null; area='scrivania'; sub='home'; save(); render(); toast('Partita portata online.'); break; }
      case 'acc-porta-no': ACC.porta=null; G=null; ACC.screen=null; render(); break;
      case 'acc-seg': ACC.err=''; ACC.msg=''; modal='acc-seg'; render(); { const t=$('#acc-seg-t'); if(t) t.focus(); } break;
      case 'acc-avvm': modal='acc-avv'; render(); break;
      case 'acc-del1': ACC.delStep=1; ACC.err=''; ACC.msg=''; if(G){ modal='acc-del'; render(); } else show('cancella'); break;
      case 'acc-del2': ACC.delStep=2; render(); { const i=$('#acc-del-n'); if(i) i.focus(); } break;
      case 'acc-del0': ACC.delStep=1; ACC.err=''; if(G){ modal=null; render(); } else if(ACC.prof&&ACC.prof.completato&&ACC.prof.stato==='approvato'){ ACC.screen=null; render(); } else afterLogin(); break;
      case 'reset2': if(ACC.user){ try{ localStorage.removeItem(KEYU()); localStorage.removeItem(KEYU()+':t'); }catch(_){}
        ACC.mark=null; ACC.dirty=false; ACC.sync=null; withTimeout(ACC.sb.from('partite').delete().eq('user_id',ACC.user.id)).catch(()=>{}); } break;
    }
  });
  document.addEventListener('change', e=>{
    if(e.target.id==='acc-avv-ok'){ ACC.reg.ok=e.target.checked; ACC.reg.at=e.target.checked?new Date().toISOString():null; const b=$('#acc-cont'); if(b) b.disabled=!e.target.checked; }
    if(e.target.id==='acc-14'||e.target.id==='acc-priv') sumUpdate();
  });
  document.addEventListener('input', e=>{
    if(e.target.id==='acc-nick') sumUpdate();
    if(e.target.id==='acc-seg-t'){ ACC.segDraft=e.target.value; const n=$('#acc-seg-n'); if(n) n.textContent=e.target.value.length; }
    if(e.target.id==='acc-del-n'){ const need=(nick()||(ACC.user&&ACC.user.email)||'').trim().toLowerCase(), b=$('#acc-del-b'); if(b) b.disabled=e.target.value.trim().toLowerCase()!==need; }
  });
  document.addEventListener('submit', e=>{
    const id=e.target.id; if(!id || !id.startsWith('acc-')) return;
    e.preventDefault(); if(ACC.busy) return;
    const v=s=>{ const x=$(s); return x?x.value:''; };
    if(id==='acc-login') doLogin(v('#acc-email').trim(), v('#acc-pw'));
    else if(id==='acc-reg') doRegister(v('#acc-email').trim(), v('#acc-pw'), v('#acc-pw2'));
    else if(id==='acc-forgot') forgot(v('#acc-email').trim());
    else if(id==='acc-newpw') newPassword(v('#acc-np1'), v('#acc-np2'));
    else if(id==='acc-done') complete();
    else if(id==='acc-seg') report();
    else if(id==='acc-del'){ const need=(nick()||(ACC.user&&ACC.user.email)||'').trim().toLowerCase(); if(v('#acc-del-n').trim().toLowerCase()===need) delAccount(); }
  });
})();
