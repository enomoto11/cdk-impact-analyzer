export interface ApiSettings {
  throttleRps: number;
}

export function buildApiSettings(): ApiSettings {
  return { throttleRps: 100 };
}
