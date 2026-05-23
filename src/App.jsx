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
  parking:"🅿️", fuel:"⛽", car_repair:"🔧", takeaway:"🍕",
  barber:"💈", pets:"🐾", travel:"✈️", gaming:"🎮",
  pharmacy:"💊", laundry:"🧺", tuition:"🎓", gym:"🏋️",
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

const DEFAULT_QUICK_ACTIONS = [
  { id: "q1", catId: "coffee", amount: "50", bankId: "b3" },
  { id: "q2", catId: "transport", amount: "50", bankId: "b3" },
  { id: "q3", catId: "", amount: "", bankId: "" },
  { id: "q4", catId: "", amount: "", bankId: "" }
];

const KEYS = { 
  txns:"et_txns", banks:"et_banks", expCats:"et_expCats", incCats:"et_incCats", 
  groups:"et_groups", savings:"et_savings", currency:"et_currency", 
  username:"et_username", lastBackup:"et_lastBackup", bills:"et_bills", 
  budgets:"et_budgets", quickActions: "et_quick_actions"
};

async function load(key, fallback) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; } }
async function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

// ─── Shared UI Components ──────────────────────────────────────────────────────
function Pill({ color, children, style }) { return <span style={{ background:color+"22", color, border:`1px solid ${color}44`, borderRadius:99, padding:"2px 10px", fontSize:11, fontWeight:700, letterSpacing:0.5, ...style }}>{children}</span>; }
function Card({ children, style, ...props }) { return <div {...props} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:16, ...style }}>{children}</div>; }

