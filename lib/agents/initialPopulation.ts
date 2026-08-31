import "server-only";

import {
  type AgentPersonaSpec,
  type AgentProvisionSpec,
  validateAgentProvisionSpec,
} from "@/lib/agents/provision";

/* =====================================================================
   DREAMSCAPE INITIAL AGENT POPULATION
   VERSION: phase1-v1

   IMPORTANT:
   - Deterministic.
   - Does not access Supabase.
   - Does not create users.
   - Does not mutate anything.
   - Produces exactly 100 AgentProvisionSpec objects.
   ===================================================================== */

export const INITIAL_AGENT_POPULATION_SIZE = 100;
export const INITIAL_AGENT_POPULATION_VERSION = "phase1-v1";

/*
 * Never casually change this once the initial population is approved.
 *
 * A different future population should receive:
 *   phase1-v2
 *   phase2-v1
 * etc.
 */
const POPULATION_SEED = 8312026;

const DAY_MS = 24 * 60 * 60 * 1000;

/*
 * The education snapshot is based on the Phase 1 population design date.
 * DOB remains permanent. syntheticAge is calculated from the DOB at runtime.
 */
const POPULATION_REFERENCE_DATE =
  new Date(Date.UTC(2026, 7, 31));

type Archetype =
  | "balanced"
  | "saver"
  | "spender"
  | "competitive"
  | "collector"
  | "rover_specialist"
  | "explorer"
  | "casual"
  | "strategist";

type EconomyTier =
  | "starter"
  | "early"
  | "growing"
  | "established"
  | "affluent"
  | "wealthy";

type EducationKind =
  | "primary"
  | "secondary"
  | "jc"
  | "regular";

type EducationProfile = {
  accountRole:
    | "student"
    | "regular";

  educationLevel: string;

  primaryLevel:
    | number
    | null;

  seedAge: number;

  kind: EducationKind;
};

type PopulationWorkingRow = {
  index: number;
  generationSeed: number;

  education: EducationProfile;
  archetype: Archetype;
  economyTier: EconomyTier;

  worldAffinity:
    | "nova"
    | "milo"
    | "both";

  startingDtTarget: number;
  startingDgTarget: number;
};

const NATURAL_NAMES = [
  "Amelia Tan",
  "Ethan Lim",
  "Chloe Ng",
  "Lucas Lee",
  "Maya Koh",
  "Noah Goh",
  "Sophie Ong",
  "Ryan Teo",
  "Hannah Chua",
  "Caleb Ho",

  "Alyssa Wong",
  "Dylan Yeo",
  "Emma Low",
  "Isaac Tan",
  "Zoe Lim",
  "Jayden Ng",
  "Natalie Lee",
  "Aaron Koh",
  "Grace Goh",
  "Marcus Ong",

  "Aisha Rahman",
  "Adam Ismail",
  "Sara Hamid",
  "Danish Malik",
  "Hana Aziz",
  "Zayn Ahmad",
  "Nur Iman",
  "Rayyan Farid",
  "Sofia Karim",
  "Irfan Hassan",

  "Ananya Rao",
  "Arjun Nair",
  "Priya Menon",
  "Rohan Iyer",
  "Kavya Shah",
  "Dev Patel",
  "Meera Krishnan",
  "Vihaan Kumar",
  "Tara Singh",
  "Nikhil Jain",

  "Olivia Chen",
  "Liam Zhang",
  "Ava Liu",
  "Evan Huang",
  "Mia Lin",
  "Leo Wu",
  "Ella Zhou",
  "Nathan Xu",
  "Clara Sun",
  "Adrian Guo",

  "Jasmine Tay",
  "Benjamin Foo",
  "Celeste Quek",
  "Joshua Ang",
  "Kayla Sim",
  "Gabriel Neo",
  "Nicole Toh",
  "Samuel Seah",
  "Rachel Liew",
  "Daniel Phua",

  "Isabelle Tan",
  "Julian Lim",
  "Megan Ng",
  "Tristan Lee",
  "Felicia Koh",
  "Jordan Goh",
  "Bianca Ong",
  "Damian Teo",
  "Paige Chua",
  "Darren Ho",

  "Lina Park",
  "Minho Kim",
  "Yuna Lee",
  "Jisoo Han",
  "Haru Sato",
  "Ren Ito",
  "Emi Kato",
  "Kaito Mori",
  "Nari Choi",
  "Jun Seo",

  "Elena Garcia",
  "Mateo Silva",
  "Sofia Martin",
  "Luca Rossi",
  "Clara Moretti",
  "Hugo Laurent",
  "Elise Bernard",
  "Theo Dubois",
  "Maya Santos",
  "Rafael Costa",

  "Avery Morgan",
  "Riley Carter",
  "Jordan Blake",
  "Casey Brooks",
  "Taylor Reed",
  "Cameron Hayes",
  "Morgan Price",
  "Jamie Foster",
  "Alex Quinn",
  "Rowan Cole",
] as const;

/* =====================================================================
   SEEDED RANDOMNESS
   ===================================================================== */

