const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Triggered quando un documento nella collezione "street_leaderboards" viene aggiornato.
 * Controlla se il currentBoss è cambiato. Se sì, invia un'email al vecchio boss
 * inserendo un documento nella collezione "mail" (analizzata da Trigger Email extension).
 */
exports.onStreetBossChange = functions.firestore
  .document("street_leaderboards/{streetId}")
  .onUpdate(async (change, context) => {
    const beforeDocs = change.before.data();
    const afterDocs = change.after.data();

    const previousBoss = beforeDocs.currentBoss;
    const currentBoss = afterDocs.currentBoss;

    // Se non c'era un boss prima o il boss attuale è uguale a quello precedente, non fare nulla.
    if (!previousBoss || !currentBoss || previousBoss.uid === currentBoss.uid) {
      console.log("Nessun cambio di boss rilevato.");
      return null;
    }

    // Il boss è cambiato, recuperiamo le info utente del vecchio boss per l'email.
    try {
      const userSnapshot = await admin.firestore().collection("users").doc(previousBoss.uid).get();
      
      if (!userSnapshot.exists) {
        console.log(`Impossibile trovare l'utente ${previousBoss.uid} per l'invio dell'email.`);
        return null;
      }
      
      const userData = userSnapshot.data();
      const userEmail = userData.email;
      
      if (!userEmail) {
        console.log(`L'utente ${previousBoss.uid} non ha un'email impostata.`);
        return null;
      }

      const streetName = afterDocs.streetName || "una strada";

      // Scrive il messaggio in una collezione "mail" affinché l'estensione Trigger Email proceda
      const mailDoc = await admin.firestore().collection("mail").add({
        to: userEmail,
        message: {
          subject: `Hai perso il titolo di Street Boss su ${streetName}!`,
          text: `Ciao ${previousBoss.displayName},\n\nQualcuno ha camminato più di te su ${streetName} ed è diventato il nuovo Street Boss. Torna in strada e riconquista il tuo territorio!\n\nA presto,\nIl team di Walking in my shoes`,
          html: `
            <h3>Ciao ${previousBoss.displayName},</h3>
            <p>Le cose si fanno interessanti! Qualcuno ha camminato più di te su <strong>${streetName}</strong> ed è diventato il nuovo Street Boss.</p>
            <p>Torna in strada e riconquista il tuo territorio!</p>
            <br/>
            <p>Il team di Walking in my shoes</p>
          `,
        }
      });
      
      console.log(`Email trigger accodata per ${userEmail} (Doc ID: ${mailDoc.id})`);
      return null;
      
    } catch (error) {
      console.error("Errore durante la generazione dell'email di notifica boss:", error);
      return null;
    }
  });
