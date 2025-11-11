import { useCallback, useEffect, useState, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StoreCarouselProps {
  banners: string[];
  storeName?: string;
  logo?: string | null;
  description?: string | null;
  primaryColor?: string;
}

export function StoreCarousel({ banners, storeName, logo, description, primaryColor }: StoreCarouselProps) {
  const autoplayRef = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: false })
  );
  
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, duration: 20 },
    [autoplayRef.current]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <div className="relative h-64 md:h-96 overflow-hidden" data-testid="store-carousel">
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {banners.map((banner, index) => (
            <div
              key={index}
              className="flex-[0_0_100%] min-w-0 relative"
              data-testid={`carousel-slide-${index}`}
            >
              <div
                className="h-full bg-cover bg-center relative"
                style={{
                  backgroundImage: `url(${banner})`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-background/50 backdrop-blur-sm hover:bg-background/80"
            onClick={scrollPrev}
            data-testid="carousel-prev"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-background/50 backdrop-blur-sm hover:bg-background/80"
            onClick={scrollNext}
            data-testid="carousel-next"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === selectedIndex
                    ? "w-8 bg-white"
                    : "w-2 bg-white/50"
                }`}
                onClick={() => emblaApi?.scrollTo(index)}
                data-testid={`carousel-dot-${index}`}
                aria-label={`Ir para slide ${index + 1}`}
                aria-current={index === selectedIndex ? "true" : "false"}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
