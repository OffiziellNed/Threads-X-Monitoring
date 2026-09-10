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

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2 && !STOP_WORDS.includes(w));
}
function buildTfIdfVectors(docsTokens) {
  const N = docsTokens.length;
  const df = {};
  docsTokens.forEach(tokens => { [...new Set(tokens)].forEach(t=> df[t]=(df[t]||0)+1); });
  const idf = {}; Object.keys(df).forEach(term=>{ idf[term]=Math.log((N+1)/(df[term]+0.5))+1; });
  return docsTokens.map(tokens=>{
    const tf={}; tokens.forEach(t=> tf[t]=(tf[t]||0)+1);
    const len=tokens.length||1; const vec={};
    Object.keys(tf).forEach(t=> vec[t]=(tf[t]/len)*(idf[t]||1));
    return vec;
  });
}
function cosineSim(a,b){
  let dot=0,nA=0,nB=0;
  for(const k in a){ nA+=a[k]*a[k]; if(b[k]) dot+=a[k]*b[k]; }
  for(const k in b) nB+=b[k]*b[k];
  if(!nA||!nB) return 0;
  return dot/(Math.sqrt(nA)*Math.sqrt(nB));
}
function clusterByEmbedding(items, threshold=0.28){
  if(!items.length) return [];
  const docsTokens = items.map(it=> tokenize((it.topik+" "+it.articleDesc).toLowerCase()));
  const vectors = buildTfIdfVectors(docsTokens);
  const clusters=[];
  vectors.forEach((vec,idx)=>{
    let best=-1, bestSim=-1;
    clusters.forEach((cl,cIdx)=>{ const sim=cosineSim(vec, cl.centroid); if(sim>bestSim){bestSim=sim; best=cIdx;} });
    if(bestSim>threshold){
      clusters[best].items.push(items[idx]); clusters[best].vectors.push(vec);
      const allTerms=new Set(); clusters[best].vectors.forEach(v=> Object.keys(v).forEach(k=>allTerms.add(k)));
      const newCent={}; allTerms.forEach(term=>{ let sum=0; clusters[best].vectors.forEach(v=> sum+=(v[term]||0)); newCent[term]=sum/clusters[best].vectors.length; });
      clusters[best].centroid=newCent;
      if(items[idx].timestamp>clusters[best].latestTimestamp){ clusters[best].latestTimestamp=items[idx].timestamp; clusters[best].latestItem=items[idx]; }
    } else {
      clusters.push({items:[items[idx]], vectors:[vec], centroid:vec, latestTimestamp:items[idx].timestamp, latestItem:items[idx]});
    }
  });
  return clusters;
}

function detectKategori(textToAnalyze) {
  const t = textToAnalyze.toLowerCase();
  
  // === GLOBAL - deteksi dulu, tapi jangan kalau ada Indonesia ===
  const hasIndonesia = t.includes("indonesia") || t.includes(" wni ") || t.includes(" nkri ") || t.includes(" pemerintah ri ") || t.includes(" presiden prabowo") || t.includes(" jokowi ") && t.includes("indonesia");
  // Global keywords: politik luar negeri, perang, kebijakan negara lain
  const globalRegex = /\b(amerika|usa\b|united states|china|tiongkok|russia|rusia|ukraina|ukraine|israel|palestina|gaza|iran|irak|suriah|syria|korea utara|korea selatan|jepang|japan|inggris|britania|prancis|france|jerman|germany|uni eropa|european union|nato|pbb|un\b|white house|gedung putih|pentagon|kremlin|biden|trump|putin|xi jinping|netanyahu|zelensky|perang dunia|world war|invasi|invasion|konflik timur tengah|kebijakan luar negeri|foreign policy|hubungan internasional|diplomasi global|perang dagang|trade war)\b/;
  
  if (!hasIndonesia && globalRegex.test(t)) {
    return "Global";
  }
  
  // Kalau ada Indonesia + global, itu bukan Global, biar masuk Politik/Pemerintahan
  if (t.match(/\b(kkb|opm|teroris|terorisme)\b/)) return "Hukum";
  
  const kriminalRegex = /\b(narkotika|narkoba|sabu|ganja|ekstasi|pil koplo|pembunuhan|dibunuh|penculikan|diculik|culik|pelecehan seksual|pelecehan|perkosaan|pemerkosaan|rudapaksa|cabul|asusila|kekerasan seksual|lgbt|perampokan|dirampok|rampok|begal|dibegal|pembegalan|pemukulan|pengeroyokan|dikeroyok|penganiayaan|aniaya|penembakan|ditembak|pembacokan|dibacok|penusukan|penikaman|ditikam|ditusuk|tawuran|pencurian|maling|curanmor|jambret|kdrt|carok|penodongan|pemalakan|premanisme|bandar narkoba|pengedar narkoba)\b/;
  if (kriminalRegex.test(t)) return "Kriminal";
  
  if (t.match(/\b(bencana|gempa|banjir|tsunami|longsor|kebakaran|karhutla|erupsi|meletus|kecelakaan|evakuasi|tim sar|bnpb|bpbd|darurat|cuaca ekstrem|badai|topan|basarnas|penyelamatan|erupsi|krakatau)\b/)) return "Bencana";
  if (t.match(/\b(olahraga|atlet|liga|bola|sepak bola|timnas|juara|badminton|motogp|f1|kompetisi|skor|klasemen|olimpiade|medali|pssi|pertandingan|turnamen|klub|pemain|pelatih)\b/)) return "Olahraga";
  if (t.match(/\b(entertainment|artis|selebritas|konser|film|drama|musik|bioskop|hiburan|gosip|sinetron|sutradara|aktor|aktris)\b/)) return "Entertainment";
  if (t.match(/\b(teknologi|inovasi|gadget|smartphone|software|internet|digital|sains|siber|ai|kecerdasan buatan|aplikasi)\b/)) return "Teknologi";
  if (t.match(/\b(finansial|keuangan|ekonomi|saham|ihsg|inflasi|rupiah|kripto|investasi|perbankan|bank|bursa|bisnis|apbn|bansos|saldo|rekening|krl|perjalanan|bobot)\b/)) return "Finansial";
  if (t.match(/\b(hukum|korupsi|polisi|kpk|pidana|tersangka|peradilan|sidang|hakim|jaksa|vonis|penjara|bareskrim|polri|kejaksaan)\b/)) return "Hukum";
  if (t.match(/\b(pemerintah|presiden|wapres|menteri|kabinet|istana|prabowo|gibran|jokowi|anggaran|kementerian|pemda|apbn|negara|kebijakan|pemkab)\b/)) return "Pemerintahan";
  if (t.match(/\b(politik|partai|pdip|gerindra|golkar|pemilu|pilkada|dpr|koalisi|oposisi|kpu|bawaslu|demokrasi)\b/)) return "Politik";
  
  return "Sosial";
}

