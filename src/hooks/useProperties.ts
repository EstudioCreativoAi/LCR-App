import { useState, useEffect, useCallback } from 'react'
import * as propertyService from '../services/propertyService'
import type {
  PropertyWithImages,
  PropertyFilters,
  CreatePropertyParams,
} from '../services/propertyService'

export interface UsePropertiesReturn {
  properties: PropertyWithImages[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  fetchWithFilters: (filters: PropertyFilters) => Promise<void>
}

export function useProperties(initialFilters?: PropertyFilters): UsePropertiesReturn {
  const [properties, setProperties] = useState<PropertyWithImages[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PropertyFilters | undefined>(initialFilters)

  const fetchProperties = useCallback(async (currentFilters?: PropertyFilters) => {
    setIsLoading(true)
    setError(null)

    const result = await propertyService.fetchProperties(currentFilters)

    if (result.success && result.data) {
      setProperties(result.data)
    } else {
      setError(result.error ?? 'Failed to fetch properties')
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchProperties(filters)
  }, [])

  const refetch = useCallback(async () => {
    await fetchProperties(filters)
  }, [fetchProperties, filters])

  const fetchWithFilters = useCallback(async (newFilters: PropertyFilters) => {
    setFilters(newFilters)
    await fetchProperties(newFilters)
  }, [fetchProperties])

  return {
    properties,
    isLoading,
    error,
    refetch,
    fetchWithFilters,
  }
}

export interface UsePropertyReturn {
  property: PropertyWithImages | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useProperty(propertyId: string | null): UsePropertyReturn {
  const [property, setProperty] = useState<PropertyWithImages | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProperty = useCallback(async () => {
    if (!propertyId) {
      setProperty(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await propertyService.fetchPropertyById(propertyId)

    if (result.success && result.data) {
      setProperty(result.data)
    } else {
      setError(result.error ?? 'Failed to fetch property')
    }

    setIsLoading(false)
  }, [propertyId])

  useEffect(() => {
    fetchProperty()
  }, [fetchProperty])

  const refetch = useCallback(async () => {
    await fetchProperty()
  }, [fetchProperty])

  return {
    property,
    isLoading,
    error,
    refetch,
  }
}

export interface UseMyPropertiesReturn {
  properties: PropertyWithImages[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createProperty: (params: CreatePropertyParams) => Promise<string | null>
  deleteProperty: (propertyId: string) => Promise<boolean>
}

export function useMyProperties(ownerId: string | null): UseMyPropertiesReturn {
  const [properties, setProperties] = useState<PropertyWithImages[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProperties = useCallback(async () => {
    if (!ownerId) {
      setProperties([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await propertyService.fetchPropertiesByOwner(ownerId)

    if (result.success && result.data) {
      setProperties(result.data)
    } else {
      setError(result.error ?? 'Failed to fetch properties')
    }

    setIsLoading(false)
  }, [ownerId])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  const refetch = useCallback(async () => {
    await fetchProperties()
  }, [fetchProperties])

  const createProperty = useCallback(async (params: CreatePropertyParams): Promise<string | null> => {
    const result = await propertyService.createProperty(params)

    if (result.success && result.data) {
      await refetch()
      return result.data.id
    }

    setError(result.error ?? 'Failed to create property')
    return null
  }, [refetch])

  const deleteProperty = useCallback(async (propertyId: string): Promise<boolean> => {
    const result = await propertyService.deleteProperty(propertyId)

    if (result.success) {
      setProperties((prev) => prev.filter((p) => p.id !== propertyId))
      return true
    }

    setError(result.error ?? 'Failed to delete property')
    return false
  }, [])

  return {
    properties,
    isLoading,
    error,
    refetch,
    createProperty,
    deleteProperty,
  }
}
