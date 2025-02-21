const clientId = randomId(7)
const pcMap = new Map()
const commonServers = [
  '10.0.0.8:1218',
  '127.0.0.1:1218',
  '192.168.1.8:1218',
]
const urlInput = document.getElementById('urlInput')
const autocompleteList = document.getElementById('autocompleteList')
const output = document.getElementById('output')
let currentIndex = -1
let currentMatchedItems = []
let history = JSON.parse(localStorage.getItem('serverHistory')) || []

document.getElementById('clientId').textContent = clientId
urlInput.value = window.location.host
urlInput.addEventListener('input', (e) => {
  currentIndex = -1
  
  const value = e.target.value.trim()
  autocompleteList.innerHTML = ''
  if (!value) return

  const allSuggestions = Array.from(new Set([...history, ...commonServers]))

  const matched = allSuggestions.filter(item => 
    item.toLowerCase().includes(value.toLowerCase())
  )

  matched.forEach(item => {
    const div = document.createElement('div')
    div.className = 'autocomplete-item'
    div.textContent = item
    div.onclick = () => {
      urlInput.value = item
      autocompleteList.innerHTML = ''
    }
    autocompleteList.appendChild(div)
  })
})

urlInput.addEventListener('blur', () => {
  setTimeout(() => {
    autocompleteList.innerHTML = ''
  }, 200)
})

urlInput.addEventListener('keydown', (e) => {
  const items = autocompleteList.querySelectorAll('.autocomplete-item')
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    currentIndex = (currentIndex >= items.length - 1) ? 0 : currentIndex + 1
    updateSelection(items)
  }
  
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    currentIndex = (currentIndex <= 0) ? items.length - 1 : currentIndex - 1
    updateSelection(items)
  }
  
  if (e.key === 'Enter') {
    e.preventDefault()
    if (currentIndex > -1 && items[currentIndex]) {
        items[currentIndex].click()
    }
  }
})

function addStereo(origin) {
  const start_pos = origin.indexOf('a=fmtp')
  const end_pos = origin.indexOf('\r\n', start_pos)
  const line = origin.substring(start_pos, end_pos)
  if (-1 == line.indexOf('stereo=1')) {
    origin = origin.slice(0, end_pos) + ';stereo=1' + origin.slice(end_pos)
  }
  return origin
}

function appendOutput(text) {
  output.textContent += text + '\n'
}

function createPeerConnection(ws, id) {
  const conf = {
    bundlePolicy: "max-bundle",
    iceServers: [
      // { urls: "stun:stun.l.google.com:19302" }
    ]
  }
  const pc = new RTCPeerConnection(conf)

  pc.addEventListener('iceconnectionstatechange', () =>
    console.log('iceConnectionState: ' + pc.iceConnectionState))
  console.log('iceConnectionState: ' + pc.iceConnectionState)

  pc.addEventListener('icegatheringstatechange', () =>
    console.log('iceGatheringState: ' + pc.iceGatheringState))
  console.log('iceGatheringState: ' + pc.iceGatheringState)

  pc.addEventListener('signalingstatechange', () =>
    console.log('signalingState: ' + pc.signalingState))
  console.log('signalingState: ' + pc.signalingState)
  
  pcMap.set(id, pc)
  return pc
}

function openSignaling(url) {
  console.log('Connecting to signaling: ' + url)
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)

    ws.onopen = () => resolve(ws)
    ws.onerror = () => {
      document.getElementById('start').style.display = 'inline-block'
      document.getElementById('stop').style.display = 'none'
      reject(new Error('WebSocket error'))
    }
    ws.onclose = () => {
      showError('WebSocket disconnected!')
      document.getElementById('start').style.display = 'inline-block'
      document.getElementById('stop').style.display = 'none'
    }
    ws.onmessage = (e) => {
      if (typeof (e.data) !== 'string') return

      const msg = JSON.parse(e.data)
      const { id, type } = msg
      const pc = pcMap.get(id)
      if (!pc) {
        console.warn('Got an ' + type + ', ignore it!')
        return
      }
      console.log('Got', type, 'id', id)

      switch (type) {
        case 'offer':
          console.log(msg.sdp)
          break
        case 'answer':
          pc.setRemoteDescription({
            sdp: msg.sdp,
            type
          }).then(() => {
            // console.log('Got an ' + type)
            console.log('Got an ' + type + ': ' + msg.sdp)
          })
          break
        case 'candidate':
          console.log('Got an ' + type)
          pc.addIceCandidate({
            candidate: msg.candidate,
            sdpMid: msg.mid
          }).then(() => {
            console.log('Got an ' + type + ': ' + msg.candidate)
          })
          break
      }
    }
  })
}

