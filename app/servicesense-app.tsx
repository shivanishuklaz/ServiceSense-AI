
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  loadRequests,
  createRequest,
  updateRequest,
  acceptServiceRequest,
  declineServiceRequest,
  loadTechnicians,
  loadPendingTechnicians,
  approveTechnician,
  type ServiceRequest,
  type Technician,
  type UserRole
} from '@/lib/service-data'

const ADMIN_EMAIL = '2k4shivanishukla@gmail.com'

const categories = [
  'AC Repair',
  'Refrigerator Repair',
  'Washing Machine Repair',
  'Plumbing',
  'Electrical Repair'
]

type Portal = 'admin' | 'customer' | 'technician'

type Profile = {
  id: string
  name: string
  email: string
  role: UserRole
  approval_status: string
}

function Button({ children, onClick, href, type = 'button', disabled = false }: any) {
  const cls = 'rounded-xl bg-[#102a43] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#174467] disabled:opacity-50'
  return href
    ? <Link className={cls} href={href}>{children}</Link>
    : <button disabled={disabled} type={type} onClick={onClick} className={cls}>{children}</button>
}

function MapPreview({ lat, lon }: { lat: number; lon: number }) {
  const delta = 0.006
  const bbox = [
    lon - delta,
    lat - delta,
    lon + delta,
    lat + delta
  ].join(',')

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`

  return (
    <div className="overflow-hidden rounded-xl border">
      <iframe
        title="Service location map"
        src={mapUrl}
        width="100%"
        height="220"
        loading="lazy"
        className="border-0"
      />
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`}
        target="_blank"
        rel="noreferrer"
        className="block bg-slate-50 p-2 text-center text-xs font-semibold text-cyan-800"
      >
        Open full map ↗
      </a>
    </div>
  )
}

