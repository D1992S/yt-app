import { repo } from '../db/repo';
import { TextClusterer, getTopWords } from '@insight/ml';
import { GuardedLLMProvider } from '../llm/guard';
import { GoogleGenAIProvider, LocalStubProvider, CLUSTER_NAMING_PROMPT } from '@insight/llm';

export class TopicEngine {
  private llm: GuardedLLMProvider;

  constructor() {
    const apiKey = process.env.API_KEY;
    const baseProvider = apiKey ? new GoogleGenAIProvider(apiKey) : new LocalStubProvider();
    this.llm = new GuardedLLMProvider(baseProvider);
  }

  async runClustering() {
    console.log('[TopicEngine] Starting clustering...');
    
    // 1. Fetch Data
    const allVideos = repo.getAllVideoTitles() as { video_id: string; title: string; type: string }[];
    if (allVideos.length < 5) {
      console.log('[TopicEngine] Not enough videos to cluster.');
      return;
    }

    // 2. ML Clustering
    const clusterer = new TextClusterer();
    const vectors = clusterer.fitTransform(allVideos.map(v => ({ id: v.video_id, text: v.title })));
    
    const k = Math.max(3, Math.floor(Math.sqrt(allVideos.length / 2)));
    const assignments = clusterer.kMeans(vectors, k);

    // 3. Save Results
    repo.clearTopicClusters();

    const clusters = new Map<number, string[]>();
    assignments.forEach(a => {
      if (!clusters.has(a.clusterId)) clusters.set(a.clusterId, []);
      const video = allVideos.find(v => v.video_id === a.videoId);
      if (video) clusters.get(a.clusterId)?.push(video.title);
    });

    for (const [clusterId, titles] of clusters.entries()) {
      // Deterministic Fallback
      let name = getTopWords(titles, 3);
      let description = `Cluster containing ${titles.length} videos.`;

      // LLM Enhancement (Optional)
      if (process.env.API_KEY) {
        try {
          const prompt = `Titles: ${titles.slice(0, 10).join(', ')}`;
          const result = await this.llm.generateJson<{name: string, description: string}>(prompt, undefined, CLUSTER_NAMING_PROMPT);
          name = result.name;
          description = result.description;
        } catch (e) {
          console.warn('[TopicEngine] LLM naming failed, using fallback.', e);
        }
      }

      const dbClusterId = repo.saveTopicCluster(name, description);
      
      assignments
        .filter(a => a.clusterId === clusterId)
        .forEach(a => repo.saveTopicMembership(a.videoId, dbClusterId));

      // Gap Analysis
      const clusterVideoIds = new Set(assignments.filter(a => a.clusterId === clusterId).map(a => a.videoId));
      let userCount = 0;
      let compCount = 0;
      
      allVideos.forEach(v => {
        if (clusterVideoIds.has(v.video_id)) {
          if (v.type === 'user') userCount++;
          else compCount++;
        }
      });

      const total = userCount + compCount;
      if (total > 0) {
        const compRatio = compCount / total;
        if (compRatio > 0.7 && total >= 3) {
          repo.saveTopicGap(dbClusterId, compRatio * 10, `Competitors own ${Math.round(compRatio * 100)}% of this topic.`);
        }
      }
    }
    
    console.log('[TopicEngine] Clustering complete.');
  }
}

export const topicEngine = new TopicEngine();
