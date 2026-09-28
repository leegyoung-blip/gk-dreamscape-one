import "server-only";

import type {
  MathIntelligenceAnalysis,
  MathIntelligenceQuestionInput,
  MathIntelligenceReasonCode,
  MathVisualStrategy,
} from "../MathIntelligenceTypes";
import type { MathIntelligenceAIProvider } from "./AIProvider";
import {
  LUNA_MATH_ANALYSIS_SCHEMA,
  LUNA_MATH_ANALYSIS_SYSTEM_PROMPT,
} from "./LunaSchemas";

type OpenAIContentItem = {
  type?: string;
  text?: string;
  refusal?: string;
};

type OpenAIOutputItem = {
  type?: string;
  content?: OpenAIContentItem[];
};

type OpenAIResponsesPayload = {
  output?: OpenAIOutputItem[];
  error?: { message?: string } | null;
};

function extractOutputText(payload: OpenAIResponsesPayload) {
  const parts: string[] = [];
  let refusal = "";

  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        parts.push(content.text);
      }
      if (content.type === "refusal" && typeof content.refusal === "string") {
        refusal = content.refusal;
      }
    }
  }

  if (refusal) throw new Error(`OpenAI Luna refused the Math analysis request: ${refusal}`);
  return parts.join("").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid Luna response: ${label} must be a non-empty string.`);
  }
  return value;
}

function assertNumber(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid Luna response: ${label} must be a finite number.`);
  }
  return value;
}

function parseLunaAnalysis(raw: unknown, model: string): MathIntelligenceAnalysis {
  if (!isRecord(raw)) throw new Error("Invalid Luna response: expected an object.");
  if (!Array.isArray(raw.quantities) || !Array.isArray(raw.relationships) || !Array.isArray(raw.reason_codes)) {
    throw new Error("Invalid Luna response: missing structured arrays.");
  }
  if (!isRecord(raw.target)) throw new Error("Invalid Luna response: target must be an object.");

  const confidence = Math.max(0, Math.min(1, assertNumber(raw.confidence, "confidence")));

  return {
    source: "luna",
    visual_need: assertString(raw.visual_need, "visual_need") as MathIntelligenceAnalysis["visual_need"],
    disposition: assertString(raw.disposition, "disposition") as MathIntelligenceAnalysis["disposition"],
    interpretation: {
      domain: assertString(raw.domain, "domain") as MathIntelligenceAnalysis["interpretation"]["domain"],
      problem_structure: assertString(
        raw.problem_structure,
        "problem_structure",
      ) as MathIntelligenceAnalysis["interpretation"]["problem_structure"],
      quantities: raw.quantities as MathIntelligenceAnalysis["interpretation"]["quantities"],
      relationships: raw.relationships as MathIntelligenceAnalysis["interpretation"]["relationships"],
      target: raw.target as MathIntelligenceAnalysis["interpretation"]["target"],
    },
    strategy: assertString(raw.strategy, "strategy") as MathVisualStrategy,
    confidence,
    reason_codes: raw.reason_codes.map((value) => String(value)) as MathIntelligenceReasonCode[],
    model,
  };
}

function compactQuestionPayload(input: MathIntelligenceQuestionInput) {
  return {
    id: input.id,
    primary_level: input.primary_level,
    topic: input.topic,
    skill: input.skill,
    difficulty: input.difficulty,
    question_type: input.question_type,
    instruction: input.instruction,
    prompt: input.prompt,
    options: input.options,
    correct_answer: input.correct_answer,
    explanation: input.explanation,
    existing_media: input.existing_media,
  };
}

export class OpenAILunaProvider implements MathIntelligenceAIProvider {
  readonly providerName = "openai-luna";
  readonly model: string;
  readonly apiKey: string;

  constructor(options: { apiKey?: string; model?: string } = {}) {
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || "";
    this.model = options.model || process.env.OPENAI_MATH_MODEL || "gpt-6-luna";

    if (!this.apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Math Intelligence can still resolve deterministic questions, but Luna routing requires the server-side key.",
      );
    }
  }

  async analyse(input: MathIntelligenceQuestionInput): Promise<MathIntelligenceAnalysis> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 2200,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: LUNA_MATH_ANALYSIS_SYSTEM_PROMPT }],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(compactQuestionPayload(input)),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "dreamscape_math_intelligence_analysis",
            strict: true,
            schema: LUNA_MATH_ANALYSIS_SCHEMA,
          },
        },
      }),
    });

    const payload = (await response.json()) as OpenAIResponsesPayload;

    if (!response.ok) {
      const detail = payload.error?.message || `HTTP ${response.status}`;
      throw new Error(`OpenAI Luna Math analysis failed: ${detail}`);
    }

    const outputText = extractOutputText(payload);
    if (!outputText) throw new Error("OpenAI Luna returned no structured Math analysis.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      throw new Error("OpenAI Luna returned structured output that could not be parsed as JSON.");
    }

    return parseLunaAnalysis(parsed, this.model);
  }
}
