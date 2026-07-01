import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Twilio uses HTTP Basic auth: `Account SID` as the username and `Auth Token`
 * as the password. Both come from the Twilio Console dashboard. The test hook
 * hits the `/Accounts/{sid}.json` endpoint, which is the same call n8n's
 * credential test uses.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description: "Authenticate with your Twilio Account SID and Auth Token.",
  fields: [
    {
      key: "accountSid",
      label: "Account SID",
      type: "string",
      required: true,
      hint: "Twilio Console → Account Info → Account SID (starts with `AC`).",
    },
    {
      key: "authToken",
      label: "Auth Token",
      type: "secret",
      required: true,
      hint: "Twilio Console → Account Info → Auth Token.",
    },
  ],

  sign({ request, credential }) {
    const { accountSid, authToken } = credential as { accountSid: string; authToken: string };
    request.headers["authorization"] = `Basic ${btoa(`${accountSid}:${authToken}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accountSid, authToken } = credential as { accountSid: string; authToken: string };
    const res = await ctx.fetch(`${API_BASE}/Accounts/${accountSid}.json`, {
      headers: { authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}` },
    });
    if (!res.ok) return { ok: false, message: `Twilio returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Surface the account SID so actions can read it from
   * `ctx.connection.display.accountSid` and build account-scoped URLs. The
   * credential itself is only visible to `sign` — this is the intended way to
   * expose non-secret parts of the connection to userland code.
   */
  afterConnect({ credential }) {
    const { accountSid } = credential as { accountSid: string };
    return { accountSid };
  },
};

export default apiKey;
