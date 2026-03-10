"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useInspirationCards, getCyclicGradient, EASE_OUT_EXPO } from "@travyl/shared";
import type { InspirationCard } from "@travyl/shared";

const PLACEHOLDER_CARDS: InspirationCard[] = [
  { id: 'pi-1', title: 'Amalfi Coast', destination: 'Italy', image_url: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&fit=crop' },
  { id: 'pi-2', title: 'Swiss Alps', destination: 'Switzerland', image_url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&fit=crop' },
  { id: 'pi-3', title: 'Banff National Park', destination: 'Canada', image_url: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=600&fit=crop' },
  { id: 'pi-4', title: 'Great Barrier Reef', destination: 'Australia', image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&fit=crop' },
  { id: 'pi-5', title: 'Taj Mahal', destination: 'India', image_url: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&fit=crop' },
  { id: 'pi-6', title: 'Safari Serengeti', destination: 'Tanzania', image_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&fit=crop' },
  { id: 'pi-7', title: 'Petra', destination: 'Jordan', image_url: 'https://images.unsplash.com/photo-1712323028707-6e59c3d2271a?w=600&fit=crop' },
  { id: 'pi-8', title: 'Sydney Opera House', destination: 'Australia', image_url: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=600&fit=crop' },
];

export function GetInspired() {
  const { data: dbCards } = useInspirationCards();
  const cards = dbCards?.length ? dbCards : PLACEHOLDER_CARDS;

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
            Get <em>Inspired</em>
          </h2>
          <p className="text-muted-foreground max-w-md">
            Explore popular destinations and start travyling.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((card, i) => {
            const grad = getCyclicGradient(i);
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: EASE_OUT_EXPO }}
                whileHover={{ y: -4, transition: { duration: 0.25, ease: EASE_OUT_EXPO } }}
                className="rounded-2xl overflow-hidden relative h-48 md:h-56 cursor-pointer group hover:shadow-lg transition-shadow"
                style={{
                  background: card.image_url
                    ? undefined
                    : `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
                }}
              >
                {card.image_url && (
                  <Image
                    src={card.image_url}
                    alt={card.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <div className="relative h-full flex flex-col justify-end p-4">
                  <h3 className="text-white font-semibold text-sm leading-snug">
                    {card.title}
                  </h3>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
