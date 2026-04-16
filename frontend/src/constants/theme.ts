// MAAHIS Designer Boutique - Premium Tailoring Management App
export const COLORS = {
  primary: '#8B1538',        // Deep Burgundy (matches logo)
  secondary: '#D4AF37',      // Gold
  accent: '#C9A050',         // Light Gold Accent
  gold: '#D4AF37',           // Rich Gold
  cream: '#FDF8F3',          // Warm Cream Background
  white: '#FFFFFF',
  black: '#2D2D2D',          // Soft Black for text
  gray: '#6B7280',
  lightGray: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  rose: '#BE185D',           // Rose accent
  
  // Status colors
  statusReceived: '#6B7280',
  statusCutting: '#F59E0B',
  statusStitching: '#8B5CF6',
  statusTrialReady: '#3B82F6',
  statusCompleted: '#10B981',
  statusDelivered: '#059669',
};

export const APP_CONFIG = {
  name: 'MAAHIS',
  tagline: 'Designer Boutique',
  version: '2.0.0',
};

export const FONTS = {
  title: 'serif',
  heading: 'System',
  body: 'System',
  numbers: 'System',
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  gold: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const ORDER_STATUSES = [
  { key: 'received', label: 'Received', color: COLORS.statusReceived },
  { key: 'cutting', label: 'Cutting', color: COLORS.statusCutting },
  { key: 'stitching', label: 'Stitching', color: COLORS.statusStitching },
  { key: 'trial_ready', label: 'Trial Ready', color: COLORS.statusTrialReady },
  { key: 'completed', label: 'Completed', color: COLORS.statusCompleted },
  { key: 'delivered', label: 'Delivered', color: COLORS.statusDelivered },
];
