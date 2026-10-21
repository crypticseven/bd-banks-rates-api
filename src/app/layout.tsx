import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bangladesh 61 Banks Deposit Rate & SOC Aggregator API",
  description: "High-performance public REST API & automated PyMuPDF crawler aggregating deposit interest rates (FDR/DPS) and Schedule of Charges across all 61 Scheduled Commercial Banks in Bangladesh.",
  keywords: [
    "Bangladesh Bank",
    "Scheduled Banks",
    "FDR Rates",
    "DPS Rates",
    "Interest Rates",
    "Schedule of Charges",
    "Fintech API",
    "Bangladesh",
  ],
  authors: [{ name: "Fardin Ahsan Anik", url: "https://fardinanik.com" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
        {children}
      </body>
    </html>
  );
}
