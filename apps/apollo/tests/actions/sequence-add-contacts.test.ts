import { assertEquals } from "@std/assert";
import sequenceAddContacts from "../../actions/sequence-add-contacts.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("sequence-add-contacts: fills emailer_campaign_id from the path param automatically", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [{ id: "c1" }], skipped_contact_ids: [] } }]);
  const out = await sequenceAddContacts.execute(
    { sequence_id: "seq1", contact_ids: "c1,c2", send_email_from_email_account_id: "ea1" },
    ctx,
  ) as { contacts: unknown[]; skipped_contact_ids: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v1/emailer_campaigns/seq1/add_contact_ids");
  assertEquals(queryOf(calls[0].url).emailer_campaign_id, "seq1");
  assertEquals(queryAllOf(calls[0].url, "contact_ids[]"), ["c1", "c2"]);
  assertEquals(queryOf(calls[0].url).send_email_from_email_account_id, "ea1");
  assertEquals(out.contacts.length, 1);
  assertEquals(out.skipped_contact_ids, []);
});
