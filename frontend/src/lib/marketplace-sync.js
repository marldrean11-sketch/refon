const CHANNEL_NAME = 'refon-marketplace-sync'
const CHANGE_MESSAGE = 'marketplace-data-changed'

let broadcastChannel

function canUseBroadcastChannel() {
  return typeof window !== 'undefined' && 'BroadcastChannel' in window
}

function getBroadcastChannel() {
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME)
  }

  return broadcastChannel
}

export function subscribeToMarketplaceChanges(listener) {
  if (!canUseBroadcastChannel()) {
    return () => {}
  }

  const channel = getBroadcastChannel()
  const handleMessage = (event) => {
    if (event.data?.type === CHANGE_MESSAGE) {
      listener()
    }
  }

  channel.addEventListener('message', handleMessage)

  return () => {
    channel.removeEventListener('message', handleMessage)
  }
}

export function notifyMarketplaceChange() {
  if (!canUseBroadcastChannel()) {
    return
  }

  getBroadcastChannel().postMessage({ type: CHANGE_MESSAGE })
}
