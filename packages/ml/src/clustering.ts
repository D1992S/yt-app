import { cleanText } from './text-processing';
import { SeededRNG } from './utils/random';

interface Vector {
  id: string;
  values: number[];
}

export class TextClusterer {
  private vocabulary: Map<string, number> = new Map();
  private idf: number[] = [];
  private rng: SeededRNG;

  constructor(seed = 42) {
    this.rng = new SeededRNG(seed);
  }

  fitTransform(documents: { id: string; text: string }[]): Vector[] {
    // 1. Build Vocabulary
    const docsTokens = documents.map(d => ({ id: d.id, tokens: cleanText(d.text) }));
    const uniqueWords = new Set<string>();
    docsTokens.forEach(d => d.tokens.forEach(t => uniqueWords.add(t)));
    
    this.vocabulary = new Map(Array.from(uniqueWords).map((w, i) => [w, i]));
    const vocabSize = this.vocabulary.size;

    // 2. Calculate IDF
    this.idf = new Array(vocabSize).fill(0);
    docsTokens.forEach(d => {
      const seenInDoc = new Set(d.tokens);
      seenInDoc.forEach(token => {
        const idx = this.vocabulary.get(token);
        if (idx !== undefined) this.idf[idx]++;
      });
    });
    this.idf = this.idf.map(count => Math.log(documents.length / (1 + count)));

    // 3. Calculate TF-IDF Vectors
    return docsTokens.map(doc => {
      const vec = new Array(vocabSize).fill(0);
      const termCounts = new Map<string, number>();
      doc.tokens.forEach(t => termCounts.set(t, (termCounts.get(t) || 0) + 1));

      termCounts.forEach((count, term) => {
        const idx = this.vocabulary.get(term);
        if (idx !== undefined) {
          const tf = count / doc.tokens.length;
          vec[idx] = tf * this.idf[idx];
        }
      });

      return { id: doc.id, values: vec };
    });
  }

  kMeans(vectors: Vector[], k: number, maxIterations = 20) {
    if (vectors.length === 0) return [];
    if (vectors.length < k) k = vectors.length;

    const dim = vectors[0].values.length;
    
    // Initialize Centroids: Shuffle and pick first k (Deterministic with SeededRNG)
    const shuffled = this.rng.shuffle(vectors);
    let centroids = shuffled.slice(0, k).map(v => [...v.values]);
    let assignments = new Array(vectors.length).fill(-1);

    for (let iter = 0; iter < maxIterations; iter++) {
      let changed = false;

      // Assign points to nearest centroid
      assignments = vectors.map((vec, idx) => {
        let minDist = Infinity;
        let clusterIdx = -1;

        for (let c = 0; c < k; c++) {
          const dist = this.euclideanDistance(vec.values, centroids[c]);
          if (dist < minDist) {
            minDist = dist;
            clusterIdx = c;
          }
        }
        
        if (assignments[idx] !== clusterIdx) changed = true;
        return clusterIdx;
      });

      if (!changed) break;

      // Update Centroids
      const sums = Array.from({ length: k }, () => new Array(dim).fill(0));
      const counts = new Array(k).fill(0);

      vectors.forEach((vec, idx) => {
        const c = assignments[idx];
        counts[c]++;
        for (let i = 0; i < dim; i++) {
          sums[c][i] += vec.values[i];
        }
      });

      centroids = sums.map((sum, c) => {
        if (counts[c] === 0) return centroids[c]; // Keep old if empty
        return sum.map(val => val / counts[c]);
      });
    }

    return assignments.map((clusterId, idx) => ({
      videoId: vectors[idx].id,
      clusterId
    }));
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }
}
