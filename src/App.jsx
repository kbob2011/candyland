import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

// ----- Types as comments for clarity -----
// Card can be:
//  - { id, kind: "single", color }
//  - { id, kind: "double", color }
//  - { id, kind: "special", label }

const COLORS = [
  { name: "red", css: "#ef4444" },
  { name: "purple", css: "#a855f7" },
  { name: "yellow", css: "#f59e0b" },
  { name: "blue", css: "#3b82f6" },
  { name: "orange", css: "#fb923c" },
  { name: "green", css: "#22c55e" },
];

const DEFAULTS = {
  singlesPerColor: 8,
  doublesPerColor: 4,
  specials: [
    "Candy Cane Forest",
    "Gumdrop Pass",
    "Lollipop Woods",
    "Peppermint Turnpike",
    "Ice Cream Sea",
    "Molasses Swamp",
  ],
};

const STORAGE = "candyland-card-flipper:v1";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildDeck(cfg) {
  const deck = [];
  for (const c of COLORS) {
    for (let i = 0; i < cfg.singlesPerColor; i++) deck.push({ id: uid(), kind: "single", color: c.name });
    for (let i = 0; i < cfg.doublesPerColor; i++) deck.push({ id: uid(), kind: "double", color: c.name });
  }
  for (const label of cfg.specials) deck.push({ id: uid(), kind: "special", label });
  return deck;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function App() {
  // ----- load/save settings -----
  const [config, setConfig] = useState(() => {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return DEFAULTS;
    try {
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...(parsed?.config || {}) };
    } catch {
      return DEFAULTS;
    }
  });

  const [autoDrawOnTap, setAutoDrawOnTap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE))?.autoDrawOnTap ?? true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify({ config, autoDrawOnTap }));
  }, [config, autoDrawOnTap]);

  // ----- game state -----
  const [deck, setDeck] = useState(() => shuffle(buildDeck(config)));
  const [discard, setDiscard] = useState([]);
  const [current, setCurrent] = useState(null);

  // tapping anywhere to draw
  const tapRef = useRef(null);
  useEffect(() => {
    const el = tapRef.current;
    if (!el) return;
    const handler = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (["button", "input", "textarea", "label"].includes(tag)) return;
      if (autoDrawOnTap) draw();
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDrawOnTap, deck, current]);

  function draw() {
    if (deck.length === 0) return;
    const next = deck[deck.length - 1];
    setDeck((d) => d.slice(0, d.length - 1));
    if (current) setDiscard((ds) => [...ds, current]);
    setCurrent(next);
  }

  function undo() {
    if (!current) return;
    setDeck((d) => [...d, current]);
    setCurrent(discard.length ? discard[discard.length - 1] : null);
    setDiscard((ds) => (ds.length ? ds.slice(0, ds.length - 1) : ds));
  }

  function newGame() {
    const all = [...deck, ...discard, ...(current ? [current] : [])];
    setDeck(shuffle(all).map((c) => ({ ...c, id: uid() })));
    setDiscard([]);
    setCurrent(null);
  }

  function rebuildWithConfig(nextCfg) {
    setDeck(shuffle(buildDeck(nextCfg)));
    setDiscard([]);
    setCurrent(null);
  }

  const totals = useMemo(() => {
    const total = deck.length + discard.length + (current ? 1 : 0);
    return { total, remaining: deck.length, drawn: discard.length + (current ? 1 : 0) };
  }, [deck, discard, current]);

  return (
    <div ref={tapRef} className="app">
      <header className="topbar">
        <h1>Candy Land Card Flipper</h1>
      </header>

      <div className="row">
        <button className="btn primary big" onClick={draw}>Flip / Draw</button>
        <button className="btn" onClick={undo} disabled={!current}>↶ Undo</button>
        <button className="btn" onClick={newGame}>🔀 New Game</button>
      </div>

      <section className="card">
        <div className="card-head">
          <div className="title">Current Card</div>
          <div className="muted">{totals.drawn}/{totals.total} drawn</div>
        </div>
        <div className="card-body">
          <div className="current">
            {current ? <RenderCard card={current} large /> : <div className="muted">Tap anywhere or press <b>Flip / Draw</b> to begin</div>}
          </div>
          <div className="footer">
            <label className="switch">
              <input type="checkbox" checked={autoDrawOnTap} onChange={(e) => setAutoDrawOnTap(e.target.checked)} />
              Tap anywhere to draw
            </label>
            <div className="muted">{totals.remaining} left in deck</div>
          </div>
        </div>
      </section>

      <Settings
        config={config}
        onChange={(next) => { setConfig(next); rebuildWithConfig(next); }}
      />

      <section className="pile">
        <div className="title">Discard Pile</div>
        <div className="discard">
          {discard.length === 0 ? <div className="muted">Nothing here yet.</div> :
            discard.map((c) => (
              <div key={c.id} className="mini"><RenderCard card={c} /></div>
            ))
          }
        </div>
      </section>
    </div>
  );
}

function RenderCard({ card, large = false }) {
  if (card.kind === "special") {
    return (
      <div className={large ? "special special-lg" : "special"}>
        <div className="special-label">SPECIAL</div>
        <div className="special-text">{card.label}</div>
      </div>
    );
  }
  const color = COLORS.find((c) => c.name === card.color);
  if (card.kind === "single") {
    return (
      <div className={large ? "chip chip-lg" : "chip"} style={{ background: color.css }} />
    );
  }
  // double
  return (
    <div className={large ? "double double-lg" : "double"}>
      <div className="chip" style={{ background: color.css }} />
      <div className="chip" style={{ background: color.css }} />
    </div>
  );
}

function Settings({ config, onChange }) {
  const [singles, setSingles] = useState(config.singlesPerColor);
  const [doubles, setDoubles] = useState(config.doublesPerColor);
  const [specialsText, setSpecialsText] = useState(config.specials.join("\n"));

  useEffect(() => {
    setSingles(config.singlesPerColor);
    setDoubles(config.doublesPerColor);
    setSpecialsText(config.specials.join("\n"));
  }, [config]);

  function apply() {
    const next = {
      singlesPerColor: clamp(+singles, 0, 20),
      doublesPerColor: clamp(+doubles, 0, 20),
      specials: specialsText.split(/\n+/).map((s) => s.trim()).filter(Boolean),
    };
    onChange(next);
  }

  return (
    <section className="card">
      <div className="card-head"><div className="title">Deck Settings</div></div>
      <div className="card-body">
        <div className="grid3">
          <div>
            <label className="label">Singles per color</label>
            <input className="input" type="number" min="0" max="20" value={singles} onChange={(e) => setSingles(e.target.value)} />
          </div>
          <div>
            <label className="label">Doubles per color</label>
            <input className="input" type="number" min="0" max="20" value={doubles} onChange={(e) => setDoubles(e.target.value)} />
          </div>
          <div className="align-end">
            <button className="btn" onClick={apply}>Apply & Shuffle</button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="label">Special cards (one per line)</label>
          <textarea className="textarea" value={specialsText} onChange={(e) => setSpecialsText(e.target.value)} />
          <div className="muted">Tip: Edit to match your physical deck.</div>
        </div>
      </div>
    </section>
  );
}

function clamp(n, min, max) {
  const num = Number.isFinite(n) ? n : min;
  return Math.max(min, Math.min(max, num));
}
