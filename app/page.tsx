import type { Metadata } from "next";
import { requireAuthorizedHubUser } from "./hub-access";
import { ConnectionHub } from "./ConnectionHub";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AGM Codex Onboarding",
  description: "Role-based Codex setup for AGM staff.",
};

export default async function Home() {
  const user = await requireAuthorizedHubUser("/");

  return (
    <ConnectionHub
      viewer={{
        name: user.member.name,
        email: user.email,
        isAdmin: user.member.isAdmin,
      }}
    />
  );
}
