export const balanceOverview = [
  { label: 'Ümumi balans', amount: 5240, delta: '+8.2%', tone: 'accent' as const },
  { label: 'Mənim balansım', amount: 2920, delta: '+320 AZN', tone: 'success' as const },
  { label: 'Arvadımın balansı', amount: 2320, delta: '-90 AZN', tone: 'warning' as const },
];

export const recentTransactions = [
  {
    id: 'txn_001',
    type: 'income',
    title: 'Kurs gəliri',
    counterparty: 'Bugünkü qrup',
    amount: 340,
    createdAt: '2026-03-10T08:25:00.000Z',
    status: 'synced',
  },
  {
    id: 'txn_002',
    type: 'expense',
    title: 'Ev marketi',
    counterparty: 'Bravo',
    amount: -82.3,
    createdAt: '2026-03-10T06:10:00.000Z',
    status: 'pending',
  },
  {
    id: 'txn_003',
    type: 'transfer',
    title: 'Kartdan karta transfer',
    counterparty: 'Həyat yoldaşı',
    amount: -150,
    createdAt: '2026-03-09T17:45:00.000Z',
    status: 'synced',
  },
];

export const trendData = [
  { label: 'B.e', income: 320, expense: 120 },
  { label: 'Ç.a', income: 270, expense: 92 },
  { label: 'Ç', income: 420, expense: 134 },
  { label: 'C.a', income: 360, expense: 210 },
  { label: 'C', income: 510, expense: 140 },
  { label: 'Ş', income: 390, expense: 180 },
  { label: 'B', income: 440, expense: 205 },
];

export const categoryData = [
  { name: 'Ev', value: 34, color: '#5892ff' },
  { name: 'Qida', value: 26, color: '#7fb0ff' },
  { name: 'Nəqliyyat', value: 18, color: '#94d3a2' },
  { name: 'Digər', value: 22, color: '#f1c670' },
];

export const notificationSettings = [
  { key: 'income', label: 'Yeni gəlir', description: 'Yeni gəlir əlavə olunanda xəbər ver' },
  { key: 'expense', label: 'Yeni xərc', description: 'Xərc yazılanda push və in-app bildiriş göstər' },
  { key: 'transfer', label: 'Transfer', description: 'Balanslar arası transfer barədə xəbərdar et' },
  { key: 'sync', label: 'Sync xətası', description: 'Offline növbədə problem olarsa görünən xəbərdarlıq göstər' },
];

export const adminUsers = [
  { id: 'u_01', username: 'faiz', role: 'user', status: 'active', balance: 2920 },
  { id: 'u_02', username: 'leyla', role: 'user', status: 'active', balance: 2320 },
  { id: 'u_03', username: 'admin', role: 'admin', status: 'active', balance: 0 },
];

export const adminAuditPreview = [
  { id: 'log_001', actor: 'faiz', action: 'create', entity: 'transaction', time: '2026-03-10T08:25:00.000Z' },
  { id: 'log_002', actor: 'leyla', action: 'sync', entity: 'transaction', time: '2026-03-10T07:55:00.000Z' },
  { id: 'log_003', actor: 'admin', action: 'admin_action', entity: 'user', time: '2026-03-09T18:05:00.000Z' },
];

export const adminSystemCards = [
  { label: 'Pending sync', value: '3', tone: 'warning' as const },
  { label: 'Push status', value: 'Normal', tone: 'success' as const },
  { label: 'Backup', value: 'Gündəlik', tone: 'accent' as const },
];
