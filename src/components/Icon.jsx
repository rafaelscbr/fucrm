// Ícones SVG (traço, estilo Lucide) — profissionais, sem emoji.
const P = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 9.5V20a1 1 0 001 1h12a1 1 0 001-1V9.5" /></>,
  clientes: <><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>,
  funil: <><rect x="4" y="4" width="4" height="12" rx="1" /><rect x="10" y="4" width="4" height="16" rx="1" /><rect x="16" y="4" width="4" height="8" rx="1" /></>,
  prospeccao: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  painel: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  aprovacoes: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></>,
  reps: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></>,
  territorios: <><path d="M12 21s-7-5.2-7-11a7 7 0 0114 0c0 5.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.6" /></>,
  carteira: <><circle cx="12" cy="12" r="9" /><path d="M5.8 5.8l12.4 12.4" /></>,
  catalogo: <><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3.3 8.3L12 13l8.7-4.7" /><path d="M12 13v8" /></>,
  condicoes: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  empresa: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /><path d="M10 21v-3h4v3" /></>,
  importar: <><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" /></>,
  logs: <><path d="M22 12h-4l-3 8L9 4l-3 8H2" /></>,
  sair: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
}

export default function Icon({ name, size = 19 }) {
  const d = P[name]
  if (!d) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
  )
}
