const PERIODS = new Set(['day', 'week', 'month', 'year']);

const STANDARD_SIGNIFICANCE = '怎么看：先看 P_value 是否达到 α=0.01，再看这轮 s=1000 的样本通过率和 PT 是否一起稳。';

const DEFAULT_TEST_METADATA = {
  category: 'GM/T 0005-2021 第5章',
  summary: '看这项检测对应的比特特征是否自然、平稳。',
  significance: STANDARD_SIGNIFICANCE,
};

const SAMPLE_SET_JUDGMENT_NOTE = '本看板按 GM/T 0005-2021 第6.1条使用样本数量 s=1000；第6.2条用 α=0.01 看样本过线数量，第6.3条用 αT=0.0001 看 Q_value 分布是否铺开。';

const TEST_METADATA = {
  '单比特频数检测': {
    category: '5.1 单比特频数检测方法',
    summary: '看 0 和 1 的数量是否大体平衡。一个自然的比特流不会长期偏向某一边。',
    significance: STANDARD_SIGNIFICANCE,
  },
  '块内频数检测': {
    category: '5.2 块内频数检测方法',
    summary: '把序列切成小块，看每块里的 1 是否接近一半。它观察局部区域是否也保持平衡。',
    significance: STANDARD_SIGNIFICANCE,
  },
  Poker: {
    category: '5.3 扑克检测方法',
    summary: '把短比特片段当成牌型，观察各种牌型出现得是否均衡。它看的是小模式的丰富度。',
    significance: STANDARD_SIGNIFICANCE,
  },
  '扑克检测': {
    category: '5.3 扑克检测方法',
    summary: '把短比特片段当成牌型，观察各种牌型出现得是否均衡。它看的是小模式的丰富度。',
    significance: STANDARD_SIGNIFICANCE,
  },
  '重叠子序列检测方法': {
    category: '5.4 重叠子序列检测方法',
    summary: '用滑动窗口看连续片段的组合是否自然出现。它比扑克检测更关注相邻模式的衔接。',
    significance: STANDARD_SIGNIFICANCE,
  },
  '游程总数检测': {
    category: '5.5 游程总数检测方法',
    summary: '看连续 0 或连续 1 的段落数量是否自然。它观察比特流的切换节奏。',
    significance: STANDARD_SIGNIFICANCE,
  },
  '游程分布检测': {
    category: '5.6 游程分布检测方法',
    summary: '看短游程、长游程的比例是否自然。它关注连续段长度的层次是否顺滑。',
    significance: STANDARD_SIGNIFICANCE,
  },
  '块内最大游程检测': {
    category: '5.7 块内最大游程检测方法',
    summary: '把序列分块，观察每块里最长的连续 0 或 1 是否落在自然范围。它看局部极值。',
    significance: STANDARD_SIGNIFICANCE,
  },
  '二元推导检测(k=7)': {
    category: '5.8 二元推导检测方法',
    summary: '把相邻比特做异或，连续推导 7 次后再看 0/1 平衡。它观察隐藏在相邻关系里的结构。',
    significance: STANDARD_SIGNIFICANCE,
  },
  '自相关检测(d=16)': {
    category: '5.9 自相关检测方法',
    summary: '把序列和错开 16 位后的自己比较。它看前后位置之间是否保持低关联。',
    significance: STANDARD_SIGNIFICANCE,
  },
  '矩阵秩检测': {
    category: '5.10 矩阵秩检测方法',
    summary: '把比特排成矩阵，看行列之间是否有足够独立性。它观察线性结构是否丰富。',
    significance: STANDARD_SIGNIFICANCE,
  },
  '累加和检测': {
    category: '5.11 累加和检测方法',
    summary: '把 1 和 0 当成上下波动，观察累计曲线是否自然起伏。它看整体偏移是否平稳。',
    significance: STANDARD_SIGNIFICANCE,
  },
  '近似熵检测(m=5)': {
    category: '5.12 近似熵检测方法',
    summary: '比较 5 位模式和 6 位模式的丰富度。它看序列在增加一个比特后是否仍然保持变化。',
    significance: STANDARD_SIGNIFICANCE,
  },
  '线型复杂度检测(m=500)': {
    category: '5.13 线性复杂度检测方法',
    summary: '看每段序列需要多复杂的线性规则才能描述。复杂度分布自然，说明线性结构不单薄。',
    significance: STANDARD_SIGNIFICANCE,
  },
  'Maurer通用统计检测方法': {
    category: '5.14 Maurer通用统计检测方法',
    summary: '看序列里新模式出现的节奏。模式越丰富，统计上越接近自然随机流。',
    significance: STANDARD_SIGNIFICANCE,
  },
  '离散傅里叶检测': {
    category: '5.15 离散傅立叶检测方法',
    summary: '把比特流换成频谱来看周期痕迹。它观察是否有异常突出的重复节奏。',
    significance: STANDARD_SIGNIFICANCE,
  },
};

function average(values) {
  if (!values.length) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function startOfISOWeek(date) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return copy;
}

function bucketKey(timestamp, period) {
  const date = new Date(timestamp);
  switch (period) {
    case 'day':
      return date.toISOString().slice(0, 10);
    case 'week': {
      const weekStart = startOfISOWeek(date);
      return weekStart.toISOString().slice(0, 10);
    }
    case 'month':
      return date.toISOString().slice(0, 7);
    case 'year':
      return date.toISOString().slice(0, 4);
    default:
      throw new Error(`unsupported period: ${period}`);
  }
}

function metricValue(report, metric) {
  if (metric.kind === 'overall') {
    return report.summary?.overall_pass_rate ?? null;
  }
  if (metric.kind === 'test') {
    const matched = report.tests?.find((item) => item.name === metric.testName);
    return matched ? matched.pass_rate : null;
  }
  throw new Error(`unsupported metric kind: ${metric.kind}`);
}

function lookupTestMetadata(name) {
  return TEST_METADATA[name] ?? DEFAULT_TEST_METADATA;
}

