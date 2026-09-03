export interface User {
  id: string
  email: string
  username: string
  displayName: string
  avatar?: string
  bio?: string
  location?: string
  isVerified: boolean
  role: 'user' | 'creator' | 'admin'
  stripeAccountId?: string
  stripeOnboarded: boolean
  createdAt: string
  updatedAt: string
}

export interface Guide {
  id: string
  creatorId: string
  title: string
  city: string
  country?: string
  description?: string
  teaser?: string
  coverImage?: string
  coverImageUrl?: string
  category: string
  tags?: string[]
  duration?: string
  distance?: string
  priceModel: 'free' | 'paid' | 'ad'
  rating: number
  isPublished: boolean
  createdAt: string
  updatedAt?: string
  distance_km?: number
  user?: User
  stops?: GuideStop[]
  costs?: GuideCost[]
  nearby?: GuideNearby[]
  resources?: GuideResource[]
}

export interface GuideStop {
  id: string
  guideId: string
  name: string
  description: string
  orderIndex: number
  latitude?: number
  longitude?: number
  audioUrl?: string
  imageUrl?: string
  videoUrl?: string
  duration?: string
}

export interface GuideCost {
  id: string
  guideId: string
  type: 'tickets' | 'meals' | 'transport'
  name: string
  price: string
  createdAt: string
}

export interface GuideNearby {
  id: string
  guideId: string
  name: string
  type: string
  distance?: string
  latitude?: number
  longitude?: number
}

export interface GuideResource {
  id: string
  guideId: string
  type: 'link' | 'video' | 'document'
  title: string
  url: string
  icon?: string
}

export interface Review {
  id: string
  userId: string
  guideId: string
  rating: number
  comment?: string
  createdAt: string
  user?: User
}

export interface Comment {
  id: string
  userId: string
  guideId: string
  parentId?: string
  content: string
  createdAt: string
  user?: User
  replies?: Comment[]
}

export interface Payment {
  id: string
  userId: string
  guideId: string
  amount: number
  currency: string
  type: 'purchase' | 'payout' | 'ad_reward'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  stripePaymentId?: string
  createdAt: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface GuideFilters {
  city?: string
  category?: string
  search?: string
  sort?: 'newest' | 'popular' | 'rating' | 'price_low' | 'price_high'
  accessModel?: string
  page?: number
  limit?: number
  lat?: number
  lng?: number
  radius?: number
}

export interface GpsPoint {
  name: string
  latitude: number
  longitude: number
  description?: string
  elevation?: number
}

export interface OfflineGuide extends Guide {
  _cachedAt?: number
}
