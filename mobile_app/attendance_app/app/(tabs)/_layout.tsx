import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4F46E5",
        tabBarStyle: {
          height: 55 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="classList"
        options={{
          title: "My Class",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="sessionHistory"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden Screens */}
      <Tabs.Screen name="session/sessionDetails" options={{ href: null }} />
      <Tabs.Screen name="session/attendanceResults" options={{ href: null }} />
      <Tabs.Screen name="session/processing" options={{ href: null }} />
      <Tabs.Screen name="session/takeAttendance" options={{ href: null }} />
      <Tabs.Screen name="session/editSchedule" options={{ href: null }} />
      <Tabs.Screen name="session/editAttendance" options={{ href: null }} />
      <Tabs.Screen name="classes/studentList" options={{ href: null }} />
      <Tabs.Screen name="classes/classSelection" options={{ href: null }} />
      <Tabs.Screen name="classes/createClass" options={{ href: null }} />
      <Tabs.Screen name="classes/editClass" options={{ href: null }} />
      <Tabs.Screen name="classes/studentDetails" options={{ href: null }} />
      
    </Tabs>
  );
}