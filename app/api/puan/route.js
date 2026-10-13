import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STOP_WORDS = ['yang', 'untuk', 'pada', 'dari', 'dengan', 'dalam', 'dan', 'ini', 'itu', 'oleh', 'akan', 'bisa', 'telah', 'tidak', 'sebagai', 'karena', 'jadi', 'bagi', 'atau', 'saat'];
const IGNORE_WORDS = ['puan', 'maharani', 'ketua', 'dpr'];

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
  
  // === 1. GLOBAL - PRIORITAS TERTINGGI (sesuai request baru) ===
  // Ekspor-Impor -> Global
  if (/\b(ekspor|impor|ekspor-impor|ekspor impor|neraca perdagangan)\b/i.test(t)) return "Global";
  // Perang-perangan -> Global
  if (/\b(perang|peperangan|perang dagang|trade war|invasi|agresi militer|konflik bersenjata|rudal|nuklir)\b/i.test(t)) {
    // Kecuali kalau konteksnya perang melawan narkoba/korupsi (itu Hukum), tapi untuk kasus negara tetap Global
    if (t.match(/rusia|ukraina|israel|palestina|iran|amerika|china|taiwan|korea utara/)) return "Global";
    // Kalau ada kata perang secara umum, anggap Global sesuai request (Perang-perangan -> Global)
    return "Global";
  }
  // Hubungan antar negara Indonesia dengan China/Amerika dll -> Global
  if (/indonesia.*(china|tiongkok|amerika|usa|rusia|russia|jepang|japan|korea|india|australia|malaysia|singapura|arab saudi|inggris|britania|prancis|jerman|eropa|israel|palestina|ukraina|iran|irak)\b/i.test(t)) return "Global";
  if (/\b(hubungan bilateral|kerjasama bilateral|hubungan diplomatik|hubungan antar negara|antar negara|kunjungan kenegaraan|diplomasi global|hubungan internasional|luar negeri|internasional)\b/i.test(t)) {
    // Tapi kalau ada kata Indonesia + negara lain, tetap Global (kecuali konteksnya DPR RI kunjungan - itu tetap Global karena antar negara)
    return "Global";
  }
  // Negara-negara besar tanpa Indonesia juga Global (contoh: Amerika vs China)
  if (/\b(amerika serikat|tiongkok|china vs|amerika vs|rusia vs|perang dunia|world war|white house|gedung putih|pentagon|kremlin|biden|trump|putin|xi jinping|netanyahu|zelensky)\b/i.test(t)) {
    if (!t.includes("dpr ri") && !t.includes("dpd ri")) return "Global";
  }

  // === 2. KRIMINAL ===
  const kriminalRegex = /\b(narkotika|narkoba|sabu|ganja|ekstasi|pil koplo|pembunuhan|dibunuh|penculikan|diculik|culik|pelecehan seksual|pelecehan|perkosaan|pemerkosaan|rudapaksa|cabul|asusila|kekerasan seksual|perampokan|dirampok|rampok|begal|dibegal|pembegalan|pemukulan|pengeroyokan|dikeroyok|penganiayaan|aniaya|penembakan|ditembak|pembacokan|dibacok|penusukan|penikaman|ditikam|ditusuk|tawuran|pencurian|maling|curanmor|jambret|kdrt|carok|penodongan|pemalakan|premanisme|bandar narkoba|pengedar narkoba)\b/;
  if (kriminalRegex.test(t)) return "Kriminal";

  // === 3. PEMERINTAHAN - DPD RI, DPR RI masuk sini (bukan Sosial/Politik) ===
  if (/\b(dpd ri|dpr ri|dpr-ri|dpd-ri|dpd|dpr|mpr ri|komisi.*dpr|anggota dewan|parlemen|menteri|kabinet|kementerian|istana|presiden prabowo|wapres gibran|pemerintah|pemda|kemenkeu|kemendagri|apbn|apbd|birokrasi|perpres|keppres)\b/i.test(t)) {
    return "Pemerintahan";
  }

  // === 4. FINANSIAL - Harga Emas dll ===
  if (/\b(harga emas|harga perak|harga minyak|emas naik|emas turun|logam mulia|antam|ihsg|saham|inflasi|suku bunga|bi rate|nilai tukar|rupiah|kurs|dollar|kripto|crypto|ojk|bursa efek|investasi|ekonomi|keuangan)\b/i.test(t)) {
    return "Finansial";
  }

  // === 5. OLAHRAGA - Taekwondo & semua olahraga ===
  if (/\b(taekwondo|sepak bola|bola voli|voli|basket|bulu tangkis|badminton|tenis|atlet|olimpiade|sea games|pon|piala dunia|liga 1|persija|persib|timnas|gulat|karate|judo|pencak silat|renang|marathon|lari|balap|motogp|f1|formula 1|juara|medali|pssi|pertandingan|turnamen|klub|pelatih|skor|klasemen)\b/i.test(t)) {
    return "Olahraga";
  }

  if (/\b(bencana|gempa|banjir|tsunami|longsor|kebakaran|karhutla|erupsi|meletus|kecelakaan|evakuasi|tim sar|bnpb|bpbd|darurat|cuaca ekstrem|badai|topan|basarnas|penyelamatan)\b/i.test(t)) return "Bencana";
  if (/\b(entertainment|artis|selebritas|seleb|konser|film|drama|musik|bioskop|pop|showbiz|hiburan|gosip|sinetron|sutradara|aktor|aktris)\b/i.test(t)) return "Entertainment";
  if (/\b(teknologi|inovasi|gadget|smartphone|software|internet|digital|sains|siber|perangkat lunak|ai|artificial intelligence|kecerdasan buatan|aplikasi|startup)\b/i.test(t)) return "Teknologi";
  if (/\b(hukum|korupsi|polisi|kpk|pidana|perdata|tersangka|peradilan|sidang|hakim|jaksa|vonis|penjara|penegakan|pelanggaran|kriminal|pemerasan|gratifikasi|bareskrim|polri|polda|polres|mahkamah|konstitusi|mk|kejaksaan)\b/i.test(t)) return "Hukum";
  if (/\b(politik|partai|pdip|gerindra|golkar|nasdem|pemilu|pilkada|koalisi|oposisi|kpu|bawaslu|demokrasi|parlemen|caleg|cagub|cabup|cawalkot|survei|elektabilitas)\b/i.test(t)) return "Politik";
  
  return "Sosial";
}

