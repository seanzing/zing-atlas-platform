/**
 * Seed ProductTaskTemplate records for existing products.
 * Uses COMPONENT_LIBRARY + PRODUCT_BUNDLES (Amy's confirmed 19 components).
 *
 * Run: cd platform && npx tsx ../db/seed-task-templates.ts
 */

import "dotenv/config";
import { PrismaClient } from "../platform/node_modules/@prisma/client";
import { PrismaPg } from "../platform/node_modules/@prisma/adapter-pg";

// Inline the component library so we don't need path aliases
interface StatusOption {
  value: string;
  label: string;
  triggerEmail: boolean;
  triggerSms: boolean;
  triggerNextTask: boolean;
  customerMessage?: string;
}

interface ComponentDef {
  name: string;
  taskType: string;
  ownerRole: string;
  daysOffset: number;
  statusOptions: StatusOption[];
}

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

const COMPONENT_LIBRARY: Record<string, ComponentDef> = {
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
};

const PRODUCT_BUNDLES: Record<string, string[]> = {
  DISCOVER:  ['website_5',  'landing_pages_20',  'ai_chat', 'directories', 'gbp'],
  BOOST:     ['website_10', 'landing_pages_50',  'ai_chat', 'directories', 'gbp', 'bookings', 'social_1',  'blogs_3',  'email_marketing', 'sms_marketing'],
  DOMINATE:  ['website_15', 'landing_pages_100', 'ai_chat', 'directories', 'gbp', 'bookings', 'social_2',  'blogs_12', 'email_marketing', 'sms_marketing', 'ecommerce_advanced'],
};

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    // Get all products
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
    });

    for (const product of products) {
      const desc = product.description.toUpperCase();
      const planName = Object.keys(PRODUCT_BUNDLES).find(k => desc.includes(k));

      if (!planName) {
        console.log(`Skipping product "${product.description}" — no matching plan`);
        continue;
      }

      // Clean re-seed: delete existing templates for this product
      const deleted = await prisma.productTaskTemplate.deleteMany({
        where: { productId: product.id },
      });
      if (deleted.count > 0) {
        console.log(`Deleted ${deleted.count} existing templates for "${product.description}"`);
      }

      const componentKeys = PRODUCT_BUNDLES[planName];
      const templates = componentKeys.map((key, idx) => {
        const comp = COMPONENT_LIBRARY[key];
        return {
          productId: product.id,
          taskType: comp.taskType,
          taskName: comp.name,
          taskOrder: idx,
          ownerRole: comp.ownerRole,
          daysOffset: comp.daysOffset,
          isConditional: false,
          statusOptions: JSON.parse(JSON.stringify(comp.statusOptions)),
        };
      });

      await prisma.productTaskTemplate.createMany({ data: templates });
      console.log(`Seeded ${templates.length} task templates for "${product.description}" (${planName})`);
    }

    console.log("Done.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
