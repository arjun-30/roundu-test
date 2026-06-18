const MAPBOX_TOKEN = "pk.eyJ1IjoiYXJqdW5ycjIwMDQiLCJhIjoiY21vajRwNm9rMDh3cTJvczZzdjVrODZ4YyJ9.JjxOS6rhRcDOArX70f0RQg";

const coords = [
  { lat: 12.9165, lng: 79.1325, desc: "Vellore Center" },
];

async function run() {
  for (const coord of coords) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coord.lng},${coord.lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    
    const features = data.features || [];
    if (features.length === 0) {
      console.log(`[${coord.desc}] No features found`);
      continue;
    }

    const mainFeature = features[0];
    let parsedArea = "";
    let parsedCity = "";

    if (mainFeature) {
      const context = mainFeature.context || [];
      const getContextField = (prefix) => context.find((c) => c.id.startsWith(prefix))?.text;

      const ctxLocality = getContextField("locality");
      const ctxNeighborhood = getContextField("neighborhood");
      const ctxPlace = getContextField("place");
      const ctxDistrict = getContextField("district");
      const ctxRegion = getContextField("region");
      const fText = mainFeature.text;

      parsedArea = ctxLocality || ctxNeighborhood || ctxPlace || fText || "";
      parsedCity = ctxPlace || ctxDistrict || ctxRegion || "";
    }

    let useFallback = false;
    if (!parsedArea && !parsedCity) {
      useFallback = true;
    }

    let finalArea = parsedArea;
    let finalCity = parsedCity;

    if (finalArea && finalCity && finalArea.toLowerCase() === finalCity.toLowerCase()) {
      finalArea = finalCity;
      finalCity = "";
    }

    let formattedAddress = "";
    if (finalArea && finalCity) {
      formattedAddress = `${finalArea}, ${finalCity}`;
    } else {
      formattedAddress = finalArea || finalCity || "Set Location";
    }

    console.log(`[${coord.desc}] Final Location: ${formattedAddress}`);
  }
}

run();
