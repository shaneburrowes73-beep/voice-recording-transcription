import { useState } from "react";
import { useStore, updateSheetStatus } from "./store.jsx";
import { card, btn, inp, C, Tag, Divider, Avatar, EmptyState, Alert, statusColor } from "./ui.jsx";

const nowStr = () => new Date().toLocaleString("en-GB");

export default function ApprovalFlow({ user }) {
  const { state, dispatch } = useStore();
  const [selected, setSelected] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [filter, setFilter] = useState("Pending");
  const [deciding, setDeciding] = useState(false);
  const isSupervisor = user.role === "Supervisor";
  const pool = state.transcripts.filter(t => isSupervisor ? true : t.officer === user.officer);
  const queue = pool.filter(t => filter === "All" ? true : t.status === filter);
  const counts = k => k==="All" ? pool.length : pool.filter(t=>t.status===k).length;

  const decide = async (id, status) => {
    setDeciding(true);
    const by=user.officer, at=nowStr(), note=reviewNote;
    dispatch({ type:"UPDATE_STATUS", id, status, note, by, at });
    await updateSheetStatus(id, status, note, by);
    setSelected(null); setReviewNote(""); setDeciding(false);
  };

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem" }}>
        <h2 style={{ margin:0,fontSize:16,fontWeight:600 }}>✅ Approval Flow</h2>
        <Tag color={C.purple} label="Module 2"/>
      </div>
      {!isSupervisor&&<Alert color={C.blue}>Your submissions are listed below. Supervisors review and approve all transcripts.</Alert>}
      {isSupervisor&&pool.filter(t=>t.status==="Pending").length>0&&<Alert color={C.amber}>{pool.filter(t=>t.status==="Pending").length} transcript(s) awaiting review.</Alert>}
      <div style={{ display:"flex",gap:6,margin:"12px 0",flexWrap:"wrap" }}>
        {["Pending","Approved","Rejected","All"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ ...btn(filter===f?"primary":"default"),padding:"5px 12px",fontSize:12 }}>
            {f}<span style={{ marginLeft:5,borderRadius:10,fontSize:10,padding:"1px 6px",background:filter===f?"rgba(255,255,255,0.25)":"#e5e7eb",color:filter===f?"#fff":"#6b7280" }}>{counts(f)}</span>
          </button>
        ))}
      </div>
      {queue.length===0&&<EmptyState message={filter==="Pending"&&isSupervisor?"No transcripts awaiting review.":"No "+( filter==="All"?"":filter.toLowerCase())+" transcripts."}/>}
      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
        {queue.map(t=>{
          const sc=statusColor(t.status); const isOpen=selected?.id===t.id;
          return (
            <div key={t.id} style={{ ...card({ cursor:"pointer",borderLeft:`3px solid ${sc.border}` }) }} onClick={()=>{setSelected(isOpen?null:t);setReviewNote("");}}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}><Avatar name={t.officer} size={32}/><div><div style={{ fontSize:13,fontWeight:600 }}>{t.officer}</div><div style={{ fontSize:11,color:"#6b7280" }}>{t.role} · {t.timestamp}</div></div></div>
                <Tag color={sc} label={t.status}/>
              </div>
              <p style={{ margin:0,fontSize:13,color:"#6b7280",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis" }}>{(t.corrected||t.raw||"").slice(0,130)}…</p>
              {isOpen&&(
                <div onClick={e=>e.stopPropagation()} style={{ marginTop:12 }}>
                  <Divider/>
                  <div style={{ ...card({ background:"#f9fafb",marginBottom:10 }) }}>
                    <div style={{ fontSize:12,color:"#6b7280",marginBottom:4 }}>Transcript</div>
                    <p style={{ margin:0,fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap" }}>{t.corrected||t.raw}</p>
                    {t.notes&&<p style={{ margin:"8px 0 0",fontSize:12,color:"#6b7280" }}>Notes: {t.notes}</p>}
                  </div>
                  {t.reviewNote&&<div style={{ ...card({ background:C.amber.bg,border:`1px solid ${C.amber.border}`,marginBottom:10 }) }}><div style={{ fontSize:11,color:C.amber.text }}>Review — {t.reviewedBy} · {t.reviewedAt}</div><p style={{ margin:"4px 0 0",fontSize:13 }}>{t.reviewNote}</p></div>}
                  {isSupervisor&&t.status==="Pending"&&(
                    <><textarea value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Add a review note (optional)…" style={{ ...inp(),minHeight:52,resize:"vertical",marginBottom:8 }}/>
                    <div style={{ display:"flex",gap:8 }}><button onClick={()=>decide(t.id,"Rejected")} disabled={deciding} style={{ ...btn("red"),flex:1 }}>✗ Reject</button><button onClick={()=>decide(t.id,"Approved")} disabled={deciding} style={{ ...btn("green"),flex:1 }}>✓ Approve</button></div></>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