function mulberry32(seed: number) {
  let value = seed >>> 0;

  return function random() {
    value += 0x6d2b79f5;

    let result = value;

    result = Math.imul(
      result ^ (result >>> 15),
      result | 1,
    );

    result ^=
      result +
      Math.imul(
        result ^ (result >>> 7),
        result | 61,
      );

    return (
      (
        result ^
        (result >>> 14)
      ) >>> 0
    ) / 4294967296;
  };
}

function randomInt(
  min: number,
  max: number,
  random: () => number,
) {
  return Math.floor(
    random() *
      (max - min + 1),
  ) + min;
}

function clamp01(value: number) {
  return Math.max(
    0,
    Math.min(1, value),
  );
}

function round3(value: number) {
  return Math.round(
    value * 1000,
  ) / 1000;
}

function jitter(
  value: number,
  random: () => number,
  amount = 0.09,
) {
  const offset =
    (random() * 2 - 1) *
    amount;

  return round3(
    clamp01(
      value + offset,
    ),
  );
}

function shuffled<T>(
  input: readonly T[],
  random: () => number,
) {
  const result = [
    ...input,
  ];

  for (
    let i =
      result.length - 1;
    i > 0;
    i -= 1
  ) {
    const j =
      Math.floor(
        random() *
          (i + 1),
      );

    [
      result[i],
      result[j],
    ] = [
      result[j],
      result[i],
    ];
  }

  return result;
}

function weightedChoice<T>(
  choices: Array<{
    value: T;
    weight: number;
  }>,
  random: () => number,
): T {
  const total =
    choices.reduce(
      (
        sum,
        choice,
      ) =>
        sum +
        choice.weight,
      0,
    );

  let cursor =
    random() *
    total;

  for (
    const choice
    of choices
  ) {
    cursor -=
      choice.weight;

    if (cursor <= 0) {
      return choice.value;
    }
  }

  return choices[
    choices.length - 1
  ].value;
}

/* =====================================================================
   IDENTITY HELPERS
   ===================================================================== */

function padAgentNumber(
  value: number,
) {
  return String(value)
    .padStart(4, "0");
}

function emailAgentNumber(
  value: number,
) {
  return String(value)
    .padStart(3, "0");
}

function usernameFromName(
  name: string,
) {
  return name
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "_",
    )
    .replace(
      /^_+|_+$/g,
      "",
    )
    .slice(0, 20);
}

/* =====================================================================
   EDUCATION DISTRIBUTION

   85 students
   ├─ 48 primary
   │   └─ exactly 8 × P1–P6
   ├─ 24 secondary
   │   └─ exactly 6 × Secondary 1–4
   └─ 13 JC
       ├─ 7 × JC1
       └─ 6 × JC2

   15 regular users
   ===================================================================== */

function buildEducationPool() {
  const result:
    EducationProfile[] = [];

  for (
    let primaryLevel = 1;
    primaryLevel <= 6;
    primaryLevel += 1
  ) {
    for (
      let count = 0;
      count < 8;
      count += 1
    ) {
      result.push({
        accountRole:
          "student",

        educationLevel:
          `P${primaryLevel}`,

        primaryLevel,

        seedAge:
          6 +
          primaryLevel,

        kind:
          "primary",
      });
    }
  }

  for (
    let secondaryLevel = 1;
    secondaryLevel <= 4;
    secondaryLevel += 1
  ) {
    for (
      let count = 0;
      count < 6;
      count += 1
    ) {
      result.push({
        accountRole:
          "student",

        educationLevel:
          `Secondary ${secondaryLevel}`,

        primaryLevel:
          null,

        seedAge:
          12 +
          secondaryLevel,

        kind:
          "secondary",
      });
    }
  }

  for (
    let count = 0;
    count < 13;
    count += 1
  ) {
    const jcLevel =
      count < 7
        ? 1
        : 2;

    result.push({
      accountRole:
        "student",

      educationLevel:
        `JC${jcLevel}`,

      primaryLevel:
        null,

      seedAge:
        16 +
        jcLevel,

      kind:
        "jc",
    });
  }

  const regularLabels = [
    "Working Adult",
    "Polytechnic",
    "University",
    "ITE",
    "General Learner",
  ];

  for (
    let count = 0;
    count < 15;
    count += 1
  ) {
    result.push({
      accountRole:
        "regular",

      educationLevel:
        regularLabels[
          count %
          regularLabels.length
        ],

      primaryLevel:
        null,

      seedAge:
        19 +
        (
          (
            count *
            7
          ) %
          17
        ),

      kind:
        "regular",
    });
  }

  if (
    result.length !==
    INITIAL_AGENT_POPULATION_SIZE
  ) {
    throw new Error(
      `Education pool produced ${result.length} profiles instead of 100.`,
    );
  }

  return result;
}

/* =====================================================================
   ARCHETYPE DISTRIBUTION
   ===================================================================== */

function buildArchetypePool() {
  const values:
    Archetype[] = [];

  function add(
    archetype: Archetype,
    count: number,
  ) {
    for (
      let i = 0;
      i < count;
      i += 1
    ) {
      values.push(
        archetype,
      );
    }
  }

  add("balanced", 20);
  add("saver", 15);
  add("spender", 15);
  add("competitive", 15);
  add("collector", 10);
  add("rover_specialist", 10);
  add("explorer", 5);
  add("casual", 5);
  add("strategist", 5);

  return values;
}

