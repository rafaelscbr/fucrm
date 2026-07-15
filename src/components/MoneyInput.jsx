import { brl } from '../lib/format'

// Entrada de dinheiro no padrão brasileiro (R$ 1.234,56).
// Digita da direita para a esquerda (centavos), armazena um número.
export default function MoneyInput({ value, onChange, ...rest }) {
  function handle(e) {
    const digits = e.target.value.replace(/\D/g, '')
    onChange(digits ? parseInt(digits, 10) / 100 : 0)
  }
  return (
    <input className="input" inputMode="numeric" value={brl(value || 0)} onChange={handle} {...rest} />
  )
}
