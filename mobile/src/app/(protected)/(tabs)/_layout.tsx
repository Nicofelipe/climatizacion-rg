import { router, Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { usePendingReviews } from '@/hooks/usePendingReviews';

export default function TabsLayout() {
  const {user,token}=useAuth();
  const {count,notice,dismiss}=usePendingReviews(token,user?.role==='ADMIN');
  const openReviews=()=>{dismiss();router.push({pathname:'/(protected)/(tabs)/expenses',params:{review:String(Date.now()),view:'company',workerId:undefined}});};
  return (
    <View style={{flex:1}}>
    {user?.role==='ADMIN'&&notice>0?<View accessibilityLiveRegion="polite" style={{backgroundColor:'#FFF5EC',borderBottomWidth:1,borderBottomColor:'#F2D8BE',paddingHorizontal:16,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:12}}>
      <Ionicons name="notifications-outline" size={23} color="#BC5028"/>
      <Pressable accessibilityRole="button" accessibilityLabel={`Tienes ${count} boletas pendientes por revisar. Abrir pendientes`} onPress={openReviews} style={{flex:1,gap:4}}><Text style={{color:'#733B23',fontSize:13,fontWeight:'700'}}>{notice===1?'Hay una boleta pendiente por revisar':'Hay boletas pendientes por revisar'}</Text><Text style={{color:'#8C604B',fontSize:12}}>{count} pendiente{count!==1?'s':''} · Toca para revisarlas</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar aviso de pendientes" onPress={dismiss} style={{padding:6}}><Ionicons name="close" size={20} color="#8C604B"/></Pressable>
    </View>:null}
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0F8277',
        tabBarInactiveTintColor: '#7C899D',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E4E9F2',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Boletas',
          tabBarBadge:count>0?(count>99?'99+':count):undefined,
          tabBarBadgeStyle:{backgroundColor:'#DC2626',color:'white',fontSize:10,fontWeight:'700'},
          tabBarAccessibilityLabel:count>0?`Boletas, ${count} pendientes por revisar`:'Boletas',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="employees" options={{title:'Equipo',href:user?.role==='ADMIN'?undefined:null,tabBarIcon:({color,size})=><Ionicons name="people-outline" color={color} size={size}/>}}/>
    </Tabs>
    </View>
  );
}
