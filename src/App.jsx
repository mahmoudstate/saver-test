import { useState, useEffect, useCallback, useRef } from "react";

// ─── Palette & Helpers ────────────────────────────────────────────────────────
const C = {
  bg: "#0f0f13", surface: "#17171f", card: "#1e1e28", border: "#2a2a38",
  accent: "#6ee7b7", accentDim: "#1a3d30",
  red: "#f87171", redDim: "#3d1a1a",
  blue: "#60a5fa", blueDim: "#1a2d3d",
  yellow: "#fbbf24", yellowDim: "#3d2e0a",
  purple: "#a78bfa", purpleDim: "#2a1a3d",
  text: "#e8e8f0", muted: "#8888a8", faint: "#444460",
};

const CURRENCIES = [
  { code: "EGP", name: "Egyptian Pound" }, { code: "GBP", name: "British Pound" },
  { code: "USD", name: "US Dollar" }, { code: "EUR", name: "Euro" },
  { code: "SAR", name: "Saudi Riyal" }, { code: "AED", name: "UAE Dirham" },
];

let _currency = "EGP";
const setCurrency = (c) => { _currency = c; };
// Fixed decimal rounding: up to 2 decimal places to keep fractions exact
const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: _currency, maximumFractionDigits: 2 }).format(n || 0);
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const fmtDate = (d) => { const dt = new Date(d + "T00:00:00"); return `${DAYS[dt.getDay()]}, ${dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`; };
const today = () => new Date().toISOString().split("T")[0];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const ICONS = {
  dashboard:"◈", add:"＋", settings:"⚙", saving:"◎", bills_nav:"☷", budget:"📊",
  income:"↑", expense:"↓", transfer:"→",
  food:"🍽", coffee:"☕", transport:"🚗", bills:"⚡",
  personal:"👤", health:"💊", entertainment:"🎬", shopping:"🛍",
  rent:"🏠", education:"📚", tech:"💻", others:"📌",
  salary:"💼", freelance:"💡", gift:"🎁", investment:"📈", other_income:"💰",
  bank:"🏦", cash:"💵", goal:"🎯", trash:"🗑", edit:"✎", close:"✕", check:"✓",
};

const DEFAULT_BANKS = [{ id:"b1", name:"CIB", color:C.blue }, { id:"b2", name:"NBE", color:C.accent }, { id:"b3", name:"Cash", color:C.yellow }];
const DEFAULT_EXP_CATS = [
  { id:"food", name:"Food", icon:"food", group:"daily" }, { id:"coffee", name:"Coffee", icon:"coffee", group:"daily" },
  { id:"transport", name:"Transport", icon:"transport", group:"daily" }, { id:"bills", name:"Bills", icon:"bills", group:"fixed" },
  { id:"shopping", name:"Shopping", icon:"shopping", group:"lifestyle" }, { id:"entertainment", name:"Fun", icon:"entertainment", group:"lifestyle" },
];
const DEFAULT_INC_CATS = [{ id:"salary", name:"Salary", icon:"salary" }, { id:"freelance", name:"Freelance", icon:"freelance" }];
const DEFAULT_GROUPS = [
  { id:"daily", name:"Daily Life", color:C.accent, cats:["food","coffee","transport"] },
  { id:"fixed", name:"Fixed Costs", color:C.red, cats:["bills"] },
  { id:"lifestyle", name:"Lifestyle", color:C.purple, cats:["shopping","entertainment"] }
];

// ─── Storage ──────────────────────────────────────────────────────────────────
const KEYS = { txns:"et_txns", banks:"et_banks", expCats:"et_expCats", incCats:"et_incCats", groups:"et_groups", savings:"et_savings", currency:"et_currency", username:"et_username", lastBackup:"et_lastBackup", bills:"et_bills", budgets:"et_budgets" };
async function load(key, fallback) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; } }
async function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

// ─── Shared UI Components ──────────────────────────────────────────────────────
function Pill({ color, children, style }) { return <span style={{ background:color+"22", color, border:`1px solid ${color}44`, borderRadius:99, padding:"2px 10px", fontSize:11, fontWeight:700, letterSpacing:0.5, ...style }}>{children}</span>; }
function Card({ children, style }) { return <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:16, ...style }}>{children}</div>; }

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:520, maxHeight:"85vh", overflow:"auto", padding:24, animation:"slideUp 0.3s ease-out" }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:17 }}>{title}</span>
          <button onClick={onClose} style={{ background:C.border, border:"none", color:C.muted, width:30, height:30, borderRadius:99, cursor:"pointer", fontSize:14 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onClose, confirmColor }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ color:C.muted, marginBottom:20, lineHeight:1.6 }}>{message}</p>
      <div style={{ display:"flex", gap:10 }}>
        <Btn outline color={C.muted} full onClick={onClose}>Cancel</Btn>
        <Btn color={confirmColor||C.red} full onClick={onConfirm}>Confirm</Btn>
      </div>
    </Modal>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <div style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:6, textTransform:"uppercase" }}>{label}</div>}
      <input {...props} style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", color:C.text, fontSize:15, outline:"none", boxSizing:"border-box", ...props.style }} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <div style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:6, textTransform:"uppercase" }}>{label}</div>}
      <select {...props} style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", color:C.text, fontSize:15, outline:"none", boxSizing:"border-box", ...props.style }}>{children}</select>
    </div>
  );
}

function Btn({ children, color=C.accent, outline, full, small, ...props }) {
  return (
    <button {...props} style={{ background:outline?"transparent":color, border:`1.5px solid ${color}`, color:outline?color:C.bg, borderRadius:10, padding:small?"7px 14px":"11px 20px", fontWeight:700, fontSize:small?13:15, cursor:"pointer", width:full?"100%":"auto", transition:"opacity .15s", ...props.style }}
      onMouseOver={e=>e.currentTarget.style.opacity=".8"} onMouseOut={e=>e.currentTarget.style.opacity="1"}>
      {children}
    </button>
  );
}

function ProgressBar({ value, max, color }) {
  const pct = max ? Math.min(100,(value/max)*100) : 0;
  return <div style={{ height:6, background:C.border, borderRadius:99, overflow:"hidden" }}><div style={{ height:"100%", width:`${pct}%`, background:color||C.accent, borderRadius:99, transition:"width .4s" }} /></div>;
}

