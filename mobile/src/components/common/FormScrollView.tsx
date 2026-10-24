import {ScrollView,ScrollViewProps} from 'react-native';
export default function FormScrollView(props:ScrollViewProps){
  return <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" {...props}/>;
}