/* =====================================================================
   ECONOMIC STARTING STATES
   ===================================================================== */

function buildEconomyTierPool() {
  const values:
    EconomyTier[] = [];

  function add(
    tier: EconomyTier,
    count: number,
  ) {
    for (
      let i = 0;
      i < count;
      i += 1
    ) {
      values.push(
        tier,
      );
    }
  }

  add("starter", 20);
  add("early", 20);
  add("growing", 25);
  add("established", 20);
  add("affluent", 10);
  add("wealthy", 5);

  return values;
}

function startingDtForTier(
  tier: EconomyTier,
  random: () => number,
) {
  switch (tier) {
    case "starter":
      return randomInt(
        100,
        750,
        random,
      );

    case "early":
      return randomInt(
        751,
        2000,
        random,
      );

    case "growing":
      return randomInt(
        2001,
        4500,
        random,
      );

    case "established":
      return randomInt(
        4501,
        7000,
        random,
      );

    case "affluent":
      return randomInt(
        7001,
        9000,
        random,
      );

    case "wealthy":
      return randomInt(
        9001,
        10000,
        random,
      );
  }
}

/* =====================================================================
   DOB / AGE
   ===================================================================== */

function dateOnly(
  date: Date,
) {
  return date
    .toISOString()
    .slice(0, 10);
}

function dateOfBirthForSeedAge(
  age: number,
  random: () => number,
) {
  /*
   * Any DOB from:
   *
   * referenceDate - age years - 364 days
   *
   * through:
   *
   * referenceDate - age years
   *
   * produces exactly that age on the population reference date.
   */
  const anniversary =
    new Date(
      Date.UTC(
        POPULATION_REFERENCE_DATE
          .getUTCFullYear() -
          age,

        POPULATION_REFERENCE_DATE
          .getUTCMonth(),

        POPULATION_REFERENCE_DATE
          .getUTCDate(),
      ),
    );

  const backwardsDays =
    randomInt(
      0,
      364,
      random,
    );

  return dateOnly(
    new Date(
      anniversary.getTime() -
        backwardsDays *
          DAY_MS,
    ),
  );
}

function calculateCurrentAge(
  dateOfBirth: string,
) {
  const birth =
    new Date(
      `${dateOfBirth}T00:00:00Z`,
    );

  const now =
    new Date();

  let age =
    now.getUTCFullYear() -
    birth.getUTCFullYear();

  const monthDifference =
    now.getUTCMonth() -
    birth.getUTCMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      now.getUTCDate() <
        birth.getUTCDate()
    )
  ) {
    age -= 1;
  }

  return age;
}

/* =====================================================================
   WORLD AFFINITY

   Primary-age agents are Nova-only because Milo is 13+.

   Older users may be:
   - Nova-focused
   - Milo-focused
   - both-world
   ===================================================================== */

function chooseWorldAffinity(
  education:
    EducationProfile,
  random: () => number,
):
  | "nova"
  | "milo"
  | "both" {

  if (
    education.kind ===
    "primary"
  ) {
    return "nova";
  }

  if (
    education.kind ===
      "secondary" ||
    education.kind ===
      "jc"
  ) {
    return weightedChoice(
      [
        {
          value:
            "milo" as const,
          weight:
            0.42,
        },
        {
          value:
            "both" as const,
          weight:
            0.5,
        },
        {
          value:
            "nova" as const,
          weight:
            0.08,
        },
      ],
      random,
    );
  }

  return weightedChoice(
    [
      {
        value:
          "milo" as const,
        weight:
          0.5,
      },
      {
        value:
          "both" as const,
        weight:
          0.4,
      },
      {
        value:
          "nova" as const,
        weight:
          0.1,
      },
    ],
    random,
  );
}

/* =====================================================================
   PERSONAS
   ===================================================================== */

type CorePersonaValues = Pick<
  AgentPersonaSpec,
  | "competitiveness"
  | "curiosity"
  | "patience"
  | "savingTendency"
  | "spendingTendency"
  | "riskTolerance"
  | "socialTendency"
  | "explorationTendency"
  | "collectionTendency"
  | "progressionTendency"
  | "activityLevel"
  | "quizSkill"
  | "impulsiveness"
  | "planningHorizon"
>;

