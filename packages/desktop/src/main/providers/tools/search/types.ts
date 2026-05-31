import type { Api, Model } from '@earendil-works/pi-ai';

export type SearchModel = Model<Api>;

export type JsonRecord = Record<string, unknown>;

export type WebSearchProvider = 'anthropic' | 'google' | 'openai';

export interface SseEvent {
  data: unknown;
  event: string;
}

export interface SearchSource {
  url: string;
  title: string;
}

export interface SearchResult {
  text: string;
  model: string;
  grounded: boolean;
  resultCount: number;
  sources: SearchSource[];
  searchQueries: string[];
  provider: WebSearchProvider;
}

export type SearchAuth =
  | {
      ok: true;
      apiKey?: string;
      headers?: Record<string, string>;
    }
  | {
      ok: false;
      error: string;
    };