export function buildPageTabState(activeID, tabIDs) {
  const fallback = tabIDs.includes(activeID) ? activeID : (tabIDs[0] ?? null);
  return tabIDs.map((id) => ({ id, active: id === fallback }));
}

function testSectionOrder(name) {
  const match = lookupTestMetadata(name).category.match(/^5\.(\d+)\b/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

export function formatDisplayPercent(value) {
  if (value == null) {
    return '--';
  }
  return `${(value * 100).toFixed(2)}%`;
}

function formatPercent(value) {
  return formatDisplayPercent(value);
}

export function formatDisplayNumber(value) {
  if (value == null || Number.isNaN(value)) {
    return '--';
  }
  if (value !== 0 && Math.abs(value) < 0.005) {
    return Number(value).toExponential(2);
  }
  return Number(value).toFixed(2);
}

function formatNumber(value) {
  return formatDisplayNumber(value);
}

function nullableMetric(value) {
  return value == null ? null : value;
}

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function renderInlineMarkdown(value) {
  return escapeHTML(value)
    .replace(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function tableCells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function isTableLine(line) {
  return /^\s*\|.+\|\s*$/.test(line);
}

function isSeparatorLine(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function renderTable(lines) {
  const header = tableCells(lines[0]);
  const rows = lines.slice(2).map(tableCells);
  return `
    <table>
      <thead><tr>${header.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  `;
}

export function renderMarkdown(markdown) {
  const lines = String(markdown ?? '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    html.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if (isTableLine(line) && isSeparatorLine(lines[index + 1] ?? '')) {
      flushParagraph();
      const tableLines = [line, lines[index + 1]];
      index += 2;
      while (index < lines.length && isTableLine(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }
      index -= 1;
      html.push(renderTable(tableLines));
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  return html.join('\n');
}

function metricCell(label, value) {
  const help = METRIC_HELP_BY_LABEL.get(label) ?? '';
  return `
    <div class="metric-cell">
      <span class="metric-label">${escapeHTML(label)}</span>
      <strong class="metric-value">${escapeHTML(value)}</strong>
      ${help ? `<span class="metric-help">${escapeHTML(help)}</span>` : ''}
    </div>
  `;
}

export function buildMetricHelpItems() {
  return [
    {
      label: '样本通过',
      help: '先看这轮有多少组样本过线。过线表示该样本的 P_value>=α；还要接着看 PT。',
    },
    {
      label: '门槛要求',
      help: '国标按 s=1000 算出的最低通过数量。实际通过数达到或超过这个门槛，样本数量这关就稳。',
    },
    {
      label: '样本通过率',
      help: '实际通过数除以 1000 组样本。越接近 100% 越好；这轮还要同时看均匀性 PT。',
    },
    {
      label: '均匀性 PT',
      help: '看这一项的 Q_value 有没有自然铺开。PT>=αT 表示分布这关过线，越靠近门槛越该多看几轮。',
    },
    {
      label: '平均 P/Q',
      help: '这轮 1000 组样本的长期平均。P 偏单样本，Q 偏集合分布，读它能看整体位置。',
    },
    {
      label: '最新 P/Q',
      help: '最近一个样本的 P_value 与 Q_value。先看整批，再用它感受当前波动。',
    },
    {
      label: '平均 P2/Q2',
      help: '有第二统计量的项目才显示。读法同平均 P/Q，用来观察这轮的另一侧结构。',
    },
    {
      label: '最新 P2/Q2',
      help: '有第二统计量的项目才显示。表示最近一个样本的补充观察角度。',
    },
  ];
}

const METRIC_HELP_BY_LABEL = new Map(buildMetricHelpItems().map((item) => [item.label, item.help]));

export function buildTimeSeries({ reportsBySource, sourceOrder, period, metric }) {
  if (!PERIODS.has(period)) {
    throw new Error(`unsupported period: ${period}`);
  }

  const bucketSet = new Set();
  const perSourceBuckets = new Map();

  for (const sourceID of sourceOrder) {
    const reports = reportsBySource[sourceID] ?? [];
    const bucketMap = new Map();

    for (const report of reports) {
      const key = bucketKey(report.run.completed_at, period);
      const value = metricValue(report, metric);
      if (value == null) {
        continue;
      }
      bucketSet.add(key);
      const values = bucketMap.get(key) ?? [];
      values.push(value);
      bucketMap.set(key, values);
    }

    perSourceBuckets.set(sourceID, bucketMap);
  }

  const categories = [...bucketSet].sort();
  const series = sourceOrder.map((sourceID) => {
    const reports = reportsBySource[sourceID] ?? [];
    const name = reports[0]?.source?.name ?? sourceID;
    const bucketMap = perSourceBuckets.get(sourceID) ?? new Map();
    return {
      id: sourceID,
      name,
      values: categories.map((key) => average(bucketMap.get(key) ?? [])),
    };
  });

  return { categories, series };
}

export function buildSplitTimeSeries({ reportsBySource, sourceID, period }) {
  if (!PERIODS.has(period)) {
    throw new Error(`unsupported period: ${period}`);
  }

  const reports = reportsBySource[sourceID] ?? [];
  const bucketSet = new Set();
  const testBuckets = new Map();

  for (const report of reports) {
    const key = bucketKey(report.run.completed_at, period);
    bucketSet.add(key);
    for (const item of report.tests ?? []) {
      const bucketMap = testBuckets.get(item.name) ?? new Map();
      const values = bucketMap.get(key) ?? [];
      values.push(item.pass_rate);
      bucketMap.set(key, values);
      testBuckets.set(item.name, bucketMap);
    }
  }

  const categories = [...bucketSet].sort();
  const series = [...testBuckets.keys()].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')).map((name) => {
    const bucketMap = testBuckets.get(name) ?? new Map();
    return {
      id: name,
      name,
      values: categories.map((key) => average(bucketMap.get(key) ?? [])),
    };
  });

  return { categories, series };
}

export function buildLatestTestBarData(report) {
  const tests = report?.tests ?? [];
  return {
    labels: tests.map((item) => item.name),
    values: tests.map((item) => item.pass_rate),
    passFlags: tests.map((item) => item.overall_pass),
  };
}

function latestTestsInStandardOrder(report) {
  return [...(report?.tests ?? [])].sort((a, b) => {
    const sectionDiff = testSectionOrder(a.name) - testSectionOrder(b.name);
    if (sectionDiff !== 0) {
      return sectionDiff;
    }
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  });
}

export function buildSampleMarginChartData(report) {
  const rows = latestTestsInStandardOrder(report).filter((item) => (
    item.round_pass_count != null
    && item.required_pass_count != null
    && item.round_count != null
  ));
  return {
    labels: rows.map((item) => item.name),
    margins: rows.map((item) => item.round_pass_count - item.required_pass_count),
    thresholds: rows.map((item) => item.required_pass_count),
    passCounts: rows.map((item) => item.round_pass_count),
    roundCounts: rows.map((item) => item.round_count),
  };
}

export function buildUniformityPTChartData(report) {
  const rows = latestTestsInStandardOrder(report).filter((item) => item.uniformity_p_value != null);
  return {
    labels: rows.map((item) => item.name),
    values: rows.map((item) => item.uniformity_p_value),
    threshold: 0.0001,
  };
}

export function buildPQMapChartData(report) {
  const rows = latestTestsInStandardOrder(report).filter((item) => item.avg_p != null && item.avg_q != null);
  return {
    points: rows.map((item) => ({ name: item.name, avgP: item.avg_p, avgQ: item.avg_q })),
  };
}

export function buildVisualizationPanelData(report) {
  if (!report?.visualization_path) {
    return null;
  }
  const sourceName = report.source?.name ?? '--';
  return {
    sourceName,
    dataPath: report.visualization_path,
    label: `${sourceName} 最新随机源位图`,
  };
}

export function decodeVisualizationBits(payload) {
  if (payload?.encoding !== 'base64-msb-bitstream-v1') {
    throw new Error(`unsupported visualization encoding: ${payload?.encoding ?? 'missing'}`);
  }
  const width = Number(payload.width);
  const height = Number(payload.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('invalid visualization dimensions');
  }

  const raw = atob(payload.data ?? '');
  const total = width * height;
  const pixels = new Uint8ClampedArray(total);
  for (let index = 0; index < total; index += 1) {
    const byte = raw.charCodeAt(Math.floor(index / 8));
    pixels[index] = byte & (1 << (7 - (index % 8))) ? 255 : 0;
  }
  return { width, height, pixels };
}

export function buildVisualizationCanvasConfig(data, mode) {
  if (mode === 'thumbnail') {
    return { cssWidth: 64, cssHeight: 64 };
  }
  return { cssWidth: data.width, cssHeight: data.height };
}

export function buildInsecurityProofData(report) {
  if (report?.source?.security !== 'insecure' || !report?.proof_path) {
    return null;
  }
  return {
    sourceName: report.source?.name ?? '--',
    reason: report.source?.unsafe_reason ?? '--',
    dataPath: report.proof_path,
  };
}

function undoRightShiftXor(value, shift) {
  let result = value >>> 0;
  for (let i = 0; i < 5; i += 1) {
    result = (value ^ (result >>> shift)) >>> 0;
  }
  return result >>> 0;
}

function undoLeftShiftXorAnd(value, shift, mask) {
  let result = value >>> 0;
  for (let i = 0; i < 5; i += 1) {
    result = (value ^ ((result << shift) & mask)) >>> 0;
  }
  return result >>> 0;
}

function temperMT19937(value) {
  let y = value >>> 0;
  y ^= y >>> 11;
  y ^= (y << 7) & 0x9d2c5680;
  y ^= (y << 15) & 0xefc60000;
  y ^= y >>> 18;
  return y >>> 0;
}

function untemperMT19937(value) {
  let y = value >>> 0;
  y = undoRightShiftXor(y, 18);
  y = undoLeftShiftXorAnd(y, 15, 0xefc60000);
  y = undoLeftShiftXorAnd(y, 7, 0x9d2c5680);
  y = undoRightShiftXor(y, 11);
  return y >>> 0;
}

function twistMT19937State(state) {
  const n = 624;
  const m = 397;
  const twisted = new Uint32Array(n);
  for (let i = 0; i < n; i += 1) {
    const x = (state[i] & 0x80000000) | (state[(i + 1) % n] & 0x7fffffff);
    let xA = x >>> 1;
    if (x & 1) {
      xA ^= 0x9908b0df;
    }
    twisted[i] = (state[(i + m) % n] ^ xA) >>> 0;
  }
  return twisted;
}

export function predictMT19937Next(outputs) {
  if (!Array.isArray(outputs) || outputs.length < 624) {
    throw new Error('MT19937 proof requires 624 observed outputs');
  }
  const recovered = new Uint32Array(outputs.slice(0, 624).map((value) => untemperMT19937(Number(value))));
  return temperMT19937(twistMT19937State(recovered)[0]);
}

export function predictLCGNext(proof) {
  const outputs = proof?.outputs ?? [];
  if (!outputs.length) {
    throw new Error('LCG proof requires at least one observed output');
  }
  const wordBits = BigInt(proof.word_bits ?? 32);
  const modulus = proof.modulus ? BigInt(proof.modulus) : (1n << wordBits);
  const multiplier = BigInt(proof.multiplier >>> 0);
  const increment = BigInt(proof.increment >>> 0);
  const current = BigInt(outputs[outputs.length - 1] >>> 0);
  return Number((multiplier * current + increment) % modulus);
}

function buildProofResult(payload) {
  if (payload?.kind === 'mt19937-state-recovery-v1') {
    const predicted = predictMT19937Next(payload.outputs ?? []);
    return {
      title: 'MT19937 状态恢复',
      method: '页面使用 624 个连续 32-bit 输出反 temper，恢复内部状态并预测下一项。',
      observed: `${payload.outputs?.length ?? 0} 个连续输出`,
      predicted,
      expected: payload.expected_next,
      passed: predicted === payload.expected_next,
    };
  }
  if (payload?.kind === 'lcg-state-prediction-v1') {
    const predicted = predictLCGNext(payload);
    return {
      title: 'LCG 状态预测',
      method: '页面用公开线性递推参数和当前输出直接计算下一状态。',
      observed: `${payload.outputs?.length ?? 0} 个连续输出`,
      predicted,
      expected: payload.expected_next,
      passed: predicted === payload.expected_next,
    };
  }
  throw new Error(`unsupported proof kind: ${payload?.kind ?? 'missing'}`);
}

export function buildTestDetails(report) {
  const tests = [...(report?.tests ?? [])].sort((a, b) => {
    const sectionDiff = testSectionOrder(a.name) - testSectionOrder(b.name);
    if (sectionDiff !== 0) {
      return sectionDiff;
    }
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  });

  return tests.map((item) => {
    const metadata = lookupTestMetadata(item.name);
    return {
      name: item.name,
      category: metadata.category,
      summary: metadata.summary,
      significance: `${metadata.significance} ${buildRunSignal(item)} ${SAMPLE_SET_JUDGMENT_NOTE}`,
      overallPass: item.overall_pass,
      stats: {
        passRate: nullableMetric(item.pass_rate),
        roundPassCount: nullableMetric(item.round_pass_count),
        requiredPassCount: nullableMetric(item.required_pass_count),
        roundCount: nullableMetric(item.round_count),
        uniformityPValue: nullableMetric(item.uniformity_p_value),
        avgP: nullableMetric(item.avg_p),
        avgQ: nullableMetric(item.avg_q),
        avgP2: item.avg_p2 ?? null,
        avgQ2: item.avg_q2 ?? null,
        latestP: nullableMetric(item.latest_p),
        latestQ: nullableMetric(item.latest_q),
        latestP2: item.latest_p2 ?? null,
        latestQ2: item.latest_q2 ?? null,
      },
    };
  });
}

function buildRunSignal(item) {
  const passCount = item.round_pass_count;
  const required = item.required_pass_count;
  const roundCount = item.round_count;
  const pt = item.uniformity_p_value;
  if (passCount == null || required == null || roundCount == null) {
    return '这轮：先看通过率，再看 PT。';
  }
  const margin = passCount - required;
  const marginText = margin >= 0 ? `比门槛多 ${margin} 组` : `比门槛少 ${Math.abs(margin)} 组`;
  const ptText = pt == null ? 'PT 暂无数据' : `PT=${formatNumber(pt)}`;
  return `这轮：样本通过 ${passCount}/${roundCount}，${marginText}；${ptText}。`;
}

export function buildTestVerdict(item) {
  if (item?.overallPass) {
    return { label: '通过', className: 'pass' };
  }
  const stats = item?.stats ?? {};
  if (stats.roundPassCount != null && stats.requiredPassCount != null && stats.roundPassCount < stats.requiredPassCount) {
    return { label: '样本未通过', className: 'fail' };
  }
  if (stats.uniformityPValue != null && stats.uniformityPValue < 0.0001) {
    return { label: '分布未通过', className: 'fail' };
  }
  return { label: '未通过', className: 'fail' };
}

export function findSourcesToLoad(reportCache, sourceIDs) {
  return sourceIDs.filter((sourceID) => !Object.prototype.hasOwnProperty.call(reportCache, sourceID));
}

export function manifestToReportsBySource(manifestSources) {
  const reportsBySource = {};
  for (const sourceItem of manifestSources) {
    reportsBySource[sourceItem.id] = (sourceItem.results ?? []).map((entry) => ({
      source: {
        id: sourceItem.id,
        name: sourceItem.name,
        type: sourceItem.type,
        algorithm: sourceItem.algorithm,
        standard: sourceItem.standard,
        description: sourceItem.description,
        security: sourceItem.security ?? 'secure',
        unsafe_reason: sourceItem.unsafe_reason ?? '',
      },
      run: { completed_at: entry.timestamp },
      visualization_path: entry.visualization_path ? `results/${entry.visualization_path}` : null,
      proof_path: entry.proof_path ? `results/${entry.proof_path}` : null,
      summary: {
        overall_pass: entry.overall_pass,
        overall_pass_rate: entry.overall_pass_rate,
      },
      tests: (entry.test_metrics ?? []).map((metric) => ({
        name: metric.name,
        pass_rate: metric.pass_rate,
        overall_pass: metric.overall_pass,
        round_pass_count: metric.round_pass_count ?? null,
        required_pass_count: metric.required_pass_count ?? null,
        round_count: metric.round_count ?? null,
        uniformity_p_value: metric.uniformity_p_value ?? null,
        avg_p: metric.avg_p ?? null,
        avg_q: metric.avg_q ?? null,
        avg_p2: metric.avg_p2 ?? null,
        avg_q2: metric.avg_q2 ?? null,
        latest_p: metric.latest_p ?? null,
        latest_q: metric.latest_q ?? null,
        latest_p2: metric.latest_p2 ?? null,
        latest_q2: metric.latest_q2 ?? null,
      })),
    }));
  }
  return reportsBySource;
}

async function fetchJSON(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`fetch failed: ${path} (${response.status})`);
  }
  return response.json();
}

function collectTestNames(reportsBySource) {
  const names = new Set();
  for (const reports of Object.values(reportsBySource)) {
    for (const report of reports) {
      for (const item of report.tests ?? []) {
        names.add(item.name);
      }
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

function latestReportsBySource(reportsBySource, sourceOrder) {
  return sourceOrder.map((sourceID) => latestReport(reportsBySource, sourceID)).filter(Boolean);
}

function latestReport(reportsBySource, sourceID) {
  const reports = reportsBySource[sourceID] ?? [];
  return [...reports].sort((a, b) => Date.parse(a.run.completed_at) - Date.parse(b.run.completed_at)).at(-1) ?? null;
}

export function buildSummaryCards(report) {
  const latestTime = report?.run?.completed_at ?? null;
  return [
    { label: '数据源', value: report?.source?.name ?? '--' },
    { label: '平均通过率', value: formatPercent(report?.summary?.overall_pass_rate ?? null) },
    { label: '最新批次', value: latestTime ? latestTime.slice(0, 10) : '--' },
  ];
}

export function buildSourceDescription(report) {
  const source = report?.source ?? {};
  return {
    name: source.name ?? '--',
    type: source.type ?? '--',
    algorithm: source.algorithm ?? '--',
    standard: source.standard ?? '--',
    description: source.description ?? '--',
    security: source.security ?? 'secure',
    unsafeReason: source.unsafe_reason ?? '--',
  };
}

export function renderSourceDescription(item) {
  const unsafe = item.security === 'insecure';
  return `
    <div class="source-description ${unsafe ? 'unsafe-source' : ''}">
      <strong>${escapeHTML(item.name)}${unsafe ? '<span class="unsafe-badge">不安全</span>' : ''}</strong>
      <dl>
        <div><dt>TYPE</dt><dd>${escapeHTML(item.type)}</dd></div>
        <div><dt>ALGORITHM</dt><dd class="${unsafe ? 'unsafe-algorithm' : ''}">${escapeHTML(item.algorithm)}</dd></div>
        <div><dt>STANDARD</dt><dd>${escapeHTML(item.standard)}</dd></div>
      </dl>
      <p>${escapeHTML(item.description)}</p>
      ${unsafe ? `<p class="unsafe-reason"><strong>为什么不安全</strong>${escapeHTML(item.unsafeReason)}</p>` : ''}
    </div>
  `;
}

function renderSummary(state, manifestSources, reportsBySource) {
  const summary = document.querySelector('#summary');
  const selected = latestReportsBySource(reportsBySource, [state.selectedSourceID]);
  const current = selected[0] ?? null;
  summary.innerHTML = buildSummaryCards(current).map((item) => `
    <div class="stat">
      <span class="label">${escapeHTML(item.label)}</span>
      <strong>${escapeHTML(item.value)}</strong>
    </div>
  `).join('');

  const sourceList = document.querySelector('#source-list');
  sourceList.innerHTML = `
    <select id="source-select" class="source-select">
      ${manifestSources.map((item) => `<option value="${escapeHTML(item.id)}" ${state.selectedSourceID === item.id ? 'selected' : ''}>${escapeHTML(item.name)}</option>`).join('')}
    </select>
    ${renderSourceDescription(buildSourceDescription(current))}
  `;

  sourceList.querySelector('#source-select').addEventListener('change', (event) => {
    state.selectedSourceID = event.target.value;
    window.requestAnimationFrame(() => renderApp(state, manifestSources, state.reportsBySource));
  });
}

function renderControls(state, reportsBySource) {
  const periodEl = document.querySelector('#period-controls');
  const periodLabels = { day: '日', week: '周', month: '月', year: '年' };
  periodEl.innerHTML = ['day', 'week', 'month', 'year'].map((item) => `
    <button class="chip ${state.period === item ? 'active' : ''}" data-period="${item}">${periodLabels[item]}</button>
  `).join('');
  periodEl.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      state.period = button.dataset.period;
      renderApp(state, state.manifestSources, reportsBySource);
    });
  });

  const tabEl = document.querySelector('#tab-controls');
  const tabs = [
    { id: 'overall', label: '整体' },
    { id: 'split', label: '分项' },
  ];
  tabEl.innerHTML = tabs.map((item) => `
    <button class="tab ${state.activeTab === item.id ? 'active' : ''}" data-tab="${item.id}">${item.label}</button>
  `).join('');
  tabEl.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeTab = button.dataset.tab;
      renderApp(state, state.manifestSources, reportsBySource);
    });
  });
}

