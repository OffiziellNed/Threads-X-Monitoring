import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STOP_WORDS = ['yang', 'untuk', 'pada', 'dari', 'dengan', 'dalam', 'dan', 'ini', 'itu', 'oleh', 'akan', 'bisa', 'telah', 'tidak', 'sebagai', 'karena', 'jadi', 'bagi', 'atau', 'saat'];
const IGNORE_WORDS = ['megawati', 'soekarnoputri', 'mega', 'ketum', 'pdip'];

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

function detectKategori(textToAnalyze) {
  const t = textToAnalyze.toLowerCase();
  if (/\b(ekspor|impor|ekspor-impor|ekspor impor|neraca perdagangan)\b/i.test(t)) return "Global";
  if (/\b(perang|peperangan|perang dagang|trade war|invasi|agresi militer|konflik bersenjata|rudal|nuklir)\b/i.test(t)) return "Global";
  if (/indonesia.*(china|tiongkok|amerika|usa|rusia|russia|jepang|japan|korea|india|australia|malaysia|singapura|arab saudi|inggris|britania|prancis|jerman|eropa|israel|palestina|ukraina|iran|irak)\b/i.test(t)) return "Global";
  if (/\b(hubungan bilateral|kerjasama bilateral|hubungan diplomatik|hubungan antar negara|antar negara|kunjungan kenegaraan|diplomasi global|hubungan internasional|luar negeri|internasional)\b/i.test(t)) return "Global";
  if (/\b(amerika serikat|tiongkok|china vs|amerika vs|rusia vs|perang dunia|world war|white house|gedung putih|pentagon|kremlin|biden|trump|putin|xi jinping|netanyahu|zelensky)\b/i.test(t)) {
    if (!t.includes("dpr ri") &&!t.includes("dpd ri")) return "Global";
  }
  if (/\b(narkotika|narkoba|sabu|ganja|ekstasi|pembunuhan|dibunuh|penculikan|pelecehan seksual|perkosaan|perampokan|begal|pemukulan|pengeroyokan|penganiayaan|penembakan|pembacokan|penusukan|tawuran|pencurian|maling|curanmor|jambret|kdrt|bandar narkoba)\b/i.test(t)) return "Kriminal";
  if (/\b(dpd ri|dpr ri|dpr-ri|dpd-ri|mpr ri|komisi.*dpr|anggota dewan|parlemen|menteri|kabinet|kementerian|istana|presiden prabowo|wapres gibran|pemerintah|pemda|kemenkeu|kemendagri|apbn|apbd|birokrasi|perpres|keppres)\b/i.test(t)) return "Pemerintahan";
  if (/\b(harga emas|harga perak|harga minyak|emas naik|emas turun|logam mulia|antam|ihsg|saham|inflasi|suku bunga|bi rate|nilai tukar|rupiah|kurs|dollar|kripto|ojk|bursa efek|investasi|ekonomi|keuangan)\b/i.test(t)) return "Finansial";
  if (/\b(taekwondo|sepak bola|bola voli|voli|basket|bulu tangkis|badminton|tenis|atlet|olimpiade|sea games|pon|piala dunia|liga 1|persija|persib|timnas|gulat|karate|judo|pencak silat|renang|marathon|balap|motogp|f1|juara|medali|pssi|pertandingan|turnamen|klub|pelatih|skor|klasemen)\b/i.test(t)) return "Olahraga";
  if (/\b(bencana|gempa|banjir|tsunami|longsor|kebakaran|karhutla|erupsi|meletus|kecelakaan|evakuasi|tim sar|bnpb|bpbd|darurat|cuaca ekstrem|badai|topan|basarnas)\b/i.test(t)) return "Bencana";
  if (/\b(entertainment|artis|selebritas|konser|film|drama|musik|bioskop|hiburan|gosip|sinetron|sutradara|aktor|aktris)\b/i.test(t)) return "Entertainment";
  if (/\b(teknologi|inovasi|gadget|smartphone|software|internet|digital|sains|siber|ai|kecerdasan buatan|aplikasi|startup)\b/i.test(t)) return "Teknologi";
  if (/\b(hukum|korupsi|polisi|kpk|pidana|tersangka|peradilan|sidang|hakim|jaksa|vonis|penjara|bareskrim|polri|kejaksaan)\b/i.test(t)) return "Hukum";
  if (/\b(politik|partai|pdip|gerindra|golkar|nasdem|pemilu|pilkada|koalisi|oposisi|kpu|bawaslu|demokrasi)\b/i.test(t)) return "Politik";
  return "Sosial";
}

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
  const coreWords = words.filter(w => w.length > 3 &&!STOP_WORDS.includes(w) &&!IGNORE_WORDS.includes(w));
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
    const query = encodeURIComponent(`"Megawati Soekarnoputri" OR "Megawati PDIP" OR "Megawati PDI Perjuangan" ${timeFilter}`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;
    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();
    const items = xmlText.split("<item>");
    let rawItems = []; let allTitles = []; const megaKeywords = ['megawati', 'soekarnoputri']; const now = new Date();
    for (let i = 1; i < items.length; i++) {
      const item = items[i]; const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/); const descMatch = item.match(/<description>([\s\S]*?)<\/description>/); const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      if (titleMatch && dateMatch) {
        const articleDate = new Date(dateMatch[1]); const diffHours = (now - articleDate) / (1000 * 60 * 60); if (diffHours > hours) continue;
        let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"); const cleanTitle = rawTitle.split(" - ")[0]; const lowerTitle = cleanTitle.toLowerCase();
        if (lowerTitle.match(/\b(voli|hangestri|red sparks|korea|atlet|liga|pemain)\b/)) continue;
        if (!megaKeywords.some(kw => lowerTitle.includes(kw))) continue;
        allTitles.push(cleanTitle);
        let pureDesc = "Tidak ada deskripsi rinci."; if (descMatch) { let rawDesc = descMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'); rawDesc = rawDesc.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'); pureDesc = rawDesc.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
        const sourceMatch = item.match(/<source.*?>([\s\S]*?)<\/source>/); const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
        let rawSource = sourceMatch? sourceMatch[1] : "Media Nasional"; let cleanSource = rawSource.split(" - ")[0].split(",")[0].split("|")[0].trim();
        const linkAsli = linkMatch? cleanUrl(linkMatch[1]) : "#"; const pubDateRapi = formatPubDate(dateMatch[1]);
        const textToAnalyze = (cleanTitle + " " + pureDesc).toLowerCase(); let kategori = detectKategori(textToAnalyze);
        rawItems.push({ topik: cleanTitle, kategori, source: cleanSource, pubDate: pubDateRapi, timestamp: articleDate.getTime(), articleTitle: rawTitle, articleDesc: pureDesc, link: linkAsli, sourcesList: [{ name: `${cleanSource} (Artikel Utama)`, url: linkAsli }] });
      }
    }
    let dynamicIssues = []; let seenTopics = new Set();
    if (mode === 'terkini') {
        rawItems.sort((a, b) => b.timestamp - a.timestamp);
        rawItems.forEach((item, index) => { const mainKeyword = item.topik.substring(0, 20).toLowerCase(); if (!seenTopics.has(mainKeyword)) { seenTopics.add(mainKeyword); dynamicIssues.push({ id: `mega-${index}`,...item, volume: 0 }); } });
    } else {
        rawItems.forEach((item, index) => { const volumeData = getRealVolume(item.topik, allTitles); const mainKeyword = item.topik.substring(0, 15).toLowerCase(); if (!seenTopics.has(mainKeyword)) { seenTopics.add(mainKeyword); dynamicIssues.push({ id: `mega-${index}`,...item, volume: volumeData }); } });
        dynamicIssues.sort((a, b) => b.volume - a.volume);
    }
    if (dynamicIssues.length === 0) { dynamicIssues.push({ id: "mega-empty", topik: `Tidak ada berita Megawati Soekarnoputri dalam ${hours} jam terakhir.`, kategori: "Politik", volume: 0, source: "Sistem", pubDate: "Saat ini", articleTitle: "Radar Sepi", articleDesc: "Tidak ada pemberitaan.", link: "#", sourcesList: [] }); }
    return NextResponse.json({ success: true, data: dynamicIssues.slice(0, 20) });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
