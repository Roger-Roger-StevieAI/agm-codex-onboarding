import { redirect } from "next/navigation";
import { getMemberByEmail, type HubMember } from "@/db/hub";
import { getChatGPTUser, requireChatGPTUser, type ChatGPTUser } from "./chatgpt-auth";

export type AuthorizedHubUser = ChatGPTUser & { member: HubMember };

export async function getAuthorizedHubUser(): Promise<AuthorizedHubUser | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  const member = await getMemberByEmail(user.email);
  return member?.status === "Active" ? { ...user, member } : null;
}

export async function requireAuthorizedHubUser(returnTo: string): Promise<AuthorizedHubUser> {
  const user = await requireChatGPTUser(returnTo);
  const member = await getMemberByEmail(user.email);
  if (!member || member.status !== "Active") redirect("/access-denied");
  return { ...user, member };
}
