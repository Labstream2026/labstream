type LogoProps = {
  size?: number;
  dark?: boolean;
};

export function Logo({ size = 1, dark = false }: LogoProps) {
  const col = dark ? "#111" : "#fff";
  return (
    <svg
      width={130 * size}
      height={32 * size}
      viewBox="0 0 130 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="22"
        fontFamily="Figtree, sans-serif"
        fontWeight="700"
        fontSize="22"
        fill={col}
        letterSpacing="-0.5"
      >
        labstream
      </text>
      <text
        x="2"
        y="31"
        fontFamily="Figtree, sans-serif"
        fontWeight="600"
        fontSize="8"
        fill="#E8640C"
        letterSpacing="4"
      >
        STUDIO
      </text>
    </svg>
  );
}
