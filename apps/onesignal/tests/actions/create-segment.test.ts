import { assertEquals } from "@std/assert";
import createSegment from "../../actions/create-segment.ts";
import { APP_ID, mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("create-segment: parses filters JSON and posts name + filters", async () => {
  const { ctx, calls } = mockCtxWithConnection([
    { status: 201, body: { id: "seg-1", success: true } },
  ]);
  const out = await createSegment.execute(
    { name: "VIPs", filters: '[{"field":"tag","key":"vip","relation":"=","value":"true"}]' },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), `/apps/${APP_ID}/segments`);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "VIPs");
  assertEquals(body.filters, [{ field: "tag", key: "vip", relation: "=", value: "true" }]);
  assertEquals(out, { id: "seg-1", success: true });
});