let visualizationRequestID = 0;
let latestVisualizationCanvasData = null;
let latestVisualizationLabel = '';

function drawVisualizationCanvas(frameEl, data, label, mode) {
  const canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;
  const config = buildVisualizationCanvasConfig(data, mode);
  canvas.style.width = `${config.cssWidth}px`;
  canvas.style.height = `${config.cssHeight}px`;
  canvas.setAttribute('aria-label', label);
  canvas.setAttribute('role', 'img');

  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(data.width, data.height);
  for (let index = 0; index < data.pixels.length; index += 1) {
    const value = data.pixels[index];
    const offset = index * 4;
    image.data[offset] = value;
    image.data[offset + 1] = value;
    image.data[offset + 2] = value;
    image.data[offset + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);

  frameEl.innerHTML = '';
  frameEl.append(canvas);
}

function openVisualizationModal() {
  const modal = document.querySelector('#visualization-modal');
  const frame = document.querySelector('#visualization-modal-frame');
  if (!modal || !frame || !latestVisualizationCanvasData) {
    return;
  }

  drawVisualizationCanvas(frame, latestVisualizationCanvasData, latestVisualizationLabel, 'modal');
  modal.hidden = false;
}

function closeVisualizationModal() {
  const modal = document.querySelector('#visualization-modal');
  if (modal) {
    modal.hidden = true;
  }
}

function initializeVisualizationModal() {
  document.querySelector('#visualization-open')?.addEventListener('click', openVisualizationModal);
  document.querySelector('#visualization-close')?.addEventListener('click', closeVisualizationModal);
  document.querySelector('#visualization-modal')?.addEventListener('click', (event) => {
    if (event.target?.id === 'visualization-modal') {
      closeVisualizationModal();
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeVisualizationModal();
    }
  });
}

async function renderVisualization(state, reportsBySource) {
  const requestID = ++visualizationRequestID;
  const sourceEl = document.querySelector('#visualization-source');
  const frameEl = document.querySelector('#visualization-frame');
  const report = latestReport(reportsBySource, state.selectedSourceID);
  const data = buildVisualizationPanelData(report);
  closeVisualizationModal();
  latestVisualizationCanvasData = null;
  latestVisualizationLabel = '';

  if (!data) {
    if (sourceEl) {
      sourceEl.textContent = report?.source?.name ?? '--';
    }
    if (frameEl) {
      frameEl.innerHTML = '<p class="visualization-empty">当前结果没有随机源位图。</p>';
    }
    return;
  }

  sourceEl.textContent = data.sourceName;
  frameEl.innerHTML = '<p class="visualization-empty">随机源位图加载中...</p>';
  try {
    const payload = await fetchJSON(data.dataPath);
    if (requestID !== visualizationRequestID) {
      return;
    }
    latestVisualizationCanvasData = decodeVisualizationBits(payload);
    latestVisualizationLabel = data.label;
    drawVisualizationCanvas(frameEl, latestVisualizationCanvasData, data.label, 'thumbnail');
  } catch (error) {
    if (requestID === visualizationRequestID) {
      frameEl.innerHTML = `<p class="visualization-empty">随机源位图加载失败: ${escapeHTML(error.message)}</p>`;
    }
  }
}

let insecurityProofRequestID = 0;

async function renderInsecurityProof(state, reportsBySource) {
  const requestID = ++insecurityProofRequestID;
  const panel = document.querySelector('#insecurity-panel');
  const target = document.querySelector('#insecurity-proof');
  if (!panel || !target) {
    return;
  }

  const report = latestReport(reportsBySource, state.selectedSourceID);
  const data = buildInsecurityProofData(report);
  if (!data) {
    panel.hidden = true;
    target.innerHTML = '';
    return;
  }

  panel.hidden = false;
  target.innerHTML = `
    <p class="unsafe-reason"><strong>${escapeHTML(data.sourceName)}</strong>${escapeHTML(data.reason)}</p>
    <p class="visualization-empty">逆向证明加载中...</p>
  `;

  try {
    const payload = await fetchJSON(data.dataPath);
    if (requestID !== insecurityProofRequestID) {
      return;
    }
    const result = buildProofResult(payload);
    target.innerHTML = `
      <p class="unsafe-reason"><strong>${escapeHTML(data.sourceName)}</strong>${escapeHTML(data.reason)}</p>
      <div class="proof-grid">
        <div><span>证明方式</span><strong>${escapeHTML(result.title)}</strong></div>
        <div><span>观测输出</span><strong>${escapeHTML(result.observed)}</strong></div>
        <div><span>页面预测</span><strong>${escapeHTML(result.predicted)}</strong></div>
        <div><span>真实下一项</span><strong>${escapeHTML(result.expected)}</strong></div>
      </div>
      <p class="proof-result ${result.passed ? 'passed' : 'failed'}">${result.passed ? '预测成功：该输出流不是密码学安全随机。' : '预测失败：proof 数据与页面算法不一致。'}</p>
      <p class="proof-method">${escapeHTML(result.method)}</p>
    `;
  } catch (error) {
    if (requestID === insecurityProofRequestID) {
      target.innerHTML = `<p class="visualization-empty">逆向证明加载失败: ${escapeHTML(error.message)}</p>`;
    }
  }
}

function renderTrendChart(state, reportsBySource) {
  const selectedSource = state.manifestSources.find((item) => item.id === state.selectedSourceID);
  const seriesData = state.activeTab === 'overall'
    ? buildTimeSeries({
        reportsBySource,
        sourceOrder: [state.selectedSourceID],
        period: state.period,
        metric: { kind: 'overall' },
      })
    : buildSplitTimeSeries({
        reportsBySource,
        sourceID: state.selectedSourceID,
        period: state.period,
      });
  const el = document.querySelector('#trend-chart');
  const chart = echarts.getInstanceByDom(el) ?? echarts.init(el);
  const title = state.activeTab === 'overall'
    ? `${selectedSource?.name ?? state.selectedSourceID} 整体通过率`
    : `${selectedSource?.name ?? state.selectedSourceID} 分项通过率`;

  chart.setOption({
    backgroundColor: '#ffffff',
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const rows = Array.isArray(params) ? params : [params];
        return [escapeHTML(rows[0]?.axisValue ?? ''), ...rows.map((item) => `${item.marker}${escapeHTML(item.seriesName)}: ${formatPercent(item.value)}`)].join('<br>');
      },
    },
    legend: { top: 40, type: 'scroll', textStyle: { color: '#111827' } },
    grid: { left: 64, right: 32, top: 94, bottom: 56, containLabel: true },
    xAxis: {
      type: 'category',
      data: seriesData.categories,
      axisLabel: { color: '#111827', hideOverlap: true },
      axisLine: { lineStyle: { color: '#111827' } },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      axisLabel: {
        color: '#111827',
        formatter: (value) => formatPercent(value),
      },
      splitLine: { lineStyle: { color: '#d1d5db', type: 'dashed' } },
    },
    series: seriesData.series.map((item) => ({
      name: item.name,
      type: 'line',
      smooth: false,
      symbolSize: 6,
      lineStyle: { width: 1.5 },
      data: item.values,
      connectNulls: false,
    })),
    title: {
      text: title,
      left: 'center',
      top: 8,
      textStyle: { color: '#111827', fontSize: 14, fontWeight: 700 },
    },
  });
}

