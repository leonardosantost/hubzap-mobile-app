import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { IconProps } from '../../types';

export const CartIcon = ({ stroke = '#171717' }: IconProps): JSX.Element => {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 4H5.2C5.64 4 6.03 4.29 6.16 4.71L6.72 6.5M6.72 6.5H19.12C19.78 6.5 20.26 7.13 20.08 7.77L18.72 12.77C18.54 13.2 18.17 13.5 17.72 13.5H8.2M6.72 6.5L8.2 13.5M8.2 13.5L7.62 15.25C7.4 15.91 7.9 16.58 8.6 16.58H18"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.25 20C9.66421 20 10 19.6642 10 19.25C10 18.8358 9.66421 18.5 9.25 18.5C8.83579 18.5 8.5 18.8358 8.5 19.25C8.5 19.6642 8.83579 20 9.25 20Z"
        stroke={stroke}
        strokeWidth="1.7"
      />
      <Path
        d="M17.25 20C17.6642 20 18 19.6642 18 19.25C18 18.8358 17.6642 18.5 17.25 18.5C16.8358 18.5 16.5 18.8358 16.5 19.25C16.5 19.6642 16.8358 20 17.25 20Z"
        stroke={stroke}
        strokeWidth="1.7"
      />
    </Svg>
  );
};
