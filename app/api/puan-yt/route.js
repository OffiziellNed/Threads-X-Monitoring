import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function parseRelativeTime(text) {
    const now = new Date();
    if (!text) return now;
    const num = parseInt(text.replace(/[^0-9]/g, '')) || 0;
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('hour') || lowerText.includes('jam')) {
        now.setHours(now.getHours() - num);
    } else if (lowerText.includes('minute') || lowerText.includes('menit')) {
        now.setMinutes(now.getMinutes() - num);
    } else if (lowerText.includes('day') || lowerText.includes('hari')) {
        now.setDate(now.getDate() - num);
    } else if (lowerText.includes('week') || lowerText.includes('minggu')) {
        now.setDate(now.getDate() - (num * 7));
    } else if (lowerText.includes('month') || lowerText.includes('bulan')) {
        now.setMonth(now.getMonth() - num);
    }
    return now;
}

export async function GET() {
  try {
    // 1. Tarik Halaman Pencarian YouTube Aktual (Filter: This Week / EgQIAhAB)
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent('Puan Maharani OR Ketua DPR')}&sp=EgQIAhAB`;
    
    const ytRes = await fetch(searchUrl, { 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        cache: 'no-store' 
    });
    
    const html = await ytRes.text();
    
    // 2. Bongkar Brankas JSON Internal YouTube
    const dataMatch = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
    if (!dataMatch) throw new Error("Gagal ekstrak data YouTube");
    
    const ytData = JSON.parse(dataMatch[1]);
    let rawVideos = [];
    
    const findVideos = (obj) => {
        if (!obj) return;
        if (obj.videoRenderer && obj.videoRenderer.videoId) {
            rawVideos.push(obj.videoRenderer);
        } else if (Array.isArray(obj)) {
            obj.forEach(findVideos);
        } else if (typeof obj === 'object') {
            Object.values(obj).forEach(findVideos);
        }
    };
    findVideos(ytData);

    let strictFilteredVideos = [];
    let seenIds = new Set();

    // 3. FILTERING SUPER KETAT & TARIK VIEW ASLI DARI YOUTUBE
    for (const vid of rawVideos) {
        if (!vid.videoId || seenIds.has(vid.videoId)) continue;

        const title = (vid.title?.runs?.[0]?.text || "");
        const titleLower = title.toLowerCase();

        // VALIDASI: Wajib ada kata "puan" atau "ketua dpr" di judul konten
        if (titleLower.includes("puan") || titleLower.includes("ketua dpr")) {
            
            // Tarik View mentah dari string YouTube (Contoh: "155.705 ditonton" -> 155705)
            const viewText = vid.viewCountText?.simpleText || "";
            const exactViews = parseInt(viewText.replace(/[^0-9]/g, '')) || 0;
            
            // Terapkan Filter View > 1000
            if (exactViews >= 1000) {
                strictFilteredVideos.push({
                    id: vid.videoId,
                    title: title,
                    publishedText: vid.publishedTimeText?.simpleText || "Baru saja",
                    views: exactViews
                });
                seenIds.add(vid.videoId);
            }
        }
    }

    // Ambil 15 teratas yang sudah lolos seleksi ketat
    strictFilteredVideos = strictFilteredVideos.slice(0, 15);

    // 4. FETCH LIKES, DISLIKES, & COMMENTS SECARA INDIVIDU (Pasti Tembus)
    const fetchPromises = strictFilteredVideos.map(async (vid) => {
        let likes = 0;
        let dislikes = 0;
        let comments = 0;
        let finalViews = vid.views; // Prioritaskan View asli dari HTML YouTube

        // A. Tarik Likes & Dislikes via ReturnYouTubeDislike API
        try {
            const rydRes = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${vid.id}`, { cache: 'no-store' });
            if(rydRes.ok) {
                const rydData = await rydRes.json();
                likes = rydData.likes || 0;
                dislikes = rydData.dislikes || 0;
                // Jika view asli gagal terparsing, pakai view dari RYD
                if (finalViews === 0 && rydData.viewCount) finalViews = rydData.viewCount;
            }
        } catch(e) {}

        // B. Tarik Komentar via Lemnoslife (Ditembak satu per satu per video agar tidak error 0)
        try {
            const statRes = await fetch(`https://yt.lemnoslife.com/videos?part=statistics&id=${vid.id}`, { cache: 'no-store' });
            if(statRes.ok) {
                const statData = await statRes.json();
                if(statData.items && statData.items.length > 0) {
                    comments = parseInt(statData.items[0].statistics.commentCount || 0);
                    
                    // Backup proteksi jika like dari RYD gagal
                    if (likes === 0) likes = parseInt(statData.items[0].statistics.likeCount || 0);
                }
            }
        } catch(e) {}

        const pubDate = parseRelativeTime(vid.publishedText);

        return {
          id: vid.id,
          title: vid.title,
          link: `https://www.youtube.com/watch?v=${vid.id}`,
          date: pubDate.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric' }),
          time: pubDate.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute:'2-digit' }) + " WIB",
          views: finalViews,
          likes: likes,
          dislikes: dislikes,
          comments: comments
        };
    });

    let finalData = await Promise.all(fetchPromises);
    
    // Sortir awal berdasarkan View tertinggi
    finalData.sort((a, b) => b.views - a.views);

    return NextResponse.json({ success: true, data: finalData });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
