export const SCIENCE_LEVEL_IDS = ["p1", "p2", "p3", "p4", "p5", "p6"] as const;

export type ScienceLevelId = (typeof SCIENCE_LEVEL_IDS)[number];

export type MissionTypeId = "learn" | "practice" | "investigate" | "master";

export type ScienceTopic = {
  slug: string;
  title: string;
  quizCount: number;
  summary: string;
  learningAreas: string[];
  icon: string;
};

export type ScienceLevel = {
  id: ScienceLevelId;
  levelNumber: number;
  schoolLevel: string;
  displayName: string;
  subtitle: string;
  description: string;
  pathway: "Science Discovery" | "Primary Science";
  quizCount: number;
  theme: {
    from: string;
    via: string;
    to: string;
    glow: string;
  };
  topics: ScienceTopic[];
};

export type MissionType = {
  id: MissionTypeId;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
};

export const MISSION_TYPES: MissionType[] = [
  {
    id: "learn",
    title: "Learn Missions",
    shortTitle: "Learn",
    description: "Short concept checks supported by concise notes, diagrams and examples.",
    icon: "📘",
  },
  {
    id: "practice",
    title: "Practice Missions",
    shortTitle: "Practise",
    description: "Topic-based questions using MCQ, matching, sequencing and visual tasks.",
    icon: "🧩",
  },
  {
    id: "investigate",
    title: "Investigation Missions",
    shortTitle: "Investigate",
    description: "Experiments, observations, variables, tables, graphs and evidence.",
    icon: "🔬",
  },
  {
    id: "master",
    title: "Mastery Missions",
    shortTitle: "Master",
    description: "Mixed application questions and cumulative topic reviews.",
    icon: "🏆",
  },
];

export function splitMissionCounts(total: number): Record<MissionTypeId, number> {
  const learn = Math.floor(total * 0.3);
  const practice = Math.floor(total * 0.35);
  const investigate = Math.floor(total * 0.2);
  const master = total - learn - practice - investigate;

  return { learn, practice, investigate, master };
}

