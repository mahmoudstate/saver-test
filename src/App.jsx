import React, { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from "react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";

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
  installment:"💳",
};

const DEFAULT_BANKS = [{id:"b1",name:"CIB",color:"#60a5fa"},{id:"b2",name:"NBE",color:"#6ee7b7"},{id:"b3",name:"Cash",color:"#fbbf24"}];
const DEFAULT_EXP_CATS = [
  {id:"food",name:"Food",icon:"food",glyph:"utensils",color:"#fb923c",group:"daily"},{id:"coffee",name:"Coffee",icon:"coffee",glyph:"coffee",color:"#d97706",group:"daily"},
  {id:"transport",name:"Transport",icon:"transport",glyph:"car",color:"#60a5fa",group:"daily"},{id:"bills",name:"Bills",icon:"bills",glyph:"zap",color:"#fbbf24",group:"fixed"},
  {id:"shopping",name:"Shopping",icon:"shopping",glyph:"shopping-bag",color:"#f472b6",group:"lifestyle"},{id:"entertainment",name:"Fun",icon:"entertainment",glyph:"clapperboard",color:"#a78bfa",group:"lifestyle"},
  {id:"personal",name:"Personal",icon:"personal",glyph:"user",color:"#38bdf8",group:"daily"},{id:"health",name:"Health",icon:"health",glyph:"heart-pulse",color:"#f87171",group:"daily"},
  {id:"rent",name:"Rent",icon:"rent",glyph:"house",color:"#34d399",group:"fixed"},{id:"education",name:"Education",icon:"education",glyph:"graduation-cap",color:"#818cf8",group:"growth"},
  {id:"tech",name:"Tech",icon:"tech",glyph:"laptop",color:"#2dd4bf",group:"lifestyle"},{id:"parking",name:"Parking",icon:"parking",glyph:"parking-meter",color:"#94a3b8",group:"daily"},
  {id:"fuel",name:"Fuel",icon:"fuel",glyph:"fuel",color:"#fb7185",group:"daily"},{id:"car_repair",name:"Car Repair",icon:"car_repair",glyph:"wrench",color:"#f59e0b",group:"fixed"},
  {id:"takeaway",name:"Takeaway",icon:"takeaway",glyph:"pizza",color:"#f97316",group:"daily"},{id:"barber",name:"Barber",icon:"barber",glyph:"scissors",color:"#c084fc",group:"personal"},
  {id:"pets",name:"Pets",icon:"pets",glyph:"paw-print",color:"#4ade80",group:"personal"},{id:"travel",name:"Travel",icon:"travel",glyph:"plane",color:"#22d3ee",group:"lifestyle"},
  {id:"gaming",name:"Gaming",icon:"gaming",glyph:"gamepad-2",color:"#a855f7",group:"lifestyle"},{id:"pharmacy",name:"Pharmacy",icon:"pharmacy",glyph:"pill",color:"#ef4444",group:"health"},
  {id:"laundry",name:"Laundry",icon:"laundry",glyph:"washing-machine",color:"#0ea5e9",group:"daily"},{id:"tuition",name:"Tuition",icon:"tuition",glyph:"book-open",color:"#6366f1",group:"growth"},
  {id:"gym",name:"Gym",icon:"gym",glyph:"dumbbell",color:"#10b981",group:"health"},{id:"others",name:"Others",icon:"others",glyph:"shapes",color:"#94a3b8",group:"other"}
];
const DEFAULT_INC_CATS = [
  {id:"salary",name:"Salary",icon:"salary",glyph:"briefcase",color:"#34d399"},{id:"freelance",name:"Freelance",icon:"freelance",glyph:"lightbulb",color:"#60a5fa"},
  {id:"gift",name:"Gift",icon:"gift",glyph:"gift",color:"#f472b6"},{id:"investment",name:"Investment",icon:"investment",glyph:"trending-up",color:"#fbbf24"},
  {id:"other_income",name:"Other Income",icon:"other_income",glyph:"wallet",color:"#a78bfa"}
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
  // ── UK & Global streaming ──
  {id:"max",name:"Max (HBO)",domain:"max.com",color:"#0046ff",category:"Streaming"},
  {id:"paramount",name:"Paramount+",domain:"paramountplus.com",color:"#0064ff",category:"Streaming"},
  {id:"nowtv",name:"NOW",domain:"nowtv.com",color:"#00818a",category:"Streaming"},
  {id:"skytv",name:"Sky",domain:"sky.com",color:"#0072c9",category:"Streaming"},
  {id:"britbox",name:"BritBox",domain:"britbox.com",color:"#1b2a6b",category:"Streaming"},
  {id:"itvx",name:"ITVX",domain:"itv.com",color:"#102382",category:"Streaming"},
  {id:"bbciplayer",name:"BBC iPlayer",domain:"bbc.co.uk",color:"#ff4e98",category:"Streaming"},
  {id:"discoveryplus",name:"Discovery+",domain:"discoveryplus.com",color:"#2175ff",category:"Streaming"},
  {id:"dazn",name:"DAZN",domain:"dazn.com",color:"#f8f400",category:"Streaming"},
  {id:"crunchyroll",name:"Crunchyroll",domain:"crunchyroll.com",color:"#f47521",category:"Streaming"},
  {id:"audible",name:"Audible",domain:"audible.com",color:"#f8991c",category:"Streaming"},
  {id:"tidal",name:"Tidal",domain:"tidal.com",color:"#000000",category:"Streaming"},
  {id:"soundcloud",name:"SoundCloud",domain:"soundcloud.com",color:"#ff5500",category:"Streaming"},
  // ── UK telecom & internet ──
  {id:"ee",name:"EE",domain:"ee.co.uk",color:"#00b5b0",category:"Telecom"},
  {id:"o2",name:"O2",domain:"o2.co.uk",color:"#0019a5",category:"Telecom"},
  {id:"three",name:"Three",domain:"three.co.uk",color:"#ec1c92",category:"Telecom"},
  {id:"vodafone_uk",name:"Vodafone UK",domain:"vodafone.co.uk",color:"#e60000",category:"Telecom"},
  {id:"bt",name:"BT",domain:"bt.com",color:"#5514b4",category:"Telecom"},
  {id:"virginmedia",name:"Virgin Media",domain:"virginmedia.com",color:"#cc0000",category:"Telecom"},
  {id:"giffgaff",name:"giffgaff",domain:"giffgaff.com",color:"#000000",category:"Telecom"},
  {id:"plusnet",name:"Plusnet",domain:"plus.net",color:"#7ab800",category:"Telecom"},
  {id:"talktalk",name:"TalkTalk",domain:"talktalk.co.uk",color:"#7c2e8a",category:"Telecom"},
  // ── UK & global shopping / delivery ──
  {id:"deliveroo",name:"Deliveroo Plus",domain:"deliveroo.co.uk",color:"#00ccbc",category:"Shopping"},
  {id:"justeat",name:"Just Eat",domain:"just-eat.co.uk",color:"#ff8000",category:"Shopping"},
  {id:"ubereats",name:"Uber Eats",domain:"ubereats.com",color:"#06c167",category:"Shopping"},
  {id:"ocado",name:"Ocado",domain:"ocado.com",color:"#6b2c91",category:"Shopping"},
  {id:"asos",name:"ASOS Premier",domain:"asos.com",color:"#000000",category:"Shopping"},
  {id:"gousto",name:"Gousto",domain:"gousto.co.uk",color:"#e84c3d",category:"Shopping"},
  {id:"hellofresh",name:"HelloFresh",domain:"hellofresh.co.uk",color:"#91c11e",category:"Shopping"},
  // ── More tech & AI ──
  {id:"perplexity",name:"Perplexity",domain:"perplexity.ai",color:"#20808d",category:"Tech & AI"},
  {id:"dropbox",name:"Dropbox",domain:"dropbox.com",color:"#0061ff",category:"Tech & AI"},
  {id:"zoom",name:"Zoom",domain:"zoom.us",color:"#0b5cff",category:"Tech & AI"},
  {id:"canva",name:"Canva",domain:"canva.com",color:"#00c4cc",category:"Tech & AI"},
  {id:"linkedin",name:"LinkedIn Premium",domain:"linkedin.com",color:"#0a66c2",category:"Tech & AI"},
  {id:"nordvpn",name:"NordVPN",domain:"nordvpn.com",color:"#4687ff",category:"Tech & AI"},
  // ── Utilities ──
  {id:"britishgas",name:"British Gas",domain:"britishgas.co.uk",color:"#0396d6",category:"Utilities"},
  {id:"octopus",name:"Octopus Energy",domain:"octopus.energy",color:"#ff597b",category:"Utilities"},
  {id:"edf",name:"EDF Energy",domain:"edfenergy.com",color:"#fe5000",category:"Utilities"},
  {id:"eon",name:"E.ON Next",domain:"eonnext.com",color:"#e2001a",category:"Utilities"},
  {id:"thameswater",name:"Thames Water",domain:"thameswater.co.uk",color:"#005670",category:"Utilities"},
  {id:"tvlicence",name:"TV Licence",domain:"tvlicensing.co.uk",color:"#1d1d1b",category:"Utilities"},
  // ── Health & fitness ──
  {id:"puregym",name:"PureGym",domain:"puregym.com",color:"#e4002b",category:"Health & Fitness"},
  {id:"thegymgroup",name:"The Gym Group",domain:"thegymgroup.com",color:"#ffd200",category:"Health & Fitness"},
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
const SERVICE_CAT_TO_TYPE = {"Streaming":"streaming","Tech & AI":"software","Telecom":"telecom","Shopping":"shopping","Utilities":"utilities","Health & Fitness":"other"};
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
  // ── UK & global BNPL ──
  {id:"klarna",name:"Klarna",domain:"klarna.com",color:"#ffb3c7",category:"BNPL"},
  {id:"clearpay",name:"Clearpay",domain:"clearpay.co.uk",color:"#b2fce4",category:"BNPL"},
  {id:"paypal_pay",name:"PayPal Pay in 3",domain:"paypal.com",color:"#003087",category:"BNPL"},
  {id:"zilch",name:"Zilch",domain:"zilch.com",color:"#00e0a1",category:"BNPL"},
  {id:"laybuy",name:"Laybuy",domain:"laybuy.com",color:"#6a4cff",category:"BNPL"},
  {id:"frasersplus",name:"Frasers Plus",domain:"frasers.group",color:"#000000",category:"BNPL"},
  {id:"affirm",name:"Affirm",domain:"affirm.com",color:"#4a4af4",category:"BNPL"},
  {id:"gam3ya",name:"Gam3ya",domain:"",color:"#6c63ff",category:"Community"},
  {id:"car",name:"Car Loan",domain:"",color:"#546e7a",category:"Assets"},
  {id:"rent_install",name:"Rent",domain:"",color:"#26a69a",category:"Assets"},
  {id:"phone",name:"Phone",domain:"",color:"#37474f",category:"Assets"},
  {id:"laptop",name:"Laptop",domain:"",color:"#455a64",category:"Assets"},
  {id:"furniture",name:"Furniture",domain:"",color:"#8d6e63",category:"Assets"},
  {id:"appliances",name:"Appliances",domain:"",color:"#ef5350",category:"Assets"},
];

