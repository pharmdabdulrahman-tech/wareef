import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { Link } from "wouter";
import { BadgeCheck, CircleAlert, ClipboardList, Leaf, Settings, ShieldCheck, Store, UserRound } from "lucide-react";
import type { AdminProviderProfile, ProviderOrder, ProviderProfile, ProviderProfileEdit, ProviderStatus } from "@workspace/api-client-react";
import { services } from "@/data/services";
import "./lifecycle.css";
import "./lifecycle-terminal.css";

const emptyProfile = (): ProviderProfileEdit => ({
  shopName: "", serviceIds: [], description: "", earliestAvailableAt: null, servicePrices: {},
});
const statusLabel = (status: ProviderStatus, ar: boolean) => ({
  draft: ar ? "مسودة" : "Draft", pending: ar ? "قيد المراجعة" : "Pending review",
  approved: ar ? "معتمد" : "Approved", rejected: ar ? "مرفوض" : "Rejected",
  suspended: ar ? "موقوف" : "Suspended",
}[status]);
const orderStatus = (status: ProviderOrder["status"], ar: boolean) => ({
  pending: ar ? "قيد الانتظار" : "Pending",
  accepted: ar ? "مقبول" : "Accepted",
  rejected: ar ? "مرفوض" : "Rejected",
  completed: ar ? "مكتمل" : "Completed",
  cancelled: ar ? "ملغي" : "Cancelled",
}[status]);
const optionalDate = (value: string | undefined, ar: boolean) => {
  const timestamp = Date.parse(value ?? "");
  return value && !Number.isNaN(timestamp) ? new Date(timestamp).toLocaleString(ar ? "ar-SA" : "en-SA") : ar ? "غير مقدم" : "Not provided";
};

function Header({ ar, setAr, area }: { ar: boolean; setAr: (value: boolean) => void; area: string }) {
  return <header className="lifecycle-head"><Link href="/" className="lifecycle-brand"><Leaf/><b>وريف</b><small>WAREEF</small></Link><span className="lifecycle-area">{area}</span><nav><Link href="/account"><UserRound/>{ar ? "الحساب" : "Account"}</Link><button onClick={() => setAr(!ar)}>{ar ? "EN" : "عربي"}</button></nav></header>;
}

