import { supabase } from '../lib/supabase'
import type { Profile, ProfileUpdate } from '../types/database'
import { processImageForUpload, uploadImageToStorage } from '../utils/images'
import { pickAvatarImage } from '../utils/images'

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('fetchProfile error:', error)
    return null
  }

  return data as Profile
}

export async function updateProfile(
  userId: string,
  updates: Pick<ProfileUpdate, 'first_name' | 'last_name' | 'phone_number' | 'bio' | 'avatar_url'>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function uploadAvatar(
  userId: string
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  const picked = await pickAvatarImage()
  if (!picked) {
    return { success: false, error: 'No image selected' }
  }

  const processed = await processImageForUpload(picked.uri)
  const path = `${userId}/avatar.jpg`

  const result = await uploadImageToStorage(processed, 'avatars', path)

  if (result.success && result.publicUrl) {
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: result.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }
  }

  return result
}
