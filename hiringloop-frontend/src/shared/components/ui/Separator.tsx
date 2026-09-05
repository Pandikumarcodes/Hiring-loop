import * as RadixSeparator from '@radix-ui/react-separator'
import { cn } from '../../utils/cn'
export function Separator({
  className,
  ...props
}: RadixSeparator.SeparatorProps) {
  return (
    <RadixSeparator.Root
      decorative
      className={cn('h-px bg-border', className)}
      {...props}
    />
  )
}
