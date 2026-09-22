import { assert, assertEquals } from "@std/assert";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/client-list.ts";

Deno.test("client-list: GETs the organization's clients", async () => {
  const body = listEnvelope("clients", [{ id: 3, name: "Big Corp", project_ids: [1, 2] }]);
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({ organization_id: 13 }, ctx) as typeof body;

  assertEquals(pathOf(calls[0].url), "/v2/organizations/13/clients");
  assertEquals(result.clients[0].project_ids, [1, 2]);
});

Deno.test("client-list: status defaults to active, as the vendor's does", () => {
  const status = action.params!.find((p) => p.key === "status")!;
  assertEquals(status.default, "active");
  assert(status.hint!.includes("active"));
});

Deno.test("client-list: status=all and include=projects reach the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope("clients", []) }]);
  await action.execute!({ organization_id: 13, status: "all", include: "projects" }, ctx);
  assertEquals(queryOf(calls[0].url), { status: "all", include: "projects" });
});
