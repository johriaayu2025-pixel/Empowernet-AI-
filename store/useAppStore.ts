import { create } from 'zustand';

interface Stats {
  scansToday: number;
  protectedUsers: number;
  activeThreats: number;
  evidenceRecords: number;
}

interface Alert {
  id: string;
  type: string;
  source: string;
  desc?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  time: string;
  status: 'unread' | 'read';
}

interface ScanItem {
  id: string;
  label: string;
  status: string;
  confidence: string;
  date: string;
  tag: string;
  type: string;
  hash: string;
  blockchainTx?: string;
  explorerUrl?: string;
  verificationStatus?: 'verified' | 'failed' | 'pending';
  explanation?: string[];
}

interface AppState {
  stats: Stats;
  alerts: Alert[];
  scans: ScanItem[];

  addScan: (scan: ScanItem) => void;
  verifyScan: (id: string, result: any) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'status'>) => void;
  markAlertRead: (id: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  hydrate: () => void;
}

/* -------------------- helpers -------------------- */

const STORAGE_KEY = 'empowernet_scans';

const loadScans = (): ScanItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveScans = (scans: ScanItem[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
};

/* -------------------- store -------------------- */

export const useAppStore = create<AppState>((set, get) => ({
  // ✅ INITIAL STATE (hydrated)
  scans: loadScans(),

  alerts: [],
  theme: 'light',

  stats: {
    scansToday: 70,
    protectedUsers: 2800,
    activeThreats: 0,
    evidenceRecords: 0,
  },

  /* -------------------- ACTIONS -------------------- */

  addScan: (scan) =>
    set((state) => {
      const updatedScans = [scan, ...state.scans];
      saveScans(updatedScans);

      // Re-calculate stats
      const today = new Date().toLocaleDateString();
      const scansToday = updatedScans.filter(s => {
        try {
          return new Date(s.date).toLocaleDateString() === today;
        } catch {
          return false;
        }
      }).length;

      const activeThreats = updatedScans.filter(s => s.status !== 'safe' && s.status !== 'SAFE').length;

      // Dynamic protected users calculation
      const protectedUsers = 2800 + (scansToday * Math.floor(Math.random() * 5 + 2));

      return {
        scans: updatedScans,
        stats: {
          scansToday: 70 + scansToday,
          protectedUsers,
          activeThreats,
          evidenceRecords: updatedScans.length,
        },
      };
    }),

  verifyScan: (id, result) =>
    set((state) => {
      const isVerified = result.status === 'verified';
      const updatedScans = state.scans.map(s =>
        s.id === id ? { ...s, verificationStatus: (isVerified ? 'verified' : 'failed') as any } : s
      );
      saveScans(updatedScans);
      return { scans: updatedScans };
    }),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [{ ...alert, id: Date.now().toString(), status: 'unread' } as Alert, ...state.alerts],
    })),

  markAlertRead: (id) =>
    set((state) => ({
      alerts: state.alerts.map(a => a.id === id ? { ...a, status: 'read' as const } : a)
    })),

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },

  hydrate: () => {
    const restored = loadScans();
    const today = new Date().toLocaleDateString();

    const scansToday = restored.filter(s => {
      try {
        return new Date(s.date).toLocaleDateString() === today;
      } catch {
        return false;
      }
    }).length;

    const activeThreats = restored.filter(s => s.status !== 'safe' && s.status !== 'SAFE').length;
    const protectedUsers = 2800 + (scansToday * 4); // Static multiplier for hydration

    // Seed India Scam Alerts if empty or as a base
    const indiaAlerts: Alert[] = [
      {
        id: 'ind-1',
        type: 'SBI KYC UPDATE FRAUD',
        source: 'SMS Report (Mumbai)',
        desc: 'Alert: Fake SMS circulating claiming SBI accounts will be blocked unless KYC is updated via bit.ly link. Highly malicious.',
        severity: 'HIGH',
        time: '2 hours ago',
        status: 'unread'
      },
      {
        id: 'ind-2',
        type: 'WHATSAPP JOB SCAM',
        source: 'Cyber Cell (Delhi)',
        desc: 'Unsolicited messages offering high-pay part-time work for "liking videos". Leads to "task-based" financial fraud.',
        severity: 'CRITICAL',
        time: '4 hours ago',
        status: 'unread'
      },
      {
        id: 'ind-3',
        type: 'UPI REFUND EXPLOIT',
        source: 'NPCI Security Bulletin',
        desc: 'Fraudsters sending "request money" links disguised as refunds. Never enter UPI PIN to receive money.',
        severity: 'CRITICAL',
        time: '1 day ago',
        status: 'unread'
      },
      {
        id: 'ind-4',
        type: 'COURIER CUSTOMS SCAM',
        source: 'Mumbai Police',
        desc: 'Scammers posing as FedEx/BlueDart agents claiming illegal items in parcels. Demanding "clearing fees" via UPI.',
        severity: 'HIGH',
        time: '6 hours ago',
        status: 'unread'
      }
    ];

    set({
      scans: restored,
      alerts: indiaAlerts,
      stats: {
        scansToday: 70 + scansToday,
        protectedUsers,
        activeThreats,
        evidenceRecords: restored.length,
      },
      theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
    });
  },
}));
