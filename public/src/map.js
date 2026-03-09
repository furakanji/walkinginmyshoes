// Variabile globale per mantenere l'istanza della mappa
let map;
let userPolyline;
let userMarker;
let userPathCoordinates = [];

/**
 * Inizializza Google Maps. 
 * Requisiti: lo script tag di Google Maps deve aver invocato "initMap" callback.
 */
function initializeGoogleMap() {
    // Coordinate base iniziali (es. Centro di Roma)
    const initialPosition = { lat: 41.9028, lng: 12.4964 };

    // Opzioni della mappa (Dark Mode by default)
    const mapOptions = {
        zoom: 15,
        center: initialPosition,
        disableDefaultUI: true, // Nasconde controlli superflui per un look più clean
        styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            {
                featureType: "administrative.locality",
                elementType: "labels.text.fill",
                stylers: [{ color: "#d59563" }],
            },
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#38414e" }],
            },
            {
                featureType: "road",
                elementType: "geometry.stroke",
                stylers: [{ color: "#212a37" }],
            },
            {
                featureType: "road",
                elementType: "labels.text.fill",
                stylers: [{ color: "#9ca5b3" }],
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#17263c" }],
            },
        ],
    };

    map = new google.maps.Map(document.getElementById("map"), mapOptions);

    // Inizializza la polyline del percorso utente
    userPolyline = new google.maps.Polyline({
        path: userPathCoordinates,
        geodesic: true,
        strokeColor: "#ff5722", // matches var(--primary)
        strokeOpacity: 1.0,
        strokeWeight: 4,
    });
    userPolyline.setMap(map);
    
    // Inizializza il marker per la posizione attuale
    userMarker = new google.maps.Marker({
        position: initialPosition,
        map: map,
        title: "Tu sei qui",
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#03a9f4",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
        }
    });

    console.log("Mappa Google in Dark mode inizializzata.");
    
    // Dispatche l'evento per notificare app.js che la mappa è pronta
    window.dispatchEvent(new Event('mapReady'));
}

if (window.google && window.google.maps) {
    initializeGoogleMap();
} else {
    window.addEventListener('googleMapsLoaded', initializeGoogleMap);
}

/**
 * Funzione esposta per aggiornare la mappa con un nuovo punto
 * @param {Object} coords - {lat, lng}
 * @param {boolean} centerMap - Se true, sposta la vista della mappa sulle coordinate
 */
export function updateMapPosition(coords, centerMap = true) {
    if (!map || !userMarker) return;

    const latLng = new google.maps.LatLng(coords.lat, coords.lng);
    
    // Aggiorna posizione marker
    userMarker.setPosition(latLng);
    
    // Aggiunge punto alla traccia percorsa
    userPathCoordinates.push(latLng);
    userPolyline.setPath(userPathCoordinates); // Forza l'aggiornamento

    // Centra mappa se richiesto
    if (centerMap) {
        map.panTo(latLng);
    }
}
