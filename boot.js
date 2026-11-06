/* testi di shell.html nella lingua attiva (0.4.2.6, L1): in italiano non cambia nulla */
document.title=t_('pag.titolo');
if($('#tabs')) $('#tabs').setAttribute('aria-label',t_('pag.aree'));
if($('#subtabs')) $('#subtabs').setAttribute('aria-label',t_('pag.sottoschede'));
if(!load()) G=null;
render();
if(typeof accStart==='function') accStart(); /* beta con account (v0.037): senza config.js non fa nulla */

document.addEventListener('input',e=>{ if(e.target&&e.target.id==='neg-v'){ const q=(G.req||[]).find(x=>x.id===negId); const o=$('#neg-vt'); if(q&&o) o.textContent=negVal(q,+e.target.value); } });
