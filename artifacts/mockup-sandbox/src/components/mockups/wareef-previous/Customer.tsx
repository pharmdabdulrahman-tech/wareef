import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  CircleHelp,
  ClipboardList,
  Droplets,
  Flower2,
  Heart,
  Home,
  Leaf,
  LockKeyhole,
  MapPin,
  Pause,
  Play,
  PartyPopper,
  ReceiptText,
  Scissors,
  Send,
  Settings,
  ShieldCheck,
  Shovel,
  SlidersHorizontal,
  Sprout,
  Tractor,
  Wrench,
  UserRound,
} from "lucide-react";
import "./_group.css";
import "./Customer.css";
import { WareefBrand } from "./_shared";
import { GardenPhotos } from "./_GardenPhotos";
import { DesignJourney, LocalDesign } from "./_DesignJourney";
import { DemoRequest, demoStore, statusText, useDemoState } from "./_demoStore";
import {
  productCatalogue,
  productImageUrl,
  ProductShowcase,
} from "./ProductShowcase";
import {
  emptyMaintenance,
  MaintenanceForm,
  maintenanceHasQuote,
  MaintenanceSummary,
  maintenanceValid,
} from "./_MaintenanceDetails";
type ServiceKey =
  "soil" | "trim" | "plant" | "maintenance" | "custom" | "party";
type View =
  | "hub"
  | "catalogue"
  | "products"
  | "favorites"
  | "subscriptions"
  | "indoor"
  | "indoorDetail"
  | "home"
  | "shops"
  | "profile"
  | "form"
  | "quote"
  | "confirmed"
  | "farmServices"
  | "farmForm"
  | "farmConfirmed"
  | "design"
  | "requests"
  | "account";
type Sort = "nearby" | "rated" | "early";
type RequestCategory = "quotes" | "upcoming" | "ongoing" | "completed";
const copy = {
  ar: {
    home: "الرئيسية",
    design: "التصميم",
    orders: "طلباتي",
    account: "حسابي",
    back: "رجوع",
    title: "حديقتك تستحق عناية تُرى",
    sub: "ابدأ اليوم، واجعل حديقتك مكانك المفضّل.",
    services: "ماذا تحتاج اليوم؟",
    near: "مختصون قريبون منك",
    intro: "عرّفنا على حديقتك",
    introSub: "تفاصيل بسيطة تساعد المختص على الوصول مستعداً.",
    garden: "اسم الحديقة (اختياري)",
    gardenP: "مثال: حديقة بيت الندى",
    service: "الخدمات المطلوبة",
    location: "الموقع",
    details: "ما الذي يحتاج عناية؟",
    continue: "متابعة للحجز",
    confirm: "إرسال طلب الحجز",
    perVisit: "للزيارة",
    perTree: "للشجرة",
    perArea: "حتى 25 م²",
    shops: "مختصون يقدمون هذه الخدمة",
    sortNear: "الأقرب",
    sortRated: "الأعلى تقييماً",
    sortEarly: "الأقرب موعداً",
    selectShop: "اختر هذا المختص",
    chooseOne: "اختر خدمة واحدة على الأقل للمتابعة",
    available: "متاح",
    quoteOnly: "عرض سعر بعد المعاينة",
    summary: "ملخص الحجز",
    ready: "راجع طلب الحجز",
    suggested: "الموعد المقترح",
    demo: "نموذج للعرض فقط — لا يتم حجز خدمة حقيقية.",
    held: "تم إرسال طلب الحجز",
    reminder: "سنرسل تذكيراً قبل الزيارة.",
    farmKicker: "FARM SERVICES · خدمات المزارع",
    farmTitle: "للمزرعة احتياجها الخاص",
    farmSub:
      "من تجهيز الأرض إلى الري والعناية الموسمية، يبدأ العمل بعرض واضح بعد مراجعة موقعك.",
    farmBrowse: "تصفح خدمات المزارع",
    farmRequest: "اطلب عرض سعر للمزرعة",
    farmServices: "خدمات المزارع",
    farmIntro: "عرّفنا على مزرعتك",
    farmArea: "مساحة الأرض",
    unit: "الوحدة",
    crops: "المحاصيل أو الأشجار (اختياري)",
    work: "العمل المطلوب",
    photos: "صور الموقع",
    date: "التاريخ المفضّل",
    sendQuote: "إرسال طلب عرض السعر",
    quoteSent: "تم استلام طلب عرض السعر",
    quoteNote: "نموذج أولي — لا يتم إرسال الطلب إلى مختص فعلي.",
    farmNotice: "نراجع التفاصيل أولاً ثم يشاركك المختص عرض السعر المناسب.",
  },
  en: {
    home: "Home",
    design: "Design",
    orders: "My Requests",
    account: "Account",
    back: "Back",
    title: "Your garden deserves care you can see",
    sub: "Start today and make your garden your favorite place.",
    services: "What does your space need?",
    near: "Gardeners near you",
    intro: "Introduce us to your garden",
    introSub: "A few details help your gardener arrive prepared.",
    garden: "Garden name (optional)",
    gardenP: "e.g. Neda House Garden",
    service: "Services needed",
    location: "Location",
    details: "What should be cared for?",
    continue: "Continue to booking",
    confirm: "Submit booking request",
    perVisit: "per visit",
    perTree: "per tree",
    perArea: "up to 25 m²",
    shops: "Specialists for this service",
    sortNear: "Nearby",
    sortRated: "Top rated",
    sortEarly: "Earliest available",
    selectShop: "Choose this specialist",
    chooseOne: "Choose at least one service to continue",
    available: "Available",
    quoteOnly: "Quote after assessment",
    summary: "Booking summary",
    ready: "Review booking request",
    suggested: "Suggested time",
    demo: "Demo only — no real service is booked.",
    held: "Booking request submitted",
    reminder: "We’ll remind you before the visit.",
    farmKicker: "FARM SERVICES · خدمات المزارع",
    farmTitle: "Farms need their own kind of care",
    farmSub:
      "From land preparation to irrigation and seasonal care, work begins with a clear quote after we review your site.",
    farmBrowse: "Browse farm services",
    farmRequest: "Request a farm quote",
    farmServices: "Farm services",
    farmIntro: "Tell us about your farm",
    farmArea: "Land area",
    unit: "Unit",
    crops: "Crops or trees (optional)",
    work: "Work required",
    photos: "Site photos",
    date: "Preferred date",
    sendQuote: "Send quote request",
    quoteSent: "Your quote request is received",
    quoteNote: "Prototype only — no request is sent to a live specialist.",
    farmNotice:
      "We review the details first, then a specialist shares the right quote.",
  },
};

