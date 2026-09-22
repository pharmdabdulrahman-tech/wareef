import { useSyncExternalStore } from "react";
import { availability, defaultSchedule, ProviderSchedule } from "./_scheduling";

export type ServiceKey = "maintenance"|"trim"|"plant"|"soil"|"party"|"custom"|"farm";
export type RequestStatus = "pending"|"quoted"|"booked"|"ongoing"|"work_completed"|"completed"|"declined"|"cancelled";
export type RequestActor = "customer"|"provider"|"admin";
export type MaintenanceTask = "cleaning"|"weeding"|"mowing"|"shrubs"|"trees"|"stumps";
export type MaintenanceDetails = { tasks:MaintenanceTask[]; area:string; shrubs:string; trees:string; stumps:string; treeDetails:string; note:string; photos:string[] };
export type DemoAttachment = { original?: string; concept?: string; plants?: string[]; details?: string; maintenance?:MaintenanceDetails };
export type BookingMessage={id:string;sender:"customer"|"provider";body:string;at:number};
export type AuditEntry={id:string;at:number;actor:"admin";action:"application-review"|"provider-suspended"|"provider-reapproved";target:string;detail:string};
export type ScopeSnapshot = { key:ServiceKey; ar:string; en:string; price:number|null };
export type TimeProposal = { id:string; proposedTime:string; proposedBy:"customer"|"provider"; status:"pending"|"accepted"|"rejected"; createdAt:number; respondedAt?:number; respondedBy?:RequestActor };
export type RequestEvent = { type:"status"|"cancel"|"decline"|"time_change"|"time_proposal"|"proposal_accepted"|"proposal_rejected"|"admin_no_response_demo"; actor:RequestActor; at:number; reason?:string };
export type DemoRequest = {
 id:string; providerId:string; title:string; services:ServiceKey[]; subtotal:number; agreedTotal?:number; quoteAmount?:number; durationMinutes?:number;
 scopeSnapshot?:ScopeSnapshot[]; preferredTime?:string; quoteOnly:boolean; status:RequestStatus; kind:"service"|"farm"|"design";
 createdAt:number; updatedAt:number; note?:string; attachment?:DemoAttachment; rating?:number; issueText?:string; seeded?:boolean;
 timeProposal?:TimeProposal; events?:RequestEvent[]; cancellation?:{ actor:"customer"|"provider"; reason?:string; at:number; paymentCollected:false };
 decline?:{ reason?:string; at:number }; adminNoResponseDemo?:{ simulatedAt:number; alternativesOffered:true };
  customerId?:string; neighborhood?:string; exactAddress?:string; messages?:BookingMessage[];
};
export type Offering = { enabled:boolean; approved:boolean; price:number|null; unit:string };
export type ProviderApprovalStatus = "approved"|"suspended";
export type DemoProvider = { id:string; ar:string; en:string; offerings:Partial<Record<ServiceKey,Offering>>; approvalStatus:ProviderApprovalStatus; serviceArea:string; applicationId?:string; schedule:ProviderSchedule };
export type ApplicationStatus = "pending"|"changes-needed"|"rejected"|"approved"|"suspended";
export type ApplicationDocument = { name:string; url?:string };
export type ProviderApplication = {
 id:string; invitationId:string; providerId?:string; businessName:string; contact:string; serviceArea:string;
 requestedServices:ServiceKey[]; approvedServices:ServiceKey[]; documents:ApplicationDocument[];
 termsAccepted:boolean; status:ApplicationStatus; reason?:string; submittedAt:number; updatedAt:number;
};
export type DemoInvitation = { id:string; code:string; createdAt:number; usedByApplicationId?:string };
export type DemoState = { providers:DemoProvider[]; requests:DemoRequest[]; applications:ProviderApplication[]; invitations:DemoInvitation[]; audit:AuditEntry[] };

