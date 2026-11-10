# Atelier Hair Studio — Architettura delle prenotazioni V1.1

Stato: **progettazione backend / demo interattiva aggiornata** (10 novembre 2026).
Questa specifica riguarda un salone con una sola risorsa prenotabile, predisposto per futuri parrucchieri multipli.

## Stato attuale della demo
- Frontend statico GitHub Pages: `/digital/salone-demo/`.
- Prenotazioni simulate in `sessionStorage` nel browser del visitatore.
- Slot occupato da richieste `pending` non scadute o da prenotazioni `confirmed`.
- Scadenza temporanea dimostrativa: **15 minuti**; timer visibile nell'agenda; simulazione di scadenza manuale.
- L'operatore demo può approvare, rifiutare, annullare e forzare la scadenza.
- Link WhatsApp di prova al numero professionale presente su paolosavio.eu, con testo precompilato e invio manuale.
- **Limite essenziale:** `sessionStorage` non sincronizza più dispositivi o più browser; l'agenda demo pubblica non ha autenticazione e non è un gestionale reale.

## Obiettivo reale
1. Il cliente apre il sito e sceglie servizio, giorno, ora e nome.
2. Il server verifica gli intervalli disponibili e prenota atomicamente una fascia temporanea.
3. Il server salva `pending` con `expires_at` e un ID pubblico non prevedibile.
4. Solo dopo il successo della prenotazione temporanea si apre WhatsApp, con ID richiesta e dettagli precompilati; non viene inviato automaticamente.
5. Il gestore apre il pannello **privato** e approva o rifiuta.
6. `confirmed` blocca definitivamente la fascia. L'approvazione crea un evento su Google Calendar.
7. `rejected`, `cancelled` e `expired` liberano la fascia, quando applicabile.
8. Se scade prima della conferma, il server rifiuta l'approvazione; il cliente deve scegliere di nuovo lo slot.

## Stati e transizioni

| Stato | Blocca gli slot? | Può diventare |
| --- | --- | --- |
| `pending` finché `expires_at > now` | Sì | `confirmed`, `rejected`, `expired` |
| `confirmed` | Sì | `cancelled` |
| `rejected` | No | Finale |
| `expired` | No | Finale |
| `cancelled` | No | Finale |

Scadenza: demo = 15 minuti. Valore reale di produzione da concordare: proposta iniziale **2 ore** (configurabile); in ogni caso la conferma deve precedere l'inizio della seduta. Nessuna conferma automatica per assenza di risposta.

## Schema logico dei dati

`bookings`:
- `id` UUID non prevedibile
- `service_id` stringa/UUID validato dal server
- `resource_id` = `salon-1` (campo pronto per singoli parrucchieri)
- `start_at` e `end_at` ISO 8601 con fuso esplicito; calendarizzazione in **Europe/Rome**
- `customer_name`, `contact` minimo indispensabile e consenso/privacy applicabili
- `status` tra `pending`, `confirmed`, `rejected`, `expired`, `cancelled`
- `created_at`, `expires_at`, `updated_at`
- `calendar_event_id` opzionale dopo la conferma
- `admin_note` privata, mai esposta ai visitatori

`services`: ID, nome, durata in minuti, costo visibile, attivo.

`opening_hours`: giorni di apertura, orari, pause, chiusure e ferie. Intervalli di prenotazione ogni 30 minuti, ma occupazione dell'intera durata del trattamento. Eventuale buffer tra trattamenti configurabile.

## Regola anti-sovrapposizione

Per due intervalli `[start1,end1)` e `[start2,end2)` c'è sovrapposizione se:

`start1 < end2 && start2 < end1`

Contano soltanto prenotazioni confermate e richieste in attesa non scadute. Due clienti che prenotano nello stesso istante devono essere serializzati da una **operazione atomica sul server**, non controllati soltanto sul browser.

### Backend a costo software zero: Google Apps Script + Google Sheets + Google Calendar

Implementazione proposta, da pubblicare solo dopo configurazione di un account Google dedicato al salone:

