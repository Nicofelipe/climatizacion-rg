import { ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
export default function FormScrollView(props:ScrollViewProps){
  return <KeyboardAwareScrollView bottomOffset={24} extraKeyboardSpace={16} disableScrollOnKeyboardHide={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" {...props}/>;
}
