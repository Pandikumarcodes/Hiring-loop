import * as RadixLabel from '@radix-ui/react-label'
import { cn } from '../../utils/cn'
export function Label({ className, ...props }: RadixLabel.LabelProps) {
  return (
    <RadixLabel.Root
      className={cn('text-sm font-semibold text-text-primary', className)}
      {...props}
    />
  )
}
