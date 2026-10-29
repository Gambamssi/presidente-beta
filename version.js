/* versione del gioco e novità mostrate nella schermata iniziale: a ogni nuova versione si cambia solo questo file (più quelli toccati) */
const VERSION = '0.4.1.0';
/* numerazione (dalla 0.4.1.0): 0.GRANDE.MEDIO.PICCOLO, tre contatori indipendenti senza riporto. La vecchia 0.037 corrisponde a 0.4.0.0.
   Le versioni sono testi: mai confrontarle come numeri (parseFloat, <, >). Per confrontarle si usa verCmp(a,b): −1, 0 o 1.
   Il vecchio formato 0.NNN (tre cifre dopo il punto, fino alla 0.037) viene prima di tutte le versioni nuove: 0.036 < 0.037 < 0.4.0.0 < 0.4.1.0. */
function verParts(v){ const a=String(v==null?'':v).trim().replace(/^v/i,'').split('.');
  if(a.length===2 && /^\d{3}$/.test(a[1])) return [+a[0]||0, 3, +a[1], 0];
  return [0,1,2,3].map(i=>parseInt(a[i],10)||0); }
function verCmp(a,b){ const x=verParts(a), y=verParts(b); for(let i=0;i<4;i++) if(x[i]!==y[i]) return x[i]<y[i]?-1:1; return 0; }
const CHANGELOG = [
  ['0.4.1.0','29 ottobre 2026',[
    'Statistiche di stagione e di carriera: in Squadra › Rosa e nella scheda di ogni giocatore trovi presenze, gol e media voto della stagione in corso e di tutta la carriera; nella scheda c\'è anche la tabella delle stagioni passate. Lega › Marcatori mostra solo i gol della stagione in corso.',
    'Nuova sotto-scheda Lega › Albo d\'oro: per ogni stagione chiusa campione, seconda, terza, capocannoniere e miglior giovane (21 anni o meno, almeno metà delle partite giocate, media voto più alta). Nel profilo di ogni club titoli e piazzamenti arrivano dall\'albo.',
    'Carriera del presidente: nel profilo del club compare chi lo guida, con le stagioni, i club guidati, gli scudetti e gli eventuali licenziamenti. Se cambi società la carriera viene con te.',
    'I premi di fine stagione contano: la campione guadagna popolarità +8 e sponsor +10% per tutta la stagione dopo, la seconda +4 e +5%, la terza +2 e +3%, il club del capocannoniere popolarità +2. Valgono per tutti i club, e il preventivo della stagione nuova ne tiene già conto. Alla Scrivania trovi il riquadro «Premi della stagione».',
    'Menu ⋯: «Esporta la partita» scarica un file con tutta la partita; «Importa una partita» la ricarica (anche su un altro computer), dopo averti mostrato club, stagione e giornata e chiesto conferma.',
    'Partite già in corso: presenze e gol contati finora diventano quelli della carriera. Se sei alla prima stagione valgono anche per la stagione; dalla seconda in poi le statistiche della stagione ripartono da zero e lo storico delle stagioni comincia dalla prossima chiusura. L\'albo d\'oro delle stagioni già giocate ha i piazzamenti ma non capocannoniere e miglior giovane. Da questa versione i numeri delle versioni hanno quattro parti: la 0.037 era la 0.4.0.0.'
  ]],
  ['0.037','29 ottobre 2026',[
    'Sugli schermi larghi la barra in alto, le aree e le sotto-schede stanno nella stessa colonna dei riquadri: il marchio e «Scrivania» partono dal bordo dei riquadri e il menu ⋯ finisce sul loro bordo destro. Sul telefono non cambia nulla.',
    'Arriva la beta chiusa online: con un account (email, password e soprannome) la partita si salva anche online e la ritrovi su ogni dispositivo. Nel menu ⋯ della beta puoi segnalare un problema, rileggere l\'avviso del progetto e l\'informativa privacy, uscire o cancellare l\'account.',
    'In questa versione di lavoro gli account non compaiono: la partita resta salvata solo nel browser, come prima. Le regole del gioco non cambiano e i salvataggi restano quelli di prima.'
  ]],
  ['0.036','28 ottobre 2026',[
    'Lega › Notizie: in cima c\'è un riquadro con gli aggiornamenti del gioco. Mostra le novità dell\'ultima versione; aprendo «Versioni precedenti» si leggono anche quelle delle tre versioni prima.',
    'Le novità restano anche nel menu ⋯. Le regole del gioco non cambiano e i salvataggi restano quelli di prima.'
  ]],
  ['0.035','28 ottobre 2026',[
    'Schermate riorganizzate in cinque aree: Scrivania, Lega, Squadra, Mercato e Società. Ogni area ha le sue sotto-schede sotto la barra in alto. Sul telefono le aree sono in una barra in basso, sempre a portata di pollice.',
    'Scrivania: è la pagina iniziale. In cima c\'è la tua segretaria (il nome lo scegli all\'inizio della partita e lo cambi dal menu ⋯): ti dice cosa blocca la giornata, cosa è urgente e cosa c\'è da fare, con un tasto che ti porta dove si agisce. Sotto trovi richieste, impegni e notizie del club.',
    'Se premi «Gioca» con qualcosa di urgente ancora aperto, la segretaria ti avvisa una volta per giornata: puoi giocare lo stesso o tornare alla Scrivania.',
    'Lega: la pagina comune a tutti i club, con notizie pubbliche (trasferimenti, allenatori, penalizzazioni, presidenti, scudetto), la giornata con risultati, partite da guardare e prossimo turno, classifica, marcatori e arbitri.',
    'Profilo dei club: tocca il nome di una squadra ovunque compaia per vedere allenatore, rosa (con le valutazioni che conosci dal tuo osservatore), strutture, calendario, quote della banca, preventivo e stagioni passate. Il tuo nome in alto mostra come le altre società vedono il tuo club.',
    'Mercato: nuova sotto-scheda «Trattative in corso» con gli acquisti aperti e le offerte ricevute per i tuoi giocatori. Società: Conti, Bilancio, Banca e Strutture, ogni cosa in un posto solo. Novità della versione e «Ricomincia da capo» sono nel menu ⋯.',
    'Le regole del gioco non cambiano e i salvataggi restano quelli di prima.'
  ]],
  ['0.034','28 ottobre 2026',[
    'Nessun cambiamento nel gioco: la pagina ora carica il codice da più file separati (motore, finanze, partita, schermate, visore). Così i prossimi aggiornamenti si preparano e si pubblicano più in fretta, cambiando solo i pezzi toccati.',
    'I salvataggi restano quelli di prima.'
  ]],
  ['0.033','28 ottobre 2026',[
    'Preventivo: nuovo tasto «Compila in automatico». Riempie il preventivo con cifre ragionevoli ricavate dalle stagioni passate (fino a tre): acquisti come la media spesa, cessioni all\'80% di quanto incassato (le vendite non sono mai sicure), lavori come in passato, obiettivo tra i piazzamenti passati e la forza attuale della rosa. Nella revisione di metà stagione tiene conto anche di quanto hai già speso e incassato.',
    'Se le cifre non quadrano, le corregge da solo: prima riduce lavori e acquisti, e solo se non basta prevede un finanziamento entro i limiti della banca. Rispetta anche il veto e la maggioranza della banca.',
    'Sotto il tasto compare la spiegazione di come è stata calcolata ogni cifra. Le cifre restano modificabili prima della convalida. Il tasto sostituisce la vecchia «Proposta del direttore finanziario».'
  ]],
  ['0.032','28 ottobre 2026',[
    'Pulizia del codice: tolte le funzioni non più usate (la vecchia offerta d\'acquisto diretta, la vecchia cessione immediata, il vecchio prestito all\'8%). Il gioco funziona esattamente come prima.'
  ]],
  ['0.031','28 ottobre 2026',[
    'Nuova scheda «Società»: valore della società (strutture + cartellini + cassa − debiti), azionisti, reputazione del presidente, strutture e banca.',
    'Nuova struttura, il settore giovanile: ampliandolo i ragazzi che arrivano a fine stagione sono più forti e più spesso tre. Ogni ampliamento aumenta il valore della società di circa il 90% della spesa.',
    'La banca sostituisce il vecchio prestito. Scegli importo, durata (1, 2 o 3 stagioni) e garanzia, poi tratti il tasso: la banca parte alta e scende fino a un minimo segreto, che dipende dal suo giudizio sui tuoi conti (debito rispetto al valore, stipendi, arretrati, bilanci passati, reputazione). Ha la sua pazienza, come nelle altre trattative.',
    'Garanzie: senza pegno la banca presta quanto le entrate permettono di rimborsare; con il pegno sulle strutture o sui cartellini presta di più e a un tasso più basso. Le strutture in pegno non si ampliano senza il suo ok; i giocatori in pegno si vendono solo a un prezzo vicino al valore e il ricavato rimborsa il finanziamento. Tetto: i debiti non superano il 65% del valore della società. Puoi estinguere un finanziamento in anticipo.',
    'Rate non pagate: le rate si pagano dopo gli stipendi; quello che manca diventa insoluto, con la mora. Alla terza giornata di fila la banca converte il debito in quote della società, in proporzione al valore. La seconda volta dichiara decaduti tutti i finanziamenti: vende i giocatori in pegno all\'80% del valore e converte il resto.',
    'Quote della banca: al 25% ha il diritto di veto sul preventivo e blocca acquisti e lavori fuori budget; al 51% approva solo preventivi che riducono il debito e può licenziarti, prima con un ultimatum (rate pagate, stipendi in regola, conti in linea). Quando i conti tornano in ordine puoi ricomprare le quote.',
    'Nuova scheda «Bilancio»: prima della prima giornata convalidi il preventivo della stagione (budget acquisti, cessioni previste, investimenti, finanziamenti, obiettivo in classifica). Dopo la 7ª giornata arriva la revisione, con la possibilità di aggiornarlo una volta; a fine stagione il consuntivo deve restare entro il 12% del saldo previsto. Fuori tolleranza calano reputazione e giudizio della banca.',
    'Licenziamento: scegli la nuova società fra alcune offerte. Quante e quali dipende dalla tua reputazione; porti con te osservatore e taccuino.',
    'Le squadre del computer seguono le stesse regole: chiedono finanziamenti, ampliano le strutture, fanno il preventivo, possono finire in mano alla banca e cambiare presidente.'
  ]],
  ['0.030','28 ottobre 2026',[
    'Calciomercato in entrata: dalla scheda di un giocatore si apre la trattativa di acquisto, in due fasi.',
    'Fase 1, il club che vende: offri una cifra, il club chiede e scende fino a un minimo che non conosci. Costa di più se è tra i migliori della sua squadra o se il club è in alto; costa meno se il club ha problemi con i conti, se il contratto è in scadenza, se il giocatore ha chiesto la cessione o è scontento. Il club ha la sua pazienza.',
    'Fase 2, il giocatore: trattate lo stipendio (contratto di 3 anni), con la possibilità di una somma alla firma. Viene più volentieri, e chiede meno, se è scontento dove sta, se la nostra squadra è più in alto della sua e se il clima della nostra società è buono. Può anche non essere interessato. Il cartellino si paga solo se anche il giocatore firma.',
    'Svincolati: solo la trattativa con il giocatore. Puoi rinunciare in qualsiasi momento senza conseguenze; una trattativa lasciata a metà si chiude con la giornata.'
  ]],
  ['0.029','28 ottobre 2026',[
    'Calciomercato in uscita: le offerte degli altri club per i tuoi giocatori si possono trattare. Chiedi una cifra più alta, il club rilancia fino a un massimo che non conosci (dipende da quanto gli serve il giocatore, dalla sua cassa e dalla forma del giocatore); il club ha la sua pazienza, e quando finisce devi decidere.',
    'Offerte dall\'estero: le stelle delle squadre in vetta ricevono offerte anche da club stranieri (inglesi, spagnoli, tedeschi…), che pagano di più e attirano anche chi sta bene da noi. È il modo in cui le squadre vincenti perdono i loro campioni, come nella realtà.',
    'Decide il giocatore: se i club trovano l\'accordo, è lui a scegliere se partire, e tu non lo sai prima. Chi è scontento o ambizioso (soprattutto verso un club più in alto in classifica) parte volentieri; chi sta bene da noi può rifiutare. Il suo morale, mostrato nella trattativa, è l\'unico indizio.',
    'Rifiutare un\'offerta: se il giocatore voleva andare ci resta male (e può chiedere la cessione); se era contento di restare, apprezza. Puoi motivare il no (incedibile, serve per l\'obiettivo, progetto per la prossima stagione): una motivazione credibile attenua la delusione.',
    '«Cerca un acquirente» nella scheda del giocatore ora apre la stessa trattativa. Le squadre del computer vendono con le stesse regole, e anche i loro giocatori possono rifiutare il trasferimento.'
  ]],
  ['0.028','28 ottobre 2026',[
    'Motivazioni nella chat: ogni proposta può avere un motivo. Se è credibile chi tratta diventa più paziente e scende di più; se non lo è si irrita. Ripetere lo stesso motivo vale meno. Anche il rifiuto e l\'accordo finale compaiono nella chat, con la risposta di chi tratta.'
  ]],
  ['0.027','28 ottobre 2026',[
    'Clima della società: una barra generale con la media del morale di giocatori e allenatore (capitano, vice e allenatore contano di più). È in alto accanto alla cassa, nel Club e nella trattativa.',
    'Trattativa: su rinnovi, aumenti, premio partita, premio obiettivo e rinforzi ora puoi sempre trattare. Si apre una finestra con te e chi ha fatto la richiesta: tu proponi, lui accetta o fa una controproposta. Aprire la trattativa delude un po\' chi ha chiesto.',
    'Barra della pazienza: ogni proposta la consuma, tanto più quanto è lontana dal minimo che il richiedente è disposto ad accettare. Quando si azzera devi decidere: accettare la sua ultima richiesta o rifiutare.',
    'Il minimo resta segreto: l\'unico indizio è la barra del morale del richiedente. Chi si trova bene in società scende volentieri e ha più pazienza; chi è scontento tiene duro.',
    'Una tantum: nei rinnovi e negli aumenti puoi offrire uno stipendio più basso compensato da una somma alla firma.',
    'Rifiuto motivato: puoi chiudere con un no spiegando il perché (conti in rosso, progetto per la prossima stagione, il gruppo prima del singolo, prestazioni) e con una somma una tantum. Il morale cala meno se il motivo è credibile; se non lo è (per esempio dici di essere in rosso con la cassa piena) cala di più. Il no secco costa il morale pieno; un accordo a metà strada costa quanto aprire la trattativa.',
    'Con l\'allenatore si tratta sul livello del rinforzo promesso. Le squadre del computer trattano con lo stesso modello.'
  ]],
  ['0.026','28 ottobre 2026',[
    'Impegni del presidente: le richieste accettate con una scadenza (rinforzo promesso all\'allenatore, premio partita, premio obiettivo) restano attive come missioni finché non si concludono, con avanzamento e giornate che mancano. Le trovi in cima all\'Ufficio e nel Club; a fine missione restano nell\'elenco come completate, fallite o concluse.',
    'Promemoria: accanto a «Gioca la giornata» compare l\'avviso degli impegni in corso (rosso quando uno sta per scadere) e nelle notizie arriva un promemoria una giornata prima della scadenza e all\'ultima giornata utile.',
    'Rinforzo promesso: dall\'impegno si apre il Mercato già filtrato sul ruolo, e nell\'elenco i giocatori che soddisfano la promessa hanno il segno «promessa ✓» («promessa ?» se il valore va confermato dall\'osservatore).'
  ]],
  ['0.025','28 ottobre 2026',[
    'Nuova pagina «Ufficio del presidente»: cassa e previsione di fine stagione, stipendi arretrati, debiti, penalizzazioni, rapporto stipendi/ricavi con semaforo, bilancio della stagione voce per voce, finanziamenti, controlli sugli stipendi e storico delle decisioni.',
    'Economia vera: entrate (stadio, sponsor, diritti TV, premi di fine campionato, cessioni) e uscite (stipendi, staff e strutture, rate, interessi, premi, acquisti). La cassa iniziale è più bassa (nelle nuove partite) e conta davvero.',
    'Stipendi come in Serie A: controlli dopo le giornate 4, 7, 10, 13 e a fine stagione. Chi non è in regola perde almeno 2 punti, più 2 per ogni periodo precedente non pagato; al 3° controllo, con più periodi non pagati, l\'esclusione dal campionato (partite perse 0-3 a tavolino). Penalità del 4° controllo e di fine stagione nella stagione successiva. In classifica compaiono i punti tolti.',
    'Richieste al presidente: rinnovi e aumenti di stipendio, premi partita prima delle sfide che contano, premi per l\'obiettivo stagionale, rinforzi chiesti dall\'allenatore (con promessa e scadenza) e offerte delle altre squadre per i tuoi giocatori. Puoi accettare, trattare o rifiutare: ogni scelta pesa su morale e conti.',
    'Chi vince chiede di più, chi è in difficoltà si accontenta: è il freno contro le squadre imbattibili. Un rinnovo rifiutato significa perdere il giocatore gratis a fine contratto; le stelle delle squadre in vetta sono corteggiate dalle rivali.',
    'Le squadre del computer seguono le stesse regole: ricevono richieste e offerte, decidono in base ai conti, chiedono prestiti e vendono i giocatori più pagati se sono in difficoltà; quando la rosa si accorcia prendono svincolati.'
  ]],
  ['0.024','28 ottobre 2026',[
    'Morale dei giocatori: dopo ogni partita sale o scende per il voto, il risultato, i gol, i minuti giocati (le panchine di fila pesano, soprattutto per gli ambiziosi), il clima nello spogliatoio (il capitano conta di più) e l\'umore dell\'allenatore. I professionisti reagiscono meno alle delusioni.',
    'Freni contro le spirali: il morale torna sempre verso la normalità e una sola partita lo sposta al massimo di 1,6 punti. In una stagione di prova le squadre sono rimaste tra 8 e 14 (su 20).',
    'Effetto in partita moderato: tra morale pessimo e morale alle stelle passano circa 0,1–0,13 punti a partita, quanto un buon acquisto. Conta anche il morale dell\'allenatore.',
    'Cause visibili: nella scheda del giocatore il livello di morale e le ultime cause (▲ ▼); in rosa passando sulla barra; nel Club la nuova sezione «Spogliatoio» con morale della squadra e dell\'allenatore, capitano, vice, il più carico e il più scontento. Notizie quando un tuo giocatore è giù o cambia il clima.',
    'Voto all\'allenatore: risultato rispetto alle attese, cambi azzeccati, mosse tattiche riuscite o sbagliate, espulsioni, allontanamento, giocatori sfiniti lasciati in campo.',
    'Pagelle a fine partita: dopo l\'intervista compaiono i voti di tutti i giocatori (con gol, cartellini, entrate e uscite, capitano), degli allenatori e della terna arbitrale.'
  ]],
  ['0.023','28 ottobre 2026',[
    'Voti più giusti, per ruolo: ogni ruolo è giudicato su quello che deve fare. Portiere: parate (di più quelle importanti nel finale) e gol subiti. Centrali: contrasti, intercetti, porta inviolata. Terzini: anche cross e passaggi chiave. Mediani: soprattutto precisione e passaggi che fanno avanzare la squadra. Trequartisti e ali: passaggi chiave e dribbling. Punte: gol e tiri in porta, e un malus se non tirano mai.',
    'Voti più giusti, per momento: un gol (o un assist) che porta in vantaggio o pareggia vale di più, ancora di più dopo l\'80\'; un gol sul 3-0 vale meno. I gol subiti contano solo per chi era in campo.',
    'Pagelle più realistiche: media intorno a 6–6,2 per tutti i ruoli (prima gli attaccanti avevano in media 7,4 e i difensori 6,6). Il migliore in campo ora è distribuito tra tutti i ruoli (prima per il 64% era un attaccante).',
    'Capitano e vicecapitano per ogni squadra, scelti in base a professionalità, anzianità e qualità. Il capitano porta la fascia (gialla, visibile in 3D sul braccio sinistro; in 2D una C sul giocatore). Se esce dal campo la fascia passa al vice, e poi al giocatore successivo. In rosa e nella scheda compaiono C e VC.'
  ]],
  ['0.022','28 ottobre 2026',[
    'Stanchezza realistica: l\'energia cala piano nel primo tempo e di più dopo il 60\', con un parziale recupero all\'intervallo. A fine partita la media è intorno al 60% (prima era al 34%). Conta molto la resistenza: in 90 minuti un giocatore con resistenza 16 consuma circa 27 punti, uno con resistenza 6 circa 46.',
    'Conta anche il ruolo (terzini e centrocampisti corrono di più, i centrali meno) e la tattica: il pressing alto consuma il 12–14% di energia in più.',
    'Effetti della stanchezza: meno velocità, decisioni meno lucide, passaggi meno precisi, più falli in ritardo; in difesa si anticipa e si chiude lo specchio peggio. Chi entra dalla panchina è fresco e nel finale fa la differenza.',
    'Cambi realistici: 5 cambi in 3 interruzioni più l\'intervallo, come in Serie A. Quasi tutti tra il 60\' e l\'85\', a volte due insieme; cambi all\'intervallo quando un difensore è ammonito o la squadra è sotto; a fine partita chi vince può fare un cambio per far passare il tempo.',
    'Chi è sotto nel punteggio si sbilancia in avanti dal 70\'.',
    'Recupero vero: dipende dal tempo perso per esultanze, cambi, infortuni e cartellini (in media circa 2–3 minuti nel primo tempo e 5 nel secondo) e il quarto uomo lo annuncia.',
    'Corretto un errore nei minuti giocati: chi giocava 90 minuti ne risultava 67, e questo rallentava la crescita dei titolari.',
    'Risultato: i gol dopo il 75\' sono saliti al 18% circa (prima 16%) e le sostituzioni a 6,6 a partita (prima 5,5).'
  ]],
  ['0.021','28 ottobre 2026',[
    'Cartellini grandi: 30 × 40 cm, ben visibili in 3D (e più grandi anche in 2D).',
    'Nuova sequenza del cambio: chi entra va a centrocampo fuori dal campo e aspetta; chi esce lascia il terreno di gioco; quando arriva l\'assistente, il cambio è autorizzato e il nuovo giocatore entra. Chi esce va a sedersi in panchina.',
    'Dirigente con il tabellone luminoso: durante il cambio mostra il numero di chi esce in rosso e quello di chi entra in verde.',
    'Tunnel degli spogliatoi tra le panchine.',
    'Ingresso in campo in 3D: le squadre escono dal tunnel e si schierano a centrocampo con la terna arbitrale in mezzo, poi raggiungono le posizioni del calcio d\'inizio.',
    'Intervallo in 3D: le squadre rientrano negli spogliatoi, compare il tabellone con il risultato, poi le squadre tornano in campo e si schierano.',
    'Fine partita in 3D: le squadre rientrano negli spogliatoi e poi parte l\'intervista. Ogni scena si può saltare con «Salta».'
  ]],
  ['0.020','28 ottobre 2026',[
    'Assistenti invertiti: ognuno copre la metà campo alla sua sinistra. La diagonale dell\'arbitro è stata girata di conseguenza, così resta sempre dal lato opposto all\'assistente che segue l\'azione.',
    'Panchine in 3D: struttura con tettoia trasparente e la fascia del colore della squadra, sedute, le riserve sedute in panchina (anche chi è uscito dal campo) e l\'allenatore in piedi nell\'area tecnica davanti alla sua panchina.'
  ]],
  ['0.019','28 ottobre 2026',[
    'Arriva la terna arbitrale: arbitro e due assistenti, una terna per ogni partita della giornata. Nuova pagina «Arbitri» con le caratteristiche di ogni terna (esperienza, severità nei cartellini, fischio facile su falli e rigori, tendenza all\'errore) e le statistiche: gare, voto medio, errori, gialli, rossi, rigori.',
    'L\'arbitro si muove lungo la diagonale, da un vertice all\'altro del campo, a distanza dall\'azione e lontano dai suoi assistenti. Gli assistenti corrono lungo la linea laterale, ognuno nella sua metà campo, in linea con il penultimo difendente o col pallone, e alzano la bandierina sul fuorigioco.',
    'Errori arbitrali: da 0 a 2 a partita, casuali (rigore non dato, rigore inesistente, fuorigioco non visto, fuorigioco inesistente). Ogni errore ha il suo replay alla moviola con il commento del giornalista.',
    'Cartellini: l\'arbitro va dal giocatore e mostra il cartellino (giallo, rosso, doppio giallo). Chi è espulso esce dal campo a piedi.',
    'Cambi solo a gioco fermo: l\'assistente dal lato delle panchine va a centrocampo, chi esce raggiunge la panchina e chi entra parte dalla linea di metà campo.',
    'Allenatori: nuovo attributo «temperamento». Dopo un errore arbitrale o un cartellino l\'allenatore può protestare; se esagera l\'arbitro va verso la panchina e lo allontana, e salta la partita successiva (in panchina va il vice, niente cambi di modulo).',
    'Il 3D dal vivo (a 1x) ora parte anche per ammonizioni, espulsioni, sostituzioni e allontanamento dell\'allenatore. In 3D ci sono le panchine con gli allenatori.',
    'A fine gara la terna riceve un voto, visibile nei risultati, nella cronaca e nella pagina Arbitri.'
  ]],
  ['0.018','28 ottobre 2026',[
    'Rimessa laterale vera: chi batte resta sulla linea e lancia il pallone con le mani (parte da circa 2 metri d\'altezza) a un compagno vicino e libero; non entra più in campo palla al piede.',
    'Distanza regolamentare: sui calci d\'angolo, sulle punizioni e al calcio d\'inizio gli avversari si allontanano ad almeno 9,15 metri dal pallone prima della battuta; sulla rimessa laterale ad almeno 2 metri.',
    'Ritoccata la precisione al tiro per restare nei valori reali di gol a partita.'
  ]],
  ['0.017','28 ottobre 2026',[
    'Uno contro uno col portiere: chi ha davanti solo il portiere avanza palla al piede verso la porta, invece di passare.',
    'Se un avversario arriva in contrasto (o il portiere esce addosso) la prima scelta è tirare; da vicino (sotto gli 11–12 metri) si tira comunque.',
    'Solo se non ci sono le condizioni per tirare (angolo chiuso, troppo lontano) si passa, scegliendo il compagno più libero per non perdere palla.',
    'Vicino all\'area, se c\'è un buon tiro, il passaggio a un compagno marcato diventa una scelta molto meno probabile.',
    'Ritoccata la precisione al tiro per restare nei valori reali di gol a partita.'
  ]],
  ['0.016','28 ottobre 2026',[
    'Pallone in 3D più grande: 35 cm di diametro invece di 22, per vederlo meglio.'
  ]],
  ['0.015','28 ottobre 2026',[
    'Proporzioni reali in 3D: i giocatori erano ingranditi del 30% (un giocatore di 1,85 m appariva alto 2,60 m, più della traversa). Ora ognuno ha la sua altezza reale rispetto a porta (7,32 × 2,44 m) e campo (105 × 68 m).',
    'Pallone in scala: 22 cm di diametro, come quello regolamentare (prima 60 cm).',
    'Telecamera TV dei replay un po\' più vicina all\'azione; intervista ricalibrata sull\'altezza del giocatore.'
  ]],
  ['0.014','28 ottobre 2026',[
    'Rimbalzo più alto dopo i lanci lunghi: il primo rimbalzo arriva a circa 120 cm (prima 40–60 cm). I lanci più corti e bassi rimbalzano meno.'
  ]],
  ['0.013','28 ottobre 2026',[
    'Fisica del pallone riscritta: la posizione del pallone è registrata ogni 1/8 di secondo invece che ogni mezzo secondo, così i palloni alti seguono una vera parabola senza cambi di direzione improvvisi.',
    'Gravità e rimbalzi reali: un lancio lungo che non trova nessuno rimbalza in avanti, perde forza a ogni rimbalzo e poi rotola fino a fermarsi. Non torna più indietro.',
    'Le deviazioni di testa e i rinvii al volo partono dall\'altezza a cui il pallone è stato colpito, non più da terra.',
    'I giocatori possono controllare il pallone anche di petto (sotto i 2 metri); un pallone più alto passa sopra le teste.',
    'Ritoccati tempo di gioco effettivo, calci d\'angolo e infortuni per restare nei valori della Serie A.'
  ]],
  ['0.012','28 ottobre 2026',[
    'Calci piazzati in 3D sempre a velocità 1x, anche se la partita scorre a x2 o x4; finito il calcio piazzato si torna alla velocità scelta.',
    'La vista 3D parte pochi secondi prima della battuta (4–5 secondi), così l\'attesa resta breve anche a velocità normale.'
  ]],
  ['0.011','28 ottobre 2026',[
    'Porte in 3D: tolta la rete sulla linea di porta che sembrava un muro; ora la rete c\'è solo dietro, sopra e ai lati.',
    'Tiri fuori: il pallone vola oltre la linea di fondo ed esce dallo schermo, poi riappare subito sul punto della rimessa o del calcio d\'angolo. Solo quando è gol il pallone resta dentro la porta. Lo stesso vale per rimesse laterali e angoli.',
    'Calci piazzati in 3D dal vivo: calci d\'angolo, punizioni e rigori passano in automatico alla vista 3D con un\'inquadratura dedicata (alle spalle di chi calcia per punizioni e rigori, dall\'alto dietro la porta per angoli e punizioni crossate). Niente replay per queste azioni, salvo in caso di gol.',
    'Dopo il replay di un gol si torna al 2D con le squadre già schierate per il calcio d\'inizio, senza attese. Il replay del gol parte subito dopo la rete.'
  ]],
  ['0.010','27 ottobre 2026',[
    'Punizioni dal limite: la squadra che difende alza la barriera (da 3 a 5 uomini, i più alti) a 9,15 metri e il portiere copre l\'altro lato. Chi calcia può prendere la barriera, mandarla fuori o metterla nell\'angolino: conta il suo voto nei calci piazzati, contano altezza e salto della barriera e i riflessi del portiere.',
    'Punizioni dalla trequarti: si crossano in area come un calcio d\'angolo.',
    'Specialisti: l\'allenatore sceglie chi batte rigori, punizioni e angoli. Se lo specialista è in campo calcia sempre lui.',
    'Schemi sui calci d\'angolo, scelti in base ai giocatori: al centro dell\'area per i saltatori, sul secondo palo, sul primo palo per la deviazione, corto al limite per il tiro al volo, oppure corto per giocarlo a terra.',
    'Sugli angoli e sulle punizioni crossate la difesa si schiera a zona o a uomo, secondo la scelta dell\'allenatore.',
    'Le scelte su specialisti e schema d\'angolo compaiono prima del calcio d\'inizio.',
    'Banco di prova: 21 statistiche su 22 nei valori reali.'
  ]],
  ['0.009','27 ottobre 2026',[
    'Difesa di reparto: i difensori formano una linea unica che si muove insieme e tutta la squadra resta corta dietro di loro, senza buchi tra i reparti.',
    'La linea sale quando il portatore è pressato o l\'avversario passa all\'indietro (con la trappola del fuorigioco), e scappa all\'indietro quando il portatore ha tempo e spazio per lanciare.',
    'L\'allenatore sceglie l\'altezza della linea (alta, media, bassa), la marcatura (a zona, a uomo, oppure zona con un marcatore fisso sull\'attaccante più pericoloso) e se usare la trappola del fuorigioco. Lo trovi nelle scelte prima della partita.',
    'Coperture: quando un difensore esce sul portatore, il compagno più vicino scala alle sue spalle.',
    'Il fuorigioco si decide dalla posizione reale al momento del passaggio; sui centimetri l\'assistente può sbagliare. Gli attaccanti con buone decisioni partono più spesso in tempo.',
    'Filtranti nello spazio alle spalle della linea e corsa sul pallone: arriva prima chi è più veloce, e il portiere esce sui palloni in area. Chi si trova solo davanti al portiere va dritto in porta.',
    'Nel campo 2D compare la linea del fuorigioco della squadra che difende (tratteggiata, nel suo colore).',
    'Banco di prova: 19 statistiche su 22 nei valori reali.'
  ]],
  ['0.008','27 ottobre 2026',[
    'Pressing meno appiccicoso: chi pressa si ferma a uno o due metri e aspetta il momento giusto; si va addosso solo vicino alla propria area o sugli inneschi del pressing.',
    'Protezione della palla: chi è a contatto può girarsi e proteggerla con il corpo; contano forza e primo controllo.',
    'Un passaggio un po\' impreciso non è più palla persa: se il compagno ci arriva può ancora controllarla, e lì conta il primo controllo.',
    'La precisione dei passaggi dipende di più dalla qualità reale del giocatore. Le squadre tecniche (passaggio, controllo, decisioni) e quelle che giocano a possesso preferiscono il passaggio sicuro nel giro palla e tengono di più il pallone.',
    'Banco di prova: 20 statistiche su 22 nei valori reali. Precisione dei passaggi al 79% e possesso della squadra più forte al 53%, finalmente nei valori reali.'
  ]],
  ['0.007','27 ottobre 2026',[
    'Gli attributi passano da 10 a 22. Tecnici: passaggio, primo controllo, dribbling, cross, finalizzazione, tiro da fuori, colpo di testa, contrasto, calci piazzati. Mentali: visione, decisioni, posizionamento, freddezza, aggressività. Fisici: velocità, resistenza, forza, elevazione. Portiere: riflessi, presa, uscite, rinvio.',
    'Ogni giocatore ha altezza, piede preferito e un tipo (per esempio bomber d\'area, regista, terzino di spinta, portiere moderno). Altezza e piede si vedono subito, il tipo lo scopre l\'osservatore.',
    'In partita ogni attributo conta: il primo controllo decide se la palla resta tua, il cross la precisione dei palloni in area, freddezza e finalizzazione i gol, aggressività quanto si entra in contrasto (e quanti falli), altezza ed elevazione i duelli aerei, il piede debole peggiora tiri e cross.',
    'Il portiere: riflessi per le parate, presa per trattenere invece di respingere, uscite su cross e attaccanti, rinvio per i lanci.',
    'Rigori, punizioni e angoli li calcia chi ha i calci piazzati migliori.',
    'I salvataggi delle versioni precedenti vengono convertiti in automatico: i nuovi attributi nascono da quelli vecchi.',
    'Ritaratura: 18 statistiche su 22 nei valori reali.'
  ]],
  ['0.006','27 ottobre 2026',[
    'Passaggio di prima: uno-due vicino all\'area (chi passa scatta nello spazio e riceve di ritorno) e scarico immediato al compagno vicino quando si è pressati.',
    'Tiro di prima vicino alla porta: molto efficace sotto gli 8 metri, impreciso appena ci si allontana.',
    'Contromisure: i difensori leggono il passaggio di prima e lo intercettano più spesso; il portiere esce sull\'attaccante in area e può anticipare il tiro di prima.',
    'Tempo di gioco effettivo ridotto: il cronometro mostra sempre 90 minuti più recupero, ma la partita simulata dura circa il 70%, come il tempo di gioco effettivo reale. A velocità normale una partita dura circa un\'ora.',
    'Ritaratura: 19 statistiche su 22 nei valori del calcio reale, numero di passaggi compreso.'
  ]],
  ['0.005','27 ottobre 2026',[
    'Niente più scatti: chi riceve palla continua a correre mentre decide e sceglie in meno di un secondo. I giocatori accelerano e frenano in modo graduale.',
    'Quando la squadra ha la palla sale in blocco: centrocampisti oltre la linea della palla, trequartista tra le linee, tutti di corsa per offrire soluzioni. I centrali restano dietro.',
    'Gli esterni e i terzini salgono sulle fasce e spingono di più su quella dove l\'avversario è più scoperto.',
    'Se il centro è chiuso la squadra allarga il gioco sulle fasce e fa girare palla per cambiare lato, anche con il cambio di gioco lungo verso l\'esterno libero.',
    'In difesa: chi viene sorpreso in avanti rientra di corsa, in area la marcatura è stretta e i contrasti sono più decisi.',
    'Ritaratura: 18 statistiche su 22 nei valori del calcio reale.'
  ]],
  ['0.004','27 ottobre 2026',[
    'Chi riceve palla non resta fermo: se è pressato si protegge e cerca subito una soluzione, se è libero orienta il controllo in avanti.',
    'Le scelte con la palla: saltare l\'uomo in dribbling sfruttando tecnica e velocità; se pressato, scaricare subito al compagno vicino libero da marcatura; tornare indietro verso la difesa quando la strada alle spalle è libera; avanzare palla al piede nello spazio libero.',
    'La precisione dei passaggi cala con la distanza e crolla quando si è a contatto con l\'avversario. Un compagno marcato è un bersaglio peggiore di uno libero.',
    'Il lancio lungo verso la punta resta l\'ultima risorsa di chi sta per perdere palla: capita raramente.',
    'I tre compagni più vicini al portatore si smarcano lontano dalle marcature per offrire una linea di passaggio.',
    'Nuove istruzioni dell\'allenatore per ogni attaccante: in linea con i difensori, negli spazi tra i difensori, oppure tra la difesa e il centrocampo. Le trovi nelle scelte prima della partita.',
    'Con due punte, una viene incontro a ricevere e l\'altra attacca la profondità. I passaggi filtranti finiscono nei varchi tra i difensori, mai addosso a un difensore.'
  ]],
  ['0.003','27 ottobre 2026',[
    'Calcio di rigore: tutti i giocatori escono dall\'area e si mettono dietro il pallone, fuori dalla lunetta. In area restano solo il rigorista e il portiere, sulla linea di porta.',
    'Calcio d\'angolo: prima la palla esce dal campo, poi viene portata sulla bandierina. Intanto gli attaccanti più forti di testa entrano in area e i difensori si schierano a protezione della porta.',
    'Anche rimesse laterali e rinvii dal fondo: la palla esce davvero prima di essere rimessa in gioco.'
  ]],
  ['0.002','27 ottobre 2026',[
    'Il tiro vincente finisce dentro la rete. Il marcatore corre a esultare verso la bandierina e i compagni lo raggiungono; poi si torna a centrocampo per il calcio d\'inizio.',
    'Nel replay 3D del gol il marcatore esulta a braccia alzate.',
    'Nuove velocità: 1x tempo reale (90 minuti), 2x la partita dura 15 minuti, 4x la partita dura 5 minuti. Resta il pulsante per saltare alla fine.'
  ]],
  ['0.001','27 ottobre 2026',[
    'La squadra si muove come un blocco: linea difensiva che segue la palla, reparti corti, scivolamenti verso il lato della palla.',
    'Pressing con inneschi: retropassaggio, palla vicino alla linea laterale, contropressing subito dopo aver perso palla. Il primo uomo temporeggia, il secondo copre, vicino all\'area si entra deciso.',
    'Fasi di gioco: costruzione con i centrali larghi, rifinitura con le ali sulla linea e la punta in area, contropiede dopo il recupero con le punte che attaccano la profondità.',
    'Movimenti senza palla: due compagni si smarcano sempre per il portatore, i terzini si sovrappongono, i centrocampisti si inseriscono in area.',
    'Si cambia campo all\'intervallo. Arrivano i tiri da fuori, la forma del giorno di ogni squadra e i gol da palla inattiva.',
    'Taratura su 320 partite simulate: 17 statistiche su 22 nei valori del calcio reale (gol, tiri, angoli, falli, cartellini, rigori, fuorigioco, fattore campo, pareggi, gol nel finale).',
    'Da migliorare nella prossima versione: troppi passaggi, possesso della squadra più forte, qualche 0-0 di troppo.'
  ]]
];
