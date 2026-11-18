# Browser-first translation policy — YorpHives

## Cost and ownership

No translation server, model, cloud GPU, Google Cloud Translation API, external
translation API, paid plugin, or subscription is needed or deployed.

The canonical public site remains English. Browser-native **Translate page**
handles new products, revised descriptions and new page content without requiring
the website to generate seven versions or delay a founder-approved launch.

- Google Chrome: visitors may use the Translate icon in the address bar or the
  browser's Translate page menu. This is a feature of the visitor's browser;
  the website cannot force Chrome's native Translate interface to open.
- Firefox: visitors may use the browser's built-in Translate page command;
  its coverage and availability vary by browser version and language.
- Browsers with a supported `Translator` JavaScript API may additionally
  translate public text on device when the visitor explicitly clicks the
  optional website translation button. API availability is checked at runtime.

Existing curated labels and page translations may remain as a progressive
enhancement, but **do not represent complete localization**. We make no claim
that a website can automatically access Google's page translator through a
JavaScript API, and we never use unofficial Google Translate endpoints.

## Future products and features

The browser can translate newly added public product descriptions and static
page copy as long as the page remains accessible with ordinary HTML text.
The site keeps standard `lang=en` source content for browser detection, and
the existing shared language control explains how to use free browser features.

New products still require the existing founder/evidence approval, security
and product publication checks. They **do not need seven hand-translated names
and descriptions** just to become visible.

A machine-readable `i18n-coverage.json` report and optional curated
`localizations` fields remain available for future quality work, but neither
blocks new catalog entries. No recurring AI translation process is configured.

## Privacy

The website itself sends no tool inputs, files or results to a translation API.
Browser-provided page translation has provider-specific privacy behavior:
Chrome's translation may involve Google's infrastructure; Firefox advertises
on-device translation. Users decide whether to invoke their browser's feature.