function Layout({ profile, children }: any) {
  const router = useRouter()

  const links =
    profile.role === 'Customer'
      ? [['My requests', '/customer/requests'], ['New request', '/customer/new-request']]
      : profile.role === 'Technician'
        ? [['Available requests & My jobs', '/technician']]
        : [['All requests', '/analytics'], ['Technician approvals', '/admin/approvals']]

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-5 py-4">
        <Link href="/" className="text-xl font-bold text-[#102a43]">
          Service<span className="text-cyan-600">Sense</span> AI
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-600">{profile.name} · {profile.role}</span>
          <button onClick={logout} className="rounded-lg border px-3 py-2 text-xs font-semibold">Sign out</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[210px_1fr]">
        <aside className="h-fit rounded-2xl border bg-white p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Workspace</p>
          <nav className="flex flex-col gap-2">
            {links.map(([label, url]: string[]) => (
              <Link key={url} href={url} className="rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-cyan-50">
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>

      <footer className="border-t bg-white px-5 py-5 text-center text-xs text-slate-400">
        ServiceSense AI · Academic capstone demonstration · Simulated diagnosis
      </footer>
    </div>
  )
}

function Landing() {
  const portals = [
    {
      title: 'Admin',
      description: 'Manage customers, technicians and service requests.',
      href: '/admin-login',
      icon: '🛡️'
    },
    {
      title: 'Customer',
      description: 'Register, raise service requests and track repairs.',
      href: '/customer-login',
      icon: '👤'
    },
    {
      title: 'Technician',
      description: 'Register, get approval and accept nearby service requests.',
      href: '/technician-login',
      icon: '🔧'
    }
  ]

  return (
    <main className="grid min-h-screen place-items-center bg-[#102a43] p-6 text-white">
      <div className="w-full max-w-4xl text-center">
        <p className="text-sm font-semibold tracking-widest text-cyan-300">SERVICESENSE AI</p>
        <h1 className="mt-5 text-4xl font-bold sm:text-5xl">Smarter Service. First-Time Fix.</h1>
        <p className="mx-auto mt-5 max-w-xl text-slate-300">
          AI-assisted service diagnosis and location-based technician service platform.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {portals.map(portal => (
            <Link
              key={portal.title}
              href={portal.href}
              className="rounded-2xl bg-white p-7 text-left text-[#102a43] shadow-lg transition hover:-translate-y-1 hover:bg-cyan-50"
            >
              <span className="text-4xl">{portal.icon}</span>
              <h2 className="mt-5 text-xl font-bold">{portal.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{portal.description}</p>
              <p className="mt-5 text-sm font-bold text-cyan-700">Continue →</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}

function Login({ portal }: { portal: Portal }) {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const title =
    portal === 'admin' ? 'Admin Login' :
    portal === 'customer' ? 'Customer Portal' : 'Technician Portal'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')

    try {
      if (portal === 'admin' && mode === 'signup') {
        throw new Error('Admin registration is not available.')
      }

      if (portal === 'admin' && email.trim().toLowerCase() !== ADMIN_EMAIL) {
        throw new Error('This email is not authorized for Admin access.')
      }

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              requested_role: portal
            }
          }
        })

        if (error) throw error

        if (!data.session) {
          setMessage('Account created. Please confirm your email, then sign in. Technician accounts require Admin approval.')
          return
        }

        router.replace(portal === 'customer' ? '/customer/requests' : '/pending-approval')
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role,approval_status')
        .eq('id', data.user.id)
        .single()

      if (profileError) throw profileError

      if (portal === 'admin' && profile.role !== 'admin') {
        await supabase.auth.signOut()
        throw new Error('This account does not have Admin access.')
      }

      if (portal === 'customer' && profile.role !== 'customer') {
        await supabase.auth.signOut()
        throw new Error('Please use the correct portal for your account.')
      }

      if (portal === 'technician' && profile.role !== 'technician') {
        if (profile.approval_status === 'pending') {
          router.replace('/pending-approval')
          return
        }
        await supabase.auth.signOut()
        throw new Error('Please use the correct portal for your account.')
      }

      if (profile.approval_status === 'pending') {
        router.replace('/pending-approval')
        return
      }

      if (profile.approval_status === 'rejected') {
        await supabase.auth.signOut()
        throw new Error('Your registration was not approved. Please contact Admin.')
      }

      const destinations: Record<string, string> = {
        customer: '/customer/requests',
        technician: '/technician',
        admin: '/analytics'
      }

      router.replace(destinations[profile.role] || '/')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to continue.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-5">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border bg-white p-7 shadow-sm">
        <Link href="/" className="text-sm font-bold text-cyan-700">ServiceSense AI</Link>
        <h1 className="mt-5 text-3xl font-bold text-[#102a43]">{title}</h1>
        <p className="mb-6 mt-2 text-sm text-slate-500">
          {portal === 'admin'
            ? 'Sign in with your authorized Admin account.'
            : 'Access your individual workspace.'}
        </p>

        {mode === 'signup' && (
          <label className="mb-4 block text-xs font-semibold">
            Full name
            <input required value={name} onChange={e => setName(e.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3 text-sm" />
          </label>
        )}

        <label className="mb-4 block text-xs font-semibold">
          Email
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3 text-sm" />
        </label>

        <label className="mb-4 block text-xs font-semibold">
          Password
          <input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3 text-sm" />
        </label>

        {message && <p className="mb-4 rounded-lg bg-cyan-50 p-3 text-xs text-cyan-900">{message}</p>}

        <button disabled={busy} className="w-full rounded-xl bg-[#102a43] py-3 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        {portal !== 'admin' && (
          <p className="mt-5 text-center text-xs text-slate-500">
            {mode === 'signin' ? 'New user?' : 'Already registered?'}
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}
              className="ml-1 font-bold text-cyan-700"
            >
              {mode === 'signin' ? 'Create account' : 'Sign in'}
            </button>
          </p>
        )}

        {portal === 'technician' && (
          <p className="mt-4 text-center text-[10px] text-slate-400">Technician accounts require Admin approval.</p>
        )}

        <Link href="/" className="mt-5 block text-center text-xs text-cyan-700">Back to portal selection</Link>
      </form>
    </div>
  )
}

function Pending() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-5">
      <div className="max-w-md rounded-2xl border bg-white p-8 text-center">
        <h1 className="text-2xl font-bold text-[#102a43]">Approval pending</h1>
        <p className="mt-3 text-sm text-slate-500">Your Technician account is waiting for Admin approval.</p>
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }} className="mt-6 rounded-xl bg-[#102a43] px-5 py-3 text-sm text-white">Sign out</button>
      </div>
    </div>
  )
}

