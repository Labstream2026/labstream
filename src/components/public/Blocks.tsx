import Link from "next/link";
import type { Block } from "@prisma/client";
import { Hero } from "@/components/public/Hero";
import { Carousel } from "@/components/public/Carousel";
import { ArrowUpRight } from "@/components/Icons";
import { youtubeOrVimeoEmbedUrl, type BlockType } from "@/lib/blocks";

type Stats = { items: { value: string; label: string }[] };
type RichText = {
  eyebrow?: string;
  heading?: string;
  body: string;
  align?: "left" | "center";
};
type Gallery = {
  eyebrow?: string;
  heading?: string;
  images: { url: string; alt?: string; caption?: string }[];
  columns?: number;
};
type VideoEmbed = {
  eyebrow?: string;
  heading?: string;
  url: string;
  caption?: string;
};
type Cta = {
  eyebrow?: string;
  title: string;
  body?: string;
  ctaLabel: string;
  ctaHref: string;
};
type FeatureList = {
  eyebrow?: string;
  heading?: string;
  items: { icon?: string; title: string; desc?: string }[];
  columns?: number;
};
type ImageBlock = {
  url: string;
  alt?: string;
  caption?: string;
  fullWidth?: boolean;
};

type Carousel = {
  eyebrow?: string;
  heading?: string;
  slides: { url: string; alt?: string; caption?: string; linkHref?: string }[];
  autoplay?: boolean;
  intervalSeconds?: number;
  loop?: boolean;
  indicators?: boolean;
  aspectRatio?: "16/9" | "4/3" | "1/1" | "21/9";
};

export function BlockRenderer({ block }: { block: Block }) {
  if (!block.visible) return null;
  const type = block.type as BlockType;
  const data = block.data as Record<string, unknown>;

  switch (type) {
    case "hero":
      return <HeroFromBlock data={data} />;
    case "stats":
      return null; // stats render se maneja en el hero composite — para custom: usar StatsSection
    case "richText":
      return <RichTextSection data={data as unknown as RichText} />;
    case "gallery":
      return <GallerySection data={data as unknown as Gallery} />;
    case "videoEmbed":
      return <VideoSection data={data as unknown as VideoEmbed} />;
    case "cta":
      return <CtaSection data={data as unknown as Cta} />;
    case "featureList":
      return <FeatureListSection data={data as unknown as FeatureList} />;
    case "image":
      return <ImageSection data={data as unknown as ImageBlock} />;
    case "carousel":
      return <CarouselSection data={data as unknown as Carousel} />;
    default:
      return null;
  }
}

function HeroFromBlock({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    ctaLabel?: string;
    ctaHref?: string;
    secondaryLabel?: string;
    secondaryHref?: string;
    backgroundImage?: string;
    backgroundVideo?: string;
    overlayOpacity?: number;
  };
  return (
    <Hero
      headline={d.title ?? ""}
      subtitle={d.subtitle ?? ""}
      ctaPrimary={
        d.ctaLabel
          ? { label: d.ctaLabel, href: d.ctaHref ?? "#" }
          : { label: "Empieza tu proyecto", href: "/#contact" }
      }
      ctaSecondary={
        d.secondaryLabel
          ? { label: d.secondaryLabel, href: d.secondaryHref ?? "#" }
          : { label: "Ver Showreel", href: "#" }
      }
      badgeText={d.eyebrow ?? "Showreel 2026 · Producción potenciada por IA"}
      backgroundImage={d.backgroundImage}
      backgroundVideo={d.backgroundVideo}
      overlayOpacity={d.overlayOpacity}
    />
  );
}

