import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export const PosIconOutline = () => {
  return (
    <Svg width="49" height="40" viewBox="0 0 49 40" fill="none">
      <Rect x="15" y="6" width="19" height="23" rx="4" stroke="#171717" strokeWidth="1.5" />
      <Path d="M19 12H30" stroke="#171717" strokeWidth="1.5" strokeLinecap="round" />
      <Path
        d="M20 19H21M24 19H25M28 19H29"
        stroke="#171717"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M20 24H21M24 24H25M28 24H29"
        stroke="#171717"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
};

export const PosIconFilled = () => {
  return (
    <Svg width="49" height="40" viewBox="0 0 49 40" fill="none">
      <Rect x="15" y="6" width="19" height="23" rx="4" fill="#171717" />
      <Path d="M19 12H30" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <Path
        d="M20 19H21M24 19H25M28 19H29"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M20 24H21M24 24H25M28 24H29"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
};
