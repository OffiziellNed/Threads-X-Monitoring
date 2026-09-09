"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { 
  ArrowLeft, RefreshCw, ExternalLink, Calendar, Filter, 
  PlaySquare, Zap, Search, Flame, Megaphone, Copy, Check, X, Eye, ThumbsUp, ThumbsDown
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

  // Prompt Modal State
  const [promptModalData, setPromptModalData] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

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

  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: '-', time: '-' };
    const str = String(dateStr);
    const timeRegex = /(?:pukul\s*)?(\d{2}[.:]\d{2}(?:[.:]\d{2})?)\s*(?:WIB|WITA|WIT)?/i;
    const match = str.match(timeRegex);
    
    if (match) {
      let time = match[1].replace(/\./g, ':'); 
      let date = str.replace(match[0], '').replace(/WIB|WITA|WIT/i, '').replace(/,/g, '').trim();
      return { date: date || '-', time };
    }
    return { date: str, time: '-' };
  };

  const getCleanLink = (isu) => {
    const dataString = JSON.stringify(isu);
    const urlMatch = dataString.match(/https?:\/\/[^\s"'\\]+/);
    
    if (urlMatch) {
      let link = urlMatch[0];
      if (link.includes('google.com/url')) {
        try {
          const urlObj = new URL(link.replace(/&amp;/g, '&'));
          const clean = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
          if (clean) return clean;
        } catch (e) {}
      }
      return link; 
    }
    return "#";
  };

  // =========================================================================
  // SISTEM SEDOT DATA BERITA PENUH
  // =========================================================================
  const handleOpenPrompt = async (isu) => {
    const newsLink = getCleanLink(isu);
    
    setPromptModalData({ 
      ...isu, 
      fullText: "⏳ Mengaktifkan sistem... Menyedot artikel penuh dari website sumber (Tunggu sebentar)..." 
    });
    
    if (newsLink && newsLink !== "#") {
      try {
        const res = await fetch(`/api/scrape?url=${encodeURIComponent(newsLink)}`);
        const data = await res.json();
        
        if (data.success && data.text) {
          setPromptModalData({ ...isu, fullText: data.text });
        } else {
          setPromptModalData({ ...isu, fullText: `${data.text}\n\n${isu.articleDesc}` });
        }
      } catch (err) {
        setPromptModalData({ ...isu, fullText: `Koneksi Timeout. Menggunakan Deskripsi Singkat:\n\n${isu.articleDesc}` });
      }
    } else {
      setPromptModalData({ ...isu, fullText: isu.articleDesc });
    }
  };

  const generatePromptText = (data) => {
    return `Tolong identifikasi isu, paparkan fakta penting, berikan 10 perspektif 5 opini Pro dan 5 Opini Kontra, Jika kontra boleh gunakan Bahasa satir, sarkas, tajam\n\nJudul Berita:\n${data.articleTitle || data.topik}\n\nIsi Berita:\n${data.fullText || data.articleDesc}`;
  };

  const handleCopyPrompt = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
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
      <main className="min-h-screen p-4 md:p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
        <div className="w-full max-w-6xl space-y-6 mt-4">
          <div className="flex justify-between items-center w-full">
            <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-gray-400 hover:text-white font-semibold transition-colors">
              <ArrowLeft size={18} /> Menu Utama
            </button>
            <button onClick={fetchYoutubeData} className="flex items-center gap-2 bg-[#161b22] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1f242c] transition-colors">
              <RefreshCw size={16} className={isLoadingYt ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          <div className="bg-[#161b22] rounded-2xl shadow-2xl overflow-hidden flex flex-col pb-4">
            <div className="w-full bg-[#0d1117] flex items-center">
              <button onClick={() => setYtFetchMode("umum")} className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${ytFetchMode === "umum" ? "text-red-500 bg-red-950/10" : "text-gray-400 hover:bg-[#161b22]"}`}>Semua Saluran</button>
              <button onClick={() => setYtFetchMode("kol")} className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${ytFetchMode === "kol" ? "text-blue-500 bg-blue-950/10" : "text-gray-400 hover:bg-[#161b22]"}`}>KOL / Berita</button>
            </div>

            <div className="w-full p-4 md:p-6 flex flex-col lg:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-3">
                <PlaySquare size={28} className={ytFetchMode === "kol" ? "text-blue-500" : "text-red-500"} />
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white leading-tight">YouTube Analysis: Puan Maharani</h2>
                  <p className="text-xs md:text-sm text-gray-400">7 hari terakhir (Filter &gt; 1.000 Views).</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-gray-400 mr-1">Urutkan:</span>
                <button onClick={() => setYtSortMode("views")} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${ytSortMode === "views" ? "bg-[#1f242c] text-white" : "bg-transparent text-gray-400 hover:bg-[#1c2128]"}`}>View</button>
                <button onClick={() => setYtSortMode("likes")} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${ytSortMode === "likes" ? "bg-[#1f242c] text-white" : "bg-transparent text-gray-400 hover:bg-[#1c2128]"}`}>Like</button>
                <button onClick={() => setYtSortMode("dislikes")} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${ytSortMode === "dislikes" ? "bg-[#1f242c] text-white" : "bg-transparent text-gray-400 hover:bg-[#1c2128]"}`}>Dislike</button>
              </div>
            </div>

            {isLoadingYt ? (
              <div className="w-full flex justify-center items-center h-64"><div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${ytFetchMode === 'kol' ? 'border-blue-500' : 'border-red-500'}`}></div></div>
            ) : sortedYtVideos.length > 0 ? (
              <>
                <div className="hidden md:block w-full overflow-x-auto mt-2">
                  <table className="w-full border-collapse text-xs md:text-sm text-left">
                    <thead>
                      <tr className="text-gray-500 uppercase tracking-wider font-semibold text-[10px] md:text-[11px]">
                        <th className="py-5 px-4 text-center w-10">No</th>
                        <th className="py-5 px-4 text-left w-24">Tanggal</th>
                        <th className="py-5 px-4 text-left w-20">Waktu</th>
                        <th className="py-5 px-4 text-left">Judul Konten</th>
                        <th className="py-5 px-4 text-right w-20">View</th>
                        <th className="py-5 px-4 text-right w-20">Like</th>
                        <th className="py-5 px-4 text-right w-20">Dislike</th>
                        <th className="py-5 px-4 text-center w-16">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedYtVideos.map((vid, idx) => (
                        <tr key={vid.id} className="group transition-colors odd:bg-transparent even:bg-white/[0.02] hover:bg-white/[0.05]">
                          <td className="py-4 px-4 text-center text-gray-500 font-medium">{idx + 1}</td>
                          <td className="py-4 px-4 text-gray-400">{vid.date}</td>
                          <td className="py-4 px-4 text-gray-400">{vid.time}</td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1 max-w-[85%] pr-4">
                              <span className={`text-[10px] font-black uppercase ${ytFetchMode === 'kol' ? 'text-blue-400' : 'text-gray-400'}`}>@{vid.author}</span>
                              <span className="text-gray-100 group-hover:text-white transition-colors leading-relaxed">{vid.title}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right text-gray-200 font-bold">{vid.views.toLocaleString()}</td>
                          <td className="py-4 px-4 text-right text-blue-400">{vid.likes.toLocaleString()}</td>
                          <td className="py-4 px-4 text-right text-red-400">{vid.dislikes.toLocaleString()}</td>
                          <td className="py-4 px-4 text-center">
                            <a href={vid.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-gray-500 hover:text-white"><ExternalLink size={16} /></a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 md:hidden px-3 mt-2">
                  {sortedYtVideos.map((vid, idx) => (
                    <div key={vid.id} className="bg-[#0d1117]/50 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[10px] font-black uppercase ${ytFetchMode === 'kol' ? 'text-blue-400' : 'text-gray-400'}`}>@{vid.author}</span>
                        <span className="text-[10px] text-gray-500 font-medium px-2 py-0.5 bg-[#1c2128] rounded">#{idx + 1}</span>
                      </div>
                      <h3 className="text-gray-200 font-medium text-sm leading-snug">{vid.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                        <span>{vid.date}</span><span>•</span><span>{vid.time}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 py-3 mt-1 border-t border-white/5">
                         <div className="flex flex-col items-center justify-center">
                           <span className="text-gray-500 text-[10px] flex items-center gap-1"><Eye size={10}/> View</span>
                           <span className="text-gray-200 font-bold text-xs">{vid.views.toLocaleString()}</span>
                         </div>
                         <div className="flex flex-col items-center justify-center">
                           <span className="text-gray-500 text-[10px] flex items-center gap-1"><ThumbsUp size={10}/> Like</span>
                           <span className="text-blue-400 font-bold text-xs">{vid.likes.toLocaleString()}</span>
                         </div>
                         <div className="flex flex-col items-center justify-center">
                           <span className="text-gray-500 text-[10px] flex items-center gap-1"><ThumbsDown size={10}/> Dislike</span>
                           <span className="text-red-400 font-bold text-xs">{vid.dislikes.toLocaleString()}</span>
                         </div>
                      </div>
                      <div className="pt-2 border-t border-white/5 flex justify-end">
                        <a href={vid.link} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 w-full bg-gray-700 hover:bg-gray-600 shadow-md">
                          <ExternalLink size={14} /> Tonton Video
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="w-full flex justify-center items-center h-64 text-gray-500 text-sm">Tidak ada video terkait.</div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // HALAMAN UTAMA (MENU DEPAN)
  // =========================================================================
  if (currentPage === "main") {
    return (
      <main className="h-screen w-screen overflow-hidden bg-[#0d1117] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-3xl flex flex-col items-center justify-center gap-6 md:gap-8 h-full max-h-[95vh]">
          
          <div className="text-center shrink-0 mb-2">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm mb-2">Public Trend Radar</h1>
            <p className="text-gray-400 text-sm md:text-base font-medium">Monitoring isu publik terupdate secara real-time.</p>
          </div>
          
          <div className="flex flex-col gap-5 md:gap-6 w-full px-2 md:px-8">
            <div className="flex flex-row items-center w-full group cursor-pointer transition-transform duration-300 hover:translate-x-2">
              <img src="/nasional.png" alt="Nasional" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover shrink-0 shadow-lg border border-gray-800/50" />
              <div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left">
                <h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">Berita Nasional</h2>
                <button onClick={() => setCurrentPage("nasional")} className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors">
                  <Search size={16}/> Cek Sekarang
                </button>
              </div>
            </div>

            <div className="flex flex-row items-center w-full group cursor-pointer transition-transform duration-300 hover:translate-x-2">
              <img src="/bencana.png" alt="Bencana" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover shrink-0 shadow-lg border border-gray-800/50" />
              <div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left">
                <h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">Bencana Terkini</h2>
                <button onClick={() => setCurrentPage("bencana")} className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors">
                  <Search size={16}/> Cek Sekarang
                </button>
              </div>
            </div>

            <div className="flex flex-row items-center w-full group cursor-pointer transition-transform duration-300 hover:translate-x-2">
              <img src="/pdip.png" alt="PDIP" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover shrink-0 shadow-lg border border-gray-800/50" />
              <div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left">
                <h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">PDI Perjuangan</h2>
                <button onClick={() => setCurrentPage("pdip")} className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors">
                  <Search size={16}/> Cek Sekarang
                </button>
              </div>
            </div>

            <div className="flex flex-row items-center w-full group cursor-pointer transition-transform duration-300 hover:translate-x-2">
              <img src="/megawati.png" alt="Megawati" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover shrink-0 shadow-lg border border-gray-800/50" />
              <div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left">
                <h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">Megawati Soekarnoputri</h2>
                <button onClick={() => setCurrentPage("megawati")} className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors">
                  <Search size={16}/> Cek Sekarang
                </button>
              </div>
            </div>

            <div className="flex flex-row items-center w-full group cursor-pointer transition-transform duration-300 hover:translate-x-2">
              <img src="/puan.png" alt="Puan Maharani" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover object-top shrink-0 shadow-lg border border-gray-800/50" />
              <div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left">
                <h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">Puan Maharani</h2>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  <button onClick={() => setCurrentPage("puan")} className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors">
                    <Search size={16}/> Cek Sekarang
                  </button>
                  <button onClick={() => setCurrentPage("puan-yt-analysis")} className="bg-transparent text-gray-400 hover:bg-gray-800 hover:text-white py-2 px-4 md:px-5 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 transition-colors">
                    <PlaySquare size={16}/> YouTube
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    );
  }

  // --- HALAMAN DAFTAR MONITORING BERITA ---
  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center relative">
      
      {/* ======================================================================= */}
      {/* MODAL PROMPT ANALISIS AI (TEKS DIJAMIN RAPI & TERBACA JELAS 100%) */}
      {/* ======================================================================= */}
      {promptModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-center p-5 border-b border-[#30363d] bg-[#1c2128]">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Megaphone size={18} className="text-blue-400" /> Copy Prompt Analisis AI
              </h3>
              <button onClick={() => setPromptModalData(null)} className="text-gray-400 hover:text-white transition-colors p-1 bg-white/5 hover:bg-white/10 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 md:p-6 bg-[#0d1117] flex-1">
              <div className="bg-[#1c2128] border border-[#30363d] rounded-xl p-5 max-h-[60vh] overflow-y-auto shadow-inner">
                {/* Pakai div dengan style line-height statis agar mustahil tumpang tindih */}
                <div 
                  className="text-[13px] md:text-sm text-gray-200 whitespace-pre-wrap font-mono selection:bg-blue-500/30 block" 
                  style={{ lineHeight: '1.8' }}
                >
                  {generatePromptText(promptModalData)}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-[#30363d] flex justify-end bg-[#1c2128]">
              <button 
                onClick={() => handleCopyPrompt(generatePromptText(promptModalData))}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${isCopied ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'}`}
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                {isCopied ? "Prompt Tersalin!" : "Copy Prompt"}
              </button>
            </div>

          </div>
        </div>
      )}

      <div className="w-full max-w-[1400px] mt-4">
        
        {/* HEADER MENU UTAMA */}
        <div className="flex flex-wrap gap-4 justify-between items-center w-full px-2">
          <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-gray-400 hover:text-white font-semibold transition-colors">
            <ArrowLeft size={18} /> Menu Utama
          </button>
          
          <h1 className="text-xl md:text-2xl font-black text-white text-center flex-1 hidden md:block">
            Daftar Monitor Isu
          </h1>

          <button onClick={fetchLiveTrends} className="flex items-center gap-2 bg-[#161b22] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1f242c] transition-colors">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* FILTER CATEGORY */}
        <div className="w-full my-8 md:my-12">
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-8 px-2">
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
          <div className="bg-[#161b22] rounded-2xl shadow-2xl overflow-hidden pb-6">
            
            <div className="w-full px-4 md:px-6 py-4 flex flex-wrap justify-between items-center gap-3">
              <h1 className="text-lg font-bold text-white md:hidden">Daftar Isu Terkini</h1>
              <div className="flex items-center gap-3 md:ml-auto">
                <button 
                  onClick={() => setIsTopNewsFilter(!isTopNewsFilter)} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isTopNewsFilter ? 'bg-orange-500 text-white' : 'bg-[#1c2128] text-gray-400 hover:text-orange-400'}`}
                >
                  <Flame size={14} className={isTopNewsFilter ? "text-white" : "text-orange-500"} /> Filter Top News
                </button>
                <span className="text-xs font-medium text-gray-500 hidden md:block">Total: {tableData.length} data</span>
              </div>
            </div>

            {tableData.length > 0 ? (
              <>
                {/* TAMPILAN DESKTOP */}
                <div className="hidden md:block w-full overflow-x-auto mt-2">
                  <table className="w-full border-collapse text-xs md:text-sm text-left">
                    <thead>
                      <tr className="text-gray-500 uppercase tracking-wider font-semibold text-[10px] md:text-[11px]">
                        <th className="py-5 px-4 w-12 text-center">No</th>
                        <th className="py-5 px-4 w-32 whitespace-nowrap">Tanggal</th>
                        <th className="py-5 px-4 w-20 whitespace-nowrap text-center">Waktu</th>
                        <th className="py-5 px-4 w-32 whitespace-nowrap">Sumber</th>
                        <th className="py-5 px-4 w-28">Kategori</th>
                        <th className="py-5 px-4 w-[50%]">Judul Konten</th>
                        <th className="py-5 px-4 w-24 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((isu, idx) => {
                        const { date, time } = formatDateTime(isu.pubDate);
                        const newsLink = getCleanLink(isu);

                        return (
                          <tr key={idx} className="group transition-colors odd:bg-transparent even:bg-white/[0.02] hover:bg-white/[0.05]">
                            <td className="py-4 px-4 text-center text-gray-500 font-medium">{idx + 1}</td>
                            <td className="py-4 px-4 text-gray-400 whitespace-nowrap">{date}</td>
                            <td className="py-4 px-4 text-gray-400 whitespace-nowrap text-center">{time}</td>
                            <td className="py-4 px-4 text-gray-300 font-medium truncate max-w-[128px]">{isu.source || '-'}</td>
                            <td className="py-4 px-4">
                              <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isRedTheme ? 'bg-red-950/30 text-red-400' : 'bg-blue-950/30 text-blue-400'}`}>
                                {isu.kategori}
                              </span>
                            </td>
                            
                            {/* KOLOM JUDUL KONTEN - DIKUNCI MATI DENGAN GRID CSS */}
                            <td className="py-4 px-4">
                              <div className="grid grid-cols-[1fr_30px_60px] gap-2 items-start w-full">
                                
                                {/* 1. Judul (Ambil semua sisa ruang yang ada) */}
                                <div className="pr-4">
                                  <span className="text-gray-200 font-medium leading-relaxed group-hover:text-white transition-colors block">
                                    {isu.topik}
                                  </span>
                                </div>
                                
                                {/* 2. Megaphone (Dikunci lebar absolut 30px) */}
                                <div className="flex justify-center pt-0.5">
                                  <button 
                                    onClick={() => handleOpenPrompt(isu)} 
                                    title="Generate Prompt Analisis" 
                                    className="text-gray-400 hover:text-blue-400 transition-colors bg-white/5 hover:bg-blue-500/20 p-1.5 rounded-md flex items-center justify-center h-[26px] w-[26px]"
                                  >
                                    <Megaphone size={13} />
                                  </button>
                                </div>

                                {/* 3. TOP Badge (Dikunci lebar absolut 60px) */}
                                <div className="flex justify-end pt-0.5">
                                  {isu.isTrending && (
                                    <div className="bg-orange-500/10 px-1.5 py-0.5 rounded flex items-center justify-center gap-1 h-[26px]" title="Top News (Trending)">
                                      <Flame size={12} className="text-orange-500" />
                                      <span className="text-[9px] font-bold text-orange-500 uppercase">Top</span>
                                    </div>
                                  )}
                                </div>

                              </div>
                            </td>

                            <td className="py-4 px-4 text-center">
                              {newsLink !== "#" ? (
                                <a href={newsLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 mx-auto max-w-[90px] bg-gray-700 hover:bg-gray-600 shadow-md">
                                  <ExternalLink size={14} /> Baca
                                </a>
                              ) : (
                                <span className="text-gray-600 text-xs font-medium italic">No Link</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* TAMPILAN MOBILE */}
                <div className="flex flex-col gap-3 md:hidden px-3 mt-2">
                  {tableData.map((isu, idx) => {
                    const { date, time } = formatDateTime(isu.pubDate);
                    const newsLink = getCleanLink(isu);

                    return (
                      <div key={idx} className="bg-[#0d1117]/50 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isRedTheme ? 'bg-red-950/30 text-red-400' : 'bg-blue-950/30 text-blue-400'}`}>
                            {isu.kategori}
                          </span>
                          <div className="flex items-center gap-2">
                            {isu.isTrending && (
                              <div className="bg-orange-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Flame size={10} className="text-orange-500" />
                                <span className="text-[9px] font-bold text-orange-500 uppercase">Top</span>
                              </div>
                            )}
                            <span className="text-[10px] text-gray-500 font-medium px-2 py-0.5 bg-[#1c2128] rounded">#{idx + 1}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-gray-200 font-medium text-sm leading-snug">
                            {isu.topik}
                          </h3>
                          <button 
                            onClick={() => handleOpenPrompt(isu)} 
                            title="Generate Prompt Analisis" 
                            className="shrink-0 mt-0.5 text-gray-400 hover:text-blue-400 bg-white/5 p-2 rounded-lg transition-colors"
                          >
                            <Megaphone size={14} />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                          <span>{date}</span><span>•</span><span>{time}</span><span>•</span>
                          <span className="text-gray-400 font-medium">{isu.source || '-'}</span>
                        </div>

                        <div className="pt-3 mt-1 border-t border-white/5 flex justify-end">
                          {newsLink !== "#" ? (
                            <a href={newsLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 w-full bg-gray-700 hover:bg-gray-600 shadow-md">
                              <ExternalLink size={14} /> Baca Artikel
                            </a>
                          ) : (
                            <span className="text-gray-600 text-xs font-medium italic w-full text-center">No Link Available</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
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
