package source

import (
	cryptorand "crypto/rand"
	"encoding/binary"
	"fmt"
	"io"
	"sync"
	"time"

	gmrand "github.com/emmansun/gmsm/rand"
	ctrdrbg "github.com/sixafter/aes-ctr-drbg"

	"randomnessreporter/internal/config"
)

const (
	nistReseedInterval = 5 * time.Minute
	nistReseedRequests = 4096
	gmEntropyMixSize   = 32
)

type readerDiceSource struct {
	reader   io.Reader
	fallback DiceSource
	mu       sync.Mutex
}

type hybridDiceSource struct {
	sources []DiceSource
}

func registerRandomModeFactories(r *Registry) {
	r.Register("gm", func(spec config.SourceConfig) (DiceSource, error) {
		return newReaderDiceSource(gmrand.Reader), nil
	})
	r.Register("nist", func(spec config.SourceConfig) (DiceSource, error) {
		return newNISTCTRSource()
	})
	r.Register("crng", func(spec config.SourceConfig) (DiceSource, error) {
		return newReaderDiceSource(cryptorand.Reader), nil
	})
	r.Register("hybrid", func(spec config.SourceConfig) (DiceSource, error) {
		return newHybridDiceSource()
	})
	r.Register("mt19937", func(spec config.SourceConfig) (DiceSource, error) {
		seed1, _, err := generateRandSeed()
		if err != nil {
			return nil, err
		}
		return newMT19937Source(uint32(seed1)), nil
	})
	r.Register("lcg", func(spec config.SourceConfig) (DiceSource, error) {
		seed1, _, err := generateRandSeed()
		if err != nil {
			return nil, err
		}
		return newLCGSource(uint32(seed1)), nil
	})
}

func newReaderDiceSource(reader io.Reader) DiceSource {
	return &readerDiceSource{reader: reader}
}

func (s *readerDiceSource) Uint64() uint64 {
	var data [8]byte
	if err := s.FillBytes(data[:]); err == nil {
		return binary.BigEndian.Uint64(data[:])
	}
	return 0
}

func (s *readerDiceSource) FillBytes(buf []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.reader != nil {
		if _, err := io.ReadFull(s.reader, buf); err == nil {
			return nil
		}
		s.reader = nil
	}

	if s.fallback == nil {
		seed1, seed2, err := generateRandSeed()
		if err != nil {
			seed1 = 1
			seed2 = 2
		}
		s.fallback = newPCGDiceSource(seed1, seed2)
	}
	fillRandomnessBuffer(s.fallback, buf)
	return nil
}

func newNISTCTRSource() (DiceSource, error) {
	reader, err := ctrdrbg.NewReader(
		ctrdrbg.WithKeySize(ctrdrbg.KeySize256),
		ctrdrbg.WithPersonalization([]byte("randomness-reporter-nist")),
		ctrdrbg.WithPredictionResistance(true),
		ctrdrbg.WithEnableKeyRotation(true),
		ctrdrbg.WithReseedInterval(nistReseedInterval),
		ctrdrbg.WithReseedRequests(nistReseedRequests),
	)
	if err != nil {
		return nil, fmt.Errorf("init aes ctr drbg: %w", err)
	}

	buf := make([]byte, gmEntropyMixSize)
	if n, err := gmrand.Read(buf); err != nil {
		clear(buf)
		return nil, fmt.Errorf("read gm entropy for nist reseed: %w", err)
	} else if n != len(buf) {
		clear(buf)
		return nil, fmt.Errorf("read gm entropy for nist reseed: short read %d/%d", n, len(buf))
	}
	if err := reader.Reseed(buf); err != nil {
		clear(buf)
		return nil, fmt.Errorf("reseed nist reader with gm entropy: %w", err)
	}
	clear(buf)
	return newReaderDiceSource(reader), nil
}

func newHybridDiceSource() (DiceSource, error) {
	seed1, seed2, err := generateRandSeed()
	if err != nil {
		return nil, err
	}
	nist, err := newNISTCTRSource()
	if err != nil {
		return nil, err
	}
	return &hybridDiceSource{sources: []DiceSource{
		newPCGDiceSource(seed1, seed2),
		newReaderDiceSource(gmrand.Reader),
		nist,
		newReaderDiceSource(cryptorand.Reader),
	}}, nil
}

func (s *hybridDiceSource) Uint64() uint64 {
	var value uint64
	for _, src := range s.sources {
		if src != nil {
			value ^= src.Uint64()
		}
	}
	return value
}

func (s *hybridDiceSource) FillBytes(buf []byte) error {
	clear(buf)
	scratch := make([]byte, len(buf))
	for _, src := range s.sources {
		if src == nil {
			continue
		}
		clear(scratch)
		fillRandomnessBuffer(src, scratch)
		for i, value := range scratch {
			buf[i] ^= value
		}
	}
	return nil
}
