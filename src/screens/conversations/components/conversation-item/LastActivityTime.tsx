import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { tailwind } from '@/theme';
import { NativeView } from '@/components-next/native-components';
import { formatConversationListTime } from '@/utils/dateTimeUtils';

// Constants from Vue component
const MINUTE_IN_MS = 60000;
const HOUR_IN_MS = MINUTE_IN_MS * 60;
const DAY_IN_MS = HOUR_IN_MS * 24;

type LastActivityTimeProps = {
  timestamp: number;
  isUnread?: boolean;
};

export const LastActivityTime = ({ timestamp, isUnread = false }: LastActivityTimeProps) => {
  const [lastActivityTime, setLastActivityTime] = useState(formatConversationListTime(timestamp));

  useEffect(() => {
    const getRefreshTime = () => {
      const timeDiff = Date.now() - timestamp * 1000;
      if (timeDiff > DAY_IN_MS) return DAY_IN_MS;
      if (timeDiff > HOUR_IN_MS) return HOUR_IN_MS;
      return MINUTE_IN_MS;
    };

    const updateTime = () => {
      setLastActivityTime(formatConversationListTime(timestamp));
    };

    let timer: NodeJS.Timeout;

    const refresh = () => {
      updateTime();
      timer = setTimeout(refresh, getRefreshTime());
    };

    timer = setTimeout(refresh, getRefreshTime());

    return () => clearTimeout(timer);
  }, [timestamp]);

  return (
    <NativeView>
      <Text
        style={tailwind.style(
          'text-sm font-inter-420-20 leading-[16px] tracking-[0.32px]',
          isUnread ? 'text-blue-800' : 'text-gray-700',
        )}>
        {lastActivityTime}
      </Text>
    </NativeView>
  );
};
