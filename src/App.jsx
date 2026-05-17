import { useState, useEffect, useCallback, useRef } from "react";

// ─── Palette & Global Helpers ──────────────────────────────────────────────────
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

const fmt = (n) => {
  const rounded = Math.round(n * 100) / 100;
  return new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: _currency, 
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2 
  }).format(rounded);
};

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const fmtDate = (d) => { const dt = new Date(d + "T00:00:00"); return `${DAYS[dt.getDay()]}: ${dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`; };
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

const KEYS = { txns:"et_txns", banks:"et_banks", expCats:"et_expCats", incCats:"et_incCats", groups:"et_groups", savings:"et_savings", currency:"et_currency", username:"et_username", lastBackup:"et_lastBackup", bills:"et_bills", budgets:"et_budgets", q_coffee:"et_q_coffee", q_ride:"et_q_ride" };
async function load(key, fallback) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; } }
async function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

// ─── Shared UI Components ──────────────────────────────────────────────────────
function Pill({ color, children, style }) { return <span style={{ background:color+"22", color, border:`1px solid ${color}44`, borderRadius:99, padding:"2px 10px", fontSize:11, fontWeight:700, letterSpacing:0.5, ...style }}>{children}</span>; }
function Card({ children, style }) { return <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:16, ...style }}>{children}</div>; }

function Modal({ title, onClose, children, center }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:100, display:"flex", alignItems:center?"center":"flex-end", justifyContent:"center", padding:center?"0 20px":"0" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:center?"20px":"20px 20px 0 0", width:"100%", maxWidth:520, maxHeight:"85vh", overflow:"auto", padding:24, animation:center?"popCenter 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)":"slideUp 0.3s ease-out" }}>
        <style>{`
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes popCenter { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        `}</style>
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
    <Modal title={title} onClose={onClose} center={false}>
      <p style={{ color:C.muted, marginBottom:20, lineHeight:1.6, fontSize:14 }}>{message}</p>
      <div style={{ display:"flex", gap:10 }}>
        <Btn outline color={C.muted} full onClick={onClose}>Cancel</Btn>
        <Btn color={confirmColor||C.red} full onClick={onConfirm}>Confirm</Btn>
      </div>
    </Modal>
  );
}

function AlertModal({ title, message, onClose, btnColor=C.accent }) {
  return (
    <Modal title={title} onClose={onClose} center={true}>
      <p style={{ color:C.text, marginBottom:20, lineHeight:1.6, fontSize:14 }}>{message}</p>
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <Btn color={btnColor} onClick={onClose} style={{ minWidth:100 }}>Close</Btn>
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

function MonthSelect({ value, onChange, availMonths }) {
  const options = availMonths.length > 0 ? availMonths : [new Date().toISOString().slice(0,7)];
  return (
    <div style={{ position:"relative", display:"inline-block" }}>
      <select value={value} onChange={onChange} style={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, borderRadius:10, padding:"8px 32px 8px 12px", fontSize:13, fontWeight:600, outline:"none", appearance:"none", cursor:"pointer" }}>
        <option value="all">All Time</option>
        {options.map(m=>{const[y,mo]=m.split("-");return<option key={m} value={m}>{MONTHS[+mo-1]} {y}</option>;})}
      </select>
      <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:C.muted, fontSize:10, pointerEvents:"none" }}>▼</span>
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <div style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>{label}</div>}
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

// ─── Swipeable Row (With Magnetic Center Lock) ─────────────────────────
function SwipeRow({ onEdit, onDelete, children }) {
  const [slide, setSlide] = useState(0);
  const startX = useRef(null);
  const currentX = useRef(0);

  const handleTouchStart = (e) => { startX.current = e.touches[0].clientX; currentX.current = slide; };
  
  const handleTouchMove = (e) => {
    if (startX.current === null) return;
    const diff = e.touches[0].clientX - startX.current;
    let target = currentX.current + diff;

    if (currentX.current > 0 && target < 15) target = 0;
    if (currentX.current < 0 && target > -15) target = 0;

    if (target < 0) setSlide(Math.max(target, -85)); 
    else if (target > 0) setSlide(Math.min(target, 85)); 
    else setSlide(0);
  };
  
  const handleTouchEnd = () => {
    startX.current = null;
    if (slide < -45) setSlide(-85);
    else if (slide > 45) setSlide(85);
    else setSlide(0);
  };

  return (
    <div style={{ position:"relative", overflow:"hidden", borderRadius:12, marginBottom:8 }}>
      <div style={{ position:"absolute", inset:0, display:"flex", justifyContent:"space-between", zIndex:0 }}>
        <button onClick={()=>{setSlide(0); onEdit&&onEdit();}} style={{ width:85, background:C.blueDim, border:"none", color:C.blue, fontSize:14, fontWeight:700, cursor:"pointer" }}>✎ Edit</button>
        <button onClick={()=>{setSlide(0); onDelete&&onDelete();}} style={{ width:85, background:C.redDim, border:"none", color:C.red, fontSize:14, fontWeight:700, cursor:"pointer" }}>🗑 Delete</button>
      </div>
      <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
           style={{ transform:`translateX(${slide}px)`, transition:startX.current?"none":"transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1)", touchAction:"pan-y", background:C.card, border:`1px solid ${C.border}`, borderRadius:12, position:"relative", zIndex:1 }}>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div style={{ textAlign:"center", padding:"70px 20px", opacity:0.45 }}>
      <div style={{ fontSize:32, marginBottom:10, filter:"grayscale(100%) opacity(50%)" }}>{icon}</div>
      <div style={{ color:C.text, fontSize:14, fontWeight:500, letterSpacing:0.3, marginBottom:4 }}>Easy come, easy go.</div>
      <div style={{ color:C.muted, fontSize:12 }}>{message}</div>
    </div>
  );
}

