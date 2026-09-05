import * as RadixAvatar from '@radix-ui/react-avatar'
import { cn } from '../../utils/cn'
export function Avatar({ className, ...props }: RadixAvatar.AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-bold text-teal-800',
        className,
      )}
      {...props}
    />
  )
}
export const AvatarFallback = RadixAvatar.Fallback
export const AvatarImage = RadixAvatar.Image
