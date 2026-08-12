import { NextResponse } from 'next/server';

// Memaksa Vercel untuk melakukan cache API selama 1 jam (3600 detik)
export const revalidate = 3600;

export async function GET(request) {
  try {
    // Mengambil parameter jam dari frontend (3 atau 12)
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '3', 10);

    const rssUrl = `https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id`;
    
    // Fetch dengan mekanisme revalidate agar data tidak berubah-ubah setiap detik
    const response = await fetch(rssUrl, { next: { revalidate: 3600 } });
    const xmlText = await response.text();

    const items = xmlText.split("<item>");
    let dynamicIssues = [];

    // FUNGSI BARU: Pembuat angka stabil (deterministik) berdasarkan teks judul
    const generateStableVolume = (text, hoursMultiplier) => {
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
      }
      // Membuat rentang angka dasar yang stabil: 40.000 - 90.000
      const baseVolume = Math.abs(hash % 50000) + 40000;
      
      // Jika mode 12 jam, volume dikali 1.5 agar terlihat lebih masif dari 3 jam
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
        
        const source = sourceMatch ? sourceMatch[1] : "Media Nasional";
        const pubDate = dateMatch ? new Date(dateMatch[1]).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : "Baru saja";
        const link = linkMatch ? linkMatch[1] : "#";
        const cleanTitle = rawTitle.split(" - ")[0];

        let kategori = "Sosial";
        const lowerTitle = cleanTitle.toLowerCase();
        
        if (lowerTitle.includes("hukum") || lowerTitle.includes("korupsi") || lowerTitle.includes("polisi") || lowerTitle.includes("uu") || lowerTitle.includes("sidang") || lowerTitle.includes("jaksa") || lowerTitle.includes("hakim") || lowerTitle.includes("kpk") || lowerTitle.includes("tersangka") || lowerTitle.includes("kasus")) {
          kategori = "Hukum";
        } else if (lowerTitle.includes("pemerintah") || lowerTitle.includes("presiden") || lowerTitle.includes("menteri") || lowerTitle.includes("kementerian") || lowerTitle.includes("apbn") || lowerTitle.includes("kebijakan") || lowerTitle.includes("jokowi") || lowerTitle.includes("negara") || lowerTitle.includes("ruu")) {
          kategori = "Pemerintahan";
        } else if (lowerTitle.includes("politik") || lowerTitle.includes("pemilu") || lowerTitle.includes("partai") || lowerTitle.includes("prabowo") || lowerTitle.includes("dpr") || lowerTitle.includes("pilkada") || lowerTitle.includes("gubernur") || lowerTitle.includes("bupati") || lowerTitle.includes("mpr") || lowerTitle.includes("pdip")) {
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
          volume: generateStableVolume(cleanTitle, hours), // Angka ini akan selalu sama untuk judul yang sama
          source: source,
          pubDate: pubDate,
          articleTitle: rawTitle,
          sourcesList: specificSources
        });
      }
    }

    dynamicIssues.sort((a, b) => b.volume - a.volume);

    return NextResponse.json({ success: true, data: dynamicIssues });

  } catch (error) {
    console.error("Live fetch error:", error);
    return NextResponse.json({ success: false, data: [] });
  }
}
