# YorpHives free tools

These are dependency-free static pages. JSON formatting, campaign URL creation, and image processing happen in the visitor's browser. No execution service or paid API is required.

## Catalog and discoverability

The shared source of truth is `catalog.json` at the site root. Add an item there with `name`, `description`, `type` (`tool`, `app`, or `product`), an ISO `date` (`YYYY-MM-DD`), and a relative or HTTPS `url`. Home displays the newest three entries; tools appear in Free Tools and apps/products in Explore. The same JSON is available to agents. Update the visible footer links when adding important pages that should be directly discoverable in the initial HTML.

Each tool has its own HTML page, description, and Schema.org `WebApplication` metadata. `robots.txt` permits crawling; this does not override site authentication or guarantee indexing. A sitemap with final public URLs can be added when the production host is confirmed.

## Agent use

The JSON formatter and URL builder are also available as local JavaScript functions in `tools/toolkit.mjs`. Fetch or copy this module and run it in a JavaScript environment. It does not call a server.

```js
import { formatJson, buildCampaignUrl } from './tools/toolkit.mjs';

const formatted = formatJson('{"count":900719925474099312345}', 2);
const minified = formatJson(formatted, 0);
const url = buildCampaignUrl('https://example.com/page', {
  source: 'newsletter',
  medium: 'email',
  campaign: 'launch'
});
```

`formatJson` accepts indentation `0`, `2`, or `4`, and throws on invalid JSON. The output retains the original number and string representations. `buildCampaignUrl` accepts complete HTTP(S) URLs and the optional keys `source`, `medium`, `campaign`, `term`, and `content`. Filled values replace matching UTM fields while other query parameters and the fragment remain.

The image tool uses browser canvas APIs and has no server endpoint. There is currently no hosted API or MCP server for invoking these tools remotely.

## Checks

From the website root, run `node --test tests/toolkit.test.mjs` with a recent Node.js installation. The tool interfaces should also be checked in a browser after visual or interaction changes.
