#!/usr/bin/env php
<?php
/**
 * This code is licensed under the BSD 3-Clause License.
 *
 * Copyright (c) 2017, Maks Rafalko
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

declare(strict_types=1);

/**
 * Prepares metrics entry from timing.json and optional infection-summary.json
 *
 * Usage: php prepare-metrics.php timing.json [output.json]
 *
 * Required environment variables:
 *   CPU_CORES, COMMIT_DATE, GIT_SHA, GIT_REF, TRIGGER,
 *   CPU_MODEL, CPU_ARCH, TOTAL_MEM, IMAGE_VERSION,
 *   PHPUNIT_VERSION, STEAL_PERCENT
 */
if ($argc < 2) {
    \fwrite(\STDERR, "Usage: php prepare-metrics.php timing.json [output.json]\n");

    exit(1);
}

$timingFile = $argv[1];
$outputFile = $argv[2] ?? null;

$content = \file_get_contents($timingFile);

if ($content === false) {
    \fwrite(\STDERR, "Failed to read timing file: $timingFile\n");

    exit(1);
}

// When command exits non-zero, time prepends "Command exited with non-zero status N\n"
if (\str_starts_with($content, 'Command exited')) {
    $content = \substr($content, \strpos($content, "\n") + 1);
}

$timing = \json_decode($content, true);

if ($timing === null) {
    \fwrite(\STDERR, 'Failed to parse timing.json: ' . \json_last_error_msg() . "\n");
    \fwrite(\STDERR, "Content: $content\n");

    exit(1);
}

$mutations = null;

if (\file_exists('infection-summary.json')) {
    $summary = \json_decode(\file_get_contents('infection-summary.json'), true);

    if ($summary !== null && isset($summary['stats'])) {
        $mutations = [
            'total' => $summary['stats']['totalMutantsCount'] ?? 0,
            'killed' => $summary['stats']['killedCount'] ?? 0,
            'msi' => $summary['stats']['msi'] ?? 0,
        ];
    }
}

$cpuCores = (int) \getenv('CPU_CORES') ?: 1;
$wallClock = (float) ($timing['wall_clock_sec'] ?? 0);
$userTime = (float) ($timing['user_time_sec'] ?? 0);
$sysTime = (float) ($timing['system_time_sec'] ?? 0);
$maxRss = (int) ($timing['max_rss_kb'] ?? 0);

$wallPerCore = $cpuCores > 0 ? \round($wallClock / $cpuCores, 2) : 0;
$cpuTotal = \round($userTime + $sysTime, 2);
$wallPerMut = $userPerMut = $memPerMut = 0;

if ($mutations !== null && $mutations['total'] > 0) {
    $wallPerMut = \round($wallClock / $mutations['total'], 4);
    $userPerMut = \round($userTime / $mutations['total'], 4);
    $memPerMut = \round($maxRss / $mutations['total'], 2);
}

$entry = \array_merge($timing, [
    'steal_percent' => (float) \getenv('STEAL_PERCENT'),
    'timestamp' => \gmdate('Y-m-d\TH:i:s\Z'),
    'commit_date' => \getenv('COMMIT_DATE'),
    'git_sha' => \getenv('GIT_SHA'),
    'git_ref' => \getenv('GIT_REF'),
    'trigger' => \getenv('TRIGGER'),
    'php_version' => \PHP_VERSION,
    'phpunit_version' => \getenv('PHPUNIT_VERSION') ?: 'unknown',
    'config' => ['name' => 'baseline', 'args' => '--no-progress --threads=max'],
    'runner' => [
        'os' => 'ubuntu-latest',
        'image_version' => \getenv('IMAGE_VERSION') ?: 'unknown',
        'cpu_model' => \getenv('CPU_MODEL'),
        'cpu_cores' => $cpuCores,
        'cpu_arch' => \getenv('CPU_ARCH'),
        'total_memory_kb' => (int) \getenv('TOTAL_MEM'),
    ],
]);

if ($mutations !== null) {
    $entry['mutations'] = $mutations;
}

$entry['derived'] = [
    'wall_clock_per_core' => $wallPerCore,
    'cpu_time_total' => $cpuTotal,
    'wall_clock_per_mutation' => $wallPerMut,
    'user_time_per_mutation' => $userPerMut,
    'memory_per_mutation_kb' => $memPerMut,
];

$json = \json_encode($entry, \JSON_PRETTY_PRINT | \JSON_UNESCAPED_SLASHES) . "\n";

if ($outputFile !== null) {
    \file_put_contents($outputFile, $json);
} else {
    echo $json;
}
