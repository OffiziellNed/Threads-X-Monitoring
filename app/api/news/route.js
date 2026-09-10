import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STOP_WORDS = ['yang', 'untuk', 'pada', 'dari', 'dengan', 'dalam', 'dan', 'ini', 'itu', 'oleh', 'akan', 'bisa', 'telah', 'tidak', 'sebagai', 'karena', 'jadi', 'bagi', 'atau', 'saat', 'adalah', 'ada', 'juga', 'sudah', 'saya', 'kita', 'mereka', 'dia', 'ke', 'di', 'ini', 'itu'];

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

// ================== TOKENIZER + TF-IDF + CLUSTERING (OPSI B) ==================
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.includes(w));
}

function buildTfIdfVectors(docsTokens) {
  const N = docsTokens.length;
  const df = {};
  docsTokens.forEach(tokens => {
    const uniq = [...new Set(tokens)];
    uniq.forEach(t => df[t] = (df[t]||0)+1);
  });
  const idf = {};
  Object.keys(df).forEach(term => {
    idf[term] = Math.log((N + 1) / (df[term] + 0.5)) + 1;
  });
  const vectors = docsTokens.map(tokens => {
    const tf = {};
    tokens.forEach(t => tf[t] = (tf[t]||0)+1);
    const len = tokens.length || 1;
    const vec = {};
    Object.keys(tf).forEach(t => {
      vec[t] = (tf[t]/len) * (idf[t]||1);
    });
    return vec;
  });
  return vectors;
}

function cosineSim(a,b) {
  let dot=0, normA=0, normB=0;
  for (const k in a) {
    normA += a[k]*a[k];
    if (b[k]) dot += a[k]*b[k];
  }
  for (const k in b) normB += b[k]*b[k];
  if (normA===0 || normB===0) return 0;
  return dot / (Math.sqrt(normA)*Math.sqrt(normB));
}

