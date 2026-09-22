import { buildGuideMetadata } from "@/lib/seo";
import GuideLayout from "@/components/explore/GuideLayout";
import GuideCTA from "@/components/explore/GuideCTA";
import GuideMedia from "@/components/explore/GuideMedia";

export const metadata = buildGuideMetadata({
  title: "Dream Tokens and Dream Gems Explained",
  description: "A parent guide to Dream Tokens and Dream Gems: how Dreamscape rewards work, how they are earned and why virtual rewards connect learning to decisions across Nova and Milo.",
  path: "/explore/dream-tokens-and-gems",
  accent: "#d5b5ff",
});

const rewardRows = [
  ["100%", "5 DT"],
  ["90–99%", "4 DT"],
  ["80–89%", "3 DT"],
  ["70–79%", "2 DT"],
  ["60–69%", "1 DT"],
];

export default function DreamTokensAndGemsGuidePage() {
  return (
    <GuideLayout
      canonicalPath="/explore/dream-tokens-and-gems"
      title="Dream Tokens and Dream Gems Explained"
      description="Dream Tokens and Dream Gems make selected progress visible across Dreamscape. They are virtual in-platform rewards that connect learning to upgrades, choices and the wider economy."
      accent="#d5b5ff"
      relatedSlugs={[
        "learning-missions",
        "milos-world",
        "learning-money-and-business",
      ]}
    >
      <p>
        Rewards in Dreamscape are meant to do more than make a results screen
        look exciting. They create continuity. A learner can complete work in
        one part of the platform and use what was earned somewhere else.
      </p>

      <p>
        Dreamscape currently uses two main reward currencies:
        <strong> Dream Tokens (DT)</strong> and
        <strong> Dream Gems (DG)</strong>. They serve different roles, but both
        are virtual rewards inside Dreamscape rather than real-world money.
      </p>

      <h2>What are Dream Tokens?</h2>
      <p>
        Dream Tokens are the everyday virtual currency of Dreamscape. They can
        be earned through eligible learning and activity, then used across
        experiences such as upgrades, purchases and later financial decisions.
      </p>

      <p>
        The key idea is that DT are limited. Once a learner has a balance, every
        use of those Tokens competes with another possible use. That creates the
        beginnings of budgeting and opportunity cost without requiring real
        money.
      </p>

      <h2>How are Dream Tokens earned from Learning Missions?</h2>
      <p>
        The current Learning Mission reward structure gives more Dream Tokens
        for stronger performance:
      </p>

      <div
        style={{
          marginTop: "24px",
          borderRadius: "20px",
          overflow: "hidden",
          border: "1px solid rgba(213,181,255,0.24)",
          background: "rgba(213,181,255,0.045)",
        }}
      >
        {rewardRows.map(([score, reward], index) => (
          <div
            key={score}
            style={{
              minHeight: "52px",
              padding: "0 18px",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: "16px",
              borderTop:
                index === 0
                  ? "none"
                  : "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>
              {score}
            </span>
            <strong style={{ color: "#d5b5ff" }}>{reward}</strong>
          </div>
        ))}
      </div>

      <p>
        Rewards are only one part of the result. The mission still records the
        academic performance itself, which can contribute evidence to progress
        and NOVA+.
      </p>

      <h2>What are Dream Gems?</h2>
      <p>
        Dream Gems are a more specialised reward. For eligible Learning
        Missions, a learner can receive <strong>1 DG for completion</strong>,
        awarded once for that quiz rather than repeatedly farming the same
        completion.
      </p>

      <p>
        Keeping DG distinct from DT allows Dreamscape to reserve some purchases
        or unlocks for a rarer form of progress without making every part of the
        economy depend on one balance.
      </p>

      <div className="dreamscape-guide-callout">
        <strong>DT and DG are not cash.</strong>
        <p>
          They are virtual Dreamscape rewards used inside the platform. Their
          purpose is progression, choice and learning — not to imitate a real
          bank balance or assign a real-world price to a child&apos;s schoolwork.
        </p>
      </div>

      <h2>What can Dream Tokens be used for?</h2>
      <p>
        DT can connect to persistent parts of Nova such as unlocking or
        improving experiences, furnishing spaces and upgrading the Skyforge
        rover. In Milo, DT also become the working currency for more explicit
        financial choices.
      </p>

      <GuideMedia
        src="/home/preview-rover.png"
        alt="Skyforge rover upgrades using Dreamscape rewards"
        caption="Dream Tokens can turn learning progress into longer-term choices such as rover upgrades."
        accent="#d5b5ff"
      />

      <p>
        This is important because the same Token can have different possible
        uses. Spending on a rover upgrade means not using those Tokens somewhere
        else. Saving can delay one reward in order to reach another.
      </p>

      <h2>Why does Dreamscape use two currencies?</h2>
      <p>
        A single unlimited reward can lose meaning quickly. Separating an
        everyday currency from a more specialised reward gives Dreamscape more
        ways to create pacing and different kinds of goals.
      </p>

      <p>
        DT can support frequent economic decisions. DG can mark selected
        completion milestones or unlocks where a rarer reward is more
        appropriate.
      </p>

      <h2>What changes when learners reach Milo?</h2>
      <p>
        In Nova, rewards often support progression, customisation and upgrades.
        Milo increasingly turns the same idea into financial decision-making.
        Learners can use Dream Tokens inside a fictional economy where choices
        about spending, assets and business have visible consequences.
      </p>

      <GuideMedia
        src="/home/milo-world-cover.png"
        alt="Milo's World virtual economy"
        caption="Milo extends the reward economy into more explicit decisions about spending, assets, risk and business."
        accent="#ffae5c"
      />

      <p>
        This creates a progression from “I earned something” to “What should I
        do with what I earned?” The second question is where rewards begin to
        support financial literacy rather than simply motivation.
      </p>

      <h2>Why not reward every action heavily?</h2>
      <p>
        If every click creates a large reward, the currency stops representing
        meaningful progress. A useful virtual economy needs some scarcity. It
        also needs rewards that are understandable enough for a learner to make
        decisions about them.
      </p>

      <p>
        Dreamscape therefore treats the economy as something to balance, not as
        an endless shower of points. The goal is for earned resources to remain
        relevant when the learner reaches a shop, an upgrade screen or a
        financial simulation.
      </p>

      <h2>What parents can ask about rewards</h2>
      <p>
        Rewards can become useful conversation starters. Instead of only asking
        how many Tokens a child has, try asking why they used them:
      </p>

      <ul>
        <li>What are you saving for?</li>
        <li>Why did you choose this upgrade first?</li>
        <li>Was this purchase worth giving up something else?</li>
        <li>Would you make the same choice again?</li>
      </ul>

      <p>
        Those questions shift attention from collecting currency to making
        decisions.
      </p>

      <GuideCTA
        title="See what happens after learners earn"
        text="Explore Milo’s World to see how virtual rewards develop into spending, investing, ownership and business choices."
        primaryLabel="Explore Milo’s World"
        primaryHref="/explore/milos-world"
        secondaryLabel="Learning Missions"
        secondaryHref="/explore/learning-missions"
        accent="#d5b5ff"
      />
    </GuideLayout>
  );
}
