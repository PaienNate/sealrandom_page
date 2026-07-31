package source

import "testing"

func TestMT19937MatchesReferenceSeedOutput(t *testing.T) {
	src := newMT19937Source(5489).(*mt19937Source)
	want := []uint32{3499211612, 581869302, 3890346734, 3586334585, 545404204}
	for i, expected := range want {
		if got := src.uint32(); got != expected {
			t.Fatalf("output[%d] = %d, want %d", i, got, expected)
		}
	}
}

func TestLCGProofPredictsNextOutput(t *testing.T) {
	src := newLCGSource(123).(*lcgSource)
	proofValue, err := src.InsecurityProof()
	if err != nil {
		t.Fatalf("InsecurityProof() error = %v", err)
	}
	proof := proofValue.(LCGProof)
	last := proof.Outputs[len(proof.Outputs)-1]
	want := uint32(uint64(last)*uint64(proof.Multiplier) + uint64(proof.Increment))
	if proof.ExpectedNext != want {
		t.Fatalf("ExpectedNext = %d, want %d", proof.ExpectedNext, want)
	}
}
