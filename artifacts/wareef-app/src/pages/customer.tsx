import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, ArrowRight, Camera, Check, ClipboardList, Flower2, Heart, Home, ImagePlus, Leaf, MapPin, Pause, Play, Upload,
  PartyPopper, Scissors, Shovel, SlidersHorizontal, Sprout, UserRound, Wrench, X,
} from "lucide-react";
import { services, type ServiceId } from "@/data/services";
import { ProductShowcase, productCatalogue } from "./ProductShowcase";
import "./customer.css";
import "./customer-extra.css";
import "./wareef-group.css";
import "./wareef-customer.css";
import { GardenPhotos } from "./GardenPhotos";
import BookingFlow from "./booking/BookingFlow";
import { clearDraftPhotos, emptyMaintenance, readBookingDraft, saveBookingDraft } from "./booking/booking-draft";
import "./booking/booking.css";

type Kind = "service" | "product";
type Item = { id: string; name: string; quantity: number };
type Intent = { kind: Kind; items: Item[]; details: string; language: "ar" | "en" };
type View = "home" | "hub" | "design" | "services" | "booking" | "products" | "review" | "orders" | "success";
type OrderBooking = {
  gardenName?: string;
  location: string;
  taskIds: string[];
  notes?: string;
  needs?: {
    approximateAreaM2?: number;
    shrubCount?: number;
    standingTreeCount?: number;
    stumpOrRootAreaCount?: number;
    treeAccessDetails?: string;
  };
  preferredTime: string;
  photoPaths?: string[];
};
type OrderStatus = "pending" | "accepted" | "rejected" | "completed" | "cancelled";
type Order = {
  id: string;
  kind: Kind;
  status: OrderStatus;
  createdAt: string;
  items?: Item[];
  providerId?: string | null;
  booking?: OrderBooking | null;
  responseReason?: string | null;
  respondedAt?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: "customer" | "provider" | null;
  completedAt?: string | null;
};
const STORAGE_KEY = "wareef_order_intent_v1";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (path: string) => `${basePath}${path}`;
const optionalDate = (value: string, english: boolean) => {
  const timestamp = Date.parse(value);
  return value && !Number.isNaN(timestamp) ? new Date(timestamp).toLocaleString(english ? "en-SA" : "ar-SA") : english ? "Not provided" : "غير مقدم";
};

const products = [
  { id: "ward-1", ar: "مونستيرا صغيرة", en: "Young Monstera", shopAr: "مشتل ورد الرياض", shopEn: "Ward Riyadh Nursery", image: "/images/products/ward-1.jpg" },
  { id: "ward-2", ar: "زاميا", en: "ZZ Plant", shopAr: "مشتل ورد الرياض", shopEn: "Ward Riyadh Nursery", image: "/images/products/ward-2.jpg" },
  { id: "bayt-1", ar: "بذور ريحان", en: "Basil Seeds", shopAr: "بيت البذور", shopEn: "Bayt Al Buthoor", image: "/images/products/bayt-1.jpg" },
  { id: "bayt-4", ar: "مجرفة صغيرة", en: "Hand Trowel", shopAr: "بيت البذور", shopEn: "Bayt Al Buthoor", image: "/images/products/bayt-4.jpg" },
  { id: "turab-1", ar: "مقص تقليم", en: "Pruning Shears", shopAr: "تراب وحديد", shopEn: "Turab & Hadid", image: "/images/products/turab-1.jpg" },
  { id: "rawda-2", ar: "ياسمين عربي", en: "Arabian Jasmine", shopAr: "روضة الموسم", shopEn: "Rawdat Al Mawsem", image: "/images/products/rawda-2.png" },
];

function readIntent(): Intent | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Intent;
    return (parsed.kind === "service" || parsed.kind === "product") && Array.isArray(parsed.items) ? parsed : null;
  } catch { return null; }
}
function saveIntent(intent: Intent) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
}
function makeKey() {
  const existing = sessionStorage.getItem("wareef_order_idempotency");
  if (existing) return existing;
  const key = crypto.randomUUID();
  sessionStorage.setItem("wareef_order_idempotency", key);
  return key;
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`brand${inverse ? " brand-inverse" : ""}`} aria-label="Wareef وريف"><b>وريف</b><span className="brand-divider">/</span><small>WAREEF</small></Link>;
}

