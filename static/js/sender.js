'use strict';

const fileInput = document.getElementById('file-input')
let localConnection, sendChannel, latestOffer, fileMeta, chunkSize

// Creating local connection
window.onload = () => {
    localConnection = new RTCPeerConnection(conf)
    localConnection.onicecandidate = e => {
        latestOffer = localConnection.localDescription
        if (sendChannel.readyState === 'open')
            sendChannel.send(JSON.stringify({ice: e.candidate}))
    }
    sendChannel = localConnection.createDataChannel("sendChannel")
    sendChannel.onopen = () => {
        status.dispatchEvent(
            new CustomEvent('statusChange', {detail: "Connected"})
        )
        if (fileInput.files.length !== 0) {
            progress.style.display = "flex"
            sendFiles().then()
        }
    }
    localConnection.createOffer().then(o => localConnection.setLocalDescription(o))
}

function awaitACK() {
    return new Promise((resolve, reject) => {
        sendChannel.onmessage = e => {
            if (e.data === 'ACK') resolve()
            else reject()
        }
    })
}

// Create room or send file
function onFileInputChange() {
    if (sendChannel && sendChannel.readyState === 'open' && fileInput.files.length !== 0) {
        status.dispatchEvent(
            new CustomEvent('statusChange', {detail: "Connected"})
        )
        progress.style.display = "flex"
        sendFiles().then()
    } else {
        putOffer()
    }
}

// Reads one chunk of the file
function readChunkAsync(chunk) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader()
        reader.onload = () => {
            resolve(reader.result)
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(chunk)
    })
}

async function sendFiles() {
    fileInput.disabled = true
    for (let i = 0; i < fileInput.files.length; i++) {
        let file = fileInput.files[i]
        fileMeta = {
            name: file.name,
            size: file.size,
        }
        sendChannel.send(JSON.stringify(fileMeta))
        for (let bytesSent = 0; bytesSent <= file.size; bytesSent += chunkSize) {
            let chunk = await readChunkAsync(file.slice(bytesSent, bytesSent + chunkSize))
            sendChannel.send(chunk)
            progressText.innerText = "Sending " + file.name + " " +
                (bytesSent / file.size * 100).toFixed(2).toString() + "% ..."
            progressFill.style.width = (bytesSent / file.size * 100).toString() + "%"
            await awaitACK()
        }
    }
    progressText.innerText = ""
    progress.style.display = "none"
    status.dispatchEvent(
        new CustomEvent('statusChange', {detail: "Upload Complete!"})
    )
    fileInput.disabled = false
}

// Puts SDP offer to API
function putOffer() {
    console.log("Putting offer...")
    let roomId = Math.floor(Math.random() * 9e9 + 1e9)
    console.log(roomId)
    let roomLink = document.location.origin + '/api/' + roomId
    let xhr = new XMLHttpRequest()
    xhr.open("PUT", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send(JSON.stringify(latestOffer.toJSON()))
    inviteLink.textContent = roomId.toString()
    inviteLink.style.color = "black"
    status.dispatchEvent(
        new CustomEvent('statusChange', {detail: "Waiting for receiver to join"})
    )
    console.log("Waiting for answer...")
    getAnswer(0, roomId)
}

// Gets SDP answer from API
function getAnswer(count, roomId) {
    if (count >= 1000) {
        alert("Room timed out (receiver didn't join). Please try again.")
        location.reload()
    }
    let xhr = new XMLHttpRequest()
    let roomLink = document.location.origin + '/api/' + roomId
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
            if (rsp.type === "answer" && localConnection.iceGatheringState === 'complete') {
                status.dispatchEvent(
                    new CustomEvent('statusChange', {detail: "Connecting..."})
                )
                localConnection.setRemoteDescription(rsp)
                    .catch(() => status.dispatchEvent(
                        new CustomEvent('statusChange', {detail: "Connection Error"})
                    ))
                chunkSize = 16384
                const match = rsp.sdp.match(/a=max-message-size:\s*(\d+)/)
                if (match !== null && match.length >= 2) {
                    chunkSize = Math.max(chunkSize, parseInt(match[1]))
                }
                console.log("Chunk size = ", chunkSize)
            } else if (rsp.type === 'offer') {
                setTimeout(getAnswer.bind(null, count + 1, roomId), 3000)
            }
        }
    }
}

// Closes Data Channel and local connection
function closeConnection() {
    if (sendChannel) {
        sendChannel.close()
        sendChannel = null
    }
    if (localConnection) {
        localConnection.close()
        localConnection = null
    }
    fileInput.disabled = false
}

window.onbeforeunload = closeConnection
fileInput.onchange = onFileInputChange