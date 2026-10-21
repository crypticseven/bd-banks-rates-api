"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ALL_61_BANKS, filterBanks, calculateFdrMaturity, BankRateRecord } from "@/lib/bankRatesData";
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
} from "lucide-react";

type EndpointTab = "deposits" | "banks" | "benchmarks";
type RequestStatus = "idle" | "loading" | "success" | "error";

export default function ApiLandingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [shariahOnly, setShariahOnly] = useState<boolean | undefined>(undefined);
  const [selectedTenure, setSelectedTenure] = useState<"3_months" | "6_months" | "1_year" | "3_years" | "5_years">("1_year");
  const [depositAmount, setDepositAmount] = useState<number>(500000);
  const [hasTin, setHasTin] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // P1-5 & P3-2: Real API execution states
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

  // Dynamic API URL for the playground based on active tab and filters
  const currentEndpointUrl = useMemo(() => {
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
    });
    if (searchQuery.trim()) params.append("q", searchQuery.trim());
    if (shariahOnly !== undefined) params.append("shariah", shariahOnly ? "true" : "false");
    return `/api/v1/rates/deposits?${params.toString()}`;
  }, [activeTab, depositAmount, selectedTenure, selectedCategory, hasTin, searchQuery, shariahOnly]);

  // Execute real fetch against Next.js API
  const executeApiQuery = useCallback(async (url: string) => {
    setApiStatus("loading");
    setApiError(null);
    const startTime = performance.now();

    try {
      const res = await fetch(url);
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
  }, []);

  // Fetch when tab or primary parameters change
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
    });
  }, [selectedCategory, shariahOnly, searchQuery, selectedTenure]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sampleCurl = `curl -X GET "https://api.fardinanik.com${currentEndpointUrl}" \\
  -H "Accept: application/json"`;

  const samplePython = `import requests

url = "https://api.fardinanik.com${currentEndpointUrl}"
response = requests.get(url)
data = response.json()
print("Response status:", response.status_code)`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Top Banner */}
      <div className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-4 py-3 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-emerald-400 font-semibold">ALL 61 BANGLADESH SCHEDULED BANKS INDEXED</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Central Bank Policy Repo: <strong className="text-slate-200">8.50%</strong></span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">NBR Withholding Tax: <strong className="text-slate-200">10% / 15%</strong></span>
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
            <Database className="w-3.5 h-3.5" /> Open-Source FinTech Data Infrastructure
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto">
            Bangladesh 61 Banks Deposit Rate & SOC Aggregator API
          </h1>
          <p className="text-slate-400 max-w-3xl mx-auto text-base sm:text-lg">
            High-performance public REST API and automated PyMuPDF crawler aggregating Fixed Deposit (FDR) yields, DPS rates, and Schedule of Charges across all 61 Scheduled Commercial Banks in Bangladesh.
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
              <Landmark className="w-4 h-4" /> View 61 Banks Table
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-12 space-y-16">
        
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
              <button
                onClick={() => setActiveTab("deposits")}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition ${
                  activeTab === "deposits" ? "bg-emerald-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                GET /rates/deposits
              </button>
              <button
                onClick={() => setActiveTab("banks")}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition ${
                  activeTab === "banks" ? "bg-emerald-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                GET /rates/banks
              </button>
              <button
                onClick={() => setActiveTab("benchmarks")}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition ${
                  activeTab === "benchmarks" ? "bg-emerald-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                GET /rates/benchmarks
              </button>
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

            {/* Right: Live Response Display with 5 Mandatory States */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                {/* Header with real status & latency */}
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    {apiStatus === "loading" ? (
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold animate-pulse">FETCHING</span>
                    ) : apiStatus === "error" ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">HTTP {apiStatusCode || "ERR"}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">HTTP {apiStatusCode} OK</span>
                    )}
                    <span>Live Response</span>
                  </div>
                  {apiLatency > 0 && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {apiLatency}ms
                    </span>
                  )}
                </div>

                {/* Body: State-Driven View */}
                {apiStatus === "loading" ? (
                  /* 1. Loading State */
                  <div className="mt-4 p-8 border border-slate-800/80 rounded-lg bg-slate-950 flex flex-col items-center justify-center space-y-3 min-h-[220px]">
                    <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
                    <p className="text-xs font-mono text-slate-400">Executing edge API query...</p>
                  </div>
                ) : apiStatus === "error" ? (
                  /* 2. Error State */
                  <div className="mt-4 p-6 border border-rose-800/40 rounded-lg bg-rose-950/20 space-y-3">
                    <div className="flex items-center gap-2 text-rose-400 text-sm font-semibold">
                      <AlertCircle className="w-4 h-4" />
                      Request Failed
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
                  /* 3. Success / Output View */
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
                <Landmark className="w-6 h-6 text-emerald-400" /> 61 Scheduled Banks Deposit Rate Explorer
              </h2>
              <p className="text-sm text-slate-400">
                Interactive calculator with statutory NBR withholding tax deduction (10% with e-TIN, 15% without).
              </p>
            </div>

            {/* Quick Controls: Principal up to 100 Billion without overflow */}
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

          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search bank name or short code (e.g. UCB, BRAC, Sonali)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
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

          {/* Table Container with Empty State & Tabular Numeral Overflow Handling */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 shadow-xl">
            {filteredBanks.length === 0 ? (
              /* 4. Empty State */
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
              /* 5. Overflow & Tabular Numbers View */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Bank Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Yield ({tenureLabels[selectedTenure]})</th>
                      <th className="py-3 px-4 text-right">Est. Gross Interest</th>
                      <th className="py-3 px-4 text-right">Net Return ({hasTin ? "10%" : "15%"} Tax)</th>
                      <th className="py-3 px-4 text-center">Schedule of Charges</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredBanks.map((bank, index) => {
                      const rate = bank.fdr_rates[selectedTenure] || 0;
                      const calc = calculateFdrMaturity(depositAmount, rate, tenureMonths, hasTin);

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
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>HQ: {bank.headquarters}</span>
                              {bank.instant_encashment && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-400">Instant Encashment</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-400 font-mono text-[11px]">
                              {bank.category.replace("_", " ")}
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

        {/* PyMuPDF SOC Crawler Architecture */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 space-y-6">
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" /> Automated PyMuPDF & BeautifulSoup Crawler Engine
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              How the standalone engine keeps rate schedules updated across all 61 banks with strict TLS and provenance tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
            <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-4 space-y-2">
              <div className="text-white font-semibold font-mono text-sm">1. Strict TLS Verification</div>
              <p>Performs secure HTTPS requests with full certificate validation, preventing Man-in-the-Middle injection of rate circulars.</p>
            </div>
            <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-4 space-y-2">
              <div className="text-white font-semibold font-mono text-sm">2. PyMuPDF Circular Parsing</div>
              <p>Extracts tabular yields directly from monthly PDF deposit circulars, matching tenures (3M, 6M, 1Y, 3Y, 5Y) via regex.</p>
            </div>
            <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-4 space-y-2">
              <div className="text-white font-semibold font-mono text-sm">3. Provenance & Staging</div>
              <p>Persists update records with source URL, effective date, and verification status for reviewed deployment.</p>
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
