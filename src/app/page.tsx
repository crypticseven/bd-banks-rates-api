"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ALL_61_BANKS, filterBanks, calculateFdrMaturity, BankRateRecord, BankProduct } from "@/lib/bankRatesData";
import {
  Search,
  ExternalLink,
  Calculator,
  Landmark,
  Terminal,
  Copy,
  Check,
  Layers,
  Database,
  Code2,
  RefreshCw,
  AlertCircle,
  Inbox,
  Clock,
  Sparkles,
  Star,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Tag,
  Key,
} from "lucide-react";

type EndpointTab = "deposits" | "products" | "ratings" | "banks" | "benchmarks";
type RequestStatus = "idle" | "loading" | "success" | "error";

export default function ApiLandingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [shariahOnly, setShariahOnly] = useState<boolean | undefined>(undefined);
  const [selectedTenure, setSelectedTenure] = useState<"3_months" | "6_months" | "1_year" | "3_years" | "5_years">("1_year");
  const [depositAmount, setDepositAmount] = useState<number>(500000);
  const [hasTin, setHasTin] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Sorting mode: 'yield' | 'risk_adjusted' | 'rating'
  const [sortMode, setSortMode] = useState<"yield" | "risk_adjusted" | "rating">("risk_adjusted");
  const [selectedBankForModal, setSelectedBankForModal] = useState<BankRateRecord | null>(null);
  const [privateApiKey, setPrivateApiKey] = useState<string>("bdrip_demo_eval_2026");

  // Dynamic Market Intelligence computed algorithmically across ALL 61 scheduled banks
  const marketIntelligence = useMemo(() => {
    // 1. Prime Sweetspot: Top safety rating (>= 4.5) with highest competitive yield
    const primeBank = [...ALL_61_BANKS]
      .filter((b) => b.rating_score >= 4.5)
      .sort((a, b) => (b.fdr_rates["1_year"] || 0) - (a.fdr_rates["1_year"] || 0))[0] || ALL_61_BANKS[0];

    // 2. Algorithmic Turnaround Candidate: Bank in transition recovery (10% <= NPL <= 30%) with highest yield
    const turnaroundBank = [...ALL_61_BANKS]
      .filter((b) => b.npl_ratio_pct && b.npl_ratio_pct >= 10.0 && b.npl_ratio_pct <= 30.0)
      .sort((a, b) => (b.fdr_rates["1_year"] || 0) - (a.fdr_rates["1_year"] || 0))[0] ||
      ALL_61_BANKS.find((b) => b.short_code === "UCB") ||
      ALL_61_BANKS[0];

    // 3. Distressed Watchlist: Bank with highest classified loan ratio (> 30% NPL)
    const distressedBank = [...ALL_61_BANKS]
      .filter((b) => b.npl_ratio_pct !== null && b.npl_ratio_pct !== undefined)
      .sort((a, b) => (b.npl_ratio_pct || 0) - (a.npl_ratio_pct || 0))[0] || ALL_61_BANKS[0];

    return { primeBank, turnaroundBank, distressedBank };
  }, []);

  // Real API execution states
  const [activeTab, setActiveTab] = useState<EndpointTab>("deposits");
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<RequestStatus>("idle");
  const [apiStatusCode, setApiStatusCode] = useState<number>(200);
  const [apiLatency, setApiLatency] = useState<number>(0);
  const [apiError, setApiError] = useState<string | null>(null);

  const tenureLabels = {
    "3_months": "3 Months",
    "6_months": "6 Months",
    "1_year": "1 Year",
    "3_years": "3 Years",
    "5_years": "5 Years",
  };

  const tenureMonths = {
    "3_months": 3,
    "6_months": 6,
    "1_year": 12,
    "3_years": 36,
    "5_years": 60,
  }[selectedTenure];

  // Dynamic API URL for the playground
  const currentEndpointUrl = useMemo(() => {
    if (activeTab === "products") {
      const p = new URLSearchParams();
      if (searchQuery.trim()) p.append("q", searchQuery.trim());
      if (shariahOnly) p.append("shariah", "true");
      return `/api/v1/rates/products${p.toString() ? `?${p.toString()}` : ""}`;
    }
    if (activeTab === "ratings") {
      return `/api/v1/rates/ratings`;
    }
    if (activeTab === "banks") {
      return `/api/v1/rates/banks${selectedCategory !== "ALL" ? `?category=${selectedCategory}` : ""}`;
    }
    if (activeTab === "benchmarks") {
      return `/api/v1/rates/benchmarks`;
    }

    const params = new URLSearchParams({
      principal: depositAmount.toString(),
      tenure: selectedTenure,
      category: selectedCategory,
      has_tin: hasTin ? "true" : "false",
      sort_by: sortMode,
    });
    if (searchQuery.trim()) params.append("q", searchQuery.trim());
    if (shariahOnly !== undefined) params.append("shariah", shariahOnly ? "true" : "false");
    if (privateApiKey.trim()) params.append("api_key", privateApiKey.trim());
    return `/api/v1/rates/deposits?${params.toString()}`;
  }, [activeTab, depositAmount, selectedTenure, selectedCategory, hasTin, sortMode, searchQuery, shariahOnly, privateApiKey]);

  // Execute real fetch against Next.js API
  const executeApiQuery = useCallback(async (url: string) => {
    setApiStatus("loading");
    setApiError(null);
    const startTime = performance.now();

    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (privateApiKey.trim()) {
        headers["x-api-key"] = privateApiKey.trim();
      }

      const res = await fetch(url, { headers });
      const latency = Math.round(performance.now() - startTime);
      setApiLatency(latency);
      setApiStatusCode(res.status);

      const json = await res.json();
      if (!res.ok) {
        setApiStatus("error");
        setApiError(json.message || `HTTP error ${res.status}`);
        setApiResponse(json);
      } else {
        setApiStatus("success");
        setApiResponse(json);
      }
    } catch (err: any) {
      setApiStatus("error");
      setApiStatusCode(0);
      setApiError(err.message || "Network request failed");
      setApiResponse({ error: err.message || "Failed to connect to API" });
    }
  }, [privateApiKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      executeApiQuery(currentEndpointUrl);
    }, 250);
    return () => clearTimeout(timer);
  }, [currentEndpointUrl, executeApiQuery]);

  // Client-side comparator list for table
  const filteredBanks = useMemo(() => {
    return filterBanks({
      category: selectedCategory as any,
      isShariah: shariahOnly,
      searchQuery,
      sortByTenure: selectedTenure,
      sortBy: sortMode,
    });
  }, [selectedCategory, shariahOnly, searchQuery, selectedTenure, sortMode]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sampleCurl = `curl -X GET "https://api.fardinanik.com${currentEndpointUrl}" \\
  -H "Accept: application/json"${privateApiKey ? ` \\\n  -H "x-api-key: ${privateApiKey}"` : ""}`;

  const samplePython = `import requests

url = "https://api.fardinanik.com${currentEndpointUrl}"
headers = {"Accept": "application/json"${privateApiKey ? `, "x-api-key": "${privateApiKey}"` : ""}}
response = requests.get(url, headers=headers)
data = response.json()
print("Top Bank:", data.get("top_ranked_bank") or data.get("top_product"))`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Top Banner */}
      <div className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-4 py-3 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-emerald-400 font-semibold">ALL 61 BANGLADESH SCHEDULED BANKS INDEXED</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Policy Repo: <strong className="text-slate-200">10.00%</strong></span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Prime High Yield: <strong className="text-emerald-400">{marketIntelligence.primeBank?.bank_name} ({marketIntelligence.primeBank?.fdr_rates["1_year"]}% @ {marketIntelligence.primeBank?.credit_rating})</strong></span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Turnaround Leader: <strong className="text-cyan-400">{marketIntelligence.turnaroundBank?.short_code} ({marketIntelligence.turnaroundBank?.fdr_rates["1_year"]}% @ {marketIntelligence.turnaroundBank?.npl_ratio_pct}% NPL)</strong></span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono">
            <a href="https://github.com/crypticseven/bd-banks-rates-api" target="_blank" rel="noreferrer" className="hover:text-white flex items-center gap-1 transition">
              <Code2 className="w-3.5 h-3.5" /> GitHub Repo
            </a>
            <span>•</span>
            <a href="/openapi.json" target="_blank" rel="noreferrer" className="hover:text-emerald-400 flex items-center gap-1 transition">
              <ExternalLink className="w-3.5 h-3.5" /> OpenAPI Spec
            </a>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <header className="border-b border-slate-800 bg-radial from-slate-900 via-slate-950 to-slate-950 py-16 px-4">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/30 text-emerald-400 text-xs font-mono font-medium">
            <Sparkles className="w-3.5 h-3.5" /> Granular Product Schemes & 5-Star Stability Ratings
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto">
            Bangladesh 61 Banks Deposit Rate, SOC & Product Intelligence API
          </h1>
          <p className="text-slate-400 max-w-3xl mx-auto text-base sm:text-lg">
            High-performance public & private REST API tracking deposit yields (FDR/DPS), specific branded products, Schedule of Charges, and Bangladesh Bank regulatory stability ratings across all 61 Scheduled Commercial Banks.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <a
              href="#playground"
              className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition flex items-center gap-2"
            >
              <Terminal className="w-4 h-4" /> Try Live API Playground
            </a>
            <a
              href="#table"
              className="px-6 py-2.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-medium text-sm transition flex items-center gap-2"
            >
              <Landmark className="w-4 h-4" /> View 61 Banks & Products Table
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-12 space-y-16">
        
        {/* Market Intelligence Callout: Safe Yield vs Watchlist Yield */}
        <section className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/30 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Dynamic Market Intelligence & Stability Insight
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                Highest Yield vs. Depositor Safety Index
              </h2>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <input
                type="text"
                placeholder="Commercial API Key..."
                value={privateApiKey}
                onChange={(e) => setPrivateApiKey(e.target.value)}
                className="bg-transparent border-none outline-none text-slate-200 w-44 placeholder-slate-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Prime Sweetspot */}
            <div className="border border-emerald-500/30 bg-emerald-950/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                  ★ PRIME SWEETSPOT
                </span>
                <span className="text-emerald-400 font-mono font-bold text-xs">
                  {marketIntelligence.primeBank?.rating_score}★ {marketIntelligence.primeBank?.credit_rating} (NPL {marketIntelligence.primeBank?.npl_ratio_pct}%)
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">{marketIntelligence.primeBank?.bank_name}</h3>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Offers verified <strong>{marketIntelligence.primeBank?.fdr_rates["1_year"]}%</strong> (1Y FD) with pristine balance sheet quality. Holds an audited <strong>{marketIntelligence.primeBank?.npl_ratio_pct}% NPL</strong> ratio and &gt;{marketIntelligence.primeBank?.capital_adequacy_ratio_car}% CAR. Optimal depositor safety.
              </p>
            </div>

            {/* Turnaround Profile */}
            <div className="border border-cyan-500/30 bg-cyan-950/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold font-mono">
                  ⚡ ALGORITHMIC TURNAROUND
                </span>
                <span className="text-cyan-400 font-mono font-bold text-xs">
                  {marketIntelligence.turnaroundBank?.rating_score}★ {marketIntelligence.turnaroundBank?.credit_rating} (NPL {marketIntelligence.turnaroundBank?.npl_ratio_pct}%)
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">{marketIntelligence.turnaroundBank?.bank_name} ({marketIntelligence.turnaroundBank?.short_code})</h3>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Offers verified <strong>{marketIntelligence.turnaroundBank?.fdr_rates["1_year"]}%</strong> (1Y FD) and <strong>{marketIntelligence.turnaroundBank?.fdr_rates["6_months"]}%</strong> (6-Month). NPL stands at <strong>{marketIntelligence.turnaroundBank?.npl_ratio_pct}%</strong>. Higher yield compensates for balance sheet transition under capital recovery plan.
              </p>
            </div>

            {/* Watchlist Yield Warning */}
            <div className="border border-amber-500/30 bg-amber-950/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono">
                  ⚠ DISTRESSED WATCHLIST
                </span>
                <span className="text-amber-400 font-mono font-bold text-xs">
                  {marketIntelligence.distressedBank?.rating_score}★ {marketIntelligence.distressedBank?.credit_rating} (NPL {marketIntelligence.distressedBank?.npl_ratio_pct}%)
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">{marketIntelligence.distressedBank?.bank_name} ({marketIntelligence.distressedBank?.short_code})</h3>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Offers nominal <strong>{marketIntelligence.distressedBank?.fdr_rates["1_year"]}%</strong> interest rate. Carries <strong>{marketIntelligence.distressedBank?.npl_ratio_pct}% NPL</strong> ratio and capital impairment. High rates reflect acute liquidity requirements rather than stability.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive API Playground & Documentation */}
        <section id="playground" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Code2 className="w-6 h-6 text-emerald-400" /> Live Interactive API Playground
              </h2>
              <p className="text-sm text-slate-400">
                Queries the live edge endpoints with CORS enabled. Select an endpoint tab below to execute.
              </p>
            </div>
            
            {/* Endpoint Tabs */}
            <div className="flex flex-wrap gap-2">
              {(["deposits", "products", "ratings", "banks", "benchmarks"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition ${
                    activeTab === tab ? "bg-emerald-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  GET /rates/{tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Code Snippets & Active Request */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">GET</span>
                  <span className="text-slate-300 truncate max-w-xs">{currentEndpointUrl}</span>
                </span>
                <button
                  onClick={() => executeApiQuery(currentEndpointUrl)}
                  disabled={apiStatus === "loading"}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${apiStatus === "loading" ? "animate-spin" : ""}`} />
                  Re-fetch
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>cURL Command</span>
                  <button
                    onClick={() => copyToClipboard(sampleCurl, "curl")}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                  >
                    {copiedCode === "curl" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode === "curl" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs font-mono text-emerald-300 overflow-x-auto">
                  {sampleCurl}
                </pre>
              </div>

              <div className="space-y-1 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Python SDK Code</span>
                  <button
                    onClick={() => copyToClipboard(samplePython, "python")}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                  >
                    {copiedCode === "python" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode === "python" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto">
                  {samplePython}
                </pre>
              </div>
            </div>

            {/* Right: Live Response Display */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    {apiStatus === "loading" ? (
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold animate-pulse">FETCHING</span>
                    ) : apiStatus === "error" ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">HTTP {apiStatusCode || "ERR"}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">HTTP {apiStatusCode} OK</span>
                    )}
                    <span>Live Output</span>
                  </div>
                  {apiLatency > 0 && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {apiLatency}ms
                    </span>
                  )}
                </div>

                {apiStatus === "loading" ? (
                  <div className="mt-4 p-8 border border-slate-800/80 rounded-lg bg-slate-950 flex flex-col items-center justify-center space-y-3 min-h-[220px]">
                    <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
                    <p className="text-xs font-mono text-slate-400">Executing edge API query...</p>
                  </div>
                ) : apiStatus === "error" ? (
                  <div className="mt-4 p-6 border border-rose-800/40 rounded-lg bg-rose-950/20 space-y-3">
                    <div className="flex items-center gap-2 text-rose-400 text-sm font-semibold">
                      <AlertCircle className="w-4 h-4" /> Request Failed
                    </div>
                    <p className="text-xs font-mono text-rose-300">{apiError}</p>
                    <button
                      onClick={() => executeApiQuery(currentEndpointUrl)}
                      className="px-3 py-1.5 rounded bg-rose-900/60 hover:bg-rose-800 text-xs text-white font-mono transition"
                    >
                      Retry Request
                    </button>
                  </div>
                ) : (
                  <pre className="mt-3 bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-y-auto max-h-80 tabular-nums">
                    {JSON.stringify(apiResponse, null, 2)}
                  </pre>
                )}
              </div>

              <div className="text-xs text-slate-500 flex items-center justify-between pt-2">
                <span>Verified with SHA-256 integrity</span>
                <a
                  href={currentEndpointUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                >
                  Raw JSON payload <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Live Comparator & Calculator Table */}
        <section id="table" className="space-y-6 pt-6 border-t border-slate-800/80">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Landmark className="w-6 h-6 text-emerald-400" /> 61 Scheduled Banks Deposit Rate & Stability Explorer
              </h2>
              <p className="text-sm text-slate-400">
                Interactive calculator with financial stability star ratings and specific branded products.
              </p>
            </div>

            {/* Quick Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400">Principal:</span>
                <input
                  type="number"
                  step="50000"
                  max="100000000000"
                  value={depositAmount}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setDepositAmount(Math.min(100_000_000_000, Math.max(0, val)));
                  }}
                  className="bg-transparent border-b border-slate-700 focus:border-emerald-400 outline-none w-32 text-white font-mono tabular-nums"
                />
                <span className="text-slate-400">BDT</span>
              </div>

              <button
                onClick={() => setHasTin(!hasTin)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition ${
                  hasTin
                    ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                    : "bg-amber-950/40 border-amber-500/50 text-amber-300"
                }`}
              >
                NBR Tax: {hasTin ? "10% (With e-TIN)" : "15% (No TIN)"}
              </button>
            </div>
          </div>

          {/* Filters Bar & Smart Sorting */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search bank name, code, or product (e.g. UCB, Earn First, Astha)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Smart Ranking Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
              <span className="px-2 text-slate-500 text-[11px] font-mono">SORT:</span>
              <button
                onClick={() => setSortMode("risk_adjusted")}
                className={`px-2.5 py-1 rounded transition font-medium ${
                  sortMode === "risk_adjusted" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Risk-Adjusted (Safe High-Yield)
              </button>
              <button
                onClick={() => setSortMode("yield")}
                className={`px-2.5 py-1 rounded transition font-medium ${
                  sortMode === "yield" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Nominal Yield
              </button>
              <button
                onClick={() => setSortMode("rating")}
                className={`px-2.5 py-1 rounded transition font-medium ${
                  sortMode === "rating" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Stability ★ Rating
              </button>
            </div>

            {/* Tenure Selector */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
              {(["3_months", "6_months", "1_year", "3_years", "5_years"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTenure(t)}
                  className={`px-2.5 py-1 rounded transition font-medium ${
                    selectedTenure === t ? "bg-emerald-500 text-slate-950 font-semibold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tenureLabels[t]}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Categories (61 Banks)</option>
              <option value="CONVENTIONAL_PCB">Conventional Private Banks (33)</option>
              <option value="ISLAMIC">Full Islamic Shariah Banks (10)</option>
              <option value="FOREIGN">Foreign Commercial Banks (9)</option>
              <option value="STATE_OWNED">State-Owned Commercial Banks (6)</option>
              <option value="SPECIALIZED">Specialized Development Banks (3)</option>
            </select>
          </div>

          {/* Table Container */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 shadow-xl">
            {filteredBanks.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-slate-300 text-sm font-semibold">No Banks Match Your Criteria</p>
                <p className="text-slate-500 text-xs">
                  No institution found for query &ldquo;{searchQuery}&rdquo; in category {selectedCategory}.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("ALL");
                    setShariahOnly(undefined);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white transition font-mono"
                >
                  Clear Search & Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Bank Name & Stability Rating</th>
                      <th className="py-3 px-4">Credit Tier</th>
                      <th className="py-3 px-4 text-right">Yield ({tenureLabels[selectedTenure]})</th>
                      <th className="py-3 px-4 text-right">Est. Gross</th>
                      <th className="py-3 px-4 text-right">Net Return ({hasTin ? "10%" : "15%"} Tax)</th>
                      <th className="py-3 px-4 text-center">Branded Products</th>
                      <th className="py-3 px-4 text-center">Official SOC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredBanks.map((bank, index) => {
                      const rate = bank.fdr_rates[selectedTenure] || 0;
                      const calc = calculateFdrMaturity(depositAmount, rate, tenureMonths, hasTin);

                      // Rating color formatting
                      const scoreColor =
                        bank.rating_score >= 4.5
                          ? "text-emerald-400"
                          : bank.rating_score >= 3.5
                          ? "text-blue-400"
                          : bank.rating_score >= 2.5
                          ? "text-amber-400"
                          : "text-rose-400";

                      return (
                        <tr key={bank.bank_id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-mono text-slate-500">{index + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>{bank.bank_name}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                {bank.short_code}
                              </span>
                              {bank.is_shariah && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                                  Shariah
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] flex items-center gap-2 mt-1">
                              <span className={`font-mono font-bold flex items-center gap-0.5 ${scoreColor}`}>
                                <Star className="w-3 h-3 fill-current" />
                                {bank.rating_score.toFixed(1)} / 5.0
                              </span>
                              <span className="text-slate-500">•</span>
                              <span className="text-slate-400">{bank.risk_label}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 font-bold">
                              {bank.credit_rating}
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">
                              NPL: {bank.npl_category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-emerald-400 font-bold font-mono text-sm tabular-nums">
                              {rate.toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">
                            ৳{calc.grossInterest.toLocaleString("en-US")}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white tabular-nums">
                            <span className="text-emerald-400">৳{calc.netProfit.toLocaleString("en-US")}</span>
                            <span className="block text-[10px] text-slate-500 font-normal">
                              Total: ৳{calc.netMaturityValue.toLocaleString("en-US")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedBankForModal(bank)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono text-[11px] transition inline-flex items-center gap-1"
                            >
                              <Tag className="w-3 h-3" />
                              <span>{bank.products?.length || 0} Products</span>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {bank.soc_url ? (
                              <a
                                href={bank.soc_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 transition"
                              >
                                <span>Official SOC</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-600 text-[11px]">In circular</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Branded Products Modal */}
        {selectedBankForModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{selectedBankForModal.bank_name}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
                      {selectedBankForModal.credit_rating} (★ {selectedBankForModal.rating_score})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Rating: {selectedBankForModal.credit_rating} ({selectedBankForModal.rating_score}★) &bull; NPL Ratio: {selectedBankForModal.npl_ratio_pct ? `${selectedBankForModal.npl_ratio_pct}%` : selectedBankForModal.npl_category} &bull; CAR: {selectedBankForModal.capital_adequacy_ratio_car}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBankForModal(null)}
                  className="text-slate-400 hover:text-white text-sm font-mono px-2 py-1"
                >
                  ✕ Close
                </button>
              </div>

              <div className="space-y-3">
                {selectedBankForModal.products?.map((prod) => (
                  <div key={prod.product_id} className="border border-slate-800 rounded-xl p-4 bg-slate-950/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{prod.product_name}</span>
                      <span className="font-mono text-emerald-400 font-bold text-base">
                        {prod.headline_rate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">{prod.product_type}</span>
                      <span>Min: ৳{prod.minimum_amount.toLocaleString("en-US")}</span>
                      <span>•</span>
                      <span className="text-blue-400">{prod.target_segment.replace("_", " ")}</span>
                      {prod.instant_encashment && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">Instant Encashment</span>
                        </>
                      )}
                    </div>
                    <ul className="text-xs text-slate-400 list-disc list-inside space-y-1 pt-1">
                      {prod.features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Commercial Monetization & Developer Business Proposition */}
        <section id="licensing" className="border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/30 rounded-2xl p-6 sm:p-10 space-y-8">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-400 text-xs font-mono font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> Proprietary Commercial Licensing &amp; B2B Proposition
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Power Your FinTech or Corporate Treasury with the BDRIP-API™ Engine
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Eliminate manual deposit rate tracking. Integrate real-time, central bank supervised deposit yields, official Schedule of Charges (SOC), and regulatory CAMELS risk ratings directly into your mobile app, ERP, or algorithmic treasury desk.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sandbox Tier */}
            <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase">Evaluation Sandbox</span>
                <div className="text-2xl font-bold text-white font-mono">FREE</div>
                <p className="text-xs text-slate-400">For developers, hackathons, and architecture evaluations.</p>
                <ul className="text-xs text-slate-300 space-y-2 pt-3 font-mono">
                  <li className="flex items-center gap-2">✔ 60 requests / minute</li>
                  <li className="flex items-center gap-2">✔ All 61 Scheduled Banks</li>
                  <li className="flex items-center gap-2">✔ Standard JSON schemas</li>
                  <li className="flex items-center gap-2 text-slate-500">✖ Commercial redistribution</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setPrivateApiKey("bdrip_demo_eval_2026");
                  window.location.hash = "#playground";
                }}
                className="w-full py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-bold transition text-center"
              >
                Use Demo Key (bdrip_demo_eval_2026)
              </button>
            </div>

            {/* Growth FinTech Tier */}
            <div className="border border-emerald-500/50 bg-emerald-950/30 rounded-xl p-6 space-y-4 flex flex-col justify-between relative shadow-lg shadow-emerald-950/50">
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono text-[10px] font-extrabold uppercase">
                Most Popular
              </div>
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase">FinTech Partner</span>
                <div className="text-2xl font-bold text-white font-mono">৳18,000 <span className="text-xs text-slate-400 font-normal">/ month ($149)</span></div>
                <p className="text-xs text-slate-300">For personal finance apps, neobanks, and loan origination platforms.</p>
                <ul className="text-xs text-slate-200 space-y-2 pt-3 font-mono">
                  <li className="flex items-center gap-2">✔ 1,000 requests / minute</li>
                  <li className="flex items-center gap-2">✔ Granular Branded Schemes (DPS/FDR)</li>
                  <li className="flex items-center gap-2">✔ Commercial redistributive license</li>
                  <li className="flex items-center gap-2">✔ 99.9% Uptime SLA commitment</li>
                </ul>
              </div>
              <a
                href="mailto:fardinahsananik@gmail.com?subject=BDRIP-API%20FinTech%20Partner%20License%20Inquiry"
                className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold transition text-center block"
              >
                Acquire FinTech Partner License
              </a>
            </div>

            {/* Enterprise Tier */}
            <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">Enterprise Core &amp; Treasury</span>
                <div className="text-2xl font-bold text-white font-mono">৳60,000 <span className="text-xs text-slate-400 font-normal">/ month ($499)</span></div>
                <p className="text-xs text-slate-400">For commercial banks, financial conglomerates &amp; ERP treasuries.</p>
                <ul className="text-xs text-slate-300 space-y-2 pt-3 font-mono">
                  <li className="flex items-center gap-2">✔ 10,000 requests / minute</li>
                  <li className="flex items-center gap-2">✔ Real-time Circular Webhook alerts</li>
                  <li className="flex items-center gap-2">✔ Supervisory CAMELS risk datasets</li>
                  <li className="flex items-center gap-2">✔ Custom CBS ingestion connector</li>
                </ul>
              </div>
              <a
                href="mailto:fardinahsananik@gmail.com?subject=Enterprise%20Core%20Banking%20License%20Contract"
                className="w-full py-2.5 rounded-lg border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-mono font-bold transition text-center block"
              >
                Contact Architect for Enterprise SLA
              </a>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
            <div>
              Sole Proprietor &amp; Chief Architect: <strong className="text-white">Fardin Ahsan Anik</strong> &bull; <a href="mailto:fardinahsananik@gmail.com" className="text-emerald-400 hover:underline">fardinahsananik@gmail.com</a>
            </div>
            <div>
              Direct Licensing Portal: <a href="https://fardinanik.com" target="_blank" rel="noreferrer" className="text-slate-200 hover:text-white underline">fardinanik.com</a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4 text-center text-xs text-slate-500 space-y-2">
        <p>Open FinTech Infrastructure for Bangladesh • Maintained by <a href="https://fardinanik.com" className="text-slate-400 hover:text-white">Fardin Ahsan Anik</a></p>
        <p>Data sourced from official bank circulars and Bangladesh Bank benchmarks. Not financial advice.</p>
      </footer>
    </div>
  );
}
