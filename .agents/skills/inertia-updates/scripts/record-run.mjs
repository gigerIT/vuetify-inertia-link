import { createHash } from 'node:crypto';
import { closeSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultState = fileURLToPath(new URL('../../../inertia-updates/state.json', import.meta.url));
const statuses = ['pending', 'implemented', 'already-supported', 'not-applicable', 'deferred', 'blocked'];
const outstanding = ['pending', 'deferred', 'blocked'];
const sha256 = value => createHash('sha256').update(value).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) && value.every(nonempty);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const revision = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const timestamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value));

function requireValue(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function readState(path) {
    const raw = readFileSync(path, 'utf8');
    const state = JSON.parse(raw);
    requireValue(state.schema_version === 1 && object(state.findings), 'Unsupported or damaged state; recover it before recording a run.');
    requireValue(state.last_run === null || object(state.last_run), 'Invalid last_run.');
    requireValue(state.checkpoint === null || object(state.checkpoint), 'Invalid checkpoint.');
    requireValue(state.last_successful_run === null || nonempty(state.last_successful_run), 'Invalid last_successful_run.');
    return { state, hash: sha256(raw) };
}

function validateCheckpoint(checkpoint) {
    requireValue(object(checkpoint) && timestamp(checkpoint.captured_at), 'A complete run needs a dated checkpoint.');
    requireValue(checkpoint.docs?.repository === 'inertiajs/docs' && nonempty(checkpoint.docs.ref) && revision(checkpoint.docs.revision), 'Pin the official docs repository, ref, and full commit.');
    requireValue(checkpoint.inertia?.repository === 'inertiajs/inertia', 'Use the official Inertia runtime repository.');
    const releases = checkpoint.inertia.releases;
    requireValue(object(releases) && Object.keys(releases).length > 0, 'Record the reviewed stable release inventory.');
    for (const [tag, release] of Object.entries(releases)) {
        requireValue(nonempty(tag) && object(release) && revision(release.revision) && digest(release.notes_sha256), `Missing revision or release-note hash for ${tag}.`);
    }
    for (const name of ['@inertiajs/core', '@inertiajs/vue3', 'vue', 'vuetify']) {
        const pkg = checkpoint.packages?.[name];
        requireValue(object(pkg) && object(pkg.ranges) && Object.keys(pkg.ranges).length > 0 && Object.values(pkg.ranges).every(nonempty) && nonempty(pkg.locked), `Record declared ranges and locked version for ${name}.`);
        if (name.startsWith('@inertiajs/')) {
            requireValue(nonempty(pkg.reviewed), `Record the reviewed published version for ${name}.`);
        }
    }
    const files = checkpoint.local?.files_sha256;
    requireValue(revision(checkpoint.local?.head) && object(files), 'Record local HEAD and file fingerprints.');
    requireValue(['index.js', 'index.d.ts', 'README.md', 'package.json', 'package-lock.json'].every(path => digest(files[path])), 'Fingerprint the runtime, declarations, README, manifest, and lockfile.');
    requireValue(Object.keys(files).some(path => path.startsWith('tests/')) && Object.values(files).every(digest), 'Include test files and valid SHA-256 fingerprints.');
}

export function recordRun(statePath, proposal) {
    const lockPath = `${statePath}.lock`;
    const temporaryPath = `${statePath}.tmp-${process.pid}`;
    const lock = openSync(lockPath, 'wx');
    let temporaryCreated = false;

    try {
        const { state, hash } = readState(statePath);
        requireValue(proposal.schema_version === 1, 'Unsupported proposal schema.');
        requireValue(proposal.base_state_sha256 === hash, 'State changed since this run started; reconcile it and regenerate the proposal.');
        const run = proposal.run;
        requireValue(object(run) && nonempty(run.id) && /^\d{8}T\d{6}Z(?:-[a-z0-9-]+)?$/.test(run.id), 'Use a unique UTC run ID: YYYYMMDDTHHMMSSZ[-suffix].');
        requireValue(run.id !== state.last_run?.id, 'This run ID is already recorded.');
        requireValue(timestamp(run.started_at) && timestamp(run.finished_at) && Date.parse(run.finished_at) >= Date.parse(run.started_at), 'Run timestamps must be ordered UTC timestamps.');
        requireValue(['implement', 'plan-only'].includes(run.mode), 'Invalid run mode.');
        requireValue(['complete', 'planned', 'partial', 'blocked'].includes(run.status), 'Invalid run status.');
        requireValue(typeof run.scan_complete === 'boolean' && nonempty(run.summary), 'Record coverage and a run summary.');
        requireValue(object(run.verification) && ['passed', 'failed', 'not-needed'].includes(run.verification.status) && nonempty(run.verification.summary), 'Record verification status and what actually ran or why checks were unnecessary.');
        requireValue(run.report === `runs/${run.id}.md`, 'Report must be runs/<run-id>.md relative to the state directory.');
        requireValue(nonempty(readFileSync(join(dirname(statePath), run.report), 'utf8')), 'Write the run report before updating state.');
        requireValue(Array.isArray(proposal.findings), 'Supply a findings array, even when empty.');

        const findings = { ...state.findings };
        const touched = new Set();
        for (const finding of proposal.findings) {
            requireValue(object(finding) && nonempty(finding.id) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(finding.id), 'Finding IDs must be stable kebab-case strings.');
            requireValue(!touched.has(finding.id), `Duplicate finding: ${finding.id}.`);
            touched.add(finding.id);
            requireValue(statuses.includes(finding.status) && nonempty(finding.summary) && nonempty(finding.reason), `Missing decision or reason for ${finding.id}.`);
            requireValue(strings(finding.sources) && finding.sources.length > 0 && finding.sources.every(url => url.startsWith('https://')), `Cite upstream evidence for ${finding.id}.`);
            requireValue(strings(finding.local_evidence), `Supply a local_evidence array for ${finding.id}.`);
            if (['implemented', 'already-supported'].includes(finding.status)) {
                requireValue(finding.local_evidence.length > 0, `Identify the verified local behavior for ${finding.id}.`);
            }
            if (outstanding.includes(finding.status)) {
                requireValue(nonempty(finding.next_action), `Record the next action for ${finding.id}.`);
            }
            if (['deferred', 'blocked'].includes(finding.status)) {
                requireValue(nonempty(finding.revisit_when), `Record the revisit condition for ${finding.id}.`);
            }
            findings[finding.id] = {
                ...finding,
                first_seen_run: state.findings[finding.id]?.first_seen_run ?? run.id,
                last_reviewed_run: run.id,
            };
        }

        const complete = run.status === 'complete';
        if (complete) {
            requireValue(run.mode === 'implement' && run.scan_complete && run.verification.status !== 'failed', 'Only a fully reviewed and verified implementation run can advance the checkpoint.');
            for (const [id, finding] of Object.entries(findings)) {
                requireValue(!['pending', 'blocked'].includes(finding.status), `Resolve or explicitly defer ${id} before completing the run.`);
                if (outstanding.includes(state.findings[id]?.status)) {
                    requireValue(touched.has(id), `Revisit outstanding finding ${id}, even with no upstream delta.`);
                }
            }
            validateCheckpoint(proposal.checkpoint);
            requireValue(Date.parse(proposal.checkpoint.captured_at) <= Date.parse(run.finished_at), 'Checkpoint boundary cannot be after this run.');
        } else {
            requireValue(proposal.checkpoint === undefined, 'Partial, blocked, and plan-only runs must omit checkpoint; the previous one is preserved.');
        }
        if (run.status === 'planned') {
            requireValue(run.mode === 'plan-only' && run.scan_complete, 'A planned run needs complete research in plan-only mode; otherwise use partial.');
        }

        const next = {
            ...state,
            last_run: run,
            last_successful_run: complete ? run.id : state.last_successful_run,
            checkpoint: complete ? proposal.checkpoint : state.checkpoint,
            findings,
        };
        writeFileSync(temporaryPath, `${JSON.stringify(next, null, 4)}\n`, { flag: 'wx' });
        temporaryCreated = true;
        renameSync(temporaryPath, statePath);
        temporaryCreated = false;
        return { run_id: run.id, status: run.status, checkpoint_advanced: complete };
    } finally {
        if (temporaryCreated) {
            unlinkSync(temporaryPath);
        }
        closeSync(lock);
        unlinkSync(lockPath);
    }
}

function main() {
    const [input, flag, override, ...extra] = process.argv.slice(2);
    if (input === '--help' || !input) {
        process.stdout.write('Usage: node record-run.mjs <proposal.json|--status> [--state /path/to/state.json]\n');
        return;
    }
    requireValue(extra.length === 0 && (flag === undefined || (flag === '--state' && nonempty(override))), 'Expected an input and optional --state path; see --help.');
    const statePath = override ? resolve(override) : defaultState;
    const result = input === '--status'
        ? readState(statePath)
        : recordRun(statePath, JSON.parse(readFileSync(resolve(input), 'utf8')));
    process.stdout.write(`${JSON.stringify(result, null, 4)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        main();
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    }
}
