import { Home, Sprout, TreePine } from "lucide-react";

export type PropertyType = "home" | "farm";
export type DemoRequest = { id:string; property:PropertyType; service:string; location:string; date:string; size:string; garden?:string; crops?:string; details?:string; quote:boolean; created:string };
export const STORE="wareef-local-demo-requests";
export const WareefBrand=()=> <span className="brand"><b>وريف</b><span>/</span><small>Wareef</small></span>;
export const serviceData=[
  {id:"maintenance",home:"صيانة دورية",farm:"صيانة المزرعة",enHome:"Regular maintenance",enFarm:"Farm maintenance",price:"تُحدّد لاحقاً",both:true},
  {id:"irrigation",home:"صيانة الري",farm:"صيانة نظام الري",enHome:"Irrigation maintenance",enFarm:"Irrigation-system maintenance",price:"تُحدّد لاحقاً",both:true},
  {id:"planting",home:"زراعة موسمية",farm:"تجهيز وزراعة الأرض",enHome:"Seasonal planting",enFarm:"Land preparation & planting",price:"تُحدّد لاحقاً",both:true},
  {id:"pruning",home:"تقليم الأشجار والسياج",farm:"تقليم النخيل والأشجار",enHome:"Tree & hedge trimming",enFarm:"Palm & tree pruning",price:"تُحدّد لاحقاً",both:true},
  {id:"cleanup",home:"تنظيف الحديقة",farm:"تنظيف المزرعة",enHome:"Garden cleanup",enFarm:"Garden cleanup",price:"تُحدّد لاحقاً",both:true},
];
export function getRequests():DemoRequest[]{try{return JSON.parse(localStorage.getItem(STORE)||"[]")}catch{return []}}
export function saveRequest(request:DemoRequest){const next=[request,...getRequests()];localStorage.setItem(STORE,JSON.stringify(next));window.dispatchEvent(new Event("wareef-demo-update"))}
export const PropertyIcon=({type,size=22}:{type:PropertyType;size?:number})=>type==="home"?<Home size={size}/>:<Sprout size={size}/>;
export function PropertyCard({type,onClick,english=false}:{type:PropertyType;onClick:()=>void;english?:boolean}){const farm=type==="farm";return <article className={`property-card ${farm?"farm":""}`}><div className="property-icon"><PropertyIcon type={type}/></div><div><h2>{english?(farm?"Farms":"Home gardens"):(farm?"المزارع":"الحدائق المنزلية")}</h2><p>{english?(farm?"Land care, planting, palms and irrigation.":"Care, planting, lawns, trees and irrigation."):(farm?"صيانة الأرض والزراعة والنخيل وأنظمة الري.":"عناية وزراعة ومساحات خضراء وأشجار وري.")}</p><button className="outline" onClick={onClick}>{english?"Browse services":"تصفح الخدمات"} <span>←</span></button></div></article>}
export const DemoNote=({english=false}:{english?:boolean})=><div className="demo-note"><TreePine size={13}/>{english?"Demo only · saved in this browser, no real submission":"عرض تجريبي فقط · يُحفظ في هذا المتصفح ولا يتم إرسال طلب حقيقي"}</div>;