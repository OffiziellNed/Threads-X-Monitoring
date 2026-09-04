import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 4 Proxy Server Invidious untuk memastikan server tidak pernah diblokir YouTube
const INVIDIOUS_INSTANCES = [
    'https://invidious.jing.rocks',
    'https://invidious.nerdvpn.de',
    'https://inv.tux.pizza',
    'https://invidious.fdn.fr'
];

// Daftar Akun VIP yang wajib dilacak di Mode KOL
const TARGET_KOLS = [
    "total politik", "akbar faizal", "ferry irwandi", "tempo", "detik", 
    "antara", "hendri satrio", "hensa", "sisi gelap", "keset politik", "tribunnews", "tribun"
];

function parseRelativeTime(text) {
    const now = new Date();
    if(!text) return now;
    const n = parseInt(text.replace(/[^0-9]/g, '')) || 1;
    if(text.includes('hour') || text.includes('jam')) now.setHours(now.getHours() - n);
    else if(text.includes('minute') || text.includes('menit')) now.setMinutes(now.getMinutes() - n);
    else if(text.includes('day') || text.includes('hari')) now.setDate(now.getDate() - n);
    else if(text.includes('week') || text.includes('minggu')) now.setDate(now.getDate() - (n*7));
    return now;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'umum'; 

  let rawVideos = [];
  let successFetch = false;

  // 1. Tarik Data Pencarian via Invidious (Filter: 1 Minggu Terakhir)
  for (const instance of INVIDIOUS_INSTANCES) {
      try {
          const url1 = `${instance}/api/v1/search?q=puan+maharani+OR+ketua+dpr&sort=date&date=week&page=1`;
          const url2 = `${instance}/api/v1/search?q=puan+maharani+OR+ketua+dpr&sort=date&date=week&page=2`;
          
          const [res1, res2] = await Promise.all([
              fetch(url1, { cache: 'no-store' }),
              fetch(url2, { cache: 'no-store' })
          ]);

          if (res1.ok && res2.ok) {
              const data1 = await res1.json();
              const data2 = await res2.json();
              rawVideos = [...data1, ...data2];
              successFetch = true;
              break; 
          }
      } catch (e) {
          console.log("Instance sibuk, pindah ke proxy lain...");
      }
  }

  // Fallback Darurat jika Invidious Server Down (Memakai HTML Scrape)
  if (!successFetch || rawVideos.length === 0) {
      try {
         const ytRes = await fetch(`https://www.youtube.com/results?search_query=puan+maharani+OR+ketua+dpr&sp=EgQIAhAB`, {
             headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store'
         });
         const html = await ytRes.text();
         const match = html.match(/var ytInitialData = (\{.*?\});/);
         if(match) {
             const ytData = JSON.parse(match[1]);
             const findVids = (obj) => {
                if(!obj) return;
                if(obj.videoRenderer && obj.videoRenderer.videoId) {
                    rawVideos.push({
                        videoId: obj.videoRenderer.videoId,
                        title: obj.videoRenderer.title?.runs?.[0]?.text || "",
                        author: obj.videoRenderer.ownerText?.runs?.[0]?.text || "",
                        publishedText: obj.videoRenderer.publishedTimeText?.simpleText || "",
                        viewCount: parseInt(obj.videoRenderer.viewCountText?.simpleText?.replace(/[^0-9]/g, '') || 0)
                    });
                } else if(typeof obj === 'object') Object.values(obj).forEach(findVids);
             };
             findVids(ytData);
         }
      } catch(e) {}
  }

  // 2. Filter Silang & Verifikasi Topik
  let filteredVideos = [];
  let seenIds = new Set();

  for (const v of rawVideos) {
      if (!v.videoId || seenIds.has(v.videoId)) continue;
      
      const title = (v.title || "").toLowerCase();
      const author = (v.author || "").toLowerCase();
      
      // Validasi ketat: Judul wajib menyebutkan entitas
      const isRelevant = title.includes("puan") || title.includes("ketua dpr");

      if (isRelevant) {
          const views = v.viewCount || 0;
          
          if (mode === 'kol') {
              // Mode KOL: Tarik data asal dari channel Target VIP
              const isKOL = TARGET_KOLS.some(k => author.includes(k));
              if (isKOL) {
                  filteredVideos.push(v);
                  seenIds.add(v.videoId);
              }
          } else {
              // Mode Umum: Buang video receh di bawah 1000 Views
              if (views >= 1000) {
                  filteredVideos.push(v);
                  seenIds.add(v.videoId);
              }
          }
      }
  }

  // Ambil 15 Teratas saja agar fetch Likes/Dislikes tidak RTO (Timeout)
  filteredVideos = filteredVideos.slice(0, 15);
  
  // 3. Tarik API Sentimen Mentah (Views Actual, Likes, Dislikes)
  const results = await Promise.all(filteredVideos.map(async (v) => {
      let exactViews = v.viewCount || 0;
      let likes = 0;
      let dislikes = 0;

      try {
          const rydRes = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${v.videoId}`, { cache: 'no-store' });
          if (rydRes.ok) {
              const rydData = await rydRes.json();
              exactViews = rydData.viewCount || exactViews; // Update ke view terkini
              likes = rydData.likes || 0;
              dislikes = rydData.dislikes || 0;
          }
      } catch(e) {}

      const pubDate = parseRelativeTime(v.publishedText);

      return {
          id: v.videoId,
          title: v.title,
          author: v.author || "YouTube Account",
          link: `https://www.youtube.com/watch?v=${v.videoId}`,
          date: pubDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
          time: pubDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }),
          views: exactViews,
          likes: likes,
          dislikes: dislikes
      };
  }));

  // Urutkan default dari tayangan (views) terbesar
  results.sort((a, b) => b.views - a.views);

  return NextResponse.json({ success: true, data: results });
}
