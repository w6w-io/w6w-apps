import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deal-update.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("deal-update: sends only the provided fields with the id", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: true, time: {} } },
  ], { display });

  const out = await action.execute({ id: 21, stageId: "WON" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.id, 21);
  assertEquals(body.fields, { STAGE_ID: "WON" });
  assertEquals(out, { id: 21, updated: true });
});

Deno.test("deal-update: rejects when no field to change is given", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ id: 21 }, ctx);
  });
  assertEquals(calls.length, 0);
});
