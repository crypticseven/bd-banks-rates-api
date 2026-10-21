# Security Review

Audit scope: repository source, configuration, workflow, dependency manifests, crawler, API routes, and client application.

## Findings

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | `requirements.txt`, `.github/workflows/daily-crawler.yml` | 1-3, 22-28 | Unpinned Python dependencies are installed and executed by a scheduled GitHub Actions job, allowing future compromised releases to run in CI. | 9/10 |
| 2 | 🟡 MEDIUM | `src/app/api/v1/rates/sync/route.ts` | 72-76 | Administrative endpoint falls back to a hardcoded bearer token when `RATES_SYNC_SECRET` is absent. | 10/10 |
| 3 | 🟡 MEDIUM | `scripts/soc_crawler.py` | 97-102 | TLS certificate and hostname verification are disabled for all crawler requests, permitting forged bank responses and data poisoning. | 9/10 |

## Detailed Findings

### 1. Unpinned CI dependencies

`requirements.txt` uses lower bounds rather than immutable versions, while the scheduled workflow installs those packages directly with `pip install -r requirements.txt`. A malicious or compromised future package release can execute in the GitHub-hosted runner.

Recommended remediation:

```text
pymupdf==1.24.14
beautifulsoup4==4.12.3
requests==2.32.3
```

Prefer a reviewed lock or constraints file with hashes and install with `--require-hashes`. Pin workflow actions to trusted commit SHAs and add:

```yaml
permissions:
  contents: read
```

### 2. Hardcoded administrative fallback secret

The sync route accepts a source-controlled token whenever `RATES_SYNC_SECRET` is not configured:

```ts
const expectedSecret = process.env.RATES_SYNC_SECRET || "fardinanik_internal_rates_sync_secret_2026";
```

Remove the fallback and fail closed:

```ts
const expectedSecret = process.env.RATES_SYNC_SECRET;

if (!expectedSecret) {
  return NextResponse.json(
    { status: "error", message: "Sync service is not configured." },
    { status: 503 }
  );
}
```

The secret should be provisioned outside source control and compared using a constant-time comparison. The endpoint currently acknowledges updates without persisting them, but this remains an authentication bypass if persistence is added later.

### 3. Disabled TLS verification in the crawler

The crawler disables both certificate and hostname verification:

```python
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
```

Use the default verified context:

```python
ctx = ssl.create_default_context()
```

If a particular bank endpoint has a certificate problem, repair that endpoint or use a narrowly scoped, documented trust exception rather than disabling verification globally.

## Negative Checks

- No `dangerouslySetInnerHTML`, `eval`, raw HTML injection, `localStorage`, or `sessionStorage` usage was found.
- No browser extension or Chrome MV3 manifest is present.
- No additional private keys, API tokens, database credentials, or webhook secrets were found.
- No high-confidence SQL, shell, SSRF, path traversal, open redirect, or unsafe deserialization issue was identified.
