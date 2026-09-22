import type { Metadata } from "next";
import GuideLayout from "@/components/explore/GuideLayout";
import GuideCTA from "@/components/explore/GuideCTA";
import GuideMedia from "@/components/explore/GuideMedia";

export const metadata: Metadata = {
  title: "Why Dreamscape Teaches Money and Business",
  description:
    "Why financial literacy, spending, investing, ownership, risk and business decisions are part of Dreamscape One and Milo’s World.",
  alternates: {
    canonical: "https://dreamscape-one.com/explore/learning-money-and-business",
  },
  openGraph: {
    title: "Why Dreamscape Teaches Money and Business",
    description:
      "Dreamscape uses a fictional virtual economy to help learners experience trade-offs, value, risk, ownership and business decisions before real money is at stake.",
    url: "https://dreamscape-one.com/explore/learning-money-and-business",
    siteName: "Dreamscape One",
    type: "article",
  },
};

export default function LearningMoneyAndBusinessGuidePage() {
  return (
    <GuideLayout
      title="Why Dreamscape Teaches Money and Business"
      description="Children encounter prices, subscriptions, advertising, saving, risk and business long before adulthood. Dreamscape gives those ideas a safe place to become practical rather than purely theoretical."
      accent="#ffbd73"
      relatedSlugs={[
        "milos-world",
        "dream-tokens-and-gems",
        "from-learning-to-real-world-decisions",
      ]}
    >
      <p>
        Financial literacy is often discussed as if it begins when a young
        person receives a salary. In reality, children form ideas about money
        much earlier. They see adults compare prices, hear people talk about
        saving, encounter in-app purchases and advertising, and make their own
        choices about limited resources.
      </p>

      <p>
        Dreamscape&apos;s approach is not to turn children into investors or
        entrepreneurs as quickly as possible. It is to let them practise a few
        useful ways of thinking before the stakes become real.
      </p>

      <GuideMedia
        src="/home/milo-world-cover.png"
        alt="Milo's World financial literacy environment"
        caption="Milo’s World creates a fictional environment where value, spending, risk and business decisions can be experienced safely."
        accent="#ffbd73"
      />

      <h2>Money is really about choices</h2>
      <p>
        A balance is only the starting point. The more important question is
        what someone does with limited resources. Spend now? Save? Buy an asset?
        Upgrade something? Keep a reserve? Take a risk?
      </p>

      <p>
        Each choice means giving up another possible use. Economists call that
        opportunity cost, but a learner does not need the terminology first.
        They can experience the idea by having 100 Dream Tokens and two things
        they want that cost 80 each.
      </p>

      <h2>Why use a fictional economy?</h2>
      <p>
        Real money creates real consequences. That makes it a poor environment
        for a child&apos;s first experiments with loss, uncertainty or bad
        judgement.
      </p>

      <p>
        Milo uses Dream Tokens, fictional stocks and fictional property so
        learners can make imperfect decisions without putting family money at
        risk. A virtual asset can rise or fall. A purchase can feel disappointing.
        A learner can change course and try again.
      </p>

      <div className="dreamscape-guide-callout">
        <strong>Simulation is not investment advice.</strong>
        <p>
          Milo is designed to teach concepts such as risk, value, ownership and
          trade-offs. It does not tell children what to buy in real markets and
          should not be interpreted as financial advice.
        </p>
      </div>

      <h2>Spending deserves as much attention as investing</h2>
      <p>
        Financial education can become too focused on investing because markets
        seem sophisticated. Everyday spending decisions are just as important.
        A learner who understands that buying one thing reduces what remains for
        another is already practising a core financial habit.
      </p>

      <p>
        Dream Shop makes this visible. A virtual item may be appealing, but the
        learner still has to decide whether it is worth the Tokens and whether
        they would rather save for something else.
      </p>

      <h2>Investing introduces uncertainty</h2>
      <p>
        Milo&apos;s Exchange adds a different kind of decision. An asset is not
        simply consumed; it may change in value. That introduces ideas such as
        holding, selling, gains, losses and uncertainty.
      </p>

      <p>
        The educational goal is not to reward constant trading. It is to make
        learners notice that future outcomes are not guaranteed and that a
        decision can look reasonable even when the result later turns out badly.
      </p>

      <h2>Property and stocks make ownership concrete</h2>
      <p>
        Ownership can be abstract when it is explained only through definitions.
        A simulated portfolio makes it easier to distinguish cash from assets.
        A learner may have fewer Dream Tokens available to spend because some
        value is tied up in property or stock holdings.
      </p>

      <p>
        That creates useful questions: How liquid is this choice? Has its value
        changed? What would happen if I sold? What else could I have done with
        the same Tokens?
      </p>

      <h2>Business adds a new perspective</h2>
      <p>
        A consumer asks whether something is worth buying. A business operator
        has a different problem: how do I create value while managing costs,
        people, stock and growth?
      </p>

      <p>
        Business Builder is being introduced to move learners into that role.
        Decisions can involve staffing, operating costs, reinvestment and what
        happens to profits. A business can have strong sales and still make poor
        operational choices.
      </p>

      <h2>Why revenue is not profit</h2>
      <p>
        This is one of the simplest business ideas to say and one of the easiest
        to misunderstand in practice. Money coming in does not tell you how much
        value remains after costs.
      </p>

      <p>
        A simulation can make that visible. Hiring more staff may improve
        capacity but increase fixed costs. Buying more stock may support sales
        but tie up resources. Expanding too early can create pressure even when
        demand looks promising.
      </p>

      <h2>Why mistakes are useful here</h2>
      <p>
        A low-stakes simulation is valuable precisely because learners can make
        a poor choice and see what happens. If every decision is engineered to
        produce a reward, there is little reason to think carefully.
      </p>

      <p>
        The purpose is not to make failure dramatic. It is to make consequences
        visible enough that a learner can reflect: What did I expect? What
        happened instead? What would I change next time?
      </p>

      <h2>Why Milo is mainly aimed at ages 12+</h2>
      <p>
        The age guidance is about conceptual difficulty. Ideas such as
        uncertainty, ownership, delayed payoff, operating costs and competing
        uses of capital become more meaningful when a learner can compare
        alternatives and think beyond the immediate reward.
      </p>

      <p>
        It is not a hard access rule. Some younger learners are ready earlier and
        may enjoy the challenge. Others will benefit from building more
        confidence in Nova before moving into Milo&apos;s more demanding choices.
      </p>

      <h2>What we hope learners carry beyond the game</h2>
      <p>
        No simulation can guarantee that a child will make perfect financial
        decisions later in life. That is not a realistic promise.
      </p>

      <p>
        What Dreamscape can do is repeatedly expose learners to useful habits:
        compare alternatives, recognise trade-offs, keep some resources in
        reserve, distinguish price from value, understand that outcomes can be
        uncertain, and review a decision after seeing its consequences.
      </p>

      <GuideCTA
        title="See financial literacy in context"
        text="Explore Milo’s World to see how Dreamscape turns these ideas into virtual decisions, or continue into the wider journey from learning to real-world judgement."
        primaryLabel="Explore Milo’s World"
        primaryHref="/explore/milos-world"
        secondaryLabel="Learning to Real-World Decisions"
        secondaryHref="/explore/from-learning-to-real-world-decisions"
        accent="#ffbd73"
      />
    </GuideLayout>
  );
}
