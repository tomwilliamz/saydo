let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

export function playAlertChime(): void {
  try {
    const ctx = getAudioContext()

    // Resume context if suspended (required after user interaction)
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const now = ctx.currentTime

    // Create two oscillators for a two-tone chime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    const gain2 = ctx.createGain()

    osc1.connect(gain1)
    osc2.connect(gain2)
    gain1.connect(ctx.destination)
    gain2.connect(ctx.destination)

    // First tone: A5 (880 Hz)
    osc1.frequency.setValueAtTime(880, now)
    osc1.type = 'sine'
    gain1.gain.setValueAtTime(0.4, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

    // Second tone: E5 (659 Hz), starts slightly after
    osc2.frequency.setValueAtTime(659, now + 0.15)
    osc2.type = 'sine'
    gain2.gain.setValueAtTime(0, now)
    gain2.gain.setValueAtTime(0.4, now + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45)

    osc1.start(now)
    osc1.stop(now + 0.3)
    osc2.start(now + 0.15)
    osc2.stop(now + 0.45)
  } catch (error) {
    console.error('Failed to play alert chime:', error)
  }
}

export function playUrgentChime(): void {
  try {
    const ctx = getAudioContext()

    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const now = ctx.currentTime

    // More urgent: three quick ascending tones
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      const startTime = now + i * 0.12
      const freq = 600 + i * 200 // 600, 800, 1000 Hz

      osc.frequency.setValueAtTime(freq, startTime)
      osc.type = 'sine'

      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1)

      osc.start(startTime)
      osc.stop(startTime + 0.1)
    }
  } catch (error) {
    console.error('Failed to play urgent chime:', error)
  }
}

// Very jarring, loud alarm for escalated alerts
export function playEscalatedAlarm(): void {
  try {
    const ctx = getAudioContext()

    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const now = ctx.currentTime

    // Create a harsh, attention-grabbing alarm with multiple oscillators
    // and rapid frequency modulation
    for (let burst = 0; burst < 4; burst++) {
      const burstStart = now + burst * 0.25

      // Main harsh tone with sawtooth wave
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.type = 'sawtooth'
      osc1.frequency.setValueAtTime(800, burstStart)
      osc1.frequency.linearRampToValueAtTime(1200, burstStart + 0.1)
      osc1.frequency.linearRampToValueAtTime(800, burstStart + 0.2)
      gain1.gain.setValueAtTime(0.6, burstStart)
      gain1.gain.setValueAtTime(0.6, burstStart + 0.15)
      gain1.gain.exponentialRampToValueAtTime(0.01, burstStart + 0.22)
      osc1.start(burstStart)
      osc1.stop(burstStart + 0.22)

      // High pitched overlay with square wave
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.type = 'square'
      osc2.frequency.setValueAtTime(1400, burstStart)
      osc2.frequency.linearRampToValueAtTime(1800, burstStart + 0.05)
      osc2.frequency.linearRampToValueAtTime(1400, burstStart + 0.1)
      gain2.gain.setValueAtTime(0.3, burstStart)
      gain2.gain.exponentialRampToValueAtTime(0.01, burstStart + 0.12)
      osc2.start(burstStart)
      osc2.stop(burstStart + 0.12)
    }
  } catch (error) {
    console.error('Failed to play escalated alarm:', error)
  }
}
