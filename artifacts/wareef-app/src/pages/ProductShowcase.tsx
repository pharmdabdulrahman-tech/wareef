import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Heart,
  X,
} from "lucide-react";
import "./ProductShowcase.css";

type ProductKind = "plant" | "tool" | "supply";
type ProductBase = {
  id: string;
  ar: string;
  en: string;
  descriptionAr: string;
  descriptionEn: string;
  price: number;
  kind: ProductKind;
};
export type Product = ProductBase & { image: string };
type Shop = {
  id: string;
  ar: string;
  en: string;
  noteAr: string;
  noteEn: string;
  products: Product[];
};
type ShopBase = Omit<Shop, "products"> & { products: ProductBase[] };
export type CatalogueProduct = Product & {
  shop: Pick<Shop, "id" | "ar" | "en">;
};

const productImages: Record<string, string> = {
  "ward-1": "/images/products/ward-1.jpg",
  "ward-2": "/images/products/ward-2.jpg",
  "ward-3": "/images/products/ward-3.jpg",
  "ward-4": "/images/products/ward-4.jpg",
  "ward-5": "/images/products/ward-5.jpg",
  "ward-6": "/images/products/ward-6.jpg",
  "ward-7": "/images/products/ward-7.jpg",
  "bayt-1": "/images/products/bayt-1.jpg",
  "bayt-2": "/images/products/bayt-2.jpg",
  "bayt-3": "/images/products/bayt-3.webp",
  "bayt-4": "/images/products/bayt-4.jpg",
  "bayt-5": "/images/products/bayt-5.jpg",
  "bayt-6": "/images/products/bayt-6.jpg",
  "bayt-7": "/images/products/bayt-7.jpg",
  "turab-1": "/images/products/turab-1.jpg",
  "turab-2": "/images/products/turab-2.jpg",
  "turab-3": "/images/products/turab-3.jpg",
  "turab-4": "/images/products/turab-4.jpg",
  "turab-5": "/images/products/turab-5.jpg",
  "turab-6": "/images/products/turab-6.jpg",
  "turab-7": "/images/products/turab-7.jpg",
  "rawda-1": "/images/products/rawda-1.jpg",
  "rawda-2": "/images/products/rawda-2.png",
  "rawda-3": "/images/products/rawda-3.jpg",
  "rawda-4": "/images/products/rawda-4.jpg",
  "rawda-5": "/images/products/rawda-5.jpg",
  "rawda-6": "/images/products/rawda-6.jpg",
  "rawda-7": "/images/products/rawda-7.jpg",
};

