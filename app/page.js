import { NextResponse } from 'next/server';

export const revalidate = 0; // Dinamis

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '3', 10);
    const topic = searchParams.get('topic') || 'general';

    let rssUrl = `https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id`;
    
    // JIKA MODE PDIP: Kita paksa pencarian spesifik + Filter Waktu Google (when:3h atau when:12h)
    if (topic === 'pdip') {
      const timeFilter = hours === 3 ? 'when:3h' : 'when:12h';
      const query = encodeURIComponent(`PDIP OR "PDI Perjuangan" OR Megawati OR Hasto OR Ganjar ${timeFilter}`);
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

    // Daftar Kata Kunci WAJIB untuk mode PDIP
    const pdipKeywords = ['pdip', 'pdi perjuangan', 'megawati', 'hasto', 'ganjar', 'pramono', 'banteng', 'gesuri', 'kader'];

    // Looping kita perbanyak sampai 60 untuk jaga-jaga banyak berita yang dibuang
    for (let i = 1; i < Math.min(60, items.length); i++) {
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

        // ==================================================
        // STRICT FILTER: BUANG BERITA YANG GAK ADA HUBUNGANNYA
        // ==================================================
        if (topic === 'pdip') {
          // Ngecek apakah di judul ada unsur kata kunci PDIP
          const isRelevant = pdipKeywords.some(kw => lowerTitle.includes(kw));
          
          // Kalau nggak relevan (misal berita demo umum/harga HP), langsung SKIP!
          if (!isRelevant) {
            continue; 
          }
        }

        // Klasifikasi Kategori
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

        // Karena difilter ketat, kita batasi hasil akhirnya 20 berita valid saja biar cepat
        if (dynamicIssues.length >= 20) break;
      }
    }
    
    // Sortir dari Volume tertinggi ke terendah
    dynamicIssues.sort((a, b) => b.volume - a.volume);
    
    // Jika tidak ada berita PDIP sama sekali di jam tersebut
    if (topic === 'pdip' && dynamicIssues.length === 0) {
      dynamicIssues.push({
        id: "pdip-empty", topik: `Belum ada berita signifikan seputar PDIP dalam ${hours} jam terakhir.`, kategori: "Politik", volume: 0, source: "Sistem", pubDate: "Saat ini", articleTitle: "Radar Sepi", articleDesc: "Tidak ditemukan berita.", sourcesList: []
      });
    }

    return NextResponse.json({ success: true, data: dynamicIssues });

  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json({ success: false, data: [] });
  }
}
