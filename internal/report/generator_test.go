package report

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"randomnessreporter/internal/config"
	"randomnessreporter/internal/source"
)

type stubBuilder struct{}

func (stubBuilder) Build(spec config.SourceConfig) (source.DiceSource, error) {
	return &stubRunSource{value: uint64(len(spec.ID))}, nil
}

type stubRunSource struct {
	value uint64
}

func (s *stubRunSource) Uint64() uint64 {
	return s.value
}

type stubDetector struct{}

func (stubDetector) Detect(spec config.SourceConfig, src source.DiceSource, runAt time.Time) (RunReport, error) {
	return RunReport{
		SchemaVersion: 1,
		Source: SourceMetadata{
			ID:          spec.ID,
			Name:        spec.Name,
			Type:        spec.Type,
			Algorithm:   spec.Algorithm,
			Standard:    spec.Standard,
			Description: spec.Description,
		},
		Run: RunMetadata{
			RunID:         spec.ID + "-" + runAt.UTC().Format("20060102T150405Z"),
			Mode:          "factory",
			StartedAt:     runAt.UTC(),
			CompletedAt:   runAt.UTC(),
			SampleCount:   50,
			BitsPerSample: 1000000,
		},
		Summary: RunSummary{
			OverallPass:      true,
			TestPassedCount:  1,
			TestTotalCount:   1,
			OverallPassRate:  1,
			SamplesRequired:  48,
			SamplesCollected: 50,
		},
		Tests: []TestReport{{
			Name:              "sample-test",
			RoundPassCount:    50,
			RequiredPassCount: 48,
			RoundCount:        50,
			PassRate:          1,
			UniformityPValue:  0.42,
			UniformityPass:    true,
			OverallPass:       true,
			Rounds:            []RoundReport{{Index: 1, P: 0.51, Q: 0.49, P2: 0.61, Q2: 0.39, Pass: true}},
		}},
	}, nil
}

type flakyBuilder struct{}

func (flakyBuilder) Build(spec config.SourceConfig) (source.DiceSource, error) {
	if spec.ID == "broken" {
		return nil, os.ErrInvalid
	}
	return &stubRunSource{value: 1}, nil
}

func TestGeneratorRunWritesReportPerEnabledSourceAndManifest(t *testing.T) {
	resultsDir := filepath.Join(t.TempDir(), "results")
	runAt := time.Date(2026, time.July, 31, 1, 2, 3, 456000000, time.UTC)

	g := Generator{
		Builder:  stubBuilder{},
		Detector: stubDetector{},
		Clock: func() time.Time {
			return runAt
		},
	}

	cfg := config.AppConfig{
		ResultsDir: resultsDir,
		Sources: []config.SourceConfig{
			{ID: "pcg-a", Name: "PCG A", Type: "pcg", Enabled: true, Algorithm: "PCG", Standard: "internal", Description: "a"},
			{ID: "pcg-b", Name: "PCG B", Type: "pcg", Enabled: true, Algorithm: "PCG", Standard: "internal", Description: "b"},
			{ID: "pcg-off", Name: "PCG Off", Type: "pcg", Enabled: false},
		},
	}

	result, err := g.Run(cfg)
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if len(result.Reports) != 2 {
		t.Fatalf("len(Reports) = %d, want 2", len(result.Reports))
	}

	for _, sourceID := range []string{"pcg-a", "pcg-b"} {
		reportPath := filepath.Join(resultsDir, "sources", sourceID, "2026", "2026-07-31T01-02-03.456000000Z.json")
		if _, err := os.Stat(reportPath); err != nil {
			t.Fatalf("expected report file %s: %v", reportPath, err)
		}
		visualizationPath := filepath.Join(resultsDir, "visualizations", sourceID, "2026", "2026-07-31T01-02-03.456000000Z.json")
		if _, err := os.Stat(visualizationPath); err != nil {
			t.Fatalf("expected visualization data %s: %v", visualizationPath, err)
		}
	}

	manifestPath := filepath.Join(resultsDir, "manifest.json")
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		t.Fatalf("read manifest: %v", err)
	}

	var manifest Manifest
	if err := json.Unmarshal(manifestData, &manifest); err != nil {
		t.Fatalf("unmarshal manifest: %v", err)
	}
	if len(manifest.Sources) != 2 {
		t.Fatalf("len(manifest.Sources) = %d, want 2", len(manifest.Sources))
	}
	if manifest.Sources[0].Latest.Path == "" || manifest.Sources[1].Latest.Path == "" {
		t.Fatalf("expected latest paths in manifest: %+v", manifest.Sources)
	}
	if manifest.Sources[0].Latest.VisualizationPath != "visualizations/pcg-a/2026/2026-07-31T01-02-03.456000000Z.json" {
		t.Fatalf("unexpected latest visualization path: %+v", manifest.Sources[0].Latest)
	}
	if len(manifest.Sources[0].Latest.TestMetrics) != 1 {
		t.Fatalf("expected manifest test metrics, got %+v", manifest.Sources[0].Latest)
	}
	metric := manifest.Sources[0].Latest.TestMetrics[0]
	if metric.UniformityPValue != 0.42 || metric.AvgP != 0.51 || metric.LatestQ2 == nil || *metric.LatestQ2 != 0.39 {
		t.Fatalf("unexpected manifest metric: %+v", metric)
	}
}

func TestRebuildManifestReturnsErrorWhenNoReportsExist(t *testing.T) {
	resultsDir := filepath.Join(t.TempDir(), "results")
	err := RebuildManifest(resultsDir)
	if err == nil {
		t.Fatal("RebuildManifest() error = nil, want missing report error")
	}
}

func TestGeneratorRunContinuesAfterSourceFailure(t *testing.T) {
	resultsDir := filepath.Join(t.TempDir(), "results")
	runAt := time.Date(2026, time.July, 31, 1, 2, 3, 456000000, time.UTC)

	g := Generator{
		Builder:  flakyBuilder{},
		Detector: stubDetector{},
		Clock: func() time.Time {
			return runAt
		},
	}

	cfg := config.AppConfig{
		ResultsDir: resultsDir,
		Sources: []config.SourceConfig{
			{ID: "broken", Name: "Broken", Type: "pcg", Enabled: true},
			{ID: "healthy", Name: "Healthy", Type: "pcg", Enabled: true},
		},
	}

	result, err := g.Run(cfg)
	if err != nil {
		t.Fatalf("Run() error = %v, want nil partial success", err)
	}
	if len(result.Reports) != 1 {
		t.Fatalf("len(Reports) = %d, want 1", len(result.Reports))
	}
	if len(result.Failures) != 1 || result.Failures[0].SourceID != "broken" {
		t.Fatalf("unexpected failures: %+v", result.Failures)
	}

	reportPath := filepath.Join(resultsDir, "sources", "healthy", "2026", "2026-07-31T01-02-03.456000000Z.json")
	if _, err := os.Stat(reportPath); err != nil {
		t.Fatalf("expected healthy report file %s: %v", reportPath, err)
	}

	manifestPath := filepath.Join(resultsDir, "manifest.json")
	if _, err := os.Stat(manifestPath); err != nil {
		t.Fatalf("expected manifest file %s: %v", manifestPath, err)
	}
}
