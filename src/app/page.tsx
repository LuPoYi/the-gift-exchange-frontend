'use client'

import { useEffect, useState } from 'react'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import GiftCard from '@/components/GiftCard'
import { Notifications } from '@/components/Notifications'
import {
  amount,
  erc20ABI,
  giftExchangeContractABI,
  giftExchangeContractAddress,
  selectTokenOptions,
  supportedTokenAddresses,
} from '../constants'
import { parseUnits } from 'viem'
import toast from 'react-hot-toast'
import { truncateString } from '@/utils'
import { useClientMediaQuery } from '@/hooks/useClientMediaQuery'
import useErc20Info from '@/hooks/useErc20Info'
import usePoolInfo from '@/hooks/usePoolInfo'
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { wagmiConfig } from './providers'

export default function Home() {
  const isMobile = useClientMediaQuery('(max-width: 600px)')
  const { data: hash, isPending, variables, writeContract } = useWriteContract()
  const { functionName } = variables || {}

  const [selectedToken, setSelectedToken] = useState(supportedTokenAddresses[0])
  const [isEnoughAllowance, setIsEnoughAllowance] = useState(false)

  const { erc20Infos } = useErc20Info(supportedTokenAddresses)
  const { amount: balance, symbol, allowance, decimals } = erc20Infos?.[selectedToken] || {}

  const { players, pools } = usePoolInfo()

  const handleApprove = async () => {
    if (!selectedToken || !erc20Infos || !decimals) return

    try {
      writeContract({
        abi: erc20ABI,
        address: selectedToken as `0x${string}`,
        functionName: 'approve',
        args: [giftExchangeContractAddress, parseUnits(amount, decimals)],
      })
    } catch (error) {
      console.error('Error approving tokens:', error)
    }
  }

  const handleSubmit = async () => {
    if (!selectedToken) return

    try {
      writeContract({
        abi: giftExchangeContractABI,
        address: giftExchangeContractAddress as `0x${string}`,
        functionName: 'play',
        args: [selectedToken as `0x${string}`],
      })
    } catch (error) {
      console.error('Error submit:', error)
    }
  }

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  // Check is approve enable
  useEffect(() => {
    if (!selectedToken || !erc20Infos) return

    setIsEnoughAllowance(allowance! >= Number(amount))
  }, [selectedToken, allowance, erc20Infos])

  // Toast
  useEffect(() => {
    if (!functionName || !hash) return

    if (functionName === 'approve') {
      if (isConfirming) {
        toast.loading(`Approving TX: ${hash} ...`)
      } else {
        toast.dismiss()
        toast(`Approved TX: ${hash}`, { icon: '👏' })
      }
    } else if (functionName === 'play') {
      if (isConfirming) {
        toast.loading(`Confirming TX: ${hash} ...`)
      } else {
        toast.dismiss()
        toast(`Confirmed TX: ${hash}`, { icon: '👏' })
      }
    }
  }, [functionName, hash, isConfirming])

  const isEnoughBalance = Number(balance) >= Number(amount)
  const isSendDisable = !isEnoughAllowance || !isEnoughBalance

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-18">
      <h1 className="text-4xl font-bold">The Gift Exchange</h1>
      <div className="py-4">
        <ConnectButton />
      </div>

      {/* Form */}
      <div className="bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-md">
        <form className="space-y-5">
          <div className="space-y-1">
            <label className="block text-sm font-medium">Token</label>
            <select
              className="select bg-info-content w-full"
              value={selectedToken}
              onChange={(e: any) => setSelectedToken(e.target.value)}
            >
              {selectTokenOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="number" className="block text-sm font-medium relative">
              Amount {`${balance} ${symbol}`}
              {erc20Infos && (
                <span className="absolute right-0 text-right text-sm font-medium ">
                  {`(allowance: ${allowance})`}
                </span>
              )}
            </label>
            <input
              type="number"
              name="number"
              id="number"
              value={amount}
              disabled={true}
              className="mt-1 block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md py-3 px-4"
            />
          </div>
          <div className="flex justify-between gap-3">
            <button
              type="button"
              disabled={!selectedToken || isEnoughAllowance}
              onClick={handleApprove}
              className="btn btn-info flex-1"
            >
              {isPending ? (
                <span className="loading loading-dots loading-lg"></span>
              ) : symbol ? (
                `Approve ${amount} ${symbol}`
              ) : (
                `Approve`
              )}
            </button>
            <button
              type="button"
              disabled={!selectedToken || isSendDisable}
              onClick={handleSubmit}
              className="btn btn-outline btn-info flex-1"
            >
              {isPending ? <span className="loading loading-dots loading-lg"></span> : 'Send'}
            </button>
          </div>
        </form>
      </div>

      {/* Prize Pools & Waiting List */}
      <div className="mx-auto max-w-4xl space-y-4 pt-4">
        <div>
          <div className="text-4xl mb-4">Prize Pools</div>
          <div className="flex flex-wrap md:gap-4 gap-y-4">
            {pools?.map((pool, index) => (
              <div key={index} className="w-full md:w-64">
                <GiftCard index={index} pool={pool} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="text-4xl w-full">Waiting List</div>
          <div className="p-4 bg-zinc-800 rounded-lg w-8/12">
            {players?.map((player, i) => (
              <div key={i} className="w-11/12 text-ellipsis overflow-hidden whitespace-nowrap">
                {isMobile ? truncateString(player) : player}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Notifications />
    </main>
  )
}
