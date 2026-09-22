import { assertEquals } from "@std/assert";
import action from "../../actions/location-list.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("location-list: GETs /resource/Company (the UI's Location, the API's Company)", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: [{ Id: 1, CompanyName: "Simons Sambos" }] }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Company`);
  assertEquals(out, { items: [{ Id: 1, CompanyName: "Simons Sambos" }], count: 1 });
});
