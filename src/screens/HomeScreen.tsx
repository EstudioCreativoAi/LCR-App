import React from 'react'
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native'
import PropertyFeed from '../components/PropertyFeed'

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <PropertyFeed />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
})