export function ProviderCenter() {
  const { isLoaded, isSignedIn } = useUser();
  const [ar, setAr] = useState(true);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [form, setForm] = useState<ProviderProfileEdit>(emptyProfile);
  const [orders, setOrders] = useState<ProviderOrder[]>([]);
  const [tab, setTab] = useState<"settings" | "orders">("settings");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [terminalAction, setTerminalAction] = useState<{ id: string; status: "completed" | "cancelled" } | null>(null);
  const [freshAt, setFreshAt] = useState<Date | null>(null);
  const t = (arabic: string, english: string) => ar ? arabic : english;

  const load = async () => {
    setState("loading"); setMessage("");
    try {
      const response = await fetch("/api/provider/profile", { credentials: "include" });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || t("تعذر تحميل ملف المختص.", "Could not load the specialist profile."));
      const data = await response.json() as { profile: ProviderProfile | null };
      setProfile(data.profile); setForm(data.profile ?? emptyProfile()); setState("ready");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : t("تعذر التحميل.", "Could not load.")); setState("error"); }
  };
  const loadOrders = async (quiet = false) => {
    try {
      const response = await fetch("/api/provider/orders", { credentials: "include" });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || t("تعذر تحميل الطلبات.", "Could not load requests."));
      const data = await response.json() as { orders: ProviderOrder[] };
      setOrders(data.orders); setFreshAt(new Date()); if (!quiet) setMessage("");
    } catch (cause) { if (!quiet) setMessage(cause instanceof Error ? cause.message : t("تعذر تحميل الطلبات.", "Could not load requests.")); }
  };
  useEffect(() => { if (isSignedIn) void load(); }, [isSignedIn]);
  useEffect(() => {
    if (!isSignedIn || profile?.status !== "approved") return;
    void loadOrders();
    const timer = window.setInterval(() => void loadOrders(true), 15000);
    return () => window.clearInterval(timer);
  }, [isSignedIn, profile?.status]);

  if (!isLoaded) return <div className="lifecycle-loading">{t("جارٍ التحميل…", "Loading…")}</div>;
  if (!isSignedIn) return <div className="lifecycle-loading"><Link href="/sign-in">{t("سجّل الدخول للمتابعة", "Sign in to continue")}</Link></div>;
  const editable = !profile || ["draft", "rejected", "suspended", "approved"].includes(profile.status);
  const save = async () => {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/provider/profile", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        shopName: form.shopName.trim(), serviceIds: form.serviceIds, description: form.description.trim(),
        earliestAvailableAt: form.earliestAvailableAt || null,
        servicePrices: Object.fromEntries(form.serviceIds.map(id => [id, form.servicePrices[id] ?? null])),
      }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || t("تعذر حفظ الملف.", "Could not save profile."));
      setProfile(data.profile); setForm(data.profile); setMessage(t("تم حفظ الملف.", "Profile saved.")); return true;
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : t("تعذر الحفظ.", "Could not save.")); return false; }
    finally { setSaving(false); }
  };
  const submit = async () => {
    setSaving(true); setMessage("");
    try {
      if (!await save()) return;
      const response = await fetch("/api/provider/profile/submit", { method: "POST", credentials: "include" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || t("تعذر إرسال الطلب.", "Could not submit application."));
      setProfile(data.profile); setForm(data.profile); setMessage(t("أُرسل طلب الانضمام للمراجعة.", "Application submitted for review."));
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : t("تعذر الإرسال.", "Could not submit.")); }
    finally { setSaving(false); }
  };
  const respond = async (id: string, status: "accepted" | "rejected" | "completed" | "cancelled") => {
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/provider/orders/${encodeURIComponent(id)}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, ...(reason.trim() ? { reason: reason.trim() } : {}) }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 409) void loadOrders(true);
        throw new Error(data?.error || (response.status === 409
          ? t("تغيّرت حالة الطلب. تم تحديث القائمة؛ راجع الحالة الحالية.", "The request changed. The list was refreshed; review its current status.")
          : t("تعذر تحديث الطلب.", "Could not update request.")));
      }
      setOrders(rows => rows.map(row => row.id === id ? data.order : row)); setReason(""); setTerminalAction(null); setFreshAt(new Date());
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : t("تعذر التحديث.", "Could not update.")); }
    finally { setSaving(false); }
  };

  return <div className="lifecycle" dir={ar ? "rtl" : "ltr"}><Header ar={ar} setAr={setAr} area={t("مساحة مالك المتجر", "Shop owner area")}/>
    <div className="lifecycle-shell"><div className="lifecycle-intro"><p>WAREEF / PROVIDER</p><h1>{t("طلبات الانضمام وإدارة الخدمات", "Application & service management")}</h1><span>{t("متجر واحد، مالك واحد، بلا حسابات موظفين.", "One shop, one owner, with no staff accounts.")}</span></div>
      {state === "loading" ? <div className="lifecycle-card">{t("جارٍ تحميل الملف…", "Loading profile…")}</div> : state === "error" ? <div className="lifecycle-error"><CircleAlert/>{message}<button onClick={() => void load()}>{t("إعادة المحاولة", "Retry")}</button></div> : <>
        <div className="lifecycle-tabs"><button className={tab === "settings" ? "on" : ""} onClick={() => setTab("settings")}><Settings/>{t("الملف والخدمات", "Profile & services")}</button>{profile?.status === "approved" && <button className={tab === "orders" ? "on" : ""} onClick={() => setTab("orders")}><ClipboardList/>{t("طلبات العملاء", "Customer requests")}</button>}</div>
        {message && <p className="lifecycle-message" role="status">{message}</p>}
        {tab === "settings" && <section className="lifecycle-card">
          <div className="status-row"><div><Store/><b>{profile ? statusLabel(profile.status, ar) : t("طلب جديد", "New application")}</b></div>{profile?.isDemo && <em>مختص تجريبي / Test specialist</em>}</div>
          {profile?.statusReason && <div className="reason-box"><b>{t("سبب القرار", "Decision reason")}</b><p>{profile.statusReason}</p></div>}
          {profile?.status === "pending" && <div className="lifecycle-notice">{t("طلبك قيد مراجعة الإدارة. لا يمنح الإرسال صلاحيات مختص.", "Your application is under admin review. Submitting does not grant specialist access.")}</div>}
          {profile?.status === "approved" && <div className="lifecycle-notice approved"><BadgeCheck/>{t("أنت المالك المعتمد لهذا المتجر.", "You are the approved owner of this shop.")}</div>}
          <label>{t("اسم المتجر", "Shop name")}<input disabled={!editable} value={form.shopName} onChange={e => setForm({...form, shopName:e.target.value})}/></label>
          <label>{t("وصف مختصر", "Short description")}<textarea disabled={!editable} value={form.description} onChange={e => setForm({...form, description:e.target.value})}/></label>
          <label>{t("أقرب موعد متاح", "Earliest available time")}<input type="datetime-local" disabled={!editable} value={form.earliestAvailableAt?.slice(0,16) ?? ""} onChange={e => setForm({...form, earliestAvailableAt:e.target.value || null})}/></label>
          <fieldset><legend>{t("الخدمات والأسعار", "Services & prices")}</legend>{services.map(service => {
            const checked = form.serviceIds.includes(service.id); const price = form.servicePrices[service.id];
            return <div className="offering" key={service.id}><label><input type="checkbox" disabled={!editable} checked={checked} onChange={() => setForm({...form, serviceIds:checked ? form.serviceIds.filter(id => id !== service.id) : [...form.serviceIds, service.id]})}/><b>{ar ? service.titleAr : service.titleEn}</b></label>{checked && <label className="price-field">{t("السعر (ر.س) — اختياري", "Price (SAR) — optional")}<input type="number" min="0" step="0.01" disabled={!editable} value={price ?? ""} placeholder={t("السعر معلّق", "Pricing pending")} onChange={e => setForm({...form, servicePrices:{...form.servicePrices,[service.id]:e.target.value === "" ? null : Number(e.target.value)}})}/></label>}</div>;
          })}</fieldset>
          <div className="lifecycle-actions"><button disabled={saving || !form.shopName.trim() || !form.serviceIds.length} onClick={() => void save()}>{saving ? t("جارٍ الحفظ…", "Saving…") : t("حفظ الإعدادات", "Save settings")}</button>{(!profile || ["draft","rejected","suspended"].includes(profile.status)) && <button className="primary" disabled={saving || !form.shopName.trim() || !form.serviceIds.length} onClick={() => void submit()}>{profile && ["rejected","suspended"].includes(profile.status) ? t("إعادة الإرسال للمراجعة", "Resubmit for review") : t("إرسال طلب الانضمام", "Submit application")}</button>}</div>
        </section>}
        {tab === "orders" && <section className="lifecycle-card"><div className="section-title"><h2>{t("طلبات العملاء", "Customer requests")}</h2><span>{freshAt ? `${t("آخر تحديث", "Updated")} ${freshAt.toLocaleTimeString(ar ? "ar-SA" : "en-SA")}` : t("جارٍ التحديث…", "Refreshing…")}</span></div>
          {!orders.length ? <div className="lifecycle-empty">{t("لا توجد طلبات مسندة إلى متجرك.", "No requests are assigned to your shop.")}</div> : <div className="owner-orders">{orders.map(order => <article key={order.id}><button className="order-summary" onClick={() => { setSelected(selected === order.id ? null : order.id); setTerminalAction(null); setReason(""); }}><span><b>{order.items?.map(item => item.name).join("، ") || t("طلب خدمة", "Service request")}</b><small>{new Date(order.createdAt).toLocaleString(ar ? "ar-SA" : "en-SA")}</small></span><em className={`status-${order.status}`}>{orderStatus(order.status, ar)}</em></button>{selected === order.id && <div className="order-detail">
             {order.booking && <p><b>{t("الوقت المفضّل", "Preferred time")}</b>{optionalDate(order.booking.preferredTime, ar)}</p>}
             {(order.status === "accepted" || order.status === "completed") && order.booking && <p><b>{t("العنوان", "Address")}</b>{order.booking.location || t("غير مقدم", "Not provided")}</p>}
             {order.status !== "accepted" && order.status !== "completed" && <p className="privacy-copy">{order.status === "cancelled" ? t("أُلغيت صلاحية الوصول إلى العنوان الدقيق والصور.", "Access to the exact address and photos ended when this request was cancelled.") : t("العنوان الدقيق والصور لا تظهر للمالك إلا بعد القبول.", "Exact address and photos are released to the owner only after acceptance.")}</p>}
             {(order.status === "accepted" || order.status === "completed") && order.booking?.photoPaths?.length ? <p><b>{t("صور الموقع", "Site photos")}</b>{order.booking.photoPaths.length}</p> : null}
            {order.responseReason && <p><b>{t("سبب الرد", "Response reason")}</b>{order.responseReason}</p>}
             {order.respondedAt && <p className="order-metadata"><b>{t("وقت الرد", "Responded")}</b>{new Date(order.respondedAt).toLocaleString(ar ? "ar-SA" : "en-SA")}</p>}
             {order.completedAt && <p className="order-metadata"><b>{t("وقت الإكمال", "Completed")}</b>{new Date(order.completedAt).toLocaleString(ar ? "ar-SA" : "en-SA")}</p>}
             {order.cancellationReason && <p className="terminal-reason"><b>{t("سبب الإلغاء", "Cancellation reason")}</b>{order.cancellationReason}</p>}
             {order.cancelledAt && <p className="order-metadata"><b>{t("وقت الإلغاء", "Cancelled")}</b>{new Date(order.cancelledAt).toLocaleString(ar ? "ar-SA" : "en-SA")}{order.cancelledBy ? ` · ${order.cancelledBy === "provider" ? t("بواسطة المختص", "by specialist") : t("بواسطة العميل", "by customer")}` : ""}</p>}
            {order.status === "pending" && <><label>{t("سبب الرفض (مطلوب عند الرفض)", "Rejection reason (required when rejecting)")}<textarea value={reason} onChange={e => setReason(e.target.value)}/></label><div className="lifecycle-actions"><button className="primary" disabled={saving} onClick={() => void respond(order.id, "accepted")}>{t("قبول الطلب", "Accept request")}</button><button className="danger" disabled={saving || !reason.trim()} onClick={() => void respond(order.id, "rejected")}>{t("رفض الطلب", "Reject request")}</button></div></>}
             {order.status === "accepted" && (!terminalAction || terminalAction.id !== order.id) && <div className="terminal-actions"><p>{t("لا يتم تحصيل أي دفعة عند إكمال الطلب أو إلغائه.", "No payment is taken when completing or cancelling this request.")}</p><div className="lifecycle-actions"><button className="primary" disabled={saving} onClick={() => { setReason(""); setTerminalAction({ id: order.id, status: "completed" }); }}>{t("إكمال الطلب", "Complete request")}</button><button className="danger" disabled={saving} onClick={() => { setReason(""); setTerminalAction({ id: order.id, status: "cancelled" }); }}>{t("إلغاء الطلب", "Cancel request")}</button></div></div>}
             {order.status === "accepted" && terminalAction?.id === order.id && <div className="terminal-confirm">
               <b>{terminalAction.status === "completed" ? t("تأكيد اكتمال الطلب؟", "Confirm request completion?") : t("تأكيد إلغاء الطلب؟", "Confirm request cancellation?")}</b>
               <p>{t("هذا الإجراء نهائي ولا يتضمن تحصيل أي دفعة.", "This action is final and does not take payment.")}</p>
               {terminalAction.status === "cancelled" && <label>{t("سبب الإلغاء (مطلوب)", "Cancellation reason (required)")}<textarea maxLength={1000} value={reason} onChange={e => setReason(e.target.value)}/><small>{reason.length}/1000</small></label>}
               <div className="lifecycle-actions"><button className={terminalAction.status === "cancelled" ? "danger" : "primary"} disabled={saving || (terminalAction.status === "cancelled" && !reason.trim())} onClick={() => void respond(order.id, terminalAction.status)}>{saving ? t("جارٍ الحفظ…", "Saving…") : terminalAction.status === "completed" ? t("نعم، تأكيد الإكمال", "Yes, confirm completion") : t("نعم، تأكيد الإلغاء", "Yes, confirm cancellation")}</button><button disabled={saving} onClick={() => { setTerminalAction(null); setReason(""); }}>{t("العودة", "Go back")}</button></div>
             </div>}
          </div>}</article>)}</div>}
        </section>}
      </>}
    </div></div>;
}

