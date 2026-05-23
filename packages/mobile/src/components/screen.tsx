import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenProps {
  title?: string;
  eyebrow?: string;
  children?: ReactNode;
  paragraphs?: string[];
}

const defaultBody = [
  'Start keeps the mobile surface direct: one place to resume work, one place to begin, and one place to tune the app.',
  'Controls use platform navigation so the shell feels native before deeper session views arrive.'
];

export const Screen = ({
  children,
  eyebrow = 'Start',
  paragraphs = defaultBody,
  title = 'Your coding assistant'
}: ScreenProps) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <ScrollView
      bounces
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 48, 72),
          paddingBottom: Math.max(insets.bottom + 120, 160)
        }
      ]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      style={[styles.screen, dark && styles.screenDark]}
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
};

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
    paddingLeft: 24,
    paddingRight: 24
  },
  header: {
    gap: 8,
    maxWidth: 340
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(21, 25, 31, 0.58)'
  },
  eyebrowDark: {
    color: 'rgba(244, 246, 248, 0.58)'
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    color: '#15191f',
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
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400',
    color: 'rgba(21, 25, 31, 0.72)'
  },
  paragraphDark: {
    color: 'rgba(244, 246, 248, 0.74)'
  }
});
