import { useEffect, useRef, useState } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetCurrentUserQueryKey,
  getGetSecuritySummaryQueryKey,
  useGetCurrentUser,
  useGetSecuritySummary,
  useUpdateCurrentUser,
} from '@workspace/api-client-react';
import { Link } from 'wouter';
import {
  Bell, Check, ChevronLeft, CircleAlert, CircleHelp, ClipboardList, Flower2,
  Heart, Home, Leaf, LockKeyhole, MapPin, ReceiptText, Send, Settings, UserRound,
} from 'lucide-react';
import './account-page.css';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
type OrdersState = 'idle' | 'loading' | 'success' | 'error';

function Nav({ english, dir }: { english: boolean; dir: string }) {
  const t = english
    ? { home: 'Home', design: 'Design', orders: 'My Requests', account: 'Account', book: 'Book now' }
    : { home: 'الرئيسية', design: 'التصميم', orders: 'طلباتي', account: 'حسابي', book: 'احجز الآن' };
  return (
    <nav className="bottom customer-nav" dir={dir}>
      <Link href="/"><Home />{t.home}</Link>
      <Link href="/design"><Flower2 />{t.design}</Link>
      <Link href="/book" className="reserve-now"><Leaf /><span>{t.book}</span></Link>
      <Link href="/orders"><ClipboardList />{t.orders}</Link>
      <Link href="/account" className="active"><UserRound />{t.account}</Link>
    </nav>
  );
}

function Brand() {
  return <Link href="/" className="brand account-brand" data-testid="link-brand"><b>وريف</b><span>/</span><small>WAREEF</small></Link>;
}