function renderLatestChart(state, reportsBySource) {
  const report = latestReport(reportsBySource, state.selectedSourceID);

  if (!report) {
    clearLatestCharts();
    return;
  }

  renderSampleMarginChart(report);
  renderUniformityPTChart(report);
  renderPQMapChart(report);
}

function chartFor(selector) {
  const el = document.querySelector(selector);
  if (!el) {
    return null;
  }
  return echarts.getInstanceByDom(el) ?? echarts.init(el);
}

function clearLatestCharts() {
  for (const selector of ['#sample-margin-chart', '#uniformity-pt-chart', '#pq-map-chart']) {
    chartFor(selector)?.clear();
  }
}

function renderSampleMarginChart(report) {
  const chart = chartFor('#sample-margin-chart');
  if (!chart) {
    return;
  }
  const data = buildSampleMarginChartData(report);
  chart.setOption({
    backgroundColor: '#ffffff',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = params[0];
        const index = item.dataIndex;
        return [
          `${escapeHTML(item.name)}`,
          `比国标门槛多通过 ${escapeHTML(item.value)} 组样本`,
          `实际通过 ${escapeHTML(data.passCounts[index])}/${escapeHTML(data.roundCounts[index])}`,
          `门槛 ${escapeHTML(data.thresholds[index])}/${escapeHTML(data.roundCounts[index])}`,
        ].join('<br>');
      },
    },
    grid: { left: 118, right: 18, top: 12, bottom: 30, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#111827', formatter: (value) => `${value}` },
      splitLine: { lineStyle: { color: '#d1d5db', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: data.labels,
      axisLabel: { color: '#111827', width: 110, overflow: 'truncate' },
      axisLine: { lineStyle: { color: '#111827' } },
    },
    series: [{
      type: 'bar',
      data: data.margins.map((value) => ({ value, itemStyle: { color: value >= 0 ? '#065f46' : '#991b1b' } })),
      barMaxWidth: 14,
    }],
  });
}

