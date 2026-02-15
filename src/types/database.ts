export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'renter' | 'landlord' | 'agent'
export type PropertyStatus = 'active' | 'rented' | 'paused'
export type LeaseStatus = 'pending' | 'active' | 'completed' | 'cancelled'
export type LeadStatus = 'Interested' | 'Contacted' | 'Viewing Scheduled' | 'Lease Sent' | 'Deposit Paid'
export type PaymentType = 'deposit' | 'rent' | 'commission'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type RatingCategory = 'property' | 'renter'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: []
      }
      properties: {
        Row: Property
        Insert: PropertyInsert
        Update: PropertyUpdate
        Relationships: []
      }
      leases: {
        Row: Lease
        Insert: LeaseInsert
        Update: LeaseUpdate
        Relationships: []
      }
      leads: {
        Row: Lead
        Insert: LeadInsert
        Update: LeadUpdate
        Relationships: []
      }
      messages: {
        Row: Message
        Insert: MessageInsert
        Update: MessageUpdate
        Relationships: []
      }
      notifications: {
        Row: Notification
        Insert: NotificationInsert
        Update: NotificationUpdate
        Relationships: []
      }
      commissions: {
        Row: Commission
        Insert: CommissionInsert
        Update: CommissionUpdate
        Relationships: []
      }
      ratings: {
        Row: Rating
        Insert: RatingInsert
        Update: RatingUpdate
        Relationships: []
      }
      audit_logs: {
        Row: AuditLog
        Insert: AuditLogInsert
        Update: AuditLogUpdate
        Relationships: []
      }
      api_usage: {
        Row: ApiUsage
        Insert: ApiUsageInsert
        Update: ApiUsageUpdate
        Relationships: []
      }
      payments: {
        Row: Payment
        Insert: PaymentInsert
        Update: PaymentUpdate
        Relationships: []
      }
      saved_properties: {
        Row: SavedProperty
        Insert: SavedPropertyInsert
        Update: SavedPropertyUpdate
        Relationships: []
      }
    }
    Views: {
      [_: string]: never
    }
    Functions: {
      [_: string]: never
    }
    Enums: {
      user_role: UserRole
      property_status: PropertyStatus
      lead_status: LeadStatus
    }
    CompositeTypes: {
      [_: string]: never
    }
  }
}

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone_number: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id: string
  role?: UserRole
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone_number?: string | null
  bio?: string | null
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  id?: string
  role?: UserRole
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone_number?: string | null
  bio?: string | null
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface Property {
  id: string
  landlord_id: string
  agent_id: string | null
  address: string
  city: string
  latitude: number | null
  longitude: number | null
  property_type: string
  bedrooms: number
  bathrooms: number
  monthly_rent_mxn: number
  status: PropertyStatus
  description: string | null
  house_rules: string | null
  amenities: string[]
  photos: string[]
  available_from: string | null
  created_at: string
  updated_at: string
}

export interface PropertyInsert {
  id?: string
  landlord_id: string
  agent_id?: string | null
  address: string
  city: string
  latitude?: number | null
  longitude?: number | null
  property_type: string
  bedrooms: number
  bathrooms: number
  monthly_rent_mxn: number
  status?: PropertyStatus
  description?: string | null
  house_rules?: string | null
  amenities?: string[]
  photos?: string[]
  available_from?: string | null
  created_at?: string
  updated_at?: string
}

export interface PropertyUpdate {
  id?: string
  landlord_id?: string
  agent_id?: string | null
  address?: string
  city?: string
  latitude?: number | null
  longitude?: number | null
  property_type?: string
  bedrooms?: number
  bathrooms?: number
  monthly_rent_mxn?: number
  status?: PropertyStatus
  description?: string | null
  house_rules?: string | null
  amenities?: string[]
  photos?: string[]
  available_from?: string | null
  created_at?: string
  updated_at?: string
}

export interface Lease {
  id: string
  property_id: string
  renter_id: string
  start_date: string
  end_date: string
  status: string
  monthly_rent: number | null
  deposit_amount: number | null
  envelope_id: string | null
  signature_url: string | null
  document_url: string | null
  signed_at: string | null
  created_at: string
  updated_at: string
}

