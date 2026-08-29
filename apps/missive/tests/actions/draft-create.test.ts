import { assertEquals } from "@std/assert";
import action from "../../actions/draft-create.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("draft-create: posts subject/body/from/to and returns the response verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { drafts: { id: "d1" } } }]);
  const out = await action.execute(
    {
      subject: "Hello",
      body: "World",
      fromField: '{"address":"me@acme.com"}',
      toFields: '[{"address":"you@acme.com"}]',
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/drafts");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.drafts.subject, "Hello");
  assertEquals(body.drafts.from_field, { address: "me@acme.com" });
  assertEquals(body.drafts.to_fields, [{ address: "you@acme.com" }]);
  assertEquals(out, { drafts: { id: "d1" } });
});

Deno.test("draft-create: send:true is passed through explicitly", async () => {
  const { ctx, calls } = mockCtx([{ body: { drafts: {} } }]);
  await action.execute({ body: "hi", send: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.drafts.send, true);
});

Deno.test("draft-create: rejects send combined with sendAt", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ send: true, sendAt: 123 }, ctx));
});

Deno.test("draft-create: builds routing fields (references, shared labels)", async () => {
  const { ctx, calls } = mockCtx([{ body: { drafts: {} } }]);
  await action.execute({ references: "<a@a.com>, b@b.com", addSharedLabels: "l1,l2" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.drafts.references, ["<a@a.com>", "b@b.com"]);
  assertEquals(body.drafts.add_shared_labels, ["l1", "l2"]);
});
