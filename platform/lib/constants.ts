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

export const CATEGORY_COLORS: Record<string, string> = {
  Bug: "#ef4444",
  Question: Z.bluejeans,
  "Feature Request": Z.violet,
  Billing: "#f59e0b",
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
  { key: "onboarding", label: "Onboarding", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", href: "/onboarding" },
  { key: "tasks", label: "Tasks", icon: "M4 6h16M4 10h16M4 14h16M4 18h16", href: "/onboarding/by-task" },
  { key: "support", label: "Support", icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z", href: "/support" },
  { key: "ar", label: "AR", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", href: "/ar" },
  { key: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", href: "/settings" },
] as const;

export interface StatusOption {
  value: string;
  label: string;
  triggerEmail: boolean;
  triggerSms: boolean;
  triggerNextTask: boolean;
  customerMessage?: string;
}

export interface TaskTemplate {
  itemName: string;
  taskType: string;
  ownerRole: string;
  daysOffset: number;
  isConditional: boolean;
  statusOptions: StatusOption[];
}

// ━━━ Component Library — Amy's confirmed 19 building blocks ━━━

const WEBSITE_STATUS_OPTIONS: StatusOption[] = [
  { value: 'website_started', label: 'Website Started', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'edit_mode', label: 'Edit Mode', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'check_draft', label: 'Check Draft', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'ready_to_send', label: 'Ready to Send', triggerEmail: true, triggerSms: true, triggerNextTask: false, customerMessage: 'Great news! Your first website draft is ready for your review. Our team will be in touch shortly.' },
  { value: 'first_draft_completed', label: '1st Draft Completed', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'ready_for_publishing', label: 'Ready for Publishing', triggerEmail: false, triggerSms: false, triggerNextTask: true },
  { value: 'final_qa_completed', label: 'Final QA Completed', triggerEmail: false, triggerSms: false, triggerNextTask: true },
  { value: 'published', label: 'Published', triggerEmail: true, triggerSms: true, triggerNextTask: false, customerMessage: 'Your website is now LIVE! Check it out and let us know what you think.' },
  { value: 'hold', label: 'HOLD', triggerEmail: false, triggerSms: false, triggerNextTask: false },
];

const LANDING_PAGES_STATUS_OPTIONS: StatusOption[] = [
  { value: 'not_started', label: 'Not Started', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'in_progress', label: 'In Progress', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'completed', label: 'Completed', triggerEmail: true, triggerSms: false, triggerNextTask: false, customerMessage: 'Your local landing pages are live and working for you!' },
];

const BLOGS_STATUS_OPTIONS: StatusOption[] = [
  { value: 'not_started', label: 'Not Started', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'in_progress', label: 'In Progress', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'completed', label: 'Completed', triggerEmail: true, triggerSms: false, triggerNextTask: false, customerMessage: 'Your weekly blog content is set up and ready to go!' },
];

const AI_CHAT_STATUS_OPTIONS: StatusOption[] = [
  { value: 'not_started', label: 'Not Started', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'in_progress', label: 'In Progress', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'completed', label: 'Completed', triggerEmail: true, triggerSms: true, triggerNextTask: false, customerMessage: 'Your AI Chat is live on your website and capturing leads 24/7!' },
];

const SOCIAL_MEDIA_STATUS_OPTIONS: StatusOption[] = [
  { value: 'not_started', label: 'Not Started', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'in_progress', label: 'In Progress', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'completed', label: 'Completed', triggerEmail: true, triggerSms: false, triggerNextTask: false, customerMessage: 'Your social media content schedule is live!' },
];

const BOOKINGS_STATUS_OPTIONS: StatusOption[] = [
  { value: 'not_started', label: 'Not Started', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'in_progress', label: 'In Progress', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'completed', label: 'Completed', triggerEmail: true, triggerSms: true, triggerNextTask: false, customerMessage: 'Online bookings are live on your website!' },
];

const ECOMMERCE_STATUS_OPTIONS: StatusOption[] = [
  { value: 'not_started', label: 'Not Started', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'in_progress', label: 'In Progress', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'completed', label: 'Completed', triggerEmail: true, triggerSms: true, triggerNextTask: false, customerMessage: 'Your online store is set up and ready!' },
];

const SMS_MARKETING_STATUS_OPTIONS: StatusOption[] = [
  { value: 'not_started', label: 'Not Started', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'in_progress', label: 'In Progress', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'completed', label: 'Completed', triggerEmail: true, triggerSms: false, triggerNextTask: false, customerMessage: 'Your SMS marketing is configured and ready!' },
];

const EMAIL_MARKETING_STATUS_OPTIONS: StatusOption[] = [
  { value: 'not_started', label: 'Not Started', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'in_progress', label: 'In Progress', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'completed', label: 'Completed', triggerEmail: true, triggerSms: false, triggerNextTask: false, customerMessage: 'Your email marketing is set up and ready to send!' },
];

const DIRECTORIES_STATUS_OPTIONS: StatusOption[] = [
  { value: 'not_started', label: 'Not Started', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'in_progress', label: 'In Progress', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'completed', label: 'Completed', triggerEmail: true, triggerSms: false, triggerNextTask: false, customerMessage: 'Your business is now listed across 10 local directories!' },
];

const GBP_STATUS_OPTIONS: StatusOption[] = [
  { value: 'form_completed', label: 'Form Completed', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'in_progress', label: 'In Progress', triggerEmail: false, triggerSms: false, triggerNextTask: false },
  { value: 'optimized', label: 'Optimized', triggerEmail: true, triggerSms: true, triggerNextTask: false, customerMessage: 'Your Google Business Profile has been fully optimized!' },
  { value: 'not_complete', label: 'Not Complete', triggerEmail: false, triggerSms: false, triggerNextTask: false },
];

export interface ComponentDef {
  name: string;
  taskType: string;
  ownerRole: string;
  daysOffset: number;
  statusOptions: StatusOption[];
}

export const COMPONENT_LIBRARY = {
  website_5:          { name: 'Website 5 Page',                        taskType: 'website',         ownerRole: 'designer',              daysOffset: 14, statusOptions: WEBSITE_STATUS_OPTIONS },
  website_10:         { name: 'Website 10 Page',                       taskType: 'website',         ownerRole: 'designer',              daysOffset: 14, statusOptions: WEBSITE_STATUS_OPTIONS },
  website_15:         { name: 'Website 15 Page',                       taskType: 'website',         ownerRole: 'designer',              daysOffset: 14, statusOptions: WEBSITE_STATUS_OPTIONS },
  landing_pages_20:   { name: 'Landing Pages 20',                      taskType: 'landing_pages',   ownerRole: 'marketing',             daysOffset: 21, statusOptions: LANDING_PAGES_STATUS_OPTIONS },
  landing_pages_50:   { name: 'Landing Pages 50',                      taskType: 'landing_pages',   ownerRole: 'marketing',             daysOffset: 21, statusOptions: LANDING_PAGES_STATUS_OPTIONS },
  landing_pages_100:  { name: 'Landing Pages 100',                     taskType: 'landing_pages',   ownerRole: 'marketing',             daysOffset: 21, statusOptions: LANDING_PAGES_STATUS_OPTIONS },
  blogs_3:            { name: 'Blogs 3 Months',                        taskType: 'blogs',           ownerRole: 'marketing',             daysOffset: 30, statusOptions: BLOGS_STATUS_OPTIONS },
  blogs_6:            { name: 'Blogs 6 Months',                        taskType: 'blogs',           ownerRole: 'marketing',             daysOffset: 30, statusOptions: BLOGS_STATUS_OPTIONS },
  blogs_12:           { name: 'Blogs 12 Months',                       taskType: 'blogs',           ownerRole: 'marketing',             daysOffset: 30, statusOptions: BLOGS_STATUS_OPTIONS },
  ai_chat:            { name: 'AI Chat',                               taskType: 'ai_chat',         ownerRole: 'onboarding_specialist', daysOffset: 21, statusOptions: AI_CHAT_STATUS_OPTIONS },
  social_1:           { name: 'Social Media 1 Post/Week',              taskType: 'social_media',    ownerRole: 'marketing',             daysOffset: 14, statusOptions: SOCIAL_MEDIA_STATUS_OPTIONS },
  social_2:           { name: 'Social Media 2 Posts/Week',             taskType: 'social_media',    ownerRole: 'marketing',             daysOffset: 14, statusOptions: SOCIAL_MEDIA_STATUS_OPTIONS },
  bookings:           { name: 'Online Bookings',                       taskType: 'bookings',        ownerRole: 'onboarding_specialist', daysOffset: 21, statusOptions: BOOKINGS_STATUS_OPTIONS },
  ecommerce_basic:    { name: 'Ecommerce Basic',                      taskType: 'ecommerce',       ownerRole: 'onboarding_specialist', daysOffset: 21, statusOptions: ECOMMERCE_STATUS_OPTIONS },
  ecommerce_advanced: { name: 'Ecommerce Advanced',                   taskType: 'ecommerce',       ownerRole: 'onboarding_specialist', daysOffset: 21, statusOptions: ECOMMERCE_STATUS_OPTIONS },
  sms_marketing:      { name: 'SMS Marketing',                        taskType: 'sms_marketing',   ownerRole: 'marketing',             daysOffset: 30, statusOptions: SMS_MARKETING_STATUS_OPTIONS },
  email_marketing:    { name: 'Email Marketing',                      taskType: 'email_marketing', ownerRole: 'marketing',             daysOffset: 30, statusOptions: EMAIL_MARKETING_STATUS_OPTIONS },
  directories:        { name: 'Local Directories',                     taskType: 'directories',     ownerRole: 'onboarding_specialist', daysOffset: 14, statusOptions: DIRECTORIES_STATUS_OPTIONS },
  gbp:                { name: 'Google Business Profile Optimization',  taskType: 'gbp',             ownerRole: 'onboarding_specialist', daysOffset: 14, statusOptions: GBP_STATUS_OPTIONS },
} as const;

export type ComponentKey = keyof typeof COMPONENT_LIBRARY;

export const COMPONENT_KEYS = Object.keys(COMPONENT_LIBRARY) as ComponentKey[];

export const PRODUCT_BUNDLES: Record<string, ComponentKey[]> = {
  DISCOVER:  ['website_5',  'landing_pages_20',  'ai_chat', 'directories', 'gbp'],
  BOOST:     ['website_10', 'landing_pages_50',  'ai_chat', 'directories', 'gbp', 'bookings', 'social_1',  'blogs_3',  'email_marketing', 'sms_marketing'],
  DOMINATE:  ['website_15', 'landing_pages_100', 'ai_chat', 'directories', 'gbp', 'bookings', 'social_2',  'blogs_12', 'email_marketing', 'sms_marketing', 'ecommerce_advanced'],
};

// Visual grouping for the component picker UI
export const COMPONENT_GROUPS: { label: string; keys: ComponentKey[] }[] = [
  { label: 'Website',    keys: ['website_5', 'website_10', 'website_15'] },
  { label: 'Landing Pages', keys: ['landing_pages_20', 'landing_pages_50', 'landing_pages_100'] },
  { label: 'Blogs',      keys: ['blogs_3', 'blogs_6', 'blogs_12'] },
  { label: 'Content',    keys: ['ai_chat', 'social_1', 'social_2'] },
  { label: 'Tools',      keys: ['bookings', 'ecommerce_basic', 'ecommerce_advanced'] },
  { label: 'Marketing',  keys: ['sms_marketing', 'email_marketing'] },
  { label: 'Visibility',  keys: ['directories', 'gbp'] },
];

// ━━━ Backward-compatible aliases ━━━
// These map the old flat template keys to the new component library for existing code that references them.

export const ONBOARDING_TASK_TEMPLATES: Record<string, TaskTemplate> = Object.fromEntries(
  Object.entries(COMPONENT_LIBRARY).map(([key, comp]) => [
    comp.taskType === 'ecommerce' ? key : comp.taskType, // use taskType as key for non-duplicates
    {
      itemName: comp.name,
      taskType: comp.taskType,
      ownerRole: comp.ownerRole,
      daysOffset: comp.daysOffset,
      isConditional: false,
      statusOptions: [...comp.statusOptions],
    },
  ])
);
// Ensure we have all the old keys the codebase expects (first occurrence per taskType wins, plus legacy keys)
(() => {
  // The old templates had these exact keys. Make sure they exist:
  const legacy: Record<string, { source: ComponentKey }> = {
    website: { source: 'website_5' },
    landing_pages: { source: 'landing_pages_20' },
    blogs: { source: 'blogs_3' },
    ai_chat: { source: 'ai_chat' },
    social_media: { source: 'social_1' },
    bookings: { source: 'bookings' },
    email_marketing: { source: 'email_marketing' },
    sms_marketing: { source: 'sms_marketing' },
    directories: { source: 'directories' },
    gbp: { source: 'gbp' },
  };
  for (const [key, { source }] of Object.entries(legacy)) {
    const comp = COMPONENT_LIBRARY[source];
    ONBOARDING_TASK_TEMPLATES[key] = {
      itemName: comp.name,
      taskType: comp.taskType,
      ownerRole: comp.ownerRole,
      daysOffset: comp.daysOffset,
      isConditional: false,
      statusOptions: [...comp.statusOptions],
    };
  }
})();

export const PRODUCT_TASK_MAP: Record<string, string[]> = {
  'DISCOVER': PRODUCT_BUNDLES.DISCOVER.map(k => COMPONENT_LIBRARY[k].taskType),
  'BOOST': PRODUCT_BUNDLES.BOOST.map(k => COMPONENT_LIBRARY[k].taskType),
  'DOMINATE': PRODUCT_BUNDLES.DOMINATE.map(k => COMPONENT_LIBRARY[k].taskType),
};

// Legacy constant kept for backward compatibility during transition
export const ONBOARDING_ITEMS = Object.values(COMPONENT_LIBRARY).map(c => ({
  itemName: c.name,
  daysOffset: c.daysOffset,
}));

// ━━━ Stripe Price IDs (live) ━━━
export const STRIPE_PRICE_IDS: Record<string, string> = {
  DISCOVER: 'price_1ShamzJdCDYxERimazBbXFQM',
  BOOST: 'price_1Sf2b9JdCDYxERimXLjtfVYq',
  DOMINATE: 'price_1SmiAOJdCDYxERimC2HsmRW7',
};

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
