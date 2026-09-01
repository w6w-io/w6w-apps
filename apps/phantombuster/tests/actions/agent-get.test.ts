import { assert, assertEquals, assertFalse } from "@std/assert";
import agentGet from "../../actions/agent-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const AGENT = {
  id: "42",
  name: "LinkedIn Profile Scraper",
  argument: '{"sessionCookie":"AQE...redacted"}',
  proxyType: "buster-residential",
  proxyAddress: "1.2.3.4",
  proxyUsername: "u",
  proxyPassword: "super-secret-proxy-password",
};

Deno.test("agent-get: calls GET /agents/fetch with id and strips proxyPassword", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: AGENT }]);

  const out = await agentGet.execute({ id: "42" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/fetch");
  assertEquals(queryOf(calls[0].url).id, "42");
  assertFalse("proxyPassword" in (out.agent as Record<string, unknown>));
  assertEquals((out.agent as Record<string, unknown>).id, "42");
});

Deno.test("agent-get: does not touch the opaque argument field", async () => {
  const { ctx } = mockCtx([{ status: 200, body: AGENT }]);
  const out = await agentGet.execute({ id: "42" }, ctx) as Record<string, unknown>;
  assertEquals((out.agent as Record<string, unknown>).argument, AGENT.argument);
});

Deno.test("agent-get: withManifest is opt-in and forwarded only when true", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: AGENT }, { status: 200, body: AGENT }]);

  await agentGet.execute({ id: "42" }, ctx);
  assert(!("withManifest" in queryOf(calls[0].url)));

  await agentGet.execute({ id: "42", withManifest: true }, ctx);
  assertEquals(queryOf(calls[1].url).withManifest, "true");
});

Deno.test("agent-get: never requests withAgentObject or withCode", () => {
  const keys = agentGet.params?.map((p) => p.key) ?? [];
  assertFalse(keys.includes("withAgentObject"));
  assertFalse(keys.includes("withCode"));
});
