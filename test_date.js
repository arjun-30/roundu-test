function getAbsoluteIsoTimestamp(dateStr, timeStr) {
  try {
    const parts = timeStr.split(" ");
    const time = parts[0];
    const modifier = parts[1];
    let timeParts = time.split(":");
    let hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    if (modifier === "PM" && hours < 12) {
      hours += 12;
    } else if (modifier === "AM" && hours === 12) {
      hours = 0;
    }

    const dateParts = dateStr.split("-").map(num => parseInt(num, 10));
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2];
    const localDateObj = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    if (isNaN(localDateObj.getTime())) {
      console.log("INVALID DATE");
      return new Date().toISOString();
    }
    return localDateObj.toISOString();
  } catch (err) {
    console.error("ERROR", err);
    return new Date().toISOString();
  }
}

console.log("TEST 1", getAbsoluteIsoTimestamp("2026-06-19", "09:00 AM"));
console.log("TEST 2", getAbsoluteIsoTimestamp("2026-06-19", "10:30 PM"));
