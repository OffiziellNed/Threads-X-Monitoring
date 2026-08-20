"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, TrendingUp, RefreshCw, ExternalLink, Calendar, Building2, Link as LinkIcon, Filter, DownloadCloud, Copy, CheckCircle2, PlayCircle, ThumbsDown, ThumbsUp } from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [previousPage, setPreviousPage] = useState("main");
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issuesData, setIssuesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const categories = ["Semua", "Politik", "Pemerintahan", "Sosial", "Hukum"];

  const [isScraping, setIsScraping] = useState(false);
  const [scrapedResult, setScrapedResult] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // FETCH UNTUK BERITA (BERITA UMUM, PDIP, PUAN)
  const fetchLiveTrends = async () => {
    setIsLoading(true);
    try {
      let hours = 3;
      if (currentPage.includes('12jam')) hours = 12;

      let endpoint = `/api/news?hours=${hours}&t=${Date.now()}`;
      if (currentPage.includes('pdip')) endpoint = `/api/pdip?hours=${hours}&t=${Date.now()}`;
      if (currentPage.includes('puan-')) endpoint = `/api/puan?hours=${hours}&t=${Date.now()}`;
      
      const response = await fetch(endpoint, { cache: 'no-store' });
      const result = await response.json();
      
      if (result.success) setIssuesData(result.data);
    } catch (error) {
      console.error("Gagal memuat tren:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // FETCH KHUSUS UNTUK YOUTUBE SENTIMENT AI
  const fetchSentimentAI = async (sentimentType) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: sentimentType }),
        cache: 'no-store'
      });
      const result = await response.json();
      
      if (result.success) setIssuesData(result.data);
    } catch (error) {
      console.error("Gagal sentimen AI:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // TRIGGER EFEK KETIKA HALAMAN BERUBAH
  useEffect(() => {
    if (currentPage.includes("3jam") || currentPage.includes("12jam")) {
      fetchLiveTrends();
      setSelectedCategory("Semua"); 
    } else if (currentPage === "puan-negative") {
      fetchSentimentAI("negative");
    } else if (currentPage === "puan-positive") {
      fetchSentimentAI("positive");
    }
  }, [currentPage]);

  // LOGIC UI & STATE
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
      // PROMPT DIKUNCI MATI DISINI
      const promptInstruction = "Buatkan saya opini singkat untuk postingan threads atau X, 10 dalam konteks pro dan 10 dalam konteks kontra. Jika Kontra pastikan menggunakan bahasa kontroversial, satir, sarkas, bisa pakai hook agar mengundang pembaca.";
      
      // Menggabungkan Judul dan Deskripsi penuh
      const title = selectedIssue.articleTitle || selectedIssue.topik || "Tanpa Judul";
      const content = selectedIssue.articleDesc || selectedIssue.konteks || "Tidak ada deskripsi rinci.";
      
      const finalOutput = `${promptInstruction}\n\n[JUDUL TOPIK]\n${title}\n\n[DESKRIPSI & ISI KONTEN]\n${content}`;
      
      setScrapedResult(finalOutput);
      setIsScraping(false);
    }, 1000);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(scrapedResult);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000); 
  };

  const filteredData = selectedCategory === "Semua" ? issuesData : issuesData.filter(issue => issue.kategori === selectedCategory);
  const chartData = filteredData.slice(0, 5); 
  const listData = filteredData.slice(0, 10); 

  const isRedTheme = previousPage.includes("pdip") || previousPage.includes("puan") || currentPage.includes("pdip") || currentPage.includes("puan");
  const isSentimentMode = currentPage.includes("negative") || currentPage.includes("positive");

  // --- HALAMAN DETAIL ---
  if (currentPage === "detail" && selectedIssue) {
    return (
      <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-6 mt-6">
          <button onClick={() => setCurrentPage(previousPage)} className="flex items-center gap-2 text-gray-400 hover:text-blue-400 font-medium transition-colors">
            <ArrowLeft size={20} /> Kembali ke Daftar Isu
          </button>
          
          <div className="bg-[#161b22] p-8 rounded-2xl shadow-xl border border-[#30363d] space-y-4">
            {/* 1. JUDUL STATIS (TIDAK BISA DIKLIK) */}
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-snug">
              {selectedIssue.articleTitle || selectedIssue.topik}
            </h1>
            
            {/* 2. SUMBER BERITA & LINK (DI BAWAH JUDUL) */}
            <div className="flex items-center gap-2 text-sm bg-[#0d1117] px-4 py-2.5 rounded-lg border border-[#30363d]">
              <span className="text-gray-400 font-medium">Sumber: {selectedIssue.source || "YouTube"} |</span>
              
              {/* Logika link untuk Berita (sourcesList) atau YouTube AI (url) */}
              {selectedIssue.sourcesList && selectedIssue.sourcesList.length > 0 ? (
                <a href={selectedIssue.sourcesList[0].url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1">
                  Tap untuk baca artikel asli <ExternalLink size={14} />
                </a>
              ) : selectedIssue.url && selectedIssue.url !== "#" ? (
                <a href={selectedIssue.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1">
                  Tap untuk ke sumber video <ExternalLink size={14} />
                </a>
              ) : (
                <span className="text-gray-500 italic">Link tidak tersedia</span>
              )}
            </div>

            {/* 3. DESKRIPSI KONTEN */}
            <p className="text-gray-300 border-y border-[#30363d] py-6 leading-relaxed">
              {selectedIssue.articleDesc || selectedIssue.konteks}
            </p>
            
            {/* 4. TOMBOL SEDOT & PEMBUAT OPINI AI */}
            <div className="pt-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Pembuat Opini AI</h3>
                  <p className="text-sm text-gray-400">Merangkum isu ini menjadi prompt utas kontroversial.</p>
                </div>
                <button 
                  onClick={handleSedotData} 
                  disabled={isScraping} 
                  className={`flex items-center justify-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-colors ${isRedTheme ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                >
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
          </div>
          
          <div className="space-y-4 pt-4">
            <h2 className="text-2xl font-bold text-white border-b border-[#30363d] pb-2">Berita Nasional Umum</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setCurrentPage("3jam")} className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 text-left space-y-2 group"><h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300">Monitoring 3 Jam Terakhir</h3></button>
              <button onClick={() => setCurrentPage("12jam")} className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 text-left space-y-2 group"><h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300">Monitoring 12 Jam Terakhir</h3></button>
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <div className="border-b border-red-900/50 pb-2 space-y-1">
              <h2 className="text-2xl font-bold text-red-500">PDI Perjuangan</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setCurrentPage("pdip-3jam")} className="p-6 bg-[#161b22] border border-red-900/30 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group"><h3 className="text-xl font-bold text-red-500 group-hover:text-red-400">Monitoring 3 Jam Terakhir</h3></button>
              <button onClick={() => setCurrentPage("pdip-12jam")} className="p-6 bg-[#161b22] border border-red-900/30 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group"><h3 className="text-xl font-bold text-red-500 group-hover:text-red-400">Monitoring 12 Jam Terakhir</h3></button>
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <div className="border-b border-red-900/50 pb-2 space-y-1">
              <h2 className="text-2xl font-bold text-red-500">Puan Maharani</h2>
              <p className="text-gray-400 text-sm">Monitoring spesifik berita eksklusif Puan Maharani</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setCurrentPage("puan-3jam")} className="p-6 bg-[#161b22] border border-red-900/30 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group"><h3 className="text-xl font-bold text-red-500 group-hover:text-red-400">Monitoring Berita 3 Jam</h3></button>
              <button onClick={() => setCurrentPage("puan-12jam")} className="p-6 bg-[#161b22] border border-red-900/30 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group"><h3 className="text-xl font-bold text-red-500 group-hover:text-red-400">Monitoring Berita 12 Jam</h3></button>
            </div>

            <div className="mt-6 pt-4 border-t border-[#30363d] space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><PlayCircle className="text-red-500" /> Analisis Sentimen Netizen YouTube (AI Realtime)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => setCurrentPage("puan-negative")} className="flex items-center gap-4 p-5 bg-[#161b22] border border-red-900/50 rounded-xl hover:border-red-500 transition-all text-left">
                  <div className="bg-red-500/20 p-3 rounded-lg"><ThumbsDown className="text-red-500" size={24} /></div>
                  <div><h4 className="font-bold text-red-400">Top 5 Sentimen Negatif</h4><p className="text-xs text-gray-500">Apa yang dipermasalahkan netizen?</p></div>
                </button>
                <button onClick={() => setCurrentPage("puan-positive")} className="flex items-center gap-4 p-5 bg-[#161b22] border border-green-900/50 rounded-xl hover:border-green-500 transition-all text-left">
                  <div className="bg-green-500/20 p-3 rounded-lg"><ThumbsUp className="text-green-500" size={24} /></div>
                  <div><h4 className="font-bold text-green-400">Top 5 Sentimen Positif</h4><p className="text-xs text-gray-500">Dukungan & apresiasi netizen.</p></div>
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    );
  }

  // --- HALAMAN DAFTAR MONITORING (BERITA & SENTIMEN YOUTUBE) ---
  return (
    <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6 mt-4">
        <div className="flex justify-between items-center">
          <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft size={20} /> Menu Utama
          </button>
          <button onClick={() => isSentimentMode ? fetchSentimentAI(currentPage.includes('negative') ? 'negative' : 'positive') : fetchLiveTrends()} 
            className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] px-4 py-2 rounded-xl text-sm hover:border-white transition-colors">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh Data (Realtime)
          </button>
        </div>

        {isSentimentMode && (
           <div className={`p-6 rounded-2xl shadow-lg border ${currentPage.includes('negative') ? 'bg-red-950/20 border-red-900/50' : 'bg-green-950/20 border-green-900/50'}`}>
             <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
               {currentPage.includes('negative') ? <><ThumbsDown className="text-red-500"/> Sentimen Negatif YouTube (Puan Maharani)</> : <><ThumbsUp className="text-green-500"/> Sentimen Positif YouTube (Puan Maharani)</>}
             </h1>
             <p className="text-gray-400 mt-2">Mesin AI membaca ribuan komentar YouTube secara realtime dan menyimpulkan Top 5 isu.</p>
           </div>
        )}

        {!isSentimentMode && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-gray-400 mr-2"><Filter size={18} /><span className="text-sm font-semibold">Filter:</span></div>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm transition-colors border ${selectedCategory === cat ? 'bg-red-600 text-white border-red-500' : 'bg-[#161b22] text-gray-400 border-[#30363d] hover:bg-[#1c2128]'}`}>{cat}</button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] h-96">
              <h2 className="text-lg font-semibold mb-6 text-white">Grafik Top 5 {isSentimentMode ? 'Konteks Sentimen' : 'Topik Berita'}</h2>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" stroke="#4b5563" />
                    <YAxis dataKey="topik" type="category" width={180} tick={{fontSize: 11, fill: '#e5e7eb', fontWeight: 'bold'}} />
                    <Tooltip cursor={{fill: '#1f2937'}} contentStyle={{backgroundColor: '#0d1117', borderColor: '#30363d', color: '#fff'}} />
                    <Bar dataKey="volume" fill={isSentimentMode && currentPage.includes('positive') ? '#22c55e' : '#ef4444'} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">Belum ada data tersedia.</div>
              )}
            </div>

            <div className="space-y-4 pb-10">
              <h2 className="text-xl font-bold mt-8 text-white">Rincian Pokok Masalah</h2>
              {listData.length > 0 ? listData.map((isu, index) => (
                <div key={index} className={`bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] border-l-4 ${isSentimentMode && currentPage.includes('positive') ? 'border-l-green-500' : 'border-l-red-500'}`}>
                  <div className="flex justify-between items-start">
                    <div className="pr-4 w-full">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${isSentimentMode && currentPage.includes('positive') ? 'text-green-400' : 'text-red-400'}`}>
                        {isSentimentMode ? 'HASIL AI' : isu.kategori}
                      </span>
                      <h3 className="text-xl font-bold text-white mt-1">#{index + 1} - {isu.topik}</h3>
                      {/* Cuplikan di List */}
                      {isSentimentMode && (
                        <p className="text-gray-400 text-sm mt-3 bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">{isu.konteks}</p>
                      )}
                    </div>
                    <button onClick={() => handleOpenDetail(isu)} className="text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-md bg-red-600 hover:bg-red-500 shrink-0">Buka Detail</button>
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
