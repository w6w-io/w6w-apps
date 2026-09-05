import { assert, assertEquals } from "@std/assert";
import { classifyAuthFailure, formatError, PlanningCenterClient } from "../../lib/client.ts";
import { collection, errorBody, mockCtx, pathOf, queryOf, single } from "../_helpers.ts";

Deno.test("get: builds the product-scoped URL and unwraps the JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: single("Person", "1", { first_name: "Jane" }) }]);
  const client = new PlanningCenterClient(ctx);
  const body = await client.get("people", "/people/1");

  assertEquals(calls[0].url, "https://api.planningcenteronline.com/people/v2/people/1");
  assertEquals(body, { data: { type: "Person", id: "1", attributes: { first_name: "Jane" } } });
});

Deno.test("get: every product resolves to its own /v2 path prefix", async () => {
  const { ctx, calls } = mockCtx([
    { body: collection("Event", []) },
    { body: collection("Donation", []) },
    { body: collection("CheckIn", []) },
  ]);
  const client = new PlanningCenterClient(ctx);
  await client.get("calendar", "/event_instances");
  await client.get("giving", "/donations");
  await client.get("check-ins", "/check_ins");

  assertEquals(pathOf(calls[0].url), "/calendar/v2/event_instances");
  assertEquals(pathOf(calls[1].url), "/giving/v2/donations");
  assertEquals(pathOf(calls[2].url), "/check-ins/v2/check_ins");
});

Deno.test("get: sends a User-Agent on every request", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("Person", []) }]);
  const client = new PlanningCenterClient(ctx);
  await client.get("people", "/people");

  assert(calls[0].headers["user-agent"]!.length > 0);
});

Deno.test("get: never sets an Authorization header itself — that is `sign`'s job alone", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("Person", []) }]);
  const client = new PlanningCenterClient(ctx);
  await client.get("people", "/people");

  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("where: a plain value renders as where[key]=value", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("Person", []) }]);
  const client = new PlanningCenterClient(ctx);
  await client.get("people", "/people", { where: { status: "active" } });

  assertEquals(queryOf(calls[0].url)["where[status]"], "active");
});

/**
 * The vendor's date-range filters use a NESTED bracket, `where[attr][op]`
 * (verified against the live OpenAPI parameter name
 * `donation_where_received_at_gte_parameter` -> `"where[received_at][gte]"`) —
 * not the flat `where[attr_op]` a naive implementation would guess at.
 */
Deno.test("where: an operator object renders as where[key][op]=value", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("Donation", []) }]);
  const client = new PlanningCenterClient(ctx);
  await client.get("giving", "/donations", {
    where: { received_at: { gte: "2026-01-01", lte: "2026-02-01" } },
  });

  const q = queryOf(calls[0].url);
  assertEquals(q["where[received_at][gte]"], "2026-01-01");
  assertEquals(q["where[received_at][lte]"], "2026-02-01");
});

Deno.test("where: an undefined operator value is omitted entirely, not sent empty", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("Donation", []) }]);
  const client = new PlanningCenterClient(ctx);
  await client.get("giving", "/donations", { where: { received_at: { gte: "2026-01-01" } } });

  const q = queryOf(calls[0].url);
  assertEquals(q["where[received_at][gte]"], "2026-01-01");
  assertEquals("where[received_at][lte]" in q, false);
});

Deno.test("post: sends a JSON content-type and body", async () => {
  const { ctx, calls } = mockCtx([{ body: single("Person", "9", { first_name: "New" }) }]);
  const client = new PlanningCenterClient(ctx);
  await client.post("people", "/people", { body: { data: { type: "Person" } } });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ data: { type: "Person" } }));
});

Deno.test("classifyAuthFailure: 401 and 403 read distinctly; other statuses are unclassified", () => {
  assert(classifyAuthFailure(401)!.includes("did not use the"));
  assert(classifyAuthFailure(403)!.includes("role lacks access"));
  assertEquals(classifyAuthFailure(500), undefined);
});

Deno.test("formatError: a 422 JSON-API error body surfaces its `detail`", () => {
  const msg = formatError(
    422,
    "POST",
    "/people/v2/people",
    JSON.stringify(errorBody("422", "First name can't be blank")),
  );
  assert(msg.includes("First name can't be blank"), msg);
});

Deno.test("formatError: 401 is classified even with no body at all", () => {
  const msg = formatError(401, "GET", "/current/v2/me", "");
  assert(msg.includes("did not use the"), msg);
});

Deno.test("get: a non-ok response throws with the formatted message", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: errorBody("429", "Rate limit exceeded: 118 of 100 requests per 20 seconds"),
  }]);
  const client = new PlanningCenterClient(ctx);

  await assertRejectsMessage(
    () => client.get("people", "/people"),
    "Rate limit exceeded",
  );
});

async function assertRejectsMessage(fn: () => Promise<unknown>, substring: string) {
  try {
    await fn();
  } catch (err) {
    assert(String((err as Error).message).includes(substring), (err as Error).message);
    return;
  }
  throw new Error("expected fn() to reject");
}
