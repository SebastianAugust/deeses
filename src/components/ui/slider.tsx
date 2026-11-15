import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "cn"

// Disesuaikan untuk Kosjati: track 6px warna line, isi accent, thumb 24px
// dengan area sentuh 44px (after:-inset-2.5). Track bisa diklik (pointer),
// thumb grab/grabbing; focus-visible ring 2px accent (bukan outline-hidden).
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex min-h-7 w-full cursor-pointer touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-line select-none data-horizontal:h-1.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-1.5"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            // Kursor grab/grabbing & focus ring (2px accent) diatur di globals.css.
            className="relative block size-6 shrink-0 cursor-grab rounded-full border-2 border-primary bg-white shadow-[0_2px_6px_rgba(30,45,90,.18)] ring-ring/30 transition-[color,box-shadow] duration-150 ease-out select-none after:absolute after:-inset-2.5 hover:ring-4 active:cursor-grabbing active:ring-4 data-dragging:cursor-grabbing data-dragging:ring-4 disabled:cursor-not-allowed disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
