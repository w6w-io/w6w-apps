import { assertEquals } from "@std/assert";
import verifyServiceList from "../../actions/verify-service-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("verify-service-list: GETs /api/v2/verify/services with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: { services: [], meta: {} } }]);
  await verifyServiceList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/verify/services");
});
