import { assertEquals } from "@std/assert";
import webhookUpdate from "../../actions/webhook-update.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-update: PATCH /webhooks/{uid}, resends name and url", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "w1", name: "Hook 2" } }]);
  await webhookUpdate.execute(
    { uid: "w1", name: "Hook 2", url: "https://example.com/hooks/bb", status: "disabled" },
    ctx,
  );

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/webhooks/w1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Hook 2");
  assertEquals(body.status, "disabled");
});

Deno.test("webhook-update: requires uid, name and url", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => webhookUpdate.execute({ uid: "", name: "n", url: "u" }, ctx));
  await assertRejects(() => webhookUpdate.execute({ uid: "w1", name: "", url: "u" }, ctx));
  await assertRejects(() => webhookUpdate.execute({ uid: "w1", name: "n", url: "" }, ctx));
});
