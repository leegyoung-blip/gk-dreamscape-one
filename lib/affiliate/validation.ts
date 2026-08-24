import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().url().max(500).optional(),
);

const optionalInteger = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === ""
        ? undefined
        : Number(value),
    z.number().int().min(0).max(max).optional(),
  );

export const affiliateApplicationSchema = z.object({
  legalName: z.string().trim().min(2).max(120),
  displayName: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(7).max(40),
  country: z.string().trim().min(2).max(100),
  applicantType: z.enum([
    "individual",
    "sole_proprietor",
    "registered_business",
    "content_creator",
  ]),
  businessName: z.string().trim().max(180).optional().default(""),
  registrationNumber: z.string().trim().max(80).optional().default(""),
  website: optionalUrl,
  instagram: optionalUrl,
  tiktok: optionalUrl,
  facebook: optionalUrl,
  youtube: optionalUrl,
  linkedin: optionalUrl,
  otherSocial: optionalUrl,
  promotionChannels: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  audienceDescription: z
    .string()
    .trim()
    .min(1, "Briefly describe your main audience")
    .max(2000),
  audienceSize: optionalInteger(100_000_000),
  audienceCountries: z.string().trim().max(1000).optional().default(""),
  promotionPlan: z
    .string()
    .trim()
    .min(1, "Briefly describe how you plan to promote Dreamscape")
    .max(3000),
  expectedReferrals: optionalInteger(1_000_000),
  programmeRequested: z.enum(["standard", "kol", "unsure"]),
  ageConfirmed: z.literal(true),
  informationConfirmed: z.literal(true),
  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  conductAccepted: z.literal(true),
});

export const affiliateOnboardingSchema = z.object({
  token: z.string().trim().min(20).max(500),
  phone: z.string().trim().min(7).max(40),
  paynowProxyType: z.enum(["mobile", "uen", "nric_fin"]).optional(),
  paynowProxyValue: z.string().trim().max(120).optional().default(""),
  payeeName: z.string().trim().min(2).max(180),
  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  payoutConfirmed: z.literal(true),
  commissionAccepted: z.literal(true),
  eligibilityAccepted: z.literal(true),
  periodAccepted: z.literal(true),
  disclosureAccepted: z.literal(true),
  conductAccepted: z.literal(true),
  reversalAccepted: z.literal(true),
});
