// Maahis Designer Boutique Theme
export const COLORS = {
  primary: '#C11F27',    // Red
  secondary: '#DD5A27',  // Orange
  accent: '#2A85B5',     // Blue
  gold: '#E7C475',       // Gold
  cream: '#F8F5EF',      // Background
  white: '#FFFFFF',
  black: '#1A1A1A',
  gray: '#6B7280',
  lightGray: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Status colors
  statusReceived: '#6B7280',
  statusCutting: '#F59E0B',
  statusStitching: '#8B5CF6',
  statusTrialReady: '#3B82F6',
  statusCompleted: '#10B981',
  statusDelivered: '#059669',
};

export const FONTS = {
  title: 'serif',       // Great Vibes alternative
  heading: 'System',    // Montserrat alternative
  body: 'System',       // Poppins alternative
  numbers: 'System',    // Inter alternative
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
    shadowColor: '#E7C475',
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
