import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-create.ts";

Deno.test("webhook-create: sends the URL and numeric trigger", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "wh_1", trigger: 0 } }]);
  await action.execute!({ url: "https://example.com/hook", trigger: "0" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://example.com/hook",
    trigger: 0,
  });
});

Deno.test("webhook-create: url and trigger are required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ trigger: "0" }, ctx),
    Error,
    "url",
  );
  await assertRejects(
    async () => await action.execute!({ url: "https://example.com" }, ctx),
    Error,
    "trigger",
  );
  assertEquals(calls.length, 0);
});

Deno.test("webhook-create: offers every documented trigger as a select option", () => {
  const trigger = (action.params as Array<{ key: string; options?: unknown[] }>).find((p) =>
    p.key === "trigger"
  )!;
  // 31 numbered triggers minus the two undocumented ids (11, 21).
  assertEquals(trigger.options!.length, 29);
});