// Category glyphs (Lucide outline icons) — inner SVG markup, rendered with stroke. {key:innerSVG}
const CAT_GLYPHS={"utensils":"<path d=\"M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2\" /> <path d=\"M7 2v20\" /> <path d=\"M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7\" />","utensils-crossed":"<path d=\"m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8\" /> <path d=\"M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7\" /> <path d=\"m2.1 21.8 6.4-6.3\" /> <path d=\"m19 5-7 7\" />","coffee":"<path d=\"M10 2v2\" /> <path d=\"M14 2v2\" /> <path d=\"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1\" /> <path d=\"M6 2v2\" />","cup-soda":"<path d=\"m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8\" /> <path d=\"M5 8h14\" /> <path d=\"M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0\" /> <path d=\"m12 8 1-6h2\" />","pizza":"<path d=\"m12 14-1 1\" /> <path d=\"m13.75 18.25-1.25 1.42\" /> <path d=\"M17.775 5.654a15.68 15.68 0 0 0-12.121 12.12\" /> <path d=\"M18.8 9.3a1 1 0 0 0 2.1 7.7\" /> <path d=\"M21.964 20.732a1 1 0 0 1-1.232 1.232l-18-5a1 1 0 0 1-.695-1.232A19.68 19.68 0 0 1 15.732 2.037a1 1 0 0 1 1.232.695z\" />","sandwich":"<path d=\"m2.37 11.223 8.372-6.777a2 2 0 0 1 2.516 0l8.371 6.777\" /> <path d=\"M21 15a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-5.25\" /> <path d=\"M3 15a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h9\" /> <path d=\"m6.67 15 6.13 4.6a2 2 0 0 0 2.8-.4l3.15-4.2\" /> <rect width=\"20\" height=\"4\" x=\"2\" y=\"11\" rx=\"1\" />","salad":"<path d=\"M7 21h10\" /> <path d=\"M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z\" /> <path d=\"M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1\" /> <path d=\"m13 12 4-4\" /> <path d=\"M10.9 7.25A3.99 3.99 0 0 0 4 10c0 .73.2 1.41.54 2\" />","soup":"<path d=\"M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z\" /> <path d=\"M7 21h10\" /> <path d=\"M19.5 12 22 6\" /> <path d=\"M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62\" /> <path d=\"M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62\" /> <path d=\"M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62\" />","ice-cream-cone":"<path d=\"m7 11 4.08 10.35a1 1 0 0 0 1.84 0L17 11\" /> <path d=\"M17 7A5 5 0 0 0 7 7\" /> <path d=\"M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4\" />","cake":"<path d=\"M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8\" /> <path d=\"M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1\" /> <path d=\"M2 21h20\" /> <path d=\"M7 8v3\" /> <path d=\"M12 8v3\" /> <path d=\"M17 8v3\" /> <path d=\"M7 4h.01\" /> <path d=\"M12 4h.01\" /> <path d=\"M17 4h.01\" />","cookie":"<path d=\"M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5\" /> <path d=\"M8.5 8.5v.01\" /> <path d=\"M16 15.5v.01\" /> <path d=\"M12 12v.01\" /> <path d=\"M11 17v.01\" /> <path d=\"M7 14v.01\" />","candy":"<path d=\"M10 7v10.9\" /> <path d=\"M14 6.1V17\" /> <path d=\"M16 7V3a1 1 0 0 1 1.707-.707 2.5 2.5 0 0 0 2.152.717 1 1 0 0 1 1.131 1.131 2.5 2.5 0 0 0 .717 2.152A1 1 0 0 1 21 8h-4\" /> <path d=\"M16.536 7.465a5 5 0 0 0-7.072 0l-2 2a5 5 0 0 0 0 7.07 5 5 0 0 0 7.072 0l2-2a5 5 0 0 0 0-7.07\" /> <path d=\"M8 17v4a1 1 0 0 1-1.707.707 2.5 2.5 0 0 0-2.152-.717 1 1 0 0 1-1.131-1.131 2.5 2.5 0 0 0-.717-2.152A1 1 0 0 1 3 16h4\" />","croissant":"<path d=\"M10.2 18H4.774a1.5 1.5 0 0 1-1.352-.97 11 11 0 0 1 .132-6.487\" /> <path d=\"M18 10.2V4.774a1.5 1.5 0 0 0-.97-1.352 11 11 0 0 0-6.486.132\" /> <path d=\"M18 5a4 3 0 0 1 4 3 2 2 0 0 1-2 2 10 10 0 0 0-5.139 1.42\" /> <path d=\"M5 18a3 4 0 0 0 3 4 2 2 0 0 0 2-2 10 10 0 0 1 1.42-5.14\" /> <path d=\"M8.709 2.554a10 10 0 0 0-6.155 6.155 1.5 1.5 0 0 0 .676 1.626l9.807 5.42a2 2 0 0 0 2.718-2.718l-5.42-9.807a1.5 1.5 0 0 0-1.626-.676\" />","beer":"<path d=\"M17 11h1a3 3 0 0 1 0 6h-1\" /> <path d=\"M9 12v6\" /> <path d=\"M13 12v6\" /> <path d=\"M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z\" /> <path d=\"M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8\" />","wine":"<path d=\"M8 22h8\" /> <path d=\"M7 10h10\" /> <path d=\"M12 15v7\" /> <path d=\"M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z\" />","martini":"<path d=\"M12 12 4.207 4.207A.707.707 0 0 1 4.707 3h14.586a.707.707 0 0 1 .5 1.207z\" /> <path d=\"M12 12v10\" /> <path d=\"M7 22h10\" />","milk":"<path d=\"M8 2h8\" /> <path d=\"M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2\" /> <path d=\"M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0\" />","apple":"<path d=\"M12 6.528V3a1 1 0 0 1 1-1h0\" /> <path d=\"M18.237 21A15 15 0 0 0 22 11a6 6 0 0 0-10-4.472A6 6 0 0 0 2 11a15.1 15.1 0 0 0 3.763 10 3 3 0 0 0 3.648.648 5.5 5.5 0 0 1 5.178 0A3 3 0 0 0 18.237 21\" />","carrot":"<path d=\"M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.46-2.46\" /> <path d=\"M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z\" /> <path d=\"M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z\" />","popcorn":"<path d=\"M18 8a2 2 0 0 0 0-4 2 2 0 0 0-4 0 2 2 0 0 0-4 0 2 2 0 0 0-4 0 2 2 0 0 0 0 4\" /> <path d=\"M10 22 9 8\" /> <path d=\"m14 22 1-14\" /> <path d=\"M20 8c.5 0 .9.4.8 1l-2.6 12c-.1.5-.7 1-1.2 1H7c-.6 0-1.1-.4-1.2-1L3.2 9c-.1-.6.3-1 .8-1Z\" />","fish":"<path d=\"M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z\" /> <path d=\"M18 12v.5\" /> <path d=\"M16 17.93a9.77 9.77 0 0 1 0-11.86\" /> <path d=\"M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33\" /> <path d=\"M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4\" /> <path d=\"m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98\" />","egg":"<path d=\"M12 2C8 2 4 8 4 14a8 8 0 0 0 16 0c0-6-4-12-8-12\" />","drumstick":"<path d=\"M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23\" /> <path d=\"m8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59\" />","wheat":"<path d=\"M2 22 16 8\" /> <path d=\"M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z\" /> <path d=\"M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z\" /> <path d=\"M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z\" /> <path d=\"M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z\" /> <path d=\"M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z\" /> <path d=\"M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z\" /> <path d=\"M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z\" />","shopping-cart":"<circle cx=\"8\" cy=\"21\" r=\"1\" /> <circle cx=\"19\" cy=\"21\" r=\"1\" /> <path d=\"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12\" />","shopping-bag":"<path d=\"M16 10a4 4 0 0 1-8 0\" /> <path d=\"M3.103 6.034h17.794\" /> <path d=\"M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z\" />","shopping-basket":"<path d=\"m15 11-1 9\" /> <path d=\"m19 11-4-7\" /> <path d=\"M2 11h20\" /> <path d=\"m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4\" /> <path d=\"M4.5 15.5h15\" /> <path d=\"m5 11 4-7\" /> <path d=\"m9 11 1 9\" />","store":"<path d=\"M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5\" /> <path d=\"M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244\" /> <path d=\"M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05\" />","tag":"<path d=\"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z\" /> <circle cx=\"7.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\" />","tags":"<path d=\"M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z\" /> <path d=\"M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193\" /> <circle cx=\"10.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\" />","gift":"<path d=\"M12 7v14\" /> <path d=\"M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8\" /> <path d=\"M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5\" /> <rect x=\"3\" y=\"7\" width=\"18\" height=\"4\" rx=\"1\" />","package":"<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\" /> <path d=\"M12 22V12\" /> <polyline points=\"3.29 7 12 12 20.71 7\" /> <path d=\"m7.5 4.27 9 5.15\" />","barcode":"<path d=\"M3 5v14\" /> <path d=\"M8 5v14\" /> <path d=\"M12 5v14\" /> <path d=\"M17 5v14\" /> <path d=\"M21 5v14\" />","glasses":"<circle cx=\"6\" cy=\"15\" r=\"4\" /> <circle cx=\"18\" cy=\"15\" r=\"4\" /> <path d=\"M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2\" /> <path d=\"M2.5 13 5 7c.7-1.3 1.4-2 3-2\" /> <path d=\"M21.5 13 19 7c-.7-1.3-1.5-2-3-2\" />","watch":"<path d=\"M12 10v2.2l1.6 1\" /> <path d=\"m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05\" /> <path d=\"m7.88 16.36.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05\" /> <circle cx=\"12\" cy=\"12\" r=\"6\" />","shirt":"<path d=\"M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z\" />","footprints":"<path d=\"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z\" /> <path d=\"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z\" /> <path d=\"M16 17h4\" /> <path d=\"M4 13h4\" />","gem":"<path d=\"M10.5 3 8 9l4 13 4-13-2.5-6\" /> <path d=\"M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z\" /> <path d=\"M2 9h20\" />","car":"<path d=\"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2\" /> <circle cx=\"7\" cy=\"17\" r=\"2\" /> <path d=\"M9 17h6\" /> <circle cx=\"17\" cy=\"17\" r=\"2\" />","car-front":"<path d=\"m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8\" /> <path d=\"M7 14h.01\" /> <path d=\"M17 14h.01\" /> <rect width=\"18\" height=\"8\" x=\"3\" y=\"10\" rx=\"2\" /> <path d=\"M5 18v2\" /> <path d=\"M19 18v2\" />","bus":"<path d=\"M8 6v6\" /> <path d=\"M15 6v6\" /> <path d=\"M2 12h19.6\" /> <path d=\"M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3\" /> <circle cx=\"7\" cy=\"18\" r=\"2\" /> <path d=\"M9 18h5\" /> <circle cx=\"16\" cy=\"18\" r=\"2\" />","train-front":"<path d=\"M8 3.1V7a4 4 0 0 0 8 0V3.1\" /> <path d=\"m9 15-1-1\" /> <path d=\"m15 15 1-1\" /> <path d=\"M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z\" /> <path d=\"m8 19-2 3\" /> <path d=\"m16 19 2 3\" />","tram-front":"<rect width=\"16\" height=\"16\" x=\"4\" y=\"3\" rx=\"2\" /> <path d=\"M4 11h16\" /> <path d=\"M12 3v8\" /> <path d=\"m8 19-2 3\" /> <path d=\"m18 22-2-3\" /> <path d=\"M8 15h.01\" /> <path d=\"M16 15h.01\" />","plane":"<path d=\"M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z\" />","plane-takeoff":"<path d=\"M2 22h20\" /> <path d=\"M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z\" />","fuel":"<path d=\"M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5\" /> <path d=\"M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16\" /> <path d=\"M2 21h13\" /> <path d=\"M3 9h11\" />","bike":"<circle cx=\"18.5\" cy=\"17.5\" r=\"3.5\" /> <circle cx=\"5.5\" cy=\"17.5\" r=\"3.5\" /> <circle cx=\"15\" cy=\"5\" r=\"1\" /> <path d=\"M12 17.5V14l-3-3 4-3 2 3h2\" />","ship":"<path d=\"M12 10.189V14\" /> <path d=\"M12 2v3\" /> <path d=\"M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6\" /> <path d=\"M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76\" /> <path d=\"M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1\" />","sailboat":"<path d=\"M10 2v15\" /> <path d=\"M7 22a4 4 0 0 1-4-4 1 1 0 0 1 1-1h16a1 1 0 0 1 1 1 4 4 0 0 1-4 4z\" /> <path d=\"M9.159 2.46a1 1 0 0 1 1.521-.193l9.977 8.98A1 1 0 0 1 20 13H4a1 1 0 0 1-.824-1.567z\" />","truck":"<path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\" /> <path d=\"M15 18H9\" /> <path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14\" /> <circle cx=\"17\" cy=\"18\" r=\"2\" /> <circle cx=\"7\" cy=\"18\" r=\"2\" />","parking-meter":"<path d=\"M11 15h2\" /> <path d=\"M12 12v3\" /> <path d=\"M12 19v3\" /> <path d=\"M15.282 19a1 1 0 0 0 .948-.68l2.37-6.988a7 7 0 1 0-13.2 0l2.37 6.988a1 1 0 0 0 .948.68z\" /> <path d=\"M9 9a3 3 0 1 1 6 0\" />","caravan":"<path d=\"M18 19V9a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v8a2 2 0 0 0 2 2h2\" /> <path d=\"M2 9h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2\" /> <path d=\"M22 17v1a1 1 0 0 1-1 1H10v-9a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v9\" /> <circle cx=\"8\" cy=\"19\" r=\"2\" />","anchor":"<path d=\"M12 6v16\" /> <path d=\"m19 13 2-1a9 9 0 0 1-18 0l2 1\" /> <path d=\"M9 11h6\" /> <circle cx=\"12\" cy=\"4\" r=\"2\" />","rocket":"<path d=\"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5\" /> <path d=\"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09\" /> <path d=\"M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z\" /> <path d=\"M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05\" />","house":"<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\" /> <path d=\"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\" />","building":"<path d=\"M12 10h.01\" /> <path d=\"M12 14h.01\" /> <path d=\"M12 6h.01\" /> <path d=\"M16 10h.01\" /> <path d=\"M16 14h.01\" /> <path d=\"M16 6h.01\" /> <path d=\"M8 10h.01\" /> <path d=\"M8 14h.01\" /> <path d=\"M8 6h.01\" /> <path d=\"M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3\" /> <rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\" />","building-2":"<path d=\"M10 12h4\" /> <path d=\"M10 8h4\" /> <path d=\"M14 21v-3a2 2 0 0 0-4 0v3\" /> <path d=\"M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2\" /> <path d=\"M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16\" />","hotel":"<path d=\"M10 22v-6.57\" /> <path d=\"M12 11h.01\" /> <path d=\"M12 7h.01\" /> <path d=\"M14 15.43V22\" /> <path d=\"M15 16a5 5 0 0 0-6 0\" /> <path d=\"M16 11h.01\" /> <path d=\"M16 7h.01\" /> <path d=\"M8 11h.01\" /> <path d=\"M8 7h.01\" /> <rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\" />","bed-double":"<path d=\"M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8\" /> <path d=\"M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4\" /> <path d=\"M12 4v6\" /> <path d=\"M2 18h20\" />","bath":"<path d=\"M10 4 8 6\" /> <path d=\"M17 19v2\" /> <path d=\"M2 12h20\" /> <path d=\"M7 19v2\" /> <path d=\"M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5\" />","sofa":"<path d=\"M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3\" /> <path d=\"M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z\" /> <path d=\"M4 18v2\" /> <path d=\"M20 18v2\" /> <path d=\"M12 4v9\" />","armchair":"<path d=\"M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3\" /> <path d=\"M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z\" /> <path d=\"M5 18v2\" /> <path d=\"M19 18v2\" />","lamp":"<path d=\"M12 12v6\" /> <path d=\"M4.077 10.615A1 1 0 0 0 5 12h14a1 1 0 0 0 .923-1.385l-3.077-7.384A2 2 0 0 0 15 2H9a2 2 0 0 0-1.846 1.23Z\" /> <path d=\"M8 20a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z\" />","lightbulb":"<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\" /> <path d=\"M9 18h6\" /> <path d=\"M10 22h4\" />","zap":"<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\" />","plug":"<path d=\"M12 22v-5\" /> <path d=\"M15 8V2\" /> <path d=\"M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z\" /> <path d=\"M9 8V2\" />","droplets":"<path d=\"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z\" /> <path d=\"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97\" />","flame":"<path d=\"M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4\" />","wifi":"<path d=\"M12 20h.01\" /> <path d=\"M2 8.82a15 15 0 0 1 20 0\" /> <path d=\"M5 12.859a10 10 0 0 1 14 0\" /> <path d=\"M8.5 16.429a5 5 0 0 1 7 0\" />","router":"<rect width=\"20\" height=\"8\" x=\"2\" y=\"14\" rx=\"2\" /> <path d=\"M6.01 18H6\" /> <path d=\"M10.01 18H10\" /> <path d=\"M15 10v4\" /> <path d=\"M17.84 7.17a4 4 0 0 0-5.66 0\" /> <path d=\"M20.66 4.34a8 8 0 0 0-11.31 0\" />","phone":"<path d=\"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384\" />","smartphone":"<rect width=\"14\" height=\"20\" x=\"5\" y=\"2\" rx=\"2\" ry=\"2\" /> <path d=\"M12 18h.01\" />","tablet":"<rect width=\"16\" height=\"20\" x=\"4\" y=\"2\" rx=\"2\" ry=\"2\" /> <line x1=\"12\" x2=\"12.01\" y1=\"18\" y2=\"18\" />","tv":"<path d=\"m17 2-5 5-5-5\" /> <rect width=\"20\" height=\"15\" x=\"2\" y=\"7\" rx=\"2\" />","monitor":"<rect width=\"20\" height=\"14\" x=\"2\" y=\"3\" rx=\"2\" /> <line x1=\"8\" x2=\"16\" y1=\"21\" y2=\"21\" /> <line x1=\"12\" x2=\"12\" y1=\"17\" y2=\"21\" />","washing-machine":"<path d=\"M3 6h3\" /> <path d=\"M17 6h.01\" /> <rect width=\"18\" height=\"20\" x=\"3\" y=\"2\" rx=\"2\" /> <circle cx=\"12\" cy=\"13\" r=\"5\" /> <path d=\"M12 18a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 1 0-5\" />","refrigerator":"<path d=\"M5 6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6Z\" /> <path d=\"M5 10h14\" /> <path d=\"M15 7v6\" />","microwave":"<rect width=\"20\" height=\"15\" x=\"2\" y=\"4\" rx=\"2\" /> <rect width=\"8\" height=\"7\" x=\"6\" y=\"8\" rx=\"1\" /> <path d=\"M18 8v7\" /> <path d=\"M6 19v2\" /> <path d=\"M18 19v2\" />","fan":"<path d=\"M10.827 16.379a6.082 6.082 0 0 1-8.618-7.002l5.412 1.45a6.082 6.082 0 0 1 7.002-8.618l-1.45 5.412a6.082 6.082 0 0 1 8.618 7.002l-5.412-1.45a6.082 6.082 0 0 1-7.002 8.618l1.45-5.412Z\" /> <path d=\"M12 12v.01\" />","thermometer":"<path d=\"M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z\" />","key":"<path d=\"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4\" /> <path d=\"m21 2-9.6 9.6\" /> <circle cx=\"7.5\" cy=\"15.5\" r=\"5.5\" />","door-open":"<path d=\"M11 20H2\" /> <path d=\"M11 4.562v16.157a1 1 0 0 0 1.242.97L19 20V5.562a2 2 0 0 0-1.515-1.94l-4-1A2 2 0 0 0 11 4.561z\" /> <path d=\"M11 4H8a2 2 0 0 0-2 2v14\" /> <path d=\"M14 12h.01\" /> <path d=\"M22 20h-3\" />","wrench":"<path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z\" />","hammer":"<path d=\"m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9\" /> <path d=\"m18 15 4-4\" /> <path d=\"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5\" />","paintbrush":"<path d=\"m14.622 17.897-10.68-2.913\" /> <path d=\"M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z\" /> <path d=\"M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15\" />","paint-roller":"<rect width=\"16\" height=\"6\" x=\"2\" y=\"2\" rx=\"2\" /> <path d=\"M10 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2\" /> <rect width=\"4\" height=\"6\" x=\"8\" y=\"16\" rx=\"1\" />","trash-2":"<path d=\"M10 11v6\" /> <path d=\"M14 11v6\" /> <path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\" /> <path d=\"M3 6h18\" /> <path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\" />","recycle":"<path d=\"M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5\" /> <path d=\"M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12\" /> <path d=\"m14 16-3 3 3 3\" /> <path d=\"M8.293 13.596 7.196 9.5 3.1 10.598\" /> <path d=\"m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843\" /> <path d=\"m13.378 9.633 4.096 1.098 1.097-4.096\" />","umbrella":"<path d=\"M12 13v7a2 2 0 0 0 4 0\" /> <path d=\"M12 2v2\" /> <path d=\"M20.992 13a1 1 0 0 0 .97-1.274 10.284 10.284 0 0 0-19.923 0A1 1 0 0 0 3 13z\" />","fence":"<path d=\"M4 3 2 5v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z\" /> <path d=\"M6 8h4\" /> <path d=\"M6 18h4\" /> <path d=\"m12 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z\" /> <path d=\"M14 8h4\" /> <path d=\"M14 18h4\" /> <path d=\"m20 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z\" />","heart-pulse":"<path d=\"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5\" /> <path d=\"M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27\" />","pill":"<path d=\"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z\" /> <path d=\"m8.5 8.5 7 7\" />","stethoscope":"<path d=\"M11 2v2\" /> <path d=\"M5 2v2\" /> <path d=\"M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1\" /> <path d=\"M8 15a6 6 0 0 0 12 0v-3\" /> <circle cx=\"20\" cy=\"10\" r=\"2\" />","syringe":"<path d=\"m18 2 4 4\" /> <path d=\"m17 7 3-3\" /> <path d=\"M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5\" /> <path d=\"m9 11 4 4\" /> <path d=\"m5 19-3 3\" /> <path d=\"m14 4 6 6\" />","dumbbell":"<path d=\"M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z\" /> <path d=\"m2.5 21.5 1.4-1.4\" /> <path d=\"m20.1 3.9 1.4-1.4\" /> <path d=\"M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z\" /> <path d=\"m9.6 14.4 4.8-4.8\" />","activity":"<path d=\"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2\" />","cross":"<path d=\"M4 9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4a1 1 0 0 1 1 1v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-4a1 1 0 0 1 1-1h4a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-4a1 1 0 0 1-1-1V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4a1 1 0 0 1-1 1z\" />","hospital":"<path d=\"M12 7v4\" /> <path d=\"M14 21v-3a2 2 0 0 0-4 0v3\" /> <path d=\"M14 9h-4\" /> <path d=\"M18 11h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2\" /> <path d=\"M18 21V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16\" />","ambulance":"<path d=\"M10 10H6\" /> <path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\" /> <path d=\"M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14\" /> <path d=\"M8 8v4\" /> <path d=\"M9 18h6\" /> <circle cx=\"17\" cy=\"18\" r=\"2\" /> <circle cx=\"7\" cy=\"18\" r=\"2\" />","bandage":"<path d=\"M10 10.01h.01\" /> <path d=\"M10 14.01h.01\" /> <path d=\"M14 10.01h.01\" /> <path d=\"M14 14.01h.01\" /> <path d=\"M18 6v12\" /> <path d=\"M6 6v12\" /> <rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"2\" />","brain":"<path d=\"M12 18V5\" /> <path d=\"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4\" /> <path d=\"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5\" /> <path d=\"M17.997 5.125a4 4 0 0 1 2.526 5.77\" /> <path d=\"M18 18a4 4 0 0 0 2-7.464\" /> <path d=\"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517\" /> <path d=\"M6 18a4 4 0 0 1-2-7.464\" /> <path d=\"M6.003 5.125a4 4 0 0 0-2.526 5.77\" />","bone":"<path d=\"M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z\" />","hand-heart":"<path d=\"M11 14h2a2 2 0 0 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16\" /> <path d=\"m14.45 13.39 5.05-4.694C20.196 8 21 6.85 21 5.75a2.75 2.75 0 0 0-4.797-1.837.276.276 0 0 1-.406 0A2.75 2.75 0 0 0 11 5.75c0 1.2.802 2.248 1.5 2.946L16 11.95\" /> <path d=\"m2 15 6 6\" /> <path d=\"m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a1 1 0 0 0-2.75-2.91\" />","film":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /> <path d=\"M7 3v18\" /> <path d=\"M3 7.5h4\" /> <path d=\"M3 12h18\" /> <path d=\"M3 16.5h4\" /> <path d=\"M17 3v18\" /> <path d=\"M17 7.5h4\" /> <path d=\"M17 16.5h4\" />","clapperboard":"<path d=\"m12.296 3.464 3.02 3.956\" /> <path d=\"M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z\" /> <path d=\"M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\" /> <path d=\"m6.18 5.276 3.1 3.899\" />","music":"<path d=\"M9 18V5l12-2v13\" /> <circle cx=\"6\" cy=\"18\" r=\"3\" /> <circle cx=\"18\" cy=\"16\" r=\"3\" />","headphones":"<path d=\"M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3\" />","mic":"<path d=\"M12 19v3\" /> <path d=\"M19 10v2a7 7 0 0 1-14 0v-2\" /> <rect x=\"9\" y=\"2\" width=\"6\" height=\"13\" rx=\"3\" />","gamepad-2":"<line x1=\"6\" x2=\"10\" y1=\"11\" y2=\"11\" /> <line x1=\"8\" x2=\"8\" y1=\"9\" y2=\"13\" /> <line x1=\"15\" x2=\"15.01\" y1=\"12\" y2=\"12\" /> <line x1=\"18\" x2=\"18.01\" y1=\"10\" y2=\"10\" /> <path d=\"M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z\" />","dice-5":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\" /> <path d=\"M16 8h.01\" /> <path d=\"M8 8h.01\" /> <path d=\"M8 16h.01\" /> <path d=\"M16 16h.01\" /> <path d=\"M12 12h.01\" />","ticket":"<path d=\"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z\" /> <path d=\"M13 5v2\" /> <path d=\"M13 17v2\" /> <path d=\"M13 11v2\" />","palette":"<path d=\"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z\" /> <circle cx=\"13.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\" /> <circle cx=\"17.5\" cy=\"10.5\" r=\".5\" fill=\"currentColor\" /> <circle cx=\"6.5\" cy=\"12.5\" r=\".5\" fill=\"currentColor\" /> <circle cx=\"8.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\" />","camera":"<path d=\"M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z\" /> <circle cx=\"12\" cy=\"13\" r=\"3\" />","image":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\" /> <circle cx=\"9\" cy=\"9\" r=\"2\" /> <path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\" />","book":"<path d=\"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20\" />","book-open":"<path d=\"M12 7v14\" /> <path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\" />","library":"<path d=\"m16 6 4 14\" /> <path d=\"M12 6v14\" /> <path d=\"M8 8v12\" /> <path d=\"M4 4v16\" />","graduation-cap":"<path d=\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z\" /> <path d=\"M22 10v6\" /> <path d=\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\" />","scissors":"<circle cx=\"6\" cy=\"6\" r=\"3\" /> <path d=\"M8.12 8.12 12 12\" /> <path d=\"M20 4 8.12 15.88\" /> <circle cx=\"6\" cy=\"18\" r=\"3\" /> <path d=\"M14.8 14.8 20 20\" />","sparkles":"<path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z\" /> <path d=\"M20 2v4\" /> <path d=\"M22 4h-4\" /> <circle cx=\"4\" cy=\"20\" r=\"2\" />","party-popper":"<path d=\"M5.8 11.3 2 22l10.7-3.79\" /> <path d=\"M4 3h.01\" /> <path d=\"M22 8h.01\" /> <path d=\"M15 2h.01\" /> <path d=\"M22 20h.01\" /> <path d=\"m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10\" /> <path d=\"m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17\" /> <path d=\"m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7\" /> <path d=\"M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z\" />","guitar":"<path d=\"m11.9 12.1 4.514-4.514\" /> <path d=\"M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4z\" /> <path d=\"m6 16 2 2\" /> <path d=\"M8.23 9.85A3 3 0 0 1 11 8a5 5 0 0 1 5 5 3 3 0 0 1-1.85 2.77l-.92.38A2 2 0 0 0 12 18a4 4 0 0 1-4 4 6 6 0 0 1-6-6 4 4 0 0 1 4-4 2 2 0 0 0 1.85-1.23z\" />","tent":"<path d=\"M3.5 21 14 3\" /> <path d=\"M20.5 21 10 3\" /> <path d=\"M15.5 21 12 15l-3.5 6\" /> <path d=\"M2 21h20\" />","mountain":"<path d=\"m8 3 4 8 5-5 5 15H2L8 3z\" />","trophy":"<path d=\"M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978\" /> <path d=\"M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978\" /> <path d=\"M18 9h1.5a1 1 0 0 0 0-5H18\" /> <path d=\"M4 22h16\" /> <path d=\"M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z\" /> <path d=\"M6 9H4.5a1 1 0 0 1 0-5H6\" />","medal":"<path d=\"M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15\" /> <path d=\"M11 12 5.12 2.2\" /> <path d=\"m13 12 5.88-9.8\" /> <path d=\"M8 7h8\" /> <circle cx=\"12\" cy=\"17\" r=\"5\" /> <path d=\"M12 18v-2h-.5\" />","target":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <circle cx=\"12\" cy=\"12\" r=\"6\" /> <circle cx=\"12\" cy=\"12\" r=\"2\" />","sun":"<circle cx=\"12\" cy=\"12\" r=\"4\" /> <path d=\"M12 2v2\" /> <path d=\"M12 20v2\" /> <path d=\"m4.93 4.93 1.41 1.41\" /> <path d=\"m17.66 17.66 1.41 1.41\" /> <path d=\"M2 12h2\" /> <path d=\"M20 12h2\" /> <path d=\"m6.34 17.66-1.41 1.41\" /> <path d=\"m19.07 4.93-1.41 1.41\" />","waves":"<path d=\"M2 12q2.5 2 5 0t5 0 5 0 5 0\" /> <path d=\"M2 19q2.5 2 5 0t5 0 5 0 5 0\" /> <path d=\"M2 5q2.5 2 5 0t5 0 5 0 5 0\" />","drama":"<path d=\"M10 11h.01\" /> <path d=\"M14 6h.01\" /> <path d=\"M18 6h.01\" /> <path d=\"M6.5 13.1h.01\" /> <path d=\"M22 5c0 9-4 12-6 12s-6-3-6-12c0-2 2-3 6-3s6 1 6 3\" /> <path d=\"M17.4 9.9c-.8.8-2 .8-2.8 0\" /> <path d=\"M10.1 7.1C9 7.2 7.7 7.7 6 8.6c-3.5 2-4.7 3.9-3.7 5.6 4.5 7.8 9.5 8.4 11.2 7.4.9-.5 1.9-2.1 1.9-4.7\" /> <path d=\"M9.1 16.5c.3-1.1 1.4-1.7 2.4-1.4\" />","puzzle":"<path d=\"M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z\" />","laptop":"<path d=\"M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z\" /> <path d=\"M20.054 15.987H3.946\" />","mouse":"<rect x=\"5\" y=\"2\" width=\"14\" height=\"20\" rx=\"7\" /> <path d=\"M12 6v4\" />","keyboard":"<path d=\"M10 8h.01\" /> <path d=\"M12 12h.01\" /> <path d=\"M14 8h.01\" /> <path d=\"M16 12h.01\" /> <path d=\"M18 8h.01\" /> <path d=\"M6 8h.01\" /> <path d=\"M7 16h10\" /> <path d=\"M8 12h.01\" /> <rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\" />","printer":"<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\" /> <path d=\"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6\" /> <rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\" />","server":"<rect width=\"20\" height=\"8\" x=\"2\" y=\"2\" rx=\"2\" ry=\"2\" /> <rect width=\"20\" height=\"8\" x=\"2\" y=\"14\" rx=\"2\" ry=\"2\" /> <line x1=\"6\" x2=\"6.01\" y1=\"6\" y2=\"6\" /> <line x1=\"6\" x2=\"6.01\" y1=\"18\" y2=\"18\" />","cloud":"<path d=\"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z\" />","briefcase":"<path d=\"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\" /> <rect width=\"20\" height=\"14\" x=\"2\" y=\"6\" rx=\"2\" />","calculator":"<rect width=\"16\" height=\"20\" x=\"4\" y=\"2\" rx=\"2\" /> <line x1=\"8\" x2=\"16\" y1=\"6\" y2=\"6\" /> <line x1=\"16\" x2=\"16\" y1=\"14\" y2=\"18\" /> <path d=\"M16 10h.01\" /> <path d=\"M12 10h.01\" /> <path d=\"M8 10h.01\" /> <path d=\"M12 14h.01\" /> <path d=\"M8 14h.01\" /> <path d=\"M12 18h.01\" /> <path d=\"M8 18h.01\" />","pen":"<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\" />","pencil":"<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\" /> <path d=\"m15 5 4 4\" />","file-text":"<path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\" /> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\" /> <path d=\"M10 9H8\" /> <path d=\"M16 13H8\" /> <path d=\"M16 17H8\" />","folder":"<path d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\" />","mail":"<path d=\"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7\" /> <rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\" />","calendar":"<path d=\"M8 2v4\" /> <path d=\"M16 2v4\" /> <rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" /> <path d=\"M3 10h18\" />","clock":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M12 6v6l4 2\" />","code":"<path d=\"m16 18 6-6-6-6\" /> <path d=\"m8 6-6 6 6 6\" />","newspaper":"<path d=\"M15 18h-5\" /> <path d=\"M18 14h-8\" /> <path d=\"M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2\" /> <rect width=\"8\" height=\"4\" x=\"10\" y=\"6\" rx=\"1\" />","clipboard-list":"<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\" /> <path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\" /> <path d=\"M12 11h4\" /> <path d=\"M12 16h4\" /> <path d=\"M8 11h.01\" /> <path d=\"M8 16h.01\" />","baby":"<path d=\"M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5\" /> <path d=\"M15 12h.01\" /> <path d=\"M19.38 6.813A9 9 0 0 1 20.8 10.2a2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1\" /> <path d=\"M9 12h.01\" />","dog":"<path d=\"M11.25 16.25h1.5L12 17z\" /> <path d=\"M16 14v.5\" /> <path d=\"M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309\" /> <path d=\"M8 14v.5\" /> <path d=\"M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5\" />","cat":"<path d=\"M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z\" /> <path d=\"M8 14v.5\" /> <path d=\"M16 14v.5\" /> <path d=\"M11.25 16.25h1.5L12 17l-.75-.75Z\" />","paw-print":"<circle cx=\"11\" cy=\"4\" r=\"2\" /> <circle cx=\"18\" cy=\"8\" r=\"2\" /> <circle cx=\"20\" cy=\"16\" r=\"2\" /> <path d=\"M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z\" />","bird":"<path d=\"M16 7h.01\" /> <path d=\"M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20\" /> <path d=\"m20 7 2 .5-2 .5\" /> <path d=\"M10 18v3\" /> <path d=\"M14 17.75V21\" /> <path d=\"M7 18a6 6 0 0 0 3.84-10.61\" />","rabbit":"<path d=\"M13 16a3 3 0 0 1 2.24 5\" /> <path d=\"M18 12h.01\" /> <path d=\"M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3\" /> <path d=\"M20 8.54V4a2 2 0 1 0-4 0v3\" /> <path d=\"M7.612 12.524a3 3 0 1 0-1.6 4.3\" />","blocks":"<path d=\"M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2\" /> <rect x=\"14\" y=\"2\" width=\"8\" height=\"8\" rx=\"1\" />","sprout":"<path d=\"M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3\" /> <path d=\"M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4\" /> <path d=\"M5 21h14\" />","trees":"<path d=\"M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z\" /> <path d=\"M7 16v6\" /> <path d=\"M13 19v3\" /> <path d=\"M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5\" />","tree-pine":"<path d=\"m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z\" /> <path d=\"M12 22v-3\" />","flower":"<circle cx=\"12\" cy=\"12\" r=\"3\" /> <path d=\"M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5\" /> <path d=\"M12 7.5V9\" /> <path d=\"M7.5 12H9\" /> <path d=\"M16.5 12H15\" /> <path d=\"M12 16.5V15\" /> <path d=\"m8 8 1.88 1.88\" /> <path d=\"M14.12 9.88 16 8\" /> <path d=\"m8 16 1.88-1.88\" /> <path d=\"M14.12 14.12 16 16\" />","leaf":"<path d=\"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z\" /> <path d=\"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12\" />","cigarette":"<path d=\"M17 12H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h14\" /> <path d=\"M18 8c0-2.5-2-2.5-2-5\" /> <path d=\"M21 16a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\" /> <path d=\"M22 8c0-2.5-2-2.5-2-5\" /> <path d=\"M7 12v4\" />","star":"<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\" />","heart":"<path d=\"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5\" />","percent":"<line x1=\"19\" x2=\"5\" y1=\"5\" y2=\"19\" /> <circle cx=\"6.5\" cy=\"6.5\" r=\"2.5\" /> <circle cx=\"17.5\" cy=\"17.5\" r=\"2.5\" />","map-pin":"<path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\" /> <circle cx=\"12\" cy=\"10\" r=\"3\" />","compass":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z\" />","flag":"<path d=\"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528\" />","bell":"<path d=\"M10.268 21a2 2 0 0 0 3.464 0\" /> <path d=\"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326\" />","wallet":"<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\" /> <path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\" />","wallet-cards":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /> <path d=\"M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2\" /> <path d=\"M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21\" />","banknote":"<rect width=\"20\" height=\"12\" x=\"2\" y=\"6\" rx=\"2\" /> <circle cx=\"12\" cy=\"12\" r=\"2\" /> <path d=\"M6 12h.01M18 12h.01\" />","coins":"<path d=\"M13.744 17.736a6 6 0 1 1-7.48-7.48\" /> <path d=\"M15 6h1v4\" /> <path d=\"m6.134 14.768.866-.5 2 3.464\" /> <circle cx=\"16\" cy=\"8\" r=\"6\" />","piggy-bank":"<path d=\"M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z\" /> <path d=\"M16 10h.01\" /> <path d=\"M2 8v1a2 2 0 0 0 2 2h1\" />","trending-up":"<path d=\"M16 7h6v6\" /> <path d=\"m22 7-8.5 8.5-5-5L2 17\" />","trending-down":"<path d=\"M16 17h6v-6\" /> <path d=\"m22 17-8.5-8.5-5 5L2 7\" />","hand-coins":"<path d=\"M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17\" /> <path d=\"m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9\" /> <path d=\"m2 16 6 6\" /> <circle cx=\"16\" cy=\"9\" r=\"2.9\" /> <circle cx=\"6\" cy=\"5\" r=\"3\" />","badge-dollar-sign":"<path d=\"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z\" /> <path d=\"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8\" /> <path d=\"M12 18V6\" />","dollar-sign":"<line x1=\"12\" x2=\"12\" y1=\"2\" y2=\"22\" /> <path d=\"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6\" />","circle-dollar-sign":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8\" /> <path d=\"M12 18V6\" />","landmark":"<path d=\"M10 18v-7\" /> <path d=\"M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z\" /> <path d=\"M14 18v-7\" /> <path d=\"M18 18v-7\" /> <path d=\"M3 22h18\" /> <path d=\"M6 18v-7\" />","handshake":"<path d=\"m11 17 2 2a1 1 0 1 0 3-3\" /> <path d=\"m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4\" /> <path d=\"m21 3 1 11h-2\" /> <path d=\"M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3\" /> <path d=\"M3 4h8\" />","users":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" /> <path d=\"M16 3.128a4 4 0 0 1 0 7.744\" /> <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\" /> <circle cx=\"9\" cy=\"7\" r=\"4\" />","user":"<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\" /> <circle cx=\"12\" cy=\"7\" r=\"4\" />","globe":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\" /> <path d=\"M2 12h20\" />","chart-line":"<path d=\"M3 3v16a2 2 0 0 0 2 2h16\" /> <path d=\"m19 9-5 5-4-4-3 3\" />","chart-bar":"<path d=\"M3 3v16a2 2 0 0 0 2 2h16\" /> <path d=\"M7 16h8\" /> <path d=\"M7 11h12\" /> <path d=\"M7 6h3\" />","chart-pie":"<path d=\"M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z\" /> <path d=\"M21.21 15.89A10 10 0 1 1 8 2.83\" />","chart-candlestick":"<path d=\"M9 5v4\" /> <rect width=\"4\" height=\"6\" x=\"7\" y=\"9\" rx=\"1\" /> <path d=\"M9 15v2\" /> <path d=\"M17 3v2\" /> <rect width=\"4\" height=\"8\" x=\"15\" y=\"5\" rx=\"1\" /> <path d=\"M17 13v3\" /> <path d=\"M3 3v16a2 2 0 0 0 2 2h16\" />","badge-percent":"<path d=\"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z\" /> <path d=\"m15 9-6 6\" /> <path d=\"M9 9h.01\" /> <path d=\"M15 15h.01\" />","bitcoin":"<path d=\"M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727\" />","receipt":"<path d=\"M12 17V7\" /> <path d=\"M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8\" /> <path d=\"M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z\" />","award":"<path d=\"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526\" /> <circle cx=\"12\" cy=\"8\" r=\"6\" />","crown":"<path d=\"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z\" /> <path d=\"M5 21h14\" />","scale":"<path d=\"M12 3v18\" /> <path d=\"m19 8 3 8a5 5 0 0 1-6 0zV7\" /> <path d=\"M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1\" /> <path d=\"m5 8 3 8a5 5 0 0 1-6 0zV7\" /> <path d=\"M7 21h10\" />","vault":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /> <circle cx=\"7.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\" /> <path d=\"m7.9 7.9 2.7 2.7\" /> <circle cx=\"16.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\" /> <path d=\"m13.4 10.6 2.7-2.7\" /> <circle cx=\"7.5\" cy=\"16.5\" r=\".5\" fill=\"currentColor\" /> <path d=\"m7.9 16.1 2.7-2.7\" /> <circle cx=\"16.5\" cy=\"16.5\" r=\".5\" fill=\"currentColor\" /> <path d=\"m13.4 13.4 2.7 2.7\" /> <circle cx=\"12\" cy=\"12\" r=\"2\" />","file-check":"<path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\" /> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\" /> <path d=\"m9 15 2 2 4-4\" />","folders":"<path d=\"M20 5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2.5a1.5 1.5 0 0 1 1.2.6l.6.8a1.5 1.5 0 0 0 1.2.6z\" /> <path d=\"M3 8.268a2 2 0 0 0-1 1.738V19a2 2 0 0 0 2 2h11a2 2 0 0 0 1.732-1\" />","folder-open":"<path d=\"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2\" />","layers":"<path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z\" /> <path d=\"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12\" /> <path d=\"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17\" />","layout-grid":"<rect width=\"7\" height=\"7\" x=\"3\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"7\" x=\"14\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"7\" x=\"14\" y=\"14\" rx=\"1\" /> <rect width=\"7\" height=\"7\" x=\"3\" y=\"14\" rx=\"1\" />","layout-dashboard":"<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\" /> <rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\" />","grid-2x2":"<path d=\"M12 3v18\" /> <path d=\"M3 12h18\" /> <rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" />","boxes":"<path d=\"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z\" /> <path d=\"m7 16.5-4.74-2.85\" /> <path d=\"m7 16.5 5-3\" /> <path d=\"M7 16.5v5.17\" /> <path d=\"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z\" /> <path d=\"m17 16.5-5-3\" /> <path d=\"m17 16.5 4.74-2.85\" /> <path d=\"M17 16.5v5.17\" /> <path d=\"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z\" /> <path d=\"M12 8 7.26 5.15\" /> <path d=\"m12 8 4.74-2.85\" /> <path d=\"M12 13.5V8\" />","box":"<path d=\"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z\" /> <path d=\"m3.3 7 8.7 5 8.7-5\" /> <path d=\"M12 22V12\" />","archive":"<rect width=\"20\" height=\"5\" x=\"2\" y=\"3\" rx=\"1\" /> <path d=\"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8\" /> <path d=\"M10 12h4\" />","bookmark":"<path d=\"M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z\" />","list":"<path d=\"M3 5h.01\" /> <path d=\"M3 12h.01\" /> <path d=\"M3 19h.01\" /> <path d=\"M8 5h13\" /> <path d=\"M8 12h13\" /> <path d=\"M8 19h13\" />","square-stack":"<path d=\"M4 10c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2\" /> <path d=\"M10 16c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2\" /> <rect width=\"8\" height=\"8\" x=\"14\" y=\"14\" rx=\"2\" />","component":"<path d=\"M15.536 11.293a1 1 0 0 0 0 1.414l2.376 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z\" /> <path d=\"M2.297 11.293a1 1 0 0 0 0 1.414l2.377 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414L6.088 8.916a1 1 0 0 0-1.414 0z\" /> <path d=\"M8.916 17.912a1 1 0 0 0 0 1.415l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.415l-2.377-2.376a1 1 0 0 0-1.414 0z\" /> <path d=\"M8.916 4.674a1 1 0 0 0 0 1.414l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z\" />","shapes":"<path d=\"M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z\" /> <rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\" /> <circle cx=\"17.5\" cy=\"17.5\" r=\"3.5\" />","repeat":"<path d=\"m17 2 4 4-4 4\" /> <path d=\"M3 11v-1a4 4 0 0 1 4-4h14\" /> <path d=\"m7 22-4-4 4-4\" /> <path d=\"M21 13v1a4 4 0 0 1-4 4H3\" />","lock":"<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\" /> <path d=\"M7 11V7a5 5 0 0 1 10 0v4\" />","shield":"<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" />","container":"<path d=\"M22 7.7c0-.6-.4-1.2-.8-1.5l-6.3-3.9a1.72 1.72 0 0 0-1.7 0l-10.3 6c-.5.2-.9.8-.9 1.4v6.6c0 .5.4 1.2.8 1.5l6.3 3.9a1.72 1.72 0 0 0 1.7 0l10.3-6c.5-.3.9-1 .9-1.5Z\" /> <path d=\"M10 21.9V14L2.1 9.1\" /> <path d=\"m10 14 11.9-6.9\" /> <path d=\"M14 19.8v-8.1\" /> <path d=\"M18 17.5V9.4\" />"};
const CAT_GLYPH_KEYS=Object.keys(CAT_GLYPHS);
// Type-relevant glyph sets shown in the category editor
const CAT_GLYPHS_EXP=["utensils","utensils-crossed","coffee","cup-soda","pizza","sandwich","salad","soup","ice-cream-cone","cake","cookie","candy","croissant","beer","wine","martini","milk","apple","carrot","popcorn","fish","egg","drumstick","wheat","shopping-cart","shopping-bag","shopping-basket","store","tag","tags","gift","package","barcode","glasses","watch","shirt","footprints","gem","car","car-front","bus","train-front","tram-front","plane","plane-takeoff","fuel","bike","ship","sailboat","truck","parking-meter","caravan","anchor","rocket","house","building","building-2","hotel","bed-double","bath","sofa","armchair","lamp","lightbulb","zap","plug","droplets","flame","wifi","router","phone","smartphone","tablet","tv","monitor","washing-machine","refrigerator","microwave","fan","thermometer","key","door-open","wrench","hammer","paintbrush","paint-roller","trash-2","recycle","umbrella","fence","heart-pulse","pill","stethoscope","syringe","dumbbell","activity","cross","hospital","ambulance","bandage","brain","bone","hand-heart","film","clapperboard","music","headphones","mic","gamepad-2","dice-5","ticket","palette","camera","image","book","book-open","library","graduation-cap","scissors","sparkles","party-popper","guitar","tent","mountain","trophy","medal","target","sun","waves","drama","puzzle","laptop","mouse","keyboard","printer","server","cloud","briefcase","calculator","pen","pencil","file-text","folder","mail","calendar","clock","code","newspaper","clipboard-list","baby","dog","cat","paw-print","bird","rabbit","blocks","sprout","trees","tree-pine","flower","leaf","cigarette","star","heart","percent","map-pin","compass","flag","bell"];
const CAT_GLYPHS_INC=["wallet","wallet-cards","banknote","coins","piggy-bank","trending-up","trending-down","hand-coins","badge-dollar-sign","dollar-sign","circle-dollar-sign","landmark","building","building-2","handshake","users","user","globe","chart-line","chart-bar","chart-pie","chart-candlestick","percent","badge-percent","bitcoin","gem","receipt","briefcase","laptop","key","package","store","gift","award","trophy","medal","star","crown","scale","calculator","vault","graduation-cap","book","file-check","ticket","sprout"];
const CAT_GLYPHS_GROUP=["folder","folders","folder-open","layers","layout-grid","layout-dashboard","grid-2x2","boxes","box","package","archive","tags","tag","bookmark","list","square-stack","blocks","component","shapes","target","chart-pie","gem","wallet","repeat","calendar","lock","shield","sparkles","trending-up","house","sprout","flag","container"];
const CAT_PALETTE=["#34d399","#f87171","#60a5fa","#fbbf24","#a78bfa","#fb923c","#22d3ee","#f472b6","#818cf8","#4ade80","#fb7185","#facc15"];
const hashColor=(s)=>CAT_PALETTE[[...String(s||"x")].reduce((a,c)=>a+c.charCodeAt(0),0)%CAT_PALETTE.length];
// Bundled brand glyphs (Simple Icons) — offline, private, crisp. {domain:{h:hex,p:path}}
const BRAND_ICONS={"netflix.com":{"h":"E50914","p":"M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24zm8.489 0v9.63L18.6 22.951c-.043-7.86-.004-15.913.002-22.95zM5.398 1.05V24c1.873-.225 2.81-.312 4.715-.398v-9.22z"},"spotify.com":{"h":"1ED760","p":"M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"},"youtube.com":{"h":"FF0000","p":"M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"},"apple.com":{"h":"000000","p":"M20.57 17.735h-1.815l-3.34-9.203h1.633l2.02 5.987c.075.231.273.9.586 2.012l.297-.997.33-1.006 2.094-6.004H24zm-5.344-.066a5.76 5.76 0 0 1-1.55.207c-1.23 0-1.84-.693-1.84-2.087V9.646h-1.063V8.532h1.121V7.081l1.476-.602v2.062h1.707v1.113H13.38v5.805c0 .446.074.75.214.932.14.182.396.264.75.264.207 0 .495-.041.883-.115zm-7.29-5.343c.017 1.764 1.55 2.358 1.567 2.366-.017.042-.248.842-.808 1.658-.487.71-.99 1.418-1.79 1.435-.783.016-1.03-.462-1.93-.462-.89 0-1.17.445-1.913.478-.758.025-1.344-.775-1.838-1.484-.998-1.451-1.765-4.098-.734-5.88.51-.89 1.426-1.451 2.416-1.46.75-.016 1.468.512 1.93.512.461 0 1.327-.627 2.234-.536.38.016 1.452.157 2.136 1.154-.058.033-1.278.743-1.27 2.219M6.468 7.988c.404-.495.685-1.18.61-1.864-.585.025-1.294.388-1.723.883-.38.437-.71 1.138-.619 1.806.652.05 1.328-.338 1.732-.825Z"},"music.apple.com":{"h":"FA243C","p":"M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.045-1.773-.6-1.943-1.536a1.88 1.88 0 011.038-2.022c.323-.16.67-.25 1.018-.324.378-.082.758-.153 1.134-.24.274-.063.457-.23.51-.516a.904.904 0 00.02-.193c0-1.815 0-3.63-.002-5.443a.725.725 0 00-.026-.185c-.04-.15-.15-.243-.304-.234-.16.01-.318.035-.475.066-.76.15-1.52.303-2.28.456l-2.325.47-1.374.278c-.016.003-.032.01-.048.013-.277.077-.377.203-.39.49-.002.042 0 .086 0 .13-.002 2.602 0 5.204-.003 7.805 0 .42-.047.836-.215 1.227-.278.64-.77 1.04-1.434 1.233-.35.1-.71.16-1.075.172-.96.036-1.755-.6-1.92-1.544-.14-.812.23-1.685 1.154-2.075.357-.15.73-.232 1.108-.31.287-.06.575-.116.86-.177.383-.083.583-.323.6-.714v-.15c0-2.96 0-5.922.002-8.882 0-.123.013-.25.042-.37.07-.285.273-.448.546-.518.255-.066.515-.112.774-.165.733-.15 1.466-.296 2.2-.444l2.27-.46c.67-.134 1.34-.27 2.01-.403.22-.043.442-.088.663-.106.31-.025.523.17.554.482.008.073.012.148.012.223.002 1.91.002 3.822 0 5.732z"},"amazon.com":{"h":"00A8E1","p":"M1.8054 12.403c-.0699-.096-.144-.1746-.144-.3538v-.5945c0-.2523.0179-.484-.168-.6576-.1466-.1408-.3892-.1903-.5752-.1903-.3635 0-.7688.136-.8542.5849-.0087.0476.0258.0728.0573.08l.3703.0398c.0345-.0014.0597-.0358.066-.0703.032-.1544.1616-.2292.3073-.2292.0786 0 .1679.0292.214.099.0538.0787.0466.1864.0466.2772v.0495c-.2214.0248-.511.0413-.7183.1325-.2393.1034-.4072.314-.4072.6242 0 .3965.2504.595.5717.595.2718 0 .4198-.064.6295-.2776.0694.1005.0922.1495.219.2548.0285.015.0649.0136.0902-.0092l.294-.2524c.0312-.0257.0253-.067.001-.102m-.68-.5765c0 .149.0035.2728-.0713.4053-.0606.1072-.1572.1732-.2645.1732-.1465 0-.232-.1116-.232-.2766 0-.3257.2917-.3844.5679-.3844zm5.6864.5766c-.0694-.0961-.1441-.1747-.1441-.3539v-.5945c0-.2523.018-.484-.168-.6576-.1465-.1408-.3892-.1903-.5751-.1903-.3636 0-.7688.136-.8537.5849-.0093.0476.0257.0728.0568.08l.3703.0398c.0344-.0014.0596-.0358.066-.0703.032-.1544.1616-.2292.3072-.2292.0786 0 .168.0292.214.099.0539.0787.0466.1864.0466.2772v.0495c-.2213.0248-.511.0413-.7178.1325-.2397.1034-.4076.314-.4076.6242 0 .3965.2504.595.5717.595.2717 0 .4202-.064.63-.2776.0689.1005.0916.1495.2188.2548a.0788.0788 0 0 0 .0898-.0092l.001.001c.0767-.068.215-.1883.293-.2534.0312-.0257.0259-.067.0011-.102m-.7513-.1712c-.0607.1072-.1572.1732-.2646.1732-.1465 0-.232-.1116-.232-.2766 0-.3257.2918-.3844.568-.3844v.0825c0 .149.0038.2728-.0714.4053m5.16.5307h-.3806a.0717.0717 0 0 1-.0684-.0704l-.0007-1.9608c.0032-.0359.0349-.064.0734-.064h.3542a.0725.0725 0 0 1 .0678.0547v.2999h.0073c.107-.2682.2566-.396.5204-.396.1711 0 .3387.0618.4457.231.0998.1567.0998.4206.0998.6104v1.2335c-.0043.0347-.0355.0617-.0732.0617h-.3829a.072.072 0 0 1-.068-.0617v-1.0643c0-.2145.025-.528-.2388-.528-.0927 0-.1782.0619-.221.1567-.0535.1197-.0607.2393-.0607.3713v1.0554a.073.073 0 0 1-.0743.0706M9.612 10.6259c.5668 0 .8733.4868.8733 1.1055 0 .598-.3385 1.0724-.8733 1.0724-.5561 0-.8592-.4868-.8592-1.0931 0-.6104.3066-1.0848.8592-1.0848m.0035.4002c-.2817 0-.2994.3835-.2994.6227 0 .2392-.0036.7507.296.7507.2958 0 .31-.4125.31-.664 0-.1649-.0071-.363-.057-.5197-.0428-.1362-.1285-.1897-.2496-.1897m-7.062 1.7364h-.3819a.0719.0719 0 0 1-.0683-.0646l.0003-1.96c0-.0393.033-.0706.0738-.0706h.3556c.0372.0017.067.03.0694.0657v.256h.0071c.0927-.2476.2674-.363.5027-.363.2388 0 .3886.1154.4954.363.0928-.2476.3031-.363.5277-.363.1605 0 .3351.066.4421.2144.1212.165.0963.4042.0963.6146l-.0004 1.237c0 .039-.033.0705-.0737.0705h-.3813a.0715.0715 0 0 1-.0686-.0704v-1.0392c0-.0824.007-.2886-.0109-.367-.0284-.132-.114-.1692-.2244-.1692-.0928 0-.189.062-.2283.1608-.0392.0991-.0356.264-.0356.3754v1.039c0 .0392-.033.0706-.0737.0706h-.3815a.0716.0716 0 0 1-.0685-.0704l-.0004-1.0392c0-.2185.0356-.5402-.2352-.5402-.2745 0-.2638.3134-.2638.5402l-.0002 1.039c0 .0392-.033.0706-.0737.0706m4.5791-1.7494v-.28a.0692.0692 0 0 1 .071-.071h1.2553c.0402 0 .0724.0291.0724.0706v.2402c-.0003.0403-.0343.0929-.0945.1763l-.6502.9284c.2413-.0056.4967.0306.716.1538.0494.0278.0627.069.0666.1093v.2989c0 .0411-.0451.0888-.0925.064-.3863-.2024-.8991-.2245-1.3263.0025-.0437.0232-.0894-.0238-.0894-.065v-.284c0-.0455.0009-.1233.0467-.1926l.7534-1.0808h-.656c-.04 0-.0722-.0286-.0725-.0706m.8171 2.1613c-.0917-.1174-.606-.0556-.8372-.028-.07.0084-.0809-.0527-.0179-.097.4105-.2882 1.0829-.205 1.1611-.1085.0787.0973-.0207.7715-.4052 1.0933-.0592.0494-.1155.023-.0892-.0423.0865-.2161.2802-.7.1884-.8175m-.2983.3406c-.717.529-1.7563.8105-2.6514.8105-1.2543 0-2.384-.4638-3.2388-1.2355-.067-.0607-.0072-.1434.0735-.0965.9222.5366 2.0628.8598 3.2406.8598.7947 0 1.6681-.1649 2.4719-.5058.1211-.0514.2228.0799.1042.1675m15.5297-.693c-.342 0-.6045-.0938-.7879-.2813-.1835-.1875-.275-.4563-.275-.8065 0-.3584.0935-.6397.2811-.8437.1875-.204.4481-.3061.7817-.3061.2565 0 .4571.062.6019.1861.1447.1241.2171.2895.2171.4963 0 .2068-.078.3634-.2337.4694-.1558.1063-.3853.1593-.6887.1593-.157 0-.2936-.0151-.4094-.0455.0165.1847.0724.3171.1675.397.0952.08.2392.12.4323.12.0771 0 .1522-.0048.2253-.0145.073-.0096.1744-.031.304-.064a.163.163 0 0 1 .0455-.0084c.0468 0 .0703.0318.0703.0952v.1902c0 .0441-.0062.0752-.0185.093-.0125.018-.0366.0339-.0725.0476-.2013.0772-.415.1158-.641.1158m-.1365-1.2986c.1406 0 .2426-.0214.306-.0641.0634-.0428.0952-.1083.0952-.1965 0-.1738-.1034-.2606-.3102-.2606-.2647 0-.4177.1628-.4591.488.1103.0221.233.0332.3681.0332M18.6275 12.76c-.0359 0-.0622-.0082-.0786-.0248-.0166-.0165-.0248-.0427-.0248-.0786V10.75c0-.0387.0082-.0655.0248-.0807.0164-.0151.0427-.0227.0786-.0227h.2977c.0634 0 .102.0303.1159.091l.033.1116c.1461-.0965.2778-.1647.395-.2047.1171-.04.2378-.06.362-.06.248 0 .4231.0882.5251.2647.1407-.0937.273-.1613.3972-.2026.124-.0414.2522-.062.3846-.062.193 0 .3425.0536.4487.1612.1061.1076.1593.258.1593.4508v1.46c0 .0359-.0077.062-.0228.0786-.0152.0166-.042.0248-.0807.0248h-.397c-.0359 0-.062-.0082-.0785-.0248-.0166-.0165-.025-.0427-.025-.0786V11.329c0-.1875-.084-.2813-.2522-.2813-.1489 0-.2992.0359-.4508.1075v1.5014c0 .0359-.0076.062-.0228.0786-.0152.0166-.042.0248-.0806.0248h-.397c-.036 0-.0621-.0082-.0787-.0248-.0165-.0165-.0248-.0427-.0248-.0786V11.329c0-.1875-.0842-.2813-.2523-.2813-.1544 0-.306.0373-.4549.1116v1.4973c0 .0359-.0077.062-.0227.0786-.0153.0166-.0422.0248-.0807.0248zm-.9174-2.4402c-.1048 0-.1888-.029-.2522-.0869-.0635-.0578-.0952-.1364-.0952-.2357s.0317-.1778.0952-.2357c.0634-.058.1474-.0869.2523-.0869.1046 0 .1888.029.2522.0869.0634.0579.0952.1364.0952.2357s-.0318.1779-.0952.2357c-.0634.058-.1476.087-.2523.087m-.1985 2.4401c-.0358 0-.062-.0083-.0786-.0249-.0166-.0164-.0248-.0426-.0248-.0785V10.75c0-.0386.0082-.0655.0248-.0807.0165-.0151.0428-.0227.0786-.0227h.397c.0386 0 .0655.0076.0807.0227.0151.0152.0228.042.0228.0807v1.9066c0 .036-.0077.062-.0228.0785-.0152.0166-.042.025-.0807.025zm-1.6527 0c-.0359 0-.0622-.0082-.0786-.0248-.0166-.0165-.0248-.0427-.0248-.0786V10.75c0-.0387.0082-.0655.0248-.0807.0164-.0151.0427-.0227.0786-.0227h.2977c.0634 0 .102.0303.1158.091l.0538.2233c.1103-.1214.2144-.2075.3123-.2585a.6664.6664 0 0 1 .3123-.0765h.0578c.0386 0 .0662.0076.0827.0227.0166.0152.0248.042.0248.0807v.3474c0 .0358-.0076.062-.0227.0785-.0151.0166-.042.025-.0807.025a.8293.8293 0 0 1-.0744-.0043 1.3657 1.3657 0 0 0-.1158-.0041c-.0634 0-.1406.009-.2316.0269-.091.018-.1682.0407-.2316.0683v1.3896c0 .0359-.0077.062-.0227.0786-.0153.0166-.0422.0248-.0807.0248zm-2.477.852c-.0358 0-.062-.0077-.0786-.0227-.0165-.0153-.0248-.042-.0248-.0807V10.75c0-.0386.0083-.0655.0248-.0807.0166-.0151.0428-.0227.0786-.0227h.2978c.0634 0 .102.0304.1157.091l.029.1075c.0828-.08.1827-.1433.2999-.1903a.9562.9562 0 0 1 .3578-.0703c.2673 0 .479.098.6348.2937.1558.1958.2337.4605.2337.794 0 .229-.0386.4288-.1157.5997-.0772.171-.1821.3027-.3144.395-.1324.0925-.284.1386-.4549.1386a.965.965 0 0 1-.3226-.0538c-.1021-.0358-.189-.0854-.2606-.1489v.9058c0 .0386-.0076.0654-.0227.0807-.0153.015-.0421.0227-.0807.0227zm.9057-1.2615c.1545 0 .2682-.0523.3413-.157.073-.1048.1097-.2703.1097-.4964 0-.2288-.036-.3956-.1076-.5005-.0718-.1048-.1862-.1571-.3434-.1571a.7883.7883 0 0 0-.4052.1116v1.0878c.1212.0744.2564.1116.4052.1116Z"},"openai.com":{"h":"412991","p":"M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"},"anthropic.com":{"h":"191919","p":"M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z"},"claude.ai":{"h":"D97757","p":"m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"},"github.com":{"h":"181717","p":"M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"},"adobe.com":{"h":"FF0000","p":"M13.966 22.624l-1.69-4.281H8.122l3.892-9.144 5.662 13.425zM8.884 1.376H0v21.248zm15.116 0h-8.884L24 22.624Z"},"google.com":{"h":"4285F4","p":"M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"},"icloud.com":{"h":"3693F3","p":"M13.762 4.29a6.51 6.51 0 0 0-5.669 3.332 3.571 3.571 0 0 0-1.558-.36 3.571 3.571 0 0 0-3.516 3A4.918 4.918 0 0 0 0 14.796a4.918 4.918 0 0 0 4.92 4.914 4.93 4.93 0 0 0 .617-.045h14.42c2.305-.272 4.041-2.258 4.043-4.589v-.009a4.594 4.594 0 0 0-3.727-4.508 6.51 6.51 0 0 0-6.511-6.27z"},"notion.so":{"h":"000000","p":"M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"},"figma.com":{"h":"F24E1E","p":"M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117V7.51zm0 1.471H8.148c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981zm-4.587-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.02 3.019 3.02h3.117V1.471H8.148zm4.587 15.019H8.148c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zM8.148 8.981c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h3.117V8.981H8.148zM8.172 24c-2.489 0-4.515-2.014-4.515-4.49s2.014-4.49 4.49-4.49h4.588v4.441c0 2.503-2.047 4.539-4.563 4.539zm-.024-7.51a3.023 3.023 0 0 0-3.019 3.019c0 1.665 1.365 3.019 3.044 3.019 1.705 0 3.093-1.376 3.093-3.068v-2.97H8.148zm7.704 0h-.098c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h.098c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.49-4.49 4.49zm-.097-7.509c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h.098c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-.098z"},"grammarly.com":{"h":"027E6F","p":"M12 24H.032V12c0-3.314 1.341-6.314 3.504-8.486C5.703 1.344 8.694 0 12 0c3.305 0 6.297 1.344 8.463 3.514 2.164 2.172 3.505 5.172 3.505 8.486s-1.338 6.314-3.505 8.486C18.297 22.656 15.305 24 12 24m2.889-13.137-1.271 2.205h4.418c-.505 2.882-3.018 5.078-6.036 5.078-3.38 0-6.132-2.757-6.132-6.146S8.618 5.854 12 5.854c1.821 0 3.458.801 4.584 2.069l1.143-1.988c-1.493-1.418-3.506-2.29-5.725-2.29-4.6 0-8.332 3.74-8.332 8.355s3.73 8.354 8.332 8.354c4.603 0 8.332-3.739 8.332-8.354 0-.387-.029-.765-.079-1.137z"},"duolingo.com":{"h":"58CC02","p":"M14.484 18.213c1.142 1.033 2.657 1.662 4.316 1.662l.294-.001c1.985-.038 3.749-.976 4.905-2.422v1.98c0 2.522-2.043 4.568-4.567 4.568H4.569C2.045 23.998.002 21.954.002 19.43v-1.92c1.181 1.443 2.976 2.365 4.985 2.365l.35-.001c1.61-.027 3.076-.646 4.191-1.648.555.764 1.456 1.26 2.473 1.26 1.023 0 1.928-.502 2.483-1.273zm-5.349-.996c-.989 1.022-2.375 1.658-3.909 1.658h-.239c-2.229 0-4.146-1.343-4.987-3.262v-7.16c.281-.64.68-1.216 1.169-1.699-.035-.731.132-1.469.511-2.128.256-.44.867-.504 1.21-.124l.766.851c.007-.003.014-.003.021-.005-.098-.78.037-1.587.419-2.308.24-.45.757-.53 1.114-.164 0 0 3.939 3.979 4.035 4.084 1.542 1.348 4.066 1.287 5.686-.18.002-.003.007-.005.009-.007.042-.042 3.855-3.9 3.855-3.9.3361-.3451.8619-.3101 1.113.164.385.724.518 1.535.417 2.32.002.001.003.001.004.002l.007.002c.001 0 .002 0 .003.001l.776-.86c.342-.38.954-.316 1.207.124.387.673.553 1.427.509 2.173.496.501.897 1.099 1.169 1.762v6.941c-.816 1.978-2.761 3.373-5.032 3.373H18.8c-1.547 0-2.945-.648-3.936-1.686a.8386.8386 0 0 0-.009-.067c.313-.017.528-.162.688-.33.152-.16.299-.397.299-.776 0 0-.022-.312-.024-.324.693.767 1.696 1.249 2.811 1.249 2.092 0 3.787-1.696 3.787-3.787v-2.243c0-2.092-1.697-3.787-3.787-3.787-2.093 0-3.787 1.695-3.787 3.787v2.243c0 .266.027.526.079.776-.712-.784-1.744-1.278-2.842-1.278-1.239 0-2.339.523-3.064 1.355.063-.274.097-.56.097-.853v-2.243c0-2.092-1.697-3.787-3.788-3.787-2.09 0-3.787 1.695-3.787 3.787v2.243c0 2.093 1.697 3.787 3.787 3.787 1.151 0 2.182-.513 2.876-1.322-.008.035-.039.395-.039.395 0 .378.147.616.298.775.16.168.374.312.688.331a.7783.7783 0 0 0-.012.097zm.997.073c.729.131 1.733.305 1.792.305h.157c.059 0 1.789-.303 1.789-.303-.327.705-1.041 1.194-1.869 1.194-.829 0-1.543-.49-1.869-1.196zm-.971-1.379c.246-1.313 1.462-2.259 2.918-2.259 1.324 0 2.521.97 2.763 2.259v.105c0 .082-.029.115-.103.106l-2.658.473h-.157l-2.66-.476c-.075.01-.103-.023-.103-.105Zm8.023-6.392c.255-.14.549-.22.861-.22.992 0 1.798.804 1.798 1.798v1.919c0 .991-.804 1.797-1.798 1.797-.991 0-1.797-.803-1.797-1.797v-1.542c.034.003.068.005.103.005.64 0 1.16-.518 1.16-1.156 0-.312-.125-.596-.327-.804zM5.162 9.461c.227-.104.48-.162.746-.162.991 0 1.798.804 1.798 1.798v1.919c0 .991-.804 1.797-1.798 1.797-.991 0-1.797-.803-1.797-1.797v-1.571c.089.022.182.034.278.034.641 0 1.16-.518 1.16-1.156 0-.342-.149-.65-.387-.862ZM.002 6.554V4.568C.002 2.044 2.045 0 4.569 0h14.865c2.522 0 4.565 2.044 4.565 4.568v2.041a5.1847 5.1847 0 0 0-.164-.197 4.8592 4.8592 0 0 0-.646-2.284c-.433-.754-1.315-1.037-2.07-.786a4.785 4.785 0 0 0-.327-.774h-.001c-.287-.54-.758-.835-1.248-.908-.493-.073-1.033.072-1.464.515l-3.82 3.864c-1.226 1.11-3.127 1.199-4.313.205-.103-.109-4.025-4.071-4.025-4.071-.427-.438-.966-.584-1.46-.51-.489.073-.961.367-1.248.907v.002c-.133.25-.241.508-.327.771-.753-.252-1.635.029-2.071.782 0 0-.001.001-.001.002-.4.694-.613 1.459-.645 2.23-.057.065-.113.13-.167.197z"},"perplexity.ai":{"h":"1FB8CD","p":"M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z"},"dropbox.com":{"h":"0061FF","p":"M6 1.807L0 5.629l6 3.822 6.001-3.822L6 1.807zM18 1.807l-6 3.822 6 3.822 6-3.822-6-3.822zM0 13.274l6 3.822 6.001-3.822L6 9.452l-6 3.822zM18 9.452l-6 3.822 6 3.822 6-3.822-6-3.822zM6 18.371l6.001 3.822 6-3.822-6-3.822L6 18.371z"},"zoom.us":{"h":"0B5CFF","p":"M5.033 14.649H.743a.74.74 0 0 1-.686-.458.74.74 0 0 1 .16-.808L3.19 10.41H1.06A1.06 1.06 0 0 1 0 9.35h3.957c.301 0 .57.18.686.458a.74.74 0 0 1-.161.808L1.51 13.59h2.464c.585 0 1.06.475 1.06 1.06zM24 11.338c0-1.14-.927-2.066-2.066-2.066-.61 0-1.158.265-1.537.686a2.061 2.061 0 0 0-1.536-.686c-1.14 0-2.066.926-2.066 2.066v3.311a1.06 1.06 0 0 0 1.06-1.06v-2.251a1.004 1.004 0 0 1 2.013 0v2.251c0 .586.474 1.06 1.06 1.06v-3.311a1.004 1.004 0 0 1 2.012 0v2.251c0 .586.475 1.06 1.06 1.06zM16.265 12a2.728 2.728 0 1 1-5.457 0 2.728 2.728 0 0 1 5.457 0zm-1.06 0a1.669 1.669 0 1 0-3.338 0 1.669 1.669 0 0 0 3.338 0zm-4.82 0a2.728 2.728 0 1 1-5.458 0 2.728 2.728 0 0 1 5.457 0zm-1.06 0a1.669 1.669 0 1 0-3.338 0 1.669 1.669 0 0 0 3.338 0z"},"canva.com":{"h":"00C4CC","p":"M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zM6.962 7.68c.754 0 1.337.549 1.405 1.2.069.583-.171 1.097-.822 1.406-.343.171-.48.172-.549.069-.034-.069 0-.137.069-.206.617-.514.617-.926.548-1.508-.034-.378-.308-.618-.583-.618-1.2 0-2.914 2.674-2.674 4.629.103.754.549 1.646 1.509 1.646.308 0 .65-.103.96-.24.5-.264.799-.47 1.097-.8-.073-.885.704-2.046 1.851-2.046.515 0 .926.205.96.583.068.514-.377.582-.514.582s-.378-.034-.378-.17c-.034-.138.309-.07.275-.378-.035-.206-.24-.274-.446-.274-.72 0-1.131.994-1.029 1.611.035.275.172.549.447.549.205 0 .514-.31.617-.755.068-.308.343-.514.583-.514.102 0 .17.034.205.171v.138c-.034.137-.137.548-.102.651 0 .069.034.171.17.171.092 0 .436-.18.777-.459.117-.59.253-1.298.253-1.357.034-.24.137-.48.617-.48.103 0 .171.034.205.171v.138l-.136.617c.445-.583 1.097-.994 1.508-.994.172 0 .309.102.309.274 0 .103 0 .274-.069.446-.137.377-.309.96-.412 1.474 0 .137.035.274.207.274.171 0 .685-.206 1.096-.754l.007-.004c-.002-.068-.007-.134-.007-.202 0-.411.035-.754.104-.994.068-.274.411-.514.617-.514.103 0 .205.069.205.171 0 .035 0 .103-.034.137-.137.446-.24.857-.24 1.269 0 .24.034.582.102.788 0 .034.035.069.07.069.068 0 .548-.445.89-1.028-.308-.206-.48-.549-.48-.96 0-.72.446-1.097.858-1.097.343 0 .617.24.617.72 0 .308-.103.65-.274.96h.102a.77.77 0 0 0 .584-.24.293.293 0 0 1 .134-.117c.335-.425.83-.74 1.41-.74.48 0 .924.205.959.582.068.515-.378.618-.515.618l-.002-.002c-.138 0-.377-.035-.377-.172 0-.137.309-.068.274-.376-.034-.206-.24-.275-.446-.275-.686 0-1.13.891-1.028 1.611.034.275.171.583.445.583.206 0 .515-.308.652-.754.068-.274.343-.514.583-.514.103 0 .17.034.205.171 0 .069 0 .206-.137.652-.17.308-.171.48-.137.617.034.274.171.48.309.583.034.034.068.102.068.102 0 .069-.034.138-.137.138-.034 0-.068 0-.103-.035-.514-.205-.72-.548-.789-.891-.205.24-.445.377-.72.377-.445 0-.89-.411-.96-.926a1.609 1.609 0 0 1 .075-.649c-.203.13-.422.203-.623.203h-.17c-.447.652-.927 1.098-1.27 1.303a.896.896 0 0 1-.377.104c-.068 0-.171-.035-.205-.104-.095-.152-.156-.392-.193-.667-.481.527-1.145.805-1.453.805-.343 0-.548-.206-.582-.55v-.376c.102-.754.377-1.2.377-1.337a.074.074 0 0 0-.069-.07c-.24 0-1.028.824-1.166 1.373l-.103.445c-.068.309-.377.515-.582.515-.103 0-.172-.035-.206-.172v-.137l.046-.233c-.435.31-.87.508-1.075.508-.308 0-.48-.172-.514-.412-.206.274-.445.412-.754.412-.352 0-.696-.24-.862-.593-.244.275-.523.553-.852.764-.48.309-1.028.549-1.68.549-.582 0-1.097-.309-1.371-.583-.412-.377-.651-.96-.686-1.509-.205-1.68.823-3.84 2.4-4.8.378-.205.755-.343 1.132-.343zm9.77 3.291c-.104 0-.172.172-.172.343 0 .274.137.583.309.755a1.74 1.74 0 0 0 .102-.583c0-.343-.137-.515-.24-.515z"},"linkedin.com":{"h":"0A66C2","p":"M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"},"nordvpn.com":{"h":"4687FF","p":"M2.2838 21.5414A11.9866 11.9866 0 010 14.4832C0 7.8418 5.3727 2.4586 12 2.4586c6.6279 0 12 5.3832 12 12.0246a11.9853 11.9853 0 01-2.2838 7.0582l-5.7636-9.3783-.5565.9419.5645 2.6186L12 8.9338l-2.45 4.1447.5707 2.6451-2.0764-3.5555-5.7605 9.3733z"},"vodafone.com":{"h":"E60000","p":"M12 0A12 12 0 0 0 0 12A12 12 0 0 0 12 24A12 12 0 0 0 24 12A12 12 0 0 0 12 0M16.25 1.12C16.57 1.12 16.9 1.15 17.11 1.22C14.94 1.67 13.21 3.69 13.22 6C13.22 6.05 13.22 6.11 13.23 6.17C16.87 7.06 18.5 9.25 18.5 12.28C18.54 15.31 16.14 18.64 12.09 18.65C8.82 18.66 5.41 15.86 5.39 11.37C5.38 8.4 7 5.54 9.04 3.85C11.04 2.19 13.77 1.13 16.25 1.12Z"},"vodafone.co.uk":{"h":"E60000","p":"M12 0A12 12 0 0 0 0 12A12 12 0 0 0 12 24A12 12 0 0 0 24 12A12 12 0 0 0 12 0M16.25 1.12C16.57 1.12 16.9 1.15 17.11 1.22C14.94 1.67 13.21 3.69 13.22 6C13.22 6.05 13.22 6.11 13.23 6.17C16.87 7.06 18.5 9.25 18.5 12.28C18.54 15.31 16.14 18.64 12.09 18.65C8.82 18.66 5.41 15.86 5.39 11.37C5.38 8.4 7 5.54 9.04 3.85C11.04 2.19 13.77 1.13 16.25 1.12Z"},"orange.com":{"h":"FF7900","p":"M0 0h24v24H0V0Zm3.43 20.572h17.143v-3.429H3.43v3.429Z"},"o2.co.uk":{"h":"0050FF","p":"M9.473.191C3.827.191 0 4.271 0 9.917c0 5.317 3.86 9.726 9.472 9.726 5.61 0 9.433-4.409 9.433-9.726C18.905 4.27 15.116.19 9.473.19zm-.002 2.77c3.677 0 5.79 3.422 5.79 6.956 0 3.314-1.785 6.956-5.79 6.956-4.007 0-5.827-3.642-5.827-6.956 0-3.534 2.148-6.956 5.827-6.956zm11.69 12.48a5.47 5.47 0 0 0-2.44.588l.13 1.367c.543-.353 1.204-.66 1.9-.66.695 0 1.34.355 1.34 1.11 0 1.509-2.791 3.84-3.558 4.584v1.38H24v-1.298h-3.36c1.344-1.32 3.1-2.924 3.1-4.668 0-1.614-1.013-2.403-2.58-2.403z"},"bt.com":{"h":"6400AA","p":"M12.589 7.91h5.977v1.753H16.56v6.41h-1.97v-6.41h-2zM12 22.523C6.193 22.523 1.477 17.807 1.477 12 1.477 6.193 6.193 1.477 12 1.477c5.807 0 10.523 4.716 10.523 10.523 0 5.807-4.716 10.523-10.523 10.523M12 24c6.626 0 12-5.374 12-12S18.626 0 12 0C5.379 0 0 5.374 0 12s5.379 12 12 12M9.97 13.574c0-.516-.321-.865-.873-.865h-1.32v1.702h1.32c.552 0 .874-.345.874-.837m-.24-3.276c0-.433-.275-.732-.745-.732h-1.21v1.486h1.21c.47 0 .746-.299.746-.754m2.231 3.372c0 1.546-1.09 2.402-2.65 2.402H5.834V7.91h3.249c1.573 0 2.64.805 2.64 2.277 0 .672-.298 1.27-.781 1.634.552.326 1.021.947 1.021 1.85Z"},"virginmedia.com":{"h":"ED1A37","p":"M5.225 5.021c-1.098 0-2.067.346-2.883 1.024C1.416 6.813 0 8.635 0 12c0 3.366 1.416 5.187 2.342 5.955.816.678 1.785 1.024 2.883 1.024 1.629 0 3.229-.75 4.271-1.401 2.828-1.769 5.082-5.143 5.082-5.143 1.093 1.502 2.081 2.494 3.199 3.21.687.419 1.723.914 2.787.914.725 0 1.371-.22 1.904-.677C23.487 15.008 24 13.658 24 12s-.513-3.008-1.532-3.882c-.532-.457-1.18-.677-1.904-.677-1.064 0-2.1.495-2.787.914-1.118.716-2.106 1.708-3.2 3.21 0 0-2.253-3.374-5.08-5.143-1.043-.651-2.643-1.401-4.272-1.401Zm0 .513c1.51 0 3.011.722 4 1.324 1.69 1.084 3.25 2.647 5.036 5.142-1.785 2.494-3.346 4.057-5.037 5.142-.988.602-2.49 1.323-3.999 1.323-.974 0-1.833-.305-2.554-.904C1.085 16.243.514 13.916.514 12s.571-4.243 2.157-5.561c.721-.6 1.58-.905 2.554-.905zm15.34 2.42c.6 0 1.13.188 1.575.558.993.828 1.347 2.273 1.347 3.488 0 1.215-.354 2.66-1.347 3.488-.444.37-.974.557-1.576.557-.945 0-1.889-.454-2.515-.835-1.067-.685-2.01-1.63-3.154-3.21 1.144-1.581 2.087-2.526 3.154-3.21.626-.381 1.57-.836 2.515-.836zm-17.6 3.505-.01.013.01-.01v-.003z"},"uber.com":{"h":"000000","p":"M0 7.97v4.958c0 1.867 1.302 3.101 3 3.101.826 0 1.562-.316 2.094-.87v.736H6.27V7.97H5.082v4.888c0 1.257-.85 2.106-1.947 2.106-1.11 0-1.946-.827-1.946-2.106V7.971H0zm7.44 0v7.925h1.13v-.725c.521.532 1.257.86 2.06.86a3.006 3.006 0 0 0 3.034-3.01 3.01 3.01 0 0 0-3.033-3.024 2.86 2.86 0 0 0-2.049.861V7.971H7.439zm9.869 2.038c-1.687 0-2.965 1.37-2.965 3 0 1.72 1.334 3.01 3.066 3.01 1.053 0 1.913-.463 2.49-1.233l-.826-.611c-.43.577-.996.847-1.664.847-.973 0-1.753-.7-1.912-1.64h4.697v-.373c0-1.72-1.222-3-2.886-3zm6.295.068c-.634 0-1.098.294-1.381.758v-.713h-1.131v5.774h1.142V12.61c0-.894.544-1.47 1.291-1.47H24v-1.065h-.396zm-6.319.928c.85 0 1.564.588 1.756 1.47H15.52c.203-.882.916-1.47 1.765-1.47zm-6.732.012c1.086 0 1.98.883 1.98 2.004a1.993 1.993 0 0 1-1.98 2.001A1.989 1.989 0 0 1 8.56 13.02a1.99 1.99 0 0 1 1.992-2.004z"},"deliveroo.co.uk":{"h":"00CCBC","p":"M16.861 0l-1.127 10.584L13.81 1.66 7.777 2.926l1.924 8.922-8.695 1.822 1.535 7.127L17.832 24l3.498-7.744L22.994.636 16.861 0zM11.39 13.61a.755.755 0 01.322.066c.208.093.56.29.63.592.103.434.004.799-.312 1.084v.002c-.315.284-.732.258-1.174.113-.441-.145-.637-.672-.47-1.309.124-.473.71-.544 1.004-.549zm4.142.548c.447-.012.832.186 1.05.543.217.357.107.75-.122 1.143h-.002c-.229.392-.83.445-1.422.16-.399-.193-.397-.684-.353-.983a.922.922 0 01.193-.447c.142-.177.381-.408.656-.416Z"},"just-eat.co.uk":{"h":"F36D00","p":"M11.196.232a1.376 1.376 0 0 1 1.528 0 33.157 33.157 0 0 1 3.384 2.438s.293.203.301-.14a5.367 5.367 0 0 1 .079-1.329.606.606 0 0 1 .562-.39s1.329.066 2.173.179c.377.05.671.352.711.73 0 0 .543 3.62.665 4.925 0 0 .105.664 1.067 1.79 0 0 1.953 2.735 2.18 3.259 0 0 .454.946-.523 1.074 0 0-1.783.18-1.955.22a.446.446 0 0 0-.39.484s-.094 6.296-.555 9.32c0 0-.121 1.2-.782 1.173 0 0-1.833-.059-2.259-.047 0 0-.183 0-.156-.246 0 0 .934-9.817.301-14.78 0 0-.028-.64-.516-.782 0 0-.445-.18-.871.391a15.574 15.574 0 0 0-2.9 8.86s-.05 1.563.188 1.953c0 0 .148.274.907.336l.96.13s.176 0 .16.233c0 0-.218 2.88-.28 3.393a1.018 1.018 0 0 1-.071.34s-.035.098-.336.086c0 0-4.236-.03-4.713 0 0 0-.2 0-.242-.105-.043-.106-.294-3.717-.286-4.229a.255.255 0 0 1 .149-.25 2.548 2.548 0 0 0 1.172-1.871c.052-.548.06-1.098.024-1.646 0 0 .156-5.522.195-6.41 0 0 .031-.3-.36-.355a.364.364 0 0 0-.437.27v.03c0 .032-.274 3.643-.223 5.081 0 0 .094.942-.558.961 0 0-.634.095-.665-.69 0 0 .047-3.542.203-5.292a.39.39 0 0 0-.348-.391.39.39 0 0 0-.437.316.065.065 0 0 0 0 .031s-.274 3.39-.223 5.179c0 0 .078.868-.614.836 0 0-.578.066-.61-.704 0 0 .157-4.85.2-5.224A.39.39 0 0 0 6.647 9h-.039a.391.391 0 0 0-.418.325.167.167 0 0 0 0 .035s-.258 5.8-.223 7.503c0 0-.023 1.751 1.27 2.462 0 0 .192.11.196.277 0 0 .145 3.076.277 4.069 0 0 .047.238-.164.238L4.291 24a.67.67 0 0 1-.665-.633 72.876 72.876 0 0 1-.601-9.829.5.5 0 0 0-.391-.535S.969 12.85.566 12.749a.692.692 0 0 1-.422-1.02A33.497 33.497 0 0 1 11.197.232Z"},"ubereats.com":{"h":"06C167","p":"M0 2.8645v4.9972c0 1.8834 1.3315 3.1297 3.0835 3.1297a2.9652 2.9652 0 0 0 2.1502-.876v.7425H6.445V2.8645H5.223v4.9339c0 1.2642-.8696 2.1198-1.9954 2.122-1.1386-.0023-1.997-.834-1.997-2.122V2.8645zm7.3625 0v7.9934h1.163v-.7318a2.9915 2.9915 0 0 0 2.1177.876c1.714.048 3.1295-1.3283 3.1295-3.0429s-1.4155-3.091-3.1295-3.0429a2.9674 2.9674 0 0 0-2.107.876V2.8645zm9.8857 2.0561c-1.6752-.0074-3.0369 1.3492-3.0356 3.0245 0 1.7366 1.3732 3.0373 3.1537 3.0373a3.123 3.123 0 0 0 2.5578-1.2438l-.8495-.6177a2.0498 2.0498 0 0 1-1.7083.8585c-.9763.0126-1.8147-.6915-1.971-1.6553h4.818v-.379c0-1.734-1.254-3.0238-2.9638-3.0245zm6.1632.0667a1.5943 1.5943 0 0 0-1.376.7657v-.7186h-1.163v5.8235h1.1741V7.5465c0-.9023.5581-1.4847 1.3268-1.4847h.4949V4.9886c-.1576.0013-.3186-.0009-.4568-.0013zm-6.2034.944a1.844 1.844 0 0 1 1.8337 1.486H15.424a1.844 1.844 0 0 1 1.784-1.486zm-6.6589.0056c1.1223-.0084 2.0365.8992 2.0364 2.0215-.0026 1.1203-.914 2.0258-2.0343 2.021a2.0151 2.0151 0 0 1-1.4159-.5987A2.0152 2.0152 0 0 1 8.55 7.9592a2.0152 2.0152 0 0 1 .5838-1.422 2.0152 2.0152 0 0 1 1.4153-.6003zM0 12.9864v7.9716h5.7222v-1.3666H1.5458v-1.971h4.0647v-1.314H1.5458v-1.9556h4.1764v-1.3644zm14.5608.4097v1.6861h-1.1519v1.338h1.1545v3.143c0 .7927.5712 1.4209 1.6005 1.4209h1.6425L17.8 19.646h-1.1412c-.3482 0-.5714-.1509-.5714-.464v-2.7683H17.8v-1.3316h-1.7062v-1.686zm-5.2974 1.5275c-1.7348-.0103-3.141 1.4035-3.1214 3.1382.0196 1.7346 1.4575 3.1163 3.1915 3.0668a2.9915 2.9915 0 0 0 1.912-.6655v.532h1.5175v-5.9129h-1.509v.5257a3.0047 3.0047 0 0 0-1.9205-.6835c-.0244-.0007-.0492-.0006-.0701-.0008zm11.771.0077c-1.5855 0-2.7002.6437-2.7002 1.8854 0 .8607.6132 1.4213 1.936 1.695l1.4478.3286c.5694.1095.7224.2585.7224.4906 0 .3701-.438.6022-1.1279.6022-.876 0-1.3774-.1907-1.5723-.8477h-1.533c.219 1.2307 1.1563 2.05 3.0484 2.05h.0022c1.752 0 2.7422-.819 2.7422-1.9534 0-.8059-.5847-1.4084-1.8089-1.6668l-1.2943-.2605c-.7511-.1358-.988-.2738-.988-.5454 0-.357.3616-.5757 1.0295-.5757.7227 0 1.2527.1925 1.406.8473h1.5175c-.0854-1.2286-.9899-2.0497-2.8273-2.0497zM9.467 16.1815c1.0092.0096 1.8188.8369 1.8067 1.8461.0014 1.0046-.8198 1.816-1.8243 1.8025-1.0075-.0048-1.8203-.8256-1.8155-1.833.0048-1.0076.8255-1.8204 1.833-1.8156z"},"hellofresh.co.uk":{"h":"99CC33","p":"M9.7894 22.2329c-.9661-.0974-2.0001-.326-3.042-.7589-.5912-.2456-1.1673-.5843-1.2123-.6109-.362-.2057-.6568-.457-1.2135-.7269-.7048-.3416-1.3836-.5276-2.1106-.611-.9842-.0661-1.038.0124-1.319-.0745-.1676-.0545-.3188-.1205-.495-.2848-.0526-.049-.125-.1304-.1607-.1808-.125-.1763-.1744-.3314-.194-.3997-.0284-.0981-.0424-.1563-.0423-.3324 0-.1565.0152-.2397.035-.3116.0763-.2788.173-.3408.4299-.8472.3285-.6476.5238-1.285.6176-1.9564a5.7292 5.7292 0 0 0 .0554-1.017c-.015-.5062-.0383-.6133-.0392-1.0444-.0026-1.2549.2374-2.3546.5533-3.2859.2061-.6079.3889-1.007.6046-1.4333.5845-1.1551 1.5013-2.4784 2.9354-3.6924.7732-.6545 1.9737-1.5002 3.5538-2.1176 1.3446-.5253 2.5225-.7015 3.064-.7614.664-.087 1.8067-.1234 2.975.0535.9966.151 2.2445.4867 3.5131 1.2.4312.2424.6815.4377 1.014.6296.814.4697 1.6498.7054 2.4477.8015.424.051 1.0618.0047 1.302.0666.1477.0381.2551.0862.3896.1755.1135.0755.3629.2761.4912.6485.061.1772.1243.6076-.0987.9911-.0365.063-.1066.183-.1557.2669-.0491.0838-.1423.2622-.2072.3964-.6611 1.3677-.6465 2.5461-.6009 3.263.0534.84.05 2.2341-.5417 3.9644-.1037.3032-.3364.9313-.7023 1.6143-.8281 1.5455-1.876 2.6331-2.5374 3.2256-1.474 1.3204-2.9634 2.038-3.9265 2.4021-.8975.3393-1.5834.5095-2.3024.6327-.6934.1188-1.8193.2425-3.0802.1154z"},"max.com":{"h":"000000","p":"M7.042 16.896H4.414v-3.754H2.708v3.754H.01L0 7.22h2.708v3.6h1.706v-3.6h2.628zm12.043.046C21.795 16.94 24 14.689 24 11.978a4.89 4.89 0 0 0-4.915-4.92c-2.707-.002-4.09 1.991-4.432 2.795.003-1.207-1.187-2.632-2.58-2.634H7.59v9.674l4.181.001c1.686 0 2.886-1.46 2.888-2.713.385.788 1.72 2.762 4.427 2.76zm-7.665-3.936c.387 0 .692.382.692.817 0 .435-.305.817-.692.817h-1.33v-1.634zm.005-3.633c.387 0 .692.382.692.817 0 .436-.305.818-.692.818h-1.33V9.373zm1.77 2.607c.305-.039.813-.387.992-.61-.063.276-.068 1.074.006 1.35-.204-.314-.688-.701-.998-.74zm3.43 0a2.462 2.462 0 1 1 4.924 0 2.462 2.462 0 0 1-4.925 0zm2.462 1.936a1.936 1.936 0 1 0 0-3.872 1.936 1.936 0 0 0 0 3.872Z"},"paramountplus.com":{"h":"0064FF","p":"M16.347 21.373c.057-.084.151-.314-.025-.74l-.53-1.428c-.073-.182.084-.293.19-.173 0 0 1.004 1.157 1.264 1.64l.495.822c.425.028 1.6.06 2.732.06a3.26 3.26 0 0 1-.316-.364c-1.93-2.392-3.154-3.724-3.166-3.737-.391-.426-.572-.508-.87-.643a4.82 4.82 0 0 1-.138-.065v.364c0 .047-.057.073-.086.022l-2.846-5.001a1.598 1.598 0 0 0-.508-.587l-.277-.194-1.354 3.123c.212 0 .354.216.27.409l-1.25 2.893h1.147c.443 0 .883.087 1.294.255l.302.125s-.913 1.878-.913 2.867c0 .181.028.362.075.534h2.104l-.096-.595s1.266.294 2.502.413M12 2.437c-6.627 0-12 5.373-12 12 0 2.669.873 5.133 2.346 7.126.503-.218.783-.542.983-.791l2.234-2.858a.467.467 0 0 1 .179-.138l.336-.146 3.674-4.659.534-.417 1.094-1.524a.482.482 0 0 1 .101-.102l.478-.347a.34.34 0 0 1 .398-.004l.578.407c.308.216.557.504.726.84l2.322 4.077c.051.09.09.129.182.174.454.227.732.268 1.33.913.277.304 1.495 1.666 3.203 3.784.236.318.538.588.963.783A11.948 11.948 0 0 0 24 14.437c0-6.627-5.373-12-12-12M3.236 15.1l-.778-.253-.48.662v-.818l-.778-.253.778-.253v-.818l.48.662.778-.253-.48.662Zm-.185 2.676-.252.778-.253-.778h-.818l.661-.481-.253-.777.663.48.66-.48-.252.777.662.481Zm.156-6.195.253.778-.661-.48-.663.48.253-.778-.66-.48h.817l.253-.778.252.777h.818Zm1.314-1.76L4.04 9.16l-.778.253.48-.661-.48-.663.778.254.48-.662v.818l.778.253-.777.252Zm2.045-2.862-.253.777-.252-.777h-.818l.662-.48-.253-.778.661.48.661-.48-.252.777.662.48Zm2.577-1.313-.48.661V5.49l-.779-.254.778-.253v-.817l.48.66.78-.253-.481.663.48.66zm3.265-.75.253.778-.661-.48-.662.48.252-.777-.66-.481h.818L12 3.637l.252.778h.818zm2.93.595v.816l-.481-.661-.777.252.48-.662-.48-.662.777.253.48-.66v.817l.779.252zm5.426 8.285.778.253.48-.662v.818l.778.253-.778.253v.818l-.48-.662-.778.253.48-.662zm-3.077-6.04-.253-.777h-.818l.662-.48-.253-.778.662.48.662-.48-.254.778.662.48h-.818zm1.792 2.086v-.818l-.777-.252.777-.253V7.68l.481.662.777-.254-.48.663.48.66-.777-.252zm1.469 1.278.253-.777.254.777h.816l-.66.481.252.778-.662-.48-.661.48.253-.778-.662-.48zm.506 6.676-.253.778-.253-.778h-.817l.662-.481-.253-.777.66.48.663-.48-.253.777.661.481zm-12.08-.615.76-1.588c.024-.048-.032-.108-.067-.067l-.664.668c-.313.329-.847 1.25-.95 1.421l-.808 1.335a.109.109 0 0 1 .1.162l-.739 1.238c-.18.309.145.523.189.452 1.157-1.868 1.832-1.719 1.832-1.719l.387-.897c.022-.047-.001-.1-.05-.12-.12-.05-.316-.27.01-.885z"},"sky.com":{"h":"0072C9","p":"M7.387 13.656c0 1.423-.933 2.454-2.823 2.675-1.35.147-3.337-.025-4.294-.148-.025-.147-.074-.343-.074-.49 0-1.252.663-1.522 1.3-1.522.664 0 1.694.123 2.455.123.834 0 1.104-.295 1.104-.565 0-.368-.343-.515-1.006-.638l-1.767-.343C.785 12.453 0 11.423 0 10.343c0-1.325.933-2.454 2.798-2.65 1.398-.148 3.116.024 4.049.122.024.172.049.32.049.491 0 1.252-.663 1.522-1.276 1.522-.491 0-1.227-.099-2.086-.099-.884 0-1.227.246-1.227.54 0 .32.343.442.883.54l1.718.32c1.742.294 2.479 1.3 2.479 2.527m3.092 1.521c0 .761-.295 1.203-1.792 1.203-.196 0-.368-.025-.54-.05V6.22c0-.76.27-1.57 1.767-1.57.196 0 .393.024.565.049zm6.085 3.927c.197.098.59.22 1.105.245.859.025 1.325-.319 1.693-1.08L24 7.913a2.5 2.5 0 0 0-.957-.22c-.589 0-1.399.122-1.914 1.325l-1.497 3.534-2.945-4.81c-.196-.05-.662-.148-1.006-.148-1.03 0-1.62.393-2.233 1.031l-2.871 3.141 2.306 3.632c.418.663.982 1.006 1.89 1.006.589 0 1.104-.147 1.325-.245l-2.773-4.196 1.963-2.086 3.24 5.08Z"},"itv.com":{"h":"DEEB52","p":"M15.91 11.018a59.87 59.87 0 0 0-.98-.27c-.1 0-.16.05-.2.17-.35 1.2-.9 2.53-1.38 3.36-.16-.3-.45-.83-.73-1.3l-1.04-1.83c-.22-.34-.36-.43-.64-.43-.57 0-1.42.51-1.42 1 0 .16.04.28.21.57.2.32.3.6.3.92 0 .82-.62 1.56-1.8 1.56-.55 0-.99-.16-1.27-.45-.27-.28-.4-.65-.4-1.27v-1.03c.2.08.44.12.73.12h.93c.13 0 .17-.05.17-.16v-1c0-.11-.04-.17-.17-.17H6.56v-1.63c0-.2-.05-.33-.16-.43-.16-.15-.5-.22-.89-.22-.4 0-.72.07-.89.22-.1.1-.16.24-.16.43v4c0 .66-.1 1.02-.34 1.27-.2.22-.53.34-.88.34s-.66-.12-.84-.31c-.2-.2-.29-.48-.29-.9v-2.6c0-.11-.04-.16-.16-.16H.18c-.12 0-.17.05-.17.16v2.35c0 .94.25 1.47.67 1.9.55.54 1.48.79 2.38.79.88 0 1.81-.32 2.36-.82a4 4 0 0 0 2.6.82c1.42 0 2.47-.6 3.08-1.6.27.43.47.74.67 1.02.28.42.54.58 1.12.58.54 0 .87-.13 1.17-.59.78-1.18 1.44-2.59 1.92-3.88.05-.16.1-.28.1-.35 0-.08-.05-.14-.17-.18zm-14.85-.92c.66 0 1.07-.46 1.07-1.05 0-.6-.4-1.06-1.07-1.06-.65-.01-1.06.46-1.06 1.05 0 .59.4 1.05 1.06 1.05zm22.84 5.1-2.28-3.13c-.05-.07-.05-.14 0-.2l2.1-3.07c.07-.09.11-.15.11-.28 0-.12-.07-.25-.19-.37a.51.51 0 0 0-.39-.17.4.4 0 0 0-.24.1l-2.9 2.22c-.06.05-.13.05-.2 0l-2.89-2.22a.4.4 0 0 0-.25-.1.51.51 0 0 0-.38.17c-.12.12-.2.25-.2.37 0 .13.05.2.11.28l2.11 3.07c.05.06.05.13 0 .2l-2.28 3.13a.42.42 0 0 0-.1.26c0 .14.06.26.18.38.11.11.24.18.38.18.1 0 .17-.04.26-.1l3.06-2.23a.17.17 0 0 1 .2 0l3.07 2.23c.09.06.16.1.26.1.14 0 .27-.07.38-.18.12-.12.18-.24.18-.38 0-.1-.04-.17-.1-.26z"},"dazn.com":{"h":"F8F8F5","p":"M14.774 8.291l.772-2.596.79 2.596zm3.848 2.268l-2.025-6.128c-.045-.135-.097-.224-.154-.266-.059-.041-.152-.063-.28-.063h-1.12a.485.485 0 0 0-.284.068c-.06.045-.11.132-.149.261l-2.045 6.128c-.025.032-.038.096-.038.192 0 .149.09.223.27.223h.84c.076 0 .139-.003.187-.01a.207.207 0 0 0 .116-.048.326.326 0 0 0 .077-.116c.022-.051.046-.119.072-.202l.318-1.071h2.306l.327 1.051c.026.09.051.16.077.213a.395.395 0 0 0 .087.12c.031.028.07.047.114.053h.002c.045.006.103.01.173.01h.897c.18 0 .27-.074.27-.223a.59.59 0 0 0-.005-.09.878.878 0 0 0-.036-.108l.003.006zm-.994 2.467h-.646c-.168 0-.279.024-.333.072-.055.049-.082.147-.082.295v3.638l-1.91-3.647c-.076-.155-.152-.253-.226-.295-.074-.041-.204-.063-.39-.063h-.599c-.167 0-.278.025-.332.073-.055.048-.082.147-.082.294v6.138c0 .148.025.246.077.294.052.048.16.072.328.072h.656c.167 0 .278-.024.332-.072.055-.048.082-.146.082-.294v-3.648l1.91 3.657c.077.155.152.253.227.295.073.042.204.062.39.062h.598c.167 0 .278-.024.333-.072.054-.048.082-.146.082-.294v-6.138c0-.148-.028-.246-.082-.294-.055-.048-.166-.073-.333-.073zm3.203-.581l1.665 1.665v8.385H1.505V14.11l1.663-1.664a.63.63 0 0 0 0-.89L1.504 9.891V1.505h20.991v8.384l-1.665 1.666a.63.63 0 0 0 0 .89zM24 0H0v10.613L1.387 12 0 13.387V24h24V13.387L22.613 12 24 10.613zM10.67 18.469H7.96l2.855-4.014a.67.67 0 0 0 .087-.155.425.425 0 0 0 .019-.135v-.772c0-.148-.028-.246-.082-.294-.055-.048-.166-.073-.334-.073H6.382c-.149 0-.245.028-.29.082-.045.055-.068.169-.068.343v.58c0 .172.023.287.068.341.045.055.141.083.29.083h2.545L6.11 18.469a.438.438 0 0 0-.107.27v.792c0 .148.027.245.082.294.055.048.167.072.334.072h4.25c.148 0 .245-.027.29-.081.045-.055.068-.17.068-.344v-.579c0-.173-.023-.287-.068-.342-.045-.055-.142-.082-.29-.082zM9.408 8.233c0 .264-.017.484-.052.661-.036.177-.093.32-.174.43a.648.648 0 0 1-.318.231 1.523 1.523 0 0 1-.487.068h-.79v-4.17h.79c.366 0 .63.11.79.324.16.215.241.571.241 1.067v1.389zm1.38-2.789c-.225-.457-.533-.795-.921-1.013-.39-.219-.88-.328-1.47-.328H6.418c-.167 0-.278.024-.333.072-.054.049-.082.147-.082.294v6.138c0 .148.028.246.082.295.055.048.166.072.333.072h2.218c1.048 0 1.765-.447 2.15-1.342.09-.205.153-.413.188-.622a4.91 4.91 0 0 0 .054-.796V6.911c0-.367-.018-.656-.054-.868a2.2 2.2 0 0 0-.193-.612l.006.013z"},"crunchyroll.com":{"h":"F47521","p":"M2.933 13.467a10.55 10.55 0 1 1 21.067-.8V12c0-6.627-5.373-12-12-12S0 5.373 0 12s5.373 12 12 12h.8a10.617 10.617 0 0 1-9.867-10.533zM19.2 14a3.85 3.85 0 0 1-1.333-7.467A7.89 7.89 0 0 0 14 5.6a8.4 8.4 0 1 0 8.4 8.4 6.492 6.492 0 0 0-.133-1.6A3.415 3.415 0 0 1 19.2 14z"},"audible.com":{"h":"F8991C","p":"M12.008 17.362L24 9.885v2.028l-11.992 7.509L0 11.912V9.886l12.008 7.477zm0-9.378c-2.709 0-5.085 1.363-6.448 3.47.111-.111.175-.175.286-.254 3.374-2.804 8.237-2.17 10.883 1.362l1.758-1.124c-1.394-2.044-3.786-3.454-6.48-3.454m0 3.47a4.392 4.392 0 0 0-3.548 1.821 3.597 3.597 0 0 1 2.139-.697c1.299 0 2.455.666 3.232 1.79l1.679-1.045c-.729-1.157-2.028-1.87-3.501-1.87M3.897 8.412c4.943-3.897 11.929-2.836 15.652 2.344l.031.032 1.822-1.125a11.214 11.214 0 0 0-9.394-5.085c-3.897 0-7.366 1.996-9.394 5.085.364-.412.824-.903 1.283-1.251"},"tidal.com":{"h":"000000","p":"M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996 4.004 12l4.004-4.004L12.012 12l-4.004 4.004 4.004 4.004 4.004-4.004L12.012 12l4.004-4.004-4.004-4.004zM16.042 7.996l3.979-3.979L24 7.996l-3.979 3.979z"},"soundcloud.com":{"h":"FF5500","p":"M23.999 14.165c-.052 1.796-1.612 3.169-3.4 3.169h-8.18a.68.68 0 0 1-.675-.683V7.862a.747.747 0 0 1 .452-.724s.75-.513 2.333-.513a5.364 5.364 0 0 1 2.763.755 5.433 5.433 0 0 1 2.57 3.54c.282-.08.574-.121.868-.12.884 0 1.73.358 2.347.992s.948 1.49.922 2.373ZM10.721 8.421c.247 2.98.427 5.697 0 8.672a.264.264 0 0 1-.53 0c-.395-2.946-.22-5.718 0-8.672a.264.264 0 0 1 .53 0ZM9.072 9.448c.285 2.659.37 4.986-.006 7.655a.277.277 0 0 1-.55 0c-.331-2.63-.256-5.02 0-7.655a.277.277 0 0 1 .556 0Zm-1.663-.257c.27 2.726.39 5.171 0 7.904a.266.266 0 0 1-.532 0c-.38-2.69-.257-5.21 0-7.904a.266.266 0 0 1 .532 0Zm-1.647.77a26.108 26.108 0 0 1-.008 7.147.272.272 0 0 1-.542 0 27.955 27.955 0 0 1 0-7.147.275.275 0 0 1 .55 0Zm-1.67 1.769c.421 1.865.228 3.5-.029 5.388a.257.257 0 0 1-.514 0c-.21-1.858-.398-3.549 0-5.389a.272.272 0 0 1 .543 0Zm-1.655-.273c.388 1.897.26 3.508-.01 5.412-.026.28-.514.283-.54 0-.244-1.878-.347-3.54-.01-5.412a.283.283 0 0 1 .56 0Zm-1.668.911c.4 1.268.257 2.292-.026 3.572a.257.257 0 0 1-.514 0c-.241-1.262-.354-2.312-.023-3.572a.283.283 0 0 1 .563 0Z"},"klarna.com":{"h":"FFB3C7","p":"M4.592 2v20H0V2h4.592zm11.46 0c0 4.194-1.583 8.105-4.415 11.068l-.278.283L17.702 22h-5.668l-6.893-9.4 1.779-1.332c2.858-2.14 4.535-5.378 4.637-8.924L11.562 2h4.49zM21.5 17a2.5 2.5 0 110 5 2.5 2.5 0 010-5z"},"clearpay.co.uk":{"h":"B2FCE4","p":"M12 0C5.373 0 0 5.373 0 12c0 6.628 5.373 12 12 12 6.628 0 12-5.372 12-12 0-6.627-5.372-12-12-12Zm1.236 4.924a2.21 2.21 0 0 1 1.15.299l4.457 2.557c1.495.857 1.495 3.013 0 3.87l-4.457 2.558c-1.488.854-3.342-.22-3.342-1.935v-.34a.441.441 0 0 0-.66-.383L6.287 13.9a.441.441 0 0 0 0 .765l4.096 2.35a.44.44 0 0 0 .661-.382v-.685c0-.333.36-.542.649-.376l1.041.597a.441.441 0 0 1 .222.383v.29c0 1.715-1.854 2.789-3.342 1.935L5.157 16.22c-1.495-.857-1.495-3.013 0-3.87l4.457-2.558c1.488-.854 3.342.22 3.342 1.935v.34c0 .34.366.551.66.383l4.097-2.35a.441.441 0 0 0 0-.765l-4.096-2.351a.441.441 0 0 0-.661.382v.685c0 .333-.36.541-.649.375l-1.041-.597a.442.442 0 0 1-.222-.383v-.29c0-1.285 1.043-2.21 2.192-2.233z"},"paypal.com":{"h":"003087","p":"M7.016 19.198h-4.2a.562.562 0 0 1-.555-.65L5.093.584A.692.692 0 0 1 5.776 0h7.222c3.417 0 5.904 2.488 5.846 5.5-.006.25-.027.5-.066.747A6.794 6.794 0 0 1 12.071 12H8.743a.69.69 0 0 0-.682.583l-.325 2.056-.013.083-.692 4.39-.015.087zM19.79 6.142c-.01.087-.01.175-.023.261a7.76 7.76 0 0 1-7.695 6.598H9.007l-.283 1.795-.013.083-.692 4.39-.134.843-.014.088H6.86l-.497 3.15a.562.562 0 0 0 .555.65h3.612c.34 0 .63-.249.683-.585l.952-6.031a.692.692 0 0 1 .683-.584h2.126a6.793 6.793 0 0 0 6.707-5.752c.306-1.95-.466-3.744-1.89-4.906z"},"zilch.com":{"h":"00D287","p":"M4.421 6.149c3.292-2.011 6.584-4.036 9.862-6.046a.702.702 0 0 1 .83.073c1.312 1.18 2.637 2.36 3.948 3.54a.694.694 0 0 1 .175.815 1737.248 1737.248 0 0 1-4.341 9.338.61.61 0 0 0 .408.845c1.427.335 2.855.656 4.283.991a.546.546 0 0 1 .204.976c-3.234 2.375-6.483 4.749-9.717 7.124a.986.986 0 0 1-1.136.029l-4.633-3.016a.691.691 0 0 1-.248-.888c1.326-2.812 2.666-5.623 3.992-8.421a.78.78 0 0 0-.146-.859 802.196 802.196 0 0 0-3.583-3.569c-.277-.262-.219-.729.102-.932Z"}};
const _lum=(hex)=>{const h=(hex||"").replace("#","");if(h.length<6)return 0.5;const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return (0.299*r+0.587*g+0.114*b)/255;};
function ServiceLogo({ domain, name, color, size = 36, style = {} }) {
  // Fully offline: bundled brand glyph on a brand-color tile, else colored monogram. No network.
  const tile = color || "#6ee7b7";
  const fg = _lum(tile) > 0.7 ? "#111" : "#fff";
  const radius = size * 0.28;
  const ic = domain && BRAND_ICONS[domain];
  if (ic) {
    return (
      <div style={{ width:size, height:size, borderRadius:radius, background:tile, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, ...style }}>
        <svg viewBox="0 0 24 24" width={size*0.56} height={size*0.56} fill={fg} aria-label={name}><path d={ic.p}/></svg>
      </div>
    );
  }
  const initials = (name || "?").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div style={{ width:size, height:size, borderRadius:radius, background:tile, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, ...style }}>
      <span style={{ color:fg, fontSize:size*0.4, fontWeight:800, letterSpacing:-0.5 }}>{initials}</span>
    </div>
  );
}

