"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, ExternalLink, Calendar, Building2, Filter, DownloadCloud, Copy, CheckCircle2, PlaySquare } from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [previousPage, setPreviousPage] = useState("main");
  const [selectedIssue, setSelectedIssue] = useState(null);
  
  const [issuesData, setIssuesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // State YouTube
  const [ytData, setYtData] = useState([]);
  const [isLoadingYt, setIsLoadingYt] = useState(false);
  const [ytSortMode, setYtSortMode] = useState("views"); 
  const [ytFetchMode, setYtFetchMode] = useState("umum"); // 'umum' atau 'kol'
  
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const categories = ["Semua", "Politik", "Pemerintahan", "Sosial", "Hukum", "Bencana", "Entertainment", "Olahraga", "Teknologi", "Finansial"];

  const [isScraping, setIsScraping] = useState(false);
  const [scrapedResult, setScrapedResult] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const fetchLiveTrends = async () => {
    setIsLoading(true);
    try {
      let endpoint = '';
      if (currentPage === 'bencana-24jam') endpoint = `/api/bencana?t=${Date.now()}`;
      else if (currentPage.includes('pdip')) {
        if (currentPage.includes('terkini')) endpoint = `/api/pdip?hours=24&mode=terkini&t=${Date.now()}`;
        else endpoint = `/api/pdip?hours=12&t=${Date.now()}`;
      } 
      else if (currentPage.includes('megawati')) {
        if (currentPage.includes('terkini')) endpoint = `/api/megawati?hours=24&mode=terkini&t=${Date.now()}`;
        else endpoint = `/api/megawati?hours=12&t=${Date.now()}`;
      } 
      else if (currentPage.includes('puan')) {
        if (currentPage.includes('terkini')) endpoint = `/api/puan?hours=24&mode=terkini&t=${Date.now()}`;
        else endpoint = `/api/puan?hours=12&t=${Date.now()}`;
      } 
      else {
        if (currentPage.includes('terkini')) endpoint = `/api/news?hours=24&mode=terkini&t=${Date.now()}`;
        else endpoint = `/api/news?hours=12&t=${Date.now()}`;
      }
      const response = await fetch(endpoint, { cache: 'no-store' });
      const result = await response.json();
      if (result.success) setIssuesData(result.data);
    } catch (error) {} 
    finally { setIsLoading(false); }
  };

  const fetchYoutubeData = async () => {
    setIsLoadingYt(true);
    try {
      // Fetch berdasarkan Tab yang aktif (Umum / KOL)
      const response = await fetch(`/api/puan-yt?mode=${ytFetchMode}&t=${Date.now()}`, { cache: 'no-store' });
      const result = await response.json();
      if (result.success) setYtData(result.data);
    } catch (error) {} 
    finally { setIsLoadingYt(false); }
  };

  useEffect(() => {
    if (currentPage === "puan-yt-analysis") fetchYoutubeData();
    else if (currentPage !== "main" && currentPage !== "detail") {
      fetchLiveTrends();
      setSelectedCategory("Semua"); 
    }
  }, [currentPage, ytFetchMode]);

  const handleOpenDetail = (isu) => {
    setSelectedIssue(isu);
    setScrapedResult(""); 
    setIsCopied(false);
    setPreviousPage(currentPage); 
    setCurrentPage("detail");
  };

  const handleSedotData = () => {
    setIsScraping(true);
    setIsCopied(false);
    setTimeout(() => {
      const promptInstruction = "Buatkan saya opini singkat untuk postingan threads atau X, 10 dalam konteks pro dan 10 dalam konteks kontra.";
      const title = selectedIssue.topik || "Tanpa Judul"; 
      const content = selectedIssue.articleDesc || "Tidak ada deskripsi rinci.";
      setScrapedResult(`${promptInstruction}\n\n[JUDUL TOPIK]\n${title}\n\n[DESKRIPSI & ISI KONTEN]\n${content}`);
      setIsScraping(false);
    }, 1000);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(scrapedResult);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000); 
  };

  const isBencanaMode = currentPage === "bencana-24jam" || (currentPage === "detail" && previousPage === "bencana-24jam");
  const isTerkiniMode = currentPage.includes("terkini") || isBencanaMode || (currentPage === "detail" && (previousPage.includes("terkini") || previousPage === "bencana-24jam"));
  const filteredData = isTerkiniMode ? issuesData : (selectedCategory === "Semua" ? issuesData : issuesData.filter(issue => issue.kategori === selectedCategory));
  const listData = filteredData.slice(0, isTerkiniMode ? 20 : 10); 
  const isRedTheme = currentPage.includes("pdip") || currentPage.includes("puan") || currentPage.includes("megawati") || (currentPage === "detail" && (previousPage.includes("pdip") || previousPage.includes("puan") || previousPage.includes("megawati")));

  // =========================================================================
  // HALAMAN YOUTUBE DATA ANALYSIS (TABEL EXCEL STYLE)
  // =========================================================================
  if (currentPage === "puan-yt-analysis") {
    
    // Sortir data tabel berdasarkan pilihan filter secara lokal
    let sortedYtVideos = [];
    if (ytData && ytData.length > 0) {
      sortedYtVideos = [...ytData].sort((a, b) => b[ytSortMode] - a[ytSortMode]);
    }

    return (
      <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
        <div className="w-full max-w-6xl space-y-6 mt-4">
          
          <div className="flex justify-between items-center">
            <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-gray-400 hover:text-white">
              <ArrowLeft size={20} /> Menu Utama
            </button>
            <button onClick={fetchYoutubeData} className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] px-4 py-2 rounded-xl text-sm hover:border-white transition-colors">
              <RefreshCw size={16} className={isLoadingYt ? "animate-spin" : ""} /> Refresh Data (Actual)
            </button>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden flex flex-col items-center">
            
            {/* TAB MENU: UMUM VS KOL */}
            <div className="w-full bg-[#0d1117] flex items-center border-b border-[#30363d]">
              <button onClick={() => setYtFetchMode("umum")} className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${ytFetchMode === "umum" ? "border-red-500 text-red-500 bg-red-950/10" : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#161b22]"}`}>
                Pemantauan Semua Saluran
              </button>
              <button onClick={() => setYtFetchMode("kol")} className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${ytFetchMode === "kol" ? "border-blue-500 text-blue-500 bg-blue-950/10" : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#161b22]"}`}>
                KOL / Berita (Targeted 10 Media)
              </button>
            </div>

            <div className="w-full p-6 border-b border-[#30363d] flex flex-col lg:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <PlaySquare size={28} className={ytFetchMode === "kol" ? "text-blue-500" : "text-red-500"} />
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">YouTube Data Analysis: Puan Maharani & Ketua DPR</h2>
                  <p className="text-sm text-gray-400">
                    {ytFetchMode === "kol" ? "Melacak 10 Akun VIP Media & KOL dalam 7 hari terakhir." : "Menampilkan rilis publik 7 hari terakhir (Difilter > 1.000 Views)."}
                  </p>
                </div>
              </div>
              
              {/* TOMBOL FILTER TABEL */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-gray-500 mr-1">Urutkan:</span>
                <button onClick={() => setYtSortMode("views")} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${ytSortMode === "views" ? "bg-white text-black border-white" : "bg-transparent text-gray-400 border-[#30363d] hover:bg-[#1c2128]"}`}>
                  View Terbesar
                </button>
                <button onClick={() => setYtSortMode("likes")} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${ytSortMode === "likes" ? "bg-blue-600 text-white border-blue-500" : "bg-transparent text-gray-400 border-[#30363d] hover:bg-[#1c2128]"}`}>
                  Like Terbesar
                </button>
                <button onClick={() => setYtSortMode("dislikes")} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${ytSortMode === "dislikes" ? "bg-red-600 text-white border-red-500" : "bg-transparent text-gray-400 border-[#30363d] hover:bg-[#1c2128]"}`}>
                  Dislike Terbesar
                </button>
              </div>
            </div>

            {/* TABEL DATA EXCEL STYLE */}
            {isLoadingYt ? (
              <div className="w-full flex justify-center items-center h-64">
                <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${ytFetchMode === 'kol' ? 'border-blue-500' : 'border-red-500'}`}></div>
              </div>
            ) : sortedYtVideos.length > 0 ? (
              <div className="w-full px-6 py-2 overflow-hidden">
                <table className="w-full border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-[#30363d] text-gray-400 text-[11px] md:text-xs uppercase tracking-wider">
                      <th className="py-4 px-2 font-semibold text-center w-10">No</th>
                      <th className="py-4 px-2 font-semibold text-left whitespace-nowrap w-24">Tanggal</th>
                      <th className="py-4 px-2 font-semibold text-left whitespace-nowrap w-20">Waktu</th>
                      <th className="py-4 px-3 font-semibold text-left w-1/3">Judul Konten</th>
                      <th className="py-4 px-2 font-semibold text-right w-20">View</th>
                      <th className="py-4 px-2 font-semibold text-right w-20">Like</th>
                      <th className="py-4 px-2 font-semibold text-right w-20">Dislike</th>
                      <th className="py-4 px-2 font-semibold text-center w-16">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedYtVideos.map((vid, idx) => (
                      <tr key={vid.id} className="border-b border-gray-800/50 hover:bg-[#1c2128] transition-colors group">
                        <td className="py-4 px-2 text-center text-gray-500 font-medium">{idx + 1}</td>
                        <td className="py-4 px-2 text-gray-300 whitespace-nowrap">{vid.date}</td>
                        <td className="py-4 px-2 text-gray-300 whitespace-nowrap">{vid.time}</td>
                        <td className="py-4 px-3 text-gray-100 font-medium flex flex-col gap-1">
                          <span className={`text-[10px] md:text-xs font-black uppercase tracking-wide ${ytFetchMode === 'kol' ? 'text-blue-400' : 'text-gray-400'}`}>
                            @{vid.author}
                          </span>
                          <span className="leading-snug">{vid.title}</span>
                        </td>
                        <td className="py-4 px-2 text-right text-gray-200 font-bold">{vid.views.toLocaleString()}</td>
                        <td className="py-4 px-2 text-right text-blue-400 font-medium">{vid.likes.toLocaleString()}</td>
                        <td className="py-4 px-2 text-right text-red-400 font-medium">{vid.dislikes.toLocaleString()}</td>
                        <td className="py-4 px-2 text-center">
                          <a href={vid.link} target="_blank" rel="noopener noreferrer" className="inline-flex justify-center items-center text-gray-500 hover:text-white transition-colors" title="Buka Video">
                            <ExternalLink size={16} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="w-full flex justify-center items-center h-64 text-gray-500 text-sm">
                {ytFetchMode === "kol" ? "Belum ada KOL/Media terpilih yang membahas topik tersebut minggu ini." : "Tidak ada video relevan terkait tokoh tersebut (Filter > 1.000 Views)."}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // --- HALAMAN DETAIL BERITA UMUM ---
  if (currentPage === "detail" && selectedIssue) {
    return (
      <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-6 mt-6">
          <button onClick={() => setCurrentPage(previousPage)} className="flex items-center gap-2 text-gray-400 hover:text-blue-400 font-medium transition-colors">
            <ArrowLeft size={20} /> Kembali
          </button>
          <div className="bg-[#161b22] p-8 rounded-2xl shadow-xl border border-[#30363d] space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-snug">{selectedIssue.topik}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm bg-[#0d1117] px-4 py-3 rounded-lg border border-[#30363d]">
              <span className="text-gray-400 font-medium flex items-center gap-1.5"><Building2 size={16} className="text-gray-500"/> Sumber: {selectedIssue.source || "Sistem"}</span>
              <span className="text-gray-400 font-medium flex items-center gap-1.5 border-l border-gray-700 pl-4"><Calendar size={16} className="text-gray-500"/> Waktu Rilis: {selectedIssue.pubDate}</span>
            </div>
            <div className="border-y border-[#30363d] py-6 space-y-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informasi Analisis / Deskripsi:</h4>
              <p className="text-gray-300 leading-relaxed">{selectedIssue.articleDesc}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // --- HALAMAN UTAMA ---
  if (currentPage === "main") {
    return (
      <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-8 mt-10 pb-16">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white">Public Trend Radar</h1>
            <p className="text-gray-400">Monitoring isu publik terupdate secara real-time.</p>
          </div>
          
          <div className="space-y-4 pt-4">
            <h2 className="text-2xl font-bold text-white border-b border-[#30363d] pb-2">Berita Nasional Umum</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setCurrentPage("12jam")} className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300">Monitoring Top News</h3>
              </button>
              <button onClick={() => setCurrentPage("terkini")} className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300">Berita Nasional Umum Terkini</h3>
              </button>
              <button onClick={() => setCurrentPage("bencana-24jam")} className="md:col-span-2 p-6 bg-[#161b22] border border-orange-900/30 rounded-2xl shadow-lg hover:border-orange-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-orange-500 group-hover:text-orange-400 flex items-center gap-2">🚨 Berita Bencana Terkini</h3>
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <h2 className="text-2xl font-bold text-red-500 border-b border-red-900/50 pb-2">Puan Maharani</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setCurrentPage("puan-12jam")} className="p-6 bg-[#161b22] border border-red-900/30 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-red-500 group-hover:text-red-400">Monitoring Top News</h3>
              </button>
              <button onClick={() => setCurrentPage("puan-terkini")} className="p-6 bg-[#161b22] border border-red-900/30 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-red-500 group-hover:text-red-400">Berita Puan Maharani Terkini</h3>
              </button>
              
              <button onClick={() => setCurrentPage("puan-yt-analysis")} className="md:col-span-2 p-6 bg-red-950/20 border border-red-900/50 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-red-500 group-hover:text-red-400 flex items-center gap-2">
                  <PlaySquare size={24}/> Data Analysis (YouTube)
                </h3>
                <p className="text-sm text-gray-400">Tabel data performa video (Views, Likes, Dislikes) aktual beserta pelacakan Target 10 KOL VIP.</p>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // --- HALAMAN DAFTAR MONITORING BERITA UMUM ---
  return (
    <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6 mt-4">
        <div className="flex justify-between items-center">
          <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft size={20} /> Menu Utama
          </button>
        </div>
        {isLoading ? (
           <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div></div>
        ) : (
            <div className="space-y-4 pb-10">
              {listData.length > 0 ? listData.map((isu, index) => (
                <div key={index} className={`bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] border-l-4 ${isBencanaMode ? 'border-l-orange-500' : (isRedTheme ? 'border-l-red-500' : 'border-l-blue-500')}`}>
                  <div className="flex justify-between items-start">
                    <div className="pr-4 w-full">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${isBencanaMode ? 'text-orange-400' : (isRedTheme ? 'text-red-400' : 'text-blue-400')}`}>
                        {isu.kategori} {isTerkiniMode && " TERKINI"}
                      </span>
                      <h3 className="text-xl font-bold text-white mt-1 leading-snug">#{index + 1} - {isu.topik}</h3>
                      <p className="text-xs text-gray-400 mt-2.5 flex items-center gap-1.5 font-medium"><Calendar size={14} className="text-gray-500"/> Dirilis: {isu.pubDate}</p>
                    </div>
                    <button onClick={() => handleOpenDetail(isu)} className={`text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-md shrink-0 transition-colors ${isBencanaMode ? 'bg-orange-600 hover:bg-orange-500' : (isRedTheme ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500')}`}>Buka Detail</button>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 bg-[#161b22] p-6 rounded-xl border border-[#30363d] text-center">Data kosong / sistem masih memproses API.</p>
              )}
            </div>
        )}
      </div>
    </main>
  );
}
