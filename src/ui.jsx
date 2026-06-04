export const C = {
  blue:   { bg:"#dbeafe", text:"#1e40af", border:"#93c5fd" },
  green:  { bg:"#d1fae5", text:"#065f46", border:"#6ee7b7" },
  amber:  { bg:"#fef3c7", text:"#92400e", border:"#fcd34d" },
  red:    { bg:"#fee2e2", text:"#991b1b", border:"#fca5a5" },
  gray:   { bg:"#f3f4f6", text:"#374151", border:"#d1d5db" },
  purple: { bg:"#ede9fe", text:"#5b21b6", border:"#c4b5fd" },
};
export const statusColor = s => ({ Pending:C.amber, Approved:C.green, Rejected:C.red, Saved:C.blue }[s]||C.gray);
export const card  = (e={}) => ({ background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:"1rem 1.25rem", ...e });
export const btn   = (v="default",e={}) => ({ padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", border:"1px solid", borderColor:v==="primary"?"#2563eb":v==="green"?"#059669":v==="red"?"#dc2626":v==="ghost"?"transparent":"#d1d5db", background:v==="primary"?"#2563eb":v==="green"?"#059669":v==="red"?"#dc2626":v==="ghost"?"transparent":"#f9fafb", color:["primary","green","red"].includes(v)?"#fff":"#374151", ...e });
export const inp   = (e={}) => ({ padding:"8px 10px", borderRadius:8, border:"1px solid #d1d5db", fontSize:13, width:"100%", boxSizing:"border-box", background:"#f9fafb", color:"#111", fontFamily:"inherit", ...e });

export function Tag({ color, label }) {
  return <span style={{ background:color.bg, color:color.text, border:`1px solid ${color.border}`, fontSize:11, fontWeight:600, padding:"2px 9px", borderRadius:20, whiteSpace:"nowrap" }}>{label}</span>;
}
export function Avatar({ name, size=36 }) {
  const ini = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return <div style={{ width:size, height:size, borderRadius:"50%", background:"#dbeafe", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:700, color:"#1e40af", flexShrink:0 }}>{ini}</div>;
}
export function Divider({ label }) {
  return <div style={{ display:"flex", alignItems:"center", gap:8, margin:"1rem 0" }}><div style={{ flex:1, height:1, background:"#e5e7eb" }}/>{label&&<span style={{ fontSize:11, color:"#9ca3af", fontWeight:500 }}>{label}</span>}<div style={{ flex:1, height:1, background:"#e5e7eb" }}/></div>;
}
export function NavTabs({ tabs, active, onChange }) {
  return <div style={{ display:"flex", gap:4, marginBottom:"1.25rem", background:"#f3f4f6", padding:4, borderRadius:10 }}>{tabs.map(t=><button key={t.key} onClick={()=>onChange(t.key)} style={{ flex:1, padding:"7px 6px", borderRadius:7, border:"none", cursor:"pointer", fontSize:12, fontWeight:500, background:active===t.key?"#fff":"transparent", color:active===t.key?"#1e40af":"#6b7280", boxShadow:active===t.key?"0 1px 3px rgba(0,0,0,0.08)":"none", transition:"all 0.15s", whiteSpace:"nowrap" }}>{t.icon} {t.label}</button>)}</div>;
}
export function StatCard({ label, value, bg, color }) {
  return <div style={{ background:bg, borderRadius:8, padding:"10px 12px", textAlign:"center" }}><div style={{ fontSize:20, fontWeight:700, color }}>{value}</div><div style={{ fontSize:11, color, opacity:0.8 }}>{label}</div></div>;
}
export function EmptyState({ message }) {
  return <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:"2rem", textAlign:"center", color:"#9ca3af", fontSize:14 }}>{message}</div>;
}
export function Alert({ color, children }) {
  return <div style={{ background:color.bg, border:`1px solid ${color.border}`, borderRadius:8, padding:"10px 14px", fontSize:13, color:color.text, marginBottom:12 }}>{children}</div>;
}