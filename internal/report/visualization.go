package report

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"

	"randomnessreporter/internal/source"
)

const (
	defaultVisualizationWidth  = 512
	defaultVisualizationHeight = 512
)

type VisualizationData struct {
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	Encoding string `json:"encoding"`
	Data     string `json:"data"`
}

func EncodeVisualizationJSON(w io.Writer, src source.DiceSource, width, height int) error {
	if width <= 0 || height <= 0 {
		return fmt.Errorf("visualization dimensions must be positive")
	}

	bitCount := width * height
	buf := make([]byte, (bitCount+7)/8)
	var bits uint64
	remaining := 0
	for index := 0; index < bitCount; index++ {
		if remaining == 0 {
			bits = src.Uint64()
			remaining = 64
		}

		if bits&(uint64(1)<<63) != 0 {
			buf[index/8] |= byte(1 << (7 - (index % 8)))
		}
		bits <<= 1
		remaining--
	}

	return json.NewEncoder(w).Encode(VisualizationData{
		Width:    width,
		Height:   height,
		Encoding: "base64-msb-bitstream-v1",
		Data:     base64.StdEncoding.EncodeToString(buf),
	})
}