// ─── Main Application Logic ───────────────────────────────────────────────────
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
  
  const [appAlert, setAppAlert] = useState(null);

  useEffect(() => {
    (async () => {
      const [t,b,ec,ic,g,s,cur,uname,bl,bdg,lb] = await Promise.all([
        load(KEYS.txns,[]), load(KEYS.banks,DEFAULT_BANKS), load(KEYS.expCats,DEFAULT_EXP_CATS),
        load(KEYS.incCats,DEFAULT_INC_CATS), load(KEYS.groups,DEFAULT_GROUPS), load(KEYS.savings,[]),
        load(KEYS.currency,"EGP"), load(KEYS.username,""), load(KEYS.bills,[]), load(KEYS.budgets,[]), load(KEYS.lastBackup, null)
      ]);
      setTxns(t); setBanks(b); setExpCats(ec); setIncCats(ic); setGroups(g); setSavings(s);
      setCurrencyState(cur); setCurrency(cur); setUsernameState(uname); setBills(bl); setBudgets(bdg); setLastBackup(lb);
      setFilterMonth(new Date().toISOString().slice(0,7));
      setReady(true);
    })();
  }, []);

  const persist = useCallback(async (key,val) => { await save(key,val); }, []);
  
  const bankBalance = useCallback((bankId) => {
    const inc=txns.filter(t=>t.bankId===bankId&&t.type==="income").reduce((a,t)=>a+t.amount,0);
    const exp=txns.filter(t=>t.bankId===bankId&&t.type==="expense").reduce((a,t)=>a+t.amount,0);
    const sav=txns.filter(t=>t.bankId===bankId&&t.type==="saving").reduce((a,t)=>a+t.amount,0);
    return inc-exp-sav;
  }, [txns]);

  const addTxn = async (t) => {
    if (t.type === "expense" || t.type === "saving") {
      const currentBal = bankBalance(t.bankId);
      if (currentBal < t.amount) {
        setAppAlert({ title: "Insufficient Balance", message: "⚠️ Sorry, this account balance is insufficient for this transaction!", color: C.red });
        return false;
      }
    }
    const next=[{...t,id:Date.now().toString()},...txns]; 
    setTxns(next); 
    await persist(KEYS.txns,next); 
    return next; 
  };
  
  const delTxn = async (id) => { const next=txns.filter(t=>t.id!==id); setTxns(next); await persist(KEYS.txns,next); return next; };
  
  const updateTxn = async (id,data) => {
    const original = txns.find(t=>t.id===id);
    if(data.amount && (original.type === "expense" || original.type === "saving")) {
      const netBalWithoutThis = bankBalance(data.bankId) + original.amount;
      if (netBalWithoutThis < data.amount) {
        setAppAlert({ title: "Insufficient Balance", message: "⚠️ Sorry, this account balance is insufficient for this modifications!", color: C.red });
        return false;
      }
    }
    const next=txns.map(t=>t.id===id?{...t,...data}:t); 
    setTxns(next); 
    await persist(KEYS.txns,next);
    return true;
  };
  
  const saveBanks = async (b) => { setBanks(b); await persist(KEYS.banks,b); };
  const saveExpCats = async (c) => { setExpCats(c); await persist(KEYS.expCats,c); };
  const saveIncCats = async (c) => { setIncCats(c); await persist(KEYS.incCats,c); };
  const saveGroups = async (g) => { setGroups(g); await persist(KEYS.groups,g); };
  const saveSavings = async (s) => { setSavings(s); await persist(KEYS.savings,s); };
  const saveBills = async (b) => { setBills(b); await persist(KEYS.bills,b); };
  const saveBudgets = async (bdg) => { setBudgets(bdg); await persist(KEYS.budgets,bdg); };
  const saveCurrencyHandler = async (c) => { setCurrencyState(c); setCurrency(c); await persist(KEYS.currency,c); };
  const saveUsernameHandler = async (n) => { setUsernameState(n); await persist(KEYS.username,n); };

  const handleRestorePayload = async (importedData) => {
    try {
      if(importedData.txns) { setTxns(importedData.txns); await persist(KEYS.txns, importedData.txns); }
      if(importedData.banks) { setBanks(importedData.banks); await persist(KEYS.banks, importedData.banks); }
      if(importedData.expCats) { setExpCats(importedData.expCats); await persist(KEYS.expCats, importedData.expCats); }
      if(importedData.incCats) { setIncCats(importedData.incCats); await persist(KEYS.incCats, importedData.incCats); }
      if(importedData.groups) { setGroups(importedData.groups); await persist(KEYS.groups, importedData.groups); }
      if(importedData.savings) { setSavings(importedData.savings); await persist(KEYS.savings, importedData.savings); }
      if(importedData.bills) { setBills(importedData.bills); await persist(KEYS.bills, importedData.bills); }
      if(importedData.budgets) { setBudgets(importedData.budgets); await persist(KEYS.budgets, importedData.budgets); }
      if(importedData.currency) { setCurrencyState(importedData.currency); setCurrency(importedData.currency); await persist(KEYS.currency, importedData.currency); }
      if(importedData.username) { setUsernameState(importedData.username); await persist(KEYS.username, importedData.username); }
      
      const now = Date.now();
      await save(KEYS.lastBackup, now);
      setLastBackup(now);
      
      setAppAlert({ title: "Restore Successful", message: "🔄 Vault ledger datasets synchronized and restored successfully!", color: C.accent });
    } catch {
      setAppAlert({ title: "Restore Failed", message: "❌ Invalid or corrupted backup file structure detected.", color: C.red });
    }
  };

  if (!ready) return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.accent,fontSize:28}}>◈</div></div>;

  const allCats=[...expCats,...incCats];
  const filteredTxns=filterMonth==="all"?txns:txns.filter(t=>t.date.startsWith(filterMonth));
  const availMonths=[...new Set(txns.map(t=>t.date.slice(0,7)))].sort().reverse();
  const showBackupAlert = lastBackup && (Date.now() - lastBackup > 3 * 24 * 60 * 60 * 1000);

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif",maxWidth:520,margin:"0 auto",paddingBottom:120, position:"relative"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet"/>
      
      {showBackupAlert && tab==="dashboard" && (
        <div style={{background:C.yellowDim, color:C.yellow, padding:"10px 16px", fontSize:12, fontWeight:700, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span>⚠️ It has been over 3 days since your last backup!</span>
          <button onClick={()=>setTab("settings")} style={{background:"transparent", border:`1px solid ${C.yellow}`, color:C.yellow, borderRadius:8, padding:"4px 8px", fontSize:10, cursor:"pointer"}}>Backup Now</button>
        </div>
      )}

      {tab==="dashboard" && <Dashboard txns={filteredTxns} bills={bills} budgets={budgets} banks={banks} groups={groups} expCats={expCats} savings={savings} filterMonth={filterMonth} setFilterMonth={setFilterMonth} availMonths={availMonths} username={username} bankBalance={bankBalance} txnsAll={txns}/>}
      {tab==="add" && <AddTransaction banks={banks} expCats={expCats} incCats={incCats} savings={savings} currency={currency} onAdd={addTxn} onSaveSavings={saveSavings} onDone={()=>setTab("dashboard")} bankBalance={bankBalance}/>}
      {tab==="history" && <History txns={txns} allCats={allCats} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} incCats={incCats} currency={currency} availMonths={availMonths}/>}
      {tab==="savings" && <SavingsPage savings={savings} onSave={saveSavings} txns={txns} onBack={()=>setTab("settings")}/>}
      {tab==="budgets" && <BudgetsPage budgets={budgets} expCats={expCats} onSave={saveBudgets} onBack={()=>setTab("settings")} currency={currency}/>}
      {tab==="monthly" && <MonthlyBills bills={bills} onSave={saveBills} banks={banks} expCats={expCats} onAddTxn={addTxn} delTxn={delTxn} bankBalance={bankBalance} currency={currency}/>}
      {tab==="settings" && <Settings banks={banks} expCats={expCats} incCats={incCats} groups={groups} onBanks={saveBanks} onExpCats={saveExpCats} onIncCats={saveIncCats} onGroups={saveGroups} currency={currency} onCurrency={saveCurrencyHandler} username={username} onUsername={saveUsernameHandler} bankBalance={bankBalance} onOpenSavings={()=>setTab("savings")} onOpenBudgets={()=>setTab("budgets")} setLastBackup={setLastBackup} txns={txns} bills={bills} savings={savings} budgets={budgets} onRestore={handleRestorePayload} setAppAlert={setAppAlert}/>}
      
      <BottomNav tab={tab} setTab={setTab} expCats={expCats} banks={banks} onAdd={addTxn} currency={currency} bankBalance={bankBalance} setAppAlert={setAppAlert} />
      
      {appAlert && <AlertModal title={appAlert.title} message={appAlert.message} btnColor={appAlert.color} onClose={()=>setAppAlert(null)} />}
    </div>
  );
}

