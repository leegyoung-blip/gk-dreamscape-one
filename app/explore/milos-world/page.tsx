import Link from "next/link";
import { buildGuideMetadata } from "@/lib/seo";
import GuideLayout from "@/components/explore/GuideLayout";
import GuideCTA from "@/components/explore/GuideCTA";
import GuideMedia from "@/components/explore/GuideMedia";

export const metadata = buildGuideMetadata({
  title: "A Guide to Milo’s World",
  description: "A parent guide to Milo’s World: financial literacy, Activity Lab, Milo’s Exchange, Dream Shop, Quiz Hall, Business Builder and age guidance.",
  path: "/explore/milos-world",
  accent: "#ffae5c",
});

export default function MilosWorldGuidePage() {
  return (
    <GuideLayout
      canonicalPath="/explore/milos-world"
      title="A Guide to Milo’s World"
      description="Milo’s World is where Dreamscape moves from earning rewards to deciding what to do with them — introducing money, value, risk, ownership, business and trade-offs through a fictional Dream Token economy."
      accent="#ffae5c"
      relatedSlugs={["what-is-dreamscape-one", "how-it-works", "novas-world"]}
    >
      <p>
        Milo&apos;s World is designed mainly for learners around age 12 and above.
        That age is a guide to the <strong>difficulty and ideas</strong>, not a
        hard access rule. A younger learner who is ready for more complex
        financial and business thinking can explore earlier.
      </p>

      <p>
        The central question in Milo is different from Nova. Nova often begins
        with, “What do you know?” Milo increasingly asks, “What will you do?”
        The learner has limited Dream Tokens, competing choices and consequences
        that unfold over time.
      </p>

      <GuideMedia
        src="/home/milo-world-cover.png"
        alt="Milo's World overview"
        caption="Milo’s World is built around financial literacy, business and decision-making in a fictional virtual economy."
        accent="#ffae5c"
      />

      <h2>Why introduce money and business at all?</h2>
      <p>
        Children eventually encounter money whether schools teach it explicitly
        or not. They see prices, subscriptions, advertising, online purchases,
        savings, investing conversations and businesses long before they are
        responsible for managing a household budget.
      </p>

      <p>
        Dreamscape&apos;s approach is to make some of those ideas concrete before
        real money is at stake. A virtual currency allows the learner to
        experience limited resources. A fictional market makes gains and losses
        visible. A business simulation can show that revenue is not the same as
        profit and that every operational decision has a cost.
      </p>

      <div className="dreamscape-guide-callout">
        <strong>Milo is educational, not investment advice.</strong>
        <p>
          The stocks, properties and markets in Milo&apos;s Exchange are fictional
          and use Dream Tokens rather than real money. The purpose is to learn
          about concepts such as risk, value, opportunity cost and ownership —
          not to tell learners what they should buy in real markets.
        </p>
      </div>

      <h2>Activity Lab: earn before deciding what to do</h2>
      <p>
        Activity Lab gives learners places to play, compete and earn Dream
        Tokens. That matters because a financial decision is more meaningful
        when the resource being used has already been earned through activity
        rather than appearing as unlimited virtual money.
      </p>

      <p>
        Different activities can ask for different kinds of knowledge or social
        play. The important economic idea is simple: resources are limited. If a
        learner wants to spend elsewhere in Milo&apos;s World, they first need to
        think about how many Tokens they have and what they are willing to give
        up.
      </p>

      <h2>Milo’s Exchange: experiment with value and risk</h2>
      <p>
        Milo&apos;s Exchange introduces fictional stocks and property. Learners can
        use Dream Tokens to buy assets, hold them, review changes in value and
        make later decisions about whether to keep or sell.
      </p>

      <p>
        This creates a practical way to discuss ideas that are otherwise
        abstract: an asset can rise or fall, a higher possible return may come
        with more uncertainty, and money placed in one choice cannot be used for
        another at the same time.
      </p>

      <p>
        Dreamscape&apos;s longer-term direction is for the Exchange to feel like a
        living simulated economy rather than a static calculator. Even then, the
        educational framing remains important: the purpose is to understand
        decisions and consequences, not to imitate real-money trading for its
        own sake.
      </p>

      <h2>Dream Shop: spending is also a decision</h2>
      <p>
        Financial literacy is not only about investing. Spending decisions can
        be just as instructive. The Dream Shop asks a learner to decide whether
        an item is worth the Tokens it costs, whether to buy now, or whether to
        save for something else.
      </p>

      <p>
        That may sound simple, but the underlying habit is important: every
        purchase has an opportunity cost. Choosing one thing means giving up
        another possible use of the same resource.
      </p>

      <h2>Quiz Hall: knowledge, competition and interests</h2>
      <p>
        Milo&apos;s Quiz Hall gives learners another route into the world through
        knowledge challenges. Dreamscape&apos;s Categories Hub can test broad areas
        of knowledge, while creator-led clubs can support more specialised
        interests.
      </p>

      <p>
        Quiz Hall is useful because Milo does not need every experience to be
        financial. The world can still reward curiosity, knowledge and
        competition while keeping the learner inside the same economy and
        progression system.
      </p>

      <h2>Business Builder: from consumer to operator</h2>
      <p>
        Business Builder is the next major step in Milo&apos;s direction. Instead of
        simply choosing what to buy, learners begin making decisions from the
        perspective of someone operating a business.
      </p>

      <p>
        That can include questions about staffing, stock, operating costs,
        reinvestment, growth and ownership. A business may have revenue and
        still make poor decisions. Spending more can sometimes create growth and
        sometimes create unnecessary cost. Keeping every profit in the business
        is not always the same decision as distributing value to owners.
      </p>

      <p>
        Business Builder is still being introduced progressively, so Dreamscape
        presents it as a growing part of Milo rather than pretending every
        feature is already complete.
      </p>

      <h2>What learners can practise in Milo</h2>
      <p>
        Milo&apos;s World is not trying to turn a child into a professional investor
        or entrepreneur. It is trying to make a set of useful ideas easier to
        experience:
      </p>

      <ul>
        <li>limited resources force trade-offs;</li>
        <li>spending now means giving up another possible use later;</li>
        <li>assets can change in value;</li>
        <li>higher reward can come with higher uncertainty;</li>
        <li>ownership and cash are not the same thing;</li>
        <li>revenue, costs and profit are different;</li>
        <li>good decisions sometimes require waiting;</li>
        <li>one poor decision does not have to end the whole journey.</li>
      </ul>

      <h2>Why the age guidance is 12+</h2>
      <p>
        Milo&apos;s 12+ guidance is primarily about complexity. Terms such as risk,
        value, ownership, costs and returns become more useful when a learner can
        compare alternatives and understand that outcomes may be uncertain.
      </p>

      <p>
        There is no need to treat age 12 as a locked door. Some younger children
        are ready for these ideas earlier, especially if they are curious about
        money or business and are comfortable with the game difficulty. Others
        may benefit from spending more time in Nova first. The learner&apos;s
        readiness matters more than the label.
      </p>

      <h2>How Milo connects back to Nova</h2>
      <p>
        Milo makes the most sense when seen as an extension of the habits built
        earlier. Nova asks learners to practise, think, persist and earn. Milo
        takes those earned resources and adds harder choices about what they are
        worth and how they should be used.
      </p>

      <p>
        That is why the two worlds belong together. One builds knowledge and
        progress. The other increasingly asks the learner to exercise judgement.
      </p>

      <p>
        For the full progression across both worlds, read
        <Link
          href="/how-it-works"
          style={{ color: "#ffbd73", textDecoration: "none", fontWeight: 800 }}
        >
          {" "}How Dreamscape One Works
        </Link>
        .
      </p>

      <GuideCTA
        title="Explore Milo’s World"
        text="Enter the world itself, or see how Milo fits into Dreamscape’s wider Learn → Think → Earn → Decide → Build journey."
        primaryLabel="Explore Milo"
        primaryHref="/milo-world"
        secondaryLabel="How Dreamscape Works"
        secondaryHref="/how-it-works"
        accent="#ffae5c"
      />
    </GuideLayout>
  );
}
