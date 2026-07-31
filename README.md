# Randomness Reporter

一个独立的 Go CLI + GitHub Pages 静态看板项目。

- CLI 读取 `DiceSource` 配置，按出厂检测模式运行 `github.com/Trisia/randomness`
- 每次运行为每个启用数据源写入一个 JSON 报告
- 同时重写 `docs/results/manifest.json`
- `docs/index.html` 直接读取这些 JSON，用 ECharts 画日 / 周 / 月 / 年对比图

## 目录

- `cmd/randomness-reporter`: CLI 入口
- `internal/source`: `DiceSource`、适配器、源注册表、安全源和演示用不安全源
- `internal/report`: 检测聚合、报告写入、manifest 生成
- `config/sources.json`: 数据源配置
- `docs/`: GitHub Pages 静态站点和结果目录
- `third_party/randomness`: 本地 vendor 的 Trisia/randomness 源码

## 随机源接口

```go
type DiceSource interface {
    Uint64() uint64
}
```

如果你有旧的 `rand.Source` / `rand.Source64`，可以用 `internal/source` 里的适配器接进来。

## 默认行为

- 检测模式：出厂检测
- 样本数量：1000 组
- 每组样本：`10^6 bit`
- 每个启用数据源：每次运行生成 1 个报告文件

输出结构：

```text
docs/
  index.html
  results/
    manifest.json
    sources/
      <source-id>/
        <year>/
          <timestamp>.json
```

## 运行

```bash
go test ./...
go run ./cmd/randomness-reporter -config ./config/sources.json -output ./docs/results
```

## GitHub Pages

把 GitHub Pages 的发布目录指向仓库里的 `docs/`。

页面会读取：

- `./results/manifest.json`
- `./results/sources/<source-id>/<year>/<timestamp>.json`

## GitHub Actions

工作流文件：`.github/workflows/daily-randomness-report.yml`

默认行为：

1. 每日执行一次
2. 跑 `go test ./...`
3. 执行仓库内的 Linux binary `bin/randomness-reporter` 生成最新检测结果
4. 提交 `docs/results` 的变更

## 配置多个数据源

在 `config/sources.json` 里增加条目即可。当前内置类型包括 `pcg`、`gm`、`nist`、`crng`、`hybrid`，以及演示用不安全源 `mt19937`、`lcg`。

```json
{
  "id": "pcg-primary",
  "name": "PCG Primary",
  "type": "pcg",
  "enabled": true,
  "algorithm": "PCG",
  "standard": "math/rand/v2",
  "description": "PCG default source with a fresh random seed on every run"
}
```

演示用不安全源会额外生成：

```text
docs/results/proofs/<source-id>/<year>/<timestamp>.json
```

页面会读取 proof sidecar 并在浏览器里预测下一项输出，用来说明这些算法不是密码学安全随机源。

## 本地预览静态页

静态页依赖同源 `fetch` 读取 JSON，不适合直接双击 `index.html`。

可以在项目根目录启动一个最简单的静态服务器，例如：

```bash
python -m http.server 4174 -d docs
```

然后打开 `http://localhost:4174`。
