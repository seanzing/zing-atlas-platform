// Phase 1 default organization ID (single-tenant)
export const ORG_ID = "00000000-0000-0000-0000-000000000001";

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
