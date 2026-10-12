"use client";

import { useState } from "react";

import {
  runPhase4B6MeasurementGeometryDataAudit,
  type Phase4B6LibraryRun,
} from "../../../lib/math-intelligence/teaching/method-library";

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function SummaryCard({ label, value, good = false }: { label: string; value: string | number; good?: boolean }) {
  return (
    <div style={{
      border: `1px solid ${good ? "#9ad6b1" : "#d7deea"}`,
      background: good ? "#f4fff7" : "#f8fafc",
      borderRadius: 12,
      padding: "12px 14px",
      minWidth: 135,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#101828" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#5c667a", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function Phase4B6MeasurementGeometryDataQA() {
  const [run, setRun] = useState<Phase4B6LibraryRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runAudit(): void {
    try {
      setError(null);
      setRun(runPhase4B6MeasurementGeometryDataAudit());
    } catch (caught) {
      setRun(null);
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <section style={{
      border: "1px solid #dfe5ee",
      borderRadius: 16,
      padding: 18,
      marginTop: 18,
      background: "#ffffff",
      color: "#101828",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#667085" }}>
            PHASE 4B-6 · MEASUREMENT, GEOMETRY, DATA, TIME, MONEY, AVERAGE & SPEED
          </p>
          <h2 style={{ margin: "5px 0 6px", fontSize: 22, color: "#101828" }}>
            Remaining-domain teaching method library
          </h2>
          <p style={{ margin: 0, color: "#667085", maxWidth: 1040, lineHeight: 1.5 }}>
            Validates production TeachingMethod 4B.1 definitions for measurement and unit conversion,
            money, geometry properties and angles, area/perimeter, time, data interpretation, average,
            and speed-distance-time. These are candidate methods only; final method selection remains Phase 4C.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={runAudit} style={{
            border: 0, borderRadius: 10, padding: "10px 14px", fontWeight: 800,
            cursor: "pointer", background: "#17345f", color: "#ffffff",
          }}>
            Run 4B-6 Library QA
          </button>
          <button type="button" disabled={!run} onClick={() => run && downloadJson("phase-4b6-measurement-geometry-data-library.json", run)} style={{
            border: "1px solid #cfd7e3", borderRadius: 10, padding: "10px 14px", fontWeight: 700,
            cursor: run ? "pointer" : "not-allowed", background: "#ffffff", color: "#101828", opacity: run ? 1 : 0.55,
          }}>
            Export 4B-6 JSON
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#fff2f0", color: "#b42318" }}>
          {error}
        </div>
      ) : null}

      {run ? (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <SummaryCard label="Production methods" value={run.summary.methods} good={run.summary.invalidMethods === 0} />
            <SummaryCard label="Families" value={`${run.summary.familiesRepresented}/${run.summary.familiesRequired}`} good={run.summary.familiesRepresented === run.summary.familiesRequired} />
            <SummaryCard label="Variant themes" value={`${run.summary.coveredThemes}/${run.summary.requiredThemes}`} good={run.summary.coveredThemes === run.summary.requiredThemes} />
            <SummaryCard label="Invalid methods" value={run.summary.invalidMethods} good={run.summary.invalidMethods === 0} />
            <SummaryCard label="Cross-library collisions" value={run.summary.duplicateMethodIdsAcross4B3To4B6} good={run.summary.duplicateMethodIdsAcross4B3To4B6 === 0} />
            <SummaryCard label="Candidate probes" value={`${run.summary.candidateProbesPassed}/${run.summary.candidateProbesTotal}`} good={run.summary.candidateProbesPassed === run.summary.candidateProbesTotal} />
            <SummaryCard label="Final gate" value={run.passed ? "PASS" : "FAIL"} good={run.passed} />
          </div>

          <div style={{ marginTop: 16, borderTop: "1px solid #edf0f5" }}>
            {Object.entries(run.checks).map(([key, passed]) => (
              <div key={key} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12, padding: "9px 0", borderBottom: "1px solid #edf0f5",
              }}>
                <span style={{ color: "#344054" }}>{key}</span>
                <strong style={{ color: passed ? "#18794e" : "#b42318" }}>{passed ? "PASS" : "FAIL"}</strong>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18 }}>
            <h3 style={{ margin: "0 0 8px", color: "#101828", fontSize: 16 }}>4B-6 family coverage</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
                <thead>
                  <tr>
                    <th style={th}>Family</th>
                    <th style={th}>Methods</th>
                    <th style={th}>Required themes</th>
                    <th style={th}>Missing</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(run.byFamily).map(([familyId, row]) => (
                    <tr key={familyId}>
                      <td style={td}><strong style={{ color: "#101828" }}>{familyId}</strong></td>
                      <td style={td}>{row.methodCount}</td>
                      <td style={td}>{row.requiredThemes.join(", ")}</td>
                      <td style={td}>
                        <strong style={{ color: row.missingThemes.length === 0 ? "#18794e" : "#b42318" }}>
                          {row.missingThemes.length === 0 ? "None" : row.missingThemes.join(", ")}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <h3 style={{ margin: "0 0 8px", color: "#101828", fontSize: 16 }}>Candidate probes</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                <thead>
                  <tr>
                    <th style={th}>Probe</th>
                    <th style={th}>Expected method</th>
                    <th style={th}>Candidate count</th>
                    <th style={th}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {run.candidateProbes.map((probe) => (
                    <tr key={probe.probeId}>
                      <td style={td}>{probe.probeId}</td>
                      <td style={td}>{probe.expectedMethodId}</td>
                      <td style={td}>{probe.candidateMethodIds.length}</td>
                      <td style={td}>
                        <strong style={{ color: probe.passed ? "#18794e" : "#b42318" }}>
                          {probe.passed ? "PASS" : "FAIL"}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: "#f8fafc", color: "#667085" }}>
          This library audit does not require a saved QA cohort. Run it once after installing Phase 4B-6.
        </div>
      )}
    </section>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 9px",
  fontSize: 11,
  color: "#475467",
  borderBottom: "1px solid #dfe5ee",
};

const td: React.CSSProperties = {
  padding: "8px 9px",
  fontSize: 12,
  color: "#344054",
  borderBottom: "1px solid #edf0f5",
  verticalAlign: "top",
};
