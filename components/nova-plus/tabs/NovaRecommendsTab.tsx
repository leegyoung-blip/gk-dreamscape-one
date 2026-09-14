import TabScaffold from "./TabScaffold";
export default function NovaRecommendsTab() {
  return <TabScaffold eyebrow="NOVA RECOMMENDS" title="Know exactly what to work on next" description="Nova will turn the learner profile into a small number of clear actions rather than a long list of analytics." cards={[{icon:"◎",title:"Focus now",text:"The most important skill to address first."},{icon:"↺",title:"Revisit",text:"Something learned before that is ready for review."},{icon:"✦",title:"Stretch",text:"A challenge that fits the learner's current readiness."}]} />;
}
