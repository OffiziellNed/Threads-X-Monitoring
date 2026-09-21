"use client";
import React, { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, ExternalLink, Search, Flame, PlaySquare } from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [topNewsData, setTopNewsData] = useState([]);
  const [terkiniData, setTerkiniData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [isTopNewsFilter, setIsTopNewsFilter] = useState(false);
  const [selectedHours, setSelectedHours] = useState(12);
  const categories = ["Semua", "Politik", "Pemerintahan", "Sosial", "Hukum", "Kriminal", "Bencana", "Entertainment", "Olahraga", "Teknologi", "Finansial", "Global"];
  const hoursOptions = [6, 12, 24, 48];

  const fetchLiveTrends = async () => {
    setIsLoading(true);
    try {
      const h = selectedHours;
      const epTop = `?hours=${h}&t=${Date.now()}`;
      const epTerkini = `?hours=${h}&mode=terkini&t=${Date.now()}`;
      let pNews = "api/news", pPdip = "api/pdip", pMega = "api/megawati", pPuan = "api/puan", pBenc = "api/bencana", pJkt = "api/jakarta";
      let uTop = "", uTerkini = "";
      if (currentPage === "bencana") { uTop = `/${pBenc}${epTop}`; uTerkini = `/${pBenc}${epTerkini}`; }
      if (currentPage === "pdip") { uTop = `/${pPdip}${epTop}`; uTerkini = `/${pPdip}${epTerkini}`; }
      if (currentPage === "megawati") { uTop = `/${pMega}${epTop}`; uTerkini = `/${pMega}${epTerkini}`; }
      if (currentPage === "puan") { uTop = `/${pPuan}${epTop}`; uTerkini = `/${pPuan}${epTerkini}`; }
      if (currentPage === "nasional") { uTop = `/${pNews}${epTop}`; uTerkini = `/${pNews}${epTerkini}`; }
      if (currentPage === "jakarta") { uTop = `/${pJkt}${epTop}`; uTerkini = `/${pJkt}${epTerkini}`; }
      if (uTop && uTerkini) {
        const resTop = await fetch(uTop, { cache: "no-store" }).then(r => r.json()).catch(() => ({success: false, data: []}));
        const resTerkini = await fetch(uTerkini, { cache: "no-store" }).then(r => r.json()).catch(() => ({success: false, data: []}));
        if (resTop && resTop.success) setTopNewsData(resTop.data); else setTopNewsData([]);
        if (resTerkini && resTerkini.success) setTerkiniData(resTerkini.data); else setTerkiniData([]);
      }
    } catch { setTopNewsData([]); setTerkiniData([]); } finally { setIsLoading(false); }
  };

  useEffect(() => { if (currentPage!== "main") fetchLiveTrends(); }, [currentPage, selectedHours]);
  useEffect(() => { if (currentPage!== "main") { setSelectedCategory("Semua"); setIsTopNewsFilter(false); } }, [currentPage]);

  const formatDateTime = (pubDateStr) => {
    if (!pubDateStr) return { date: "-", time: "-" };
    const parts = pubDateStr.split(" pukul "); if (parts.length === 2) return { date: parts[0], time: parts[1] };
    return { date: pubDateStr, time: "-" };
  };
  const getCleanLink = (isu) => { if (isu.sourcesList && isu.sourcesList.length > 0) return isu.sourcesList[0].url; return isu.link || "#"; };
  const tableData = (() => { let data = isTopNewsFilter? topNewsData : terkiniData; if (selectedCategory!== "Semua") data = data.filter(d => d.kategori === selectedCategory); return data; })();
  const getPageTitle = () => {
    if (currentPage === "jakarta") return "Jakarta Hari Ini";
    if (currentPage === "nasional") return "Berita Nasional";
    if (currentPage === "bencana") return "Bencana Terkini";
    if (currentPage === "pdip") return "PDI Perjuangan";
    if (currentPage === "megawati") return "Megawati Soekarnoputri";
    if (currentPage === "puan") return "Puan Maharani";
    return "Daftar Monitor Isu";
  };

  if (currentPage === "main") {
    return (
      <main className="h-screen w-screen overflow-hidden bg-[#0d1117] flex flex-col items-center justify-center p-3 md:p-6">
        <div className="w-full max-w-5xl flex flex-col items-center justify-center gap-4 md:gap-6 h-full max-h-">
          <div className="text-center shrink-0">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">Public Trend Radar</h1>
            <p className="text-gray-400 text-xs md:text-base">Monitoring isu publik terupdate secara real-time.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 w-full px-1 md:px-4 mt-2">
            <div className="bg-[#161b22] rounded-2xl p-3 md:p-5 border border-[#21262d] flex flex-col items-center justify-between text-center h- md:h- hover:border-orange-500/50 cursor-pointer group" onClick={() => setCurrentPage("jakarta")}>
              <img src="/jakarta.png" alt="Jakarta" className="w-16 h-16 md:w-24 md:h-24 rounded-2xl object-cover shadow-lg border border-[#1c2128] group-hover:scale-105 transition-transform" />
              <h2 className="text-white font-bold text- md:text- mt-2">Jakarta</h2>
              <button className="bg-[#374151] group-hover:bg-orange-600 text-white py-1.5 px-4 rounded-lg text- md:text-xs font-bold flex items-center gap-1.5 mt-2"><Search size={12}/> Cek Sekarang</button>
            </div>
            <div className="bg-[#161b22] rounded-2xl p-3 md:p-5 border border-[#21262d] flex flex-col items-center justify-between text-center h- md:h- hover:border-blue-500/50 cursor-pointer group" onClick={() => setCurrentPage("nasional")}>
              <img src="/nasional.png" alt="Nasional" className="w-16 h-16 md:w-24 md:h-24 rounded-2xl object-cover shadow-lg border border-[#1c2128] group-hover:scale-105 transition-transform" />
              <h2 className="text-white font-bold text- md:text- mt-2">Berita Nasional</h2>
              <button className="bg-[#374151] group-hover:bg-[#4b5563] text-white py-1.5 px-4 rounded-lg text- md:text-xs font-bold flex items-center gap-1.5 mt-2"><Search size={12}/> Cek Sekarang</button>
            </div>
            <div className="bg-[#161b22] rounded-2xl p-3 md:p-5 border border-[#21262d] flex flex-col items-center justify-between text-center h- md:h- hover:border-red-500/30 cursor-pointer group" onClick={() => setCurrentPage("bencana")}>
              <img src="/bencana.png" alt="Bencana" className="w-16 h-16 md:w-24 md:h-24 rounded-2xl object-cover shadow-lg border border-[#1c2128] group-hover:scale-105 transition-transform" />
              <h2 className="text-white font-bold text- md:text- mt-2">Bencana Terkini</h2>
              <button className="bg-[#374151] group-hover:bg-[#4b5563] text-white py-1.5 px-4 rounded-lg text- md:text-xs font-bold flex items-center gap-1.5 mt-2"><Search size={12}/> Cek Sekarang</button>
            </div>
            <div className="bg-[#161b22] rounded-2xl p-3 md:p-5 border border-[#21262d] flex flex-col items-center justify-between text-center h- md:h- hover:border-red-600/40 cursor-pointer group" onClick={() => setCurrentPage("pdip")}>
              <img src="/pdip.png" alt="PDIP" className="w-16 h-16 md:w-24 md:h-24 rounded-2xl object-cover shadow-lg border border-[#1c2128] group-hover:scale-105 transition-transform" />
              <h2 className="text-white font-bold text- md:text- mt-2">PDI Perjuangan</h2>
              <button className="bg-[#374151] group-hover:bg-[#4b5563] text-white py-1.5 px-4 rounded-lg text- md:text-xs font-bold flex items-center gap-1.5 mt-2"><Search size={12}/> Cek Sekarang</button>
            </div>
            <div className="bg-[#161b22] rounded-2xl p-3 md:p-5 border border-[#21262d] flex flex-col items-center justify-between text-center h- md:h- hover:border-red-600/40 cursor-pointer group" onClick={() => setCurrentPage("megawati")}>
              <img src="/megawati.png" alt="Megawati" className="w-16 h-16 md:w-24 md:h-24 rounded-2xl object-cover shadow-lg border border-[#1c2128] group-hover:scale-105 transition-transform" />
              <h2 className="text-white font-bold text- md:text- mt-2">Megawati</h2>
              <button className="bg-[#374151] group-hover:bg-[#4b5563] text-white py-1.5 px-4 rounded-lg text- md:text-xs font-bold flex items-center gap-1.5 mt-2"><Search size={12}/> Cek Sekarang</button>
            </div>
            <div className="bg-[#161b22] rounded-2xl p-3 md:p-5 border border-[#21262d] flex flex-col items-center justify-between text-center h- md:h- hover:border-red-600/40 cursor-pointer group">
              <img src="/puan.png" alt="Puan" className="w-16 h-16 md:w-24 md:h-24 rounded-2xl object-cover object-top shadow-lg border border-[#1c2128] group-hover:scale-105 transition-transform" />
              <h2 className="text-white font-bold text- md:text- mt-2">Puan Maharani</h2>
              <div className="flex gap-1.5 mt-2">
                <button onClick={() => setCurrentPage("puan")} className="bg-[#374151] hover:bg-[#4b5563] text-white py-1.5 px-3 rounded-lg text- md:text-xs font-bold flex items-center gap-1"><Search size={10}/> Cek</button>
                <button onClick={() => setCurrentPage("puan-yt-analysis")} className="bg-transparent text-gray-400 hover:bg-[#1c2128] hover:text-white py-1.5 px-2 rounded-lg text- md:text-xs font-bold flex items-center gap-1"><PlaySquare size={10}/> YT</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#0d1117] text-gray-200 flex flex-col items-center">
      <div className="w-full max-w- mt-4">
        <div className="flex justify-between items-center w-full px-2 mb-8">
          <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"><ArrowLeft size={16}/> Menu Utama</button>
          <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">{currentPage === "jakarta" && <img src="/jakarta.png" className="w-7 h-7 rounded-lg" alt=""/>}{getPageTitle()}</h1>
          <button onClick={() => fetchLiveTrends()} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white"><RefreshCw size={14}/> Refresh</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-6 px-2">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${selectedCategory === cat? "bg-[#1f6feb] text-white" : "bg-[#1c2128] text-gray-400 hover:text-white"}`}>{cat}</button>
          ))}
        </div>
        <div className="flex flex-col items-center gap-3 mb-6">
          <p className="text- text-gray-500 uppercase tracking-widest font-bold">Rentang Waktu Berita</p>
          <div className="flex gap-2 bg-[#161b22] p-1 rounded-xl border border-[#21262d]">
            {hoursOptions.map(h => (
              <button key={h} onClick={() => setSelectedHours(h)} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${selectedHours === h? "bg-white text-black" : "text-gray-400 hover:text-white"}`}>{h} Jam</button>
            ))}
          </div>
        </div>
        {isLoading? <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div> : (
          <div className="bg-[#161b22] rounded-2xl shadow-2xl overflow-hidden pb-6">
            <div className="w-full px-4 md:px-6 py-4 flex justify-between items-center">
              <span className="text-xs text-gray-500">Total: {tableData.length} / {terkiniData.length} data</span>
              <button onClick={() => setIsTopNewsFilter(!isTopNewsFilter)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isTopNewsFilter? "bg-[#331c0b] text-orange-500" : "bg-[#1c2128] text-gray-400"}`}><Flame size={14} /> Filter Top News</button>
            </div>
            {tableData.length > 0? tableData.map((isu, idx) => {
              const { date, time } = formatDateTime(isu.pubDate);
              const link = getCleanLink(isu);
              return (
                <div key={idx} className="border-b border-[#21262d] p-4 flex flex-col gap-2 hover:bg-[#1a1f26]">
                  <div className="flex justify-between"><span className="text- bg-[#172033] text-blue-400 px-2 py-1 rounded font-bold uppercase">{isu.kategori}</span><span className="text- text-gray-500">#{idx+1}</span></div>
                  <h3 className="text-gray-200 text-sm font-medium">{isu.topik}</h3>
                  <div className="text-xs text-gray-500 flex gap-2"><span>{date}</span><span>•</span><span>{time}</span><span>•</span><span>{isu.source}</span></div>
                  {link!== "#" && <a href={link} target="_blank" className="bg-[#374151] text-white py-1.5 px-4 rounded-lg text-xs font-bold w-max flex items-center gap-1"><ExternalLink size={12}/> Baca</a>}
                </div>
              );
            }) : <div className="flex flex-col items-center justify-center py-16"><Search size={40} className="text-gray-600 mb-4" /><p className="text-gray-400">Tidak ada data yang ditemukan.</p></div>}
          </div>
        )}
      </div>
    </main>
  );
}
