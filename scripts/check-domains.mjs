// Read-only deployment smoke check. DNS is provisioned separately from Wrangler routes.
const cases = [
  { url: 'https://lowkey.tools/', status: 200 },
  { url: 'https://www.lowkey.tools/check-redirect?source=domain-check', status: 308, location: 'https://lowkey.tools/check-redirect?source=domain-check' },
  { url: 'https://fuse.lowkey.tools/', status: 404, game: true },
  { url: `https://missing-${Date.now()}.lowkey.tools/nested/page?source=domain-check`, status: 404, game: true },
];
let failed = false;
for (const check of cases) {
  try {
    const response = await fetch(check.url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    if (response.status !== check.status) throw new Error(`Expected HTTP ${check.status}, received ${response.status}`);
    if (check.location && response.headers.get('location') !== check.location) throw new Error('Permanent redirect did not preserve path and query');
    if (check.game) {
      const html = await response.text();
      if (!html.includes('class="math-game"') || !html.includes('<base href="https://lowkey.tools/">')) throw new Error('404 response is missing the game or canonical recovery links; deploy the latest Worker');
      if (response.headers.has('location')) throw new Error('Unknown subdomains must return 404 without redirecting');
    }
    console.log(`PASS ${check.url} (${response.status})`);
  } catch (error) {
    failed = true;
    const dnsFailure = ['ENOTFOUND', 'EAI_AGAIN'].includes(error.cause?.code);
    console.error(`FAIL ${check.url}: ${dnsFailure ? 'DNS did not resolve. In Cloudflare DNS, add proxied AAAA * → 100:: with TTL Auto; keep explicit tool records.' : error.message}`);
  }
}
if (failed) process.exitCode = 1;
