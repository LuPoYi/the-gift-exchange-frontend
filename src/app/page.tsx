"use client"

import { useEffect, useState } from "react"

import { ConnectButton } from "@rainbow-me/rainbowkit"
import {
  Erc20InfoType,
  PoolStateType,
  amount,
  erc20ABI,
  giftExchangeContractABI,
  giftExchangeContractAddress,
  selectTokenOptions,
  supportedTokenAddresses,
  tokenAAddress,
  tokenBAddress,
  tokenCAddress,
  tokenDAddress,
} from "../constants"
import GiftCard from "@/components/GiftCard"
import { Notifications } from "@/components/Notifications"
import { formatUnits, parseUnits } from "viem"
import { readContracts, watchBlockNumber } from "@wagmi/core"
import toast, { Toaster } from "react-hot-toast"
import { truncateString } from "@/utils"
import {
  useAccount,
  useBalance,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"
import { useClientMediaQuery } from "@/hooks/useClientMediaQuery"
import { wagmiConfig } from "./providers"

export default function Home() {
  const { address } = useAccount()
  const isMobile = useClientMediaQuery("(max-width: 600px)")
  const { data: hash, isPending, writeContract } = useWriteContract()

  const [players, setPlayers] = useState<string[]>()
  const [pools, setPools] = useState<PoolStateType[]>()
  const [erc20InfoMap, setErc20InfoMap] =
    useState<Record<string, Erc20InfoType>>()

  // Form Related State
  const [selectedToken, setSelectedToken] = useState(supportedTokenAddresses[0])
  const [isEnoughAllowance, setIsEnoughAllowance] = useState(false)

  const { data: tokenA } = useBalance({ address, token: tokenAAddress })
  const { data: tokenB } = useBalance({ address, token: tokenBAddress })
  const { data: tokenC } = useBalance({ address, token: tokenCAddress })
  const { data: tokenD } = useBalance({ address, token: tokenDAddress })

  const accountBalances: Record<string, Record<string, string>> = {
    ...(tokenA && {
      [tokenAAddress]: {
        symbol: tokenA.symbol,
        amount: formatUnits(tokenA.value, tokenA.decimals),
      },
    }),
    ...(tokenB && {
      [tokenBAddress]: {
        symbol: tokenB.symbol,
        amount: formatUnits(tokenB.value, tokenB.decimals),
      },
    }),
    ...(tokenC && {
      [tokenCAddress]: {
        symbol: tokenC.symbol,
        amount: formatUnits(tokenC.value, tokenC.decimals),
      },
    }),
    ...(tokenD && {
      [tokenDAddress]: {
        symbol: tokenD.symbol,
        amount: formatUnits(tokenD.value, tokenD.decimals),
      },
    }),
  }
  const { amount: balance } = accountBalances?.[selectedToken] || {}
  const { symbol, allowance } = erc20InfoMap?.[selectedToken] || {}

  const handleApprove = async () => {
    if (!selectedToken || !erc20InfoMap) return

    try {
      writeContract({
        abi: erc20ABI,
        address: selectedToken as `0x${string}`,
        functionName: "approve",
        args: [
          giftExchangeContractAddress,
          parseUnits(amount, erc20InfoMap[selectedToken].decimals),
        ],
      })
    } catch (error) {
      console.error("Error approving tokens:", error)
    }
  }

  const handleSubmit = async () => {
    if (!selectedToken) return

    try {
      writeContract({
        abi: giftExchangeContractABI,
        address: giftExchangeContractAddress as `0x${string}`,
        functionName: "play",
        args: [selectedToken as `0x${string}`],
      })
    } catch (error) {
      console.error("Error submit:", error)
    }
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    })

  // ----- fetch pool information -----
  useEffect(() => {
    return watchBlockNumber(wagmiConfig, {
      onBlockNumber() {
        const fetchContract = async () => {
          const contractResp = await readContracts(wagmiConfig, {
            contracts: [0, 1, 2].flatMap((poolId) =>
              ["players", "prizeTokenInfos"].map((functionName) => ({
                address: giftExchangeContractAddress,
                abi: giftExchangeContractABI,
                functionName,
                args: [poolId],
              }))
            ),
          })

          let _players: string[] = []
          let _pools: PoolStateType[] = []
          for (let i = 0; i < 6; i += 2) {
            const playerAddress = contractResp[i].result?.toString() || ""

            const [tokenAddress, decimals, symbol, amount] =
              (contractResp[i + 1]?.result as unknown as any[])?.map((item) =>
                item.toString()
              ) || []

            _players.push(playerAddress)
            _pools.push({
              tokenAddress,
              decimals: Number(decimals),
              symbol,
              amount,
            })
          }

          setPlayers(_players)
          setPools(_pools)
        }

        fetchContract()
      },
    })
  }, [])

  // ----- fetch erc20 Info (allowance) -----
  useEffect(() => {
    return watchBlockNumber(wagmiConfig, {
      onBlockNumber() {
        const fetchErc20Info = async () => {
          const contractResp = await readContracts(wagmiConfig, {
            contracts: supportedTokenAddresses.flatMap((tokenAddress) => [
              {
                address: tokenAddress as `0x{string}`,
                abi: erc20ABI,
                functionName: "decimals",
              },
              {
                address: tokenAddress as `0x{string}`,
                abi: erc20ABI,
                functionName: "symbol",
              },
              {
                address: tokenAddress as `0x{string}`,
                abi: erc20ABI,
                functionName: "allowance",
                args: [address as `0x{string}`, giftExchangeContractAddress],
              },
            ]),
          })

          const _erc20InfoMap: Record<string, Erc20InfoType> = {}
          for (const [i, tokenAdress] of supportedTokenAddresses.entries()) {
            const decimals = Number(contractResp[i * 3].result)

            _erc20InfoMap[tokenAdress] = {
              decimals,
              symbol: contractResp[i * 3 + 1].result?.toString() || "",
              allowance: Number(
                formatUnits(contractResp[i * 3 + 2].result as bigint, decimals)
              ),
            }
          }

          setErc20InfoMap(_erc20InfoMap)
        }

        fetchErc20Info()
      },
    })
  })

  // Check is approve enable
  useEffect(() => {
    if (!selectedToken || !erc20InfoMap) return

    setIsEnoughAllowance(
      erc20InfoMap[selectedToken].allowance >= Number(amount)
    )
  }, [selectedToken, allowance])

  const isEnoughBalance = Number(balance) >= Number(amount)
  const isSendDisable = !isEnoughAllowance || !isEnoughBalance
  const notify = () => toast("Wow so easy!")

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-18">
      <h1 className="text-4xl font-bold">The Gift Exchange</h1>
      <div className="py-4">
        <ConnectButton />
      </div>
      {isPending ? "Pending" : "Done"}
      {isConfirming ? "Confirming" : "Done"}
      {isConfirmed ? "isConfirmed" : "Done"}
      {/* Form */}
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <form className="space-y-5">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Token
            </label>
            <select
              className="select select-info w-full"
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
            <label
              htmlFor="number"
              className="block text-sm font-medium text-gray-700 relative"
            >
              Amount {`${balance} ${symbol}`}
              {erc20InfoMap && (
                <span className="absolute right-0 text-right text-sm font-medium text-gray-700">
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
              disabled={isEnoughAllowance}
              onClick={handleApprove}
              className="btn btn-info flex-1"
            >
              {isPending ? (
                <span className="loading loading-dots loading-lg"></span>
              ) : selectedToken ? (
                `Approve ${amount} ${symbol}`
              ) : (
                `Approve`
              )}
            </button>
            <button
              type="button"
              disabled={isSendDisable}
              onClick={handleSubmit}
              className="btn btn-success flex-1"
            >
              Send
            </button>
          </div>
        </form>
      </div>
      {/* rize Pools & Waiting List */}
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
              <div
                key={i}
                className="w-11/12 text-ellipsis overflow-hidden whitespace-nowrap"
              >
                {isMobile ? truncateString(player) : player}
              </div>
            ))}
          </div>
          {/* <div className="p-4 bg-zinc-800 rounded-lg flex-1">
            {Object.values(accountBalances).map(({ symbol, amount }) => (
              <div key={symbol}>{`${symbol}: ${amount}`}</div>
            ))}
          </div> */}
        </div>
      </div>
      <button onClick={notify}>Show Info Toast</button>
      <Notifications />
    </main>
  )
}
