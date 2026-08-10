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

  // FUNGSI UTAMA: Tembak API Social Vault Asli
  const fetchMonitoringData = async (hours) => {
    setIsLoading(true);
    
    try {
      /* 
       * ⚠️ PERHATIAN: 
       * Ganti URL di bawah ini dengan Endpoint resmi dari Social Vault.
       * Contoh: https://api.socialvault.io/v1/instagram/profile?username=ned
       */
      const endpointURL = "URL_ENDPOINT_SOCIAL_VAULT_LO_DISINI"; 

      // Request langsung ke server Social Vault
      const response = await fetch(endpointURL, {
        method: "GET", // Sesuaikan dengan dokumentasi (GET / POST)
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`, // Sistem keamanan standar API
          // "x-api-key": apiKey  <-- (Pakai ini kalau Social Vault mintanya lewat Header x-api-key)
        }
      });

      if (!response.ok) {
        throw new Error("Gagal terhubung ke Social Vault");
      }

      // Mengambil data asli
      const rawData = await response.json();
      
      // Mengunci target profil dari JSON
      const targetUser = rawData.data.data.user;
      const followers = targetUser.edge_followed_by.count || 0;
      
      // Menghitung total view video dari timeline
      const videos = targetUser.edge_felix_video_timeline.edges;
      const totalVideoViews = Object.values(videos).reduce((total, video) => {
        return total + (video.node.video_view_count || 0);
      }, 0);

      // Memasukkan data asli ke dalam grafik
      const liveData = [
        { id: 1, topik: "Total Followers", volume: followers, desc: targetUser.biography },
        { id: 2, topik: "Tayangan Video (IGTV)", volume: totalVideoViews, desc: "Total tayangan dari 5 video terakhir di timeline." },
        { id: 3, topik: "Estimasi Engagement", volume: Math.floor(followers * 0.03), desc: "Perkiraan rata-rata interaksi audiens." },
        { id: 4, topik: "Following Aktif", volume: targetUser.edge_follow.count, desc: "Jumlah akun yang diikuti oleh target." },
        { id: 5, topik: "Konten Publikasi", volume: targetUser.edge_owner_to_timeline_media.count, desc: "Total seluruh media yang pernah di-publish." },
      ].sort((a, b) => b.volume - a.volume);
      
      setIssuesData(liveData);
      setIsApiOnline(true); // Indikator API berubah jadi hijau

    } catch (error) {
      console.error("API Error:", error);
      setIsApiOnline(false); // Indikator API merah jika gagal
      // Data fallback / darurat jika URL belum diisi atau error
      setIssuesData([
        { id: 1, topik: "Koneksi API Gagal", volume: 0, desc: "Silakan periksa URL Endpoint atau sisa credit di akun Social Vault lo." }
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
      <main className="min-h-screen p-8 bg-gray-50 text-gray-900 font-sans">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Social Media Monitoring</h1>
            <p className="text-gray-500">Pantau perbincangan publik di Indonesia secara real-time.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Activity size={20} /> Konfigurasi API
              </h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${isApiOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <span className={`w-2 h-2 rounded-full ${isApiOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {isApiOnline ? 'Online' : 'Offline'}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input 
                  type="text" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  readOnly={!isAdmin}
                  className={`w-full p-3 border rounded-lg outline-none transition-colors ${!isAdmin ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white border-blue-400'}`}
                />
              </div>

              {!isAdmin && (
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    placeholder="Masukkan kode admin untuk ubah API..." 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="flex-1 p-2 border rounded-lg text-sm"
                  />
                  <button 
                    onClick={handleAdminLogin}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
                  >
                    <Lock size={16} /> Buka Akses
                  </button>
                </div>
              )}
              {isAdmin && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Unlock size={16} /> Mode Admin Aktif. API Key dapat diubah.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setCurrentPage("3jam")}
              className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left space-y-2"
            >
              <h3 className="text-xl font-bold text-blue-600">Update Monitoring 3 Jam</h3>
              <p className="text-gray-500 text-sm">Lihat 5 isu paling kontroversial dalam 3 jam terakhir di X, Instagram, Facebook, dan Google.</p>
            </button>

            <button 
              onClick={() => setCurrentPage("6jam")}
              className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left space-y-2"
            >
              <h3 className="text-xl font-bold text-blue-600">Update Monitoring 6 Jam</h3>
              <p className="text-gray-500 text-sm">Lihat 5 isu paling kontroversial dalam 6 jam terakhir di X, Instagram, Facebook, dan Google.</p>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- RENDER PAGE MONITORING ---
  return (
    <main className="min-h-screen p-8 bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <button 
          onClick={() => setCurrentPage("main")}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium"
        >
          <ArrowLeft size={20} /> Kembali ke Halaman Utama
        </button>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold">
            Update Monitoring {currentPage === "3jam" ? "3 Jam" : "6 Jam"} Terakhir
          </h1>
          <p className="text-gray-500 mt-1">Data Live Profile Instagram dari Social Vault.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96">
              <h2 className="text-lg font-semibold mb-6">Grafik Analisis Akun</h2>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issuesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="topik" type="category" width={150} tick={{fontSize: 12}} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="volume" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold mt-4">Rincian Data</h2>
              {issuesData.map((isu, index) => (
                <div key={isu.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-800">
                      #{index + 1} - {isu.topik}
                    </h3>
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded font-semibold">
                      Vol: {isu.volume.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{isu.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
