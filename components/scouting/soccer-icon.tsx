import React from "react"

type SoccerIconProps = React.SVGProps<SVGSVGElement> & {
  width?: number
  height?: number
}

const SoccerIcon: React.FC<SoccerIconProps> = ({ width = 16, height = 16, ...props }) => {
  return (
      <svg
          width={width}
          height={height}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          {...props}
      >
        <rect width="16" height="16" fill="url(#pattern0)" />
        <defs>
          <pattern id="pattern0" patternContentUnits="objectBoundingBox" width="1" height="1">
            <use xlinkHref="#image0" transform="scale(0.01)" />
          </pattern>
          <image
              id="image0"
              width="100"
              height="100"
              preserveAspectRatio="none"
              xlinkHref="data:image/png;base64,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"
          />
        </defs>
      </svg>
  )
}

export default SoccerIcon
