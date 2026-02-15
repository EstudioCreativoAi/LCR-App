import React from 'react'
import { Tabs } from 'expo-router'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSession } from '../../src/providers/SessionProvider'
import { useRouter } from 'expo-router'
import { COLORS, FONTS, SPACING } from '../../src/theme/theme'
import i18n from '../../src/i18n'
import { Home, Search, Heart, Building, Users, FileText, Banknote, User, Bell } from 'lucide-react-native'

function HeaderRight() {
  const { session, signOut } = useSession()
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <View style={styles.headerRight}>
      <TouchableOpacity
        style={styles.notificationButton}
        onPress={() => router.push('/notifications')}
      >
        <Bell size={22} color={COLORS.text} strokeWidth={2} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.languageToggle}
        onPress={() => {
          const newLang = i18n.language === 'en' ? 'es' : 'en'
          i18n.changeLanguage(newLang)
        }}
      >
        <Text style={styles.languageToggleText}>{i18n.language.toUpperCase()}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutButtonText}>{t('common.signOut')}</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function TabsLayout() {
  const { role } = useSession()
  const { t } = useTranslation()

  const isRenter = role === 'renter'
  const isLandlord = role === 'landlord'
  const isAgent = role === 'agent'

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: {
          fontFamily: FONTS.semiBold,
          fontSize: 11,
        },
        tabBarStyle: {
          borderTopColor: COLORS.background,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
        },
        headerStyle: {
          backgroundColor: COLORS.white,
        },
        headerTitleStyle: {
          fontFamily: FONTS.bold,
          color: COLORS.text,
        },
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('common.properties'),
          tabBarLabel: t('common.properties'),
          headerTitle: 'LCR App',
          tabBarIcon: ({ color }) => <Home size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarLabel: 'Search',
          tabBarIcon: ({ color }) => <Search size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarLabel: 'Saved',
          href: isRenter ? '/saved' : null,
          tabBarIcon: ({ color }) => <Heart size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="my-listings"
        options={{
          title: 'My Listings',
          tabBarLabel: 'My Listings',
          href: isLandlord || isAgent ? '/my-listings' : null,
          tabBarIcon: ({ color }) => <Building size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: t('common.leads'),
          tabBarLabel: t('common.leads'),
          href: isLandlord || isAgent ? '/leads' : null,
          tabBarIcon: ({ color }) => <Users size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="leases"
        options={{
          title: 'My Leases',
          tabBarLabel: 'My Leases',
          href: isRenter ? '/leases' : null,
          tabBarIcon: ({ color }) => <FileText size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="commissions"
        options={{
          title: t('common.earnings'),
          tabBarLabel: t('common.earnings'),
          href: isAgent ? '/commissions' : null,
          tabBarIcon: ({ color }) => <Banknote size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: SPACING.md,
  },
  notificationButton: {
    padding: 4,
  },
  languageToggle: {
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  languageToggleText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.muted,
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  signOutButtonText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
})
