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

  const [promptModalData, setPromptModalData] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  const fetchLiveTrends = async () => {
    setIsLoading(true);
    try {
      let epTop = "";
      let epTerkini = "";
      let nowTime = String(Date.now());

      if (currentPage === "bencana") {
        epTop = "/api/bencana?t=" + nowTime;
        epTerkini = "/api/bencana?t=" + nowTime;
      } else if (currentPage === "pdip") {
        epTop = "/api/pdip?hours=12&t=" + nowTime;
        epTerkini = "/api/pdip?hours=24&mode=terkini&t=" + nowTime;
      } else if (currentPage === "megawati") {
        epTop = "/api/megawati?hours=12&t=" + nowTime;
        epTerkini = "/api/megawati?hours=24&mode=terkini&t=" + nowTime;
      } else if (currentPage === "puan") {
        epTop = "/api/puan?hours=12&t=" + nowTime;
        epTerkini = "/api/puan?hours=24&mode=terkini&t=" + nowTime;
      } else if (currentPage === "nasional") {
        epTop = "/api/news?hours=12&t=" + nowTime;
        epTerkini = "/api/news?hours=24&mode=terkini&t=" + nowTime;
      }

      if (epTop && epTerkini) {
        const resTopRaw = await fetch(epTop, { cache: "no-store" });
        const resTerkiniRaw = await fetch(epTerkini, { cache: "no-store" });
        const resTop = await resTopRaw.json();
        const resTerkini = await resTerkiniRaw.json();
        
        if (resTop && resTop.success) {
           setTopNewsData(resTop.data);
        } else {
           setTopNewsData([]);
        }

        if (resTerkini && resTerkini.success) {
           setTerkiniData(resTerkini.data);
        } else {
           setTerkiniData([]);
        }
      }
    } catch (error) {
      setTopNewsData([]);
      setTerkiniData([]);
    } 
    finally { 
      setIsLoading(false); 
    }
  };

  const fetchYoutubeData = async () => {
    setIsLoadingYt(true);
    try {
      const ytUrl = "/api/puan-yt?mode=" + ytFetchMode + "&t=" + String(Date.now());
      const response = await fetch(ytUrl, { cache: "no-store" });
      const result = await response.json();
      if (result && result.success) {
         setYtData(result.data);
      }
    } catch (error) {} 
    finally { 
      setIsLoadingYt(false); 
    }
  };

  useEffect(() => {
    if (currentPage === "puan-yt-analysis") {
      fetchYoutubeData();
    } else if (currentPage !== "main") {
      fetchLiveTrends();
      setSelectedCategory("Semua"); 
      setIsTopNewsFilter(false);
    }
  }, [currentPage, ytFetchMode]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: "-", time: "-" };
    let str = String(dateStr);
    let strLower = str.toLowerCase();
    let datePart = str;
    let timePart = "-";
    
    let pukulIdx = strLower.indexOf("pukul");
    if (pukulIdx !== -1) {
      datePart = str.substring(0, pukulIdx).trim();
      if (datePart.endsWith(",")) {
        datePart = datePart.substring(0, datePart.length - 1);
      }
      let afterPukul = strLower.substring(pukulIdx + 5);
      afterPukul = afterPukul.split("wib").join("");
      afterPukul = afterPukul.split("wita").join("");
      afterPukul = afterPukul.split("wit").join("");
      timePart = afterPukul.trim().split(".").join(":");
    } else if (str.indexOf(":") !== -1) {
      let parts = str.split(" ");
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].indexOf(":") !== -1) {
          timePart = parts[i];
          datePart = str.replace(timePart, "").trim();
          if (datePart.endsWith(",")) {
            datePart = datePart.substring(0, datePart.length - 1);
          }
          break;
        }
      }
    }
    
    let cleanDate = datePart.toLowerCase().split("wib").join("").split("wita").join("").split("wit").join("").trim();
    return { date: cleanDate || "-", time: timePart };
  };

  const getCleanLink = (isu) => {
    try {
      let dataString = JSON.stringify(isu);
      let httpPrefix = "http";
      let httpIndex = dataString.indexOf(httpPrefix);
      if (httpIndex !== -1) {
        let quote1 = dataString.indexOf('"', httpIndex);
        let quote2 = dataString.indexOf("'", httpIndex);
        let space = dataString.indexOf(" ", httpIndex);
        
        let endIndexes = [];
        if (quote1 !== -1) endIndexes.push(quote1);
        if (quote2 !== -1) endIndexes.push(quote2);
        if (space !== -1) endIndexes.push(space);
        
        let end = endIndexes.length > 0 ? Math.min(...endIndexes) : dataString.length;
        let link = dataString.substring(httpIndex, end);
        link = link.split("\\").join(""); 
        
        if (link.indexOf("google.com") !== -1) {
          try {
            let cleanUrlStr = link.split("&amp;").join("&");
            let urlObj = new URL(cleanUrlStr);
            let clean = urlObj.searchParams.get("url") || urlObj.searchParams.get("q");
            if (clean) return clean;
          } catch (e) {}
        }
        return link; 
      }
    } catch(e) {}
    return "#";
  };

  const handleOpenPrompt = async (isu) => {
    const newsLink = getCleanLink(isu);
    
    setPromptModalData({ 
      ...isu, 
      fullText: "Mengaktifkan sistem...\nMenyedot artikel penuh dari website sumber (Maksimal 8 detik)..." 
    });
    
    if (newsLink && newsLink !== "#") {
      try {
        const fullScrapeUrl = "/api/scrape?url=" + encodeURIComponent(newsLink);
        const fetchPromise = fetch(fullScrapeUrl);
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 8000));
        
        const res = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (res.timeout) {
           setPromptModalData({ ...isu, fullText: "Gagal memuat isi berita. Koneksi timeout." });
           return;
        }

        const data = await res.json();
        
        if (data && data.success && data.text) {
          setPromptModalData({ ...isu, fullText: data.text });
        } else {
          setPromptModalData({ ...isu, fullText: "Gagal memuat isi berita. Halaman sumber diproteksi atau berupa video tanpa teks." });
        }
      } catch (err) {
        setPromptModalData({ ...isu, fullText: "Gagal memuat isi berita. Koneksi timeout." });
      }
    } else {
      setPromptModalData({ ...isu, fullText: "URL tidak valid." });
    }
  };

  const generatePromptText = (data) => {
    let titleText = data.articleTitle || data.topik || data.title || "";
    let descText = data.fullText || "Teks tidak tersedia.";
    return "Tolong identifikasi isu, paparkan fakta penting, berikan 10 perspektif 5 opini Pro dan 5 Opini Kontra untuk X atau Threads, Jika kontra boleh gunakan Bahasa satir, sarkas, tajam. Pastikan singkat singkat saja\n\nJudul Berita:\n" + titleText + "\n\nIsi Berita:\n" + descText;
  };

  const handleCopyPrompt = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {}
  };

  const isRedPrev = previousPage.indexOf("pdip") !== -1 || previousPage.indexOf("puan") !== -1 || previousPage.indexOf("megawati") !== -1;
  const isRedCurr = currentPage.indexOf("pdip") !== -1 || currentPage.indexOf("puan") !== -1 || currentPage.indexOf("megawati") !== -1;
  const isRedTheme = isRedCurr || isRedPrev;

  const topNewsTitles = topNewsData.map(d => d.topik);
  let tableData = terkiniData.map(d => ({
    ...d,
    isTrending: topNewsTitles.indexOf(d.topik) !== -1
  }));

  if (selectedCategory !== "Semua") {
     tableData = tableData.filter(d => d.kategori === selectedCategory);
  }
  if (isTopNewsFilter) {
     tableData = tableData.filter(d => d.isTrending);
  }

  if (currentPage === "puan-yt-analysis") {
    let sortedYtVideos = ytData && ytData.length > 0 ? [...ytData].sort((a, b) => b[ytSortMode] - a[ytSortMode]) : [];

    return (
      <main className="min-h-screen p-4 md:p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center relative">
        
        {promptModalData && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
            <div className="w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col rounded-2xl" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
              <div className="flex justify-between items-center p-5" style={{ backgroundColor: "#1c2128", borderBottom: "1px solid #30363d" }}>
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Megaphone size={18} className="text-blue-400" /> Copy Prompt Analisis AI
                </h3>
                <button onClick={() => setPromptModalData(null)} className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg" style={{ backgroundColor: "#2a313c" }}>
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto max-h-[60vh]" style={{ backgroundColor: "#0d1117" }}>
                <div className="rounded-xl p-5 shadow-inner" style={{ backgroundColor: "#1c2128", border: "1px solid #30363d" }}>
                  <pre className="text-[13px] md:text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed font-normal selection:bg-[#1e3a8a]">
                    {generatePromptText(promptModalData)}
                  </pre>
                </div>
              </div>
              <div className="p-4 flex justify-end" style={{ backgroundColor: "#1c2128", borderTop: "1px solid #30363d" }}>
                <button 
                  onClick={() => handleCopyPrompt(generatePromptText(promptModalData))}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${isCopied ? "bg-[#16a34a] text-white shadow-md" : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md"}`}
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                  {isCopied ? "Prompt Tersalin!" : "Copy Prompt"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-[1400px] mx-auto mt-4">
          <div className="flex flex-wrap gap-4 justify-between items-center w-full px-2 mb-8">
            <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-gray-400 hover:text-white font-semibold transition-colors">
              <ArrowLeft size={18} /> Menu Utama
            </button>
            <h1 className="text-xl md:text-2xl font-black text-white text-center flex-1 hidden md:block">
              YouTube Analysis
            </h1>
            <button onClick={fetchYoutubeData} className="flex items-center gap-2 bg-[#161b22] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1f242c] transition-colors">
              <RefreshCw size={16} className={isLoadingYt ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          <div className="bg-[#161b22] rounded-2xl shadow-2xl overflow-hidden flex flex-col pb-4">
            <div className="w-full flex items-center" style={{ backgroundColor: "#0d1117" }}>
              <button onClick={() => setYtFetchMode("umum")} className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${ytFetchMode === "umum" ? "text-red-500 bg-[#331c0b]" : "text-gray-400 hover:bg-[#161b22]"}`}>Semua Saluran</button>
              <button onClick={() => setYtFetchMode("kol")} className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${ytFetchMode === "kol" ? "text-blue-500 bg-[#172033]" : "text-gray-400 hover:bg-[#161b22]"}`}>KOL / Berita</button>
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
              <div className="w-full flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563eb]"></div></div>
            ) : sortedYtVideos.length > 0 ? (
              <>
                <div className="hidden md:block w-full overflow-x-auto mt-2">
                  <table className="w-full border-collapse text-xs md:text-sm text-left border-none">
                    <thead className="border-none">
                      <tr className="text-gray-500 uppercase tracking-wider font-semibold text-[10px] md:text-[11px] border-none">
                        <th className="py-5 px-4 text-center w-10 border-none">No</th>
                        <th className="py-5 px-4 text-left w-24 border-none">Tanggal</th>
                        <th className="py-5 px-4 text-left w-20 border-none">Waktu</th>
                        <th className="py-5 px-4 text-left border-none">Judul Konten</th>
                        <th className="py-5 px-4 text-right w-20 border-none">View</th>
                        <th className="py-5 px-4 text-right w-20 border-none">Like</th>
                        <th className="py-5 px-4 text-right w-20 border-none">Dislike</th>
                        <th className="py-5 px-4 text-center w-24 border-none">Link</th>
                      </tr>
                    </thead>
                    <tbody className="border-none">
                      {sortedYtVideos.map((vid, idx) => (
                        <tr key={vid.id} className="group transition-colors odd:bg-transparent even:bg-[#1a1f26] hover:bg-[#252b36] border-none">
                          <td className="py-4 px-4 text-center text-gray-500 font-medium border-none">{idx + 1}</td>
                          <td className="py-4 px-4 text-gray-400 border-none">{vid.date}</td>
                          <td className="py-4 px-4 text-gray-400 border-none">{vid.time}</td>
                          <td className="py-4 px-4 border-none">
                            <div className="flex items-start justify-between w-full">
                              <div className="flex flex-col gap-1 flex-1 pr-4 max-w-[80%]">
                                <span className={`text-[10px] font-black uppercase ${ytFetchMode === "kol" ? "text-blue-400" : "text-gray-400"}`}>@{vid.author}</span>
                                <span className="text-gray-100 group-hover:text-white transition-colors leading-relaxed block">{vid.title}</span>
                              </div>
                              <div className="shrink-0 flex items-start justify-end w-[50px] mt-0.5">
                                <button 
                                  onClick={() => handleOpenPrompt(vid)} 
                                  title="Generate Prompt Analisis" 
                                  className="text-gray-400 hover:text-blue-400 transition-colors bg-[#2a313c] hover:bg-[#1e3a5f] p-1.5 rounded-md flex items-center justify-center"
                                >
                                  <Megaphone size={14} />
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right text-gray-200 font-bold border-none">{vid.views.toLocaleString()}</td>
                          <td className="py-4 px-4 text-right text-blue-400 border-none">{vid.likes.toLocaleString()}</td>
                          <td className="py-4 px-4 text-right text-red-400 border-none">{vid.dislikes.toLocaleString()}</td>
                          <td className="py-4 px-4 text-center border-none">
                            <a href={vid.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-gray-500 hover:text-white"><ExternalLink size={16} /></a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 md:hidden px-3 mt-2">
                  {sortedYtVideos.map((vid, idx) => (
                    <div key={vid.id} className="rounded-xl p-4 flex flex-col gap-3 border-none" style={{ backgroundColor: "#0d1117" }}>
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[10px] font-black uppercase ${ytFetchMode === "kol" ? "text-blue-400" : "text-gray-400"}`}>@{vid.author}</span>
                        <span className="text-[10px] text-gray-500 font-medium px-2 py-0.5 bg-[#1c2128] rounded">#{idx + 1}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-gray-200 font-medium text-sm leading-snug">{vid.title}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                        <span>{vid.date}</span><span>•</span><span>{vid.time}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 py-3 mt-1" style={{ borderTop: "1px solid #1c2128" }}>
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
                      <div className="pt-3 flex justify-end gap-2" style={{ borderTop: "1px solid #1c2128" }}>
                        <button 
                          onClick={() => handleOpenPrompt(vid)} 
                          className="px-3 py-2 rounded-lg text-xs font-bold text-gray-300 bg-[#1c2128] hover:bg-[#2d333b] flex items-center justify-center gap-1.5"
                        >
                          <Megaphone size={14} /> Prompt
                        </button>
                        <a href={vid.link} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 flex-1 bg-[#374151] hover:bg-[#4b5563] shadow-md">
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
              <img src="nasional.png" alt="Nasional" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover shrink-0 shadow-lg border border-[#1c2128]" />
              <div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left">
                <h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">Berita Nasional</h2>
                <button onClick={() => setCurrentPage("nasional")} className="bg-[#374151] hover:bg-[#4b5563] text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors">
                  <Search size={16}/> Cek Sekarang
                </button>
              </div>
            </div>

            <div className="flex flex-row items-center w-full group cursor-pointer transition-transform duration-300 hover:translate-x-2">
              <img src="bencana.png" alt="Bencana" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover shrink-0 shadow-lg border border-[#1c2128]" />
              <div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left">
                <h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">Bencana Terkini</h2>
                <button onClick={() => setCurrentPage("bencana")} className="bg-[#374151] hover:bg-[#4b5563] text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors">
                  <Search size={16}/> Cek Sekarang
                </button>
              </div>
            </div>

            <div className="flex flex-row items-center w-full group cursor-pointer transition-transform duration-300 hover:translate-x-2">
              <img src="pdip.png" alt="PDIP" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover shrink-0 shadow-lg border border-[#1c2128]" />
              <div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left">
                <h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">PDI Perjuangan</h2>
                <button onClick={() => setCurrentPage("pdip")} className="bg-[#374151] hover:bg-[#4b5563] text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors">
                  <Search size={16}/> Cek Sekarang
                </button>
              </div>
            </div>

            <div className="flex flex-row items-center w-full group cursor-pointer transition-transform duration-300 hover:translate-x-2">
              <img src="megawati.png" alt="Megawati" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover shrink-0 shadow-lg border border-[#1c2128]" />
              <div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left">
                <h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">Megawati Soekarnoputri</h2>
                <button onClick={() => setCurrentPage("megawati")} className="bg-[#374151] hover:bg-[#4b5563] text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors">
                  <Search size={16}/> Cek Sekarang
                </button>
              </div>
            </div>

            <div className="flex flex-row items-center w-full group cursor-pointer transition-transform duration-300 hover:translate-x-2">
              <img src="puan.png" alt="Puan Maharani" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover object-top shrink-0 shadow-lg border border-[#1c2128]" />
              <div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left">
                <h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">Puan Maharani</h2>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  <button onClick={() => setCurrentPage("puan")} className="bg-[#374151] hover:bg-[#4b5563] text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors">
                    <Search size={16}/> Cek Sekarang
                  </button>
                  <button onClick={() => setCurrentPage("puan-yt-analysis")} className="bg-transparent text-gray-400 hover:bg-[#1c2128] hover:text-white py-2 px-4 md:px-5 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 transition-colors">
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

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center relative">
      
      {promptModalData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
          <div className="w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col rounded-2xl" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
            
            <div className="flex justify-between items-center p-5" style={{ backgroundColor: "#1c2128", borderBottom: "1px solid #30363d" }}>
              <h3 className="text-white font-bold flex items-center gap-2">
                <Megaphone size={18} className="text-blue-400" /> Copy Prompt Analisis AI
              </h3>
              <button onClick={() => setPromptModalData(null)} className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg" style={{ backgroundColor: "#2a313c" }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto max-h-[60vh]" style={{ backgroundColor: "#0d1117" }}>
              <div className="rounded-xl p-5 shadow-inner" style={{ backgroundColor: "#1c2128", border: "1px solid #30363d" }}>
                <pre className="text-[13px] md:text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed font-normal selection:bg-[#1e3a8a]">
                  {generatePromptText(promptModalData)}
                </pre>
              </div>
            </div>
            
            <div className="p-4 flex justify-end" style={{ backgroundColor: "#1c2128", borderTop: "1px solid #30363d" }}>
              <button 
                onClick={() => handleCopyPrompt(generatePromptText(promptModalData))}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${isCopied ? "bg-[#16a34a] text-white shadow-md" : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md"}`}
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                {isCopied ? "Prompt Tersalin!" : "Copy Prompt"}
              </button>
            </div>

          </div>
        </div>
      )}

      <div className="w-full max-w-[1400px] mt-4">
        
        <div className="flex flex-wrap gap-4 justify-between items-center w-full px-2 mb-8">
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

        <div className="w-full my-8 md:my-12">
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-8 px-2">
            {categories.map((cat) => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat)} 
                className={`text-xs md:text-sm font-bold transition-all ${
                  selectedCategory === cat 
                    ? (isRedTheme ? "text-red-400 border-b-2 border-red-400 pb-1" : "text-blue-400 border-b-2 border-blue-400 pb-1") 
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isRedTheme ? "border-[#dc2626]" : "border-[#2563eb]"}`}></div>
          </div>
        ) : (
          <div className="bg-[#161b22] rounded-2xl shadow-2xl overflow-hidden pb-6">
            
            <div className="w-full px-4 md:px-6 py-4 flex flex-wrap justify-between items-center gap-3">
              <h1 className="text-lg font-bold text-white md:hidden">Daftar Isu Terkini</h1>
              <div className="flex items-center gap-3 md:ml-auto">
                <button 
                  onClick={() => setIsTopNewsFilter(!isTopNewsFilter)} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isTopNewsFilter ? "bg-[#331c0b] text-orange-500" : "bg-[#1c2128] text-gray-400 hover:text-orange-400"}`}
                >
                  <Flame size={14} className={isTopNewsFilter ? "text-orange-500" : "text-gray-400"} /> Filter Top News
                </button>
                <span className="text-xs font-medium text-gray-500 hidden md:block">Total: {tableData.length} data</span>
              </div>
            </div>

            {tableData.length > 0 ? (
              <>
                <div className="hidden md:block w-full overflow-x-auto mt-2">
                  <table className="w-full border-collapse text-xs md:text-sm text-left border-none">
                    <thead className="border-none">
                      <tr className="text-gray-500 uppercase tracking-wider font-semibold text-[10px] md:text-[11px] border-none">
                        <th className="py-5 px-4 w-12 text-center border-none">No</th>
                        <th className="py-5 px-4 w-32 whitespace-nowrap border-none">Tanggal</th>
                        <th className="py-5 px-4 w-20 whitespace-nowrap text-center border-none">Waktu</th>
                        <th className="py-5 px-4 w-32 whitespace-nowrap border-none">Sumber</th>
                        <th className="py-5 px-4 w-28 border-none">Kategori</th>
                        <th className="py-5 px-4 w-[50%] border-none">Judul Konten</th>
                        <th className="py-5 px-4 w-24 text-center border-none">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="border-none">
                      {tableData.map((isu, idx) => {
                        const { date, time } = formatDateTime(isu.pubDate);
                        const newsLink = getCleanLink(isu);

                        return (
                          <tr key={idx} className="group transition-colors odd:bg-transparent even:bg-[#1a1f26] hover:bg-[#252b36] border-none">
                            <td className="py-4 px-4 text-center text-gray-500 font-medium border-none">{idx + 1}</td>
                            <td className="py-4 px-4 text-gray-400 whitespace-nowrap border-none">{date}</td>
                            <td className="py-4 px-4 text-gray-400 whitespace-nowrap text-center border-none">{time}</td>
                            <td className="py-4 px-4 text-gray-300 font-medium truncate max-w-[128px] border-none">{isu.source || "-"}</td>
                            <td className="py-4 px-4 border-none">
                              <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isRedTheme ? "bg-[#450a0a] text-red-400" : "bg-[#172033] text-blue-400"}`}>
                                {isu.kategori}
                              </span>
                            </td>
                            
                            <td className="py-4 px-4 border-none">
                              <div className="flex items-start justify-between w-full">
                                <span className="flex-1 max-w-[80%] pr-4 text-gray-200 font-medium leading-relaxed group-hover:text-white transition-colors">
                                  {isu.topik}
                                </span>
                                <div className="shrink-0 flex items-start justify-end gap-2 w-[100px] mt-0.5">
                                  <button 
                                    onClick={() => handleOpenPrompt(isu)} 
                                    title="Generate Prompt Analisis" 
                                    className="text-gray-400 hover:text-blue-400 transition-colors bg-[#2a313c] hover:bg-[#1e3a5f] p-1.5 rounded-md flex items-center justify-center"
                                  >
                                    <Megaphone size={14} />
                                  </button>
                                  <div className="w-[50px] flex justify-end">
                                    {isu.isTrending && (
                                      <div className="bg-[#332211] px-1.5 py-0.5 rounded flex items-center justify-center gap-1" title="Top News (Trending)">
                                        <Flame size={12} className="text-orange-500" />
                                        <span className="text-[9px] font-bold text-orange-500 uppercase">Top</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4 text-center border-none">
                              {newsLink !== "#" ? (
                                <a href={newsLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 mx-auto max-w-[90px] bg-[#374151] hover:bg-[#4b5563] shadow-md">
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

                <div className="flex flex-col gap-3 md:hidden px-3 mt-2">
                  {tableData.map((isu, idx) => {
                    const { date, time } = formatDateTime(isu.pubDate);
                    const newsLink = getCleanLink(isu);

                    return (
                      <div key={idx} className="rounded-xl p-4 flex flex-col gap-3 border-none" style={{ backgroundColor: "#0d1117" }}>
                        
                        <div className="flex justify-between items-start gap-2">
                          <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isRedTheme ? "bg-[#450a0a] text-red-400" : "bg-[#172033] text-blue-400"}`}>
                            {isu.kategori}
                          </span>
                          <div className="flex items-center gap-2">
                            {isu.isTrending && (
                              <div className="bg-[#332211] px-1.5 py-0.5 rounded flex items-center gap-1">
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
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                          <span>{date}</span>
                          <span>•</span>
                          <span>{time}</span>
                          <span>•</span>
                          <span className="text-gray-400 font-medium">{isu.source || "-"}</span>
                        </div>

                        <div className="pt-3 mt-1 flex justify-end gap-2" style={{ borderTop: "1px solid #1c2128" }}>
                          <button 
                            onClick={() => handleOpenPrompt(isu)} 
                            className="px-3 py-2 rounded-lg text-xs font-bold text-gray-300 bg-[#1c2128] hover:bg-[#2d333b] flex items-center justify-center gap-1.5"
                          >
                            <Megaphone size={14} /> Prompt
                          </button>
                          {newsLink !== "#" ? (
                            <a href={newsLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 flex-1 bg-[#374151] hover:bg-[#4b5563] shadow-md">
                              <ExternalLink size={14} /> Baca Artikel
                            </a>
                          ) : (
                            <span className="text-gray-600 text-xs font-medium italic w-full text-center py-2">No Link Available</span>
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
        </div>
      </div>
    </main>
  );
}
