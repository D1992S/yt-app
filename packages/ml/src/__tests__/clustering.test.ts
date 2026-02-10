import { describe, it, expect } from 'vitest';
import { TextClusterer } from '../clustering';

describe('TextClusterer.fitTransform', () => {
  it('produces vectors with the correct number of dimensions (vocab size)', () => {
    const clusterer = new TextClusterer(42);
    const docs = [
      { id: '1', text: 'machine learning tutorial beginner' },
      { id: '2', text: 'deep learning neural network' },
      { id: '3', text: 'cooking recipe healthy food' },
    ];

    const vectors = clusterer.fitTransform(docs);

    expect(vectors).toHaveLength(3);
    // All vectors should have the same dimensionality
    const dim = vectors[0].values.length;
    expect(dim).toBeGreaterThan(0);
    vectors.forEach(v => {
      expect(v.values.length).toBe(dim);
    });
  });

  it('preserves document IDs in the output vectors', () => {
    const clusterer = new TextClusterer(42);
    const docs = [
      { id: 'alpha', text: 'interesting topic about science' },
      { id: 'beta', text: 'another great discussion about math' },
    ];

    const vectors = clusterer.fitTransform(docs);

    expect(vectors[0].id).toBe('alpha');
    expect(vectors[1].id).toBe('beta');
  });

  it('TF-IDF: terms unique to one doc have IDF of zero (log(N/(1+N_containing)))', () => {
    const clusterer = new TextClusterer(42);
    // With N=2 docs, a term in 1 doc: idf = log(2/(1+1)) = log(1) = 0
    // A term in both docs: idf = log(2/(1+2)) = log(2/3) < 0
    const docs = [
      { id: '1', text: 'python programming tutorial' },
      { id: '2', text: 'cooking recipe kitchen' },
    ];

    const vectors = clusterer.fitTransform(docs);

    // All TF-IDF values should be zero because every term appears in exactly
    // 1 doc, so idf = log(2/2) = 0, thus tf * 0 = 0
    vectors.forEach(v => {
      v.values.forEach(val => {
        expect(val).toBe(0);
      });
    });
  });

  it('TF-IDF: shared terms across docs get negative IDF with this formula', () => {
    const clusterer = new TextClusterer(42);
    // "learning" in all 3 docs: idf = log(3/(1+3)) = log(0.75) < 0
    const docs = [
      { id: '1', text: 'learning python programming' },
      { id: '2', text: 'learning javascript frameworks' },
      { id: '3', text: 'learning cooking baking' },
    ];

    const vectors = clusterer.fitTransform(docs);

    // The vector dimension count should match the vocabulary size
    expect(vectors[0].values.length).toBe(vectors[1].values.length);
    // Since "learning" appears in all 3 docs, its IDF = log(3/4) < 0
    // So at least one value should be non-zero (negative)
    const hasNonZero = vectors[0].values.some(val => val !== 0);
    expect(hasNonZero).toBe(true);
  });

  it('handles a single document', () => {
    const clusterer = new TextClusterer(42);
    const docs = [{ id: 'solo', text: 'advanced typescript patterns explained' }];
    const vectors = clusterer.fitTransform(docs);

    expect(vectors).toHaveLength(1);
    expect(vectors[0].id).toBe('solo');
    // With 1 doc, IDF = log(1/(1+1)) = log(0.5) < 0 for all terms
    expect(vectors[0].values.length).toBeGreaterThan(0);
  });

  it('returns vectors for documents with only stopwords/short words (empty tokens produce zero vectors)', () => {
    const clusterer = new TextClusterer(42);
    const docs = [
      { id: '1', text: 'the a an is are' },
      { id: '2', text: 'real content here about programming' },
    ];

    const vectors = clusterer.fitTransform(docs);
    expect(vectors).toHaveLength(2);
  });

  it('produces different vectors for documents with unique vocabularies given enough docs', () => {
    const clusterer = new TextClusterer(42);
    // With 4 docs, a term in 2 docs has idf = log(4/3) > 0 which is non-zero
    // and terms unique to 1 doc have idf = log(4/2) = log(2) > 0
    // This ensures vectors differ meaningfully
    const docs = [
      { id: '1', text: 'python tutorial programming basics fundamentals' },
      { id: '2', text: 'python advanced programming patterns design' },
      { id: '3', text: 'cooking recipe healthy food nutrition' },
      { id: '4', text: 'cooking meal preparation kitchen tips' },
    ];

    const vectors = clusterer.fitTransform(docs);

    // Vectors for doc 1 and doc 3 should differ (different topics)
    const different = vectors[0].values.some((v, i) => v !== vectors[2].values[i]);
    expect(different).toBe(true);
  });
});

