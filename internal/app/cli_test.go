package app

import (
	"bytes"
	"testing"

	"randomnessreporter/internal/config"
	"randomnessreporter/internal/report"
)

type stubRunner struct {
	received config.AppConfig
	called   bool
	result   report.RunResult
}

type rebuildCall struct {
	path   string
	called bool
}

func (s *stubRunner) Run(cfg config.AppConfig) (report.RunResult, error) {
	s.called = true
	s.received = cfg
	if len(s.result.Reports) == 0 && len(s.result.Failures) == 0 {
		return report.RunResult{Reports: []report.RunReport{{Source: report.SourceMetadata{ID: "pcg-a"}}}}, nil
	}
	return s.result, nil
}

func TestCLIRunLoadsConfigAndAppliesOutputOverride(t *testing.T) {
	runner := &stubRunner{}
	var stdout bytes.Buffer

	cli := CLI{
		LoadConfig: func(path string) (config.AppConfig, error) {
			if path != "config/sources.json" {
				t.Fatalf("config path = %q, want config/sources.json", path)
			}
			return config.AppConfig{
				ResultsDir: "docs/results",
				Sources:    []config.SourceConfig{{ID: "pcg-a", Name: "PCG A", Type: "pcg", Enabled: true}},
			}, nil
		},
		Runner: runner,
		Stdout: &stdout,
	}

	err := cli.Run([]string{"-config", "config/sources.json", "-output", "site/results"})
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if !runner.called {
		t.Fatal("expected runner to be called")
	}
	if runner.received.ResultsDir != "site/results" {
		t.Fatalf("ResultsDir = %q, want site/results", runner.received.ResultsDir)
	}
	if stdout.Len() == 0 {
		t.Fatal("expected summary output")
	}
}

func TestCLIRunPrintsFailureSummaryWithoutReturningError(t *testing.T) {
	runner := &stubRunner{result: report.RunResult{
		Reports:  []report.RunReport{{Source: report.SourceMetadata{ID: "pcg-a"}}},
		Failures: []report.SourceFailure{{SourceID: "pcg-b", Stage: "detect", Message: "boom"}},
	}}
	var stdout bytes.Buffer

	cli := CLI{
		LoadConfig: func(path string) (config.AppConfig, error) {
			return config.AppConfig{ResultsDir: "docs/results", Sources: []config.SourceConfig{{ID: "pcg-a", Type: "pcg", Enabled: true}}}, nil
		},
		Runner: runner,
		Stdout: &stdout,
	}

	if err := cli.Run(nil); err != nil {
		t.Fatalf("Run() error = %v, want nil", err)
	}
	if !bytes.Contains(stdout.Bytes(), []byte("pcg-b")) {
		t.Fatalf("expected failure summary in output, got %q", stdout.String())
	}
}

func TestCLIRunRebuildsManifestWithoutRunningDetector(t *testing.T) {
	var stdout bytes.Buffer
	rebuild := &rebuildCall{}
	cli := CLI{
		RebuildManifest: func(path string) error {
			rebuild.called = true
			rebuild.path = path
			return nil
		},
		Stdout: &stdout,
	}

	if err := cli.Run([]string{"-rebuild-manifest", "-output", "docs/results"}); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if !rebuild.called {
		t.Fatal("expected manifest rebuild to be called")
	}
	if rebuild.path != "docs/results" {
		t.Fatalf("rebuild path = %q, want docs/results", rebuild.path)
	}
	if runnerText := stdout.String(); !bytes.Contains([]byte(runnerText), []byte("manifest rebuilt")) {
		t.Fatalf("expected rebuild output, got %q", runnerText)
	}
}