function Modal({ title, onClose, children, center }) {
  const alignVal = center ? "center" : "flex-end";
  const radiusVal = center ? "20px" : "20px 20px 0 0";
  const animVal = center ? "popCenter 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)" : "slideUp 0.3s ease-out";
  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:100, display:"flex", alignItems:alignVal, justifyContent:"center", padding:center?"0 20px":"0" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:radiusVal, width:"100%", maxWidth:520, maxHeight:"85vh", overflow:"auto", padding:24, animation:animVal }}>
        <style>{`
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes popCenter { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        `}</style>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:18, margin:0, padding:0 }}>{title}</span>
          <button onClick={onClose} style={{ background:C.border, border:"none", color:C.muted, width:38, height:38, borderRadius:99, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", padding:0, margin:0 }}>✕</button>
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

// ─── Native Magnetic Swipe Engine (Universal - Replaces SwipeRow) ──────────────
let globalActiveSwipeClose = null;

function SwipeRow({ onEdit, onDelete, children }) {
  const [slide, setSlide] = useState(0);
  const rowRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  
  const isHorizontal = useRef(false);
  const isVertical = useRef(false);

  const closeSwipe = useCallback(() => {
    setSlide(0);
    currentX.current = 0;
    if (rowRef.current) {
      rowRef.current.style.transform = `translateX(0px)`;
      rowRef.current.style.transition = "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.15)";
    }
    if (globalActiveSwipeClose === closeSwipe) globalActiveSwipeClose = null;
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    const handleTouchStart = (e) => {
      // Auto-close any other open card magnetically
      if (globalActiveSwipeClose && globalActiveSwipeClose !== closeSwipe) {
        globalActiveSwipeClose();
      }

      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      currentX.current = slide;
      
      isHorizontal.current = false;
      isVertical.current = false;
      el.style.transition = "none"; // Remove animation during raw drag
    };

    const handleTouchMove = (e) => {
      // 1. Strict Axis Lock: If scrolling vertically, X is dead
      if (isVertical.current) return;

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const diffX = touchX - startX.current;
      const diffY = Math.abs(touchY - startY.current);

      // 2. Determine Intent once per touch
      if (!isHorizontal.current) {
        if (diffY > Math.abs(diffX) && diffY > 3) {
          isVertical.current = true;
          return;
        }
        if (Math.abs(diffX) > 10 && Math.abs(diffX) > diffY) {
          isHorizontal.current = true;
        }
      }

      // 3. Horizontal Drag Execution + Scroll Kill
      if (isHorizontal.current) {
        e.preventDefault(); // NATIVE KILL: Destroys browser vertical scroll
        let target = currentX.current + diffX;
        
        // Elastic resistance boundaries
        if (target < -95) target = -95;
        if (target > 95) target = 95;
        
        el.style.transform = `translateX(${target}px)`;
        setSlide(target);
      }
    };

    const handleTouchEnd = () => {
      if (isVertical.current) return;

      el.style.transition = "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.15)"; // Magnetic Spring Effect

      // Magnetic Anchor Points Threshold
      if (slide < -35) {
        setSlide(-85);
        currentX.current = -85;
        el.style.transform = `translateX(-85px)`;
        globalActiveSwipeClose = closeSwipe;
      } else if (slide > 35) {
        setSlide(85);
        currentX.current = 85;
        el.style.transform = `translateX(85px)`;
        globalActiveSwipeClose = closeSwipe;
      } else {
        setSlide(0);
        currentX.current = 0;
        el.style.transform = `translateX(0px)`;
        if (globalActiveSwipeClose === closeSwipe) globalActiveSwipeClose = null;
      }
    };

    // Passive: false is the core secret to locking scroll
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [slide, closeSwipe]);

  return (
    <div style={{ position:"relative", overflow:"hidden", borderRadius:12, marginBottom:8, userSelect:"none", WebkitUserSelect:"none" }}>
      <div style={{ position:"absolute", inset:0, display:"flex", justifyContent:"space-between", zIndex:0 }}>
        <button onClick={()=>{closeSwipe(); onEdit&&onEdit();}} style={{ width:85, background:C.blueDim, border:"none", color:C.blue, fontSize:14, fontWeight:700, cursor:"pointer" }}>✎ Edit</button>
        <button onClick={()=>{closeSwipe(); onDelete&&onDelete();}} style={{ width:85, background:C.redDim, border:"none", color:C.red, fontSize:14, fontWeight:700, cursor:"pointer" }}>🗑 Delete</button>
      </div>
      <div ref={rowRef}
           style={{ touchAction: slide !== 0 ? "none" : "pan-y", background:C.card, border:`1px solid ${C.border}`, borderRadius:12, position:"relative", zIndex:1, width:"100%", boxSizing:"border-box" }}>
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

// ─── Splash Screen ────────────────────────────────────────────────────────────
function SplashScreen() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div style={{position:"fixed",inset:0,zIndex:999,background:"#1c1f26",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",opacity:phase===2?0:1,transition:phase===2?"opacity 0.7s ease":"none",userSelect:"none"}}>
      <style>{`
        @keyframes logoIn{0%{transform:scale(0.3) rotate(-10deg);opacity:0}65%{transform:scale(1.08) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0deg);opacity:1}}
        @keyframes arrowIn{0%{opacity:0;transform:translate(-6px,6px)}100%{opacity:1;transform:translate(0,0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:0.25}40%{transform:translateY(-7px);opacity:1}}
      `}</style>
      {/* Logo */}
      <div style={{animation:"logoIn 0.9s cubic-bezier(0.175,0.885,0.32,1.275) both",marginBottom:28}}>
        <svg width={120} height={120} viewBox="0 0 120 120">
          <rect width={120} height={120} rx={26} fill="#252830"/>
          {/* S letter */}
          <text x={22} y={88} fontFamily="Georgia,serif" fontSize={82} fontWeight="900" fill="#e8e8f0" letterSpacing={-2}>S</text>
          {/* Arrow */}
          <g style={{animation:"arrowIn 0.5s ease 0.8s both"}}>
            <line x1={62} y1={62} x2={88} y2={34} stroke="url(#ag)" strokeWidth={5} strokeLinecap="round"/>
            <polygon points="88,34 74,34 88,48" fill="#3d9e5f"/>
            <defs><linearGradient id="ag" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#2d7a48"/><stop offset="100%" stopColor="#4ade80"/></linearGradient></defs>
          </g>
        </svg>
      </div>
      {/* App name */}
      <div style={{color:"#e8e8f0",fontSize:34,fontWeight:800,letterSpacing:8,textTransform:"uppercase",marginBottom:8,animation:"logoIn 0.9s 0.1s both"}}>SAVER</div>
      {/* Tagline */}
      <div style={{color:"#8888a8",fontSize:13,fontWeight:400,letterSpacing:2,fontStyle:"italic",opacity:phase>=1?1:0,animation:phase>=1?"fadeUp 0.6s ease forwards":"none",marginBottom:70}}>Easy come, easy go.</div>
      {/* Dots */}
      <div style={{display:"flex",gap:7,position:"absolute",bottom:54}}>
        {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:99,background:"#6ee7b7",animation:`bounce 1.3s ease ${i*0.22}s infinite`}}/>)}
      </div>
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
  const [quickActions, setQuickActions] = useState(DEFAULT_QUICK_ACTIONS);
  const [ready, setReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [filterMonth, setFilterMonth] = useState("all");
  const [currency, setCurrencyState] = useState("EGP");
  const [username, setUsernameState] = useState("");
  const [lastBackup, setLastBackup] = useState(null);
  
  const [appAlert, setAppAlert] = useState(null);

  const [hideTotal, setHideTotal] = useState(true);
  const [dashScrollY, setDashScrollY] = useState(0);
  const [ledgerBank, setLedgerBank] = useState(null);
  const [ledgerGroup, setLedgerGroup] = useState(null);
  const [ledgerSaving, setLedgerSaving] = useState(null);
  const [ledgerBudget, setLedgerBudget] = useState(null);

  useEffect(() => {
    (async () => {
      const [t,b,ec,ic,g,s,cur,uname,bl,bdg,lb,qa] = await Promise.all([
        load(KEYS.txns,[]), load(KEYS.banks,DEFAULT_BANKS), load(KEYS.expCats,DEFAULT_EXP_CATS),
        load(KEYS.incCats,DEFAULT_INC_CATS), load(KEYS.groups,DEFAULT_GROUPS), load(KEYS.savings,[]),
        load(KEYS.currency,"EGP"), load(KEYS.username,""), load(KEYS.bills,[]), load(KEYS.budgets,[]), 
        load(KEYS.lastBackup, null), load(KEYS.quickActions, DEFAULT_QUICK_ACTIONS)
      ]);
      setTxns(t); setBanks(b); setExpCats(ec); setIncCats(ic); setGroups(g); setSavings(s);
      setCurrencyState(cur); setCurrency(cur); setUsernameState(uname); setBills(bl); setBudgets(bdg); setLastBackup(lb);
      setQuickActions(qa);
      const curMonth = new Date().toISOString().slice(0,7);
      const hasCurMonth = t.some(tx => tx.date.startsWith(curMonth));
      setFilterMonth(hasCurMonth ? curMonth : "all");
      setReady(true);
      setTimeout(() => setShowSplash(false), 2700);
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
    const generatedId = Date.now().toString();
    const next=[{...t,id:generatedId},...txns]; 
    setTxns(next); 
    await persist(KEYS.txns,next); 
    return generatedId; 
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
  const saveQuickActions = async (qa) => { setQuickActions(qa); await persist(KEYS.quickActions, qa); };
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
      if(importedData.quickActions) { setQuickActions(importedData.quickActions); await persist(KEYS.quickActions, importedData.quickActions); }
      if(importedData.currency) { setCurrencyState(importedData.currency); setCurrency(importedData.currency); await persist(KEYS.currency, importedData.currency); }
      if(importedData.username) { setUsernameState(importedData.username); await persist(KEYS.username, importedData.username); }
      
      const now = Date.now();
      await save(KEYS.lastBackup, now);
      setLastBackup(now);
      
      setAppAlert({ title: "Restore Successful", message: "🔄 Backup restored successfully! ✅", color: C.accent });
    } catch {
      setAppAlert({ title: "Restore Failed", message: "❌ Invalid or corrupted backup file structure detected.", color: C.red });
    }
  };

  if (showSplash) return <SplashScreen />;

  const allCats=[...expCats,...incCats];
  const filteredTxns=filterMonth==="all"?txns:txns.filter(t=>t.date.startsWith(filterMonth));
  const availMonths=[...new Set(txns.map(t=>t.date.slice(0,7)))].sort().reverse();
  const showBackupAlert = lastBackup && (Date.now() - lastBackup > 3 * 24 * 60 * 60 * 1000);

  const isSubPageActive = ledgerBank || ledgerGroup || ledgerSaving || ledgerBudget || tab === "savings" || tab === "budgets" || tab === "quickactions";

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif",maxWidth:520,margin:"0 auto",paddingBottom:isSubPageActive?0:130, position:"relative", userSelect:"none", WebkitUserSelect:"none"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet"/>
      
      {showBackupAlert && tab==="dashboard" && !isSubPageActive && (
        <div style={{background:C.yellowDim, color:C.yellow, padding:"10px 16px", fontSize:12, fontWeight:700, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span>⚠️ It has been over 3 days since your last backup!</span>
          <button onClick={()=>setTab("settings")} style={{background:"transparent", border:`1px solid ${C.yellow}`, color:C.yellow, borderRadius:8, padding:"4px 8px", fontSize:10, cursor:"pointer"}}>Backup Now</button>
        </div>
      )}

      {!ledgerBank && !ledgerGroup && !ledgerSaving && !ledgerBudget ? (
        <>
          {tab==="dashboard" && <Dashboard txns={filteredTxns} bills={bills} budgets={budgets} banks={banks} groups={groups} expCats={expCats} savings={savings} filterMonth={filterMonth} setFilterMonth={setFilterMonth} availMonths={availMonths} username={username} bankBalance={bankBalance} txnsAll={txns} onDeleteTxn={delTxn} onUpdateTxn={updateTxn} onOpenBank={(b)=>{ setDashScrollY(window.scrollY); setLedgerBank(b); }} onOpenGroup={(g)=>{ setDashScrollY(window.scrollY); setLedgerGroup(g); }} onOpenSaving={(s)=>{ setDashScrollY(window.scrollY); setLedgerSaving(s); }} onOpenBudget={(bdg)=>{ setDashScrollY(window.scrollY); setLedgerBudget(bdg); }} hideTotal={hideTotal} setHideTotal={setHideTotal} />}
          {tab==="add" && <AddTransaction banks={banks} expCats={expCats} incCats={incCats} savings={savings} currency={currency} onAdd={addTxn} onSaveSavings={saveSavings} onDone={()=>setTab("dashboard")} bankBalance={bankBalance}/>}
          {tab==="history" && <History txns={txns} allCats={allCats} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} incCats={incCats} currency={currency} availMonths={availMonths}/>}
          
          {tab==="savings" && <SavingsPage savings={savings} onSave={saveSavings} txns={txns} onBack={()=>setTab("settings")}/>}
          {tab==="budgets" && <BudgetsPage budgets={budgets} expCats={expCats} onSave={saveBudgets} onBack={()=>setTab("settings")} currency={currency}/>}
          {tab==="quickactions" && <QuickActionsSetup quickActions={quickActions} expCats={expCats} banks={banks} onSave={saveQuickActions} onBack={()=>setTab("settings")} />}
          
          {tab==="monthly" && <MonthlyBills bills={bills} onSave={saveBills} banks={banks} expCats={expCats} onAddTxn={addTxn} delTxn={delTxn} bankBalance={bankBalance} currency={currency} setAppAlert={setAppAlert}/>}
          {tab==="settings" && <Settings banks={banks} expCats={expCats} incCats={incCats} groups={groups} onBanks={saveBanks} onExpCats={saveExpCats} onIncCats={saveIncCats} onGroups={saveGroups} currency={currency} onCurrency={saveCurrencyHandler} username={username} onUsername={saveUsernameHandler} bankBalance={bankBalance} onOpenSavings={()=>setTab("savings")} onOpenBudgets={()=>setTab("budgets")} onOpenQuickActions={()=>setTab("quickactions")} setLastBackup={setLastBackup} txns={txns} bills={bills} savings={savings} budgets={budgets} onRestore={handleRestorePayload} setAppAlert={setAppAlert}/>}
          
          <BottomNav tab={tab} setTab={setTab} expCats={expCats} banks={banks} onAdd={addTxn} currency={currency} bankBalance={bankBalance} setAppAlert={setAppAlert} quickActions={quickActions} />
        </>
      ) : (
        <>
          {ledgerBank && <DeepLedgerView title={ledgerBank.name} headerType="bank" headerData={{balance: bankBalance(ledgerBank.id)}} txns={txns.filter(t=>t.bankId===ledgerBank.id)} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} onClose={()=>{ setLedgerBank(null); setTimeout(()=>window.scrollTo(0,dashScrollY),50); }} />}
          {ledgerGroup && (()=>{ const spent=txns.filter(t=>t.type==="expense"&&ledgerGroup.cats.includes(t.catId)).reduce((a,t)=>a+t.amount,0); return <DeepLedgerView title={ledgerGroup.name} headerType="group" headerData={{spent, color:ledgerGroup.color}} txns={txns.filter(t=>t.type==="expense"&&ledgerGroup.cats.includes(t.catId))} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} onClose={()=>{ setLedgerGroup(null); setTimeout(()=>window.scrollTo(0,dashScrollY),50); }} />; })()}
          {ledgerSaving && (()=>{ const saved=txns.filter(t=>t.type==="saving"&&t.catName===ledgerSaving.name).reduce((a,t)=>a+t.amount,0); return <DeepLedgerView title={ledgerSaving.name} headerType="saving" headerData={{saved, goal:ledgerSaving.goal}} txns={txns.filter(t=>t.type==="saving"&&t.catName===ledgerSaving.name)} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} onClose={()=>{ setLedgerSaving(null); setTimeout(()=>window.scrollTo(0,dashScrollY),50); }} />; })()}
          {ledgerBudget && (()=>{ const spent=txns.filter(t=>t.type==="expense"&&ledgerBudget.cats.includes(t.catId)).reduce((a,t)=>a+t.amount,0); return <DeepLedgerView title={ledgerBudget.name} headerType="budget" headerData={{spent, limit:ledgerBudget.amount}} txns={txns.filter(t=>t.type==="expense"&&ledgerBudget.cats.includes(t.catId))} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} onClose={()=>{ setLedgerBudget(null); setTimeout(()=>window.scrollTo(0,dashScrollY),50); }} />; })()}
        </>
      )}
      
      {appAlert && <AlertModal title={appAlert.title} message={appAlert.message} btnColor={appAlert.color} onClose={()=>setAppAlert(null)} />}
    </div>
  );
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────
function BottomNav({ tab, setTab, expCats, banks, onAdd, currency, bankBalance, setAppAlert, quickActions }) {
  const [showQuick, setShowQuick] = useState(false);
  const [quickForm, setQuickForm] = useState(null);
  const pressTimer = useRef(null);
  // Remember last used amount & bank per shortcut
  const lastUsed = useRef({});

  const activeShortcuts = quickActions.filter(q => q.catId);

  const handlePressStart = (e) => { e.preventDefault(); pressTimer.current = setTimeout(() => setShowQuick(true), 450); };
  const handlePressEnd = (e) => { e.preventDefault(); clearTimeout(pressTimer.current); if(!showQuick && !quickForm) setTab("add"); };

  const handleQuickSelect = (shortcut) => {
    setShowQuick(false);
    // Use last used values if available, else use shortcut defaults
    const prev = lastUsed.current[shortcut.id] || {};
    setQuickForm({
      catId: shortcut.catId,
      shortcutId: shortcut.id,
      amount: prev.amount || shortcut.amount || "50",
      bankId: prev.bankId && banks.some(b=>b.id===prev.bankId) ? prev.bankId :
              shortcut.bankId && banks.some(b=>b.id===shortcut.bankId) ? shortcut.bankId : (banks[0]?.id || ""),
      note: ""
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
      // Save last used values for next time
      if (quickForm.shortcutId) {
        lastUsed.current[quickForm.shortcutId] = { amount: quickForm.amount, bankId: quickForm.bankId };
      }
      setQuickForm(null); 
      setTab("dashboard");
    }
  };

  return (
    <>
      <nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:520, zIndex:50 }}>
        <div style={{ position:"absolute", bottom:0, width:"100%", height:95, background:C.surface, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", padding:"0 12px" }}>
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"space-around", paddingRight:48, marginBottom:16 }}>
             <NavBtn id="dashboard" icon={ICONS.dashboard} label="Home" tab={tab} setTab={setTab} />
             <NavBtn id="monthly" icon={ICONS.bills_nav} label="Bills" tab={tab} setTab={setTab} />
          </div>
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"space-around", paddingLeft:48, marginBottom:16 }}>
             <NavBtn id="history" icon="☰" label="History" tab={tab} setTab={setTab} />
             <NavBtn id="settings" icon={ICONS.settings} label="Settings" tab={tab} setTab={setTab} />
          </div>
        </div>

        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", bottom:38, width:84, height:84, borderRadius:"50%", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <button onTouchStart={handlePressStart} onTouchEnd={handlePressEnd} onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={()=>clearTimeout(pressTimer.current)} onContextMenu={e=>e.preventDefault()}
                  style={{ width:68, height:68, borderRadius:"50%", background:C.accent, color:C.bg, fontSize:36, border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"transform 0.1s", userSelect:"none", WebkitUserSelect:"none" }}
                  onPointerDown={e=>e.currentTarget.style.transform="scale(0.9)"} onPointerUp={e=>e.currentTarget.style.transform="scale(1)"}>
            +
          </button>
        </div>
          
        {showQuick && activeShortcuts.length > 0 && (
          <div style={{ position:"fixed", bottom:135, left:"50%", transform:"translateX(-50%)", background:C.card, border:`1px solid ${C.border}`, borderRadius:24, padding:"12px", width: "auto", maxWidth: "90%", boxShadow:"0 12px 32px rgba(0,0,0,0.7)", animation:"popIn 0.15s cubic-bezier(0.1, 0.8, 0.2, 1.15)", zIndex: 60, display: "flex", justifyContent: "center" }}>
            <style>{`@keyframes popIn { from{opacity:0; transform:translate(-50%, 14px) scale(0.96);} to{opacity:1; transform:translate(-50%, 0) scale(1);} }`}</style>
            
            <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "nowrap" }}>
              {activeShortcuts.map(q => {
                const cat = expCats.find(c=>c.id===q.catId);
                return (
                  <button key={q.id} onClick={()=>handleQuickSelect(q)} 
                          style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, width:90, height:90, color:C.text, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, cursor:"pointer", padding:"4px", boxSizing:"border-box" }}>
                    <span style={{fontSize:26, display:"block", lineHeight:1, marginBottom: 1}}>{ICONS[cat?.icon]||"📌"}</span>
                    <span style={{fontSize:10, fontWeight:700, color: C.text, textAlign: "center", width: "100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{cat?.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {quickForm && (
        <Modal title="Quick Insertion" onClose={()=>setQuickForm(null)} center={false}>
          <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:20, padding:"12px", background:C.card, borderRadius:12, border:`1px solid ${C.border}`}}>
            <span style={{fontSize:28}}>{ICONS[expCats.find(c=>c.id===quickForm.catId)?.icon] || "📌"}</span>
            <span style={{fontSize:16, fontWeight:700, color:C.text}}>{expCats.find(c=>c.id===quickForm.catId)?.name}</span>
          </div>
          <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Amount ({currency})</div><input type="number" step="any" value={quickForm.amount} onChange={e=>setQuickForm({...quickForm, amount:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"}}/></div>
          <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Account</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{banks.map(b=><button key={b.id} onClick={()=>setQuickForm({...quickForm, bankId:b.id})} style={{padding:"8px 14px", borderRadius:10, border:`1px solid ${quickForm.bankId===b.id?C.accent:C.border}`, background:quickForm.bankId===b.id?C.accentDim:"transparent", color:quickForm.bankId===b.id?C.accent:C.text, fontWeight:600, fontSize:13, cursor:"pointer"}}>{b.name}</button>)}</div></div>
          <Input label="Note" placeholder="Add a note..." value={quickForm.note} onChange={e=>setQuickForm({...quickForm, note:e.target.value})}/>
          <Btn full onClick={handleQuickSave}>Save</Btn>
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

// ─── Dashboard Screen ────────────────────────────────────────────────────────
function Dashboard({ txns, bills, budgets, banks, groups, expCats, savings, filterMonth, setFilterMonth, availMonths, username, bankBalance, txnsAll, onDeleteTxn, onUpdateTxn, onOpenBank, onOpenGroup, onOpenSaving, onOpenBudget, hideTotal, setHideTotal }) {
  const [recentFilter, setRecentFilter] = useState("all");

  const totalBalance = banks.reduce((s,b)=>s+bankBalance(b.id),0);
  const totalIncome = txns.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0);
  const totalExp = txns.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);

  // Month-over-month comparison
  const currentMonthStr = new Date().toISOString().slice(0,7);
  const getPrevMonth = (m) => { const [y,mo]=m.split("-"); const d=new Date(+y,+mo-2,1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
  const prevMonth = filterMonth==="all" ? null : getPrevMonth(filterMonth);
  const prevTxns = prevMonth ? txnsAll.filter(t=>t.date.startsWith(prevMonth)) : [];
  const prevIncome = prevTxns.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0);
  const prevExp = prevTxns.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);
  const incomeDiff = prevIncome>0 ? Math.round(((totalIncome-prevIncome)/prevIncome)*100) : null;
  const expDiff = prevExp>0 ? Math.round(((totalExp-prevExp)/prevExp)*100) : null;
  const isCurrentMonth = filterMonth === currentMonthStr || filterMonth === "all";
  
  const billsForMonth = isCurrentMonth ? currentMonthStr : filterMonth;
  const paidBillsCount = bills.filter(b=>b.payments?.some(p=>p.month===billsForMonth)).length;
  const totalBillsCount = bills.length;
  const remainingBillsAmount = bills.filter(b=>!b.payments?.some(p=>p.month===billsForMonth)).reduce((sum,b)=>sum+b.amount,0);

  const d = new Date();
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - d.getDate() + 1);

  const recentsFiltered = txns.filter(t => {
    if (recentFilter === "expenses") return t.type === "expense";
    if (recentFilter === "income") return t.type === "income";
    return true;
  }).slice(0, 5);

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
            <div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Total Balance</div>
            <div style={{color:C.text,fontSize:30,fontWeight:800,letterSpacing:-1}}>{hideTotal?"••••••":fmt(totalBalance)}</div>
          </div>
          <button onClick={()=>setHideTotal(v=>!v)} style={{background:C.border,border:"none",color:C.muted,width:36,height:36,borderRadius:99,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>{hideTotal?"🙈":"🐵"}</button>
        </div>
      </Card>
      
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        {banks.map(b=>{
          const bal=bankBalance(b.id);
          return (
            <Card key={b.id} onClick={()=>onOpenBank(b)} 
                  className="interactive-card"
                  style={{padding:"14px 14px 12px", cursor: "pointer", transition: "transform 0.1s ease"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:99,background:b.color,flexShrink:0}}/><span style={{color:C.muted,fontSize:12,fontWeight:600}}>{b.name}</span></div>
                {b.lowBalanceThreshold && bal <= b.lowBalanceThreshold && bal >= 0 && <span style={{fontSize:14}} title="Low balance">⚠️</span>}
                {bal < 0 && <span style={{fontSize:14}} title="Negative balance">🔴</span>}
              </div>
              <div style={{color:bal<0?C.red:b.lowBalanceThreshold&&bal<=b.lowBalanceThreshold?C.yellow:C.text,fontSize:17,fontWeight:800}}>{hideTotal?"••••":fmt(bal)}</div>
            </Card>
          );
        })}
        <style>{`.interactive-card:active { transform: scale(0.97); opacity: 0.9; }`}</style>
      </div>
      
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        <Card style={{padding:"14px 14px 12px"}}>
          <div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Income</div>
          <div style={{color:C.accent,fontSize:20,fontWeight:800,marginBottom:4}}>{hideTotal?"••••":fmt(totalIncome)}</div>
          {incomeDiff!==null && !hideTotal && (
            <div style={{fontSize:10,fontWeight:700,color:incomeDiff>=0?C.accent:C.red}}>
              {incomeDiff>=0?"▲":"▼"} {Math.abs(incomeDiff)}% vs last month
            </div>
          )}
        </Card>
        <Card style={{padding:"14px 14px 12px"}}>
          <div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Expenses</div>
          <div style={{color:C.red,fontSize:20,fontWeight:800,marginBottom:4}}>{hideTotal?"••••":fmt(totalExp)}</div>
          {expDiff!==null && !hideTotal && (
            <div style={{fontSize:10,fontWeight:700,color:expDiff<=0?C.accent:C.red}}>
              {expDiff<=0?"▼":"▲"} {Math.abs(expDiff)}% vs last month
            </div>
          )}
        </Card>
      </div>

      {bills.length > 0 && (
        <>
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Monthly Bills</div>
          <Card style={{padding:"14px 14px 12px", marginBottom:20}}>
            {(()=>{
              const allPaid = paidBillsCount === totalBillsCount;
              const billColor = allPaid ? C.accent : C.red;
              return (<>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{color:C.text,fontWeight:700,fontSize:14}}>{allPaid?"✅":"⚡"} {allPaid?"All Bills Paid":"Upcoming Payments"}</span>
                  <Pill color={billColor}>{paidBillsCount}/{totalBillsCount} Paid</Pill>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{color:billColor,fontSize:18,fontWeight:800}}>{hideTotal?"••••":allPaid?fmt(0):fmt(remainingBillsAmount)}</span>
                  <span style={{color:C.muted,fontSize:13}}>{allPaid?"cleared ✓":"remaining"}</span>
                </div>
                <ProgressBar value={paidBillsCount} max={totalBillsCount} color={billColor}/>
              </>);
            })()}
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
              const pct = bdg.amount > 0 ? Math.min(100, Math.round((spent/bdg.amount)*100)) : 0;
              const barColor = pct >= 90 ? C.red : pct >= 70 ? C.yellow : C.accent;
              return (
                <Card key={bdg.id} onClick={()=>onOpenBudget(bdg)} className="interactive-card" style={{padding:"14px", cursor:"pointer", transition:"transform 0.1s ease"}}>
                  {/* Title + % pill */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{color:C.text,fontSize:14,fontWeight:700}}>{bdg.name}</span>
                    <Pill color={barColor}>{pct}%</Pill>
                  </div>
                  {/* Spent of budget */}
                  <div style={{color:C.muted,fontSize:11,marginBottom:6}}>
                    Spent <span style={{color:C.text,fontWeight:700}}>{hideTotal?"••••":fmt(spent)}</span> of {hideTotal?"••••":fmt(bdg.amount)}
                  </div>
                  {/* Remaining + safe daily */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{color:remaining===0?C.red:C.accent,fontSize:18,fontWeight:800}}>{hideTotal?"••••":fmt(remaining)} left</span>
                    <span style={{color:C.muted,fontSize:11}}>Daily Budget: {fmt(safeDaily)}</span>
                  </div>
                  <ProgressBar value={spent} max={bdg.amount} color={barColor}/>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {savings.length > 0 && (
        <>
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Savings Goals</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
            {savings.map(s => {
              const saved = s.contributions?.reduce((a,c)=>a+c.amount,0) || 0;
              const pct = s.goal ? Math.min(100, Math.round((saved/s.goal)*100)) : 0;
              return (
                <Card key={s.id} onClick={()=>onOpenSaving(s)} className="interactive-card"
                      style={{padding:"14px 14px 12px", cursor: "pointer", transition: "transform 0.1s ease"}}>
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

      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Spending</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        {groups.map(g=>{
          const total=txns.filter(t=>t.type==="expense"&&g.cats.includes(t.catId)).reduce((a,t)=>a+t.amount,0);
          if(!total) return null;
          const pct=totalExp?Math.round((total/totalExp)*100):0;
          return (
            <Card key={g.id} onClick={()=>onOpenGroup(g)} className="interactive-card"
                  style={{padding:"14px 14px 12px", cursor:"pointer", transition:"transform 0.1s ease"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><div style={{width:8,height:8,borderRadius:99,background:g.color}}/><span style={{color:C.muted,fontSize:12,fontWeight:600}}>{g.name}</span></div>
              <div style={{color:g.color,fontSize:17,fontWeight:800,marginBottom:6}}>{hideTotal?"••••":fmt(total)}</div>
              <ProgressBar value={total} max={totalExp} color={g.color}/>
              <div style={{color:C.faint,fontSize:10,fontWeight:700,marginTop:4}}>{pct}% of total</div>
            </Card>
          );
        })}
      </div>

      <div style={{marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Recent Transactions</div>
        <div style={{display:"flex", gap:4}}>
          {["all", "expenses", "income"].map(f => (
            <button key={f} onClick={()=>setRecentFilter(f)} style={{background:"none", border:"none", padding:"2px 6px", color:recentFilter===f?C.accent:C.muted, fontSize:10, fontWeight:700, cursor:"pointer", textTransform:"uppercase"}}>{f}</button>
          ))}
        </div>
      </div>
      {recentsFiltered.length > 0 ? (
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
          {recentsFiltered.map(t=><TxnRow key={t.id} txn={t} hideTotal={hideTotal}/>)}
        </div>
      ) : (
        <div style={{padding:"20px 0", textAlign:"center", color:C.faint, fontSize:12}}>No transaction matches.</div>
      )}
    </div>
  );
}

// ─── Clean Deep History View (No Swipe Back, Big X Perfectly Aligned) ─────────
function LedgerHeader({ type, data }) {
  if (!type || !data) return null;

  // BANK: big balance, green/red by value
  if (type === "bank") {
    const neg = data.balance < 0;
    return (
      <div style={{ marginBottom: 20, padding: "16px 18px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16 }}>
        <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Account Balance</div>
        <div style={{ color: neg ? C.red : C.accent, fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>{fmt(data.balance)}</div>
      </div>
    );
  }

  // GROUP: total spent, muted label
  if (type === "group") {
    return (
      <div style={{ marginBottom: 20, padding: "16px 18px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16 }}>
        <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Total Spent</div>
        <div style={{ color: data.color || C.purple, fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>{fmt(data.spent)}</div>
      </div>
    );
  }

  // SAVING: saved big green, goal muted, progress bar
  if (type === "saving") {
    const pct = data.goal > 0 ? Math.min(100, Math.round((data.saved / data.goal) * 100)) : 0;
    const left = Math.max(0, data.goal - data.saved);
    return (
      <div style={{ marginBottom: 20, padding: "16px 18px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Saved</div>
            <div style={{ color: C.yellow, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>{fmt(data.saved)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: C.faint, fontSize: 11, marginBottom: 4 }}>of {fmt(data.goal)}</div>
            <div style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>{fmt(left)} left</div>
          </div>
        </div>
        <ProgressBar value={data.saved} max={data.goal} color={C.yellow} />
        <div style={{ color: C.faint, fontSize: 10, fontWeight: 700, marginTop: 5, textAlign: "right" }}>{pct}% complete</div>
      </div>
    );
  }

  // BUDGET: spent red, remaining green, progress
  if (type === "budget") {
    const rem = Math.max(0, data.limit - data.spent);
    const pct = data.limit > 0 ? Math.min(100, Math.round((data.spent / data.limit) * 100)) : 0;
    const barColor = pct >= 90 ? C.red : pct >= 70 ? C.yellow : C.accent;
    return (
      <div style={{ marginBottom: 20, padding: "16px 18px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
          <div>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Spent</div>
            <div style={{ color: C.red, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>{fmt(data.spent)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: C.faint, fontSize: 11, marginBottom: 4 }}>of {fmt(data.limit)}</div>
            <div style={{ color: rem === 0 ? C.red : C.accent, fontSize: 15, fontWeight: 700 }}>{fmt(rem)} left</div>
          </div>
        </div>
        <ProgressBar value={data.spent} max={data.limit} color={barColor} />
        <div style={{ color: C.faint, fontSize: 10, fontWeight: 700, marginTop: 5, textAlign: "right" }}>{pct}% of budget used</div>
      </div>
    );
  }

  return null;
}

function DeepLedgerView({ title, headerType, headerData, txns, onDelete, onUpdate, banks, expCats, onClose }) {
  const [filter, setFilter] = useState("all");
  const [confirmId, setConfirmId] = useState(null);
  const [editTxn, setEditTxn] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const list = txns.filter(t => {
    if (filter === "in") return t.type === "income";
    if (filter === "out") return t.type === "expense" || t.type === "saving";
    return true;
  });

  return (
    <div style={{ padding: "24px 16px", minHeight: "100vh", background: C.bg, boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: C.text, fontWeight: 800, fontSize: 22 }}>{title}</span>
        <button onClick={onClose} style={{ background: C.card, border: `1px solid ${C.border}`, color: C.muted, width: 44, height: 44, borderRadius: 99, cursor: "pointer", fontSize: 20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✕</button>
      </div>

      <LedgerHeader type={headerType} data={headerData} />

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {["all", "in", "out"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${filter === f ? C.accent : C.border}`, background: filter === f ? C.accentDim : "transparent", color: filter === f ? C.accent : C.muted, fontWeight: 700, fontSize: 11, cursor: "pointer", textTransform: "uppercase" }}>{f}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {list.length === 0 && <div style={{ padding: "40px 0", textAlign: "center", color: C.faint, fontSize: 13 }}>No transactions found.</div>}
        {list.map(t => (
          <SwipeRow key={t.id} onEdit={() => setEditTxn(t)} onDelete={() => setConfirmId(t.id)}>
            <TxnRow txn={t} hideTotal={false} />
          </SwipeRow>
        ))}
      </div>

      {confirmId && <ConfirmModal title="Delete Transaction?" message="This drops the record and updates balances instantly." onClose={() => setConfirmId(null)} onConfirm={() => { onDelete(confirmId); setConfirmId(null); }} />}
      {editTxn && <EditTxnModal txn={editTxn} banks={banks} expCats={expCats} incCats={expCats} currency={_currency} onSave={async (data) => { const ok = await onUpdate(editTxn.id, data); if (ok) setEditTxn(null); }} onClose={() => setEditTxn(null)} />}
    </div>
  );
}

function TxnRow({ txn, hideTotal }) {
  const isExp=txn.type==="expense", isInc=txn.type==="income";
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px", background: C.card}}>
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
    if(!amount||isNaN(parsedAmt)||parsedAmt <= 0) return;
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
      <div style={{marginBottom:14}}>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Date</div>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box",colorScheme:"dark",WebkitAppearance:"none",appearance:"none",display:"block"}}/>
      </div>
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
      <div style={{marginBottom:14}}>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Date</div>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box",colorScheme:"dark"}}/>
      </div>
      <Select label="Account" value={bankId} onChange={e=>setBankId(e.target.value)}>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select>
      {cats.length>0&&<Select label="Category" value={catId} onChange={e=>setCatId(e.target.value)}>{cats.map(c=><option key={c.id} value={c.id}>{ICONS[c.icon]||"📌"} {c.name}</option>)}</Select>}
      <Input label="Note (optional)" value={note} onChange={e=>setNote(e.target.value)}/>
      <Btn full onClick={handleSave}>Save Changes</Btn>
    </Modal>
  );
}

// ─── Savings Page ─────────────────────────────────────────────────────────────
function SavingsPage({ savings, onSave, txns, onBack }) {
  useEffect(()=>{ window.scrollTo(0,0); },[]);
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
    <div style={{padding:"24px 16px", minHeight: "100vh", background: C.bg, boxSizing:"border-box"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={onBack} style={{background:"transparent", border:"none", color:C.muted, fontSize:22, cursor:"pointer", padding:"10px 15px 10px 0", display:"flex", alignItems:"center", marginRight: 4}}><span style={{display:"block", transform:"translateY(-1px)"}}>❮</span></button>
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
  useEffect(()=>{ window.scrollTo(0,0); },[]);
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
    <div style={{padding:"24px 16px", minHeight: "100vh", background: C.bg, boxSizing:"border-box"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={onBack} style={{background:"transparent", border:"none", color:C.muted, fontSize:22, cursor:"pointer", padding:"10px 15px 10px 0", display:"flex", alignItems:"center", marginRight: 4}}><span style={{display:"block", transform:"translateY(-1px)"}}>❮</span></button>
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

// ─── Quick Actions Slots ──────────────────────────────────────────────────────
function QuickActionsSetup({ quickActions, expCats, banks, onSave, onBack }) {
  useEffect(()=>{ window.scrollTo(0,0); },[]);
  const [editingId, setEditingId] = useState(null);
  const [catId, setCatId] = useState("");
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState("");

  const openConfigure = (q) => {
    setEditingId(q.id);
    setCatId(q.catId || (expCats[0]?.id || ""));
    setAmount(q.amount || "50");
    setBankId(q.bankId || (banks[0]?.id || ""));
  };

  const handleCommitShortcut = async () => {
    const updated = quickActions.map(q => {
      if (q.id === editingId) {
        return { ...q, catId, amount, bankId };
      }
      return q;
    });
    await onSave(updated);
    setEditingId(null);
  };

  const handleClearShortcut = async (id) => {
    const updated = quickActions.map(q => {
      if (q.id === id) {
        return { ...q, catId: "", amount: "", bankId: "" };
      }
      return q;
    });
    await onSave(updated);
  };

  return (
    <div style={{padding:"24px 16px", minHeight: "100vh", background: C.bg, boxSizing:"border-box"}}>
      <div style={{display:"flex",alignItems:"center",gap:8, marginBottom: 20}}>
        <button onClick={onBack} style={{background:"transparent", border:"none", color:C.muted, fontSize:22, cursor:"pointer", padding:"10px 15px 10px 0", display:"flex", alignItems:"center", marginRight: 4}}><span style={{display:"block", transform:"translateY(-1px)"}}>❮</span></button>
        <div style={{color:C.text,fontSize:22,fontWeight:800}}>Quick Actions Slots</div>
      </div>

      <p style={{color: C.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 18}}>Configure up to 4 responsive shortcuts available globally when long pressing the navigation action node.</p>
      
      <div style={{display:"flex", flexDirection:"column", gap:12}}>
        {quickActions.map((q, idx) => {
          const cat = expCats.find(c => c.id === q.catId);
          const bank = banks.find(b => b.id === q.bankId);
          return (
            <Card key={q.id} style={{padding: "14px 16px", display: "flex", justifyContent:"space-between", alignItems:"center"}}>
              <div>
                <div style={{color: C.text, fontWeight: 700, fontSize: 15}}>Slot #{idx + 1}: {cat ? `${ICONS[cat.icon]} ${cat.name}` : "Disabled / Empty"}</div>
                {cat && <div style={{color: C.muted, fontSize: 12, marginTop: 4}}>Amount: {fmt(parseFloat(q.amount))} · Ledger: {bank?.name}</div>}
              </div>
              <div style={{display: "flex", gap: 8}}>
                <Btn small onClick={()=>openConfigure(q)} color={C.blue} outline>Setup</Btn>
                {q.catId && <Btn small onClick={()=>handleClearShortcut(q.id)} color={C.red} outline style={{padding:"5px 10px"}}>✕</Btn>}
              </div>
            </Card>
          );
        })}
      </div>

      {editingId && (
        <Modal title="Configure Fast Shortcut Slot" onClose={()=>setEditingId(null)} center={false}>
          <Select label="Expense Category" value={catId} onChange={e=>setCatId(e.target.value)}>
            {expCats.map(c=><option key={c.id} value={c.id}>{ICONS[c.icon]} {c.name}</option>)}
          </Select>
          <Input label="Default Fixed Amount" type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)} />
          <Select label="Default Account Account" value={bankId} onChange={e=>setBankId(e.target.value)}>
            {banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Btn full onClick={handleCommitShortcut} style={{marginTop:8}}>Commit Shortcut Slot</Btn>
        </Modal>
      )}
    </div>
  );
}

// ─── Monthly Bills Screen ─────────────────────────────────────────────────────
function MonthlyBills({ bills, onSave, banks, expCats, onAddTxn, delTxn, currency, setAppAlert }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmUndo, setConfirmUndo] = useState(null); 
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState(banks[0]?.id||"");
  const [catId, setCatId] = useState(expCats[0]?.id||"");
  const [dueDay, setDueDay] = useState("1");
  const [reminderDays, setReminderDays] = useState("2");
  
  const defaultMonth = new Date().toISOString().slice(0,7);
  const [filterMonth, setFilterMonth] = useState(defaultMonth);
  const availMonths = [...new Set([...bills.flatMap(b=>b.payments?.map(p=>p.month)||[]), defaultMonth])].sort().reverse();

  const isPaid = (bill) => bill.payments?.some(p=>p.month === filterMonth);
  const getReminderStatus = (bill) => {
    if (!bill.dueDay) return null;
    const now = new Date(); const curM = now.toISOString().slice(0,7);
    if (isPaid(bill) || filterMonth !== curM) return null;
    const due = new Date(now.getFullYear(), now.getMonth(), bill.dueDay);
    const diff = Math.ceil((due - now)/(1000*60*60*24));
    if (diff < 0) return { overdue:true, days:Math.abs(diff) };
    if (diff <= (bill.reminderDays||2)) return { overdue:false, days:diff };
    return null;
  };

  const openAdd=(item=null)=>{setEditItem(item);setName(item?.name||"");setAmount(item?.amount?String(item.amount):"");setBankId(item?.bankId||banks[0]?.id||"");setCatId(item?.catId||expCats[0]?.id||"");setDueDay(item?.dueDay?String(item.dueDay):"1");setReminderDays(item?.reminderDays?String(item.reminderDays):"2");setShowAdd(true);};
  
  const handleSave=async()=>{
    const parsedAmt = parseFloat(amount);
    if(!name||!amount||isNaN(parsedAmt)||parsedAmt<=0)return;
    const dd=Math.min(28,Math.max(1,parseInt(dueDay)||1));
    const rd=Math.min(7,Math.max(0,parseInt(reminderDays)||2));
    if(editItem) await onSave(bills.map(b=>b.id===editItem.id?{...b,name,amount:parsedAmt,bankId,catId,dueDay:dd,reminderDays:rd}:b));
    else await onSave([...bills,{id:Date.now().toString(),name,amount:parsedAmt,bankId,catId,dueDay:dd,reminderDays:rd,payments:[]}]);
    setShowAdd(false);setEditItem(null);setName("");setAmount("");
  };

  const handlePay=async(bill)=>{
    const bank=banks.find(b=>b.id===bill.bankId); const cat=expCats.find(c=>c.id===bill.catId);
    const dateStr=today();
    
    const txnIdToken = await onAddTxn({
      type:"expense",amount:bill.amount,date:dateStr,
      bankId:bill.bankId,bankName:bank?.name,
      catId:bill.catId,catName:cat?.name||bill.name,catIcon:cat?.icon||"bills",
      note: `Monthly Bill: ${bill.name}`
    });

    if (txnIdToken !== false) {
      await onSave(bills.map(b=>b.id===bill.id?{...b,payments:[...(b.payments||[]),{month:filterMonth,date:dateStr,txnId:txnIdToken}]}:b));
    }
  };

  const handleUndoConfirm = async () => {
    if(!confirmUndo) return;
    const payment = confirmUndo.payments.find(p=>p.month === filterMonth);
    if(payment && payment.txnId) {
      await delTxn(payment.txnId); 
    }
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
      
      <div style={{display:"flex",flexDirection:"column",gap:0,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
        {bills.map((bill,idx)=>{
          const paid=isPaid(bill);
          const bank=banks.find(b=>b.id===bill.bankId); const cat=expCats.find(c=>c.id===bill.catId);
          const isLast=idx===bills.length-1;
          return (
            <SwipeRow key={bill.id} onEdit={()=>openAdd(bill)} onDelete={()=>setConfirmDelete(bill.id)}>
              <div style={{background:paid?C.accentDim+"55":C.card,boxSizing:"border-box",borderBottom:isLast?"none":`1px solid ${C.border}`}}>
                {/* Row 1: icon + name + amount */}
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px 6px"}}>
                  {/* Category icon circle */}
                  <div style={{width:36,height:36,borderRadius:99,background:paid?C.accentDim:C.border+"88",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                    {ICONS[cat?.icon]||"⚡"}
                  </div>
                  {/* Name + bank */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:C.text,fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bill.name}</div>
                    <div style={{color:C.muted,fontSize:11,marginTop:1}}>
                      {bank?.name} · {cat?.name||"Bills"}
                      {bill.dueDay?<span style={{color:C.faint}}> · Due {bill.dueDay}{bill.dueDay===1?"st":bill.dueDay===2?"nd":bill.dueDay===3?"rd":"th"}</span>:null}
                    </div>
                    {(()=>{const r=getReminderStatus(bill);return r?<div style={{color:r.overdue?C.red:C.yellow,fontSize:10,fontWeight:700,marginTop:3}}>{r.overdue?"🔴 Overdue by "+r.days+" day"+(r.days!==1?"s":""):"🟡 Due in "+r.days+" day"+(r.days!==1?"s":"")}</div>:null;})()}
                  </div>
                  {/* Amount */}
                  <div style={{color:paid?C.accent:C.red,fontSize:17,fontWeight:800,flexShrink:0}}>{fmt(bill.amount)}</div>
                </div>
                {/* Row 2: action buttons full width */}
                <div style={{padding:"0 14px 12px",display:"flex",gap:8}}>
                  {!paid ? (
                    <button onClick={()=>handlePay(bill)} style={{flex:1,background:C.accentDim,border:`1.5px solid ${C.accent}`,color:C.accent,borderRadius:10,height:44,fontWeight:800,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                      <span>✓</span> Pay Now
                    </button>
                  ) : (
                    <>
                      <div style={{flex:1,background:C.accent,color:C.bg,borderRadius:10,height:44,fontSize:14,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        ✓ Paid {filterMonth.slice(5)}
                      </div>
                      <button onClick={()=>setConfirmUndo(bill)} style={{flexShrink:0,background:C.yellowDim,border:`1.5px solid ${C.yellow}`,color:C.yellow,borderRadius:10,height:44,padding:"0 18px",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                        ⟲ Undo
                      </button>
                    </>
                  )}
                </div>
              </div>
            </SwipeRow>
          );
        })}
      </div>
      
      {showAdd&&(<Modal title={editItem?"Edit Bill":"New Monthly Bill"} onClose={()=>{setShowAdd(false);setEditItem(null);}} center={false}><Input label="Bill Name" value={name} onChange={e=>setName(e.target.value)}/><div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Amount ({currency})</div><input type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"}}/></div><Select label="Pay from Account" value={bankId} onChange={e=>setBankId(e.target.value)}>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select><Select label="Category" value={catId} onChange={e=>setCatId(e.target.value)}>{expCats.map(c=><option key={c.id} value={c.id}>{ICONS[c.icon]||"📌"} {c.name}</option>)}</Select>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
            <div><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Due Day</div><input type="number" min="1" max="28" value={dueDay} onChange={e=>setDueDay(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"}}/><div style={{color:C.faint,fontSize:10,marginTop:4}}>Day of month (1–28)</div></div>
            <div><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Remind Before</div><input type="number" min="0" max="7" value={reminderDays} onChange={e=>setReminderDays(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"}}/><div style={{color:C.faint,fontSize:10,marginTop:4}}>Days before due (0–7)</div></div>
          </div>
          <Btn full onClick={handleSave} style={{marginTop:12}}>{editItem?"Update Bill":"Add Bill"}</Btn></Modal>)}
      {confirmDelete&&<ConfirmModal title="Delete Permanent Record?" message="Remove this from your monthly template cycle entirely?" onClose={()=>setConfirmDelete(null)} onConfirm={async()=>{await onSave(bills.filter(b=>b.id!==confirmDelete));setConfirmDelete(null);}}/>}
      {confirmUndo&&<ConfirmModal title="Undo Payment?" message={`This will mark "${confirmUndo.name}" as unpaid and remove its transaction.`} confirmColor={C.yellow} onClose={()=>setConfirmUndo(null)} onConfirm={handleUndoConfirm}/>}
    </div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────
function Settings({ banks, expCats, incCats, groups, onBanks, onExpCats, onIncCats, onGroups, currency, onCurrency, username, onUsername, bankBalance, onOpenSavings, onOpenBudgets, onOpenQuickActions, setLastBackup, txns, bills, savings, budgets, onRestore, setAppAlert }) {
  const [section, setSection] = useState("profile");
  const [modal, setModal] = useState(null);
  const [inputName, setInputName] = useState("");
  const [inputColor, setInputColor] = useState(C.accent);
  const [inputGroup, setInputGroup] = useState("daily");
  const [inputIcon, setInputIcon] = useState("others");
  const [groupCats, setGroupCats] = useState([]);
  const [inputThreshold, setInputThreshold] = useState("");
  const [nameInput, setNameInput] = useState(username||"");
  const [confirmDel, setConfirmDel] = useState(null);
  
  const fileInputRef = useRef(null);

  const openAdd=(type,item=null)=>{setModal({type,item});setInputName(item?.name||"");setInputColor(item?.color||C.accent);setInputGroup(item?.group||"daily");setInputIcon(item?.icon||"others");setGroupCats(item?.cats||[]);setInputThreshold(item?.lowBalanceThreshold?String(item.lowBalanceThreshold):"");};
  
  const handleSave=async()=>{
    if(!inputName.trim())return; const id=modal.item?.id||Date.now().toString();
    const thresh = parseFloat(inputThreshold); const threshVal = !isNaN(thresh) && thresh > 0 ? thresh : undefined;
    if(modal.type==="bank") await onBanks(modal.item?banks.map(b=>b.id===id?{id,name:inputName,color:inputColor,lowBalanceThreshold:threshVal}:b):[...banks,{id,name:inputName,color:inputColor,lowBalanceThreshold:threshVal}]);
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
    const backupDate = new Date().toISOString().split("T")[0];
    a.download = `Saver_Backup_${backupDate}.json`; 
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
        {[{id:"profile",label:"👤 General"},{id:"currency",label:"💱 Currency"},{id:"banks",label:"🏦 Accounts"},{id:"expCats",label:"📤 Exp. Cat."},{id:"groups",label:"📊 Groups"}].map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)} style={{whiteSpace:"nowrap",padding:"8px 14px",borderRadius:10,border:`1px solid ${section===s.id?C.accent:C.border}`,background:section===s.id?C.accentDim:"transparent",color:section===s.id?C.accent:C.muted,fontWeight:700,fontSize:12,cursor:"pointer"}}>{s.label}</button>
        ))}
      </div>

      {section==="profile"&&(
        <div>
          <div onClick={onOpenSavings} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18,color:C.yellow}}>◎</span><span style={{color:C.text,fontWeight:600,fontSize:14}}>Savings Goals Setup</span></div><span style={{color:C.muted}}>❯</span></div>
          <div onClick={onOpenBudgets} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18,color:C.accent}}>📊</span><span style={{color:C.text,fontWeight:600,fontSize:14}}>Monthly Budgets</span></div><span style={{color:C.muted}}>❯</span></div>
          <div onClick={onOpenQuickActions} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18,color:C.blue}}>⚡</span><span style={{color:C.text,fontWeight:600,fontSize:14}}>Quick Actions Slots</span></div><span style={{color:C.muted}}>❯</span></div>
          
          <Card style={{marginBottom:16}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Profile Username</div><input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Enter name..." style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:12}}/><Btn full onClick={()=>{onUsername(nameInput.trim()); setAppAlert({title:"Profile Updated", message:"Username configuration updated successfully!", color:C.accent});}}>Commit Name</Btn></Card>
          
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Vault Ledger Backups</div>
          <Card style={{marginBottom:16}}>
            <p style={{color:C.muted, fontSize:12, marginBottom:14, lineHeight:1.4}}>Download a backup or restore from a previous backup file.</p>
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
        <SwipeRow key={b.id} onEdit={()=>openAdd("bank",b)} onDelete={()=>canDelBank(b)?setConfirmDel({type:"bank",item:b}):setAppAlert({title:"Action Blocked", message:`Cannot delete "${b.name}" — it still has a balance of ${fmt(bankBalance(b.id))}. Clear balance first.`, color:C.red})}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:10,height:10,borderRadius:99,background:b.color}}/><span style={{color:C.text,fontWeight:600,fontSize:14}}>{b.name}</span></div>
            <span style={{color:bankBalance(b.id)<0?C.red:C.muted,fontSize:13,fontWeight:700}}>{fmt(bankBalance(b.id))}</span>
          </div>
        </SwipeRow>
      ))}</div><Btn outline full onClick={()=>openAdd("bank")} style={{marginTop:8}}>+ Add Account</Btn></>)}
      {section==="expCats"&&(<><div style={{display:"flex",flexDirection:"column"}}>{expCats.map(c=>(
        <SwipeRow key={c.id} onEdit={()=>openAdd("expCat",c)} onDelete={()=>setConfirmDel({type:"expCat",item:c})}>
          <div style={{display:"flex",alignItems:"center",padding:"14px 16px"}}><span style={{fontSize:18,marginRight:10}}>{ICONS[c.icon]||"📌"}</span><span style={{color:C.text,fontWeight:600,fontSize:14}}>{c.name}</span></div>
        </SwipeRow>
      ))}</div><Btn outline full onClick={()=>openAdd("expCat")}>+ Add Expense Node</Btn></>)}

      {section==="groups"&&(<>
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          {groups.map(g=>(
            <SwipeRow key={g.id} onEdit={()=>openAdd("group",g)} onDelete={()=>setConfirmDel({type:"group",item:g})}>
              <div style={{padding:"12px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{width:10,height:10,borderRadius:99,background:g.color,flexShrink:0}}/>
                  <span style={{color:C.text,fontWeight:700,fontSize:14}}>{g.name}</span>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,paddingLeft:20}}>
                  {g.cats.map(cid=>{const cat=expCats.find(c=>c.id===cid);return cat?<span key={cid} style={{background:g.color+"22",color:g.color,border:`1px solid ${g.color}44`,borderRadius:99,padding:"2px 8px",fontSize:11,fontWeight:700}}>{cat.name}</span>:null;})}
                </div>
              </div>
            </SwipeRow>
          ))}
        </div>
        <Btn outline full onClick={()=>openAdd("group")} style={{marginTop:8}}>+ Add Group</Btn>
      </>)}

      {modal&&(
        <Modal title={`${modal.item?"Modify":"Append"} ${modal.type}`} onClose={()=>setModal(null)} center={false}>
          <Input label="Label Name" value={inputName} onChange={e=>setInputName(e.target.value)}/>
          {modal.type==="bank"&&(<>
            <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Color</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[C.accent,C.red,C.blue,C.yellow,C.purple,"#fb923c","#34d399","#f472b6"].map(col=>(<button key={col} onClick={()=>setInputColor(col)} style={{width:28,height:28,borderRadius:99,background:col,border:inputColor===col?"3px solid white":"3px solid transparent",cursor:"pointer"}}/>))}</div></div>
            <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Low Balance Alert</div><input type="number" min="0" placeholder="e.g. 200" value={inputThreshold} onChange={e=>setInputThreshold(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"}}/><div style={{color:C.faint,fontSize:11,marginTop:4}}>Show ⚠️ when balance falls below this amount (0 = disabled)</div></div>
          </>)}
          {modal.type==="expCat"&&(<div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>System Glyphs Icon</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{iconKeys.map(k=><button key={k} onClick={()=>setInputIcon(k)} style={{width:36,height:36,borderRadius:8,background:inputIcon===k?C.accentDim:C.bg,border:`1px solid ${inputIcon===k?C.accent:C.border}`,cursor:"pointer",fontSize:18}}>{ICONS[k]}</button>)}</div></div>)}
          {modal.type==="expCat"&&(<Select label="Group Tag" value={inputGroup} onChange={e=>setInputGroup(e.target.value)}>{["daily","fixed","lifestyle","growth","other"].map(g=><option key={g} value={g}>{g}</option>)}</Select>)}
          {modal.type==="group"&&(<>
            <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Color</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[C.accent,C.red,C.blue,C.yellow,C.purple,"#fb923c","#34d399","#f472b6"].map(col=>(<button key={col} onClick={()=>setInputColor(col)} style={{width:28,height:28,borderRadius:99,background:col,border:inputColor===col?"3px solid white":"3px solid transparent",cursor:"pointer"}}/>))}</div></div>
            <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Categories</div><div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:200,overflow:"auto",background:C.bg,padding:10,borderRadius:10,border:`1px solid ${C.border}`}}>{expCats.map(c=>{const checked=groupCats.includes(c.id);return(<label key={c.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"4px 0",userSelect:"none"}}><div onClick={()=>setGroupCats(checked?groupCats.filter(x=>x!==c.id):[...groupCats,c.id])} style={{width:18,height:18,borderRadius:4,border:`2px solid ${checked?C.accent:C.faint}`,background:checked?C.accentDim:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{checked&&<span style={{color:C.accent,fontSize:12}}>✓</span>}</div><span style={{color:C.text,fontSize:14}}>{ICONS[c.icon]||"📌"} {c.name}</span></label>);})}</div></div>
          </>)}
          <Btn full onClick={handleSave} style={{marginTop:8}}>Save</Btn>
        </Modal>
      )}
      {confirmDel&&<ConfirmModal title="Confirm Drop Operation?" message="Are you absolutely sure? Associated tracking nodes might mismatch." onClose={()=>setConfirmDel(null)} onConfirm={doDelete}/>}
    </div>
  );
}
