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
function clusterByEmbedding(items, threshold=0.30){
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
      // update kategori dominan - prioritaskan kriminal
      const hasKriminal = clusters[best].items.some(it=> it.kategori==="Kriminal");
      if(hasKriminal) clusters[best].dominantKategori="Kriminal";
    } else {
      clusters.push({items:[items[idx]], vectors:[vec], centroid:vec, latestTimestamp:items[idx].timestamp, latestItem:items[idx], dominantKategori:items[idx].kategori});
    }
  });
  return clusters;
}

// === DETEKSI KRIMINAL YANG LEBIH PERMISSIVE ===
const KRIMINAL_KEYWORDS = ["kriminal","narkotika","narkoba","sabu","ganja","ekstasi","pil koplo","pembunuhan","bunuh","mayat","mutilasi","penculikan","culik","sandera","pelecehan","perkosaan","rudapaksa","cabul","asusila","pemerkosaan","kekerasan seksual","lgbt","perampokan","rampok","begal","pemukulan","pengeroyokan","aniaya","penganiayaan","penembakan","bacok","tikam","tusuk","tawuran","maling","pencurian","curi","curanmor","jambret","kdrt","carok","penodongan","pemalakan","preman","korban tewas","diamankan","ditangkap","tersangka","dibacok","ditikam","ditusuk","dibunuh","dibegal","dirampok","korban jiwa","pembacokan","penusukan","pembegalan","pengedar","bandar","kurir","sabu-sabu","korupsi","koruptor"];

function isKriminal(text) {
  const lower = text.toLowerCase();
  return KRIMINAL_KEYWORDS.some(kw => lower.includes(kw));
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
        let kategori="Sosial";
        // Prioritas: Kriminal dulu - permissive includes
        if(isKriminal(textToAnalyze)){
          kategori="Kriminal";
        } else if(textToAnalyze.match(/\b(bencana|gempa|banjir|tsunami|longsor|kebakaran|karhutla|erupsi|meletus|kecelakaan|evakuasi|tim sar|bnpb|bpbd|darurat|cuaca ekstrem|badai|topan|basarnas|penyelamatan)\b/)){
          kategori="Bencana";
        } else if(textToAnalyze.match(/\b(olahraga|atlet|liga|bola|sepak bola|timnas|juara|badminton|motogp|f1|kompetisi|skor|klasemen|olimpiade|medali|pssi|pertandingan|turnamen|klub|pemain|pelatih)\b/)){
          kategori="Olahraga";
        } else if(textToAnalyze.match(/\b(entertainment|artis|selebritas|konser|film|drama|musik|bioskop|hiburan|gosip|sinetron|sutradara|aktor|aktris)\b/)){
          kategori="Entertainment";
        } else if(textToAnalyze.match(/\b(teknologi|inovasi|gadget|smartphone|software|internet|digital|sains|siber|ai|kecerdasan buatan|aplikasi)\b/)){
          kategori="Teknologi";
        } else if(textToAnalyze.match(/\b(finansial|keuangan|ekonomi|saham|ihsg|inflasi|rupiah|kripto|investasi|perbankan|bank|bursa|bisnis)\b/)){
          kategori="Finansial";
        } else if(textToAnalyze.match(/\b(hukum|korupsi|polisi|kpk|pidana|tersangka|peradilan|sidang|hakim|jaksa|vonis|penjara|bareskrim|polri|kejaksaan)\b/)){
          kategori="Hukum";
        } else if(textToAnalyze.match(/\b(pemerintah|presiden|wapres|menteri|kabinet|istana|prabowo|gibran|jokowi|anggaran|kementerian|pemda|apbn|negara|kebijakan)\b/)){
          kategori="Pemerintahan";
        } else if(textToAnalyze.match(/\b(politik|partai|pdip|gerindra|golkar|pemilu|pilkada|dpr|koalisi|oposisi|kpu|bawaslu|demokrasi)\b/)){
          kategori="Politik";
        }

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

    const clusters=clusterByEmbedding(filteredItems, 0.30);
    let dynamicIssues=[];
    if(mode==='terkini'){
      clusters.sort((a,b)=> b.latestTimestamp-a.latestTimestamp);
      clusters.forEach((cl,idx)=>{
        const rep=cl.latestItem;
        const allSources=[]; const seen=new Set();
        cl.items.forEach(it=>{ if(!seen.has(it.source)){ seen.add(it.source); allSources.push({name:`${it.source}`, url:it.link}); }});
        dynamicIssues.push({
          id:idx, ...rep,
          kategori: cl.dominantKategori || rep.kategori, // pakai kategori dominan cluster
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
          kategori: cl.dominantKategori || rep.kategori,
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
