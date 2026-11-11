/* Dati della pagina del programma (programma.html). Si aggiornano SOLO qui: barre, elenchi e conteggi della pagina si calcolano da questo file.
   Ogni tappa: titolo (comprensibile, senza sigle interne), spiegazione (una riga), area, peso (piccolo 1, medio 2, grande 3),
   fase (1, 2, 3 = prima della 1.0; 'dopo' = dopo la 1.0), stato ('fatto' | 'in corso' | 'da fare'), data (AAAA-MM-GG) e versione se fatta.
   Senza `peso` la tappa si vede ma non conta nelle barre (le promozioni in beta non sono tappe). Nessuna data prevista.
   Barra di un'area = pesi delle tappe fatte / pesi di tutte le tappe dell'area. Segno 1.0 = pesi delle tappe di fase 1, 2 e 3 / pesi di tutte.
   Il collegamento tra le tappe e i blocchi del programma di lavoro è in docs/PROGRESSI_V0c.md, non qui. */
const PROGRAMMA = {
  aree: [
    { id: 'motore',   nome: 'Motore della partita',       descrizione: 'Le azioni sul campo, i movimenti e le regole della partita.' },
    { id: 'grafica',  nome: 'Grafica e visore',           descrizione: 'Il modo in cui vedi le partite e le schermate.' },
    { id: 'gestione', nome: 'Gestione del club',          descrizione: 'Le decisioni con cui guidi la tua società.' },
    { id: 'multi',    nome: 'Multigiocatore e comunità',  descrizione: 'Un mondo condiviso con altri presidenti.' },
    { id: 'gioco',    nome: 'Giocabilità',                descrizione: 'La semplicità e il piacere di usare EVIVORA.' }
  ],
  fasi: [
    { n: 1, titolo: 'Rendere la partita completa', sottotitolo: 'Le azioni sul campo e gli strumenti essenziali per seguirle.' },
    { n: 2, titolo: 'Preparare il gioco condiviso', sottotitolo: 'Le basi per passare da un club a tanti club che convivono.' },
    { n: 3, titolo: 'Costruire i campionati condivisi', sottotitolo: 'I presidenti si incontrano in un mondo calcistico comune.' }
  ],
  tappe: [
    /* ---- già fatto ---- */
    { titolo: 'Mercato, richieste e società', spiegazione: 'Comprare e vendere giocatori, rinnovi e richieste di giocatori e allenatore.', area: 'gestione', peso: 3, fase: 1, stato: 'fatto', data: '2026-10-29', versione: '0.037' },
    { titolo: 'Finanze, banca e bilancio', spiegazione: 'Preventivo, conti della giornata, finanziamenti e licenziamento.', area: 'gestione', peso: 3, fase: 1, stato: 'fatto', data: '2026-10-29', versione: '0.037' },
    { titolo: 'Un gioco che si salva e si ritrova', spiegazione: 'Interfaccia a schede e salvataggio della partita sul tuo dispositivo.', area: 'gioco', peso: 3, fase: 1, stato: 'fatto', data: '2026-10-29', versione: '0.037' },
    { titolo: 'La beta con il tuo account', spiegazione: 'Registrazione, accesso e copia della partita online per i tester.', area: 'multi', peso: 2, fase: 1, stato: 'fatto', data: '2026-10-29', versione: '0.037' },
    { titolo: 'Statistiche, albo d’oro e premi', spiegazione: 'Le carriere di giocatori e presidenti, l’albo d’oro e i premi di fine stagione.', area: 'gestione', peso: 2, fase: 1, stato: 'fatto', data: '2026-10-29', versione: '0.4.1.0' },
    { titolo: 'Una visuale della partita più chiara', spiegazione: 'Velocità ricordata, tasto «Avanti», tuffo del portiere e arbitro rivolto ai giocatori.', area: 'grafica', peso: 1, fase: 1, stato: 'fatto', data: '2026-10-29', versione: '0.4.1.1' },
    { titolo: 'Il gioco si chiama EVIVORA', spiegazione: 'Il progetto ha ricevuto il suo nome.', fase: 1, stato: 'fatto', data: '2026-10-29', versione: '0.4.1.2' },
    { titolo: 'Misurare la partita', spiegazione: 'Strumenti per controllare ogni partita e correzione del cambio perso dopo un infortunio.', area: 'motore', peso: 1, fase: 1, stato: 'fatto', data: '2026-10-30', versione: '0.4.1.3' },
    { titolo: 'La palla e i giocatori si muovono davvero', spiegazione: 'Fisica della palla e dei corpi, gol e fuori decisi dalla geometria, tiri e parate.', area: 'motore', peso: 3, fase: 1, stato: 'fatto', data: '2026-10-30', versione: '0.4.2.0' },
    { titolo: 'Pagine facili da raggiungere', spiegazione: 'Ogni schermata ha il suo indirizzo: «Indietro», preferiti e link funzionano.', area: 'gioco', peso: 1, fase: 1, stato: 'fatto', data: '2026-11-04', versione: '0.4.2.1' },
    { titolo: 'Una prova per il gioco condiviso', spiegazione: 'Una prova tecnica ha confermato che il gioco condiviso è possibile.', area: 'multi', peso: 1, fase: 1, stato: 'fatto', data: '2026-11-04' },
    { titolo: 'Una partita più ordinata', spiegazione: 'La simulazione è stata divisa in parti più chiare, con partite identiche a prima.', area: 'motore', peso: 2, fase: 1, stato: 'fatto', data: '2026-11-04', versione: '0.4.2.2' },
    { titolo: 'Il visore segue i nuovi movimenti', spiegazione: 'Visione 2D e 3D adattate alla fisica, con le vignette del mister.', area: 'grafica', peso: 1, fase: 1, stato: 'fatto', data: '2026-11-05', versione: '0.4.2.3' },
    { titolo: 'Uno stile comune', spiegazione: 'Colori, caratteri, menu in alto e tema chiaro o scuro uguali in tutto il gioco.', area: 'grafica', peso: 2, fase: 1, stato: 'fatto', data: '2026-11-05', versione: '0.4.2.4' },
    { titolo: 'Schermate rinnovate', spiegazione: 'Rosa, ricerca giocatori, classifica, conti, mercato e lega nel nuovo stile.', area: 'grafica', peso: 2, fase: 1, stato: 'fatto', data: '2026-11-05', versione: '0.4.2.5' },
    { titolo: 'Testi pronti per più lingue', spiegazione: 'Tutti i testi sono raccolti in un elenco e pronti per le traduzioni; menu più sottile.', area: 'gioco', peso: 1, fase: 1, stato: 'fatto', data: '2026-11-06', versione: '0.4.2.6' },
    { titolo: 'Movimenti più precisi', spiegazione: 'Rete vera dopo il gol, niente parate dietro il portiere, vittorie in casa più realistiche.', area: 'motore', peso: 2, fase: 1, stato: 'fatto', data: '2026-11-06', versione: '0.4.2.7' },
    { titolo: 'Calciatori con 57 caratteristiche', spiegazione: 'Ogni giocatore ha un profilo ricco di caratteristiche, fisiche e di gioco.', area: 'motore', peso: 3, fase: 1, stato: 'fatto', data: '2026-11-06', versione: '0.4.3.0' },
    { titolo: 'Visore e Ufficio più ordinati', spiegazione: 'Pagelle e intervista partono da sole, «Apri la richiesta» porta alla richiesta.', area: 'grafica', peso: 1, fase: 1, stato: 'fatto', data: '2026-11-06', versione: '0.4.3.1' },
    { titolo: 'Anche gli allenatori hanno un profilo', spiegazione: 'Ogni allenatore è descritto da 10 caratteristiche che pesano sulla squadra.', area: 'motore', peso: 2, fase: 1, stato: 'fatto', data: '2026-11-07', versione: '0.4.4.0' },
    { titolo: 'La tattica della squadra', spiegazione: 'Forma del modulo, pressing e cambi dalla panchina decisi dall’allenatore.', area: 'motore', peso: 3, fase: 1, stato: 'fatto', data: '2026-11-07', versione: '0.4.5.0' },
    { titolo: 'Partite senza anticipazioni', spiegazione: 'Il risultato resta nascosto fino alla visione; il 3D è disponibile solo su computer.', area: 'gioco', peso: 1, fase: 1, stato: 'fatto', data: '2026-11-08', versione: '0.4.5.2' },
    /* ---- fase 1: completare la partita ---- */
    { titolo: 'Trattative dal telefono e pagina del programma', spiegazione: 'Portare le trattative anche sul telefono e mostrare questo percorso ai tester.', area: 'gioco', peso: 1, fase: 1, stato: 'fatto', data: '2026-11-10', versione: '0.4.5.3' },
    { titolo: 'I calciatori scelgono le loro azioni', spiegazione: 'Passaggi, dribbling, tiri, calci piazzati e rigori diventano scelte dei giocatori in campo.', area: 'motore', peso: 3, fase: 1, stato: 'fatto', data: '2026-11-11', versione: '0.4.6.0' },
    { titolo: 'Arbitro e assistenti in campo', spiegazione: 'Posizione dell’arbitro, fuorigioco, vantaggio, falli e cartellini come nel calcio vero.', area: 'motore', peso: 2, fase: 1, stato: 'da fare' },
    { titolo: 'Infortuni e fine carriera', spiegazione: 'Gli infortuni dei calciatori e la conclusione della loro carriera, con tempi realistici.', area: 'motore', peso: 2, fase: 1, stato: 'da fare' },
    { titolo: 'Controllare ogni parte della partita', spiegazione: 'Verificare che azioni, regole e risultato funzionino insieme.', area: 'motore', peso: 2, fase: 1, stato: 'da fare' },
    /* ---- fase 2: preparare il gioco condiviso ---- */
    { titolo: 'Un’economia equilibrata per i club', spiegazione: 'Rendere coerenti entrate e uscite dei club su molte stagioni.', area: 'gestione', peso: 2, fase: 2, stato: 'da fare' },
    { titolo: 'Un’esperienza più solida', spiegazione: 'Riordinare ciò che serve e ridurre i problemi durante il gioco.', area: 'motore', peso: 2, fase: 2, stato: 'da fare' },
    { titolo: 'Pronti per giocare in tanti', spiegazione: 'Misurare come regge il gioco quando tanti presidenti giocano insieme.', area: 'multi', peso: 1, fase: 2, stato: 'da fare' },
    /* ---- fase 3: i campionati condivisi ---- */
    { titolo: 'Presidenti nello stesso mondo', spiegazione: 'Persone diverse guidano i loro club nello stesso ambiente.', area: 'multi', peso: 3, fase: 3, stato: 'da fare' },
    { titolo: 'Un campionato condiviso', spiegazione: 'Incontri e classifiche comuni tra i presidenti.', area: 'multi', peso: 3, fase: 3, stato: 'da fare' },
    { titolo: 'Gli strumenti della lega', spiegazione: 'Le funzioni per organizzare, seguire e far rispettare le regole del campionato.', area: 'multi', peso: 2, fase: 3, stato: 'da fare' },
    { titolo: 'Promozioni e retrocessioni', spiegazione: 'Collegare le prime due serie: si sale o si scende in base ai risultati.', area: 'multi', peso: 3, fase: 3, stato: 'da fare' },
    { titolo: 'Un ambiente rispettoso di chi gioca', spiegazione: 'Le regole e le tutele fondamentali per partecipare insieme con fiducia.', area: 'multi', peso: 1, fase: 3, stato: 'da fare' },
    /* ---- dopo la 1.0 ---- */
    { titolo: 'Ingresso in campo e suoni della partita', spiegazione: 'Giocatori che entrano in fila, fischio e rumore del pubblico.', area: 'grafica', peso: 2, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Giocatori 3D con movimenti veri', spiegazione: 'Corpi e animazioni più naturali nel visore tridimensionale.', area: 'grafica', peso: 3, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Lo stadio e la telecamera', spiegazione: 'Uno stadio che cresce con il club e una ripresa come in televisione.', area: 'grafica', peso: 2, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Volti, stemmi e maglie', spiegazione: 'Volti, stemmi e maglie diversi per ogni persona e per ogni club.', area: 'grafica', peso: 2, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Logo e suoni del gioco', spiegazione: 'Un logo definitivo e i suoni dei tasti e delle schermate.', area: 'grafica', peso: 3, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Giocatori 3D più curati', spiegazione: 'Più dettagli nei giocatori tridimensionali.', area: 'grafica', peso: 2, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Una grafica ancora più ricca', spiegazione: 'Una revisione finale dell’aspetto di tutto il gioco.', area: 'grafica', peso: 2, fase: 'dopo', stato: 'da fare' },
    { titolo: 'La vita delle persone', spiegazione: 'Carriere, ritiri e storie di giocatori, allenatori e presidenti.', area: 'gestione', peso: 3, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Il settore giovanile', spiegazione: 'Una scuola calcio per far crescere i giovani del club.', area: 'gestione', peso: 3, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Gli allenamenti', spiegazione: 'Sedute di allenamento e preparatore atletico per far crescere i giocatori.', area: 'gestione', peso: 2, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Lo staff del club', spiegazione: 'Osservatori, direttore sportivo, medico e altri collaboratori da assumere.', area: 'gestione', peso: 2, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Le strutture del club', spiegazione: 'Stadio e centro sportivo da costruire e migliorare nel tempo.', area: 'gestione', peso: 2, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Tifosi, stampa e sponsor', spiegazione: 'Biglietti, umore dei tifosi, sponsor da negoziare e giornali che parlano di te.', area: 'gestione', peso: 3, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Il giornale della lega', spiegazione: 'Articoli sulle partite e sugli eventi del campionato condiviso.', area: 'gestione', peso: 2, fase: 'dopo', stato: 'da fare' },
    { titolo: 'I soldi del presidente', spiegazione: 'Il patrimonio personale del presidente e le sue scelte con il club.', area: 'gestione', peso: 2, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Tornei di beneficenza', spiegazione: 'Partite e tornei per una buona causa.', area: 'gestione', peso: 2, fase: 'dopo', stato: 'da fare' },
    { titolo: 'La Banca Centrale', spiegazione: 'Moneta, inflazione e borsa: l’economia del gioco vista da vicino.', area: 'gestione', peso: 3, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Categorie di giocatori e staff', spiegazione: 'Un voto unico e categorie per confrontare giocatori e collaboratori.', area: 'gestione', peso: 2, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Presidente e allenatore', spiegazione: 'Obiettivi e richieste a inizio stagione, con responsabilità chiare se le cose vanno male.', area: 'gestione', peso: 3, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Un’economia ancora più equilibrata', spiegazione: 'Rivedere i conti dei club dopo tutte le novità economiche.', area: 'gestione', peso: 2, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Una comunità che dialoga', spiegazione: 'Chat della lega, messaggi privati e forum con regole chiare.', area: 'multi', peso: 2, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Coppe e Supercoppa', spiegazione: 'Nuove competizioni oltre al campionato.', area: 'multi', peso: 3, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Serie C e campionati minori', spiegazione: 'Altre serie sotto la B per un mondo calcistico più grande.', area: 'multi', peso: 3, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Un modo per sostenere EVIVORA', spiegazione: 'Contribuire volontariamente al progetto, senza vantaggi nel gioco.', area: 'multi', peso: 1, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Domande e risposte', spiegazione: 'Le risposte alle domande più frequenti, a portata di mano.', area: 'gioco', peso: 1, fase: 'dopo', stato: 'da fare' },
    { titolo: 'Imparare a giocare più facilmente', spiegazione: 'Guide iniziali, notifiche e installazione del gioco sul dispositivo.', area: 'gioco', peso: 2, fase: 'dopo', stato: 'da fare' }
  ]
};
/* Calcolo delle barre: lo usano la pagina e le prove. Restituisce, per area, pesi fatti / totali, percentuale e segno 1.0 (interi). */
function programmaBarre(P){
  const pc=(a,b)=>b?Math.round(100*a/b):0;
  return P.aree.map(ar=>{
    let fatto=0, tot=0, prima=0;
    P.tappe.forEach(t=>{ if(t.area!==ar.id||!t.peso) return; tot+=t.peso; if(t.stato==='fatto') fatto+=t.peso; if(t.fase!=='dopo') prima+=t.peso; });
    return { id:ar.id, nome:ar.nome, fatto, tot, prima, pct:pc(fatto,tot), segno:pc(prima,tot) };
  });
}
if(typeof module!=='undefined') module.exports={ PROGRAMMA, programmaBarre };
