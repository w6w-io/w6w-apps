import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient } from "../lib/client.ts";
import { summarizeApp } from "../lib/fields.ts";
import { appIdParam } from "../lib/params.ts";

/**
 * `GET /app/{app_id}` — "Gets the definition of an app and can include
 * configuration and fields. This method will always return the latest revision
 * of the app definition."
 *
 * ## This response contains a live credential, and it is stripped
 *
 * Podio's documented response for this endpoint includes, in the vendor's own
 * words:
 *
 *     "token": The app token to use when logging in as an app
 *
 * That is exactly the `app_token` half of the App Authentication grant. Paired
 * with a client id and secret — which any Podio user can mint for free — it
 * mints access tokens for this app indefinitely, and regenerating it is the
 * only revocation. A workflow step's result is persisted in the run record and
 * routinely echoed into logs and previews, so returning it would turn one read
 * into a durable, unrevoked write credential.
 *
 * It is deleted here, in `lib/fields.ts#summarizeApp`, along with the `push`
 * channel signature. Its owner still sees it on the app's Developer page in
 * Podio, which is where it belongs. Nothing else about the response is altered
 * — the full `config`, `fields`, `rights` and `owner` come back verbatim.
 */
interface Input {
  appId: string;
}

const appGet: ActionDefinition<Input> = {
  key: "app-get",
  type: "read",
  resource: "app",
  title: "Get App",
  description:
    "The full definition of one Podio app: configuration, field schema, rights and owner. " +
    "The app token Podio includes in this response is removed before it is returned.",
  params: [appIdParam],
  output: [{ key: "app", type: "object", label: "App definition" }],

  async execute(input, ctx) {
    const app = await new PodioClient(ctx).json<Record<string, unknown>>(
      `/app/${encodeSegment(input.appId)}`,
    );
    return { app: summarizeApp(app) };
  },
};

export default appGet;
