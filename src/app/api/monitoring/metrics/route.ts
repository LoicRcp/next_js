import { NextResponse } from 'next/server';
import { monitor } from '@/lib/monitoring/performance-monitor';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const timeRange = searchParams.get('range') as '1h' | '24h' | 'all' || '1h';
  
  const stats = monitor.getStats(timeRange);
  
  return NextResponse.json({
    timeRange,
    stats,
    health: calculateHealthScore(stats),
    recommendations: generateRecommendations(stats)
  });
}

function calculateHealthScore(stats: any): {
  score: number;
  status: 'healthy' | 'warning' | 'critical';
} {
  let score = 100;
  
  // Pénaliser pour taux d'erreur élevé
  if (stats.errorRate > 0.1) score -= 30;
  else if (stats.errorRate > 0.05) score -= 15;
  
  // Pénaliser pour temps de réponse lent
  if (stats.avgResponseTime > 5000) score -= 20;
  else if (stats.avgResponseTime > 3000) score -= 10;
  
  // Pénaliser pour taux de succès faible
  if (stats.successRate < 0.9) score -= 25;
  else if (stats.successRate < 0.95) score -= 10;
  
  return {
    score: Math.max(0, score),
    status: score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'critical'
  };
}

function generateRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  if (stats.errorRate > 0.05) {
    recommendations.push('High error rate detected. Check logs for recurring issues.');
  }
  
  if (stats.avgResponseTime > 3000) {
    recommendations.push('Response times are slow. Consider optimizing maxSteps or using caching.');
  }
  
  if (stats.totalTokens > 100000) {
    recommendations.push('High token usage. Consider implementing response caching.');
  }
  
const modelUsageEntries = Object.entries(stats.modelUsage) as [string, number][];
if (modelUsageEntries.length > 1) {
  const [primaryModel] = modelUsageEntries.sort(
    (a, b) => b[1] - a[1]
  );
  recommendations.push(`Multiple models in use. Primary: ${primaryModel[0]}`);
}
  
  return recommendations;
}