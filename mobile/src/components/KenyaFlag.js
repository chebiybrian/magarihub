// Animated Kenyan flag with a metallic finish (no SVG dependency).
// Bands are plain Views; the metal look comes from a specular highlight
// sweeping across plus a gentle wave skew.
import { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';

export default function KenyaFlag() {
  const sweep = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slow polished highlight drifting across
    Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })
    ).start();
    // Gentle continuous swell — smooth in-out so it flows rather than snaps
    Animated.loop(
      Animated.sequence([
        Animated.timing(wave, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wave, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-260, 460] });
  const skewY = wave.interpolate({ inputRange: [0, 1], outputRange: ['-0.7deg', '0.7deg'] });
  const flagShift = wave.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-3, 3, -3] });

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.flag, { transform: [{ skewY }, { translateY: flagShift }] }]}>
        <View style={[styles.band, { flex: 3, backgroundColor: '#0b0b0b' }]} />
        <View style={[styles.band, { flex: 1, backgroundColor: '#f5f5f5' }]} />
        <View style={[styles.band, { flex: 7, backgroundColor: '#c8102e' }]} />
        <View style={[styles.band, { flex: 1, backgroundColor: '#f5f5f5' }]} />
        <View style={[styles.band, { flex: 3, backgroundColor: '#0f7b3d' }]} />

        {/* Simplified Maasai shield */}
        <View style={styles.shieldWrap} pointerEvents="none">
          <View style={styles.spearA} />
          <View style={styles.spearB} />
          <View style={styles.shield}>
            <View style={styles.shieldInner} />
          </View>
        </View>

        {/* Fold shading — darker troughs give the metal depth */}
        <View style={styles.folds} pointerEvents="none">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
            <View key={n} style={[styles.fold, { opacity: n % 2 ? 0.13 : 0.04 }]} />
          ))}
        </View>

        {/* Chrome sweep */}
        <Animated.View style={[styles.sheen, { transform: [{ translateX }, { rotate: '14deg' }] }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0b0b0b', overflow: 'hidden' },
  flag: { flex: 1 },
  band: { width: '100%' },
  folds: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  fold: { flex: 1, backgroundColor: '#000' },
  sheen: {
    position: 'absolute', top: -40, bottom: -40, width: 70,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  shieldWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  spearA: { position: 'absolute', width: 3, height: 96, backgroundColor: '#f2efe6', transform: [{ rotate: '32deg' }] },
  spearB: { position: 'absolute', width: 3, height: 96, backgroundColor: '#f2efe6', transform: [{ rotate: '-32deg' }] },
  shield: {
    width: 34, height: 70, borderRadius: 17, backgroundColor: '#c8102e',
    borderWidth: 2, borderColor: '#0b0b0b', alignItems: 'center', justifyContent: 'center',
  },
  shieldInner: { width: 18, height: 44, borderRadius: 9, backgroundColor: '#f2efe6' },
});
