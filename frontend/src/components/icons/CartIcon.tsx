type CartIconProps = {
  size?: number;
  title?: string;
};

export function CartIcon({ size = 22, title = 'Panier' }: CartIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
      role="img"
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M6 6h15l-2 8H8L6 6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6 6 5 3H2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill="currentColor"
      />
    </svg>
  );
}
