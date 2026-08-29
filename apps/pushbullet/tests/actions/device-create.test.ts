import { assertEquals } from "@std/assert";
import deviceCreate from "../../actions/device-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("device-create: POSTs mapped fields to /v2/devices", async () => {
  const { ctx, calls } = mockCtx([{ body: { iden: "d1", nickname: "Workflow Device" } }]);
  const out = await deviceCreate.execute(
    { nickname: "Workflow Device", icon: "system", hasSms: false },
    ctx,
  ) as { iden: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/devices");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { nickname: "Workflow Device", icon: "system", has_sms: false });
  assertEquals(out.iden, "d1");
});

Deno.test("device-create: is declared non-idempotent — no server-side dedupe key", () => {
  assertEquals(deviceCreate.idempotent, false);
});
