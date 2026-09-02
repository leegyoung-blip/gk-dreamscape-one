import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const studentUserIdSchema = z.string().uuid();
export const parentalPasswordSchema = z.string().min(6).max(72);

export const policyUpdateSchema = z.object({
  studentUserId: studentUserIdSchema,
  mode: z.enum(["off", "total", "games"]),
  dailyLimitMinutes: z.number().int().min(15).max(1440).nullable(),
  timeZone: z.string().trim().min(1).max(100).default("Asia/Singapore"),
  currentPassword: z.string().max(72).nullable().optional(),
  newPassword: parentalPasswordSchema.nullable().optional(),
}).superRefine((value, context) => {
  if (value.mode === "off" && value.dailyLimitMinutes !== null) {
    context.addIssue({
      code: "custom",
      path: ["dailyLimitMinutes"],
      message: "An off policy cannot have a daily limit.",
    });
  }

  if (value.mode !== "off" && value.dailyLimitMinutes === null) {
    context.addIssue({
      code: "custom",
      path: ["dailyLimitMinutes"],
      message: "A daily limit is required.",
    });
  }
});

export const verifyPasswordSchema = z.object({
  studentUserId: studentUserIdSchema,
  password: z.string().min(1).max(72),
});

export const grantExtraTimeSchema = z.object({
  studentUserId: studentUserIdSchema,
  additionalMinutes: z.number().int().min(15).max(180),
  password: z.string().max(72),
  reason: z.string().trim().max(300).nullable().optional(),
});

export const requestResetSchema = z.object({
  studentUserId: studentUserIdSchema,
});

export const completeResetSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  newPassword: parentalPasswordSchema,
});

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
      supabase: null,
      user: null,
    } as const;
  }

  return { response: null, supabase, user } as const;
}

export function validationError(error: z.ZodError) {
  return NextResponse.json(
    {
      error: "Invalid parental-control request.",
      fields: error.flatten().fieldErrors,
    },
    { status: 400 },
  );
}

export function rpcErrorResponse(error: {
  code?: string | null;
  message?: string | null;
}) {
  const message = error.message || "The parental-control request failed.";

  if (error.code === "42501") {
    return NextResponse.json({ error: message }, { status: 403 });
  }

  if (error.code === "28P01") {
    return NextResponse.json({ error: message }, { status: 401 });
  }

  if (error.code === "22023") {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.error("Parental-control RPC error:", error);
  return NextResponse.json(
    { error: "The parental-control service is temporarily unavailable." },
    { status: 500 },
  );
}
