# YorpHives free tools

The collection is a set of static pages. Processing happens in the visitor's browser without paid APIs or a hosted execution backend. Permissively licensed libraries for QR codes, Markdown, PDF, ZIP, and PowerPoint are bundled locally; their license notices are in `tools/vendor/`. Hosting and bandwidth still require infrastructure.

## Catalog and discovery

`catalog.json` at the site root is the source for Home, Free Tools search and category filters, and agent discovery. Add an item with a name, description, category, type (`tool`, `app`, or `product`), ISO date, and relative or HTTPS URL. Home displays the three newest entries; Free Tools and Explore display their respective types.

`tools/index.html` contains ordinary links to every tool for navigation and discovery. Update it when adding pages. Each tool has a separate HTML page and Schema.org `WebApplication` metadata. Crawling and ranking are not guaranteed, and a final-domain sitemap should be generated once production hosting is confirmed.

## Agent use

The catalog identifies each locally executable module and its named inputs. A few examples:

```js
import { formatJson, buildCampaignUrl } from './tools/toolkit.mjs';
import { runUtility } from './tools/utility-core.mjs';
import { runEverydayTool } from './tools/everyday-core.mjs';

const formatted = formatJson('{"count":900719925474099312345}', 2);
const campaign = buildCampaignUrl('https://example.com/page', {source: 'newsletter', medium: 'email'});
const slug = await runUtility('slug-generator', {text: 'A useful idea'});
const base = await runEverydayTool('number-base-converter', {value:'255', from:'10', to:'16'});
// slug.text is "a-useful-idea"
// base.text is "FF"
```

`runUtility` returns `{text, preview}` and throws an error for invalid inputs. Its supported `toolId` and named string fields are documented on each entry in `catalog.json`. Send checkbox value `"on"` when selected and omit it when not. Random generation and SHA hashing require a modern secure environment with Web Crypto. The image tool additionally requires browser Canvas APIs. Fetch or copy modules to execute locally; there is no hosted HTTP execution endpoint or MCP server.

The newer utilities can also be called through `runEverydayTool(toolId, inputs)` in `tools/everyday-core.mjs`. QR and Markdown functions load their locally bundled libraries only when needed; the regex tester also requires its worker modules. Markdown output is HTML source and is not sanitized. For maintainers, run `node scripts/generate-extra-tools.mjs` from the project source root after editing `scripts/extra-tool-specs.mjs` to regenerate the additional pages, catalog entries, and directory.

File tools use `processFileTool(toolId, files, options)` from `tools/file-core.mjs` and accept local `File` objects. Image and PowerPoint generation needs browser Canvas APIs; reading XLSX and PPTX needs browser XML and streaming decompression support. Office extraction is limited to cell values and slide text, and PDF edits may not preserve interactive features. After editing `scripts/file-tool-specs.mjs`, run `node scripts/generate-file-tools.mjs` to regenerate file tool pages and catalog entries.

## Checks

From the website root, run `node --test tests/*.test.mjs` with a recent Node.js installation. The tests cover catalog integrity, each utility, and representative boundary cases. Verify page interactions in a browser after changes.
