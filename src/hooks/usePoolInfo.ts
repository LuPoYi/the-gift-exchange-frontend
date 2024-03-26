import { useEffect, useState } from 'react'

import {
  Erc20InfoType,
  PoolStateType,
  erc20ABI,
  giftExchangeContractABI,
  giftExchangeContractAddress,
} from '@/constants'
import { formatUnits } from 'viem'
import { readContracts, watchBlockNumber } from '@wagmi/core'
import { useAccount } from 'wagmi'
import { wagmiConfig } from '@/app/providers'

export default function usePoolInfo() {
  const { address } = useAccount()
  const [players, setPlayers] = useState<string[]>()
  const [pools, setPools] = useState<PoolStateType[]>()

  // ----- fetch pool information -----
  useEffect(() => {
    return watchBlockNumber(wagmiConfig, {
      onBlockNumber() {
        const fetchContract = async () => {
          const contractResp = await readContracts(wagmiConfig, {
            contracts: [0, 1, 2].flatMap((poolId) =>
              ['players', 'prizeTokenInfos'].map((functionName) => ({
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
            const playerAddress = contractResp[i].result?.toString() || ''

            const [tokenAddress, decimals, symbol, amount] =
              (contractResp[i + 1]?.result as unknown as any[])?.map((item) => item.toString()) ||
              []

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

  return { players, pools }
}
