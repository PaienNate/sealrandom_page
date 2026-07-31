import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildPageTabState,
  buildSourceDescription,
  buildLatestTestBarData,
  buildSplitTimeSeries,
  buildSummaryCards,
  buildTestDetails,
  buildTimeSeries,
  buildVisualizationPanelData,
  buildVisualizationCanvasConfig,
  decodeVisualizationBits,
  findSourcesToLoad,
  escapeHTML,
  formatDisplayNumber,
  formatDisplayPercent,
  manifestToReportsBySource,
  renderMarkdown,
} from './app.mjs';

const indexHTML = readFileSync(join(import.meta.dirname, '..', 'index.html'), 'utf8');
const faqMarkdownPath = join(import.meta.dirname, '..', 'content', 'random-org-faq.zh.md');
const faqMarkdown = existsSync(faqMarkdownPath) ? readFileSync(faqMarkdownPath, 'utf8') : '';
const workflowPath = join(import.meta.dirname, '..', '..', '.github', 'workflows', 'daily-randomness-report.yml');
const workflowText = existsSync(workflowPath) ? readFileSync(workflowPath, 'utf8') : '';
const linuxBinaryPath = join(import.meta.dirname, '..', '..', 'bin', 'randomness-reporter');

const reportsBySource = {
  alpha: [
    {
      source: { id: 'alpha', name: 'Alpha' },
      run: { completed_at: '2026-07-01T00:00:00Z' },
      summary: { overall_pass_rate: 1 },
      tests: [
        { name: 'Poker', pass_rate: 0.6, overall_pass: true },
        { name: 'Runs', pass_rate: 0.9, overall_pass: true },
      ],
    },
    {
      source: { id: 'alpha', name: 'Alpha' },
      run: { completed_at: '2026-07-02T00:00:00Z' },
      summary: { overall_pass_rate: 0.5 },
      tests: [
        { name: 'Poker', pass_rate: 0.8, overall_pass: true },
        { name: 'Runs', pass_rate: 0.7, overall_pass: false },
      ],
    },
  ],
  beta: [
    {
      source: { id: 'beta', name: 'Beta' },
      run: { completed_at: '2026-07-15T00:00:00Z' },
      summary: { overall_pass_rate: 0.75 },
      tests: [
        { name: 'Poker', pass_rate: 0.5, overall_pass: false },
        { name: 'Runs', pass_rate: 0.95, overall_pass: true },
      ],
    },
  ],
};

test('buildTimeSeries aggregates overall metric by month', () => {
  const result = buildTimeSeries({
    reportsBySource,
    sourceOrder: ['alpha', 'beta'],
    period: 'month',
    metric: { kind: 'overall' },
  });

  assert.deepEqual(result.categories, ['2026-07']);
  assert.deepEqual(result.series, [
    { id: 'alpha', name: 'Alpha', values: [0.75] },
    { id: 'beta', name: 'Beta', values: [0.75] },
  ]);
});

test('buildTimeSeries aggregates individual test metric by month', () => {
  const result = buildTimeSeries({
    reportsBySource,
    sourceOrder: ['alpha', 'beta'],
    period: 'month',
    metric: { kind: 'test', testName: 'Poker' },
  });

  assert.deepEqual(result.categories, ['2026-07']);
  assert.deepEqual(result.series, [
    { id: 'alpha', name: 'Alpha', values: [0.7] },
    { id: 'beta', name: 'Beta', values: [0.5] },
  ]);
});

test('buildSplitTimeSeries returns per-test series for one selected source', () => {
  const result = buildSplitTimeSeries({
    reportsBySource,
    sourceID: 'alpha',
    period: 'day',
  });

  assert.deepEqual(result.categories, ['2026-07-01', '2026-07-02']);
  assert.deepEqual(result.series, [
    { id: 'Poker', name: 'Poker', values: [0.6, 0.8] },
    { id: 'Runs', name: 'Runs', values: [0.9, 0.7] },
  ]);
});

