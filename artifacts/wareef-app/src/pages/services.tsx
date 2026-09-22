import { useEffect, useState, useMemo } from 'react';
import { useUser, useClerk } from '@clerk/react';
import { Link, useLocation } from 'wouter';
import { Leaf, Scissors, Sprout, Shovel, PartyPopper, Wrench, Search, Check, ChevronDown, ChevronUp, UserRound, ArrowRight, ArrowLeft, ShieldCheck, X, CircleAlert } from 'lucide-react';
import { services, getServiceIntent, saveServiceIntent, ServiceId } from '@/data/services';

const ICONS: Record<string, React.ElementType> = {
  Leaf, Scissors, Sprout, Shovel, PartyPopper, Wrench
};

function ServiceCard({ service, isSelected, toggleSelection, english, t }: any) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ICONS[service.iconName] || Leaf;

  return (
    <article className={`service-card ${isSelected ? 'selected' : ''} reveal`} data-testid={`service-card-${service.id}`}>
      <button 
        className="service-card-select-btn"
        onClick={() => toggleSelection(service.id)}
        aria-pressed={isSelected}
        aria-label={`${english ? service.titleEn : service.titleAr}, ${isSelected ? t.selected : t.unselected}`}
      >
        <div className="service-card-head">
          <div className="service-icon"><Icon size={24}/></div>
          <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
            {isSelected && <Check size={14}/>}
          </div>
        </div>
        <h3>{english ? service.titleEn : service.titleAr}</h3>
        <p className="service-card-desc">{english ? service.descEn : service.descAr}</p>
      </button>
      
      <div className="service-card-foot">
        <div className="service-card-meta">
          <span className="price-tag">{t.tbd}</span>
          <span className="category-tag">
            {service.category === 'standard' ? t.standard : t.assessment}
          </span>
        </div>
        <button 
          className="details-btn" 
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }} 
          aria-expanded={expanded}
        >
          {t.details} {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </button>
      </div>
      {expanded && (
        <div className="service-card-details">
          <p>{english ? service.detailsEn : service.detailsAr}</p>
        </div>
      )}
    </article>
  );
}

