import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: is a bearer method with apiKey/spaceId/environmentId fields", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "bearer");
  const apiKey = auth.fields?.find((f) => f.key === "apiKey");
  assert(apiKey, "must declare an `apiKey` field");
  assertEquals(apiKey.type, "secret");
  assertEquals(apiKey.required, true);

  const spaceId = auth.fields?.find((f) => f.key === "spaceId");
  assert(spaceId);
  assertEquals(spaceId.required, true);

  const env = auth.fields?.find((f) => f.key === "environmentId");
  assert(env);
  assertEquals(env.default, "master");
});

Deno.test("access-token: sign appends Bearer using credential.apiKey", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://cdn.contentful.com/spaces/x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { apiKey: "cda-token", spaceId: "x" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer cda-token");
});

Deno.test("access-token: test GETs /spaces/{spaceId} on CDN and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sys: { id: "sp1" } } }]);
  const result = await auth.test(
    { credential: { apiKey: "cda-token", spaceId: "sp1" } },
    ctx,
  );
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://cdn.contentful.com");
  assertEquals(url.pathname, "/spaces/sp1");
  assertEquals(calls[0].headers["authorization"], "Bearer cda-token");
});

Deno.test("access-token: test surfaces non-2xx as not-ok with the status code", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { sys: { id: "AccessTokenInvalid" } } }]);
  const result = await auth.test({ credential: { apiKey: "bad", spaceId: "sp1" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});

Deno.test("access-token: test rejects missing apiKey/spaceId without hitting the network", async () => {
  const { ctx, calls } = mockCtx();
  const noKey = await auth.test({ credential: { spaceId: "x" } }, ctx);
  assertEquals(noKey.ok, false);
  const noSpace = await auth.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(noSpace.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("access-token: afterConnect populates space + environment on display", async () => {
  const { ctx } = mockCtx([{ body: { sys: { id: "sp1" }, name: "My Space" } }]);
  const out = await auth.afterConnect!(
    { credential: { apiKey: "k", spaceId: "sp1", environmentId: "staging" } },
    ctx,
  );
  assertEquals(out, {
    space: { id: "sp1", name: "My Space" },
    environment: { id: "staging" },
  });
});

Deno.test("access-token: afterConnect defaults env to master when omitted", async () => {
  const { ctx } = mockCtx([{ body: { sys: { id: "sp1" }, name: "S" } }]);
  const out = await auth.afterConnect!(
    { credential: { apiKey: "k", spaceId: "sp1" } },
    ctx,
  );
  assertEquals((out.environment as { id: string }).id, "master");
});
