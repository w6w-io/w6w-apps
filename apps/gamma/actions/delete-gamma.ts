import type { ActionDefinition } from "@w6w/types";
import { GammaClient } from "../lib/client.ts";

/**
 * `DELETE /v1.0/gammas/{gammaId}` — verified against
 * `management/delete-gamma.md`. Requires a workspace admin role on the API
 * key's workspace; Gamma auto-archives first if needed, so one call handles
 * archive-then-delete.
 *
 * `idempotent: true`: the end state (deleted) is reached at most once and a
 * retry after a dropped response either repeats the same `status: "deleted"`
 * result or — once the vendor's docs note the id "is no longer addressable" —
 * fails with the same not-found response a stale id would anyway produce, so
 * retrying never causes a second, different deletion.
 */
interface Input {
  gammaId: string;
}

const deleteGamma: ActionDefinition<Input> = {
  key: "delete-gamma",
  type: "perform",
  resource: "gamma",
  title: "Delete Gamma",
  description:
    "Permanently delete a Gamma document. Requires a workspace admin role on the API key's " +
    "workspace. The Gamma becomes immediately inaccessible and is no longer addressable via " +
    "the API.",
  idempotent: true,
  params: [
    { key: "gammaId", label: "Gamma ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "string", label: 'Always "deleted" on success' },
    { key: "gammaId", type: "string", label: "The deleted Gamma's ID" },
    { key: "message", type: "string", label: "Customer-facing confirmation message" },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request(`/gammas/${encodeURIComponent(input.gammaId)}`, {
      method: "DELETE",
    });
  },
};

export default deleteGamma;
