import { assertEquals } from "@std/assert";
import instance from "../../health/instance.ts";
import { BASE_URL, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("instance: ok when serverInfo answers 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { version: "9.12.0", deploymentType: "Server" } }]);
  const report = await instance.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/rest/api/2/serverInfo");
  assertEquals(report.state, "ok");
});

Deno.test("instance: a schema-correct 401 is a reachability PASS, not an outage", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errorMessages: ["Login required"] } }]);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("instance: an unrecognised 401 body reports unknown, not ok", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>not jira</html>", headers: {} }]);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("instance: a 404 reports down", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "not found" }]);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("instance: a connection with no baseUrl reports unknown", async () => {
  const { ctx } = mockCtx([], { display: {} } as never);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("instance: sends no credential, only the connection's baseUrl", async () => {
  const { ctx, calls } = mockCtx([{ body: { version: "9.12.0" } }], {
    display: { baseUrl: BASE_URL },
  } as never);
  await instance.check!({}, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
