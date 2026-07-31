package app

import (
	"flag"
	"fmt"
	"io"
	"os"

	"randomnessreporter/internal/config"
	"randomnessreporter/internal/report"
	"randomnessreporter/internal/source"
)

type RunService interface {
	Run(cfg config.AppConfig) (report.RunResult, error)
}

type CLI struct {
	LoadConfig      func(path string) (config.AppConfig, error)
	Runner          RunService
	RebuildManifest func(resultsDir string) error
	Stdout          io.Writer
}

func NewDefaultCLI(stdout io.Writer) CLI {
	return CLI{
		LoadConfig: config.Load,
		Runner: report.Generator{
			Builder:  source.NewRegistry(),
			Detector: report.FactoryDetector{},
		},
		RebuildManifest: report.RebuildManifest,
		Stdout:          stdout,
	}
}

func (c CLI) Run(args []string) error {
	loadConfig := c.LoadConfig
	if loadConfig == nil {
		loadConfig = config.Load
	}
	stdout := c.Stdout
	if stdout == nil {
		stdout = io.Discard
	}
	rebuildManifest := c.RebuildManifest
	if rebuildManifest == nil {
		rebuildManifest = report.RebuildManifest
	}

	fs := flag.NewFlagSet("randomness-reporter", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	configPath := fs.String("config", "config/sources.json", "path to source config JSON")
	outputPath := fs.String("output", "", "override results output directory")
	rebuildOnly := fs.Bool("rebuild-manifest", false, "rebuild manifest.json from existing report files")
	if err := fs.Parse(args); err != nil {
		return err
	}

	if *rebuildOnly {
		resultsDir := *outputPath
		if resultsDir == "" {
			cfg, err := loadConfig(*configPath)
			if err != nil {
				return err
			}
			resultsDir = cfg.ResultsDir
		}
		if err := rebuildManifest(resultsDir); err != nil {
			return err
		}
		_, _ = fmt.Fprintf(stdout, "manifest rebuilt in %s\n", resultsDir)
		return nil
	}

	runner := c.Runner
	if runner == nil {
		return fmt.Errorf("runner is required")
	}

	cfg, err := loadConfig(*configPath)
	if err != nil {
		return err
	}
	if *outputPath != "" {
		cfg.ResultsDir = *outputPath
	}

	result, err := runner.Run(cfg)
	if err != nil {
		return err
	}

	_, _ = fmt.Fprintf(stdout, "generated %d report(s) into %s\n", len(result.Reports), cfg.ResultsDir)
	for _, item := range result.Reports {
		_, _ = fmt.Fprintf(stdout, "- %s\n", item.Source.ID)
	}
	for _, failure := range result.Failures {
		_, _ = fmt.Fprintf(stdout, "! %s [%s] %s\n", failure.SourceID, failure.Stage, failure.Message)
	}
	return nil
}

func RunMain() int {
	cli := NewDefaultCLI(os.Stdout)
	if err := cli.Run(os.Args[1:]); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "randomness-reporter: %v\n", err)
		return 1
	}
	return 0
}
