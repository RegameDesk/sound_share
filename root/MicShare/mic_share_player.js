const pcMap = new Map()
const myId = 'MicSharePlayer'

function createPeerConnection(ws, id) {
  console.log('ID', id)
  
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

  pc.onicecandidate = (evt) => {
    if (evt.candidate) {
      console.log('Candidate:', evt.candidate)
      // sendCandidateToRemote(ws, id, evt.candidate)
    } else {
      console.log('Candidate done!');
    }
  }
  pc.ontrack = (evt) => {
    console.log(evt)
    if (evt.track.kind !== 'audio') return
    if (0 === evt.streams.length) return
    const audio = document.getElementById('audio')
    audio.srcObject = evt.streams[0]
    audio.play()
  }

  console.log('Add', id)
  pcMap.set(id, pc)
  return pc
}

async function handleOffer(ws, id, offer) {
    const pc = createPeerConnection(ws, id)
    await pc.setRemoteDescription(offer)
    await sendAnswer(ws, id, pc)
}

function openSignaling(url) {
  console.log('Connecting to signaling: ' + url)
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)

    ws.onopen = () => resolve(ws)
    ws.onerror = () => {
      stop()
      reject(new Error('WebSocket error'))
    }
    ws.onclose = () => {
      showError('WebSocket disconnected')
      stop()
    }
    ws.onmessage = (e) => {
      if (typeof (e.data) !== 'string') return

      const msg = JSON.parse(e.data)
      const { id, type } = msg
      const pc = pcMap.get(id)
      if (!pc) {
        if (type != 'offer') {
          console.log('Invalid message:', msg)
          return
        }
      }
      console.log('Got', type, 'id', id)

      switch (type) {
        case 'offer':
          // console.log(msg.sdp)
          handleOffer(ws, id, msg)
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

async function sendAnswer(ws, id, pc) {
  await pc.setLocalDescription(await pc.createAnswer())
  await waitGatheringComplete(pc)

  const answer = pc.localDescription
  // console.log(answer.sdp)
  ws.send(JSON.stringify({
    id,
    type: answer.type,
    sdp: answer.sdp,
  }))
}

function sendCandidateToRemote(ws, id, candidateObj) {
  const {candidate, sdpMid} = candidateObj
  ws.send(JSON.stringify({
    id,
    type : 'candidate',
    candidate,
    mid : sdpMid,
  }))
}

function sendRequest(ws, id) {
  ws.send(JSON.stringify({
    id,
    type: "request",
  }))
}

function showError(error_text) {
  const err = document.getElementById('error')
  err.textContent = error_text
  err.style.display = 'block'
}

function start(ws) {
  const url = 'wss://' + window.location.host + '/' + myId
  showError('')

  openSignaling(url).then((ws) => {
    console.log('WebSocket connected, signaling ready')
    
    document.getElementById('start').style.display = 'none'
    const stopButton = document.getElementById('stop')
    stopButton.style.display = 'inline-block'
    stopButton.onclick = () => ws.close()
      
    sendRequest(ws, 'MicShare')
  }).catch((err) => {
    showError(err)
  })
}

function stop() {
  document.getElementById('start').style.display = 'inline-block'
  document.getElementById('stop').style.display = 'none'
    
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
