import type { ActionDefinition } from "@w6w/types";
import { encodeId, KeapClient, V2 } from "../lib/client.ts";
import { toIdList } from "../lib/params.ts";

/**
 * `POST /rest/v2/tags/{tag_id}/contacts:applyTags` — Apply a tag to contacts.
 *
 * ## The result is per-contact, and a 200 does not mean every contact was tagged
 *
 * The response is `ApplyTagsResponse` — `{"results": {"<contact_id>": "<outcome>"}}`,
 * a map keyed by contact id. A batch where one id does not exist still returns
 * 200; the failure is a value inside the map. This action therefore splits the
 * map into `applied` and `failed` rather than handing back a bag a caller has
 * to inspect to discover half the work did not happen.
 *
 * The `:applyTags` suffix is not a typo. Keap's v2 surface uses the Google-API
 * custom-method convention — a colon-suffixed verb on a collection — for
 * anything that is not plain CRUD (`contacts:merge`, `emails:send`,
 * `products/{id}:adjustInventory`). The colon is a literal path character and
 * must not be percent-encoded.
 */
interface Input {
  tagId: string;
  contactIds: string;
}

const tagApply: ActionDefinition<Input> = {
  key: "tag-apply",
  type: "perform",
  title: "Apply Tag to Contacts",
  resource: "tag",
  description: "Apply one tag to up to a batch of contacts, reporting the outcome per contact.",
  // Applying a tag a contact already has is a no-op on Keap's side, so a retry
  // changes nothing.
  idempotent: true,
  params: [
    { key: "tagId", label: "Tag ID", type: "string", required: true },
    {
      key: "contactIds",
      label: "Contact IDs",
      type: "string",
      required: true,
      placeholder: "123,456",
      hint: "Comma-separated. Keap wants them as strings even though every id is numeric.",
    },
  ],
  output: [
    { key: "applied", type: "array", label: "Contact IDs tagged" },
    { key: "failed", type: "object", label: "Contact ID to failure reason" },
    { key: "results", type: "object", label: "Raw per-contact results" },
  ],

  async execute(input, ctx) {
    const contactIds = toIdList(input.contactIds);
    if (contactIds.length === 0) throw new Error("At least one contact ID is required.");

    const client = new KeapClient(ctx);
    const body = await client.json<{ results?: Record<string, string> }>(
      `${V2}/tags/${encodeId(input.tagId)}/contacts:applyTags`,
      { method: "POST", body: { contact_ids: contactIds } },
    );

    const results = body?.results ?? {};
    const applied: string[] = [];
    const failed: Record<string, string> = {};
    for (const [contactId, outcome] of Object.entries(results)) {
      // Keap does not publish an enum for this map's values, so the test is
      // "did it say success?" rather than a list of failure words that would
      // silently classify an unseen one as a pass.
      if (/success/i.test(String(outcome))) applied.push(contactId);
      else failed[contactId] = String(outcome);
    }

    ctx.log("info", "applied tag", { applied: applied.length, failed: Object.keys(failed).length });
    return { applied, failed, results };
  },
};

export default tagApply;
