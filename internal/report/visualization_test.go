package report

import (
	"bytes"
	"encoding/json"
	"testing"
)

type fixedBitSource struct {
	values []uint64
	idx    int
}

func (s *fixedBitSource) Uint64() uint64 {
	v := s.values[s.idx]
	s.idx++
	return v
}

func TestEncodeVisualizationJSONMapsRandomBitsToBase64Bitstream(t *testing.T) {
	src := &fixedBitSource{values: []uint64{0xa000000000000000}}
	var buf bytes.Buffer

	if err := EncodeVisualizationJSON(&buf, src, 2, 2); err != nil {
		t.Fatalf("EncodeVisualizationJSON() error = %v", err)
	}

	var data VisualizationData
	if err := json.Unmarshal(buf.Bytes(), &data); err != nil {
		t.Fatalf("decode JSON: %v", err)
	}
	if got := data.Width; got != 2 {
		t.Fatalf("width = %d, want 2", got)
	}
	if got := data.Height; got != 2 {
		t.Fatalf("height = %d, want 2", got)
	}
	if data.Encoding != "base64-msb-bitstream-v1" {
		t.Fatalf("encoding = %q, want base64-msb-bitstream-v1", data.Encoding)
	}
	if data.Data != "oA==" {
		t.Fatalf("data = %q, want oA==", data.Data)
	}
}
