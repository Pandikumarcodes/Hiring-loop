import * as RadixLabel from '@radix-ui/react-label'
import { cn } from '../../utils/cn'
export function Label({ className, ...props }: RadixLabel.LabelProps) {
  return (
    <RadixLabel.Root
      className={cn(
        'text-sm font-medium leading-5 text-text-primary',
        className,
      )}
      {...props}
    />
  )
}