function CustomerRequestActions({ request, english, onRebook }: { request: DemoRequest; english: boolean; onRebook: () => void }) {
  const [time, setTime] = useState(request.preferredTime ?? "");
  const [timeDirty, setTimeDirty] = useState(false);
  useEffect(() => {
    if (!timeDirty) setTime(request.preferredTime ?? "");
  }, [request.preferredTime, timeDirty]);
  const confirmCancel = () => {
    const message = english
      ? "Cancel this request? No payment was collected, so no refund is needed."
      : "إلغاء هذا الطلب؟ لم يتم تحصيل أي دفعة، لذلك لا يلزم استرداد.";
    if (!window.confirm(message)) return;
    const reason = window.prompt(english ? "Cancellation reason (optional)" : "سبب الإلغاء (اختياري)") ?? undefined;
    demoStore.cancel(request.id, "customer", reason, "waleed");
  };
  const proposal = request.timeProposal;
  const canCancel = ["pending", "quoted", "booked"].includes(request.status);
  return <div className="request-policy-actions">
    {request.status === "pending" && <>
      <p className="policy-note">{english ? "Before provider confirmation, you may change the preferred time or cancel without a fee. Cancellation cutoff and fees are not set." : "قبل تأكيد المختص يمكنك تغيير الوقت المفضّل أو الإلغاء دون رسوم. مهلة الإلغاء ورسومه غير محددتين بعد."}</p>
      <div className="time-action"><input aria-label={english ? "New preferred time" : "وقت مفضّل جديد"} type="datetime-local" value={time} onChange={e => { setTime(e.target.value); setTimeDirty(true); }}/><button className="outline" disabled={!time || time === request.preferredTime} onClick={() => { if (demoStore.changePendingPreferredTime(request.id, time)) setTimeDirty(false); }}>{english ? "Update preferred time" : "تحديث الوقت المفضّل"}</button></div>
    </>}
    {request.status === "booked" && !proposal?.status?.includes("pending") && <>
      <p className="policy-note">{english ? "A new-time request does not change the confirmed appointment until the provider accepts it." : "طلب وقت جديد لا يغيّر الموعد المؤكد حتى يقبله المختص."}</p>
      <div className="time-action"><input aria-label={english ? "Proposed time" : "الوقت المقترح"} type="datetime-local" value={time} onChange={e => { setTime(e.target.value); setTimeDirty(true); }}/><button className="outline" disabled={!time || time === request.preferredTime} onClick={() => { if (demoStore.proposeTime(request.id, "customer", time)) setTimeDirty(false); }}>{english ? "Propose new time" : "اقتراح وقت جديد"}</button></div>
    </>}
    {proposal?.status === "pending" && <div className="proposal-box"><b>{english ? "Pending time proposal" : "اقتراح وقت معلّق"}</b><span>{new Date(proposal.proposedTime).toLocaleString(english ? "en-SA" : "ar-SA")} · {proposal.proposedBy === "customer" ? (english ? "proposed by you" : "اقترحته أنت") : (english ? "proposed by provider" : "اقترحه المختص")}</span>{proposal.proposedBy === "provider" && <div className="policy-buttons"><button className="cta compact" onClick={() => { const check=demoStore.availabilityFor(request.id,proposal.proposedTime); if(!check.ok){window.alert(english?"The proposed time is no longer available. Please choose another time.":"الوقت المقترح لم يعد متاحاً. يرجى اختيار وقت آخر.");return;} demoStore.respondToTimeProposal(request.id, "customer", true); }}>{english ? "Accept new time" : "قبول الوقت الجديد"}</button><button className="outline" onClick={() => demoStore.respondToTimeProposal(request.id, "customer", false)}>{english ? "Reject" : "رفض"}</button></div>}<small>{english ? "The original appointment remains in place until accepted." : "يبقى الموعد الأصلي سارياً حتى القبول."}</small></div>}
    {proposal && proposal.status !== "pending" && <p className="policy-note">{proposal.status === "accepted" ? (english ? "New time accepted by both parties." : "قُبل الوقت الجديد من الطرفين.") : (english ? "Time proposal rejected; original appointment remains." : "رُفض اقتراح الوقت؛ يبقى الموعد الأصلي.")}</p>}
    {request.adminNoResponseDemo && <div className="proposal-box"><b>{english ? "Admin demo: no response simulated" : "محاكاة إدارية: عدم استجابة"}</b><span>{english ? "This is not a production timer. The actual response deadline policy is awaiting shop discussions and remains unset. You may compare alternatives; nothing changes automatically." : "هذه ليست مؤقتاً إنتاجياً. سياسة مهلة الرد الفعلية بانتظار نقاش المتاجر وما زالت غير محددة. يمكنك مقارنة البدائل؛ لا يتغير شيء تلقائياً."}</span><button className="outline" onClick={onRebook}>{english ? "Review other providers" : "مراجعة مختصين آخرين"}</button></div>}
    {canCancel && <button className="danger-outline" onClick={confirmCancel}>{english ? "Cancel request" : "إلغاء الطلب"}</button>}
    {["cancelled", "declined"].includes(request.status) && <div className="proposal-box"><b>{request.status === "declined" ? (english ? "The provider declined this request" : "اعتذر المختص عن هذا الطلب") : (english ? "This request is cancelled" : "هذا الطلب ملغي")}</b>{request.cancellation?.reason && <span>{english ? "Reason" : "السبب"}: {request.cancellation.reason}</span>}{request.decline?.reason && <span>{english ? "Reason" : "السبب"}: {request.decline.reason}</span>}<span>{english ? "No payment was collected; no refund is needed. Choose a provider to make a separate new request. Pricing is to be determined later; we never switch providers automatically." : "لم يتم تحصيل دفعة؛ لا يلزم استرداد. اختر مختصاً لإنشاء طلب جديد منفصل. تُحدّد الأسعار لاحقاً، ولا نبدّل المختص تلقائياً."}</span><button className="cta compact" onClick={onRebook}>{english ? "Choose provider & rebook" : "اختيار مختص وإعادة الحجز"}</button></div>}
  </div>;
}

