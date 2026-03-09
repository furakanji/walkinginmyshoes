import { Tracker } from './src/tracker.js';
import { updateMapPosition } from './src/map.js';
import { auth, db, signInAnonymously, onAuthStateChanged, collection, addDoc, serverTimestamp } from './src/firebase.js';
import { fetchStreetName } from './src/overpass.js';

let currentUser = null;

// Firebase Auth setup
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        console.log("Utente loggato anonimamente:", user.uid);
    } else {
        signInAnonymously(auth).catch(err => console.error("Auth error:", err));
    }
});

// --- Servizio Worker Registration per PWA ---
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js")
            .then(reg => console.log("Service Worker registrato con successo:", reg.scope))
            .catch(err => console.error("Registrazione Service Worker fallita:", err));
    });
}

// --- UI Elements ---
const btnStart = document.getElementById('btn-start');
const btnBattery = document.getElementById('btn-battery');
const dashboard = document.getElementById('live-dashboard');
const gpsStatusDot = document.getElementById('gps-status');
const statusText = document.getElementById('status-text');

// Stats Elements
const valDistance = document.getElementById('val-distance');
const valSpeed = document.getElementById('val-speed');
const valStreets = document.getElementById('val-streets'); // Per ora mockato

// --- App State ---
let isSessionActive = false;
let streetsConquered = 0;
let lastOverpassCall = 0; // Throttle timestamp
let discoveredStreets = new Set(); // Nomi strade percorse

// Inizializza Tracker
const tracker = new Tracker({
    onLocationUpdate: async (data) => {
        // Aggiorna UI Dashboard
        valDistance.innerHTML = `${data.totalDistanceKm.toFixed(2)} <small>km</small>`;
        valSpeed.innerHTML = `${data.currentSpeedKmh.toFixed(1)} <small>km/h</small>`;
        
        // Throttling Overpass API (es: una query ogni 15 secondi per risparmio/rate_limit)
        const now = Date.now();
        if (now - lastOverpassCall > 15000) {
            lastOverpassCall = now;
            const streetName = await fetchStreetName(data.latestPoint.lat, data.latestPoint.lng);
            
            if (streetName && !discoveredStreets.has(streetName)) {
                discoveredStreets.add(streetName);
                streetsConquered++;
                valStreets.innerText = streetsConquered;
                console.log("Nuova strada scoperta:", streetName);
            }
        }

        // Se map.js ha registrato updateMapPosition, aggiornala
        // Usiamo un controllo dinamico se stiamo testando senza API Key
        if (typeof window.updateMapPosition === 'function') {
            window.updateMapPosition(data.latestPoint, true);
        }

        setStatus("Attivo", "active");
    },
    onError: (err) => {
        console.error("GPS Error:", err);
        setStatus("Errore GPS", "error");
        alert("Errore nel rilevamento della posizione: " + err.message);
    }
});

// --- Event Listeners ---

btnStart.addEventListener('click', () => {
    if (!isSessionActive) {
        // START
        isSessionActive = true;
        btnStart.textContent = "Termina sessione";
        btnStart.classList.add('stop');
        dashboard.classList.remove('hidden');
        
        setStatus("Ricerca segnale...", "warning");
        tracker.start();
        
    } else {
        // STOP
        isSessionActive = false;
        btnStart.textContent = "Inizia a colorare";
        btnStart.classList.remove('stop');
        
        setStatus("In pausa", "default");
        tracker.stop();
        
        // Salva la sessione su Firestore (Fase 3)
        if (currentUser && tracker.history.length > 0) {
            console.log("Salvataggio sessione su database in corso...");
            
            // Per Firebase Blaze Free Tier, non salviamo tutti i 500+ punti se non necessario
            // Salviamo solo statistiche vitali o path sfoltito.
            addDoc(collection(db, "sessions"), {
                uid: currentUser.uid,
                distanceMeters: tracker.totalDistanceMeters,
                streets: Array.from(discoveredStreets),
                startTime: serverTimestamp(), // idealmente calcolato all'inizio
                endTime: serverTimestamp()
            }).then(() => console.log("Sessione salvata con successo su Firestore"))
              .catch(err => console.error("Errore salvataggio sessione su Firestore:", err));
        }

        console.log("Sessione terminata. Dati finali:", tracker.history);
    }
});

btnBattery.addEventListener('click', () => {
    const isSaverOn = tracker.toggleBatterySaver();
    if (isSaverOn) {
        btnBattery.classList.add('active');
        btnBattery.setAttribute('aria-pressed', 'true');
        console.log("Battery Saver attivato: Polling ogni 5 secondi.");
    } else {
        btnBattery.classList.remove('active');
        btnBattery.setAttribute('aria-pressed', 'false');
        console.log("Battery Saver disattivato: WatchPosition continuo.");
    }
});

// Helper for status indicator
function setStatus(text, dotClass) {
    statusText.innerText = text;
    gpsStatusDot.className = 'dot ' + dotClass;
}
