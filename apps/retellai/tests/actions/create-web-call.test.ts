import { assertEquals } from "@std/assert";
import createWebCall from "../../actions/create-web-call.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-web-call: posts to /v2/create-web-call and returns the access token", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { call_id: "c1", agent_id: "a1", call_status: "registered", access_token: "tok_abc" },
  }]);

  const out = await createWebCall.execute({ agentId: "a1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/create-web-call");
  assertEquals(JSON.parse(calls[0].body!), { agent_id: "a1" });
  assertEquals(out.access_token, "tok_abc");
});

Deno.test("create-web-call: a tag or 'latest_published' passes through agent_version untouched", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { call_id: "c1" } }]);
  await createWebCall.execute({ agentId: "a1", agentVersion: "latest_published" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).agent_version, "latest_published");
});

Deno.test("create-web-call: is not idempotent — each call starts a new session", () => {
  assertEquals(createWebCall.idempotent, false);
});