function renderUniformityPTChart(report) {
  const chart = chartFor('#uniformity-pt-chart');
  if (!chart) {
    return;
  }
  const data = buildUniformityPTChartData(report);
  const safeValues = data.values.map((value) => Math.max(value, 1e-12));
  chart.setOption({
    backgroundColor: '#ffffff',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = params[0];
        const raw = data.values[item.dataIndex];
        const label = raw >= data.threshold ? 'PT 高于国标门槛' : 'PT 低于国标门槛';
        return `${escapeHTML(item.name)}<br>${escapeHTML(label)}<br>PT: ${escapeHTML(formatNumber(raw))}`;
      },
    },
    grid: { left: 118, right: 18, top: 12, bottom: 30, containLabel: true },
    xAxis: {
      type: 'log',
      min: 1e-12,
      max: 1,
      axisLabel: { color: '#111827', formatter: (value) => formatNumber(value) },
      splitLine: { lineStyle: { color: '#d1d5db', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: data.labels,
      axisLabel: { color: '#111827', width: 110, overflow: 'truncate' },
      axisLine: { lineStyle: { color: '#111827' } },
    },
    series: [{
      type: 'bar',
      data: safeValues.map((value, index) => ({
        value,
        itemStyle: { color: data.values[index] >= data.threshold ? '#003b73' : '#991b1b' },
      })),
      barMaxWidth: 14,
      markLine: {
        symbol: 'none',
        lineStyle: { color: '#991b1b', width: 2 },
        label: { formatter: 'alphaT', color: '#991b1b' },
        data: [{ xAxis: data.threshold }],
      },
    }],
  });
}

