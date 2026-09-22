import type { Metadata } from "next";
import Link from "next/link";
import GuideLayout from "@/components/explore/GuideLayout";
import GuideCTA from "@/components/explore/GuideCTA";
import GuideMedia from "@/components/explore/GuideMedia";

export const metadata: Metadata = {
  title: "A Guide to Nova’s World",
  description:
    "A parent-first guide to Nova’s World: Learning Missions, Think Lab, Knowledge Arena, Nova’s Home, Skyforge, rewards and NOVA+.",
  alternates: {
    canonical: "https://dreamscape-one.com/explore/novas-world",
  },
  openGraph: {
    title: "A Guide to Nova’s World",
    description:
      "See how academic practice, thinking challenges, rewards and world-building connect in Nova’s World.",
    url: "https://dreamscape-one.com/explore/novas-world",
    siteName: "Dreamscape One",
    type: "article",
  },
};

export default function NovasWorldGuidePage() {
  return (
    <GuideLayout
      title="A Guide to Nova’s World"
      description="Nova’s World is the academic and thinking side of Dreamscape One: a place where curriculum practice, reasoning challenges, rewards, customisation and longer-term progression are designed to reinforce one another."
      accent="#8ee8ff"
      relatedSlugs={["what-is-dreamscape-one", "how-it-works", "nova-plus"]}
    >
      <p>
        Nova&apos;s World is designed primarily for primary-school learners. It is
        where Dreamscape places the strongest emphasis on academic foundations,
        thinking skills and the habit of returning to learning over time.
      </p>

      <p>
        Parents will see several different locations inside Nova. They are not
        intended to do the same job. Some locations are directly about
        curriculum mastery. Others focus on memory or reasoning. Others give the
        learner a place to use the rewards they have earned.
      </p>

      <GuideMedia
        src="/home/nova-world-cover.png"
        alt="Nova's World overview"
        caption="Nova’s World connects academic learning with thinking, rewards, ownership and progression."
        accent="#8ee8ff"
      />

      <h2>The Missions Centre: where curriculum learning begins</h2>
      <p>
        The Missions Centre is the academic anchor of Nova&apos;s World. It gives
        learners access to structured Learning Missions across the school
        curriculum, with English and Mathematics forming the core current
        experience and Science part of the wider Dreamscape curriculum system.
      </p>

      <p>
        Learning Missions can include topic practice, mixed work and broader
        assessments. The goal is not simply to generate large numbers of
        questions. The questions need to reflect the concept being taught,
        become appropriately demanding, and provide enough evidence to show
        whether a learner is becoming more secure over time.
      </p>

      <GuideMedia
        src="/home/preview-learning-missions.png"
        alt="Dreamscape Learning Missions inside Nova's World"
        caption="Learning Missions provide the curriculum evidence that also feeds NOVA+ parent insights."
        accent="#8ee8ff"
      />

      <h2>Think Lab: practise the skills around learning</h2>
      <p>
        Knowing a curriculum concept is only one part of learning. Children also
        need to hold information in mind, notice relationships, spot patterns
        and reason when the answer is not immediately obvious.
      </p>

      <p>
        Think Lab is where Dreamscape can focus on these supporting abilities in
        their own right. Activities such as Colour Code, Sets and Tower Memory
        are designed to feel different from a subject quiz because their purpose
        is different. They ask the learner to pay attention, plan, remember and
        reason.
      </p>

      <div className="dreamscape-guide-callout">
        <strong>Why separate thinking games from curriculum quizzes?</strong>
        <p>
          If every challenge looks like another worksheet, the learner never
          gets to experience thinking as a skill of its own. Think Lab creates a
          different context while still contributing to the wider Dreamscape
          journey.
        </p>
      </div>

      <h2>Knowledge Arena: test what you know under pressure</h2>
      <p>
        Knowledge Arena turns question answering into a faster, more energetic
        challenge. Learners answer correctly to attack, protect their character
        and progress through a battle. In multiplayer modes they can cooperate
        or compete while still needing to produce correct answers.
      </p>

      <p>
        The arena is not meant to replace careful teaching. Its value comes from
        retrieval, fluency and engagement. A learner who has already studied a
        topic gets another reason to recall and apply that knowledge in a
        different setting.
      </p>

      <h2>Nova’s Home: give progress a place to live</h2>
      <p>
        Nova&apos;s Home exists because rewards become more meaningful when the
        learner can use them to change something persistent. Instead of earning
        points that disappear into a total, learners can use Dream Tokens and
        eligible rewards to unlock spaces, furnish rooms, collect items and
        personalise the world.
      </p>

      <GuideMedia
        src="/home/preview-nova-home.png"
        alt="Nova's Home customisation in Dreamscape One"
        caption="Nova’s Home gives learning rewards a visible, persistent use beyond the quiz screen."
        accent="#c58cff"
      />

      <p>
        This is one of the most important differences between Dreamscape and a
        simple points system. The learner is not only told that they have made
        progress. They can see a world that is gradually becoming more theirs.
      </p>

      <h2>Skyforge Hangar: build, upgrade and test</h2>
      <p>
        Skyforge takes the idea of ownership further. Learners can unlock rover
        tiers, choose colourways, install performance upgrades and take the rover
        into Expeditions. Different rover profiles favour different strengths,
        so the choice is not simply about buying the most expensive item.
      </p>

      <GuideMedia
        src="/home/preview-rover.png"
        alt="Skyforge rover upgrades"
        caption="Skyforge connects Dream Token decisions to performance, upgrades and longer-term progression."
        accent="#c58cff"
      />

      <p>
        A learner may choose to spend Tokens immediately on an upgrade or save
        for a later rover tier. That creates a simple form of resource planning
        even before Milo&apos;s World introduces financial concepts more directly.
      </p>

      <h2>Dream Tokens and Dream Gems inside Nova</h2>
      <p>
        <strong>Dream Tokens (DT)</strong> are the everyday virtual currency
        used throughout Dreamscape. They can be earned through progress and used
        for upgrades, unlocks and purchases. <strong>Dream Gems (DG)</strong>
        are a more specialised reward linked to eligible learning activities.
      </p>

      <p>
        The currencies have different purposes, but the key design principle is
        the same: learning should create visible progress that matters somewhere
        else in the ecosystem. Neither currency is cash, and the system is not
        designed to turn every answer into a financial transaction.
      </p>

      <h2>How the locations work together</h2>
      <p>
        A child might complete a Mathematics mission in the Missions Centre,
        spend a few minutes in Think Lab, then use earned Dream Tokens to improve
        a rover or customise Nova&apos;s Home. Another day, the learner may choose
        Knowledge Arena for a faster challenge before returning to curriculum
        work.
      </p>

      <p>
        The sequence does not have to be identical every time. What matters is
        that the locations share progression. The learner&apos;s academic work is
        not isolated from the rest of the world.
      </p>

      <h2>Where NOVA+ fits for parents</h2>
      <p>
        Parents do not need to interpret every game screen to understand whether
        learning is happening. NOVA+ is designed to organise the academic
        evidence behind the experience into clearer views of progress,
        strengths, gaps and mastery.
      </p>

      <p>
        This is particularly important because a learner can enjoy Nova&apos;s World
        while still having concepts that need attention. Engagement is useful,
        but it is not the same as mastery. NOVA+ helps keep those two ideas
        separate.
      </p>

      <h2>Who Nova’s World is designed for</h2>
      <p>
        Nova&apos;s World is built around the primary-school stage, roughly ages
        6–12, but the more useful guide is academic readiness rather than a
        birthday alone. Learners can move through different subjects and
        challenges at different speeds.
      </p>

      <p>
        As children become ready for more complex questions about money,
        ownership, risk and business, Milo&apos;s World begins to make more sense.
        The transition is meant to feel like the world growing with the learner,
        not a sudden replacement of one product with another.
      </p>

      <p>
        To understand the parent intelligence layer behind Nova in more detail,
        continue with
        <Link
          href="/explore/nova-plus"
          style={{ color: "#8ee8ff", textDecoration: "none", fontWeight: 800 }}
        >
          {" "}What Is NOVA+? A Parent&apos;s Guide
        </Link>
        .
      </p>

      <GuideCTA
        title="See Nova for yourself"
        text="Explore Nova’s World, or read how NOVA+ turns learning evidence into a clearer parent view."
        primaryLabel="Explore Nova’s World"
        primaryHref="/inventor"
        secondaryLabel="Read the NOVA+ Guide"
        secondaryHref="/explore/nova-plus"
        accent="#8ee8ff"
      />
    </GuideLayout>
  );
}
