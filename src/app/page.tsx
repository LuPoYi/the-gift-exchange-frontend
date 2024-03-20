/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useEffect, useRef, useState } from 'react';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  defaultErc20InfoType,
  defaultPoolStateType,
  erc20ABI,
  giftExchangeContractABI,
  giftExchangeContractAddress,
  selectTokenOptions,
  supportedTokenAddresses,
  tokenAAddress,
  tokenBAddress,
  tokenCAddress,
  tokenDAddress,
} from '../constants';
import { formatUnits, parseUnits } from 'viem';
import { readContracts, watchBlockNumber, writeContract } from '@wagmi/core';
import { truncateString } from '@/utils';
import { useAccount, useBalance } from 'wagmi';
import { wagmiConfig } from './providers';

const amount = "1"

export default function Home() {
  const { address } = useAccount()

  const [players, setPlayers] = useState<string[]>()
  const [pools, setPools] = useState<defaultPoolStateType[]>()
  const [erc20InfoMap, setErc20InfoMap] =
    useState<Record<string, defaultErc20InfoType>>()

  // Form Related State
  const [isLoading, setIsLoading] = useState(false)
  const [selectedToken, setSelectedToken] = useState(supportedTokenAddresses[0])
  const [isEnoughAllowance, setIsEnoughAllowance] = useState(false)

  const { data: nativeToken } = useBalance({ address })
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
      setIsLoading(true)

      await writeContract(wagmiConfig, {
        abi: erc20ABI,
        address: selectedToken as `0x${string}`,
        functionName: "approve",
        args: [
          giftExchangeContractAddress,
          parseUnits(amount, erc20InfoMap[selectedToken].decimals),
        ],
      })

      setIsLoading(false)
    } catch (error) {
      console.error("Error approving tokens:", error)
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedToken) return

    try {
      setIsLoading(true)

      const submitResult = await writeContract(wagmiConfig, {
        abi: giftExchangeContractABI,
        address: giftExchangeContractAddress as `0x${string}`,
        functionName: "play",
        args: [selectedToken as `0x${string}`],
      })

      setIsLoading(false)
    } catch (error) {
      console.error("Error submit:", error)
      setIsLoading(false)
    }
  }

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
          let _pools: defaultPoolStateType[] = []
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

          const _erc20InfoMap: Record<string, defaultErc20InfoType> = {}
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
 
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-3xl text-blue-800 font-bold underline">
        The Gift Exchange
      </h1>
      <div className="py-4">
        <ConnectButton />
      </div>

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
              {selectedToken ? `Approve ${amount} ${symbol}` : `Approve`}
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

      <div>{`${nativeToken?.symbol}: ${
        nativeToken && formatUnits(nativeToken.value, nativeToken.decimals)
      }`}</div>
      {Object.values(accountBalances).map(({ symbol, amount }) => (
        <div key={symbol}>{`${symbol}: ${amount}`}</div>
      ))}

      {players &&
        players.map((player, i) => <div key={i}>{truncateString(player)}</div>)}

      <div className="flex justify-between space-x-3 w-full">
        {pools &&
          [
            { pool: pools[0], textColor: "text-blue-500", index: 0 },
            { pool: pools[1], textColor: "text-gree-500", index: 1 },
            { pool: pools[2], textColor: "text-red-500", index: 2 },
          ].map(({ pool, textColor, index }) => {
            const { tokenAddress, symbol, amount } = pool

            return (
              <div
                key={index}
                className="max-w-sm rounded overflow-hidden shadow-lg w-1/3"
              >
                <div className="px-6 py-4">
                  <div className={`font-bold text-xl mb-2 ${textColor}`}>
                    {symbol}
                  </div>
                  <p className="text-gray-700 text-base">
                    {`${amount} ${symbol}`}
                    <br />
                    {`Token Address: ${
                      tokenAddress && truncateString(tokenAddress)
                    }`}
                    <br />
                  </p>
                </div>
              </div>
            )
          })}
      </div>
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Put TokenA and Get TokenX
      </button>
      <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
        Put TokenB and Get TokenX
      </button>
      <button className="bg-pink-500 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded">
        Put TokenC and Get TokenX
      </button>
      <svg
        className="gingerbread"
        width="200"
        height="200"
        viewBox="-100 -100 200 200"
      >
        <circle className="body" cx="0" cy="-50" r="30" />

        <circle className="eye" cx="-12" cy="-55" r="3" />
        <circle className="eye" cx="12" cy="-55" r="3" />
        <rect className="mouth" x="-10" y="-40" width="20" height="5" rx="2" />

        <line className="limb" x1="-40" y1="-10" x2="40" y2="-10" />
        <line className="limb" x1="-25" y1="50" x2="0" y2="-15" />
        <line className=" limb" x1="25" y1="50" x2="0" y2="-15" />

        <circle className="button" cx="0" cy="-10" r="5" />
        <circle className="button" cx="0" cy="10" r="5" />
      </svg>
      <svg width="200" height="200" viewBox="-100 -100 200 200">
        <circle cx="0" cy="20" r="70" fill="#D1495B" />

        <circle
          cx="0"
          cy="-75"
          r="12"
          fill="none"
          stroke="#F79257"
          strokeWidth="2"
        />

        <rect x="-17.5" y="-65" width="35" height="20" fill="#F79257" />
      </svg>
    </main>
  )
}
