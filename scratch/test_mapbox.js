const MAPBOX_TOKEN = "pk.eyJ1IjoiYXJqdW5ycjIwMDQiLCJhIjoiY21vajRwNm9rMDh3cTJvczZzdjVrODZ4YyJ9.JjxOS6rhRcDOArX70f0RQg";
const lat = 12.9716;
const lng = 77.5946;
const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`;

console.log("Request URL:", url);

fetch(url)
  .then(res => {
    console.log("HTTP Status:", res.status);
    return res.json();
  })
  .then(data => {
    console.log("Response Data:", JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error("Network Error:", err);
  });
