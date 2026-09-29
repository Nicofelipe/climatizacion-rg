
import { router } from 'expo-router';

import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import AppContainer from '@/components/layout/AppContainer';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { Colors, Spacing, Typography } from '@/theme';
import { formatCurrency } from '@/utils/currency';

export default function ExpensesScreen() {
  const { token } = useAuth();

  const {
    expenses,
    isLoading,
    error,
    reload,
  } = useExpenses(token);



  if (isLoading) {
    return (
      <AppContainer>
        <ActivityIndicator size="large" />
      </AppContainer>
    );
  }

  if (error) {
    return (
      <AppContainer>
        <Text>{error}</Text>
      </AppContainer>
    );
  }

  return (
    <AppContainer>
      <Text
        style={{
          fontSize: Typography.heading,
          fontWeight: '700',
          color: Colors.text,
          marginBottom: Spacing.lg,
        }}
      >
        Boletas
      </Text>

      <Button
        title="Registrar boleta"
        onPress={() => router.push('/(protected)/expenses/create')}
      />

      <View style={{ height: Spacing.lg }} />

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.Id.toString()}
        ListEmptyComponent={
          <Text style={{ color: Colors.textSecondary }}>
            No hay boletas registradas.
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: Spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
            }}
          >
            <Text
              style={{
                fontSize: Typography.body,
                fontWeight: '600',
                color: Colors.text,
              }}
            >
              {item.ExpenseTypeName}
            </Text>

            <Text style={{ color: Colors.textSecondary }}>
              Boleta: {item.ReceiptNumber}
            </Text>

            <Text
              style={{
                marginTop: Spacing.xs,
                color: Colors.primary,
                fontWeight: '700',
              }}
            >
              {formatCurrency(item.TotalAmount)}
            </Text>
          </View>
        )}
      />
    </AppContainer>
  );
}