import { assertEquals } from "@std/assert";
import legalEntityList from "../../actions/legal-entity-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

/** camelCase fields — the one response shape in this API that is not snake_case. */
const ENTITY = {
  id: "le_1",
  displayName: "Brex Inc.",
  billingAddress: { line1: "1 Market St", city: "San Francisco", country: "US" },
  createdAt: "2021-04-01T00:00:00Z",
  status: "VERIFIED",
  isDefault: true,
};

Deno.test("legal-entity-list: GETs the collection and paginates", async () => {
  const { ctx, calls } = mockCtx([{ body: page([ENTITY]) }]);
  await legalEntityList.execute({ limit: 10, cursor: "c1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/legal_entities");
  assertEquals(queryOf(calls[0].url), { limit: "10", cursor: "c1" });
});

Deno.test("legal-entity-list: camelCase field names are passed through verbatim", async () => {
  const { ctx } = mockCtx([{ body: page([ENTITY]) }]);
  const result = await legalEntityList.execute({}, ctx) as {
    items: Array<Record<string, unknown>>;
  };

  assertEquals(result.items[0].displayName, "Brex Inc.");
  assertEquals(result.items[0].isDefault, true);
  // Not normalized to `display_name` / `is_default`.
  assertEquals("display_name" in result.items[0], false);
});

/**
 * Brex documents no filter on this endpoint — only cursor and limit — so the
 * action must not offer one that would be silently ignored.
 */
Deno.test("legal-entity-list: no filter params are offered", () => {
  assertEquals(legalEntityList.params?.map((p) => p.key), ["limit", "cursor"]);
  assertEquals(legalEntityList.type, "search");
});
