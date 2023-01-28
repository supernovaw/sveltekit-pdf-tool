import { writable } from "svelte/store";

const LOCAL_STORAGE_ITEM_NAME = "app:pdf-tool";
const isClientSide = typeof window !== "undefined";
type ItemKeys = "authState";

let shadowObj: {
  "authState": AuthState,
} = JSON.parse(isClientSide && localStorage.getItem(LOCAL_STORAGE_ITEM_NAME) || "{}");

// Persist stores by subscribing to this function
function updateLocalStorage(key: ItemKeys, obj: any) {
  if (!isClientSide) return;
  shadowObj[key] = obj;
  localStorage.setItem(LOCAL_STORAGE_ITEM_NAME, JSON.stringify(shadowObj));
}


type AuthState = { key: string | null, valid: boolean };
export const authState = writable<AuthState>(shadowObj.authState || { key: null, valid: false });
authState.subscribe(v => updateLocalStorage("authState", v));
