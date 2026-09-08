import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STOP_WORDS = ['yang', 'untuk', 'pada', 'dari', 'dengan', 'dalam', 'dan', 'ini', 'itu', 'oleh', 'akan', 'bisa', 'telah', 'tidak', 'sebagai', 'karena', 'jadi', 'bagi', 'atau', 'saat'];

// =========================================================================
// FUNGSI PEMBERSIH URL & FORMAT TANGGAL
// =========================================================================
const cleanUrl = (rawUrl) => {
  if (!rawUrl) return "#";
  try {
    const decodedUrl = rawUrl.replace(/&amp;/g, '&');
    if (decodedUrl.includes("google.com/url")) {
      const urlObj = new URL(decodedUrl);
      const cleanLink = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
      if (cleanLink) return cleanLink; 
    }
    return decodedUrl;
  } catch (error) {
    return rawUrl;
  }
};

const formatPubDate = (pubDateStr) => {
  if (!pubDateStr) return "-";
  try {
    const date = new Date(pubDateStr);
    if (isNaN(date.getTime())) return pubDateStr; 
    const optionsDate = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' };
    const formattedDate = new Intl.DateTimeFormat('id-ID', optionsDate).format(date);
    const formattedTime = new Intl.DateTimeFormat('id-ID', optionsTime).format(date).replace(/\./g, ':');
    return `${formattedDate} pukul ${formattedTime} WIB`;
  } catch (error) {
    return pubDateStr;
  }
};

