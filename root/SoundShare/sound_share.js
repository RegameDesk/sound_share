const pcMap = new Map()

const clientId = randomId(7)
document.getElementById('clientId').textContent = clientId

const url = 'ws://' + window.location.host + '/' + clientId
openSignaling(url).then((ws) => {
  console.log('WebSocket connected, signaling ready')
  const startButton = document.getElementById('start')
  startButton.disabled = false
  startButton.onclick = () => start(ws)
  
  const names = ['VK_VOLUME_MUTE', 'VK_VOLUME_DOWN', 'VK_VOLUME_UP', 'VK_MEDIA_NEXT_TRACK', 'VK_MEDIA_PREV_TRACK', 'VK_MEDIA_STOP', 'VK_MEDIA_PLAY_PAUSE']
  for (const name of names) {
    const btn = document.getElementById(name)
    btn.style.display = 'block'
    btn.onclick = () => sendKey(ws, btn.id)
  }
}).catch((err) => {
  showError(err)
})

function createPeerConnection(ws, id) {
  const config = {bundlePolicy: "max-bundle"}
  const pc = new RTCPeerConnection(config)
  
  pc.addEventListener('iceconnectionstatechange', () =>
    console.log('iceConnectionState: ' + pc.iceConnectionState))
  console.log('iceConnectionState: ' + pc.iceConnectionState)

  pc.addEventListener('icegatheringstatechange', () =>
    console.log('iceGatheringState: ' + pc.iceGatheringState))
  console.log('iceGatheringState: ' + pc.iceGatheringState)

  pc.addEventListener('signalingstatechange', () =>
    console.log('signalingState: ' + pc.signalingState))
  console.log('signalingState: ' + pc.signalingState)
  
  pc.ontrack = (evt) => {
    if (evt.track.kind !== 'audio') return
    // document.getElementById('media').style.display = 'block'
    const selectedChannel = document.querySelector('input[name="channel"]:checked').value
    const audio = document.getElementById('audio')
    if (selectedChannel === 'stereo') {
      audio.srcObject = evt.streams[0]
    } else {
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(evt.streams[0])
      const splitter = audioContext.createChannelSplitter(2)
      source.connect(splitter)
      //const merger = audioContext.createChannelMerger(2)
      let ch = 0
      if (selectedChannel === 'only_right') ch = 1
      // const gainNode = audioContext.createGain()
      // gainNode.gain.value = 0.0
      // splitter.connect(gainNode, 0)
      // gainNode.connect(merger, 0, 0)
      // splitter.connect(merger, ch, 0)
      // splitter.connect(merger, ch, 1)
      const destination = audioContext.createMediaStreamDestination()
      // merger.connect(destination)
      splitter.connect(destination, ch)
      audio.srcObject = destination.stream
    }
    audio.play()
  }
  
  console.log('Add', id)
  pcMap.set(id, pc)
  return pc
}

async function handleOffer(ws, offer) {
    const pc = createPeerConnection(ws, clientId);
    await pc.setRemoteDescription(offer);
    await sendAnswer(ws, pc);
}

function offerPeerConnection(ws, id) {
  console.log(`Offering to ${id}`)
  const pc = createPeerConnection(ws, clientId)
  sendOfferLocalDescription(ws, id, pc)
}

function openSignaling (url) {
  console.log('Connecting to signaling: ' + url)
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)

    ws.onopen = () => resolve(ws)
    ws.onerror = () => {
      document.getElementById('start').disabled = true
      reject(new Error('WebSocket error'))
    }
    ws.onclose = () => {
      console.error('WebSocket disconnected')
      document.getElementById('start').disabled = true
    }
    ws.onmessage = (e) => {
      if (typeof (e.data) !== 'string') return

      const msg = JSON.parse(e.data)
      const { id, type } = msg
      console.log('Got', type)
      const pc = pcMap.get(id)
      if (!pc) {
        if (type != 'offer') {
          console.log('Invalid message:', msg)
          return
        }
      }

      switch (type) {
        case 'offer':
          // console.log(msg.sdp)
          handleOffer(ws, msg)
          break
        case 'answer':
          console.warn('Got an ' + type + ', ignore it!')
          break
        case 'candidate':
          pc.addIceCandidate({
            candidate: msg.candidate,
            sdpMid: msg.mid
          })
          break
      }
    }
  })
}

function randomId (length) {
  // base58
  const characters = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  const pickRandom = () => characters.charAt(Math.floor(Math.random() * characters.length))
  return [...Array(length)].map(pickRandom).join('')
}

async function sendAnswer(ws, pc) {
  let mono_answer = await pc.createAnswer()
  const start_pos = mono_answer.sdp.indexOf('a=fmtp')
  const end_pos = mono_answer.sdp.indexOf('\r\n', start_pos)
  const line = mono_answer.sdp.substring(start_pos, end_pos)
  if (-1 == line.indexOf('stereo=1')) {
    mono_answer.sdp = mono_answer.sdp.slice(0, end_pos) + ';stereo=1' + mono_answer.sdp.slice(end_pos)
  }
  await pc.setLocalDescription(mono_answer)
  await waitGatheringComplete(pc)

  const answer = pc.localDescription
  // console.log(answer.sdp)
  ws.send(JSON.stringify({
    id: "SoundShare",
    type: answer.type,
    sdp: answer.sdp,
  }))
}

function sendKey(ws, name) {
  ws.send(JSON.stringify({id : 'SoundShare', type : 'key', name}))
}

function sendOfferLocalDescription(ws, id, pc) {
  const options = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: false,
    iceRestart: false
  }
  pc.createOffer(options)
    .then((offer) => pc.setLocalDescription(offer))
    .then(() => {
      const {sdp, type} = pc.localDescription
      ws.send(JSON.stringify({id, type, sdp}))
    })
    .catch((reason) => {
      showError(reason)
    })
}

function sendRequest(ws, id) {
  ws.send(JSON.stringify({
    id,
    type: "request",
  }));
}

function showError(error_text) {
  const err = document.getElementById('error')
  err.textContent = error_text
  err.style.display = 'block'
}

function start(ws) {
  document.getElementById('start').style.display = 'none'
  document.getElementById('stop').style.display = 'inline-block'
  document.getElementById('media').style.display = 'block'
  document.getElementById('only_left').disabled = true
  document.getElementById('stereo').disabled = true
  document.getElementById('only_right').disabled = true
  sendRequest(ws, 'SoundShare')
}

function stop() {
  document.getElementById('stop').style.display = 'none'
  document.getElementById('media').style.display = 'none'
  document.getElementById('start').style.display = 'inline-block'
  document.getElementById('only_left').disabled = false
  document.getElementById('stereo').disabled = false
  document.getElementById('only_right').disabled = false

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
}

async function waitGatheringComplete(pc) {
    return new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') {
            resolve()
        } else {
            pc.addEventListener('icegatheringstatechange', () => {
                if (pc.iceGatheringState === 'complete') {
                    resolve()
                }
            })
        }
    })
}
