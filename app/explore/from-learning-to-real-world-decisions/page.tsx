import { buildGuideMetadata } from "@/lib/seo";
import GuideLayout from "@/components/explore/GuideLayout";
import GuideCTA from "@/components/explore/GuideCTA";
import GuideMedia from "@/components/explore/GuideMedia";

export const metadata = buildGuideMetadata({
  title: "From Curriculum Mastery to Real-World Decision-Making",
  description: "Dreamscape One’s wider learning philosophy: build strong academic foundations, then create opportunities to think, choose, manage resources and apply judgement.",
  path: "/explore/from-learning-to-real-world-decisions",
  accent: "#c58cff",
});

const stages = [
  ["Learn", "Build knowledge and fluency.", "#8ee8ff"],
  ["Think", "Use knowledge under different conditions.", "#76e5ff"],
  ["Earn", "Make progress visible and persistent.", "#c58cff"],
  ["Decide", "Choose between competing uses and outcomes.", "#ffbd73"],
  ["Build", "Create something that develops through repeated choices.", "#ffae5c"],
];

export default function RealWorldDecisionsGuidePage() {
  return (
    <GuideLayout
      canonicalPath="/explore/from-learning-to-real-world-decisions"
      title="From Curriculum Mastery to Real-World Decision-Making"
      description="Dreamscape One begins with a child learning the fundamentals, but its wider goal is to create more opportunities to use knowledge, exercise judgement and become increasingly independent."
      accent="#c58cff"
      relatedSlugs={[
        "how-it-works",
        "learning-missions",
        "learning-money-and-business",
      ]}
    >
      <p>
        There is a false choice in education between academic fundamentals and
        “real-world skills.” Children need both. A learner who cannot read
        carefully, calculate confidently or understand basic scientific ideas
        has fewer tools to apply later. At the same time, knowing a fact is not
        the same as knowing what to do with it.
      </p>

      <p>
        Dreamscape One is built around connecting those stages rather than
        choosing one side.
      </p>

      <div
        style={{
          marginTop: "30px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
          gap: "10px",
        }}
      >
        {stages.map(([title, text, accent], index) => (
          <div
            key={title}
            style={{
              minHeight: "158px",
              padding: "19px 17px",
              borderRadius: "18px",
              border: `1px solid ${accent}34`,
              background: `${accent}09`,
            }}
          >
            <span
              style={{
                color: accent,
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Stage {index + 1}
            </span>
            <strong
              style={{
                display: "block",
                marginTop: "9px",
                color: "white",
                fontSize: "20px",
              }}
            >
              {title}
            </strong>
            <p
              style={{
                margin: "9px 0 0",
                color: "rgba(255,255,255,0.58)",
                fontSize: "12px",
                lineHeight: 1.55,
              }}
            >
              {text}
            </p>
          </div>
        ))}
      </div>

      <h2>Mastery is the starting point, not the finish line</h2>
      <p>
        Curriculum learning gives children a toolkit. Reading comprehension
        allows them to interpret information. Mathematics helps them quantify
        and compare. Science builds ways of explaining how the world works.
      </p>

      <p>
        These foundations matter even when the eventual problem does not look
        like a school question. A budget, a business decision or a comparison of
        alternatives still depends on understanding information accurately.
      </p>

      <GuideMedia
        src="/home/preview-learning-missions.png"
        alt="Dreamscape curriculum learning missions"
        caption="Dreamscape begins with structured academic learning because later judgement still depends on strong foundations."
        accent="#8ee8ff"
      />

      <h2>Thinking needs different conditions</h2>
      <p>
        A learner can become very good at recognising a familiar question format
        without becoming equally comfortable with uncertainty. That is why
        Dreamscape includes experiences that change the context.
      </p>

      <p>
        Think Lab can emphasise memory, sets and reasoning. Knowledge Arena adds
        pace and pressure. Other game systems ask learners to manage upgrades or
        persist through a longer challenge.
      </p>

      <p>
        The purpose is not to claim that a game automatically transfers a skill
        into everyday life. Transfer is difficult. What Dreamscape can do is
        provide repeated opportunities to use attention, reasoning and
        decision-making under conditions that differ from a standard worksheet.
      </p>

      <h2>Rewards create the first real trade-offs</h2>
      <p>
        Once progress creates a limited resource, the learner has something to
        manage. Dream Tokens can be spent in more than one place. Saving for a
        rover upgrade may mean delaying a purchase elsewhere.
      </p>

      <p>
        That decision is still simple, but it introduces an important idea:
        choices have competing uses. The learner is no longer only trying to
        maximise a score.
      </p>

      <h2>Milo raises the complexity</h2>
      <p>
        Milo&apos;s World takes the same basic structure and adds uncertainty,
        ownership and longer time horizons. A fictional asset may change in
        value. A purchase may have an opportunity cost. A business decision may
        improve one part of an operation while making another more expensive.
      </p>

      <GuideMedia
        src="/home/milo-world-cover.png"
        alt="Milo's World for financial literacy and business"
        caption="Milo increases the complexity by asking learners to work with value, risk, ownership and business trade-offs."
        accent="#ffbd73"
      />

      <p>
        This is why Milo is designed mainly around ages 12+. The difficulty is
        higher, not because a birthday suddenly makes someone financially
        literate, but because the learner is expected to compare alternatives
        and tolerate less certain outcomes.
      </p>

      <h2>Building creates longer-term responsibility</h2>
      <p>
        A persistent system changes the meaning of a decision. If an upgrade or
        business choice affects what happens later, there is more reason to think
        beyond the immediate reward.
      </p>

      <p>
        Nova&apos;s Home, Skyforge and the developing Business Builder all use this
        principle in different ways. The learner is not just finishing isolated
        rounds. They are changing something that remains.
      </p>

      <h2>Why low-stakes mistakes matter</h2>
      <p>
        Children need environments where a wrong choice is informative rather
        than catastrophic. A fictional market or business simulation can create
        enough consequence to make reflection meaningful while still allowing
        the learner to try again.
      </p>

      <div className="dreamscape-guide-callout">
        <strong>Good judgement is not the same as always getting a good outcome.</strong>
        <p>
          Some decisions involve uncertainty. A sensible choice can still lead
          to a poor result, and a weak choice can occasionally get lucky. The
          useful habit is learning to review the reasoning, not only the result.
        </p>
      </div>

      <h2>Where parents fit into this progression</h2>
      <p>
        NOVA+ helps parents see the academic evidence underneath the world. That
        matters because an engaging game experience should not make learning
        invisible.
      </p>

      <p>
        At the same time, parents can ask about decisions that a dashboard cannot
        fully capture: Why did you choose that? What were you trying to achieve?
        What would you do differently? Those conversations are part of how a
        virtual choice becomes a more useful learning experience.
      </p>

      <h2>What Dreamscape is not claiming</h2>
      <p>
        Dreamscape does not assume that completing a game makes a child
        financially sophisticated, entrepreneurial or automatically independent.
        It also does not treat academic knowledge as outdated because real-world
        skills matter.
      </p>

      <p>
        The goal is more modest and more practical: build strong foundations,
        then create increasingly rich opportunities to use them.
      </p>

      <h2>The direction of the whole ecosystem</h2>
      <p>
        The progression can be summarised simply:
        <strong> Learn → Think → Earn → Decide → Build.</strong>
      </p>

      <p>
        Nova begins closer to curriculum mastery and cognitive challenge. Milo
        moves further into resources, risk, business and judgement. NOVA+ gives
        parents a parallel view of the learning evidence developing underneath.
      </p>

      <p>
        Dreamscape One is intended to grow with the learner rather than remain
        fixed at one age, one subject or one type of activity.
      </p>

      <GuideCTA
        title="See the full journey in one place"
        text="Read the flagship How Dreamscape One Works guide, or explore why money and business are part of the later-stage learning experience."
        primaryLabel="How Dreamscape Works"
        primaryHref="/how-it-works"
        secondaryLabel="Why Money & Business"
        secondaryHref="/explore/learning-money-and-business"
        accent="#c58cff"
      />
    </GuideLayout>
  );
}
