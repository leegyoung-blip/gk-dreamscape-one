import Link from "next/link";
import { buildGuideMetadata } from "@/lib/seo";
import GuideLayout from "@/components/explore/GuideLayout";
import GuideCTA from "@/components/explore/GuideCTA";
import GuideMedia from "@/components/explore/GuideMedia";

export const metadata = buildGuideMetadata({
  title: "What Is NOVA+? A Parent’s Guide",
  description: "Understand NOVA+ learning intelligence: My Learning, Strengths & Gaps, Mastery Map, recommendations and parent learning reports.",
  path: "/explore/nova-plus",
  accent: "#8ee8ff",
});

export default function NovaPlusGuidePage() {
  return (
    <GuideLayout
      canonicalPath="/explore/nova-plus"
      title="What Is NOVA+? A Parent’s Guide"
      description="NOVA+ is Dreamscape One’s parent-facing learning intelligence layer. It organises evidence from a learner’s work into clearer views of progress, strengths, gaps, mastery and what may be useful to focus on next."
      accent="#8ee8ff"
      relatedSlugs={["what-is-dreamscape-one", "how-it-works", "novas-world"]}
    >
      <p>
        Most learning platforms can tell a parent a score. A score is useful,
        but it rarely answers the questions parents actually have: Is my child
        improving? Which concepts are secure? Where do the same mistakes keep
        appearing? Is this a temporary bad result or a genuine gap? What should
        we work on next?
      </p>

      <p>
        NOVA+ is being built to answer those questions more clearly. It does not
        replace the learner experience in Nova. Instead, it sits above the
        learning engine and turns the evidence generated there into a parent
        view that is easier to understand and act on.
      </p>

      <GuideMedia
        src="/home/nova-plus-my-learning.png"
        alt="NOVA+ My Learning dashboard"
        caption="NOVA+ brings recent learning activity and subject signals together for parents."
        accent="#8ee8ff"
        objectFit="contain"
      />

      <h2>Why another score is not enough</h2>
      <p>
        Imagine two children both score 80%. One may have made four unrelated
        careless mistakes. The other may have answered every question from one
        concept incorrectly. The headline score is the same, but the learning
        situation is not.
      </p>

      <p>
        NOVA+ therefore tries to work below the level of a single quiz result.
        Dreamscape maps learning evidence to concepts so that repeated activity
        can contribute to a more detailed picture over time. That makes the
        intelligence useful only if the underlying curriculum and evidence
        mapping are strong — which is why NOVA+ is being developed alongside the
        teaching engine rather than as a separate AI summary layer.
      </p>

      <h2>My Learning: the weekly picture</h2>
      <p>
        <strong>My Learning</strong> is the broadest NOVA+ view. It helps a
        parent understand recent activity, subject performance and the learner&apos;s
        developing profile without requiring them to inspect every individual
        attempt.
      </p>

      <p>
        The purpose is not to flood parents with data. A useful dashboard should
        make it easier to answer: What has my child been doing? Which subjects
        are currently strongest? Where is the evidence becoming less secure?
        Has the pattern changed from previous weeks?
      </p>

      <h2>Strengths &amp; Gaps: go down to concept level</h2>
      <p>
        A subject label such as “Mathematics” is often too broad to be helpful.
        A child may be confident with fractions but repeatedly struggle with
        ratio, geometry or a particular form of word problem.
      </p>

      <p>
        <strong>Strengths &amp; Gaps</strong> is designed to surface performance at
        the concept level. That gives parents a more useful starting point than a
        general statement such as “Maths needs improvement”. It can also help
        avoid unnecessary practice in areas that already appear secure.
      </p>

      <GuideMedia
        src="/home/nova-plus-strengths-gaps.png"
        alt="NOVA+ Strengths and Gaps screen"
        caption="Strengths & Gaps focuses on concepts rather than reducing a whole subject to one score."
        accent="#8ee8ff"
        objectFit="contain"
      />

      <h2>Mastery Map: see how evidence connects across the curriculum</h2>
      <p>
        The <strong>Mastery Map</strong> organises concept-level evidence into a
        larger curriculum structure. Instead of viewing every quiz as an
        isolated event, parents can see how work contributes to broader areas of
        learning.
      </p>

      <p>
        The initial NOVA+ mastery work is focused on English and Mathematics.
        Those subjects are being mapped so that evidence can accumulate against
        the correct curriculum concepts rather than simply being counted as
        generic activity.
      </p>

      <GuideMedia
        src="/home/nova-plus-mastery-map.png"
        alt="NOVA+ Mastery Map"
        caption="The Mastery Map connects individual evidence to a broader view of curriculum development."
        accent="#c58cff"
        objectFit="contain"
      />

      <p>
        The map is not intended to imply that mastery is permanent or perfectly
        measurable. Learning changes with time, question difficulty and context.
        The value is in giving families a structured picture based on the
        evidence Dreamscape has, rather than pretending one test can settle the
        question forever.
      </p>

      <h2>Nova Recommends: turn insight into a next step</h2>
      <p>
        Data becomes more useful when it leads to a sensible action. The purpose
        of <strong>Nova Recommends</strong> is to use the available learning
        evidence to suggest what may deserve attention next — for example, a
        concept that appears weak, a skill that needs more evidence, or an area
        that may be ready for a harder challenge.
      </p>

      <p>
        Recommendations should be treated as guidance, not as an instruction
        that overrides a teacher or parent. Dreamscape sees only the work that
        happens inside its own learning environment. A child may know more than
        the platform has observed, or may be struggling for reasons that a quiz
        cannot detect.
      </p>

      <div className="dreamscape-guide-callout">
        <strong>NOVA+ is evidence-based guidance, not a diagnosis.</strong>
        <p>
          It can organise patterns in Dreamscape activity. It cannot determine a
          child&apos;s full ability, motivation, wellbeing or learning needs from
          platform data alone. Parent and teacher judgement still matter.
        </p>
      </div>

      <h2>Downloadable learning reports</h2>
      <p>
        Parents do not always want to read a dashboard on screen. NOVA+ therefore
        includes downloadable learning reports that bring together the most
        useful information into a clearer document that can be reviewed later or
        discussed with another adult supporting the learner.
      </p>

      <GuideMedia
        src="/home/nova-plus-report.png"
        alt="NOVA+ downloadable learning report"
        caption="NOVA+ reports provide a portable summary of the learner’s progress, strengths and areas to support."
        accent="#ffbd73"
        objectFit="contain"
      />

      <h2>What evidence does NOVA+ use?</h2>
      <p>
        NOVA+ is built around Dreamscape learning activity. That includes
        evidence such as performance on mapped questions, attempts across
        concepts, recent activity and the relationship between a learner&apos;s
        answers and the curriculum taxonomy behind them.
      </p>

      <p>
        The system becomes more useful as the learner completes meaningful work.
        A parent should therefore expect the picture to strengthen over time
        rather than assume that the first few activities can produce a complete
        learning profile.
      </p>

      <h2>What NOVA+ deliberately does not claim</h2>
      <p>
        Dreamscape does not need NOVA+ to sound more certain than the evidence
        allows. In particular, NOVA+ should not be read as claiming that:
      </p>

      <ul>
        <li>a single low score proves a permanent weakness;</li>
        <li>a high score means a concept can never be forgotten;</li>
        <li>Dreamscape activity represents everything a child knows;</li>
        <li>an automated recommendation should replace teacher judgement;</li>
        <li>learning can be reduced to one overall intelligence number.</li>
      </ul>

      <p>
        The aim is a more useful interpretation of the available evidence — not
        a false sense of precision.
      </p>

      <h2>Who NOVA+ is for</h2>
      <p>
        NOVA+ is primarily for parents who want more than a list of completed
        quizzes. It is especially useful when a learner is practising
        independently and the parent wants to understand what that practice is
        showing without sitting beside every session.
      </p>

      <p>
        NOVA+ is initially centred on English and Mathematics, reflecting the
        subjects where Dreamscape is building the deepest mapped learner
        intelligence. It can be accessed as part of the wider Dreamscape
        experience, and the current plan structure is explained on the pricing
        page rather than fixed inside this guide so that the guide can remain
        useful as memberships evolve.
      </p>

      <h2>How NOVA+ connects to Nova’s World</h2>
      <p>
        Nova&apos;s World is what the learner experiences. NOVA+ is what helps the
        parent interpret the academic evidence behind it. A child may care about
        completing a mission, fighting in Knowledge Arena or earning enough DT
        for an upgrade. The parent may care about whether fractions are
        improving or which language concepts remain inconsistent.
      </p>

      <p>
        Both views can exist at the same time. In fact, that is the point: the
        learner does not need to experience every practice session as a data
        dashboard for the parent to gain useful insight from it.
      </p>

      <p>
        To see the learner-facing side in more detail, read
        <Link
          href="/explore/novas-world"
          style={{ color: "#8ee8ff", textDecoration: "none", fontWeight: 800 }}
        >
          {" "}A Guide to Nova&apos;s World
        </Link>
        .
      </p>

      <GuideCTA
        title="Understand the learning behind the adventure"
        text="Explore Nova’s World from the learner’s perspective, or view the current Dreamscape plans and NOVA+ options."
        primaryLabel="Explore Nova’s World Guide"
        primaryHref="/explore/novas-world"
        secondaryLabel="View Plans"
        secondaryHref="/pricing"
        accent="#8ee8ff"
      />
    </GuideLayout>
  );
}
