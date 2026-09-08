import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-update.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("lead-update: sends only the provided fields with the id", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: true, time: {} } },
  ], { display });

  const out = await action.execute({ id: 7, statusId: "IN_PROCESS" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.id, 7);
  assertEquals(body.fields, { STATUS_ID: "IN_PROCESS" });
  assertEquals(out, { id: 7, updated: true });
});

Deno.test("lead-update: rejects when no field to change is given", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ id: 7 }, ctx);
  });
  assertEquals(calls.length, 0);
});

Deno.test("lead-update: rejects a non-numeric id before any network call", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ id: NaN, title: "x" }, ctx);
  });
  assertEquals(calls.length, 0);
});
