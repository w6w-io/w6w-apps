import { assertEquals } from "@std/assert";
import sessionPeopleBulkRegister from "../../actions/session-people-bulk-register.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("session-people-bulk-register: POSTs a jobs body with a tasks array of {fields} entries", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: single("jobs", "j1", { status: "pending" }),
  }]);
  const result = await sessionPeopleBulkRegister.execute({
    id: "s1",
    tasks: [
      { fields: { email: "a@b.com" } },
      { fields: [{ id: "email", value: "c@d.com" }], utmSource: "list" },
    ],
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1/people/bulk");
  const body = JSON.parse(calls[0].body!) as {
    data: { type: string; attributes: { tasks: Array<Record<string, unknown>> } };
  };
  assertEquals(body.data.type, "jobs");
  assertEquals(body.data.attributes.tasks.length, 2);
  assertEquals(body.data.attributes.tasks[0].fields, [{ id: "email", value: "a@b.com" }]);
  assertEquals(body.data.attributes.tasks[1].utm_source, "list");
  assertEquals(result, { id: "j1", type: "jobs", attributes: { status: "pending" } });
});