const approved=(enabled:boolean,price:number|null,unit:string):Offering=>({enabled,approved:true,price,unit});
const initial:DemoState={providers:[
  {id:"mazen",ar:"حدائق مازن",en:"Mazen Garden Care",approvalStatus:"approved",serviceArea:"الرياض",schedule:defaultSchedule(),offerings:{maintenance:approved(true,340,"visit"),trim:approved(true,45,"tree"),plant:approved(true,280,"25 m²"),soil:approved(true,null,""),custom:approved(true,null,""),party:approved(false,null,""),farm:approved(true,null,"")}},
  {id:"nawa",ar:"نواة الخضراء",en:"Nawa Gardens",approvalStatus:"approved",serviceArea:"الرياض",schedule:defaultSchedule(),offerings:{maintenance:approved(true,310,"visit"),plant:approved(true,260,"25 m²"),party:approved(true,null,""),custom:approved(true,null,"")}},
  {id:"rawaf",ar:"رواف للمساحات",en:"Rawaf Outdoor",approvalStatus:"approved",serviceArea:"الرياض",schedule:defaultSchedule(),offerings:{maintenance:approved(true,365,"visit"),trim:approved(true,52,"tree"),party:approved(true,null,"")}},
  {id:"sahl",ar:"سهل البستان",en:"Sahl Orchard",approvalStatus:"approved",serviceArea:"الرياض",schedule:defaultSchedule(),offerings:{trim:approved(true,40,"tree"),plant:approved(true,295,"25 m²"),soil:approved(true,null,""),custom:approved(true,null,"")}}
],requests:[
   {id:"prior-1",providerId:"mazen",customerId:"waleed",neighborhood:"العليا، الرياض",exactAddress:"شارع الأمير محمد بن عبدالعزيز، فيلا ٢٨",title:"Neda House Garden",services:["maintenance"],subtotal:340,agreedTotal:340,durationMinutes:120,quoteOnly:false,status:"booked",kind:"service",preferredTime:"2026-06-15T16:00",createdAt:0,updatedAt:0,note:"Earlier prototype record",seeded:true,messages:[]},
  {id:"prior-2",providerId:"mazen",customerId:"waleed",neighborhood:"العليا، الرياض",exactAddress:"شارع الأمير محمد بن عبدالعزيز، فيلا ٢٨",title:"Shade planting",services:["plant"],subtotal:280,agreedTotal:280,quoteOnly:false,status:"completed",kind:"service",createdAt:0,updatedAt:0,note:"Earlier prototype record",seeded:true}
],applications:[],invitations:[],audit:[]};
let state:DemoState=initial;
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(l=>l());
const merge=(incoming:DemoState)=>{
 const mergeById=<T extends {id:string}>(current:T[],next:T[],newer?:(a:T,b:T)=>boolean)=>{const result=[...current];next.forEach(item=>{const i=result.findIndex(x=>x.id===item.id);if(i<0)result.push(item);else if(!newer||newer(item,result[i]))result[i]=item});return result};
 state={
  providers:mergeById(state.providers,incoming.providers),
  requests:mergeById(state.requests,incoming.requests,(a,b)=>a.updatedAt>b.updatedAt),
  applications:mergeById(state.applications,incoming.applications??[],(a,b)=>a.updatedAt>b.updatedAt),
   invitations:mergeById(state.invitations,incoming.invitations??[]),
   audit:mergeById(state.audit,incoming.audit??[])
 };emit()
};
let channel:BroadcastChannel|undefined;
if(typeof window!=="undefined"&&"BroadcastChannel" in window){channel=new BroadcastChannel("wareef-previous-demo");channel.onmessage=e=>{if(e.data?.type==="snapshot")merge(e.data.state as DemoState);if(e.data?.type==="request-snapshot")channel?.postMessage({type:"snapshot",state})};channel.postMessage({type:"request-snapshot"})}
const publish=()=>channel?.postMessage({type:"snapshot",state});
const commit=(next:DemoState)=>{state=next;emit();publish()};
const update=(id:string,mutate:(request:DemoRequest,now:number)=>DemoRequest|undefined)=>{
 const now=Date.now();let changed=false;
 const requests=state.requests.map(r=>{if(r.id!==id)return r;const next=mutate(r,now);if(!next)return r;changed=true;return {...next,updatedAt:now}});
 if(changed)commit({...state,requests}); return changed;
};
const event=(r:DemoRequest,e:RequestEvent)=>({...r,events:[...(r.events??[]),e]});
const lifecycle:Partial<Record<RequestStatus,RequestStatus[]>>={pending:["quoted","booked"],quoted:["booked"],booked:["ongoing"],ongoing:["work_completed"],work_completed:["completed"]};
export const canTransition=(from:RequestStatus,to:RequestStatus)=>Boolean(lifecycle[from]?.includes(to));
export const addressReleased=(r:DemoRequest)=>r.status==="booked"||r.status==="ongoing"||r.status==="work_completed"||r.status==="completed";
export const customerRequestProjection=(r:DemoRequest,customerId="waleed")=>r.customerId===customerId?r:undefined;
export const providerRequestProjection=(r:DemoRequest,providerId:string)=>r.providerId===providerId?{...r,exactAddress:addressReleased(r)?r.exactAddress:undefined}:undefined;
export const canMutateRequest=(r:DemoRequest,actor:"customer"|"provider",identity:string)=>actor==="customer"?r.customerId===identity:r.providerId===identity;
const acceptingNewRequest=(providerId:string,services:ServiceKey[])=>{
 const provider=state.providers.find(p=>p.id===providerId);
 return Boolean(provider&&provider.approvalStatus==="approved"&&services.length&&services.every(key=>provider.offerings[key]?.approved&&provider.offerings[key]?.enabled));
};

