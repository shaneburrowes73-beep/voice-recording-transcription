interface ArtifactConfig {
  name: string;
  type: string;
  url: string;
  description?: string;
  metadata?: Record<string, any>;
}

export async function registerArtifact(config: ArtifactConfig) {
  try {
    const dashboardApiUrl =
      process.env.NEXT_PUBLIC_DASHBOARD_API_URL ||
      'https://ai-solutions-beryl-eight.vercel.app/api/artifacts';

    const response = await fetch(dashboardApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...config,
        metadata: {
          ...config.metadata,
          registeredAt: new Date().toISOString(),
          status: 'beta',
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Failed to register artifact:', data.error);
      return null;
    }
    console.log('✅ Artifact registered:', data.data?.id);
    return data.data;
  } catch (error) {
    console.error('Error registering artifact:', error);
    return null;
  }
}
