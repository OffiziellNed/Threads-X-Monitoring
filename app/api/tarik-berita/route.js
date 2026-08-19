import { NextResponse } from 'next/server';

export const revalidate = 0; // Dinamis agar bisa switch sumber kapan saja

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '3', 10);
    const sourceData = searchParams.get('source') || 'google'; // default ke google

    let dynamicIssues = [];

    // ==========================================
    // MESIN 1: GOOGLE NEWS (BERITA NASIONAL)
    // ==========================================
    if (sourceData === 'google') {
      const rssUrl = `https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id`;
      const response = await fetch(rssUrl, { cache: 'no-store' });
      const xmlText = await response.text();
      const items = xmlText.split("<item>");

      const generateStableVolume = (text, hoursMultiplier) => {
        let hash = 0;
        for (let i = 0; i < text.length; i++) { hash = text.charCodeAt(i) + ((hash << 5) - hash); }
        const baseVolume = Math.abs(hash % 50000) + 40000;
        return hoursMultiplier === 12 ? Math.floor(baseVolume * 1.5) : baseVolume;
      };

      for (let i = 1; i < Math.min(40, items.length); i++) {
        const item = items[i];
        const titleMatch = item.match(/<title>(.*?)<\/title>/);
        const sourceMatch = item.match(/<source.*?>(.*?)<\/source>/);
        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);

        if (titleMatch) {
          let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
          rawTitle = rawTitle.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
          
          const sourceName = sourceMatch ? sourceMatch[1] : "Media Nasional";
          const pubDate = dateMatch ? new Date(dateMatch[1]).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : "Baru saja";
          const link = linkMatch ? linkMatch[1] : "#";
          const cleanTitle = rawTitle.split(" - ")[0];

          let kategori = "Sosial";
          const lowerTitle = cleanTitle.toLowerCase();
          if (lowerTitle.includes("hukum") || lowerTitle.includes("korupsi") || lowerTitle.includes("polisi") || lowerTitle.includes("uu") || lowerTitle.includes("sidang")) kategori = "Hukum";
          else if (lowerTitle.includes("pemerintah") || lowerTitle.includes("menteri") || lowerTitle.includes("apbn") || lowerTitle.includes("jokowi")) kategori = "Pemerintahan";
          else if (lowerTitle.includes("politik") || lowerTitle.includes("pemilu") || lowerTitle.includes("prabowo") || lowerTitle.includes("dpr") || lowerTitle.includes("partai")) kategori = "Politik";

          dynamicIssues.push({
            id: `g-${i}`,
            topik: cleanTitle,
            kategori: kategori,
            volume: generateStableVolume(cleanTitle, hours),
            source: sourceName,
            pubDate: pubDate,
            articleTitle: rawTitle,
            articleDesc: "Informasi mendalam mengenai perkembangan isu ini dari redaksi nasional.",
            sourcesList: [
              { name: `${sourceName} (Artikel Utama)`, url: link },
              { name: `Cari referensi lain terkait di Google`, url: `https://www.google.com/search?q=${encodeURIComponent(cleanTitle)}&tbm=nws` }
            ]
          });
        }
      }
    } 
    // ==========================================
    // MESIN 2: APIFY INSTAGRAM (OPINI KREATOR)
    // ==========================================
    else if (sourceData === 'instagram') {
      const apifyToken = "apify_api_kP2QlhZ9G51RqYWeK1xa1vt2EfxFyc23Udjh";
      const apifyInput = {
        "dataDetailLevel": "basicData",
        "resultsLimit": 15, // Dibatasi dikit biar Vercel nggak timeout
        "skipPinnedPosts": false,
        "username": ["narasinewsroom", "asumsico", "tempodotco", "mojokdotco"] // Kolam akun lo
      };

      const response = await fetch(`https://api.apify.com/v2/acts/apify~instagram-post-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apifyInput)
      });

      if (!response.ok) throw new Error("Gagal menyedot data dari Apify");

      const apifyData = await response.json();

      apifyData.forEach((post, index) => {
        const caption = post.caption || "Tanpa keterangan tulisan.";
        const cleanTitle = caption.split('\n')[0].substring(0, 60) + "..."; 
        
        const sourceName = post.ownerUsername || "Instagram";
        const totalEngagement = (post.likesCount || 0) + (post.commentsCount || 0);
        const link = post.url || "#";
        const pubDate = post.timestamp ? new Date(post.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : "Baru saja";

        let kategori = "Sosial";
        const lowerCaption = caption.toLowerCase();
        if (lowerCaption.includes("hukum") || lowerCaption.includes("korupsi") || lowerCaption.includes("polisi") || lowerCaption.includes("sidang")) kategori = "Hukum";
        else if (lowerCaption.includes("pemerintah") || lowerCaption.includes("menteri") || lowerCaption.includes("ekonomi") || lowerCaption.includes("jokowi")) kategori = "Pemerintahan";
        else if (lowerCaption.includes("politik") || lowerCaption.includes("dpr") || lowerCaption.includes("pilkada")) kategori = "Politik";

        dynamicIssues.push({
          id: `ig-${index}`,
          topik: cleanTitle,
          kategori: kategori,
          volume: totalEngagement,
          source: `IG: @${sourceName}`,
          pubDate: pubDate,
          articleTitle: `Opini Publik via @${sourceName}`,
          articleDesc: caption, // Full caption untuk disedot AI
          sourcesList: [
            { name: `Lihat Postingan Asli @${sourceName}`, url: link },
            { name: `Cari isu ini di Google`, url: `https://www.google.com/search?q=${encodeURIComponent(cleanTitle)}&tbm=nws` }
          ]
        });
      });
    }

    dynamicIssues.sort((a, b) => b.volume - a.volume);
    return NextResponse.json({ success: true, data: dynamicIssues });

  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json({ 
      success: true, 
      data: [{ 
        id: "error-1", topik: "Proses Scraping Sedang Berjalan / Timeout", kategori: "Pemerintahan", volume: 99999, source: "Sistem", pubDate: "Hari ini", 
        articleTitle: "Koneksi ke Scraper Terputus (Timeout Vercel)", 
        articleDesc: "Proses nyedot data dari Instagram memakan waktu terlalu lama. Silakan coba klik tombol refresh lagi atau gunakan database terpisah.",
        sourcesList: [{ name: "Refresh Halaman", url: "#" }]
      }] 
    });
  }
}
