import React, { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from "react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import Privacy from "./Privacy";

const vibrate = (p) => { if (typeof window !== "undefined" && window.navigator?.vibrate) try { window.navigator.vibrate(p); } catch(e){} };
const HAPTICS = { light:()=>vibrate(10), medium:()=>vibrate(20), heavy:()=>vibrate(50), success:()=>vibrate([30,50,30]), warning:()=>vibrate(100) };

let isGlobalDragging = false;

const ThemeContext = createContext(null);
const useTheme = () => useContext(ThemeContext);

const DARK_COLORS = {
  bg:"#0f0f13", surface:"#17171f", card:"#1e1e28", border:"#2a2a38",
  accent:"#6ee7b7", accentDim:"#1a3d30",
  red:"#f87171", redDim:"#3d1a1a",
  blue:"#60a5fa", blueDim:"#1a2d3d",
  yellow:"#fbbf24", yellowDim:"#3d2e0a",
  purple:"#a78bfa", purpleDim:"#2a1a3d",
  orange:"#fb923c", orangeDim:"#3d1f0a",
  text:"#e8e8f0", muted:"#8888a8", faint:"#444460",
  isDark: true,
};

const LIGHT_COLORS = {
  bg:"#f4f4f8", surface:"#ffffff", card:"#ffffff", border:"#e2e2ec",
  accent:"#059669", accentDim:"#d1fae5",
  red:"#dc2626", redDim:"#fee2e2",
  blue:"#2563eb", blueDim:"#dbeafe",
  yellow:"#d97706", yellowDim:"#fef3c7",
  purple:"#7c3aed", purpleDim:"#ede9fe",
  orange:"#ea580c", orangeDim:"#ffedd5",
  text:"#111827", muted:"#6b7280", faint:"#d1d5db",
  isDark: false,
};

let C = DARK_COLORS;
const setCGlobal = (theme) => { C = theme === "dark" ? DARK_COLORS : LIGHT_COLORS; };

const CURRENCIES = [
  {code:"EGP",name:"Egyptian Pound"},{code:"GBP",name:"British Pound"},
  {code:"USD",name:"US Dollar"},{code:"EUR",name:"Euro"},
  {code:"SAR",name:"Saudi Riyal"},{code:"AED",name:"UAE Dirham"},
];
let _currency = "EGP";
const setCurrencyGlobal = (c) => { _currency = c; };
const fmt = (n, ov) => {
  const cur = ov || _currency;
  try {
    const r = Math.round(n*100)/100;
    return new Intl.NumberFormat("en-US",{style:"currency",currency:cur,minimumFractionDigits:r%1===0?0:1,maximumFractionDigits:2}).format(r);
  } catch { return `${cur} ${n}`; }
};

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDate = (d) => { const dt=new Date(d+"T12:00:00"); return `${DAYS[dt.getDay()]}: ${dt.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}`; };

const getLocalTime = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  const localISO = new Date(d.getTime() - offset).toISOString();
  return { today: localISO.split("T")[0], month: localISO.slice(0,7) };
};
const today = () => getLocalTime().today;
const currentMonth = () => getLocalTime().month;

const getGoalMessage = (pct) => {
  if (pct<=0) return null;
  if (pct<=25) return ["Great start! Every bit counts 🚀","Nice! You're building momentum 💪"][Math.floor(Math.random()*2)];
  if (pct<=49) return ["Keep going, you're on the right track! 📈","Your goal is getting closer! 🤩"][Math.floor(Math.random()*2)];
  if (pct===50) return "Halfway there! The hard part is behind you 🎉";
  if (pct<=89) return ["Past the midpoint — almost there! 🏃‍♂️💨","So close now! Just a few steps left 🔥"][Math.floor(Math.random()*2)];
  if (pct<=99) return "Almost done! One final push ⏳✨";
  return "Goal reached! Time to enjoy your hard work 🥳🎯";
};

const ICONS = {
  dashboard:"◈",add:"＋",settings:"⚙",saving:"◎",bills_nav:"☷",budget:"📊",
  income:"↑",expense:"↓",transfer:"→",
  food:"🍽",coffee:"☕",transport:"🚗",bills:"⚡",personal:"👤",health:"💊",
  entertainment:"🎬",shopping:"🛍",rent:"🏠",education:"📚",tech:"💻",others:"📌",
  salary:"💼",freelance:"💡",gift:"🎁",investment:"📈",other_income:"💰",
  bank:"🏦",cash:"💵",goal:"🎯",trash:"🗑",edit:"✎",close:"✕",check:"✓",
  parking:"🅿️",fuel:"⛽",car_repair:"🔧",takeaway:"🍕",barber:"💈",pets:"🐾",
  travel:"✈️",gaming:"🎮",pharmacy:"💊",laundry:"🧺",tuition:"🎓",gym:"🏋️",
  type_streaming:"🎬",type_software:"🤖",type_telecom:"📶",type_shopping:"🛍",type_utilities:"⚡",type_other:"🧾",
};

const DEFAULT_BANKS = [{id:"b1",name:"CIB",color:"#60a5fa"},{id:"b2",name:"NBE",color:"#6ee7b7"},{id:"b3",name:"Cash",color:"#fbbf24"}];
const DEFAULT_EXP_CATS = [
  {id:"food",name:"Food",icon:"food",group:"daily"},{id:"coffee",name:"Coffee",icon:"coffee",group:"daily"},
  {id:"transport",name:"Transport",icon:"transport",group:"daily"},{id:"bills",name:"Bills",icon:"bills",group:"fixed"},
  {id:"shopping",name:"Shopping",icon:"shopping",group:"lifestyle"},{id:"entertainment",name:"Fun",icon:"entertainment",group:"lifestyle"},
  {id:"personal",name:"Personal",icon:"personal",group:"daily"},{id:"health",name:"Health",icon:"health",group:"daily"},
  {id:"rent",name:"Rent",icon:"rent",group:"fixed"},{id:"education",name:"Education",icon:"education",group:"growth"},
  {id:"tech",name:"Tech",icon:"tech",group:"lifestyle"},{id:"parking",name:"Parking",icon:"parking",group:"daily"},
  {id:"fuel",name:"Fuel",icon:"fuel",group:"daily"},{id:"car_repair",name:"Car Repair",icon:"car_repair",group:"fixed"},
  {id:"takeaway",name:"Takeaway",icon:"takeaway",group:"daily"},{id:"barber",name:"Barber",icon:"barber",group:"personal"},
  {id:"pets",name:"Pets",icon:"pets",group:"personal"},{id:"travel",name:"Travel",icon:"travel",group:"lifestyle"},
  {id:"gaming",name:"Gaming",icon:"gaming",group:"lifestyle"},{id:"pharmacy",name:"Pharmacy",icon:"pharmacy",group:"health"},
  {id:"laundry",name:"Laundry",icon:"laundry",group:"daily"},{id:"tuition",name:"Tuition",icon:"tuition",group:"growth"},
  {id:"gym",name:"Gym",icon:"gym",group:"health"},{id:"others",name:"Others",icon:"others",group:"other"}
];
const DEFAULT_INC_CATS = [
  {id:"salary",name:"Salary",icon:"salary"},{id:"freelance",name:"Freelance",icon:"freelance"},
  {id:"gift",name:"Gift",icon:"gift"},{id:"investment",name:"Investment",icon:"investment"},
  {id:"other_income",name:"Other Income",icon:"other_income"}
];
const DEFAULT_GROUPS = [
  {id:"daily",name:"Daily Life",color:"#6ee7b7",cats:["food","coffee","transport"]},
  {id:"fixed",name:"Fixed Costs",color:"#f87171",cats:["bills"]},
  {id:"lifestyle",name:"Lifestyle",color:"#a78bfa",cats:["shopping","entertainment"]}
];
const DEFAULT_QUICK_ACTIONS = [
  {id:"q1",catId:"coffee",amount:"50",bankId:"b3"},{id:"q2",catId:"transport",amount:"50",bankId:"b3"},
  {id:"q3",catId:"",amount:"",bankId:""},{id:"q4",catId:"",amount:"",bankId:""}
];

const KEYS = {
  txns:"et_txns",banks:"et_banks",expCats:"et_expCats",incCats:"et_incCats",
  groups:"et_groups",savings:"et_savings",currency:"et_currency",
  username:"et_username",lastBackup:"et_lastBackup",bills:"et_bills",
  budgets:"et_budgets",quickActions:"et_quick_actions",seenWelcome:"et_seenWelcome",
  theme:"et_theme", installments:"et_installments",
};
async function load(key,fallback){try{const r=localStorage.getItem(key);return r?JSON.parse(r):fallback;}catch{return fallback;}}
async function save(key,val){try{localStorage.setItem(key,JSON.stringify(val));return true;}catch(e){console.warn("Storage:",e);return false;}}

const SUBSCRIPTION_SERVICES = [
  {id:"netflix",name:"Netflix",domain:"netflix.com",color:"#e50914",category:"Streaming"},
  {id:"spotify",name:"Spotify",domain:"spotify.com",color:"#1db954",category:"Streaming"},
  {id:"youtube",name:"YouTube Premium",domain:"youtube.com",color:"#ff0000",category:"Streaming"},
  {id:"disney",name:"Disney+",domain:"disneyplus.com",color:"#113ccf",category:"Streaming"},
  {id:"appletv",name:"Apple TV+",domain:"apple.com",color:"#555",category:"Streaming"},
  {id:"applemusic",name:"Apple Music",domain:"music.apple.com",color:"#fc3c44",category:"Streaming"},
  {id:"amazon",name:"Amazon Prime",domain:"amazon.com",color:"#ff9900",category:"Streaming"},
  {id:"shahid",name:"Shahid VIP",domain:"shahid.net",color:"#d4a017",category:"Streaming"},
  {id:"osn",name:"OSN+",domain:"osn.com",color:"#1a1a2e",category:"Streaming"},
  {id:"tod",name:"TOD",domain:"tod.tv",color:"#e8d44d",category:"Streaming"},
  {id:"starzplay",name:"StarzPlay",domain:"starzplay.com",color:"#002a5e",category:"Streaming"},
  {id:"watchit",name:"Watch IT",domain:"watchit.ae",color:"#e63946",category:"Streaming"},
  {id:"jawwy",name:"Jawwy TV",domain:"jawwytv.com",color:"#4361ee",category:"Streaming"},
  {id:"anghami",name:"Anghami",domain:"anghami.com",color:"#5c2d8a",category:"Streaming"},
  {id:"deezer",name:"Deezer",domain:"deezer.com",color:"#a238ff",category:"Streaming"},
  {id:"viu",name:"Viu",domain:"viu.com",color:"#f5c518",category:"Streaming"},
  {id:"chatgpt",name:"ChatGPT Plus",domain:"openai.com",color:"#10a37f",category:"Tech & AI"},
  {id:"claudepro",name:"Claude Pro",domain:"anthropic.com",color:"#cc785c",category:"Tech & AI"},
  {id:"cursor",name:"Cursor",domain:"cursor.sh",color:"#000000",category:"Tech & AI"},
  {id:"copilot",name:"GitHub Copilot",domain:"github.com",color:"#238636",category:"Tech & AI"},
  {id:"midjourney",name:"Midjourney",domain:"midjourney.com",color:"#000000",category:"Tech & AI"},
  {id:"adobe",name:"Adobe CC",domain:"adobe.com",color:"#ff0000",category:"Tech & AI"},
  {id:"microsoft365",name:"Microsoft 365",domain:"microsoft.com",color:"#0078d4",category:"Tech & AI"},
  {id:"googleone",name:"Google One",domain:"google.com",color:"#4285f4",category:"Tech & AI"},
  {id:"icloud",name:"iCloud",domain:"icloud.com",color:"#147efb",category:"Tech & AI"},
  {id:"notion",name:"Notion",domain:"notion.so",color:"#000000",category:"Tech & AI"},
  {id:"figma",name:"Figma",domain:"figma.com",color:"#f24e1e",category:"Tech & AI"},
  {id:"grammarly",name:"Grammarly",domain:"grammarly.com",color:"#15c39a",category:"Tech & AI"},
  {id:"duolingo",name:"Duolingo Plus",domain:"duolingo.com",color:"#58cc02",category:"Tech & AI"},
  {id:"vodafone",name:"Vodafone",domain:"vodafone.com",color:"#e60000",category:"Telecom"},
  {id:"etisalat",name:"Etisalat (e&)",domain:"etisalat.com",color:"#008000",category:"Telecom"},
  {id:"orange",name:"Orange",domain:"orange.com",color:"#ff6600",category:"Telecom"},
  {id:"we",name:"WE",domain:"te.eg",color:"#e30613",category:"Telecom"},
  {id:"stc",name:"STC",domain:"stc.com.sa",color:"#7b2d8b",category:"Telecom"},
  {id:"zain",name:"Zain",domain:"zain.com",color:"#e40046",category:"Telecom"},
  {id:"uberone",name:"Uber One",domain:"uber.com",color:"#000000",category:"Shopping"},
  {id:"careem",name:"Careem Plus",domain:"careem.com",color:"#5bae47",category:"Shopping"},
  {id:"talabat",name:"Talabat Pro",domain:"talabat.com",color:"#ff6b00",category:"Shopping"},
  {id:"noon",name:"Noon",domain:"noon.com",color:"#feee00",category:"Shopping"},
];

// Bill types — used as the background "category" for each bill, derived from its kind.
const BILL_TYPES = [
  {id:"streaming",name:"Streaming & TV",icon:"type_streaming",color:"#f87171"},
  {id:"software",name:"Software & AI",icon:"type_software",color:"#60a5fa"},
  {id:"telecom",name:"Telecom & Internet",icon:"type_telecom",color:"#34d399"},
  {id:"shopping",name:"Shopping & Delivery",icon:"type_shopping",color:"#fb923c"},
  {id:"utilities",name:"Utilities",icon:"type_utilities",color:"#fbbf24"},
  {id:"other",name:"Other",icon:"type_other",color:"#a78bfa"},
];
const SERVICE_CAT_TO_TYPE = {"Streaming":"streaming","Tech & AI":"software","Telecom":"telecom","Shopping":"shopping"};
const getBillType = (id) => BILL_TYPES.find(t=>t.id===id) || BILL_TYPES.find(t=>t.id==="other");

const INSTALLMENT_PROVIDERS = [
  {id:"valu",name:"ValU",domain:"valucorp.com",color:"#6c3ce1",category:"BNPL"},
  {id:"halan",name:"Halan",domain:"halan.com",color:"#00b69b",category:"BNPL"},
  {id:"forsa",name:"Forsa",domain:"forsa.money",color:"#003c8f",category:"BNPL"},
  {id:"souhoola",name:"Souhoola",domain:"souhoola.com",color:"#e8732a",category:"BNPL"},
  {id:"shahry",name:"Shahry",domain:"shahry.app",color:"#e91e63",category:"BNPL"},
  {id:"contact",name:"Contact",domain:"contactcfs.com",color:"#1a237e",category:"BNPL"},
  {id:"btech",name:"B.TECH",domain:"btech.com",color:"#ffd600",category:"BNPL"},
  {id:"noon_pay",name:"Noon Pay Later",domain:"noon.com",color:"#feee00",category:"BNPL"},
  {id:"gam3ya",name:"Gam3ya",domain:"",color:"#6c63ff",category:"Community"},
  {id:"car",name:"Car Loan",domain:"",color:"#546e7a",category:"Assets"},
  {id:"rent_install",name:"Rent",domain:"",color:"#26a69a",category:"Assets"},
  {id:"phone",name:"Phone",domain:"",color:"#37474f",category:"Assets"},
  {id:"laptop",name:"Laptop",domain:"",color:"#455a64",category:"Assets"},
  {id:"furniture",name:"Furniture",domain:"",color:"#8d6e63",category:"Assets"},
  {id:"appliances",name:"Appliances",domain:"",color:"#ef5350",category:"Assets"},
];

function ServiceLogo({ domain, name, color, size = 36, style = {} }) {
  const [imgOk, setImgOk] = useState(!!domain);
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const bg = color || "#6ee7b7";
  if (imgOk && domain) {
    return (
      <div style={{ width:size, height:size, borderRadius:size*0.28, overflow:"hidden", flexShrink:0, background:bg+"22", ...style }}>
        <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt={name}
          style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={() => setImgOk(false)} />
      </div>
    );
  }
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.28, background:bg+"33", border:`1.5px solid ${bg}66`,
      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, ...style }}>
      <span style={{ color:bg, fontSize:size*0.38, fontWeight:800 }}>{initials}</span>
    </div>
  );
}

const getIS = () => ({
  width:"100%", minWidth:0, background:C.bg, border:`1px solid ${C.border}`,
  borderRadius:10, padding:"10px 12px", color:C.text, fontSize:15, outline:"none",
  boxSizing:"border-box", fontFamily:"'DM Sans', sans-serif", display:"block", WebkitAppearance:"none"
});
let IS = getIS();

function Pill({color,children,style}){
  return <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700,...style}}>{children}</span>;
}

function Card({children,style,onClick,...props}){
  return <div {...props} onClick={e=>{if(!isGlobalDragging&&onClick)onClick(e);}} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,fontFamily:"'DM Sans', sans-serif",...style}}>{children}</div>;
}

function Btn({children,color,outline,full,small,...props}){
  const tc=color||C.accent;
  return <button {...props} style={{background:outline?"transparent":tc,border:`1.5px solid ${tc}`,color:outline?tc:"#111",borderRadius:10,padding:small?"7px 14px":"11px 20px",fontWeight:700,fontSize:small?13:15,cursor:"pointer",width:full?"100%":"auto",transition:"opacity .15s",fontFamily:"'DM Sans', sans-serif",...props.style}} onMouseOver={e=>e.currentTarget.style.opacity=".8"} onMouseOut={e=>e.currentTarget.style.opacity="1"}>{children}</button>;
}

function Input({label,error,...props}){
  const is=getIS();
  return <div style={{marginBottom:14}}>
    {label&&<div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>{label}</div>}
    <input {...props} style={{...is,border:`1px solid ${error?C.red:C.border}`,...props.style}}/>
    {error&&<div style={{color:C.red,fontSize:11,marginTop:4}}>{error}</div>}
  </div>;
}

function Select({label,children,...props}){
  const is=getIS();
  return <div style={{marginBottom:14}}>
    {label&&<div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{label}</div>}
    <select {...props} style={{...is,...props.style}}>{children}</select>
  </div>;
}

function ProgressBar({value,max,color,allowOver}){
  const raw=max?(value/max)*100:0;
  const pct=allowOver?Math.min(120,raw):Math.min(100,raw);
  return <div style={{height:6,background:C.border,borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:color||C.accent,borderRadius:99,transition:"width .4s"}}/></div>;
}

function EmptyState({icon,message}){
  return <div style={{textAlign:"center",padding:"60px 20px",opacity:0.5}}>
    <div style={{fontSize:38,marginBottom:12}}>{icon}</div>
    <div style={{color:C.muted,fontSize:14,fontWeight:500}}>{message}</div>
  </div>;
}

function MonthSelect({value,onChange,availMonths}){
  const months=availMonths.length>0?availMonths:[new Date().toISOString().slice(0,7)];
  const byYear={};
  months.forEach(m=>{const[y,mo]=m.split("-");if(!byYear[y])byYear[y]=[];byYear[y].push({m,mo});});
  const years=Object.keys(byYear).sort().reverse();
  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <select value={value} onChange={onChange} style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:"8px 32px 8px 12px",fontSize:13,fontWeight:600,outline:"none",appearance:"none",cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>
        <option value="all">All Time</option>
        {years.map(y=>(
          <optgroup key={y} label={y}>
            {byYear[y].map(({m,mo})=><option key={m} value={m}>{MONTHS[+mo-1]} {y}</option>)}
          </optgroup>
        ))}
      </select>
      <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:10,pointerEvents:"none"}}>▼</span>
    </div>
  );
}

function Modal({title,onClose,children,center}){
  const align=center?"center":"flex-end",radius=center?"20px":"20px 20px 0 0";
  const anim=center?"popCenter 0.25s cubic-bezier(0.175,0.885,0.32,1.275)":"slideUp 0.3s ease-out";
  return (
    <div style={{position:"fixed",inset:0,background:"#000a",zIndex:100,display:"flex",alignItems:align,justifyContent:"center",padding:center?"0 20px":"0",fontFamily:"'DM Sans', sans-serif"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:radius,width:"100%",maxWidth:520,maxHeight:"85vh",overflow:"auto",padding:24,animation:anim}}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes popCenter{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}`}</style>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{color:C.text,fontWeight:700,fontSize:18}}>{title}</span>
          <button onClick={onClose} style={{background:C.border,border:"none",color:C.muted,width:38,height:38,borderRadius:99,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({title,message,onConfirm,onClose,confirmColor}){
  return <Modal title={title} onClose={onClose} center={false}>
    <p style={{color:C.muted,marginBottom:20,lineHeight:1.6,fontSize:14,whiteSpace:"pre-line"}}>{message}</p>
    <div style={{display:"flex",gap:10}}>
      <Btn outline color={C.muted} full onClick={onClose}>Cancel</Btn>
      <Btn color={confirmColor||C.red} full onClick={()=>{HAPTICS.warning();onConfirm();}}>Confirm</Btn>
    </div>
  </Modal>;
}

function AlertModal({title,message,onClose,btnColor}){
  const bc=btnColor||C.accent;
  return <Modal title={title} onClose={onClose} center={true}>
    <p style={{color:C.text,marginBottom:20,lineHeight:1.6,fontSize:14}}>{message}</p>
    <div style={{display:"flex",justifyContent:"flex-end"}}><Btn color={bc} onClick={onClose} style={{minWidth:100}}>Close</Btn></div>
  </Modal>;
}

function GoalToast({message,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t);},[onClose]);
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 24px",fontFamily:"'DM Sans', sans-serif"}}>
      <style>{`@keyframes goalPopIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{background:C.surface,border:`2px solid ${C.accent}`,borderRadius:24,padding:"36px 28px",width:"100%",maxWidth:340,textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.7)",animation:"goalPopIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275)"}}>
        <div style={{fontSize:52,marginBottom:16,lineHeight:1}}>{message.match(/[\u{1F300}-\u{1FFFF}]|[\u2600-\u27FF]/gu)?.[0]||"🎯"}</div>
        <div style={{color:C.accent,fontSize:18,fontWeight:800,lineHeight:1.5,marginBottom:24}}>{message.replace(/[\u{1F300}-\u{1FFFF}]|[\u2600-\u27FF]/gu,"").trim()}</div>
        <button onClick={onClose} style={{background:C.accent,border:"none",color:"#111",borderRadius:12,padding:"12px 32px",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"'DM Sans', sans-serif",width:"100%"}}>Keep Going! 💪</button>
      </div>
    </div>
  );
}

