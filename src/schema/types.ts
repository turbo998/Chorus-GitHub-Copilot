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

export function tool(
  name: string,
  module: ToolDefinition['module'],
  description: string,
  properties: Record<string, { type: string; description: string }>,
  required?: string[],
  opts?: { confirmationRequired?: boolean }
): ToolDefinition {
  return {
    name,
    module,
    displayName: name.replace(/^chorus_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description,
    modelDescription: description,
    inputSchema: { type: 'object' as const, properties, ...(required?.length ? { required } : {}) },
    ...opts,
  };
}
