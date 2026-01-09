import React, { useMemo, useState } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/survey-core.min.css";

// ----------------------------
// Questionnaire (no acronyms)
// ----------------------------
const surveyJson = {
  title: "Rusty Patched Bumble Bee Screening Tool",
  showProgressBar: "top",
  progressBarType: "pages",
  showQuestionNumbers: "off",
  pages: [
    {
      name: "projectInfo",
      title: "Project information",
      elements: [
        { type: "text", name: "project_name", title: "Project name / ID" },
        { type: "text", name: "agency_applicant", title: "Agency / applicant" },
        { type: "text", name: "state", title: "State" },
        { type: "text", name: "county", title: "County" },
      ],
    },
    {
      name: "esaTrigger",
      title: "Endangered Species Act Section 7 trigger",
      elements: [
        {
          type: "radiogroup",
          name: "federal_nexus",
          title:
            "Is this a federal action, or a non-federal action with federal funding, authorization, or permit involvement (a federal nexus)?",
          choices: ["Yes", "No"],
          isRequired: true,
        },
      ],
    },
    {
      name: "hpz",
      title: "Rusty patched bumble bee screening",
      visibleIf: "{federal_nexus} = 'Yes'",
      elements: [
        {
          type: "radiogroup",
          name: "hpz_overlap",
          title:
            "Does the action area overlap a rusty patched bumble bee High Potential Zone (for example, based on Information for Planning and Consultation results)?",
          choices: ["Yes", "No", "Not sure"],
          isRequired: true,
        },
        {
          type: "radiogroup",
          name: "habitat_present",
          visibleIf: "{hpz_overlap} = 'Yes'",
          title:
            "Does the action area contain rusty patched bumble bee habitat (nesting, foraging, or overwintering habitat)?",
          description:
            "Examples: upland forests (overwintering), grasslands/shrublands/edges (nesting), and areas with season-long flowering resources (foraging).",
          choices: ["Yes", "No", "Not sure"],
          isRequired: true,
        },
      ],
    },
    {
      name: "activities",
      title: "Project activities",
      visibleIf: "{federal_nexus} = 'Yes' and {hpz_overlap} = 'Yes' and {habitat_present} = 'Yes'",
      elements: [
        {
          type: "checkbox",
          name: "activities_selected",
          title:
            "Which activities are included in the action or are reasonably certain to occur? (Select all that apply.)",
          choices: [
            "Ground disturbance (grading, trenching, excavation, heavy equipment)",
            "Vegetation management (mowing, brush cutting, tree removal, haying, grazing)",
            "Prescribed fire",
            "Herbicide application",
            "Insecticide application",
            "Fungicide application",
            "New road or rail construction",
            "Added lanes or major road expansion",
            "Project increases traffic near habitat",
            "Managed or commercial bees introduced (honey bees or managed bumble bees)",
            "Seed collection from native flowering plants",
            "Rodent control affecting native rodents or burrows",
            "Drainage changes or increased surface flooding or soil saturation",
          ],
          isRequired: true,
        },
      ],
    },
    {
      name: "timing",
      title: "Timing and season",
      visibleIf: "{activities_selected.length} > 0",
      elements: [
        {
          type: "radiogroup",
          name: "active_season_work",
          title:
            "Will any work occur during the rusty patched bumble bee active flight period (spring through fall)?",
          choices: ["Yes", "No", "Not sure"],
          isRequired: true,
        },
        {
          type: "radiogroup",
          name: "overwinter_season_ground",
          title:
            "Will ground disturbance occur during the overwintering period (late fall through early spring)?",
          choices: ["Yes", "No", "Not sure"],
          isRequired: true,
        },
      ],
    },
    {
      name: "forage",
      title: "Forage habitat effects",
      visibleIf:
        "{activities_selected} contains 'Vegetation management (mowing, brush cutting, tree removal, haying, grazing)' or {activities_selected} contains 'Prescribed fire'",
      elements: [
        {
          type: "radiogroup",
          name: "forage_unavailable",
          title:
            "Will the action remove flowering plants, reduce blooms, or otherwise make forage unavailable (even temporarily)?",
          choices: ["Yes", "No", "Not sure"],
          isRequired: true,
        },
        {
          type: "text",
          name: "forage_acres",
          visibleIf: "{forage_unavailable} = 'Yes'",
          title: "Acres of foraging habitat affected within the High Potential Zone (if known)",
          inputType: "number",
          min: 0,
        },
      ],
    },
    {
      name: "chemicals",
      title: "Chemical use details",
      visibleIf:
        "{activities_selected} contains 'Herbicide application' or {activities_selected} contains 'Insecticide application' or {activities_selected} contains 'Fungicide application'",
      elements: [
        {
          type: "radiogroup",
          name: "insecticide_used",
          visibleIf: "{activities_selected} contains 'Insecticide application'",
          title: "Will insecticides be applied in or near habitat within the High Potential Zone?",
          choices: ["Yes", "No", "Not sure"],
          isRequired: true,
        },
        {
          type: "radiogroup",
          name: "fungicide_used",
          visibleIf: "{activities_selected} contains 'Fungicide application'",
          title: "Will fungicides be applied in or near habitat within the High Potential Zone?",
          choices: ["Yes", "No", "Not sure"],
          isRequired: true,
        },
        {
          type: "radiogroup",
          name: "herbicide_used",
          visibleIf: "{activities_selected} contains 'Herbicide application'",
          title: "Will herbicides be applied in or near habitat within the High Potential Zone?",
          choices: ["Yes", "No", "Not sure"],
          isRequired: true,
        },
        {
          type: "radiogroup",
          name: "herbicide_method",
          visibleIf: "{herbicide_used} = 'Yes'",
          title: "Herbicide method",
          choices: [
            "Spot-only (wicking, glove, cut-stump, basal bark, limited spot spray)",
            "Broadcast (boom, aerial, widespread application)",
            "Not sure",
          ],
          isRequired: true,
        },
        {
          type: "radiogroup",
          name: "herbicide_exposure_risk",
          visibleIf: "{herbicide_used} = 'Yes'",
          title:
            "Could herbicide contact bees directly (applied when bees are likely active/foraging or when flowering plants are present)?",
          choices: ["Yes", "No", "Not sure"],
          isRequired: true,
        },
      ],
    },
  ],
};