function AppFooter({navigateTo,onPrivacyClick}){
  return <div style={{textAlign:"center",marginTop:40,marginBottom:20,width:"100%"}}>
    <div style={{marginBottom:"6px",display:"flex",justifyContent:"center",alignItems:"center",gap:"8px"}}>
      <span style={{color:C.blue,opacity:0.8,fontSize:"13px",fontWeight:"700"}}>Saver One V2.0</span>
      {(navigateTo||onPrivacyClick)&&<><span style={{color:C.faint}}>|</span><span onClick={()=>onPrivacyClick?onPrivacyClick():(navigateTo&&navigateTo("privacy"))} style={{color:C.accent,fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>Privacy Policy</span></>}
    </div>
    <div style={{color:C.blue,opacity:0.6,fontSize:"10px",fontWeight:"500"}}>Offline & 100% Private · Powered by Mahmoud © 2026</div>
  </div>;
}

let globalActiveSwipeClose = null;
function SwipeRow({onEdit,onDelete,children}){
  const [slide,setSlide]=useState(0);
  const rowRef=useRef(null),startX=useRef(0),startY=useRef(0),currentX=useRef(0);
  const isH=useRef(false),isV=useRef(false),slideRef=useRef(0);
  const close=useCallback(()=>{
    setSlide(0);slideRef.current=0;currentX.current=0;
    if(rowRef.current){rowRef.current.style.transform="translateX(0px)";rowRef.current.style.transition="transform 0.4s cubic-bezier(0.175,0.885,0.32,1.15)";}
    if(globalActiveSwipeClose===close)globalActiveSwipeClose=null;
  },[]);
  useEffect(()=>{
    const el=rowRef.current;if(!el)return;
    const s=(e)=>{if(globalActiveSwipeClose&&globalActiveSwipeClose!==close)globalActiveSwipeClose();startX.current=e.touches[0].clientX;startY.current=e.touches[0].clientY;currentX.current=slideRef.current;isH.current=false;isV.current=false;el.style.transition="none";};
    const m=(e)=>{if(isV.current)return;const dx=e.touches[0].clientX-startX.current,dy=Math.abs(e.touches[0].clientY-startY.current);if(!isH.current){if(dy>Math.abs(dx)&&dy>3){isV.current=true;return;}if(Math.abs(dx)>10&&Math.abs(dx)>dy)isH.current=true;}if(isH.current){e.preventDefault();let t=currentX.current+dx;if(t<-95)t=-95;if(t>95)t=95;el.style.transform=`translateX(${t}px)`;setSlide(t);slideRef.current=t;}};
    const en=()=>{if(isV.current)return;el.style.transition="transform 0.4s cubic-bezier(0.175,0.885,0.32,1.15)";const sv=slideRef.current;if(sv<-35){setSlide(-85);slideRef.current=-85;currentX.current=-85;el.style.transform="translateX(-85px)";HAPTICS.light();globalActiveSwipeClose=close;}else if(sv>35){setSlide(85);slideRef.current=85;currentX.current=85;el.style.transform="translateX(85px)";HAPTICS.light();globalActiveSwipeClose=close;}else{setSlide(0);slideRef.current=0;currentX.current=0;el.style.transform="translateX(0px)";if(globalActiveSwipeClose===close)globalActiveSwipeClose=null;}};
    el.addEventListener("touchstart",s,{passive:false});el.addEventListener("touchmove",m,{passive:false});el.addEventListener("touchend",en);
    return()=>{el.removeEventListener("touchstart",s);el.removeEventListener("touchmove",m);el.removeEventListener("touchend",en);};
  },[close]);
  return <div style={{position:"relative",overflow:"hidden",borderRadius:12,marginBottom:8,userSelect:"none",WebkitUserSelect:"none"}}>
    <div style={{position:"absolute",inset:0,display:"flex",justifyContent:"space-between",zIndex:0}}>
      <button onClick={()=>{close();onEdit&&onEdit();}} style={{width:85,background:C.blueDim,border:"none",color:C.blue,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>✎ Edit</button>
      <button onClick={()=>{close();onDelete&&onDelete();}} style={{width:85,background:C.redDim,border:"none",color:C.red,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>🗑 Delete</button>
    </div>
    <div ref={rowRef} style={{touchAction:slide!==0?"none":"pan-y",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,position:"relative",zIndex:1,width:"100%",boxSizing:"border-box"}}>{children}</div>
  </div>;
}

function BalanceCarousel({ totalBalance, totalSafe, hideTotal, setHideTotal, initialMode, onModeChange }) {
  const [index, setIndex] = useState(initialMode === "available" ? 1 : 0);
  const [drag, setDrag] = useState(0);
  const trackRef = useRef(null);
  const startX = useRef(0), startY = useRef(0), isDragging = useRef(false), isH = useRef(false);

  useEffect(() => { setIndex(initialMode === "available" ? 1 : 0); }, [initialMode]);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX; startY.current = e.touches[0].clientY;
    isDragging.current = true; isH.current = false;
    if (trackRef.current) trackRef.current.style.transition = 'none';
  };
  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (!isH.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) { isDragging.current = false; return; }
      if (Math.abs(dx) > 10) isH.current = true;
    }
    if (isH.current) {
      if (e.cancelable) e.preventDefault();
      let newDrag = dx;
      if (index === 0 && dx > 0) newDrag = dx * 0.25;
      if (index === 1 && dx < 0) newDrag = dx * 0.25;
      setDrag(newDrag);
    }
  };
  const handleTouchEnd = () => {
    if (!isDragging.current || !isH.current) return;
    isDragging.current = false;
    const threshold = 60;
    let newIndex = index;
    if (drag < -threshold && index === 0) newIndex = 1;
    else if (drag > threshold && index === 1) newIndex = 0;
    setDrag(0);
    if (trackRef.current) trackRef.current.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
    if (newIndex !== index) { setIndex(newIndex); HAPTICS.light(); onModeChange(newIndex === 0 ? "total" : "available"); }
  };

  const pX = -drag * 0.4;
  const cardBg = C.isDark ? "linear-gradient(135deg,#1e1e28 0%,#23232f 100%)" : "linear-gradient(135deg,#ffffff 0%,#f8f8fc 100%)";

  return (
    <div style={{position:"relative",marginBottom:20,borderRadius:18,overflow:"hidden",background:cardBg,border:`1px solid ${C.faint}`,touchAction:"pan-y",userSelect:"none",WebkitUserSelect:"none"}}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div ref={trackRef} style={{display:"flex",width:"200%",transform:`translateX(calc(${index===0?'0%':'-50%'} + ${drag}px))`,transition:'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'}}>
        <div style={{width:"50%",padding:"20px 20px 34px 20px",boxSizing:"border-box",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",right:-10,top:"15%",opacity:0.03,fontSize:80,pointerEvents:"none"}}>🏦</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",transform:`translateX(${index===0?pX:0}px)`,transition:drag===0?'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)':'none'}}>
            <div style={{position:"relative",zIndex:2}}>
              <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Total Balance</div>
              <div style={{color:C.text,fontSize:32,fontWeight:800,letterSpacing:-1}}>{hideTotal?"••••••":fmt(totalBalance)}</div>
            </div>
            <button onClick={(e)=>{e.stopPropagation();setHideTotal(v=>!v);}} style={{background:C.border,border:"none",color:C.muted,width:38,height:38,borderRadius:99,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>{hideTotal?"🙈":"🐵"}</button>
          </div>
        </div>
        <div style={{width:"50%",padding:"20px 20px 34px 20px",boxSizing:"border-box",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",right:-10,top:"15%",opacity:0.03,fontSize:80,pointerEvents:"none"}}>💸</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",transform:`translateX(${index===1?pX:0}px)`,transition:drag===0?'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)':'none'}}>
            <div style={{position:"relative",zIndex:2}}>
              <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Available to Spend</div>
              <div style={{color:C.accent,fontSize:32,fontWeight:800,letterSpacing:-1}}>{hideTotal?"••••••":fmt(totalSafe)}</div>
            </div>
            <button onClick={(e)=>{e.stopPropagation();setHideTotal(v=>!v);}} style={{background:C.border,border:"none",color:C.muted,width:38,height:38,borderRadius:99,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>{hideTotal?"🙈":"🐵"}</button>
          </div>
        </div>
      </div>
      <div style={{position:"absolute",bottom:12,left:0,width:"100%",display:"flex",justifyContent:"center",gap:8,pointerEvents:"none",zIndex:3}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:index===0?C.accent:C.muted,opacity:index===0?1:0.3,transition:"all 0.4s ease"}}/>
        <div style={{width:6,height:6,borderRadius:"50%",background:index===1?C.accent:C.muted,opacity:index===1?1:0.3,transition:"all 0.4s ease"}}/>
      </div>
    </div>
  );
}

function SortableItem({id,children}){
  const{attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:String(id)});
  return <div ref={setNodeRef} style={{transform:transform?`translate3d(${transform.x}px,${transform.y}px,0)`:undefined,transition,opacity:isDragging?0.6:1,zIndex:isDragging?100:"auto",position:isDragging?"relative":"static",touchAction:isDragging?"none":"auto"}} {...attributes} {...listeners}>{children}</div>;
}
function SortableList({items,onReorder,renderItem,grid,gap=10}){
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{delay:250,tolerance:5}}),useSensor(TouchSensor,{activationConstraint:{delay:250,tolerance:5}}));
  const cleanup=useCallback(()=>{document.body.style.overflow="";document.body.style.touchAction="";setTimeout(()=>{isGlobalDragging=false;},100);},[]);
  useEffect(()=>{
    const p=(e)=>{if(isGlobalDragging)e.preventDefault();};
    document.addEventListener("touchmove",p,{passive:false});
    return()=>{document.removeEventListener("touchmove",p);document.body.style.overflow="";document.body.style.touchAction="";isGlobalDragging=false;};
  },[]);
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={()=>{isGlobalDragging=true;HAPTICS.heavy();document.body.style.overflow="hidden";document.body.style.touchAction="none";}} onDragEnd={(e)=>{HAPTICS.heavy();cleanup();const{active,over}=e;if(over&&active.id!==over.id){const oi=items.findIndex(i=>String(i.id)===String(active.id)),ni=items.findIndex(i=>String(i.id)===String(over.id));onReorder(arrayMove(items,oi,ni));}}} onDragCancel={cleanup}>
    <SortableContext items={items.map(i=>String(i.id))} strategy={grid?rectSortingStrategy:verticalListSortingStrategy}>
      <div style={{display:grid?"grid":"flex",gridTemplateColumns:grid?"1fr 1fr":"none",flexDirection:grid?"row":"column",gap}}>
        {items.map((item,idx)=><SortableItem key={item.id} id={item.id}>{renderItem(item,idx)}</SortableItem>)}
      </div>
    </SortableContext>
  </DndContext>;
}

function detectPlatform(){const ua=navigator.userAgent||"";return{isIOS:/iphone|ipad|ipod/i.test(ua),isAndroid:/android/i.test(ua),isInStandaloneMode:window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true};}

function AddToHomeModal({onClose}){
  const{isIOS,isAndroid,isInStandaloneMode}=detectPlatform();
  if(isInStandaloneMode){onClose();return null;}
  const Step=({num,children})=><div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:18}}><div style={{width:32,height:32,borderRadius:99,background:C.accentDim,border:`1.5px solid ${C.accent}`,color:C.accent,fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{num}</div><div style={{color:C.text,fontSize:14,lineHeight:1.6,paddingTop:4}}>{children}</div></div>;
  if(isIOS)return<Modal title="Add Saver to Home Screen" onClose={onClose} center={false}><div style={{background:C.blueDim,border:`1px solid ${C.blue}44`,borderRadius:12,padding:"12px 14px",marginBottom:20}}><span style={{color:C.blue,fontSize:13,fontWeight:600}}>📱 iPhone / iPad — follow these steps in <strong>Safari</strong></span></div><Step num="1">Open in <strong style={{color:C.accent}}>Safari</strong>.</Step><Step num="2">Tap the <strong style={{color:C.accent}}>Share button</strong> ⎙</Step><Step num="3">Tap <strong style={{color:C.accent}}>"Add to Home Screen"</strong></Step><Step num="4">Tap <strong style={{color:C.accent}}>"Add"</strong>. Done!</Step><Btn full onClick={onClose}>Got it!</Btn></Modal>;
  if(isAndroid)return<Modal title="Add Saver to Home Screen" onClose={onClose} center={false}><div style={{background:C.accentDim,border:`1px solid ${C.accent}44`,borderRadius:12,padding:"12px 14px",marginBottom:20}}><span style={{color:C.accent,fontSize:13,fontWeight:600}}>📱 Android</span></div><Step num="1">Open in <strong style={{color:C.accent}}>Chrome</strong>.</Step><Step num="2">Tap <strong style={{color:C.accent}}>⋮ menu</strong>.</Step><Step num="3">Tap <strong style={{color:C.accent}}>"Add to Home screen"</strong>.</Step><Step num="4">Tap <strong style={{color:C.accent}}>"Add"</strong>. Done!</Step><Btn full onClick={onClose}>Got it!</Btn></Modal>;
  return<Modal title="Install Saver" onClose={onClose} center={false}><p style={{color:C.muted,fontSize:14,lineHeight:1.7,marginBottom:16}}>Open Saver on your <strong style={{color:C.text}}>iPhone or Android</strong> and add it to your home screen.</p><Btn full onClick={onClose}>Got it!</Btn></Modal>;
}

function WelcomeScreen({onStart,onManual,onPrivacy}){
  const[showInstall,setShowInstall]=useState(false);
  const{isInStandaloneMode}=detectPlatform();
  return<div style={{position:"fixed",inset:0,zIndex:900,background:C.bg,display:"flex",flexDirection:"column",padding:"40px 24px",boxSizing:"border-box",overflow:"auto",fontFamily:"'DM Sans', sans-serif"}}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet"/>
    <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center"}}>
      <div style={{textAlign:"center",marginBottom:30}}><img src="https://raw.githubusercontent.com/mahmoudstate/saver-test/main/icon.png" alt="Logo" style={{width:100,height:100,borderRadius:24,boxShadow:"0 10px 30px rgba(0,0,0,0.5)",marginBottom:20}}/><h1 style={{color:C.text,fontSize:28,fontWeight:800,margin:"0 0 10px 0"}}>Welcome to Saver</h1><h2 style={{color:C.accent,fontSize:16,fontWeight:600,margin:0}}>Your Personal Finance, Mastered.</h2></div>
      <p style={{color:C.muted,fontSize:15,lineHeight:1.6,marginBottom:24,textAlign:"center"}}>Simple, fast expense tracking. 100% offline.</p>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:20,marginBottom:30}}>
        {[{bg:C.accentDim,c:C.accent,icon:"⚡",t:"Lightning Fast",d:"Log expenses in seconds using Quick Actions."},{bg:C.blueDim,c:C.blue,icon:"🔒",t:"100% Offline & Private",d:"No clouds, no accounts. Your data never leaves your phone."},{bg:C.yellowDim,c:C.yellow,icon:"🎨",t:"Fully Customizable",d:"Drag, drop, and personalize your dashboard."}].map((f,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:i<2?16:0}}><span style={{fontSize:20,background:f.bg,color:f.c,padding:8,borderRadius:10}}>{f.icon}</span><div><strong style={{color:C.text,fontSize:15}}>{f.t}</strong><div style={{color:C.muted,fontSize:13,marginTop:4}}>{f.d}</div></div></div>)}
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:"auto"}}>
      <Btn full onClick={()=>isInStandaloneMode?onStart():setShowInstall(true)} style={{padding:"14px",fontSize:16}}>Start Using Saver</Btn>
      <Btn full outline color={C.muted} onClick={onManual} style={{padding:"14px",fontSize:16}}>Read Manual Guide</Btn>
    </div>
    <AppFooter onPrivacyClick={onPrivacy}/>
    {showInstall&&<AddToHomeModal onClose={()=>{setShowInstall(false);onStart();}}/>}
  </div>;
}

function SplashScreen(){
  const[phase,setPhase]=useState(0);
  useEffect(()=>{const t1=setTimeout(()=>setPhase(1),700),t2=setTimeout(()=>setPhase(2),2100);return()=>{clearTimeout(t1);clearTimeout(t2);};},[]);
  return<div style={{position:"fixed",inset:0,zIndex:999,background:"#0f0f13",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",opacity:phase===2?0:1,transition:phase===2?"opacity 0.7s ease":"none",userSelect:"none",fontFamily:"'DM Sans', sans-serif"}}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet"/>
    <style>{`@keyframes saverLogoIn{0%{transform:scale(0.75) translateY(10px);opacity:0}60%{transform:scale(1.05) translateY(-3px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}@keyframes saverFadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes saverGlow{0%,100%{box-shadow:0 0 0 0 #6ee7b700}50%{box-shadow:0 0 40px 10px #6ee7b722}}@keyframes saverBounce{0%,80%,100%{transform:translateY(0);opacity:0.3}40%{transform:translateY(-7px);opacity:1}}`}</style>
    <div style={{animation:"saverLogoIn 1.0s cubic-bezier(0.175,0.885,0.32,1.275) both,saverGlow 2.5s ease 1s infinite",marginBottom:24,borderRadius:28}}><img src="https://raw.githubusercontent.com/mahmoudstate/saver-test/main/icon.png" alt="Logo" style={{width:120,height:120,borderRadius:28,display:"block"}}/></div>
    <div style={{color:"#e8e8f0",fontSize:32,fontWeight:800,letterSpacing:10,textTransform:"uppercase",marginBottom:6,animation:"saverLogoIn 1.0s 0.15s both"}}>SAVER</div>
    <div style={{color:"#6ee7b7",fontSize:12,fontWeight:500,letterSpacing:3,opacity:phase>=1?1:0,animation:phase>=1?"saverFadeUp 0.6s ease forwards":"none",marginBottom:80}}>Easy come, easy go.</div>
    <div style={{display:"flex",gap:7,position:"absolute",bottom:70}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:99,background:"#6ee7b7",animation:`saverBounce 1.3s ease ${i*0.22}s infinite`}}/>)}</div>
    <div style={{color:"#444460",fontSize:10,position:"absolute",bottom:24,fontWeight:700,letterSpacing:1}}>Saver One V2.0</div>
  </div>;
}

function calcBankBalance(bankId,txns){return txns.reduce((acc,t)=>{if(t.bankId===bankId&&t.type==="income")return acc+t.amount;if(t.bankId===bankId&&t.type==="expense")return acc-t.amount;if(t.bankId===bankId&&t.type==="goal_withdraw")return acc-t.amount;if(t.toBankId===bankId&&t.type==="transfer")return acc+t.amount;if((t.fromBankId||t.bankId)===bankId&&t.type==="transfer")return acc-t.amount;return acc;},0);}
function calcGoalSaved(goalId,txns){return txns.reduce((acc,t)=>{if(t.goalId===goalId&&t.type==="saving")return acc+t.amount;if(t.goalId===goalId&&t.type==="goal_withdraw")return acc-t.amount;if(t.goalId===goalId&&t.type==="goal_return")return acc-t.amount;return acc;},0);}
function calcFrozenForBank(bankId,savings,txns){return txns.reduce((acc,t)=>{if(t.bankId===bankId&&t.type==="saving")return acc+t.amount;if(t.bankId===bankId&&t.type==="goal_withdraw")return acc-t.amount;if(t.bankId===bankId&&t.type==="goal_return")return acc-t.amount;return acc;},0);}

function SaverApp(){
  const[tab,setTab]=useState("dashboard");
  const[scrollState,setScrollState]=useState({y:0,restore:false});
  const[showPrivacyBeforeWelcome,setShowPrivacyBeforeWelcome]=useState(false);
  const[txns,setTxns]=useState([]);
  const[banks,setBanks]=useState(DEFAULT_BANKS);
  const[expCats,setExpCats]=useState(DEFAULT_EXP_CATS);
  const[incCats,setIncCats]=useState(DEFAULT_INC_CATS);
  const[groups,setGroups]=useState(DEFAULT_GROUPS);
  const[savings,setSavings]=useState([]);
  const[bills,setBills]=useState([]);
  const[installments,setInstallments]=useState([]);
  const[budgets,setBudgets]=useState([]);
  const[quickActions,setQuickActions]=useState(DEFAULT_QUICK_ACTIONS);
  const[showSplash,setShowSplash]=useState(true);
  const[hasSeenWelcome,setHasSeenWelcome]=useState(true);
  const[filterMonth,setFilterMonth]=useState("all");
  const[currency,setCurrencyState]=useState("EGP");
  const[theme,setThemeState]=useState("dark");
  useEffect(()=>{ setCurrencyGlobal(currency); },[currency]);
  useEffect(()=>{ setCGlobal(theme); IS=getIS(); },[theme]);
  const[username,setUsernameState]=useState("");
  const[lastBackup,setLastBackup]=useState(null);
  const[appAlert,setAppAlert]=useState(null);
  const[hideTotal,setHideTotal]=useState(true);
  const[ledgerBank,setLedgerBank]=useState(null);
  const[ledgerGroup,setLedgerGroup]=useState(null);
  const[ledgerSaving,setLedgerSaving]=useState(null);
  const[ledgerBudget,setLedgerBudget]=useState(null);
  const[goalToast,setGoalToast]=useState(null);
  const[pendingCurrency,setPendingCurrency]=useState(null);

  useEffect(()=>{if("Notification" in window&&Notification.permission!=="granted"&&Notification.permission!=="denied")Notification.requestPermission();},[]);

  useEffect(()=>{
    (async()=>{
      const[t,b,ec,ic,g,s,cur,uname,bl,bdg,lb,qa,seen,th,inst]=await Promise.all([
        load(KEYS.txns,[]),load(KEYS.banks,DEFAULT_BANKS),load(KEYS.expCats,DEFAULT_EXP_CATS),
        load(KEYS.incCats,DEFAULT_INC_CATS),load(KEYS.groups,DEFAULT_GROUPS),load(KEYS.savings,[]),
        load(KEYS.currency,"EGP"),load(KEYS.username,""),load(KEYS.bills,[]),load(KEYS.budgets,[]),
        load(KEYS.lastBackup,null),load(KEYS.quickActions,DEFAULT_QUICK_ACTIONS),load(KEYS.seenWelcome,false),
        load(KEYS.theme,"dark"),load(KEYS.installments,[]),
      ]);
      setTxns(t);setBanks(b);setExpCats(ec);setIncCats(ic);setGroups(g);setSavings(s);
      setCurrencyState(cur);setCurrencyGlobal(cur);setUsernameState(uname);setBills(bl);setBudgets(bdg);setLastBackup(lb);
      setQuickActions(qa);setHasSeenWelcome(seen);setThemeState(th);setCGlobal(th);IS=getIS();
      setInstallments(inst);
      const localCurMonth=currentMonth();
      setFilterMonth(localCurMonth);
      setTimeout(()=>setShowSplash(false),2700);
      if("Notification" in window&&Notification.permission==="granted"&&bl.length>0){
        bl.forEach(bill=>{
          if(!bill.dueDay)return;
          const now=new Date(),mStr=now.toISOString().slice(0,7);
          if(!bill.payments?.some(p=>p.month===mStr)){
            const due=new Date(now.getFullYear(),now.getMonth(),bill.dueDay);
            const diff=Math.ceil((due-now)/(1000*60*60*24));
            if(diff>=0&&diff<=(bill.reminderDays||2))new Notification("Saver: Bill Reminder",{body:`${bill.name} is due in ${diff} day${diff!==1?"s":""}.`,icon:"https://raw.githubusercontent.com/mahmoudstate/saver-test/main/icon.png"});
            else if(diff<0)new Notification("Saver: Bill Overdue",{body:`${bill.name} is overdue!`,icon:"https://raw.githubusercontent.com/mahmoudstate/saver-test/main/icon.png"});
          }
        });
      }
    })();
  },[]);

  const navigateTo=useCallback((newTab,saveScroll=false)=>{
    if(saveScroll)setScrollState({y:window.scrollY,restore:true});
    else{setScrollState({y:0,restore:false});window.scrollTo(0,0);}
    setTab(newTab);
  },[]);

  const persist=useCallback(async(key,val)=>{await save(key,val);},[]);
  const bankBalance=useCallback((bankId)=>calcBankBalance(bankId,txns),[txns]);
  const goalSaved=useCallback((goalId)=>Math.max(0,calcGoalSaved(goalId,txns)),[txns]);
  const frozenForBank=useCallback((bankId)=>Math.max(0,calcFrozenForBank(bankId,savings,txns)),[savings,txns]);
  const safeToSpend=useCallback((bankId)=>bankBalance(bankId)-frozenForBank(bankId),[bankBalance,frozenForBank]);

  const getGoalBalancesPerBank=(goalId)=>{
    const balances={};
    txns.forEach(t=>{
      if(t.goalId===goalId){
        if(t.type==="saving")balances[t.bankId]=(balances[t.bankId]||0)+t.amount;
        if(t.type==="goal_withdraw"||t.type==="goal_return")balances[t.bankId]=(balances[t.bankId]||0)-t.amount;
      }
    });
    return balances;
  };

  const processingRef=useRef(false);
  const addTxn=async(t)=>{
    if(processingRef.current)return false;
    processingRef.current=true;
    try{
      if(t.type==="expense"||t.type==="transfer"){
        const checkId=t.type==="transfer"?(t.fromBankId||t.bankId):t.bankId;
        const avail=safeToSpend(checkId);
        if(avail<t.amount){HAPTICS.warning();setAppAlert({title:"Insufficient Balance",message:`Available balance is ${fmt(avail)}. Not enough.`,color:C.red});return false;}
      }
      if(t.type==="saving"){
        const avail=safeToSpend(t.bankId);
        if(avail<t.amount){HAPTICS.warning();setAppAlert({title:"Insufficient Balance",message:`Available balance is ${fmt(avail)}. Not enough to save.`,color:C.red});return false;}
      }
      if(t.type==="goal_withdraw"||t.type==="goal_return"){
        const saved=goalSaved(t.goalId);
        if(t.amount>saved){HAPTICS.warning();setAppAlert({title:"Insufficient Goal Balance",message:`Goal only has ${fmt(saved)}.`,color:C.red});return false;}
        let rem=t.amount;
        const bpb=getGoalBalancesPerBank(t.goalId);
        const newTxns=[];
        const ts=Date.now();
        for(const[bId,bAmt] of Object.entries(bpb)){
          if(bAmt>0&&rem>0){
            const deduct=Math.min(bAmt,rem);
            const bankObj=banks.find(b=>b.id===bId);
            newTxns.push({...t,id:(ts+newTxns.length).toString(),amount:deduct,bankId:bId,bankName:bankObj?.name||"Unknown",splitGroupId:ts.toString()});
            rem-=deduct;
          }
        }
        if(newTxns.length>0){
          const next=[...newTxns,...txns];
          setTxns(next);await persist(KEYS.txns,next);
          HAPTICS.success();return newTxns[0].id;
        }
      }
      const id=Date.now().toString();
      const next=[{...t,id},...txns];setTxns(next);await persist(KEYS.txns,next);
      HAPTICS.success();return id;
    }finally{setTimeout(()=>{processingRef.current=false;},500);}
  };

  const delTxn=async(id)=>{
    const t=txns.find(x=>x.id===id);
    if(!t)return false;
    if(t.type==="saving"){
      const currentSaved=goalSaved(t.goalId);
      if(currentSaved-t.amount<0){HAPTICS.warning();setAppAlert({title:"Action Blocked",message:"Cannot delete this saving deposit because the funds have already been spent or returned.",color:C.red});return false;}
    }
    const next=t.splitGroupId?txns.filter(x=>x.splitGroupId!==t.splitGroupId):txns.filter(x=>x.id!==id);
    setTxns(next);await persist(KEYS.txns,next);return next;
  };

  const updateTxn=async(id,data)=>{
    const orig=txns.find(t=>t.id===id);if(!orig)return false;
    if(orig.splitGroupId&&data.amount&&data.amount!==orig.amount){HAPTICS.warning();setAppAlert({title:"Split Transaction",message:"This transaction is split across multiple banks. Please delete and recreate it.",color:C.yellow});return false;}
    if(data.amount&&data.amount!==orig.amount){
      if(orig.type==="saving"){
        if(data.amount<orig.amount){const diff=orig.amount-data.amount;if(goalSaved(orig.goalId)-diff<0){HAPTICS.warning();setAppAlert({title:"Action Blocked",message:"Cannot reduce this amount. Funds have already been spent.",color:C.red});return false;}}
        else if(data.amount>orig.amount){const extraNeeded=data.amount-orig.amount;const avail=safeToSpend(orig.bankId);if(avail<extraNeeded){HAPTICS.warning();setAppAlert({title:"Insufficient Balance",message:`Available balance is ${fmt(avail)}. Not enough to increase this saving.`,color:C.red});return false;}}
      }
      if(orig.type==="expense"||orig.type==="transfer"){const checkId=orig.type==="transfer"?(orig.fromBankId||orig.bankId):orig.bankId;const availWithout=safeToSpend(checkId)+orig.amount;if(availWithout<data.amount){HAPTICS.warning();setAppAlert({title:"Insufficient Balance",message:"Not enough balance for this modification.",color:C.red});return false;}}
    }
    const next=txns.map(t=>t.id===id?{...t,...data}:t);setTxns(next);await persist(KEYS.txns,next);return true;
  };

  const saveBanks=async(b)=>{setBanks(b);await persist(KEYS.banks,b);};
  const saveExpCats=async(c)=>{setExpCats(c);await persist(KEYS.expCats,c);};
  const saveIncCats=async(c)=>{setIncCats(c);await persist(KEYS.incCats,c);};
  const saveGroups=async(g)=>{setGroups(g);await persist(KEYS.groups,g);};
  const saveSavings=async(s)=>{setSavings(s);await persist(KEYS.savings,s);};
  const saveBills=async(b)=>{setBills(b);await persist(KEYS.bills,b);};
  const saveInstallments=async(inst)=>{setInstallments(inst);await persist(KEYS.installments,inst);};
  const saveBudgets=async(bdg)=>{setBudgets(bdg);await persist(KEYS.budgets,bdg);};
  const saveQuickActions=async(qa)=>{setQuickActions(qa);await persist(KEYS.quickActions,qa);};
  const saveCurrencyHandler=async(c)=>{if(c===currency)return;setPendingCurrency(c);};
  const confirmCurrencyChange=async()=>{if(!pendingCurrency)return;setCurrencyState(pendingCurrency);setCurrencyGlobal(pendingCurrency);await persist(KEYS.currency,pendingCurrency);setPendingCurrency(null);};
  const saveUsernameHandler=async(n)=>{setUsernameState(n);await persist(KEYS.username,n);};
  const saveThemeHandler=async(t)=>{setThemeState(t);setCGlobal(t);IS=getIS();await persist(KEYS.theme,t);};

  const handleRestorePayload=async(data)=>{
    try{
      if(data.txns){setTxns(data.txns);await persist(KEYS.txns,data.txns);}
      if(data.banks){setBanks(data.banks);await persist(KEYS.banks,data.banks);}
      if(data.expCats){setExpCats(data.expCats);await persist(KEYS.expCats,data.expCats);}
      if(data.incCats){setIncCats(data.incCats);await persist(KEYS.incCats,data.incCats);}
      if(data.groups){setGroups(data.groups);await persist(KEYS.groups,data.groups);}
      if(data.savings){setSavings(data.savings);await persist(KEYS.savings,data.savings);}
      if(data.bills){setBills(data.bills);await persist(KEYS.bills,data.bills);}
      if(data.installments){setInstallments(data.installments);await persist(KEYS.installments,data.installments);}
      if(data.budgets){setBudgets(data.budgets);await persist(KEYS.budgets,data.budgets);}
      if(data.quickActions){setQuickActions(data.quickActions);await persist(KEYS.quickActions,data.quickActions);}
      if(data.currency){setCurrencyState(data.currency);setCurrencyGlobal(data.currency);await persist(KEYS.currency,data.currency);}
      if(data.username){setUsernameState(data.username);await persist(KEYS.username,data.username);}
      const now=Date.now();await save(KEYS.lastBackup,now);setLastBackup(now);
      HAPTICS.success();setAppAlert({title:"Restore Successful",message:"Backup restored successfully!",color:C.accent});
    }catch{HAPTICS.warning();setAppAlert({title:"Restore Failed",message:"Invalid or corrupted backup file.",color:C.red});}
  };

  const completeWelcome=()=>{save(KEYS.seenWelcome,true);setHasSeenWelcome(true);};

  if(showSplash)return <SplashScreen/>;
  if(!hasSeenWelcome){
    if(showPrivacyBeforeWelcome)return <Privacy onBack={()=>setShowPrivacyBeforeWelcome(false)}/>;
    return <WelcomeScreen onStart={completeWelcome} onManual={()=>{completeWelcome();navigateTo("manual");}} onPrivacy={()=>setShowPrivacyBeforeWelcome(true)}/>;
  }

  const curMonth=currentMonth();
  const filteredTxns=filterMonth==="all"?txns:txns.filter(t=>t.date.startsWith(filterMonth));
  const availMonths=[...new Set([curMonth,...txns.map(t=>t.date.slice(0,7))])].sort().reverse();
  const showBackupAlert=!lastBackup||(Date.now()-lastBackup>3*24*60*60*1000);
  const isSubPageActive=ledgerBank||ledgerGroup||ledgerSaving||ledgerBudget||["savings","budgets","quickactions","manual","privacy"].includes(tab);
  const activeSavings=savings.filter(s=>s.status!=="archived");
  const sharedProps={bankBalance,safeToSpend,frozenForBank,goalSaved};

  return <ThemeContext.Provider value={{theme,setTheme:saveThemeHandler}}>
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'DM Sans', sans-serif",maxWidth:520,margin:"0 auto",paddingBottom:isSubPageActive?0:130,position:"relative",userSelect:"none",WebkitUserSelect:"none"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet"/>
      {goalToast&&<GoalToast message={goalToast} onClose={()=>setGoalToast(null)}/>}
      {showBackupAlert&&tab==="dashboard"&&!isSubPageActive&&<div style={{background:C.yellowDim,color:C.yellow,padding:"10px 16px",fontSize:12,fontWeight:700,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>⚠️ {lastBackup?"Over 3 days since last backup!":"Back up your data to keep it safe!"}</span><button onClick={()=>navigateTo("settings")} style={{background:"transparent",border:`1px solid ${C.yellow}`,color:C.yellow,borderRadius:8,padding:"4px 8px",fontSize:10,cursor:"pointer"}}>Backup Now</button></div>}

      {!ledgerBank&&!ledgerGroup&&!ledgerSaving&&!ledgerBudget?(
        <>
          {tab==="dashboard"&&<Dashboard txns={filteredTxns} txnsAll={txns} bills={bills} budgets={budgets} banks={banks} groups={groups} expCats={expCats} savings={activeSavings} filterMonth={filterMonth} setFilterMonth={setFilterMonth} availMonths={availMonths} username={username} {...sharedProps} onDeleteTxn={delTxn} onUpdateTxn={updateTxn} onOpenBank={(b)=>{setScrollState({y:window.scrollY,restore:true});setLedgerBank(b);}} onOpenGroup={(g)=>{setScrollState({y:window.scrollY,restore:true});setLedgerGroup(g);}} onOpenSaving={(s)=>{setScrollState({y:window.scrollY,restore:true});setLedgerSaving(s);}} onOpenBudget={(bdg)=>{setScrollState({y:window.scrollY,restore:true});setLedgerBudget(bdg);}} hideTotal={hideTotal} setHideTotal={setHideTotal} navigateTo={navigateTo} scrollState={scrollState} setScrollState={setScrollState} onBanks={saveBanks} onBudgets={saveBudgets} onSavings={saveSavings} onGroups={saveGroups}/>}
          {tab==="add"&&<AddTransaction banks={banks} expCats={expCats} incCats={incCats} savings={activeSavings} currency={currency} onAdd={addTxn} onDone={()=>navigateTo("dashboard")} {...sharedProps} setAppAlert={setAppAlert} onGoalToast={setGoalToast} txns={txns}/>}
          {tab==="savings"&&<SavingsPage savings={savings} onSave={saveSavings} txns={txns} banks={banks} onBack={()=>navigateTo("settings")} addTxn={addTxn} delTxn={delTxn} onGoalToast={setGoalToast} {...sharedProps} setAppAlert={setAppAlert} onOpenSaving={(s)=>{setScrollState({y:window.scrollY,restore:true});setLedgerSaving(s);}}/>}
          {tab==="history"&&<History txns={txns} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} incCats={incCats} currency={currency} availMonths={availMonths} savings={savings} setAppAlert={setAppAlert}/>}
          {tab==="budgets"&&<BudgetsPage budgets={budgets} expCats={expCats} onSave={saveBudgets} onBack={()=>navigateTo("settings")} currency={currency} txns={txns}/>}
          {tab==="quickactions"&&<QuickActionsSetup quickActions={quickActions} expCats={expCats} banks={banks} onSave={saveQuickActions} onBack={()=>navigateTo("settings")}/>}
          {tab==="manual"&&<UserManual onBack={()=>navigateTo("settings")} navigateTo={navigateTo}/>}
          {tab==="monthly"&&<MonthlyBillsPage bills={bills} installments={installments} onSaveBills={saveBills} onSaveInstallments={saveInstallments} banks={banks} expCats={expCats} onAddTxn={addTxn} delTxn={delTxn} currency={currency} setAppAlert={setAppAlert}/>}
          {tab==="settings"&&<Settings banks={banks} expCats={expCats} incCats={incCats} groups={groups} onBanks={saveBanks} onExpCats={saveExpCats} onIncCats={saveIncCats} onGroups={saveGroups} currency={currency} onCurrency={saveCurrencyHandler} username={username} onUsername={saveUsernameHandler} theme={theme} onTheme={saveThemeHandler} {...sharedProps} onOpenSavings={()=>navigateTo("savings")} onOpenBudgets={()=>navigateTo("budgets")} onOpenQuickActions={()=>navigateTo("quickactions")} onOpenManual={()=>navigateTo("manual")} setLastBackup={setLastBackup} txns={txns} bills={bills} savings={savings} budgets={budgets} onRestore={handleRestorePayload} setAppAlert={setAppAlert} navigateTo={navigateTo}/>}
          {tab==="privacy"&&<Privacy onBack={()=>navigateTo("dashboard")}/>}
          {tab!=="privacy"&&<BottomNav tab={tab} navigateTo={navigateTo} expCats={expCats} banks={banks} savings={activeSavings} onAdd={addTxn} currency={currency} {...sharedProps} setAppAlert={setAppAlert} quickActions={quickActions} txns={txns}/>}
        </>
      ):(
        <>
          {ledgerBank&&<DeepLedgerView title={ledgerBank.name} headerType="bank" headerData={{balance:bankBalance(ledgerBank.id),safe:safeToSpend(ledgerBank.id),frozen:frozenForBank(ledgerBank.id)}} txns={txns.filter(t=>t.bankId===ledgerBank.id||t.fromBankId===ledgerBank.id||t.toBankId===ledgerBank.id)} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} incCats={incCats} onClose={()=>setLedgerBank(null)}/>}
          {ledgerGroup&&(()=>{const spent=txns.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&ledgerGroup.cats.includes(t.catId)).reduce((a,t)=>a+t.amount,0);return <DeepLedgerView title={ledgerGroup.name} headerType="group" headerData={{spent,color:ledgerGroup.color}} txns={txns.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&ledgerGroup.cats.includes(t.catId))} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} incCats={incCats} onClose={()=>setLedgerGroup(null)}/>;})()}
          {ledgerSaving&&(()=>{const saved=goalSaved(ledgerSaving.id);return <SavingDetailView goal={ledgerSaving} saved={saved} txns={txns} onDelete={delTxn} addTxn={addTxn} banks={banks} savings={savings} onSave={saveSavings} onGoalToast={setGoalToast} setAppAlert={setAppAlert} goalSaved={goalSaved} onClose={()=>setLedgerSaving(null)}/>;})()}
          {ledgerBudget&&(()=>{const spent=txns.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&ledgerBudget.cats.includes(t.catId)).reduce((a,t)=>a+t.amount,0);return <DeepLedgerView title={ledgerBudget.name} headerType="budget" headerData={{spent,limit:ledgerBudget.amount}} txns={txns.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&ledgerBudget.cats.includes(t.catId))} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} incCats={incCats} onClose={()=>setLedgerBudget(null)}/>;})()}
        </>
      )}
      {appAlert&&<AlertModal title={appAlert.title} message={appAlert.message} btnColor={appAlert.color} onClose={()=>setAppAlert(null)}/>}
      {pendingCurrency&&<ConfirmModal title="Change Currency?" message={`Switching from ${currency} to ${pendingCurrency} only changes how amounts are displayed. Your actual numbers will NOT be converted.\n\nContinue?`} confirmColor={C.blue} onClose={()=>setPendingCurrency(null)} onConfirm={confirmCurrencyChange}/>}
    </div>
  </ThemeContext.Provider>;
}