function basePersona(
  archetype: Archetype,
): CorePersonaValues {
  switch (archetype) {
    case "saver":
      return {
        competitiveness: 0.42,
        curiosity: 0.53,
        patience: 0.84,
        savingTendency: 0.91,
        spendingTendency: 0.19,
        riskTolerance: 0.28,
        socialTendency: 0.39,
        explorationTendency: 0.43,
        collectionTendency: 0.39,
        progressionTendency: 0.62,
        activityLevel: 0.58,
        quizSkill: 0.66,
        impulsiveness: 0.17,
        planningHorizon: 0.9,
      };

    case "spender":
      return {
        competitiveness: 0.48,
        curiosity: 0.67,
        patience: 0.31,
        savingTendency: 0.2,
        spendingTendency: 0.91,
        riskTolerance: 0.67,
        socialTendency: 0.62,
        explorationTendency: 0.65,
        collectionTendency: 0.74,
        progressionTendency: 0.59,
        activityLevel: 0.7,
        quizSkill: 0.61,
        impulsiveness: 0.84,
        planningHorizon: 0.29,
      };

    case "competitive":
      return {
        competitiveness: 0.92,
        curiosity: 0.62,
        patience: 0.55,
        savingTendency: 0.49,
        spendingTendency: 0.51,
        riskTolerance: 0.67,
        socialTendency: 0.71,
        explorationTendency: 0.5,
        collectionTendency: 0.36,
        progressionTendency: 0.88,
        activityLevel: 0.83,
        quizSkill: 0.79,
        impulsiveness: 0.49,
        planningHorizon: 0.65,
      };

    case "collector":
      return {
        competitiveness: 0.41,
        curiosity: 0.69,
        patience: 0.65,
        savingTendency: 0.49,
        spendingTendency: 0.68,
        riskTolerance: 0.39,
        socialTendency: 0.55,
        explorationTendency: 0.64,
        collectionTendency: 0.95,
        progressionTendency: 0.61,
        activityLevel: 0.7,
        quizSkill: 0.61,
        impulsiveness: 0.52,
        planningHorizon: 0.69,
      };

    case "rover_specialist":
      return {
        competitiveness: 0.73,
        curiosity: 0.69,
        patience: 0.62,
        savingTendency: 0.59,
        spendingTendency: 0.53,
        riskTolerance: 0.73,
        socialTendency: 0.46,
        explorationTendency: 0.67,
        collectionTendency: 0.35,
        progressionTendency: 0.94,
        activityLevel: 0.81,
        quizSkill: 0.68,
        impulsiveness: 0.46,
        planningHorizon: 0.72,
      };

    case "explorer":
      return {
        competitiveness: 0.48,
        curiosity: 0.95,
        patience: 0.52,
        savingTendency: 0.43,
        spendingTendency: 0.6,
        riskTolerance: 0.76,
        socialTendency: 0.63,
        explorationTendency: 0.95,
        collectionTendency: 0.61,
        progressionTendency: 0.64,
        activityLevel: 0.75,
        quizSkill: 0.62,
        impulsiveness: 0.62,
        planningHorizon: 0.45,
      };

    case "casual":
      return {
        competitiveness: 0.28,
        curiosity: 0.49,
        patience: 0.66,
        savingTendency: 0.56,
        spendingTendency: 0.42,
        riskTolerance: 0.36,
        socialTendency: 0.48,
        explorationTendency: 0.44,
        collectionTendency: 0.41,
        progressionTendency: 0.42,
        activityLevel: 0.26,
        quizSkill: 0.57,
        impulsiveness: 0.38,
        planningHorizon: 0.55,
      };

    case "strategist":
      return {
        competitiveness: 0.69,
        curiosity: 0.77,
        patience: 0.86,
        savingTendency: 0.69,
        spendingTendency: 0.4,
        riskTolerance: 0.62,
        socialTendency: 0.47,
        explorationTendency: 0.58,
        collectionTendency: 0.34,
        progressionTendency: 0.82,
        activityLevel: 0.72,
        quizSkill: 0.78,
        impulsiveness: 0.18,
        planningHorizon: 0.95,
      };

    case "balanced":
    default:
      return {
        competitiveness: 0.55,
        curiosity: 0.62,
        patience: 0.58,
        savingTendency: 0.54,
        spendingTendency: 0.5,
        riskTolerance: 0.5,
        socialTendency: 0.56,
        explorationTendency: 0.58,
        collectionTendency: 0.52,
        progressionTendency: 0.67,
        activityLevel: 0.65,
        quizSkill: 0.65,
        impulsiveness: 0.45,
        planningHorizon: 0.6,
      };
  }
}

function buildInterests(
  archetype: Archetype,
  worldAffinity:
    | "nova"
    | "milo"
    | "both",
  random: () => number,
) {
  let values:
    Record<string, number>;

  if (
    worldAffinity ===
    "nova"
  ) {
    values = {
      core_missions: 0.82,
      knowledge_arena: 0.74,
      milo_categories: 0.03,
      rover: 0.68,
      wardrobe: 0.51,
      nova_home: 0.7,
      rug_rush: 0.48,
      milo_exchange: 0.03,
    };
  } else if (
    worldAffinity ===
    "milo"
  ) {
    values = {
      core_missions: 0.08,
      knowledge_arena: 0.08,
      milo_categories: 0.82,
      rover: 0.05,
      wardrobe: 0.08,
      nova_home: 0.06,
      rug_rush: 0.04,
      milo_exchange: 0.79,
    };
  } else {
    values = {
      core_missions: 0.66,
      knowledge_arena: 0.64,
      milo_categories: 0.68,
      rover: 0.57,
      wardrobe: 0.45,
      nova_home: 0.56,
      rug_rush: 0.42,
      milo_exchange: 0.64,
    };
  }

  function adjust(
    key: string,
    amount: number,
  ) {
    values[key] =
      clamp01(
        (values[key] ?? 0) +
          amount,
      );
  }

  switch (archetype) {
    case "collector":
      adjust(
        "wardrobe",
        0.3,
      );
      adjust(
        "nova_home",
        0.23,
      );
      adjust(
        "rug_rush",
        0.17,
      );
      break;

    case "rover_specialist":
      adjust(
        "rover",
        0.31,
      );
      adjust(
        "core_missions",
        0.11,
      );
      break;

    case "competitive":
      adjust(
        "knowledge_arena",
        0.24,
      );
      adjust(
        "milo_categories",
        0.24,
      );
      break;

    case "explorer":
      for (
        const key
        of Object.keys(
          values,
        )
      ) {
        adjust(
          key,
          0.14,
        );
      }
      break;

    case "spender":
      adjust(
        "wardrobe",
        0.19,
      );
      adjust(
        "nova_home",
        0.15,
      );
      break;

    case "strategist":
      adjust(
        "milo_exchange",
        0.23,
      );
      break;

    case "casual":
      for (
        const key
        of Object.keys(
          values,
        )
      ) {
        adjust(
          key,
          -0.1,
        );
      }
      break;

    default:
      break;
  }

  return Object.fromEntries(
    Object.entries(
      values,
    ).map(
      ([key, value]) => [
        key,
        jitter(
          value,
          random,
          0.05,
        ),
      ],
    ),
  );
}

