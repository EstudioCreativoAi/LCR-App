import { useState, useEffect, useCallback } from 'react'
import * as savedPropertyService from '../services/savedPropertyService'
import type { SavedPropertyWithDetails } from '../services/savedPropertyService'

export interface UseSavedPropertiesReturn {
  savedProperties: SavedPropertyWithDetails[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  toggleSave: (propertyId: string) => Promise<boolean>
  isPropertySaved: (propertyId: string) => boolean
}

export function useSavedProperties(userId: string | null): UseSavedPropertiesReturn {
  const [savedProperties, setSavedProperties] = useState<SavedPropertyWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSaved = useCallback(async () => {
    if (!userId) {
      setSavedProperties([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await savedPropertyService.fetchSavedProperties(userId)

    if (result.success && result.data) {
      setSavedProperties(result.data)
    } else {
      setError(result.error ?? 'Failed to fetch saved properties')
    }

    setIsLoading(false)
  }, [userId])

  useEffect(() => {
    fetchSaved()
  }, [fetchSaved])

  const refetch = useCallback(async () => {
    await fetchSaved()
  }, [fetchSaved])

  const toggleSave = useCallback(async (propertyId: string): Promise<boolean> => {
    if (!userId) return false

    const alreadySaved = savedProperties.some((sp) => sp.property_id === propertyId)

    if (alreadySaved) {
      setSavedProperties((prev) => prev.filter((sp) => sp.property_id !== propertyId))

      const result = await savedPropertyService.unsaveProperty(userId, propertyId)
      if (!result.success) {
        await refetch()
        setError(result.error ?? 'Failed to unsave property')
        return false
      }
    } else {
      const result = await savedPropertyService.saveProperty(userId, propertyId)
      if (!result.success) {
        setError(result.error ?? 'Failed to save property')
        return false
      }
      await refetch()
    }

    return true
  }, [userId, savedProperties, refetch])

  const isPropertySavedCheck = useCallback((propertyId: string): boolean => {
    return savedProperties.some((sp) => sp.property_id === propertyId)
  }, [savedProperties])

  return {
    savedProperties,
    isLoading,
    error,
    refetch,
    toggleSave,
    isPropertySaved: isPropertySavedCheck,
  }
}
