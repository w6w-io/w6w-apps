import { assertEquals } from "@std/assert";
import eventSessionCreate from "../../actions/event-session-create.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("event-session-create: POSTs a sessions body with no relationships when no people given", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: single("sessions", "s1", { name: "Session #1" }),
  }]);
  await eventSessionCreate.execute({ id: "e1", name: "Session #1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/e1/sessions");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "sessions", attributes: { name: "Session #1" } },
  });
});

Deno.test("event-session-create: attaches people as a relationships.people array", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: single("sessions", "s1") }]);
  await eventSessionCreate.execute(
    { id: "e1", peopleIds: ["p1", "p2"], peopleRole: "participant" },
    ctx,
  );

  const body = JSON.parse(calls[0].body!) as {
    data: {
      relationships?: { people?: Array<{ data: { type: string; id: string; role: string } }> };
    };
  };
  assertEquals(body.data.relationships?.people, [
    { data: { type: "people", id: "p1", role: "participant" } },
    { data: { type: "people", id: "p2", role: "participant" } },
  ]);
});
