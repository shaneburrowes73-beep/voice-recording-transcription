```typescript
interface ArtifactConfig {
  name: string;
  type: string;
  url: string;
  description?: string;
  metadata?: Record<string, any>;
}