// ----------------------------
// Scoring logic (risk + confidence)
// ----------------------------
function clampScore(x) {
  const n = Math.round(Number(x) || 0);
  return Math.max(0, Math.min(100, n));
}
function confidenceFromUnknowns(unknowns) {
  if (unknowns >= 3) return "Low";
  if (unknowns >= 1) return "Medium";
  return "High";
}

function computeOutcomeAndRisk(data) {
  // Gate: federal nexus
  if (data.federal_nexus !== "Yes") {
    return {
      determination: "Outside Endangered Species Act Section 7 screening (no federal nexus)",
      riskScore: 0,
      unknowns: 0,
      drivers: [{ label: "No federal nexus", points: 0, detail: "Endangered Species Act Section 7 consultation applies to federal actions or actions with federal involvement." }],
      triggers: ["No federal nexus identified"],
    };
  }

  // Gate: High Potential Zone overlap
  if (data.hpz_overlap === "No") {
    return {
      determination: "No Effect",
      riskScore: 0,
      unknowns: 0,
      drivers: [{ label: "Outside High Potential Zone", points: 0, detail: "Action area reported outside the High Potential Zone." }],
      triggers: ["No High Potential Zone overlap reported"],
    };
  }

  if (data.hpz_overlap === "Not sure") {
    return {
      determination: "May Affect—Contact U.S. Fish and Wildlife Service",
      riskScore: 55,
      unknowns: 3,
      drivers: [{ label: "High Potential Zone overlap uncertain", points: 55, detail: "Presence and exposure pathways cannot be ruled out without confirming overlap." }],
      triggers: ["High Potential Zone overlap is unknown"],
    };
  }

  // Gate: habitat
  if (data.habitat_present === "No") {
    return {
      determination: "No Effect",
      riskScore: 5,
      unknowns: 1,
      drivers: [{ label: "No habitat reported", points: 5, detail: "Tool assumes effects are unlikely without habitat; confirm screening rationale in the record." }],
      triggers: ["No suitable habitat reported"],
    };
  }

  if (data.habitat_present === "Not sure") {
    return {
      determination: "May Affect—Contact U.S. Fish and Wildlife Service",
      riskScore: 55,
      unknowns: 3,
      drivers: [{ label: "Habitat presence uncertain", points: 55, detail: "Exposure pathways cannot be ruled out without confirming habitat presence." }],
      triggers: ["Habitat presence is unknown"],
    };
  }

  // Inside High Potential Zone + habitat present
  let risk = 10;
  let unknowns = 0;
  const drivers = [
    { label: "Baseline: High Potential Zone overlap and habitat present", points: 10, detail: "Exposure pathways are plausible and warrant stressor screening." },
  ];
  const triggers = [];

  const acts = data.activities_selected || [];

  const addUnknown = (label, pts) => {
    unknowns += 1;
    risk += pts;
    drivers.push({ label, points: pts, detail: "Critical uncertainty increases screening risk and reduces confidence." });
    triggers.push(label);
  };

  // Timing uncertainty penalties
  if (data.active_season_work === "Not sure") addUnknown("Active-season timing is uncertain", 7);
  if (data.overwinter_season_ground === "Not sure") addUnknown("Overwintering-season ground disturbance timing is uncertain", 7);

  // High-risk: insecticide/fungicide
  if ((acts.includes("Insecticide application") && data.insecticide_used !== "No") ||
      (acts.includes("Fungicide application") && data.fungicide_used !== "No")) {
    risk += 60;
    drivers.push({
      label: "Pesticide exposure risk (insecticide or fungicide)",
      points: 60,
      detail: "Any insecticide or fungicide use in or near habitat within the High Potential Zone is treated as high risk.",
    });
    triggers.push("Insecticide and/or fungicide application in or near habitat within the High Potential Zone");
    return {
      determination: "May Affect, Likely to Adversely Affect",
      riskScore: clampScore(risk),
      unknowns,
      drivers: drivers.sort((a, b) => b.points - a.points),
      triggers,
    };
  }

  // Herbicides
  if (acts.includes("Herbicide application") && data.herbicide_used === "Yes") {
    if (data.herbicide_method === "Broadcast (boom, aerial, widespread application)" ||
        data.herbicide_method === "Not sure" ||
        data.herbicide_exposure_risk === "Yes" ||
        data.herbicide_exposure_risk === "Not sure") {
      risk += 35;
      drivers.push({
        label: "Herbicide exposure or forage-loss pathway",
        points: 35,
        detail: "Broadcast method, uncertain method, or potential direct exposure increases risk and typically warrants coordination.",
      });
      triggers.push("Herbicide application pathway suggests elevated risk");
      return {
        determination: "May Affect, Likely to Adversely Affect",
        riskScore: clampScore(risk),
        unknowns,
        drivers: drivers.sort((a, b) => b.points - a.points),
        triggers,
      };
    } else {
      risk += 10;
      drivers.push({
        label: "Spot-only herbicide use with reported exposure controls",
        points: 10,
        detail: "Spot-only methods with timing controls are lower risk than broadcast applications, but still require avoidance measures.",
      });
      triggers.push("Spot-only herbicide use reported");
    }
  } else if (acts.includes("Herbicide application") && data.herbicide_used === "Not sure") {
    addUnknown("Herbicide use is uncertain", 10);
  }

  // Forage threshold: >=2 acres defaults to coordination (May Affect—Contact)
  if (data.forage_unavailable === "Yes") {
    const fa = (data.forage_acres !== undefined && data.forage_acres !== "") ? Number(data.forage_acres) : null;
    if (fa === null || Number.isNaN(fa)) {
      addUnknown("Forage habitat acres affected not provided", 10);
    } else if (fa >= 2.0) {
      risk += 25;
      drivers.push({
        label: "Forage habitat affected is 2 acres or more (default coordination threshold)",
        points: 25,
        detail: "This meets the tool’s default coordination threshold for forage impacts (2 acres or more).",
      });
      triggers.push("Forage habitat affected is 2 acres or more (default coordination threshold)");
      return {
        determination: "May Affect—Contact U.S. Fish and Wildlife Service",
        riskScore: clampScore(risk),
        unknowns,
        drivers: drivers.sort((a, b) => b.points - a.points),
        triggers,
      };
    } else {
      risk += 10;
      drivers.push({
        label: "Forage habitat affected is less than 2 acres",
        points: 10,
        detail: "Below the default coordination threshold, but still a potential pathway depending on timing and floral continuity.",
      });
      triggers.push("Forage habitat affected is less than 2 acres");
    }
  } else if (data.forage_unavailable === "Not sure") {
    addUnknown("Forage effects are uncertain", 8);
  }

  const confidence = confidenceFromUnknowns(unknowns);

  return {
    determination: "May Affect, Not Likely to Adversely Affect",
    riskScore: clampScore(risk),
    unknowns,
    drivers: drivers.sort((a, b) => b.points - a.points),
    triggers,
    confidence,
  };
}

