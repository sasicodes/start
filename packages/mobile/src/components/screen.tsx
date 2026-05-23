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
  'Start keeps the mobile surface direct: one place to resume work, one place to begin, and one place to tune the app.',
  'Controls use platform navigation so the shell feels native before deeper session views arrive.'
];

export function Screen({
  children,
  eyebrow = 'Start',
  paragraphs = defaultBody,
  title = 'Your coding assistant'
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <ScrollView
      bounces
      contentInsetAdjustmentBehavior="never"
      style={[styles.screen, dark && styles.screenDark]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 48, 72),
          paddingBottom: Math.max(insets.bottom + 120, 160)
        }
      ]}
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
