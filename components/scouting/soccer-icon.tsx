import React from "react"

type SoccerIconProps = React.SVGProps<SVGSVGElement> & {
  width?: number
  height?: number
}

const SoccerIcon: React.FC<SoccerIconProps> = ({width = 16, height = 16, ...props}) => {
  return (
      <svg width={width}
           height={height}
           viewBox="0 0 24 24"
           fill="none"
           xmlns="http://www.w3.org/2000/svg"
           xmlnsXlink="http://www.w3.org/1999/xlink"
           {...props}
           stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10"/>
        <path d="M11.9 6.7s-3 1.3-5 3.6c0 0 0 3.6 1.9 5.9 0 0 3.1.7 6.2 0 0 0 1.9-2.3 1.9-5.9 0 .1-2-2.3-5-3.6"/>
        <path d="M11.9 6.7V2"/>
        <path d="M16.9 10.4s3-1.4 4.5-1.6"/>
        <path d="M15 16.3s1.9 2.7 2.9 3.7"/>
        <path d="M8.8 16.3S6.9 19 6 20"/>
        <path d="M2.6 8.7C4 9 7 10.4 7 10.4"/>
      </svg>
  )
}

export default SoccerIcon
