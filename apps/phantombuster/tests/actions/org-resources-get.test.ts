import { assertEquals } from "@std/assert";
import orgResourcesGet from "../../actions/org-resources-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("org-resources-get: calls GET /orgs/fetch-resources and returns the body verbatim", async () => {
  const resources = { dailyExecutionTime: 1000, plan: { dailyExecutionTime: 3600 } };
  const { ctx, calls } = mockCtx([{ status: 200, body: resources }]);

  const out = await orgResourcesGet.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/v2/orgs/fetch-resources");
  assertEquals(out.resources, resources);
});

Deno.test("org-resources-get: takes no params", () => {
  assertEquals(orgResourcesGet.params, []);
});
