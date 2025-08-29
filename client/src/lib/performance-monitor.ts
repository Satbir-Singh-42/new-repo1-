// Performance monitoring utilities for SolarScope AI

interface PerformanceMetrics {
  component: string;
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100; // Keep only last 100 metrics

  startTimer(component: string, operation: string): () => void {
    const startTime = performance.now();
    
    return (success: boolean = true, error?: string) => {
      const duration = performance.now() - startTime;
      
      this.addMetric({
        component,
        operation,
        duration,
        timestamp: Date.now(),
        success,
        error
      });
      
      // Log slow operations (>2 seconds)
      if (duration > 2000) {
        console.warn(`Slow operation detected: ${component}.${operation} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the last maxMetrics entries
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageTime(component?: string, operation?: string): number {
    const filteredMetrics = this.metrics.filter(m => 
      (!component || m.component === component) &&
      (!operation || m.operation === operation) &&
      m.success
    );
    
    if (filteredMetrics.length === 0) return 0;
    
    const total = filteredMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / filteredMetrics.length;
  }

  getSlowOperations(threshold: number = 1000): PerformanceMetrics[] {
    return this.metrics.filter(m => m.duration > threshold);
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  // Memory usage monitoring
  checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1048576;
      const totalMB = memory.totalJSHeapSize / 1048576;
      const limitMB = memory.jsHeapSizeLimit / 1048576;
      
      console.log(`Memory: ${usedMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB (limit: ${limitMB.toFixed(2)}MB)`);
      
      // Warn if memory usage is high
      if (usedMB > limitMB * 0.8) {
        console.warn('High memory usage detected. Consider clearing cached data.');
      }
    }
  }

  // Storage usage monitoring
  checkStorageUsage(): void {
    try {
      let totalSize = 0;
      for (let key in sessionStorage) {
        if (sessionStorage.hasOwnProperty(key)) {
          totalSize += sessionStorage[key].length;
        }
      }
      
      const sizeMB = totalSize / 1048576;
      console.log(`SessionStorage usage: ${sizeMB.toFixed(2)}MB`);
      
      // Warn if storage is getting full (assuming 5MB quota)
      if (sizeMB > 4) {
        console.warn('SessionStorage is nearly full. Consider cleaning up old data.');
      }
    } catch (error) {
      console.error('Failed to check storage usage:', error);
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export function measureTime(component: string, operation: string) {
  return performanceMonitor.startTimer(component, operation);
}

export function checkSystemHealth() {
  performanceMonitor.checkMemoryUsage();
  performanceMonitor.checkStorageUsage();
  
  const slowOps = performanceMonitor.getSlowOperations();
  if (slowOps.length > 0) {
    console.warn(`Found ${slowOps.length} slow operations in recent history`);
  }
}

// Auto-check system health every 5 minutes
setInterval(checkSystemHealth, 5 * 60 * 1000);