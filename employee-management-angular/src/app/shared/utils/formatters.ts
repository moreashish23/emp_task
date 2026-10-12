export function formatCurrency(amount: number | string | null | undefined, fallback: string = 'Confidential'): string {
  if (amount === undefined || amount === null) {
    return fallback;
  }
  const numericAmount = Number(amount);
  if (isNaN(numericAmount)) {
    return fallback;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(numericAmount);
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return dateString;
  }
}

export function validateEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone?: string | null): boolean {
  if (!phone) return false;
  const phoneRegex = /^(\+91[\-\s]?)?[6-9]\d{9}$/;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length === 10 || phoneRegex.test(phone);
}
