import type { ActionDefinition } from "@w6w/types";
import { GammaClient } from "../lib/client.ts";

/**
 * `POST /v1.0/gammas/{gammaId}/archive` — verified against
 * `management/archive-gamma.md`. "Idempotent — archiving an already archived
 * Gamma succeeds," per the vendor, which is what justifies `idempotent: true`.
 *
 * The vendor's own warning: `gammaId` MUST be the API file ID (e.g.
 * `g_l0mf2jvf1fpmi1v`) returned by a generation/search/get-gamma call — the
 * slug at the end of a `gamma.app/docs/...` web URL returns 403, not 404.
 */
interface Input {
  gammaId: string;
}

const archiveGamma: ActionDefinition<Input> = {
  key: "archive-gamma",
  type: "perform",
  resource: "gamma",
  title: "Archive Gamma",
  description:
    "Archive a Gamma to remove it from the active workspace without deleting it. Requires " +
    "edit permission. Use the API file ID (e.g. g_l0mf2jvf1fpmi1v), not the web app URL slug.",
  idempotent: true,
  params: [
    {
      key: "gammaId",
      label: "Gamma ID",
      type: "string",
      required: true,
      hint: "The file ID from a generation poll, search hit, or Get Gamma — not the web app " +
        "URL's document slug.",
    },
  ],
  output: [
    { key: "gammaId", type: "string", label: "Gamma ID" },
    { key: "archived", type: "boolean", label: "Archived" },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request(
      `/gammas/${encodeURIComponent(input.gammaId)}/archive`,
      { method: "POST" },
    );
  },
};

export default archiveGamma;
