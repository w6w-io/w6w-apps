import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  apiUrl,
  BrazeClient,
  DEFAULT_INSTANCE,
  hostFor,
  INSTANCES,
  readBrazeError,
  resolveInstance,
} from "../../lib/client.ts";

Deno.test("INSTANCES: exactly the nine hosts the fetched spec's servers[] enumerates", () => {
  assertEquals(Object.keys(INSTANCES), [
    "iad-01",
    "iad-02",
    "iad-03",
    "iad-04",
    "iad-05",
    "iad-06",
    "iad-08",
    "fra-01",
    "fra-02",
  ]);
  assertEquals(hostFor("fra-01"), "rest.fra-01.braze.eu");
  assertEquals(apiUrl("iad-01"), "https://rest.iad-01.braze.com");
});

Deno.test("resolveInstance: falls back to the default when the connection has none", () => {
  assertEquals(resolveInstance(undefined), DEFAULT_INSTANCE);
});

Deno.test("resolveInstance: falls back to the default when the connection names an unknown instance", () => {
  const conn = { display: { instance: "not-a-real-instance" } } as never;
  assertEquals(resolveInstance(conn), DEFAULT_INSTANCE);
});

Deno.test("resolveInstance: honors a valid connection instance", () => {
  const conn = { display: { instance: "iad-06" } } as never;
  assertEquals(resolveInstance(conn), "iad-06");
});

Deno.test("readBrazeError: reads Braze's { message, errors } envelope", async () => {
  const res = new Response(JSON.stringify({ message: "bad request", errors: ["missing_field"] }), {
    status: 400,
  });
  assertEquals(await readBrazeError(res), "bad request; missing_field");
});

Deno.test("readBrazeError: falls back to the HTTP status when the body isn't JSON", async () => {
  const res = new Response("not json", { status: 500 });
  assertEquals(await readBrazeError(res), "HTTP 500");
});

Deno.test("BrazeClient.request: throws with the parsed error message on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }], {
    display: { instance: "iad-01" },
  });
  await assertRejects(
    () => new BrazeClient(ctx).get("/campaigns/list"),
    Error,
    "Invalid API key",
  );
});

Deno.test("BrazeClient.get: drops undefined/null/empty query values", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: { instance: "iad-01" } });
  await new BrazeClient(ctx).get("/campaigns/list", {
    page: 0,
    sort_direction: undefined,
    foo: "",
  });
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("page"), "0");
  assertEquals(q.has("sort_direction"), false);
  assertEquals(q.has("foo"), false);
});
