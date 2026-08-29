import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-create.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: posts type/url and returns the id", async () => {
  const { ctx, calls } = mockCtx([{ body: { hooks: { id: "h1" } } }]);
  const out = await action.execute(
    { type: "new_comment", url: "https://hooks.example.com/cb", isTask: true },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/hooks");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.hooks.type, "new_comment");
  assertEquals(body.hooks.is_task, true);
  assertEquals(out, { id: "h1" });
});

Deno.test("webhook-create: exclusive-to-type fields are dropped for other types", async () => {
  const { ctx, calls } = mockCtx([{ body: { hooks: { id: "h2" } } }]);
  await action.execute(
    { type: "incoming_email", url: "https://x", isTask: true, fromEq: "a@b.com" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.hooks.is_task, undefined);
  assertEquals(body.hooks.from_eq, "a@b.com");
});

Deno.test("webhook-create: requires type and url", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ type: "" as never, url: "https://x" }, ctx));
  await assertActionRejects(() => action.execute({ type: "new_comment", url: "" }, ctx));
});
