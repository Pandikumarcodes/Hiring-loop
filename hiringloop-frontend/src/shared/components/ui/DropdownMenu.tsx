import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from '../../utils/cn'
export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export function DropdownMenuContent({
  className,
  ...props
}: DropdownMenuPrimitive.DropdownMenuContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={8}
        collisionPadding={12}
        className={cn(
          'z-50 min-w-56 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-card border border-border bg-surface p-1.5 shadow-xl outline-none',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}
export function DropdownMenuItem({
  className,
  ...props
}: DropdownMenuPrimitive.DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'flex min-h-11 cursor-pointer items-center rounded-control px-3 py-2 text-sm outline-none focus:bg-primary-soft data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
export const DropdownMenuSeparator = DropdownMenuPrimitive.Separator