function RequestList({ requests }: { requests: ServiceRequest[] }) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="mb-4 text-lg font-bold text-[#102a43]">Service requests</h2>
      {requests.length === 0
        ? <p className="py-8 text-center text-sm text-slate-500">No requests found.</p>
        : <div className="space-y-3">
          {requests.map(r => (
            <Link key={r.id} href={`/customer/requests/${r.id}`} className="block rounded-xl border p-4 hover:bg-slate-50">
              <div className="flex flex-wrap justify-between gap-2">
                <b className="text-sm text-cyan-800">{r.category}</b>
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs">{r.status}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{r.description}</p>
              <p className="mt-2 text-xs text-slate-500">Service address: {r.customerAddress || 'Not provided'}</p>
              <p className="mt-2 text-[10px] text-slate-400">{new Date(r.submittedAt).toLocaleString()}</p>
            </Link>
          ))}
        </div>}
    </section>
  )
}

function CustomerHome({ profile, requests, refresh }: any) {
  const router = useRouter()
  const [category, setCategory] = useState(categories[0])
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function locateAddress() {
    if (!address.trim()) {
      setMessage('Please enter your complete service address first.')
      return
    }

    setLocating(true)
    setMessage('')

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`
      )

      if (!response.ok) throw new Error('Location service is temporarily unavailable.')

      const results = await response.json()
      if (!results.length) throw new Error('Address not found. Please enter a more complete address.')

      setLatitude(Number(results[0].lat))
      setLongitude(Number(results[0].lon))
      setAddress(results[0].display_name)
      setMessage('Location found. Please verify the map pin below.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not find this address.')
    } finally {
      setLocating(false)
    }
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage('Your browser does not support location access.')
      return
    }

    setLocating(true)
    setMessage('')

    navigator.geolocation.getCurrentPosition(
      async position => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        setLatitude(lat)
        setLongitude(lon)

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
          )
          const result = await response.json()
          if (result.display_name) setAddress(result.display_name)
          setMessage('Current location captured. Please verify the map pin.')
        } catch {
          setMessage('Location captured. Please enter your full address as well.')
        } finally {
          setLocating(false)
        }
      },
      () => {
        setMessage('Location permission was not granted. You can enter your address manually.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')

    try {
      if (latitude === null || longitude === null || !address.trim()) {
        throw new Error('Please locate and verify your service address on the map before submitting.')
      }

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Please sign in again.')

      const { data: person } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userData.user.id)
        .single()

      const created = await createRequest({
        customerId: userData.user.id,
        customer: person?.full_name || profile.name,
        email: userData.user.email || profile.email,
        category,
        description,
        customerAddress: address,
        customerLatitude: latitude,
        customerLongitude: longitude
      })

      await refresh()
      router.push(`/customer/requests/${created.id}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create request.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#102a43]">Your service requests</h1>
          <p className="mt-1 text-sm text-slate-500">Only your account's requests appear here.</p>
        </div>
        <span className="rounded-full bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800">Customer portal</span>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ['Total requests', requests.length],
          ['Awaiting service', requests.filter((r: ServiceRequest) => r.status !== 'Completed').length],
          ['Completed', requests.filter((r: ServiceRequest) => r.status === 'Completed').length]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-white p-5">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-[#102a43]">{value}</p>
          </div>
        ))}
      </div>

      <section className="mb-6 rounded-2xl border bg-white p-5">
        <h2 className="mb-4 text-lg font-bold text-[#102a43]">Create a service request</h2>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-semibold">
            Service category
            <select value={category} onChange={e => setCategory(e.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm">
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>

          <label className="block text-xs font-semibold">
            Describe the problem
            <textarea required minLength={12} value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-2 w-full rounded-xl border p-3 text-sm" placeholder="Describe the issue, symptoms and when it started..." />
          </label>

          <div>
            <label className="block text-xs font-semibold">
              Complete service address
              <textarea
                required
                rows={2}
                value={address}
                onChange={e => {
                  setAddress(e.target.value)
                  setLatitude(null)
                  setLongitude(null)
                }}
                className="mt-2 w-full rounded-xl border p-3 text-sm"
                placeholder="House number, street, area, city, PIN code..."
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={locateAddress} disabled={locating}>
                {locating ? 'Locating...' : 'Find address on map'}
              </Button>
              <button type="button" onClick={useCurrentLocation} disabled={locating} className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-[#102a43] disabled:opacity-50">
                Use my current location
              </button>
            </div>

            {latitude !== null && longitude !== null && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-emerald-700">Location captured — verify the map pin</p>
                <MapPreview lat={latitude} lon={longitude} />
              </div>
            )}
          </div>

          {message && <p className="rounded-lg bg-cyan-50 p-3 text-xs text-cyan-900">{message}</p>}

          <Button type="submit" disabled={busy || latitude === null || longitude === null}>
            {busy ? 'Submitting...' : 'Submit service request'}
          </Button>
        </form>
      </section>

      <RequestList requests={requests} />
    </>
  )
}

