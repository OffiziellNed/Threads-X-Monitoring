import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Kumpulan Proxy Alternatif kalau server utama memblokir IP kita
const INVIDIOUS_INSTANCES = [
    'https://invidious.jing.rocks',
    'https://inv.tux.pizza',
    'https://invidious.nerdvpn.de',
    'https://invidious.weblibre.org'
];

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
    // 1. Tarik Halaman Pencarian YouTube (Filter: This Week / EgQIAhAB)
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent('Puan Maharani OR Ketua DPR')}&sp=EgQIAhAB`;
    
    const ytRes = await fetch(searchUrl, { 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cookie': 'CONSENT=YES+cb.20230101-01-p0.en+FX+478'
        },
        cache: 'no-store' 
    });
    
    const html = await ytRes.text();
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

    // 2. FILTERING SUPER KETAT & VIEW ASLI DARI YOUTUBE
    for (const vid of rawVideos) {
        if (!vid.videoId || seenIds.has(vid.videoId)) continue;

        const title = (vid.title?.runs?.[0]?.text || "");
        const titleLower = title.toLowerCase();

        // Validasi Wajib: Topik tokoh
        if (titleLower.includes("puan") || titleLower.includes("ketua dpr")) {
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

    // Dibatasi 10 agar request API pihak ketiga tidak di-ban/timeout
    strictFilteredVideos = strictFilteredVideos.slice(0, 10);

    // 3. FETCH METRIK MENDALAM DENGAN SISTEM FALLBACK ANTI-GAGAL
    const fetchPromises = strictFilteredVideos.map(async (vid) => {
        let likes = 0;
        let dislikes = 0;
        let comments = 0;
        let finalViews = vid.views;

        // A. Tarik Likes & Dislikes (RYD)
        try {
            const rydRes = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${vid.id}`, { cache: 'no-store' });
            if(rydRes.ok) {
                const rydData = await rydRes.json();
                likes = rydData.likes || 0;
                dislikes = rydData.dislikes || 0;
            }
        } catch(e) {}

        // B. Tarik Komentar (Lemnoslife Utama)
        try {
            const statRes = await fetch(`https://yt.lemnoslife.com/videos?part=statistics&id=${vid.id}`, { cache: 'no-store' });
            if(statRes.ok) {
                const statData = await statRes.json();
                if(statData.items && statData.items.length > 0) {
                    comments = parseInt(statData.items[0].statistics.commentCount || 0);
                    if (likes === 0) likes = parseInt(statData.items[0].statistics.likeCount || 0);
                }
            }
        } catch(e) {}

        // C. FALLBACK: JIKA LEMNOSLIFE DIBLOKIR/0, PAKAI PROXY INVIDIOUS
        // Ini kunci biar data komentar nggak mungkin kosong
        if (comments === 0) {
            for (let instance of INVIDIOUS_INSTANCES) {
                try {
                    const invRes = await fetch(`${instance}/api/v1/videos/${vid.id}?fields=commentCount,likeCount`, { cache: 'no-store' });
                    if (invRes.ok) {
                        const invData = await invRes.json();
                        if (invData.commentCount !== undefined && invData.commentCount !== null) {
                            comments = invData.commentCount;
                            if (likes === 0) likes = invData.likeCount || 0;
                            break; // Stop looping kalau sukses dapat data
                        }
                    }
                } catch(e) {}
            }
        }

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
