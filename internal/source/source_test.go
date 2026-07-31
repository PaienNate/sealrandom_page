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