function renderPQMapChart(report) {
  const chart = chartFor('#pq-map-chart');
  if (!chart) {
    return;
  }
  const data = buildPQMapChartData(report);
  chart.setOption({
    backgroundColor: '#ffffff',
    tooltip: {
      trigger: 'item',
      formatter: (item) => {
        const point = data.points[item.dataIndex];
        return [
          `${escapeHTML(point.name)}`,
          `平均 P: ${escapeHTML(formatNumber(point.avgP))}`,
          `平均 Q: ${escapeHTML(formatNumber(point.avgQ))}`,
        ].join('<br>');
      },
    },
    grid: { left: 42, right: 22, top: 18, bottom: 40, containLabel: true },
    xAxis: {
      type: 'value',
      name: '平均 P',
      min: 0,
      max: 1,
      axisLabel: { color: '#111827', formatter: (value) => formatNumber(value) },
      splitLine: { lineStyle: { color: '#d1d5db', type: 'dashed' } },
    },
    yAxis: {
      type: 'value',
      name: '平均 Q',
      min: 0,
      max: 1,
      axisLabel: { color: '#111827', formatter: (value) => formatNumber(value) },
      splitLine: { lineStyle: { color: '#d1d5db', type: 'dashed' } },
    },
    series: [{
      type: 'scatter',
      symbolSize: 9,
      data: data.points.map((point) => [point.avgP, point.avgQ]),
      itemStyle: { color: '#065f46' },
      markArea: {
        silent: true,
        itemStyle: { color: 'rgba(0, 59, 115, 0.06)' },
        data: [[{ xAxis: 0.25, yAxis: 0.25 }, { xAxis: 0.75, yAxis: 0.75 }]],
      },
    }],
  });
}