export function AdminProviders() {
  const { isLoaded, isSignedIn } = useUser();
  const [ar, setAr] = useState(true);
  const [providers, setProviders] = useState<AdminProviderProfile[]>([]);
  const [state, setState] = useState<"loading"|"ready"|"error">("loading");
  const [message, setMessage] = useState("");
  const [reasons, setReasons] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState("");
  const t = (a:string,e:string) => ar ? a : e;
  const load = async () => {
    setState("loading"); setMessage("");
    try { const response = await fetch("/api/admin/providers", { credentials:"include" }); const data = await response.json().catch(()=>null); if(!response.ok) throw new Error(data?.error || t("غير مصرح أو تعذر التحميل.","Unauthorized or could not load.")); setProviders(data.providers); setState("ready"); }
    catch(cause){ setMessage(cause instanceof Error ? cause.message : t("تعذر التحميل.","Could not load.")); setState("error"); }
  };
  useEffect(()=>{ if(isSignedIn) void load(); },[isSignedIn]);
  const decide = async (id:string,status:"approved"|"rejected"|"suspended") => {
    setBusy(id); setMessage("");
    try { const response=await fetch(`/api/admin/providers/${encodeURIComponent(id)}`,{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,...(reasons[id]?.trim()?{reason:reasons[id].trim()}:{})})}); const data=await response.json().catch(()=>null); if(!response.ok)throw new Error(data?.error||t("تعذر حفظ القرار.","Could not save decision.")); setProviders(rows=>rows.map(row=>row.id===id?data.provider:row)); setReasons(value=>({...value,[id]:""})); }
    catch(cause){setMessage(cause instanceof Error?cause.message:t("تعذر حفظ القرار.","Could not save decision."));} finally{setBusy("");}
  };
  if(!isLoaded)return <div className="lifecycle-loading">{t("جارٍ التحميل…","Loading…")}</div>;
  if(!isSignedIn)return <div className="lifecycle-loading"><Link href="/sign-in">{t("سجّل الدخول للمتابعة","Sign in to continue")}</Link></div>;
  return <div className="lifecycle admin-lifecycle" dir={ar?"rtl":"ltr"}><Header ar={ar} setAr={setAr} area={t("إدارة وريف","Wareef admin")}/><div className="lifecycle-shell"><div className="lifecycle-intro"><p>WAREEF / ADMIN</p><h1>{t("مراجعة طلبات المختصين","Specialist application review")}</h1><span>{t("القرارات الإدارية هنا متاحة للمشرفين فقط ويفرضها الخادم.","These decisions are admin-only and enforced by the server.")}</span></div>
    {message&&<p className="lifecycle-message" role="alert">{message}</p>}
    {state==="loading"?<div className="lifecycle-card">{t("جارٍ تحميل الطلبات…","Loading applications…")}</div>:state==="error"?<div className="lifecycle-error"><ShieldCheck/>{message}<button onClick={()=>void load()}>{t("إعادة المحاولة","Retry")}</button></div>:<section className="admin-provider-grid">{providers.map(provider=><article className="lifecycle-card" key={provider.id}><div className="status-row"><div><Store/><b>{provider.shopName}</b></div><span>{statusLabel(provider.status,ar)}</span></div>{provider.isDemo&&<em className="test-badge">مختص تجريبي / Test specialist</em>}<p>{provider.description}</p><div className="service-chips">{provider.serviceIds.map(id=><span key={id}>{(ar?services.find(s=>s.id===id)?.titleAr:services.find(s=>s.id===id)?.titleEn)||id}</span>)}</div>{provider.statusReason&&<div className="reason-box">{provider.statusReason}</div>}<label>{t("سبب الرفض أو الإيقاف","Reason for rejection or suspension")}<textarea value={reasons[provider.id]??""} onChange={e=>setReasons(value=>({...value,[provider.id]:e.target.value}))}/></label><div className="lifecycle-actions"><button className="primary" disabled={busy===provider.id} onClick={()=>void decide(provider.id,"approved")}>{t("اعتماد","Approve")}</button><button className="danger" disabled={busy===provider.id||!reasons[provider.id]?.trim()} onClick={()=>void decide(provider.id,"rejected")}>{t("رفض","Reject")}</button><button className="danger" disabled={busy===provider.id||!reasons[provider.id]?.trim()} onClick={()=>void decide(provider.id,"suspended")}>{t("إيقاف","Suspend")}</button></div></article>)}</section>}
  </div></div>;
}