export default function ServicesPage() {
  const { isSignedIn, user } = useUser();
  const [, setLocation] = useLocation();
  const [english, setEnglish] = useState(false);
  
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'standard' | 'assessment'>('all');
  const [sort, setSort] = useState<'default' | 'az' | 'za'>('default');
  
  // Initialize lazily
  const [selected, setSelected] = useState<ServiceId[]>(() => getServiceIntent());
  const [storageError, setStorageError] = useState(false);

  // Save intent when changed, tracking success
  useEffect(() => {
    const success = saveServiceIntent(selected);
    if (!success && selected.length > 0) {
      setStorageError(true);
    } else {
      setStorageError(false);
    }
  }, [selected]);

  const toggleSelection = (id: ServiceId) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredServices = useMemo(() => {
    let result = services;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => 
        s.titleAr.includes(q) || s.titleEn.toLowerCase().includes(q) ||
        s.descAr.includes(q) || s.descEn.toLowerCase().includes(q)
      );
    }
    if (category !== 'all') {
      result = result.filter(s => s.category === category);
    }
    if (sort === 'az') {
      result = [...result].sort((a, b) => english ? a.titleEn.localeCompare(b.titleEn) : a.titleAr.localeCompare(b.titleAr));
    } else if (sort === 'za') {
      result = [...result].sort((a, b) => english ? b.titleEn.localeCompare(a.titleEn) : b.titleAr.localeCompare(a.titleAr));
    }
    return result;
  }, [search, category, sort, english]);

  const t = english ? {
    services: 'Services',
    search: 'Search services...',
    all: 'All services',
    standard: 'Standard care',
    assessment: 'Requires assessment',
    sortDefault: 'Default order',
    sortAZ: 'A to Z',
    sortZA: 'Z to A',
    account: 'Account',
    signIn: 'Sign in',
    selected: 'selected',
    unselected: 'unselected',
    tbd: 'To be determined later',
    summary: 'Selection summary',
    clear: 'Clear',
    bookingNote: 'Selection kept only in this browser tab; sign-in optional and does not sync selections or create booking.',
    continueSignIn: 'Sign in to continue',
    startCare: 'Start your care journey with Wareef.',
    empty: 'No services match your search.',
    accountSaved: 'Selection kept only in this browser tab. Provider matching is coming soon.',
    details: 'More details',
    storageUnavailable: 'Browser storage unavailable; selection cannot be saved.'
  } : {
    services: 'الخدمات',
    search: 'البحث عن خدمات...',
    all: 'جميع الخدمات',
    standard: 'عناية قياسية',
    assessment: 'تتطلب معاينة',
    sortDefault: 'الترتيب الافتراضي',
    sortAZ: 'أ إلى ي',
    sortZA: 'ي إلى أ',
    account: 'حسابي',
    signIn: 'تسجيل الدخول',
    selected: 'محددة',
    unselected: 'غير محددة',
    tbd: 'تُحدّد لاحقاً',
    summary: 'ملخص الاختيار',
    clear: 'مسح',
    bookingNote: 'اختيارك محفوظ في علامة التبويب هذه فقط؛ تسجيل الدخول اختياري ولا يزامن الاختيارات أو ينشئ حجزاً.',
    continueSignIn: 'تسجيل الدخول للمتابعة',
    startCare: 'ابدأ رحلة العناية مع وريف.',
    empty: 'لا توجد خدمات مطابقة لبحثك.',
    accountSaved: 'اختيارك محفوظ في علامة التبويب هذه فقط. ربط المختصين قادم قريباً.',
    details: 'تفاصيل أكثر',
    storageUnavailable: 'وحدة التخزين غير متاحة في المتصفح؛ لا يمكن حفظ الاختيار.'
  };

  const ar = !english;
  
  return (
    <main className="services-page noise" dir={ar ? 'rtl' : 'ltr'}>
      <header className="services-header">
        <Link href="/" className="brand" data-testid="link-brand">
          <span className="brand-mark"><Leaf size={18} /></span>
          <b>وريف</b>
          <small>WAREEF</small>
        </Link>
        <div className="services-actions">
          <button className="language" onClick={() => setEnglish(!english)}>
            {english ? 'عربي' : 'EN'} <ChevronDown size={14} />
          </button>
          {isSignedIn ? (
            <Link href="/account" className="account-menu">
              <span className="account-avatar">{(user?.firstName || 'و').slice(0, 1)}</span>
              <span>{t.account}</span>
            </Link>
          ) : (
            <Link href="/sign-in" className="primary-btn outline-btn" style={{ padding: '8px 14px' }}>
              <UserRound size={15}/> {t.signIn}
            </Link>
          )}
        </div>
      </header>

      <div className="services-content">
        <div className="services-sidebar">
          <h1>{t.services}</h1>
          <p className="services-sub">{t.startCare}</p>
          
          <div className="services-filters">
            <div className="search-box">
              <Search size={16} aria-hidden="true" />
              <input 
                type="search" 
                placeholder={t.search} 
                aria-label={t.search}
                value={search} 
                onChange={e => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
            
            <select aria-label={t.all} value={category} onChange={e => setCategory(e.target.value as any)} data-testid="select-category">
              <option value="all">{t.all}</option>
              <option value="standard">{t.standard}</option>
              <option value="assessment">{t.assessment}</option>
            </select>
            
            <select aria-label={t.sortDefault} value={sort} onChange={e => setSort(e.target.value as any)} data-testid="select-sort">
              <option value="default">{t.sortDefault}</option>
              <option value="az">{t.sortAZ}</option>
              <option value="za">{t.sortZA}</option>
            </select>
          </div>

          {selected.length > 0 && (
            <div className="services-summary reveal">
              <div className="summary-head">
                <h2>{t.summary}</h2>
                <span className="summary-count">{selected.length} {t.selected}</span>
              </div>
              <ul className="summary-list">
                {selected.map(id => {
                  const s = services.find(x => x.id === id)!;
                  return (
                    <li key={id}>
                      <span>{english ? s.titleEn : s.titleAr}</span>
                      <button onClick={() => toggleSelection(id)} aria-label="Remove"><X size={14}/></button>
                    </li>
                  );
                })}
              </ul>
              
              {storageError ? (
                <div className="summary-notice error">
                  <CircleAlert size={16}/>
                  <p>{t.storageUnavailable}</p>
                </div>
              ) : (
                <div className="summary-notice">
                  <ShieldCheck size={16}/>
                  <p>{t.bookingNote}</p>
                </div>
              )}

              {!isSignedIn ? (
                <Link href="/sign-up" className="primary-btn w-full">
                  {t.continueSignIn} {english ? <ArrowRight size={16}/> : <ArrowLeft size={16}/>}
                </Link>
              ) : (
                <div className="signed-in-notice">
                  <Check size={14}/> {t.accountSaved}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="services-grid">
          {filteredServices.length === 0 ? (
            <div className="empty-state">
              <Search size={32}/>
              <p>{t.empty}</p>
              <button className="text-link" onClick={() => { setSearch(''); setCategory('all'); }}>{t.clear}</button>
            </div>
          ) : (
            filteredServices.map(service => (
              <ServiceCard 
                key={service.id} 
                service={service} 
                isSelected={selected.includes(service.id)}
                toggleSelection={toggleSelection}
                english={english}
                t={t}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}