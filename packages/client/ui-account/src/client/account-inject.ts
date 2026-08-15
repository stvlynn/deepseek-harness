import type { HostDescriptionSource } from '@deepseek-ai/dsh-client-connection/client'

/** Registration-side Host account facts shared by the overlay and the menu. */
export interface AccountInjected {
  /** Whether the browser itself is connected over loopback. */
  isLoopback: boolean
  hooks: {
    /** Current generation's Host description, bound by the slot renderer. */
    hostDescription: HostDescriptionSource
  }
}
