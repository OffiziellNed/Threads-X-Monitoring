import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STOP_WORDS = ['yang', 'untuk', 'pada', 'dari', 'dengan', 'dalam', 'dan', 'ini', 'itu', 'oleh', 'akan', 'bisa', 'telah', 'tidak', 'sebagai', 'karena', 'jadi', 'bagi', 'atau', 'saat'];
const IGNORE_WORDS = ['pdip', 'pdi', 'perjuangan', 'megawati', 'soekarnoputri', 'hasto', 'ganjar', 'puan'];

function getRealVolume(title, allTitles) {
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const coreWords = words.filter(w => w.length > 3 && !STOP_WORDS.includes(w) && !IGNORE_WORDS.includes(w));
  if (coreWords.length === 0) return 1;
  let count = 0;
  allTitles.forEach(t => { 
    if (coreWords.some(cw => {
      const regex = new RegExp(`\\b${cw}\\b`);
      return regex.test(t.toLowerCase());
    })) count++; 
  });
  return count;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '12', 10);
    const mode = searchParams.get('mode') || 'volume'; 
    
    const timeFilter = `when:${hours}h`;
    const query = encodeURIComponent(`"PDI Perjuangan" OR PDIP OR "Megawati Soekarnoputri" OR Hasto OR Ganjar ${timeFilter}`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;

    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();
    const items = xmlText.split("<item>");
    
    let rawItems = [];
    let allTitles = [];
    const pdipKeywords = ['pdip', 'pdi perjuangan', 'pdi-p', 'megawati', 'hasto', 'ganjar', 'pramono', 'puan'];
    const now = new Date();

    for (let i = 1; i < items.length; i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);
      const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      
      if (titleMatch && dateMatch) {
        const articleDate = new Date(dateMatch[1]);
        const diffHours = (now - articleDate) / (1000 * 60 * 60);
        if (diffHours > hours) continue; 

        let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        const cleanTitle = rawTitle.split(" - ")[0];
        const lowerTitle = cleanTitle.toLowerCase();

        if (lowerTitle.includes('voli') || lowerTitle.includes('hangestri') || lowerTitle.includes('red sparks')) continue; 
        if (!pdipKeywords.some(kw => lowerTitle.includes(kw))) continue;

        allTitles.push(cleanTitle);

        let pureDesc = "Tidak ada deskripsi rinci.";
        if (descMatch) {
          let rawDesc = descMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
          rawDesc = rawDesc.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
          pureDesc = rawDesc.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        }

        const sourceMatch = item.match(/<source.*?>([\s\S]*?)<\/source>/);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
        const sourceName = sourceMatch ? sourceMatch[1] : "Media Nasional";
        const link = linkMatch ? linkMatch[1] : "#";
        const pubDate = articleDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' });

        const textToAnalyze = (cleanTitle + " " + pureDesc).toLowerCase();
        let kategori = "Sosial"; 

        if (textToAnalyze.match(/\b(olahraga|atlet|liga|bola|sepak bola|timnas|juara|badminton|motogp|f1|kompetisi|kebugaran|skor|klasemen|olimpiade|medali|pssi|premier league|manchester united|hull city|pertandingan|turnamen|klub|pemain|pelatih)\b/)) { kategori = "Olahraga"; }
        else if (textToAnalyze.match(/\b(bencana|gempa|banjir|tsunami|longsor|kebakaran|karhutla|erupsi|meletus|kecelakaan|evakuasi|tim sar|bnpb|bpbd|darurat|kegawatdaruratan|cuaca ekstrem|badai|topan|basarnas|penyelamatan)\b/)) { kategori = "Bencana"; }
        else if (textToAnalyze.match(/\b(entertainment|artis|selebritas|seleb|figur publik|konser|film|drama|musik|bioskop|pop|showbiz|karya seni|rekreasi|hiburan|gosip|sinetron|sutradara|aktor|aktris)\b/)) { kategori = "Entertainment"; }
        else if (textToAnalyze.match(/\b(finansial|keuangan|ekonomi|saham|ihsg|inflasi|suku bunga|bi rate|nilai tukar|rupiah|kripto|crypto|laporan keuangan|startup|investasi|ekspor|impor|e-wallet|pembayaran digital|bank indonesia|ojk|otoritas jasa keuangan|ceo|direktur|investor|pialang|pengusaha|ritel|korporat|korporasi|perusahaan|perbankan|bank|bursa|bisnis|makro|mikro)\b/)) { kategori = "Finansial"; }
        else if (textToAnalyze.match(/\b(teknologi|inovasi|gadget|smartphone|software|internet|digital|sains|siber|perangkat lunak|ai|artificial intelligence|kecerdasan buatan|aplikasi)\b/)) { kategori = "Teknologi"; }
        else if (textToAnalyze.match(/\b(hukum|korupsi|polisi|kpk|pidana|perdata|tersangka|peradilan|sidang|hakim|jaksa|vonis|penjara|penegakan|pelanggaran|kriminal|pemerasan|gratifikasi|bareskrim|polri|polda|polres|mahkamah|konstitusi|mk|ky|kejaksaan)\b/)) { kategori = "Hukum"; }
        else if (textToAnalyze.match(/\b(politik|partai|pdip|kekuasaan|ideologi|elit|survei|elektabilitas|manuver|deklarasi|deklarasikan|pemilu|pilkada|dpr|koalisi|oposisi|pwnu|muktamar|kampanye|kpu|bawaslu|demokrasi|parlemen|caleg|cagub|cabup|cawalkot|perang|diplomasi internasional)\b/)) { kategori = "Politik"; }
        else if (textToAnalyze.match(/\b(pemerintah|presiden|menteri|birokrasi|pelayanan publik|anggaran|program kerja|tata kota|infrastruktur|pajak|diplomasi|subsidi|kementerian|pemda|apbn|apbd|negara|kebijakan|diplomat|perpres|keppres|kemenkeu|kemendagri)\b/)) { kategori = "Pemerintahan"; }

        rawItems.push({
          topik: cleanTitle,
          kategori: kategori,
          source: sourceName,
          pubDate: pubDate,
          timestamp: articleDate.getTime(),
          articleTitle: rawTitle,
          articleDesc: pureDesc,
          sourcesList: [{ name: `${sourceName} (Artikel Utama)`, url: link }]
        });
      }
    }

    let dynamicIssues = [];
    let seenTopics = new Set();

    if (mode === 'terkini') {
        rawItems.sort((a, b) => b.timestamp - a.timestamp);
        rawItems.forEach((item, index) => {
          const mainKeyword = item.topik.substring(0, 20).toLowerCase();
          if (!seenTopics.has(mainKeyword)) {
            seenTopics.add(mainKeyword);
            dynamicIssues.push({ id: `pdip-${index}`, ...item, volume: 0 });
          }
        });
    } else {
        rawItems.forEach((item, index) => {
          const volumeData = getRealVolume(item.topik, allTitles);
          const mainKeyword = item.topik.substring(0, 15).toLowerCase();
          if (!seenTopics.has(mainKeyword)) {
            seenTopics.add(mainKeyword);
            dynamicIssues.push({ id: `pdip-${index}`, ...item, volume: volumeData });
          }
        });
        dynamicIssues.sort((a, b) => b.volume - a.volume);
    }
    
    if (dynamicIssues.length === 0) {
      dynamicIssues.push({ id: "pdip-empty", topik: `Tidak ada berita PDI Perjuangan dalam ${hours} jam terakhir.`, kategori: "Politik", volume: 0, source: "Sistem", pubDate: "Saat ini", articleTitle: "Radar Sepi", articleDesc: "Tidak ada pemberitaan.", sourcesList: [] });
    }

    return NextResponse.json({ success: true, data: dynamicIssues.slice(0, 20) });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
