"use client";

import type {
  FinancialAdvisorId,
  FinancialBlockResponse,
  FinancialLearningBlock,
} from "../lib/financial-learning-engine-types";

import ExplainLearningBlock from "./learning-blocks/ExplainLearningBlock";
import QuestionLearningBlock from "./learning-blocks/QuestionLearningBlock";
import ScenarioLearningBlock from "./learning-blocks/ScenarioLearningBlock";
import DecisionLearningBlock from "./learning-blocks/DecisionLearningBlock";
import ComparisonLearningBlock from "./learning-blocks/ComparisonLearningBlock";
import SliderLearningBlock from "./learning-blocks/SliderLearningBlock";
import AllocationLearningBlock from "./learning-blocks/AllocationLearningBlock";
import SortLearningBlock from "./learning-blocks/SortLearningBlock";
import NumberInputLearningBlock from "./learning-blocks/NumberInputLearningBlock";
import PredictionLearningBlock from "./learning-blocks/PredictionLearningBlock";
import GrowthSimulatorLearningBlock from "./learning-blocks/GrowthSimulatorLearningBlock";
import BusinessModelLearningBlock from "./learning-blocks/BusinessModelLearningBlock";
import PricingSimulatorLearningBlock from "./learning-blocks/PricingSimulatorLearningBlock";
import CashFlowTimelineLearningBlock from "./learning-blocks/CashFlowTimelineLearningBlock";
import InventorySimulatorLearningBlock from "./learning-blocks/InventorySimulatorLearningBlock";

export default function FinancialBlockRenderer({
  block,
  response,
  advisorId,
  onChange,
}: {
  block: FinancialLearningBlock;
  response?: FinancialBlockResponse;
  advisorId: FinancialAdvisorId;
  onChange: (response: FinancialBlockResponse) => void;
}) {
  switch (block.type) {
    case "explain":
      return <ExplainLearningBlock block={block} />;
    case "question":
      return <QuestionLearningBlock block={block} response={response} onChange={onChange} />;
    case "scenario":
      return <ScenarioLearningBlock block={block} />;
    case "decision":
      return (
        <DecisionLearningBlock
          block={block}
          response={response}
          advisorId={advisorId}
          onChange={onChange}
        />
      );
    case "comparison":
      return <ComparisonLearningBlock block={block} />;
    case "slider":
      return <SliderLearningBlock block={block} response={response} onChange={onChange} />;
    case "allocation":
      return <AllocationLearningBlock block={block} response={response} onChange={onChange} />;
    case "sort":
      return <SortLearningBlock block={block} response={response} onChange={onChange} />;
    case "number_input":
      return <NumberInputLearningBlock block={block} response={response} onChange={onChange} />;
    case "prediction":
      return <PredictionLearningBlock block={block} response={response} onChange={onChange} />;
    case "growth_simulator":
      return <GrowthSimulatorLearningBlock block={block} response={response} onChange={onChange} />;
    case "business_model":
      return <BusinessModelLearningBlock block={block} response={response} onChange={onChange} />;
    case "pricing_simulator":
      return <PricingSimulatorLearningBlock block={block} response={response} onChange={onChange} />;
    case "cashflow_timeline":
      return <CashFlowTimelineLearningBlock block={block} response={response} onChange={onChange} />;
    case "inventory_simulator":
      return <InventorySimulatorLearningBlock block={block} response={response} onChange={onChange} />;
    default:
      return null;
  }
}