function buildResultsPackage(data, computed) {
  const confidence = computed.confidence || confidenceFromUnknowns(computed.unknowns || 0);

  const riskBand =
    computed.riskScore >= 70 ? "High" :
    computed.riskScore >= 40 ? "Moderate" :
    "Low";

  const whyText = (() => {
    if (computed.determination.startsWith("Outside")) {
      return "A federal nexus was not identified; Endangered Species Act Section 7 consultation applies to federal actions or actions with federal involvement.";
    }
    if (computed.determination === "No Effect") {
      return "Based on the information provided, overlap with the High Potential Zone and suitable habitat were not both confirmed in a way that indicates plausible effect pathways under this screening.";
    }
    if (computed.determination.includes("Contact")) {
      return "One or more coordination triggers were identified (for example, forage impacts meeting the default acreage threshold or key uncertainties). Coordination is needed to confirm pathways and identify conservation measures.";
    }
    if (computed.determination.includes("Likely to Adversely Affect")) {
      return "One or more high-risk stressors were identified that are commonly associated with adverse effects, such as pesticide exposure risk or elevated chemical exposure pathways.";
    }
    return "The tool evaluated reported activities, timing, and thresholds and did not identify high-risk triggers based on the information provided.";
  })();

  const recommendations = (() => {
    const recs = [];
    recs.push("Confirm the action area and document how it was defined (including indirect effects).");
    recs.push("Confirm High Potential Zone overlap using current planning outputs and retain records in the administrative file.");
    recs.push("Avoid or minimize actions that reduce season-long floral resources; maintain continuous blooming resources across the active season.");

    const labels = (computed.drivers || []).map(d => (d.label || "").toLowerCase());

    if (labels.some(l => l.includes("pesticide"))) {
      recs.push("Avoid insecticide and fungicide use in or near habitat within the High Potential Zone. If unavoidable, coordinate on products, timing, methods, and protective measures.");
    }
    if (labels.some(l => l.includes("herbicide"))) {
      recs.push("Use spot-only herbicide methods where feasible and avoid application when bees are active or when flowering plants are present.");
      recs.push("Avoid broadcast herbicide applications in habitat. If broadcast treatment is necessary, coordinate early to evaluate alternatives, buffers, and post-treatment restoration of native flowering resources.");
    }
    if (labels.some(l => l.includes("forage habitat affected is 2 acres"))) {
      recs.push("Reduce the foraging habitat impact area below 2 acres where feasible, or phase work to maintain continuous floral resources across the active season.");
      recs.push("Incorporate restoration or enhancement of native flowering plants to maintain season-long forage availability before, during, and after the action.");
    }
    if (confidence !== "High") {
      recs.push("Increase confidence by replacing 'Not sure' answers with documented project details (maps, timing windows, chemical application plans, and acreage calculations).");
    }

    return [...new Set(recs)].slice(0, 10);
  })();

  const topDrivers = (computed.drivers || []).slice(0, 6);

  const nextAction = (() => {
    if (computed.determination === "No Effect") {
      return "Document the basis for the No Effect determination in the administrative record; Endangered Species Act Section 7 consultation is not required for this species.";
    }
    if (computed.determination.startsWith("Outside")) {
      return "If federal involvement is later identified (funding, authorization, or permitting), re-run this screening and coordinate as appropriate.";
    }
    if (computed.determination === "May Affect, Not Likely to Adversely Affect") {
      return "Prepare an informal consultation package requesting concurrence, including action area description, habitat screening, timing, avoidance and minimization measures, and the basis for concluding effects are insignificant, discountable, or wholly beneficial.";
    }
    if (computed.determination.includes("Contact")) {
      return "Coordinate with the U.S. Fish and Wildlife Service to confirm effect pathways, evaluate assumptions, and identify conservation measures that may support an informal consultation outcome where appropriate.";
    }
    if (computed.determination.includes("Likely to Adversely Affect")) {
      return "Consider redesigning the action to avoid high-risk stressors; if adverse effects remain likely, initiate formal consultation with the U.S. Fish and Wildlife Service.";
    }
    return "Review and document the result.";
  })();

  const documentationText = [
    `Rusty patched bumble bee (Bombus affinis) screening result: ${computed.determination}.`,
    `Risk score: ${computed.riskScore}/100 (${riskBand} risk). Confidence: ${confidence}.`,
    `Federal nexus: ${data.federal_nexus ?? "Not provided"}. High Potential Zone overlap: ${data.hpz_overlap ?? "Not provided"}. Habitat present: ${data.habitat_present ?? "Not provided"}.`,
    `Activities evaluated: ${(data.activities_selected && data.activities_selected.length) ? data.activities_selected.join(", ") : "None selected"}.`,
    `Timing evaluated: Active-season work: ${data.active_season_work ?? "Not provided"}. Overwintering-season ground disturbance: ${data.overwinter_season_ground ?? "Not provided"}.`,
    `Recommended next action: ${nextAction}`,
  ].join("\n");

  return {
    determination: computed.determination,
    riskScore: computed.riskScore,
    riskBand,
    confidence,
    whyText,
    topDrivers: topDrivers.length ? topDrivers : [{ label: "No specific drivers identified", points: 0, detail: "No additional risk drivers beyond baseline screening." }],
    recommendations,
    nextAction,
    documentationText,
  };
}

