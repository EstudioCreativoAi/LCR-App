import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  SafeAreaView,
  FlatList,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { Message, Profile, Lead } from '../types/database'
import { ChatBubble } from './ChatBubble'
import { COLORS } from '../theme/theme'

interface ChatThreadProps {
  leadId: string
  currentUserId: string
  onClose: () => void
}

interface MessageWithProfile extends Message {
  sender?: Profile
}

export default function ChatThread({ leadId, currentUserId, onClose }: ChatThreadProps) {
  const [messages, setMessages] = useState<MessageWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [profiles, setProfiles] = useState<{ renter?: Profile; landlord?: Profile }>({})
  const flashListRef = useRef<any>(null)

  useEffect(() => {
    fetchChatDetails()
    subscribeToMessages()

    return () => {
      supabase.channel(`chat:${leadId}`).unsubscribe()
    }
  }, [leadId])

  const fetchChatDetails = async () => {
    try {
      setLoading(true)
      
      // 1. Fetch Lead and Profiles
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select(`
          *,
          properties (landlord_id)
        `)
        .eq('id', leadId)
        .single()

      if (leadError) throw leadError
      const lead = leadData as any

      const renterId = lead.renter_id
      const landlordId = lead.properties.landlord_id

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', [renterId, landlordId])

      if (profileError) throw profileError

      const renterProfile = (profileData as any[]).find(p => p.id === renterId)
      const landlordProfile = (profileData as any[]).find(p => p.id === landlordId)
      
      setProfiles({ renter: renterProfile, landlord: landlordProfile })

      // 2. Fetch Messages
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true })

      if (messageError) throw messageError

      setMessages(messageData || [])
    } catch (error) {
      console.error('Error fetching chat details:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat:${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((prev) => [...prev, newMessage])
          // Scroll to bottom
          setTimeout(() => {
            flashListRef.current?.scrollToEnd({ animated: true })
          }, 100)
        }
      )
      .subscribe()
  }

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return

    try {
      setSending(true)
      const { error } = await supabase.from('messages').insert({
        lead_id: leadId,
        sender_id: currentUserId,
        content: inputText.trim(),
      } as any)

      if (error) throw error
      setInputText('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const renderMessage = ({ item }: { item: MessageWithProfile }) => {
    const isMe = item.sender_id === currentUserId
    const timestamp = new Date(item.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })

    return (
      <View style={styles.messageWrapper}>
        <ChatBubble message={item.content} isSender={isMe} timestamp={timestamp} />
      </View>
    )
  }

  const otherParticipant = currentUserId === profiles.renter?.id ? profiles.landlord : profiles.renter

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.profileInfo}>
          {otherParticipant?.avatar_url ? (
            <Image source={{ uri: otherParticipant.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {otherParticipant?.full_name?.[0] || '?'}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.profileName}>{otherParticipant?.full_name || 'User'}</Text>
            <Text style={styles.profileStatus}>Online</Text>
          </View>
        </View>
      </View>

      {/* Message List */}
      <View style={{ flex: 1 }}>
        <FlatList
          ref={flashListRef}
          data={messages}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flashListRef.current?.scrollToEnd({ animated: false })}
          keyExtractor={(item) => item.id}
        />
      </View>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              inputText.trim().length > 0 && styles.inputActive,
            ]}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '600',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  profileStatus: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 8,
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 8,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputActive: {
    borderColor: COLORS.accent,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.muted,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
})
