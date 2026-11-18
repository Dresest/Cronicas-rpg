/** Ayudas de entrada para los atajos de la calculadora del Modo partida.
 * No evalúan fórmulas ni envían datos al servidor.
 */
const arithmeticOperators = /[+\-×÷*/]$/

export function insertCalculatorOperator(expression: string, operator: string): string {
  const previous = expression.trimEnd()
  if (!previous) return operator === '-' ? '-' : ''
  if (previous.endsWith('(')) return operator === '-' ? `${previous}-` : previous
  // Un atributo añade un + sugerido. El siguiente operador lo reemplaza.
  if (arithmeticOperators.test(previous)) {
    return `${previous.slice(0, -1).trimEnd()} ${operator} `.trimStart()
  }
  return `${previous} ${operator} `
}

export function insertCalculatorShortcut(expression: string, value: number, justEvaluated = false): string {
  if (!Number.isFinite(value)) return expression
  const previous = justEvaluated ? '' : expression.trimEnd()
  const operand = String(value)
  if (!previous) return `${operand} + `
  if (previous.endsWith('(')) return `${previous}${operand} + `
  if (arithmeticOperators.test(previous)) return `${previous} ${operand} + `
  return `${previous} + ${operand} + `
}

export function deleteCalculatorInput(expression: string): string {
  const previous = expression.trimEnd()
  // Borra el operador sugerido de una sola vez, no carácter por carácter.
  if (arithmeticOperators.test(previous)) return previous.slice(0, -1).trimEnd()
  return expression.slice(0, -1)
}
