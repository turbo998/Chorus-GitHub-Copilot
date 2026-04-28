import { ContextProvider } from './types.js';

export class ContextBuilder {
  private providers: ContextProvider[] = [];

  addProvider(provider: ContextProvider): this {
    this.providers.push(provider);
    return this;
  }

  async build(): Promise<string> {
    const sections: string[] = [];
    for (const provider of this.providers) {
      const result = await provider.provide();
      if (result !== null) {
        sections.push(`[${provider.name}]\n${result}`);
      }
    }
    return sections.join('\n\n');
  }
}
