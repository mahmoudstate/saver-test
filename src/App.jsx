import { useState, useEffect, useCallback } from "react";

// ─── Palette & helpers ────────────────────────────────────────────────────────
const C = {
  bg: "#0f0f13",
  surface: "#17171f",
  card: "#1e1e28",
  border: "#2a2a38",
  accent: "#6ee7b7",
  accentDim: "#1a3d30",
  red: "#f87171",
  redDim: "#3d1a1a",
  blue: "#60a5fa",
  blueDim: "#1a2d3d",
  yellow: "#fbbf24",
  yellowDim: "#3d2e0a",
  purple: "#a78bfa",
  purpleDim: "#2a1a3d",
  text: "#e8e8f0",
  muted: "#8888a8",
  faint: "#444460",
};

const CURRENCIES = [
  { code: "EGP", name: "Egyptian Pound" },
  { code: "GBP", name: "British Pound" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "AED", name: "UAE Dirham" },
];

let _currency = "EGP";
const setCurrency = (c) => { _currency = c; };
const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: _currency, maximumFractionDigits: 0 }).format(n || 0);

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const fmtDate = (d) => {
  const dt = new Date(d + "T00:00:00");
  return `${DAYS[dt.getDay()]}, ${dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
};

const today = () => new Date().toISOString().split("T")[0];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const ICONS = {
  dashboard: "◈", add: "＋", settings: "⚙", saving: "◎",
  income: "↑", expense: "↓", transfer: "→",
  food: "🍽", coffee: "☕", transport: "🚗", bills: "⚡",
  personal: "👤", health: "💊", entertainment: "🎬", shopping: "🛍",
  rent: "🏠", education: "📚", tech: "💻", others: "📌",
  salary: "💼", freelance: "💡", gift: "🎁", investment: "📈", other_income: "💰",
  bank: "🏦", cash: "💵", goal: "🎯", trash: "🗑", edit: "✎", close: "✕", check: "✓",
};

const DEFAULT_BANKS = [
  { id: "b1", name: "CIB", color: C.blue },
  { id: "b2", name: "NBE", color: C.accent },
  { id: "b3", name: "Alex Bank", color: C.purple },
  { id: "b4", name: "Cash", color: C.yellow },
];

const DEFAULT_EXP_CATS = [
  { id: "food", name: "Food & Dining", icon: "food", group: "daily" },
  { id: "coffee", name: "Coffee & Drinks", icon: "coffee", group: "daily" },
  { id: "transport", name: "Transport", icon: "transport", group: "daily" },
  { id: "bills", name: "Bills & Utilities", icon: "bills", group: "fixed" },
  { id: "rent", name: "Rent", icon: "rent", group: "fixed" },
  { id: "health", name: "Health & Medical", icon: "health", group: "lifestyle" },
  { id: "shopping", name: "Shopping", icon: "shopping", group: "lifestyle" },
  { id: "entertainment", name: "Entertainment", icon: "entertainment", group: "lifestyle" },
  { id: "personal", name: "Personal Care", icon: "personal", group: "lifestyle" },
  { id: "education", name: "Education", icon: "education", group: "growth" },
  { id: "tech", name: "Tech & Subscriptions", icon: "tech", group: "growth" },
  { id: "others", name: "Others", icon: "others", group: "daily" },
];

const DEFAULT_INC_CATS = [
  { id: "salary", name: "Salary", icon: "salary" },
  { id: "freelance", name: "Freelance", icon: "freelance" },
  { id: "gift", name: "Gift", icon: "gift" },
  { id: "investment", name: "Investment", icon: "investment" },
  { id: "other_income", name: "Other Income", icon: "other_income" },
];

const DEFAULT_GROUPS = [
  { id: "daily", name: "Daily Life", color: C.accent, cats: ["food","coffee","transport","others"] },
  { id: "fixed", name: "Fixed Costs", color: C.red, cats: ["bills","rent"] },
  { id: "lifestyle", name: "Lifestyle", color: C.purple, cats: ["health","shopping","entertainment","personal"] },
  { id: "growth", name: "Growth", color: C.blue, cats: ["education","tech"] },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────
const KEYS = { txns: "et_txns", banks: "et_banks", expCats: "et_expCats", incCats: "et_incCats", groups: "et_groups", savings: "et_savings", currency: "et_currency", username: "et_username", lastBackup: "et_lastBackup" };

async function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
async function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Pill({ color, children, style }) {
  return (
    <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, ...style }}>
      {children}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, ...style }}>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 520, maxHeight: "85vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ color: C.text, fontWeight: 700, fontSize: 17 }}>{title}</span>
          <button onClick={onClose} style={{ background: C.border, border: "none", color: C.muted, width: 30, height: 30, borderRadius: 99, cursor: "pointer", fontSize: 14 }}>{ICONS.close}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>{label}</div>}
      <input {...props} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box", ...props.style }} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>{label}</div>}
      <select {...props} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box", ...props.style }}>
        {children}
      </select>
    </div>
  );
}

function Btn({ children, color = C.accent, outline, full, small, ...props }) {
  return (
    <button {...props} style={{
      background: outline ? "transparent" : color,
      border: `1.5px solid ${color}`,
      color: outline ? color : C.bg,
      borderRadius: 10, padding: small ? "7px 14px" : "11px 20px",
      fontWeight: 700, fontSize: small ? 13 : 15, cursor: "pointer",
      width: full ? "100%" : "auto", transition: "opacity .15s",
      ...props.style
    }}
      onMouseOver={e => e.currentTarget.style.opacity = ".8"}
      onMouseOut={e => e.currentTarget.style.opacity = "1"}
    >{children}</button>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: C.border, borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color || C.accent, borderRadius: 99, transition: "width .4s" }} />
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [txns, setTxns] = useState([]);
  const [banks, setBanks] = useState(DEFAULT_BANKS);
  const [expCats, setExpCats] = useState(DEFAULT_EXP_CATS);
  const [incCats, setIncCats] = useState(DEFAULT_INC_CATS);
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [savings, setSavings] = useState([]);
  const [ready, setReady] = useState(false);
  const [filterMonth, setFilterMonth] = useState("all");
  const [currency, setCurrencyState] = useState("EGP");
  const [username, setUsernameState] = useState("");
  const [lastBackup, setLastBackup] = useState(null);
  const [showBackupBanner, setShowBackupBanner] = useState(false);

  // Load from storage
  useEffect(() => {
    (async () => {
      const [t, b, ec, ic, g, s, cur, uname, lb] = await Promise.all([
        load(KEYS.txns, []),
        load(KEYS.banks, DEFAULT_BANKS),
        load(KEYS.expCats, DEFAULT_EXP_CATS),
        load(KEYS.incCats, DEFAULT_INC_CATS),
        load(KEYS.groups, DEFAULT_GROUPS),
        load(KEYS.savings, []),
        load(KEYS.currency, "EGP"),
        load(KEYS.username, ""),
        load(KEYS.lastBackup, null),
      ]);
      setTxns(t); setBanks(b); setExpCats(ec); setIncCats(ic); setGroups(g); setSavings(s);
      setCurrencyState(cur); setCurrency(cur);
      setUsernameState(uname);
      setLastBackup(lb);
      // Show banner if never backed up and has data, or last backup > 3 days ago
      if (t.length > 0) {
        if (!lb) {
          setShowBackupBanner(true);
        } else {
          const daysSince = (Date.now() - new Date(lb).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince >= 3) setShowBackupBanner(true);
        }
      }
      setReady(true);
    })();
  }, []);

  const persist = useCallback(async (key, val) => { await save(key, val); }, []);

  const addTxn = async (t) => {
    const next = [{ ...t, id: Date.now().toString() }, ...txns];
    setTxns(next); await persist(KEYS.txns, next);
  };
  const delTxn = async (id) => {
    const next = txns.filter(t => t.id !== id);
    setTxns(next); await persist(KEYS.txns, next);
  };

  const saveBanks = async (b) => { setBanks(b); await persist(KEYS.banks, b); };
  const saveExpCats = async (c) => { setExpCats(c); await persist(KEYS.expCats, c); };
  const saveIncCats = async (c) => { setIncCats(c); await persist(KEYS.incCats, c); };
  const saveGroups = async (g) => { setGroups(g); await persist(KEYS.groups, g); };
  const saveSavings = async (s) => { setSavings(s); await persist(KEYS.savings, s); };
  const saveCurrencyHandler = async (c) => { setCurrencyState(c); setCurrency(c); await persist(KEYS.currency, c); };
  const saveUsernameHandler = async (n) => { setUsernameState(n); await persist(KEYS.username, n); };

  // ── Backup helpers ──
  const handleExport = async () => {
    const data = { txns, banks, expCats, incCats, groups, savings, currency, username, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    a.href = url; a.download = `expenses-backup-${dateStr}.json`; a.click();
    URL.revokeObjectURL(url);
    const now = new Date().toISOString();
    setLastBackup(now); setShowBackupBanner(false);
    await persist(KEYS.lastBackup, now);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.txns) { setTxns(data.txns); await persist(KEYS.txns, data.txns); }
        if (data.banks) { setBanks(data.banks); await persist(KEYS.banks, data.banks); }
        if (data.expCats) { setExpCats(data.expCats); await persist(KEYS.expCats, data.expCats); }
        if (data.incCats) { setIncCats(data.incCats); await persist(KEYS.incCats, data.incCats); }
        if (data.groups) { setGroups(data.groups); await persist(KEYS.groups, data.groups); }
        if (data.savings) { setSavings(data.savings); await persist(KEYS.savings, data.savings); }
        if (data.currency) { setCurrencyState(data.currency); setCurrency(data.currency); await persist(KEYS.currency, data.currency); }
        if (data.username) { setUsernameState(data.username); await persist(KEYS.username, data.username); }
        alert("✅ Backup restored successfully!");
      } catch { alert("❌ Invalid backup file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!ready) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.accent, fontSize: 28 }}>◈</div>
    </div>
  );

  const allCats = [...expCats, ...incCats];

  // Filtered transactions
  const filteredTxns = filterMonth === "all"
    ? txns
    : txns.filter(t => t.date.startsWith(filterMonth));

  // Build available months from txns
  const availMonths = [...new Set(txns.map(t => t.date.slice(0, 7)))].sort().reverse();

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", maxWidth: 520, margin: "0 auto", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Backup Reminder Banner */}
      {showBackupBanner && (
        <div style={{ background: "#2a1f0a", border: `1px solid ${C.yellow}44`, borderRadius: 0, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span style={{ color: C.yellow, fontSize: 13, fontWeight: 600 }}>
              {lastBackup ? "It's been 3+ days since your last backup" : "You haven't backed up your data yet"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={handleExport} style={{ background: C.yellow, border: "none", color: C.bg, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Backup Now</button>
            <button onClick={() => setShowBackupBanner(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, padding: "0 2px" }}>✕</button>
          </div>
        </div>
      )}

      {/* Content */}
      {tab === "dashboard" && <Dashboard txns={filteredTxns} banks={banks} groups={groups} expCats={expCats} savings={savings} filterMonth={filterMonth} setFilterMonth={setFilterMonth} availMonths={availMonths} currency={currency} username={username} />}
      {tab === "add" && <AddTransaction banks={banks} expCats={expCats} incCats={incCats} savings={savings} onAdd={addTxn} onSaveSavings={saveSavings} onDone={() => setTab("dashboard")} />}
      {tab === "history" && <History txns={txns} banks={banks} allCats={allCats} onDelete={delTxn} />}
      {tab === "savings" && <SavingsPage savings={savings} onSave={saveSavings} txns={txns} banks={banks} />}
      {tab === "settings" && <Settings banks={banks} expCats={expCats} incCats={incCats} groups={groups} expCatsFull={expCats} onBanks={saveBanks} onExpCats={saveExpCats} onIncCats={saveIncCats} onGroups={saveGroups} currency={currency} onCurrency={saveCurrencyHandler} username={username} onUsername={saveUsernameHandler} onExport={handleExport} onImport={handleImport} lastBackup={lastBackup} />}

      {/* Nav */}
      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 520, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0 14px" }}>
        {[
          { id: "dashboard", icon: ICONS.dashboard, label: "Home" },
          { id: "add", icon: ICONS.add, label: "Add" },
          { id: "history", icon: "☰", label: "History" },
          { id: "savings", icon: ICONS.saving, label: "Savings" },
          { id: "settings", icon: ICONS.settings, label: "Settings" },
        ].map(n => (
          <button key={n.id} onClick={() => setTab(n.id)} style={{
            background: n.id === "add" ? C.accent : "none",
            border: "none", color: n.id === "add" ? C.bg : tab === n.id ? C.accent : C.muted,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: n.id === "add" ? "6px 18px" : "4px 10px",
            borderRadius: n.id === "add" ? 12 : 8, cursor: "pointer", fontSize: n.id === "add" ? 20 : 18,
            fontWeight: 700, transition: "color .2s",
          }}>
            {n.icon}
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: .5, textTransform: "uppercase" }}>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ txns, banks, groups, expCats, savings, filterMonth, setFilterMonth, availMonths, username }) {
  const totalBalance = banks.reduce((s, b) => {
    const inc = txns.filter(t => t.bankId === b.id && t.type === "income").reduce((a, t) => a + t.amount, 0);
    const exp = txns.filter(t => t.bankId === b.id && t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const savOut = txns.filter(t => t.bankId === b.id && t.type === "saving").reduce((a, t) => a + t.amount, 0);
    return s + inc - exp - savOut;
  }, 0);

  const totalIncome = txns.filter(t => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const totalExp = txns.filter(t => t.type === "expense").reduce((a, t) => a + t.amount, 0);

  const bankBalance = (b) => {
    const inc = txns.filter(t => t.bankId === b.id && t.type === "income").reduce((a, t) => a + t.amount, 0);
    const exp = txns.filter(t => t.bankId === b.id && t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const savOut = txns.filter(t => t.bankId === b.id && t.type === "saving").reduce((a, t) => a + t.amount, 0);
    return inc - exp - savOut;
  };

  const now = new Date();
  const monthOptions = [
    { value: "all", label: "All Time" },
    ...Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { value: val, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
    }),
  ];

  return (
    <div style={{ padding: "24px 16px 0" }}>
      {/* Greeting */}
      {username && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>
            {(() => {
              const h = new Date().getHours();
              const emoji = h < 12 ? "☀️" : h < 18 ? "👋" : "🌙";
              const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
              return <>{emoji} {greet},</>;
            })()}
          </div>
          <div style={{ color: C.text, fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>{username} 💰</div>
        </div>
      )}

      {/* Header: title + month filter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ color: C.text, fontSize: 20, fontWeight: 800 }}>Overview</div>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "8px 12px", fontSize: 13, outline: "none" }}>
          {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Accounts label */}
      <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Accounts</div>

      {/* Total Balance — full width */}
      <Card style={{ padding: 16, marginBottom: 10, background: `linear-gradient(135deg, #1e1e28 0%, #23232f 100%)`, borderColor: C.faint }}>
        <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Net Balance</div>
        <div style={{ color: C.text, fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>{fmt(totalBalance)}</div>
      </Card>

      {/* Bank cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {banks.map(b => {
          const bal = bankBalance(b);
          return (
            <Card key={b.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: b.color }} />
                <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>{b.name}</span>
              </div>
              <div style={{ color: bal < 0 ? C.red : C.text, fontSize: 17, fontWeight: 800 }}>{fmt(bal)}</div>
            </Card>
          );
        })}
      </div>

      {/* Income vs Expense — below banks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Income</div>
          <div style={{ color: C.accent, fontSize: 20, fontWeight: 800 }}>{fmt(totalIncome)}</div>
        </Card>
        <Card style={{ padding: 14 }}>
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Expenses</div>
          <div style={{ color: C.red, fontSize: 20, fontWeight: 800 }}>{fmt(totalExp)}</div>
        </Card>
      </div>

      {/* Expense Groups */}
      <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Expense Breakdown</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {groups.map(g => {
          const total = txns.filter(t => t.type === "expense" && g.cats.includes(t.catId)).reduce((a, t) => a + t.amount, 0);
          if (!total) return null;
          const pct = totalExp ? Math.round((total / totalExp) * 100) : 0;
          return (
            <Card key={g.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: g.color }} />
                <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>{g.name}</span>
              </div>
              <div style={{ color: g.color, fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{fmt(total)}</div>
              <ProgressBar value={total} max={totalExp} color={g.color} />
              <div style={{ color: C.faint, fontSize: 10, fontWeight: 700, marginTop: 4 }}>{pct}% of total</div>
            </Card>
          );
        })}
        {/* Ungrouped */}
        {(() => {
          const groupedCats = groups.flatMap(g => g.cats);
          const total = txns.filter(t => t.type === "expense" && !groupedCats.includes(t.catId)).reduce((a, t) => a + t.amount, 0);
          const pct = totalExp ? Math.round((total / totalExp) * 100) : 0;
          return total > 0 ? (
            <Card style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: C.faint }} />
                <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>Other</span>
              </div>
              <div style={{ color: C.text, fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{fmt(total)}</div>
              <ProgressBar value={total} max={totalExp} color={C.faint} />
              <div style={{ color: C.faint, fontSize: 10, fontWeight: 700, marginTop: 4 }}>{pct}% of total</div>
            </Card>
          ) : null;
        })()}
      </div>

      {/* Savings Goals */}
      {savings.length > 0 && (
        <>
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Savings Goals</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {savings.map(s => {
              const saved = s.contributions?.reduce((a, c) => a + c.amount, 0) || 0;
              const pct = s.goal ? Math.min(100, Math.round((saved / s.goal) * 100)) : 0;
              return (
                <Card key={s.id} style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{ICONS.goal} {s.name}</span>
                    <Pill color={C.yellow}>{pct}%</Pill>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: C.yellow, fontSize: 15, fontWeight: 800 }}>{fmt(saved)}</span>
                    <span style={{ color: C.muted, fontSize: 13 }}>of {fmt(s.goal)}</span>
                  </div>
                  <ProgressBar value={saved} max={s.goal} color={C.yellow} />
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Recent */}
      {txns.length > 0 && (
        <>
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Recent Transactions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {txns.slice(0, 5).map(t => <TxnRow key={t.id} txn={t} banks={[...([]), ...([] )]} />)}
          </div>
        </>
      )}
    </div>
  );
}

function TxnRow({ txn, small }) {
  const isExp = txn.type === "expense";
  const isInc = txn.type === "income";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.card, borderRadius: 12, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: isExp ? C.redDim : isInc ? C.accentDim : C.yellowDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
          {txn.type === "saving" ? ICONS.saving : ICONS[txn.catIcon] || "📌"}
        </div>
        <div>
          <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{txn.catName || txn.type}</div>
          <div style={{ color: C.muted, fontSize: 11 }}>{txn.bankName} · {fmtDate(txn.date)}</div>
        </div>
      </div>
      <div style={{ color: isExp ? C.red : isInc ? C.accent : C.yellow, fontWeight: 800, fontSize: 15 }}>
        {isExp ? "−" : "+"}{fmt(txn.amount)}
      </div>
    </div>
  );
}

// ─── Add Transaction ──────────────────────────────────────────────────────────
function AddTransaction({ banks, expCats, incCats, savings, onAdd, onSaveSavings, onDone }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [bankId, setBankId] = useState(banks[0]?.id || "");
  const [catId, setCatId] = useState(expCats[0]?.id || "");
  const [note, setNote] = useState("");
  const [savingId, setSavingId] = useState(savings[0]?.id || "");

  const cats = type === "expense" ? expCats : type === "income" ? incCats : [];

  useEffect(() => {
    if (type === "expense" && expCats.length) setCatId(expCats[0].id);
    if (type === "income" && incCats.length) setCatId(incCats[0].id);
    if (type === "saving" && savings.length) setSavingId(savings[0].id);
  }, [type]);

  const handleSubmit = async () => {
    if (!amount || isNaN(+amount) || +amount <= 0) return;
    const bank = banks.find(b => b.id === bankId);

    if (type === "saving") {
      if (!savingId) return;
      const sv = savings.find(s => s.id === savingId);
      if (!sv) return;
      const contribution = { id: Date.now().toString(), amount: +amount, date, bankId, bankName: bank?.name };
      const updated = savings.map(s => s.id === savingId
        ? { ...s, contributions: [...(s.contributions || []), contribution] }
        : s
      );
      await onSaveSavings(updated);
      await onAdd({ type: "saving", amount: +amount, date, bankId, bankName: bank?.name, catName: sv.name, catIcon: "saving", note });
    } else {
      const cat = cats.find(c => c.id === catId);
      await onAdd({ type, amount: +amount, date, bankId, bankName: bank?.name, catId, catName: cat?.name, catIcon: cat?.icon, note });
    }
    setAmount(""); setNote(""); setDate(today());
    onDone();
  };

  return (
    <div style={{ padding: "24px 16px 0" }}>
      <div style={{ color: C.text, fontSize: 22, fontWeight: 800, marginBottom: 20 }}>New Transaction</div>

      {/* Type Selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ v: "expense", label: "Expense", color: C.red }, { v: "income", label: "Income", color: C.accent }, { v: "saving", label: "Saving", color: C.yellow }].map(o => (
          <button key={o.v} onClick={() => setType(o.v)} style={{
            flex: 1, padding: "10px 0", borderRadius: 10, border: `1.5px solid ${type === o.v ? o.color : C.border}`,
            background: type === o.v ? o.color + "22" : "transparent", color: type === o.v ? o.color : C.muted,
            fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>{o.label}</button>
        ))}
      </div>

      <Input label="Amount (EGP)" type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
      <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />

      <Select label="Account" value={bankId} onChange={e => setBankId(e.target.value)}>
        {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </Select>

      {type === "saving" ? (
        savings.length > 0
          ? <Select label="Saving Goal" value={savingId} onChange={e => setSavingId(e.target.value)}>
              {savings.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          : <div style={{ color: C.muted, fontSize: 13, marginBottom: 14, padding: "10px 12px", background: C.card, borderRadius: 10 }}>No saving goals yet. Create one in the Savings tab.</div>
      ) : (
        <Select label="Category" value={catId} onChange={e => setCatId(e.target.value)}>
          {cats.map(c => <option key={c.id} value={c.id}>{ICONS[c.icon] || "📌"} {c.name}</option>)}
        </Select>
      )}

      <Input label="Note (optional)" placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} />

      <Btn full onClick={handleSubmit} style={{ marginTop: 8 }}>Save Transaction</Btn>
    </div>
  );
}

// ─── History ──────────────────────────────────────────────────────────────────
function History({ txns, banks, allCats, onDelete }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  // Build available months from txns
  const availMonths = [...new Set(txns.map(t => t.date.slice(0, 7)))].sort().reverse();

  const filtered = txns.filter(t => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterMonth !== "all" && !t.date.startsWith(filterMonth)) return false;
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    if (search && !t.catName?.toLowerCase().includes(search.toLowerCase()) && !t.note?.toLowerCase().includes(search.toLowerCase()) && !t.bankName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const hasActiveFilters = filterMonth !== "all" || dateFrom || dateTo || filterType !== "all";

  const clearFilters = () => { setFilterMonth("all"); setDateFrom(""); setDateTo(""); setFilterType("all"); };

  return (
    <div style={{ padding: "24px 16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ color: C.text, fontSize: 22, fontWeight: 800 }}>History</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {hasActiveFilters && (
            <button onClick={clearFilters} style={{ background: C.redDim, border: `1px solid ${C.red}44`, color: C.red, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              Clear ✕
            </button>
          )}
          <button onClick={() => setShowFilters(v => !v)} style={{
            background: showFilters ? C.accentDim : C.card, border: `1px solid ${showFilters ? C.accent : C.border}`,
            color: showFilters ? C.accent : C.muted, borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>⚙ Filter</button>
        </div>
      </div>

      {/* Search */}
      <input placeholder="Search by category, bank, note..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />

      {/* Expandable Filters Panel */}
      {showFilters && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          {/* Type Filter */}
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Type</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {["all", "expense", "income", "saving"].map(f => (
              <button key={f} onClick={() => setFilterType(f)} style={{
                padding: "5px 12px", borderRadius: 8, border: `1px solid ${filterType === f ? C.accent : C.border}`,
                background: filterType === f ? C.accentDim : "transparent", color: filterType === f ? C.accent : C.muted,
                fontWeight: 600, fontSize: 12, cursor: "pointer", textTransform: "capitalize",
              }}>{f}</button>
            ))}
          </div>

          {/* Month Filter */}
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Month</div>
          <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setDateFrom(""); setDateTo(""); }}
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 14 }}>
            <option value="all">All Time</option>
            {availMonths.map(m => {
              const [y, mo] = m.split("-");
              return <option key={m} value={m}>{MONTHS[+mo - 1]} {y}</option>;
            })}
          </select>

          {/* Date Range */}
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Date Range</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={{ color: C.muted, fontSize: 10, marginBottom: 4 }}>From</div>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setFilterMonth("all"); }}
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ color: C.muted, fontSize: 10, marginBottom: 4 }}>To</div>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setFilterMonth("all"); }}
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
        {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
        {hasActiveFilters ? " (filtered)" : ""}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            No transactions found
          </div>
        )}
        {filtered.map(t => {
          const isExp = t.type === "expense";
          const isInc = t.type === "income";
          return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px" }}>
              {/* Icon */}
              <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: isExp ? C.redDim : isInc ? C.accentDim : C.yellowDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                {t.type === "saving" ? ICONS.saving : ICONS[t.catIcon] || "📌"}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.catName || t.type}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{t.bankName} · {fmtDate(t.date)}</div>
              </div>
              {/* Amount */}
              <div style={{ color: isExp ? C.red : isInc ? C.accent : C.yellow, fontWeight: 800, fontSize: 15, flexShrink: 0, marginRight: 4 }}>
                {isExp ? "−" : "+"}{fmt(t.amount)}
              </div>
              {/* Delete */}
              <button onClick={() => setConfirmId(t.id)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 16, padding: "4px 2px", flexShrink: 0, lineHeight: 1 }}>🗑</button>
            </div>
          );
        })}
      </div>

      {confirmId && (
        <Modal title="Delete Transaction?" onClose={() => setConfirmId(null)}>
          <p style={{ color: C.muted, marginBottom: 20 }}>This action cannot be undone.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn outline color={C.muted} full onClick={() => setConfirmId(null)}>Cancel</Btn>
            <Btn color={C.red} full onClick={() => { onDelete(confirmId); setConfirmId(null); }}>Delete</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Savings ─────────────────────────────────────────────────────────────────
function SavingsPage({ savings, onSave, txns, banks }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [editId, setEditId] = useState(null);

  const handleAdd = async () => {
    if (!name || !goal) return;
    if (editId) {
      const next = savings.map(s => s.id === editId ? { ...s, name, goal: +goal } : s);
      await onSave(next);
      setEditId(null);
    } else {
      await onSave([...savings, { id: Date.now().toString(), name, goal: +goal, contributions: [] }]);
    }
    setName(""); setGoal(""); setShowAdd(false);
  };

  const handleDelete = async (id) => {
    await onSave(savings.filter(s => s.id !== id));
  };

  const startEdit = (s) => {
    setEditId(s.id); setName(s.name); setGoal(s.goal); setShowAdd(true);
  };

  return (
    <div style={{ padding: "24px 16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ color: C.text, fontSize: 22, fontWeight: 800 }}>Saving Goals</div>
        <Btn small onClick={() => { setEditId(null); setName(""); setGoal(""); setShowAdd(true); }}>+ New Goal</Btn>
      </div>

      {savings.length === 0 && (
        <div style={{ color: C.muted, textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{ICONS.saving}</div>
          <div>No saving goals yet</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {savings.map(s => {
          const saved = s.contributions?.reduce((a, c) => a + c.amount, 0) || 0;
          const pct = s.goal ? Math.min(100, Math.round((saved / s.goal) * 100)) : 0;
          const remaining = Math.max(0, s.goal - saved);
          return (
            <Card key={s.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 17 }}>{s.name}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Goal: {fmt(s.goal)}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Pill color={C.yellow}>{pct}%</Pill>
                  <button onClick={() => startEdit(s)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>✎</button>
                  <button onClick={() => handleDelete(s.id)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 15 }}>🗑</button>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: C.yellow, fontSize: 18, fontWeight: 800 }}>{fmt(saved)}</span>
                <span style={{ color: C.muted, fontSize: 13 }}>{fmt(remaining)} left</span>
              </div>
              <ProgressBar value={saved} max={s.goal} color={C.yellow} />
              {s.contributions?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Contributions</div>
                  {s.contributions.slice(-3).reverse().map(c => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: C.muted, fontSize: 13 }}>{fmtDate(c.date)} · {c.bankName}</span>
                      <span style={{ color: C.yellow, fontWeight: 700, fontSize: 13 }}>+{fmt(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {showAdd && (
        <Modal title={editId ? "Edit Goal" : "New Saving Goal"} onClose={() => { setShowAdd(false); setEditId(null); }}>
          <Input label="Goal Name" placeholder="e.g. Travel Fund, New Laptop..." value={name} onChange={e => setName(e.target.value)} />
          <Input label="Target Amount (EGP)" type="number" placeholder="0" value={goal} onChange={e => setGoal(e.target.value)} />
          <Btn full onClick={handleAdd}>{editId ? "Update Goal" : "Create Goal"}</Btn>
        </Modal>
      )}
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function Settings({ banks, expCats, incCats, groups, onBanks, onExpCats, onIncCats, onGroups, currency, onCurrency, username, onUsername, onExport, onImport, lastBackup }) {
  const [section, setSection] = useState("profile");
  const [modal, setModal] = useState(null);
  const [inputName, setInputName] = useState("");
  const [inputColor, setInputColor] = useState(C.accent);
  const [inputGroup, setInputGroup] = useState("");
  const [inputIcon, setInputIcon] = useState("others");
  const [groupCats, setGroupCats] = useState([]);
  const [nameInput, setNameInput] = useState(username || "");

  const openAdd = (type, item = null) => {
    setModal({ type, item });
    setInputName(item?.name || "");
    setInputColor(item?.color || C.accent);
    setInputGroup(item?.group || "daily");
    setInputIcon(item?.icon || "others");
    setGroupCats(item?.cats || []);
  };

  const handleSave = async () => {
    if (!inputName.trim()) return;
    const id = modal.item?.id || Date.now().toString();

    if (modal.type === "bank") {
      const item = { id, name: inputName, color: inputColor };
      const next = modal.item ? banks.map(b => b.id === id ? item : b) : [...banks, item];
      await onBanks(next);
    } else if (modal.type === "expCat") {
      const item = { id, name: inputName, icon: inputIcon, group: inputGroup };
      const next = modal.item ? expCats.map(c => c.id === id ? item : c) : [...expCats, item];
      await onExpCats(next);
    } else if (modal.type === "incCat") {
      const item = { id, name: inputName, icon: inputIcon };
      const next = modal.item ? incCats.map(c => c.id === id ? item : c) : [...incCats, item];
      await onIncCats(next);
    } else if (modal.type === "group") {
      const item = { id, name: inputName, color: inputColor, cats: groupCats };
      const next = modal.item ? groups.map(g => g.id === id ? item : g) : [...groups, item];
      await onGroups(next);
    }
    setModal(null);
  };

  const handleDelete = async (type, id) => {
    if (type === "bank") await onBanks(banks.filter(b => b.id !== id));
    else if (type === "expCat") await onExpCats(expCats.filter(c => c.id !== id));
    else if (type === "incCat") await onIncCats(incCats.filter(c => c.id !== id));
    else if (type === "group") await onGroups(groups.filter(g => g.id !== id));
  };

  const iconKeys = Object.keys(ICONS).filter(k => !["dashboard","add","settings","saving","income","expense","transfer","close","check","trash","edit","bank","cash","goal"].includes(k));
  const allExpCats = expCats;

  return (
    <div style={{ padding: "24px 16px 0" }}>
      <div style={{ color: C.text, fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Settings</div>

      {/* Section Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto" }}>
        {[{ id: "profile", label: "👤 Profile" }, { id: "backup", label: "💾 Backup" }, { id: "currency", label: "💱 Currency" }, { id: "banks", label: "🏦 Accounts" }, { id: "expCats", label: "📤 Exp. Cat." }, { id: "incCats", label: "📥 Inc. Cat." }, { id: "groups", label: "📊 Groups" }].map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            whiteSpace: "nowrap", padding: "8px 14px", borderRadius: 10,
            border: `1px solid ${section === s.id ? C.accent : C.border}`,
            background: section === s.id ? C.accentDim : "transparent",
            color: section === s.id ? C.accent : C.muted, fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}>{s.label}</button>
        ))}
      </div>

      {/* Profile */}
      {section === "profile" && (
        <div>
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>Your Name</div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>This name appears as a greeting on the Dashboard</div>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Enter your name..."
              style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
            />
            <Btn full onClick={() => onUsername(nameInput.trim())}>Save Name</Btn>
          </div>
          {username && (
            <div style={{ background: C.accentDim, border: `1px solid ${C.accent}33`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Preview</div>
              <div style={{ color: C.muted, fontSize: 13 }}>☀️ Good morning,</div>
              <div style={{ color: C.text, fontSize: 20, fontWeight: 800 }}>{username} 💰</div>
            </div>
          )}
        </div>
      )}

      {/* Backup */}
      {section === "backup" && (
        <div>
          {/* Last backup info */}
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>💾</span>
              <div>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>Last Backup</div>
                <div style={{ color: lastBackup ? C.accent : C.red, fontSize: 13, marginTop: 2 }}>
                  {lastBackup ? fmtDate(lastBackup.split("T")[0]) : "Never backed up"}
                </div>
              </div>
            </div>
            <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>
              A backup saves all your transactions, accounts, categories, and settings into a JSON file on your device. You'll get a reminder every 3 days.
            </div>
            <Btn full onClick={onExport} color={C.accent}>⬇ Download Backup</Btn>
          </Card>

          {/* Restore */}
          <Card style={{ padding: 16 }}>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>🔄 Restore from Backup</div>
            <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>
              Select a previously downloaded backup file to restore all your data. This will overwrite your current data.
            </div>
            <label style={{ display: "block", background: C.bg, border: `1.5px dashed ${C.border}`, borderRadius: 10, padding: "14px 16px", textAlign: "center", cursor: "pointer" }}>
              <input type="file" accept=".json" onChange={onImport} style={{ display: "none" }} />
              <div style={{ fontSize: 24, marginBottom: 6 }}>📂</div>
              <div style={{ color: C.muted, fontSize: 13, fontWeight: 600 }}>Tap to choose backup file</div>
            </label>
          </Card>
        </div>
      )}

      {/* Currency */}
      {section === "currency" && (
        <div>
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>Select Currency</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CURRENCIES.map(cur => (
              <button key={cur.code} onClick={() => onCurrency(cur.code)} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: currency === cur.code ? C.accentDim : C.card,
                border: `1.5px solid ${currency === cur.code ? C.accent : C.border}`,
                borderRadius: 12, padding: "14px 16px", cursor: "pointer", textAlign: "left",
              }}>
                <div>
                  <div style={{ color: currency === cur.code ? C.accent : C.text, fontWeight: 700, fontSize: 15 }}>{cur.code}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{cur.name}</div>
                </div>
                {currency === cur.code && <span style={{ color: C.accent, fontSize: 20 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Banks */}
      {section === "banks" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {banks.map(b => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 99, background: b.color }} />
                  <span style={{ color: C.text, fontWeight: 600 }}>{b.name}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => openAdd("bank", b)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>✎</button>
                  <button onClick={() => handleDelete("bank", b.id)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer" }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
          <Btn outline full onClick={() => openAdd("bank")}>+ Add Account</Btn>
        </>
      )}

      {/* Expense Cats */}
      {section === "expCats" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {expCats.map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 18 }}>{ICONS[c.icon] || "📌"}</span>
                  <div>
                    <div style={{ color: C.text, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ color: C.muted, fontSize: 11 }}>{c.group}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => openAdd("expCat", c)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>✎</button>
                  <button onClick={() => handleDelete("expCat", c.id)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer" }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
          <Btn outline full onClick={() => openAdd("expCat")}>+ Add Category</Btn>
        </>
      )}

      {/* Income Cats */}
      {section === "incCats" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {incCats.map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 18 }}>{ICONS[c.icon] || "💰"}</span>
                  <span style={{ color: C.text, fontWeight: 600 }}>{c.name}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => openAdd("incCat", c)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>✎</button>
                  <button onClick={() => handleDelete("incCat", c.id)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer" }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
          <Btn outline full onClick={() => openAdd("incCat")}>+ Add Category</Btn>
        </>
      )}

      {/* Groups */}
      {section === "groups" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {groups.map(g => (
              <div key={g.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 99, background: g.color }} />
                    <span style={{ color: C.text, fontWeight: 700 }}>{g.name}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openAdd("group", g)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>✎</button>
                    <button onClick={() => handleDelete("group", g.id)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer" }}>🗑</button>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {g.cats.map(cid => {
                    const cat = expCats.find(c => c.id === cid);
                    return cat ? <Pill key={cid} color={g.color}>{cat.name}</Pill> : null;
                  })}
                </div>
              </div>
            ))}
          </div>
          <Btn outline full onClick={() => openAdd("group")}>+ Add Group</Btn>
        </>
      )}

      {/* Modal */}
      {modal && (
        <Modal title={`${modal.item ? "Edit" : "Add"} ${modal.type === "bank" ? "Account" : modal.type === "expCat" ? "Expense Category" : modal.type === "incCat" ? "Income Category" : "Dashboard Group"}`} onClose={() => setModal(null)}>
          <Input label="Name" value={inputName} onChange={e => setInputName(e.target.value)} />

          {(modal.type === "bank" || modal.type === "group") && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Color</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[C.accent, C.red, C.blue, C.yellow, C.purple, "#fb923c", "#34d399", "#f472b6"].map(col => (
                  <button key={col} onClick={() => setInputColor(col)} style={{
                    width: 28, height: 28, borderRadius: 99, background: col, border: inputColor === col ? `3px solid white` : "3px solid transparent", cursor: "pointer",
                  }} />
                ))}
              </div>
            </div>
          )}

          {(modal.type === "expCat" || modal.type === "incCat") && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Icon</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {iconKeys.map(k => (
                  <button key={k} onClick={() => setInputIcon(k)} style={{
                    width: 36, height: 36, borderRadius: 8, background: inputIcon === k ? C.accentDim : C.bg, border: `1px solid ${inputIcon === k ? C.accent : C.border}`, cursor: "pointer", fontSize: 18,
                  }}>{ICONS[k]}</button>
                ))}
              </div>
            </div>
          )}

          {modal.type === "expCat" && (
            <Select label="Group Tag" value={inputGroup} onChange={e => setInputGroup(e.target.value)}>
              {["daily", "fixed", "lifestyle", "growth", "other"].map(g => <option key={g} value={g}>{g}</option>)}
            </Select>
          )}

          {modal.type === "group" && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Expense Categories</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflow: "auto" }}>
                {allExpCats.map(c => {
                  const checked = groupCats.includes(c.id);
                  return (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 0" }}>
                      <div onClick={() => setGroupCats(checked ? groupCats.filter(x => x !== c.id) : [...groupCats, c.id])}
                        style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? C.accent : C.faint}`, background: checked ? C.accentDim : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {checked && <span style={{ color: C.accent, fontSize: 12 }}>✓</span>}
                      </div>
                      <span style={{ color: C.text, fontSize: 14 }}>{ICONS[c.icon] || "📌"} {c.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <Btn full onClick={handleSave} style={{ marginTop: 8 }}>{modal.item ? "Save Changes" : "Add"}</Btn>
        </Modal>
      )}
    </div>
  );
}
