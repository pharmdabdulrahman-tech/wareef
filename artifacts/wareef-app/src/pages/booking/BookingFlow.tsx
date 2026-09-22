import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import {
  ArrowLeft, ArrowRight, Check, CircleAlert, Clock3, MapPin, Shovel,
  PartyPopper, Scissors, SlidersHorizontal, Sprout, Star, UserRound, Wrench,
} from "lucide-react";
import { services, type ServiceId } from "@/data/services";
import {
  clearBookingDraft, clearDraftPhotos, emptyMaintenance, getDraftPhoto,
  readBookingDraft, saveBookingDraft, type BookingDraft, type ProviderSort, type ServiceProvider,
} from "./booking-draft";
import { GardenPhotoField, MaintenanceForm, MaintenanceSummary, maintenanceValid } from "./MaintenanceDetails";

const serviceIds = new Set(services.map(service => service.id));
const iconFor = (id: ServiceId) => id === "soil" ? Shovel : id === "trim" ? Scissors : id === "plant" ? Sprout : id === "party" ? PartyPopper : id === "custom" ? SlidersHorizontal : Wrench;
const optionalDate = (value: string, english: boolean) => {
  const timestamp = Date.parse(value);
  return value && !Number.isNaN(timestamp) ? new Date(timestamp).toLocaleString(english ? "en-SA" : "ar-SA") : english ? "Not provided" : "غير مقدم";
};

function initialDraft(entryServiceId: ServiceId, english: boolean): BookingDraft {
  const restored = readBookingDraft();
  if (restored) return restored;
  return {
    phase: "providers", entryServiceId, selectedServiceIds: [entryServiceId],
    gardenName: "", location: "", needs: "", preferredTime: "",
    maintenance: emptyMaintenance(), language: english ? "en" : "ar",
  };
}

function parseProviders(value: unknown): ServiceProvider[] {
  const rows = Array.isArray(value) ? value : value && typeof value === "object" && Array.isArray((value as { providers?: unknown }).providers) ? (value as { providers: unknown[] }).providers : [];
  return rows.filter((row): row is ServiceProvider => {
    if (!row || typeof row !== "object") return false;
    const item = row as Partial<ServiceProvider>;
    return typeof item.id === "string" && typeof item.name === "string" && Array.isArray(item.serviceIds);
  });
}

function compareNullable(a: number | null, b: number | null, descending = false) {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return descending ? b - a : a - b;
}

