// Build overwrites this safe empty source default with reviewed public catalog copy.
export const CATALOG_COPY=Object.freeze({});
export const getCatalogCopy=(english,lang)=>CATALOG_COPY[english]?.[lang]||null;
