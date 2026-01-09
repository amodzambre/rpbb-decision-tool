import React, { useMemo, useState } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/survey-core.min.css";

import surveyJson from "./survey.json";
import ruleset from "./decision-rules.json";
import { evaluateDecision } from "./decisionEngine.js";

function buildDocumentationText(data, result) {
  const activities = Array.isArray(data.activities_selected) && data.activities_selected.length
    ? data.activities_selected.join(", ")
    : "None selected";

  return [
    `Rusty patched bumble bee (Bombus affinis) screening result: ${result.determination}.`,
    `Risk score: ${result.riskScore}/100 (${result.riskBand} risk). Confidence: ${result.confidence}.`,
    `Federal nexus: ${data.federal_nexus ?? "Not provided"}. High Potential Zone overlap: ${data.hpz_overlap ?? "Not provided"}. Habitat present: ${data.habitat_present ?? "Not provided"}.`,
    `Activities evaluated: ${activities}.`,
    `Timing evaluated: Active-season work: ${data.active_season_work ?? "Not provided"}. Overwintering-season ground disturbance: ${data.overwinter_season_ground ?? "Not provided"}.`,
    `Recommended next action: ${result.nextAction}`
  ].join("\n");
}

export default function App() {
  const [result, setResult] = useState(null);
  const [docText, setDocText] = useState("");

  const model = useMemo(() => {
    const m = new Model(surveyJson);
    m.onComplete.add((sender) => {
      const r = evaluateDecision(sender.data, ruleset);
      setResult(r);
      setDocText(buildDocumentationText(sender.data, r));
    });
    return m;
  }, []);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 18, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}>
      <header style={{ marginBottom: 12 }}>
        <h2 style={{ margin: "6px 0" }}>
          Rusty Patched Bumble Bee (Bombus affinis) — Endangered Species Act Section 7 Screening Tool
        </h2>
        <p style={{ margin: "6px 0", opacity: 0.9 }}>
          This tool generates a screening determination, a risk score, and confidence based on user inputs.
          It does not replace coordination with the U.S. Fish and Wildlife Service.
        </p>
      </header>

      <Survey model={model} />

      {result && (
        <section style={{ marginTop: 18 }}>
          <h3>Results</h3>

          <div style={{ display: "inline-block", padding: "6px 12px", borderRadius: 999, border: "1px solid #ddd", background: "#fafafa", fontWeight: 700 }}>
            {result.determination}
          </div>

          <p><strong>Risk score:</strong> {result.riskScore}/100 ({result.riskBand} risk)</p>
          <p><strong>Confidence:</strong> {result.confidence}</p>

          <p><strong>Agency-formal explanation:</strong> {result.whyText}</p>

          <details open style={{ border: "1px solid #eee", borderRadius: 10, padding: "10px 12px", background: "#fff", marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Top risk drivers (point contributions)</summary>
            <ul>
              {(result.drivers || []).slice(0, 8).map((d, idx) => (
                <li key={idx}>
                  <strong>{d.label}</strong> ({d.points > 0 ? "+" : ""}{d.points} points). {d.detail}
                </li>
              ))}
            </ul>
          </details>

          <details open style={{ border: "1px solid #eee", borderRadius: 10, padding: "10px 12px", background: "#fff", marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>How to reduce the risk score (prioritized recommendations)</summary>
            <ul>
              {(result.recommendations || []).slice(0, 12).map((r, idx) => <li key={idx}>{r}</li>)}
            </ul>
          </details>

          <details style={{ border: "1px solid #eee", borderRadius: 10, padding: "10px 12px", background: "#fff", marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>How the risk score and confidence are calculated</summary>
            <p>
              <strong>Risk score (0–100):</strong> The tool applies an additive screening index. It begins with a baseline score
              when High Potential Zone overlap and suitable habitat are present, then adds points for stressors and for critical uncertainties.
              The final score is capped between 0 and 100.
            </p>
            <p>
              <strong>Confidence:</strong> Confidence reflects completeness of inputs. “High” indicates no critical unknowns;
              “Medium” indicates one to two critical unknowns; “Low” indicates three or more critical unknowns.
            </p>
          </details>

          <p style={{ marginTop: 12 }}><strong>Recommended next action:</strong> {result.nextAction}</p>

          <hr style={{ margin: "14px 0" }} />

          <p><strong>Documentation text (copy/paste):</strong></p>
          <pre style={{ background: "#fcfcfc", border: "1px solid #ddd", borderRadius: 8, padding: 12, whiteSpace: "pre-wrap" }}>
            {docText}
          </pre>
        </section>
      )}
    </div>
  );
}