function getRealVolume(title, allTitles) {
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const coreWords = words.filter(w => w.length > 3 && !STOP_WORDS.includes(w));
  if (coreWords.length === 0) return Math.floor(Math.random() * 5) + 30;

  let count = 0;
  allTitles.forEach(t => {
    const tLower = t.toLowerCase();
    if (coreWords.some(cw => new RegExp(`\\b${cw}\\b`).test(tLower))) count++;
  });
  return (count * 4) + coreWords.length + 25;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '12', 10);
    const mode = searchParams.get('mode') || 'volume'; 
    
    // Berita Nasional Real-time dari Google News Indonesia
    const rssUrl = `https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id`;

    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();
    const items = xmlText.split("<item>");
    
    let rawItems = [];
    let allTitles = [];
    const now = new Date();

    for (let i = 1; i < items.length; i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);
      const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      
      if (titleMatch && dateMatch) {
        const articleDate = new Date(dateMatch[1]);
        const diffHours = (now - articleDate) / (1000 * 60 * 60);
        
        let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        const cleanTitle = rawTitle.split(" - ")[0];
        allTitles.push(cleanTitle);
        
        let pureDesc = "Tidak ada deskripsi rinci.";
        if (descMatch) {
          let rawDesc = descMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
          rawDesc = rawDesc.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
          pureDesc = rawDesc.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        }

        const sourceMatch = item.match(/<source.*?>([\s\S]*?)<\/source>/);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
        
        let rawSource = sourceMatch ? sourceMatch[1] : "Media Nasional";
        let cleanSource = rawSource.split(" - ")[0].split(",")[0].split("|")[0].trim();

        const linkAsli = linkMatch ? cleanUrl(linkMatch[1]) : "#";
        const pubDateRapi = formatPubDate(dateMatch[1]);

        const textToAnalyze = (cleanTitle + " " + pureDesc).toLowerCase();
        
        // Default kategori jika tidak ada yang cocok
        let kategori = "Sosial"; 

        // =========================================================================
        // LOGIKA KATEGORI DIPERKUAT (Prioritas dari atas ke bawah)
        // =========================================================================
        if (textToAnalyze.match(/\b(bencana|gempa|banjir|tsunami|longsor|kebakaran|karhutla|erupsi|meletus|kecelakaan|evakuasi|tim sar|bnpb|bpbd|darurat|cuaca ekstrem|badai|topan|basarnas|penyelamatan)\b/)) { 
            kategori = "Bencana"; 
        }
        else if (textToAnalyze.match(/\b(hukum|korupsi|polisi|kpk|pidana|perdata|tersangka|peradilan|sidang|hakim|jaksa|vonis|penjara|penegakan|pelanggaran|kriminal|pemerasan|gratifikasi|bareskrim|polri|polda|polres|mahkamah|konstitusi|mk|ky|kejaksaan|kejagung)\b/)) { 
            kategori = "Hukum"; 
        }
        // PEMERINTAHAN DIPERKUAT: Masukkan Prabowo, Gibran, Jokowi, Istana, Kabinet, IKN, dll
        else if (textToAnalyze.match(/\b(pemerintah|presiden|wapres|menteri|kabinet|istana|prabowo|gibran|jokowi|birokrasi|pelayanan publik|anggaran|program kerja|infrastruktur|pajak|diplomasi|subsidi|kementerian|pemda|apbn|apbd|negara|kebijakan|diplomat|perpres|keppres|kemenkeu|kemendagri|ikn|bumn|pemprov|pemkot|pemkab|dinas)\b/)) { 
            kategori = "Pemerintahan"; 
        }
        else if (textToAnalyze.match(/\b(politik|partai|pdip|gerindra|golkar|pks|pkb|nasdem|demokrat|kekuasaan|ideologi|elit|survei|elektabilitas|manuver|deklarasi|pemilu|pilkada|dpr|dprd|mpr|koalisi|oposisi|kampanye|kpu|bawaslu|demokrasi|parlemen|caleg|cagub|cabup|cawalkot)\b/)) { 
            kategori = "Politik"; 
        }
        else if (textToAnalyze.match(/\b(finansial|keuangan|ekonomi|saham|ihsg|inflasi|suku bunga|bi rate|nilai tukar|rupiah|kripto|crypto|laporan keuangan|startup|investasi|ekspor|impor|e-wallet|pembayaran digital|bank indonesia|ojk|otoritas jasa keuangan|ceo|direktur|investor|pialang|pengusaha|ritel|korporat|korporasi|perusahaan|perbankan|bank|bursa|bisnis|makro|mikro)\b/)) { 
            kategori = "Finansial"; 
        }
        else if (textToAnalyze.match(/\b(teknologi|inovasi|gadget|smartphone|software|internet|digital|sains|siber|perangkat lunak|ai|artificial intelligence|kecerdasan buatan|aplikasi|kominfo)\b/)) { 
            kategori = "Teknologi"; 
        }
        else if (textToAnalyze.match(/\b(olahraga|atlet|liga|bola|sepak bola|timnas|juara|badminton|motogp|f1|kompetisi|kebugaran|skor|klasemen|olimpiade|medali|pssi|premier league|pertandingan|turnamen|klub|pemain|pelatih)\b/)) { 
            kategori = "Olahraga"; 
        }
        else if (textToAnalyze.match(/\b(entertainment|artis|selebritas|seleb|figur publik|konser|film|drama|musik|bioskop|pop|showbiz|karya seni|rekreasi|hiburan|gosip|sinetron|sutradara|aktor|aktris)\b/)) { 
            kategori = "Entertainment"; 
        }

        rawItems.push({
          topik: cleanTitle,
          kategori: kategori,
          source: cleanSource,
          pubDate: pubDateRapi,
          timestamp: articleDate.getTime(),
          articleTitle: rawTitle,
          articleDesc: pureDesc,
          link: linkAsli,
          sourcesList: [{ name: `${cleanSource} (Artikel Utama)`, url: linkAsli }],
          diffHours: diffHours 
        });
      }
    }

    let filteredItems = rawItems.filter(item => item.diffHours <= hours);
    
    if (filteredItems.length === 0 && mode !== 'terkini') {
        filteredItems = rawItems.sort((a, b) => a.diffHours - b.diffHours).slice(0, 12);
    }

    let dynamicIssues = [];
    let seenTopics = new Set();

    if (mode === 'terkini') {
        filteredItems.sort((a, b) => b.timestamp - a.timestamp);
        filteredItems.forEach((item, index) => {
          const mainKeyword = item.topik.substring(0, 20).toLowerCase();
          if (!seenTopics.has(mainKeyword)) {
            seenTopics.add(mainKeyword);
            dynamicIssues.push({ id: index, ...item, volume: 0 });
          }
        });
    } else {
        filteredItems.forEach((item, index) => {
          const volumeData = getRealVolume(item.topik, allTitles);
          const mainKeyword = item.topik.substring(0, 15).toLowerCase();
          if (!seenTopics.has(mainKeyword)) {
            seenTopics.add(mainKeyword);
            dynamicIssues.push({ id: index, ...item, volume: volumeData });
          }
        });
        dynamicIssues.sort((a, b) => b.volume - a.volume);
    }

    if (dynamicIssues.length === 0) {
        dynamicIssues.push({ id: "empty", topik: `Tidak ada berita dalam ${hours} jam terakhir.`, kategori: "Sistem", volume: 0, source: "Sistem", pubDate: "Saat ini", articleTitle: "Radar Sepi", articleDesc: "Tidak ada pemberitaan.", link: "#", sourcesList: [] });
    }

    return NextResponse.json({ success: true, data: dynamicIssues.slice(0, 20) });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
