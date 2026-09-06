import { assertEquals, assertRejects } from "@std/assert";
import {
  buildBody,
  compact,
  formatLivestormError,
  listQuery,
  LivestormClient,
  toList,
  toPersonFields,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryOf, single } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("toList: comma-joins an array, passes through a comma string, drops empties", () => {
  assertEquals(toList(["a", "b"]), "a,b");
  assertEquals(toList("a,b"), "a,b");
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(""), undefined);
});

Deno.test("toPersonFields: normalises a flat record into {id, value} pairs", () => {
  assertEquals(toPersonFields({ email: "a@b.com", first_name: "A" }), [
    { id: "email", value: "a@b.com" },
    { id: "first_name", value: "A" },
  ]);
});

Deno.test("toPersonFields: passes an already-built array through, dropping entries with no id", () => {
  assertEquals(
    toPersonFields([{ id: "email", value: "a@b.com" }, { id: "", value: "x" }]),
    [{ id: "email", value: "a@b.com" }],
  );
});

Deno.test("toPersonFields: undefined/empty input yields undefined", () => {
  assertEquals(toPersonFields(undefined), undefined);
  assertEquals(toPersonFields({}), undefined);
});

Deno.test("buildBody: assembles a JSON:API write body, omitting empty sections", () => {
  assertEquals(buildBody("events", { title: "x" }), {
    data: { type: "events", attributes: { title: "x" } },
  });
  assertEquals(buildBody("events", {}), { data: { type: "events" } });
  assertEquals(buildBody("sessions", { name: "s" }, { people: [{ id: "p1" }] }), {
    data: {
      type: "sessions",
      attributes: { name: "s" },
      relationships: { people: [{ id: "p1" }] },
    },
  });
});

Deno.test("listQuery: maps pageNumber/pageSize/include into page[]/include query keys", () => {
  assertEquals(listQuery({ pageNumber: 2, pageSize: 10, include: ["sessions", "tags"] }), {
    "page[number]": 2,
    "page[size]": 10,
    "include": "sessions,tags",
  });
  assertEquals(listQuery({}), {});
});

Deno.test("formatLivestormError: reads errors[0].status/title/detail", () => {
  const raw = JSON.stringify({
    errors: [{ title: "Unauthorized", detail: "bad token", status: "unauthorized" }],
  });
  const msg = formatLivestormError(401, "GET", "/ping", raw);
  assertEquals(
    msg,
    "Livestorm 401 unauthorized for GET /ping: Unauthorized: bad token",
  );
});

Deno.test("formatLivestormError: falls back to raw text when the body is not the error envelope", () => {
  const msg = formatLivestormError(500, "GET", "/ping", "upstream exploded");
  assertEquals(msg, "Livestorm 500 for GET /ping: upstream exploded");
});

Deno.test("LivestormClient.request: parses the JSON:API envelope and hits the right URL", async () => {
  const { ctx, calls } = mockCtx([{ body: single("events", "e1", { title: "Demo" }) }]);
  const body = await new LivestormClient(ctx).request("/events/e1");

  assertEquals(pathOf(calls[0].url), "/v1/events/e1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers.accept, "application/vnd.api+json");
  assertEquals(body, single("events", "e1", { title: "Demo" }));
});

Deno.test("LivestormClient.request: sends the JSON:API content-type on a write", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: single("events", "e1") }]);
  await new LivestormClient(ctx).request("/events", {
    method: "POST",
    body: buildBody("events", { title: "x" }),
  });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "events", attributes: { title: "x" } },
  });
});

Deno.test("LivestormClient.request: returns undefined on a 204", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const body = await new LivestormClient(ctx).request("/events/e1", { method: "DELETE" });
  assertEquals(body, undefined);
});

Deno.test("LivestormClient.status: returns the HTTP status without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const status = await new LivestormClient(ctx).status("/events/e1", { method: "DELETE" });
  assertEquals(status, 204);
});

Deno.test("LivestormClient: a non-ok response throws the formatted error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("unauthorized", "Unauthorized") }]);
  await assertRejects(
    () => new LivestormClient(ctx).request("/ping"),
    Error,
    "Livestorm 401 unauthorized",
  );
});