// ─── Swipeable Row (Separated Swipe Left/Right) ──────────────────────────────
function SwipeRow({ onEdit, onDelete, children }) {
  const [slide, setSlide] = useState(0);
  const startX = useRef(null);

  const handleTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const handleTouchMove = (e) => {
    if (startX.current === null) return;
    const diff = e.touches[0].clientX - startX.current;
    // Limit slide to -80 (left for delete) and +80 (right for edit)
    if (diff < 0) setSlide(Math.max(diff, -80));
    else if (diff > 0) setSlide(Math.min(diff, 80));
  };
  const handleTouchEnd = () => {
    if (slide < -40) setSlide(-80); // Snap to Delete
    else if (slide > 40) setSlide(80); // Snap to Edit
    else setSlide(0); // Snap back to center
    startX.current = null;
  };

  return (
    <div style={{ position:"relative", overflow:"hidden", borderRadius:12, marginBottom:8 }}>
      {/* Background Actions */}
      <div style={{ position:"absolute", inset:0, display:"flex", justifyContent:"space-between" }}>
        <button onClick={()=>{setSlide(0); onEdit&&onEdit();}} style={{ width:80, background:C.blueDim, border:`1px solid ${C.blue}33`, color:C.blue, fontSize:20, cursor:"pointer", borderRadius:"12px 0 0 12px" }}>✎</button>
        <button onClick={()=>{setSlide(0); onDelete&&onDelete();}} style={{ width:80, background:C.redDim, border:`1px solid ${C.red}33`, color:C.red, fontSize:20, cursor:"pointer", borderRadius:"0 12px 12px 0" }}>🗑</button>
      </div>
      
      {/* Foreground Card */}
      <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
           style={{ transform:`translateX(${slide}px)`, transition:startX.current?"none":"transform 0.2s ease", touchAction:"pan-y", background:C.card, border:`1px solid ${C.border}`, borderRadius:12, position:"relative", zIndex:1 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Empty State (Simple & Clean iOS Style) ──────────────────────────────────
function EmptyState({ icon, message }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 20px", opacity:0.6 }}>
      <div style={{ fontSize:36, marginBottom:12, filter:"grayscale(100%) opacity(40%)" }}>{icon}</div>
      <div style={{ color:C.text, fontSize:16, fontWeight:600, letterSpacing:0.5, marginBottom:6, fontStyle:"italic" }}>Easy come, easy go.</div>
      <div style={{ color:C.muted, fontSize:13 }}>{message}</div>
    </div>
  );
}

// ─── Dropdown Style Component ────────────────────────────────────────────────
function MonthSelect({ value, onChange, availMonths }) {
  const options = availMonths.length > 0 ? availMonths : [new Date().toISOString().slice(0,7)];
  return (
    <select value={value} onChange={onChange} style={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, borderRadius:10, padding:"8px 12px", fontSize:14, fontWeight:600, outline:"none", appearance:"none" }}>
      <option value="all">All Time</option>
      {options.map(m=>{const[y,mo]=m.split("-");return<option key={m} value={m}>{MONTHS[+mo-1]} {y}</option>;})}
    </select>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [txns, setTxns] = useState([]);
  const [banks, setBanks] = useState(DEFAULT_BANKS);
  const [expCats, setExpCats] = useState(DEFAULT_EXP_CATS);
  const [incCats, setIncCats] = useState(DEFAULT_INC_CATS);
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [savings, setSavings] = useState([]);
  const [bills, setBills] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [ready, setReady] = useState(false);
  const [filterMonth, setFilterMonth] = useState("all");
  const [currency, setCurrencyState] = useState("EGP");
  const [username, setUsernameState] = useState("");
  const [lastBackup, setLastBackup] = useState(null);

  useEffect(() => {
    (async () => {
      const [t,b,ec,ic,g,s,cur,uname,bl,bdg, lb] = await Promise.all([
        load(KEYS.txns,[]), load(KEYS.banks,DEFAULT_BANKS), load(KEYS.expCats,DEFAULT_EXP_CATS),
        load(KEYS.incCats,DEFAULT_INC_CATS), load(KEYS.groups,DEFAULT_GROUPS), load(KEYS.savings,[]),
        load(KEYS.currency,"EGP"), load(KEYS.username,""), load(KEYS.bills,[]), load(KEYS.budgets,[]), load(KEYS.lastBackup, null)
      ]);
      setTxns(t); setBanks(b); setExpCats(ec); setIncCats(ic); setGroups(g); setSavings(s);
      setCurrencyState(cur); setCurrency(cur); setUsernameState(uname); setBills(bl); setBudgets(bdg); setLastBackup(lb);
      
      const currentMonth = new Date().toISOString().slice(0,7);
      setFilterMonth(currentMonth);
      setReady(true);
    })();
  }, []);

  const persist = useCallback(async (key,val) => { await save(key,val); }, []);
  const addTxn = async (t) => { const next=[{...t,id:Date.now().toString()},...txns]; setTxns(next); await persist(KEYS.txns,next); return next; };
  const delTxn = async (id) => { const next=txns.filter(t=>t.id!==id); setTxns(next); await persist(KEYS.txns,next); return next; };
  const updateTxn = async (id,data) => { const next=txns.map(t=>t.id===id?{...t,...data}:t); setTxns(next); await persist(KEYS.txns,next); };
  const saveBanks = async (b) => { setBanks(b); await persist(KEYS.banks,b); };
  const saveExpCats = async (c) => { setExpCats(c); await persist(KEYS.expCats,c); };
  const saveIncCats = async (c) => { setIncCats(c); await persist(KEYS.incCats,c); };
  const saveGroups = async (g) => { setGroups(g); await persist(KEYS.groups,g); };
  const saveSavings = async (s) => { setSavings(s); await persist(KEYS.savings,s); };
  const saveBills = async (b) => { setBills(b); await persist(KEYS.bills,b); };
  const saveBudgets = async (bdg) => { setBudgets(bdg); await persist(KEYS.budgets,bdg); };
  const saveCurrencyHandler = async (c) => { setCurrencyState(c); setCurrency(c); await persist(KEYS.currency,c); };
  const saveUsernameHandler = async (n) => { setUsernameState(n); await persist(KEYS.username,n); };

  const bankBalance = useCallback((bankId) => {
    const inc=txns.filter(t=>t.bankId===bankId&&t.type==="income").reduce((a,t)=>a+t.amount,0);
    const exp=txns.filter(t=>t.bankId===bankId&&t.type==="expense").reduce((a,t)=>a+t.amount,0);
    const sav=txns.filter(t=>t.bankId===bankId&&t.type==="saving").reduce((a,t)=>a+t.amount,0);
    return inc-exp-sav;
  }, [txns]);

  if (!ready) return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.accent,fontSize:28}}>◈</div></div>;

  const allCats=[...expCats,...incCats];
  const filteredTxns=filterMonth==="all"?txns:txns.filter(t=>t.date.startsWith(filterMonth));
  
  // Dynamic months based on transactions ONLY
  const availMonths=[...new Set(txns.map(t=>t.date.slice(0,7)))].sort().reverse();
  const showBackupAlert = lastBackup && (Date.now() - lastBackup > 3 * 24 * 60 * 60 * 1000);

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif",maxWidth:520,margin:"0 auto",paddingBottom:100, position:"relative"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet"/>
      
      {showBackupAlert && tab==="dashboard" && (
        <div style={{background:C.yellowDim, color:C.yellow, padding:"10px 16px", fontSize:12, fontWeight:700, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span>⚠️ It's been 3 days since your last backup!</span>
          <button onClick={()=>setTab("settings")} style={{background:"transparent", border:`1px solid ${C.yellow}`, color:C.yellow, borderRadius:8, padding:"4px 8px", fontSize:10}}>Go Backup</button>
        </div>
      )}

      {tab==="dashboard" && <Dashboard txns={filteredTxns} bills={bills} budgets={budgets} banks={banks} groups={groups} expCats={expCats} savings={savings} filterMonth={filterMonth} setFilterMonth={setFilterMonth} availMonths={availMonths} username={username} bankBalance={bankBalance} txnsAll={txns}/>}
      {tab==="add" && <AddTransaction banks={banks} expCats={expCats} incCats={incCats} savings={savings} currency={currency} onAdd={addTxn} onSaveSavings={saveSavings} onDone={()=>setTab("dashboard")}/>}
      {tab==="history" && <History txns={txns} allCats={allCats} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} incCats={incCats} currency={currency} availMonths={availMonths}/>}
      {tab==="savings" && <SavingsPage savings={savings} onSave={saveSavings} txns={txns} onBack={()=>setTab("settings")}/>}
      {tab==="budgets" && <BudgetsPage budgets={budgets} expCats={expCats} onSave={saveBudgets} onBack={()=>setTab("settings")} currency={currency}/>}
      {tab==="monthly" && <MonthlyBills bills={bills} onSave={saveBills} banks={banks} expCats={expCats} onAddTxn={addTxn} delTxn={delTxn} bankBalance={bankBalance} currency={currency} txns={txns}/>}
      {tab==="settings" && <Settings banks={banks} expCats={expCats} incCats={incCats} groups={groups} onBanks={saveBanks} onExpCats={saveExpCats} onIncCats={saveIncCats} onGroups={saveGroups} currency={currency} onCurrency={saveCurrencyHandler} username={username} onUsername={saveUsernameHandler} bankBalance={bankBalance} onOpenSavings={()=>setTab("savings")} onOpenBudgets={()=>setTab("budgets")} setLastBackup={setLastBackup} txns={txns} bills={bills} savings={savings} budgets={budgets}/>}
      
      <BottomNav tab={tab} setTab={setTab} expCats={expCats} banks={banks} onAdd={addTxn} currency={currency} />
    </div>
  );
}

// ─── Custom Curved Bottom Nav ─────────────────────────────────────────────────
function BottomNav({ tab, setTab, expCats, banks, onAdd, currency }) {
  const [showQuick, setShowQuick] = useState(false);
  const [quickForm, setQuickForm] = useState(null);
  const pressTimer = useRef(null);

  const handlePressStart = (e) => { e.preventDefault(); pressTimer.current = setTimeout(() => setShowQuick(true), 400); };
  const handlePressEnd = (e) => { e.preventDefault(); clearTimeout(pressTimer.current); if(!showQuick && !quickForm) setTab("add"); };

  const handleQuickSelect = (catId, amt) => { setShowQuick(false); setQuickForm({ catId, amount: String(amt), bankId: banks[0]?.id||"", note:"" }); };
  const handleQuickSave = async () => {
    if(!quickForm.amount || isNaN(parseFloat(quickForm.amount))) return;
    const cat = expCats.find(c=>c.id===quickForm.catId);
    const bank = banks.find(b=>b.id===quickForm.bankId);
    await onAdd({ type:"expense", amount:parseFloat(quickForm.amount), date:today(), bankId:quickForm.bankId, bankName:bank?.name, catId:quickForm.catId, catName:cat?.name, catIcon:cat?.icon, note:quickForm.note });
    setQuickForm(null); setTab("dashboard");
  };

  return (
    <>
      <nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:520, zIndex:50 }}>
        {/* The background bar with a CSS trick for the notch */}
        <div style={{ position:"absolute", bottom:0, width:"100%", height:70, background:C.surface, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", padding:"0 10px" }}>
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"space-around", paddingRight:40 }}>
             <NavBtn id="dashboard" icon={ICONS.dashboard} label="Home" tab={tab} setTab={setTab} />
             <NavBtn id="monthly" icon={ICONS.bills_nav} label="Bills" tab={tab} setTab={setTab} />
          </div>
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"space-around", paddingLeft:40 }}>
             <NavBtn id="history" icon="☰" label="History" tab={tab} setTab={setTab} />
             <NavBtn id="settings" icon={ICONS.settings} label="Settings" tab={tab} setTab={setTab} />
          </div>
        </div>

        {/* The FAB & Cutout Container */}
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", bottom:25, width:76, height:76, borderRadius:"50%", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <button onTouchStart={handlePressStart} onTouchEnd={handlePressEnd} onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={()=>clearTimeout(pressTimer.current)} onContextMenu={e=>e.preventDefault()}
                  style={{ width:60, height:60, borderRadius:"50%", background:C.accent, color:C.bg, fontSize:32, border:`none`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"transform 0.1s", userSelect:"none", WebkitUserSelect:"none", WebkitTouchCallout:"none" }}
                  onPointerDown={e=>e.currentTarget.style.transform="scale(0.92)"} onPointerUp={e=>e.currentTarget.style.transform="scale(1)"}>
            +
          </button>
        </div>
          
        {/* Quick Add Floating Menu */}
        {showQuick && (
          <div style={{ position:"absolute", bottom:110, left:"50%", transform:"translateX(-50%)", background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:10, display:"flex", gap:10, boxShadow:"0 10px 25px rgba(0,0,0,0.5)", animation:"popIn 0.2s" }}>
            <style>{`@keyframes popIn { from{opacity:0; transform:translate(-50%, 10px) scale(0.9);} to{opacity:1; transform:translate(-50%, 0) scale(1);} }`}</style>
            <button onClick={()=>handleQuickSelect("coffee", 50)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 16px", color:C.text, display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer" }}><span style={{fontSize:20}}>☕</span><span style={{fontSize:11,fontWeight:700}}>Coffee</span></button>
            <button onClick={()=>handleQuickSelect("transport", 30)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 16px", color:C.text, display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer" }}><span style={{fontSize:20}}>🚗</span><span style={{fontSize:11,fontWeight:700}}>Ride</span></button>
          </div>
        )}
      </nav>

      {/* Quick Add Smart Form Modal */}
      {quickForm && (
        <Modal title="Quick Add" onClose={()=>setQuickForm(null)}>
          <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:20, padding:"10px 14px", background:C.card, borderRadius:12, border:`1px solid ${C.border}`}}>
            <span style={{fontSize:24}}>{ICONS[expCats.find(c=>c.id===quickForm.catId)?.icon]||"📌"}</span>
            <span style={{fontSize:16, fontWeight:700, color:C.text}}>{expCats.find(c=>c.id===quickForm.catId)?.name}</span>
          </div>
          <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Amount ({currency})</div><input type="number" step="any" value={quickForm.amount} onChange={e=>setQuickForm({...quickForm, amount:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"}}/></div>
          <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Pay From</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{banks.map(b=><button key={b.id} onClick={()=>setQuickForm({...quickForm, bankId:b.id})} style={{padding:"8px 14px", borderRadius:10, border:`1px solid ${quickForm.bankId===b.id?C.accent:C.border}`, background:quickForm.bankId===b.id?C.accentDim:"transparent", color:quickForm.bankId===b.id?C.accent:C.text, fontWeight:600, fontSize:13, cursor:"pointer"}}>{b.name}</button>)}</div></div>
          <Input label="Note (optional)" placeholder="e.g. Uber, Starbucks..." value={quickForm.note} onChange={e=>setQuickForm({...quickForm, note:e.target.value})}/>
          <Btn full onClick={handleQuickSave}>Save Quickly</Btn>
        </Modal>
      )}
      {/* Tap anywhere to close quick menu */}
      {showQuick && <div onClick={()=>setShowQuick(false)} style={{position:"fixed", inset:0, zIndex:40}} />}
    </>
  );
}

