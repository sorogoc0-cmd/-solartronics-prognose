import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("produces a self-contained HTML file that initializes the CSV interface", async () => {
  const html = await readFile(new URL("Solartronics-Bedarfsprognose.html", root), "utf8");
  const script = html.match(/<script type="module">([\s\S]+)<\/script>/)?.[1];

  assert.ok(script, "the application JavaScript must be inlined");
  assert.match(html, /<style>[\s\S]+<\/style>/);
  assert.match(html, /<div id="root"><\/div>/);
  assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)="https?:/i);
  assert.doesNotThrow(() => new Function(script));
  assert.match(script, /Amazon-CSV importieren/);
  assert.match(script, /Bericht auswählen/);
});

test("reads each supported FBA field once per SKU and only subtracts fulfillable stock", async () => {
  const source = await readFile(new URL("app/page.tsx", root), "utf8");

  for (const header of [
    "afn-fulfillable-quantity",
    "afn-reserved-quantity",
    "afn-total-quantity",
    "afn-inbound-working-quantity",
    "afn-inbound-shipped-quantity",
    "afn-inbound-receiving-quantity",
  ]) {
    assert.match(source, new RegExp(`headers\\.indexOf\\(\"${header}\"\\)`));
  }

  assert.match(source, /const available = product\.fba;/);
  assert.match(source, /\.find\(raw => raw !== undefined/);
  assert.doesNotMatch(source, /reduce\([^\n]+stockColumns\.fulfillable/);
  assert.match(source, /const inbound = stockValue\([^\n]+inboundWorking[^\n]+inboundShipped[^\n]+inboundReceiving/);
  assert.match(source, /<span>Reserviert<\/span><span>Zulauf<\/span>/);
});
