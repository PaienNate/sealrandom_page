package report

import (
	"fmt"
	"time"

	"github.com/Trisia/randomness"
	trisiadetect "github.com/Trisia/randomness/detect"

	"randomnessreporter/internal/config"
	"randomnessreporter/internal/source"
)

const (
	defaultFactorySampleCount   = 1000
	defaultFactoryBitsPerSample = 1000000
)

type FactoryDetector struct {
	SampleCount    int
	BitsPerSample  int
	RoundFunc      func([]byte) []*randomness.TestResult
	ThresholdFunc  func(int) int
	UniformityFunc func([]float64) float64
}

func (d FactoryDetector) Detect(spec config.SourceConfig, src source.DiceSource, runAt time.Time) (RunReport, error) {
	sampleCount := d.SampleCount
	if sampleCount <= 0 {
		sampleCount = defaultFactorySampleCount
	}
	bitsPerSample := d.BitsPerSample
	if bitsPerSample <= 0 {
		bitsPerSample = defaultFactoryBitsPerSample
	}
	if bitsPerSample%8 != 0 {
		return RunReport{}, fmt.Errorf("bits per sample must be divisible by 8")
	}
	roundFunc := d.RoundFunc
	if roundFunc == nil {
		roundFunc = trisiadetect.Round15
	}
	thresholdFunc := d.ThresholdFunc
	if thresholdFunc == nil {
		thresholdFunc = trisiadetect.Threshold
	}
	uniformityFunc := d.UniformityFunc
	if uniformityFunc == nil {
		uniformityFunc = trisiadetect.ThresholdQ
	}

	buf := make([]byte, bitsPerSample/8)
	testReports := make([]TestReport, 0)
	qBuckets := make([][]float64, 0)

	for sampleIndex := 0; sampleIndex < sampleCount; sampleIndex++ {
		source.FillRandomnessBuffer(src, buf)
		results := roundFunc(buf)
		if sampleIndex == 0 {
			testReports = make([]TestReport, len(results))
			qBuckets = make([][]float64, len(results))
			for i, result := range results {
				testReports[i] = TestReport{Name: result.Name, RoundCount: sampleCount}
				qBuckets[i] = make([]float64, 0, sampleCount)
			}
		} else if len(results) != len(testReports) {
			return RunReport{}, fmt.Errorf("inconsistent test result count: got %d, want %d", len(results), len(testReports))
		}

		for i, result := range results {
			if result.Pass {
				testReports[i].RoundPassCount++
			}
			if result.P2 != 0 || result.Q2 != 0 {
				testReports[i].HasSecondaryMetrics = true
			}
			testReports[i].Rounds = append(testReports[i].Rounds, RoundReport{
				Index: sampleIndex + 1,
				P:     result.P,
				Q:     result.Q,
				P2:    result.P2,
				Q2:    result.Q2,
				Pass:  result.Pass,
			})
			qBuckets[i] = append(qBuckets[i], result.Q)
		}
	}

	requiredPassCount := thresholdFunc(sampleCount)
	testPassedCount := 0
	for i := range testReports {
		testReports[i].RequiredPassCount = requiredPassCount
		testReports[i].PassRate = float64(testReports[i].RoundPassCount) / float64(sampleCount)
		testReports[i].UniformityPValue = uniformityFunc(qBuckets[i])
		testReports[i].UniformityPass = testReports[i].UniformityPValue >= randomness.AlphaT
		testReports[i].OverallPass = testReports[i].RoundPassCount >= requiredPassCount && testReports[i].UniformityPass
		if testReports[i].OverallPass {
			testPassedCount++
		}
	}

	testTotalCount := len(testReports)
	overallPass := testPassedCount == testTotalCount && testTotalCount > 0
	overallPassRate := 0.0
	if testTotalCount > 0 {
		overallPassRate = float64(testPassedCount) / float64(testTotalCount)
	}

	runID := spec.ID + "-" + runAt.UTC().Format("20060102T150405.000000000Z")

	return RunReport{
		SchemaVersion: 1,
		Source: SourceMetadata{
			ID:           spec.ID,
			Name:         spec.Name,
			Type:         spec.Type,
			Algorithm:    spec.Algorithm,
			Standard:     spec.Standard,
			Description:  spec.Description,
			Security:     spec.Security,
			UnsafeReason: spec.UnsafeReason,
		},
		Run: RunMetadata{
			RunID:         runID,
			Mode:          "factory",
			StartedAt:     runAt.UTC(),
			CompletedAt:   runAt.UTC(),
			SampleCount:   sampleCount,
			BitsPerSample: bitsPerSample,
		},
		Summary: RunSummary{
			OverallPass:      overallPass,
			TestPassedCount:  testPassedCount,
			TestTotalCount:   testTotalCount,
			OverallPassRate:  overallPassRate,
			SamplesRequired:  requiredPassCount,
			SamplesCollected: sampleCount,
		},
		Tests: testReports,
	}, nil
}