function RequestDetails({ request }: { request?: ServiceRequest }) {
  if (!request) return <p className="rounded-xl border bg-white p-6">Request not found.</p>

  return (
    <section className="rounded-2xl border bg-white p-6">
      <Link href="/customer/requests" className="text-xs font-semibold text-cyan-700">← Back to requests</Link>
      <h1 className="mt-5 text-2xl font-bold text-[#102a43]">{request.category}</h1>
      <p className="mt-2 text-xs text-slate-500">Request ID: {request.id}</p>
      <p className="mt-3 text-sm text-slate-600">{request.description}</p>

      <div className="mt-5 rounded-xl bg-cyan-50 p-4">
        <p className="text-xs font-bold text-cyan-900">SIMULATED DIAGNOSIS</p>
        <p className="mt-2 text-sm font-semibold">{request.diagnosis.likelyFault}</p>
        <p className="mt-2 text-xs text-slate-600">{request.diagnosis.summary}</p>
        <p className="mt-3 text-xs">Confidence: {request.diagnosis.confidence}% · FTF estimate: {request.diagnosis.firstTimeFix.probability}% demo</p>
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold">Service location</p>
        <p className="my-2 text-sm text-slate-600">{request.customerAddress}</p>
        {request.customerLatitude !== null && request.customerLongitude !== null && (
          <MapPreview lat={request.customerLatitude} lon={request.customerLongitude} />
        )}
      </div>

      <p className="mt-5 text-sm">Status: <b>{request.status}</b></p>
    </section>
  )
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (value: number) => value * Math.PI / 180
  const dLat = radians(lat2 - lat1)
  const dLon = radians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) *
    Math.cos(radians(lat2)) *
    Math.sin(dLon / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function TechnicianHome({ requests, refresh, profile }: any) {
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')
  const [techLocation, setTechLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [locationMessage, setLocationMessage] = useState('')

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationMessage('Location is not supported by this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        setTechLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        })
        setLocationMessage('Your location is enabled.')
      },
      () => setLocationMessage('Allow location access to see approximate distance to customers.'),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      refresh()
    }, 10000)

    return () => window.clearInterval(timer)
  }, [refresh])

  const available = requests.filter((r: ServiceRequest) =>
    !r.assignment &&
    ['Diagnosed', 'Pending review'].includes(r.status)
  )

  const assigned = requests.filter((r: ServiceRequest) =>
    r.assignment?.technicianId === profile.id
  )

  async function accept(request: ServiceRequest) {
    setBusyId(request.id)
    setMessage('')

    try {
      const accepted = await acceptServiceRequest(request.id)

      if (!accepted) {
        throw new Error('This request has already been accepted by another technician.')
      }

      await refresh()
      setMessage('Request accepted! It is now in your My Jobs section.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not accept request.')
      await refresh()
    } finally {
      setBusyId('')
    }
  }

  async function decline(request: ServiceRequest) {
    setBusyId(request.id)
    setMessage('')

    try {
      const declined = await declineServiceRequest(request.id)
      if (!declined) throw new Error('This request is no longer available.')

      await refresh()
      setMessage('Request declined. It will no longer appear in your feed.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not decline request.')
    } finally {
      setBusyId('')
    }
  }

  async function changeStatus(request: ServiceRequest, status: ServiceRequest['status']) {
    setBusyId(request.id)
    setMessage('')

    try {
      await updateRequest({ ...request, status })
      await refresh()
      setMessage('Job status updated successfully.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Update failed.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#102a43]">Technician dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Discover service requests and choose the jobs you want to accept.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Approved technician</span>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-xs text-slate-500">Available requests</p>
          <p className="mt-2 text-3xl font-bold text-[#102a43]">{available.length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-xs text-slate-500">My active jobs</p>
          <p className="mt-2 text-3xl font-bold text-[#102a43]">{assigned.filter((r: ServiceRequest) => r.status !== 'Completed').length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-xs text-slate-500">Completed jobs</p>
          <p className="mt-2 text-3xl font-bold text-[#102a43]">{assigned.filter((r: ServiceRequest) => r.status === 'Completed').length}</p>
        </div>
      </div>

      <div className="mb-5 rounded-xl border bg-white p-3 text-xs text-slate-600">
        <b>Location:</b> {locationMessage || 'Checking your location...'}
        <p className="mt-1 text-[11px] text-slate-400">Request feed refreshes automatically every 10 seconds.</p>
      </div>

      {message && <p className="mb-4 rounded-lg bg-cyan-50 p-3 text-xs text-cyan-900">{message}</p>}

      <section className="mb-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#102a43]">Available service requests</h2>
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">{available.length} new</span>
        </div>

        {available.length === 0
          ? <div className="rounded-2xl border bg-white p-8 text-center">
              <p className="text-lg font-semibold text-[#102a43]">No new requests right now</p>
              <p className="mt-2 text-sm text-slate-500">New customer requests will appear here automatically.</p>
            </div>
          : <div className="space-y-4">
              {available.map((r: ServiceRequest) => {
                const distance = techLocation && r.customerLatitude !== null && r.customerLongitude !== null
                  ? distanceKm(techLocation.lat, techLocation.lon, r.customerLatitude, r.customerLongitude)
                  : null

                return (
                  <article key={r.id} className="rounded-2xl border-2 border-cyan-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">NEW REQUEST</span>
                      <span className="text-xs text-slate-400">{new Date(r.submittedAt).toLocaleString()}</span>
                    </div>

                    <h3 className="mt-3 text-xl font-bold text-[#102a43]">{r.category}</h3>
                    <p className="mt-2 text-sm text-slate-600">{r.description}</p>

                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-bold text-[#102a43]">CUSTOMER SERVICE LOCATION</p>
                      <p className="mt-2 text-sm text-slate-700">{r.customerAddress || 'Address not available'}</p>
                      <p className="mt-2 text-xs font-semibold text-cyan-800">
                        {distance !== null
                          ? `Approx. ${distance.toFixed(1)} km straight-line distance`
                          : 'Enable your location to see approximate distance'}
                      </p>
                    </div>

                    {r.customerLatitude !== null && r.customerLongitude !== null && (
                      <div className="mt-4 space-y-2">
                        <MapPreview lat={r.customerLatitude} lon={r.customerLongitude} />
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${r.customerLatitude},${r.customerLongitude}${techLocation ? `&origin=${techLocation.lat},${techLocation.lon}` : ''}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-sm font-bold text-cyan-800"
                        >
                          Get directions ↗
                        </a>
                      </div>
                    )}

                    <div className="mt-4 rounded-xl bg-cyan-50 p-3 text-xs">
                      <b>Suggested diagnosis:</b> {r.diagnosis.likelyFault}
                      <p className="mt-1 text-slate-600">Diagnosis confidence: {r.diagnosis.confidence}% · Demo estimate</p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        disabled={busyId === r.id}
                        onClick={() => accept(r)}
                        className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busyId === r.id ? 'Please wait...' : '✓ Accept request'}
                      </button>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => decline(r)}
                        className="rounded-xl border border-rose-200 px-6 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-[#102a43]">My accepted jobs</h2>

        {assigned.length === 0
          ? <div className="rounded-2xl border bg-white p-7 text-center text-sm text-slate-500">You have not accepted any jobs yet.</div>
          : <div className="space-y-4">
              {assigned.map((r: ServiceRequest) => (
                <article key={r.id} className="rounded-2xl border bg-white p-5">
                  <div className="flex flex-wrap justify-between gap-2">
                    <b className="text-cyan-800">{r.category}</b>
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs">{r.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{r.description}</p>
                  <p className="mt-3 text-xs text-slate-600"><b>Customer address:</b> {r.customerAddress}</p>

                  {r.customerLatitude !== null && r.customerLongitude !== null && (
                    <div className="mt-3">
                      <MapPreview lat={r.customerLatitude} lon={r.customerLongitude} />
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${r.customerLatitude},${r.customerLongitude}${techLocation ? `&origin=${techLocation.lat},${techLocation.lon}` : ''}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm font-bold text-cyan-800"
                      >
                        Navigate to customer ↗
                      </a>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {r.status === 'Assigned' && (
                      <Button disabled={busyId === r.id} onClick={() => changeStatus(r, 'In progress')}>
                        {busyId === r.id ? 'Saving...' : 'Start job'}
                      </Button>
                    )}
                    {r.status === 'In progress' && (
                      <Button disabled={busyId === r.id} onClick={() => changeStatus(r, 'Completed')}>
                        {busyId === r.id ? 'Saving...' : 'Mark completed'}
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>}
      </section>
    </>
  )
}

function AdminHome({ requests, technicians }: any) {
  const technicianName = (id: string) =>
    technicians.find((t: Technician) => t.id === id)?.name || 'Technician'

  return (
    <>
      <h1 className="text-2xl font-bold text-[#102a43]">Admin dashboard</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">Monitor service requests and approved technicians. Technicians independently accept available jobs.</p>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ['All requests', requests.length],
          ['Approved technicians', technicians.length],
          ['Completed requests', requests.filter((r: ServiceRequest) => r.status === 'Completed').length]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-white p-5">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-[#102a43]">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-4 text-lg font-bold text-[#102a43]">All customer requests</h2>
        {requests.length === 0
          ? <p className="py-8 text-center text-sm text-slate-500">No requests available.</p>
          : <div className="space-y-4">
              {requests.map((r: ServiceRequest) => (
                <article key={r.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <b className="text-sm text-cyan-800">{r.category}</b>
                    <span className="text-xs font-semibold">{r.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">Customer: {r.customer} · {r.email}</p>
                  <p className="mt-2 text-xs text-slate-500">{r.description}</p>
                  <p className="mt-2 text-xs text-slate-600"><b>Address:</b> {r.customerAddress || 'Not provided'}</p>
                  {r.assignment && (
                    <p className="mt-2 text-xs font-semibold text-emerald-700">
                      Accepted by: {technicianName(r.assignment.technicianId)}
                    </p>
                  )}
                  <p className="mt-2 text-xs">Diagnosis: {r.diagnosis.likelyFault}</p>
                  {r.customerLatitude !== null && r.customerLongitude !== null && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${r.customerLatitude}&mlon=${r.customerLongitude}#map=16/${r.customerLatitude}/${r.customerLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-xs font-bold text-cyan-800"
                    >
                      View customer location ↗
                    </a>
                  )}
                </article>
              ))}
            </div>}
      </section>
    </>
  )
}

function Approvals() {
  const [rows, setRows] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    try {
      const result = await loadPendingTechnicians()
      setRows(result)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load approvals.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function approve(id: string) {
    try {
      await approveTechnician(id)
      setRows(old => old.filter(row => row.id !== id))
      setMessage('Technician approved successfully.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Approval failed.')
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-5">
      <h1 className="text-2xl font-bold text-[#102a43]">Technician approvals</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">Review Technician registrations before granting portal access.</p>
      {message && <p className="mb-4 rounded-lg bg-cyan-50 p-3 text-xs text-cyan-900">{message}</p>}
      {loading ? <p className="text-sm text-slate-500">Loading...</p> :
        rows.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No pending Technician registrations.</p> :
          <div className="space-y-3">
            {rows.map(row => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                <div>
                  <p className="text-sm font-bold">{row.full_name || 'Technician'}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.email}</p>
                </div>
                <Button onClick={() => approve(row.id)}>Approve technician</Button>
              </div>
            ))}
          </div>}
    </section>
  )
}

export function ServiceSenseApp() {
  const path = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refreshData(role: UserRole) {
    setError('')

    try {
      const requestData = await loadRequests()
      setRequests(requestData)

      if (role === 'Administrator') {
        const technicianData = await loadTechnicians()
        setTechnicians(technicianData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load data.')
    }
  }

  useEffect(() => {
    let active = true

    async function initialise() {
      const publicPaths = [
        '/',
        '/login',
        '/admin-login',
        '/customer-login',
        '/technician-login',
        '/pending-approval'
      ]

      if (publicPaths.includes(path)) {
        setLoading(false)
        return
      }

      try {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) {
          router.replace('/')
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id,full_name,email,role,approval_status')
          .eq('id', auth.user.id)
          .single()

        if (error) throw error

        if (data.approval_status === 'pending' || data.approval_status === 'rejected') {
          router.replace('/pending-approval')
          return
        }

        const roleMap: Record<string, UserRole> = {
          customer: 'Customer',
          technician: 'Technician',
          admin: 'Administrator'
        }

        const currentProfile: Profile = {
          id: data.id,
          name: data.full_name || auth.user.email || 'User',
          email: data.email || auth.user.email || '',
          role: roleMap[data.role],
          approval_status: data.approval_status
        }

        if (!currentProfile.role) throw new Error('Your account role is not configured.')

        if (!active) return
        setProfile(currentProfile)
        await refreshData(currentProfile.role)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load workspace.')
      } finally {
        if (active) setLoading(false)
      }
    }

    initialise()
    return () => { active = false }
  }, [path])

  useEffect(() => {
    if (!profile) return

    const allowed: Record<UserRole, string[]> = {
      Customer: ['/customer/requests', '/customer/new-request'],
      Technician: ['/technician'],
      Administrator: ['/analytics', '/admin/approvals']
    }

    const isAllowed = allowed[profile.role].some(route =>
      path === route || (route === '/customer/requests' && path.startsWith('/customer/requests/'))
    )

    if (path !== '/' && path !== '/login' && path !== '/pending-approval' &&
      !path.endsWith('-login') && !isAllowed) {
      const destination: Record<UserRole, string> = {
        Customer: '/customer/requests',
        Technician: '/technician',
        Administrator: '/analytics'
      }
      router.replace(destination[profile.role])
    }
  }, [profile, path, router])

  if (path === '/') return <Landing />
  if (path === '/admin-login') return <Login portal="admin" />
  if (path === '/customer-login' || path === '/login') return <Login portal="customer" />
  if (path === '/technician-login') return <Login portal="technician" />
  if (path === '/pending-approval') return <Pending />

  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading your workspace...</div>

  if (error) return <div className="mx-auto mt-20 max-w-xl rounded-xl border border-rose-200 bg-white p-6 text-sm text-rose-700">{error}</div>
  if (!profile) return null

  if (profile.role === 'Customer') {
    if (path.startsWith('/customer/requests/')) {
      const id = decodeURIComponent(path.split('/').pop() || '')
      return <Layout profile={profile}><RequestDetails request={requests.find(r => r.id === id)} /></Layout>
    }

    return <Layout profile={profile}>
      <CustomerHome
        profile={profile}
        requests={requests}
        refresh={() => refreshData(profile.role)}
      />
    </Layout>
  }

  if (profile.role === 'Technician') {
    return <Layout profile={profile}>
      <TechnicianHome
        profile={profile}
        requests={requests}
        refresh={() => refreshData(profile.role)}
      />
    </Layout>
  }

  if (path === '/admin/approvals') {
    return <Layout profile={profile}><Approvals /></Layout>
  }

  return <Layout profile={profile}>
    <AdminHome requests={requests} technicians={technicians} />
  </Layout>
}
