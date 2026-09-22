import { assertEquals } from "@std/assert";
import action from "../../actions/operational-unit-list.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("operational-unit-list: GETs /resource/OperationalUnit", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: [{ Id: 1, OperationalUnitName: "Chef" }] }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/OperationalUnit`);
  assertEquals(out, { items: [{ Id: 1, OperationalUnitName: "Chef" }], count: 1 });
});
