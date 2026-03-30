// Phase 1 default organization ID (single-tenant)
export const ORG_ID = "00000000-0000-0000-0000-000000000001";

// ZING Color Palette — matches prototype exactly
export const Z = {
  turquoise: "#34E1D2",
  bluejeans: "#00AEFF",
  ultramarine: "#3A5AFF",
  violet: "#9600FF",
  purple: "#6407FA",
  oxford: "#050536",
  turquoiseLight: "#99F0E8",
  bluejeansLight: "#80D6FF",
  ultramarineLight: "#9DACFF",
  violetLight: "#CA80FF",
  purpleLight: "#B183FC",
  grey: "#82829A",
  bg: "#F5F7FA",
  card: "#FFFFFF",
  sidebar: "#050536",
  textPrimary: "#1a1a2e",
  textSecondary: "#5a5f7a",
  textMuted: "#8b90a8",
  border: "#E8EBF0",
  borderLight: "#F0F2F6",
} as const;

export const STAGES = [
  { key: "call-now", label: "Call Now", color: "#ef4444" },
  { key: "call-no-answer", label: "Call No Answer", color: Z.grey },
  { key: "hot-72", label: "Hot 72", color: "#f59e0b" },
  { key: "active", label: "Active", color: Z.turquoise },
  { key: "appointment", label: "Appointment", color: Z.bluejeans },
  { key: "appt-no-show", label: "Appt No Show", color: Z.violet },
  { key: "marketing-appt", label: "Marketing Appt", color: Z.ultramarine },
  { key: "promo-hot", label: "Promo Hot", color: Z.purple },
  { key: "promo-cold", label: "Promo Cold", color: "#a855f7" },
  { key: "won", label: "Won", color: "#10b981" },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  "Live Customer": "#10b981",
  "Cancelled": "#ef4444",
  "Active Lead": Z.ultramarine,
  "DNC": Z.grey,
  open: "#ef4444",
  "in-progress": Z.bluejeans,
  resolved: "#10b981",
};

export const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: Z.bluejeans,
  low: Z.grey,
};

export const AVATAR_COLORS = [
  Z.ultramarine, Z.violet, Z.turquoise, Z.purple,
  Z.bluejeans, "#10b981", "#ec4899", Z.oxford,
];

export const LEAD_SOURCE_COLORS: Record<string, string> = {
  Email: Z.bluejeans,
  SMS: Z.turquoise,
  Paid: Z.violet,
};

export const PRODUCT_COLORS: Record<string, string> = {
  "PRD-1001": Z.turquoise,
  "PRD-1002": Z.bluejeans,
  "PRD-1003": Z.violet,
};

export const CAMPAIGN_TYPE_COLORS: Record<string, string> = {
  "sms-blast": "#10b981",
  email: "#3b82f6",
  "paid-ads": "#f59e0b",
  "purchased-list": "#8b5cf6",
  referral: "#ec4899",
  organic: "#06b6d4",
  "direct-mail": "#ef4444",
};

export const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(n);

export const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", href: "/dashboard" },
  { key: "contacts", label: "Contacts", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", href: "/contacts" },
  { key: "pipeline", label: "Pipeline", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", href: "/pipeline" },
  { key: "onboarding", label: "Onboarding", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", href: "#" },
  { key: "tasks", label: "Tasks", icon: "M4 6h16M4 10h16M4 14h16M4 18h16", href: "#" },
  { key: "support", label: "Support", icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z", href: "#" },
  { key: "ar", label: "AR", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", href: "#" },
  { key: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", href: "#" },
] as const;

// Onboarding items created when a deal is won
// Each item has a name and days offset from won_date for the due date
export const ONBOARDING_ITEMS = [
  { itemName: "Website Design", daysOffset: 14 },
  { itemName: "AI Chat", daysOffset: 21 },
  { itemName: "Landing Pages", daysOffset: 21 },
  { itemName: "Blogs", daysOffset: 30 },
  { itemName: "Online Bookings", daysOffset: 21 },
  { itemName: "Memberships", daysOffset: 30 },
  { itemName: "Social Media", daysOffset: 14 },
  { itemName: "SMS Marketing", daysOffset: 30 },
  { itemName: "Email Marketing", daysOffset: 30 },
  { itemName: "GBP Optimization", daysOffset: 14 },
  { itemName: "Google Business Reviews", daysOffset: 21 },
  { itemName: "Local Directories", daysOffset: 30 },
] as const;

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
