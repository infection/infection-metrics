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

function getCommonOptions(filtered, formatAsTime = false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
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
                        const lines = [
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
    const commonOptions = getCommonOptions(filtered);
    // Filter to only entries with mutation data
    const withMutations = filtered.map((m, i) => ({ m, i })).filter(({ m }) => m.mutations?.total > 0);
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
    const commonOptions = getCommonOptions(filtered);
    // Filter to only entries with mutation data
    const withMutations = filtered.map((m, i) => ({ m, i })).filter(({ m }) => m.mutations?.total > 0);
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
    const commonOptions = getCommonOptions(filtered);
    // Filter to only entries with mutation data
    const withMutations = filtered.map((m, i) => ({ m, i })).filter(({ m }) => m.mutations?.total > 0);
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
