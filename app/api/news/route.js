import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const STOP_WORDS = ['yang','untuk','pada','dari','dengan','dalam','dan','ini','itu','oleh','akan','bisa','telah','tidak','sebagai','karena','jadi','bagi','atau','saat','adalah','ada','juga','sudah','saya','kita','mereka','dia','ke','di'];

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
  } catch { return rawUrl; }
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
  } catch { return pubDateStr; }
};

function detectKategori(textToAnalyze) {
  const t = textToAnalyze.toLowerCase();
  
  // === 1. GLOBAL - PRIORITAS TERTINGGI ===
  if (/ekspor|impor|neraca perdagangan/i.test(t)) return "Global";
  if (/perang|peperangan|perang dagang|trade war|invasi|agresi militer|konflik bersenjata|rudal|nuklir/i.test(t)) return "Global";
  if (/indonesia.*(china|tiongkok|amerika|usa|rusia|russia|jepang|japan|korea|india|australia|malaysia|singapura|arab saudi|inggris|britania|prancis|jerman|eropa|israel|palestina|ukraina|iran|irak)/i.test(t)) return "Global";
  if (/hubungan bilateral|kerjasama bilateral|hubungan diplomatik|hubungan antar negara|antar negara|kunjungan kenegaraan|diplomasi global|hubungan internasional|luar negeri/i.test(t)) return "Global";
  if (/amerika serikat|tiongkok|china vs|amerika vs|rusia vs|perang dunia|world war|white house|gedung putih|pentagon|kremlin|biden|trump|putin|xi jinping|netanyahu|zelensky/i.test(t)) {
    if (!t.includes("dpr ri") && !t.includes("dpd ri")) return "Global";
  }

  // === 2. KRIMINAL ===
  if (/narkotika|narkoba|sabu|ganja|ekstasi|pil koplo|pembunuhan|dibunuh|penculikan|diculik|pelecehan seksual|perkosaan|pemerkosaan|rudapaksa|cabul|perampokan|begal|pembegalan|pemukulan|pengeroyokan|penganiayaan|penembakan|pembacokan|penusukan|tawuran|pencurian|maling|curanmor|jambret|kdrt|carok|bandar narkoba/i.test(t)) return "Kriminal";

  // === 3. PEMERINTAHAN - DPD RI, DPR RI ===
  if (/dpd ri|dpr ri|dpr-ri|dpd-ri|mpr ri|komisi.*dpr|anggota dewan|parlemen|menteri|kabinet|kementerian|istana|presiden prabowo|wapres gibran|pemerintah|pemda|kemenkeu|kemendagri|apbn|apbd|birokrasi|perpres|keppres/i.test(t)) return "Pemerintahan";

  // === 4. FINANSIAL - Harga Emas ===
  if (/harga emas|harga perak|harga minyak|emas naik|emas turun|logam mulia|antam|ihsg|saham|inflasi|suku bunga|bi rate|nilai tukar|rupiah|kurs|dollar|kripto|crypto|ojk|bursa efek|investasi|ekonomi|keuangan/i.test(t)) return "Finansial";

  // === 5. OLAHRAGA - Taekwondo ===
  if (/taekwondo|sepak bola|bola voli|voli|basket|bulu tangkis|badminton|tenis|atlet|olimpiade|sea games|pon|piala dunia|liga 1|persija|persib|timnas|gulat|karate|judo|pencak silat|renang|marathon|balap|motogp|f1|juara|medali|pssi|pertandingan|turnamen|klub|pelatih|skor|klasemen/i.test(t)) return "Olahraga";

  if (/bencana|gempa|banjir|tsunami|longsor|kebakaran|karhutla|erupsi|meletus|kecelakaan|evakuasi|tim sar|bnpb|bpbd|darurat|cuaca ekstrem|badai|topan|basarnas|penyelamatan/i.test(t)) return "Bencana";
  if (/entertainment|artis|selebritas|konser|film|drama|musik|bioskop|hiburan|gosip|sinetron|sutradara|aktor|aktris/i.test(t)) return "Entertainment";
  if (/teknologi|inovasi|gadget|smartphone|software|internet|digital|sains|siber|ai|kecerdasan buatan|aplikasi|startup/i.test(t)) return "Teknologi";
  if (/hukum|korupsi|polisi|kpk|pidana|tersangka|peradilan|sidang|hakim|jaksa|vonis|penjara|bareskrim|polri|kejaksaan/i.test(t)) return "Hukum";
  if (/politik|partai|pdip|gerindra|golkar|nasdem|pemilu|pilkada|koalisi|oposisi|kpu|bawaslu|demokrasi/i.test(t)) return "Politik";
  
  return "Sosial";
}

// ... (sisanya clustering sama kayak file lama lo, tinggal pakai detectKategori di atas)
