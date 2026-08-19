"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, TrendingUp, RefreshCw, ExternalLink, Calendar, Building2, Link as LinkIcon, Filter, DownloadCloud, Copy, CheckCircle2 } from "lucide-react";

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

  const fetchLiveTrends = async () => {
    setIsLoading(true);
    try {
      let hours = 3;
      let topic = 'general';
      
      if (currentPage.includes('12jam')) hours = 12;
      if (currentPage.includes('pdip')) topic = 'pdip';

      // UBAH KE POST: Vercel nggak akan bisa nge-cache ini
      const response = await fetch('/api/news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hours: hours, topic: topic }),
        cache: 'no-store'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setIssuesData(result.data);
      }
    } catch (error) {
      console.error("Gagal memuat tren:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage === "3jam" || currentPage === "12jam" || currentPage === "pdip-3jam" || currentPage === "pdip-12jam") {
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
      const title = selectedIssue.articleTitle || selectedIssue.topik;
      const content = selectedIssue.articleDesc || "Tidak ada rincian yang disedot.";
      
      const finalOutput = `${promptInstruction}\n\n[JUDUL TOPIK]\n${title}\n\n[DESKRIPSI & ISI KONTEN]\n${content}`;
      setScrapedResult(finalOutput);
      setIsScraping(false);
    }, 1500);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(scrapedResult);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000); 
  };

  const filteredData = selectedCategory === "Semua" ? issuesData : issuesData.filter(issue => issue.kategori === selectedCategory);
  const chartData = filteredData.slice(0, 5); 
  const listData = filteredData.slice(0, 10); 

  const getPageTitle = () => {
    if (currentPage === "3jam") return "Topik Hype (3 Jam) - Berita Nasional";
    if (currentPage === "12jam") return "Topik Hype (12 Jam) - Berita Nasional";
    if (currentPage === "pdip-3jam") return "Topik Hype (3 Jam) - PDI Perjuangan";
    if (currentPage === "pdip-12jam") return "Topik Hype (12 Jam) - PDI Perjuangan";
    return "Topik Hype";
  };

  const isPdipMode = previousPage.includes("pdip") || currentPage.includes("pdip");

  // --- HALAMAN DETAIL ---
  if (currentPage === "detail" && selectedIssue) {
    return (
      <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-6 mt-6">
          <button 
            onClick={() => setCurrentPage(previousPage)} 
            className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors font-medium"
          >
            <ArrowLeft size={20} /> Kembali ke Daftar Isu
          </button>

          <div className="bg-[#161b22] p-8 rounded-2xl shadow-xl border border-[#30363d] space-y-6">
            <div className="space-y-2">
              <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${isPdipMode ? 'bg-red-900/30 text-red-400 border-red-800/50' : 'bg-blue-900/30 text-blue-400 border-blue-800/50'}`}>
                {selectedIssue.kategori || "Sosial"}
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-snug mt-2">
                {selectedIssue.articleTitle || selectedIssue.topik}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 border-y border-[#30363d] py-4">
              <span className={`flex items-center gap-2 font-medium ${isPdipMode ? 'text-red-400' : 'text-blue-400'}`}>
                <Building2 size={16} /> Sumber: {selectedIssue.source}
              </span>
              <span className="flex items-center gap-2">
                <Calendar size={16} /> Waktu: {selectedIssue.pubDate}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <LinkIcon size={16} className={isPdipMode ? 'text-red-400' : 'text-blue-400'} /> Tautan Terkait:
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {selectedIssue.sourcesList.map((src, idx) => (
                  <a key={idx} href={src.url} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between bg-[#0d1117] hover:bg-[#1c2128] p-4 rounded-xl border border-[#30363d] text-gray-200 transition-all group shadow-sm ${isPdipMode ? 'hover:text-red-400' : 'hover:text-blue-400'}`}>
                    <span className="font-medium text-sm flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isPdipMode ? 'bg-red-500' : 'bg-blue-500'}`}></span>{src.name}
                    </span>
                    <ExternalLink size={16} className={`text-gray-500 transition-colors ${isPdipMode ? 'group-hover:text-red-400' : 'group-hover:text-blue-400'}`} />
                  </a>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-[#30363d] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Pembuat Opini AI</h3>
                  <p className="text-sm text-gray-400 mt-1">Sintesis data menjadi prompt pro & kontra.</p>
                </div>
                <button 
                  onClick={handleSedotData}
                  disabled={isScraping}
                  className={`flex items-center justify-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium shadow-md ${isPdipMode ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                >
                  {isScraping ? <><RefreshCw size={16} className="animate-spin" /> Ekstraksi...</> : <><DownloadCloud size={16} /> Sedot & Buat Prompt</>}
                </button>
              </div>

              {scrapedResult && (
                <div className="mt-4 bg-[#0d1117] rounded-xl border border-[#30363d] overflow-hidden">
                  <div className="flex items-center justify-between bg-[#161b22] px-4 py-3 border-b border-[#30363d]">
                    <span className="text-sm font-semibold text-gray-300">Hasil Prompt (Siap Salin)</span>
                    <button onClick={handleCopyPrompt} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${isCopied ? 'bg-green-900/40 text-green-400' : 'bg-[#0d1117] text-gray-300 hover:bg-[#1c2128]'}`}>
                      {isCopied ? <><CheckCircle2 size={14} /> Tersalin!</> : <><Copy size={14} /> Salin</>}
                    </button>
                  </div>
                  <div className="p-4"><pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{scrapedResult}</pre></div>
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
        <div className="w-full max-w-4xl space-y-8 mt-10">
          
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white">Public Trend Radar</h1>
            <p className="text-gray-400">Monitoring isu publik terupdate secara real-time.</p>
          </div>

          <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
              <TrendingUp size={20} className="text-blue-400" /> Status Live Feed
            </h2>
            <div className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 bg-green-900/50 text-green-400 border border-green-800">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span> Online & Stabil
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h2 className="text-2xl font-bold text-white border-b border-[#30363d] pb-2">Berita Nasional Umum</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setCurrentPage("3jam")} className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 text-left space-y-2 group">
                <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300">Monitoring 3 Jam Terakhir</h3>
                <p className="text-gray-400 text-sm">Analisis lonjakan isu publik kilat.</p>
              </button>
              <button onClick={() => setCurrentPage("12jam")} className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 text-left space-y-2 group">
                <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300">Monitoring 12 Jam Terakhir</h3>
                <p className="text-gray-400 text-sm">Akumulasi tren berita publik dalam 12 jam.</p>
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <div className="border-b border-red-900/50 pb-2 space-y-1">
              <h2 className="text-2xl font-bold text-red-500 flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-sm inline-block"></span> PDI Perjuangan
              </h2>
              <p className="text-gray-400 text-sm">Monitoring spesifik berita eksklusif PDI Perjuangan</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setCurrentPage("pdip-3jam")} className="p-6 bg-[#161b22] border border-red-900/30 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group">
                <h3 className="text-xl font-bold text-red-500 group-hover:text-red-400">Monitoring 3 Jam Terakhir</h3>
                <p className="text-gray-400 text-sm">Analisis kilat seputar kader dan kebijakan partai.</p>
              </button>
              <button onClick={() => setCurrentPage("pdip-12jam")} className="p-6 bg-[#161b22] border border-red-900/30 rounded-2xl shadow-lg hover:border-red-500 text-left space-y-2 group">
                <h3 className="text-xl font-bold text-red-500 group-hover:text-red-400">Monitoring 12 Jam Terakhir</h3>
                <p className="text-gray-400 text-sm">Akumulasi topik hangat seputar PDI Perjuangan.</p>
              </button>
            </div>
          </div>

        </div>
      </main>
    );
  }

  // --- HALAMAN MONITORING ---
  return (
    <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6 mt-4">
        <div className="flex justify-between items-center">
          <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-gray-400 hover:text-blue-400">
            <ArrowLeft size={20} /> Menu Utama
          </button>
          <button onClick={fetchLiveTrends} className={`flex items-center gap-2 bg-[#161b22] border px-4 py-2 rounded-xl text-sm transition-all ${isPdipMode ? 'text-red-400 border-[#30363d] hover:border-red-500' : 'text-blue-400 border-[#30363d] hover:border-blue-500'}`}>
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh Data
          </button>
        </div>

        <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d]">
          <h1 className="text-2xl font-bold text-white">{getPageTitle()}</h1>
          <p className="text-gray-400 mt-1">Menyedot seluruh diskursus berita terkini.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-gray-400 mr-2"><Filter size={18} /><span className="text-sm font-semibold">Filter:</span></div>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} 
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                selectedCategory === cat 
                  ? (isPdipMode ? 'bg-red-600 text-white border-red-500' : 'bg-blue-600 text-white border-blue-500') 
                  : 'bg-[#161b22] text-gray-400 border-[#30363d] hover:bg-[#1c2128]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isPdipMode ? 'border-red-500' : 'border-blue-500'}`}></div>
          </div>
        ) : (
          <>
            <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] h-96">
              <h2 className="text-lg font-semibold mb-6 text-white">Grafik Top 5 {selectedCategory !== "Semua" && `(${selectedCategory})`}</h2>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" stroke="#4b5563" />
                    <YAxis dataKey="topik" type="category" width={180} tick={{fontSize: 11, fill: '#e5e7eb', fontWeight: 'bold'}} />
                    <Tooltip cursor={{fill: '#1f2937'}} contentStyle={{backgroundColor: '#0d1117', borderColor: '#30363d', color: '#fff'}} />
                    <Bar dataKey="volume" fill={isPdipMode ? '#ef4444' : '#3b82f6'} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">Belum ada data untuk kategori ini.</div>
              )}
            </div>

            <div className="space-y-4 pb-10">
              <h2 className="text-xl font-bold mt-8 text-white">Rincian Pokok Masalah (Top 10)</h2>
              {listData.length > 0 ? listData.map((isu, index) => (
                <div key={isu.id} className={`bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] border-l-4 hover:bg-[#1c2128] transition-colors ${isPdipMode ? 'border-l-red-500' : 'border-l-blue-500'}`}>
                  <div className="flex justify-between items-center">
                    <div className="pr-4">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${isPdipMode ? 'text-red-400' : 'text-blue-400'}`}>{isu.kategori}</span>
                      <h3 className="text-xl font-bold text-white mt-1">#{index + 1} - {isu.topik}</h3>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="bg-[#0d1117] text-gray-300 text-xs px-3 py-1.5 rounded-full font-medium border border-[#30363d] flex flex-col items-center">
                        <span className={`text-[10px] leading-none ${isPdipMode ? 'text-red-400' : 'text-blue-400'}`}>Indeks:</span>
                        <span className="font-bold leading-tight">{isu.volume.toLocaleString()}</span>
                      </div>
                      <button onClick={() => handleOpenDetail(isu)} className={`text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-md ${isPdipMode ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                        Buka
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 bg-[#161b22] p-6 rounded-xl border border-[#30363d] text-center">Tidak ada isu terkait kategori {selectedCategory}.</p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
