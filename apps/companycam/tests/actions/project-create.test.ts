import { assertEquals, assertRejects } from "@std/assert";
import projectCreate from "../../actions/project-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-create: builds the documented body, snake_cased", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1" } }]);
  await projectCreate.execute({
    name: "Roof Job 4132",
    address: {
      street1: "4132 Pleasant St",
      city: "Lincoln",
      state: "NE",
      postalCode: "68508",
      country: "US",
    },
    lat: 28.4,
    lon: -81.4,
    primaryContact: { name: "Joe Smith", email: "joe@example.com", phoneNumber: "402-555-1212" },
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/projects");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), {
    name: "Roof Job 4132",
    address: {
      street_address_1: "4132 Pleasant St",
      city: "Lincoln",
      state: "NE",
      postal_code: "68508",
      country: "US",
    },
    coordinates: { lat: 28.4, lon: -81.4 },
    primary_contact: {
      name: "Joe Smith",
      email: "joe@example.com",
      phone_number: "402-555-1212",
    },
  });
});

Deno.test("project-create: sends only the name when nothing else is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1" } }]);
  await projectCreate.execute({ name: "Bare" }, ctx);
  assertEquals(bodyOf(calls[0]), { name: "Bare" });
});

Deno.test("project-create: sends coordinates only when both halves are present", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await projectCreate.execute({ name: "Half", lat: 28.4 }, ctx);
  assertEquals(bodyOf(calls[0]), { name: "Half" });
});

Deno.test("project-create: accepts a geofence as JSON text or as a parsed array", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }, { status: 201, body: {} }]);
  const points = [{ lat: 1, lon: 2 }, { lat: 3, lon: 4 }];
  await projectCreate.execute({ name: "A", geofence: JSON.stringify(points) }, ctx);
  await projectCreate.execute({ name: "A", geofence: points }, ctx);
  assertEquals(bodyOf(calls[0]).geofence, points);
  assertEquals(bodyOf(calls[1]).geofence, points);
});

Deno.test("project-create: rejects an unparseable geofence before calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await projectCreate.execute({ name: "A", geofence: "{oops" }, ctx),
    Error,
    "Geofence is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("project-create: sends the impersonation header when a user is named", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await projectCreate.execute({ name: "A", actAs: "crew@example.com" }, ctx);
  assertEquals(calls[0].headers["x-companycam-user"], "crew@example.com");
});

Deno.test("project-create: is declared non-idempotent — this API has no idempotency key", () => {
  assertEquals(projectCreate.idempotent, false);
});
