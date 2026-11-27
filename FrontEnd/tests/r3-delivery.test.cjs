const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");
const { parse } = require("next/dist/compiled/babel/parser");

const root = path.resolve(__dirname, "../..");
const errorMessage = "Please select a valid delivery address.";

// Load the real submit handler with controlled state and callbacks.
async function loadHandler(version, file, name, state) {
  const filename = path.join(root, "FrontEnd", file);
  const source = version === "phase3"
    ? execFileSync("git", ["show", `phase3:FrontEnd/${file}`], {
        cwd: root,
        encoding: "utf8",
      })
    : readFileSync(filename, "utf8");

  const { program } = parse(source, {
    sourceType: "module",
    plugins: ["jsx"],
  });

  const component = program.body.find(
    node => node.type === "ExportDefaultDeclaration"
  );
  const handler = component.declaration.body.body.find(
    node => node.id?.name === name
  );
  assert.ok(handler, `Missing handler ${name}`);

  for (const node of program.body) {
    if (
      node.type === "ImportDeclaration" &&
      node.source.value.endsWith("/deliveryAddress.mjs")
    ) {
      const modulePath = path.resolve(path.dirname(filename), node.source.value);
      const imported = await import(pathToFileURL(modulePath).href);
      state.isValidDelivery = imported.isValidDelivery;
    }
  }

  return Function(
    ...Object.keys(state),
    "return " + source.slice(handler.start, handler.end)
  )(...Object.values(state));
}

const address = {
  deliveryAddress: "  12 Main  ",
  latitude: 0,
  longitude: 0,
};

const cases = [
  ["zero coordinates", address, true],
  ["upper limits", { ...address, latitude: 90, longitude: 180 }, true],
  ["lower limits", { ...address, latitude: -90, longitude: -180 }, true],
  ["blank address", { ...address, deliveryAddress: "  " }, false],
  ["non-text address", { ...address, deliveryAddress: 12 }, false],
  ["missing destination", null, false],
  ["latitude outside range", { ...address, latitude: -90.01 }, false],
  ["longitude outside range", { ...address, longitude: 180.01 }, false],
  ["string coordinate", { ...address, latitude: "0" }, false],
  ["infinite coordinate", { ...address, longitude: Infinity }, false],
  ["missing coordinate", { ...address, latitude: undefined }, false],
];

for (const version of ["phase3", "working"]) {
  for (const [label, delivery, valid] of cases) {
    const expected = valid
      ? { ...delivery, deliveryAddress: "12 Main" }
      : undefined;

    test(`${version} / order form / ${label}`, async () => {
      let sent;
      let error;

      const submit = await loadHandler(
        version,
        "features/customer/PlaceOrder.jsx",
        "handleSubmit",
        {
          delivery,
          canPlaceOrder: true,
          submittingRef: { current: false },
          selectedItems: [{ id: 3 }],
          quantities: { 3: 1 },
          subtotal: 10,
          setError(value) { error = value; },
          setSubmitting() {},
          setQuantities() {},
          async onPlaceOrder(items, options) {
            sent = options.delivery;
            return true;
          },
        }
      );

      await submit({ preventDefault() {} });
      assert.equal(error, valid ? "" : errorMessage);
      assert.deepEqual(sent, expected);
    });

    test(`${version} / dashboard / ${label}`, async () => {
      let sent;
      let cardLookups = 0;
      let log;

      const place = await loadHandler(
        version,
        "views/CustomerDashboard.jsx",
        "handlePlaceOrder",
        {
          selectedRestaurant: { id: 5 },
          placingOrder: { current: false },
          mounted: { current: false },
          paymentsEnabled: true,
          user: {},
          setError() {},
          setMessage() {},
          setPaymentsKey() {},
          onLog(entry) { log = entry; },
          async getSavedCard() {
            cardLookups++;
            return {};
          },
          async placeOrder(restaurantId, items, destination) {
            sent = destination;
            return { id: 42 };
          },
        }
      );

      assert.equal(await place([], { delivery }), valid);
      assert.equal(cardLookups, valid ? 1 : 0);
      assert.deepEqual(sent, expected);
      if (!valid) assert.equal(log.error, errorMessage);
    });
  }
}