function preferredSinks(
  archetype: Archetype,
) {
  switch (archetype) {
    case "collector":
      return [
        "wardrobe",
        "nova_home",
        "rugs",
      ];

    case "rover_specialist":
      return [
        "rover_upgrades",
        "nova_home",
      ];

    case "spender":
      return [
        "wardrobe",
        "nova_home",
        "tools",
      ];

    case "strategist":
      return [
        "milo_exchange",
        "high_utility_upgrades",
      ];

    case "competitive":
      return [
        "progression",
        "rover_upgrades",
      ];

    case "explorer":
      return [
        "mixed",
      ];

    case "saver":
      return [
        "high_value_only",
      ];

    case "casual":
      return [
        "occasional",
      ];

    default:
      return [
        "mixed",
        "progression",
      ];
  }
}

function buildPersona(
  archetype: Archetype,
  worldAffinity:
    | "nova"
    | "milo"
    | "both",
  random: () => number,
): AgentPersonaSpec {
  const base =
    basePersona(
      archetype,
    );

  const persona:
    CorePersonaValues = {
    competitiveness:
      jitter(
        base.competitiveness,
        random,
      ),

    curiosity:
      jitter(
        base.curiosity,
        random,
      ),

    patience:
      jitter(
        base.patience,
        random,
      ),

    savingTendency:
      jitter(
        base.savingTendency,
        random,
      ),

    spendingTendency:
      jitter(
        base.spendingTendency,
        random,
      ),

    riskTolerance:
      jitter(
        base.riskTolerance,
        random,
      ),

    socialTendency:
      jitter(
        base.socialTendency,
        random,
      ),

    explorationTendency:
      jitter(
        base.explorationTendency,
        random,
      ),

    collectionTendency:
      jitter(
        base.collectionTendency,
        random,
      ),

    progressionTendency:
      jitter(
        base.progressionTendency,
        random,
      ),

    activityLevel:
      jitter(
        base.activityLevel,
        random,
      ),

    quizSkill:
      jitter(
        base.quizSkill,
        random,
        0.11,
      ),

    impulsiveness:
      jitter(
        base.impulsiveness,
        random,
      ),

    planningHorizon:
      jitter(
        base.planningHorizon,
        random,
      ),
  };

  const reserveRatio =
    round3(
      clamp01(
        0.1 +
          persona
            .savingTendency *
            0.72,
      ),
    );

  const dgConservation =
    round3(
      clamp01(
        0.2 +
          persona
            .savingTendency *
            0.45 +
          persona
            .planningHorizon *
            0.25,
      ),
    );

  return {
    archetype,

    ...persona,

    interests:
      buildInterests(
        archetype,
        worldAffinity,
        random,
      ),

    economicPreferences: {
      reserve_ratio:
        reserveRatio,

      discretionary_spend_ratio:
        round3(
          clamp01(
            1 -
              reserveRatio,
          ),
        ),

      dg_conservation:
        dgConservation,

      price_sensitivity:
        round3(
          clamp01(
            0.2 +
              persona
                .savingTendency *
                0.65,
          ),
        ),

      preferred_sinks:
        preferredSinks(
          archetype,
        ),
    },

    behaviouralParameters: {
      sessions_per_week_target:
        Math.max(
          1,
          Math.round(
            1 +
              persona
                .activityLevel *
                9,
          ),
        ),

      actions_per_session_target:
        Math.max(
          1,
          Math.round(
            1 +
              persona
                .activityLevel *
                5,
          ),
        ),

      decision_noise:
        round3(
          0.04 +
            persona
              .impulsiveness *
              0.28,
        ),

      novelty_bias:
        round3(
          0.05 +
            persona
              .explorationTendency *
              0.45,
        ),

      retry_after_failure:
        round3(
          clamp01(
            0.25 +
              persona
                .patience *
                0.55 +
              persona
                .competitiveness *
                0.15,
          ),
        ),
    },
  };
}

