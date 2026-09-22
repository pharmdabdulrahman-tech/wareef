import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";
import {
  deleteDraftPhoto, getDraftPhoto, putDraftPhoto,
  type MaintenanceDetails, type MaintenanceTask,
} from "./booking-draft";

export const maintenanceTasks: Record<MaintenanceTask, { ar: string; en: string; hintAr: string; hintEn: string }> = {
  cleaning: { ar: "تنظيف الحديقة", en: "Garden cleaning", hintAr: "الأوراق المتساقطة والنفايات والأغصان الصغيرة", hintEn: "Fallen leaves, litter and small branches" },
  weeding: { ar: "إزالة الأعشاب الضارة", en: "Weed removal", hintAr: "من أحواض الزراعة والممرات", hintEn: "From beds and pathways" },
  mowing: { ar: "قص العشب والحواف", en: "Lawn mowing & edges", hintAr: "قص المسطح وترتيب الحواف", hintEn: "Mow lawn and tidy edges" },
  shrubs: { ar: "إزالة نباتات أو شجيرات غير مرغوبة", en: "Unwanted plants / shrub removal", hintAr: "لا تشمل الأشجار الكبيرة", hintEn: "Large trees excluded" },
  trees: { ar: "إزالة شجرة قائمة", en: "Standing tree removal", hintAr: "معاينة وعرض سعر فقط", hintEn: "Inspection and quote only" },
  stumps: { ar: "إزالة الجذع أو الجذور", en: "Stump / root removal", hintAr: "معاينة وعرض سعر فقط", hintEn: "Inspection and quote only" },
};

export function maintenanceValid(value: MaintenanceDetails) {
  if (!value.tasks.length || !value.photoIds.length) return false;
  if (value.tasks.some(x => ["cleaning", "weeding", "mowing"].includes(x)) && !value.area.trim()) return false;
  if (value.tasks.includes("shrubs") && !value.shrubs.trim()) return false;
  if (value.tasks.includes("trees") && (!value.trees.trim() || !value.treeDetails.trim())) return false;
  if (value.tasks.includes("stumps") && (!value.stumps.trim() || !value.treeDetails.trim())) return false;
  return true;
}

export function MaintenanceForm({ english, value, onChange, showErrors }: {
  english: boolean; value: MaintenanceDetails; onChange: (next: MaintenanceDetails) => void; showErrors: boolean;
}) {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    Promise.all(value.photoIds.map(async id => {
      const file = await getDraftPhoto(id);
      return file ? [id, URL.createObjectURL(file)] as const : null;
    })).then(rows => {
      if (!active) return rows.forEach(row => row && URL.revokeObjectURL(row[1]));
      setPreviews(previous => {
        Object.values(previous).forEach(URL.revokeObjectURL);
        return Object.fromEntries(rows.filter((row): row is readonly [string, string] => !!row));
      });
    });
    return () => { active = false; };
  }, [value.photoIds]);
  useEffect(() => () => Object.values(previews).forEach(URL.revokeObjectURL), [previews]);

  const hasArea = value.tasks.some(x => ["cleaning", "weeding", "mowing"].includes(x));
  const hasTree = value.tasks.some(x => x === "trees" || x === "stumps");
  const toggle = (task: MaintenanceTask) => onChange({ ...value, tasks: value.tasks.includes(task) ? value.tasks.filter(x => x !== task) : [...value.tasks, task] });
  const error = (condition: boolean) => showErrors && condition ? <small className="maintenance-error" role="alert">{english ? "Required for the selected work" : "مطلوب للعمل المختار"}</small> : null;
  return <section className="maintenance-builder" aria-labelledby="maintenance-heading">
    <div className="maintenance-heading"><h2 id="maintenance-heading">{english ? "Choose specific maintenance tasks" : "اختر مهام التنظيف والصيانة"}</h2><p>{english ? "Trimming remains a separate service. Tree and stump removal require inspection and a quote." : "يبقى التقليم خدمة منفصلة. إزالة الأشجار والجذوع تتطلب معاينة وعرض سعر."}</p></div>
    <div className="maintenance-tasks">{(Object.keys(maintenanceTasks) as MaintenanceTask[]).map(task => { const item = maintenanceTasks[task], checked = value.tasks.includes(task); return <label className={checked ? "selected" : ""} key={task}><input type="checkbox" checked={checked} onChange={() => toggle(task)} /><span><b>{english ? item.en : item.ar}</b><small>{english ? item.hintEn : item.hintAr}</small></span></label>; })}</div>
    {error(!value.tasks.length)}
    {hasArea && <label>{english ? "Approximate area (m²)" : "المساحة التقريبية (م²)"}<input inputMode="decimal" value={value.area} onChange={e => onChange({ ...value, area: e.target.value.replace(/[^\d.]/g, "") })} placeholder={english ? "e.g. 80" : "مثال: 80"} />{error(!value.area.trim())}</label>}
    {value.tasks.includes("shrubs") && <label>{english ? "Number of plants / shrubs" : "عدد النباتات / الشجيرات"}<input inputMode="numeric" value={value.shrubs} onChange={e => onChange({ ...value, shrubs: e.target.value.replace(/\D/g, "") })} />{error(!value.shrubs.trim())}</label>}
    {value.tasks.includes("trees") && <label>{english ? "Number of standing trees" : "عدد الأشجار القائمة"}<input inputMode="numeric" value={value.trees} onChange={e => onChange({ ...value, trees: e.target.value.replace(/\D/g, "") })} />{error(!value.trees.trim())}</label>}
    {value.tasks.includes("stumps") && <label>{english ? "Number of stumps / root areas" : "عدد الجذوع / مناطق الجذور"}<input inputMode="numeric" value={value.stumps} onChange={e => onChange({ ...value, stumps: e.target.value.replace(/\D/g, "") })} />{error(!value.stumps.trim())}</label>}
    {hasTree && <label>{english ? "Tree size, access and nearby structures" : "حجم الشجرة وسهولة الوصول والمنشآت القريبة"}<textarea value={value.treeDetails} onChange={e => onChange({ ...value, treeDetails: e.target.value })} placeholder={english ? "Height/diameter, gate or equipment access, walls, buildings or power lines nearby" : "الارتفاع/القطر، مدخل المعدات، والجدران أو المباني أو خطوط الكهرباء القريبة"} />{error(!value.treeDetails.trim())}</label>}
    <label>{english ? "Site photos" : "صور الموقع"}<span className="maintenance-upload"><Camera /><b>{english ? "Choose local photos" : "اختر صوراً من الجهاز"}</b><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={async e => { const files = Array.from(e.target.files || []); const ids = await Promise.all(files.map(putDraftPhoto)); onChange({ ...value, photoIds: [...value.photoIds, ...ids] }); e.target.value = ""; }} /></span>{error(!value.photoIds.length)}</label>
    {!!value.photoIds.length && <div className="maintenance-photos">{value.photoIds.map((id, index) => <figure key={id}>{previews[id] && <div className="draft-photo-preview" role="img" aria-label={english ? `Site preview ${index + 1}` : `معاينة الموقع ${index + 1}`} style={{ backgroundImage: `url("${previews[id]}")` }} />}<button type="button" aria-label={english ? "Remove photo" : "حذف الصورة"} onClick={async () => { await deleteDraftPhoto(id); onChange({ ...value, photoIds: value.photoIds.filter(x => x !== id) }); }}><X /></button></figure>)}</div>}
    <label>{english ? "Optional note" : "ملاحظة اختيارية"}<textarea value={value.note} onChange={e => onChange({ ...value, note: e.target.value })} /></label>
  </section>;
}

