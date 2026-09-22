import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

export function GardenPhotos({ english }: { english: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);
  const [photos, setPhotos] = useState<{ name: string; url: string }[]>([]);
  const [error, setError] = useState("");
  const [showLimits, setShowLimits] = useState(false);
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);
  function select(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    if (selected.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setError(english ? "Choose JPG, PNG or WebP images under 10 MB each." : "اختر صور JPG أو PNG أو WebP بحجم أقل من ١٠ ميجابايت للصورة.");
      return;
    }
    if (photos.length + selected.length > 5) {
      setError(english ? "You can add up to 5 photos. Remove one to add another." : "يمكنك إضافة ٥ صور كحد أقصى. احذف صورة لإضافة غيرها.");
      return;
    }
    const added = selected.map(file => ({ name: file.name, url: URL.createObjectURL(file) }));
    urls.current.push(...added.map(photo => photo.url));
    setPhotos(previous => [...previous, ...added]);
    setError("");
  }
  function remove(url: string) {
    URL.revokeObjectURL(url);
    urls.current = urls.current.filter(item => item !== url);
    setPhotos(previous => previous.filter(photo => photo.url !== url));
    setError("");
  }
  return <section className="garden-introduction" aria-label={english ? "Introduce us to your garden" : "عرّفنا على حديقتك"}>
    <h2>{english ? "Introduce us to your garden" : "عرّفنا على حديقتك"}</h2>
    <p>{english ? "Show us your garden so we can understand the care it needs." : "شاركنا صور حديقتك لنتعرّف على احتياجك للعناية."}</p>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={event => { select(event.target.files); event.target.value = ""; }} />
    <button type="button" className="garden-photo-add" onClick={() => { setShowLimits(true); input.current?.click(); }} disabled={photos.length >= 5}>
      <span className="garden-camera"><Camera size={16}/><span aria-hidden="true">+</span></span>{english ? "Add garden photos" : "أضف صور حديقتك"}
    </button>
    {showLimits && <small role="status">{english ? "Up to 5 photos · 10 MB each · Preview only, not uploaded" : "حتى ٥ صور · ١٠ ميجابايت للصورة · معاينة فقط، لا تُرفع إلى خادم"}</small>}
    {error && <p role="alert" className="garden-photo-error">{error}</p>}
    <div className="garden-photo-previews">
      {photos.map((photo, index) => <div key={photo.url}>
        <img src={photo.url} alt={english ? `Your garden photo ${index + 1}` : `صورة حديقتك ${index + 1}`} />
        <button type="button" onClick={() => remove(photo.url)} aria-label={english ? `Remove ${photo.name}` : `حذف ${photo.name}`}><X size={16}/></button>
      </div>)}
    </div>
    <span className="sr-only" role="status">{photos.length ? (english ? `${photos.length} photos selected` : `تم اختيار ${photos.length} صور`) : ""}</span>
  </section>;
}