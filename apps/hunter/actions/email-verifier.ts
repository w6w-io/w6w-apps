import type { ActionDefinition } from "@w6w/types";
import { formatHunterError, HunterClient } from "../lib/client.ts";

/**
 * `GET /v2/email-verifier` — check one email address's deliverability.
 *
 * Three status codes matter here, not the usual two:
 *
 *  - **200** — verification complete; `data.status` is one of `valid`,
 *    `invalid`, `accept_all`, `webmail`, `disposable` or `unknown`.
 *  - **202** — Hunter's own check can run up to 20 seconds; if it has not
 *    finished, this comes back instead. Poll the same call again — Hunter
 *    counts it as **one** request total, not one per poll, so retrying costs
 *    nothing extra.
 *  - **222** — the remote SMTP server answered in a way outside Hunter's
 *    control. Retry later.
 *
 * All three are inside the 200–299 range `Response.ok` treats as success, so
 * this action uses `HunterClient.raw` rather than `request` to tell 202/222
 * apart from a completed 200 and surface `pending`/`smtpIssue` explicitly
 * instead of making the caller inspect a raw status code.
 *
 * Rate limited to 10 requests/second and 300/minute — the tightest limit in
 * this app's surface.
 */
interface Input {
  email: string;
}

interface VerifierData {
  status?: string;
  score?: number;
  email?: string;
  [k: string]: unknown;
}

const emailVerifier: ActionDefinition<Input> = {
  key: "email-verifier",
  type: "read",
  resource: "email",
  title: "Email Verifier",
  description: "Check an email address's deliverability status and SMTP-level signals.",
  params: [
    { key: "email", label: "Email", type: "string", required: true, placeholder: "a@example.com" },
  ],
  output: [
    { key: "pending", type: "boolean", label: "Still verifying (HTTP 202) — poll again" },
    { key: "smtpIssue", type: "boolean", label: "Remote SMTP server misbehaved (HTTP 222)" },
    {
      key: "data",
      type: "object",
      label: "status, score, regexp, mx_records, smtp_check, sources[]",
    },
    { key: "meta", type: "object", label: "params echo" },
  ],

  async execute(input, ctx) {
    const client = new HunterClient(ctx);
    ctx.log("info", "verifying email", { email: input.email });
    const { status, body } = await client.raw<VerifierData>("/email-verifier", {
      query: { email: input.email },
    });

    if (status === 202) {
      return { pending: true, smtpIssue: false, data: body?.data, meta: body?.meta };
    }
    if (status === 222) {
      return { pending: false, smtpIssue: true, data: body?.data, meta: body?.meta };
    }
    if (status < 200 || status >= 300) {
      throw new Error(
        formatHunterError(status, "GET", "/v2/email-verifier", JSON.stringify(body ?? {})),
      );
    }
    return { pending: false, smtpIssue: false, data: body?.data, meta: body?.meta };
  },
};

export default emailVerifier;
