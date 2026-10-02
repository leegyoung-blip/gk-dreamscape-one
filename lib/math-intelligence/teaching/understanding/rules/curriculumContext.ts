import type {
  CanonicalTeachingQuestion,
} from "../../canonical";

import type {
  CurriculumContext,
  MathematicalDomain,
} from "../types";

import { lower } from "./text";

type DomainCandidate = {
  domain: MathematicalDomain;
  confidence: number;
  code: string;
};

function collectCurriculumText(
  question: CanonicalTeachingQuestion,
): {
  topic: string;
  primarySkill: string;
  secondarySkills: string[];
  legacySkill: string;
  tags: string[];
  combined: string;
} {
  const topic = question.curriculum.topicName ?? "";
  const primarySkill =
    question.curriculum.primarySkill?.name ?? "";
  const secondarySkills =
    question.curriculum.secondarySkills.map(
      (skill) => skill.name,
    );
  const legacySkill =
    question.curriculum.legacySkillLabel ?? "";
  const tags = question.curriculum.skillTags ?? [];

  return {
    topic,
    primarySkill,
    secondarySkills,
    legacySkill,
    tags,
    combined: lower(
      [
        topic,
        primarySkill,
        ...secondarySkills,
        legacySkill,
        ...tags,
      ].join(" "),
    ),
  };
}

function candidateFromText(
  combined: string,
): DomainCandidate | null {
  const rules: Array<{
    test: RegExp;
    domain: MathematicalDomain;
    confidence: number;
    code: string;
  }> = [
    {
      test: /\bpercentage\b|\bpercent\b/,
      domain: "percentage",
      confidence: 0.99,
      code: "CURRICULUM_PERCENTAGE",
    },
    {
      test: /\bratio\b|\bproportion\b/,
      domain: "ratio",
      confidence: 0.98,
      code: "CURRICULUM_RATIO",
    },
    {
      test: /\bfraction\b|\bfractions\b/,
      domain: "fractions",
      confidence: 0.98,
      code: "CURRICULUM_FRACTIONS",
    },
    {
      test: /\bdecimal\b|\bdecimals\b/,
      domain: "decimals",
      confidence: 0.98,
      code: "CURRICULUM_DECIMALS",
    },
    {
      test: /\baverage\b|\bmean\b/,
      domain: "average",
      confidence: 0.98,
      code: "CURRICULUM_AVERAGE",
    },
    {
      test: /\bspeed\b|\brate\b/,
      domain: "speed_rate",
      confidence: 0.96,
      code: "CURRICULUM_SPEED_RATE",
    },
    {
      test: /\bmoney\b|\bcoin\b|\bcoins\b|\bdollar\b|\bcents?\b|\bprice\b|\bcost\b|\bcosts\b/,
      domain: "money",
      confidence: 0.96,
      code: "CURRICULUM_MONEY",
    },
    {
      test: /\btime\b|\bclock\b|\bduration\b|\bcalendar\b/,
      domain: "time",
      confidence: 0.96,
      code: "CURRICULUM_TIME",
    },
    {
      test: /\bdata\b|\bgraph\b|\bchart\b|\bpictograph\b|\btable\b|\blists?\b|\bsort\b|\bclassif/,
      domain: "data",
      confidence: 0.95,
      code: "CURRICULUM_DATA",
    },
    {
      test: /\bgeometry\b|\bshape\b|\bshapes\b|\bsolid\b|\bcube\b|\bcuboid\b|\btriangle\b|\brectangle\b|\bsquare\b|\bquadrilateral\b|\bcircle\b|\bangle\b|\bparallel\b|\bperpendicular\b|\bsymmetr/,
      domain: "geometry",
      confidence: 0.95,
      code: "CURRICULUM_GEOMETRY",
    },
    {
      test: /\bmeasurement\b|\blength\b|\bmass\b|\bcapacity\b|\bvolume\b|\bheavier\b|\blighter\b|\bunits?\b/,
      domain: "measurement",
      confidence: 0.95,
      code: "CURRICULUM_MEASUREMENT",
    },
    {
      test: /\balgebra\b|\bequation\b|\bsymbol\b|\bunknown\b|\bexpression\b/,
      domain: "algebra",
      confidence: 0.92,
      code: "CURRICULUM_ALGEBRA",
    },
    {
      test: /\bpattern\b|\bsequence\b|\brules?\b/,
      domain: "patterns",
      confidence: 0.9,
      code: "CURRICULUM_PATTERNS",
    },
    {
      test: /\bquantitative reasoning\b|\bposition and spatial reasoning\b|\bset reasoning\b/,
      domain: "logic",
      confidence: 0.9,
      code: "CURRICULUM_REASONING",
    },
    {
      test: /\bapplied quantity reasoning\b|\bnumber conditions\b/,
      domain: "whole_numbers",
      confidence: 0.9,
      code: "CURRICULUM_QUANTITY_REASONING",
    },
    {
      test: /\blogic\b|\bnon-routine\b|\bnonroutine\b|\bstrategy\b/,
      domain: "logic",
      confidence: 0.86,
      code: "CURRICULUM_LOGIC",
    },
    {
      test: /\bwhole numbers?\b|\bplace value\b|\bnumber bond\b|\bnumerals?\b|\bnumber words?\b|\bfactors?\b|\bmultiples?\b|\brounding\b/,
      domain: "whole_numbers",
      confidence: 0.94,
      code: "CURRICULUM_WHOLE_NUMBERS",
    },
    {
      test: /\boperations?\b|\bcalculation\b|\baddition\b|\bsubtraction\b|\bmultiplication\b|\bdivision\b/,
      domain: "arithmetic",
      confidence: 0.84,
      code: "CURRICULUM_ARITHMETIC",
    },
  ];

  for (const rule of rules) {
    if (rule.test.test(combined)) {
      return {
        domain: rule.domain,
        confidence: rule.confidence,
        code: rule.code,
      };
    }
  }

  return null;
}

