package report

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"randomnessreporter/internal/source"
)

func writeInsecurityProof(resultsDir, sourceID string, runAt time.Time, src source.DiceSource) (string, error) {
	provider, ok := src.(source.InsecurityProofProvider)
	if !ok {
		return "", nil
	}

	payload, err := provider.InsecurityProof()
	if err != nil {
		return "", fmt.Errorf("build insecurity proof: %w", err)
	}

	relPath := proofRelativePath(sourceID, runAt)
	absPath := filepath.Join(resultsDir, filepath.FromSlash(relPath))
	if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
		return "", fmt.Errorf("create proof dir: %w", err)
	}

	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal proof: %w", err)
	}
	if err := os.WriteFile(absPath, data, 0o644); err != nil {
		return "", fmt.Errorf("write proof: %w", err)
	}
	return relPath, nil
}

func proofRelativePath(sourceID string, runAt time.Time) string {
	name := runAt.UTC().Format("2006-01-02T15-04-05.000000000Z") + ".json"
	year := runAt.UTC().Format("2006")
	return filepath.ToSlash(filepath.Join("proofs", sourceID, year, name))
}
