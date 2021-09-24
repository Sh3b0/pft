const status = document.getElementById('status')
const progress = document.getElementsByClassName('progress')[0]
const progressFill = document.getElementsByClassName('progress-fill')[0]
const progressText = document.getElementsByClassName('progress-text')[0]
const connectButton = document.getElementById('connect-button')
const inviteLink = document.getElementById('invite-link')

let remoteConnection, receiverBuffer = [], receivedSize = 0
let offer, fileMeta, receiveChannel

// Connection establishment
window.onload = () => {
    const conf = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]}
    remoteConnection = new RTCPeerConnection(conf)
    remoteConnection.onicecandidate = () => {
        console.log("New ice candidate")
        JSON.stringify(remoteConnection.localDescription)
    }
    remoteConnection.ondatachannel = e => {
        receiveChannel = e.channel
        receiveChannel.binaryType = 'arraybuffer'
        receiveChannel.onopen = () => {
            progress.style.display = "flex"
        }
        receiveChannel.onmessage = e => {
            receiverBuffer.push(e.data)
            receivedSize += e.data.byteLength
            progressText.innerText = "Downloading " +
                (receivedSize / fileMeta.size * 100).toFixed(2).toString() + "% ..."
            progressFill.style.width = (receivedSize / fileMeta.size * 100).toString() + "%"
            if (receivedSize === fileMeta.size) {
                status.textContent = 'Download Complete!'
                const blob = new Blob(receiverBuffer)
                receiverBuffer = []
                receivedSize = 0
                let downloadLink = document.createElement('a')
                downloadLink.href = URL.createObjectURL(blob)
                downloadLink.download = fileMeta.name
                downloadLink.click()
                receiverBuffer = []
                receivedSize = 0
            }
        }
        remoteConnection.channel = receiveChannel
        remoteConnection.addEventListener('datachannel',)
    }
    get_offer(document.location.pathname.split('/')[2])
}

function get_offer(room_id) {
    if (room_id === "") return
    console.log("Getting offer...")
    status.textContent = "Connecting"
    let xhr = new XMLHttpRequest()
    let roomLink = document.location.origin + '/api/' + room_id
    xhr.open("GET", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send()
    xhr.onreadystatechange = e => {
        if (e.target.readyState === 4) {
            let rsp = JSON.parse(JSON.parse(xhr.response))
            offer = {
                type: rsp.type,
                sdp: rsp.sdp
            }
            fileMeta = {
                name: rsp["name"],
                size: rsp["size"],
                last_modifed: rsp["last_modified"]
            }
            put_answer(room_id)
        }
    }
}

function put_answer(room_id) {
    console.log("Putting answer...")
    status.textContent = "Connecting"
    let xhr = new XMLHttpRequest()
    let roomLink = document.location.origin + '/api/' + room_id
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

connectButton.onclick = () => {
    let room = inviteLink.value
    console.log(room)
    if (Number.isInteger(parseInt(room))) {
        get_offer(room)
    } else if (Number.isInteger(parseInt(room.split('/').slice(-1)[0]))) {
        get_offer(room.split('/').slice(-1)[0])
    } else {
        alert("Invalid invitation link or room id.")
    }
}
window.onbeforeunload = closeConnection
