/**
 * Utilitários para formatação de datas
 */

/**
 * Formata uma data para português europeu com fallback para valores inválidos
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'N/A';
    
    return dateObj.toLocaleDateString('pt-PT');
  } catch {
    return 'N/A';
  }
};

/**
 * Formata uma data com hora para português europeu com fallback para valores inválidos
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'N/A';
    
    return dateObj.toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'N/A';
  }
};

/**
 * Formata uma data para string curta (apenas data)
 */
export const formatDateShort = (date: string | Date | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'N/A';
    
    return dateObj.toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'N/A';
  }
};