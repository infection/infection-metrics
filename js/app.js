// Main application logic

// Global state
let allMetrics = [];
let charts = [];

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatMemory(kb) {
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(0)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
}

function formatRelativeDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
}

function formatDateWithRelative(dateStr) {
    const date = new Date(dateStr);
    const absolute = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const relative = formatRelativeDate(date);
    return `${absolute} (${relative})`;
}

function destroyCharts() {
    charts.forEach(chart => chart.destroy());
    charts = [];
}

function renderApp(metrics, filter = 'production') {
    const filtered = processMetrics(filterMetrics(metrics, filter));

    if (filtered.length === 0) {
        document.getElementById('app').innerHTML = `
            <div class="filter-row">
                <select class="filter-select" id="branch-filter">
                    <option value="production"${filter === 'production' ? ' selected' : ''}>Releases only (tags + main)</option>
                    <option value="all"${filter === 'all' ? ' selected' : ''}>All builds</option>
                </select>
            </div>
            <div class="error">
                <h2>No Data</h2>
                <p>No metrics found for the selected filter.</p>
            </div>
        `;
        document.getElementById('branch-filter').addEventListener('change', (e) => {
            destroyCharts();
            renderApp(allMetrics, e.target.value);
        });
        return;
    }

    const latest = filtered[filtered.length - 1];
    const runCountText = latest._measurement_count > 1
        ? `(based on ${latest._measurement_count} runs)`
        : '';

    const app = document.getElementById('app');

    app.innerHTML = `
        <div class="filter-row">
            <select class="filter-select" id="branch-filter">
                <option value="production"${filter === 'production' ? ' selected' : ''}>Releases only (tags + main)</option>
                <option value="all"${filter === 'all' ? ' selected' : ''}>All builds</option>
            </select>
        </div>

        <div class="stats-row">
            <div class="stat-card">
                <div class="stat-value">${filtered.length}</div>
                <div class="stat-label">Data Points</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${formatDuration(latest.wall_clock_sec)}</div>
                <div class="stat-label">Latest Wall Clock</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${formatMemory(latest.max_rss_kb)}</div>
                <div class="stat-label">Latest Peak Memory</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${latest.cpu_percent}</div>
                <div class="stat-label">CPU Utilization</div>
            </div>
        </div>

        <div class="latest-run">
            <h2>Latest Run <span class="run-count">${runCountText}</span></h2>
            <div class="detail-groups">
                <div class="detail-group">
                    <h3>Git</h3>
                    <dl>
                        <dt>SHA</dt>
                        <dd><a href="https://github.com/infection/infection/commit/${latest.git_sha}">${latest.git_sha.substring(0, 8)}</a></dd>
                        <dt>Ref</dt>
                        <dd>${latest.git_ref}</dd>
                        <dt>Committed</dt>
                        <dd>${formatDateWithRelative(latest.commit_date)}</dd>
                    </dl>
                </div>
                <div class="detail-group">
                    <h3>Environment</h3>
                    <dl>
                        <dt>PHP</dt>
                        <dd>${latest.php_version}</dd>
                        <dt>Ran</dt>
                        <dd>${formatDateWithRelative(latest.timestamp)}</dd>
                    </dl>
                </div>
                <div class="detail-group">
                    <h3>Execution</h3>
                    <dl>
                        <dt>Trigger</dt>
                        <dd>${latest.trigger}</dd>
                        <dt>Config</dt>
                        <dd>${latest.config.args}</dd>
                    </dl>
                </div>
                <div class="detail-group">
                    <h3>Runner</h3>
                    <dl>
                        <dt>Cores</dt>
                        <dd>${latest.runner.cpu_cores}</dd>
                        <dt>Memory</dt>
                        <dd>${formatMemory(latest.runner.total_memory_kb)}</dd>
                        <dt>Arch</dt>
                        <dd>${latest.runner.cpu_arch}</dd>
                    </dl>
                </div>
            </div>
        </div>

        <section class="chart-section">
            <h2 class="chart-section-header">Normalized Metrics</h2>
            <p class="chart-section-description">These metrics normalize performance by mutation count and hardware, enabling fair comparison across versions and runners.</p>
            <div class="charts-grid">
                <div class="chart-card wide">
                    <h3>Wall Clock Per Mutation</h3>
                    <p class="chart-subtitle">Average time to generate, test, and record each mutation (lower is better)</p>
                    <div class="chart-container">
                        <canvas id="chart-wall-per-mutation"></canvas>
                    </div>
                </div>
                <div class="chart-card wide">
                    <h3>Mutation Count</h3>
                    <p class="chart-subtitle">Total mutations generated: the denominator behind per-mutation metrics (informational)</p>
                    <div class="chart-container">
                        <canvas id="chart-mutation-count"></canvas>
                    </div>
                </div>
                <div class="chart-card wide">
                    <h3>Context Switches Per Mutation</h3>
                    <p class="chart-subtitle">Scheduler overhead per mutation: Voluntary = I/O waits, Involuntary = CPU preemption (lower is better)</p>
                    <div class="chart-container">
                        <canvas id="chart-ctx-per-mutation"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <h3>Wall Clock Per Core</h3>
                    <p class="chart-subtitle">Elapsed time normalized by core count for hardware comparison (lower is better)</p>
                    <div class="chart-container">
                        <canvas id="chart-wall-per-core"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <h3>CPU Efficiency</h3>
                    <p class="chart-subtitle">Parallelization effectiveness: (user+sys)/(wall*cores) (higher is better)</p>
                    <div class="chart-container">
                        <canvas id="chart-cpu-efficiency"></canvas>
                    </div>
                </div>
            </div>
        </section>

        <section class="chart-section">
            <h2 class="chart-section-header">Timing Metrics</h2>
            <div class="charts-grid">
                <div class="chart-card">
                    <h3>CPU Time (User + System)</h3>
                    <p class="chart-subtitle">Total processing time across all cores (lower is better)</p>
                    <div class="chart-container">
                        <canvas id="chart-cpu-time"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <h3>User Time</h3>
                    <p class="chart-subtitle">CPU time in userspace: Infection, tests, and libraries (lower is better)</p>
                    <div class="chart-container">
                        <canvas id="chart-user-time"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <h3>System Time</h3>
                    <p class="chart-subtitle">Time spent in kernel I/O and process management (lower is better)</p>
                    <div class="chart-container">
                        <canvas id="chart-system-time"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <h3>Wall Clock Time</h3>
                    <p class="chart-subtitle">Total elapsed time from start to finish (lower is better)</p>
                    <div class="chart-container">
                        <canvas id="chart-wall-clock"></canvas>
                    </div>
                </div>
            </div>
        </section>

        <section class="chart-section">
            <h2 class="chart-section-header">Resource Metrics</h2>
            <div class="charts-grid">
                <div class="chart-card">
                    <h3>Peak Memory (RSS)</h3>
                    <p class="chart-subtitle">Maximum memory usage during run (lower is better)</p>
                    <div class="chart-container">
                        <canvas id="chart-memory"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <h3>Context Switches</h3>
                    <p class="chart-subtitle">Voluntary = I/O waits, Involuntary = CPU preemption (lower is better)</p>
                    <div class="chart-container">
                        <canvas id="chart-context-switches"></canvas>
                    </div>
                </div>
            </div>
        </section>
    `;

    // Add filter change listener
    document.getElementById('branch-filter').addEventListener('change', (e) => {
        destroyCharts();
        renderApp(allMetrics, e.target.value);
    });

    // Create all charts
    charts = createAllCharts(filtered);
}

function renderError(message) {
    document.getElementById('app').innerHTML = `
        <div class="error">
            <h2>Error</h2>
            <p>${message}</p>
        </div>
    `;
}

// Initialize
loadMetrics()
    .then(metrics => {
        allMetrics = metrics;
        renderApp(metrics, 'production');
    })
    .catch(err => renderError(err.message));
