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
  let videoItems = [];

  try {
    // =========================================================================
    // ENGINE 1: Stealth HTML Scraping (Menembus Anti-Bot & Consent Wall YouTube)
    // Parameter CAI%3D memaksa YouTube mengurutkan dari Upload Terbaru
    // =========================================================================
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent('Puan Maharani Ketua DPR')}&sp=CAI%3D`;
    
    const ytRes = await fetch(searchUrl, { 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Cookie': 'CONSENT=YES+cb.20230101-01-p0.en+FX+478' // Menjebol persetujuan Cookie Eropa/Bot
        },
        cache: 'no-store' 
    });
    
    const html = await ytRes.text();
    
    // Pencarian Regex Fleksibel
    const dataMatch = html.match(/ytInitialData\s*=\s*(\{.+?\});/);
    
    if (dataMatch) {
        const ytData = JSON.parse(dataMatch[1]);
        
        // Pemindai Rekursif: Mencari ID video di mana pun posisinya di dalam JSON
        const findVideos = (obj) => {
            if (!obj) return;
            if (obj.videoRenderer && obj.videoRenderer.videoId) {
                videoItems.push(obj.videoRenderer);
            } else if (Array.isArray(obj)) {
                obj.forEach(findVideos);
            } else if (typeof obj === 'object') {
                Object.values(obj).forEach(findVideos);
            }
        };
        findVideos(ytData);
    }
  } catch (error) {
    console.error("Engine 1 (HTML) Gagal:", error);
  }

  // Filter Strict: Pastikan video benar-benar membahas tokoh
  let filteredItems = [];
  let seenIds = new Set();

  for (const v of videoItems) {
    if (!v || !v.videoId || seenIds.has(v.videoId)) continue;
    const title = (v.title?.runs?.[0]?.text || "").toLowerCase();
    
    if (title.includes("puan") || title.includes("dpr") || title.includes("pdip") || title.includes("megawati")) {
        filteredItems.push({
            id: v.videoId,
            title: v.title?.runs?.[0]?.text || "Tanpa Judul",
            timeText: v.publishedTimeText?.simpleText || "Baru saja",
            views: parseInt(v.viewCountText?.simpleText?.replace(/[^0-9]/g, '') || 0)
        });
        seenIds.add(v.videoId);
    }
  }

  // =========================================================================
  // ENGINE 2: Fallback Invidious API (Jika Engine 1 Diblokir IP-nya)
  // =========================================================================
  if (filteredItems.length === 0) {
    try {
        const invRes = await fetch(`https://invidious.jing.rocks/api/v1/search?q=puan+maharani+ketua+dpr&sort=date`, { cache: 'no-store' });
        if (invRes.ok) {
            const invData = await invRes.json();
            invData.forEach(v => {
                if (v.type === "video" && !seenIds.has(v.videoId)) {
                    filteredItems.push({
                        id: v.videoId,
                        title: v.title,
                        timeText: v.publishedText || "Baru saja",
                        views: v.viewCount || 0
                    });
                    seenIds.add(v.videoId);
                }
            });
        }
    } catch (e) {
         console.error("Engine 2 (Invidious) Gagal:", e);
    }
  }

  // Batasi 15 video teratas agar tarikan ke Lemnoslife API tidak timeout
  filteredItems = filteredItems.slice(0, 15);

  if (filteredItems.length === 0) {
      return NextResponse.json({ success: true, data: [] });
  }

  const videoIds = filteredItems.map(v => v.id).join(',');

  // =========================================================================
  // BATCH FETCHING METRIK (Lemnoslife untuk Komentar/View/Like massal)
  // =========================================================================
  let statsData = {};
  try {
      const statRes = await fetch(`https://yt.lemnoslife.com/videos?part=statistics&id=${videoIds}`, { cache: 'no-store' });
      if (statRes.ok) {
          const statJson = await statRes.json();
          if (statJson.items) {
              statJson.items.forEach(item => {
                  statsData[item.id] = {
                      views: parseInt(item.statistics.viewCount || 0),
                      likes: parseInt(item.statistics.likeCount || 0),
                      comments: parseInt(item.statistics.commentCount || 0)
                  };
              });
          }
      }
  } catch (e) {}

  // =========================================================================
  // CROSS-CHECK INDIVIDU (ReturnYouTubeDislike untuk Dislike & Backup Metrik)
  // =========================================================================
  const fetchPromises = filteredItems.map(async (vid) => {
      const pubDate = parseRelativeTime(vid.timeText);
      
      let views = statsData[vid.id]?.views || vid.views || 0;
      let likes = statsData[vid.id]?.likes || 0;
      let comments = statsData[vid.id]?.comments || 0;
      let dislikes = 0;

      try {
          const rydRes = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${vid.id}`, { cache: 'no-store' });
          if (rydRes.ok) {
              const rydData = await rydRes.json();
              dislikes = rydData.dislikes || 0;
              if (views === 0) views = rydData.viewCount || views;
              if (likes === 0) likes = rydData.likes || likes;
          }
      } catch(e) {}

      return {
        id: vid.id,
        title: vid.title,
        link: `https://www.youtube.com/watch?v=${vid.id}`,
        date: pubDate.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric' }),
        time: pubDate.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute:'2-digit' }) + " WIB",
        views: views,
        likes: likes,
        dislikes: dislikes,
        comments: comments
      };
  });

  let realVideos = (await Promise.all(fetchPromises));

  return NextResponse.json({ 
    success: true, 
    data: realVideos
  });
}
