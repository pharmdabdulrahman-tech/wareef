import { useEffect, useRef, useState } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, RedirectToSignIn, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useGetCurrentUser, useGetSecuritySummary, useHealthCheck, useUpdateCurrentUser, getGetCurrentUserQueryKey, getGetSecuritySummaryQueryKey } from '@workspace/api-client-react';
import { Leaf, ShieldCheck, MapPin, ArrowLeft, ArrowRight, LockKeyhole, Sprout, ChevronDown, Check, CircleAlert } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import CustomerPage from '@/pages/customer';
import { AdminProviders, ProviderCenter } from '@/pages/lifecycle';
import AccountPage from '@/pages/AccountPage';
import { Route, Switch, Link, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`brand ${light ? 'brand-light' : ''}`} data-testid="link-brand"><span className="brand-mark"><Leaf size={18} /></span><b>وريف</b><small>WAREEF</small></Link>;
}

function LanguageToggle({ english, onToggle }: { english: boolean; onToggle: () => void }) {
  return <button className="language" onClick={onToggle} data-testid="button-language">{english ? 'عربي' : 'EN'} <ChevronDown size={14} /></button>;
}

function Landing() {
  const [english, setEnglish] = useState(false);
  const { isLoading, isError } = useHealthCheck();
  const t = english ? { nav:'How it works', sign:'Sign in', join:'Create account', kicker:'CARE FOR THE PLACES THAT CARE FOR YOU', title:'A better way to live with your garden.', sub:'Wareef brings trusted garden care closer to home — thoughtfully matched to your space, your city, and your rhythm.', start:'Find your care', story:'Made for living outdoors', note:'A calm, clear beginning for every garden.' } : { nav:'كيف نعمل', sign:'تسجيل الدخول', join:'إنشاء حساب', kicker:'العناية بالأماكن التي تعتني بك', title:'حديقتك تستحق عناية تُرى.', sub:'وريف يقرّب لك عناية الحدائق الموثوقة — باهتمام يناسب مساحتك، مدينتك، وإيقاعك.', start:'ابدأ عنايتك', story:'مصممون للحياة في الخارج', note:'بداية هادئة وواضحة لكل حديقة.' };
  return <main className="landing noise" dir={english ? 'ltr' : 'rtl'}>
    <nav className="nav-wrap"><Brand /><div className="nav-links"><a href="#story" data-testid="link-how">{t.nav}</a><LanguageToggle english={english} onToggle={() => setEnglish(!english)} /><Link href="/sign-in" className="nav-sign" data-testid="link-sign-in">{t.sign}</Link><Link href="/sign-up" className="nav-join" data-testid="link-sign-up">{t.join}</Link></div></nav>
    <section className="hero">
      <div className="hero-copy reveal"><p className="eyebrow">{t.kicker}</p><h1>{t.title}</h1><p className="hero-sub">{t.sub}</p><div className="hero-actions"><Link href="/services" className="primary-btn" data-testid="button-start">{t.start} {english ? <ArrowRight size={17}/> : <ArrowLeft size={17}/>}</Link><span className="quiet-note"><span className="dot" />{t.note}</span></div></div>
      <div className="hero-photo reveal"><img src={`${basePath}/images/ghars-garden.jpg`} alt="A sunlit garden with leafy plants" /><div className="photo-stamp"><Sprout size={18}/><span>{english ? 'your place, growing' : 'مساحتك، تنمو'}</span></div></div>
    </section>
    <section className="story" id="story"><div className="section-label"><span>01</span><span>{t.story}</span></div><div className="story-grid"><h2>{english ? 'The little details make a garden feel like yours.' : 'التفاصيل الصغيرة تجعل الحديقة مكانك.'}</h2><div><p>{english ? 'From the first question to the right kind of care, Wareef keeps things human. Tell us where you are and what your space needs. We will help you take the next clear step.' : 'من أول سؤال إلى نوع العناية المناسب، نبقي التجربة إنسانية. أخبرنا أين أنت وما الذي تحتاجه مساحتك، وسنساعدك على اتخاذ الخطوة الواضحة التالية.'}</p><Link href="/services" className="text-link" data-testid="link-story">{english ? 'Start with your space' : 'ابدأ بمساحتك'} <ArrowLeft size={15}/></Link></div></div></section>
    <section className="image-band"><img src={`${basePath}/images/wareef-garden-sunrise.jpg`} alt="Garden at sunrise" /><div><p className="eyebrow">02 / WAREEF</p><h2>{english ? 'A more considered kind of care.' : 'عناية أكثر اهتماماً.'}</h2></div></section>
    <footer><Brand /><span>© Wareef. {english ? 'Made for gardens in Saudi Arabia.' : 'للحدائق في المملكة العربية السعودية.'}</span></footer>
    {isLoading && <span className="health" aria-hidden="true" />}{isError && <span className="health-error" title="Service unavailable"><CircleAlert size={14}/></span>}
  </main>;
}

