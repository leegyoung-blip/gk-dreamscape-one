import type { Metadata } from "next";
import Link from "next/link";
import GuideLayout from "@/components/explore/GuideLayout";
import GuideCTA from "@/components/explore/GuideCTA";
import GuideMedia from "@/components/explore/GuideMedia";

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

const journeyStages = [
  {
    title: "Learn",
    text: "Build knowledge and fluency through curriculum practice and structured missions.",
    accent: "#8ee8ff",
  },
  {
    title: "Think",
    text: "Use memory, logic, reasoning and knowledge in challenges that are not simply another worksheet.",
    accent: "#76e5ff",
  },
  {
    title: "Earn",
    text: "Turn progress into visible Dream Tokens and eligible Dream Gems that matter elsewhere in the world.",
    accent: "#c58cff",
  },
  {
    title: "Decide",
    text: "Choose whether to spend, save, invest, upgrade or take a different path — and see the consequences.",
    accent: "#ffbd73",
  },
  {
    title: "Build",
    text: "Use what has been earned and learned to develop spaces, rovers, collections and eventually businesses.",
    accent: "#ffae5c",
  },
];

export default function HowDreamscapeWorksPage() {
  return (
    <GuideLayout
      title="How Dreamscape One Works"
      description="Dreamscape One is designed around a simple idea: learning should build knowledge first, then give children meaningful places to think, make choices and use what they know."
      accent="#8ee8ff"
      relatedSlugs={["what-is-dreamscape-one", "novas-world", "milos-world"]}
    >
      <p>
        Dreamscape One connects several experiences that would normally sit in
        separate products. Curriculum practice, thinking games, virtual rewards,
        world-building, financial literacy and parent insights all share one
        progression. The purpose is not to make every activity look the same. It
        is to make progress in one part of the system matter somewhere else.
      </p>

      <p>
        The easiest way to understand the model is through five verbs:
        <strong> Learn → Think → Earn → Decide → Build</strong>. NOVA+ sits
        across that journey for parents, helping turn the learner&apos;s activity
        into a clearer picture of progress.
      </p>

      <div
        style={{
          marginTop: "34px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "10px",
        }}
      >
        {journeyStages.map((stage, index) => (
          <div
            key={stage.title}
            style={{
              minHeight: "178px",
              padding: "20px 18px",
              borderRadius: "18px",
              border: `1px solid ${stage.accent}35`,
              background: `${stage.accent}09`,
            }}
          >
            <span
              style={{
                color: stage.accent,
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Step {index + 1}
            </span>
            <strong
              style={{
                display: "block",
                marginTop: "10px",
                color: "white",
                fontSize: "21px",
              }}
            >
              {stage.title}
            </strong>
            <p
              style={{
                margin: "10px 0 0",
                color: "rgba(255,255,255,0.6)",
                fontSize: "13px",
                lineHeight: 1.55,
              }}
            >
              {stage.text}
            </p>
          </div>
        ))}
      </div>

      <h2>Step 1: Learn — build the foundations first</h2>
      <p>
        Dreamscape starts with the part that cannot be skipped: children need
        knowledge and practice. Learning Missions provide structured work across
        the school curriculum, with English and Mathematics at the centre of the
        current learner experience and Science forming part of the wider
        Dreamscape curriculum direction.
      </p>

      <p>
        A learner may be practising a concept, completing a topic quiz or
        working through a broader assessment. The important point is that the
        academic task still has to stand on its own. A correct answer should
        come from understanding, not from the surrounding game layer.
      </p>

      <GuideMedia
        src="/home/preview-learning-missions.png"
        alt="Dreamscape Learning Missions"
        caption="Learning Missions are the academic foundation of Nova’s World."
        accent="#8ee8ff"
      />

      <h2>Step 2: Think — use knowledge in different ways</h2>
      <p>
        School knowledge is important, but learning is stronger when children
        can also hold information in mind, notice patterns, reason through
        unfamiliar situations and make decisions under pressure. That is why
        Nova includes experiences such as Think Lab and Knowledge Arena rather
        than turning every part of the platform into another curriculum quiz.
      </p>

      <p>
        The Think Lab focuses more directly on cognitive challenges such as
        logic, sets and memory. Knowledge Arena uses curriculum and general
        knowledge in a faster, more game-like format. The two experiences feel
        different because they are meant to exercise different habits.
      </p>

      <div className="dreamscape-guide-callout">
        <strong>The game layer is not the teaching engine.</strong>
        <p>
          Dreamscape&apos;s teaching still depends on good questions, explanations,
          progression and evidence. The world gives children a reason to return
          and a place to use the results of their effort.
        </p>
      </div>

      <h2>Step 3: Earn — make progress tangible</h2>
      <p>
        When effort disappears the moment a quiz closes, progress can feel
        abstract. Dreamscape therefore uses <strong>Dream Tokens (DT)</strong>
        and <strong>Dream Gems (DG)</strong> to make selected achievements
        visible across the wider ecosystem.
      </p>

      <p>
        Dream Tokens function as the everyday virtual currency. Learners can use
        them for experiences such as upgrades, purchases and later financial
        decisions. Dream Gems are a more specialised reward connected to
        eligible learning activities. They are not real money and are not
        intended to put a cash price on every correct answer.
      </p>

      <p>
        The educational value comes from what happens next. Once a learner has
        limited resources, they can begin to make choices. Spend now? Save for a
        more expensive upgrade? Put Tokens into something whose value may
        change? The reward system becomes the bridge between academic progress
        and decision-making.
      </p>

      <h2>Step 4: Decide — let choices have consequences</h2>
      <p>
        Milo&apos;s World is where Dreamscape deliberately changes the type of
        challenge. It is designed mainly for ages 12+ because the financial and
        business decisions are more demanding, but there is no hard age gate.
        Younger capable learners can start earlier if they are ready for the
        difficulty.
      </p>

      <p>
        In Milo&apos;s Exchange, learners interact with fictional stock and property
        markets using Dream Tokens. In the Dream Shop, they decide what is worth
        spending on. In Activity Lab and Quiz Hall, they can earn, compete and
        test knowledge. The forthcoming Business Builder extends this into
        operating costs, staffing, growth and ownership decisions.
      </p>

      <GuideMedia
        src="/home/milo-world-cover.png"
        alt="Milo's World financial literacy and business environment"
        caption="Milo’s World introduces more complex choices about value, money, risk and business."
        accent="#ffae5c"
      />

      <p>
        Because the markets are fictional and use virtual currency, learners can
        experience gains, losses, trade-offs and imperfect decisions without
        risking real money. The aim is not to tell a child what to invest in. It
        is to make concepts such as risk, opportunity cost, ownership and delayed
        gratification less abstract.
      </p>

      <h2>Step 5: Build — give progress somewhere to accumulate</h2>
      <p>
        Building is important because it creates continuity. A learner who
        returns to Nova&apos;s Home can see a space that has changed. A learner who
        upgrades a Skyforge rover can see how earlier choices affect later
        gameplay. Over time, Business Builder will apply the same idea to an
        enterprise that develops through repeated decisions.
      </p>

      <GuideMedia
        src="/home/preview-rover.png"
        alt="Nova rover upgrades in Skyforge"
        caption="Skyforge turns earned resources into longer-term choices about upgrades and performance."
        accent="#c58cff"
      />

      <p>
        This is why Dreamscape does not treat rewards as a decorative badge
        system. The goal is for progress to accumulate into something the learner
        owns, manages or improves. The more meaningful that persistent world
        becomes, the more reason there is for the child to care about how they
        use what they earn.
      </p>

      <h2>Where NOVA+ fits into the system</h2>
      <p>
        The child experiences the worlds. The parent needs a different view.
        NOVA+ takes learning activity and organises it into a parent-facing
        picture of progress, strengths, gaps and mastery.
      </p>

      <p>
        My Learning gives a broader weekly view. Strengths &amp; Gaps goes down
        to concept level. The Mastery Map organises evidence across the
        curriculum. Nova Recommends uses the available evidence to suggest what
        may be useful next. Downloadable reports make that picture easier to
        review away from the screen.
      </p>

      <p>
        NOVA+ is not intended to diagnose a child or claim that platform data is
        the whole learner. It works with the evidence Dreamscape has. That makes
        the quality of the underlying curriculum mapping and learning activity
        important, which is why the intelligence layer is being built alongside
        the teaching engine rather than as a separate chatbot-style feature.
      </p>

      <GuideMedia
        src="/home/nova-plus-my-learning.png"
        alt="NOVA+ My Learning parent dashboard"
        caption="NOVA+ gives parents a different view of the same learning journey."
        accent="#8ee8ff"
        objectFit="contain"
      />

      <h2>What a typical journey might look like</h2>
      <p>
        A learner could begin with a Mathematics mission, complete a set of
        questions and earn progress toward Dream Tokens. Later, they might use
        those Tokens on a rover upgrade or save them for something larger. A
        Think Lab challenge gives them a different kind of cognitive workout.
        Knowledge Arena lets them test what they know under a more energetic
        format.
      </p>

      <p>
        As the learner becomes ready for Milo, those same ideas about limited
        resources become more explicit. Tokens can be spent, saved or placed
        into fictional assets. The child begins to see that every choice has an
        alternative they are giving up. Eventually, the Business Builder can
        make those trade-offs even more concrete through costs, staffing,
        operations and growth.
      </p>

      <p>
        Meanwhile, the parent is not expected to watch every game. NOVA+ turns
        the academic evidence into a more useful summary so that the family can
        focus on the areas that matter.
      </p>

      <h2>Why the system is connected</h2>
      <p>
        It would be easier to build each feature as a separate mini-game. But
        that would weaken the central idea. Dreamscape works best when learning
        progress has consequences elsewhere, and when later decisions depend on
        resources or knowledge earned earlier.
      </p>

      <p>
        The long-term aim is therefore not simply to increase the number of
        activities. It is to strengthen the connections between them. A good
        addition to Dreamscape should either improve how a learner learns,
        improve how they think, give their progress a more meaningful use, or
        help parents understand that progress more clearly.
      </p>

      <h2>What parents should expect</h2>
      <p>
        Dreamscape should be viewed as a learning environment, not a promise that
        motivation problems disappear or that every child will love every
        subject. Some activities are meant to be challenging. Some decisions
        will be wrong. Some concepts will need to be revisited.
      </p>

      <p>
        The difference is that those experiences can become part of a larger
        story of progress. Parents can use NOVA+ to understand the evidence,
        while learners have a world that gives them more reasons to keep moving
        forward.
      </p>

      <p>
        For a shorter introduction to the overall idea, read
        <Link
          href="/explore/what-is-dreamscape-one"
          style={{ color: "#8ee8ff", textDecoration: "none", fontWeight: 800 }}
        >
          {" "}What Is Dreamscape One?
        </Link>
      </p>

      <GuideCTA
        title="Choose the part you want to understand next"
        text="Explore Nova’s learning world, Milo’s financial-literacy world, or the NOVA+ parent intelligence layer in more detail."
        primaryLabel="Explore Nova’s World"
        primaryHref="/explore/novas-world"
        secondaryLabel="Explore Milo’s World"
        secondaryHref="/explore/milos-world"
        accent="#8ee8ff"
      />
    </GuideLayout>
  );
}
