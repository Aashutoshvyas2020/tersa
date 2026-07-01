export type DiscoverySignal =
  | string
  | {
      type: string
      [key: string]: unknown
    }