/* =====================================================================
   GOALS
   ===================================================================== */

function primaryGoal(
  archetype: Archetype,
  startingDt: number,
  worldAffinity:
    | "nova"
    | "milo"
    | "both",
) {
  switch (archetype) {
    case "saver":
      return {
        goalSlot:
          "primary" as const,

        goalScope:
          "economy",

        goalType:
          "build_dt_reserve",

        title:
          "Build a larger Dream Token reserve",

        description:
          "Increase DT reserves while avoiding low-value spending.",

        priority:
          90,

        targetData: {
          target_dt:
            startingDt +
            Math.max(
              1200,
              Math.round(
                startingDt *
                  0.35,
              ),
            ),
        },
      };

    case "spender":
      return {
        goalSlot:
          "primary" as const,

        goalScope:
          "economy",

        goalType:
          "expand_inventory",

        title:
          "Build a varied Dreamscape collection",

        description:
          "Earn currency and regularly convert it into useful or desirable assets.",

        priority:
          86,

        targetData: {
          target_new_assets:
            8,
        },
      };

    case "competitive":
      return {
        goalSlot:
          "primary" as const,

        goalScope:
          worldAffinity,

        goalType:
          "competitive_progress",

        title:
          "Become a high-performing challenger",

        description:
          "Prioritise strong results and improve competitive standing.",

        priority:
          94,

        targetData: {
          target_percentile:
            75,
        },
      };

    case "collector":
      return {
        goalSlot:
          "primary" as const,

        goalScope:
          worldAffinity ===
          "milo"
            ? "global"
            : "nova",

        goalType:
          "collect_assets",

        title:
          "Build a distinctive collection",

        description:
          "Acquire a meaningful set of owned Dreamscape assets.",

        priority:
          91,

        targetData: {
          target_owned_assets:
            12,
        },
      };

    case "rover_specialist":
      return {
        goalSlot:
          "primary" as const,

        goalScope:
          "nova",

        goalType:
          "rover_progression",

        title:
          "Advance the rover upgrade track",

        description:
          "Earn resources and prioritise rover progression.",

        priority:
          95,

        targetData: {
          target_rover_stage:
            4,
        },
      };

    case "explorer":
      return {
        goalSlot:
          "primary" as const,

        goalScope:
          "global",

        goalType:
          "explore_activities",

        title:
          "Explore the full Dreamscape experience",

        description:
          "Try a broad range of activities rather than specialising immediately.",

        priority:
          87,

        targetData: {
          distinct_activity_types:
            8,
        },
      };

    case "casual":
      return {
        goalSlot:
          "primary" as const,

        goalScope:
          "global",

        goalType:
          "steady_participation",

        title:
          "Maintain a relaxed Dreamscape routine",

        description:
          "Make steady progress without optimising every session.",

        priority:
          72,

        targetData: {
          weekly_sessions:
            2,
        },
      };

    case "strategist":
      return {
        goalSlot:
          "primary" as const,

        goalScope:
          "economy",

        goalType:
          "grow_net_worth",

        title:
          "Grow Dreamscape net worth efficiently",

        description:
          "Balance saving, earning and high-utility spending over the long term.",

        priority:
          95,

        targetData: {
          target_net_worth:
            Math.max(
              startingDt +
                2000,

              Math.round(
                startingDt *
                  1.5,
              ),
            ),
        },
      };

    case "balanced":
    default:
      return {
        goalSlot:
          "primary" as const,

        goalScope:
          "global",

        goalType:
          "balanced_progression",

        title:
          "Build steady progress across Dreamscape",

        description:
          "Balance learning, progression, saving and spending.",

        priority:
          84,

        targetData: {
          meaningful_actions:
            20,
        },
      };
  }
}

function secondaryGoal(
  worldAffinity:
    | "nova"
    | "milo"
    | "both",
) {
  if (
    worldAffinity ===
    "nova"
  ) {
    return {
      goalSlot:
        "secondary" as const,

      goalScope:
        "nova",

      goalType:
        "nova_progress",

      title:
        "Strengthen Nova progression",

      description:
        "Make regular progress through Nova activities and systems.",

      priority:
        65,

      targetData: {
        completed_activities:
          10,
      },
    };
  }

  if (
    worldAffinity ===
    "milo"
  ) {
    return {
      goalSlot:
        "secondary" as const,

      goalScope:
        "milo",

      goalType:
        "milo_progress",

      title:
        "Strengthen Milo progression",

      description:
        "Develop knowledge and economic participation in Milo.",

      priority:
        65,

      targetData: {
        completed_activities:
          10,
      },
    };
  }

  return {
    goalSlot:
      "secondary" as const,

    goalScope:
      "global",

    goalType:
      "cross_world_progress",

    title:
      "Progress in both worlds",

    description:
      "Maintain meaningful activity in Nova and Milo.",

    priority:
      66,

    targetData: {
      nova_activities:
        5,

      milo_activities:
        5,
    },
  };
}

function currentGoal() {
  return {
    goalSlot:
      "current" as const,

    goalScope:
      "global",

    goalType:
      "initial_activation",

    title:
      "Complete the first active session",

    description:
      "After activation, complete the first three meaningful Dreamscape actions.",

    priority:
      75,

    targetData: {
      meaningful_actions:
        3,
    },
  };
}

