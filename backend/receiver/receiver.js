// Receiver code

// Globals
const form = document.getElementById('form')
let downloadLink = document.getElementById('downloadLink')
let remoteConnection
let receiverBuffer = []
let receivedSize = 0

// TODO: get file meta from sender, this is just a test with README.md file of this repo
let file = {}
file.size = 577
file.name = 'README.md'

// Connection establishment
window.onload = e => {
    const conf = {}
    conf.iceServers = []

    // stun server
    conf.iceServers.push({
        urls: 'stun:stun1.l.google.com:19302'
    })

    remoteConnection = new RTCPeerConnection(conf)
    remoteConnection.onicecandidate = () => {
        console.log("New ice candidate")
        JSON.stringify(remoteConnection.localDescription)
    }

    remoteConnection.ondatachannel = e => {
        const receiveChannel = e.channel
        receiveChannel.binaryType = 'arraybuffer'
        receiveChannel.onopen = () => console.log("Connection Opened")
        receiveChannel.onclose = () => console.log("Connection Closed")
        receiveChannel.onmessage = e => {
            // console.log("Message from peer: " + e.data)
            receiverBuffer.push(e.data)
            receivedSize += e.data.byteLength
            if (receivedSize === file.size) {
                console.log('Download Complete!')
                const blob = new Blob(receiverBuffer)
                receiverBuffer = []
                receivedSize = 0
                downloadLink.href = URL.createObjectURL(blob)
                downloadLink.download = file.name
                downloadLink.textContent = `Download ${file.name}`
                // TODO: closeChannel()
            }
        }

        remoteConnection.channel = receiveChannel
        remoteConnection.addEventListener('datachannel', )
    }
}

// Temporary method of connection establishment
// TODO: create rooms system
form.onsubmit = e => {
    e.preventDefault()
    const offer = document.getElementById("offer").value

    remoteConnection.setRemoteDescription(JSON.parse(offer)).then(() => console.log("Connected to sender."))
    remoteConnection.createAnswer().then(a => remoteConnection.setLocalDescription(a)).then(() => {
        document.getElementById('answer').innerHTML =
            JSON.stringify(remoteConnection.localDescription)
    })
}