function SectionWrap({
  children,
  bg = "var(--bg)",
}: {
  children: React.ReactNode;
  bg?: string;
}) {
  return (
    <section className="px-6 py-24" style={{ background: bg }}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function Eyebrow({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="mb-3 text-[12px] font-mono tracking-widest text-orange">
      {text.startsWith("//") ? text : `// ${text}`}
    </div>
  );
}

function RichTextSection({ data }: { data: RichText }) {
  const align = data.align ?? "left";
  const paragraphs = (data.body ?? "").split(/\n\s*\n/).filter(Boolean);

  return (
    <SectionWrap>
      <div
        className={`mx-auto max-w-3xl ${align === "center" ? "text-center" : ""}`}
      >
        <Eyebrow text={data.eyebrow} />
        {data.heading && (
          <h2
            className="mb-6 font-heading text-white"
            style={{
              fontSize: "clamp(32px,4.5vw,56px)",
              lineHeight: 1.05,
              letterSpacing: "-1px",
            }}
          >
            {data.heading}
          </h2>
        )}
        <div className="flex flex-col gap-4 text-[16px] font-light leading-relaxed text-white/75">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </SectionWrap>
  );
}

function GallerySection({ data }: { data: Gallery }) {
  if (!data.images?.length) return null;
  const cols = Math.min(Math.max(data.columns ?? 3, 1), 4);
  const gridCls =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
        ? "grid-cols-1 md:grid-cols-2"
        : cols === 3
          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  return (
    <SectionWrap bg="var(--bg-2)">
      {(data.eyebrow || data.heading) && (
        <div className="mb-10 text-center">
          <Eyebrow text={data.eyebrow} />
          {data.heading && (
            <h2
              className="font-heading text-white"
              style={{
                fontSize: "clamp(32px,4.5vw,56px)",
                lineHeight: 1.05,
                letterSpacing: "-1px",
              }}
            >
              {data.heading}
            </h2>
          )}
        </div>
      )}
      <div className={`grid gap-4 ${gridCls}`}>
        {data.images.map((img, i) => (
          <figure
            key={i}
            className="lg overflow-hidden rounded-2xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt ?? ""}
              className="aspect-[4/3] w-full object-cover"
            />
            {img.caption && (
              <figcaption className="px-4 py-3 text-[12px] text-white/65">
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </SectionWrap>
  );
}

function VideoSection({ data }: { data: VideoEmbed }) {
  const embed = youtubeOrVimeoEmbedUrl(data.url);

  return (
    <SectionWrap>
      {(data.eyebrow || data.heading) && (
        <div className="mb-8 text-center">
          <Eyebrow text={data.eyebrow} />
          {data.heading && (
            <h2
              className="font-heading text-white"
              style={{
                fontSize: "clamp(32px,4.5vw,56px)",
                lineHeight: 1.05,
                letterSpacing: "-1px",
              }}
            >
              {data.heading}
            </h2>
          )}
        </div>
      )}
      <div
        className="lg overflow-hidden rounded-3xl"
        style={{ aspectRatio: "16/9" }}
      >
        {embed ? (
          <iframe
            src={embed}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <video
            src={data.url}
            controls
            className="h-full w-full bg-black object-cover"
          />
        )}
      </div>
      {data.caption && (
        <p className="mt-3 text-center text-[13px] text-white/55">
          {data.caption}
        </p>
      )}
    </SectionWrap>
  );
}

function CtaSection({ data }: { data: Cta }) {
  return (
    <SectionWrap>
      <div className="lg flex flex-wrap items-center justify-between gap-6 rounded-3xl p-10">
        <div className="max-w-xl">
          <Eyebrow text={data.eyebrow} />
          <h2
            className="font-heading text-white"
            style={{
              fontSize: "clamp(28px,4vw,48px)",
              lineHeight: 1.05,
              letterSpacing: "-0.5px",
            }}
          >
            {data.title}
          </h2>
          {data.body && (
            <p className="mt-3 text-[15px] font-light text-white/70">
              {data.body}
            </p>
          )}
        </div>
        {data.ctaLabel && (
          <Link href={data.ctaHref || "#"} className="btn-primary">
            {data.ctaLabel}
            <ArrowUpRight />
          </Link>
        )}
      </div>
    </SectionWrap>
  );
}

function FeatureListSection({ data }: { data: FeatureList }) {
  if (!data.items?.length) return null;
  const cols = Math.min(Math.max(data.columns ?? 3, 1), 4);
  const gridCls =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
        ? "grid-cols-1 md:grid-cols-2"
        : cols === 3
          ? "grid-cols-1 md:grid-cols-3"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  return (
    <SectionWrap bg="var(--bg-2)">
      <div className="mb-10 text-center">
        <Eyebrow text={data.eyebrow} />
        {data.heading && (
          <h2
            className="font-heading text-white"
            style={{
              fontSize: "clamp(32px,4.5vw,56px)",
              lineHeight: 1.05,
              letterSpacing: "-1px",
            }}
          >
            {data.heading}
          </h2>
        )}
      </div>
      <div className={`grid gap-4 ${gridCls}`}>
        {data.items.map((it, i) => (
          <div key={i} className="lg rounded-2xl p-6">
            {it.icon && <div className="mb-3 text-3xl">{it.icon}</div>}
            <h3 className="mb-1.5 text-[16px] font-semibold text-white">
              {it.title}
            </h3>
            {it.desc && (
              <p className="text-[13px] font-light leading-relaxed text-white/65">
                {it.desc}
              </p>
            )}
          </div>
        ))}
      </div>
    </SectionWrap>
  );
}

function ImageSection({ data }: { data: ImageBlock }) {
  if (!data.url) return null;
  return (
    <SectionWrap>
      <figure
        className={`mx-auto ${data.fullWidth ? "" : "max-w-4xl"} lg overflow-hidden rounded-2xl`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.url}
          alt={data.alt ?? ""}
          className="w-full object-cover"
        />
        {data.caption && (
          <figcaption className="px-5 py-3 text-center text-[13px] text-white/65">
            {data.caption}
          </figcaption>
        )}
      </figure>
    </SectionWrap>
  );
}

function CarouselSection({ data }: { data: Carousel }) {
  if (!data.slides || data.slides.length === 0) return null;
  return (
    <SectionWrap>
      {(data.eyebrow || data.heading) && (
        <div className="mb-8 text-center">
          <Eyebrow text={data.eyebrow} />
          {data.heading && (
            <h2
              className="font-heading text-white"
              style={{
                fontSize: "clamp(32px,4.5vw,56px)",
                lineHeight: 1.05,
                letterSpacing: "-1px",
              }}
            >
              {data.heading}
            </h2>
          )}
        </div>
      )}
      <Carousel
        slides={data.slides}
        autoplay={data.autoplay}
        intervalSeconds={data.intervalSeconds}
        loop={data.loop}
        indicators={data.indicators}
        aspectRatio={data.aspectRatio}
      />
    </SectionWrap>
  );
}
