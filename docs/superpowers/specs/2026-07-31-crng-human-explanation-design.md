# CRNG Human Explanation Design

## Goal

Make the latest `crng` report readable for non-specialists without weakening the GM/T 0005-2021 meaning. The page should explain what each metric is for, how to read it, and what the current run says. Replace the low-value latest pass-rate bar chart with three charts that show different aspects of the same national-standard run.

## Scope

- Rewrite metric help and test descriptions into concise, plain Chinese.
- Keep the GM/T terms visible where they anchor the judgment: `P_value`, `Q_value`, `PT`, `alpha=0.01`, `alphaT=0.0001`, `s=1000`.
- Replace the latest horizontal pass-rate bar chart with three charts:
  - Sample margin: `round_pass_count - required_pass_count` for each test.
  - Uniformity PT: each test's `uniformity_p_value`, with the `alphaT=0.0001` threshold visible.
  - P/Q map: each test as one point using average `P` and average `Q`.
- Keep the existing trend chart and detailed per-test cards.
- Keep `s=1000`; do not reduce the sample count to make CI faster.
- Stop triggering the heavy daily report workflow for UI-only changes. Report generation should run on schedule, manual dispatch, and generator/config/binary changes.

## Reader Experience

For each national-standard test, the reader should be able to answer three questions quickly:

- What does this test look at?
- Which number should I read first?
- What does the latest CRNG run suggest?

The tone should be like a science explainer: short, concrete, and affirmative. Avoid framing around what the test cannot prove. Explain what the metric does and how to interpret it.

## Data Flow

No backend schema change is required. The frontend already receives these fields from `manifest.json`:

- `pass_rate`
- `round_pass_count`
- `required_pass_count`
- `round_count`
- `uniformity_p_value`
- `avg_p`
- `avg_q`
- optional `avg_p2` / `avg_q2`
- `latest_p`
- `latest_q`

The new chart builders should derive their series directly from the latest selected report.

## UI Changes

Rename the latest chart area to something like `最新一轮多维观察` and render three chart containers. Each chart should include a short subtitle in plain Chinese. Tooltips should avoid raw jargon dumps and use sentences such as `比门槛多通过 7 组样本` or `PT 高于国标门槛`.

The detailed cards should keep the same structure but use plain-language summaries and metric explanations. The text should remain concise enough to scan.

## CI Behavior

The 1000-sample run is intentionally heavy. A local full run after reader-source batching took about 35 minutes. GitHub Actions can be slower, so UI-only pushes should not start report generation. The daily report workflow should keep schedule and manual triggers, and keep push triggers only for files that can change generated report semantics or the committed generator binary.

## Tests

- Add frontend tests for the three chart data builders.
- Add tests that the technical glossary and metric help use plain-language `s=1000` wording and no longer mention `s=50`.
- Add a workflow test that UI-only paths are not part of the heavy report workflow trigger.
- Run `go test ./...`, `node --test docs/assets/app.test.mjs`, and `go build ./cmd/randomness-reporter`.
