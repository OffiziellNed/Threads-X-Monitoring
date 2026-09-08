"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { 
  ArrowLeft, RefreshCw, ExternalLink, Calendar, Filter, 
  PlaySquare, TrendingUp, Zap, AlertTriangle, Search, Flame
} from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [previousPage, setPreviousPage] = useState("main");
  
  // Data State
  const [topNewsData, setTopNewsData] = useState([]);
  const [terkiniData, setTerkiniData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [ytData, setYtData] = useState([]);
  const [isLoadingYt, setIsLoadingYt] = useState(false);
  const [ytSortMode, setYtSortMode] = useState("views"); 
  const [ytFetchMode, setYtFetchMode] = useState("umum"); 
  
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [isTopNewsFilter, setIsTopNewsFilter] = useState(false);
  const categories = ["Semua", "Politik", "Pemerintahan", "Sosial", "Hukum", "Bencana", "Entertainment", "Olahraga", "Teknologi", "Finansial"];

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
    else if (currentPage !== "main") {
      fetchLiveTrends();
      setSelectedCategory("Semua"); 
      setIsTopNewsFilter(false);
    }
  }, [currentPage, ytFetchMode]);

  // LOGIKA PISAH TANGGAL & WAKTU
  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: '-', time: '-' };
    const str = String(dateStr);
    
    // Ambil pola waktu (contoh: 12:05 atau 12.05)
    const timeRegex = /(?:pukul\s*)?(\d{2}[.:]\d{2}(?:[.:]\d{2})?)\s*(?:WIB|WITA|WIT)?/i;
    const match = str.match(timeRegex);
    
    if (match) {
      let time = match[1].replace(/\./g, ':'); 
      let date = str.replace(match[0], '').replace(/,/g, '').trim();
      return { date: date || '-', time };
    }
    return { date: str, time: '-' };
  };

  // LOGIKA LINK (MURNI TANPA GOOGLE SEARCH)
  const getLink = (isu) => {
    if (isu.url) return isu.url;
    if (isu.link) return isu.link;
    if (isu.url_berita) return isu.url_berita;
    if (isu.link_berita) return isu.link_berita;
    
    for (const key in isu) {
      if (typeof isu[key] === 'string' && isu[key].startsWith('http')) {
        return isu[key];
      }
    }
    return "#";
  };

  const isRedPrev = previousPage.includes("pdip") || previousPage.includes("puan") || previousPage.includes("megawati");
  const isRedCurr = currentPage.includes("pdip") || currentPage.includes("puan") || currentPage.includes("megawati");
  const isRedTheme = isRedCurr || isRedPrev;

  const topNewsTitles = topNewsData.map(d => d.topik);
  let tableData = terkiniData.map(d => ({
    ...d,
    isTrending: topNewsTitles.includes(d.topik)
  }));

  if (selectedCategory !== "Semua") tableData = tableData.filter(d => d.kategori === selectedCategory);
  if (isTopNewsFilter) tableData = tableData.filter(d => d.isTrending);

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
              <button onClick={() => setYtFetchMode("umum")} className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${ytFetchMode === "umum" ? "border-red-500 text-red-500 bg-red-950/10" : "border-transparent text-gray-400 hover:bg-[#161b22]"}`}>Semua Saluran</button>
              <button onClick={() => setYtFetchMode("kol")} className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${ytFetchMode === "kol" ? "border-blue-500 text-blue-500 bg-blue-950/10" : "border-transparent text-gray-400 hover:bg-[#161b22]"}`}>KOL / Berita (Targeted)</button>
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

  // =========================================================================
  // HALAMAN UTAMA - DESKTOP & MOBILE KECIL (FORMASI 2 - 3)
  // =========================================================================
  if (currentPage === "main") {
    // Menggunakan standar Tailwind murni: w-32 (128px) untuk HP, w-36 (144px) untuk desktop. Dijamin kecil.
    const boxCard = "relative group overflow-hidden rounded-xl md:rounded-2xl shadow-xl border border-[#30363d] bg-[#161b22] cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,0,0,0.8)] flex-none w-32 h-32 md:w-36 md:h-36";

    return (
      <main className="h-screen w-screen overflow-hidden bg-[#0d1117] flex flex-col items-center justify-center p-2 md:p-4">
        
        <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
          
          <div className="text-center space-y-1">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-sm">Public Trend Radar</h1>
            <p className="text-gray-400 text-xs font-medium">Monitoring isu publik terupdate secara real-time.</p>
          </div>
          
          {/* PEMBAGIAN BARIS MANUAL SUPAYA PASTI JADI 2 - 3 */}
          <div className="flex flex-col gap-4 items-center w-full">
            
            {/* Baris 1: Pasti 2 Kartu */}
            <div className="flex justify-center gap-4 w-full">
              
              <div className={boxCard}>
                <img src="/nasional.png" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Nasional" />
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center items-center p-3 z-20"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
                >
                  <h2 className="text-white font-bold text-[10px] md:text-xs mb-2 text-center transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 drop-shadow-lg">Berita Nasional</h2>
                  <div className="w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    <button onClick={() => setCurrentPage("nasional")} className="bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded-md text-[9px] font-bold w-full flex items-center justify-center gap-1 shadow-md"><Search size={10}/> Cek</button>
                  </div>
                </div>
              </div>

              <div className={boxCard}>
                <img src="/bencana.png" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Bencana" />
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center items-center p-3 z-20"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
                >
                  <h2 className="text-orange-400 font-bold text-[10px] md:text-xs mb-2 text-center transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 drop-shadow-lg">Bencana Terkini</h2>
                  <div className="w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    <button onClick={() => setCurrentPage("bencana")} className="bg-orange-600 hover:bg-orange-500 text-white py-1.5 rounded-md text-[9px] font-bold w-full flex items-center justify-center gap-1 shadow-md"><Search size={10}/> Cek</button>
                  </div>
                </div>
              </div>

            </div>

            {/* Baris 2: Pasti 3 Kartu */}
            <div className="flex justify-center gap-4 w-full">

              <div className={boxCard}>
                <img src="/pdip.png" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="PDIP" />
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center items-center p-3 z-20"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
                >
                  <h2 className="text-red-400 font-bold text-[10px] md:text-xs mb-2 text-center transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 drop-shadow-lg">PDI Perjuangan</h2>
                  <div className="w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    <button onClick={() => setCurrentPage("pdip")} className="bg-red-600 hover:bg-red-500 text-white py-1.5 rounded-md text-[9px] font-bold w-full flex items-center justify-center gap-1 shadow-md"><Search size={10}/> Cek</button>
                  </div>
                </div>
              </div>

              <div className={boxCard}>
                <img src="/megawati.png" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Megawati" />
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center items-center p-3 z-20"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
                >
                  <h2 className="text-red-400 font-bold text-[10px] md:text-xs mb-2 text-center transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 drop-shadow-lg">Megawati</h2>
                  <div className="w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    <button onClick={() => setCurrentPage("megawati")} className="bg-red-600 hover:bg-red-500 text-white py-1.5 rounded-md text-[9px] font-bold w-full flex items-center justify-center gap-1 shadow-md"><Search size={10}/> Cek</button>
                  </div>
                </div>
              </div>

              <div className={boxCard}>
                <img src="/puan.png" className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" alt="Puan Maharani" />
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center items-center p-2 z-20"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
                >
                  <h2 className="text-red-400 font-bold text-[10px] md:text-xs mb-1.5 text-center transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 drop-shadow-lg">Puan Maharani</h2>
                  <div className="flex flex-col gap-1 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    <button onClick={() => setCurrentPage("puan")} className="bg-red-600 hover:bg-red-500 text-white py-1 rounded-md text-[8px] font-bold w-full flex items-center justify-center gap-1 shadow-md"><Search size={8}/> Cek</button>
                    <button onClick={() => setCurrentPage("puan-yt-analysis")} className="bg-[#0d1117] border border-red-500/70 text-red-400 hover:bg-red-900/40 py-1 rounded-md text-[8px] font-bold w-full flex items-center justify-center gap-1 shadow-md"><PlaySquare size={8}/> YouTube</button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>
    );
  }

  // --- HALAMAN DAFTAR MONITORING (EXCEL-STYLE VIEW & FILTER TANPA BOARD) ---
  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
      <div className="w-full max-w-[1400px] space-y-4 mt-4">
        
        {/* Header Navigation Minimalis */}
        <div className="flex flex-wrap gap-4 justify-between items-center w-full px-2 mb-2">
          <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-gray-400 hover:text-white font-medium transition-colors">
            <ArrowLeft size={18} /> Menu Utama
          </button>
          
          <h1 className="text-xl md:text-2xl font-black text-white text-center flex-1">
            Daftar Monitor Isu
          </h1>

          <button onClick={fetchLiveTrends} className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] px-4 py-2 rounded-xl text-sm font-semibold hover:border-gray-500 transition-colors">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Filter Minimalis Tanpa Board & Tanpa Icon */}
        <div className="w-full mb-6 mt-2">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 px-2">
            {categories.map((cat) => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat)} 
                className={`text-xs md:text-sm font-bold transition-all ${
                  selectedCategory === cat 
                    ? (isRedTheme ? 'text-red-400 border-b-2 border-red-400 pb-1' : 'text-blue-400 border-b-2 border-blue-400 pb-1') 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isRedTheme ? 'border-red-500' : 'border-blue-500'}`}></div>
          </div>
        ) : (
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden pb-10">
            
            {/* Header Tabel (Judul, Tombol Filter Top News Sebaris, Total Data) */}
            <div className="w-full px-6 py-4 border-b border-[#30363d] bg-[#0d1117]/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Database Isu Terkini
              </h2>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsTopNewsFilter(!isTopNewsFilter)} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isTopNewsFilter ? 'bg-orange-500 text-white' : 'bg-[#1c2128] text-gray-400 hover:text-orange-400'}`}
                >
                  <Flame size={14} className={isTopNewsFilter ? "text-white" : "text-orange-500"} /> Filter Top News
                </button>
                <span className="text-xs font-medium text-gray-500">Total: {tableData.length} data</span>
              </div>
            </div>

            {/* Info Top News jika aktif */}
            {isTopNewsFilter && (
              <div className="w-full px-6 py-3 bg-orange-950/20 border-b border-[#30363d] text-xs text-gray-300">
                <span className="font-bold text-orange-400">Info Filter Top News:</span> Data di bawah adalah isu yang paling banyak dibicarakan (Trending) berdasarkan volume publikasi yang tinggi di berbagai sumber dalam waktu berdekatan.
              </div>
            )}

            {/* TABEL EXCEL STYLE */}
            {tableData.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-xs md:text-sm text-left">
                  <thead>
                    <tr className="bg-[#12161c] border-b border-[#30363d] text-gray-400 uppercase tracking-wider font-semibold text-[11px] md:text-xs">
                      <th className="py-4 px-4 w-12 text-center border-r border-[#30363d]/50">No</th>
                      <th className="py-4 px-4 w-32 border-r border-[#30363d]/50 whitespace-nowrap">Tanggal</th>
                      <th className="py-4 px-4 w-24 border-r border-[#30363d]/50 whitespace-nowrap text-center">Waktu</th>
                      <th className="py-4 px-4 w-40 border-r border-[#30363d]/50 whitespace-nowrap">Sumber</th>
                      <th className="py-4 px-4 w-32 border-r border-[#30363d]/50">Kategori</th>
                      <th className="py-4 px-4 border-r border-[#30363d]/50">Judul Konten</th>
                      <th className="py-4 px-4 w-28 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((isu, idx) => {
                      const { date, time } = formatDateTime(isu.pubDate);
                      const newsLink = getLink(isu);

                      return (
                        <tr key={idx} className="border-b border-[#30363d]/50 hover:bg-[#1c2128] transition-colors group">
                          <td className="py-3 px-4 text-center text-gray-500 font-medium border-r border-[#30363d]/50">{idx + 1}</td>
                          <td className="py-3 px-4 text-gray-300 font-medium border-r border-[#30363d]/50 whitespace-nowrap">{date}</td>
                          <td className="py-3 px-4 text-gray-400 font-medium border-r border-[#30363d]/50 whitespace-nowrap text-center">{time}</td>
                          <td className="py-3 px-4 text-gray-300 font-medium border-r border-[#30363d]/50 whitespace-nowrap">{isu.source || '-'}</td>
                          <td className="py-3 px-4 border-r border-[#30363d]/50">
                            <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isRedTheme ? 'bg-red-950/30 text-red-400 border border-red-900/50' : 'bg-blue-950/30 text-blue-400 border border-blue-900/50'}`}>
                              {isu.kategori}
                            </span>
                          </td>
                          <td className="py-3 px-4 border-r border-[#30363d]/50">
                            <div className="flex items-start gap-2">
                              <span className="text-gray-100 font-medium leading-relaxed group-hover:text-white transition-colors">{isu.topik}</span>
                              {isu.isTrending && (
                                <div className="shrink-0 mt-0.5 bg-orange-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 border border-orange-500/30" title="Top News (Trending)">
                                  <Flame size={12} className="text-orange-500" />
                                  <span className="text-[9px] font-bold text-orange-500 uppercase">Top</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {newsLink !== "#" ? (
                              <a href={newsLink} target="_blank" rel="noopener noreferrer" className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 mx-auto max-w-[90px] ${isRedTheme ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'} shadow-md hover:shadow-lg`}>
                                <ExternalLink size={14} /> Baca
                              </a>
                            ) : (
                              <span className="text-gray-600 text-xs italic">No Link</span>
                            )}
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
