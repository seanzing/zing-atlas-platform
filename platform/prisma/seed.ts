import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Default organization ID for ZING (single-tenant Phase 1)
const ORG_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  console.log("Seeding Atlas database...");

  // ━━━ Campaigns ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const campaignMap: Record<string, string> = {};
  const campaigns = [
    { name: "Feb SMS Blast - Local Dentists", type: "sms-blast", status: "completed", contactCount: 4200 },
    { name: "Q1 Email Nurture Series", type: "email", status: "active", contactCount: 8500 },
    { name: "Google Ads - HVAC Owners", type: "paid-ads", status: "active", contactCount: 12300 },
    { name: "InfoUSA - Chiropractors List", type: "purchased-list", status: "completed", contactCount: 25000 },
    { name: "Partner Referral - Chamber of Commerce", type: "referral", status: "active", contactCount: 340 },
  ];

  for (let i = 0; i < campaigns.length; i++) {
    const c = await prisma.campaign.create({
      data: { organizationId: ORG_ID, ...campaigns[i] },
    });
    campaignMap[`CMP-${i + 1}`] = c.id;
  }
  console.log(`  ✓ ${campaigns.length} campaigns`);

  // ━━━ Products ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const productMap: Record<string, string> = {};
  const products = [
    { key: "PRD-1001", description: "DISCOVER - Website + Marketing", price: 59, category: "subscription-monthly", commissionType: "mrr-multiplier", commissionValue: 1 },
    { key: "PRD-1002", description: "BOOST - Website + Marketing Package", price: 149, category: "subscription-monthly", commissionType: "mrr-multiplier", commissionValue: 1 },
    { key: "PRD-1003", description: "DOMINATE - Website + Marketing Package", price: 249, category: "subscription-monthly", commissionType: "mrr-multiplier", commissionValue: 2 },
  ];

  for (const p of products) {
    const { key, ...data } = p;
    const created = await prisma.product.create({
      data: { organizationId: ORG_ID, ...data },
    });
    productMap[key] = created.id;
  }
  console.log(`  ✓ ${products.length} products`);

  // ━━━ Designers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const designers = [
    { name: "Raj Patel", team: "offshore" },
    { name: "Priya Sharma", team: "offshore" },
    { name: "Arjun Singh", team: "offshore" },
    { name: "Meera Nair", team: "offshore" },
    { name: "Vikram Das", team: "offshore" },
    { name: "Alex Morgan", team: "us" },
    { name: "Jordan Lee", team: "us" },
    { name: "Sam Rivera", team: "us" },
    { name: "Casey Taylor", team: "us" },
    { name: "Riley Chen", team: "us" },
    { name: "Nina Walsh", team: "publishing" },
    { name: "Derek Huang", team: "publishing" },
  ];

  for (const d of designers) {
    await prisma.designer.create({
      data: { organizationId: ORG_ID, ...d, active: true },
    });
  }
  console.log(`  ✓ ${designers.length} designers`);

  // ━━━ Team Members ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const teamMembers = [
    { firstName: "Eric", lastName: "Stark", phone: "+1 415-555-0201", email: "eric@zinglocal.com", monthlyTarget: 3000, role: "Sales Rep" },
    { firstName: "Elliot", lastName: "Farmer", phone: "+1 312-555-0202", email: "elliot@zinglocal.com", monthlyTarget: 3000, role: "Sales Rep" },
    { firstName: "Elizabeth", lastName: "Adams", phone: "+1 628-555-0203", email: "elizabeth@zinglocal.com", monthlyTarget: 2500, role: "Sales Rep" },
    { firstName: "Caden", lastName: "Wrightmen", phone: "+1 213-555-0204", email: "caden@zinglocal.com", monthlyTarget: 2500, role: "Sales Rep" },
    { firstName: "Jon", lastName: "Alcon", phone: "+1 650-555-0205", email: "jon@zinglocal.com", monthlyTarget: 2000, role: "Sales Rep" },
    { firstName: "Jake", lastName: "Friss", phone: "+1 718-555-0206", email: "jake@zinglocal.com", monthlyTarget: 2000, role: "Sales Rep" },
    { firstName: "Zach", lastName: "Meade", phone: "+1 408-555-0207", email: "zach@zinglocal.com", monthlyTarget: 2000, role: "Sales Rep" },
  ];

  for (const t of teamMembers) {
    await prisma.teamMember.create({
      data: { organizationId: ORG_ID, ...t, active: true },
    });
  }
  console.log(`  ✓ ${teamMembers.length} team members`);

  // ━━━ Contacts ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const contactMap: Record<string, string> = {};
  const contacts = [
    { key: "Sarah Chen", name: "Sarah Chen", email: "sarah@acmecorp.com", secondaryEmail: "schen.personal@gmail.com", company: "Acme Corp", phone: "+1 415-555-0142", status: "Live Customer", lastContact: "2025-02-28", value: 249, avatar: "SC", notes: "Key decision maker for enterprise deal", leadSource: "Email", campaignKey: "CMP-2" },
    { key: "Marcus Johnson", name: "Marcus Johnson", email: "marcus@globex.io", secondaryEmail: "marcus.j@outlook.com", company: "Globex Industries", phone: "+1 312-555-0198", status: "Live Customer", lastContact: "2025-02-25", value: 149, avatar: "MJ", notes: "Interested in premium tier", leadSource: "Paid", campaignKey: "CMP-3" },
    { key: "David Kim", name: "David Kim", email: "david@wayneent.com", company: "Wayne Enterprises", phone: "+1 213-555-0156", status: "Live Customer", lastContact: "2025-02-27", value: 249, avatar: "DK", notes: "Renewal coming up in Q2", leadSource: "SMS", campaignKey: "CMP-1" },
    { key: "Aisha Mohammed", name: "Aisha Mohammed", email: "aisha@cyberdyne.ai", company: "Cyberdyne Systems", phone: "+1 408-555-0121", status: "Live Customer", lastContact: "2025-02-24", value: 249, avatar: "AM", notes: "Expanding to 3 more seats", leadSource: "Email", campaignKey: "CMP-2" },
    { key: "Ryan Cole", name: "Ryan Cole", email: "ryan@peakfitness.com", company: "Peak Fitness Studio", phone: "+1 303-555-0189", status: "Live Customer", lastContact: "2025-03-10", value: 149, avatar: "RC", notes: "Happy customer, potential referral source", leadSource: "SMS", campaignKey: "CMP-1" },
    { key: "Amy Lin", name: "Amy Lin", email: "amy@riversidedental.com", company: "Riverside Dental", phone: "+1 720-555-0134", status: "Live Customer", lastContact: "2025-03-12", value: 249, avatar: "AL", notes: "Upgraded from DISCOVER to DOMINATE", leadSource: "Email", campaignKey: "CMP-2" },
    { key: "Elena Rodriguez", name: "Elena Rodriguez", email: "elena@stark.io", company: "Stark Industries", phone: "+1 650-555-0134", status: "Cancelled", lastContact: "2025-01-15", value: 59, avatar: "ER", notes: "Cancelled - said budget was the issue. Follow up in Q3", leadSource: "Paid", campaignKey: "CMP-3" },
    { key: "Derek Nash", name: "Derek Nash", email: "derek@metroplumb.com", company: "Metro Plumbing Co", phone: "+1 303-555-0167", status: "Cancelled", lastContact: "2025-02-10", value: 149, avatar: "DN", notes: "Cancelled after 3 months - wasn't seeing ROI. Win-back in 90 days", leadSource: "SMS", campaignKey: "CMP-1" },
    { key: "Priya Patel", name: "Priya Patel", email: "priya@initech.com", company: "Initech Solutions", phone: "+1 628-555-0173", status: "Active Lead", lastContact: "2025-02-20", value: 249, avatar: "PP", notes: "Referred by Marcus Johnson", leadSource: "Email", campaignKey: "CMP-5" },
    { key: "James Wright", name: "James Wright", email: "james@umbrella.co", company: "Umbrella Corp", phone: "+1 718-555-0187", status: "Active Lead", lastContact: "2025-02-26", value: 149, avatar: "JW", notes: "Demo scheduled for next week", leadSource: "SMS", campaignKey: "CMP-1" },
    { key: "Tom Bailey", name: "Tom Bailey", email: "tom@oscorp.net", company: "Oscorp", phone: "+1 917-555-0145", status: "Active Lead", lastContact: "2025-02-22", value: 59, avatar: "TB", notes: "Small team, budget-conscious", leadSource: "Paid", campaignKey: "CMP-4" },
    { key: "Nina Torres", name: "Nina Torres", email: "nina@summitlegal.com", company: "Summit Legal Group", phone: "+1 303-555-0198", status: "Active Lead", lastContact: "2025-03-18", value: 149, avatar: "NT", notes: "Spoke on phone - interested in BOOST. Call back Thursday", leadSource: "Email", campaignKey: "CMP-2" },
    { key: "Carlos Ruiz", name: "Carlos Ruiz", email: "carlos@ironsideauto.com", company: "Ironside Auto Repair", phone: "+1 720-555-0156", status: "Active Lead", lastContact: "2025-03-15", value: 59, avatar: "CR", notes: "Responded to SMS campaign. Wants a callback", leadSource: "SMS", campaignKey: "CMP-1" },
    { key: "Olivia Hart", name: "Olivia Hart", email: "olivia@bloomskin.com", company: "Bloom Skincare", phone: "+1 303-555-0145", status: "Active Lead", lastContact: "2025-03-20", value: 249, avatar: "OH", notes: "Booked appointment for demo. High interest in DOMINATE", leadSource: "Paid", campaignKey: "CMP-3" },
    { key: "Gary Simmons", name: "Gary Simmons", email: "gary@simmonshvac.com", company: "Simmons HVAC", phone: "+1 720-555-0178", status: "DNC", lastContact: "2025-01-05", value: 0, avatar: "GS", notes: "Requested do not contact. Remove from all campaigns", leadSource: "SMS", campaignKey: "CMP-1" },
    { key: "Lisa Park", name: "Lisa Park", email: "lisa@parkcleaners.com", company: "Park Dry Cleaners", phone: "+1 303-555-0112", status: "DNC", lastContact: "2025-01-20", value: 0, avatar: "LP", notes: "Replied STOP to SMS. Added to DNC list", leadSource: "SMS", campaignKey: "CMP-1" },
  ];

  for (const c of contacts) {
    const { key, campaignKey, lastContact, ...data } = c;
    const created = await prisma.contact.create({
      data: {
        organizationId: ORG_ID,
        ...data,
        lastContact: lastContact ? new Date(lastContact) : null,
        campaignId: campaignMap[campaignKey] || null,
      },
    });
    contactMap[key] = created.id;
  }
  console.log(`  ✓ ${contacts.length} contacts`);

  // ━━━ Deals ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const dealMap: Record<number, string> = {};
  const deals = [
    // Active pipeline deals
    { origId: 1, title: "Acme Corp Enterprise", contact: "Sarah Chen", stage: "appointment", probability: 75, dueDate: "2025-03-15", priority: "high", rep: "Eric" },
    { origId: 9, title: "Summit Legal Group", contact: "Nina Torres", stage: "call-now", probability: 30, dueDate: "2025-04-05", priority: "medium", rep: "Eric" },
    { origId: 10, title: "Peak Fitness Studio", contact: "Ryan Cole", stage: "active", probability: 60, dueDate: "2025-02-20", priority: "low", rep: "Eric" },
    { origId: 2, title: "Globex Premium Upgrade", contact: "Marcus Johnson", stage: "hot-72", probability: 60, dueDate: "2025-03-20", priority: "medium", rep: "Elliot" },
    { origId: 11, title: "Riverside Dental", contact: "Amy Lin", stage: "appointment", probability: 70, dueDate: "2025-03-18", priority: "medium", rep: "Elliot" },
    { origId: 12, title: "Craft & Co Bakery", contact: "Sam Ellis", stage: "call-no-answer", probability: 20, dueDate: "2025-04-12", priority: "low", rep: "Elliot" },
    { origId: 3, title: "Initech Full Suite", contact: "Priya Patel", stage: "marketing-appt", probability: 40, dueDate: "2025-04-01", priority: "high", rep: "Elizabeth" },
    { origId: 13, title: "Bloom Skincare", contact: "Olivia Hart", stage: "hot-72", probability: 55, dueDate: "2025-03-22", priority: "medium", rep: "Elizabeth" },
    { origId: 14, title: "Metro Plumbing Co", contact: "Derek Nash", stage: "active", probability: 65, dueDate: "2025-02-25", priority: "medium", rep: "Elizabeth" },
    { origId: 4, title: "Wayne Ent. Renewal", contact: "David Kim", stage: "appointment", probability: 85, dueDate: "2025-03-10", priority: "high", rep: "Caden" },
    { origId: 15, title: "Brightside Therapy", contact: "Laura Webb", stage: "promo-hot", probability: 35, dueDate: "2025-04-08", priority: "low", rep: "Caden" },
    { origId: 16, title: "Alpine Construction", contact: "Mike Torres", stage: "call-now", probability: 50, dueDate: "2025-03-28", priority: "high", rep: "Caden" },
    { origId: 5, title: "Umbrella Pilot Program", contact: "James Wright", stage: "marketing-appt", probability: 50, dueDate: "2025-03-25", priority: "medium", rep: "Jon" },
    { origId: 17, title: "Fusion Yoga Studio", contact: "Tara Singh", stage: "active", probability: 60, dueDate: "2025-02-18", priority: "low", rep: "Jon" },
    { origId: 18, title: "Cedar Ridge Realty", contact: "Ben Garza", stage: "appt-no-show", probability: 40, dueDate: "2025-03-14", priority: "medium", rep: "Jon" },
    { origId: 6, title: "Cyberdyne Expansion", contact: "Aisha Mohammed", stage: "appointment", probability: 80, dueDate: "2025-02-28", priority: "high", rep: "Jake" },
    { origId: 7, title: "Oscorp Starter", contact: "Tom Bailey", stage: "call-no-answer", probability: 25, dueDate: "2025-04-10", priority: "low", rep: "Jake" },
    { origId: 19, title: "Ironside Auto Repair", contact: "Carlos Ruiz", stage: "hot-72", probability: 45, dueDate: "2025-03-30", priority: "medium", rep: "Jake" },
    { origId: 8, title: "Stark Re-engagement", contact: "Elena Rodriguez", stage: "promo-cold", probability: 20, dueDate: "2025-02-15", priority: "low", rep: "Zach" },
    { origId: 20, title: "Nova Accounting", contact: "Helen Park", stage: "call-now", probability: 70, dueDate: "2025-03-12", priority: "high", rep: "Zach" },
    { origId: 21, title: "Willow Creek Spa", contact: "Jane Foster", stage: "appt-no-show", probability: 30, dueDate: "2025-04-15", priority: "medium", rep: "Zach" },
    // Won deals - Eric Stark
    { origId: 100, title: "Lakeside Chiro", contact: "Dr. Anna Lee", value: 249, stage: "won", probability: 100, dueDate: "2025-03-01", priority: "high", productKey: "PRD-1003", rep: "Eric", wonDate: "2025-03-01", deliveryDate: "2025-03-10", assignedDesigner: "Alex Morgan" },
    { origId: 107, title: "Atlas Moving Co", contact: "Dan Brooks", value: 149, stage: "won", probability: 100, dueDate: "2025-02-15", priority: "medium", productKey: "PRD-1002", rep: "Eric", wonDate: "2025-02-26", deliveryDate: "2025-03-05", assignedDesigner: "Jordan Lee" },
    { origId: 114, title: "Apex Roofing", contact: "Bill Hardy", value: 59, stage: "won", probability: 100, dueDate: "2025-02-16", priority: "low", productKey: "PRD-1001", rep: "Eric", wonDate: "2025-02-21", deliveryDate: "2025-02-28", assignedDesigner: "Sam Rivera" },
    { origId: 200, title: "Titan Plumbing", contact: "Greg Nash", value: 249, stage: "won", probability: 100, dueDate: "2025-02-10", priority: "high", productKey: "PRD-1003", rep: "Eric", wonDate: "2025-02-18", deliveryDate: "2025-02-25", assignedDesigner: "Casey Taylor" },
    // Won deals - Elliot Farmer
    { origId: 101, title: "Greenfield Landscaping", contact: "Mark Dunn", value: 149, stage: "won", probability: 100, dueDate: "2025-02-28", priority: "medium", productKey: "PRD-1002", rep: "Elliot", wonDate: "2025-03-01", deliveryDate: "2025-03-08", assignedDesigner: "Riley Chen" },
    { origId: 108, title: "Coastal Law Group", contact: "Atty. James Liu", value: 249, stage: "won", probability: 100, dueDate: "2025-02-24", priority: "high", productKey: "PRD-1003", rep: "Elliot", wonDate: "2025-02-25", deliveryDate: "2025-03-04", assignedDesigner: "Alex Morgan" },
    { origId: 116, title: "Pacific Wealth Mgmt", contact: "Steven Cho", value: 59, stage: "won", probability: 100, dueDate: "2025-02-12", priority: "low", productKey: "PRD-1001", rep: "Elliot", wonDate: "2025-02-19", deliveryDate: "2025-02-26", assignedDesigner: "Jordan Lee" },
    { origId: 201, title: "Horizon Media Group", contact: "Tanya Wells", value: 249, stage: "won", probability: 100, dueDate: "2025-02-08", priority: "high", productKey: "PRD-1003", rep: "Elliot", wonDate: "2025-02-15", deliveryDate: "2025-02-22", assignedDesigner: "Sam Rivera" },
    // Won deals - Elizabeth Adams
    { origId: 102, title: "Harbor View Realty", contact: "Susan Park", value: 59, stage: "won", probability: 100, dueDate: "2025-02-25", priority: "low", productKey: "PRD-1001", rep: "Elizabeth", wonDate: "2025-02-28", deliveryDate: "2025-03-07", assignedDesigner: "Casey Taylor" },
    { origId: 109, title: "Bright Smiles Ortho", contact: "Dr. Patel", value: 149, stage: "won", probability: 100, dueDate: "2025-02-20", priority: "medium", productKey: "PRD-1002", rep: "Elizabeth", wonDate: "2025-02-25", deliveryDate: "2025-03-03", assignedDesigner: "Riley Chen" },
    { origId: 117, title: "River Rock Massage", contact: "Jenny Flores", value: 249, stage: "won", probability: 100, dueDate: "2025-02-08", priority: "high", productKey: "PRD-1003", rep: "Elizabeth", wonDate: "2025-02-18", deliveryDate: "2025-02-25", assignedDesigner: "Alex Morgan" },
    { origId: 202, title: "Zenith Dance Studio", contact: "Maria Costa", value: 149, stage: "won", probability: 100, dueDate: "2025-02-14", priority: "medium", productKey: "PRD-1002", rep: "Elizabeth", wonDate: "2025-02-20", deliveryDate: "2025-02-27", assignedDesigner: "Jordan Lee" },
    // Won deals - Caden Wrightmen
    { origId: 103, title: "Pinnacle Fitness", contact: "Jake Tran", value: 249, stage: "won", probability: 100, dueDate: "2025-02-20", priority: "high", productKey: "PRD-1003", rep: "Caden", wonDate: "2025-02-28", deliveryDate: "2025-03-07", assignedDesigner: "Sam Rivera" },
    { origId: 110, title: "Metro Auto Detail", contact: "Tony Reeves", value: 59, stage: "won", probability: 100, dueDate: "2025-02-19", priority: "low", productKey: "PRD-1001", rep: "Caden", wonDate: "2025-02-24", deliveryDate: "2025-03-01", assignedDesigner: "Casey Taylor" },
    { origId: 115, title: "Elm Street Cafe", contact: "Rosa Vega", value: 149, stage: "won", probability: 100, dueDate: "2025-02-10", priority: "medium", productKey: "PRD-1002", rep: "Caden", wonDate: "2025-02-20", deliveryDate: "2025-02-27", assignedDesigner: "Riley Chen" },
    { origId: 203, title: "Crestview Insurance", contact: "Bill Tanner", value: 249, stage: "won", probability: 100, dueDate: "2025-02-06", priority: "high", productKey: "PRD-1003", rep: "Caden", wonDate: "2025-02-14", deliveryDate: "2025-02-21", assignedDesigner: "Alex Morgan" },
    // Won deals - Jon Alcon
    { origId: 104, title: "Downtown Dental", contact: "Dr. Rita Gomez", value: 149, stage: "won", probability: 100, dueDate: "2025-02-26", priority: "medium", productKey: "PRD-1002", rep: "Jon", wonDate: "2025-02-27", deliveryDate: "2025-03-06", assignedDesigner: "Jordan Lee" },
    { origId: 111, title: "Summit HR Solutions", contact: "Karen Wells", value: 249, stage: "won", probability: 100, dueDate: "2025-02-17", priority: "high", productKey: "PRD-1003", rep: "Jon", wonDate: "2025-02-24", deliveryDate: "2025-03-03", assignedDesigner: "Sam Rivera" },
    { origId: 204, title: "Quick Print Shop", contact: "Leo Grant", value: 59, stage: "won", probability: 100, dueDate: "2025-02-11", priority: "low", productKey: "PRD-1001", rep: "Jon", wonDate: "2025-02-17", deliveryDate: "2025-02-24", assignedDesigner: "Casey Taylor" },
    { origId: 205, title: "Clearwater HVAC", contact: "Tom Hardy", value: 149, stage: "won", probability: 100, dueDate: "2025-03-01", priority: "medium", productKey: "PRD-1002", rep: "Jon", wonDate: "2025-03-01", deliveryDate: "2025-03-10", assignedDesigner: "Riley Chen" },
    // Won deals - Jake Friss
    { origId: 105, title: "Redwood Accounting", contact: "Phil Chen", value: 249, stage: "won", probability: 100, dueDate: "2025-02-22", priority: "high", productKey: "PRD-1003", rep: "Jake", wonDate: "2025-02-27", deliveryDate: "2025-03-06", assignedDesigner: "Alex Morgan" },
    { origId: 112, title: "Valley Pet Clinic", contact: "Dr. Amy Tran", value: 149, stage: "won", probability: 100, dueDate: "2025-02-21", priority: "medium", productKey: "PRD-1002", rep: "Jake", wonDate: "2025-02-23", deliveryDate: "2025-03-02", assignedDesigner: "Jordan Lee" },
    { origId: 206, title: "Northside Tattoo", contact: "Mike Reeves", value: 59, stage: "won", probability: 100, dueDate: "2025-02-13", priority: "low", productKey: "PRD-1001", rep: "Jake", wonDate: "2025-02-19", deliveryDate: "2025-02-26", assignedDesigner: "Sam Rivera" },
    { origId: 207, title: "Elite Boxing Gym", contact: "Ray Torres", value: 249, stage: "won", probability: 100, dueDate: "2025-02-09", priority: "high", productKey: "PRD-1003", rep: "Jake", wonDate: "2025-02-16", deliveryDate: "2025-02-23", assignedDesigner: "Casey Taylor" },
    // Won deals - Zach Meade
    { origId: 106, title: "Sunrise Bakery", contact: "Maria Santos", value: 59, stage: "won", probability: 100, dueDate: "2025-02-18", priority: "low", productKey: "PRD-1001", rep: "Zach", wonDate: "2025-02-26", deliveryDate: "2025-03-05", assignedDesigner: "Riley Chen" },
    { origId: 113, title: "Core Pilates Studio", contact: "Lisa Monroe", value: 149, stage: "won", probability: 100, dueDate: "2025-02-14", priority: "medium", productKey: "PRD-1002", rep: "Zach", wonDate: "2025-02-22", deliveryDate: "2025-03-01", assignedDesigner: "Alex Morgan" },
    { origId: 208, title: "Prime Steak House", contact: "Chef Marco", value: 249, stage: "won", probability: 100, dueDate: "2025-02-15", priority: "high", productKey: "PRD-1003", rep: "Zach", wonDate: "2025-02-21", deliveryDate: "2025-02-28", assignedDesigner: "Jordan Lee" },
    { origId: 209, title: "Golden Age Senior Care", contact: "Nurse Pat", value: 59, stage: "won", probability: 100, dueDate: "2025-02-07", priority: "low", productKey: "PRD-1001", rep: "Zach", wonDate: "2025-02-14", deliveryDate: "2025-02-21", assignedDesigner: "Sam Rivera" },
    // Upgrade deals
    { origId: 300, title: "Lakeside Chiro Upgrade", contact: "Dr. Anna Lee", value: 249, stage: "won", probability: 100, dueDate: "2025-03-01", priority: "high", productKey: "PRD-1003", rep: "Eric", wonDate: "2025-03-01", deliveryDate: "2025-03-08", assignedDesigner: "Alex Morgan", dealType: "upgrade" },
    { origId: 301, title: "Harbor View Realty Upgrade", contact: "Susan Park", value: 149, stage: "won", probability: 100, dueDate: "2025-02-28", priority: "medium", productKey: "PRD-1002", rep: "Elliot", wonDate: "2025-02-28", deliveryDate: "2025-03-05", assignedDesigner: "Jordan Lee", dealType: "upgrade" },
    { origId: 302, title: "Metro Auto Detail Upgrade", contact: "Tony Reeves", value: 149, stage: "won", probability: 100, dueDate: "2025-02-26", priority: "medium", productKey: "PRD-1002", rep: "Jake", wonDate: "2025-02-26", deliveryDate: "2025-03-04", assignedDesigner: "Casey Taylor", dealType: "upgrade" },
    // Add-on deals
    { origId: 310, title: "Pinnacle Fitness Add-on", contact: "Jake Tran", value: 59, stage: "won", probability: 100, dueDate: "2025-03-01", priority: "low", productKey: "PRD-1001", rep: "Caden", wonDate: "2025-03-01", deliveryDate: "2025-03-08", assignedDesigner: "Riley Chen", dealType: "add-on" },
    { origId: 311, title: "Downtown Dental Add-on", contact: "Dr. Rita Gomez", value: 59, stage: "won", probability: 100, dueDate: "2025-02-27", priority: "low", productKey: "PRD-1001", rep: "Jon", wonDate: "2025-02-27", deliveryDate: "2025-03-05", assignedDesigner: "Sam Rivera", dealType: "add-on" },
    { origId: 312, title: "Sunrise Bakery Add-on", contact: "Maria Santos", value: 149, stage: "won", probability: 100, dueDate: "2025-02-28", priority: "medium", productKey: "PRD-1002", rep: "Zach", wonDate: "2025-02-28", deliveryDate: "2025-03-06", assignedDesigner: "Alex Morgan", dealType: "add-on" },
  ];

  for (const d of deals) {
    const { origId, contact, productKey, wonDate, deliveryDate, dueDate, dealType, ...data } = d;
    const created = await prisma.deal.create({
      data: {
        organizationId: ORG_ID,
        ...data,
        contactId: contactMap[contact] || null,
        contactName: contact,
        productId: productKey ? productMap[productKey] : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        wonDate: wonDate ? new Date(wonDate) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        dealType: dealType || "new",
        paymentStatus: d.stage === "won" ? "confirmed" : "pending",
      },
    });
    dealMap[origId] = created.id;
  }
  console.log(`  ✓ ${deals.length} deals`);

  // ━━━ Tickets ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const tickets = [
    { subject: "Login issues after update", contact: "Sarah Chen", priority: "high", status: "open", category: "Bug", description: "Unable to access dashboard after v2.4 update" },
    { subject: "API rate limiting questions", contact: "David Kim", priority: "medium", status: "in-progress", category: "Question", description: "Need clarification on enterprise tier rate limits" },
    { subject: "Data export not working", contact: "Marcus Johnson", priority: "high", status: "open", category: "Bug", description: "CSV export times out on large datasets" },
    { subject: "Feature request: Bulk import", contact: "Priya Patel", priority: "low", status: "open", category: "Feature Request", description: "Requesting bulk contact import via CSV" },
    { subject: "Billing discrepancy", contact: "Aisha Mohammed", priority: "high", status: "in-progress", category: "Billing", description: "Charged for 5 seats but only using 3" },
    { subject: "SSO configuration help", contact: "David Kim", priority: "medium", status: "resolved", category: "Question", description: "Need help setting up SAML SSO" },
    { subject: "Mobile app crash", contact: "Tom Bailey", priority: "high", status: "open", category: "Bug", description: "App crashes on Android 14 when opening reports" },
  ];

  for (const t of tickets) {
    const { contact, ...data } = t;
    await prisma.ticket.create({
      data: {
        organizationId: ORG_ID,
        ...data,
        contactId: contactMap[contact] || null,
        contactName: contact,
      },
    });
  }
  console.log(`  ✓ ${tickets.length} tickets`);

  // ━━━ Onboarding ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const onboardingData = [
    { customerName: "Dr. Anna Lee", businessName: "Lakeside Chiropractic", phone: "+1 415-555-0301", email: "anna@lakesidechiro.com", existingUrl: "www.lakesidechiro.com", newUrl: "lakesidechiro.zinglocal.com", offshoreDesigner: "Raj Patel", usDesigner: "Alex Morgan", rep: "Eric", productKey: "PRD-1003", value: 249, wonDate: "2025-01-15", status: "active",
      items: { "Website Design": "ready-publishing", "AI Chat": "complete", "Landing Pages": "in-progress", "Blogs": "outstanding", "Online Bookings": "complete", "Memberships": "outstanding", "Social Media": "in-progress", "SMS Marketing": "outstanding", "Email Marketing": "outstanding", "GBP Optimization": "complete", "Google Business Reviews": "in-progress", "Local Directories": "outstanding" },
      owners: { "Website Design": "Raj Patel", "AI Chat": "Alex Morgan", "Landing Pages": "Raj Patel", "Blogs": "", "Online Bookings": "Alex Morgan", "Memberships": "", "Social Media": "Alex Morgan", "SMS Marketing": "", "Email Marketing": "", "GBP Optimization": "Alex Morgan", "Google Business Reviews": "Alex Morgan", "Local Directories": "" },
      webOwners: { "website-started": "Raj Patel", "first-draft": "Raj Patel", "website-sent": "Alex Morgan", "edits-mode": "Alex Morgan", "ready-qa": "Alex Morgan", "ready-publishing": "Nina Walsh", "complete": "" },
      dueDates: { "Website Design": "2025-01-29", "AI Chat": "2025-02-05", "Landing Pages": "2025-02-05", "Blogs": "2025-02-14", "Online Bookings": "2025-02-05", "Memberships": "2025-02-14", "Social Media": "2025-01-29", "SMS Marketing": "2025-02-14", "Email Marketing": "2025-02-14", "GBP Optimization": "2025-01-29", "Google Business Reviews": "2025-02-05", "Local Directories": "2025-02-14" } },
    { customerName: "Marcus Rivera", businessName: "Harbor View Realty", phone: "+1 312-555-0302", email: "marcus@harborview.com", existingUrl: "www.harborviewrealty.com", newUrl: "harborviewrealty.zinglocal.com", offshoreDesigner: "Priya Sharma", usDesigner: "Jordan Lee", rep: "Elliot", productKey: "PRD-1002", value: 149, wonDate: "2025-01-20", status: "active",
      items: { "Website Design": "edits-mode", "AI Chat": "outstanding", "Landing Pages": "complete", "Blogs": "outstanding", "Online Bookings": "in-progress", "Memberships": "outstanding", "Social Media": "complete", "SMS Marketing": "outstanding", "Email Marketing": "review", "GBP Optimization": "in-progress", "Google Business Reviews": "outstanding", "Local Directories": "outstanding" },
      owners: { "Website Design": "Priya Sharma", "AI Chat": "", "Landing Pages": "Jordan Lee", "Blogs": "", "Online Bookings": "Jordan Lee", "Memberships": "", "Social Media": "Jordan Lee", "SMS Marketing": "", "Email Marketing": "Priya Sharma", "GBP Optimization": "Jordan Lee", "Google Business Reviews": "", "Local Directories": "" },
      webOwners: { "website-started": "Priya Sharma", "first-draft": "Priya Sharma", "website-sent": "Jordan Lee", "edits-mode": "Jordan Lee", "ready-qa": "", "ready-publishing": "", "complete": "" },
      dueDates: { "Website Design": "2025-02-03", "AI Chat": "2025-02-10", "Landing Pages": "2025-02-10", "Blogs": "2025-02-19", "Online Bookings": "2025-02-10", "Memberships": "2025-02-19", "Social Media": "2025-02-03", "SMS Marketing": "2025-02-19", "Email Marketing": "2025-02-19", "GBP Optimization": "2025-02-03", "Google Business Reviews": "2025-02-10", "Local Directories": "2025-02-19" } },
    { customerName: "Susan Park", businessName: "Peak Dental Care", phone: "+1 628-555-0303", email: "susan@peakdental.com", existingUrl: "", newUrl: "peakdentalcare.zinglocal.com", offshoreDesigner: "Arjun Singh", usDesigner: "Sam Rivera", rep: "Elizabeth", productKey: "PRD-1003", value: 249, wonDate: "2025-02-01", status: "active",
      items: { "Website Design": "complete", "AI Chat": "complete", "Landing Pages": "complete", "Blogs": "complete", "Online Bookings": "complete", "Memberships": "complete", "Social Media": "complete", "SMS Marketing": "complete", "Email Marketing": "in-progress", "GBP Optimization": "complete", "Google Business Reviews": "complete", "Local Directories": "review" },
      owners: { "Website Design": "Arjun Singh", "AI Chat": "Sam Rivera", "Landing Pages": "Arjun Singh", "Blogs": "Sam Rivera", "Online Bookings": "Sam Rivera", "Memberships": "Sam Rivera", "Social Media": "Sam Rivera", "SMS Marketing": "Sam Rivera", "Email Marketing": "Arjun Singh", "GBP Optimization": "Sam Rivera", "Google Business Reviews": "Sam Rivera", "Local Directories": "Sam Rivera" },
      webOwners: { "website-started": "Arjun Singh", "first-draft": "Arjun Singh", "website-sent": "Sam Rivera", "edits-mode": "Sam Rivera", "ready-qa": "Sam Rivera", "ready-publishing": "Derek Huang", "complete": "Derek Huang" },
      dueDates: { "Website Design": "2025-02-15", "AI Chat": "2025-02-22", "Landing Pages": "2025-02-22", "Blogs": "2025-03-03", "Online Bookings": "2025-02-22", "Memberships": "2025-03-03", "Social Media": "2025-02-15", "SMS Marketing": "2025-03-03", "Email Marketing": "2025-03-03", "GBP Optimization": "2025-02-15", "Google Business Reviews": "2025-02-22", "Local Directories": "2025-03-03" } },
    { customerName: "Tony Reeves", businessName: "Metro Auto Detail", phone: "+1 213-555-0304", email: "tony@metroauto.com", existingUrl: "www.metroautodetail.net", newUrl: "metroautodetail.zinglocal.com", offshoreDesigner: "Meera Nair", usDesigner: "Casey Taylor", rep: "Jake", productKey: "PRD-1002", value: 149, wonDate: "2025-02-10", status: "active",
      items: { "Website Design": "website-started", "AI Chat": "outstanding", "Landing Pages": "outstanding", "Blogs": "outstanding", "Online Bookings": "outstanding", "Memberships": "outstanding", "Social Media": "outstanding", "SMS Marketing": "outstanding", "Email Marketing": "outstanding", "GBP Optimization": "outstanding", "Google Business Reviews": "outstanding", "Local Directories": "outstanding" },
      owners: { "Website Design": "Meera Nair", "AI Chat": "", "Landing Pages": "", "Blogs": "", "Online Bookings": "", "Memberships": "", "Social Media": "", "SMS Marketing": "", "Email Marketing": "", "GBP Optimization": "", "Google Business Reviews": "", "Local Directories": "" },
      webOwners: { "website-started": "Meera Nair", "first-draft": "", "website-sent": "", "edits-mode": "", "ready-qa": "", "ready-publishing": "", "complete": "" },
      dueDates: { "Website Design": "2025-02-24", "AI Chat": "2025-03-03", "Landing Pages": "2025-03-03", "Blogs": "2025-03-12", "Online Bookings": "2025-03-03", "Memberships": "2025-03-12", "Social Media": "2025-02-24", "SMS Marketing": "2025-03-12", "Email Marketing": "2025-03-12", "GBP Optimization": "2025-02-24", "Google Business Reviews": "2025-03-03", "Local Directories": "2025-03-12" } },
    { customerName: "Jake Tran", businessName: "Pinnacle Fitness", phone: "+1 650-555-0305", email: "jake@pinnaclefitness.com", existingUrl: "www.pinnaclefitness.com", newUrl: "pinnaclefitness.zinglocal.com", offshoreDesigner: "Vikram Das", usDesigner: "Riley Chen", rep: "Caden", productKey: "PRD-1001", value: 59, wonDate: "2025-02-15", status: "active",
      items: { "Website Design": "first-draft", "AI Chat": "in-progress", "Landing Pages": "outstanding", "Blogs": "outstanding", "Online Bookings": "complete", "Memberships": "outstanding", "Social Media": "outstanding", "SMS Marketing": "outstanding", "Email Marketing": "outstanding", "GBP Optimization": "in-progress", "Google Business Reviews": "outstanding", "Local Directories": "outstanding" },
      owners: { "Website Design": "Vikram Das", "AI Chat": "Riley Chen", "Landing Pages": "", "Blogs": "", "Online Bookings": "Riley Chen", "Memberships": "", "Social Media": "", "SMS Marketing": "", "Email Marketing": "", "GBP Optimization": "Riley Chen", "Google Business Reviews": "", "Local Directories": "" },
      webOwners: { "website-started": "Vikram Das", "first-draft": "Vikram Das", "website-sent": "", "edits-mode": "", "ready-qa": "", "ready-publishing": "", "complete": "" },
      dueDates: { "Website Design": "2025-03-01", "AI Chat": "2025-03-08", "Landing Pages": "2025-03-08", "Blogs": "2025-03-17", "Online Bookings": "2025-03-08", "Memberships": "2025-03-17", "Social Media": "2025-03-01", "SMS Marketing": "2025-03-17", "Email Marketing": "2025-03-17", "GBP Optimization": "2025-03-01", "Google Business Reviews": "2025-03-08", "Local Directories": "2025-03-17" } },
    { customerName: "Maria Santos", businessName: "Sunrise Bakery", phone: "+1 408-555-0306", email: "maria@sunrisebakery.com", existingUrl: "", newUrl: "sunrisebakery.zinglocal.com", offshoreDesigner: "Raj Patel", usDesigner: "Alex Morgan", rep: "Zach", productKey: "PRD-1002", value: 149, wonDate: "2025-02-20", status: "active",
      items: { "Website Design": "ready-qa", "AI Chat": "complete", "Landing Pages": "complete", "Blogs": "in-progress", "Online Bookings": "review", "Memberships": "outstanding", "Social Media": "complete", "SMS Marketing": "complete", "Email Marketing": "complete", "GBP Optimization": "complete", "Google Business Reviews": "in-progress", "Local Directories": "in-progress" },
      owners: { "Website Design": "Raj Patel", "AI Chat": "Alex Morgan", "Landing Pages": "Raj Patel", "Blogs": "Alex Morgan", "Online Bookings": "Alex Morgan", "Memberships": "", "Social Media": "Alex Morgan", "SMS Marketing": "Alex Morgan", "Email Marketing": "Alex Morgan", "GBP Optimization": "Alex Morgan", "Google Business Reviews": "Alex Morgan", "Local Directories": "Raj Patel" },
      webOwners: { "website-started": "Raj Patel", "first-draft": "Raj Patel", "website-sent": "Alex Morgan", "edits-mode": "Alex Morgan", "ready-qa": "Alex Morgan", "ready-publishing": "", "complete": "" },
      dueDates: { "Website Design": "2025-03-06", "AI Chat": "2025-03-13", "Landing Pages": "2025-03-13", "Blogs": "2025-03-22", "Online Bookings": "2025-03-13", "Memberships": "2025-03-22", "Social Media": "2025-03-06", "SMS Marketing": "2025-03-22", "Email Marketing": "2025-03-22", "GBP Optimization": "2025-03-06", "Google Business Reviews": "2025-03-13", "Local Directories": "2025-03-22" } },
    { customerName: "Dr. Rita Gomez", businessName: "Downtown Dental", phone: "+1 718-555-0307", email: "rita@downtowndental.com", existingUrl: "www.downtowndental.com", newUrl: "downtowndental.zinglocal.com", offshoreDesigner: "Priya Sharma", usDesigner: "Jordan Lee", rep: "Jon", productKey: "PRD-1001", value: 59, wonDate: "2025-02-25", status: "active",
      items: { "Website Design": "complete", "AI Chat": "complete", "Landing Pages": "complete", "Blogs": "complete", "Online Bookings": "complete", "Memberships": "complete", "Social Media": "complete", "SMS Marketing": "complete", "Email Marketing": "complete", "GBP Optimization": "complete", "Google Business Reviews": "complete", "Local Directories": "complete" },
      owners: { "Website Design": "Priya Sharma", "AI Chat": "Jordan Lee", "Landing Pages": "Priya Sharma", "Blogs": "Jordan Lee", "Online Bookings": "Jordan Lee", "Memberships": "Jordan Lee", "Social Media": "Jordan Lee", "SMS Marketing": "Jordan Lee", "Email Marketing": "Priya Sharma", "GBP Optimization": "Jordan Lee", "Google Business Reviews": "Jordan Lee", "Local Directories": "Jordan Lee" },
      webOwners: { "website-started": "Priya Sharma", "first-draft": "Priya Sharma", "website-sent": "Jordan Lee", "edits-mode": "Jordan Lee", "ready-qa": "Jordan Lee", "ready-publishing": "Nina Walsh", "complete": "Nina Walsh" },
      dueDates: { "Website Design": "2025-03-11", "AI Chat": "2025-03-18", "Landing Pages": "2025-03-18", "Blogs": "2025-03-27", "Online Bookings": "2025-03-18", "Memberships": "2025-03-27", "Social Media": "2025-03-11", "SMS Marketing": "2025-03-27", "Email Marketing": "2025-03-27", "GBP Optimization": "2025-03-11", "Google Business Reviews": "2025-03-18", "Local Directories": "2025-03-27" } },
  ];

  for (const ob of onboardingData) {
    const { productKey, items, owners, webOwners, dueDates, wonDate, ...data } = ob;
    const created = await prisma.onboarding.create({
      data: {
        organizationId: ORG_ID,
        ...data,
        productId: productMap[productKey] || null,
        wonDate: wonDate ? new Date(wonDate) : null,
      },
    });

    // Create onboarding items (12 per onboarding)
    const ownersMap = owners as Record<string, string>;
    const dueDatesMap = dueDates as Record<string, string>;
    for (const [itemName, stage] of Object.entries(items)) {
      await prisma.onboardingItem.create({
        data: {
          onboardingId: created.id,
          itemName,
          stage,
          owner: ownersMap[itemName] || null,
          dueDate: dueDatesMap[itemName] ? new Date(dueDatesMap[itemName]) : null,
        },
      });
    }

    // Create web owners
    for (const [stageKey, owner] of Object.entries(webOwners)) {
      if (owner) {
        await prisma.onboardingWebOwner.create({
          data: {
            onboardingId: created.id,
            stageKey,
            owner,
          },
        });
      }
    }
  }
  console.log(`  ✓ ${onboardingData.length} onboarding records with items and web owners`);

  // ━━━ AR Accounts ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const arAccounts = [
    { businessName: "Lakeside Chiropractic", customerName: "Dr. Anna Lee", email: "anna@lakesidechiro.com", phone: "+1 415-555-0301", product: "DOMINATE", mrr: 249, status: "past-due", stripeStatus: "past_due", daysPastDue: 5, amountDue: 249, lastPaymentDate: "2025-02-10", failedDate: "2025-03-15",
      timeline: [
        { date: "2025-03-15", type: "stripe-retry", note: "Payment failed - card declined" },
        { date: "2025-03-16", type: "text", note: "Auto-text: payment failed notification" },
        { date: "2025-03-18", type: "email", note: "Auto-email: payment retry reminder" },
      ] },
    { businessName: "Harbor View Realty", customerName: "Marcus Rivera", email: "marcus@harborview.com", phone: "+1 312-555-0302", product: "BOOST", mrr: 149, status: "unpaid", stripeStatus: "unpaid", daysPastDue: 32, amountDue: 298, lastPaymentDate: "2025-01-12", failedDate: "2025-02-12",
      timeline: [
        { date: "2025-02-12", type: "stripe-retry", note: "Payment failed - insufficient funds" },
        { date: "2025-02-13", type: "text", note: "Auto-text: payment failed notification" },
        { date: "2025-02-15", type: "email", note: "Auto-email: payment retry reminder" },
        { date: "2025-02-19", type: "stripe-retry", note: "Stripe retry #2 - declined" },
        { date: "2025-02-20", type: "call", note: "Outbound call - left voicemail" },
        { date: "2025-02-25", type: "stripe-retry", note: "Stripe retry #3 - declined" },
        { date: "2025-02-26", type: "email", note: "Auto-email: final payment warning" },
        { date: "2025-03-01", type: "escalated", note: "Marked unpaid - all retries exhausted" },
        { date: "2025-03-05", type: "call", note: "Collections call - customer said will pay Friday" },
        { date: "2025-03-12", type: "text", note: "Follow-up: payment still not received" },
      ] },
    { businessName: "Peak Dental Care", customerName: "Susan Park", email: "susan@peakdental.com", phone: "+1 628-555-0303", product: "DOMINATE", mrr: 249, status: "past-due", stripeStatus: "past_due", daysPastDue: 8, amountDue: 249, lastPaymentDate: "2025-02-07", failedDate: "2025-03-12",
      timeline: [
        { date: "2025-03-12", type: "stripe-retry", note: "Payment failed - expired card" },
        { date: "2025-03-13", type: "text", note: "Auto-text: please update card on file" },
        { date: "2025-03-15", type: "email", note: "Auto-email: card update reminder" },
        { date: "2025-03-18", type: "stripe-retry", note: "Stripe retry #2 - still expired" },
        { date: "2025-03-19", type: "call", note: "Outbound call - customer updating card today" },
      ] },
    { businessName: "Metro Auto Detail", customerName: "Tony Reeves", email: "tony@metroauto.com", phone: "+1 213-555-0304", product: "BOOST", mrr: 149, status: "past-due", stripeStatus: "past_due", daysPastDue: 3, amountDue: 149, lastPaymentDate: "2025-02-17", failedDate: "2025-03-17",
      timeline: [
        { date: "2025-03-17", type: "stripe-retry", note: "Payment failed - card declined" },
        { date: "2025-03-18", type: "text", note: "Auto-text: payment failed notification" },
      ] },
    { businessName: "Sunrise Bakery", customerName: "Maria Santos", email: "maria@sunrisebakery.com", phone: "+1 408-555-0306", product: "BOOST", mrr: 149, status: "unpaid", stripeStatus: "unpaid", daysPastDue: 45, amountDue: 447, lastPaymentDate: "2024-12-30", failedDate: "2025-01-30",
      timeline: [
        { date: "2025-01-30", type: "stripe-retry", note: "Payment failed - insufficient funds" },
        { date: "2025-01-31", type: "text", note: "Auto-text: payment failed" },
        { date: "2025-02-02", type: "email", note: "Auto-email: payment retry" },
        { date: "2025-02-06", type: "stripe-retry", note: "Retry #2 - declined" },
        { date: "2025-02-10", type: "call", note: "Outbound call - no answer" },
        { date: "2025-02-13", type: "stripe-retry", note: "Retry #3 - declined" },
        { date: "2025-02-14", type: "email", note: "Final payment warning" },
        { date: "2025-02-20", type: "escalated", note: "Marked unpaid - retries exhausted" },
        { date: "2025-02-25", type: "call", note: "Collections call - no answer" },
        { date: "2025-03-01", type: "text", note: "Collections text - no response" },
        { date: "2025-03-10", type: "call", note: "Collections call - customer disputing charges" },
        { date: "2025-03-15", type: "email", note: "Sent itemized invoice and contract copy" },
      ] },
    { businessName: "Pinnacle Fitness", customerName: "Jake Tran", email: "jake@pinnaclefitness.com", phone: "+1 650-555-0305", product: "DISCOVER", mrr: 59, status: "past-due", stripeStatus: "past_due", daysPastDue: 2, amountDue: 59, lastPaymentDate: "2025-02-18", failedDate: "2025-03-18",
      timeline: [
        { date: "2025-03-18", type: "stripe-retry", note: "Payment failed - card declined" },
        { date: "2025-03-19", type: "text", note: "Auto-text: payment failed notification" },
      ] },
    { businessName: "Alpine Plumbing", customerName: "Dave Kowalski", email: "dave@alpineplumbing.com", phone: "+1 303-555-0401", product: "BOOST", mrr: 149, status: "paid", stripeStatus: "active", daysPastDue: 0, amountDue: 0, amountPaid: 298, paidDate: "2025-03-18", lastPaymentDate: "2025-03-18", failedDate: "2025-02-15",
      timeline: [
        { date: "2025-02-15", type: "stripe-retry", note: "Payment failed - card declined" },
        { date: "2025-02-16", type: "text", note: "Auto-text: payment failed notification" },
        { date: "2025-02-18", type: "email", note: "Auto-email: payment retry reminder" },
        { date: "2025-02-22", type: "stripe-retry", note: "Stripe retry #2 - declined" },
        { date: "2025-02-25", type: "call", note: "Outbound call - customer updating card" },
        { date: "2025-03-18", type: "payment-received", note: "Payment received: $298 - covers Feb + Mar" },
      ] },
    { businessName: "Golden Gate Landscaping", customerName: "Miguel Flores", email: "miguel@gglandscaping.com", phone: "+1 415-555-0402", product: "DOMINATE", mrr: 249, status: "paid", stripeStatus: "active", daysPastDue: 0, amountDue: 0, amountPaid: 249, paidDate: "2025-03-16", lastPaymentDate: "2025-03-16", failedDate: "2025-03-02",
      timeline: [
        { date: "2025-03-02", type: "stripe-retry", note: "Payment failed - expired card" },
        { date: "2025-03-03", type: "text", note: "Auto-text: please update card" },
        { date: "2025-03-05", type: "email", note: "Auto-email: card update link" },
        { date: "2025-03-16", type: "payment-received", note: "Payment received: $249 - card updated" },
      ] },
    { businessName: "Redwood Dental Group", customerName: "Dr. Lisa Chen", email: "lisa@redwooddental.com", phone: "+1 650-555-0403", product: "DOMINATE", mrr: 249, status: "paid", stripeStatus: "active", daysPastDue: 0, amountDue: 0, amountPaid: 747, paidDate: "2025-03-14", lastPaymentDate: "2025-03-14", failedDate: "2025-01-10", reactivated: true,
      timeline: [
        { date: "2025-01-10", type: "stripe-retry", note: "Payment failed - insufficient funds" },
        { date: "2025-01-11", type: "text", note: "Auto-text: payment failed" },
        { date: "2025-01-15", type: "stripe-retry", note: "Retry #2 - declined" },
        { date: "2025-01-20", type: "email", note: "Auto-email: final warning" },
        { date: "2025-01-25", type: "escalated", note: "Marked unpaid - retries exhausted" },
        { date: "2025-02-01", type: "call", note: "Collections call - payment plan agreed" },
        { date: "2025-03-14", type: "payment-received", note: "Payment received: $747 - covers Jan, Feb, Mar" },
      ] },
    { businessName: "Evergreen Pest Control", customerName: "Tommy Park", email: "tommy@evergreenpest.com", phone: "+1 408-555-0404", product: "DISCOVER", mrr: 59, status: "paid", stripeStatus: "active", daysPastDue: 0, amountDue: 0, amountPaid: 59, paidDate: "2025-03-19", lastPaymentDate: "2025-03-19", failedDate: "2025-03-10",
      timeline: [
        { date: "2025-03-10", type: "stripe-retry", note: "Payment failed - card declined" },
        { date: "2025-03-11", type: "text", note: "Auto-text: payment failed notification" },
        { date: "2025-03-19", type: "payment-received", note: "Payment received: $59 - card updated" },
      ] },
    { businessName: "Downtown Dental", customerName: "Dr. Rita Gomez", email: "rita@downtowndental.com", phone: "+1 718-555-0307", product: "DISCOVER", mrr: 59, status: "current", stripeStatus: "active", daysPastDue: 0, amountDue: 0, lastPaymentDate: "2025-03-01", subscriptionCreated: "2024-09-15", timeline: [] },
    { businessName: "Summit Roofing", customerName: "Carlos Mendez", email: "carlos@summitroofing.com", phone: "+1 720-555-0501", product: "BOOST", mrr: 149, status: "current", stripeStatus: "active", daysPastDue: 0, amountDue: 0, lastPaymentDate: "2025-03-05", subscriptionCreated: "2024-11-01", timeline: [] },
    { businessName: "Bright Smile Ortho", customerName: "Dr. Patel", email: "patel@brightsmile.com", phone: "+1 303-555-0502", product: "DOMINATE", mrr: 249, status: "current", stripeStatus: "active", daysPastDue: 0, amountDue: 0, lastPaymentDate: "2025-03-10", subscriptionCreated: "2024-06-20", timeline: [] },
    { businessName: "Rocky Mountain HVAC", customerName: "Bill Turner", email: "bill@rmhvac.com", phone: "+1 719-555-0503", product: "BOOST", mrr: 149, status: "current", stripeStatus: "active", daysPastDue: 0, amountDue: 0, lastPaymentDate: "2025-03-12", subscriptionCreated: "2025-01-08", timeline: [] },
    { businessName: "Wildflower Yoga", customerName: "Sarah Kim", email: "sarah@wildfloweryoga.com", phone: "+1 970-555-0504", product: "DISCOVER", mrr: 59, status: "current", stripeStatus: "active", daysPastDue: 0, amountDue: 0, lastPaymentDate: "2025-03-15", subscriptionCreated: "2025-02-14", timeline: [] },
    { businessName: "Copper Creek BBQ", customerName: "James Wilson", email: "james@coppercreekbbq.com", phone: "+1 303-555-0601", product: "DOMINATE", mrr: 249, status: "current", stripeStatus: "active", daysPastDue: 0, amountDue: 0, lastPaymentDate: "2025-03-08", subscriptionCreated: "2024-08-10", timeline: [] },
    { businessName: "Mile High Movers", customerName: "Derek Shaw", email: "derek@milehighmovers.com", phone: "+1 720-555-0602", product: "BOOST", mrr: 149, status: "current", stripeStatus: "active", daysPastDue: 0, amountDue: 0, lastPaymentDate: "2025-03-02", subscriptionCreated: "2024-12-05", timeline: [] },
    { businessName: "Front Range Electric", customerName: "Mike Hartley", email: "mike@frontrangeelectric.com", phone: "+1 719-555-0603", product: "DISCOVER", mrr: 59, status: "current", stripeStatus: "active", daysPastDue: 0, amountDue: 0, lastPaymentDate: "2025-03-11", subscriptionCreated: "2025-03-01", timeline: [] },
    { businessName: "Aspen Veterinary", customerName: "Dr. Karen Wright", email: "karen@aspenvets.com", phone: "+1 970-555-0604", product: "DOMINATE", mrr: 249, status: "current", stripeStatus: "active", daysPastDue: 0, amountDue: 0, lastPaymentDate: "2025-03-14", subscriptionCreated: "2024-04-22", timeline: [] },
    { businessName: "Springs Auto Glass", customerName: "Victor Ramos", email: "victor@springsautoglass.com", phone: "+1 719-555-0605", product: "BOOST", mrr: 149, status: "current", stripeStatus: "active", daysPastDue: 0, amountDue: 0, lastPaymentDate: "2025-03-09", subscriptionCreated: "2025-02-01", timeline: [] },
  ];

  for (const ar of arAccounts) {
    const { timeline, lastPaymentDate, failedDate, paidDate, subscriptionCreated, ...data } = ar;
    const created = await prisma.arAccount.create({
      data: {
        organizationId: ORG_ID,
        ...data,
        lastPaymentDate: lastPaymentDate ? new Date(lastPaymentDate) : null,
        failedDate: failedDate ? new Date(failedDate) : null,
        paidDate: (paidDate as string | undefined) ? new Date(paidDate as string) : null,
        subscriptionCreated: (subscriptionCreated as string | undefined) ? new Date(subscriptionCreated as string) : null,
      },
    });

    for (const entry of timeline) {
      await prisma.arTimeline.create({
        data: {
          arId: created.id,
          date: entry.date ? new Date(entry.date) : null,
          type: entry.type,
          note: entry.note,
        },
      });
    }
  }
  console.log(`  ✓ ${arAccounts.length} AR accounts with timelines`);

  console.log("\nSeeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
