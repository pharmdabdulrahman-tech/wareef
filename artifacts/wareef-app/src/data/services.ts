export type ServiceId = "soil" | "party" | "maintenance" | "trim" | "plant" | "custom";

export interface Service {
  id: ServiceId;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  detailsAr: string;
  detailsEn: string;
  category: "standard" | "assessment";
  iconName: string;
}

export const services: Service[] = [
  {
    id: "maintenance",
    titleAr: "تنظيف وصيانة الحديقة",
    titleEn: "Garden cleaning & maintenance",
    descAr: "عناية دورية تشمل الري والتنظيف الأساسي",
    descEn: "Regular care including watering and basic cleaning",
    detailsAr: "تشمل هذه الخدمة تنظيف الأوراق المتساقطة، الري المنتظم، صيانة التربة السطحية، والتأكد من سلامة النباتات من الآفات الواضحة. تناسب الحدائق المنزلية التي تحتاج إلى رعاية مستمرة للحفاظ على مظهرها.",
    detailsEn: "Includes clearing fallen leaves, regular watering, surface soil maintenance, and checking for obvious plant pests. Suited for home gardens requiring continuous upkeep.",
    category: "standard",
    iconName: "Leaf",
  },
  {
    id: "trim",
    titleAr: "تقليم وتشكيل",
    titleEn: "Trimming & shaping",
    descAr: "ترتيب نمو النباتات وتشذيبها عند الحاجة",
    descEn: "Keep plant growth neat and well-shaped",
    detailsAr: "يُعنى بتقليم الأشجار، تشكيل الشجيرات السياجية، وإزالة الفروع الميتة أو المريضة لضمان نمو صحي. يفضل إجراؤه في أوقات محددة من السنة بحسب نوع النبات.",
    detailsEn: "Focuses on pruning trees, shaping hedge shrubs, and removing dead or diseased branches to ensure healthy growth. Best performed at specific times of the year depending on the plant.",
    category: "standard",
    iconName: "Scissors",
  },
  {
    id: "plant",
    titleAr: "زراعة موسمية",
    titleEn: "Seasonal planting",
    descAr: "زراعة النباتات والزهور المناسبة للموسم",
    descEn: "Planting seasonal flowers and plants",
    detailsAr: "اختيار وزراعة النباتات والزهور التي تتناسب مع المناخ الحالي، مع تهيئة التربة الخاصة بها لضمان نموها بشكل سليم وإضفاء بهجة متجددة على مساحتك الخضراء.",
    detailsEn: "Selecting and planting seasonal plants and flowers suited to the current climate, along with preparing their specific soil to ensure proper growth and renewed vibrancy.",
    category: "standard",
    iconName: "Sprout",
  },
  {
    id: "soil",
    titleAr: "معالجة التربة وتجهيز الأرض",
    titleEn: "Soil & ground treatment",
    descAr: "تجهيز التربة وإضافة الأسمدة والمغذيات",
    descEn: "Soil preparation and fertilizer application",
    detailsAr: "خدمة تتطلب معاينة لتحديد نوع التربة والمغذيات الناقصة، يليها تقليب التربة وإضافة الأسمدة العضوية أو الكيميائية لتهيئة الأرض قبل الزراعة.",
    detailsEn: "Requires an assessment to determine soil type and missing nutrients, followed by tilling and adding organic or chemical fertilizers to prepare the ground for planting.",
    category: "assessment",
    iconName: "Shovel",
  },
  {
    id: "party",
    titleAr: "تنسيق الحفلات",
    titleEn: "Party styling",
    descAr: "تجهيز الحدائق للمناسبات الخاصة",
    descEn: "Garden preparation for special events",
    detailsAr: "ترتيب المساحات الخارجية للمناسبات، وتنسيق الإضاءة وتوزيع النباتات والزهور بشكل مؤقت بما يتناسب مع طابع الحفل. تتطلب زيارة معاينة للاتفاق على التفاصيل.",
    detailsEn: "Arranging outdoor spaces for events, coordinating temporary lighting and plant/flower distribution to match the party's theme. Requires a site visit to agree on details.",
    category: "assessment",
    iconName: "PartyPopper",
  },
  {
    id: "custom",
    titleAr: "احتياج خاص",
    titleEn: "Custom garden need",
    descAr: "طلب خدمة مخصصة تناسب مساحتك",
    descEn: "Request a custom service for your space",
    detailsAr: "إذا كان لديك احتياج مختلف لا يندرج تحت الخدمات القياسية، مثل زراعة أشجار نادرة أو إنشاء نظام ري متكامل، اطلب هذه الخدمة ليقوم المختص بزيارتك وتقييم العمل.",
    detailsEn: "If you have a unique requirement not covered by standard services, such as planting rare trees or installing a complex irrigation system, request this service for a specialist to assess the work.",
    category: "assessment",
    iconName: "Wrench",
  },
];

export function getServiceIntent(): ServiceId[] {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const data = window.sessionStorage.getItem('wareef_intent');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.every(s => typeof s === 'string')) {
          return parsed.filter(id => services.some(s => s.id === id)) as ServiceId[];
        }
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return [];
}

export function saveServiceIntent(intent: ServiceId[]): boolean {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('wareef_intent', JSON.stringify(intent));
      return true;
    }
  } catch (e) {
    // Cannot save
  }
  return false;
}
