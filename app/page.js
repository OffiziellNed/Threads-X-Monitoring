"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { 
  ArrowLeft, RefreshCw, ExternalLink, Calendar, Building2, Filter, 
  DownloadCloud, Copy, CheckCircle2, PlaySquare, TrendingUp, Zap, 
  AlertTriangle 
} from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [previousPage, setPreviousPage] = useState("main");
  const [selectedIssue, setSelectedIssue] = useState(null);
  
  const [issuesData, setIssuesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [ytData, setYtData] = useState([]);
  const [isLoadingYt, setIsLoadingYt] = useState(false);
  const [ytSortMode, setYtSortMode] = useState("views"); 
  const [ytFetchMode, setYtFetchMode] = useState("umum"); 
  
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const categories = ["Semua", "Politik", "Pemerintahan", "Sosial", "Hukum", "Bencana", "Entertainment", "Olahraga", "Teknologi", "Finansial"];

  const [isScraping, setIsScraping] = useState(false);
  const [scrapedResult, setScrapedResult] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const fetchLiveTrends = async () => {
    setIsLoading(true);
    try {
      let endpoint = '';
      if (currentPage === 'bencana-24jam') {
        endpoint = `/api/bencana?t=${Date.now()}`;
      } else if (currentPage.includes('pdip')) {
        endpoint = currentPage.includes('terkini') ? `/api/pdip?hours=24&mode=terkini&t=${Date.now()}` : `/api/pdip?hours=12&t=${Date.now()}`;
      } else if (currentPage.includes('megawati')) {
        endpoint = currentPage.includes('terkini') ? `/api/megawati?hours=24&mode=terkini&t=${Date.now()}` : `/api/megawati?hours=12&t=${Date.now()}`;
      } else if (currentPage.includes('puan')) {
        endpoint = currentPage.includes('terkini') ? `/api/puan?hours=24&mode=terkini&t=${Date.now()}` : `/api/puan?hours=12&t=${Date.now()}`;
      } else {
        endpoint = currentPage.includes('terkini') ? `/api/news?hours=24&mode=terkini&t=${Date.now()}` : `/api/news?hours=12&t=${Date.now()}`;
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
  const prevTerkini = previousPage.includes("terkini") || previousPage === "bencana-24jam";
  const isTerkiniMode = currentPage.includes("terkini") || isBencanaMode || (currentPage === "detail" && prevTerkini);
  
  const isRedPrev = previousPage.includes("pdip") || previousPage.includes("puan") || previousPage.includes("megawati");
  const isRedCurr = currentPage.includes("pdip") || currentPage.includes("puan") || currentPage.includes("megawati");
  const isRedTheme = isRedCurr || (currentPage === "detail" && isRedPrev);

  let filteredData = issuesData;
  if (!isTerkiniMode && selectedCategory !== "Semua") {
    filteredData = issuesData.filter(issue => issue.kategori === selectedCategory);
  }

  const chartData = filteredData.slice(0, 5); 
  const listData = filteredData.slice(0, isTerkiniMode ? 20 : 10); 

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
    return (
      <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-6 mt-6">
          <button onClick={() => setCurrentPage(previousPage)} className="flex items-center gap-2 text-gray-400 hover:text-blue-400"><ArrowLeft size={20} /> Kembali</button>
          <div className="bg-[#161b22] p-8 rounded-2xl shadow-xl border border-[#30363d] space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white">{selectedIssue.topik}</h1>
            <div className="flex gap-4 text-sm text-gray-400 border border-[#30363d] p-3 rounded-lg bg-[#0d1117]">
              <span>Sumber: {selectedIssue.source}</span> | <span>Rilis: {selectedIssue.pubDate}</span>
            </div>
            <p className="text-gray-300 leading-relaxed py-4 border-y border-[#30363d]">{selectedIssue.articleDesc}</p>
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-bold text-white">Pembuat Opini AI</span>
              <button onClick={handleSedotData} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
                <DownloadCloud size={16} /> Sedot Prompt
              </button>
            </div>
            {scrapedResult && (
              <div className="mt-4 bg-[#0d1117] rounded-xl border border-[#30363d] p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">Hasil Prompt</span>
                  <button onClick={handleCopyPrompt} className="text-sm text-gray-300 flex items-center gap-1"><Copy size={14}/> Salin</button>
                </div>
                <pre className="text-sm whitespace-pre-wrap">{scrapedResult}</pre>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // HALAMAN UTAMA (2 ATAS, 3 BAWAH, UKURAN 130PX PAS SATU LAYAR PENUH)
  // =========================================================================
  if (currentPage === "main") {
    // Ukuran card diperkecil menjadi 130px agar pas satu layar penuh tanpa scroll
    const boxCard = "relative group overflow-hidden rounded-xl shadow-lg border border-[#30363d] bg-[#161b22] flex-none w-[130px] h-[130px]";

    return (
      <main className="min-h-screen px-2 py-3 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full max-w-[550px] space-y-3 text-center">
          <div className="space-y-0.5">
            <h1 className="text-xl md:text-2xl font-black text-white">Public Trend Radar</h1>
            <p className="text-gray-400 text-[11px] font-medium">Monitoring isu publik terupdate secara real-time.</p>
          </div>
          
          <div className="flex flex-col items-center gap-2.5 w-full">
            
            {/* BARIS ATAS: 2 CARD (Berita Nasional & Bencana) */}
            <div className="flex flex-wrap justify-center gap-2.5 w-full">
              
              {/* CARD 1: Berita Nasional */}
              <div className={boxCard}>
                <img src="/nasional.png" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Nasional" />
                <div className="absolute inset-0 bg-black bg-opacity-85 backdrop-blur-sm flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <h2 className="text-[11px] font-black text-white mb-2 drop-shadow-md text-center leading-tight">Berita Nasional Umum</h2>
                  <div className="flex flex-col gap-1 w-full max-w-[105px]">
                    <button onClick={() => setCurrentPage("12jam")} className="bg-blue-600 hover:bg-blue-500 py-1 rounded text-[9px] font-bold w-full flex items-center justify-center gap-1"><TrendingUp size={10}/> Top News</button>
                    <button onClick={() => setCurrentPage("terkini")} className="bg-blue-600 hover:bg-blue-500 py-1 rounded text-[9px] font-bold w-full flex items-center justify-center gap-1"><Zap size={10}/> Terkini</button>
                  </div>
                </div>
              </div>

              {/* CARD 2: Bencana Terkini */}
              <div className={boxCard}>
                <img src="/bencana.png" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Bencana" />
                <div className="absolute inset-0 bg-black bg-opacity-85 backdrop-blur-sm flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <h2 className="text-[11px] font-black text-orange-400 mb-2 drop-shadow-md text-center leading-tight">Berita Bencana Terkini</h2>
                  <div className="flex flex-col gap-1 w-full max-w-[105px]">
                    <button onClick={() => setCurrentPage("bencana-24jam")} className="bg-orange-600 hover:bg-orange-500 py-1 rounded text-[9px] font-bold w-full flex items-center justify-center gap-1"><AlertTriangle size={10}/> Radar Bencana</button>
                  </div>
                </div>
              </div>

            </div>

            {/* BARIS BAWAH: 3 CARD (PDIP, Megawati, Puan) */}
            <div className="flex flex-wrap justify-center gap-2.5 w-full">

              {/* CARD 3: PDI Perjuangan */}
              <div className={boxCard}>
                <img src="/pdip.png" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="PDIP" />
                <div className="absolute inset-0 bg-black bg-opacity-85 backdrop-blur-sm flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <h2 className="text-[11px] font-black text-red-500 mb-2 drop-shadow-md text-center leading-tight">PDI Perjuangan</h2>
                  <div className="flex flex-col gap-1 w-full max-w-[105px]">
                    <button onClick={() => setCurrentPage("pdip-12jam")} className="bg-red-600 hover:bg-red-500 py-1 rounded text-[9px] font-bold w-full flex items-center justify-center gap-1"><TrendingUp size={10}/> Top News</button>
                    <button onClick={() => setCurrentPage("pdip-terkini")} className="bg-red-600 hover:bg-red-500 py-1 rounded text-[9px] font-bold w-full flex items-center justify-center gap-1"><Zap size={10}/> Terkini</button>
                  </div>
                </div>
              </div>

              {/* CARD 4: Megawati */}
              <div className={boxCard}>
                <img src="/megawati.png" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Megawati" />
                <div className="absolute inset-0 bg-black bg-opacity-85 backdrop-blur-sm flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <h2 className="text-[11px] font-black text-red-500 mb-2 drop-shadow-md text-center leading-tight">Megawati Soekarnoputri</h2>
                  <div className="flex flex-col gap-1 w-full max-w-[105px]">
                    <button onClick={() => setCurrentPage("megawati-12jam")} className="bg-red-600 hover:bg-red-500 py-1 rounded text-[9px] font-bold w-full flex items-center justify-center gap-1"><TrendingUp size={10}/> Top News</button>
                    <button onClick={() => setCurrentPage("megawati-terkini")} className="bg-red-600 hover:bg-red-500 py-1 rounded text-[9px] font-bold w-full flex items-center justify-center gap-1"><Zap size={10}/> Terkini</button>
                  </div>
                </div>
              </div>

              {/* CARD 5: Puan Maharani */}
              <div className={boxCard}>
                <img src="/puan.png" className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500" alt="Puan Maharani" />
                <div className="absolute inset-0 bg-black bg-opacity-85 backdrop-blur-sm flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <h2 className="text-[11px] font-black text-red-500 mb-2 drop-shadow-md text-center leading-tight">Puan Maharani</h2>
                  <div className="flex flex-col gap-1 w-full max-w-[105px]">
                    <button onClick={() => setCurrentPage("puan-12jam")} className="bg-red-600 hover:bg-red-500 py-0.5 rounded text-[8px] font-bold w-full flex items-center justify-center gap-0.5"><TrendingUp size={10}/> Top News</button>
                    <button onClick={() => setCurrentPage("puan-terkini")} className="bg-red-600 hover:bg-red-500 py-0.5 rounded text-[8px] font-bold w-full flex items-center justify-center gap-0.5"><Zap size={10}/> Terkini</button>
                    <button onClick={() => setCurrentPage("puan-yt-analysis")} className="bg-red-950 border border-red-500 hover:bg-red-900 py-0.5 rounded text-[8px] font-bold w-full flex items-center justify-center gap-0.5"><PlaySquare size={10}/> YouTube Data</button>
                  </div>
                </div>
              </div>

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
          <button onClick={fetchLiveTrends} className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] px-4 py-2 rounded-xl text-sm hover:border-white transition-colors">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh Data
          </button>
        </div>

        {!isTerkiniMode && (
          <div className="w-full flex flex-wrap items-center gap-2">
            <Filter size={14} className="text-gray-400"/>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#161b22] text-gray-400 border-[#30363d]'}`}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div></div>
        ) : (
          <>
            {!isTerkiniMode && chartData.length > 0 && (
              <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d]">
                <h2 className="text-lg font-semibold mb-6 text-white">Grafik Top 5 Topik Berita</h2>
                <div className="w-full h-[250px]"> 
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis type="number" stroke="#4b5563" />
                      <YAxis dataKey="topik" type="category" width={200} tick={{fontSize: 11, fill: '#e5e7eb', fontWeight: 'bold'}} interval={0} />
                      <Tooltip cursor={{fill: '#1f2937'}} contentStyle={{backgroundColor: '#0d1117', borderColor: '#30363d', color: '#fff'}} />
                      <Bar dataKey="volume" fill={isRedTheme ? '#ef4444' : '#3b82f6'} radius={[0, 4, 4, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="space-y-4 pb-10">
              <h2 className="text-xl font-bold mt-8 text-white">{isTerkiniMode ? "Log Update Terkini" : "Rincian Pokok Masalah"}</h2>
              {listData.length > 0 ? listData.map((isu, index) => (
                <div key={index} className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] border-l-4 border-l-blue-500 flex justify-between items-start">
                  <div className="pr-4 w-full">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">{isu.kategori}</span>
                    <h3 className="text-lg font-bold text-white mt-1 leading-snug">#{index + 1} - {isu.topik}</h3>
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5"><Calendar size={14}/> Dirilis: {isu.pubDate}</p>
                  </div>
                  <button onClick={() => handleOpenDetail(isu)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm shrink-0">Detail</button>
                </div>
              )) : (
                <p className="text-gray-500 text-center">Data kosong / memproses API.</p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
