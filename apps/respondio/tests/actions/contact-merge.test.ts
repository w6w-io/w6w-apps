import { assertEquals, assertRejects } from "@std/assert";
import contactMerge from "../../actions/contact-merge.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-merge: POSTs /contact/merge with the contactIds tuple", async () => {
  const { ctx, calls } = mockCtx([{ body: { contactId: 1 } }]);
  const out = await contactMerge.execute(
    { contactIdA: 1, contactIdB: 2, firstName: "Ada" },
    ctx,
  ) as { contactId: number };

  assertEquals(pathOf(calls[0].url), "/v2/contact/merge");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.contactIds, [1, 2]);
  assertEquals(body.firstName, "Ada");
  assertEquals(out.contactId, 1);
});

Deno.test("contact-merge: refuses identical ids before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contactMerge.execute({ contactIdA: 1, contactIdB: 1 }, ctx),
    Error,
    "must be different",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-merge: is not idempotent — one of the two ids stops existing after the first call", () => {
  assertEquals(contactMerge.idempotent, false);
});
