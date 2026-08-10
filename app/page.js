"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Lock, Unlock, ArrowLeft, Activity } from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [apiKey, setApiKey] = useState("sk_live_451a82abf05a8a5b2368ef1002c74b2e");
  const [isApiOnline, setIsApiOnline] = useState(false); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [issuesData, setIssuesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = () => {
    if (adminPassword === "Ger1594Nxt0y!") {
      setIsAdmin(true);
      setAdminPassword("");
      alert("Akses Admin Dibuka. API Key sekarang dapat diedit.");
    } else {
      alert("Password Admin Salah!");
    }
  };

  // Cek koneksi awal (Simulasi API aktif jika ada API Key)
  useEffect(() => {
    if (apiKey.length > 10) {
      setIsApiOnline(true);
    } else {
      setIsApiOnline(false);
    }
  }, [apiKey]);

  const fetchMonitoringData = (hours) => {
    setIsLoading(true);
    
    // Simulasi narik data isu publik (Diganti dengan fetch API Keyword Search nanti)
    setTimeout(() => {
      const publicIssuesMock = [
        { id: 1, topik: "Revisi UU Pilkada", volume: Math.floor(Math.random() * 50000) + 100000, desc: "Perdebatan sengit mengenai batas usia pencalonan dan putusan MK yang memicu aksi massa di berbagai daerah." },
        { id: 2, topik: "Kebijakan Bansos", volume: Math.floor(Math.random() * 30000) + 80000, desc: "Distribusi bansos menjelang periode pemilihan menuai kritik tajam di platform X dan Facebook." },
        { id: 3, topik: "Keamanan Data Siber", volume: Math.floor(Math.random() * 20000) + 60000, desc: "Kebocoran data terbaru instansi pemerintah menjadi trending topic di Google dan X." },
        { id: 4, topik: "Kenaikan Pajak", volume: Math.floor(Math.random() * 20000) + 40000, desc: "Wacana pajak baru untuk kelas menengah memicu sentimen negatif masif di Instagram." },
        { id: 5, topik: "Kasus Korupsi Pejabat", volume: Math.floor(Math.random() * 15000) + 20000, desc: "Penangkapan tokoh publik terkait penggelapan dana proyek infrastruktur daerah." },
      ].sort((a, b) => b.volume - a.volume);
      
      setIssuesData(publicIssuesMock);
      setIsLoading(false);
    }, 1200);
  };

  useEffect(() => {
    if (currentPage === "3jam" || currentPage === "6jam") {
      fetchMonitoringData(currentPage === "3jam" ? 3 : 6);
    }
  }, [currentPage]);

  if (currentPage === "main") {
    return (
      <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-8 mt-10">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white">Social Media Monitoring</h1>
            <p className="text-gray-400">Pantau perbincangan publik di Indonesia secara real-time.</p>
          </div>

          <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                <Activity size={20} className="text-blue-400" /> Konfigurasi API
              </h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${isApiOnline ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-red-900/50 text-red-400 border border-red-800'}`}>
                <span className={`w-2 h-2 rounded-full ${isApiOnline ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></span>
                {isApiOnline ? 'Online' : 'Offline'}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">API Key (Social Vault / Tracker)</label>
                <input 
                  type="text" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  readOnly={!isAdmin}
                  className={`w-full p-3 border rounded-lg outline-none transition-colors ${!isAdmin ? 'bg-[#0d1117] border-[#30363d] text-gray-500 cursor-not-allowed' : 'bg-[#0d1117] border-blue-500 text-white'}`}
                />
              </div>

              {!isAdmin && (
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    placeholder="Masukkan kode admin untuk ubah API..." 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="flex-1 p-2 border border-[#30363d] bg-[#0d1117] text-white rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
                  />
                  <button 
                    onClick={handleAdminLogin}
                    className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/50 rounded-lg hover:bg-blue-600/40 flex items-center gap-2 text-sm transition-all"
                  >
                    <Lock size={16} /> Buka Akses
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setCurrentPage("3jam")}
              className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 transition-all text-left space-y-2 group"
            >
              <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">Update Monitoring 3 Jam</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Lihat 5 isu paling kontroversial dalam 3 jam terakhir di X, Instagram, Facebook, dan Google.</p>
            </button>
            <button 
              onClick={() => setCurrentPage("6jam")}
              className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 transition-all text-left space-y-2 group"
            >
              <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">Update Monitoring 6 Jam</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Lihat 5 isu paling kontroversial dalam 6 jam terakhir di X, Instagram, Facebook, dan Google.</p>
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
          <ArrowLeft size={20} /> Kembali ke Halaman Utama
        </button>

        <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d]">
          <h1 className="text-2xl font-bold text-white">
            Update Monitoring {currentPage === "3jam" ? "3 Jam" : "6 Jam"} Terakhir
          </h1>
          <p className="text-gray-400 mt-1">Top 5 Isu Politik, Sosial, dan Hukum di Indonesia.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] h-96">
              <h2 className="text-lg font-semibold mb-6 text-white">Grafik Volume Pembicaraan</h2>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issuesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" stroke="#4b5563" />
                  <YAxis dataKey="topik" type="category" width={150} tick={{fontSize: 12, fill: '#9ca3af'}} />
                  <Tooltip cursor={{fill: '#1f2937'}} contentStyle={{backgroundColor: '#0d1117', borderColor: '#30363d', color: '#fff'}} />
                  <Bar dataKey="volume" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4 pb-10">
              <h2 className="text-xl font-bold mt-8 text-white">Rincian Isu Kontroversial</h2>
              {issuesData.map((isu, index) => (
                <div key={isu.id} className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] border-l-4 border-l-blue-500 hover:bg-[#1c2128] transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white">#{index + 1} - {isu.topik}</h3>
                    <span className="bg-blue-900/30 text-blue-400 text-xs px-3 py-1 rounded-full font-semibold border border-blue-800/50">
                      Vol: {isu.volume.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-400 leading-relaxed mt-3">{isu.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
