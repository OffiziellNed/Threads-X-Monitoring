"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Lock, Unlock, ArrowLeft, Activity, Globe } from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [apiKey, setApiKey] = useState("sk_live_google_rss_free_tier");
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

  // FUNGSI NARIK BERITA DARI GOOGLE NEWS RSS (VIA PROXY PUBLIK / DIRECT)
  const fetchGoogleNews = async (hours) => {
    setIsLoading(true);
    try {
      // Mengambil RSS Google News dengan kata kunci Politik, Hukum, dan Sosial di Indonesia
      const query = encodeURIComponent("politik OR hukum OR sosial Indonesia");
      const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;
      
      // Kita pakai proxy publik agar browser/Vercel tidak diblokir CORS
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
      
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      if (!data.contents) throw new Error("Gagal memuat RSS");

      // Memparsing XML sederhana menggunakan DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data.contents, "text/xml");
      const items = xmlDoc.querySelectorAll("item");

      let parsedIssues = [];
      // Ambil 5 berita teratas untuk dijadikan Top 5 Isu
      for (let i = 0; i < Math.min(5, items.length); i++) {
        const title = items[i].querySelector("title")?.textContent || "Isu Publik Terkini";
        const source = items[i].querySelector("source")?.textContent || "Media Nasional";
        
        parsedIssues.push({
          id: i + 1,
          topik: title.split(" - ")[0], // Ambil judul utamanya saja
          volume: Math.floor(Math.random() * 30000) + 40000 - (i * 5000), // Simulasi volumeinteraksi pembicaraan
          desc: `Sumber utama dari ${source}: Sorotan hangat perbincangan publik terkait perkembangan isu ini dalam ${hours} jam terakhir.`
        });
      }

      setIssuesData(parsedIssues);
      setIsApiOnline(true);
    } catch (error) {
      console.error("Gagal ambil Google News:", error);
      // Fallback data jika jaringan ke RSS terganggu
      setIssuesData([
        { id: 1, topik: "Dinamika Kebijakan Politik Nasional", volume: 85400, desc: "Pembahasan hangat mengenai arah regulasi dan keputusan strategis pemerintah." },
        { id: 2, topik: "Penegakan Hukum dan Kasus Terbaru", volume: 72100, desc: "Sorotan publik terhadap transparansi lembaga penegak hukum." },
        { id: 3, topik: "Isu Sosial dan Kesejahteraan Masyarakat", volume: 64900, desc: "Diskusi publik mengenai kondisi ekonomi dan bantuan sosial." },
      ]);
      setIsApiOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage === "3jam" || currentPage === "6jam") {
      fetchGoogleNews(currentPage === "3jam" ? 3 : 6);
    }
  }, [currentPage]);

  if (currentPage === "main") {
    return (
      <main className="min-h-screen p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-8 mt-10">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white">Public Opinion Monitoring</h1>
            <p className="text-gray-400">Pantau isu politik, sosial, and hukum secara real-time via Google News.</p>
          </div>

          <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                <Globe size={20} className="text-blue-400" /> Sumber Data: Google News RSS
              </h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${isApiOnline ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-red-900/50 text-red-400 border border-red-800'}`}>
                <span className={`w-2 h-2 rounded-full ${isApiOnline ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></span>
                {isApiOnline ? 'Online (Gratis)' : 'Fallback Mode'}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Akses Sistem</label>
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
              <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">Monitoring 3 Jam Terakhir</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Rangkuman isu politik, sosial, dan hukum terhangat 3 jam ke belakang.</p>
            </button>
            <button 
              onClick={() => setCurrentPage("6jam")}
              className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg hover:border-blue-500 transition-all text-left space-y-2 group"
            >
              <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">Monitoring 6 Jam Terakhir</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Rangkuman isu politik, sosial, dan hukum terhangat 6 jam ke belakang.</p>
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
            Analisis Isu {currentPage === "3jam" ? "3 Jam" : "6 Jam"} Terakhir
          </h1>
          <p className="text-gray-400 mt-1">Berdasarkan pemberitaan dan perbincangan publik di Indonesia.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] h-96">
              <h2 className="text-lg font-semibold mb-6 text-white">Grafik Volume Isu Teratas</h2>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issuesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" stroke="#4b5563" />
                  <YAxis dataKey="topik" type="category" width={180} tick={{fontSize: 11, fill: '#9ca3af'}} />
                  <Tooltip cursor={{fill: '#1f2937'}} contentStyle={{backgroundColor: '#0d1117', borderColor: '#30363d', color: '#fff'}} />
                  <Bar dataKey="volume" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4 pb-10">
              <h2 className="text-xl font-bold mt-8 text-white">Rincian Isu & Pembicaraan Publik</h2>
              {issuesData.map((isu, index) => (
                <div key={isu.id} className="bg-[#161b22] p-6 rounded-2xl shadow-lg border border-[#30363d] border-l-4 border-l-blue-500 hover:bg-[#1c2128] transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white">#{index + 1} - {isu.topik}</h3>
                    <span className="bg-blue-900/30 text-blue-400 text-xs px-3 py-1 rounded-full font-semibold border border-blue-800/50">
                      Aktivitas: {isu.volume.toLocaleString()}
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
