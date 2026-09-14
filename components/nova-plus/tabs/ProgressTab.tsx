import TabScaffold from "./TabScaffold";
export default function ProgressTab() {
  return <TabScaffold eyebrow="PROGRESS" title="See how the learner is changing over time" description="This will turn snapshots, resolved gaps and skill trends into a simple visual learning journey." cards={[{icon:"↗",title:"Improving",text:"Skills moving upward over time."},{icon:"✓",title:"Newly secure",text:"Areas that have crossed into secure mastery."},{icon:"◇",title:"Still growing",text:"Priority areas that remain in development."}]} />;
}
