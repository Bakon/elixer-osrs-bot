import { Channel } from "@tauri-apps/api/core"
import { Store } from "./store"

export interface ChannelEntry {
	name: string
	version: number
	stopped: boolean
	start: number
	finish: number
	clientTitle: string // RSN / window title this ran on
	client: unknown // the WindowMatch, kept so we can restart on the same client
	args: string[] // run args, kept for restart
}

export interface LogSegment {
	text: string
	color: string
	close: boolean
}

const MAX_LOGS = 5000

function parseLogMessage(msg: string): LogSegment[] {
	const segments: LogSegment[] = []

	let color = "FFFFFF"
	let textStart = 0
	let i = 0

	while (i < msg.length - 10) {
		// Marker prefix: 00
		if (msg.charCodeAt(i) !== 0) {
			i++
			continue
		}
		if (msg.charCodeAt(i + 1) !== 0) {
			i++
			continue
		}

		const type = msg.charCodeAt(i + 2)

		// Color change: 001
		if (type === 1) {
			if (i > textStart) {
				segments.push({
					text: msg.slice(textStart, i),
					color,
					close: false
				})
			}

			const b = msg.charAt(i + 5) + msg.charAt(i + 6)
			const g = msg.charAt(i + 7) + msg.charAt(i + 8)
			const r = msg.charAt(i + 9) + msg.charAt(i + 10)

			color = r + g + b
		}
		// Reset color: 00200000000
		else if (type === 2 && msg.slice(i + 3, i + 11) === "00000000") {
			if (i > textStart) {
				segments.push({
					text: msg.slice(textStart, i),
					color,
					close: false
				})
			}

			color = "FFFFFF"
		}

		i += 11
		textStart = i
		continue
	}

	// Remaining text
	if (textStart < msg.length) {
		segments.push({
			text: msg.slice(textStart),
			color,
			close: true
		})
	} else if (segments.length > 0) {
		// Message ended with a marker
		segments[segments.length - 1].close = true
	}

	return segments
}

class ChannelManager extends Store {
	private _logsBuffer: Record<number, LogSegment[]> = {}

	processes: number[] = []
	channels: Record<number, ChannelEntry> = {}

	async createChannel(
		name: string,
		clientTitle = "",
		client: unknown = null,
		args: string[] = []
	): Promise<Channel<string>> {
		const channel = new Channel<string>()
		const id = channel.id

		this._logsBuffer[id] = []
		this.channels[id] = {
			name,
			version: 0,
			stopped: false,
			start: Date.now(),
			finish: 0,
			clientTitle,
			client,
			args
		}
		this.processes = [...this.processes, id]

		channel.onmessage = (msg: string) => {
			const entry = this.channels[id]
			if (!entry || entry.stopped) {
				return
			}

			const buffer = this._logsBuffer[id]
			const parsed = parseLogMessage(msg)

			buffer.push(...parsed)

			while (buffer.length > MAX_LOGS) {
				buffer.shift()
			}

			entry.version++
			this.emit()
		}

		this.emit()
		return channel
	}

	stopChannel(id: number) {
		if (this.channels[id]) {
			this.channels[id].stopped = true
			this.channels[id].finish = Date.now()
			this.emit()
		}
	}

	removeChannel(id: number) {
		if (!this.channels[id]) return
		delete this._logsBuffer[id]
		delete this.channels[id]
		this.processes = this.processes.filter((item) => item !== id)
		this.emit()
	}

	getLogs(id: number) {
		if (!this.channels[id]) return []
		return this._logsBuffer[id]
	}
}

export const channelManager = new ChannelManager()
