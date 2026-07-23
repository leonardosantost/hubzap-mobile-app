import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export const TasksIconOutline = () => {
  return (
    <Svg width="49" height="40" viewBox="0 0 49 40" fill="none">
      <Rect x="15" y="7" width="19" height="21" rx="4" stroke="#171717" strokeWidth="1.5" />
      <Path d="M19 5V10M30 5V10M15 13H34" stroke="#171717" strokeWidth="1.5" />
      <Path
        d="M19.5 18.5L21.2 20.2L24.5 17M19.5 24H29.5"
        stroke="#171717"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const TasksIconFilled = () => {
  return (
    <Svg width="49" height="40" viewBox="0 0 49 40" fill="none">
      <Rect x="15" y="7" width="19" height="21" rx="4" fill="#171717" />
      <Path d="M19 5V10M30 5V10M15 13H34" stroke="#171717" strokeWidth="1.5" />
      <Path
        d="M19.5 18.5L21.2 20.2L24.5 17M19.5 24H29.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
