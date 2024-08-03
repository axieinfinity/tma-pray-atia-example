import { AnimatePresence, motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import { MPC_STATUS, useMPCStore } from './store'
import { useMpc } from './use-mpc'

const trimAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function App() {
  const { isConnected, lockbox, status } = useMPCStore()
  const { loginWithAS, claimReward } = useMpc()
  const [address, setAddress] = useState<string | null>('')
  const [balance, setBalance] = useState<number>(0)
  const [count, setCount] = useState(0)

  const [claimable, setClaimable] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)

  const fetchInfo = async () => {
    if (!lockbox || !isConnected) return

    const addresses = await lockbox.getProvider().request<string[]>({ method: 'eth_accounts' })
    const balances = await lockbox.getProvider().request<string>({ method: 'eth_getBalance', params: [addresses[0] as `0x${string}`, 'latest'] })

    setAddress(addresses[0])
    setBalance(Number((Number(balances) / 1e18).toFixed(2)))
  }

  const login = async () => {
    loginWithAS()
  }

  useEffect(() => {
    fetchInfo()
  }, [lockbox, isConnected])

  useEffect(() => {
    if (address && count > 1 && count % 10 === 0) {
      setClaimable(true)
    }
  }, [count])

  const claim = async () => {
    setIsClaiming(true)

    try {
      await claimReward()
      setBalance((prev) => prev + 0.5)
    } catch (error) {
      console.log('Error claiming reward', error)
    }

    setIsClaiming(false)
    setClaimable(false)
  }

  const pray = () => {
    setCount((prev) => prev + 1)
  }

  return (
    <main className='w-screen overflow-hidden relative h-screen flex items-center justify-center'>
      <div className='pointer-events-none absolute top-0 left-0 z-10 h-screen w-screen bg-vignette' />
      <div className='bg-[url("./assets/background.png")] w-full h-full bg-center bg-cover absolute inset-0' />

      <AnimatePresence>
        {claimable ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='overlay' /> : null}
      </AnimatePresence>

      <motion.figure layoutId='atia' className='relative z-0 bottom-[80px] w-[200px] h-[200px] active:scale-95 ' onClick={pray}>
        <img src='element-atia.png' alt='Atia' className='bottom-[0px]' />
      </motion.figure>

      <AnimatePresence mode='wait'>
        {claimable && (
          <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.05 } }}
            className=' absolute z-20 bg-[#91582A] w-[350px] h-[480px] rounded-2xl border-[#362D1B] border-2 flex items-center flex-col'>
            <motion.figure layoutId='atia' className='w-[200px] h-[200px] active:scale-95 mt-4' onClick={pray}>
              <img src='element-atia.png' alt='Atia' className='bottom-[0px]' />
            </motion.figure>

            <motion.span
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className='text-[#F7DAB2] text-xl mt-7'>
              Atia Bless you
            </motion.span>

            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className='flex gap-2 items-center mr-5 justify-center mt-5'>
              <img src='icon-ron.png' alt='image' className='w-12 h-12' />
              <span className='text-[#F7DAB2] text-[40px]'>0.5</span>
            </motion.div>

            {isClaiming ? (
              <motion.img src='puff-loading.png' className='h-[80px] animate-spin w-auto mt-7' />
            ) : (
              <motion.img
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.05 } }}
                src='btn-claim.png'
                alt='login'
                className='h-[60px] w-auto mt-10'
                onClick={claim}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div />
      {address && (
        <div className='absolute z-10 top-10 h-[50px]'>
          <div className='relative h-[70px]'>
            <img src='panel-count.png' alt='login' className='h-full w-auto' />
            <span className='absolute font-custom text-[#F7DAB2] left-1/2 top-1/2 -translate-x-1/2 text-3xl -translate-y-1/2'>{count}</span>
          </div>
        </div>
      )}

      <div className='absolute z-10 bottom-20 h-[60px]'>
        {status === MPC_STATUS.IDLE ? (
          <>
            {!address ? (
              <img src='btn-login.png' alt='login' className='h-full w-auto' onClick={login} />
            ) : (
              <div className='flex flex-col gap-2'>
                <div className='relative h-[60px]'>
                  <img src='panel-address.png' alt='login' className='h-full w-auto' />
                  <span className='absolute text-[#FFFABA] text-2xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'>{trimAddress(address)}</span>
                </div>

                <div className='relative h-[60px]'>
                  <img src='panel-address.png' alt='login' className='h-full w-auto' />
                  <span className='absolute text-[#FFFABA] text-2xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'>{balance} RON</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <motion.img src='puff-loading.png' className='h-[80px] animate-spin w-auto mt-7' />
        )}
      </div>
    </main>
  )
}

export default App