export const SCIENCE_LEVELS: ScienceLevel[] = [
  {
    id: "p1",
    levelNumber: 1,
    schoolLevel: "Primary 1",
    displayName: "Science Discovery I",
    subtitle: "Explore the world around you",
    description:
      "A visual, low-pressure introduction to observing, comparing and asking scientific questions.",
    pathway: "Science Discovery",
    quizCount: 250,
    theme: {
      from: "from-emerald-500",
      via: "via-teal-500",
      to: "to-cyan-500",
      glow: "shadow-emerald-500/20",
    },
    topics: [
      {
        slug: "thinking-like-a-scientist",
        title: "Thinking Like a Scientist",
        quizCount: 20,
        summary: "Observe carefully, compare objects, ask questions and follow basic safety rules.",
        learningAreas: ["Observing", "Comparing", "Asking questions", "Science safety"],
        icon: "🧠",
      },
      {
        slug: "living-and-non-living-things",
        title: "Living and Non-living Things",
        quizCount: 30,
        summary: "Recognise the basic characteristics and needs of living things.",
        learningAreas: ["Living things", "Non-living things", "Basic needs", "Simple sorting"],
        icon: "🌱",
      },
      {
        slug: "plants-around-us",
        title: "Plants Around Us",
        quizCount: 30,
        summary: "Explore common plants, their parts, needs and simple growth changes.",
        learningAreas: ["Plant parts", "Plant needs", "Growth", "Common plants"],
        icon: "🌿",
      },
      {
        slug: "animals-around-us",
        title: "Animals Around Us",
        quizCount: 30,
        summary: "Compare animals by their body parts, movements, food and habitats.",
        learningAreas: ["Animal body parts", "Movement", "Food", "Habitats"],
        icon: "🐾",
      },
      {
        slug: "my-body-and-five-senses",
        title: "My Body and Five Senses",
        quizCount: 30,
        summary: "Use the senses to gather information and practise healthy habits.",
        learningAreas: ["Sight", "Hearing", "Smell and taste", "Touch", "Healthy habits"],
        icon: "👁️",
      },
      {
        slug: "everyday-materials",
        title: "Everyday Materials",
        quizCount: 25,
        summary: "Identify common materials and connect them to familiar objects.",
        learningAreas: ["Wood", "Plastic", "Metal", "Glass", "Paper and fabric"],
        icon: "🧱",
      },
      {
        slug: "light-sound-and-heat-around-us",
        title: "Light, Sound and Heat Around Us",
        quizCount: 25,
        summary: "Identify common sources of light, sound and heat in daily life.",
        learningAreas: ["Light sources", "Sound sources", "Heat sources", "Everyday uses"],
        icon: "💡",
      },
      {
        slug: "water-and-weather",
        title: "Water and Weather",
        quizCount: 25,
        summary: "Observe rain, sunshine, clouds, wind and the everyday uses of water.",
        learningAreas: ["Water uses", "Rain", "Sun and clouds", "Wind"],
        icon: "🌦️",
      },
      {
        slug: "pushes-pulls-and-movement",
        title: "Pushes, Pulls and Movement",
        quizCount: 20,
        summary: "Explore how pushes and pulls make objects move, stop or change direction.",
        learningAreas: ["Pushes", "Pulls", "Movement", "Direction"],
        icon: "🛴",
      },
      {
        slug: "caring-for-our-environment",
        title: "Caring for Our Environment",
        quizCount: 15,
        summary: "Build simple habits that protect living things and shared spaces.",
        learningAreas: ["Waste", "Recycling", "Clean spaces", "Protecting living things"],
        icon: "♻️",
      },
    ],
  },
  {
    id: "p2",
    levelNumber: 2,
    schoolLevel: "Primary 2",
    displayName: "Science Discovery II",
    subtitle: "Observe, compare and investigate",
    description:
      "A stronger discovery foundation using simple measurement, classification and prediction.",
    pathway: "Science Discovery",
    quizCount: 250,
    theme: {
      from: "from-teal-500",
      via: "via-cyan-500",
      to: "to-sky-500",
      glow: "shadow-cyan-500/20",
    },
    topics: [
      {
        slug: "observation-and-measurement",
        title: "Observation and Measurement",
        quizCount: 25,
        summary: "Compare, record and make simple measurements during investigations.",
        learningAreas: ["Careful observation", "Simple measurement", "Recording", "Fair comparison"],
        icon: "📏",
      },
      {
        slug: "classifying-living-things",
        title: "Classifying Living Things",
        quizCount: 30,
        summary: "Group plants and animals using visible similarities and differences.",
        learningAreas: ["Plants", "Animals", "Observable features", "Classification"],
        icon: "🗂️",
      },
      {
        slug: "plant-parts-needs-and-growth",
        title: "Plant Parts, Needs and Growth",
        quizCount: 30,
        summary: "Connect plant structures to their needs and visible growth changes.",
        learningAreas: ["Roots", "Stems", "Leaves", "Flowers", "Water and light"],
        icon: "🌻",
      },
      {
        slug: "animals-and-simple-life-cycles",
        title: "Animals and Simple Life Cycles",
        quizCount: 30,
        summary: "Compare young and adult animals and arrange simple life-cycle stages.",
        learningAreas: ["Young and adults", "Growth", "Life-cycle order", "Habitats"],
        icon: "🦋",
      },
      {
        slug: "human-body-and-health",
        title: "The Human Body and Health",
        quizCount: 25,
        summary: "Understand basic body care through food, exercise, hygiene and rest.",
        learningAreas: ["Body parts", "Exercise", "Healthy food", "Hygiene", "Rest"],
        icon: "❤️",
      },
      {
        slug: "materials-and-their-properties",
        title: "Materials and Their Properties",
        quizCount: 25,
        summary: "Describe materials using simple properties and suitable uses.",
        learningAreas: ["Hard and soft", "Flexible", "Waterproof", "Transparent", "Absorbent"],
        icon: "🧪",
      },
      {
        slug: "forces-and-magnets",
        title: "Forces and Magnets",
        quizCount: 25,
        summary: "Explore pushes, pulls, magnetic attraction and magnetic materials.",
        learningAreas: ["Pushes and pulls", "Attraction", "Repulsion", "Magnetic materials"],
        icon: "🧲",
      },
      {
        slug: "light-heat-and-sound",
        title: "Light, Heat and Sound",
        quizCount: 25,
        summary: "Identify sources, effects and uses of light, heat and sound.",
        learningAreas: ["Sources", "Effects", "Uses", "Simple observations"],
        icon: "🔦",
      },
      {
        slug: "water-weather-and-changes",
        title: "Water, Weather and Changes",
        quizCount: 20,
        summary: "Observe water, ice and simple weather-related changes.",
        learningAreas: ["Water and ice", "Melting", "Evaporation observations", "Weather"],
        icon: "💧",
      },
      {
        slug: "habitats-and-environmental-care",
        title: "Habitats and Environmental Care",
        quizCount: 15,
        summary: "Connect living things to their habitats and responsible care.",
        learningAreas: ["Habitats", "Animal needs", "Plant needs", "Environmental care"],
        icon: "🏞️",
      },
    ],
  },
  {
    id: "p3",
    levelNumber: 3,
    schoolLevel: "Primary 3",
    displayName: "Young Scientist",
    subtitle: "Begin formal Primary Science",
    description:
      "Build the core concepts and process skills needed for formal Primary Science learning.",
    pathway: "Primary Science",
    quizCount: 250,
    theme: {
      from: "from-sky-500",
      via: "via-blue-500",
      to: "to-indigo-500",
      glow: "shadow-blue-500/20",
    },
    topics: [
      {
        slug: "scientific-inquiry-skills",
        title: "Scientific Inquiry Skills",
        quizCount: 25,
        summary: "Develop observation, classification, comparison, prediction and recording skills.",
        learningAreas: ["Observation", "Comparison", "Classification", "Prediction", "Recording"],
        icon: "🔎",
      },
      {
        slug: "living-and-non-living-things",
        title: "Living and Non-living Things",
        quizCount: 25,
        summary: "Explain how living things differ from non-living things.",
        learningAreas: ["Characteristics of life", "Needs", "Growth", "Response"],
        icon: "🌱",
      },
      {
        slug: "classification-of-living-things",
        title: "Classification of Living Things",
        quizCount: 30,
        summary: "Group plants and animals using observable characteristics.",
        learningAreas: ["Plant groups", "Animal groups", "Observable features", "Classification keys"],
        icon: "🦎",
      },
      {
        slug: "diversity-of-materials",
        title: "Diversity of Materials",
        quizCount: 35,
        summary: "Relate material properties to the suitability of everyday objects.",
        learningAreas: ["Material types", "Properties", "Uses", "Suitability"],
        icon: "🧱",
      },
      {
        slug: "life-cycles-of-plants",
        title: "Life Cycles of Plants",
        quizCount: 30,
        summary: "Trace plant growth from seed to adult plant and seed production.",
        learningAreas: ["Seeds", "Germination", "Growth", "Flowering", "Seed production"],
        icon: "🌼",
      },
      {
        slug: "life-cycles-of-animals",
        title: "Life Cycles of Animals",
        quizCount: 40,
        summary: "Compare animal life cycles and identify similarities and differences.",
        learningAreas: ["Stages", "Metamorphosis", "Young and adult", "Comparing cycles"],
        icon: "🐸",
      },
      {
        slug: "properties-of-magnets",
        title: "Properties of Magnets",
        quizCount: 35,
        summary: "Investigate magnetic poles, attraction, repulsion and magnetic materials.",
        learningAreas: ["Magnetic poles", "Attraction", "Repulsion", "Magnetic materials"],
        icon: "🧲",
      },
      {
        slug: "making-and-using-magnets",
        title: "Making and Using Magnets",
        quizCount: 30,
        summary: "Apply magnetic properties to simple devices and investigations.",
        learningAreas: ["Uses of magnets", "Simple devices", "Testing materials", "Applications"],
        icon: "⚙️",
      },
    ],
  },
  {
    id: "p4",
    levelNumber: 4,
    schoolLevel: "Primary 4",
    displayName: "Science Explorer",
    subtitle: "Understand systems and changes",
    description:
      "Strengthen understanding through experiments, diagrams, tables and simple data analysis.",
    pathway: "Primary Science",
    quizCount: 250,
    theme: {
      from: "from-indigo-500",
      via: "via-violet-500",
      to: "to-purple-500",
      glow: "shadow-violet-500/20",
    },
    topics: [
      {
        slug: "scientific-inquiry-and-data-skills",
        title: "Scientific Inquiry and Data Skills",
        quizCount: 25,
        summary: "Read tables, identify variables and form conclusions from evidence.",
        learningAreas: ["Variables", "Tables", "Predictions", "Conclusions", "Data patterns"],
        icon: "📊",
      },
      {
        slug: "matter",
        title: "Matter",
        quizCount: 35,
        summary: "Compare solids, liquids and gases using their observable properties.",
        learningAreas: ["Solids", "Liquids", "Gases", "Properties", "Comparisons"],
        icon: "🧊",
      },
      {
        slug: "heat-and-temperature",
        title: "Heat and Temperature",
        quizCount: 30,
        summary: "Distinguish heat from temperature and interpret heating observations.",
        learningAreas: ["Heat sources", "Temperature", "Heating", "Cooling"],
        icon: "🌡️",
      },
      {
        slug: "effects-of-heat",
        title: "Effects of Heat",
        quizCount: 25,
        summary: "Observe expansion, contraction and other changes caused by heating or cooling.",
        learningAreas: ["Expansion", "Contraction", "Heating effects", "Cooling effects"],
        icon: "🔥",
      },
      {
        slug: "light",
        title: "Light",
        quizCount: 30,
        summary: "Understand light sources, reflection and how objects become visible.",
        learningAreas: ["Light sources", "Reflection", "Visibility", "Light paths"],
        icon: "🔦",
      },
      {
        slug: "shadows",
        title: "Shadows",
        quizCount: 25,
        summary: "Explain how shadows form and how their size and position change.",
        learningAreas: ["Shadow formation", "Position", "Size", "Shape"],
        icon: "🌘",
      },
      {
        slug: "plant-system",
        title: "Plant System",
        quizCount: 40,
        summary: "Connect plant structures to support, water absorption and transport.",
        learningAreas: ["Roots", "Stems", "Leaves", "Water absorption", "Support"],
        icon: "🌳",
      },
      {
        slug: "human-digestive-system",
        title: "Human Digestive System",
        quizCount: 40,
        summary: "Trace the path of food and explain the functions of digestive organs.",
        learningAreas: ["Digestive organs", "Path of food", "Functions", "Absorption"],
        icon: "🫀",
      },
    ],
  },
  {
    id: "p5",
    levelNumber: 5,
    schoolLevel: "Primary 5",
    displayName: "Science Investigator",
    subtitle: "Connect concepts and evidence",
    description:
      "Apply concepts through experimental design, systems thinking and structured explanations.",
    pathway: "Primary Science",
    quizCount: 250,
    theme: {
      from: "from-violet-500",
      via: "via-fuchsia-500",
      to: "to-pink-500",
      glow: "shadow-fuchsia-500/20",
    },
    topics: [
      {
        slug: "scientific-inquiry-and-experimental-design",
        title: "Scientific Inquiry and Experimental Design",
        quizCount: 20,
        summary: "Plan fair tests, identify variables and evaluate experimental methods.",
        learningAreas: ["Hypotheses", "Variables", "Reliability", "Conclusions", "Improvements"],
        icon: "🧫",
      },
      {
        slug: "electrical-components-and-conductors",
        title: "Electrical Components and Conductors",
        quizCount: 25,
        summary: "Recognise circuit components, symbols, conductors and insulators.",
        learningAreas: ["Components", "Circuit symbols", "Conductors", "Insulators"],
        icon: "🔋",
      },
      {
        slug: "series-and-parallel-circuits",
        title: "Series and Parallel Circuits",
        quizCount: 35,
        summary: "Compare circuit paths, brightness and the effects of faults.",
        learningAreas: ["Series circuits", "Parallel circuits", "Brightness", "Fault finding"],
        icon: "💡",
      },
      {
        slug: "reproduction-in-plants",
        title: "Reproduction in Plants",
        quizCount: 30,
        summary: "Explain pollination, fertilisation and the formation of fruits and seeds.",
        learningAreas: ["Flower parts", "Pollination", "Fertilisation", "Fruits and seeds"],
        icon: "🌺",
      },
      {
        slug: "reproduction-in-animals",
        title: "Reproduction in Animals",
        quizCount: 30,
        summary: "Understand how reproduction supports the continuity of animal species.",
        learningAreas: ["Reproduction", "Young", "Growth", "Continuity"],
        icon: "🐣",
      },
      {
        slug: "water-cycle",
        title: "The Water Cycle",
        quizCount: 30,
        summary: "Connect evaporation, condensation, precipitation and collection.",
        learningAreas: ["Evaporation", "Condensation", "Precipitation", "Collection"],
        icon: "🌧️",
      },
      {
        slug: "plant-transport-system",
        title: "Plant Transport System",
        quizCount: 30,
        summary: "Explain how water and food are transported through plants.",
        learningAreas: ["Water transport", "Food transport", "Roots", "Stems", "Leaves"],
        icon: "🌿",
      },
      {
        slug: "human-respiratory-system",
        title: "Human Respiratory System",
        quizCount: 25,
        summary: "Trace the movement of air and explain breathing and gas exchange.",
        learningAreas: ["Air passages", "Lungs", "Breathing", "Gas exchange"],
        icon: "🫁",
      },
      {
        slug: "human-circulatory-system",
        title: "Human Circulatory System",
        quizCount: 25,
        summary: "Explain how the heart, blood and vessels transport substances.",
        learningAreas: ["Heart", "Blood vessels", "Blood", "Transport"],
        icon: "❤️",
      },
    ],
  },
  {
    id: "p6",
    levelNumber: 6,
    schoolLevel: "Primary 6",
    displayName: "Science Mastery",
    subtitle: "Apply, explain and prepare",
    description:
      "Integrate concepts across topics and build confidence with PSLE-style application and explanation.",
    pathway: "Primary Science",
    quizCount: 250,
    theme: {
      from: "from-amber-400",
      via: "via-orange-500",
      to: "to-rose-500",
      glow: "shadow-orange-500/20",
    },
    topics: [
      {
        slug: "advanced-scientific-inquiry",
        title: "Advanced Scientific Inquiry",
        quizCount: 25,
        summary: "Evaluate methods, identify limitations and justify conclusions using evidence.",
        learningAreas: ["Method evaluation", "Limitations", "Evidence", "Data analysis", "Improvements"],
        icon: "🧪",
      },
      {
        slug: "interaction-of-forces",
        title: "Interaction of Forces",
        quizCount: 35,
        summary: "Apply gravity, friction and elastic spring force to different situations.",
        learningAreas: ["Gravity", "Friction", "Elastic spring force", "Effects of forces"],
        icon: "🪂",
      },
      {
        slug: "photosynthesis",
        title: "Photosynthesis",
        quizCount: 30,
        summary: "Explain the requirements, products and investigations linked to photosynthesis.",
        learningAreas: ["Requirements", "Products", "Leaf investigations", "Food production"],
        icon: "☀️",
      },
      {
        slug: "forms-and-sources-of-energy",
        title: "Forms and Sources of Energy",
        quizCount: 25,
        summary: "Identify forms of energy and connect them to different sources.",
        learningAreas: ["Light", "Heat", "Sound", "Electrical", "Chemical", "Kinetic"],
        icon: "⚡",
      },
      {
        slug: "energy-conversion",
        title: "Energy Conversion",
        quizCount: 30,
        summary: "Trace energy changes in devices, systems and living things.",
        learningAreas: ["Energy changes", "Devices", "Living things", "Energy chains"],
        icon: "🔄",
      },
      {
        slug: "interactions-within-the-environment",
        title: "Interactions Within the Environment",
        quizCount: 35,
        summary: "Analyse food chains, food webs, populations and interdependence.",
        learningAreas: ["Food chains", "Food webs", "Populations", "Interdependence"],
        icon: "🕸️",
      },
      {
        slug: "surviving-in-the-environment",
        title: "Surviving in the Environment",
        quizCount: 30,
        summary: "Relate structural and behavioural adaptations to survival.",
        learningAreas: ["Structural adaptations", "Behavioural adaptations", "Survival", "Habitats"],
        icon: "🦎",
      },
      {
        slug: "human-impact-and-conservation",
        title: "Human Impact and Conservation",
        quizCount: 20,
        summary: "Evaluate pollution, habitat change and conservation actions.",
        learningAreas: ["Pollution", "Habitat change", "Conservation", "Sustainability"],
        icon: "🌍",
      },
      {
        slug: "psle-integrated-mastery",
        title: "PSLE Integrated Mastery",
        quizCount: 20,
        summary: "Apply P3 to P6 concepts in mixed, examination-style situations.",
        learningAreas: ["Cross-topic application", "Booklet A", "Booklet B", "Timed practice"],
        icon: "🎯",
      },
    ],
  },
];

export function getScienceLevel(levelId: string): ScienceLevel | undefined {
  return SCIENCE_LEVELS.find((level) => level.id === levelId);
}

export function getScienceTopic(levelId: string, topicSlug: string): ScienceTopic | undefined {
  return getScienceLevel(levelId)?.topics.find((topic) => topic.slug === topicSlug);
}

export function isScienceLevelId(value: string): value is ScienceLevelId {
  return SCIENCE_LEVEL_IDS.includes(value as ScienceLevelId);
}
