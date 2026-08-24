import { assert, assertEquals } from "@std/assert";
import { fieldsParam, idParam, paginationParams, refParam } from "../../lib/params.ts";

Deno.test("fieldsParam: carries a non-trivial default, never Clio's own near-empty one", () => {
  const p = fieldsParam("id,etag,name");
  assertEquals(p.key, "fields");
  assertEquals(p.default, "id,etag,name");
  assert((p.hint ?? "").includes("id,etag"), p.hint);
});

Deno.test("fieldsParam: an extra hint is appended, not dropped", () => {
  const p = fieldsParam("id", "Extra detail.");
  assert((p.hint ?? "").includes("Extra detail."), p.hint);
});

Deno.test("paginationParams: limit caps at 200, Clio's own per-request ceiling", () => {
  const [limit] = paginationParams(50);
  assertEquals(limit.key, "limit");
  assertEquals(limit.default, 50);
  assertEquals(limit.validation?.max, 200);
});

Deno.test("paginationParams: the second param is a page token, not a raw URL", () => {
  const [, pageToken] = paginationParams();
  assertEquals(pageToken.key, "pageToken");
  assertEquals(pageToken.type, "string");
});

Deno.test("idParam: required, numeric, integer-validated", () => {
  const p = idParam("Matter ID");
  assertEquals(p.key, "id");
  assertEquals(p.required, true);
  assertEquals(p.type, "number");
  assertEquals(p.validation?.integer, true);
});

Deno.test("refParam: optional by default, integer-validated", () => {
  const p = refParam("clientId", "Client ID");
  assertEquals(p.key, "clientId");
  assertEquals(p.required, undefined);
  assertEquals(p.validation?.integer, true);
});
