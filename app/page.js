"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, RefreshCw, ExternalLink, Calendar, Building2, Filter, DownloadCloud, Copy, CheckCircle2, PlaySquare, TrendingUp, Zap, AlertTriangle, Crosshair } from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [previousPage, setPreviousPage] = useState("main");
  const [selectedIssue, setSelectedIssue] = useState(null);
  
  const [issuesData, setIssuesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [ytData, setYtData] = useState([]);
  const [kolData, setKolData] = useState([]);
  const [isLoadingYt, setIsLoadingYt] = useState(false);
  const [ytSortMode, setYtSortMode] = useState("views"); 
  const [ytFetchMode, setYtFetchMode] = useState("umum"); 
  
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const categories = ["Semua", "Politik", "Pemerintahan", "Sosial", "Hukum", "Bencana", "Entertainment", "Olahraga", "Teknologi", "Finansial"];

  const [isScraping, setIsScraping] = useState(false);
  const [scrapedResult, setScrapedResult] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const fetchLiveTrends = async () => {
    setIsLoading(true);
    try {
      let endpoint = '';
      if (currentPage === 'bencana-24jam') endpoint = `/api/bencana?t=${Date.now()}`;
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
    } catch (error) {} 
    finally { setIsLoading(false); }
  };

  const fetchYoutubeData = async () => {
    setIsLoadingYt(true);
    try {
      const response = await fetch(`/api/puan-yt?mode=${ytFetchMode}&t=${Date.now()}`, { cache: 'no-store' });
      const result = await response.json();
      if (result.success) setYtData(result.data);
    } catch (error) {} 
    finally { setIsLoadingYt(false); }
  };

  useEffect(() => {
    if (currentPage === "puan-yt-analysis") fetchYoutubeData();
    else if (currentPage !== "main" && currentPage !== "detail") {
      fetchLiveTrends();
      setSelectedCategory("Semua"); 
    }
  }, [currentPage, ytFetchMode]);

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
      const promptInstruction = "Buatkan saya opini singkat untuk postingan threads atau X, 10 dalam konteks pro dan 10 dalam konteks kontra.";
      const title = selectedIssue.topik || "Tanpa Judul"; 
      const content = selectedIssue.articleDesc || "Tidak ada deskripsi rinci.";
      setScrapedResult(`${promptInstruction}\n\n[JUDUL TOPIK]\n${title}\n\n[DESKRIPSI & ISI KONTEN]\n${content}`);
      setIsScraping(false);
    }, 1000);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(scrapedResult);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000); 
  };

  const isBencanaMode = currentPage === "bencana-24jam" || (currentPage === "detail" && previousPage === "bencana-24jam");
  const isTerkiniMode = currentPage.includes("terkini") || isBencanaMode || (currentPage === "detail" && (previousPage.includes("terkini") || previousPage === "
