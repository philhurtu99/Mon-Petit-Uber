type CommandeIconProps = {
  size?: number;
  title?: string;
};

export function CommandeIcon({ size = 22, title = 'Commandes' }: CommandeIconProps) {
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
      <circle cx="5.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 17.5H16M15 17.5V9l-3-3H8L6 9l-.5 3H3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 9h3l1.5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}