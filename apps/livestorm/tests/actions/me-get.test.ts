import { assertEquals } from "@std/assert";
import meGet from "../../actions/me-get.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("me-get: calls GET /me and returns data verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: single("organizations", "org1", { name: "Acme" }) }]);
  const result = await meGet.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/me");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: "org1", type: "organizations", attributes: { name: "Acme" } });
});
