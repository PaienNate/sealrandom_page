package source

const (
	mtStateSize  = 624
	mtPeriod     = 397
	mtMatrixA    = 0x9908b0df
	mtUpperMask  = 0x80000000
	mtLowerMask  = 0x7fffffff
	mtSeedFactor = 1812433253

	lcgMultiplier = 1664525
	lcgIncrement  = 1013904223
)

type mt19937Source struct {
	state [mtStateSize]uint32
	index int
}

type lcgSource struct {
	state uint32
}

type MT19937Proof struct {
	Kind         string   `json:"kind"`
	WordBits     int      `json:"word_bits"`
	StateSize    int      `json:"state_size"`
	Outputs      []uint32 `json:"outputs"`
	ExpectedNext uint32   `json:"expected_next"`
}

type LCGProof struct {
	Kind         string   `json:"kind"`
	WordBits     int      `json:"word_bits"`
	Modulus      string   `json:"modulus"`
	Multiplier   uint32   `json:"multiplier"`
	Increment    uint32   `json:"increment"`
	Outputs      []uint32 `json:"outputs"`
	ExpectedNext uint32   `json:"expected_next"`
}

func newMT19937Source(seed uint32) DiceSource {
	s := &mt19937Source{index: mtStateSize}
	s.state[0] = seed
	for i := 1; i < mtStateSize; i++ {
		prev := s.state[i-1]
		s.state[i] = mtSeedFactor*(prev^(prev>>30)) + uint32(i)
	}
	return s
}

func newLCGSource(seed uint32) DiceSource {
	return &lcgSource{state: seed}
}

func (s *mt19937Source) Uint64() uint64 {
	return uint64(s.uint32())<<32 | uint64(s.uint32())
}

func (s *mt19937Source) uint32() uint32 {
	if s.index >= mtStateSize {
		s.twist()
	}

	y := s.state[s.index]
	s.index++
	y ^= y >> 11
	y ^= (y << 7) & 0x9d2c5680
	y ^= (y << 15) & 0xefc60000
	y ^= y >> 18
	return y
}

func (s *mt19937Source) twist() {
	for i := 0; i < mtStateSize; i++ {
		x := (s.state[i] & mtUpperMask) | (s.state[(i+1)%mtStateSize] & mtLowerMask)
		xA := x >> 1
		if x&1 != 0 {
			xA ^= mtMatrixA
		}
		s.state[i] = s.state[(i+mtPeriod)%mtStateSize] ^ xA
	}
	s.index = 0
}

func (s *mt19937Source) InsecurityProof() (any, error) {
	outputs := make([]uint32, mtStateSize)
	for i := range outputs {
		outputs[i] = s.uint32()
	}
	return MT19937Proof{
		Kind:         "mt19937-state-recovery-v1",
		WordBits:     32,
		StateSize:    mtStateSize,
		Outputs:      outputs,
		ExpectedNext: s.uint32(),
	}, nil
}

func (s *lcgSource) Uint64() uint64 {
	return uint64(s.uint32())<<32 | uint64(s.uint32())
}

func (s *lcgSource) uint32() uint32 {
	s.state = uint32(uint64(s.state)*lcgMultiplier + lcgIncrement)
	return s.state
}

func (s *lcgSource) InsecurityProof() (any, error) {
	outputs := make([]uint32, 4)
	for i := range outputs {
		outputs[i] = s.uint32()
	}
	return LCGProof{
		Kind:         "lcg-state-prediction-v1",
		WordBits:     32,
		Modulus:      "4294967296",
		Multiplier:   lcgMultiplier,
		Increment:    lcgIncrement,
		Outputs:      outputs,
		ExpectedNext: s.uint32(),
	}, nil
}
