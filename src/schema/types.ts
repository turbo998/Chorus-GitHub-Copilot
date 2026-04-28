export interface ToolDefinition {
  name: string;
  module: 'public' | 'developer' | 'session' | 'pm' | 'admin' | 'presence';
  displayName: string;
  description: string;
  modelDescription: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
  confirmationRequired?: boolean;
}