export default function BookingFlow({ entryServiceId, english, onExit, onComplete }: {
  entryServiceId: ServiceId; english: boolean; onExit: () => void; onComplete: (id: string, isDemo: boolean) => void;
}) {
  const { isLoaded, isSignedIn } = useUser();
  const [, navigate] = useLocation();
  const [draft, setDraft] = useState(() => initialDraft(entryServiceId, english));
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [providerState, setProviderState] = useState<"loading" | "ready" | "error">("loading");
  const [providerReload, setProviderReload] = useState(0);
  const [sort, setSort] = useState<ProviderSort>("fastest");
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const text = (ar: string, en: string) => english ? en : ar;
  const BackIcon = english ? ArrowLeft : ArrowRight;

  const update = (patch: Partial<BookingDraft>) => setDraft(current => ({ ...current, ...patch, language: english ? "en" : "ar" }));
  useEffect(() => saveBookingDraft(draft), [draft]);
  useEffect(() => {
    setDraft(current => current.language === (english ? "en" : "ar") ? current : { ...current, language: english ? "en" : "ar" });
  }, [english]);
  useEffect(() => {
    if (draft.phase !== "providers") return;
    const controller = new AbortController();
    setProviderState("loading");
    fetch(`/api/service-providers?serviceId=${encodeURIComponent(draft.entryServiceId)}`, { credentials: "include", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("providers");
        setProviders(parseProviders(await response.json()));
        setProviderState("ready");
      })
      .catch(cause => { if (cause instanceof DOMException && cause.name === "AbortError") return; setProviderState("error"); });
    return () => controller.abort();
  }, [draft.entryServiceId, draft.phase, providerReload]);

  const sortedProviders = useMemo(() => providers.slice().sort((a, b) => {
    if (sort === "cheapest") return compareNullable(a.servicePrices?.[draft.entryServiceId] ?? null, b.servicePrices?.[draft.entryServiceId] ?? null);
    if (sort === "rated") return compareNullable(a.rating, b.rating, true);
    const first = a.earliestAvailableAt ? Date.parse(a.earliestAvailableAt) : null;
    const second = b.earliestAvailableAt ? Date.parse(b.earliestAvailableAt) : null;
    return compareNullable(Number.isNaN(first) ? null : first, Number.isNaN(second) ? null : second);
  }), [providers, sort]);

  const availableServices = services.filter(service => draft.provider?.serviceIds.includes(service.id));
  const selectedServices = services.filter(service => draft.selectedServiceIds.includes(service.id));
  const back = () => {
    if (draft.phase === "summary") update({ phase: "details" });
    else if (draft.phase === "details") update({ phase: "services" });
    else if (draft.phase === "services") update({ phase: "providers", provider: undefined, selectedServiceIds: [draft.entryServiceId] });
    else onExit();
  };

  async function uploadPhotos(): Promise<string[]> {
    if (!draft.maintenance.photoIds.length) return [];
    const files = (await Promise.all(draft.maintenance.photoIds.map(getDraftPhoto))).filter((file): file is File => !!file);
    if (files.length !== draft.maintenance.photoIds.length) throw new Error(text("تعذر قراءة بعض الصور المحلية. أعد اختيارها.", "Some local photos could not be read. Please choose them again."));
    return Promise.all(files.map(async file => {
      const request = await fetch("/api/storage/uploads/request-url", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!request.ok) throw new Error(text("تعذر تجهيز رفع الصور بأمان. لم يتم إرسال الطلب.", "A secure photo upload could not be prepared. The request was not submitted."));
      const upload = await request.json() as { uploadURL?: string; objectPath?: string };
      if (!upload.uploadURL || !upload.objectPath) throw new Error(text("استجابة رفع الصور غير صالحة.", "The photo upload response was invalid."));
      const response = await fetch(upload.uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) throw new Error(text("تعذر رفع الصور بأمان. لم يتم إرسال الطلب.", "Photos could not be uploaded securely. The request was not submitted."));
      return upload.objectPath;
    }));
  }

  async function submit() {
    if (!draft.provider) return;
    const demo = draft.provider.isDemo;
    if (!demo && (!draft.location.trim() || !draft.preferredTime ||
      (draft.selectedServiceIds.includes("maintenance") && !maintenanceValid(draft.maintenance)))) return;
    if (!isSignedIn) {
      saveBookingDraft({ ...draft, phase: "summary" });
      navigate("/sign-in");
      return;
    }
    setSubmitting(true); setError("");
    try {
      const photoPaths = await uploadPhotos();
      const items = selectedServices.map(service => ({ id: service.id, name: english ? service.titleEn : service.titleAr, quantity: 1 }));
      const maintenanceNeeds = draft.selectedServiceIds.includes("maintenance") ? {
        ...(draft.maintenance.area ? { approximateAreaM2: Number(draft.maintenance.area) } : {}),
        ...(draft.maintenance.shrubs ? { shrubCount: Number(draft.maintenance.shrubs) } : {}),
        ...(draft.maintenance.trees ? { standingTreeCount: Number(draft.maintenance.trees) } : {}),
        ...(draft.maintenance.stumps ? { stumpOrRootAreaCount: Number(draft.maintenance.stumps) } : {}),
        ...(draft.maintenance.treeDetails ? { treeAccessDetails: draft.maintenance.treeDetails } : {}),
      } : undefined;
      const response = await fetch("/api/orders", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "service", items, details: draft.needs || undefined, providerId: draft.provider.id,
          idempotencyKey: sessionStorage.getItem("wareef_order_idempotency") || (() => { const key = crypto.randomUUID(); sessionStorage.setItem("wareef_order_idempotency", key); return key; })(),
          booking: {
            gardenName: draft.gardenName || undefined, location: draft.location,
            taskIds: draft.selectedServiceIds.includes("maintenance") ? draft.maintenance.tasks : [],
            notes: [draft.needs, draft.maintenance.note].filter(Boolean).join("\n\n") || undefined,
            needs: maintenanceNeeds, preferredTime: draft.preferredTime,
            photoPaths: photoPaths.length ? photoPaths : undefined,
          },
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || text("تعذر إرسال الطلب.", "The request could not be submitted."));
      await clearDraftPhotos(draft.maintenance.photoIds);
      clearBookingDraft();
      sessionStorage.removeItem("wareef_order_idempotency");
       onComplete(result.id, draft.provider.isDemo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text("تعذر إرسال الطلب.", "The request could not be submitted."));
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="customer-screen booking-flow">
    <button className="back icon-back" onClick={back} aria-label={text("رجوع", "Back")}><span><BackIcon /></span>{text("رجوع", "Back")}</button>
    {draft.phase === "providers" && <>
      <div className="step">{text(services.find(x => x.id === draft.entryServiceId)?.titleAr || "", services.find(x => x.id === draft.entryServiceId)?.titleEn || "")}</div>
      <h1 className="form-title">{text("مختصون يقدمون هذه الخدمة", "Specialists for this service")}</h1>
       <div className="sorts">{(["fastest", "rated", "cheapest"] as ProviderSort[]).map(value => <button key={value} className={sort === value ? "on" : ""} onClick={() => setSort(value)}>{value === "fastest" ? text("الأسرع", "Fastest") : value === "rated" ? text("الأعلى تقييماً", "Highest rated") : text("الأقل سعراً", "Cheapest")}</button>)}</div>
      {providerState === "loading" ? <div className="provider-empty"><p>{text("جارٍ تحميل المختصين…", "Loading specialists…")}</p></div>
        : providerState === "error" ? <div className="provider-empty"><CircleAlert /><h2>{text("تعذر تحميل المختصين", "Could not load specialists")}</h2><button className="outline" onClick={() => setProviderReload(value => value + 1)}>{text("إعادة المحاولة", "Try again")}</button></div>
        : !sortedProviders.length ? <div className="provider-empty"><UserRound /><h2>{text("لا يوجد مختصون معتمدون لهذه الخدمة حالياً", "No approved specialists are currently available for this service")}</h2><p>{text("يمكنك الرجوع واختيار خدمة أخرى.", "Go back to choose another service.")}</p></div>
        : <div className="shop-results">{sortedProviders.map(provider => <article className="shop-card" key={provider.id}>
          <div className="shop-image" style={provider.imageUrl ? { backgroundImage: `url("${provider.imageUrl}")` } : undefined}>{!provider.imageUrl && <UserRound aria-hidden="true" />}{provider.rating !== null && <span className="corner-rating"><Star /> {provider.rating}</span>}</div>
           <div className="shop-details"><b>{provider.name}</b>{provider.isDemo && <span className="tag">مختص تجريبي / Test specialist</span>}
            {provider.distanceKm !== null && <p><MapPin /> {provider.distanceKm} km</p>}
            {provider.earliestAvailableAt && <p><Clock3 /> {new Date(provider.earliestAvailableAt).toLocaleString(english ? "en-SA" : "ar-SA")}</p>}
             <strong>{provider.servicePrices?.[draft.entryServiceId] === null || provider.servicePrices?.[draft.entryServiceId] === undefined ? text("السعر معلّق — يُحدّد لاحقاً", "Unknown — pricing pending") : `${provider.servicePrices[draft.entryServiceId]} ${text("ر.س", "SAR")}`}</strong>
            <button className="outline" onClick={() => update({ provider, selectedServiceIds: [draft.entryServiceId], phase: "services" })}>{text("اختر هذا المختص", "Choose this specialist")}</button>
          </div>
        </article>)}</div>}
    </>}
    {draft.phase === "services" && draft.provider && <>
      <div className="provider-profile"><div className="provider-avatar" style={draft.provider.imageUrl ? { backgroundImage: `url("${draft.provider.imageUrl}")` } : undefined}>{!draft.provider.imageUrl && <UserRound />}</div><div><h2>{draft.provider.name}</h2>{draft.provider.rating !== null && <span className="rating"><Star /> {draft.provider.rating}/5</span>}</div></div>
      <section className="section shop-services"><h2>{text("اختر الخدمات", "Choose services")}</h2>
         {availableServices.map(service => { const checked = draft.selectedServiceIds.includes(service.id); const Icon = iconFor(service.id); const price = draft.provider?.servicePrices?.[service.id]; return <label className={`service-check ${checked ? "checked" : ""}`} key={service.id}><input type="checkbox" checked={checked} onChange={() => update({ selectedServiceIds: checked ? draft.selectedServiceIds.filter(id => id !== service.id) : [...draft.selectedServiceIds, service.id] })} /><div className="service-symbol"><Icon /></div><span><b>{text(service.titleAr, service.titleEn)}</b><small>{price === null || price === undefined ? text("السعر معلّق", "Pricing pending") : `${price} ${text("ر.س", "SAR")}`}</small></span><i><Check /></i></label>; })}
        <div className="service-running-total"><div><span>{text("تسعير الخدمات", "Service pricing")}</span><strong>{text("تُحدّد لاحقاً", "To be determined later")}</strong></div></div>
        <p className="selection-error">{draft.selectedServiceIds.length ? "" : text("اختر خدمة واحدة على الأقل للمتابعة", "Choose at least one service to continue")}</p>
        <button className="cta" disabled={!draft.selectedServiceIds.length} onClick={() => update({ phase: "details" })}>{text("متابعة للحجز", "Continue to booking")}</button>
      </section>
    </>}
    {draft.phase === "details" && <>
      <div className="step">STEP 1 OF 2</div><h1 className="form-title">{text("عرّفنا على حديقتك", "Introduce us to your garden")}</h1><p className="lede">{text("تفاصيل بسيطة تساعد المختص على الوصول مستعداً.", "A few details help your specialist arrive prepared.")}</p>
      {draft.provider?.isDemo && <p className="demo-optional-note">جميع التفاصيل اختيارية لهذا الاختبار / All details are optional for this test</p>}
      <div className="form-card booking-form">
        <label>{text("الخدمات المطلوبة", "Services needed")}</label><div className="selected-service-list">{selectedServices.map(service => <span key={service.id}>{text(service.titleAr, service.titleEn)}</span>)}</div>
        <label>{text("اسم الحديقة (اختياري)", "Garden name (optional)")}<input value={draft.gardenName} onChange={e => update({ gardenName: e.target.value })} placeholder={text("مثال: حديقة بيت الندى", "e.g. Neda House Garden")} /></label>
        <label>{text("الموقع", "Location")}<input value={draft.location} onChange={e => update({ location: e.target.value })} /></label>
        {draft.selectedServiceIds.includes("maintenance") && <MaintenanceForm english={english} value={draft.maintenance} onChange={maintenance => update({ maintenance })} showErrors={showErrors} />}
        {!draft.selectedServiceIds.includes("maintenance") && <GardenPhotoField english={english} photoIds={draft.maintenance.photoIds} onChange={photoIds => update({ maintenance: { ...draft.maintenance, photoIds } })} />}
        <label>{text("ما الذي يحتاج عناية؟", "What should be cared for?")}<textarea value={draft.needs} onChange={e => update({ needs: e.target.value })} /></label>
        <label>{text("وقت الزيارة المفضّل", "Preferred visit time")}<input type="datetime-local" value={draft.preferredTime} onChange={e => update({ preferredTime: e.target.value })} /></label>
      </div>
      <button className="cta full space-top" disabled={!draft.provider?.isDemo && (!draft.location.trim() || !draft.preferredTime)} onClick={() => { if (!draft.provider?.isDemo && draft.selectedServiceIds.includes("maintenance") && !maintenanceValid(draft.maintenance)) { setShowErrors(true); return; } setShowErrors(false); update({ phase: "summary" }); }}>{text("مراجعة الطلب", "Review request")}</button>
    </>}
    {draft.phase === "summary" && draft.provider && <>
       <div className="step">{draft.provider.isDemo ? "مختص تجريبي / TEST SPECIALIST" : text("التسعير قيد التحديد", "PRICING PENDING")}</div><h1 className="form-title">{draft.provider.isDemo ? text("راجع طلب الاختبار", "Review test request") : text("راجع طلبك بانتظار تحديد السعر", "Review your pricing-pending request")}</h1>
      <div className="quote-card"><div className="row"><b>{draft.provider.name}</b><strong>{text("تُحدّد لاحقاً", "To be determined later")}</strong></div><hr />
        {selectedServices.map(service => <div className="row small" key={service.id}><span>{text(service.titleAr, service.titleEn)}</span><b>{text("تُحدّد لاحقاً", "To be determined later")}</b></div>)}
        {draft.selectedServiceIds.includes("maintenance") && <MaintenanceSummary english={english} value={draft.maintenance} />}
        <div className="row small"><span>{text("الموقع", "Location")}</span><b>{draft.location || text("غير مقدم", "Not provided")}</b></div>
        <div className="row small"><span>{text("الوقت المفضّل", "Preferred time")}</span><b>{optionalDate(draft.preferredTime, english)}</b></div>
      </div>
       <div className="notice">{draft.provider.isDemo ? text("هذا طلب اختبار صريح لمختص تجريبي، وليس حجزاً حقيقياً. لا يتم الدفع.", "This is an explicit test request for a test specialist, not a real booking. No payment is taken.") : text("لا يتم الدفع أو تأكيد المختص الآن. سيبقى الطلب قيد الانتظار حتى يؤكده المختص فعلياً.", "No payment or provider confirmation happens now. The request remains pending until the specialist genuinely confirms it.")}</div>
      {error && <p className="submit-error" role="alert">{error}</p>}
      <button className="cta full space-top" disabled={submitting || !isLoaded} onClick={submit}>{submitting ? text("جارٍ الإرسال…", "Submitting…") : !isSignedIn ? text("تسجيل الدخول وإرسال الطلب", "Sign in and submit request") : text("إرسال طلب الحجز", "Submit booking request")}</button>
    </>}
  </main>;
}