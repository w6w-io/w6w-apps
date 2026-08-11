import type { ActionDefinition } from "@w6w/types";
import { encodeId, KeapClient, V2 } from "../lib/client.ts";
import { toIdList } from "../lib/params.ts";

/**
 * `POST /rest/v2/campaigns/{campaign_id}/sequences/{sequence_id}:addContacts`
 * — start contacts on a campaign sequence.
 *
 * ## The per-contact outcome is the point, and its map key is not
 * ## `results`
 *
 * The response is `{"add_to_sequence_results": {"<contact_id>": "<outcome>"}}`
 * with a closed vocabulary of `SUCCESS`, `ALREADY_IN_SEQUENCE`,
 * `CONTACT_DOES_NOT_EXIST` and `FAILED`. Note three separate things:
 *
 *  1. The wrapper key is `add_to_sequence_results`, not the `results` that the
 *     tag-apply endpoint uses for the identical shape.
 *  2. Keap's near-identical automation endpoint
 *     (`/automations/{id}/sequences/{id}:addContacts`) names it a *third* way:
 *     `add_to_automation_sequence_results`.
 *  3. `ALREADY_IN_SEQUENCE` is not a failure. It is the outcome a re-run
 *     produces, and treating it as one turns a safe retry into a false alarm —
 *     which is also why this action is marked idempotent.
 *
 * The `:addContacts` colon suffix is a literal path segment (Keap's v2 surface
 * uses Google-style custom methods) and must not be percent-encoded.
 */
interface Input {
  campaignId: string;
  sequenceId: string;
  contactIds: string;
}

const campaignSequenceAddContacts: ActionDefinition<Input> = {
  key: "campaign-sequence-add-contacts",
  type: "perform",
  title: "Add Contacts to Campaign Sequence",
  resource: "campaign",
  description:
    "Start a batch of contacts on a published campaign sequence, reporting the outcome per " +
    "contact.",
  // A contact already on the sequence comes back ALREADY_IN_SEQUENCE rather
  // than being started twice, so a retry is safe.
  idempotent: true,
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
    {
      key: "sequenceId",
      label: "Sequence ID",
      type: "string",
      required: true,
      hint: "From List Campaign Sequences. Only published sequences are addressable.",
    },
    {
      key: "contactIds",
      label: "Contact IDs",
      type: "string",
      required: true,
      placeholder: "123,456",
      hint: "Comma-separated.",
    },
  ],
  output: [
    { key: "added", type: "array", label: "Contact IDs started on the sequence" },
    { key: "alreadyInSequence", type: "array", label: "Contact IDs already on it" },
    { key: "failed", type: "object", label: "Contact ID to failure reason" },
    { key: "results", type: "object", label: "Raw per-contact results" },
  ],

  async execute(input, ctx) {
    const contactIds = toIdList(input.contactIds);
    if (contactIds.length === 0) throw new Error("At least one contact ID is required.");

    const client = new KeapClient(ctx);
    const body = await client.json<{ add_to_sequence_results?: Record<string, string> }>(
      `${V2}/campaigns/${encodeId(input.campaignId)}/sequences/${
        encodeId(input.sequenceId)
      }:addContacts`,
      { method: "POST", body: { contact_ids: contactIds } },
    );

    const results = body?.add_to_sequence_results ?? {};
    const added: string[] = [];
    const alreadyInSequence: string[] = [];
    const failed: Record<string, string> = {};
    for (const [contactId, outcome] of Object.entries(results)) {
      const value = String(outcome);
      if (value === "SUCCESS") added.push(contactId);
      else if (value === "ALREADY_IN_SEQUENCE") alreadyInSequence.push(contactId);
      else failed[contactId] = value;
    }

    ctx.log("info", "added contacts to sequence", {
      added: added.length,
      alreadyInSequence: alreadyInSequence.length,
      failed: Object.keys(failed).length,
    });
    return { added, alreadyInSequence, failed, results };
  },
};

export default campaignSequenceAddContacts;