function clusterByEmbedding(items, threshold = 0.32) {
  // items sudah filtered by hours
  if (items.length === 0) return [];
  const docsTokens = items.map(it => tokenize((it.topik + " " + it.articleDesc).toLowerCase()));
  const vectors = buildTfIdfVectors(docsTokens);

  const clusters = [];
  vectors.forEach((vec, idx) => {
    let bestCluster = -1;
    let bestSim = -1;
    clusters.forEach((cl, cIdx) => {
      const sim = cosineSim(vec, cl.centroid);
      if (sim > bestSim) { bestSim = sim; bestCluster = cIdx; }
    });
    if (bestSim > threshold) {
      clusters[bestCluster].items.push(items[idx]);
      clusters[bestCluster].vectors.push(vec);
      // update centroid as mean
      const allTerms = new Set();
      clusters[bestCluster].vectors.forEach(v => Object.keys(v).forEach(k => allTerms.add(k)));
      const newCentroid = {};
      allTerms.forEach(term => {
        let sum = 0;
        clusters[bestCluster].vectors.forEach(v => sum += (v[term]||0));
        newCentroid[term] = sum / clusters[bestCluster].vectors.length;
      });
      clusters[bestCluster].centroid = newCentroid;
      // keep latest timestamp in cluster
      if (items[idx].timestamp > clusters[bestCluster].latestTimestamp) {
        clusters[bestCluster].latestTimestamp = items[idx].timestamp;
        clusters[bestCluster].latestItem = items[idx];
      }
    } else {
      clusters.push({
        items: [items[idx]],
        vectors: [vec],
        centroid: vec,
        latestTimestamp: items[idx].timestamp,
        latestItem: items[idx]
      });
    }
  });
  return clusters;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '12', 10); // now dynamic 6/12/24/48
    const mode = searchParams.get('mode') || 'volume'; 
    
    const rssUrl = `https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id`;

    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();
    const items = xmlText.split("<item>");
    
    let rawItems = [];
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
        
        let kategori = "Sosial"; 

        // KRIMINAL PRIORITAS TERTINGGI
        if (textToAnalyze.match(/\b(kriminal|narkotika|narkoba|sabu|ganja|ekstasi|pil koplo|pembunuhan|bunuh|dibunuh|mayat|mutilasi|penculikan|culik|diculik|sandera|penyanderaan|pelecehan|pelecehan seksual|perkosaan|rudapaksa|cabul|asusila|pemerkosaan|kekerasan seksual|lgbt|perampokan|rampok|perampok|begal|dibegal|pembegalan|pemukulan|dipukul|pengeroyokan|dikeroyok|aniaya|penganiayaan|penembakan|ditembak|bacok|pembacokan|ditikam|penikaman|penusukan|tawuran|maling|pencurian|curi|curanmor|curat|curnak|jambret|kdrt|carok|penodongan|pemalakan|preman)\b/)) { 
            kategori = "Kriminal"; 
        }
        else if (textToAnalyze.match(/\b(bencana|gempa|banjir|tsunami|longsor|kebakaran|karhutla|erupsi|meletus|kecelakaan|evakuasi|tim sar|bnpb|bpbd|darurat|cuaca ekstrem|badai|topan|basarnas|penyelamatan)\b/)) { 
            kategori = "Bencana"; 
        }
        else if (textToAnalyze.match(/\b(olahraga|atlet|liga|bola|sepak bola|timnas|juara|badminton|motogp|f1|kompetisi|skor|klasemen|olimpiade|medali|pssi|premier league|pertandingan|turnamen|klub|pemain|pelatih|fifa|uefa)\b/)) { 
            kategori = "Olahraga"; 
        }
        else if (textToAnalyze.match(/\b(entertainment|artis|selebritas|seleb|figur publik|konser|film|drama|musik|bioskop|pop|showbiz|hiburan|gosip|sinetron|sutradara|aktor|aktris)\b/)) { 
            kategori = "Entertainment"; 
        }
        else if (textToAnalyze.match(/\b(teknologi|inovasi|gadget|smartphone|software|internet|digital|sains|siber|ai|kecerdasan buatan|aplikasi|kominfo)\b/)) { 
            kategori = "Teknologi"; 
        }
        else if (textToAnalyze.match(/\b(finansial|keuangan|ekonomi|saham|ihsg|inflasi|suku bunga|rupiah|kripto|investasi|bank indonesia|ojk|perbankan|bank|bursa|bisnis)\b/)) { 
            kategori = "Finansial"; 
        }
        else if (textToAnalyze.match(/\b(hukum|korupsi|polisi|kpk|pidana|tersangka|peradilan|sidang|hakim|jaksa|vonis|penjara|bareskrim|polri|kejaksaan)\b/)) { 
            kategori = "Hukum"; 
        }
        else if (textToAnalyze.match(/\b(pemerintah|presiden|wapres|menteri|kabinet|istana|prabowo|gibran|jokowi|birokrasi|anggaran|infrastruktur|pajak|kementerian|pemda|apbn|negara|kebijakan)\b/)) { 
            kategori = "Pemerintahan"; 
        }
        else if (textToAnalyze.match(/\b(politik|partai|pdip|gerindra|golkar|pks|pkb|nasdem|demokrat|pemilu|pilkada|dpr|koalisi|oposisi|kpu|bawaslu|demokrasi|parlemen)\b/)) { 
            kategori = "Politik"; 
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

    // Filter by selected hours (6/12/24/48)
    let filteredItems = rawItems.filter(item => item.diffHours <= hours);
    
    if (filteredItems.length === 0 && mode !== 'terkini') {
        filteredItems = rawItems.sort((a, b) => a.diffHours - b.diffHours).slice(0, 50);
    }

    // ============= OPSI B: CLUSTERING EMBEDDING SEMANTIK =============
    const clusters = clusterByEmbedding(filteredItems, 0.32);

    let dynamicIssues = [];
    if (mode === 'terkini') {
        // Untuk mode terkini: urut cluster by latest timestamp, volume = ukuran cluster
        clusters.sort((a,b) => b.latestTimestamp - a.latestTimestamp);
        clusters.forEach((cl, idx) => {
          const rep = cl.latestItem;
          const allSources = [];
          const seenSrc = new Set();
          cl.items.forEach(it => {
            if (!seenSrc.has(it.source)) {
              seenSrc.add(it.source);
              allSources.push({ name: `${it.source}`, url: it.link });
            }
          });
          dynamicIssues.push({
            id: idx,
            ...rep,
            volume: cl.items.length, // volume = berapa media bahas isu sama
            clusterSize: cl.items.length,
            clusterCount: cl.items.length,
            sourcesList: allSources.length > 0 ? allSources : rep.sourcesList,
            sourcesCount: allSources.length
          });
        });
    } else {
        // Mode volume / top: volume = ukuran cluster + bonus recency
        clusters.sort((a,b) => {
          // primary sort by cluster size, secondary by recency
          if (b.items.length !== a.items.length) return b.items.length - a.items.length;
          return b.latestTimestamp - a.latestTimestamp;
        });
        clusters.forEach((cl, idx) => {
          const rep = cl.latestItem; // pakai yang terbaru sebagai representatif
          const allSources = [];
          const seenSrc = new Set();
          cl.items.forEach(it => {
            if (!seenSrc.has(it.source)) {
              seenSrc.add(it.source);
              allSources.push({ name: `${it.source}`, url: it.link });
            }
          });
          // volume formula baru: clusterSize * 20 + bonus jam
          const hoursSinceLatest = (now.getTime() - cl.latestTimestamp) / (1000*60*60);
          const recencyBonus = hoursSinceLatest < 6 ? 15 : hoursSinceLatest < 12 ? 8 : 0;
          const volume = (cl.items.length * 20) + recencyBonus + 5;

          dynamicIssues.push({
            id: idx,
            ...rep,
            volume: volume,
            clusterSize: cl.items.length,
            clusterCount: cl.items.length,
            sourcesList: allSources,
            sourcesCount: allSources.length
          });
        });
    }

    if (dynamicIssues.length === 0) {
        dynamicIssues.push({ id: "empty", topik: `Tidak ada berita dalam ${hours} jam terakhir.`, kategori: "Sistem", volume: 0, clusterSize: 0, source: "Sistem", pubDate: "Saat ini", articleTitle: "Radar Sepi", articleDesc: "Tidak ada pemberitaan.", link: "#", sourcesList: [] });
    }

    // Kembalikan 50 teratas
    return NextResponse.json({ success: true, data: dynamicIssues.slice(0, 50), meta: { hours, totalRaw: rawItems.length, totalFiltered: filteredItems.length, clusters: clusters.length } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, data: [], error: String(error) });
  }
}
