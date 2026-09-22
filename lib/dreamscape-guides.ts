export type DreamscapeGuideCategory =
  | "Start Here"
  | "Explore the Worlds"
  | "Understand the Approach";

export type DreamscapeGuide = {
  slug: string;
  href: string;
  shortTitle: string;
  title: string;
  description: string;
  category: DreamscapeGuideCategory;
  accent: string;
  featured?: boolean;
  published: boolean;
};

export const DREAMSCAPE_GUIDES: DreamscapeGuide[] = [
  {
    slug: "what-is-dreamscape-one",
    href: "/explore/what-is-dreamscape-one",
    shortTitle: "What Is Dreamscape One?",
    title: "What Is Dreamscape One?",
    description:
      "Understand how Nova, Milo, learning, rewards and real-world decision-making fit together in one connected ecosystem.",
    category: "Start Here",
    accent: "#8ee8ff",
    published: false,
  },
  {
    slug: "how-it-works",
    href: "/how-it-works",
    shortTitle: "How Dreamscape One Works",
    title: "How Dreamscape One Works",
    description:
      "See the journey from curriculum mastery and thinking skills to rewards, independence and real-world choices.",
    category: "Start Here",
    accent: "#c58cff",
    featured: true,
    published: true,
  },
  {
    slug: "parents-guide",
    href: "/explore/parents-guide",
    shortTitle: "Parent’s Guide",
    title: "A Parent’s Guide to Dreamscape One",
    description:
      "A practical guide to subjects, worlds, rewards, NOVA+, age guidance, memberships and what parents can expect.",
    category: "Start Here",
    accent: "#ffbd73",
    published: false,
  },
  {
    slug: "novas-world",
    href: "/explore/novas-world",
    shortTitle: "Nova’s World",
    title: "A Guide to Nova’s World",
    description:
      "Explore Learning Missions, Think Lab, Knowledge Arena, Nova’s Home, Skyforge and how progress connects across them.",
    category: "Explore the Worlds",
    accent: "#8ee8ff",
    published: false,
  },
  {
    slug: "milos-world",
    href: "/explore/milos-world",
    shortTitle: "Milo’s World",
    title: "A Guide to Milo’s World",
    description:
      "See how activity, spending, investing, business and decision-making come together in a world designed mainly for ages 12+.",
    category: "Explore the Worlds",
    accent: "#ffae5c",
    published: false,
  },
  {
    slug: "learning-missions",
    href: "/explore/learning-missions",
    shortTitle: "Learning Missions",
    title: "How Learning Missions Work",
    description:
      "Understand the academic engine behind Dreamscape’s English, Mathematics and Science practice.",
    category: "Explore the Worlds",
    accent: "#76e5ff",
    published: false,
  },
  {
    slug: "dream-tokens-and-gems",
    href: "/explore/dream-tokens-and-gems",
    shortTitle: "Dream Tokens & Dream Gems",
    title: "Dream Tokens and Dream Gems Explained",
    description:
      "Learn what DT and DG are, how learners earn them, and how the reward economy connects learning to the wider world.",
    category: "Explore the Worlds",
    accent: "#d5b5ff",
    published: false,
  },
  {
    slug: "nova-plus",
    href: "/explore/nova-plus",
    shortTitle: "NOVA+ for Parents",
    title: "What Is NOVA+? A Parent’s Guide",
    description:
      "See how NOVA+ turns learning activity into clearer signals about progress, strengths, gaps and mastery.",
    category: "Understand the Approach",
    accent: "#8ee8ff",
    published: false,
  },
  {
    slug: "learning-money-and-business",
    href: "/explore/learning-money-and-business",
    shortTitle: "Money & Business",
    title: "Why Dreamscape Teaches Money and Business",
    description:
      "Understand why earning, spending, investing, risk, ownership and business decisions belong in the learning journey.",
    category: "Understand the Approach",
    accent: "#ffbd73",
    published: false,
  },
  {
    slug: "from-learning-to-real-world-decisions",
    href: "/explore/from-learning-to-real-world-decisions",
    shortTitle: "Learning to Real-World Decisions",
    title: "From Curriculum Mastery to Real-World Decision-Making",
    description:
      "Explore Dreamscape’s wider goal: helping children move from knowing information to using it thoughtfully.",
    category: "Understand the Approach",
    accent: "#c58cff",
    published: false,
  },
];

export const GUIDE_CATEGORIES: DreamscapeGuideCategory[] = [
  "Start Here",
  "Explore the Worlds",
  "Understand the Approach",
];

export function getGuideBySlug(slug: string) {
  return DREAMSCAPE_GUIDES.find((guide) => guide.slug === slug) ?? null;
}

export function getGuidesBySlugs(slugs: string[]) {
  return slugs
    .map((slug) => getGuideBySlug(slug))
    .filter((guide): guide is DreamscapeGuide => Boolean(guide));
}
