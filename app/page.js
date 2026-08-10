"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Lock, Unlock, ArrowLeft, Activity, TrendingUp } from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [apiKey, setApiKey] = useState("sk_live_trend_tracker_v1");
  const [isApiOnline, setIsApiOnline] = useState(true); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [issuesData, setIssuesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = () => {
    if (adminPassword === "Ger1594Nxt0y!") {
      setIsAdmin(true);
      setAdminPassword("");
      alert("Akses Admin Dibuka.");
    } else {
      alert("Password Admin Salah!");
    }
  };

  // SIMULASI DATA TRENDING STYLE GOOGLE TRENDS (TO THE POINT)
  const fetchTrendingIssues = (hours) => {
    setIsLoading(true);
    
    setTimeout(() => {
      const googleTrendsStyleData = [
        { 
          id: 1, 
          topik: "Putusan MK & UU Pilkada", 
          kategori: "Politik & Hukum",
          volume: 145200, 
          desc: "Pokok Masalah: Penolakan publik terhadap revisi kilat undang-undang yang menganulir batas ambang pencalonan kepala daerah." 
        },
        { 
          id: 2, 
          topik: "Bansos & Evaluasi Anggaran", 
          kategori: "Sosial & Ekonomi",
          volume: 112000, 
          desc: "Pokok Masalah: Alokasi distribusi bantuan sosial di masa transisi kekuasaan yang disorot karena potensi politisasi." 
        },
        { 
          id: 3, 
          topik: "Kebocoran Data Pusat", 
          kategori: "Hukum & Teknologi",
          volume: 98500, 
          desc: "Pokok Masalah: Lemahnya enkripsi server instansi negara yang berulang kali dieksploitasi oleh kelompok peretas (hacker)." 
        },
        { 
          id: 4, 
          topik: "Wacana Pajak Kelas Menengah", 
          kategori: "Sosial & Ekonomi",
          volume: 87300, 
          desc: "Pokok Masalah: Beban pungutan baru yang dinilai mempersempit daya beli masyarakat di tengah tekanan biaya hidup." 
        },
        { 
          id: 5, 
          topik: "Reformasi Lembaga Penegak Hukum", 
          kategori: "Hukum & Politik",
          volume: 76400, 
          desc: "Pokok Masalah: Desakan publik agar institusi kepolisian dan kejaksaan lebih transparan dalam mengusut kasus korupsi kakap." 
        },
      ].sort((a, b) => b.volume - a.volume);
      
      setIssuesData(googleTrendsStyleData);
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    if (currentPage === "3jam" || currentPage === "6jam") {
      fetchTrendingIssues(currentPage === "3jam" ? 3 : 6);
    }
  }, [currentPage]);

  if (currentPage === "main") {
    return (
      <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-8 mt-10">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white">Public Trend Radar</h1>
            <p className="text-gray-400">Monitoring isu teratas politik, sosial, & hukum ala Google Trends.</p>
          </div>

          <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                <TrendingUp size={20} className="text-blue-400" /> Status Sistem Trend
              </h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${isApiOnline ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-red-900/50 text-red-400 border border-red-800'}`}>
                <span className={`w-2 h-2 rounded-full ${isApiOnline ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></span>
                {isApiOnline ? 'Active & Live' : 'Offline'}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Tracker Engine</label>
                <input 
                  type="text" 
                  value={apiKey}
                  readOnly
                  className="w-full p-3 border border-[#30363d] bg-[#0d1117] text-gray-400 rounded-lg outline-none cursor-not-allowed text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setCurrentPage("3jam")}
              className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 transition-all text-left space-y-2 group"
            >
              <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">Trending 3 Jam Terakhir</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Fokus pada lonjakan perbincangan kilat di isu politik & hukum.</p>
            </button>
            <button 
              onClick={() => setCurrentPage("6jam")}
              className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 transition-all text-left space-y-2 group"
            >
              <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">Trending 6 Jam Terakhir</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Akumulasi tren isu publik yang paling dominan setengah hari.</p>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6 mt-4">
        <button 
          onClick={() => setCurrentPage("main")}
          className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors font-medium"
        >
          <ArrowLeft size={20} /> Kembali ke Menu Utama
        </button>

        <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d]">
          <h1 className="text-2xl font-bold text-white">
            Topik Hype ({currentPage === "3jam" ? "3 Jam Terakhir" : "6 Jam Terakhir"})
          </h1>
          <p className="text-gray-400 mt-1">Pokok masalah dan volume pencarian publik secara real-time.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] h-96">
              <h2 className="text-lg font-semibold mb-6 text-white">Grafik Lonjakan Isu (Search Interest)</h2>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issuesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" stroke="#4b5563" />
                  <YAxis dataKey="topik" type="category" width={180} tick={{fontSize: 12, fill: '#e5e7eb', fontWeight: 'bold'}} />
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
