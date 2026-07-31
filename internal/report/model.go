package report

import "time"

type SourceMetadata struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	Algorithm   string `json:"algorithm,omitempty"`
	Standard    string `json:"standard,omitempty"`
	Description string `json:"description,omitempty"`
}

type RunMetadata struct {
	RunID         string    `json:"run_id"`
	Mode          string    `json:"mode"`
	StartedAt     time.Time `json:"started_at"`
	CompletedAt   time.Time `json:"completed_at"`
	SampleCount   int       `json:"sample_count"`
	BitsPerSample int       `json:"bits_per_sample"`
}

type RunSummary struct {
	OverallPass      bool    `json:"overall_pass"`
	TestPassedCount  int     `json:"test_passed_count"`
	TestTotalCount   int     `json:"test_total_count"`
	OverallPassRate  float64 `json:"overall_pass_rate"`
	SamplesRequired  int     `json:"samples_required"`
	SamplesCollected int     `json:"samples_collected"`
}

type RoundReport struct {
	Index int     `json:"index"`
	P     float64 `json:"p"`
	Q     float64 `json:"q"`
	P2    float64 `json:"p2,omitempty"`
	Q2    float64 `json:"q2,omitempty"`
	Pass  bool    `json:"pass"`
}

type TestReport struct {
	Name                string        `json:"name"`
	RoundPassCount      int           `json:"round_pass_count"`
	RequiredPassCount   int           `json:"required_pass_count"`
	RoundCount          int           `json:"round_count"`
	PassRate            float64       `json:"pass_rate"`
	UniformityPValue    float64       `json:"uniformity_p_value"`
	UniformityPass      bool          `json:"uniformity_pass"`
	OverallPass         bool          `json:"overall_pass"`
	HasSecondaryMetrics bool          `json:"has_secondary_metrics,omitempty"`
	Rounds              []RoundReport `json:"rounds,omitempty"`
}

type RunReport struct {
	SchemaVersion     int            `json:"schema_version"`
	Source            SourceMetadata `json:"source"`
	Run               RunMetadata    `json:"run"`
	Summary           RunSummary     `json:"summary"`
	VisualizationPath string         `json:"visualization_path,omitempty"`
	Tests             []TestReport   `json:"tests"`
}

type ManifestTestMetric struct {
	Name              string   `json:"name"`
	PassRate          float64  `json:"pass_rate"`
	OverallPass       bool     `json:"overall_pass"`
	RoundPassCount    int      `json:"round_pass_count"`
	RequiredPassCount int      `json:"required_pass_count"`
	RoundCount        int      `json:"round_count"`
	UniformityPValue  float64  `json:"uniformity_p_value"`
	AvgP              float64  `json:"avg_p"`
	AvgQ              float64  `json:"avg_q"`
	AvgP2             *float64 `json:"avg_p2,omitempty"`
	AvgQ2             *float64 `json:"avg_q2,omitempty"`
	LatestP           float64  `json:"latest_p"`
	LatestQ           float64  `json:"latest_q"`
	LatestP2          *float64 `json:"latest_p2,omitempty"`
	LatestQ2          *float64 `json:"latest_q2,omitempty"`
}

type ManifestEntry struct {
	RunID             string               `json:"run_id"`
	Timestamp         time.Time            `json:"timestamp"`
	Path              string               `json:"path"`
	VisualizationPath string               `json:"visualization_path,omitempty"`
	OverallPass       bool                 `json:"overall_pass"`
	OverallPassRate   float64              `json:"overall_pass_rate"`
	TestPassedCount   int                  `json:"test_passed_count"`
	TestTotalCount    int                  `json:"test_total_count"`
	TestMetrics       []ManifestTestMetric `json:"test_metrics,omitempty"`
}

type ManifestSource struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Type        string          `json:"type"`
	Algorithm   string          `json:"algorithm,omitempty"`
	Standard    string          `json:"standard,omitempty"`
	Description string          `json:"description,omitempty"`
	Latest      ManifestEntry   `json:"latest"`
	Results     []ManifestEntry `json:"results"`
}

type Manifest struct {
	SchemaVersion int              `json:"schema_version"`
	GeneratedAt   time.Time        `json:"generated_at"`
	Sources       []ManifestSource `json:"sources"`
}

type SourceFailure struct {
	SourceID string `json:"source_id"`
	Stage    string `json:"stage"`
	Message  string `json:"message"`
}

type RunResult struct {
	Reports  []RunReport     `json:"reports"`
	Failures []SourceFailure `json:"failures,omitempty"`
}