- Google Sheets: registro centrale delle richieste e dei servizi.
- Apps Script: validazione e scrittura degli slot in una sezione critica protetta da `LockService.getScriptLock()`; il lock protegge i concorrenti che utilizzano **lo stesso progetto Script**.
- API/booking UI pubblica: preferibilmente una web app HTML di Apps Script incorporata nel sito, con `google.script.run` verso funzioni pubbliche limitate. Questo evita di dare per scontato che una chiamata `fetch` cross-origin da GitHub Pages a Apps Script funzioni senza problemi CORS.
- Pannello operatore: **accesso riservato** al titolare mediante Google/account autorizzato. Le funzioni privilegiate devono verificare l'identità lato server; non basta nascondere i bottoni e non bisogna mettere un token segreto nel codice pubblicato.
- Google Calendar: eventi creati solo quando la richiesta diventa `confirmed`; anche gli impegni inseriti direttamente nell'agenda devono impedire nuove prenotazioni. Cancellazioni da pannello devono rimuovere/aggiornare l'evento associato.
- Una funzione di pulizia periodica aggiorna gli stati `expired`, ma le letture della disponibilità ignorano **subito** i pending con `expires_at <= now`, anche se il trigger non è ancora partito.

**Nota importante sul locking:** se pubblico e amministrazione sono in due progetti Apps Script differenti, `getScriptLock()` non garantisce mutua esclusione tra loro. Occorre usarlo in un unico servizio condiviso oppure adottare un database con vincolo transazionale.

### Sicurezza e affidabilità
- Gli utenti pubblici non possono leggere nomi, telefoni, note o dettagli degli appuntamenti altrui; vedono soltanto disponibilità.
- Il pannello operatore non deve essere pubblico; l'identità/autorizzazione si verifica sul server per ogni operazione di modifica.
- Validation server-side: ID trattamento, durata, giorno, orario, festività, campo obbligatorio, idempotenza richiesta e anti-spam/rate-limit.
- Ricalcolare lo slot nel blocco atomico immediatamente prima di scrivere `pending`. Non fidarsi dell'intervallo suggerito dal browser.
- Generare ID opachi; nessun segreto in GitHub Pages.
- Proteggere dati personali, fornire informativa privacy e fissare tempi di conservazione prima dell'attivazione reale.
- Ricontrollare conflitti su Google Calendar prima di creare la conferma; gestire il fallimento di creazione evento senza considerare l'appuntamento confermato.
- L'invio WhatsApp non garantisce la ricezione o la conferma. Lo stato dell'appuntamento è governato solo dal server.
- Valutare quote e limiti dell'account Google prima del lancio. "Zero euro" indica assenza di servizi a pagamento nell'uso previsto, non assenza di limiti.

## Contratto logico delle operazioni

- `GET availability(date,service_id)` -> lista fasce libere, senza dati personali.
- `POST createHold(service_id,start_at,customer_name)` -> `hold_id`, `expires_at`, stato `pending`, oppure errore `SLOT_BUSY`.
- `POST adminConfirm(hold_id)` -> evento Calendar + stato `confirmed`, oppure `EXPIRED` / `CONFLICT`.
- `POST adminReject(hold_id)` -> `rejected`; libera slot.
- `POST adminCancel(booking_id)` -> `cancelled`; rimuove evento Calendar e libera slot.
- `POST cleanupExpired()` -> `expired` per richieste con TTL trascorso.
- Pannello cliente (futuro): stato tramite link privato con token non indovinabile.

## Verifiche per l'attivazione
1. Due browser richiedono contemporaneamente la stessa fascia: una sola richiesta deve riuscire.
2. Un trattamento da 120 minuti blocca ogni fascia sovrapposta, non solo l'inizio.
3. Rifiuto e scadenza rendono di nuovo libero lo slot; non si può confermare una richiesta già scaduta.
4. Le conferme creano esattamente un evento Calendar; gli errori non lasciano stati divergenti.
5. Ferie, chiusure, fusi orari e transizione ora legale sono gestiti.
6. Utente anonimo non può eseguire alcuna azione operatore.
7. Chrome/Edge, Android e iPhone verificati per apertura WhatsApp e aggiornamento disponibilità.

## Prossimo passo di integrazione
Creare un calendario dedicato al salone e uno spreadsheet dedicato, configurare il backend con autenticazione operatore e verificare il comportamento di incorporamento sul dominio `www.paolosavio.eu`. **Non** utilizzare il calendario personale o i dati reali dei clienti finché non sono attivati privacy, sicurezza e test di simultaneità.
