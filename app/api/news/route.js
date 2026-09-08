import { NextResponse } from "next/server";

// =========================================================================
// 1. FUNGSI PEMBERSIH LINK MUTLAK (Anti Google Redirect & Berlaku Semua Situs)
// =========================================================================
const cleanUrl = (rawUrl) => {
  if (!rawUrl) return "";
  try {
    const decodedUrl = rawUrl.replace(/&amp;/g, '&');
    import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STOP_WORDS = ['yang', 'untuk', 'pada', 'dari', 'dengan', 'dalam', 'dan', 'ini', 'itu', 'oleh', 'akan', 'bisa', 'telah', 'tidak', 'sebagai', 'karena', 'jadi', 'bagi', 'atau', 'saat'];

function getRealVolume(title, allTitles) {
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const coreWords = words.filter(w => w.length > 3 && !STOP_WORDS.includes(w));
  if (coreWords.length === 0) return Math.floor(Math.random() * 5) + 30;

  let count = 0;
  allTitles.forEach(t => {
    const tLower = t.toLowerCase();
    const isRelated = coreWords.some(cw => {
       const regex = new RegExp(`\\b${cw}\\b`);
       return regex.test(tLower);
    });
    if (isRelated) count++;
  });
  return (count * 4) + coreWords.length + 25;
}

// =========================================================================
// FUNGSI PEMBERSIH URL: Membongkar Redirect Google jika ada
// =========================================================================
const cleanUrl = (rawUrl) => {
  if (!rawUrl) return "";
  try {
    const decodedUrl = rawUrl.replace(/&amp;/g, '&');
    
    // Jika bentuknya google.com/url?q=...
    if (decodedUrl.includes("google.com/url")) {
      const urlObj = new URL(decodedUrl);
      const cleanLink = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
      if (cleanLink) return cleanLink; 
    }
    
    // Kembalikan aslinya (Bisa jadi https://news.google.com/articles/... -> ini valid)
    return decodedUrl;
  } catch (error) {
    return rawUrl;
  }
};

// =========================================================================
// FUNGSI FORMAT TANGGAL: Standardisasi agar persis "DD Bulan YYYY pukul HH:MM WIB"
// =========================================================================
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '12', 10);
    const mode = searchParams.get('mode') || 'volume'; 
    
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
        const sourceName = sourceMatch ? sourceMatch[1] : "Media Nasional";
        
        // -------------------------------------------------------------
        // INI KUNCINYA: Link dan Tanggal dieksekusi pakai fungsi pembersih
        // -------------------------------------------------------------
        const linkAsli = linkMatch ? cleanUrl(linkMatch[1]) : "#";
        const pubDateRapi = formatPubDate(dateMatch[1]);

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
          pubDate: pubDateRapi, // <-- Sudah 100% rapi
          timestamp: articleDate.getTime(),
          articleTitle: rawTitle,
          articleDesc: pureDesc,
          link: linkAsli, // <-- Murni & bersih! (Nanti ditangkap oleh Frontend sbg 'isu.link')
          sourcesList: [{ name: `${sourceName} (Artikel Utama)`, url: linkAsli }],
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
    // Bongkar paksa jika ada embel-embel google.com/url
    if (decodedUrl.includes("google.com/url")) {
      const urlObj = new URL(decodedUrl);
      const cleanLink = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
      if (cleanLink) return cleanLink; 
    }
    
    // Jika link sudah asli dari awal (misal langsung ke web sumber)
    return decodedUrl;
  } catch (error) {
    return rawUrl; // Failsafe agar tidak error
  }
};

// =========================================================================
// 2. FUNGSI FORMAT TANGGAL & WAKTU (Agar Frontend Bisa Memisahnya Sempurna)
// =========================================================================
const formatPubDate = (pubDateStr) => {
  if (!pubDateStr) return "-";
  try {
    const date = new Date(pubDateStr);
    if (isNaN(date.getTime())) return pubDateStr; 
    
    const optionsDate = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' };
    
    const formattedDate = new Intl.DateTimeFormat('id-ID', optionsDate).format(date);
    const formattedTime = new Intl.DateTimeFormat('id-ID', optionsTime).format(date).replace(/\./g, ':');
    
    // Format ini otomatis akan dibelah dengan rapi oleh Frontend lo jadi kolom Tanggal & Waktu
    return `${formattedDate} pukul ${formattedTime} WIB`;
  } catch (error) {
    return pubDateStr;
  }
};

// =========================================================================
// 3. HANDLER API ROUTE (BACKEND NEXT.JS)
// =========================================================================
export async function GET(request) {
  try {
    // Ambil parameter dari request Frontend (Misal: /api/news?hours=24)
    const { searchParams } = new URL(request.url);
    const hours = searchParams.get('hours') || '24';
    const mode = searchParams.get('mode') || 'default';

    // ---------------------------------------------------------------------
    // 👇 TARUH KODE SCRAPING / FETCHING LO DI BAWAH INI 👇
    // ---------------------------------------------------------------------
    
    // Contoh: const response = await fetch("URL_TARGET_LU");
    // const hasilScrapingKotor = await response.json(); ATAU parser.parseURL()
    
    let hasilScrapingKotor = []; // <-- GANTI INI DENGAN DATA ASLI HASIL SCRAPING LO
    
    // ---------------------------------------------------------------------
    // 👆 TARUH KODE SCRAPING / FETCHING LO DI ATAS INI 👆
    // ---------------------------------------------------------------------

    // =========================================================================
    // 4. CLEANING & FORMATTING (Merapikan Semua Data Sebelum Dikirim)
    // =========================================================================
    const dataSiapKirim = hasilScrapingKotor.map(item => {
      return {
        ...item, // Bawa semua data bawaan aslinya
        topik: item.title || item.topik || "Tanpa Judul",
        pubDate: formatPubDate(item.pubDate), // Otomatis rapi: "8 September 2026 pukul 12:05 WIB"
        source: item.source || "-",
        kategori: item.kategori || "UMUM",
        articleDesc: item.articleDesc || item.description || "",
        
        // INI KUNCINYA: Link langsung bersih dari backend! Berlaku buat Detik, CNN, Kompas, dll
        link: cleanUrl(item.link || item.url) 
      };
    });

    // 5. Kirim response bersih ke Frontend
    return NextResponse.json({
      success: true,
      data: dataSiapKirim
    });

  } catch (error) {
    console.error("Backend Error:", error);
    return NextResponse.json({
      success: false,
      message: "Gagal mengambil data dari Backend",
      error: error.message
    }, { status: 500 });
  }
}
