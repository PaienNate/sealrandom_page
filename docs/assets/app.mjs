const PERIODS = new Set(['day', 'week', 'month', 'year']);

const DEFAULT_TEST_METADATA = {
  category: 'GM/T 0005-2021 第5章',
  summary: '本项随机性检测方法按GM/T 0005-2021第5章规定执行。',
  significance: '结果判定：将计算得出的P_value结果与显著性水平α进行比较。',
};

const SAMPLE_SET_JUDGMENT_NOTE = '本看板按 GM/T 0005-2021 第6.1条使用样本数量 s=1000；按第6.2条使用 α=0.01 统计样本通过率，并按第6.3条使用 αT=0.0001 判断 Q_value 在10个区间上的分布均匀性。';

const TEST_METADATA = {
  '单比特频数检测': {
    category: '5.1 单比特频数检测方法',
    summary: '单比特频数检测是最基本的检测，用来检测一个二元序列中0和1的个数是否相近。随机序列应具有较好的0、1平衡性。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过单比特频数检测，否则未通过单比特频数检测。',
  },
  '块内频数检测': {
    category: '5.2 块内频数检测方法',
    summary: '块内频数检测用来检测待检序列的m位子序列中1的个数是否接近m/2。对随机序列来说，其任意长度的m位子序列中1的个数都应该接近m/2。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过块内频数检测，否则未通过块内频数检测。',
  },
  Poker: {
    category: '5.3 扑克检测方法',
    summary: '扑克检测用来检测长度为m的2^m类子序列的个数是否接近。对于随机的序列，2^m类子序列的个数应该接近。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过扑克检测，否则未通过扑克检测。',
  },
  '扑克检测': {
    category: '5.3 扑克检测方法',
    summary: '扑克检测用来检测长度为m的2^m类子序列的个数是否接近。对于随机的序列，2^m类子序列的个数应该接近。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过扑克检测，否则未通过扑克检测。',
  },
  '重叠子序列检测方法': {
    category: '5.4 重叠子序列检测方法',
    summary: '对任意的正整数m，长度为m的二元序列有2^m类。重叠子序列检测将长度为n的待检序列划分成n个可叠加的m位子序列。对随机二元序列来说，由于其具有均匀性，故m位可叠加子序列的每一类模式出现的概率应该接近。',
    significance: '结果判定：两个结果P_value1和P_value2分别与α进行比较，并分别判定对应重叠子序列检测项目是否通过。',
  },
  '游程总数检测': {
    category: '5.5 游程总数检测方法',
    summary: '游程是指序列中由连续的“0”或者“1”组成的子序列，并且该子序列的前导与后继元素都与其本身的元素不同。游程总数检测主要检测待检序列中游程的总数是否服从随机性要求。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过游程总数检测，否则未通过游程总数检测。',
  },
  '游程分布检测': {
    category: '5.6 游程分布检测方法',
    summary: '游程分布检测用于检测序列中相同长度游程分布是否均匀，随机的序列中，相同长度的游程数目应该接近一致，且游程长度每增加一比特，游程数目应接近减半。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过游程分布检测，否则未通过游程分布检测。',
  },
  '块内最大游程检测': {
    category: '5.7 块内最大游程检测方法',
    summary: '块内最大游程检测方法分别对块内最大“1”游程和块内最大“0”游程两种模式进行检测。将待检序列划分成N个长度为m的子序列，此时n=N*m，统计各个子序列中的最长“1”游程长度和最长“0”游程长度，根据各个子序列中最大“1”游程、最大“0”游程的分布来评价待检序列的随机性。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过块内最大游程检测，否则未通过块内最大游程检测。',
  },
  '二元推导检测(k=7)': {
    category: '5.8 二元推导检测方法',
    summary: '二元推导检测的目的是判定第k次二元推导序列中0和1的个数是否接近一致。对于长度为n的二元初始序列，依次将初始序列中两个相邻比特做异或操作，即可得到该序列的一次二元推导序列，长度为n-1。依次执行上述操作k次，即可得到该初始序列的k次二元推导序列，长度为n-k。对于一个随机的序列，无论进行多少次推导，其0、1的个数都应该接近一致。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过二元推导检测，否则未通过二元推导检测。',
  },
  '自相关检测(d=16)': {
    category: '5.9 自相关检测方法',
    summary: '自相关检测用来检测待检序列与将其左移（逻辑左移）d位后所得新序列的关联程度。一个随机序列应该和将其左移任意位所得的新序列都是独立的，故其关联程度也应该很低，即初始序列与将其左移d位后所得新序列进行异或操作形成的新序列中，0、1的个数应该接近一致。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过自相关检测，否则未通过自相关检测。',
  },
  '矩阵秩检测': {
    category: '5.10 矩阵秩检测方法',
    summary: '矩阵秩检测用来检测待检序列中给定长度的子序列之间的线性独立性。由待检序列构造矩阵，然后检测矩阵的行或列之间的线性独立性，矩阵秩的偏移程度可以给出关于线性独立性的量的认识，从而影响对二元序列随机性好坏的评价。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过矩阵秩检测，否则未通过矩阵秩检测。',
  },
  '累加和检测': {
    category: '5.11 累加和检测方法',
    summary: '累加和检测方法分别对前向累加和、后向累加和两种模式进行检测。前向累加和检测从待检序列第1比特开始，逐比特向后计算，后向累加和检测从待检序列最后1比特开始，逐比特向前计算，通过判断待检序列的各个子序列中最大的偏移（与0之间），也就是最大累加和与一个随机序列应具有的最大偏移相比较，以判断待检序列的随机性。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过累加和检测，否则未通过累加和检测。',
  },
  '近似熵检测(m=5)': {
    category: '5.12 近似熵检测方法',
    summary: '近似熵检测通过比较m位可重叠子序列模式的频数和m+1位可重叠子序列模式的频数来评价其随机性。计算m位可重叠子序列模式和m+1位可重叠子序列模式之间的频数差异，差异值较小则表明待检序列具有规则性和连续性；差异值较大则表明待检序列具有不规则性和不连续性。对任意一个m来说，随机序列的近似熵应该近似等于ln2。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过近似熵检测，否则未通过近似熵检测。',
  },
  '线型复杂度检测(m=500)': {
    category: '5.13 线性复杂度检测方法',
    summary: '线性复杂度检测用于检测各等长子序列的线性复杂度分布是否符合随机性的要求。将待检序列划分成N个长度为m的子序列，此时n=N*m，然后利用Berlekamp-Massey算法计算每个子序列的线性复杂度Li，根据Li的分布情况判断待检二元序列的随机性。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过线性复杂度检测，否则未通过线性复杂度检测。',
  },
  'Maurer通用统计检测方法': {
    category: '5.14 Maurer通用统计检测方法',
    summary: 'Maurer通用统计检测用于检测待检序列能否被无损压缩。因为随机序列是不能被显著压缩，因此如果待检序列能被显著地压缩，则认为该序列不随机。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过Maurer通用统计检测，否则未通过Maurer通用统计检测。',
  },
  '离散傅里叶检测': {
    category: '5.15 离散傅立叶检测方法',
    summary: '离散傅立叶检测使用频谱的方法来检测序列的随机性。对待检序列进行傅立叶变换后可以得到尖峰高度，根据随机性的假设，这个尖峰高度不能超过某个门限值（与序列长度n有关），否则将其归入不正常的范围；如果不正常的尖峰个数超过了允许值，即可认为待检序列是不随机的。',
    significance: '结果判定：如果P_value>=α，则认为待检序列通过离散傅立叶检测，否则未通过离散傅立叶检测。',
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
      help: '这一批样本中有多少个单样本满足 P_value>=α。只说明单样本过线数量，不代表分布均匀性也过线。',
    },
    {
      label: '门槛要求',
      help: '按第6.2条公式算出的最低通过数量；样本通过数达到或超过这个门槛，才算样本通过率合格。',
    },
    {
      label: '样本通过率',
      help: '样本通过数除以样本总数，越接近 100% 越好，但仍需同时看均匀性 PT。',
    },
    {
      label: '均匀性 PT',
      help: '第6.3条对 Q_value 分布做均匀性检验；PT>=αT 才通过，极小值说明 Q_value 扎堆。',
    },
    {
      label: '平均 P/Q',
      help: '本批样本 P_value 与 Q_value 的长期平均。接近某个极端值时，要结合 PT 看是否分布扎堆。',
    },
    {
      label: '最新 P/Q',
      help: '最近一个样本的 P_value 与 Q_value，只代表单个样本状态，不应替代整批判断。',
    },
    {
      label: '平均 P2/Q2',
      help: '有第二统计量的项目才显示，读法同平均 P/Q，用来观察另一侧或补充口径。',
    },
    {
      label: '最新 P2/Q2',
      help: '有第二统计量的项目才显示，表示最近一个样本的补充统计口径。',
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
      significance: `${metadata.significance} ${SAMPLE_SET_JUDGMENT_NOTE}`,
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
  const el = document.querySelector('#latest-chart');
  const chart = echarts.getInstanceByDom(el) ?? echarts.init(el);

  if (!report) {
    chart.clear();
    return;
  }

  const barData = buildLatestTestBarData(report);
  chart.setOption({
    backgroundColor: '#ffffff',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = params[0];
        const metric = report.tests[item.dataIndex];
        const lines = [
          `${escapeHTML(item.name)}`,
          `通过率: ${formatPercent(item.value)}`,
          `均匀性PT: ${formatNumber(metric?.uniformity_p_value)}`,
          `最新P/Q: ${formatNumber(metric?.latest_p)} / ${formatNumber(metric?.latest_q)}`,
        ];
        if (metric?.latest_p2 != null || metric?.latest_q2 != null) {
          lines.push(`最新P2/Q2: ${formatNumber(metric?.latest_p2)} / ${formatNumber(metric?.latest_q2)}`);
        }
        lines.push(barData.passFlags[item.dataIndex] ? '结论: 通过' : '结论: 未通过');
        return lines.join('<br>');
      },
    },
    grid: { left: 198, right: 48, top: 58, bottom: 40, containLabel: false },
    xAxis: {
      type: 'value',
      min: 0,
      max: 1,
      axisLabel: { color: '#111827', formatter: (value) => formatPercent(value) },
      splitLine: { lineStyle: { color: '#d1d5db', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: barData.labels,
      axisLabel: { color: '#111827', width: 180, overflow: 'truncate' },
      axisLine: { lineStyle: { color: '#111827' } },
    },
    series: [{
      type: 'bar',
      data: barData.values.map((value, index) => ({
        value,
        itemStyle: { color: barData.passFlags[index] ? '#065f46' : '#991b1b' },
      })),
      barMaxWidth: 20,
    }],
    title: {
      text: `${report.source.name} 最新单项结果`,
      left: 'center',
      top: 8,
      textStyle: { color: '#111827', fontSize: 14, fontWeight: 700 },
    },
  });
}

export function buildTechnicalGlossaryItems() {
  return [
    {
      title: 'P-value (P)',
      body: '第5章单个样本检测得到的显著性概率，用于样本通过率判定。若该样本的P_value>=α，且α=0.01，则该样本在该检测项目上通过。',
    },
    {
      title: 'Q-value (Q)',
      body: '第5章为每个样本计算的分布均匀性输入值。样本集内的Q_value应该在[0,1]上近似均匀；Q值长期扎堆在高位或低位都不是好现象。',
    },
    {
      title: '均匀性 PT',
      body: '第6.3条对一组Q_value做10个子区间的χ²分布均匀性检验得到PT。若PT>=αT，且αT=0.0001，则样本集通过分布均匀性判定；PT很小表示Q值分布扎堆。',
    },
    {
      title: '样本通过率',
      body: '第6.2条统计 P_value>=α 的样本数量。当前每日批次使用样本数量 s=1000，门槛按 GM/T 0005-2021 第6.2条公式计算。',
    },
    {
      title: '最终项目结论',
      body: '同一检测项目必须同时满足样本通过率判定和Q_value分布均匀性判定。1000/1000只说明单样本P_value全部过线；如果PT<αT，仍然应标记为分布未通过。',
    },
    {
      title: 'P2 / Q2',
      body: '少数检测会给出第二组统计口径，用于描述另一侧结构或补充统计量。判定时应分别看对应的P_value和Q_value。',
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
  for (const selector of ['#trend-chart', '#latest-chart']) {
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
