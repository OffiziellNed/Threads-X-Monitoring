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

// === KRIMINAL - STRICT, sesuai request user, TIDAK OVERMATCH ===
function detectKategori(textToAnalyze) {
  const t = textToAnalyze.toLowerCase();
  
  // EXCLUSION: kalau ada KKB/OPM/teroris -> jangan kriminal, masuk Hukum
  if (t.match(/\b(kkb|opm|teroris|terorisme)\b/)) {
    return "Hukum";
  }
  
  // KRIMINAL STRICT - hanya kata yang jelas kriminal sesuai list user
  const kriminalRegex = /\b(narkotika|narkoba|sabu|ganja|ekstasi|pil koplo|pembunuhan|dibunuh|penculikan|diculik|culik|pelecehan seksual|pelecehan|perkosaan|pemerkosaan|rudapaksa|cabul|asusila|kekerasan seksual|lgbt|perampokan|dirampok|rampok|begal|dibegal|pembegalan|pemukulan|pengeroyokan|dikeroyok|penganiayaan|aniaya|penembakan|ditembak|pembacokan|dibacok|penusukan|penikaman|ditikam|ditusuk|tawuran|pencurian|maling|curanmor|jambret|kdrt|carok|penodongan|pemalakan|premanisme|bandar narkoba|pengedar narkoba)\b/;
  
  if (kriminalRegex.test(t)) {
    return "Kriminal";
  }
  
  if (t.match(/\b(bencana|gempa|banjir|tsunami|longsor|kebakaran|karhutla|erupsi|meletus|kecelakaan|evakuasi|tim sar|bnpb|bpbd|darurat|cuaca ekstrem|badai|topan|basarnas|penyelamatan|erupsi|anak krakatau)\b/)) return "Bencana";
  if (t.match(/\b(olahraga|atlet|liga|bola|sepak bola|timnas|juara|badminton|motogp|f1|kompetisi|skor|klasemen|olimpiade|medali|pssi|pertandingan|turnamen|klub|pemain|pelatih)\b/)) return "Olahraga";
  if (t.match(/\b(entertainment|artis|selebritas|konser|film|drama|musik|bioskop|hiburan|gosip|sinetron|sutradara|aktor|aktris)\b/)) return "Entertainment";
  if (t.match(/\b(teknologi|inovasi|gadget|smartphone|software|internet|digital|sains|siber|ai|kecerdasan buatan|aplikasi)\b/)) return "Teknologi";
  if (t.match(/\b(finansial|keuangan|ekonomi|saham|ihsg|inflasi|rupiah|kripto|investasi|perbankan|bank|bursa|bisnis|apbn|bansos|saldo|rekening|krl|perjalanan|bobot|digital)\b/)) return "Finansial";
  if (t.match(/\b(hukum|korupsi|polisi|kpk|pidana|tersangka|peradilan|sidang|hakim|jaksa|vonis|penjara|bareskrim|polri|kejaksaan|kkb|opm)\b/)) return "Hukum";
  if (t.match(/\b(pemerintah|presiden|wapres|menteri|kabinet|istana|prabowo|gibran|jokowi|anggaran|kementerian|pemda|apbn|negara|kebijakan|pemkab|jayawijaya)\b/)) return "Pemerintahan";
  if (t.match(/\b(politik|partai|pdip|gerindra|golkar|pemilu|pilkada|dpr|koalisi|oposisi|kpu|bawaslu|demokrasi)\b/)) return "Politik";
  
  return "Sosial";
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '12', 10);
    const mode = searchParams.get('mode') || 'volume';
    const rssUrl = `https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id`;
    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();
    const items = xmlText.split("<item>");
    let rawItems=[]; const now=new Date();

    for(let i=1;i<items.length;i++){
      const item=items[i];
      const titleMatch=item.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch=item.match(/<description>([\s\S]*?)<\/description>/);
      const dateMatch=item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      if(titleMatch && dateMatch){
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
        const linkMatch=item.match(/<link>([\s\S]*?)<\/link>/);
        let rawSource=sourceMatch?sourceMatch[1]:"Media Nasional";
        let cleanSource=rawSource.split(" - ")[0].split(",")[0].split("|")[0].trim();
        const linkAsli=linkMatch?cleanUrl(linkMatch[1]):"#";
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

    let filteredItems=rawItems.filter(item=> item.diffHours<=hours);
    if(filteredItems.length===0 && mode!=='terkini'){
      filteredItems=rawItems.sort((a,b)=> a.diffHours-b.diffHours).slice(0,100);
    }

    const clusters=clusterByEmbedding(filteredItems, 0.28);
    let dynamicIssues=[];
    
    // Tentukan kategori dominan cluster dengan majority vote, BUKAN any
    const getDominantKategori = (clusterItems) => {
      const counts = {};
      clusterItems.forEach(it => { counts[it.kategori] = (counts[it.kategori]||0)+1; });
      let maxCat = clusterItems[0]?.kategori || "Sosial";
      let maxCount = 0;
      Object.entries(counts).forEach(([cat,cnt])=>{ if(cnt>maxCount){ maxCount=cnt; maxCat=cat; } });
      return maxCat;
    };

    if(mode==='terkini'){
      clusters.sort((a,b)=> b.latestTimestamp-a.latestTimestamp);
      clusters.forEach((cl,idx)=>{
        const rep=cl.latestItem;
        const allSources=[]; const seen=new Set();
        cl.items.forEach(it=>{ if(!seen.has(it.source)){ seen.add(it.source); allSources.push({name:`${it.source}`, url:it.link}); }});
        dynamicIssues.push({
          id:idx, ...rep,
          kategori: getDominantKategori(cl.items),
          volume: cl.items.length,
          clusterSize: cl.items.length, clusterCount:cl.items.length,
          sourcesList: allSources.length?allSources:rep.sourcesList, sourcesCount: allSources.length
        });
      });
    } else {
      clusters.sort((a,b)=>{
        if(b.items.length!==a.items.length) return b.items.length-a.items.length;
        return b.latestTimestamp-a.latestTimestamp;
      });
      clusters.forEach((cl,idx)=>{
        const rep=cl.latestItem;
        const allSources=[]; const seen=new Set();
        cl.items.forEach(it=>{ if(!seen.has(it.source)){ seen.add(it.source); allSources.push({name:`${it.source}`, url:it.link}); }});
        const hoursSinceLatest=(now.getTime()-cl.latestTimestamp)/(1000*60*60);
        const recencyBonus=hoursSinceLatest<6?15: hoursSinceLatest<12?8: hoursSinceLatest<24?3:0;
        const volume=(cl.items.length*20)+recencyBonus+5;
        dynamicIssues.push({
          id:idx, ...rep,
          kategori: getDominantKategori(cl.items),
          volume, clusterSize:cl.items.length, clusterCount:cl.items.length,
          sourcesList: allSources, sourcesCount: allSources.length
        });
      });
    }

    if(dynamicIssues.length===0){
      dynamicIssues.push({ id:"empty", topik:`Tidak ada berita dalam ${hours} jam terakhir.`, kategori:"Sistem", volume:0, clusterSize:0, source:"Sistem", pubDate:"Saat ini", articleTitle:"Radar Sepi", articleDesc:"Tidak ada pemberitaan.", link:"#", sourcesList:[] });
    }

    return NextResponse.json({ success:true, data: dynamicIssues.slice(0,100), meta:{hours, totalRaw:rawItems.length, totalFiltered:filteredItems.length, clusters:clusters.length, kriminalCount: dynamicIssues.filter(d=>d.kategori==="Kriminal").length } });
  } catch(error){
    console.error(error);
    return NextResponse.json({ success:false, data:[], error:String(error) });
  }
}