const shopData: ShopBase[] = [
  {
    id: "ward",
    ar: "مشتل ورد الرياض",
    en: "Ward Riyadh Nursery",
    noteAr: "نباتات منزلية مختارة للمساحات المضيئة",
    noteEn: "Considered houseplants for bright rooms",
    products: [
      {
        id: "ward-1",
        ar: "مونستيرا صغيرة",
        en: "Young Monstera",
        descriptionAr:
          "نبتة ورقية للمساحات الداخلية المضاءة، مع أصيص بسيط للعرض.",
        descriptionEn:
          "A leafy indoor plant for bright spaces, shown in a simple nursery pot.",
        price: 48,
        kind: "plant",
      },
      {
        id: "ward-2",
        ar: "زاميا",
        en: "ZZ Plant",
        descriptionAr:
          "نبتة داخلية متماسكة للاستخدام التوضيحي في المداخل والزوايا.",
        descriptionEn: "A sturdy indoor plant shown for entryways and corners.",
        price: 39,
        kind: "plant",
      },
      {
        id: "ward-3",
        ar: "فيكس مطاط",
        en: "Rubber Plant",
        descriptionAr: "أوراق عريضة داكنة لإضافة حضور نباتي هادئ في المنزل.",
        descriptionEn:
          "Broad dark leaves for a calm botanical presence at home.",
        price: 62,
        kind: "plant",
      },
      {
        id: "ward-4",
        ar: "بوتس متدلٍ",
        en: "Trailing Pothos",
        descriptionAr: "خيار متدلٍ للرفوف والسلال في التصورات المنزلية.",
        descriptionEn:
          "A trailing option for shelves and hanging baskets in home concepts.",
        price: 28,
        kind: "plant",
      },
      {
        id: "ward-5",
        ar: "سانسيفيريا",
        en: "Snake Plant",
        descriptionAr: "نبات قائم بخطوط واضحة، مناسب للعرض في الزوايا.",
        descriptionEn:
          "An upright, graphic plant for illustrative corner styling.",
        price: 44,
        kind: "plant",
      },
      {
        id: "ward-6",
        ar: "أصيص فخاري",
        en: "Clay Planter",
        descriptionAr: "أصيص فخاري بفتحة تصريف، معروض كجزء من تشكيلة المشتل.",
        descriptionEn:
          "A drainage-ready clay planter shown as part of the nursery collection.",
        price: 22,
        kind: "supply",
      },
      {
        id: "ward-7",
        ar: "تربة داخلية",
        en: "Indoor Potting Mix",
        descriptionAr: "خلطة تربة مخصصة للعرض مع النباتات المنزلية.",
        descriptionEn:
          "A potting mix displayed alongside indoor plant selections.",
        price: 18,
        kind: "supply",
      },
    ],
  },
  {
    id: "bayt",
    ar: "بيت البذور",
    en: "Bayt Al Buthoor",
    noteAr: "بذور ومستلزمات موسمية لحديقة الشرفة",
    noteEn: "Seasonal seeds and balcony-garden supplies",
    products: [
      {
        id: "bayt-1",
        ar: "بذور ريحان",
        en: "Basil Seeds",
        descriptionAr: "عبوة بذور للزراعة الموسمية في أصص الشرفة.",
        descriptionEn: "A seed packet for seasonal balcony pots.",
        price: 12,
        kind: "supply",
      },
      {
        id: "bayt-2",
        ar: "بذور طماطم كرزية",
        en: "Cherry Tomato Seeds",
        descriptionAr: "بذور موضّحة لتجارب الزراعة المنزلية الصغيرة.",
        descriptionEn: "Seeds illustrated for small home-growing projects.",
        price: 14,
        kind: "supply",
      },
      {
        id: "bayt-3",
        ar: "مرش يدوي",
        en: "Hand Mister",
        descriptionAr: "مرش خفيف للعناية اليومية بالنباتات، للعرض فقط.",
        descriptionEn:
          "A light daily-care mister, displayed for demonstration.",
        price: 26,
        kind: "tool",
      },
      {
        id: "bayt-4",
        ar: "مجرفة صغيرة",
        en: "Hand Trowel",
        descriptionAr: "أداة صغيرة لتبديل التربة في الأصص.",
        descriptionEn: "A compact tool for refreshing soil in pots.",
        price: 21,
        kind: "tool",
      },
      {
        id: "bayt-5",
        ar: "بطاقة تعريف نبات",
        en: "Plant Label Set",
        descriptionAr: "بطاقات خشبية لكتابة أسماء المزروعات في الحديقة.",
        descriptionEn: "Wooden labels for noting plants in a garden.",
        price: 16,
        kind: "supply",
      },
      {
        id: "bayt-6",
        ar: "صينية إنبات",
        en: "Seedling Tray",
        descriptionAr: "صينية لتقديم مراحل الإنبات ضمن النموذج.",
        descriptionEn: "A tray for presenting germination stages in the demo.",
        price: 19,
        kind: "supply",
      },
      {
        id: "bayt-7",
        ar: "مقص أعشاب",
        en: "Herb Snips",
        descriptionAr: "مقص صغير مخصص لتنسيق الأعشاب المنزلية.",
        descriptionEn: "Small snips for tending home-grown herbs.",
        price: 24,
        kind: "tool",
      },
    ],
  },
  {
    id: "turab",
    ar: "تراب وحديد",
    en: "Turab & Hadid",
    noteAr: "أدوات حديقة عملية للعناية الأسبوعية",
    noteEn: "Practical tools for weekly garden care",
    products: [
      {
        id: "turab-1",
        ar: "مقص تقليم",
        en: "Pruning Shears",
        descriptionAr: "مقص تقليم يدوي ضمن مجموعة الأدوات المعروضة.",
        descriptionEn:
          "Manual pruning shears in the illustrated tool collection.",
        price: 58,
        kind: "tool",
      },
      {
        id: "turab-2",
        ar: "قفازات زراعة",
        en: "Garden Gloves",
        descriptionAr: "قفازات متينة لأعمال التربة الخفيفة.",
        descriptionEn: "Durable gloves for light soil work.",
        price: 31,
        kind: "tool",
      },
      {
        id: "turab-3",
        ar: "مشط تسوية",
        en: "Soil Rake",
        descriptionAr: "أداة صغيرة لتسوية سطح التربة في الأحواض.",
        descriptionEn: "A small rake for smoothing soil in planters.",
        price: 36,
        kind: "tool",
      },
      {
        id: "turab-4",
        ar: "خرطوم مرن",
        en: "Flex Hose",
        descriptionAr: "خرطوم ري مرن معروض ضمن أدوات العناية الخارجية.",
        descriptionEn: "A flexible hose displayed with outdoor care tools.",
        price: 74,
        kind: "tool",
      },
      {
        id: "turab-5",
        ar: "رأس رش",
        en: "Spray Nozzle",
        descriptionAr: "رأس ري متعدد الأنماط للاستخدام التوضيحي.",
        descriptionEn: "A multi-pattern watering nozzle for demonstration.",
        price: 29,
        kind: "tool",
      },
      {
        id: "turab-6",
        ar: "شبكة دعم",
        en: "Plant Support Net",
        descriptionAr: "شبكة خفيفة لدعم النباتات المتسلقة.",
        descriptionEn: "A lightweight support net for climbing plants.",
        price: 33,
        kind: "supply",
      },
      {
        id: "turab-7",
        ar: "حقيبة أدوات",
        en: "Tool Tote",
        descriptionAr: "حقيبة قماشية لتنظيم أدوات الحديقة الأساسية.",
        descriptionEn: "A canvas tote for organizing essential garden tools.",
        price: 47,
        kind: "tool",
      },
    ],
  },
  {
    id: "rawda",
    ar: "روضة الموسم",
    en: "Rawdat Al Mawsem",
    noteAr: "تفاصيل موسمية لبداية مساحة خضراء جديدة",
    noteEn: "Seasonal details for starting a new green space",
    products: [
      {
        id: "rawda-1",
        ar: "لافندر",
        en: "Lavender",
        descriptionAr: "نبات عطري معروض للحدود المشمسة والتنسيقات الموسمية.",
        descriptionEn:
          "An aromatic plant displayed for sunny borders and seasonal compositions.",
        price: 32,
        kind: "plant",
      },
      {
        id: "rawda-2",
        ar: "ياسمين عربي",
        en: "Arabian Jasmine",
        descriptionAr: "نبات مزهر لتصورات الشرفات والفناء.",
        descriptionEn: "A flowering plant for balcony and courtyard concepts.",
        price: 54,
        kind: "plant",
      },
      {
        id: "rawda-3",
        ar: "روز ماري",
        en: "Rosemary",
        descriptionAr: "عشب عطري للأصص القريبة من الشمس.",
        descriptionEn: "An aromatic herb for sun-facing pots.",
        price: 25,
        kind: "plant",
      },
      {
        id: "rawda-4",
        ar: "سماد عضوي",
        en: "Organic Compost",
        descriptionAr: "كيس سماد ضمن اقتراحات تجهيز التربة الموسمية.",
        descriptionEn:
          "A compost bag shown in seasonal soil-preparation suggestions.",
        price: 23,
        kind: "supply",
      },
      {
        id: "rawda-5",
        ar: "نشارة خشب",
        en: "Bark Mulch",
        descriptionAr: "طبقة تغطية سطحية للعرض في أحواض الزراعة.",
        descriptionEn: "A surface cover illustrated for planting beds.",
        price: 20,
        kind: "supply",
      },
      {
        id: "rawda-6",
        ar: "أصيص حافة",
        en: "Rim Planter",
        descriptionAr: "أصيص ضيق لتصميم حواف الشرفات.",
        descriptionEn: "A slim planter for styling balcony rails.",
        price: 34,
        kind: "supply",
      },
      {
        id: "rawda-7",
        ar: "سلة خيزران",
        en: "Bamboo Basket",
        descriptionAr: "سلة عرض خفيفة لتجميع أدوات العناية الصغيرة.",
        descriptionEn: "A light display basket for gathering small care items.",
        price: 27,
        kind: "supply",
      },
    ],
  },
];

