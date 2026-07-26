// Chart configuration and creation

function formatSecondsAsTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const chartColors = {
    primary: '#16a34a',
    secondary: '#2563eb'
};

function errorBarDataset(data, color = chartColors.primary) {
    return {
        data,
        borderColor: color,
        backgroundColor: color,
        errorBarColor: color,
        errorBarWhiskerColor: color,
        errorBarLineWidth: 2,
        errorBarWhiskerLineWidth: 2,
        showLine: false,
        pointRadius: 5,
        pointHoverRadius: 7
    };
}

function releaseAnnotations(filtered) {
    const CLUSTER_MS = 45 * 24 * 3600 * 1000;
    const releases = filtered
        .filter(m => !m.git_ref.startsWith('refs/'))
        .map(m => ({ ref: m.git_ref, date: new Date(m.commit_date || m.timestamp).valueOf() }));

    // Releases in close succession share one label to keep pills readable
    const clusters = [];
    for (const release of releases) {
        const current = clusters[clusters.length - 1];
        if (current && release.date - current[current.length - 1].date < CLUSTER_MS) {
            current.push(release);
        } else {
            clusters.push([release]);
        }
    }

    const annotations = {};
    for (const cluster of clusters) {
        for (const { ref, date } of cluster) {
            annotations[ref] = {
                type: 'line',
                xMin: date,
                xMax: date,
                borderColor: '#d1d5db',
                borderWidth: 1,
                borderDash: [4, 4],
                label: {
                    display: false,
                    content: cluster.length > 1
                        ? [cluster[0].ref, `… ${cluster[cluster.length - 1].ref}`]
                        : ref,
                    position: 'end',
                    yAdjust: -22,
                    font: { size: 10 },
                    color: '#fff',
                    backgroundColor: 'rgba(17, 24, 39, 0.85)',
                    borderRadius: 4,
                    padding: { x: 6, y: 3 }
                },
                enter({ element }) {
                    element.options.z = 1;
                    element.label.options.display = true;
                    return true;
                },
                leave({ element }) {
                    element.options.z = 0;
                    element.label.options.display = false;
                    return true;
                }
            };
        }
    }
    return annotations;
}

