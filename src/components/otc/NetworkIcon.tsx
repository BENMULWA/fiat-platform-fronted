// Simplified blockchain marks drawn inline so the form never depends on an external image host.
export default function NetworkIcon({ id, className = 'w-6 h-6' }: { id: string; className?: string }) {
  const common = { viewBox: '0 0 32 32', className, 'aria-label': id } as const;
  switch (id) {
    case 'celo':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="16" fill="#FCFF52" />
          <path d="M9 23V9h14v6.2h-3.2V12.2H12.2v7.6h7.6v-2.9H23V23z" fill="#111" />
        </svg>
      );
    case 'stellar':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="16" fill="#111827" />
          <path d="M7 14.3l16.4-7.4-.8 2.1L8.6 15.5zm17.9 3.4L8.5 25.1l.8-2.1 14-6.2z" fill="#fff" />
          <circle cx="16" cy="16" r="4.2" fill="none" stroke="#fff" strokeWidth="1.6" />
        </svg>
      );
    case 'cardano':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="16" fill="#0033AD" />
          {[[16, 7], [16, 25], [8.2, 11.5], [23.8, 11.5], [8.2, 20.5], [23.8, 20.5]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#fff" />)}
          <circle cx="16" cy="16" r="2.4" fill="#fff" />
          {[[12.5, 16], [19.5, 16]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1" fill="#fff" />)}
        </svg>
      );
    case 'polygon':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="16" fill="#8247E5" />
          <path d="M20.6 12.3a1.4 1.4 0 0 0-1.4 0l-3.2 1.9-2.2 1.2-3.2 1.9a1.4 1.4 0 0 1-1.4 0l-2.5-1.5a1.4 1.4 0 0 1-.7-1.2v-2.9c0-.5.3-1 .7-1.2l2.5-1.4a1.4 1.4 0 0 1 1.4 0l2.5 1.4c.4.2.7.7.7 1.2v1.9l2.2-1.3v-1.9c0-.5-.3-1-.7-1.2l-4.6-2.7a1.4 1.4 0 0 0-1.4 0l-4.7 2.7c-.4.2-.7.7-.7 1.2v5.4c0 .5.3 1 .7 1.2l4.7 2.7a1.4 1.4 0 0 0 1.4 0l3.2-1.8 2.2-1.3 3.2-1.8a1.4 1.4 0 0 1 1.4 0l2.5 1.4c.4.2.7.7.7 1.2v2.9c0 .5-.3 1-.7 1.2l-2.5 1.5a1.4 1.4 0 0 1-1.4 0l-2.5-1.4a1.4 1.4 0 0 1-.7-1.2v-1.9l-2.2 1.3v1.9c0 .5.3 1 .7 1.2l4.7 2.7a1.4 1.4 0 0 0 1.4 0l4.7-2.7c.4-.2.7-.7.7-1.2v-5.4c0-.5-.3-1-.7-1.2z" fill="#fff" transform="scale(.62) translate(9.5 9)" />
        </svg>
      );
    case 'bsc':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
          <path d="M16 7l2.4 2.4-4.7 4.7L11.3 11.7zm5.6 5.6L24 15l-2.4 2.4-2.4-2.4zM8 15l2.4-2.4L12.8 15l-2.4 2.4zm8 3.4l2.4 2.4L16 23.2l-2.4-2.4zm0-5.6L18.4 15 16 17.4 13.6 15z" fill="#111" />
        </svg>
      );
    case 'tron':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="16" fill="#EF0027" />
          <path d="M8 9l14.5 3 -6.3 12.2zm2.6 1.8l6.4 10.2 3-6zm7.6 1.7l-1.2 2.4z" fill="#fff" />
        </svg>
      );
    case 'ethereum':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="16" fill="#627EEA" />
          <path d="M16 6l-6 10 6 3.6 6-3.6zM16 20.8l-6-3.6 6 8.8 6-8.8z" fill="#fff" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="16" fill="#64748b" />
        </svg>
      );
  }
}