test('display formatters use two decimals', () => {
  assert.equal(formatDisplayPercent(0.98765), '98.77%');
  assert.equal(formatDisplayNumber(0.123456), '0.12');
});

test('buildSummaryCards excludes latest-all-pass card', () => {
  const result = buildSummaryCards({
    source: { name: 'PCG Secondary' },
    run: { completed_at: '2026-07-31T00:00:00Z' },
    summary: { overall_pass_rate: 1 },
  });

  assert.deepEqual(result.map((item) => item.label), ['数据源', '平均通过率', '最新批次']);
});

test('buildSourceDescription returns selected source metadata', () => {
  const result = buildSourceDescription({
    source: {
      name: 'GM 国密',
      type: 'gm',
      algorithm: 'SM3 Hash DRBG',
      standard: 'GM/T 0105-2021',
      description: '符合国内商密行业标准。',
    },
  });

  assert.deepEqual(result, {
    name: 'GM 国密',
    type: 'gm',
    algorithm: 'SM3 Hash DRBG',
    standard: 'GM/T 0105-2021',
    description: '符合国内商密行业标准。',
  });
});

test('index uses top-level report and FAQ page tabs', () => {
  assert.match(indexHTML, /data-page-tab="report"[^>]*>检测报告</);
  assert.match(indexHTML, /data-page-tab="faq"[^>]*>FAQ</);
  assert.match(indexHTML, /data-page-view="report"/);
  assert.match(indexHTML, /data-page-view="faq"/);
  assert.match(indexHTML, /data-faq-markdown="\.\/content\/random-org-faq\.zh\.md"/);
  assert.doesNotMatch(indexHTML, /data-knowledge-tab/);
  assert.doesNotMatch(indexHTML, /data-knowledge-panel/);
  assert.doesNotMatch(indexHTML, /Introduction to Randomness and Random Numbers/);
});

test('index includes random-source bitmap visualization block', () => {
  assert.match(indexHTML, /id="visualization-panel"/);
  assert.match(indexHTML, /随机源图片生成/);
  assert.match(indexHTML, /点击放大以查看是否具有规律/);
  assert.match(indexHTML, /id="visualization-modal"/);

  const sidebarEnd = indexHTML.indexOf('</aside>');
  const reportStart = indexHTML.indexOf('data-page-view="report"');
  const panelIndex = indexHTML.indexOf('id="visualization-panel"');
  const panelHTML = indexHTML.slice(panelIndex, indexHTML.indexOf('</section>', panelIndex));
  const descriptionIndex = panelHTML.indexOf('一种检验随机数生成器的方法是将它产生的数字可视化。');
  const openButtonIndex = panelHTML.indexOf('id="visualization-open"');
  assert.equal(panelIndex > 0 && panelIndex < sidebarEnd, true);
  assert.equal(panelIndex > reportStart && panelIndex < indexHTML.indexOf('</main>'), false);
  assert.equal(descriptionIndex > 0 && descriptionIndex < openButtonIndex, true);
});

