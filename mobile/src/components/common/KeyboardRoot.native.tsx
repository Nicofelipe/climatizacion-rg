import { PropsWithChildren } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
export default function KeyboardRoot({children}:PropsWithChildren){
  return <KeyboardProvider statusBarTranslucent navigationBarTranslucent>{children}</KeyboardProvider>;
}
