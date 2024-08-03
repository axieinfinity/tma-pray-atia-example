import { Lockbox } from '@axieinfinity/lockbox'
import { LockboxClientError } from '@axieinfinity/lockbox/dist/types/common/error-client.js'
import { LockboxServiceEnv } from '@axieinfinity/lockbox/dist/types/common/lockbox-service.js'
import cryptoNode from 'crypto'
import { useEffect, useState } from 'react'
import { encodeFunctionData } from 'viem'
import { abi } from './abi'
import { MPC_ERROR, MPC_STATUS, useMPCStore } from './store'

const OIDC_CLIENT_ID = import.meta.env.VITE_OIDC_CLIENT_ID as string
const OIDC_CALLBACK_URL = import.meta.env.VITE_OIDC_CALLBACK_URL as string
const OIDC_CLIENT_SECRET = import.meta.env.VITE_OIDC_CLIENT_SECRET as string
const OIDC_TOKEN_ENDPOINT = import.meta.env.VITE_OIDC_TOKEN_ENDPOINT as string
const OIDC_AUTHORIZATION_ENDPOINT = import.meta.env.VITE_OIDC_AUTHORIZATION_ENDPOINT as string

const API_KEY = import.meta.env.VITE_API_KEY as string
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID as string)
const LOCKBOX_SERVICE_ENV = import.meta.env.VITE_LOCKBOX_SERVICE_ENV as LockboxServiceEnv

const PRAY_CONTRACT_ADDRESS = '0x973d3287cbf696f77f351c2785b2aac24503ca94'

export const generateRandomString = (length = 50) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }

  return result
}

export const base64UrlEncode = (input: string) => input.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

export const generateCodeChallenge = (codeVerifier: string) => {
  const codeChallenge = cryptoNode.createHash('sha256').update(codeVerifier).digest()
  const base64CodeChallenge = Buffer.from(codeChallenge).toString('base64')

  return base64UrlEncode(base64CodeChallenge)
}

export function useMpc() {
  const { setLockbox, setIsConnected, lockbox, setStatus, setError } = useMPCStore()
  const [params, setParams] = useState({ code: '', scope: '', state: '' })

  const exchangeToken = async (
    code: string,
    redirect_uri: string,
    code_verifier: string | null,
    authorization_method?: 'client_secret_basic' | 'client_secret_post',
  ) => {
    const headers: Record<string, string> = {
      'content-type': 'application/x-www-form-urlencoded',
      'x-api-key': API_KEY,
    }

    const body: Record<string, string> = {
      code,
      redirect_uri,
      grant_type: 'authorization_code',
    }

    switch (authorization_method) {
      case 'client_secret_basic':
        headers.Authorization = `Basic ${btoa(`${OIDC_CLIENT_ID}:${OIDC_CLIENT_SECRET}`)}`
        headers.token_endpoint_auth_method = authorization_method
        break
      default:
        body.client_id = OIDC_CLIENT_ID
        body.client_secret = OIDC_CLIENT_SECRET
    }

    if (code_verifier) {
      body.code_verifier = code_verifier
    }

    const response = await fetch(OIDC_TOKEN_ENDPOINT, {
      method: 'POST',
      headers,
      body: new URLSearchParams(body).toString(),
    })

    if (!response.ok) {
      throw new Error(`Error fetching token: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  }

  const loginWithAS = () => {
    const codeVerifier = generateRandomString()
    const codeChallenge = generateCodeChallenge(codeVerifier)

    localStorage.setItem('code_verifier', codeVerifier)

    const loginOptions = {
      response_type: 'code',
      request_type: 'login',
      scope: 'openid',
      client_id: OIDC_CLIENT_ID,
      redirect_uri: OIDC_CALLBACK_URL,
      remember: 'true',
      state: crypto.randomUUID(),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    }

    const url = new URL(OIDC_AUTHORIZATION_ENDPOINT)
    url.search = new URLSearchParams(loginOptions).toString()

    window.location.replace(url)
  }

  const getQueryParams = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code') || null
    const scope = urlParams.get('scope') || null
    const state = urlParams.get('state') || null

    if (code && scope && state) setParams({ code, scope, state })
  }

  useEffect(() => {
    getQueryParams()

    window.addEventListener('popstate', getQueryParams)

    return () => {
      window.removeEventListener('popstate', getQueryParams)
    }
  }, [])

  useEffect(() => {
    if (params.code && params.scope && params.state) {
      const codeVerifier = localStorage.getItem('code_verifier')

      exchangeToken(params.code, OIDC_CALLBACK_URL, codeVerifier)
        .then((data) => {
          createLockbox(data.access_token)
        })
        .catch((error) => {
          console.log('Error exchanging token', error)
        })
    }
  }, [params])

  const createLockbox = async (accessToken: string) => {
    try {
      const lockbox = Lockbox.init({
        chainId: CHAIN_ID,
        accessToken,
        serviceEnv: LOCKBOX_SERVICE_ENV,
      })
      setLockbox(lockbox)

      const password = 'placeholder-password'

      try {
        setStatus(MPC_STATUS.LOADING)
        const backupClientShard = await lockbox.getBackupClientShard()
        const clientShard = await lockbox.decryptClientShard(backupClientShard.key, password)
        lockbox.setClientShard(clientShard)

        setIsConnected(true)
        setStatus(MPC_STATUS.IDLE)
        return
      } catch (error) {
        if ((error as LockboxClientError).code === 5) {
          setStatus(MPC_STATUS.CREATING)

          const shardData = await lockbox.genMpc()
          const encryptedClientShard = await lockbox.encryptClientShard(password, password.length)

          try {
            await lockbox.backupClientShard(encryptedClientShard.encryptedKey)
            lockbox.setClientShard(shardData.key)

            setIsConnected(true)
            setStatus(MPC_STATUS.IDLE)
          } catch (error) {
            setError(MPC_ERROR.BACKUP)
            setStatus(MPC_STATUS.ERROR)
          }
        } else {
          setError(MPC_ERROR.CREATE)
          setStatus(MPC_STATUS.ERROR)
        }
      }
    } catch (error) {
      setError(MPC_ERROR.CREATE)
      setStatus(MPC_STATUS.ERROR)
    }
  }

  const claimReward = async () => {
    if (!lockbox) {
      return
    }
    const data = encodeFunctionData({
      abi: abi,
      functionName: 'claimReward',
    })

    try {
      const hash = await lockbox.sendTransaction({
        to: PRAY_CONTRACT_ADDRESS,
        data,
        type: '0x64',
      })

      return hash
    } catch (error) {
      console.log('Error sending transaction', error)
      setError(MPC_ERROR.SEND)
      throw error
    }
  }

  return {
    createLockbox,
    claimReward,
    loginWithAS,
  }
}
