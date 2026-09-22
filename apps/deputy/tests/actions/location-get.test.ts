import { assertEquals } from "@std/assert";
import action from "../../actions/location-get.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("location-get: GETs /resource/Company/{id}, not /my/location/{id}", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { Id: 1, CompanyName: "Simons Sambos" } }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({ id: 1 }, ctx);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Company/1`);
  assertEquals(out, { Id: 1, CompanyName: "Simons Sambos" });
});
