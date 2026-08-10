"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, TrendingUp, RefreshCw } from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [isApiOnline, setIsApiOnline] = useState(true); 
  const [issuesData, setIssuesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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
    if (currentPage === "3jam" || currentPage === "6jam") {
      fetchLiveTrends();
    }
  }, [currentPage]);

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
              onClick={() => setCurrentPage("6jam")}
              className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 transition-all text-left space-y-2 group"
            >
              <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">Monitoring 6 Jam Terakhir</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Akumulasi tren isu publik yang dominan setengah hari ke belakang.</p>
            </button>
          </div>
        </div>
      </main>
    );
  }

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
            Topik Hype ({currentPage === "3jam" ? "3 Jam Terakhir" : "6 Jam Terakhir"})
          </h1>
          <p className="text-gray-400 mt-1">Pokok masalah diambil langsung dari diskursus dan perbincangan publik terkini.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] h-96">
              <h2 className="text-lg font-semibold mb-6 text-white">Grafik Lonjakan Isu (Real-time Interest)</h2>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issuesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" stroke="#4b5563" />
                  <YAxis dataKey="topik" type="category" width={180} tick={{fontSize: 11, fill: '#e5e7eb', fontWeight: 'bold'}} />
                  <Tooltip cursor={{fill: '#1f2937'}} contentStyle={{backgroundColor: '#0d1117', borderColor: '#30363d', color: '#fff'}} />
                  <Bar dataKey="volume" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4 pb-10">
              <h2 className="text-xl font-bold mt-8 text-white">Rincian Pokok Masalah</h2>
              {issuesData.map((isu, index) => (
                <div key={isu.id} className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] border-l-4 border-l-blue-500 hover:bg-[#1c2128] transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">{isu.kategori}</span>
                      <h3 className="text-xl font-bold text-white mt-1">#{index + 1} - {isu.topik}</h3>
                    </div>
                    <span className="bg-blue-900/30 text-blue-400 text-xs px-3 py-1 rounded-full font-semibold border border-blue-800/50">
                      Indeks: {isu.volume.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-300 leading-relaxed mt-3 bg-[#0d1117] p-3 rounded-lg border border-[#30363d] text-sm">
                    {isu.desc}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
