import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STOP_WORDS = ['yang', 'untuk', 'pada', 'dari', 'dengan', 'dalam', 'dan', 'ini', 'itu', 'oleh', 'akan', 'bisa', 'telah', 'tidak', 'sebagai', 'karena', 'jadi', 'bagi', 'atau', 'saat'];

// Menggunakan regex word boundary agar kata "pakai" tidak dibaca sebagai "ai" (Teknologi)
function getRealVolume(title, allTitles) {
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const coreWords = words.filter(w => w.length > 3 && !STOP_WORDS.includes(w));
  if (coreWords.length === 0) return 1;

  let count = 0;
  allTitles.forEach(t => {
    const tLower = t.toLowerCase();
    const isRelated = coreWords.some(cw => {
       const regex = new RegExp(`\\b${cw}\\b`);
       return regex.test(tLower);
    });
    if (isRelated) count++;
  });
  return count;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '3', 10);
    
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
        const link = linkMatch ? linkMatch[1] : "#";
        const pubDate = articleDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' });

        // =================================================================
        // SISTEM KATEGORISASI CERDAS (MENGGUNAKAN HIERARKI & WORD BOUNDARY)
        // =================================================================
        const textToAnalyze = (cleanTitle + " " + pureDesc).toLowerCase();
        let kategori = "Sosial"; // Laci Default (realita warga, pendidikan, kesehatan)

        // 1. Olahraga (Dicek lebih dulu agar "Badai Cedera" tidak masuk Bencana)
        if (textToAnalyze.match(/\b(olahraga|atlet|liga|bola|sepak bola|timnas|juara|badminton|motogp|f1|kompetisi|kebugaran|skor|klasemen|olimpiade|medali|pssi|premier league|manchester united|hull city|pertandingan|turnamen|klub|pemain|pelatih)\b/)) {
          kategori = "Olahraga";
        }
        // 2. Bencana (Alam & Kecelakaan Darurat)
        else if (textToAnalyze.match(/\b(bencana|gempa|banjir|tsunami|longsor|kebakaran|karhutla|erupsi|meletus|kecelakaan|evakuasi|tim sar|bnpb|bpbd|darurat|kegawatdaruratan|cuaca ekstrem|badai|topan|basarnas|penyelamatan)\b/)) {
          kategori = "Bencana";
        }
        // 3. Entertainment (Hiburan, Pop, Figur Publik)
        else if (textToAnalyze.match(/\b(entertainment|artis|selebritas|seleb|figur publik|konser|film|drama|musik|bioskop|pop|showbiz|karya seni|rekreasi|hiburan|gosip|sinetron|sutradara|aktor|aktris)\b/)) {
          kategori = "Entertainment";
        }
        // 4. Teknologi (Inovasi & Digital, \b memastikan "ai" berdiri sendiri, bukan di dalam pAKAI)
        else if (textToAnalyze.match(/\b(teknologi|inovasi|gadget|smartphone|software|internet|digital|sains|siber|perangkat lunak|ai|artificial intelligence|kecerdasan buatan|startup|aplikasi)\b/)) {
          kategori = "Teknologi";
        }
        // 5. Hukum (Pelanggaran, Peradilan, Penegakan)
        else if (textToAnalyze.match(/\b(hukum|korupsi|polisi|kpk|pidana|perdata|tersangka|peradilan|sidang|hakim|jaksa|vonis|penjara|penegakan|pelanggaran|kriminal|pemerasan|gratifikasi|bareskrim|polri|polda|polres|mahkamah|konstitusi|mk|ky|kejaksaan)\b/)) {
          kategori = "Hukum";
        }
        // 6. Politik (Manuver, Parpol, Kekuasaan, Pemilu, Diplomasi)
        else if (textToAnalyze.match(/\b(politik|partai|pdip|kekuasaan|ideologi|elit|survei|elektabilitas|manuver|deklarasi|deklarasikan|pemilu|pilkada|dpr|koalisi|oposisi|pwnu|muktamar|kampanye|kpu|bawaslu|demokrasi|parlemen|caleg|cagub|cabup|cawalkot|perang|diplomasi internasional)\b/)) {
          kategori = "Politik";
        }
        // 7. Pemerintahan (Kebijakan, Anggaran, Birokrasi, Subsidi)
        else if (textToAnalyze.match(/\b(pemerintah|presiden|menteri|birokrasi|pelayanan publik|anggaran|program kerja|tata kota|infrastruktur|pajak|diplomasi|subsidi|kementerian|pemda|apbn|apbd|negara|kebijakan|diplomat|perpres|keppres|kemenkeu|kemendagri)\b/)) {
          kategori = "Pemerintahan";
        }
        // 8. Sosial (Kesehatan, Gaya Hidup, Buruh, Pendidikan, Fenomena)
        else if (textToAnalyze.match(/\b(sosial|warga|masyarakat|ketimpangan|budaya|konflik|kesenjangan|gerakan sipil|gaya hidup|pekerja|buruh|pendidikan|kesehatan|mental|komunal|kesejahteraan|hepatitis|penyakit|sekolah|kampus|mahasiswa|demo|protes|idap)\b/)) {
          kategori = "Sosial";
        }

        rawItems.push({
          topik: cleanTitle,
          kategori: kategori,
          source: sourceName,
          pubDate: pubDate,
          articleTitle: rawTitle,
          articleDesc: pureDesc,
          sourcesList: [{ name: `${sourceName} (Artikel Utama)`, url: link }],
          diffHours: diffHours 
        });
      }
    }

    // FILTER WAKTU KETAT & SMART FALLBACK
    let filteredItems = rawItems.filter(item => item.diffHours <= hours);
    if (filteredItems.length === 0) {
        filteredItems = rawItems.sort((a, b) => a.diffHours - b.diffHours).slice(0, 12);
    }

    let dynamicIssues = [];
    let seenTopics = new Set();

    filteredItems.forEach((item, index) => {
      const volumeData = getRealVolume(item.topik, allTitles);
      const mainKeyword = item.topik.substring(0, 15).toLowerCase();
      
      if (!seenTopics.has(mainKeyword)) {
        seenTopics.add(mainKeyword);
        dynamicIssues.push({
          id: index,
          ...item,
          volume: volumeData 
        });
      }
    });

    dynamicIssues.sort((a, b) => b.volume - a.volume);

    return NextResponse.json({ success: true, data: dynamicIssues.slice(0, 20) });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
