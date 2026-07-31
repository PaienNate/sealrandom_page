package config

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestLoadReadsMultipleSources(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "sources.json")

	content := `{
		"results_dir": "docs/results",
		"sources": [
			{
				"id": "pcg-primary",
				"name": "PCG Primary",
				"type": "pcg",
				"enabled": true,
				"algorithm": "PCG",
				"standard": "internal",
				"description": "main source"
			},
			{
				"id": "pcg-backup",
				"name": "PCG Backup",
				"type": "pcg",
				"enabled": true,
				"algorithm": "PCG",
				"standard": "internal",
				"description": "backup source"
			}
		]
	}`

	if err := os.WriteFile(configPath, []byte(content), 0o600); err != nil {
		t.Fatalf("write config: %v", err)
	}

	cfg, err := Load(configPath)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.ResultsDir != "docs/results" {
		t.Fatalf("ResultsDir = %q, want docs/results", cfg.ResultsDir)
	}
	if len(cfg.Sources) != 2 {
		t.Fatalf("len(Sources) = %d, want 2", len(cfg.Sources))
	}
	if cfg.Sources[0].ID != "pcg-primary" || cfg.Sources[1].ID != "pcg-backup" {
		t.Fatalf("unexpected source IDs: %+v", cfg.Sources)
	}
	if !cfg.Sources[0].Enabled || !cfg.Sources[1].Enabled {
		t.Fatalf("expected sources to be enabled: %+v", cfg.Sources)
	}
}

func TestDefaultConfigListsAllRandomModes(t *testing.T) {
	cfg, err := Load(filepath.Join("..", "..", "config", "sources.json"))
	if err != nil {
		t.Fatalf("Load(default config) error = %v", err)
	}

	got := make([]string, 0, len(cfg.Sources))
	for _, source := range cfg.Sources {
		if !source.Enabled {
			t.Fatalf("source %s is disabled", source.ID)
		}
		got = append(got, source.Type)
		if source.Algorithm == "" || source.Standard == "" || source.Description == "" {
			t.Fatalf("source %s missing metadata: %+v", source.ID, source)
		}
	}

	want := []string{"pcg", "gm", "nist", "crng", "hybrid"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("default source types = %#v, want %#v", got, want)
	}
}

func TestLoadRejectsDuplicateSourceIDs(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "sources.json")

	content := `{
		"results_dir": "docs/results",
		"sources": [
			{"id": "same", "name": "one", "type": "pcg", "enabled": true},
			{"id": "same", "name": "two", "type": "pcg", "enabled": true}
		]
	}`

	if err := os.WriteFile(configPath, []byte(content), 0o600); err != nil {
		t.Fatalf("write config: %v", err)
	}

	_, err := Load(configPath)
	if err == nil {
		t.Fatal("Load() error = nil, want duplicate source ID error")
	}
	if !strings.Contains(err.Error(), "duplicate source id") {
		t.Fatalf("Load() error = %v, want duplicate source id", err)
	}
}
