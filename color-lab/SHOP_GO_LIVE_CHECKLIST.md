# Color Lab – checklist di lancio (Paolo Savio)
Stato: catalogo e carrello dimostrativi su GitHub Pages. Nessun acquisto o download abilitato.

## Prodotti
- 1 bundle con 18 LUT creative .cube a 33 punti
- 6 mini-pack con 3 LUT ciascuno
- Prezzi proposti (non approvati definitivamente): €24,90 bundle; €6,90 mini-pack
- Ogni LUT prevista per contenuto già normalizzato SDR Rec.709
- Verificare qualità/consistenza su immagini RAW convertite, condizioni di illuminazione e video Log normalizzati

## Dipendenze per attivare la vendita
1. Confermare dati legali/fiscali, condizioni di vendita, diritti di recesso, licenza e privacy con professionista competente.
2. Configurare un account di pagamento (es. Stripe). Mai salvare credenziali segrete in GitHub Pages.
3. Definire modalità di consegna privata: piattaforma merchant of record/servizio digital delivery oppure backend (es. Vercel e Supabase) che riceve un webhook FIRMATO e conferma l'avvenuto pagamento.
4. Mettere i ZIP in storage privato. Generare URL firmati a scadenza solo DOPO verifica pagamento sul backend. Non distribuire file mediante cartelle pubbliche.
5. Testare webhook idempotente, pagamenti falliti, rimborsi, email transazionali, limiti e scadenza download.
6. Testare schede, comparatore, carrello, imposte/prezzi e privacy su desktop e mobile.
7. Approvare immagini pubbliche e rights clearance; attivare indicizzazione SEO solo dopo il lancio.

## Note
Il carrello demo salva un array di ID prodotto nel localStorage del browser; non registra ordini reali.
Non implementare un finto checkout client-side che "autorizza" download via JavaScript.
