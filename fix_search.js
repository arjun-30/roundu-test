const fs = require('fs');

let content = fs.readFileSync('/tmp/stash_SearchingProviders.tsx', 'utf8');

// 1. Add bookingImages to useApp destructuring
content = content.replace(
    /bookingVoiceNote,\n\s*selectedDate,/,
    `bookingVoiceNote,\n        bookingImages,\n        selectedDate,`
);

// 2. Add images to buildPayload
content = content.replace(
    /voiceNoteUrl: bookingVoiceNoteUrl,\n\s*voiceNote: bookingVoiceNote,\n\s*}\);/,
    `voiceNoteUrl: bookingVoiceNoteUrl,\n            voiceNote: bookingVoiceNote,\n            images: bookingImages || [],\n        });`
);

// 3. Add images to bookingData in handleAcceptQuote
content = content.replace(
    /voice_note_url: bookingVoiceNoteUrl \|\| null,\n\s*paid: false,\n\s*};/,
    `voice_note_url: bookingVoiceNoteUrl || null,\n                paid: false,\n                images: bookingImages || [],\n            };`
);

fs.writeFileSync('client/src/pages/SearchingProviders.tsx', content);
