import type { Metadata } from "next";
import { requireAuthorizedHubUser } from "./hub-access";
import { ConnectionHub } from "./ConnectionHub";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connection Hub",
  description: "Company access, connections, and approvals for Codex.",
};

export default async function Home() {
  const user = await requireAuthorizedHubUser("/");

  return (
    <ConnectionHub
      viewer={{
        name: user.displayName,
        email: user.email,
      }}
    />
  );
}
