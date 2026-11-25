import { User } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'

export type UserAvatarSize = 'sm' | 'md' | 'lg'

export interface UserAvatarProps {
  src?: string
  name?: string
  size?: UserAvatarSize
  className?: string
}

const SIZE_CLASSES: Record<UserAvatarSize, string> = {
  sm: 'h-10 w-10 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-14 w-14 text-base',
}

function getInitials(name?: string): string {
  const trimmed = name?.trim() ?? ''
  if (!trimmed) {
    return ''
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }

  return parts[0].slice(0, 2).toUpperCase()
}

/** Circular user avatar with no-referrer photo loading and clean initials fallback. */
export function UserAvatar({
  src,
  name,
  size = 'md',
  className,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const [prevSrc, setPrevSrc] = useState(src)

  if (src !== prevSrc) {
    setPrevSrc(src)
    setImgError(false)
  }

  const initials = getInitials(name)
  const showImage = Boolean(src && !imgError)

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-spend-accent/15 text-spend-accent font-semibold select-none',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={name ?? 'Profile'}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : initials ? (
        <span aria-hidden="true">{initials}</span>
      ) : (
        <User className="h-4 w-4" aria-hidden="true" />
      )}
    </div>
  )
}
