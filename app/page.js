"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, RefreshCw, ExternalLink, Calendar, Filter, 
  PlaySquare, Zap, Search, Flame, Megaphone, Copy, Check, X, Eye, ThumbsUp, ThumbsDown
} from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [previousPage, setPreviousPage] = useState("main");
  
  const [topNewsData, setTopNewsData] = useState([]);
  const [terkiniData, setTerkiniData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [ytData, setYtData] = useState([]);
  const [isLoadingYt, setIsLoadingYt] = useState(false);
  const [ytSortMode, setYtSortMode] = useState("views"); 
  const [ytFetchMode, setYtFetchMode] = useState("umum"); 
  
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [isTopNewsFilter, setIsTopNewsFilter] = useState(false);
  const categories = ["Semua", "Politik", "Pemerintahan", "Sosial", "Hukum", "Bencana", "Entertainment", "Olahraga", "Teknologi", "Finansial"];

  const [promptModalData, setPromptModalData] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  const [urlBerita, setUrlBerita] = useState("");
  const [promptTeks, setPromptTeks] = useState("");
  const [judulHtml, setJudulHtml] = useState("");
  const [sumberBerita, setSumberBerita] = useState("");
  const [imageUrl, setImageUrl] = useState(""); 
  const [editorSubPage, setEditorSubPage] = useState(2);

  const [imgX, setImgX] = useState(0);
  const [imgY, setImgY] = useState(0);
  const [imgScale, setImgScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [teksX, setTeksX] = useState(140);
  const [teksY, setTeksY] = useState(800);
  const [ukuranFont, setUkuranFont] = useState(79);
  const [jarakBaris, setJarakBaris] = useState(1.4);

  const [sumberX, setSumberX] = useState(145); 
  const [sumberY, setSumberY] = useState(1243);
  const [ukuranFontSumber, setUkuranFontSumber] = useState(28);

  const canvasRef = useRef(null);
  const [loadedBgImg, setLoadedBgImg] = useState(null);
  const [templateImgObj, setTemplateImgObj] = useState(null);

  const fetchLiveTrends = async () => {
    setIsLoading(true);
    try {
      let epTop = "";
      let epTerkini = "";
      let nTime = String(Date.now());

      if (currentPage === "bencana") {
        epTop = "?t=" + nTime;
        epTerkini = "?t=" + nTime;
      } else if (currentPage === "pdip") {
        epTop = "?hours=12&t=" + nTime;
        epTerkini = "?hours=24&mode=terkini&t=" + nTime;
      } else if (currentPage === "megawati") {
        epTop = "?hours=12&t=" + nTime;
        epTerkini = "?hours=24&mode=terkini&t=" + nTime;
      } else if (currentPage === "puan") {
        epTop = "?hours=12&t=" + nTime;
        epTerkini = "?hours=24&mode=terkini&t=" + nTime;
      } else if (currentPage === "nasional") {
        epTop = "?hours=12&t=" + nTime;
        epTerkini = "?hours=24&mode=terkini&t=" + nTime;
      }

      let pNews = ["api", "news"].join("/");
      let pPdip = ["api", "pdip"].join("/");
      let pMega = ["api", "megawati"].join("/");
      let pPuan = ["api", "puan"].join("/");
      let pBenc = ["api", "bencana"].join("/");

      let uTop = "";
      let uTerkini = "";
