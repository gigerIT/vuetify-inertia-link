import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { recordRun } from './record-run.mjs';

const sha = 'a'.repeat(40);
const hash = 'b'.repeat(64);
const checkpoint = {
    captured_at: '2026-10-03T12:00:00Z',
    docs: { repository: 'inertiajs/docs', ref: 'main', revision: sha },
    inertia: { repository: 'inertiajs/inertia', releases: { 'v3.0.0': { revision: sha, notes_sha256: hash } } },
    packages: Object.fromEntries(['@inertiajs/core', '@inertiajs/vue3', 'vue', 'vuetify'].map(name => [name, {
        ranges: { peerDependencies: '^3.0.0' }, locked: '3.0.0', reviewed: '3.0.0',
    }])),
    local: {
        head: sha,
        files_sha256: Object.fromEntries(['index.js', 'index.d.ts', 'README.md', 'package.json', 'package-lock.json', 'tests/index.test.js'].map(path => [path, hash])),
    },
};

function fixture(t) {
    const directory = mkdtempSync(join(tmpdir(), 'inertia-updates-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    mkdirSync(join(directory, 'runs'));
    const statePath = join(directory, 'state.json');
    writeFileSync(statePath, JSON.stringify({ schema_version: 1, last_run: null, last_successful_run: null, checkpoint: null, findings: {} }));
    let serial = 0;
    return {
        statePath,
        state: () => JSON.parse(readFileSync(statePath, 'utf8')),
        proposal(status = 'complete', findings = []) {
            serial++;
            const id = `20261003T120000Z-${serial}`;
            writeFileSync(join(directory, 'runs', `${id}.md`), '# Fixture report\n\nEvidence reviewed in this isolated fixture.\n');
            return {
                schema_version: 1,
                base_state_sha256: createHash('sha256').update(readFileSync(statePath)).digest('hex'),
                run: {
                    id,
                    started_at: '2026-10-03T12:00:00Z',
                    finished_at: '2026-10-03T12:01:00Z',
                    mode: status === 'planned' ? 'plan-only' : 'implement',
                    status,
                    scan_complete: ['complete', 'planned'].includes(status),
                    summary: 'Fixture run.',
                    report: `runs/${id}.md`,
                    verification: { status: 'not-needed', summary: 'Isolated bookkeeping test; no package changes.' },
                },
                findings,
                ...(status === 'complete' ? { checkpoint: structuredClone(checkpoint) } : {}),
            };
        },
    };
}

function finding(status) {
    return {
        id: 'hover-prefetch',
        status,
        summary: 'A fixture finding about hover events.',
        reason: 'Fixture evidence determines the current decision.',
        sources: ['https://inertiajs.com/docs/v3/data-props/prefetching'],
        local_evidence: ['index.js: RouterLink.useLink'],
        next_action: 'Inspect the supported Vuetify event contract.',
        revisit_when: 'Vuetify forwards hover events to useLink.',
    };
}

test('first success establishes coverage; partial and plan-only runs retain it and retain findings', t => {
    const f = fixture(t);
    const first = f.proposal('complete', [finding('already-supported')]);
    assert.equal(recordRun(f.statePath, first).checkpoint_advanced, true);
    assert.deepEqual(f.state().checkpoint, checkpoint);
    for (const outcome of ['partial', 'blocked', 'planned']) {
        assert.equal(recordRun(f.statePath, f.proposal(outcome)).checkpoint_advanced, false);
        assert.deepEqual(f.state().checkpoint, checkpoint);
        assert.equal(f.state().last_successful_run, first.run.id);
        assert.equal(f.state().findings['hover-prefetch'].first_seen_run, first.run.id);
        assert.equal(f.state().last_run.status, outcome);
    }
});

test('a zero-delta run must revisit deferred work, and implementation keeps the original finding identity', t => {
    const f = fixture(t);
    const first = f.proposal('complete', [finding('deferred')]);
    recordRun(f.statePath, first);
    const before = readFileSync(f.statePath, 'utf8');
    assert.throws(() => recordRun(f.statePath, f.proposal()), /Revisit outstanding/);
    assert.equal(readFileSync(f.statePath, 'utf8'), before);
    const next = f.proposal('complete', [finding('implemented')]);
    recordRun(f.statePath, next);
    assert.deepEqual(Object.keys(f.state().findings), ['hover-prefetch']);
    assert.equal(f.state().findings['hover-prefetch'].first_seen_run, first.run.id);
    assert.equal(f.state().findings['hover-prefetch'].last_reviewed_run, next.run.id);
});

test('planned work remains pending until an implementation run resolves it', t => {
    const f = fixture(t);
    recordRun(f.statePath, f.proposal('planned', [finding('pending')]));
    assert.equal(f.state().checkpoint, null);
    assert.throws(() => recordRun(f.statePath, f.proposal()), /Resolve or explicitly defer/);
    const next = f.proposal('complete', [finding('implemented')]);
    recordRun(f.statePath, next);
    assert.equal(f.state().last_successful_run, next.run.id);
});

test('a stale writer cannot erase another run or its findings', t => {
    const f = fixture(t);
    const stale = f.proposal();
    recordRun(f.statePath, f.proposal('planned', [finding('pending')]));
    const before = readFileSync(f.statePath, 'utf8');
    assert.throws(() => recordRun(f.statePath, stale), /State changed/);
    assert.equal(readFileSync(f.statePath, 'utf8'), before);
});

test('incomplete coverage, failed verification, plan-only promotion, and missing evidence leave state untouched', t => {
    const f = fixture(t);
    const before = readFileSync(f.statePath, 'utf8');
    const changes = [
        proposal => { proposal.run.scan_complete = false; },
        proposal => { proposal.run.verification.status = 'failed'; },
        proposal => { proposal.run.mode = 'plan-only'; },
        proposal => { proposal.checkpoint.docs.revision = 'unknown'; },
        proposal => { proposal.checkpoint.inertia.releases = {}; },
        proposal => { proposal.run.report = 'runs/missing.md'; },
        proposal => { proposal.findings = [finding('blocked')]; },
    ];
    for (const change of changes) {
        const proposal = f.proposal();
        change(proposal);
        assert.throws(() => recordRun(f.statePath, proposal));
        assert.equal(readFileSync(f.statePath, 'utf8'), before);
    }
    const partial = f.proposal('partial');
    partial.checkpoint = checkpoint;
    assert.throws(() => recordRun(f.statePath, partial), /must omit checkpoint/);
    assert.equal(readFileSync(f.statePath, 'utf8'), before);
    recordRun(f.statePath, f.proposal());
});
