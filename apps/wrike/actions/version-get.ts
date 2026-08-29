import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";

/**
 * `GET /version` — the API version this host currently serves.
 *
 * This is the same endpoint `auth/permanent-token.ts` uses as its credential
 * probe (see that file for why: no scope requirement, nothing account-specific
 * in the response). Exposed as an Action too since it costs nothing extra and
 * is occasionally useful for a workflow to log or branch on.
 */
type Input = Record<string, never>;

const versionGet: ActionDefinition<Input> = {
  key: "version-get",
  type: "read",
  resource: "account",
  title: "Get API Version",
  description: "Fetch the current Wrike API version (major.minor).",
  params: [],
  output: [
    { key: "major", type: "number", label: "Major version" },
    { key: "minor", type: "number", label: "Minor version" },
  ],

  execute(_input, ctx) {
    const host = hostFromConnection(ctx.connection);
    return new WrikeClient(ctx, host).one("/version");
  },
};

export default versionGet;