export function buildTechnicalGlossaryItems() {
  return [
    {
      title: 'P-value (P)',
      body: '它做什么：给单个样本一个随机性读数。怎么看：P_value>=α，且 α=0.01，表示这个样本在这项检测里过线。',
    },
    {
      title: 'Q-value (Q)',
      body: '它做什么：把这轮多个样本的表现拿来观察分布。怎么看：Q_value 自然铺开，说明这项结果更平稳。',
    },
    {
      title: '均匀性 PT',
      body: '它做什么：把 Q_value 的铺开程度变成一个判断数。怎么看：PT>=αT，且 αT=0.0001，表示这轮分布过线。',
    },
    {
      title: '样本通过率',
      body: '它做什么：按样本数量 s=1000 统计这轮有多少样本满足 P_value>=α。怎么看：实际通过数达到门槛，样本数量这关过线。',
    },
    {
      title: '最终项目结论',
      body: '它做什么：把样本通过率和 PT 合在一起看。怎么看：两关都过，说明这项国标检测给出稳定信号。',
    },
    {
      title: 'P2 / Q2',
      body: '它做什么：给少数项目提供第二个观察角度。怎么看：读法同 P/Q，用来补充另一侧结构。',
    },
  ];
}

function renderTechnicalGlossary() {
  const glossary = document.querySelector('#technical-glossary');
  glossary.innerHTML = buildTechnicalGlossaryItems().map((item) => `
    <div class="glossary-item">
      <strong>${escapeHTML(item.title)}</strong>
      <p>${escapeHTML(item.body)}</p>
    </div>
  `).join('');
}

