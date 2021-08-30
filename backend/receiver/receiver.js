function formSubmit(event) {
    event.preventDefault()
    console.log(event)
    const offer = document.getElementById("offer").value
    let tmp = JSON.parse(offer)
    let ofr = {}
    ofr['sdp'] = tmp.sdp
    ofr['type'] = tmp.type
    remoteConnection.setRemoteDescription(ofr).then(() => console.log("Done"))

    remoteConnection.createAnswer().then(a => remoteConnection.setLocalDescription(a)).then(() => {
        document.getElementById('answer').innerHTML =
            JSON.stringify(remoteConnection.localDescription)
    })
}

const form = document.getElementById('form')
form.addEventListener('submit', formSubmit)


// const iceConfiguration = {}
// iceConfiguration.iceServers = []
// stun server
// iceConfiguration.iceServers.push({
//     urls: 'stun:stun1.l.google.com:19302'
// })


const conf = {}
conf.iceServers = []

// stun server
conf.iceServers.push({
    urls: 'stun:stun1.l.google.com:19302'
})

const remoteConnection = new RTCPeerConnection(conf)

remoteConnection.onicecandidate = () => {
    console.log("NEW ice candidate")
    JSON.stringify(remoteConnection.localDescription)
}

remoteConnection.ondatachannel = e => {
    const receiveChannel = e.channel
    receiveChannel.onmessage = e => console.log("Message from peer: " + e.data)
    receiveChannel.onopen = () => console.log("Connection Opened")
    receiveChannel.onclose = () => console.log("Connection Closed")
    remoteConnection.channel = receiveChannel
}
