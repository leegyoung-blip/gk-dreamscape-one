import "server-only";

import type {
  MathIntelligenceAnalysis,
  MathIntelligenceQuestionInput,
  MathIntelligenceReasonCode,
  MathVisualStrategy,
} from "../MathIntelligenceTypes";
import type { MathIntelligenceAIProvider } from "./AIProvider";
import type { MathTeachingAIProvider, MathTeachingAIRequest, MathTeachingAIResponse } from "./TeachingAIProvider";
import type { MathVisualTeachingStep } from "../../../components/core-math/visual-engine/MathVisualState";
import {
  LUNA_MATH_ANALYSIS_SCHEMA,
  LUNA_MATH_ANALYSIS_SYSTEM_PROMPT,
} from "./LunaSchemas";
import {
  buildLunaMathTeachingSchema,
  LUNA_MATH_TEACHING_SYSTEM_PROMPT,
  LUNA_TEACHING_ALLOWED_ACTIONS,
} from "./LunaTeachingSchemas";

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


function assertArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid Luna response: ${label} must be an array.`);
  }
  return value;
}

function parseTeachingSteps(value: unknown, label: string): MathVisualTeachingStep[] {
  return assertArray(value, label).map((rawStep, stepIndex) => {
    if (!isRecord(rawStep)) {
      throw new Error(`Invalid Luna response: ${label}[${stepIndex}] must be an object.`);
    }
    const id = assertString(rawStep.id, `${label}[${stepIndex}].id`);
    const stepText = assertString(rawStep.text, `${label}[${stepIndex}].text`);
    const rawActions = assertArray(rawStep.actions, `${label}[${stepIndex}].actions`);
    if (rawActions.length === 0) {
      throw new Error(`Invalid Luna response: ${label}[${stepIndex}].actions cannot be empty.`);
    }

    const actions = rawActions.map((rawAction, actionIndex) => {
      if (!isRecord(rawAction)) {
        throw new Error(`Invalid Luna response: ${label}[${stepIndex}].actions[${actionIndex}] must be an object.`);
      }
      const action = assertString(
        rawAction.action,
        `${label}[${stepIndex}].actions[${actionIndex}].action`,
      );
      if (!(LUNA_TEACHING_ALLOWED_ACTIONS as readonly string[]).includes(action)) {
        throw new Error(`Invalid Luna response: teaching action “${action}” is not allowed.`);
      }
      return {
        visual_id: assertString(
          rawAction.visual_id,
          `${label}[${stepIndex}].actions[${actionIndex}].visual_id`,
        ),
        targets: assertArray(
          rawAction.targets,
          `${label}[${stepIndex}].actions[${actionIndex}].targets`,
        ).map((target, targetIndex) =>
          assertString(
            target,
            `${label}[${stepIndex}].actions[${actionIndex}].targets[${targetIndex}]`,
          ),
        ),
        action: action as MathVisualTeachingStep["actions"][number]["action"],
      };
    });

    return { id, text: stepText, actions };
  });
}

function parseLunaTeachingResponse(
  raw: unknown,
  model: string,
): MathTeachingAIResponse {
  if (!isRecord(raw)) throw new Error("Invalid Luna teaching response: expected an object.");
  const status = assertString(raw.status, "status");
  if (status !== "generated" && status !== "needs_review") {
    throw new Error(`Invalid Luna teaching response: unsupported status “${status}”.`);
  }

  const lessonSteps = parseTeachingSteps(raw.lesson_steps, "lesson_steps");
  const teachMeSteps = parseTeachingSteps(raw.teach_me_steps, "teach_me_steps");
  if (status === "generated" && (lessonSteps.length === 0 || teachMeSteps.length === 0)) {
    throw new Error("Invalid Luna teaching response: generated plans require both lesson and Teach Me steps.");
  }
  if (status === "needs_review" && (lessonSteps.length > 0 || teachMeSteps.length > 0)) {
    throw new Error("Invalid Luna teaching response: needs_review must return empty step arrays.");
  }

  return {
    status,
    confidence: Math.max(0, Math.min(1, assertNumber(raw.confidence, "confidence"))),
    lesson_steps: lessonSteps,
    teach_me_steps: teachMeSteps,
    review_reason:
      raw.review_reason == null
        ? null
        : typeof raw.review_reason === "string"
          ? raw.review_reason.trim() || null
          : (() => {
              throw new Error("Invalid Luna teaching response: review_reason must be a string or null.");
            })(),
    model,
  };
}

function compactTeachingPayload(request: MathTeachingAIRequest) {
  return {
    question: {
      id: request.input.id,
      primary_level: request.input.primary_level,
      topic: request.input.topic,
      skill: request.input.skill,
      difficulty: request.input.difficulty,
      question_type: request.input.question_type,
      instruction: request.input.instruction,
      prompt: request.input.prompt,
      options: request.input.options,
    },
    mathematics: {
      domain: request.analysis.interpretation.domain,
      problem_structure: request.analysis.interpretation.problem_structure,
      target: request.analysis.interpretation.target,
      quantities: request.analysis.interpretation.quantities.map((quantity) => ({
        id: quantity.id,
        label: quantity.label,
        role: quantity.role,
        unit: quantity.unit,
        // Never forward an interpreted unknown value into the teaching planner.
        value: quantity.role === "unknown" ? null : quantity.value,
      })),
      relationships: request.analysis.interpretation.relationships.map((relationship) => ({
        type: relationship.type,
        left_id: relationship.left_id,
        right_id: relationship.right_id,
        unit: relationship.unit,
        // The learner-visible prompt remains the source of numerical teaching evidence.
        // Relationship values are omitted to avoid propagating inferred/solved values.
        value: null,
      })),
      strategy: request.analysis.strategy,
    },
    teaching: {
      need: request.need.need,
      targetability: request.roles.targetability,
      visual_id: request.visual_id,
      objects: request.roles.targets
        .filter((target) => target.visual_id === request.visual_id)
        .map((target) => ({
          id: target.object_id,
          type: target.object_type,
          roles: target.roles,
        })),
    },
  };
}

export class OpenAILunaProvider implements MathIntelligenceAIProvider, MathTeachingAIProvider {
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

  async planVisualTeaching(
    request: MathTeachingAIRequest,
  ): Promise<MathTeachingAIResponse> {
    const objectIds = request.roles.targets
      .filter((target) => target.visual_id === request.visual_id)
      .map((target) => target.object_id);

    const schema = buildLunaMathTeachingSchema({
      visualId: request.visual_id,
      objectIds,
    });

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
        max_output_tokens: 2400,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: LUNA_MATH_TEACHING_SYSTEM_PROMPT }],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(compactTeachingPayload(request)),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "dreamscape_math_visual_teaching_plan",
            strict: true,
            schema,
          },
        },
      }),
    });

    const payload = (await response.json()) as OpenAIResponsesPayload;
    if (!response.ok) {
      const detail = payload.error?.message || `HTTP ${response.status}`;
      throw new Error(`OpenAI Luna visual teaching planning failed: ${detail}`);
    }

    const outputText = extractOutputText(payload);
    if (!outputText) throw new Error("OpenAI Luna returned no structured visual teaching plan.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      throw new Error("OpenAI Luna returned visual teaching output that could not be parsed as JSON.");
    }

    return parseLunaTeachingResponse(parsed, this.model);
  }

}
