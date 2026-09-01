import { assertEquals } from "@std/assert";
import containerOutput from "../../actions/container-output.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("container-output: 200 returns found=true with the output text", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { output: "hello\n" } }]);

  const out = await containerOutput.execute({ id: "c1" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/v2/containers/fetch-output");
  assertEquals(queryOf(calls[0].url).id, "c1");
  assertEquals(out, { found: true, output: "hello\n" });
});

Deno.test("container-output: 204 (documented 'output is empty') returns found=true, output=undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await containerOutput.execute({ id: "c1" }, ctx) as Record<string, unknown>;
  assertEquals(out, { found: true, output: undefined });
});

Deno.test("container-output: 404 (documented 'no container exists') returns found=false, not a throw", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", error: "No container exists with the provided id." },
  }]);
  const out = await containerOutput.execute({ id: "does-not-exist" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(out, { found: false, output: undefined });
});

Deno.test("container-output: exposes no mode param (raw mode answers plain text, not JSON)", () => {
  const keys = containerOutput.params?.map((p) => p.key) ?? [];
  assertEquals(keys, ["id"]);
});
