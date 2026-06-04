import { createContext, useContext, useReducer, useEffect } from "react";
import { SHEETS_URL } from "./config.js";

export const StoreCtx = createContext(null);
const initial = { transcripts: [], user: null };

export function storeReducer(state, action) {
  switch (action.type) {
    case "SET_USER": return { ...state, user: action.payload };
    case "ADD_TRANSCRIPT": return { ...state, transcripts: [action.payload, ...state.transcripts] };
    case "UPDATE_STATUS": return { ...state, transcripts: state.transcripts.map(t => t.id === action.id ? { ...t, status: action.status, reviewNote: action.note, reviewedBy: action.by, reviewedAt: action.at } : t) };
    case "LOAD_TRANSCRIPTS": return { ...state, transcripts: action.payload };
    default: return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(storeReducer, initial);
  useEffect(() => { try { const s = localStorage.getItem("vt_transcripts"); if (s) dispatch({ type:"LOAD_TRANSCRIPTS", payload: JSON.parse(s) }); } catch {} }, []);
  useEffect(() => { if (state.transcripts.length) localStorage.setItem("vt_transcripts", JSON.stringify(state.transcripts)); }, [state.transcripts]);
  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);

export async function saveToSheets(entry) {
  if (!SHEETS_URL || SHEETS_URL.includes("REPLACE")) return { success: false, local: true };
  try {
    const r = await fetch(SHEETS_URL, { method:"POST", headers:{"Content-Type":"text/plain"}, body: JSON.stringify(entry) });
    return await r.json();
  } catch { return { success: false, local: true }; }
}

export async function fetchFromSheets(officer, role) {
  if (!SHEETS_URL || SHEETS_URL.includes("REPLACE")) return null;
  try {
    const url = role === "Supervisor" ? SHEETS_URL : `${SHEETS_URL}?officer=${encodeURIComponent(officer)}`;
    const r = await fetch(url);
    const j = await r.json();
    return j.success ? j.data : null;
  } catch { return null; }
}

export async function updateSheetStatus(id, status, note, by) {
  if (!SHEETS_URL || SHEETS_URL.includes("REPLACE")) return;
  try { await fetch(SHEETS_URL, { method:"POST", headers:{"Content-Type":"text/plain"}, body: JSON.stringify({ _action:"updateStatus", id, status, reviewNote: note, reviewedBy: by }) }); } catch {}
}