test('FAQ translation lives in editable markdown source', () => {
  assert.equal(existsSync(faqMarkdownPath), true);
  for (const heading of [
    '## Q0：测试有一次没有通过！这是否说明这个随机源不随机？',
    '## Q1：怎么能确定这些数字是真正随机的？',
    '## Q2：如果我觉得掷骰子或抛硬币的结果看起来不太随机，怎么办？',
    '## Q3：这些数字符合本福特定律吗？',
    '## Q4：原始随机比特和实际骰点是如何对照的？',
  ]) {
    assert.match(faqMarkdown, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(faqMarkdown, /从理论上说，不可能证明一个随机数发生器确实随机。/);
  assert.match(faqMarkdown, /人的大脑非常擅长寻找模式/);
  assert.match(faqMarkdown, /拒绝采样（rejection sampling）来避免取模偏差/);
  assert.doesNotMatch(faqMarkdown, /RANDOM\.ORG is a true random number service/);
});

test('daily workflow uses committed Linux binary for report generation', () => {
  assert.equal(existsSync(linuxBinaryPath), true);
  assert.match(workflowText, /\.\/bin\/randomness-reporter -config \.\/config\/sources\.json -output \.\/docs\/results/);
  assert.doesNotMatch(workflowText, /go run \.\/cmd\/randomness-reporter/);
});

test('buildPageTabState activates one top-level page tab and page', () => {
  const state = buildPageTabState('faq', ['report', 'faq']);

  assert.deepEqual(state, [
    { id: 'report', active: false },
    { id: 'faq', active: true },
  ]);
});

test('renderMarkdown renders headings, links, paragraphs and tables', () => {
  const result = renderMarkdown(`### 标题\n\n这一段包含 [链接](https://example.com)。\n\n| A | B |\n| --- | --- |\n| 1 | 2 |`);

  assert.match(result, /<h3>标题<\/h3>/);
  assert.match(result, /<a href="https:\/\/example\.com">链接<\/a>/);
  assert.match(result, /<p>这一段包含/);
  assert.match(result, /<table>/);
  assert.match(result, /<th>A<\/th>/);
  assert.match(result, /<td>2<\/td>/);
});

test('escapeHTML escapes values from manifest before template rendering', () => {
  assert.equal(escapeHTML('<source id="x">'), '&lt;source id=&quot;x&quot;&gt;');
});

test('buildLatestTestBarData returns current report test pass rates', () => {
  const result = buildLatestTestBarData(reportsBySource.alpha[1]);

  assert.deepEqual(result.labels, ['Poker', 'Runs']);
  assert.deepEqual(result.values, [0.8, 0.7]);
  assert.deepEqual(result.passFlags, [true, false]);
});

test('buildVisualizationPanelData returns latest selected-source image details', () => {
  const result = buildVisualizationPanelData({
    source: { name: 'PCG Primary' },
    visualization_path: 'results/visualizations/pcg-primary/2026/latest.json',
  });

  assert.deepEqual(result, {
    sourceName: 'PCG Primary',
    dataPath: 'results/visualizations/pcg-primary/2026/latest.json',
    label: 'PCG Primary 最新随机源位图',
  });
});

test('decodeVisualizationBits decodes base64 bitstream into grayscale pixels', () => {
  const result = decodeVisualizationBits({
    width: 2,
    height: 2,
    encoding: 'base64-msb-bitstream-v1',
    data: 'oA==',
  });

  assert.deepEqual([...result.pixels], [255, 0, 255, 0]);
});

test('buildVisualizationCanvasConfig uses 64px thumbnail and full-size modal', () => {
  assert.deepEqual(buildVisualizationCanvasConfig({ width: 512, height: 512 }, 'thumbnail'), { cssWidth: 64, cssHeight: 64 });
  assert.deepEqual(buildVisualizationCanvasConfig({ width: 512, height: 512 }, 'modal'), { cssWidth: 512, cssHeight: 512 });
});

test('findSourcesToLoad only returns sources missing from cache', () => {
  const result = findSourcesToLoad({ alpha: [] }, ['alpha', 'beta', 'gamma']);
  assert.deepEqual(result, ['beta', 'gamma']);
});

test('manifestToReportsBySource maps manifest summaries into chart-friendly reports', () => {
  const result = manifestToReportsBySource([
    {
      id: 'alpha',
      name: 'Alpha',
      type: 'gm',
      algorithm: 'SM3 Hash DRBG',
      standard: 'GM/T 0105-2021',
      description: 'GM source',
      results: [
        {
          timestamp: '2026-07-01T00:00:00Z',
          visualization_path: 'visualizations/alpha/2026/sample.json',
          overall_pass: true,
          overall_pass_rate: 0.9,
          test_metrics: [
            {
              name: 'Poker',
              pass_rate: 0.8,
              overall_pass: true,
              round_pass_count: 40,
              required_pass_count: 48,
              round_count: 50,
              uniformity_p_value: 0.1234,
              avg_p: 0.51,
              avg_q: 0.49,
              latest_p: 0.45,
              latest_q: 0.55,
            },
          ],
        },
      ],
    },
  ]);

  assert.deepEqual(result, {
    alpha: [
      {
        source: { id: 'alpha', name: 'Alpha', type: 'gm', algorithm: 'SM3 Hash DRBG', standard: 'GM/T 0105-2021', description: 'GM source' },
        run: { completed_at: '2026-07-01T00:00:00Z' },
        visualization_path: 'results/visualizations/alpha/2026/sample.json',
        summary: { overall_pass: true, overall_pass_rate: 0.9 },
        tests: [{
          name: 'Poker',
          pass_rate: 0.8,
          overall_pass: true,
          round_pass_count: 40,
          required_pass_count: 48,
          round_count: 50,
          uniformity_p_value: 0.1234,
          avg_p: 0.51,
          avg_q: 0.49,
          avg_p2: null,
          avg_q2: null,
          latest_p: 0.45,
          latest_q: 0.55,
          latest_p2: null,
          latest_q2: null,
        }],
      },
    ],
  });
});

test('buildTestDetails enriches tests with meaning and professional metrics', () => {
  const result = buildTestDetails({
    source: { id: 'alpha', name: 'Alpha' },
    tests: [
      {
        name: 'Poker',
        pass_rate: 0.8,
        overall_pass: false,
        round_pass_count: 40,
        required_pass_count: 48,
        round_count: 50,
        uniformity_p_value: 0.1234,
        avg_p: 0.51,
        avg_q: 0.49,
        latest_p: 0.45,
        latest_q: 0.55,
        latest_p2: 0.65,
        latest_q2: 0.35,
      },
    ],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Poker');
  assert.equal(
    result[0].summary,
    '扑克检测用来检测长度为m的2^m类子序列的个数是否接近。对于随机的序列，2^m类子序列的个数应该接近。',
  );
  assert.equal(result[0].stats.uniformityPValue, 0.1234);
  assert.equal(result[0].stats.latestP2, 0.65);
  assert.equal(result[0].stats.latestQ2, 0.35);
});

test('buildTestDetails uses GM/T 0005-2021 overview wording', () => {
  const result = buildTestDetails({
    source: { id: 'alpha', name: 'Alpha' },
    tests: [
      {
        name: '单比特频数检测',
        pass_rate: 1,
        overall_pass: true,
      },
    ],
  });

  assert.equal(
    result[0].summary,
    '单比特频数检测是最基本的检测，用来检测一个二元序列中0和1的个数是否相近。随机序列应具有较好的0、1平衡性。',
  );
});

test('buildTestDetails sorts tests by GM/T 0005-2021 section order', () => {
  const result = buildTestDetails({
    source: { id: 'alpha', name: 'Alpha' },
    tests: [
      { name: '累加和检测', pass_rate: 0.9, overall_pass: false },
      { name: '未知检测', pass_rate: 1, overall_pass: true },
      { name: 'Poker', pass_rate: 1, overall_pass: true },
      { name: '单比特频数检测', pass_rate: 1, overall_pass: true },
    ],
  });

  assert.deepEqual(result.map((item) => item.name), [
    '单比特频数检测',
    'Poker',
    '累加和检测',
    '未知检测',
  ]);
});

test('buildTestDetails keeps old manifest data renderable', () => {
  const result = buildTestDetails({
    source: { id: 'alpha', name: 'Alpha' },
    tests: [
      {
        name: '单比特频数检测',
        pass_rate: 0.98,
        overall_pass: true,
      },
    ],
  });

  assert.equal(result[0].stats.roundPassCount, null);
  assert.equal(result[0].stats.latestP, null);
  assert.equal(result[0].stats.uniformityPValue, null);
});
