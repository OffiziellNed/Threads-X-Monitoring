import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '3', 10);

    const timeFilter = hours === 3 ? 'when:3h' : 'when:12h';
    // Fokus sedot berita yang spesifik menyebutkan Puan
    const query = encodeURIComponent(`"Puan Maharani" ${timeFilter}`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;

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

    const puanKeywords = ['puan', 'puan maharani', 'ketua dpr'];

    for (let i = 1; i < items.length; i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      
      if (titleMatch) {
        let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
        const cleanTitle = rawTitle.split(" - ")[0];
        const lowerTitle = cleanTitle.toLowerCase();

        // Validasi: Wajib ada unsur nama Puan
        const isRelevant = puanKeywords.some(kw => lowerTitle.includes(kw));
        if (!isRelevant) continue;

        const sourceMatch = item.match(/<source.*?>(.*?)<\/source>/);
        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const sourceName = sourceMatch ? sourceMatch[1] : "Media";
        const pubDate = dateMatch ? new Date(dateMatch[1]).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : "Baru saja";
        const link = linkMatch ? linkMatch[1] : "#";

        let kategori = "Politik";
        if (lowerTitle.includes("hukum") || lowerTitle.includes("kpk") || lowerTitle.includes("korupsi")) kategori = "Hukum";

        dynamicIssues.push({
          id: `puan-${dynamicIssues.length + 1}`,
          topik: cleanTitle,
          kategori: kategori,
          volume: generateStableVolume(cleanTitle, hours),
          source: sourceName,
          pubDate: pubDate,
          articleTitle: rawTitle,
          articleDesc: `Informasi analisis isu ini dari ${sourceName}.`,
          sourcesList: [{ name: `${sourceName} (Artikel Utama)`, url: link }]
        });

        if (dynamicIssues.length >= 20) break;
      }
    }

    dynamicIssues.sort((a, b) => b.volume - a.volume);
    
    if (dynamicIssues.length === 0) {
      dynamicIssues.push({ id: "puan-empty", topik: `Belum ada berita Puan Maharani signifikan dalam ${hours} jam terakhir.`, kategori: "Politik", volume: 0, source: "Sistem", pubDate: "Saat ini", articleTitle: "Radar Sepi", articleDesc: "Tidak ditemukan berita yang relevan.", sourcesList: [] });
    }

    return NextResponse.json({ success: true, data: dynamicIssues });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}