function getCommonOptions(filtered, formatAsTime = false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: {
            padding: { top: 40 }
        },
        plugins: {
            legend: {
                display: false
            },
            annotation: {
                clip: false,
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                annotations: releaseAnnotations(filtered)
            },
            tooltip: {
                callbacks: {
                    title: (items) => {
                        const idx = items[0].dataIndex;
                        const m = filtered[idx];
                        return m.git_ref;
                    },
                    label: (context) => {
                        const { y, yMin, yMax } = context.parsed;
                        const format = formatAsTime
                            ? formatSecondsAsTime
                            : (v) => v.toLocaleString(undefined, { maximumFractionDigits: 1 });
                        const prefix = context.dataset.label ? `${context.dataset.label}: ` : '';
                        const spread = (yMax - yMin) / 2;
                        return spread > 0
                            ? `${prefix}${format(y)} ±${format(spread)}`
                            : `${prefix}${format(y)}`;
                    },
                    afterBody: (items) => {
                        const idx = items[0].dataIndex;
                        const m = filtered[idx];
                        const date = new Date(m.commit_date || m.timestamp);
                        const lines = [
                            `Committed: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
                            `SHA: ${m.git_sha.substring(0, 8)}`,
                        ];
                        if (m._measurement_count > 1) {
                            lines.push(`Based on ${m._measurement_count} runs`);
                        }
                        return lines;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'day',
                    displayFormats: {
                        day: 'MMM d'
                    }
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.06)'
                },
                ticks: {
                    color: '#6b7280'
                }
            },
            y: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.06)'
                },
                ticks: {
                    color: '#6b7280'
                }
            }
        }
    };
}

function createWallClockChart(ctx, filtered, commitDates) {
    const commonOptions = getCommonOptions(filtered, true);
    // Include x value with each data point for time scale + error bars
    const chartData = filtered.map((m, i) => ({
        x: commitDates[i],
        y: m.wall_clock_sec,
        yMin: m.wall_clock_sec - m.wall_clock_stddev,
        yMax: m.wall_clock_sec + m.wall_clock_stddev
    }));
    return new Chart(ctx, {
        type: 'lineWithErrorBars',
        data: {
            datasets: [errorBarDataset(chartData)]
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    ticks: {
                        ...commonOptions.scales.y.ticks,
                        callback: (value) => formatSecondsAsTime(value)
                    },
                    title: {
                        display: true,
                        text: 'MM:SS',
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

function createWallPerCoreChart(ctx, filtered, commitDates) {
    const commonOptions = getCommonOptions(filtered, true);
    const chartData = filtered.map((m, i) => ({
        x: commitDates[i],
        y: m.derived.wall_clock_per_core,
        yMin: m.derived.wall_clock_per_core - m.derived.wall_clock_per_core_stddev,
        yMax: m.derived.wall_clock_per_core + m.derived.wall_clock_per_core_stddev
    }));
    return new Chart(ctx, {
        type: 'lineWithErrorBars',
        data: {
            datasets: [errorBarDataset(chartData)]
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    ticks: {
                        ...commonOptions.scales.y.ticks,
                        callback: (value) => formatSecondsAsTime(value)
                    },
                    title: {
                        display: true,
                        text: 'MM:SS / Core',
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

function createCpuTimeChart(ctx, filtered, commitDates) {
    const commonOptions = getCommonOptions(filtered, true);
    const chartData = filtered.map((m, i) => ({
        x: commitDates[i],
        y: m.derived.cpu_time_total,
        yMin: m.derived.cpu_time_total - m.derived.cpu_time_stddev,
        yMax: m.derived.cpu_time_total + m.derived.cpu_time_stddev
    }));
    return new Chart(ctx, {
        type: 'lineWithErrorBars',
        data: {
            datasets: [errorBarDataset(chartData)]
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    ticks: {
                        ...commonOptions.scales.y.ticks,
                        callback: (value) => formatSecondsAsTime(value)
                    },
                    title: {
                        display: true,
                        text: 'MM:SS',
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

function createUserTimeChart(ctx, filtered, commitDates) {
    const commonOptions = getCommonOptions(filtered, true);
    const chartData = filtered.map((m, i) => ({
        x: commitDates[i],
        y: m.user_time_sec,
        yMin: m.user_time_sec - m.user_time_stddev,
        yMax: m.user_time_sec + m.user_time_stddev
    }));
    return new Chart(ctx, {
        type: 'lineWithErrorBars',
        data: {
            datasets: [errorBarDataset(chartData)]
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    ticks: {
                        ...commonOptions.scales.y.ticks,
                        callback: (value) => formatSecondsAsTime(value)
                    },
                    title: {
                        display: true,
                        text: 'MM:SS',
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

function createSystemTimeChart(ctx, filtered, commitDates) {
    const commonOptions = getCommonOptions(filtered, true);
    const chartData = filtered.map((m, i) => ({
        x: commitDates[i],
        y: m.system_time_sec,
        yMin: m.system_time_sec - m.system_time_stddev,
        yMax: m.system_time_sec + m.system_time_stddev
    }));
    return new Chart(ctx, {
        type: 'lineWithErrorBars',
        data: {
            datasets: [errorBarDataset(chartData)]
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    ticks: {
                        ...commonOptions.scales.y.ticks,
                        callback: (value) => formatSecondsAsTime(value)
                    },
                    title: {
                        display: true,
                        text: 'MM:SS',
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

function createCpuEfficiencyChart(ctx, filtered, commitDates) {
    const commonOptions = getCommonOptions(filtered);
    const chartData = filtered.map((m, i) => ({
        x: commitDates[i],
        y: m.derived.cpu_efficiency,
        yMin: m.derived.cpu_efficiency - m.derived.cpu_efficiency_stddev,
        yMax: m.derived.cpu_efficiency + m.derived.cpu_efficiency_stddev
    }));
    return new Chart(ctx, {
        type: 'lineWithErrorBars',
        data: {
            datasets: [errorBarDataset(chartData)]
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: '%',
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

function createMemoryChart(ctx, filtered, commitDates) {
    const commonOptions = getCommonOptions(filtered);
    const chartData = filtered.map((m, i) => ({
        x: commitDates[i],
        y: m.max_rss_kb / 1024,
        yMin: (m.max_rss_kb - m.max_rss_stddev) / 1024,
        yMax: (m.max_rss_kb + m.max_rss_stddev) / 1024
    }));
    return new Chart(ctx, {
        type: 'lineWithErrorBars',
        data: {
            datasets: [errorBarDataset(chartData)]
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: 'MB',
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

function createWallPerMutationChart(ctx, filtered, commitDates) {
    // Filter to only entries with mutation data; tooltips must index into the same subset
    const withMutations = filtered.map((m, i) => ({ m, i })).filter(({ m }) => m.mutations?.total > 0);
    const commonOptions = getCommonOptions(withMutations.map(({ m }) => m));
    const chartData = withMutations.map(({ m, i }) => ({
        x: commitDates[i],
        y: m.derived.wall_clock_per_mutation * 1000, // Convert to milliseconds
        yMin: (m.derived.wall_clock_per_mutation - m.derived.wall_clock_per_mutation_stddev) * 1000,
        yMax: (m.derived.wall_clock_per_mutation + m.derived.wall_clock_per_mutation_stddev) * 1000
    }));
    return new Chart(ctx, {
        type: 'lineWithErrorBars',
        data: {
            datasets: [errorBarDataset(chartData)]
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: 'ms / mutation',
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

function createMutationCountChart(ctx, filtered, commitDates) {
    // Filter to only entries with mutation data; tooltips must index into the same subset
    const withMutations = filtered.map((m, i) => ({ m, i })).filter(({ m }) => m.mutations?.total > 0);
    const commonOptions = getCommonOptions(withMutations.map(({ m }) => m));
    const chartData = withMutations.map(({ m, i }) => ({
        x: commitDates[i],
        y: m.mutations.total,
        yMin: m.mutations.total - m.mutations.total_stddev,
        yMax: m.mutations.total + m.mutations.total_stddev
    }));
    return new Chart(ctx, {
        type: 'lineWithErrorBars',
        data: {
            datasets: [errorBarDataset(chartData)]
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Count',
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

function createContextSwitchesChart(ctx, filtered, commitDates) {
    const commonOptions = getCommonOptions(filtered);
    const voluntaryData = filtered.map((m, i) => ({
        x: commitDates[i],
        y: m.voluntary_ctx_switches / 1000,
        yMin: (m.voluntary_ctx_switches - m.voluntary_ctx_stddev) / 1000,
        yMax: (m.voluntary_ctx_switches + m.voluntary_ctx_stddev) / 1000
    }));
    const involuntaryData = filtered.map((m, i) => ({
        x: commitDates[i],
        y: m.involuntary_ctx_switches / 1000,
        yMin: (m.involuntary_ctx_switches - m.involuntary_ctx_stddev) / 1000,
        yMax: (m.involuntary_ctx_switches + m.involuntary_ctx_stddev) / 1000
    }));
    return new Chart(ctx, {
        type: 'lineWithErrorBars',
        data: {
            datasets: [
                { label: 'Voluntary', ...errorBarDataset(voluntaryData) },
                { label: 'Involuntary', ...errorBarDataset(involuntaryData, chartColors.secondary) }
            ]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#6b7280',
                        usePointStyle: true
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Thousands',
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

function createCtxPerMutationChart(ctx, filtered, commitDates) {
    // Filter to only entries with mutation data; tooltips must index into the same subset
    const withMutations = filtered.map((m, i) => ({ m, i })).filter(({ m }) => m.mutations?.total > 0);
    const commonOptions = getCommonOptions(withMutations.map(({ m }) => m));
    const voluntaryData = withMutations.map(({ m, i }) => ({
        x: commitDates[i],
        y: m.derived.voluntary_ctx_per_mutation,
        yMin: m.derived.voluntary_ctx_per_mutation - m.derived.voluntary_ctx_per_mutation_stddev,
        yMax: m.derived.voluntary_ctx_per_mutation + m.derived.voluntary_ctx_per_mutation_stddev
    }));
    const involuntaryData = withMutations.map(({ m, i }) => ({
        x: commitDates[i],
        y: m.derived.involuntary_ctx_per_mutation,
        yMin: m.derived.involuntary_ctx_per_mutation - m.derived.involuntary_ctx_per_mutation_stddev,
        yMax: m.derived.involuntary_ctx_per_mutation + m.derived.involuntary_ctx_per_mutation_stddev
    }));
    return new Chart(ctx, {
        type: 'lineWithErrorBars',
        data: {
            datasets: [
                { label: 'Voluntary', ...errorBarDataset(voluntaryData) },
                { label: 'Involuntary', ...errorBarDataset(involuntaryData, chartColors.secondary) }
            ]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#6b7280',
                        usePointStyle: true
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Switches / Mutation',
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

function createAllCharts(filtered) {
    const commitDates = filtered.map(m => new Date(m.commit_date || m.timestamp));
    const charts = [];

    charts.push(createCpuTimeChart(
        document.getElementById('chart-cpu-time'),
        filtered,
        commitDates
    ));

    charts.push(createUserTimeChart(
        document.getElementById('chart-user-time'),
        filtered,
        commitDates
    ));

    charts.push(createSystemTimeChart(
        document.getElementById('chart-system-time'),
        filtered,
        commitDates
    ));

    charts.push(createWallClockChart(
        document.getElementById('chart-wall-clock'),
        filtered,
        commitDates
    ));

    charts.push(createCpuEfficiencyChart(
        document.getElementById('chart-cpu-efficiency'),
        filtered,
        commitDates
    ));

    charts.push(createWallPerCoreChart(
        document.getElementById('chart-wall-per-core'),
        filtered,
        commitDates
    ));

    charts.push(createMemoryChart(
        document.getElementById('chart-memory'),
        filtered,
        commitDates
    ));

    charts.push(createContextSwitchesChart(
        document.getElementById('chart-context-switches'),
        filtered,
        commitDates
    ));

    // Normalized metrics (only if mutation data exists)
    const wallPerMutationCtx = document.getElementById('chart-wall-per-mutation');
    if (wallPerMutationCtx) {
        charts.push(createWallPerMutationChart(wallPerMutationCtx, filtered, commitDates));
    }

    const ctxPerMutationCtx = document.getElementById('chart-ctx-per-mutation');
    if (ctxPerMutationCtx) {
        charts.push(createCtxPerMutationChart(ctxPerMutationCtx, filtered, commitDates));
    }

    const mutationCountCtx = document.getElementById('chart-mutation-count');
    if (mutationCountCtx) {
        charts.push(createMutationCountChart(mutationCountCtx, filtered, commitDates));
    }

    return charts;
}
