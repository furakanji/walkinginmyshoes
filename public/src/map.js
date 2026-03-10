// Variabile globale per mantenere l'istanza della mappa
let map;
let userPolyline;
let userMarker;
let userPathCoordinates = [];

/**
 * Inizializza Google Maps. 
 * Requisiti: lo script tag di Google Maps deve aver invocato "initMap" callback.
 */
let directionsService;

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
    directionsService = new google.maps.DirectionsService();

    // Inizializza la polyline del percorso utente
    userPolyline = new google.maps.Polyline({
        path: userPathCoordinates,
        geodesic: true,
        strokeColor: "#FF3D00", // matches var(--primary) - More vivid
        strokeOpacity: 1.0,
        strokeWeight: 7, // Thicker
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

function getDistance(p1, p2) {
    const R = 6371e3; // metres
    const lat1 = p1.lat() * Math.PI/180;
    const lat2 = p2.lat() * Math.PI/180;
    const dLat = (p2.lat()-p1.lat()) * Math.PI/180;
    const dLng = (p2.lng()-p1.lng()) * Math.PI/180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * Centra la Mappa forzatamente sulla posizione attuale del marker.
 */
export function centerMapOnCurrentPosition() {
    if (map && userMarker) {
        map.panTo(userMarker.getPosition());
        map.setZoom(17);
    }
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

    // Centra mappa se richiesto
    if (centerMap) {
        map.panTo(latLng);
    }

    if (userPathCoordinates.length > 0) {
        const lastPoint = userPathCoordinates[userPathCoordinates.length - 1];
        const dist = getDistance(lastPoint, latLng);
        
        // Se c'è un gap sospetto (>20m) a causa di GPS in background, chiediamo a Google la strada.
        if (dist > 20 && dist < 2000) {
            directionsService.route({
                origin: lastPoint,
                destination: latLng,
                travelMode: google.maps.TravelMode.WALKING
            }, (response, status) => {
                if (status === 'OK' && response.routes && response.routes.length > 0) {
                    const path = response.routes[0].overview_path;
                    for (let i = 1; i < path.length; i++) {
                        userPathCoordinates.push(path[i]);
                    }
                    userPolyline.setPath(userPathCoordinates);
                } else {
                    userPathCoordinates.push(latLng);
                    userPolyline.setPath(userPathCoordinates);
                }
            });
            return;
        }
    }

    // Aggiunge punto alla traccia percorsa (normale movimento)
    userPathCoordinates.push(latLng);
    userPolyline.setPath(userPathCoordinates); // Forza l'aggiornamento
}
