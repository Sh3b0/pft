'use strict';

const connectButton = document.getElementById('connect-button')
let remoteConnection, receiverBuffer = [], receivedSize = 0, offer, fileMeta, receiveChannel

// Connection establishment
window.onload = () => {
    try {
        remoteConnection = new RTCPeerConnection(conf)
    } catch (ReferenceError) {
        alert("Your browser doesn't support WebRTC, please use a different one to be able to use the app.")
        return
    }
    remoteConnection.ondatachannel = e => {
        receiveChannel = e.channel
        receiveChannel.binaryType = 'arraybuffer'
        receiveChannel.onopen = () => {
            status.dispatchEvent(
                new CustomEvent('statusChange', {detail: "Connected"})
            )
            progress.style.display = "flex"
        }
        receiveChannel.onmessage = e => {
            if (typeof(e.data) === "string") {  // Sending another file
                console.log(e.data)
                console.log(JSON.parse(e.data))
                fileMeta = JSON.parse(e.data)
                return
            }
            let test = 0
            console.log("now: ", receivedSize, fileMeta.size)
            connectButton.disabled = true
            receiverBuffer.push(e.data)
            receivedSize += e.data.byteLength
            progressText.innerText = "Downloading " + fileMeta.name + " " +
                (receivedSize / fileMeta.size * 100).toFixed(2).toString() + "% ..."
            progressFill.style.width = (receivedSize / fileMeta.size * 100).toString() + "%"
            if (receivedSize === fileMeta.size) {
                status.dispatchEvent(
                    new CustomEvent('statusChange', {detail: "Download Complete!"})
                )
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
    }
    get_offer(document.location.pathname.split('/')[2])
}

// API request to get and parse SDP (offer) from server
function get_offer(room_id) {
    if (room_id === "") return
    console.log("Getting offer...")
    status.dispatchEvent(
        new CustomEvent('statusChange', {detail: "Connecting..."})
    )
    let xhr = new XMLHttpRequest()
    let roomLink = document.location.origin + '/api/' + room_id
    xhr.open("GET", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send()
    xhr.onreadystatechange = e => {
        if (e.target.readyState === 4) {
            if (xhr.status !== 200) {
                status.dispatchEvent(
                    new CustomEvent('statusChange', {detail: "Connection Error"})
                )
                return
            }
            let rsp = JSON.parse(JSON.parse(xhr.response))
            offer = {
                type: rsp.type,
                sdp: rsp.sdp
            }
            put_answer(room_id)
        }
    }
}

// API request to put SDP (answer) to server
function put_answer(room_id) {
    console.log("Putting answer...")
    status.dispatchEvent(
        new CustomEvent('statusChange', {detail: "Connecting"})
    )
    let xhr = new XMLHttpRequest()
    let room_link = document.location.origin + '/api/' + room_id
    xhr.open("PUT", room_link, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    remoteConnection.setRemoteDescription(offer)
        .then(() => {
            remoteConnection.createAnswer().then(a => remoteConnection.setLocalDescription(a))
                .then(() => xhr.send(JSON.stringify(remoteConnection.localDescription)))
                .catch(() => status.dispatchEvent(
                    new CustomEvent('statusChange', {detail: "Connection Error"})
                ))
        })
        .catch(() => status.dispatchEvent(
            new CustomEvent('statusChange', {detail: "Connection Error"})
        ))
}

// Closes Data Channel and remote connection
function closeConnection() {
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
    if (inviteLink.value === '') {
        alert("Please enter a room id/link")
    }
    let room = inviteLink.value
    if (Number.isInteger(parseInt(room))) {
        get_offer(room)
    } else if (Number.isInteger(parseInt(room.split('/').slice(-1)[0]))) {
        get_offer(room.split('/').slice(-1)[0])
    } else {
        alert("Invalid invitation link or room id.")
    }
}

window.onbeforeunload = closeConnection
