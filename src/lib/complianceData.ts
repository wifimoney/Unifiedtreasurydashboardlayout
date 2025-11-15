// Mock compliance and audit data

export interface AuditLog {
  id: string;
  timestamp: Date;
  chainName: string;
  action: string;
  entity: string;
  amount: number;
  txHash: string;
  complianceStatus: 'approved' | 'flagged' | 'pending' | 'reviewed';
  riskLevel: 'low' | 'medium' | 'high';
  reviewer?: string;
  notes?: string;
}

export interface MonitoringStatus {
  chainName: string;
  status: 'active' | 'paused' | 'error';
  lastScan: Date;
  checksPerformed: number;
}

export interface ComplianceMetrics {
  totalTransactions: number;
  flaggedTransactions: number;
  complianceRate: number;
  averageReviewTime: number;
  monitoringStatus: MonitoringStatus[];
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  await new Promise(resolve => setTimeout(resolve, 600));

  return [
    {
      id: '1',
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      chainName: 'Ethereum',
      action: 'Large Transfer',
      entity: '0x1234...5678',
      amount: 500000,
      txHash: '0xabc123def456...',
      complianceStatus: 'approved',
      riskLevel: 'low',
      reviewer: 'System Auto-Check',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 25),
      chainName: 'Polygon',
      action: 'Cross-Chain Bridge',
      entity: '0x8765...4321',
      amount: 250000,
      txHash: '0x789abc012def...',
      complianceStatus: 'flagged',
      riskLevel: 'high',
      reviewer: 'Pending Manual Review',
      notes: 'Transaction to high-risk jurisdiction detected. Requires compliance officer review.',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      chainName: 'Arbitrum',
      action: 'Token Swap',
      entity: '0x2468...1357',
      amount: 75000,
      txHash: '0xdef456ghi789...',
      complianceStatus: 'approved',
      riskLevel: 'low',
      reviewer: 'System Auto-Check',
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      chainName: 'Optimism',
      action: 'Withdrawal',
      entity: '0x9876...5432',
      amount: 150000,
      txHash: '0xghi789jkl012...',
      complianceStatus: 'pending',
      riskLevel: 'medium',
      notes: 'Unusual withdrawal pattern detected. Awaiting additional verification.',
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 1000 * 60 * 90),
      chainName: 'Base',
      action: 'Deposit',
      entity: '0x1357...2468',
      amount: 100000,
      txHash: '0xjkl012mno345...',
      complianceStatus: 'approved',
      riskLevel: 'low',
      reviewer: 'System Auto-Check',
    },
    {
      id: '6',
      timestamp: new Date(Date.now() - 1000 * 60 * 120),
      chainName: 'Ethereum',
      action: 'Multi-Signature Transaction',
      entity: '0x3690...7412',
      amount: 1000000,
      txHash: '0xmno345pqr678...',
      complianceStatus: 'reviewed',
      riskLevel: 'medium',
      reviewer: 'J. Smith',
      notes: 'Verified with treasury manager. Approved for execution.',
    },
    {
      id: '7',
      timestamp: new Date(Date.now() - 1000 * 60 * 150),
      chainName: 'Polygon',
      action: 'Smart Contract Interaction',
      entity: '0x7531...9864',
      amount: 50000,
      txHash: '0xpqr678stu901...',
      complianceStatus: 'flagged',
      riskLevel: 'high',
      reviewer: 'Pending Manual Review',
      notes: 'Interaction with unverified smart contract. Security audit required.',
    },
    {
      id: '8',
      timestamp: new Date(Date.now() - 1000 * 60 * 180),
      chainName: 'Arbitrum',
      action: 'Transfer',
      entity: '0x1593...7530',
      amount: 25000,
      txHash: '0xstu901vwx234...',
      complianceStatus: 'approved',
      riskLevel: 'low',
      reviewer: 'System Auto-Check',
    },
    {
      id: '9',
      timestamp: new Date(Date.now() - 1000 * 60 * 210),
      chainName: 'Optimism',
      action: 'Liquidity Pool Addition',
      entity: '0x9517...3578',
      amount: 200000,
      txHash: '0xvwx234yza567...',
      complianceStatus: 'pending',
      riskLevel: 'medium',
      notes: 'New liquidity pool detected. Risk assessment in progress.',
    },
    {
      id: '10',
      timestamp: new Date(Date.now() - 1000 * 60 * 240),
      chainName: 'Base',
      action: 'Batch Transfer',
      entity: '0x7896...1234',
      amount: 300000,
      txHash: '0xyza567bcd890...',
      complianceStatus: 'approved',
      riskLevel: 'low',
      reviewer: 'System Auto-Check',
    },
    {
      id: '11',
      timestamp: new Date(Date.now() - 1000 * 60 * 300),
      chainName: 'Ethereum',
      action: 'Token Mint',
      entity: '0x3214...6789',
      amount: 500000,
      txHash: '0xbcd890efg123...',
      complianceStatus: 'reviewed',
      riskLevel: 'low',
      reviewer: 'A. Johnson',
      notes: 'Authorized token minting per governance approval.',
    },
    {
      id: '12',
      timestamp: new Date(Date.now() - 1000 * 60 * 360),
      chainName: 'Polygon',
      action: 'NFT Transfer',
      entity: '0x6543...9870',
      amount: 15000,
      txHash: '0xefg123hij456...',
      complianceStatus: 'approved',
      riskLevel: 'low',
      reviewer: 'System Auto-Check',
    },
  ];
}

export async function fetchComplianceMetrics(): Promise<ComplianceMetrics> {
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    totalTransactions: 1847,
    flaggedTransactions: 23,
    complianceRate: 98.8,
    averageReviewTime: 12,
    monitoringStatus: [
      {
        chainName: 'Ethereum',
        status: 'active',
        lastScan: new Date(Date.now() - 1000 * 30),
        checksPerformed: 456,
      },
      {
        chainName: 'Polygon',
        status: 'active',
        lastScan: new Date(Date.now() - 1000 * 45),
        checksPerformed: 312,
      },
      {
        chainName: 'Arbitrum',
        status: 'active',
        lastScan: new Date(Date.now() - 1000 * 25),
        checksPerformed: 278,
      },
      {
        chainName: 'Optimism',
        status: 'active',
        lastScan: new Date(Date.now() - 1000 * 60),
        checksPerformed: 189,
      },
      {
        chainName: 'Base',
        status: 'active',
        lastScan: new Date(Date.now() - 1000 * 35),
        checksPerformed: 156,
      },
      {
        chainName: 'Avalanche',
        status: 'active',
        lastScan: new Date(Date.now() - 1000 * 50),
        checksPerformed: 134,
      },
    ],
  };
}
