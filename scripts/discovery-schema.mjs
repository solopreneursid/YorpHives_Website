// Reusable, provider-neutral entity metadata for every public offering.
const appCategory=category=>{
 const c=String(category||'').toLowerCase();
 if(/developer|code|programming/.test(c))return 'DeveloperApplication';
 if(/design|image|color/.test(c))return 'DesignApplication';
 if(/business|marketing|finance|calculator/.test(c))return 'BusinessApplication';
 if(/security|password/.test(c))return 'SecurityApplication';
 if(/video|audio|media|presentation/.test(c))return 'MultimediaApplication';
 return 'UtilitiesApplication';
};
export function createEntity(item,url){
 const entity={'@id':url+'#main-entity','@type':item.type==='product'?'Product':
  item.type==='service'?'Service':item.type==='tool'||item.type==='app'?
  (item.type==='tool'||item.execution==='browser-local'||item.platform==='web'?'WebApplication':'SoftwareApplication'):'Thing',
  name:item.name,description:item.description,url};
 if(['tool','app'].includes(item.type)){
  entity.applicationCategory=appCategory(item.category);
  if(item.execution==='browser-local')entity.operatingSystem='Any modern web browser';
  else if(typeof item.operatingSystem==='string'&&item.operatingSystem.trim())
   entity.operatingSystem=item.operatingSystem;
  if(item.type==='tool'||item.isFree===true){
   entity.isAccessibleForFree=true;
   entity.offers={'@type':'Offer',price:'0',priceCurrency:'USD'};
  }
 }
 if(typeof item.price==='number'&&Number.isFinite(item.price)&&item.price>=0&&
    /^[A-Z]{3}$/.test(item.currency||'')){
  entity.offers={'@type':'Offer',price:String(item.price),priceCurrency:item.currency};
 }
 return entity;
}
