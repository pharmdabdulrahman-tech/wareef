import { useState } from "react";
import { ArrowLeft, ArrowRight, Heart, Leaf, Wrench } from "lucide-react";
import "./_group.css";

type View = "hub" | "services" | "products";

export function Current() {
  const [view, setView] = useState<View>("hub");
  const english = false;
  const text = (ar: string, en: string) => english ? en : ar;
  const DirectionIcon = english ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen customer-app ghars wareef-customer" dir={english ? "ltr" : "rtl"} data-preview-view={view}>
      <div className="shell">
        <main className="screen needs-hub">
          <div className="hub-intro">
            <p className="hub-kicker">{text("استكشف وريف", "EXPLORE WAREEF")}</p>
            <h1 className="form-title">{text("كيف نساعدك؟", "How can we help?")}</h1>
            <p className="small">{text("اختر القسم الذي يناسب احتياجك.", "Choose a category to get started.")}</p>
          </div>
          <div className="needs-grid">
            <button className="need-card services" onClick={() => setView("services")}>
              <span className="need-icon"><Wrench /></span>
              <span>
                <b>{text("الخدمات", "Services")}</b>
                <small>{text("احجز عناية لمساحتك", "Book care for your space")}</small>
              </span>
              <i><DirectionIcon /></i>
            </button>
            <button className="need-card products" onClick={() => setView("products")}>
              <span className="need-icon"><Leaf /></span>
              <span>
                <b>{text("المنتجات", "Products")}</b>
                <small>{text("نباتات وأصص ومستلزمات", "Plants, pots & essentials")}</small>
              </span>
              <i><DirectionIcon /></i>
            </button>
            <button className="need-card subscriptions" disabled>
              <span className="need-icon"><Heart /></span>
              <span>
                <b>{text("الاشتراكات", "Subscriptions")}</b>
                <small>{text("غير متاحة حتى تكتمل تفاصيل التشغيل", "Unavailable until operating details are finalized")}</small>
              </span>
              <i>—</i>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}