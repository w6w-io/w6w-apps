import { assertEquals } from "@std/assert";
import clipList from "../../actions/clip-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("clip-list: mode=project queries findByProjectId", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "P1.C1", curationId: "C1" }] }]);
  const out = await clipList.execute({ mode: "project", projectId: "P1" }, ctx) as {
    items: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/api/exportable-clips");
  assertEquals(queryOf(calls[0].url), { q: "findByProjectId", projectId: "P1" });
  assertEquals(out.items.length, 1);
});

Deno.test("clip-list: mode=collection queries findByCollectionId", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await clipList.execute({ mode: "collection", collectionId: "col1" }, ctx);
  assertEquals(queryOf(calls[0].url), { q: "findByCollectionId", collectionId: "col1" });
});

Deno.test("clip-list: sends x-opus-org-id only when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }, { status: 200, body: [] }]);
  await clipList.execute({ mode: "project", projectId: "P1", orgId: "org_1" }, ctx);
  assertEquals(calls[0].headers["x-opus-org-id"], "org_1");

  await clipList.execute({ mode: "project", projectId: "P1" }, ctx);
  assertEquals(calls[1].headers["x-opus-org-id"], undefined);
});
