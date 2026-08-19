import { NextResponse } from 'next/server';

// OPSI NUKLIR: Menggunakan POST agar Vercel 100% TIDAK BISA nge-cache respons ini.
export async function POST(request) {
  try {
    const body = await request.json();
    const hours = body.hours || 3;
    const topic = body.topic || 'general';

    let rssUrl = `https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id`;
    
    // Minta spesifik ke Google News
    if (topic === 'pdip') {
      const timeFilter = hours === 3 ? 'when:3h' : 'when:12h';
      const query = encodeURIComponent(`"PDI Perjuangan" OR PDIP OR Megawati OR Hasto OR Ganjar ${timeFilter}`);
      rssUrl = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;
    }

    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();
    const items = xmlText.split("<item>");
    let dynamicIssues = [];

    const generateStableVolume = (text, hoursMultiplier) => {
      let hash = 0;
      for (let i = 0; i < text.length; i++) { hash = text.charCodeAt(i) + ((hash << 5) - hash); }
      const baseVolume = Math.abs(hash % 50000) + 40000;
      return hoursMultiplier === 12 ? Math.floor(baseVolume * 1.5) : baseVolume;
    };

    // DAFTAR KATA KUNCI PDIP (Filter Tembok Baja)
    const pdipKeywords = ['pdip', 'pdi perjuangan', 'megawati', 'hasto', 'ganjar', 'pramono', 'banteng', 'gesuri', 'kader'];

    for (let i = 1; i < items.length; i++) {
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
        const lowerTitle = cleanTitle.toLowerCase();

        // =========================================================
        // JIKA MODE PDIP: NGGAK ADA KATA KUNCI PDIP = LANGSUNG BUANG
        // =========================================================
        if (topic === 'pdip') {
          const isRelevant = pdipKeywords.some(kw => lowerTitle.includes(kw));
          if (!isRelevant) continue; 
        }

        let kategori = "Sosial";
        if (topic === 'pdip') {
          kategori = "Politik"; 
          if (lowerTitle.includes("hukum") || lowerTitle.includes("kpk") || lowerTitle.includes("korupsi") || lowerTitle.includes("polisi") || lowerTitle.includes("sidang") || lowerTitle.includes("tersangka")) kategori = "Hukum";
          else if (lowerTitle.includes("pemerintah") || lowerTitle.includes("menteri") || lowerTitle.includes("kebijakan") || lowerTitle.includes("jokowi")) kategori = "Pemerintahan";
        } else {
          if (lowerTitle.includes("hukum") || lowerTitle.includes("korupsi") || lowerTitle.includes("polisi") || lowerTitle.includes("uu") || lowerTitle.includes("sidang") || lowerTitle.includes("jaksa") || lowerTitle.includes("kpk") || lowerTitle.includes("tersangka")) kategori = "Hukum";
          else if (lowerTitle.includes("pemerintah") || lowerTitle.includes("presiden") || lowerTitle.includes("menteri") || lowerTitle.includes("apbn") || lowerTitle.includes("jokowi") || lowerTitle.includes("ruu")) kategori = "Pemerintahan";
          else if (lowerTitle.includes("politik") || lowerTitle.includes("pemilu") || lowerTitle.includes("partai") || lowerTitle.includes("prabowo") || lowerTitle.includes("dpr") || lowerTitle.includes("pilkada")) kategori = "Politik";
        }

        dynamicIssues.push({
          id: `${topic}-${dynamicIssues.length + 1}`,
          topik: cleanTitle,
          kategori: kategori,
          volume: generateStableVolume(cleanTitle, hours),
          source: sourceName,
          pubDate: pubDate,
          articleTitle: rawTitle,
          articleDesc: `Informasi mendalam dan analisis wacana publik mengenai isu ini dari ${sourceName}.`,
          sourcesList: [
            { name: `${sourceName} (Artikel Utama)`, url: link },
            { name: `Cari referensi isu ini di Google`, url: `https://www.google.com/search?q=${encodeURIComponent(cleanTitle)}&tbm=nws` }
          ]
        });

        if (dynamicIssues.length >= 20) break;
      }
    }
    
    dynamicIssues.sort((a, b) => b.volume - a.volume);
    
    if (topic === 'pdip' && dynamicIssues.length === 0) {
      dynamicIssues.push({
        id: "pdip-empty", 
        topik: `Belum ada pergerakan isu signifikan seputar PDI Perjuangan dalam ${hours} jam terakhir.`, 
        kategori: "Politik", 
        volume: 0, 
        source: "Sistem", 
        pubDate: "Saat ini", 
        articleTitle: "Radar Sepi (Tidak Ada Isu Hype)", 
        articleDesc: "Sistem filter mendeteksi tidak ada berita atau isu viral yang membawa kata kunci PDI Perjuangan pada rentang waktu ini.", 
        sourcesList: []
      });
    }

    return NextResponse.json({ success: true, data: dynamicIssues });

  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json({ success: false, data: [] });
  }
}
