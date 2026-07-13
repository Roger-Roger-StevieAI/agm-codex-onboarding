import { chatGPTSignOutPath, getChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function AccessDenied() {
  const user = await getChatGPTUser();
  return (
    <main className="access-page">
      <section className="access-card">
        <span className="access-mark">CH</span>
        <p className="eyebrow">AGM Codex onboarding</p>
        <h1>This account does not have access.</h1>
        <p>
          {user?.email ? `You are signed in as ${user.email}.` : "You are not signed in."} Ask a Connection Hub administrator to invite or reactivate this email.
        </p>
        <a className="primary-button access-action" href={chatGPTSignOutPath("/")}>Sign in with another account</a>
      </section>
    </main>
  );
}