function NavBtn({id,icon,label,tab,navigateTo}){
  const a=tab===id;
  return <button onClick={()=>navigateTo(id,false)} style={{background:"none",border:"none",color:a?C.accent:C.muted,display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"4px 0",cursor:"pointer",transition:"color .2s",width:55,fontFamily:"'DM Sans', sans-serif"}}><span style={{fontSize:22}}>{icon}</span><span style={{fontSize:10,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>{label}</span></button>;
}

function BottomNav({tab,navigateTo,expCats,banks,savings,onAdd,currency,safeToSpend,goalSaved,setAppAlert,quickActions,txns}){
  const[showQuick,setShowQuick]=useState(false);
  const[quickForm,setQuickForm]=useState(null);
  const pressTimer=useRef(null);
  const lastUsed=useRef({});
  const active=quickActions.filter(q=>q.catId);
  const pStart=(e)=>{e.preventDefault();pressTimer.current=setTimeout(()=>{HAPTICS.medium();setShowQuick(true);},450);};
  const pEnd=(e)=>{e.preventDefault();clearTimeout(pressTimer.current);if(!showQuick&&!quickForm)navigateTo("add");};
  const spendingGoals=savings.filter(s=>s.spendingMode&&s.status!=="archived");
  const sources=[...banks.map(b=>({id:b.id,label:b.name})),...spendingGoals.map(g=>({id:`goal_${g.id}`,label:`💳 ${g.name}`}))];

  const handleQuickSelect=(s)=>{
    setShowQuick(false);
    const p=lastUsed.current[s.id]||{};
    setQuickForm({catId:s.catId,shortcutId:s.id,amount:p.amount||s.amount||"50",bankId:p.bankId||s.bankId||(sources[0]?.id||""),note:"",date:today()});
  };
  const finishQuickSave=()=>{
    if(quickForm.shortcutId)lastUsed.current[quickForm.shortcutId]={amount:quickForm.amount,bankId:quickForm.bankId};
    setQuickForm(null);navigateTo("dashboard");
  };
  const handleQuickSave=async()=>{
    const amt=parseFloat(quickForm.amount);
    if(!quickForm.amount||isNaN(amt)||amt<=0){setAppAlert({title:"Invalid Amount",message:"Please enter a valid amount.",color:C.red});return;}
    const cat=expCats.find(c=>c.id===quickForm.catId);
    if(quickForm.bankId.startsWith("goal_")){
      const goalId=quickForm.bankId.replace("goal_","");
      const goal=savings.find(g=>g.id===goalId);
      if(!goal)return;
      const saved=goalSaved(goalId);
      const bc={};
      txns.filter(t=>t.goalId===goalId&&t.type==="saving").forEach(t=>{bc[t.bankId]=(bc[t.bankId]||0)+t.amount;});
      txns.filter(t=>t.goalId===goalId&&(t.type==="goal_withdraw"||t.type==="goal_return")).forEach(t=>{bc[t.bankId]=(bc[t.bankId]||0)-t.amount;});
      const topBankId=Object.entries(bc).sort((a,b)=>b[1]-a[1])[0]?.[0]||banks[0]?.id;
      const topBank=banks.find(b=>b.id===topBankId);
      if(amt<=saved){const ok=await onAdd({type:"goal_withdraw",amount:amt,date:quickForm.date,bankId:topBankId,bankName:topBank?.name,goalId:goal.id,goalName:goal.name,catId:quickForm.catId,catName:cat?.name,catIcon:cat?.icon,note:quickForm.note});if(ok!==false)finishQuickSave();}
      else{const shortfall=amt-saved;setAppAlert({title:"Not Enough in Goal",message:`Goal has ${fmt(saved)}.\nShortfall: ${fmt(shortfall)}\nRemaining will be taken from "${topBank?.name}". Continue?`,color:C.yellow,onConfirm:async()=>{const avail=safeToSpend(topBankId);if(avail<shortfall){setAppAlert({title:"Insufficient Balance",message:`"${topBank?.name}" only has ${fmt(avail)} available.`,color:C.red});return;}if(saved>0){await onAdd({type:"goal_withdraw",amount:saved,date:quickForm.date,bankId:topBankId,bankName:topBank?.name,goalId:goal.id,goalName:goal.name,catId:quickForm.catId,catName:cat?.name,catIcon:cat?.icon,note:"Goal portion"});}await onAdd({type:"expense",amount:shortfall,date:quickForm.date,bankId:topBankId,bankName:topBank?.name,catId:quickForm.catId,catName:cat?.name,catIcon:cat?.icon,note:quickForm.note||"Bank portion"});finishQuickSave();}});}
      return;
    }
    const bank=banks.find(b=>b.id===quickForm.bankId);
    const ok=await onAdd({type:"expense",amount:amt,date:quickForm.date,bankId:quickForm.bankId,bankName:bank?.name,catId:quickForm.catId,catName:cat?.name,catIcon:cat?.icon,note:quickForm.note});
    if(ok!==false)finishQuickSave();
  };

  const fieldStyle={width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px",color:C.text,fontSize:16,fontWeight:600,appearance:"none",outline:"none",boxSizing:"border-box",marginBottom:14,colorScheme:C.isDark?"dark":"light"};
  const qTheme="#FF6B6B";

  return <>
    <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,zIndex:50}}>
      <div style={{position:"absolute",bottom:0,width:"100%",height:95,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",padding:"0 12px"}}>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"space-around",paddingRight:48,marginBottom:16}}>
          <NavBtn id="dashboard" icon={ICONS.dashboard} label="Home" tab={tab} navigateTo={navigateTo}/>
          <NavBtn id="monthly" icon={ICONS.bills_nav} label="Bills" tab={tab} navigateTo={navigateTo}/>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"space-around",paddingLeft:48,marginBottom:16}}>
          <NavBtn id="history" icon="☰" label="History" tab={tab} navigateTo={navigateTo}/>
          <NavBtn id="settings" icon={ICONS.settings} label="Settings" tab={tab} navigateTo={navigateTo}/>
        </div>
      </div>
      <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",bottom:38,width:84,height:84,borderRadius:"50%",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <button onTouchStart={pStart} onTouchEnd={pEnd} onMouseDown={pStart} onMouseUp={pEnd} onMouseLeave={()=>clearTimeout(pressTimer.current)} onContextMenu={e=>e.preventDefault()} style={{width:68,height:68,borderRadius:"50%",background:C.accent,color:"#111",fontSize:36,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"transform 0.1s",userSelect:"none",WebkitUserSelect:"none"}} onPointerDown={e=>e.currentTarget.style.transform="scale(0.9)"} onPointerUp={e=>e.currentTarget.style.transform="scale(1)"}>+</button>
      </div>
      {showQuick&&active.length===0&&<div style={{position:"fixed",bottom:135,left:"50%",transform:"translateX(-50%)",background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:"16px 20px",maxWidth:"85%",boxShadow:"0 12px 32px rgba(0,0,0,0.7)",zIndex:60,textAlign:"center"}}><div style={{fontSize:24,marginBottom:8}}>⚡</div><div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:4}}>No shortcuts configured</div><div style={{color:C.muted,fontSize:12}}>Go to Settings → Quick Actions.</div></div>}
      {showQuick&&active.length>0&&<div style={{position:"fixed",bottom:135,left:"50%",transform:"translateX(-50%)",background:C.card,border:`1px solid ${C.border}`,borderRadius:24,padding:"12px",maxWidth:"90%",boxShadow:"0 12px 32px rgba(0,0,0,0.7)",zIndex:60,display:"flex",justifyContent:"center"}}><style>{`@keyframes popIn{from{opacity:0;transform:translate(-50%,14px) scale(0.96)}to{opacity:1;transform:translate(-50%,0) scale(1)}}`}</style><div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"nowrap"}}>{active.map(q=>{const cat=expCats.find(c=>c.id===q.catId);return <button key={q.id} onClick={()=>handleQuickSelect(q)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,width:90,height:90,color:C.text,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,cursor:"pointer",padding:"4px",boxSizing:"border-box",fontFamily:"'DM Sans', sans-serif"}}><span style={{fontSize:26,display:"block",lineHeight:1}}>{ICONS[cat?.icon]||"📌"}</span><span style={{fontSize:10,fontWeight:700,textAlign:"center",width:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cat?.name}</span></button>;})}</div></div>}
    </nav>
    {quickForm&&<Modal title="Quick Add" onClose={()=>setQuickForm(null)} center={false}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24,padding:"16px",background:C.card,borderRadius:16,border:`1px solid ${C.border}`}}>
        <span style={{fontSize:28}}>{ICONS[expCats.find(c=>c.id===quickForm.catId)?.icon]||"📌"}</span>
        <span style={{fontSize:18,fontWeight:700,color:C.text}}>{expCats.find(c=>c.id===quickForm.catId)?.name}</span>
      </div>
      <div style={{textAlign:"center",padding:"10px 0 30px",position:"relative",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{color:C.muted,fontSize:12,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Amount ({currency})</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:60,fontWeight:800,color:quickForm.amount?qTheme:C.faint}}>
          {quickForm.amount&&<span style={{marginRight:10,color:qTheme}}>−</span>}
          <span>{quickForm.amount||"0.00"}</span>
        </div>
        <input type="number" inputMode="decimal" value={quickForm.amount} onChange={e=>setQuickForm({...quickForm,amount:e.target.value})} style={{position:"absolute",inset:0,opacity:0,width:"100%",height:"100%",outline:"none"}}/>
      </div>
      <div>
        <input type="date" value={quickForm.date} onChange={e=>setQuickForm({...quickForm,date:e.target.value})} style={fieldStyle}/>
        <select value={quickForm.bankId} onChange={e=>setQuickForm({...quickForm,bankId:e.target.value})} style={fieldStyle}>
          {sources.map(s=>{const isGoal=String(s.id).startsWith("goal_");const icon=isGoal?"🎯":(s.label.toLowerCase().includes("cash")?"💵":"🏦");const cleanLabel=s.label.replace("💳 ","");return <option key={s.id} value={s.id}>{icon} {cleanLabel}</option>;})}
        </select>
        <input placeholder="Add a note (optional)..." value={quickForm.note} onChange={e=>setQuickForm({...quickForm,note:e.target.value})} style={fieldStyle}/>
      </div>
      <button onClick={handleQuickSave} style={{width:"100%",background:qTheme,border:"none",padding:"18px",borderRadius:16,color:"#fff",fontWeight:800,fontSize:17,cursor:"pointer",transition:"all 0.2s ease",marginTop:8,marginBottom:20}}>Save</button>
    </Modal>}
    {showQuick&&<div onClick={()=>setShowQuick(false)} style={{position:"fixed",inset:0,zIndex:40}}/>}
  </>;
}

