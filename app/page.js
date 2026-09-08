"use client";

import { useState, useEffect } from "react";
// Recharts dihapus sesuai permintaan
import { 
  ArrowLeft, RefreshCw, ExternalLink, Calendar, Filter, 
  DownloadCloud, Copy, PlaySquare, Zap, AlertTriangle, 
  Search, Flame
} from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [previousPage, setPreviousPage] = useState("main");
  const [selectedIssue, setSelectedIssue] = useState(null);
  
  // Data State
  const [topNewsData, setTopNewsData] = useState([]);
  const [terkiniData, setTerkiniData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [ytData, setYtData] = useState([]);
  const [isLoadingYt, setIsLoadingYt] = useState(false);
  const [ytSortMode, setYtSortMode] = useState("views"); 
  const [ytFetchMode, setYtFetchMode] = useState("umum"); 
  
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [isTopNewsFilter, setIsTopNewsFilter] = useState(false); // Filter Api
  const categories = ["Semua", "Politik", "Pemerintahan", "Sosial", "Hukum", "Bencana", "Entertainment", "Olahraga", "Teknologi", "Finansial"];

  const [isScraping, setIsScraping] = useState(false);
  const [scrapedResult, setScrapedResult] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // Fetching Data Top News & Terkini
  const fetchLiveTrends = async () => {
    setIsLoading(true);
    try {
      let epTop = '';
      let epTerkini = '';

      if (currentPage === 'bencana') {
        epTop = `/api/bencana?t=${Date.now()}`;
        epTerkini = `/api/bencana?t=${Date.now()}`;
      } else if (currentPage === 'pdip') {
        epTop = `/api/pdip?hours=12&t=${Date.now()}`;
        epTerkini = `/api/pdip?hours=24&mode=terkini&t=${Date.now()}`;
      } else if (currentPage === 'megawati') {
        epTop = `/api/megawati?hours=12&t=${Date.now()}`;
        epTerkini = `/api/megawati?hours=24&mode=terkini&t=${Date.now()}`;
      } else if (currentPage === 'puan') {
        epTop = `/api/puan?hours=12&t=${Date.now()}`;
        epTerkini = `/api/puan?hours=24&mode=terkini&t=${Date.now()}`;
      } else if (currentPage === 'nasional') {
        epTop = `/api/news?hours=12&t=${Date.now()}`;
        epTerkini = `/api/news?hours=24&mode=terkini&t=${Date.now()}`;
      }

      if (epTop && epTerkini) {
        const [resTop, resTerkini] = await Promise.all([
          fetch(epTop, { cache: 'no-store' }).then(res => res.json()).catch(() => ({success: false, data: []})),
          fetch(epTerkini, { cache: 'no-store' }).then(res => res.json()).catch(() => ({success: false, data: []}))
        ]);
        
        if (resTop.success) setTopNewsData(resTop.data);
        else setTopNewsData([]);

        if (resTerkini.success) setTerkiniData(resTerkini.data);
        else setTerkiniData([]);
      }
    } catch (error) {
      setTopNewsData([]);
      setTerkiniData([]);
    } 
    finally { setIsLoading(false); }
  };

  const fetchYoutubeData = async () => {
    setIsLoadingYt(true);
    try {
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
      setIsTopNewsFilter(false);
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

  const formatDateTime = (dateStr) => {
    if(!dateStr) return { date: '-', time: '-' };
    const timeMatch = dateStr.match(/\d{2}:\d{2}(:\d{2})?/);
    if(timeMatch) {
        const time = timeMatch[0];
        const date = dateStr.replace(time, '').replace('WIB', '').replace('wib', '').trim();
        return { date, time };
    }
    return { date: dateStr, time: '-' };
  };

  const isRedPrev = previousPage.includes("pdip") || previousPage.includes("puan") || previousPage.includes("megawati");
  const isRedCurr = currentPage.includes("pdip") || currentPage.includes("puan") || currentPage.includes("megawati");
  const isRedTheme = isRedCurr || (currentPage === "detail" && isRedPrev);

  // LOGIKA PENGGABUNGAN & FILTER TABEL EXCEL
  const topNewsTitles = topNewsData.map(d => d.topik);
  let tableData = terkiniData.map(d => ({
    ...d,
    isTrending: topNewsTitles.includes(d.topik)
  }));

  if (selectedCategory !== "Semua") {
    tableData = tableData.filter(d => d.kategori === selectedCategory);
  }
  if (isTopNewsFilter) {
    tableData = tableData.filter(d => d.isTrending);
  }

  // =========================================================================
  // HALAMAN YOUTUBE DATA ANALYSIS
  // =========================================================================
  if (currentPage === "puan-yt-analysis") {
    let sortedYtVideos = ytData && ytData.length > 0 ? [...ytData].sort((a, b) => b[ytSortMode] - a[ytSortMode]) : [];

    return (
      <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
        <div className="w-full max-w-6xl space-y-6 mt-4">
          <div className="flex justify-between items-center">
            <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-gray-400 hover:text-white">
              <ArrowLeft size={20} /> Menu Utama
            </button>
            <button onClick={fetchYoutubeData} className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] px-4 py-2 rounded-xl text-sm hover:border-white transition-colors">
              <RefreshCw size={16} className={isLoadingYt ? "animate-spin" : ""} /> Refresh Data
            </button>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden flex flex-col items-center">
            <div className="w-full bg-[#0d1117] flex items-center border-b border-[#30363d]">
              <button onClick={() => setYtFetchMode("umum")} className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${ytFetchMode === "umum" ? "border-red-500 text-red-500 bg-red-950/10" : "border-transparent text-gray-400 hover:bg-[#161b22]"}`}>
                Semua Saluran
              </button>
              <button onClick={() => setYtFetchMode("kol")} className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${ytFetchMode === "kol" ? "border-blue-500 text-blue-500 bg-blue-950/10" : "border-transparent text-gray-400 hover:bg-[#161b22]"}`}>
                KOL / Berita (Targeted)
              </button>
            </div>

            <div className="w-full p-6 border-b border-[#30363d] flex flex-col lg:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <PlaySquare size={28} className={ytFetchMode === "kol" ? "text-blue-500" : "text-red-500"} />
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">YouTube Analysis: Puan Maharani</h2>
                  <p className="text-sm text-gray-400">Menampilkan data 7 hari terakhir (Filter &gt; 1.000 Views).</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-gray-400 mr-1">Urutkan:</span>
                <button onClick={() => setYtSortMode("views")} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${ytSortMode === "views" ? "bg-[#1f242c] text-white border-gray-500" : "bg-transparent text-gray-400 border-[#30363d] hover:bg-[#1c2128]"}`}>View</button>
                <button onClick={() => setYtSortMode("likes")} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${ytSortMode === "likes" ? "bg-[#1f242c] text-white border-gray-500" : "bg-transparent text-gray-400 border-[#30363d] hover:bg-[#1c2128]"}`}>Like</button>
                <button onClick={() => setYtSortMode("dislikes")} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${ytSortMode === "dislikes" ? "bg-[#1f242c] text-white border-gray-500" : "bg-transparent text-gray-400 border-[#30363d] hover:bg-[#1c2128]"}`}>Dislike</button>
              </div>
            </div>

            {isLoadingYt ? (
              <div className="w-full flex justify-center items-center h-64"><div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${ytFetchMode === 'kol' ? 'border-blue-500' : 'border-red-500'}`}></div></div>
            ) : sortedYtVideos.length > 0 ? (
              <div className="w-full px-6 py-2 overflow-hidden">
                <table className="w-full border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-[#21262d] text-gray-400 uppercase tracking-wider">
                      <th className="py-4 px-2 font-semibold text-center w-10">No</th>
                      <th className="py-4 px-2 font-semibold text-left w-24">Tanggal</th>
                      <th className="py-4 px-2 font-semibold text-left w-20">Waktu</th>
                      <th className="py-4 px-3 font-semibold text-left">Judul Konten</th>
                      <th className="py-4 px-2 font-semibold text-right w-20">View</th>
                      <th className="py-4 px-2 font-semibold text-right w-20">Like</th>
                      <th className="py-4 px-2 font-semibold text-right w-20">Dislike</th>
                      <th className="py-4 px-2 font-semibold text-center w-16">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedYtVideos.map((vid, idx) => (
                      <tr key={vid.id} className="border-b border-[#12161c] hover:bg-[#1c2128] transition-colors">
                        <td className="py-4 px-2 text-center text-gray-500 font-medium">{idx + 1}</td>
                        <td className="py-4 px-2 text-gray-300">{vid.date}</td>
                        <td className="py-4 px-2 text-gray-300">{vid.time}</td>
                        <td className="py-4 px-3 text-gray-100 flex flex-col gap-1">
                          <span className={`text-[10px] font-black uppercase ${ytFetchMode === 'kol' ? 'text-blue-400' : 'text-gray-400'}`}>@{vid.author}</span>
                          <span>{vid.title}</span>
                        </td>
                        <td className="py-4 px-2 text-right text-gray-200 font-bold">{vid.views.toLocaleString()}</td>
                        <td className="py-4 px-2 text-right text-blue-400">{vid.likes.toLocaleString()}</td>
                        <td className="py-4 px-2 text-right text-red-400">{vid.dislikes.toLocaleString()}</td>
                        <td className="py-4 px-2 text-center">
                          <a href={vid.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-gray-500 hover:text-white"><ExternalLink size={16} /></a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="w-full flex justify-center items-center h-64 text-gray-500 text-sm">Tidak ada video terkait.</div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // --- HALAMAN DETAIL BERITA UMUM ---
  if (currentPage === "detail" && selectedIssue) {
    const detailLink = selectedIssue.url || selectedIssue.link || "#";

    return (
      <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-6 mt-6">
          <button onClick={() => setCurrentPage(previousPage)} className="flex items-center gap-2 text-gray-400 hover:text-blue-400"><ArrowLeft size={20} /> Kembali</button>
          <div className="bg-[#161b22] p-8 rounded-2xl shadow-xl border border-[#30363d] space-y-4">
            <div className="flex justify-between items-start gap-4">
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-snug">
                {selectedIssue.topik}
                {selectedIssue.isTrending && <Flame size={24} className="text-orange-500 inline ml-3 -mt-1" />}
              </h1>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 border border-[#30363d] p-4 rounded-xl bg-[#0d1117] items-center">
              {/* Link Bisa Di-Tap ke Berita Asli */}
              <span>Sumber:{" "}
                {detailLink !== "#" ? (
                  <a href={detailLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline font-semibold inline-flex items-center gap-1">
                    {selectedIssue.source} <ExternalLink size={14} />
                  </a>
                ) : (
                  <span className="font-semibold text-gray-300">{selectedIssue.source}</span>
                )}
              </span>
              <span className="hidden md:inline">|</span> 
              <span>Rilis: {selectedIssue.pubDate}</span>
              <span className="hidden md:inline">|</span> 
              <span className="px-2 py-1 bg-[#1f242c] rounded-md text-xs font-bold uppercase tracking-wider">{selectedIssue.kategori}</span>
            </div>
            <p className="text-gray-300 leading-relaxed py-6 border-y border-[#30363d] text-base md:text-lg">{selectedIssue.articleDesc}</p>
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-bold text-white">Pembuat Opini AI</span>
              <button onClick={handleSedotData} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg">
                <DownloadCloud size={16} /> Sedot Prompt
              </button>
            </div>
            {scrapedResult && (
              <div className="mt-4 bg-[#0d1117] rounded-xl border border-[#30363d] p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-blue-400">Hasil Prompt Siap Pakai</span>
                  <button onClick={handleCopyPrompt} className="text-sm text-gray-300 flex items-center gap-1 hover:text-white transition-colors"><Copy size={14}/> Salin</button>
                </div>
                <pre className="text-sm whitespace-pre-wrap font-mono text-gray-300 p-2 bg-[#161b22] rounded-lg border border-[#21262d]">{scrapedResult}</pre>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // HALAMAN UTAMA (TIDAK BERUBAH) KECUALI TOMBOL GABUNGAN
  // =========================================================================
  if (currentPage === "main") {
    const boxCard = "relative group overflow-hidden rounded-xl md:rounded-2xl shadow-xl border border-[#30363d] bg-[#161b22] cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,0,0,0.8)] w-[140px] h-[140px] md:w-[220px] md:h-[220px]";

    return (
      <main className="h-screen w-screen overflow-hidden bg-[#0d1117] flex flex-col items-center justify-center p-2 md:p-4">
        
        <div className="flex flex-col items-center gap-4 md:gap-6 w-full max-w-4xl">
          
          <div className="text-center space-y-0.5 md:space-y-1">
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight drop-shadow-sm">Public Trend Radar</h1>
            <p className="text-gray-400 text-[10px] md:text-sm font-medium">Monitoring isu publik terupdate secara real-time.</p>
          </div>
          
          <div className="flex flex-col gap-3 md:gap-6 items-center w-full">
            
            <div className="flex justify-center gap-3 md:gap-6 w-full">
              
              <div className={boxCard}>
                <img src="/nasional.png" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Nasional" />
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center items-center p-2 md:p-4 z-20"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
                >
                  <h2 className="text-white font-bold text-xs md:text-lg mb-2 md:mb-4 text-center transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-300 drop-shadow-lg">Berita Nasional</h2>
                  <div className="flex flex-col gap-1.5 md:gap-2 w-full px-1 md:px-2 transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    <button onClick={() => setCurrentPage("nasional")} className="bg-blue-600 hover:bg-blue-500 text-white py-1.5 md:py-3 rounded-md md:rounded-lg text-[9px] md:text-sm font-bold w-full flex items-center justify-center gap-1 shadow-md"><Search className="w-3 h-3 md:w-4 md:h-4"/> Cek Sekarang</button>
                  </div>
                </div>
              </div>

              <div className={boxCard}>
                <img src="/bencana.png" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Bencana" />
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center items-center p-2 md:p-4 z-20"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
                >
                  <h2 className="text-orange-400 font-bold text-xs md:text-lg mb-2 md:mb-4 text-center transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-300 drop-shadow-lg">Bencana Terkini</h2>
                  <div className="flex flex-col gap-1.5 md:gap-2 w-full px-1 md:px-2 transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    <button onClick={() => setCurrentPage("bencana")} className="bg-orange-600 hover:bg-orange-500 text-white py-1.5 md:py-3 rounded-md md:rounded-lg text-[9px] md:text-sm font-bold w-full flex items-center justify-center gap-1 shadow-md"><Search className="w-3 h-3 md:w-4 md:h-4"/> Cek Sekarang</button>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex flex-wrap justify-center gap-3 md:gap-6 w-full max-w-[310px] md:max-w-none mx-auto">

              <div className={boxCard}>
                <img src="/pdip.png" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="PDIP" />
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center items-center p-2 md:p-4 z-20"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
                >
                  <h2 className="text-red-400 font-bold text-xs md:text-lg mb-2 md:mb-4 text-center transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-300 drop-shadow-lg">PDI Perjuangan</h2>
                  <div className="flex flex-col gap-1.5 md:gap-2 w-full px-1 md:px-2 transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    <button onClick={() => setCurrentPage("pdip")} className="bg-red-600 hover:bg-red-500 text-white py-1.5 md:py-3 rounded-md md:rounded-lg text-[9px] md:text-sm font-bold w-full flex items-center justify-center gap-1 shadow-md"><Search className="w-3 h-3 md:w-4 md:h-4"/> Cek Sekarang</button>
                  </div>
                </div>
              </div>

              <div className={boxCard}>
                <img src="/megawati.png" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Megawati" />
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center items-center p-2 md:p-4 z-20"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
                >
                  <h2 className="text-red-400 font-bold text-xs md:text-lg mb-2 md:mb-4 text-center transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-300 drop-shadow-lg">Megawati</h2>
                  <div className="flex flex-col gap-1.5 md:gap-2 w-full px-1 md:px-2 transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    <button onClick={() => setCurrentPage("megawati")} className="bg-red-600 hover:bg-red-500 text-white py-1.5 md:py-3 rounded-md md:rounded-lg text-[9px] md:text-sm font-bold w-full flex items-center justify-center gap-1 shadow-md"><Search className="w-3 h-3 md:w-4 md:h-4"/> Cek Sekarang</button>
                  </div>
                </div>
              </div>

              <div className={boxCard}>
                <img src="/puan.png" className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" alt="Puan Maharani" />
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center items-center p-2 md:p-4 z-20"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
                >
                  <h2 className="text-red-400 font-bold text-xs md:text-lg mb-1.5 md:mb-3 text-center transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-300 drop-shadow-lg">Puan Maharani</h2>
                  <div className="flex flex-col gap-1 md:gap-1.5 w-full px-0.5 md:px-2 transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    <button onClick={() => setCurrentPage("puan")} className="bg-red-600 hover:bg-red-500 text-white py-1.5 md:py-2.5 rounded-md md:rounded-lg text-[8px] md:text-[11px] font-bold w-full flex items-center justify-center gap-1 shadow-md"><Search className="w-2.5 h-2.5 md:w-3.5 md:h-3.5"/> Cek Sekarang</button>
                    <button onClick={() => setCurrentPage("puan-yt-analysis")} className="bg-[#0d1117] border border-red-500/70 text-red-400 hover:bg-red-900/40 py-1.5 md:py-2.5 rounded-md md:rounded-lg text-[8px] md:text-[11px] font-bold w-full flex items-center justify-center gap-1 shadow-md"><PlaySquare className="w-2.5 h-2.5 md:w-3.5 md:h-3.5"/> YouTube</button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>
    );
  }

  // --- HALAMAN DAFTAR MONITORING (EXCEL-STYLE VIEW & TOP NEWS FILTER) ---
  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-6 mt-4">
        
        {/* Header Navigation */}
        <div className="flex flex-wrap gap-4 justify-between items-center bg-[#161b22] p-4 rounded-2xl border border-[#30363d] shadow-lg">
          <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-gray-400 hover:text-white font-medium transition-colors">
            <ArrowLeft size={18} /> Menu Utama
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-black text-white hidden sm:block">Update Isu Publik</h1>
          </div>
          <button onClick={fetchLiveTrends} className="flex items-center gap-2 bg-[#0d1117] border border-[#30363d] px-4 py-2 rounded-xl text-sm font-semibold hover:border-gray-500 transition-colors">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Toolbar Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#161b22] p-4 rounded-2xl border border-[#30363d]">
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-gray-400 mr-1"/>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedCategory === cat ? (isRedTheme ? 'bg-red-600 text-white border-red-500' : 'bg-blue-600 text-white border-blue-500') : 'bg-[#0d1117] text-gray-400 border-[#30363d] hover:bg-[#1f242c]'}`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Tombol Filter Api (Top News) */}
          <button 
            onClick={() => setIsTopNewsFilter(!isTopNewsFilter)} 
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${isTopNewsFilter ? 'bg-orange-500 text-white border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-[#0d1117] text-gray-400 border-[#30363d] hover:border-orange-500 hover:text-orange-400'}`}
          >
            <Flame size={16} className={isTopNewsFilter ? "text-white" : "text-orange-500"} /> Trending Top News
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isRedTheme ? 'border-red-500' : 'border-blue-500'}`}></div>
          </div>
        ) : (
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
            <div className="w-full px-6 py-4 border-b border-[#30363d] bg-[#0d1117]/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap size={20} className={isRedTheme ? "text-red-400" : "text-blue-400"} /> 
                {isTopNewsFilter ? "Menampilkan Top News (Trending)" : "Update Data Terkini (24 Jam)"}
              </h2>
              <span className="text-xs font-medium text-gray-500">Total: {tableData.length} data</span>
            </div>

            {/* TABEL EXCEL STYLE */}
            {tableData.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-xs md:text-sm text-left">
                  <thead>
                    <tr className="bg-[#12161c] border-b border-[#30363d] text-gray-400 uppercase tracking-wider font-semibold text-[11px] md:text-xs">
                      <th className="py-4 px-4 w-12 text-center border-r border-[#30363d]/50">No</th>
                      <th className="py-4 px-4 w-28 border-r border-[#30363d]/50 whitespace-nowrap">Tanggal</th>
                      <th className="py-4 px-4 w-24 border-r border-[#30363d]/50 whitespace-nowrap">Waktu</th>
                      <th className="py-4 px-4 w-32 border-r border-[#30363d]/50">Kategori</th>
                      <th className="py-4 px-4 border-r border-[#30363d]/50">Judul Konten</th>
                      <th className="py-4 px-4 w-28 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((isu, idx) => {
                      const { date, time } = formatDateTime(isu.pubDate);
                      return (
                        <tr key={idx} className="border-b border-[#30363d]/50 hover:bg-[#1c2128] transition-colors group">
                          <td className="py-3 px-4 text-center text-gray-500 font-medium border-r border-[#30363d]/50">{idx + 1}</td>
                          <td className="py-3 px-4 text-gray-300 font-medium border-r border-[#30363d]/50 whitespace-nowrap">{date}</td>
                          <td className="py-3 px-4 text-gray-400 border-r border-[#30363d]/50 whitespace-nowrap">{time}</td>
                          <td className="py-3 px-4 border-r border-[#30363d]/50">
                            <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isRedTheme ? 'bg-red-950/30 text-red-400 border border-red-900/50' : 'bg-blue-950/30 text-blue-400 border border-blue-900/50'}`}>
                              {isu.kategori}
                            </span>
                          </td>
                          <td className="py-3 px-4 border-r border-[#30363d]/50">
                            <div className="flex items-start gap-2">
                              <span className="text-gray-100 font-semibold leading-relaxed line-clamp-2 group-hover:text-white transition-colors">{isu.topik}</span>
                              {isu.isTrending && (
                                <div className="shrink-0 mt-0.5 bg-orange-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 border border-orange-500/30" title="Top News (Trending)">
                                  <Flame size={12} className="text-orange-500" />
                                  <span className="text-[9px] font-bold text-orange-500 uppercase">Top</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button onClick={() => handleOpenDetail(isu)} className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all ${isRedTheme ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'} shadow-md hover:shadow-lg`}>
                              Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <Search size={40} className="text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg font-medium text-center">Tidak ada data yang ditemukan.</p>
                <p className="text-gray-500 text-sm text-center mt-1">Coba ubah filter kategori atau matikan filter Top News.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
