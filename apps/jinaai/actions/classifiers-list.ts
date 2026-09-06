import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

/**
 * POST /v1/classifiers — "List Classifiers", per the spec's own `operationId`
 * (`list_classifiers_v1_classifiers_post`) on BOTH the documented `GET` and
 * `POST` entries, and per `lib/client.ts`'s module doc this action's method is
 * `POST`, matching that operationId rather than the (likely duplicated) `GET`.
 *
 * Measured live on 2026-09-06: this endpoint returned `500 INTERNAL_ERROR` for
 * a missing key, an invalid key, and a well-formed empty body alike — see
 * `lib/client.ts` for why that rules it out as a health probe. It is still
 * implemented here against the documented shape; a caller with a real,
 * working key may see different (or the same) behavior, and any error is
 * surfaced verbatim rather than hidden.
 */
const classifiersList: ActionDefinition<Record<string, never>> = {
  key: "classifiers-list",
  type: "read",
  resource: "classifier",
  title: "List Classifiers",
  description: "List all classifiers owned by the authenticated account.",
  params: [],
  output: [
    { key: "classifiers", type: "array", label: "Classifiers" },
  ],

  async execute(_input, ctx) {
    const client = new JinaClient(ctx);
    const classifiers = await client.request("/v1/classifiers", { method: "POST" });
    return { classifiers };
  },
};

export default classifiersList;
