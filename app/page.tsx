"use client";

import { ChangeEvent, useMemo, useState } from "react";

type Product = {
  sku: string;
  name: string;
  section: string;
  sales7: number;
  sales30: number;
  sales90: number;
  fba: number;
  inbound: number;
  local: number;
  trend: number;
  recipe: Record<string, number>;
};

const PRODUCT_CATALOG: Product[] = [
  { sku: "H07V-K-10-Set10-fba", name: "5 × 2 m · Schwarz, Blau, Braun, Grau, Grün-Gelb", section: "10 mm²", sales7: 0, sales30: 0, sales90: 0, fba: 0, inbound: 0, local: 0, trend: 0, recipe: { Schwarz: 2, Blau: 2, Braun: 2, Grau: 2, "Grün-Gelb": 2 } },
  { sku: "H07V-K-10-Set6-fba", name: "3 × 2 m · Schwarz, Blau, Grün-Gelb", section: "10 mm²", sales7: 0, sales30: 0, sales90: 0, fba: 0, inbound: 0, local: 0, trend: 0, recipe: { Schwarz: 2, Blau: 2, "Grün-Gelb": 2 } },
  { sku: "H07V-K-6-Set9-fba", name: "5 × 1 m · Schwarz, Blau, Braun, Grau, Grün-Gelb", section: "6 mm²", sales7: 0, sales30: 0, sales90: 0, fba: 0, inbound: 0, local: 0, trend: 0, recipe: { Schwarz: 1, Blau: 1, Braun: 1, Grau: 1, "Grün-Gelb": 1 } },
  { sku: "H07V-K-10-Set13-fba", name: "5 × 10 m · Schwarz, Blau, Braun, Grau, Grün-Gelb", section: "10 mm²", sales7: 0, sales30: 0, sales90: 0, fba: 0, inbound: 0, local: 0, trend: 0, recipe: { Schwarz: 10, Blau: 10, Braun: 10, Grau: 10, "Grün-Gelb": 10 } },
  { sku: "H07V-K-6-Set5-fba", name: "3 × 1 m · Schwarz, Blau, Grün-Gelb", section: "6 mm²", sales7: 0, sales30: 0, sales90: 0, fba: 0, inbound: 0, local: 0, trend: 0, recipe: { Schwarz: 1, Blau: 1, "Grün-Gelb": 1 } },
  { sku: "H07V-K-10-Set12-fba", name: "5 × 5 m · Schwarz, Blau, Braun, Grau, Grün-Gelb", section: "10 mm²", sales7: 0, sales30: 0, sales90: 0, fba: 0, inbound: 0, local: 0, trend: 0, recipe: { Schwarz: 5, Blau: 5, Braun: 5, Grau: 5, "Grün-Gelb": 5 } },
];

const COLORS: Record<string, string> = { Blau: "#2563eb", Braun: "#8b5a2b", "Grün-Gelb": "#a6cf16", Grau: "#94a3b8", Schwarz: "#20262d" };
const SKU_PREFIX = "H07V-K-";

function parseCsv(text: string) {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] || "";
  const candidates = [",", ";", "\t"];
  const delimiter = candidates.sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(value => value !== "")) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(value => value !== "")) rows.push(row);
  return rows;
}

function forecast(product: Product, productionDays: number, coverageDays: number, safety: number) {
  const d7 = product.sales7 / 7;
  const d30 = product.sales30 / 30;
  const d90 = product.sales90 / 90;
  const weightedDaily = d7 * .5 + d30 * .3 + d90 * .2;
  const demand = weightedDaily * (productionDays + coverageDays) * (1 + safety / 100);
  const available = product.fba + product.inbound + product.local;
  return {
    daily: weightedDaily,
    demand: Math.ceil(demand),
    available,
    quantity: Math.max(0, Math.ceil(demand - available)),
  };
}

