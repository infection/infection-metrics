# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

infection-metrics is a visualization dashboard for long-term performance metrics of the Infection PHP mutation testing framework. It displays timing, resource usage, and efficiency data collected from automated CI runs.

## Architecture

### File Structure

```
infection-metrics/
  index.html           # Main HTML structure
  css/
    styles.css         # All styles (light theme, matching infection-php.dev)
  js/
    metrics.js         # Data loading, processing, aggregation
    charts.js          # Chart.js configurations and creation
    app.js             # Main app logic, UI rendering
  metrics.jsonl        # Performance data (one JSON object per line)
```

### Data Flow

1. `metrics.jsonl` contains raw performance measurements (one per line)
2. `loadMetrics()` fetches and parses the JSONL file
3. `processMetrics()` groups by git_sha, calculates mean/stddev for repeated runs
4. `filterMetrics()` applies branch filters
5. `createAllCharts()` renders Chart.js visualizations

### Key Technologies

- **Chart.js 4.x** - Core charting library
- **chartjs-chart-error-bars** - Error bar support for showing stddev
- **chartjs-adapter-date-fns** - Time scale support
- Static site - no build step, pure client-side JavaScript

## Data Schema (metrics.jsonl)

Each line is a JSON object with:

```json
{
  "user_time_sec": 926.54,
  "system_time_sec": 434.79,
  "wall_clock_sec": 472.98,
  "max_rss_kb": 307376,
  "cpu_percent": "287%",
  "voluntary_ctx_switches": 1652531,
  "involuntary_ctx_switches": 201181,
  "exit_status": 0,
  "timestamp": "2026-01-07T14:14:44Z",
  "commit_date": "2024-12-17T20:11:10+01:00",
  "git_sha": "cac7d20...",
  "git_ref": "0.29.10",
  "trigger": "workflow_dispatch",
  "php_version": "8.2.29",
  "config": { "name": "baseline", "args": "--no-progress --threads=max" },
  "runner": { "os": "ubuntu-latest", "cpu_cores": 4, "cpu_arch": "x86_64", "total_memory_kb": 16379472 },
  "derived": { "wall_clock_per_core": 118.24, "cpu_time_total": 1361.33 }
}
```

## Charts Displayed

### Timing Metrics
- **CPU Time (User + System)** - Primary performance metric, hardware-independent
- **User Time** - Time in userspace (actual Infection code)
- **System Time** - Time in kernel (I/O, process management)
- **Wall Clock Time** - Total elapsed time
- **CPU Efficiency** - `(user+system)/(wall*cores)*100` - parallelization effectiveness
- **Wall Clock Per Core** - Normalized for hardware comparison

### Resource Metrics
- **Peak Memory (RSS)** - Maximum memory usage
- **Context Switches** - Voluntary (I/O waits) vs Involuntary (preemption)

## Development

### Local Testing

```bash
cd /home/lesha/workspace/Infection/infection-metrics
python -m http.server 8000
# Open http://localhost:8000
```

### Adding New Charts

1. Add stddev calculation in `processMetrics()` (metrics.js)
2. Create chart function in charts.js following existing pattern
3. Add canvas element in app.js template
4. Call chart function in `createAllCharts()`

### Chart Configuration Pattern

All charts use `lineWithErrorBars` type with `showLine: false` for scatter-plot style with error bars:

```javascript
{
    type: 'lineWithErrorBars',
    data: {
        datasets: [{
            data: filtered.map((m, i) => ({
                x: commitDates[i],
                y: m.value,
                yMin: m.value - m.stddev,
                yMax: m.value + m.stddev
            })),
            showLine: false,
            pointRadius: 5
        }]
    }
}
```

## Data Collection

Metrics are collected by the `perf-metrics.yaml` GitHub Actions workflow in the main Infection repository. It:
1. Runs PHPUnit with coverage
2. Runs Infection with `--skip-initial-tests`
3. Uses GNU `time` to capture system metrics
4. Appends results to this repository's `metrics.jsonl`

## Notes

- Multiple runs per commit are aggregated (mean + stddev)
- Error bars show standard deviation when multiple measurements exist
- Tooltips show git ref, SHA, and measurement count
- Data sorted by commit_date (when code was written), not run timestamp
