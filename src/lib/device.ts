import type { Device } from './types'

const DEVICE_ID_KEY = 'saydo_device_id'
const DEVICE_NAME_KEY = 'saydo_device_name'

export function getStoredDeviceId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(DEVICE_ID_KEY)
}

export function getStoredDeviceName(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(DEVICE_NAME_KEY)
}

export function storeDevice(id: string, name: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEVICE_ID_KEY, id)
  localStorage.setItem(DEVICE_NAME_KEY, name)
}

export function clearStoredDevice(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DEVICE_ID_KEY)
  localStorage.removeItem(DEVICE_NAME_KEY)
}

export async function registerDevice(name: string): Promise<Device> {
  const response = await fetch('/api/devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    throw new Error('Failed to register device')
  }

  const device = await response.json()
  storeDevice(device.id, device.name)
  return device
}

export async function fetchDevice(id: string): Promise<Device | null> {
  const response = await fetch(`/api/devices/${id}`)
  if (!response.ok) return null
  return response.json()
}

export async function updateDeviceHeartbeat(id: string): Promise<void> {
  await fetch(`/api/devices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ heartbeat: true }),
  })
}

export async function fetchAllDevices(): Promise<Device[]> {
  const response = await fetch('/api/devices')
  if (!response.ok) return []
  return response.json()
}

export async function updateDeviceFcmToken(id: string, fcmToken: string): Promise<void> {
  await fetch(`/api/devices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fcm_token: fcmToken }),
  })
}