export default function CustomerPage({ initialView }: { initialView?: View }) {
  const { isLoaded, isSignedIn } = useUser();
  const [, navigate] = useLocation();
  const restored = readIntent();
  const bookingDraft = readBookingDraft();
  const [english, setEnglish] = useState(bookingDraft?.language === "en" || restored?.language === "en");
  const [view, setView] = useState<View>(
    bookingDraft && (initialView === undefined || initialView === "review")
      ? "booking"
      : initialView ?? (restored?.items.length ? "review" : "home"),
  );
  const [bookingService, setBookingService] = useState<ServiceId>(bookingDraft?.entryServiceId ?? "maintenance");
  const [selectedServices, setSelectedServices] = useState<ServiceId[]>(
    restored?.kind === "service" ? restored.items.map(item => item.id).filter(id => services.some(s => s.id === id)) as ServiceId[] : [],
  );
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>(
    restored?.kind === "product" ? Object.fromEntries(restored.items.map(item => [item.id, item.quantity])) : {},
  );
  const [details, setDetails] = useState(restored?.details ?? "");
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");
  const [lastOrderWasDemo, setLastOrderWasDemo] = useState(false);
  const [designPhoto, setDesignPhoto] = useState("");
  const designInput = useRef<HTMLInputElement>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersState, setOrdersState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [demoProviders, setDemoProviders] = useState<Record<string, boolean>>({});
  const [demoResponding, setDemoResponding] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationBusy, setCancellationBusy] = useState("");
  const [cancellationError, setCancellationError] = useState("");
  const [ordersFreshAt, setOrdersFreshAt] = useState<Date | null>(null);
  const [ordersReload, setOrdersReload] = useState(0);
  const slides = ["/images/ghars-garden.jpg", "/images/wareef-garden-sunrise.jpg", "/images/wareef-garden-water.jpg"];

  useEffect(() => {
    if (paused || view !== "home" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setSlide(current => (current + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [paused, view]);
  useEffect(() => {
    if (view !== "orders" || !isSignedIn) return;
    let active = true;
    const load = async (quiet = false) => {
      if (!quiet) setOrdersState("loading");
      try {
        const response = await fetch("/api/orders", { credentials: "include" });
        if (!response.ok) throw new Error("orders");
        const data = await response.json();
        const rows = Array.isArray(data.orders) ? data.orders as Order[] : [];
        if (!active) return;
        setOrders(rows); setOrdersState("success"); setOrdersFreshAt(new Date());
        if (import.meta.env.DEV) {
          const ids = [...new Set(rows.map(row => row.providerId).filter((id): id is string => !!id))];
          const details = await Promise.all(ids.map(async id => {
            const provider = await fetch(`/api/service-providers/${encodeURIComponent(id)}`, { credentials: "include" });
            if (!provider.ok) return [id, false] as const;
            return [id, Boolean((await provider.json()).isDemo)] as const;
          }));
          if (active) setDemoProviders(Object.fromEntries(details));
        }
      } catch { if (active && !quiet) setOrdersState("error"); }
    };
    void load();
    const timer = window.setInterval(() => void load(true), 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [view, isSignedIn, ordersReload]);
  useEffect(() => () => { if (designPhoto) URL.revokeObjectURL(designPhoto); }, [designPhoto]);

  const serviceItems = selectedServices.map(id => {
    const service = services.find(item => item.id === id)!;
    return { id, name: english ? service.titleEn : service.titleAr, quantity: 1 };
  });
  const productItems = productCatalogue.filter(product => selectedProducts[product.id]).map(product => ({
    id: product.id, name: english ? product.en : product.ar, quantity: selectedProducts[product.id],
  }));
  const currentIntent = (): Intent => ({
    kind: view === "products" || (view === "review" && restored?.kind === "product") ? "product" : "service",
    items: view === "products" || (view === "review" && restored?.kind === "product") ? productItems : serviceItems,
    details,
    language: english ? "en" : "ar",
  });
  const openReview = (kind: Kind) => {
    const intent = { kind, items: kind === "service" ? serviceItems : productItems, details, language: english ? "en" as const : "ar" as const };
    if (!intent.items.length) return;
    saveIntent(intent);
    setView("review");
  };
  const submit = async () => {
    const intent = readIntent();
    if (!intent?.items.length) return;
    if (!isSignedIn) {
      saveIntent(intent);
      sessionStorage.setItem("wareef_return_to_review", "1");
      navigate("/sign-in");
      return;
    }
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: intent.kind, items: intent.items, details: intent.details || undefined, idempotencyKey: makeKey() }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || (english ? "The request could not be submitted." : "تعذر إرسال الطلب."));
      }
      const result = await response.json();
      setOrderId(result.id);
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem("wareef_return_to_review");
      sessionStorage.removeItem("wareef_order_idempotency");
      setView("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (english ? "The request could not be submitted." : "تعذر إرسال الطلب."));
    } finally { setSubmitting(false); }
  };
  const iconFor = (id: ServiceId) => id === "soil" ? Shovel : id === "trim" ? Scissors : id === "plant" ? Sprout : id === "party" ? PartyPopper : id === "custom" ? SlidersHorizontal : Wrench;
  const text = (ar: string, en: string) => english ? en : ar;
  const requestStatus = (status: OrderStatus) => ({
    pending: text("قيد الانتظار", "Pending"),
    accepted: text("مقبول", "Accepted"),
    rejected: text("مرفوض", "Rejected"),
    completed: text("مكتمل", "Completed"),
    cancelled: text("ملغي", "Cancelled"),
  }[status]);
  const demoRespond = async (order: Order, status: "accepted" | "rejected" | "completed" | "cancelled") => {
    const requiresReason = status === "rejected" || status === "cancelled";
    const reason = requiresReason ? window.prompt(status === "cancelled" ? text("سبب إلغاء طلب الاختبار (مطلوب، 1000 حرف كحد أقصى)","Reason for cancelling this test request (required, maximum 1000 characters)") : text("سبب رفض الطلب التجريبي (مطلوب)","Reason for rejecting this test request (required)"))?.trim() : "";
    if (requiresReason && !reason) return;
    if (status === "cancelled" && reason!.length > 1000) {
      setError(text("يجب ألا يتجاوز سبب الإلغاء 1000 حرف.", "Cancellation reason must be 1000 characters or fewer."));
      return;
    }
    setDemoResponding(order.id); setError("");
    try {
      const response = await fetch(`/api/demo/orders/${encodeURIComponent(order.id)}/respond`, { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status,...(reason?{reason}:{})}) });
      const data = await response.json().catch(()=>null);
      if (!response.ok) throw new Error(data?.error || text("تعذر تحديث الطلب التجريبي.","Could not update the test request."));
      setOrders(rows => rows.map(row => row.id === order.id ? { ...row, ...data.order } : row)); setOrdersFreshAt(new Date());
    } catch(cause) { setError(cause instanceof Error ? cause.message : text("تعذر تحديث الطلب التجريبي.","Could not update the test request.")); }
    finally { setDemoResponding(""); }
  };
  const cancelOrder = async (order: Order) => {
    const reason = cancellationReason.trim();
    if (!reason || reason.length > 1000) return;
    setCancellationBusy(order.id); setCancellationError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", reason }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 409) setOrdersReload(value => value + 1);
        throw new Error(data?.error || (response.status === 409
          ? text("تغيّرت حالة الطلب. تم تحديث القائمة؛ راجع الحالة الحالية.", "The request changed. The list was refreshed; review its current status.")
          : text("تعذر إلغاء الطلب.", "Could not cancel the request.")));
      }
      setOrders(rows => rows.map(row => row.id === order.id ? data.order : row));
      setOrdersFreshAt(new Date()); setCancellingOrderId(""); setCancellationReason("");
    } catch (cause) {
      setCancellationError(cause instanceof Error ? cause.message : text("تعذر إلغاء الطلب.", "Could not cancel the request."));
    } finally { setCancellationBusy(""); }
  };
  const DirectionIcon = english ? ArrowRight : ArrowLeft;
  const BackIcon = english ? ArrowLeft : ArrowRight;
  const startBooking = (id: ServiceId) => {
    const previous = readBookingDraft();
    if (previous?.maintenance.photoIds.length) void clearDraftPhotos(previous.maintenance.photoIds);
    saveBookingDraft({
      phase: "providers", entryServiceId: id, selectedServiceIds: [id],
      gardenName: "", location: "", needs: "", preferredTime: "",
      maintenance: emptyMaintenance(), language: english ? "en" : "ar",
    });
    setBookingService(id);
    setView("booking");
  };

  const Header = ({ dark = false }: { dark?: boolean }) => <header className={`top${dark ? " top-dark" : ""}`}><Brand inverse={dark}/><button className="lang" onClick={() => setEnglish(value => !value)}>{english ? "عربي" : "EN"}</button></header>;
  const Nav = () => <nav className="bottom customer-nav">
    <button className={view === "home" ? "active" : ""} onClick={() => setView("home")}><Home/>{text("الرئيسية","Home")}</button>
    <button className={view === "design" ? "active" : ""} onClick={() => setView("design")}><Flower2/>{text("التصميم","Design")}</button>
    <button className="reserve-now" onClick={() => setView("hub")}><Leaf/><span>{text("احجز الآن","Book now")}</span></button>
    <button className={view === "orders" ? "active" : ""} onClick={() => setView("orders")}><ClipboardList/>{text("طلباتي","Requests")}</button>
    <Link href="/account"><UserRound/>{text("حسابي","Account")}</Link>
  </nav>;

  if (view === "hub") return <div className="customer-app ghars wareef-customer" dir={english ? "ltr" : "rtl"}><div className="shell"><Header/><main className="screen needs-hub hub-refined"><div className="hub-intro"><p className="hub-kicker">{text("استكشف وريف","EXPLORE WAREEF")}</p><h1 className="form-title">{text("كيف نساعدك؟","How can we help?")}</h1><p className="small">{text("اختر القسم الذي يناسب احتياجك.","Choose a category to get started.")}</p></div><div className="needs-grid"><button className="need-card services" onClick={()=>setView("services")}><span className="need-icon"><Wrench/></span><span className="need-copy"><b>{text("الخدمات","Services")}</b><small>{text("احجز عناية لمساحتك","Book care for your space")}</small></span><i aria-hidden="true"><DirectionIcon/></i></button><button className="need-card products" onClick={()=>setView("products")}><span className="need-icon"><Leaf/></span><span className="need-copy"><b>{text("المنتجات","Products")}</b><small>{text("نباتات وأصص ومستلزمات","Plants, pots & essentials")}</small></span><i aria-hidden="true"><DirectionIcon/></i></button><button className="need-card subscriptions" disabled><span className="need-icon"><Heart/></span><span className="need-copy"><b>{text("الاشتراكات","Subscriptions")}</b><small>{text("غير متاحة حتى تكتمل تفاصيل التشغيل","Unavailable until operating details are finalized")}</small></span><i aria-hidden="true">—</i></button></div></main><Nav/></div></div>;
  if (view === "design") return <div className="customer-app ghars wareef-customer" dir={english ? "ltr" : "rtl"}><div className="shell"><Header/><main className="design-screen"><h1>{text("صمّم حديقتك","Design Your Garden")}</h1><p className="design-lede">{text("احتفظ بصورة مساحتك كمسودة خاصة ومحلية في هذه الصفحة.","Keep a photo of your space as a private, local draft on this page.")}</p><div className={`photo-uploader ${designPhoto ? "has-photo":""}`}>{designPhoto && <img src={designPhoto} alt={text("معاينة محلية لحديقتك","Local garden preview")}/>}<ImagePlus/><b>{designPhoto?text("الصورة جاهزة كمسودة محلية","Photo ready as a local draft"):text("ارفع صورة المساحة","Upload the space")}</b><small>{text("لا تغادر الصورة هذا المتصفح ولا تُرفع إلى الخادم.","The photo does not leave this browser and is not uploaded to the server.")}</small><div><button className="outline" onClick={()=>designInput.current?.click()}><Camera/>{text("اختيار صورة","Choose image")}</button></div><input ref={designInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{const file=event.target.files?.[0];if(!file)return;if(designPhoto)URL.revokeObjectURL(designPhoto);setDesignPhoto(URL.createObjectURL(file));event.target.value="";}}/></div><div className="notice">{text("إنشاء التصور بالذكاء الاصطناعي غير متاح حالياً. لن نعرض نتيجة وهمية.","AI concept generation is currently unavailable. No simulated result will be shown.")}</div><button className="cta" disabled><Upload/>{text("إنشاء التصور غير متاح","Concept generation unavailable")}</button></main><Nav/></div></div>;

  if (view === "orders") {
    return <div className="customer-app ghars wareef-customer" dir={english ? "ltr" : "rtl"}><Header/><main className="customer-screen">
      <h1>{text("طلباتي","My requests")}</h1>
      {!isLoaded || ordersState === "loading" ? <p className="lede">{text("جارٍ تحميل الطلبات…","Loading requests…")}</p>
        : !isSignedIn ? <section className="review-card"><p>{text("سجّل الدخول لعرض طلباتك الخاصة.","Sign in to view your private requests.")}</p><Link className="cta" href="/sign-in">{text("تسجيل الدخول","Sign in")}</Link></section>
        : ordersState === "error" ? <section className="submit-error" role="alert">{text("تعذر تحميل الطلبات. حاول مرة أخرى.","Requests could not be loaded. Try again.")}<button onClick={() => setOrdersReload(value => value + 1)}>{text("إعادة المحاولة","Retry")}</button></section>
        : orders.length === 0 ? <section className="review-card"><p>{text("لا توجد طلبات حتى الآن.","No requests yet.")}</p></section>
         : <><p className="orders-freshness">{ordersFreshAt ? `${text("آخر تحديث","Last updated")}: ${ordersFreshAt.toLocaleTimeString(english ? "en-SA" : "ar-SA")}` : text("جارٍ التحديث…","Refreshing…")}</p>{error && <p className="submit-error" role="alert">{error}</p>}<div className="orders-list">{orders.map(order => <article key={order.id} className="order-history-card"><span><b>{order.kind === "service" ? text("طلب خدمة","Service request") : text("طلب منتجات","Product request")}</b><small>{new Date(order.createdAt).toLocaleString(english ? "en-SA" : "ar-SA")}</small></span><em className={`request-status-${order.status}`}>{requestStatus(order.status)}</em>
          {order.providerId && demoProviders[order.providerId] && <div className="demo-request-banner"><b>مختص تجريبي / Test specialist</b><span>{text("هذا طلب اختبار صريح وليس حجزاً حقيقياً.","This is an explicit test request, not a real booking.")}</span></div>}
          {order.kind === "service" && order.booking && <div className="order-booking-summary">
            {order.providerId && <p><b>{text("المختص","Specialist")}</b><span>{order.providerId}</span></p>}
            {order.items?.length ? <p><b>{text("الخدمات","Services")}</b><span>{order.items.map(item => item.name).join("، ")}</span></p> : null}
            {order.booking.gardenName && <p><b>{text("اسم الحديقة","Garden name")}</b><span>{order.booking.gardenName}</span></p>}
            <p><b>{text("الموقع","Location")}</b><span>{order.booking.location || text("غير مقدم","Not provided")}</span></p>
            {!!order.booking.taskIds.length && <p><b>{text("مهام الصيانة","Maintenance tasks")}</b><span>{order.booking.taskIds.join("، ")}</span></p>}
            {order.booking.needs?.approximateAreaM2 !== undefined && <p><b>{text("المساحة التقريبية","Approximate area")}</b><span>{order.booking.needs.approximateAreaM2} m²</span></p>}
            {order.booking.needs?.shrubCount !== undefined && <p><b>{text("عدد الشجيرات","Shrub count")}</b><span>{order.booking.needs.shrubCount}</span></p>}
            {order.booking.needs?.standingTreeCount !== undefined && <p><b>{text("عدد الأشجار","Standing trees")}</b><span>{order.booking.needs.standingTreeCount}</span></p>}
            {order.booking.needs?.stumpOrRootAreaCount !== undefined && <p><b>{text("الجذوع / الجذور","Stumps / roots")}</b><span>{order.booking.needs.stumpOrRootAreaCount}</span></p>}
            {order.booking.needs?.treeAccessDetails && <p><b>{text("تفاصيل الوصول","Access details")}</b><span>{order.booking.needs.treeAccessDetails}</span></p>}
            {order.booking.notes && <p><b>{text("الملاحظات","Notes")}</b><span>{order.booking.notes}</span></p>}
            <p><b>{text("الوقت المفضّل","Preferred time")}</b><span>{optionalDate(order.booking.preferredTime, english)}</span></p>
            {!!order.booking.photoPaths?.length && <p><b>{text("صور الموقع","Site photos")}</b><span>{text(`${order.booking.photoPaths.length} صور محفوظة بأمان`,`${order.booking.photoPaths.length} privately stored photos`)}</span></p>}
          </div>}
          {order.responseReason && <p className="response-reason"><b>{text("سبب الرد","Response reason")}:</b> {order.responseReason}</p>}
          {order.respondedAt && <small className="response-time">{text("تم الرد","Responded")} {new Date(order.respondedAt).toLocaleString(english ? "en-SA" : "ar-SA")}</small>}
           {order.completedAt && <small className="response-time">{text("اكتمل الطلب","Completed")} {new Date(order.completedAt).toLocaleString(english ? "en-SA" : "ar-SA")}</small>}
           {order.cancellationReason && <p className="response-reason cancellation-reason"><b>{text("سبب الإلغاء","Cancellation reason")}:</b> {order.cancellationReason}</p>}
           {order.cancelledAt && <small className="response-time">{text("أُلغي الطلب","Cancelled")} {new Date(order.cancelledAt).toLocaleString(english ? "en-SA" : "ar-SA")} · {order.cancelledBy === "provider" ? text("بواسطة المختص","by specialist") : text("بواسطتك","by you")}</small>}
           {order.kind === "service" && (order.status === "pending" || order.status === "accepted") && (cancellingOrderId === order.id
             ? <div className="order-cancel-panel">
                 <label>{text("سبب الإلغاء (مطلوب)","Cancellation reason (required)")}<textarea maxLength={1000} value={cancellationReason} onChange={event => setCancellationReason(event.target.value)} placeholder={text("اكتب سبب الإلغاء…","Enter the reason for cancellation…")}/></label>
                 <small>{cancellationReason.length}/1000</small>
                 {cancellationError && <p role="alert">{cancellationError}</p>}
                 <div><button className="danger" disabled={cancellationBusy === order.id || !cancellationReason.trim()} onClick={() => void cancelOrder(order)}>{cancellationBusy === order.id ? text("جارٍ الإلغاء…","Cancelling…") : text("تأكيد إلغاء الطلب","Confirm cancellation")}</button><button disabled={cancellationBusy === order.id} onClick={() => { setCancellingOrderId(""); setCancellationReason(""); setCancellationError(""); }}>{text("العودة","Go back")}</button></div>
               </div>
             : <button className="order-cancel-trigger" onClick={() => { setCancellingOrderId(order.id); setCancellationReason(""); setCancellationError(""); }}>{text("إلغاء الطلب","Cancel request")}</button>)}
          {import.meta.env.DEV && order.status === "pending" && !!order.providerId && demoProviders[order.providerId] && <div className="demo-response-controls"><b>{text("أدوات اختبار للعميل صاحب الطلب فقط","Test controls for the originating customer only")}</b><button disabled={demoResponding === order.id} onClick={() => void demoRespond(order,"accepted")}>{text("اختبار القبول","Test accept")}</button><button disabled={demoResponding === order.id} onClick={() => void demoRespond(order,"rejected")}>{text("اختبار الرفض","Test reject")}</button></div>}
           {import.meta.env.DEV && order.status === "accepted" && !!order.providerId && demoProviders[order.providerId] && <div className="demo-response-controls"><b>{text("أدوات اختبار للحالة النهائية — لا توجد دفعة","Terminal-state test controls — no payment is taken")}</b><button disabled={demoResponding === order.id} onClick={() => window.confirm(text("تأكيد اكتمال طلب الاختبار؟ لا توجد دفعة.","Confirm this test request is complete? No payment is taken.")) && void demoRespond(order,"completed")}>{text("اختبار الإكمال","Test complete")}</button><button disabled={demoResponding === order.id} onClick={() => void demoRespond(order,"cancelled")}>{text("اختبار الإلغاء","Test cancel")}</button></div>}
         </article>)}</div></>}
    </main><Nav/></div>;
  }
  if (view === "review") {
    const intent = readIntent();
    if (!intent?.items.length) { setView("home"); return null; }
    return <div className="customer-app ghars wareef-customer" dir={english ? "ltr" : "rtl"}><Header/><main className="customer-screen review-screen">
      <button className="back icon-back" onClick={() => setView(intent.kind === "service" ? "services" : "products")}><span><BackIcon/></span>{text("رجوع وتعديل الاختيار","Back and edit")}</button>
      <p className="step">{text("المراجعة النهائية","FINAL REVIEW")}</p>
      <h1>{text("راجع طلبك","Review your request")}</h1>
      <p className="lede">{text("لم يتم الدفع أو تأكيد مختص. سيتم إرسال طلبك بحالة قيد الانتظار.","No payment is taken and no provider is confirmed. Your request will be submitted as pending.")}</p>
      <section className="review-card">
        {intent.items.map(item => <div className="review-item" key={item.id}><span><b>{item.name}</b><small>{text("السعر تُحدّد لاحقاً","Price to be determined later")}</small></span>{intent.kind === "product" && <strong>× {item.quantity}</strong>}</div>)}
        <label>{text("تفاصيل إضافية (اختياري)","Additional details (optional)")}<textarea value={details} onChange={event => { setDetails(event.target.value); saveIntent({...intent, details:event.target.value}); }}/></label>
      </section>
      {error && <p className="submit-error" role="alert">{error}</p>}
      <button className="cta" disabled={submitting || !isLoaded} onClick={submit}>{submitting ? text("جارٍ الإرسال…","Submitting…") : !isSignedIn ? text("تسجيل الدخول وإرسال الطلب","Sign in and submit request") : text("إرسال الطلب","Submit request")}</button>
      <p className="honest-note">{text("سيُطلب تسجيل الدخول فقط عند الإرسال. اختيارك محفوظ في علامة التبويب هذه وسيعود بعد تسجيل الدخول أو الرجوع.","Sign-in is required only on submit. Your selection stays in this tab through sign-in, cancel, or back.")}</p>
    </main><Nav/></div>;
  }
   if (view === "success") return <div className="customer-app ghars wareef-customer" dir={english ? "ltr" : "rtl"}><Header/><main className="customer-screen success"><span><Check/></span><h1>{lastOrderWasDemo ? text("تم استلام طلب الاختبار","Your test request was received") : text("تم استلام طلبك","Your request was received")}</h1><p>{lastOrderWasDemo ? text("هذا طلب اختبار لمختص تجريبي وليس حجزاً حقيقياً. حالته قيد الانتظار ولا توجد دفعة.","This is a test request for a test specialist, not a real booking. It is pending and no payment was taken.") : text("حالة الطلب: قيد الانتظار. هذا ليس تأكيداً من مختص، ولا توجد دفعة.","Status: pending. This is not provider confirmation and no payment was taken.")}</p>{orderId && <small>{text("رقم الطلب","Request ID")}: {orderId}</small>}<button className="cta" onClick={() => setView("home")}>{text("العودة للرئيسية","Back home")}</button></main></div>;
   if (view === "booking") return <div className="customer-app ghars wareef-customer" dir={english ? "ltr" : "rtl"}><div className="shell"><Header/><BookingFlow entryServiceId={bookingService} english={english} onExit={() => setView("services")} onComplete={(id, isDemo) => { setOrderId(id); setLastOrderWasDemo(isDemo); setView("success"); }}/><Nav/></div></div>;
  if (view === "services") return <div className="customer-app ghars wareef-customer" dir={english ? "ltr" : "rtl"}><Header/><main className="customer-screen"><button className="back icon-back" onClick={() => setView("home")}><span><BackIcon/></span>{text("رجوع","Back")}</button><h1>{text("جميع الخدمات","All services")}</h1><p className="lede">{text("اختر خدمة لعرض المختصين المعتمدين الذين يقدمونها.","Choose a service to see approved specialists who offer it.")}</p><div className="service-list">{services.map(service => { const Icon=iconFor(service.id); return <button key={service.id} onClick={() => startBooking(service.id)}><span className="service-symbol"><Icon/></span><span><b>{text(service.titleAr,service.titleEn)}</b><small>{text(service.descAr,service.descEn)}</small><em>{text("عرض المختصين","View specialists")}</em></span><i className="direction-circle"><DirectionIcon/></i></button>})}</div></main><Nav/></div>;
  if (view === "products") return <div className="customer-app ghars wareef-customer" dir={english ? "ltr" : "rtl"}><Header/><main className="customer-screen product-catalogue-screen"><button className="back icon-back" onClick={() => setView("home")}><span><BackIcon/></span>{text("رجوع","Back")}</button><p className="lede product-order-note">{text("استخدم رمز القلب لاختيار المنتجات لطلب الاستفسار. السعر والمخزون والتوصيل تُحدّد لاحقاً.","Use the heart to select products for an inquiry. Price, stock, and delivery are determined later.")}</p><ProductShowcase english={english} favoriteIds={Object.keys(selectedProducts).filter(id => selectedProducts[id] > 0)} onToggleFavorite={id => setSelectedProducts(value => ({...value,[id]:value[id] ? 0 : 1}))}/><button className="cta sticky-action" disabled={!productItems.length} onClick={() => openReview("product")}>{text(`مراجعة الطلب (${productItems.length})`,`Review request (${productItems.length})`)}</button></main><Nav/></div>;

  return <div className="customer-app ghars wareef-customer" dir={english ? "ltr" : "rtl"}><div className="shell">
    <Header dark/>
    <section className="hero carousel-hero" aria-roledescription="carousel">
      {slides.map((image,index)=><img key={image} className={slide===index?"hero-photo current":"hero-photo"} src={asset(image)} alt={slide===index?text("حديقة خضراء","Green garden"):""} aria-hidden={slide!==index}/>)}
      <div className="hero-scrim"/>
      <div className="hero-location"><MapPin/>{text("الرياض · العليا","Riyadh · Al Olaya")}</div>
      <div className="hero-copy"><h1>{text("حديقتك تستحق عناية تُرى","Your garden deserves care you can see")}</h1><p>{text("ابدأ اليوم، واجعل حديقتك مكانك المفضّل.","Start today and make your garden your favorite place.")}</p></div>
      <div className="carousel-controls"><button className="pause" onClick={()=>setPaused(value=>!value)} aria-label={text("إيقاف الشرائح","Pause slides")}>{paused?<Play/>:<Pause/>}</button><div className="dots">{slides.map((_,index)=><button key={index} className={index===slide?"dot active":"dot"} onClick={()=>{setSlide(index);setPaused(true)}} aria-label={`${index+1}`}/>)}</div></div>
    </section>
    <GardenPhotos english={english}/>
    <section className="section"><div className="section-head"><h2>{text("ماذا تحتاج اليوم؟","What does your space need?")}</h2></div><div className="services">{(["trim","plant","custom","maintenance","party"] as ServiceId[]).map(id=>{const service=services.find(item=>item.id===id)!;const Icon=iconFor(id);return <button className="service" key={id} onClick={()=>startBooking(id)}><Icon/>{text(service.titleAr,service.titleEn)}</button>})}</div><button className="all-services-link" onClick={()=>setView("services")}>{text("تصفح جميع الخدمات","Browse all services")} <span className="round-arrow"><DirectionIcon/></span></button></section>
    <ProductShowcase english={english} favoriteIds={Object.keys(selectedProducts).filter(id=>selectedProducts[id]>0)} onToggleFavorite={id=>setSelectedProducts(value=>({...value,[id]:value[id]?0:1}))}/>
    {productItems.length>0&&<section className="section"><button className="cta" onClick={()=>openReview("product")}>{text(`مراجعة طلب المنتجات (${productItems.length})`,`Review product request (${productItems.length})`)}</button></section>}
    <section className="farm-section"><div className="farm-photo" style={{backgroundImage:`url(${asset("/images/wareef-farm-field.jpg")})`}}/><div className="farm-content"><h2>{text("للمزرعة احتياجها الخاص","Farms have their own needs")}</h2><p>{text("من تجهيز الأرض إلى الري والعناية الموسمية، يبدأ العمل بعد مراجعة موقعك.","From ground preparation to irrigation and seasonal care, work starts after reviewing your site.")}</p><div className="farm-actions"><button className="cta" disabled>{text("خدمات المزارع قريباً","Farm services coming soon")}</button></div></div></section>
    <Nav/>
  </div></div>;
}