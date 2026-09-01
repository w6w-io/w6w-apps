import type { ActionDefinition } from "@w6w/types";
import { asJson, compact, ReplyClient } from "../lib/client.ts";
import { sequenceIdParam } from "../lib/params.ts";

/**
 * `POST /v3/sequences/{id}/contact-links/bulk` — enroll contacts in a
 * sequence, up to 10,000 ids per call. Requires `sequences:operate`.
 *
 * Not marked idempotent: the response's own shape (`added` vs `notProcessed`)
 * means a partial success is a normal, expected outcome rather than an
 * all-or-nothing call — retrying blindly could re-attempt ids that were
 * already reported in `notProcessed` for a reason that won't change (e.g.
 * already enrolled and `removeFromExisting` was not set).
 */
interface Input {
  id: number;
  contactIds: unknown;
  removeFromExisting?: boolean;
  startStepId?: number;
  ignoreStepDelay?: boolean;
}

interface Output {
  added: number[];
  notProcessed?: Record<string, unknown>;
}

const sequenceContactsAdd: ActionDefinition<Input, Output> = {
  key: "sequence-contacts-add",
  type: "perform",
  resource: "sequence",
  title: "Add Contacts to Sequence",
  description: "Enroll one or more contacts in a sequence, up to 10,000 ids per call.",
  idempotent: false,
  params: [
    sequenceIdParam,
    {
      key: "contactIds",
      label: "Contact IDs",
      type: "json",
      required: true,
      hint: "Array of contact ids, e.g. [123, 456].",
    },
    {
      key: "removeFromExisting",
      label: "Remove from existing sequences first",
      type: "boolean",
      hint:
        "Pull each contact out of the sequence(s) it is currently enrolled in before adding it here.",
    },
    { key: "startStepId", label: "Start at step ID", type: "number" },
    { key: "ignoreStepDelay", label: "Ignore step delay", type: "boolean" },
  ],
  output: [
    { key: "added", type: "array", label: "Contact IDs successfully enrolled" },
    { key: "notProcessed", type: "object", label: "Contact IDs that were not enrolled, with why" },
  ],

  execute(input, ctx) {
    const body = compact({
      contactIds: asJson(input.contactIds, "Contact IDs"),
      removeFromExisting: input.removeFromExisting,
      startStepId: input.startStepId,
      ignoreStepDelay: input.ignoreStepDelay,
    });
    return new ReplyClient(ctx).json<Output>(`/sequences/${input.id}/contact-links/bulk`, {
      method: "POST",
      body,
    });
  },
};

export default sequenceContactsAdd;