export default function Home() {
  const [products] = useState(PRODUCT_CATALOG);
  const [hasSalesData, setHasSalesData] = useState(false);
  const [productionDays, setProductionDays] = useState(14);
  const [coverageDays, setCoverageDays] = useState(45);
  const [safety, setSafety] = useState(15);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("Alle");
  const [selectedSku, setSelectedSku] = useState(PRODUCTS[0].sku);
  const [synced, setSynced] = useState("Noch kein Bericht");
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");

  const rows = useMemo(() => products.map(product => ({ product, result: forecast(product, productionDays, coverageDays, safety) })), [products, productionDays, coverageDays, safety]);
  const filtered = rows.filter(({ product }) => (section === "Alle" || product.section === section) && `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase()));
  const selected = rows.find(row => row.product.sku === selectedSku) || rows[0];
  const totalSets = rows.reduce((sum, row) => sum + row.result.quantity, 0);
  const urgent = rows.filter(row => row.result.quantity > 0 && row.product.fba / row.result.daily < productionDays).length;
  const cableRows = useMemo(() => {
    const grouped = new Map<string, { section: string; color: string; meters: number; sets: number }>();
    rows.forEach(({ product, result }) => Object.entries(product.recipe).forEach(([color, meters]) => {
      const key = `${product.section}-${color}`;
      const current = grouped.get(key) || { section: product.section, color, meters: 0, sets: 0 };
      current.meters += meters * result.quantity;
      current.sets += result.quantity;
      grouped.set(key, current);
    }));
    return [...grouped.values()].filter(row => row.meters > 0).sort((a, b) => a.section.localeCompare(b.section) || a.color.localeCompare(b.color));
  }, [rows]);

  const sync = () => {
    setSyncing(true); setNotice("");
    window.setTimeout(() => { setSyncing(false); setSynced("gerade eben"); setNotice("Die Demo-Daten wurden neu geladen und die Empfehlungen aktualisiert."); }, 900);
  };

  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const rows = parseCsv(await file.text());
    const headers = (rows[0] || []).map(value => value.replace(/^\uFEFF/, "").trim().toLowerCase());
    const preferredHeaders = ["händler-sku", "merchant-sku", "seller-sku", "sku"];
    const skuIndex = preferredHeaders.map(name => headers.indexOf(name)).find(index => index >= 0) ?? -1;
    if (skuIndex < 0) {
      setNotice("Import nicht möglich: Im CSV wurde keine SKU-Spalte gefunden.");
      event.target.value = "";
      return;
    }
    const dataRows = rows.slice(1).filter(row => row.some(value => value !== ""));
    const h07Rows = dataRows.filter(row => (row[skuIndex] || "").trim().toUpperCase().startsWith(SKU_PREFIX));
    const ignored = dataRows.length - h07Rows.length;
    const known = new Set(products.map(product => product.sku.toUpperCase()));
    const matched = h07Rows.filter(row => known.has((row[skuIndex] || "").trim().toUpperCase())).length;
    setHasSalesData(false);
    setSynced("Produktstammdaten geladen");
    setNotice(`${file.name}: ${h07Rows.length} H07V-K-Zeilen übernommen, ${ignored} andere Produkte ignoriert. Der Bericht enthält keine Verkaufs- und Bestandsdaten; deshalb wurde noch keine Produktionsprognose erstellt.`);
    event.target.value = "";
  };

  const exportCsv = () => {
    const header = "Querschnitt;Farbe;Meter;Sets\n";
    const body = cableRows.map(row => `${row.section};${row.color};${row.meters.toFixed(1)};${row.sets}`).join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "produktionsliste.csv"; link.click(); URL.revokeObjectURL(url);
    setNotice("Die Produktionsliste wurde exportiert.");
  };

  const maxCable = Math.max(...cableRows.map(row => row.meters), 1);

  return <main>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Solartronics Produktionsprognose"><span>solar<b>tronics</b></span><i />Produktionsprognose</a>
      <div className="top-actions"><span className="connection demo"><i /> Amazon-Bericht erforderlich</span><button className="secondary" onClick={() => document.getElementById("sales-file")?.click()}>CSV importieren</button><button className="avatar" aria-label="Benutzerprofil">MS</button></div>
    </header>

    <section className="hero" id="top">
      <div><p className="eyebrow">Intelligente Produktionsplanung</p><h1>Was müssen wir<br /><em>jetzt produzieren?</em></h1><p className="intro">Von Verkaufszahlen zur klaren Zuschnittliste — Lagerbestand, Zulauf und Sicherheitsreserve bereits berücksichtigt.</p></div>
      <div className="sync-card"><span>Letzter Verkaufsdatenstand</span><strong>{synced}</strong><small>Es werden ausschließlich H07V-K-SKUs verarbeitet.</small><label className="primary-upload">Amazon-CSV importieren<input id="sales-file" type="file" accept=".csv,text/csv" onChange={importCsv} /></label></div>
    </section>

    {notice && <div className="notice" role="status"><span>✓</span>{notice}<button onClick={() => setNotice("")} aria-label="Fermer">×</button></div>}

    <section className="metrics" aria-label="Zusammenfassung">
      <article><span>Zu produzieren</span><strong>{hasSalesData ? totalSets : "—"}</strong><small>{hasSalesData ? "empfohlene Sets" : "Bericht importieren"}</small></article>
      <article><span>Dringende SKUs</span><strong className="orange">{hasSalesData ? urgent : "—"}</strong><small>{hasSalesData ? "voraussichtlich vor Engpass" : "Bericht importieren"}</small></article>
      <article><span>FBA-Bestand</span><strong>{hasSalesData ? products.reduce((n, p) => n + p.fba, 0) : "—"}</strong><small>{hasSalesData ? "verfügbare Einheiten" : "Bericht importieren"}</small></article>
      <article><span>Planungshorizont</span><strong>{productionDays + coverageDays}</strong><small>abgedeckte Tage nach Import</small></article>
    </section>

    {!hasSalesData && <section className="empty-state"><span>CSV</span><div><p>NOCH KEINE VERKAUFSDATEN</p><h2>Amazon-Bericht importieren</h2><small>Die Produktstammdaten sind vorhanden. Für die Prognose fehlen noch Verkäufe, FBA-Bestand und Zulauf. Andere Produktfamilien werden beim Import automatisch ignoriert.</small></div><label>Bericht auswählen<input type="file" accept=".csv,text/csv" onChange={importCsv} /></label></section>}

    {hasSalesData && <><section className="planner">
      <aside className="settings">
        <div className="section-title"><p>Einstellungen</p><h2>Berechnungsrahmen</h2></div>
        <Range label="Produktionsvorlauf" value={productionDays} min={3} max={45} suffix="Tage" onChange={setProductionDays} />
        <Range label="Reichweite nach Lieferung" value={coverageDays} min={14} max={90} suffix="Tage" onChange={setCoverageDays} />
        <Range label="Sicherheitsbestand" value={safety} min={0} max={40} suffix="%" onChange={setSafety} />
        <div className="formula-card"><span>AKTIVE FORMEL</span><p>Prognostizierter Bedarf für <b>{productionDays + coverageDays} Tage</b>, plus {safety}% Sicherheit, abzüglich FBA-Bestand, Zulauf und lokalem Bestand.</p></div>
        <button className="reset" onClick={() => { setProductionDays(14); setCoverageDays(45); setSafety(15); }}>Einstellungen zurücksetzen</button>
      </aside>

      <div className="recommendations">
        <div className="section-head"><div className="section-title"><p>Empfehlungen</p><h2>Produktionsplan</h2></div><div className="filters"><input aria-label="SKU suchen" placeholder="SKU suchen…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Nach Querschnitt filtern" value={section} onChange={e => setSection(e.target.value)}><option>Alle</option><option>6 mm²</option><option>10 mm²</option></select></div></div>
        <div className="product-table" role="table" aria-label="Produktionsempfehlungen">
          <div className="table-row table-header" role="row"><span>SKU / Inhalt</span><span>Verkauf 30 T.</span><span>Verfügbar</span><span>Trend</span><span>Produzieren</span></div>
          {filtered.map(({ product, result }) => <button className={`table-row ${selected.product.sku === product.sku ? "active" : ""}`} key={product.sku} onClick={() => setSelectedSku(product.sku)} role="row">
            <span className="product"><i>{product.section.replace(" mm²", "")}</i><span><b>{product.sku}</b><small>{product.name}</small></span></span>
            <span><b>{product.sales30}</b><small>{(product.sales30 / 30).toFixed(1)} / Tag</small></span>
            <span><b>{result.available}</b><small>{product.fba} FBA + {product.inbound} Zulauf</small></span>
            <span className={product.trend >= 0 ? "trend-up" : "trend-down"}>{product.trend >= 0 ? "↗" : "↘"} {Math.abs(product.trend)}%</span>
            <span className="quantity"><b>{result.quantity}</b><small>sets</small></span>
          </button>)}
        </div>
      </div>
    </section>

    <section className="analysis">
      <div className="analysis-copy"><p className="eyebrow">Berechnungsdetails</p><h2>{selected.product.sku}</h2><span className="sku">Set-Inhalt: {selected.product.name}</span><div className="calculation"><div><strong>{selected.result.demand}</strong><span>Prognosebedarf</span></div><em>−</em><div><strong>{selected.result.available}</strong><span>Gesamtbestand</span></div><em>=</em><div className="highlight"><strong>{selected.result.quantity}</strong><span>zu produzierende Sets</span></div></div><p className="explain">Der gewichtete Absatz liegt bei <b>{selected.result.daily.toFixed(1)} Sets pro Tag</b>. Die letzten 7 Tage werden stärker gewichtet, damit der aktuelle Trend berücksichtigt wird.</p></div>
      <div className="sales-chart"><div className="chart-heading"><span>Verkaufsvergleich</span><small>durchschnittliche Einheiten pro Tag</small></div><div className="bars"><Bar label="7 Tage" value={selected.product.sales7 / 7} max={7} color="#b9f227" /><Bar label="30 Tage" value={selected.product.sales30 / 30} max={7} color="#6d8d1a" /><Bar label="90 Tage" value={selected.product.sales90 / 90} max={7} color="#385161" /></div><div className="chart-note"><i /> Die aktuelle Nachfrage liegt {selected.product.sales7 / 7 > selected.product.sales30 / 30 ? "über" : "unter"} dem 30-Tage-Durchschnitt.</div></div>
    </section>

    <section className="cutlist">
      <div className="cutlist-head"><div className="section-title"><p>Fertigung</p><h2>Konsolidierte Kabel-Zuschnittliste</h2><span>Gleiche Querschnitte und Farben werden automatisch zusammengefasst.</span></div><button onClick={exportCsv}>↓ CSV exportieren</button></div>
      <div className="cut-grid">
        {cableRows.map(row => <article key={`${row.section}-${row.color}`}><header><span className="color-dot" style={{ background: COLORS[row.color] }} /><b>{row.color}</b><em>{row.section}</em></header><strong>{row.meters.toLocaleString("de-DE", { maximumFractionDigits: 1 })}<small> m</small></strong><div className="meter"><i style={{ width: `${Math.max(5, row.meters / maxCable * 100)}%`, background: COLORS[row.color] }} /></div><footer>{row.sets} betroffene Sets <span>Planungsbereit</span></footer></article>)}
      </div>
    </section></>}

    <footer className="footer"><span>solar<b>tronics</b> · Produktionsprognose</span><p>Planungsprototyp · Vor Produktionsstart ist eine manuelle Freigabe erforderlich</p></footer>
  </main>;
}

function Range({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="range"><span><b>{label}</b><output>{value} {suffix}</output></span><input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} style={{ "--progress": `${(value - min) / (max - min) * 100}%` } as React.CSSProperties} /><small><i>{min}</i><i>{max}</i></small></label>;
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return <div className="bar"><div><i style={{ height: `${value / max * 100}%`, background: color }}><span>{value.toFixed(1)}</span></i></div><small>{label}</small></div>;
}
