import {supported} from './advanced.mjs';
import {catalog} from './country.mjs';
import {spec} from './openapi.mjs';
import manifest from './manifest.mjs';
export function capabilities(){
 return {name:'TaxPulse Global',publisher:'HQventures',environment:'preview',taxRulesVerified:false,coreModules:catalog().modules,advancedModules:supported,interfaces:['REST','OpenAPI'],mcpEnabled:false,paymentsEnabled:false,privateRecordsEnabled:false,attestationEnabled:false,aiInferenceEnabled:false};
}
export function regulatoryStatus(){return {mode:'review_only',manifest,monitoringConfigured:true,liveReportAvailable:false,automaticRuleChanges:false};}
export function discovery(){return {name:'TaxPulse Global',description:'Fictional financial scenario calculations only. No verified statutory advice.',openapi:'/openapi.json',catalog:'/v1/catalog',capabilities:'/v1/capabilities',regulatoryStatus:'/v1/regulatory/status',authentication:'none_for_preview',productionReady:false};}
export function llms(){return '# TaxPulse Global — preview\n\nFictional inputs only. Tax rules are not verified. Do not submit personal financial records.\n\n- [OpenAPI](/openapi.json)\n- [Catalog](/v1/catalog)\n- [Capabilities](/v1/capabilities)\n- [Regulatory status](/v1/regulatory/status)\n';}
