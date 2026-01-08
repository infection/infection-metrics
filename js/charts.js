// Chart configuration and creation

function formatSecondsAsTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const chartColors = {
    wallClock: '#e94560',
    cpuTime: '#0ea5e9',
    memory: '#10b981',
    voluntaryCtx: '#f59e0b',
    involuntaryCtx: '#8b5cf6'
};

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
                    label: formatAsTime ? (context) => {
                        const value = context.parsed.y;
                        return formatSecondsAsTime(value);
                    } : undefined,
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
                    color: 'rgba(255,255,255,0.1)'
                },
                ticks: {
                    color: '#888'
                }
            },
            y: {
                grid: {
                    color: 'rgba(255,255,255,0.1)'
                },
                ticks: {
                    color: '#888'
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
            datasets: [{
                data: chartData,
                borderColor: chartColors.wallClock,
                backgroundColor: chartColors.wallClock,
                errorBarColor: chartColors.wallClock,
                errorBarWhiskerColor: chartColors.wallClock,
                errorBarLineWidth: 2,
                errorBarWhiskerLineWidth: 2,
                showLine: false,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
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
                        color: '#888'
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
            datasets: [{
                data: chartData,
                borderColor: chartColors.wallClock,
                backgroundColor: chartColors.wallClock,
                errorBarColor: chartColors.wallClock,
                errorBarWhiskerColor: chartColors.wallClock,
                errorBarLineWidth: 2,
                errorBarWhiskerLineWidth: 2,
                showLine: false,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
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
                        color: '#888'
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
            datasets: [{
                data: chartData,
                borderColor: chartColors.cpuTime,
                backgroundColor: chartColors.cpuTime,
                errorBarColor: chartColors.cpuTime,
                errorBarWhiskerColor: chartColors.cpuTime,
                errorBarLineWidth: 2,
                errorBarWhiskerLineWidth: 2,
                showLine: false,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
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
                        color: '#888'
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
            datasets: [{
                data: chartData,
                borderColor: '#22c55e',
                backgroundColor: '#22c55e',
                errorBarColor: '#22c55e',
                errorBarWhiskerColor: '#22c55e',
                errorBarLineWidth: 2,
                errorBarWhiskerLineWidth: 2,
                showLine: false,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
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
                        color: '#888'
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
            datasets: [{
                data: chartData,
                borderColor: '#f97316',
                backgroundColor: '#f97316',
                errorBarColor: '#f97316',
                errorBarWhiskerColor: '#f97316',
                errorBarLineWidth: 2,
                errorBarWhiskerLineWidth: 2,
                showLine: false,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
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
                        color: '#888'
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
            datasets: [{
                data: chartData,
                borderColor: '#a855f7',
                backgroundColor: '#a855f7',
                errorBarColor: '#a855f7',
                errorBarWhiskerColor: '#a855f7',
                errorBarLineWidth: 2,
                errorBarWhiskerLineWidth: 2,
                showLine: false,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
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
                        color: '#888'
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
            datasets: [{
                data: chartData,
                borderColor: chartColors.memory,
                backgroundColor: chartColors.memory,
                errorBarColor: chartColors.memory,
                errorBarWhiskerColor: chartColors.memory,
                errorBarLineWidth: 2,
                errorBarWhiskerLineWidth: 2,
                showLine: false,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
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
                        color: '#888'
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
                {
                    label: 'Voluntary',
                    data: voluntaryData,
                    borderColor: chartColors.voluntaryCtx,
                    backgroundColor: chartColors.voluntaryCtx,
                    errorBarColor: chartColors.voluntaryCtx,
                    errorBarWhiskerColor: chartColors.voluntaryCtx,
                    errorBarLineWidth: 2,
                    errorBarWhiskerLineWidth: 2,
                    showLine: false,
                    pointRadius: 5,
                    pointHoverRadius: 7
                },
                {
                    label: 'Involuntary',
                    data: involuntaryData,
                    borderColor: chartColors.involuntaryCtx,
                    backgroundColor: chartColors.involuntaryCtx,
                    errorBarColor: chartColors.involuntaryCtx,
                    errorBarWhiskerColor: chartColors.involuntaryCtx,
                    errorBarLineWidth: 2,
                    errorBarWhiskerLineWidth: 2,
                    showLine: false,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
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
                        color: '#888',
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
                        color: '#888'
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

    return charts;
}