const clerkAppearance = { theme: shadcn, cssLayerName: 'clerk', options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` }, variables: { colorPrimary: '#1f5c43', colorForeground: '#1f2f26', colorMutedForeground: '#5f7065', colorDanger: '#a13d35', colorBackground: '#fffdf8', colorInput: '#fcfdfb', colorInputForeground: '#1f2f26', colorNeutral: '#dce8dc', fontFamily: 'Manrope', borderRadius: '0.75rem' }, elements: { rootBox: 'w-full flex justify-center', cardBox: 'bg-[#fffdf8] rounded-2xl w-[440px] max-w-full overflow-hidden', card: '!shadow-none !border-0 !bg-transparent !rounded-none', footer: '!shadow-none !border-0 !bg-transparent !rounded-none', headerTitle: 'text-[#1f2f26]', headerSubtitle: 'text-[#5f7065]', socialButtonsBlockButtonText: 'text-[#1f2f26]', formFieldLabel: 'text-[#1f2f26]', footerActionLink: 'text-[#1f5c43]', footerActionText: 'text-[#5f7065]', dividerText: 'text-[#5f7065]', formButtonPrimary: 'bg-[#1f5c43] hover:bg-[#174733]', formFieldInput: 'border-[#dce8dc] bg-[#fcfdfb] text-[#1f2f26]', logoBox: 'hidden' } };
function AuthRedirect() { return <><Show when="signed-in"><RedirectToReview /></Show><Show when="signed-out"><div className="auth-page" dir="rtl"><Brand light/><div className="clerk-card"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} forceRedirectUrl={`${basePath}/review`} /></div></div></Show></>; }
function SignUpPage() { return <><Show when="signed-in"><RedirectToReview /></Show><Show when="signed-out"><div className="auth-page" dir="rtl"><Brand light/><div className="clerk-card"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} forceRedirectUrl={`${basePath}/review`} /></div></div></Show></>; }
function RedirectToAccount() { const [, setLocation] = useLocation(); useEffect(() => setLocation('/account'), [setLocation]); return null; }
function RedirectToServices() { const [, setLocation] = useLocation(); useEffect(() => setLocation('/services'), [setLocation]); return null; }
function RedirectToReview() { const [, setLocation] = useLocation(); useEffect(() => setLocation(localStorage.getItem('wareef_service_booking_v2') || sessionStorage.getItem('wareef_order_intent_v1') ? '/review' : '/'), [setLocation]); return null; }

function Account() {
  const { isLoaded, isSignedIn, user } = useUser();
  const qc = useQueryClient();
  const [english, setEnglish] = useState(false);
  const [form, setForm] = useState({ displayName:'', phone:'', city:'', preferredLanguage:'ar' as 'ar'|'en' });
  const [saved, setSaved] = useState(false);
  const profile = useGetCurrentUser({ query: { enabled: !!isSignedIn, queryKey: getGetCurrentUserQueryKey() } });
  const security = useGetSecuritySummary({ query: { enabled: !!isSignedIn, queryKey: getGetSecuritySummaryQueryKey() } });
  const update = useUpdateCurrentUser();
  const current = profile.data;
  // Account changes are handled by ClerkQueryClientCacheInvalidator.
  // Clearing here would cancel the profile requests on every account-page mount.
  useEffect(() => { if (current) { setForm({ displayName:current.displayName, phone:current.phone ?? '', city:current.city ?? '', preferredLanguage:current.preferredLanguage }); setEnglish(current.preferredLanguage === 'en'); } }, [current]);
  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <RedirectToSignIn />;
  const ar = !english;
  const save = () => update.mutate({ data: { displayName:form.displayName, phone:form.phone || null, city:form.city || null, preferredLanguage:form.preferredLanguage } }, { onSuccess: (next) => { qc.setQueryData(getGetCurrentUserQueryKey(), next); setSaved(true); window.setTimeout(() => setSaved(false), 2400); } });
  const role = current?.role ?? 'customer';
  const roleName = role === 'admin' ? (ar ? 'مشرف' : 'Admin') : role === 'provider_owner' ? (ar ? 'مالك متجر' : 'Shop owner') : (ar ? 'حساب' : 'Account');
  return <main className="account-page noise" dir={ar ? 'rtl' : 'ltr'}><header className="account-header"><Brand/><div className="account-actions"><LanguageToggle english={english} onToggle={() => { setEnglish(!english); setForm({...form, preferredLanguage:english ? 'ar' : 'en'}); }}/><AccountMenu name={form.displayName || user.firstName || (ar ? 'حسابي' : 'Account')} ar={ar}/></div></header><div className="account-shell"><div className="account-intro"><p className="eyebrow">WAREEF / {ar ? 'حسابك' : 'YOUR ACCOUNT'}</p><h1>{ar ? `مرحباً، ${form.displayName || 'بك'}` : `Welcome, ${form.displayName || 'there'}`}</h1><p>{ar ? 'ملفك محفوظ لك وحدك. حدّث تفاصيلك متى شئت.' : 'Your profile is private to you. Keep your details up to date.'}</p><div className="account-role-links"><Link href="/provider">{role === 'provider_owner' ? (ar ? 'مساحة المتجر والطلبات' : 'Shop & requests') : (ar ? 'طلب الانضمام كمختص' : 'Apply as a specialist')}</Link>{role === 'admin' && <Link href="/admin/providers">{ar ? 'مراجعة طلبات المختصين' : 'Review specialist applications'}</Link>}<Link href="/orders">{ar ? 'طلباتي' : 'My requests'}</Link></div></div>{profile.isLoading || security.isLoading ? <AccountSkeleton/> : profile.isError || security.isError ? <ErrorCard onRetry={() => { profile.refetch(); security.refetch(); }} ar={ar}/> : <div className="account-grid"><section className="profile-card"><div className="card-heading"><div className="avatar">{(form.displayName || user.firstName || 'و').slice(0,1)}</div><div><h2>{ar ? 'الملف الشخصي' : 'Personal profile'}</h2><span className="role-pill"><Check size={13}/> {roleName}</span></div></div><label>{ar ? 'الاسم الظاهر' : 'Display name'}<input data-testid="input-display-name" value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} /></label><label>{ar ? 'رقم الجوال' : 'Phone'}<input data-testid="input-phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+966" /></label><label>{ar ? 'المدينة' : 'City'}<input data-testid="input-city" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} /></label><button className="primary-btn save-btn" disabled={update.isPending || form.displayName.trim().length < 2} onClick={save} data-testid="button-save">{update.isPending ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : saved ? <><Check size={16}/> {ar ? 'تم الحفظ' : 'Saved'}</> : ar ? 'حفظ التغييرات' : 'Save changes'}</button></section><section className="security-card"><div className="security-icon"><ShieldCheck size={22}/></div><h2>{ar ? 'خصوصيتك وأمانك' : 'Privacy & security'}</h2><p>{security.data?.explanation || (ar ? 'حسابك وبياناتك محمية.' : 'Your account and data are protected.')}</p><div className="security-row"><LockKeyhole size={16}/><span>{ar ? 'بيانات الحساب خاصة' : 'Account data is private'}</span><b>{security.data?.accountDataIsPrivate ? (ar ? 'نعم' : 'Yes') : '—'}</b></div><div className="security-row"><ShieldCheck size={16}/><span>{ar ? 'الصلاحية يحددها الخادم' : 'Role assigned by server'}</span><b>{security.data?.roleAssignedByServer ? (ar ? 'مفعّل' : 'On') : '—'}</b></div><div className="security-note"><MapPin size={15}/>{ar ? 'يبدأ الحساب بلا دور يختاره المستخدم. الاعتماد الإداري وحده يمنح ملكية متجر.' : 'Accounts start without a self-selected role. Only admin approval grants shop ownership.'}</div></section></div>}</div></main>;
}
function AccountMenu({ name, ar }: { name: string; ar: boolean }) { const { signOut } = useClerk(); return <button className="account-menu" onClick={() => signOut({ redirectUrl: basePath || '/' })} data-testid="button-sign-out"><span className="account-avatar">{name.slice(0, 1)}</span><span>{ar ? 'تسجيل الخروج' : 'Sign out'}</span></button>; }
function LoadingScreen() { return <div className="loading-screen"><Brand/><div className="loading-line"/><p>جاري تجهيز وريف</p></div>; }
function AccountSkeleton() { return <div className="account-grid"><div className="skeleton-card"/><div className="skeleton-card"/></div>; }
function ErrorCard({ onRetry, ar }: { onRetry:()=>void; ar:boolean }) { return <div className="error-card"><CircleAlert size={24}/><h2>{ar?'تعذر تحميل بيانات الحساب':'Could not load your account'}</h2><p>{ar?'تحقق من اتصالك ثم حاول مرة أخرى.':'Check your connection and try again.'}</p><button className="primary-btn" onClick={onRetry} data-testid="button-retry">{ar?'إعادة المحاولة':'Try again'}</button></div>; }

function ClerkQueryClientCacheInvalidator() { const { addListener } = useClerk(); const qc = useQueryClient(); const previous = useRef<string | null | undefined>(undefined); useEffect(() => addListener(({ user }) => { const id = user?.id ?? null; if (previous.current !== undefined && previous.current !== id) qc.clear(); previous.current = id; }), [addListener, qc]); return null; }
function Home() {
  return <CustomerPage />;
}
function Router() { const [location] = useLocation(); return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Home}/><Route path="/sign-in/*?" component={AuthRedirect}/><Route path="/sign-up/*?" component={SignUpPage}/><Route path="/design"><CustomerPage initialView="design"/></Route><Route path="/book"><CustomerPage initialView="hub"/></Route><Route path="/services"><CustomerPage initialView="services"/></Route><Route path="/products"><CustomerPage initialView="products"/></Route><Route path="/review"><CustomerPage initialView="review"/></Route><Route path="/orders"><CustomerPage initialView="orders"/></Route><Route path="/account"><AccountPage/></Route><Route path="/provider"><ProviderCenter/></Route><Route path="/admin/providers"><AdminProviders/></Route><Route component={NotFound}/></Switch></ErrorBoundary>; }
export default function App() { return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ socialButtonsBlockButton: 'المتابعة باستخدام {{provider}}' }}><QueryClientProvider client={queryClient}><WouterRouter base={basePath}><ClerkQueryClientCacheInvalidator/><Router/></WouterRouter></QueryClientProvider></ClerkProvider>; }