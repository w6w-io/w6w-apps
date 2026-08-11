import { assert, assertEquals, assertThrows } from "@std/assert";
import listOffices from "../../actions/list-offices.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-offices: calls GET /v3/offices", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1 }])]);
  await listOffices.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/offices");
});

Deno.test("list-offices: maps the parent and external-id filters", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listOffices.execute({ parentId: 2, externalId: "OFF-1" }, ctx);
  assertEquals(queryOf(calls[0].url), { parent_id: "2", external_id: "OFF-1" });
});

Deno.test("list-offices: shares the department filter shape, as the API does", () => {
  const keys = (listOffices.params ?? []).map((p) => p.key);
  assert(keys.includes("parentId"));
  assert(keys.includes("externalId"));
});

Deno.test("list-offices: a cursor rejects the external id it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(
    () => listOffices.execute({ cursor: "N", externalId: "OFF-1" }, ctx),
    Error,
  );
  assert(err.message.includes("external_id"), err.message);
});