// ─── Custom Responsive Bottom Nav Component (Vodafone Layout) ─────────────────
function BottomNav({ tab, setTab, expCats, banks, onAdd, currency, bankBalance, setAppAlert }) {
  const [showQuick, setShowQuick] = useState(false);
  const [quickForm, setQuickForm] = useState(null);
  const pressTimer = useRef(null);

  const handlePressStart = (e) => { e.preventDefault(); pressTimer.current = setTimeout(() => setShowQuick(true), 450); };
  const handlePressEnd = (e) => { e.preventDefault(); clearTimeout(pressTimer.current); if(!showQuick && !quickForm) setTab("add"); };

  const handleQuickSelect = async (catId) => {
    setShowQuick(false);
    const savedData = await load(catId === "coffee" ? KEYS.q_coffee : KEYS.q_ride, null);
    setQuickForm({
      catId,
      amount: savedData ? String(savedData.amount) : "50",
      bankId: savedData && banks.some(b=>b.id===savedData.bankId) ? savedData.bankId : (banks[0]?.id || ""),
      note: savedData ? savedData.note : ""
    });
  };

  const handleQuickSave = async () => {
    const parsedAmt = parseFloat(quickForm.amount);
    if(!quickForm.amount || isNaN(parsedAmt) || parsedAmt <= 0) return;
    
    const cat = expCats.find(c=>c.id===quickForm.catId);
    const bank = banks.find(b=>b.id===quickForm.bankId);
    
    const success = await onAdd({ 
      type:"expense", amount:parsedAmt, date:today(), 
      bankId:quickForm.bankId, bankName:bank?.name, 
      catId:quickForm.catId, catName:cat?.name, catIcon:cat?.icon, 
      note:quickForm.note 
    });

    if (success !== false) {
      await save(quickForm.catId === "coffee" ? KEYS.q_coffee : KEYS.q_ride, { amount: parsedAmt, bankId: quickForm.bankId, note: quickForm.note });
      setQuickForm(null); 
      setTab("dashboard");
    }
  };

  return (
    <>
      <nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:520, zIndex:50 }}>
        {/* Raised bar matching perfect heights and padding layouts with solid straight background */}
        <div style={{ position:"absolute", bottom:0, width:"100%", height:85, background:C.surface, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", padding:"0 12px" }}>
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"space-around", paddingRight:48, marginBottom:10 }}>
             <NavBtn id="dashboard" icon={ICONS.dashboard} label="Home" tab={tab} setTab={setTab} />
             <NavBtn id="monthly" icon={ICONS.bills_nav} label="Bills" tab={tab} setTab={setTab} />
          </div>
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"space-around", paddingLeft:48, marginBottom:10 }}>
             <NavBtn id="history" icon="☰" label="History" tab={tab} setTab={setTab} />
             <NavBtn id="settings" icon={ICONS.settings} label="Settings" tab={tab} setTab={setTab} />
          </div>
        </div>

        {/* Clean drop element cleanly blending with background theme without bounding borders */}
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", bottom:32, width:84, height:84, borderRadius:"50%", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <button onTouchStart={handlePressStart} onTouchEnd={handlePressEnd} onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={()=>clearTimeout(pressTimer.current)} onContextMenu={e=>e.preventDefault()}
                  style={{ width:68, height:68, borderRadius:"50%", background:C.accent, color:C.bg, fontSize:36, border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"transform 0.1s", userSelect:"none", WebkitUserSelect:"none" }}
                  onPointerDown={e=>e.currentTarget.style.transform="scale(0.9)"} onPointerUp={e=>e.currentTarget.style.transform="scale(1)"}>
            +
          </button>
        </div>
          
        {showQuick && (
          <div style={{ position:"absolute", bottom:126, left:"50%", transform:"translateX(-50%)", background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:12, display:"flex", gap:12, boxShadow:"0 12px 30px rgba(0,0,0,0.6)", animation:"popIn 0.2s" }}>
            <style>{`@keyframes popIn { from{opacity:0; transform:translate(-50%, 12px) scale(0.95);} to{opacity:1; transform:translate(-50%, 0) scale(1);} }`}</style>
            <button onClick={()=>handleQuickSelect("coffee")} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, width:74, height:74, color:C.text, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, cursor:"pointer" }}>
              <span style={{fontSize:26, display:"block", lineHeight:1}}>☕</span>
              <span style={{fontSize:11,fontWeight:700}}>Coffee</span>
            </button>
            <button onClick={()=>handleQuickSelect("transport")} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, width:74, height:74, color:C.text, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, cursor:"pointer" }}>
              <span style={{fontSize:26, display:"block", lineHeight:1}}>🚗</span>
              <span style={{fontSize:11,fontWeight:700}}>Ride</span>
            </button>
          </div>
        )}
      </nav>

      {quickForm && (
        <Modal title="Quick Insertion" onClose={()=>setQuickForm(null)} center={false}>
          <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:20, padding:"12px", background:C.card, borderRadius:12, border:`1px solid ${C.border}`}}>
            <span style={{fontSize:28}}>{quickForm.catId === "coffee" ? "☕" : "🚗"}</span>
            <span style={{fontSize:16, fontWeight:700, color:C.text}}>{quickForm.catId === "coffee" ? "Coffee & Soft Drinks" : "Transport & Logistics"}</span>
          </div>
          <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Amount ({currency})</div><input type="number" step="any" value={quickForm.amount} onChange={e=>setQuickForm({...quickForm, amount:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"}}/></div>
          <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Source Ledger</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{banks.map(b=><button key={b.id} onClick={()=>setQuickForm({...quickForm, bankId:b.id})} style={{padding:"8px 14px", borderRadius:10, border:`1px solid ${quickForm.bankId===b.id?C.accent:C.border}`, background:quickForm.bankId===b.id?C.accentDim:"transparent", color:quickForm.bankId===b.id?C.accent:C.text, fontWeight:600, fontSize:13, cursor:"pointer"}}>{b.name}</button>)}</div></div>
          <Input label="Annotation / Note" placeholder="e.g. Starbucks, Taxi..." value={quickForm.note} onChange={e=>setQuickForm({...quickForm, note:e.target.value})}/>
          <Btn full onClick={handleQuickSave}>Confirm Settlement</Btn>
        </Modal>
      )}
      {showQuick && <div onClick={()=>setShowQuick(false)} style={{position:"fixed", inset:0, zIndex:40}} />}
    </>
  );
}