// Unified category icon: SVG glyph / emoji / legacy emoji-key / monogram, on a colored tile. Used app-wide.
function CatIcon({ cat, glyph, emoji, icon, color, name, size = 36, style = {} }) {
  const g = glyph ?? cat?.glyph;
  const e = emoji ?? cat?.emoji;
  const ik = icon ?? cat?.icon;
  const nm = name ?? cat?.name;
  const tile = color ?? cat?.color ?? hashColor(cat?.id || nm);
  const fg = _lum(tile) > 0.7 ? "#111" : "#fff";
  const radius = size * 0.28;
  let inner;
  if (g && CAT_GLYPHS[g]) {
    inner = <svg viewBox="0 0 24 24" width={size*0.56} height={size*0.56} fill="none" stroke={fg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{__html:CAT_GLYPHS[g]}}/>;
  } else if (e) {
    inner = <span style={{ fontSize:size*0.5, lineHeight:1 }}>{e}</span>;
  } else if (ik && ICONS[ik]) {
    inner = <span style={{ fontSize:size*0.5, lineHeight:1 }}>{ICONS[ik]}</span>;
  } else {
    inner = <span style={{ color:fg, fontSize:size*0.42, fontWeight:800 }}>{(nm||"?").slice(0,1).toUpperCase()}</span>;
  }
  return <div style={{ width:size, height:size, borderRadius:radius, background:tile, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, ...style }}>{inner}</div>;
}