function TxnRow({txn,hideTotal,onClick,isTrulyLinked}){
  const isExp=txn.type==="expense"||txn.type==="goal_withdraw";
  const isInc=txn.type==="income"||txn.type==="goal_return";
  const isTrans=txn.type==="transfer";
  const isSav=txn.type==="saving";
  const bg=isExp?C.redDim:isInc?C.accentDim:isTrans?C.blueDim:C.yellowDim;
  const ic=isSav?ICONS.saving:isTrans?ICONS.transfer:txn.type==="goal_withdraw"?"💳":txn.type==="goal_return"?"🏦":ICONS[txn.catIcon]||"📌";
  const baseLabel=isTrans?"Transfer":txn.type==="goal_return"?"Returned to Bank":txn.type==="saving"?"Goal Deposit":txn.catName||txn.type;
  const sub=isTrans?`${txn.bankName} ➔ ${txn.toBankName}`:txn.bankName;
  let goalLine=null;
  if(txn.type==="saving"&&txn.goalName)goalLine=`To Goal: ${txn.goalName}`;
  else if((txn.type==="goal_withdraw"||txn.type==="goal_return")&&txn.goalName)goalLine=`From Goal: ${txn.goalName}`;
  const splitId=txn.splitGroupId?txn.splitGroupId.slice(-3):"";
  const amtColor=isExp?C.red:isInc?C.accent:isTrans?C.blue:C.yellow;
  return <div onClick={onClick} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:C.card,cursor:onClick?"pointer":"default"}}>
    <div style={{display:"flex",gap:10,alignItems:"center"}}>
      <div style={{width:36,height:36,borderRadius:10,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{ic}</div>
      <div>
        <div style={{color:C.text,fontWeight:600,fontSize:14,display:"flex",alignItems:"center"}}>
          {baseLabel}
          {isTrulyLinked&&<span style={{fontSize:11,fontWeight:"normal",color:C.faint,marginLeft:6}}>🔗 #{splitId}</span>}
        </div>
        <div style={{color:C.muted,fontSize:11,marginTop:2}}>{sub} · {fmtDate(txn.date)}</div>
        {goalLine&&<div style={{color:C.faint,fontSize:11,marginTop:2}}>{goalLine}</div>}
        {txn.note&&<div style={{color:C.faint,fontSize:10,marginTop:2}}>📝 {txn.note}</div>}
      </div>
    </div>
    <div style={{color:amtColor,fontWeight:800,fontSize:15}}>{isExp?"−":isInc?"+":""}{hideTotal?"••••":fmt(txn.amount)}</div>
  </div>;
}

function TxnViewModal({txn,onClose}){
  const isExp=txn.type==="expense"||txn.type==="goal_withdraw";
  const isInc=txn.type==="income"||txn.type==="goal_return";
  const isTrans=txn.type==="transfer";
  const isSav=txn.type==="saving";
  const roStyle={width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:13,display:"flex",alignItems:"center",minHeight:36,boxSizing:"border-box"};
  const Field=({label,children})=>(
    <div>
      <div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{label}</div>
      <div style={roStyle}>{children}</div>
    </div>
  );
  const d=new Date(txn.date+"T12:00:00");
  const shortDate=`${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return (
    <Modal title="Transaction Details" onClose={onClose} center={false}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Field label="Amount"><span style={{color:isExp?C.red:isInc?C.accent:isTrans?C.blue:C.yellow,fontWeight:700}}>{isExp?"−":isInc?"+":" "}{fmt(txn.amount)}</span></Field>
          <Field label="Date">{shortDate}</Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Field label={isTrans?"Transfer":"Account"}><span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{isTrans?`${txn.bankName} ➔ ${txn.toBankName}`:txn.bankName}</span></Field>
          <Field label={isTrans?"Type":"Category"}><span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{isTrans?"🔁 Transfer":isSav?"◎ Goal Deposit":txn.type==="goal_withdraw"?"💳 Goal Spending":txn.type==="goal_return"?"🏦 Return to Bank":<>{ICONS[txn.catIcon]||"📌"} {txn.catName}</>}</span></Field>
        </div>
        {(txn.goalName||txn.splitGroupId)&&(
          <div style={{display:"grid",gridTemplateColumns:txn.goalName&&txn.splitGroupId?"1fr 1fr":"1fr",gap:10}}>
            {txn.goalName&&<Field label="Related Goal"><span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>🎯 {txn.goalName}</span></Field>}
            {txn.splitGroupId&&<Field label="Linked Txn">🔗 #{txn.splitGroupId.slice(-3)}</Field>}
          </div>
        )}
        <Field label="Note"><span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{txn.note||<span style={{color:C.faint}}>No note</span>}</span></Field>
      </div>
      <Btn full onClick={onClose} style={{marginTop:16}}>Close</Btn>
    </Modal>
  );
}

function EditTxnModal({txn,banks,expCats,incCats,currency,onSave,onClose}){
  const[amount,setAmount]=useState(String(txn.amount));
  const[date,setDate]=useState(txn.date);
  const[bankId,setBankId]=useState(txn.bankId);
  const[catId,setCatId]=useState(txn.catId||"");
  const[note,setNote]=useState(txn.note||"");
  const cats=txn.type==="expense"?expCats:txn.type==="income"?incCats:[];
  const isSav=txn.type==="saving";
  const is=getIS();
  const handleSave=async()=>{
    const p=parseFloat(amount);if(!amount||isNaN(p)||p<=0)return;
    const bank=banks.find(b=>b.id===bankId);const cat=cats.find(c=>c.id===catId);
    await onSave({amount:p,date,bankId,bankName:bank?.name,catId,catName:cat?.name,catIcon:cat?.icon,note});
  };
  return <Modal title="Edit Transaction" onClose={onClose} center={false}>
    <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Amount</div><Input type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)}/></div>
    <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Date</div><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
    <div style={{opacity:isSav?0.6:1,pointerEvents:isSav?"none":"auto",marginBottom:isSav?4:0}}>
      <Select label="Account" value={bankId} onChange={e=>setBankId(e.target.value)}>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select>
    </div>
    {isSav&&<div style={{color:C.orange,fontSize:11,marginBottom:14,fontWeight:600,lineHeight:1.4}}>⚠️ To change the account, please delete this transaction and create a new one.</div>}
    {cats.length>0&&<Select label="Category" value={catId} onChange={e=>setCatId(e.target.value)}>{cats.map(c=><option key={c.id} value={c.id}>{ICONS[c.icon]} {c.name}</option>)}</Select>}
    <Input label="Note (optional)" value={note} onChange={e=>setNote(e.target.value)}/>
    <Btn full onClick={handleSave}>Save Changes</Btn>
  </Modal>;
}

function Dashboard({txns,txnsAll,bills,budgets,banks,groups,expCats,savings,filterMonth,setFilterMonth,availMonths,username,bankBalance,safeToSpend,frozenForBank,goalSaved,onDeleteTxn,onUpdateTxn,onOpenBank,onOpenGroup,onOpenSaving,onOpenBudget,hideTotal,setHideTotal,navigateTo,scrollState,setScrollState,onBanks,onBudgets,onSavings,onGroups}){
  useEffect(()=>{if(scrollState.restore){setTimeout(()=>window.scrollTo(0,scrollState.y),50);setScrollState(s=>({...s,restore:false}));}else window.scrollTo(0,0);},[]);
  const[recentFilter,setRecentFilter]=useState("all");
  const[viewTxn,setViewTxn]=useState(null);
  const[showCustomize,setShowCustomize]=useState(false);
  const[insightsType,setInsightsType]=useState(null);
  const[balanceMode,setBalanceMode]=useState("total");
  useEffect(()=>{load("et_balance_mode","total").then(setBalanceMode);},[]);

  const defaultOrder=[
    {id:"accounts",label:"🏦 Accounts & Balance"},
    {id:"overview",label:"📊 Income & Cash Flow"},
    {id:"bills",label:"⚡ Monthly Bills"},
    {id:"budgets",label:"📈 Monthly Budgets"},
    {id:"savings",label:"🎯 Savings Goals"},
    {id:"spending",label:"🛍️ Spending Groups"}
  ];
  const[dashOrder,setDashOrder]=useState(defaultOrder);
  useEffect(()=>{load("et_dash_order",defaultOrder).then(setDashOrder);},[]);

  const totalBalance=useMemo(()=>banks.reduce((s,b)=>s+bankBalance(b.id),0),[banks,bankBalance]);
  const totalSafe=useMemo(()=>banks.reduce((s,b)=>s+safeToSpend(b.id),0),[banks,safeToSpend]);
  const totalIncome=useMemo(()=>txns.filter(t=>t.type==="income"||t.type==="goal_return").reduce((a,t)=>a+t.amount,0),[txns]);
  const totalExp=useMemo(()=>txns.filter(t=>t.type==="expense"||t.type==="goal_withdraw").reduce((a,t)=>a+t.amount,0),[txns]);
  const curMonth=new Date().toISOString().slice(0,7);
  const cashFlowPct=totalIncome>0?Math.min(100,Math.round((totalExp/totalIncome)*100)):0;
  const cashFlowColor=cashFlowPct>=90?C.red:cashFlowPct>=70?C.yellow:C.accent;

  const getPrev=(m)=>{const[y,mo]=m.split("-");const d=new Date(+y,+mo-2,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;};
  const prevMonth=filterMonth==="all"?null:getPrev(filterMonth);
  const prevT=prevMonth?txnsAll.filter(t=>t.date.startsWith(prevMonth)):[];
  const prevInc=prevT.filter(t=>t.type==="income"||t.type==="goal_return").reduce((a,t)=>a+t.amount,0);
  const prevExp=prevT.filter(t=>t.type==="expense"||t.type==="goal_withdraw").reduce((a,t)=>a+t.amount,0);
  const incomeDiff=prevInc>0?Math.round(((totalIncome-prevInc)/prevInc)*100):null;
  const expDiff=prevExp>0?Math.round(((totalExp-prevExp)/prevExp)*100):null;

  const isCurrentMonth=filterMonth===curMonth||filterMonth==="all";
  const billsForMonth=isCurrentMonth?curMonth:filterMonth;
  const paidCount=bills.filter(b=>b.payments?.some(p=>p.month===billsForMonth)).length;
  const remainingAmt=bills.filter(b=>!b.payments?.some(p=>p.month===billsForMonth)).reduce((s,b)=>s+b.amount,0);
  const now2=new Date(),daysLeft=Math.max(1,new Date(now2.getFullYear(),now2.getMonth()+1,0).getDate()-now2.getDate()+1);
  const recents=txns.filter(t=>{if(recentFilter==="expenses")return t.type==="expense"||t.type==="goal_withdraw";if(recentFilter==="income")return t.type==="income"||t.type==="goal_return";return true;}).slice(0,5);
  const spendingGroups=groups.filter(g=>txns.filter(tx=>(tx.type==="expense"||tx.type==="goal_withdraw")&&g.cats.includes(tx.catId)).reduce((a,tx)=>a+tx.amount,0)>0);
  const upcomingBills=filterMonth==="all"?bills.filter(b=>!b.payments?.some(p=>p.month===curMonth)).sort((a,b)=>(a.dueDay||99)-(b.dueDay||99)).slice(0,3):null;
  const splitCounts={};
  txnsAll.forEach(t=>{if(t.splitGroupId)splitCounts[t.splitGroupId]=(splitCounts[t.splitGroupId]||0)+1;});
  const expTxns=txns.filter(t=>t.type==="expense"||t.type==="goal_withdraw");
  const incTxns=txns.filter(t=>t.type==="income"||t.type==="goal_return");
  const getTopCats=(txnList,totalAmt)=>{
    const totals={};
    txnList.forEach(t=>{const key=t.catId||t.type;const name=t.catName||(t.type==="goal_withdraw"?"Goal Spending":t.type==="goal_return"?"Returned to Bank":t.type);const icon=t.catIcon||(t.type==="goal_withdraw"?"goal":t.type==="goal_return"?"bank":"others");if(!totals[key])totals[key]={name,icon,amount:0};totals[key].amount+=t.amount;});
    return Object.values(totals).sort((a,b)=>b.amount-a.amount).slice(0,5).map(c=>({...c,pct:totalAmt>0?Math.round((c.amount/totalAmt)*100):0}));
  };
  const topExpCats=getTopCats(expTxns,totalExp);
  const topIncCats=getTopCats(incTxns,totalIncome);
  const biggestExp=expTxns.length?expTxns.reduce((max,t)=>t.amount>max.amount?t:max,expTxns[0]):null;
  const biggestInc=incTxns.length?incTxns.reduce((max,t)=>t.amount>max.amount?t:max,incTxns[0]):null;

  return <div style={{padding:"24px 16px 0"}}>
    {username&&<div style={{marginBottom:18}}><div style={{color:C.muted,fontSize:13,fontWeight:500}}>{(()=>{const h=new Date().getHours();return <>{h<12?"☀️":h<18?"👋":"🌙"} {h<12?"Good morning":h<18?"Good afternoon":"Good evening"},</>; })()}</div><div style={{color:C.text,fontSize:24,fontWeight:800,letterSpacing:-0.5}}>{username} 💰</div></div>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{color:C.text,fontSize:20,fontWeight:800}}>Overview</div><MonthSelect value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} availMonths={availMonths}/></div>

    {txnsAll.length===0&&<div style={{background:C.accentDim,border:`1px solid ${C.accent}44`,borderRadius:16,padding:"20px",marginBottom:20,textAlign:"center"}}><div style={{fontSize:32,marginBottom:10}}>👋</div><div style={{color:C.accent,fontWeight:800,fontSize:16,marginBottom:6}}>Welcome to Saver!</div><div style={{color:C.muted,fontSize:13,lineHeight:1.6}}>Tap <strong style={{color:C.accent}}>＋</strong> to add your first transaction.</div></div>}
    {txnsAll.length>0&&txns.length===0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px",marginBottom:20,textAlign:"center"}}><div style={{fontSize:32,marginBottom:10}}>✨</div><div style={{color:C.text,fontWeight:800,fontSize:16,marginBottom:6}}>Fresh start for {filterMonth!=="all"?MONTHS[+filterMonth.split("-")[1]-1]:"this period"}!</div><div style={{color:C.muted,fontSize:13,lineHeight:1.6}}>No transactions yet. Tap <strong style={{color:C.accent}}>＋</strong> to start tracking.</div></div>}

    {dashOrder.map(section=>{
      if(section.id==="accounts")return(
        <div key="accounts">
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Accounts</div>
          <BalanceCarousel totalBalance={totalBalance} totalSafe={totalSafe} hideTotal={hideTotal} setHideTotal={setHideTotal} initialMode={balanceMode} onModeChange={async(mode)=>{setBalanceMode(mode);await save("et_balance_mode",mode);}}/>
          <div style={{marginBottom:20}}>
            <SortableList grid items={banks} onReorder={onBanks} renderItem={(b)=>{
              const bal=bankBalance(b.id),safe=safeToSpend(b.id),frozen=frozenForBank(b.id),hasFrozen=frozen>0;
              return <Card onClick={()=>onOpenBank(b)} className="ic" style={{padding:"14px 14px 12px",cursor:"pointer",transition:"transform 0.1s ease",height:"100%",boxSizing:"border-box"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:hasFrozen?4:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:99,background:b.color,flexShrink:0}}/><span style={{color:C.muted,fontSize:12,fontWeight:600}}>{b.name}</span></div>
                  {b.lowBalanceThreshold&&safe<=b.lowBalanceThreshold&&safe>=0&&<span style={{fontSize:12}}>🔻</span>}
                  {safe<0&&<span style={{fontSize:12}}>🔴</span>}
                </div>
                <div style={{color:safe<0?C.red:b.lowBalanceThreshold&&safe<=b.lowBalanceThreshold?C.yellow:C.text,fontSize:17,fontWeight:800}}>{hideTotal?"••••":fmt(safe)}</div>
                {hasFrozen&&!hideTotal&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:5}}>
                  <span style={{color:C.muted,fontSize:11}}>{fmt(frozen)}</span>
                  <div style={{display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:11}}>🔒</span><span style={{color:C.muted,fontSize:10,fontWeight:600}}>Saving</span></div>
                </div>}
              </Card>;
            }}/>
          </div>
          <style>{`.ic:active{transform:scale(0.97);opacity:0.9}`}</style>
        </div>
      );
      if(section.id==="overview")return(
        <div key="overview" style={{marginBottom:20}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:totalIncome>0?10:0}}>
            <Card onClick={()=>totalIncome>0&&!hideTotal&&setInsightsType("income")} className="ic" style={{padding:"14px 14px 12px",cursor:totalIncome>0&&!hideTotal?"pointer":"default"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Income</div><div style={{color:C.accent,fontSize:20,fontWeight:800,marginBottom:4}}>{hideTotal?"••••":fmt(totalIncome)}</div>{incomeDiff!==null&&!hideTotal&&<div style={{fontSize:10,fontWeight:700,color:incomeDiff>=0?C.accent:C.red}}>{incomeDiff>=0?"▲":"▼"} {Math.abs(incomeDiff)}% vs last month</div>}</Card>
            <Card onClick={()=>totalExp>0&&!hideTotal&&setInsightsType("expense")} className="ic" style={{padding:"14px 14px 12px",cursor:totalExp>0&&!hideTotal?"pointer":"default"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Expenses</div><div style={{color:C.red,fontSize:20,fontWeight:800,marginBottom:4}}>{hideTotal?"••••":fmt(totalExp)}</div>{expDiff!==null&&!hideTotal&&<div style={{fontSize:10,fontWeight:700,color:expDiff<=0?C.accent:C.red}}>{expDiff<=0?"▼":"▲"} {Math.abs(expDiff)}% vs last month</div>}</Card>
          </div>
          {totalIncome>0&&!hideTotal&&<div style={{background:C.card,padding:"12px 16px",borderRadius:14,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:C.muted,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Cash Flow</span><span style={{color:cashFlowColor,fontSize:12,fontWeight:700}}>{cashFlowPct}% Spent</span></div>
            <ProgressBar value={totalExp} max={totalIncome} color={cashFlowColor} allowOver/>
          </div>}
        </div>
      );
      if(section.id==="bills"&&bills.length>0)return(
        <div key="bills">
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Monthly Bills</div>
          <Card onClick={()=>navigateTo("monthly",true)} className="ic" style={{padding:"14px 14px 12px",marginBottom:20,cursor:"pointer",transition:"transform 0.1s ease"}}>
            {filterMonth==="all"&&upcomingBills!==null?(
              upcomingBills.length===0?<div style={{color:C.accent,fontWeight:700,fontSize:14}}>✅ All bills paid this month!</div>:(
                <><div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:10}}>⚡ Upcoming Bills</div>
                {upcomingBills.map(b=><div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:8,marginBottom:8,borderBottom:`1px solid ${C.border}`}}><div><div style={{color:C.text,fontSize:13,fontWeight:600}}>{b.name}</div>{b.dueDay&&<div style={{color:C.muted,fontSize:11}}>Due {b.dueDay}{b.dueDay===1?"st":b.dueDay===2?"nd":b.dueDay===3?"rd":"th"}</div>}</div><span style={{color:C.red,fontWeight:800,fontSize:14}}>{hideTotal?"••••":fmt(b.amount)}</span></div>)}</>
              )
            ):(()=>{const allPaid=paidCount===bills.length,col=allPaid?C.accent:C.red;return <><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{color:C.text,fontWeight:700,fontSize:14}}>{allPaid?"✅":"⚡"} {allPaid?"All Bills Paid":"Upcoming Payments"}</span><Pill color={col}>{paidCount}/{bills.length} Paid</Pill></div><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:col,fontSize:18,fontWeight:800}}>{hideTotal?"••••":allPaid?fmt(0):fmt(remainingAmt)}</span><span style={{color:C.muted,fontSize:13}}>{allPaid?"cleared ✓":"remaining"}</span></div><ProgressBar value={paidCount} max={bills.length} color={col}/></>;})()}
          </Card>
        </div>
      );
      if(section.id==="budgets"&&budgets.length>0)return(
        <div key="budgets">
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Monthly Budgets</div>
          <div style={{marginBottom:20}}>
            <SortableList items={budgets} onReorder={onBudgets} renderItem={(bdg)=>{
              const targetMonth=filterMonth==="all"?curMonth:filterMonth;
              const allExp=txnsAll.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&bdg.cats.includes(t.catId));
              const spent=allExp.filter(t=>t.date.startsWith(targetMonth)).reduce((a,t)=>a+t.amount,0);
              if(filterMonth==="all"){
                const months=[...new Set(allExp.map(t=>t.date.slice(0,7)))];
                const avg=months.length>0?allExp.reduce((a,t)=>a+t.amount,0)/months.length:0;
                const totalAllExp=txnsAll.filter(t=>t.type==="expense"||t.type==="goal_withdraw").reduce((a,t)=>a+t.amount,0);
                const histPct=totalAllExp>0?Math.round((allExp.reduce((a,t)=>a+t.amount,0)/totalAllExp)*100):0;
                return <Card onClick={()=>onOpenBudget(bdg)} className="ic" style={{padding:"14px",cursor:"pointer",transition:"transform 0.1s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{color:C.text,fontSize:14,fontWeight:700}}>{bdg.name}</span><Pill color={C.blue}>{histPct}% of all expenses</Pill></div><div style={{color:C.muted,fontSize:11}}>Monthly avg: <span style={{color:C.text,fontWeight:700}}>{hideTotal?"••••":fmt(avg)}</span></div></Card>;
              }
              const rem=Math.max(0,bdg.amount-spent);const pct=bdg.amount>0?Math.min(100,Math.round((spent/bdg.amount)*100)):0;const barColor=pct>=90?C.red:pct>=70?C.yellow:C.accent;
              return <Card onClick={()=>onOpenBudget(bdg)} className="ic" style={{padding:"14px",cursor:"pointer",transition:"transform 0.1s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{color:C.text,fontSize:14,fontWeight:700}}>{bdg.name}</span><Pill color={barColor}>{pct}%</Pill></div><div style={{color:C.muted,fontSize:11,marginBottom:6}}>Spent <span style={{color:C.text,fontWeight:700}}>{hideTotal?"••••":fmt(spent)}</span> of {hideTotal?"••••":fmt(bdg.amount)}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{color:rem===0?C.red:C.accent,fontSize:18,fontWeight:800}}>{hideTotal?"••••":fmt(rem)} left</span><span style={{color:C.muted,fontSize:11}}>Daily: {fmt(rem/daysLeft)}</span></div><ProgressBar value={spent} max={bdg.amount} color={barColor}/></Card>;
            }}/>
          </div>
        </div>
      );
      if(section.id==="savings"&&savings.length>0)return(
        <div key="savings">
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Savings Goals</div>
          <div style={{marginBottom:20}}>
            <SortableList items={savings} onReorder={onSavings} renderItem={(s)=>{
              const saved=goalSaved(s.id),pct=s.goal?Math.min(110,Math.round((saved/s.goal)*100)):0,isSpending=s.spendingMode;
              const mainColor=isSpending?C.orange:C.yellow;
              return <Card onClick={()=>onOpenSaving(s)} className="ic" style={{padding:"14px 14px 12px",cursor:"pointer",transition:"transform 0.1s ease",border:`1px solid ${isSpending?C.orange+"66":C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{color:C.text,fontWeight:700,fontSize:14}}>{isSpending?"💳":"🎯"} {s.name}</span>{isSpending&&<Pill color={C.orange} style={{fontSize:10}}>Spending</Pill>}</div>
                  <Pill color={pct>=100?C.accent:mainColor}>{pct}%</Pill>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:mainColor,fontSize:18,fontWeight:800}}>{hideTotal?"••••":fmt(saved)}</span><span style={{color:C.muted,fontSize:13}}>of {fmt(s.goal)}</span></div>
                <ProgressBar value={saved} max={s.goal} color={mainColor} allowOver/>
              </Card>;
            }}/>
          </div>
        </div>
      );
      if(section.id==="spending"&&spendingGroups.length>0)return(
        <div key="spending">
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Spending</div>
          <div style={{marginBottom:20}}>
            <SortableList grid items={spendingGroups} onReorder={(ord)=>{const m=[...groups];ord.forEach((og,i)=>{const idx=m.findIndex(g=>g.id===og.id);if(idx>-1){m.splice(idx,1);m.splice(i,0,og);}});onGroups(m);}} renderItem={(g)=>{
              const gtxns=txns.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&g.cats.includes(t.catId));
              const total=gtxns.reduce((a,t)=>a+t.amount,0);
              const pct=totalExp?Math.round((total/totalExp)*100):0;
              const months=filterMonth==="all"?[...new Set(gtxns.map(t=>t.date.slice(0,7)))].length||1:1;
              const display=filterMonth==="all"?total/months:total;
              return <Card onClick={()=>onOpenGroup(g)} className="ic" style={{padding:"14px 14px 12px",cursor:"pointer",transition:"transform 0.1s ease",height:"100%",boxSizing:"border-box"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><div style={{width:8,height:8,borderRadius:99,background:g.color}}/><span style={{color:C.muted,fontSize:12,fontWeight:600}}>{g.name}</span></div>
                <div style={{color:g.color,fontSize:17,fontWeight:800,marginBottom:2}}>{hideTotal?"••••":fmt(display)}</div>
                {filterMonth==="all"&&<div style={{color:C.faint,fontSize:10,marginBottom:4}}>Average / month</div>}
                {filterMonth!=="all"&&<><ProgressBar value={total} max={totalExp} color={g.color}/><div style={{color:C.faint,fontSize:10,fontWeight:700,marginTop:4}}>{pct}% of total</div></>}
              </Card>;
            }}/>
          </div>
        </div>
      );
      return null;
    })}

    <div style={{marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Recent Transactions</div>
      <div style={{display:"flex",gap:4}}>{["all","expenses","income"].map(f=><button key={f} onClick={()=>setRecentFilter(f)} style={{background:"none",border:"none",padding:"2px 6px",color:recentFilter===f?C.accent:C.muted,fontSize:10,fontWeight:700,cursor:"pointer",textTransform:"uppercase",fontFamily:"'DM Sans', sans-serif"}}>{f}</button>)}</div>
    </div>
    {recents.length>0?(
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {recents.map(t=>{const isTrulyLinked=t.splitGroupId&&splitCounts[t.splitGroupId]>1;return <div key={t.id} style={{borderRadius:12,overflow:"hidden"}}><TxnRow txn={t} hideTotal={hideTotal} onClick={()=>setViewTxn(t)} isTrulyLinked={isTrulyLinked}/></div>;})}
      </div>
    ):<div style={{padding:"20px 0",textAlign:"center",color:C.faint,fontSize:12,marginBottom:20}}>No transactions match.</div>}

    <div style={{textAlign:"center",marginBottom:20}}>
      <button onClick={()=>setShowCustomize(true)} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.text,padding:"10px 20px",borderRadius:99,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>⚙️ Customize Layout</button>
    </div>

    {viewTxn&&<TxnViewModal txn={viewTxn} onClose={()=>setViewTxn(null)}/>}

    {insightsType&&(
      <Modal title={insightsType==="expense"?"Expense Breakdown":"Income Breakdown"} onClose={()=>setInsightsType(null)} center={false}>
        {(insightsType==="expense"?biggestExp:biggestInc)&&(
          <div style={{marginBottom:24}}>
            <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{insightsType==="expense"?"Highest Expense":"Highest Income"}</div>
            <div style={{background:insightsType==="expense"?C.redDim:C.accentDim,border:`1px solid ${insightsType==="expense"?C.red:C.accent}44`,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:14}}>
              <div style={{fontSize:28,width:48,height:48,borderRadius:12,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>{ICONS[(insightsType==="expense"?biggestExp:biggestInc).catIcon]||(insightsType==="expense"?"💳":"💰")}</div>
              <div style={{flex:1}}><div style={{color:C.text,fontWeight:700,fontSize:15}}>{(insightsType==="expense"?biggestExp:biggestInc).catName||(insightsType==="expense"?biggestExp:biggestInc).type}</div><div style={{color:C.muted,fontSize:12,marginTop:4}}>{fmtDate((insightsType==="expense"?biggestExp:biggestInc).date)}</div></div>
              <div style={{color:insightsType==="expense"?C.red:C.accent,fontWeight:800,fontSize:18}}>{insightsType==="expense"?"−":"+"}{fmt((insightsType==="expense"?biggestExp:biggestInc).amount)}</div>
            </div>
          </div>
        )}
        {(insightsType==="expense"?topExpCats:topIncCats).length>0&&(
          <div>
            <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Top Categories</div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px",display:"flex",flexDirection:"column",gap:16}}>
              {(insightsType==="expense"?topExpCats:topIncCats).map((c,i)=>(
                <div key={i}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>{ICONS[c.icon]||"📌"}</span><span style={{color:C.text,fontSize:14,fontWeight:600}}>{c.name}</span></div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{color:C.text,fontSize:14,fontWeight:800}}>{fmt(c.amount)}</span><span style={{color:C.muted,fontSize:12,width:32,textAlign:"right",fontWeight:700}}>{c.pct}%</span></div>
                  </div>
                  <ProgressBar value={c.pct} max={100} color={insightsType==="expense"?C.red:C.accent}/>
                </div>
              ))}
            </div>
          </div>
        )}
        <Btn full onClick={()=>setInsightsType(null)} style={{marginTop:20}}>Close Insights</Btn>
      </Modal>
    )}

    {showCustomize&&<Modal title="Customize Dashboard" onClose={()=>setShowCustomize(false)} center={false}>
      <p style={{color:C.muted,fontSize:13,marginBottom:16}}>Drag and drop to reorder the sections on your home screen.</p>
      <div style={{marginBottom:20}}>
        <SortableList items={dashOrder} onReorder={setDashOrder} renderItem={(item)=>(
          <div style={{padding:"14px 16px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:8,display:"flex",alignItems:"center",gap:14,cursor:"grab"}}>
            <span style={{color:C.faint,fontSize:20}}>≡</span>
            <span style={{color:C.text,fontWeight:700,fontSize:15}}>{item.label}</span>
          </div>
        )}/>
      </div>
      <Btn full onClick={async()=>{await save("et_dash_order",dashOrder);setShowCustomize(false);HAPTICS.success();}}>Save Layout</Btn>
    </Modal>}
  </div>;
}

function LedgerHeader({type,data}){
  if(!type||!data)return null;
  if(type==="bank"){const neg=data.safe<0,hF=data.frozen>0;return <div style={{marginBottom:20,padding:"16px 18px",background:C.card,border:`1px solid ${C.border}`,borderRadius:16}}><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:6}}>Available Balance</div><div style={{color:neg?C.red:C.accent,fontSize:32,fontWeight:800,letterSpacing:-1}}>{fmt(data.safe??data.balance)}</div>{hF&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:6,padding:"8px 10px",background:C.yellowDim,borderRadius:8}}><span style={{color:C.yellow,fontSize:12}}>{fmt(data.frozen)}</span><div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:12}}>🔒</span><span style={{color:C.yellow,fontSize:11,fontWeight:600}}>Saving</span></div></div>}</div>;}
  if(type==="group")return <div style={{marginBottom:20,padding:"16px 18px",background:C.card,border:`1px solid ${C.border}`,borderRadius:16}}><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:6}}>Total Spent</div><div style={{color:data.color||C.purple,fontSize:32,fontWeight:800,letterSpacing:-1}}>{fmt(data.spent)}</div></div>;
  if(type==="saving"){const pct=data.goal>0?Math.min(110,Math.round((data.saved/data.goal)*100)):0,left=Math.max(0,data.goal-data.saved);return <div style={{marginBottom:20,padding:"16px 18px",background:C.card,border:`1px solid ${C.border}`,borderRadius:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><div><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:6}}>Saved</div><div style={{color:C.yellow,fontSize:28,fontWeight:800,letterSpacing:-0.5}}>{fmt(data.saved)}</div></div><div style={{textAlign:"right"}}><div style={{color:C.faint,fontSize:11,marginBottom:4}}>of {fmt(data.goal)}</div><div style={{color:C.muted,fontSize:12,fontWeight:600}}>{fmt(left)} left</div></div></div><ProgressBar value={data.saved} max={data.goal} color={C.yellow} allowOver/><div style={{color:C.faint,fontSize:10,fontWeight:700,marginTop:5,textAlign:"right"}}>{pct}% complete</div></div>;}
  if(type==="budget"){const rem=Math.max(0,data.limit-data.spent),pct=data.limit>0?Math.min(100,Math.round((data.spent/data.limit)*100)):0,bc=pct>=90?C.red:pct>=70?C.yellow:C.accent;return <div style={{marginBottom:20,padding:"16px 18px",background:C.card,border:`1px solid ${C.border}`,borderRadius:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}><div><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:6}}>Spent</div><div style={{color:C.red,fontSize:28,fontWeight:800,letterSpacing:-0.5}}>{fmt(data.spent)}</div></div><div style={{textAlign:"right"}}><div style={{color:C.faint,fontSize:11,marginBottom:4}}>of {fmt(data.limit)}</div><div style={{color:rem===0?C.red:C.accent,fontSize:15,fontWeight:700}}>{fmt(rem)} left</div></div></div><ProgressBar value={data.spent} max={data.limit} color={bc}/><div style={{color:C.faint,fontSize:10,fontWeight:700,marginTop:5,textAlign:"right"}}>{pct}% of budget used</div></div>;}
  return null;
}

