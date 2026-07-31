# Insecure Random Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unsafe MT19937 and LCG sources, generate proof sidecars, and show browser-side prediction proofs on the dashboard.

**Architecture:** Extend existing source registration with two deterministic PRNG implementations and a small optional proof interface. Reports and manifest carry security metadata plus a proof path. The static dashboard reads the proof JSON and runs the reverse/prediction logic in JavaScript.

**Tech Stack:** Go 1.25, static GitHub Pages, vanilla ES modules, Node test runner, ECharts.

## Global Constraints

- Python default `random` algorithm family must be represented by MT19937 Mersenne Twister.
- Unsafe sources must be visibly marked unsafe; unsafe algorithm text must be red.
- Proof data must be small sidecar JSON, not a dump of the full GM/T test samples.
- Existing secure sources and Hybrid behavior must not change.

---

### Task 1: Source Metadata and Unsafe PRNGs

**Files:**
- Modify: `internal/config/config.go`
- Modify: `internal/report/model.go`
- Modify: `internal/report/detector.go`
- Modify: `internal/report/generator.go`
- Modify: `internal/source/modes.go`
- Modify: `config/sources.json`
- Test: `internal/config/config_test.go`
- Test: `internal/source/registry_test.go`
- Test: `internal/report/generator_test.go`

**Interfaces:**
- Produces: `Security string`, `UnsafeReason string`, `ProofPath string` metadata fields.
- Produces: source types `mt19937` and `lcg`.

- [ ] Write failing Go tests for unsafe metadata, source registration, and proof path propagation.
- [ ] Run `go test ./internal/config ./internal/source ./internal/report` and confirm failure.
- [ ] Add metadata fields, source factories, MT19937, LCG, and proof path propagation.
- [ ] Run `go test ./internal/config ./internal/source ./internal/report` and confirm pass.

### Task 2: Proof Sidecars and Browser Proofs

**Files:**
- Modify: `internal/report/generator.go`
- Create: `internal/report/proof.go`
- Create: `internal/report/proof_test.go`
- Modify: `docs/assets/app.mjs`
- Modify: `docs/assets/app.css`
- Modify: `docs/assets/app.test.mjs`

**Interfaces:**
- Consumes: unsafe source metadata and `ProofPath` from Task 1.
- Produces: proof JSON encoding `mt19937-state-recovery-v1` and `lcg-state-prediction-v1`.
- Produces JS functions `buildInsecurityProofData`, `predictMT19937Next`, and `predictLCGNext`.

- [ ] Write failing Go tests for proof JSON generation.
- [ ] Write failing JS tests for red unsafe rendering and browser-side prediction.
- [ ] Run `go test ./internal/report` and `node --test docs/assets/app.test.mjs` and confirm failure.
- [ ] Implement proof generation and frontend proof rendering.
- [ ] Run `go test ./internal/report` and `node --test docs/assets/app.test.mjs` and confirm pass.

### Task 3: Regenerate Artifacts, Binary, Commit, Push, Trigger CI

**Files:**
- Modify: `docs/results/**`
- Modify: `bin/randomness-reporter`
- Possibly modify: `README.md`

**Interfaces:**
- Consumes: complete Go CLI and frontend from Tasks 1-2.
- Produces: committed reports, proof sidecars, compressed Linux binary, pushed `main` branch.

- [ ] Run `go run ./cmd/randomness-reporter -config ./config/sources.json -output ./docs/results`.
- [ ] Build Linux binary with `GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o bin/randomness-reporter ./cmd/randomness-reporter`.
- [ ] Compress with `./upx.exe --best --lzma bin/randomness-reporter`.
- [ ] Run `node --test docs/assets/app.test.mjs`, `go test ./...`, `go build ./cmd/randomness-reporter`, and `./upx.exe -t bin/randomness-reporter`.
- [ ] Commit as `PaienNate <1101839859@qq.com>` and push to `origin main`.
- [ ] Trigger `Daily Randomness Report` with `gh workflow run daily-randomness-report.yml` if GitHub CLI is authenticated.
