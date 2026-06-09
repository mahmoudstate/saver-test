// Saver — Design Tokens (source of truth, per DESIGN.md §17). Consumed by app + styleguide + site.
export const TOKENS = {
  defaultAccent: "mint",
  dimAlpha: { dark: 0.16, light: 0.12 },
  color: {
    dark:  { bg:"#0F0F13", surface:"#16161E", surface2:"#1E1E28", border:"#2A2A38",
             text:"#E8E8F0", muted:"#8A8AA6", faint:"#54546A",
             success:"#34D399", warning:"#FBBF24", danger:"#F87171", info:"#60A5FA" },
    light: { bg:"#F4F5F8", surface:"#FFFFFF", surface2:"#FBFBFD", border:"#E6E7EE",
             text:"#16161D", muted:"#6B6F7E", faint:"#A2A6B4",
             success:"#0F9D6A", warning:"#D98A00", danger:"#E5484D", info:"#2563EB" }
  },
  accentPresets: {
    mint:    { dark:"#5FE3C0", light:"#0D9488", onDark:"#06251F", onLight:"#FFFFFF" },
    emerald: { dark:"#34D399", light:"#059669", onDark:"#04231A", onLight:"#FFFFFF" },
    blue:    { dark:"#60A5FA", light:"#2563EB", onDark:"#04183A", onLight:"#FFFFFF" },
    violet:  { dark:"#A78BFA", light:"#7C3AED", onDark:"#1A1040", onLight:"#FFFFFF" },
    coral:   { dark:"#FB7185", light:"#E11D57", onDark:"#3A0512", onLight:"#FFFFFF" },
    amber:   { dark:"#FBBF24", light:"#D97706", onDark:"#2A1A00", onLight:"#FFFFFF" }
  },
  space:  { 1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 8:32, 10:40, 12:48 },
  radius: { sm:10, md:14, lg:16, xl:20, pill:999 },
  type: {
    display:{size:34,line:40,weight:800,track:-1}, title1:{size:28,line:34,weight:800,track:-0.5},
    title2:{size:22,line:28,weight:800,track:-0.5}, title3:{size:18,line:24,weight:700,track:-0.3},
    bodyStrong:{size:15,line:22,weight:700,track:0}, body:{size:15,line:22,weight:500,track:0},
    label:{size:13,line:18,weight:600,track:0}, caption:{size:12,line:16,weight:500,track:0},
    overline:{size:11,line:14,weight:700,track:1,case:"upper"}
  },
  motion: { micro:140, base:220, enter:300, emphasis:460,
    easeStd:"cubic-bezier(.2,.8,.2,1)", easeExit:"cubic-bezier(.4,0,1,1)", easePop:"cubic-bezier(.175,.885,.32,1.275)" }
};
export default TOKENS;
