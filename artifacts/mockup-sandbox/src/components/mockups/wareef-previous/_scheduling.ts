export type WorkingDay = { enabled:boolean; start:string; end:string };
export type ProviderSchedule = { capacity:number; workingHours:Record<number,WorkingDay>; daysOff:string[]; blockedDates:string[] };
export type ScheduledBooking = { id:string; providerId:string; preferredTime?:string; durationMinutes?:number; status:string };

export const defaultSchedule=():ProviderSchedule=>({capacity:1,workingHours:{
  0:{enabled:false,start:"09:00",end:"18:00"},1:{enabled:true,start:"09:00",end:"18:00"},2:{enabled:true,start:"09:00",end:"18:00"},
  3:{enabled:true,start:"09:00",end:"18:00"},4:{enabled:true,start:"09:00",end:"18:00"},5:{enabled:true,start:"09:00",end:"18:00"},6:{enabled:false,start:"09:00",end:"18:00"}
},daysOff:[],blockedDates:[]});

const dateKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const localDate=(value:string)=>new Date(value);
const reserving=(status:string)=>status==="booked"||status==="ongoing";
export const validDuration=(duration?:number)=>Number.isInteger(duration)&&Boolean(duration&&duration>0);
const interval=(booking:ScheduledBooking)=>{
  if(!reserving(booking.status)||!booking.preferredTime||!validDuration(booking.durationMinutes))return;
  const duration=booking.durationMinutes!,start=localDate(booking.preferredTime).getTime(),end=start+duration*60000;
  return Number.isFinite(start)&&Number.isFinite(end)&&end>start?{start,end}:undefined;
};
export const capacitySweep=(bookings:ScheduledBooking[],capacity:number)=>{
  const points:{at:number;delta:number}[]=[];
  bookings.forEach(b=>{const span=interval(b);if(span)points.push({at:span.start,delta:1},{at:span.end,delta:-1});});
  points.sort((a,b)=>a.at-b.at||a.delta-b.delta);
  let active=0,peak=0;for(const point of points){active+=point.delta;peak=Math.max(peak,active)}
  return {peak,overCapacity:peak>capacity};
};
export const availability=(schedule:ProviderSchedule, bookings:ScheduledBooking[], candidate:ScheduledBooking)=>{
  if(!candidate.preferredTime)return {ok:false as const,code:"time-required" as const};
  if(!validDuration(candidate.durationMinutes))return {ok:false as const,code:"duration-required" as const};
  const candidateSpan=interval(candidate);
  if(!candidateSpan)return {ok:false as const,code:"time-required" as const};
  const start=localDate(candidate.preferredTime), end=new Date(candidateSpan.end);
  const date=dateKey(start), hours=schedule.workingHours[start.getDay()];
  if(schedule.daysOff.includes(date)||schedule.blockedDates.includes(date))return {ok:false as const,code:"blocked-date" as const};
  if(!hours?.enabled)return {ok:false as const,code:"outside-hours" as const};
  const startMinutes=start.getHours()*60+start.getMinutes(),endMinutes=end.getHours()*60+end.getMinutes();
  const [sh,sm]=hours.start.split(":").map(Number),[eh,em]=hours.end.split(":").map(Number);
  if(end.toDateString()!==start.toDateString()||startMinutes<sh*60+sm||endMinutes>eh*60+em)return {ok:false as const,code:"outside-hours" as const};
  // Only sweep the candidate's time window. Existing historical conflicts elsewhere
  // must remain visible but cannot veto a separate appointment.
  const relevant=bookings.filter(b=>{
    if(b.providerId!==candidate.providerId||b.id===candidate.id)return false;
    const span=interval(b);return Boolean(span&&span.start<candidateSpan.end&&span.end>candidateSpan.start);
  }).map(b=>{
    const span=interval(b)!;
    const clippedStart=Math.max(span.start,candidateSpan.start),clippedEnd=Math.min(span.end,candidateSpan.end);
    return {...b,preferredTime:new Date(clippedStart).toISOString(),durationMinutes:(clippedEnd-clippedStart)/60000};
  });
  if(capacitySweep([...relevant,candidate],schedule.capacity).overCapacity)return {ok:false as const,code:"capacity" as const};
  return {ok:true as const};
};
export const schedulingMessage=(code:string,english:boolean)=>({
  "time-required":english?"Choose a date and time before confirming.":"اختر التاريخ والوقت قبل التأكيد.",
  "duration-required":english?"Enter a positive whole-number duration including travel and setup.":"أدخل مدة صحيحة موجبة بالدقائق تشمل التنقل والتجهيز.",
  "blocked-date":english?"This date is blocked or marked as a day off.":"هذا التاريخ محظور أو مسجل كيوم إجازة.",
  "outside-hours":english?"This appointment falls outside the shop’s working hours.":"هذا الموعد خارج ساعات عمل المتجر.",
  capacity:english?"This time is at the shop’s simultaneous-job limit. Choose another time.":"هذا الوقت بلغ حد الأعمال المتزامنة للمتجر. اختر وقتاً آخر.",
  suspended:english?"This provider is suspended and cannot accept new work.":"هذا المختص موقوف ولا يمكنه قبول أعمال جديدة."
}[code]??(english?"Scheduling could not be updated.":"تعذر تحديث الجدولة."));