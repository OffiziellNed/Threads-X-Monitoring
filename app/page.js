"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, RefreshCw, ExternalLink, Calendar, Building2, Filter, DownloadCloud, Copy, CheckCircle2 } from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [previousPage, setPreviousPage] = useState("main");
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issuesData, setIssuesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
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
      } 
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

  useEffect(() => {
    if (currentPage !== "main" && currentPage !== "detail") {
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

  const isBencanaMode = currentPage === "bencana-24jam" || (currentPage === "detail" && previousPage === "bencana-24jam");
  const isTerkiniMode = currentPage.includes("terkini") || isBencanaMode || (currentPage === "detail" && (previousPage.includes("terkini") || previousPage === "bencana-24jam"));
  
  const filteredData = isTerkiniMode ? issuesData : (selectedCategory === "Semua" ? issuesData : issuesData.filter(issue => issue.kategori === selectedCategory));
  const chartData = filteredData.slice(0, 5); 
  const listData = filteredData.slice(0, isTerkiniMode ? 20 : 10); 

  const isRedTheme = 
    currentPage.includes("pdip") || 
    currentPage.includes("puan") || 
    currentPage.includes("megawati") || 
    (currentPage === "detail" && (previousPage.includes("pdip") || previousPage.includes("puan") || previousPage.includes("megawati")));

  // --- HALAMAN DETAIL ---
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
              <span className="text-gray-400 font-medium flex items-center gap-1.5">
                <Building2 size={16} className="text-gray-500"/> Sumber: {selectedIssue.source || "Sistem"}
              </span>
              <span className="text-gray-400 font-medium flex items-center gap-1.5 border-l border-gray-700 pl-4">
                <Calendar size={16} className="text-gray-500"/> Waktu Rilis: {selectedIssue.pubDate}
              </span>
              <div className="w-full h-px bg-gray-800 my-1"></div>
              {selectedIssue.sourcesList && selectedIssue.sourcesList.length > 0 ? (
                <a href={selectedIssue.sourcesList[0].url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 w-full">
                  Tap untuk baca artikel asli ke sumber portal <ExternalLink size={14} />
                </a>
              ) : (
                <span className="text-gray-500 italic w-full">Link tidak tersedia</span>
              )}
            </div>

            <div className="border-y border-[#30363d] py-6 space-y-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informasi Analisis / Deskripsi:</h4>
              <p className="text-gray-300 leading-relaxed">
                {selectedIssue.articleDesc}
              </p>
            </div>
            
            <div className="pt-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Pembuat Opini AI</h3>
                  <p className="text-sm text-gray-400">Merangkum isu ini menjadi prompt utas kontroversial.</p>
                </div>
                <button 
                  onClick={handleSedotData} 
                  disabled={isScraping} 
                  className={`flex items-center justify-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-colors ${isBencanaMode ? 'bg-orange-600 hover:bg-orange-500' : (isRedTheme ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500')}`}
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
                <h3 className="text-xl font-bold text-orange-500 group-hover:text-orange-400 flex items-center gap-2">
                  🚨 Berita Bencana Terkini
                </h3>
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
            </div>
          </div>
        </div>
      </main>
    );
  }

  // --- HALAMAN DAFTAR MONITORING ---
  return (
    <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6 mt-4">
        
        {/* HEADER & NAVIGASI */}
        <div className="flex justify-between items-center">
          <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft size={20} /> Menu Utama
          </button>
          <button onClick={() => fetchLiveTrends()} 
            className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] px-4 py-2 rounded-xl text-sm hover:border-white transition-colors">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh Data (Realtime)
          </button>
        </div>

        {/* FILTER HANYA MUNCUL DI MODE 12 JAM (VOLUME) */}
        {!isTerkiniMode && (
          <div className="w-full flex flex-col items-start gap-3">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Filter size={14} />
              <span className="text-xs font-semibold tracking-wider uppercase">Filter Kategori:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((cat) => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)} 
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors border tracking-wide ${
                    selectedCategory === cat 
                    ? (isRedTheme ? 'bg-red-600 text-white border-red-500' : 'bg-blue-600 text-white border-blue-500') 
                    : 'bg-[#161b22] text-gray-400 border-[#30363d] hover:bg-[#1c2128]'
                  }`}
                >
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
            {/* GRAFIK HANYA MUNCUL DI MODE 12 JAM (VOLUME) */}
            {!isTerkiniMode && (
              <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d]">
                <h2 className="text-lg font-semibold mb-6 text-white">Grafik Top 5 Topik Berita</h2>
                
                {chartData.length > 0 ? (
                  <>
                    {/* REVISI: TINGGI DITAMBAH SIGNIFIKAN JADI 600px BIAR ADA RUANG UNTUK TEKS PANJANG */}
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
                      <p className="text-xs text-gray-500 text-center italic">
                        *Volume pada grafik menunjukkan jumlah publikasi media berbeda yang sedang memberitakan topik tersebut secara bersamaan.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-gray-500">Belum ada data tersedia.</div>
                )}
              </div>
            )}

            {/* BANNER KHUSUS UNTUK MODE TERKINI */}
            {isTerkiniMode && (
              <div className={`border p-6 rounded-2xl shadow-lg mb-4 ${isBencanaMode ? 'bg-orange-950/20 border-orange-900/50' : (isRedTheme ? 'bg-red-950/20 border-red-900/50' : 'bg-blue-950/20 border-blue-900/50')}`}>
                <h1 className={`text-2xl font-bold ${isBencanaMode ? 'text-orange-500' : (isRedTheme ? 'text-red-500' : 'text-blue-500')}`}>
                  {isBencanaMode ? "🚨 Peringatan & Info Bencana Terkini" : "⚡ Berita Update Terkini"}
                </h1>
                <p className="text-gray-400 mt-2 text-sm">Daftar di bawah ini diurutkan murni berdasarkan waktu publikasi berita paling baru. Sistem tidak menggunakan klasterisasi volume agar Anda tidak ketinggalan informasi krusial.</p>
              </div>
            )}

            <div className="space-y-4 pb-10">
              <h2 className="text-xl font-bold mt-8 text-white">
                {isTerkiniMode ? "Log Update Terkini" : "Rincian Pokok Masalah"}
              </h2>
              {listData.length > 0 ? listData.map((isu, index) => (
                <div key={index} className={`bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] border-l-4 ${isBencanaMode ? 'border-l-orange-500' : (isRedTheme ? 'border-l-red-500' : 'border-l-blue-500')}`}>
                  <div className="flex justify-between items-start">
                    <div className="pr-4 w-full">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${isBencanaMode ? 'text-orange-400' : (isRedTheme ? 'text-red-400' : 'text-blue-400')}`}>
                        {isu.kategori} {isTerkiniMode && " TERKINI"}
                      </span>
                      <h3 className="text-xl font-bold text-white mt-1 leading-snug">#{index + 1} - {isu.topik}</h3>
                      
                      <p className="text-xs text-gray-400 mt-2.5 flex items-center gap-1.5 font-medium">
                        <Calendar size={14} className="text-gray-500"/> Dirilis: {isu.pubDate}
                      </p>
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
