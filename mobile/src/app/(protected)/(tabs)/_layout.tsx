import {
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: "#0066CC",

        tabBarInactiveTintColor: "#888",

        tabBarStyle: {
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",

          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="expenses"
        options={{
          title: "Boletas",

          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="receipt"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: "Reportes",

          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="stats-chart"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",

          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}