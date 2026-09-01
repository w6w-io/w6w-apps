import { assertEquals } from "@std/assert";
import orgRunningContainersList from "../../actions/org-running-containers-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("org-running-containers-list: calls GET /orgs/fetch-running-containers", async () => {
  const body = {
    containers: [{
      id: "c1",
      agentId: "1",
      createdAt: 1,
      retryNumber: 0,
      launchType: "manual",
      scriptSlug: "a.js",
    }],
  };
  const { ctx, calls } = mockCtx([{ status: 200, body }]);

  const out = await orgRunningContainersList.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/v2/orgs/fetch-running-containers");
  assertEquals(out, body);
});
