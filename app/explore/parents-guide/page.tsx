import Link from "next/link";
import { buildGuideMetadata } from "@/lib/seo";
import GuideLayout from "@/components/explore/GuideLayout";
import GuideCTA from "@/components/explore/GuideCTA";
import GuideMedia from "@/components/explore/GuideMedia";

export const metadata = buildGuideMetadata({
  title: "A Parent’s Guide to Dreamscape One",
  description: "A practical parent guide to Dreamscape One: age guidance, Nova, Milo, Learning Missions, NOVA+, rewards, memberships and how families can use the platform.",
  path: "/explore/parents-guide",
  accent: "#ffbd73",
});

export default function ParentsGuidePage() {
  return (
    <GuideLayout
      canonicalPath="/explore/parents-guide"
      title="A Parent’s Guide to Dreamscape One"
      description="Dreamscape One combines structured learning, game worlds, rewards, parent insights and later-stage financial and business experiences. This guide explains what each part is for and how families can approach it."
      accent="#ffbd73"
      relatedSlugs={[
        "what-is-dreamscape-one",
        "nova-plus",
        "learning-missions",
      ]}
    >
      <p>
        Dreamscape One is designed to give children more than a sequence of
        quizzes. The academic work still matters, but progress can continue into
        thinking challenges, upgrades, world-building, financial choices and
        parent-facing learning insights.
      </p>

      <p>
        For parents, the most useful way to think about Dreamscape is not as one
        game and not as one worksheet platform. It is a connected ecosystem with
        different parts serving different purposes.
      </p>

      <div className="dreamscape-guide-callout">
        <strong>The short version</strong>
        <p>
          Nova is the main learning and thinking world. NOVA+ helps parents
          understand learning evidence. Milo introduces harder ideas around
          money, value, business and decision-making, with difficulty designed
          mainly for ages 12+.
        </p>
      </div>

      <h2>Who is Dreamscape One for?</h2>
      <p>
        Nova is built primarily around primary-school learners. Its curriculum
        experiences are organised around school learning, while its wider world
        gives children reasons to use rewards, revisit spaces and continue
        progressing.
      </p>

      <p>
        Milo&apos;s World is designed mainly for learners around age 12 and above.
        That is a <strong>difficulty guide rather than an age gate</strong>.
        Confident younger learners who are ready for more complex money,
        business and decision-making ideas can explore earlier.
      </p>

      <p>
        Readiness matters more than forcing every child into the same timeline.
        A younger learner may enjoy some Milo activities immediately, while
        another learner may benefit from spending more time building foundations
        in Nova first.
      </p>

      <h2>What does a learner actually do in Nova?</h2>
      <p>
        Nova&apos;s World brings together curriculum work and wider game
        experiences. Learning Missions provide structured academic practice.
        Think Lab focuses on reasoning, memory and related thinking skills.
        Knowledge Arena turns knowledge into a faster interactive challenge.
        Nova&apos;s Home and Skyforge give earned progress somewhere to accumulate.
      </p>

      <GuideMedia
        src="/home/nova-world-cover.png"
        alt="Nova's World in Dreamscape One"
        caption="Nova is the main learning world, connecting academic practice with thinking, rewards and longer-term progression."
        accent="#8ee8ff"
      />

      <p>
        The purpose of the surrounding world is not to hide weak educational
        content behind animation. The learning task still needs to be accurate,
        appropriately difficult and useful. The world exists to make progress
        feel connected and worth returning to.
      </p>

      <h2>What subjects are part of Dreamscape?</h2>
      <p>
        Dreamscape&apos;s curriculum system is built around English, Mathematics
        and Science across primary levels. Public access to particular subjects
        can depend on the current plan and rollout stage, so the
        <Link
          href="/pricing"
          style={{ color: "#ffbd73", textDecoration: "none", fontWeight: 800 }}
        >
          {" "}pricing page
        </Link>
        {" "}is the best place to check what is included in each active
        membership.
      </p>

      <p>
        Within the platform, learning is organised at topic and concept level so
        progress can become more useful than a single overall percentage.
        Assessments and repeated activity can then contribute evidence to the
        wider learner picture.
      </p>

      <h2>What are Dream Tokens and Dream Gems?</h2>
      <p>
        Dream Tokens, or DT, are the main virtual currency used across
        Dreamscape. Learners can earn them through eligible activity and use
        them in parts of the world for upgrades, purchases and decisions.
      </p>

      <p>
        Dream Gems, or DG, are a more specialised reward connected to eligible
        learning completion. The two currencies serve different purposes, but
        both are designed as <strong>in-platform virtual rewards</strong>, not
        real-world money.
      </p>

      <p>
        The important learning idea is what happens after a reward is earned.
        Once resources are limited, a learner has to choose whether to spend,
        save, upgrade or use them in another part of the ecosystem.
      </p>

      <h2>What does NOVA+ show parents?</h2>
      <p>
        NOVA+ is the parent-facing intelligence layer. It is designed to move
        beyond “your child scored 80%” and organise evidence into a clearer view
        of recent learning, strengths, gaps and mastery.
      </p>

      <GuideMedia
        src="/home/nova-plus-my-learning.png"
        alt="NOVA+ My Learning parent view"
        caption="NOVA+ brings recent activity and learning signals together for parents."
        accent="#8ee8ff"
        objectFit="contain"
      />

      <p>
        Its major views include My Learning, Strengths &amp; Gaps, Mastery Map
        and recommendations as the system develops. Parents can also use
        learning reports when they want a deeper snapshot of progress.
      </p>

      <p>
        NOVA+ should be read as evidence and guidance, not as a diagnosis of a
        child. A dashboard cannot see everything a teacher or parent sees. It
        can, however, make patterns easier to notice and give families a better
        starting point for deciding what to support next.
      </p>

      <h2>What happens in Milo’s World?</h2>
      <p>
        Milo changes the type of problem. Instead of focusing mainly on school
        mastery, Milo asks learners to make choices involving limited resources,
        spending, value, risk, ownership and eventually business operations.
      </p>

      <p>
        Milo&apos;s Exchange uses fictional stocks and property with Dream Tokens.
        The Dream Shop creates spending trade-offs. Activity Lab and Quiz Hall
        give learners additional ways to earn and compete. Business Builder is
        being introduced as the next step towards operating and growing a
        simulated business.
      </p>

      <div className="dreamscape-guide-callout">
        <strong>Milo is not real-money investing.</strong>
        <p>
          Milo&apos;s markets are fictional and educational. They are designed to
          make ideas such as risk, value, opportunity cost and ownership easier
          to experience without putting real money at risk.
        </p>
      </div>

      <h2>How much should a child use Dreamscape?</h2>
      <p>
        There is no single session length that is correct for every learner.
        Dreamscape is better used consistently than treated as a long compulsory
        sitting. A child completing focused learning and leaving while still
        engaged can be more useful than extending a session simply to reach a
        time target.
      </p>

      <p>
        Parents can look at the quality of participation rather than only the
        number of minutes: Is the learner completing work carefully? Are they
        returning independently? Are the same gaps repeating? Are they making
        sensible choices with what they earn?
      </p>

      <h2>What role should parents play?</h2>
      <p>
        Dreamscape is designed to support greater independence, so parents do
        not need to supervise every question. A more useful role is to check in
        periodically, review NOVA+ together and ask the learner to explain a
        decision or show what they have built.
      </p>

      <p>
        Questions such as “Why did you choose that upgrade?”, “What did you find
        difficult this week?” or “Why did you keep those Dream Tokens instead of
        spending them?” can turn the platform into a conversation rather than a
        monitoring exercise.
      </p>

      <h2>How is learning content developed?</h2>
      <p>
        Dreamscape uses AI to assist development, organisation and improvement
        of learning content, while educational content is reviewed by qualified
        teachers before it reaches learners. The goal is to combine the speed of
        modern tools with human judgement about accuracy, clarity, curriculum
        relevance and age appropriateness.
      </p>

      <h2>How should parents think about memberships?</h2>
      <p>
        Dreamscape&apos;s public plans can change as subjects and NOVA+ roll out.
        Rather than hard-code plan details into an evergreen guide, families
        should use the current pricing page for active membership options,
        introductory trials and what each plan includes.
      </p>

      <p>
        If access later ends, the purpose of cancellation is to stop paid access,
        not to pretend the learner never used Dreamscape. Saved learning
        progress and earned virtual rewards are treated separately from whether
        a paid membership is currently active.
      </p>

      <h2>What should I look at first?</h2>
      <p>
        If your child is new to Dreamscape, begin with Nova and let the learner
        experience the system before trying to optimise every feature. Once
        there is enough activity, NOVA+ becomes more useful because there is real
        evidence to interpret.
      </p>

      <p>
        Milo can be introduced when the learner is ready for the additional
        complexity. The goal is progression, not rushing a child through every
        part of the ecosystem as quickly as possible.
      </p>

      <GuideCTA
        title="Start with the part that matters most"
        text="Explore how Dreamscape works as a whole, or view the current membership options for your learner."
        primaryLabel="How Dreamscape Works"
        primaryHref="/how-it-works"
        secondaryLabel="View Pricing"
        secondaryHref="/pricing"
        accent="#ffbd73"
      />
    </GuideLayout>
  );
}
