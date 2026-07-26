// Data loading and processing functions

async function loadMetrics() {
    try {
        const response = await fetch('metrics.jsonl');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        const lines = text.trim().split('\n').filter(l => l);
        const metrics = lines.map(line => JSON.parse(line));

        if (metrics.length === 0) {
            throw new Error('No metrics data found');
        }

        return metrics;
    } catch (err) {
        throw new Error(`Failed to load metrics: ${err.message}`);
    }
}

function filterMetrics(metrics, filter) {
    if (filter === 'all') {
        return metrics;
    }
    // Production: tags (no refs/ prefix) + main/master branches
    return metrics.filter(m =>
        !m.git_ref.startsWith('refs/heads/') ||
        m.git_ref === 'refs/heads/main' ||
        m.git_ref === 'refs/heads/master'
    );
}

function stddev(values, mean) {
    if (values.length < 2) return 0;
    const sqDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

function processMetrics(metrics) {
    // Group by git_sha and calculate statistics
    const byCommit = new Map();
    for (const m of metrics) {
        const sha = m.git_sha;
        if (!byCommit.has(sha)) {
            byCommit.set(sha, []);
        }
        byCommit.get(sha).push(m);
    }

    // Calculate mean and stddev for each commit
    const processed = [];
    for (const [sha, measurements] of byCommit) {
        const first = measurements[0];
        const count = measurements.length;

        const wallClockValues = measurements.map(m => m.wall_clock_sec);
        const memoryValues = measurements.map(m => m.max_rss_kb);
        const wallPerCoreValues = measurements.map(m => m.derived.wall_clock_per_core);
        const cpuTotalValues = measurements.map(m => m.derived.cpu_time_total);
        const voluntaryCtxValues = measurements.map(m => m.voluntary_ctx_switches);
        const involuntaryCtxValues = measurements.map(m => m.involuntary_ctx_switches);
        const userTimeValues = measurements.map(m => m.user_time_sec);
        const systemTimeValues = measurements.map(m => m.system_time_sec);
        // CPU efficiency = (user + system) / (wall_clock * cores) as percentage
        const cpuEfficiencyValues = measurements.map(m =>
            ((m.user_time_sec + m.system_time_sec) / (m.wall_clock_sec * m.runner.cpu_cores)) * 100
        );

        // Mutation stats (may not exist in older entries)
        const hasMutations = first.mutations?.total > 0;
        const mutationCountValues = measurements.map(m => m.mutations?.total || 0);
        const wallPerMutationValues = measurements.map(m => m.derived?.wall_clock_per_mutation || 0);
        const msiValues = measurements.map(m => m.mutations?.msi || 0);
        const voluntaryPerMutationValues = measurements.map(m =>
            m.mutations?.total > 0 ? m.voluntary_ctx_switches / m.mutations.total : 0
        );
        const involuntaryPerMutationValues = measurements.map(m =>
            m.mutations?.total > 0 ? m.involuntary_ctx_switches / m.mutations.total : 0
        );

        const wallClockMean = wallClockValues.reduce((a, b) => a + b, 0) / count;
        const memoryMean = memoryValues.reduce((a, b) => a + b, 0) / count;
        const wallPerCoreMean = wallPerCoreValues.reduce((a, b) => a + b, 0) / count;
        const cpuTotalMean = cpuTotalValues.reduce((a, b) => a + b, 0) / count;
        const voluntaryCtxMean = voluntaryCtxValues.reduce((a, b) => a + b, 0) / count;
        const involuntaryCtxMean = involuntaryCtxValues.reduce((a, b) => a + b, 0) / count;
        const userTimeMean = userTimeValues.reduce((a, b) => a + b, 0) / count;
        const systemTimeMean = systemTimeValues.reduce((a, b) => a + b, 0) / count;
        const cpuEfficiencyMean = cpuEfficiencyValues.reduce((a, b) => a + b, 0) / count;
        const mutationCountMean = hasMutations ? mutationCountValues.reduce((a, b) => a + b, 0) / count : 0;
        const wallPerMutationMean = hasMutations ? wallPerMutationValues.reduce((a, b) => a + b, 0) / count : 0;
        const msiMean = hasMutations ? msiValues.reduce((a, b) => a + b, 0) / count : 0;
        const voluntaryPerMutationMean = hasMutations ? voluntaryPerMutationValues.reduce((a, b) => a + b, 0) / count : 0;
        const involuntaryPerMutationMean = hasMutations ? involuntaryPerMutationValues.reduce((a, b) => a + b, 0) / count : 0;

        processed.push({
            ...first,
            wall_clock_sec: wallClockMean,
            wall_clock_stddev: stddev(wallClockValues, wallClockMean),
            max_rss_kb: memoryMean,
            max_rss_stddev: stddev(memoryValues, memoryMean),
            voluntary_ctx_switches: voluntaryCtxMean,
            voluntary_ctx_stddev: stddev(voluntaryCtxValues, voluntaryCtxMean),
            involuntary_ctx_switches: involuntaryCtxMean,
            involuntary_ctx_stddev: stddev(involuntaryCtxValues, involuntaryCtxMean),
            user_time_sec: userTimeMean,
            user_time_stddev: stddev(userTimeValues, userTimeMean),
            system_time_sec: systemTimeMean,
            system_time_stddev: stddev(systemTimeValues, systemTimeMean),
            mutations: hasMutations ? {
                total: mutationCountMean,
                total_stddev: stddev(mutationCountValues, mutationCountMean),
                msi: msiMean,
                msi_stddev: stddev(msiValues, msiMean),
            } : null,
            derived: {
                wall_clock_per_core: wallPerCoreMean,
                wall_clock_per_core_stddev: stddev(wallPerCoreValues, wallPerCoreMean),
                cpu_time_total: cpuTotalMean,
                cpu_time_stddev: stddev(cpuTotalValues, cpuTotalMean),
                cpu_efficiency: cpuEfficiencyMean,
                cpu_efficiency_stddev: stddev(cpuEfficiencyValues, cpuEfficiencyMean),
                wall_clock_per_mutation: wallPerMutationMean,
                wall_clock_per_mutation_stddev: hasMutations ? stddev(wallPerMutationValues, wallPerMutationMean) : 0,
                voluntary_ctx_per_mutation: voluntaryPerMutationMean,
                voluntary_ctx_per_mutation_stddev: hasMutations ? stddev(voluntaryPerMutationValues, voluntaryPerMutationMean) : 0,
                involuntary_ctx_per_mutation: involuntaryPerMutationMean,
                involuntary_ctx_per_mutation_stddev: hasMutations ? stddev(involuntaryPerMutationValues, involuntaryPerMutationMean) : 0,
            },
            _measurement_count: count,
        });
    }

    // Sort by commit_date
    processed.sort((a, b) => {
        const dateA = a.commit_date ? new Date(a.commit_date) : new Date(a.timestamp);
        const dateB = b.commit_date ? new Date(b.commit_date) : new Date(b.timestamp);
        return dateA - dateB;
    });

    return processed;
}
