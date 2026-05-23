import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { StatusBar } from 'expo-status-bar';
import { DynamicColorIOS, Platform, useColorScheme } from 'react-native';

const RootLayout = () => {
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';
  const tabBarBlurEffect = dark ? 'systemThinMaterialDark' : 'systemThinMaterialLight';
  const tabBarBackgroundColor =
    Platform.OS === 'ios'
      ? DynamicColorIOS({ light: 'rgba(248, 249, 251, 0.72)', dark: 'rgba(28, 30, 34, 0.72)' })
      : dark
        ? 'rgba(28, 30, 34, 0.96)'
        : 'rgba(248, 249, 251, 0.96)';
  const tabBarShadowColor =
    Platform.OS === 'ios'
      ? DynamicColorIOS({ light: 'rgba(21, 25, 31, 0.08)', dark: 'rgba(244, 246, 248, 0.1)' })
      : 'transparent';

  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      <NativeTabs
        sidebarAdaptable={false}
        blurEffect={tabBarBlurEffect}
        disableTransparentOnScrollEdge
        shadowColor={tabBarShadowColor}
        backgroundColor={tabBarBackgroundColor}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon
            md={{ default: 'home', selected: 'home' }}
            sf={{ default: 'house', selected: 'house' }}
          />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="compose">
          <NativeTabs.Trigger.Icon
            md={{ default: 'add', selected: 'add' }}
            sf={{ default: 'plus', selected: 'plus' }}
          />
          <NativeTabs.Trigger.Label>New</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Icon
            md={{ default: 'settings', selected: 'settings' }}
            sf={{ default: 'gearshape', selected: 'gearshape' }}
          />
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
};

export default RootLayout;
