/* ================= ACCOUNT DELLA BETA CHIUSA (v0.037) =================
   Si accende solo se c'è window.PRES_CONF = {supabaseUrl, supabaseKey, beta:true} (file config.js della cartella beta).
   Senza config.js non fa nulla: il gioco resta identico alla versione di lavoro (salvataggio nel browser).
   Il motore non sa che gli account esistono: qui si legge e si scrive G solo come salvataggio, e non si usa mai rnd().
   Funzioni del gioco "avvolte" in modalità beta: render, save, load, startScreen, vModal (stessi nomi, comportamento in più).
   Server: Supabase (auth + tabelle profili, partite, segnalazioni; funzioni iscrizioni_aperte, completa_profilo, cancella_account). */
const AVVISO_VER='2026-10-29', PRIVACY_VER='2026-10-29', BETA_MAIL='info@evivora.it';
const AVVISO_TESTO={
  intro:[t_("acc.evivora_e_un_gioco")],
  lead:t_("acc.partecipando_accetti_che"),
  punti:[t_("acc.il_gioco_puo_contenere"),
    t_("acc.regole_e_numeri_possono"),
    t_("acc.in_qualche_caso_le"),
    t_("acc.il_servizio_puo_essere"),
    t_("acc.le_iscrizioni_possono_essere"),
    t_("acc.non_ci_sono_garanzie")],
  fine:[t_("acc.il_gioco_e_gratuito"),
    t_("acc.le_tue_segnalazioni_sono"),
    t_("acc.contatto",{BETA_MAIL:BETA_MAIL})]
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
      t_("acc.il_link_della_mail") :
      t_("acc.il_link_della_mail_2");
  }
  const pageUrl=()=>location.origin+location.pathname;
  const authHash=()=>{ const h=location.hash||''; return h.length>1 && !/^#\//.test(h); };   /* il # non è un indirizzo del gioco (#/…): è del link della mail */
  const KEYU=()=>KEY+':'+ACC.user.id;                             /* copia nel browser: una chiave per ogni account */
  const nick=()=>(ACC.prof&&ACC.prof.soprannome)||'';
  const EYE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

  /* ---------- rete: tempi massimi e riconoscimento degli errori ---------- */
  function withTimeout(p, ms){ return Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej({name:t_("acc.timeout"), message:'timeout'}), ms||ACC.timeout))]); }
  function isNet(e){ if(!e) return false; const m=String(e.message||e); const st=+e.status||0;
    return e.name==='AuthRetryableFetchError' || e.name===t_("acc.timeout") || /failed to fetch|networkerror|load failed|fetch failed|timeout|network request failed/i.test(m) || st>=502; }
  const OFFLINE_TXT=t_("acc.il_server_della_beta",{BETA_MAIL:BETA_MAIL});
  const CLOSED_TXT=t_("acc.le_iscrizioni_alla_beta",{BETA_MAIL:BETA_MAIL});
  function dbMsg(e){ const m=String((e&&e.message)||''); return m.replace(/^ERROR:\s*/,'').replace(/^ISCRIZIONI_CHIUSE:\s*/,'') || t_("acc.qualcosa_non_ha_funzionato"); }

  /* ---------- schermate ---------- */
  function show(scr, o){ ACC.screen=scr; ACC.busy=false; if(o){ if('msg' in o) ACC.msg=o.msg; if('err' in o) ACC.err=o.err; if('errKind' in o) ACC.errKind=o.errKind; } render(); window.scrollTo(0,0); }
  function offline(back){ ACC.back=back||null; show('offline',{msg:'', err:''}); }
  function msgHTML(){ return (ACC.err?`<p class="acc-err" role="alert">${esc(ACC.err)}</p>`:'')+(ACC.msg?`<p class="acc-ok" role="status">${esc(ACC.msg)}</p>`:''); }
  function pwField(id, ac, lbl){ return `<label for="${id}">${lbl}</label><div class="pwf"><input id="${id}" type="password" autocomplete="${ac}" minlength="8" required><button type="button" class="eye" data-act="acc-eye" aria-label="${t_("acc.mostra_la_password")}" title="${t_("acc.mostra_la_password")}">${EYE}</button></div>`; }
  function topAcc(){
    const who=ACC.user?(nick()||ACC.user.email||''):'';
    return `<div class="brand"><span class="wm">${LOGO_SVG}EVIVORA</span><span class="ver" title="${t_("acc.versione_del_gioco")}">${t_("acc.v",{VERSION:VERSION})}</span><span class="beta-tag">${t_("acc.versione_di_prova")}</span></div>
      <div class="acts">${ACC.user?`<span class="acc-me" title="${esc(ACC.user.email||'')}">${esc(who)}</span><button class="btn ghost small" data-act="acc-out">${t_("acc.esci")}</button>`:''}${themeBtn()}</div>`;
  }
  function introHTML(){
    return `<section class="card acc-intro"><p class="eyebrow">${t_("acc.beta_chiusa_versione",{VERSION:VERSION})}</p><h1 class="acc-t">EVIVORA</h1><p class="tagline">${t_("acc.sei_il_presidente")}</p>
      <p>${t_("acc.il_gioco_manageriale_di")}</p>
      <p class="muted">${t_("acc.per_giocare_alla_beta")}</p>
      <p class="acc-links"><a href="privacy.html" target="_blank" rel="noopener">${t_("acc.informativa_privacy")}</a> · <button class="link" data-act="acc-avv" aria-expanded="${ACC.avv}">${t_("acc.avviso_del_progetto")}</button></p>
      ${ACC.avv?`<div class="acc-avviso">${avvisoHTML()}</div>`:''}</section>`;
  }
  function mainHTML(){
    const s=ACC.screen, em=esc(ACC.email||'');
    if(s==='loading') return `<p class="eyebrow">${t_("acc.un_attimo")}</p><h2>${t_("acc.mi_collego_al_server")}</h2><p class="muted">${t_("acc.se_ci_mette_molto")}</p>`;
    if(s==='offline') return `<p class="eyebrow">${t_("acc.server_non_raggiungibile")}</p><h2>${t_("acc.il_server_non_risponde")}</h2><p class="acc-err" role="alert">${esc(OFFLINE_TXT)}</p><div class="row"><button class="btn" data-act="acc-retry">${t_("acc.riprova")}</button>${ACC.user?`<button class="btn ghost" data-act="acc-out">${t_("acc.esci")}</button>`:''}</div>`;
    if(s==='mail') return `<p class="eyebrow">${t_("acc.passo_2_di_2")}</p><h2>${t_("acc.controlla_la_posta")}</h2>
      <p>${t_("acc.ti_abbiamo_mandato_una",{em:em})}</p>${msgHTML()}
      <div class="row"><button class="btn" data-act="acc-resend">${t_("acc.rimanda_la_mail")}</button><button class="btn ghost" data-act="acc-tologin">${t_("acc.torna_all_accesso")}</button></div>`;
    if(s==='completa'){ const p=ACC.prof||{};
      return `<p class="eyebrow">${t_("acc.ultimo_passo_i_tuoi")}</p><h2>${t_("acc.completa_il_profilo")}</h2>
      <form id="acc-done" class="accf" novalidate>
        <label for="acc-nick">${t_("acc.soprannome")}</label><input id="acc-nick" maxlength="20" autocomplete="nickname" value="${esc(ACC.nickDraft||'')}" aria-describedby="acc-nick-h">
        <p class="hint" id="acc-nick-h">${t_("acc.e_il_nome_del")}</p>
        <label class="acc-chk"><input type="checkbox" id="acc-14"><span>${t_("acc.ho_almeno_14_anni")}</span></label>
        <label class="acc-chk"><input type="checkbox" id="acc-priv"><span>${t_("acc.ho_letto_l")}<a href="privacy.html" target="_blank" rel="noopener">${t_("acc.informativa_privacy_2")}</a> ${t_("acc.e_acconsento_al_trattamento")}</span></label>
        <div class="acc-sum"><p class="eyebrow">${t_("acc.riepilogo")}</p><dl>
          <div><dt>${t_("acc.email")}</dt><dd id="sum-em">${esc(p.email||ACC.user.email||'')}</dd></div>
          <div><dt>${t_("acc.soprannome")}</dt><dd id="sum-nick">—</dd></div>
          <div><dt>${t_("acc.avviso_del_progetto")}</dt><dd id="sum-avv">${p.avviso_ok?t_("acc.accettato_il",{dataOra:esc(dataOra(p.avviso_il))}):t_("acc.non_risulta_accettato")}</dd></div>
          <div><dt>${t_("acc.eta")}</dt><dd id="sum-14">${t_("acc.da_confermare")}</dd></div>
          <div><dt>${t_("acc.privacy")}</dt><dd id="sum-priv">${t_("acc.da_accettare")}</dd></div></dl></div>
        ${msgHTML()}
        <div class="row"><button class="btn go" type="submit" id="acc-done-b" disabled>${t_("acc.confermo_i_miei_dati")}</button><button type="button" class="btn ghost" data-act="acc-out">${t_("acc.esci")}</button></div>
      </form>${footHTML()}`; }
    if(s==='attesa') return `<p class="eyebrow">${t_("acc.iscrizione_ricevuta")}</p><h2>${t_("acc.grazie",{nick:esc(nick())})}</h2>
      <p>${t_("acc.la_tua_iscrizione_e",{prof:esc((ACC.prof&&ACC.prof.email)||ACC.user.email||'')})}</p>${msgHTML()}
      <div class="row"><button class="btn" data-act="acc-recheck">${t_("acc.ricontrolla")}</button><button class="btn ghost" data-act="acc-out">${t_("acc.esci")}</button></div>${footHTML()}`;
    if(s==='sospeso') return `<p class="eyebrow">${t_("acc.account_sospeso")}</p><h2>${t_("acc.non_puoi_giocare_per")}</h2><p class="acc-err" role="alert">${t_("acc.il_tuo_account_e",{BETA_MAIL:BETA_MAIL})}</p>
      <div class="row"><button class="btn ghost" data-act="acc-out">${t_("acc.esci")}</button></div>`;
    if(s==='errore') return `<p class="eyebrow">${t_("acc.problema")}</p><h2>${t_("acc.qualcosa_non_va")}</h2>${msgHTML()}<div class="row"><button class="btn" data-act="acc-retry">${t_("acc.riprova")}</button><button class="btn ghost" data-act="acc-out">${t_("acc.esci")}</button></div>`;
    if(s==='nuovapw') return `<p class="eyebrow">${t_("acc.recupero_della_password")}</p><h2>${t_("acc.nuova_password")}</h2>
      <form id="acc-newpw" class="accf" novalidate>${pwField('acc-np1','new-password',t_("acc.nuova_password_almeno_8"))}${pwField('acc-np2','new-password',t_("acc.ripeti_la_nuova_password"))}
      ${msgHTML()}<div class="row"><button class="btn go" type="submit">${t_("acc.salva_la_password")}</button></div></form>`;
    if(s==='porta'){ const x=ACC.porta||{};
      return `<p class="eyebrow">${t_("acc.partita_nel_browser")}</p><h2>${t_("acc.portarla_online")}</h2>
      <p>${t_("acc.nel_browser_c_e",{s:x.s,md:x.md,club:esc(x.club||'')})}</p>${msgHTML()}
      <div class="row"><button class="btn go" data-act="acc-porta-si">${t_("acc.si_portala_online")}</button><button class="btn ghost" data-act="acc-porta-no">${t_("acc.no_inizia_una_nuova")}</button></div>`; }
    if(s==='cancella') return delHTML();
    /* accesso e registrazione */
    const tabs=`<div class="acc-tabs" role="tablist"><button role="tab" aria-selected="${ACC.tab==='accedi'}" class="${ACC.tab==='accedi'?'on':''}" data-act="acc-tab" data-t="accedi">${t_("acc.accedi")}</button><button role="tab" aria-selected="${ACC.tab==='registrati'}" class="${ACC.tab==='registrati'?'on':''}" data-act="acc-tab" data-t="registrati">${t_("acc.registrati")}</button></div>`;
    let b='';
    if(ACC.tab==='accedi'){
      if(ACC.forgot) b=`<form id="acc-forgot" class="accf" novalidate><p>${t_("acc.scrivi_l_email_dell")}</p>
        <label for="acc-email">${t_("acc.email")}</label><input id="acc-email" type="email" autocomplete="email" value="${em}" required>${msgHTML()}
        <div class="row"><button class="btn" type="submit">${t_("acc.mandami_la_mail")}</button><button type="button" class="btn ghost" data-act="acc-forgot0">${t_("acc.torna_all_accesso_2")}</button></div></form>`;
      else b=`<form id="acc-login" class="accf" novalidate><label for="acc-email">${t_("acc.email")}</label><input id="acc-email" type="email" autocomplete="email" value="${em}" required>
        ${pwField('acc-pw','current-password',t_("acc.password"))}${msgHTML()}
        ${ACC.errKind==='nonconf'?`<div class="row"><button type="button" class="btn ghost small" data-act="acc-resend">${t_("acc.rimanda_la_mail")}</button></div>`:''}
        <div class="row acc-row"><button class="btn go" type="submit">${t_("acc.entra")}</button><button type="button" class="link" data-act="acc-forgot1">${t_("acc.password_dimenticata")}</button></div></form>`;
    } else {
      if(ACC.open===null) b=`<p class="muted">${t_("acc.controllo_se_le_iscrizioni")}</p>`;
      else if(ACC.open===false) b=`<p class="acc-closed" role="status">${esc(CLOSED_TXT)}</p>`;
      else if(ACC.reg.step===1) b=`<p class="eyebrow">${t_("acc.passo_1_di_2")}</p>
        <div class="acc-avviso" tabindex="0" aria-label="${t_("acc.avviso_del_progetto")}">${avvisoHTML()}</div>
        <label class="acc-chk"><input type="checkbox" id="acc-avv-ok"${ACC.reg.ok?' checked':''}><span>${t_("acc.ho_letto_l_avviso")}</span></label>${msgHTML()}
        <div class="row"><button class="btn" data-act="acc-cont" id="acc-cont"${ACC.reg.ok?'':' disabled'}>${t_("acc.continua")}</button></div>`;
      else b=`<p class="eyebrow">${t_("acc.passo_2_di_2_2")}</p><form id="acc-reg" class="accf" novalidate>
        <label for="acc-email">${t_("acc.email")}</label><input id="acc-email" type="email" autocomplete="email" value="${em}" required>
        ${pwField('acc-pw','new-password',t_("acc.password_almeno_8_caratteri"))}${pwField('acc-pw2','new-password',t_("acc.ripeti_la_password"))}${msgHTML()}
        <div class="row"><button class="btn go" type="submit">${t_("acc.registrati")}</button><button type="button" class="btn ghost" data-act="acc-back1">${t_("acc.indietro")}</button></div></form>`;
    }
    return tabs+b;
  }
  function footHTML(){ return ACC.user?`<p class="acc-foot muted"><a href="privacy.html" target="_blank" rel="noopener">${t_("acc.informativa_privacy")}</a> · <button class="link" data-act="acc-del1">${t_("acc.cancella_il_mio_account")}</button></p>`:''; }
  function delHTML(){ const step=ACC.delStep||1, need=nick()||(ACC.user&&ACC.user.email)||'';
    return `<p class="eyebrow">${t_("acc.cancellazione_dell_account")}</p><h2>${t_("acc.cancella_il_mio_account")}</h2>
      ${step===1?`<p>${t_("acc.cancellando_l_account_spariscono")}</p>${msgHTML()}
        <div class="row"><button class="btn danger" data-act="acc-del2">${t_("acc.voglio_cancellarlo")}</button><button class="btn ghost" data-act="acc-del0">${t_("acc.annulla")}</button></div>`
      :`<form id="acc-del" class="accf" novalidate><label for="acc-del-n">${t_("acc.per_confermare_scrivi",{v:nick()?t_("acc.il_tuo_soprannome"):t_("acc.la_tua_email"),need:esc(need)})}</label><input id="acc-del-n" autocomplete="off" required>${msgHTML()}
        <div class="row"><button class="btn danger" type="submit" id="acc-del-b" disabled>${t_("acc.cancella_definitivamente")}</button><button type="button" class="btn ghost" data-act="acc-del0">${t_("acc.annulla")}</button></div></form>`}`; }
  function dataOra(t){ if(!t) return '—'; const d=new Date(t); if(isNaN(d)) return '—';
    return fData(d,{day:'numeric',month:'long',year:'numeric'})+` ${t_("acc.alle",{fOra:fOra(d,{hour:'2-digit',minute:'2-digit'})})}`; }
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
    $('#sum-nick').textContent=v||'—'; $('#sum-14').textContent=a.checked?t_("acc.ha_almeno_14_anni"):t_("acc.da_confermare");
    $('#sum-priv').textContent=p.checked?t_("acc.informativa_accettata_versione_d",{join:PRIVACY_VER.split('-').reverse().join('/')}):t_("acc.da_accettare");
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
    const v=$('.top .ver'); if(v && !$('.top .beta-tag')) v.insertAdjacentHTML('afterend',`<span class="beta-tag">${t_("acc.versione_di_prova")}</span>`);
    const st=$('.top .stat'); if(st) st.insertAdjacentHTML('beforeend',`<span class="sync${ACC.sync&&!ACC.sync.ok?' bad':''}" id="acc-sync">${esc(syncText())}</span>`);
  };
  startScreen=function(){
    return _startScreen().replace(t_('ui.dati_nel_browser'),t_("acc.la_partita_si_salva"))+`<p class="acc-foot muted center">${t_("acc.collegato_come",{nick:esc(nick()||ACC.user&&ACC.user.email||'')})} <a href="privacy.html" target="_blank" rel="noopener">${t_("acc.informativa_privacy")}</a> · <button class="link" data-act="acc-del1">${t_("acc.cancella_il_mio_account")}</button></p>`;
  };
  vModal=function(){
    const wrap=h=>`<div class="modal" id="modal-bg" role="dialog" aria-modal="true"><div class="neg-in modal-in">${h}</div></div>`;
    const head=(e,t)=>`<div class="neg-h"><div><p class="eyebrow">${e}</p><h2>${t}</h2></div><button class="x" data-act="mclose" aria-label="${t_("acc.chiudi")}">${t_("acc.x")}</button></div>`;
    if(modal==='menu'){ let h=_vModal();
      const who=`<div class="acc-who"><b>${esc(nick())}</b><span>${esc((ACC.user&&ACC.user.email)||'')}</span><span class="sync${ACC.sync&&!ACC.sync.ok?' bad':''}">${esc(syncText())}</span></div>`;
      const more=`<button class="btn ghost" data-act="acc-seg">${t_("acc.segnala_un_problema")}</button><a class="btn ghost" href="privacy.html" target="_blank" rel="noopener">${t_("acc.informativa_privacy")}</a><button class="btn ghost" data-act="acc-avvm">${t_("acc.avviso_del_progetto")}</button><button class="btn ghost" data-act="acc-out">${t_("acc.esci")}</button><button class="btn ghost danger-t" data-act="acc-del1">${t_("acc.cancella_il_mio_account")}</button>`;
      h=h.replace('<div class="menu">', who+'<div class="menu">').replace(`${t_("acc.cambia_nome_della_segretaria")}</button>`,`${t_("acc.cambia_nome_della_segretaria")}</button>`+more);
      return h; }
    if(modal==='acc-seg') return wrap(head(t_("acc.beta_versione",{VERSION:VERSION}),t_("acc.segnala_un_problema"))+`<form id="acc-seg" class="accf" novalidate>
      <label for="acc-seg-t">${t_("acc.cosa_non_va_racconta")}</label><textarea id="acc-seg-t" maxlength="2000" rows="6" required>${esc(ACC.segDraft||'')}</textarea>
      <p class="hint"><span id="acc-seg-n">${(ACC.segDraft||'').length}</span>${t_("acc.2000_insieme_al_testo")}</p>${msgHTML()}
      <div class="row"><button class="btn" type="submit">${t_("acc.invia_la_segnalazione")}</button><button type="button" class="btn ghost" data-act="mclose">${t_("acc.annulla")}</button></div></form>`);
    if(modal==='acc-avv') return wrap(head(t_("acc.versione_del",{join:AVVISO_VER.split('-').reverse().join('/')}),t_("acc.avviso_del_progetto"))+`<div class="acc-avviso">${avvisoHTML()}</div><div class="row"><button class="btn" data-act="mclose">${t_("acc.chiudi")}</button></div>`);
    if(modal==='acc-del') return wrap(`<div class="neg-h"><div></div><button class="x" data-act="mclose" aria-label="${t_("acc.chiudi")}">${t_("acc.x")}</button></div>`+delHTML());
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
    if(!s.ok) return t_("acc.salvataggio_online_non_riuscito");
    return t_("acc.salvato_online_alle",{fOra:fOra(new Date(s.t),{hour:'2-digit',minute:'2-digit'})}); }
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
    if(!C.supabaseUrl || !C.supabaseKey){ show('errore',{err:t_("acc.non_riesco_a_leggere",{BETA_MAIL:BETA_MAIL})}); return; }
    if(!window.supabase || !window.supabase.createClient){ show('errore',{err:t_("acc.non_riesco_a_caricare")}); return; }
    if(!ACC.sb){
      ACC.sb=window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'implicit', storageKey:'presidente-beta-auth'}}   /* implicit: i link delle mail tornano con #access_token… */);
      ACC.sb.auth.onAuthStateChange((ev)=>{ if(ev==='PASSWORD_RECOVERY'){ ACC.recovery=true; setTimeout(()=>{ if(ACC.screen!=='nuovapw') show('nuovapw',{msg:'',err:''}); },0); } });
    }
    let r; try{ r=await withTimeout(ACC.sb.auth.getSession()); }catch(e){ r={error:e}; }
    if(r.error){ if(isNet(r.error)) return offline('start'); }
    const ses=r.data&&r.data.session;
    if(ses && ses.user){ ACC.user=ses.user; ACC.email=ses.user.email||'';
      if(ACC.recovery){ show('nuovapw',{msg:'',err:''}); return; }
      if(authHash()) history.replaceState(null,'',pageUrl());   /* toglie solo i dati del link della mail: un indirizzo #/… del gioco resta (0.4.2.1) */
      return afterLogin(); }
    if(authHash()) history.replaceState(null,'',pageUrl());
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
    if(r.error){ if(isNet(r.error)) return offline('profile'); return show('errore',{err:t_("acc.non_riesco_a_leggere_2",{dbMsg:dbMsg(r.error)})}); }
    ACC.prof=r.data;
    ACC.ruolo=(ACC.prof&&ACC.prof.ruolo)||'giocatore';             /* solo letto: servirà nel blocco 6c (moderatori, Amministrazione) */
    if(!ACC.prof) return show('errore',{err:t_("acc.il_tuo_profilo_non",{BETA_MAIL:BETA_MAIL})});
    if(ACC.prof.stato==='sospeso') return show('sospeso');
    if(!ACC.prof.completato) return show('completa',{msg:'',err:''});
    if(ACC.prof.stato!=='approvato') return show('attesa',{msg:'',err:''});
    return loadGame();
  }
  function readLocal(){ try{ return {s:localStorage.getItem(KEYU()), t:localStorage.getItem(KEYU()+':t')}; }catch(e){ return {s:null,t:null}; } }
  async function loadGame(){
    show('loading');
    let r; try{ r=await withTimeout(ACC.sb.from('partite').select('dati,dati_z,versione,stagione,giornata,aggiornata_il').eq('user_id',ACC.user.id).maybeSingle()); }catch(e){ r={error:e}; }
    if(r.error){ if(isNet(r.error)) return offline('profile'); return show('errore',{err:t_("acc.non_riesco_a_leggere_3",{dbMsg:dbMsg(r.error)})}); }
    const on=r.data, loc=readLocal();
    let onS=null; if(on){ try{ onS=on.dati_z? await gunz(on.dati_z) : (on.dati? JSON.stringify(on.dati) : null); }catch(e){ onS=null; } }
    const onT=on&&on.aggiornata_il? Date.parse(on.aggiornata_il) : 0, locT=loc.t? Date.parse(loc.t) : 0;
    let src=null, push=false;
    if(onS && (!loc.s || onT>=locT)) src=onS;                      /* vince la copia più recente */
    else if(loc.s){ src=loc.s; push=true; }
    if(src){
      if(!loadFrom(src)){ G=null; return show('errore',{err:t_("acc.la_partita_salvata_non",{BETA_MAIL:BETA_MAIL})}); }
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
    if(!email || !pw){ return show('auth',{err:t_("acc.scrivi_email_e_password"), msg:''}); }
    let r; try{ r=await withTimeout(ACC.sb.auth.signInWithPassword({email, password:pw})); }catch(e){ r={error:e}; }
    if(r.error){ const e=r.error, c=e.code||'', m=String(e.message||'');
      if(isNet(e)) return offline('auth');
      if(c==='email_not_confirmed' || /not confirmed/i.test(m)) return show('auth',{err:t_("acc.devi_ancora_confermare_l"), msg:'', errKind:'nonconf'});
      if(c==='invalid_credentials' || /invalid login/i.test(m)) return show('auth',{err:t_("acc.email_o_password_non"), msg:''});
      if(/rate|too many/i.test(m)) return show('auth',{err:t_("acc.troppi_tentativi_in_poco"), msg:''});
      return show('auth',{err:t_("acc.accesso_non_riuscito",{m:m}), msg:''}); }
    ACC.user=r.data.user; ACC.msg=''; ACC.err='';
    return afterLogin();
  }
  async function doRegister(email, p1, p2){
    ACC.email=email;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show('auth',{err:t_("acc.scrivi_un_indirizzo_email"), msg:''});
    if(p1.length<8) return show('auth',{err:t_("acc.la_password_deve_avere"), msg:''});
    if(p1!==p2) return show('auth',{err:t_("acc.le_due_password_sono"), msg:''});
    ACC.busy=true;
    let r; try{ r=await withTimeout(ACC.sb.auth.signUp({email, password:p1, options:{emailRedirectTo:pageUrl(), data:{avviso_ok:true, avviso_ver:AVVISO_VER, avviso_il:ACC.reg.at||new Date().toISOString()}}})); }catch(e){ r={error:e}; }
    if(r.error){ const e=r.error, m=String(e.message||''), c=e.code||'';
      if(/ISCRIZIONI_CHIUSE/.test(m) || /database error saving new user/i.test(m) || +e.status===500){
        /* il server ha rifiutato: se le iscrizioni sono state chiuse nel frattempo lo diciamo chiaro */
        const open=await checkOpen(); if(open===false){ ACC.err=''; return show('auth'); }
        return show('auth',{err:t_("acc.il_server_non_ha",{BETA_MAIL:BETA_MAIL}), msg:''}); }
      if(isNet(e)) return offline('auth');
      if(c==='weak_password' || /password/i.test(m)) return show('auth',{err:t_("acc.la_password_non_va"), msg:''});
      if(/already|registered|exists/i.test(m)) return show('auth',{err:t_("acc.questo_indirizzo_e_gia"), msg:''});
      if(/rate|too many|seconds/i.test(m)) return show('auth',{err:t_("acc.troppe_mail_in_poco"), msg:''});
      return show('auth',{err:t_("acc.iscrizione_non_riuscita",{m:m}), msg:''}); }
    const u=r.data&&r.data.user;
    if(u && Array.isArray(u.identities) && u.identities.length===0) return show('auth',{err:t_("acc.questo_indirizzo_e_gia"), msg:''});
    if(r.data && r.data.session){ ACC.user=r.data.session.user; return afterLogin(); }   /* conferma della mail spenta sul server */
    ACC.reg={step:1, ok:false, at:null};
    show('mail',{msg:'', err:''});
  }
  async function resend(){
    let r; try{ r=await withTimeout(ACC.sb.auth.resend({type:'signup', email:ACC.email, options:{emailRedirectTo:pageUrl()}})); }catch(e){ r={error:e}; }
    if(r.error){ if(isNet(r.error)) return offline(ACC.screen==='mail'?'mail':'auth'); return show(ACC.screen,{err:/rate|seconds|too many/i.test(r.error.message||'')?t_("acc.hai_appena_chiesto_una"):t_("acc.non_sono_riuscito_a",{message:r.error.message}), msg:''}); }
    show(ACC.screen,{msg:t_("acc.mail_rimandata_a_controlla",{email:ACC.email}), err:''});
  }
  async function forgot(email){
    ACC.email=email;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show('auth',{err:t_("acc.scrivi_un_indirizzo_email"), msg:''});
    let r; try{ r=await withTimeout(ACC.sb.auth.resetPasswordForEmail(email,{redirectTo:pageUrl()})); }catch(e){ r={error:e}; }
    if(r.error){ if(isNet(r.error)) return offline('auth'); if(/rate|seconds|too many/i.test(r.error.message||'')) return show('auth',{err:t_("acc.hai_appena_chiesto_una"), msg:''}); }
    show('auth',{msg:t_("acc.se_l_indirizzo_e"), err:''});
  }
  async function newPassword(p1,p2){
    if(p1.length<8) return show('nuovapw',{err:t_("acc.la_password_deve_avere"), msg:''});
    if(p1!==p2) return show('nuovapw',{err:t_("acc.le_due_password_sono"), msg:''});
    let r; try{ r=await withTimeout(ACC.sb.auth.updateUser({password:p1})); }catch(e){ r={error:e}; }
    if(r.error){ if(isNet(r.error)) return offline('nuovapw'); return show('nuovapw',{err:/different|same/i.test(r.error.message||'')?t_("acc.la_nuova_password_deve"):t_("acc.non_sono_riuscito_a_2",{message:r.error.message}), msg:''}); }
    ACC.recovery=false; if(authHash()) history.replaceState(null,'',pageUrl());
    if(r.data&&r.data.user) ACC.user=r.data.user;
    toast(t_("acc.password_cambiata")); afterLogin();
  }
  async function complete(){
    const n=$('#acc-nick').value.trim(), a=$('#acc-14').checked, p=$('#acc-priv').checked;
    ACC.nickDraft=$('#acc-nick').value;
    const fail=t=>{ show('completa',{err:t, msg:''}); const x=$('#acc-14'), y=$('#acc-priv'); if(x) x.checked=a; if(y) y.checked=p; sumUpdate(); };
    if(n.length<3||n.length>20) return fail(t_("acc.il_soprannome_deve_avere"));
    if(!/^[A-Za-zÀ-ÖØ-öø-ÿ0-9 -]+$/.test(n)) return fail(t_("acc.il_soprannome_puo_contenere"));
    if(!a) return fail(t_("acc.per_partecipare_devi_avere"));
    if(!p) return fail(t_("acc.per_partecipare_devi_accettare"));
    let r; try{ r=await withTimeout(ACC.sb.rpc('completa_profilo',{soprannome:n, eta14:a, privacy_ok:p, privacy_ver:PRIVACY_VER})); }catch(e){ r={error:e}; }
    if(r.error){ if(isNet(r.error)) return offline('completa'); return fail(dbMsg(r.error)); }
    ACC.nickDraft=''; return afterLogin();
  }
  async function logout(){
    if(G && ACC.user && ACC.prof && ACC.prof.stato==='approvato'){ save(); await upload(); }
    try{ await ACC.sb.auth.signOut({scope:'local'}); }catch(e){}
    clearGame(); ACC.user=null; ACC.prof=null; ACC.ruolo=null; ACC.tab='accedi'; ACC.forgot=false; ACC.delStep=1;
    show('auth',{msg:t_("acc.sei_uscito_a_presto"), err:'', errKind:''});
  }
  async function delAccount(){
    let r; try{ r=await withTimeout(ACC.sb.rpc('cancella_account')); }catch(e){ r={error:e}; }
    if(r.error){ const t=isNet(r.error)?OFFLINE_TXT:t_("acc.cancellazione_non_riuscita",{dbMsg:dbMsg(r.error)});
      if(G){ ACC.err=t; render(); return; } return show('cancella',{err:t, msg:''}); }
    try{ localStorage.removeItem(KEYU()); localStorage.removeItem(KEYU()+':t'); }catch(e){}
    try{ await ACC.sb.auth.signOut({scope:'local'}); }catch(e){}
    clearGame(); ACC.user=null; ACC.prof=null; ACC.ruolo=null; ACC.tab='accedi'; ACC.delStep=1; ACC.email='';
    show('auth',{msg:t_("acc.il_tuo_account_e_2"), err:'', errKind:''});
  }
  async function report(){
    const t=$('#acc-seg-t').value.trim(); ACC.segDraft=$('#acc-seg-t').value;
    if(!t){ ACC.err=t_("acc.scrivi_qualcosa_prima_di"); ACC.msg=''; render(); return; }
    const row={user_id:ACC.user.id, testo:t.slice(0,2000), versione:VERSION, stagione:G?G.season:null, giornata:G?G.md:null,
      schermata:area+'/'+sub+(clubView!=null?` ${t_("acc.profilo_del_club",{G:(G&&G.T[clubView]&&G.T[clubView].n)||clubView})}`:''), browser:String(navigator.userAgent||'').slice(0,400)};
    let r; try{ r=await withTimeout(ACC.sb.from('segnalazioni').insert(row)); }catch(e){ r={error:e}; }
    if(r.error){ ACC.err=isNet(r.error)?t_("acc.il_server_non_risponde_2"):t_("acc.segnalazione_non_inviata",{dbMsg:dbMsg(r.error)}); ACC.msg=''; render(); return; }
    ACC.segDraft=''; ACC.err=''; ACC.msg=''; modal=null; render(); toast(t_("acc.grazie_segnalazione_inviata"));
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
        el.closest('form').querySelectorAll('.eye').forEach(b=>{ b.setAttribute('aria-label',sh?t_("acc.nascondi_la_password"):t_("acc.mostra_la_password")); b.title=b.getAttribute('aria-label'); b.classList.toggle('on',sh); }); break; }
      case 'acc-cont': if(ACC.reg.ok){ ACC.reg.step=2; ACC.err=''; ACC.msg=''; render(); const i=$('#acc-email'); if(i) i.focus(); } break;
      case 'acc-back1': ACC.reg.step=1; ACC.err=''; render(); break;
      case 'acc-forgot1': ACC.forgot=true; ACC.err=''; ACC.msg=''; ACC.email=($('#acc-email')||{}).value||ACC.email; render(); break;
      case 'acc-forgot0': ACC.forgot=false; ACC.err=''; ACC.msg=''; render(); break;
      case 'acc-tologin': ACC.tab='accedi'; ACC.forgot=false; show('auth',{err:'',msg:''}); break;
      case 'acc-resend': resend(); break;
      case 'acc-recheck': afterLogin().then(()=>{ if(ACC.screen==='attesa'){ ACC.msg=t_("acc.ancora_in_attesa_ti"); render(); } }); break;
      case 'acc-retry': retry(); break;
      case 'acc-out': logout(); break;
      case 'acc-porta-si': { let s=null; try{ s=localStorage.getItem(KEY); }catch(_){}
        if(!s || !loadFrom(s)){ G=null; ACC.screen=null; render(); break; }
        ACC.porta=null; ACC.mark=null; ACC.screen=null; area='scrivania'; sub='home'; save(); render(); toast(t_("acc.partita_portata_online")); break; }
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