function randomId(length) {
  // base58
  const characters = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  const pickRandom = () => characters.charAt(Math.floor(Math.random() * characters.length))
  return [...Array(length)].map(pickRandom).join('')
}

function removeRtpmap(sdp) {
    const lines = sdp.split('\r\n');
    const newLines = lines.filter(line => {
      if (line.startsWith('a=rtpmap:')) {
        if (line.startsWith('a=rtpmap:109 ')) {
          return true
        }
        if (line.startsWith('a=rtpmap:111 ')) {
          return true
        }
        return false
      }

      if (line.startsWith('a=rtcp-fb:')) {
        if (line.startsWith('a=rtcp-fb:109 ')) {
          return true
        }
        if (line.startsWith('a=rtcp-fb:111 ')) {
          return true
        }
        return false
      }

      if (line.startsWith('a=fmtp:')) {
        if (line.startsWith('a=fmtp:109 ')) {
          return true
        }
        if (line.startsWith('a=fmtp:111 ')) {
          return true
        }
        return false
      }

      return true
    })
    return newLines.join('\r\n');
}

function saveToHistory(item) {
  if (!history.includes(item)) {
    history.unshift(item)
    localStorage.setItem('serverHistory', JSON.stringify(history))
  }
}

function sendOffer(ws, id, stream) {
  const pc = createPeerConnection(ws, id)
  stream.getTracks().forEach(track => {
    // console.log(track)
    // pc.addTrack(track, stream)
    const transceiver = pc.addTransceiver(track, {
      direction: 'sendonly',
      streams: [stream]
    })
    // let supportedCodecs = RTCRtpReceiver.getCapabilities("audio").codecs
    // supportedCodecs[0].sdpFmtpLine = 'minptime=10;useinbandfec=0'
    // console.log(supportedCodecs)
    // transceiver.setCodecPreferences(supportedCodecs)
  })

  const options = {
    iceRestart: false
  }
  pc.createOffer(options)
    .then((offer) => {
      offer.sdp = addStereo(removeRtpmap(offer.sdp))
      console.log('Offer SDP:', offer.sdp)
      return pc.setLocalDescription(offer)
    })
    .then(() => {
      const {sdp, type} = pc.localDescription
      const sdp1 = removeRtpmap(sdp)
      console.log('Offer:', sdp1)
      ws.send(JSON.stringify({id, type, sdp: sdp1}))
      // ws.send(JSON.stringify({id, type, sdp}))
    })
    .catch((reason) => {
      showError(reason)
    })
}

function showError(error_text) {
  const err = document.getElementById('error')
  err.textContent = error_text
  err.style.display = 'block'
}

function start() {
  const constraints = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
    },
    video: false
  }
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    const ep = urlInput.value
    if (ep.length < 3) return

    const url = 'wss://' + ep + '/' + clientId
    showError('')
    openSignaling(url).then((ws) => {
      console.log('WebSocket connected, signaling ready')
      saveToHistory(ep)

      document.getElementById('start').style.display = 'none'
      const stopButton = document.getElementById('stop')
      stopButton.style.display = 'inline-block'
      stopButton.onclick = () => stop(ws, stream)

      sendOffer(ws, 'MicShare', stream)
    }).catch((err) => {
      showError(err)
    })
  }).catch((err) => {
    showError(err)
  })
}

function stop(ws, stream) {
  const audioTracks = stream.getAudioTracks()
  audioTracks.forEach(track => track.stop())
  document.getElementById('stop').style.display = 'none'
  document.getElementById('start').style.display = 'inline-block'

  pcMap.forEach((pc, id) => {
    if (pc === null) return
    console.log('Closing', id)

    if (pc.getTransceivers) {
      pc.getTransceivers().forEach((transceiver) => {
        if (transceiver.stop) {
          transceiver.stop()
        }
      })
    }

    pc.getSenders().forEach((sender) => {
      const track = sender.track
      if (track !== null) {
        sender.track.stop()
      }
    })

    pc.close()
    pc = null
  })
  pcMap.clear()
  ws.close(1000, 'Normal closure')
}

function updateSelection(items) {
  items.forEach(item => item.classList.remove('active'))
  
  if (items[currentIndex]) {
    items[currentIndex].classList.add('active')
    items[currentIndex].scrollIntoView({
      block: 'nearest',
      behavior: 'auto'
    })
  }
}