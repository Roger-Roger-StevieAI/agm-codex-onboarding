import { chatGPTSignOutPath, getChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function AccessDenied() {
  const user = await getChatGPTUser();
  return (
    <main className="access-page">
      <section className="access-card">
        <span className="access-mark">CH</span>
        <p className="eyebrow">Private review</p>
        <h1>This account does not have access.</h1>
        <p>
          {user?.email ? `You are signed in as ${user.email}.` : "You are not signed in."} Ask the Connection Hub owner to add your email to the review list.
        </p>
        <a className="primary-button access-action" href={chatGPTSignOutPath("/")}>Sign in with another account</a>
      </section>
    </main>
  );
}
