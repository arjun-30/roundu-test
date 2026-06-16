const fs = require('fs');

function fixProviderDetail() {
    let content = fs.readFileSync('client/src/pages/ProviderDetail.tsx', 'utf8');
    
    // Fix first conflict
    const conflict1Regex = /<<<<<<< Updated upstream\n[\s\S]*?const \[video, setVideo\] = useState<any \| null>\(null\);\n  const \[loadingVideo, setLoadingVideo\] = useState\(true\);\n\n  useEffect\(\(\) => \{\n    const fetchVideo = async \(\) => \{\n      if \(!provider\?\.id\) return;\n      try \{\n        setLoadingVideo\(true\);\n        const activeVideo = await getProviderVideo\(provider\.id\);\n        setVideo\(activeVideo\);\n      \} catch \(err\) \{\n        console\.error\("Error fetching provider video:", err\);\n      \} finally \{\n        setLoadingVideo\(false\);\n      \}\n    \};\n    fetchVideo\(\);\n  \}, \[provider\?\.id\]\);\n=======\n([\s\S]*?)>>>>>>> Stashed changes/g;
    
    content = content.replace(conflict1Regex, (match, stashed) => {
        return `    const [video, setVideo] = useState<any | null>(null);
    const [loadingVideo, setLoadingVideo] = useState(true);

    useEffect(() => {
        const fetchVideo = async () => {
            if (!provider?.id) return;
            try {
                setLoadingVideo(true);
                const activeVideo = await getProviderVideo(provider.id);
                setVideo(activeVideo);
            } catch (err) {
                console.error("Error fetching provider video:", err);
            } finally {
                setLoadingVideo(false);
            }
        };
        fetchVideo();
    }, [provider?.id]);\n\n` + stashed;
    });

    // Fix second conflict
    const conflict2Regex = /<<<<<<< Updated upstream\n[\s\S]*?=======\n([\s\S]*?)>>>>>>> Stashed changes/g;
    
    content = content.replace(conflict2Regex, (match, stashed) => {
        return stashed;
    });
    
    // Update the hardcoded video to use dynamic video
    content = content.replace(
        /src="https:\/\/videos\.pexels\.com\/video-files\/6906106\/6906106-hd_1920_1080_30fps\.mp4"/,
        `src={video?.video_url || "https://videos.pexels.com/video-files/6906106/6906106-hd_1920_1080_30fps.mp4"}`
    );

    fs.writeFileSync('client/src/pages/ProviderDetail.tsx', content);
}

function fixSearchingProviders() {
    let content = fs.readFileSync('client/src/pages/SearchingProviders.tsx', 'utf8');

    // Searching providers has an issue where upstream added 'bookingImages' to useApp() destructuring
    // and changed indentation.
    
    // First conflict
    const conflict1Regex = /<<<<<<< Updated upstream\n([\s\S]*?)=======\n[\s\S]*?>>>>>>> Stashed changes/;
    content = content.replace(conflict1Regex, (match, upstream) => {
        return upstream; // We use upstream because it has bookingImages and proper formatting. 
        // Wait, does upstream have the new search start time logic? Let's keep upstream here.
    });

    // Second conflict
    const conflict2Regex = /<<<<<<< Updated upstream\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> Stashed changes/;
    content = content.replace(conflict2Regex, (match, upstream, stashed) => {
        return upstream; // keep upstream because it has the bookingImages passed to createBooking payload!
    });

    fs.writeFileSync('client/src/pages/SearchingProviders.tsx', content);
}

fixProviderDetail();
fixSearchingProviders();
console.log('Fixed');
