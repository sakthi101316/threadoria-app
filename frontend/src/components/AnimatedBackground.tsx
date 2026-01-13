import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

interface FloatingCircleProps {
  size: number;
  color: string;
  initialX: number;
  initialY: number;
  duration: number;
  delay: number;
}

const FloatingCircle: React.FC<FloatingCircleProps> = ({ size, color, initialX, initialY, duration, delay }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: -30,
              duration: duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 30,
              duration: duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(translateX, {
              toValue: 20,
              duration: duration * 1.3,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: -20,
              duration: duration * 1.3,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: duration * 0.8,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.2,
              duration: duration * 0.8,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };

    const timer = setTimeout(startAnimation, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: initialX,
          top: initialY,
          opacity,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    />
  );
};

export const AnimatedBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const circles = [
    { size: 120, color: COLORS.gold + '30', x: -30, y: 100, duration: 4000, delay: 0 },
    { size: 80, color: COLORS.primary + '20', x: width - 60, y: 200, duration: 5000, delay: 500 },
    { size: 100, color: COLORS.rose + '25', x: 50, y: height - 300, duration: 4500, delay: 1000 },
    { size: 60, color: COLORS.gold + '35', x: width - 100, y: height - 200, duration: 3500, delay: 1500 },
    { size: 90, color: COLORS.secondary + '20', x: width / 2 - 45, y: 50, duration: 5500, delay: 800 },
    { size: 70, color: COLORS.primary + '15', x: 20, y: height / 2, duration: 4200, delay: 300 },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.cream, '#FFF5E6', '#FDF0E6', COLORS.cream]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      {circles.map((circle, index) => (
        <FloatingCircle
          key={index}
          size={circle.size}
          color={circle.color}
          initialX={circle.x}
          initialY={circle.y}
          duration={circle.duration}
          delay={circle.delay}
        />
      ))}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  circle: {
    position: 'absolute',
  },
});
