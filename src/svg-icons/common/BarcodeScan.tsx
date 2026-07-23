import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { IconProps } from '../../types';

export const BarcodeScanIcon = ({ stroke = '#171717' }: IconProps): JSX.Element => {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7V5C4 4.44772 4.44772 4 5 4H7"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 4H19C19.5523 4 20 4.44772 20 5V7"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20 17V19C20 19.5523 19.5523 20 19 20H17"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 20H5C4.44772 20 4 19.5523 4 19V17"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M7 8V16" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
      <Path d="M10 8V16" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
      <Path d="M14 8V16" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
      <Path d="M17 8V16" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
      <Path d="M12 8V16" stroke={stroke} strokeWidth="0.9" strokeLinecap="round" />
    </Svg>
  );
};
