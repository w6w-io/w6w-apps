import type { ActionDefinition } from "@w6w/types";
import { asJson, BrowseAiClient } from "../lib/client.ts";
import { robotIdParam } from "../lib/params.ts";

/**
 * `PATCH /v2/robots/{robotId}/cookies` — replace the cookies a robot presents
 * when it visits the target site (a logged-in session, a consent choice, …).
 *
 * The request body is the array of cookies itself — not wrapped in an object —
 * and the response echoes back the full, resulting cookie set, so sending a
 * body is always a full replace rather than a merge. Repeating the same call
 * lands on the same set every time, which is what makes this idempotent.
 */
interface Input {
  robotId: string;
  cookies: unknown;
}

interface Cookie {
  name: string;
  value: string;
  domain?: string;
  expirationDate?: number;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  hostOnly?: boolean;
}

interface Output {
  cookies: Cookie[];
}

const robotCookiesSet: ActionDefinition<Input, Output> = {
  key: "robot-cookies-set",
  type: "perform",
  resource: "robot",
  title: "Set Robot Cookies",
  description:
    "Replace a robot's cookies — the whole set is overwritten, not merged. Useful for injecting " +
    "a logged-in session or a consent-banner cookie ahead of a run.",
  idempotent: true,
  params: [
    robotIdParam,
    {
      key: "cookies",
      label: "Cookies",
      type: "json",
      required: true,
      hint: 'Array of cookie objects, each at least `{"name": "...", "value": "..."}`, e.g. ' +
        '`[{"name":"session","value":"abc123","domain":".example.com"}]`. This replaces the ' +
        "robot's entire cookie set.",
    },
  ],
  output: [
    { key: "cookies", type: "array", label: "Resulting cookies" },
  ],

  async execute(input, ctx) {
    const cookies = asJson<Cookie[]>(input.cookies, "Cookies");
    const body = await new BrowseAiClient(ctx).request<Output>(
      `/robots/${encodeURIComponent(input.robotId)}/cookies`,
      { method: "PATCH", body: cookies },
    );
    return { cookies: body.cookies };
  },
};

export default robotCookiesSet;
