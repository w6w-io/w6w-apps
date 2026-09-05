import { assert, assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: sign() stamps the bearer header, nothing else", async () => {
  const request: SignableRequest = {
    url: "https://rest.iad-01.braze.com/campaigns/list",
    method: "GET",
    headers: {},
  };
  const out = await auth.sign!({ request, credential: { apiKey: "secret-key" } }, {} as never);
  assertEquals(out.headers["authorization"], "Bearer secret-key");
});

Deno.test("api-key: test() succeeds against the chosen instance's content_blocks/list", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { content_blocks: [] } }]);
  const result = await auth.test(
    { credential: { apiKey: "secret-key", instance: "fra-01" } },
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(new URL(calls[0].url).host, "rest.fra-01.braze.eu");
  assertEquals(new URL(calls[0].url).pathname, "/content_blocks/list");
  assertEquals(calls[0].headers["authorization"], "Bearer secret-key");
});

Deno.test("api-key: test() reports a 401 distinctly from a 403", async () => {
  const { ctx: unauthCtx } = mockCtx([
    { status: 401, body: { message: "Invalid API key", errors: ["invalid_api_key"] } },
  ]);
  const unauth = await auth.test({ credential: { apiKey: "bad", instance: "iad-01" } }, unauthCtx);
  assertEquals(unauth.ok, false);
  assert(unauth.message?.includes("401"), unauth.message);
  assert(unauth.message?.includes("Invalid API key"), unauth.message);

  const { ctx: forbiddenCtx } = mockCtx([
    { status: 403, body: { message: "not permitted" } },
  ]);
  const forbidden = await auth.test(
    { credential: { apiKey: "ok", instance: "iad-01" } },
    forbiddenCtx,
  );
  assertEquals(forbidden.ok, false);
  assert(forbidden.message?.includes("403"), forbidden.message);
  assert(forbidden.message?.includes("valid but lacks"), forbidden.message);
});

Deno.test("api-key: test() fails closed when the credential has no apiKey", async () => {
  const { ctx } = mockCtx([]);
  const result = await auth.test({ credential: { instance: "iad-01" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("api-key: afterConnect() projects the instance for later resolution", async () => {
  const display = await auth.afterConnect!({ credential: { apiKey: "x", instance: "iad-03" } }, {
    fetch: () => {
      throw new Error("afterConnect must not need the network here");
    },
    log: () => {},
  } as never);
  assertEquals(display, { instance: "iad-03" });
});

Deno.test("api-key: afterConnect() falls back to the default instance when unset", async () => {
  const display = await auth.afterConnect!({ credential: { apiKey: "x" } }, {
    fetch: () => {
      throw new Error("unused");
    },
    log: () => {},
  } as never);
  assertEquals(display, { instance: "iad-01" });
});
