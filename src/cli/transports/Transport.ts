import type { StdoutMessage } from '../../entrypoints/sdk/controlTypes.js'

export interface Transport {
  connect(): Promise<void>
  setOnData(callback: (data: string) => void): void
  setOnClose(callback: (closeCode?: number) => void): void
  write(message: StdoutMessage): Promise<void>
  close(): void
}