/* =====================================================================
   POPULATION CONSTRUCTION
   ===================================================================== */

function buildWorkingRows() {
  const populationRandom =
    mulberry32(
      POPULATION_SEED,
    );

  const educationPool =
    shuffled(
      buildEducationPool(),
      populationRandom,
    );

  const archetypePool =
    shuffled(
      buildArchetypePool(),
      populationRandom,
    );

  const economyPool =
    shuffled(
      buildEconomyTierPool(),
      populationRandom,
    );

  const rows:
    PopulationWorkingRow[] =
      [];

  for (
    let index = 0;
    index <
    INITIAL_AGENT_POPULATION_SIZE;
    index += 1
  ) {
    const generationSeed =
      POPULATION_SEED +
      (
        index + 1
      ) *
        104729;

    const random =
      mulberry32(
        generationSeed,
      );

    const education =
      educationPool[index];

    const economyTier =
      economyPool[index];

    rows.push({
      index,

      generationSeed,

      education,

      archetype:
        archetypePool[index],

      economyTier,

      worldAffinity:
        chooseWorldAffinity(
          education,
          random,
        ),

      startingDtTarget:
        startingDtForTier(
          economyTier,
          random,
        ),

      startingDgTarget:
        randomInt(
          1,
          10,
          random,
        ),
    });
  }

  /*
   * Deliberately include both exact economic boundaries
   * in the test population.
   */
  const firstStarter =
    rows.find(
      (row) =>
        row.economyTier ===
        "starter",
    );

  if (firstStarter) {
    firstStarter
      .startingDtTarget =
      100;
  }

  const firstWealthy =
    rows.find(
      (row) =>
        row.economyTier ===
        "wealthy",
    );

  if (firstWealthy) {
    firstWealthy
      .startingDtTarget =
      10000;
  }

  return rows;
}

export function buildInitialAgentPopulation():
  AgentProvisionSpec[] {
  if (
    NATURAL_NAMES.length !==
    INITIAL_AGENT_POPULATION_SIZE
  ) {
    throw new Error(
      `Expected exactly 100 natural names but found ${NATURAL_NAMES.length}.`,
    );
  }

  const rows =
    buildWorkingRows();

  const specs =
    rows.map(
      (
        row,
        index,
      ) => {
        const agentNumber =
          index + 1;

        const random =
          mulberry32(
            row.generationSeed ^
              0x4a3b2c1d,
          );

        const naturalName =
          NATURAL_NAMES[index];

        const username =
          usernameFromName(
            naturalName,
          );

        const dateOfBirth =
          dateOfBirthForSeedAge(
            row.education
              .seedAge,
            random,
          );

        const syntheticAge =
          calculateCurrentAge(
            dateOfBirth,
          );

        const persona =
          buildPersona(
            row.archetype,
            row.worldAffinity,
            random,
          );

        const spec:
          AgentProvisionSpec = {
          agentCode:
            `DSBOT-${padAgentNumber(
              agentNumber,
            )}`,

          internalHandle:
            `agent_${padAgentNumber(
              agentNumber,
            )}`,

          email:
            `agent${emailAgentNumber(
              agentNumber,
            )}@simulation.dreamscape`,

          naturalName,

          username,

          accountRole:
            row.education
              .accountRole,

          dateOfBirth,

          syntheticAge,

          educationSystem:
            "SG",

          educationLevel:
            row.education
              .educationLevel,

          primaryLevel:
            row.education
              .primaryLevel,

          worldAffinity:
            row.worldAffinity,

          startingDtTarget:
            row.startingDtTarget,

          startingDgTarget:
            row.startingDgTarget,

          simulationAccessTier:
            "complete",

          generationSeed:
            row.generationSeed,

          seedVersion:
            INITIAL_AGENT_POPULATION_VERSION,

          cohortKey:
            "initial-100",

          policyKey:
            "rule_based",

          policyVersion:
            1,

          persona,

          goals: [
            {
              ...primaryGoal(
                row.archetype,
                row.startingDtTarget,
                row.worldAffinity,
              ),

              source:
                "seed",

              progressData:
                {},
            },

            {
              ...secondaryGoal(
                row.worldAffinity,
              ),

              source:
                "seed",

              progressData:
                {},
            },

            {
              ...currentGoal(),

              source:
                "seed",

              progressData:
                {},
            },
          ],

          metadata: {
            population:
              "initial-100",

            population_version:
              INITIAL_AGENT_POPULATION_VERSION,

            economy_tier:
              row.economyTier,

            education_kind:
              row.education.kind,

            seed_age:
              row.education
                .seedAge,

            intended_lifecycle:
              "dormant",

            intended_activation_phase:
              3,

            synthetic:
              true,
          },
        };

        /*
         * Reuse the exact Phase 1C validator.
         *
         * This catches malformed usernames, ages, trait values,
         * DT/DG ranges, invalid goal slots, etc.
         */
        return validateAgentProvisionSpec(
          spec,
        );
      },
    );

  assertPopulationIntegrity(
    specs,
  );

  return specs;
}

/* =====================================================================
   INTEGRITY TESTS
   ===================================================================== */

