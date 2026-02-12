import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  SafeAreaView 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/database';

interface AuthScreenProps {
  onEnterDemo: (role: UserRole) => void
}

export default function AuthScreen({ onEnterDemo }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('renter');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Sign In / Sign Up

  async function handleAuth() {
    setLoading(true);
    try {
      if (isSignUp) {
        // --- SIGN UP Logic ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: role,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // Use upsert to ensure the profile exists and has the right role
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
              id: data.user.id, 
              role: role,
              updated_at: new Date().toISOString()
            } as any);

          if (profileError) console.error('Sign-up profile error:', profileError);
          
          Alert.alert(
            'Check your email!', 
            'A confirmation link has been sent to ' + email + '. You must click it before you can sign in.'
          );
        }
      } else {
        // --- SIGN IN Logic ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Please confirm your email first! Check your inbox for the link.');
          }
          throw error;
        }

        if (data.user) {
          // Force upsert the profile role upon sign in
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
              id: data.user.id, 
              role: role,
              updated_at: new Date().toISOString()
            } as any);
          
          if (profileError) console.error('Sign-in profile error:', profileError);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An error occurred';
      Alert.alert('Auth Error', msg);
      console.error('Auth Full Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleClearSession() {
    await supabase.auth.signOut();
    Alert.alert('Debug', 'Session cleared. Try logging in again.');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Los Cabos Rentals</Text>
        <Text style={styles.subHeader}>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Role Selection - Show for both Sign In and Sign Up */}
        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>I am a:</Text>
          <View style={styles.roleSelector}>
            {(['renter', 'landlord', 'agent'] as UserRole[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleButton,
                  role === r && styles.roleButtonSelected,
                ]}
                onPress={() => setRole(r)}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    role === r && styles.roleButtonTextSelected,
                  ]}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.authButton}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.authButtonText}>
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => onEnterDemo(role)}
          disabled={loading}
        >
          <Text style={styles.demoButtonText}>
            Enter as Demo {role.charAt(0).toUpperCase() + role.slice(1)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.toggleText}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.debugButton}
          onPress={handleClearSession}
        >
          <Text style={styles.debugButtonText}>
            Debug: Clear Session & Refresh
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // cool gray 50
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  roleContainer: {
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 4,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  roleButtonSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  roleButtonTextSelected: {
    color: '#111827',
    fontWeight: '600',
  },
  authButton: {
    backgroundColor: '#2563EB', // blue 600
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  toggleButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleText: {
    color: '#4F46E5', // indigo 600
    fontSize: 14,
    fontWeight: '500',
  },
  debugButton: {
    marginTop: 40,
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  debugButtonText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '400',
  },
  demoButton: {
    backgroundColor: '#ECFDF5', // emerald 50
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#10B981', // emerald 500
  },
  demoButtonText: {
    color: '#047857', // emerald 700
    fontWeight: '600',
    fontSize: 14,
  },
});
