/**
 * Interroga la Overpass API per trovare i nomi delle strade in base alle coordinate.
 * Dato il ritmo elevato del GPS e le policy di rate limit di Overpass, 
 * questa funzione dovrebbe essere chiamata solo ogni Tot metri o a fine sessione.
 */

export async function fetchStreetName(lat, lng) {
    // Raggio di ricerca (es. 15 metri) per trovare l'highway (strada) più vicina.
    const query = `
        [out:json];
        way(around:15, ${lat}, ${lng})["highway"]["name"];
        out body 1;
    `;
    
    try {
        const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
        
        if (!response.ok) {
            console.warn("Overpass API non raggiungibile o rate-limited");
            return null;
        }
        
        const data = await response.json();
        
        if (data.elements && data.elements.length > 0) {
            return data.elements[0].tags.name;
        }
        return null;
        
    } catch (error) {
        console.error("Errore fetch Overpass API:", error);
        return null;
    }
}
