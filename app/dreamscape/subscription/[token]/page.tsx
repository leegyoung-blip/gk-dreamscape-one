import DreamscapeSubscriptionManagementClient from "./DreamscapeSubscriptionManagementClient";

export default async function DreamscapeSubscriptionManagementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <DreamscapeSubscriptionManagementClient token={token} />
  );
}
