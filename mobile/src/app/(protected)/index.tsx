import { Text, View } from 'react-native';

export default function DashboardScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: 'bold',
        }}
      >
        Climatización RG
      </Text>

      <Text
        style={{
          marginTop: 20,
          fontSize: 18,
        }}
      >
        Dashboard
      </Text>
    </View>
  );
}