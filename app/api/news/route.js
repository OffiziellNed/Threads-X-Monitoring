import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const rssUrl = `https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id`;
    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();

    const items = xmlText.split("<item>");
    let dynamicIssues = [];

    // Tarik lebih banyak data (sampai 40) supaya pas difilter per kategori isinya tetap banyak
    for (let i = 1; i < Math.min(40, items.length); i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const sourceMatch = item.match(/<source.*?>(.*?)<\/source>/);
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);

      if (titleMatch) {
        let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
        rawTitle = rawTitle.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        
        const source = sourceMatch ? sourceMatch[1] : "Media Nasional";
        const pubDate = dateMatch ? new Date(dateMatch[1]).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : "Baru saja";
        const link = linkMatch ? linkMatch[1] : "#";
        const cleanTitle = rawTitle.split(" - ")[0];

        // Klasifikasi Kategori yang lebih presisi
        let kategori = "Sosial";
        const lowerTitle = cleanTitle.toLowerCase();
        
        if (lowerTitle.includes("hukum") || lowerTitle.includes("korupsi") || lowerTitle.includes("polisi") || lowerTitle.includes("uu") || lowerTitle.includes("sidang") || lowerTitle.includes("jaksa") || lowerTitle.includes("hakim") || lowerTitle.includes("kpk") || lowerTitle.includes("tersangka")) {
          kategori = "Hukum";
        } else if (lowerTitle.includes("pemerintah") || lowerTitle.includes("presiden") || lowerTitle.includes("menteri") || lowerTitle.includes("kementerian") || lowerTitle.includes("apbn") || lowerTitle.includes("kebijakan") || lowerTitle.includes("jokowi")) {
          kategori = "Pemerintahan";
        } else if (lowerTitle.includes("politik") || lowerTitle.includes("pemilu") || lowerTitle.includes("partai") || lowerTitle.includes("prabowo") || lowerTitle.includes("dpr") || lowerTitle.includes("pilkada") || lowerTitle.includes("gubernur") || lowerTitle.includes("bupati") || lowerTitle.includes("mpr")) {
          kategori = "Politik";
        }

        const specificSources = [
          { name: `${source} (Artikel Utama)`, url: link },
          { name: `Cari referensi lain terkait di Google`, url: `https://www.google.com/search?q=${encodeURIComponent(cleanTitle)}&tbm=nws` }
        ];

        dynamicIssues.push({
          id: i,
          topik: cleanTitle,
          kategori: kategori,
          // Bikin simulasi volume yang masuk akal dan acak
          volume: Math.floor(Math.random() * 50000) + 40000,
          source: source,
          pubDate: pubDate,
          articleTitle: rawTitle,
          sourcesList: specificSources
        });
      }
    }

    // Urutkan dari volume tertinggi ke terendah sebelum dikirim ke Frontend
    dynamicIssues.sort((a, b) => b.volume - a.volume);

    return NextResponse.json({ success: true, data: dynamicIssues });

  } catch (error) {
    console.error("Live fetch error:", error);
    return NextResponse.json({ success: false, data: [] });
  }
}
