import { Tabs,router } from 'expo-router';
import { Keyboard,Pressable,View } from 'react-native';
import {useEffect,useState} from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { usePendingReviews } from '@/hooks/usePendingReviews';

export default function TabsLayout() {
  const {user,token}=useAuth();
  const [typing,setTyping]=useState(false);
  useEffect(()=>{const show=Keyboard.addListener('keyboardDidShow',()=>setTyping(true)),hide=Keyboard.addListener('keyboardDidHide',()=>setTyping(false));return()=>{show.remove();hide.remove();};},[]);
  const {count}=usePendingReviews(token,user?.role==='ADMIN');
  return (
    <View style={{flex:1}}>
    <Tabs
      safeAreaInsets={{top:0,bottom:0,left:0,right:0}}
      screenOptions={{
        tabBarHideOnKeyboard:true,
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
    {!typing?<Pressable accessibilityRole="button" accessibilityLabel="Registrar una boleta" onPress={()=>router.push('/(protected)/expenses/create')} style={{position:'absolute',right:20,bottom:83,width:58,height:58,borderRadius:29,backgroundColor:'#0F8277',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'white',elevation:7,boxShadow:'0px 4px 12px #0F827744'}}><Ionicons name="add" size={34} color="white"/></Pressable>:null}
    </View>
  );
}
