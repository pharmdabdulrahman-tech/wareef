export type Plant = { ar:string; en:string; botanical:string; sun:string; water:string; care:string; sunAr:string; waterAr:string; careAr:string; region:string; regionAr:string };
export const plants: Plant[] = [
  {ar:"ياسمين عربي",en:"Arabian jasmine",botanical:"Jasminum sambac",sun:"Full sun / part shade",water:"2–3× weekly",care:"Light pruning",sunAr:"شمس كاملة أو ظل جزئي",waterAr:"مرتان إلى ثلاث أسبوعياً",careAr:"تقليم خفيف",region:"Central-region catalogue",regionAr:"كتالوج المنطقة الوسطى"},
  {ar:"نخيل البلح",en:"Date palm",botanical:"Phoenix dactylifera",sun:"Full sun",water:"Deep weekly soak",care:"Seasonal clean-up",sunAr:"شمس كاملة",waterAr:"ري عميق أسبوعياً",careAr:"تنظيف موسمي",region:"Central-region catalogue",regionAr:"كتالوج المنطقة الوسطى"},
  {ar:"جهنمية",en:"Bougainvillea",botanical:"Bougainvillea glabra",sun:"Full sun",water:"Weekly once established",care:"Low",sunAr:"شمس كاملة",waterAr:"أسبوعياً بعد الاستقرار",careAr:"عناية قليلة",region:"Warm-region catalogue",regionAr:"كتالوج المناطق الدافئة"},
  {ar:"روز ماري",en:"Rosemary",botanical:"Salvia rosmarinus",sun:"Full sun",water:"Every 5–7 days",care:"Low",sunAr:"شمس كاملة",waterAr:"كل ٥–٧ أيام",careAr:"عناية قليلة",region:"Dry-garden catalogue",regionAr:"كتالوج الحدائق الجافة"}
];

export const designProviders = [
  {id:"nawa", ar:"نواة الخضراء", en:"Nawa Gardens", distance:"1.7 km", rating:"4.8"},
  {id:"mazen", ar:"حدائق مازن", en:"Mazen Garden Care", distance:"3.1 km", rating:"4.9"},
  {id:"rawaf", ar:"رواف للمساحات", en:"Rawaf Outdoor", distance:"4.6 km", rating:"4.7"}
];