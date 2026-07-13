import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import { getChatGPTUser, requireChatGPTUser, type ChatGPTUser } from "./chatgpt-auth";

function allowedEmails() {
  return new Set(
    (env.HUB_ALLOWED_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isHubEmailAllowed(email: string) {
  return allowedEmails().has(email.trim().toLowerCase());
}

export async function getAuthorizedHubUser(): Promise<ChatGPTUser | null> {
  const user = await getChatGPTUser();
  return user && isHubEmailAllowed(user.email) ? user : null;
}

export async function requireAuthorizedHubUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await requireChatGPTUser(returnTo);
  if (!isHubEmailAllowed(user.email)) redirect("/access-denied");
  return user;
}
