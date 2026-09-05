import { assert, assertEquals, assertRejects } from "@std/assert";
import { compact, DustClient, hostFor, regionOf, resolveContext } from "../../lib/client.ts";
import { mockCtxWithConnection } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("regionOf: only 'eu' resolves to eu, everything else defaults to us", () => {
  assertEquals(regionOf("eu"), "eu");
  assertEquals(regionOf("us"), "us");
  assertEquals(regionOf(undefined), "us");
  assertEquals(regionOf("bogus"), "us");
});

Deno.test("hostFor: resolves the two regional hosts", () => {
  assertEquals(hostFor("us"), "https://dust.tt");
  assertEquals(hostFor("eu"), "https://eu.dust.tt");
  assertEquals(hostFor(undefined), "https://dust.tt");
});

Deno.test("resolveContext: throws when the connection records no workspace id", () => {
  let threw = false;
  try {
    resolveContext({ display: {} } as never);
  } catch {
    threw = true;
  }
  assert(threw, "expected resolveContext to throw with no workspaceId");
});

Deno.test("resolveContext: reads workspace id + region from display", () => {
  const context = resolveContext({ display: { workspaceId: "ws_1", region: "eu" } } as never);
  assertEquals(context, { host: "https://eu.dust.tt", workspaceId: "ws_1" });
});

Deno.test("DustClient: buildUrl composes host, workspace id and compacted query", () => {
  const { ctx } = mockCtxWithConnection();
  const client = new DustClient(ctx);
  assertEquals(
    client.buildUrl("/spaces", { kinds: "system,global", empty: undefined }),
    `https://dust.tt/api/v1/w/${client.workspaceId}/spaces?kinds=system%2Cglobal`,
  );
});

Deno.test("DustClient.json: sends accept + parses a bare JSON object (no envelope)", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { spaces: [{ sId: "sp_1" }] } }]);
  const client = new DustClient(ctx);
  const result = await client.json<{ spaces: unknown[] }>("/spaces");

  assertEquals(result, { spaces: [{ sId: "sp_1" }] });
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(calls[0].method, "GET");
});

Deno.test("DustClient.json: POST sends a JSON body with content-type", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { conversation: { sId: "c1" } } }]);
  const client = new DustClient(ctx);
  await client.json("/assistant/conversations", { method: "POST", body: { title: "hi" } });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ title: "hi" }));
});

Deno.test("DustClient.json: a non-2xx response throws a message naming Dust's own error type", async () => {
  const { ctx } = mockCtxWithConnection([
    { status: 401, body: { error: { type: "invalid_api_key_error", message: "bad key" } } },
  ]);
  const client = new DustClient(ctx);

  await assertRejects(
    () => client.json("/spaces"),
    Error,
    "invalid_api_key_error",
  );
});