export default function App() {
  const [results, setResults] = useState(null);

  const model = useMemo(() => {
    const m = new Model(surveyJson);
    m.onComplete.add((sender) => {
      const computed = computeOutcomeAndRisk(sender.data);
      setResults(buildResultsPackage(sender.data, computed));
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

      {results && (
        <section style={{ marginTop: 18 }}>
          <h3>Results</h3>

          <div style={{ display: "inline-block", padding: "6px 12px", borderRadius: 999, border: "1px solid #ddd", background: "#fafafa", fontWeight: 700 }}>
            {results.determination}
          </div>

          <p><strong>Risk score:</strong> {results.riskScore}/100 ({results.riskBand} risk)</p>
          <p><strong>Confidence:</strong> {results.confidence}</p>

          <p><strong>Agency-formal explanation:</strong> {results.whyText}</p>

          <details open style={{ border: "1px solid #eee", borderRadius: 10, padding: "10px 12px", background: "#fff", marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Top risk drivers (exact point contributions)</summary>
            <ul>
              {results.topDrivers.map((d, idx) => (
                <li key={idx}>
                  <strong>{d.label}</strong> ({d.points > 0 ? "+" : ""}{d.points} points). {d.detail}
                </li>
              ))}
            </ul>
          </details>

          <details open style={{ border: "1px solid #eee", borderRadius: 10, padding: "10px 12px", background: "#fff", marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>How to reduce the risk score (prioritized recommendations)</summary>
            <ul>
              {results.recommendations.map((r, idx) => <li key={idx}>{r}</li>)}
            </ul>
          </details>

          <details style={{ border: "1px solid #eee", borderRadius: 10, padding: "10px 12px", background: "#fff", marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>How the risk score and confidence are calculated</summary>
            <p>
              <strong>Risk score (0–100):</strong> The tool applies an additive screening index.
              After confirming High Potential Zone overlap and suitable habitat, it starts with a baseline score and then adds points for stressors based on typical severity.
              It also adds smaller penalties where critical inputs are uncertain or missing. The final score is capped between 0 and 100.
            </p>
            <p>
              <strong>Confidence:</strong> Confidence reflects completeness of inputs. “High” indicates no critical unknowns;
              “Medium” indicates one to two critical unknowns; “Low” indicates three or more critical unknowns.
            </p>
          </details>

          <p style={{ marginTop: 12 }}><strong>Recommended next action:</strong> {results.nextAction}</p>

          <hr style={{ margin: "14px 0" }} />

          <p><strong>Documentation text (copy/paste):</strong></p>
          <pre style={{ background: "#fcfcfc", border: "1px solid #ddd", borderRadius: 8, padding: 12, whiteSpace: "pre-wrap" }}>
            {results.documentationText}
          </pre>
        </section>
      )}
    </div>
  );
}
