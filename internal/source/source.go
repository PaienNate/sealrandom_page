package source

import "encoding/binary"

// DiceSource is the minimum capability required to generate test samples.
type DiceSource interface {
	Uint64() uint64
}

type InsecurityProofProvider interface {
	InsecurityProof() (any, error)
}

func FillRandomnessBuffer(src DiceSource, buf []byte) {
	fillRandomnessBuffer(src, buf)
}

func fillRandomnessBuffer(src DiceSource, buf []byte) {
	for offset := 0; offset < len(buf); offset += 8 {
		v := src.Uint64()
		remain := len(buf) - offset
		if remain >= 8 {
			binary.BigEndian.PutUint64(buf[offset:offset+8], v)
			continue
		}

		var tail [8]byte
		binary.BigEndian.PutUint64(tail[:], v)
		copy(buf[offset:], tail[:remain])
	}
}
