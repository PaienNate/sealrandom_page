# Insecure Random Sources Design

## Goal

Add two deliberately unsafe random sources to the report dashboard and prove in the browser why they are not cryptographically secure.

## Scope

- Add MT19937 Mersenne Twister using the same algorithm family as Python's default `random` module.
- Add an LCG source.
- Mark both sources as unsafe in generated metadata and in the dashboard.
- Render unsafe algorithm names in red.
- Generate small proof sidecar JSON files for unsafe sources.
- Run browser-side prediction proof from the sidecar data.

## Data Flow

The Go CLI builds each configured source, runs the existing GM/T 0005-2021 statistical reports, writes the normal report JSON and visualization JSON, and for unsafe sources writes `docs/results/proofs/<source-id>/<year>/<timestamp>.json`. Reports and manifest entries carry security metadata so the static page can decide whether to display the warning and proof panel.

## Proofs

MT19937 proof stores 624 observed 32-bit outputs and the expected next 32-bit output. The browser untempers those 624 outputs, reconstructs MT19937 state, twists once, and predicts the next output.

LCG proof stores modulus, multiplier, increment, observed consecutive states, and the expected next state. The browser verifies the recurrence and predicts the next state.

## Non-Goals

- Do not claim statistical test failure is the reason these algorithms are unsafe.
- Do not add huge raw sample dumps to the page.
- Do not use these unsafe sources in Hybrid.
