import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { users } from '../services/api'
import type { Guide } from '../types'

interface CreatorProfile {
  id: string
  displayName: string
  initials?: string
  avatarUrl?: string
  bio?: string
  location?: string
  role: string
  stats: { followers: number; following: number; created: number }
  isFollowing: boolean
  isOwn: boolean
  recentGuides: Guide[]
}

export default function CreatorPage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (username) loadProfile()
  }, [username])

  const loadProfile = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await users.profile(username!)
      setProfile(res.data as CreatorProfile)
      setFollowing(res.data.isFollowing)
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return
      setError('Failed to load profile.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!profile || followLoading) return
    setFollowLoading(true)
    try {
      const res = await users.follow(profile.id)
      setFollowing(res.data.following)
      setProfile(prev => prev ? {
        ...prev,
        isFollowing: res.data.following,
        stats: {
          ...prev.stats,
          followers: res.data.following ? prev.stats.followers + 1 : prev.stats.followers - 1,
        },
      } : prev)
    } catch {
    } finally {
      setFollowLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white dark:bg-[#1e1e1c] border-b border-black/10 dark:border-white/9 px-4 py-3 flex items-center gap-2.5 shrink-0">
          <button onClick={() => navigate(-1)} className="w-7 h-7 flex items-center justify-center cursor-pointer rounded-lg hover:bg-[#f5f5f3]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 4L6 9l5 5"/>
            </svg>
          </button>
          <div className="flex-1 text-lg font-bold text-[#1D9E75]">profile</div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-7 h-7 border-[2.5px] border-[#e5e4e7] border-t-[#1D9E75] rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white dark:bg-[#1e1e1c] border-b border-black/10 dark:border-white/9 px-4 py-3 flex items-center gap-2.5 shrink-0">
          <button onClick={() => navigate(-1)} className="w-7 h-7 flex items-center justify-center cursor-pointer rounded-lg hover:bg-[#f5f5f3]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 4L6 9l5 5"/>
            </svg>
          </button>
          <div className="flex-1 text-lg font-bold text-[#1D9E75]">profile</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0] text-center">{error || 'User not found'}</p>
          <button onClick={loadProfile} className="px-4 py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-bold border-none cursor-pointer">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white dark:bg-[#1e1e1c] border-b border-black/10 dark:border-white/9 px-4 py-3 flex items-center gap-2.5 shrink-0">
        <button onClick={() => navigate(-1)} className="w-7 h-7 flex items-center justify-center cursor-pointer rounded-lg hover:bg-[#f5f5f3]">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 4L6 9l5 5"/>
          </svg>
        </button>
        <div className="flex-1 text-lg font-bold text-[#1D9E75]">profile</div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <div className="bg-white dark:bg-[#1e1e1c] border-b border-black/10 dark:border-white/9 px-4 py-[18px] flex flex-col gap-3 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-[58px] h-[58px] rounded-full bg-[#1D9E75] flex items-center justify-center text-[21px] font-bold text-white shrink-0">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                profile.initials?.charAt(0) || profile.displayName?.charAt(0) || '?'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold truncate">{profile.displayName}</div>
                {profile.role === 'creator' && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="#1D9E75">
                    <path d="M8 0l2.47 5.01L16 5.81l-4 3.9.94 5.49L8 12.49l-4.94 2.7L4 9.71 0 5.81l5.53-.8z"/>
                  </svg>
                )}
              </div>
              {profile.bio && <div className="text-[13px] text-[#5f5e5a] dark:text-[#a8a7a0] mt-[2px] line-clamp-2">{profile.bio}</div>}
              {profile.location && (
                <div className="flex items-center gap-1 mt-1 text-[12px] text-[#b4b2a9] dark:text-[#706f6a]">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z"/>
                    <circle cx="8" cy="6" r="1.5"/>
                  </svg>
                  {profile.location}
                </div>
              )}
            </div>
            {!profile.isOwn && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`px-4 py-[7px] rounded-full text-[13px] font-bold border-none cursor-pointer shrink-0 transition-colors ${
                  following
                    ? 'bg-[#f5f5f3] dark:bg-[#272725] text-[#5f5e5a] dark:text-[#a8a7a0] border border-black/10'
                    : 'bg-[#1D9E75] text-white'
                } ${followLoading ? 'opacity-50' : ''}`}
              >
                {followLoading ? '...' : following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          <div className="flex gap-5">
            <div><div className="text-base font-bold">{profile.stats.followers}</div><div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0]">Followers</div></div>
            <div><div className="text-base font-bold">{profile.stats.following}</div><div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0]">Following</div></div>
            <div><div className="text-base font-bold">{profile.stats.created}</div><div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0]">Guides</div></div>
          </div>
        </div>

        <div className="px-4 py-3 bg-white dark:bg-[#1e1e1c] border-b border-black/10 dark:border-white/9 shrink-0">
          <div className="text-[13px] font-bold">Published Guides</div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-[9px] min-h-0">
          {profile.recentGuides.length === 0 ? (
            <div className="text-center py-12 text-[#5f5e5a] dark:text-[#a8a7a0] text-sm">No published guides yet</div>
          ) : (
            profile.recentGuides.map((guide) => (
              <MiniGuideCard key={guide.id} guide={guide} onClick={() => navigate(`/guide/${guide.id}`)} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function MiniGuideCard({ guide, onClick }: { guide: Guide; onClick: () => void }) {
  return (
    <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-lg p-[11px] flex gap-[9px] items-center cursor-pointer hover:border-[#1D9E75] transition-colors" onClick={onClick}>
      <div className="w-[50px] h-[44px] rounded-lg bg-[#f5f5f3] dark:bg-[#272725] flex-shrink-0 overflow-hidden">
        {guide.coverImage || guide.coverImageUrl ? (
          <img src={guide.coverImage || guide.coverImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#b4b2a9] text-xs">
            {guide.city?.charAt(0) || '?'}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold truncate">{guide.title}</div>
          <div className="text-[12px] text-[#5f5e5a] dark:text-[#a8a7a0] mt-[1px]">{guide.city}</div>
      </div>
      {Number(guide.rating) > 0 && (
        <div className="text-[11px] text-[#BA7517] shrink-0">{Number(guide.rating).toFixed(1)}★</div>
      )}
    </div>
  )
}
