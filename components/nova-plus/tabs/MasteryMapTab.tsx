import TabScaffold from "./TabScaffold";
export default function MasteryMapTab() {
  return <TabScaffold eyebrow="MASTERY MAP" title="Explore the learner's curriculum map" description="Topics and skills will be grouped visually by subject, level and mastery state instead of displayed as a long analytics table." cards={[{icon:"✎",title:"English",text:"Topic and skill mastery."},{icon:"∑",title:"Mathematics",text:"Topic and skill mastery."},{icon:"⚗",title:"Science",text:"Topic and skill mastery."}]} />;
}
