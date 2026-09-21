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
  return text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2 &&!STOP_WORDS.includes(w));
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
  if (/ekspor|impor|neraca perdagangan/i.test(t)) return "Global";
  if (/perang|peperangan|perang dagang|trade war|invasi|agresi militer|konflik bersenjata|rudal|nuklir/i.test(t)) return "Global";
  if (/indonesia.*(china|tiongkok|amerika|usa|rusia|jepang|korea|india|australia|malaysia|singapura|arab|inggris|prancis|jerman|eropa|israel|palestina|ukraina|iran|irak)/i.test(t)) return "Global";
  if (/hubungan bilateral|kerjasama bilateral|hubungan diplomatik|hubungan antar negara|antar negara|kunjungan kenegaraan|diplomasi global|hubungan internasional|luar negeri/i.test(t)) return "Global";
  if (/amerika serikat|tiongkok|perang dunia|world war|white house|gedung putih|pentagon|kremlin|biden|trump|putin|xi jinping|netanyahu|zelensky/i.test(t)) {
    if (!t.includes("dpr ri") &&!t.includes("dpd ri")) return "Global";
  }
  if (/narkotika|narkoba|sabu|ganja|ekstasi|pembunuhan|dibunuh|penculikan|diculik|pelecehan seksual|perkosaan|perampokan|begal|pembegalan|pemukulan|pengeroyokan|penganiayaan|penembakan|pembacokan|penusukan|tawuran|pencurian|maling|curanmor|jambret|kdrt|bandar narkoba/i.test(t)) return "Kriminal";
  if (/dpd ri|dpr ri|dpr-ri|dpd-ri|mpr ri|komisi.*dpr|anggota dewan|parlemen|menteri|kabinet|kementerian|istana|presiden prabowo|wapres gibran|pemerintah|pemda|kemenkeu|kemendagri|apbn|apbd|birokrasi|perpres|keppres/i.test(t)) return "Pemerintahan";
  if (/harga emas|harga perak|harga minyak|emas naik|emas turun|logam mulia|antam|ihsg|saham|inflasi|suku bunga|bi rate|nilai tukar|rupiah|kurs|dollar|kripto|ojk|bursa efek|investasi|ekonomi|keuangan/i.test(t)) return "Finansial";
  if (/taekwondo|sepak bola|bola voli|voli|basket|bulu tangkis|badminton|tenis|atlet|olimpiade|sea games|pon|piala dunia|liga 1|persija|persib|timnas|gulat|karate|judo|p
