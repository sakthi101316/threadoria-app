import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ORDER_STATUSES, BORDER_RADIUS, SPACING } from '../constants/theme';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = ORDER_STATUSES.find(s => s.key === status) || ORDER_STATUSES[0];
  
  return (
    <View style={[styles.badge, { backgroundColor: statusConfig.color + '20' }]}>
      <View style={[styles.dot, { backgroundColor: statusConfig.color }]} />
      <Text style={[styles.text, { color: statusConfig.color }]}>
        {statusConfig.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
