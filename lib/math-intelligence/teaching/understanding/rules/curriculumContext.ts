import type {
  CanonicalTeachingQuestion,
} from "../../canonical";

import type {
  CurriculumContext,
  MathematicalDomain,
} from "../types";

import { lower } from "./text";

type CurriculumSource =
  CurriculumContext["selectedSource"];

type DomainCandidate = {
  domain: MathematicalDomain;
  confidence: number;
  code: string;
  source: CurriculumSource;
};

function collectCurriculumText(
  question: CanonicalTeachingQuestion,
): {
  topic: string;
  primarySkill: string;
  secondarySkills: string[];
  legacySkill: string;
  tags: string[];
} {
  return {
    topic: question.curriculum.topicName ?? "",
    primarySkill:
      question.curriculum.primarySkill?.name ?? "",
    secondarySkills:
      question.curriculum.secondarySkills.map(
        (skill) => skill.name,
      ),
    legacySkill:
      question.curriculum.legacySkillLabel ?? "",
    tags: question.curriculum.skillTags ?? [],
  };
}

function candidateFromText(
  textRaw: string,
  source: CurriculumSource,
  multiplier = 1,
): DomainCandidate | null {
  const text = lower(textRaw);
  if (!text) return null;

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
      test: /\balgebra\b|\bequation\b|\bsymbols?\b|\bunknowns?\b|\bexpression\b/,
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
      test: /\btransfers?\b|\bchanging differences?\b|\beffect of a transfer\b/,
      domain: "whole_numbers",
      confidence: 0.94,
      code: "CURRICULUM_TRANSFER_REASONING",
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
    if (rule.test.test(text)) {
      return {
        domain: rule.domain,
        confidence: Math.min(
          0.999,
          rule.confidence * multiplier,
        ),
        code: rule.code,
        source,
      };
    }
  }

  return null;
}

function topicCandidate(
  topicRaw: string,
): DomainCandidate | null {
  const topic = lower(topicRaw);

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
    time: "time",
  };

  const domain = exact[topic];
  if (!domain) return null;

  return {
    domain,
    confidence: 0.96,
    code: "CURRICULUM_TOPIC_EXACT",
    source: "topic",
  };
}

function chooseCandidate(
  candidates: DomainCandidate[],
): DomainCandidate | null {
  if (candidates.length === 0) return null;

  // A specific skill can refine a broader topic.
  const topic = candidates.find(
    (candidate) => candidate.source === "topic",
  );

  const explicitSkill = candidates.find(
    (candidate) =>
      candidate.source === "primary_skill" ||
      candidate.source === "legacy_skill",
  );

  if (
    topic &&
    explicitSkill &&
    topic.domain === "measurement" &&
    explicitSkill.domain === "money"
  ) {
    return explicitSkill;
  }

  // Topic + an explicit skill agreement is stronger than stale tags.
  const agreement = candidates.filter(
    (candidate) =>
      candidate.source !== "skill_tag" &&
      candidate.domain ===
        (explicitSkill?.domain ?? topic?.domain),
  );

  if (
    agreement.length >= 2 &&
    (explicitSkill || topic)
  ) {
    const selected = explicitSkill ?? topic!;
    return {
      ...selected,
      confidence: Math.max(
        ...agreement.map(
          (candidate) => candidate.confidence,
        ),
      ),
    };
  }

  // Explicit skills outrank generic topic labels; exact topic outranks tags.
  const sourceOrder: CurriculumSource[] = [
    "primary_skill",
    "legacy_skill",
    "topic",
    "secondary_skill",
    "skill_tag",
    "unknown",
  ];

  return [...candidates].sort((a, b) => {
    const ai = sourceOrder.indexOf(a.source);
    const bi = sourceOrder.indexOf(b.source);

    if (ai !== bi) return ai - bi;
    return b.confidence - a.confidence;
  })[0];
}

export function buildCurriculumContext(
  question: CanonicalTeachingQuestion,
): CurriculumContext {
  const collected = collectCurriculumText(question);

  const candidates: DomainCandidate[] = [];

  const primary = candidateFromText(
    collected.primarySkill,
    "primary_skill",
    1,
  );
  if (primary) candidates.push(primary);

  const legacy = candidateFromText(
    collected.legacySkill,
    "legacy_skill",
    // Legacy labels are useful but are not allowed to overpower a
    // clear topic + prompt agreement merely because they contain
    // a generic word such as "data" or "reasoning".
    /\bvisual and data reasoning\b/i.test(
      collected.legacySkill,
    )
      ? 0.82
      : 0.98,
  );
  if (legacy) candidates.push(legacy);

  const topic = topicCandidate(collected.topic);
  if (topic) candidates.push(topic);

  for (const skill of collected.secondarySkills) {
    const candidate = candidateFromText(
      skill,
      "secondary_skill",
      0.95,
    );
    if (candidate) candidates.push(candidate);
  }

  // Tags are deliberately last and materially weaker. They frequently
  // contain migration/source labels and must never override an explicit
  // topic or named skill.
  for (const tag of collected.tags) {
    const candidate = candidateFromText(
      tag,
      "skill_tag",
      0.76,
    );
    if (candidate) candidates.push(candidate);
  }

  const dataTopic =
    topic?.domain === "data";

  const legacyLooksLikeDataContext =
    /\bfrom data\b|\bfrom a graph\b|\bfrom graph\b|\bdata reasoning\b/.test(
      lower(collected.legacySkill),
    );

  const selected =
    dataTopic &&
    legacyLooksLikeDataContext
      ? topic
      : chooseCandidate(candidates);

  return {
    topic: collected.topic || null,
    primarySkill: collected.primarySkill || null,
    secondarySkills: collected.secondarySkills,
    legacySkill: collected.legacySkill || null,
    skillTags: collected.tags,
    inferredDomain:
      selected?.domain ?? "unknown",
    confidence:
      selected?.confidence ?? 0.2,
    reasonCodes:
      selected
        ? [selected.code]
        : ["CURRICULUM_DOMAIN_UNKNOWN"],
    selectedSource:
      selected?.source ?? "unknown",
  };
}
