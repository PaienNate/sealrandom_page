package source

import (
	mathrand "math/rand"
	"testing"

	"randomnessreporter/internal/config"
)

func TestAdaptSourceWrapsRandSource(t *testing.T) {
	wrapped := AdaptSource(mathrand.NewSource(7))
	if wrapped.Uint64() == 0 {
		t.Fatal("expected non-zero Uint64 from adapted rand.Source")
	}
}

func TestRegistryBuildsConfiguredRandomModes(t *testing.T) {
	registry := NewRegistry()
	for _, kind := range []string{"pcg", "gm", "nist", "crng", "hybrid"} {
		t.Run(kind, func(t *testing.T) {
			src, err := registry.Build(config.SourceConfig{ID: kind, Name: kind, Type: kind, Enabled: true})
			if err != nil {
				t.Fatalf("Build(%s) error = %v", kind, err)
			}
			if src == nil {
				t.Fatalf("Build(%s) returned nil source", kind)
			}
			_ = src.Uint64()
		})
	}
}

func TestRegistryBuildsPCGSource(t *testing.T) {
	registry := NewRegistry()
	src, err := registry.Build(config.SourceConfig{ID: "pcg", Name: "PCG", Type: "pcg", Enabled: true})
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}
	if src == nil {
		t.Fatal("Build() returned nil source")
	}
	if src.Uint64() == 0 && src.Uint64() == 0 {
		t.Fatal("expected PCG source to produce values")
	}
}

func TestRegistryRejectsUnknownSourceType(t *testing.T) {
	registry := NewRegistry()
	_, err := registry.Build(config.SourceConfig{ID: "bad", Name: "Bad", Type: "unknown", Enabled: true})
	if err == nil {
		t.Fatal("Build() error = nil, want unknown source type error")
	}
}