export interface LeaseInsert {
  id?: string
  property_id: string
  renter_id: string
  start_date: string
  end_date: string
  status?: string
  monthly_rent?: number | null
  deposit_amount?: number | null
  envelope_id?: string | null
  signature_url?: string | null
  document_url?: string | null
  signed_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface LeaseUpdate {
  id?: string
  property_id?: string
  renter_id?: string
  start_date?: string
  end_date?: string
  status?: string
  monthly_rent?: number | null
  deposit_amount?: number | null
  envelope_id?: string | null
  signature_url?: string | null
  document_url?: string | null
  signed_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface Lead {
  id: string
  property_id: string
  renter_id: string
  status: LeadStatus
  message: string | null
  created_at: string
  updated_at: string
}

export interface LeadInsert {
  id?: string
  property_id: string
  renter_id: string
  status?: LeadStatus
  message?: string | null
  created_at?: string
  updated_at?: string
}

export interface LeadUpdate {
  id?: string
  property_id?: string
  renter_id?: string
  status?: LeadStatus
  message?: string | null
  created_at?: string
  updated_at?: string
}

export interface Message {
  id: string
  lead_id: string
  sender_id: string
  content: string
  created_at: string
}

export interface MessageInsert {
  id?: string
  lead_id: string
  sender_id: string
  content: string
  created_at?: string
}

export interface MessageUpdate {
  id?: string
  lead_id?: string
  sender_id?: string
  content?: string
  created_at?: string
}

export type NotificationType = 'new_message' | 'lead_update' | 'lease_signed'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  content: string
  metadata: Json
  is_read: boolean
  created_at: string
}

export interface NotificationInsert {
  id?: string
  user_id: string
  type: NotificationType
  title: string
  content: string
  metadata?: Json
  is_read?: boolean
  created_at?: string
}

export interface NotificationUpdate {
  id?: string
  user_id?: string
  type?: NotificationType
  title?: string
  content?: string
  metadata?: Json
  is_read?: boolean
  created_at?: string
}

export interface Commission {
  id: string
  lease_id: string
  agent_id: string
  amount_mxn: number
  status: string
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface CommissionInsert {
  id?: string
  lease_id: string
  agent_id: string
  amount_mxn: number
  status?: string
  paid_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface CommissionUpdate {
  id?: string
  property_id?: string
  agent_id?: string
  amount_mxn?: number
  status?: string
  paid_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface Rating {
  id: string
  property_id: string | null
  renter_id: string | null
  rater_id: string
  category: RatingCategory
  rating: number
  comment: string | null
  created_at: string
}

export interface RatingInsert {
  id?: string
  property_id?: string | null
  renter_id?: string | null
  rater_id: string
  category: RatingCategory
  rating: number
  comment?: string | null
  created_at?: string
}

export interface RatingUpdate {
  id?: string
  property_id?: string | null
  renter_id?: string | null
  rater_id?: string
  category?: RatingCategory
  rating?: number
  comment?: string | null
  created_at?: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  target_id: string | null
  metadata: Json
  created_at: string
}

export interface AuditLogInsert {
  id?: string
  actor_id?: string | null
  action: string
  target_id?: string | null
  metadata?: Json
  created_at?: string
}

export interface AuditLogUpdate {
  id?: string
  actor_id?: string | null
  action?: string
  target_id?: string | null
  metadata?: Json
  created_at?: string
}

export interface ApiUsage {
  id: string
  user_id: string
  created_at: string
}

export interface ApiUsageInsert {
  id?: string
  user_id: string
  created_at?: string
}

export interface ApiUsageUpdate {
  id?: string
  user_id?: string
  created_at?: string
}

export interface Payment {
  id: string
  lease_id: string
  lead_id: string | null
  payer_id: string
  recipient_id: string
  amount_mxn: number
  payment_type: PaymentType
  status: PaymentStatus
  stripe_payment_intent_id: string | null
  created_at: string
  updated_at: string
}

export interface PaymentInsert {
  id?: string
  lease_id: string
  lead_id?: string | null
  payer_id: string
  recipient_id: string
  amount_mxn: number
  payment_type?: PaymentType
  status?: PaymentStatus
  stripe_payment_intent_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface PaymentUpdate {
  id?: string
  lease_id?: string
  lead_id?: string | null
  payer_id?: string
  recipient_id?: string
  amount_mxn?: number
  payment_type?: PaymentType
  status?: PaymentStatus
  stripe_payment_intent_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface SavedProperty {
  id: string
  user_id: string
  property_id: string
  created_at: string
}

export interface SavedPropertyInsert {
  id?: string
  user_id: string
  property_id: string
  created_at?: string
}

export interface SavedPropertyUpdate {
  id?: string
  user_id?: string
  property_id?: string
  created_at?: string
}
