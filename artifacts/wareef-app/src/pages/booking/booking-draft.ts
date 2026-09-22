import type { ServiceId } from "@/data/services";
import type { ServiceProvider } from "@workspace/api-client-react";
export type { ServiceProvider };

export type BookingPhase = "providers" | "services" | "details" | "summary";
export type ProviderSort = "fastest" | "rated" | "cheapest";
export type MaintenanceTask = "cleaning" | "weeding" | "mowing" | "shrubs" | "trees" | "stumps";

export interface MaintenanceDetails {
  tasks: MaintenanceTask[];
  area: string;
  shrubs: string;
  trees: string;
  stumps: string;
  treeDetails: string;
  note: string;
  photoIds: string[];
}

export interface BookingDraft {
  phase: BookingPhase;
  entryServiceId: ServiceId;
  provider?: ServiceProvider;
  selectedServiceIds: ServiceId[];
  gardenName: string;
  location: string;
  needs: string;
  preferredTime: string;
  maintenance: MaintenanceDetails;
  language: "ar" | "en";
}

export const BOOKING_DRAFT_KEY = "wareef_service_booking_v2";
const PHOTO_DB = "wareef-private-drafts";
const PHOTO_STORE = "booking-photos";

export const emptyMaintenance = (): MaintenanceDetails => ({
  tasks: [], area: "", shrubs: "", trees: "", stumps: "", treeDetails: "", note: "", photoIds: [],
});

export function readBookingDraft(): BookingDraft | null {
  try {
    const raw = localStorage.getItem(BOOKING_DRAFT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as BookingDraft;
    return value.entryServiceId && Array.isArray(value.selectedServiceIds) ? value : null;
  } catch {
    return null;
  }
}

export function saveBookingDraft(value: BookingDraft) {
  localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(value));
}

export function clearBookingDraft() {
  localStorage.removeItem(BOOKING_DRAFT_KEY);
}

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PHOTO_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(PHOTO_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putDraftPhoto(file: File): Promise<string> {
  const id = crypto.randomUUID();
  const db = await openPhotoDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(PHOTO_STORE, "readwrite").objectStore(PHOTO_STORE).put(file, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
  return id;
}

export async function getDraftPhoto(id: string): Promise<File | null> {
  const db = await openPhotoDb();
  const file = await new Promise<File | null>((resolve, reject) => {
    const request = db.transaction(PHOTO_STORE).objectStore(PHOTO_STORE).get(id);
    request.onsuccess = () => resolve(request.result instanceof File ? request.result : null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return file;
}

export async function deleteDraftPhoto(id: string) {
  const db = await openPhotoDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(PHOTO_STORE, "readwrite").objectStore(PHOTO_STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
}

export async function clearDraftPhotos(ids: string[]) {
  await Promise.all(ids.map(deleteDraftPhoto));
}