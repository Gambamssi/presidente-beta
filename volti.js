/* Evivora · volti illustrati (0.4.2.4, G1a): copia invariata di Evivora-scambio risposte/013-scrivania-obiettivo-volti/volti.js (approvata).
   Nel gioco: faceSVG(seme, {eta, ruolo, colori:{primario, secondario}}) con i colori del club; maglie.js va caricata prima. Solo disegno. */
/* EVIVORA V1.1 — Volti illustrati procedurali · richiesta 013
 * faceSVG(seme, {eta=25,ruolo='giocatore',colori,genere,espressione}) -> SVG
 * Nessuna risorsa esterna, nessuna immagine/persona reale. La stessa identità
 * resta coerente cambiando età o espressione. I colori biologici sono palette
 * illustrative; UI e abbigliamento del ruolo usano i token --ev-*.
 * Con maglie.js incluso PRIMA, il giocatore indossa la divisa di magliaSVG().
 */
(function(root){'use strict';
const SKIN=[['#f8dcc3','#eec39e','#d29d7d'],['#f3caa9','#daa37d','#b8755a'],['#e7b993','#ce8e67','#a96a4e'],['#d8a47c','#c0835c','#91583e'],['#c69370','#ab704d','#7d4a33'],['#b8815e','#966044','#673d2a'],['#ac7655','#8e563a','#603925'],['#9e694a','#76472f','#4d301f'],['#8e593c','#6c412e','#45291f'],['#805039','#603827','#3a241d'],['#6e4632','#503124','#31211c'],['#614031','#462d23','#261e1b']];
const HAIR=['#17191c','#242629','#35251e','#44332c','#553626','#6b4635','#804d37','#936843','#ab8665','#914c38','#624640','#4c3531'];
const EYE=['#4b332a','#694b36','#2e6873','#597d60','#86663f','#657d84','#37343b'];
const EXPRESS=['neutra','sorriso','aperto','concentrata'];
const SHAPES=[
  'M54 83Q52 50 68 42Q91 32 111 43Q131 54 128 89L124 117Q113 145 90 154Q68 148 57 122Z', // ovale
  'M51 78Q52 48 72 42Q91 37 113 43Q132 49 131 80L129 120Q119 149 91 151Q61 149 52 120Z', // quadrato
  'M58 79Q54 44 74 39Q92 35 111 40Q130 47 124 83L122 128Q113 162 91 164Q65 153 59 128Z', // lungo
  'M49 84Q48 50 70 44Q91 38 111 44Q134 52 134 86L129 117Q117 144 91 147Q64 144 53 119Z', // tondo
  'M48 78Q50 43 75 40Q93 36 112 42Q131 49 134 81L124 111Q116 146 92 155Q64 148 52 114Z', // zigomi
  'M56 76Q51 47 70 39Q92 33 111 41Q128 48 128 78L125 125Q113 151 90 158Q67 149 56 121Z'
];
function u32(v){let n=Number(v);return Number.isFinite(n)?(Math.trunc(n)>>>0):0}
function hash(x){x=(x+0x9e3779b9)>>>0;x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);return(x^(x>>>16))>>>0}
function pick(s,n,k){return hash(s^Math.imul(n,0x9e3779b1))%k}
function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
function blend(a,b,t){const v=clamp(t,0,1),aa=a.slice(1),bb=b.slice(1);let s='#';for(let i=0;i<6;i+=2)s+=Math.round(parseInt(aa.slice(i,i+2),16)*(1-v)+parseInt(bb.slice(i,i+2),16)*v).toString(16).padStart(2,'0');return s}
function color(v,f){return typeof v==='string'&&(/^#[0-9a-f]{6}$/i.test(v)||/^var\(--ev-[\w-]+\)$/.test(v))?v:f}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function faceSVG(seme,options){
 const o=options||{},s=u32(seme),age=clamp(Number(o.eta??25)||25,16,75),role=String(o.ruolo||'giocatore').toLowerCase();
 const female=o.genere==='donna'||o.genere==='f'||(o.genere!=='uomo'&&o.genere!=='m'&&role==='segretaria');
 const skin=SKIN[pick(s,1,SKIN.length)],eye=EYE[pick(s,2,EYE.length)];
 const gray=clamp((age-32)/38,0,1)*(.58+pick(s,3,36)/100),hair=blend(HAIR[pick(s,4,HAIR.length)],'#d4d2c9',gray),shine=blend(hair,'#eee5cf',.25);
 const id='e13'+s.toString(36)+'_'+Math.round(age)+'_'+pick(s,40,1000)+'_'+role.slice(0,2);
 const expr=EXPRESS.includes(o.espressione)?o.espressione:EXPRESS[pick(s,5,4)];
 const face=SHAPES[pick(s,6,SHAPES.length)],hairType=pick(s,7,9),browType=pick(s,8,5),noseType=pick(s,9,5),earType=pick(s,10,3),lips=pick(s,11,3),beardType=female?0:pick(s,12,7);
 const mustache=female?false:(beardType===1||beardType===2||beardType===4||beardType===6),fullBeard=!female&&(beardType===4||beardType===5||beardType===6),goatee=!female&&beardType===3;
 const glasses=(role==='staff'||role==='presidente')&&pick(s,13,3)===0;
 const aging=clamp((age-29)/46,0,1),recede=(female?.06:.12+pick(s,14,42)/100)*clamp((age-24)/51,0,1);
 const fade=clamp((age-48)/25,0,1),bald=!female&&pick(s,15,10)<4&&age>42;
 const main=skin[0],shade=skin[1],deep=skin[2],shadow=blend(deep,'#201c17',.17),noseX=pick(s,16,9)-4;
 const mouth=expr==='concentrata'?`<path d="M76 126Q91 124 107 126" fill="none" stroke="${deep}" stroke-width="2.8" stroke-linecap="round"/>`:expr==='neutra'?`<path d="M76 126Q91 ${128+lips} 106 125" fill="none" stroke="${deep}" stroke-width="2.6" stroke-linecap="round"/>`:expr==='sorriso'?`<path d="M74 124Q91 143 108 123Q91 138 74 124Z" fill="${blend(main,'#b26b66',.54)}" stroke="${deep}" stroke-width="1.9"/>`:`<path d="M76 123Q92 150 108 123Q105 147 91 148Q80 146 76 123Z" fill="#6d3433" stroke="${deep}" stroke-width="1.6"/><path d="M80 126Q91 130 104 126L101 133Q91 135 83 132Z" fill="#fff6ed"/>`;
 const brows=[`M66 77Q75 70 86 76 M99 76Q110 70 120 77`,`M64 78L86 74M99 75L120 79`,`M66 75Q76 66 86 74M100 74Q110 68 120 76`,`M65 76Q74 74 86 78M99 78Q112 72 120 76`,`M65 78Q75 73 86 75M99 75Q111 72 122 78`][browType];
 const noses=[`M89 95L85 112Q90 116 98 112`,`M90 95L91 109Q82 117 97 115`,`M88 95L84 114Q91 120 99 113`,`M91 95L88 114Q95 118 99 112`,`M88 96L86 114Q89 117 97 114`][noseType];
 const forehead=45+recede*24;
 const hairPaths=[`M48 82Q40 40 67 31Q85 13 108 27Q140 31 133 79L120 59Q99 41 75 56L55 85Z`,`M49 80Q43 38 72 29Q118 8 134 66L130 82L119 54Q87 48 55 82Z`,`M51 82Q43 38 68 32Q107 16 126 43L133 82L119 63Q91 39 60 79Z`,`M48 80Q42 46 61 34Q82 21 104 28Q137 25 133 83L123 58Q93 54 51 83Z`,`M48 86Q41 39 76 25Q111 16 130 43L134 83L122 59Q92 38 52 83Z`,`M54 83Q50 41 72 34Q93 28 119 38Q130 49 129 83L122 63Q93 57 59 81Z`,`M50 79Q45 43 70 33Q94 30 118 40Q133 54 131 81L119 64Q87 50 53 84Z`,`M49 81Q45 42 68 35Q88 21 113 34Q140 39 134 86L122 60Q98 53 54 82Z`,`M52 83Q46 41 70 34Q98 24 125 40L132 81L123 69Q92 54 56 85Z`];
 const cropped=`M${54+recede*8} ${78}Q50 ${forehead+8} 85 ${forehead-3}Q115 ${forehead-6} ${126-recede*7} 80L123 67Q94 ${forehead+8} 58 84Z`;
 const hairPath=bald&&fade>.3?cropped:hairPaths[hairType];
 const sideHair=female?`<path d="M55 47Q36 53 40 106L32 151Q30 174 22 181L51 169Q58 133 56 94M126 49Q143 65 139 110L147 153Q151 175 159 181L130 168Q125 127 125 93" fill="${hair}" stroke="${shine}" stroke-width="2"/>`:'';
 const hairStrokes=`<path d="M60 55Q77 35 101 38M67 48Q97 30 122 51M75 50Q94 40 116 51" fill="none" stroke="${shine}" stroke-width="2" stroke-linecap="round" opacity=".38"/>`;
 const beard=fullBeard?`<path d="M55 116Q56 144 75 151L91 162Q110 154 125 137L129 115Q122 128 115 134Q91 146 68 130Z" fill="${hair}" opacity=".85"/><path d="M73 139Q89 146 107 138" fill="none" stroke="${shine}" stroke-width="1.7" opacity=".45"/>`:goatee?`<path d="M80 137Q91 147 102 138L97 153Q91 158 84 153Z" fill="${hair}" opacity=".88"/>`:beardType===2?`<path d="M60 126Q91 155 120 126L111 143Q92 153 74 143Z" fill="${hair}" opacity=".5"/>`:'';
 const whiskers=mustache?`<path d="M74 122Q83 116 91 122Q99 115 110 122Q102 126 94 124L91 125Q82 126 74 122Z" fill="${hair}" opacity=".9"/>`:'';
 const specs=glasses?`<g fill="var(--ev-surface)" fill-opacity=".08" stroke="${hair}" stroke-width="2.7"><rect x="60" y="81" width="31" height="24" rx="9"/><rect x="94" y="81" width="30" height="24" rx="9"/><path d="M91 88Q93 85 95 88M60 90L50 87M124 90L133 87" fill="none"/></g>`:'';
 const crease=aging>0?`<g fill="none" stroke="${deep}" stroke-width="1.4" opacity="${(.12+aging*.55).toFixed(2)}"><path d="M64 69Q90 65 116 69M71 75Q91 72 110 75M62 109L71 116M112 117L122 106M68 133Q72 141 78 141M104 141Q111 138 115 133"/></g>`:'';
 const p=o.colori||{},primary=color(p.primario||p.casa||p[0],'#07533a'),secondary=color(p.secondario||p[1],'#e6c37a');
 let clothing='';
 const isPlayer=role==='giocatore'||['p','d','c','a','portiere','difensore','centrocampista','attaccante'].includes(role);
 if(isPlayer){
   const jerseyOpt={colori:{primario:primary,secondario:secondary,dettaglio:secondary},motivo:String(o.motivo||'unita')};
   if(root&&typeof root.magliaSVG==='function')clothing=`<svg x="-1" y="139" width="182" height="177" viewBox="0 0 180 180">${root.magliaSVG(jerseyOpt)}</svg>`;
   else clothing=`<path d="M0 206Q3 165 49 158L70 151H112L133 157Q177 165 180 206Z" fill="${primary}"/><path d="M50 158L91 180L128 158M18 199L37 170M165 199L144 170" fill="none" stroke="${secondary}" stroke-width="4"/>`;
 } else {
   clothing=`<path d="M0 206Q4 159 58 157L75 151H107L124 157Q177 160 180 206Z" fill="${primary}"/><path d="M54 159L91 193L126 159L114 206H67Z" fill="var(--ev-surface)"/><path d="M64 156L90 184L73 206L41 165M116 156L92 184L109 206L140 165" fill="${primary}" stroke="${secondary}" stroke-width="2.6"/>`;
   if(role==='segretaria')clothing+=`<path d="M72 180L90 198L107 180" fill="none" stroke="${secondary}" stroke-width="2.5"/><path d="M125 175l5 7-5 7-5-7Z" fill="${secondary}"/>`;
 }
 const ears=`<ellipse cx="51" cy="103" rx="${earType===0?7:9}" ry="14" fill="${main}" stroke="${deep}" stroke-width="1.2"/><ellipse cx="129" cy="103" rx="${earType===1?7:9}" ry="14" fill="${main}" stroke="${deep}" stroke-width="1.2"/><path d="M49 102Q54 95 54 107M126 107Q130 96 133 101" fill="none" stroke="${deep}" stroke-width="1.3"/>`;
 // Invecchiamento: barba/capelli ed espressione non cambiano seme/identità.
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 206" role="img" aria-label="Ritratto SVG originale, ${esc(role)}, età ${age}, espressione ${expr}" data-seme="${s}" data-espressione="${expr}"><defs><linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${main}"/><stop offset=".64" stop-color="${shade}"/><stop offset="1" stop-color="${main}"/></linearGradient><linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="1"><stop stop-color="var(--ev-surface-subtle)"/><stop offset="1" stop-color="var(--ev-surface)"/></linearGradient></defs><rect width="180" height="206" rx="11" fill="url(#${id}l)"/><circle cx="91" cy="96" r="81" fill="var(--ev-brand-gold)" opacity=".05"/>${clothing}<path d="M77 135H104V162Q91 176 77 162Z" fill="${shade}"/><path d="M81 151Q91 159 101 150" fill="none" stroke="${deep}" stroke-width="1" opacity=".4"/>${sideHair}${ears}<path d="${face}" fill="url(#${id}s)" stroke="${deep}" stroke-width="1.1"/><path d="M58 103Q54 124 74 139M124 102Q127 125 107 140" fill="none" stroke="${main}" stroke-width="5" opacity=".65"/><path d="M64 115Q70 122 77 125M111 125Q116 122 122 116" fill="none" stroke="${deep}" stroke-width="1" opacity=".22"/>${crease}<path d="${brows}" fill="none" stroke="${hair}" stroke-width="${browType===1?3.6:4.8}" stroke-linecap="round"/><path d="M64 87Q75 ${expr==='concentrata'?86:81} 86 87M98 87Q111 ${expr==='concentrata'?86:81} 121 87" fill="none" stroke="${deep}" stroke-width="2"/><ellipse cx="75" cy="89" rx="5.1" ry="5.4" fill="${eye}"/><ellipse cx="109" cy="89" rx="5.1" ry="5.4" fill="${eye}"/><circle cx="76" cy="87" r="1.65" fill="var(--ev-surface)"/><circle cx="110" cy="87" r="1.65" fill="var(--ev-surface)"/><path d="${noses}" fill="none" stroke="${deep}" stroke-width="2.1" stroke-linecap="round"/><path d="M84 115Q88 118 92 117M96 116Q99 117 102 114" fill="none" stroke="${deep}" stroke-width="1" opacity=".45"/>${mouth}${beard}${whiskers}<path d="${hairPath}" fill="${hair}" stroke="${shine}" stroke-width="2"/>${hairStrokes}<path d="M55 63Q51 48 65 37" fill="none" stroke="${shine}" stroke-width="3" opacity=".24"/>${specs}</svg>`;
 return svg;
}
if(typeof module!=='undefined'&&module.exports)module.exports={faceSVG};if(root)root.faceSVG=faceSVG;
})(typeof window!=='undefined'?window:undefined);
