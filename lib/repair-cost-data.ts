
export interface RepairCostRecord {
  category: string
  fault: string
  keywords: string[]
  repairType: string
  partsMin: number
  partsMax: number
  labourMin: number
  labourMax: number
}

// Initial illustrative dataset for prototype testing.
// These are sample estimates, not verified market quotations.
export const repairCostDataset: RepairCostRecord[] = [
  {
    category: 'AC Repair',
    fault: 'Gas leakage',
    keywords: ['gas', 'cooling', 'leakage'],
    repairType: 'Gas leak repair and refilling',
    partsMin: 500,
    partsMax: 1800,
    labourMin: 500,
    labourMax: 1000
  },
  {
    category: 'AC Repair',
    fault: 'Capacitor failure',
    keywords: ['capacitor', 'not starting', 'start'],
    repairType: 'Capacitor replacement',
    partsMin: 400,
    partsMax: 1200,
    labourMin: 300,
    labourMax: 700
  },
  {
    category: 'Refrigerator Repair',
    fault: 'Cooling system issue',
    keywords: ['cooling', 'not cooling', 'warm'],
    repairType: 'Cooling system inspection and repair',
    partsMin: 800,
    partsMax: 3000,
    labourMin: 500,
    labourMax: 1200
  },
  {
    category: 'Refrigerator Repair',
    fault: 'Thermostat failure',
    keywords: ['thermostat', 'temperature'],
    repairType: 'Thermostat replacement',
    partsMin: 500,
    partsMax: 1600,
    labourMin: 400,
    labourMax: 900
  },
  {
    category: 'Washing Machine Repair',
    fault: 'Drainage problem',
    keywords: ['drain', 'water stuck', 'water not draining'],
    repairType: 'Drain pump inspection and repair',
    partsMin: 500,
    partsMax: 2000,
    labourMin: 400,
    labourMax: 900
  },
  {
    category: 'Washing Machine Repair',
    fault: 'Motor issue',
    keywords: ['motor', 'drum not rotating', 'not spinning'],
    repairType: 'Motor inspection and repair',
    partsMin: 1200,
    partsMax: 4500,
    labourMin: 700,
    labourMax: 1500
  },
  {
    category: 'Plumbing',
    fault: 'Pipe leakage',
    keywords: ['leak', 'pipe', 'leakage'],
    repairType: 'Pipe leakage repair',
    partsMin: 200,
    partsMax: 1200,
    labourMin: 300,
    labourMax: 800
  },
  {
    category: 'Electrical Repair',
    fault: 'Wiring issue',
    keywords: ['wiring', 'short circuit', 'power'],
    repairType: 'Wiring inspection and repair',
    partsMin: 200,
    partsMax: 1500,
    labourMin: 400,
    labourMax: 1000
  }
]

export function estimateRepairCost(
  category: string,
  description: string
) {
  const text = description.toLowerCase()

  const record =
    repairCostDataset.find(item =>
      item.category === category &&
      item.keywords.some(keyword => text.includes(keyword))
    ) ||
    repairCostDataset.find(item => item.category === category)

  if (!record) return null

  return {
    fault: record.fault,
    repairType: record.repairType,
    partsMin: record.partsMin,
    partsMax: record.partsMax,
    labourMin: record.labourMin,
    labourMax: record.labourMax,
    estimatedCostMin: record.partsMin + record.labourMin,
    estimatedCostMax: record.partsMax + record.labourMax,
    method: 'illustrative_sample_dataset'
  }
}