export function Customer() {
  const [view, setView] = useState<View>("home"),
    [english, setEnglish] = useState(false),
    [service, setService] = useState<ServiceKey>("maintenance"),
    [selected, setSelected] = useState<ServiceKey[]>(["maintenance"]),
    [shopId, setShopId] = useState("mazen"),
    [sort, setSort] = useState<Sort>("nearby"),
    [garden, setGarden] = useState(""),
    [details, setDetails] = useState(""),
    [preferredTime, setPreferredTime] = useState(""),
    [sent, setSent] = useState(false),
    [slide, setSlide] = useState(0),
    [paused, setPaused] = useState(false),
    [signed, setSigned] = useState(false),
    [saved, setSaved] = useState<LocalDesign[]>([]),
    [selectedDesign, setSelectedDesign] = useState<LocalDesign | null>(null),
    [requestCategory, setRequestCategory] =
      useState<RequestCategory>("upcoming"),
    [records, setRecords] = useState<
      {
        title: string;
        status: string;
        category: RequestCategory;
        design?: LocalDesign;
      }[]
    >([]),
    [neighborhood, setNeighborhood] = useState(
      english ? "Al Olaya, Riyadh" : "العليا، الرياض",
    ),
    [exactStreetAddress, setExactStreetAddress] = useState(""),
    [supportNote, setSupportNote] = useState(""),
    [maintenance, setMaintenance] = useState(emptyMaintenance),
    [showMaintenanceErrors, setShowMaintenanceErrors] = useState(false),
    [indoorChoice, setIndoorChoice] = useState<
      "home" | "office" | "products" | "maintenance"
    >("home"),
    [notifications, setNotifications] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [applePayRequestIds, setApplePayRequestIds] = useState<string[]>([]);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [messageDrafts, setMessageDrafts] = useState<Record<string,string>>({});
  const submittedRef = useRef(false);
  const resetSubmission = () => {
    submittedRef.current = false;
    setSent(false);
  };
  const toggleFavorite = (id: string) =>
    setFavoriteIds((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  const demo = useDemoState();
  const [farm, setFarm] = useState({
    area: "",
    unit: "hectare",
    crops: "",
    work: "",
    neighborhood: "",
    exactAddress: "",
    date: "",
    photos: false,
  });
  const t = english ? copy.en : copy.ar,
    dir = english ? "ltr" : "rtl",
    reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const services: Record<ServiceKey, { ar: string; en: string }> = {
    soil: {
      ar: "معالجة التربة وتجهيز الأرض",
      en: "Soil & ground treatment",
    },
    party: { ar: "تنسيق الحفلات", en: "Party styling" },
    maintenance: {
      ar: "تنظيف وصيانة الحديقة",
      en: "Garden cleaning & maintenance",
    },
    trim: {
      ar: "تقليم وتشكيل",
      en: "Trimming & shaping",
    },
    plant: {
      ar: "زراعة موسمية",
      en: "Seasonal planting",
    },
    custom: {
      ar: "احتياج خاص",
      en: "Custom garden need",
    },
  };
  type Shop = {id:string;ar:string;en:string;distance:number;rating:number;availability:number;image:string;services:Partial<Record<ServiceKey,number|null>>};
  const baseShops:Shop[] = [
    {
      id: "mazen",
      ar: "حدائق مازن",
      en: "Mazen Garden Care",
      distance: 3.1,
      rating: 4.9,
      availability: 1,
      image: "mazen",
      services: {
        maintenance: 340,
        trim: 45,
        plant: 280,
        soil: null,
        custom: null,
      },
    },
    {
      id: "nawa",
      ar: "نواة الخضراء",
      en: "Nawa Gardens",
      distance: 1.7,
      rating: 4.8,
      availability: 3,
      image: "nawa",
      services: { maintenance: 310, plant: 260, party: null, custom: null },
    },
    {
      id: "rawaf",
      ar: "رواف للمساحات",
      en: "Rawaf Outdoor",
      distance: 4.6,
      rating: 4.7,
      availability: 2,
      image: "rawaf",
      services: { trim: 52, maintenance: 365, party: null },
    },
    {
      id: "sahl",
      ar: "سهل البستان",
      en: "Sahl Orchard",
      distance: 6.2,
      rating: 4.6,
      availability: 4,
      image: "sahl",
      services: { trim: 40, plant: 295, soil: null, custom: null },
    },
  ];
  const supportedArea=(area:string)=>/الرياض|riyadh/i.test(area);
  const shops:Shop[]=[
    ...baseShops.filter(shop=>demo.providers.some(provider=>provider.id===shop.id&&provider.approvalStatus==="approved"&&supportedArea(provider.serviceArea))),
    ...demo.providers.filter(provider=>provider.approvalStatus==="approved"&&supportedArea(provider.serviceArea)&&!baseShops.some(shop=>shop.id===provider.id)).map((provider,index)=>({
      id:provider.id,ar:provider.ar,en:provider.en,distance:2.5+index,rating:0,availability:5,image:"mazen",
      services:Object.fromEntries(Object.entries(provider.offerings).filter(([,offering])=>offering?.approved&&offering.enabled).map(([key,offering])=>[key,offering!.price])) as Partial<Record<ServiceKey,number|null>>
    }))
  ];
  const name = (k: ServiceKey) => (english ? services[k].en : services[k].ar),
    shop = shops.find((x) => x.id === shopId) ?? shops[0],
    shopName = (x: (typeof shops)[number]) => (english ? x.en : x.ar),
    hasQuote =
      selected.some(
        (key) =>
          key === "custom" ||
          (shop.services as Partial<Record<ServiceKey, number | null>>)[key] ===
            null,
      ) ||
      (selected.includes("maintenance") && maintenanceHasQuote(maintenance)),
    slides = [
      { src: "/__mockup/images/ghars-garden.jpg", alt: "garden" },
      {
        src: "/__mockup/images/wareef-garden-sunrise.jpg",
        alt: "sunlit garden",
      },
      { src: "/__mockup/images/wareef-garden-water.jpg", alt: "water garden" },
    ];
  useEffect(() => {
    if (paused || reduced || view !== "home") return;
    const id = window.setInterval(() => setSlide((x) => (x + 1) % 3), 6000);
    return () => window.clearInterval(id);
  }, [paused, reduced, view]);
  useEffect(() => {
    const gardens = () => choose("maintenance"),
      farms = () => setView("farmServices");
    window.addEventListener("wareef-home-gardens", gardens);
    window.addEventListener("wareef-farms", farms);
    return () => {
      window.removeEventListener("wareef-home-gardens", gardens);
      window.removeEventListener("wareef-farms", farms);
    };
  });
  const selectShop = (id: string) => {
      const chosen = shops.find((x) => x.id === id);
      if(!chosen)return;
      resetSubmission();
      setShopId(id);
      setSelected((s) => {
        const keep = s.filter((k) => k in chosen.services);
        return keep.length ? keep : [service];
      });
      setView("profile");
    },
    choose = (k: ServiceKey) => {
      setService(k);
      setSelected([k]);
      resetSubmission();
      setView("shops");
    };
  const Nav = () => (
    <div className="bottom customer-nav" dir={dir}>
      <button
        className={view === "home" ? "active" : ""}
        onClick={() => setView("home")}
      >
        <Home />
        {t.home}
      </button>
      <button
        className={view === "design" ? "active" : ""}
        onClick={() => setView("design")}
      >
        <Flower2 />
        {t.design}
      </button>
      <button
        className="reserve-now"
        aria-current={view === "hub" ? "page" : undefined}
        onClick={() => setView("hub")}
      >
        <Leaf aria-hidden="true" />
        <span>{english ? "Reserve now" : "احجز الآن"}</span>
      </button>
      <button
        className={
          [
            "shops",
            "profile",
            "form",
            "quote",
            "confirmed",
            "farmServices",
            "farmForm",
            "farmConfirmed",
            "requests",
          ].includes(view)
            ? "active"
            : ""
        }
        onClick={() => setView("requests")}
      >
        <ClipboardList />
        {t.orders}
      </button>
      <button
        className={view === "account" ? "active" : ""}
        onClick={() => setView("account")}
      >
        <UserRound />
        {t.account}
      </button>
    </div>
  );
  const Back = ({ to }: { to: View }) => (
    <button className="back" onClick={() => setView(to)}>
      ← {t.back}
    </button>
  );
  const Header = ({ back }: { back?: View }) => (
    <div className="top">
      {back && <Back to={back} />}
      <WareefBrand />
      <button className="lang" onClick={() => setEnglish(!english)}>
        EN / ع
      </button>
    </div>
  );
  if (view === "hub")
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header back="home" />
          <main className="screen needs-hub">
            <div className="hub-intro">
              <p className="hub-kicker">
                {english ? "EXPLORE WAREEF" : "استكشف وريف"}
              </p>
              <h1 className="form-title">
                {english ? "How can we help?" : "كيف نساعدك؟"}
              </h1>
              <p className="small">
                {english
                  ? "Choose a category to get started."
                  : "اختر القسم الذي يناسب احتياجك."}
              </p>
            </div>
            <div className="needs-grid">
              <button
                className="need-card services"
                onClick={() => setView("catalogue")}
              >
                <span className="need-icon">
                  <Wrench />
                </span>
                <span>
                  <b>{english ? "Services" : "الخدمات"}</b>
                  <small>
                    {english
                      ? "Book care for your space"
                      : "احجز عناية لمساحتك"}
                  </small>
                </span>
                <i aria-hidden="true">{english ? "→" : "←"}</i>
              </button>
              <button
                className="need-card products"
                onClick={() => setView("products")}
              >
                <span className="need-icon">
                  <Leaf />
                </span>
                <span>
                  <b>{english ? "Products" : "المنتجات"}</b>
                  <small>
                    {english
                      ? "Plants, pots & essentials"
                      : "نباتات وأصص ومستلزمات"}
                  </small>
                </span>
                <i aria-hidden="true">{english ? "→" : "←"}</i>
              </button>
              <button
                className="need-card subscriptions"
                onClick={() => setView("subscriptions")}
              >
                <span className="need-icon">
                  <CalendarDays />
                </span>
                <span>
                  <b>{english ? "Subscriptions" : "الاشتراكات"}</b>
                  <small>
                    {english
                      ? "Regular care, made simple"
                      : "عناية دورية بكل سهولة"}
                  </small>
                </span>
                <i aria-hidden="true">{english ? "→" : "←"}</i>
              </button>
            </div>
          </main>
          <Nav />
        </div>
      </div>
    );
  if (view === "subscriptions") {
    const plans = [
      {
        ar: "قص وتشذيب",
        en: "Trimming & shaping",
        copyAr: "ترتيب نمو النباتات وتشذيبها عند الحاجة",
        copyEn: "Keep plant growth neat and well-shaped",
        icon: Scissors,
      },
      {
        ar: "ري",
        en: "Watering",
        copyAr: "ري منتظم بحسب احتياج المساحة",
        copyEn: "Regular watering suited to your space",
        icon: Droplets,
      },
      {
        ar: "تنظيف",
        en: "Cleaning",
        copyAr: "إزالة الأوراق والمخلفات الخفيفة",
        copyEn: "Clear fallen leaves and light garden debris",
        icon: Wrench,
      },
    ];
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header back="hub" />
          <main className="screen subscription-screen">
            <div className="subscription-page-intro">
              <span>
                <CalendarDays />
              </span>
              <p>{english ? "RECURRING CARE" : "عناية دورية"}</p>
              <h1>{english ? "Care subscriptions" : "اشتراكات العناية"}</h1>
            </div>
            <div className="subscription-plan-list">
              {plans.map(({ ar, en, copyAr, copyEn, icon: Icon }, index) => (
                <article key={en}>
                  <span className="subscription-plan-number">0{index + 1}</span>
                  <span className="subscription-plan-icon">
                    <Icon />
                  </span>
                  <div>
                    <b>{english ? en : ar}</b>
                    <small>{english ? copyEn : copyAr}</small>
                  </div>
                </article>
              ))}
            </div>
          </main>
          <Nav />
        </div>
      </div>
    );
  }
  if (view === "products")
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header back="hub" />
          <main className="screen product-hub">
            <ProductShowcase
              english={english}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
            />
          </main>
          <Nav />
        </div>
      </div>
    );
  if (view === "catalogue")
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header back="hub" />
          <main className="screen">
            <h1 className="form-title">
              {english ? "All services" : "جميع الخدمات"}
            </h1>
            <p className="small">
              {english
                ? "Choose a service to find specialists who provide it."
                : "اختر الخدمة للاطلاع على المختصين الذين يقدمونها."}
            </p>
            <div className="all-services-list">
              <button
                className="indoor-service-link"
                onClick={() => setView("indoor")}
              >
                <span className="service-symbol">
                  <Flower2 />
                </span>
                <span>
                  <b>{english ? "Indoor garden" : "حديقة داخلية"}</b>
                  <small className="service-explanation">
                    {english
                      ? "Home, office, products & maintenance"
                      : "منزل، مكتب، منتجات وصيانة"}
                  </small>
                </span>
                <span aria-hidden="true">{english ? "→" : "←"}</span>
              </button>
              {(
                [
                  "maintenance",
                  "trim",
                  "plant",
                  "soil",
                  "party",
                  "custom",
                ] as ServiceKey[]
              ).map((k) => {
                const Icon =
                  k === "soil"
                    ? Shovel
                    : k === "trim"
                      ? Scissors
                      : k === "plant"
                        ? Sprout
                        : k === "party"
                          ? PartyPopper
                          : k === "custom"
                            ? SlidersHorizontal
                            : Wrench;
                return (
                  <button key={k} onClick={() => choose(k)}>
                    <span className="service-symbol">
                      <Icon />
                    </span>
                    <span>
                      <b>{name(k)}</b>
                      {k === "maintenance" && (
                        <small className="service-explanation">
                          {english
                            ? "(Cleaning, weeding, mowing, and removing plants, trees or stumps)"
                            : "(تنظيف، إزالة الأعشاب، قص العشب، وإزالة النباتات والأشجار والجذوع)"}
                        </small>
                      )}
                    </span>
                    <span aria-hidden="true">{english ? "→" : "←"}</span>
                  </button>
                );
              })}
              <button onClick={() => setView("farmServices")}>
                <span className="service-symbol">
                  <Tractor />
                </span>
                <b>{t.farmServices}</b>
                <span aria-hidden="true">{english ? "→" : "←"}</span>
              </button>
            </div>
          </main>
          <Nav />
        </div>
      </div>
    );
  if (view === "indoor") {
    const indoorItems = [
      {
        id: "home" as const,
        ar: "حديقة المنزل",
        en: "Home garden",
        copyAr: "تنسيق وعناية بالنباتات داخل المنزل",
        copyEn: "Indoor plant styling and care for your home",
        icon: Home,
      },
      {
        id: "office" as const,
        ar: "حديقة المكتب",
        en: "Office garden",
        copyAr: "نباتات وعناية لمساحات العمل والاستقبال",
        copyEn: "Plants and care for workspaces and reception areas",
        icon: Flower2,
      },
      {
        id: "products" as const,
        ar: "منتجات",
        en: "Products",
        copyAr: "نباتات وأصص ومستلزمات للنباتات الداخلية",
        copyEn: "Plants, planters and supplies for indoor growing",
        icon: Leaf,
      },
      {
        id: "maintenance" as const,
        ar: "صيانة",
        en: "Maintenance",
        copyAr: "تنظيف الأوراق، تغيير التربة والعناية الدورية",
        copyEn: "Leaf cleaning, soil refresh and regular care",
        icon: Wrench,
      },
    ];
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header back="catalogue" />
          <main className="screen indoor-garden-screen">
            <div className="indoor-kicker">
              <Flower2 />
              <span>{english ? "INDOOR GARDEN" : "حديقة داخلية"}</span>
            </div>
            <h1 className="form-title">
              {english
                ? "A greener room starts here"
                : "مساحة داخلية أكثر خضرة"}
            </h1>
            <p className="small">
              {english
                ? "Choose what you would like to explore for your indoor space."
                : "اختر ما ترغب باستكشافه لمساحتك الداخلية."}
            </p>
            <div className="indoor-service-list">
              {indoorItems.map(({ id, ar, en, copyAr, copyEn, icon: Icon }) => (
                <button
                  key={en}
                  onClick={() => {
                    setIndoorChoice(id);
                    setView("indoorDetail");
                  }}
                >
                  <span className="indoor-icon">
                    <Icon />
                  </span>
                  <span>
                    <b>{english ? en : ar}</b>
                    <small>{english ? copyEn : copyAr}</small>
                  </span>
                  <span aria-hidden="true">{english ? "→" : "←"}</span>
                </button>
              ))}
            </div>
          </main>
          <Nav />
        </div>
      </div>
    );
  }
  if (view === "favorites") {
    const favorites = productCatalogue.filter((product) =>
      favoriteIds.includes(product.id),
    );
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header back="account" />
          <main className="screen favorite-products-screen">
            <section className="favorites-hero">
              <span className="favorites-hero-icon">
                <Heart fill="currentColor" />
              </span>
              <div>
                <p>{english ? "YOUR SAVED ITEMS" : "منتجاتك المحفوظة"}</p>
                <h1>{english ? "Favorites" : "المفضلة"}</h1>
                <small>
                  {english
                    ? `${favorites.length} saved products`
                    : `${favorites.length} منتجات محفوظة`}
                </small>
              </div>
            </section>
            {favorites.length ? (
              <section
                className="favorite-product-grid"
                aria-label={english ? "Favorite products" : "المنتجات المفضلة"}
              >
                {favorites.map((product) => (
                  <article className="favorite-product-card" key={product.id}>
                    <img
                      src={productImageUrl(product.image)}
                      alt={
                        english
                          ? `Photo of ${product.en}`
                          : `صورة ${product.ar}`
                      }
                      loading="lazy"
                    />
                    <div>
                      <small>
                        {english ? product.shop.en : product.shop.ar}
                      </small>
                      <b>{english ? product.en : product.ar}</b>
                      <span>{english ? "To be determined later" : "تُحدّد لاحقاً"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(product.id)}
                      aria-label={
                        english
                          ? `Remove ${product.en} from favorites`
                          : `إزالة ${product.ar} من المفضلة`
                      }
                      aria-pressed="true"
                    >
                      <Heart fill="currentColor" aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </section>
            ) : (
              <section className="favorite-empty">
                <Heart />
                <h2>
                  {english
                    ? "Your favorites are waiting"
                    : "قائمتك بانتظار اختياراتك"}
                </h2>
                <p>
                  {english
                    ? "Save products you like to find them here."
                    : "احفظ المنتجات التي تعجبك لتجدها هنا."}
                </p>
              </section>
            )}
            <button
              className="browse-products"
              onClick={() => setView("products")}
            >
              <Leaf />
              {english ? "Browse products" : "تصفح المنتجات"}
              <ChevronLeft />
            </button>
          </main>
          <Nav />
        </div>
      </div>
    );
  }
  if (view === "indoorDetail") {
    const details = {
        home: {
          ar: "حديقة المنزل",
          en: "Home garden",
          copyAr:
            "اختر النباتات والأصص المناسبة للضوء والمساحة في منزلك، ثم نسّق ركنك النباتي.",
          copyEn:
            "Choose plants and planters for your home's light and space, then style your green corner.",
          itemsAr: [
            "تنسيق ركن نباتي",
            "اختيار النباتات والأصص",
            "خطة عناية بسيطة",
          ],
          itemsEn: [
            "Plant-corner styling",
            "Plant and planter selection",
            "A simple care plan",
          ],
          icon: Home,
        },
        office: {
          ar: "حديقة المكتب",
          en: "Office garden",
          copyAr: "حلول نباتية لمساحات العمل والاستقبال مع عناية منظمة.",
          copyEn:
            "Plant solutions for workspaces and receptions, with organised ongoing care.",
          itemsAr: [
            "تجهيز الاستقبال والمكاتب",
            "نباتات مناسبة للإضاءة",
            "زيارة عناية دورية",
          ],
          itemsEn: [
            "Reception and workspace setup",
            "Light-appropriate plants",
            "Regular care visits",
          ],
          icon: Flower2,
        },
        products: {
          ar: "منتجات داخلية",
          en: "Indoor products",
          copyAr: "استكشف النباتات والأصص ومستلزمات العناية للنباتات الداخلية.",
          copyEn:
            "Explore plants, planters and care supplies for indoor growing.",
          itemsAr: ["نباتات داخلية", "أصص وستاندات", "تربة ومستلزمات عناية"],
          itemsEn: [
            "Indoor plants",
            "Planters and stands",
            "Soil and care supplies",
          ],
          icon: Leaf,
        },
        maintenance: {
          ar: "صيانة النباتات الداخلية",
          en: "Indoor plant maintenance",
          copyAr: "عناية منظمة بالنباتات الداخلية لإبقائها صحية ومرتبة.",
          copyEn:
            "Structured indoor plant care to keep your plants healthy and tidy.",
          itemsAr: [
            "تنظيف الأوراق",
            "تغيير التربة والأصيص",
            "فحص صحة النباتات",
          ],
          itemsEn: [
            "Leaf cleaning",
            "Soil refresh and repotting",
            "Plant health check",
          ],
          icon: Wrench,
        },
      }[indoorChoice],
      Icon = details.icon;
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header back="indoor" />
          <main className="screen indoor-garden-screen indoor-detail">
            <span className="indoor-icon indoor-detail-icon">
              <Icon />
            </span>
            <div className="indoor-kicker">
              <span>{english ? "INDOOR GARDEN" : "حديقة داخلية"}</span>
            </div>
            <h1 className="form-title">{english ? details.en : details.ar}</h1>
            <p className="small">{english ? details.copyEn : details.copyAr}</p>
            <ul>
              {(english ? details.itemsEn : details.itemsAr).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button className="cta" onClick={() => setView("indoor")}>
              {english
                ? "Choose another indoor service"
                : "اختر خدمة داخلية أخرى"}
            </button>
          </main>
          <Nav />
        </div>
      </div>
    );
  }
  if (view === "design")
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header />
          {selectedDesign ? (
            <section className="design-screen saved-detail">
              <button className="back" onClick={() => setSelectedDesign(null)}>
                ← {t.back}
              </button>
              <p className="eyebrow">PRIVATE SAVED DESIGN · تصميم محفوظ خاص</p>
              <h1>{selectedDesign.title}</h1>
              <div className="compare">
                <figure>
                  <img src={selectedDesign.photo} alt="" />
                  <figcaption>
                    {english
                      ? "Original local photo"
                      : "الصورة المحلية الأصلية"}
                  </figcaption>
                </figure>
                <figure>
                  <img src={selectedDesign.concept} alt="" />
                  <figcaption>
                    {english ? "Illustrative concept" : "تصور توضيحي"}
                  </figcaption>
                </figure>
              </div>
              <p className="small">{selectedDesign.details}</p>
              <div className="plant-list">
                {selectedDesign.plan.map((p) => (
                  <article key={p.botanical}>
                    <Flower2 />
                    <div>
                      <b>
                        {p.ar} · {p.en}
                      </b>
                      <small>{p.botanical}</small>
                      <p>
                        {p.sun} · {p.water} · {p.care}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <button
                className="cta"
                onClick={() => {
                  setSelectedDesign(null);
                  setRecords((r) => [
                    {
                      title: selectedDesign.title,
                      status: english
                        ? "Saved design selected for quote"
                        : "تم اختيار التصميم المحفوظ للعرض",
                      category: "quotes",
                      design: selectedDesign,
                    },
                    ...r,
                  ]);
                  setView("requests");
                }}
              >
                {english
                  ? "Request implementation quote"
                  : "اطلب عرض سعر للتنفيذ"}
              </button>
            </section>
          ) : (
            <>
              <DesignJourney
                english={english}
                signedIn={signed}
                onSignIn={() => setSigned(true)}
                onSave={(design) =>
                  setSaved((s) =>
                    s.some((x) => x.id === design.id) ? s : [design, ...s],
                  )
                }
                onQuote={(design, p) => {
                  const result=demoStore.submit({
                    providerId: p,
                    customerId:"waleed", neighborhood, exactAddress:exactStreetAddress,
                    title: english
                      ? `Garden implementation · ${design.title}`
                      : `تنفيذ الحديقة · ${design.title}`,
                    services: ["custom"],
                    subtotal: 0,
                    quoteOnly: hasQuote,
                    status: "pending",
                    kind: "design",
                    note: design.details,
                    attachment: {
                      original: design.photo,
                      concept: design.concept,
                      plants: design.plan.map((x) => x.botanical),
                      details: design.details,
                    },
                  });
                  if(!result.ok)window.alert(english?"This provider or service is no longer available for new requests.":"لم يعد هذا المختص أو الخدمة متاحاً للطلبات الجديدة.");
                }}
                saved={saved}
              />
              {saved.length > 0 && (
                <section className="screen saved-designs">
                  <h2>{english ? "Saved designs" : "التصاميم المحفوظة"}</h2>
                  {saved.map((d) => (
                    <button key={d.id} onClick={() => setSelectedDesign(d)}>
                      <Flower2 />
                      <span>
                        <b>{d.title}</b>
                        <small>
                          {d.details} ·{" "}
                          {d.plan.map((p) => p.botanical).join(" · ")}
                        </small>
                      </span>
                    </button>
                  ))}
                </section>
              )}
            </>
          )}
          <Nav />
        </div>
      </div>
    );
  if (view === "requests") {
    const labels: Record<RequestCategory, string> = {
      quotes: english ? "Quotes" : "عروض الأسعار",
      upcoming: english ? "Needs action / Upcoming" : "تحتاج إجراء / القادمة",
      ongoing: english ? "Ongoing" : "الجارية",
      completed: english ? "Completed" : "المكتملة",
    };
    const shared = demo.requests.filter(r=>r.customerId==="waleed").map((r) => ({
      id: r.id,
      title: r.title,
      status: statusText(r.status, english, r.quoteOnly),
      rawStatus: r.status,
      quoteOnly: r.quoteOnly,
      preferredTime: r.preferredTime,
      rating: r.rating,
      issueText: r.issueText,
      request: r,
      category: (r.status === "ongoing"
        ? "ongoing"
        : r.status === "completed"
          ? "completed"
          : "upcoming") as RequestCategory,
      detail: `${demo.providers.find((p) => p.id === r.providerId)?.[english ? "en" : "ar"] || r.providerId} · ${r.services.map((s) => (s === "farm" ? t.farmServices : name(s as ServiceKey))).join(" + ")} · ${english ? "To be determined later" : "تُحدّد لاحقاً"}`,
      seeded: r.seeded,
      maintenance: r.attachment?.maintenance,
    }));
    const local = records.map((r) => ({
      ...r,
      detail: english ? "Private local prototype record" : "سجل نموذج محلي خاص",
      seeded: false,
      maintenance: undefined,
      id: undefined,
      rawStatus: undefined,
      quoteOnly: false,
      preferredTime: undefined,
      rating: undefined,
      issueText: undefined,
      request: undefined,
    }));
    const filtered = [...shared, ...local].filter(
      (r) => r.category === requestCategory,
    );
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header />
          <main className="screen request-screen">
            <h1>{t.orders}</h1>
            <section
              className="subscription-box"
              aria-labelledby="subscription-title"
            >
              <div className="subscription-icon">
                <CalendarDays aria-hidden="true" />
              </div>
              <div>
                <p>{english ? "RECURRING CARE" : "عناية دورية"}</p>
                <h2 id="subscription-title">
                  {english ? "Care subscriptions" : "اشتراكات العناية"}
                </h2>
                <span>
                  {english
                    ? "Trimming, watering and cleaning on a regular schedule."
                    : "قص وتشذيب، ري وتنظيف بزيارات منتظمة."}
                </span>
              </div>
              <button onClick={() => setView("subscriptions")}>
                {english ? "Explore" : "استكشف"}{" "}
                <span aria-hidden="true">{english ? "→" : "←"}</span>
              </button>
            </section>
            <div className="request-tabs">
              {(Object.keys(labels) as RequestCategory[])
                .filter((k) => k !== "quotes")
                .map((k) => (
                  <button
                    key={k}
                    className={requestCategory === k ? "on" : ""}
                    onClick={() => setRequestCategory(k)}
                  >
                    {labels[k]}
                  </button>
                ))}
            </div>
            {filtered.length ? (
              <div className="request-list">
                {filtered.map((r, i) => (
                  <article key={`${r.title}-${i}`}>
                    <ClipboardList />
                    <div>
                      <b>{r.title}</b>
                      <small>
                        {r.status} · {r.detail}
                      </small>
                      <small>
                        {r.seeded
                          ? english
                            ? "Earlier prototype record"
                            : "سجل من النموذج السابق"
                          : english
                            ? "Browser-local shared demo"
                            : "عرض مشترك محلي في المتصفح"}
                      </small>
                      {r.maintenance && (
                        <MaintenanceSummary
                          english={english}
                          value={r.maintenance}
                          photos={false}
                        />
                      )}
                      {r.preferredTime && <small><b>{english ? "Preferred time" : "الوقت المفضّل"}:</b> {new Date(r.preferredTime).toLocaleString(english ? "en-SA" : "ar-SA")}</small>}
                      {r.rawStatus === "quoted" && r.id && (
                        <button className="outline request-inline-action" onClick={() => {const check=demoStore.availabilityFor(r.id!);if(!check.ok){window.alert(english?"This quote cannot be accepted now: the appointment is no longer available.":"لا يمكن قبول هذا العرض الآن: الموعد لم يعد متاحاً.");return;}demoStore.patchRequest(r.id!, { status: "booked" }, "customer","waleed");}}>
                          {english ? "Accept pricing-pending proposal & book" : "قبول العرض التجريبي والحجز"}
                        </button>
                      )}
                      {r.rawStatus === "booked" && r.id && !r.quoteOnly && (
                        applePayRequestIds.includes(r.id) ? (
                          <div className="apple-pay-success" role="status"><Check aria-hidden="true"/><span><b>{english ? "Payment confirmed" : "تم تأكيد الدفع"}</b><small>{english ? "Your appointment is secured." : "تم تثبيت موعدك."}</small></span></div>
                        ) : (
                          <section className="apple-pay-card" aria-label={english ? "Apple Pay payment" : "دفع Apple Pay"}>
                            <div><span className="apple-pay-mark" aria-hidden="true">Pay</span><small>{english ? "Pricing to be determined later after provider confirmation" : "تُحدّد الأسعار لاحقاً بعد تأكيد المختص"}</small></div>
                            <button className="apple-pay-button" onClick={() => { if (window.confirm(english ? "Confirm this Apple Pay demo step? Pricing is to be determined later; no charge will be made." : "تأكيد خطوة Apple Pay التجريبية؟ تُحدّد الأسعار لاحقاً، ولن يتم تحصيل أي مبلغ.")) setApplePayRequestIds(ids => [...ids, r.id!]); }}><span aria-hidden="true">Pay</span><b>{english ? "Continue demo" : "متابعة العرض"}</b></button>
                            <p>{english ? "Prototype payment preview only — pricing is to be determined later and no charge is made." : "معاينة دفع تجريبية فقط — تُحدّد الأسعار لاحقاً ولا يتم تحصيل أي مبلغ."}</p>
                          </section>
                        )
                      )}
                      {r.request && ["booked","ongoing","work_completed"].includes(r.rawStatus ?? "") && <section className="booking-message" aria-label={english?"Booking messages":"رسائل الحجز"}>
                        <b>{english?"Message your assigned specialist":"راسل المختص المعيّن"}</b>
                        <small>{english?"Browser-local demo exchange; no notifications are sent.":"مراسلة تجريبية محلية في المتصفح؛ لا يتم إرسال إشعارات."}</small>
                        {(r.request.messages??[]).map(m=><p key={m.id} className={m.sender==="customer"?"mine":""}>{m.body}</p>)}
                        <div><input value={messageDrafts[r.id!]??""} onChange={e=>setMessageDrafts(v=>({...v,[r.id!]:e.target.value}))} placeholder={english?"Write a message":"اكتب رسالة"}/><button className="outline" disabled={!(messageDrafts[r.id!]??"").trim()} onClick={()=>{if(demoStore.sendMessage(r.id!,"customer",messageDrafts[r.id!]))setMessageDrafts(v=>({...v,[r.id!]:""}));}}><Send size={13}/>{english?"Send":"إرسال"}</button></div>
                      </section>}
                      {r.rawStatus === "work_completed" && r.id && (
                        <div className="completion-review">
                          <b>{english ? "Confirm the completed work" : "أكد اكتمال العمل"}</b>
                          <div className="star-picker" aria-label={english ? "Rating" : "التقييم"}>
                            {[1,2,3,4,5].map(star => <button key={star} type="button" className={(r.rating ?? 0) >= star ? "on" : ""} onClick={() => demoStore.patchRequest(r.id!, { rating: star },"customer","waleed")}>★</button>)}
                          </div>
                          <textarea defaultValue={r.issueText} placeholder={english ? "Describe an issue (optional)" : "صف المشكلة (اختياري)"} onBlur={e => demoStore.patchRequest(r.id!, { issueText: e.target.value },"customer","waleed")}/>
                          <button className="cta" onClick={() => demoStore.patchRequest(r.id!, { status: "completed" },"customer","waleed")}>{english ? "Confirm completion" : "تأكيد الاكتمال"}</button>
                        </div>
                      )}
                      {r.rawStatus === "completed" && (r.rating || r.issueText) && <small>{r.rating ? `${english ? "Rating" : "التقييم"}: ${"★".repeat(r.rating)}` : ""}{r.issueText ? ` · ${english ? "Issue reported" : "تم الإبلاغ عن مشكلة"}: ${r.issueText}` : ""}</small>}
                      {r.request && <CustomerRequestActions request={r.request} english={english} onRebook={() => {
                        resetSubmission();
                        if (r.request!.kind === "farm") {
                          setView("farmServices");
                          return;
                        }
                        const nextServices = r.request!.services.filter((key): key is ServiceKey => key !== "farm");
                        setSelected(nextServices.length ? nextServices : ["maintenance"]);
                        setService(nextServices[0] ?? "maintenance");
                        setPreferredTime("");
                        setView("shops");
                      }}/>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <ClipboardList />
                <h2>
                  {english
                    ? "Nothing in this category"
                    : "لا توجد عناصر في هذه الفئة"}
                </h2>
                <p>
                  {english
                    ? "This category has no local demo records."
                    : "لا توجد سجلات تجريبية محلية في هذه الفئة."}
                </p>
              </div>
            )}
          </main>
          <Nav />
        </div>
      </div>
    );
  }
  if (view === "account")
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header />
          <main className="screen account-screen">
            <div className="account-title-row">
              <div>
                <h1>{t.account}</h1>
              </div>
              <button
                className="account-bell"
                onClick={() => setNotifications(!notifications)}
                aria-label={
                  english ? "Toggle visit reminders" : "تبديل تذكيرات الزيارة"
                }
              >
                <Bell />
                <i className={notifications ? "on" : ""} />
              </button>
            </div>
            <section className="account-identity">
              <div className="avatar">و</div>
              <div>
                <b>
                  {signed
                    ? english
                      ? "Waleed Alharbi"
                      : "وليد الحربي"
                    : english
                      ? "Welcome"
                      : "أهلاً بك"}
                </b>
                <small>
                  {signed
                    ? english
                      ? "Riyadh · Customer since 2025"
                      : "الرياض · عميل منذ ٢٠٢٥"
                    : english
                      ? "Sign in to save your gardens and requests"
                      : "سجّل الدخول لحفظ حدائقك وطلباتك"}
                </small>
              </div>
              <button
                className="account-signin"
                onClick={() => setSigned(!signed)}
              >
                {signed
                  ? english
                    ? "Sign out"
                    : "تسجيل الخروج"
                  : english
                    ? "Sign in"
                    : "تسجيل الدخول"}
              </button>
            </section>
            <section
              className="account-summary"
              aria-label={english ? "Account overview" : "ملخص الحساب"}
            >
              <button onClick={() => setView("requests")}>
                <strong>{demo.requests.filter(r=>r.customerId==="waleed").length + records.length}</strong>
                <span>{english ? "requests" : "طلبات"}</span>
              </button>
              <button onClick={() => setView("design")}>
                <strong>{saved.length}</strong>
                <span>{english ? "saved designs" : "تصاميم محفوظة"}</span>
              </button>
              <button onClick={() => setView("indoor")}>
                <strong>
                  {notifications
                    ? english
                      ? "On"
                      : "مفعّلة"
                    : english
                      ? "Off"
                      : "متوقفة"}
                </strong>
                <span>{english ? "reminders" : "التذكيرات"}</span>
              </button>
            </section>
            <section className="account-menu">
              <p className="account-label">{english ? "ACCOUNT" : "الحساب"}</p>
              <button onClick={() => setSigned(!signed)}>
                <UserRound />
                <span>
                  <b>{english ? "My profile" : "ملفي الشخصي"}</b>
                  <small>
                    {signed
                      ? english
                        ? "Account details"
                        : "بيانات الحساب"
                      : english
                        ? "Sign in to complete your profile"
                        : "سجّل الدخول لإكمال ملفك"}
                  </small>
                </span>
                <ChevronLeft />
              </button>
              <button onClick={() => setView("favorites")}>
                <Heart />
                <span>
                  <b>{english ? "My favorites" : "المفضلة"}</b>
                  <small>
                    {english
                      ? "Products you saved from the catalogue"
                      : "المنتجات التي حفظتها من الكتالوج"}
                  </small>
                </span>
                <ChevronLeft />
              </button>
              <button onClick={() => setView("requests")}>
                <ReceiptText />
                <span>
                  <b>{english ? "Invoices & requests" : "الفواتير والطلبات"}</b>
                  <small>
                    {english
                      ? "View your local service records"
                      : "عرض سجلات خدماتك المحلية"}
                  </small>
                </span>
                <ChevronLeft />
              </button>
              <button
                onClick={() =>
                  setSupportNote(
                    english
                      ? "I would like to invite a friend."
                      : "أرغب بدعوة صديق.",
                  )
                }
              >
                <Send />
                <span>
                  <b>{english ? "Invite a friend" : "دعوة صديق"}</b>
                  <small>
                    {english
                      ? "Share Wareef with someone who loves plants"
                      : "شارك وريف مع من يحب النباتات"}
                  </small>
                </span>
                <ChevronLeft />
              </button>
              <button onClick={() => setPrivacyOpen(!privacyOpen)}>
                <LockKeyhole />
                <span><b>{english ? "Privacy & security" : "الخصوصية والأمان"}</b><small>{english ? "What this demo shares" : "ما الذي يشاركه هذا العرض"}</small></span><ChevronLeft />
              </button>
            </section>
            {privacyOpen && <section className="account-help privacy-panel">
              <b>{english ? "Your demo identity & booking privacy" : "هوية العرض وخصوصية الحجز"}</b>
              <span>{english ? "This frame shows Waleed’s own seeded bookings, photos and complaints only. Before confirmation, the assigned provider sees your neighborhood, not your exact address or phone. Exact address is released only after booking confirmation or quote acceptance." : "تعرض هذه الشاشة حجوزات وصور وشكاوى وليد التجريبية فقط. قبل التأكيد، يرى المختص المعيّن الحي فقط ولا يرى العنوان الدقيق أو رقم الجوال. يُعرض العنوان الدقيق بعد تأكيد الحجز أو قبول عرض السعر فقط."}</span>
              <span>{english ? "Design drafts stay private unless you explicitly consent to share them. This browser-local demo is not authentication or access enforcement; no password or payment-card details are collected." : "تبقى مسودات التصميم خاصة ما لم تمنح موافقة صريحة للمشاركة. هذا عرض محلي في المتصفح وليس مصادقة أو فرضاً حقيقياً للوصول؛ لا تُجمع كلمات مرور أو بيانات بطاقات دفع."}</span>
            </section>}
            <section className="account-section">
              <p className="account-label">
                {english ? "YOUR DETAILS" : "بياناتك"}
              </p>
              <label className="account-address">
                <span>
                  <MapPin />
                  <b>{english ? "Saved neighborhood" : "الحي المحفوظ"}</b>
                </span>
                <input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  aria-label={english ? "Saved neighborhood" : "الحي المحفوظ"}
                />
                <small>
                  {english
                    ? "Shared before confirmation to suggest nearby specialists"
                    : "يُشارك قبل التأكيد لعرض المختصين القريبين"}
                </small>
                <span><MapPin /><b>{english ? "Exact street address" : "العنوان الدقيق"}</b></span>
                <input value={exactStreetAddress} onChange={e=>setExactStreetAddress(e.target.value)} aria-label={english?"Exact street address":"العنوان الدقيق"} placeholder={english?"Optional — released after confirmation only":"اختياري — يُعرض بعد التأكيد فقط"}/>
              </label>
            </section>
            <section className="account-section">
              <p className="account-label">
                {english ? "PREFERENCES" : "التفضيلات"}
              </p>
              <div className="account-actions">
                <button onClick={() => setEnglish(!english)}>
                  <span>
                    <b>{english ? "Language" : "اللغة"}</b>
                    <small>{english ? "English" : "العربية"}</small>
                  </span>
                  <ChevronLeft />
                </button>
                <button onClick={() => setNotifications(!notifications)}>
                  <span>
                    <b>{english ? "Visit reminders" : "تذكيرات الزيارات"}</b>
                    <small>
                      {notifications
                        ? english
                          ? "Enabled"
                          : "مفعّلة"
                        : english
                          ? "Disabled"
                          : "متوقفة"}
                    </small>
                  </span>
                  <span
                    className={`switch ${notifications ? "on" : ""}`}
                    aria-hidden="true"
                  >
                    <i />
                  </span>
                </button>
                <button
                  onClick={() =>
                    setSupportNote(
                      english
                        ? "Settings are ready to be tailored."
                        : "إعدادات الحساب جاهزة للتخصيص.",
                    )
                  }
                >
                  <span>
                    <b>{english ? "Settings" : "الإعدادات"}</b>
                    <small>
                      {english
                        ? "Privacy and account controls"
                        : "الخصوصية والتحكم بالحساب"}
                    </small>
                  </span>
                  <Settings />
                </button>
              </div>
            </section>
            <section className="account-menu account-other">
              <p className="account-label">{english ? "OTHER" : "أخرى"}</p>
              <button
                onClick={() =>
                  document
                    .querySelector<HTMLInputElement>(".account-help input")
                    ?.focus()
                }
              >
                <CircleHelp />
                <span>
                  <b>{english ? "Help & support" : "المساعدة والدعم"}</b>
                  <small>
                    {english
                      ? "Tell us what you need"
                      : "أخبرنا بما تحتاج إليه"}
                  </small>
                </span>
                <ChevronLeft />
              </button>
              <button
                onClick={() =>
                  setSupportNote(
                    english
                      ? "Privacy policy requested."
                      : "تم فتح طلب سياسة الخصوصية.",
                  )
                }
              >
                <ShieldCheck />
                <span>
                  <b>{english ? "Privacy policy" : "سياسة الخصوصية"}</b>
                  <small>
                    {english
                      ? "How this browser demo handles your data"
                      : "كيف يتعامل هذا النموذج مع بياناتك"}
                  </small>
                </span>
                <ChevronLeft />
              </button>
            </section>
            <section className="account-help">
              <div>
                <b>{english ? "Need a hand?" : "هل تحتاج مساعدة؟"}</b>
                <span>
                  {english
                    ? "Tell us what you need and we’ll keep it in this demo session."
                    : "اكتب ما تحتاجه وسنحفظه في جلسة العرض هذه."}
                </span>
              </div>
              <label>
                <input
                  value={supportNote}
                  onChange={(e) => setSupportNote(e.target.value)}
                  placeholder={
                    english ? "Write a note for support" : "اكتب ملاحظة للدعم"
                  }
                />
                <small>
                  {supportNote
                    ? english
                      ? "Saved in this browser"
                      : "حُفظت في هذا المتصفح"
                    : english
                      ? "Nothing is sent from this demo"
                      : "لا يتم إرسال أي شيء من هذا النموذج"}
                </small>
              </label>
            </section>
          </main>
          <Nav />
        </div>
      </div>
    );
  if (view === "shops") {
    const sorted = (() =>
      shops
        .filter(
          (x) =>
            service in x.services &&
            demo.providers.find((p) => p.id === x.id)?.offerings[service]
              ?.enabled !== false,
        )
        .slice()
        .sort((a, b) =>
          sort === "nearby"
            ? a.distance - b.distance
            : sort === "rated"
              ? b.rating - a.rating
            : a.availability - b.availability,
        ))();
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header back="home" />
          <main className="screen">
            <div className="step">{name(service)}</div>
            <h1 className="form-title">{t.shops}</h1>
            <div className="sorts">
              {(["nearby", "rated", "early"] as Sort[]).map((k) => (
                <button
                  key={k}
                  className={sort === k ? "on" : ""}
                  onClick={() => setSort(k)}
                >
                  {k === "nearby"
                    ? t.sortNear
                    : k === "rated"
                      ? t.sortRated
                      : t.sortEarly}
                </button>
              ))}
            </div>
            <div className="shop-results">
              {sorted.map((x) => {
                return (
                  <article className="shop-card" key={x.id}>
                    <div className={`shop-image ${x.image}`}>
                      <span className="corner-rating">★ {x.rating}</span>
                    </div>
                    <div className="shop-details">
                      <b>{shopName(x)}</b>
                      <p>
                        {x.distance} km · {t.available}
                      </p>
                      <strong>
                        {english ? "To be determined later" : "تُحدّد لاحقاً"}
                      </strong>
                      <button
                        className="outline"
                        onClick={() => selectShop(x.id)}
                      >
                        {t.selectShop}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </main>
          <Nav />
        </div>
      </div>
    );
  }
  if (view === "profile") {
    const available = Object.keys(shop.services) as ServiceKey[];
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header back="shops" />
          <main className="screen">
            <div className={`profile-cover ${shop.image}`} />
            <div className="profile-title">
              <h2>{shopName(shop)}</h2>
              <p className="small">
                <MapPin size={11} /> {shop.distance} km · Riyadh
              </p>
              <span className="rating">★ {shop.rating}/5</span>
            </div>
            <section className="section shop-services">
              <h2>{english ? "Choose services" : "اختر الخدمات"}</h2>
              {available.map((k) => {
                const checked = selected.includes(k),
                  Icon =
                    k === "soil"
                      ? Tractor
                      : k === "trim"
                        ? Scissors
                        : k === "plant"
                          ? Sprout
                          : k === "party"
                            ? PartyPopper
                            : k === "custom"
                              ? SlidersHorizontal
                              : Wrench;
                return (
                  <label
                    className={`service-check ${checked ? "checked" : ""}`}
                    key={k}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelected((s) =>
                          s.includes(k) ? s.filter((x) => x !== k) : [...s, k],
                        )
                      }
                    />
                    <div className="service-symbol">
                      <Icon />
                    </div>
                    <span>
                      <b>{name(k)}</b>
                      <small>
                        {english ? "To be determined later" : "تُحدّد لاحقاً"}
                      </small>
                    </span>
                    <i>
                      <Check size={15} />
                    </i>
                  </label>
                );
              })}
              <div className="service-running-total">
                <div>
                  <span>
                    {english ? "Service pricing" : "تسعير الخدمات"}
                  </span>
                  <strong>{english ? "To be determined later" : "تُحدّد لاحقاً"}</strong>
                </div>
                <small>{english ? "Pricing research is pending; no total is set in this demo." : "بحث الأسعار قيد الانتظار؛ لا يوجد إجمالي محدد في هذا العرض."}</small>
              </div>
              <p className="selection-error">
                {selected.length ? "" : t.chooseOne}
              </p>
              <button
                className="cta"
                disabled={!selected.length}
                onClick={() => setView("form")}
              >
                {t.continue}
              </button>
            </section>
          </main>
          <Nav />
        </div>
      </div>
    );
  }
  if (view === "form")
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header back="profile" />
          <main className="screen">
            <div className="step">STEP 1 OF 2</div>
            <h1 className="form-title">{t.intro}</h1>
            <p className="small">{t.introSub}</p>
            <div className="form-card">
              <label>{t.service}</label>
              <div className="selected-service-list">
                {selected.map((k) => (
                  <span key={k}>
                    {name(k)}
                    <button
                      aria-label={
                        english ? `Remove ${name(k)}` : `حذف ${name(k)}`
                      }
                      onClick={() =>
                        setSelected((x) => x.filter((y) => y !== k))
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <label>{t.garden}</label>
              <input
                value={garden}
                onChange={(e) => setGarden(e.target.value)}
                placeholder={t.gardenP}
              />
              <label>{t.location}</label>
              <input
                defaultValue={english ? "Al Olaya, Riyadh" : "العليا، الرياض"}
              />
              {selected.includes("maintenance") && (
                <MaintenanceForm
                  english={english}
                  value={maintenance}
                  onChange={setMaintenance}
                  showErrors={showMaintenanceErrors}
                />
              )}{" "}
              {!selected.includes("maintenance") && (
                <>
                  <label>
                    {english ? "Add garden photos" : "أضف صور الحديقة"}
                  </label>
                  <button
                    className="upload"
                    onClick={() => setGarden(garden || "Garden with photos")}
                  >
                    <Camera />
                    <b>{english ? "Tap to add photos" : "اضغط لإضافة صور"}</b>
                  </button>
                </>
              )}
              <label>{t.details}</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
              <label>{english ? "Preferred visit time" : "وقت الزيارة المفضّل"}</label>
              <input type="datetime-local" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
            </div>
            <button
              className="cta"
              disabled={!selected.length}
              onClick={() => {
                if (
                  selected.includes("maintenance") &&
                  !maintenanceValid(maintenance)
                ) {
                  setShowMaintenanceErrors(true);
                  return;
                }
                setShowMaintenanceErrors(false);
                setView("quote");
              }}
            >
              {t.continue}
            </button>
          </main>
          <Nav />
        </div>
      </div>
    );
  if (view === "quote")
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header back="form" />
          <main className="screen">
            <div className="step">{english ? "PRICING PENDING" : "التسعير قيد التحديد"}</div>
            <h1 className="form-title">{english ? "Review your pricing-pending request" : "راجع طلبك بانتظار تحديد السعر"}</h1>
            <div className="quote-card">
              <div className="row">
                <b>{shopName(shop)}</b>
                <strong>
                  {english ? "To be determined later" : "تُحدّد لاحقاً"}
                </strong>
              </div>
              <hr />
              {selected.map((k) => {
                return (
                  <div className="row small" key={k}>
                    <span>{name(k)}</span>
                    <b>
                      {english ? "To be determined later" : "تُحدّد لاحقاً"}
                    </b>
                  </div>
                );
              })}
              {selected.includes("maintenance") && (
                <MaintenanceSummary english={english} value={maintenance} />
              )}
              <div className="row small"><span>{english ? "Preferred time" : "الوقت المفضّل"}</span><b>{preferredTime ? new Date(preferredTime).toLocaleString(english ? "en-SA" : "ar-SA") : (english ? "Not selected" : "غير محدد")}</b></div>
            </div>
            <div className="notice">{t.demo}</div>
            <button
              className="cta space-top"
              disabled={!preferredTime}
              onClick={() => {
                if (!submittedRef.current) {
                  submittedRef.current = true;
                  const result=demoStore.submit({
                    providerId: shopId,
                    customerId:"waleed", neighborhood, exactAddress:exactStreetAddress,
                    title: garden || shopName(shop),
                    services: selected,
                    subtotal: 0,
                    scopeSnapshot: selected.map((key) => ({key, ar: services[key].ar, en: services[key].en, price: null})),
                    preferredTime,
                    quoteOnly: true,
                    status: "pending",
                    kind: "service",
                    note: details,
                    attachment: selected.includes("maintenance")
                      ? { maintenance }
                      : undefined,
                  });
                  if(!result.ok){submittedRef.current=false;window.alert(english?"This provider or service is no longer approved for new bookings. Your existing requests are unchanged.":"لم يعد المختص أو الخدمة معتمدين لحجوزات جديدة. طلباتك الحالية لم تتغير.");return}
                }
                setSent(true);
              }}
            >
              {sent
                ? english
                    ? hasQuote
                      ? "Assessment request submitted — pricing pending"
                      : "Booking request submitted — pricing pending"
                    : hasQuote
                      ? "تم إرسال طلب معاينة — التسعير قيد التحديد"
                      : "تم إرسال طلب الحجز — التسعير قيد التحديد"
                : hasQuote
                  ? english ? "Submit assessment request" : "إرسال طلب معاينة"
                  : english ? "Submit booking request" : "إرسال طلب الحجز"}
            </button>
            {!preferredTime && <p className="selection-error">{english ? "Select a preferred visit time before submitting." : "اختر وقت الزيارة المفضّل قبل الإرسال."}</p>}
            {sent && (
              <button
                className="outline full space-top"
                onClick={() => setView("requests")}
              >
                {english ? "View request status" : "عرض حالة الطلب"}
              </button>
            )}
          </main>
          <Nav />
        </div>
      </div>
    );
  if (view === "confirmed")
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header />
          <main className="screen center">
            <div className="check">
              <Check />
            </div>
            <h1 className="form-title">{t.held}</h1>
            <p className="small">{t.reminder}</p>
            <button className="cta" onClick={() => setView("home")}>
              {english ? "Back home" : "العودة للرئيسية"}
            </button>
          </main>
          <Nav />
        </div>
      </div>
    );
  if (view === "farmServices")
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header back="home" />
          <main className="screen">
            <div className="farm-page-art" />
            <div className="farm-heading">
              <span>{t.farmKicker}</span>
              <h1>{t.farmServices}</h1>
              <p>{t.farmSub}</p>
            </div>
            <section className="farm-service-list">
              {[
                [
                  Tractor,
                  english
                    ? "Land preparation & leveling"
                    : "تجهيز وتسوية الأرض",
                ],
                [
                  Leaf,
                  english ? "Seasonal crop care" : "عناية موسمية بالمحاصيل",
                ],
                [
                  Sprout,
                  english
                    ? "Planting & orchard support"
                    : "زراعة وخدمة البساتين",
                ],
              ].map(([I, label]) => {
                const Icon = I as typeof Tractor;
                return (
                  <button
                    key={label as string}
                    onClick={() => {
                      setFarm({ ...farm, work: label as string });
                      setView("farmForm");
                    }}
                  >
                    <Icon />
                    <span>{label as string}</span>
                    <small>{english ? "Quote first" : "عرض سعر أولاً"}</small>
                  </button>
                );
              })}
            </section>
            <button className="cta" onClick={() => setView("farmForm")}>
              {t.farmRequest}
            </button>
          </main>
          <Nav />
        </div>
      </div>
    );
  if (view === "farmForm")
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header back="farmServices" />
          <main className="screen">
            <h1 className="form-title">{t.farmIntro}</h1>
            <div className="form-card farm-form">
              <label>{t.work}</label>
              <input
                value={farm.work}
                onChange={(e) => setFarm({ ...farm, work: e.target.value })}
              />
              <label>{t.farmArea}</label>
              <div className="farm-area">
                <input
                  value={farm.area}
                  onChange={(e) => setFarm({ ...farm, area: e.target.value })}
                />
                <select
                  value={farm.unit}
                  onChange={(e) => setFarm({ ...farm, unit: e.target.value })}
                >
                  <option>hectare</option>
                  <option>dunum</option>
                  <option>sqm</option>
                </select>
              </div>
              <label>{t.crops}</label>
              <input
                value={farm.crops}
                onChange={(e) => setFarm({ ...farm, crops: e.target.value })}
              />
              <label>{t.photos}</label>
              <button
                className="upload"
                onClick={() => setFarm({ ...farm, photos: !farm.photos })}
              >
                <Camera />
                <b>
                  {farm.photos
                    ? english
                      ? "Photos added"
                      : "تمت إضافة الصور"
                    : english
                      ? "Add site photos"
                      : "أضف صور الموقع"}
                </b>
              </button>
              <label>{english?"Neighborhood":"الحي"}</label>
              <input
                value={farm.neighborhood}
                onChange={(e) => setFarm({ ...farm, neighborhood: e.target.value })}
              />
              <label>{english?"Exact farm address":"عنوان المزرعة الدقيق"}</label>
              <input value={farm.exactAddress} onChange={(e)=>setFarm({...farm,exactAddress:e.target.value})} placeholder={english?"Released after confirmation only":"يُعرض بعد التأكيد فقط"}/>
              <label>{t.date}</label>
              <input
                type="date"
                value={farm.date}
                onChange={(e) => setFarm({ ...farm, date: e.target.value })}
              />
            </div>
            <button
              className="cta"
              onClick={() => {
                const result=demoStore.submit({
                  providerId: "mazen",
                  customerId:"waleed", neighborhood:farm.neighborhood||neighborhood, exactAddress:farm.exactAddress||exactStreetAddress,
                  title: farm.work || t.farmServices,
                  services: ["farm"],
                  subtotal: 0,
                  quoteOnly: true,
                  status: "pending",
                  kind: "farm",
                  preferredTime: farm.date,
                  note: `${farm.area} ${farm.unit} · ${farm.crops}`,
                });
                if(!result.ok){window.alert(english?"Farm requests are temporarily unavailable from this provider.":"طلبات المزارع غير متاحة مؤقتاً لدى هذا المختص.");return}
                setView("farmConfirmed");
              }}
            >
              {t.sendQuote}
            </button>
          </main>
          <Nav />
        </div>
      </div>
    );
  if (view === "farmConfirmed")
    return (
      <div className="ghars wareef-customer" dir={dir}>
        <div className="shell">
          <Header />
          <main className="screen center">
            <div className="check">
              <Check />
            </div>
            <h1 className="form-title">{t.quoteSent}</h1>
            <p className="small">{t.quoteNote}</p>
            <button className="cta" onClick={() => setView("home")}>
              {english ? "Back home" : "العودة للرئيسية"}
            </button>
          </main>
          <Nav />
        </div>
      </div>
    );
  return (
    <div className="ghars wareef-customer" dir={dir}>
      <div className="shell">
        <header className="top top-dark">
          <WareefBrand inverse />
          <button className="lang" onClick={() => setEnglish(!english)}>
            {english ? "عربي" : "EN"}
          </button>
        </header>
        <section className="hero carousel-hero" aria-roledescription="carousel">
          {slides.map((p, i) => (
            <img
              key={p.src}
              className={i === slide ? "hero-photo current" : "hero-photo"}
              src={p.src}
              alt={i === slide ? p.alt : ""}
              aria-hidden={i !== slide}
            />
          ))}
          <div className="hero-scrim" />
          <div className="hero-location">
            <MapPin size={15} aria-hidden="true" />
            <span>{english ? "Riyadh · Al Olaya" : "الرياض · العليا"}</span>
          </div>
          <div className="hero-copy">
            <h1>{t.title}</h1>
            <p>{t.sub}</p>
          </div>
          <div className="carousel-controls">
            <button
              className="pause"
              onClick={() => setPaused(!paused)}
              aria-label="Pause"
            >
              {paused ? <Play /> : <Pause />}
            </button>
            <div className="dots">
              {slides.map((p, i) => (
                <button
                  key={p.src}
                  className={i === slide ? "dot active" : "dot"}
                  onClick={() => {
                    setSlide(i);
                    setPaused(true);
                  }}
                  aria-label={`${i + 1}`}
                />
              ))}
            </div>
          </div>
        </section>
        <GardenPhotos english={english} />
        <section className="section">
          <div className="section-head">
            <h2>{t.services}</h2>
          </div>
          <div className="services">
            {[
              [Scissors, "trim"],
              [Sprout, "plant"],
              [SlidersHorizontal, "custom"],
              [Leaf, "maintenance"],
              [PartyPopper, "party"],
            ].map(([I, k]) => {
              const Icon = I as typeof Scissors,
                key = k as ServiceKey;
              return (
                <button
                  className="service"
                  key={k as string}
                  onClick={() => choose(key)}
                >
                  <Icon />
                  {name(key)}
                </button>
              );
            })}
          </div>
          <button
            className="all-services-link"
            onClick={() => setView("catalogue")}
          >
            {english ? "Browse all services" : "تصفح جميع الخدمات"}
            <span aria-hidden="true">{english ? "→" : "←"}</span>
          </button>
        </section>
        <ProductShowcase
          english={english}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
        />
        <section className="farm-section">
          <div className="farm-photo" />
          <div className="farm-content">
            <h2>{t.farmTitle}</h2>
            <p>{t.farmSub}</p>
            <div className="farm-actions">
              <button className="cta" onClick={() => setView("farmServices")}>
                {t.farmBrowse}
              </button>
              <button className="farm-link" onClick={() => setView("farmForm")}>
                {t.farmRequest}
              </button>
            </div>
          </div>
        </section>
        <Nav />
      </div>
    </div>
  );
}