export default function AccountPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const qc = useQueryClient();
  const supportInput = useRef<HTMLInputElement>(null);
  const [english, setEnglish] = useState(false);
  const [form, setForm] = useState({ displayName: '', phone: '', city: '', preferredLanguage: 'ar' as 'ar' | 'en' });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportNote, setSupportNote] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [ordersState, setOrdersState] = useState<OrdersState>('idle');
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [ordersReload, setOrdersReload] = useState(0);

  const profile = useGetCurrentUser({ query: { enabled: !!isSignedIn, queryKey: getGetCurrentUserQueryKey() } });
  const security = useGetSecuritySummary({ query: { enabled: !!isSignedIn, queryKey: getGetSecuritySummaryQueryKey() } });
  const update = useUpdateCurrentUser();
  const current = profile.data;

  useEffect(() => {
    if (!current) return;
    setForm({
      displayName: current.displayName || '',
      phone: current.phone ?? '',
      city: current.city ?? '',
      preferredLanguage: current.preferredLanguage,
    });
    setEnglish(current.preferredLanguage === 'en');
  }, [current]);

  useEffect(() => {
    if (!isSignedIn) {
      setOrdersState('idle');
      setOrderCount(null);
      return;
    }
    let active = true;
    const load = async () => {
      setOrdersState('loading');
      setOrderCount(null);
      try {
        const response = await fetch(`${basePath}/api/orders`, { credentials: 'include' });
        if (!response.ok) throw new Error('Could not load requests');
        const data = await response.json() as { orders?: unknown[] };
        if (!active) return;
        setOrderCount(Array.isArray(data.orders) ? data.orders.length : 0);
        setOrdersState('success');
      } catch {
        if (active) setOrdersState('error');
      }
    };
    void load();
    return () => { active = false; };
  }, [isSignedIn, ordersReload]);

  useEffect(() => {
    if (supportOpen) supportInput.current?.focus();
  }, [supportOpen]);

  if (!isLoaded) return <div className="loading-screen"><Brand /><div className="loading-line" /><p>جاري تجهيز وريف</p></div>;

  const ar = !english;
  const dir = ar ? 'rtl' : 'ltr';
  const role = current?.role ?? 'customer';
  const displayName = form.displayName || user?.firstName || (ar ? 'أهلاً بك' : 'Welcome');
  const languageChanged = !!current && form.preferredLanguage !== current.preferredLanguage;

  const save = () => {
    if (!isSignedIn) return;
    setSaveError('');
    setSaved(false);
    update.mutate(
      {
        data: {
          displayName: form.displayName,
          phone: form.phone || null,
          city: form.city.trim() || null,
          preferredLanguage: form.preferredLanguage,
        },
      },
      {
        onSuccess: next => {
          qc.setQueryData(getGetCurrentUserQueryKey(), next);
          setSaved(true);
          window.setTimeout(() => setSaved(false), 2400);
        },
        onError: error => setSaveError(error instanceof Error ? error.message : (ar ? 'تعذر حفظ التغييرات.' : 'Changes could not be saved.')),
      },
    );
  };

  const handleShare = async () => {
    setShareMessage('');
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${basePath || '/'}`);
      setShareMessage(ar ? 'تم نسخ الرابط.' : 'Link copied.');
    } catch {
      setShareMessage(ar ? 'تعذر نسخ الرابط. انسخه من شريط العنوان.' : 'Could not copy the link. Copy it from the address bar.');
    }
  };

  const toggleLanguage = () => {
    const next = !english;
    setEnglish(next);
    if (isSignedIn) setForm(value => ({ ...value, preferredLanguage: next ? 'en' : 'ar' }));
  };

  return (
    <div className="ghars wareef-customer account-surface" dir={dir}>
      <div className="shell">
        <main className="screen account-page">
          <header className="account-header">
            <button className="lang" onClick={toggleLanguage}>EN / ع</button>
            <Brand />
          </header>

          <div className="account-page-title"><h1>{ar ? 'حسابي' : 'Account'}</h1></div>

          <section className="welcome-card">
            <div className="account-avatar-large">{isSignedIn ? (displayName || 'و').slice(0, 1) : 'و'}</div>
            <div className="welcome-copy">
              <b>{isSignedIn ? (ar ? `أهلاً، ${displayName}` : `Welcome, ${displayName}`) : (ar ? 'أهلاً بك' : 'Welcome')}</b>
              <small>{isSignedIn ? (ar ? 'تفاصيل حسابك محفوظة لك' : 'Your account details are private to you') : (ar ? 'سجّل الدخول لحفظ حدائقك وطلباتك' : 'Sign in to save your gardens and requests')}</small>
            </div>
            {isSignedIn
              ? <button className="welcome-action" onClick={() => void clerk.signOut({ redirectUrl: basePath || '/' })}>{ar ? 'تسجيل الخروج' : 'Sign out'}</button>
              : <Link href="/sign-in" className="welcome-action">{ar ? 'تسجيل الدخول' : 'Sign in'}</Link>}
          </section>

          <section className="account-stats-row" aria-label={ar ? 'ملخص الحساب' : 'Account summary'}>
            <div className="stat-col"><b>—</b><small>{ar ? 'التذكيرات' : 'Reminders'}</small></div>
            <div className="stat-col"><b>—</b><small>{ar ? 'تصاميم محفوظة' : 'Saved designs'}</small></div>
            <div className="stat-col">
              <b>{isSignedIn && ordersState === 'success' ? orderCount : '—'}</b>
              <small>{ordersState === 'loading' ? (ar ? 'جارٍ تحميل الطلبات…' : 'Loading requests…') : (ar ? 'طلبات' : 'Requests')}</small>
              {isSignedIn && ordersState === 'error' && <button className="stat-retry" onClick={() => setOrdersReload(value => value + 1)}>{ar ? 'تعذر التحميل — أعد المحاولة' : 'Load failed — retry'}</button>}
            </div>
          </section>

          <section className="account-section">
            <p className="account-section-label">{ar ? 'الحساب' : 'ACCOUNT'}</p>
            <div className="account-nav-list">
              {isSignedIn ? (
                <button className="account-nav-item" onClick={() => setProfileOpen(value => !value)}>
                  <UserRound className="nav-icon" /><span className="nav-content"><b>{ar ? 'ملفي الشخصي' : 'Personal profile'}</b><small>{ar ? 'إدارة الاسم والجوال' : 'Manage your name and phone'}</small></span><ChevronLeft className="nav-arrow" />
                </button>
              ) : (
                <Link href="/sign-in" className="account-nav-item">
                  <UserRound className="nav-icon" /><span className="nav-content"><b>{ar ? 'ملفي الشخصي' : 'Personal profile'}</b><small>{ar ? 'سجّل الدخول لإكمال ملفك' : 'Sign in to complete your profile'}</small></span><ChevronLeft className="nav-arrow" />
                </Link>
              )}

              {profileOpen && isSignedIn && (
                profile.isLoading ? <div className="account-panel">{ar ? 'جارٍ تحميل الملف…' : 'Loading profile…'}</div>
                  : profile.isError ? <div className="account-panel inline-error" role="alert"><CircleAlert size={17} />{ar ? 'تعذر تحميل الملف.' : 'Profile could not be loaded.'}<button onClick={() => void profile.refetch()}>{ar ? 'إعادة المحاولة' : 'Retry'}</button></div>
                    : <div className="account-input-group">
                      <label>{ar ? 'الاسم الظاهر' : 'Display name'}<input value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} /></label>
                      <label>{ar ? 'رقم الجوال' : 'Phone'}<input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="+966" dir="ltr" /></label>
                      {saveError && <p className="form-error" role="alert">{saveError}</p>}
                      <button className="primary-btn save-btn" disabled={update.isPending || form.displayName.trim().length < 2} onClick={save}>
                        {update.isPending ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : saved ? <><Check size={16} />{ar ? 'تم الحفظ' : 'Saved'}</> : (ar ? 'حفظ التغييرات' : 'Save changes')}
                      </button>
                    </div>
              )}

              <button className="account-nav-item disabled" disabled>
                <Heart className="nav-icon" /><span className="nav-content"><b>{ar ? 'المفضلة' : 'Favorites'}</b><small>{ar ? 'غير متاحة حالياً' : 'Currently unavailable'}</small></span><ChevronLeft className="nav-arrow" />
              </button>
              <Link href="/orders" className="account-nav-item">
                <ReceiptText className="nav-icon" /><span className="nav-content"><b>{ar ? 'الفواتير والطلبات' : 'Invoices & requests'}</b><small>{ar ? 'عرض طلبات الخدمات الخاصة بك' : 'View your private service requests'}</small></span><ChevronLeft className="nav-arrow" />
              </Link>
              <button className="account-nav-item" onClick={() => void handleShare()}>
                <Send className="nav-icon" /><span className="nav-content"><b>{ar ? 'دعوة صديق' : 'Invite a friend'}</b><small>{shareMessage || (ar ? 'شارك رابط وريف' : 'Share the Wareef link')}</small></span><ChevronLeft className="nav-arrow" />
              </button>
              <button className="account-nav-item" onClick={() => setPrivacyOpen(value => !value)}>
                <LockKeyhole className="nav-icon" /><span className="nav-content"><b>{ar ? 'الخصوصية والأمان' : 'Privacy & security'}</b><small>{ar ? 'كيف يتعامل هذا العرض مع بياناتك' : 'How this view handles your data'}</small></span><ChevronLeft className="nav-arrow" />
              </button>
            </div>
            {privacyOpen && (
              <div className="account-panel privacy-panel">
                <b>{ar ? 'الخصوصية في هذه الصفحة' : 'Privacy on this page'}</b>
                {!isSignedIn ? <p>{ar ? 'لم تُحمّل بيانات حساب خاصة. سجّل الدخول لعرض ملخص أمان حسابك.' : 'No private account data is loaded. Sign in to view your account security summary.'}</p>
                  : security.isLoading ? <p>{ar ? 'جارٍ تحميل ملخص الأمان…' : 'Loading security summary…'}</p>
                    : security.isError ? <p className="inline-error">{ar ? 'تعذر تحميل ملخص الأمان.' : 'Security summary could not be loaded.'} <button onClick={() => void security.refetch()}>{ar ? 'إعادة المحاولة' : 'Retry'}</button></p>
                      : <><p>{security.data?.explanation}</p><div className="security-row"><LockKeyhole size={16} /><span>{ar ? 'بيانات الحساب خاصة' : 'Account data is private'}: <b>{security.data?.accountDataIsPrivate ? (ar ? 'نعم' : 'Yes') : '—'}</b></span></div></>}
              </div>
            )}
            <div className="account-role-links">
              <Link href="/provider">{role === 'provider_owner' ? (ar ? 'مساحة المتجر والطلبات' : 'Shop & requests') : (ar ? 'طلب الانضمام كمختص' : 'Apply as a specialist')}</Link>
              {role === 'admin' && <Link href="/admin/providers">{ar ? 'مراجعة طلبات المختصين' : 'Review specialist applications'}</Link>}
            </div>
          </section>

          <section className="account-section">
            <p className="account-section-label">{ar ? 'بياناتك' : 'YOUR DETAILS'}</p>
            <div className="account-input-group">
              <label><span><MapPin size={16} /> <b>{ar ? 'المدينة / الحي' : 'City / neighborhood'}</b></span>
                <input value={form.city} disabled={!isSignedIn || profile.isLoading || profile.isError} onChange={event => setForm({ ...form, city: event.target.value })} />
                <small>{!isSignedIn ? (ar ? 'سجّل الدخول لحفظ المدينة أو الحي.' : 'Sign in to save a city or neighborhood.') : (ar ? 'يمكنك مسح القيمة وحفظها لإزالتها.' : 'Clear this value and save to remove it.')}</small>
              </label>
              <label><span><MapPin size={16} /> <b>{ar ? 'العنوان الدقيق' : 'Exact address'}</b></span>
                <input disabled placeholder={ar ? 'اختياري — يُطلب عند التأكيد فقط' : 'Optional — requested only at confirmation'} />
                <small>{ar ? 'يتم جمع العنوان أثناء الحجز عند الحاجة؛ لا يُحفظ في هذا الملف.' : 'Captured during booking when needed; it is not stored in this profile.'}</small>
              </label>
              {saveError && <p className="form-error" role="alert">{saveError}</p>}
              {isSignedIn && <button className="primary-btn save-btn" disabled={profile.isLoading || profile.isError || update.isPending || form.city === (current?.city ?? '')} onClick={save}>
                {update.isPending ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'حفظ المدينة / الحي' : 'Save city / neighborhood')}
              </button>}
            </div>
          </section>

          <section className="account-section">
            <p className="account-section-label">{ar ? 'التفضيلات' : 'PREFERENCES'}</p>
            <div className="account-nav-list">
              <div className="account-nav-item">
                <button className="language-row" onClick={toggleLanguage}><span className="nav-content"><b>{ar ? 'اللغة' : 'Language'}</b><small>{ar ? 'العربية' : 'English'}</small></span></button>
                {isSignedIn && languageChanged && <button className="inline-save" disabled={update.isPending} onClick={save}>{update.isPending ? '…' : (ar ? 'حفظ' : 'Save')}</button>}
                <ChevronLeft className="nav-arrow" />
              </div>
              <div className="account-nav-item disabled" aria-disabled="true">
                <Bell className="nav-icon" /><span className="nav-content"><b>{ar ? 'تذكيرات الزيارات' : 'Visit reminders'}</b><small>{ar ? 'متوقفة — غير متاحة حالياً' : 'Off — currently unavailable'}</small></span>
                <input type="checkbox" className="account-switch" checked={false} disabled readOnly />
              </div>
              {isSignedIn ? (
                <button className="account-nav-item" onClick={() => clerk.openUserProfile()}>
                  <Settings className="nav-icon" /><span className="nav-content"><b>{ar ? 'الإعدادات' : 'Settings'}</b><small>{ar ? 'التحكم بحساب تسجيل الدخول' : 'Manage your sign-in account'}</small></span><ChevronLeft className="nav-arrow" />
                </button>
              ) : (
                <Link href="/sign-in" className="account-nav-item"><Settings className="nav-icon" /><span className="nav-content"><b>{ar ? 'الإعدادات' : 'Settings'}</b><small>{ar ? 'سجّل الدخول لإدارة الحساب' : 'Sign in to manage your account'}</small></span><ChevronLeft className="nav-arrow" /></Link>
              )}
            </div>
          </section>

          <section className="account-section">
            <p className="account-section-label">{ar ? 'أخرى' : 'OTHER'}</p>
            <div className="account-nav-list">
              <button className="account-nav-item" onClick={() => setSupportOpen(true)}>
                <CircleHelp className="nav-icon" /><span className="nav-content"><b>{ar ? 'المساعدة والدعم' : 'Help & support'}</b><small>{ar ? 'اكتب ملاحظة محلية أدناه' : 'Write a local note below'}</small></span><ChevronLeft className="nav-arrow" />
              </button>
              <button className="account-nav-item" onClick={() => setPrivacyOpen(true)}>
                <LockKeyhole className="nav-icon" /><span className="nav-content"><b>{ar ? 'بيان الخصوصية' : 'Privacy information'}</b><small>{ar ? 'عرض المعلومات المتاحة في هذه الصفحة' : 'View the information available on this page'}</small></span><ChevronLeft className="nav-arrow" />
              </button>
            </div>
          </section>

          <div className="support-note-box">
            <b>{ar ? 'هل تحتاج مساعدة؟' : 'Need help?'}</b>
            <p>{ar ? 'اكتب ما تحتاجه هنا. تبقى الملاحظة في هذه الصفحة فقط ولا تُحفظ بعد إعادة التحميل.' : 'Write what you need here. The note stays on this page only and is not saved across reloads.'}</p>
            <input ref={supportInput} value={supportNote} onFocus={() => setSupportOpen(true)} onChange={event => setSupportNote(event.target.value)} placeholder={ar ? 'اكتب ملاحظة للدعم' : 'Write a support note'} />
            <small>{ar ? 'لا يتم إرسال هذه الملاحظة.' : 'This note is not sent.'}</small>
          </div>
        </main>
        <Nav english={english} dir={dir} />
      </div>
    </div>
  );
}