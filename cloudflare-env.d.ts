declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    COMPOSIO_API_KEY?: string;
    COMPOSIO_META_CONNECTED_ACCOUNT_ID?: string;
    COMPOSIO_META_TOOLKIT_VERSION?: string;
  }
}