function getSourceTier(link, sourceName) {
  const text = ((link||"") + " " + (sourceName||"")).toLowerCase();
  const tier1 = ["kompas.com","detik.com","cnnindonesia.com","antaranews.com","tempo.co","liputan6.com","kompas.tv","cnbcindonesia.com","republika.co.id","beritasatu.com","kumparan.com"];
  const tier2 = ["tribunnews.com","okezone.com","sindonews.com","merdeka.com","idntimes.com","suara.com","viva.co.id","pikiran-rakyat.com","jpnn.com","tvonenews.com","metrotvnews.com"];
  for (const d of tier1) if (text.includes(d)) return { tier: 1, weight: 3, name: d };
  for (const d of tier2) if (text.includes(d)) return { tier: 2, weight: 2, name: d };
  return { tier: 3, weight: 1, name: "tier3" };
}
function computeClusterScore(cl) {
  const latest = cl.latestTimestamp;
  let velocity = 0;
  const seenSources = new Map();
  cl.items.forEach(it => {
    const diffMs = latest - it.timestamp;
    if (diffMs <= 7200000) velocity++;
    const tierInfo = getSourceTier(it.link, it.source);
    const key = (it.source || it.link || "").toLowerCase();
    if (!seenSources.has(key)) {
      seenSources.set(key, tierInfo);
    }
  });
  let tier1Count = 0, tier2Count = 0, tier3Count = 0;
  let sourceWeightScore = 0;
  for (const tierInfo of seenSources.values()) {
    if (tierInfo.tier === 1) { tier1Count++; sourceWeightScore += 3; }
    else if (tierInfo.tier === 2) { tier2Count++; sourceWeightScore += 2; }
    else { tier3Count++; sourceWeightScore += 1; }
  }
  const distinctSources = seenSources.size;
  const clusterSize = cl.items.length;
  const volumeBase = clusterSize * 1;
  const recencyBonus = 0;
  const crossPlatform = false;
  const crossPlatformBonus = 0;
  // Simple addition only: total = Tier1*3 + Tier2*2 + Tier3*1 + velocity (Data dalam 2 jam)
  const compositeScore = sourceWeightScore + velocity;
  // Thresholds: HOT NEWS >=8, Potential >=4
  let topLevel = 0;
  let topLabel = "";
  if (compositeScore >= 8) {
    topLevel = 1;
    topLabel = "HOT NEWS";
  } else if (compositeScore >= 4) {
    topLevel = 2;
    topLabel = "Potential";
  }
  return { velocity, sourceWeightScore, tier1Count, tier2Count, tier3Count, distinctSources, recencyBonus, crossPlatform, crossPlatformBonus, compositeScore, topLevel, topLabel, isTop: topLevel > 0 };
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
    const query = encodeURIComponent(`"Puan Maharani" ${timeFilter}`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;

    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();
    const items = xmlText.split("<item>");
    
    let rawItems = [];
    let allTitles = [];
    const puanKeywords = ['puan', 'maharani'];
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
        
        if (!puanKeywords.some(kw => cleanTitle.toLowerCase().includes(kw))) continue;

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
        let kategori = detectKategori(textToAnalyze);

        rawItems.push({
          topik: cleanTitle,
          kategori: kategori,
          source: cleanSource,
          pubDate: pubDateRapi,
          timestamp: articleDate.getTime(),
          articleTitle: rawTitle,
          articleDesc: pureDesc,
          link: linkAsli, // Parameter penentu link tombol "Baca"
          sourcesList: [{ name: `${cleanSource} (Artikel Utama)`, url: linkAsli }]
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
            dynamicIssues.push({ id: `puan-${index}`, ...item, volume: 0, compositeScore: 0, velocity: 0, sourceWeightScore: 0, topLevel: 0, topLabel: "-", isTop: false, isTrending: false });
          }
        });
    } else {
        rawItems.forEach((item, index) => {
          const volumeData = getRealVolume(item.topik, allTitles);
          const tierInfo = getSourceTier(item.link, item.source);
          const recencyH = (Date.now() - item.timestamp) / (1000*60*60);
          const recencyBonus = recencyH < 1 ? 20 : recencyH < 3 ? 15 : recencyH < 6 ? 10 : recencyH < 12 ? 5 : 0;
          const compositeScore = (volumeData * 25) + (tierInfo.weight * 12) + recencyBonus;
          let topLevel = 0; let topLabel = "-";
          if (compositeScore >= 100 || tierInfo.tier === 1) { topLevel = compositeScore >= 140 ? 1 : 2; topLabel = topLevel===1 ? "TOP 1 - Darurat" : "TOP 2 - Naik"; }
          else if (compositeScore >= 60) { topLevel = 2; topLabel = "TOP 2 - Naik"; }
          const mainKeyword = item.topik.substring(0, 15).toLowerCase();
          if (!seenTopics.has(mainKeyword)) {
            seenTopics.add(mainKeyword);
            dynamicIssues.push({ id: `puan-${index}`, ...item, volume: compositeScore, compositeScore, velocity: volumeData, sourceWeightScore: tierInfo.weight, tier1Count: tierInfo.tier===1?1:0, topLevel, topLabel, isTop: topLevel>0, isTrending: topLevel>0 });
          }
        });
        dynamicIssues.sort((a, b) => b.volume - a.volume);
    }
    
    if (dynamicIssues.length === 0) {
      dynamicIssues.push({ id: "puan-empty", topik: `Tidak ada berita Puan Maharani dalam ${hours} jam terakhir.`, kategori: "Politik", volume: 0, source: "Sistem", pubDate: "Saat ini", articleTitle: "Radar Sepi", articleDesc: "Coba cek mode 12 jam.", link: "#", sourcesList: [] });
    }

    return NextResponse.json({ success: true, data: dynamicIssues.slice(0, 20) });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