function assertUnique(
  values: string[],
  label: string,
) {
  const set =
    new Set(
      values.map(
        (value) =>
          value.toLowerCase(),
      ),
    );

  if (
    set.size !==
    values.length
  ) {
    throw new Error(
      `Initial population has duplicate ${label}.`,
    );
  }
}

function assertPopulationIntegrity(
  specs:
    AgentProvisionSpec[],
) {
  if (
    specs.length !==
    INITIAL_AGENT_POPULATION_SIZE
  ) {
    throw new Error(
      `Initial population contains ${specs.length} agents instead of 100.`,
    );
  }

  assertUnique(
    specs.map(
      (agent) =>
        agent.agentCode,
    ),
    "agent codes",
  );

  assertUnique(
    specs.map(
      (agent) =>
        agent.internalHandle,
    ),
    "internal handles",
  );

  assertUnique(
    specs.map(
      (agent) =>
        agent.email,
    ),
    "emails",
  );

  assertUnique(
    specs.map(
      (agent) =>
        agent.username,
    ),
    "public usernames",
  );

  const students =
    specs.filter(
      (agent) =>
        agent.accountRole ===
        "student",
    ).length;

  const regular =
    specs.filter(
      (agent) =>
        agent.accountRole ===
        "regular",
    ).length;

  if (
    students !== 85 ||
    regular !== 15
  ) {
    throw new Error(
      `Role distribution is incorrect: ${students} students / ${regular} regular.`,
    );
  }

  for (
    let primaryLevel = 1;
    primaryLevel <= 6;
    primaryLevel += 1
  ) {
    const count =
      specs.filter(
        (agent) =>
          agent.primaryLevel ===
          primaryLevel,
      ).length;

    if (count !== 8) {
      throw new Error(
        `Expected 8 P${primaryLevel} agents but found ${count}.`,
      );
    }
  }

  const dtValues =
    specs.map(
      (agent) =>
        agent.startingDtTarget,
    );

  if (
    Math.min(
      ...dtValues,
    ) !== 100 ||
    Math.max(
      ...dtValues,
    ) !== 10000
  ) {
    throw new Error(
      "Initial DT population must contain exact 100 and 10,000 boundary cases.",
    );
  }

  for (
    const agent
    of specs
  ) {
    if (
      agent.startingDgTarget <
        1 ||
      agent.startingDgTarget >
        10
    ) {
      throw new Error(
        `${agent.agentCode} has an invalid DG target.`,
      );
    }

    const educationKind =
      String(
        (
          agent.metadata ??
          {}
        )
          .education_kind ??
          "",
      );

    /*
     * Under-13 primary population must never be routed into
     * Milo or both-world cohorts.
     */
    if (
      educationKind ===
        "primary" &&
      agent.worldAffinity !==
        "nova"
    ) {
      throw new Error(
        `${agent.agentCode} is a primary learner but has non-Nova world affinity.`,
      );
    }
  }
}

/* =====================================================================
   SUMMARY
   ===================================================================== */

function countValues(
  values: string[],
) {
  return values.reduce<
    Record<
      string,
      number
    >
  >(
    (
      accumulator,
      value,
    ) => {
      accumulator[value] =
        (
          accumulator[
            value
          ] ??
          0
        ) + 1;

      return accumulator;
    },
    {},
  );
}

function average(
  values: number[],
) {
  if (
    values.length ===
    0
  ) {
    return 0;
  }

  return Math.round(
    values.reduce(
      (
        sum,
        value,
      ) =>
        sum +
        value,
      0,
    ) /
      values.length,
  );
}

export function buildInitialPopulationSummary(
  specs =
    buildInitialAgentPopulation(),
) {
  const dtValues =
    specs.map(
      (agent) =>
        agent.startingDtTarget,
    );

  const dgValues =
    specs.map(
      (agent) =>
        agent.startingDgTarget,
    );

  return {
    version:
      INITIAL_AGENT_POPULATION_VERSION,

    total:
      specs.length,

    roles:
      countValues(
        specs.map(
          (agent) =>
            agent.accountRole,
        ),
      ),

    worlds:
      countValues(
        specs.map(
          (agent) =>
            agent.worldAffinity,
        ),
      ),

    archetypes:
      countValues(
        specs.map(
          (agent) =>
            agent.persona
              .archetype,
        ),
      ),

    economyTiers:
      countValues(
        specs.map(
          (agent) =>
            String(
              (
                agent.metadata ??
                {}
              )
                .economy_tier ??
                "unknown",
            ),
        ),
      ),

    educationLevels:
      countValues(
        specs.map(
          (agent) =>
            String(
              agent.educationLevel ??
                "None",
            ),
        ),
      ),

    dt: {
      minimum:
        Math.min(
          ...dtValues,
        ),

      maximum:
        Math.max(
          ...dtValues,
        ),

      average:
        average(
          dtValues,
        ),
    },

    dg: {
      minimum:
        Math.min(
          ...dgValues,
        ),

      maximum:
        Math.max(
          ...dgValues,
        ),

      average:
        average(
          dgValues,
        ),
    },

    allDormant:
      true,

    accessTier:
      "complete",
  };
}