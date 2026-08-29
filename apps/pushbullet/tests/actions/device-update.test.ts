import { assertEquals } from "@std/assert";
import deviceUpdate from "../../actions/device-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("device-update: POSTs to /v2/devices/{iden}", async () => {
  const { ctx, calls } = mockCtx([{ body: { iden: "d1", nickname: "Work Phone" } }]);
  const out = await deviceUpdate.execute({ iden: "d1", nickname: "Work Phone" }, ctx) as {
    nickname: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/devices/d1");
  assertEquals(JSON.parse(calls[0].body!), { nickname: "Work Phone" });
  assertEquals(out.nickname, "Work Phone");
});

Deno.test("device-update: is declared idempotent", () => {
  assertEquals(deviceUpdate.idempotent, true);
});