function renderTestDetails(state, reportsBySource) {
  const report = latestReport(reportsBySource, state.selectedSourceID);
  const title = document.querySelector('#detail-source-title');
  const list = document.querySelector('#test-detail-list');

  if (!report) {
    title.textContent = '当前没有可解释的测试结果';
    list.innerHTML = '';
    return;
  }

  title.textContent = `${report.source.name} 最新一轮专业解读`;
  const details = buildTestDetails(report);
  list.innerHTML = details.map((item) => {
    const samplePass = item.stats.roundPassCount == null || item.stats.roundCount == null
      ? '--'
      : `${item.stats.roundPassCount}/${item.stats.roundCount}`;
    const sampleThreshold = item.stats.requiredPassCount == null || item.stats.roundCount == null
      ? '--'
      : `${item.stats.requiredPassCount}/${item.stats.roundCount}`;
    const cells = [
      metricCell('样本通过', samplePass),
      metricCell('门槛要求', sampleThreshold),
      metricCell('样本通过率', formatPercent(item.stats.passRate)),
      metricCell('均匀性 PT', formatNumber(item.stats.uniformityPValue)),
      metricCell('平均 P/Q', `${formatNumber(item.stats.avgP)} / ${formatNumber(item.stats.avgQ)}`),
      metricCell('最新 P/Q', `${formatNumber(item.stats.latestP)} / ${formatNumber(item.stats.latestQ)}`),
    ];
    if (item.stats.avgP2 != null || item.stats.avgQ2 != null) {
      cells.push(metricCell('平均 P2/Q2', `${formatNumber(item.stats.avgP2)} / ${formatNumber(item.stats.avgQ2)}`));
    }
    if (item.stats.latestP2 != null || item.stats.latestQ2 != null) {
      cells.push(metricCell('最新 P2/Q2', `${formatNumber(item.stats.latestP2)} / ${formatNumber(item.stats.latestQ2)}`));
    }
    const verdict = buildTestVerdict(item);

    return `
      <article class="test-row">
        <div class="test-row-main">
          <div>
            <div class="test-row-title">
              <h3>${escapeHTML(item.name)}</h3>
              <span class="badge ${verdict.className}">${escapeHTML(verdict.label)}</span>
            </div>
            <p class="test-category">${escapeHTML(item.category)}</p>
          </div>
          <p class="test-summary">${escapeHTML(item.summary)}</p>
          <p class="test-significance">${escapeHTML(item.significance)}</p>
        </div>
        <div class="metric-grid">${cells.join('')}</div>
      </article>
    `;
  }).join('');
}

function resizeCharts() {
  for (const selector of ['#trend-chart', '#sample-margin-chart', '#uniformity-pt-chart', '#pq-map-chart']) {
    const el = document.querySelector(selector);
    const chart = el ? echarts.getInstanceByDom(el) : null;
    chart?.resize();
  }
}

function renderPageTabs(activeID) {
  const buttons = [...document.querySelectorAll('[data-page-tab]')];
  const pages = [...document.querySelectorAll('[data-page-view]')];
  const states = buildPageTabState(activeID, buttons.map((button) => button.dataset.pageTab));

  for (const { id, active } of states) {
    const button = buttons.find((item) => item.dataset.pageTab === id);
    const page = pages.find((item) => item.dataset.pageView === id);
    button?.classList.toggle('active', active);
    button?.setAttribute('aria-selected', active ? 'true' : 'false');
    page?.classList.toggle('active', active);
    if (page) {
      page.hidden = !active;
    }
  }

  if (states.some((item) => item.id === 'report' && item.active)) {
    requestAnimationFrame(resizeCharts);
  }
}

function initializePageTabs() {
  const buttons = [...document.querySelectorAll('[data-page-tab]')];
  if (!buttons.length) {
    return;
  }

  renderPageTabs(buttons[0].dataset.pageTab);
  for (const button of buttons) {
    button.addEventListener('click', () => renderPageTabs(button.dataset.pageTab));
  }
}

async function loadFAQMarkdown() {
  const target = document.querySelector('[data-faq-markdown]');
  if (!target) {
    return;
  }

  try {
    const response = await fetch(target.dataset.faqMarkdown);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    target.innerHTML = renderMarkdown(await response.text());
  } catch (error) {
    target.textContent = `FAQ 加载失败: ${error.message}`;
  }
}

function renderApp(state, manifestSources, reportsBySource) {
  state.manifestSources = manifestSources;
  renderSummary(state, manifestSources, reportsBySource);
  renderControls(state, reportsBySource);
  renderVisualization(state, reportsBySource);
  renderInsecurityProof(state, reportsBySource);
  renderTrendChart(state, reportsBySource);
  renderLatestChart(state, reportsBySource);
  renderTechnicalGlossary();
  renderTestDetails(state, reportsBySource);
}

async function bootstrap() {
  initializePageTabs();
  initializeVisualizationModal();
  loadFAQMarkdown();
  const status = document.querySelector('#status');
  try {
    const manifest = await fetchJSON('./results/manifest.json');
    const manifestSources = manifest.sources ?? [];
    if (!manifestSources.length) {
      status.textContent = '还没有检测结果。先运行 Go CLI 生成一批 JSON。';
      return;
    }

    const selectedSourceID = manifestSources[0].id;
    const reportsBySource = manifestToReportsBySource(manifestSources);
    const state = {
      manifestSources,
      selectedSourceID,
      period: 'month',
      activeTab: 'overall',
      reportsBySource,
    };
    status.textContent = '';
    renderApp(state, manifestSources, state.reportsBySource);

    document.querySelector('#refresh').addEventListener('click', async () => {
      status.textContent = '刷新中...';
      const freshManifest = await fetchJSON('./results/manifest.json');
      state.manifestSources = freshManifest.sources ?? [];
      if (!state.manifestSources.some((item) => item.id === state.selectedSourceID)) {
        state.selectedSourceID = state.manifestSources[0]?.id ?? null;
      }
      state.reportsBySource = manifestToReportsBySource(state.manifestSources);
      status.textContent = '';
      renderApp(state, state.manifestSources, state.reportsBySource);
    });
  } catch (error) {
    status.textContent = `加载失败: ${error.message}`;
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', bootstrap);
}
