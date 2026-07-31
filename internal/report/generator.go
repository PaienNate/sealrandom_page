package report

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"randomnessreporter/internal/config"
	"randomnessreporter/internal/source"
)

type Builder interface {
	Build(spec config.SourceConfig) (source.DiceSource, error)
}

type Detector interface {
	Detect(spec config.SourceConfig, src source.DiceSource, runAt time.Time) (RunReport, error)
}

type Generator struct {
	Builder  Builder
	Detector Detector
	Clock    func() time.Time
}

func RebuildManifest(resultsDir string) error {
	return writeManifest(resultsDir, time.Now().UTC())
}

func (g Generator) Run(cfg config.AppConfig) (RunResult, error) {
	if g.Builder == nil {
		return RunResult{}, fmt.Errorf("builder is required")
	}
	if g.Detector == nil {
		return RunResult{}, fmt.Errorf("detector is required")
	}

	runAt := time.Now().UTC()
	if g.Clock != nil {
		runAt = g.Clock().UTC()
	}

	var reports []RunReport
	var failures []SourceFailure
	for _, spec := range cfg.Sources {
		if !spec.Enabled {
			continue
		}

		src, err := g.Builder.Build(spec)
		if err != nil {
			failures = append(failures, SourceFailure{SourceID: spec.ID, Stage: "build", Message: err.Error()})
			continue
		}

		report, err := g.Detector.Detect(spec, src, runAt)
		if err != nil {
			failures = append(failures, SourceFailure{SourceID: spec.ID, Stage: "detect", Message: err.Error()})
			continue
		}

		visualizationPath, err := writeVisualization(cfg.ResultsDir, report.Source.ID, runAt, src)
		if err != nil {
			failures = append(failures, SourceFailure{SourceID: spec.ID, Stage: "visualize", Message: err.Error()})
			continue
		}
		report.VisualizationPath = visualizationPath

		proofPath, err := writeInsecurityProof(cfg.ResultsDir, report.Source.ID, runAt, src)
		if err != nil {
			failures = append(failures, SourceFailure{SourceID: spec.ID, Stage: "proof", Message: err.Error()})
			continue
		}
		report.ProofPath = proofPath

		if err := writeReport(cfg.ResultsDir, report, runAt); err != nil {
			failures = append(failures, SourceFailure{SourceID: spec.ID, Stage: "write", Message: err.Error()})
			continue
		}
		reports = append(reports, report)
	}

	if len(reports) == 0 {
		return RunResult{Failures: failures}, fmt.Errorf("all enabled sources failed")
	}

	if err := writeManifest(cfg.ResultsDir, runAt); err != nil {
		return RunResult{}, err
	}

	return RunResult{Reports: reports, Failures: failures}, nil
}

func writeReport(resultsDir string, report RunReport, runAt time.Time) error {
	relPath := reportRelativePath(report.Source.ID, runAt)
	absPath := filepath.Join(resultsDir, filepath.FromSlash(relPath))
	if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
		return fmt.Errorf("create report dir: %w", err)
	}

	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal report: %w", err)
	}
	if err := os.WriteFile(absPath, data, 0o644); err != nil {
		return fmt.Errorf("write report: %w", err)
	}
	return nil
}

func writeVisualization(resultsDir, sourceID string, runAt time.Time, src source.DiceSource) (string, error) {
	relPath := visualizationRelativePath(sourceID, runAt)
	absPath := filepath.Join(resultsDir, filepath.FromSlash(relPath))
	if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
		return "", fmt.Errorf("create visualization dir: %w", err)
	}

	file, err := os.Create(absPath)
	if err != nil {
		return "", fmt.Errorf("create visualization: %w", err)
	}
	defer file.Close()

	if err := EncodeVisualizationJSON(file, src, defaultVisualizationWidth, defaultVisualizationHeight); err != nil {
		return "", fmt.Errorf("encode visualization: %w", err)
	}
	return relPath, nil
}

func writeManifest(resultsDir string, generatedAt time.Time) error {
	sourcesDir := filepath.Join(resultsDir, "sources")
	entries, err := os.ReadDir(sourcesDir)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("no report files found under %s", sourcesDir)
		}
		return fmt.Errorf("read sources dir: %w", err)
	}

	manifest := Manifest{
		SchemaVersion: 1,
		GeneratedAt:   generatedAt,
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		ms, err := buildManifestSource(resultsDir, entry.Name())
		if err != nil {
			return err
		}
		manifest.Sources = append(manifest.Sources, ms)
	}

	sort.Slice(manifest.Sources, func(i, j int) bool {
		return manifest.Sources[i].ID < manifest.Sources[j].ID
	})
	if len(manifest.Sources) == 0 {
		return fmt.Errorf("no report files found under %s", sourcesDir)
	}

	data, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal manifest: %w", err)
	}

	manifestPath := filepath.Join(resultsDir, "manifest.json")
	if err := os.MkdirAll(filepath.Dir(manifestPath), 0o755); err != nil {
		return fmt.Errorf("create manifest dir: %w", err)
	}
	if err := os.WriteFile(manifestPath, data, 0o644); err != nil {
		return fmt.Errorf("write manifest: %w", err)
	}
	return nil
}

