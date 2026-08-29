import { assertEquals } from "@std/assert";
import deviceList from "../../actions/device-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("device-list: GETs /v2/devices with mapped query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { devices: [{ iden: "d1" }] } }]);
  const out = await deviceList.execute({ active: true, limit: 5 }, ctx) as { devices: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/devices");
  assertEquals(queryOf(calls[0].url), { active: "true", limit: "5" });
  assertEquals(out.devices.length, 1);
});

Deno.test("device-list: defaults to an empty array when the key is absent", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await deviceList.execute({}, ctx) as { devices: unknown[] };
  assertEquals(out.devices, []);
});
