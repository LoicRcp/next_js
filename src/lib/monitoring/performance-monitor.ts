export interface MetricEvent {
  timestamp: number;
  type: 'request' | 'tool_call' | 'error' | 'success';
  duration?: number;
  model?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  error?: string;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: MetricEvent[] = [];
  private maxMetrics = 1000;

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  /**
   * Enregistre une métrique
   */
  record(event: Omit<MetricEvent, 'timestamp'>): void {
    this.metrics.push({
      ...event,
      timestamp: Date.now()
    });

    // Limiter la taille du buffer
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Obtient les métriques pour une période donnée
   */
  getMetrics(since?: number): MetricEvent[] {
    if (!since) {
      return [...this.metrics];
    }
    return this.metrics.filter(m => m.timestamp >= since);
  }

  /**
   * Calcule les statistiques
   */
  getStats(timeRange: '1h' | '24h' | 'all' = '1h'): {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    totalTokens: number;
    errorRate: number;
    modelUsage: Record<string, number>;
  } {
    const now = Date.now();
    const ranges = {
      '1h': 3600000,
      '24h': 86400000,
      'all': Infinity
    };

    const since = now - ranges[timeRange];
    const relevantMetrics = this.getMetrics(since);

    const requests = relevantMetrics.filter(m => m.type === 'request');
    const successes = relevantMetrics.filter(m => m.type === 'success');
    const errors = relevantMetrics.filter(m => m.type === 'error');

    const totalTokens = relevantMetrics
      .filter(m => m.tokens)
      .reduce((sum, m) => sum + (m.tokens?.total || 0), 0);

    const avgResponseTime = requests.length > 0
      ? requests.reduce((sum, r) => sum + (r.duration || 0), 0) / requests.length
      : 0;

    const modelUsage: Record<string, number> = {};
    relevantMetrics.forEach(m => {
      if (m.model) {
        modelUsage[m.model] = (modelUsage[m.model] || 0) + 1;
      }
    });

    return {
      totalRequests: requests.length,
      successRate: requests.length > 0 ? successes.length / requests.length : 0,
      avgResponseTime: Math.round(avgResponseTime),
      totalTokens,
      errorRate: requests.length > 0 ? errors.length / requests.length : 0,
      modelUsage
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const monitor = PerformanceMonitor.getInstance();