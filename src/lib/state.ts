import { writable } from "svelte/store";

const LOCAL_STORAGE_ITEM_NAME = "app:pdf-tool";
const isClientSide = typeof window !== "undefined";
type ItemKeys = "authState" | "extraction";

let shadowObj: {
  "authState": AuthState,
  "extraction": Extraction,
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

type Extraction = {
  stage: "none" | "uploaded" | "processed",
  totalPages?: number,
  filename?: string,
  addedSelections?: [string, string][], // e.g. [["FileA", "1,2,3"], ["FileB", "6,10"]]
};
export const extraction = writable<Extraction>(shadowObj.extraction || { stage: "none" });
extraction.subscribe(v => updateLocalStorage("extraction", v));
