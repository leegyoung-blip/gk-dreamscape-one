import type { Metadata } from "next";
import GuideLayout from "@/components/explore/GuideLayout";
import GuideCTA from "@/components/explore/GuideCTA";

export const metadata: Metadata = {
  title: "How Dreamscape One Works",
  description:
    "See how Dreamscape One connects curriculum mastery, thinking, rewards, decision-making and real-world skills.",
  alternates: {
    canonical: "https://dreamscape-one.com/how-it-works",
  },
  openGraph: {
    title: "How Dreamscape One Works",
    description:
      "From curriculum mastery to thinking, rewards, independence and real-world decision-making.",
    url: "https://dreamscape-one.com/how-it-works",
    siteName: "Dreamscape One",
    type: "article",
  },
};

export default function HowDreamscapeWorksPage() {
  return (
    <GuideLayout
      title="How Dreamscape One Works"
      description="Dreamscape One is designed around a simple idea: learning should build knowledge first, then give children meaningful places to think, make choices and use what they know."
      accent="#8ee8ff"
      relatedSlugs={[
        "what-is-dreamscape-one",
        "novas-world",
        "milos-world",
      ]}
    >
      <div className="dreamscape-guide-callout">
        <strong>Learn → Think → Earn → Decide → Build</strong>
        <p>
          This is the progression that connects Dreamscape One. The worlds are
          not separate games placed beside academic practice; they are designed
          to give learning somewhere to go.
        </p>
      </div>

      <h2>1. Build the foundations</h2>
      <p>
        Nova begins with the fundamentals children still need: structured
        practice, curriculum knowledge and opportunities to strengthen English,
        Mathematics, Science and thinking skills.
      </p>

      <h2>2. Move beyond getting the answer right</h2>
      <p>
        Dreamscape then asks learners to use attention, memory, reasoning and
        decision-making across different experiences. The aim is not to replace
        academic practice, but to connect it to a wider sense of progress.
      </p>

      <h2>3. Make progress tangible</h2>
      <p>
        Dream Tokens and eligible Dream Gems give learners a visible result from
        progress. Rewards can connect learning to upgrades, spaces, collections
        and other experiences across Dreamscape.
      </p>

      <h2>4. Introduce real-world choices</h2>
      <p>
        Milo’s World extends the experience into money, value, risk, spending,
        investing, business and trade-offs. Its activities are designed mainly
        around ages 12+, but there is no hard age gate: confident younger
        learners can explore earlier with the understanding that the difficulty
        is aimed higher.
      </p>

      <h2>5. Help parents see more than a score</h2>
      <p>
        NOVA+ is the parent-facing intelligence layer. It brings learning
        evidence together so families can understand progress, strengths, gaps
        and mastery in a clearer way over time.
      </p>

      <h2>Where this guide goes next</h2>
      <p>
        Phase 2 will expand this page into Dreamscape One’s flagship long-form
        explanation, with product screenshots, deeper examples and the full
        learner journey from Nova through Milo.
      </p>

      <GuideCTA
        title="Explore the Dreamscape Guides"
        text="See the growing collection of parent-first guides explaining the worlds, learning system, rewards and NOVA+."
        primaryLabel="Explore Dreamscape"
        primaryHref="/explore"
        secondaryLabel="View Plans"
        secondaryHref="/pricing"
      />
    </GuideLayout>
  );
}
