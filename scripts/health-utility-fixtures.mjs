// Synthetic, non-sensitive inputs shared by local and browser QA.
const jwt=Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:'qa',exp:4102444800})).toString('base64url')+'.c2ln';
const special={
 'json-to-csv':{text:'[{"name":"Ada","score":20}]'},
 'csv-to-json':{text:'name,score\nAda,20'},
 'csv-to-markdown':{text:'name,score\nAda,20'},
 'csv-to-html-table':{text:'name,score\nAda,20'},
 'csv-column-extractor':{text:'name,score\nAda,20',header:'score'},
 'jwt-decoder':{text:jwt},
 'json-pointer':{text:'{"user":{"name":"Ada"}}',pointer:'/user/name'},
 'json-merge-patch':{target:'{"a":1}',patch:'{"b":2}'},
 'json-lines-converter':{text:'{"name":"Ada"}\n{"name":"Bob"}'},
 'json-key-sorter':{text:'{"z":1,"a":2}'},
 'number-base-converter':{value:'255',from:'10',to:'16'},
 'regex-tester':{pattern:'\\b\\w+\\b',flags:'g',text:'Alpha beta'},
 'url-tracking-remover':{url:'https://example.com/?utm_source=test&keep=1'},
 'query-string-builder':{url:'https://example.com/',params:'ref=one'},
 'mailto-link-generator':{email:'hello@example.com',subject:'Hello',body:'Test'},
 'meta-tag-generator':{title:'Example Article Title',description:'A sample page for validation.',url:'https://example.com/',image:'https://example.com/image.png'},
 'robots-txt-generator':{paths:'/private/',sitemap:'https://example.com/sitemap.xml'},
 'xml-sitemap-generator':{urls:'https://example.com/\nhttps://example.com/about/'},
 'business-days-calculator':{start:'2026-01-01',end:'2026-01-31',holidays:''},
 'date-calculator':{date:'2026-01-01',days:'30'},
 'password-generator':{lower:'on',upper:'on',numbers:'on',symbols:'on'},
 'average-calculator':{text:'10\n20\n30'},
 'word-frequency-counter':{text:'red red blue'},
 'text-diff':{original:'red',revised:'blue'},
 'text-find-replace':{text:'hello world',find:'world',replace:'earth'},
 'time-duration':{start:'09:00',end:'17:30'},
 'unicode-inspector':{text:'A☃'},
 'qr-code-generator':{text:'https://example.com/'},
 'ipv4-subnet-calculator':{address:'192.168.1.10',prefix:'24'},
 'list-to-delimited':{text:'alpha\nbeta',mode:'join',delimiter:','},
 'color-converter':{color:'#37b69c'},
 'contrast-checker':{foreground:'#123329',background:'#ffffff'},
 'color-palette':{color:'#37b69c'},
 'text-to-hex':{text:'hello',mode:'encode'},
 'reverse-text':{text:'Hello World'},
 'html-entities':{text:'<b>hello</b>',mode:'encode'},
 'markdown-to-html':{text:'# Hello\n\n**World**'},
 'uuid-generator':{count:'2'}
};
export function utilityFixture(item){
 const input={};
 for(const field of item.module.inputs||[]){
  let value=field.default;
  if(value===undefined||(value===''&&['textarea','text'].includes(field.type))){
   if(field.type==='textarea')value='Alpha beta gamma';
   else if(field.type==='number')value='10';
   else if(field.type==='select')value=field.options?.[0]??'';
   else if(field.type==='date')value='2026-01-01';
   else if(field.type==='time')value='09:00';
   else if(field.type==='url')value='https://example.com/';
   else if(field.type==='checkbox')value='on';
   else if(field.name==='url')value='https://example.com/';
   else if(field.name==='email')value='hello@example.com';
   else if(field.name==='color')value='#37b69c';
   else value='hello';
  }
  if(field.type==='checkbox'&&!['password-generator'].includes(item.module.toolId))continue;
  input[field.name]=String(value);
 }
 return {...input,...(special[item.module.toolId]||{})};
}
