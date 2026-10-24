import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BDRIP-API™ — Official UAT Interactive API Reference</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.11.0/favicon-32x32.png" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin: 0;
      background: #0b0f17;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .custom-header {
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      padding: 18px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .custom-header h1 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: -0.02em;
    }
    .badge {
      background: #0284c7;
      color: white;
      font-size: 0.72rem;
      padding: 4px 10px;
      border-radius: 9999px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .swagger-ui {
      background: #ffffff;
      border-radius: 8px;
      margin: 24px auto;
      max-width: 1400px;
      padding: 24px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .swagger-ui .topbar { display: none; }
    .uat-instructions {
      max-width: 1400px;
      margin: 24px auto;
      padding: 16px 24px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      font-size: 0.88rem;
      line-height: 1.5;
    }
    .uat-instructions code {
      background: #0f172a;
      color: #38bdf8;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="custom-header">
    <div>
      <h1>🏛️ Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™)</h1>
      <span style="font-size: 0.8rem; color: #94a3b8;">UAT Interactive Test Console & Specification</span>
    </div>
    <div style="display: flex; gap: 10px; align-items: center;">
      <span class="badge">UAT Ready v1.0</span>
      <span style="font-size: 0.8rem; color: #64748b;">Proprietary & Confidential</span>
    </div>
  </div>

  <div class="uat-instructions">
    <strong style="color: #38bdf8;">🔑 UAT Credential Handshake:</strong> To test endpoints directly in this console, click the green <strong>"Authorize"</strong> button below, enter <code>bdrip_demo_eval_2026</code> in the <code>ApiKeyAuth</code> field, and click <em>Authorize</em>. All requests will automatically execute with valid enterprise credentials and live rate-limiting telemetry.
  </div>

  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: "list",
      });
      window.ui = ui;
    };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