// Hand-drawn outline marks (app identity, never emoji) — inner SVG, rendered with stroke
const MARKS={
  zap:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  card:'<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  checkCircle:'<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
  bell:'<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
  clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  calendar:'<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
  up:'<line x1="12" x2="12" y1="19" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  down:'<line x1="12" x2="12" y1="5" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  chevR:'<polyline points="9 18 15 12 9 6"/>',
  wallet:'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6"/>',
  coins:'<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
  receipt:'<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  trendUp:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  trendDown:'<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
  target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  shield:CAT_GLYPHS["shield"]||'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>',
  lock:CAT_GLYPHS["lock"]||'<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  phone:CAT_GLYPHS["smartphone"]||'<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  close:'<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
  circle:'<circle cx="12" cy="12" r="9"/>',
  play:'<polygon points="6 3 20 12 6 21 6 3"/>',
  book:'<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  chat:'<path d="M7.9 20A9 8 0 1 0 4 16.1L2 22Z"/>',
  plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
  swap:'<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  sparkles:CAT_GLYPHS["sparkles"]||'<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2Z"/>',
  hand:'<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  layers:'<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
};
function Ico({ name, size=18, color="currentColor", stroke=2, style={} }){
  const d=MARKS[name]; if(!d) return null;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, display:"block", ...style }} dangerouslySetInnerHTML={{__html:d}}/>;
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

