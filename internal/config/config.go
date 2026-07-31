package config

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

type AppConfig struct {
	ResultsDir string         `json:"results_dir"`
	Sources    []SourceConfig `json:"sources"`
}

type SourceConfig struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Type         string `json:"type"`
	Enabled      bool   `json:"enabled"`
	Algorithm    string `json:"algorithm"`
	Standard     string `json:"standard"`
	Description  string `json:"description"`
	Security     string `json:"security"`
	UnsafeReason string `json:"unsafe_reason"`
}

func Load(path string) (AppConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return AppConfig{}, fmt.Errorf("read config: %w", err)
	}

	var cfg AppConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return AppConfig{}, fmt.Errorf("decode config: %w", err)
	}

	if err := cfg.validate(); err != nil {
		return AppConfig{}, err
	}

	return cfg, nil
}

func (c AppConfig) validate() error {
	if strings.TrimSpace(c.ResultsDir) == "" {
		return fmt.Errorf("results_dir is required")
	}
	if len(c.Sources) == 0 {
		return fmt.Errorf("at least one source is required")
	}

	seen := make(map[string]struct{}, len(c.Sources))
	for _, source := range c.Sources {
		id := strings.TrimSpace(source.ID)
		if id == "" {
			return fmt.Errorf("source id is required")
		}
		if _, ok := seen[id]; ok {
			return fmt.Errorf("duplicate source id: %s", id)
		}
		seen[id] = struct{}{}
	}

	return nil
}