export function MaintenanceSummary({ english, value }: { english: boolean; value: MaintenanceDetails }) {
  const rows: string[] = [];
  if (value.area) rows.push(`${english ? "Approx. area" : "المساحة التقريبية"}: ${value.area} m²`);
  if (value.shrubs) rows.push(`${english ? "Plants / shrubs" : "النباتات / الشجيرات"}: ${value.shrubs}`);
  if (value.trees) rows.push(`${english ? "Standing trees" : "الأشجار القائمة"}: ${value.trees}`);
  if (value.stumps) rows.push(`${english ? "Stumps / roots" : "الجذوع / الجذور"}: ${value.stumps}`);
  if (value.treeDetails) rows.push(`${english ? "Tree / access detail" : "تفاصيل الشجرة / الوصول"}: ${value.treeDetails}`);
  const hasDetails = value.tasks.length > 0 || rows.length > 0 || Boolean(value.note);
  return <div className="maintenance-summary"><b>{english ? "Cleaning & maintenance inclusions" : "بنود التنظيف والصيانة"}</b>{hasDetails ? <><ul>{value.tasks.map(task => <li key={task}>{english ? maintenanceTasks[task].en : maintenanceTasks[task].ar} — {english ? maintenanceTasks[task].hintEn : maintenanceTasks[task].hintAr}</li>)}</ul>{rows.map(row => <p key={row}>{row}</p>)}{value.note && <p><b>{english ? "Note" : "ملاحظة"}:</b> {value.note}</p>}</> : <p>{english ? "Not provided" : "غير مقدم"}</p>}</div>;
}

export function GardenPhotoField({ english, photoIds, onChange }: {
  english: boolean; photoIds: string[]; onChange: (ids: string[]) => void;
}) {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    Promise.all(photoIds.map(async id => {
      const file = await getDraftPhoto(id);
      return file ? [id, URL.createObjectURL(file)] as const : null;
    })).then(rows => {
      if (!active) return rows.forEach(row => row && URL.revokeObjectURL(row[1]));
      setPreviews(previous => {
        Object.values(previous).forEach(URL.revokeObjectURL);
        return Object.fromEntries(rows.filter((row): row is readonly [string, string] => !!row));
      });
    });
    return () => { active = false; };
  }, [photoIds]);
  useEffect(() => () => Object.values(previews).forEach(URL.revokeObjectURL), [previews]);
  return <label>{english ? "Add garden photos (optional)" : "أضف صور الحديقة (اختياري)"}
    <span className="maintenance-upload"><Camera /><b>{english ? "Choose local photos" : "اختر صوراً من الجهاز"}</b><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={async event => { const ids = await Promise.all(Array.from(event.target.files || []).map(putDraftPhoto)); onChange([...photoIds, ...ids]); event.target.value = ""; }} /></span>
    {!!photoIds.length && <div className="maintenance-photos">{photoIds.map((id, index) => <figure key={id}>{previews[id] && <div className="draft-photo-preview" role="img" aria-label={english ? `Garden preview ${index + 1}` : `معاينة الحديقة ${index + 1}`} style={{ backgroundImage: `url("${previews[id]}")` }} />}<button type="button" aria-label={english ? "Remove photo" : "حذف الصورة"} onClick={async () => { await deleteDraftPhoto(id); onChange(photoIds.filter(value => value !== id)); }}><X /></button></figure>)}</div>}
  </label>;
}