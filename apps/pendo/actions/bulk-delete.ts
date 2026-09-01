import type { ActionDefinition } from "@w6w/types";
import { json, PendoClient } from "../lib/client.ts";

/**
 * `POST /api/v1/bulkdelete/visitor` / `POST /api/v1/bulkdelete/account` —
 * file a GDPR/CCPA erasure request.
 *
 * This is irreversible and asynchronous: Pendo returns a job id immediately,
 * not confirmation that the data is gone. A second, explicit input is
 * required so a workflow cannot fire this by wiring the wrong upstream
 * value into `ids`.
 */
const action: ActionDefinition = {
  key: "bulk-delete",
  type: "perform",
  resource: "bulk-deletion",
  title: "Bulk Delete Visitors or Accounts",
  description: "File a GDPR/CCPA bulk-deletion request for a set of visitor or account ids. " +
    "IRREVERSIBLE and asynchronous — Pendo returns a job id, not a confirmation the data " +
    "is gone; poll `GET /api/v1/bulkdelete/:id` in the Pendo UI or API to check status.",
  idempotent: false,
  params: [
    {
      key: "kind",
      label: "Kind",
      type: "select",
      required: true,
      options: [
        { value: "visitor", label: "Visitors" },
        { value: "account", label: "Accounts" },
      ],
    },
    {
      key: "ids",
      label: "IDs",
      type: "json",
      required: true,
      hint: 'A JSON array of visitor or account ids, e.g. ["visitor-1","visitor-2"].',
    },
    {
      key: "confirmPermanentDeletion",
      label: "I understand this is permanent and cannot be undone",
      type: "boolean",
      required: true,
      default: false,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Deletion job id" },
    { key: "requested", type: "number", label: "IDs submitted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (p.kind !== "visitor" && p.kind !== "account") {
      throw new Error('`kind` must be "visitor" or "account"');
    }
    if (p.confirmPermanentDeletion !== true) {
      throw new Error(
        "refusing to run: `confirmPermanentDeletion` must be explicitly set to true. Bulk " +
          "deletion is permanent and cannot be undone",
      );
    }
    const ids = json(p.ids, "ids");
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("`ids` must be a non-empty JSON array");
    }

    const client = new PendoClient(ctx);
    const key = p.kind === "visitor" ? "visitors" : "accounts";
    const response = await client.api<{ id?: string }>(`/api/v1/bulkdelete/${p.kind}`, {
      method: "POST",
      body: { [key]: ids },
    });

    ctx.log("warn", "filed a Pendo bulk-deletion request", { kind: p.kind, count: ids.length });
    return { id: response?.id, requested: ids.length };
  },
};

export default action;
