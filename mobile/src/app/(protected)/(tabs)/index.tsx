import { Text, View } from 'react-native';

import styles from '@/components/common/Dashboard.styles';
import AppContainer from '@/components/layout/AppContainer';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <AppContainer>
      <Text style={styles.title}>
        Climatización RG
      </Text>

      <Text style={styles.subtitle}>
        Bienvenido, {user?.firstName ?? 'Usuario'} 👋
      </Text>

      <View style={styles.cardsContainer}>
        {/* Próximamente conectaremos aquí los datos reales del dashboard */}
      </View>
    </AppContainer>
  );
}