"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
// PERBAIKAN: Penambahan icon Eye, ThumbsUp, ThumbsDown, MessageCircle
import { ArrowLeft, RefreshCw, ExternalLink, Calendar, Building2, Filter, DownloadCloud, Copy, CheckCircle2, PlaySquare, TrendingUp, MessageSquare, Hash, Eye, ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [previousPage, setPreviousPage] = useState("main");
  const [selectedIssue, setSelectedIssue] = useState(null);
  
  const [issuesData, setIssuesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [ytData, setYtData] = useState(null);
  const [isLoadingYt, setIsLoadingYt] = useState(false);
  const [ytSortMode, setYtSortMode] = useState("views"); // State untuk filter Log Video
  
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
    } catch (error) {
      console.error("Gagal memuat tren:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchYoutubeData = async () => {
    setIsLoadingYt(true);
    try {
      const response = await fetch(`/api/puan-yt?t=${Date.now()}`, { cache: 'no-store' });
      const result = await response.json();
      if (result.success) setYtData(result.data);
    } catch (error) {
      console.error("Gagal memuat data YouTube:", error);
    } finally {
      setIsLoadingYt(false);
    }
  };

  useEffect(() => {
    if (currentPage === "puan-yt-analysis") fetchYoutubeData();
    else if (currentPage !== "main" && currentPage !== "detail") {
      fetchLiveTrends();
      setSelectedCategory("Semua"); 
    }
  }, [currentPage]);

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
      const promptInstruction = "Buatkan saya opini singkat untuk postingan threads atau X, 10 dalam konteks pro dan 10 dalam konteks kontra. Jika Kontra pastikan menggunakan bahasa kontroversial, satir, sarkas, bisa pakai hook agar mengundang pembaca.";
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
  const chartData = filteredData.slice(0, 5); 
  const listData = filteredData.slice(0, isTerkiniMode ? 20 : 10); 

  const isRedTheme = currentPage.includes("pdip") || currentPage.includes("puan") || currentPage.includes("megawati") || (currentPage === "detail" && (previousPage.includes("pdip") || previousPage.includes("puan") || previousPage.includes("megawati")));


  // --- HALAMAN YOUTUBE DATA ANALYSIS ---
  if (currentPage === "puan-yt-analysis") {
    
    // Sortir Log Video berdasarkan filter yang dipilih
    let sortedYtVideos = [];
    let highestTrendDay = null;

    if (ytData && ytData.realVideos) {
      sortedYtVideos = [...ytData.realVideos].sort((a, b) => b[ytSortMode] - a[ytSortMode]);
      highestTrendDay = ytData.trendData.reduce((max, obj) => obj.mentions > max.mentions ? obj : max, ytData.trendData[0]);
    }

    return (
      <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
        <div className="w-full max-w-5xl space-y-6 mt-4">
          <div className="flex justify-between items-center">
            <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-gray-400 hover:text-white">
              <ArrowLeft size={20} /> Menu Utama
            </button>
            <button onClick={fetchYoutubeData} className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] px-4 py-2 rounded-xl text-sm hover:border-white transition-colors">
              <RefreshCw size={16} className={isLoadingYt ? "animate-spin" : ""} /> Refresh Analytics
            </button>
          </div>

          <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-2xl shadow-lg mb-4 flex items-center gap-4">
            <div className="p-4 bg-red-600 rounded-full"><PlaySquare size={32} className="text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-red-500">YouTube Data Analysis: Puan Maharani & Ketua DPR</h1>
              <p className="text-gray-400 mt-1 text-sm">Scraping performa video, tren pencarian, dan sentimen secara aktual di YouTube.</p>
            </div>
          </div>

          {isLoadingYt || !ytData ? (
            <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div></div>
          ) : (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center">
                  <MessageSquare size={24} className="text-gray-400 mb-2" />
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Mentions (12 Jam)</p>
                  <h2 className="text-5xl font-black text-white mt-2">{ytData.totalMentions.toLocaleString()}</h2>
                </div>
                
                <div className="md:col-span-2 bg-[#161b22] border border-[#30363d] p-6 rounded-2xl shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-red-500"/> Trend Garis Waktu</h3>
                  <div className="w-full h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ytData.trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                        <XAxis dataKey="waktu" stroke="#4b5563" tick={{fontSize: 12}} />
                        <YAxis stroke="#4b5563" tick={{fontSize: 12}} />
                        <Tooltip cursor={{fill: '#1f2937'}} contentStyle={{backgroundColor: '#0d1117', borderColor: '#30363d', color: '#fff'}} />
                        <Line type="monotone" dataKey="mentions" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {/* PENJELASAN TREND */}
                  <div className="mt-4 p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      <span className="font-bold text-gray-200">Cara Membaca:</span> Grafik ini melacak total publikasi dan *mentions* nama tokoh di platform per harinya. Lonjakan tertinggi terjadi pada hari <span className="font-bold text-red-400">{highestTrendDay.waktu} ({highestTrendDay.mentions} Mentions)</span>. Sistem kami mendeteksi penyebab utama lonjakan adalah: <span className="text-white italic">"{highestTrendDay.trigger}"</span>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TOP 5 KEYWORDS (Menampilkan Jumlah Komentar) */}
                <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Hash size={18} className="text-blue-400"/> Top 5 Keywords Teratas (24 Jam)</h3>
                  <p className="text-xs text-gray-500 mb-4">Membaca setiap komentar dalam 24 jam terakhir dan merekam kata yang sering disematkan ke tokoh.</p>
                  <div className="space-y-3">
                    {ytData.topKeywords.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
                        <span className="font-bold text-gray-200">#{idx + 1} {item.word}</span>
                        <span className="text-xs bg-blue-900/30 text-blue-400 font-bold px-3 py-1.5 rounded">
                          {item.commentCount.toLocaleString()} Komentar
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* VIDEO TERBARU DIURUTKAN BERDASARKAN VIEWS (DENGAN INDIKATOR METRIK) */}
                <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl shadow-lg flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><PlaySquare size={18} className="text-green-400"/> Video Terbaru (12 Jam Terakhir)</h3>
                  <p className="text-xs text-gray-500 mb-4">Diurutkan dari tayangan terbesar hingga terkecil.</p>
                  <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '300px' }}>
                    {ytData.realVideos.slice(0, 5).map((vid, idx) => (
                      <div key={idx} className="flex flex-col bg-[#0d1117] p-3 rounded-lg border border-[#30363d] gap-2">
                        <h4 className="font-bold text-sm text-gray-200 leading-snug">{vid.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-400">
                          <span className="flex items-center gap-1"><Eye size={12}/> {vid.views.toLocaleString()}</span>
                          <span className="flex items-center gap-1 text-blue-400"><ThumbsUp size={12}/> {vid.likes.toLocaleString()}</span>
                          <span className="flex items-center gap-1 text-red-400"><ThumbsDown size={12}/> {vid.dislikes.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-800 pt-2 mt-1">
                          <p className="text-[11px] font-medium text-gray-500">{vid.channelName} • {vid.uploadTime}</p>
                          <a href={vid.link} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold bg-red-900/40 text-red-500 hover:text-red-400 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                            Tonton <ExternalLink size={10}/>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* LOG VIDEO REAL-TIME (Pengganti Real-Time Top Comments) */}
              <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><PlaySquare size={18} className="text-yellow-500"/> Real-Time Log Performansi Video</h3>
                    <p className="text-xs text-gray-400 mt-1">Rekap data performa setiap video aktual yang diunggah ke publik.</p>
                  </div>
                  
                  {/* TOMBOL FILTER & REFRESH */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setYtSortMode("likes")} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${ytSortMode === "likes" ? "bg-blue-600 text-white border-blue-500" : "bg-[#0d1117] text-gray-400 border-[#30363d] hover:bg-[#1c2128]"}`}>
                      Likes Terbesar
                    </button>
                    <button onClick={() => setYtSortMode("dislikes")} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${ytSortMode === "dislikes" ? "bg-red-600 text-white border-red-500" : "bg-[#0d1117] text-gray-400 border-[#30363d] hover:bg-[#1c2128]"}`}>
                      Dislikes Terbesar
                    </button>
                    <button onClick={() => setYtSortMode("views")} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${ytSortMode === "views" ? "bg-green-600 text-white border-green-500" : "bg-[#0d1117] text-gray-400 border-[#30363d] hover:bg-[#1c2128]"}`}>
                      View Terbesar
                    </button>
                    <button onClick={fetchYoutubeData} className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white border border-gray-700 ml-1">
                      <RefreshCw size={16} className={isLoadingYt ? "animate-spin" : ""} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {sortedYtVideos.map((vid, idx) => (
                    <div key={idx} className="bg-[#0d1117] p-5 rounded-xl border border-[#30363d] flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <h4 className="font-bold text-base text-gray-100">{vid.title}</h4>
                        <div className="flex flex-col sm:items-end shrink-0">
                          <span className="text-sm font-semibold text-gray-400">{vid.date}</span>
                          <span className="text-xs text-gray-500">Pukul {vid.uploadTime}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-1 bg-gray-800 rounded text-xs font-bold text-gray-300">{vid.channelName}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between border-t border-gray-800/50 pt-3 mt-1 gap-4">
                        {/* INDIKATOR VIEW, LIKE, DISLIKE, COMMENT */}
                        <div className="flex items-center gap-4 text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-gray-300"><Eye size={14}/> {vid.views.toLocaleString()}</span>
                          <span className="flex items-center gap-1.5 text-blue-400"><ThumbsUp size={14}/> {vid.likes.toLocaleString()}</span>
                          <span className="flex items-center gap-1.5 text-red-400"><ThumbsDown size={14}/> {vid.dislikes.toLocaleString()}</span>
                          <span className="flex items-center gap-1.5 text-yellow-500"><MessageCircle size={14}/> {vid.comments.toLocaleString()} Komentar</span>
                        </div>
                        <a href={vid.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-red-400 hover:text-red-300 hover:underline flex items-center gap-1">
                          Lihat Video Sumber <ExternalLink size={12}/>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
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
            <ArrowLeft size={20} /> Kembali ke Daftar Isu
          </button>
          
          <div className="bg-[#161b22] p-8 rounded-2xl shadow-xl border border-[#30363d] space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-snug">
              {selectedIssue.topik}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm bg-[#0d1117] px-4 py-3 rounded-lg border border-[#30363d]">
              <span className="text-gray-400 font-medium flex items-center gap-1.5"><Building2 size={16} className="text-gray-500"/> Sumber: {selectedIssue.source || "Sistem"}</span>
              <span className="text-gray-400 font-medium flex items-center gap-1.5 border-l border-gray-700 pl-4"><Calendar size={16} className="text-gray-500"/> Waktu Rilis: {selectedIssue.pubDate}</span>
              <div className="w-full h-px bg-gray-800 my-1"></div>
              {selectedIssue.sourcesList && selectedIssue.sourcesList.length > 0 ? (
                <a href={selectedIssue.sourcesList[0].url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 w-full">
                  Tap untuk baca artikel asli ke sumber portal <ExternalLink size={14} />
                </a>
              ) : (<span className="text-gray-500 italic w-full">Link tidak tersedia</span>)}
            </div>
            <div className="border-y border-[#30363d] py-6 space-y-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informasi Analisis / Deskripsi:</h4>
              <p className="text-gray-300 leading-relaxed">{selectedIssue.articleDesc}</p>
            </div>
            <div className="pt-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Pembuat Opini AI</h3>
                  <p className="text-sm text-gray-400">Merangkum isu ini menjadi prompt utas kontroversial.</p>
                </div>
                <button onClick={handleSedotData} disabled={isScraping} className={`flex items-center justify-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-colors ${isBencanaMode ? 'bg-orange-600 hover:bg-orange-500' : (isRedTheme ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500')}`}>
                  {isScraping ? <><RefreshCw size={16} className="animate-spin" /> Ekstraksi Teks...</> : <><DownloadCloud size={16} /> Sedot & Buat Prompt</>}
                </button>
              </div>
              {scrapedResult && (
                <div className="mt-4 bg-[#0d1117] rounded-xl border border-[#30363d] overflow-hidden">
                  <div className="flex items-center justify-between bg-[#161b22] px-4 py-3 border-b border-[#30363d]">
                    <span className="text-sm font-semibold text-gray-300">Hasil Prompt (Siap Salin)</span>
                    <button onClick={handleCopyPrompt} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isCopied ? 'bg-green-900/40 text-green-400' : 'bg-[#0d1117] text-gray-300 hover:bg-[#1c2128]'}`}>
                      {isCopied ? <><CheckCircle2 size={14} /> Tersalin!</> : <><Copy size={14} /> Salin</>}
                    </button>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{scrapedResult}</pre>
                  </div>
                </div>
              )}
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
            <p className="text-gray-500 text-sm mt-1 italic font-medium">( Sample data diambil dari Google )</p>
          </div>
          
          <div className="space-y-4 pt-4">
            <h2 className="text-2xl font-bold text-white border-b border-[#30363d] pb-2">Berita Nasional Umum</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setCurrentPage("12jam")} className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300">Monitoring Top News</h3>
                <p className="text-sm text-gray-400">Berdasarkan volume pemberitaan dalam 12 jam terakhir.</p>
              </button>
              <button onClick={() => setCurrentPage("terkini")} className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300">Berita Nasional Umum Terkini</h3>
                <p className="text-sm text-gray-400">Berita update terkini tanpa filter algoritma volume.</p>
              </button>
              <button onClick={() => setCurrentPage("bencana-24jam")} className="md:col-span-2 p-6 bg-[#161b22] border border-orange-900/30 rounded-2xl shadow-lg hover:border-orange-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-orange-500 group-hover:text-orange-400 flex items-center gap-2">🚨 Berita Bencana Terkini</h3>
                <p className="text-sm text-gray-400">Monitoring khusus insiden dan darurat bencana terbaru tanpa filter algoritma volume.</p>
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <div className="border-b border-red-900/50 pb-2 space-y-1">
              <h2 className="text-2xl font-bold text-red-500">PDI Perjuangan</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setCurrentPage("pdip-12jam")} className="p-6 bg-[#161b22] border border-red-900/30 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-red-500 group-hover:text-red-400">Monitoring Top News</h3>
                <p className="text-sm text-gray-400">Berdasarkan volume pemberitaan dalam 12 jam terakhir.</p>
              </button>
              <button onClick={() => setCurrentPage("pdip-terkini")} className="p-6 bg-[#161b22] border border-red-900/30 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-red-500 group-hover:text-red-400">Berita PDI Perjuangan Terkini</h3>
                <p className="text-sm text-gray-400">Berita update terkini tanpa filter algoritma volume.</p>
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <div className="border-b border-red-900/50 pb-2 space-y-1">
              <h2 className="text-2xl font-bold text-red-500">Megawati Soekarnoputri</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setCurrentPage("megawati-12jam")} className="p-6 bg-[#161b22] border border-red-900/30 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-red-500 group-hover:text-red-400">Monitoring Top News</h3>
                <p className="text-sm text-gray-400">Berdasarkan volume pemberitaan dalam 12 jam terakhir.</p>
              </button>
              <button onClick={() => setCurrentPage("megawati-terkini")} className="p-6 bg-[#161b22] border border-red-900/30 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-red-500 group-hover:text-red-400">Berita Megawati Soekarnoputri Terkini</h3>
                <p className="text-sm text-gray-400">Berita update terkini tanpa filter algoritma volume.</p>
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <div className="border-b border-red-900/50 pb-2 space-y-1">
              <h2 className="text-2xl font-bold text-red-500">Puan Maharani</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setCurrentPage("puan-12jam")} className="p-6 bg-[#161b22] border border-red-900/30 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-red-500 group-hover:text-red-400">Monitoring Top News</h3>
                <p className="text-sm text-gray-400">Berdasarkan volume pemberitaan dalam 12 jam terakhir.</p>
              </button>
              <button onClick={() => setCurrentPage("puan-terkini")} className="p-6 bg-[#161b22] border border-red-900/30 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-red-500 group-hover:text-red-400">Berita Puan Maharani Terkini</h3>
                <p className="text-sm text-gray-400">Berita update terkini tanpa filter algoritma volume.</p>
              </button>
              
              <button onClick={() => setCurrentPage("puan-yt-analysis")} className="md:col-span-2 p-6 bg-red-950/20 border border-red-900/50 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group transition-colors">
                <h3 className="text-xl font-bold text-red-500 group-hover:text-red-400 flex items-center gap-2">
                  <PlaySquare size={24}/> Data Analysis (YouTube)
                </h3>
                <p className="text-sm text-gray-400">Analisis volume percakapan, tren video terbaru, dan metrik performa secara real-time di YouTube.</p>
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
          <button onClick={fetchLiveTrends} className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] px-4 py-2 rounded-xl text-sm hover:border-white transition-colors">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh Data (Realtime)
          </button>
        </div>

        {!isTerkiniMode && (
          <div className="w-full flex flex-col items-start gap-3">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Filter size={14} />
              <span className="text-xs font-semibold tracking-wider uppercase">Filter Kategori:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors border tracking-wide ${selectedCategory === cat ? (isRedTheme ? 'bg-red-600 text-white border-red-500' : 'bg-blue-600 text-white border-blue-500') : 'bg-[#161b22] text-gray-400 border-[#30363d] hover:bg-[#1c2128]'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isBencanaMode ? 'border-orange-500' : (isRedTheme ? 'border-red-500' : 'border-blue-500')}`}></div>
          </div>
        ) : (
          <>
            {!isTerkiniMode && (
              <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d]">
                <h2 className="text-lg font-semibold mb-6 text-white">Grafik Top 5 Topik Berita</h2>
                {chartData.length > 0 ? (
                  <>
                    <div className="w-full" style={{ height: chartData.length > 2 ? '600px' : '250px' }}> 
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <XAxis type="number" stroke="#4b5563" />
                          <YAxis dataKey="topik" type="category" width={200} tick={{fontSize: 11, fill: '#e5e7eb', fontWeight: 'bold'}} interval={0} />
                          <Tooltip cursor={{fill: '#1f2937'}} contentStyle={{backgroundColor: '#0d1117', borderColor: '#30363d', color: '#fff'}} />
                          <Bar dataKey="volume" fill={isRedTheme ? '#ef4444' : '#3b82f6'} radius={[0, 4, 4, 0]} barSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-5 pt-3 border-t border-[#30363d]">
                      <p className="text-xs text-gray-500 text-center italic">*Volume pada grafik menunjukkan jumlah publikasi media berbeda yang sedang memberitakan topik tersebut secara bersamaan.</p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-gray-500">Belum ada data tersedia.</div>
                )}
              </div>
            )}

            {isTerkiniMode && (
              <div className={`border p-6 rounded-2xl shadow-lg mb-4 ${isBencanaMode ? 'bg-orange-950/20 border-orange-900/50' : (isRedTheme ? 'bg-red-950/20 border-red-900/50' : 'bg-blue-950/20 border-blue-900/50')}`}>
                <h1 className={`text-2xl font-bold ${isBencanaMode ? 'text-orange-500' : (isRedTheme ? 'text-red-500' : 'text-blue-500')}`}>
                  {isBencanaMode ? "🚨 Peringatan & Info Bencana Terkini" : "⚡ Berita Update Terkini"}
                </h1>
                <p className="text-gray-400 mt-2 text-sm">Daftar di bawah ini diurutkan murni berdasarkan waktu publikasi berita paling baru. Sistem tidak menggunakan klasterisasi volume agar Anda tidak ketinggalan informasi krusial.</p>
              </div>
            )}

            <div className="space-y-4 pb-10">
              <h2 className="text-xl font-bold mt-8 text-white">{isTerkiniMode ? "Log Update Terkini" : "Rincian Pokok Masalah"}</h2>
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
          </>
        )}
      </div>
    </main>
  );
}
