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
  // 1. GLOBAL - sesuai 6 aturan baru
  if (/ekspor|impor|neraca perdagangan/i.test(t)) return "Global";
  if (/perang|peperangan|perang dagang|trade war|invasi|agresi militer|konflik bersenjata|rudal|nuklir/i.test(t)) return "Global";
  if (/indonesia.*(china|tiongkok|amerika|usa|rusia|jepang|korea|india|australia|malaysia|singapura|arab|inggris|prancis|jerman|eropa|israel|palestina|ukraina|iran|irak)/i.test(t)) return "Global";
  if (/hubungan bilateral|kerjasama bilateral|hubungan diplomatik|hubungan antar negara|antar negara|kunjungan kenegaraan|diplomasi global|hubungan internasional|luar negeri/i.test(t)) return "Global";
  if (/amerika serikat|tiongkok|perang dunia|world war|white house|gedung putih|pentagon|kremlin|biden|trump|putin|xi jinping|netanyahu|zelensky/i.test(t)) {
    if (!t.includes("dpr ri") && !t.includes("dpd ri")) return "Global";
  }
  // 2. KRIMINAL
  if (/narkotika|narkoba|sabu|ganja|ekstasi|pembunuhan|dibunuh|penculikan|diculik|pelecehan seksual|perkosaan|perampokan|begal|pembegalan|pemukulan|pengeroyokan|penganiayaan|penembakan|pembacokan|penusukan|tawuran|pencurian|maling|curanmor|jambret|kdrt|bandar narkoba/i.test(t)) return "Kriminal";
  // 3. PEMERINTAHAN - DPD RI, DPR RI
  if (/dpd ri|dpr ri|dpr-ri|dpd-ri|mpr ri|komisi.*dpr|anggota dewan|parlemen|menteri|kabinet|kementerian|istana|presiden prabowo|wapres gibran|pemerintah|pemda|kemenkeu|kemendagri|apbn|apbd|birokrasi|perpres|keppres/i.test(t)) return "Pemerintahan";
  // 4. FINANSIAL - Harga Emas
  if (/harga emas|harga perak|harga minyak|emas naik|emas turun|logam mulia|antam|ihsg|saham|inflasi|suku bunga|bi rate|nilai tukar|rupiah|kurs|dollar|kripto|ojk|bursa efek|investasi|ekonomi|keuangan/i.test(t)) return "Finansial";
  // 5. OLAHRAGA - Taekwondo
  if (/taekwondo|sepak bola|bola voli|voli|basket|bulu tangkis|badminton|tenis|atlet|olimpiade|sea games|pon|piala dunia|liga 1|persija|persib|timnas|gulat|karate|judo|pencak silat|renang|marathon|balap|motogp|f1|juara|medali|pssi|pertandingan|turnamen|klub|pelatih|skor|klasemen/i.test(t)) return "Olahraga";
  if (/bencana|gempa|banjir|tsunami|longsor|kebakaran|karhutla|erupsi|meletus|kecelakaan|evakuasi|tim sar|bnpb|bpbd|darurat|cuaca ekstrem|badai|topan|basarnas/i.test(t)) return "Bencana";
  if (/entertainment|artis|selebritas|konser|film|drama|musik|bioskop|hiburan|gosip|sinetron|sutradara|aktor|aktris/i.test(t)) return "Entertainment";
  if (/teknologi|inovasi|gadget|smartphone|software|internet|digital|sains|siber|ai|kecerdasan buatan|aplikasi|startup/i.test(t)) return "Teknologi";
  if (/hukum|korupsi|polisi|kpk|pidana|tersangka|peradilan|sidang|hakim|jaksa|vonis|penjara|bareskrim|polri|kejaksaan/i.test(t)) return "Hukum";
  if (/politik|partai|pdip|gerindra|golkar|nasdem|pemilu|pilkada|koalisi|oposisi|kpu|bawaslu|demokrasi/i.test(t)) return "Politik";
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




async function fetchRss(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const txt = await res.text();
    return txt.split("<item>");
  } catch { return []; }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '12', 10);
    const mode = searchParams.get('mode') || 'volume';
    const rssUrls = [
      `https://news.google.com/rss/search?q=Bencana&hl=id&gl=ID&ceid=ID:id`,
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
            link:linkAsli, sourcesList:[{name:`${cleanSource} (Artikel Utama)`, url:linkAsli}], diffHours: (now-articleDate)/(1000*60*60)
          });
        }
      }
    });
    const allClusters = clusterByEmbedding(rawItems, 0.28);
    const filteredClusters = allClusters.filter(cl => {
      const hoursSinceLatest = (now.getTime() - cl.latestTimestamp) / (1000*60*60);
      return hoursSinceLatest <= hours;
    });
    let clustersToUse = filteredClusters.length > 0 ? filteredClusters : allClusters.sort((a,b)=> b.latestTimestamp - a.latestTimestamp).slice(0, 50);
    const getDominantKategori = (clusterItems) => {
      const counts = {};
      clusterItems.forEach(it => { counts[it.kategori] = (counts[it.kategori]||0)+1; });
      let maxCat = clusterItems[0]?.kategori || "Sosial";
      let maxCount = 0;
      Object.entries(counts).forEach(([cat,cnt])=>{ if(cnt>maxCount){ maxCount=cnt; maxCat=cat; } });
      return maxCat;
    };
    let dynamicIssues=[];
    const clustersWithScore = clustersToUse.map(cl => {
      const score = computeClusterScore(cl);
      return { cl, score, compositeScore: score.compositeScore };
    }).sort((a,b)=> b.compositeScore - a.compositeScore);
    clustersWithScore.forEach(({cl, score}, idx)=>{
      const rep=cl.latestItem;
      const allSources=[]; const seen=new Set();
      cl.items.forEach(it=>{ if(!seen.has(it.source)){ seen.add(it.source); allSources.push({name:`${it.source}`, url:it.link}); }});
      dynamicIssues.push({
        id: idx,
        ...rep,
        kategori: getDominantKategori(cl.items),
        volume: score.compositeScore,
        compositeScore: score.compositeScore,
        velocity: score.velocity,
        sourceWeightScore: score.sourceWeightScore,
        tier1Count: score.tier1Count,
        tier2Count: score.tier2Count,
        tier3Count: score.tier3Count,
        distinctSources: score.distinctSources,
        recencyBonus: score.recencyBonus,
        crossPlatform: score.crossPlatform,
        topLevel: score.topLevel,
        topLabel: score.topLabel,
        isTop: score.isTop,
        isTrending: score.isTop,
        clusterSize: cl.items.length,
        clusterCount: cl.items.length,
        sourcesList: allSources,
        sourcesCount: allSources.length
      });
    });
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