function DeepLedgerView({title,headerType,headerData,txns,onDelete,onUpdate,banks,expCats,incCats,onClose}){
  const[filter,setFilter]=useState("all");const[confirmId,setConfirmId]=useState(null);const[editTxn,setEditTxn]=useState(null);const[viewTxn,setViewTxn]=useState(null);
  const[localAlert,setLocalAlert]=useState(null);
  useEffect(()=>{requestAnimationFrame(()=>window.scrollTo(0,0));},[title]);
  const list=txns.filter(t=>{if(filter==="in")return t.type==="income"||t.type==="goal_return";if(filter==="out")return t.type==="expense"||t.type==="saving"||t.type==="goal_withdraw";return true;});
  const handleEditClick=(t)=>{
    if(t.splitGroupId){setLocalAlert({title:"Linked Transaction 🔗",message:"Cannot edit a split transaction. Please delete and recreate it.",color:C.yellow});return;}
    if(t.type==="goal_withdraw"||t.type==="goal_return"){setLocalAlert({title:"Action Not Allowed",message:"Goal spending and returns cannot be edited directly. Please delete and recreate.",color:C.orange});return;}
    if(t.type==="transfer"){setLocalAlert({title:"Action Not Allowed",message:"Transfers cannot be edited directly. Please delete and recreate.",color:C.blue});return;}
    setEditTxn(t);
  };
  return <div style={{padding:"24px 16px",minHeight:"100vh",background:C.bg,boxSizing:"border-box"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><span style={{color:C.text,fontWeight:800,fontSize:22}}>{title}</span><button onClick={onClose} style={{background:C.card,border:`1px solid ${C.border}`,color:C.muted,width:44,height:44,borderRadius:99,cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button></div>
    <LedgerHeader type={headerType} data={headerData}/>
    <div style={{display:"flex",gap:6,marginBottom:18}}>{["all","in","out"].map(f=><button key={f} onClick={()=>setFilter(f)} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${filter===f?C.accent:C.border}`,background:filter===f?C.accentDim:"transparent",color:filter===f?C.accent:C.muted,fontWeight:700,fontSize:11,cursor:"pointer",textTransform:"uppercase",fontFamily:"'DM Sans', sans-serif"}}>{f}</button>)}</div>
    <div style={{display:"flex",flexDirection:"column",gap:2}}>
      {list.length===0&&<div style={{padding:"40px 0",textAlign:"center",color:C.faint,fontSize:13}}>No transactions found.</div>}
      {list.map(t=><SwipeRow key={t.id} onEdit={()=>handleEditClick(t)} onDelete={()=>setConfirmId(t.id)}><TxnRow txn={t} hideTotal={false} onClick={()=>setViewTxn(t)}/></SwipeRow>)}
    </div>
    {confirmId&&<ConfirmModal title={txns.find(x=>x.id===confirmId)?.splitGroupId?"Delete Linked Transactions?":"Delete Transaction?"} message={txns.find(x=>x.id===confirmId)?.splitGroupId?"This transaction is split. Deleting it will remove ALL linked parts.":"This will permanently remove the record and update all balances instantly."} onClose={()=>setConfirmId(null)} onConfirm={()=>{onDelete(confirmId);setConfirmId(null);}}/>}
    {editTxn&&<EditTxnModal txn={editTxn} banks={banks} expCats={expCats} incCats={incCats||expCats} currency={_currency} onSave={async(data)=>{const ok=await onUpdate(editTxn.id,data);if(ok)setEditTxn(null);}} onClose={()=>setEditTxn(null)}/>}
    {viewTxn&&<TxnViewModal txn={viewTxn} onClose={()=>setViewTxn(null)}/>}
    {localAlert&&<AlertModal title={localAlert.title} message={localAlert.message} btnColor={localAlert.color} onClose={()=>setLocalAlert(null)}/>}
  </div>;
}

function SavingDetailView({goal,saved,txns,onDelete,addTxn,banks,savings,onSave,onGoalToast,setAppAlert,goalSaved,onClose}){
  useEffect(()=>{window.scrollTo(0,0);},[]);
  const[confirmAction,setConfirmAction]=useState(null);
  const[withdrawModal,setWithdrawModal]=useState(false);
  const[withdrawAmt,setWithdrawAmt]=useState("");
  const[viewTxn,setViewTxn]=useState(null);
  const currentGoal=savings.find(s=>s.id===goal.id)||goal;
  const isArchived=currentGoal.status==="archived";
  const isSpending=currentGoal.spendingMode;
  const pct=currentGoal.goal>0?Math.min(110,Math.round((saved/currentGoal.goal)*100)):0;
  const goalTxns=txns.filter(t=>t.goalId===currentGoal.id);

  const handleToggleSpending=()=>{
    const enabling=!isSpending;
    setConfirmAction({type:"spending",title:enabling?"Start Spending Mode?":"Stop Spending Mode?",message:enabling?"This will make the goal available as a payment source.\n\nYou can spend directly from this goal's balance.":"This will remove the goal from the payment sources list.\n\nYour saved balance stays safe.",color:enabling?C.accent:C.orange,onConfirm:async()=>{await onSave(savings.map(s=>s.id===currentGoal.id?{...s,spendingMode:!isSpending}:s));HAPTICS.success();}});
  };
  const handleWithdraw=async()=>{
    const amt=parseFloat(withdrawAmt);if(!amt||isNaN(amt)||amt<=0)return;
    if(amt>saved){setAppAlert({title:"Insufficient Balance",message:`Goal only has ${fmt(saved)}.`,color:C.red});return;}
    const ok=await addTxn({type:"goal_return",amount:amt,date:today(),bankId:banks[0]?.id,goalId:currentGoal.id,goalName:currentGoal.name,catId:"",catName:"Returned to Bank",catIcon:"saving"});
    if(ok!==false){setWithdrawModal(false);setWithdrawAmt("");}
  };
  const handleArchive=()=>{
    setConfirmAction({type:"archive",title:"Complete & Archive Goal?",message:`This will close "${currentGoal.name}".\n\n${saved>0?`The remaining ${fmt(saved)} will be returned to your accounts.`:"No remaining balance."}\n\nThe goal will move to the Archived tab.`,color:C.accent,onConfirm:async()=>{if(saved>0)await addTxn({type:"goal_return",amount:saved,date:today(),bankId:banks[0]?.id,goalId:currentGoal.id,goalName:currentGoal.name,catName:"Goal Archived",catIcon:"saving"});await onSave(savings.map(s=>s.id===currentGoal.id?{...s,status:"archived",spendingMode:false}:s));HAPTICS.success();onClose();}});
  };
  const handleDelete=()=>{
    setConfirmAction({type:"delete",title:"Delete Goal?",message:`This will permanently delete "${currentGoal.name}".\n\n${saved>0?`The remaining ${fmt(saved)} will be safely returned to your accounts first.`:""}\n\nAll linked transactions will remain in your history.`,color:C.red,onConfirm:async()=>{if(saved>0)await addTxn({type:"goal_return",amount:saved,date:today(),bankId:banks[0]?.id,goalId:currentGoal.id,goalName:currentGoal.name,catName:"Goal Deleted",catIcon:"saving"});await onSave(savings.filter(s=>s.id!==currentGoal.id));HAPTICS.success();onClose();}});
  };
  const handleUnarchive=()=>{
    setConfirmAction({type:"unarchive",title:"Reactivate Goal?",message:"This will move the goal back to your Active list.",color:C.accent,onConfirm:async()=>{await onSave(savings.map(s=>s.id===currentGoal.id?{...s,status:"active"}:s));HAPTICS.success();onClose();}});
  };

  return <div style={{padding:"24px 16px",minHeight:"100vh",background:C.bg,boxSizing:"border-box"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <span style={{color:C.text,fontWeight:800,fontSize:22}}>{isSpending?"💳":isArchived?"🗃️":"🎯"} {currentGoal.name}</span>
      <button onClick={onClose} style={{background:C.card,border:`1px solid ${C.border}`,color:C.muted,width:44,height:44,borderRadius:99,cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
    </div>
    {isArchived&&<div style={{background:C.blueDim,border:`1px solid ${C.blue}44`,borderRadius:12,padding:"12px 14px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>🗃️</span><span style={{color:C.blue,fontSize:13,fontWeight:600}}>This goal is archived. You can view its history, or reactivate it to resume saving.</span></div>}
    <div style={{background:C.card,border:`1px solid ${isSpending?C.orange+"66":C.border}`,borderRadius:16,padding:"16px 18px",marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:6}}>Saved</div><div style={{color:isArchived?C.muted:isSpending?C.orange:C.yellow,fontSize:28,fontWeight:800,letterSpacing:-0.5}}>{fmt(saved)}</div></div>
        <div style={{textAlign:"right"}}><div style={{color:C.faint,fontSize:11,marginBottom:4}}>of {fmt(currentGoal.goal)}</div><Pill color={pct>=100?C.accent:isArchived?C.faint:C.yellow}>{pct}%</Pill></div>
      </div>
      <ProgressBar value={saved} max={currentGoal.goal} color={isArchived?C.faint:isSpending?C.orange:C.yellow} allowOver/>
    </div>
    {!isArchived?(
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
        <button onClick={handleToggleSpending} style={{width:"100%",background:isSpending?C.orange+"22":C.accent+"22",border:`1.5px solid ${isSpending?C.orange:C.accent}`,color:isSpending?C.orange:C.accent,borderRadius:12,padding:"14px 0",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>{isSpending?"⏹ Stop Spending Mode":"💳 Start Spending Mode"}</button>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setWithdrawModal(true)} style={{flex:1,background:C.blueDim,border:`1.5px solid ${C.blue}`,color:C.blue,borderRadius:10,padding:"11px 0",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>🏦 Return to Bank</button>
          <button onClick={handleArchive} style={{flex:1,background:C.accentDim,border:`1.5px solid ${C.accent}`,color:C.accent,borderRadius:10,padding:"11px 0",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>🗃️ Complete & Archive</button>
        </div>
        <button onClick={handleDelete} style={{width:"100%",background:"transparent",border:`1px solid ${C.redDim}`,color:C.red,borderRadius:10,padding:"9px 0",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans', sans-serif",marginTop:4}}>🗑 Delete Goal</button>
      </div>
    ):(
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
        <button onClick={handleUnarchive} style={{width:"100%",background:C.accentDim,border:`1.5px solid ${C.accent}`,color:C.accent,borderRadius:10,padding:"12px 0",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>🔄 Reactivate Goal</button>
        <button onClick={handleDelete} style={{width:"100%",background:"transparent",border:`1px solid ${C.redDim}`,color:C.red,borderRadius:10,padding:"9px 0",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>🗑 Permanently Delete</button>
      </div>
    )}
    <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>History</div>
    {goalTxns.length===0?<EmptyState icon="◎" message="No transactions yet."/>:(
      <div style={{display:"flex",flexDirection:"column",gap:2}}>
        {goalTxns.map(t=><div key={t.id} style={{borderRadius:12,overflow:"hidden"}}><TxnRow txn={t} hideTotal={false} onClick={()=>setViewTxn(t)}/></div>)}
      </div>
    )}
    {withdrawModal&&<Modal title="Return to Bank" onClose={()=>setWithdrawModal(false)} center={false}>
      <div style={{background:C.blueDim,border:`1px solid ${C.blue}44`,borderRadius:12,padding:"12px 14px",marginBottom:16}}><div style={{color:C.blue,fontSize:13,fontWeight:700}}>🏦 Return to Bank</div><div style={{color:C.muted,fontSize:12,marginTop:4}}>Funds will automatically return to the bank accounts they were saved from.</div></div>
      <div style={{color:C.muted,fontSize:13,marginBottom:14}}>Available to return: <strong style={{color:C.yellow}}>{fmt(saved)}</strong></div>
      <Input label="Amount to return" type="number" step="any" placeholder="0.00" value={withdrawAmt} onChange={e=>setWithdrawAmt(e.target.value)}/>
      <div style={{display:"flex",gap:10}}><Btn outline color={C.muted} full onClick={()=>setWithdrawModal(false)}>Cancel</Btn><Btn color={C.blue} full onClick={handleWithdraw}>Return Funds</Btn></div>
    </Modal>}
    {confirmAction&&<ConfirmModal title={confirmAction.title} message={confirmAction.message} confirmColor={confirmAction.color} onClose={()=>setConfirmAction(null)} onConfirm={()=>{confirmAction.onConfirm();setConfirmAction(null);}}/>}
    {viewTxn&&<TxnViewModal txn={viewTxn} onClose={()=>setViewTxn(null)}/>}
  </div>;
}

function AddTransaction({banks,expCats,incCats,savings,currency,onAdd,onDone,safeToSpend,goalSaved,setAppAlert,onGoalToast,txns}){
  const[type,setType]=useState("expense");
  const[amount,setAmount]=useState("");
  const[sourceId,setSourceId]=useState(banks[0]?.id||"");
  const[toBankId,setToBankId]=useState(banks.length>1?banks[1]?.id:banks[0]?.id||"");
  const[catId,setCatId]=useState(expCats[0]?.id||"");
  const[note,setNote]=useState("");
  const[savingId,setSavingId]=useState(savings[0]?.id||"");
  const[txnDate,setTxnDate]=useState(today());
  useEffect(()=>{if(!savingId&&savings.length>0)setSavingId(savings[0].id);},[savings]);
  const cats=type==="expense"?expCats:type==="income"?incCats:[];
  const activeGoals=savings.filter(s=>s.status!=="archived");
  const spendingGoals=activeGoals.filter(s=>s.spendingMode);
  const theme=type==="expense"?"#FF6B6B":type==="income"?"#48C78E":type==="saving"?"#F4B942":"#4D96FF";
  const getBankIcon=(name)=>{if(!name)return"🏦";return name.toLowerCase().includes("cash")?"💵":"🏦";};
  const fieldStyle={width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px",color:C.text,fontSize:16,fontWeight:600,appearance:"none",outline:"none",boxSizing:"border-box",marginBottom:14,colorScheme:C.isDark?"dark":"light",fontFamily:"'DM Sans', sans-serif"};
  const handleSubmit=async()=>{
    const amt=parseFloat(amount);
    if(!amount||isNaN(amt)||amt<=0){setAppAlert({title:"Invalid Amount",message:"Please enter a valid amount.",color:C.red});return;}
    if(type==="saving"&&!savingId){setAppAlert({title:"No Goal",message:"Please select a savings goal.",color:C.red});return;}
    const bank=banks.find(b=>b.id===sourceId);
    if(type==="expense"&&!sourceId.startsWith("goal_")&&bank&&amt>safeToSpend(bank.id)){setAppAlert({title:"Insufficient Funds",message:`Available: ${fmt(safeToSpend(bank.id))}`,color:C.red});return;}
    let ok=false;
    if(type==="transfer"){
      if(sourceId===toBankId){setAppAlert({title:"Error",message:"Cannot transfer to same account",color:C.red});return;}
      const fromBank=banks.find(b=>b.id===sourceId);const toBank=banks.find(b=>b.id===toBankId);
      ok=await onAdd({type:"transfer",amount:amt,date:txnDate,bankId:sourceId,fromBankId:sourceId,toBankId,bankName:fromBank?.name,toBankName:toBank?.name,note});
    }else if(type==="saving"){
      ok=await onAdd({type:"saving",amount:amt,date:txnDate,bankId:sourceId,bankName:bank?.name,goalId:savingId,catName:savings.find(s=>s.id===savingId)?.name,catIcon:"saving",note});
      if(ok!==false){setAmount("");if(onGoalToast){const goal=savings.find(s=>s.id===savingId);const prevSaved=goalSaved(savingId);const newSaved=prevSaved+amt;const pct=goal?.goal>0?Math.round((newSaved/goal.goal)*100):0;const msg=getGoalMessage(pct);if(msg)onGoalToast(msg);}onDone();}
      return;
    }else if(type==="expense"&&sourceId.startsWith("goal_")){
      const goalId=sourceId.replace("goal_","");const goal=savings.find(s=>s.id===goalId);const saved=goalSaved(goalId);
      if(!goal){setAppAlert({title:"Error",message:"Goal not found.",color:C.red});return;}
      if(amt>saved){setAppAlert({title:"Insufficient Goal Balance",message:`Goal only has ${fmt(saved)}.`,color:C.red});return;}
      const cat=cats.find(c=>c.id===catId);
      ok=await onAdd({type:"goal_withdraw",amount:amt,date:txnDate,goalId:goal.id,goalName:goal.name,catId,catName:cat?.name,catIcon:cat?.icon,note});
    }else{
      const cat=cats.find(c=>c.id===catId);
      ok=await onAdd({type,amount:amt,date:txnDate,bankId:sourceId,bankName:bank?.name,catId,catName:cat?.name,catIcon:cat?.icon,note});
    }
    if(ok!==false){setAmount("");onDone();}
  };
  return <div style={{position:"fixed",inset:0,background:C.bg,zIndex:100,display:"flex",flexDirection:"column"}}>
    <div style={{padding:"24px 16px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{color:C.text,fontSize:20,fontWeight:800}}>New Transaction</div>
      <button onClick={onDone} style={{background:C.card,border:`1px solid ${C.border}`,color:C.muted,width:36,height:36,borderRadius:99,cursor:"pointer"}}>✕</button>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"0 16px"}}>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        {["expense","income","saving","transfer"].map(t=><button key={t} onClick={()=>setType(t)} style={{flex:1,textTransform:"capitalize",padding:"12px 0",borderRadius:12,border:`1px solid ${type===t?theme:C.border}`,background:type===t?theme+"22":"transparent",color:type===t?theme:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",transition:"all 0.2s ease",fontFamily:"'DM Sans', sans-serif"}}>{t}</button>)}
      </div>
      <div style={{textAlign:"center",padding:"40px 0 50px",position:"relative",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{color:C.muted,fontSize:12,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Amount ({currency})</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:64,fontWeight:800,color:amount?theme:C.faint}}>
          {amount&&type==="expense"&&<span style={{marginRight:10,color:theme}}>−</span>}
          <span>{amount||"0.00"}</span>
        </div>
        <input type="number" inputMode="decimal" placeholder="" value={amount} onChange={e=>setAmount(e.target.value)} style={{position:"absolute",inset:0,opacity:0,width:"100%",height:"100%",outline:"none"}}/>
      </div>
      <div>
        <input type="date" value={txnDate} onChange={e=>setTxnDate(e.target.value)} style={fieldStyle}/>
        {type==="transfer"?(
          <><select value={sourceId} onChange={e=>setSourceId(e.target.value)} style={fieldStyle}>{banks.map(b=><option key={b.id} value={b.id}>← {getBankIcon(b.name)} {b.name}</option>)}</select>
          <select value={toBankId} onChange={e=>setToBankId(e.target.value)} style={fieldStyle}>{banks.map(b=><option key={b.id} value={b.id}>→ {getBankIcon(b.name)} {b.name}</option>)}</select></>
        ):type==="saving"?(
          <><select value={sourceId} onChange={e=>setSourceId(e.target.value)} style={fieldStyle}>{banks.map(b=><option key={b.id} value={b.id}>{getBankIcon(b.name)} {b.name}</option>)}</select>
          {activeGoals.length>0?(<select value={savingId} onChange={e=>setSavingId(e.target.value)} style={fieldStyle}>{activeGoals.map(s=><option key={s.id} value={s.id}>🎯 {s.name}</option>)}</select>):(<div style={{...fieldStyle,display:"flex",alignItems:"center",color:C.muted}}>🎯 No active goals</div>)}</>
        ):(
          <select value={sourceId} onChange={e=>setSourceId(e.target.value)} style={fieldStyle}>
            {banks.map(b=><option key={b.id} value={b.id}>{getBankIcon(b.name)} {b.name}</option>)}
            {type==="expense"&&spendingGoals.map(g=><option key={"goal_"+g.id} value={"goal_"+g.id}>🎯 {g.name}</option>)}
          </select>
        )}
        {type!=="transfer"&&type!=="saving"&&(<select value={catId} onChange={e=>setCatId(e.target.value)} style={fieldStyle}>{cats.map(c=><option key={c.id} value={c.id}>{ICONS[c.icon]||"📌"} {c.name}</option>)}</select>)}
        <input placeholder="Add a note..." value={note} onChange={e=>setNote(e.target.value)} style={fieldStyle}/>
      </div>
    </div>
    <div style={{padding:"16px 16px 60px",background:C.bg}}>
      <button onClick={handleSubmit} style={{width:"100%",background:theme,border:"none",padding:"18px",borderRadius:16,color:"#fff",fontWeight:800,fontSize:17,cursor:"pointer",transition:"all 0.2s ease"}}>Save Transaction</button>
    </div>
  </div>;
}

function History({txns,onDelete,onUpdate,banks,expCats,incCats,currency,availMonths,savings,setAppAlert}){
  useEffect(()=>{window.scrollTo(0,0);},[]);
  const[search,setSearch]=useState("");const[filterType,setFilterType]=useState("all");const[filterMonth,setFilterMonth]=useState("all");const[confirmTxn,setConfirmTxn]=useState(null);const[editTxn,setEditTxn]=useState(null);const[viewTxn,setViewTxn]=useState(null);
  const splitCounts=useMemo(()=>{const counts={};txns.forEach(t=>{if(t.splitGroupId)counts[t.splitGroupId]=(counts[t.splitGroupId]||0)+1;});return counts;},[txns]);
  const filtered=useMemo(()=>txns.filter(t=>{
    if(filterType!=="all"){if(filterType==="expense"&&t.type!=="expense"&&t.type!=="goal_withdraw")return false;else if(filterType==="income"&&t.type!=="income"&&t.type!=="goal_return")return false;else if(filterType!=="expense"&&filterType!=="income"&&t.type!==filterType)return false;}
    if(filterMonth!=="all"&&!t.date.startsWith(filterMonth))return false;
    if(search){const q=search.toLowerCase();return t.catName?.toLowerCase().includes(q)||t.note?.toLowerCase().includes(q)||t.bankName?.toLowerCase().includes(q)||t.goalName?.toLowerCase().includes(q);}
    return true;
  }),[txns,filterType,filterMonth,search]);
  const handleEditClick=(t)=>{
    const isTrulyLinked=t.splitGroupId&&splitCounts[t.splitGroupId]>1;
    if(isTrulyLinked){setAppAlert({title:"Linked Transaction 🔗",message:"Cannot edit a split transaction. Please delete and recreate it.",color:C.yellow});return;}
    if(t.goalId&&savings){const goal=savings.find(s=>s.id===t.goalId);if(!goal||goal.status==="archived"){setAppAlert({title:"Historical Lock 🔒",message:"This goal is closed or deleted. Its transactions are locked.",color:C.orange});return;}}
    if(t.type==="goal_withdraw"||t.type==="goal_return"){setAppAlert({title:"Action Not Allowed",message:"Goal spending and returns cannot be edited directly.",color:C.orange});return;}
    setEditTxn(t);
  };
  const handleDeleteClick=(t)=>{
    if(t.goalId&&savings){const goal=savings.find(s=>s.id===t.goalId);if(!goal||goal.status==="archived"){setAppAlert({title:"Historical Lock 🔒",message:"This goal is closed or deleted. This transaction cannot be deleted.",color:C.orange});return;}}
    setConfirmTxn(t);
  };
  const is=getIS();
  return <div style={{padding:"24px 16px 0",paddingBottom:100}}>
    <div style={{color:C.text,fontSize:22,fontWeight:800,marginBottom:16}}>History</div>
    <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{...is,marginBottom:12}}/>
    <div style={{display:"flex",gap:8,marginBottom:14,overflowX:"auto"}}>
      {["all","expense","income","saving","transfer"].map(f=><button key={f} onClick={()=>setFilterType(f)} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${filterType===f?C.accent:C.border}`,background:filterType===f?C.accentDim:"transparent",color:filterType===f?C.accent:C.muted,fontWeight:600,fontSize:12,cursor:"pointer",textTransform:"capitalize",fontFamily:"'DM Sans', sans-serif"}}>{f}</button>)}
    </div>
    <div style={{marginBottom:16}}><MonthSelect value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} availMonths={availMonths}/></div>
    <div style={{color:C.faint,fontSize:11,marginBottom:12}}>{filtered.length} transaction{filtered.length!==1?"s":""}</div>
    <div style={{display:"flex",flexDirection:"column"}}>
      {filtered.length===0&&<EmptyState icon="💸" message="No transactions found."/>}
      {filtered.map(t=>{const isTrulyLinked=t.splitGroupId&&splitCounts[t.splitGroupId]>1;return <SwipeRow key={t.id} onEdit={()=>handleEditClick(t)} onDelete={()=>handleDeleteClick(t)}><TxnRow txn={t} hideTotal={false} onClick={()=>setViewTxn(t)} isTrulyLinked={isTrulyLinked}/></SwipeRow>;})}
    </div>
    {confirmTxn&&<ConfirmModal title={confirmTxn.splitGroupId&&splitCounts[confirmTxn.splitGroupId]>1?"Delete Linked Transactions?":"Delete Transaction?"} message={confirmTxn.splitGroupId&&splitCounts[confirmTxn.splitGroupId]>1?"This transaction is split. Deleting it will remove ALL linked parts.":"This will permanently remove the record and update all balances."} onClose={()=>setConfirmTxn(null)} onConfirm={()=>{onDelete(confirmTxn.id);setConfirmTxn(null);}}/>}
    {editTxn&&<EditTxnModal txn={editTxn} banks={banks} expCats={expCats} incCats={incCats} currency={currency} onSave={async(data)=>{const ok=await onUpdate(editTxn.id,data);if(ok)setEditTxn(null);}} onClose={()=>setEditTxn(null)}/>}
    {viewTxn&&<TxnViewModal txn={viewTxn} onClose={()=>setViewTxn(null)}/>}
  </div>;
}

function SavingsPage({savings,onSave,txns,banks,onBack,addTxn,delTxn,onGoalToast,bankBalance,safeToSpend,frozenForBank,goalSaved,setAppAlert,onOpenSaving}){
  useEffect(()=>{window.scrollTo(0,0);},[]);
  const[activeTab,setActiveTab]=useState("active");const[showAdd,setShowAdd]=useState(false);const[name,setName]=useState("");const[goal,setGoal]=useState("");const[editId,setEditId]=useState(null);
  const active=savings.filter(s=>s.status!=="archived"),archived=savings.filter(s=>s.status==="archived");
  const handleAdd=async()=>{
    if(!name||!goal)return;const pg=parseFloat(goal);if(isNaN(pg)||pg<=0)return;
    const newGoal={id:Date.now().toString(),name,goal:pg,status:"active",spendingMode:false};
    if(editId)await onSave(savings.map(s=>s.id===editId?{...s,name,goal:pg}:s));
    else await onSave([...savings,newGoal]);
    setName("");setGoal("");setShowAdd(false);setEditId(null);
  };
  const attemptDelete=(s)=>{
    const saved=goalSaved(s.id);const hasTxns=txns.some(t=>t.goalId===s.id);
    if(saved>0||hasTxns){setAppAlert({title:"Cannot Delete Directly",message:"This goal contains funds or transaction history. Please tap on the goal card to withdraw funds, archive it, or delete it safely from the control panel.",color:C.yellow});}
    else{onSave(savings.filter(g=>g.id!==s.id));HAPTICS.success();}
  };
  return <div style={{padding:"24px 16px",minHeight:"100vh",background:C.bg,boxSizing:"border-box"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><button onClick={onBack} style={{background:"transparent",border:"none",color:C.muted,fontSize:22,cursor:"pointer",padding:"10px 15px 10px 0",display:"flex",alignItems:"center"}}><span style={{display:"block",transform:"translateY(-1px)"}}>❮</span></button><div style={{color:C.text,fontSize:22,fontWeight:800}}>Saving Goals</div></div>
      <Btn small onClick={()=>{setEditId(null);setName("");setGoal("");setShowAdd(true);}}>+ New Goal</Btn>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:20}}>
      {[{id:"active",label:`Active (${active.length})`},{id:"archived",label:`Archived (${archived.length})`}].map(t=><button key={t.id} onClick={()=>setActiveTab(t.id)} style={{flex:1,padding:"10px 0",borderRadius:10,border:`1.5px solid ${activeTab===t.id?C.accent:C.border}`,background:activeTab===t.id?C.accentDim:"transparent",color:activeTab===t.id?C.accent:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>{t.label}</button>)}
    </div>
    {(activeTab==="active"?active:archived).length===0&&<EmptyState icon={activeTab==="active"?"◎":"🗃️"} message={activeTab==="active"?"No active goals yet.":"No archived goals."}/>}
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      {(activeTab==="active"?active:archived).map(s=>{
        const saved=goalSaved(s.id),pct=s.goal?Math.min(110,Math.round((saved/s.goal)*100)):0;
        return <SwipeRow key={s.id} onEdit={()=>{setEditId(s.id);setName(s.name);setGoal(s.goal);setShowAdd(true);}} onDelete={()=>attemptDelete(s)}>
          <div onClick={()=>onOpenSaving(s)} style={{padding:"14px 16px",cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{color:C.text,fontWeight:700,fontSize:15}}>{s.spendingMode?"💳":"🎯"} {s.name}</span><Pill color={pct>=100?C.accent:activeTab==="archived"?C.faint:C.yellow}>{pct}%</Pill></div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:activeTab==="archived"?C.muted:s.spendingMode?C.orange:C.yellow,fontSize:17,fontWeight:800}}>{fmt(saved)}</span><span style={{color:C.muted,fontSize:13}}>{fmt(Math.max(0,s.goal-saved))} left</span></div>
            <ProgressBar value={saved} max={s.goal} color={activeTab==="archived"?C.faint:s.spendingMode?C.orange:C.yellow} allowOver/>
            <div style={{color:C.accent,fontSize:11,marginTop:6,fontWeight:700}}>Tap to manage goal →</div>
          </div>
        </SwipeRow>;
      })}
    </div>
    {showAdd&&<Modal title={editId?"Edit Goal":"New Saving Goal"} onClose={()=>{setShowAdd(false);setEditId(null);}} center={false}><Input label="Goal Name" placeholder="e.g. Travel Fund..." value={name} onChange={e=>setName(e.target.value)}/><Input label="Target Amount" type="number" step="any" value={goal} onChange={e=>setGoal(e.target.value)}/><Btn full onClick={handleAdd}>{editId?"Update Goal":"Create Goal"}</Btn></Modal>}
  </div>;
}

function BudgetsPage({budgets,expCats,onSave,onBack,currency,txns=[]}){
  useEffect(()=>{window.scrollTo(0,0);},[]);
  const getLocalMonth=()=>{const d=new Date();const offset=d.getTimezoneOffset()*60000;return new Date(d.getTime()-offset).toISOString().slice(0,7);};
  const curMonth=getLocalMonth();
  const[filterMonth,setFilterMonth]=useState(curMonth);
  const availMonths=[...new Set([curMonth,...txns.map(t=>t.date.slice(0,7))])].sort().reverse();
  const[showAdd,setShowAdd]=useState(false);const[editId,setEditId]=useState(null);const[name,setName]=useState("");const[amount,setAmount]=useState("");const[selectedCats,setSelectedCats]=useState([]);const[confirmId,setConfirmId]=useState(null);const[startMonth,setStartMonth]=useState(curMonth);
  const startEdit=(b)=>{setEditId(b.id);setName(b.name);setAmount(b.amount);setSelectedCats(b.cats||[]);setStartMonth(b.startMonth||curMonth);setShowAdd(true);};
  const handleAdd=async()=>{
    if(!name||!amount||selectedCats.length===0)return;
    const pa=parseFloat(amount);const sm=startMonth||curMonth;
    if(editId)await onSave(budgets.map(b=>b.id===editId?{...b,name,amount:pa,cats:selectedCats,startMonth:sm}:b));
    else await onSave([...budgets,{id:Date.now().toString(),name,amount:pa,cats:selectedCats,startMonth:sm}]);
    setShowAdd(false);setEditId(null);setName("");setAmount("");setSelectedCats([]);setStartMonth(curMonth);
  };
  const now2=new Date(),daysLeft=Math.max(1,new Date(now2.getFullYear(),now2.getMonth()+1,0).getDate()-now2.getDate()+1);
  const displayBudgets=filterMonth==="all"?budgets:budgets.filter(b=>!b.startMonth||b.startMonth<=filterMonth);
  let mostSaved=null,mostOverspent=null;
  if(filterMonth==="all"&&budgets.length>0){
    let maxSaveAmt=-999999,maxOverAmt=-999999;
    budgets.forEach(bdg=>{
      const allExp=txns.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&bdg.cats.includes(t.catId));
      const activeMonths=availMonths.filter(m=>!bdg.startMonth||m>=bdg.startMonth);
      const monthsCount=activeMonths.length||1;
      const totalSpent=allExp.filter(t=>activeMonths.includes(t.date.slice(0,7))).reduce((a,t)=>a+t.amount,0);
      const avgSpent=totalSpent/monthsCount;const diff=bdg.amount-avgSpent;
      if(diff>0&&diff>maxSaveAmt){maxSaveAmt=diff;mostSaved={...bdg,avgSpent,diff};}
      if(diff<0&&Math.abs(diff)>maxOverAmt){maxOverAmt=Math.abs(diff);mostOverspent={...bdg,avgSpent,diff:Math.abs(diff)};}
    });
  }
  const is=getIS();
  return <div style={{padding:"24px 16px 130px",minHeight:"100vh",background:C.bg,boxSizing:"border-box"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><button onClick={onBack} style={{background:"transparent",border:"none",color:C.muted,fontSize:22,cursor:"pointer",padding:"10px 15px 10px 0",display:"flex",alignItems:"center"}}><span style={{display:"block",transform:"translateY(-1px)"}}>❮</span></button><div style={{color:C.text,fontSize:22,fontWeight:800}}>Budgets</div></div>
      <Btn small onClick={()=>{setEditId(null);setName("");setAmount("");setSelectedCats([]);setStartMonth(curMonth);setShowAdd(true);}}>+ Add Budget</Btn>
    </div>
    {budgets.length>0&&<div style={{marginBottom:16}}><MonthSelect value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} availMonths={availMonths}/></div>}
    {budgets.length===0&&<EmptyState icon="📊" message="Set monthly spending limits per category group."/>}
    {filterMonth==="all"&&budgets.length>0&&(
      <div style={{marginBottom:24}}>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Performance Insights</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <Card style={{padding:"14px 12px"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Most Saved</div>{mostSaved?(<><div style={{color:C.text,fontWeight:800,fontSize:14,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{mostSaved.name}</div><div style={{color:C.accent,fontSize:12,fontWeight:700}}>Saves avg {fmt(mostSaved.diff)}</div></>):<div style={{color:C.faint,fontSize:12}}>No data yet</div>}</Card>
          <Card style={{padding:"14px 12px"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Most Overspent</div>{mostOverspent?(<><div style={{color:C.text,fontWeight:800,fontSize:14,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{mostOverspent.name}</div><div style={{color:C.red,fontSize:12,fontWeight:700}}>Over by avg {fmt(mostOverspent.diff)}</div></>):<div style={{color:C.faint,fontSize:12}}>Looking good 🟢</div>}</Card>
        </div>
      </div>
    )}
    {displayBudgets.length===0&&filterMonth!=="all"&&budgets.length>0&&<EmptyState icon="⏳" message="No active budgets for this month."/>}
    <div style={{marginBottom:20}}>
      <SortableList items={displayBudgets} onReorder={onSave} renderItem={(bdg)=>{
        if(filterMonth==="all"){
          const allExp=txns.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&bdg.cats.includes(t.catId));
          const activeMonths=availMonths.filter(m=>!bdg.startMonth||m>=bdg.startMonth);const monthsCount=activeMonths.length||1;
          const totalSpent=allExp.filter(t=>activeMonths.includes(t.date.slice(0,7))).reduce((a,t)=>a+t.amount,0);
          const avg=totalSpent/monthsCount;const isSafe=avg<=bdg.amount;
          return <SwipeRow key={bdg.id} onEdit={()=>startEdit(bdg)} onDelete={()=>setConfirmId(bdg.id)}>
            <div style={{padding:"16px",background:C.card,border:`1px solid ${C.border}`,borderRadius:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:C.text,fontSize:16,fontWeight:700}}>{bdg.name}</span><Pill color={isSafe?C.accent:C.red} style={{fontSize:10}}>{isSafe?"🟢 Safe":"🔴 Over"}</Pill></div>
                <div style={{color:C.text,fontWeight:800}}>{fmt(bdg.amount)} <span style={{color:C.muted,fontSize:10,fontWeight:500}}>limit</span></div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{color:C.muted,fontSize:12}}>Average Spent</div><div style={{color:isSafe?C.accent:C.red,fontWeight:800}}>{fmt(avg)} / mo</div></div>
              <ProgressBar value={avg} max={bdg.amount} color={isSafe?C.accent:C.red}/>
            </div>
          </SwipeRow>;
        }
        const allExp=txns.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&bdg.cats.includes(t.catId));
        const spent=allExp.filter(t=>t.date.startsWith(filterMonth)).reduce((a,t)=>a+t.amount,0);
        const rem=Math.max(0,bdg.amount-spent);const pct=bdg.amount>0?Math.min(100,Math.round((spent/bdg.amount)*100)):0;const barColor=pct>=90?C.red:pct>=70?C.yellow:C.accent;
        return <SwipeRow key={bdg.id} onEdit={()=>startEdit(bdg)} onDelete={()=>setConfirmId(bdg.id)}>
          <div style={{padding:"16px",background:C.card,border:`1px solid ${C.border}`,borderRadius:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{color:C.text,fontSize:16,fontWeight:700}}>{bdg.name}</span><Pill color={barColor}>{pct}%</Pill></div>
            <div style={{color:C.muted,fontSize:12,marginBottom:8}}>Spent <span style={{color:C.text,fontWeight:700}}>{fmt(spent)}</span> of {fmt(bdg.amount)}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{color:rem===0?C.red:C.accent,fontSize:18,fontWeight:800}}>{fmt(rem)} left</span><span style={{color:C.muted,fontSize:11}}>Daily: {fmt(rem/daysLeft)}</span></div>
            <ProgressBar value={spent} max={bdg.amount} color={barColor}/>
          </div>
        </SwipeRow>;
      }}/>
    </div>
    {showAdd&&<Modal title={editId?"Edit Budget":"New Budget"} onClose={()=>{setShowAdd(false);setEditId(null);}} center={false}>
      <Input label="Budget Name" placeholder="e.g. Dining & Coffee" value={name} onChange={e=>setName(e.target.value)}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Input label={`Limit (${currency})`} type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)}/>
        <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Starts From</div><input type="month" value={startMonth} onChange={e=>setStartMonth(e.target.value)} style={{...is,colorScheme:C.isDark?"dark":"light"}}/></div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Categories</div>
        <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:160,overflow:"auto",background:C.bg,padding:10,borderRadius:10,border:`1px solid ${C.border}`}}>
          {expCats.map(c=>{const checked=selectedCats.includes(c.id);return <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"5px 0",userSelect:"none"}}><div onClick={()=>setSelectedCats(checked?selectedCats.filter(x=>x!==c.id):[...selectedCats,c.id])} style={{width:18,height:18,borderRadius:4,border:`2px solid ${checked?C.accent:C.faint}`,background:checked?C.accentDim:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{checked&&<span style={{color:C.accent,fontSize:12}}>✓</span>}</div><span style={{color:C.text,fontSize:14}}>{ICONS[c.icon]||"📌"} {c.name}</span></label>;})}
        </div>
      </div>
      <Btn full onClick={handleAdd}>Save Budget</Btn>
    </Modal>}
    {confirmId&&<ConfirmModal title="Delete Budget?" message="This removes the limit tracking without deleting any transactions." onClose={()=>setConfirmId(null)} onConfirm={async()=>{await onSave(budgets.filter(b=>b.id!==confirmId));setConfirmId(null);}}/>}
  </div>;
}

function QuickActionsSetup({quickActions,expCats,banks,onSave,onBack}){
  useEffect(()=>{window.scrollTo(0,0);},[]);
  const[editingId,setEditingId]=useState(null);const[catId,setCatId]=useState("");const[amount,setAmount]=useState("");const[bankId,setBankId]=useState("");
  const openCfg=(q)=>{setEditingId(q.id);setCatId(q.catId||(expCats[0]?.id||""));setAmount(q.amount||"50");setBankId(q.bankId||(banks[0]?.id||""));};
  return <div style={{padding:"24px 16px",minHeight:"100vh",background:C.bg,boxSizing:"border-box"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}><button onClick={onBack} style={{background:"transparent",border:"none",color:C.muted,fontSize:22,cursor:"pointer",padding:"10px 15px 10px 0",display:"flex",alignItems:"center"}}><span style={{display:"block",transform:"translateY(-1px)"}}>❮</span></button><div style={{color:C.text,fontSize:22,fontWeight:800}}>Quick Actions</div></div>
    <p style={{color:C.muted,fontSize:13,lineHeight:1.5,marginBottom:18}}>Configure up to 4 shortcuts. Long-press the + button to use them.</p>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {quickActions.map((q,idx)=>{const cat=expCats.find(c=>c.id===q.catId),bank=banks.find(b=>b.id===q.bankId);return <Card key={q.id} style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{color:C.text,fontWeight:700,fontSize:15}}>Slot #{idx+1}: {cat?`${ICONS[cat.icon]} ${cat.name}`:"Empty"}</div>{cat&&<div style={{color:C.muted,fontSize:12,marginTop:4}}>{fmt(parseFloat(q.amount))} · {bank?.name}</div>}</div><div style={{display:"flex",gap:8}}><Btn small onClick={()=>openCfg(q)} color={C.blue} outline>Setup</Btn>{q.catId&&<Btn small onClick={async()=>{await onSave(quickActions.map(a=>a.id===q.id?{...a,catId:"",amount:"",bankId:""}:a));}} color={C.red} outline style={{padding:"5px 10px"}}>✕</Btn>}</div></Card>;})}
    </div>
    {editingId&&<Modal title="Configure Shortcut" onClose={()=>setEditingId(null)} center={false}><Select label="Expense Category" value={catId} onChange={e=>setCatId(e.target.value)}>{expCats.map(c=><option key={c.id} value={c.id}>{ICONS[c.icon]} {c.name}</option>)}</Select><Input label="Default Amount" type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)}/><Select label="Default Account" value={bankId} onChange={e=>setBankId(e.target.value)}>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select><Btn full onClick={async()=>{await onSave(quickActions.map(q=>q.id===editingId?{...q,catId,amount,bankId}:q));setEditingId(null);}} style={{marginTop:8}}>Save Shortcut</Btn></Modal>}
  </div>;
}

// ── FullPage: full-screen sub-page wrapper (slides over the app, above bottom nav) ──
function FullPage({title,onBack,right,children,maxHeader}){
  useEffect(()=>{const{overflow}=document.body.style;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=overflow;};},[]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:120,background:C.bg,overflowY:"auto",WebkitOverflowScrolling:"touch",fontFamily:"'DM Sans', sans-serif",animation:"fpIn 0.28s cubic-bezier(0.2,0.8,0.2,1)"}}>
      <style>{`@keyframes fpIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}`}</style>
      <div style={{maxWidth:520,margin:"0 auto",minHeight:"100%",boxSizing:"border-box"}}>
        {!maxHeader&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"18px 12px 10px",position:"sticky",top:0,background:C.bg,zIndex:3}}>
          <button onClick={onBack} style={{background:"transparent",border:"none",color:C.text,fontSize:22,cursor:"pointer",padding:"8px 12px 8px 4px",display:"flex",alignItems:"center"}}><span style={{display:"block",transform:"translateY(-1px)"}}>❮</span></button>
          <div style={{flex:1,color:C.text,fontSize:19,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</div>
          {right}
        </div>}
        {children}
      </div>
    </div>
  );
}

// ── MonthlyBillsPage (Subscriptions + Installments) ───────────────────────────
function MonthlyBillsPage({bills,installments,onSaveBills,onSaveInstallments,banks,expCats,onAddTxn,delTxn,currency,setAppAlert}){
  useEffect(()=>{window.scrollTo(0,0);},[]);
  const[activeTab,setActiveTab]=useState("subscriptions");
  return <div style={{padding:"24px 16px 0",minHeight:"100vh",background:C.bg,boxSizing:"border-box"}}>
    <div style={{color:C.text,fontSize:22,fontWeight:800,marginBottom:16}}>Bills</div>
    <div style={{display:"flex",gap:8,marginBottom:20}}>
      {[{id:"subscriptions",label:"📋 Subscriptions"},{id:"installments",label:"💳 Installments"}].map(t=><button key={t.id} onClick={()=>setActiveTab(t.id)} style={{flex:1,padding:"11px 0",borderRadius:12,border:`1.5px solid ${activeTab===t.id?C.accent:C.border}`,background:activeTab===t.id?C.accentDim:"transparent",color:activeTab===t.id?C.accent:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>{t.label}</button>)}
    </div>
    {activeTab==="subscriptions"&&<SubscriptionsTab bills={bills} onSave={onSaveBills} banks={banks} expCats={expCats} onAddTxn={onAddTxn} delTxn={delTxn} currency={currency} setAppAlert={setAppAlert}/>}
    {activeTab==="installments"&&<InstallmentsTab installments={installments} onSave={onSaveInstallments} banks={banks} expCats={expCats} onAddTxn={onAddTxn} setAppAlert={setAppAlert}/>}
  </div>;
}

function SubscriptionsTab({bills,onSave,banks,expCats,onAddTxn,delTxn,currency,setAppAlert}){
  const getLocalMonth=()=>{const d=new Date();const offset=d.getTimezoneOffset()*60000;return new Date(d.getTime()-offset).toISOString().slice(0,7);};
  const curMonth=getLocalMonth();
  const[view,setView]=useState({mode:"list"}); // list | picker | form | detail
  const[serviceSearch,setServiceSearch]=useState("");
  const[form,setForm]=useState(null); // {editId,name,amount,bankId,typeId,dueDay,reminderDays,note,domain,color}
  const[detailMonth,setDetailMonth]=useState(curMonth);
  const[confirmDelete,setConfirmDelete]=useState(null);
  const[confirmUndo,setConfirmUndo]=useState(null); // {bill,month}
  const payingRef=useRef({});
  const is=getIS();

  const isPaid=(bill,mStr)=>bill.payments?.some(p=>p.month===mStr);
  const typeOf=(bill)=>{
    if(bill.typeId)return getBillType(bill.typeId);
    const svc=SUBSCRIPTION_SERVICES.find(s=>s.name===bill.name||(bill.domain&&s.domain===bill.domain));
    return getBillType(svc?SERVICE_CAT_TO_TYPE[svc.category]:"other");
  };
  // Relative due-date status for the current month
  const dueInfo=(bill)=>{
    if(isPaid(bill,curMonth))return{text:"Paid",color:C.accent};
    if(!bill.dueDay)return{text:"Due this month",color:C.muted};
    const now=new Date();const due=new Date(now.getFullYear(),now.getMonth(),bill.dueDay);
    const diff=Math.ceil((due-now)/(1000*60*60*24));
    if(diff<0)return{text:`Overdue ${Math.abs(diff)}d`,color:C.red};
    if(diff===0)return{text:"Today",color:C.red};
    if(diff===1)return{text:"Tomorrow",color:C.orange};
    if(diff<=(bill.reminderDays||2))return{text:`In ${diff} days`,color:C.yellow};
    return{text:`Day ${bill.dueDay}`,color:C.muted};
  };

  const totalMonthly=bills.reduce((a,b)=>a+b.amount,0);
  const paidCount=bills.filter(b=>isPaid(b,curMonth)).length;
  const upcoming=bills.filter(b=>!isPaid(b,curMonth)).sort((a,b)=>(a.dueDay||99)-(b.dueDay||99));

  // ── Navigation between sub-pages ──
  const openPicker=()=>{setServiceSearch("");setView({mode:"picker"});};
  const blankForm=()=>({editId:null,name:"",amount:"",bankId:banks[0]?.id||"",typeId:"other",dueDay:"1",reminderDays:"2",note:"",domain:"",color:""});
  const pickService=(svc)=>{setForm({...blankForm(),name:svc.name,domain:svc.domain,color:svc.color,typeId:SERVICE_CAT_TO_TYPE[svc.category]||"other"});setView({mode:"form"});};
  const pickCustom=()=>{setForm(blankForm());setView({mode:"form"});};
  const openEdit=(bill)=>{setForm({editId:bill.id,name:bill.name,amount:String(bill.amount),bankId:bill.bankId,typeId:typeOf(bill).id,dueDay:String(bill.dueDay||1),reminderDays:String(bill.reminderDays??2),note:bill.note||"",domain:bill.domain||"",color:bill.color||""});setView({mode:"form"});};
  const openDetail=(bill)=>{setDetailMonth(curMonth);setView({mode:"detail",billId:bill.id});};

  const handleSave=async()=>{
    const pa=parseFloat(form.amount);if(!form.name.trim()||isNaN(pa)||pa<=0)return;
    const dd=Math.min(28,Math.max(1,parseInt(form.dueDay)||1)),rd=Math.min(7,Math.max(0,parseInt(form.reminderDays)||2));
    const base={name:form.name.trim(),amount:pa,bankId:form.bankId,typeId:form.typeId,dueDay:dd,reminderDays:rd,note:form.note.trim(),domain:form.domain,color:form.color};
    if(form.editId){await onSave(bills.map(b=>b.id===form.editId?{...b,...base}:b));setView({mode:"detail",billId:form.editId});}
    else{await onSave([...bills,{id:Date.now().toString(),...base,payments:[]}]);setView({mode:"list"});}
    HAPTICS.success();
  };

  const handlePay=async(bill,mStr)=>{
    if(payingRef.current[bill.id]||isPaid(bill,mStr))return;payingRef.current[bill.id]=true;
    try{
      const bank=banks.find(b=>b.id===bill.bankId),type=typeOf(bill);
      const dateStr=today();const ms=`${MONTHS[+mStr.split("-")[1]-1]} ${mStr.split("-")[0]}`;
      const id=await onAddTxn({type:"expense",amount:bill.amount,date:dateStr,bankId:bill.bankId,bankName:bank?.name,catId:`bill_${type.id}`,catName:type.name,catIcon:type.icon,note:`Bill: ${bill.name} ${ms}`});
      if(id!==false){HAPTICS.success();await onSave(bills.map(b=>b.id===bill.id?{...b,payments:[...(b.payments||[]),{month:mStr,date:dateStr,txnId:id}]}:b));}
    }finally{setTimeout(()=>{payingRef.current[bill.id]=false;},1000);}
  };
  const handleUndoConfirm=async()=>{
    if(!confirmUndo)return;const{bill,month}=confirmUndo;const p=bill.payments?.find(p=>p.month===month);
    if(p?.txnId)await delTxn(p.txnId);
    await onSave(bills.map(b=>b.id===bill.id?{...b,payments:(b.payments||[]).filter(p=>p.month!==month)}:b));setConfirmUndo(null);
  };

  // ════════════ PICKER PAGE ════════════
  if(view.mode==="picker"){
    const q=serviceSearch.toLowerCase();
    const byCat={};SUBSCRIPTION_SERVICES.forEach(s=>{if(!s.name.toLowerCase().includes(q))return;if(!byCat[s.category])byCat[s.category]=[];byCat[s.category].push(s);});
    return <FullPage title="Add Subscription" onBack={()=>setView({mode:"list"})}>
      <div style={{padding:"0 16px 40px"}}>
        <div style={{position:"relative",marginBottom:18}}>
          <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:15}}>🔍</span>
          <input autoFocus placeholder="Search services..." value={serviceSearch} onChange={e=>setServiceSearch(e.target.value)} style={{...is,paddingLeft:40,borderRadius:14}}/>
        </div>
        <button onClick={pickCustom} style={{width:"100%",display:"flex",alignItems:"center",gap:12,background:C.card,border:`1.5px dashed ${C.border}`,borderRadius:16,padding:"16px",cursor:"pointer",marginBottom:24,textAlign:"left",fontFamily:"'DM Sans', sans-serif"}}>
          <div style={{width:44,height:44,borderRadius:12,background:C.accentDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>✎</div>
          <div style={{flex:1}}><div style={{color:C.text,fontWeight:800,fontSize:15}}>Custom Subscription</div><div style={{color:C.muted,fontSize:12,marginTop:2}}>Add any service manually</div></div>
          <span style={{color:C.muted,fontSize:18}}>❯</span>
        </button>
        {Object.entries(byCat).map(([cat,list])=>(
          <div key={cat} style={{marginBottom:22}}>
            <div style={{color:C.muted,fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>{cat}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"16px 10px"}}>
              {list.map(svc=>(
                <button key={svc.id} onClick={()=>pickService(svc)} style={{background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8,fontFamily:"'DM Sans', sans-serif",padding:0}}>
                  <ServiceLogo domain={svc.domain} name={svc.name} color={svc.color} size={56} style={{borderRadius:16}}/>
                  <span style={{color:C.text,fontSize:11,fontWeight:600,textAlign:"center",lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{svc.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(byCat).length===0&&<EmptyState icon="🔍" message="No services match your search. Use Custom above."/>}
      </div>
    </FullPage>;
  }

  // ════════════ FORM PAGE (add / edit details) ════════════
  if(view.mode==="form"&&form){
    const f=form;const setF=(k,v)=>setForm(p=>({...p,[k]:v}));
    const valid=f.name.trim()&&parseFloat(f.amount)>0;
    const accent=f.color||C.accent;
    const lblStyle={color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8,display:"block"};
    return <FullPage title={f.editId?"Edit Subscription":"New Subscription"} onBack={()=>setView(f.editId?{mode:"detail",billId:f.editId}:{mode:"picker"})}>
      <div style={{padding:"4px 16px 48px"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:24}}>
          <ServiceLogo domain={f.domain} name={f.name||"?"} color={accent} size={72} style={{borderRadius:20}}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={lblStyle}>Name</label>
          <input value={f.name} onChange={e=>setF("name",e.target.value)} placeholder="e.g. Netflix, Vodafone..." style={{...is,borderRadius:14}}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={lblStyle}>Amount ({currency}) · per month</label>
          <input type="number" step="any" inputMode="decimal" value={f.amount} onChange={e=>setF("amount",e.target.value)} placeholder="0" style={{...is,borderRadius:14,fontSize:22,fontWeight:800,padding:"14px"}}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={lblStyle}>Type</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {BILL_TYPES.map(t=>{const on=f.typeId===t.id;return <button key={t.id} onClick={()=>setF("typeId",t.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 14px",borderRadius:99,border:`1.5px solid ${on?t.color:C.border}`,background:on?t.color+"22":"transparent",color:on?t.color:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}><span>{ICONS[t.icon]}</span>{t.name}</button>;})}
          </div>
        </div>
        <div style={{marginBottom:20}}>
          <label style={lblStyle}>Pay from Account</label>
          <select value={f.bankId} onChange={e=>setF("bankId",e.target.value)} style={{...is,borderRadius:14}}>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          <div><label style={lblStyle}>Due Day</label><input type="number" min="1" max="28" inputMode="numeric" value={f.dueDay} onChange={e=>setF("dueDay",e.target.value)} style={{...is,borderRadius:14}}/></div>
          <div><label style={lblStyle}>Remind Before (days)</label><input type="number" min="0" max="7" inputMode="numeric" value={f.reminderDays} onChange={e=>setF("reminderDays",e.target.value)} style={{...is,borderRadius:14}}/></div>
        </div>
        <div style={{marginBottom:28}}>
          <label style={lblStyle}>Note (optional)</label>
          <input value={f.note} onChange={e=>setF("note",e.target.value)} placeholder="e.g. Family plan" style={{...is,borderRadius:14}}/>
        </div>
        <Btn full onClick={handleSave} color={accent} style={{opacity:valid?1:0.5,pointerEvents:valid?"auto":"none",borderRadius:14,padding:"15px"}}>{f.editId?"Save Changes":"Add Subscription"}</Btn>
      </div>
    </FullPage>;
  }

  // ════════════ DETAIL PAGE ════════════
  if(view.mode==="detail"){
    const bill=bills.find(b=>b.id===view.billId);
    if(!bill)return <FullPage title="Subscription" onBack={()=>setView({mode:"list"})}><EmptyState icon="📋" message="This subscription was removed."/></FullPage>;
    const type=typeOf(bill);const bank=banks.find(b=>b.id===bill.bankId);const accent=bill.color||C.accent;
    const di=dueInfo(bill);const paidThisMonth=isPaid(bill,detailMonth);
    const recent12=[];{const d=new Date();for(let i=0;i<12;i++){const m=new Date(d.getFullYear(),d.getMonth()-i,1);recent12.push(`${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}`);}}
    const availMonths=[...new Set([...(bill.payments||[]).map(p=>p.month),...recent12])].sort().reverse();
    const grad=C.isDark?`linear-gradient(160deg,${accent}33 0%,${C.card} 70%)`:`linear-gradient(160deg,${accent}22 0%,${C.surface} 70%)`;
    const rowStyle={display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderBottom:`1px solid ${C.border}`};
    return <FullPage title={bill.name} onBack={()=>setView({mode:"list"})} right={
      <button onClick={()=>openEdit(bill)} style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>✎ Edit</button>
    }>
      <div style={{padding:"0 16px 48px"}}>
        <div style={{background:grad,border:`1px solid ${C.border}`,borderRadius:22,padding:"26px 20px",textAlign:"center",marginBottom:16}}>
          <ServiceLogo domain={bill.domain} name={bill.name} color={accent} size={68} style={{borderRadius:20,margin:"0 auto 12px"}}/>
          <div style={{color:C.text,fontSize:22,fontWeight:800}}>{bill.name}</div>
          <div style={{color:C.text,fontSize:34,fontWeight:800,letterSpacing:-1,marginTop:4}}>{fmt(bill.amount)}</div>
          <div style={{color:C.muted,fontSize:13,fontWeight:600,marginTop:2}}>per month</div>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:14,background:di.color+"22",border:`1px solid ${di.color}55`,color:di.color,borderRadius:99,padding:"7px 16px",fontWeight:800,fontSize:13}}>{paidThisMonth?"✓ Paid this month":`⏱ ${di.text}`}</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <Card style={{padding:"14px",textAlign:"center"}}><div style={{color:C.text,fontSize:18,fontWeight:800}}>{fmt(bill.amount)}</div><div style={{color:C.muted,fontSize:11,fontWeight:700,marginTop:4}}>Monthly</div></Card>
          <Card style={{padding:"14px",textAlign:"center"}}><div style={{color:C.text,fontSize:18,fontWeight:800}}>{fmt(bill.amount*12)}</div><div style={{color:C.muted,fontSize:11,fontWeight:700,marginTop:4}}>Per year</div></Card>
        </div>

        <Card style={{padding:"4px 16px",marginBottom:16}}>
          <div style={{...rowStyle}}><span style={{color:C.muted,fontSize:13,fontWeight:600}}>Type</span><span style={{color:C.text,fontSize:14,fontWeight:700}}>{ICONS[type.icon]} {type.name}</span></div>
          <div style={{...rowStyle}}><span style={{color:C.muted,fontSize:13,fontWeight:600}}>Pay from</span><span style={{color:C.text,fontSize:14,fontWeight:700}}>{bank?.name||"—"}</span></div>
          <div style={{...rowStyle}}><span style={{color:C.muted,fontSize:13,fontWeight:600}}>Due day</span><span style={{color:C.text,fontSize:14,fontWeight:700}}>Day {bill.dueDay||1} of month</span></div>
          <div style={{...rowStyle,borderBottom:bill.note?`1px solid ${C.border}`:"none"}}><span style={{color:C.muted,fontSize:13,fontWeight:600}}>Reminder</span><span style={{color:C.text,fontSize:14,fontWeight:700}}>{(bill.reminderDays??2)===0?"Off":`${bill.reminderDays??2} day(s) before`}</span></div>
          {bill.note&&<div style={{...rowStyle,borderBottom:"none"}}><span style={{color:C.muted,fontSize:13,fontWeight:600}}>Note</span><span style={{color:C.text,fontSize:14,fontWeight:700,maxWidth:"60%",textAlign:"right"}}>{bill.note}</span></div>}
        </Card>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{color:C.muted,fontSize:11,fontWeight:800,letterSpacing:1,textTransform:"uppercase"}}>Payment Status</span>
          <MonthSelect value={detailMonth} onChange={e=>setDetailMonth(e.target.value==="all"?curMonth:e.target.value)} availMonths={availMonths}/>
        </div>
        {paidThisMonth?(
          <div style={{display:"flex",gap:8,marginBottom:24}}>
            <div style={{flex:1,background:C.accent,color:"#111",borderRadius:14,height:50,fontSize:15,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>✓ Paid {MONTHS[+detailMonth.split("-")[1]-1]}</div>
            <button onClick={()=>setConfirmUndo({bill,month:detailMonth})} style={{flexShrink:0,background:C.yellowDim,border:`1.5px solid ${C.yellow}`,color:C.yellow,borderRadius:14,height:50,padding:"0 20px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>⟲ Undo</button>
          </div>
        ):(
          <button onClick={()=>handlePay(bill,detailMonth)} style={{width:"100%",background:accent,border:"none",color:"#111",borderRadius:14,height:52,fontWeight:800,fontSize:16,cursor:"pointer",marginBottom:24,fontFamily:"'DM Sans', sans-serif"}}>✓ Record Payment for {MONTHS[+detailMonth.split("-")[1]-1]}</button>
        )}

        {(bill.payments||[]).length>0&&<>
          <div style={{color:C.muted,fontSize:11,fontWeight:800,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>History ({bill.payments.length})</div>
          <Card style={{padding:"4px 16px",marginBottom:24}}>
            {[...bill.payments].sort((a,b)=>b.month.localeCompare(a.month)).map((p,i,arr)=>(
              <div key={p.month} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i===arr.length-1?"none":`1px solid ${C.border}`}}>
                <span style={{color:C.text,fontSize:14,fontWeight:700}}>{MONTHS[+p.month.split("-")[1]-1]} {p.month.split("-")[0]}</span>
                <span style={{color:C.accent,fontSize:13,fontWeight:700}}>✓ {fmt(bill.amount)}</span>
              </div>
            ))}
          </Card>
        </>}

        <Btn full outline color={C.red} onClick={()=>setConfirmDelete(bill.id)} style={{borderRadius:14}}>🗑 Delete Subscription</Btn>
      </div>
      {confirmDelete&&<ConfirmModal title="Delete Subscription?" message="This removes it from your recurring list. Past payment transactions stay in your history." onClose={()=>setConfirmDelete(null)} onConfirm={async()=>{await onSave(bills.filter(b=>b.id!==confirmDelete));setConfirmDelete(null);setView({mode:"list"});}}/>}
      {confirmUndo&&<ConfirmModal title="Undo Payment?" message={`This marks "${confirmUndo.bill.name}" as unpaid for ${MONTHS[+confirmUndo.month.split("-")[1]-1]} and removes the transaction.`} confirmColor={C.yellow} onClose={()=>setConfirmUndo(null)} onConfirm={handleUndoConfirm}/>}
    </FullPage>;
  }

  // ════════════ LIST PAGE (default) ════════════
  return <div>
    <div style={{background:C.isDark?`linear-gradient(160deg,${C.blueDim} 0%,${C.card} 80%)`:`linear-gradient(160deg,${C.blueDim} 0%,${C.surface} 90%)`,border:`1px solid ${C.border}`,borderRadius:20,padding:"20px",marginBottom:20}}>
      <div style={{color:C.muted,fontSize:12,fontWeight:700,letterSpacing:.5,marginBottom:4}}>Monthly spending</div>
      <div style={{color:C.text,fontSize:38,fontWeight:800,letterSpacing:-1.5,marginBottom:16}}>{fmt(totalMonthly)}</div>
      <div style={{display:"flex",background:C.isDark?"#ffffff10":"#00000008",borderRadius:14,padding:"12px 0"}}>
        {[{v:bills.length,l:"Active"},{v:fmt(totalMonthly*12),l:"Per year"},{v:`${paidCount}/${bills.length}`,l:"Paid"}].map((s,i)=>(
          <div key={i} style={{flex:1,textAlign:"center",borderLeft:i?`1px solid ${C.border}`:"none"}}>
            <div style={{color:C.text,fontSize:17,fontWeight:800}}>{s.v}</div>
            <div style={{color:C.muted,fontSize:11,fontWeight:600,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>

    {bills.length===0&&<><EmptyState icon="📋" message="No subscriptions yet. Add Netflix, Vodafone, Spotify and more."/><Btn full onClick={openPicker} style={{marginTop:4}}>+ Add Subscription</Btn></>}

    {upcoming.length>0&&<div style={{marginBottom:24}}>
      <div style={{color:C.muted,fontSize:11,fontWeight:800,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Coming up</div>
      <Card style={{padding:"6px 16px"}}>
        {upcoming.slice(0,4).map((bill,i,arr)=>{const di=dueInfo(bill);return (
          <div key={bill.id} onClick={()=>openDetail(bill)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i===arr.length-1?"none":`1px solid ${C.border}`,cursor:"pointer"}}>
            <ServiceLogo domain={bill.domain} name={bill.name} color={bill.color||C.accent} size={36} style={{borderRadius:11}}/>
            <span style={{flex:1,color:C.text,fontWeight:700,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bill.name}</span>
            <span style={{background:di.color+"22",color:di.color,borderRadius:99,padding:"4px 12px",fontSize:12,fontWeight:700}}>{di.text}</span>
          </div>
        );})}
      </Card>
    </div>}

    {bills.length>0&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{color:C.text,fontSize:18,fontWeight:800}}>Your subscriptions</div>
        <Btn small onClick={openPicker}>+ Add</Btn>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,paddingBottom:40}}>
        {bills.map(bill=>{const di=dueInfo(bill);const type=typeOf(bill);return (
          <SwipeRow key={bill.id} onEdit={()=>openEdit(bill)} onDelete={()=>setConfirmDelete(bill.id)}>
            <div onClick={()=>openDetail(bill)} style={{display:"flex",alignItems:"center",gap:12,padding:"14px",borderLeft:`4px solid ${bill.color||C.accent}`,cursor:"pointer"}}>
              <ServiceLogo domain={bill.domain} name={bill.name} color={bill.color||C.accent} size={44} style={{borderRadius:13}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:C.text,fontWeight:800,fontSize:16,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bill.name}</div>
                <div style={{color:C.muted,fontSize:12,marginTop:2}}>{ICONS[type.icon]} {type.name}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{color:C.text,fontSize:17,fontWeight:800}}>{fmt(bill.amount)}</div>
                <div style={{color:di.color,fontSize:12,fontWeight:700,marginTop:2}}>{di.text}</div>
              </div>
            </div>
          </SwipeRow>
        );})}
      </div>
    </div>}

    {confirmDelete&&<ConfirmModal title="Delete Subscription?" message="This removes it from your recurring list. Past payment transactions stay in your history." onClose={()=>setConfirmDelete(null)} onConfirm={async()=>{await onSave(bills.filter(b=>b.id!==confirmDelete));setConfirmDelete(null);}}/>}
  </div>;
}

function InstallmentsTab({installments,onSave,banks,expCats,onAddTxn,setAppAlert}){
  const[showAdd,setShowAdd]=useState(false);const[showProviderPicker,setShowProviderPicker]=useState(false);const[providerSearch,setProviderSearch]=useState("");
  const[editItem,setEditItem]=useState(null);const[confirmDel,setConfirmDel]=useState(null);
  const[name,setName]=useState("");const[totalAmount,setTotalAmount]=useState("");const[installmentAmount,setInstallmentAmount]=useState("");const[totalInstallments,setTotalInstallments]=useState("");const[bankId,setBankId]=useState(banks[0]?.id||"");const[catId,setCatId]=useState(expCats[0]?.id||"");const[startDate,setStartDate]=useState(today());const[providerColor,setProviderColor]=useState("#6ee7b7");const[providerDomain,setProviderDomain]=useState("");
  const payingRef=useRef({});
  const active=installments.filter(i=>i.status!=="completed");
  const completed=installments.filter(i=>i.status==="completed");
  const totalMonthly=active.reduce((a,i)=>a+i.installmentAmount,0);
  const totalRemaining=active.reduce((a,i)=>a+(i.totalAmount-(i.paidInstallments*i.installmentAmount)),0);

  const openAdd=(item=null)=>{
    setEditItem(item);setName(item?.name||"");setTotalAmount(item?.totalAmount?String(item.totalAmount):"");
    setInstallmentAmount(item?.installmentAmount?String(item.installmentAmount):"");setTotalInstallments(item?.totalInstallments?String(item.totalInstallments):"");
    setBankId(item?.bankId||banks[0]?.id||"");setCatId(item?.catId||expCats[0]?.id||"");setStartDate(item?.startDate||today());
    setProviderColor(item?.color||"#6ee7b7");setProviderDomain(item?.domain||"");setShowAdd(true);
  };

  const handleSave=async()=>{
    const ta=parseFloat(totalAmount),ia=parseFloat(installmentAmount),ti=parseInt(totalInstallments);
    if(!name||isNaN(ta)||ta<=0||isNaN(ia)||ia<=0||isNaN(ti)||ti<=0)return;
    const prov=INSTALLMENT_PROVIDERS.find(p=>p.name===name);
    const obj={id:editItem?.id||Date.now().toString(),name,domain:prov?.domain||providerDomain,color:prov?.color||providerColor,totalAmount:ta,installmentAmount:ia,totalInstallments:ti,paidInstallments:editItem?.paidInstallments||0,startDate,bankId,catId,status:"active"};
    if(editItem)await onSave(installments.map(i=>i.id===editItem.id?obj:i));
    else await onSave([...installments,obj]);
    setShowAdd(false);setEditItem(null);setName("");setTotalAmount("");setInstallmentAmount("");setTotalInstallments("");
  };

  const handlePayInstallment=async(inst)=>{
    if(payingRef.current[inst.id])return;if(inst.paidInstallments>=inst.totalInstallments){setAppAlert({title:"Already Complete",message:"All installments for this item have been paid.",color:C.accent});return;}
    payingRef.current[inst.id]=true;
    try{
      const bank=banks.find(b=>b.id===inst.bankId);const cat=expCats.find(c=>c.id===inst.catId);
      const id=await onAddTxn({type:"expense",amount:inst.installmentAmount,date:today(),bankId:inst.bankId,bankName:bank?.name,catId:inst.catId,catName:cat?.name||inst.name,catIcon:cat?.icon||"bills",note:`Installment ${inst.paidInstallments+1}/${inst.totalInstallments}: ${inst.name}`});
      if(id!==false){
        const newPaid=inst.paidInstallments+1;
        const newStatus=newPaid>=inst.totalInstallments?"completed":"active";
        HAPTICS.success();await onSave(installments.map(i=>i.id===inst.id?{...i,paidInstallments:newPaid,status:newStatus}:i));
        if(newStatus==="completed")setAppAlert({title:"Installment Complete! 🎉",message:`"${inst.name}" has been fully paid off!`,color:C.accent});
      }
    }finally{setTimeout(()=>{payingRef.current[inst.id]=false;},1000);}
  };

  const filteredProviders=INSTALLMENT_PROVIDERS.filter(p=>p.name.toLowerCase().includes(providerSearch.toLowerCase()));
  const is=getIS();
  const byCategory={};INSTALLMENT_PROVIDERS.forEach(p=>{if(!byCategory[p.category])byCategory[p.category]=[];byCategory[p.category].push(p);});

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{color:C.muted,fontSize:13}}>{active.length} active</div>
      <Btn small onClick={()=>setShowProviderPicker(true)}>+ Add</Btn>
    </div>

    {active.length>0&&(
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
        <Card style={{padding:"14px 12px"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Monthly</div><div style={{color:C.text,fontSize:16,fontWeight:800}}>{fmt(totalMonthly)}</div></Card>
        <Card style={{padding:"14px 12px"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Active</div><div style={{color:C.blue,fontSize:16,fontWeight:800}}>{active.length}</div></Card>
        <Card style={{padding:"14px 12px"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Remaining</div><div style={{color:C.yellow,fontSize:16,fontWeight:800}}>{fmt(totalRemaining)}</div></Card>
      </div>
    )}

    {active.length===0&&completed.length===0&&<EmptyState icon="💳" message="No installment plans yet. Add your BNPL or loan installments."/>}

    {active.map(inst=>{
      const pct=Math.round((inst.paidInstallments/inst.totalInstallments)*100);
      const remaining=inst.totalAmount-(inst.paidInstallments*inst.installmentAmount);
      const bank=banks.find(b=>b.id===inst.bankId);
      return <SwipeRow key={inst.id} onEdit={()=>openAdd(inst)} onDelete={()=>setConfirmDel(inst.id)}>
        <div style={{padding:"14px 16px",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <ServiceLogo domain={inst.domain} name={inst.name} color={inst.color} size={40}/>
            <div style={{flex:1}}>
              <div style={{color:C.text,fontWeight:700,fontSize:15}}>{inst.name}</div>
              <div style={{color:C.muted,fontSize:11,marginTop:2}}>{bank?.name} · {fmt(inst.installmentAmount)}/mo</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{color:C.yellow,fontSize:15,fontWeight:800}}>{fmt(remaining)}</div>
              <div style={{color:C.muted,fontSize:10,marginTop:2}}>remaining</div>
            </div>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{color:C.muted,fontSize:11,fontWeight:700}}>{inst.paidInstallments} of {inst.totalInstallments} paid</span>
              <span style={{color:C.accent,fontSize:11,fontWeight:700}}>{pct}%</span>
            </div>
            <ProgressBar value={inst.paidInstallments} max={inst.totalInstallments} color={pct>=90?C.accent:C.blue}/>
          </div>
          <button onClick={()=>handlePayInstallment(inst)} style={{width:"100%",background:C.accentDim,border:`1.5px solid ${C.accent}`,color:C.accent,borderRadius:10,padding:"10px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>✓ Pay Installment #{inst.paidInstallments+1}</button>
        </div>
      </SwipeRow>;
    })}

    {completed.length>0&&(
      <div style={{marginTop:20}}>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Completed ({completed.length})</div>
        {completed.map(inst=>(
          <div key={inst.id} style={{padding:"12px 16px",background:C.accentDim+"44",border:`1px solid ${C.accent}44`,borderRadius:12,marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
            <ServiceLogo domain={inst.domain} name={inst.name} color={inst.color} size={32}/>
            <div style={{flex:1}}>
              <div style={{color:C.text,fontWeight:700,fontSize:14}}>{inst.name}</div>
              <div style={{color:C.muted,fontSize:11}}>{fmt(inst.totalAmount)} fully paid</div>
            </div>
            <span style={{color:C.accent,fontSize:18}}>✓</span>
          </div>
        ))}
      </div>
    )}

    {showProviderPicker&&<Modal title="Add Installment" onClose={()=>{setShowProviderPicker(false);setProviderSearch("");}} center={false}>
      <input placeholder="Search provider..." value={providerSearch} onChange={e=>setProviderSearch(e.target.value)} style={{...is,marginBottom:16}}/>
      {Object.entries(byCategory).map(([cat,provs])=>(
        <div key={cat} style={{marginBottom:16}}>
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{cat}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {provs.filter(p=>p.name.toLowerCase().includes(providerSearch.toLowerCase())).map(prov=>(
              <button key={prov.id} onClick={()=>{setName(prov.name);setProviderColor(prov.color);setProviderDomain(prov.domain);setShowProviderPicker(false);openAdd();}} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,fontFamily:"'DM Sans', sans-serif"}}>
                <ServiceLogo domain={prov.domain} name={prov.name} color={prov.color} size={32}/>
                <span style={{color:C.text,fontSize:10,fontWeight:700,textAlign:"center",lineHeight:1.2}}>{prov.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <Btn full outline color={C.muted} onClick={()=>{setName("");setProviderColor("#6ee7b7");setProviderDomain("");setShowProviderPicker(false);openAdd();}}>+ Custom Installment</Btn>
    </Modal>}

    {showAdd&&<Modal title={editItem?"Edit Installment":"New Installment"} onClose={()=>{setShowAdd(false);setEditItem(null);}} center={false}>
      <Input label="Name" value={name} onChange={e=>setName(e.target.value)}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Input label="Total Amount" type="number" step="any" value={totalAmount} onChange={e=>setTotalAmount(e.target.value)}/>
        <Input label="Monthly Amount" type="number" step="any" value={installmentAmount} onChange={e=>setInstallmentAmount(e.target.value)}/>
      </div>
      <Input label="Total Installments" type="number" value={totalInstallments} onChange={e=>setTotalInstallments(e.target.value)}/>
      <Select label="Pay from Account" value={bankId} onChange={e=>setBankId(e.target.value)}>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select>
      <Select label="Category" value={catId} onChange={e=>setCatId(e.target.value)}>{expCats.map(c=><option key={c.id} value={c.id}>{ICONS[c.icon]||"📌"} {c.name}</option>)}</Select>
      <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Start Date</div><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{...is,colorScheme:C.isDark?"dark":"light"}}/></div>
      <Btn full onClick={handleSave}>{editItem?"Update":"Add Installment"}</Btn>
    </Modal>}
    {confirmDel&&<ConfirmModal title="Delete Installment?" message="This will remove the installment plan. Past payment transactions will remain in your history." onClose={()=>setConfirmDel(null)} onConfirm={async()=>{await onSave(installments.filter(i=>i.id!==confirmDel));setConfirmDel(null);}}/>}
  </div>;
}

function Settings({banks,expCats,incCats,groups,onBanks,onExpCats,onIncCats,onGroups,currency,onCurrency,username,onUsername,theme,onTheme,bankBalance,safeToSpend,frozenForBank,onOpenSavings,onOpenBudgets,onOpenQuickActions,onOpenManual,setLastBackup,txns,bills,savings,budgets,onRestore,setAppAlert,navigateTo}){
  useEffect(()=>{window.scrollTo(0,0);},[]);
  const[section,setSection]=useState("profile");const[modal,setModal]=useState(null);
  const[iN,setIN]=useState("");const[iC,setIC]=useState(C.accent);const[iG,setIG]=useState("daily");const[iIcon,setIIcon]=useState("others");const[gCats,setGCats]=useState([]);const[iT,setIT]=useState("");
  const[nameInput,setNameInput]=useState(username||"");const[confirmDel,setConfirmDel]=useState(null);const[showRestoreConfirm,setShowRestoreConfirm]=useState(false);const[pendingRestore,setPendingRestore]=useState(null);
  const fileRef=useRef(null);
  const openAdd=(type,item=null)=>{setModal({type,item});setIN(item?.name||"");setIC(item?.color||C.accent);setIG(item?.group||"daily");setIIcon(item?.icon||"others");setGCats(item?.cats||[]);setIT(item?.lowBalanceThreshold?String(item.lowBalanceThreshold):"");};
  const handleSave=async()=>{
    if(!iN.trim())return;const id=modal.item?.id||Date.now().toString();
    const thresh=parseFloat(iT),tv=!isNaN(thresh)&&thresh>0?thresh:undefined;
    if(modal.type==="bank")await onBanks(modal.item?banks.map(b=>b.id===id?{id,name:iN,color:iC,lowBalanceThreshold:tv}:b):[...banks,{id,name:iN,color:iC,lowBalanceThreshold:tv}]);
    else if(modal.type==="expCat")await onExpCats(modal.item?expCats.map(c=>c.id===id?{id,name:iN,icon:iIcon,group:iG}:c):[...expCats,{id,name:iN,icon:iIcon,group:iG}]);
    else if(modal.type==="incCat")await onIncCats(modal.item?incCats.map(c=>c.id===id?{id,name:iN,icon:iIcon}:c):[...incCats,{id,name:iN,icon:iIcon}]);
    else if(modal.type==="group")await onGroups(modal.item?groups.map(g=>g.id===id?{id,name:iN,color:iC,cats:gCats}:g):[...groups,{id,name:iN,color:iC,cats:gCats}]);
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
  const getBankDeleteError=(b)=>{
    const frozen=frozenForBank(b.id);
    if(frozen>0)return `Cannot delete "${b.name}" — it has ${fmt(frozen)} frozen in savings goals.`;
    if(bankBalance(b.id)!==0)return `Cannot delete "${b.name}" — it has a remaining balance.`;
    if(txns.some(t=>t.bankId===b.id||t.fromBankId===b.id||t.toBankId===b.id))return `Cannot delete "${b.name}" — it has existing transactions.`;
    if(bills.some(bl=>bl.bankId===b.id))return `Cannot delete "${b.name}" — it's used by a monthly bill.`;
    return null;
  };
  const handleBackup=async()=>{
    const data={txns,banks,expCats,incCats,groups,savings,bills,budgets,currency,username};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/octet-stream"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.style.display="none";a.href=url;a.download=`Saver_Backup_${new Date().toISOString().split("T")[0]}.json`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    const now=Date.now();await save(KEYS.lastBackup,now);setLastBackup(now);
    HAPTICS.success();setAppAlert({title:"Backup Complete",message:"Backup saved directly to your device.",color:C.accent});
  };
  const handleFileChange=(e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async(ev)=>{try{const p=JSON.parse(ev.target.result);setPendingRestore(p);setShowRestoreConfirm(true);}catch{HAPTICS.warning();setAppAlert({title:"Import Error",message:"Failed parsing JSON file.",color:C.red});}};r.readAsText(f);e.target.value="";};
  const iconKeys=Object.keys(ICONS).filter(k=>!["dashboard","add","settings","saving","bills_nav","income","expense","transfer","close","check","trash","edit","bank","cash","goal","budget"].includes(k));
  const is=getIS();

  return <div style={{padding:"24px 16px 0"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div style={{color:C.text,fontSize:28,fontWeight:800}}>Settings</div>
      <button onClick={onOpenManual} style={{background:C.accent+"22",border:`1px solid ${C.accent}44`,color:C.accent,fontWeight:800,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:14}}>Guide 💡</button>
    </div>
    <div style={{display:"flex",gap:10,marginBottom:24,overflowX:"auto",paddingBottom:10,paddingTop:4}}>
      {[{id:"profile",label:"👤 General"},{id:"appearance",label:"🎨 Theme"},{id:"currency",label:"💱 Currency"},{id:"banks",label:"🏦 Accounts"},{id:"expCats",label:"📤 Exp. Cat."},{id:"incCats",label:"💰 Inc. Cat."},{id:"groups",label:"📊 Groups"}].map(s=><button key={s.id} onClick={()=>setSection(s.id)} style={{whiteSpace:"nowrap",padding:"12px 18px",borderRadius:12,border:`1px solid ${section===s.id?C.accent:C.border}`,background:section===s.id?C.accentDim:"transparent",color:section===s.id?C.accent:C.muted,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>{s.label}</button>)}
    </div>

    {section==="appearance"&&<div style={{paddingBottom:20}}>
      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Color Theme</div>
      <div style={{display:"flex",gap:10,marginBottom:24}}>
        {[{id:"dark",label:"🌙 Dark",desc:"Dark mode"},{id:"light",label:"☀️ Light",desc:"Light mode"}].map(t=>(
          <button key={t.id} onClick={()=>onTheme(t.id)} style={{flex:1,padding:"16px",borderRadius:14,border:`2px solid ${theme===t.id?C.accent:C.border}`,background:theme===t.id?C.accentDim:C.card,cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans', sans-serif"}}>
            <div style={{fontSize:20,marginBottom:6}}>{t.label.split(" ")[0]}</div>
            <div style={{color:theme===t.id?C.accent:C.text,fontWeight:700,fontSize:14}}>{t.label.split(" ")[1]}</div>
            <div style={{color:C.muted,fontSize:11,marginTop:2}}>{t.desc}</div>
            {theme===t.id&&<div style={{color:C.accent,fontSize:12,fontWeight:800,marginTop:6}}>✓ Active</div>}
          </button>
        ))}
      </div>
    </div>}

    {section==="profile"&&<div style={{paddingBottom:20}}>
      {[{icon:"◎",color:C.yellow,label:"Savings Goals",cb:onOpenSavings},{icon:"📊",color:C.accent,label:"Monthly Budgets",cb:onOpenBudgets},{icon:"⚡",color:C.blue,label:"Quick Actions",cb:onOpenQuickActions}].map(item=><div key={item.label} onClick={item.cb} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18,color:item.color}}>{item.icon}</span><span style={{color:C.text,fontWeight:600,fontSize:14}}>{item.label}</span></div><span style={{color:C.muted}}>❯</span></div>)}
      <Card style={{marginBottom:16}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Your Name</div><input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Enter name..." style={{...is,marginBottom:12}}/><Btn full onClick={()=>{onUsername(nameInput.trim());setAppAlert({title:"Profile Updated",message:"Name updated!",color:C.accent});}}>Save Name</Btn></Card>
      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Backup & Restore</div>
      <Card style={{marginBottom:16}}><p style={{color:C.muted,fontSize:12,marginBottom:14,lineHeight:1.4}}>Download a backup or restore from a previous file.</p><div style={{display:"flex",gap:10,width:"100%"}}><Btn style={{flex:1,padding:"11px 5px"}} onClick={handleBackup} color={C.blue}>⬇️ Backup</Btn><Btn style={{flex:1,padding:"11px 5px"}} onClick={()=>fileRef.current.click()} color={C.purple} outline>⬆️ Restore</Btn></div><input type="file" ref={fileRef} accept=".json" onChange={handleFileChange} style={{display:"none"}}/></Card>
      <AppFooter navigateTo={navigateTo}/>
    </div>}

    {section==="currency"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{background:C.yellowDim,border:`1px solid ${C.yellow}44`,borderRadius:12,padding:"12px 14px",marginBottom:4}}><span style={{color:C.yellow,fontSize:12,fontWeight:600}}>⚠️ Changing currency only changes display. Numbers are not converted.</span></div>
      {CURRENCIES.map(cur=><button key={cur.code} onClick={()=>onCurrency(cur.code)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:currency===cur.code?C.accentDim:C.card,border:`1.5px solid ${currency===cur.code?C.accent:C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans', sans-serif"}}><div><div style={{color:currency===cur.code?C.accent:C.text,fontWeight:700,fontSize:15}}>{cur.code}</div><div style={{color:C.muted,fontSize:12,marginTop:2}}>{cur.name}</div></div>{currency===cur.code&&<span style={{color:C.accent,fontSize:20}}>✓</span>}</button>)}
    </div>}

    {section==="banks"&&<><div style={{display:"flex",flexDirection:"column"}}>
      {banks.map(b=><SwipeRow key={b.id} onEdit={()=>openAdd("bank",b)} onDelete={()=>{const err=getBankDeleteError(b);if(err)setAppAlert({title:"Cannot Delete",message:err,color:C.red});else setConfirmDel({type:"bank",item:b});}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:10,height:10,borderRadius:99,background:b.color}}/><span style={{color:C.text,fontWeight:600,fontSize:14}}>{b.name}</span></div>
          <div style={{textAlign:"right"}}><div style={{color:bankBalance(b.id)<0?C.red:C.muted,fontSize:13,fontWeight:700}}>{fmt(safeToSpend(b.id))}</div>{frozenForBank(b.id)>0&&<div style={{color:C.yellow,fontSize:10,marginTop:2}}>🔒 {fmt(frozenForBank(b.id))} frozen</div>}</div>
        </div>
      </SwipeRow>)}
    </div><Btn outline full onClick={()=>openAdd("bank")} style={{marginTop:8}}>+ Add Account</Btn></>}

    {section==="expCats"&&<><div style={{display:"flex",flexDirection:"column"}}>{expCats.map(c=><SwipeRow key={c.id} onEdit={()=>openAdd("expCat",c)} onDelete={()=>setConfirmDel({type:"expCat",item:c})}><div style={{display:"flex",alignItems:"center",padding:"14px 16px"}}><span style={{fontSize:18,marginRight:10}}>{ICONS[c.icon]||"📌"}</span><span style={{color:C.text,fontWeight:600,fontSize:14}}>{c.name}</span></div></SwipeRow>)}</div><Btn outline full onClick={()=>openAdd("expCat")} style={{marginTop:8}}>+ Add Expense Category</Btn></>}
    {section==="incCats"&&<><div style={{display:"flex",flexDirection:"column"}}>{incCats.map(c=><SwipeRow key={c.id} onEdit={()=>openAdd("incCat",c)} onDelete={()=>setConfirmDel({type:"incCat",item:c})}><div style={{display:"flex",alignItems:"center",padding:"14px 16px"}}><span style={{fontSize:18,marginRight:10}}>{ICONS[c.icon]||"💰"}</span><span style={{color:C.text,fontWeight:600,fontSize:14}}>{c.name}</span></div></SwipeRow>)}</div><Btn outline full onClick={()=>openAdd("incCat")} style={{marginTop:8}}>+ Add Income Category</Btn></>}

    {section==="groups"&&<><div style={{display:"flex",flexDirection:"column",gap:0}}>{groups.map(g=><SwipeRow key={g.id} onEdit={()=>openAdd("group",g)} onDelete={()=>setConfirmDel({type:"group",item:g})}><div style={{padding:"12px 16px"}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><div style={{width:10,height:10,borderRadius:99,background:g.color,flexShrink:0}}/><span style={{color:C.text,fontWeight:700,fontSize:14}}>{g.name}</span></div><div style={{display:"flex",flexWrap:"wrap",gap:5,paddingLeft:20}}>{g.cats.map(cid=>{const cat=expCats.find(c=>c.id===cid);return cat?<span key={cid} style={{background:g.color+"22",color:g.color,border:`1px solid ${g.color}44`,borderRadius:99,padding:"2px 8px",fontSize:11,fontWeight:700}}>{cat.name}</span>:null;})}</div></div></SwipeRow>)}</div><Btn outline full onClick={()=>openAdd("group")} style={{marginTop:8}}>+ Add Group</Btn></>}

    {modal&&<Modal title={`${modal.item?"Edit":"Add"} ${modal.type==="bank"?"Account":modal.type==="expCat"?"Expense Cat.":modal.type==="incCat"?"Income Cat.":"Group"}`} onClose={()=>setModal(null)} center={false}>
      <Input label="Name" value={iN} onChange={e=>setIN(e.target.value)}/>
      {modal.type==="bank"&&<><div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Color</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[C.accent,C.red,C.blue,C.yellow,C.purple,"#fb923c","#34d399","#f472b6"].map(col=><button key={col} onClick={()=>setIC(col)} style={{width:28,height:28,borderRadius:99,background:col,border:iC===col?"3px solid white":"3px solid transparent",cursor:"pointer"}}/>)}</div></div><div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Low Balance Alert</div><input type="number" min="0" placeholder="e.g. 200" value={iT} onChange={e=>setIT(e.target.value)} style={is}/><div style={{color:C.faint,fontSize:11,marginTop:4}}>Show 🔻 below this (0 = off)</div></div></>}
      {(modal.type==="expCat"||modal.type==="incCat")&&<div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Icon</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{iconKeys.map(k=><button key={k} onClick={()=>setIIcon(k)} style={{width:36,height:36,borderRadius:8,background:iIcon===k?C.accentDim:C.bg,border:`1px solid ${iIcon===k?C.accent:C.border}`,cursor:"pointer",fontSize:18}}>{ICONS[k]}</button>)}</div></div>}
      {modal.type==="expCat"&&<Select label="Group Tag" value={iG} onChange={e=>setIG(e.target.value)}>{["daily","fixed","lifestyle","growth","other"].map(g=><option key={g} value={g}>{g}</option>)}</Select>}
      {modal.type==="group"&&<><div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Color</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[C.accent,C.red,C.blue,C.yellow,C.purple,"#fb923c","#34d399","#f472b6"].map(col=><button key={col} onClick={()=>setIC(col)} style={{width:28,height:28,borderRadius:99,background:col,border:iC===col?"3px solid white":"3px solid transparent",cursor:"pointer"}}/>)}</div></div><div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Categories</div><div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:200,overflow:"auto",background:C.bg,padding:10,borderRadius:10,border:`1px solid ${C.border}`}}>{expCats.map(c=>{const ch=gCats.includes(c.id);return <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"4px 0",userSelect:"none"}}><div onClick={()=>setGCats(ch?gCats.filter(x=>x!==c.id):[...gCats,c.id])} style={{width:18,height:18,borderRadius:4,border:`2px solid ${ch?C.accent:C.faint}`,background:ch?C.accentDim:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{ch&&<span style={{color:C.accent,fontSize:12}}>✓</span>}</div><span style={{color:C.text,fontSize:14}}>{ICONS[c.icon]||"📌"} {c.name}</span></label>;})}</div></div></>}
      <Btn full onClick={handleSave} style={{marginTop:8}}>Save</Btn>
    </Modal>}
    {confirmDel&&<ConfirmModal title="Delete?" message="This action cannot be undone." onClose={()=>setConfirmDel(null)} onConfirm={doDelete}/>}
    {showRestoreConfirm&&<ConfirmModal title="Restore Backup?" message="⚠️ This will overwrite ALL your current data with the backup file.\n\nThis cannot be undone. Are you sure?" confirmColor={C.purple} onClose={()=>{setShowRestoreConfirm(false);setPendingRestore(null);}} onConfirm={async()=>{setShowRestoreConfirm(false);await onRestore(pendingRestore);setPendingRestore(null);}}/>}
  </div>;
}

function UserManual({onBack,navigateTo}){
  useEffect(()=>{window.scrollTo(0,0);},[]);
  const[activeSection,setActiveSection]=useState(null);
  const scrollTo=(id)=>{const el=document.getElementById("ms-"+id);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});setActiveSection(id);};
  const handleFeedback=()=>{window.location.href="mailto:hello@savertrack.app?subject=Saver%20App%20Feedback";};
  const SectionHeader=({icon,iconBg,iconColor,title})=>(
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
      <div style={{width:44,height:44,borderRadius:14,background:iconBg,color:iconColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{icon}</div>
      <h3 style={{color:C.text,margin:0,fontSize:20,fontWeight:800}}>{title}</h3>
    </div>
  );
  const TipBox=({color,children})=>(<div style={{background:color+"18",border:`1px solid ${color}44`,borderRadius:12,padding:"12px 14px",marginTop:14,display:"flex",gap:10,alignItems:"flex-start"}}><span style={{fontSize:16,flexShrink:0}}>💡</span><span style={{color,fontSize:13,fontWeight:600,lineHeight:1.5}}>{children}</span></div>);
  const MockCard=({children,style})=>(<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px",...style}}>{children}</div>);
  const Divider=()=><div style={{height:1,background:C.border,margin:"32px 0"}}/>;
  const NAV_ITEMS=[{id:"home",label:"Home",icon:"◈"},{id:"add",label:"Add",icon:"＋"},{id:"bills",label:"Bills",icon:"☷"},{id:"history",label:"History",icon:"☰"},{id:"savings",label:"Savings",icon:"◎"},{id:"budgets",label:"Budgets",icon:"📊"},{id:"quick",label:"Quick",icon:"⚡"},{id:"settings",label:"Settings",icon:"⚙"},{id:"tips",label:"Tips",icon:"🏆"}];

  return (
    <div style={{padding:"24px 16px 130px",minHeight:"100vh",background:C.bg,boxSizing:"border-box",fontFamily:"'DM Sans', sans-serif"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:24}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:C.muted,fontSize:22,cursor:"pointer",padding:"10px 15px 10px 0",display:"flex",alignItems:"center"}}><span style={{display:"block",transform:"translateY(-1px)"}}>❮</span></button>
        <div style={{color:C.text,fontSize:22,fontWeight:800}}>Manual Guide</div>
      </div>
      <div style={{background:`linear-gradient(135deg,${C.accentDim} 0%,${C.blueDim} 100%)`,border:`1px solid ${C.accent}33`,borderRadius:20,padding:"22px 20px",marginBottom:24}}>
        <div style={{fontSize:32,marginBottom:8}}>📖</div>
        <div style={{color:C.text,fontSize:18,fontWeight:800,marginBottom:6}}>Welcome to Saver</div>
        <div style={{color:C.muted,fontSize:13,lineHeight:1.6}}>Everything you need to know. All your data stays <strong style={{color:C.accent}}>100% on your device</strong>.</div>
      </div>
      <div style={{overflowX:"auto",paddingBottom:8,marginBottom:28,WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"flex",gap:8,width:"max-content"}}>
          {NAV_ITEMS.map(n=>(
            <button key={n.id} onClick={()=>scrollTo(n.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"10px 14px",borderRadius:14,border:`1px solid ${activeSection===n.id?C.accent:C.border}`,background:activeSection===n.id?C.accentDim:C.card,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>
              <span style={{fontSize:18}}>{n.icon}</span>
              <span style={{color:activeSection===n.id?C.accent:C.muted,fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{n.label}</span>
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes float-up{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@keyframes float-left{0%,100%{transform:translateX(0)}50%{transform:translateX(-7px)}}.ms-float-up{animation:float-up 1.6s infinite ease-in-out}.ms-float-left{animation:float-left 1.6s infinite ease-in-out}`}</style>

      <div id="ms-home" style={{marginBottom:40}}>
        <SectionHeader icon="◈" iconBg={C.blueDim} iconColor={C.blue} title="Home Screen"/>
        <p style={{color:C.muted,fontSize:14,lineHeight:1.6,marginBottom:16}}>Your dashboard gives you a full financial snapshot — total balance, income vs expenses, accounts, goals, and spending groups.</p>
        <MockCard style={{background:C.isDark?"linear-gradient(135deg,#1e1e28,#23232f)":"linear-gradient(135deg,#ffffff,#f8f8fc)",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Total Balance</div><div style={{color:C.text,fontSize:28,fontWeight:800}}>••••••</div></div><div style={{fontSize:28}}>🐵</div></div>
          <div style={{textAlign:"center",marginTop:10}}><span className="ms-float-up" style={{fontSize:20}}>👆</span><div style={{color:C.accent,fontSize:11,fontWeight:700,marginTop:4}}>Tap the monkey to hide / show balances</div></div>
        </MockCard>
        <TipBox color={C.blue}>Use the month selector (top right) to filter everything on the dashboard by a specific month or view all time.</TipBox>
      </div>
      <Divider/>

      <div id="ms-add" style={{marginBottom:40}}>
        <SectionHeader icon="＋" iconBg={C.accentDim} iconColor={C.accent} title="Adding Transactions"/>
        <p style={{color:C.muted,fontSize:14,lineHeight:1.6,marginBottom:16}}>Tap the big <strong style={{color:C.accent}}>+</strong> button at the bottom center. There are 4 transaction types:</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {[{type:"Expense",color:C.red,icon:"↓",desc:"Money going out"},{type:"Income",color:C.accent,icon:"↑",desc:"Money coming in"},{type:"Saving",color:C.yellow,icon:"◎",desc:"Deposit to a goal"},{type:"Transfer",color:C.blue,icon:"→",desc:"Between accounts"}].map(t=>(<MockCard key={t.type} style={{borderColor:t.color+"44"}}><div style={{color:t.color,fontSize:22,fontWeight:800,marginBottom:4}}>{t.icon}</div><div style={{color:C.text,fontSize:13,fontWeight:700}}>{t.type}</div><div style={{color:C.muted,fontSize:11,marginTop:2}}>{t.desc}</div></MockCard>))}
        </div>
        <TipBox color={C.red}>The app will block any transaction if your account doesn't have enough balance — no accidental overdrafts.</TipBox>
      </div>
      <Divider/>

      <div id="ms-bills" style={{marginBottom:40}}>
        <SectionHeader icon="☷" iconBg={C.redDim} iconColor={C.red} title="Monthly Bills"/>
        <p style={{color:C.muted,fontSize:14,lineHeight:1.6,marginBottom:16}}>Add your recurring bills once — they reset every month automatically. Now also supports Installments (BNPL, loans, etc).</p>
        <TipBox color={C.yellow}>Set "Remind Before" to 3 days so you never get caught off guard by an upcoming bill.</TipBox>
      </div>
      <Divider/>

      <div id="ms-history" style={{marginBottom:40}}>
        <SectionHeader icon="☰" iconBg={C.purpleDim} iconColor={C.purple} title="History & Records"/>
        <p style={{color:C.muted,fontSize:14,lineHeight:1.6,marginBottom:16}}>A full log of every transaction. Search, filter by type or month, and manage any record. Swipe left to edit or delete.</p>
        <TipBox color={C.purple}>Transfers show the full route: Account A ➔ Account B. Deleting any transaction instantly updates all balances.</TipBox>
      </div>
      <Divider/>

      <div id="ms-savings" style={{marginBottom:40}}>
        <SectionHeader icon="◎" iconBg={C.yellowDim} iconColor={C.yellow} title="Savings Goals"/>
        <p style={{color:C.muted,fontSize:14,lineHeight:1.6,marginBottom:16}}>Set a target amount, give it a name, and contribute to it anytime using the Saving transaction type.</p>
        <TipBox color={C.yellow}>Funds deposited into a goal are "frozen" — they won't show as available balance until withdrawn.</TipBox>
      </div>
      <Divider/>

      <div id="ms-budgets" style={{marginBottom:40}}>
        <SectionHeader icon="📊" iconBg={C.accentDim} iconColor={C.accent} title="Monthly Budgets"/>
        <p style={{color:C.muted,fontSize:14,lineHeight:1.6,marginBottom:16}}>Set a monthly spending limit for any group of categories. The dashboard shows how much is left and your daily safe-to-spend amount.</p>
        <TipBox color={C.accent}>The "Daily safe-to-spend" figure tells you exactly how much you can spend each remaining day without busting your budget.</TipBox>
      </div>
      <Divider/>

      <div id="ms-quick" style={{marginBottom:40}}>
        <SectionHeader icon="⚡" iconBg={C.blueDim} iconColor={C.blue} title="Quick Actions"/>
        <p style={{color:C.muted,fontSize:14,lineHeight:1.6,marginBottom:16}}>Configure up to 4 one-tap shortcuts for your most frequent expenses. Log a transaction in under 2 seconds.</p>
        <TipBox color={C.blue}>Long-press the + button from any screen to access your Quick Action shortcuts.</TipBox>
      </div>
      <Divider/>

      <div id="ms-settings" style={{marginBottom:40}}>
        <SectionHeader icon="⚙" iconBg={C.purpleDim} iconColor={C.purple} title="Settings"/>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {[{icon:"🎨",color:C.accent,title:"Theme",desc:"Switch between Dark and Light mode."},{icon:"💱",color:C.yellow,title:"Currency",desc:"Change display currency (numbers not converted)."},{icon:"🏦",color:C.blue,title:"Accounts",desc:"Add, edit, or delete bank accounts."},{icon:"📤",color:C.red,title:"Exp. Categories",desc:"Customize your expense categories."},{icon:"💾",color:C.blue,title:"Backup & Restore",desc:"Download all data as a JSON file. Restore with one tap."}].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"14px",background:C.card,border:`1px solid ${C.border}`,borderRadius:14}}>
              <div style={{width:36,height:36,borderRadius:10,background:s.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{s.icon}</div>
              <div><div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:4}}>{s.title}</div><div style={{color:C.muted,fontSize:13,lineHeight:1.5}}>{s.desc}</div></div>
            </div>
          ))}
        </div>
        <TipBox color={C.accent}>Back up before making big changes — restoring a backup overwrites all current data.</TipBox>
      </div>
      <Divider/>

      <div id="ms-tips" style={{marginBottom:40}}>
        <SectionHeader icon="🏆" iconBg={C.yellowDim} iconColor={C.yellow} title="Pro Tips & Gestures"/>
        {[{gesture:"👈 Swipe Left",color:C.blue,desc:"On any transaction or bill row to reveal Edit and Delete buttons."},{gesture:"👇 Long Press +",color:C.accent,desc:"Opens your 4 Quick Action shortcuts for instant expense logging."},{gesture:"✋ Long Press Card",color:C.purple,desc:"On any account, budget, or savings card to enter drag & drop reorder mode."},{gesture:"👆 Tap Balance",color:C.yellow,desc:"Tap the monkey icon on the total balance to toggle privacy mode."},{gesture:"🔍 History Search",color:C.red,desc:"Searches across category names, notes, and bank names simultaneously."},{gesture:"🎨 Theme Toggle",color:C.orange,desc:"Go to Settings → Theme to switch between Dark and Light mode."}].map((t,i)=>(
          <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"14px",background:C.card,border:`1px solid ${C.border}`,borderRadius:14,marginBottom:8}}>
            <div style={{color:t.color,fontWeight:800,fontSize:13,minWidth:110,flexShrink:0,paddingTop:2}}>{t.gesture}</div>
            <div style={{color:C.muted,fontSize:13,lineHeight:1.5}}>{t.desc}</div>
          </div>
        ))}
        <TipBox color={C.yellow}>The app is designed for speed — once you set up Quick Actions and know the swipe gestures, logging an expense takes under 3 seconds.</TipBox>
      </div>

      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px",textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:28,marginBottom:8}}>🐞</div>
        <div style={{color:C.text,fontWeight:700,fontSize:15,marginBottom:6}}>Found a bug or have a suggestion?</div>
        <div style={{color:C.muted,fontSize:13,marginBottom:16}}>We'd love to hear from you.</div>
        <Btn full onClick={handleFeedback} color={C.blue}>Send Feedback</Btn>
      </div>
      <AppFooter navigateTo={navigateTo}/>
    </div>
  );
}

class ErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={hasError:false};}
  static getDerivedStateFromError(){return{hasError:true};}
  componentDidCatch(e,i){console.error("Saver Error:",e,i);}
  render(){
    if(this.state.hasError)return <div style={{padding:40,textAlign:"center",color:"#e8e8f0",background:"#0f0f13",minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",fontFamily:"'DM Sans', sans-serif"}}>
      <div style={{fontSize:50,marginBottom:20}}>⚠️</div>
      <h2 style={{margin:"0 0 10px 0"}}>Something went wrong.</h2>
      <p style={{color:"#8888a8",marginBottom:20}}>Your data is safe.</p>
      <button onClick={()=>window.location.reload()} style={{background:"#6ee7b7",border:"none",color:"#111",borderRadius:10,padding:"12px 24px",fontWeight:700,fontSize:15,cursor:"pointer"}}>Reload App</button>
    </div>;
    return this.props.children;
  }
}

export default function App(){return <ErrorBoundary><SaverApp/></ErrorBoundary>;}
