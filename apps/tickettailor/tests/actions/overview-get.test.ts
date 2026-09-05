import { assertEquals } from "@std/assert";
import overviewGet from "../../actions/overview-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("overview-get: hits GET /overview", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { box_office_name: "Acme", revenue: 100 },
  }]);
  const result = await overviewGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/overview");
  assertEquals(result, { box_office_name: "Acme", revenue: 100 });
});
