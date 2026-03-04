/**
 * EVO Intelligence Layer — Agent Registry
 *
 * The central nerve system. Maintains metadata for all 96,000 agents,
 * organises them into clusters and colonies, and provides lookup methods
 * for every other EIL subsystem.
 *
 * EVO: The registry is the prerequisite for everything — supervisors,
 * meta-agents, the event bus, and the optimizers all depend on it.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { EvoAgentMeta, EvoConfig } from './types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * EVO: Extremely lightweight cosine similarity on two equal-length number arrays.
 * Used only for the initial skill-domain clustering; not intended for production
 * vector search (Mastra's vector infrastructure handles that).
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    magA += (a[i] ?? 0) ** 2;
    magB += (b[i] ?? 0) ** 2;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export class EvoRegistry {
  /** agentId → full metadata */
  private agents: Map<string, EvoAgentMeta> = new Map();
  /** clusterId → ordered list of agentIds */
  private clusters: Map<string, string[]> = new Map();
  /** colonyId → ordered list of clusterIds */
  private colonies: Map<string, string[]> = new Map();
  /** Flat skill taxonomy: domain string → agentIds that share it */
  private skillIndex: Map<string, string[]> = new Map();

  private config: EvoConfig;

  constructor(config: EvoConfig) {
    this.config = config;
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  /**
   * Reads agent files from disk, extracts metadata, and organises agents
   * into clusters + colonies. Call once at startup.
   *
   * @param agentsDirOverride Optional path override for the agents directory.
   * @param embedFn Optional function that maps a skill-domain string to a
   *   numeric vector. When provided, clustering uses cosine similarity on
   *   embeddings. When omitted, a deterministic hash-bucket is used (much
   *   faster, acceptable when real embeddings aren't available at init time).
   * @param onProgress Optional progress callback (agentsScanned, totalFiles).
   */
  async initialize(
    agentsDirOverride?: string,
    embedFn?: (text: string) => Promise<number[]>,
    onProgress?: (scanned: number, total: number) => void,
  ): Promise<void> {
    const agentsDir = path.resolve(agentsDirOverride ?? this.config.agentsDir);

    // EVO: We only scan .ts files whose names match the agent-NNNNN pattern
    const files = fs.readdirSync(agentsDir).filter(f => /^agent-\d+\.ts$/.test(f));

    const metas: EvoAgentMeta[] = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const filePath = path.join(agentsDir, file);
      const source = fs.readFileSync(filePath, 'utf-8');
      const meta = this.extractMetaFromSource(source, file);
      metas.push(meta);

      // EVO: Report progress every 5,000 agents to avoid callback overhead
      if (onProgress && ((i + 1) % 5000 === 0 || i + 1 === total)) {
        onProgress(i + 1, total);
      }
    }

    // Step 1: cluster
    if (embedFn) {
      await this.clusterByEmbedding(metas, embedFn);
    } else {
      this.clusterByDeterministicBucket(metas);
    }

    // Step 2: group clusters into colonies
    this.buildColonies();
  }

  // ── Extraction ────────────────────────────────────────────────────────────

  /**
   * EVO: Extracts metadata from an agent source file without importing it.
   * We regex-parse because eval/import at scale (96k files) is too slow
   * and we explicitly do NOT want to execute agent code at registration time.
   *
   * IMPORTANT: The regex must target fields inside `new Agent({...})` specifically,
   * because agent files contain other constructs (e.g. `createScorer({ id: ... })`)
   * that also have `id:` fields. We first isolate the Agent constructor block,
   * then extract fields from within it.
   */
  private extractMetaFromSource(source: string, filename: string): EvoAgentMeta {
    // EVO: Isolate the `new Agent({...})` block to avoid matching createScorer/MCPClient fields
    const agentBlockMatch = source.match(/new\s+Agent\s*\(\s*\{([\s\S]*?)\}\s*\)/);
    const agentBlock = agentBlockMatch ? agentBlockMatch[1]! : source;

    // Pull id from Agent constructor
    const idMatch = agentBlock.match(/id:\s*['"]([^'"]+)['"]/);
    const agentId = idMatch ? idMatch[1] : filename.replace('.ts', '');

    // Pull name from Agent constructor
    const nameMatch = agentBlock.match(/name:\s*['"]([^'"]+)['"]/);
    const _name = nameMatch ? nameMatch[1] : agentId;

    // Pull instructions from Agent constructor — used as the skill domain signal
    const instrMatch = agentBlock.match(/instructions:\s*['"]([^'"]+)['"]/);
    const instructions = instrMatch ? instrMatch[1] : 'general';

    // Derive skill domain from instructions (first two words, lowercased)
    const skillDomain = instructions
      .toLowerCase()
      .split(/\s+/)
      .slice(0, 3)
      .join(' ')
      .replace(/[^a-z0-9 ]/g, '')
      .trim() || 'general';

    const meta: EvoAgentMeta = {
      agentId: agentId ?? filename.replace('.ts', ''),
      clusterId: '', // assigned during clustering
      colonyId: '', // assigned during colony build
      skillDomain,
      skillDepth: 1,
      evaluationScore: 0.5, // neutral starting score
      generationCount: 0,
      lastEvolvedAt: new Date().toISOString(),
      promptVersion: 0,
    };

    return meta;
  }

  // ── Clustering ────────────────────────────────────────────────────────────

  /**
   * EVO: Deterministic bucket clustering — O(n) partition into clusters of
   * `clusterSize` agents. Order is by agentId so the result is reproducible.
   * Used when no embedding function is available.
   */
  private clusterByDeterministicBucket(metas: EvoAgentMeta[]): void {
    metas.sort((a, b) => a.agentId.localeCompare(b.agentId));

    let clusterIdx = 0;
    for (let i = 0; i < metas.length; i += this.config.clusterSize) {
      const clusterId = `cluster-${String(clusterIdx).padStart(4, '0')}`;
      const slice = metas.slice(i, i + this.config.clusterSize);

      const memberIds: string[] = [];
      for (const meta of slice) {
        meta.clusterId = clusterId;
        this.agents.set(meta.agentId, meta);
        memberIds.push(meta.agentId);

        // skill index
        const existing = this.skillIndex.get(meta.skillDomain) ?? [];
        existing.push(meta.agentId);
        this.skillIndex.set(meta.skillDomain, existing);
      }
      this.clusters.set(clusterId, memberIds);
      clusterIdx++;
    }
  }

  /**
   * EVO: Embedding-based clustering using cosine similarity. Greedy nearest-
   * neighbour assignment — not optimal but linear in practice because we cap
   * cluster size and iterate agents only once.
   */
  private async clusterByEmbedding(
    metas: EvoAgentMeta[],
    embedFn: (text: string) => Promise<number[]>,
  ): Promise<void> {
    // Batch embed all skill domains
    const embeddings = new Map<string, number[]>();
    for (const meta of metas) {
      if (!embeddings.has(meta.skillDomain)) {
        const vec = await embedFn(meta.skillDomain);
        embeddings.set(meta.skillDomain, vec);
      }
    }

    // Sort by similarity to a random centroid, then bucket
    const centroidDomain = metas[0]?.skillDomain ?? 'general';
    const centroidVec = embeddings.get(centroidDomain) ?? [];

    const scored = metas.map(m => ({
      meta: m,
      sim: cosineSimilarity(centroidVec, embeddings.get(m.skillDomain) ?? []),
    }));
    scored.sort((a, b) => b.sim - a.sim);

    let clusterIdx = 0;
    for (let i = 0; i < scored.length; i += this.config.clusterSize) {
      const clusterId = `cluster-${String(clusterIdx).padStart(4, '0')}`;
      const slice = scored.slice(i, i + this.config.clusterSize);

      const memberIds: string[] = [];
      for (const { meta } of slice) {
        meta.clusterId = clusterId;
        this.agents.set(meta.agentId, meta);
        memberIds.push(meta.agentId);

        const existing = this.skillIndex.get(meta.skillDomain) ?? [];
        existing.push(meta.agentId);
        this.skillIndex.set(meta.skillDomain, existing);
      }
      this.clusters.set(clusterId, memberIds);
      clusterIdx++;
    }
  }

  // ── Colony Building ───────────────────────────────────────────────────────

  /**
   * EVO: Groups clusters into colonies of `clustersPerColony`.
   * Simple sequential assignment mirroring the data-center-rack analogy.
   */
  private buildColonies(): void {
    const clusterIds = Array.from(this.clusters.keys()).sort();

    let colonyIdx = 0;
    for (let i = 0; i < clusterIds.length; i += this.config.clustersPerColony) {
      const colonyId = `colony-${String(colonyIdx).padStart(2, '0')}`;
      const slice = clusterIds.slice(i, i + this.config.clustersPerColony);

      this.colonies.set(colonyId, slice);

      // Back-fill colonyId onto agent metas
      for (const cid of slice) {
        const members = this.clusters.get(cid) ?? [];
        for (const agentId of members) {
          const meta = this.agents.get(agentId);
          if (meta) {
            meta.colonyId = colonyId;
          }
        }
      }
      colonyIdx++;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  registerAgent(meta: EvoAgentMeta): void {
    this.agents.set(meta.agentId, meta);
  }

  getAgentMeta(agentId: string): EvoAgentMeta | undefined {
    return this.agents.get(agentId);
  }

  getAllAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }

  getCluster(clusterId: string): string[] {
    return this.clusters.get(clusterId) ?? [];
  }

  getClusterIds(): string[] {
    return Array.from(this.clusters.keys());
  }

  getColony(colonyId: string): string[] {
    return this.colonies.get(colonyId) ?? [];
  }

  getColonyIds(): string[] {
    return Array.from(this.colonies.keys());
  }

  /** Returns all colonyIds that contain this clusterId. */
  getColonyForCluster(clusterId: string): string | undefined {
    for (const [colonyId, clusterIds] of this.colonies.entries()) {
      if (clusterIds.includes(clusterId)) return colonyId;
    }
    return undefined;
  }

  findAgentsByDomain(domain: string): string[] {
    return this.skillIndex.get(domain) ?? [];
  }

  findAgentsBySkillDepth(minDepth: number): EvoAgentMeta[] {
    const results: EvoAgentMeta[] = [];
    for (const meta of this.agents.values()) {
      if (meta.skillDepth >= minDepth) results.push(meta);
    }
    return results;
  }

  /**
   * EVO: Returns agents in the same cluster that share similar skill domains.
   * Used by supervisors to route directives efficiently.
   */
  getSkillNeighbors(agentId: string, maxResults = 10): EvoAgentMeta[] {
    const meta = this.agents.get(agentId);
    if (!meta) return [];

    const clusterMembers = this.clusters.get(meta.clusterId) ?? [];
    const neighbors: EvoAgentMeta[] = [];

    for (const memberId of clusterMembers) {
      if (memberId === agentId) continue;
      const memberMeta = this.agents.get(memberId);
      if (memberMeta && memberMeta.skillDomain === meta.skillDomain) {
        neighbors.push(memberMeta);
        if (neighbors.length >= maxResults) break;
      }
    }
    return neighbors;
  }

  // ── Mutation Helpers (used by optimizers) ─────────────────────────────────

  updateAgentScore(agentId: string, score: number): void {
    const meta = this.agents.get(agentId);
    if (meta) {
      meta.evaluationScore = score;
    }
  }

  incrementGeneration(agentId: string): void {
    const meta = this.agents.get(agentId);
    if (meta) {
      meta.generationCount += 1;
      meta.lastEvolvedAt = new Date().toISOString();
    }
  }

  updatePromptVersion(agentId: string, version: number): void {
    const meta = this.agents.get(agentId);
    if (meta) {
      meta.promptVersion = version;
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  get totalAgents(): number {
    return this.agents.size;
  }

  get totalClusters(): number {
    return this.clusters.size;
  }

  get totalColonies(): number {
    return this.colonies.size;
  }

  /**
   * Returns the median evaluation score for all agents in a given colony.
   * Used by the optimizer manager to determine when TextGrad should activate.
   */
  getColonyMedianScore(colonyId: string): number {
    const clusterIds = this.colonies.get(colonyId) ?? [];
    const scores: number[] = [];
    for (const cid of clusterIds) {
      const members = this.clusters.get(cid) ?? [];
      for (const aid of members) {
        const meta = this.agents.get(aid);
        if (meta) scores.push(meta.evaluationScore);
      }
    }
    if (scores.length === 0) return 0;
    scores.sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    return scores.length % 2 === 0
      ? ((scores[mid - 1] ?? 0) + (scores[mid] ?? 0)) / 2
      : (scores[mid] ?? 0);
  }

  getClusterMedianScore(clusterId: string): number {
    const members = this.clusters.get(clusterId) ?? [];
    const scores: number[] = [];
    for (const aid of members) {
      const meta = this.agents.get(aid);
      if (meta) scores.push(meta.evaluationScore);
    }
    if (scores.length === 0) return 0;
    scores.sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    return scores.length % 2 === 0
      ? ((scores[mid - 1] ?? 0) + (scores[mid] ?? 0)) / 2
      : (scores[mid] ?? 0);
  }

  // ── Aliases (used by newer EIL modules) ───────────────────────────────────

  getAllClusterIds(): string[] {
    return this.getClusterIds();
  }

  getAllColonyIds(): string[] {
    return this.getColonyIds();
  }

  get agentCount(): number {
    return this.agents.size;
  }

  // ── Topology Mutation Methods ─────────────────────────────────────────────

  /**
   * EVO: Split a cluster into two halves.
   */
  splitCluster(clusterId: string): void {
    const agents = this.clusters.get(clusterId);
    if (!agents || agents.length < 2) return;

    const mid = Math.floor(agents.length / 2);
    const newClusterId = `${clusterId}-split-${Date.now().toString(36)}`;

    const remaining = agents.slice(0, mid);
    const moved = agents.slice(mid);

    this.clusters.set(clusterId, remaining);
    this.clusters.set(newClusterId, moved);

    // Update agent metas
    for (const agentId of moved) {
      const meta = this.agents.get(agentId);
      if (meta) meta.clusterId = newClusterId;
    }

    // Add new cluster to same colony
    const colonyId = this.getColonyForCluster(clusterId);
    if (colonyId) {
      const colClusters = this.colonies.get(colonyId);
      if (colClusters) colClusters.push(newClusterId);
    }
  }

  /**
   * EVO: Merge two clusters into one (second merges into first).
   */
  mergeClusters(clusterA: string, clusterB: string): void {
    const agentsA = this.clusters.get(clusterA);
    const agentsB = this.clusters.get(clusterB);
    if (!agentsA || !agentsB) return;

    // Move B agents into A
    for (const agentId of agentsB) {
      agentsA.push(agentId);
      const meta = this.agents.get(agentId);
      if (meta) meta.clusterId = clusterA;
    }

    this.clusters.delete(clusterB);

    // Remove clusterB from colonies
    for (const [, clusterIds] of this.colonies) {
      const idx = clusterIds.indexOf(clusterB);
      if (idx >= 0) clusterIds.splice(idx, 1);
    }
  }

  /**
   * EVO: Reassign an agent to a different cluster.
   */
  reassignAgent(agentId: string, toClusterId: string): void {
    const meta = this.agents.get(agentId);
    if (!meta) return;

    // Remove from old cluster
    const oldCluster = this.clusters.get(meta.clusterId);
    if (oldCluster) {
      const idx = oldCluster.indexOf(agentId);
      if (idx >= 0) oldCluster.splice(idx, 1);
    }

    // Add to new cluster
    const newCluster = this.clusters.get(toClusterId);
    if (newCluster) {
      newCluster.push(agentId);
      meta.clusterId = toClusterId;
    }
  }

  /**
   * EVO: Swap two agents between their respective clusters.
   */
  swapAgents(agentA: string, agentB: string): void {
    const metaA = this.agents.get(agentA);
    const metaB = this.agents.get(agentB);
    if (!metaA || !metaB) return;

    const clusterA = this.clusters.get(metaA.clusterId);
    const clusterB = this.clusters.get(metaB.clusterId);
    if (!clusterA || !clusterB) return;

    // Swap in clusters
    const idxA = clusterA.indexOf(agentA);
    const idxB = clusterB.indexOf(agentB);
    if (idxA >= 0) clusterA[idxA] = agentB;
    if (idxB >= 0) clusterB[idxB] = agentA;

    // Swap cluster assignments
    const tempClusterId = metaA.clusterId;
    metaA.clusterId = metaB.clusterId;
    metaB.clusterId = tempClusterId;
  }
}
