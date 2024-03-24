import { PoolStateType } from "@/constants"
import { truncateString } from "@/utils"

const coverBackgrounds = [
  `#b7c7b0 url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 120 120'><polygon fill='%2393A891' points='120 120 60 120 90 90 120 60 120 0 120 0 60 60 0 0 0 60 30 90 60 120 120 120 '/></svg>")`,
  `#b73a3b url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 100 100'><circle cx='25' cy='25' r='15' fill='%239B2D2B'/><circle cx='75' cy='75' r='16' fill='%239B2D2B'/></svg>")`,
  `#f5eed7 url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='47.5' height='47.5' viewBox='0 0 100 100'><path d='M 25 10 L 25 17 M 25 33 L 25 40 M 10 25 L 17 25 M 33 25 L 40 25' stroke='%23CD803D' stroke-width='6' stroke-linecap='round' /><circle cx='75' cy='75' r='4' fill='%23CD803D'/></svg>")`,
]

const textColors = ["text-blue-500", "text-green-500", "text-red-500"]

interface GiftCardProps {
  index: number
  pool: PoolStateType
}

const GiftCard = ({ index = 0, pool }: GiftCardProps) => {
  const { tokenAddress, symbol, amount } = pool

  return (
    <div className="relative w-full h-48">
      <div
        className="text-[#252721] rounded-lg flex items-center justify-center text-5xl hover:[transform:rotateY(-100deg)] transition-transform duration-1000 ease-in-out absolute left-0 top-0 w-full h-full"
        style={{
          background: coverBackgrounds[index],
          transformOrigin: "left top",
          transition: "1s ease-in-out",
        }}
      >
        {index + 1}
      </div>

      <div className="px-4 py-4 bg-white rounded-lg items-center justify-center w-full h-full">
        <div className={`font-bold text-xl mb-2 ${textColors[index]}`}>
          {symbol}
        </div>
        <p className="text-gray-700 text-base">
          {`${amount} ${symbol}`}
          <br />
          {`Token Address: ${tokenAddress && truncateString(tokenAddress)}`}
          <br />
        </p>
      </div>
    </div>
  )
}

export default GiftCard
