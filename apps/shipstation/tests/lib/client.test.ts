import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, csv, describeError, json, query, ShipStationClient } from "../../lib/client.ts";

Deno.test("compact: drops undefined, null, empty string, and empty arrays", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: [], f: "x", g: [1] }), {
    a: 1,
    f: "x",
    g: [1],
  });
});

Deno.test("query: stringifies every kept value", () => {
  assertEquals(query({ a: 1, b: true, c: "x", d: undefined, e: "" }), {
    a: "1",
    b: "true",
    c: "x",
  });
});

Deno.test("csv: splits and trims a comma-separated string", () => {
  assertEquals(csv("se-1, se-2 ,se-3"), ["se-1", "se-2", "se-3"]);
});

Deno.test("csv: passes an array through, trimmed", () => {
  assertEquals(csv([" se-1 ", "se-2"]), ["se-1", "se-2"]);
});

Deno.test("csv: undefined for blank input", () => {
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
});

Deno.test("json: parses a JSON string param", () => {
  assertEquals(json('{"a":1}', "field"), { a: 1 });
});

Deno.test("json: passes a live (already-parsed) value through", () => {
  assertEquals(json({ a: 1 }, "field"), { a: 1 });
});

Deno.test("json: undefined for blank input", () => {
  assertEquals(json("", "field"), undefined);
  assertEquals(json(undefined, "field"), undefined);
});

Deno.test("json: throws a field-named error on invalid JSON", () => {
  try {
    json("{not json", "shipTo");
    throw new Error("did not throw");
  } catch (err) {
    assert((err as Error).message.includes("shipTo"));
  }
});

Deno.test("describeError: joins the errors array with source and field", () => {
  const text = JSON.stringify({
    request_id: "req-1",
    errors: [{
      message: "Invalid service_code",
      error_source: "shipengine",
      field_name: "service_code",
    }],
  });
  const msg = describeError(400, text);
  assert(msg.includes("Invalid service_code"));
  assert(msg.includes("shipengine"));
  assert(msg.includes("service_code"));
  assert(msg.includes("req-1"));
});

Deno.test("describeError: 401 notes the V1/V2 key distinction and the identical-body caveat", () => {
  const msg = describeError(401, JSON.stringify({ errors: [{ message: "Access denied." }] }));
  assert(msg.includes("V2"));
  assert(/identically/.test(msg));
});

Deno.test("describeError: 429 points at Retry-After and both documented limits", () => {
  const msg = describeError(429, JSON.stringify({ errors: [{ message: "Too many requests" }] }));
  assert(msg.includes("200 requests/minute"));
  assert(msg.includes("Retry-After"));
});

Deno.test("describeError: falls back gracefully on non-JSON bodies", () => {
  assertEquals(describeError(500, ""), "500");
  assertEquals(describeError(500, "oops"), "oops");
});

Deno.test("ShipStationClient: builds the URL under /v2 and sets accept/content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ok: true } }]);
  await new ShipStationClient(ctx).request("/carriers", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/carriers");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { a: 1 });
});

Deno.test("ShipStationClient: never sets an authorization/api-key header itself", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new ShipStationClient(ctx).request("/carriers");
  assertEquals(calls[0].headers["api-key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("ShipStationClient: returns undefined on a 204 with no body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const result = await new ShipStationClient(ctx).request("/shipments/se-1/cancel");
  assertEquals(result, undefined);
});

Deno.test("ShipStationClient: throws with the vendor error message on a non-2xx", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { errors: [{ message: "carrier_id se-9 not found", field_name: "carrier_id" }] },
  }]);
  try {
    await new ShipStationClient(ctx).request("/shipments", { method: "POST", body: {} });
    throw new Error("did not throw");
  } catch (err) {
    assert((err as Error).message.includes("carrier_id se-9 not found"));
    assert((err as Error).message.includes("422"));
  }
});
