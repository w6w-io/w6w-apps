import { assertEquals } from "@std/assert";
import action from "../../actions/operational-unit-get.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("operational-unit-get: GETs /resource/OperationalUnit/{id}", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { Id: 1, OperationalUnitName: "Chef" } }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({ id: 1 }, ctx);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/OperationalUnit/1`);
  assertEquals(out, { Id: 1, OperationalUnitName: "Chef" });
});
