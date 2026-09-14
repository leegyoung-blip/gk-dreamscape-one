import TabScaffold from "./TabScaffold";
export default function ParentReportTab() {
  return <TabScaffold eyebrow="PARENT REPORT" title="A simple picture of what parents should know" description="The report will summarise progress, priorities and Nova's next steps without requiring parents to interpret raw analytics." cards={[{icon:"↗",title:"What improved",text:"The most meaningful progress since the last report."},{icon:"!",title:"What needs attention",text:"The one or two priorities parents should know."},{icon:"→",title:"What happens next",text:"Nova's recommended next learning actions."}]} />;
}
