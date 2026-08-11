import { assertEquals, assertRejects } from "@std/assert";
import campaignSequenceAddContacts from "../../actions/campaign-sequence-add-contacts.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-sequence-add-contacts: POSTs to the colon-suffixed custom method", async () => {
  const { ctx, calls } = mockCtx([{ body: { add_to_sequence_results: { "1": "SUCCESS" } } }]);
  await campaignSequenceAddContacts.execute(
    { campaignId: "10", sequenceId: "20", contactIds: "1" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/campaigns/10/sequences/20:addContacts");
  assertEquals(JSON.parse(calls[0].body!), { contact_ids: ["1"] });
});

/**
 * The wrapper key is `add_to_sequence_results`, not the `results` that
 * `tags/{id}/contacts:applyTags` uses for the identical shape — and Keap's
 * automation equivalent names it `add_to_automation_sequence_results`.
 */
Deno.test("campaign-sequence-add-contacts: reads the endpoint's own wrapper key", async () => {
  const { ctx } = mockCtx([{
    body: {
      // The wrong key, present, to prove the right one is what is read.
      results: { "9": "SUCCESS" },
      add_to_sequence_results: { "1": "SUCCESS" },
    },
  }]);
  const out = await campaignSequenceAddContacts.execute(
    { campaignId: "10", sequenceId: "20", contactIds: "1,9" },
    ctx,
  ) as { added: string[] };
  assertEquals(out.added, ["1"]);
});

/**
 * `ALREADY_IN_SEQUENCE` is the outcome a re-run produces. Treating it as a
 * failure turns a safe retry into a false alarm.
 */
Deno.test("campaign-sequence-add-contacts: ALREADY_IN_SEQUENCE is its own bucket, not a failure", async () => {
  const { ctx } = mockCtx([{
    body: {
      add_to_sequence_results: {
        "1": "SUCCESS",
        "2": "ALREADY_IN_SEQUENCE",
        "3": "CONTACT_DOES_NOT_EXIST",
        "4": "FAILED",
      },
    },
  }]);
  const out = await campaignSequenceAddContacts.execute(
    { campaignId: "10", sequenceId: "20", contactIds: "1,2,3,4" },
    ctx,
  ) as { added: string[]; alreadyInSequence: string[]; failed: Record<string, string> };
  assertEquals(out.added, ["1"]);
  assertEquals(out.alreadyInSequence, ["2"]);
  assertEquals(out.failed, { "3": "CONTACT_DOES_NOT_EXIST", "4": "FAILED" });
});

Deno.test("campaign-sequence-add-contacts: an empty id list is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await campaignSequenceAddContacts.execute(
        { campaignId: "10", sequenceId: "20", contactIds: "" },
        ctx,
      ),
    Error,
    "At least one contact ID",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-sequence-add-contacts: is declared idempotent, which ALREADY_IN_SEQUENCE justifies", () => {
  assertEquals(campaignSequenceAddContacts.idempotent, true);
});