function MonthSelect({value,onChange,availMonths,allowAll=true}){
  const months=availMonths.length>0?availMonths:[new Date().toISOString().slice(0,7)];
  const byYear={};
  months.forEach(m=>{const[y,mo]=m.split("-");if(!byYear[y])byYear[y]=[];byYear[y].push({m,mo});});
  const years=Object.keys(byYear).sort().reverse();
  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <select value={value} onChange={onChange} style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:"8px 32px 8px 12px",fontSize:13,fontWeight:600,outline:"none",appearance:"none",cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>
        {allowAll&&<option value="all">All Time</option>}
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
        {[{bg:C.accentDim,c:C.accent,icon:"zap",t:"Lightning Fast",d:"Log expenses in seconds using Quick Actions."},{bg:C.blueDim,c:C.blue,icon:"shield",t:"100% Offline & Private",d:"No cloud, no accounts. Your data never leaves your device."},{bg:C.yellowDim,c:C.yellow,icon:"sparkles",t:"Fully Customizable",d:"Reorder your dashboard, customize categories, and switch themes."}].map((f,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:i<2?16:0}}><span style={{background:f.bg,padding:9,borderRadius:11,display:"flex",flexShrink:0}}><Ico name={f.icon} size={20} color={f.c}/></span><div><strong style={{color:C.text,fontSize:15}}>{f.t}</strong><div style={{color:C.muted,fontSize:13,marginTop:4}}>{f.d}</div></div></div>)}
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:"auto"}}>
      <Btn full onClick={()=>isInStandaloneMode?onStart():setShowInstall(true)} style={{padding:"14px",fontSize:16}}>Start Using Saver</Btn>
      <Btn full outline color={C.muted} onClick={onManual} style={{padding:"14px",fontSize:16}}>See how it works</Btn>
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
  const[filterMonth,setFilterMonth]=useState(currentMonth());
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
  const[monthlyTab,setMonthlyTab]=useState("subscriptions");
  const[coachTour,setCoachTour]=useState(false);
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
      const _dmap=Object.fromEntries([...DEFAULT_EXP_CATS,...DEFAULT_INC_CATS].map(c=>[c.id,{glyph:c.glyph,color:c.color}]));
      const _migCats=(arr)=>arr.map(c=>(!c.glyph&&!c.emoji&&_dmap[c.id])?{...c,glyph:_dmap[c.id].glyph,color:c.color||_dmap[c.id].color}:c);
      setTxns(t);setBanks(b);setExpCats(_migCats(ec));setIncCats(_migCats(ic));setGroups(g);setSavings(s);
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
  // Open the Bills page on a specific tab, remembering the home scroll position
  const openMonthly=useCallback((which)=>{setMonthlyTab(which);setScrollState({y:window.scrollY,restore:true});setTab("monthly");},[]);
  // Home button: if already home, jump to top; otherwise return to where we left off
  const goHome=useCallback(()=>{if(tab==="dashboard"){window.scrollTo(0,0);setScrollState({y:0,restore:false});}else setTab("dashboard");},[tab]);
  // Live coach-marks tour on the real dashboard (Skippable)
  const startCoach=useCallback(()=>{setScrollState({y:0,restore:false});window.scrollTo(0,0);setTab("dashboard");setTimeout(()=>setCoachTour(true),450);},[]);

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
          {tab==="dashboard"&&<Dashboard txns={filteredTxns} txnsAll={txns} bills={bills} installments={installments} budgets={budgets} banks={banks} groups={groups} expCats={expCats} savings={activeSavings} filterMonth={filterMonth} setFilterMonth={setFilterMonth} availMonths={availMonths} username={username} {...sharedProps} onDeleteTxn={delTxn} onUpdateTxn={updateTxn} onOpenBank={(b)=>{setScrollState({y:window.scrollY,restore:true});setLedgerBank(b);}} onOpenGroup={(g)=>{setScrollState({y:window.scrollY,restore:true});setLedgerGroup(g);}} onOpenSaving={(s)=>{setScrollState({y:window.scrollY,restore:true});setLedgerSaving(s);}} onOpenBudget={(bdg)=>{setScrollState({y:window.scrollY,restore:true});setLedgerBudget(bdg);}} hideTotal={hideTotal} setHideTotal={setHideTotal} navigateTo={navigateTo} openMonthly={openMonthly} scrollState={scrollState} setScrollState={setScrollState} onBanks={saveBanks} onBudgets={saveBudgets} onSavings={saveSavings} onGroups={saveGroups}/>}
          {tab==="add"&&<AddTransaction banks={banks} expCats={expCats} incCats={incCats} savings={activeSavings} currency={currency} onAdd={addTxn} onDone={()=>navigateTo("dashboard")} {...sharedProps} setAppAlert={setAppAlert} onGoalToast={setGoalToast} txns={txns}/>}
          {tab==="savings"&&<SavingsPage savings={savings} onSave={saveSavings} txns={txns} banks={banks} onBack={()=>navigateTo("settings")} addTxn={addTxn} delTxn={delTxn} onGoalToast={setGoalToast} {...sharedProps} setAppAlert={setAppAlert} onOpenSaving={(s)=>{setScrollState({y:window.scrollY,restore:true});setLedgerSaving(s);}}/>}
          {tab==="history"&&<History txns={txns} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} incCats={incCats} currency={currency} availMonths={availMonths} savings={savings} setAppAlert={setAppAlert}/>}
          {tab==="budgets"&&<BudgetsPage budgets={budgets} expCats={expCats} onSave={saveBudgets} onBack={()=>navigateTo("settings")} currency={currency} txns={txns}/>}
          {tab==="quickactions"&&<QuickActionsSetup quickActions={quickActions} expCats={expCats} banks={banks} onSave={saveQuickActions} onBack={()=>navigateTo("settings")}/>}
          {tab==="manual"&&<UserManual onBack={()=>navigateTo("settings")} navigateTo={navigateTo} onCoach={startCoach}/>}
          {tab==="monthly"&&<MonthlyBillsPage bills={bills} installments={installments} initialTab={monthlyTab} onSaveBills={saveBills} onSaveInstallments={saveInstallments} banks={banks} expCats={expCats} onAddTxn={addTxn} delTxn={delTxn} currency={currency} setAppAlert={setAppAlert}/>}
          {tab==="settings"&&<Settings banks={banks} expCats={expCats} incCats={incCats} groups={groups} onBanks={saveBanks} onExpCats={saveExpCats} onIncCats={saveIncCats} onGroups={saveGroups} currency={currency} onCurrency={saveCurrencyHandler} username={username} onUsername={saveUsernameHandler} theme={theme} onTheme={saveThemeHandler} {...sharedProps} onOpenSavings={()=>navigateTo("savings")} onOpenBudgets={()=>navigateTo("budgets")} onOpenQuickActions={()=>navigateTo("quickactions")} onOpenManual={()=>navigateTo("manual")} setLastBackup={setLastBackup} txns={txns} bills={bills} installments={installments} savings={savings} budgets={budgets} onRestore={handleRestorePayload} setAppAlert={setAppAlert} navigateTo={navigateTo}/>}
          {tab==="privacy"&&<Privacy onBack={()=>navigateTo("dashboard")}/>}
          {tab!=="privacy"&&<BottomNav tab={tab} navigateTo={navigateTo} goHome={goHome} expCats={expCats} banks={banks} savings={activeSavings} onAdd={addTxn} currency={currency} {...sharedProps} setAppAlert={setAppAlert} quickActions={quickActions} txns={txns}/>}
        </>
      ):(
        <>
          {ledgerBank&&<DeepLedgerView title={ledgerBank.name} headerType="bank" headerData={{balance:bankBalance(ledgerBank.id),safe:safeToSpend(ledgerBank.id),frozen:frozenForBank(ledgerBank.id)}} txns={txns.filter(t=>t.bankId===ledgerBank.id||t.fromBankId===ledgerBank.id||t.toBankId===ledgerBank.id)} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} incCats={incCats} onClose={()=>setLedgerBank(null)}/>}
          {ledgerGroup&&(()=>{const spent=txns.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&ledgerGroup.cats.includes(t.catId)).reduce((a,t)=>a+t.amount,0);return <DeepLedgerView title={ledgerGroup.name} headerType="group" headerData={{spent,color:ledgerGroup.color,glyph:ledgerGroup.glyph,name:ledgerGroup.name}} txns={txns.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&ledgerGroup.cats.includes(t.catId))} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} incCats={incCats} onClose={()=>setLedgerGroup(null)}/>;})()}
          {ledgerSaving&&(()=>{const saved=goalSaved(ledgerSaving.id);return <SavingDetailView goal={ledgerSaving} saved={saved} txns={txns} onDelete={delTxn} addTxn={addTxn} banks={banks} savings={savings} onSave={saveSavings} onGoalToast={setGoalToast} setAppAlert={setAppAlert} goalSaved={goalSaved} onClose={()=>setLedgerSaving(null)}/>;})()}
          {ledgerBudget&&(()=>{const spent=txns.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&ledgerBudget.cats.includes(t.catId)).reduce((a,t)=>a+t.amount,0);return <DeepLedgerView title={ledgerBudget.name} headerType="budget" headerData={{spent,limit:ledgerBudget.amount}} txns={txns.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&ledgerBudget.cats.includes(t.catId))} onDelete={delTxn} onUpdate={updateTxn} banks={banks} expCats={expCats} incCats={incCats} onClose={()=>setLedgerBudget(null)}/>;})()}
        </>
      )}
      {coachTour&&tab==="dashboard"&&!isSubPageActive&&<CoachTour onClose={()=>setCoachTour(false)}/>}
      {appAlert&&<AlertModal title={appAlert.title} message={appAlert.message} btnColor={appAlert.color} onClose={()=>setAppAlert(null)}/>}
      {pendingCurrency&&<ConfirmModal title="Change Currency?" message={`Switching from ${currency} to ${pendingCurrency} only changes how amounts are displayed. Your actual numbers will NOT be converted.\n\nContinue?`} confirmColor={C.blue} onClose={()=>setPendingCurrency(null)} onConfirm={confirmCurrencyChange}/>}
    </div>
  </ThemeContext.Provider>;
}

function NavBtn({id,icon,label,tab,navigateTo,onPress}){
  const a=tab===id;
  return <button onClick={onPress?onPress:()=>navigateTo(id,false)} style={{background:"none",border:"none",color:a?C.accent:C.muted,display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"4px 0",cursor:"pointer",transition:"color .2s",width:55,fontFamily:"'DM Sans', sans-serif"}}><span style={{fontSize:22}}>{icon}</span><span style={{fontSize:10,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>{label}</span></button>;
}

function BottomNav({tab,navigateTo,goHome,expCats,banks,savings,onAdd,currency,safeToSpend,goalSaved,setAppAlert,quickActions,txns}){
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
      if(amt<=saved){const ok=await onAdd({type:"goal_withdraw",amount:amt,date:quickForm.date,bankId:topBankId,bankName:topBank?.name,goalId:goal.id,goalName:goal.name,catId:quickForm.catId,catName:cat?.name,catIcon:cat?.icon,catGlyph:cat?.glyph,catEmoji:cat?.emoji,catColor:cat?.color,note:quickForm.note});if(ok!==false)finishQuickSave();}
      else{const shortfall=amt-saved;setAppAlert({title:"Not Enough in Goal",message:`Goal has ${fmt(saved)}.\nShortfall: ${fmt(shortfall)}\nRemaining will be taken from "${topBank?.name}". Continue?`,color:C.yellow,onConfirm:async()=>{const avail=safeToSpend(topBankId);if(avail<shortfall){setAppAlert({title:"Insufficient Balance",message:`"${topBank?.name}" only has ${fmt(avail)} available.`,color:C.red});return;}if(saved>0){await onAdd({type:"goal_withdraw",amount:saved,date:quickForm.date,bankId:topBankId,bankName:topBank?.name,goalId:goal.id,goalName:goal.name,catId:quickForm.catId,catName:cat?.name,catIcon:cat?.icon,catGlyph:cat?.glyph,catEmoji:cat?.emoji,catColor:cat?.color,note:"Goal portion"});}await onAdd({type:"expense",amount:shortfall,date:quickForm.date,bankId:topBankId,bankName:topBank?.name,catId:quickForm.catId,catName:cat?.name,catIcon:cat?.icon,catGlyph:cat?.glyph,catEmoji:cat?.emoji,catColor:cat?.color,note:quickForm.note||"Bank portion"});finishQuickSave();}});}
      return;
    }
    const bank=banks.find(b=>b.id===quickForm.bankId);
    const ok=await onAdd({type:"expense",amount:amt,date:quickForm.date,bankId:quickForm.bankId,bankName:bank?.name,catId:quickForm.catId,catName:cat?.name,catIcon:cat?.icon,catGlyph:cat?.glyph,catEmoji:cat?.emoji,catColor:cat?.color,note:quickForm.note});
    if(ok!==false)finishQuickSave();
  };

  const fieldStyle={width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px",color:C.text,fontSize:16,fontWeight:600,appearance:"none",outline:"none",boxSizing:"border-box",marginBottom:14,colorScheme:C.isDark?"dark":"light"};
  const qTheme="#FF6B6B";

  return <>
    <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,zIndex:50}}>
      <div style={{position:"absolute",bottom:0,width:"100%",height:95,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",padding:"0 12px"}}>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"space-around",paddingRight:48,marginBottom:16}}>
          <NavBtn id="dashboard" icon={ICONS.dashboard} label="Home" tab={tab} navigateTo={navigateTo} onPress={goHome}/>
          <NavBtn id="monthly" icon={ICONS.bills_nav} label="Bills" tab={tab} navigateTo={navigateTo}/>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"space-around",paddingLeft:48,marginBottom:16}}>
          <NavBtn id="history" icon="☰" label="History" tab={tab} navigateTo={navigateTo}/>
          <NavBtn id="settings" icon={ICONS.settings} label="Settings" tab={tab} navigateTo={navigateTo}/>
        </div>
      </div>
      <div data-coach="add" style={{position:"absolute",left:"50%",transform:"translateX(-50%)",bottom:38,width:84,height:84,borderRadius:"50%",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <button onTouchStart={pStart} onTouchEnd={pEnd} onMouseDown={pStart} onMouseUp={pEnd} onMouseLeave={()=>clearTimeout(pressTimer.current)} onContextMenu={e=>e.preventDefault()} style={{width:68,height:68,borderRadius:"50%",background:C.accent,color:"#111",fontSize:36,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"transform 0.1s",userSelect:"none",WebkitUserSelect:"none"}} onPointerDown={e=>e.currentTarget.style.transform="scale(0.9)"} onPointerUp={e=>e.currentTarget.style.transform="scale(1)"}>+</button>
      </div>
      {showQuick&&active.length===0&&<div style={{position:"fixed",bottom:135,left:"50%",transform:"translateX(-50%)",background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:"16px 20px",maxWidth:"85%",boxShadow:"0 12px 32px rgba(0,0,0,0.7)",zIndex:60,textAlign:"center"}}><div style={{fontSize:24,marginBottom:8}}>⚡</div><div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:4}}>No shortcuts configured</div><div style={{color:C.muted,fontSize:12}}>Go to Settings → Quick Actions.</div></div>}
      {showQuick&&active.length>0&&<div style={{position:"fixed",bottom:135,left:"50%",transform:"translateX(-50%)",background:C.card,border:`1px solid ${C.border}`,borderRadius:24,padding:"12px",maxWidth:"90%",boxShadow:"0 12px 32px rgba(0,0,0,0.7)",zIndex:60,display:"flex",justifyContent:"center"}}><style>{`@keyframes popIn{from{opacity:0;transform:translate(-50%,14px) scale(0.96)}to{opacity:1;transform:translate(-50%,0) scale(1)}}`}</style><div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"nowrap"}}>{active.map(q=>{const cat=expCats.find(c=>c.id===q.catId);return <button key={q.id} onClick={()=>handleQuickSelect(q)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,width:90,height:90,color:C.text,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,cursor:"pointer",padding:"4px",boxSizing:"border-box",fontFamily:"'DM Sans', sans-serif"}}><CatIcon cat={cat} size={38}/><span style={{fontSize:10,fontWeight:700,textAlign:"center",width:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cat?.name}</span></button>;})}</div></div>}
    </nav>
    {quickForm&&<Modal title="Quick Add" onClose={()=>setQuickForm(null)} center={false}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24,padding:"16px",background:C.card,borderRadius:16,border:`1px solid ${C.border}`}}>
        <CatIcon cat={expCats.find(c=>c.id===quickForm.catId)} size={44}/>
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
  const special=isSav||isTrans||txn.type==="goal_withdraw"||txn.type==="goal_return";
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
      {special
        ?<div style={{width:36,height:36,borderRadius:10,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{ic}</div>
        :<CatIcon glyph={txn.catGlyph} emoji={txn.catEmoji} icon={txn.catIcon} color={txn.catColor} name={txn.catName} size={36} style={{borderRadius:10}}/>}
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
          <Field label={isTrans?"Type":"Category"}><span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{isTrans?"🔁 Transfer":isSav?"◎ Goal Deposit":txn.type==="goal_withdraw"?"💳 Goal Spending":txn.type==="goal_return"?"🏦 Return to Bank":<><CatIcon glyph={txn.catGlyph} emoji={txn.catEmoji} icon={txn.catIcon} color={txn.catColor} name={txn.catName} size={18} style={{display:"inline-flex",verticalAlign:"-4px",marginRight:6}}/>{txn.catName}</>}</span></Field>
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
    await onSave({amount:p,date,bankId,bankName:bank?.name,catId,catName:cat?.name,catIcon:cat?.icon,catGlyph:cat?.glyph,catEmoji:cat?.emoji,catColor:cat?.color,note});
  };
  return <Modal title="Edit Transaction" onClose={onClose} center={false}>
    <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Amount</div><Input type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)}/></div>
    <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Date</div><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
    <div style={{opacity:isSav?0.6:1,pointerEvents:isSav?"none":"auto",marginBottom:isSav?4:0}}>
      <Select label="Account" value={bankId} onChange={e=>setBankId(e.target.value)}>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select>
    </div>
    {isSav&&<div style={{color:C.orange,fontSize:11,marginBottom:14,fontWeight:600,lineHeight:1.4}}>⚠️ To change the account, please delete this transaction and create a new one.</div>}
    {cats.length>0&&<Select label="Category" value={catId} onChange={e=>setCatId(e.target.value)}>{cats.map(c=><option key={c.id} value={c.id}>{c.emoji||ICONS[c.icon]||"•"} {c.name}</option>)}</Select>}
    <Input label="Note (optional)" value={note} onChange={e=>setNote(e.target.value)}/>
    <Btn full onClick={handleSave}>Save Changes</Btn>
  </Modal>;
}

