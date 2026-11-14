# YorpHives free tools

The collection is a set of dependency-free static pages. Processing happens in the visitor's browser without paid APIs or a hosted execution backend. Hosting and bandwidth still require infrastructure.

## Catalog and discovery

`catalog.json` at the site root is the source for Home, Free Tools search and category filters, and agent discovery. Add an item with a name, description, category, type (`tool`, `app`, or `product`), ISO date, and relative or HTTPS URL. Home displays the three newest entries; Free Tools and Explore display their respective types.

`tools/index.html` contains ordinary links to every tool for navigation and discovery. Update it when adding pages. Each tool has a separate HTML page and Schema.org `WebApplication` metadata. Crawling and ranking are not guaranteed, and a final-domain sitemap should be generated once production hosting is confirmed.

## Agent use

The catalog identifies each locally executable module and its named inputs. A few examples:

```js
import { formatJson, buildCampaignUrl } from './tools/toolkit.mjs';
import { runUtility } from './tools/utility-core.mjs';

const formatted = formatJson('{"count":900719925474099312345}', 2);
const campaign = buildCampaignUrl('https://example.com/page', {source: 'newsletter', medium: 'email'});
const slug = await runUtility('slug-generator', {text: 'A useful idea'});
// slug.text is "a-useful-idea"
```

`runUtility` returns `{text, preview}` and throws an error for invalid inputs. Its supported `toolId` and named string fields are documented on each entry in `catalog.json`. Send checkbox value `"on"` when selected and omit it when not. Random generation and SHA hashing require a modern secure environment with Web Crypto. The image tool additionally requires browser Canvas APIs. Fetch or copy modules to execute locally; there is no hosted HTTP execution endpoint or MCP server.

## Checks

From the website root, run `node --test tests/*.test.mjs` with a recent Node.js installation. The tests cover catalog integrity, each utility, and representative boundary cases. Verify page interactions in a browser after changes.
