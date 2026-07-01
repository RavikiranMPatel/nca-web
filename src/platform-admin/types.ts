export interface DashboardStats {
  totalAcademies: number;
  activeAcademies: number;
  pendingAcademies: number;
  disabledAcademies: number;
  totalServers: number;
  recentAlerts: number;
}

export interface Academy {
  id: string;
  slug: string;
  name: string;
  domain: string;
  serverId: string | null;
  serverName: string | null;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUsername: string;
  plan: string;
  status: 'ACTIVE' | 'PENDING' | 'DISABLED' | 'DELETED';
  expiresAt: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  lastLoginAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateAcademyRequest {
  slug: string;
  name: string;
  domain: string;
  plan: string;
  serverId?: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUsername: string;
  dbPassword: string;
  expiresAt?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
}

export interface Server {
  id: string;
  name: string;
  ip: string;
  hetznerServerId: string | null;
  cpuPercent: number | null;
  ramPercent: number | null;
  diskUsedGb: number | null;
  maxAcademies: number;
  status: 'ACTIVE' | 'FULL' | 'MAINTENANCE';
  lastPing: string | null;
  createdAt: string;
}

export interface RegisterServerRequest {
  name: string;
  ip: string;
  hetznerServerId?: string;
  maxAcademies?: number;
}

export interface BackupLog {
  id: string;
  academyId: string;
  backedUpAt: string | null;
  sizeMb: number | null;
  drivePath: string | null;
  status: 'SUCCESS' | 'FAILED';
  errorMessage: string | null;
  createdAt: string;
}

export interface PlatformEvent {
  id: string;
  eventType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  academyId: string | null;
  serverId: string | null;
  message: string;
  createdAt: string;
}
