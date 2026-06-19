function getDistanceKm(l1, l2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((l2.lat - l1.lat) * Math.PI) / 180;
  const dLng = ((l2.lng - l1.lng) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((l1.lat * Math.PI) / 180) *
      Math.cos((l2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

console.log(getDistanceKm({lat: 13.0827, lng: 80.2707}, {lat: 13.0827, lng: 80.2707}));
console.log(getDistanceKm({lat: 13.0827, lng: 80.2707}, {lat: 13.0827, lng: 80.2807}));
