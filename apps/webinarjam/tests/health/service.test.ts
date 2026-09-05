import { assert, assertEquals } from "@std/assert";
import service, { STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(components: Array<Record<string, unknown>>, indicator = "none"): unknown {
  return {
    page: { id: "jprqr7020j67", name: "WebinarJam", url: "https://status.webinarjam.com" },
    components,
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator, description: "All Systems Operational" },
  };
}

Deno.test("service: is a live, unsigned, app-scoped check", () => {
  assertEquals(typeof service.check, "function");
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.webinarjam.com"]);
});

Deno.test("service: fetches the real Statuspage URL", async () => {
  const { ctx, calls } = mockCtx([{
    body: summary([{ id: "hp3k3vsyhhhh", name: "API", status: "operational" }]),
  }]);
  await service.check!({} as never, ctx);
  assertEquals(calls[0].url, STATUS_URL);
});

Deno.test("service: reports ok when the API component is operational", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { id: "rpx85djxt5ck", name: "WebinarJam App", status: "operational" },
      { id: "hp3k3vsyhhhh", name: "API", status: "operational" },
    ]),
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "ok");
});

/**
 * The check this pack considers most important for a status page with many
 * unrelated components: an incident on something this app never touches must
 * not report the developer API as degraded.
 */
Deno.test("service: an incident on WebinarJam App does not degrade the API component", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { id: "rpx85djxt5ck", name: "WebinarJam App", status: "major_outage" },
      { id: "hp3k3vsyhhhh", name: "API", status: "operational" },
    ], "major"),
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "ok");
});

Deno.test("service: an incident on the API component itself is reported", async () => {
  const { ctx } = mockCtx([{
    body: summary([{ id: "hp3k3vsyhhhh", name: "API", status: "major_outage" }], "major"),
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "down");
});

Deno.test("service: falls back to the page-wide rollup when the API component is absent", async () => {
  const { ctx } = mockCtx([{
    body: summary([{ id: "x", name: "Something Else", status: "operational" }], "minor"),
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "degraded");
  assert(result.message!.includes('"API" component not found'), result.message);
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as WebinarJam's is unknown", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { id: "x", name: "Someone Else", url: "https://status.example.com" },
      components: [{ name: "API", status: "operational" }],
      status: { indicator: "none" },
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "unknown");
});
