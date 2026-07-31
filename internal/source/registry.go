package source

import (
	cryptorand "crypto/rand"
	"encoding/binary"
	"fmt"
	mathrand "math/rand"
	randv2 "math/rand/v2"

	"randomnessreporter/internal/config"
)

type Factory func(spec config.SourceConfig) (DiceSource, error)

type Registry struct {
	factories map[string]Factory
}

func NewRegistry() *Registry {
	r := &Registry{factories: make(map[string]Factory)}
	r.Register("pcg", func(spec config.SourceConfig) (DiceSource, error) {
		seed1, seed2, err := generateRandSeed()
		if err != nil {
			return nil, err
		}
		return newPCGDiceSource(seed1, seed2), nil
	})
	registerRandomModeFactories(r)
	return r
}

func (r *Registry) Register(kind string, factory Factory) {
	r.factories[kind] = factory
}

func (r *Registry) Build(spec config.SourceConfig) (DiceSource, error) {
	factory, ok := r.factories[spec.Type]
	if !ok {
		return nil, fmt.Errorf("unknown source type: %s", spec.Type)
	}
	return factory(spec)
}

func AdaptSource(src mathrand.Source) DiceSource {
	if src64, ok := src.(mathrand.Source64); ok {
		return AdaptSource64(src64)
	}
	return sourceAdapter{src: src}
}

func AdaptSource64(src mathrand.Source64) DiceSource {
	return source64Adapter{src: src}
}

type sourceAdapter struct {
	src mathrand.Source
}

func (s sourceAdapter) Uint64() uint64 {
	high := uint64(s.src.Int63()) << 1
	low := uint64(s.src.Int63() & 1)
	return high | low
}

type source64Adapter struct {
	src mathrand.Source64
}

func (s source64Adapter) Uint64() uint64 {
	return s.src.Uint64()
}

func newPCGDiceSource(seed1, seed2 uint64) DiceSource {
	return randv2.NewPCG(seed1, seed2)
}

func generateRandSeed() (uint64, uint64, error) {
	var seed [16]byte
	if _, err := cryptorand.Read(seed[:]); err != nil {
		return 0, 0, fmt.Errorf("read random seed: %w", err)
	}
	return binary.BigEndian.Uint64(seed[:8]), binary.BigEndian.Uint64(seed[8:]), nil
}