function NavBtn({ id, icon, label, tab, setTab }) {
  const active = tab === id;
  return (
    <button onClick={()=>setTab(id)} style={{ background:"none", border:"none", color:active?C.accent:C.muted, display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"4px 0", cursor:"pointer", transition:"color .2s", width:50 }}>
      <span style={{fontSize:22}}>{icon}</span>
      <span style={{fontSize:9, fontWeight:700, letterSpacing:.5, textTransform:"uppercase"}}>{label}</span>
    </button>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ txns, bills, budgets, banks, groups, expCats, savings, filterMonth, setFilterMonth, availMonths, username, bankBalance, txnsAll }) {
  const [hideTotal, setHideTotal] = useState(false);

  const totalBalance = banks.reduce((s,b)=>s+bankBalance(b.id),0);
  const totalIncome = txns.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0);
  const totalExp = txns.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);

  const currentMonthStr = new Date().toISOString().slice(0,7);
  const isCurrentMonth = filterMonth === currentMonthStr || filterMonth === "all";
  
  // Bills Stats
  const billsForMonth = isCurrentMonth ? currentMonthStr : filterMonth;
  const paidBillsCount = bills.filter(b=>b.payments?.some(p=>p.month===billsForMonth)).length;
  const totalBillsCount = bills.length;
  const remainingBillsAmount = bills.filter(b=>!b.payments?.some(p=>p.month===billsForMonth)).reduce((sum,b)=>sum+b.amount,0);

  // Days left calculation for budgets
  const d = new Date();
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - d.getDate() + 1);

  return (
    <div style={{padding:"24px 16px 0"}}>
      {username && (
        <div style={{marginBottom:18}}>
          <div style={{color:C.muted,fontSize:13,fontWeight:500}}>{(()=>{const h=new Date().getHours();const e=h<12?"☀️":h<18?"👋":"🌙";const g=h<12?"Good morning":h<18?"Good afternoon":"Good evening";return <>{e} {g},</>;})()}</div>
          <div style={{color:C.text,fontSize:24,fontWeight:800,letterSpacing:-0.5}}>{username} 💰</div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{color:C.text,fontSize:20,fontWeight:800}}>Overview</div>
        <MonthSelect value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} availMonths={availMonths} />
      </div>

      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Accounts</div>
      <Card style={{padding:"16px 18px",marginBottom:10,background:"linear-gradient(135deg,#1e1e28 0%,#23232f 100%)",borderColor:C.faint}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Net Balance</div>
            <div style={{color:C.text,fontSize:30,fontWeight:800,letterSpacing:-1}}>{hideTotal?"••••••":fmt(totalBalance)}</div>
          </div>
          <button onClick={()=>setHideTotal(v=>!v)} style={{background:C.border,border:"none",color:C.muted,width:36,height:36,borderRadius:99,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>{hideTotal?"🙈":"🐵"}</button>
        </div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        {banks.map(b=>{
          const bal=bankBalance(b.id);
          return (
            <Card key={b.id} style={{padding:"14px 14px 12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><div style={{width:8,height:8,borderRadius:99,background:b.color,flexShrink:0}}/><span style={{color:C.muted,fontSize:12,fontWeight:600}}>{b.name}</span></div>
              <div style={{color:bal<0?C.red:C.text,fontSize:17,fontWeight:800}}>{hideTotal?"••••":fmt(bal)}</div>
            </Card>
          );
        })}
      </div>
      
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        <Card style={{padding:"14px 14px 12px"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Income</div><div style={{color:C.accent,fontSize:20,fontWeight:800}}>{hideTotal?"••••":fmt(totalIncome)}</div></Card>
        <Card style={{padding:"14px 14px 12px"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Expenses</div><div style={{color:C.red,fontSize:20,fontWeight:800}}>{hideTotal?"••••":fmt(totalExp)}</div></Card>
      </div>

      {/* Monthly Bills Tracker Card */}
      {bills.length > 0 && (
        <>
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Monthly Bills</div>
          <Card style={{padding:"14px 14px 12px", marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{color:C.text,fontWeight:700,fontSize:14}}>⚡ Upcoming Payments</span>
              <Pill color={paidBillsCount===totalBillsCount?C.accent:C.red}>{paidBillsCount}/{totalBillsCount} Paid</Pill>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{color:C.red,fontSize:18,fontWeight:800}}>{hideTotal?"••••":fmt(remainingBillsAmount)}</span>
              <span style={{color:C.muted,fontSize:13}}>remaining</span>
            </div>
            <ProgressBar value={paidBillsCount} max={totalBillsCount} color={C.red}/>
          </Card>
        </>
      )}

      {/* Dynamic Budgets Section */}
      {budgets.length > 0 && (
        <>
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Monthly Budgets</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
            {budgets.map(bdg => {
              // Calculate spent for this budget in current month
              const spent = txnsAll.filter(t => t.type === "expense" && t.date.startsWith(currentMonthStr) && bdg.cats.includes(t.catId)).reduce((a,t) => a+t.amount, 0);
              const remaining = Math.max(0, bdg.amount - spent);
              const safeDaily = remaining / daysLeft;
              return (
                <Card key={bdg.id} style={{padding:"16px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}><div style={{width:8,height:8,borderRadius:99,background:C.accent}}/><span style={{color:C.text,fontSize:14,fontWeight:700}}>{bdg.name}</span></div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}>
                    <div>
                      <div style={{color:C.accent,fontSize:22,fontWeight:800,lineHeight:1}}>{hideTotal?"••••":fmt(remaining)}</div>
                      <div style={{color:C.faint,fontSize:11,fontWeight:600,marginTop:4}}>Safe Daily: {fmt(safeDaily)}</div>
                    </div>
                    <div style={{color:C.muted,fontSize:12}}>of {fmt(bdg.amount)}</div>
                  </div>
                  <ProgressBar value={spent} max={bdg.amount} color={C.accent}/>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Expense Breakdown</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        {groups.map(g=>{
          const total=txns.filter(t=>t.type==="expense"&&g.cats.includes(t.catId)).reduce((a,t)=>a+t.amount,0);
          if(!total) return null;
          const pct=totalExp?Math.round((total/totalExp)*100):0;
          return (<Card key={g.id} style={{padding:"14px 14px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><div style={{width:8,height:8,borderRadius:99,background:g.color}}/><span style={{color:C.muted,fontSize:12,fontWeight:600}}>{g.name}</span></div><div style={{color:g.color,fontSize:17,fontWeight:800,marginBottom:6}}>{hideTotal?"••••":fmt(total)}</div><ProgressBar value={total} max={totalExp} color={g.color}/><div style={{color:C.faint,fontSize:10,fontWeight:700,marginTop:4}}>{pct}% of total</div></Card>);
        })}
        {(()=> {
          const gc=groups.flatMap(g=>g.cats);const total=txns.filter(t=>t.type==="expense"&&!gc.includes(t.catId)).reduce((a,t)=>a+t.amount,0);const pct=totalExp?Math.round((total/totalExp)*100):0;return total>0?(<Card style={{padding:"14px 14px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><div style={{width:8,height:8,borderRadius:99,background:C.faint}}/><span style={{color:C.muted,fontSize:12,fontWeight:600}}>Other</span></div><div style={{color:C.text,fontSize:17,fontWeight:800,marginBottom:6}}>{hideTotal?"••••":fmt(total)}</div><ProgressBar value={total} max={totalExp} color={C.faint}/><div style={{color:C.faint,fontSize:10,fontWeight:700,marginTop:4}}>{pct}% of total</div></Card>):null;
        })()}
      </div>

      {savings.length>0&&(<><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Savings Goals</div><div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>{savings.map(s=>{const saved=s.contributions?.reduce((a,c)=>a+c.amount,0)||0;const pct=s.goal?Math.min(100,Math.round((saved/s.goal)*100)):0;return(<Card key={s.id} style={{padding:"14px 14px 12px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{color:C.text,fontWeight:700,fontSize:14}}>🎯 {s.name}</span><Pill color={C.yellow}>{pct}%</Pill></div><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:C.yellow,fontSize:18,fontWeight:800}}>{hideTotal?"••••":fmt(saved)}</span><span style={{color:C.muted,fontSize:13}}>of {fmt(s.goal)}</span></div><ProgressBar value={saved} max={s.goal} color={C.yellow}/></Card>);})}</div></>)}

      {txns.length>0&&(<><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Recent Transactions</div><div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>{txns.slice(0,5).map(t=><TxnRow key={t.id} txn={t} hideTotal={hideTotal}/>)}</div></>)}
    </div>
  );
}

function TxnRow({ txn, hideTotal }) {
  const isExp=txn.type==="expense", isInc=txn.type==="income";
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px"}}>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <div style={{width:36,height:36,borderRadius:10,background:isExp?C.redDim:isInc?C.accentDim:C.yellowDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{txn.type==="saving"?ICONS.saving:ICONS[txn.catIcon]||"📌"}</div>
        <div><div style={{color:C.text,fontWeight:600,fontSize:14}}>{txn.catName||txn.type}</div><div style={{color:C.muted,fontSize:11}}>{txn.bankName} · {fmtDate(txn.date)}</div></div>
      </div>
      <div style={{color:isExp?C.red:isInc?C.accent:C.yellow,fontWeight:800,fontSize:15}}>{isExp?"−":"+"}{hideTotal?"••••":fmt(txn.amount)}</div>
    </div>
  );
}

// ─── Add Transaction ──────────────────────────────────────────────────────────
function AddTransaction({ banks, expCats, incCats, savings, currency, onAdd, onSaveSavings, onDone }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [bankId, setBankId] = useState(banks[0]?.id||"");
  const [catId, setCatId] = useState(expCats[0]?.id||"");
  const [note, setNote] = useState("");
  const [savingId, setSavingId] = useState(savings[0]?.id||"");
  const cats=type==="expense"?expCats:type==="income"?incCats:[];

  useEffect(()=>{if(type==="expense"&&expCats.length)setCatId(expCats[0].id);if(type==="income"&&incCats.length)setCatId(incCats[0].id);if(type==="saving"&&savings.length)setSavingId(savings[0].id);},[type]);

  const handleSubmit=async()=>{
    if(!amount||isNaN(parseFloat(amount))||parseFloat(amount)<=0) return;
    const bank=banks.find(b=>b.id===bankId);
    if(type==="saving"){
      if(!savingId)return; const sv=savings.find(s=>s.id===savingId); if(!sv)return;
      const c={id:Date.now().toString(),amount:parseFloat(amount),date,bankId,bankName:bank?.name};
      await onSaveSavings(savings.map(s=>s.id===savingId?{...s,contributions:[...(s.contributions||[]),c]}:s));
      await onAdd({type:"saving",amount:parseFloat(amount),date,bankId,bankName:bank?.name,catName:sv.name,catIcon:"saving",note});
    } else {
      const cat=cats.find(c=>c.id===catId);
      await onAdd({type,amount:parseFloat(amount),date,bankId,bankName:bank?.name,catId,catName:cat?.name,catIcon:cat?.icon,note});
    }
    setAmount(""); setNote(""); setDate(today()); onDone();
  };

  return (
    <div style={{padding:"24px 16px 0"}}>
      <div style={{color:C.text,fontSize:22,fontWeight:800,marginBottom:20}}>New Transaction</div>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {[{v:"expense",label:"Expense",color:C.red},{v:"income",label:"Income",color:C.accent},{v:"saving",label:"Saving",color:C.yellow}].map(o=>(
          <button key={o.v} onClick={()=>setType(o.v)} style={{flex:1,padding:"10px 0",borderRadius:10,border:`1.5px solid ${type===o.v?o.color:C.border}`,background:type===o.v?o.color+"22":"transparent",color:type===o.v?o.color:C.muted,fontWeight:700,fontSize:13,cursor:"pointer"}}>{o.label}</button>
        ))}
      </div>
      <div style={{marginBottom:14}}>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Amount ({currency})</div>
        <input type="number" step="any" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <Input label="Date" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      <Select label="Account" value={bankId} onChange={e=>setBankId(e.target.value)}>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select>
      {type==="saving"?(savings.length>0?<Select label="Saving Goal" value={savingId} onChange={e=>setSavingId(e.target.value)}>{savings.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select>:<div style={{color:C.muted,fontSize:13,marginBottom:14,padding:"10px 12px",background:C.card,borderRadius:10}}>No saving goals yet.</div>):(<Select label="Category" value={catId} onChange={e=>setCatId(e.target.value)}>{cats.map(c=><option key={c.id} value={c.id}>{ICONS[c.icon]||"📌"} {c.name}</option>)}</Select>)}
      <Input label="Note (optional)" placeholder="Add a note..." value={note} onChange={e=>setNote(e.target.value)}/>
      <Btn full onClick={handleSubmit} style={{marginTop:8}}>Save Transaction</Btn>
    </div>
  );
}

// ─── History ──────────────────────────────────────────────────────────────────
function History({ txns, onDelete, onUpdate, banks, expCats, incCats, currency, availMonths }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [confirmId, setConfirmId] = useState(null);
  const [editTxn, setEditTxn] = useState(null);
  
  const filtered=txns.filter(t=>{
    if(filterType!=="all"&&t.type!==filterType)return false;
    if(filterMonth!=="all"&&!t.date.startsWith(filterMonth))return false;
    if(search&&!t.catName?.toLowerCase().includes(search.toLowerCase())&&!t.note?.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  return (
    <div style={{padding:"24px 16px 0"}}>
      <div style={{color:C.text,fontSize:22,fontWeight:800,marginBottom:16}}>History</div>
      <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:12}}/>
      <div style={{display:"flex",gap:8,marginBottom:14,overflowX:"auto"}}>
        {["all","expense","income","saving"].map(f=>(<button key={f} onClick={()=>setFilterType(f)} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${filterType===f?C.accent:C.border}`,background:filterType===f?C.accentDim:"transparent",color:filterType===f?C.accent:C.muted,fontWeight:600,fontSize:12,cursor:"pointer",textTransform:"capitalize"}}>{f}</button>))}
      </div>
      
      <div style={{marginBottom:16}}>
        <MonthSelect value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} availMonths={availMonths} />
      </div>

      <div style={{display:"flex",flexDirection:"column"}}>
        {filtered.length===0&&<EmptyState icon="💸" message="No transactions found." />}
        {filtered.map(t=>(
          <SwipeRow key={t.id} onEdit={()=>setEditTxn(t)} onDelete={()=>setConfirmId(t.id)}>
            <TxnRow txn={t} hideTotal={false} />
          </SwipeRow>
        ))}
      </div>
      {confirmId&&<ConfirmModal title="Delete Transaction?" message="This action cannot be undone." onClose={()=>setConfirmId(null)} onConfirm={()=>{onDelete(confirmId);setConfirmId(null);}}/>}
      {editTxn&&<EditTxnModal txn={editTxn} banks={banks} expCats={expCats} incCats={incCats} currency={currency} onSave={async(data)=>{await onUpdate(editTxn.id,data);setEditTxn(null);}} onClose={()=>setEditTxn(null)}/>}
    </div>
  );
}

function EditTxnModal({ txn, banks, expCats, incCats, currency, onSave, onClose }) {
  const [amount, setAmount] = useState(String(txn.amount));
  const [date, setDate] = useState(txn.date);
  const [bankId, setBankId] = useState(txn.bankId);
  const [catId, setCatId] = useState(txn.catId||"");
  const [note, setNote] = useState(txn.note||"");
  const cats=txn.type==="expense"?expCats:txn.type==="income"?incCats:[];
  const handleSave=async()=>{
    if(!amount||isNaN(parseFloat(amount))||parseFloat(amount)<=0)return;
    const bank=banks.find(b=>b.id===bankId); const cat=cats.find(c=>c.id===catId);
    await onSave({amount:parseFloat(amount),date,bankId,bankName:bank?.name,catId,catName:cat?.name||txn.catName,catIcon:cat?.icon||txn.catIcon,note});
  };
  return (
    <Modal title="Edit Transaction" onClose={onClose}>
      <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Amount ({currency})</div><input type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"}}/></div>
      <Input label="Date" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      <Select label="Account" value={bankId} onChange={e=>setBankId(e.target.value)}>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select>
      {cats.length>0&&<Select label="Category" value={catId} onChange={e=>setCatId(e.target.value)}>{cats.map(c=><option key={c.id} value={c.id}>{ICONS[c.icon]||"📌"} {c.name}</option>)}</Select>}
      <Input label="Note (optional)" value={note} onChange={e=>setNote(e.target.value)}/>
      <Btn full onClick={handleSave}>Save Changes</Btn>
    </Modal>
  );
}

// ─── Savings ─────────────────────────────────────────────────────────────────
function SavingsPage({ savings, onSave, onBack }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [editId, setEditId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const handleAdd=async()=>{if(!name||!goal)return;if(editId){await onSave(savings.map(s=>s.id===editId?{...s,name,goal:parseFloat(goal)}:s));setEditId(null);}else{await onSave([...savings,{id:Date.now().toString(),name,goal:parseFloat(goal),contributions:[]}]);}setName("");setGoal("");setShowAdd(false);};
  const startEdit=(s)=>{setEditId(s.id);setName(s.name);setGoal(s.goal);setShowAdd(true);};

  return (
    <div style={{padding:"24px 16px 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:C.accent,fontSize:20,cursor:"pointer",padding:0,lineHeight:1}}>❮</button>
          <div style={{color:C.text,fontSize:22,fontWeight:800}}>Saving Goals</div>
        </div>
        <Btn small onClick={()=>{setEditId(null);setName("");setGoal("");setShowAdd(true);}}>+ New Goal</Btn>
      </div>
      {savings.length===0&&<EmptyState icon="◎" message="No saving goals yet." />}
      <div style={{display:"flex",flexDirection:"column"}}>
        {savings.map(s=>{
          const saved=s.contributions?.reduce((a,c)=>a+c.amount,0)||0;
          const pct=s.goal?Math.min(100,Math.round((saved/s.goal)*100)):0;
          return (
            <SwipeRow key={s.id} onEdit={()=>startEdit(s)} onDelete={()=>setConfirmId(s.id)}>
              <div style={{padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div><div style={{color:C.text,fontWeight:700,fontSize:17}}>{s.name}</div><div style={{color:C.muted,fontSize:12,marginTop:2}}>Goal: {fmt(s.goal)}</div></div>
                  <Pill color={C.yellow}>{pct}%</Pill>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:C.yellow,fontSize:18,fontWeight:800}}>{fmt(saved)}</span><span style={{color:C.muted,fontSize:13}}>{fmt(Math.max(0,s.goal-saved))} left</span></div>
                <ProgressBar value={saved} max={s.goal} color={C.yellow}/>
              </div>
            </SwipeRow>
          );
        })}
      </div>
      {showAdd&&(<Modal title={editId?"Edit Goal":"New Saving Goal"} onClose={()=>{setShowAdd(false);setEditId(null);}}><Input label="Goal Name" placeholder="e.g. Travel Fund..." value={name} onChange={e=>setName(e.target.value)}/><Input label="Target Amount" type="number" step="any" value={goal} onChange={e=>setGoal(e.target.value)}/><Btn full onClick={handleAdd}>{editId?"Update Goal":"Create Goal"}</Btn></Modal>)}
      {confirmId&&<ConfirmModal title="Delete Goal?" message="This will permanently delete this saving goal." onClose={()=>setConfirmId(null)} onConfirm={async()=>{await onSave(savings.filter(s=>s.id!==confirmId));setConfirmId(null);}}/>}
    </div>
  );
}

// ─── Budgets Page (Custom Multi-Budgets) ──────────────────────────────────────
function BudgetsPage({ budgets, expCats, onSave, onBack, currency }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [confirmId, setConfirmId] = useState(null);

  const startEdit=(b)=>{setEditId(b.id);setName(b.name);setAmount(b.amount);setSelectedCats(b.cats||[]);setShowAdd(true);};
  const handleAdd=async()=>{
    if(!name||!amount||selectedCats.length===0)return;
    if(editId) await onSave(budgets.map(b=>b.id===editId?{...b,name,amount:parseFloat(amount),cats:selectedCats}:b));
    else await onSave([...budgets,{id:Date.now().toString(),name,amount:parseFloat(amount),cats:selectedCats}]);
    setShowAdd(false);setEditId(null);setName("");setAmount("");setSelectedCats([]);
  };

  return (
    <div style={{padding:"24px 16px 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:C.accent,fontSize:20,cursor:"pointer",padding:0,lineHeight:1}}>❮</button>
          <div style={{color:C.text,fontSize:22,fontWeight:800}}>Budgets</div>
        </div>
        <Btn small onClick={()=>{setEditId(null);setName("");setAmount("");setSelectedCats([]);setShowAdd(true);}}>+ Add Budget</Btn>
      </div>
      {budgets.length===0&&<EmptyState icon="📊" message="Create specific budgets to track your spending limits." />}
      
      <div style={{display:"flex",flexDirection:"column"}}>
        {budgets.map(b=>(
          <SwipeRow key={b.id} onEdit={()=>startEdit(b)} onDelete={()=>setConfirmId(b.id)}>
            <div style={{padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{color:C.text,fontWeight:700,fontSize:17}}>{b.name}</div>
                <div style={{color:C.accent,fontSize:18,fontWeight:800}}>{fmt(b.amount)}</div>
              </div>
              <div style={{color:C.muted,fontSize:12,marginBottom:10}}>Linked to {b.cats.length} categories</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{b.cats.slice(0,4).map(cid=>{const cat=expCats.find(c=>c.id===cid);return cat?<span key={cid} style={{fontSize:16}}>{ICONS[cat.icon]}</span>:null;})}{b.cats.length>4&&<span style={{color:C.faint,fontSize:12,alignSelf:"center"}}>+{b.cats.length-4} more</span>}</div>
            </div>
          </SwipeRow>
        ))}
      </div>

      {showAdd&&(<Modal title={editId?"Edit Budget":"New Budget"} onClose={()=>{setShowAdd(false);setEditId(null);}}>
        <Input label="Budget Name" placeholder="e.g. Shopping Allowance" value={name} onChange={e=>setName(e.target.value)}/>
        <Input label={`Monthly Limit (${currency})`} type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)}/>
        <div style={{marginBottom:14}}>
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Tracked Categories</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:150,overflow:"auto",background:C.bg,padding:10,borderRadius:10,border:`1px solid ${C.border}`}}>
            {expCats.map(c=>{
              const checked=selectedCats.includes(c.id);
              return(
                <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"4px 0"}}>
                  <div onClick={()=>setSelectedCats(checked?selectedCats.filter(x=>x!==c.id):[...selectedCats,c.id])} style={{width:18,height:18,borderRadius:4,border:`2px solid ${checked?C.accent:C.faint}`,background:checked?C.accentDim:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{checked&&<span style={{color:C.accent,fontSize:12}}>✓</span>}</div>
                  <span style={{color:C.text,fontSize:14}}>{ICONS[c.icon]||"📌"} {c.name}</span>
                </label>
              );
            })}
          </div>
        </div>
        <Btn full onClick={handleAdd}>{editId?"Update Budget":"Save Budget"}</Btn>
      </Modal>)}
      {confirmId&&<ConfirmModal title="Delete Budget?" message="This won't delete your transactions, just the budget limit." onClose={()=>setConfirmId(null)} onConfirm={async()=>{await onSave(budgets.filter(b=>b.id!==confirmId));setConfirmId(null);}}/>}
    </div>
  );
}

// ─── Monthly Bills ────────────────────────────────────────────────────────────
function MonthlyBills({ bills, onSave, banks, expCats, onAddTxn, delTxn, currency, txns }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmUndo, setConfirmUndo] = useState(null); 
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState(banks[0]?.id||"");
  const [catId, setCatId] = useState(expCats[0]?.id||"");
  
  const defaultMonth = new Date().toISOString().slice(0,7);
  const [filterMonth, setFilterMonth] = useState(defaultMonth);
  const availMonths = [...new Set([...bills.flatMap(b=>b.payments?.map(p=>p.month)||[]), defaultMonth])].sort().reverse();

  const isPaid = (bill) => bill.payments?.some(p=>p.month === filterMonth);

  const openAdd=(item=null)=>{setEditItem(item);setName(item?.name||"");setAmount(item?.amount?String(item.amount):"");setBankId(item?.bankId||banks[0]?.id||"");setCatId(item?.catId||expCats[0]?.id||"");setShowAdd(true);};
  const handleSave=async()=>{
    if(!name||!amount||isNaN(parseFloat(amount))||parseFloat(amount)<=0)return;
    if(editItem) await onSave(bills.map(b=>b.id===editItem.id?{...b,name,amount:parseFloat(amount),bankId,catId}:b));
    else await onSave([...bills,{id:Date.now().toString(),name,amount:parseFloat(amount),bankId,catId,payments:[]}]);
    setShowAdd(false);setEditItem(null);setName("");setAmount("");
  };

  const handlePay=async(bill)=>{
    const bank=banks.find(b=>b.id===bill.bankId); const cat=expCats.find(c=>c.id===bill.catId);
    const txnId=Date.now().toString(); const dateStr=today();
    await onAddTxn({id:txnId,type:"expense",amount:bill.amount,date:dateStr,bankId:bill.bankId,bankName:bank?.name,catId:bill.catId,catName:cat?.name||bill.name,catIcon:cat?.icon||"bills",note:`Monthly: ${bill.name}`});
    await onSave(bills.map(b=>b.id===bill.id?{...b,payments:[...(b.payments||[]),{month:filterMonth,date:dateStr,txnId}]}:b));
  };

  const handleUndoConfirm = async () => {
    if(!confirmUndo) return;
    const payment = confirmUndo.payments.find(p=>p.month === filterMonth);
    if(payment && payment.txnId) await delTxn(payment.txnId); 
    await onSave(bills.map(b=>b.id===confirmUndo.id?{...b,payments:b.payments.filter(p=>p.month!==filterMonth)}:b));
    setConfirmUndo(null);
  };

  const paidCount=bills.filter(b=>isPaid(b)).length;
  const totalMonthly=bills.reduce((a,b)=>a+b.amount,0);
  const paidAmount=bills.filter(b=>isPaid(b)).reduce((a,b)=>a+b.amount,0);

  return (
    <div style={{padding:"24px 16px 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <div style={{color:C.text,fontSize:22,fontWeight:800}}>Monthly Bills</div>
        <Btn small onClick={()=>openAdd()}>+ Add Bill</Btn>
      </div>

      <div style={{marginBottom:16}}>
         <MonthSelect value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} availMonths={availMonths} />
      </div>
      
      <div style={{color:C.muted,fontSize:13,marginBottom:16}}>{paidCount}/{bills.length} paid in selected month</div>
      
      {bills.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          <Card style={{padding:"14px 14px 12px"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Total Monthly</div><div style={{color:C.text,fontSize:18,fontWeight:800}}>{fmt(totalMonthly)}</div></Card>
          <Card style={{padding:"14px 14px 12px"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Paid Selected</div><div style={{color:C.accent,fontSize:18,fontWeight:800}}>{fmt(paidAmount)}</div></Card>
        </div>
      )}
      
      {bills.length===0&&<EmptyState icon="📋" message="No monthly bills set up yet." />}
      <div style={{display:"flex",flexDirection:"column"}}>
        {bills.map(bill=>{
          const paid=isPaid(bill);
          const bank=banks.find(b=>b.id===bill.bankId); const cat=expCats.find(c=>c.id===bill.catId);
          const thisPay=bill.payments?.find(p=>p.month===filterMonth);
          return (
            <SwipeRow key={bill.id} onEdit={()=>openAdd(bill)} onDelete={()=>setConfirmDelete(bill.id)}>
              <div style={{padding:"16px 16px 14px", border:`1.5px solid ${paid?C.accent+"66":C.red+"66"}`, borderRadius:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{color:C.text,fontWeight:700,fontSize:15}}>{bill.name}</span>
                    </div>
                    <div style={{color:C.muted,fontSize:12}}>{bank?.name} · {cat?.name||"—"}</div>
                  </div>
                  <div style={{color:C.text,fontSize:18,fontWeight:800}}>{fmt(bill.amount)}</div>
                </div>
                {!paid?(
                  <button onClick={()=>handlePay(bill)} style={{width:"100%",background:C.redDim,border:`1.5px solid ${C.red}`,color:C.red,borderRadius:10,padding:"10px 0",fontWeight:700,fontSize:14,cursor:"pointer",transition:"opacity .15s"}}>Pay Bill ❌</button>
                ):(
                  <button onClick={()=>setConfirmUndo(bill)} style={{width:"100%",background:C.accentDim,border:`1.5px solid ${C.accent}`,color:C.accent,borderRadius:10,padding:"10px 0",fontWeight:700,fontSize:14,cursor:"pointer",transition:"opacity .15s"}}>Paid ✅ {thisPay?.date&&`(${fmtDate(thisPay.date)})`}</button>
                )}
              </div>
            </SwipeRow>
          );
        })}
      </div>
      
      {showAdd&&(<Modal title={editItem?"Edit Bill":"New Monthly Bill"} onClose={()=>{setShowAdd(false);setEditItem(null);}}><Input label="Bill Name" value={name} onChange={e=>setName(e.target.value)}/><div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Amount ({currency})</div><input type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"}}/></div><Select label="Pay from Account" value={bankId} onChange={e=>setBankId(e.target.value)}>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select><Select label="Category" value={catId} onChange={e=>setCatId(e.target.value)}>{expCats.map(c=><option key={c.id} value={c.id}>{ICONS[c.icon]||"📌"} {c.name}</option>)}</Select><Btn full onClick={handleSave}>{editItem?"Update Bill":"Add Bill"}</Btn></Modal>)}
      {confirmDelete&&<ConfirmModal title="Delete Bill?" message="Remove this from your monthly bills?" onClose={()=>setConfirmDelete(null)} onConfirm={async()=>{await onSave(bills.filter(b=>b.id!==confirmDelete));setConfirmDelete(null);}}/>}
      {confirmUndo&&<ConfirmModal title="Undo Payment?" message={`This will mark "${confirmUndo.name}" as unpaid and delete the expense transaction from your history.`} confirmColor={C.yellow} onClose={()=>setConfirmUndo(null)} onConfirm={handleUndoConfirm}/>}
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function Settings({ banks, expCats, incCats, groups, onBanks, onExpCats, onIncCats, onGroups, currency, onCurrency, username, onUsername, bankBalance, onOpenSavings, onOpenBudgets, setLastBackup, txns, bills, savings, budgets }) {
  const [section, setSection] = useState("profile");
  const [modal, setModal] = useState(null);
  const [inputName, setInputName] = useState("");
  const [inputColor, setInputColor] = useState(C.accent);
  const [inputGroup, setInputGroup] = useState("");
  const [inputIcon, setInputIcon] = useState("others");
  const [groupCats, setGroupCats] = useState([]);
  const [nameInput, setNameInput] = useState(username||"");
  const [confirmDel, setConfirmDel] = useState(null);

  const openAdd=(type,item=null)=>{setModal({type,item});setInputName(item?.name||"");setInputColor(item?.color||C.accent);setInputGroup(item?.group||"daily");setInputIcon(item?.icon||"others");setGroupCats(item?.cats||[]);};
  const handleSave=async()=>{
    if(!inputName.trim())return; const id=modal.item?.id||Date.now().toString();
    if(modal.type==="bank") await onBanks(modal.item?banks.map(b=>b.id===id?{id,name:inputName,color:inputColor}:b):[...banks,{id,name:inputName,color:inputColor}]);
    else if(modal.type==="expCat") await onExpCats(modal.item?expCats.map(c=>c.id===id?{id,name:inputName,icon:inputIcon,group:inputGroup}:c):[...expCats,{id,name:inputName,icon:inputIcon,group:inputGroup}]);
    else if(modal.type==="incCat") await onIncCats(modal.item?incCats.map(c=>c.id===id?{id,name:inputName,icon:inputIcon}:c):[...incCats,{id,name:inputName,icon:inputIcon}]);
    else if(modal.type==="group") await onGroups(modal.item?groups.map(g=>g.id===id?{id,name:inputName,color:inputColor,cats:groupCats}:g):[...groups,{id,name:inputName,color:inputColor,cats:groupCats}]);
    setModal(null);
  };
  const doDelete=async()=>{
    const{type,item}=confirmDel;
    if(type==="bank")await onBanks(banks.filter(b=>b.id!==item.id));
    else if(type==="expCat")await onExpCats(expCats.filter(c=>c.id!==item.id));
    else if(type==="incCat")await onIncCats(incCats.filter(c=>c.id!==item.id));
    else if(type==="group")await onGroups(groups.filter(g=>g.id!==item.id));
    setConfirmDel(null);
  };
  
  const handleBackup = async () => {
    const data = { txns, banks, expCats, incCats, groups, savings, bills, budgets, currency, username };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "DeliveryDiary_Backup.json"; // Fixed name for Overwrite
    a.click();
    const now = Date.now();
    await save(KEYS.lastBackup, now);
    setLastBackup(now);
    alert("Backup saved! Check your Downloads folder.");
  };

  const canDelBank=(b)=>bankBalance(b.id)===0;
  const iconKeys=Object.keys(ICONS).filter(k=>!["dashboard","add","settings","saving","bills_nav","income","expense","transfer","close","check","trash","edit","bank","cash","goal", "budget"].includes(k));

  const SettingRow=({item,type,onEdit,canDel=true})=>(
    <SwipeRow onEdit={()=>onEdit(item)} onDelete={()=>canDel?setConfirmDel({type,item}):alert(`Clear balance first to delete ${item.name}`)}>
      <div style={{display:"flex",alignItems:"center",padding:"12px 16px"}}>
        {(type==="bank"||type==="group")&&<div style={{width:10,height:10,borderRadius:99,background:item.color,marginRight:10}}/>}
        {(type==="expCat"||type==="incCat")&&<span style={{fontSize:18,marginRight:10}}>{ICONS[item.icon]||"📌"}</span>}
        <div><div style={{color:C.text,fontWeight:600,fontSize:14}}>{item.name}</div>
        {type==="bank"&&<div style={{color:C.faint,fontSize:11}}>{fmt(bankBalance(item.id))}</div>}</div>
      </div>
    </SwipeRow>
  );

  return (
    <div style={{padding:"24px 16px 0"}}>
      <div style={{color:C.text,fontSize:22,fontWeight:800,marginBottom:16}}>Settings</div>
      <div style={{display:"flex",gap:8,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
        {[{id:"profile",label:"👤 General"},{id:"currency",label:"💱 Currency"},{id:"banks",label:"🏦 Accounts"},{id:"expCats",label:"📤 Exp. Cat."},{id:"incCats",label:"📥 Inc. Cat."},{id:"groups",label:"📊 Groups"}].map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)} style={{whiteSpace:"nowrap",padding:"8px 14px",borderRadius:10,border:`1px solid ${section===s.id?C.accent:C.border}`,background:section===s.id?C.accentDim:"transparent",color:section===s.id?C.accent:C.muted,fontWeight:700,fontSize:12,cursor:"pointer"}}>{s.label}</button>
        ))}
      </div>

      {section==="profile"&&(
        <div>
          <div onClick={onOpenSavings} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18,color:C.yellow}}>◎</span><span style={{color:C.text,fontWeight:600,fontSize:14}}>Savings Goals</span></div><span style={{color:C.muted}}>❯</span></div>
          <div onClick={onOpenBudgets} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18,color:C.accent}}>📊</span><span style={{color:C.text,fontWeight:600,fontSize:14}}>Budgets</span></div><span style={{color:C.muted}}>❯</span></div>
          
          <Card style={{marginBottom:16}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Your Name</div><input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Enter your name..." style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:12}}/><Btn full onClick={()=>{onUsername(nameInput.trim());alert("Name updated!");}}>Save Name</Btn></Card>
          
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Data & Backup</div>
          <Card style={{marginBottom:16}}>
            <p style={{color:C.faint, fontSize:12, marginBottom:12, lineHeight:1.4}}>Download a backup of your data. If your phone asks to replace the existing file, tap Replace.</p>
            <Btn full onClick={handleBackup} color={C.blue}>⬇️ Download Backup</Btn>
          </Card>
        </div>
      )}

      {section==="currency"&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>{CURRENCIES.map(cur=>(<button key={cur.code} onClick={()=>onCurrency(cur.code)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:currency===cur.code?C.accentDim:C.card,border:`1.5px solid ${currency===cur.code?C.accent:C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",textAlign:"left"}}><div><div style={{color:currency===cur.code?C.accent:C.text,fontWeight:700,fontSize:15}}>{cur.code}</div><div style={{color:C.muted,fontSize:12,marginTop:2}}>{cur.name}</div></div>{currency===cur.code&&<span style={{color:C.accent,fontSize:20}}>✓</span>}</button>))}</div>)}
      {section==="banks"&&(<><div style={{display:"flex",flexDirection:"column"}}>{banks.map(b=><SettingRow key={b.id} item={b} type="bank" onEdit={i=>openAdd("bank",i)} canDel={canDelBank(b)}/>)}</div><Btn outline full onClick={()=>openAdd("bank")}>+ Add Account</Btn></>)}
      {section==="expCats"&&(<><div style={{display:"flex",flexDirection:"column"}}>{expCats.map(c=><SettingRow key={c.id} item={c} type="expCat" onEdit={i=>openAdd("expCat",i)}/>)}</div><Btn outline full onClick={()=>openAdd("expCat")}>+ Add Category</Btn></>)}
      {section==="incCats"&&(<><div style={{display:"flex",flexDirection:"column"}}>{incCats.map(c=><SettingRow key={c.id} item={c} type="incCat" onEdit={i=>openAdd("incCat",i)}/>)}</div><Btn outline full onClick={()=>openAdd("incCat")}>+ Add Category</Btn></>)}
      {section==="groups"&&(<><div style={{display:"flex",flexDirection:"column"}}>{groups.map(g=>(<SwipeRow key={g.id} onEdit={()=>openAdd("group",g)} onDelete={()=>setConfirmDel({type:"group",item:g})}><div style={{padding:"12px 16px"}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{width:10,height:10,borderRadius:99,background:g.color}}/><span style={{color:C.text,fontWeight:700}}>{g.name}</span></div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{g.cats.map(cid=>{const cat=expCats.find(c=>c.id===cid);return cat?<Pill key={cid} color={g.color}>{cat.name}</Pill>:null;})}</div></div></SwipeRow>))}</div><Btn outline full onClick={()=>openAdd("group")}>+ Add Group</Btn></>)}

      {modal&&(
        <Modal title={`${modal.item?"Edit":"Add"} ${modal.type}`} onClose={()=>setModal(null)}>
          <Input label="Name" value={inputName} onChange={e=>setInputName(e.target.value)}/>
          {(modal.type==="bank"||modal.type==="group")&&(<div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Color</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[C.accent,C.red,C.blue,C.yellow,C.purple,"#fb923c","#34d399","#f472b6"].map(col=>(<button key={col} onClick={()=>setInputColor(col)} style={{width:28,height:28,borderRadius:99,background:col,border:inputColor===col?"3px solid white":"3px solid transparent",cursor:"pointer"}}/>))}</div></div>)}
          {(modal.type==="expCat"||modal.type==="incCat")&&(<div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Icon</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{iconKeys.map(k=><button key={k} onClick={()=>setInputIcon(k)} style={{width:36,height:36,borderRadius:8,background:inputIcon===k?C.accentDim:C.bg,border:`1px solid ${inputIcon===k?C.accent:C.border}`,cursor:"pointer",fontSize:18}}>{ICONS[k]}</button>)}</div></div>)}
          {modal.type==="expCat"&&(<Select label="Group Tag" value={inputGroup} onChange={e=>setInputGroup(e.target.value)}>{["daily","fixed","lifestyle","growth","other"].map(g=><option key={g} value={g}>{g}</option>)}</Select>)}
          {modal.type==="group"&&(<div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Expense Categories</div><div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:200,overflow:"auto"}}>{expCats.map(c=>{const checked=groupCats.includes(c.id);return(<label key={c.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"6px 0"}}><div onClick={()=>setGroupCats(checked?groupCats.filter(x=>x!==c.id):[...groupCats,c.id])} style={{width:18,height:18,borderRadius:4,border:`2px solid ${checked?C.accent:C.faint}`,background:checked?C.accentDim:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{checked&&<span style={{color:C.accent,fontSize:12}}>✓</span>}</div><span style={{color:C.text,fontSize:14}}>{ICONS[c.icon]||"📌"} {c.name}</span></label>);})}</div></div>)}
          <Btn full onClick={handleSave} style={{marginTop:8}}>Save</Btn>
        </Modal>
      )}
      {confirmDel&&<ConfirmModal title="Delete?" message="Are you sure? This cannot be undone." onClose={()=>setConfirmDel(null)} onConfirm={doDelete}/>}
    </div>
  );
}
