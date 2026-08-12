"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, TrendingUp, RefreshCw, ExternalLink, Calendar, Building2, Link as LinkIcon, Filter } from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isApiOnline, setIsApiOnline] = useState(true); 
  const [issuesData, setIssuesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // STATE BARU UNTUK KATEGORI FILTER
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const categories = ["Semua", "Politik", "Pemerintahan", "Sosial", "Hukum"];

  const fetchLiveTrends = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/news');
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        setIssuesData(result.data);
        setIsApiOnline(true);
      }
    } catch (error) {
      console.error("Gagal memuat tren:", error);
      setIsApiOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage === "3jam" || currentPage === "12jam") {
      fetchLiveTrends();
      setSelectedCategory("Semua"); // Reset filter tiap pindah halaman
    }
  }, [currentPage]);

  const handleOpenDetail = (isu) => {
    setSelectedIssue(isu);
    setCurrentPage("detail");
  };

  // --- LOGIKA FILTERING DATA ---
  const filteredData = selectedCategory === "Semua" 
    ? issuesData 
    : issuesData.filter(issue => issue.kategori === selectedCategory);

  const chartData = filteredData.slice(0, 5); // Chart dibatasi Top 5
  const listData = filteredData.slice(0, 10); // List dibatasi Top 10

  // --- HALAMAN DETAIL ---
  if (currentPage === "detail" && selectedIssue) {
    return (
      <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-6 mt-6">
          <button 
            onClick={() => setCurrentPage("12jam")}
            className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors font-medium"
          >
            <ArrowLeft size={20} /> Kembali ke Daftar Isu
          </button>

          <div className="bg-[#161b22] p-8 rounded-2xl shadow-xl border border-[#30363d] space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider bg-blue-900/30 px-3 py-1 rounded-full border border-blue-800/50">
                {selectedIssue.kategori || "Sosial"}
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-snug mt-2">
                {selectedIssue.articleTitle || selectedIssue.topik}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 border-y border-[#30363d] py-4">
              <span className="flex items-center gap-2 text-blue-400 font-medium">
                <Building2 size={16} /> Sumber Utama: {selectedIssue.source || "Media Nasional"}
              </span>
              <span className="flex items-center gap-2">
                <Calendar size={16} /> Waktu: {selectedIssue.pubDate || "Baru saja"}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <LinkIcon size={16} className="text-blue-400" /> Tautan Sumber Berita Terkait:
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {selectedIssue.sourcesList && selectedIssue.sourcesList.length > 0 ? (
                  selectedIssue.sourcesList.map((src, idx) => (
                    <a 
                      key={idx}
                      href={src.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center justify-between bg-[#0d1117] hover:bg-[#1c2128] p-4 rounded-xl border border-[#30363d] text-gray-200 hover:text-blue-400 transition-all group shadow-sm"
                    >
                      <span className="font-medium text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {src.name}
                      </span>
                      <ExternalLink size={16} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                    </a>
                  ))
                ) : (
                  <a 
                    href={selectedIssue.link || "#"} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-between bg-[#0d1117] hover:bg-[#1c2128] p-4 rounded-xl border border-[#30363d] text-gray-200 hover:text-blue-400 transition-all group"
                  >
                    <span className="font-medium text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {selectedIssue.source || "Buka Berita Asli"}
                    </span>
                    <ExternalLink size={16} className="text-gray-500 group-hover:text-blue-400" />
                  </a>
                )}
              </div>
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
            <p className="text-gray-400">Monitoring isu politik, sosial, & hukum terupdate real-time.</p>
          </div>

          <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                <TrendingUp size={20} className="text-blue-400" /> Status Live Feed
              </h2>
              <div className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 bg-green-900/50 text-green-400 border border-green-800">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
                Online & Stabil
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setCurrentPage("3jam")}
              className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 transition-all text-left space-y-2 group"
            >
              <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">Monitoring 3 Jam Terakhir</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Analisis lonjakan isu kilat berbasis pokok masalah konkrit.</p>
            </button>
            <button 
              onClick={() => setCurrentPage("12jam")}
              className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 transition-all text-left space-y-2 group"
            >
              <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">Monitoring 12 Jam Terakhir</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Akumulasi pembicaraan publik dan tren berita dalam 12 jam terakhir.</p>
            </button>
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
          <button 
            onClick={() => setCurrentPage("main")}
            className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors font-medium"
          >
            <ArrowLeft size={20} /> Kembali ke Menu Utama
          </button>
          <button 
            onClick={fetchLiveTrends}
            className="flex items-center gap-2 bg-[#161b22] text-blue-400 border border-[#30363d] px-4 py-2 rounded-xl text-sm hover:border-blue-500 transition-all"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh Data
          </button>
        </div>

        <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d]">
          <h1 className="text-2xl font-bold text-white">
            Topik Hype ({currentPage === "3jam" ? "3 Jam Terakhir" : "12 Jam Terakhir"})
          </h1>
          <p className="text-gray-400 mt-1">Menyedot seluruh diskursus pembicaraan publik terkini.</p>
        </div>

        {/* MENU FILTER KATEGORI */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-gray-400 mr-2">
            <Filter size={18} />
            <span className="text-sm font-semibold">Filter:</span>
          </div>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                selectedCategory === cat 
                ? 'bg-blue-600 text-white border-blue-500 shadow-md' 
                : 'bg-[#161b22] text-gray-400 border-[#30363d] hover:bg-[#1c2128] hover:text-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
                    <Bar dataKey="volume" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Belum ada data untuk kategori ini.
                </div>
              )}
            </div>

            <div className="space-y-4 pb-10">
              <h2 className="text-xl font-bold mt-8 text-white">Rincian Pokok Masalah (Top 10)</h2>
              {listData.length > 0 ? listData.map((isu, index) => (
                <div key={isu.id} className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] border-l-4 border-l-blue-500 hover:bg-[#1c2128] transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">{isu.kategori}</span>
                      <h3 className="text-xl font-bold text-white mt-1">#{index + 1} - {isu.topik}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-[#0d1117] text-gray-300 text-xs px-3 py-1.5 rounded-full font-medium border border-[#30363d] flex flex-col items-center">
                        <span className="text-[10px] text-blue-400 leading-none">Indeks:</span>
                        <span className="font-bold leading-tight">{isu.volume.toLocaleString()}</span>
                      </div>
                      <button 
                        onClick={() => handleOpenDetail(isu)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-md"
                      >
                        Buka
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 bg-[#161b22] p-6 rounded-xl border border-[#30363d] text-center">
                  Tidak ada isu terkait kategori {selectedCategory} dalam radar saat ini.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