describe('TextClusterer.kMeans', () => {
  it('assigns all points to a cluster (no -1 assignments)', () => {
    const clusterer = new TextClusterer(42);
    const docs = [
      { id: '1', text: 'python tutorial programming basics' },
      { id: '2', text: 'python advanced programming patterns' },
      { id: '3', text: 'cooking recipe healthy food nutrition' },
      { id: '4', text: 'cooking meal preparation kitchen tips' },
    ];

    const vectors = clusterer.fitTransform(docs);
    const assignments = clusterer.kMeans(vectors, 2);

    expect(assignments).toHaveLength(4);
    assignments.forEach(a => {
      expect(a.clusterId).toBeGreaterThanOrEqual(0);
      expect(a.clusterId).toBeLessThan(2);
    });
  });

  it('returns the correct number of assignments', () => {
    const clusterer = new TextClusterer(42);
    const docs = [
      { id: '1', text: 'apple banana cherry fruit salad' },
      { id: '2', text: 'soccer basketball football sports game' },
      { id: '3', text: 'mango pineapple watermelon fruit tropical' },
    ];

    const vectors = clusterer.fitTransform(docs);
    const assignments = clusterer.kMeans(vectors, 2);

    expect(assignments).toHaveLength(3);
    // All assignments should have a videoId matching original IDs
    expect(assignments.map(a => a.videoId).sort()).toEqual(['1', '2', '3']);
  });

  it('returns an empty array for empty input', () => {
    const clusterer = new TextClusterer(42);
    const assignments = clusterer.kMeans([], 3);
    expect(assignments).toEqual([]);
  });

  it('reduces k when k > number of vectors', () => {
    const clusterer = new TextClusterer(42);
    const docs = [
      { id: '1', text: 'interesting data science project' },
      { id: '2', text: 'another machine learning topic' },
    ];

    const vectors = clusterer.fitTransform(docs);
    // k=5 but only 2 vectors => k reduced to 2
    const assignments = clusterer.kMeans(vectors, 5);

    expect(assignments).toHaveLength(2);
    assignments.forEach(a => {
      expect(a.clusterId).toBeGreaterThanOrEqual(0);
      expect(a.clusterId).toBeLessThan(2); // Effective k = 2
    });
  });

  it('with k=1, all points are assigned to cluster 0', () => {
    const clusterer = new TextClusterer(42);
    const docs = [
      { id: '1', text: 'topic alpha example' },
      { id: '2', text: 'topic beta example' },
      { id: '3', text: 'topic gamma example' },
    ];

    const vectors = clusterer.fitTransform(docs);
    const assignments = clusterer.kMeans(vectors, 1);

    assignments.forEach(a => {
      expect(a.clusterId).toBe(0);
    });
  });

  it('produces deterministic results with the same seed', () => {
    const docs = [
      { id: '1', text: 'python tutorial programming basics fundamentals' },
      { id: '2', text: 'javascript react frontend development web' },
      { id: '3', text: 'cooking recipe healthy food nutrition diet' },
      { id: '4', text: 'baking cake dessert sweet sugar' },
    ];

    const clusterer1 = new TextClusterer(42);
    const vectors1 = clusterer1.fitTransform(docs);
    const result1 = clusterer1.kMeans(vectors1, 2);

    const clusterer2 = new TextClusterer(42);
    const vectors2 = clusterer2.fitTransform(docs);
    const result2 = clusterer2.kMeans(vectors2, 2);

    expect(result1.map(r => r.clusterId)).toEqual(result2.map(r => r.clusterId));
  });

  it('cluster IDs range from 0 to k-1', () => {
    const clusterer = new TextClusterer(42);
    const docs = [
      { id: '1', text: 'python programming basics tutorial beginner' },
      { id: '2', text: 'javascript web development react angular' },
      { id: '3', text: 'cooking recipe food kitchen nutrition' },
      { id: '4', text: 'baking bread dessert pastry sweet' },
      { id: '5', text: 'machine learning artificial intelligence data' },
      { id: '6', text: 'deep neural network model training' },
    ];

    const vectors = clusterer.fitTransform(docs);
    const assignments = clusterer.kMeans(vectors, 3);

    const uniqueClusters = new Set(assignments.map(a => a.clusterId));
    uniqueClusters.forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(3);
    });
  });
});
