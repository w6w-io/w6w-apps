import { assertEquals } from "@std/assert";
import legalEntityGet from "../../actions/legal-entity-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const ENTITY = {
  id: "le_1",
  displayName: "Brex Inc.",
  billingAddress: { line1: "1 Market St" },
  createdAt: "2021-04-01T00:00:00Z",
  status: "VERIFIED",
  isDefault: true,
};

Deno.test("legal-entity-get: GETs one legal entity by id", async () => {
  const { ctx, calls } = mockCtx([{ body: ENTITY }]);
  const result = await legalEntityGet.execute({ id: "le_1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/legal_entities/le_1");
  assertEquals(result, ENTITY);
});

Deno.test("legal-entity-get: the path uses the underscore Brex documents", async () => {
  const { ctx, calls } = mockCtx([{ body: ENTITY }]);
  await legalEntityGet.execute({ id: "le_1" }, ctx);

  // A hyphenated `/v2/legal-entities` is a different path and would 404.
  assertEquals(pathOf(calls[0].url).startsWith("/v2/legal_entities/"), true);
});

Deno.test("legal-entity-get: an unknown id surfaces Brex's error", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("NOT_FOUND", "Not Found", "LEGAL_ENTITY_NOT_FOUND") },
  ]);
  let message = "";
  try {
    await legalEntityGet.execute({ id: "nope" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("code LEGAL_ENTITY_NOT_FOUND"), true);
});
