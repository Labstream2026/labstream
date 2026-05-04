import { ArrowUpRight, Clock, Globe, Play } from "@/components/Icons";
import {
  detectEmbedKind,
  driveFilePreviewIframeUrl,
  vimeoEmbedUrl,
  youtubeEmbedUrl,
  extractDriveFileId,
  extractVimeoId,
  extractYouTubeId,
} from "@/lib/google-drive";
import { EmbedKind } from "@prisma/client";

type HeroProps = {
  eyebrow?: string;
  badgeTag?: string;
  badgeText?: string;
  headline: string;
  subtitle: string;
  ctaPrimary?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  stats?: { num: string; label: string }[];
  partnersLabel?: string;
  partners?: string[];
  backgroundImage?: string;
  backgroundVideo?: string;
  overlayOpacity?: number;
};

function BlurText({
  text,
  delay = 0,
}: {
  text: string;
  delay?: number;
}) {
  return (
    <p className="flex flex-wrap justify-center font-heading italic text-white">
      {text.split(" ").map((w, i) => (
        <span
          key={i}
          className="anim-word"
          style={{
            marginRight: "0.42em",
            animationDelay: `${delay + i * 0.1}s`,
            fontSize: "clamp(48px,7.5vw,96px)",
            lineHeight: 0.88,
            letterSpacing: "-2px",
          }}
        >
          {w}
        </span>
      ))}
    </p>
  );
}

export function Hero({
  badgeTag = "Nuevo",
  badgeText = "Showreel 2026 · Producción potenciada por IA",
  headline,
  subtitle,
  ctaPrimary = { label: "Empieza tu proyecto", href: "/#contact" },
  ctaSecondary = { label: "Ver Showreel", href: "#" },
  stats = [],
  partnersLabel,
  partners = [],
  backgroundImage,
  backgroundVideo,
  overlayOpacity = 60,
}: HeroProps) {
  // Detectar tipo de video si se pasó URL
  const videoEmbed = backgroundVideo
    ? buildBackgroundVideoEmbed(backgroundVideo)
    : null;
  const hasMedia = Boolean(backgroundImage) || Boolean(videoEmbed);
  const overlayAlpha = Math.min(Math.max(overlayOpacity, 0), 100) / 100;

  return (
    <section
      id="home"
      className="relative w-full overflow-hidden"
      style={{ minHeight: "100vh", background: "#000" }}
    >
      {/* Imagen de fondo */}
      {backgroundImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      )}

      {/* Video de fondo */}
      {videoEmbed?.kind === "iframe" && (
        <iframe
          src={videoEmbed.url}
          className="absolute inset-0 h-full w-full"
          style={{ border: 0, pointerEvents: "none" }}
          allow="autoplay; encrypted-media"
          title="Hero background video"
        />
      )}
      {videoEmbed?.kind === "video" && (
        <video
          src={videoEmbed.url}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Gradient default si no hay media */}
      {!hasMedia && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at top, rgba(232,100,12,0.12), transparent 60%), radial-gradient(ellipse at bottom right, rgba(123,97,255,0.08), transparent 50%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.65) 100%)",
            }}
          />
        </>
      )}

      {/* Overlay encima del media para contraste de texto */}
      {hasMedia && (
        <div
          className="absolute inset-0"
          style={{ background: `rgba(0,0,0,${overlayAlpha})` }}
        />
      )}

      <div className="relative z-10 flex min-h-screen flex-col">
        <div
          className="flex flex-1 flex-col items-center justify-center px-6 text-center"
          style={{ padding: "7rem 24px 3rem" }}
        >
          <div
            className="lg anim-in mb-8 flex items-center gap-2 rounded-full p-1"
            style={{ animationDelay: "0.3s" }}
          >
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black">
              {badgeTag}
            </span>
            <span className="pr-3 text-[13px] text-white/90">{badgeText}</span>
          </div>

          <BlurText text={headline} delay={0.35} />

          <p
            className="anim-in mt-6 font-light text-white/85"
            style={{
              fontSize: "clamp(15px,1.3vw,18px)",
              maxWidth: 560,
              lineHeight: 1.55,
              animationDelay: "0.85s",
            }}
          >
            {subtitle}
          </p>

          <div
            className="anim-in mt-8 flex flex-wrap items-center justify-center gap-6"
            style={{ animationDelay: "1.1s" }}
          >
            <a
              href={ctaPrimary.href}
              className="lg-strong flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold text-white"
            >
              {ctaPrimary.label}
              <ArrowUpRight />
            </a>
            <a
              href={ctaSecondary.href}
              className="flex items-center gap-2 text-[14px] font-medium text-white/90"
            >
              {ctaSecondary.label}
              <Play />
            </a>
          </div>

          {stats.length > 0 && (
            <div
              className="anim-in mt-14 flex flex-wrap justify-center gap-4"
              style={{ animationDelay: "1.3s" }}
            >
              {stats.map((s, i) => (
                <div
                  key={i}
                  className="lg rounded-2xl p-5 text-left"
                  style={{ width: 230 }}
                >
                  <div className="mb-3 text-white">
                    {i === 0 ? <Clock /> : <Globe />}
                  </div>
                  <div
                    className="font-heading italic text-white"
                    style={{
                      fontSize: 40,
                      lineHeight: 1,
                      letterSpacing: "-1px",
                    }}
                  >
                    {s.num}
                  </div>
                  <div className="mt-2 text-[12px] font-light leading-tight text-white/80">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {partners.length > 0 && (
          <div
            className="anim-in flex flex-col items-center gap-3.5 pb-8"
            style={{ animationDelay: "1.5s" }}
          >
            {partnersLabel && (
              <div className="lg rounded-full px-4 py-1 text-[11px] font-medium text-white/70">
                {partnersLabel}
              </div>
            )}
            <div
              className="flex flex-wrap items-center justify-center px-6"
              style={{ gap: "0 48px", rowGap: 8 }}
            >
              {partners.map((p, i) => (
                <span
                  key={i}
                  className="font-heading italic text-white/85"
                  style={{
                    fontSize: "clamp(22px,2.8vw,34px)",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Construye URL de video para usar como fondo del hero.
 * Soporta YouTube, Vimeo, Drive file, .mp4 directo.
 * Para YouTube/Vimeo agrega params de autoplay/muted/loop sin controles.
 */
function buildBackgroundVideoEmbed(
  url: string,
): { kind: "iframe" | "video"; url: string } | null {
  const detected = detectEmbedKind(url);

  if (detected.kind === EmbedKind.YOUTUBE) {
    const id = extractYouTubeId(url);
    if (!id) return null;
    return {
      kind: "iframe",
      url: `${youtubeEmbedUrl(id)}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&showinfo=0&modestbranding=1`,
    };
  }
  if (detected.kind === EmbedKind.VIMEO) {
    const id = extractVimeoId(url);
    if (!id) return null;
    return {
      kind: "iframe",
      url: `${vimeoEmbedUrl(id)}?autoplay=1&muted=1&loop=1&background=1`,
    };
  }
  if (detected.kind === EmbedKind.DRIVE_FILE) {
    const id = extractDriveFileId(url);
    if (!id) return null;
    // Drive preview no tiene parámetros para autoplay/muted; queda con controles
    return { kind: "iframe", url: driveFilePreviewIframeUrl(id) };
  }
  if (detected.kind === EmbedKind.DIRECT_VIDEO) {
    return { kind: "video", url };
  }
  return null;
}