function Dashboard({txns,txnsAll,bills,installments=[],budgets,banks,groups,expCats,savings,filterMonth,setFilterMonth,availMonths,username,bankBalance,safeToSpend,frozenForBank,goalSaved,onDeleteTxn,onUpdateTxn,onOpenBank,onOpenGroup,onOpenSaving,onOpenBudget,hideTotal,setHideTotal,navigateTo,openMonthly,scrollState,setScrollState,onBanks,onBudgets,onSavings,onGroups}){
  useEffect(()=>{if(scrollState.restore){setTimeout(()=>window.scrollTo(0,scrollState.y),50);setScrollState(s=>({...s,restore:false}));}else window.scrollTo(0,0);},[]);
  const[recentFilter,setRecentFilter]=useState("all");
  const[viewTxn,setViewTxn]=useState(null);
  const[showCustomize,setShowCustomize]=useState(false);
  const[insightsType,setInsightsType]=useState(null);
  const[balanceMode,setBalanceMode]=useState("total");
  useEffect(()=>{load("et_balance_mode","total").then(setBalanceMode);},[]);
  // First-run getting-started checklist (dismissible / can be turned off forever)
  const[obDismissed,setObDismissed]=useState(true);
  const obTasks=[
    {label:"Add an account",done:banks.length>0,go:()=>navigateTo("settings")},
    {label:"Log your first transaction",done:txnsAll.length>0,go:()=>navigateTo("add")},
    {label:"Create a budget",done:budgets.length>0,go:()=>navigateTo("budgets")},
    {label:"Set a savings goal",done:savings.length>0,go:()=>navigateTo("savings")},
  ];
  const obDone=obTasks.filter(t=>t.done).length,obAll=obDone===obTasks.length;
  useEffect(()=>{load("et_onboard_done",false).then(v=>{
    if(v){setObDismissed(true);return;}
    if(banks.length>0&&txnsAll.length>0&&budgets.length>0&&savings.length>0){setObDismissed(true);save("et_onboard_done",true);}
    else setObDismissed(false);
  });},[]);
  const dismissOb=async()=>{setObDismissed(true);HAPTICS.light?.();await save("et_onboard_done",true);};

  const defaultOrder=[
    {id:"accounts",label:"Accounts & Balance"},
    {id:"overview",label:"Income & Net"},
    {id:"bills",label:"Monthly Bills"},
    {id:"installments",label:"Installments"},
    {id:"budgets",label:"Monthly Budgets"},
    {id:"savings",label:"Savings Goals"},
    {id:"spending",label:"Spending Groups"}
  ];
  const[dashOrder,setDashOrder]=useState(defaultOrder);
  useEffect(()=>{load("et_dash_order",defaultOrder).then(saved=>{
    // Merge: keep saved order, append any new sections, refresh labels, drop removed ones
    const known=Object.fromEntries(defaultOrder.map(s=>[s.id,s.label]));
    const merged=saved.filter(s=>known[s.id]).map(s=>({id:s.id,label:known[s.id]}));
    defaultOrder.forEach(s=>{if(!merged.some(m=>m.id===s.id))merged.push(s);});
    setDashOrder(merged);
  });},[]);

  const totalBalance=useMemo(()=>banks.reduce((s,b)=>s+bankBalance(b.id),0),[banks,bankBalance]);
  const totalSafe=useMemo(()=>banks.reduce((s,b)=>s+safeToSpend(b.id),0),[banks,safeToSpend]);
  const totalIncome=useMemo(()=>txns.filter(t=>t.type==="income"||t.type==="goal_return").reduce((a,t)=>a+t.amount,0),[txns]);
  const totalExp=useMemo(()=>txns.filter(t=>t.type==="expense"||t.type==="goal_withdraw").reduce((a,t)=>a+t.amount,0),[txns]);
  const curMonth=currentMonth();
  const selMonth=filterMonth;
  const isCurrentMonth=selMonth===curMonth;
  const net=totalIncome-totalExp;
  const savingsRate=totalIncome>0?Math.round((net/totalIncome)*100):0;

  const getPrev=(m)=>{const[y,mo]=m.split("-");const d=new Date(+y,+mo-2,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;};
  const prevMonth=getPrev(selMonth);
  const prevT=txnsAll.filter(t=>t.date.startsWith(prevMonth));
  const prevInc=prevT.filter(t=>t.type==="income"||t.type==="goal_return").reduce((a,t)=>a+t.amount,0);
  const prevExp=prevT.filter(t=>t.type==="expense"||t.type==="goal_withdraw").reduce((a,t)=>a+t.amount,0);
  const prevNet=prevInc-prevExp;
  const incomeDiff=prevInc>0?Math.round(((totalIncome-prevInc)/prevInc)*100):null;
  const expDiff=prevExp>0?Math.round(((totalExp-prevExp)/prevExp)*100):null;
  const netDiff=Math.abs(prevNet)>0?Math.round(((net-prevNet)/Math.abs(prevNet))*100):null;

  const now2=new Date(),dim=new Date(now2.getFullYear(),now2.getMonth()+1,0).getDate();
  const daysLeft=Math.max(1,dim-now2.getDate()+1),dayOfMonth=now2.getDate();
  const dueIn=(dueDay)=>(!isCurrentMonth||!dueDay)?null:dueDay-dayOfMonth;
  const dueLabel=(dueDay)=>{const d=dueIn(dueDay);if(d===null)return dueDay?`Day ${dueDay}`:"";if(d<0)return `Overdue ${Math.abs(d)}d`;if(d===0)return "Due today";if(d===1)return "Tomorrow";return `In ${d} days`;};
  const dueColor=(dueDay)=>{const d=dueIn(dueDay);if(d===null)return C.muted;if(d<0)return C.red;if(d<=1)return C.orange;if(d<=3)return C.yellow;return C.accent;};

  const recents=txns.filter(t=>{if(recentFilter==="expenses")return t.type==="expense"||t.type==="goal_withdraw";if(recentFilter==="income")return t.type==="income"||t.type==="goal_return";return true;}).slice(0,5);
  const spendingGroups=groups.filter(g=>txns.filter(tx=>(tx.type==="expense"||tx.type==="goal_withdraw")&&g.cats.includes(tx.catId)).reduce((a,tx)=>a+tx.amount,0)>0);

  // Bills (selected month)
  const billPaid=(b)=>b.payments?.some(p=>p.month===selMonth);
  const billsTotal=bills.reduce((s,b)=>s+b.amount,0);
  const billsUnpaid=bills.filter(b=>!billPaid(b));
  const billsPaidCount=bills.length-billsUnpaid.length;
  const billsRemaining=billsUnpaid.reduce((s,b)=>s+b.amount,0);
  const billsPaidAmt=billsTotal-billsRemaining;
  const billsAllPaid=bills.length>0&&billsUnpaid.length===0;
  const nextBill=isCurrentMonth?[...billsUnpaid].sort((a,b)=>(a.dueDay||99)-(b.dueDay||99))[0]:null;
  const overdueBillCount=isCurrentMonth?billsUnpaid.filter(b=>b.dueDay&&dueIn(b.dueDay)<0).length:0;

  // Installments (selected month)
  const instPaidOf=(i)=>i.payments?i.payments.length:(i.paidInstallments||0);
  const instDone=(i)=>instPaidOf(i)>=i.totalInstallments;
  const instPaidInMonth=(i,m)=>!!i.payments?.some(p=>p.month===m);
  const activeInst=installments.filter(i=>!instDone(i));
  const instMonthly=activeInst.reduce((a,i)=>a+i.installmentAmount,0);
  const instTotalRemaining=activeInst.reduce((a,i)=>a+Math.max(0,i.totalAmount-instPaidOf(i)*i.installmentAmount),0);
  const instTotalAll=installments.reduce((a,i)=>a+i.totalAmount,0);
  const instPaidAll=installments.reduce((a,i)=>a+instPaidOf(i)*i.installmentAmount,0);
  const instDueThisMonth=activeInst.filter(i=>!instPaidInMonth(i,selMonth));
  const instPaidCountM=activeInst.length-instDueThisMonth.length;
  const instAllPaidM=activeInst.length>0&&instDueThisMonth.length===0;
  const nextInst=isCurrentMonth?[...instDueThisMonth].sort((a,b)=>(a.dueDay||99)-(b.dueDay||99))[0]:null;
  const instOverallPct=instTotalAll>0?Math.round((instPaidAll/instTotalAll)*100):0;
  const overdueInstCount=isCurrentMonth?instDueThisMonth.filter(i=>i.dueDay&&dueIn(i.dueDay)<0).length:0;
  const splitCounts={};
  txnsAll.forEach(t=>{if(t.splitGroupId)splitCounts[t.splitGroupId]=(splitCounts[t.splitGroupId]||0)+1;});
  const expTxns=txns.filter(t=>t.type==="expense"||t.type==="goal_withdraw");
  const incTxns=txns.filter(t=>t.type==="income"||t.type==="goal_return");
  const getTopCats=(txnList,totalAmt)=>{
    const totals={};
    txnList.forEach(t=>{const key=t.catId||t.type;const name=t.catName||(t.type==="goal_withdraw"?"Goal Spending":t.type==="goal_return"?"Returned to Bank":t.type);const icon=t.catIcon||(t.type==="goal_withdraw"?"goal":t.type==="goal_return"?"bank":"others");if(!totals[key])totals[key]={name,icon,glyph:t.catGlyph,emoji:t.catEmoji,color:t.catColor,amount:0};totals[key].amount+=t.amount;});
    return Object.values(totals).sort((a,b)=>b.amount-a.amount).slice(0,5).map(c=>({...c,pct:totalAmt>0?Math.round((c.amount/totalAmt)*100):0}));
  };
  const topExpCats=getTopCats(expTxns,totalExp);
  const topIncCats=getTopCats(incTxns,totalIncome);
  const biggestExp=expTxns.length?expTxns.reduce((max,t)=>t.amount>max.amount?t:max,expTxns[0]):null;
  const biggestInc=incTxns.length?incTxns.reduce((max,t)=>t.amount>max.amount?t:max,incTxns[0]):null;

  return <div style={{padding:"24px 16px 0"}}>
    {username&&<div style={{marginBottom:18}}><div style={{color:C.muted,fontSize:13,fontWeight:500}}>{(()=>{const h=new Date().getHours();return <>{h<12?"☀️":h<18?"👋":"🌙"} {h<12?"Good morning":h<18?"Good afternoon":"Good evening"},</>; })()}</div><div style={{color:C.text,fontSize:24,fontWeight:800,letterSpacing:-0.5}}>{username} 💰</div></div>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{color:C.text,fontSize:20,fontWeight:800}}>Overview</div><span data-coach="month" style={{display:"inline-flex"}}><MonthSelect value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} availMonths={availMonths} allowAll={false}/></span></div>

    {txnsAll.length===0&&<div style={{background:C.accentDim,border:`1px solid ${C.accent}44`,borderRadius:16,padding:"20px",marginBottom:20,textAlign:"center"}}><div style={{fontSize:32,marginBottom:10}}>👋</div><div style={{color:C.accent,fontWeight:800,fontSize:16,marginBottom:6}}>Welcome to Saver!</div><div style={{color:C.muted,fontSize:13,lineHeight:1.6}}>Tap <strong style={{color:C.accent}}>＋</strong> to add your first transaction.</div></div>}
    {txnsAll.length>0&&txns.length===0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px",marginBottom:20,textAlign:"center"}}><div style={{fontSize:32,marginBottom:10}}>✨</div><div style={{color:C.text,fontWeight:800,fontSize:16,marginBottom:6}}>Fresh start for {filterMonth!=="all"?MONTHS[+filterMonth.split("-")[1]-1]:"this period"}!</div><div style={{color:C.muted,fontSize:13,lineHeight:1.6}}>No transactions yet. Tap <strong style={{color:C.accent}}>＋</strong> to start tracking.</div></div>}

    {!obDismissed&&<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"16px",marginBottom:20,animation:"fpIn 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        <div style={{width:34,height:34,borderRadius:10,background:C.accent+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><Ico name={obAll?"checkCircle":"sparkles"} size={18} color={C.accent}/></div>
        <div style={{flex:1}}><div style={{color:C.text,fontWeight:800,fontSize:15}}>{obAll?"You're all set!":"Getting started"}</div><div style={{color:C.muted,fontSize:11,marginTop:1}}>{obAll?"You've set up the basics":`${obDone} of ${obTasks.length} done`}</div></div>
        <button onClick={dismissOb} aria-label="Dismiss" style={{background:"none",border:"none",color:C.faint,cursor:"pointer",padding:6,display:"flex"}}><Ico name="close" size={17} color={C.faint}/></button>
      </div>
      <ProgressBar value={obDone} max={obTasks.length} color={C.accent}/>
      <div style={{marginTop:8}}>
        {obTasks.map((t,idx)=><div key={idx} onClick={()=>{if(!t.done)t.go();}} className={t.done?"":"ic"} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 2px",cursor:t.done?"default":"pointer",borderTop:idx>0?`1px solid ${C.border}`:"none"}}>
          {t.done?<Ico name="checkCircle" size={20} color={C.accent} stroke={2}/>:<Ico name="circle" size={20} color={C.faint} stroke={2}/>}
          <span style={{flex:1,color:t.done?C.faint:C.text,fontSize:14,fontWeight:600,textDecoration:t.done?"line-through":"none"}}>{t.label}</span>
          {!t.done&&<Ico name="chevR" size={16} color={C.faint}/>}
        </div>)}
      </div>
      {obAll&&<div style={{marginTop:12}}><Btn full small onClick={dismissOb} color={C.accent}>Got it</Btn></div>}
    </div>}

    {dashOrder.map(section=>{
      if(section.id==="accounts")return(
        <div key="accounts">
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Accounts</div>
          <div data-coach="balance"><BalanceCarousel totalBalance={totalBalance} totalSafe={totalSafe} hideTotal={hideTotal} setHideTotal={setHideTotal} initialMode={balanceMode} onModeChange={async(mode)=>{setBalanceMode(mode);await save("et_balance_mode",mode);}}/></div>
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
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:(totalIncome>0||totalExp>0)?10:0}}>
            <Card onClick={()=>totalIncome>0&&!hideTotal&&setInsightsType("income")} className="ic" style={{padding:"14px 14px 12px",cursor:totalIncome>0&&!hideTotal?"pointer":"default"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Income</div><div style={{color:C.accent,fontSize:20,fontWeight:800,marginBottom:4}}>{hideTotal?"••••":fmt(totalIncome)}</div>{incomeDiff!==null&&!hideTotal&&<div style={{display:"flex",alignItems:"center",gap:3,fontSize:10,fontWeight:700,color:incomeDiff>=0?C.accent:C.red}}><Ico name={incomeDiff>=0?"up":"down"} size={11} color={incomeDiff>=0?C.accent:C.red} stroke={2.6}/>{Math.abs(incomeDiff)}% vs last month</div>}</Card>
            <Card onClick={()=>totalExp>0&&!hideTotal&&setInsightsType("expense")} className="ic" style={{padding:"14px 14px 12px",cursor:totalExp>0&&!hideTotal?"pointer":"default"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Expenses</div><div style={{color:C.red,fontSize:20,fontWeight:800,marginBottom:4}}>{hideTotal?"••••":fmt(totalExp)}</div>{expDiff!==null&&!hideTotal&&<div style={{display:"flex",alignItems:"center",gap:3,fontSize:10,fontWeight:700,color:expDiff<=0?C.accent:C.red}}><Ico name={expDiff<=0?"down":"up"} size={11} color={expDiff<=0?C.accent:C.red} stroke={2.6}/>{Math.abs(expDiff)}% vs last month</div>}</Card>
          </div>
          {(totalIncome>0||totalExp>0)&&!hideTotal&&(()=>{const pos=net>=0,nc=pos?C.accent:C.red;return <div style={{background:C.card,padding:"14px 16px",borderRadius:14,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:44,height:44,borderRadius:13,background:nc+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><Ico name={pos?"coins":"trendDown"} size={24} color={nc} stroke={2}/></div>
            <div style={{flex:1}}><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>{pos?"Saved this month":"Overspent this month"}</div><div style={{color:nc,fontSize:22,fontWeight:800,letterSpacing:-0.5}}>{pos?"+":"−"}{fmt(Math.abs(net))}</div></div>
            {totalIncome>0&&<div style={{textAlign:"right"}}><div style={{color:nc,fontSize:18,fontWeight:800}}>{savingsRate}%</div><div style={{color:C.faint,fontSize:10,fontWeight:700}}>savings rate</div></div>}
          </div>;})()}
        </div>
      );
      if(section.id==="bills"&&bills.length>0)return(
        <div key="bills">
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Monthly Bills</div>
          <Card onClick={()=>openMonthly("subscriptions")} className="ic" style={{padding:"16px",marginBottom:20,cursor:"pointer",transition:"transform 0.1s ease"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{width:36,height:36,borderRadius:11,background:(billsAllPaid?C.accent:C.blue)+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><Ico name="zap" size={20} color={billsAllPaid?C.accent:C.blue} stroke={2}/></div>
              <div style={{flex:1}}><div style={{color:C.text,fontWeight:800,fontSize:15}}>Monthly Bills</div><div style={{color:C.muted,fontSize:11,marginTop:1}}>{billsPaidCount}/{bills.length} paid{overdueBillCount>0?` · ${overdueBillCount} overdue`:""}</div></div>
              <Ico name="chevR" size={18} color={C.faint}/>
            </div>
            <div style={{marginBottom:12}}><div style={{color:billsAllPaid?C.accent:C.text,fontSize:26,fontWeight:800,letterSpacing:-0.5}}>{hideTotal?"••••":billsAllPaid?"All cleared":fmt(billsRemaining)}</div><div style={{color:C.muted,fontSize:11,marginTop:2,display:"flex",alignItems:"center",gap:4}}>{billsAllPaid?<><Ico name="check" size={12} color={C.accent} stroke={3}/>everything paid this month</>:`remaining of ${hideTotal?"••••":fmt(billsTotal)}`}</div></div>
            <div style={{display:"flex",gap:3,height:8,marginBottom:nextBill?14:0}}>{bills.map(b=>{const paid=billPaid(b),od=isCurrentMonth&&!paid&&b.dueDay&&dueIn(b.dueDay)<0;return <div key={b.id} style={{flex:1,borderRadius:3,background:paid?C.accent:od?C.red:C.faint,transition:"background .35s ease"}}/>;})}</div>
            {nextBill&&<div style={{display:"flex",alignItems:"center",gap:8,paddingTop:14,borderTop:`1px solid ${C.border}`}}><Ico name={dueIn(nextBill.dueDay)<=0?"bell":"clock"} size={15} color={dueColor(nextBill.dueDay)} stroke={2.2}/><span style={{color:C.text,fontSize:13,fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Next: {nextBill.name}</span><span style={{color:dueColor(nextBill.dueDay),fontSize:11,fontWeight:800}}>{dueLabel(nextBill.dueDay)}</span><span style={{color:C.text,fontSize:13,fontWeight:800}}>{hideTotal?"••••":fmt(nextBill.amount)}</span></div>}
          </Card>
        </div>
      );
      if(section.id==="installments"&&installments.length>0)return(
        <div key="installments">
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Installments</div>
          <Card onClick={()=>openMonthly("installments")} className="ic" style={{padding:"16px",marginBottom:20,cursor:"pointer",transition:"transform 0.1s ease"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{width:36,height:36,borderRadius:11,background:(activeInst.length===0?C.accent:C.purple)+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><Ico name="card" size={20} color={activeInst.length===0?C.accent:C.purple} stroke={2}/></div>
              <div style={{flex:1}}><div style={{color:C.text,fontWeight:800,fontSize:15}}>Installments</div><div style={{color:C.muted,fontSize:11,marginTop:1}}>{activeInst.length===0?"all plans completed":`${instPaidCountM}/${activeInst.length} paid${overdueInstCount>0?` · ${overdueInstCount} overdue`:""}`}</div></div>
              <Ico name="chevR" size={18} color={C.faint}/>
            </div>
            {activeInst.length===0?(
              <div style={{display:"flex",alignItems:"center",gap:6,color:C.accent,fontWeight:700,fontSize:15}}><Ico name="checkCircle" size={18} color={C.accent} stroke={2}/>All installments cleared</div>
            ):(<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12}}>
                <div><div style={{color:C.text,fontSize:26,fontWeight:800,letterSpacing:-0.5}}>{hideTotal?"••••":fmt(instTotalRemaining)}</div><div style={{color:C.muted,fontSize:11,marginTop:2}}>left to clear · {hideTotal?"••••":fmt(instMonthly)}/mo</div></div>
                <div style={{textAlign:"right"}}><div style={{color:C.purple,fontSize:18,fontWeight:800}}>{instOverallPct}%</div><div style={{color:C.faint,fontSize:10,fontWeight:700}}>paid off</div></div>
              </div>
              <div style={{display:"flex",gap:3,height:8,marginBottom:nextInst?14:0}}>{activeInst.map(i=>{const paid=instPaidInMonth(i,selMonth),od=isCurrentMonth&&!paid&&i.dueDay&&dueIn(i.dueDay)<0;return <div key={i.id} style={{flex:1,borderRadius:3,background:paid?C.accent:od?C.red:C.faint,transition:"background .35s ease"}}/>;})}</div>
              {nextInst&&<div style={{display:"flex",alignItems:"center",gap:8,paddingTop:14,borderTop:`1px solid ${C.border}`}}><Ico name={dueIn(nextInst.dueDay)<=0?"bell":"clock"} size={15} color={dueColor(nextInst.dueDay)} stroke={2.2}/><span style={{color:C.text,fontSize:13,fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Next: {nextInst.company||nextInst.name||"Installment"}</span><span style={{color:dueColor(nextInst.dueDay),fontSize:11,fontWeight:800}}>{dueLabel(nextInst.dueDay)}</span><span style={{color:C.text,fontSize:13,fontWeight:800}}>{hideTotal?"••••":fmt(nextInst.installmentAmount)}</span></div>}
            </>)}
          </Card>
        </div>
      );
      if(section.id==="budgets"&&budgets.length>0)return(()=>{
        const budTotal=budgets.reduce((a,b)=>a+b.amount,0);
        const budSpent=budgets.reduce((a,bd)=>a+txnsAll.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&bd.cats.includes(t.catId)&&t.date.startsWith(selMonth)).reduce((s,t)=>s+t.amount,0),0);
        const budPct=budTotal>0?Math.min(100,Math.round((budSpent/budTotal)*100)):0;
        const budCol=budPct>=90?C.red:budPct>=70?C.yellow:C.accent;
        return <div key="budgets">
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Monthly Budgets</div>
          <Card style={{padding:"16px",marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:38,height:38,borderRadius:12,background:budCol+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><Ico name="layers" size={20} color={budCol} stroke={2}/></div>
              <div style={{flex:1}}><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Total Budget</div><div style={{color:C.text,fontSize:18,fontWeight:800,marginTop:2}}>{hideTotal?"••••":fmt(budSpent)} <span style={{color:C.muted,fontSize:12,fontWeight:600}}>of {hideTotal?"••••":fmt(budTotal)}</span></div></div>
              <Pill color={budCol}>{budPct}%</Pill>
            </div>
            <ProgressBar value={budSpent} max={budTotal} color={budCol}/>
            <div style={{height:1,background:C.border,margin:"16px 0 14px"}}/>
            <SortableList items={budgets} onReorder={onBudgets} gap={10} renderItem={(bdg)=>{
              const spent=txnsAll.filter(t=>(t.type==="expense"||t.type==="goal_withdraw")&&bdg.cats.includes(t.catId)&&t.date.startsWith(selMonth)).reduce((a,t)=>a+t.amount,0);
              const rem=Math.max(0,bdg.amount-spent),pct=bdg.amount>0?Math.min(100,Math.round((spent/bdg.amount)*100)):0,barColor=pct>=90?C.red:pct>=70?C.yellow:C.accent;
              const fc=expCats.find(c=>bdg.cats.includes(c.id));
              return <div onClick={()=>onOpenBudget(bdg)} className="ic" style={{padding:"13px 14px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:14,cursor:"pointer",transition:"transform 0.1s ease"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <CatIcon cat={fc} color={fc?undefined:barColor} name={bdg.name} size={30}/>
                  <span style={{color:C.text,fontSize:14,fontWeight:700,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bdg.name}</span>
                  <Pill color={barColor}>{pct}%</Pill>
                </div>
                <ProgressBar value={spent} max={bdg.amount} color={barColor}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                  <span style={{color:C.muted,fontSize:11}}>Spent {hideTotal?"••••":fmt(spent)} of {hideTotal?"••••":fmt(bdg.amount)}</span>
                  <span style={{color:rem===0?C.red:C.accent,fontSize:12,fontWeight:800}}>{hideTotal?"••••":fmt(rem)} left</span>
                </div>
                {isCurrentMonth&&rem>0&&!hideTotal&&<div style={{color:C.faint,fontSize:10,fontWeight:600,marginTop:4}}>≈ {fmt(rem/daysLeft)}/day for {daysLeft} day{daysLeft!==1?"s":""} left</div>}
              </div>;
            }}/>
          </Card>
        </div>;
      })();
      if(section.id==="savings"&&savings.length>0)return(
        <div key="savings">
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Savings Goals</div>
          <div style={{marginBottom:20}}>
            <SortableList items={savings} onReorder={onSavings} renderItem={(s)=>{
              const saved=goalSaved(s.id),pct=s.goal?Math.min(110,Math.round((saved/s.goal)*100)):0,isSpending=s.spendingMode;
              const mainColor=isSpending?C.orange:C.yellow;
              return <Card onClick={()=>onOpenSaving(s)} className="ic" style={{padding:"14px 14px 12px",cursor:"pointer",transition:"transform 0.1s ease",border:`1px solid ${isSpending?C.orange+"66":C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}><Ico name={isSpending?"card":"target"} size={16} color={mainColor} stroke={2}/><span style={{color:C.text,fontWeight:700,fontSize:14}}>{s.name}</span>{isSpending&&<Pill color={C.orange} style={{fontSize:10}}>Spending</Pill>}</div>
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
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><CatIcon glyph={g.glyph} color={g.color} name={g.name} size={26} style={{borderRadius:8}}/><span style={{color:C.muted,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</span></div>
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
      <button data-coach="customize" onClick={()=>setShowCustomize(true)} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.text,padding:"10px 20px",borderRadius:99,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans', sans-serif",display:"inline-flex",alignItems:"center",gap:7}}><Ico name="layers" size={15} color={C.text}/>Customize Layout</button>
    </div>

    {viewTxn&&<TxnViewModal txn={viewTxn} onClose={()=>setViewTxn(null)}/>}

    {insightsType&&(
      <Modal title={insightsType==="expense"?"Expense Breakdown":"Income Breakdown"} onClose={()=>setInsightsType(null)} center={false}>
        {(insightsType==="expense"?biggestExp:biggestInc)&&(
          <div style={{marginBottom:24}}>
            <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{insightsType==="expense"?"Highest Expense":"Highest Income"}</div>
            <div style={{background:insightsType==="expense"?C.redDim:C.accentDim,border:`1px solid ${insightsType==="expense"?C.red:C.accent}44`,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:14}}>
              {(()=>{const b=insightsType==="expense"?biggestExp:biggestInc;return <CatIcon glyph={b.catGlyph} emoji={b.catEmoji} icon={b.catIcon} color={b.catColor} name={b.catName} size={48} style={{borderRadius:12}}/>;})()}
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
                    <div style={{display:"flex",alignItems:"center",gap:10}}><CatIcon glyph={c.glyph} emoji={c.emoji} icon={c.icon} color={c.color} name={c.name} size={30} style={{borderRadius:9}}/><span style={{color:C.text,fontSize:14,fontWeight:600}}>{c.name}</span></div>
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
  if(type==="group")return <div style={{marginBottom:20,padding:"16px 18px",background:C.card,border:`1px solid ${C.border}`,borderRadius:16,display:"flex",alignItems:"center",gap:14}}><CatIcon glyph={data.glyph} color={data.color} name={data.name} size={48} style={{borderRadius:14}}/><div><div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:6}}>Total Spent</div><div style={{color:data.color||C.purple,fontSize:32,fontWeight:800,letterSpacing:-1}}>{fmt(data.spent)}</div></div></div>;
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
    {headerType!=="budget"&&headerType!=="group"&&<div style={{display:"flex",gap:6,marginBottom:18}}>{["all","in","out"].map(f=><button key={f} onClick={()=>setFilter(f)} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${filter===f?C.accent:C.border}`,background:filter===f?C.accentDim:"transparent",color:filter===f?C.accent:C.muted,fontWeight:700,fontSize:11,cursor:"pointer",textTransform:"uppercase",fontFamily:"'DM Sans', sans-serif"}}>{f}</button>)}</div>}
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
      ok=await onAdd({type:"goal_withdraw",amount:amt,date:txnDate,goalId:goal.id,goalName:goal.name,catId,catName:cat?.name,catIcon:cat?.icon,catGlyph:cat?.glyph,catEmoji:cat?.emoji,catColor:cat?.color,note});
    }else{
      const cat=cats.find(c=>c.id===catId);
      ok=await onAdd({type,amount:amt,date:txnDate,bankId:sourceId,bankName:bank?.name,catId,catName:cat?.name,catIcon:cat?.icon,catGlyph:cat?.glyph,catEmoji:cat?.emoji,catColor:cat?.color,note});
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
        {type!=="transfer"&&type!=="saving"&&(
          <div style={{display:"flex",gap:12,overflowX:"auto",padding:"2px 0 8px",WebkitOverflowScrolling:"touch",marginBottom:6}}>
            {cats.map(c=>{const on=catId===c.id;return (
              <button key={c.id} onClick={()=>setCatId(c.id)} style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:6,width:62,background:"transparent",border:"none",cursor:"pointer",fontFamily:"'DM Sans', sans-serif",padding:0}}>
                <div style={{padding:3,borderRadius:16,border:`2px solid ${on?(c.color||C.accent):"transparent"}`}}><CatIcon cat={c} size={44} style={{borderRadius:13,opacity:on?1:0.85}}/></div>
                <span style={{color:on?C.text:C.muted,fontSize:11,fontWeight:on?700:600,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{c.name}</span>
              </button>
            );})}
          </div>
        )}
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
      {quickActions.map((q,idx)=>{const cat=expCats.find(c=>c.id===q.catId),bank=banks.find(b=>b.id===q.bankId);return <Card key={q.id} style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{display:"flex",alignItems:"center",gap:8,color:C.text,fontWeight:700,fontSize:15}}>{cat&&<CatIcon cat={cat} size={26}/>}<span>Slot #{idx+1}: {cat?cat.name:"Empty"}</span></div>{cat&&<div style={{color:C.muted,fontSize:12,marginTop:4}}>{fmt(parseFloat(q.amount))} · {bank?.name}</div>}</div><div style={{display:"flex",gap:8}}><Btn small onClick={()=>openCfg(q)} color={C.blue} outline>Setup</Btn>{q.catId&&<Btn small onClick={async()=>{await onSave(quickActions.map(a=>a.id===q.id?{...a,catId:"",amount:"",bankId:""}:a));}} color={C.red} outline style={{padding:"5px 10px"}}>✕</Btn>}</div></Card>;})}
    </div>
    {editingId&&<Modal title="Configure Shortcut" onClose={()=>setEditingId(null)} center={false}><Select label="Expense Category" value={catId} onChange={e=>setCatId(e.target.value)}>{expCats.map(c=><option key={c.id} value={c.id}>{c.emoji||ICONS[c.icon]||"•"} {c.name}</option>)}</Select><Input label="Default Amount" type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)}/><Select label="Default Account" value={bankId} onChange={e=>setBankId(e.target.value)}>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select><Btn full onClick={async()=>{await onSave(quickActions.map(q=>q.id===editingId?{...q,catId,amount,bankId}:q));setEditingId(null);}} style={{marginTop:8}}>Save Shortcut</Btn></Modal>}
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

function CoachTour({onClose}){
  const steps=[
    {sel:'[data-coach="month"]',title:"Pick a month",text:"Every card on the home screen updates to the month you choose here."},
    {sel:'[data-coach="balance"]',title:"Your balance",text:"See your total, or swipe across to Safe-to-Spend. Tap the icon to hide amounts."},
    {sel:'[data-coach="customize"]',title:"Make it yours",text:"Reorder the whole dashboard — drag the sections into the order you like."},
    {sel:'[data-coach="add"]',title:"Add anything",text:"Tap + to log an expense, income, saving or transfer. Long-press it for Quick Actions."},
  ];
  const[i,setI]=useState(0);
  const[rect,setRect]=useState(null);
  const last=i===steps.length-1;
  useEffect(()=>{
    let cancelled=false,raf;
    const el=document.querySelector(steps[i].sel);
    if(!el){ if(!last)setI(i+1); else onClose(); return; }
    try{el.scrollIntoView({behavior:"smooth",block:"center"});}catch{}
    const measure=()=>{ if(cancelled)return; const r=el.getBoundingClientRect(); setRect({top:r.top,left:r.left,width:r.width,height:r.height}); };
    const t=setTimeout(measure,360);
    const onMove=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(measure);};
    window.addEventListener("resize",onMove);window.addEventListener("scroll",onMove,true);
    return()=>{cancelled=true;clearTimeout(t);cancelAnimationFrame(raf);window.removeEventListener("resize",onMove);window.removeEventListener("scroll",onMove,true);};
  },[i]);
  const next=()=>{ if(!last)setI(i+1); else onClose(); };
  const prev=()=>{ if(i>0)setI(i-1); };
  const pad=8;
  const h=rect?{top:rect.top-pad,left:rect.left-pad,w:rect.width+pad*2,height:rect.height+pad*2}:null;
  const below=h?(h.top+h.height < window.innerHeight*0.55):true;
  return <div style={{position:"fixed",inset:0,zIndex:300,fontFamily:"'DM Sans', sans-serif"}}>
    <style>{`@keyframes ctIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    {!h&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)"}}/>}
    {h&&<>
      <div style={{position:"fixed",top:h.top,left:h.left,width:h.w,height:h.height,borderRadius:14,boxShadow:"0 0 0 9999px rgba(0,0,0,0.72)",transition:"all .3s cubic-bezier(0.2,0.8,0.2,1)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",top:h.top,left:h.left,width:h.w,height:h.height,borderRadius:14,border:`2px solid ${C.accent}`,transition:"all .3s cubic-bezier(0.2,0.8,0.2,1)",pointerEvents:"none"}}/>
    </>}
    <div key={i} style={{position:"fixed",left:16,right:16,maxWidth:400,margin:"0 auto",background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"16px",boxShadow:"0 12px 30px rgba(0,0,0,0.45)",animation:"ctIn .3s ease",...(below?{top:(h?h.top+h.height:80)+12}:{bottom:window.innerHeight-(h?h.top:0)+12})}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",gap:5}}>{steps.map((_,idx)=><div key={idx} style={{width:idx===i?18:6,height:6,borderRadius:3,background:idx===i?C.accent:C.border,transition:"all .3s"}}/>)}</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",padding:"4px 6px",fontFamily:"'DM Sans', sans-serif"}}>Skip</button>
      </div>
      <div style={{color:C.text,fontSize:16,fontWeight:800,marginBottom:5}}>{steps[i].title}</div>
      <div style={{color:C.muted,fontSize:13.5,lineHeight:1.55,marginBottom:14}}>{steps[i].text}</div>
      <div style={{display:"flex",gap:10}}>
        {i>0&&<button onClick={prev} style={{flex:"0 0 auto",background:"transparent",border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:"10px 16px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>Back</button>}
        <Btn full onClick={next}>{last?"Done":"Next"}</Btn>
      </div>
    </div>
  </div>;
}

function Privacy({onBack}){
  const sections=[
    {icon:"phone",color:C.accent,title:"Everything stays on your device",body:<>Your accounts, budgets, bills and transactions are saved <strong style={{color:C.text}}>only</strong> in your device's local storage. Saver works fully offline — nothing is ever uploaded to a server.</>},
    {icon:"shield",color:C.blue,title:"No tracking, no servers",body:<>We don't run any servers that collect your data, and we don't track how you use the app. There are no ads and no analytics — your financial information belongs to you alone.</>},
    {icon:"lock",color:C.yellow,title:"Only you can access it",body:<>Your data is protected by your device's built-in security (such as the iOS sandbox). Keep your screen lock and passcode enabled for the strongest protection.</>},
    {icon:"download",color:C.orange,title:"Back up to stay safe",body:<>Because everything lives on your device, clearing your browser data can erase it. Use the built-in <strong style={{color:C.text}}>Backup</strong> feature regularly so you never lose your records.</>},
  ];
  return <FullPage title="Privacy Policy" onBack={onBack}>
    <div style={{padding:"4px 16px 48px"}}>
      <div style={{background:`linear-gradient(135deg,${C.accentDim} 0%,${C.blueDim} 100%)`,border:`1px solid ${C.accent}33`,borderRadius:20,padding:"22px 20px",marginBottom:22,display:"flex",alignItems:"center",gap:16}}>
        <div style={{width:52,height:52,borderRadius:16,background:C.bg+"99",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ico name="shield" size={28} color={C.accent} stroke={2}/></div>
        <div><div style={{color:C.text,fontSize:18,fontWeight:800,marginBottom:4}}>Private by design</div><div style={{color:C.muted,fontSize:13,lineHeight:1.55}}>Saver keeps your money data <strong style={{color:C.accent}}>100% on your device</strong> — no account, no cloud, no tracking.</div></div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {sections.map((s,i)=>(
          <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"16px 18px"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <div style={{width:40,height:40,borderRadius:12,background:s.color+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ico name={s.icon} size={21} color={s.color} stroke={2}/></div>
              <h3 style={{color:C.text,margin:0,fontSize:15.5,fontWeight:800,lineHeight:1.25}}>{s.title}</h3>
            </div>
            <p style={{margin:0,fontSize:13.5,lineHeight:1.6,color:C.muted}}>{s.body}</p>
          </div>
        ))}
      </div>
      <div style={{textAlign:"center",marginTop:32}}>
        <div style={{color:C.accent,opacity:0.85,fontSize:13,fontWeight:700,marginBottom:4}}>Saver One V1.2</div>
        <div style={{color:C.faint,fontSize:10,fontWeight:500}}>Offline & 100% Private · Powered by Mahmoud © 2026</div>
      </div>
    </div>
  </FullPage>;
}

// ── MonthlyBillsPage (Subscriptions + Installments) ───────────────────────────
function MonthlyBillsPage({bills,installments,initialTab,onSaveBills,onSaveInstallments,banks,expCats,onAddTxn,delTxn,currency,setAppAlert}){
  useEffect(()=>{window.scrollTo(0,0);},[]);
  const[activeTab,setActiveTab]=useState(initialTab||"subscriptions");
  return <div style={{padding:"24px 16px 0",minHeight:"100vh",background:C.bg,boxSizing:"border-box"}}>
    <div style={{color:C.text,fontSize:22,fontWeight:800,marginBottom:16}}>Bills</div>
    <div style={{display:"flex",gap:8,marginBottom:20}}>
      {[{id:"subscriptions",label:"📋 Subscriptions"},{id:"installments",label:"💳 Installments"}].map(t=><button key={t.id} onClick={()=>setActiveTab(t.id)} style={{flex:1,padding:"11px 0",borderRadius:12,border:`1.5px solid ${activeTab===t.id?C.accent:C.border}`,background:activeTab===t.id?C.accentDim:"transparent",color:activeTab===t.id?C.accent:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>{t.label}</button>)}
    </div>
    {activeTab==="subscriptions"&&<SubscriptionsTab bills={bills} onSave={onSaveBills} banks={banks} expCats={expCats} onAddTxn={onAddTxn} delTxn={delTxn} currency={currency} setAppAlert={setAppAlert}/>}
    {activeTab==="installments"&&<InstallmentsTab installments={installments} onSave={onSaveInstallments} banks={banks} expCats={expCats} onAddTxn={onAddTxn} delTxn={delTxn} setAppAlert={setAppAlert}/>}
  </div>;
}

function SubscriptionsTab({bills,onSave,banks,expCats,onAddTxn,delTxn,currency,setAppAlert}){
  const getLocalMonth=()=>{const d=new Date();const offset=d.getTimezoneOffset()*60000;return new Date(d.getTime()-offset).toISOString().slice(0,7);};
  const curMonth=getLocalMonth();
  const[view,setView]=useState({mode:"list"}); // list | picker | form | detail
  const[serviceSearch,setServiceSearch]=useState("");
  const[form,setForm]=useState(null); // {editId,name,amount,bankId,typeId,dueDay,reminderDays,note,domain,color}
  const[detailMonth,setDetailMonth]=useState(curMonth);
  const[filterMonth,setFilterMonth]=useState(curMonth);
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
  const remainingThisMonth=bills.filter(b=>!isPaid(b,curMonth)).reduce((a,b)=>a+b.amount,0);
  const upcoming=bills.filter(b=>!isPaid(b,curMonth)).sort((a,b)=>(a.dueDay||99)-(b.dueDay||99));
  const availMonths=[...new Set([...bills.flatMap(b=>(b.payments||[]).map(p=>p.month)),curMonth])].sort().reverse();
  const isReportMode=filterMonth==="all";
  // Smart order for a given month: unpaid first (soonest due on top), paid sink to bottom
  const sortForMonth=(mStr)=>[...bills].sort((a,b)=>{const pa=isPaid(a,mStr)?1:0,pb=isPaid(b,mStr)?1:0;if(pa!==pb)return pa-pb;return (a.dueDay||99)-(b.dueDay||99);});

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
      const id=await onAddTxn({type:"expense",amount:bill.amount,date:dateStr,bankId:bill.bankId,bankName:bank?.name,catId:`bill_${type.id}`,catName:type.name,catIcon:type.icon,catColor:type.color,note:`Bill: ${bill.name} ${ms}`});
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
          <input placeholder="Search services..." value={serviceSearch} onChange={e=>setServiceSearch(e.target.value)} style={{...is,paddingLeft:40,borderRadius:14}}/>
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
      <div style={{color:C.muted,fontSize:12,fontWeight:700,letterSpacing:.5,marginBottom:4}}>Total monthly · {MONTHS[+curMonth.split("-")[1]-1]}</div>
      <div style={{color:C.text,fontSize:38,fontWeight:800,letterSpacing:-1.5,marginBottom:16}}>{fmt(totalMonthly)}</div>
      <div style={{display:"flex",background:C.isDark?"#ffffff10":"#00000008",borderRadius:14,padding:"12px 0"}}>
        {[{v:`${paidCount}/${bills.length}`,l:"Paid"},{v:fmt(remainingThisMonth),l:"Left to pay"},{v:fmt(totalMonthly*12),l:"Per year"}].map((s,i)=>(
          <div key={i} style={{flex:1,textAlign:"center",borderLeft:i?`1px solid ${C.border}`:"none"}}>
            <div style={{color:i===1&&remainingThisMonth>0?C.red:C.text,fontSize:16,fontWeight:800}}>{s.v}</div>
            <div style={{color:C.muted,fontSize:11,fontWeight:600,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>

    {bills.length===0&&<><EmptyState icon="📋" message="No subscriptions yet. Add Netflix, Vodafone, Spotify and more."/><Btn full onClick={openPicker} style={{marginTop:4}}>+ Add Subscription</Btn></>}

    {bills.length>0&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <MonthSelect value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} availMonths={availMonths}/>
        <Btn small onClick={openPicker}>+ Add</Btn>
      </div>

      {/* ── History (All Time): Year → Month → bills ── */}
      {isReportMode?(()=>{
        const yearsMap={};availMonths.filter(m=>m!=="all").forEach(m=>{const y=m.split("-")[0];(yearsMap[y]=yearsMap[y]||[]).push(m);});
        const years=Object.keys(yearsMap).sort().reverse();
        return <div style={{display:"flex",flexDirection:"column",gap:24,paddingBottom:40}}>
          {years.map(year=>(
            <div key={year}>
              <div style={{color:C.text,fontSize:26,fontWeight:800,marginBottom:14,borderBottom:`1px solid ${C.border}`,paddingBottom:8}}>{year}</div>
              {yearsMap[year].map(mStr=>{
                const pdCnt=bills.filter(b=>isPaid(b,mStr)).length;
                return <div key={mStr} style={{marginBottom:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{color:C.muted,fontSize:14,fontWeight:800,letterSpacing:1,textTransform:"uppercase"}}>{MONTHS[+mStr.split("-")[1]-1]}</span>
                    <Pill color={pdCnt===bills.length?C.accent:C.red}>{pdCnt}/{bills.length} Paid</Pill>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {sortForMonth(mStr).map(bill=>{const paid=isPaid(bill,mStr);const type=typeOf(bill);return (
                      <div key={bill.id} onClick={()=>openDetail(bill)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:paid?C.accentDim+"33":C.redDim+"22",border:`1px solid ${paid?C.accent:C.red}55`,borderRadius:12,cursor:"pointer"}}>
                        <ServiceLogo domain={bill.domain} name={bill.name} color={bill.color||C.accent} size={38} style={{borderRadius:11}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:C.text,fontWeight:700,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bill.name}</div>
                          <div style={{color:C.muted,fontSize:11,marginTop:2}}>{ICONS[type.icon]} {type.name}</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{color:C.text,fontSize:15,fontWeight:800}}>{fmt(bill.amount)}</div>
                          <div style={{color:paid?C.accent:C.red,fontSize:10,fontWeight:800,letterSpacing:.5,marginTop:3}}>{paid?"✓ PAID":"✕ UNPAID"}</div>
                        </div>
                      </div>
                    );})}
                  </div>
                </div>;
              })}
            </div>
          ))}
        </div>;
      })():(
        <>
          {/* ── Selected-month list, smart-sorted ── */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}>
            <div style={{color:C.text,fontSize:18,fontWeight:800}}>{filterMonth===curMonth?"Your subscriptions":`${MONTHS[+filterMonth.split("-")[1]-1]} ${filterMonth.split("-")[0]}`}</div>
            <div style={{color:C.muted,fontSize:12,fontWeight:600}}>{paidCount}/{bills.length} paid</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:40}}>
            {sortForMonth(filterMonth).map(bill=>{const paid=isPaid(bill,filterMonth);const type=typeOf(bill);const di=dueInfo(bill);return (
              <SwipeRow key={bill.id} onEdit={()=>openEdit(bill)} onDelete={()=>setConfirmDelete(bill.id)}>
                <div style={{padding:"14px",borderLeft:`4px solid ${bill.color||C.accent}`}}>
                  <div onClick={()=>openDetail(bill)} style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
                    <ServiceLogo domain={bill.domain} name={bill.name} color={bill.color||C.accent} size={46} style={{borderRadius:14}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:C.text,fontWeight:800,fontSize:16,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bill.name}</div>
                      <div style={{color:C.muted,fontSize:12,marginTop:2}}>{ICONS[type.icon]} {type.name}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{color:C.text,fontSize:18,fontWeight:800}}>{fmt(bill.amount)}</div>
                      <div style={{color:paid?C.accent:di.color,fontSize:11,fontWeight:700,marginTop:2}}>{paid?"Paid":(filterMonth===curMonth?di.text:"Unpaid")}</div>
                    </div>
                  </div>
                  {paid
                    ?<div style={{marginTop:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8,height:40,borderRadius:11,background:C.accentDim,color:C.accent,fontWeight:800,fontSize:14}}>✓ Paid · {MONTHS[+filterMonth.split("-")[1]-1]}</div>
                    :<button onClick={e=>{e.stopPropagation();handlePay(bill,filterMonth);}} style={{marginTop:12,width:"100%",height:44,borderRadius:11,background:C.accent,border:"none",color:"#111",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>Pay {fmt(bill.amount)}</button>}
                </div>
              </SwipeRow>
            );})}
          </div>
        </>
      )}
    </>}

    {confirmDelete&&<ConfirmModal title="Delete Subscription?" message="This removes it from your recurring list. Past payment transactions stay in your history." onClose={()=>setConfirmDelete(null)} onConfirm={async()=>{await onSave(bills.filter(b=>b.id!==confirmDelete));setConfirmDelete(null);}}/>}
    {confirmUndo&&<ConfirmModal title="Undo Payment?" message={`This marks "${confirmUndo.bill.name}" as unpaid for ${MONTHS[+confirmUndo.month.split("-")[1]-1]} and removes the transaction.`} confirmColor={C.yellow} onClose={()=>setConfirmUndo(null)} onConfirm={handleUndoConfirm}/>}
  </div>;
}

function InstallmentsTab({installments,onSave,banks,expCats,onAddTxn,delTxn,setAppAlert}){
  const getLocalMonth=()=>{const d=new Date();const offset=d.getTimezoneOffset()*60000;return new Date(d.getTime()-offset).toISOString().slice(0,7);};
  const curMonth=getLocalMonth();
  const monthOffset=(n)=>{const d=new Date();const m=new Date(d.getFullYear(),d.getMonth()+n,1);return `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}`;};
  const[view,setView]=useState({mode:"list"}); // list | picker | form | detail
  const[providerSearch,setProviderSearch]=useState("");
  const[form,setForm]=useState(null);
  const[detailMonth,setDetailMonth]=useState(curMonth);
  const[filterMonth,setFilterMonth]=useState(curMonth);
  const[confirmDel,setConfirmDel]=useState(null);
  const[confirmUndo,setConfirmUndo]=useState(null); // {inst,month}
  const payingRef=useRef({});
  const is=getIS();

  // Derived helpers (payments[] is the source of truth; migrate old paidInstallments count)
  const paidOf=(inst)=>inst.payments?inst.payments.length:(inst.paidInstallments||0);
  const isCompleted=(inst)=>paidOf(inst)>=inst.totalInstallments;
  const paidInMonth=(inst,m)=>!!inst.payments?.some(p=>p.month===m);
  const ensurePayments=(inst)=>{
    if(inst.payments)return inst.payments;
    const n=inst.paidInstallments||0,arr=[];
    for(let k=0;k<n;k++)arr.push({month:monthOffset(-(n-k)),date:null,txnId:null,num:k+1});
    return arr;
  };
  const dueInfo=(inst)=>{
    if(isCompleted(inst))return{text:"Completed",color:C.accent};
    if(paidInMonth(inst,curMonth))return{text:"Paid",color:C.accent};
    if(!inst.dueDay)return{text:"Due this month",color:C.muted};
    const now=new Date();const due=new Date(now.getFullYear(),now.getMonth(),inst.dueDay);
    const diff=Math.ceil((due-now)/(1000*60*60*24));
    if(diff<0)return{text:`Overdue ${Math.abs(diff)}d`,color:C.red};
    if(diff===0)return{text:"Today",color:C.red};
    if(diff===1)return{text:"Tomorrow",color:C.orange};
    if(diff<=(inst.reminderDays||2))return{text:`In ${diff} days`,color:C.yellow};
    return{text:`Day ${inst.dueDay}`,color:C.muted};
  };

  const active=installments.filter(i=>!isCompleted(i));
  const totalMonthly=active.reduce((a,i)=>a+i.installmentAmount,0);
  const totalRemaining=active.reduce((a,i)=>a+(i.totalAmount-paidOf(i)*i.installmentAmount),0);
  const dueThisMonth=active.filter(i=>!paidInMonth(i,curMonth)).reduce((a,i)=>a+i.installmentAmount,0);
  const availMonths=[...new Set([...installments.flatMap(i=>(i.payments||[]).map(p=>p.month)),curMonth])].sort().reverse();
  const isReportMode=filterMonth==="all";
  const sortForMonth=(m)=>[...installments].sort((a,b)=>{const ra=isCompleted(a)?2:paidInMonth(a,m)?1:0,rb=isCompleted(b)?2:paidInMonth(b,m)?1:0;if(ra!==rb)return ra-rb;return (a.dueDay||99)-(b.dueDay||99);});

  // ── Navigation ──
  const openPicker=()=>{setProviderSearch("");setView({mode:"picker"});};
  const blankForm=()=>({editId:null,itemType:"",company:"",domain:"",color:"",count:"",amount:"",total:"",paidInit:"0",bankId:banks[0]?.id||"",dueDay:"1",reminderDays:"2",note:"",startDate:today()});
  const pickProvider=(prov)=>{setForm({...blankForm(),company:prov.name,domain:prov.domain,color:prov.color});setView({mode:"form"});};
  const pickCustom=()=>{setForm(blankForm());setView({mode:"form"});};
  const openEdit=(inst)=>{setForm({editId:inst.id,itemType:inst.itemType||"",company:inst.company||inst.name||"",domain:inst.domain||"",color:inst.color||"",count:String(inst.totalInstallments||""),amount:String(inst.installmentAmount||""),total:String(inst.totalAmount||""),paidInit:String(paidOf(inst)),bankId:inst.bankId,dueDay:String(inst.dueDay||1),reminderDays:String(inst.reminderDays??2),note:inst.note||"",startDate:inst.startDate||today()});setView({mode:"form"});};
  const openDetail=(inst)=>{setDetailMonth(curMonth);setView({mode:"detail",instId:inst.id});};

  const setF=(k,v)=>setForm(p=>{const n={...p,[k]:v};if((k==="count"||k==="amount")){const c=parseFloat(n.count),a=parseFloat(n.amount);if(c>0&&a>0)n.total=String(Math.round(c*a*100)/100);}return n;});

  const handleSave=async()=>{
    const f=form;const count=parseInt(f.count),amount=parseFloat(f.amount);
    let total=parseFloat(f.total);if(isNaN(total)||total<=0)total=count*amount;
    const title=(f.itemType||f.company).trim();
    if(!title||isNaN(count)||count<=0||isNaN(amount)||amount<=0)return;
    const dd=Math.min(28,Math.max(1,parseInt(f.dueDay)||1)),rd=Math.min(7,Math.max(0,parseInt(f.reminderDays)||2));
    const base={itemType:f.itemType.trim(),company:f.company.trim(),domain:f.domain,color:f.color,totalInstallments:count,installmentAmount:amount,totalAmount:total,bankId:f.bankId,dueDay:dd,reminderDays:rd,note:f.note.trim(),startDate:f.startDate};
    if(f.editId){
      await onSave(installments.map(i=>{if(i.id!==f.editId)return i;const pays=ensurePayments(i);return{...i,...base,name:base.company,payments:pays,paidInstallments:pays.length,status:pays.length>=count?"completed":"active"};}));
      setView({mode:"detail",instId:f.editId});
    }else{
      const initN=Math.min(count,Math.max(0,parseInt(f.paidInit)||0));
      const payments=[];for(let k=0;k<initN;k++)payments.push({month:monthOffset(-(initN-k)),date:null,txnId:null,num:k+1});
      await onSave([...installments,{id:Date.now().toString(),...base,name:base.company,payments,paidInstallments:payments.length,status:payments.length>=count?"completed":"active"}]);
      setView({mode:"list"});
    }
    HAPTICS.success();
  };

  const handlePay=async(inst,mStr)=>{
    if(payingRef.current[inst.id])return;
    const payments=ensurePayments(inst);
    if(payments.length>=inst.totalInstallments){setAppAlert({title:"Already Complete",message:"All installments have been paid.",color:C.accent});return;}
    if(payments.some(p=>p.month===mStr)){setAppAlert({title:"Already Paid",message:`An installment is already recorded for ${MONTHS[+mStr.split("-")[1]-1]}.`,color:C.yellow});return;}
    payingRef.current[inst.id]=true;
    try{
      const bank=banks.find(b=>b.id===inst.bankId);const num=payments.length+1;const label=inst.itemType||inst.company||inst.name;
      const id=await onAddTxn({type:"expense",amount:inst.installmentAmount,date:today(),bankId:inst.bankId,bankName:bank?.name,catId:"installment",catName:"Installments",catIcon:"installment",catColor:inst.color||C.accent,note:`Installment ${num}/${inst.totalInstallments}: ${label}`});
      if(id!==false){
        const newPayments=[...payments,{month:mStr,date:today(),txnId:id,num}];
        const newStatus=newPayments.length>=inst.totalInstallments?"completed":"active";
        HAPTICS.success();await onSave(installments.map(i=>i.id===inst.id?{...i,payments:newPayments,paidInstallments:newPayments.length,status:newStatus}:i));
        if(newStatus==="completed")setAppAlert({title:"Installment Complete! 🎉",message:`"${label}" has been fully paid off!`,color:C.accent});
      }
    }finally{setTimeout(()=>{payingRef.current[inst.id]=false;},1000);}
  };
  const handleUndoConfirm=async()=>{
    if(!confirmUndo)return;const{inst,month}=confirmUndo;const payments=ensurePayments(inst);
    const p=payments.find(x=>x.month===month);if(p?.txnId)await delTxn(p.txnId);
    const newPayments=payments.filter(x=>x.month!==month);
    await onSave(installments.map(i=>i.id===inst.id?{...i,payments:newPayments,paidInstallments:newPayments.length,status:newPayments.length>=inst.totalInstallments?"completed":"active"}:i));
    setConfirmUndo(null);
  };

  const byCategory={};INSTALLMENT_PROVIDERS.forEach(p=>{(byCategory[p.category]=byCategory[p.category]||[]).push(p);});

  // ════════════ PICKER ════════════
  if(view.mode==="picker"){
    const q=providerSearch.toLowerCase();
    return <FullPage title="Add Installment" onBack={()=>setView({mode:"list"})}>
      <div style={{padding:"0 16px 40px"}}>
        <div style={{position:"relative",marginBottom:18}}>
          <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:15}}>🔍</span>
          <input placeholder="Search providers..." value={providerSearch} onChange={e=>setProviderSearch(e.target.value)} style={{...is,paddingLeft:40,borderRadius:14}}/>
        </div>
        <button onClick={pickCustom} style={{width:"100%",display:"flex",alignItems:"center",gap:12,background:C.card,border:`1.5px dashed ${C.border}`,borderRadius:16,padding:"16px",cursor:"pointer",marginBottom:24,textAlign:"left",fontFamily:"'DM Sans', sans-serif"}}>
          <div style={{width:44,height:44,borderRadius:12,background:C.accentDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>✎</div>
          <div style={{flex:1}}><div style={{color:C.text,fontWeight:800,fontSize:15}}>Custom Installment</div><div style={{color:C.muted,fontSize:12,marginTop:2}}>Loan, gam3ya, or any plan</div></div>
          <span style={{color:C.muted,fontSize:18}}>❯</span>
        </button>
        {Object.entries(byCategory).map(([cat,provs])=>{const list=provs.filter(p=>p.name.toLowerCase().includes(q));if(!list.length)return null;return (
          <div key={cat} style={{marginBottom:22}}>
            <div style={{color:C.muted,fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>{cat}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"16px 10px"}}>
              {list.map(prov=>(
                <button key={prov.id} onClick={()=>pickProvider(prov)} style={{background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8,fontFamily:"'DM Sans', sans-serif",padding:0}}>
                  <ServiceLogo domain={prov.domain} name={prov.name} color={prov.color} size={56} style={{borderRadius:16}}/>
                  <span style={{color:C.text,fontSize:11,fontWeight:600,textAlign:"center",lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{prov.name}</span>
                </button>
              ))}
            </div>
          </div>
        );})}
      </div>
    </FullPage>;
  }

  // ════════════ FORM ════════════
  if(view.mode==="form"&&form){
    const f=form;const accent=f.color||C.accent;
    const count=parseInt(f.count)||0,amount=parseFloat(f.amount)||0;
    const computedTotal=parseFloat(f.total)||(count*amount);
    const valid=(f.itemType||f.company).trim()&&count>0&&amount>0;
    const lbl={color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8,display:"block"};
    return <FullPage title={f.editId?"Edit Installment":"New Installment"} onBack={()=>setView(f.editId?{mode:"detail",instId:f.editId}:{mode:"picker"})}>
      <div style={{padding:"4px 16px 48px"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:24}}>
          <ServiceLogo domain={f.domain} name={f.company||f.itemType||"?"} color={accent} size={72} style={{borderRadius:20}}/>
        </div>
        <div style={{marginBottom:20}}><label style={lbl}>What is it?</label><input value={f.itemType} onChange={e=>setF("itemType",e.target.value)} placeholder="e.g. iPhone 15, Car, Sofa..." style={{...is,borderRadius:14}}/></div>
        <div style={{marginBottom:20}}><label style={lbl}>Company / Place</label><input value={f.company} onChange={e=>setF("company",e.target.value)} placeholder="e.g. ValU, B.TECH, dealership..." style={{...is,borderRadius:14}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:8}}>
          <div><label style={lbl}>No. of Installments</label><input type="number" min="1" inputMode="numeric" value={f.count} onChange={e=>setF("count",e.target.value)} placeholder="12" style={{...is,borderRadius:14}}/></div>
          <div><label style={lbl}>Installment Amount</label><input type="number" step="any" inputMode="decimal" value={f.amount} onChange={e=>setF("amount",e.target.value)} placeholder="0" style={{...is,borderRadius:14}}/></div>
        </div>
        <div style={{marginBottom:20}}>
          <label style={lbl}>Total Amount (auto · editable)</label>
          <input type="number" step="any" inputMode="decimal" value={f.total} onChange={e=>setF("total",e.target.value)} placeholder={String(computedTotal||0)} style={{...is,borderRadius:14,fontWeight:800}}/>
          {count>0&&amount>0&&<div style={{color:C.muted,fontSize:11,marginTop:6}}>{count} × {fmt(amount)} = {fmt(count*amount)}</div>}
        </div>
        {!f.editId&&<div style={{marginBottom:20}}><label style={lbl}>Already Paid (installments)</label><input type="number" min="0" inputMode="numeric" value={f.paidInit} onChange={e=>setF("paidInit",e.target.value)} style={{...is,borderRadius:14}}/><div style={{color:C.faint,fontSize:11,marginTop:6}}>Installments paid before adding here (no transaction created).</div></div>}
        <div style={{marginBottom:20}}><label style={lbl}>Pay from Account</label><select value={f.bankId} onChange={e=>setF("bankId",e.target.value)} style={{...is,borderRadius:14}}>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          <div><label style={lbl}>Due Day</label><input type="number" min="1" max="28" inputMode="numeric" value={f.dueDay} onChange={e=>setF("dueDay",e.target.value)} style={{...is,borderRadius:14}}/></div>
          <div><label style={lbl}>Remind Before (days)</label><input type="number" min="0" max="7" inputMode="numeric" value={f.reminderDays} onChange={e=>setF("reminderDays",e.target.value)} style={{...is,borderRadius:14}}/></div>
        </div>
        <div style={{marginBottom:20}}><label style={lbl}>Start Date</label><input type="date" value={f.startDate} onChange={e=>setF("startDate",e.target.value)} style={{...is,borderRadius:14,colorScheme:C.isDark?"dark":"light"}}/></div>
        <div style={{marginBottom:28}}><label style={lbl}>Note (optional)</label><input value={f.note} onChange={e=>setF("note",e.target.value)} placeholder="e.g. 0% interest" style={{...is,borderRadius:14}}/></div>
        <Btn full onClick={handleSave} color={accent} style={{opacity:valid?1:0.5,pointerEvents:valid?"auto":"none",borderRadius:14,padding:"15px"}}>{f.editId?"Save Changes":"Add Installment"}</Btn>
      </div>
    </FullPage>;
  }

  // ════════════ DETAIL ════════════
  if(view.mode==="detail"){
    const inst=installments.find(i=>i.id===view.instId);
    if(!inst)return <FullPage title="Installment" onBack={()=>setView({mode:"list"})}><EmptyState icon="💳" message="This plan was removed."/></FullPage>;
    const accent=inst.color||C.accent;const bank=banks.find(b=>b.id===inst.bankId);
    const paid=paidOf(inst);const pct=Math.round((paid/inst.totalInstallments)*100);
    const remaining=inst.totalAmount-paid*inst.installmentAmount;
    const title=inst.itemType||inst.company||inst.name;
    const payments=inst.payments||ensurePayments(inst);
    const paidThisMonth=paidInMonth(inst,detailMonth);
    const recent12=[];for(let i=0;i<12;i++)recent12.push(monthOffset(-i));
    const dAvail=[...new Set([...payments.map(p=>p.month),...recent12])].sort().reverse();
    const grad=C.isDark?`linear-gradient(160deg,${accent}33 0%,${C.card} 70%)`:`linear-gradient(160deg,${accent}22 0%,${C.surface} 70%)`;
    const rowStyle={display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderBottom:`1px solid ${C.border}`};
    return <FullPage title={title} onBack={()=>setView({mode:"list"})} right={
      <button onClick={()=>openEdit(inst)} style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>✎ Edit</button>
    }>
      <div style={{padding:"0 16px 48px"}}>
        <div style={{background:grad,border:`1px solid ${C.border}`,borderRadius:22,padding:"24px 20px",textAlign:"center",marginBottom:16}}>
          <ServiceLogo domain={inst.domain} name={inst.company||title} color={accent} size={64} style={{borderRadius:18,margin:"0 auto 12px"}}/>
          <div style={{color:C.text,fontSize:21,fontWeight:800}}>{title}</div>
          {inst.company&&inst.itemType&&<div style={{color:C.muted,fontSize:13,fontWeight:600,marginTop:2}}>{inst.company}</div>}
          <div style={{color:C.text,fontSize:30,fontWeight:800,letterSpacing:-1,marginTop:10}}>{fmt(inst.installmentAmount)}<span style={{fontSize:14,color:C.muted,fontWeight:600}}> /mo</span></div>
          <div style={{marginTop:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:C.muted,fontSize:12,fontWeight:700}}>{paid} of {inst.totalInstallments} paid</span><span style={{color:accent,fontSize:12,fontWeight:800}}>{pct}%</span></div>
            <ProgressBar value={paid} max={inst.totalInstallments} color={pct>=90?C.accent:accent}/>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
          <Card style={{padding:"14px 10px",textAlign:"center"}}><div style={{color:C.text,fontSize:15,fontWeight:800}}>{fmt(inst.totalAmount)}</div><div style={{color:C.muted,fontSize:10,fontWeight:700,marginTop:4}}>Total</div></Card>
          <Card style={{padding:"14px 10px",textAlign:"center"}}><div style={{color:C.accent,fontSize:15,fontWeight:800}}>{fmt(paid*inst.installmentAmount)}</div><div style={{color:C.muted,fontSize:10,fontWeight:700,marginTop:4}}>Paid</div></Card>
          <Card style={{padding:"14px 10px",textAlign:"center"}}><div style={{color:C.yellow,fontSize:15,fontWeight:800}}>{fmt(remaining)}</div><div style={{color:C.muted,fontSize:10,fontWeight:700,marginTop:4}}>Remaining</div></Card>
        </div>

        <Card style={{padding:"4px 16px",marginBottom:16}}>
          {inst.itemType&&<div style={rowStyle}><span style={{color:C.muted,fontSize:13,fontWeight:600}}>Item</span><span style={{color:C.text,fontSize:14,fontWeight:700}}>{inst.itemType}</span></div>}
          {inst.company&&<div style={rowStyle}><span style={{color:C.muted,fontSize:13,fontWeight:600}}>Company</span><span style={{color:C.text,fontSize:14,fontWeight:700}}>{inst.company}</span></div>}
          <div style={rowStyle}><span style={{color:C.muted,fontSize:13,fontWeight:600}}>Pay from</span><span style={{color:C.text,fontSize:14,fontWeight:700}}>{bank?.name||"—"}</span></div>
          <div style={rowStyle}><span style={{color:C.muted,fontSize:13,fontWeight:600}}>Due day</span><span style={{color:C.text,fontSize:14,fontWeight:700}}>Day {inst.dueDay||1} of month</span></div>
          <div style={{...rowStyle,borderBottom:inst.note?`1px solid ${C.border}`:"none"}}><span style={{color:C.muted,fontSize:13,fontWeight:600}}>Reminder</span><span style={{color:C.text,fontSize:14,fontWeight:700}}>{(inst.reminderDays??2)===0?"Off":`${inst.reminderDays??2} day(s) before`}</span></div>
          {inst.note&&<div style={{...rowStyle,borderBottom:"none"}}><span style={{color:C.muted,fontSize:13,fontWeight:600}}>Note</span><span style={{color:C.text,fontSize:14,fontWeight:700,maxWidth:"60%",textAlign:"right"}}>{inst.note}</span></div>}
        </Card>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{color:C.muted,fontSize:11,fontWeight:800,letterSpacing:1,textTransform:"uppercase"}}>Record a Month</span>
          <MonthSelect value={detailMonth} onChange={e=>setDetailMonth(e.target.value==="all"?curMonth:e.target.value)} availMonths={dAvail}/>
        </div>
        {isCompleted(inst)?(
          <div style={{background:C.accentDim,color:C.accent,borderRadius:14,height:50,fontSize:15,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:24}}>🎉 Fully paid off</div>
        ):paidThisMonth?(
          <div style={{display:"flex",gap:8,marginBottom:24}}>
            <div style={{flex:1,background:C.accent,color:"#111",borderRadius:14,height:50,fontSize:15,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>✓ Paid {MONTHS[+detailMonth.split("-")[1]-1]}</div>
            <button onClick={()=>setConfirmUndo({inst,month:detailMonth})} style={{flexShrink:0,background:C.yellowDim,border:`1.5px solid ${C.yellow}`,color:C.yellow,borderRadius:14,height:50,padding:"0 20px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>⟲ Undo</button>
          </div>
        ):(
          <button onClick={()=>handlePay(inst,detailMonth)} style={{width:"100%",background:accent,border:"none",color:"#111",borderRadius:14,height:52,fontWeight:800,fontSize:16,cursor:"pointer",marginBottom:24,fontFamily:"'DM Sans', sans-serif"}}>✓ Pay Installment #{paid+1} ({MONTHS[+detailMonth.split("-")[1]-1]})</button>
        )}

        <div style={{color:C.muted,fontSize:11,fontWeight:800,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Schedule</div>
        <Card style={{padding:"4px 16px",marginBottom:24}}>
          {Array.from({length:inst.totalInstallments}).map((_,idx)=>{
            const num=idx+1;const p=payments.find(x=>x.num===num)||payments[idx];const done=idx<paid;
            return <div key={num} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:idx===inst.totalInstallments-1?"none":`1px solid ${C.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:24,height:24,borderRadius:99,background:done?C.accent:C.border,color:done?"#111":C.muted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{done?"✓":num}</div>
                <span style={{color:done?C.text:C.muted,fontSize:13,fontWeight:600}}>{done&&p?.month?`${MONTHS[+p.month.split("-")[1]-1]} ${p.month.split("-")[0]}`:done?"Paid":`Installment ${num}`}</span>
              </div>
              <span style={{color:done?C.accent:C.muted,fontSize:13,fontWeight:700}}>{done?"✓ ":""}{fmt(inst.installmentAmount)}</span>
            </div>;
          })}
        </Card>

        <Btn full outline color={C.red} onClick={()=>setConfirmDel(inst.id)} style={{borderRadius:14}}>🗑 Delete Installment</Btn>
      </div>
      {confirmDel&&<ConfirmModal title="Delete Installment?" message="This removes the plan. Past payment transactions stay in your history." onClose={()=>setConfirmDel(null)} onConfirm={async()=>{await onSave(installments.filter(i=>i.id!==confirmDel));setConfirmDel(null);setView({mode:"list"});}}/>}
      {confirmUndo&&<ConfirmModal title="Undo Payment?" message={`This removes the installment recorded for ${MONTHS[+confirmUndo.month.split("-")[1]-1]} and its transaction.`} confirmColor={C.yellow} onClose={()=>setConfirmUndo(null)} onConfirm={handleUndoConfirm}/>}
    </FullPage>;
  }

  // ════════════ LIST ════════════
  return <div>
    <div style={{background:C.isDark?`linear-gradient(160deg,${C.purpleDim} 0%,${C.card} 80%)`:`linear-gradient(160deg,${C.purpleDim} 0%,${C.surface} 90%)`,border:`1px solid ${C.border}`,borderRadius:20,padding:"20px",marginBottom:20}}>
      <div style={{color:C.muted,fontSize:12,fontWeight:700,letterSpacing:.5,marginBottom:4}}>Due this month · {MONTHS[+curMonth.split("-")[1]-1]}</div>
      <div style={{color:C.text,fontSize:38,fontWeight:800,letterSpacing:-1.5,marginBottom:16}}>{fmt(dueThisMonth)}</div>
      <div style={{display:"flex",background:C.isDark?"#ffffff10":"#00000008",borderRadius:14,padding:"12px 0"}}>
        {[{v:active.length,l:"Active plans"},{v:fmt(totalMonthly),l:"Monthly"},{v:fmt(totalRemaining),l:"Remaining"}].map((s,i)=>(
          <div key={i} style={{flex:1,textAlign:"center",borderLeft:i?`1px solid ${C.border}`:"none"}}>
            <div style={{color:C.text,fontSize:16,fontWeight:800}}>{s.v}</div>
            <div style={{color:C.muted,fontSize:11,fontWeight:600,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>

    {installments.length===0&&<><EmptyState icon="💳" message="No installment plans yet. Add your BNPL, loan, or any plan."/><Btn full onClick={openPicker} style={{marginTop:4}}>+ Add Installment</Btn></>}

    {installments.length>0&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <MonthSelect value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} availMonths={availMonths}/>
        <Btn small onClick={openPicker}>+ Add</Btn>
      </div>

      {isReportMode?(()=>{
        const yearsMap={};availMonths.filter(m=>m!=="all").forEach(m=>{const y=m.split("-")[0];(yearsMap[y]=yearsMap[y]||[]).push(m);});
        const years=Object.keys(yearsMap).sort().reverse();
        return <div style={{display:"flex",flexDirection:"column",gap:24,paddingBottom:40}}>
          {years.map(year=>(
            <div key={year}>
              <div style={{color:C.text,fontSize:26,fontWeight:800,marginBottom:14,borderBottom:`1px solid ${C.border}`,paddingBottom:8}}>{year}</div>
              {yearsMap[year].map(mStr=>{
                const paidThis=installments.filter(i=>paidInMonth(i,mStr));
                if(!paidThis.length)return null;
                const monthTotal=paidThis.reduce((a,i)=>a+i.installmentAmount,0);
                return <div key={mStr} style={{marginBottom:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{color:C.muted,fontSize:14,fontWeight:800,letterSpacing:1,textTransform:"uppercase"}}>{MONTHS[+mStr.split("-")[1]-1]}</span>
                    <Pill color={C.accent}>{fmt(monthTotal)}</Pill>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {paidThis.map(inst=>{const p=inst.payments.find(x=>x.month===mStr);return (
                      <div key={inst.id} onClick={()=>openDetail(inst)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:C.accentDim+"33",border:`1px solid ${C.accent}55`,borderRadius:12,cursor:"pointer"}}>
                        <ServiceLogo domain={inst.domain} name={inst.company||inst.itemType} color={inst.color||C.accent} size={38} style={{borderRadius:11}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:C.text,fontWeight:700,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inst.itemType||inst.company}</div>
                          <div style={{color:C.muted,fontSize:11,marginTop:2}}>Installment #{p?.num||"?"} / {inst.totalInstallments}</div>
                        </div>
                        <div style={{color:C.accent,fontSize:14,fontWeight:800}}>✓ {fmt(inst.installmentAmount)}</div>
                      </div>
                    );})}
                  </div>
                </div>;
              })}
            </div>
          ))}
        </div>;
      })():(
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}>
            <div style={{color:C.text,fontSize:18,fontWeight:800}}>{filterMonth===curMonth?"Your installments":`${MONTHS[+filterMonth.split("-")[1]-1]} ${filterMonth.split("-")[0]}`}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:40}}>
            {sortForMonth(filterMonth).map(inst=>{
              const done=isCompleted(inst);const paidM=paidInMonth(inst,filterMonth);const paid=paidOf(inst);
              const pct=Math.round((paid/inst.totalInstallments)*100);const di=dueInfo(inst);
              const remaining=inst.totalAmount-paid*inst.installmentAmount;
              return <SwipeRow key={inst.id} onEdit={()=>openEdit(inst)} onDelete={()=>setConfirmDel(inst.id)}>
                <div style={{padding:"14px",borderLeft:`4px solid ${inst.color||C.accent}`}}>
                  <div onClick={()=>openDetail(inst)} style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
                    <ServiceLogo domain={inst.domain} name={inst.company||inst.itemType} color={inst.color||C.accent} size={46} style={{borderRadius:14}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:C.text,fontWeight:800,fontSize:16,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inst.itemType||inst.company}</div>
                      <div style={{color:C.muted,fontSize:12,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inst.company&&inst.itemType?inst.company+" · ":""}{fmt(inst.installmentAmount)}/mo</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{color:C.text,fontSize:15,fontWeight:800}}>{fmt(remaining)}</div>
                      <div style={{color:C.muted,fontSize:10,fontWeight:600,marginTop:2}}>left to pay</div>
                    </div>
                  </div>
                  <div style={{marginTop:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{color:C.muted,fontSize:11,fontWeight:700}}>{paid} of {inst.totalInstallments} paid</span>
                      <span style={{color:done?C.accent:di.color,fontSize:11,fontWeight:700}}>{done?`${pct}%`:(filterMonth===curMonth&&!paidM?di.text:`${pct}%`)}</span>
                    </div>
                    <ProgressBar value={paid} max={inst.totalInstallments} color={pct>=90?C.accent:(inst.color||C.blue)}/>
                  </div>
                  {done
                    ?<div style={{marginTop:12,height:42,borderRadius:11,background:C.accentDim,color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:800,fontSize:14}}>🎉 Completed</div>
                    :paidM
                      ?<div style={{marginTop:12,height:42,borderRadius:11,background:C.accentDim,color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:800,fontSize:14}}>✓ Paid · {MONTHS[+filterMonth.split("-")[1]-1]}</div>
                      :<button onClick={e=>{e.stopPropagation();handlePay(inst,filterMonth);}} style={{marginTop:12,width:"100%",height:44,borderRadius:11,background:inst.color||C.accent,border:"none",color:"#111",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>Pay installment #{paid+1} · {fmt(inst.installmentAmount)}</button>}
                </div>
              </SwipeRow>;
            })}
          </div>
        </>
      )}
    </>}

    {confirmDel&&<ConfirmModal title="Delete Installment?" message="This removes the plan. Past payment transactions stay in your history." onClose={()=>setConfirmDel(null)} onConfirm={async()=>{await onSave(installments.filter(i=>i.id!==confirmDel));setConfirmDel(null);}}/>}
    {confirmUndo&&<ConfirmModal title="Undo Payment?" message={`This removes the installment recorded for ${MONTHS[+confirmUndo.month.split("-")[1]-1]} and its transaction.`} confirmColor={C.yellow} onClose={()=>setConfirmUndo(null)} onConfirm={handleUndoConfirm}/>}
  </div>;
}

function Settings({banks,expCats,incCats,groups,onBanks,onExpCats,onIncCats,onGroups,currency,onCurrency,username,onUsername,theme,onTheme,bankBalance,safeToSpend,frozenForBank,onOpenSavings,onOpenBudgets,onOpenQuickActions,onOpenManual,setLastBackup,txns,bills,installments,savings,budgets,onRestore,setAppAlert,navigateTo}){
  useEffect(()=>{window.scrollTo(0,0);},[]);
  const[section,setSection]=useState("profile");const[modal,setModal]=useState(null);const[catTab,setCatTab]=useState("expense");
  const[iN,setIN]=useState("");const[iC,setIC]=useState(C.accent);const[iG,setIG]=useState("daily");const[iIcon,setIIcon]=useState("others");const[gCats,setGCats]=useState([]);const[iT,setIT]=useState("");
  const[iGlyph,setIGlyph]=useState("");const[iEmoji,setIEmoji]=useState("");
  const[nameInput,setNameInput]=useState(username||"");const[confirmDel,setConfirmDel]=useState(null);const[showRestoreConfirm,setShowRestoreConfirm]=useState(false);const[pendingRestore,setPendingRestore]=useState(null);
  const fileRef=useRef(null);
  const openAdd=(type,item=null)=>{
    setModal({type,item});setIN(item?.name||"");setIG(item?.group||"daily");setIIcon(item?.icon||"others");setGCats(item?.cats||[]);setIT(item?.lowBalanceThreshold?String(item.lowBalanceThreshold):"");
    const isCat=type==="expCat"||type==="incCat";
    setIC(item?.color||(type==="bank"?C.accent:isCat||type==="group"?hashColor(item?.id||Math.random()):C.accent));
    // Migrate legacy emoji-key icon to a raw emoji so it stays visible/editable
    const legacyEmoji=item&&!item.glyph&&!item.emoji&&item.icon?(ICONS[item.icon]||""):"";
    setIGlyph(item?.glyph||(item?"":(type==="incCat"?"wallet":type==="group"?"folder":"shopping-cart")));
    setIEmoji(item?.emoji||legacyEmoji);
  };
  const handleSave=async()=>{
    if(!iN.trim())return;const id=modal.item?.id||Date.now().toString();
    const thresh=parseFloat(iT),tv=!isNaN(thresh)&&thresh>0?thresh:undefined;
    const catFields={name:iN.trim(),glyph:iGlyph||undefined,emoji:iEmoji||undefined,color:iC,icon:undefined};
    if(modal.type==="bank")await onBanks(modal.item?banks.map(b=>b.id===id?{id,name:iN,color:iC,lowBalanceThreshold:tv}:b):[...banks,{id,name:iN,color:iC,lowBalanceThreshold:tv}]);
    else if(modal.type==="expCat")await onExpCats(modal.item?expCats.map(c=>c.id===id?{...c,...catFields,group:iG}:c):[...expCats,{id,...catFields,group:iG}]);
    else if(modal.type==="incCat")await onIncCats(modal.item?incCats.map(c=>c.id===id?{...c,...catFields}:c):[...incCats,{id,...catFields}]);
    else if(modal.type==="group")await onGroups(modal.item?groups.map(g=>g.id===id?{id,name:iN,color:iC,glyph:iGlyph||undefined,cats:gCats}:g):[...groups,{id,name:iN,color:iC,glyph:iGlyph||undefined,cats:gCats}]);
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
    const data={txns,banks,expCats,incCats,groups,savings,bills,installments,budgets,currency,username};
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
      {[{id:"profile",label:"👤 General"},{id:"banks",label:"🏦 Accounts"},{id:"categories",label:"🏷️ Categories"},{id:"preferences",label:"⚙️ Preferences"}].map(s=><button key={s.id} onClick={()=>setSection(s.id)} style={{whiteSpace:"nowrap",padding:"12px 18px",borderRadius:12,border:`1px solid ${section===s.id?C.accent:C.border}`,background:section===s.id?C.accentDim:"transparent",color:section===s.id?C.accent:C.muted,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>{s.label}</button>)}
    </div>

    {section==="preferences"&&<div style={{paddingBottom:20}}>
      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Color Theme</div>
      <div style={{display:"flex",gap:10,marginBottom:28}}>
        {[{id:"dark",label:"🌙 Dark",desc:"Dark mode"},{id:"light",label:"☀️ Light",desc:"Light mode"}].map(t=>(
          <button key={t.id} onClick={()=>onTheme(t.id)} style={{flex:1,padding:"16px",borderRadius:14,border:`2px solid ${theme===t.id?C.accent:C.border}`,background:theme===t.id?C.accentDim:C.card,cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans', sans-serif"}}>
            <div style={{fontSize:20,marginBottom:6}}>{t.label.split(" ")[0]}</div>
            <div style={{color:theme===t.id?C.accent:C.text,fontWeight:700,fontSize:14}}>{t.label.split(" ")[1]}</div>
            <div style={{color:C.muted,fontSize:11,marginTop:2}}>{t.desc}</div>
            {theme===t.id&&<div style={{color:C.accent,fontSize:12,fontWeight:800,marginTop:6}}>✓ Active</div>}
          </button>
        ))}
      </div>
      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Currency</div>
      <div style={{background:C.yellowDim,border:`1px solid ${C.yellow}44`,borderRadius:12,padding:"12px 14px",marginBottom:10}}><span style={{color:C.yellow,fontSize:12,fontWeight:600}}>⚠️ Changing currency only changes display. Numbers are not converted.</span></div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {CURRENCIES.map(cur=><button key={cur.code} onClick={()=>onCurrency(cur.code)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:currency===cur.code?C.accentDim:C.card,border:`1.5px solid ${currency===cur.code?C.accent:C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans', sans-serif"}}><div><div style={{color:currency===cur.code?C.accent:C.text,fontWeight:700,fontSize:15}}>{cur.code}</div><div style={{color:C.muted,fontSize:12,marginTop:2}}>{cur.name}</div></div>{currency===cur.code&&<span style={{color:C.accent,fontSize:20}}>✓</span>}</button>)}
      </div>
    </div>}

    {section==="profile"&&<div style={{paddingBottom:20}}>
      {[{icon:"◎",color:C.yellow,label:"Savings Goals",cb:onOpenSavings},{icon:"📊",color:C.accent,label:"Monthly Budgets",cb:onOpenBudgets},{icon:"⚡",color:C.blue,label:"Quick Actions",cb:onOpenQuickActions}].map(item=><div key={item.label} onClick={item.cb} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18,color:item.color}}>{item.icon}</span><span style={{color:C.text,fontWeight:600,fontSize:14}}>{item.label}</span></div><span style={{color:C.muted}}>❯</span></div>)}
      <Card style={{marginBottom:16}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Your Name</div><input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Enter name..." style={{...is,marginBottom:12}}/><Btn full onClick={()=>{onUsername(nameInput.trim());setAppAlert({title:"Profile Updated",message:"Name updated!",color:C.accent});}}>Save Name</Btn></Card>
      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Backup & Restore</div>
      <Card style={{marginBottom:16}}><p style={{color:C.muted,fontSize:12,marginBottom:14,lineHeight:1.4}}>Download a backup or restore from a previous file.</p><div style={{display:"flex",gap:10,width:"100%"}}><Btn style={{flex:1,padding:"11px 5px"}} onClick={handleBackup} color={C.blue}>⬇️ Backup</Btn><Btn style={{flex:1,padding:"11px 5px"}} onClick={()=>fileRef.current.click()} color={C.purple} outline>⬆️ Restore</Btn></div><input type="file" ref={fileRef} accept=".json" onChange={handleFileChange} style={{display:"none"}}/></Card>
      <AppFooter navigateTo={navigateTo}/>
    </div>}

    {section==="banks"&&<><div style={{display:"flex",flexDirection:"column"}}>
      {banks.map(b=><SwipeRow key={b.id} onEdit={()=>openAdd("bank",b)} onDelete={()=>{const err=getBankDeleteError(b);if(err)setAppAlert({title:"Cannot Delete",message:err,color:C.red});else setConfirmDel({type:"bank",item:b});}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:10,height:10,borderRadius:99,background:b.color}}/><span style={{color:C.text,fontWeight:600,fontSize:14}}>{b.name}</span></div>
          <div style={{textAlign:"right"}}><div style={{color:bankBalance(b.id)<0?C.red:C.muted,fontSize:13,fontWeight:700}}>{fmt(safeToSpend(b.id))}</div>{frozenForBank(b.id)>0&&<div style={{color:C.yellow,fontSize:10,marginTop:2}}>🔒 {fmt(frozenForBank(b.id))} frozen</div>}</div>
        </div>
      </SwipeRow>)}
    </div><Btn outline full onClick={()=>openAdd("bank")} style={{marginTop:8}}>+ Add Account</Btn></>}

    {section==="categories"&&<>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        {[{id:"expense",label:"↑ Expense"},{id:"income",label:"↓ Income"},{id:"groups",label:"⇄ Groups"}].map(t=><button key={t.id} onClick={()=>setCatTab(t.id)} style={{flex:1,padding:"10px 0",borderRadius:11,border:`1.5px solid ${catTab===t.id?C.accent:C.border}`,background:catTab===t.id?C.accentDim:"transparent",color:catTab===t.id?C.accent:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>{t.label}</button>)}
      </div>

      {catTab==="expense"&&<><div style={{display:"flex",flexDirection:"column",gap:8}}>{expCats.map(c=><SwipeRow key={c.id} onEdit={()=>openAdd("expCat",c)} onDelete={()=>setConfirmDel({type:"expCat",item:c})}><div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px"}}><CatIcon cat={c} size={40}/><div style={{flex:1,minWidth:0}}><div style={{color:C.text,fontWeight:700,fontSize:15}}>{c.name}</div><div style={{color:C.muted,fontSize:11,marginTop:2,textTransform:"capitalize"}}>{c.group||"other"}</div></div></div></SwipeRow>)}</div><Btn outline full onClick={()=>openAdd("expCat")} style={{marginTop:12}}>+ Add Expense Category</Btn></>}

      {catTab==="income"&&<><div style={{display:"flex",flexDirection:"column",gap:8}}>{incCats.map(c=><SwipeRow key={c.id} onEdit={()=>openAdd("incCat",c)} onDelete={()=>setConfirmDel({type:"incCat",item:c})}><div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px"}}><CatIcon cat={c} size={40}/><div style={{flex:1,minWidth:0}}><div style={{color:C.text,fontWeight:700,fontSize:15}}>{c.name}</div></div></div></SwipeRow>)}</div><Btn outline full onClick={()=>openAdd("incCat")} style={{marginTop:12}}>+ Add Income Category</Btn></>}

      {catTab==="groups"&&<><div style={{color:C.muted,fontSize:12,marginBottom:12,lineHeight:1.5}}>Groups bundle expense categories together for spending insights on your dashboard.</div><div style={{display:"flex",flexDirection:"column",gap:8}}>{groups.map(g=><SwipeRow key={g.id} onEdit={()=>openAdd("group",g)} onDelete={()=>setConfirmDel({type:"group",item:g})}><div style={{padding:"12px 14px"}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><CatIcon glyph={g.glyph} color={g.color} name={g.name} size={30} style={{borderRadius:9}}/><span style={{color:C.text,fontWeight:700,fontSize:15}}>{g.name}</span></div><div style={{display:"flex",flexWrap:"wrap",gap:5,paddingLeft:2}}>{g.cats.map(cid=>{const cat=expCats.find(c=>c.id===cid);return cat?<span key={cid} style={{background:g.color+"22",color:g.color,border:`1px solid ${g.color}44`,borderRadius:99,padding:"2px 8px",fontSize:11,fontWeight:700}}>{cat.name}</span>:null;})}</div></div></SwipeRow>)}</div><Btn outline full onClick={()=>openAdd("group")} style={{marginTop:12}}>+ Add Group</Btn></>}
    </>}

    {modal&&<Modal title={`${modal.item?"Edit":"Add"} ${modal.type==="bank"?"Account":modal.type==="expCat"?"Expense Cat.":modal.type==="incCat"?"Income Cat.":"Group"}`} onClose={()=>setModal(null)} center={false}>
      <Input label="Name" value={iN} onChange={e=>setIN(e.target.value)}/>
      {modal.type==="bank"&&<><div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Color</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[C.accent,C.red,C.blue,C.yellow,C.purple,"#fb923c","#34d399","#f472b6"].map(col=><button key={col} onClick={()=>setIC(col)} style={{width:28,height:28,borderRadius:99,background:col,border:iC===col?"3px solid white":"3px solid transparent",cursor:"pointer"}}/>)}</div></div><div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Low Balance Alert</div><input type="number" min="0" placeholder="e.g. 200" value={iT} onChange={e=>setIT(e.target.value)} style={is}/><div style={{color:C.faint,fontSize:11,marginTop:4}}>Show 🔻 below this (0 = off)</div></div></>}
      {(modal.type==="expCat"||modal.type==="incCat")&&<>
        <div style={{display:"flex",justifyContent:"center",marginBottom:18,marginTop:4}}>
          <CatIcon glyph={iEmoji?"":iGlyph} emoji={iEmoji} color={iC} name={iN} size={72} style={{borderRadius:20}}/>
        </div>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Icon</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8,maxHeight:168,overflowY:"auto",marginBottom:14,padding:4,background:C.bg,borderRadius:10,border:`1px solid ${C.border}`}}>
          {(modal.type==="incCat"?CAT_GLYPHS_INC:CAT_GLYPHS_EXP).map(k=>{const on=iGlyph===k&&!iEmoji;return <button key={k} onClick={()=>{setIGlyph(k);setIEmoji("");}} style={{height:38,borderRadius:9,background:on?C.accentDim:C.card,border:`1px solid ${on?C.accent:C.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={on?C.accent:C.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{__html:CAT_GLYPHS[k]}}/></button>;})}
        </div>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Or use your own emoji</div>
        <input value={iEmoji} onChange={e=>{const v=e.target.value.slice(-4);setIEmoji(v);if(v)setIGlyph("");}} placeholder="🙂 tap and pick an emoji" style={{...is,marginBottom:14}}/>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Color</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
          {CAT_PALETTE.map(col=><button key={col} onClick={()=>setIC(col)} style={{width:32,height:32,borderRadius:99,background:col,border:iC===col?`3px solid ${C.text}`:`3px solid transparent`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{iC===col&&<span style={{color:_lum(col)>0.7?"#111":"#fff",fontSize:14,fontWeight:800}}>✓</span>}</button>)}
          <label style={{width:32,height:32,borderRadius:99,border:`2px dashed ${C.faint}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}><span style={{fontSize:15}}>🎨</span><input type="color" value={iC} onChange={e=>setIC(e.target.value)} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer"}}/></label>
        </div>
      </>}
      {modal.type==="expCat"&&<Select label="Group Tag" value={iG} onChange={e=>setIG(e.target.value)}>{["daily","fixed","lifestyle","growth","other"].map(g=><option key={g} value={g}>{g}</option>)}</Select>}
      {modal.type==="group"&&<>
        <div style={{display:"flex",justifyContent:"center",marginBottom:18,marginTop:4}}><CatIcon glyph={iGlyph} color={iC} name={iN} size={72} style={{borderRadius:20}}/></div>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Icon</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8,maxHeight:130,overflowY:"auto",marginBottom:14,padding:4,background:C.bg,borderRadius:10,border:`1px solid ${C.border}`}}>
          {CAT_GLYPHS_GROUP.map(k=>{const on=iGlyph===k;return <button key={k} onClick={()=>setIGlyph(k)} style={{height:38,borderRadius:9,background:on?C.accentDim:C.card,border:`1px solid ${on?C.accent:C.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={on?C.accent:C.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{__html:CAT_GLYPHS[k]}}/></button>;})}
        </div>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Color</div><div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>{CAT_PALETTE.map(col=><button key={col} onClick={()=>setIC(col)} style={{width:32,height:32,borderRadius:99,background:col,border:iC===col?`3px solid ${C.text}`:`3px solid transparent`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{iC===col&&<span style={{color:_lum(col)>0.7?"#111":"#fff",fontSize:14,fontWeight:800}}>✓</span>}</button>)}<label style={{width:32,height:32,borderRadius:99,border:`2px dashed ${C.faint}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}><span style={{fontSize:15}}>🎨</span><input type="color" value={iC} onChange={e=>setIC(e.target.value)} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer"}}/></label></div><div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Categories</div><div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:200,overflow:"auto",background:C.bg,padding:10,borderRadius:10,border:`1px solid ${C.border}`}}>{expCats.map(c=>{const ch=gCats.includes(c.id);return <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"4px 0",userSelect:"none"}}><div onClick={()=>setGCats(ch?gCats.filter(x=>x!==c.id):[...gCats,c.id])} style={{width:18,height:18,borderRadius:4,border:`2px solid ${ch?C.accent:C.faint}`,background:ch?C.accentDim:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{ch&&<span style={{color:C.accent,fontSize:12}}>✓</span>}</div><CatIcon cat={c} size={24}/><span style={{color:C.text,fontSize:14}}>{c.name}</span></label>;})}</div></div></>}
      <Btn full onClick={handleSave} style={{marginTop:8}}>Save</Btn>
    </Modal>}
    {confirmDel&&<ConfirmModal title="Delete?" message="This action cannot be undone." onClose={()=>setConfirmDel(null)} onConfirm={doDelete}/>}
    {showRestoreConfirm&&<ConfirmModal title="Restore Backup?" message="⚠️ This will overwrite ALL your current data with the backup file.\n\nThis cannot be undone. Are you sure?" confirmColor={C.purple} onClose={()=>{setShowRestoreConfirm(false);setPendingRestore(null);}} onConfirm={async()=>{setShowRestoreConfirm(false);await onRestore(pendingRestore);setPendingRestore(null);}}/>}
  </div>;
}

function StoryTour({onClose}){
  const stories=[
    {icon:"shield",color:C.accent,title:"Welcome to Saver",text:"Your money tracker that works 100% offline — no account, no cloud, no tracking."},
    {icon:"wallet",color:C.blue,title:"Your month at a glance",text:"The home screen shows your balance, income vs expenses, and how much you saved this month.",mock:"overview"},
    {icon:"plus",color:C.accent,title:"Log it in seconds",text:"Tap the + button to add an expense, income, saving, or transfer.",mock:"add"},
    {icon:"zap",color:C.yellow,title:"Bills & installments",text:"Track recurring bills and installment plans — see what's paid and what's due next.",mock:"bills"},
    {icon:"layers",color:C.purple,title:"Stay on budget",text:"Set spending limits per category and see how much you can safely spend each day.",mock:"budget"},
    {icon:"target",color:C.yellow,title:"Reach your goals",text:"Save toward goals — the money is frozen safely until you decide to use it."},
    {icon:"hand",color:C.blue,title:"Fast gestures",text:"Long-press + for shortcuts. Swipe any row to edit or delete. Long-press cards to reorder."},
    {icon:"sparkles",color:C.accent,title:"Make it yours",text:"Reorder the home sections, customize categories and colors, and switch between dark and light themes."},
    {icon:"download",color:C.orange,title:"Never lose your data",text:"Everything lives on your device — back up regularly from Settings to keep it safe."},
    {icon:"sparkles",color:C.accent,title:"You're all set!",text:"That's everything. Start tracking and take control of your money.",done:true},
  ];
  const[i,setI]=useState(0);
  const startX=useRef(0);
  const s=stories[i];
  const last=i===stories.length-1;
  const next=()=>{if(!last)setI(i+1);else onClose();};
  const prev=()=>{if(i>0)setI(i-1);};
  const box={background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 14px"};
  const Mock=({type})=>{
    if(type==="overview")return <div style={box}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{textAlign:"left"}}><div style={{color:C.muted,fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Saved this month</div><div style={{color:C.accent,fontSize:20,fontWeight:800}}>+2,450</div></div><div style={{width:38,height:38,borderRadius:11,background:C.accent+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><Ico name="coins" size={20} color={C.accent}/></div></div></div>;
    if(type==="add")return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[["down",C.red,"Expense"],["up",C.accent,"Income"],["target",C.yellow,"Saving"],["swap",C.blue,"Transfer"]].map(([ic,co,la])=><div key={la} style={{...box,padding:"10px",display:"flex",alignItems:"center",gap:8}}><Ico name={ic} size={16} color={co} stroke={2.4}/><span style={{color:C.text,fontSize:12,fontWeight:700}}>{la}</span></div>)}</div>;
    if(type==="bills")return <div style={box}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:C.text,fontSize:12,fontWeight:700}}>Monthly Bills</span><span style={{color:C.muted,fontSize:11,fontWeight:700}}>3/4 paid</span></div><div style={{display:"flex",gap:3,height:7}}>{[C.accent,C.accent,C.accent,C.faint].map((c,k)=><div key={k} style={{flex:1,borderRadius:3,background:c}}/>)}</div></div>;
    if(type==="budget")return <div style={box}><div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{color:C.text,fontSize:12,fontWeight:700}}>Food</span><span style={{color:C.accent,fontSize:11,fontWeight:800}}>600 left</span></div><div style={{height:7,borderRadius:4,background:C.border,overflow:"hidden"}}><div style={{width:"60%",height:"100%",background:C.accent,borderRadius:4}}/></div></div>;
    return null;
  };
  return <div style={{position:"fixed",inset:0,zIndex:200,background:C.bg,display:"flex",flexDirection:"column",fontFamily:"'DM Sans', sans-serif"}}
    onTouchStart={e=>{startX.current=e.touches[0].clientX;}}
    onTouchEnd={e=>{const dx=e.changedTouches[0].clientX-startX.current;if(dx<-45)next();else if(dx>45)prev();}}>
    <style>{`@keyframes stFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes stIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div style={{display:"flex",gap:5,padding:"16px 16px 0"}}>{stories.map((_,idx)=><div key={idx} style={{flex:1,height:3,borderRadius:3,background:idx<=i?C.accent:C.border,transition:"background .3s"}}/>)}</div>
    <div style={{display:"flex",justifyContent:"flex-end",padding:"10px 14px 0",minHeight:18}}>{!last&&<button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:13,fontWeight:700,cursor:"pointer",padding:"6px 8px",fontFamily:"'DM Sans', sans-serif"}}>Skip</button>}</div>
    <div onClick={prev} style={{position:"absolute",left:0,top:60,bottom:120,width:"32%",zIndex:5}}/>
    <div onClick={next} style={{position:"absolute",right:0,top:60,bottom:120,width:"68%",zIndex:5}}/>
    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"0 30px",pointerEvents:"none",animation:"stIn .35s ease"}}>
      <div style={{width:120,height:120,borderRadius:36,background:s.color+"1f",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:30,animation:"stFloat 2.6s infinite ease-in-out"}}><Ico name={s.icon} size={56} color={s.color} stroke={1.6}/></div>
      <div style={{color:C.text,fontSize:24,fontWeight:800,letterSpacing:-0.5,marginBottom:12}}>{s.title}</div>
      <div style={{color:C.muted,fontSize:15,lineHeight:1.6,maxWidth:320,marginBottom:s.mock?22:0}}>{s.text}</div>
      {s.mock&&<div style={{width:"100%",maxWidth:300}}><Mock type={s.mock}/></div>}
    </div>
    <div style={{padding:"0 24px 38px",position:"relative",zIndex:10}}><Btn full onClick={next} color={s.color}>{last?"Start using Saver":"Next"}</Btn></div>
  </div>;
}

function UserManual({onBack,navigateTo,onCoach}){
  useEffect(()=>{window.scrollTo(0,0);},[]);
  const[tour,setTour]=useState(false);
  const[open,setOpen]=useState(null);
  const[q,setQ]=useState("");
  const handleFeedback=()=>{window.location.href="mailto:hello@savertrack.app?subject=Saver%20App%20Feedback";};
  const FAQ=[
    {icon:"wallet",color:C.blue,q:"What does the home screen show?",a:"A full snapshot of your month: total balance, income vs expenses, what you saved (Net), your accounts, bills, installments, budgets, savings goals and spending groups. Use the month selector at the top right to switch months — every card updates to the month you pick."},
    {icon:"layers",color:C.blue,q:"Total Balance vs Safe-to-Spend?",a:"The top balance card has two views — swipe between them. Total Balance is everything in your accounts. Safe-to-Spend subtracts money frozen inside savings goals, so it shows what you can actually spend."},
    {icon:"coins",color:C.accent,q:"What is the 'Saved this month' card?",a:"It's your Net for the selected month — income minus expenses. Green means you saved, red means you overspent. It also shows your savings rate (%) and how you compare to last month."},
    {icon:"wallet",color:C.blue,q:"How do accounts work?",a:"Add bank accounts or cash wallets in Settings → Accounts, each with its own color. Tap any account on the home screen to see its full ledger. Set a low-balance alert and you'll be warned when an account runs low."},
    {icon:"plus",color:C.accent,q:"How do I add a transaction?",a:"Tap the big + button at the bottom center, pick one of 4 types — Expense, Income, Saving, or Transfer — enter the amount and details, then save. The app blocks any transaction that would overdraw an account, so you never go negative by accident."},
    {icon:"swap",color:C.blue,q:"What are the 4 transaction types?",a:"Expense (money out), Income (money in), Saving (move money into a goal), and Transfer (move money between two of your accounts). Transfers show the full route, e.g. Account A → Account B."},
    {icon:"zap",color:C.blue,q:"What are Quick Actions?",a:"Up to 4 one-tap shortcuts for your most frequent expenses. Set them up in Settings → Quick Actions, then long-press the + button from any screen to log an expense in under 2 seconds."},
    {icon:"zap",color:C.yellow,q:"How do monthly bills work?",a:"Add a recurring bill once (with its due day) and it resets every month automatically. Set 'Remind Before' so you get a heads-up. The home Bills card shows a bar of every bill — paid, unpaid or overdue — plus what's left and the next one due. Tap it to open the Bills page."},
    {icon:"card",color:C.purple,q:"How do installments work?",a:"On the Installments tab add a plan (BNPL, loan, etc.) with its total, the monthly amount and number of payments. The home Installments card shows total left to clear, how much per month, your overall paid-off %, and the next due payment. Tapping the card opens the Installments tab directly."},
    {icon:"layers",color:C.purple,q:"How do budgets and safe-to-spend work?",a:"Create a budget in Settings → Budgets by setting a monthly limit for a group of categories. The home Budgets card shows each budget as its own row with a bar, what's left, and roughly how much you can spend per remaining day without going over."},
    {icon:"target",color:C.yellow,q:"How do savings goals work?",a:"Create a goal with a target amount, then add to it using the Saving transaction type. Money inside a goal is 'frozen' — it won't count as Safe-to-Spend until you withdraw it. You can also make a 'spending goal' for money you're setting aside to spend later."},
    {icon:"layers",color:C.accent,q:"What are spending groups?",a:"Groups bundle related categories together (e.g. Daily Life = Food + Coffee + Transport) so you can see total spending per group on the home screen. Tap a group to see all its transactions."},
    {icon:"receipt",color:C.red,q:"How does History work?",a:"It's a full log of every transaction. Search across category names, notes and account names at once, filter by type or month, and swipe any row left to edit or delete it. Deleting a transaction instantly updates all balances."},
    {icon:"hand",color:C.accent,q:"Can I reorder the home screen?",a:"Yes. Long-press and drag any account, budget or savings card to reorder it. To rearrange whole sections, use 'Customize Dashboard' to drag the sections (Accounts, Bills, Budgets…) into the order you like."},
    {icon:"sparkles",color:C.accent,q:"Can I customize categories?",a:"Yes — in Settings you can add, rename, recolor and delete both expense and income categories, each with its own hand-drawn icon to match the app's style."},
    {icon:"coins",color:C.yellow,q:"How do I change theme or currency?",a:"In Settings you can switch between Dark and Light mode, and change the display currency. Changing currency only changes the symbol shown — your actual numbers are never converted."},
    {icon:"lock",color:C.yellow,q:"How do I hide my balances?",a:"Tap the icon next to your total balance to toggle privacy mode — all amounts turn into dots so you can open the app safely in public."},
    {icon:"download",color:C.orange,q:"How do I back up or restore?",a:"Go to Settings → Backup & Restore to download all your data as a file, or restore it with one tap. Since everything is offline, back up regularly — the app will also remind you if it's been a while. Restoring overwrites all current data."},
    {icon:"phone",color:C.blue,q:"Can I install Saver like an app?",a:"Yes. Saver is a PWA — use your browser's 'Add to Home Screen' option to install it. It then opens full-screen like a native app and keeps working completely offline."},
    {icon:"shield",color:C.blue,q:"Is my data private?",a:"Completely. Saver stores everything only on your device — no account, no servers, no tracking and no ads. See the Privacy Policy for full details."},
  ];
  const ql=q.trim().toLowerCase();
  const filtered=ql?FAQ.filter(f=>(f.q+" "+f.a).toLowerCase().includes(ql)):FAQ;
  return <>
    {tour&&<StoryTour onClose={()=>setTour(false)}/>}
    <div style={{padding:"24px 16px 130px",minHeight:"100vh",background:C.bg,boxSizing:"border-box",fontFamily:"'DM Sans', sans-serif"}}>
      <style>{`@keyframes stIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:C.muted,fontSize:22,cursor:"pointer",padding:"10px 15px 10px 0",display:"flex",alignItems:"center"}}><span style={{display:"block",transform:"translateY(-1px)"}}>❮</span></button>
        <div style={{color:C.text,fontSize:22,fontWeight:800}}>Help & Guide</div>
      </div>
      <div onClick={()=>setTour(true)} style={{cursor:"pointer",background:`linear-gradient(135deg,${C.accentDim} 0%,${C.blueDim} 100%)`,border:`1px solid ${C.accent}33`,borderRadius:20,padding:"20px",marginBottom:26,display:"flex",alignItems:"center",gap:16}}>
        <div style={{width:52,height:52,borderRadius:16,background:C.bg+"99",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ico name="play" size={24} color={C.accent}/></div>
        <div style={{flex:1}}><div style={{color:C.text,fontSize:17,fontWeight:800,marginBottom:3}}>Take the 60-second tour</div><div style={{color:C.muted,fontSize:13,lineHeight:1.5}}>A quick, visual walkthrough of everything Saver can do.</div></div>
        <Ico name="chevR" size={20} color={C.muted}/>
      </div>
      {onCoach&&<button onClick={onCoach} style={{width:"100%",boxSizing:"border-box",background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:26,display:"flex",alignItems:"center",gap:12,cursor:"pointer",fontFamily:"'DM Sans', sans-serif"}}>
        <div style={{width:38,height:38,borderRadius:11,background:C.blue+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ico name="target" size={19} color={C.blue}/></div>
        <div style={{flex:1,textAlign:"left"}}><div style={{color:C.text,fontSize:14,fontWeight:800}}>Show me on my screen</div><div style={{color:C.muted,fontSize:12,marginTop:1}}>A guided walkthrough on the real home screen.</div></div>
        <Ico name="chevR" size={18} color={C.faint}/>
      </button>}
      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Browse topics</div>
      <div style={{position:"relative",marginBottom:16}}>
        <div style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",display:"flex"}}><Ico name="search" size={17} color={C.faint}/></div>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search help..." style={{width:"100%",boxSizing:"border-box",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px 12px 40px",color:C.text,fontSize:14,outline:"none",fontFamily:"'DM Sans', sans-serif"}}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map((f)=>{const isOpen=open===f.q;return <div key={f.q} style={{background:C.card,border:`1px solid ${isOpen?f.color+"66":C.border}`,borderRadius:14,overflow:"hidden",transition:"border .2s"}}>
          <button onClick={()=>setOpen(isOpen?null:f.q)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px",background:"none",border:"none",cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans', sans-serif"}}>
            <div style={{width:34,height:34,borderRadius:10,background:f.color+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ico name={f.icon} size={17} color={f.color}/></div>
            <span style={{flex:1,color:C.text,fontSize:14,fontWeight:700}}>{f.q}</span>
            <div style={{transform:isOpen?"rotate(90deg)":"none",transition:"transform .2s",display:"flex"}}><Ico name="chevR" size={16} color={C.faint}/></div>
          </button>
          {isOpen&&<div style={{padding:"0 14px 16px 60px",color:C.muted,fontSize:13.5,lineHeight:1.6,animation:"stIn .25s ease"}}>{f.a}</div>}
        </div>;})}
        {filtered.length===0&&<div style={{textAlign:"center",color:C.faint,fontSize:13,padding:"24px 0"}}>No topics match “{q}”.</div>}
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px",textAlign:"center",margin:"26px 0 20px"}}>
        <div style={{width:46,height:46,borderRadius:14,background:C.blue+"22",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><Ico name="chat" size={24} color={C.blue}/></div>
        <div style={{color:C.text,fontWeight:700,fontSize:15,marginBottom:6}}>Found a bug or have an idea?</div>
        <div style={{color:C.muted,fontSize:13,marginBottom:16}}>We'd love to hear from you.</div>
        <Btn full onClick={handleFeedback} color={C.blue}>Send Feedback</Btn>
      </div>
      <AppFooter navigateTo={navigateTo}/>
    </div>
  </>;
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
