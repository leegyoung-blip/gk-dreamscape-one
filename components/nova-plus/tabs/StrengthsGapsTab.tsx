import TabScaffold from "./TabScaffold";
export default function StrengthsGapsTab() {
  return <TabScaffold eyebrow="STRENGTHS & GAPS" title="See where learning is secure and where it is breaking down" description="This tab will turn Nova's evidence into a clear visual map of strong skills, developing skills and persistent gaps." cards={[{icon:"↗",title:"Strengths",text:"Confirmed areas the learner can build on."},{icon:"◐",title:"Developing",text:"Skills moving in the right direction but not secure yet."},{icon:"!",title:"Learning gaps",text:"Repeated patterns that deserve targeted support."}]} />;
}
