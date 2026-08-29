import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, type DialpadPage, stripSignatureSecretFromPage } from "../lib/client.ts";
import { cursorParam } from "../lib/params.ts";

/**
 * `GET /api/v2/webhooks` — list every webhook registered for the company.
 *
 * **Redacted.** Every webhook carries `signature.secret`, the live secret
 * Dialpad signs event payloads with — see `lib/client.ts` for the finding.
 * Stripped before this action returns.
 */
interface Input {
  cursor?: string;
}

const webhooksList: ActionDefinition<Input> = {
  key: "webhooks-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List all webhooks registered for the company.",
  params: [cursorParam],
  output: [
    { key: "cursor", type: "string", label: "Next page cursor (null on the last page)" },
    { key: "items", type: "array", label: "Webhooks on this page (signing secret redacted)" },
  ],

  async execute(input, ctx) {
    const page = await new DialpadClient(ctx).json<DialpadPage<unknown>>("/webhooks", {
      query: { cursor: input.cursor },
    });
    return stripSignatureSecretFromPage(page);
  },
};

export default webhooksList;
