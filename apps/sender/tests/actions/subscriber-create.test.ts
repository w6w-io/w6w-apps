import { assertEquals } from "@std/assert";
import subscriberCreate from "../../actions/subscriber-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-create: POSTs to /v2/subscribers with a compact body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "o1", email: "a@b.com" } } }]);
  const out = await subscriberCreate.execute({ email: "a@b.com" }, ctx) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/subscribers");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com" });
  assertEquals(out.id, "o1");
});

Deno.test("subscriber-create: fields is parsed from a JSON string param", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "o1" } } }]);
  await subscriberCreate.execute(
    { email: "a@b.com", fields: '{"{$test_num}": 8}', triggerAutomation: false },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.fields, { "{$test_num}": 8 });
  assertEquals(body.trigger_automation, false);
});
