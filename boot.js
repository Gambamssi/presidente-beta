/* testi di shell.html nella lingua attiva (0.4.2.6, L1): in italiano non cambia nulla */
document.title=t_('pag.titolo');
if($('#tabs')) $('#tabs').setAttribute('aria-label',t_('pag.aree'));
if($('#subtabs')) $('#subtabs').setAttribute('aria-label',t_('pag.sottoschede'));
if(!load()) G=null;
render();
if(typeof accStart==='function') accStart(); /* beta con account (v0.037): senza config.js non fa nulla */

['input','change'].forEach(ev=>document.addEventListener(ev,e=>{ if(e.target&&e.target.id==='neg-v') negSyncLbl(); }));
