"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Lock, Unlock, ArrowLeft, Activity } from "lucide-react";

export default function SocialMediaMonitoring() {
  // State Navigasi
  const [currentPage, setCurrentPage] = useState("main");

  // State API & Admin
  const [apiKey, setApiKey] = useState("sk_live_451a82abf05a8a5b2368ef1002c74b2e");
  const [isApiOnline, setIsApiOnline] = useState(false); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  // State Data
  const [issuesData, setIssuesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fungsi Unlock Admin
  const handleAdminLogin = () => {
    if (adminPassword === "Ger1594Nxt0y!") {
      setIsAdmin(true);
      setAdminPassword("");
      alert("Akses Admin Dibuka. API Key sekarang dapat diedit.");
    } else {
      alert("Password Admin Salah!");
    }
  };

  // FUNGSI UTAMA: Tembak API Lokal (Mock Data Social Vault)
  const fetchMonitoringData = async (hours) => {
    setIsLoading(true);
    
    try {
      // URL diarahkan ke API lokal yang udah kita bikin di /api/instagram/route.js
      const endpointURL = "/api/instagram"; 

      const response = await fetch(endpointURL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      });

      if (!response.ok) {
        throw new Error("Gagal terhubung ke API");
      }

      // Mengambil data JSON lokal
      const rawData = await response.json();
      
      // Mengunci target profil dari JSON
      const targetUser = rawData.data.data.user;
      const followers = targetUser.edge_followed_by.count || 0;
      
      // Menghitung total view video dari timeline
      const videos = targetUser.edge_felix_video_timeline?.edges || {};
      const totalVideoViews = Object.values(videos).reduce((total, video) => {
        return total + (video.node.video_view_count || 0);
      }, 0);

      // Memasukkan data ke dalam grafik
      const liveData = [
        { id: 1, topik: "Total Followers", volume: followers, desc: targetUser.biography },
        { id: 2, topik: "Tayangan Video (IGTV)", volume: totalVideoViews, desc: "Total tayangan dari video terakhir di timeline." },
        { id: 3, topik: "Estimasi Engagement", volume: Math.floor(followers * 0.03), desc: "Perkiraan rata-rata interaksi audiens (3% dari followers)." },
        { id: 4, topik: "Following Aktif", volume: targetUser.edge_follow.count, desc: "Jumlah akun yang diikuti oleh target." },
        { id: 5, topik: "Konten Publikasi", volume: targetUser.edge_owner_to_timeline_media.count, desc: "Total seluruh media yang pernah di-publish." },
      ].sort((a, b) => b.volume - a.volume);
      
      setIssuesData(liveData);
      
      // Jika berhasil narik data, indikator otomatis jadi hijau (Online)
      setIsApiOnline(true); 

    } catch (error) {
      console.error("API Error:", error);
      setIsApiOnline(false); // Indikator API merah jika gagal
      setIssuesData([
        { id: 1, topik: "Koneksi API Gagal", volume: 0, desc: "Pastikan file route.js di /api/instagram sudah dibuat dengan benar." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage === "3jam" || currentPage === "6jam") {
      fetchMonitoringData(currentPage === "3jam" ? 3 : 6);
    }
  }, [currentPage]);

  // --- RENDER PAGE UTAMA ---
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
                <label className="block text-sm font-medium text-gray-400 mb-1">API Key</label>
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
              {isAdmin && (
                <p className="text-sm text-green-400 flex items-center gap-1 mt-2">
                  <Unlock size={16} /> Mode Admin Aktif. API Key dapat diubah.
                </p>
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

  // --- RENDER PAGE MONITORING ---
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
          <p className="text-gray-400 mt-1">Data Live Profile Instagram (Mode Internal / Hemat Credit).</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] h-96">
              <h2 className="text-lg font-semibold mb-6 text-white">Grafik Analisis Akun</h2>
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
              <h2 className="text-xl font-bold mt-8 text-white">Rincian Data</h2>
              {issuesData.map((isu, index) => (
                <div key={isu.id} className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] border-l-4 border-l-blue-500 hover:bg-[#1c2128] transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white">
                      #{index + 1} - {isu.topik}
                    </h3>
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
