import React from 'react'
import { Tabs } from 'expo-router'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSession } from '../../src/providers/SessionProvider'
import { useRouter } from 'expo-router'
import { COLORS, FONTS, SPACING } from '../../src/theme/theme'
import i18n from '../../src/i18n'

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
        <Text style={{ fontSize: 22 }}>🔔</Text>
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
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarLabel: 'Search',
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarLabel: 'Saved',
          href: isRenter ? '/saved' : null,
        }}
      />
      <Tabs.Screen
        name="my-listings"
        options={{
          title: 'My Listings',
          tabBarLabel: 'My Listings',
          href: isLandlord || isAgent ? '/my-listings' : null,
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: t('common.leads'),
          tabBarLabel: t('common.leads'),
          href: isLandlord || isAgent ? '/leads' : null,
        }}
      />
      <Tabs.Screen
        name="leases"
        options={{
          title: 'My Leases',
          tabBarLabel: 'My Leases',
          href: isRenter ? '/leases' : null,
        }}
      />
      <Tabs.Screen
        name="commissions"
        options={{
          title: t('common.earnings'),
          tabBarLabel: t('common.earnings'),
          href: isAgent ? '/commissions' : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
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
