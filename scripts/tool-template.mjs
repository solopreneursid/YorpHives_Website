// The word counter is the source template for generated tool pages. Replace
// its tool-specific help before adapting it to a different processor.
export function genericToolTemplate(html,{file=false}={}){
 const how=/<section class="tool-help-card"><h2>How to use this tool<\/h2>[\s\S]*?<\/section>/;
 if(!how.test(html))throw Error('Tool template is missing its usage instructions.');
 const first=file?'Choose the file or files you want to work with.':
  'Enter the details or content requested by this tool.';
 const result=file?'Download the result when it is ready.':'Copy the result if you need it elsewhere.';
 return html.replace(how,'<section class="tool-help-card"><h2>How to use this tool</h2><ol>'+ 
   '<li>'+first+'</li><li>Choose the main action to create your result.</li>'+ 
   '<li>'+result+'</li></ol></section>')
  .replace(/<section class="tool-help-card"><h2>When is this useful\?<\/h2>[\s\S]*?<\/section>/,'');
}
