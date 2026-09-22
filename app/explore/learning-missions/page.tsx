import type { Metadata } from "next";
import Link from "next/link";
import GuideLayout from "@/components/explore/GuideLayout";
import GuideCTA from "@/components/explore/GuideCTA";
import GuideMedia from "@/components/explore/GuideMedia";

export const metadata: Metadata = {
  title: "How Learning Missions Work",
  description:
    "Understand Dreamscape One Learning Missions: curriculum practice, topics, assessments, rewards, progress evidence and how academic work connects to Nova’s World.",
  alternates: {
    canonical: "https://dreamscape-one.com/explore/learning-missions",
  },
  openGraph: {
    title: "How Learning Missions Work",
    description:
      "A parent-first explanation of the academic engine behind Dreamscape One.",
    url: "https://dreamscape-one.com/explore/learning-missions",
    siteName: "Dreamscape One",
    type: "article",
  },
};

export default function LearningMissionsGuidePage() {
  return (
    <GuideLayout
      title="How Learning Missions Work"
      description="Learning Missions are the academic foundation of Dreamscape One. They give learners structured curriculum practice while feeding progress, rewards and evidence into the wider Nova experience."
      accent="#76e5ff"
      relatedSlugs={[
        "novas-world",
        "dream-tokens-and-gems",
        "nova-plus",
      ]}
    >
      <p>
        Dreamscape is designed to feel like a world, but the learning engine
        underneath it still has a straightforward responsibility: children need
        good practice at the right level, across the concepts they are expected
        to understand.
      </p>

      <p>
        Learning Missions are where that work happens. They organise academic
        questions into topics and missions, record attempts and results, and
        provide evidence that can later contribute to parent-facing insights in
        NOVA+.
      </p>

      <GuideMedia
        src="/home/preview-learning-missions.png"
        alt="Dreamscape One Learning Missions"
        caption="Learning Missions provide the structured academic practice behind Nova’s wider world."
        accent="#76e5ff"
      />

      <h2>Curriculum first, game layer second</h2>
      <p>
        The surrounding game does not change what a good academic question
        requires. A Mathematics question still needs correct notation and sound
        reasoning. An English comprehension question still needs to test
        understanding of the passage. A Science question still needs to reflect
        the concept being taught.
      </p>

      <p>
        Dreamscape therefore treats the mission as an educational object first.
        The rewards and world progression come afterwards. This distinction is
        important because motivation is useful only when the underlying practice
        is worth doing.
      </p>

      <div className="dreamscape-guide-callout">
        <strong>The world gives practice a reason to continue.</strong>
        <p>
          Learning Missions do not try to turn every question into a mini-game.
          Instead, completing meaningful work creates progress that matters
          elsewhere in Dreamscape.
        </p>
      </div>

      <h2>What subjects do Learning Missions cover?</h2>
      <p>
        Dreamscape&apos;s curriculum system is structured around English,
        Mathematics and Science across primary levels. Public plan availability
        can change during rollout, so families should use the
        <Link
          href="/pricing"
          style={{ color: "#8ee8ff", textDecoration: "none", fontWeight: 800 }}
        >
          {" "}pricing page
        </Link>
        {" "}for the current subject access included in each membership.
      </p>

      <p>
        Within a subject, content is broken down into topics and concepts rather
        than treated as one giant score. This makes later analysis more useful:
        two learners can both score 80% overall while needing support in very
        different areas.
      </p>

      <h2>Why use shorter topic missions as well as assessments?</h2>
      <p>
        A learner needs both focused practice and broader checks. A topic mission
        can concentrate on one area and give faster feedback. A mixed assessment
        asks the learner to retrieve and apply ideas across a wider set of
        content.
      </p>

      <p>
        The two formats answer different questions. Focused practice asks,
        “Can you work with this concept?” A broader assessment asks, “Can you
        recognise when to use it among other concepts?”
      </p>

      <h2>What happens after a learner answers?</h2>
      <p>
        The immediate result matters, but Dreamscape also keeps attempt history
        so performance can contribute to a longer-term picture. A single strong
        or weak attempt should not automatically define mastery.
      </p>

      <p>
        Over time, repeated evidence can help distinguish between a concept that
        is becoming secure and one where performance is still inconsistent.
        That is the type of distinction NOVA+ is designed to surface for
        parents.
      </p>

      <h2>How do rewards connect to Learning Missions?</h2>
      <p>
        Eligible mission completion can award Dream Tokens and Dream Gems.
        Dream Tokens act as the everyday virtual currency across Dreamscape.
        Dream Gems are a more specialised learning reward.
      </p>

      <p>
        The purpose is not to suggest that every correct answer has a cash
        value. Rewards create continuity. Work completed in a curriculum mission
        can later contribute to an upgrade, a world-building choice or another
        experience.
      </p>

      <h2>What does scoring mean?</h2>
      <p>
        A percentage is useful as a snapshot, but it is not the whole learner.
        Dreamscape can use performance to award progress and identify evidence,
        while still keeping the concept itself visible.
      </p>

      <p>
        For example, a child may achieve a similar overall score in two
        Mathematics missions but struggle repeatedly with one type of reasoning.
        That repeated pattern is more actionable than the headline percentage
        alone.
      </p>

      <h2>Why question quality matters so much</h2>
      <p>
        A large question bank is only useful if the questions are accurate,
        varied and appropriately challenging. Dreamscape&apos;s content process
        uses AI to assist development and organisation, with qualified teachers
        reviewing educational content before publication.
      </p>

      <p>
        The goal is to use technology to increase the speed at which content can
        be developed and improved without handing final educational judgement to
        automation.
      </p>

      <h2>How Learning Missions connect to Nova</h2>
      <p>
        Learning Missions sit inside a wider loop. A learner practises a
        concept, earns progress and then returns to a world where that progress
        can matter. Think Lab, Knowledge Arena, Nova&apos;s Home and Skyforge
        provide different reasons to continue.
      </p>

      <GuideMedia
        src="/home/preview-nova-home.png"
        alt="Nova's Home in Dreamscape One"
        caption="Progress from learning can continue into persistent spaces such as Nova’s Home."
        accent="#c58cff"
      />

      <p>
        This is why Dreamscape separates the academic task from the world while
        still connecting them. The child should not need a flashy interaction
        inside every question. The larger motivation comes from knowing that the
        work contributes to something beyond the results screen.
      </p>

      <h2>What parents should look for</h2>
      <p>
        Rather than asking only, “How many quizzes did you finish?”, parents can
        look for patterns:
      </p>

      <ul>
        <li>Which concepts are consistently strong?</li>
        <li>Which areas repeatedly produce errors?</li>
        <li>Does performance improve after more practice?</li>
        <li>Is the learner rushing or working carefully?</li>
        <li>Can the child explain why an answer is correct?</li>
      </ul>

      <p>
        These questions move the conversation from activity volume to learning
        quality.
      </p>

      <GuideCTA
        title="See where Learning Missions lead"
        text="Explore Nova’s World to see how curriculum practice connects to thinking, rewards and longer-term progression."
        primaryLabel="Explore Nova’s World"
        primaryHref="/explore/novas-world"
        secondaryLabel="NOVA+ for Parents"
        secondaryHref="/explore/nova-plus"
        accent="#76e5ff"
      />
    </GuideLayout>
  );
}
