import { assertEquals } from "@std/assert";
import action from "../../actions/response-create.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("response-create: posts a single-element responses array", async () => {
  const { ctx, calls } = mockCtx([{ body: { responses: [{ id: "r1", title: "Welcome" }] } }]);
  const out = await action.execute(
    { title: "Welcome", organization: "org-1", body: "<p>Hi</p>" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/responses");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.responses.length, 1);
  assertEquals(body.responses[0].organization, "org-1");
  assertEquals(out, { id: "r1", title: "Welcome" });
});

Deno.test("response-create: requires exactly one of organization/user", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ title: "x" }, ctx));
  await assertActionRejects(() =>
    action.execute({ title: "x", organization: "o1", user: "u1" }, ctx)
  );
});

Deno.test("response-create: externalId requires externalSource and vice versa", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ organization: "o1", externalId: "e1" }, ctx));
});