function topicFallback(
  topicRaw: string,
): DomainCandidate | null {
  const topic = lower(topicRaw);

  if (!topic) return null;

  const exact: Record<string, MathematicalDomain> = {
    "whole numbers": "whole_numbers",
    "whole numbers and operations": "whole_numbers",
    "whole numbers and algebra": "algebra",
    fractions: "fractions",
    "fractions and decimals": "fractions",
    decimals: "decimals",
    percentage: "percentage",
    "ratio and proportion": "ratio",
    "ratio and rate": "ratio",
    geometry: "geometry",
    circles: "geometry",
    measurement: "measurement",
    money: "money",
    data: "data",
    average: "average",
  };

  const domain = exact[topic];
  if (!domain) return null;

  return {
    domain,
    confidence: 0.9,
    code: "CURRICULUM_TOPIC_FALLBACK",
  };
}

export function buildCurriculumContext(
  question: CanonicalTeachingQuestion,
): CurriculumContext {
  const collected = collectCurriculumText(question);

  const primary =
    candidateFromText(
      lower(
        [
          collected.primarySkill,
          ...collected.secondarySkills,
          collected.legacySkill,
          ...collected.tags,
        ].join(" "),
      ),
    ) ??
    topicFallback(collected.topic) ??
    candidateFromText(collected.combined);

  return {
    topic: collected.topic || null,
    primarySkill: collected.primarySkill || null,
    secondarySkills: collected.secondarySkills,
    legacySkill: collected.legacySkill || null,
    skillTags: collected.tags,
    inferredDomain: primary?.domain ?? "unknown",
    confidence: primary?.confidence ?? 0.2,
    reasonCodes: primary ? [primary.code] : ["CURRICULUM_DOMAIN_UNKNOWN"],
  };
}
