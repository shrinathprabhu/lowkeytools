// OwlEye Analytics (https://owleye.dev/docs/cdn/). The Tracking ID is public by design.
// The three bundles are byte-identical copies of the published npm package, served
// from this origin at a versioned path; only events go to api.owleye.dev. To upgrade,
// copy the new dist/*.iife.js files into vendor/, then bump the version and hashes.
export const owleye = {
  id: 'owl_8c15546f2cec4e5696abadc5a3486e6c',
  version: '1.0.0',
  // SHA-384 values from the package's dist/integrity.json; tests check the copies.
  bundles: {
    analytics: 'sha384-yh2XGmroqBfL3J0i9kDWcXtevXuEOAI9tI90N/5gXz/BVPPg3u0EmkT7i+ladfPa',
    rules: 'sha384-ev83Mp97gcgthqXoG7wEArFxB78HQLwSuAwWQIW9oLErfqtJq85/vY65pn0sKtlZ',
    performance: 'sha384-bdNroYAjmhDNfC8ubKwJo/oKlALS2yt2Wrhxs44dJKMrdZCpTmR7A3Q3AtcBpNTX',
  },
};

export const bundlePath = name => `/vendor/owleye-analytics-${owleye.version}/owleye.${name}.iife.js`;

// Page views, console rules, then Web Vitals. Deferred and in this order so the
// globals exist before theme.js, main.js and inline modules run. Each bundle
// reads its own attributes; UTM capture is limited to source, medium and campaign.
export const analyticsScripts = Object.keys(owleye.bundles)
  .map(name => `<script defer src="${bundlePath(name)}" data-owleye-id="${owleye.id}" data-owleye-capture-campaigns="true"></script>`)
  .join('\n  ');

// Local previews log payloads to the console instead of sending production events.
export const mockAnalytics = html => html.replaceAll('data-owleye-id=', 'data-owleye-mock="true" data-owleye-debug="true" data-owleye-id=');
