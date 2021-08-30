function formSubmit(event) {
    event.preventDefault()
    console.log(event)
    const answer = document.getElementById("answer").value
    let tmp = JSON.parse(answer)
    let ans = {}
    ans['type'] = tmp.type
    ans['sdp'] = tmp.sdp
    localConnection.setRemoteDescription(ans).then(() => console.log("Done"))
}

const form = document.getElementById('form')
form.addEventListener('submit', formSubmit)


const conf = {}
conf.iceServers = []

// stun server
conf.iceServers.push({
    urls: 'stun:stun1.l.google.com:19302'
})

const localConnection = new RTCPeerConnection(conf)

localConnection.onicecandidate = () => {
    console.log("New ice candidate")
    const offer = localConnection.localDescription
    const offerTxt = document.getElementById('offer')
    offerTxt.innerHTML = JSON.stringify(offer)
}


const sendChannel = localConnection.createDataChannel("sendChannel")
sendChannel.onmessage = e => console.log("Message from peer: " + e.data)
sendChannel.onopen = () => console.log("Channel opened")
sendChannel.onclose = () => console.log("Channel closed")

localConnection.createOffer().then(o => localConnection.setLocalDescription(o))
