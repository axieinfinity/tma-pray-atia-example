import type { Lockbox } from '@axieinfinity/lockbox'
import { create } from 'zustand'

export enum MPC_STATUS {
  IDLE = 'idle',
  LOADING = 'loading',
  CREATING = 'creating',
  ERROR = 'error',
}

export enum MPC_ERROR {
  NONE = '',
  BACKUP = 'Error backing up client shard',
  CREATE = 'Error creating lockbox',
  SEND = 'Error sending transaction',
}

interface MPCState {
  lockbox: Lockbox | undefined
  setLockbox: (lockbox: Lockbox) => void

  isConnected: boolean
  setIsConnected: (isConnected: boolean) => void

  status: MPC_STATUS
  setStatus: (status: MPC_STATUS) => void

  error: MPC_ERROR
  setError: (error: MPC_ERROR) => void
}

export const useMPCStore = create<MPCState>()((set) => ({
  lockbox: undefined,
  setLockbox: (lockbox: Lockbox) => set({ lockbox }),

  isConnected: false,
  setIsConnected: (isConnected: boolean) => set({ isConnected }),

  status: MPC_STATUS.IDLE,
  setStatus: (status: MPC_STATUS) => set({ status }),

  error: MPC_ERROR.NONE,
  setError: (error: MPC_ERROR) => set({ error }),
}))
