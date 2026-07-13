import type { Metadata } from "next";
import { getChatGPTUser } from "./chatgpt-auth";
import { ConnectionHub } from "./ConnectionHub";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connection Hub",
  description: "Company access, connections, and approvals for Codex.",
};

export default async function Home() {
  const user = await getChatGPTUser();

  return (
    <ConnectionHub
      viewer={{
        name: user?.displayName ?? "Stevie Kirk",
        email: user?.email ?? "stevie@agmagency.com",
      }}
    />
  );
}
