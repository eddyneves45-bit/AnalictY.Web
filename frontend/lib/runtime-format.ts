export const getFirstRuntimeValue = (value: any) => {
  if (Array.isArray(value)) return value.length > 0 ? value[0] : null
  if (typeof value === 'string' && value.includes(',')) return value.split(',')[0].trim()
  return value
}

export const formatRuntimeValue = (value: any, emptyValue = '-') => {
  const firstValue = getFirstRuntimeValue(value)
  if (firstValue === null || firstValue === undefined || firstValue === '') return emptyValue
  if (typeof firstValue === 'boolean') return firstValue ? 'true' : 'false'
  return String(firstValue)
}
