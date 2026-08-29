import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, type DialpadPage, stripSignatureSecretFromPage } from "../lib/client.ts";
import { cursorParam, officeIdParam } from "../lib/params.ts";

/**
 * `GET /api/v2/callrouters` — list the company's (or one office's) API-based
 * call routers.
 *
 * **Redacted.** Every router carries `signature.secret`, the live HMAC/JWT
 * secret Dialpad signs its routing webhook requests with — see
 * `lib/client.ts` for the full finding. Stripped before this action returns.
 */
interface Input {
  cursor?: string;
  officeId?: string;
}

const callroutersList: ActionDefinition<Input> = {
  key: "callrouters-list",
  type: "search",
  resource: "callrouter",
  title: "List Call Routers",
  description: "List API-based call routers for the company, or for one office.",
  params: [cursorParam, officeIdParam],
  output: [
    { key: "cursor", type: "string", label: "Next page cursor (null on the last page)" },
    { key: "items", type: "array", label: "Call routers on this page (signing secret redacted)" },
  ],

  async execute(input, ctx) {
    const page = await new DialpadClient(ctx).json<DialpadPage<unknown>>("/callrouters", {
      query: { cursor: input.cursor, office_id: input.officeId },
    });
    return stripSignatureSecretFromPage(page);
  },
};

export default callroutersList;