export const demoStore={
 get:()=>state, subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>listeners.delete(listener)},
 createInvitation:()=>{const now=Date.now(),code=`WRF-${Math.random().toString(36).slice(2,8).toUpperCase()}`,invitation={id:`invite-${now}-${code}`,code,createdAt:now};commit({...state,invitations:[invitation,...state.invitations]});return invitation},
 invitationForCode:(code:string)=>state.invitations.find(i=>i.code===code.trim().toUpperCase()),
 submitApplication:(input:Omit<ProviderApplication,"id"|"invitationId"|"status"|"submittedAt"|"updatedAt"|"approvedServices"|"reason"|"providerId"> & { invitationCode:string; applicationId?:string })=>{
  const invitation=demoStore.invitationForCode(input.invitationCode);
  if(!invitation)return {ok:false as const,error:"invalid-invitation"};
  const existing=input.applicationId?state.applications.find(a=>a.id===input.applicationId):state.applications.find(a=>a.invitationId===invitation.id);
  if(invitation.usedByApplicationId&&invitation.usedByApplicationId!==existing?.id)return {ok:false as const,error:"used-invitation"};
  if(existing&&!["changes-needed","rejected","pending"].includes(existing.status))return {ok:false as const,error:"not-editable"};
  const now=Date.now(),id=existing?.id??`app-${now}-${Math.random().toString(36).slice(2,6)}`;
  const application:ProviderApplication={...existing,...input,id,invitationId:invitation.id,status:"pending",approvedServices:existing?.approvedServices.filter(s=>input.requestedServices.includes(s))??[],reason:undefined,submittedAt:existing?.submittedAt??now,updatedAt:now};
  delete (application as ProviderApplication&{invitationCode?:string;applicationId?:string}).invitationCode;
  delete (application as ProviderApplication&{invitationCode?:string;applicationId?:string}).applicationId;
  const applications=existing?state.applications.map(a=>a.id===id?application:a):[application,...state.applications];
  const invitations=state.invitations.map(i=>i.id===invitation.id?{...i,usedByApplicationId:id}:i);
  commit({...state,applications,invitations});return {ok:true as const,application};
 },
 reviewApplication:(id:string,status:ApplicationStatus,approvedServices:ServiceKey[],reason?:string)=>{
  const app=state.applications.find(a=>a.id===id);if(!app)return false;
  if(["changes-needed","rejected","suspended"].includes(status)&&!reason?.trim())return false;
  const allowed=approvedServices.filter(s=>app.requestedServices.includes(s));
  const now=Date.now(),nextApp={...app,status,approvedServices:allowed,reason:reason?.trim()||undefined,updatedAt:now};
  let providers=state.providers;
  if(status==="approved"){
   const providerId=app.providerId??`provider-${app.id}`;
   const old=providers.find(p=>p.id===providerId);
   const offerings={...(old?.offerings??{})};
   app.requestedServices.forEach(key=>{const prior=offerings[key];offerings[key]={enabled:allowed.includes(key),approved:allowed.includes(key),price:prior?.price??null,unit:prior?.unit??""}});
    const provider:DemoProvider={id:providerId,ar:app.businessName,en:app.businessName,serviceArea:app.serviceArea,approvalStatus:"approved",applicationId:app.id,schedule:old?.schedule??defaultSchedule(),offerings};
   providers=old?providers.map(p=>p.id===providerId?provider:p):[...providers,provider];
   nextApp.providerId=providerId;
  }else if(app.providerId&&status==="suspended"){
   providers=providers.map(p=>p.id===app.providerId?{...p,approvalStatus:"suspended"}:p);
  }
   const applications=state.applications.map(a=>a.id===id?nextApp:a);
   const action:AuditEntry["action"]=status==="suspended"?"provider-suspended":status==="approved"&&app.status==="suspended"?"provider-reapproved":"application-review";
   const audit=[{id:`audit-${now}-${id}`,at:now,actor:"admin" as const,action,target:app.businessName,detail:reason?.trim()||status},...state.audit];
   commit({...state,applications,providers,audit});return true;
 },
 submit:(request:Omit<DemoRequest,"id"|"createdAt"|"updatedAt">)=>{
  if(!acceptingNewRequest(request.providerId,request.services))return {ok:false as const,error:"provider-or-service-unavailable"};
  const now=Date.now(),created={...request,id:`demo-${now}-${Math.random().toString(36).slice(2,6)}`,createdAt:now,updatedAt:now};commit({...state,requests:[created,...state.requests]});return {ok:true as const,request:created};
 },
   patchRequest:(id:string,patch:Partial<DemoRequest>,actor:RequestActor="provider",identity?:string)=>update(id,(r,now)=>{
    if(!identity||!canMutateRequest(r,actor as "customer"|"provider",identity))return;
   const safe:Partial<DemoRequest>={};
    if(patch.status&&canTransition(r.status,patch.status)){
      if(patch.status==="quoted"&&r.quoteOnly&&patch.durationMinutes!==undefined){
        safe.durationMinutes=patch.durationMinutes;
      }
      if(patch.status==="booked"){
       const provider=state.providers.find(p=>p.id===r.providerId);
       if(!provider||provider.approvalStatus!=="approved")return;
       const check=availability(provider.schedule,state.requests,{...r,durationMinutes:patch.durationMinutes??r.durationMinutes,status:"booked"});
       if(!check.ok)return;
       safe.durationMinutes=patch.durationMinutes??r.durationMinutes;
      }
      safe.status=patch.status;
    }
   if(typeof patch.rating==="number"&&r.status==="work_completed")safe.rating=Math.max(1,Math.min(5,patch.rating));
   if(typeof patch.issueText==="string"&&r.status==="work_completed")safe.issueText=patch.issueText;
    if(typeof patch.quoteAmount==="number"&&r.quoteOnly&&r.status==="pending"&&patch.quoteAmount>0){safe.quoteAmount=patch.quoteAmount;if(patch.durationMinutes!==undefined)safe.durationMinutes=patch.durationMinutes;}
   if(!Object.keys(safe).length)return;
   return event({...r,...safe},{type:"status",actor,at:now});
 }),
  sendMessage:(id:string,sender:"customer"|"provider",body:string,providerId?:string)=>{
   const clean=body.trim().slice(0,500); if(!clean)return false;
   return update(id,(r,now)=>{
    if(sender==="provider"&&r.providerId!==providerId)return;
    if(!["booked","ongoing","work_completed"].includes(r.status))return;
    return {...r,messages:[...(r.messages??[]),{id:`msg-${now}`,sender,body:clean,at:now}]};
   });
  },
 changePendingPreferredTime:(id:string,time:string)=>update(id,(r,now)=>r.status==="pending"&&time?event({...r,preferredTime:time},{type:"time_change",actor:"customer",at:now}):undefined),
   proposeTime:(id:string,actor:"customer"|"provider",time:string)=>update(id,(r,now)=>!["booked"].includes(r.status)||!time||r.timeProposal?.status==="pending"?undefined:event({...r,timeProposal:{id:`time-${now}`,proposedTime:time,proposedBy:actor,status:"pending",createdAt:now}},{type:"time_proposal",actor,at:now})),
 respondToTimeProposal:(id:string,actor:"customer"|"provider",accept:boolean)=>update(id,(r,now)=>{
   const p=r.timeProposal;if(r.status!=="booked"||!p||p.status!=="pending"||p.proposedBy===actor)return;
    if(accept){const provider=state.providers.find(x=>x.id===r.providerId);if(!provider||!availability(provider.schedule,state.requests,{...r,preferredTime:p.proposedTime,status:"booked"}).ok)return}
    return event({...r,...(accept?{preferredTime:p.proposedTime}:{}),timeProposal:{...p,status:accept?"accepted":"rejected",respondedAt:now,respondedBy:actor}},{type:accept?"proposal_accepted":"proposal_rejected",actor,at:now});
 }),
  cancel:(id:string,actor:"customer"|"provider",reason?:string,identity?:string)=>update(id,(r,now)=>{
    if(!identity||!canMutateRequest(r,actor,identity))return;
   if(actor==="provider"&&r.status==="pending")return event({...r,status:"declined",decline:{reason:reason?.trim()||undefined,at:now}},{type:"decline",actor,at:now,reason:reason?.trim()||undefined});
   if(!["pending","quoted","booked"].includes(r.status))return;
   return event({...r,status:"cancelled",cancellation:{actor,reason:reason?.trim()||undefined,at:now,paymentCollected:false},timeProposal:r.timeProposal?.status==="pending"?{...r.timeProposal,status:"rejected",respondedAt:now,respondedBy:actor}:r.timeProposal},{type:"cancel",actor,at:now,reason:reason?.trim()||undefined});
 }),
 simulateNoResponse:(id:string)=>update(id,(r,now)=>r.status==="pending"?event({...r,adminNoResponseDemo:{simulatedAt:now,alternativesOffered:true}},{type:"admin_no_response_demo",actor:"admin",at:now}):undefined),
 patchOffering:(providerId:string,key:ServiceKey,patch:Partial<Offering>)=>{
  const provider=state.providers.find(p=>p.id===providerId);if(!provider||provider.approvalStatus!=="approved")return false;
  const current=provider.offerings[key];if(!current?.approved)return false;
  const providers=state.providers.map(p=>p.id!==providerId?p:{...p,offerings:{...p.offerings,[key]:{...current,...patch,approved:true}}});commit({...state,providers});return true;
  },
  availabilityFor:(id:string,time?:string,duration?:number)=>{
   const request=state.requests.find(r=>r.id===id),provider=request&&state.providers.find(p=>p.id===request.providerId);
   if(!request||!provider)return {ok:false as const,code:"capacity" as const};
   if(provider.approvalStatus!=="approved")return {ok:false as const,code:"suspended" as const};
   return availability(provider.schedule,state.requests,{...request,preferredTime:time??request.preferredTime,durationMinutes:duration??request.durationMinutes,status:"booked"});
  },
  saveSchedule:(providerId:string,schedule:ProviderSchedule)=>{
   if(!Number.isInteger(schedule.capacity)||schedule.capacity<1)return false;
   const provider=state.providers.find(p=>p.id===providerId);if(!provider||provider.approvalStatus!=="approved")return false;
   commit({...state,providers:state.providers.map(p=>p.id===providerId?{...p,schedule}:p)});return true;
  }
};
export const useDemoState=()=>useSyncExternalStore(demoStore.subscribe,demoStore.get,demoStore.get);
// Deliberately executable visibility checks for this in-memory, browser-local demo model.
export const runVisibilityChecks=()=>{
 const pending={...initial.requests[0],status:"pending" as RequestStatus,neighborhood:"Al Olaya, Riyadh",exactAddress:"Secret Villa 28, Prince Mohammed Bin Abdulaziz St"};
 const pendingProvider=providerRequestProjection(pending,"mazen");
 return customerRequestProjection(pending,"other")===undefined
  && pendingProvider?.exactAddress===undefined
  && !JSON.stringify(pendingProvider).includes("Secret Villa 28")
  && providerRequestProjection(initial.requests[0],"mazen")?.exactAddress===initial.requests[0].exactAddress
  && !canMutateRequest(pending,"customer","other")
  && !canMutateRequest(pending,"provider","another-provider")
  && !acceptingNewRequest("missing",["maintenance"]);
};
// Executable unpriced lifecycle exercise: standard work can book directly, while
// assessment work first becomes a non-monetary proposal and is capacity-checked
// again only when the customer books it.
export const runUnpricedLifecycleChecks=()=>{
 const schedule=defaultSchedule(),standard={id:"standard",providerId:"mazen",status:"booked",preferredTime:"2026-06-15T10:00",durationMinutes:60};
 const assessment={id:"assessment",providerId:"mazen",status:"booked",preferredTime:"2026-06-15T11:30",durationMinutes:60};
 const overlapping={...standard,id:"overlap",preferredTime:"2026-06-15T10:30"};
 return canTransition("pending","booked")
  && availability(schedule,[],standard).ok
  && canTransition("pending","quoted")
  && canTransition("quoted","booked")
  && availability(schedule,[],assessment).ok
  && availability(schedule,[standard],overlapping).code==="capacity";
};
if(import.meta.env.DEV&&(!runVisibilityChecks()||!runUnpricedLifecycleChecks()))throw new Error("Wareef demo lifecycle invariant failed");
export const statusText=(status:RequestStatus,english:boolean,quoteOnly=false)=>({
 pending:quoteOnly?(english?"Assessment / quote requested":"طلب معاينة / عرض سعر"):(english?"Pending provider confirmation":"بانتظار تأكيد المختص"),
  quoted:english?"Pricing-pending proposal ready — customer decision":"عرض تجريبي بانتظار التسعير — بانتظار العميل",booked:english?"Booked":"محجوز",ongoing:english?"In progress":"قيد التنفيذ",
 work_completed:english?"Work completed — customer review":"أنجز المختص العمل — بانتظار العميل",completed:english?"Completion confirmed":"أكد العميل الاكتمال",
 declined:english?"Declined by provider":"اعتذر المختص",cancelled:english?"Cancelled":"ملغي"
}[status]);