function NavBtn({ id, icon, label, tab, setTab }) {
  const active = tab === id;
  return (
    <button onClick={()=>setTab(id)} style={{ background:"none", border:"none", color:active?C.accent:C.muted, display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"4px 0", cursor:"pointer", transition:"color .2s", width:55 }}>
      <span style={{fontSize:22}}>{icon}</span>
      <span style={{fontSize:10, fontWeight:700, letterSpacing:.5, textTransform:"uppercase"}}>{label}</span>
    </button>
  );
}

// ─── Dashboard Screen (With Savings Goals Lifted Upwards) ───────────────────
function Dashboard({ txns, bills, budgets, banks, groups, expCats, savings, filterMonth, setFilterMonth, availMonths, username, bankBalance, txnsAll }) {
  const [hideTotal, setHideTotal] = useState(false);

  const totalBalance = banks.reduce((s,b)=>s+bankBalance(b.id),0);
  const totalIncome = txns.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0);
  const totalExp = txns.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);

  const currentMonthStr = new Date().toISOString().slice(0,7);
  const isCurrentMonth = filterMonth === currentMonthStr || filterMonth === "all";
  
  const billsForMonth = isCurrentMonth ? currentMonthStr : filterMonth;
  const paidBillsCount = bills.filter(b=>b.payments?.some(p=>p.month===billsForMonth)).length;
  const totalBillsCount = bills.length;
  const remainingBillsAmount = bills.filter(b=>!b.payments?.some(p=>p.month===billsForMonth)).reduce((sum,b)=>sum+b.amount,0);

  const d = new Date();
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - d.getDate() + 1);

  return (
    <div style={{padding:"24px 16px 0"}}>
      {username && (
        <div style={{marginBottom:18}}>
          <div style={{color:C.muted,fontSize:13,fontWeight:500}}>{(()=> {const h=new Date().getHours(); const e=h<12?"☀️":h<18?"👋":"🌙"; const g=h<12?"Good morning":h<18?"Good afternoon":"Good evening"; return <>{e} {g},</>;})()}</div>
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

      {budgets.length > 0 && (
        <>
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Monthly Budgets</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
            {budgets.map(bdg => {
              const spent = txnsAll.filter(t => t.type === "expense" && t.date.startsWith(currentMonthStr) && bdg.cats.includes(t.catId)).reduce((a,t) => a+t.amount, 0);
              const remaining = Math.max(0, bdg.amount - spent);
              const safeDaily = remaining / daysLeft;
              return (
                <Card key={bdg.id} style={{padding:"14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}><div style={{width:8,height:8,borderRadius:99,background:C.accent}}/><span style={{color:C.text,fontSize:14,fontWeight:700}}>{bdg.name}</span></div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}>
                    <div>
                      <div style={{color:C.accent,fontSize:20,fontWeight:800,lineHeight:1}}>{hideTotal?"••••":fmt(remaining)}</div>
                      <div style={{color:C.muted,fontSize:11,fontWeight:500,marginTop:5}}>Safe Daily: {fmt(safeDaily)}</div>
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

      {/* Tweak 2: Savings Goals module lifted up precisely below Monthly Budgets */}
      {savings.length > 0 && (
        <>
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Savings Goals</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
            {savings.map(s => {
              const saved = s.contributions?.reduce((a,c)=>a+c.amount,0) || 0;
              const pct = s.goal ? Math.min(100, Math.round((saved/s.goal)*100)) : 0;
              return (
                <Card key={s.id} style={{padding:"14px 14px 12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{color:C.text,fontWeight:700,fontSize:14}}>🎯 {s.name}</span>
                    <Pill color={C.yellow}>{pct}%</Pill>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{color:C.yellow,fontSize:18,fontWeight:800}}>{hideTotal?"••••":fmt(saved)}</span>
                    <span style={{color:C.muted,fontSize:13}}>of {fmt(s.goal)}</span>
                  </div>
                  <ProgressBar value={saved} max={s.goal} color={C.yellow}/>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Expense Breakdown moved below Savings Goals */}
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

// ─── Add Transaction Screen ───────────────────────────────────────────────────
function AddTransaction({ banks, expCats, incCats, savings, currency, onAdd, onSaveSavings, onDone, bankBalance }) {
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
    const parsedAmt = parseFloat(amount);
    if(!amount||isNaN(parsedAmt)||parsedAmt<=0) return;
    const bank=banks.find(b=>b.id===bankId);
    
    if(type==="saving"){
      if(!savingId)return; const sv=savings.find(s=>s.id===savingId); if(!sv)return;
      const success = await onAdd({type:"saving",amount:parsedAmt,date,bankId,bankName:bank?.name,catName:sv.name,catIcon:"saving",note});
      if(success !== false) {
        const c={id:Date.now().toString(),amount:parsedAmt,date,bankId,bankName:bank?.name};
        await onSaveSavings(savings.map(s=>s.id===savingId?{...s,contributions:[...(s.contributions||[]),c]}:s));
        setAmount(""); setNote(""); onDone();
      }
    } else {
      const cat=cats.find(c=>c.id===catId);
      const success = await onAdd({type,amount:parsedAmt,date,bankId,bankName:bank?.name,catId,catName:cat?.name,catIcon:cat?.icon,note});
      if(success !== false) { setAmount(""); setNote(""); onDone(); }
    }
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
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Amount ({currency})</div>
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

// ─── History Screen ───────────────────────────────────────────────────────────
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
      {editTxn&&<EditTxnModal txn={editTxn} banks={banks} expCats={expCats} incCats={incCats} currency={currency} onSave={async(data)=>{const ok=await onUpdate(editTxn.id,data); if(ok)setEditTxn(null);}} onClose={()=>setEditTxn(null)}/>}
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
    const parsed = parseFloat(amount);
    if(!amount||isNaN(parsed)||parsed<=0) return;
    const bank=banks.find(b=>b.id===bankId); const cat=cats.find(c=>c.id===catId);
    await onSave({amount:parsed,date,bankId,bankName:bank?.name,catId,catName:cat?.name||txn.catName,catIcon:cat?.icon||txn.catIcon,note});
  };

  return (
    <Modal title="Edit Transaction" onClose={onClose} center={false}>
      <div style={{marginBottom:14}}>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Amount ({currency})</div>
        <input type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <Input label="Date" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      <Select label="Account" value={bankId} onChange={e=>setBankId(e.target.value)}>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select>
      {cats.length>0&&<Select label="Category" value={catId} onChange={e=>setCatId(e.target.value)}>{cats.map(c=><option key={c.id} value={c.id}>{ICONS[c.icon]||"📌"} {c.name}</option>)}</Select>}
      <Input label="Note (optional)" value={note} onChange={e=>setNote(e.target.value)}/>
      <Btn full onClick={handleSave}>Save Changes</Btn>
    </Modal>
  );
}

// ─── Savings Page ────────────────────────────────────────────────────────────
function SavingsPage({ savings, onSave, txns, onBack }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [editId, setEditId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const handleAdd=async()=>{
    if(!name||!goal)return;
    const parsedGoal = parseFloat(goal);
    if(editId){await onSave(savings.map(s=>s.id===editId?{...s,name,goal:parsedGoal}:s));setEditId(null);}
    else{await onSave([...savings,{id:Date.now().toString(),name,goal:parsedGoal,contributions:[]}]);}
    setName("");setGoal("");setShowAdd(false);
  };
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
      {savings.length===0&&<EmptyState icon="◎" message="No saving goals configured yet." />}
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
      {showAdd&&(<Modal title={editId?"Edit Goal":"New Saving Goal"} onClose={()=>{setShowAdd(false);setEditId(null);}} center={false}><Input label="Goal Name" placeholder="e.g. Travel Fund..." value={name} onChange={e=>setName(e.target.value)}/><Input label="Target Amount" type="number" step="any" value={goal} onChange={e=>setGoal(e.target.value)}/><Btn full onClick={handleAdd}>{editId?"Update Goal":"Create Goal"}</Btn></Modal>)}
      {confirmId&&<ConfirmModal title="Delete Goal?" message="This will permanently delete this saving goal." onClose={()=>setConfirmId(null)} onConfirm={async()=>{await onSave(savings.filter(s=>s.id!==confirmId));setConfirmId(null);}}/>}
    </div>
  );
}

// ─── Budgets Screen ───────────────────────────────────────────────────────────
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
    const parsedAmt = parseFloat(amount);
    if(editId) await onSave(budgets.map(b=>b.id===editId?{...b,name,amount:parsedAmt,cats:selectedCats}:b));
    else await onSave([...budgets,{id:Date.now().toString(),name,amount:parsedAmt,cats:selectedCats}]);
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
      {budgets.length===0&&<EmptyState icon="📊" message="Set custom budgeting categories for precise monthly guardrails." />}
      
      <div style={{display:"flex",flexDirection:"column"}}>
        {budgets.map(b=>(
          <SwipeRow key={b.id} onEdit={()=>startEdit(b)} onDelete={()=>setConfirmId(b.id)}>
            <div style={{padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{color:C.text,fontWeight:700,fontSize:17}}>{b.name}</div>
                <div style={{color:C.accent,fontSize:18,fontWeight:800}}>{fmt(b.amount)}</div>
              </div>
              <div style={{color:C.muted,fontSize:12,marginBottom:10}}>Monitoring {b.cats.length} expense nodes</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{b.cats.slice(0,5).map(cid=>{const cat=expCats.find(c=>c.id===cid);return cat?<span key={cid} style={{fontSize:16}}>{ICONS[cat.icon]}</span>:null;})}</div>
            </div>
          </SwipeRow>
        ))}
      </div>

      {showAdd&&(<Modal title={editId?"Modify Allocation":"Configure Budget Allocation"} onClose={()=>{setShowAdd(false);setEditId(null);}} center={false}>
        <Input label="Budget Descriptor" placeholder="e.g. Dining & Coffee Limits" value={name} onChange={e=>setName(e.target.value)}/>
        <Input label={`Monthly Ceiling Limit (${currency})`} type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)}/>
        <div style={{marginBottom:14}}>
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Target Categories Grouping</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:160,overflow:"auto",background:C.bg,padding:10,borderRadius:10,border:`1px solid ${C.border}`}}>
            {expCats.map(c=>{
              const checked=selectedCats.includes(c.id);
              return(
                <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"5px 0", userSelect:"none"}}>
                  <div onClick={()=>setSelectedCats(checked?selectedCats.filter(x=>x!==c.id):[...selectedCats,c.id])} style={{width:18,height:18,borderRadius:4,border:`2px solid ${checked?C.accent:C.faint}`,background:checked?C.accentDim:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{checked&&<span style={{color:C.accent,fontSize:12}}>✓</span>}</div>
                  <span style={{color:C.text,fontSize:14}}>{ICONS[c.icon]||"📌"} {c.name}</span>
                </label>
              );
            })}
          </div>
        </div>
        <Btn full onClick={handleAdd}>Commit Limit</Btn>
      </Modal>)}
      {confirmId&&<ConfirmModal title="Remove Envelope Budget?" message="This drops the limit tracking profile without dropping historical expenses." onClose={()=>setConfirmId(null)} onConfirm={async()=>{await onSave(budgets.filter(b=>b.id!==confirmId));setConfirmId(null);}}/>}
    </div>
  );
}

// ─── Monthly Bills Screen ─────────────────────────────────────────────────────
function MonthlyBills({ bills, onSave, banks, expCats, onAddTxn, delTxn, currency }) {
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
    const parsedAmt = parseFloat(amount);
    if(!name||!amount||isNaN(parsedAmt)||parsedAmt<=0)return;
    if(editItem) await onSave(bills.map(b=>b.id===editItem.id?{...b,name,amount:parsedAmt,bankId,catId}:b));
    else await onSave([...bills,{id:Date.now().toString(),name,amount:parsedAmt,bankId,catId,payments:[]}]);
    setShowAdd(false);setEditItem(null);setName("");setAmount("");
  };

  const handlePay=async(bill)=>{
    const bank=banks.find(b=>b.id===bill.bankId); const cat=expCats.find(c=>c.id===bill.catId);
    const txnId=Date.now().toString(); const dateStr=today();
    
    const success = await onAddTxn({
      type:"expense",amount:bill.amount,date:dateStr,
      bankId:bill.bankId,bankName:bank?.name,
      catId:bill.catId,catName:cat?.name||bill.name,catIcon:cat?.icon||"bills",
      note: `Monthly Bill Settlement: ${bill.name}`
    });

    if (success !== false) {
      await onSave(bills.map(b=>b.id===bill.id?{...b,payments:[...(b.payments||[]),{month:filterMonth,date:dateStr,txnId}]}:b));
    }
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
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
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
      
      {bills.length===0&&<EmptyState icon="📋" message="No recurrent fixed monthly bill items configured yet." />}
      <div style={{display:"flex",flexDirection:"column"}}>
        {bills.map(bill=>{
          const paid=isPaid(bill);
          const bank=banks.find(b=>b.id===bill.bankId); const cat=expCats.find(c=>c.id===bill.catId);
          const thisPay=bill.payments?.find(p=>p.month===filterMonth);
          return (
            <SwipeRow key={bill.id} onEdit={()=>openAdd(bill)} onDelete={()=>setConfirmDelete(bill.id)}>
              <div style={{padding:"14px", border:`1.5px solid ${paid?C.accent+"44":C.red+"44"}`, borderRadius:12, background:C.card}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{color:C.text,fontWeight:700,fontSize:15, display:"block", marginBottom:4}}>{bill.name}</span>
                    <div style={{color:C.muted,fontSize:12}}>{bank?.name} · {cat?.name||"Fixed Account"}</div>
                  </div>
                  <div style={{color:C.text,fontSize:17,fontWeight:800}}>{fmt(bill.amount)}</div>
                </div>
                {!paid?(
                  <button onClick={()=>handlePay(bill)} style={{width:"100%",background:C.redDim,border:`1px solid ${C.red}`,color:C.red,borderRadius:10,padding:"10px 0",fontWeight:700,fontSize:14,cursor:"pointer"}}>Pay Bill ❌</button>
                ):(
                  <button onClick={()=>setConfirmUndo(bill)} style={{width:"100%",background:C.accentDim,border:`1px solid ${C.accent}`,color:C.accent,borderRadius:10,padding:"10px 0",fontWeight:700,fontSize:14,cursor:"pointer"}}>Paid ✅ {thisPay?.date&&`(${thisPay.date.slice(5)})`}</button>
                )}
              </div>
            </SwipeRow>
          );
        })}
      </div>
      
      {showAdd&&(<Modal title={editItem?"Edit Bill":"New Monthly Bill"} onClose={()=>{setShowAdd(false);setEditItem(null);}} center={false}><Input label="Bill Name" value={name} onChange={e=>setName(e.target.value)}/><div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Amount ({currency})</div><input type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"}}/></div><Select label="Pay from Account" value={bankId} onChange={e=>setBankId(e.target.value)}>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select><Select label="Category" value={catId} onChange={e=>setCatId(e.target.value)}>{expCats.map(c=><option key={c.id} value={c.id}>{ICONS[c.icon]||"📌"} {c.name}</option>)}</Select><Btn full onClick={handleSave}>{editItem?"Update Bill":"Add Bill"}</Btn></Modal>)}
      {confirmDelete&&<ConfirmModal title="Delete Permanent Record?" message="Remove this from your monthly template cycle entirely?" onClose={()=>setConfirmDelete(null)} onConfirm={async()=>{await onSave(bills.filter(b=>b.id!==confirmDelete));setConfirmDelete(null);}}/>}
      {confirmUndo&&<ConfirmModal title="Revert Settlement status?" message={`This will flag "${confirmUndo.name}" as outstanding and automatically delete the ledger entry.`} confirmColor={C.yellow} onClose={()=>setConfirmUndo(null)} onConfirm={handleUndoConfirm}/>}
    </div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────
function Settings({ banks, expCats, incCats, groups, onBanks, onExpCats, onIncCats, onGroups, currency, onCurrency, username, onUsername, bankBalance, onOpenSavings, onOpenBudgets, setLastBackup, txns, bills, savings, budgets, onRestore, setAppAlert }) {
  const [section, setSection] = useState("profile");
  const [modal, setModal] = useState(null);
  const [inputName, setInputName] = useState("");
  const [inputColor, setInputColor] = useState(C.accent);
  const [inputGroup, setInputGroup] = useState("");
  const [inputIcon, setInputIcon] = useState("others");
  const [groupCats, setGroupCats] = useState([]);
  const [nameInput, setNameInput] = useState(username||"");
  const [confirmDel, setConfirmDel] = useState(null);
  
  const fileInputRef = useRef(null);

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
    a.download = "DeliveryDiary_Backup.json"; 
    a.click();
    const now = Date.now();
    await save(KEYS.lastBackup, now);
    setLastBackup(now);
    setAppAlert({ title: "Backup Complete", message: "🔄 Backup payload file saved! Check your Downloads folder.", color: C.accent });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        await onRestore(parsed);
      } catch {
        setAppAlert({ title: "Import Error", message: "❌ Failed parsing JSON file. Check payload validity.", color: C.red });
      }
    };
    reader.readAsText(file);
    e.target.value = ""; 
  };

  const canDelBank=(b)=>bankBalance(b.id)===0;
  const iconKeys=Object.keys(ICONS).filter(k=>!["dashboard","add","settings","saving","bills_nav","income","expense","transfer","close","check","trash","edit","bank","cash","goal", "budget"].includes(k));

  return (
    <div style={{padding:"24px 16px 0"}}>
      <div style={{color:C.text,fontSize:22,fontWeight:800,marginBottom:16}}>Settings</div>
      <div style={{display:"flex",gap:8,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
        {[{id:"profile",label:"👤 General"},{id:"currency",label:"💱 Currency"},{id:"banks",label:"🏦 Accounts"},{id:"expCats",label:"📤 Exp. Cat."}].map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)} style={{whiteSpace:"nowrap",padding:"8px 14px",borderRadius:10,border:`1px solid ${section===s.id?C.accent:C.border}`,background:section===s.id?C.accentDim:"transparent",color:section===s.id?C.accent:C.muted,fontWeight:700,fontSize:12,cursor:"pointer"}}>{s.label}</button>
        ))}
      </div>

      {section==="profile"&&(
        <div>
          <div onClick={onOpenSavings} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18,color:C.yellow}}>◎</span><span style={{color:C.text,fontWeight:600,fontSize:14}}>Savings Goals Setup</span></div><span style={{color:C.muted}}>❯</span></div>
          <div onClick={onOpenBudgets} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18,color:C.accent}}>📊</span><span style={{color:C.text,fontWeight:600,fontSize:14}}>Monthly Budgets Controls</span></div><span style={{color:C.muted}}>❯</span></div>
          
          <Card style={{marginBottom:16}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Profile Username</div><input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Enter name..." style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:12}}/><Btn full onClick={()=>{onUsername(nameInput.trim());alert("Username configuration updated!");}}>Commit Name</Btn></Card>
          
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Vault Ledger Backups</div>
          <Card style={{marginBottom:16}}>
            <p style={{color:C.muted, fontSize:12, marginBottom:14, lineHeight:1.4}}>Download backup payload files locally or restore previous metrics ledger logs data directly.</p>
            
            {/* Split Symmetric Horizontal Layout Box Container for Action Triggers */}
            <div style={{ display:"flex", gap:10, width:"100%" }}>
              <Btn style={{ flex:1, whiteSpace:"nowrap", padding:"11px 5px" }} onClick={handleBackup} color={C.blue}>⬇️ Backup</Btn>
              <Btn style={{ flex:1, whiteSpace:"nowrap", padding:"11px 5px" }} onClick={()=>fileInputRef.current.click()} color={C.purple} outline>⬆️ Restore</Btn>
            </div>
            
            <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileChange} style={{ display:"none" }} />
          </Card>
        </div>
      )}

      {section==="currency"&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>{CURRENCIES.map(cur=>(<button key={cur.code} onClick={()=>onCurrency(cur.code)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:currency===cur.code?C.accentDim:C.card,border:`1.5px solid ${currency===cur.code?C.accent:C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",textAlign:"left"}}><div><div style={{color:currency===cur.code?C.accent:C.text,fontWeight:700,fontSize:15}}>{cur.code}</div><div style={{color:C.muted,fontSize:12,marginTop:2}}>{cur.name}</div></div>{currency===cur.code&&<span style={{color:C.accent,fontSize:20}}>✓</span>}</button>))}</div>)}
      {section==="banks"&&(<><div style={{display:"flex",flexDirection:"column"}}>{banks.map(b=>(
        <SwipeRow key={b.id} onEdit={()=>openAdd("bank",b)} onDelete={()=>canDelBank(b)?setConfirmDel({type:"bank",item:b}):alert("Clear balance statement fully first.")}>
          <div style={{display:"flex",alignItems:"center",padding:"14px 16px"}}><div style={{width:10,height:10,borderRadius:99,background:b.color,marginRight:10}}/><span style={{color:C.text,fontWeight:600,fontSize:14}}>{b.name}</span></div>
        </SwipeRow>
      ))}</div><Btn outline full onClick={()=>openAdd("bank")}>+ Add Account Node</Btn></>)}
      {section==="expCats"&&(<><div style={{display:"flex",flexDirection:"column"}}>{expCats.map(c=>(
        <SwipeRow key={c.id} onEdit={()=>openAdd("expCat",c)} onDelete={()=>setConfirmDel({type:"expCat",item:c})}>
          <div style={{display:"flex",alignItems:"center",padding:"14px 16px"}}><span style={{fontSize:18,marginRight:10}}>{ICONS[c.icon]||"📌"}</span><span style={{color:C.text,fontWeight:600,fontSize:14}}>{c.name}</span></div>
        </SwipeRow>
      ))}</div><Btn outline full onClick={()=>openAdd("expCat")}>+ Add Expense Node</Btn></>)}

      {modal&&(
        <Modal title={`${modal.item?"Modify":"Append"} ${modal.type}`} onClose={()=>setModal(null)} center={false}>
          <Input label="Label Name" value={inputName} onChange={e=>setInputName(e.target.value)}/>
          {modal.type==="bank"&&(<div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Hex Tone Color</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[C.accent,C.red,C.blue,C.yellow,C.purple,"#fb923c","#34d399","#f472b6"].map(col=>(<button key={col} onClick={()=>setInputColor(col)} style={{width:28,height:28,borderRadius:99,background:col,border:inputColor===col?"3px solid white":"3px solid transparent",cursor:"pointer"}}/>))}</div></div>)}
          {modal.type==="expCat"&&(<div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>System Glyphs Icon</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{iconKeys.map(k=><button key={k} onClick={()=>setInputIcon(k)} style={{width:36,height:36,borderRadius:8,background:inputIcon===k?C.accentDim:C.bg,border:`1px solid ${inputIcon===k?C.accent:C.border}`,cursor:"pointer",fontSize:18}}>{ICONS[k]}</button>)}</div></div>)}
          {modal.type==="expCat"&&(<Select label="Group Allocation Tag" value={inputGroup} onChange={e=>setInputGroup(e.target.value)}>{["daily","fixed","lifestyle"].map(g=><option key={g} value={g}>{g}</option>)}</Select>)}
          <Btn full onClick={handleSave} style={{marginTop:8}}>Commit Settings</Btn>
        </Modal>
      )}
      {confirmDel&&<ConfirmModal title="Confirm Drop Operation?" message="Are you absolutely sure? Associated tracking nodes might mismatch." onClose={()=>setConfirmDel(null)} onConfirm={doDelete}/>}
    </div>
  );
}
