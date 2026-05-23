import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenProps {
  children?: ReactNode;
  eyebrow?: string;
  paragraphs?: string[];
  title?: string;
}

const defaultBody = [
  'Start is your coding agent for planning, editing, and reviewing real projects. This placeholder copy is intentionally long enough to move behind the floating controls so the liquid surfaces can be judged against live content instead of a flat empty screen.',
  'The bottom navigation is not a full-width bar. Home and Settings sit inside one native glass group on the left, while the new session action floats separately on the right. Text should remain visible behind both shapes as you scroll.',
  'Use this screen to check the feel in light mode, dark mode, and reduced transparency settings. The fallback keeps a translucent shell, but iOS uses system Liquid Glass when the API is available.'
];

export function Screen({
  children,
  eyebrow = 'Start',
  paragraphs = defaultBody,
  title = 'Your coding agent'
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <ScrollView
      bounces
      style={[styles.screen, dark && styles.screenDark]}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 48, 72) }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, dark && styles.eyebrowDark]}>{eyebrow}</Text>
        <Text style={[styles.title, dark && styles.titleDark]}>{title}</Text>
      </View>
      <View style={styles.body}>
        {paragraphs.map((paragraph) => (
          <Text key={paragraph} style={[styles.paragraph, dark && styles.paragraphDark]}>
            {paragraph}
          </Text>
        ))}
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f8fa'
  },
  screenDark: {
    backgroundColor: '#101214'
  },
  content: {
    gap: 30,
    paddingRight: 24,
    paddingBottom: 180,
    paddingLeft: 24
  },
  header: {
    gap: 8,
    maxWidth: 340
  },
  eyebrow: {
    color: 'rgba(21, 25, 31, 0.58)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  eyebrowDark: {
    color: 'rgba(244, 246, 248, 0.58)'
  },
  title: {
    color: '#15191f',
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -1.2
  },
  titleDark: {
    color: '#f4f6f8'
  },
  body: {
    gap: 18,
    maxWidth: 360
  },
  paragraph: {
    color: 'rgba(21, 25, 31, 0.72)',
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400'
  },
  paragraphDark: {
    color: 'rgba(244, 246, 248, 0.74)'
  }
});
