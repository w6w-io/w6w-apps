import { assertEquals } from "@std/assert";
import pod from "../../health/pod.ts";
import { mockCtx, mockInsightlyCtx } from "../_helpers.ts";

Deno.test("pod: is an unsigned, connection-scoped dependency check", () => {
  assertEquals(pod.kind, "dependency");
  assertEquals(pod.scope, "connection");
  assertEquals(pod.credential, "context");
  assertEquals(pod.network, undefined);
});

Deno.test("pod: unknown when the connection records no pod", async () => {
  const { ctx } = mockCtx();
  const r = await pod.check!({}, ctx);
  assertEquals(r.state, "unknown");
});

Deno.test("pod: a 401 passes — it proves the pod is serving", async () => {
  const { ctx, calls } = mockInsightlyCtx([{
    status: 401,
    body: { Message: "Authorization has been denied for this request." },
  }], "na1");
  const r = await pod.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Users/Me");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("pod: a 5xx is down", async () => {
  const { ctx } = mockInsightlyCtx([{ status: 502, body: "" }]);
  assertEquals((await pod.check!({}, ctx)).state, "down");
});

Deno.test("pod: a thrown fetch error (DNS failure) is down, naming the pod", async () => {
  const { ctx } = mockInsightlyCtx([], "totallyfakepod123");
  const r = await pod.check!({}, ctx);
  assertEquals(r.state, "down");
  assertEquals(r.message?.includes("totallyfakepod123"), true);
});
