// Shared, privacy-preserving matching for the homepage and full directory.
export function normalizeSearch(value){
 return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en').replace(/[^a-z0-9]+/g,' ').trim();
}

export function matchesTool(query,{name='',description='',category=''}={}){
 const terms=normalizeSearch(query).split(' ').filter(Boolean);
 if(!terms.length)return true;
 const searchable=normalizeSearch([name,description,category].join(' '));
 return terms.every(term=>searchable.includes(term));
}
