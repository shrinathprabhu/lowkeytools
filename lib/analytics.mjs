// OwlEye Analytics (https://owleye.dev/docs/cdn/). The Tracking ID is public by design.
// The full bundle combines page analytics, console rules and Web Vitals in one
// self-hosted script; only events and rule requests go to api.owleye.dev. To upgrade,
// copy the new dist/owleye.full.iife.js into vendor/, then bump the version and hash.
export const owleye = {
  id: 'owl_3a017a72375242f78410d98f5a457036',
  version: '1.0.1',
  // SHA-384 from the package's dist/integrity.json; tests check the copy.
  bundles: {
    full: 'sha384-qgjONMbrMGXZiAavsP/0nkbacPlvfLl9qVQKTDkIh9Xz5aE9eKahwDeevt5b/Q2i',
  },
};

export const bundlePath = name => `/vendor/owleye-analytics-${owleye.version}/owleye.${name}.iife.js`;

// Deferred, so the globals exist before theme.js, main.js and inline modules run.
// The attributes apply to all three modules. UTM capture is limited to source,
// medium and campaign. GPC suppression is a browser-side SDK check that is switched
// off here; the API does not filter on it. The SDK no longer reads Do Not Track.
export const analyticsAttributes = `data-owleye-id="${owleye.id}" data-owleye-capture-campaigns="true" data-owleye-respect-global-privacy-control="false"`;
export const analyticsScripts = Object.keys(owleye.bundles)
  .map(name => `<script defer src="${bundlePath(name)}" ${analyticsAttributes}></script>`)
  .join('\n  ');

// Local previews log payloads to the console instead of sending production events.
export const mockAnalytics = html => html.replaceAll('data-owleye-id=', 'data-owleye-mock="true" data-owleye-debug="true" data-owleye-id=');