async function fetchRss(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const xml = await res.text();
    return xml.split("<item>");
  } catch { return []; }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '12', 10);
    const mode = searchParams.get('mode') || 'volume';

    // === FETCH 4 RSS SEKALIGUS BIAR DAPAT 100+ DATA ===
    const rssUrls = [
      `https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id`,
      `https://news.google.com/rss/search?q=Indonesia&hl=id&gl=ID&ceid=ID:id`,
      `https://news.google.com/rss/headlines/section/topic/NATION?hl=id&gl=ID&ceid=ID:id`,
      `https://news.google.com/rss/headlines/section/topic/WORLD?hl=id&gl=ID&ceid=ID:id`
    ];

    const results = await Promise.all(rssUrls.map(u => fetchRss(u)));
    
    let rawItems=[]; const now=new Date(); const seenLinks=new Set();

    results.forEach(items => {
      if(!items || items.length<2) return;
      for(let i=1;i<items.length;i++){
        const item=items[i];
        const titleMatch=item.match(/<title>([\s\S]*?)<\/title>/);
        const descMatch=item.match(/<description>([\s\S]*?)<\/description>/);
        const dateMatch=item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        if(titleMatch && dateMatch){
          const linkMatch=item.match(/<link>([\s\S]*?)<\/link>/);
          const linkRaw=linkMatch?cleanUrl(linkMatch[1]):"";
          if(seenLinks.has(linkRaw)) continue;
          seenLinks.add(linkRaw);

          const articleDate=new Date(dateMatch[1]);
          const diffHours=(now-articleDate)/(1000*60*60);
          let rawTitle=titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
          const cleanTitle=rawTitle.split(" - ")[0];
          let pureDesc="Tidak ada deskripsi rinci.";
          if(descMatch){
            let rawDesc=descMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1');
            rawDesc=rawDesc.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
            pureDesc=rawDesc.replace(/<[^>]*>?/gm,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
          }
          const sourceMatch=item.match(/<source.*?>([\s\S]*?)<\/source>/);
          let rawSource=sourceMatch?sourceMatch[1]:"Media Nasional";
          let cleanSource=rawSource.split(" - ")[0].split(",")[0].split("|")[0].trim();
          const linkAsli=linkRaw||"#";
          const pubDateRapi=formatPubDate(dateMatch[1]);
          const textToAnalyze=(cleanTitle+" "+pureDesc).toLowerCase();
          const kategori = detectKategori(textToAnalyze);

          rawItems.push({
            topik:cleanTitle, kategori, source:cleanSource, pubDate:pubDateRapi,
            timestamp:articleDate.getTime(), articleTitle:rawTitle, articleDesc:pureDesc,
            link:linkAsli, sourcesList:[{name:`${cleanSource} (Artikel Utama)`, url:linkAsli}], diffHours
          });
        }
      }
    });

    // === FIX JAM: CLUSTER DULU SEMUA, BARU FILTER BY HOURS ===
    // Biar 12 jam muncul, 24 jam = 12 jam + berita lampau, bukan ganti total
    const allClusters = clusterByEmbedding(rawItems, 0.28);
    
    // Filter cluster berdasarkan latestTimestamp dalam rentang jam
    const filteredClusters = allClusters.filter(cl => {
      const hoursSinceLatest = (now.getTime() - cl.latestTimestamp) / (1000*60*60);
      return hoursSinceLatest <= hours;
    });

    // Kalau kosong, ambil yang paling baru 100
    let clustersToUse = filteredClusters.length > 0 ? filteredClusters : allClusters.sort((a,b)=> b.latestTimestamp - a.latestTimestamp).slice(0, 50);

    // === TENTUKAN TOP YANG BENER - HANYA TOP 10, BUKAN SEMUA ===
    // Sort by volume (cluster size + recency)
    const getDominantKategori = (clusterItems) => {
      const counts = {};
      clusterItems.forEach(it => { counts[it.kategori] = (counts[it.kategori]||0)+1; });
      let maxCat = clusterItems[0]?.kategori || "Sosial";
      let maxCount = 0;
      Object.entries(counts).forEach(([cat,cnt])=>{ if(cnt>maxCount){ maxCount=cnt; maxCat=cat; } });
      return maxCat;
    };

    let dynamicIssues=[];
    // Hitung volume untuk semua cluster
    const clustersWithVolume = clustersToUse.map(cl => {
      const hoursSinceLatest=(now.getTime()-cl.latestTimestamp)/(1000*60*60);
      const recencyBonus=hoursSinceLatest<6?15: hoursSinceLatest<12?8: hoursSinceLatest<24?3:0;
      const volume=(cl.items.length*25)+recencyBonus+ (cl.items.length>1?10:0);
      return { cl, volume, hoursSinceLatest };
    }).sort((a,b)=> b.volume - a.volume);

    // TOP = hanya top 10 cluster dengan volume tertinggi DAN minimal clusterSize>=2 atau sources>=2 atau volume>=50
    const topN = Math.min(10, Math.max(5, Math.floor(clustersWithVolume.length * 0.15))); // top 15% tapi max 10
    const topClusterIds = new Set();
    clustersWithVolume.slice(0, topN).forEach(({cl, volume})=>{
      if(cl.items.length>=2 || volume>=50){
        // pakai referensi cluster object untuk marking
        topClusterIds.add(cl);
      }
    });

    clustersWithVolume.forEach(({cl, volume}, idx)=>{
      const rep=cl.latestItem;
      const allSources=[]; const seen=new Set();
      cl.items.forEach(it=>{ if(!seen.has(it.source)){ seen.add(it.source); allSources.push({name:`${it.source}`, url:it.link}); }});
      const isTop = topClusterIds.has(cl);
      dynamicIssues.push({
        id: idx,
        ...rep,
        kategori: getDominantKategori(cl.items),
        volume,
        clusterSize: cl.items.length,
        clusterCount: cl.items.length,
        sourcesList: allSources,
        sourcesCount: allSources.length,
        isTop: isTop // flag beneran TOP
      });
    });

    // Untuk mode terkini, sort by timestamp tapi keep isTop flag
    if(mode==='terkini'){
      dynamicIssues.sort((a,b)=> b.timestamp - a.timestamp);
    } else {
      dynamicIssues.sort((a,b)=> b.volume - a.volume);
    }

    if(dynamicIssues.length===0){
      dynamicIssues.push({ id:"empty", topik:`Tidak ada berita dalam ${hours} jam terakhir.`, kategori:"Sistem", volume:0, clusterSize:0, source:"Sistem", pubDate:"Saat ini", articleTitle:"Radar Sepi", articleDesc:"Tidak ada pemberitaan.", link:"#", sourcesList:[], isTop:false });
    }

    return NextResponse.json({ 
      success:true, 
      data: dynamicIssues.slice(0,100), 
      meta:{
        hours, 
        totalRaw:rawItems.length, 
        totalFiltered: filteredClusters.length, 
        totalClusters: allClusters.length,
        clustersInRange: clustersToUse.length,
        kriminalCount: dynamicIssues.filter(d=>d.kategori==="Kriminal").length,
        globalCount: dynamicIssues.filter(d=>d.kategori==="Global").length,
        topCount: dynamicIssues.filter(d=>d.isTop).length
      } 
    });
  } catch(error){
    console.error(error);
    return NextResponse.json({ success:false, data:[], error:String(error) });
  }
}
