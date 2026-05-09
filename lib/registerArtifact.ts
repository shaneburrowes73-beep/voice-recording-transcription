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
