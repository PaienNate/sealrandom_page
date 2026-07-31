package source

import (
	"encoding/binary"
	"testing"
)

type stubDiceSource struct {
	values []uint64
	idx    int
}

func (s *stubDiceSource) Uint64() uint64 {
	v := s.values[s.idx]
	s.idx++
	return v
}

type bulkDiceSource struct {
	fillCalls int
	uintCalls int
}

func (s *bulkDiceSource) Uint64() uint64 {
	s.uintCalls++
	return 0
}

func (s *bulkDiceSource) FillBytes(buf []byte) error {
	s.fillCalls++
	copy(buf, []byte{1, 2, 3, 4, 5})
	return nil
}

func TestFillRandomnessBufferUsesBulkFillWhenAvailable(t *testing.T) {
	src := &bulkDiceSource{}
	buf := make([]byte, 5)

	fillRandomnessBuffer(src, buf)

	if src.fillCalls != 1 {
		t.Fatalf("fill calls = %d, want 1", src.fillCalls)
	}
	if src.uintCalls != 0 {
		t.Fatalf("uint64 calls = %d, want 0", src.uintCalls)
	}
	if string(buf) != string([]byte{1, 2, 3, 4, 5}) {
		t.Fatalf("unexpected buffer: %v", buf)
	}
}

func TestFillRandomnessBufferWritesFullWordsAndTail(t *testing.T) {
	src := &stubDiceSource{
		values: []uint64{
			0x0102030405060708,
			0x1112131415161718,
		},
	}

	buf := make([]byte, 11)

	fillRandomnessBuffer(src, buf)

	want := make([]byte, 11)
	binary.BigEndian.PutUint64(want[:8], 0x0102030405060708)
	var tail [8]byte
	binary.BigEndian.PutUint64(tail[:], 0x1112131415161718)
	copy(want[8:], tail[:3])

	if string(buf) != string(want) {
		t.Fatalf("unexpected buffer\nwant: %v\n got: %v", want, buf)
	}
}