func buildManifestSource(resultsDir, sourceID string) (ManifestSource, error) {
	pattern := filepath.Join(resultsDir, "sources", sourceID, "*", "*.json")
	paths, err := filepath.Glob(pattern)
	if err != nil {
		return ManifestSource{}, fmt.Errorf("glob manifest source %s: %w", sourceID, err)
	}
	if len(paths) == 0 {
		return ManifestSource{}, fmt.Errorf("no report files found for source %s", sourceID)
	}

	sort.Strings(paths)
	ms := ManifestSource{ID: sourceID}
	for _, absPath := range paths {
		data, err := os.ReadFile(absPath)
		if err != nil {
			return ManifestSource{}, fmt.Errorf("read report %s: %w", absPath, err)
		}
		var report RunReport
		if err := json.Unmarshal(data, &report); err != nil {
			return ManifestSource{}, fmt.Errorf("decode report %s: %w", absPath, err)
		}
		if report.Run.SampleCount != defaultFactorySampleCount {
			continue
		}
		ms.ID = report.Source.ID
		ms.Name = report.Source.Name
		ms.Type = report.Source.Type
		ms.Algorithm = report.Source.Algorithm
		ms.Standard = report.Source.Standard
		ms.Description = report.Source.Description
		ms.Security = report.Source.Security
		ms.UnsafeReason = report.Source.UnsafeReason
		entry := ManifestEntry{
			RunID:             report.Run.RunID,
			Timestamp:         report.Run.CompletedAt,
			Path:              filepath.ToSlash(relativeResultPath(resultsDir, absPath)),
			VisualizationPath: report.VisualizationPath,
			ProofPath:         report.ProofPath,
			OverallPass:       report.Summary.OverallPass,
			OverallPassRate:   report.Summary.OverallPassRate,
			TestPassedCount:   report.Summary.TestPassedCount,
			TestTotalCount:    report.Summary.TestTotalCount,
			TestMetrics:       make([]ManifestTestMetric, 0, len(report.Tests)),
		}
		for _, testItem := range report.Tests {
			entry.TestMetrics = append(entry.TestMetrics, buildManifestTestMetric(testItem))
		}
		ms.Results = append(ms.Results, entry)
		ms.Latest = entry
	}
	if len(ms.Results) == 0 {
		return ManifestSource{}, fmt.Errorf("no standard report files found for source %s", sourceID)
	}
	return ms, nil
}

func buildManifestTestMetric(testItem TestReport) ManifestTestMetric {
	metric := ManifestTestMetric{
		Name:              testItem.Name,
		PassRate:          testItem.PassRate,
		OverallPass:       testItem.OverallPass,
		RoundPassCount:    testItem.RoundPassCount,
		RequiredPassCount: testItem.RequiredPassCount,
		RoundCount:        testItem.RoundCount,
		UniformityPValue:  testItem.UniformityPValue,
	}
	if len(testItem.Rounds) == 0 {
		return metric
	}

	var sumP float64
	var sumQ float64
	var sumP2 float64
	var sumQ2 float64
	hasSecondary := testItem.HasSecondaryMetrics
	if !hasSecondary {
		for _, round := range testItem.Rounds {
			if round.P2 != 0 || round.Q2 != 0 {
				hasSecondary = true
				break
			}
		}
	}
	for _, round := range testItem.Rounds {
		sumP += round.P
		sumQ += round.Q
		if hasSecondary {
			sumP2 += round.P2
			sumQ2 += round.Q2
		}
	}

	metric.AvgP = sumP / float64(len(testItem.Rounds))
	metric.AvgQ = sumQ / float64(len(testItem.Rounds))
	last := testItem.Rounds[len(testItem.Rounds)-1]
	metric.LatestP = last.P
	metric.LatestQ = last.Q
	if hasSecondary {
		avgP2 := sumP2 / float64(len(testItem.Rounds))
		avgQ2 := sumQ2 / float64(len(testItem.Rounds))
		latestP2 := last.P2
		latestQ2 := last.Q2
		metric.AvgP2 = &avgP2
		metric.AvgQ2 = &avgQ2
		metric.LatestP2 = &latestP2
		metric.LatestQ2 = &latestQ2
	}
	return metric
}

func relativeResultPath(resultsDir, absPath string) string {
	rel, err := filepath.Rel(resultsDir, absPath)
	if err != nil {
		return absPath
	}
	return rel
}

func reportRelativePath(sourceID string, runAt time.Time) string {
	name := runAt.UTC().Format("2006-01-02T15-04-05.000000000Z") + ".json"
	year := runAt.UTC().Format("2006")
	return filepath.ToSlash(filepath.Join("sources", sourceID, year, name))
}

func visualizationRelativePath(sourceID string, runAt time.Time) string {
	name := runAt.UTC().Format("2006-01-02T15-04-05.000000000Z") + ".json"
	year := runAt.UTC().Format("2006")
	return filepath.ToSlash(filepath.Join("visualizations", sourceID, year, name))
}
