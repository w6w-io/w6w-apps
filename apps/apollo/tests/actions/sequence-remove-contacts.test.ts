import { assertEquals } from "@std/assert";
import sequenceRemoveContacts from "../../actions/sequence-remove-contacts.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("sequence-remove-contacts: POSTs to remove_or_stop_contact_ids with array query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [{ id: "c1" }], num_contacts: 1 } }]);
  const out = await sequenceRemoveContacts.execute(
    { emailer_campaign_ids: "seq1,seq2", contact_ids: "c1", mode: "remove" },
    ctx,
  ) as { contacts: unknown[]; num_contacts: number };

  assertEquals(pathOf(calls[0].url), "/api/v1/emailer_campaigns/remove_or_stop_contact_ids");
  assertEquals(queryAllOf(calls[0].url, "emailer_campaign_ids[]"), ["seq1", "seq2"]);
  assertEquals(queryOf(calls[0].url).mode, "remove");
  assertEquals(out.num_contacts, 1);
});

Deno.test("sequence-remove-contacts: idempotent", () => {
  assertEquals(sequenceRemoveContacts.idempotent, true);
});
