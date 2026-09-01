import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/business-unit-get-profile.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("business-unit-get-profile: builds the profileinfo URL and returns the body", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        companyName: "Trustpilot",
        email: "john@trustpilot.com",
        isClaimed: true,
        address: { city: "Copenhagen" },
      },
    },
  ]);

  const out = await action.execute({ businessUnitId: "4bf2b69100006400050ce5ee" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/business-units/4bf2b69100006400050ce5ee/profileinfo");
  assertEquals(out.companyName, "Trustpilot");
  assertEquals(out.isClaimed, true);
});

Deno.test("business-unit-get-profile: URL-encodes the business unit id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ businessUnitId: "weird id/with slash" }, ctx);
  assertEquals(
    pathOf(calls[0].url),
    "/v1/business-units/weird%20id%2Fwith%20slash/profileinfo",
  );
});

Deno.test("business-unit-get-profile: surfaces a 404 with Trustpilot's documented hint", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  await assertRejects(
    async () => await action.execute({ businessUnitId: "does-not-exist" }, ctx),
    Error,
    "404",
  );
});
