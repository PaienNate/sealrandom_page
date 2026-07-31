# CRNG Human Explanation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the low-value latest pass-rate chart with three plain-language GM/T views and rewrite CRNG metric explanations so non-specialists can read them.

**Architecture:** Keep all generated report data unchanged. Add frontend chart-data builders that derive values from the latest selected report, then render three ECharts instances in the existing latest chart area. Tighten the daily report workflow so UI-only pushes do not trigger a full `s=1000` report run.

**Tech Stack:** Static HTML/CSS/ES modules, ECharts 5, Node `node:test`, Go 1.25.

## Global Constraints

- Keep GM/T 0005-2021 sample count at `s=1000`.
- Do not add backend schema fields for this feature.
- Keep language short, affirmative, and readable by non-specialists.
- Do not say the tests cannot prove something; explain what each metric does and how to read it.
- Heavy report generation should not run for UI-only pushes.

---

### Task 1: Chart Data Builders

**Files:**
- Modify: `docs/assets/app.mjs`
- Test: `docs/assets/app.test.mjs`

**Interfaces:**
- Produces: `buildSampleMarginChartData(report)`, `buildUniformityPTChartData(report)`, `buildPQMapChartData(report)`.
- Consumes: latest report objects whose tests contain `name`, `round_pass_count`, `required_pass_count`, `round_count`, `uniformity_p_value`, `avg_p`, and `avg_q`.

- [ ] **Step 1: Write failing tests**

Add tests asserting:

```js
assert.deepEqual(buildSampleMarginChartData(report), {
  labels: ['单比特频数检测'],
  margins: [7],
  thresholds: [981],
  passCounts: [988],
  roundCounts: [1000],
});
assert.deepEqual(buildUniformityPTChartData(report).values, [0.751865768610652]);
assert.deepEqual(buildPQMapChartData(report).points, [{ name: '单比特频数检测', avgP: 0.51, avgQ: 0.49 }]);
```

- [ ] **Step 2: Run failing tests**

Run: `node --test docs/assets/app.test.mjs --test-name-pattern "latest multidimensional chart data"`

Expected: FAIL because the exported functions do not exist.

- [ ] **Step 3: Implement builders**

Add exported functions near `buildLatestTestBarData`. Sort tests by `testSectionOrder`, drop entries with missing required values, and return plain arrays ready for ECharts.

- [ ] **Step 4: Run tests**

Run: `node --test docs/assets/app.test.mjs --test-name-pattern "latest multidimensional chart data"`

Expected: PASS.

---

### Task 2: Three Latest Charts

**Files:**
- Modify: `docs/index.html`
- Modify: `docs/assets/app.mjs`
- Modify: `docs/assets/app.css`
- Test: `docs/assets/app.test.mjs`

**Interfaces:**
- Consumes: builders from Task 1.
- Produces: three chart containers with ids `sample-margin-chart`, `uniformity-pt-chart`, and `pq-map-chart`.

- [ ] **Step 1: Write failing tests**

Add tests that `docs/index.html` contains all three chart ids and no longer depends on `latest-chart` as the only latest view.

- [ ] **Step 2: Run failing tests**

Run: `node --test docs/assets/app.test.mjs --test-name-pattern "latest multidimensional charts"`

Expected: FAIL because the new chart ids do not exist.

- [ ] **Step 3: Update markup and rendering**

Replace the single latest chart panel with a multi-chart panel. Render:

- Sample margin bar chart with tooltip `比国标门槛多通过 N 组样本`.
- Uniformity PT bar chart with `alphaT=0.0001` mark line and tooltip `PT 高于国标门槛`.
- P/Q scatter chart with tooltip `平均 P / 平均 Q`.

- [ ] **Step 4: Resize support**

Update `resizeCharts()` to include all three new ids.

- [ ] **Step 5: Run tests**

Run: `node --test docs/assets/app.test.mjs`

Expected: PASS.

---

### Task 3: Plain-Language Explanations

**Files:**
- Modify: `docs/assets/app.mjs`
- Test: `docs/assets/app.test.mjs`

**Interfaces:**
- Consumes: `buildMetricHelpItems()`, `TEST_METADATA`, `buildTechnicalGlossaryItems()`.
- Produces: concise Chinese descriptions for all visible metric labels and test cards.

- [ ] **Step 1: Write failing tests**

Add tests requiring the glossary/help text to include phrases like `看这一项`, `怎么看`, `这轮`, `s=1000`, and not include `s=50`.

- [ ] **Step 2: Run failing tests**

Run: `node --test docs/assets/app.test.mjs --test-name-pattern "plain-language"`

Expected: FAIL until copy is rewritten.

- [ ] **Step 3: Rewrite copy**

Rewrite metric help and glossary into short affirmative Chinese. Keep GM/T anchors visible: `P_value`, `Q_value`, `PT`, `alpha=0.01`, `alphaT=0.0001`, `s=1000`.

- [ ] **Step 4: Run tests**

Run: `node --test docs/assets/app.test.mjs --test-name-pattern "plain-language|technical glossary|metric help"`

Expected: PASS.

---

### Task 4: Workflow Trigger Scope

**Files:**
- Modify: `.github/workflows/daily-randomness-report.yml`
- Test: `docs/assets/app.test.mjs`

**Interfaces:**
- Consumes: existing workflow path filters.
- Produces: heavy report generation on schedule/manual/report-generator changes, not UI-only changes.

- [ ] **Step 1: Write failing test**

Extend the workflow test to assert that `docs/assets/**`, `docs/index.html`, and `docs/content/**` are not in the heavy workflow `push.paths` list.

- [ ] **Step 2: Run failing test**

Run: `node --test docs/assets/app.test.mjs --test-name-pattern "daily workflow"`

Expected: FAIL because UI paths are currently included.

- [ ] **Step 3: Update workflow paths**

Keep paths that change generated reports: `.github/workflows/daily-randomness-report.yml`, `bin/randomness-reporter`, `cmd/**`, `config/**`, `internal/**`, `go.mod`, `go.sum`. Remove UI-only paths.

- [ ] **Step 4: Run tests**

Run: `node --test docs/assets/app.test.mjs --test-name-pattern "daily workflow"`

Expected: PASS.

---

### Task 5: Verification

**Files:**
- No new files.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified branch ready to push.

- [ ] **Step 1: Run full frontend tests**

Run: `node --test docs/assets/app.test.mjs`

Expected: all tests pass.

- [ ] **Step 2: Run Go tests**

Run: `go test ./...`

Expected: all packages pass.

- [ ] **Step 3: Build CLI**

Run: `go build ./cmd/randomness-reporter`

Expected: command exits 0.

- [ ] **Step 4: Check workflow status**

Run a GitHub Actions status query for the current `a400ec8` run and record whether it completed, is still generating, or failed.
