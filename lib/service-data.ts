
import { supabase } from '@/lib/supabase'
import { estimateRepairCost } from '@/lib/repair-cost-data'

export type Complexity = 'Low' | 'Medium' | 'High'

export type RequestStatus =
  | 'Pending review'
  | 'Diagnosed'
  | 'Assigned'
  | 'In progress'
  | 'Completed'

export type UserRole = 'Customer' | 'Technician' | 'Administrator'

export interface Recommendation {
  skills: string[]
  tools: string[]
  parts: string[]
  technicianId?: string
}

export interface FirstTimeFixPrediction {
  probability: number
  simulated: true
}

export interface Diagnosis {
  summary: string
  category: string
  likelyFault: string
  complexity: Complexity
  confidence: number
  questions: string[]
  recommendation: Recommendation
  firstTimeFix: FirstTimeFixPrediction
  simulated: true
}

export interface JobOutcome {
  status: RequestStatus
  actualMinutes?: number
  resourcesUsed?: string
  repeatVisit?: boolean
  notes?: string
}

export interface Assignment {
  technicianId: string
  assignedAt: string
}

export interface ServiceRequest {
  id: string
  customerId: string
  customer: string
  email: string
  category: string
  description: string
  submittedAt: string
  status: RequestStatus
  diagnosis: Diagnosis
  assignment?: Assignment
  outcome?: JobOutcome
  customerAddress: string
  customerLatitude: number | null
  customerLongitude: number | null
  declinedBy: string[]

  estimatedCostMin: number | null
  estimatedCostMax: number | null
  estimatedPartsCost: number | null
  estimatedLabourCost: number | null
  costEstimationMethod: string | null
}

export interface Technician {
  id: string
  name: string
  email: string
  skills: string[]
  availability: string
}

const makeDiagnosis = (category: string, description: string): Diagnosis => {
  const complexity: Complexity = description.length < 45 ? 'High' : 'Medium'
  const confidence = description.length < 45 ? 61 : 84

  const fault =
    category === 'AC Repair'
      ? 'Airflow restriction or electrical component wear'
      : category === 'Plumbing'
        ? 'Localized fixture obstruction or seal wear'
        : category === 'Refrigerator Repair'
          ? 'Cooling system or evaporator component fault'
          : category === 'Washing Machine Repair'
            ? 'Drainage or control component fault'
            : 'Component wear or electrical connection fault'

  return {
    summary: `Symptoms may be consistent with ${fault.toLowerCase()}. A qualified technician should verify the issue before repair.`,
    category,
    likelyFault: fault,
    complexity,
    confidence,
    questions: description.length < 45
      ? ['When did the issue first begin?', 'Can you share the model number or any error code?']
      : [],
    recommendation: {
      skills: [category, 'Safety inspection'],
      tools: ['Multimeter', 'Technician hand-tool kit'],
      parts: ['Replacement component pending inspection']
    },
    firstTimeFix: {
      probability: confidence - 3,
      simulated: true
    },
    simulated: true
  }
}

function mapRequest(row: any): ServiceRequest {
  const diagnosis = row.diagnosis && Object.keys(row.diagnosis).length
    ? row.diagnosis as Diagnosis
    : makeDiagnosis(row.category, row.description)

  return {
    id: row.id,
    customerId: row.customer_id,
    customer: row.customer_name || 'Customer',
    email: row.customer_email || '',
    category: row.category,
    description: row.description,
    submittedAt: row.created_at,
    status: row.status,
    diagnosis,
    assignment: row.assigned_technician_id
      ? {
          technicianId: row.assigned_technician_id,
          assignedAt: row.updated_at
        }
      : undefined,
    outcome: row.outcome || undefined,
    customerAddress: row.customer_address || '',
    customerLatitude: row.customer_latitude == null
      ? null : Number(row.customer_latitude),
    customerLongitude: row.customer_longitude == null
      ? null : Number(row.customer_longitude),
    declinedBy: row.declined_by || [],

    estimatedCostMin: row.estimated_cost_min == null
      ? null : Number(row.estimated_cost_min),
    estimatedCostMax: row.estimated_cost_max == null
      ? null : Number(row.estimated_cost_max),
    estimatedPartsCost: row.estimated_parts_cost == null
      ? null : Number(row.estimated_parts_cost),
    estimatedLabourCost: row.estimated_labour_cost == null
      ? null : Number(row.estimated_labour_cost),
    costEstimationMethod: row.cost_estimation_method || null
  }
}

export async function loadRequests(): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from('service_requests_v2')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(mapRequest)
}

export async function createRequest(input: {
  customerId: string
  customer: string
  email: string
  category: string
  description: string
  customerAddress: string
  customerLatitude: number
  customerLongitude: number
}): Promise<ServiceRequest> {
  const diagnosis = makeDiagnosis(input.category, input.description)
  const estimate = estimateRepairCost(input.category, input.description)

  const { data, error } = await supabase
    .from('service_requests_v2')
    .insert({
      customer_id: input.customerId,
      customer_name: input.customer,
      customer_email: input.email,
      category: input.category,
      description: input.description,
      customer_address: input.customerAddress,
      customer_latitude: input.customerLatitude,
      customer_longitude: input.customerLongitude,
      status: 'Diagnosed',
      diagnosis,

      estimated_cost_min: estimate?.estimatedCostMin ?? null,
      estimated_cost_max: estimate?.estimatedCostMax ?? null,
      estimated_parts_cost: estimate
        ? (estimate.partsMin + estimate.partsMax) / 2
        : null,
      estimated_labour_cost: estimate
        ? (estimate.labourMin + estimate.labourMax) / 2
        : null,
      cost_estimation_method: estimate?.method ?? null
    })
    .select('*')
    .single()

  if (error) throw error
  return mapRequest(data)
}

export async function updateRequest(
  request: ServiceRequest
): Promise<ServiceRequest> {
  const { data, error } = await supabase
    .from('service_requests_v2')
    .update({
      status: request.status,
      diagnosis: request.diagnosis,
      outcome: request.outcome || null,
      estimated_cost_min: request.estimatedCostMin,
      estimated_cost_max: request.estimatedCostMax,
      estimated_parts_cost: request.estimatedPartsCost,
      estimated_labour_cost: request.estimatedLabourCost,
      cost_estimation_method: request.costEstimationMethod,
      updated_at: new Date().toISOString()
    })
    .eq('id', request.id)
    .select('*')
    .single()

  if (error) throw error
  return mapRequest(data)
}

export async function acceptServiceRequest(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('accept_service_request', {
    p_request_id: id
  })

  if (error) throw error
  return data === true
}

export async function declineServiceRequest(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('decline_service_request', {
    p_request_id: id
  })

  if (error) throw error
  return data === true
}

export async function loadTechnicians(): Promise<Technician[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,email')
    .eq('role', 'technician')
    .eq('approval_status', 'approved')
    .order('full_name')

  if (error) throw error

  return (data || []).map((person: any) => ({
    id: person.id,
    name: person.full_name || 'Technician',
    email: person.email || '',
    skills: ['Service and repair'],
    availability: 'Available'
  }))
}

export async function loadPendingTechnicians() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,email,requested_role,created_at')
    .eq('approval_status', 'pending')
    .eq('requested_role', 'technician')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function approveTechnician(id: string) {
  const { error } = await supabase
    .from('profiles')
    .update({
      role: 'technician',
      approval_status: 'approved'
    })
    .eq('id', id)

  if (error) throw error
}
