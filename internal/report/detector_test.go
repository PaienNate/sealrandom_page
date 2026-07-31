package report

import (
	"testing"
	"time"

	"github.com/Trisia/randomness"

	"randomnessreporter/internal/config"
	"randomnessreporter/internal/source"
)

type sequenceSource struct {
	values []uint64
	idx    int
}

func (s *sequenceSource) Uint64() uint64 {
	v := s.values[s.idx]
	s.idx++
	return v
}

func TestFactoryDetectorAggregatesRoundsIntoRunReport(t *testing.T) {
	detector := FactoryDetector{
		SampleCount:   3,
		BitsPerSample: 16,
		RoundFunc: func(data []byte) []*randomness.TestResult {
			if len(data) != 2 {
				t.Fatalf("round func got %d bytes, want 2", len(data))
			}
			switch data[0] {
			case 0x10:
				return []*randomness.TestResult{
					{Name: "A", Q: 0.3, Pass: true},
					{Name: "B", Q: 0.00001, Pass: true},
				}
			case 0x20:
				return []*randomness.TestResult{
					{Name: "A", Q: 0.4, Pass: true},
					{Name: "B", Q: 0.00001, Pass: true},
				}
			case 0x30:
				return []*randomness.TestResult{
					{Name: "A", Q: 0.1, Pass: false},
					{Name: "B", Q: 0.00001, Pass: false},
				}
			default:
				t.Fatalf("unexpected first byte %x", data[0])
				return nil
			}
		},
		ThresholdFunc: func(samples int) int {
			if samples != 3 {
				t.Fatalf("threshold samples = %d, want 3", samples)
			}
			return 2
		},
		UniformityFunc: func(qValues []float64) float64 {
			if qValues[0] < 0.001 {
				return 0.00001
			}
			return 0.2
		},
	}

	src := &sequenceSource{values: []uint64{
		0x1000000000000000,
		0x2000000000000000,
		0x3000000000000000,
	}}

	runAt := time.Date(2026, time.July, 31, 1, 2, 3, 456000000, time.UTC)
	report, err := detector.Detect(config.SourceConfig{ID: "pcg-a", Name: "PCG A", Type: "pcg"}, src, runAt)
	if err != nil {
		t.Fatalf("Detect() error = %v", err)
	}

	if report.Run.SampleCount != 3 {
		t.Fatalf("SampleCount = %d, want 3", report.Run.SampleCount)
	}
	if len(report.Tests) != 2 {
		t.Fatalf("len(Tests) = %d, want 2", len(report.Tests))
	}
	if !report.Tests[0].OverallPass {
		t.Fatalf("test A OverallPass = false, want true")
	}
	if report.Tests[1].OverallPass {
		t.Fatalf("test B OverallPass = true, want false")
	}
	if report.Summary.OverallPass {
		t.Fatalf("summary OverallPass = true, want false")
	}
	if report.Summary.TestPassedCount != 1 || report.Summary.TestTotalCount != 2 {
		t.Fatalf("unexpected summary counts: %+v", report.Summary)
	}
	if report.Tests[0].RoundPassCount != 2 || report.Tests[1].RoundPassCount != 2 {
		t.Fatalf("unexpected round pass counts: %+v", report.Tests)
	}
	if len(report.Tests[0].Rounds) != 3 {
		t.Fatalf("len(test A rounds) = %d, want 3", len(report.Tests[0].Rounds))
	}
	if report.Run.RunID != "pcg-a-20260731T010203.456000000Z" {
		t.Fatalf("RunID = %q, want sub-second precision", report.Run.RunID)
	}
}

var _ source.DiceSource = (*sequenceSource)(nil)
