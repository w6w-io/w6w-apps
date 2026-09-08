import { assertEquals } from "@std/assert";
import foldersList from "../../actions/folders-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("folders-list: GETs /v3/enterprise/collections with includeArchived", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "f1", label: "*CTI Vendor Reports" }] }]);
  const out = await foldersList.execute({ includeArchived: true }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/enterprise/collections");
  assertEquals(queryOf(calls[0].url), { includeArchived: "true" });
  assertEquals(out, { folders: [{ id: "f1", label: "*CTI Vendor Reports" }] });
});

Deno.test("folders-list: omits includeArchived from the query when left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await foldersList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
