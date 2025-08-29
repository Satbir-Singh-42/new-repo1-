import type { InstallationResult, FaultResult } from "@shared/schema";

// Real AI analysis functions using Gemini API
export async function analyzeInstallation(imagePath: string): Promise<InstallationResult> {
  const response = await fetch('/api/ai/analyze-installation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imagePath }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze installation');
  }

  return response.json();
}

export async function analyzeFaults(imagePath: string): Promise<FaultResult> {
  const response = await fetch('/api/ai/analyze-faults', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imagePath }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze faults');
  }

  return response.json();
}