const shops: Shop[] = shopData.map((shop) => ({
  ...shop,
  products: shop.products.map((product) => ({
    ...product,
    image: productImages[product.id],
  })),
}));

export const productCatalogue: CatalogueProduct[] = shops.flatMap(
  ({ id, ar, en, products }) =>
    products.map((product) => ({ ...product, shop: { id, ar, en } })),
);

export const productImageUrl = (image: string) =>
  `${import.meta.env.BASE_URL.replace(/\/$/, "")}${image}`;

const ProductPhoto = ({
  product,
  english,
  detail = false,
}: {
  product: Product;
  english: boolean;
  detail?: boolean;
}) => (
  <span
    className={`${detail ? "product-detail-art" : "product-illustration"} ${product.kind}`}
  >
    <img
      src={productImageUrl(product.image)}
      alt={english ? `Photo of ${product.en}` : `صورة ${product.ar}`}
      loading="lazy"
      decoding="async"
    />
  </span>
);

type ProductShowcaseProps = {
  english: boolean;
  favoriteIds: string[];
  onToggleFavorite: (productId: string) => void;
};

export function ProductShowcase({
  english,
  favoriteIds,
  onToggleFavorite,
}: ProductShowcaseProps) {
  const [activeShop, setActiveShop] = useState<Shop | null>(null);
  const [activeProduct, setActiveProduct] = useState<{
    product: Product;
    shop: Shop;
  } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const isOpen = Boolean(activeShop || activeProduct);
  const close = () => {
    setActiveShop(null);
    setActiveProduct(null);
    window.setTimeout(() => openerRef.current?.focus(), 0);
  };
  const openShop = (shop: Shop, target: HTMLElement) => {
    openerRef.current = target;
    setActiveProduct(null);
    setActiveShop(shop);
  };
  const openProduct = (product: Product, shop: Shop, target: HTMLElement) => {
    openerRef.current = target;
    setActiveShop(null);
    setActiveProduct({ product, shop });
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    window.setTimeout(
      () => dialogRef.current?.querySelector<HTMLElement>("button")?.focus(),
      0,
    );
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const text = (ar: string, en: string) => (english ? en : ar);
  const forward = english ? (
    <ArrowRight aria-hidden="true" />
  ) : (
    <ArrowLeft aria-hidden="true" />
  );
  const FavoriteButton = ({ product }: { product: Product }) => {
    const saved = favoriteIds.includes(product.id);
    return (
      <button
        type="button"
        className={`product-favorite ${saved ? "saved" : ""}`}
        onClick={() => onToggleFavorite(product.id)}
        aria-pressed={saved}
        aria-label={
          saved
            ? english
              ? `Remove ${product.en} from favorites`
              : `إزالة ${product.ar} من المفضلة`
            : english
              ? `Add ${product.en} to favorites`
              : `إضافة ${product.ar} إلى المفضلة`
        }
      >
        <Heart aria-hidden="true" fill={saved ? "currentColor" : "none"} />
      </button>
    );
  };
  return (
    <section
      className="product-showcase"
      aria-labelledby="product-showcase-title"
    >
      <div className="product-showcase-heading">
        <div>
          <h2 id="product-showcase-title">
            {english
              ? "Garden finds to explore"
              : "منتجات حدائق تستحق الاستكشاف"}
          </h2>
        </div>
      </div>
      <div className="showcase-rows">
        {shops.map((shop) => (
          <article className="shop-product-row" key={shop.id}>
            <header>
              <div>
                <h3>{text(shop.ar, shop.en)}</h3>
                <p>{text(shop.noteAr, shop.noteEn)}</p>
              </div>
              <button onClick={(event) => openShop(shop, event.currentTarget)}>
                {english ? "All products" : "كل المنتجات"} {forward}
              </button>
            </header>
            <div
              className="product-strip"
              aria-label={`${text(shop.ar, shop.en)} ${english ? "products" : "منتجات"}`}
            >
              {shop.products.slice(0, 6).map((product) => (
                <article className="product-card" key={product.id}>
                  <button
                    type="button"
                    className="product-card-open"
                    onClick={(event) =>
                      openProduct(product, shop, event.currentTarget)
                    }
                    aria-label={`${text(product.ar, product.en)} — ${text(shop.ar, shop.en)}`}
                  >
                    <ProductPhoto product={product} english={english} />
                    <b>{text(product.ar, product.en)}</b>
                        <small>
                          {english
                            ? "To be determined later"
                            : "تُحدّد لاحقاً"}
                        </small>
                  </button>
                  <FavoriteButton product={product} />
                </article>
              ))}
              <button
                className="view-all-tile"
                onClick={(event) => openShop(shop, event.currentTarget)}
                aria-label={`${english ? "View all products from" : "عرض كل منتجات"} ${text(shop.ar, shop.en)}`}
              >
                <span>{forward}</span>
                <b>{english ? "View all products" : "عرض كل المنتجات"}</b>
                <small>
                  {shop.products.length}{" "}
                  {english ? "items" : "منتجات"}
                </small>
              </button>
            </div>
          </article>
        ))}
      </div>
      {isOpen && (
        <div
          className="showcase-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            className="showcase-dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="showcase-dialog-title"
          >
            <button
              className="showcase-close"
              onClick={close}
              aria-label={english ? "Close product view" : "إغلاق عرض المنتجات"}
            >
              <X aria-hidden="true" />
            </button>
            {activeShop && (
              <>
                <p className="dialog-kicker">
                  {english
                    ? "SHOP CATALOGUE"
                    : "كتالوج المتجر"}
                </p>
                <h2 id="showcase-dialog-title">
                  {text(activeShop.ar, activeShop.en)}
                </h2>
                <p className="dialog-note">
                  {english
                    ? "Select products with the heart to include them in your inquiry. Price, stock and delivery are confirmed later."
                    : "اختر المنتجات بالقلب لإضافتها إلى طلب الاستفسار. يُؤكد السعر والمخزون والتوصيل لاحقاً."}
                </p>
                <div className="catalogue-grid">
                  {activeShop.products.map((product) => (
                    <article key={product.id} className="catalogue-product">
                      <button
                        type="button"
                        className="catalogue-product-open"
                        onClick={(event) =>
                          openProduct(product, activeShop, event.currentTarget)
                        }
                      >
                        <ProductPhoto product={product} english={english} />
                        <span>
                          <b>{text(product.ar, product.en)}</b>
                          <small>
                            {english
                              ? "To be determined later"
                              : "تُحدّد لاحقاً"}
                          </small>
                        </span>
                        <ChevronRight aria-hidden="true" />
                      </button>
                      <FavoriteButton product={product} />
                    </article>
                  ))}
                </div>
              </>
            )}
            {activeProduct && (
              <>
                <button
                  className="dialog-back"
                  onClick={() => {
                    setActiveProduct(null);
                    setActiveShop(activeProduct.shop);
                  }}
                >
                  {english ? (
                    <ChevronLeft aria-hidden="true" />
                  ) : (
                    <ChevronRight aria-hidden="true" />
                  )}
                  {english ? "Back to shop" : "العودة للمتجر"}
                </button>
                <ProductPhoto
                  product={activeProduct.product}
                  english={english}
                  detail
                />
                <div className="product-detail-heading">
                  <div>
                    <p className="dialog-kicker">
                      {english
                        ? "PRODUCT PREVIEW"
                        : "معاينة المنتج"}
                    </p>
                    <h2 id="showcase-dialog-title">
                      {text(activeProduct.product.ar, activeProduct.product.en)}
                    </h2>
                  </div>
                  <FavoriteButton product={activeProduct.product} />
                </div>
                <p className="detail-shop">
                  {text(activeProduct.shop.ar, activeProduct.shop.en)}
                </p>
                <p className="detail-description">
                  {text(
                    activeProduct.product.descriptionAr,
                    activeProduct.product.descriptionEn,
                  )}
                </p>
                <div className="illustrative-price">
                  <span>{english ? "Pricing" : "التسعير"}</span>
                  <b>{english ? "To be determined later" : "تُحدّد لاحقاً"}</b>
                </div>
                <p className="dialog-note">
                  {english
                    ? "Add this product to an inquiry. No payment is taken and availability is not guaranteed."
                    : "أضف المنتج إلى طلب استفسار. لا يتم الدفع ولا نضمن التوفر."}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
