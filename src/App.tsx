
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";

// --- Types
type Party = {
  id: string;
  name: string;
  firstRoundVotes: number; // absolute votes in first round
  isFinalist?: boolean; // one of two finalists
  lockedToBlank?: boolean; // e.g., fixed "Blanco"
};

// --- Seed data (you can edit these in the UI)
const seedParties: Party[] = [
  { id: "ap", name: "AP", firstRoundVotes: 456002 },
  { id: "lyp", name: "LYP ADN", firstRoundVotes: 77576 },
  { id: "apb", name: "APB SÚMATE", firstRoundVotes: 361640 },
  { id: "lib", name: "LIBRE", firstRoundVotes: 1430176, isFinalist: true },
  { id: "fp", name: "FP", firstRoundVotes: 89253 },
  { id: "mas", name: "MAS-IPSP", firstRoundVotes: 169887 },
  { id: "uni", name: "UNIDAD", firstRoundVotes: 1054568 },
  { id: "pdc", name: "PDC", firstRoundVotes: 1717432, isFinalist: true },
  { id: "nul", name: "Nulo", firstRoundVotes: 1371049 },
  { id: "bla", name: "Blanco (fijo)", firstRoundVotes: 172835, lockedToBlank: true },
];

const pct = (num: number, den: number) => (den > 0 ? (100 * num) / den : 0);
const fmt = new Intl.NumberFormat();
const fmtPct = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export default function App() {
  const [parties, setParties] = useState<Party[]>(seedParties);

  // Identify finalists (exactly two expected)
  const finalists = parties.filter((p) => p.isFinalist);
  const [leftFinal, rightFinal] = finalists;

  // Per-party transfer settings: how much of this party's first-round vote transfers to each finalist, becomes Blank, or stays Invalid (Nulo)
  // Stored as percentages in [0,100], must sum to 100 for each party (except finalists and Blanco locked rows where UI is limited)
  type Transfers = Record<string, { toLeft: number; toRight: number; toBlank: number; toNull: number }>;
  const initialTransfers: Transfers = Object.fromEntries(
    parties.map((p) => [p.id, { toLeft: 50, toRight: 50, toBlank: 0, toNull: 0 }])
  );
  const [transfers, setTransfers] = useState<Transfers>(initialTransfers);

  // Allow editing first round votes quickly
  const totalVotes1 = useMemo(
    () => parties.reduce((acc, p) => acc + p.firstRoundVotes, 0),
    [parties]
  );

  // Helper to update a transfer cell and renormalize to keep 0-100 sum
  function setTransfer(
    partyId: string,
    field: keyof Transfers[string],
    value: number
  ) {
    setTransfers((prev) => {
      const cur = prev[partyId] || { toLeft: 0, toRight: 0, toBlank: 0, toNull: 0 };
      const clamped = Math.max(0, Math.min(100, value));
      // Keep other fields proportional when one field changes to maintain 100 total
      const others: Array<[keyof Transfers[string], number]> = Object.entries(cur)
        .filter(([k]) => k !== field)
        .map(([k, v]) => [k as keyof Transfers[string], v as number]);
      const sumOthers = others.reduce((a, [, v]) => a + v, 0);
      const newTotalOthers = 100 - clamped;
      const scaledOthers = others.map(([k, v]) => [k, sumOthers > 0 ? (v * newTotalOthers) / sumOthers : (newTotalOthers / others.length) || 0]) as Array<[
        keyof Transfers[string],
        number
      ]>;
      const next = Object.fromEntries([[field, clamped], ...scaledOthers]) as Transfers[string];
      return { ...prev, [partyId]: next };
    });
  }

  // Compute second round totals from transfers
  const results = useMemo(() => {
    let left = 0;
    let right = 0;
    let blank = 0;
    let nul = 0;

    for (const p of parties) {
      const t = transfers[p.id] || { toLeft: 0, toRight: 0, toBlank: 0, toNull: 0 };
      const V = p.firstRoundVotes;

      if (p.lockedToBlank) {
        blank += V; // fixed blank votes carry through
        continue;
      }
      if (p.isFinalist) {
        // finalist voters generally stay with their finalist by default (100% to their side). Allow tweak via UI below if desired.
        left += p.id === leftFinal?.id ? V : 0;
        right += p.id === rightFinal?.id ? V : 0;
        continue;
      }

      left += (t.toLeft / 100) * V;
      right += (t.toRight / 100) * V;
      blank += (t.toBlank / 100) * V;
      nul += (t.toNull / 100) * V;
    }

    const cast = left + right + blank + nul;
    const valid = left + right; // valid in runoff, excluding blank & null
    return { left, right, blank, nul, cast, valid };
  }, [parties, transfers, leftFinal?.id, rightFinal?.id]);

  function resetAll() {
    setParties(seedParties);
    setTransfers(Object.fromEntries(seedParties.map((p) => [p.id, { toLeft: 50, toRight: 50, toBlank: 0, toNull: 0 }])) as Transfers);
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Simulador de Segunda Vuelta (Clon)</h1>
            <p className="text-sm text-slate-600">Arrastra o ajusta porcentajes de transferencia para ver resultados del balotaje.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={resetAll} className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-sm">Resetear</button>
          </div>
        </header>

        {/* Results */}
        <section className="grid md:grid-cols-3 gap-4">
          <Card title={`Resultados balotaje`}>
            <div className="space-y-2">
              <ResultRow label={leftFinal?.name || "Finalista A"} value={results.left} pct={pct(results.left, results.valid)} highlight="left" />
              <ResultRow label={rightFinal?.name || "Finalista B"} value={results.right} pct={pct(results.right, results.valid)} highlight="right" />
              <div className="h-2" />
              <ResultRow label="Blanco" value={results.blank} pct={pct(results.blank, results.cast)} muted />
              <ResultRow label="Nulo" value={results.nul} pct={pct(results.nul, results.cast)} muted />
              <div className="text-xs text-slate-500 pt-2">% sobre válidos para finalistas; % sobre emitidos para blanco/nulo.</div>
            </div>
          </Card>

          <Card title="Barras (válidos)">
            <BarCompare left={pct(results.left, results.valid)} right={pct(results.right, results.valid)} leftLabel={leftFinal?.name || "A"} rightLabel={rightFinal?.name || "B"} />
            <div className="mt-3 grid grid-cols-2 text-xs text-slate-600">
              <div>Válidos: {fmt.format(Math.round(results.valid))}</div>
              <div className="text-right">Emitidos: {fmt.format(Math.round(results.cast))}</div>
            </div>
          </Card>

          <Card title="Parámetros globales">
            <div className="text-sm text-slate-700 space-y-1">
              <div>Total 1ª vuelta: <b>{fmt.format(totalVotes1)}</b></div>
              <div>Finalistas: <b>{leftFinal?.name}</b> vs <b>{rightFinal?.name}</b></div>
              <div className="text-xs text-slate-500">Edita votos de 1ª vuelta o cambia finalistas en la tabla.</div>
            </div>
          </Card>
        </section>

        {/* First-round table + transfer controls */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Resultados 1ª vuelta y transferencias</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <Th>Partido</Th>
                  <Th className="text-right">Votos 1ª vuelta</Th>
                  <Th className="text-center">Finalista</Th>
                  <Th className="text-center">→ {leftFinal?.name || "A"}</Th>
                  <Th className="text-center">→ {rightFinal?.name || "B"}</Th>
                  <Th className="text-center">→ Blanco</Th>
                  <Th className="text-center">→ Nulo</Th>
                </tr>
              </thead>
              <tbody>
                {parties.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <Td>
                      <div className="font-medium">{p.name}</div>
                    </Td>

                    <Td className="text-right">
                      <input
                        type="number"
                        className="w-28 text-right bg-slate-50 border rounded-lg px-2 py-1"
                        value={p.firstRoundVotes}
                        onChange={(e) =>
                          setParties((prev) => prev.map((x) => (x.id === p.id ? { ...x, firstRoundVotes: Math.max(0, Number(e.target.value || 0)) } : x)))
                        }
                        disabled={false}
                      />
                    </Td>

                    <Td className="text-center">
                      <label className="inline-flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={Boolean(p.isFinalist)}
                          onChange={(e) =>
                            setParties((prev) => prev.map((x) => (x.id === p.id ? { ...x, isFinalist: e.target.checked } : x)))
                          }
                          disabled={p.lockedToBlank}
                        />
                        <span className="select-none">Finalista</span>
                      </label>
                    </Td>

                    {/* Transfer sliders */}
                    {p.lockedToBlank ? (
                      <Td className="text-center text-slate-400" colSpan={4}>Fijo a Blanco</Td>
                    ) : p.isFinalist ? (
                      <Td className="text-center text-slate-400" colSpan={4}>Electores permanecen con su finalista</Td>
                    ) : (
                      <>
                        <Td>
                          <SliderCell value={transfers[p.id]?.toLeft ?? 0} onChange={(v) => setTransfer(p.id, "toLeft", v)} label="%" />
                        </Td>
                        <Td>
                          <SliderCell value={transfers[p.id]?.toRight ?? 0} onChange={(v) => setTransfer(p.id, "toRight", v)} label="%" />
                        </Td>
                        <Td>
                          <SliderCell value={transfers[p.id]?.toBlank ?? 0} onChange={(v) => setTransfer(p.id, "toBlank", v)} label="%" />
                        </Td>
                        <Td>
                          <SliderCell value={transfers[p.id]?.toNull ?? 0} onChange={(v) => setTransfer(p.id, "toNull", v)} label="%" />
                        </Td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* How to use */}
        <section className="mt-6">
          <details className="bg-white border border-slate-200 rounded-2xl p-4">
            <summary className="font-semibold cursor-pointer">Cómo usar</summary>
            <ul className="list-disc pl-5 mt-2 text-sm text-slate-700 space-y-1">
              <li>Edita los votos de 1ª vuelta o marca dos partidos como finalistas.</li>
              <li>Para cada partido no finalista, ajusta qué % migra a cada finalista, a Blanco o Nulo.</li>
              <li>Los porcentajes de cada fila siempre suman 100%. Al mover uno, los otros se reescalan automáticamente.</li>
              <li>Observa el panel de resultados: totales absolutos y porcentajes sobre votos válidos/emitidos.</li>
            </ul>
          </details>
        </section>

        <footer className="mt-10 text-center text-xs text-slate-500">
          Construido con React + Tailwind. Este es un clon educativo y puede personalizarse.
        </footer>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
      <div className="text-sm font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`p-3 text-left text-xs font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`p-3 align-middle ${className}`}>{children}</td>;
}

function ResultRow({ label, value, pct, highlight, muted }: { label: string; value: number; pct: number; highlight?: "left" | "right"; muted?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <div className={`font-medium ${muted ? "text-slate-500" : ""}`}>{label}</div>
        <div className={`${muted ? "text-slate-500" : "font-semibold"}`}>{fmt.format(Math.round(value))} ({fmtPct.format(pct)}%)</div>
      </div>
      {!muted && (
        <div className="mt-1 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-2 ${highlight === "left" ? "bg-blue-500" : "bg-emerald-500"}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      )}
    </div>
  );
}

function BarCompare({ left, right, leftLabel, rightLabel }: { left: number; right: number; leftLabel: string; rightLabel: string }) {
  const L = Math.max(0, Math.min(100, left));
  const R = Math.max(0, Math.min(100, right));
  return (
    <div>
      <div className="text-xs flex justify-between mb-1"><span>{leftLabel}</span><span>{rightLabel}</span></div>
      <div className="w-full h-6 bg-slate-100 rounded-full overflow-hidden flex">
        <motion.div className="h-6 bg-blue-500" initial={{ width: 0 }} animate={{ width: `${L}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        <motion.div className="h-6 bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${R}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </div>
      <div className="mt-1 text-xs text-slate-700 text-center">{fmtPct.format(L)}% vs {fmtPct.format(R)}%</div>
    </div>
  );
}

function SliderCell({ value, onChange, label }: { value: number; onChange: (v: number) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-40"
      />
      <input
        type="number"
        className="w-16 text-right bg-slate-50 border rounded-lg px-2 py-1"
        value={Math.round(value)}
        min={0}
        max={100}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}
