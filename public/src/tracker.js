export class Tracker {
    /**
     * @param {Object} options
     * @param {Function} options.onLocationUpdate - Custom callback for speed/distance info
     * @param {Function} options.onError - Callback to handle errors
     */
    constructor({ onLocationUpdate, onError }) {
        this.history = [];
        this.isTracking = false;
        this.batterySaver = false;
        
        // Callback events
        this.onLocationUpdate = onLocationUpdate;
        this.onError = onError;
        
        // Limits
        this.SPEED_LIMIT_MS = 12 * (1000 / 3600); // 12 km/h in metri/secondo
        
        // Internal variables
        this.watchId = null;
        this.timeoutId = null;
        this.totalDistanceMeters = 0;
        this.currentSpeedMetersPerSecond = 0;
    }

    start() {
        if (this.isTracking) return;
        
        if (!("geolocation" in navigator)) {
            if(this.onError) this.onError(new Error("Geolocalizzazione non supportata dal browser"));
            return;
        }

        this.isTracking = true;
        this._startTracking();
    }

    stop() {
        this.isTracking = false;
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    toggleBatterySaver() {
        this.batterySaver = !this.batterySaver;
        
        // Se stiamo già tracciando, riavvia con la nuova logica
        if (this.isTracking) {
            this.stop();
            this.isTracking = true;
            this._startTracking();
        }
        
        return this.batterySaver;
    }

    _startTracking() {
        const geoOptions = {
            enableHighAccuracy: !this.batterySaver, // True per precisione, False per batteria
            maximumAge: this.batterySaver ? 5000 : 0, // Ignora cache se vogliamo precisione
            timeout: 10000 // Error se ci mette troppo
        };

        if (this.batterySaver) {
            // Polling approach (Battery Saver Mode)
            const pollPosition = () => {
                if (!this.isTracking) return;
                
                navigator.geolocation.getCurrentPosition(
                    (pos) => this._handlePosition(pos),
                    (err) => this.onError && this.onError(err),
                    geoOptions
                );
                
                // Meno query = meno batteria
                this.timeoutId = setTimeout(pollPosition, 5000); 
            };
            pollPosition();
        } else {
            // Constant watching approach (High Accuracy Mode)
            this.watchId = navigator.geolocation.watchPosition(
                (pos) => this._handlePosition(pos),
                (err) => {
                    if(this.onError) this.onError(err);
                },
                geoOptions
            );
        }
    }

    _handlePosition(position) {
        const { latitude, longitude, speed } = position.coords;
        const timestamp = position.timestamp;
        const newPoint = { lat: latitude, lng: longitude, speed, timestamp };

        if (this.history.length > 0) {
            const lastPoint = this.history[this.history.length - 1];
            
            // Calcola velocità in m/s se non fornita nativamente (spesso 'speed' è null)
            const timeDiffSec = (timestamp - lastPoint.timestamp) / 1000;
            const distMeters = this._calculateDistance(lastPoint.lat, lastPoint.lng, latitude, longitude);
            
            let currentSpeed = speed !== null ? speed : (timeDiffSec > 0 ? distMeters / timeDiffSec : 0);

            // ANTI-CHEAT: Ignora se la velocità supera il limite
            if (currentSpeed > this.SPEED_LIMIT_MS) {
                console.warn(`[Tracker] Punto saltato (Anti-Cheat): Velocità eccessiva (${(currentSpeed * 3.6).toFixed(1)} km/h)`);
                return;
            }

            this.totalDistanceMeters += distMeters;
            this.currentSpeedMetersPerSecond = currentSpeed;
        } else {
            // Primo punto rilevato, usiamolo solo per start ma la vel=0
            this.currentSpeedMetersPerSecond = speed || 0;
        }

        this.history.push(newPoint);
        
        // Inneschiamo l'evento
        if (this.onLocationUpdate) {
            this.onLocationUpdate({
                latestPoint: newPoint,
                history: this.history,
                totalDistanceKm: (this.totalDistanceMeters / 1000),
                currentSpeedKmh: (this.currentSpeedMetersPerSecond * 3.6)
            });
        }
    }

    _calculateDistance(lat1, lon1, lat2, lon2) {
        // Haversine formula per calcolare metri tra due GeoPoint
        const R = 6371e3; // Raggio della terra in metri
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; 
    }
}
