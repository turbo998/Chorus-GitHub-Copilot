export interface ContextProvider {
  name: string;
  provide(): Promise<string | null>;
}
