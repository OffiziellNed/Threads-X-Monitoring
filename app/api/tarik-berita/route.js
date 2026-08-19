import { NextResponse } from 'next/server';

export const revalidate = 0; // Dinamis

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '3', 10);
    // Menangkap parameter dari frontend: 'general' atau 'pdip'
    const topic = searchParams.get('topic') || 'general';

    // Default: Topik Umum Nasional
    let rssUrl = `https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id`;
    
    // Jika frontend meminta topik PDIP, kita rubah URL RSS-nya ke mode pencarian mendalam
    if (topic === 'pdip') {
      // Menyedot dari seluruh portal berita + gesuri.id untuk segala hal tentang PDIP
      const query = encodeURIComponent(`"PDI Perjuangan" OR PDIP OR Megawati OR Hasto OR Ganjar OR site:gesuri.id`);
      rssUrl = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;
    }

    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();
    const items = xmlText.split("<item>");
    let dynamicIssues = [];

    // Fungsi pembuat volume stabil yang dikalikan dengan parameter jam (3 atau 12)
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

        // Klasifikasi Kategori
        let kategori = "Sosial";
        const lowerTitle = cleanTitle.toLowerCase();
        
        if (topic === 'pdip') {
          // Berita tentang PDIP akan di-default ke Politik, dan disaring jika ada unsur hukum/pemerintahan
          kategori = "Politik"; 
          if (lowerTitle.includes("hukum") || lowerTitle.includes("kpk") || lowerTitle.includes("korupsi") || lowerTitle.includes("polisi") || lowerTitle.includes("sidang") || lowerTitle.includes("tersangka")) kategori = "Hukum";
          else if (lowerTitle.includes("pemerintah") || lowerTitle.includes("menteri") || lowerTitle.includes("kebijakan") || lowerTitle.includes("jokowi")) kategori = "Pemerintahan";
        } else {
          // Klasifikasi untuk berita umum
          if (lowerTitle.includes("hukum") || lowerTitle.includes("korupsi") || lowerTitle.includes("polisi") || lowerTitle.includes("uu") || lowerTitle.includes("sidang") || lowerTitle.includes("jaksa") || lowerTitle.includes("hakim") || lowerTitle.includes("kpk") || lowerTitle.includes("tersangka") || lowerTitle.includes("kasus")) kategori = "Hukum";
          else if (lowerTitle.includes("pemerintah") || lowerTitle.includes("presiden") || lowerTitle.includes("menteri") || lowerTitle.includes("kementerian") || lowerTitle.includes("apbn") || lowerTitle.includes("kebijakan") || lowerTitle.includes("jokowi") || lowerTitle.includes("negara") || lowerTitle.includes("ruu")) kategori = "Pemerintahan";
          else if (lowerTitle.includes("politik") || lowerTitle.includes("pemilu") || lowerTitle.includes("partai") || lowerTitle.includes("prabowo") || lowerTitle.includes("dpr") || lowerTitle.includes("pilkada") || lowerTitle.includes("gubernur") || lowerTitle.includes("bupati") || lowerTitle.includes("mpr") || lowerTitle.includes("pdip")) kategori = "Politik";
        }

        dynamicIssues.push({
          id: `${topic}-${i}`,
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
      }
    }
    
    // Sortir dari Volume (Engagement) tertinggi ke terendah
    dynamicIssues.sort((a, b) => b.volume - a.volume);
    return NextResponse.json({ success: true, data: dynamicIssues });

  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json({ success: false, data: [] });
  }
}
