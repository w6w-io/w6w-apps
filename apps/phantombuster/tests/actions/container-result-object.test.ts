import { assertEquals } from "@std/assert";
import containerResultObject from "../../actions/container-result-object.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("container-result-object: 200 returns found=true with the raw string", async () => {
  const raw = JSON.stringify({ leads: 12 });
  const { ctx, calls } = mockCtx([{ status: 200, body: { resultObject: raw } }]);

  const out = await containerResultObject.execute({ id: "c1" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/v2/containers/fetch-result-object");
  assertEquals(queryOf(calls[0].url).id, "c1");
  assertEquals(out, { found: true, resultObject: raw });
});

Deno.test("container-result-object: 404 returns found=false rather than throwing", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", error: "No container exists with the provided id." },
  }]);
  const out = await containerResultObject.execute({ id: "does-not-exist" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(out, { found: false, resultObject: undefined });
});

Deno.test("container-result-object: a null resultObject is reported as undefined, not the string 'null'", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { resultObject: null } }]);
  const out = await containerResultObject.execute({ id: "c1" }, ctx) as Record<string, unknown>;
  assertEquals(out.resultObject, undefined);
});
