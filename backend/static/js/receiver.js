const progress = document.getElementById('progress')
const status = document.getElementById('status')

let downloadLink = document.getElementById('downloadLink')
let remoteConnection, receiverBuffer = [], receivedSize = 0
let offer, fileMeta, receiveChannel

function get_offer() {
    let roomId = document.location.pathname.split('/')[2]
    if (roomId === "") return
    console.log("Getting offer...")
    status.textContent = "Connecting"
    let xhr = new XMLHttpRequest()
    let roomLink = document.location.origin + '/api/' + roomId
    xhr.open("GET", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send()
    xhr.onreadystatechange = e => {
        // console.log(e)
        if (e.target.readyState === 4) {
            let rsp = JSON.parse(JSON.parse(xhr.response))
            // console.log(rsp)
            offer = {
                type: rsp.type,
                sdp: rsp.sdp
            }
            fileMeta = {
                name: rsp["name"],
                size: rsp["size"],
                last_modifed: rsp["last_modified"]
            }
            // console.log(offer)
            // console.log(fileMeta)
            put_answer()
        }
    }
}

function put_answer() {
    console.log("Putting answer...")
    status.textContent = "Connecting"
    let xhr = new XMLHttpRequest()
    let roomId = document.location.pathname.split('/')[2]
    let roomLink = document.location.origin + '/api/' + roomId
    xhr.open("PUT", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')

    remoteConnection.setRemoteDescription(offer)
        .then(() => {
            status.textContent = "Connected"
            remoteConnection.createAnswer().then(a => remoteConnection.setLocalDescription(a))
                .then(() => xhr.send(JSON.stringify(remoteConnection.localDescription)))
                .catch(() => status.textContent = "Connection Error")
        })
        .catch(() => status.textContent = "Connection Error")


}

// Connection establishment
window.onload = () => {
    console.log("Window loaded")
    const conf = {iceServers: [{urls: 'stun:stun1.l.google.com:19302'}]}
    remoteConnection = new RTCPeerConnection(conf)
    remoteConnection.onicecandidate = () => {
        console.log("New ice candidate")
        JSON.stringify(remoteConnection.localDescription)
    }
    remoteConnection.ondatachannel = e => {
        receiveChannel = e.channel
        receiveChannel.binaryType = 'arraybuffer'
        receiveChannel.onopen = () => console.log("Connection Opened")
        receiveChannel.onclose = () => console.log("Connection Closed")
        receiveChannel.onmessage = e => {
            // console.log("Message from peer: " + e.data)
            receiverBuffer.push(e.data)
            receivedSize += e.data.byteLength
            progress.value = receivedSize / fileMeta.size * 100
            if (receivedSize === fileMeta.size) {
                status.textContent = 'Download Complete!'
                const blob = new Blob(receiverBuffer)
                receiverBuffer = []
                receivedSize = 0
                downloadLink.href = URL.createObjectURL(blob)
                downloadLink.download = fileMeta.name
                downloadLink.textContent = `Download ${fileMeta.name}`
                closeConnection()
            }
        }
        remoteConnection.channel = receiveChannel
        remoteConnection.addEventListener('datachannel',)
    }
    get_offer()
}

function closeConnection() {
    console.log('Closing Connection...')
    if (receiveChannel) {
        receiveChannel.close()
        receiveChannel = null
    }
    if (remoteConnection) {
        remoteConnection.close()
        remoteConnection = null
    }
}

window.onbeforeunload = closeConnection
